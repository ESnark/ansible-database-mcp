/**
 * Databricks connection adapter
 * Provides a Knex-compatible interface for Databricks SQL connections
 */
import { DBSQLClient } from '@databricks/sql';
import type IDBSQLSession from '@databricks/sql/dist/contracts/IDBSQLSession';
import { DatabaseConfig, isDatabricksConnection } from '../type.js';
import { EventEmitter } from 'events';

export interface DatabricksPoolStatus {
  activeConnections: number;
  idleConnections: number;
  pendingAcquisitions: number;
  used: number;
  free: number;
}

export interface DatabricksQueryResult {
  rows: any[];
  fields?: any[];
}

/**
 * Databricks connection pool manager
 * Manages multiple Databricks SQL sessions with pooling
 */
export class DatabricksAdapter extends EventEmitter {
  private client: DBSQLClient;
  private config: DatabaseConfig;
  private sessions: IDBSQLSession[];
  private availableSessions: IDBSQLSession[];
  private activeSessions: Set<IDBSQLSession>;
  private pendingRequests: Array<(session: IDBSQLSession) => void>;
  private isDestroyed: boolean;
  private poolSize: { min: number; max: number };
  private readonly MAX_CONNECTION_RETRIES = 3;

  constructor(config: DatabaseConfig) {
    super();
    
    if (!isDatabricksConnection(config.connection)) {
      throw new Error('Invalid Databricks connection configuration');
    }

    this.config = config;
    this.sessions = [];
    this.availableSessions = [];
    this.activeSessions = new Set();
    this.pendingRequests = [];
    this.isDestroyed = false;
    this.poolSize = {
      min: config.pool?.min || 1,
      max: config.pool?.max || 5
    };

    this.client = new DBSQLClient();
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    try {
      const connection = this.config.connection as any;
      await this.client.connect({
        host: connection.host,
        port: connection.port || 443,
        path: connection.path,
        token: connection.token
      });
      
      // Create minimum number of sessions
      for (let i = 0; i < this.poolSize.min; i++) {
        await this.createSession();
      }
    } catch (error: any) {
      console.error('[Databricks] Connection error:', error);
      throw error;
    }
  }

  /**
   * Create a new session and add it to the pool
   */
  private async createSession(): Promise<IDBSQLSession> {
    if (this.sessions.length >= this.poolSize.max) {
      throw new Error('Maximum pool size reached');
    }

    const connection = this.config.connection as any;
    
    try {
      const session = await this.client.openSession({
        initialCatalog: connection.catalog,
        initialSchema: connection.database  // database field is used as schema in Databricks
      });

      this.sessions.push(session);
      this.availableSessions.push(session);
      
      return session;
    } catch (error: any) {
      console.error('[Databricks] Session creation error:', error);
      throw error;
    }
  }

  /**
   * Check if session is still valid using getInfo
   */
  private async isSessionValid(session: IDBSQLSession): Promise<boolean> {
    try {
      // Use getInfo to check if session is still active
      // TGetInfoType.CLI_SERVER_NAME = 13 (more appropriate for simple check)
      await session.getInfo(13);
      return true;
    } catch (error: any) {
      console.log('[Databricks] Session validation failed:', error.message);
      return false;
    }
  }

  /**
   * Check if error is a connection-related error
   * 
   * THTTPException is thrown by Databricks SQL client when HTTP transport encounters errors.
   * Error structure:
   * - name: 'THTTPException'
   * - statusCode: HTTP status code (e.g., 400)
   * - type: Thrift TApplicationException type (7 = PROTOCOL_ERROR)
   * - response: Node.js Response object with status details
   * 
   * Common causes for statusCode 400 with type 7:
   * - Session expired on server side (default 15 min idle timeout)
   * - Client connection in stale state after long idle period
   * - Protocol mismatch between client and server
   * 
   * Note: The Databricks SQL Node.js documentation does not provide specific error type
   * definitions. This error handling is based on empirical observation and Thrift protocol
   * specifications.
   */
  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorName = error.name || '';
    const statusCode = error.statusCode;
    
    // Only check for explicit indicators
    return (
      statusCode === 400 && 
      errorName === 'THTTPException'
    );
  }

  /**
   * Recreate client connection
   */
  private async recreateConnection(): Promise<void> {
    console.log('[Databricks] Recreating client connection...');
    
    // Close existing client
    try {
      await this.client.close();
    } catch (error) {
      console.error('[Databricks] Error closing client during recreation:', error);
    }
    
    // Clear all sessions
    this.sessions = [];
    this.availableSessions = [];
    this.activeSessions.clear();
    
    // Create new client and connect
    this.client = new DBSQLClient();
    const connection = this.config.connection as any;
    
    await this.client.connect({
      host: connection.host,
      port: connection.port || 443,
      path: connection.path,
      token: connection.token
    });
    
    // Create minimum number of sessions
    for (let i = 0; i < this.poolSize.min; i++) {
      await this.createSession();
    }
    
    console.log('[Databricks] Client connection recreated successfully');
  }

  /**
   * Acquire a session from the pool
   */
  async acquireSession(): Promise<IDBSQLSession> {
    if (this.isDestroyed) {
      throw new Error('Connection pool has been destroyed');
    }

    // Clean up invalid sessions from available pool
    const validSessions: IDBSQLSession[] = [];
    for (const session of this.availableSessions) {
      if (await this.isSessionValid(session)) {
        validSessions.push(session);
      } else {
        console.log('[Databricks] Removing invalid session from pool');
        await this.invalidateSession(session);
      }
    }
    this.availableSessions = validSessions;

    // If there's an available valid session, use it
    if (this.availableSessions.length > 0) {
      const session = this.availableSessions.pop()!;
      this.activeSessions.add(session);
      return session;
    }

    // If we can create more sessions, do so
    if (this.sessions.length < this.poolSize.max) {
      const session = await this.createSession();
      this.availableSessions.pop(); // Remove from available
      this.activeSessions.add(session);
      return session;
    }

    // Otherwise, wait for a session to become available
    return new Promise((resolve) => {
      this.pendingRequests.push(resolve);
    });
  }

  /**
   * Release a session back to the pool
   */
  releaseSession(session: IDBSQLSession): void {
    this.activeSessions.delete(session);

    if (this.pendingRequests.length > 0) {
      const resolve = this.pendingRequests.shift()!;
      this.activeSessions.add(session);
      resolve(session);
    } else {
      this.availableSessions.push(session);
    }
  }

  /**
   * Execute a raw SQL query
   */
  async raw(sql: string, bindings?: any[]): Promise<DatabricksQueryResult> {
    let lastError: any;
    let retryCount = 0;
    
    while (retryCount <= this.MAX_CONNECTION_RETRIES) {
      try {
        const session = await this.acquireSession();
        
        try {
          const operation = await session.executeStatement(sql, {
            runAsync: false,
            maxRows: 10000 // Configurable limit
          });

          const result = await operation.fetchAll();
          
          let fields: any[] | undefined;
          if (operation.getSchema) {
            try {
              const schema = await operation.getSchema();
              // Convert TTableSchema to array format if needed
              if (schema && typeof schema === 'object' && 'columns' in schema) {
                fields = (schema as any).columns || [];
              } else {
                fields = undefined;
              }
            } catch {
              fields = undefined;
            }
          }
          
          await operation.close();

          return {
            rows: result,
            fields
          };
        } catch (error: any) {
          console.error('[Databricks] Query execution error:', error);
          throw error;
        } finally {
          this.releaseSession(session);
        }
      } catch (error: any) {
        lastError = error;
        
        // Debug logging - full error inspection
        console.log('[Databricks] Error caught in raw():');
        console.log('Error type:', error.constructor.name);
        console.log('Error properties:', Object.keys(error));
        console.log('Full error object:', JSON.stringify(error, null, 2));
        
        // Check all possible error properties
        const errorInfo = {
          message: error.message,
          statusCode: error.statusCode,
          status: error.status,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          details: error.details,
          response: error.response,
          request: error.request,
          config: error.config,
          stack: error.stack,
          isConnectionError: this.isConnectionError(error),
          retryCount: retryCount
        };
        
        // Log non-undefined properties
        const definedProps = Object.entries(errorInfo)
          .filter(([_, value]) => value !== undefined)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
        
        console.log('Defined error properties:', definedProps);
        
        if (this.isConnectionError(error) && retryCount < this.MAX_CONNECTION_RETRIES) {
          console.log(`[Databricks] Connection error detected, attempting reconnection (${retryCount + 1}/${this.MAX_CONNECTION_RETRIES})`);
          
          try {
            await this.recreateConnection();
            retryCount++;
            continue;
          } catch (reconnectError) {
            console.error('[Databricks] Failed to recreate connection:', reconnectError);
            throw reconnectError;
          }
        } else {
          // Not a connection error or max retries reached
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * Execute a select query (Knex compatibility)
   */
  async select(table: string, columns: string[] = ['*'], where?: Record<string, any>): Promise<any[]> {
    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
    
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      sql += ` WHERE ${conditions}`;
    }

    const result = await this.raw(sql);
    return result.rows;
  }

  /**
   * Get pool statistics
   */
  getPoolStatus(): DatabricksPoolStatus {
    return {
      activeConnections: this.activeSessions.size,
      idleConnections: this.availableSessions.length,
      pendingAcquisitions: this.pendingRequests.length,
      used: this.activeSessions.size,
      free: this.availableSessions.length
    };
  }

  /**
   * Invalidate a session and remove it from all pools
   */
  private async invalidateSession(session: IDBSQLSession): Promise<void> {
    try {
      // Remove from all tracking arrays
      this.sessions = this.sessions.filter(s => s !== session);
      this.availableSessions = this.availableSessions.filter(s => s !== session);
      this.activeSessions.delete(session);
      
      // Try to close the session
      try {
        await session.close();
      } catch (error) {
        // Session might already be closed, ignore error
        console.log('[Databricks] Error closing invalid session:', error);
      }
      
      console.log('[Databricks] Session invalidated and removed from pool');
    } catch (error) {
      console.error('[Databricks] Error invalidating session:', error);
    }
  }

  /**
   * Destroy the connection pool
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Close all sessions
    for (const session of this.sessions) {
      try {
        await session.close();
      } catch (error) {
        console.error('Error closing Databricks session:', error);
      }
    }

    // Close the client
    try {
      await this.client.close();
    } catch (error) {
      console.error('Error closing Databricks client:', error);
    }

    // Clear all arrays
    this.sessions = [];
    this.availableSessions = [];
    this.activeSessions.clear();
    this.pendingRequests = [];
  }

  /**
   * Create a Knex-compatible wrapper
   */
  toKnexCompatible(): any {
    const adapter = this;
    
    return {
      raw: (sql: string, bindings?: any[]) => adapter.raw(sql, bindings),
      destroy: () => adapter.destroy(),
      select: (table: string) => ({
        select: (columns: string[]) => adapter.select(table, columns),
        where: (conditions: Record<string, any>) => adapter.select(table, ['*'], conditions)
      }),
      // Add more Knex methods as needed
      client: {
        pool: adapter.getPoolStatus(),
        config: {
          client: 'databricks'
        }
      },
      // Store reference to adapter for permission checking
      _adapter: adapter
    };
  }
}
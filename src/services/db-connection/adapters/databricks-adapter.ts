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

    const connection = config.connection;
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
    } catch (error) {
      throw new Error(`Failed to initialize Databricks connection: ${error}`);
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
    const session = await this.client.openSession({
      initialCatalog: connection.catalog,
      initialSchema: connection.database  // database field is used as schema in Databricks
    });

    this.sessions.push(session);
    this.availableSessions.push(session);
    
    return session;
  }

  /**
   * Acquire a session from the pool
   */
  async acquireSession(): Promise<IDBSQLSession> {
    if (this.isDestroyed) {
      throw new Error('Connection pool has been destroyed');
    }

    // If there's an available session, use it
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
    } finally {
      this.releaseSession(session);
    }
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
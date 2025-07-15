/**
 * Database connection manager module
 * Module for efficiently managing multiple database connections
 */
import knex from 'knex';
import type { Knex } from 'knex';
import { EventEmitter } from 'events';
import { createPoolConfigurator } from './pool-configurator.js';
import timeoutManager from './timeout-manager.js';
import { isStrictlyReadOnlySession } from '../write-permission-checker.js';
import { DatabaseConfig } from './type.js';
import environment from '@/config/environment.js';

// Simple logging function implementations
function logInfo(message: string): void {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
}

function logWarning(message: string): void {
  console.warn(`[WARNING] ${new Date().toISOString()} - ${message}`);
}

// import * as errorHandlers from './errors'; // currently not in use

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  monitoringIntervalMillis?: number;
}

interface PoolStats {
  created: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingAcquisitions: number;
  queryCount: number;
  lastQuery: string | null;
  errors: number;
  lastError: string | null;
  lastUpdated?: string;
}

interface PoolStatus {
  activeConnections: number;
  idleConnections: number;
  pendingAcquisitions: number;
  used: number;
  free: number;
}

/**
 * Database connection manager class
 * Provides connection management and pooling for multiple databases
 */
class ConnectionManager extends EventEmitter {
  private dbConfigs: Record<string, DatabaseConfig>;
  private pools: Map<string, Knex>;
  private poolConfigs: Map<string, PoolConfig>;
  private poolStats: Map<string, PoolStats>;
  private monitoringIntervals: Map<string, NodeJS.Timeout>;
  private isShuttingDown: boolean;
  private timeoutManager: typeof timeoutManager;

  constructor() {
    super();
    this.dbConfigs = {};
    this.pools = new Map();
    this.poolConfigs = new Map();
    this.poolStats = new Map();
    this.monitoringIntervals = new Map();
    this.isShuttingDown = false;

    // Timeout manager reference
    this.timeoutManager = timeoutManager;

    // Register shutdown handlers
    this._registerShutdownHandlers();
  }

    async initConnections() {
    try {
      // Load centralized environment configuration
      await environment.load();
      
      // Get database configurations from environment
      const dbConfigs = environment.getConfig();
      this.dbConfigs = dbConfigs;

      // Create connection pools for each database
      for (const [dbKey, config] of Object.entries(dbConfigs)) {
        await this.createPool(dbKey, config);
      }

      logInfo(`Total ${Object.keys(dbConfigs).length} database connection pools initialized.`);
    } catch (error) {
      logError('Database connection initialization failed', error);
      throw error;
    }
  }

  /**
   * Create and register database connection pool
   */
  async createPool(dbKey: string, config: DatabaseConfig): Promise<Knex> {
    console.log('createPool', dbKey, config);
    // Close existing pool if present
    if (this.pools.has(dbKey)) {
      logInfo(`Reconfiguring existing database connection pool: ${dbKey}`);
      this.closePool(dbKey);
    }

    try {
      // Configure pool settings
      const poolConfigurator = createPoolConfigurator(config.client, config.pool || {});
      const poolConfig = poolConfigurator.getKnexPoolConfig() as PoolConfig;

      // Save pool configuration
      this.poolConfigs.set(dbKey, poolConfig);

      // Apply timeout settings
      this._applyTimeoutSettings(poolConfig);

      // Create Knex instance
      const knexInstance = knex({
        client: config.client,
        connection: config.connection,
        pool: poolConfig,
        acquireConnectionTimeout: this.timeoutManager.getTimeout('connectionAcquisition'),
        asyncStackTraces: process.env.NODE_ENV !== 'production',
        debug: process.env.DB_DEBUG === 'true'
      });

      // Save pool
      this.pools.set(dbKey, knexInstance);

      // Set initial pool statistics
      this.poolStats.set(dbKey, {
        created: new Date().toISOString(),
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        pendingAcquisitions: 0,
        queryCount: 0,
        lastQuery: null,
        errors: 0,
        lastError: null
      });

      // Write permission check - create test connection to verify permissions
      try {
        // await knexInstance.raw('SELECT 1');
        // const rawConnection = knexInstance.client.acquireRawConnection();

        const isReadOnly = await isStrictlyReadOnlySession(knexInstance);
        if (!isReadOnly) {
          // If write permission detected, immediately close pool and throw error
          await knexInstance.destroy();
          this.pools.delete(dbKey);
          this.poolStats.delete(dbKey);
          this.poolConfigs.delete(dbKey);
          throw new Error('Write permission detected, connection rejected. Only read-only connections are allowed.');
        }

        // Release test connection
        // console.log('releaseConnection', await rawConnection);
        // (knexInstance as any).client.releaseConnection(await rawConnection);
      } catch (permissionError: any) {
        // Clean up pool on write permission check failure
        await knexInstance.destroy();
        this.pools.delete(dbKey);
        this.poolStats.delete(dbKey);
        this.poolConfigs.delete(dbKey);
        throw permissionError;
      }

      // Start monitoring
      this._startPoolMonitoring(dbKey);

      // Emit event
      const sanitizedConfig = {
        ...config,
        connection: {
          ...config.connection,
          password: '******'
        }
      };
      this.emit('pool:created', { dbKey, config: sanitizedConfig });

      logInfo(`Database connection pool created (read-only verified): ${dbKey}, ${config.client}, ${config.connection.host}:${config.connection.port}`);

      return knexInstance;
    } catch (error) {
      logError(`Database connection pool creation failed: ${dbKey}`, error);
      this.emit('pool:error', { dbKey, error });
      throw error;
    }
  }

  /**
   * Apply timeout settings (internal use)
   */
  private _applyTimeoutSettings(poolConfig: PoolConfig): void {
    // Set idle timeout
    const idleTimeout = this.timeoutManager.getTimeout('idleConnection');
    if (idleTimeout) {
      poolConfig.idleTimeoutMillis = idleTimeout;
    }

    // Set connection acquisition timeout
    const acquireTimeout = this.timeoutManager.getTimeout('connectionAcquisition');
    if (acquireTimeout) {
      poolConfig.acquireTimeoutMillis = acquireTimeout;
    }

    // Set connection creation timeout
    const createTimeout = this.timeoutManager.getTimeout('poolCreation');
    if (createTimeout) {
      poolConfig.createTimeoutMillis = createTimeout;
    }
  }

  /**
   * Start pool monitoring (internal use)
   */
  private _startPoolMonitoring(dbKey: string): void {
    // Stop existing monitoring
    if (this.monitoringIntervals.has(dbKey)) {
      clearInterval(this.monitoringIntervals.get(dbKey));
    }

    // Get pool configuration
    const poolConfig = this.poolConfigs.get(dbKey);
    if (!poolConfig) return;

    // Monitoring interval (default 1 minute)
    const monitoringInterval = poolConfig.monitoringIntervalMillis || 60000;

    // Set up periodic monitoring
    const intervalId = setInterval(async () => {
      try {
        const pool = this.pools.get(dbKey);
        if (!pool) return;

        // Check pool status
        const poolStats = await this._getPoolStatus(pool, dbKey);

        // Update statistics
        const currentStats = this.poolStats.get(dbKey);
        if (currentStats) {
          this.poolStats.set(dbKey, {
            ...currentStats,
            ...poolStats,
            lastUpdated: new Date().toISOString()
          });
        }

        // Detect and log dangerous conditions
        this._checkPoolHealth(dbKey, poolStats);

      } catch (error) {
        logError(`Pool monitoring error: ${dbKey}`, error);
      }
    }, monitoringInterval);

    // Save interval ID
    this.monitoringIntervals.set(dbKey, intervalId);
  }

  /**
   * Check pool health status (internal use)
   */
  private _checkPoolHealth(dbKey: string, stats: PoolStatus): void {
    const poolConfig = this.poolConfigs.get(dbKey);
    if (!poolConfig) return;

    // Connection exhaustion warning (80% or more usage)
    const maxConnections = poolConfig.max || 10;
    const usageRatio = stats.activeConnections / maxConnections;

    if (usageRatio >= 0.8) {
      logWarning(`Pool connection exhaustion risk: ${dbKey}, active: ${stats.activeConnections}/${maxConnections} (${Math.round(usageRatio * 100)}%)`);

      // Emit warning event
      this.emit('pool:warning', {
        dbKey,
        type: 'high-usage',
        message: `Pool connection exhaustion risk: ${Math.round(usageRatio * 100)}% in use`,
        stats
      });
    }

    // Too many pending requests
    if (stats.pendingAcquisitions > maxConnections) {
      logWarning(`Too many pending connection requests: ${dbKey}, pending: ${stats.pendingAcquisitions}`);

      this.emit('pool:warning', {
        dbKey,
        type: 'high-pending',
        message: `Too many pending connection requests: ${stats.pendingAcquisitions}`,
        stats
      });
    }
  }

  /**
   * Get pool status (internal use)
   */
  private async _getPoolStatus(pool: Knex, dbKey: string): Promise<PoolStatus> {
    try {
      // Get Knex pool status
      const poolInfo = (pool as any).client?.pool;

      if (!poolInfo) {
        return {
          activeConnections: 0,
          idleConnections: 0,
          pendingAcquisitions: 0,
          used: 0,
          free: 0
        };
      }

      // Calculate pool statistics
      const used = poolInfo.numUsed || 0;
      const free = poolInfo.numFree || 0;
      const pending = poolInfo.numPendingAcquires || 0;

      return {
        activeConnections: used,
        idleConnections: free,
        pendingAcquisitions: pending,
        used,
        free
      };
    } catch (error) {
      logError(`Failed to get pool status: ${dbKey}`, error);

      return {
        activeConnections: 0,
        idleConnections: 0,
        pendingAcquisitions: 0,
        used: 0,
        free: 0
      };
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(dbKey: string): Promise<Knex.Transaction> {
    const pool = this.getPool(dbKey);
    if (!pool) {
      throw new Error(`Database pool not found: ${dbKey}`);
    }

    try {
      return await this.timeoutManager.withTimeout(
        () => pool.transaction(),
        { timeoutType: 'transaction' }
      );
    } catch (error) {
      logError(`Failed to begin transaction: ${dbKey}`, error);
      throw error;
    }
  }

  /**
   * Get existing database connection pool
   */
  getPool(dbKey: string): Knex | null {
    return this.pools.get(dbKey) || null;
  }

  /**
   * Check specific database connection health status
   */
  async healthCheck(dbKey: string): Promise<boolean> {
    const pool = this.pools.get(dbKey);
    if (!pool) {
      logWarning(`Health check failed: pool not found - ${dbKey}`);
      return false;
    }

    try {
      await this.timeoutManager.withTimeout(
        () => pool.raw('SELECT 1 as test'),
        { timeoutType: 'healthCheck' }
      );

      logInfo(`Database health status good: ${dbKey}`);
      return true;
    } catch (error) {
      logError(`Database health check failed: ${dbKey}`, error);

      // Emit health check failure event
      this.emit('pool:unhealthy', { dbKey, error });

      return false;
    }
  }

  /**
   * Check all database connection health status
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const healthChecks = Array.from(this.pools.keys()).map(async (dbKey) => {
      results[dbKey] = await this.healthCheck(dbKey);
    });

    await Promise.all(healthChecks);
    return results;
  }

  /**
   * Get database connection pool statistics
   */
  getPoolStats(dbKey: string): PoolStats | null {
    return this.poolStats.get(dbKey) || null;
  }

  /**
   * Get all database connection pool statistics
   */
  getAllPoolStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};

    for (const [dbKey, poolStats] of this.poolStats.entries()) {
      stats[dbKey] = poolStats;
    }

    return stats;
  }

  /**
   * Close specific database connection pool
   */
  async closePool(dbKey: string): Promise<void> {
    const pool = this.pools.get(dbKey);
    if (!pool) {
      logWarning(`Pool to close not found: ${dbKey}`);
      return;
    }

    try {
      // Stop monitoring
      const intervalId = this.monitoringIntervals.get(dbKey);
      if (intervalId) {
        clearInterval(intervalId);
        this.monitoringIntervals.delete(dbKey);
      }

      // Close pool
      await pool.destroy();

      // Remove from management objects
      this.pools.delete(dbKey);
      this.poolConfigs.delete(dbKey);
      this.poolStats.delete(dbKey);

      // Emit event
      this.emit('pool:closed', { dbKey });

      logInfo(`Database connection pool closed: ${dbKey}`);
    } catch (error) {
      logError(`Failed to close database connection pool: ${dbKey}`, error);
      throw error;
    }
  }

  /**
   * Close all database connection pools
   */
  async closeAll(timeout = 5000): Promise<void> {
    if (this.isShuttingDown) {
      logWarning('Already shutting down');
      return;
    }

    this.isShuttingDown = true;

    try {
      logInfo(`Starting to close all database connection pools (timeout: ${timeout}ms)`);

      // Close all pools with timeout
      const closePromises = Array.from(this.pools.keys()).map(dbKey =>
        this.closePool(dbKey)
      );

      await Promise.race([
        Promise.all(closePromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Pool close timeout')), timeout)
        )
      ]);

      logInfo('All database connection pools closed successfully');
    } catch (error) {
      logError('Failed to close some database connection pools', error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Register shutdown handlers (internal use)
   */
  private _registerShutdownHandlers(): void {
    const shutdownHandler = async (): Promise<void> => {
      if (!this.isShuttingDown) {
        logInfo('Application shutdown signal detected, cleaning up connection pools...');
        try {
          await this.closeAll();
        } catch (error) {
          logError('Error during shutdown', error);
        }
      }
    };

    // Handle process termination signals
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGQUIT', shutdownHandler);

    // Handle unexpected termination
    process.on('uncaughtException', async (error) => {
      logError('Uncaught exception', error);
      await shutdownHandler();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logError('Unhandled promise rejection', { reason, promise });
      await shutdownHandler();
      process.exit(1);
    });
  }

  getDatabaseList() {
    return Object.entries(this.dbConfigs).map(([dbKey, config]) => {
      const poolStatus = this.getPoolStats(dbKey);
      const host = config.connection.host;
      const port = config.connection.port;
      const user = config.connection.user;

      return {
        dbKey,
        description: config.description,
        type: config.client,
        host,
        port,
        user,
        poolStatus,
      }
    });
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();
connectionManager.initConnections();

export default connectionManager;
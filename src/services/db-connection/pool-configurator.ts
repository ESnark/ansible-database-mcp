/**
 * Database connection pool configuration module
 * Manages connection pool settings for different database types
 */

interface BasePoolConfig {
  minConnections?: number;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  createRetryIntervalMillis?: number;
  propagateCreateError?: boolean;
  afterCreate?: Function;
  monitoringIntervalMillis?: number;
  enableMetrics?: boolean;
  debugLogging?: boolean;
}

// Database-specific pool configurations can be added here if needed in the future
// For now, all databases use the same base pool configuration

interface KnexPoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  createRetryIntervalMillis: number;
  propagateCreateError: boolean;
  afterCreate?: Function;
  [key: string]: any;
}

interface PoolInfo {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  monitoringEnabled: boolean;
  monitoringInterval: number;
}

/**
 * Base pool configuration class
 * Base class for various database pool configurations
 */
export class BasePoolConfigurator {
  protected minConnections: number;
  protected maxConnections: number;
  protected idleTimeoutMillis: number;
  protected acquireTimeoutMillis: number;
  protected createTimeoutMillis: number;
  protected createRetryIntervalMillis: number;
  protected propagateCreateError: boolean;
  protected afterCreate?: Function | undefined;
  protected monitoringIntervalMillis: number;
  protected enableMetrics: boolean;
  protected debugLogging: boolean;

  constructor(config: BasePoolConfig = {}) {
    this.minConnections = config.minConnections ?? 0;  // Start with 0 to avoid initial connection storm
    this.maxConnections = config.maxConnections ?? 10;
    this.idleTimeoutMillis = config.idleTimeoutMillis ?? 30000;
    this.acquireTimeoutMillis = config.acquireTimeoutMillis ?? 10000;
    this.createTimeoutMillis = config.createTimeoutMillis ?? 10000;
    this.createRetryIntervalMillis = config.createRetryIntervalMillis ?? 200;
    this.propagateCreateError = config.propagateCreateError ?? true;
    this.afterCreate = config.afterCreate;
    this.monitoringIntervalMillis = config.monitoringIntervalMillis ?? 60000;
    this.enableMetrics = config.enableMetrics ?? (process.env.NODE_ENV === 'production');
    this.debugLogging = config.debugLogging ?? (process.env.NODE_ENV === 'development');
  }

  /**
   * Create Knex pool configuration object
   */
  getKnexPoolConfig(): KnexPoolConfig {
    const config: KnexPoolConfig = {
      min: this.minConnections,
      max: this.maxConnections,
      idleTimeoutMillis: this.idleTimeoutMillis,
      acquireTimeoutMillis: this.acquireTimeoutMillis,
      createTimeoutMillis: this.createTimeoutMillis,
      createRetryIntervalMillis: this.createRetryIntervalMillis,
      propagateCreateError: this.propagateCreateError
    };

    if (this.afterCreate) {
      config.afterCreate = this.afterCreate;
    }

    return config;
  }

  /**
   * Return current pool configuration information
   */
  getPoolInfo(): PoolInfo {
    return {
      minConnections: this.minConnections,
      maxConnections: this.maxConnections,
      idleTimeoutMillis: this.idleTimeoutMillis,
      acquireTimeoutMillis: this.acquireTimeoutMillis,
      createTimeoutMillis: this.createTimeoutMillis,
      monitoringEnabled: this.enableMetrics,
      monitoringInterval: this.monitoringIntervalMillis
    };
  }
}

/**
 * Create pool configuration suitable for database type
 */
export function createPoolConfigurator(dbType: string, config: any = {}): BasePoolConfigurator {
  // Convert env.yml pool config format to BasePoolConfig format
  const poolConfig: BasePoolConfig = {
    minConnections: config.min,
    maxConnections: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    acquireTimeoutMillis: config.acquireTimeoutMillis,
    createTimeoutMillis: config.createTimeoutMillis,
    ...config
  };

  return new BasePoolConfigurator(poolConfig);
} 
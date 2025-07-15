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

interface MySQLPoolConfig extends BasePoolConfig {
  connectionLimit?: number;
  queueLimit?: number;
  waitForConnections?: boolean;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
}

interface PostgreSQLPoolConfig extends BasePoolConfig {
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
  ssl?: any;
}

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
    this.minConnections = config.minConnections ?? 2;
    this.maxConnections = config.maxConnections ?? 10;
    this.idleTimeoutMillis = config.idleTimeoutMillis ?? 30000;
    this.acquireTimeoutMillis = config.acquireTimeoutMillis ?? 30000;
    this.createTimeoutMillis = config.createTimeoutMillis ?? 30000;
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
 * MySQL database connection pool configuration
 */
export class MySQLPoolConfigurator extends BasePoolConfigurator {
  private connectionLimit: number;
  private queueLimit: number;
  private waitForConnections: boolean;
  private enableKeepAlive: boolean;
  private keepAliveInitialDelay: number;

  constructor(config: MySQLPoolConfig = {}) {
    super(config);
    
    // MySQL-specific configuration
    this.connectionLimit = config.connectionLimit || this.maxConnections;
    this.queueLimit = config.queueLimit || 0; // 0 means unlimited
    this.waitForConnections = config.waitForConnections !== undefined ? 
                            config.waitForConnections : true;
    this.enableKeepAlive = config.enableKeepAlive !== undefined ? 
                         config.enableKeepAlive : true;
    this.keepAliveInitialDelay = config.keepAliveInitialDelay || 10000;
  }

  /**
   * Create Knex pool configuration object for MySQL
   */
  override getKnexPoolConfig(): KnexPoolConfig {
    return {
      ...super.getKnexPoolConfig(),
      connectionLimit: this.connectionLimit,
      queueLimit: this.queueLimit,
      waitForConnections: this.waitForConnections,
      enableKeepAlive: this.enableKeepAlive,
      keepAliveInitialDelay: this.keepAliveInitialDelay
    };
  }
}

/**
 * PostgreSQL database connection pool configuration
 */
export class PostgreSQLPoolConfigurator extends BasePoolConfigurator {
  private connectionTimeoutMillis: number;
  private statementTimeout?: number | undefined;
  private ssl?: any;

  constructor(config: PostgreSQLPoolConfig = {}) {
    super(config);
    
    // PostgreSQL-specific configuration
    this.connectionTimeoutMillis = config.connectionTimeoutMillis ?? 30000;
    this.statementTimeout = config.statementTimeout;
    this.ssl = config.ssl;
  }

  /**
   * Create Knex pool configuration object for PostgreSQL
   */
  override getKnexPoolConfig(): KnexPoolConfig {
    const baseConfig = super.getKnexPoolConfig();
    
    // Add PostgreSQL-specific configuration
    const pgConfig: KnexPoolConfig = {
      ...baseConfig,
      connectionTimeoutMillis: this.connectionTimeoutMillis
    };
    
    if (this.statementTimeout !== undefined) {
      pgConfig.statementTimeout = this.statementTimeout;
    }
    
    if (this.ssl !== undefined) {
      pgConfig.ssl = this.ssl;
    }
    
    return pgConfig;
  }
}

/**
 * Create pool configuration suitable for database type
 */
export function createPoolConfigurator(_dbType: string, config: BasePoolConfig = {}): BasePoolConfigurator {
  // Simply return default configuration (MySQL, PostgreSQL specific features to be added later)
  return new BasePoolConfigurator(config);
} 
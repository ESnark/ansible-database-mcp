/**
 * Database connection related error handling module
 * Connection, pooling, and transaction related error class definitions
 */

interface ErrorDetails {
  [key: string]: any;
  retryable?: boolean;
  suggestedAction?: string;
}

/**
 * Basic database connection error class
 */
export class DBConnectionError extends Error {
  public readonly code: string;
  public readonly details: ErrorDetails | null;
  public readonly timestamp: string;

  constructor(message: string, code = 'DB_CONNECTION_ERROR', details: ErrorDetails | null = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Connection timeout error
 */
export class ConnectionTimeoutError extends DBConnectionError {
  public readonly timeout: number;

  constructor(message: string, timeout: number, details?: ErrorDetails) {
    super(message, 'CONNECTION_TIMEOUT', details);
    this.timeout = timeout;
  }
}

/**
 * Pool related error
 */
export class PoolError extends DBConnectionError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'POOL_ERROR', details);
  }
}

/**
 * Transaction related error
 */
export class TransactionError extends DBConnectionError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'TRANSACTION_ERROR', details);
  }
}

/**
 * Circuit breaker related error
 */
export class CircuitBreakerError extends DBConnectionError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CIRCUIT_BREAKER_ERROR', details);
  }
} 
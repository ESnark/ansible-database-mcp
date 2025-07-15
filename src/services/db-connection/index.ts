/**
 * Database connection manager module entry point
 * Provides interface for centralized database connection management
 */

import connectionManager from './connection-manager';
import { createPoolConfigurator } from './pool-configurator';
import { CircuitBreaker, withCircuitBreaker, globalCircuitBreaker } from './retry-strategy';
import timeoutManager from './timeout-manager';
import * as errorHandlers from './errors';

export interface PoolStats {
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

export interface HealthCheckResult {
  [dbKey: string]: boolean;
}

/**
 * Get existing database connection pool
 */
export function getDatabasePool(dbKey: string) {
  return connectionManager.getPool(dbKey);
}

/**
 * Begin database transaction
 */
export async function beginTransaction(dbKey = 'default'): Promise<any> {
  return connectionManager.beginTransaction(dbKey);
}

/**
 * Close specific database connection pool
 */
export async function closePool(dbKey: string): Promise<void> {
  return connectionManager.closePool(dbKey);
}

/**
 * Close all database connection pools
 */
export async function closeAllPools(timeout = 5000): Promise<void> {
  return connectionManager.closeAll(timeout);
}

/**
 * Check specific database connection health status
 */
export async function checkDatabaseHealth(dbKey = 'default'): Promise<boolean> {
  return connectionManager.healthCheck(dbKey);
}

/**
 * Check all database connections health status
 */
export async function checkAllDatabasesHealth(): Promise<HealthCheckResult> {
  return connectionManager.healthCheckAll();
}

/**
 * Get database connection pool statistics
 */
export function getDatabaseStats(dbKey = 'default'): PoolStats | null {
  return connectionManager.getPoolStats(dbKey);
}

/**
 * Get all database connection pool statistics
 */
export function getAllDatabaseStats(): Record<string, PoolStats> {
  return connectionManager.getAllPoolStats();
}

/**
 * Execute database operation with retry mechanism
 */
// export async function executeWithRetry(operation: () => Promise<any>, options: any = {}): Promise<any> {
//   return withRetry(operation, options);
// }

/**
 * Execute database operation using circuit breaker pattern
 */
export async function executeWithCircuitBreaker(
  dbKey: string,
  operation: () => Promise<any>,
  customBreaker: any = null
): Promise<any> {
  const breaker = customBreaker || globalCircuitBreaker;
  return withCircuitBreaker(dbKey, operation, breaker);
}

/**
 * Execute database operation with both retry and circuit breaker
 * Wrapper function providing the most robust error handling
 */
// export async function executeWithRobustErrorHandling(
//   dbKey: string,
//   operation: () => Promise<any>,
//   options: any = {}
// ): Promise<any> {
//   const { retryOptions = {}, breaker = globalCircuitBreaker } = options;

//   return executeWithCircuitBreaker(dbKey, async () => {
//     return executeWithRetry(operation, retryOptions);
//   }, breaker);
// }

/**
 * Apply timeout to operation
 */
export async function executeWithTimeout(operation: () => Promise<any>, options: any = {}): Promise<any> {
  return timeoutManager.withTimeout(operation, options);
}

/**
 * Set timeout value
 */
export function setTimeout(timeoutType: string, durationMs: number): void {
  timeoutManager.setTimeout(timeoutType as any, durationMs);
}

/**
 * Get timeout value
 */
export function getTimeout(timeoutType: string): number {
  return timeoutManager.getTimeout(timeoutType as any);
}

// Event handler registration helper functions (convenience feature)
/**
 * Register connection pool event listener
 */
export function onPoolEvent(event: string, listener: (...args: any[]) => void): void {
  connectionManager.on(event, listener);
}

/**
 * Register timeout event listener
 */
export function onTimeoutEvent(event: string, listener: (...args: any[]) => void): void {
  timeoutManager.on(event, listener);
}

export interface DatabaseListItem {
  dbKey: string;
  description?: string;
  type: string;
  host: string;
  port: number;
  user: string;
  poolStatus: PoolStats | null;
}

export function getDatabaseList(): DatabaseListItem[] {
  return connectionManager.getDatabaseList();
}

// Default exports
export {
  // Error types and utilities
  errorHandlers as errors,

  // Advanced error handling
  CircuitBreaker,
  globalCircuitBreaker,

  // Internal access (advanced usage)
  connectionManager,
  createPoolConfigurator,
  timeoutManager
};
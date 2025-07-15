/**
 * Database connection management service
 * Uses new connection-manager with write permission check
 */
import { getDatabasePool, closeAllPools } from './db-connection/index.js';

/**
 * Get database connection
 * Uses new connection manager with write permission check included
 */
export function getConnection(dbKey: string) {
  // Check existing pool
  let pool = getDatabasePool(dbKey);

  if (!pool) {
    throw new Error(`Database pool not found for key: ${dbKey}`);
  }

  // Knex pool already has connection validation and permission check completed
  // Return directly using lazy connection
  return pool;
}

/**
 * Return connection (Knex pool is automatically managed)
 */
export function releaseConnection(_connection: any): void {
  // Knex automatically manages connections, so no additional work needed
  // Function maintained for compatibility
}

/**
 * Close all connections
 */
export async function closeAllConnections(): Promise<void> {
  await closeAllPools();
}
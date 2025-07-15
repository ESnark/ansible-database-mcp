/**
 * Query execution service
 */
import { queryConfig } from '../config/index.js';
import { getConnection, releaseConnection } from './database.js';
import { logQuery, logError } from '../utils/logger.js';
import type { APIResponse } from '../types/index.js';

interface QueryParams {
  query: string;
  timeout?: number;
}

interface QueryResult {
  success: boolean;
  results?: any;
  rowCount?: number;
  message: string;
  error?: string;
}

/**
 * SQL query execution function
 */
export async function executeQuery(dbKey: string, params: QueryParams): Promise<APIResponse<QueryResult>> {
  const {
    query,
    timeout = queryConfig.timeout
  } = params;

  // Verify timeout
  const validTimeout = Math.min(
    Math.max(1, parseInt(timeout.toString(), 10) || queryConfig.timeout),
    queryConfig.maxTimeout
  );

  let connection: any = null;
  const startTime = Date.now();

  try {
    // Get database connection (includes write permission check)
    connection = getConnection(dbKey);

    // Execute query with timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout: Query not completed within ${validTimeout} seconds.`));
      }, validTimeout * 1000);
    });

    // Execute query using Knex (with timeout)
    const queryPromise = connection.raw(query);
    const results = await Promise.race([queryPromise, timeoutPromise]);

    const executionTime = Date.now() - startTime;

    // Query logging
    logQuery(query, params, executionTime, true);

    // Process Knex raw query results
    const [rows] = results;

    return {
      success: true,
      data: {
        success: true,
        results: rows,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        message: `Query executed successfully.`
      }
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    // Error logging
    logError('Query execution error', error);
    logQuery(query, params, executionTime, false, error.message);

    return {
      success: false,
      error: error.message,
      message: 'An error occurred while executing the query.'
    };
  } finally {
    // Return connection
    if (connection) {
      releaseConnection(connection);
    }
  }
}

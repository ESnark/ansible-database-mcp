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
    let rows;
    const clientType = connection?.client?.config?.client || '';
    
    if (clientType === 'databricks') {
      // Databricks returns results in rows property
      rows = results.rows || results;
    } else if (Array.isArray(results)) {
      // MySQL and others return array format [rows, fields]
      rows = results[0];
    } else {
      // PostgreSQL and others
      rows = results.rows || results;
    }

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

    // Return full error details for better debugging
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: error.stack || 'An error occurred while executing the query.',
      details: {
        code: error.code,
        statusCode: error.statusCode,
        sqlState: error.sqlState,
        originalError: error.toString()
      }
    };
  } finally {
    // Return connection
    if (connection) {
      releaseConnection(connection);
    }
  }
}

/**
 * Table information retrieval service
 */
import { getConnection, releaseConnection } from './database.js';
import type { APIResponse } from '../types/index.js';
import { QueryStrategyFactory, getDatabaseClient } from './db-query-strategies/index.js';

interface TableInfoParams {
  table: string;
  database?: string;
  schema?: string;
  info_type?: 'columns' | 'indexes' | 'constraints' | 'all';
}

interface TableInfo {
  columns?: any[];
  indexes?: any[];
  constraints?: any[];
}

interface TableInfoResult {
  success: boolean;
  table: string;
  database?: string;
  schema?: string;
  info?: TableInfo;
  error?: string;
  message: string;
}

/**
 * Table information retrieval function
 */
export async function getTableInfo(dbKey: string, params: TableInfoParams): Promise<APIResponse<TableInfoResult>> {
  const { table, database, schema, info_type = 'all' } = params;

  if (!table) {
    return {
      success: false,
      error: 'Table name is required.',
      message: 'Please provide table name for table information retrieval.'
    };
  }

  let connection: any = null;

  try {
    // Get database connection (Knex pool)
    connection = getConnection(dbKey);
    
    // Determine database client type and get appropriate strategy
    const clientType = getDatabaseClient(connection);
    const queryStrategy = QueryStrategyFactory.create(clientType);
    
    // For PostgreSQL, use schema parameter; for MySQL, use database parameter
    const targetSchema = clientType === 'pg' ? (schema || 'public') : database;
    
    if (!targetSchema) {
      return {
        success: false,
        error: 'Database/schema name is required.',
        message: 'Please provide database name (MySQL) or schema name (PostgreSQL) for table information retrieval.'
      };
    }

    // Initialize result object
    const info: TableInfo = {};

    // Query column information
    if (info_type === 'columns' || info_type === 'all') {
      const queryInfo = queryStrategy.showColumns(targetSchema, table);
      const results = await connection.raw(queryInfo.query, queryInfo.params);
      
      // Handle different result formats
      if (clientType === 'mysql' || clientType === 'mysql2') {
        info.columns = Array.isArray(results) && results.length > 0 ? results[0] : results;
      } else {
        info.columns = results.rows || results;
      }
    }

    // Query index information
    if (info_type === 'indexes' || info_type === 'all') {
      const queryInfo = queryStrategy.showIndexes(targetSchema, table);
      const results = await connection.raw(queryInfo.query, queryInfo.params);
      
      // Handle different result formats
      if (clientType === 'mysql' || clientType === 'mysql2') {
        info.indexes = Array.isArray(results) && results.length > 0 ? results[0] : results;
      } else {
        info.indexes = results.rows || results;
      }
    }

    // Query constraint information
    if (info_type === 'constraints' || info_type === 'all') {
      const queryInfo = queryStrategy.showConstraints(targetSchema, table);
      const results = await connection.raw(queryInfo.query, queryInfo.params);
      
      // Handle different result formats
      if (clientType === 'mysql' || clientType === 'mysql2') {
        info.constraints = Array.isArray(results) && results.length > 0 ? results[0] : results;
      } else {
        info.constraints = results.rows || results;
      }
    }

    return {
      success: true,
      data: {
        success: true,
        table,
        ...(clientType === 'pg' ? { schema: targetSchema } : { database: targetSchema }),
        info,
        message: `Table information successfully retrieved.`
      }
    };
  } catch (error: any) {
    console.error('Table information retrieval error:', error);

    return {
      success: false,
      error: error.message,
      message: 'An error occurred while retrieving table information.'
    };
  } finally {
    // Return connection
    if (connection) {
      releaseConnection(connection);
    }
  }
}
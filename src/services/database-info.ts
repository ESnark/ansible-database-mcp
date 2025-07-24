/**
 * Database information retrieval service
 */
import { getConnection, releaseConnection } from './database.js';
import type { APIResponse } from '../types/index.js';
import { QueryStrategyFactory, getDatabaseClient } from './db-query-strategies/index.js';

interface DatabaseInfoParams {
  type?: 'databases' | 'schemas' | 'tables';
  database?: string;
  schema?: string;
}

interface DatabaseInfoResult {
  success: boolean;
  type: string;
  results?: string[];
  error?: string;
  message: string;
}

/**
 * Database information retrieval function
 */
export async function getDatabaseInfo(dbKey: string, params: DatabaseInfoParams = {}): Promise<APIResponse<DatabaseInfoResult>> {
  const { type = 'databases', database, schema } = params;

  let connection: any = null;

  try {
    // Get database connection (Knex pool)
    connection = getConnection(dbKey);
    
    // Determine database client type and get appropriate strategy
    const clientType = getDatabaseClient(connection);
    const queryStrategy = QueryStrategyFactory.create(clientType);
    
    // Get query info based on type using strategy pattern
    let queryInfo;
    switch (type.toLowerCase()) {
      case 'databases':
        queryInfo = queryStrategy.showDatabases();
        break;
      case 'schemas':
        queryInfo = queryStrategy.showDatabases(); // In MySQL, databases and schemas are the same
        break;
      case 'tables':
        // For PostgreSQL, use schema parameter; for MySQL, use database parameter
        const targetSchema = clientType === 'pg' ? (schema || 'public') : database;
        if (!targetSchema) {
          throw new Error('Database/schema name is required for table query.');
        }
        queryInfo = queryStrategy.showTables(targetSchema);
        break;
      default:
        throw new Error(`Unsupported information type: ${type}`);
    }

    // Execute query using Knex
    const results = await connection.raw(queryInfo.query, queryInfo.params);

    // Process results
    let formattedResults: string[] = [];

    // Handle different result formats based on database type
    let rows;
    if (clientType === 'mysql' || clientType === 'mysql2') {
      // MySQL: Knex raw query returns [rows, fields] format
      rows = Array.isArray(results) && results.length > 0 ? results[0] : results;
    } else if (clientType === 'databricks') {
      // Databricks: Results are in rows property directly
      rows = results.rows || results;
    } else {
      // PostgreSQL: Results are in rows property
      rows = results.rows || results;
    }

    // Extract the first column value from each row
    if (Array.isArray(rows)) {
      formattedResults = rows.map(row => {
        // For Databricks SHOW TABLES, the table name might be in 'tableName' field
        if (clientType === 'databricks' && type === 'tables') {
          return row.tableName || row.table_name || row.TABLE_NAME || Object.values(row)[0] as string;
        }
        // Get the first value from the row object
        const firstValue = Object.values(row)[0];
        return firstValue as string;
      });
    }

    return {
      success: true,
      data: {
        success: true,
        type,
        results: formattedResults,
        message: `${type} information successfully retrieved.`
      }
    };
  } catch (error: any) {
    console.error('Database information retrieval error:', error);

    return {
      success: false,
      error: error.message,
      message: 'An error occurred while retrieving database information.'
    };
  } finally {
    // Return connection
    if (connection) {
      releaseConnection(connection);
    }
  }
}

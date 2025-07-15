/**
 * Database information retrieval service
 */
import { getConnection, releaseConnection } from './database.js';
import type { APIResponse } from '../types/index.js';

// Database query
const SHOW_DATABASES_QUERY = 'SHOW DATABASES';

// Schema query (In MySQL, database and schema are the same)
const SHOW_SCHEMAS_QUERY = 'SHOW DATABASES';

// Table query
const SHOW_TABLES_QUERY = 'SHOW TABLES';

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
  const { type = 'databases', database, schema: _schema } = params;

  let connection: any = null;
  let query = '';

  try {
    // Select query based on type
    switch (type.toLowerCase()) {
      case 'databases':
        query = SHOW_DATABASES_QUERY;
        break;
      case 'schemas':
        query = SHOW_SCHEMAS_QUERY;
        break;
      case 'tables':
        if (!database) {
          throw new Error('Database name is required for table query.');
        }
        query = SHOW_TABLES_QUERY;
        break;
      default:
        throw new Error(`Unsupported information type: ${type}`);
    }

    // Get database connection (Knex pool)
    connection = getConnection(dbKey);

    // Select database first when querying tables
    if (type.toLowerCase() === 'tables' && database) {
      await connection.raw(`USE ??`, [database]);
    }

    // Execute query using Knex
    const results = await connection.raw(query);

    // Process results
    let formattedResults: string[] = [];

    // Knex raw query returns [rows, fields] format (for MySQL)
    const rows = Array.isArray(results) && results.length > 0 ? results[0] : results;

    if (type.toLowerCase() === 'databases' || type.toLowerCase() === 'schemas') {
      // Database/schema list
      formattedResults = Array.isArray(rows) ? rows.map(row => Object.values(row)[0] as string) : [];
    } else if (type.toLowerCase() === 'tables') {
      // Table list
      formattedResults = Array.isArray(rows) ? rows.map(row => Object.values(row)[0] as string) : [];
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

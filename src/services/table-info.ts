/**
 * Table information retrieval service
 */
// import { getConnection, releaseConnection } from './database';
// import config from '../config';
// import type { APIResponse } from '../types';

// Column information query
const SHOW_COLUMNS_QUERY = 'SHOW COLUMNS FROM ??';

// Index information query
const SHOW_INDEXES_QUERY = 'SHOW INDEXES FROM ??';

// Constraint query (MySQL doesn't have direct constraint query, so using information_schema)
const SHOW_CONSTRAINTS_QUERY = `
  SELECT
    tc.CONSTRAINT_NAME,
    tc.CONSTRAINT_TYPE,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME
  FROM
    information_schema.TABLE_CONSTRAINTS tc
  JOIN
    information_schema.KEY_COLUMN_USAGE kcu
  ON
    tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
  WHERE
    tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
`;

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
  database: string;
  info?: TableInfo;
  error?: string;
  message: string;
}

/**
 * Table information retrieval function
 */
// export async function getTableInfo(params: TableInfoParams): Promise<APIResponse<TableInfoResult>> {
//   const { table, database, schema, info_type = 'all' } = params;

//   if (!table) {
//     return {
//       success: false,
//       error: 'Table name is required.',
//       message: 'Please provide table name for table information retrieval.'
//     };
//   }

//   let connection: any = null;

//   try {
//     // Get database connection
//     connection = getConnection(database);

//     // Initialize result object
//     const info: TableInfo = {};

//     // Query column information
//     if (info_type === 'columns' || info_type === 'all') {
//       const columnsResults: any[] = await new Promise((resolve, reject) => {
//         connection.query(SHOW_COLUMNS_QUERY, [table], (err: any, results: any[]) => {
//           if (err) reject(err);
//           else resolve(results);
//         });
//       });

//       info.columns = columnsResults;
//     }

//     // Query index information
//     if (info_type === 'indexes' || info_type === 'all') {
//       const indexesResults: any[] = await new Promise((resolve, reject) => {
//         connection.query(SHOW_INDEXES_QUERY, [table], (err: any, results: any[]) => {
//           if (err) reject(err);
//           else resolve(results);
//         });
//       });

//       info.indexes = indexesResults;
//     }

//     // Query constraint information
//     if (info_type === 'constraints' || info_type === 'all') {
//       const constraintsResults: any[] = await new Promise((resolve, reject) => {
//         connection.query(SHOW_CONSTRAINTS_QUERY, [database, table], (err: any, results: any[]) => {
//           if (err) reject(err);
//           else resolve(results);
//         });
//       });

//       info.constraints = constraintsResults;
//     }

//     return {
//       success: true,
//       data: {
//         success: true,
//         table,
//         database,
//         info,
//         message: `Table information successfully retrieved.`
//       }
//     };
//   } catch (error: any) {
//     console.error('Table information retrieval error:', error);

//     return {
//       success: false,
//       error: error.message,
//       message: 'An error occurred while retrieving table information.'
//     };
//   } finally {
//     // Return connection
//     if (connection) {
//       releaseConnection(connection);
//     }
//   }
// }

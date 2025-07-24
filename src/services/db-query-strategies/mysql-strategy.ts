/**
 * MySQL Query Strategy Implementation
 */
import type { DatabaseQueryStrategy, QueryInfo } from './index.js';

export class MySQLQueryStrategy implements DatabaseQueryStrategy {
  showDatabases(): QueryInfo {
    return {
      query: 'SHOW DATABASES'
    };
  }
  
  showTables(database: string): QueryInfo {
    // Use SHOW TABLES FROM to avoid USE command which changes connection state
    return {
      query: 'SHOW TABLES FROM ??',
      params: [database]
    };
  }
  
  showColumns(database: string, table: string): QueryInfo {
    // Use fully qualified table name to avoid USE command
    return {
      query: 'SHOW COLUMNS FROM ??.??',
      params: [database, table]
    };
  }
  
  showIndexes(database: string, table: string): QueryInfo {
    // Use fully qualified table name to avoid USE command
    return {
      query: 'SHOW INDEXES FROM ??.??',
      params: [database, table]
    };
  }
  
  showConstraints(database: string, table: string): QueryInfo {
    // MySQL doesn't have direct SHOW CONSTRAINTS, use information_schema
    return {
      query: `
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
          AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
          AND tc.TABLE_NAME = kcu.TABLE_NAME
        WHERE
          tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
      `,
      params: [database, table]
    };
  }
}
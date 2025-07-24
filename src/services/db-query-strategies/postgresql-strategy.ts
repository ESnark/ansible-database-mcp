/**
 * PostgreSQL Query Strategy Implementation
 */
import type { DatabaseQueryStrategy, QueryInfo } from './index.js';

export class PostgreSQLQueryStrategy implements DatabaseQueryStrategy {
  showDatabases(): QueryInfo {
    // PostgreSQL uses different terminology - databases instead of schemas
    return {
      query: `
        SELECT datname AS database_name
        FROM pg_database
        WHERE datistemplate = false
        ORDER BY datname
      `
    };
  }
  
  showTables(schema: string = 'public'): QueryInfo {
    // PostgreSQL uses schemas, default to 'public' if not specified
    return {
      query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
      params: [schema]
    };
  }
  
  showColumns(schema: string, table: string): QueryInfo {
    // For PostgreSQL, the 'database' parameter is actually the schema
    return {
      query: `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
        ORDER BY ordinal_position
      `,
      params: [schema, table]
    };
  }
  
  showIndexes(schema: string, table: string): QueryInfo {
    return {
      query: `
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          am.amname AS index_type,
          idx.indisunique AS is_unique,
          idx.indisprimary AS is_primary
        FROM pg_index idx
        JOIN pg_class t ON t.oid = idx.indrelid
        JOIN pg_class i ON i.oid = idx.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_am am ON am.oid = i.relam
        WHERE n.nspname = $1
          AND t.relname = $2
        ORDER BY i.relname, a.attnum
      `,
      params: [schema, table]
    };
  }
  
  showConstraints(schema: string, table: string): QueryInfo {
    return {
      query: `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY tc.constraint_type, tc.constraint_name
      `,
      params: [schema, table]
    };
  }
}
/**
 * Database Query Strategy Pattern
 * Provides database-specific query implementations
 */
import { MySQLQueryStrategy } from './mysql-strategy.js';
import { PostgreSQLQueryStrategy } from './postgresql-strategy.js';
import { DatabricksQueryStrategy } from './databricks-strategy.js';

export interface QueryInfo {
  query: string;
  params?: any[];
}

export interface DatabaseQueryStrategy {
  // Database/Schema operations
  showDatabases(): QueryInfo;
  
  // Table operations
  showTables(database: string): QueryInfo;
  
  // Column operations
  showColumns(database: string, table: string): QueryInfo;
  
  // Index operations
  showIndexes(database: string, table: string): QueryInfo;
  
  // Constraint operations
  showConstraints(database: string, table: string): QueryInfo;
}

/**
 * Factory class to create appropriate query strategy based on database client
 */
export class QueryStrategyFactory {
  static create(client: string): DatabaseQueryStrategy {
    switch(client) {
      case 'mysql':
      case 'mysql2':
        return new MySQLQueryStrategy();
        
      case 'pg':
      case 'postgres':
        return new PostgreSQLQueryStrategy();
        
      case 'databricks':
        return new DatabricksQueryStrategy();
        
      default:
        throw new Error(`Unsupported database client: ${client}`);
    }
  }
}

/**
 * Helper function to extract database client from Knex connection
 */
export function getDatabaseClient(connection: any): string {
  // Knex stores client info in connection.client.config.client
  if (connection?.client?.config?.client) {
    return connection.client.config.client;
  }
  
  // Fallback to checking constructor name
  if (connection?.client?.constructor?.name) {
    const name = connection.client.constructor.name.toLowerCase();
    if (name.includes('mysql')) return 'mysql2';
    if (name.includes('pg') || name.includes('postgres')) return 'pg';
  }
  
  throw new Error('Could not determine database client type');
}
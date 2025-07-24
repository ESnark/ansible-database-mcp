/**
 * Databricks Query Strategy Implementation
 */
import type { DatabaseQueryStrategy, QueryInfo } from './index.js';

export class DatabricksQueryStrategy implements DatabaseQueryStrategy {
  showDatabases(): QueryInfo {
    // In Databricks, we show catalogs first, then schemas
    return {
      query: 'SHOW CATALOGS'
    };
  }
  
  showTables(database: string): QueryInfo {
    // Database in Databricks context can be catalog.schema format
    if (database.includes('.')) {
      const [catalog, schema] = database.split('.');
      return {
        query: `SHOW TABLES IN ${catalog}.${schema}`
      };
    }
    // Default to current catalog
    return {
      query: `SHOW TABLES IN ${database}`
    };
  }
  
  showColumns(database: string, table: string): QueryInfo {
    // In Databricks, we use DESCRIBE TABLE
    let fullTableName = table;
    if (database.includes('.')) {
      fullTableName = `${database}.${table}`;
    } else {
      fullTableName = `${database}.${table}`;
    }
    
    return {
      query: `DESCRIBE TABLE ${fullTableName}`
    };
  }
  
  showIndexes(database: string, table: string): QueryInfo {
    // Databricks doesn't have traditional indexes, but we can show table properties
    let fullTableName = table;
    if (database.includes('.')) {
      fullTableName = `${database}.${table}`;
    } else {
      fullTableName = `${database}.${table}`;
    }
    
    return {
      query: `SHOW TBLPROPERTIES ${fullTableName}`
    };
  }
  
  showConstraints(database: string, table: string): QueryInfo {
    // Databricks supports constraints via DESCRIBE TABLE EXTENDED
    let fullTableName = table;
    if (database.includes('.')) {
      fullTableName = `${database}.${table}`;
    } else {
      fullTableName = `${database}.${table}`;
    }
    
    return {
      query: `DESCRIBE TABLE EXTENDED ${fullTableName}`
    };
  }
  
  // Additional Databricks-specific methods
  showSchemas(catalog?: string): QueryInfo {
    if (catalog) {
      return {
        query: `SHOW SCHEMAS IN ${catalog}`
      };
    }
    return {
      query: 'SHOW SCHEMAS'
    };
  }
  
  showCatalogs(): QueryInfo {
    return {
      query: 'SHOW CATALOGS'
    };
  }
}
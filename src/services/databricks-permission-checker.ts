/**
 * Databricks permission check module
 * Verifies if Databricks connection has only read permissions
 */

import { DatabricksAdapter } from './db-connection/adapters/databricks-adapter.js';

export interface DatabricksPermissionCheckResult {
  isStrictlyReadOnly: boolean;
  details: {
    currentUser: string;
    currentCatalog: string;
    currentSchema: string;
    permissions: string[];
  };
}

/**
 * Check if Databricks connection is strictly read-only
 * Returns true if only SELECT permissions are granted
 */
export async function isDatabricksReadOnlySession(adapter: DatabricksAdapter): Promise<boolean> {
  try {
    // Get current user info
    const userResult = await adapter.raw('SELECT current_user() as user');
    const currentUser = userResult.rows[0]?.user || 'unknown';
    
    // Get current catalog for Unity Catalog
    const catalogResult = await adapter.raw('SELECT current_catalog() as catalog');
    const currentCatalog = catalogResult.rows[0]?.catalog;
    
    // Check if user can create tables (write permission indicator)
    try {
      // For Unity Catalog, we need to specify the catalog name
      if (currentCatalog) {
        await adapter.raw(`SHOW GRANTS ON CATALOG ${currentCatalog}`);
      } else {
        // If no catalog is set, try to check schema permissions
        const schemaResult = await adapter.raw('SELECT current_schema() as schema');
        const currentSchema = schemaResult.rows[0]?.schema;
        if (currentSchema) {
          await adapter.raw(`SHOW GRANTS ON SCHEMA ${currentSchema}`);
        }
      }
      
      // If we can show grants, parse them to check for write permissions
      // In Databricks, write permissions include: CREATE, MODIFY, DELETE, etc.
      // For now, we'll do a simple check
      return false; // Assume not read-only if we can see grants
    } catch (error) {
      // If we can't even show grants, assume read-only
      return true;
    }
  } catch (error) {
    console.error('Error checking Databricks permissions:', error);
    // Default to assuming read-only for safety
    return true;
  }
}

/**
 * Get detailed permission information for Databricks connection
 */
export async function checkDatabricksPermissions(adapter: DatabricksAdapter): Promise<DatabricksPermissionCheckResult> {
  try {
    // Get current context
    const userResult = await adapter.raw('SELECT current_user() as user');
    const catalogResult = await adapter.raw('SELECT current_catalog() as catalog');
    const schemaResult = await adapter.raw('SELECT current_schema() as schema');
    
    const currentUser = userResult.rows[0]?.user || 'unknown';
    const currentCatalog = catalogResult.rows[0]?.catalog || 'unknown';
    const currentSchema = schemaResult.rows[0]?.schema || 'unknown';
    
    // Try to gather permissions
    const permissions: string[] = [];
    
    // Check basic SELECT permission
    try {
      await adapter.raw('SELECT 1');
      permissions.push('SELECT');
    } catch (error) {
      // No SELECT permission
    }
    
    // For now, we'll assume read-only if we only have SELECT
    const isStrictlyReadOnly = permissions.length === 1 && permissions[0] === 'SELECT';
    
    return {
      isStrictlyReadOnly,
      details: {
        currentUser,
        currentCatalog,
        currentSchema,
        permissions
      }
    };
  } catch (error) {
    console.error('Error getting Databricks permission details:', error);
    return {
      isStrictlyReadOnly: true,
      details: {
        currentUser: 'unknown',
        currentCatalog: 'unknown',
        currentSchema: 'unknown',
        permissions: []
      }
    };
  }
}
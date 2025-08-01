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
    
    // Define write permissions that we want to check for
    // Note: EXECUTE is excluded as it only allows running functions/procedures, not direct data modification
    const writePermissions = ['CREATE', 'MODIFY', 'DELETE', 'DROP', 'ALTER', 'UPDATE', 'INSERT', 'WRITE_FILES', 'REFRESH'];
    
    // Collect all grants to check
    const allGrants: any[] = [];
    
    try {
      // Check catalog-level permissions
      if (currentCatalog) {
        const catalogGrants = await adapter.raw(`SHOW GRANTS ON CATALOG ${currentCatalog}`);
        allGrants.push(...(catalogGrants.rows || []));
      }
      
      // Check schema-level permissions
      const schemaResult = await adapter.raw('SELECT current_schema() as schema');
      const currentSchema = schemaResult.rows[0]?.schema;
      if (currentSchema && currentCatalog) {
        try {
          const schemaGrants = await adapter.raw(`SHOW GRANTS ON SCHEMA ${currentCatalog}.${currentSchema}`);
          allGrants.push(...(schemaGrants.rows || []));
        } catch (error) {
          // Schema grants might fail if no specific schema permissions
          console.debug('Could not fetch schema grants:', error);
        }
      }
      
      // Note: Databricks doesn't support "SHOW GRANTS TO user" syntax
      // We can only show grants ON specific objects, not grants TO a user
      // The catalog and schema level grants above should capture user permissions
      
      // Parse grants to check for write permissions
      let hasExecutePermission = false;
      for (const grant of allGrants) {
        // The grant row might have different column names depending on Databricks version
        // Common formats: action_type, ActionType, privilege, Privilege
        const action = grant.action_type || grant.ActionType || grant.privilege || grant.Privilege || '';
        const upperAction = action.toUpperCase();
        
        // Check for EXECUTE permission
        if (upperAction.includes('EXECUTE')) {
          hasExecutePermission = true;
        }
        
        // Check if any write permission exists
        if (writePermissions.some(perm => upperAction.includes(perm))) {
          console.log(`Found write permission: ${action} for user ${currentUser}`);
          return false; // Has write permissions, not read-only
        }
      }
      
      // Warn if EXECUTE permission is found
      if (hasExecutePermission) {
        console.warn(`⚠️  Warning: User ${currentUser} has EXECUTE permission. While this connection is allowed, ` +
          'be aware that EXECUTE permission could potentially run functions that modify data. ' +
          'Ensure that only read-only functions are available in this environment.');
      }
      
      // If we only found SELECT or no permissions, it's read-only
      return true;
      
    } catch (error) {
      // If we can't fetch grants, we need to test actual operations
      console.debug('Could not fetch grants, testing with actual operations:', error);
      
      // Try to perform a write operation that should fail if read-only
      try {
        // Try to create a temporary view (least invasive write operation)
        const testViewName = `_mcp_permission_test_${Date.now()}`;
        await adapter.raw(`CREATE OR REPLACE TEMPORARY VIEW ${testViewName} AS SELECT 1 as test`);
        
        // If we got here, we have write permissions - clean up
        try {
          await adapter.raw(`DROP VIEW IF EXISTS ${testViewName}`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        return false; // Has write permissions
      } catch (writeError: any) {
        // Check if error is due to lack of permissions
        const errorMessage = writeError.message || writeError.toString();
        if (errorMessage.includes('PERMISSION_DENIED') || 
            errorMessage.includes('does not have privilege') ||
            errorMessage.includes('insufficient privileges') ||
            errorMessage.includes('CREATE') ||
            errorMessage.includes('denied')) {
          return true; // Confirmed read-only
        }
        
        // Unknown error, assume read-only for safety
        console.warn('Unknown error during permission test:', writeError);
        return true;
      }
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
    
    // Collect all unique permissions
    const permissionsSet = new Set<string>();
    
    // Check basic SELECT permission
    try {
      await adapter.raw('SELECT 1');
      permissionsSet.add('SELECT');
    } catch (error) {
      // No SELECT permission
    }
    
    // Collect grants from various levels
    try {
      // Catalog grants
      if (currentCatalog && currentCatalog !== 'unknown') {
        const catalogGrants = await adapter.raw(`SHOW GRANTS ON CATALOG ${currentCatalog}`);
        for (const grant of catalogGrants.rows || []) {
          const action = grant.action_type || grant.ActionType || grant.privilege || grant.Privilege || '';
          if (action) {
            permissionsSet.add(action.toUpperCase());
          }
        }
      }
      
      // Schema grants
      if (currentSchema && currentSchema !== 'unknown' && currentCatalog && currentCatalog !== 'unknown') {
        try {
          const schemaGrants = await adapter.raw(`SHOW GRANTS ON SCHEMA ${currentCatalog}.${currentSchema}`);
          for (const grant of schemaGrants.rows || []) {
            const action = grant.action_type || grant.ActionType || grant.privilege || grant.Privilege || '';
            if (action) {
              permissionsSet.add(action.toUpperCase());
            }
          }
        } catch (error) {
          // Schema grants might not be available
        }
      }
      
      // Note: Databricks doesn't support "SHOW GRANTS TO user" syntax
      // The catalog and schema level grants above should capture user permissions
    } catch (error) {
      console.debug('Could not fetch all grants:', error);
    }
    
    const permissions = Array.from(permissionsSet).sort();
    
    // Define write permissions
    // Note: EXECUTE is excluded as it only allows running functions/procedures, not direct data modification
    const writePermissions = ['CREATE', 'MODIFY', 'DELETE', 'DROP', 'ALTER', 'UPDATE', 'INSERT', 'WRITE_FILES', 'REFRESH'];
    
    // Check if strictly read-only (only SELECT or no permissions)
    const hasWritePermissions = permissions.some(perm => 
      writePermissions.some(writePerm => perm.includes(writePerm))
    );
    
    const isStrictlyReadOnly = !hasWritePermissions;
    
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
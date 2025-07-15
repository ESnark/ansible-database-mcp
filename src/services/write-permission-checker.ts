/**
 * Write permission check module
 * Verifies if MySQL connection is read-only by checking write permissions
 */

import { Knex } from "knex";

export interface PermissionCheckResult {
  isStrictlyReadOnly: boolean;
  details: {
    isReadOnlyNode: boolean;
    hasSuper: boolean;
    hasWritePrivileges: boolean;
    hasExecute: boolean;
    grants: string;
    readOnly: string;
    superReadOnly: string;
  };
}

/**
 * Check if connection is strictly read-only
 * Returns false if write is possible to block the connection
 */
export async function isStrictlyReadOnlySession(connection: Knex): Promise<boolean> {
  // 1. Check read_only status
  const [[{ Value: innodbReadOnly }]] = await connection.raw("SHOW VARIABLES LIKE 'innodb_read_only'") as any;
  const [[{ Value: readOnly }]] = await connection.raw("SHOW VARIABLES LIKE 'read_only'") as any;
  const [[{ Value: superReadOnly }]] = await connection.raw("SHOW VARIABLES LIKE 'super_read_only'") as any;

  const isReadOnlyNode = readOnly === 'ON' || superReadOnly === 'ON';

  // 2. Check user privileges
  const [grantsRows] = await connection.raw("SHOW GRANTS FOR CURRENT_USER()");
  const grants = (grantsRows as any[])
    .map(row => Object.values(row)[0] as string)
    .join(' ')
    .toUpperCase();

  const hasSuper = grants.includes('SUPER') || grants.includes('ALL PRIVILEGES');
  const hasWritePrivileges = /INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|ALL PRIVILEGES/.test(grants);
  const hasExecute = grants.includes('EXECUTE');

  // 3. Conditional branching logic
  if (innodbReadOnly === 'ON') {
    return true;
  }

  if (isReadOnlyNode) {
    // If DB is read-only, write is possible with SUPER privilege
    return !hasSuper;
  } else {
    // If DB is writable, write is disabled only if user privileges are restricted
    return !(hasWritePrivileges || hasExecute);
  }
}

/**
 * Return detailed permission check results
 */
export async function checkPermissions(connection: any): Promise<PermissionCheckResult> {
  // 1. Check read_only status
  const [[{ Value: readOnly }]] = await connection.query("SHOW VARIABLES LIKE 'read_only'") as any;
  const [[{ Value: superReadOnly }]] = await connection.query("SHOW VARIABLES LIKE 'super_read_only'") as any;

  const isReadOnlyNode = readOnly === 'ON' || superReadOnly === 'ON';

  // 2. Check user privileges
  const [grantsRows] = await connection.query("SHOW GRANTS FOR CURRENT_USER()");
  const grants = (grantsRows as any[])
    .map(row => Object.values(row)[0] as string)
    .join(' ')
    .toUpperCase();

  const hasSuper = grants.includes('SUPER') || grants.includes('ALL PRIVILEGES');
  const hasWritePrivileges = /INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|ALL PRIVILEGES/.test(grants);
  const hasExecute = grants.includes('EXECUTE');

  // 3. Check strict read-only status
  let isStrictlyReadOnly: boolean;
  if (isReadOnlyNode) {
    // If DB is read-only, write is possible with SUPER privilege
    isStrictlyReadOnly = !hasSuper;
  } else {
    // If DB is writable, write is disabled only if user privileges are restricted
    isStrictlyReadOnly = !(hasWritePrivileges || hasExecute);
  }

  return {
    isStrictlyReadOnly,
    details: {
      isReadOnlyNode,
      hasSuper,
      hasWritePrivileges,
      hasExecute,
      grants,
      readOnly,
      superReadOnly
    }
  };
}
// Base connection configuration shared by traditional databases
interface BaseConnection {
  host: string;
  port: number;
}

// MySQL/PostgreSQL connection config
interface TraditionalDBConnection extends BaseConnection {
  user: string;
  password: string;
  database: string;
}

// Databricks connection config
interface DatabricksConnection extends BaseConnection {
  path: string;
  token: string;
  catalog?: string;
  database?: string;  // In Databricks, this is actually the schema
}

export interface DatabaseConfig {
  client: 'mysql2' | 'pg' | 'sqlite3' | 'databricks';
  connection: TraditionalDBConnection | DatabricksConnection;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  description?: string;
}

// Type guards
export function isTraditionalDBConnection(connection: any): connection is TraditionalDBConnection {
  return 'user' in connection && 'password' in connection && 'database' in connection;
}

export function isDatabricksConnection(connection: any): connection is DatabricksConnection {
  return 'path' in connection && 'token' in connection;
}

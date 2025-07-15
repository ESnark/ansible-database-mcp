export interface DatabaseConfig {
  client: 'mysql2' | 'pg' | 'sqlite3';
  connection: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
  };
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  description?: string;
}

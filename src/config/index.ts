/**
 * Environment configuration module
 */
import type { AppConfig } from '../types/index.js';

const config: AppConfig = {
  // Environment configuration
  nodeEnv: process.env.NODE_ENV || 'development',

  // MCP server configuration
  mcpServer: {
    port: parseInt(process.env.MCP_PORT || '3001', 10),
    name: process.env.MCP_NAME || 'ansible-database',
    version: process.env.MCP_VERSION || '1.0.0',
  },
};

// Additional configurations
export const queryConfig = {
  timeout: parseInt(process.env.QUERY_TIMEOUT || '30', 10),
  maxTimeout: parseInt(process.env.MAX_QUERY_TIMEOUT || '60', 10),
};

export const securityConfig = {
  enableSqlInjectionProtection: process.env.ENABLE_SQL_INJECTION_PROTECTION !== 'false',
};

export default config;
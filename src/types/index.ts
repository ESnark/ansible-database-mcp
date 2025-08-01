// Import SDK standard error classes
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerConfig {
  port: number;
  name: string;
  version: string;
}

export interface AppConfig {
  nodeEnv: string;
  mcpServer: MCPServerConfig;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface QueryResult {
  rows: any[];
  fields: any[];
  rowCount: number;
}

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  close: () => Promise<void>;
  isConnected: () => boolean;
}

// MCP Tool interface following SDK standard Tool structure
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  // Add actual tool handler function (not in SDK standard)
  handler?: (args: any) => Promise<any>;
}

export interface MCPServerInstance {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
}

// Re-export SDK standard error classes
export { McpError, ErrorCode };
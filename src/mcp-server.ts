/**
 * MCP server using official ModelContextProtocol SDK
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { closeAllConnections } from './services/database.js';
import type { MCPServerInstance } from './types/index.js';

/**
 * Initialize and run MCP server
 */
export async function startMCPServer(): Promise<MCPServerInstance> {
  try {
    // Create MCP server
    const server = new Server(
      {
        name: 'ansible-database',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );


    // Create and connect transport layer
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.log('MCP server started via stdio transport.');

    // Handle shutdown signals
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM signal. Shutting down MCP server.');
      void gracefulShutdown(server);
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT signal. Shutting down MCP server.');
      void gracefulShutdown(server);
    });

    return {
      start: async () => {
        // Already started
      },
      stop: async () => {
        await server.close();
      },
      isRunning: () => {
        return true; // Simple implementation
      }
    };
  } catch (error) {
    console.error('MCP server start error:', error);
    throw error;
  }
}

/**
 * Graceful MCP server shutdown
 */
async function gracefulShutdown(server: any): Promise<void> {
  console.log('Shutting down MCP server...');

  try {
    // Shutdown MCP server
    if (server) {
      await server.close();
    }

    // Close database connections
    await closeAllConnections();

    console.log('MCP server shut down successfully.');
    process.exit(0);
  } catch (error) {
    console.error('MCP server shutdown error:', error);
    process.exit(1);
  }
}

import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { query, connectionInfo, listTables, getTable } from './tools/index.js';
import * as ask from './prompts/ask.js';
import * as context from './resources/context.js';

export const mcpMiddleware = async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  try {
    const server = new McpServer({
      name: 'ansible-database',
      version: '1.0.0',
    }, {
      instructions: `Use the 'ask' prompt for usage instructions and 'database-context' resource for database and table context information`,
      capabilities: { 
        tools: {},
        resources: {},
        prompts: {}
      },
    });

    res.on('close', () => {
      console.log('session closed');
      transport.close();
      server.close();
    });

    server.registerTool(connectionInfo.definition.name, {
      description: connectionInfo.definition.description,
      inputSchema: connectionInfo.definition.inputSchema
    }, connectionInfo.handler);

    server.registerTool(query.definition.name, {
      description: query.definition.description,
      inputSchema: query.definition.inputSchema
    }, query.handler);

    server.registerTool(listTables.definition.name, {
      description: listTables.definition.description,
      inputSchema: listTables.definition.inputSchema
    }, listTables.handler);

    server.registerTool(getTable.definition.name, {
      description: getTable.definition.description,
      inputSchema: getTable.definition.inputSchema
    }, getTable.handler);

    server.registerPrompt(
      ask.definition.name,
      {
        description: ask.definition.description,
        argsSchema: ask.definition.arguments
      },
      (args) => {
        const question = args.question as string;
        const useContext: boolean = args['use-context'] === 'true';
        return ask.handler(question, useContext);
      }
    );

    server.registerResource(
      context.definition.name,
      context.definition.uri,
      {
        title: context.definition.title,
        description: context.definition.description,
        mimeType: context.definition.mimeType,
      },
      context.definition.handler
    );

    await server.connect(transport);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }

  await transport.handleRequest(req, res, req.body);
}
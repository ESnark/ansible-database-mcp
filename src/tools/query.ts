import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { executeQuery } from "../services/query.js";
import environment from "../config/environment.js";

const definition: ToolDefinition = {
  name: 'execute-sql-query',
  description: 'Execute SQL query and return results. Validates write permissions on connection to ensure read-only access. ' +
    'IMPORTANT: For Databricks connections with EXECUTE permissions - if your query calls any functions or stored procedures, ' +
    'please review them carefully before execution as they could potentially modify data. Ask the user to confirm before ' +
    'executing any CALL statements or function invocations on Databricks.',
  inputSchema: {
    query: z.string().describe('SQL query to execute'),
    database: z.string().describe('Database name to connect to'),
    schema: z.string().optional().describe('Schema name to use (required for PostgreSQL)'),
    timeout: z.number().min(10).max(60).default(30).describe('Query timeout in seconds, default 30s, min 10s, max 60s'),
  },
};

const handler: ToolCallback<typeof definition.inputSchema> = async (args) => {
  const { query, database, schema, timeout } = args as z.infer<z.ZodObject<typeof definition.inputSchema>>;

  try {
    // Check if database exists in configuration
    const config = environment.getConfig();
    if (!config[database]) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Database '${database}' not found in configuration. Available databases: ${Object.keys(config).join(', ')}`,
          },
        ],
      };
    }

    // Execute the query
    const result = await executeQuery(database, {
      query,
      timeout,
    });

    if (result.success && result.data) {
      // Format the successful result
      const formattedResult = {
        success: true,
        rowCount: result.data.rowCount,
        results: result.data.results,
        message: result.data.message,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedResult, null, 2),
          },
        ],
      };
    } else {
      // Format the error result with full details
      const errorResponse: any = {
        success: false,
        error: result.error || 'Unknown error occurred',
        message: result.message || 'Query execution failed',
      };
      
      // Include details if available
      if (result.details) {
        errorResponse.details = result.details;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }
  } catch (error: any) {
    // Handle unexpected errors
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message || 'Unexpected error occurred',
            message: 'Failed to execute query',
          }, null, 2),
        },
      ],
    };
  }
};

export { definition, handler };
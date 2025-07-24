import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { getTableInfo } from "@/services/table-info.js";
import environment from "@/config/environment.js";

const definition: ToolDefinition = {
  name: 'get-table',
  description: 'Get schema information for a specific table including columns, indexes, and constraints.',
  inputSchema: {
    database: z.string().describe('Database name'),
    table: z.string().describe('Table name to get schema information for'),
    info_type: z.enum(['columns', 'indexes', 'constraints', 'all']).optional().describe('Type of information to retrieve (default: all)'),
  },
};

const handler: ToolCallback<typeof definition.inputSchema> = async (args) => {
  const { database, table, info_type = 'all' } = args as z.infer<z.ZodObject<typeof definition.inputSchema>>;

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

    const dbConfig = config[database];
    const dbName = dbConfig.connection.database;

    // Use the getTableInfo service with strategy pattern
    const result = await getTableInfo(database, {
      table,
      database: dbName,
      info_type
    });

    if (result.success && result.data) {
      // Format the successful result
      const formattedResult = {
        success: true,
        database: database,
        table: table,
        dbName: result.data.database || result.data.schema,
        columns: result.data.info?.columns || [],
        indexes: result.data.info?.indexes || [],
        constraints: result.data.info?.constraints || [],
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
      // Handle error case
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              database: database,
              table: table,
              error: result.error || 'Unknown error',
              message: result.message || 'Failed to get table schema information',
            }, null, 2),
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
            database: database,
            table: table,
            error: error.message || 'Unexpected error occurred',
            message: 'Failed to get table schema information',
          }, null, 2),
        },
      ],
    };
  }
};

export { definition, handler };
import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { getDatabaseInfo } from "../services/database-info.js";
import environment from "../config/environment.js";

const definition: ToolDefinition = {
  name: 'list-tables',
  description: 'List all tables in a database.',
  inputSchema: {
    database: z.string().describe('Database name to list tables from'),
  },
};

const handler: ToolCallback<typeof definition.inputSchema> = async (args) => {
  const { database } = args as z.infer<z.ZodObject<typeof definition.inputSchema>>;

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

    // Get table list using the database info service
    const connection = config[database].connection as any;
    let dbName: string;
    
    // For Databricks, we need to use catalog.database format
    if (config[database].client === 'databricks') {
      dbName = `${connection.catalog}.${connection.database}`;
    } else {
      dbName = connection.database || database;
    }
    
    const result = await getDatabaseInfo(database, {
      type: 'tables',
      database: dbName,
    });

    if (result.success && result.data) {
      // Format the successful result
      const formattedResult = {
        success: true,
        database: database,
        tables: result.data.results || [],
        count: result.data.results?.length || 0,
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
      // Format the error result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              database: database,
              error: result.error || 'Unknown error occurred',
              message: result.message || 'Failed to retrieve table list',
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
            error: error.message || 'Unexpected error occurred',
            message: 'Failed to list tables',
          }, null, 2),
        },
      ],
    };
  }
};

export { definition, handler };
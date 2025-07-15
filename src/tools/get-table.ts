import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { getConnection, releaseConnection } from "@/services/database.js";
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

  let connection: any = null;

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

    // Get database connection
    connection = getConnection(database);
    const dbName = config[database].connection.database;

    // Result object
    const tableInfo: any = {
      success: true,
      database: database,
      table: table,
    };

    // Get column information
    if (info_type === 'columns' || info_type === 'all') {
      try {
        const [columns] = await connection.raw('SHOW COLUMNS FROM ??', [table]);
        tableInfo.columns = columns;
      } catch (error: any) {
        tableInfo.columns = [];
        tableInfo.columnsError = error.message;
      }
    }

    // Get index information
    if (info_type === 'indexes' || info_type === 'all') {
      try {
        const [indexes] = await connection.raw('SHOW INDEXES FROM ??', [table]);
        tableInfo.indexes = indexes;
      } catch (error: any) {
        tableInfo.indexes = [];
        tableInfo.indexesError = error.message;
      }
    }

    // Get constraint information
    if (info_type === 'constraints' || info_type === 'all') {
      try {
        const [constraints] = await connection.raw(`
          SELECT
            tc.CONSTRAINT_NAME,
            tc.CONSTRAINT_TYPE,
            kcu.COLUMN_NAME,
            kcu.REFERENCED_TABLE_NAME,
            kcu.REFERENCED_COLUMN_NAME
          FROM
            information_schema.TABLE_CONSTRAINTS tc
          JOIN
            information_schema.KEY_COLUMN_USAGE kcu
          ON
            tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
            AND tc.TABLE_NAME = kcu.TABLE_NAME
          WHERE
            tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
        `, [dbName, table]);
        tableInfo.constraints = constraints;
      } catch (error: any) {
        tableInfo.constraints = [];
        tableInfo.constraintsError = error.message;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tableInfo, null, 2),
        },
      ],
    };
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
  } finally {
    // Release connection
    if (connection) {
      releaseConnection(connection);
    }
  }
};

export { definition, handler };
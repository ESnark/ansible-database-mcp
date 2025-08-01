import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { getDatabaseList } from "../services/db-connection/index.js";

const definition: ToolDefinition = {
  name: 'connection-info',
  description: 'Get connection information for a database',
  inputSchema: {},
};

const handler: ToolCallback<typeof definition.inputSchema> = async (args, extra) => {
  const databaseList = getDatabaseList();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(databaseList, null, 2),
      },
    ],
  };
};

export { definition, handler };
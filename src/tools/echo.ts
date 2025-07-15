import { ToolDefinition } from "../types/modelcontextprotocol.js";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

const definition: ToolDefinition = {
  name: 'echo',
  description: 'Echo the message',
  inputSchema: {
    message: z.string(),
  },
  outputSchema: {
    message: z.string(),
  },
};

const handler: ToolCallback<typeof definition.inputSchema> = async (args, extra) => {
  const { message } = args as z.infer<z.ZodObject<typeof definition.inputSchema>>;

  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
};

export { definition, handler };
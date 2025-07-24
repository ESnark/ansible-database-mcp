import { ResourceDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { Paths } from '../config/paths.js';

export const definition: ResourceDefinition = {
  name: 'database-context',
  uri: 'context://ansible-database-mcp',
  title: 'Database Context',
  description: 'Contextual information about databases and tables',
  mimeType: 'text/markdown',
  handler: async (uri, extra) => {
    const contextPath = Paths.getContextPath();
    const contextContent = readFileSync(contextPath, 'utf-8');
    
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: definition.mimeType,
          text: contextContent,
        }
      ]
    };
  }
};
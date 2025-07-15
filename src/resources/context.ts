import { ResourceDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const definition: ResourceDefinition = {
  name: 'database-context',
  uri: 'context://ansible-database-mcp',
  title: 'Database Context',
  description: 'Contextual information about databases and tables',
  mimeType: 'text/markdown',
  handler: async (uri, extra) => {
    const contextPath = process.env.NODE_ENV === 'development'
      ? join(__dirname, './context.md')
      : join(__dirname, './assets/context.md');
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
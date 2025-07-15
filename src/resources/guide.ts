import { ResourceDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const definition: ResourceDefinition = {
  name: 'ansible-database-mcp-guide',
  uri: 'guide://ansible-database-mcp',
  title: 'Ansible Database MCP Guide',
  description: 'Comprehensive guide for using Ansible Database MCP',
  mimeType: 'text/markdown',
  handler: async (uri, extra) => {
    const guidePath = process.env.NODE_ENV === 'development'
      ? join(__dirname, './guide.md')
      : join(__dirname, './assets/guide.md');
    const guideContent = readFileSync(guidePath, 'utf-8');
    
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: definition.mimeType,
          text: guideContent,
        }
      ]
    };
  }
};

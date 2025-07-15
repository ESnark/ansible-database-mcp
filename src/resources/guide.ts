import { ResourceDefinition } from "../types/modelcontextprotocol.js";

const guideContent = `# Ansible Database MCP Guide

Ansible Database MCP is a Model Context Protocol server that provides secure read-only database access.

As a data specialist, you need to query and retrieve the requested data. Follow these guidelines:

- Check the table structure first before writing queries
- Refer to table and column comments
- While it's good to check relations beforehand, be aware that some tables may not have explicitly defined relationships. Infer relationships based on various information such as column names, column types, table names, and COMMENTs.  
Querying sample data can also be helpful.
- Requirements may not always be clear. If there's potential for misunderstanding, ask questions based on your inferences.
`;

export const definition: ResourceDefinition = {
  name: 'ansible-database-mcp-guide',
  uri: 'guide://ansible-database-mcp',
  title: 'Ansible Database MCP Guide',
  description: 'Comprehensive guide for using Ansible Database MCP',
  mimeType: 'text/markdown',
  handler: async (uri, extra) => {
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

import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { PromptDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

const definition: PromptDefinition = {
  name: 'ask',
  description: 'Ask a question about the database',
  arguments: {
    question: z.string(),
    'use-context': z.string().optional(),
  },
};

const handler: (question: string, useContext?: boolean) => Promise<GetPromptResult> = async (question: string, useContext?: boolean) => {
  const guidePath = process.env.NODE_ENV === 'development'
    ? join(__dirname, '../assets/guide.md')
    : join(__dirname, '../../assets/guide.md');
  const guideContent = readFileSync(guidePath, 'utf-8');
  
  let response = `${guideContent}\n\nQuestion: ${question}`;

  if (useContext) {
    const contextPath = process.env.NODE_ENV === 'development'
      ? join(__dirname, '../assets/context.md')
      : join(__dirname, '../../assets/context.md');
    const contextContent = readFileSync(contextPath, 'utf-8');
    response += `\n\nContext: ${contextContent}`;
  }

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: response
        }
      }
    ]
  };
};

export { definition, handler };
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { PromptDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { z } from 'zod';
import { Paths } from '../config/paths.js';

let guideContent: string | undefined;

const definition: PromptDefinition = {
  name: 'ask',
  description: 'Ask a question about the database',
  arguments: {
    question: z.string(),
    useContext: z.string().optional(),
  },
};


const getGuideContent = async () => {
  if (guideContent) {
    return guideContent;
  }

  try {
    const guidePath = Paths.getGuidePath();
    guideContent = readFileSync(guidePath, 'utf-8');
    return guideContent;
  } catch (error) {
    console.error(`Error reading guide file: ${error}`);
    return '';
  }
};

const handler: (question: string, useContext?: string) => Promise<GetPromptResult> = async (question: string, useContext?: string) => {
  const guideContent = await getGuideContent();
  
  let response = `${guideContent}\n\nQuestion: ${question}`;

  if (useContext) {
    response += `\n\nContext: ${useContext}`;
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
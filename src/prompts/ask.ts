import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { PromptDefinition } from "../types/modelcontextprotocol.js";
import { readFileSync } from 'fs';
import { z } from 'zod';
import { Paths } from '../config/paths.js';

let guideContent: string | undefined;
let contextContent: string | undefined;

const definition: PromptDefinition = {
  name: 'ask',
  description: 'Ask a question about the database',
  arguments: {
    question: z.string(),
    'use-context': z.string().optional(),
  },
};


const getGuideContent = async () => {
  if (guideContent) {
    return guideContent;
  }

  const guidePath = Paths.getGuidePath();
  guideContent = readFileSync(guidePath, 'utf-8');
  return guideContent;
};


const getContextContent = async () => {

  if (contextContent) {
    return contextContent;
  }

  const contextPath = Paths.getContextPath();
  contextContent = readFileSync(contextPath, 'utf-8');
  return contextContent;
};

const handler: (question: string, useContext?: boolean) => Promise<GetPromptResult> = async (question: string, useContext?: boolean) => {
  const guideContent = await getGuideContent();
  
  let response = `${guideContent}\n\nQuestion: ${question}`;

  if (useContext) {
    const contextContent = await getContextContent();
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
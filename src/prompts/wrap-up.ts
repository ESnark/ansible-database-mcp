import { Paths } from "@/config/paths";
import { PromptDefinition } from "@/types/modelcontextprotocol";
import { GetPromptResult } from "@modelcontextprotocol/sdk/types";


const definition: PromptDefinition = {
  name: 'wrap-up',
  description: 'Wrap up the conversation and generate a schema document'
};

let wrapUpContent: string;

const handler: () => Promise<GetPromptResult> = async () => {
  if (!wrapUpContent) {
    wrapUpContent = Paths.getAssetsTextFile('wrap-up.md');
  }

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: wrapUpContent
        }
      }
    ]
  };
};

export { definition, handler };
import { Paths } from "@/config/paths";
import { PromptDefinition } from "@/types/modelcontextprotocol";
import { GetPromptResult } from "@modelcontextprotocol/sdk/types";

const wrapUpContent = Paths.getAssetsTextFile('wrap-up.md');

const definition: PromptDefinition = {
  name: 'wrap-up',
  description: 'Wrap up the conversation and generate a schema document'
};

const handler: () => Promise<GetPromptResult> = async () => {
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
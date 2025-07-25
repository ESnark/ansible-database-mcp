import type { ReadResourceCallback, PromptCallback} from "@modelcontextprotocol/sdk/server/mcp";
import { ZodOptional, ZodRawShape, ZodType, ZodTypeAny, ZodTypeDef } from "zod";

export interface ToolDefinition {
  name: string;          // Unique identifier for the tool
  description?: string;  // Human-readable description
  inputSchema: ZodRawShape;
  outputSchema?: ZodRawShape;
  annotations?: {        // Optional hints about tool behavior
    title?: string;      // Human-readable title for the tool
    readOnlyHint?: boolean;    // If true, the tool does not modify its environment
    destructiveHint?: boolean; // If true, the tool may perform destructive updates
    idempotentHint?: boolean;  // If true, repeated calls with same args have no additional effect
    openWorldHint?: boolean;   // If true, tool interacts with external entities
  }
}

type PromptArgsRawShape = {
  [k: string]: ZodType<string, ZodTypeDef, string> | ZodOptional<ZodType<string, ZodTypeDef, string>>;
};

export interface ResourceDefinition {
  name: string;          // Unique identifier for the resource
  uri: string;           // Unique resource identifier
  title: string;          // Human-readable name
  description?: string;  // Human-readable description
  mimeType: string;      // MIME type of the resource content
  handler: ReadResourceCallback;
}

export interface PromptDefinition {
  name: string;          // Unique identifier for the prompt
  description?: string;  // Human-readable description
  arguments?: PromptArgsRawShape;
}

export type ResourceCallback = () => Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
    blob?: Uint8Array;
  }>;
}>;
/**
 * @djed/mcp-base
 * Base MCP server class for LUXOR projects
 */

export { McpServer } from './server.js';
export type { McpServerOptions } from './server.js';

export type { ToolHandler, ResourceHandler, PromptHandler } from './handlers.js';
export type { TransportHandler } from './transport.js';

export * from './errors.js';

// Re-export commonly used types from dependencies
export type {
  McpTool,
  McpToolCall,
  McpToolResult,
  McpResource,
  McpResourceContents,
  McpPrompt,
  McpPromptMessage,
  McpServerConfig,
  McpServerCapabilities,
} from '@djed/shared-types/mcp';

export type { Logger } from '@djed/shared-types/logging';
export { LogLevel } from '@djed/shared-types/logging';

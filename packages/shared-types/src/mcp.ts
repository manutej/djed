/**
 * MCP (Model Context Protocol) type definitions
 */

import { JsonValue } from './common.js';

/**
 * MCP Protocol version
 */
export type McpVersion = '2024-11-05' | string;

/**
 * MCP message types
 */
export type McpMessageType = 'request' | 'response' | 'notification' | 'error';

/**
 * Base MCP message
 */
export interface McpMessage {
  jsonrpc: '2.0';
  id?: string | number;
}

/**
 * MCP request message
 */
export interface McpRequest extends McpMessage {
  method: string;
  params?: JsonValue;
}

/**
 * MCP response message
 */
export interface McpResponse extends McpMessage {
  id: string | number;
  result?: JsonValue;
  error?: McpError;
}

/**
 * MCP notification message
 */
export interface McpNotification extends McpMessage {
  method: string;
  params?: JsonValue;
}

/**
 * MCP error object
 */
export interface McpError {
  code: number;
  message: string;
  data?: JsonValue;
}

/**
 * Standard MCP error codes
 */
export enum McpErrorCode {
  // JSON-RPC standard errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP-specific errors
  RESOURCE_NOT_FOUND = -32001,
  RESOURCE_UNAVAILABLE = -32002,
  TOOL_EXECUTION_ERROR = -32003,
  PROMPT_NOT_FOUND = -32004,
}

/**
 * MCP tool definition
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonValue; // JSON Schema
}

/**
 * MCP tool call
 */
export interface McpToolCall {
  name: string;
  arguments: Record<string, JsonValue>;
}

/**
 * MCP tool result
 */
export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP resource definition
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP resource contents
 */
export interface McpResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded
}

/**
 * MCP prompt definition
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP prompt message
 */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

/**
 * MCP server capabilities
 */
export interface McpServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, never>;
  experimental?: Record<string, JsonValue>;
}

/**
 * MCP client capabilities
 */
export interface McpClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, never>;
  experimental?: Record<string, JsonValue>;
}

/**
 * MCP initialization options
 */
export interface McpInitializeParams {
  protocolVersion: McpVersion;
  capabilities: McpClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP initialization result
 */
export interface McpInitializeResult {
  protocolVersion: McpVersion;
  capabilities: McpServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP transport types
 */
export type McpTransport = 'stdio' | 'http' | 'websocket';

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  name: string;
  version: string;
  transport: McpTransport;
  capabilities?: Partial<McpServerCapabilities>;
}

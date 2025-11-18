/**
 * MCP error utilities
 */

import { McpError, McpErrorCode } from '@djed/shared-types/mcp';
import { JsonValue } from '@djed/shared-types/common';

/**
 * Create an MCP error
 */
export function createMcpError(code: McpErrorCode, message: string, data?: JsonValue): McpError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Parse error
 */
export function parseError(message: string, data?: JsonValue): McpError {
  return createMcpError(McpErrorCode.PARSE_ERROR, message, data);
}

/**
 * Invalid request error
 */
export function invalidRequestError(message: string, data?: JsonValue): McpError {
  return createMcpError(McpErrorCode.INVALID_REQUEST, message, data);
}

/**
 * Method not found error
 */
export function methodNotFoundError(method: string): McpError {
  return createMcpError(McpErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`, { method });
}

/**
 * Invalid params error
 */
export function invalidParamsError(message: string, data?: JsonValue): McpError {
  return createMcpError(McpErrorCode.INVALID_PARAMS, message, data);
}

/**
 * Internal error
 */
export function internalError(message: string, data?: JsonValue): McpError {
  return createMcpError(McpErrorCode.INTERNAL_ERROR, message, data);
}

/**
 * Resource not found error
 */
export function resourceNotFoundError(uri: string): McpError {
  return createMcpError(McpErrorCode.RESOURCE_NOT_FOUND, `Resource not found: ${uri}`, { uri });
}

/**
 * Resource unavailable error
 */
export function resourceUnavailableError(uri: string, reason?: string): McpError {
  return createMcpError(
    McpErrorCode.RESOURCE_UNAVAILABLE,
    `Resource unavailable: ${uri}${reason ? ` (${reason})` : ''}`,
    { uri, reason }
  );
}

/**
 * Tool execution error
 */
export function toolExecutionError(tool: string, message: string, data?: JsonValue): McpError {
  return createMcpError(
    McpErrorCode.TOOL_EXECUTION_ERROR,
    `Tool execution failed: ${tool} - ${message}`,
    { tool, ...data }
  );
}

/**
 * Prompt not found error
 */
export function promptNotFoundError(name: string): McpError {
  return createMcpError(McpErrorCode.PROMPT_NOT_FOUND, `Prompt not found: ${name}`, { name });
}

/**
 * Convert Error to MCP error
 */
export function errorToMcpError(error: unknown): McpError {
  if (error instanceof Error) {
    return internalError(error.message, {
      name: error.name,
      stack: error.stack,
    });
  }

  return internalError('Unknown error', { error: String(error) });
}

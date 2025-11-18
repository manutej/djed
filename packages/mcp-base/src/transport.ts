/**
 * MCP transport handling
 */

import { McpTransport, McpRequest, McpResponse } from '@djed/shared-types/mcp';
import { Logger } from '@djed/shared-types/logging';

/**
 * Transport handler interface
 */
export interface TransportHandler {
  /**
   * Send a message
   */
  send(message: McpResponse): Promise<void>;

  /**
   * Close the transport
   */
  close(): Promise<void>;

  /**
   * Check if transport is connected
   */
  isConnected(): boolean;
}

/**
 * Stdio transport handler
 */
export class StdioTransportHandler implements TransportHandler {
  private connected = true;

  constructor(private logger: Logger) {}

  async send(message: McpResponse): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    const json = JSON.stringify(message);
    this.logger.trace('Sending message via stdio', { message: json });
    process.stdout.write(json + '\n');
  }

  async close(): Promise<void> {
    this.connected = false;
    this.logger.info('Stdio transport closed');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Create a transport handler based on type
 */
export function createTransportHandler(
  transport: McpTransport,
  logger: Logger
): TransportHandler {
  switch (transport) {
    case 'stdio':
      return new StdioTransportHandler(logger);
    case 'http':
      throw new Error('HTTP transport not yet implemented');
    case 'websocket':
      throw new Error('WebSocket transport not yet implemented');
    default:
      throw new Error(`Unknown transport: ${transport as string}`);
  }
}

/**
 * Parse incoming MCP request from JSON
 */
export function parseRequest(json: string): McpRequest {
  try {
    const parsed = JSON.parse(json) as McpRequest;

    // Validate basic MCP structure
    if (parsed.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    if (typeof parsed.method !== 'string') {
      throw new Error('Missing method');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse request: ${error instanceof Error ? error.message : String(error)}`);
  }
}

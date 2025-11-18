/**
 * Base MCP server class
 */

import { createInterface } from 'readline';
import {
  McpTransport,
  McpTool,
  McpToolResult,
  McpResource,
  McpResourceContents,
  McpPrompt,
  McpPromptMessage,
  McpServerConfig,
} from '@djed/shared-types/mcp';
import { Logger, LogLevel } from '@djed/shared-types/logging';
import { JsonValue } from '@djed/shared-types/common';
import { createLogger } from '@djed/logger';
import { DjedValidator, createStrictValidator } from '@djed/validator';
import { RequestHandler, ToolHandler, ResourceHandler, PromptHandler } from './handlers.js';
import { createTransportHandler, parseRequest, TransportHandler } from './transport.js';

/**
 * MCP server configuration
 */
export interface McpServerOptions {
  /**
   * Server name
   */
  name: string;

  /**
   * Server version
   */
  version: string;

  /**
   * Transport type (default: stdio)
   */
  transport?: McpTransport;

  /**
   * Logger instance (optional, will create default if not provided)
   */
  logger?: Logger;

  /**
   * Validator instance (optional, will create default if not provided)
   */
  validator?: DjedValidator;

  /**
   * Log level (default: INFO)
   */
  logLevel?: LogLevel;
}

/**
 * Base MCP server class
 */
export abstract class McpServer {
  protected readonly name: string;
  protected readonly version: string;
  protected readonly transport: McpTransport;
  protected readonly logger: Logger;
  protected readonly validator: DjedValidator;
  protected readonly requestHandler: RequestHandler;
  protected transportHandler?: TransportHandler;

  constructor(options: McpServerOptions) {
    this.name = options.name;
    this.version = options.version;
    this.transport = options.transport ?? 'stdio';
    this.logger = options.logger ?? createLogger({
      level: options.logLevel ?? LogLevel.INFO,
      context: this.name,
    });
    this.validator = options.validator ?? createStrictValidator();
    this.requestHandler = new RequestHandler(this.name, this.version, this.logger);
  }

  /**
   * Register a tool
   */
  protected registerTool(definition: McpTool, handler: ToolHandler): void {
    this.requestHandler.registerTool(definition, handler);
  }

  /**
   * Register a resource
   */
  protected registerResource(definition: McpResource, handler: ResourceHandler): void {
    this.requestHandler.registerResource(definition, handler);
  }

  /**
   * Register a prompt
   */
  protected registerPrompt(definition: McpPrompt, handler: PromptHandler): void {
    this.requestHandler.registerPrompt(definition, handler);
  }

  /**
   * Initialize the server (called once before start)
   * Override this to set up tools, resources, and prompts
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Start the server
   */
  async start(): Promise<void> {
    this.logger.info('Starting MCP server', {
      name: this.name,
      version: this.version,
      transport: this.transport,
    });

    try {
      // Initialize server (register tools, resources, prompts)
      await this.initialize();

      // Create transport handler
      this.transportHandler = createTransportHandler(this.transport, this.logger);

      // Start listening based on transport
      if (this.transport === 'stdio') {
        await this.startStdio();
      } else {
        throw new Error(`Transport ${this.transport} not yet implemented`);
      }
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping MCP server');

    if (this.transportHandler) {
      await this.transportHandler.close();
    }
  }

  /**
   * Start stdio transport
   */
  private async startStdio(): Promise<void> {
    this.logger.info('Listening on stdio');

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line: string) => {
      try {
        const request = parseRequest(line);
        const response = await this.requestHandler.handleRequest(request);

        if (this.transportHandler) {
          await this.transportHandler.send(response);
        }
      } catch (error) {
        this.logger.error('Failed to handle request', { error });
      }
    });

    rl.on('close', () => {
      this.logger.info('Stdio closed');
      void this.stop();
    });

    // Handle process signals
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT');
      void this.stop().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM');
      void this.stop().then(() => process.exit(0));
    });
  }

  /**
   * Get server configuration
   */
  getConfig(): McpServerConfig {
    return {
      name: this.name,
      version: this.version,
      transport: this.transport,
      capabilities: this.requestHandler.getCapabilities(),
    };
  }
}

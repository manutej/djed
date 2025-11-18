/**
 * MCP request handlers
 */

import {
  McpRequest,
  McpResponse,
  McpTool,
  McpToolCall,
  McpToolResult,
  McpResource,
  McpResourceContents,
  McpPrompt,
  McpPromptMessage,
  McpInitializeParams,
  McpInitializeResult,
  McpServerCapabilities,
} from '@djed/shared-types/mcp';
import { JsonValue } from '@djed/shared-types/common';
import { Logger } from '@djed/shared-types/logging';
import * as errors from './errors.js';

/**
 * Tool handler function
 */
export type ToolHandler = (args: Record<string, JsonValue>) => Promise<McpToolResult>;

/**
 * Resource handler function
 */
export type ResourceHandler = (uri: string) => Promise<McpResourceContents>;

/**
 * Prompt handler function
 */
export type PromptHandler = (args: Record<string, JsonValue>) => Promise<McpPromptMessage[]>;

/**
 * Request handler for MCP methods
 */
export class RequestHandler {
  private tools = new Map<string, { definition: McpTool; handler: ToolHandler }>();
  private resources = new Map<string, { definition: McpResource; handler: ResourceHandler }>();
  private prompts = new Map<string, { definition: McpPrompt; handler: PromptHandler }>();

  constructor(
    private serverName: string,
    private serverVersion: string,
    private logger: Logger
  ) {}

  /**
   * Register a tool
   */
  registerTool(definition: McpTool, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
    this.logger.debug('Tool registered', { tool: definition.name });
  }

  /**
   * Register a resource
   */
  registerResource(definition: McpResource, handler: ResourceHandler): void {
    this.resources.set(definition.uri, { definition, handler });
    this.logger.debug('Resource registered', { uri: definition.uri });
  }

  /**
   * Register a prompt
   */
  registerPrompt(definition: McpPrompt, handler: PromptHandler): void {
    this.prompts.set(definition.name, { definition, handler });
    this.logger.debug('Prompt registered', { prompt: definition.name });
  }

  /**
   * Handle an MCP request
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    this.logger.info('Handling request', { method: request.method, id: request.id });

    try {
      const result = await this.dispatchRequest(request);

      return {
        jsonrpc: '2.0',
        id: request.id ?? 0,
        result,
      };
    } catch (error) {
      this.logger.error('Request failed', { method: request.method, error });

      return {
        jsonrpc: '2.0',
        id: request.id ?? 0,
        error: errors.errorToMcpError(error),
      };
    }
  }

  /**
   * Dispatch request to appropriate handler
   */
  private async dispatchRequest(request: McpRequest): Promise<JsonValue> {
    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(request.params as McpInitializeParams);

      case 'tools/list':
        return this.handleToolsList();

      case 'tools/call':
        return this.handleToolsCall(request.params as { name: string; arguments: Record<string, JsonValue> });

      case 'resources/list':
        return this.handleResourcesList();

      case 'resources/read':
        return this.handleResourcesRead(request.params as { uri: string });

      case 'prompts/list':
        return this.handlePromptsList();

      case 'prompts/get':
        return this.handlePromptsGet(request.params as { name: string; arguments?: Record<string, JsonValue> });

      default:
        throw errors.methodNotFoundError(request.method);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(params: McpInitializeParams): Promise<McpInitializeResult> {
    this.logger.info('Initializing', {
      client: params.clientInfo.name,
      version: params.protocolVersion,
    });

    const capabilities: McpServerCapabilities = {};

    if (this.tools.size > 0) {
      capabilities.tools = {};
    }

    if (this.resources.size > 0) {
      capabilities.resources = {};
    }

    if (this.prompts.size > 0) {
      capabilities.prompts = {};
    }

    return {
      protocolVersion: params.protocolVersion,
      capabilities,
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(): Promise<{ tools: McpTool[] }> {
    const tools = Array.from(this.tools.values()).map((t) => t.definition);
    return { tools };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(params: {
    name: string;
    arguments: Record<string, JsonValue>;
  }): Promise<McpToolResult> {
    const tool = this.tools.get(params.name);

    if (!tool) {
      throw errors.toolExecutionError(params.name, 'Tool not found');
    }

    this.logger.debug('Executing tool', { tool: params.name, args: params.arguments });

    try {
      return await tool.handler(params.arguments);
    } catch (error) {
      throw errors.toolExecutionError(
        params.name,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Handle resources/list request
   */
  private async handleResourcesList(): Promise<{ resources: McpResource[] }> {
    const resources = Array.from(this.resources.values()).map((r) => r.definition);
    return { resources };
  }

  /**
   * Handle resources/read request
   */
  private async handleResourcesRead(params: { uri: string }): Promise<{ contents: McpResourceContents }> {
    const resource = this.resources.get(params.uri);

    if (!resource) {
      throw errors.resourceNotFoundError(params.uri);
    }

    this.logger.debug('Reading resource', { uri: params.uri });

    try {
      const contents = await resource.handler(params.uri);
      return { contents };
    } catch (error) {
      throw errors.resourceUnavailableError(
        params.uri,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Handle prompts/list request
   */
  private async handlePromptsList(): Promise<{ prompts: McpPrompt[] }> {
    const prompts = Array.from(this.prompts.values()).map((p) => p.definition);
    return { prompts };
  }

  /**
   * Handle prompts/get request
   */
  private async handlePromptsGet(params: {
    name: string;
    arguments?: Record<string, JsonValue>;
  }): Promise<{ messages: McpPromptMessage[] }> {
    const prompt = this.prompts.get(params.name);

    if (!prompt) {
      throw errors.promptNotFoundError(params.name);
    }

    this.logger.debug('Getting prompt', { prompt: params.name, args: params.arguments });

    try {
      const messages = await prompt.handler(params.arguments ?? {});
      return { messages };
    } catch (error) {
      throw errors.internalError(
        `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): McpServerCapabilities {
    const capabilities: McpServerCapabilities = {};

    if (this.tools.size > 0) {
      capabilities.tools = {};
    }

    if (this.resources.size > 0) {
      capabilities.resources = {};
    }

    if (this.prompts.size > 0) {
      capabilities.prompts = {};
    }

    return capabilities;
  }
}

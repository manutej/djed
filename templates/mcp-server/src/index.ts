/**
 * {{PROJECT_NAME}} MCP Server
 * {{PROJECT_DESCRIPTION}}
 */

import { McpServer, McpTool, McpToolResult, LogLevel } from '@djed/mcp-base';
import { objectSchema, nonEmptyStringSchema } from '@djed/validator';

/**
 * Main server class
 */
class {{CLASS_NAME}}Server extends McpServer {
  constructor() {
    super({
      name: '{{PROJECT_NAME}}',
      version: '0.1.0',
      transport: 'stdio',
      logLevel: (process.env.LOG_LEVEL as LogLevel) ?? LogLevel.INFO,
    });
  }

  /**
   * Initialize server - register tools, resources, and prompts
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing {{PROJECT_NAME}} server');

    // Setup validation schemas
    await this.setupSchemas();

    // Register tools
    await this.setupTools();

    // Register resources
    await this.setupResources();

    // Register prompts
    await this.setupPrompts();

    this.logger.info('Server initialized successfully');
  }

  /**
   * Setup validation schemas
   */
  private async setupSchemas(): Promise<void> {
    // Example: compile a schema for tool arguments
    this.validator.compile(
      'exampleArgs',
      objectSchema(
        {
          message: nonEmptyStringSchema,
          count: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
        },
        ['message']
      )
    );
  }

  /**
   * Setup tools
   */
  private async setupTools(): Promise<void> {
    // Example tool: echo
    this.registerTool(
      {
        name: 'echo',
        description: 'Echo back a message multiple times',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', minLength: 1 },
            count: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
          },
          required: ['message'],
        },
      },
      async (args): Promise<McpToolResult> => {
        // Validate arguments
        const result = this.validator.validate('exampleArgs', args);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Validation error: ${result.error.getFormattedMessage()}`,
              },
            ],
            isError: true,
          };
        }

        const { message, count = 1 } = result.data;

        this.logger.info('Echo tool called', { message, count });

        // Generate echoed message
        const echoed = Array.from({ length: count }, () => message).join(' ');

        return {
          content: [
            {
              type: 'text',
              text: echoed,
            },
          ],
        };
      }
    );

    // TODO: Add more tools here
  }

  /**
   * Setup resources
   */
  private async setupResources(): Promise<void> {
    // Example resource: configuration
    this.registerResource(
      {
        uri: 'config://server',
        name: 'Server Configuration',
        description: 'Current server configuration',
        mimeType: 'application/json',
      },
      async (uri) => {
        const config = this.getConfig();

        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(config, null, 2),
        };
      }
    );

    // TODO: Add more resources here
  }

  /**
   * Setup prompts
   */
  private async setupPrompts(): Promise<void> {
    // Example prompt: greeting
    this.registerPrompt(
      {
        name: 'greeting',
        description: 'Generate a greeting message',
        arguments: [
          {
            name: 'name',
            description: 'Name to greet',
            required: true,
          },
        ],
      },
      async (args) => {
        const name = args.name as string;

        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Say hello to ${name} in a friendly way.`,
            },
          },
        ];
      }
    );

    // TODO: Add more prompts here
  }
}

// Start the server
const server = new {{CLASS_NAME}}Server();

server
  .start()
  .then(() => {
    console.log('{{PROJECT_NAME}} MCP server started');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

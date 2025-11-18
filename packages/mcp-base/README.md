# @djed/mcp-base

Base MCP (Model Context Protocol) server class for LUXOR projects.

## Features

- **Base Server Class**: Extend `McpServer` to create your MCP server
- **Built-in Transport**: Stdio transport (HTTP/WebSocket coming soon)
- **Tool Registration**: Easy tool definition and handling
- **Resource Management**: Serve dynamic or static resources
- **Prompt Support**: Define reusable prompts
- **Integrated Logging**: Uses @djed/logger for structured logging
- **Validation**: Uses @djed/validator for argument validation
- **Type-Safe**: Full TypeScript support
- **Error Handling**: Comprehensive MCP error responses

## Installation

```bash
npm install @djed/mcp-base
```

## Quick Start

```typescript
import { McpServer, McpTool, McpToolResult, LogLevel } from '@djed/mcp-base';

class MyServer extends McpServer {
  constructor() {
    super({
      name: 'my-mcp-server',
      version: '1.0.0',
      logLevel: LogLevel.DEBUG,
    });
  }

  protected async initialize(): Promise<void> {
    // Register a tool
    this.registerTool(
      {
        name: 'echo',
        description: 'Echo back the input message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
      },
      async (args): Promise<McpToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${args.message as string}`,
            },
          ],
        };
      }
    );
  }
}

// Start the server
const server = new MyServer();
await server.start();
```

## Creating a Server

### Basic Server

Extend `McpServer` and implement the `initialize()` method:

```typescript
import { McpServer, LogLevel } from '@djed/mcp-base';

class CalculatorServer extends McpServer {
  constructor() {
    super({
      name: 'calculator-server',
      version: '1.0.0',
      transport: 'stdio',
      logLevel: LogLevel.INFO,
    });
  }

  protected async initialize(): Promise<void> {
    // Register tools, resources, and prompts
    await this.setupTools();
    await this.setupResources();
    await this.setupPrompts();
  }

  private async setupTools(): Promise<void> {
    this.registerTool(
      {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
      },
      async (args) => {
        const result = (args.a as number) + (args.b as number);
        return {
          content: [{ type: 'text', text: `Result: ${result}` }],
        };
      }
    );
  }

  private async setupResources(): Promise<void> {
    // Register resources...
  }

  private async setupPrompts(): Promise<void> {
    // Register prompts...
  }
}

// Start
const server = new CalculatorServer();
await server.start();
```

### With Custom Logger and Validator

```typescript
import { McpServer, LogLevel } from '@djed/mcp-base';
import { createLogger } from '@djed/logger';
import { createLenientValidator } from '@djed/validator';

class MyServer extends McpServer {
  constructor() {
    const logger = createLogger({
      level: LogLevel.DEBUG,
      context: 'MyServer',
      format: 'json',
    });

    const validator = createLenientValidator();

    super({
      name: 'my-server',
      version: '1.0.0',
      logger,
      validator,
    });
  }

  protected async initialize(): Promise<void> {
    // Setup...
  }
}
```

## Registering Tools

Tools are functions that the MCP client can call:

```typescript
protected async initialize(): Promise<void> {
  this.registerTool(
    // Tool definition
    {
      name: 'search',
      description: 'Search for documents',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        },
        required: ['query'],
      },
    },
    // Tool handler
    async (args) => {
      const query = args.query as string;
      const limit = (args.limit as number) ?? 10;

      // Perform search
      const results = await this.searchDocuments(query, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );
}
```

### Tool Result Types

Tools can return different content types:

```typescript
// Text content
return {
  content: [
    {
      type: 'text',
      text: 'Hello, world!',
    },
  ],
};

// Image content (base64)
return {
  content: [
    {
      type: 'image',
      data: base64ImageData,
      mimeType: 'image/png',
    },
  ],
};

// Multiple content items
return {
  content: [
    { type: 'text', text: 'Here is the chart:' },
    { type: 'image', data: chartImage, mimeType: 'image/png' },
  ],
};

// Error result
return {
  content: [
    {
      type: 'text',
      text: 'Error: Operation failed',
    },
  ],
  isError: true,
};
```

## Registering Resources

Resources provide access to data:

```typescript
protected async initialize(): Promise<void> {
  this.registerResource(
    // Resource definition
    {
      uri: 'file:///config.json',
      name: 'Configuration',
      description: 'Server configuration file',
      mimeType: 'application/json',
    },
    // Resource handler
    async (uri) => {
      const config = await this.loadConfig();

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(config, null, 2),
      };
    }
  );

  // Dynamic resource (pattern-based)
  this.registerResource(
    {
      uri: 'file:///logs/{date}.log',
      name: 'Logs',
      description: 'Server logs for a specific date',
      mimeType: 'text/plain',
    },
    async (uri) => {
      // Extract date from URI
      const date = uri.match(/logs\/(.+)\.log/)?.[1];
      const logs = await this.loadLogs(date);

      return {
        uri,
        mimeType: 'text/plain',
        text: logs,
      };
    }
  );
}
```

## Registering Prompts

Prompts are reusable message templates:

```typescript
protected async initialize(): Promise<void> {
  this.registerPrompt(
    // Prompt definition
    {
      name: 'analyze-code',
      description: 'Analyze code for best practices',
      arguments: [
        {
          name: 'language',
          description: 'Programming language',
          required: true,
        },
        {
          name: 'code',
          description: 'Code to analyze',
          required: true,
        },
      ],
    },
    // Prompt handler
    async (args) => {
      const language = args.language as string;
      const code = args.code as string;

      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this ${language} code for best practices:\n\n${code}`,
          },
        },
      ];
    }
  );
}
```

## Error Handling

Use built-in error utilities:

```typescript
import {
  toolExecutionError,
  invalidParamsError,
  resourceNotFoundError,
} from '@djed/mcp-base';

// In tool handler
this.registerTool(definition, async (args) => {
  try {
    // Validate arguments
    if (!args.userId) {
      throw invalidParamsError('userId is required');
    }

    // Execute tool
    const result = await this.getUser(args.userId as string);

    if (!result) {
      throw resourceNotFoundError(`user://${args.userId as string}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (error) {
    // Error is automatically converted to MCP error response
    throw error;
  }
});
```

## Validation

Use the built-in validator:

```typescript
protected async initialize(): Promise<void> {
  // Compile a schema
  this.validator.compile(
    'userArgs',
    {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
        includeProfile: { type: 'boolean' },
      },
      required: ['userId'],
    }
  );

  this.registerTool(definition, async (args) => {
    // Validate arguments
    const result = this.validator.validate('userArgs', args);

    if (!result.success) {
      throw invalidParamsError(result.error.getFormattedMessage());
    }

    // Use validated data (type-safe)
    const { userId, includeProfile } = result.data;
    // ...
  });
}
```

## Logging

The server has a built-in logger:

```typescript
protected async initialize(): Promise<void> {
  this.logger.info('Initializing server');

  this.registerTool(definition, async (args) => {
    this.logger.debug('Tool called', { tool: 'myTool', args });

    try {
      const result = await this.performOperation(args);
      this.logger.info('Operation successful', { result });
      return result;
    } catch (error) {
      this.logger.error('Operation failed', { error });
      throw error;
    }
  });
}
```

## Server Lifecycle

```typescript
const server = new MyServer();

// Start server
await server.start();

// Server is now listening...

// Stop server (called automatically on SIGINT/SIGTERM)
await server.stop();
```

## Configuration

```typescript
interface McpServerOptions {
  name: string;                // Server name
  version: string;             // Server version
  transport?: McpTransport;    // Transport type (default: 'stdio')
  logger?: Logger;             // Custom logger
  validator?: DjedValidator;   // Custom validator
  logLevel?: LogLevel;         // Log level (default: INFO)
}
```

## Transport Types

Currently supported:

- **stdio**: Standard input/output (default)

Coming soon:

- **http**: HTTP transport
- **websocket**: WebSocket transport

## Best Practices

1. **Initialize Once**: Set up all tools/resources/prompts in `initialize()`
2. **Validate Arguments**: Always validate tool arguments
3. **Log Operations**: Use the logger for debugging and monitoring
4. **Error Handling**: Use MCP error utilities for consistent errors
5. **Type Safety**: Leverage TypeScript for type-safe handlers
6. **Async Operations**: All handlers are async - use async/await

## Complete Example

```typescript
import { McpServer, McpTool, McpToolResult, LogLevel } from '@djed/mcp-base';
import { emailSchema } from '@djed/validator';

class EmailServer extends McpServer {
  constructor() {
    super({
      name: 'email-server',
      version: '1.0.0',
      logLevel: LogLevel.DEBUG,
    });
  }

  protected async initialize(): Promise<void> {
    // Compile validation schemas
    this.validator.compile('sendEmailArgs', {
      type: 'object',
      properties: {
        to: emailSchema,
        subject: { type: 'string', minLength: 1 },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    });

    // Register send email tool
    this.registerTool(
      {
        name: 'send_email',
        description: 'Send an email',
        inputSchema: this.validator.getAjv().getSchema('sendEmailArgs')?.schema ?? {},
      },
      async (args): Promise<McpToolResult> => {
        // Validate
        const result = this.validator.validate('sendEmailArgs', args);
        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error.getFormattedMessage() }],
            isError: true,
          };
        }

        const { to, subject, body } = result.data;

        // Send email
        this.logger.info('Sending email', { to, subject });
        await this.sendEmail(to, subject, body);

        return {
          content: [{ type: 'text', text: `Email sent to ${to}` }],
        };
      }
    );
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation...
  }
}

// Start
const server = new EmailServer();
await server.start();
```

## Replacing This Package

**Zero lock-in promise**: You can eject from `@djed/mcp-base` anytime.

### Quick Ejection (Automated)

```bash
djed eject mcp-base
```

The CLI will:
- Uninstall @djed/mcp-base
- Install @modelcontextprotocol/sdk
- Generate EJECT-MCP-BASE.md migration guide
- Provide step-by-step instructions

**Time**: ~3 minutes (automated)

### Manual Ejection

**1. Install MCP SDK:**
```bash
npm uninstall @djed/mcp-base
npm install @modelcontextprotocol/sdk
```

**2. Replace imports:**
```typescript
// Before
import { MCPServer } from '@djed/mcp-base';

// After
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
```

**3. Replace server initialization:**
```typescript
// Before
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0'
});

// After
const server = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);
const transport = new StdioServerTransport();
await server.connect(transport);
```

**4. Replace tool registration:**
```typescript
// Before
server.addTool({
  name: 'echo',
  description: 'Echo a message',
  inputSchema: { type: 'object', properties: {...} },
  handler: async (input) => ({ result: input.message })
});

// After
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: 'echo', description: 'Echo a message', inputSchema: {...} }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'echo') {
    return { content: [{ type: 'text', text: request.params.arguments.message }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});
```

**Time**: ~25 minutes (manual)

### Alternative Libraries

| Library | Use Case | Compatibility |
|---------|----------|---------------|
| **@modelcontextprotocol/sdk** | Official MCP SDK | ⭐⭐⭐ |

### Migration Checklist

- [ ] Install @modelcontextprotocol/sdk
- [ ] Update all imports
- [ ] Replace server initialization
- [ ] Migrate tool registration to request handlers
- [ ] Update list_tools handler
- [ ] Update call_tool handler with routing
- [ ] Update error handling
- [ ] Test MCP protocol communication
- [ ] Verify all tools work correctly

**Comprehensive Guide**: See [docs/EJECTION-GUIDE.md](../../docs/EJECTION-GUIDE.md) for detailed instructions

## License

MIT

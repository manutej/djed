# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Overview

This MCP server is built using the Djed infrastructure, providing a solid foundation for building Model Context Protocol servers.

## Features

- ✅ MCP protocol support (stdio transport)
- ✅ Structured logging with Winston
- ✅ JSON schema validation with Ajv
- ✅ TypeScript with strict type checking
- ✅ Example tools, resources, and prompts

## Installation

```bash
npm install
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
npm run lint:fix
```

## Running

```bash
# Build first
npm run build

# Start the server
npm start
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
LOG_LEVEL=info
LOGS_DIR=./logs
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Adding Tools

To add a new tool:

1. Define the tool schema
2. Register the tool in `setupTools()`
3. Implement the tool handler

```typescript
this.registerTool(
  {
    name: 'my-tool',
    description: 'Description of my tool',
    inputSchema: {
      type: 'object',
      properties: {
        arg1: { type: 'string' },
        arg2: { type: 'number' },
      },
      required: ['arg1'],
    },
  },
  async (args) => {
    // Validate
    const result = this.validator.validate('myToolArgs', args);
    if (!result.success) {
      return {
        content: [{ type: 'text', text: result.error.getFormattedMessage() }],
        isError: true,
      };
    }

    // Execute
    const output = await this.doSomething(result.data);

    return {
      content: [{ type: 'text', text: output }],
    };
  }
);
```

## Adding Resources

To add a new resource:

```typescript
this.registerResource(
  {
    uri: 'myscheme://resource',
    name: 'My Resource',
    description: 'Description of my resource',
    mimeType: 'application/json',
  },
  async (uri) => {
    const data = await this.fetchData(uri);

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data),
    };
  }
);
```

## Adding Prompts

To add a new prompt:

```typescript
this.registerPrompt(
  {
    name: 'my-prompt',
    description: 'Description of my prompt',
    arguments: [
      {
        name: 'arg1',
        description: 'First argument',
        required: true,
      },
    ],
  },
  async (args) => {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Prompt text with ${args.arg1 as string}`,
        },
      },
    ];
  }
);
```

## Testing

Test your server using Claude Code or the MCP inspector:

```bash
# Using Claude Code
# Add to your MCP settings:
{
  "mcpServers": {
    "{{PROJECT_NAME}}": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
```

## Documentation

- [Djed Documentation](../../docs/GETTING-STARTED.md)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [@djed/mcp-base](../../packages/mcp-base/README.md)

## License

MIT

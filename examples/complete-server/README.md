# Complete Djed Example

A comprehensive example demonstrating all Djed components working together in a real MCP server.

## What This Example Demonstrates

✅ **All 4 Djed Packages**:
- `@djed/mcp-base` - Base MCP server class
- `@djed/logger` - Structured logging
- `@djed/validator` - JSON schema validation
- `@djed/shared-types` - Common TypeScript types

✅ **MCP Features**:
- 4 Tools with validation
- 2 Resources (dynamic and static)
- 2 Prompts with parameters

✅ **Best Practices**:
- Strict TypeScript typing
- Comprehensive error handling
- Structured logging with context
- Input validation for all tools
- Clean separation of concerns

## Features

### Tools

1. **create_task** - Create a new task with title and description
2. **list_tasks** - List tasks, optionally filtered by status
3. **update_task** - Update a task's status
4. **calculate** - Perform arithmetic operations (add, subtract, multiply, divide)

### Resources

1. **status://server** - Server status and statistics
2. **task://{id}** - Detailed information about a specific task

### Prompts

1. **task_summary** - Generate AI summary of tasks by status
2. **prioritize_tasks** - AI-powered task prioritization

## Installation

```bash
cd examples/complete-server
npm install
```

## Building

```bash
npm run build
```

## Running

```bash
npm start
```

Or in development mode with watch:

```bash
npm run dev
```

## Testing with Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "complete-example": {
      "command": "node",
      "args": ["/path/to/djed/examples/complete-server/dist/index.js"]
    }
  }
}
```

Then restart Claude Code and try:

```
Use the complete-example MCP server to:
1. Create a task titled "Review PR #123"
2. List all pending tasks
3. Update task-1 to in-progress
4. Calculate 10 + 20 + 30
5. Show me the server status resource
```

## Code Walkthrough

### 1. Server Initialization

```typescript
class CompleteExampleServer extends McpServer {
  constructor() {
    super({
      name: 'complete-example-server',
      version: '1.0.0',
      logLevel: LogLevel.DEBUG,
    });
  }
}
```

### 2. Validation Schemas

```typescript
this.validator.compile(
  'createTaskArgs',
  objectSchema(
    {
      title: nonEmptyStringSchema,
      description: { type: 'string' },
    },
    ['title']
  )
);
```

### 3. Tool Registration

```typescript
this.registerTool(
  {
    name: 'create_task',
    description: 'Create a new task',
    inputSchema: { /* JSON Schema */ },
  },
  async (args): Promise<McpToolResult> => {
    // Validate arguments
    const result = this.validator.validate('createTaskArgs', args);

    if (!result.success) {
      return {
        content: [{ type: 'text', text: result.error.getFormattedMessage() }],
        isError: true,
      };
    }

    // Use validated data (type-safe!)
    const { title, description } = result.data;

    // Execute business logic
    // ...

    // Log the operation
    this.logger.info('Task created', { taskId: id, title });

    // Return result
    return {
      content: [{ type: 'text', text: 'Task created!' }],
    };
  }
);
```

### 4. Resource Serving

```typescript
this.registerResource(
  {
    uri: 'status://server',
    name: 'Server Status',
    mimeType: 'application/json',
  },
  async (uri): Promise<McpResourceContents> => {
    const status = {
      name: this.name,
      uptime: process.uptime(),
      // ...
    };

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(status, null, 2),
    };
  }
);
```

### 5. Prompt Templates

```typescript
this.registerPrompt(
  {
    name: 'task_summary',
    description: 'Generate a summary of tasks',
  },
  async (args): Promise<McpPromptMessage[]> => {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Summarize these tasks:\n\n${taskList}`,
        },
      },
    ];
  }
);
```

## Architecture

```
CompleteExampleServer
├── Validation Layer (@djed/validator)
│   ├── Task schemas
│   └── Calculator schemas
├── Business Logic
│   ├── Task management
│   └── Calculations
├── MCP Protocol (@djed/mcp-base)
│   ├── Tool handlers
│   ├── Resource handlers
│   └── Prompt handlers
└── Logging Layer (@djed/logger)
    ├── Info: operations
    ├── Debug: details
    └── Warn: validation failures
```

## Logging

The server logs at different levels:

- **INFO**: Important operations (task created, updated)
- **DEBUG**: Detailed information (calculations, task listings)
- **WARN**: Validation failures
- **ERROR**: Exceptions and errors

View logs:

```bash
# Development (pretty-printed)
NODE_ENV=development npm start

# Production (JSON)
NODE_ENV=production npm start
```

## Extending This Example

### Add a New Tool

1. Define validation schema in `setupSchemas()`
2. Register tool in `setupTools()`
3. Implement handler with validation

### Add a New Resource

1. Register resource in `setupResources()`
2. Implement handler returning `McpResourceContents`

### Add Persistence

Replace `taskStore` Map with database:

```typescript
import { Pool } from 'pg';

private pool = new Pool(/* config */);

// In tool handler
const result = await this.pool.query(
  'INSERT INTO tasks (title, status) VALUES ($1, $2) RETURNING *',
  [title, 'pending']
);
```

## Learning Points

1. **Type Safety**: TypeScript catches errors at compile-time
2. **Validation**: Ajv validates all inputs before processing
3. **Logging**: Winston provides structured logs for debugging
4. **MCP Protocol**: Clean abstraction over MCP wire protocol
5. **Error Handling**: Comprehensive error responses with details
6. **Separation of Concerns**: Clear layers (validation, logic, protocol)

## Next Steps

- Add database persistence
- Implement authentication
- Add rate limiting
- Create tests
- Deploy with Docker
- Set up CI/CD with GitHub Actions

## License

MIT

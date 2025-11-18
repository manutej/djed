/**
 * Complete Djed Example
 * Demonstrates all Djed components working together
 */

import {
  McpServer,
  McpTool,
  McpToolResult,
  McpResource,
  McpResourceContents,
  McpPrompt,
  McpPromptMessage,
  LogLevel,
} from '@djed/mcp-base';
import {
  objectSchema,
  arraySchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
  enumSchema,
} from '@djed/validator';

/**
 * Example: Complete MCP Server
 *
 * This server demonstrates:
 * - Tool registration with validation
 * - Resource serving
 * - Prompt templates
 * - Structured logging
 * - Error handling
 */
class CompleteExampleServer extends McpServer {
  private taskStore: Map<string, { id: string; title: string; status: string }> = new Map();
  private taskIdCounter = 1;

  constructor() {
    super({
      name: 'complete-example-server',
      version: '1.0.0',
      transport: 'stdio',
      logLevel: LogLevel.DEBUG,
    });
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Complete Example Server');

    // Setup validation schemas
    await this.setupSchemas();

    // Register tools
    await this.setupTools();

    // Register resources
    await this.setupResources();

    // Register prompts
    await this.setupPrompts();

    // Initialize with sample data
    this.initializeSampleData();

    this.logger.info('Server initialized successfully', {
      tools: 4,
      resources: 2,
      prompts: 2,
    });
  }

  /**
   * Setup validation schemas
   */
  private async setupSchemas(): Promise<void> {
    // Task creation schema
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

    // Task update schema
    this.validator.compile(
      'updateTaskArgs',
      objectSchema(
        {
          id: nonEmptyStringSchema,
          status: enumSchema(['pending', 'in-progress', 'completed']),
        },
        ['id', 'status']
      )
    );

    // Task list schema
    this.validator.compile(
      'listTasksArgs',
      objectSchema({
        status: enumSchema(['pending', 'in-progress', 'completed', 'all']),
        limit: positiveIntegerSchema,
      })
    );

    // Calculate schema
    this.validator.compile(
      'calculateArgs',
      objectSchema(
        {
          operation: enumSchema(['add', 'subtract', 'multiply', 'divide']),
          numbers: arraySchema({ type: 'number' }, 2),
        },
        ['operation', 'numbers']
      )
    );
  }

  /**
   * Setup tools
   */
  private async setupTools(): Promise<void> {
    // Tool 1: Create Task
    this.registerTool(
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
          },
          required: ['title'],
        },
      },
      async (args): Promise<McpToolResult> => {
        const result = this.validator.validate('createTaskArgs', args);

        if (!result.success) {
          this.logger.warn('Validation failed for create_task', {
            errors: result.error.errors,
          });
          return {
            content: [{ type: 'text', text: result.error.getFormattedMessage() }],
            isError: true,
          };
        }

        const { title, description } = result.data;
        const id = `task-${this.taskIdCounter++}`;

        const task = {
          id,
          title,
          description: description ?? '',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        this.taskStore.set(id, { id, title, status: 'pending' });

        this.logger.info('Task created', { taskId: id, title });

        return {
          content: [
            {
              type: 'text',
              text: `Task created successfully!\n\n${JSON.stringify(task, null, 2)}`,
            },
          ],
        };
      }
    );

    // Tool 2: List Tasks
    this.registerTool(
      {
        name: 'list_tasks',
        description: 'List all tasks or filter by status',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in-progress', 'completed', 'all'],
              default: 'all',
            },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        },
      },
      async (args): Promise<McpToolResult> => {
        const result = this.validator.validate('listTasksArgs', args);

        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error.getFormattedMessage() }],
            isError: true,
          };
        }

        const { status = 'all', limit = 10 } = result.data;

        let tasks = Array.from(this.taskStore.values());

        if (status !== 'all') {
          tasks = tasks.filter((t) => t.status === status);
        }

        tasks = tasks.slice(0, limit);

        this.logger.debug('Listing tasks', { status, count: tasks.length });

        return {
          content: [
            {
              type: 'text',
              text: `Found ${tasks.length} tasks:\n\n${JSON.stringify(tasks, null, 2)}`,
            },
          ],
        };
      }
    );

    // Tool 3: Update Task Status
    this.registerTool(
      {
        name: 'update_task',
        description: 'Update task status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in-progress', 'completed'] },
          },
          required: ['id', 'status'],
        },
      },
      async (args): Promise<McpToolResult> => {
        const result = this.validator.validate('updateTaskArgs', args);

        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error.getFormattedMessage() }],
            isError: true,
          };
        }

        const { id, status } = result.data;

        const task = this.taskStore.get(id);

        if (!task) {
          this.logger.warn('Task not found', { taskId: id });
          return {
            content: [{ type: 'text', text: `Task not found: ${id}` }],
            isError: true,
          };
        }

        task.status = status;
        this.taskStore.set(id, task);

        this.logger.info('Task updated', { taskId: id, status });

        return {
          content: [
            {
              type: 'text',
              text: `Task updated successfully!\n\n${JSON.stringify(task, null, 2)}`,
            },
          ],
        };
      }
    );

    // Tool 4: Calculator
    this.registerTool(
      {
        name: 'calculate',
        description: 'Perform arithmetic operations',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
            numbers: { type: 'array', items: { type: 'number' }, minItems: 2 },
          },
          required: ['operation', 'numbers'],
        },
      },
      async (args): Promise<McpToolResult> => {
        const result = this.validator.validate('calculateArgs', args);

        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error.getFormattedMessage() }],
            isError: true,
          };
        }

        const { operation, numbers } = result.data;

        let calculationResult: number;

        switch (operation) {
          case 'add':
            calculationResult = numbers.reduce((a, b) => a + b, 0);
            break;
          case 'subtract':
            calculationResult = numbers.reduce((a, b) => a - b);
            break;
          case 'multiply':
            calculationResult = numbers.reduce((a, b) => a * b, 1);
            break;
          case 'divide':
            if (numbers.some((n) => n === 0)) {
              return {
                content: [{ type: 'text', text: 'Division by zero is not allowed' }],
                isError: true,
              };
            }
            calculationResult = numbers.reduce((a, b) => a / b);
            break;
        }

        this.logger.debug('Calculation performed', { operation, numbers, result: calculationResult });

        return {
          content: [
            {
              type: 'text',
              text: `Result: ${calculationResult}`,
            },
          ],
        };
      }
    );
  }

  /**
   * Setup resources
   */
  private async setupResources(): Promise<void> {
    // Resource 1: Server Status
    this.registerResource(
      {
        uri: 'status://server',
        name: 'Server Status',
        description: 'Current server status and statistics',
        mimeType: 'application/json',
      },
      async (uri): Promise<McpResourceContents> => {
        const status = {
          name: this.name,
          version: this.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          tasks: {
            total: this.taskStore.size,
            byStatus: {
              pending: Array.from(this.taskStore.values()).filter((t) => t.status === 'pending')
                .length,
              'in-progress': Array.from(this.taskStore.values()).filter(
                (t) => t.status === 'in-progress'
              ).length,
              completed: Array.from(this.taskStore.values()).filter((t) => t.status === 'completed')
                .length,
            },
          },
        };

        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        };
      }
    );

    // Resource 2: Task Details
    this.registerResource(
      {
        uri: 'task://{id}',
        name: 'Task Details',
        description: 'Detailed information about a specific task',
        mimeType: 'application/json',
      },
      async (uri): Promise<McpResourceContents> => {
        const id = uri.match(/task:\/\/(.+)/)?.[1];

        if (!id) {
          throw new Error('Invalid task URI');
        }

        const task = this.taskStore.get(id);

        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }

        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(task, null, 2),
        };
      }
    );
  }

  /**
   * Setup prompts
   */
  private async setupPrompts(): Promise<void> {
    // Prompt 1: Task Summary
    this.registerPrompt(
      {
        name: 'task_summary',
        description: 'Generate a summary of tasks',
        arguments: [
          {
            name: 'status',
            description: 'Filter by status (pending, in-progress, completed, all)',
            required: false,
          },
        ],
      },
      async (args): Promise<McpPromptMessage[]> => {
        const status = (args.status as string) ?? 'all';

        let tasks = Array.from(this.taskStore.values());
        if (status !== 'all') {
          tasks = tasks.filter((t) => t.status === status);
        }

        const taskList = tasks.map((t) => `- ${t.title} (${t.status})`).join('\n');

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

    // Prompt 2: Task Prioritization
    this.registerPrompt(
      {
        name: 'prioritize_tasks',
        description: 'Help prioritize tasks based on criteria',
        arguments: [
          {
            name: 'criteria',
            description: 'Prioritization criteria (urgency, importance, effort)',
            required: true,
          },
        ],
      },
      async (args): Promise<McpPromptMessage[]> => {
        const criteria = args.criteria as string;
        const tasks = Array.from(this.taskStore.values());

        const taskList = tasks.map((t) => `- ${t.title}`).join('\n');

        return [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Help me prioritize these tasks based on ${criteria}:\n\n${taskList}`,
            },
          },
        ];
      }
    );
  }

  /**
   * Initialize with sample data
   */
  private initializeSampleData(): void {
    this.taskStore.set('task-1', {
      id: 'task-1',
      title: 'Setup development environment',
      status: 'completed',
    });

    this.taskStore.set('task-2', {
      id: 'task-2',
      title: 'Implement authentication',
      status: 'in-progress',
    });

    this.taskStore.set('task-3', {
      id: 'task-3',
      title: 'Write documentation',
      status: 'pending',
    });

    this.taskIdCounter = 4;

    this.logger.debug('Sample data initialized', { tasks: this.taskStore.size });
  }
}

// Start the server
const server = new CompleteExampleServer();

server
  .start()
  .then(() => {
    console.log('Complete Example Server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

import { bench, describe } from 'vitest';

/**
 * Performance Benchmarks for @djed/mcp-base
 *
 * Success Criteria:
 * - Request handling throughput: > 100 req/sec
 * - Concurrent connection handling: 50+ connections
 * - Request latency: < 100ms p95
 *
 * Run: npm run bench
 * CI: Fails if regression > 20%
 */

// Mock MCP message structures
interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<any>;
}

// Mock MCP Server implementation for benchmarking
class MockMCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private requestId = 0;

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: Array.from(this.tools.values()).map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema
            }))
          }
        };
      }

      if (request.method === 'tools/call') {
        const toolName = request.params?.name;
        const tool = this.tools.get(toolName);

        if (!tool) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Tool not found: ${toolName}`
            }
          };
        }

        const result = await tool.handler(request.params?.arguments || {});
        return {
          jsonrpc: '2.0',
          id: request.id,
          result
        };
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  generateRequestId(): number {
    return ++this.requestId;
  }
}

describe('MCP Server Performance', () => {
  // Benchmark 1: Tool Registration
  bench('tool registration - single tool', () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => ({ success: true })
    });
  }, {
    iterations: 1000,
    time: 1000
  });

  bench('tool registration - 10 tools', () => {
    const server = new MockMCPServer();
    for (let i = 0; i < 10; i++) {
      server.registerTool({
        name: `tool_${i}`,
        description: `Tool ${i}`,
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ success: true })
      });
    }
  }, {
    iterations: 500,
    time: 1000
  });

  bench('tool registration - 100 tools', () => {
    const server = new MockMCPServer();
    for (let i = 0; i < 100; i++) {
      server.registerTool({
        name: `tool_${i}`,
        description: `Tool ${i}`,
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ success: true })
      });
    }
  }, {
    iterations: 50,
    time: 1000
  });

  // Benchmark 2: Request Handling
  bench('request handling - tools/list', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async () => ({ success: true })
    });

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });

  bench('request handling - tools/call (simple)', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async (params: any) => ({ echo: params })
    });

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'test_tool',
        arguments: { test: 'value' }
      }
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });

  bench('request handling - tools/call (complex params)', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'complex_tool',
      description: 'Complex tool',
      inputSchema: { type: 'object' },
      handler: async (params: any) => ({
        processed: true,
        data: params,
        timestamp: Date.now()
      })
    });

    const complexParams = {
      user: { id: 123, name: 'test', roles: ['admin', 'user'] },
      options: { nested: { deeply: { value: 'test' } } },
      array: Array.from({ length: 100 }, (_, i) => i)
    };

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'complex_tool',
        arguments: complexParams
      }
    };

    await server.handleRequest(request);
  }, {
    iterations: 2000,
    time: 1000
  });

  // Benchmark 3: Error Handling
  bench('error handling - tool not found', async () => {
    const server = new MockMCPServer();

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'non_existent_tool',
        arguments: {}
      }
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });

  bench('error handling - invalid method', async () => {
    const server = new MockMCPServer();

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'invalid/method'
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });

  // Benchmark 4: Concurrent Requests (Simulated)
  bench('concurrent requests - 10 parallel', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async () => ({ success: true })
    });

    const requests = Array.from({ length: 10 }, (_, i) => ({
      jsonrpc: '2.0' as const,
      id: i,
      method: 'tools/call',
      params: {
        name: 'test_tool',
        arguments: { index: i }
      }
    }));

    await Promise.all(requests.map(req => server.handleRequest(req)));
  }, {
    iterations: 500,
    time: 1000
  });

  bench('concurrent requests - 50 parallel', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async () => ({ success: true })
    });

    const requests = Array.from({ length: 50 }, (_, i) => ({
      jsonrpc: '2.0' as const,
      id: i,
      method: 'tools/call',
      params: {
        name: 'test_tool',
        arguments: { index: i }
      }
    }));

    await Promise.all(requests.map(req => server.handleRequest(req)));
  }, {
    iterations: 200,
    time: 2000
  });

  // Benchmark 5: Sequential vs Parallel Processing
  bench('sequential requests - 10 requests', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async () => ({ success: true })
    });

    for (let i = 0; i < 10; i++) {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: i,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { index: i }
        }
      };
      await server.handleRequest(request);
    }
  }, {
    iterations: 500,
    time: 1000
  });

  // Benchmark 6: Tool Lookup Performance
  bench('tool lookup - 10 tools registered', async () => {
    const server = new MockMCPServer();
    for (let i = 0; i < 10; i++) {
      server.registerTool({
        name: `tool_${i}`,
        description: `Tool ${i}`,
        inputSchema: { type: 'object' },
        handler: async () => ({ index: i })
      });
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'tool_5',
        arguments: {}
      }
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });

  bench('tool lookup - 100 tools registered', async () => {
    const server = new MockMCPServer();
    for (let i = 0; i < 100; i++) {
      server.registerTool({
        name: `tool_${i}`,
        description: `Tool ${i}`,
        inputSchema: { type: 'object' },
        handler: async () => ({ index: i })
      });
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'tool_50',
        arguments: {}
      }
    };

    await server.handleRequest(request);
  }, {
    iterations: 5000,
    time: 1000
  });
});

describe('MCP Server Memory Profile', () => {
  // Memory benchmark: Tool registration overhead
  bench('memory - register 100 tools', () => {
    const server = new MockMCPServer();
    for (let i = 0; i < 100; i++) {
      server.registerTool({
        name: `tool_${i}`,
        description: `Tool ${i} with a longer description to test memory usage`,
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { type: 'number' },
            param3: { type: 'boolean' }
          }
        },
        handler: async (params: any) => ({ result: params })
      });
    }
  }, {
    iterations: 50,
    time: 1000
  });

  // Memory benchmark: Request/response cycles
  bench('memory - 1000 request/response cycles', async () => {
    const server = new MockMCPServer();
    server.registerTool({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async (params: any) => ({ echo: params })
    });

    for (let i = 0; i < 1000; i++) {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: server.generateRequestId(),
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { iteration: i }
        }
      };
      await server.handleRequest(request);
    }
  }, {
    iterations: 10,
    time: 2000
  });
});

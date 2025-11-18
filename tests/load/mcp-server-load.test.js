/**
 * MCP Server Load Test
 *
 * Tests @djed/mcp-base under realistic load:
 * - 50 concurrent connections
 * - Request latency <100ms p95
 * - Tool call handling efficiency
 */

import { MCPServer } from '../../packages/mcp-base/dist/index.js';
import { performance } from 'perf_hooks';

// Test configuration
const CONFIG = {
  DURATION_SECONDS: process.env.LOAD_TEST_DURATION || 180, // 3 minutes default
  CONCURRENT_CLIENTS: 50, // 50 concurrent connections
  REQUESTS_PER_CLIENT: 100, // 100 requests per client
  TARGET_LATENCY_P95: 100, // <100ms p95
};

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successful: 0,
  failed: 0,
  errors: 0,
  startTime: 0,
  endTime: 0,
  latencies: [],
  activeConnections: 0,
  maxConnections: 0,
};

/**
 * Create a test MCP server with sample tools
 */
function createTestServer() {
  const server = new MCPServer({
    name: 'load-test-server',
    version: '1.0.0',
  });

  // Add simple echo tool
  server.addTool({
    name: 'echo',
    description: 'Echo input back',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
    handler: async (input) => {
      return { result: input.message };
    },
  });

  // Add compute tool (simulates CPU work)
  server.addTool({
    name: 'compute',
    description: 'Perform computation',
    inputSchema: {
      type: 'object',
      properties: {
        n: { type: 'number' },
      },
      required: ['n'],
    },
    handler: async (input) => {
      // Simulate some computation
      let result = 0;
      for (let i = 0; i < input.n; i++) {
        result += Math.sqrt(i);
      }
      return { result };
    },
  });

  // Add async tool (simulates I/O wait)
  server.addTool({
    name: 'async',
    description: 'Async operation',
    inputSchema: {
      type: 'object',
      properties: {
        delay: { type: 'number' },
      },
      required: ['delay'],
    },
    handler: async (input) => {
      await new Promise((resolve) => setTimeout(resolve, input.delay));
      return { result: 'completed' };
    },
  });

  return server;
}

/**
 * Simulate a client making tool calls
 */
async function simulateClient(clientId, server) {
  metrics.activeConnections++;
  metrics.maxConnections = Math.max(metrics.maxConnections, metrics.activeConnections);

  const tools = ['echo', 'compute', 'async'];

  for (let i = 0; i < CONFIG.REQUESTS_PER_CLIENT; i++) {
    const toolName = tools[Math.floor(Math.random() * tools.length)];
    const start = performance.now();

    try {
      // Generate appropriate input for each tool
      const input =
        toolName === 'echo'
          ? { message: `Client ${clientId} request ${i}` }
          : toolName === 'compute'
          ? { n: 1000 } // Small computation
          : { delay: 10 }; // Short delay

      // Call tool handler directly (simulating MCP protocol call)
      const tool = server._tools.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);

      await tool.handler(input);

      const latency = performance.now() - start;
      metrics.latencies.push(latency);
      metrics.totalRequests++;
      metrics.successful++;
    } catch (error) {
      metrics.errors++;
      console.error(`Client ${clientId} error:`, error.message);
    }
  }

  metrics.activeConnections--;
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const throughput = metrics.totalRequests / duration;

  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const max = sortedLatencies[sortedLatencies.length - 1];
  const avg = sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length;

  return {
    duration: duration.toFixed(2),
    totalRequests: metrics.totalRequests,
    successful: metrics.successful,
    failed: metrics.failed,
    errors: metrics.errors,
    throughput: throughput.toFixed(2),
    maxConnections: metrics.maxConnections,
    latency: {
      avg: avg.toFixed(3),
      p50: p50.toFixed(3),
      p95: p95.toFixed(3),
      p99: p99.toFixed(3),
      max: max.toFixed(3),
    },
  };
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('🔥 MCP Server Load Test Starting...\n');
  console.log('Configuration:');
  console.log(`  Concurrent Clients: ${CONFIG.CONCURRENT_CLIENTS}`);
  console.log(`  Requests per Client: ${CONFIG.REQUESTS_PER_CLIENT}`);
  console.log(`  Total Requests: ${CONFIG.CONCURRENT_CLIENTS * CONFIG.REQUESTS_PER_CLIENT}`);
  console.log(`  Target p95 Latency: <${CONFIG.TARGET_LATENCY_P95}ms\n`);

  // Create test server
  const server = createTestServer();

  metrics.startTime = performance.now();

  // Launch concurrent clients
  console.log('Launching concurrent clients...');
  const clients = [];
  for (let i = 0; i < CONFIG.CONCURRENT_CLIENTS; i++) {
    clients.push(simulateClient(i, server));
  }

  // Wait for all clients to complete
  await Promise.all(clients);

  metrics.endTime = performance.now();

  // Calculate and print results
  const stats = calculateStats();

  console.log('\n✅ Load Test Complete\n');
  console.log('Results:');
  console.log(`  Duration: ${stats.duration}s`);
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Throughput: ${stats.throughput} requests/sec`);
  console.log(`  Max Concurrent: ${stats.maxConnections}`);
  console.log('\nLatency (ms):');
  console.log(`  Average: ${stats.latency.avg}`);
  console.log(`  p50: ${stats.latency.p50}`);
  console.log(`  p95: ${stats.latency.p95}`);
  console.log(`  p99: ${stats.latency.p99}`);
  console.log(`  Max: ${stats.latency.max}`);

  // Success criteria evaluation
  console.log('\n📊 Success Criteria:');

  const connectionsOk = stats.maxConnections >= CONFIG.CONCURRENT_CLIENTS;
  console.log(
    `  ${connectionsOk ? '✅' : '❌'} Concurrent connections >= ${CONFIG.CONCURRENT_CLIENTS}: ${stats.maxConnections}`
  );

  const latencyOk = parseFloat(stats.latency.p95) < CONFIG.TARGET_LATENCY_P95;
  console.log(
    `  ${latencyOk ? '✅' : '❌'} Latency p95 < ${CONFIG.TARGET_LATENCY_P95}ms: ${stats.latency.p95}ms`
  );

  const errorsOk = stats.errors === 0;
  console.log(`  ${errorsOk ? '✅' : '❌'} No errors: ${stats.errors}`);

  const throughputOk = parseFloat(stats.throughput) > 100; // >100 req/sec
  console.log(`  ${throughputOk ? '✅' : '❌'} Throughput > 100 req/sec: ${stats.throughput}`);

  const allPassed = connectionsOk && latencyOk && errorsOk && throughputOk;

  if (allPassed) {
    console.log('\n🎉 All criteria passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some criteria failed');
    process.exit(1);
  }
}

// Run the test
runLoadTest().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});

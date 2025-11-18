/**
 * Validator Load Test
 *
 * Tests @djed/validator under realistic Khepri load:
 * - 100 workflows/day (~100 validations/hour)
 * - Schema transformations on-demand
 * - Concurrent validation handling
 * - CPU usage monitoring
 */

import { Validator } from '../../packages/validator/dist/index.js';
import { performance, PerformanceObserver } from 'perf_hooks';
import { cpuUsage } from 'process';

// Test configuration
const CONFIG = {
  DURATION_SECONDS: process.env.LOAD_TEST_DURATION || 300, // 5 minutes default
  VALIDATION_RATE: 100, // 100 validations/sec (stress test, way beyond Khepri needs)
  CONCURRENT_VALIDATIONS: 10, // 10 concurrent validations
  CPU_CHECK_INTERVAL_MS: 5000, // Check CPU every 5 seconds
};

// Sample schemas (realistic Khepri workflow schemas)
const schemas = {
  workflow: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            action: { type: 'string' },
            params: { type: 'object' },
          },
          required: ['name', 'action'],
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'status', 'steps'],
  },

  trigger: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['schedule', 'webhook', 'manual'] },
      config: { type: 'object' },
      enabled: { type: 'boolean' },
    },
    required: ['type', 'enabled'],
  },

  context: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      variables: { type: 'object' },
      secrets: { type: 'object' },
    },
    required: ['userId'],
  },
};

// Sample data generators
function generateWorkflowData() {
  return {
    id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Workflow ${Math.floor(Math.random() * 1000)}`,
    status: ['pending', 'running', 'completed', 'failed'][Math.floor(Math.random() * 4)],
    steps: [
      {
        name: 'Step 1',
        action: 'transform',
        params: { field: 'data' },
      },
      {
        name: 'Step 2',
        action: 'validate',
        params: { schema: 'output' },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateTriggerData() {
  return {
    type: ['schedule', 'webhook', 'manual'][Math.floor(Math.random() * 3)],
    config: { interval: '1h' },
    enabled: Math.random() > 0.5,
  };
}

function generateContextData() {
  return {
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    variables: { env: 'production' },
    secrets: { apiKey: 'secret' },
  };
}

// Metrics tracking
const metrics = {
  totalValidations: 0,
  successful: 0,
  failed: 0,
  errors: 0,
  startTime: 0,
  endTime: 0,
  latencies: [],
  cpuSnapshots: [],
  concurrentActive: 0,
  maxConcurrent: 0,
};

// Create validator
const validator = new Validator();

/**
 * Validate data and track metrics
 */
async function validateData(schemaName, data) {
  metrics.concurrentActive++;
  metrics.maxConcurrent = Math.max(metrics.maxConcurrent, metrics.concurrentActive);

  const start = performance.now();

  try {
    const result = validator.validate(schemas[schemaName], data);

    const latency = performance.now() - start;
    metrics.latencies.push(latency);
    metrics.totalValidations++;

    if (result.ok) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }
  } catch (error) {
    metrics.errors++;
    console.error(`Validation error:`, error.message);
  } finally {
    metrics.concurrentActive--;
  }
}

/**
 * Capture CPU usage snapshot
 */
function captureCPUSnapshot() {
  const usage = cpuUsage();
  metrics.cpuSnapshots.push({
    timestamp: Date.now(),
    user: usage.user,
    system: usage.system,
  });
}

/**
 * Run concurrent validations
 */
async function runConcurrentValidations(count) {
  const validations = [];

  for (let i = 0; i < count; i++) {
    // Rotate through different schema types
    const schemaType = ['workflow', 'trigger', 'context'][i % 3];
    const dataGenerator = [generateWorkflowData, generateTriggerData, generateContextData][i % 3];

    validations.push(validateData(schemaType, dataGenerator()));
  }

  await Promise.all(validations);
}

/**
 * Sustained validation load
 */
async function sustainedLoad(durationMs) {
  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    await runConcurrentValidations(CONFIG.CONCURRENT_VALIDATIONS);

    // Throttle to target rate
    const elapsedMs = Date.now() - startTime;
    const expectedValidations = (elapsedMs / 1000) * CONFIG.VALIDATION_RATE;
    const actualValidations = metrics.totalValidations;

    if (actualValidations < expectedValidations) {
      // Running behind, speed up
      await new Promise((resolve) => setImmediate(resolve));
    } else {
      // Running ahead, slow down
      const sleepMs = ((actualValidations - expectedValidations) / CONFIG.VALIDATION_RATE) * 1000;
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
  }
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const throughput = metrics.totalValidations / duration;

  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const max = sortedLatencies[sortedLatencies.length - 1];
  const avg = sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length;

  // CPU analysis
  const totalCPU = metrics.cpuSnapshots.reduce(
    (sum, snap) => sum + snap.user + snap.system,
    0
  );
  const avgCPU = totalCPU / metrics.cpuSnapshots.length;

  return {
    duration: duration.toFixed(2),
    totalValidations: metrics.totalValidations,
    successful: metrics.successful,
    failed: metrics.failed,
    errors: metrics.errors,
    throughput: throughput.toFixed(2),
    maxConcurrent: metrics.maxConcurrent,
    latency: {
      avg: avg.toFixed(3),
      p50: p50.toFixed(3),
      p95: p95.toFixed(3),
      p99: p99.toFixed(3),
      max: max.toFixed(3),
    },
    cpu: {
      avg: (avgCPU / 1000000).toFixed(2), // Convert to milliseconds
      samples: metrics.cpuSnapshots.length,
    },
  };
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('🔥 Validator Load Test Starting...\n');
  console.log('Configuration:');
  console.log(`  Duration: ${CONFIG.DURATION_SECONDS}s`);
  console.log(`  Validation Rate: ${CONFIG.VALIDATION_RATE} validations/sec`);
  console.log(`  Concurrent Validations: ${CONFIG.CONCURRENT_VALIDATIONS}\n`);

  metrics.startTime = performance.now();

  // Start CPU monitoring
  const cpuInterval = setInterval(captureCPUSnapshot, CONFIG.CPU_CHECK_INTERVAL_MS);
  captureCPUSnapshot(); // Initial snapshot

  // Run sustained load
  console.log('Running sustained validation load...');
  await sustainedLoad(CONFIG.DURATION_SECONDS * 1000);

  // Cleanup
  clearInterval(cpuInterval);
  captureCPUSnapshot(); // Final snapshot

  metrics.endTime = performance.now();

  // Calculate and print results
  const stats = calculateStats();

  console.log('\n✅ Load Test Complete\n');
  console.log('Results:');
  console.log(`  Duration: ${stats.duration}s`);
  console.log(`  Total Validations: ${stats.totalValidations}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Throughput: ${stats.throughput} validations/sec`);
  console.log(`  Max Concurrent: ${stats.maxConcurrent}`);
  console.log('\nLatency (ms):');
  console.log(`  Average: ${stats.latency.avg}`);
  console.log(`  p50: ${stats.latency.p50}`);
  console.log(`  p95: ${stats.latency.p95}`);
  console.log(`  p99: ${stats.latency.p99}`);
  console.log(`  Max: ${stats.latency.max}`);
  console.log('\nCPU Usage:');
  console.log(`  Average: ${stats.cpu.avg}ms per sample`);
  console.log(`  Samples: ${stats.cpu.samples}`);

  // Success criteria evaluation
  console.log('\n📊 Success Criteria:');

  const throughputOk = parseFloat(stats.throughput) >= 100; // >= 100 validations/sec
  console.log(`  ${throughputOk ? '✅' : '❌'} Throughput >= 100 validations/sec: ${stats.throughput}`);

  const latencyOk = parseFloat(stats.latency.p95) < 10; // <10ms p95
  console.log(`  ${latencyOk ? '✅' : '❌'} Latency p95 < 10ms: ${stats.latency.p95}ms`);

  const errorsOk = stats.errors === 0;
  console.log(`  ${errorsOk ? '✅' : '❌'} No errors: ${stats.errors}`);

  const concurrentOk = stats.maxConcurrent >= CONFIG.CONCURRENT_VALIDATIONS;
  console.log(`  ${concurrentOk ? '✅' : '❌'} Concurrent handling: ${stats.maxConcurrent}/${CONFIG.CONCURRENT_VALIDATIONS}`);

  const allPassed = throughputOk && latencyOk && errorsOk && concurrentOk;

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

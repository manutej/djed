/**
 * Logger Load Test
 *
 * Tests @djed/logger under realistic TextMate load:
 * - 1,000 messages/day (~1 msg/sec sustained)
 * - Bursts to 10 msg/sec
 * - Memory stability over extended duration
 * - No memory leaks
 */

import { Logger } from '../../packages/logger/dist/index.js';
import { performance } from 'perf_hooks';

// Test configuration
const CONFIG = {
  DURATION_SECONDS: process.env.LOAD_TEST_DURATION || 300, // 5 minutes default, 3600 for 1 hour
  SUSTAINED_RATE: 1, // 1 log/sec sustained (TextMate baseline)
  BURST_RATE: 10, // 10 logs/sec (TextMate bursts)
  BURST_DURATION_MS: 5000, // 5 second bursts
  BURST_INTERVAL_MS: 30000, // Every 30 seconds
  MEMORY_CHECK_INTERVAL_MS: 10000, // Check memory every 10 seconds
};

// Metrics tracking
const metrics = {
  totalLogs: 0,
  errors: 0,
  startTime: 0,
  endTime: 0,
  memorySnapshots: [],
  latencies: [],
};

// Create logger (silent to avoid I/O overhead)
const logger = new Logger('load-test', { silent: true });

/**
 * Log a message and track latency
 */
function logMessage(messageNum) {
  const start = performance.now();

  try {
    logger.info(`Load test message ${messageNum}`, {
      timestamp: Date.now(),
      messageNum,
      pid: process.pid,
    });

    const latency = performance.now() - start;
    metrics.latencies.push(latency);
    metrics.totalLogs++;
  } catch (error) {
    metrics.errors++;
    console.error(`Error logging message ${messageNum}:`, error.message);
  }
}

/**
 * Sustained load (1 log/sec)
 */
function sustainedLoad(durationMs) {
  return new Promise((resolve) => {
    const intervalMs = 1000 / CONFIG.SUSTAINED_RATE;
    let messageNum = 0;

    const interval = setInterval(() => {
      logMessage(messageNum++);
    }, intervalMs);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, durationMs);
  });
}

/**
 * Burst load (10 logs/sec for 5 seconds)
 */
function burstLoad() {
  return new Promise((resolve) => {
    const intervalMs = 1000 / CONFIG.BURST_RATE;
    let messageNum = 0;

    const interval = setInterval(() => {
      logMessage(messageNum++);
    }, intervalMs);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, CONFIG.BURST_DURATION_MS);
  });
}

/**
 * Take memory snapshot
 */
function captureMemorySnapshot() {
  const usage = process.memoryUsage();
  metrics.memorySnapshots.push({
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    rss: usage.rss,
    external: usage.external,
  });
}

/**
 * Calculate statistics
 */
function calculateStats() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const throughput = metrics.totalLogs / duration;

  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const max = sortedLatencies[sortedLatencies.length - 1];
  const avg = sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length;

  // Memory analysis
  const memoryDeltas = [];
  for (let i = 1; i < metrics.memorySnapshots.length; i++) {
    memoryDeltas.push(
      metrics.memorySnapshots[i].heapUsed - metrics.memorySnapshots[0].heapUsed
    );
  }

  const avgMemoryGrowth = memoryDeltas.length > 0
    ? memoryDeltas.reduce((sum, val) => sum + val, 0) / memoryDeltas.length
    : 0;

  const maxMemoryGrowth = memoryDeltas.length > 0
    ? Math.max(...memoryDeltas)
    : 0;

  return {
    duration: duration.toFixed(2),
    totalLogs: metrics.totalLogs,
    errors: metrics.errors,
    throughput: throughput.toFixed(2),
    latency: {
      avg: avg.toFixed(3),
      p50: p50.toFixed(3),
      p95: p95.toFixed(3),
      p99: p99.toFixed(3),
      max: max.toFixed(3),
    },
    memory: {
      initial: formatBytes(metrics.memorySnapshots[0].heapUsed),
      final: formatBytes(metrics.memorySnapshots[metrics.memorySnapshots.length - 1].heapUsed),
      avgGrowth: formatBytes(avgMemoryGrowth),
      maxGrowth: formatBytes(maxMemoryGrowth),
      snapshots: metrics.memorySnapshots.length,
    },
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('🔥 Logger Load Test Starting...\n');
  console.log('Configuration:');
  console.log(`  Duration: ${CONFIG.DURATION_SECONDS}s`);
  console.log(`  Sustained Rate: ${CONFIG.SUSTAINED_RATE} logs/sec`);
  console.log(`  Burst Rate: ${CONFIG.BURST_RATE} logs/sec`);
  console.log(`  Burst Duration: ${CONFIG.BURST_DURATION_MS}ms`);
  console.log(`  Burst Interval: ${CONFIG.BURST_INTERVAL_MS}ms\n`);

  metrics.startTime = performance.now();

  // Start memory monitoring
  const memoryInterval = setInterval(captureMemorySnapshot, CONFIG.MEMORY_CHECK_INTERVAL_MS);
  captureMemorySnapshot(); // Initial snapshot

  // Schedule bursts
  const burstInterval = setInterval(async () => {
    console.log(`  🚀 Burst load starting...`);
    await burstLoad();
    console.log(`  ✓ Burst complete`);
  }, CONFIG.BURST_INTERVAL_MS);

  // Run sustained load for duration
  console.log('Running sustained load...');
  await sustainedLoad(CONFIG.DURATION_SECONDS * 1000);

  // Cleanup
  clearInterval(memoryInterval);
  clearInterval(burstInterval);
  captureMemorySnapshot(); // Final snapshot

  metrics.endTime = performance.now();

  // Calculate and print results
  const stats = calculateStats();

  console.log('\n✅ Load Test Complete\n');
  console.log('Results:');
  console.log(`  Duration: ${stats.duration}s`);
  console.log(`  Total Logs: ${stats.totalLogs}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Throughput: ${stats.throughput} logs/sec`);
  console.log('\nLatency (ms):');
  console.log(`  Average: ${stats.latency.avg}`);
  console.log(`  p50: ${stats.latency.p50}`);
  console.log(`  p95: ${stats.latency.p95}`);
  console.log(`  p99: ${stats.latency.p99}`);
  console.log(`  Max: ${stats.latency.max}`);
  console.log('\nMemory:');
  console.log(`  Initial: ${stats.memory.initial}`);
  console.log(`  Final: ${stats.memory.final}`);
  console.log(`  Avg Growth: ${stats.memory.avgGrowth}`);
  console.log(`  Max Growth: ${stats.memory.maxGrowth}`);
  console.log(`  Snapshots: ${stats.memory.snapshots}`);

  // Success criteria evaluation
  console.log('\n📊 Success Criteria:');

  const sustainedThroughputOk = parseFloat(stats.throughput) >= CONFIG.SUSTAINED_RATE;
  console.log(`  ${sustainedThroughputOk ? '✅' : '❌'} Sustained throughput >= ${CONFIG.SUSTAINED_RATE} logs/sec: ${stats.throughput}`);

  const latencyOk = parseFloat(stats.latency.p95) < 10; // <10ms p95 is excellent for logging
  console.log(`  ${latencyOk ? '✅' : '❌'} Latency p95 < 10ms: ${stats.latency.p95}ms`);

  const errorsOk = stats.errors === 0;
  console.log(`  ${errorsOk ? '✅' : '❌'} No errors: ${stats.errors}`);

  // Memory leak detection (growth should be minimal)
  const maxGrowthBytes = parseFloat(stats.memory.maxGrowth.split(' ')[0]) *
    (stats.memory.maxGrowth.includes('MB') ? 1024 * 1024 : 1024);
  const memoryOk = maxGrowthBytes < 50 * 1024 * 1024; // <50MB growth is acceptable
  console.log(`  ${memoryOk ? '✅' : '❌'} Memory growth < 50MB: ${stats.memory.maxGrowth}`);

  const allPassed = sustainedThroughputOk && latencyOk && errorsOk && memoryOk;

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

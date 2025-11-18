# Load Tests

Load testing suite for Djed packages under realistic TextMate and Khepri scenarios.

## Overview

These tests validate Djed performance under expected production loads:

| Package | Test Scenario | Target Load |
|---------|---------------|-------------|
| @djed/logger | TextMate messaging | 1k msgs/day, bursts to 10 msg/sec |
| @djed/validator | Khepri workflows | 100 validations/sec |
| @djed/mcp-base | Concurrent connections | 50 concurrent clients |

## Installation

```bash
cd tests/load
npm install
```

## Running Tests

### All Tests (Sequential)

```bash
npm run test:all
```

### Individual Tests

**Logger Load Test** (5 minutes default):
```bash
npm run test:logger
```

**Validator Load Test** (5 minutes default):
```bash
npm run test:validator
```

**MCP Server Load Test** (3 minutes default):
```bash
npm run test:mcp-server
```

### Custom Duration

Set duration via environment variable (in seconds):

```bash
# 1 hour logger test
LOAD_TEST_DURATION=3600 npm run test:logger

# 10 minute validator test
LOAD_TEST_DURATION=600 npm run test:validator
```

## Test Details

### Logger Load Test (`logger-load.test.js`)

**Simulates**: TextMate message logging

**Load Profile**:
- Sustained: 1 log/sec (baseline)
- Bursts: 10 logs/sec for 5 seconds every 30 seconds
- Duration: 5 minutes (default) or custom

**Success Criteria**:
- ✅ Throughput >= 1 log/sec sustained
- ✅ Latency p95 < 10ms
- ✅ No errors
- ✅ Memory growth < 50MB

**Metrics**:
- Total logs
- Throughput (logs/sec)
- Latency (avg, p50, p95, p99, max)
- Memory (initial, final, growth)

---

### Validator Load Test (`validator-load.test.js`)

**Simulates**: Khepri workflow schema validation

**Load Profile**:
- Rate: 100 validations/sec
- Concurrent: 10 simultaneous validations
- Schemas: Workflow, trigger, context (rotated)
- Duration: 5 minutes (default) or custom

**Success Criteria**:
- ✅ Throughput >= 100 validations/sec
- ✅ Latency p95 < 10ms
- ✅ No errors
- ✅ Handles concurrent validations

**Metrics**:
- Total validations
- Successful/failed/errors
- Throughput (validations/sec)
- Max concurrent
- Latency (avg, p50, p95, p99, max)
- CPU usage

---

### MCP Server Load Test (`mcp-server-load.test.js`)

**Simulates**: Multiple clients calling MCP tools

**Load Profile**:
- Clients: 50 concurrent
- Requests per client: 100
- Tools: echo, compute, async (random)
- Duration: ~3 minutes (completion-based)

**Success Criteria**:
- ✅ Concurrent connections >= 50
- ✅ Latency p95 < 100ms
- ✅ No errors
- ✅ Throughput > 100 req/sec

**Metrics**:
- Total requests
- Successful/failed/errors
- Throughput (requests/sec)
- Max concurrent connections
- Latency (avg, p50, p95, p99, max)

---

## Interpreting Results

### Successful Run

```
✅ Load Test Complete

Results:
  Duration: 300.00s
  Total Logs: 305
  Errors: 0
  Throughput: 1.02 logs/sec

Latency (ms):
  Average: 0.123
  p50: 0.110
  p95: 0.180
  p99: 0.250
  Max: 0.500

Memory:
  Initial: 45.23 MB
  Final: 48.15 MB
  Avg Growth: 2.50 MB
  Max Growth: 2.92 MB

📊 Success Criteria:
  ✅ Sustained throughput >= 1 logs/sec: 1.02
  ✅ Latency p95 < 10ms: 0.180ms
  ✅ No errors: 0
  ✅ Memory growth < 50MB: 2.92 MB

🎉 All criteria passed!
```

### Failed Run

```
❌ Load Test Complete

Results:
  ...
  Errors: 15

📊 Success Criteria:
  ✅ Sustained throughput >= 1 logs/sec: 1.02
  ❌ Latency p95 < 10ms: 15.234ms
  ❌ No errors: 15
  ✅ Memory growth < 50MB: 2.92 MB

❌ Some criteria failed
```

## Debugging Performance Issues

### High Latency

If p95 latency exceeds targets:

1. **Check CPU usage**: May need optimization
2. **Review code paths**: Profile with clinic.js
3. **Check I/O operations**: Ensure async operations don't block

### Memory Leaks

If memory grows continuously:

1. **Run with longer duration**: `LOAD_TEST_DURATION=3600`
2. **Check for unclosed resources**: Files, connections, timers
3. **Review caching**: Ensure bounded cache sizes
4. **Use clinic.js heapprofiler**: `clinic heapprofiler -- node logger-load.test.js`

### Low Throughput

If throughput below target:

1. **Check for blocking operations**: Use async where possible
2. **Review locks/mutexes**: May be causing contention
3. **Profile with clinic.js**: `clinic bubbleprof -- node logger-load.test.js`

## Profiling Tools

### Clinic.js

Install clinic.js for advanced profiling:

```bash
npm install -g clinic
```

**Flame graphs** (CPU profiling):
```bash
clinic flame -- node logger-load.test.js
```

**Heap profiler** (memory):
```bash
clinic heapprofiler -- node logger-load.test.js
```

**Bubbleprof** (async operations):
```bash
clinic bubbleprof -- node logger-load.test.js
```

## CI Integration

Load tests are **not** included in CI by default (too time-consuming).

Run manually:
- Before major releases
- After performance-critical changes
- When investigating performance regressions

## Expected Load vs Actual

| Scenario | Daily Volume | Peak Rate | Load Test Rate |
|----------|--------------|-----------|----------------|
| **TextMate** | 1,000 msgs | 10 msg/sec | 1 msg/sec sustained, 10 msg/sec bursts |
| **Khepri** | 100 workflows | On-demand | 100 validations/sec (stress test) |
| **MCP Connections** | N/A | 10-20 concurrent | 50 concurrent (stress test) |

**Note**: Load tests use higher rates than expected production to ensure headroom.

## Updating Tests

When adding new Djed packages or changing load profiles:

1. Add new load test file: `{package}-load.test.js`
2. Follow existing test structure
3. Update package.json scripts
4. Document in this README
5. Update success criteria based on expected usage

## Related

- [Performance Benchmarks](../../packages/logger/benchmarks/) - Micro-benchmarks
- [LOAD-TESTING.md](../../LOAD-TESTING.md) - Comprehensive load testing documentation
- [PERFORMANCE.md](../../PERFORMANCE.md) - Performance baselines

## License

MIT

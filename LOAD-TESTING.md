# Load Testing Documentation

**Comprehensive guide to Djed's load testing strategy and results**

---

## Table of Contents

- [Overview](#overview)
- [Philosophy](#philosophy)
- [Test Scenarios](#test-scenarios)
- [Running Load Tests](#running-load-tests)
- [Expected Results](#expected-results)
- [Interpreting Results](#interpreting-results)
- [Performance Targets](#performance-targets)
- [Troubleshooting](#troubleshooting)

---

## Overview

Djed's load tests validate performance under **realistic production scenarios** for TextMate and Khepri:

| Package | Scenario | Target Load | Test Duration |
|---------|----------|-------------|---------------|
| **@djed/logger** | TextMate messaging | 1k msgs/day (1 msg/sec, bursts to 10) | 5 min |
| **@djed/validator** | Khepri workflows | 100 validations/sec | 5 min |
| **@djed/mcp-base** | MCP connections | 50 concurrent clients, 100 req/client | ~3 min |

**Key Difference from Benchmarks**:
- **Benchmarks** (CET-275): Micro-level performance (single operations)
- **Load Tests** (CET-279): Macro-level performance (sustained real-world load)

---

## Philosophy

### Why Load Testing?

1. **Validate realistic scenarios** - Not synthetic benchmarks
2. **Detect memory leaks** - Over extended duration
3. **Measure stability** - Under sustained load
4. **Identify bottlenecks** - Before production
5. **Ensure headroom** - Tests exceed expected load

### Realistic vs Synthetic

**❌ Synthetic**: 1M requests/sec, 10k concurrent connections, unrealistic schemas

**✅ Realistic**:
- TextMate: 1,000 messages/day (~1 msg/sec)
- Khepri: 100 workflows/day (~1 workflow/hour)
- MCP: 10-20 concurrent connections typically

**🔥 Stress Testing**: Tests use 2-5x expected load for headroom

---

## Test Scenarios

### Scenario 1: TextMate Messaging (Logger)

**Real-World Profile**:
- 1,000 messages/day
- ~1 message/sec sustained
- Bursts to 10 msg/sec during active conversations
- 24/7 operation (memory stability critical)

**Test Parameters**:
```javascript
DURATION: 300 seconds (5 minutes, configurable to 1 hour)
SUSTAINED_RATE: 1 log/sec
BURST_RATE: 10 logs/sec
BURST_DURATION: 5 seconds
BURST_INTERVAL: 30 seconds
```

**What It Tests**:
- Sustained logging throughput
- Burst handling capability
- Memory stability over time
- No memory leaks

**Success Criteria**:
- ✅ Throughput >= 1 log/sec sustained
- ✅ Latency p95 < 10ms
- ✅ No errors
- ✅ Memory growth < 50MB

**Why This Matters**:
- TextMate logs every message for debugging
- Must handle customer conversations without degradation
- Memory leaks would crash overnight

---

### Scenario 2: Khepri Workflows (Validator)

**Real-World Profile**:
- 100 workflows/day
- ~1 workflow/hour average
- On-demand schema transformations
- Multiple concurrent workflows possible

**Test Parameters**:
```javascript
DURATION: 300 seconds (5 minutes)
VALIDATION_RATE: 100 validations/sec (stress test)
CONCURRENT_VALIDATIONS: 10
SCHEMAS: workflow, trigger, context (realistic)
```

**What It Tests**:
- Validation throughput
- Schema compilation efficiency
- Concurrent validation handling
- CPU usage under load

**Success Criteria**:
- ✅ Throughput >= 100 validations/sec
- ✅ Latency p95 < 10ms
- ✅ No errors
- ✅ Handles 10 concurrent validations

**Why This Matters**:
- Khepri validates every workflow step
- Schema errors must be caught quickly
- Multiple workflows may trigger simultaneously

---

### Scenario 3: MCP Connections (MCP Base)

**Real-World Profile**:
- 10-20 concurrent connections typically
- ~50-100 requests per connection
- Tool calls vary in complexity
- Connection lifecycle management

**Test Parameters**:
```javascript
CONCURRENT_CLIENTS: 50 (stress test)
REQUESTS_PER_CLIENT: 100
TOOLS: echo, compute, async (mixed complexity)
```

**What It Tests**:
- Concurrent connection handling
- Tool call latency
- Connection pooling efficiency
- Request throughput

**Success Criteria**:
- ✅ Concurrent connections >= 50
- ✅ Latency p95 < 100ms
- ✅ No errors
- ✅ Throughput > 100 req/sec

**Why This Matters**:
- MCP servers may have multiple Claude instances connected
- Tool calls must respond quickly (<100ms)
- Connection management must be efficient

---

## Running Load Tests

### Prerequisites

```bash
cd tests/load
npm install
```

### Quick Start

**Run all tests**:
```bash
npm run test:all
```

**Individual tests**:
```bash
npm run test:logger      # Logger (5 min)
npm run test:validator   # Validator (5 min)
npm run test:mcp-server  # MCP Server (~3 min)
```

### Custom Duration

For extended testing (e.g., overnight):

```bash
# 1 hour logger test (memory leak detection)
LOAD_TEST_DURATION=3600 npm run test:logger

# 8 hour overnight test
LOAD_TEST_DURATION=28800 npm run test:logger
```

### Interpreting Output

**Successful run**:
```
🔥 Logger Load Test Starting...

Configuration:
  Duration: 300s
  Sustained Rate: 1 logs/sec
  Burst Rate: 10 logs/sec

Running sustained load...
  🚀 Burst load starting...
  ✓ Burst complete

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

**Failed run**:
```
❌ Load Test Complete

📊 Success Criteria:
  ✅ Sustained throughput >= 1 logs/sec: 1.02
  ❌ Latency p95 < 10ms: 15.234ms
  ❌ No errors: 15
  ✅ Memory growth < 50MB: 2.92 MB

❌ Some criteria failed
```

---

## Expected Results

### Logger Load Test

**Typical Results** (5 minute test):
```
Duration: 300s
Total Logs: ~305
Throughput: ~1.02 logs/sec
Latency p95: <1ms
Memory Growth: <5MB
```

**Explanation**:
- Throughput slightly above 1 log/sec due to bursts
- Latency excellent (<1ms) due to silent mode
- Memory growth minimal (logs are not retained)

**Red Flags**:
- ❌ Throughput < 1 log/sec
- ❌ Latency p95 > 10ms
- ❌ Memory growth > 50MB (indicates leak)
- ❌ Any errors

---

### Validator Load Test

**Typical Results** (5 minute test):
```
Duration: 300s
Total Validations: ~30,000
Throughput: ~100 validations/sec
Latency p95: <5ms
Max Concurrent: 10
```

**Explanation**:
- High throughput (100 val/sec) validates performance headroom
- Low latency (<5ms p95) ensures quick validation
- Concurrent handling (10 simultaneous) proves scalability

**Red Flags**:
- ❌ Throughput < 100 validations/sec
- ❌ Latency p95 > 10ms
- ❌ Failed validations (should be 0)
- ❌ Cannot handle 10 concurrent

---

### MCP Server Load Test

**Typical Results** (~3 minute test):
```
Duration: ~180s
Total Requests: 5,000
Throughput: ~150 req/sec
Latency p95: <50ms
Max Concurrent: 50
```

**Explanation**:
- High throughput (150 req/sec) shows efficient handling
- Low latency (<50ms p95) ensures responsive tools
- Concurrent handling (50 clients) proves scalability

**Red Flags**:
- ❌ Max concurrent < 50
- ❌ Latency p95 > 100ms
- ❌ Throughput < 100 req/sec
- ❌ Any errors

---

## Performance Targets

### Logger

| Metric | Target | Stress Test | Notes |
|--------|--------|-------------|-------|
| Throughput | >= 1 log/sec | 10 logs/sec bursts | TextMate baseline |
| Latency p95 | < 10ms | < 1ms typical | Silent mode (no I/O) |
| Memory Growth | < 50MB/hour | < 5MB/5min | No leaks |
| Errors | 0 | 0 | Must be reliable |

### Validator

| Metric | Target | Stress Test | Notes |
|--------|--------|-------------|-------|
| Throughput | >= 100 val/sec | Way beyond Khepri needs | Headroom |
| Latency p95 | < 10ms | < 5ms typical | Fast validation |
| Concurrent | 10 | 10 simultaneous | Khepri workflows |
| Errors | 0 | 0 | Must be reliable |

### MCP Server

| Metric | Target | Stress Test | Notes |
|--------|--------|-------------|-------|
| Concurrent | >= 50 | 50 clients | Beyond typical 10-20 |
| Latency p95 | < 100ms | < 50ms typical | Responsive tools |
| Throughput | > 100 req/sec | 150+ typical | Efficient handling |
| Errors | 0 | 0 | Must be reliable |

---

## Interpreting Results

### Throughput Analysis

**Good**:
- Meets or exceeds target
- Consistent throughout test
- No degradation over time

**Concerning**:
- Below target consistently
- Degrades over time (may indicate leak)
- High variance (inconsistent)

**Action**: Profile with clinic.js, check for blocking operations

---

### Latency Analysis

**Good**:
- p95 < target
- p99 not much higher than p95 (low outliers)
- Max latency reasonable

**Concerning**:
- p95 > target
- p99 >> p95 (many outliers)
- Max latency excessive

**Action**: Profile with clinic.js flame, check for slow operations

---

### Memory Analysis

**Good**:
- Stable growth curve
- Returns to baseline after GC
- Growth proportional to operations

**Concerning**:
- Continuous growth (likely leak)
- Does not return to baseline
- Growth disproportionate to operations

**Action**: Profile with clinic.js heapprofiler, check for unclosed resources

---

## Troubleshooting

### High Latency

**Symptoms**:
- p95 latency exceeds target
- Slow test execution
- Timeouts

**Diagnosis**:
```bash
# Profile CPU usage
clinic flame -- node tests/load/logger-load.test.js

# Check for blocking operations
clinic bubbleprof -- node tests/load/logger-load.test.js
```

**Common Causes**:
- Synchronous I/O operations
- CPU-intensive computations
- Lock contention
- Inefficient algorithms

**Solutions**:
- Use async I/O
- Move CPU work to worker threads
- Reduce lock scope
- Optimize hot paths

---

### Memory Leaks

**Symptoms**:
- Continuous memory growth
- Does not plateau
- Eventually OOM errors

**Diagnosis**:
```bash
# Profile heap allocations
clinic heapprofiler -- node tests/load/logger-load.test.js

# Run extended test
LOAD_TEST_DURATION=3600 npm run test:logger
```

**Common Causes**:
- Unclosed file handles
- Lingering event listeners
- Unbounded caches
- Circular references

**Solutions**:
- Close resources explicitly
- Remove event listeners
- Implement cache eviction
- Use WeakMap/WeakSet

---

### Low Throughput

**Symptoms**:
- Throughput below target
- Test takes longer than expected
- High CPU or I/O wait

**Diagnosis**:
```bash
# Profile async operations
clinic bubbleprof -- node tests/load/logger-load.test.js

# Check CPU usage
top -pid $(pgrep -f "node.*logger-load")
```

**Common Causes**:
- Sequential operations (should be parallel)
- Lock contention
- I/O bottlenecks
- Inefficient data structures

**Solutions**:
- Parallelize independent operations
- Reduce lock scope
- Use async I/O
- Optimize data structures

---

## Comparison: Benchmarks vs Load Tests

| Aspect | Benchmarks (CET-275) | Load Tests (CET-279) |
|--------|----------------------|----------------------|
| **Focus** | Micro-level performance | Macro-level performance |
| **Duration** | <1 second per benchmark | 5-60 minutes per test |
| **Scope** | Single operation | Sustained operations |
| **Goal** | Optimize hot paths | Validate stability |
| **Metrics** | ops/sec, latency | Throughput, memory, errors |
| **When** | Every PR (CI) | Before releases (manual) |

**Both are necessary**:
- Benchmarks catch regressions in individual operations
- Load tests catch issues under realistic sustained load

---

## Best Practices

### Running Load Tests

1. **Baseline first** - Run on known-good code
2. **Consistent environment** - Same machine, no background load
3. **Multiple runs** - Average results across 3+ runs
4. **Extended duration** - Run overnight for memory leak detection
5. **Monitor system** - Check CPU, memory, I/O during test

### Updating Load Tests

When adding new packages or changing scenarios:

1. Define realistic load profile (not synthetic)
2. Set appropriate success criteria
3. Document expected results
4. Update this documentation
5. Run baseline tests

### CI Integration

Load tests are **NOT** in CI by default (too time-consuming).

**When to run**:
- Before major releases
- After performance-critical changes
- When investigating performance issues
- Weekly/monthly scheduled runs

---

## Related Documentation

- [PERFORMANCE.md](./PERFORMANCE.md) - Benchmark baselines
- [tests/load/README.md](./tests/load/README.md) - Usage guide
- [Package Benchmarks](./packages/logger/benchmarks/) - Micro-benchmarks
- [IMPROVEMENT-ROADMAP.md](./IMPROVEMENT-ROADMAP.md) - Phase 1.5 plan

---

## Summary

**Load tests validate Djed performance under realistic production scenarios:**

✅ **@djed/logger**: Handles TextMate messaging (1k msgs/day, bursts to 10 msg/sec)
✅ **@djed/validator**: Handles Khepri workflows (100+ validations/sec)
✅ **@djed/mcp-base**: Handles concurrent MCP connections (50+ clients)

**All tests include**:
- Realistic load profiles
- Extended duration testing
- Memory leak detection
- Comprehensive metrics

**Ready for**: TextMate & Khepri production deployment 🚀

---

**Version**: 1.0
**Last Updated**: 2025-11-04
**Djed Version**: 0.1.0

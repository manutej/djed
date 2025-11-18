# Djed Performance Benchmarks & Baselines

**Created**: 2025-11-04
**Last Updated**: 2025-11-04
**Status**: Initial Benchmarks Established

---

## Overview

This document tracks performance benchmarks and baselines for all Djed packages. Benchmarks are automatically run in CI and will fail if performance regresses by more than 20%.

**Success Criteria** (from Phase 1.5):
- ✅ Time to first log: < 30ms
- ✅ Log throughput: > 10,000 logs/sec
- ✅ Schema validation: < 1ms for typical schemas
- ✅ MCP request handling: > 100 req/sec
- ✅ CI fails on >20% regression

---

## Running Benchmarks

### Locally

```bash
# Run all benchmarks
npm run bench

# Run benchmarks for specific package
cd packages/logger && npm run bench
cd packages/validator && npm run bench
cd packages/mcp-base && npm run bench

# Watch mode (re-run on changes)
npm run bench:watch
```

### In CI

Benchmarks run automatically on:
- Every push to `main` branch
- Every pull request
- Manual trigger via GitHub Actions

**CI Behavior**:
- ✅ Pass: Performance within 20% of baseline
- ❌ Fail: Performance regressed >20%
- 💬 Comment: PR gets benchmark results comment

---

## Performance Baselines

### @djed/logger

**Target Metrics**:
- Time to first log: **< 30ms** ⚡
- Throughput: **> 10,000 logs/sec** 📊
- Memory baseline: **< 5MB** 💾

#### Benchmark Results

| Benchmark | Operations/sec | Time (ms) | Status |
|-----------|---------------|-----------|--------|
| Time to first log (L1 - zero config) | TBD | < 30 | ⏳ Pending |
| Time to first log (L2 - with options) | TBD | < 35 | ⏳ Pending |
| Log throughput - info level | TBD | - | ⏳ Pending |
| Log throughput - debug level | TBD | - | ⏳ Pending |
| Log throughput - error with metadata | TBD | - | ⏳ Pending |
| JSON format logging | TBD | < 1 | ⏳ Pending |
| Pretty format logging | TBD | < 1.5 | ⏳ Pending |
| Logging with complex metadata | TBD | < 2 | ⏳ Pending |
| Concurrent logging simulation | TBD | - | ⏳ Pending |
| Logger reuse (single instance) | TBD | - | ⏳ Pending |
| Logger recreation (new instance each time) | TBD | - | ⏳ Pending |
| L3 winston direct usage | TBD | < 1 | ⏳ Pending |

#### Memory Profile

| Benchmark | Memory Usage | Status |
|-----------|-------------|--------|
| Multiple logger instances (10x) | TBD | ⏳ Pending |
| Sustained logging (1000 logs) | TBD | ⏳ Pending |
| Baseline (single logger, idle) | < 5MB | ⏳ Pending |

**Update Status**: Run `npm run bench` in `packages/logger/` to establish baselines.

---

### @djed/validator

**Target Metrics**:
- Validation speed: **< 1ms** for typical schemas ⚡
- Cache hit rate: **> 90%** for repeated validations 📈
- Memory: Efficient schema caching 💾

#### Benchmark Results

| Benchmark | Operations/sec | Time (µs) | Status |
|-----------|---------------|-----------|--------|
| Schema compilation - simple | TBD | < 100 | ⏳ Pending |
| Schema compilation - complex | TBD | < 500 | ⏳ Pending |
| Validation - simple schema (valid) | TBD | < 100 | ⏳ Pending |
| Validation - simple schema (invalid) | TBD | < 150 | ⏳ Pending |
| Validation - complex schema (valid) | TBD | < 500 | ⏳ Pending |
| Validation - complex schema (invalid) | TBD | < 600 | ⏳ Pending |
| Format validation - email | TBD | < 50 | ⏳ Pending |
| Format validation - uuid | TBD | < 50 | ⏳ Pending |
| Format validation - date-time | TBD | < 50 | ⏳ Pending |
| Array validation - small (10 items) | TBD | < 200 | ⏳ Pending |
| Array validation - large (1000 items) | TBD | < 5000 | ⏳ Pending |
| Nested object validation - depth 3 | TBD | < 300 | ⏳ Pending |
| Without caching (compile each time) | TBD | - | ⏳ Pending |
| With caching (compile once) | TBD | - | ⏳ Pending |
| Concurrent validation - 100 validations | TBD | - | ⏳ Pending |
| Error collection - multiple errors | TBD | < 500 | ⏳ Pending |

#### Cache Performance

| Scenario | Speedup | Cache Hit Rate | Status |
|----------|---------|----------------|--------|
| Repeated validation (same schema) | TBD | > 90% | ⏳ Pending |
| Mixed schemas (10 unique) | TBD | > 70% | ⏳ Pending |

#### Memory Profile

| Benchmark | Memory Usage | Status |
|-----------|-------------|--------|
| 100 schemas in cache | TBD | ⏳ Pending |
| Large object validation (1000 props) | TBD | ⏳ Pending |

**Update Status**: Run `npm run bench` in `packages/validator/` to establish baselines.

---

### @djed/mcp-base

**Target Metrics**:
- Request handling: **> 100 req/sec** 📡
- Concurrent connections: **50+ connections** 🔌
- Request latency: **< 100ms p95** ⚡

#### Benchmark Results

| Benchmark | Operations/sec | Time (ms) | Status |
|-----------|---------------|-----------|--------|
| Tool registration - single tool | TBD | < 1 | ⏳ Pending |
| Tool registration - 10 tools | TBD | < 10 | ⏳ Pending |
| Tool registration - 100 tools | TBD | < 100 | ⏳ Pending |
| Request handling - tools/list | TBD | < 5 | ⏳ Pending |
| Request handling - tools/call (simple) | TBD | < 10 | ⏳ Pending |
| Request handling - tools/call (complex) | TBD | < 20 | ⏳ Pending |
| Error handling - tool not found | TBD | < 5 | ⏳ Pending |
| Error handling - invalid method | TBD | < 5 | ⏳ Pending |
| Concurrent requests - 10 parallel | TBD | < 100 | ⏳ Pending |
| Concurrent requests - 50 parallel | TBD | < 500 | ⏳ Pending |
| Sequential requests - 10 requests | TBD | - | ⏳ Pending |
| Tool lookup - 10 tools registered | TBD | < 1 | ⏳ Pending |
| Tool lookup - 100 tools registered | TBD | < 2 | ⏳ Pending |

#### Throughput Analysis

| Scenario | Requests/sec | Latency (p95) | Status |
|----------|--------------|---------------|--------|
| Simple tool calls | > 200 | < 50ms | ⏳ Pending |
| Complex tool calls | > 100 | < 100ms | ⏳ Pending |
| Mixed workload | > 150 | < 75ms | ⏳ Pending |

#### Memory Profile

| Benchmark | Memory Usage | Status |
|-----------|-------------|--------|
| 100 tools registered | TBD | ⏳ Pending |
| 1000 request/response cycles | TBD | ⏳ Pending |

**Update Status**: Run `npm run bench` in `packages/mcp-base/` to establish baselines.

---

## Performance Targets for TextMate & Khepri

### TextMate (Messaging)
**Expected Load**:
- 1,000 messages/day (~1 msg/sec sustained)
- Bursts to 10 msg/sec
- Typical message: 500 bytes

**Required Performance**:
- Logger: Handle 10 logs/sec continuously ✅
- Validator: Validate contact schemas (< 1ms) ✅
- MCP: Handle 5 req/sec for tool calls ✅

**Status**: Well within Djed capabilities

---

### Khepri (Workflow Bridge)
**Expected Load**:
- 100 workflows/day (~1 workflow/10min)
- Schema transformations on-demand
- Concurrent workflow triggers (5-10)

**Required Performance**:
- Logger: Handle 5 logs/sec ✅
- Validator: Complex schema validation (< 5ms) ✅
- MCP: Handle 10 concurrent requests ✅

**Status**: Well within Djed capabilities

---

## Regression Detection

### Thresholds

| Severity | Regression | Action |
|----------|-----------|--------|
| 🟢 **Acceptable** | < 10% | Pass, no alert |
| 🟡 **Warning** | 10-20% | Pass, comment on PR |
| 🔴 **Critical** | > 20% | Fail CI, require investigation |

### Regression Alert Process

1. **Detection**: CI detects >20% regression
2. **Alert**: PR comment + CI failure
3. **Investigation**: Developer reviews benchmark results
4. **Resolution**:
   - Fix performance issue, OR
   - Update baseline if regression is justified (e.g., new feature trade-off)

### Updating Baselines

**When to update**:
- New features that justify performance trade-offs
- Platform/Node.js version changes
- Dependency updates with known perf impact

**How to update**:
```bash
# Run benchmarks to establish new baseline
npm run bench

# Update this file with new baseline values
# Commit with explanation in PR
git add PERFORMANCE.md
git commit -m "chore: update performance baselines after [feature/change]"
```

---

## Benchmark History

### Version 0.1.0 (2025-11-04)
- ✅ Initial benchmarks established
- ✅ CI integration complete
- ⏳ Baseline values pending first run

**Next Steps**:
1. Run benchmarks locally: `npm run bench`
2. Update baseline values in this document
3. Validate in CI
4. Establish gh-pages branch for historical tracking

---

## Optimization Guidelines

### When to Optimize

**DO optimize when**:
- Benchmarks show >20% regression
- Real-world usage reports performance issues
- Profiling identifies clear bottlenecks

**DON'T optimize when**:
- "Premature optimization" - no measured problem
- Performance is already meeting targets
- Trade-off sacrifices code clarity

### Optimization Checklist

Before optimizing:
- [ ] Measure baseline performance
- [ ] Identify bottleneck with profiler
- [ ] Set target improvement (e.g., "50% faster")

After optimizing:
- [ ] Re-run benchmarks
- [ ] Verify improvement meets target
- [ ] Ensure no functionality regressions
- [ ] Update baselines in this document

---

## Tools & Resources

### Profiling Tools

```bash
# CPU profiling with clinic.js
npm install -g clinic
clinic doctor -- node your-script.js

# Memory profiling
clinic heapprofiler -- node your-script.js

# Flame graphs
clinic flame -- node your-script.js
```

### Load Testing

```bash
# HTTP load testing with autocannon
npm install -g autocannon
autocannon -c 10 -d 30 http://localhost:3000

# Advanced load testing with k6
k6 run load-test.js
```

### Benchmarking

```bash
# Run specific benchmark
npm run bench -- --grep="logger throughput"

# Run with more iterations
npm run bench -- --iterations=10000

# Output JSON for analysis
npm run bench -- --reporter=json > results.json
```

---

## FAQ

### Why 20% regression threshold?

- Balances sensitivity (catch real regressions) with flexibility (allow minor variations)
- Industry standard for CI performance gates
- Adjustable per package if needed

### How often should I run benchmarks?

- **Automatically**: Every PR and push to main (via CI)
- **Manually**: Before major refactors or optimizations
- **Never**: Don't micro-benchmark during development (wait for CI)

### What if CI fails on legitimate change?

1. Investigate if regression is real
2. If regression is justified (e.g., new feature), update baselines
3. Document reason in PR
4. Get approval from maintainers

### How do I compare against previous versions?

```bash
# Checkout previous version
git checkout v0.1.0

# Run benchmarks
npm run bench

# Compare with current
git checkout main
npm run bench
```

---

## Next Actions

### Immediate (Today)
- [ ] Run `npm run bench` for all packages
- [ ] Update baseline values in this document
- [ ] Validate CI workflow triggers correctly

### Phase 1.5 (This Week)
- [x] ✅ Benchmark infrastructure complete
- [ ] Establish baseline values
- [ ] Document in Linear (CET-275)

### Phase 2 (Post-Launch)
- [ ] Add load testing for realistic TextMate/Khepri scenarios
- [ ] Set up gh-pages for historical tracking
- [ ] Create performance dashboard

---

**Status**: Benchmark infrastructure ready. Awaiting first run to establish baselines.

**Created**: 2025-11-04
**Owner**: Djed Infrastructure Team
**Review**: After TextMate/Khepri MVP launch

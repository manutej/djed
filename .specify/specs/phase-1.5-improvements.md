# Phase 1.5 Improvements Specification

**Critical improvements before TextMate and Khepri integration**

**Status**: Ready for Implementation
**Priority**: CRITICAL
**Timeline**: 3-5 days
**Created**: 2025-11-17

---

## Executive Summary

Phase 1.5 addresses critical performance, developer experience, and operational gaps identified in the comprehensive code review. These improvements must be completed before TextMate (messaging automation) and Khepri (MCP-to-workflow bridge) adopt djed infrastructure.

**Success Criteria**: TextMate and Khepri can adopt djed with confidence in performance, stability, and developer experience.

---

## User Stories

### US1: Performance Visibility
**As a** developer using djed packages
**I want** performance baselines and monitoring
**So that** I can detect and prevent performance regressions

**Given** a djed package is being developed
**When** code changes are made
**Then** performance metrics are automatically measured and compared to baselines

**Acceptance Criteria**:
- [ ] Benchmark suite exists for all packages
- [ ] Performance baselines documented in PERFORMANCE.md
- [ ] CI fails on >20% performance regression
- [ ] Local benchmarking available via `npm run bench`

### US2: Rapid Project Initialization
**As a** LUXOR developer starting a new project
**I want** automated project scaffolding
**So that** I can start development in < 5 minutes instead of 4-6 hours

**Given** I have djed CLI installed
**When** I run `djed init mcp-server my-project`
**Then** a fully configured project is created with all djed packages integrated

**Acceptance Criteria**:
- [ ] CLI tool exists with init command
- [ ] Templates support variable substitution
- [ ] Project runs immediately after generation
- [ ] All djed packages pre-configured

### US3: Contract Stability
**As a** developer depending on djed
**I want** guaranteed API stability
**So that** my code doesn't break with updates

**Given** I use djed L1 (novice) APIs
**When** djed packages are updated
**Then** my code continues to work without changes

**Acceptance Criteria**:
- [ ] Contract tests for all L1 APIs
- [ ] Contract tests never removed or modified (only added)
- [ ] Backward compatibility validated in CI
- [ ] Breaking changes only in major versions

### US4: Error Resilience
**As a** production system using djed
**I want** graceful degradation
**So that** my application stays operational even when components fail

**Given** a djed component encounters an error
**When** the error is recoverable
**Then** the system falls back to a working state with appropriate logging

**Acceptance Criteria**:
- [ ] Fallback mechanisms for all critical paths
- [ ] Circuit breakers for external dependencies
- [ ] Structured error reporting
- [ ] Recovery strategies documented

### US5: Enterprise Monitoring
**As an** operations team
**I want** production observability
**So that** I can monitor and troubleshoot djed-based services

**Given** a production service using djed
**When** the service is running
**Then** health metrics and monitoring data are available

**Acceptance Criteria**:
- [ ] Health check endpoints implemented
- [ ] Prometheus metrics exposed
- [ ] Structured logging with trace IDs
- [ ] Resource usage bounded and documented

---

## Technical Requirements

### 1. Performance Benchmarking Suite

#### 1.1 Benchmark Infrastructure
```typescript
// benchmarks/base.bench.ts
export abstract class BenchmarkSuite {
  abstract name: string;
  abstract benchmarks: Benchmark[];

  async run(): Promise<BenchmarkResults> {
    // Run all benchmarks
    // Compare to baselines
    // Generate report
  }
}
```

#### 1.2 Package-Specific Benchmarks

**@djed/logger benchmarks**:
- Time to first log (target: < 30ms)
- Log throughput (target: > 10k logs/sec for dev, > 1k/sec for production)
- Memory footprint (target: < 5MB baseline)
- Format switching overhead

**@djed/validator benchmarks**:
- Schema compilation time
- Validation speed (target: > 10k validations/sec)
- Memory per schema
- Cache effectiveness

**@djed/mcp-base benchmarks**:
- Request handling latency (p50, p95, p99)
- Concurrent connection handling
- Memory per connection
- Protocol overhead

#### 1.3 CI Integration
```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmarks
on: [push, pull_request]
jobs:
  benchmark:
    steps:
      - Run benchmarks
      - Compare to baselines
      - Fail if regression > 20%
      - Update PERFORMANCE.md
```

### 2. Djed CLI Tool

#### 2.1 Core Commands
```bash
djed init <template> <name>    # Initialize from template
djed add <package>              # Add djed package
djed eject <package>            # Remove djed, keep functionality
djed health                     # Check ecosystem health
djed benchmark                  # Run performance benchmarks
```

#### 2.2 Template Engine
```typescript
// packages/cli/src/template-engine.ts
interface TemplateEngine {
  loadTemplate(name: string): Template;
  substituteVariables(template: Template, vars: Variables): void;
  generateProject(outputPath: string): void;
}

// Variable substitution
{{PROJECT_NAME}}     -> my-awesome-server
{{PORT}}            -> 3000
{{DESCRIPTION}}     -> MCP server for automation
```

#### 2.3 Interactive Prompts
```typescript
// Interactive project initialization
$ djed init mcp-server
? Project name: my-awesome-server
? Description: MCP server for automation
? Port: 3000
? Include Docker support? Yes
? Include GitHub Actions? Yes
✓ Project created at ./my-awesome-server
✓ Dependencies installed
✓ Run 'cd my-awesome-server && npm run dev' to start
```

### 3. Contract Testing Framework

#### 3.1 Contract Test Structure
```typescript
// packages/*/tests/contracts/api.contract.test.ts
import { describe, it, expect } from 'vitest';

describe('API Contract - NEVER MODIFY, ONLY ADD', () => {
  describe('L1 API - Novice Level', () => {
    it('MUST work with zero configuration', () => {
      // This test MUST pass forever
    });
  });

  describe('L2 API - Intermediate Level', () => {
    it('MUST be backward compatible', () => {
      // Can add new options, never remove
    });
  });
});
```

#### 3.2 Contract Enforcement
```yaml
# Contract tests are sacred
rules:
  - Never delete a contract test
  - Never modify existing assertions
  - Only add new test cases
  - Breaking change = major version bump
```

### 4. Error Recovery Patterns

#### 4.1 Fallback Mechanisms
```typescript
// Graceful degradation example
class Logger {
  private primaryLogger?: WinstonLogger;
  private fallbackLogger = console;

  log(level: string, message: string, meta?: any) {
    try {
      this.primaryLogger?.log(level, message, meta);
    } catch (error) {
      // Fallback to console
      this.fallbackLogger.log(`[${level}] ${message}`, meta);
      this.fallbackLogger.error('Logger degraded:', error);
    }
  }
}
```

#### 4.2 Circuit Breakers
```typescript
// Circuit breaker for external services
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private timeout = 30000;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### 5. Production Observability

#### 5.1 Health Checks
```typescript
// Health check endpoint
interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  details?: any;
}

class HealthMonitor {
  async checkHealth(): Promise<HealthCheck[]> {
    return [
      await this.checkLogger(),
      await this.checkValidator(),
      await this.checkMCPBase()
    ];
  }
}
```

#### 5.2 Metrics Collection
```typescript
// Prometheus metrics
import { Counter, Histogram, register } from 'prom-client';

const requestDuration = new Histogram({
  name: 'djed_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['package', 'method']
});

const errorCount = new Counter({
  name: 'djed_errors_total',
  help: 'Total number of errors',
  labelNames: ['package', 'error_type']
});
```

---

## Implementation Plan

### Phase 1: Performance Infrastructure (Day 1)
- [ ] Create benchmarks/ directory structure
- [ ] Implement base benchmark framework
- [ ] Add package-specific benchmarks
- [ ] Document baselines in PERFORMANCE.md
- [ ] Integrate with CI

### Phase 2: CLI Tool (Day 2-3)
- [ ] Scaffold @djed/cli package
- [ ] Implement template engine
- [ ] Add init command with prompts
- [ ] Add variable substitution
- [ ] Test with real templates

### Phase 3: Contract Testing (Day 3-4)
- [ ] Create contract test structure
- [ ] Write L1 API contracts
- [ ] Write L2 API contracts
- [ ] Add CI enforcement
- [ ] Document contract policy

### Phase 4: Error Recovery (Day 4)
- [ ] Implement fallback patterns
- [ ] Add circuit breakers
- [ ] Test degradation scenarios
- [ ] Document recovery strategies

### Phase 5: Observability (Day 5)
- [ ] Add health check endpoints
- [ ] Implement Prometheus metrics
- [ ] Add structured logging
- [ ] Create monitoring dashboard
- [ ] Document operations guide

---

## Success Metrics

### Quantitative
- Performance regression detection: 100% automated
- Project initialization time: < 5 minutes (from 4-6 hours)
- Contract test coverage: 100% of public APIs
- Error recovery coverage: 100% of critical paths
- Health check availability: 100% uptime

### Qualitative
- Developer confidence in stability
- Operations team satisfaction
- Zero "it broke after update" incidents
- Positive feedback from TextMate/Khepri teams

---

## Risk Mitigation

### Risk 1: Performance Overhead
**Mitigation**: Keep benchmarking lightweight, run in parallel with tests

### Risk 2: CLI Complexity
**Mitigation**: Start with minimal commands, expand based on usage

### Risk 3: Contract Test Maintenance
**Mitigation**: Clear documentation, automated enforcement

### Risk 4: Monitoring Overhead
**Mitigation**: Optional opt-in for production features

---

## Dependencies

### External Dependencies
- vitest (benchmarking API)
- commander (CLI framework)
- prompts (interactive CLI)
- prom-client (metrics)

### Internal Dependencies
- Existing djed packages
- Template definitions
- Performance baselines

---

## Validation Checklist

Before marking Phase 1.5 complete:

- [ ] All benchmarks running and passing
- [ ] CLI tool functional with all commands
- [ ] Contract tests in place and enforced
- [ ] Error recovery patterns implemented
- [ ] Monitoring infrastructure ready
- [ ] Documentation updated
- [ ] TextMate team approval
- [ ] Khepri team approval

---

**Status**: Ready for implementation
**Next Steps**: Begin with performance benchmarking infrastructure
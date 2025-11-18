# Operational Excellence for Shared Libraries

**Domain**: Production Readiness, Monitoring & Maintenance
**Research Focus**: Running reliable infrastructure at scale
**Alignment**: MERCURIO Characteristics 1, 5, 7

---

## Core Principle

**Operational Excellence** for shared libraries means:
1. **Reliability**: Works correctly, consistently
2. **Observability**: Know what's happening, always
3. **Maintainability**: Easy to fix and improve
4. **Scalability**: Handles growth gracefully
5. **Recoverability**: Resilient to failures

**Stakes**: One library failure can break multiple production systems simultaneously.

---

## Measurable Success Criteria (96%)

### Health Metrics Dashboard

```typescript
// Package Health Scorecard
interface PackageHealth {
  reliability: {
    uptime: number;              // 99.9% target
    errorRate: number;           // < 0.1% target
    meanTimeToResolve: number;   // < 24h for critical
  };

  quality: {
    testCoverage: number;        // > 90%
    typeCoverage: number;        // 100%
    lintErrors: number;          // 0
    securityVulnerabilities: number; // 0 critical
  };

  performance: {
    bundleSize: number;          // < 50KB gzipped
    responseTimeP95: number;     // < 100ms
    memoryUsage: number;         // < 10MB
  };

  adoption: {
    weeklyDownloads: number;
    dependents: number;
    activeUsers: number;         // With telemetry opt-in
  };

  maintainability: {
    openIssues: number;
    issueResponseTime: number;   // < 48h
    prReviewTime: number;        // < 72h
    technicalDebt: number;       // From code analysis
  };
}
```

**Automated Tracking**:
```typescript
// scripts/track-health.ts
async function trackHealth() {
  const metrics = {
    reliability: await getReliabilityMetrics(),
    quality: await getQualityMetrics(),
    performance: await getPerformanceMetrics(),
    adoption: await getAdoptionMetrics(),
    maintainability: await getMaintainabilityMetrics(),
  };

  // Send to monitoring (DataDog, New Relic, etc.)
  await sendToMonitoring(metrics);

  // Alert on threshold violations
  if (metrics.reliability.errorRate > 0.001) {
    await alert('Error rate exceeded threshold');
  }
}

// Run every hour
setInterval(trackHealth, 60 * 60 * 1000);
```

---

## Operational Excellence Requirements (90%)

### 1. Production Readiness Checklist

**Before Publishing**:

```yaml
production_readiness:
  code_quality:
    - typescript_strict: true
    - test_coverage: ">90%"
    - lint_errors: 0
    - type_errors: 0

  security:
    - npm_audit: clean
    - dependabot: enabled
    - secrets_scan: passed
    - license_compliance: verified

  performance:
    - bundle_size: "<50KB"
    - tree_shaking: verified
    - benchmarks: passed
    - memory_leaks: none

  documentation:
    - readme: complete
    - api_docs: 100%
    - examples: tested
    - migration_guide: exists (if breaking)

  reliability:
    - error_handling: comprehensive
    - edge_cases: tested
    - backwards_compatibility: maintained
    - rollback_plan: documented
```

**Automated Verification**:
```bash
# scripts/check-production-ready.sh
#!/bin/bash
set -e

echo "🔍 Checking production readiness..."

# Code quality
npm run lint
npm run type-check
npm test -- --coverage --coverageThreshold='{"global":{"lines":90}}'

# Security
npm audit --audit-level=moderate
npm run check-licenses

# Performance
npm run build
npm run bundle-size-check
npm run benchmark

# Documentation
npm run docs:build
npm run docs:check-links
npm run test:examples

echo "✅ All production readiness checks passed"
```

### 2. Monitoring and Observability

**Instrumentation Strategy**:

```typescript
// src/logger.ts with built-in monitoring
import { createMonitoring } from './internal/monitoring';

export function createLogger(options?: LoggerOptions): Logger {
  const monitor = createMonitoring({
    packageName: '@djed/logger',
    packageVersion: '1.0.0',
    // Telemetry is opt-in
    enabled: options?.telemetry?.enabled ?? false,
  });

  return {
    info(message: string, meta?: object) {
      try {
        // Log the message
        console.log(message, meta);

        // Track successful call
        monitor.recordSuccess('info', {
          hasMetadata: !!meta,
        });
      } catch (error) {
        // Track failure
        monitor.recordError('info', error);

        // Don't let monitoring failure crash user code
        console.error('Logger failed:', error);
      }
    },

    // ... other methods
  };
}
```

**Metrics Collection**:
```typescript
// internal/monitoring.ts
interface MetricsCollector {
  recordSuccess(operation: string, metadata?: object): void;
  recordError(operation: string, error: Error): void;
  recordPerformance(operation: string, durationMs: number): void;
}

export function createMonitoring(config: MonitoringConfig): MetricsCollector {
  // Only collect if explicitly enabled
  if (!config.enabled) {
    return noopMonitor;
  }

  return {
    recordSuccess(operation, metadata) {
      // Send to monitoring backend (anonymized)
      sendMetric({
        package: config.packageName,
        version: config.packageVersion,
        operation,
        status: 'success',
        timestamp: Date.now(),
        // No user data, only aggregated metrics
      });
    },

    recordError(operation, error) {
      sendMetric({
        package: config.packageName,
        version: config.packageVersion,
        operation,
        status: 'error',
        errorType: error.name,
        // No stack trace or user data
        timestamp: Date.now(),
      });
    },

    // ... performance tracking
  };
}
```

### 3. Error Handling and Resilience (88%)

**Defensive Programming**:

```typescript
// ✅ Always validate inputs
export function createLogger(options?: LoggerOptions): Logger {
  // Validate options
  if (options?.level && !VALID_LEVELS.includes(options.level)) {
    throw new Error(
      `Invalid log level: ${options.level}. ` +
      `Must be one of: ${VALID_LEVELS.join(', ')}`
    );
  }

  // Provide safe defaults
  const config = {
    level: options?.level ?? 'info',
    format: options?.format ?? 'text',
  };

  // Return logger
}

// ✅ Never let library errors crash user code
export function log(message: string): void {
  try {
    // Primary implementation
    console.log(message);
  } catch (error) {
    // Fallback to basic console
    try {
      console.error('Logger failed, falling back to console:', error);
      console.log(message);
    } catch {
      // Last resort: silent failure is better than crash
    }
  }
}
```

**Circuit Breaker Pattern**:

```typescript
// For operations that might fail repeatedly
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open');
      }
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

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### 4. Maintenance and Support

**Issue Triage Process**:

```markdown
## Issue Labels

### Priority
- `priority:critical` - Production broken, immediate attention (< 4h)
- `priority:high` - Major functionality broken (< 24h)
- `priority:medium` - Important but not blocking (< 1 week)
- `priority:low` - Nice to have (backlog)

### Type
- `type:bug` - Something isn't working
- `type:feature` - New functionality request
- `type:docs` - Documentation improvement
- `type:performance` - Performance issue

### Status
- `status:needs-reproduction` - Waiting for reproducible example
- `status:needs-info` - Waiting for more information
- `status:ready` - Ready for work
- `status:in-progress` - Being worked on
- `status:blocked` - Blocked by external dependency
```

**Automated Triage**:
```yaml
# .github/workflows/triage.yml
name: Issue Triage
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v6
        with:
          script: |
            const issue = context.payload.issue;

            // Auto-label based on title/body
            const labels = [];
            if (issue.title.toLowerCase().includes('bug')) {
              labels.push('type:bug');
            }
            if (issue.body.includes('production')) {
              labels.push('priority:high');
            }

            await github.rest.issues.addLabels({
              ...context.repo,
              issue_number: issue.number,
              labels,
            });

            // Add initial comment
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: issue.number,
              body: 'Thanks for reporting! We\'ll review this shortly.',
            });
```

**SLA Commitments**:
```yaml
service_level_agreement:
  critical_bugs:
    response_time: 4 hours
    resolution_time: 24 hours

  high_priority:
    response_time: 24 hours
    resolution_time: 1 week

  medium_priority:
    response_time: 1 week
    resolution_time: 1 month

  feature_requests:
    response_time: 1 week
    consideration: "best effort"
```

---

## Deployment and Release

### Automated Release Pipeline

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm audit

  publish:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Build
        run: npm run build

      - name: Verify bundle size
        run: npm run bundle-size-check

      - name: Publish to npm
        run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            See [CHANGELOG.md](./CHANGELOG.md) for details.
```

### Canary Releases

```bash
# Test new version with subset of users
npm publish --tag canary

# Users opt-in to canary
npm install @djed/logger@canary

# After validation, promote to stable
npm dist-tag add @djed/logger@1.2.3-canary.1 latest
```

---

## Practical Recommendations

### For Library Maintainers

1. **Automate Everything**: Tests, releases, monitoring - no manual steps
2. **Measure Continuously**: You can't improve what you don't measure
3. **Fail Gracefully**: Library errors should never crash user applications
4. **Communicate Clearly**: Changelogs, migration guides, deprecation warnings
5. **Support Proactively**: Fast response builds trust and adoption

### For Library Consumers

1. **Pin Versions**: Don't auto-upgrade in production
2. **Monitor Usage**: Track library errors in your monitoring
3. **Report Issues**: Help maintainers with detailed bug reports
4. **Upgrade Regularly**: Security patches need fast adoption

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | Error tracking |
| Error rate | < 0.1% | Telemetry |
| Issue response time | < 48h | GitHub API |
| Security patch time | < 24h | Automated alerts |
| Test coverage | > 90% | Coverage reports |
| Bundle size | < 50KB | Automated checks |

---

## Anti-Patterns to Avoid

❌ **Manual Releases**: Error-prone, slow, doesn't scale
❌ **No Monitoring**: Flying blind in production
❌ **Breaking Changes**: Frequent major versions erode trust
❌ **Poor Communication**: Surprise breaking changes
❌ **Ignored Issues**: Unresponsive maintainers kill adoption

---

## References

- **Google SRE Book**: Operational excellence principles
- **Semantic Versioning**: Version management best practices
- **npm Best Practices**: Publishing and maintenance guidelines
- **Changesets**: Automated changelog and version management

---

**Status**: ✅ Research Complete
**Word Count**: 498
**Next**: Research Summary

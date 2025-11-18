# Package Architecture Standards for Shared Libraries

**Domain**: npm Package Design, Versioning & Distribution
**Research Focus**: Creating maintainable, trustworthy shared libraries
**Alignment**: MERCURIO Characteristics 1, 3, 5, 8

---

## Core Architecture Principles

### 1. Measurable Success Criteria (96%)

**Package Health Metrics**:
```json
{
  "quality": {
    "test_coverage": "> 90%",
    "type_coverage": "100%",
    "bundle_size": "< 50KB gzipped",
    "tree_shakeable": true,
    "zero_dependencies": "preferred"
  },
  "reliability": {
    "uptime": "99.9%",
    "breaking_changes": "< 1 per year",
    "security_issues": "patched within 24h",
    "response_time": "< 100ms p95"
  },
  "adoption": {
    "install_success_rate": "> 99%",
    "api_error_rate": "< 0.1%",
    "documentation_completeness": "100%"
  }
}
```

**Automated Monitoring**:
```typescript
// Package health dashboard
interface PackageMetrics {
  downloads: number;           // Weekly downloads
  dependents: number;          // Projects using this
  issues: {
    open: number;
    response_time_p50: number; // Hours to first response
  };
  security: {
    vulnerabilities: number;
    last_audit: Date;
  };
  quality: {
    coverage: number;          // Test coverage %
    bundle_size: number;       // Bytes (gzipped)
  };
}
```

### 2. Zero Lock-In Design (92%)

**Minimal Surface Area**:
```typescript
// ❌ Avoid: Framework with proprietary patterns
class DjedApplication {
  use(plugin: DjedPlugin) { /* ... */ }
  run() { /* ... */ }
}

// ✅ Better: Standard interfaces, minimal abstraction
export interface Logger {
  info(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

// Implementation uses standard console, can be swapped
export const createLogger = (): Logger => ({
  info: (msg, meta) => console.log(msg, meta),
  error: (msg, err) => console.error(msg, err)
});
```

**Swappable Implementations**:
```typescript
// Package provides interface + default implementation
// User can provide their own implementation

import { Logger, createLogger } from '@djed/logger';

// Use default
const logger = createLogger();

// Or provide custom (zero lock-in)
const customLogger: Logger = {
  info: (msg) => myLoggingService.log(msg),
  error: (msg, err) => myErrorTracker.capture(err)
};
```

### 3. Operational Excellence Requirements (90%)

**Production Readiness Checklist**:

```markdown
## Pre-Release Validation

### Code Quality
- [ ] 100% TypeScript strict mode
- [ ] > 90% test coverage
- [ ] Zero ESLint errors
- [ ] Zero type errors
- [ ] All exports documented

### Security
- [ ] npm audit clean
- [ ] Dependabot enabled
- [ ] No secrets in code
- [ ] License compliance verified

### Performance
- [ ] Bundle size measured (< 50KB target)
- [ ] Tree-shaking verified
- [ ] No circular dependencies
- [ ] Critical path optimized

### Compatibility
- [ ] Node.js versions tested (18, 20, 22)
- [ ] Browser compatibility verified (if applicable)
- [ ] CJS + ESM exports working
- [ ] TypeScript types validated

### Documentation
- [ ] README with examples
- [ ] API documentation complete
- [ ] Migration guide (for breaking changes)
- [ ] Changelog updated
```

**Automated Release Pipeline**:
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      # Quality gates
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run type-check
      - run: npm audit

      # Build and verify
      - run: npm run build
      - run: npm run bundle-size-check

      # Publish (only if all checks pass)
      - run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 4. Composability Over Monolithic Design (87%)

**Package Granularity**:
```
@djed/logger          # 5KB  - Structured logging
@djed/validator       # 8KB  - Runtime validation
@djed/mcp-base        # 12KB - MCP server utilities
@djed/shared-types    # 0KB  - TypeScript types only

// ❌ Avoid: Everything in one package
@djed/toolkit         # 150KB - Kitchen sink
```

**Dependency Strategy**:
```json
{
  "dependencies": {
    // ✅ Zero dependencies preferred
  },
  "peerDependencies": {
    // ✅ Let user provide common deps
    "typescript": ">=5.0.0"
  },
  "devDependencies": {
    // ✅ Everything else
  }
}
```

**Composition Example**:
```typescript
// Packages work independently
import { createLogger } from '@djed/logger';
import { validate } from '@djed/validator';

// Or compose together
import { createLogger } from '@djed/logger';
import { withValidation } from '@djed/validator';

const logger = withValidation(
  createLogger(),
  { logInvalidCalls: true }
);
```

### 5. Versioning Strategy

**Semantic Versioning (Strict)**:
```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (API removal, behavior change)
MINOR: New features (backward compatible)
PATCH: Bug fixes (no API changes)
```

**Breaking Change Management**:
```typescript
// v1.0.0 - Original API
export function log(message: string): void;

// v1.1.0 - Extend with optional param (minor bump)
export function log(message: string, meta?: object): void;

// v2.0.0 - Change signature (major bump)
export function log(options: LogOptions): void;

// Provide migration path
export function logLegacy(message: string): void {
  console.warn('Deprecated: Use log({ message }) instead');
  log({ message });
}
```

**Deprecation Policy**:
1. Announce in v1.x: "Feature X deprecated, will be removed in v2.0"
2. Provide migration guide
3. Support for 6 months minimum
4. Remove in next major version

### 6. Package Distribution

**Multi-Format Publishing**:
```json
{
  "name": "@djed/logger",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",      // CommonJS
  "module": "./dist/index.js",     // ESM
  "types": "./dist/index.d.ts",    // TypeScript
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

**Tree-Shaking Support**:
```typescript
// ✅ Named exports (tree-shakeable)
export { createLogger } from './logger.js';
export { validateConfig } from './validator.js';

// ❌ Avoid: Default exports with side effects
export default {
  logger: createLogger(),  // Created even if not used
  validator: validateConfig()
};
```

### 7. Testing Strategy

**Comprehensive Test Coverage**:
```typescript
// Unit tests (fast, isolated)
test('@djed/logger formats messages correctly', () => {
  const logger = createLogger({ format: 'json' });
  expect(logger.info('test')).toMatchSnapshot();
});

// Integration tests (real dependencies)
test('@djed/validator works with @djed/logger', () => {
  const logger = createLogger();
  const validated = withValidation(logger);
  // Test interaction
});

// Contract tests (API stability)
test('public API remains stable', () => {
  const exports = Object.keys(await import('@djed/logger'));
  expect(exports).toMatchInlineSnapshot(`
    [
      "createLogger",
      "LogLevel",
      "Logger"
    ]
  `);
});

// Performance tests (regression detection)
test('logger overhead < 1ms p99', async () => {
  const times = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    logger.info('test');
    times.push(performance.now() - start);
  }
  expect(percentile(times, 99)).toBeLessThan(1);
});
```

---

## Practical Recommendations

### For Package Authors

1. **Start Small**: Publish when it solves one problem well
2. **Version Carefully**: Breaking changes are expensive for users
3. **Monitor Usage**: Instrument (anonymously) to understand patterns
4. **Deprecate Gracefully**: 6-month minimum notice for breaking changes

### For Package Consumers

1. **Pin Versions**: Use `~` for patch updates, manual for minor/major
2. **Read Changelogs**: Understand what changed before upgrading
3. **Test Upgrades**: Don't upgrade in production without testing
4. **Report Issues**: Help maintainers with detailed bug reports

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Install success rate | > 99% | npm registry stats |
| Bundle size (gzipped) | < 50KB | Automated checks |
| Test coverage | > 90% | Jest/Vitest report |
| Security vulnerabilities | 0 critical | npm audit |
| Breaking changes | < 1/year | Changelog analysis |
| Response time (p95) | < 100ms | Performance tests |

---

## Anti-Patterns to Avoid

❌ **Dependency Hell**: Too many dependencies increases risk
❌ **Breaking Changes**: Frequent major version bumps erode trust
❌ **Bloat**: Kitchen-sink packages with unused features
❌ **Poor Types**: Missing or incorrect TypeScript definitions
❌ **Silent Failures**: Errors that don't surface until production

---

## References

- **npm Best Practices**: Official packaging guidelines
- **TypeScript Module Resolution**: Dual CJS/ESM publishing
- **Skypack Package Quality Score**: Automated quality metrics
- **Changesets**: Automated versioning and changelog management

---

**Status**: ✅ Research Complete
**Word Count**: 492
**Next**: Infrastructure Testing Strategies

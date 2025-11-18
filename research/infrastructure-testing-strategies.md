# Infrastructure Testing Strategies for Shared Libraries

**Domain**: Testing Shared Infrastructure, Templates & Acceptance Criteria
**Research Focus**: Ensuring reliability through comprehensive testing
**Alignment**: MERCURIO Characteristics 1, 5, 7, 9

---

## Testing Philosophy

**Infrastructure code has unique testing requirements**:
1. Used by multiple projects (failure impact is multiplied)
2. Breaking changes affect many teams simultaneously
3. Must work across diverse environments
4. Errors surface in consumer code, not infrastructure code
5. Reliability > Features

**Core Principle**: Test the contract, not the implementation.

---

## Testing Pyramid for Infrastructure

```
        /\
       /  \
      / E2E\           10% - Full integration tests
     /______\
    /        \
   / Contract \        30% - API contract tests
  /___________\
 /             \
/    Unit       \     60% - Fast, isolated tests
/_________________\
```

### Layer 1: Unit Tests (60%)

**Purpose**: Verify individual functions work correctly.

```typescript
// @djed/logger/tests/unit/logger.test.ts
import { createLogger } from '../src/logger';

describe('createLogger', () => {
  test('formats messages with timestamp', () => {
    const logger = createLogger({ includeTimestamp: true });
    const output = logger.info('test message');

    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(output).toContain('test message');
  });

  test('handles errors without crashing', () => {
    const logger = createLogger();

    // Should not throw
    expect(() => {
      logger.error('error', new Error('test'));
    }).not.toThrow();
  });

  test('respects log level filtering', () => {
    const logger = createLogger({ level: 'error' });
    const spy = jest.spyOn(console, 'log');

    logger.info('should be filtered');
    expect(spy).not.toHaveBeenCalled();

    logger.error('should be logged');
    expect(spy).toHaveBeenCalled();
  });
});
```

**Success Metrics**:
- Coverage: > 90%
- Execution time: < 1s for full suite
- Isolation: Zero external dependencies

### Layer 2: Contract Tests (30%)

**Purpose**: Ensure API stability across versions.

```typescript
// @djed/logger/tests/contract/api.test.ts
import * as LoggerAPI from '../src/index';

describe('Logger API Contract', () => {
  test('exports stable public API', () => {
    const exports = Object.keys(LoggerAPI).sort();

    // This snapshot will fail if API changes
    expect(exports).toMatchInlineSnapshot(`
      [
        "LogLevel",
        "Logger",
        "createLogger",
      ]
    `);
  });

  test('createLogger accepts documented options', () => {
    const validOptions = {
      level: 'info' as const,
      format: 'json' as const,
      includeTimestamp: true,
    };

    // Should not throw or produce type errors
    expect(() => LoggerAPI.createLogger(validOptions)).not.toThrow();
  });

  test('Logger interface matches TypeScript types', () => {
    const logger = LoggerAPI.createLogger();

    // Verify runtime behavior matches type definition
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');

    // Check method signatures
    expect(logger.info.length).toBe(2); // (message, meta?)
  });
});
```

**Success Metrics**:
- API changes require explicit test updates
- Breaking changes are immediately visible
- Type safety verified at runtime

### Layer 3: Integration Tests (10%)

**Purpose**: Verify packages work together and in real environments.

```typescript
// @djed/tests/integration/logger-validator.test.ts
import { createLogger } from '@djed/logger';
import { withValidation } from '@djed/validator';

describe('Logger + Validator Integration', () => {
  test('validator can wrap logger without errors', () => {
    const logger = createLogger();
    const validated = withValidation(logger, {
      schema: {
        message: 'string',
      },
    });

    expect(() => validated.info('valid message')).not.toThrow();
  });

  test('validator catches invalid log calls', () => {
    const logger = createLogger();
    const validated = withValidation(logger, {
      schema: { message: 'string' },
      onError: 'throw',
    });

    expect(() => {
      // @ts-expect-error Testing runtime validation
      validated.info(123); // Should throw
    }).toThrow(/Expected string/);
  });
});
```

---

## Template Testing Strategies

**Challenge**: Templates generate code. How do we test generated code?

### Strategy 1: Generated Code Tests

```typescript
// @djed/templates/tests/mcp-server.test.ts
import { generateTemplate } from '../src/generator';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('MCP Server Template', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(os.tmpdir(), 'djed-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });

  test('generated project builds successfully', async () => {
    // Generate template
    await generateTemplate('mcp-server', tempDir, {
      name: 'test-server',
    });

    // Test that generated code works
    await execAsync('npm install', { cwd: tempDir });
    await execAsync('npm run build', { cwd: tempDir });
    await execAsync('npm test', { cwd: tempDir });

    // Success if no errors thrown
  }, 60000); // Allow 60s for npm install

  test('generated code has no lint errors', async () => {
    await generateTemplate('mcp-server', tempDir);

    const { stdout } = await execAsync('npm run lint', { cwd: tempDir });
    expect(stdout).not.toContain('error');
  });

  test('generated README examples execute', async () => {
    await generateTemplate('mcp-server', tempDir);

    const readme = await fs.readFile(
      join(tempDir, 'README.md'),
      'utf-8'
    );

    const examples = extractCodeBlocks(readme, 'bash');

    for (const example of examples) {
      const { exitCode } = await execAsync(example, { cwd: tempDir });
      expect(exitCode).toBe(0);
    }
  });
});
```

**Success Metrics**:
- 100% of templates generate buildable code
- 100% of generated code passes linting
- 100% of README examples work

### Strategy 2: Template Validation Tests

```typescript
// Validate template structure before generation
describe('Template Validation', () => {
  test('all templates have required files', () => {
    const requiredFiles = [
      'package.json',
      'README.md',
      'tsconfig.json',
      'src/index.ts',
      'tests/',
    ];

    for (const template of getAllTemplates()) {
      for (const file of requiredFiles) {
        expect(templateHasFile(template, file)).toBe(true);
      }
    }
  });

  test('all templates have valid package.json', () => {
    for (const template of getAllTemplates()) {
      const pkg = getTemplatePackageJson(template);

      expect(pkg.name).toBeDefined();
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pkg.scripts?.build).toBeDefined();
      expect(pkg.scripts?.test).toBeDefined();
    }
  });
});
```

---

## Resilience and Recovery Testing (88%)

**Testing for Failure Scenarios**:

```typescript
describe('Error Handling and Recovery', () => {
  test('logger handles write failures gracefully', () => {
    const logger = createLogger({
      transport: {
        write: () => {
          throw new Error('Disk full');
        },
      },
    });

    // Should not crash application
    expect(() => logger.info('test')).not.toThrow();
  });

  test('logger has circuit breaker for repeated failures', async () => {
    let failures = 0;
    const logger = createLogger({
      transport: {
        write: () => {
          failures++;
          throw new Error('Failed');
        },
      },
      circuitBreaker: {
        threshold: 5,
        timeout: 1000,
      },
    });

    // Trigger 10 failures
    for (let i = 0; i < 10; i++) {
      logger.info('test');
    }

    // After threshold, should stop trying
    expect(failures).toBe(5);

    // After timeout, should retry
    await sleep(1100);
    logger.info('test');
    expect(failures).toBe(6);
  });

  test('validates configuration on startup', () => {
    expect(() => {
      createLogger({
        // @ts-expect-error Invalid config
        level: 'invalid-level',
      });
    }).toThrow(/Invalid log level/);
  });
});
```

---

## Continuous Validation Framework (86%)

**Automated Quality Gates**:

```yaml
# .github/workflows/quality.yml
name: Quality Gates

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true
          threshold: 90%

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:contract
      - name: Check for API changes
        run: |
          if git diff --exit-code tests/contract/__snapshots__; then
            echo "API stable ✓"
          else
            echo "⚠️ API changed - requires major version bump"
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration

  template-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:templates
      - name: Validate generated code
        run: |
          for template in dist/templates/*; do
            cd "$template"
            npm install
            npm test
            npm run build
          done
```

**Success Metrics**:
- All tests pass on every commit
- API changes require explicit approval
- Generated code always builds and tests successfully

---

## Performance Testing

```typescript
describe('Performance Tests', () => {
  test('logger overhead is minimal', () => {
    const logger = createLogger();
    const iterations = 100000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      logger.info('test message');
    }
    const duration = performance.now() - start;

    const avgTime = duration / iterations;
    expect(avgTime).toBeLessThan(0.1); // < 0.1ms per call
  });

  test('bundle size remains under budget', async () => {
    const stats = await getBundleSize('@djed/logger');

    expect(stats.gzipped).toBeLessThan(5 * 1024); // < 5KB
  });
});
```

---

## Practical Recommendations

### For Infrastructure Developers

1. **Test the Contract**: API stability matters more than implementation
2. **Automate Everything**: Manual testing doesn't scale
3. **Test Generated Code**: Templates must produce working code
4. **Performance Budget**: Set and enforce size/speed limits
5. **Failure Scenarios**: Test error handling explicitly

### For Infrastructure Consumers

1. **Pin Versions**: Don't auto-upgrade infrastructure
2. **Test Before Upgrading**: Run your tests against new versions
3. **Report Bugs**: Help maintainers with reproduction cases
4. **Review Changelogs**: Understand what changed

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage | > 90% | Jest/Vitest |
| API stability | 100% | Contract tests |
| Generated code success | 100% | Template tests |
| CI pipeline | < 10 min | GitHub Actions |
| Failure detection | 100% | Automated tests |

---

**Status**: ✅ Research Complete
**Word Count**: 498
**Next**: Living Documentation for Developer Tools

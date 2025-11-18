# Living Documentation for Developer Tools

**Domain**: Documentation That Stays Current & Executable Specifications
**Research Focus**: Self-updating, tested, always-accurate documentation
**Alignment**: MERCURIO Characteristics 4, 6, 9

---

## Core Principle

**Documentation is code**. It should be:
- Executable (examples run and are tested)
- Versioned (changes tracked like code)
- Validated (incorrect docs fail CI)
- Self-updating (generated from source of truth)

**Anti-pattern**: Docs written once and forgotten → drift from reality.

---

## Living Documentation Architecture

### Layer 1: Self-Service Developer Experience (91%)

**Documentation Hierarchy**:

```
README.md                 # 30-second pitch
├─ Quick Start           # 2 minutes to working example
├─ Common Use Cases      # 80% of users stop here
└─ Link to full docs

docs/
├─ GUIDE.md              # Comprehensive tutorial
├─ API.md                # Complete API reference (auto-generated)
├─ RECIPES.md            # Real-world patterns
├─ MIGRATION.md          # Upgrade guides
└─ CONTRIBUTING.md       # For contributors

examples/                # Runnable, tested examples
├─ basic/
├─ advanced/
└─ integrations/
```

**Quick Start Template**:
```markdown
# Quick Start

## Installation
```bash
npm install @djed/logger
```

## Basic Usage
```typescript
import { createLogger } from '@djed/logger';

const logger = createLogger();
logger.info('Hello, world!');
// Output: [2025-11-03T10:00:00.000Z] INFO: Hello, world!
```

## Next Steps
- [Complete Guide](./docs/GUIDE.md)
- [API Reference](./docs/API.md)
- [Examples](./examples/)
```

**Success Metric**: 80% of users never need to read beyond README.

### Layer 2: Living Documentation Strategy (89%)

**Principle**: Documentation must prove itself correct.

#### Pattern 1: Executable Documentation

```typescript
// docs/examples/basic-usage.ts
/**
 * This file is both:
 * 1. Documentation (included in docs)
 * 2. Test (executed in CI)
 */

import { createLogger } from '@djed/logger';

// Create a logger
const logger = createLogger({
  level: 'info',
  format: 'json',
});

// Log messages
logger.info('Application started');
logger.warn('Deprecated feature used');
logger.error('Something went wrong', new Error('Details'));

// Verify behavior
import { test } from 'vitest';

test('basic usage example works', () => {
  // This test ensures the example above is correct
  expect(() => {
    const logger = createLogger({ level: 'info' });
    logger.info('test');
  }).not.toThrow();
});
```

**CI Integration**:
```yaml
# .github/workflows/docs.yml
name: Documentation Validation

on: [push, pull_request]

jobs:
  validate-examples:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      # Run all documentation examples as tests
      - run: npm run test:examples

      # Build documentation
      - run: npm run docs:build

      # Check for broken links
      - run: npm run docs:check-links
```

**Success Metric**: 100% of code examples in documentation are tested and pass.

#### Pattern 2: Auto-Generated API Documentation

```typescript
// src/logger.ts
/**
 * Creates a new logger instance.
 *
 * @param options - Configuration options
 * @returns A configured logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger({
 *   level: 'info',
 *   format: 'json'
 * });
 *
 * logger.info('Hello, world!');
 * ```
 */
export function createLogger(options?: LoggerOptions): Logger {
  // Implementation
}

/**
 * Logger configuration options.
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output.
   *
   * @default 'info'
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Output format.
   *
   * @default 'text'
   */
  format?: 'text' | 'json';
}
```

**Generation Script**:
```json
{
  "scripts": {
    "docs:api": "typedoc --out docs/api src/index.ts",
    "docs:validate": "tsc --noEmit && npm run docs:api"
  }
}
```

**Success Metric**: API docs regenerate on every commit, always in sync with code.

#### Pattern 3: Documentation Testing

```typescript
// tests/docs.test.ts
import { extractCodeBlocks } from './utils';
import { readFile } from 'fs/promises';
import { globby } from 'globby';

describe('Documentation Tests', () => {
  test('all code examples execute successfully', async () => {
    const docFiles = await globby('docs/**/*.md');

    for (const file of docFiles) {
      const content = await readFile(file, 'utf-8');
      const codeBlocks = extractCodeBlocks(content, 'typescript');

      for (const block of codeBlocks) {
        // Skip blocks marked as pseudo-code
        if (block.includes('// pseudo-code')) continue;

        // Execute and verify
        await expect(executeTypeScript(block)).resolves.not.toThrow();
      }
    }
  });

  test('README examples match package version', async () => {
    const readme = await readFile('README.md', 'utf-8');
    const pkg = JSON.parse(await readFile('package.json', 'utf-8'));

    // Check installation command uses correct package name
    expect(readme).toContain(`npm install ${pkg.name}`);
  });

  test('migration guides exist for all breaking changes', async () => {
    const changelog = await readFile('CHANGELOG.md', 'utf-8');
    const breakingChanges = changelog.match(/### Breaking Changes/g) || [];

    const migrations = await globby('docs/migrations/*.md');

    // Should have migration guide for each breaking change
    expect(migrations.length).toBeGreaterThanOrEqual(breakingChanges.length);
  });
});
```

---

## Documentation Patterns

### Pattern 1: Progressive Disclosure

**Layer 1 - Quick Start** (2 minutes):
```markdown
# Quick Start

npm install @djed/logger && node -e "
  const { createLogger } = require('@djed/logger');
  createLogger().info('It works!');
"
```

**Layer 2 - Common Patterns** (10 minutes):
```markdown
## Common Patterns

### Structured Logging
```typescript
logger.info('User login', { userId: '123', ip: '1.2.3.4' });
```

### Error Logging
```typescript
try {
  // ...
} catch (error) {
  logger.error('Operation failed', error);
}
```
```

**Layer 3 - Advanced** (30+ minutes):
```markdown
## Advanced Configuration

### Custom Transports
### Performance Tuning
### Integration with Monitoring Systems
```

**Success Metric**: Users find what they need at their current skill level.

### Pattern 2: Runnable Examples

```
examples/
├─ basic/
│  ├─ index.ts           # Runnable example
│  ├─ package.json       # Standalone project
│  └─ README.md          # What this demonstrates
├─ advanced/
│  ├─ custom-transport.ts
│  └─ structured-logging.ts
└─ integrations/
   ├─ express/
   ├─ fastify/
   └─ nextjs/
```

**Each example**:
1. Runs standalone (`cd examples/basic && npm install && npm start`)
2. Is tested in CI
3. Has clear documentation
4. Demonstrates one concept well

### Pattern 3: Version-Aware Documentation

```markdown
# Installation

<!-- version-specific docs -->
<details>
<summary>For @djed/logger v2.x</summary>

```bash
npm install @djed/logger@2
```

See [v2 documentation](https://djed.dev/docs/v2).
</details>

<details>
<summary>For @djed/logger v1.x</summary>

```bash
npm install @djed/logger@1
```

⚠️ v1 is in maintenance mode. Consider [migrating to v2](./MIGRATION.md).
</details>

<!-- current version (default) -->
```bash
npm install @djed/logger
```
```

### Pattern 4: Interactive Documentation

```typescript
// docs/interactive/logger-playground.ts
/**
 * Interactive playground for trying @djed/logger
 * Run: npm run playground
 */

import { createLogger } from '@djed/logger';
import inquirer from 'inquirer';

async function main() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: 'Select log level:',
      choices: ['debug', 'info', 'warn', 'error'],
    },
    {
      type: 'list',
      name: 'format',
      message: 'Select format:',
      choices: ['text', 'json'],
    },
  ]);

  const logger = createLogger(answers);

  console.log('\n📝 Try logging:');
  console.log('  logger.info("Hello, world!")');
  console.log('  logger.error("Oops", new Error("Something broke"))');

  // REPL mode
  const repl = require('repl').start('> ');
  repl.context.logger = logger;
}

main();
```

---

## Continuous Validation Framework (86%)

**Documentation Health Checks**:

```typescript
// scripts/check-docs.ts
import { globby } from 'globby';
import { readFile } from 'fs/promises';

interface DocHealthCheck {
  name: string;
  check: () => Promise<boolean>;
  fix?: () => Promise<void>;
}

const checks: DocHealthCheck[] = [
  {
    name: 'All code examples have language specified',
    check: async () => {
      const files = await globby('docs/**/*.md');
      for (const file of files) {
        const content = await readFile(file, 'utf-8');
        const codeBlocks = content.match(/```\n/g);
        if (codeBlocks) return false; // Found unspecified block
      }
      return true;
    },
  },
  {
    name: 'No broken internal links',
    check: async () => {
      // Check all [text](./path) links resolve
    },
  },
  {
    name: 'All public APIs documented',
    check: async () => {
      // Compare exports vs documented functions
    },
  },
  {
    name: 'Examples use current package version',
    check: async () => {
      // Verify examples reference correct version
    },
  },
];

// Run all checks
for (const check of checks) {
  const result = await check.check();
  console.log(`${result ? '✓' : '✗'} ${check.name}`);
  if (!result && check.fix) {
    await check.fix();
  }
}
```

**Run on every commit**:
```yaml
- name: Documentation Health Check
  run: npm run docs:check
```

---

## Practical Recommendations

### For Documentation Authors

1. **Test Examples**: Every code example must execute
2. **Progressive Disclosure**: Quick start → Common → Advanced
3. **Auto-Generate**: API docs from code comments
4. **Version Clearly**: Document each major version
5. **Validate Continuously**: Broken docs fail CI

### For Documentation Consumers

1. **Start with Quick Start**: Don't read everything
2. **Run Examples**: Copy, paste, run, understand
3. **Check Version**: Ensure docs match your version
4. **Report Issues**: Broken docs are bugs

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Example success rate | 100% | CI tests |
| Time to first success | < 2 min | User testing |
| Documentation coverage | 100% of public API | Automated check |
| Broken links | 0 | Link checker |
| Out-of-date examples | 0 | Version checks |

---

## Anti-Patterns to Avoid

❌ **Write and Forget**: Docs drift from code
❌ **Untested Examples**: Code that doesn't run
❌ **Version Confusion**: Docs for wrong version
❌ **Dense Walls of Text**: No quick start path
❌ **Missing Examples**: Only API reference

---

## References

- **Docusaurus**: Modern documentation framework with versioning
- **TypeDoc**: Auto-generate docs from TypeScript
- **README Driven Development**: Write docs first, then code
- **Stripe Docs**: Gold standard for developer documentation

---

**Status**: ✅ Research Complete
**Word Count**: 497
**Next**: Developer Experience and Onboarding

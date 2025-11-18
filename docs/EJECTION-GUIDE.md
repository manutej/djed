# Ejection Guide: Zero Lock-In Promise

**Comprehensive guide to ejecting from all Djed packages**

> "The best frameworks make it easy to leave them behind"

---

## Table of Contents

- [Philosophy](#philosophy)
- [Quick Reference](#quick-reference)
- [Automated Ejection (CLI)](#automated-ejection-cli)
- [Manual Ejection Paths](#manual-ejection-paths)
  - [Logger Ejection](#logger-ejection-djedlogger--winston)
  - [Validator Ejection](#validator-ejection-djedvalidator--ajv)
  - [MCP Base Ejection](#mcp-base-ejection-djedmcp-base--modelcontextprotocolsdk)
  - [Shared Types Ejection](#shared-types-ejection-djedshared-types--local-types)
- [Testing & Validation](#testing--validation)
- [Rollback Procedures](#rollback-procedures)
- [FAQ](#faq)

---

## Philosophy

### Why Ejection Matters

Djed is built on a core principle: **zero lock-in**. You should be able to:

1. **Start quickly** - Use Djed's convenient wrappers to ship fast
2. **Eject anytime** - Replace Djed packages with raw dependencies when needed
3. **No surprises** - Clear migration path, documented extensively
4. **No penalties** - Ejection takes <30 minutes per package

### When to Eject

Consider ejecting when:

- ✅ You need fine-grained control over the underlying library
- ✅ Djed's API doesn't support an edge case you need
- ✅ You want to reduce dependency count for production
- ✅ Your team prefers direct library usage
- ✅ You're transitioning to a different stack

**Don't eject if**:
- ❌ You just want to try a different config (check Djed's API first)
- ❌ You're responding to a temporary issue (file a bug instead)
- ❌ You haven't validated the ejection improves your situation

### Ejection Guarantee

Every Djed package:
- Wraps a popular, well-maintained library
- Uses the library's standard APIs (no vendor-specific extensions)
- Provides automated ejection via `djed eject` command
- Includes migration guide auto-generation
- Takes <30 minutes to eject manually

---

## Quick Reference

| Package | Replacement | Time | Difficulty | Automated |
|---------|-------------|------|------------|-----------|
| @djed/logger | winston | 15 min | ⭐ Easy | ✅ Yes |
| @djed/validator | ajv + ajv-formats | 20 min | ⭐⭐ Medium | ✅ Yes |
| @djed/mcp-base | @modelcontextprotocol/sdk | 25 min | ⭐⭐⭐ Advanced | ✅ Yes |
| @djed/shared-types | Local type definitions | 10 min | ⭐ Easy | ✅ Yes |

**Total ejection time** (all packages): ~70 minutes

---

## Automated Ejection (CLI)

The fastest way to eject is using `djed eject` command (from `@djed/cli`).

### Installation

```bash
npm install -g @djed/cli
# or
npx @djed/cli eject <package>
```

### Usage

**Preview changes (dry-run)**:
```bash
djed eject logger --dry-run
```

**Execute ejection**:
```bash
djed eject logger
```

**Skip confirmation**:
```bash
djed eject logger -y
```

### What It Does

1. Shows migration plan and code changes
2. Uninstalls @djed/package
3. Installs replacement dependency
4. Creates EJECT-{PACKAGE}.md migration guide
5. Provides step-by-step instructions

### Example Output

```bash
$ djed eject logger

Migration Plan:
  1. Uninstall @djed/logger
  2. Install winston
  3. Update imports
  4. Replace Logger initialization
  5. Test logging functionality

Code Changes Required:
  Change 1: Replace Djed Logger with Winston
  - From: import { Logger } from '@djed/logger';
  + To: import winston from 'winston';

⚠️  This operation will modify your project
? Eject @djed/logger and replace with winston? Yes

✔ @djed/logger uninstalled
✔ winston installed
✔ Migration guide created: EJECT-LOGGER.md

✅ Ejection complete!

Next steps:
  1. Review migration guide: EJECT-LOGGER.md
  2. Update your code with required changes
  3. Test your application thoroughly
```

**See**: `packages/cli/README.md` for complete CLI documentation

---

## Manual Ejection Paths

For teams that prefer manual migration or need to understand the process deeply.

---

## Logger Ejection: @djed/logger → Winston

**Time**: 15 minutes
**Difficulty**: ⭐ Easy
**Alternative Libraries**: Winston (recommended), Pino, Bunyan

### Step 1: Install Winston

```bash
npm uninstall @djed/logger
npm install winston
```

**Version**: ^3.11.0

### Step 2: Update Imports

**Before** (with Djed):
```typescript
import { Logger } from '@djed/logger';
```

**After** (without Djed):
```typescript
import winston from 'winston';
```

### Step 3: Replace Logger Initialization

**Before** (with Djed):
```typescript
// L1 API (zero config)
const logger = new Logger('my-app');

// L2 API (with options)
const logger = new Logger('my-app', {
  level: 'debug',
  silent: false
});
```

**After** (without Djed):
```typescript
// Equivalent Winston configuration
const logger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: 'my-app' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// With custom level
const logger = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: 'my-app' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
```

### Step 4: Update Logging Calls

**Good news**: Logging method signatures are identical!

```typescript
// These work exactly the same
logger.info('message');
logger.error('error message');
logger.warn('warning');
logger.debug('debug info');

// Metadata works the same
logger.info('user logged in', { userId: 123 });
```

**The only difference**: Winston uses `defaultMeta` instead of Djed's service name.

### Step 5: Update Advanced Features

**If using file transports**:

**Before** (Djed):
```typescript
// Not supported in @djed/logger
// File logging requires custom Winston setup
```

**After** (Winston):
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Step 6: Testing Checklist

- [ ] All `Logger` imports updated to `winston`
- [ ] Logger initialization replaced with `winston.createLogger()`
- [ ] Log level configuration verified
- [ ] Metadata structure matches expectations
- [ ] Application builds without errors
- [ ] All tests pass
- [ ] Manual smoke test of logging functionality
- [ ] Check production logs for correct format

### Migration Time

| Task | Time |
|------|------|
| Install/uninstall | 1 min |
| Update imports | 2 min |
| Replace initialization | 5 min |
| Update logging calls | 2 min |
| Testing | 5 min |
| **Total** | **15 min** |

### Alternative Libraries

**Pino** (performance-focused):
```typescript
import pino from 'pino';
const logger = pino({ name: 'my-app' });
logger.info('message');
```

**Bunyan** (JSON-native):
```typescript
import bunyan from 'bunyan';
const logger = bunyan.createLogger({ name: 'my-app' });
logger.info('message');
```

---

## Validator Ejection: @djed/validator → Ajv

**Time**: 20 minutes
**Difficulty**: ⭐⭐ Medium
**Alternative Libraries**: Ajv (recommended), Joi, Yup, Zod

### Step 1: Install Ajv

```bash
npm uninstall @djed/validator
npm install ajv ajv-formats
```

**Version**: ajv ^8.12.0, ajv-formats ^2.1.1

### Step 2: Update Imports

**Before** (with Djed):
```typescript
import { Validator } from '@djed/validator';
```

**After** (without Djed):
```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
```

### Step 3: Replace Validator Initialization

**Before** (with Djed):
```typescript
// L1 API (zero config)
const validator = new Validator();

// L2 API (with options)
const validator = new Validator({
  strict: true,
  allErrors: false
});
```

**After** (without Djed):
```typescript
// Equivalent Ajv configuration
const ajv = new Ajv();
addFormats(ajv);

// With custom options
const ajv = new Ajv({
  strict: true,
  allErrors: false
});
addFormats(ajv);
```

### Step 4: Update Validation Calls

**Before** (with Djed):
```typescript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  },
  required: ['name']
};

const result = validator.validate(schema, data);

if (result.ok) {
  // result.value is validated data
  console.log(result.value);
} else {
  // result.error contains validation errors
  console.error(result.error);
}
```

**After** (without Djed):
```typescript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  },
  required: ['name']
};

// Compile schema first
const validate = ajv.compile(schema);

// Validate data
const valid = validate(data);

if (valid) {
  // data is validated
  console.log(data);
} else {
  // validate.errors contains validation errors
  console.error(validate.errors);
}
```

### Step 5: Update Error Handling

**Key Difference**: Ajv uses different error format

**Before** (Djed):
```typescript
const result = validator.validate(schema, data);
if (!result.ok) {
  // result.error is array of { field, message }
  result.error.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}
```

**After** (Ajv):
```typescript
const validate = ajv.compile(schema);
if (!validate(data)) {
  // validate.errors is array of Ajv error objects
  validate.errors?.forEach(err => {
    console.error(`${err.instancePath}: ${err.message}`);
  });
}
```

**Helper function to match Djed's error format**:
```typescript
function formatAjvErrors(errors: Ajv.ErrorObject[] | null | undefined) {
  if (!errors) return [];
  return errors.map(err => ({
    field: err.instancePath || err.params.missingProperty || 'unknown',
    message: err.message || 'Validation failed'
  }));
}
```

### Step 6: Update Schema Compilation (Performance)

**If using the same schema multiple times**:

**Before** (Djed - automatic caching):
```typescript
// Djed caches compiled schemas automatically
validator.validate(schema, data1);
validator.validate(schema, data2); // Uses cached validator
```

**After** (Ajv - manual compilation):
```typescript
// Compile once, reuse multiple times
const validate = ajv.compile(schema);

validate(data1);
validate(data2); // Reuses compiled validator
```

### Step 7: Update Format Validators

**Before** (Djed - formats enabled by default):
```typescript
const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    date: { type: 'string', format: 'date' }
  }
};

validator.validate(schema, data); // Formats work automatically
```

**After** (Ajv - must call addFormats):
```typescript
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv); // Enable format validators

const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    date: { type: 'string', format: 'date' }
  }
};

const validate = ajv.compile(schema);
validate(data);
```

### Step 8: Testing Checklist

- [ ] All `Validator` imports updated to Ajv
- [ ] Validator initialization replaced with Ajv + addFormats
- [ ] Schema compilation added where needed
- [ ] Validation calls updated to Ajv API
- [ ] Error handling updated for Ajv error format
- [ ] Format validators enabled (addFormats called)
- [ ] Application builds without errors
- [ ] All validation tests pass
- [ ] Edge cases tested (invalid data, missing fields)
- [ ] Performance validated (schema compilation optimized)

### Migration Time

| Task | Time |
|------|------|
| Install/uninstall | 1 min |
| Update imports | 2 min |
| Replace initialization | 3 min |
| Update validation calls | 7 min |
| Update error handling | 4 min |
| Testing | 3 min |
| **Total** | **20 min** |

### Alternative Libraries

**Joi** (object schema validation):
```typescript
import Joi from 'joi';
const schema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number()
});
const result = schema.validate(data);
```

**Yup** (similar to Joi):
```typescript
import * as yup from 'yup';
const schema = yup.object({
  name: yup.string().required(),
  age: yup.number()
});
await schema.validate(data);
```

**Zod** (TypeScript-first):
```typescript
import { z } from 'zod';
const schema = z.object({
  name: z.string(),
  age: z.number()
});
const result = schema.parse(data);
```

---

## MCP Base Ejection: @djed/mcp-base → @modelcontextprotocol/sdk

**Time**: 25 minutes
**Difficulty**: ⭐⭐⭐ Advanced
**Alternative Libraries**: @modelcontextprotocol/sdk (official SDK, recommended)

### Step 1: Install MCP SDK

```bash
npm uninstall @djed/mcp-base
npm install @modelcontextprotocol/sdk
```

**Version**: ^1.0.0

### Step 2: Update Imports

**Before** (with Djed):
```typescript
import { MCPServer } from '@djed/mcp-base';
```

**After** (without Djed):
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
```

### Step 3: Replace Server Initialization

**Before** (with Djed):
```typescript
// L1 API (zero config)
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0'
});

// L2 API (with config)
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP Server',
  port: 3000
});

await server.start();
```

**After** (without Djed):
```typescript
// Create server instance
const server = new Server(
  {
    name: 'my-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Create transport (stdio)
const transport = new StdioServerTransport();

// Connect server to transport
await server.connect(transport);
```

### Step 4: Update Tool Registration

**Before** (with Djed):
```typescript
server.addTool({
  name: 'echo',
  description: 'Echo a message',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    },
    required: ['message']
  },
  handler: async (input) => {
    return { result: input.message };
  }
});
```

**After** (without Djed):
```typescript
// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo a message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        }
      }
    ]
  };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'echo') {
    const { message } = request.params.arguments as { message: string };
    return {
      content: [
        {
          type: 'text',
          text: message
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});
```

### Step 5: Update Error Handling

**Before** (with Djed):
```typescript
server.addTool({
  name: 'risky-operation',
  handler: async (input) => {
    try {
      // ... operation
      return { result: 'success' };
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
});
```

**After** (without Djed):
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'risky-operation') {
    try {
      // ... operation
      return {
        content: [
          { type: 'text', text: 'success' }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});
```

### Step 6: Update Server Lifecycle

**Before** (with Djed):
```typescript
await server.start();

// ... server runs

await server.stop();
```

**After** (without Djed):
```typescript
// Start server
await server.connect(transport);

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// Server runs until closed
```

### Step 7: Update Multiple Tools

**Before** (with Djed - simple):
```typescript
server.addTool({ name: 'tool1', handler: ... });
server.addTool({ name: 'tool2', handler: ... });
server.addTool({ name: 'tool3', handler: ... });
```

**After** (without Djed - centralized):
```typescript
// Define all tools
const tools = [
  { name: 'tool1', description: '...', inputSchema: {...} },
  { name: 'tool2', description: '...', inputSchema: {...} },
  { name: 'tool3', description: '...', inputSchema: {...} }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler with routing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case 'tool1':
      return handleTool1(request.params.arguments);
    case 'tool2':
      return handleTool2(request.params.arguments);
    case 'tool3':
      return handleTool3(request.params.arguments);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
});

// Tool handlers
async function handleTool1(args: unknown) {
  // Implementation
  return { content: [{ type: 'text', text: 'result' }] };
}
```

### Step 8: Testing Checklist

- [ ] All `MCPServer` imports updated to MCP SDK
- [ ] Server initialization replaced with Server + Transport
- [ ] Tool registration migrated to request handlers
- [ ] list_tools handler implemented
- [ ] call_tool handler implemented with routing
- [ ] Error handling updated for SDK format
- [ ] Lifecycle management (startup/shutdown) updated
- [ ] Application builds without errors
- [ ] All MCP protocol tests pass
- [ ] Tool invocation tested (all tools)
- [ ] Error cases tested
- [ ] Integration tested with MCP client

### Migration Time

| Task | Time |
|------|------|
| Install/uninstall | 1 min |
| Update imports | 2 min |
| Replace initialization | 5 min |
| Update tool registration | 10 min |
| Update error handling | 3 min |
| Update lifecycle | 2 min |
| Testing | 2 min |
| **Total** | **25 min** |

### Key Differences

| Feature | @djed/mcp-base | @modelcontextprotocol/sdk |
|---------|---------------|---------------------------|
| Tool registration | Per-tool with handler | Centralized request handlers |
| Error handling | Throw errors | Return isError: true |
| Server start | `server.start()` | `server.connect(transport)` |
| Complexity | High-level, simple | Low-level, flexible |

---

## Shared Types Ejection: @djed/shared-types → Local Types

**Time**: 10 minutes
**Difficulty**: ⭐ Easy
**Alternative**: Copy types locally (no external library)

### Step 1: Uninstall Package

```bash
npm uninstall @djed/shared-types
```

### Step 2: Create Local Types File

Create `src/types/common.ts`:

```typescript
/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper to create success result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Helper to create error result
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Configuration options interface
 */
export interface ConfigOptions {
  [key: string]: unknown;
}

/**
 * Generic logger interface
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
```

### Step 3: Update Imports

**Before** (with Djed):
```typescript
import type { Result, Ok, Err } from '@djed/shared-types';
```

**After** (without Djed):
```typescript
import type { Result } from './types/common';
import { Ok, Err } from './types/common';
```

### Step 4: Update Import Paths

**Find and replace across project**:
```bash
# Find all imports
grep -r "@djed/shared-types" src/

# Replace with local path (adjust path as needed)
find src/ -type f -name "*.ts" -exec sed -i '' 's/@djed\/shared-types/.\/types\/common/g' {} +
```

### Step 5: Testing Checklist

- [ ] Local types file created (src/types/common.ts)
- [ ] All @djed/shared-types imports updated
- [ ] Import paths adjusted for relative imports
- [ ] TypeScript compilation succeeds
- [ ] All type checks pass
- [ ] No missing type errors

### Migration Time

| Task | Time |
|------|------|
| Uninstall package | 1 min |
| Create local types | 3 min |
| Update imports | 4 min |
| Testing | 2 min |
| **Total** | **10 min** |

### Alternative: No Types

If you don't need the Result type pattern:

```typescript
// Instead of Result<T, E>
// Use direct return values and throw errors

// Before
function doSomething(): Result<string, Error> {
  if (success) return Ok('value');
  return Err(new Error('failed'));
}

// After (simpler)
function doSomething(): string {
  if (success) return 'value';
  throw new Error('failed');
}
```

---

## Testing & Validation

### Comprehensive Testing Checklist

After ejecting any package, validate the migration:

#### Build & Type Checks
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No ESLint warnings related to changes
- [ ] Bundle size acceptable (check before/after)

#### Unit Tests
- [ ] All existing unit tests pass
- [ ] Add tests for migrated code
- [ ] Edge cases covered
- [ ] Error paths tested

#### Integration Tests
- [ ] API endpoints work correctly
- [ ] Database operations succeed
- [ ] External integrations function
- [ ] MCP protocol communication works

#### Manual Testing
- [ ] Application starts without errors
- [ ] Logging output correct (for logger ejection)
- [ ] Validation behaves as expected (for validator ejection)
- [ ] MCP tools respond correctly (for mcp-base ejection)
- [ ] Type checking works (for shared-types ejection)

#### Performance Testing
- [ ] No performance regression
- [ ] Memory usage acceptable
- [ ] Response times within SLA
- [ ] No memory leaks

#### Documentation
- [ ] Update README if dependencies changed
- [ ] Update developer docs
- [ ] Document any behavior changes
- [ ] Update deployment docs if needed

### Automated Testing Script

```bash
#!/bin/bash
# test-ejection.sh

echo "🔍 Testing ejection..."

# Build
echo "Building..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Type check
echo "Type checking..."
npm run type-check || { echo "❌ Type check failed"; exit 1; }

# Lint
echo "Linting..."
npm run lint || { echo "❌ Lint failed"; exit 1; }

# Unit tests
echo "Running unit tests..."
npm test || { echo "❌ Tests failed"; exit 1; }

# Integration tests
echo "Running integration tests..."
npm run test:integration || { echo "❌ Integration tests failed"; exit 1; }

echo "✅ All tests passed!"
```

---

## Rollback Procedures

### If Ejection Goes Wrong

If you encounter issues after ejection, you can rollback:

#### Quick Rollback

```bash
# Uninstall replacement
npm uninstall winston  # or ajv, or @modelcontextprotocol/sdk

# Reinstall Djed package
npm install @djed/logger

# Restore code from git
git checkout -- src/
```

#### Partial Rollback

If some files are updated correctly but others aren't:

```bash
# Restore specific files
git checkout -- src/problematic-file.ts

# Keep working changes
# Manually fix only the problematic parts
```

#### Full Rollback with Git

```bash
# If you committed the ejection
git revert HEAD

# If you didn't commit yet
git reset --hard HEAD
```

### Best Practices for Safe Ejection

1. **Work in a branch**:
   ```bash
   git checkout -b eject-logger
   ```

2. **Commit before ejection**:
   ```bash
   git add .
   git commit -m "chore: prepare for logger ejection"
   ```

3. **Eject and test**:
   ```bash
   djed eject logger
   # Make manual changes
   npm test
   ```

4. **Commit after validation**:
   ```bash
   git add .
   git commit -m "feat: eject from @djed/logger to winston"
   ```

5. **Merge only after testing**:
   ```bash
   git checkout main
   git merge eject-logger
   ```

---

## FAQ

### How long does complete ejection take?

**All 4 packages**: ~70 minutes
**Typical (logger + validator)**: ~35 minutes
**Single package**: 10-25 minutes

### Will ejection break my application?

No, if you follow the migration guides carefully. The underlying libraries work the same way; only the wrapper API changes.

### Can I eject partially (just one package)?

Yes! Eject packages independently. It's common to eject logger but keep validator, or vice versa.

### What if I find a bug after ejecting?

You can:
1. Rollback using git
2. Fix the issue in your migrated code
3. Report it so we can improve the ejection guide

### Do I lose support after ejecting?

No. Djed's support includes helping with ejection. We'll assist with migration issues.

### Can I re-adopt Djed after ejecting?

Yes! The migration works both ways. You can go back to Djed if needed.

### Will Djed add features that can't be ejected?

No. We commit to keeping all Djed APIs ejectable. If we can't provide an ejection path, we won't add the feature.

### How do I know ejection won't break production?

1. Test thoroughly in staging
2. Use feature flags to test in production gradually
3. Monitor closely after deployment
4. Have rollback plan ready

### What if the underlying library changes its API?

We'll update ejection guides when major versions of underlying libraries change. Check docs for latest guidance.

### Can I eject to a different library (not the default)?

Yes! The guides show defaults (Winston, Ajv) but you can use alternatives (Pino, Joi, etc). The migration pattern is similar.

---

## Summary

### Ejection at a Glance

| Package | Time | Difficulty | Automated | Alternative |
|---------|------|------------|-----------|-------------|
| @djed/logger | 15 min | Easy | ✅ | Winston, Pino, Bunyan |
| @djed/validator | 20 min | Medium | ✅ | Ajv, Joi, Yup, Zod |
| @djed/mcp-base | 25 min | Advanced | ✅ | MCP SDK |
| @djed/shared-types | 10 min | Easy | ✅ | Local types |
| **Total** | **70 min** | - | - | - |

### Key Takeaways

1. ✅ **Zero lock-in is real** - Every package can be ejected in <30 minutes
2. ✅ **Automated where possible** - `djed eject` handles most of the work
3. ✅ **Clear migration paths** - Step-by-step guides with before/after code
4. ✅ **No surprises** - Underlying libraries use standard APIs
5. ✅ **Rollback friendly** - Easy to reverse if needed
6. ✅ **No penalties** - No performance or feature loss after ejection

### Philosophy Reminder

> "Djed exists to accelerate your initial development. When you outgrow our wrappers, we make it trivially easy to move on. That's what zero lock-in means."

---

**Questions?** See SECURITY.md for contact information or file an issue on GitHub.

**Ready to eject?** Use `djed eject <package>` for automated migration.

---

**Version**: 1.0
**Last Updated**: 2025-11-04
**Djed Version**: 0.1.0

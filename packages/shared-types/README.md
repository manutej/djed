# @djed/shared-types

Common TypeScript types for LUXOR projects.

## Installation

```bash
npm install @djed/shared-types
```

## Usage

```typescript
// Import all types
import { Result, Logger, McpTool } from '@djed/shared-types';

// Import from specific modules
import { LogLevel, LogEntry } from '@djed/shared-types/logging';
import { McpRequest, McpResponse } from '@djed/shared-types/mcp';
import { BaseConfig, DatabaseConfig } from '@djed/shared-types/config';
import { JsonValue, isDefined } from '@djed/shared-types/common';
```

## Modules

### Common (`@djed/shared-types/common`)

Utility types and type guards:

- **Utility Types**: `RequireProps`, `PartialProps`, `DeepPartial`, `DeepReadonly`
- **Result Type**: `Result<T, E>` for operations that can fail
- **JSON Types**: `JsonValue`, `JsonObject`, `JsonArray`, `JsonPrimitive`
- **Type Guards**: `isDefined`, `isError`, `isSuccess`, `isFailure`

```typescript
import { Result, isSuccess } from '@djed/shared-types/common';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { success: false, error: 'Division by zero' };
  }
  return { success: true, data: a / b };
}

const result = divide(10, 2);
if (isSuccess(result)) {
  console.log('Result:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### MCP (`@djed/shared-types/mcp`)

MCP (Model Context Protocol) types:

- **Messages**: `McpRequest`, `McpResponse`, `McpNotification`
- **Tools**: `McpTool`, `McpToolCall`, `McpToolResult`
- **Resources**: `McpResource`, `McpResourceContents`
- **Prompts**: `McpPrompt`, `McpPromptMessage`
- **Capabilities**: `McpServerCapabilities`, `McpClientCapabilities`

```typescript
import { McpTool, McpToolResult } from '@djed/shared-types/mcp';

const tool: McpTool = {
  name: 'calculator',
  description: 'Performs arithmetic operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  },
};
```

### Logging (`@djed/shared-types/logging`)

Logging types and utilities:

- **Levels**: `LogLevel` enum (ERROR, WARN, INFO, DEBUG, TRACE)
- **Entries**: `LogEntry` structure
- **Interface**: `Logger` interface
- **Config**: `LoggerConfig`, `FileLoggerConfig`, `HttpLoggerConfig`
- **Utilities**: `isValidLogLevel`, `shouldLog`

```typescript
import { LogLevel, Logger } from '@djed/shared-types/logging';

class MyLogger implements Logger {
  constructor(private level: LogLevel) {}

  info(message: string, meta?: Record<string, unknown>): void {
    console.log({ level: 'info', message, ...meta });
  }

  // Implement other methods...
}
```

### Config (`@djed/shared-types/config`)

Configuration types:

- **Base**: `BaseConfig` for all applications
- **MCP Server**: `McpServerBaseConfig`
- **Database**: `DatabaseConfig`
- **Redis**: `RedisConfig`
- **API**: `ApiConfig`
- **Feature Flags**: `FeatureFlags`

```typescript
import { BaseConfig, McpServerBaseConfig } from '@djed/shared-types/config';

const config: McpServerBaseConfig = {
  env: 'development',
  name: 'my-mcp-server',
  version: '1.0.0',
  transport: 'stdio',
  logging: {
    level: LogLevel.DEBUG,
    format: 'json',
  },
};
```

## Type Safety

All types are strictly typed with TypeScript:

- No `any` types
- Strict null checks
- Comprehensive type guards
- Branded types for IDs (Opaque types)

## Best Practices

1. **Use Result Types**: Prefer `Result<T, E>` over throwing errors
2. **Type Guards**: Use provided type guards (`isDefined`, `isSuccess`, etc.)
3. **Specific Imports**: Import from specific modules for better tree-shaking
4. **Branded Types**: Use `Opaque` for type-safe IDs

```typescript
import { Opaque } from '@djed/shared-types/common';

type UserId = Opaque<string, 'UserId'>;
type ProductId = Opaque<string, 'ProductId'>;

// Type-safe IDs prevent mixing different ID types
function getUser(id: UserId): User {
  // ...
}

const userId = 'user-123' as UserId;
const productId = 'product-456' as ProductId;

getUser(userId); // ✅ OK
getUser(productId); // ❌ Type error
```

## Replacing This Package

**Zero lock-in promise**: You can eject from `@djed/shared-types` anytime.

### Quick Ejection (Automated)

```bash
djed eject shared-types
```

The CLI will:
- Uninstall @djed/shared-types
- Create local type definitions file
- Generate EJECT-SHARED-TYPES.md migration guide
- Provide step-by-step instructions

**Time**: ~3 minutes (automated)

### Manual Ejection

**1. Uninstall package:**
```bash
npm uninstall @djed/shared-types
```

**2. Create local types file (`src/types/common.ts`):**
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
 * Generic logger interface
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Add other types as needed
```

**3. Update imports:**
```typescript
// Before
import type { Result } from '@djed/shared-types';

// After
import type { Result } from './types/common';
```

**Time**: ~10 minutes (manual)

### Alternative Approaches

| Approach | Use Case | Effort |
|----------|----------|--------|
| **Local types** (recommended) | Full control, no dependencies | ⭐ Easy |
| **Remove Result pattern** | Simpler error handling with throws | ⭐ Easy |
| **Use ts-results library** | Similar Result type with more features | ⭐⭐ Medium |

### Migration Checklist

- [ ] Uninstall @djed/shared-types
- [ ] Create local types file
- [ ] Update all imports to relative paths
- [ ] TypeScript compilation succeeds
- [ ] All type checks pass
- [ ] No missing type errors

**Comprehensive Guide**: See [docs/EJECTION-GUIDE.md](../../docs/EJECTION-GUIDE.md) for detailed instructions

## License

MIT

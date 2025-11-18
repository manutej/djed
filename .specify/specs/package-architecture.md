# Package Architecture Specification

**Design principles for djed's four core packages**

**Status**: Foundation Complete
**Version**: 1.0.0
**Created**: 2025-11-17

---

## Executive Summary

This specification defines the architecture, API design, and quality standards for djed's four foundational packages. Each package follows the Progressive Complexity pattern (L1→L2→L3) while maintaining zero lock-in and optimal performance.

---

## Package Overview

### Core Packages

| Package | Purpose | Bundle Size | Dependencies | Status |
|---------|---------|-------------|--------------|--------|
| **@djed/logger** | Structured logging wrapper | < 5KB | winston (peer) | v0.1.0 ✓ |
| **@djed/mcp-base** | MCP server foundation | < 8KB | logger, validator (peer) | Phase 2 |
| **@djed/validator** | JSON schema validation | < 10KB | ajv (peer) | Phase 2 |
| **@djed/shared-types** | TypeScript type definitions | 0KB | none | Phase 2 |

---

## Architectural Principles

### 1. Thin Wrapper Pattern

**Principle**: Packages wrap, not replace, industry-standard libraries

```typescript
// GOOD: Expose underlying library
export class Logger {
  private winston: Winston.Logger;
  get raw() { return this.winston; }  // Escape hatch
}

// BAD: Hide implementation
export class Logger {
  private internalImpl;  // No access to Winston
}
```

**Benefits**:
- Easy ejection path
- Familiar APIs for experienced developers
- Ecosystem compatibility
- Reduced maintenance burden

### 2. Progressive Complexity APIs

Each package provides three API levels:

#### L1: Novice (Zero Configuration)
```typescript
// Must work immediately with defaults
const logger = new Logger('app');
logger.info('Hello');
```

#### L2: Intermediate (Common Options)
```typescript
// 80% use cases with simple configuration
const logger = new Logger('app', {
  level: 'debug',
  format: 'json',
  file: './app.log'
});
```

#### L3: Expert (Full Control)
```typescript
// Complete access to underlying library
const logger = new Logger('app', {
  winston: {
    transports: [customTransport],
    exceptionHandlers: [customHandler]
  }
});
```

### 3. Composition Over Inheritance

**Principle**: Packages compose, not extend

```typescript
// GOOD: Composition
class MCPServer {
  constructor(
    private logger: Logger,
    private validator: Validator
  ) {}
}

// BAD: Inheritance chain
class MCPServer extends BaseServer extends Logger {}
```

### 4. Zero Runtime Dependencies

**Principle**: Minimize dependency footprint

```json
{
  "dependencies": {},  // Empty or minimal
  "peerDependencies": {
    "winston": "^3.0.0"  // User installs if needed
  },
  "peerDependenciesMeta": {
    "winston": {
      "optional": true  // Works without it
    }
  }
}
```

---

## Package Specifications

### @djed/logger

#### Purpose
Structured logging with sensible defaults and progressive complexity

#### Architecture
```typescript
export interface LoggerOptions {
  // L1: Works with defaults
  level?: 'error' | 'warn' | 'info' | 'debug';

  // L2: Common customization
  format?: 'json' | 'pretty' | 'simple';
  file?: string;
  console?: boolean;

  // L3: Full Winston access
  winston?: Winston.LoggerOptions;
}

export class Logger {
  constructor(name: string, options?: LoggerOptions);

  // Core methods (L1)
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;

  // Advanced methods (L2)
  child(meta: any): Logger;
  startTimer(): () => void;

  // Expert access (L3)
  get winston(): Winston.Logger;
}
```

#### Quality Gates
- Bundle size: < 5KB gzipped
- Initialization time: < 10ms
- Test coverage: > 95%
- Zero critical vulnerabilities

### @djed/validator

#### Purpose
JSON schema validation with caching and helpful error messages

#### Architecture
```typescript
export interface ValidatorOptions {
  // L1: Works with defaults
  strict?: boolean;

  // L2: Common customization
  coerceTypes?: boolean;
  removeAdditional?: boolean;
  formats?: Record<string, RegExp | Function>;

  // L3: Full Ajv access
  ajv?: AjvOptions;
}

export class Validator {
  constructor(options?: ValidatorOptions);

  // Core methods (L1)
  validate<T>(data: unknown, schema: JSONSchema): ValidationResult<T>;
  compile(schema: JSONSchema): CompiledSchema;

  // Advanced methods (L2)
  addFormat(name: string, format: RegExp | Function): void;
  addSchema(id: string, schema: JSONSchema): void;

  // Expert access (L3)
  get ajv(): Ajv;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;  // Validated and typed data
  errors?: ValidationError[];
}
```

#### Quality Gates
- Bundle size: < 10KB gzipped
- Validation speed: > 10k/sec
- Schema compilation cached
- Test coverage: > 90%

### @djed/mcp-base

#### Purpose
MCP protocol server base class with lifecycle management

#### Architecture
```typescript
export interface MCPServerOptions {
  // L1: Minimal required config
  name: string;
  tools: MCPTool[];

  // L2: Common patterns
  logger?: Logger;
  validator?: Validator;
  port?: number;

  // L3: Advanced features
  middleware?: Middleware[];
  hooks?: ServerHooks;
  transport?: 'stdio' | 'http' | 'ws';
}

export abstract class MCPServer {
  constructor(options: MCPServerOptions);

  // Core lifecycle (L1)
  async start(): Promise<void>;
  async stop(): Promise<void>;

  // Request handling (L2)
  protected abstract handleRequest(request: MCPRequest): Promise<MCPResponse>;

  // Advanced features (L3)
  use(middleware: Middleware): void;
  on(event: ServerEvent, handler: EventHandler): void;
}
```

#### Quality Gates
- Bundle size: < 8KB gzipped
- Request latency p95: < 10ms
- Protocol compliance: 100%
- Test coverage: > 90%

### @djed/shared-types

#### Purpose
Common TypeScript type definitions with zero runtime cost

#### Architecture
```typescript
// MCP Protocol Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface MCPRequest {
  id: string;
  method: string;
  params: unknown;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: MCPError;
}

// Utility Types
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

// JSON Schema Types
export interface JSONSchema {
  type?: JSONType;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  // ... full JSON Schema Draft 7
}
```

#### Quality Gates
- Zero runtime code (types only)
- 100% TypeScript strict mode
- Full TSDoc documentation
- Works with TypeScript 5.0+

---

## Cross-Package Patterns

### 1. Consistent Error Handling

All packages use structured errors:

```typescript
export class DjedError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'DjedError';
  }
}

// Package-specific errors
export class ValidationError extends DjedError {
  constructor(message: string, errors: any[]) {
    super(message, 'VALIDATION_ERROR', { errors });
  }
}
```

### 2. Graceful Degradation

All packages implement fallbacks:

```typescript
// Logger falls back to console
// Validator falls back to basic checks
// MCP server falls back to HTTP from WebSocket
```

### 3. Lifecycle Management

Consistent initialization and cleanup:

```typescript
interface Lifecycle {
  async init(): Promise<void>;
  async destroy(): Promise<void>;
}
```

### 4. Configuration Merging

Deep merge with defaults:

```typescript
function configure<T>(defaults: T, options?: Partial<T>): T {
  return deepMerge(defaults, options);
}
```

---

## Package Interactions

### Dependency Graph
```
shared-types (standalone)
    ↓
validator (uses types)
    ↓
logger (uses types)
    ↓
mcp-base (uses all three)
```

### Integration Example
```typescript
import { Logger } from '@djed/logger';
import { Validator } from '@djed/validator';
import { MCPServer } from '@djed/mcp-base';
import type { MCPTool } from '@djed/shared-types';

// Packages work together seamlessly
const logger = new Logger('mcp-server');
const validator = new Validator();

class MyServer extends MCPServer {
  constructor() {
    super({
      name: 'my-server',
      tools: myTools,
      logger,
      validator
    });
  }
}
```

---

## Testing Strategy

### Unit Tests (60%)
- Individual package functionality
- Edge cases and error conditions
- Mocked dependencies

### Integration Tests (30%)
- Package interactions
- Real dependencies (Winston, Ajv)
- End-to-end scenarios

### Contract Tests (10%)
- API stability validation
- Backward compatibility checks
- Never modified, only extended

### Performance Tests
- Bundle size validation
- Initialization benchmarks
- Operation throughput

---

## Documentation Requirements

Each package must have:

1. **README.md** - Quick start and overview
2. **API.md** - Complete API reference
3. **EXAMPLES.md** - Common use cases
4. **MIGRATION.md** - Upgrade guides
5. **EJECTION.md** - How to remove djed

---

## Release Strategy

### Version Policy
- **Major**: Breaking changes (rare)
- **Minor**: New features (monthly)
- **Patch**: Bug fixes (as needed)

### Release Process
1. Run full test suite
2. Update changelog
3. Build and validate bundles
4. Publish to npm
5. Update documentation site

### Deprecation Policy
- 6 months warning for breaking changes
- Console warnings in development
- Migration guide provided
- Support overlap period

---

## Success Metrics

### Adoption
- Used in 5+ LUXOR projects
- 100+ weekly npm downloads
- 90% developer satisfaction

### Quality
- Zero critical bugs in production
- < 24hr issue response time
- 100% uptime for critical paths

### Performance
- All packages meet size targets
- No performance regressions
- Benchmarks improving over time

---

**Status**: Architecture defined and validated
**Next Steps**: Implement remaining packages following these specifications
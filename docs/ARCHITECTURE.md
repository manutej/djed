# Djed Architecture

**The Stable Pillar** - Infrastructure design for LUXOR projects

**Version**: 0.1.0
**Last Updated**: 2025-11-03

---

## Overview

Djed provides shared infrastructure through two primary mechanisms:

1. **Templates** - Starter code for new projects (copy and customize)
2. **Packages** - Shared runtime code (import and use)

This architecture enables:
- Fast project initialization
- Consistent patterns across LUXOR
- Centralized improvements
- Zero lock-in (projects can diverge)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LUXOR Projects                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │TextMate  │ Khepri   │ BARQUE   │ LUMINA   │ HALCON   │  │
│  │          │          │          │          │          │  │
│  │ (n8n     │ (MCP     │ (PDF     │ (Docs    │ (Vision  │  │
│  │  wrap)   │  bridge) │  gen)    │  mgmt)   │  proc)   │  │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘  │
│       │          │          │          │          │         │
│       │    Imports @djed/* packages    │          │         │
│       └──────────┴──────────┴──────────┴──────────┘         │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Djed Infrastructure                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Templates (Copy & Customize)            │   │
│  │  ┌───────────┬────────────┬─────────────────────┐   │   │
│  │  │ MCP       │  Docker    │  GitHub Actions     │   │   │
│  │  │ Server    │  Patterns  │  Workflows          │   │   │
│  │  └───────────┴────────────┴─────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Shared Packages (npm install)               │   │
│  │  ┌────────┬──────────┬───────────┬──────────────┐   │   │
│  │  │ logger │ mcp-base │ validator │ shared-types │   │   │
│  │  └────────┴──────────┴───────────┴──────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Documentation & Examples                │   │
│  │  • Architecture docs  • Getting started guides       │   │
│  │  • API references    • Code examples                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Templates vs Packages

**Templates** (Copy & Customize):
- Project scaffolding (MCP server, Docker, GitHub)
- Starting point, not dependency
- Projects can diverge freely
- Updated by copying new template version

**Packages** (Import & Use):
- Runtime dependencies (`@djed/logger`, `@djed/mcp-base`)
- Shared utilities and abstractions
- Updated via `npm update`
- Can be replaced if needed

**Rule of Thumb**:
- **Template**: Structure, boilerplate, project-specific
- **Package**: Reusable logic, shared utilities, common patterns

---

### 2. Start Simple, Grow Incrementally

**Current (v0.1.0)**: Minimal viable infrastructure
- Only what TextMate & Khepri need NOW
- 4 shared packages, 3 templates
- No premature abstraction

**Growth Strategy**:
- Add template when 2+ projects need it
- Extract package when pattern emerges in 2+ projects
- Never add complexity upfront
- Remove unused code aggressively

**Example Evolution**:
```
v0.1.0: MCP template (TextMate, Khepri need it)
v0.2.0: Add REST API template (when BARQUE, LUMINA need it)
v0.3.0: Add db-helpers package (when 3+ projects use database)
```

---

### 3. Zero Lock-In

Projects can:
- ✅ Use templates as starting point, then diverge completely
- ✅ Cherry-pick specific packages (use logger but not mcp-base)
- ✅ Replace Djed packages with alternatives
- ✅ Copy code directly instead of importing
- ✅ Eject entirely if Djed no longer fits

**Djed is helpful, not mandatory.**

---

### 4. Convention Over Configuration

**Opinionated defaults that work**:
- TypeScript strict mode
- ESLint + Prettier for code quality
- Vitest for testing
- Winston for logging
- Docker multi-stage builds
- GitHub Actions for CI/CD

**But configurable when needed**:
- All configs exposed and overridable
- Projects can use different tools
- No magic, just sensible defaults

---

## Template Architecture

### MCP Server Template

**Purpose**: Scaffolding for MCP protocol servers

**Structure**:
```
mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   │   - Starts server
│   │   - Sets up logging
│   │   - Handles shutdown
│   │
│   ├── server.ts             # MCP server setup
│   │   - Protocol implementation
│   │   - Tool registration
│   │   - Request handling
│   │
│   ├── tools.ts              # Tool definitions
│   │   - Tool schemas
│   │   - Input validation
│   │
│   ├── handlers.ts           # Tool handlers
│   │   - Business logic
│   │   - Response formatting
│   │
│   └── types/                # TypeScript types
│       ├── mcp.ts            # MCP protocol types
│       └── config.ts         # Configuration types
│
├── tests/
│   ├── unit/                 # Unit tests
│   │   - Test individual functions
│   │
│   └── integration/          # Integration tests
│       - Test MCP protocol flow
│
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config (strict)
├── .eslintrc.js              # Linting rules
└── .prettierrc               # Code formatting
```

**Usage Pattern**:
```bash
# 1. Copy template
cp -r djed/templates/mcp-server my-project/

# 2. Customize
cd my-project
npm install
# Edit tools.ts, handlers.ts for your use case

# 3. Run
npm run dev
```

**What Projects Customize**:
- `tools.ts` - Define your MCP tools
- `handlers.ts` - Implement business logic
- `types/` - Add project-specific types
- Dependencies - Add libraries you need

**What Stays the Same**:
- Project structure
- Build/test scripts
- TypeScript config (unless you need changes)
- ESLint/Prettier setup

---

### Docker Template

**Purpose**: Container patterns for LUXOR projects

**Structure**:
```
docker/
├── Dockerfile                # Multi-stage build
│   Stage 1: Builder
│     - Install dependencies
│     - Compile TypeScript
│   Stage 2: Production
│     - Minimal image
│     - Only runtime dependencies
│
├── docker-compose.yml        # Development
│   Services:
│     - App (with hot reload)
│     - Database (if needed)
│     - Redis (if needed)
│
├── docker-compose.prod.yml   # Production
│   Services:
│     - App (optimized)
│     - Database (persistent)
│     - Reverse proxy (nginx)
│
└── .dockerignore             # Exclude files
```

**Usage Pattern**:
```bash
# 1. Copy template
cp -r djed/templates/docker my-project/

# 2. Customize docker-compose.yml
# Add/remove services as needed

# 3. Run
docker-compose up -d
```

**What Projects Customize**:
- Services in docker-compose.yml (add database, cache, etc.)
- Environment variables
- Volume mounts
- Port mappings

**What Stays the Same**:
- Multi-stage build pattern
- Health checks
- Restart policies

---

### GitHub Template

**Purpose**: CI/CD workflows for LUXOR projects

**Structure**:
```
github/
├── workflows/
│   ├── ci.yml                # Continuous Integration
│   │   - Run on push/PR
│   │   - Install dependencies
│   │   - Run lint, test, build
│   │
│   ├── release.yml           # Release Automation
│   │   - Semantic versioning
│   │   - Changelog generation
│   │   - GitHub releases
│   │
│   └── deploy.yml            # Deployment (optional)
│       - Deploy to production
│       - Docker registry push
│
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
│
└── PULL_REQUEST_TEMPLATE.md
```

**Usage Pattern**:
```bash
# 1. Copy template
cp -r djed/templates/github my-project/.github/

# 2. Customize workflows (if needed)
# Most projects use as-is

# 3. Push to GitHub
git add .github
git commit -m "Add CI/CD workflows"
git push
```

**What Projects Customize**:
- Deployment targets (deploy.yml)
- Additional workflow steps
- Secrets configuration

**What Stays the Same**:
- CI workflow (lint, test, build)
- Issue/PR templates

---

## Package Architecture

### @djed/logger

**Purpose**: Structured logging across all LUXOR projects

**Design**:
```typescript
// Wrapper around Winston
// Standardizes log format, levels, and output

class Logger {
  constructor(serviceName: string, options?: LoggerOptions)

  info(message: string, metadata?: object): void
  error(message: string, metadata?: object): void
  warn(message: string, metadata?: object): void
  debug(message: string, metadata?: object): void
}
```

**Standard Format**:
```json
{
  "timestamp": "2025-11-03T10:00:00.000Z",
  "level": "info",
  "service": "textmate",
  "message": "Server started",
  "metadata": {
    "port": 3000
  }
}
```

**Why Shared**:
- Consistent log format across all LUXOR projects
- Centralized configuration (log levels, destinations)
- Easy to aggregate logs (when multiple services running)

---

### @djed/mcp-base

**Purpose**: Base class for MCP servers

**Design**:
```typescript
// Base MCP server implementation
// Handles protocol, tool registration, error handling

class MCPServer {
  constructor(config: MCPServerConfig)

  registerTool(tool: MCPTool): void
  start(): Promise<void>
  stop(): Promise<void>

  // Protected methods for subclasses
  protected handleRequest(req: MCPRequest): Promise<MCPResponse>
  protected validateInput(input: any, schema: JSONSchema): ValidationResult
}
```

**Why Shared**:
- MCP protocol implementation is same for all servers
- Error handling patterns are consistent
- Health checks, graceful shutdown are boilerplate

**What Projects Override**:
- Tool definitions (each project has unique tools)
- Tool handlers (business logic)

---

### @djed/validator

**Purpose**: JSON schema validation

**Design**:
```typescript
// Wrapper around Ajv
// Standardizes validation errors

class Validator {
  validate(data: any, schema: JSONSchema): ValidationResult

  // Helper methods
  validateEmail(email: string): boolean
  validatePhone(phone: string): boolean
  validateUrl(url: string): boolean
}
```

**Why Shared**:
- Consistent validation across projects
- Standardized error messages
- Common format validators (email, phone, URL)

---

### @djed/shared-types

**Purpose**: Common TypeScript types

**Design**:
```typescript
// MCP Protocol types
export interface MCPTool { /* ... */ }
export interface MCPRequest { /* ... */ }
export interface MCPResponse { /* ... */ }

// Common utility types
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

// Configuration types
export interface ServerConfig { /* ... */ }
export interface DatabaseConfig { /* ... */ }
```

**Why Shared**:
- Type consistency across projects
- Reusable utility types
- Shared protocol types (MCP)

---

## Extensibility Strategy

### When to Add New Template

**Criteria**:
1. 2+ LUXOR projects need it
2. Clear abstraction boundary
3. Proven pattern (not experimental)

**Process**:
1. Build pattern in one project
2. Test in second project
3. Extract commonalities
4. Create template with customization points
5. Document usage

**Example**:
```
BARQUE needs REST API → Build in BARQUE
LUMINA also needs REST API → Extract to template
Create: djed/templates/rest-api/
```

---

### When to Add New Package

**Criteria**:
1. Pattern used in 2+ projects
2. Stable, well-tested code
3. Clear abstraction
4. Real value (not premature)

**Process**:
1. Identify duplicated code
2. Extract to package
3. Test in original projects
4. Publish to npm (or link locally)
5. Document API

**Example**:
```
TextMate has database code → Project-specific, keep in TextMate
Khepri also needs database → Similar pattern, extract to @djed/db-helpers
```

---

### Monorepo Structure (Future)

**When LUXOR has 5+ projects**, consider monorepo:

```
luxor/
├── packages/
│   ├── djed/                 # Infrastructure
│   ├── textmate/             # Messaging
│   ├── khepri/               # MCP bridge
│   ├── barque/               # PDF gen
│   └── lumina/               # Docs
├── package.json              # Workspace config
└── pnpm-workspace.yaml       # Workspaces
```

**Benefits**:
- Shared dependencies
- Cross-project refactoring
- Atomic commits across projects
- Unified CI/CD

**Current**: Separate repos (simpler for 2-3 projects)
**Future**: Consider monorepo at 5+ projects

---

## Quality Standards

### Code Quality

All Djed templates enforce:
- ✅ TypeScript strict mode
- ✅ ESLint (no warnings)
- ✅ Prettier (consistent formatting)
- ✅ 80%+ test coverage (unit tests)
- ✅ Integration tests for critical paths

### Documentation

All Djed packages require:
- ✅ README with examples
- ✅ API documentation (JSDoc)
- ✅ Usage guide
- ✅ Migration guide (for breaking changes)

### Versioning

**Templates**:
- Version in directory name (`mcp-server-v1/`, `mcp-server-v2/`)
- Old versions remain available
- Breaking changes create new version

**Packages**:
- Semantic versioning (npm standard)
- CHANGELOG.md for each release
- Deprecation warnings before breaking changes

---

## Performance Considerations

### Template Size

**Goal**: Minimal boilerplate
- Remove unused code aggressively
- Only include common patterns
- Projects add what they need

**Current Template Size**:
- MCP server: ~50 lines of boilerplate
- Docker: ~30 lines
- GitHub: ~60 lines

### Package Size

**Goal**: Small, focused packages
- Each package has single responsibility
- No circular dependencies
- Tree-shakeable exports

**Current Package Sizes**:
- @djed/logger: ~5KB
- @djed/mcp-base: ~8KB
- @djed/validator: ~10KB (includes Ajv)
- @djed/shared-types: ~2KB (types only)

---

## Security Considerations

### Templates

- ✅ No hardcoded secrets
- ✅ Environment variables for config
- ✅ .gitignore for sensitive files
- ✅ Security headers in HTTP responses

### Packages

- ✅ No dependencies with known vulnerabilities
- ✅ Regular dependency updates
- ✅ Input validation in all public APIs
- ✅ Error messages don't leak sensitive data

### Audit Process

- Monthly: `npm audit` on all packages
- Quarterly: Dependency updates
- Per release: Security review

---

## Future Architecture

### Planned Additions (When Needed)

**Templates**:
- REST API template (Express.js)
- GraphQL template (Apollo Server)
- CLI template (Commander.js)
- Full-stack template (Frontend + Backend)

**Packages**:
- @djed/db-helpers (database utilities)
- @djed/auth (JWT, OAuth 2.0)
- @djed/queue (Redis queue)
- @djed/testing (test utilities)

**Infrastructure**:
- Shared documentation site
- Package registry (private npm)
- Template marketplace (browse templates)

### Scaling Strategy

**Current (2-3 projects)**:
- Separate repos
- npm packages published publicly
- Manual template copying

**Medium (4-10 projects)**:
- Consider monorepo
- Shared CI/CD
- Automated template scaffolding CLI

**Large (10+ projects)**:
- Monorepo required
- Internal package registry
- Developer portal with templates
- Automated dependency updates

---

## Maintenance

### Ownership

**Current**: Single maintainer (you)

**Future** (when team grows):
- Assign package owners
- Rotation for template maintenance
- Community contributions via PRs

### Update Process

**Monthly**:
- Security updates for all packages
- Dependency updates

**Quarterly**:
- Review templates for improvements
- Extract new patterns from projects

**Per Project Launch**:
- Lessons learned → Djed improvements
- New patterns → New packages/templates

---

## Success Metrics

### Template Success

- Projects use template as starting point ✅
- Minimal customization needed for basic use
- Projects can diverge when needed

### Package Success

- 2+ projects using each package
- Stable API (few breaking changes)
- Positive developer feedback

### Overall Success

- Faster project initialization (hours → minutes)
- Consistent patterns across LUXOR
- Reduced code duplication
- Developer satisfaction

---

## Conclusion

Djed provides stable infrastructure through:
- **Templates**: Project scaffolding (copy & customize)
- **Packages**: Shared runtime code (import & use)

Design principles:
- Start simple, grow incrementally
- Zero lock-in (projects can diverge)
- Convention over configuration
- Quality and security first

**Current**: Simple foundation for TextMate & Khepri
**Future**: Comprehensive infrastructure for all LUXOR projects

> "The Djed pillar stands firm, supporting the structure above."

---

**Version**: 0.1.0
**Status**: Production-ready for TextMate & Khepri
**Next Review**: After TextMate/Khepri launch (Q1 2025)

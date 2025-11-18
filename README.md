# Djed

**The Stable Pillar** - Shared infrastructure for all LUXOR projects.

> Named after the Djed pillar, the ancient Egyptian symbol of stability and endurance, representing the backbone of Osiris.

---

## Overview

**Djed** is the foundational infrastructure that supports all LUXOR applications, APIs, and services. Just as the Djed pillar provides stability and structure, this infrastructure provides reusable patterns, templates, and shared code for:

- **TextMate** - Messaging automation
- **Khepri** - MCP-to-Workflow bridge
- **BARQUE** - Markdown to PDF generation
- **LUMINA** - Documentation and knowledge management
- **LUMOS** - Light/illumination projects
- **unix-goto** - Unix command utilities
- **HALCON** - Falcon/vision projects
- **Future LUXOR projects**

---

## Philosophy

### The Djed Principle

**"Build once, use everywhere"**

Instead of recreating infrastructure for each project, Djed provides:
- ✅ **Templates** - Project scaffolding (MCP servers, Docker, GitHub)
- ✅ **Shared Packages** - Reusable utilities (logging, validation, error handling)
- ✅ **Patterns** - Proven architectural patterns
- ✅ **Standards** - Consistent code quality and structure

**Benefits**:
- Faster project initialization (minutes, not hours)
- Consistent patterns across all LUXOR projects
- Centralized updates and improvements
- Reduced code duplication
- Shared best practices

---

## Project Structure

```
djed/
├── templates/                      # Project templates
│   ├── mcp-server/                # MCP server template (TypeScript)
│   ├── docker/                    # Docker & docker-compose patterns
│   └── github/                    # GitHub Actions workflows
│
├── packages/                       # Shared npm packages
│   ├── shared-types/              # Common TypeScript types
│   ├── logger/                    # Winston logger wrapper
│   ├── validator/                 # JSON schema validation
│   ├── mcp-base/                  # Base MCP server class
│   └── db-helpers/                # Database utilities
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md            # Architecture overview
│   ├── GETTING-STARTED.md         # Quick start guide
│   ├── TEMPLATES.md               # Template usage
│   └── PACKAGES.md                # Package documentation
│
├── examples/                       # Example implementations
│   ├── minimal-mcp/               # Minimal MCP server
│   └── full-stack/                # Full-stack app example
│
└── README.md                       # This file
```

---

## Current State (v0.1.0)

### What's Included (Simple Start)

**Templates**:
- ✅ MCP Server (TypeScript/Node.js) - Ready for TextMate & Khepri
- ✅ Docker patterns (Dockerfile, docker-compose.yml)
- ✅ GitHub Actions (CI/CD workflows)

**Shared Packages**:
- ✅ `@djed/shared-types` - Common TypeScript types
- ✅ `@djed/logger` - Winston logger with standard config
- ✅ `@djed/validator` - JSON schema validation helpers
- ✅ `@djed/mcp-base` - Base MCP server class

**Status**: Simple, focused, production-ready

---

## Quick Start

### Use MCP Server Template

```bash
# Create new MCP server from template
cd /path/to/your-project
cp -r /path/to/djed/templates/mcp-server/* .

# Install dependencies
npm install

# Start development server
npm run dev
```

### Use Shared Packages

```bash
# Install Djed packages in your project
npm install @djed/logger @djed/mcp-base @djed/validator

# Use in your code
import { Logger } from '@djed/logger';
import { MCPServer } from '@djed/mcp-base';

const logger = new Logger('my-app');
const server = new MCPServer({ port: 3000 });
```

---

## Supported Projects

### Current

| Project | Status | Uses Djed Templates | Uses Djed Packages |
|---------|--------|---------------------|-------------------|
| **TextMate** | 🚧 Building | ✅ MCP, Docker, GitHub | ✅ logger, mcp-base, validator |
| **Khepri** | 🚧 Building | ✅ MCP, Docker, GitHub | ✅ logger, mcp-base, validator |

### Future

| Project | Planned | Expected Djed Usage |
|---------|---------|---------------------|
| **BARQUE** | Q1 2025 | Docker, shared-types, logger |
| **LUMINA** | Q1 2025 | All templates + packages |
| **LUMOS** | Q2 2025 | MCP template, shared packages |
| **unix-goto** | Q2 2025 | Minimal templates |
| **HALCON** | Q2 2025 | Full stack templates |

---

## Design Principles

### 1. Start Simple, Grow Incrementally

**Current (v0.1.0)**:
- Basic MCP server template
- Essential shared packages
- Docker patterns for TextMate/Khepri

**Future Growth**:
- Add templates as needed (REST API, GraphQL, CLI)
- Expand packages when patterns emerge
- Never add complexity upfront

### 2. Zero Lock-In

Projects can:
- Use templates as starting point, then diverge
- Cherry-pick specific packages
- Replace Djed packages with alternatives
- Eject completely if needed

**Djed is a convenience, not a requirement.**

### 3. Convention Over Configuration

Opinionated defaults that work:
- TypeScript strict mode
- ESLint + Prettier
- Vitest for testing
- Winston for logging
- Docker multi-stage builds

But configurable when needed.

### 4. Monorepo-Friendly

Djed packages can be:
- Published to npm (`@djed/*`)
- Linked locally (npm workspaces)
- Copied directly into projects

**Flexible deployment, consistent patterns.**

---

## Templates

### MCP Server Template

**Location**: `templates/mcp-server/`

**What's Included**:
```
mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── tools.ts              # Tool definitions
│   ├── handlers.ts           # Tool handlers
│   └── types/                # TypeScript types
├── tests/
│   ├── unit/
│   └── integration/
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── .eslintrc.js              # Linting
└── .prettierrc               # Formatting
```

**Features**:
- TypeScript 5.3+ with strict mode
- MCP protocol implementation
- Health check endpoint
- Structured logging
- Error handling
- Test setup (Vitest)

**Usage**: Copy template, customize tools

---

### Docker Template

**Location**: `templates/docker/`

**What's Included**:
```
docker/
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # Development setup
├── docker-compose.prod.yml   # Production setup
└── .dockerignore
```

**Features**:
- Multi-stage builds (builder + production)
- Development hot reload
- Production optimization
- Health checks
- Environment variable support

**Usage**: Copy to project, configure services

---

### GitHub Template

**Location**: `templates/github/`

**What's Included**:
```
github/
├── workflows/
│   ├── ci.yml                # Continuous integration
│   ├── release.yml           # Release automation
│   └── deploy.yml            # Deployment (optional)
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
```

**Features**:
- Test automation
- Docker build verification
- Automated releases
- Issue/PR templates

**Usage**: Copy to `.github/` in project

---

## Shared Packages

### @djed/logger

**Purpose**: Standardized logging across all LUXOR projects

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('my-app');

logger.info('Server started', { port: 3000 });
logger.error('Connection failed', { error });
logger.debug('Processing request', { requestId });
```

**Features**:
- Winston-based
- Structured logging (JSON)
- Log levels (error, warn, info, debug)
- Timestamps and metadata
- Environment-based configuration

---

### @djed/mcp-base

**Purpose**: Base MCP server class with common functionality

```typescript
import { MCPServer } from '@djed/mcp-base';

const server = new MCPServer({
  port: 3000,
  name: 'my-mcp-server',
  tools: [
    // Your tool definitions
  ]
});

server.start();
```

**Features**:
- MCP protocol handling
- Tool registration
- Request/response validation
- Error handling
- Health checks
- Graceful shutdown

---

### @djed/validator

**Purpose**: JSON schema validation helpers

```typescript
import { Validator } from '@djed/validator';

const validator = new Validator();

const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0 }
  },
  required: ['email']
};

const result = validator.validate(data, schema);
if (!result.valid) {
  console.error(result.errors);
}
```

**Features**:
- Ajv-based validation
- JSON Schema support
- Custom error messages
- Type coercion
- Format validators

---

### @djed/shared-types

**Purpose**: Common TypeScript types used across LUXOR projects

```typescript
import { MCPTool, MCPRequest, MCPResponse } from '@djed/shared-types';

// Use in your code
const tool: MCPTool = {
  name: 'my-tool',
  description: 'Does something',
  inputSchema: { /* ... */ }
};
```

**Features**:
- MCP protocol types
- Common utility types
- Database record types
- Configuration types

---

## Future Expansion

### Planned Templates (When Needed)

**REST API Template**:
- Express.js server
- OpenAPI/Swagger documentation
- Authentication middleware
- Rate limiting

**GraphQL Template**:
- Apollo Server
- Schema-first design
- Resolvers pattern
- DataLoader integration

**CLI Template**:
- Commander.js setup
- Interactive prompts
- Progress indicators
- Configuration management

**Full-Stack Template**:
- Frontend + Backend
- Shared types
- Monorepo setup
- End-to-end testing

### Planned Packages (When Patterns Emerge)

**@djed/db-helpers**:
- Database connection pooling
- Migration utilities
- Query builders
- ORM abstractions

**@djed/auth**:
- JWT handling
- OAuth 2.0 flows
- Permission checking
- Session management

**@djed/queue**:
- Redis-backed queues
- Job processing
- Retry logic
- Scheduling

**@djed/testing**:
- Test fixtures
- Mock factories
- Integration test helpers
- E2E utilities

---

## Contributing to Djed

### When to Add to Djed

**Add when**:
- Pattern used in 2+ LUXOR projects
- Clear abstraction boundary
- Stable, well-tested code
- Provides real value (not premature abstraction)

**Don't add**:
- Project-specific logic
- Experimental code
- Single-use utilities
- Overly complex abstractions

### How to Add

1. **Identify pattern** in existing project
2. **Extract to Djed** package or template
3. **Document** usage and examples
4. **Test** in at least 2 projects
5. **Version** and publish (if npm package)

---

## Versioning Strategy

### Templates
- Version in directory name (e.g., `mcp-server-v1/`)
- Breaking changes create new template version
- Old versions remain available

### Packages
- Semantic versioning (npm standard)
- Changelog for each release
- Deprecation warnings before breaking changes

---

## Dependencies

### Required
- Node.js 20+
- npm or pnpm
- Docker (for Docker templates)

### Optional
- GitHub account (for GitHub templates)
- PostgreSQL (for db-helpers package, future)
- Redis (for queue package, future)

---

## Roadmap

### v0.1.0 (Current) ✅
- MCP server template
- Docker templates
- GitHub Actions templates
- Basic shared packages (logger, validator, mcp-base, shared-types)

### v0.2.0 (After TextMate + Khepri launch)
- Lessons learned from TextMate/Khepri
- Template improvements
- Additional shared utilities

### v0.3.0 (Q1 2025)
- REST API template (for BARQUE, LUMINA)
- Database helpers package
- Testing utilities package

### v1.0.0 (Q2 2025)
- Stable, battle-tested infrastructure
- Full documentation
- Complete package ecosystem
- Multiple LUXOR projects using Djed

---

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - Djed system design
- **[Getting Started](docs/GETTING-STARTED.md)** - Quick start guide
- **[Templates Guide](docs/TEMPLATES.md)** - How to use templates
- **[Packages Guide](docs/PACKAGES.md)** - Package documentation
- **[Contributing](docs/CONTRIBUTING.md)** - How to contribute

---

## Projects Using Djed

### TextMate
**Uses**: MCP server template, logger, mcp-base, validator
**Status**: In development
**Customizations**: Added contact DB, template engine, n8n integration

### Khepri
**Uses**: MCP server template, logger, mcp-base, validator
**Status**: In development
**Customizations**: Added schema transformer, platform adapters

---

## Philosophy: The Djed Pillar

In ancient Egypt, the Djed pillar symbolized:
- **Stability** - Unchanging foundation
- **Endurance** - Lasting structure
- **Support** - Backbone that holds things up
- **Regeneration** - Continual renewal

Our Djed infrastructure embodies these principles:
- **Stable** patterns that work
- **Enduring** code that lasts
- **Supporting** all LUXOR projects
- **Regenerating** through continuous improvement

> "The Djed pillar stands firm, supporting the structure above."

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Etymology

**Djed** (ḏd) - Ancient Egyptian hieroglyph and symbol representing stability. Often depicted as a pillar with a broad base and horizontal lines, symbolizing the backbone of Osiris and the stable foundation of the cosmos.

---

**Status**: v0.1.0 - Simple Start ✅
**Created**: 2025-11-03
**Projects Supported**: 2 (TextMate, Khepri)
**Future Projects**: 5+ (BARQUE, LUMINA, LUMOS, unix-goto, HALCON)

---

*The stable pillar supporting all LUXOR projects.*

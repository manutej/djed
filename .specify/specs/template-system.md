# Template System Specification

**Scaffolding and customization framework for djed templates**

**Status**: Design Complete
**Version**: 1.0.0
**Created**: 2025-11-17

---

## Executive Summary

The djed template system provides instant project scaffolding through copy-based templates with variable substitution, progressive complexity levels, and zero runtime dependencies on djed itself. This enables the "start in minutes" promise while maintaining complete ownership and customization freedom.

---

## System Overview

### Template Philosophy

**"Copy, Customize, Own"** - Templates are starting points, not frameworks

1. **Copy-based**: Templates are copied, not referenced
2. **Zero lock-in**: No runtime dependency on djed
3. **Progressive complexity**: L1 (minimal) → L2 (standard) → L3 (production)
4. **Customizable**: Full modification freedom after generation

### Template Categories

| Template | Purpose | Complexity Levels | Primary Users |
|----------|---------|-------------------|---------------|
| **mcp-server** | MCP protocol servers | L1, L2, L3 | TextMate, Khepri, AI tools |
| **docker-service** | Containerized services | L1, L2 | All microservices |
| **github-action** | CI/CD workflows | L1, L2 | All projects |
| **express-api** | REST APIs | L1, L2, L3 | Backend services |
| **cli-tool** | Command-line tools | L1, L2 | Developer tools |

---

## Template Architecture

### Directory Structure

```
templates/
├── mcp-server/
│   ├── L1-minimal/          # < 10 files, zero config
│   │   ├── template.json    # Template metadata
│   │   ├── files/           # Template files
│   │   └── hooks/           # Generation hooks
│   ├── L2-standard/         # + testing, linting
│   └── L3-production/       # + Docker, monitoring
├── docker-service/
│   ├── L1-minimal/
│   └── L2-standard/
└── shared/                  # Shared components
    ├── eslint-config/
    ├── tsconfig-base/
    └── github-workflows/
```

### Template Metadata

```json
{
  "name": "mcp-server",
  "version": "1.0.0",
  "level": "L1",
  "description": "Minimal MCP server template",
  "variables": [
    {
      "name": "PROJECT_NAME",
      "prompt": "Project name",
      "default": "my-mcp-server",
      "validation": "^[a-z0-9-]+$"
    },
    {
      "name": "PORT",
      "prompt": "Server port",
      "default": "3000",
      "type": "number"
    }
  ],
  "dependencies": {
    "@djed/logger": "^0.1.0",
    "@djed/mcp-base": "^0.1.0"
  },
  "scripts": {
    "afterGenerate": "npm install"
  }
}
```

### Variable System

#### Variable Definition
```typescript
interface TemplateVariable {
  name: string;              // Variable identifier
  prompt: string;            // User prompt text
  type?: 'string' | 'number' | 'boolean';
  default?: any;             // Default value
  validation?: string;       // Regex pattern
  choices?: string[];        // Enumerated options
  when?: (vars: any) => boolean;  // Conditional display
}
```

#### Variable Substitution
```typescript
// In template files: {{VARIABLE_NAME}}
// package.json
{
  "name": "{{PROJECT_NAME}}",
  "version": "{{VERSION}}",
  "description": "{{DESCRIPTION}}"
}

// src/index.ts
const server = new MCPServer({
  name: '{{PROJECT_NAME}}',
  port: {{PORT}}
});
```

#### Built-in Variables
```typescript
// Always available
{{YEAR}}           // Current year
{{DATE}}           // ISO date
{{AUTHOR}}         // From git config
{{EMAIL}}          // From git config
{{DJED_VERSION}}   // Djed CLI version
```

---

## Progressive Complexity Levels

### L1: Minimal (Novice)

**Goal**: Working project in < 2 minutes

**Characteristics**:
- < 10 files total
- Zero configuration required
- Single source file
- No build step
- Inline documentation

**Example Structure**:
```
my-project/
├── package.json        # Minimal dependencies
├── tsconfig.json       # Simple TypeScript config
├── src/
│   └── index.ts       # Everything in one file
└── README.md          # Quick start guide
```

### L2: Standard (Intermediate)

**Goal**: Production-ready foundation

**Characteristics**:
- Organized file structure
- Testing setup (Vitest)
- Linting (ESLint + Prettier)
- Basic CI/CD (GitHub Actions)
- Environment configuration

**Example Structure**:
```
my-project/
├── src/
│   ├── index.ts
│   ├── handlers/
│   ├── utils/
│   └── types/
├── tests/
│   ├── unit/
│   └── integration/
├── .github/
│   └── workflows/
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── vitest.config.ts
└── package.json
```

### L3: Production (Expert)

**Goal**: Enterprise-ready with all features

**Characteristics**:
- Docker support
- Monitoring & observability
- Advanced security
- Performance optimization
- Documentation site
- Deployment automation

**Example Structure**:
```
my-project/
├── L2 structure +
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── api/
│   └── deployment/
├── monitoring/
│   ├── health-check.ts
│   └── metrics.ts
├── scripts/
│   ├── deploy.sh
│   └── benchmark.ts
└── k8s/
    ├── deployment.yaml
    └── service.yaml
```

---

## Template Components

### 1. MCP Server Template

#### L1: Minimal
```typescript
// src/index.ts
import { MCPServer } from '@djed/mcp-base';
import { Logger } from '@djed/logger';

const logger = new Logger('{{PROJECT_NAME}}');

const tools = [
  {
    name: 'example_tool',
    description: 'An example tool',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    }
  }
];

async function handleRequest(request: any) {
  logger.info('Request received', { request });
  return { result: 'success' };
}

const server = new MCPServer({
  name: '{{PROJECT_NAME}}',
  tools,
  handleRequest
});

server.start().then(() => {
  logger.info('Server started on port {{PORT}}');
});
```

#### L2: Standard
Adds:
- Separate handler files
- Input validation
- Error handling
- Unit tests
- Integration tests

#### L3: Production
Adds:
- Health checks
- Prometheus metrics
- Request tracing
- Rate limiting
- Docker deployment

### 2. Docker Service Template

#### Dockerfile Template
```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:{{PORT}}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE {{PORT}}
CMD ["node", "dist/index.js"]
```

### 3. GitHub Actions Template

#### CI Workflow Template
```yaml
name: CI
on: [push, pull_request]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Test
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: |
          SIZE=$(du -k dist | cut -f1)
          echo "Bundle size: ${SIZE}KB"
          if [ $SIZE -gt 100 ]; then
            echo "Bundle too large!"
            exit 1
          fi
```

---

## Template Generation Process

### 1. Discovery Phase
```typescript
// List available templates
$ djed list templates
Available templates:
  - mcp-server (L1, L2, L3)
  - docker-service (L1, L2)
  - github-action (L1, L2)
  - express-api (L1, L2, L3)
```

### 2. Selection Phase
```typescript
// Choose template and complexity
$ djed init mcp-server
? Select complexity level:
  > L1 - Minimal (< 10 files, zero config)
    L2 - Standard (+ testing, linting)
    L3 - Production (+ Docker, monitoring)
```

### 3. Configuration Phase
```typescript
// Gather variable values
$ djed init mcp-server my-project
? Project name: my-awesome-server
? Description: MCP server for automation
? Port: 3000
? Include Docker support? No
? Include GitHub Actions? Yes
```

### 4. Generation Phase
```typescript
// Process templates
async function generateProject(template: Template, vars: Variables) {
  // 1. Copy template files
  await copyFiles(template.files, outputPath);

  // 2. Substitute variables
  await substituteVariables(outputPath, vars);

  // 3. Run generation hooks
  await runHooks(template.hooks.beforeGenerate, vars);

  // 4. Generate dynamic files
  await generateDynamicFiles(template, vars);

  // 5. Run post-generation hooks
  await runHooks(template.hooks.afterGenerate, vars);
}
```

### 5. Finalization Phase
```typescript
// Complete setup
✓ Project created at ./my-awesome-server
✓ Dependencies installed
✓ Git repository initialized
✓ Initial commit created

Next steps:
1. cd my-awesome-server
2. npm run dev
3. Open http://localhost:3000
```

---

## Template Customization

### Project-Specific Templates

Projects can define custom templates:

```
my-project/
├── .djed/
│   └── templates/
│       └── my-custom-template/
│           ├── template.json
│           └── files/
```

### Template Inheritance

Templates can extend others:

```json
{
  "extends": "@djed/mcp-server/L2",
  "name": "my-custom-mcp",
  "additions": {
    "files": ["custom-files/"],
    "variables": [
      {
        "name": "CUSTOM_VAR",
        "prompt": "Custom variable"
      }
    ]
  }
}
```

### Hooks System

```typescript
// hooks/afterGenerate.js
module.exports = async function(vars, utils) {
  // Custom logic after generation
  await utils.exec('git init');
  await utils.exec('git add .');
  await utils.exec('git commit -m "Initial commit from djed"');

  // Modify generated files
  const pkg = await utils.readJson('package.json');
  pkg.scripts.custom = 'echo "Custom script"';
  await utils.writeJson('package.json', pkg);
};
```

---

## Quality Assurance

### Template Testing

Each template must have tests:

```typescript
// templates/mcp-server/L1-minimal/test.ts
describe('MCP Server L1 Template', () => {
  it('generates working project', async () => {
    const output = await generateTemplate('mcp-server/L1', {
      PROJECT_NAME: 'test-project',
      PORT: '3000'
    });

    // Verify files exist
    expect(output.files).toContain('package.json');
    expect(output.files).toContain('src/index.ts');

    // Verify substitution
    const pkg = JSON.parse(output.getFile('package.json'));
    expect(pkg.name).toBe('test-project');

    // Verify it builds
    await exec('npm install', output.path);
    await exec('npm run build', output.path);

    // Verify it runs
    const server = await exec('npm start', output.path);
    expect(server).toContain('Server started');
  });
});
```

### Template Validation

```yaml
# CI validation for templates
validate-templates:
  steps:
    - Generate each template
    - Run npm install
    - Run npm test
    - Run npm build
    - Check for common issues
    - Verify documentation
```

---

## Template Evolution

### Versioning Strategy

Templates are versioned independently:

```
@djed/templates-mcp-server@1.2.0
@djed/templates-docker@1.0.3
@djed/templates-github@2.1.0
```

### Update Mechanism

```bash
# Check for template updates
$ djed template update --check
Updates available:
  mcp-server: 1.2.0 → 1.3.0
  docker-service: 1.0.0 → 1.1.0

# Update templates
$ djed template update mcp-server
✓ Updated mcp-server to 1.3.0
  Added: WebSocket support in L2
  Fixed: TypeScript config issue
  See changelog: https://...
```

### Migration Support

For existing projects:

```bash
# Diff against latest template
$ djed template diff
Differences from mcp-server@1.3.0:
  + src/websocket.ts
  M package.json (2 dependencies added)
  M tsconfig.json (1 option changed)

# Apply selective updates
$ djed template patch --select
? Apply src/websocket.ts? Yes
? Update package.json? Yes
? Update tsconfig.json? No
```

---

## Success Metrics

### Quantitative
- Time to working project: < 2 minutes (L1)
- Template test coverage: 100%
- Generation success rate: > 99%
- Variable validation accuracy: 100%

### Qualitative
- Developer satisfaction: > 4.5/5
- Template customization ease
- Documentation clarity
- Update experience

---

## Implementation Checklist

- [ ] Template engine with variable substitution
- [ ] Progressive complexity structure (L1, L2, L3)
- [ ] Interactive CLI prompts
- [ ] Template testing framework
- [ ] Update mechanism
- [ ] Custom template support
- [ ] Hook system
- [ ] Template inheritance
- [ ] Documentation generator
- [ ] Migration tooling

---

**Status**: Specification complete
**Next Steps**: Implement template engine in @djed/cli package
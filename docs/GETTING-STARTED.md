# Getting Started with Djed

**Quick guide to using Djed infrastructure in your LUXOR projects**

---

## Overview

Djed provides two ways to accelerate your project:

1. **Use Templates** - Copy starter code for your project type
2. **Use Packages** - Import shared utilities in your code

This guide shows how to do both.

---

## For New Projects

### Step 1: Choose Your Template

**Available Templates**:
- `mcp-server` - MCP protocol server (for TextMate, Khepri, etc.)
- `docker` - Docker & docker-compose patterns
- `github` - GitHub Actions CI/CD workflows

### Step 2: Copy Template to Your Project

```bash
# Example: Create new MCP server project

# 1. Navigate to your project directory
cd /path/to/your-project

# 2. Copy MCP server template
cp -r /path/to/djed/templates/mcp-server/* .

# 3. Initialize git (if not already)
git init

# 4. Install dependencies
npm install
```

### Step 3: Customize for Your Use Case

**What to change**:
```typescript
// src/tools.ts - Define your MCP tools
export const myTools: Tool[] = [
  {
    name: 'my_tool',
    description: 'What my tool does',
    inputSchema: {
      // Your schema
    }
  }
];

// src/handlers.ts - Implement your business logic
export class MyHandlers {
  async handleMyTool(params: any) {
    // Your implementation
  }
}

// package.json - Update project name and description
{
  "name": "my-project",
  "description": "What my project does"
}
```

**What to keep**:
- Project structure (`src/`, `tests/`)
- TypeScript configuration (`tsconfig.json`)
- Build/test scripts
- ESLint/Prettier setup

### Step 4: Add Djed Packages

```bash
# Install Djed shared packages
npm install @djed/logger @djed/mcp-base @djed/validator @djed/shared-types
```

### Step 5: Use Djed Packages in Your Code

```typescript
// src/server.ts
import { MCPServer } from '@djed/mcp-base';
import { Logger } from '@djed/logger';
import { Validator } from '@djed/validator';

const logger = new Logger('my-project');
const validator = new Validator();

const server = new MCPServer({
  port: 3000,
  name: 'my-project',
  tools: myTools
});

logger.info('Server starting', { port: 3000 });
server.start();
```

### Step 6: Add Docker (Optional)

```bash
# Copy Docker template
cp -r /path/to/djed/templates/docker/* .

# Customize docker-compose.yml if needed

# Start with Docker
docker-compose up -d
```

### Step 7: Add GitHub Actions (Optional)

```bash
# Copy GitHub template
cp -r /path/to/djed/templates/github .github/

# Customize workflows if needed

# Push to GitHub
git add .
git commit -m "Initial commit with Djed infrastructure"
git push
```

---

## For Existing Projects

### Add Djed Packages to Existing Project

```bash
# 1. Install packages you need
npm install @djed/logger @djed/mcp-base

# 2. Import in your code
import { Logger } from '@djed/logger';

const logger = new Logger('existing-project');
logger.info('Migrated to Djed logger');
```

### Adopt Djed Patterns Gradually

**Strategy**: Adopt one piece at a time

1. **Start with logger**:
   ```bash
   npm install @djed/logger
   # Replace your logger with Djed logger
   ```

2. **Then add validator**:
   ```bash
   npm install @djed/validator
   # Use for input validation
   ```

3. **Then adopt MCP base class** (if MCP server):
   ```bash
   npm install @djed/mcp-base
   # Refactor to extend MCPServer
   ```

4. **Finally, align structure**:
   ```bash
   # Reorganize to match Djed template structure
   # (optional, not required)
   ```

---

## Quick Reference

### Install All Djed Packages

```bash
npm install @djed/logger @djed/mcp-base @djed/validator @djed/shared-types
```

### Common Imports

```typescript
// Logging
import { Logger } from '@djed/logger';
const logger = new Logger('my-service');

// MCP Server
import { MCPServer } from '@djed/mcp-base';
const server = new MCPServer({ /* config */ });

// Validation
import { Validator } from '@djed/validator';
const validator = new Validator();

// Types
import { MCPTool, MCPRequest } from '@djed/shared-types';
```

### Template Locations

```
/path/to/djed/templates/
├── mcp-server/      # MCP protocol server
├── docker/          # Docker patterns
└── github/          # GitHub Actions
```

---

## Examples

### Example 1: Minimal MCP Server

```bash
# 1. Copy template
cp -r djed/templates/mcp-server minimal-mcp-server/
cd minimal-mcp-server

# 2. Install dependencies
npm install

# 3. Create simple tool
# Edit src/tools.ts:
export const tools = [
  {
    name: 'hello',
    description: 'Say hello',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    }
  }
];

# Edit src/handlers.ts:
export class Handlers {
  async handleHello(params: any) {
    return { message: `Hello, ${params.name}!` };
  }
}

# 4. Run
npm run dev
```

### Example 2: Add Logging to Existing Project

```typescript
// Before (custom logger)
console.log('Server started on port', port);

// After (Djed logger)
import { Logger } from '@djed/logger';
const logger = new Logger('my-app');

logger.info('Server started', { port });
```

### Example 3: Add Docker to Existing Project

```bash
# 1. Copy Docker template
cp -r djed/templates/docker/* my-existing-project/

# 2. Edit docker-compose.yml
# Add any additional services (database, redis, etc.)

# 3. Build and run
docker-compose up -d
```

---

## Troubleshooting

### Cannot find '@djed/*' packages

**Problem**: TypeScript can't find Djed packages

**Solution**: Make sure packages are installed
```bash
npm install @djed/logger @djed/mcp-base @djed/validator @djed/shared-types
```

If using local (not npm published), ensure packages are linked:
```bash
cd /path/to/djed/packages/logger
npm link

cd /path/to/your-project
npm link @djed/logger
```

---

### Template files have different structure

**Problem**: Djed template doesn't match your project structure

**Solution**: Templates are starting points, not requirements
- Use what fits your project
- Adapt the structure as needed
- Keep the patterns, not the exact structure

---

### Want to update template after copying

**Problem**: Djed template improved, want updates in my project

**Solution**: Templates are one-time copy, not live updates
- Manually copy improvements
- Or, extract to Djed package if pattern is shared

---

## Best Practices

### 1. Start with Template

For new projects, use template as starting point:
```bash
cp -r djed/templates/mcp-server new-project/
```

Then customize freely. Don't treat template as sacred.

### 2. Use Packages for Shared Code

For reusable utilities, use packages:
```typescript
import { Logger } from '@djed/logger';  // ✅ Shared utility
```

Don't copy-paste code that could be a package.

### 3. Diverge When Needed

If your project needs different structure, diverge:
```bash
# Template has src/tools.ts and src/handlers.ts
# Your project might need src/api/ and src/workers/
# That's fine! Adapt the template to your needs.
```

### 4. Contribute Back

If you create useful patterns, contribute to Djed:
- Extract to template (if 2+ projects use it)
- Extract to package (if shared code)
- Open PR to Djed repo

---

## Next Steps

### For New Projects

1. ✅ Copy template
2. ✅ Install Djed packages
3. ✅ Customize tools and handlers
4. ✅ Add Docker (optional)
5. ✅ Add GitHub Actions (optional)
6. ✅ Start building!

### For Existing Projects

1. ✅ Install one Djed package (e.g., logger)
2. ✅ Test in your project
3. ✅ Gradually adopt more packages
4. ✅ Consider adopting template structure (optional)

### Learn More

- **[Architecture](ARCHITECTURE.md)** - How Djed works
- **[Templates Guide](TEMPLATES.md)** - Template details
- **[Packages Guide](PACKAGES.md)** - Package documentation
- **[Main README](../README.md)** - Djed overview

---

## Questions?

**Found a bug?** Open an issue in Djed repo
**Need help?** Check documentation or ask in LUXOR Discord
**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Happy building with Djed! 🏛️**

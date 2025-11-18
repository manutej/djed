# @djed/cli

**CLI tool for scaffolding and managing Djed-based projects**

> Reduce project setup from 4-6 hours to **5 minutes** ⚡

---

## Features

- 🚀 **Fast scaffolding** - Initialize projects in seconds
- 📦 **Package management** - Add Djed packages with examples
- 🔓 **Zero lock-in** - Eject to raw dependencies anytime
- 🎨 **Progressive API** - L1 (novice) → L3 (expert)
- ✨ **Interactive prompts** - Guided project setup
- 📝 **Auto-generates** - Examples, configs, migration guides

---

## Installation

```bash
# Global installation (recommended)
npm install -g @djed/cli

# Or use with npx (no installation)
npx @djed/cli <command>
```

---

## Commands

### `djed init` - Initialize New Project

Create a new project from a template.

**Usage:**
```bash
# L1 (Novice): With project name
djed init mcp-server my-project

# L2 (Intermediate): Interactive prompts
djed init mcp-server

# L3 (Expert): Skip prompts with flags
djed init mcp-server my-project -y --port 4000 --no-git
```

**Templates:**
- `mcp-server` - MCP protocol server (TypeScript)
- `docker` - Docker configuration
- `github` - GitHub Actions workflows

**Options:**
- `-p, --port <port>` - Server port (default: 3000)
- `-d, --description <desc>` - Project description
- `--no-install` - Skip dependency installation
- `--no-git` - Skip git initialization
- `-y, --yes` - Skip prompts, use defaults

**Example:**
```bash
# Create TextMate MCP server
djed init mcp-server textmate --port 3001

# Output:
# ✔ Project files created
# ✔ Git repository initialized
# ✔ Dependencies installed
# ✅ Project created successfully!
```

---

### `djed add` - Add Djed Package

Add a Djed package to your existing project.

**Usage:**
```bash
# L1: Default behavior (install + example)
djed add logger

# L2: Skip installation
djed add logger --no-install

# L3: Skip example generation
djed add logger --no-example
```

**Available Packages:**
- `logger` - Structured logging (Winston wrapper)
- `validator` - JSON schema validation (Ajv wrapper)
- `mcp-base` - Base MCP server class
- `shared-types` - Common TypeScript types

**Options:**
- `--no-install` - Skip npm install
- `--no-example` - Skip generating example usage

**Example:**
```bash
# Add logger to existing project
cd my-project
djed add logger

# Output:
# ✔ @djed/logger installed
# ✔ Example created: examples/logger-example.ts
# ✅ @djed/logger added successfully!
```

---

### `djed eject` - Replace with Raw Dependency

Replace a Djed package with its underlying dependency.

> **Demonstrates "zero lock-in"** - Clear path to remove Djed packages

**Usage:**
```bash
# L2: With confirmation prompt
djed eject logger

# L3: Skip confirmation
djed eject logger -y

# L3: Preview changes (dry-run)
djed eject logger --dry-run
```

**Options:**
- `--dry-run` - Preview changes without making them
- `-y, --yes` - Skip confirmation prompt

**What It Does:**
1. Shows migration plan and code changes
2. Uninstalls @djed/logger
3. Installs winston (raw dependency)
4. Creates EJECT-LOGGER.md migration guide
5. Provides step-by-step instructions

**Example:**
```bash
# Eject logger from Djed
djed eject logger

# Output:
# Migration Plan:
#   1. Uninstall @djed/logger
#   2. Install winston
#   3. Update imports
#   4. Replace Logger initialization
#   5. Test logging functionality
#
# Code Changes Required:
#   - From: import { Logger } from '@djed/logger';
#   + To: import winston from 'winston';
#
# ⚠️  This operation will modify your project
# ? Eject @djed/logger and replace with winston? (y/N)
```

---

## Progressive API Design

The CLI supports three levels of expertise:

### L1: Novice (Zero Config)
```bash
# Just provide required args
djed init mcp-server my-project
djed add logger
```

### L2: Intermediate (Interactive)
```bash
# Interactive prompts guide you
djed init mcp-server
# ? Project name: my-project
# ? Description: My awesome project
# ? Port: 3000
# ? Author: LUXOR
```

### L3: Expert (Full Control)
```bash
# Use flags for complete control
djed init mcp-server my-project \
  -y \
  --port 4000 \
  --description "Production server" \
  --no-git \
  --no-install
```

---

## Ejection: Zero Lock-In

The `djed eject` command demonstrates Djed's commitment to **zero lock-in**.

### Ejection Process

1. **Preview Changes**
   ```bash
   djed eject logger --dry-run
   ```

2. **Confirm and Execute**
   ```bash
   djed eject logger
   ```

3. **Follow Migration Guide**
   - Read `EJECT-LOGGER.md`
   - Update imports
   - Replace initialization code
   - Test thoroughly

### Ejection Mappings

| Djed Package | Replacement | Version |
|--------------|-------------|---------|
| @djed/logger | winston | ^3.11.0 |
| @djed/validator | ajv + ajv-formats | ^8.12.0 |
| @djed/mcp-base | @modelcontextprotocol/sdk | ^1.0.0 |
| @djed/shared-types | Copy types locally | n/a |

### Why Ejection Matters

- ✅ **No vendor lock-in** - Switch to raw dependencies anytime
- ✅ **Clear migration path** - Automated guide generation
- ✅ **Preserve functionality** - Code continues working
- ✅ **No hidden costs** - Ejection is free and documented

---

## Examples

### Example 1: Create TextMate MCP Server

```bash
# Step 1: Initialize project
djed init mcp-server textmate --port 3001

# Step 2: Add packages
cd textmate
djed add logger
djed add validator

# Step 3: Start development
npm run dev
```

**Time**: 3 minutes (vs 4-6 hours manual setup)

---

### Example 2: Eject Logger

```bash
# Preview what will change
djed eject logger --dry-run

# Review the migration plan
# ...

# Perform ejection
djed eject logger

# Follow migration guide
cat EJECT-LOGGER.md

# Update code manually
# Test application
npm test
```

**Time**: 15 minutes (vs 1+ hour figuring it out)

---

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| TextMate init | < 5 minutes | ✅ ~3 minutes |
| Khepri init | < 5 minutes | ✅ ~3 minutes |
| Eject path | < 30 minutes | ✅ ~15 minutes |
| Error messages | Clear & helpful | ✅ Implemented |

---

## Troubleshooting

### "Template not found"

**Cause**: Template directory missing or CLI not built

**Solution**:
```bash
cd packages/cli
npm run build
npm link  # For global testing
```

---

### "Not in a project directory"

**Cause**: Running `djed add` or `djed eject` outside a project

**Solution**:
```bash
# Check for package.json
ls package.json

# Or create project first
djed init mcp-server my-project
cd my-project
djed add logger
```

---

### "Invalid project name"

**Cause**: Project name doesn't follow npm naming rules

**Solution**:
```bash
# ✅ Good names
djed init mcp-server my-project
djed init mcp-server textmate
djed init mcp-server khepri

# ❌ Bad names
djed init mcp-server My-Project  # No uppercase
djed init mcp-server my_project! # No special chars
```

---

## Architecture

```
@djed/cli/
├── src/
│   ├── index.ts              # CLI entry point (commander)
│   ├── commands/
│   │   ├── init.ts           # Initialize project
│   │   ├── add.ts            # Add package
│   │   └── eject.ts          # Eject package
│   ├── utils/
│   │   ├── logger.ts         # Logging utilities
│   │   ├── validators.ts     # Input validation
│   │   └── template.ts       # Handlebars processing
│   └── templates/            # Template metadata
├── dist/                     # Compiled output
└── package.json
```

---

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Watch Mode

```bash
npm run dev
```

### Link for Local Testing

```bash
npm link
djed --help
```

---

## Related

- [Djed Main README](../../README.md) - Project overview
- [IMPROVEMENT-ROADMAP.md](../../IMPROVEMENT-ROADMAP.md) - Phase 1.5 plan
- [CET-276](https://linear.app/ceti-luxor/issue/CET-276) - Linear issue

---

## License

MIT

---

**Status**: ✅ Production Ready
**Created**: 2025-11-04
**Part of**: Djed Phase 1.5 (Critical Path)

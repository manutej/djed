# Djed Claude Configuration

**The Stable Pillar** - Infrastructure foundation for LUXOR projects

**Repository**: `/Users/manu/Documents/LUXOR/djed`
**Purpose**: Shared infrastructure packages and templates
**Version**: Phase 1.5 (preparing for TextMate/Khepri integration)

---

## Project Context

Djed provides the shared infrastructure foundation for all LUXOR projects through:

### Core Packages (npm)
- **@djed/logger** (v0.1.0) - Structured logging with Winston wrapper
- **@djed/mcp-base** - MCP server base class
- **@djed/validator** - JSON schema validation with Ajv wrapper
- **@djed/shared-types** - Common TypeScript type definitions

### Templates (Scaffolding)
- **mcp-server** - MCP protocol servers (L1/L2/L3 complexity)
- **docker-service** - Containerized services
- **github-action** - CI/CD workflows

### Philosophy
- **Zero lock-in** - Projects can eject and own their code
- **Progressive APIs** - L1 (novice) → L2 (intermediate) → L3 (expert)
- **Performance-first** - < 10KB packages, < 10ms init time
- **Test everything** - 80%+ coverage, contract tests for APIs

---

## Specification Framework

### Constitutional Principles
Located in `.specify/constitution.md`:
1. Zero Lock-In Philosophy
2. Progressive API Design
3. Performance-First Architecture
4. TypeScript Strict Mode
5. Testing Excellence
6. Documentation as Code
7. Versioning & Breaking Changes
8. Security Standards
9. Operational Excellence

### Specifications
Located in `.specify/specs/`:
- **phase-1.5-improvements.md** - Critical improvements before TextMate/Khepri
- **package-architecture.md** - Design for 4 core packages
- **template-system.md** - Scaffolding and generation framework

---

## Essential Skills

The following skills from `~/.claude/skills/` are critical for djed development:

### Core Development
- **typescript-fp** - TypeScript functional programming patterns
- **nodejs-development** - Node.js backend development
- **docker-compose-orchestration** - Container orchestration

### Testing & Quality
- **jest-react-testing** - Testing with Jest/Vitest
- **pytest-patterns** - Testing patterns (applicable to JS/TS)
- **shell-testing-framework** - Testing CLI tools

### Documentation
- **spec-driven-development** - Specification-first approach (core methodology)

---

## Key Agents

These agents from `~/.claude/agents/` are most relevant for djed:

### Primary Agents
- **spec-driven-development-expert** - Drives specification-first methodology
- **practical-programmer** - Implements packages and templates efficiently
- **test-engineer** - Ensures comprehensive test coverage

### Supporting Agents
- **docs-generator** - Creates documentation from specifications
- **code-craftsman** - Ensures code quality and patterns

---

## Development Workflow

### 1. Specification Phase
```bash
# Use spec-driven-development-expert
- Review .specify/constitution.md
- Update .specify/specs/* as needed
- Validate against constitutional principles
```

### 2. Implementation Phase
```bash
# Use practical-programmer
- Implement according to specifications
- Follow Progressive API pattern (L1→L2→L3)
- Maintain zero lock-in design
```

### 3. Testing Phase
```bash
# Use test-engineer
- Write contract tests for APIs
- Achieve 80%+ coverage
- Run performance benchmarks
```

### 4. Documentation Phase
```bash
# Use docs-generator
- Generate API docs from TypeScript
- Validate all examples run
- Update README and guides
```

---

## Current Focus: Phase 1.5

### Critical Improvements (3-5 days)
Before TextMate and Khepri adopt djed:

1. **Performance Benchmarking** ⚡
   - Add benchmark suite for all packages
   - Establish baselines in PERFORMANCE.md
   - CI integration to prevent regressions

2. **Djed CLI Tool** 🛠️
   - `djed init` for project scaffolding
   - Template variable substitution
   - Interactive prompts

3. **Contract Testing** 📋
   - L1 API contracts (never break)
   - Backward compatibility validation
   - CI enforcement

4. **Error Recovery** 🔄
   - Graceful degradation patterns
   - Circuit breakers
   - Fallback mechanisms

5. **Production Observability** 📊
   - Health check endpoints
   - Prometheus metrics
   - Structured logging

---

## Quality Gates

All changes must pass:

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- No @ts-ignore comments
- Bundle size < limits

### Testing
- Unit coverage > 80%
- Contract tests pass
- Performance benchmarks pass
- Documentation examples run

### Security
- npm audit clean
- No hardcoded secrets
- Input validation

### Performance
- Bundle size < 10KB per package
- Init time < 10ms
- No performance regressions > 20%

---

## Project Structure

```
djed/
├── .specify/                 # Specification framework
│   ├── constitution.md      # 9 immutable principles
│   └── specs/              # Detailed specifications
├── packages/               # npm packages
│   ├── logger/            # @djed/logger (published)
│   ├── mcp-base/          # @djed/mcp-base
│   ├── validator/         # @djed/validator
│   ├── shared-types/      # @djed/shared-types
│   └── cli/              # @djed/cli (Phase 1.5)
├── templates/            # Project scaffolding
│   ├── mcp-server/       # MCP server template
│   ├── docker-service/   # Docker template
│   └── github-action/    # GitHub Actions template
├── benchmarks/          # Performance benchmarks (Phase 1.5)
├── docs/               # Architecture and guides
└── examples/           # Working examples
```

---

## Commands & Scripts

### Development
```bash
npm run dev        # Watch mode development
npm run build      # Build all packages
npm run test       # Run test suite
npm run bench      # Run performance benchmarks
npm run lint       # Lint and format
```

### Publishing
```bash
npm run publish:logger     # Publish @djed/logger
npm run publish:all        # Publish all packages
```

### Templates
```bash
djed init mcp-server      # Create MCP server project
djed add logger          # Add @djed/logger to project
djed eject logger        # Remove djed, keep functionality
```

---

## Integration Points

### Current Users
- **TextMate** - Messaging automation (awaiting Phase 1.5)
- **Khepri** - MCP-to-workflow bridge (awaiting Phase 1.5)

### Future Users
- BARQUE (PDF generation)
- LUMINA (Documentation)
- LUMOS (Multi-agent)
- 5+ upcoming LUXOR projects

---

## Success Metrics

### Phase 1 Complete ✅
- @djed/logger v0.1.0 published
- 100% test coverage
- Comprehensive documentation

### Phase 1.5 Goals (Current)
- Performance baselines established
- CLI tool operational
- Contract tests enforced
- TextMate/Khepri successfully integrated

### Phase 2 Goals (Future)
- All 4 packages published
- 3+ projects using djed
- 100+ npm downloads/week

---

## Resources

### Documentation
- [SPECIFICATION.md](/Users/manu/Documents/LUXOR/djed/SPECIFICATION.md) - Original spec
- [IMPROVEMENT-ROADMAP.md](/Users/manu/Documents/LUXOR/djed/IMPROVEMENT-ROADMAP.md) - Improvement plan
- [docs/ARCHITECTURE.md](/Users/manu/Documents/LUXOR/djed/docs/ARCHITECTURE.md) - System architecture

### Constitutional Framework
- [.specify/constitution.md](/Users/manu/Documents/LUXOR/djed/.specify/constitution.md) - 9 principles
- [.specify/specs/](/Users/manu/Documents/LUXOR/djed/.specify/specs/) - Detailed specifications

---

## Notes

- **Philosophy**: "Start in minutes, scale to millions, own it forever"
- **Approach**: Specification-driven development with constitutional principles
- **Quality**: Performance-first, test everything, document completely
- **Lock-in**: Zero - projects can eject and own their code

---

**Status**: Phase 1.5 in progress
**Last Updated**: 2025-11-17
**Maintainer**: LUXOR Infrastructure Team
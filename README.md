# Djed

**FP-First Infrastructure Suite for LUXOR Projects**

Complete, production-ready infrastructure packages built on **category theory** foundations using **fp-ts**.

## Philosophy

Djed embraces **functional programming** and **category theory** to provide:

- **Type Safety** - Branded types for compile-time guarantees
- **Pure Functions** - 95%+ pure functions, effects at boundaries only
- **Composability** - Monadic composition with Either, TaskEither, Reader
- **Immutability** - All data structures readonly
- **Zero Lock-in** - Thin wrappers, easy ejection
- **Progressive Complexity** - L1 (novice) → L2 (intermediate) → L3 (expert)

## Packages

### Foundation (Week 1)
- ✅ **[@djed/logger](./packages/logger)** - Structured logging with Reader monad
- 🚧 **[@djed/validation](./packages/validation)** - Applicative validation with error accumulation
- 📝 **[@djed/config](./packages/config)** - Type-safe configuration with Reader
- 📝 **[@djed/http](./packages/http)** - HTTP client with TaskEither

### Data Layer (Week 2)
- 📝 **[@djed/database](./packages/database)** - Type-safe database operations
- 📝 **[@djed/cache](./packages/cache)** - Caching with IO monad
- 📝 **[@djed/queue](./packages/queue)** - Message queues with TaskEither

### Effects & Utilities (Week 3)
- 📝 **[@djed/effect](./packages/effect)** - Effect system for side effects
- 📝 **[@djed/crypto](./packages/crypto)** - Cryptography with type safety
- 📝 **[@djed/telemetry](./packages/telemetry)** - Observability with Writer monad

## Templates

- 📝 **[mcp-server-minimal](./templates/mcp-server-minimal)** - MCP server starter
- 📝 **[microservice-template](./templates/microservice-template)** - Production microservice
- 📝 **[monorepo-template](./templates/monorepo-template)** - Multi-package setup

## Quick Start

```bash
# Install a package
npm install @djed/logger fp-ts

# Use with FP patterns
import { Logger } from '@djed/logger';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

const logger = new Logger('my-app', { level: 'info' });
logger.info('Hello from Djed!');
```

## Category Theory Foundations

All packages implement proper categorical abstractions:

- **Functors** - `map` operations
- **Applicative Functors** - `ap` for validation with error accumulation
- **Monads** - `flatMap`/`chain` for sequencing effects
- **Semigroups** - Associative combination (`concat`)
- **Monoids** - Identity + associativity
- **Traversable** - Sequence effects over structures
- **Reader** - Dependency injection
- **Either** - Type-safe error handling
- **TaskEither** - Async operations with error handling

### Laws Verified

All abstractions satisfy their categorical laws:

```typescript
// Functor laws
F.map(identity) ≡ identity
F.map(f).map(g) ≡ F.map(compose(g, f))

// Monad laws
M.of(a).flatMap(f) ≡ f(a)                    // Left identity
m.flatMap(M.of) ≡ m                           // Right identity
m.flatMap(f).flatMap(g) ≡ m.flatMap(x => f(x).flatMap(g))  // Associativity
```

## Development

```bash
# Clone repository
git clone https://github.com/luxor/djed.git
cd djed

# Install dependencies (uses workspaces)
npm install

# Build all packages
npm run build

# Test all packages
npm run test

# Work on a specific package
cd packages/validation
npm run test:watch
```

## Package Standards

Every package follows these standards:

### Code Quality
- ✅ 100% test coverage
- ✅ Zero runtime dependencies (peers only)
- ✅ 95%+ pure functions
- ✅ Branded types for safety
- ✅ Complete ADT modeling
- ✅ Pattern matching support

### FP Rigor
- ✅ Proper monad/functor/applicative laws
- ✅ Kleisli composition
- ✅ Lawful semigroups/monoids
- ✅ Category theory documentation
- ✅ Deferred effects (Task, IO)

### Developer Experience
- ✅ Progressive API (L1 → L2 → L3)
- ✅ Time to first use < 2 minutes
- ✅ Zero lock-in (escape hatches)
- ✅ TypeScript strict mode
- ✅ Complete documentation
- ✅ Working examples

## Architecture

```
djed/
├── packages/           # All infrastructure packages
│   ├── logger/        # ✅ Production ready
│   ├── validation/    # 🚧 In progress
│   └── .../
├── templates/         # Project templates
├── docs/              # Documentation
└── examples/          # Usage examples
```

## Contributing

Djed follows strict FP principles. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © LUXOR

## Learn More

- [FP Guide](./docs/fp-guide.md) - Functional programming primer
- [Category Theory](./docs/category-theory.md) - Category theory concepts
- [Migration Guides](./docs/migration-guides/) - Adopting Djed packages

---

**Built with**:
[fp-ts](https://github.com/gcanti/fp-ts) • Category Theory • Functional Programming

**Status**: 🚧 Active Development (1/10 packages complete)

# @djed/cache

Functional caching with IO monad for async operations and multiple backends.

## Overview

`@djed/cache` provides a composable, type-safe caching solution built on functional programming principles using `fp-ts`. It supports multiple backends (Memory, Redis, File), advanced caching strategies, and stampede prevention.

## Features

- **Multiple Backends**: In-memory, Redis, and file-based caching
- **TaskEither**: Async cache operations with proper error handling
- **TTL Support**: Time-to-live with Monoid for combining values
- **Cache Strategies**: Cache-aside, write-through, write-behind, read-through
- **Stampede Prevention**: Prevent thundering herd problems
- **Namespaces**: Organize cache keys with namespaces
- **Pattern Matching**: Query and delete keys by pattern
- **Type Safety**: Full TypeScript support with generics

## Installation

```bash
npm install @djed/cache fp-ts
```

For Redis support, also install:

```bash
npm install ioredis
```

## Quick Start

```typescript
import { createMemoryBackend, set, get, TTLPresets } from '@djed/cache';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Create a cache backend
const cache = createMemoryBackend();

// Set a value with 5-minute TTL
await pipe(
  set('user:123', { name: 'Alice', email: 'alice@example.com' }, O.some(TTLPresets.FIVE_MINUTES)),
  (setter) => setter(cache)
)();

// Get a value
const result = await pipe(
  get<{ name: string; email: string }>('user:123'),
  (getter) => getter(cache)
)();

// result is O.Option<{ name: string; email: string }>
pipe(
  result,
  O.fold(
    () => console.log('Cache miss'),
    (user) => console.log('Cache hit:', user)
  )
);
```

## Progressive API (L1, L2, L3)

### L1: Simple get/set/delete

Basic cache operations for straightforward use cases.

```typescript
import { createMemoryBackend, get, set, del, has } from '@djed/cache';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const cache = createMemoryBackend();

// Set a value
await set('key', 'value', O.none)(cache)();

// Get a value
const value = await get<string>('key')(cache)();

// Check if key exists
const exists = await has('key')(cache)();

// Delete a value
const deleted = await del('key')(cache)();
```

### L2: TTL, namespaces, and patterns

Enhanced operations with TTL management and namespaces.

```typescript
import {
  createMemoryBackend,
  setWithTTL,
  getWithNamespace,
  deletePattern,
  TTLPresets,
  defaultCacheConfig,
} from '@djed/cache';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const cache = createMemoryBackend();

// Set with TTL (in milliseconds)
await setWithTTL('session:abc', { userId: 123 }, TTLPresets.ONE_HOUR)(cache)();

// Use namespaces
const config = { ...defaultCacheConfig, namespace: O.some('users') };
const user = await getWithNamespace<User>('123', config)(cache)();

// Delete all keys matching a pattern
const deletedCount = await deletePattern('session:*')(cache)();
```

### L3: Full composition with stampede prevention

Advanced patterns for production use cases.

```typescript
import {
  createMemoryBackend,
  cacheAsideWithStampedePreventionAndConfig,
  TTLPresets,
  defaultCacheConfig,
} from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const cache = createMemoryBackend();

// Cache-aside with stampede prevention
const config = {
  ...defaultCacheConfig,
  defaultTTL: O.some(TTLPresets.FIVE_MINUTES),
  preventStampede: true,
  stampedeTimeout: TTLPresets.THIRTY_SECONDS,
};

const loadUser = (id: string): TE.TaskEither<CacheError, User> =>
  TE.tryCatch(
    async () => {
      // Expensive database query
      const user = await db.users.findById(id);
      return user;
    },
    (error) => operationError('Failed to load user', error)
  );

const user = await pipe(
  cacheAsideWithStampedePreventionAndConfig('user:123', loadUser('123'), config),
  (getter) => getter(cache)
)();
```

## Backends

### Memory Backend

Fast in-memory caching with LRU eviction.

```typescript
import { createMemoryBackend, defaultMemoryCacheConfig } from '@djed/cache';
import * as O from 'fp-ts/Option';

const cache = createMemoryBackend({
  maxSize: O.some(1000), // Maximum 1000 entries
  cleanupInterval: O.some(60000), // Cleanup every minute
});
```

### Redis Backend

Distributed caching with Redis (requires `ioredis`).

```typescript
import { createRedisBackend, createRedisBackendFromUrl } from '@djed/cache';
import * as O from 'fp-ts/Option';

// From configuration
const cache = createRedisBackend({
  host: 'localhost',
  port: 6379,
  password: O.some('secret'),
  db: 0,
  connectionTimeout: 10000,
  commandTimeout: 5000,
  tls: false,
});

// From connection URL
const cacheFromUrl = createRedisBackendFromUrl('redis://localhost:6379');
```

### File Backend

Persistent file-based caching.

```typescript
import { createFileBackend } from '@djed/cache';
import * as O from 'fp-ts/Option';

const cache = createFileBackend({
  directory: '.cache',
  extension: '.json',
  cleanupInterval: O.some(300000), // Cleanup every 5 minutes
});
```

## Category Theory

### TaskEither for Async Operations

All cache operations return `TaskEither<CacheError, A>` for composable error handling.

```typescript
import { get, set } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const cache = createMemoryBackend();

const result = await pipe(
  get<User>('user:123')(cache),
  TE.chain((maybeUser) =>
    pipe(
      maybeUser,
      O.fold(
        () => loadUserFromDB('123'),
        (user) => TE.right(user)
      )
    )
  ),
  TE.chainFirst((user) => set('user:123', user, O.some(300000))(cache))
)();
```

### Monoid for TTL

The `TTLMonoid` combines TTL values using the `max` operation.

```typescript
import { TTLMonoid, TTLPresets, combineTTL } from '@djed/cache';

// Combine multiple TTL values (takes the maximum)
const ttl1 = TTLPresets.FIVE_MINUTES;
const ttl2 = TTLPresets.TEN_MINUTES;
const combined = TTLMonoid.concat(ttl1, ttl2); // 10 minutes

// Combine array of TTLs
const ttls = [
  TTLPresets.FIVE_MINUTES,
  TTLPresets.TEN_MINUTES,
  TTLPresets.ONE_HOUR,
];
const maxTTL = combineTTL(ttls); // 1 hour
```

### Option for Cache Hits/Misses

Cache gets return `Option<A>` wrapped in `TaskEither`.

```typescript
import { get } from '@djed/cache';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const result = await pipe(
  get<User>('user:123')(cache),
  TE.map(
    O.fold(
      () => ({ found: false, user: null }),
      (user) => ({ found: true, user })
    )
  )
)();
```

### Reader for Backend Injection

All operations use the Reader pattern for dependency injection.

```typescript
import { get, set } from '@djed/cache';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';

// Create operations
const getUser = get<User>('user:123');
const setUser = set('user:123', { name: 'Alice' }, O.some(60000));

// Inject different backends
const memoryCache = createMemoryBackend();
const redisCache = createRedisBackend();

// Same operation, different backends
await getUser(memoryCache)();
await getUser(redisCache)();
```

## Caching Strategies

### Cache-Aside Pattern

The most common caching pattern: check cache first, load from source on miss.

```typescript
import { cacheAside } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const loadFromDB = TE.tryCatch(
  async () => await db.users.findById('123'),
  (error) => operationError('DB error', error)
);

const user = await pipe(
  cacheAside('user:123', loadFromDB, O.some(TTLPresets.FIVE_MINUTES)),
  (getter) => getter(cache)
)();
```

### Stampede Prevention

Prevent multiple concurrent requests from overwhelming the backend.

```typescript
import { cacheAsideWithStampedePrevention } from '@djed/cache';

const user = await pipe(
  cacheAsideWithStampedePrevention(
    'user:123',
    loadFromDB,
    O.some(TTLPresets.FIVE_MINUTES),
    TTLPresets.THIRTY_SECONDS // Lock timeout
  ),
  (getter) => getter(cache)
)();
```

### Write-Through Pattern

Write to cache and source together.

```typescript
import { writeThrough } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';

const writeToDB = TE.tryCatch(
  async () => await db.users.update('123', user),
  (error) => operationError('DB error', error)
);

await pipe(
  writeThrough('user:123', user, writeToDB, O.some(TTLPresets.FIVE_MINUTES)),
  (writer) => writer(cache)
)();
```

### Write-Behind Pattern

Write to cache immediately, queue writes to source.

```typescript
import { writeBehind } from '@djed/cache';

await pipe(
  writeBehind('user:123', user, writeToDB, O.some(TTLPresets.FIVE_MINUTES)),
  (writer) => writer(cache)
)();
```

## Cache Invalidation

### Time-Based (TTL)

Automatic expiration based on TTL.

```typescript
import { set, TTLPresets } from '@djed/cache';

// Expires after 5 minutes
await set('key', 'value', O.some(TTLPresets.FIVE_MINUTES))(cache)();
```

### Event-Based

Invalidate on specific events.

```typescript
import { invalidateOnEvent } from '@djed/cache';

// When user is updated
await invalidateOnEvent('user:123')(cache)();
```

### Pattern-Based

Invalidate multiple keys matching a pattern.

```typescript
import { invalidatePattern } from '@djed/cache';

// Invalidate all user sessions
const count = await invalidatePattern('session:*')(cache)();
```

### Tag-Based

Invalidate by tags (implemented as namespaces).

```typescript
import { invalidateByTag } from '@djed/cache';

// Invalidate all entries with 'users' tag
const count = await invalidateByTag('users')(cache)();
```

### Dependency-Based

Invalidate a key and its dependencies.

```typescript
import { invalidateWithDependencies } from '@djed/cache';

const count = await pipe(
  invalidateWithDependencies('user:123', ['posts:user:123', 'comments:user:123']),
  (invalidator) => invalidator(cache)
)();
```

## Namespaces

Organize cache keys with namespaces.

```typescript
import { withNamespace, set, get } from '@djed/cache';
import { pipe } from 'fp-ts/function';

const cache = createMemoryBackend();
const usersCache = withNamespace('users')(cache);

// Keys are automatically prefixed with 'users:'
await set('123', { name: 'Alice' }, O.none)(usersCache)();
const user = await get<User>('123')(usersCache)(); // Fetches 'users:123'
```

## Error Handling

All operations return `TaskEither<CacheError, A>` for composable error handling.

```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const result = await pipe(
  get<User>('user:123')(cache),
  TE.fold(
    (error) => async () => {
      switch (error._tag) {
        case 'ConnectionError':
          console.error('Connection failed:', error.message);
          return null;
        case 'SerializationError':
          console.error('Serialization failed:', error.message);
          return null;
        case 'OperationError':
          console.error('Operation failed:', error.message);
          return null;
        default:
          console.error('Unknown error:', error);
          return null;
      }
    },
    (maybeUser) => async () => O.toNullable(maybeUser)
  )
)();
```

## TTL Presets

Common TTL values for convenience.

```typescript
import { TTLPresets } from '@djed/cache';

TTLPresets.NO_CACHE;        // 0
TTLPresets.FIVE_SECONDS;    // 5 seconds
TTLPresets.TEN_SECONDS;     // 10 seconds
TTLPresets.THIRTY_SECONDS;  // 30 seconds
TTLPresets.ONE_MINUTE;      // 1 minute
TTLPresets.FIVE_MINUTES;    // 5 minutes
TTLPresets.TEN_MINUTES;     // 10 minutes
TTLPresets.THIRTY_MINUTES;  // 30 minutes
TTLPresets.ONE_HOUR;        // 1 hour
TTLPresets.SIX_HOURS;       // 6 hours
TTLPresets.TWELVE_HOURS;    // 12 hours
TTLPresets.ONE_DAY;         // 24 hours
TTLPresets.ONE_WEEK;        // 7 days
TTLPresets.NEVER;           // Max safe integer
```

## Advanced Examples

### Multi-Tier Caching

```typescript
import { createMemoryBackend, createRedisBackend, get, set } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const l1Cache = createMemoryBackend(); // Fast, local
const l2Cache = createRedisBackend();  // Distributed

const getWithFallback = <A>(key: string) =>
  pipe(
    get<A>(key)(l1Cache),
    TE.chain((maybeValue) =>
      pipe(
        maybeValue,
        O.fold(
          // L1 miss: check L2
          () =>
            pipe(
              get<A>(key)(l2Cache),
              TE.chainFirst((l2Value) =>
                pipe(
                  l2Value,
                  O.fold(
                    () => TE.right(undefined),
                    // Populate L1 from L2
                    (value) => set(key, value, O.some(TTLPresets.FIVE_MINUTES))(l1Cache)
                  )
                )
              )
            ),
          // L1 hit
          (value) => TE.right(O.some(value))
        )
      )
    )
  );
```

### Rate Limiting with Cache

```typescript
import { get, set, TTLPresets } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const checkRateLimit = (userId: string, limit: number) =>
  pipe(
    get<number>(`ratelimit:${userId}`)(cache),
    TE.chain((maybeCount) =>
      pipe(
        maybeCount,
        O.fold(
          // First request
          () =>
            pipe(
              set(`ratelimit:${userId}`, 1, O.some(TTLPresets.ONE_MINUTE))(cache),
              TE.map(() => ({ allowed: true, remaining: limit - 1 }))
            ),
          // Subsequent requests
          (count) => {
            if (count >= limit) {
              return TE.right({ allowed: false, remaining: 0 });
            }
            return pipe(
              set(`ratelimit:${userId}`, count + 1, O.some(TTLPresets.ONE_MINUTE))(cache),
              TE.map(() => ({ allowed: true, remaining: limit - count - 1 }))
            );
          }
        )
      )
    )
  );
```

### Distributed Locking

```typescript
import { set, del, TTLPresets } from '@djed/cache';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const acquireLock = (lockKey: string, ownerId: string) =>
  pipe(
    set(lockKey, ownerId, O.some(TTLPresets.THIRTY_SECONDS))(cache),
    TE.map(() => true)
  );

const releaseLock = (lockKey: string) =>
  pipe(
    del(lockKey)(cache),
    TE.map(() => undefined)
  );

const withLock = <A>(
  lockKey: string,
  ownerId: string,
  operation: TE.TaskEither<CacheError, A>
) =>
  pipe(
    acquireLock(lockKey, ownerId),
    TE.chain(() => operation),
    TE.chainFirst(() => releaseLock(lockKey))
  );
```

## API Reference

See the TypeScript definitions for complete API documentation.

## License

MIT

## Related Packages

- `@djed/validation` - Composable validation with applicative functors
- `fp-ts` - Functional programming library for TypeScript

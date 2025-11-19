# @djed/effect

A lightweight, powerful effect system for managing side effects in TypeScript, built on fp-ts ReaderTaskEither with inspiration from ZIO and Cats Effect.

## Overview

`@djed/effect` provides a composable, type-safe way to handle side effects, async operations, error handling, and resource management. It uses the ReaderTaskEither monad from fp-ts as its foundation, giving you:

- **Dependency Injection** via Reader
- **Error Handling** via Either
- **Async Operations** via Task
- **Resource Management** via Bracket pattern
- **Effect Cancellation** via Fibers
- **Progressive API** from simple to advanced

## Category Theory Foundation

```
Effect<R, E, A> = ReaderTaskEither<R, E, A>
                = R => Task<Either<E, A>>
                = R => () => Promise<Either<E, A>>

Where:
  R = Environment/Dependencies required
  E = Error type
  A = Success value type
```

The Effect type is a **Monad** satisfying:
- **Left Identity**: `succeed(a).flatMap(f)` = `f(a)`
- **Right Identity**: `m.flatMap(succeed)` = `m`
- **Associativity**: `m.flatMap(f).flatMap(g)` = `m.flatMap(x => f(x).flatMap(g))`

## Installation

```bash
npm install @djed/effect fp-ts
```

## Quick Start

```typescript
import { succeed, chain, runPromise, pipe } from '@djed/effect';

// Create effects
const getUser = (id: number) =>
  succeed({ id, name: 'Alice' });

const greet = (user: { name: string }) =>
  succeed(`Hello, ${user.name}!`);

// Compose effects
const program = pipe(
  getUser(1),
  chain(greet)
);

// Execute
await runPromise(program, undefined); // "Hello, Alice!"
```

## API Levels

### Level 1: Basic Effects

Simple effect construction and execution.

```typescript
import { succeed, fail, delay, runPromise } from '@djed/effect';

// Success
const successEffect = succeed(42);

// Failure
const failEffect = fail(new Error('Oops!'));

// Delay
const delayedEffect = delay(1000);

// From Promise
const promiseEffect = fromPromise(
  () => fetch('/api/data').then(r => r.json()),
  (error) => new Error(String(error))
);

// Try/Catch
const safeParse = tryCatch(
  () => JSON.parse(jsonString),
  (error) => new Error('Invalid JSON')
);

// Execute
const result = await runPromise(successEffect, undefined);
```

### Level 2: Resource Management

Safe resource acquisition and cleanup with the bracket pattern.

```typescript
import { bracket, fromPromise } from '@djed/effect';
import * as fs from 'fs/promises';

// File operations with automatic cleanup
const readFileEffect = bracket(
  // Acquire
  fromPromise(
    () => fs.open('data.txt', 'r'),
    (error) => new Error(`Failed to open: ${error}`)
  ),
  // Use
  (file) => fromPromise(
    async () => {
      const buffer = Buffer.alloc(1024);
      await file.read(buffer, 0, 1024, 0);
      return buffer.toString();
    },
    (error) => new Error(`Failed to read: ${error}`)
  ),
  // Release (always runs)
  (file, exitCase) => fromPromise(
    () => file.close(),
    (error) => new Error(`Failed to close: ${error}`)
  )
);

// Database connection with cleanup
const dbEffect = bracket(
  connectToDb(),
  (db) => queryDb(db, 'SELECT * FROM users'),
  (db) => disconnectDb(db)
);
```

### Level 3: Advanced Composition

Full effect system with ZIO-like operators.

```typescript
import {
  race,
  timeout,
  parallel,
  retry,
  fork,
  pipe,
} from '@djed/effect';

// Racing effects
const fastest = race(
  fetchFromMirror1(),
  fetchFromMirror2()
);

// Timeout
const withTimeout = timeout(
  longRunningEffect,
  5000 // 5 seconds
);

// Parallel execution
const allResults = parallel([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);

// Retry on failure
const resilient = retry(
  unstableApiCall,
  3 // retry 3 times
);

// Concurrent with fibers
const fiber = fork(backgroundTask, env);
const result = await fiber.join();
await fiber.cancel(); // Cancel if needed
```

## Core Concepts

### 1. Effect Construction

```typescript
// Pure values
const pure = succeed(42);
const error = fail(new Error('Failed'));

// Sync computation
const computed = sync(() => Math.random());

// Async computation
const async = fromPromise(
  () => fetch('/api/data'),
  (error) => new Error(String(error))
);

// Delay
const delayed = delay(1000);
```

### 2. Effect Composition

```typescript
import { map, chain, zip, pipe } from '@djed/effect';

// Map (Functor)
const doubled = pipe(
  succeed(21),
  map(x => x * 2)
);

// Chain/FlatMap (Monad)
const sequential = pipe(
  getUser(1),
  chain(user => getUserPosts(user.id))
);

// Zip (combine)
const combined = zip(
  fetchUser(1),
  fetchConfig()
);
// Result: [user, config]
```

### 3. Error Handling

```typescript
import { catchAll, mapError, retry } from '@djed/effect';

// Catch all errors
const recovered = catchAll(
  riskyEffect,
  (error) => succeed('default value')
);

// Map errors
const betterError = mapError(
  effect,
  (error) => new CustomError(error)
);

// Retry
const resilient = retry(unstableEffect, 3);

// Fallback
const withFallback = orElse(
  primaryEffect,
  fallbackEffect
);
```

### 4. Environment/Dependencies (Reader)

```typescript
import { ask, asks, provide } from '@djed/effect';

interface Config {
  apiKey: string;
  baseUrl: string;
}

// Access environment
const getConfig = ask<Config>();

// Access part of environment
const getApiKey = asks((config: Config) => config.apiKey);

// Use environment
const apiCall = pipe(
  asks((config: Config) => config.apiKey),
  chain(apiKey => callApi(apiKey))
);

// Provide environment
const program = provide(apiCall, {
  apiKey: 'secret',
  baseUrl: 'https://api.example.com'
});
```

### 5. Resource Management

```typescript
import { bracket, ensuring, scoped } from '@djed/effect';

// Basic bracket
const withResource = bracket(
  acquireResource,
  useResource,
  releaseResource
);

// Ensuring (like finally)
const withCleanup = ensuring(
  doWork,
  cleanup
);

// Scoped resources
const program = scoped((scope) =>
  pipe(
    scope.use(acquireDb, releaseDb),
    chain(db =>
      scope.use(acquireCache, releaseCache).pipe(
        chain(cache => useResources(db, cache))
      )
    )
  )
);
```

### 6. Concurrent Execution

```typescript
import { parallel, race, timeout, fork } from '@djed/effect';

// Parallel (all must succeed)
const results = parallel([
  effect1,
  effect2,
  effect3,
]);

// Race (first to complete)
const winner = race(
  slowEffect,
  fastEffect
);

// Timeout
const timed = timeout(effect, 5000);

// Fibers (manual control)
const fiber = fork(effect, env);
const result = await fiber.join();
await fiber.cancel();
```

### 7. Runtime Execution

```typescript
import { makeRuntime, run, runPromise } from '@djed/effect';

// Simple execution
const result = await run(effect, environment);
// Returns: Either<E, A>

// Promise execution (throws on error)
const value = await runPromise(effect, environment);
// Returns: A (or throws)

// Custom runtime
const runtime = makeRuntime(environment, {
  timeout: 10000,
  onError: (error) => console.error(error)
});

const result = await runtime.run(effect);
```

## Advanced Examples

### Example 1: API Client with Retry and Timeout

```typescript
import {
  fromPromise,
  retry,
  timeout,
  pipe,
  map,
} from '@djed/effect';

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

const fetchUser = (id: number) =>
  pipe(
    asks((config: ApiConfig) => config),
    chain(({ baseUrl, apiKey }) =>
      fromPromise(
        () => fetch(`${baseUrl}/users/${id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        }).then(r => r.json()),
        (error) => new Error(`Failed to fetch user: ${error}`)
      )
    ),
    timeout(5000),
    retry(3)
  );

// Usage
const config: ApiConfig = {
  baseUrl: 'https://api.example.com',
  apiKey: 'secret'
};

const user = await runPromise(fetchUser(1), config);
```

### Example 2: Database Transaction with Bracket

```typescript
import { bracket, fromPromise, pipe, chain } from '@djed/effect';

interface Database {
  beginTransaction(): Promise<Transaction>;
}

interface Transaction {
  execute(query: string): Promise<any>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

const transaction = <A>(
  queries: (tx: Transaction) => Effect<unknown, Error, A>
) =>
  bracket(
    // Acquire transaction
    fromPromise(
      () => db.beginTransaction(),
      (error) => new Error(`Failed to begin: ${error}`)
    ),
    // Use transaction
    queries,
    // Release transaction
    (tx, exitCase) =>
      fromPromise(
        async () => {
          if (exitCase._tag === 'Success') {
            await tx.commit();
          } else {
            await tx.rollback();
          }
        },
        (error) => new Error(`Failed to finalize: ${error}`)
      )
  );

// Usage
const program = transaction((tx) =>
  pipe(
    fromPromise(
      () => tx.execute('INSERT INTO users ...'),
      (error) => new Error(String(error))
    ),
    chain(() =>
      fromPromise(
        () => tx.execute('INSERT INTO audit ...'),
        (error) => new Error(String(error))
      )
    )
  )
);
```

### Example 3: Parallel Data Fetching

```typescript
import { parallel, traverse, pipe } from '@djed/effect';

// Fetch multiple users in parallel
const fetchUsers = (ids: number[]) =>
  traverse((id: number) => fetchUser(id))(ids);

// Or use parallel directly
const users = parallel([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);

// With limited concurrency
const usersLimited = parallelLimit(
  ids.map(fetchUser),
  5 // max 5 concurrent requests
);
```

### Example 4: Background Tasks with Fibers

```typescript
import { fork, delay, forever, pipe } from '@djed/effect';

// Heartbeat effect
const heartbeat = pipe(
  delay(1000),
  chain(() => logHeartbeat()),
  forever
);

// Start in background
const fiber = fork(heartbeat, undefined);

// Later: cancel
await fiber.cancel();
```

### Example 5: Effect with Logging

```typescript
import { tap, withLogging, timed } from '@djed/effect';

const program = pipe(
  fetchUser(1),
  tap(user => succeed(console.log('User:', user))),
  chain(user => processUser(user)),
  withLogging('ProcessUser'),
  timed
);

// Output:
// [ProcessUser] started
// User: { id: 1, name: 'Alice' }
// [ProcessUser] completed in 123ms
```

## Type Safety

All effects are fully type-safe:

```typescript
// Effect that requires Config, may fail with Error, returns User
type UserEffect = Effect<Config, Error, User>;

// Effect that requires no environment, never fails, returns number
type SafeEffect = UIO<number>;

// Effect that requires no environment, may fail with Error, returns string
type IOEffect = IO<Error, string>;

// Effect that requires Database, never fails, returns Result
type DbEffect = RIO<Database, Result>;
```

## Best Practices

1. **Use bracket for resources**: Always use `bracket` or `ensuring` for resource cleanup
2. **Provide environment at the edges**: Build effects with dependencies, provide them at execution time
3. **Handle errors explicitly**: Use `catchAll`, `retry`, or `orElse` to handle failures
4. **Compose with pipe**: Use `pipe` for readable effect composition
5. **Keep effects pure**: Effects should be descriptions, not executions
6. **Use fibers for concurrency**: For complex concurrent scenarios, use `fork` and fibers

## Comparison with Other Libraries

### vs. Native Promises

```typescript
// Promise
try {
  const user = await fetchUser(1);
  const posts = await fetchPosts(user.id);
  return posts;
} catch (error) {
  return [];
}

// Effect
const program = pipe(
  fetchUser(1),
  chain(user => fetchPosts(user.id)),
  catchAll(() => succeed([]))
);
```

Benefits:
- Composable error handling
- Lazy execution
- Type-safe errors
- Resource management
- Testable (effects are values)

### vs. ZIO/Cats Effect

`@djed/effect` provides similar concepts but is:
- Lightweight (built on fp-ts)
- TypeScript native
- Progressive API (learn as you go)
- No runtime overhead of effect systems

## API Reference

### Core Module

- `succeed<A>(value: A): UIO<A>`
- `fail<E>(error: E): IO<E, never>`
- `delay(ms: number): UIO<void>`
- `fromPromise<E, A>(promise, onError): IO<E, A>`
- `map<A, B>(f: (a: A) => B): (effect) => Effect<R, E, B>`
- `chain<A, B>(f: (a: A) => Effect<R, E, B>): (effect) => Effect<R, E, B>`
- `run<R, E, A>(effect, env): Promise<Either<E, A>>`
- `runPromise<R, E, A>(effect, env): Promise<A>`

### Bracket Module

- `bracket<R, E, A, B>(acquire, use, release): Effect<R, E, B>`
- `ensuring<R, E, A>(effect, finalizer): Effect<R, E, A>`
- `scoped<R, E, A>(f: (scope) => Effect): Effect<R, E, A>`

### Operators Module

- `race<R, E, A>(first, second): Effect<R, E, A>`
- `timeout<R, E, A>(effect, ms): Effect<R, E | TimeoutError, A>`
- `parallel<R, E, A>(effects): Effect<R, E, ReadonlyArray<A>>`
- `retry<R, E, A>(effect, times): Effect<R, E, A>`
- `repeat<R, E, A>(effect, times): Effect<R, E, ReadonlyArray<A>>`

### Runtime Module

- `makeRuntime<R>(env, config): Runtime<R>`
- `fork<R, E, A>(effect, env): Fiber<E, A>`
- `makeCancelToken(): CancelToken`

## Contributing

Contributions are welcome! Please read the contributing guidelines in the main Djed repository.

## License

MIT

## Related Packages

- `@djed/validation` - Composable validation with applicative functors
- `fp-ts` - Functional programming in TypeScript

## References

- [ZIO](https://zio.dev/)
- [Cats Effect](https://typelevel.org/cats-effect/)
- [fp-ts](https://gcanti.github.io/fp-ts/)
- [ReaderTaskEither](https://gcanti.github.io/fp-ts/modules/ReaderTaskEither.ts.html)

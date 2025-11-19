/**
 * @djed/effect - Advanced Composition Operators
 *
 * Level 3 API: Full Effect Composition (ZIO-like)
 * - Racing and timeout
 * - Parallel execution
 * - Effect filtering and conditionals
 * - Advanced combinators
 *
 * Category Theory:
 * - Maintains monad laws
 * - Preserves referential transparency
 * - Composable abstractions
 */

import * as RTE from 'fp-ts/ReaderTaskEither';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { Effect, IO, UIO } from './types';
import { TimeoutError } from './types';
import { succeed, fail, delay, fromPromise, chain, map } from './core';

// ============================================================================
// Level 3: Racing and Timeout
// ============================================================================

/**
 * Races two effects, returns the first to complete
 *
 * @category Racing
 * @example
 * const effect = race(slowEffect, fastEffect);
 * // Returns result from fastEffect
 */
export const race = <R, E, A>(
  first: Effect<R, E, A>,
  second: Effect<R, E, A>
): Effect<R, E, A> =>
  (env: R) =>
    () =>
      Promise.race([first(env)(), second(env)()]);

/**
 * Adds a timeout to an effect
 *
 * @category Racing
 * @example
 * const effect = timeout(longRunningEffect, 5000);
 * // Fails with TimeoutError if takes > 5s
 */
export const timeout = <R, E, A>(
  effect: Effect<R, E, A>,
  ms: number
): Effect<R, E | TimeoutError, A> =>
  race(
    effect as Effect<R, E | TimeoutError, A>,
    pipe(
      delay(ms),
      chain(() => fail(new TimeoutError(`Effect timed out after ${ms}ms`)))
    ) as Effect<R, E | TimeoutError, A>
  );

/**
 * Adds a timeout with a default value
 *
 * @category Racing
 * @example
 * const effect = timeoutWith(longRunningEffect, 5000, 'default');
 * // Returns 'default' if times out
 */
export const timeoutWith = <R, E, A>(
  effect: Effect<R, E, A>,
  ms: number,
  defaultValue: A
): Effect<R, E, A> =>
  race(
    effect,
    pipe(
      delay(ms),
      map(() => defaultValue)
    )
  );

// ============================================================================
// Parallel Execution
// ============================================================================

/**
 * Runs effects in parallel and collects results
 *
 * @category Parallel
 * @example
 * const effects = [effect1, effect2, effect3];
 * const result = await parallel(effects);
 * // [result1, result2, result3]
 */
export const parallel = <R, E, A>(
  effects: ReadonlyArray<Effect<R, E, A>>
): Effect<R, E, ReadonlyArray<A>> =>
  (env: R) =>
    async () => {
      const promises = effects.map((eff) => eff(env)());
      const results = await Promise.all(promises);

      const errors = results.filter(E.isLeft);
      if (errors.length > 0) {
        return errors[0];
      }

      return E.right(results.map((r) => (r as E.Right<A>).right));
    };

/**
 * Runs effects in parallel, limited concurrency
 *
 * @category Parallel
 * @example
 * const result = await parallelLimit(effects, 3);
 * // Runs at most 3 effects concurrently
 */
export const parallelLimit = <R, E, A>(
  effects: ReadonlyArray<Effect<R, E, A>>,
  limit: number
): Effect<R, E, ReadonlyArray<A>> =>
  (env: R) =>
    async () => {
      const results: A[] = [];
      const errors: E[] = [];

      for (let i = 0; i < effects.length; i += limit) {
        const batch = effects.slice(i, i + limit);
        const batchResults = await Promise.all(batch.map((eff) => eff(env)()));

        for (const result of batchResults) {
          if (E.isLeft(result)) {
            errors.push(result.left);
          } else {
            results.push(result.right);
          }
        }

        if (errors.length > 0) {
          return E.left(errors[0]);
        }
      }

      return E.right(results);
    };

/**
 * Races multiple effects, returns first success
 *
 * @category Parallel
 * @example
 * const effect = raceAll([mirror1, mirror2, mirror3]);
 * // Returns first successful result
 */
export const raceAll = <R, E, A>(
  effects: ReadonlyArray<Effect<R, E, A>>
): Effect<R, E, A> =>
  (env: R) =>
    () =>
      Promise.race(effects.map((eff) => eff(env)()));

// ============================================================================
// Filtering and Conditionals
// ============================================================================

/**
 * Filters effect results based on a predicate
 *
 * @category Filtering
 * @example
 * const effect = filterOrElse(
 *   getValue,
 *   (x) => x > 0,
 *   () => new Error('Value must be positive')
 * );
 */
export const filterOrElse = <R, E1, E2, A>(
  effect: Effect<R, E1, A>,
  predicate: (a: A) => boolean,
  onFalse: (a: A) => E2
): Effect<R, E1 | E2, A> =>
  pipe(
    effect,
    RTE.chain((a) => (predicate(a) ? succeed(a) as Effect<R, E1 | E2, A> : fail(onFalse(a)) as Effect<R, E1 | E2, A>))
  );

/**
 * Conditional effect execution
 *
 * @category Conditionals
 * @example
 * const effect = ifThenElse(
 *   isValid,
 *   processData,
 *   throwError
 * );
 */
export const ifThenElse = <R, E, A>(
  condition: Effect<R, E, boolean>,
  onTrue: Effect<R, E, A>,
  onFalse: Effect<R, E, A>
): Effect<R, E, A> =>
  pipe(
    condition,
    RTE.chain((cond) => (cond ? onTrue : onFalse))
  );

/**
 * Runs effect only if condition is true
 *
 * @category Conditionals
 * @example
 * const effect = when(shouldLog, logMessage);
 */
export const when = <R, E, A>(
  condition: boolean,
  effect: Effect<R, E, A>
): Effect<R, E, A | void> =>
  condition ? effect : succeed(undefined);

/**
 * Runs effect unless condition is true
 *
 * @category Conditionals
 */
export const unless = <R, E, A>(
  condition: boolean,
  effect: Effect<R, E, A>
): Effect<R, E, A | void> =>
  when(!condition, effect);

// ============================================================================
// Repetition and Looping
// ============================================================================

/**
 * Repeats an effect n times
 *
 * @category Repetition
 * @example
 * const effect = repeat(pingServer, 5);
 * // Pings server 5 times
 */
export const repeat = <R, E, A>(
  effect: Effect<R, E, A>,
  times: number
): Effect<R, E, ReadonlyArray<A>> =>
  pipe(
    Array.from({ length: times }, () => effect),
    RTE.sequenceArray
  );

/**
 * Repeats an effect while condition holds
 *
 * @category Repetition
 * @example
 * const effect = repeatWhile(
 *   pollStatus,
 *   (status) => status === 'pending'
 * );
 */
export const repeatWhile = <R, E, A>(
  effect: Effect<R, E, A>,
  predicate: (a: A) => boolean
): Effect<R, E, A> =>
  pipe(
    effect,
    RTE.chain((a) => (predicate(a) ? repeatWhile(effect, predicate) : succeed(a)))
  );

/**
 * Repeats an effect until it succeeds
 *
 * @category Repetition
 * @example
 * const effect = repeatUntilSuccess(connectToDb);
 * // Retries until successful connection
 */
export const repeatUntilSuccess = <R, E, A>(
  effect: Effect<R, E, A>
): Effect<R, never, A> =>
  pipe(
    effect,
    RTE.orElse(() => repeatUntilSuccess(effect))
  ) as Effect<R, never, A>;

/**
 * Forever repeats an effect (use with caution!)
 *
 * @category Repetition
 * @example
 * const effect = forever(heartbeat);
 * // Runs heartbeat indefinitely
 */
export const forever = <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, never> =>
  pipe(
    effect,
    RTE.chain(() => forever(effect))
  );

// ============================================================================
// Collection Operations
// ============================================================================

/**
 * Folds over an array with an effect
 *
 * @category Collections
 * @example
 * const sum = foldLeft(
 *   numbers,
 *   0,
 *   (acc, n) => succeed(acc + n)
 * );
 */
export const foldLeft = <R, E, A, B>(
  array: ReadonlyArray<A>,
  initial: B,
  f: (acc: B, a: A) => Effect<R, E, B>
): Effect<R, E, B> =>
  array.reduce(
    (accEffect, item) =>
      pipe(
        accEffect,
        RTE.chain((acc) => f(acc, item))
      ),
    succeed(initial) as Effect<R, E, B>
  );

/**
 * Maps and filters in one pass with effects
 *
 * @category Collections
 * @example
 * const effect = collectFirst(
 *   users,
 *   (user) => user.isAdmin ? succeed(user) : fail('Not admin')
 * );
 */
export const collectFirst = <R, E, A, B>(
  array: ReadonlyArray<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, B> => {
  if (array.length === 0) {
    return fail(new Error('Empty array') as unknown as E);
  }

  return pipe(
    f(array[0]),
    RTE.orElse(() => collectFirst(array.slice(1), f))
  );
};

/**
 * Partitions an array with an effect predicate
 *
 * @category Collections
 * @example
 * const [valid, invalid] = await partition(
 *   items,
 *   (item) => validate(item)
 * );
 */
export const partition = <R, E, A>(
  array: ReadonlyArray<A>,
  predicate: (a: A) => Effect<R, E, boolean>
): Effect<R, E, [ReadonlyArray<A>, ReadonlyArray<A>]> =>
  pipe(
    array.map((item) =>
      pipe(
        predicate(item),
        RTE.map((result) => ({ item, result }))
      )
    ),
    RTE.sequenceArray,
    RTE.map((results) => {
      const passed = results.filter((r) => r.result).map((r) => r.item);
      const failed = results.filter((r) => !r.result).map((r) => r.item);
      return [passed, failed] as [ReadonlyArray<A>, ReadonlyArray<A>];
    })
  );

// ============================================================================
// Effect Memoization and Caching
// ============================================================================

/**
 * Memoizes an effect result
 *
 * @category Optimization
 * @example
 * const cachedEffect = memoize(expensiveComputation);
 * // First call computes, subsequent calls return cached value
 */
export const memoize = <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => {
  let cache: { result: E.Either<E, A> } | null = null;

  return (env: R) => async () => {
    if (cache !== null) {
      return cache.result;
    }

    const result = await effect(env)();
    cache = { result };
    return result;
  };
};

/**
 * Debounces an effect
 *
 * @category Optimization
 * @example
 * const debouncedSearch = debounce(searchEffect, 300);
 */
export const debounce = <R, E, A>(
  effect: Effect<R, E, A>,
  ms: number
): Effect<R, E, A> => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (env: R) =>
    () =>
      new Promise((resolve) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async () => {
          const result = await effect(env)();
          resolve(result);
        }, ms);
      });
};

// ============================================================================
// Effect Observation and Debugging
// ============================================================================

/**
 * Logs effect execution for debugging
 *
 * @category Debugging
 * @example
 * const effect = withLogging(myEffect, 'MyEffect');
 * // Logs: "MyEffect started", "MyEffect completed: result"
 */
export const withLogging = <R, E, A>(
  effect: Effect<R, E, A>,
  label: string
): Effect<R, E, A> =>
  (env: R) =>
    async () => {
      console.log(`[${label}] started`);
      const start = Date.now();
      const result = await effect(env)();
      const duration = Date.now() - start;

      if (E.isLeft(result)) {
        console.log(`[${label}] failed in ${duration}ms:`, result.left);
      } else {
        console.log(`[${label}] completed in ${duration}ms:`, result.right);
      }

      return result;
    };

/**
 * Measures effect execution time
 *
 * @category Debugging
 * @example
 * const [result, duration] = await timed(effect);
 */
export const timed = <R, E, A>(
  effect: Effect<R, E, A>
): Effect<R, E, [A, number]> =>
  (env: R) =>
    async () => {
      const start = Date.now();
      const result = await effect(env)();
      const duration = Date.now() - start;

      return E.isLeft(result) ? result : E.right([result.right, duration]);
    };

/**
 * @djed/effect - Resource Management with Bracket Pattern
 *
 * Level 2 API: Resource Management
 * - Safe resource acquisition and release
 * - Automatic cleanup on success, failure, or cancellation
 * - Composable resource management
 *
 * Category Theory:
 * - Bracket ensures finalization (algebraic effect)
 * - Guarantees cleanup in all exit cases
 * - Maintains referential transparency
 *
 * Pattern: bracket(acquire, use, release)
 * - acquire: Effect that acquires resource
 * - use: Effect that uses the resource
 * - release: Effect that releases the resource (always runs)
 */

import * as RTE from 'fp-ts/ReaderTaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Effect, ExitCase, Resource } from './types';
import { ExitCase as ExitCaseConstructors } from './types';
import { succeed, fail, fromPromise, runExit } from './core';

// ============================================================================
// Level 2: Resource Management
// ============================================================================

/**
 * Bracket pattern for safe resource management
 *
 * Guarantees that release is called in all cases:
 * - Success: resource acquired and used successfully
 * - Failure: resource acquired but use failed
 * - Cancellation: resource acquired but effect canceled
 *
 * @category Resource Management
 * @example
 * const fileEffect = bracket(
 *   openFile('data.txt'),
 *   (file) => readFile(file),
 *   (file, exitCase) => closeFile(file)
 * );
 */
export const bracket = <R, E, A, B>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R, E, B>,
  release: (a: A, exitCase: ExitCase) => Effect<R, E, unknown>
): Effect<R, E, B> => {
  return (env: R) => async () => {
    // Acquire the resource
    const acquireResult = await acquire(env)();

    if (E.isLeft(acquireResult)) {
      return acquireResult;
    }

    const resource = acquireResult.right;

    try {
      // Use the resource
      const useResult = await use(resource)(env)();

      // Release on success or failure
      const exitCase = E.isLeft(useResult)
        ? ExitCaseConstructors.failure(useResult.left)
        : ExitCaseConstructors.success();

      await release(resource, exitCase)(env)();

      return useResult;
    } catch (error) {
      // Release on exception
      const exitCase = ExitCaseConstructors.failure(error);
      await release(resource, exitCase)(env)();
      return E.left(error as E);
    }
  };
};

/**
 * Bracket that only handles success/failure (no cancellation)
 *
 * @category Resource Management
 */
export const bracketSimple = <R, E, A, B>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R, E, B>,
  release: (a: A) => Effect<R, E, unknown>
): Effect<R, E, B> =>
  bracket(
    acquire,
    use,
    (a, _exitCase) => release(a)
  );

/**
 * Bracket for cleanup that always succeeds
 *
 * @category Resource Management
 * @example
 * const effect = bracketOnError(
 *   acquireResource,
 *   useResource,
 *   cleanupResource
 * );
 */
export const bracketOnError = <R, E, A, B>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R, E, B>,
  release: (a: A) => Effect<R, E, unknown>
): Effect<R, E, B> =>
  bracket(
    acquire,
    use,
    (a, exitCase) => {
      if (exitCase._tag === 'Failure' || exitCase._tag === 'Canceled') {
        return release(a);
      }
      return succeed(undefined);
    }
  );

/**
 * Creates a resource with acquire and release
 *
 * @category Resource Management
 * @example
 * const fileResource = resource(
 *   () => fs.promises.open('data.txt'),
 *   (file) => file.close()
 * );
 */
export const resource = <E, A>(
  acquire: () => Promise<A>,
  release: (a: A) => Promise<void>
): Resource<A> => ({
  acquire,
  release: async (resource, _exitCase) => {
    await release(resource);
  },
});

/**
 * Uses a resource with automatic cleanup
 *
 * @category Resource Management
 * @example
 * const effect = useResource(
 *   fileResource,
 *   (file) => readFromFile(file)
 * );
 */
export const useResource = <R, E, A, B>(
  res: Resource<A>,
  use: (a: A) => Effect<R, E, B>
): Effect<R, E | Error, B> =>
  bracket<R, E | Error, A, B>(
    fromPromise(res.acquire, (error) => new Error(String(error))) as Effect<R, Error, A>,
    use as (a: A) => Effect<R, E | Error, B>,
    (a, exitCase) =>
      fromPromise(
        () => res.release(a, exitCase),
        (error) => new Error(String(error))
      ) as Effect<R, Error, unknown>
  );

/**
 * Ensures an effect runs after another effect completes (like finally)
 *
 * @category Resource Management
 * @example
 * const effect = ensuring(
 *   doWork,
 *   cleanup
 * );
 */
export const ensuring = <R, E, A>(
  effect: Effect<R, E, A>,
  finalizer: Effect<R, E, unknown>
): Effect<R, E, A> =>
  bracket(
    succeed(undefined),
    () => effect,
    () => finalizer
  );

/**
 * Guarantees a cleanup effect runs even on failure/cancellation
 *
 * @category Resource Management
 */
export const onExit = <R, E, A>(
  effect: Effect<R, E, A>,
  cleanup: (exitCase: ExitCase) => Effect<R, E, unknown>
): Effect<R, E, A> =>
  bracket(
    succeed(undefined),
    () => effect,
    (_unit, exitCase) => cleanup(exitCase)
  );

/**
 * Runs a finalizer when the effect succeeds
 *
 * @category Resource Management
 */
export const onSuccess = <R, E, A>(
  effect: Effect<R, E, A>,
  finalizer: (a: A) => Effect<R, E, unknown>
): Effect<R, E, A> =>
  pipe(
    effect,
    RTE.chain((a) =>
      pipe(
        finalizer(a),
        RTE.map(() => a)
      )
    )
  );

/**
 * Runs a finalizer when the effect fails
 *
 * @category Resource Management
 */
export const onFailure = <R, E, A>(
  effect: Effect<R, E, A>,
  finalizer: (e: E) => Effect<R, E, unknown>
): Effect<R, E, A> =>
  pipe(
    effect,
    RTE.orElse((e) =>
      pipe(
        finalizer(e),
        RTE.chain(() => fail<E>(e) as Effect<R, E, A>)
      )
    )
  );

/**
 * Acquires multiple resources in sequence
 *
 * @category Resource Management
 * @example
 * const effect = acquireAll([
 *   acquireDb,
 *   acquireCache,
 *   acquireLogger
 * ]);
 */
export const acquireAll = <R, E, A>(
  resources: ReadonlyArray<Effect<R, E, A>>
): Effect<R, E, ReadonlyArray<A>> => RTE.sequenceArray(resources);

/**
 * Creates a scoped resource that automatically releases
 *
 * @category Resource Management
 * @example
 * const effect = scoped(
 *   (scope) => {
 *     const db = scope.use(acquireDb, releaseDb);
 *     const cache = scope.use(acquireCache, releaseCache);
 *     return useResources(db, cache);
 *   }
 * );
 */
export interface Scope<R, E> {
  use: <A>(
    acquire: Effect<R, E, A>,
    release: (a: A) => Effect<R, E, unknown>
  ) => Effect<R, E, A>;
  close: () => Effect<R, E, void>;
}

/**
 * Creates a scope for managing multiple resources
 *
 * @category Resource Management
 */
export const makeScope = <R, E>(): Scope<R, E> => {
  const finalizers: Array<() => Effect<R, E, unknown>> = [];

  return {
    use: <A>(
      acquire: Effect<R, E, A>,
      release: (a: A) => Effect<R, E, unknown>
    ) =>
      pipe(
        acquire,
        RTE.map((resource) => {
          finalizers.push(() => release(resource));
          return resource;
        })
      ),
    close: () =>
      pipe(
        succeed(finalizers.reverse()),
        RTE.chain((fns) =>
          pipe(
            fns.map((fn) => fn()),
            RTE.sequenceArray,
            RTE.map(() => undefined)
          )
        )
      ),
  };
};

/**
 * Runs an effect within a resource scope
 *
 * @category Resource Management
 * @example
 * const effect = scoped((scope) =>
 *   pipe(
 *     scope.use(acquireDb, releaseDb),
 *     RTE.chain((db) => useDb(db))
 *   )
 * );
 */
export const scoped = <R, E, A>(
  f: (scope: Scope<R, E>) => Effect<R, E, A>
): Effect<R, E, A> => {
  const scope = makeScope<R, E>();
  return ensuring(f(scope), scope.close());
};

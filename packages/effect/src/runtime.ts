/**
 * @djed/effect - Effect Runtime System
 *
 * Runtime for executing effects with:
 * - Fiber-based concurrency
 * - Effect cancellation
 * - Resource cleanup
 * - Error handling
 *
 * Inspired by: ZIO Runtime, Cats Effect IORuntime
 */

import * as E from 'fp-ts/Either';
import type {
  Effect,
  Fiber,
  Exit,
  CancelToken,
  RuntimeConfig,
} from './types';
import { CancellationError, InterruptError } from './types';
import { run, runExit } from './core';

// ============================================================================
// Cancellation Token
// ============================================================================

/**
 * Creates a cancellation token
 *
 * @category Cancellation
 * @example
 * const token = makeCancelToken();
 * const fiber = unsafeRunFiber(effect, env, token);
 * // Later: token.cancel()
 */
export const makeCancelToken = (): CancelToken => {
  let canceled = false;

  return {
    cancel: () => {
      canceled = true;
    },
    isCanceled: () => canceled,
  };
};

// ============================================================================
// Fiber Implementation
// ============================================================================

/**
 * Creates a fiber from an effect
 *
 * @category Fiber
 * @example
 * const fiber = fork(longRunningEffect, env);
 * const result = await fiber.join();
 */
export const fork = <R, E, A>(
  effect: Effect<R, E, A>,
  env: R,
  cancelToken?: CancelToken
): Fiber<E, A> => {
  const token = cancelToken || makeCancelToken();
  let resultPromise: Promise<Exit<E, A>> | null = null;

  // Start execution
  const execute = async (): Promise<Exit<E, A>> => {
    try {
      // Check cancellation before starting
      if (token.isCanceled()) {
        return {
          _tag: 'Interrupted',
          cause: new CancellationError('Effect was cancelled before execution'),
        };
      }

      const result = await run(effect, env);

      // Check cancellation after execution
      if (token.isCanceled()) {
        return {
          _tag: 'Interrupted',
          cause: new CancellationError('Effect was cancelled during execution'),
        };
      }

      return E.isLeft(result)
        ? { _tag: 'Failure', error: result.left }
        : { _tag: 'Success', value: result.right };
    } catch (error) {
      return { _tag: 'Interrupted', cause: error };
    }
  };

  resultPromise = execute();

  return {
    cancel: async () => {
      token.cancel();
      // Wait for the effect to notice cancellation
      await resultPromise;
    },
    join: async () => {
      if (!resultPromise) {
        return {
          _tag: 'Interrupted',
          cause: new Error('Fiber not started'),
        };
      }
      return resultPromise;
    },
  };
};

/**
 * Forks an effect and returns the fiber
 *
 * @category Fiber
 */
export const forkEffect = <R, E, A>(
  effect: Effect<R, E, A>
): Effect<R, never, Fiber<E, A>> =>
  (env: R) =>
    async () =>
      E.right(fork(effect, env));

/**
 * Joins a fiber, waiting for its result
 *
 * @category Fiber
 * @example
 * const fiber = fork(effect, env);
 * const result = await joinFiber(fiber);
 */
export const joinFiber = async <E, A>(fiber: Fiber<E, A>): Promise<Exit<E, A>> =>
  fiber.join();

/**
 * Cancels a fiber
 *
 * @category Fiber
 */
export const cancelFiber = async <E, A>(fiber: Fiber<E, A>): Promise<void> =>
  fiber.cancel();

// ============================================================================
// Runtime System
// ============================================================================

/**
 * Runtime for executing effects
 *
 * @category Runtime
 * @example
 * const runtime = makeRuntime({ timeout: 5000 });
 * const result = await runtime.run(effect, env);
 */
export interface Runtime<R> {
  /**
   * Runs an effect and returns the result
   */
  run: <E, A>(effect: Effect<R, E, A>) => Promise<E.Either<E, A>>;

  /**
   * Runs an effect and returns the exit
   */
  runExit: <E, A>(effect: Effect<R, E, A>) => Promise<Exit<E, A>>;

  /**
   * Runs an effect as a promise (throws on error)
   */
  runPromise: <E, A>(effect: Effect<R, E, A>) => Promise<A>;

  /**
   * Forks an effect and returns a fiber
   */
  fork: <E, A>(effect: Effect<R, E, A>) => Fiber<E, A>;

  /**
   * Runs an effect and ignores the result
   */
  runFire: <E, A>(effect: Effect<R, E, A>) => void;
}

/**
 * Creates a runtime with the given environment and configuration
 *
 * @category Runtime
 * @example
 * const runtime = makeRuntime(config, { timeout: 5000 });
 */
export const makeRuntime = <R>(
  environment: R,
  config?: RuntimeConfig
): Runtime<R> => {
  const handleError = (error: unknown): void => {
    if (config?.onError) {
      config.onError(error);
    } else {
      console.error('Unhandled effect error:', error);
    }
  };

  return {
    run: async <E, A>(effect: Effect<R, E, A>) => {
      try {
        return await run(effect, environment);
      } catch (error) {
        handleError(error);
        throw error;
      }
    },

    runExit: async <E, A>(effect: Effect<R, E, A>) => {
      try {
        return await runExit(effect, environment);
      } catch (error) {
        handleError(error);
        return { _tag: 'Interrupted', cause: error };
      }
    },

    runPromise: async <E, A>(effect: Effect<R, E, A>) => {
      try {
        const result = await run(effect, environment);
        if (E.isLeft(result)) {
          throw result.left;
        }
        return result.right;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },

    fork: <E, A>(effect: Effect<R, E, A>) => {
      const token = makeCancelToken();
      return fork(effect, environment, token);
    },

    runFire: <E, A>(effect: Effect<R, E, A>) => {
      run(effect, environment)
        .then((result) => {
          if (E.isLeft(result)) {
            handleError(result.left);
          }
        })
        .catch(handleError);
    },
  };
};

/**
 * Creates a default runtime with no environment
 *
 * @category Runtime
 */
export const defaultRuntime = makeRuntime(undefined);

/**
 * Unsafe runner for testing (throws on error)
 *
 * @category Runtime
 * @example
 * const result = await unsafeRun(effect, env);
 */
export const unsafeRun = async <R, E, A>(
  effect: Effect<R, E, A>,
  env: R
): Promise<A> => {
  const result = await run(effect, env);
  if (E.isLeft(result)) {
    throw result.left;
  }
  return result.right;
};

/**
 * Unsafe runner for effects with no environment
 *
 * @category Runtime
 */
export const unsafeRunIO = async <E, A>(effect: Effect<unknown, E, A>): Promise<A> =>
  unsafeRun(effect, undefined);

/**
 * Runs an effect as a fiber (unsafe, for advanced use)
 *
 * @category Runtime
 */
export const unsafeRunFiber = <R, E, A>(
  effect: Effect<R, E, A>,
  env: R,
  cancelToken?: CancelToken
): Fiber<E, A> => fork(effect, env, cancelToken);

// ============================================================================
// Effect Interruption
// ============================================================================

/**
 * Makes an effect interruptible
 *
 * @category Interruption
 * @example
 * const effect = interruptible(longRunning);
 * const fiber = fork(effect, env);
 * await fiber.cancel(); // Will interrupt
 */
export const interruptible = <R, E, A>(
  effect: Effect<R, E, A>
): Effect<R, E | InterruptError, A> =>
  (env: R) =>
    async () => {
      try {
        return await effect(env)();
      } catch (error) {
        if (error instanceof CancellationError) {
          return E.left(new InterruptError('Effect was interrupted', error) as E | InterruptError);
        }
        throw error;
      }
    };

/**
 * Makes an effect uninterruptible
 *
 * @category Interruption
 * @example
 * const effect = uninterruptible(criticalSection);
 * // Cannot be cancelled
 */
export const uninterruptible = <R, E, A>(
  effect: Effect<R, E, A>
): Effect<R, E, A> => effect;

/**
 * Creates a checkInterrupt point in the effect
 *
 * @category Interruption
 */
export const checkInterrupt = (token: CancelToken): Effect<unknown, CancellationError, void> =>
  (env: unknown) =>
    async () => {
      if (token.isCanceled()) {
        return E.left(new CancellationError('Effect was cancelled'));
      }
      return E.right(undefined);
    };

// ============================================================================
// Background Execution
// ============================================================================

/**
 * Runs an effect in the background (fire and forget)
 *
 * @category Background
 * @example
 * runBackground(logAnalytics, env);
 * // Continues without waiting
 */
export const runBackground = <R, E, A>(
  effect: Effect<R, E, A>,
  env: R,
  onError?: (error: E) => void
): void => {
  run(effect, env)
    .then((result) => {
      if (E.isLeft(result) && onError) {
        onError(result.left);
      }
    })
    .catch((error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Background effect error:', error);
      }
    });
};

/**
 * Runs effects in parallel with a fiber pool
 *
 * @category Background
 * @example
 * const results = await runFiberPool(effects, env, 5);
 * // Runs up to 5 effects concurrently
 */
export const runFiberPool = async <R, E, A>(
  effects: ReadonlyArray<Effect<R, E, A>>,
  env: R,
  maxConcurrency: number = 10
): Promise<ReadonlyArray<Exit<E, A>>> => {
  const results: Exit<E, A>[] = [];
  const queue = [...effects];
  const running: Set<Promise<void>> = new Set();

  while (queue.length > 0 || running.size > 0) {
    // Start new fibers up to max concurrency
    while (queue.length > 0 && running.size < maxConcurrency) {
      const effect = queue.shift()!;
      const fiber = fork(effect, env);

      const promise = fiber.join().then((exit) => {
        results.push(exit);
        running.delete(promise);
      });

      running.add(promise);
    }

    // Wait for at least one fiber to complete
    if (running.size > 0) {
      await Promise.race(running);
    }
  }

  return results;
};

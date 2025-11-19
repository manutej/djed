/**
 * @djed/effect - Core Effect Operations
 *
 * Level 1 API: Basic Effects
 * - succeed, fail, delay
 * - Effect construction
 * - Basic execution
 *
 * Satisfies monad laws:
 * - Left identity: succeed(a).flatMap(f) = f(a)
 * - Right identity: m.flatMap(succeed) = m
 * - Associativity: m.flatMap(f).flatMap(g) = m.flatMap(x => f(x).flatMap(g))
 */

import * as RTE from 'fp-ts/ReaderTaskEither';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { pipe, identity } from 'fp-ts/function';
import type { Effect, UIO, IO, RIO, Exit, CancelToken } from './types';
import { CancellationError } from './types';

// ============================================================================
// Level 1: Basic Effect Construction
// ============================================================================

/**
 * Creates an effect that succeeds with the given value
 *
 * @category Constructors
 * @example
 * const effect = succeed(42);
 * // Effect<unknown, never, 42>
 */
export const succeed = <A>(value: A): UIO<A> => RTE.right(value);

/**
 * Creates an effect that fails with the given error
 *
 * @category Constructors
 * @example
 * const effect = fail(new Error('Something went wrong'));
 * // Effect<unknown, Error, never>
 */
export const fail = <E>(error: E): IO<E, never> => RTE.left(error);

/**
 * Creates an effect that succeeds with void
 *
 * @category Constructors
 */
export const unit: UIO<void> = succeed(undefined);

/**
 * Creates an effect from a lazy synchronous computation
 *
 * @category Constructors
 * @example
 * const effect = sync(() => Math.random());
 */
export const sync = <A>(thunk: () => A): UIO<A> =>
  RTE.fromTaskEither(TE.fromIO(() => thunk()));

/**
 * Creates an effect from a lazy computation that may throw
 *
 * @category Constructors
 * @example
 * const effect = tryCatch(
 *   () => JSON.parse(json),
 *   (error) => new Error(String(error))
 * );
 */
export const tryCatch = <E, A>(
  thunk: () => A,
  onError: (error: unknown) => E
): IO<E, A> =>
  RTE.fromTaskEither(
    TE.tryCatch(
      async () => thunk(),
      onError
    )
  );

/**
 * Creates an effect from a Promise
 *
 * @category Constructors
 * @example
 * const effect = fromPromise(
 *   () => fetch('/api/data'),
 *   (error) => new Error(String(error))
 * );
 */
export const fromPromise = <E, A>(
  promise: () => Promise<A>,
  onError: (error: unknown) => E
): IO<E, A> => RTE.fromTaskEither(TE.tryCatch(promise, onError));

/**
 * Creates an effect from a Task
 *
 * @category Constructors
 */
export const fromTask = <A>(task: T.Task<A>): UIO<A> =>
  RTE.fromTaskEither(TE.rightTask(task));

/**
 * Creates an effect from a TaskEither
 *
 * @category Constructors
 */
export const fromTaskEither = <E, A>(taskEither: TE.TaskEither<E, A>): IO<E, A> =>
  RTE.fromTaskEither(taskEither);

/**
 * Creates an effect from an Either
 *
 * @category Constructors
 */
export const fromEither = <E, A>(either: E.Either<E, A>): IO<E, A> =>
  RTE.fromEither(either);

/**
 * Creates an effect that delays execution by the given milliseconds
 *
 * @category Constructors
 * @example
 * const effect = delay(1000); // Delays for 1 second
 */
export const delay = (ms: number): UIO<void> =>
  fromPromise(
    () => new Promise((resolve) => setTimeout(resolve, ms)),
    () => new Error('Delay failed') as never
  );

/**
 * Creates an effect that runs after a delay
 *
 * @category Combinators
 * @example
 * const effect = delayedEffect(1000, () => console.log('Hello'));
 */
export const delayedEffect = <E, A>(
  ms: number,
  effect: Effect<unknown, E, A>
): Effect<unknown, E, A> =>
  pipe(
    delay(ms),
    RTE.chain(() => effect)
  );

// ============================================================================
// Effect Execution
// ============================================================================

/**
 * Runs an effect with the given environment
 *
 * @category Execution
 * @example
 * const result = await run(effect, env);
 * // Either<E, A>
 */
export const run = <R, E, A>(
  effect: Effect<R, E, A>,
  env: R
): Promise<E.Either<E, A>> => effect(env)();

/**
 * Runs an effect with the given environment and returns a Promise
 * Throws on failure
 *
 * @category Execution
 * @example
 * const value = await runPromise(effect, env);
 * // A (throws if fails)
 */
export const runPromise = async <R, E, A>(
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
 * Runs an effect that requires no environment
 *
 * @category Execution
 */
export const runIO = <E, A>(effect: IO<E, A>): Promise<E.Either<E, A>> =>
  run(effect, undefined);

/**
 * Runs an effect that requires no environment and returns a Promise
 *
 * @category Execution
 */
export const runIOPromise = <E, A>(effect: IO<E, A>): Promise<A> =>
  runPromise(effect, undefined);

/**
 * Runs an effect and returns an Exit
 *
 * @category Execution
 */
export const runExit = async <R, E, A>(
  effect: Effect<R, E, A>,
  env: R
): Promise<Exit<E, A>> => {
  try {
    const result = await run(effect, env);
    return E.isLeft(result)
      ? { _tag: 'Failure', error: result.left }
      : { _tag: 'Success', value: result.right };
  } catch (error) {
    return { _tag: 'Interrupted', cause: error };
  }
};

// ============================================================================
// Environment Access (Reader)
// ============================================================================

/**
 * Accesses the environment
 *
 * @category Reader
 * @example
 * const effect = ask<Config>();
 * // Effect<Config, never, Config>
 */
export const ask = <R>(): RIO<R, R> => RTE.ask<R>();

/**
 * Accesses a specific part of the environment
 *
 * @category Reader
 * @example
 * const effect = asks((config: Config) => config.apiKey);
 */
export const asks = <R, A>(f: (r: R) => A): RIO<R, A> => RTE.asks(f);

/**
 * Provides an environment to an effect
 *
 * @category Reader
 * @example
 * const effect = provide(needsConfig, config);
 * // Effect<unknown, E, A>
 */
export const provide = <R, E, A>(
  effect: Effect<R, E, A>,
  env: R
): IO<E, A> => RTE.local(() => env)(effect);

/**
 * Transforms the environment required by an effect
 *
 * @category Reader
 * @example
 * const effect = provideWith(needsConfig, (env: LargerEnv) => env.config);
 */
export const provideWith = <R1, R2, E, A>(
  effect: Effect<R2, E, A>,
  f: (r: R1) => R2
): Effect<R1, E, A> => RTE.local(f)(effect);

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Catches and recovers from errors
 *
 * @category Error Handling
 * @example
 * const effect = catchAll(mayFail, (error) => succeed('default'));
 */
export const catchAll = <R, E1, E2, A, B>(
  effect: Effect<R, E1, A>,
  onError: (e: E1) => Effect<R, E2, B>
): Effect<R, E2, A | B> => {
  const widened: Effect<R, E1, A | B> = effect as Effect<R, E1, A | B>;
  return RTE.orElse((e: E1) => onError(e) as Effect<R, E2, A | B>)(widened) as Effect<R, E2, A | B>;
};

/**
 * Catches specific errors
 *
 * @category Error Handling
 */
export const catchSome = <R, E, A>(
  effect: Effect<R, E, A>,
  onError: (e: E) => E.Either<E, A>
): Effect<R, E, A> =>
  pipe(
    effect,
    RTE.orElse((e) => RTE.fromEither(onError(e)))
  );

/**
 * Maps error type to a different type
 *
 * @category Error Handling
 */
export const mapError = <R, E1, E2, A>(
  effect: Effect<R, E1, A>,
  f: (e: E1) => E2
): Effect<R, E2, A> => RTE.mapLeft(f)(effect);

/**
 * Provides a fallback effect
 *
 * @category Error Handling
 */
export const orElse = <R, E1, E2, A, B>(
  effect: Effect<R, E1, A>,
  fallback: Effect<R, E2, B>
): Effect<R, E2, A | B> => {
  const widened: Effect<R, E1, A | B> = effect as Effect<R, E1, A | B>;
  return RTE.orElse(() => fallback as Effect<R, E2, A | B>)(widened) as Effect<R, E2, A | B>;
};

/**
 * Retries an effect n times
 *
 * @category Error Handling
 */
export const retry = <R, E, A>(
  effect: Effect<R, E, A>,
  times: number
): Effect<R, E, A> => {
  if (times <= 0) return effect;
  return pipe(
    effect,
    RTE.orElse(() => retry(effect, times - 1))
  );
};

// ============================================================================
// Effect Composition
// ============================================================================

/**
 * Maps the success value of an effect
 *
 * @category Functor
 */
export const map = <A, B>(f: (a: A) => B) =>
  <R, E>(effect: Effect<R, E, A>): Effect<R, E, B> =>
    RTE.map(f)(effect);

/**
 * Chains effects sequentially (flatMap/bind)
 *
 * @category Monad
 */
export const chain = <R, E, A, B>(f: (a: A) => Effect<R, E, B>) =>
  (effect: Effect<R, E, A>): Effect<R, E, B> =>
    RTE.chain(f)(effect);

/**
 * Alias for chain (monadic bind)
 *
 * @category Monad
 */
export const flatMap = chain;

/**
 * Applies an effect of a function to an effect of a value
 *
 * @category Apply
 */
export const ap = <R, E, A>(fa: Effect<R, E, A>) =>
  <B>(fab: Effect<R, E, (a: A) => B>): Effect<R, E, B> =>
    RTE.ap(fa)(fab);

/**
 * Sequences effects, ignoring the value of the first
 *
 * @category Combinators
 */
export const zipRight = <R, E, A, B>(
  first: Effect<R, E, A>,
  second: Effect<R, E, B>
): Effect<R, E, B> =>
  pipe(
    first,
    RTE.chain(() => second)
  );

/**
 * Sequences effects, ignoring the value of the second
 *
 * @category Combinators
 */
export const zipLeft = <R, E, A, B>(
  first: Effect<R, E, A>,
  second: Effect<R, E, B>
): Effect<R, E, A> =>
  pipe(
    first,
    RTE.chainFirst(() => second)
  );

/**
 * Combines two effects into a tuple
 *
 * @category Combinators
 */
export const zip = <R, E, A, B>(
  first: Effect<R, E, A>,
  second: Effect<R, E, B>
): Effect<R, E, [A, B]> =>
  pipe(
    first,
    RTE.chain((a) =>
      pipe(
        second,
        RTE.map((b) => [a, b] as [A, B])
      )
    )
  );

/**
 * Taps into the success value without changing it (for side effects)
 *
 * @category Combinators
 */
export const tap = <R, E, A>(f: (a: A) => Effect<R, E, unknown>) =>
  (effect: Effect<R, E, A>): Effect<R, E, A> =>
    pipe(
      effect,
      RTE.chainFirst(f)
    );

/**
 * Executes effects sequentially, collecting results
 *
 * @category Combinators
 */
export const sequence = <R, E, A>(
  effects: ReadonlyArray<Effect<R, E, A>>
): Effect<R, E, ReadonlyArray<A>> => RTE.sequenceArray(effects);

/**
 * Maps an array with an effect-returning function and sequences
 *
 * @category Combinators
 */
export const traverse = <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) =>
  (as: ReadonlyArray<A>): Effect<R, E, ReadonlyArray<B>> =>
    RTE.traverseArray(f)(as);

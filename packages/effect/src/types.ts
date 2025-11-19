/**
 * @djed/effect - Effect System Types
 *
 * Category Theory Foundation:
 * - Effect<R, E, A> is a ReaderTaskEither monad
 * - Reader provides dependency injection (R)
 * - Task provides async operations
 * - Either provides error handling (E)
 * - Returns success value (A)
 *
 * Effect<R, E, A> = R => Task<Either<E, A>>
 *                 = R => () => Promise<Either<E, A>>
 */

import * as RTE from 'fp-ts/ReaderTaskEither';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';

/**
 * The core Effect type - a ReaderTaskEither monad
 *
 * @typeParam R - Environment/dependencies required
 * @typeParam E - Error type
 * @typeParam A - Success value type
 *
 * Represents a computation that:
 * - Requires environment R
 * - May fail with error E
 * - May succeed with value A
 * - Runs asynchronously
 */
export type Effect<R, E, A> = RTE.ReaderTaskEither<R, E, A>;

/**
 * Effect that requires no environment
 */
export type UEffect<E, A> = Effect<unknown, E, A>;

/**
 * Effect that never fails
 */
export type UIO<A> = Effect<unknown, never, A>;

/**
 * Effect that may fail but requires no environment
 */
export type IO<E, A> = Effect<unknown, E, A>;

/**
 * Effect with full type parameters
 */
export type RIO<R, A> = Effect<R, never, A>;

/**
 * Cancellation token for effect cancellation
 */
export interface CancelToken {
  readonly cancel: () => void;
  readonly isCanceled: () => boolean;
}

/**
 * Effect runtime configuration
 */
export interface RuntimeConfig {
  readonly maxConcurrency?: number;
  readonly timeout?: number;
  readonly onError?: (error: unknown) => void;
}

/**
 * Resource lifecycle hooks for bracket pattern
 */
export interface Resource<A> {
  readonly acquire: () => Promise<A>;
  readonly release: (resource: A, exitCase: ExitCase) => Promise<void>;
}

/**
 * Exit case for resource cleanup
 */
export type ExitCase =
  | { readonly _tag: 'Success' }
  | { readonly _tag: 'Failure'; readonly error: unknown }
  | { readonly _tag: 'Canceled' };

/**
 * Exit result of effect execution
 */
export type Exit<E, A> =
  | { readonly _tag: 'Success'; readonly value: A }
  | { readonly _tag: 'Failure'; readonly error: E }
  | { readonly _tag: 'Interrupted'; readonly cause: unknown };

/**
 * Fiber representing a running effect
 */
export interface Fiber<E, A> {
  readonly cancel: () => Promise<void>;
  readonly join: () => Promise<Exit<E, A>>;
}

/**
 * Effect error types
 */
export class EffectError extends Error {
  readonly _tag: string = 'EffectError';

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'EffectError';
  }
}

export class TimeoutError extends EffectError {
  override readonly _tag: string = 'TimeoutError';

  constructor(message: string = 'Effect timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CancellationError extends EffectError {
  override readonly _tag: string = 'CancellationError';

  constructor(message: string = 'Effect was cancelled') {
    super(message);
    this.name = 'CancellationError';
  }
}

export class InterruptError extends EffectError {
  override readonly _tag: string = 'InterruptError';

  constructor(message: string = 'Effect was interrupted', cause?: unknown) {
    super(message, cause);
    this.name = 'InterruptError';
  }
}

/**
 * Helper to create exit cases
 */
export const ExitCase = {
  success: (): ExitCase => ({ _tag: 'Success' }),
  failure: (error: unknown): ExitCase => ({ _tag: 'Failure', error }),
  canceled: (): ExitCase => ({ _tag: 'Canceled' }),
};

/**
 * Helper to create exit results
 */
export const Exit = {
  success: <E, A>(value: A): Exit<E, A> => ({ _tag: 'Success', value }),
  failure: <E, A>(error: E): Exit<E, A> => ({ _tag: 'Failure', error }),
  interrupted: <E, A>(cause: unknown): Exit<E, A> => ({ _tag: 'Interrupted', cause }),
};

/**
 * Type guard for success exit
 */
export const isSuccess = <E, A>(exit: Exit<E, A>): exit is { _tag: 'Success'; value: A } =>
  exit._tag === 'Success';

/**
 * Type guard for failure exit
 */
export const isFailure = <E, A>(exit: Exit<E, A>): exit is { _tag: 'Failure'; error: E } =>
  exit._tag === 'Failure';

/**
 * Type guard for interrupted exit
 */
export const isInterrupted = <E, A>(exit: Exit<E, A>): exit is { _tag: 'Interrupted'; cause: unknown } =>
  exit._tag === 'Interrupted';

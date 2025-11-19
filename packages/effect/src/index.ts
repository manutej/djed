/**
 * @djed/effect - Lightweight Effect System
 *
 * A powerful, composable effect system for managing side effects in TypeScript
 * Built on fp-ts ReaderTaskEither with inspiration from ZIO and Cats Effect
 *
 * @packageDocumentation
 *
 * ## Quick Start
 *
 * ```typescript
 * import { succeed, chain, runPromise } from '@djed/effect';
 *
 * const program = pipe(
 *   succeed(1),
 *   chain(x => succeed(x + 1))
 * );
 *
 * await runPromise(program, undefined); // 2
 * ```
 *
 * ## API Levels
 *
 * **Level 1: Basic Effects**
 * - succeed, fail, delay
 * - Basic execution
 *
 * **Level 2: Resource Management**
 * - bracket pattern
 * - Automatic cleanup
 *
 * **Level 3: Advanced Composition**
 * - Racing and timeout
 * - Parallel execution
 * - ZIO-like operators
 */

// ============================================================================
// Types
// ============================================================================

export type {
  Effect,
  UEffect,
  UIO,
  IO,
  RIO,
  CancelToken,
  RuntimeConfig,
  Resource,
  ExitCase as ExitCaseType,
  Exit as ExitType,
  Fiber,
} from './types';

export {
  EffectError,
  TimeoutError,
  CancellationError,
  InterruptError,
  ExitCase,
  Exit,
  isSuccess,
  isFailure,
  isInterrupted,
} from './types';

// ============================================================================
// Level 1: Core Effect Operations
// ============================================================================

// Constructors
export {
  succeed,
  fail,
  unit,
  sync,
  tryCatch,
  fromPromise,
  fromTask,
  fromTaskEither,
  fromEither,
  delay,
  delayedEffect,
} from './core';

// Execution
export {
  run,
  runPromise,
  runIO,
  runIOPromise,
  runExit,
} from './core';

// Reader (Environment)
export {
  ask,
  asks,
  provide,
  provideWith,
} from './core';

// Error Handling
export {
  catchAll,
  catchSome,
  mapError,
  orElse,
  retry,
} from './core';

// Composition
export {
  map,
  chain,
  flatMap,
  ap,
  zipRight,
  zipLeft,
  zip,
  tap,
  sequence,
  traverse,
} from './core';

// ============================================================================
// Level 2: Resource Management
// ============================================================================

export {
  bracket,
  bracketSimple,
  bracketOnError,
  resource,
  useResource,
  ensuring,
  onExit,
  onSuccess,
  onFailure,
  acquireAll,
  scoped,
  makeScope,
} from './bracket';

export type { Scope } from './bracket';

// ============================================================================
// Level 3: Advanced Operators
// ============================================================================

// Racing and Timeout
export {
  race,
  timeout,
  timeoutWith,
} from './operators';

// Parallel Execution
export {
  parallel,
  parallelLimit,
  raceAll,
} from './operators';

// Filtering and Conditionals
export {
  filterOrElse,
  ifThenElse,
  when,
  unless,
} from './operators';

// Repetition
export {
  repeat,
  repeatWhile,
  repeatUntilSuccess,
  forever,
} from './operators';

// Collections
export {
  foldLeft,
  collectFirst,
  partition,
} from './operators';

// Optimization
export {
  memoize,
  debounce,
} from './operators';

// Debugging
export {
  withLogging,
  timed,
} from './operators';

// ============================================================================
// Runtime System
// ============================================================================

export {
  makeCancelToken,
  fork,
  forkEffect,
  joinFiber,
  cancelFiber,
  makeRuntime,
  defaultRuntime,
  unsafeRun,
  unsafeRunIO,
  unsafeRunFiber,
  interruptible,
  uninterruptible,
  checkInterrupt,
  runBackground,
  runFiberPool,
} from './runtime';

export type { Runtime } from './runtime';

// ============================================================================
// Re-exports from fp-ts for convenience
// ============================================================================

export { pipe, flow, identity, constant } from 'fp-ts/function';
export type { Either } from 'fp-ts/Either';
export { isLeft, isRight, left, right } from 'fp-ts/Either';

// ============================================================================
// Namespace export for qualified imports
// ============================================================================

import * as Core from './core';
import * as Bracket from './bracket';
import * as Operators from './operators';
import * as Runtime from './runtime';
import * as Types from './types';

export const Eff = {
  ...Core,
  ...Bracket,
  ...Operators,
  ...Runtime,
  ...Types,
};

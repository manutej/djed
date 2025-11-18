/**
 * Functional programming core for @djed/logger
 * Uses fp-ts for zero-side-effects configuration and logging
 *
 * Functional Design Principles:
 * - Pure functions: no side effects except where explicitly noted
 * - Composition-first: functions are designed to compose
 * - Type safety: use fp-ts abstractions for correctness
 * - Immutability: all data structures are immutable
 * - Error handling: Use Either monad for composable error handling
 * - Dependency injection: Use Reader monad for environmental dependencies
 */

import winston from 'winston';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as R from 'fp-ts/Reader';
import * as T from 'fp-ts/Task';
import { pipe, flow, constant, identity } from 'fp-ts/function';

/**
 * Validation Error type for configuration
 */
export type ValidationError = string;

/**
 * Logger configuration domain model
 * All fields are readonly for immutability
 */
export interface LoggerConfig {
  readonly name: string;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format: 'json' | 'pretty';
  readonly silent: boolean;
  readonly winstonOptions: O.Option<winston.LoggerOptions>;
}

/**
 * User-provided options (partial, with defaults)
 */
export interface LoggerOptionsInput {
  readonly level?: 'debug' | 'info' | 'warn' | 'error';
  readonly format?: 'json' | 'pretty';
  readonly silent?: boolean;
  readonly winston?: winston.LoggerOptions;
}

/**
 * Predicates for validation - pure, reusable functions
 * These are first-class predicates suitable for functional composition
 */

const isValidLogLevel = (level: string): level is 'debug' | 'info' | 'warn' | 'error' => {
  return ['debug', 'info', 'warn', 'error'].includes(level);
};

const isValidFormat = (format: string): format is 'json' | 'pretty' => {
  return ['json', 'pretty'].includes(format);
};

const isNonEmptyString = (s: string): boolean => {
  return s.trim().length > 0;
};

/**
 * Validation functions using Either monad
 * Each returns Either<ValidationError, ValidType> for composable error handling
 */

const validateLoggerName = (name: string): E.Either<ValidationError, string> => {
  return isNonEmptyString(name) ? E.right(name.trim()) : E.left('Logger name cannot be empty');
};

const validateLogLevel = (
  level: string | undefined
): E.Either<ValidationError, 'debug' | 'info' | 'warn' | 'error'> => {
  if (level === undefined) return E.right('info');
  return isValidLogLevel(level) ? E.right(level) : E.left(`Invalid log level: ${level}`);
};

const validateFormat = (
  format: string | undefined
): E.Either<ValidationError, 'json' | 'pretty'> => {
  if (format === undefined) return E.right('pretty');
  return isValidFormat(format) ? E.right(format) : E.left(`Invalid format: ${format}`);
};

/**
 * Configuration validators - composed with Either applicative functor
 * Demonstrates error accumulation and composition
 */

const validateOptions = (
  options: LoggerOptionsInput
): E.Either<ValidationError, Omit<LoggerConfig, 'name' | 'winstonOptions'>> => {
  return pipe(
    E.Do,
    E.bind('level', () => validateLogLevel(options.level)),
    E.bind('format', () => validateFormat(options.format)),
    E.map(({ level, format }) => ({
      level,
      format,
      silent: options.silent || false,
    }))
  );
};

/**
 * Pure function to validate and normalize LoggerOptionsInput into LoggerConfig
 * Uses Either monad for composable error handling
 * Demonstrates Kleisli composition
 */
export const validateLoggerConfig = (
  name: string,
  options: LoggerOptionsInput = {}
): E.Either<ValidationError, LoggerConfig> => {
  return pipe(
    E.Do,
    E.bind('name', () => validateLoggerName(name)),
    E.bind('validated', () => validateOptions(options)),
    E.map(({ name, validated }) => ({
      name,
      level: validated.level,
      format: validated.format,
      silent: validated.silent,
      winstonOptions: O.fromNullable(options.winston),
    }))
  );
};

/**
 * Format combinators - pure, composable format builders
 * Demonstrates combinator pattern
 */

const baseFormats = (): winston.Logform.Format[] => [winston.format.timestamp()];

const jsonFormatCombinator = (): winston.Logform.Format => {
  return winston.format.json();
};

const prettyFormatCombinator = (): winston.Logform.Format => {
  return winston.format.combine(winston.format.colorize(), winston.format.simple());
};

const labelCombinator = (name: string): winston.Logform.Format => {
  return winston.format.label({ label: name });
};

/**
 * Pure function to create winston format based on format option
 * Composition of pure combinators
 */
export const createWinstonFormat = (
  format: 'json' | 'pretty',
  name: string
): winston.Logform.Format => {
  const selectedFormat =
    format === 'json' ? jsonFormatCombinator() : prettyFormatCombinator();
  return winston.format.combine(
    labelCombinator(name),
    ...baseFormats(),
    selectedFormat
  );
};

/**
 * Pure function to create winston transports
 * Abstracted for easier testing and composition
 */
export const createWinstonTransports = (): winston.transport[] => {
  return [new winston.transports.Console()];
};

/**
 * Curried version of createWinstonFormat for better composition
 * Enables partial application and functional composition
 */
export const createWinstonFormatCurried =
  (format: 'json' | 'pretty') =>
  (name: string): winston.Logform.Format => {
    return createWinstonFormat(format, name);
  };

/**
 * Pure function to build winston logger options
 * Composition of pure functions, no side effects
 * Pattern matching on Option monad
 */
export const buildWinstonLoggerOptions = (
  config: LoggerConfig
): winston.LoggerOptions => {
  // If full Winston config is provided, use it directly
  if (O.isSome(config.winstonOptions)) {
    return config.winstonOptions.value;
  }

  // Build options from normalized config
  return {
    level: config.level,
    format: createWinstonFormat(config.format, config.name),
    transports: createWinstonTransports(),
    silent: config.silent,
  };
};

/**
 * Configuration pipeline - Kleisli composition
 * Chains Either-returning functions for composable validation and building
 */
export const configurationPipeline = flow(
  validateLoggerConfig,
  E.map(buildWinstonLoggerOptions)
);

/**
 * Curry buildWinstonLoggerOptions for composition
 */
export const buildWinstonLoggerOptionsCurried =
  (config: LoggerConfig): (() => winston.LoggerOptions) => {
    return constant(buildWinstonLoggerOptions(config));
  };

/**
 * Logger environment - winston logger dependency
 * Used with Reader monad for dependency injection
 */
export interface LoggerEnv {
  readonly winstonLogger: winston.Logger;
}

/**
 * Reader type alias for logging operations
 * Encapsulates side effects in a functional way
 * All operations are deferred until execution
 */
export type LogOperation<A> = R.Reader<LoggerEnv, A>;

/**
 * Monad operations for LogOperation
 * Allows composition using monadic laws
 */

export const liftPure = <A>(value: A): LogOperation<A> => {
  return R.of(value);
};

export const mapLogOperation = <A, B>(
  f: (a: A) => B,
  op: LogOperation<A>
): LogOperation<B> => {
  return R.map(f)(op);
};

export const bindLogOperation = <A, B>(
  f: (a: A) => LogOperation<B>,
  op: LogOperation<A>
): LogOperation<B> => {
  return R.flatMap(f)(op);
};

/**
 * Kleisli composition for LogOperations
 * Composes functions that return LogOperation
 */
export const kleisliCompose = <A, B, C>(
  g: (b: B) => LogOperation<C>,
  f: (a: A) => LogOperation<B>
): ((a: A) => LogOperation<C>) => {
  return (a: A) => bindLogOperation(g, f(a));
};

/**
 * Curried logging functions - pure Reader monad operations
 * Demonstrates currying for partial application
 */

export const logMessage =
  (level: 'info' | 'error' | 'warn' | 'debug') =>
  (message: string) =>
  (meta?: unknown): LogOperation<void> => {
    return R.asks((env: LoggerEnv) => {
      env.winstonLogger[level](message, meta);
    });
  };

/**
 * Pure logging function using Reader pattern
 * Composed from logMessage using curry
 */
export const logInfo: (message: string, meta?: unknown) => LogOperation<void> = (
  message,
  meta
) => logMessage('info')(message)(meta);

/**
 * Pure error logging function
 * Handles Error objects properly without side effects
 * Demonstrates Option monad for null-safety
 */
export const logError: (message: string, meta?: unknown) => LogOperation<void> = (
  message,
  meta
) => {
  return R.asks((env: LoggerEnv) => {
    const processedMeta = pipe(
      meta,
      O.fromNullable,
      O.filter((m): m is Error => m instanceof Error),
      O.map((err: Error) => ({
        ...err,
        message: err.message,
        stack: err.stack,
        name: err.name,
      })),
      O.fold(
        () => meta,
        (processed) => processed
      )
    );

    env.winstonLogger.error(message, processedMeta);
  });
};

/**
 * Pure warning logging function
 */
export const logWarn: (message: string, meta?: unknown) => LogOperation<void> = (
  message,
  meta
) => logMessage('warn')(message)(meta);

/**
 * Pure debug logging function
 */
export const logDebug: (message: string, meta?: unknown) => LogOperation<void> = (
  message,
  meta
) => logMessage('debug')(message)(meta);

/**
 * Curried versions of logging functions for partial application
 * Demonstrates currying for function composition
 */
export const logInfoCurried = (message: string) => (meta?: unknown): LogOperation<void> =>
  logInfo(message, meta);

export const logErrorCurried = (message: string) => (meta?: unknown): LogOperation<void> =>
  logError(message, meta);

export const logWarnCurried = (message: string) => (meta?: unknown): LogOperation<void> =>
  logWarn(message, meta);

export const logDebugCurried = (message: string) => (meta?: unknown): LogOperation<void> =>
  logDebug(message, meta);

/**
 * Execute a LogOperation with a winston logger environment
 * This is the only place where side effects happen
 * Pure function - deterministic output based on input
 */
export const executeLogOperation = <A>(
  operation: LogOperation<A>,
  winstonLogger: winston.Logger
): A => {
  return operation({ winstonLogger });
};

/**
 * Compose multiple log operations sequentially
 * Useful for logging multiple messages
 * Demonstrates sequence operation
 */
export const composeLogOperations = (
  operations: LogOperation<void>[]
): LogOperation<void> => {
  return R.asks((env: LoggerEnv) => {
    operations.forEach((op) => op(env));
  });
};

/**
 * Applicative sequencing for LogOperations
 * Run multiple operations in sequence
 */
export const sequenceLogOperations = (
  operations: LogOperation<void>[]
): LogOperation<void> => {
  return composeLogOperations(operations);
};

/**
 * Map over a log operation - functor operation
 * Demonstrates functor laws
 */
export const fmapLogOperation = <A, B>(
  f: (a: A) => B,
  op: LogOperation<A>
): LogOperation<B> => {
  return R.map(f)(op);
};

/**
 * Bifunctor operations for Either in configuration
 * Demonstrates error handling composition
 */

export const mapValidationError = <A>(
  f: (e: ValidationError) => ValidationError,
  result: E.Either<ValidationError, A>
): E.Either<ValidationError, A> => {
  return E.mapLeft(f)(result);
};

export const mapValidationResult = <A, B>(
  f: (a: A) => B,
  result: E.Either<ValidationError, A>
): E.Either<ValidationError, B> => {
  return E.map(f)(result);
};

export const bimap =
  <E1, E2, A, B>(
    f: (e: E1) => E2,
    g: (a: A) => B
  ): ((result: E.Either<E1, A>) => E.Either<E2, B>) =>
  E.bimap(f, g);

/**
 * Pure function to create a Winston logger instance
 * Returns a Task to delay side effects until execution
 */
export const createWinstonLogger = (
  options: winston.LoggerOptions
): T.Task<winston.Logger> => {
  return () => Promise.resolve(winston.createLogger(options));
};

/**
 * Batch log operations - useful for structured logging
 * Pure function returning Reader
 */
export const batchLogOperations = (
  operations: Array<LogOperation<void>>
): LogOperation<void> => {
  return composeLogOperations(operations);
};

/**
 * Tap operation - for side effects in pipelines
 * Executes operation but returns original value
 * Useful for debugging
 */
export const tapLogOperation = <A>(
  operation: LogOperation<void>
): ((a: A) => LogOperation<A>) => {
  return (a: A) =>
    R.asks((env: LoggerEnv) => {
      operation(env);
      return a;
    });
};

/**
 * Validate then build - common pattern in FP
 * Returns Either for error handling
 */
export const validateAndBuild = (
  name: string,
  options: LoggerOptionsInput = {}
): E.Either<ValidationError, winston.LoggerOptions> => {
  return pipe(validateLoggerConfig(name, options), E.map(buildWinstonLoggerOptions));
};

/**
 * Chain validation with error recovery
 * Demonstrates Either monadic error handling
 */
export const validateAndBuildWithRecovery =
  (recovery: (error: ValidationError) => winston.LoggerOptions) =>
  (
    name: string,
    options: LoggerOptionsInput = {}
  ): winston.LoggerOptions => {
    return pipe(
      validateAndBuild(name, options),
      E.fold(recovery, identity)
    );
  };

/**
 * Higher-order function to create logger builders
 * Demonstrates functional factory pattern
 */
export const createLoggerBuilder =
  (config: LoggerConfig) =>
  (winstonLogger: winston.Logger): { readonly info: (msg: string, meta?: unknown) => void; readonly error: (msg: string, meta?: unknown) => void; readonly warn: (msg: string, meta?: unknown) => void; readonly debug: (msg: string, meta?: unknown) => void } => {
    return {
      info: (msg: string, meta?: unknown) => executeLogOperation(logInfo(msg, meta), winstonLogger),
      error: (msg: string, meta?: unknown) => executeLogOperation(logError(msg, meta), winstonLogger),
      warn: (msg: string, meta?: unknown) => executeLogOperation(logWarn(msg, meta), winstonLogger),
      debug: (msg: string, meta?: unknown) => executeLogOperation(logDebug(msg, meta), winstonLogger),
    };
  };

/**
 * Compose log operations with transformation
 * Demonstrates composition of readers
 */
export const composeWithTransform = <A>(
  transform: (a: A) => LogOperation<void>,
  value: A
): LogOperation<void> => {
  return transform(value);
};

/**
 * Filter log operations - predicate-based filtering
 * Only execute if predicate is true
 */
export const filterLogOperation = (
  predicate: () => boolean
): ((op: LogOperation<void>) => LogOperation<void>) => {
  return (op: LogOperation<void>) =>
    R.asks((env: LoggerEnv) => {
      if (predicate()) {
        op(env);
      }
    });
};

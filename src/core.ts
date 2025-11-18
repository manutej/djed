/**
 * Functional programming core for @djed/logger
 * Uses fp-ts for zero-side-effects configuration and logging
 */

import winston from 'winston';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as R from 'fp-ts/Reader';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';

/**
 * Validation Error type for configuration
 */
export type ValidationError = string;

/**
 * Logger configuration domain model
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
 * Pure function to validate and normalize LoggerOptionsInput into LoggerConfig
 * Returns Either<ValidationError, LoggerConfig>
 */
export const validateLoggerConfig = (
  name: string,
  options: LoggerOptionsInput = {}
): E.Either<ValidationError, LoggerConfig> => {
  // Validate logger name
  if (!name || name.trim().length === 0) {
    return E.left('Logger name cannot be empty');
  }

  // Build config with defaults
  const config: LoggerConfig = {
    name: name.trim(),
    level: options.level || 'info',
    format: options.format || 'pretty',
    silent: options.silent || false,
    winstonOptions: O.fromNullable(options.winston),
  };

  return E.right(config);
};

/**
 * Pure function to create winston format based on format option
 * No side effects - just configuration
 */
export const createWinstonFormat = (
  format: 'json' | 'pretty'
): winston.Logform.Format => {
  const baseFormats = [
    winston.format.timestamp(),
    format === 'json'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
  ];

  return winston.format.combine(...baseFormats);
};

/**
 * Pure function to create winston transports
 * No side effects - just configuration
 */
export const createWinstonTransports = (): winston.transport[] => {
  return [new winston.transports.Console()];
};

/**
 * Pure function to build winston logger options
 * Composition of pure functions, no side effects
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
    format: pipe(
      config.format,
      (fmt) => createWinstonFormat(fmt),
      (fmt) =>
        winston.format.combine(
          winston.format.label({ label: config.name }),
          fmt
        )
    ),
    transports: createWinstonTransports(),
    silent: config.silent,
  };
};

/**
 * Logger environment - winston logger dependency
 * Used with Reader pattern for dependency injection
 */
export interface LoggerEnv {
  readonly winstonLogger: winston.Logger;
}

/**
 * Reader type alias for logging operations
 * Encapsulates side effects in a functional way
 */
export type LogOperation<A> = R.Reader<LoggerEnv, A>;

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
 * Pure logging function using Reader pattern
 * Composes with LoggerEnv to access the winston logger
 */
export const logInfo = (
  message: string,
  meta?: unknown
): LogOperation<void> =>
  R.asks((env: LoggerEnv) => env.winstonLogger.info(message, meta));

/**
 * Pure error logging function
 * Handles Error objects properly without side effects
 */
export const logError = (
  message: string,
  meta?: unknown
): LogOperation<void> => {
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
export const logWarn = (
  message: string,
  meta?: unknown
): LogOperation<void> =>
  R.asks((env: LoggerEnv) => env.winstonLogger.warn(message, meta));

/**
 * Pure debug logging function
 */
export const logDebug = (
  message: string,
  meta?: unknown
): LogOperation<void> =>
  R.asks((env: LoggerEnv) => env.winstonLogger.debug(message, meta));

/**
 * Execute a LogOperation with a winston logger environment
 * This is the only place where side effects happen
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
 */
export const composeLogOperations = (
  operations: LogOperation<void>[]
): LogOperation<void> => {
  return R.asks((env: LoggerEnv) => {
    operations.forEach((op) => op(env));
  });
};

/**
 * Lift a pure value into the Reader context
 */
export const liftPure = <A>(value: A): LogOperation<A> => {
  return R.of(value);
};

/**
 * Map over a log operation
 */
export const mapLogOperation = <A, B>(
  f: (a: A) => B,
  op: LogOperation<A>
): LogOperation<B> => {
  return R.map(f)(op);
};

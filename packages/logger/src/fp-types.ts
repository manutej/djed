/**
 * Functional Programming Types and Abstractions
 * Type-level safety using Branded Types (Newtype pattern)
 * Zero runtime overhead, pure type safety
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

/**
 * Branded type helper
 * Creates a type that's distinct from its base type at compile time only
 */
type Brand<T, U> = T & { readonly __brand: U };

/**
 * LogLevel - Branded type for type safety
 * Prevents passing arbitrary strings where LogLevel is expected
 */
export type LogLevel = Brand<'debug' | 'info' | 'warn' | 'error', 'LogLevel'>;

/**
 * Format - Branded type for output format
 */
export type Format = Brand<'json' | 'pretty', 'Format'>;

/**
 * LoggerName - Branded type for logger names
 * Ensures non-empty, trimmed strings
 */
export type LoggerName = Brand<string, 'LoggerName'>;

/**
 * LogMessage - Branded type for log messages
 */
export type LogMessage = Brand<string, 'LogMessage'>;

/**
 * Predicates for validation - pure functions with no side effects
 */

export const isValidLogLevel = (level: string): level is 'debug' | 'info' | 'warn' | 'error' => {
  return ['debug', 'info', 'warn', 'error'].includes(level);
};

export const isValidFormat = (format: string): format is 'json' | 'pretty' => {
  return ['json', 'pretty'].includes(format);
};

export const isNonEmptyString = (s: string): boolean => {
  return s.trim().length > 0;
};

/**
 * Smart constructors - create branded types with validation
 * Returns Either<ValidationError, BrandedType> for safety
 */

export const createLogLevel = (level: string): E.Either<string, LogLevel> => {
  return isValidLogLevel(level)
    ? E.right(level as LogLevel)
    : E.left(`Invalid log level: ${level}`);
};

export const createFormat = (format: string): E.Either<string, Format> => {
  return isValidFormat(format)
    ? E.right(format as Format)
    : E.left(`Invalid format: ${format}`);
};

export const createLoggerName = (name: string): E.Either<string, LoggerName> => {
  const trimmed = name.trim();
  return isNonEmptyString(name)
    ? E.right(trimmed as LoggerName)
    : E.left('Logger name cannot be empty');
};

export const createLogMessage = (message: string): E.Either<string, LogMessage> => {
  return isNonEmptyString(message)
    ? E.right((message.trim() as unknown) as LogMessage)
    : E.left('Log message cannot be empty');
};

/**
 * Getters - extract branded values (zero cost at runtime)
 */

export const getLogLevel = (level: LogLevel): string => level as unknown as string;
export const getFormat = (format: Format): string => format as unknown as string;
export const getLoggerName = (name: LoggerName): string => name as unknown as string;
export const getLogMessage = (message: LogMessage): string => message as unknown as string;

/**
 * Type guards as predicates - pure functions
 */

export const isJsonFormat = (format: Format): boolean => {
  return getFormat(format) === 'json';
};

export const isPrettyFormat = (format: Format): boolean => {
  return getFormat(format) === 'pretty';
};

/**
 * Discriminated Union for Log Levels (ADT pattern)
 * Type-safe pattern matching
 */

export type LogLevelADT =
  | { readonly kind: 'debug' }
  | { readonly kind: 'info' }
  | { readonly kind: 'warn' }
  | { readonly kind: 'error' };

export const logLevelToADT = (level: LogLevel): LogLevelADT => {
  const value = getLogLevel(level);
  const result: LogLevelADT = (() => {
    switch (value) {
      case 'debug':
        return { kind: 'debug' };
      case 'info':
        return { kind: 'info' };
      case 'warn':
        return { kind: 'warn' };
      case 'error':
        return { kind: 'error' };
      default:
        // This should never happen due to type safety, but TypeScript needs it
        return { kind: 'info' };
    }
  })();
  return result;
};

export const matchLogLevel = <A>(
  adt: LogLevelADT,
  patterns: {
    debug: () => A;
    info: () => A;
    warn: () => A;
    error: () => A;
  }
): A => {
  const result: A = (() => {
    switch (adt.kind) {
      case 'debug':
        return patterns.debug();
      case 'info':
        return patterns.info();
      case 'warn':
        return patterns.warn();
      case 'error':
        return patterns.error();
    }
  })();
  return result;
};

/**
 * Metadata type - heterogeneous collection
 * Ensures metadata is always an object or undefined
 */
export type Metadata = Record<string, unknown> | undefined;

/**
 * LogEntry ADT - Discriminated union for different log types
 * Pure data structure for representing log operations
 */

export type LogEntry =
  | { readonly kind: 'info'; readonly message: LogMessage; readonly meta: Metadata }
  | { readonly kind: 'error'; readonly message: LogMessage; readonly meta: Metadata }
  | { readonly kind: 'warn'; readonly message: LogMessage; readonly meta: Metadata }
  | { readonly kind: 'debug'; readonly message: LogMessage; readonly meta: Metadata };

/**
 * Smart constructors for LogEntry
 * Safe creation with validation
 */

export const createInfoLogEntry = (
  message: LogMessage,
  meta?: Metadata
): LogEntry => ({
  kind: 'info',
  message,
  meta,
});

export const createErrorLogEntry = (
  message: LogMessage,
  meta?: Metadata
): LogEntry => ({
  kind: 'error',
  message,
  meta,
});

export const createWarnLogEntry = (
  message: LogMessage,
  meta?: Metadata
): LogEntry => ({
  kind: 'warn',
  message,
  meta,
});

export const createDebugLogEntry = (
  message: LogMessage,
  meta?: Metadata
): LogEntry => ({
  kind: 'debug',
  message,
  meta,
});

/**
 * Pattern match on LogEntry
 * Exhaustive, type-safe pattern matching
 */

export const matchLogEntry = <A>(
  entry: LogEntry,
  patterns: {
    info: (message: LogMessage, meta: Metadata) => A;
    error: (message: LogMessage, meta: Metadata) => A;
    warn: (message: LogMessage, meta: Metadata) => A;
    debug: (message: LogMessage, meta: Metadata) => A;
  }
): A => {
  const result: A = (() => {
    switch (entry.kind) {
      case 'info':
        return patterns.info(entry.message, entry.meta);
      case 'error':
        return patterns.error(entry.message, entry.meta);
      case 'warn':
        return patterns.warn(entry.message, entry.meta);
      case 'debug':
        return patterns.debug(entry.message, entry.meta);
    }
  })();
  return result;
};

/**
 * Curried factory for LogEntry creation
 * Enables partial application and composition
 */

export const createLogEntry =
  (kind: LogEntry['kind']) =>
  (message: LogMessage) =>
  (meta?: Metadata): LogEntry => {
    const result: LogEntry = (() => {
      switch (kind) {
        case 'info':
          return createInfoLogEntry(message, meta);
        case 'error':
          return createErrorLogEntry(message, meta);
        case 'warn':
          return createWarnLogEntry(message, meta);
        case 'debug':
          return createDebugLogEntry(message, meta);
      }
    })();
    return result;
  };

/**
 * Extract kind from LogEntry
 */

export const getLogEntryKind = (entry: LogEntry): LogEntry['kind'] => entry.kind;

export const getLogEntryMessage = (entry: LogEntry): LogMessage => entry.message;

export const getLogEntryMeta = (entry: LogEntry): Metadata => entry.meta;

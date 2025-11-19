/**
 * @djed/telemetry - Structured Logging Module
 * Writer monad integration for logging with values
 */

import * as E from 'fp-ts/Either';
import * as W from 'fp-ts/Writer';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { Monoid } from 'fp-ts/Monoid';
import * as A from 'fp-ts/Array';
import {
  LogEntry,
  LogLevel,
  Labels,
  LogCollection,
  TelemetryError,
  TelemetryContext,
  TelemetryOp,
  TraceContext,
} from './types';

// ============================================================================
// L1 API - Simple Log Entry Creation
// ============================================================================

/**
 * Create a log entry
 */
export const createLogEntry = (
  level: LogLevel,
  message: string,
  context?: Labels,
  error?: unknown
): LogEntry => ({
  level,
  message,
  timestamp: new Date(),
  context,
  error,
});

/**
 * Create a trace log
 */
export const trace = (message: string, context?: Labels): LogEntry =>
  createLogEntry('trace', message, context);

/**
 * Create a debug log
 */
export const debug = (message: string, context?: Labels): LogEntry =>
  createLogEntry('debug', message, context);

/**
 * Create an info log
 */
export const info = (message: string, context?: Labels): LogEntry =>
  createLogEntry('info', message, context);

/**
 * Create a warning log
 */
export const warn = (message: string, context?: Labels): LogEntry =>
  createLogEntry('warn', message, context);

/**
 * Create an error log
 */
export const error = (message: string, context?: Labels, err?: unknown): LogEntry =>
  createLogEntry('error', message, context, err);

/**
 * Create a fatal log
 */
export const fatal = (message: string, context?: Labels, err?: unknown): LogEntry =>
  createLogEntry('fatal', message, context, err);

// ============================================================================
// L2 API - Writer Monad for Logging with Values
// ============================================================================

/**
 * Writer monad that accumulates logs
 */
export type LogWriter<A> = W.Writer<readonly LogEntry[], A>;

/**
 * Monoid for log entries (concatenation)
 */
export const LogEntryMonoid: Monoid<readonly LogEntry[]> = A.getMonoid<LogEntry>();

/**
 * Create a Writer with a log entry
 */
export const tell = (entry: LogEntry): LogWriter<void> => W.tell([entry]);

/**
 * Tell a trace log
 */
export const tellTrace = (message: string, context?: Labels): LogWriter<void> =>
  tell(trace(message, context));

/**
 * Tell a debug log
 */
export const tellDebug = (message: string, context?: Labels): LogWriter<void> =>
  tell(debug(message, context));

/**
 * Tell an info log
 */
export const tellInfo = (message: string, context?: Labels): LogWriter<void> =>
  tell(info(message, context));

/**
 * Tell a warning log
 */
export const tellWarn = (message: string, context?: Labels): LogWriter<void> =>
  tell(warn(message, context));

/**
 * Tell an error log
 */
export const tellError = (
  message: string,
  context?: Labels,
  err?: unknown
): LogWriter<void> => tell(error(message, context, err));

/**
 * Tell a fatal log
 */
export const tellFatal = (
  message: string,
  context?: Labels,
  err?: unknown
): LogWriter<void> => tell(fatal(message, context, err));

/**
 * Run a computation with logging
 */
export const withLogging = <A>(
  computation: LogWriter<A>
): [A, readonly LogEntry[]] => {
  return W.writer.execute(computation);
};

/**
 * Map over Writer value
 */
export const mapWriter = <A, B>(f: (a: A) => B) => (
  wa: LogWriter<A>
): LogWriter<B> => W.writer.map(wa, f);

/**
 * Chain Writer computations
 */
export const chainWriter = <A, B>(f: (a: A) => LogWriter<B>) => (
  wa: LogWriter<A>
): LogWriter<B> => W.writer.chain(wa, f);

/**
 * Lift a value into Writer
 */
export const ofWriter = <A>(a: A): LogWriter<A> => W.writer.of(a);

// ============================================================================
// L3 API - Structured Logging with Context
// ============================================================================

/**
 * Log collection
 */
export const createLogCollection = (entries: readonly LogEntry[]): LogCollection => ({
  entries,
});

/**
 * Add trace context to log entry
 */
export const withTraceContext = (traceContext: TraceContext) => (
  entry: LogEntry
): LogEntry => ({
  ...entry,
  context: {
    ...entry.context,
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
  },
});

/**
 * Add custom context to log entry
 */
export const withContext = (context: Labels) => (entry: LogEntry): LogEntry => ({
  ...entry,
  context: {
    ...entry.context,
    ...context,
  },
});

/**
 * Filter logs by level
 */
export const filterByLevel = (minLevel: LogLevel) => (
  collection: LogCollection
): LogCollection => {
  const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const minIndex = levels.indexOf(minLevel);

  return {
    entries: collection.entries.filter(
      (entry) => levels.indexOf(entry.level) >= minIndex
    ),
  };
};

/**
 * Filter logs by time range
 */
export const filterByTimeRange = (start: Date, end: Date) => (
  collection: LogCollection
): LogCollection => ({
  entries: collection.entries.filter(
    (entry) => entry.timestamp >= start && entry.timestamp <= end
  ),
});

/**
 * Group logs by level
 */
export const groupByLevel = (
  collection: LogCollection
): Record<LogLevel, readonly LogEntry[]> => {
  const groups: Record<LogLevel, LogEntry[]> = {
    trace: [],
    debug: [],
    info: [],
    warn: [],
    error: [],
    fatal: [],
  };

  collection.entries.forEach((entry) => {
    groups[entry.level].push(entry);
  });

  return groups;
};

/**
 * Get error logs
 */
export const getErrorLogs = (collection: LogCollection): readonly LogEntry[] =>
  collection.entries.filter((entry) => entry.level === 'error' || entry.level === 'fatal');

// ============================================================================
// Formatting and Output
// ============================================================================

/**
 * Format log entry as JSON
 */
export const formatJson = (entry: LogEntry): string => {
  return JSON.stringify({
    level: entry.level,
    message: entry.message,
    timestamp: entry.timestamp.toISOString(),
    ...(entry.context ? { context: entry.context } : {}),
    ...(entry.error ? { error: String(entry.error) } : {}),
  });
};

/**
 * Format log entry as human-readable text
 */
export const formatText = (entry: LogEntry): string => {
  const level = entry.level.toUpperCase().padEnd(5);
  const timestamp = entry.timestamp.toISOString();
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const error = entry.error ? ` ERROR: ${entry.error}` : '';

  return `[${timestamp}] ${level} ${entry.message}${context}${error}`;
};

/**
 * Format log collection
 */
export const formatCollection = (
  collection: LogCollection,
  formatter: (entry: LogEntry) => string = formatText
): string => {
  return collection.entries.map(formatter).join('\n');
};

// ============================================================================
// Performance Logging
// ============================================================================

/**
 * Log function execution with timing
 */
export const logExecution = <A>(
  name: string,
  fn: () => A
): LogWriter<A> => {
  const start = Date.now();

  return pipe(
    tellDebug(`Starting ${name}`),
    chainWriter(() => {
      try {
        const result = fn();
        const duration = Date.now() - start;

        return pipe(
          tellInfo(`Completed ${name}`, { duration: String(duration) }),
          mapWriter(() => result)
        );
      } catch (err) {
        const duration = Date.now() - start;
        return pipe(
          tellError(`Failed ${name}`, { duration: String(duration) }, err),
          chainWriter(() => {
            throw err;
          })
        );
      }
    })
  );
};

/**
 * Log async function execution with timing
 */
export const logAsyncExecution = async <A>(
  name: string,
  fn: () => Promise<A>
): Promise<[A, readonly LogEntry[]]> => {
  const logs: LogEntry[] = [];
  const start = Date.now();

  logs.push(debug(`Starting ${name}`));

  try {
    const result = await fn();
    const duration = Date.now() - start;

    logs.push(info(`Completed ${name}`, { duration: String(duration) }));

    return [result, logs];
  } catch (err) {
    const duration = Date.now() - start;

    logs.push(error(`Failed ${name}`, { duration: String(duration) }, err));

    throw err;
  }
};

// ============================================================================
// Integration with Telemetry Context
// ============================================================================

/**
 * Log to telemetry context
 */
export const log = (entry: LogEntry): TelemetryOp<void> => (ctx) => {
  // In a real implementation, this would store logs in context or export them
  // For now, we just return success
  return TE.right(undefined);
};

/**
 * Log with trace context
 */
export const logWithTrace = (
  level: LogLevel,
  message: string,
  context?: Labels
): TelemetryOp<void> => (ctx) => {
  // Get current active span if any
  const spans = Array.from(ctx.spans.values());
  const activeSpan = spans.find((s) => !s.endTime);

  const entry = createLogEntry(level, message, context);

  if (activeSpan) {
    const enhancedEntry = withTraceContext(activeSpan.context)(entry);
    return log(enhancedEntry)(ctx);
  }

  return log(entry)(ctx);
};

// ============================================================================
// Log Aggregation
// ============================================================================

/**
 * Aggregate logs from multiple sources
 */
export const aggregateLogs = (
  collections: readonly LogCollection[]
): LogCollection => {
  const allEntries = collections.flatMap((c) => c.entries);

  // Sort by timestamp
  const sorted = [...allEntries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  return createLogCollection(sorted);
};

/**
 * Sample logs (take every nth log)
 */
export const sampleLogs = (n: number) => (
  collection: LogCollection
): LogCollection => ({
  entries: collection.entries.filter((_, index) => index % n === 0),
});

/**
 * Limit log collection size
 */
export const limitLogs = (maxSize: number) => (
  collection: LogCollection
): LogCollection => ({
  entries: collection.entries.slice(-maxSize),
});

// ============================================================================
// Log Statistics
// ============================================================================

/**
 * Get log statistics
 */
export interface LogStats {
  readonly total: number;
  readonly byLevel: Record<LogLevel, number>;
  readonly errorCount: number;
  readonly timeRange: {
    readonly start: Date;
    readonly end: Date;
  };
}

export const getLogStats = (collection: LogCollection): LogStats | null => {
  if (collection.entries.length === 0) return null;

  const byLevel: Record<LogLevel, number> = {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };

  collection.entries.forEach((entry) => {
    byLevel[entry.level]++;
  });

  const timestamps = collection.entries.map((e) => e.timestamp.getTime());

  return {
    total: collection.entries.length,
    byLevel,
    errorCount: byLevel.error + byLevel.fatal,
    timeRange: {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    },
  };
};

/**
 * Format log statistics
 */
export const formatLogStats = (stats: LogStats): string => {
  const lines = [
    `Total Logs: ${stats.total}`,
    `Error Count: ${stats.errorCount}`,
    '',
    'By Level:',
    ...Object.entries(stats.byLevel).map(
      ([level, count]) => `  ${level.toUpperCase()}: ${count}`
    ),
    '',
    `Time Range: ${stats.timeRange.start.toISOString()} - ${stats.timeRange.end.toISOString()}`,
  ];

  return lines.join('\n');
};

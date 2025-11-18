import winston from 'winston';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import {
  validateLoggerConfig,
  buildWinstonLoggerOptions,
  executeLogOperation,
  logInfo,
  logError,
  logWarn,
  logDebug,
  LoggerOptionsInput,
} from './core';

/**
 * Logger options supporting progressive complexity (L1 → L2 → L3)
 * Backward compatible with existing code
 */
export interface LoggerOptions extends LoggerOptionsInput {
  /**
   * L2: Logging level
   * @default 'info'
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * L2: Output format
   * @default 'pretty'
   */
  format?: 'json' | 'pretty';

  /**
   * L2: Silent mode (no output)
   * Useful for testing and benchmarking
   * @default false
   */
  silent?: boolean;

  /**
   * L3: Full Winston configuration (expert escape hatch)
   * When provided, level, format, and silent are ignored
   */
  winston?: winston.LoggerOptions;
}

/**
 * Structured logger wrapper around Winston
 * Now using functional programming patterns with zero side effects during configuration
 *
 * Progressive API Design:
 * - L1 (Novice): new Logger('app-name') - zero config, works immediately
 * - L2 (Intermediate): new Logger('app-name', { level, format }) - customize behavior
 * - L3 (Expert): new Logger('app-name', { winston }) - full Winston control
 *
 * @example
 * // L1: Zero config
 * const logger = new Logger('my-app');
 * logger.info('Hello world');
 *
 * @example
 * // L2: Customize
 * const logger = new Logger('my-app', { level: 'debug', format: 'json' });
 * logger.debug('Debug message', { userId: 123 });
 *
 * @example
 * // L3: Full control
 * const logger = new Logger('my-app', {
 *   winston: {
 *     level: 'silly',
 *     transports: [new winston.transports.File({ filename: 'app.log' })]
 *   }
 * });
 */
export class Logger {
  private winston: winston.Logger;

  constructor(private name: string, options: LoggerOptions = {}) {
    // Use functional configuration pipeline with fp-ts Either
    // This ensures all configuration is validated and pure
    const config = pipe(
      validateLoggerConfig(name, options),
      E.map((cfg) => buildWinstonLoggerOptions(cfg)),
      E.fold(
        (error) => {
          // In case of validation error, create a minimal logger
          console.error(`Logger validation error: ${error}`);
          return { silent: true } as winston.LoggerOptions;
        },
        (opts) => opts
      )
    );

    // Side effect only happens here - logger instantiation
    this.winston = winston.createLogger(config);
  }

  /**
   * Log an info message
   * Uses functional Reader pattern for pure logging operation
   * @param message - Message to log
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: any): void {
    executeLogOperation(logInfo(message, meta), this.winston);
  }

  /**
   * Log an error message
   * Uses functional Reader pattern with proper Error serialization
   * @param message - Error message
   * @param meta - Optional metadata (e.g., error object, context)
   */
  error(message: string, meta?: any): void {
    executeLogOperation(logError(message, meta), this.winston);
  }

  /**
   * Log a warning message
   * Uses functional Reader pattern for pure logging operation
   * @param message - Warning message
   * @param meta - Optional metadata
   */
  warn(message: string, meta?: any): void {
    executeLogOperation(logWarn(message, meta), this.winston);
  }

  /**
   * Log a debug message
   * Uses functional Reader pattern for pure logging operation
   * @param message - Debug message
   * @param meta - Optional metadata
   */
  debug(message: string, meta?: any): void {
    executeLogOperation(logDebug(message, meta), this.winston);
  }

  /**
   * Get the underlying Winston logger instance (for advanced use)
   * This allows ejecting to pure Winston if needed
   */
  getWinstonLogger(): winston.Logger {
    return this.winston;
  }
}

/**
 * Measure time to first log (for DX metrics)
 * Built-in measurement for success criteria validation
 * Pure function with no persistent side effects
 * @returns Time in milliseconds
 */
export function measureTimeToFirstLog(): number {
  const start = Date.now();
  const logger = new Logger('benchmark', { silent: true });
  logger.info('benchmark');
  return Date.now() - start;
}

/**
 * Create a logger with sensible defaults (convenience function)
 * Pure factory function with deferred side effects
 * @param name - Logger name
 * @param options - Optional logger configuration
 * @returns Logger instance
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  return new Logger(name, options);
}

// Re-export Winston for L3 users (convenience)
export { winston };

// Export functional core for advanced users who want to compose their own loggers
export {
  validateLoggerConfig,
  buildWinstonLoggerOptions,
  createWinstonFormat,
  createWinstonTransports,
  createWinstonLogger,
  logInfo,
  logError,
  logWarn,
  logDebug,
  executeLogOperation,
  composeLogOperations,
  liftPure,
  mapLogOperation,
  type ValidationError,
  type LoggerConfig,
  type LoggerOptionsInput,
  type LogOperation,
  type LoggerEnv,
} from './core';

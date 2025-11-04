import winston from 'winston';

/**
 * Logger options supporting progressive complexity (L1 → L2 → L3)
 */
export interface LoggerOptions {
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
    // L3: Full Winston control if provided
    if (options.winston) {
      this.winston = winston.createLogger(options.winston);
      return;
    }

    // L2: Silent mode (for testing/benchmarking)
    if (options.silent) {
      this.winston = winston.createLogger({ silent: true });
      return;
    }

    // L1/L2: Sensible defaults
    const format = options.format === 'json'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        );

    this.winston = winston.createLogger({
      level: options.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: name }),
        format
      ),
      transports: [new winston.transports.Console()]
    });
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param meta - Optional metadata (e.g., error object, context)
   */
  error(message: string, meta?: any): void {
    // Serialize Error objects properly for JSON logging
    if (meta instanceof Error) {
      meta = {
        ...meta,  // Include any custom properties first
        message: meta.message,
        stack: meta.stack,
        name: meta.name
      };
    }
    this.winston.error(message, meta);
  }

  /**
   * Log a warning message
   * @param message - Warning message
   * @param meta - Optional metadata
   */
  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  /**
   * Log a debug message
   * @param message - Debug message
   * @param meta - Optional metadata
   */
  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
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
 * @param name - Logger name
 * @returns Logger instance
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  return new Logger(name, options);
}

// Re-export Winston for L3 users (convenience)
export { winston };

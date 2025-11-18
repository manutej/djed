/**
 * Logger Configuration
 *
 * This file demonstrates the progressive API of @djed/logger:
 * - L1: Zero-config (commented out, but shown for reference)
 * - L2: Environment-specific configuration
 * - L3: Custom transports and advanced features
 */

import { Logger, winston } from '@djed/logger';

// =============================================================================
// L1: NOVICE - Zero Config (Simplest Possible)
// =============================================================================
//
// For quick prototyping or simple scripts:
//
// const logger = new Logger('task-api');
// logger.info('Application started');
//
// That's it! Works immediately with sensible defaults.

// =============================================================================
// L2: INTERMEDIATE - Environment-Specific Config (What We Use Here)
// =============================================================================

const environment = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');

export const logger = new Logger('task-api', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

// =============================================================================
// L3: EXPERT - Custom Transports and Advanced Features
// =============================================================================

/**
 * For advanced use cases, get the underlying Winston logger
 * and add custom transports
 */
if (environment === 'production') {
  const winstonLogger = logger.getWinstonLogger();

  // Example: Add file transport for all logs
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/task-api.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );

  // Example: Add separate error-only file
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/errors.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// =============================================================================
// MODULE-SPECIFIC LOGGERS
// =============================================================================

/**
 * Create separate loggers for different modules
 * This allows filtering and organizing logs by component
 */
export const apiLogger = new Logger('task-api:api', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

export const dbLogger = new Logger('task-api:db', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

export const authLogger = new Logger('task-api:auth', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

// Log startup
logger.info('Logger initialized', {
  environment,
  logLevel,
  fileLogging: environment === 'production'
});

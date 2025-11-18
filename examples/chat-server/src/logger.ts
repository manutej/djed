/**
 * Logger Configuration for Real-Time Chat Server
 *
 * Demonstrates @djed/logger in WebSocket/event-driven context
 */

import { Logger, winston } from '@djed/logger';

const environment = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');

// Main application logger
export const logger = new Logger('chat-server', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

// Module-specific loggers for different aspects of the chat server
export const socketLogger = new Logger('chat-server:socket', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

export const roomLogger = new Logger('chat-server:room', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

export const messageLogger = new Logger('chat-server:message', {
  level: logLevel as 'debug' | 'info' | 'warn' | 'error',
  format: environment === 'production' ? 'json' : 'pretty'
});

// Production file logging
if (environment === 'production') {
  const winstonLogger = logger.getWinstonLogger();

  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/chat-server.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );

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

logger.info('Logger initialized', {
  environment,
  logLevel,
  fileLogging: environment === 'production'
});

/**
 * Logging Middleware
 *
 * Request/response logging middleware using @djed/logger.
 * Logs:
 * - Request method, path, and headers
 * - Response status and duration
 * - Errors during request processing
 *
 * Uses functional patterns where possible.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@djed/logger';

/**
 * Extract relevant request information for logging
 */
function getRequestInfo(req: Request): Record<string, unknown> {
  return {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    // Don't log sensitive headers
    headers: {
      'content-type': req.get('content-type'),
      'accept': req.get('accept'),
    },
  };
}

/**
 * Extract response information for logging
 */
function getResponseInfo(res: Response, duration: number): Record<string, unknown> {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    duration: `${duration}ms`,
  };
}

/**
 * Determine log level based on status code
 */
function getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Create request logging middleware
 *
 * @example
 * import { loggingMiddleware } from './middleware/logging';
 * import { Logger } from '@djed/logger';
 *
 * const logger = new Logger('app');
 * app.use(loggingMiddleware(logger));
 */
export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log incoming request
    logger.debug('Incoming request', getRequestInfo(req));

    // Capture response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = getLogLevel(res.statusCode);

      // Log response
      logger[level]('Request completed', {
        ...getRequestInfo(req),
        ...getResponseInfo(res, duration),
      });
    });

    // Capture response error event
    res.on('error', (error) => {
      const duration = Date.now() - startTime;

      logger.error('Response error', {
        ...getRequestInfo(req),
        duration: `${duration}ms`,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    });

    next();
  };
}

/**
 * Create slow request logging middleware
 * Logs a warning if request takes longer than threshold
 *
 * @param logger - Logger instance
 * @param thresholdMs - Threshold in milliseconds (default: 1000)
 */
export function slowRequestMiddleware(logger: Logger, thresholdMs = 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > thresholdMs) {
        logger.warn('Slow request detected', {
          ...getRequestInfo(req),
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
        });
      }
    });

    next();
  };
}

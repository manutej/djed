/**
 * Request Logging Middleware
 *
 * Demonstrates @djed/logger integration with Express
 */

import { Request, Response, NextFunction } from 'express';
import { apiLogger } from '../logger';

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request logger middleware
 * Logs all incoming requests and responses
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Attach request ID to request object
  (req as any).requestId = requestId;

  // Log incoming request
  apiLogger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;

    // Log response
    apiLogger.info('Response sent', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logger middleware
 * Logs all errors that occur during request handling
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).requestId;

  apiLogger.error('Request error', {
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Pass error to next error handler
  next(err);
}

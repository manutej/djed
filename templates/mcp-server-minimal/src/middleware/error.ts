/**
 * Error Handling Middleware
 *
 * Centralized error handling for Express.
 * Handles:
 * - Application errors
 * - Validation errors
 * - Unexpected errors
 *
 * Uses functional patterns for error transformation.
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@djed/logger';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

/**
 * HTTP Error type
 */
export interface HttpError extends Error {
  readonly statusCode?: number;
  readonly details?: unknown;
}

/**
 * Create an HTTP error
 */
export function createHttpError(
  message: string,
  statusCode = 500,
  details?: unknown
): HttpError {
  const error = new Error(message) as HttpError;
  (error as any).statusCode = statusCode;
  (error as any).details = details;
  return error;
}

/**
 * Error response type
 */
interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp: string;
  readonly path: string;
}

/**
 * Transform error to error response
 * Uses Either for functional error handling
 */
function toErrorResponse(
  error: Error | HttpError,
  req: Request
): ErrorResponse {
  const httpError = error as HttpError;

  return {
    error: httpError.name || 'Error',
    message: httpError.message,
    details: httpError.details,
    timestamp: new Date().toISOString(),
    path: req.path,
  };
}

/**
 * Determine HTTP status code from error
 */
function getStatusCode(error: Error | HttpError): number {
  const httpError = error as HttpError;

  // Use error's status code if available
  if (httpError.statusCode) {
    return httpError.statusCode;
  }

  // Validation errors should be 400
  if (error.name === 'ValidationError') {
    return 400;
  }

  // Default to 500 for unexpected errors
  return 500;
}

/**
 * Check if error should be logged as error (vs warn)
 */
function shouldLogAsError(statusCode: number): boolean {
  return statusCode >= 500;
}

/**
 * Sanitize error for production
 * Removes sensitive information in production
 */
function sanitizeError(
  error: ErrorResponse,
  isDevelopment: boolean
): ErrorResponse {
  if (isDevelopment) {
    return error;
  }

  // In production, hide internal error details
  return {
    ...error,
    details: undefined,
  };
}

/**
 * Error handling middleware
 * Must be registered last in the middleware chain
 *
 * @example
 * import { errorMiddleware } from './middleware/error';
 * import { Logger } from '@djed/logger';
 *
 * const logger = new Logger('app');
 * app.use(errorMiddleware(logger));
 */
export function errorMiddleware(logger: Logger) {
  return (
    error: Error | HttpError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Get status code
    const statusCode = getStatusCode(error);

    // Log error
    if (shouldLogAsError(statusCode)) {
      logger.error('Request error', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        request: {
          method: req.method,
          path: req.path,
          query: req.query,
        },
        statusCode,
      });
    } else {
      logger.warn('Request warning', {
        error: {
          name: error.name,
          message: error.message,
        },
        request: {
          method: req.method,
          path: req.path,
        },
        statusCode,
      });
    }

    // Create error response
    const errorResponse = pipe(
      toErrorResponse(error, req),
      (resp) => sanitizeError(resp, process.env.NODE_ENV !== 'production')
    );

    // Send error response
    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 *
 * @example
 * import { asyncHandler } from './middleware/error';
 *
 * router.get('/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

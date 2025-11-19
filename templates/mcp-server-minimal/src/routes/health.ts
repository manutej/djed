/**
 * Health Check Routes
 *
 * Provides health check endpoints for monitoring and orchestration.
 * These endpoints are used by:
 * - Docker healthchecks
 * - Kubernetes liveness/readiness probes
 * - Load balancers
 * - Monitoring systems
 */

import { Router, Request, Response } from 'express';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { Logger } from '@djed/logger';
import { AppConfig } from '../config';

/**
 * Health status type
 */
interface HealthStatus {
  readonly status: 'healthy' | 'unhealthy';
  readonly timestamp: string;
  readonly uptime: number;
  readonly version: string;
  readonly checks: ReadonlyArray<HealthCheck>;
}

/**
 * Individual health check result
 */
interface HealthCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail';
  readonly message?: string;
  readonly duration?: number;
}

/**
 * Perform database health check (if database is configured)
 * Returns Either<Error, HealthCheck>
 */
function checkDatabase(
  config: AppConfig,
  logger: Logger
): E.Either<Error, HealthCheck> {
  return pipe(
    config.database,
    O.fold(
      // No database configured - skip check
      () =>
        E.right<Error, HealthCheck>({
          name: 'database',
          status: 'pass',
          message: 'not configured',
        }),
      // Database configured - perform check
      (dbConfig) => {
        // TODO: Implement actual database ping
        // For now, just check if URL is present
        const isValid = dbConfig.url.length > 0;

        return isValid
          ? E.right({
              name: 'database',
              status: 'pass' as const,
              message: 'connected',
            })
          : E.left(new Error('Database URL is invalid'));
      }
    )
  );
}

/**
 * Perform all health checks
 * Returns array of health check results
 */
function performHealthChecks(
  config: AppConfig,
  logger: Logger
): ReadonlyArray<HealthCheck> {
  const checks: HealthCheck[] = [];

  // Database check
  pipe(
    checkDatabase(config, logger),
    E.fold(
      (error) => {
        checks.push({
          name: 'database',
          status: 'fail',
          message: error.message,
        });
      },
      (check) => {
        checks.push(check);
      }
    )
  );

  // Add more checks here as needed
  // - External API connectivity
  // - Cache connectivity
  // - File system access
  // etc.

  return checks;
}

/**
 * Calculate overall health status
 * Status is healthy only if all checks pass
 */
function calculateHealthStatus(
  checks: ReadonlyArray<HealthCheck>
): 'healthy' | 'unhealthy' {
  return checks.every((check) => check.status === 'pass')
    ? 'healthy'
    : 'unhealthy';
}

/**
 * Create health check router
 *
 * Endpoints:
 * - GET /health - Simple health check (200 if healthy, 503 if unhealthy)
 * - GET /health/detailed - Detailed health status with all checks
 */
export function healthRouter(config: AppConfig, logger: Logger): Router {
  const router = Router();

  /**
   * Simple health check endpoint
   * Returns 200 if healthy, 503 if unhealthy
   */
  router.get('/', (req: Request, res: Response) => {
    const checks = performHealthChecks(config, logger);
    const status = calculateHealthStatus(checks);

    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health check endpoint
   * Returns full health status with all checks
   */
  router.get('/detailed', (req: Request, res: Response) => {
    const checks = performHealthChecks(config, logger);
    const status = calculateHealthStatus(checks);

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };

    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  });

  /**
   * Liveness probe endpoint (Kubernetes)
   * Always returns 200 if the process is running
   */
  router.get('/live', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Readiness probe endpoint (Kubernetes)
   * Returns 200 if ready to accept traffic, 503 otherwise
   */
  router.get('/ready', (req: Request, res: Response) => {
    const checks = performHealthChecks(config, logger);
    const status = calculateHealthStatus(checks);

    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status: status === 'healthy' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

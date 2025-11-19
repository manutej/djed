/**
 * @djed/telemetry - Health Check Module
 * Functional health checks with composable patterns
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { Monoid } from 'fp-ts/Monoid';
import {
  HealthCheck,
  HealthStatus,
  SystemHealth,
  TelemetryError,
  TelemetryContext,
  TelemetryOp,
  metricError,
} from './types';

// ============================================================================
// L1 API - Simple Health Checks
// ============================================================================

/**
 * Create a health check
 */
export const createHealthCheck = (
  name: string,
  status: HealthStatus,
  message?: string,
  metadata?: Record<string, unknown>
): HealthCheck => ({
  name,
  status,
  message,
  timestamp: new Date(),
  metadata,
});

/**
 * Create a healthy check
 */
export const healthy = (name: string, message?: string): HealthCheck =>
  createHealthCheck(name, 'healthy', message);

/**
 * Create a degraded check
 */
export const degraded = (name: string, message?: string): HealthCheck =>
  createHealthCheck(name, 'degraded', message);

/**
 * Create an unhealthy check
 */
export const unhealthy = (name: string, message: string): HealthCheck =>
  createHealthCheck(name, 'unhealthy', message);

// ============================================================================
// L2 API - Composable Health Checks
// ============================================================================

/**
 * Health check function type
 */
export type HealthCheckFn = () => TE.TaskEither<TelemetryError, HealthCheck>;

/**
 * Create a health check from a predicate
 */
export const fromPredicate = (
  name: string,
  predicate: () => boolean,
  unhealthyMessage: string
): HealthCheckFn => () =>
  TE.of(predicate() ? healthy(name) : unhealthy(name, unhealthyMessage));

/**
 * Create a health check from an async predicate
 */
export const fromAsyncPredicate = (
  name: string,
  predicate: () => Promise<boolean>,
  unhealthyMessage: string
): HealthCheckFn => () =>
  pipe(
    TE.tryCatch(
      () => predicate(),
      (error) => metricError(`Health check ${name} failed`, error)
    ),
    TE.map((result) =>
      result ? healthy(name) : unhealthy(name, unhealthyMessage)
    )
  );

/**
 * Create a timed health check
 */
export const timed = (fn: HealthCheckFn): HealthCheckFn => () => {
  const start = Date.now();

  return pipe(
    fn(),
    TE.map((check) => ({
      ...check,
      duration: Date.now() - start,
    }))
  );
};

/**
 * Create a health check with timeout
 */
export const withTimeout = (timeoutMs: number) => (
  fn: HealthCheckFn
): HealthCheckFn => () => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
  );

  return pipe(
    TE.tryCatch(
      () => Promise.race([fn()(), timeoutPromise]),
      (error) => metricError('Health check timeout', error)
    ),
    TE.flatten
  );
};

/**
 * Create a health check with retry
 */
export const withRetry = (retries: number, delayMs: number = 100) => (
  fn: HealthCheckFn
): HealthCheckFn => {
  const attempt = (attemptsLeft: number): TE.TaskEither<TelemetryError, HealthCheck> =>
    pipe(
      fn(),
      TE.orElse((error) => {
        if (attemptsLeft <= 0) {
          return TE.left(error);
        }
        return pipe(
          TE.tryCatch(
            () => new Promise((resolve) => setTimeout(resolve, delayMs)),
            (e) => metricError('Retry delay failed', e)
          ),
          TE.chain(() => attempt(attemptsLeft - 1))
        );
      })
    );

  return () => attempt(retries);
};

// ============================================================================
// L3 API - System Health Aggregation
// ============================================================================

/**
 * Determine overall health status from multiple checks
 */
const aggregateStatus = (checks: readonly HealthCheck[]): HealthStatus => {
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
};

/**
 * Create system health from checks
 */
export const createSystemHealth = (checks: readonly HealthCheck[]): SystemHealth => ({
  status: aggregateStatus(checks),
  checks,
  timestamp: new Date(),
});

/**
 * Run multiple health checks in parallel
 */
export const runHealthChecks = (
  checks: readonly HealthCheckFn[]
): TE.TaskEither<TelemetryError, SystemHealth> =>
  pipe(
    A.sequence(TE.ApplicativePar)(checks.map((fn) => fn())),
    TE.map(createSystemHealth)
  );

/**
 * Run health checks with error recovery
 */
export const runHealthChecksWithRecovery = (
  checks: readonly HealthCheckFn[]
): TE.TaskEither<TelemetryError, SystemHealth> =>
  pipe(
    TE.tryCatch(
      async () => {
        const results = await Promise.allSettled(checks.map((fn) => fn()()));

        const healthChecks = results.map((result, index): HealthCheck => {
          if (result.status === 'fulfilled') {
            return pipe(
              result.value,
              E.getOrElse(() =>
                unhealthy(`check_${index}`, 'Health check returned error')
              )
            );
          } else {
            return unhealthy(
              `check_${index}`,
              `Health check failed: ${result.reason}`
            );
          }
        });

        return healthChecks;
      },
      (error) => metricError('Failed to run health checks', error)
    ),
    TE.map(createSystemHealth)
  );

// ============================================================================
// Predefined Health Checks
// ============================================================================

/**
 * Check memory usage
 */
export const memoryCheck = (thresholdPercent: number = 90): HealthCheckFn => () =>
  pipe(
    TE.tryCatch(
      () => {
        const usage = process.memoryUsage();
        const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

        if (heapUsedPercent >= thresholdPercent) {
          return Promise.resolve(
            unhealthy(
              'memory',
              `Memory usage at ${heapUsedPercent.toFixed(2)}%`
            )
          );
        } else if (heapUsedPercent >= thresholdPercent * 0.8) {
          return Promise.resolve(
            degraded(
              'memory',
              `Memory usage at ${heapUsedPercent.toFixed(2)}%`
            )
          );
        }

        return Promise.resolve(
          createHealthCheck(
            'memory',
            'healthy',
            `Memory usage at ${heapUsedPercent.toFixed(2)}%`,
            {
              heapUsed: usage.heapUsed,
              heapTotal: usage.heapTotal,
              external: usage.external,
            }
          )
        );
      },
      (error) => metricError('Memory check failed', error)
    ),
    TE.flatten
  );

/**
 * Check disk space (Node.js only, requires fs)
 */
export const diskCheck = (path: string = '/', thresholdPercent: number = 90): HealthCheckFn => () =>
  TE.tryCatch(
    async () => {
      // This is a placeholder - actual implementation would use fs.statfs or similar
      // For now, we'll return a healthy check
      return healthy('disk', `Disk space check for ${path}`);
    },
    (error) => metricError('Disk check failed', error)
  );

/**
 * Check database connectivity
 */
export const databaseCheck = (
  name: string,
  checkConnection: () => Promise<boolean>
): HealthCheckFn => () =>
  pipe(
    TE.tryCatch(
      () => checkConnection(),
      (error) => metricError(`Database check ${name} failed`, error)
    ),
    TE.map((connected) =>
      connected
        ? healthy(name, 'Database connected')
        : unhealthy(name, 'Database not connected')
    )
  );

/**
 * Check external service
 */
export const serviceCheck = (
  name: string,
  checkService: () => Promise<boolean>
): HealthCheckFn => () =>
  pipe(
    TE.tryCatch(
      () => checkService(),
      (error) => metricError(`Service check ${name} failed`, error)
    ),
    TE.map((available) =>
      available
        ? healthy(name, 'Service available')
        : unhealthy(name, 'Service unavailable')
    )
  );

/**
 * Check uptime
 */
export const uptimeCheck = (name: string = 'uptime'): HealthCheckFn => () =>
  TE.of(
    createHealthCheck(name, 'healthy', 'Service running', {
      uptime: process.uptime(),
      startTime: Date.now() - process.uptime() * 1000,
    })
  );

// ============================================================================
// Reader Pattern Integration
// ============================================================================

/**
 * Register a health check in the telemetry context
 */
export const registerHealthCheck = (
  name: string,
  check: HealthCheckFn
): TelemetryOp<void> => (ctx) => {
  ctx.healthChecks.set(name, check);
  return TE.right(undefined);
};

/**
 * Run all registered health checks
 */
export const runAllHealthChecks = (): TelemetryOp<SystemHealth> => (ctx) => {
  if (!ctx.config.health.enabled) {
    return TE.left(metricError('Health checks are disabled'));
  }

  const checks = Array.from(ctx.healthChecks.values());
  return runHealthChecksWithRecovery(checks)(ctx);
};

/**
 * Get health check by name
 */
export const getHealthCheck = (name: string): TelemetryOp<HealthCheck> => (ctx) => {
  const check = ctx.healthChecks.get(name);

  if (!check) {
    return TE.left(metricError(`Health check ${name} not found`));
  }

  return pipe(
    check(),
    TE.mapLeft((error) => metricError(`Health check ${name} failed`, error))
  )(ctx);
};

/**
 * Clear all health checks
 */
export const clearHealthChecks = (): TelemetryOp<void> => (ctx) => {
  ctx.healthChecks.clear();
  return TE.right(undefined);
};

// ============================================================================
// Health Check Monoid
// ============================================================================

/**
 * Monoid for combining health statuses (worst wins)
 */
export const HealthStatusMonoid: Monoid<HealthStatus> = {
  concat: (x, y) => {
    if (x === 'unhealthy' || y === 'unhealthy') return 'unhealthy';
    if (x === 'degraded' || y === 'degraded') return 'degraded';
    return 'healthy';
  },
  empty: 'healthy',
};

/**
 * Monoid for combining health checks
 */
export const HealthCheckMonoid: Monoid<HealthCheck> = {
  concat: (x, y) => ({
    name: `${x.name}_${y.name}`,
    status: HealthStatusMonoid.concat(x.status, y.status),
    message: [x.message, y.message].filter(Boolean).join('; '),
    timestamp: new Date(),
    duration: (x.duration || 0) + (y.duration || 0),
  }),
  empty: healthy('empty'),
};

// ============================================================================
// Health Dashboard Utilities
// ============================================================================

/**
 * Format health check for display
 */
export const formatHealthCheck = (check: HealthCheck): string => {
  const status = check.status.toUpperCase();
  const duration = check.duration ? ` (${check.duration}ms)` : '';
  const message = check.message ? `: ${check.message}` : '';
  return `[${status}] ${check.name}${duration}${message}`;
};

/**
 * Format system health for display
 */
export const formatSystemHealth = (health: SystemHealth): string => {
  const lines = [
    `System Status: ${health.status.toUpperCase()}`,
    `Timestamp: ${health.timestamp.toISOString()}`,
    '',
    'Health Checks:',
    ...health.checks.map((check) => `  ${formatHealthCheck(check)}`),
  ];

  return lines.join('\n');
};

/**
 * Filter checks by status
 */
export const filterByStatus = (status: HealthStatus) => (
  health: SystemHealth
): readonly HealthCheck[] => health.checks.filter((c) => c.status === status);

/**
 * Get failed checks
 */
export const getFailedChecks = (health: SystemHealth): readonly HealthCheck[] =>
  health.checks.filter((c) => c.status !== 'healthy');

/**
 * Check if system is healthy
 */
export const isHealthy = (health: SystemHealth): boolean =>
  health.status === 'healthy';

/**
 * Get health summary
 */
export const getHealthSummary = (
  health: SystemHealth
): Record<HealthStatus, number> => {
  const summary = {
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
  };

  health.checks.forEach((check) => {
    summary[check.status]++;
  });

  return summary;
};

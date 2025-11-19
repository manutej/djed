/**
 * Job scheduling and delayed jobs
 * @module scheduler
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import type { QueueBackend, JobData, JobOptions, Job, QueueError, JobId } from './types';
import { operationError } from './types';

// ============================================================================
// Schedule Types
// ============================================================================

/**
 * Cron expression for recurring jobs
 */
export type CronExpression = string;

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  readonly pattern: CronExpression;
  readonly timezone?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly limit?: number; // Max number of times to run
}

/**
 * Repeatable job configuration
 */
export interface RepeatableJobConfig {
  readonly every?: number; // Repeat every N milliseconds
  readonly cron?: CronExpression;
  readonly limit?: number;
  readonly immediately?: boolean; // Run immediately on add
  readonly jobId?: string; // Custom job ID for repeatable jobs
}

// ============================================================================
// Delayed Job Operations
// ============================================================================

/**
 * Add a delayed job
 */
export const addDelayedJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  delay: number,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return backend.add(data, { ...opts, delay });
};

/**
 * Schedule a job for a specific time
 */
export const scheduleJobAt = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  timestamp: Date,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  const now = Date.now();
  const targetTime = timestamp.getTime();
  const delay = Math.max(0, targetTime - now);

  return addDelayedJob(backend, data, delay, opts);
};

/**
 * Schedule a job after a duration (in milliseconds)
 */
export const scheduleJobAfter = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  duration: number,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return addDelayedJob(backend, data, duration, opts);
};

// ============================================================================
// Recurring Jobs (Simple Implementation)
// ============================================================================

/**
 * Add a repeatable job (simple interval-based)
 */
export const addRepeatableJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  interval: number,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  // This is a simple implementation that just schedules the first occurrence
  // A full implementation would need a separate scheduler service
  return backend.add(data, { ...opts, delay: interval });
};

// ============================================================================
// Batch Scheduling
// ============================================================================

/**
 * Schedule multiple jobs with different delays
 */
export const scheduleBatch = <T>(
  backend: QueueBackend,
  jobs: ReadonlyArray<{ data: JobData<T>; delay: number; opts?: JobOptions }>
): TE.TaskEither<QueueError, ReadonlyArray<Job<T>>> => {
  return pipe(
    [...jobs],
    A.map(({ data, delay, opts }) =>
      addDelayedJob(backend, data, delay, opts)
    ),
    A.sequence(TE.ApplicativePar)
  );
};

/**
 * Schedule jobs at specific times
 */
export const scheduleAtTimes = <T>(
  backend: QueueBackend,
  jobs: ReadonlyArray<{ data: JobData<T>; timestamp: Date; opts?: JobOptions }>
): TE.TaskEither<QueueError, ReadonlyArray<Job<T>>> => {
  const now = Date.now();

  return pipe(
    [...jobs],
    A.map(({ data, timestamp, opts }) => {
      const delay = Math.max(0, timestamp.getTime() - now);
      return addDelayedJob(backend, data, delay, opts);
    }),
    A.sequence(TE.ApplicativePar)
  );
};

// ============================================================================
// Cron Parsing (Simple)
// ============================================================================

/**
 * Parse a simple cron expression (limited implementation)
 * Format: "* * * * *" (minute hour day month dayOfWeek)
 */
export const parseCronExpression = (
  expression: CronExpression
): O.Option<{
  minute: string;
  hour: string;
  day: string;
  month: string;
  dayOfWeek: string;
}> => {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    return O.none;
  }

  return O.some({
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  });
};

/**
 * Get next occurrence of a cron expression (simplified)
 * This is a basic implementation - for production use a proper cron library
 */
export const getNextCronOccurrence = (
  expression: CronExpression,
  after?: Date
): O.Option<Date> => {
  // This is a placeholder - a real implementation would use a cron parser library
  // For now, return none to indicate not implemented
  return O.none;
};

// ============================================================================
// Job Dependencies
// ============================================================================

/**
 * Wait for dependencies to complete before processing
 */
export const waitForDependencies = (
  backend: QueueBackend,
  dependencies: ReadonlyArray<JobId>
): TE.TaskEither<QueueError, ReadonlyArray<Job>> => {
  return pipe(
    [...dependencies],
    A.map((jobId) => backend.getJob(jobId)),
    A.sequence(TE.ApplicativePar),
    TE.chain((maybeJobs) => {
      const jobs = A.compact(maybeJobs);

      // Check if all dependencies exist
      if (jobs.length !== dependencies.length) {
        return TE.left(
          operationError('Some job dependencies not found')
        );
      }

      // Check if all dependencies are completed
      const allCompleted = jobs.every((job) => job.metadata.status === 'completed');

      if (!allCompleted) {
        return TE.left(
          operationError('Some job dependencies not completed')
        );
      }

      return TE.right(jobs);
    })
  );
};

/**
 * Add a job with dependencies
 */
export const addJobWithDependencies = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  dependencies: ReadonlyArray<JobId>,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return pipe(
    waitForDependencies(backend, dependencies),
    TE.chain(() =>
      backend.add(data, {
        ...opts,
        dependencies,
      })
    )
  );
};

// ============================================================================
// Priority Queue Helpers
// ============================================================================

/**
 * Add a high priority job
 */
export const addHighPriorityJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return backend.add(data, { ...opts, priority: 10 });
};

/**
 * Add a low priority job
 */
export const addLowPriorityJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return backend.add(data, { ...opts, priority: -10 });
};

/**
 * Add a job with custom priority
 */
export const addPriorityJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  priority: number,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return backend.add(data, { ...opts, priority });
};

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

/**
 * Check if job can be added based on rate limit
 */
export const canAddJob = (
  backend: QueueBackend,
  rateLimit: { max: number; duration: number }
): TE.TaskEither<QueueError, boolean> => {
  return pipe(
    backend.getJobs('active'),
    TE.chain((activeJobs) => {
      const now = Date.now();
      const recentJobs = activeJobs.filter((job) => {
        const startedAt = job.metadata.startedAt?.getTime() ?? 0;
        return now - startedAt < rateLimit.duration;
      });

      return TE.right(recentJobs.length < rateLimit.max);
    })
  );
};

/**
 * Add a job with rate limiting
 */
export const addRateLimitedJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  rateLimit: { max: number; duration: number },
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  return pipe(
    canAddJob(backend, rateLimit),
    TE.chain((canAdd) => {
      if (!canAdd) {
        return TE.left(
          operationError(
            `Rate limit exceeded: ${rateLimit.max} jobs per ${rateLimit.duration}ms`
          )
        );
      }
      return backend.add(data, { ...opts, rate: rateLimit });
    })
  );
};

// ============================================================================
// Scheduling Utilities
// ============================================================================

/**
 * Calculate delay until next hour
 */
export const delayUntilNextHour = (): number => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
};

/**
 * Calculate delay until next day (midnight)
 */
export const delayUntilNextDay = (): number => {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
};

/**
 * Calculate delay until specific time of day
 */
export const delayUntilTime = (hours: number, minutes: number = 0): number => {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // If target time is in the past today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
};

/**
 * Schedule a daily job at a specific time
 */
export const scheduleDailyJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  hours: number,
  minutes: number = 0,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  const delay = delayUntilTime(hours, minutes);
  return addDelayedJob(backend, data, delay, opts);
};

/**
 * Schedule an hourly job
 */
export const scheduleHourlyJob = <T>(
  backend: QueueBackend,
  data: JobData<T>,
  opts?: JobOptions
): TE.TaskEither<QueueError, Job<T>> => {
  const delay = delayUntilNextHour();
  return addDelayedJob(backend, data, delay, opts);
};

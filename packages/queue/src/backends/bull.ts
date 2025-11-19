/**
 * Bull/Redis queue backend implementation
 * @module backends/bull
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import type {
  QueueBackend,
  JobData,
  JobOptions,
  Job,
  QueueError,
  JobId,
  JobStatus,
  JobProcessor,
  EventHandler,
  QueueEvent,
  BullQueueConfig,
  JobMetadata,
} from '../types';
import {
  defaultJobOptions,
  operationError,
  connectionError,
  jobNotFoundError,
  queueClosedError,
  jobFailedError,
} from '../types';

// Type-safe Bull import (optional dependency)
let Bull: any;
try {
  Bull = require('bull');
} catch {
  // Bull is not installed
  Bull = null;
}

// ============================================================================
// Type Mappings
// ============================================================================

/**
 * Map Bull job to our Job type
 */
const fromBullJob = <T = unknown>(bullJob: any): Job<T> => {
  const metadata: JobMetadata = {
    id: String(bullJob.id),
    queueName: bullJob.queue.name,
    createdAt: new Date(bullJob.timestamp),
    startedAt: bullJob.processedOn ? new Date(bullJob.processedOn) : undefined,
    completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined,
    failedAt: bullJob.failedReason ? new Date(bullJob.failedReason) : undefined,
    attempts: (bullJob.attemptsMade ?? 0) > 0
      ? Array.from({ length: bullJob.attemptsMade }, (_, i) => ({
          attemptNumber: i + 1,
          timestamp: new Date(),
          error: bullJob.failedReason ? new Error(bullJob.failedReason) : undefined,
        }))
      : [],
    status: mapBullStatus(bullJob),
  };

  return {
    id: String(bullJob.id),
    data: bullJob.data,
    priority: bullJob.opts.priority ?? 0,
    delay: bullJob.opts.delay ?? 0,
    metadata,
    opts: {
      priority: bullJob.opts.priority,
      delay: bullJob.opts.delay,
      attempts: bullJob.opts.attempts,
      timeout: bullJob.opts.timeout,
      removeOnComplete: bullJob.opts.removeOnComplete,
      removeOnFail: bullJob.opts.removeOnFail,
    },
  };
};

/**
 * Map Bull job state to our JobStatus
 */
const mapBullStatus = (bullJob: any): JobStatus => {
  if (bullJob.finishedOn && !bullJob.failedReason) return 'completed';
  if (bullJob.failedReason) return 'failed';
  if (bullJob.processedOn) return 'active';
  if (bullJob.delay && bullJob.delay > 0) return 'delayed';
  return 'waiting';
};

/**
 * Map our JobOptions to Bull options
 */
const toBullOptions = (opts: JobOptions) => ({
  priority: opts.priority,
  delay: opts.delay,
  attempts: opts.attempts,
  timeout: opts.timeout,
  removeOnComplete: opts.removeOnComplete,
  removeOnFail: opts.removeOnFail,
  backoff: opts.retry
    ? {
        type: opts.retry.backoffType === 'exponential' ? 'exponential' : 'fixed',
        delay: opts.retry.backoffDelay,
      }
    : undefined,
});

// ============================================================================
// Bull Backend Implementation
// ============================================================================

/**
 * Create a Bull/Redis queue backend
 */
export const createBullBackend = (
  config: BullQueueConfig
): QueueBackend => {
  if (!Bull) {
    throw new Error(
      'Bull is not installed. Install it with: npm install bull ioredis'
    );
  }

  const queueName = config.name;
  const redisConfig =
    typeof config.redis === 'string'
      ? config.redis
      : {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          tls: config.redis.tls ? {} : undefined,
        };

  const bullQueue = new Bull(queueName, {
    redis: redisConfig,
    prefix: config.prefix,
    defaultJobOptions: toBullOptions(
      config.defaultJobOptions ?? defaultJobOptions
    ),
    settings: config.settings,
  });

  // Event handlers
  const eventHandlers = new Set<EventHandler>();

  // ============================================================================
  // Setup Bull Event Listeners
  // ============================================================================

  const emitEvent = (event: QueueEvent) => {
    eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  };

  bullQueue.on('added', (bullJob: any) => {
    emitEvent({ type: 'job:added', job: fromBullJob(bullJob) });
  });

  bullQueue.on('active', (bullJob: any) => {
    emitEvent({ type: 'job:active', job: fromBullJob(bullJob) });
  });

  bullQueue.on('completed', (bullJob: any, result: unknown) => {
    emitEvent({ type: 'job:completed', job: fromBullJob(bullJob), result });
  });

  bullQueue.on('failed', (bullJob: any, error: Error) => {
    emitEvent({
      type: 'job:failed',
      job: fromBullJob(bullJob),
      error: jobFailedError(String(bullJob.id), error.message, error),
    });
  });

  bullQueue.on('paused', () => {
    emitEvent({ type: 'queue:paused' });
  });

  bullQueue.on('resumed', () => {
    emitEvent({ type: 'queue:resumed' });
  });

  bullQueue.on('drained', () => {
    emitEvent({ type: 'queue:drained' });
  });

  bullQueue.on('error', (error: Error) => {
    emitEvent({ type: 'queue:error', error: operationError(error.message, error) });
  });

  // ============================================================================
  // Basic Operations
  // ============================================================================

  const add = <T>(
    data: JobData<T>,
    opts?: JobOptions
  ): TE.TaskEither<QueueError, Job<T>> => {
    return TE.tryCatch(
      async () => {
        const bullOpts = toBullOptions({ ...defaultJobOptions, ...opts });
        const bullJob = await bullQueue.add(data, bullOpts);
        return fromBullJob<T>(bullJob);
      },
      (error) =>
        operationError('Failed to add job to Bull queue', error as Error)
    );
  };

  const addBulk = <T>(
    jobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>
  ): TE.TaskEither<QueueError, ReadonlyArray<Job<T>>> => {
    return TE.tryCatch(
      async () => {
        const bullJobs = await bullQueue.addBulk(
          jobs.map(({ data, opts }) => ({
            data,
            opts: toBullOptions({ ...defaultJobOptions, ...opts }),
          }))
        );
        return bullJobs.map((bullJob: any) => fromBullJob<T>(bullJob));
      },
      (error) =>
        operationError('Failed to add bulk jobs to Bull queue', error as Error)
    );
  };

  const getJob = <T>(
    jobId: JobId
  ): TE.TaskEither<QueueError, O.Option<Job<T>>> => {
    return TE.tryCatch(
      async () => {
        const bullJob = await bullQueue.getJob(jobId);
        return bullJob ? O.some(fromBullJob<T>(bullJob)) : O.none;
      },
      (error) =>
        operationError('Failed to get job from Bull queue', error as Error)
    );
  };

  const removeJob = (jobId: JobId): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const bullJob = await bullQueue.getJob(jobId);
        if (bullJob) {
          await bullJob.remove();
        }
      },
      (error) =>
        operationError('Failed to remove job from Bull queue', error as Error)
    );
  };

  // ============================================================================
  // Job Processing
  // ============================================================================

  const process = <T, R>(
    processor: JobProcessor<T, R>,
    concurrency: number = 1
  ): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        bullQueue.process(concurrency, async (bullJob: any) => {
          const job = fromBullJob<T>(bullJob);
          const result = await processor(job)();

          if (result._tag === 'Left') {
            throw new Error(result.left.message);
          }

          return result.right;
        });
      },
      (error) =>
        operationError('Failed to start Bull queue processor', error as Error)
    );
  };

  // ============================================================================
  // Queue Management
  // ============================================================================

  const pause = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        await bullQueue.pause();
      },
      (error) => operationError('Failed to pause Bull queue', error as Error)
    );
  };

  const resume = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        await bullQueue.resume();
      },
      (error) => operationError('Failed to resume Bull queue', error as Error)
    );
  };

  const isPaused = (): TE.TaskEither<QueueError, boolean> => {
    return TE.tryCatch(
      async () => {
        return await bullQueue.isPaused();
      },
      (error) =>
        operationError('Failed to check Bull queue pause status', error as Error)
    );
  };

  const drain = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        await bullQueue.drain();
      },
      (error) => operationError('Failed to drain Bull queue', error as Error)
    );
  };

  const clean = (
    grace: number,
    status?: JobStatus
  ): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const bullStatus = status
          ? mapJobStatusToBull(status)
          : 'completed';
        await bullQueue.clean(grace, bullStatus);
      },
      (error) => operationError('Failed to clean Bull queue', error as Error)
    );
  };

  const close = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        await bullQueue.close();
      },
      (error) => operationError('Failed to close Bull queue', error as Error)
    );
  };

  // ============================================================================
  // Job Queries
  // ============================================================================

  const getJobs = (
    status: JobStatus
  ): TE.TaskEither<QueueError, ReadonlyArray<Job>> => {
    return TE.tryCatch(
      async () => {
        const bullStatus = mapJobStatusToBull(status);
        const bullJobs = await bullQueue.getJobs([bullStatus]);
        return bullJobs.map((bullJob: any) => fromBullJob(bullJob));
      },
      (error) =>
        operationError('Failed to get jobs from Bull queue', error as Error)
    );
  };

  const getJobCounts = (): TE.TaskEither<
    QueueError,
    Record<JobStatus, number>
  > => {
    return TE.tryCatch(
      async () => {
        const counts = await bullQueue.getJobCounts();
        return {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
          paused: counts.paused ?? 0,
        };
      },
      (error) =>
        operationError('Failed to get job counts from Bull queue', error as Error)
    );
  };

  // ============================================================================
  // Event Handling
  // ============================================================================

  const on = (handler: EventHandler): void => {
    eventHandlers.add(handler);
  };

  const off = (handler: EventHandler): void => {
    eventHandlers.delete(handler);
  };

  // ============================================================================
  // Dead Letter Queue
  // ============================================================================

  const moveToFailed = (
    job: Job,
    error: QueueError
  ): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const bullJob = await bullQueue.getJob(job.id);
        if (bullJob) {
          await bullJob.moveToFailed({ message: error.message }, true);
        }
      },
      (error) =>
        operationError('Failed to move job to failed', error as Error)
    );
  };

  const getFailedJobs = (): TE.TaskEither<QueueError, ReadonlyArray<Job>> => {
    return getJobs('failed');
  };

  const retryFailed = (jobId: JobId): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const bullJob = await bullQueue.getJob(jobId);
        if (!bullJob) {
          throw jobNotFoundError(jobId);
        }
        await bullJob.retry();
      },
      (error) => error as QueueError
    );
  };

  // ============================================================================
  // Return Backend Interface
  // ============================================================================

  return {
    name: queueName,
    add,
    addBulk,
    process,
    getJob,
    removeJob,
    pause,
    resume,
    isPaused,
    drain,
    clean,
    close,
    getJobs,
    getJobCounts,
    on,
    off,
    moveToFailed,
    getFailedJobs,
    retryFailed,
  };
};

/**
 * Map our JobStatus to Bull status strings
 */
const mapJobStatusToBull = (status: JobStatus): string => {
  switch (status) {
    case 'waiting':
      return 'waiting';
    case 'active':
      return 'active';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'delayed':
      return 'delayed';
    case 'paused':
      return 'paused';
    default:
      return 'waiting';
  }
};

/**
 * Create a Bull backend from a Redis URL
 */
export const createBullBackendFromUrl = (
  name: string,
  redisUrl: string,
  config?: Partial<Omit<BullQueueConfig, 'name' | 'redis' | 'backend'>>
): QueueBackend => {
  return createBullBackend({
    name,
    backend: 'bull',
    redis: redisUrl,
    ...config,
  });
};

/**
 * Create a default Bull backend (connects to localhost Redis)
 */
export const createDefaultBullBackend = (name: string = 'default'): QueueBackend =>
  createBullBackend({
    name,
    backend: 'bull',
    redis: {
      host: 'localhost',
      port: 6379,
    },
  });

/**
 * In-memory queue backend implementation
 * @module backends/memory
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
  MemoryQueueConfig,
  JobMetadata,
} from '../types';
import {
  defaultJobOptions,
  operationError,
  jobNotFoundError,
  queueClosedError,
} from '../types';
// ============================================================================
// Memory Backend State
// ============================================================================

interface MemoryBackendState {
  jobs: Map<JobId, Job>;
  queue: JobId[]; // Job IDs in priority order
  processing: Set<JobId>;
  failed: Map<JobId, Job>;
  completed: Map<JobId, Job>;
  delayed: Map<JobId, NodeJS.Timeout>;
  paused: boolean;
  closed: boolean;
  eventHandlers: Set<EventHandler>;
  processingLoop: NodeJS.Timeout | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique job ID
 */
const generateJobId = (): JobId => {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create job metadata
 */
const createJobMetadata = (
  jobId: JobId,
  queueName: string
): JobMetadata => ({
  id: jobId,
  queueName,
  createdAt: new Date(),
  attempts: [],
  status: 'waiting',
});

/**
 * Create a job from data and options
 */
const createJob = <T>(
  jobId: JobId,
  queueName: string,
  data: JobData<T>,
  opts: JobOptions
): Job<T> => ({
  id: jobId,
  data,
  priority: opts.priority ?? defaultJobOptions.priority ?? 0,
  delay: opts.delay ?? defaultJobOptions.delay ?? 0,
  metadata: createJobMetadata(jobId, queueName),
  opts: { ...defaultJobOptions, ...opts },
});

/**
 * Sort jobs by priority (higher priority first) and creation time
 */
const sortJobsByPriority = (
  jobs: Map<JobId, Job>,
  jobIds: JobId[]
): JobId[] => {
  return [...jobIds].sort((a, b) => {
    const jobA = jobs.get(a);
    const jobB = jobs.get(b);

    if (!jobA || !jobB) return 0;

    // Higher priority first
    if (jobA.priority !== jobB.priority) {
      return jobB.priority - jobA.priority;
    }

    // Earlier creation time first
    return (
      jobA.metadata.createdAt.getTime() - jobB.metadata.createdAt.getTime()
    );
  });
};

/**
 * Emit an event to all handlers
 */
const emitEvent = (
  state: MemoryBackendState,
  event: QueueEvent
): void => {
  state.eventHandlers.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      // Ignore handler errors
      console.error('Event handler error:', error);
    }
  });
};

// ============================================================================
// Memory Backend Implementation
// ============================================================================

/**
 * Create an in-memory queue backend
 */
export const createMemoryBackend = (
  config: Partial<MemoryQueueConfig>
): QueueBackend => {
  const queueName = config.name ?? 'default';
  const maxSize = config.maxSize ?? 10000;

  // Initialize state
  const state: MemoryBackendState = {
    jobs: new Map(),
    queue: [],
    processing: new Set(),
    failed: new Map(),
    completed: new Map(),
    delayed: new Map(),
    paused: false,
    closed: false,
    eventHandlers: new Set(),
    processingLoop: null,
  };

  // ============================================================================
  // Basic Operations
  // ============================================================================

  const add = <T>(
    data: JobData<T>,
    opts?: JobOptions
  ): TE.TaskEither<QueueError, Job<T>> => {
    return TE.tryCatch(
      async () => {
        if (state.closed) {
          throw queueClosedError(queueName);
        }

        if (state.jobs.size >= maxSize) {
          throw operationError(`Queue is full: max size ${maxSize}`);
        }

        const jobId = generateJobId();
        const jobOpts = { ...defaultJobOptions, ...opts };
        const job = createJob(jobId, queueName, data, jobOpts);

        state.jobs.set(jobId, job);

        // Handle delayed jobs
        if (job.delay > 0) {
          const timeout = setTimeout(() => {
            state.delayed.delete(jobId);
            state.queue.push(jobId);
            state.queue = sortJobsByPriority(state.jobs, state.queue);

            const updatedJob = state.jobs.get(jobId);
            if (updatedJob) {
              emitEvent(state, { type: 'job:added', job: updatedJob });
            }
          }, job.delay);

          state.delayed.set(jobId, timeout);

          return {
            ...job,
            metadata: { ...job.metadata, status: 'delayed' },
          };
        }

        // Add to queue
        state.queue.push(jobId);
        state.queue = sortJobsByPriority(state.jobs, state.queue);

        emitEvent(state, { type: 'job:added', job });

        return job;
      },
      (error) => error as QueueError
    );
  };

  const addBulk = <T>(
    jobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>
  ): TE.TaskEither<QueueError, ReadonlyArray<Job<T>>> => {
    return pipe(
      [...jobs],
      A.map(({ data, opts }) => add(data, opts)),
      A.sequence(TE.ApplicativePar)
    );
  };

  const getJob = <T>(
    jobId: JobId
  ): TE.TaskEither<QueueError, O.Option<Job<T>>> => {
    return TE.right(
      pipe(
        O.fromNullable(state.jobs.get(jobId)),
        O.map((job) => job as Job<T>)
      )
    );
  };

  const removeJob = (jobId: JobId): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        state.jobs.delete(jobId);
        state.queue = state.queue.filter((id) => id !== jobId);
        state.processing.delete(jobId);
        state.failed.delete(jobId);
        state.completed.delete(jobId);

        const timeout = state.delayed.get(jobId);
        if (timeout) {
          clearTimeout(timeout);
          state.delayed.delete(jobId);
        }
      },
      (error) => operationError('Failed to remove job', error as Error)
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
        if (state.closed) {
          throw queueClosedError(queueName);
        }

        const processNextJob = async (): Promise<void> => {
          if (state.paused || state.closed) {
            return;
          }

          if (state.processing.size >= concurrency) {
            return;
          }

          const jobId = state.queue.shift();
          if (!jobId) {
            return;
          }

          const job = state.jobs.get(jobId);
          if (!job) {
            return;
          }

          state.processing.add(jobId);

          // Update job status
          const activeJob: Job = {
            ...job,
            metadata: {
              ...job.metadata,
              status: 'active',
              startedAt: new Date(),
            },
          };
          state.jobs.set(jobId, activeJob);

          emitEvent(state, { type: 'job:active', job: activeJob });

          try {
            const result = await processor(activeJob as Job<T>)();

            if (result._tag === 'Right') {
              // Job completed successfully
              const completedJob: Job = {
                ...activeJob,
                metadata: {
                  ...activeJob.metadata,
                  status: 'completed',
                  completedAt: new Date(),
                },
              };

              state.jobs.set(jobId, completedJob);
              state.completed.set(jobId, completedJob);
              state.processing.delete(jobId);

              if (job.opts.removeOnComplete) {
                state.jobs.delete(jobId);
              }

              emitEvent(state, {
                type: 'job:completed',
                job: completedJob,
                result: result.right,
              });
            } else {
              // Job failed
              const failedJob: Job = {
                ...activeJob,
                metadata: {
                  ...activeJob.metadata,
                  status: 'failed',
                  failedAt: new Date(),
                  attempts: [
                    ...activeJob.metadata.attempts,
                    {
                      attemptNumber: activeJob.metadata.attempts.length + 1,
                      timestamp: new Date(),
                      error: result.left.error,
                    },
                  ],
                },
              };

              state.jobs.set(jobId, failedJob);
              state.failed.set(jobId, failedJob);
              state.processing.delete(jobId);

              if (job.opts.removeOnFail) {
                state.jobs.delete(jobId);
              }

              emitEvent(state, {
                type: 'job:failed',
                job: failedJob,
                error: result.left,
              });
            }
          } catch (error) {
            // Unexpected error during processing
            const failedJob: Job = {
              ...activeJob,
              metadata: {
                ...activeJob.metadata,
                status: 'failed',
                failedAt: new Date(),
              },
            };

            state.jobs.set(jobId, failedJob);
            state.failed.set(jobId, failedJob);
            state.processing.delete(jobId);

            emitEvent(state, {
              type: 'job:failed',
              job: failedJob,
              error: operationError('Unexpected processing error', error as Error),
            });
          }
        };

        // Start processing loop
        const loop = async () => {
          if (!state.closed) {
            await processNextJob();
            state.processingLoop = setTimeout(loop, 100);
          }
        };

        loop();
      },
      (error) => operationError('Failed to start processing', error as Error)
    );
  };

  // ============================================================================
  // Queue Management
  // ============================================================================

  const pause = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        state.paused = true;
        emitEvent(state, { type: 'queue:paused' });
      },
      (error) => operationError('Failed to pause queue', error as Error)
    );
  };

  const resume = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        state.paused = false;
        emitEvent(state, { type: 'queue:resumed' });
      },
      (error) => operationError('Failed to resume queue', error as Error)
    );
  };

  const isPaused = (): TE.TaskEither<QueueError, boolean> => {
    return TE.right(state.paused);
  };

  const drain = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        state.queue = [];
        emitEvent(state, { type: 'queue:drained' });
      },
      (error) => operationError('Failed to drain queue', error as Error)
    );
  };

  const clean = (
    grace: number,
    status?: JobStatus
  ): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const now = Date.now();

        for (const [jobId, job] of state.jobs.entries()) {
          if (status && job.metadata.status !== status) {
            continue;
          }

          const jobTime =
            job.metadata.completedAt?.getTime() ??
            job.metadata.failedAt?.getTime() ??
            job.metadata.createdAt.getTime();

          if (now - jobTime > grace) {
            state.jobs.delete(jobId);
            state.completed.delete(jobId);
            state.failed.delete(jobId);
          }
        }
      },
      (error) => operationError('Failed to clean queue', error as Error)
    );
  };

  const close = (): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        state.closed = true;

        // Clear all timeouts
        for (const timeout of state.delayed.values()) {
          clearTimeout(timeout);
        }

        if (state.processingLoop) {
          clearTimeout(state.processingLoop);
        }

        state.delayed.clear();
        state.eventHandlers.clear();
      },
      (error) => operationError('Failed to close queue', error as Error)
    );
  };

  // ============================================================================
  // Job Queries
  // ============================================================================

  const getJobs = (status: JobStatus): TE.TaskEither<QueueError, ReadonlyArray<Job>> => {
    return TE.right(
      Array.from(state.jobs.values()).filter(
        (job) => job.metadata.status === status
      )
    );
  };

  const getJobCounts = (): TE.TaskEither<QueueError, Record<JobStatus, number>> => {
    return TE.tryCatch(
      async () => {
        const counts: Record<JobStatus, number> = {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
        };

        for (const job of state.jobs.values()) {
          counts[job.metadata.status]++;
        }

        return counts;
      },
      (error) => operationError('Failed to get job counts', error as Error)
    );
  };

  // ============================================================================
  // Event Handling
  // ============================================================================

  const on = (handler: EventHandler): void => {
    state.eventHandlers.add(handler);
  };

  const off = (handler: EventHandler): void => {
    state.eventHandlers.delete(handler);
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
        const failedJob: Job = {
          ...job,
          metadata: {
            ...job.metadata,
            status: 'failed',
            failedAt: new Date(),
          },
        };

        state.failed.set(job.id, failedJob);
        state.jobs.set(job.id, failedJob);

        emitEvent(state, { type: 'job:failed', job: failedJob, error });
      },
      (error) => operationError('Failed to move job to failed', error as Error)
    );
  };

  const getFailedJobs = (): TE.TaskEither<QueueError, ReadonlyArray<Job>> => {
    return TE.right(Array.from(state.failed.values()));
  };

  const retryFailed = (jobId: JobId): TE.TaskEither<QueueError, void> => {
    return TE.tryCatch(
      async () => {
        const job = state.failed.get(jobId);

        if (!job) {
          throw jobNotFoundError(jobId);
        }

        state.failed.delete(jobId);
        state.queue.push(jobId);
        state.queue = sortJobsByPriority(state.jobs, state.queue);

        const retriedJob: Job = {
          ...job,
          metadata: {
            ...job.metadata,
            status: 'waiting',
          },
        };

        state.jobs.set(jobId, retriedJob);
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
 * Create a default memory backend
 */
export const createDefaultMemoryBackend = (): QueueBackend =>
  createMemoryBackend({ name: 'default', backend: 'memory' });

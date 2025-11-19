/**
 * Core queue operations with TaskEither and Reader pattern
 * @module core
 */

import * as R from 'fp-ts/Reader';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe, flow } from 'fp-ts/function';
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
} from './types';
import { combineJobOptions } from './types';
import { withRetry } from './retry';
import type { RetryStrategy } from './types';

// ============================================================================
// Reader-based Queue Operations (Dependency Injection)
// ============================================================================

/**
 * Queue operation using Reader pattern for backend injection
 */
export type QueueOp<A> = R.Reader<QueueBackend, TE.TaskEither<QueueError, A>>;

/**
 * Lift a TaskEither operation into a QueueOp
 */
export const liftQueueOp = <A>(
  f: (backend: QueueBackend) => TE.TaskEither<QueueError, A>
): QueueOp<A> => f;

/**
 * Run a queue operation with a backend
 */
export const runQueueOp = <A>(
  op: QueueOp<A>,
  backend: QueueBackend
): TE.TaskEither<QueueError, A> => op(backend);

// ============================================================================
// L1: Simple Operations
// ============================================================================

/**
 * Add a job to the queue
 */
export const enqueue = <T>(
  data: JobData<T>,
  opts?: JobOptions
): QueueOp<Job<T>> => (backend) => backend.add(data, opts);

/**
 * Add a job with options
 */
export const enqueueWithOptions = <T>(
  data: JobData<T>,
  opts: JobOptions
): QueueOp<Job<T>> => (backend) => backend.add(data, opts);

/**
 * Get a job by ID
 */
export const getJob = <T>(jobId: JobId): QueueOp<O.Option<Job<T>>> =>
  (backend) => backend.getJob(jobId);

/**
 * Remove a job from the queue
 */
export const removeJob = (jobId: JobId): QueueOp<void> =>
  (backend) => backend.removeJob(jobId);

/**
 * Check if a job exists
 */
export const hasJob = (jobId: JobId): QueueOp<boolean> =>
  flow(
    getJob(jobId),
    TE.map(O.isSome)
  );

/**
 * Process jobs from the queue
 */
export const process = <T, R>(
  processor: JobProcessor<T, R>,
  concurrency: number = 1
): QueueOp<void> => (backend) => backend.process(processor, concurrency);

// ============================================================================
// L2: Batch Operations
// ============================================================================

/**
 * Add multiple jobs at once
 */
export const enqueueBulk = <T>(
  jobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>
): QueueOp<ReadonlyArray<Job<T>>> => (backend) => backend.addBulk(jobs);

/**
 * Get multiple jobs by IDs
 */
export const getJobs = <T>(
  jobIds: ReadonlyArray<JobId>
): QueueOp<ReadonlyArray<O.Option<Job<T>>>> =>
  (backend) =>
    pipe(
      [...jobIds],
      A.map((id) => backend.getJob<T>(id)),
      A.sequence(TE.ApplicativePar)
    );

/**
 * Remove multiple jobs
 */
export const removeJobs = (
  jobIds: ReadonlyArray<JobId>
): QueueOp<ReadonlyArray<void>> =>
  (backend) =>
    pipe(
      [...jobIds],
      A.map((id) => backend.removeJob(id)),
      A.sequence(TE.ApplicativePar)
    );

/**
 * Get jobs by status
 */
export const getJobsByStatus = (status: JobStatus): QueueOp<ReadonlyArray<Job>> =>
  (backend) => backend.getJobs(status);

/**
 * Get waiting jobs
 */
export const getWaitingJobs = (): QueueOp<ReadonlyArray<Job>> =>
  getJobsByStatus('waiting');

/**
 * Get active jobs
 */
export const getActiveJobs = (): QueueOp<ReadonlyArray<Job>> =>
  getJobsByStatus('active');

/**
 * Get completed jobs
 */
export const getCompletedJobs = (): QueueOp<ReadonlyArray<Job>> =>
  getJobsByStatus('completed');

/**
 * Get failed jobs
 */
export const getFailedJobs = (): QueueOp<ReadonlyArray<Job>> =>
  (backend) => backend.getFailedJobs();

// ============================================================================
// L2: Queue Management
// ============================================================================

/**
 * Pause the queue
 */
export const pause = (): QueueOp<void> =>
  (backend) => backend.pause();

/**
 * Resume the queue
 */
export const resume = (): QueueOp<void> =>
  (backend) => backend.resume();

/**
 * Check if queue is paused
 */
export const isPaused = (): QueueOp<boolean> =>
  (backend) => backend.isPaused();

/**
 * Drain the queue (remove all waiting jobs)
 */
export const drain = (): QueueOp<void> =>
  (backend) => backend.drain();

/**
 * Clean old jobs
 */
export const clean = (grace: number, status?: JobStatus): QueueOp<void> =>
  (backend) => backend.clean(grace, status);

/**
 * Close the queue
 */
export const close = (): QueueOp<void> =>
  (backend) => backend.close();

/**
 * Get job counts by status
 */
export const getJobCounts = (): QueueOp<Record<JobStatus, number>> =>
  (backend) => backend.getJobCounts();

// ============================================================================
// L2: Event Handling
// ============================================================================

/**
 * Subscribe to queue events
 */
export const onEvent = (handler: EventHandler): QueueOp<void> =>
  (backend) => {
    backend.on(handler);
    return TE.right(undefined);
  };

/**
 * Unsubscribe from queue events
 */
export const offEvent = (handler: EventHandler): QueueOp<void> =>
  (backend) => {
    backend.off(handler);
    return TE.right(undefined);
  };

// ============================================================================
// L3: Advanced Operations
// ============================================================================

/**
 * Process job with retry logic
 */
export const processWithRetry = <T, R>(
  processor: JobProcessor<T, R>,
  strategy: RetryStrategy,
  concurrency: number = 1
): QueueOp<void> =>
  (backend) => {
    const retryingProcessor: JobProcessor<T, R> = (job) =>
      withRetry(processor(job), strategy);

    return backend.process(retryingProcessor, concurrency);
  };

/**
 * Retry a failed job
 */
export const retryFailedJob = (jobId: JobId): QueueOp<void> =>
  (backend) => backend.retryFailed(jobId);

/**
 * Move job to failed (dead letter queue)
 */
export const moveToFailed = (job: Job, error: QueueError): QueueOp<void> =>
  (backend) => backend.moveToFailed(job, error);

/**
 * Get job or fail with error
 */
export const getJobOrFail = <T>(jobId: JobId): QueueOp<Job<T>> =>
  (backend) =>
    pipe(
      backend.getJob<T>(jobId),
      TE.chain((maybeJob) =>
        O.fold<Job<T>, TE.TaskEither<QueueError, Job<T>>>(
          () => TE.left({ type: 'JOB_NOT_FOUND' as const, message: `Job ${jobId} not found`, jobId } as QueueError),
          (job) => TE.right(job)
        )(maybeJob)
      )
    );

// ============================================================================
// L3: Job Composition
// ============================================================================

/**
 * Chain two jobs together - second job runs after first completes
 */
export const chainJobs = <T1, T2>(
  firstData: JobData<T1>,
  secondData: (result: T1) => JobData<T2>,
  firstOpts?: JobOptions,
  secondOpts?: JobOptions
): QueueOp<readonly [Job<T1>, Job<T2>]> =>
  (backend) =>
    pipe(
      backend.add(firstData, firstOpts),
      TE.chain((firstJob) =>
        pipe(
          backend.add(secondData(firstData as T1), {
            ...secondOpts,
            dependencies: [firstJob.id],
          }),
          TE.map((secondJob) => [firstJob, secondJob] as const)
        )
      )
    );

/**
 * Run jobs in parallel and wait for all to complete
 */
export const parallelJobs = <T>(
  jobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>
): QueueOp<ReadonlyArray<Job<T>>> =>
  enqueueBulk(jobs);

/**
 * Fan-out: Create multiple jobs from one result
 */
export const fanOut = <T, U>(
  sourceData: JobData<T>,
  targetJobs: ReadonlyArray<{ data: JobData<U>; opts?: JobOptions }>,
  sourceOpts?: JobOptions
): QueueOp<readonly [Job<T>, ReadonlyArray<Job<U>>]> =>
  (backend) =>
    pipe(
      backend.add(sourceData, sourceOpts),
      TE.chain((sourceJob) =>
        pipe(
          targetJobs.map((job) => ({
            ...job,
            opts: {
              ...job.opts,
              dependencies: [sourceJob.id],
            },
          })),
          (jobsWithDeps) => backend.addBulk(jobsWithDeps),
          TE.map((targetJobResults) => [sourceJob, targetJobResults] as const)
        )
      )
    );

/**
 * Fan-in: Wait for multiple jobs to complete before starting one
 */
export const fanIn = <T, U>(
  sourceJobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>,
  targetData: JobData<U>,
  targetOpts?: JobOptions
): QueueOp<readonly [ReadonlyArray<Job<T>>, Job<U>]> =>
  (backend) =>
    pipe(
      backend.addBulk(sourceJobs),
      TE.chain((sourceJobResults) =>
        pipe(
          backend.add(targetData, {
            ...targetOpts,
            dependencies: sourceJobResults.map((j) => j.id),
          }),
          TE.map((targetJob) => [sourceJobResults, targetJob] as const)
        )
      )
    );

// ============================================================================
// L3: Batch Processing with Foldable
// ============================================================================

/**
 * Process jobs in batches
 */
export const processBatch = <T, R>(
  processor: JobProcessor<T, R>,
  batchSize: number
): QueueOp<ReadonlyArray<R>> =>
  (backend) =>
    pipe(
      backend.getJobs('waiting'),
      TE.chain((waitingJobs) => {
        const batch = waitingJobs.slice(0, batchSize);
        return pipe(
          batch,
          A.map((job) => processor(job as Job<T>)),
          A.sequence(TE.ApplicativePar)
        );
      })
    );

/**
 * Map over all jobs with a status
 */
export const mapJobs = <A>(
  status: JobStatus,
  f: (job: Job) => A
): QueueOp<ReadonlyArray<A>> =>
  (backend) =>
    pipe(
      backend.getJobs(status),
      TE.map((jobs) => [...jobs].map(f))
    );

/**
 * Filter jobs by predicate
 */
export const filterJobs = (
  status: JobStatus,
  predicate: (job: Job) => boolean
): QueueOp<ReadonlyArray<Job>> =>
  (backend) =>
    pipe(
      backend.getJobs(status),
      TE.map((jobs) => [...jobs].filter(predicate))
    );

/**
 * Fold over jobs
 */
export const foldJobs = <A>(
  status: JobStatus,
  initial: A,
  f: (acc: A, job: Job) => A
): QueueOp<A> =>
  flow(
    getJobsByStatus(status),
    TE.map((jobs) => jobs.reduce(f, initial))
  );

// ============================================================================
// Utilities with Reader
// ============================================================================

/**
 * Create a queue operation with default options
 */
export const withDefaultOptions = (
  defaultOpts: JobOptions
) =>
  <T>(data: JobData<T>, opts?: JobOptions): QueueOp<Job<T>> =>
    enqueue(data, combineJobOptions([defaultOpts, opts ?? {}]));

/**
 * Create a namespaced queue operation
 */
export const withNamespace = (namespace: string) =>
  <T>(data: JobData<T>, opts?: JobOptions): QueueOp<Job<T>> =>
    (backend) => {
      // Add namespace to job data
      const namespacedData = {
        namespace,
        data,
      };
      return backend.add(namespacedData as JobData<T>, opts);
    };

/**
 * Retry queue operation on failure
 */
export const retryOp = <A>(
  op: QueueOp<A>,
  strategy: RetryStrategy
): QueueOp<A> =>
  (backend) => withRetry(op(backend), strategy);

/**
 * Run operation with timeout
 */
export const withTimeout = <A>(
  op: QueueOp<A>,
  timeout: number
): QueueOp<A> =>
  (backend) => {
    return TE.tryCatch(
      async () => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject({ type: 'JOB_TIMEOUT', message: `Operation timed out after ${timeout}ms` }),
            timeout
          )
        );

        const result = await Promise.race([op(backend)(), timeoutPromise]);

        if (result._tag === 'Left') {
          throw result.left;
        }

        return result.right;
      },
      (error) => error as QueueError
    );
  };

// ============================================================================
// Convenience Combinators
// ============================================================================

/**
 * Compose queue operations sequentially
 */
export const sequenceOps = <A>(
  ops: ReadonlyArray<QueueOp<A>>
): QueueOp<ReadonlyArray<A>> =>
  (backend) =>
    pipe(
      [...ops],
      A.map((op) => op(backend)),
      A.sequence(TE.ApplicativeSeq)
    );

/**
 * Compose queue operations in parallel
 */
export const parallelOps = <A>(
  ops: ReadonlyArray<QueueOp<A>>
): QueueOp<ReadonlyArray<A>> =>
  (backend) =>
    pipe(
      [...ops],
      A.map((op) => op(backend)),
      A.sequence(TE.ApplicativePar)
    );

/**
 * Run queue operation only if condition is met
 */
export const when = <A>(
  condition: QueueOp<boolean>,
  op: QueueOp<A>
): QueueOp<O.Option<A>> =>
  (backend) =>
    pipe(
      condition(backend),
      TE.chain((cond) =>
        cond
          ? pipe(op(backend), TE.map(O.some))
          : TE.right(O.none)
      )
    );

/**
 * Run first operation, and if it fails, run the second
 */
export const orElse = <A>(
  first: QueueOp<A>,
  second: QueueOp<A>
): QueueOp<A> =>
  (backend) =>
    pipe(
      first(backend),
      TE.orElse(() => second(backend))
    );

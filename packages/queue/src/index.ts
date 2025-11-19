/**
 * @djed/queue - Functional message queue with TaskEither
 *
 * A functional approach to message queuing with support for multiple backends,
 * job scheduling, retry logic, and advanced queue patterns.
 *
 * @example
 * ```typescript
 * import { createMemoryBackend, enqueue, process } from '@djed/queue';
 * import * as TE from 'fp-ts/TaskEither';
 * import { pipe } from 'fp-ts/function';
 *
 * // Create a backend
 * const queue = createMemoryBackend({ name: 'my-queue' });
 *
 * // L1: Simple operations
 * const addJob = await pipe(
 *   enqueue({ userId: '123', action: 'send-email' }),
 *   (op) => op(queue)
 * )();
 *
 * // L2: Process jobs
 * const processor = (job) => TE.right({ sent: true });
 * await pipe(
 *   process(processor, 5),
 *   (op) => op(queue)
 * )();
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export {
  // Core types
  JobId,
  JobData,
  JobStatus,
  JobPriority,
  JobDelay,
  JobAttempt,
  JobMetadata,
  Job,
  JobOptions,
  RetryStrategy,
  RateLimitOptions,
  JobProcessor,
  QueueEvent,
  EventHandler,
  QueueBackend,
  QueueConfig,
  // Default values
  defaultJobOptions,
  defaultRetryStrategy,
  // Monoid
  JobOptionsMonoid,
  combineJobOptions,
  // Error types
  QueueError,
  QueueErrorType,
  // Error constructors
  connectionError,
  jobNotFoundError,
  jobTimeoutError,
  jobFailedError,
  queueClosedError,
  dependencyError,
  rateLimitError,
  serializationError,
  operationError,
  // Backend configs
  MemoryQueueConfig,
  BullQueueConfig,
  RabbitMQConfig,
  SQSConfig,
  AnyQueueConfig,
  defaultQueueConfig,
  defaultMemoryQueueConfig,
  defaultBullQueueConfig,
} from './types';

// ============================================================================
// L1: Simple Queue Operations
// ============================================================================

export {
  // Reader operations
  QueueOp,
  liftQueueOp,
  runQueueOp,
  // Basic operations
  enqueue,
  enqueueWithOptions,
  getJob,
  removeJob,
  hasJob,
  process,
} from './core';

// ============================================================================
// L2: Batch Operations and Queue Management
// ============================================================================

export {
  // Batch operations
  enqueueBulk,
  getJobs,
  removeJobs,
  getJobsByStatus,
  getWaitingJobs,
  getActiveJobs,
  getCompletedJobs,
  getFailedJobs,
  // Queue management
  pause,
  resume,
  isPaused,
  drain,
  clean,
  close,
  getJobCounts,
  // Event handling
  onEvent,
  offEvent,
  // Advanced processing
  processWithRetry,
  retryFailedJob,
  moveToFailed,
  getJobOrFail,
} from './core';

// ============================================================================
// L3: Job Composition and Advanced Patterns
// ============================================================================

export {
  // Job composition
  chainJobs,
  parallelJobs,
  fanOut,
  fanIn,
  // Batch processing with Foldable
  processBatch,
  mapJobs,
  filterJobs,
  foldJobs,
  // Utilities
  withDefaultOptions,
  withNamespace,
  retryOp,
  withTimeout,
  // Combinators
  sequenceOps,
  parallelOps,
  when,
  orElse,
} from './core';

// ============================================================================
// Retry Logic (Semigroup)
// ============================================================================

export {
  // Semigroup
  RetryStrategySemigroup,
  combineRetryStrategies,
  // Backoff calculation
  calculateBackoff,
  calculateJitteredBackoff,
  // Retry predicates
  shouldRetry,
  isRetriableError,
  // Retry execution
  withRetry,
  withRetryAndTransform,
  // Retry presets
  RetryPresets,
  // Job attempt tracking
  createJobAttempt,
  addAttemptToJob,
  getNextRetryDelay,
  hasExceededMaxAttempts,
} from './retry';

// ============================================================================
// Job Scheduling
// ============================================================================

export {
  // Schedule types
  CronExpression,
  ScheduleConfig,
  RepeatableJobConfig,
  // Delayed jobs
  addDelayedJob,
  scheduleJobAt,
  scheduleJobAfter,
  // Recurring jobs
  addRepeatableJob,
  // Batch scheduling
  scheduleBatch,
  scheduleAtTimes,
  // Cron parsing
  parseCronExpression,
  getNextCronOccurrence,
  // Job dependencies
  waitForDependencies,
  addJobWithDependencies,
  // Priority helpers
  addHighPriorityJob,
  addLowPriorityJob,
  addPriorityJob,
  // Rate limiting helpers
  canAddJob,
  addRateLimitedJob,
  // Scheduling utilities
  delayUntilNextHour,
  delayUntilNextDay,
  delayUntilTime,
  scheduleDailyJob,
  scheduleHourlyJob,
} from './scheduler';

// ============================================================================
// Backends
// ============================================================================

export {
  createMemoryBackend,
  createDefaultMemoryBackend,
} from './backends/memory';

export {
  createBullBackend,
  createBullBackendFromUrl,
  createDefaultBullBackend,
} from './backends/bull';

// ============================================================================
// Convenience Re-exports from fp-ts
// ============================================================================

// Re-export commonly used fp-ts functions for convenience
export { pipe, flow } from 'fp-ts/function';

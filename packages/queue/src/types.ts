/**
 * Types for the queue package
 * @module types
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as M from 'fp-ts/Monoid';

// ============================================================================
// Job Types
// ============================================================================

/**
 * Job ID type
 */
export type JobId = string;

/**
 * Job data - generic payload for jobs
 */
export type JobData<T = unknown> = T;

/**
 * Job status
 */
export type JobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

/**
 * Job priority (higher number = higher priority)
 */
export type JobPriority = number;

/**
 * Job delay in milliseconds
 */
export type JobDelay = number;

/**
 * Job attempt tracking
 */
export interface JobAttempt {
  readonly attemptNumber: number;
  readonly timestamp: Date;
  readonly error?: Error;
}

/**
 * Job metadata
 */
export interface JobMetadata {
  readonly id: JobId;
  readonly queueName: string;
  readonly createdAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly failedAt?: Date;
  readonly attempts: ReadonlyArray<JobAttempt>;
  readonly status: JobStatus;
}

/**
 * Job with data and metadata
 */
export interface Job<T = unknown> {
  readonly id: JobId;
  readonly data: JobData<T>;
  readonly priority: JobPriority;
  readonly delay: JobDelay;
  readonly metadata: JobMetadata;
  readonly opts: JobOptions;
}

// ============================================================================
// Job Options
// ============================================================================

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  readonly maxAttempts: number;
  readonly backoffType: 'fixed' | 'exponential' | 'custom';
  readonly backoffDelay: number; // Base delay in milliseconds
  readonly backoffMultiplier?: number; // For exponential backoff
  readonly customBackoff?: (attemptNumber: number) => number;
}

/**
 * Job options
 */
export interface JobOptions {
  readonly priority?: JobPriority;
  readonly delay?: JobDelay;
  readonly attempts?: number;
  readonly retry?: RetryStrategy;
  readonly timeout?: number; // Job timeout in milliseconds
  readonly removeOnComplete?: boolean;
  readonly removeOnFail?: boolean;
  readonly stackTraceLimit?: number;
  readonly dependencies?: ReadonlyArray<JobId>; // Job dependencies
  readonly rate?: RateLimitOptions; // Rate limiting
}

/**
 * Rate limiting options
 */
export interface RateLimitOptions {
  readonly max: number; // Max jobs per duration
  readonly duration: number; // Duration in milliseconds
}

/**
 * Default job options
 */
export const defaultJobOptions: JobOptions = {
  priority: 0,
  delay: 0,
  attempts: 3,
  removeOnComplete: true,
  removeOnFail: false,
  stackTraceLimit: 10,
};

/**
 * Default retry strategy
 */
export const defaultRetryStrategy: RetryStrategy = {
  maxAttempts: 3,
  backoffType: 'exponential',
  backoffDelay: 1000,
  backoffMultiplier: 2,
};

// ============================================================================
// Job Options Monoid
// ============================================================================

/**
 * Monoid instance for JobOptions
 * Allows combining job options where right side takes precedence
 */
export const JobOptionsMonoid: M.Monoid<JobOptions> = {
  concat: (x: JobOptions, y: JobOptions): JobOptions => ({
    priority: y.priority ?? x.priority,
    delay: y.delay ?? x.delay,
    attempts: y.attempts ?? x.attempts,
    retry: y.retry ?? x.retry,
    timeout: y.timeout ?? x.timeout,
    removeOnComplete: y.removeOnComplete ?? x.removeOnComplete,
    removeOnFail: y.removeOnFail ?? x.removeOnFail,
    stackTraceLimit: y.stackTraceLimit ?? x.stackTraceLimit,
    dependencies: y.dependencies ?? x.dependencies,
    rate: y.rate ?? x.rate,
  }),
  empty: {},
};

/**
 * Combine multiple job options (right-biased)
 */
export const combineJobOptions = M.concatAll(JobOptionsMonoid);

// ============================================================================
// Queue Errors
// ============================================================================

/**
 * Queue error types
 */
export type QueueErrorType =
  | 'CONNECTION_ERROR'
  | 'JOB_NOT_FOUND'
  | 'JOB_TIMEOUT'
  | 'JOB_FAILED'
  | 'QUEUE_CLOSED'
  | 'DEPENDENCY_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'OPERATION_ERROR';

/**
 * Queue error
 */
export interface QueueError {
  readonly type: QueueErrorType;
  readonly message: string;
  readonly error?: Error;
  readonly jobId?: JobId;
}

/**
 * Error constructors
 */
export const connectionError = (message: string, error?: Error): QueueError => ({
  type: 'CONNECTION_ERROR',
  message,
  error,
});

export const jobNotFoundError = (jobId: JobId): QueueError => ({
  type: 'JOB_NOT_FOUND',
  message: `Job not found: ${jobId}`,
  jobId,
});

export const jobTimeoutError = (jobId: JobId, timeout: number): QueueError => ({
  type: 'JOB_TIMEOUT',
  message: `Job timeout after ${timeout}ms`,
  jobId,
});

export const jobFailedError = (
  jobId: JobId,
  message: string,
  error?: Error
): QueueError => ({
  type: 'JOB_FAILED',
  message,
  error,
  jobId,
});

export const queueClosedError = (queueName: string): QueueError => ({
  type: 'QUEUE_CLOSED',
  message: `Queue is closed: ${queueName}`,
});

export const dependencyError = (
  jobId: JobId,
  dependencyId: JobId
): QueueError => ({
  type: 'DEPENDENCY_ERROR',
  message: `Dependency not met for job ${jobId}: ${dependencyId}`,
  jobId,
});

export const rateLimitError = (queueName: string): QueueError => ({
  type: 'RATE_LIMIT_ERROR',
  message: `Rate limit exceeded for queue: ${queueName}`,
});

export const serializationError = (message: string, error?: Error): QueueError => ({
  type: 'SERIALIZATION_ERROR',
  message,
  error,
});

export const operationError = (message: string, error?: Error): QueueError => ({
  type: 'OPERATION_ERROR',
  message,
  error,
});

// ============================================================================
// Queue Backend Interface
// ============================================================================

/**
 * Job processor function
 * Processes a job and returns TaskEither with result
 */
export type JobProcessor<T = unknown, R = unknown> = (
  job: Job<T>
) => TE.TaskEither<QueueError, R>;

/**
 * Queue event types
 */
export type QueueEvent =
  | { type: 'job:added'; job: Job }
  | { type: 'job:active'; job: Job }
  | { type: 'job:completed'; job: Job; result: unknown }
  | { type: 'job:failed'; job: Job; error: QueueError }
  | { type: 'job:progress'; job: Job; progress: number }
  | { type: 'queue:paused' }
  | { type: 'queue:resumed' }
  | { type: 'queue:drained' }
  | { type: 'queue:error'; error: QueueError };

/**
 * Event handler type
 */
export type EventHandler = (event: QueueEvent) => void;

/**
 * Queue backend interface
 * Provides the core operations that any queue backend must implement
 */
export interface QueueBackend {
  readonly name: string;

  // Basic operations
  readonly add: <T>(
    data: JobData<T>,
    opts?: JobOptions
  ) => TE.TaskEither<QueueError, Job<T>>;

  readonly addBulk: <T>(
    jobs: ReadonlyArray<{ data: JobData<T>; opts?: JobOptions }>
  ) => TE.TaskEither<QueueError, ReadonlyArray<Job<T>>>;

  readonly process: <T, R>(
    processor: JobProcessor<T, R>,
    concurrency?: number
  ) => TE.TaskEither<QueueError, void>;

  readonly getJob: <T>(
    jobId: JobId
  ) => TE.TaskEither<QueueError, O.Option<Job<T>>>;

  readonly removeJob: (jobId: JobId) => TE.TaskEither<QueueError, void>;

  // Queue management
  readonly pause: () => TE.TaskEither<QueueError, void>;
  readonly resume: () => TE.TaskEither<QueueError, void>;
  readonly isPaused: () => TE.TaskEither<QueueError, boolean>;
  readonly drain: () => TE.TaskEither<QueueError, void>; // Remove all waiting jobs
  readonly clean: (
    grace: number,
    status?: JobStatus
  ) => TE.TaskEither<QueueError, void>; // Clean old jobs
  readonly close: () => TE.TaskEither<QueueError, void>;

  // Job queries
  readonly getJobs: (
    status: JobStatus
  ) => TE.TaskEither<QueueError, ReadonlyArray<Job>>;

  readonly getJobCounts: () => TE.TaskEither<
    QueueError,
    Record<JobStatus, number>
  >;

  // Event handling
  readonly on: (handler: EventHandler) => void;
  readonly off: (handler: EventHandler) => void;

  // Dead letter queue
  readonly moveToFailed: (
    job: Job,
    error: QueueError
  ) => TE.TaskEither<QueueError, void>;

  readonly getFailedJobs: () => TE.TaskEither<QueueError, ReadonlyArray<Job>>;

  readonly retryFailed: (jobId: JobId) => TE.TaskEither<QueueError, void>;
}

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * Queue configuration
 */
export interface QueueConfig {
  readonly name: string;
  readonly defaultJobOptions?: JobOptions;
  readonly limiter?: RateLimitOptions;
  readonly settings?: {
    readonly lockDuration?: number; // Lock duration in milliseconds
    readonly lockRenewTime?: number; // How often to renew locks
    readonly stalledInterval?: number; // How often to check for stalled jobs
    readonly maxStalledCount?: number; // Max times a job can be stalled
    readonly guardInterval?: number; // Poll interval for delayed jobs
  };
}

/**
 * Default queue configuration
 */
export const defaultQueueConfig: Partial<QueueConfig> = {
  defaultJobOptions,
  settings: {
    lockDuration: 30000,
    lockRenewTime: 15000,
    stalledInterval: 30000,
    maxStalledCount: 1,
    guardInterval: 5000,
  },
};

// ============================================================================
// Backend-Specific Configurations
// ============================================================================

/**
 * Memory backend configuration
 */
export interface MemoryQueueConfig extends QueueConfig {
  readonly backend: 'memory';
  readonly maxSize?: number; // Max jobs in memory
}

/**
 * Bull/Redis backend configuration
 */
export interface BullQueueConfig extends QueueConfig {
  readonly backend: 'bull';
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
    readonly db?: number;
    readonly tls?: boolean;
  } | string; // Connection string
  readonly prefix?: string; // Key prefix for Redis
}

/**
 * RabbitMQ backend configuration
 */
export interface RabbitMQConfig extends QueueConfig {
  readonly backend: 'rabbitmq';
  readonly url: string;
  readonly exchangeName?: string;
  readonly exchangeType?: 'direct' | 'topic' | 'fanout';
  readonly durable?: boolean;
}

/**
 * SQS backend configuration
 */
export interface SQSConfig extends QueueConfig {
  readonly backend: 'sqs';
  readonly queueUrl: string;
  readonly region: string;
  readonly credentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
  readonly visibilityTimeout?: number;
  readonly waitTimeSeconds?: number;
}

/**
 * Union type for all queue configurations
 */
export type AnyQueueConfig =
  | MemoryQueueConfig
  | BullQueueConfig
  | RabbitMQConfig
  | SQSConfig;

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultMemoryQueueConfig: Partial<MemoryQueueConfig> = {
  backend: 'memory',
  maxSize: 10000,
  ...defaultQueueConfig,
};

export const defaultBullQueueConfig: Partial<BullQueueConfig> = {
  backend: 'bull',
  prefix: 'bull',
  ...defaultQueueConfig,
};

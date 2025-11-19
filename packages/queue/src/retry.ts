/**
 * Retry logic with Semigroup for combining retry strategies
 * @module retry
 */

import * as S from 'fp-ts/Semigroup';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { RetryStrategy, QueueError, Job, JobAttempt } from './types';
import { jobFailedError } from './types';

// ============================================================================
// Retry Strategy Semigroup
// ============================================================================

/**
 * Semigroup for RetryStrategy
 * Combines two retry strategies by taking the maximum attempts and
 * combining backoff strategies intelligently
 */
export const RetryStrategySemigroup: S.Semigroup<RetryStrategy> = {
  concat: (x: RetryStrategy, y: RetryStrategy): RetryStrategy => {
    // Take the max attempts
    const maxAttempts = Math.max(x.maxAttempts, y.maxAttempts);

    // If either uses custom backoff, prefer that
    if (x.backoffType === 'custom' || y.backoffType === 'custom') {
      return {
        maxAttempts,
        backoffType: 'custom',
        backoffDelay: Math.max(x.backoffDelay, y.backoffDelay),
        customBackoff:
          x.backoffType === 'custom'
            ? x.customBackoff
            : y.backoffType === 'custom'
            ? y.customBackoff
            : undefined,
      };
    }

    // Prefer exponential over fixed
    if (x.backoffType === 'exponential' || y.backoffType === 'exponential') {
      return {
        maxAttempts,
        backoffType: 'exponential',
        backoffDelay: Math.max(x.backoffDelay, y.backoffDelay),
        backoffMultiplier: Math.max(
          x.backoffMultiplier ?? 2,
          y.backoffMultiplier ?? 2
        ),
      };
    }

    // Both are fixed
    return {
      maxAttempts,
      backoffType: 'fixed',
      backoffDelay: Math.max(x.backoffDelay, y.backoffDelay),
    };
  },
};

/**
 * Combine multiple retry strategies
 */
export const combineRetryStrategies = (
  strategies: ReadonlyArray<RetryStrategy>
): RetryStrategy => {
  if (strategies.length === 0) {
    throw new Error('Cannot combine empty array of retry strategies');
  }
  return strategies.reduce(RetryStrategySemigroup.concat);
};

// ============================================================================
// Backoff Calculation
// ============================================================================

/**
 * Calculate backoff delay for a given attempt number
 */
export const calculateBackoff = (
  strategy: RetryStrategy,
  attemptNumber: number
): number => {
  switch (strategy.backoffType) {
    case 'fixed':
      return strategy.backoffDelay;

    case 'exponential': {
      const multiplier = strategy.backoffMultiplier ?? 2;
      return strategy.backoffDelay * Math.pow(multiplier, attemptNumber - 1);
    }

    case 'custom':
      return strategy.customBackoff
        ? strategy.customBackoff(attemptNumber)
        : strategy.backoffDelay;
  }
};

/**
 * Calculate jittered backoff to prevent thundering herd
 */
export const calculateJitteredBackoff = (
  strategy: RetryStrategy,
  attemptNumber: number,
  jitterFactor: number = 0.1
): number => {
  const baseDelay = calculateBackoff(strategy, attemptNumber);
  const jitter = baseDelay * jitterFactor * Math.random();
  return Math.floor(baseDelay + jitter);
};

// ============================================================================
// Retry Predicates
// ============================================================================

/**
 * Determine if a job should be retried based on error and attempts
 */
export const shouldRetry = (
  job: Job,
  error: QueueError,
  strategy: RetryStrategy
): boolean => {
  const attemptNumber = job.metadata.attempts.length;

  // Check if we've exceeded max attempts
  if (attemptNumber >= strategy.maxAttempts) {
    return false;
  }

  // Don't retry certain error types
  const nonRetriableErrors: ReadonlyArray<QueueError['type']> = [
    'QUEUE_CLOSED',
    'SERIALIZATION_ERROR',
  ];

  if (nonRetriableErrors.includes(error.type)) {
    return false;
  }

  return true;
};

/**
 * Check if error is retriable
 */
export const isRetriableError = (error: QueueError): boolean => {
  const retriableErrors: ReadonlyArray<QueueError['type']> = [
    'CONNECTION_ERROR',
    'JOB_TIMEOUT',
    'JOB_FAILED',
    'DEPENDENCY_ERROR',
    'RATE_LIMIT_ERROR',
    'OPERATION_ERROR',
  ];

  return retriableErrors.includes(error.type);
};

// ============================================================================
// Retry Execution
// ============================================================================

/**
 * Execute a task with retry logic
 */
export const withRetry = <E, A>(
  task: TE.TaskEither<E, A>,
  strategy: RetryStrategy,
  onRetry?: (attemptNumber: number, error: E) => void
): TE.TaskEither<E, A> => {
  const retry = (attemptNumber: number): TE.TaskEither<E, A> => {
    return pipe(
      task,
      TE.orElse((error) => {
        if (attemptNumber >= strategy.maxAttempts) {
          return TE.left(error);
        }

        // Call retry callback
        if (onRetry) {
          onRetry(attemptNumber, error);
        }

        // Calculate backoff delay
        const delay = calculateJitteredBackoff(strategy, attemptNumber);

        // Wait and retry
        return pipe(
          TE.fromIO(() => new Promise((resolve) => setTimeout(resolve, delay))),
          TE.chain(() => retry(attemptNumber + 1))
        );
      })
    );
  };

  return retry(1);
};

/**
 * Retry with custom error transformation
 */
export const withRetryAndTransform = <E, A>(
  task: TE.TaskEither<E, A>,
  strategy: RetryStrategy,
  transformError: (error: E, attemptNumber: number) => E,
  onRetry?: (attemptNumber: number, error: E) => void
): TE.TaskEither<E, A> => {
  const retry = (attemptNumber: number): TE.TaskEither<E, A> => {
    return pipe(
      task,
      TE.orElse((error) => {
        if (attemptNumber >= strategy.maxAttempts) {
          return TE.left(transformError(error, attemptNumber));
        }

        if (onRetry) {
          onRetry(attemptNumber, error);
        }

        const delay = calculateJitteredBackoff(strategy, attemptNumber);

        return pipe(
          TE.fromIO(() => new Promise((resolve) => setTimeout(resolve, delay))),
          TE.chain(() => retry(attemptNumber + 1))
        );
      })
    );
  };

  return retry(1);
};

// ============================================================================
// Retry Policy Presets
// ============================================================================

/**
 * Common retry strategy presets
 */
export const RetryPresets = {
  /**
   * No retry - fail immediately
   */
  noRetry: (): RetryStrategy => ({
    maxAttempts: 1,
    backoffType: 'fixed',
    backoffDelay: 0,
  }),

  /**
   * Quick retry - 3 attempts with 1 second fixed delay
   */
  quick: (): RetryStrategy => ({
    maxAttempts: 3,
    backoffType: 'fixed',
    backoffDelay: 1000,
  }),

  /**
   * Standard retry - 5 attempts with exponential backoff starting at 1 second
   */
  standard: (): RetryStrategy => ({
    maxAttempts: 5,
    backoffType: 'exponential',
    backoffDelay: 1000,
    backoffMultiplier: 2,
  }),

  /**
   * Aggressive retry - 10 attempts with exponential backoff
   */
  aggressive: (): RetryStrategy => ({
    maxAttempts: 10,
    backoffType: 'exponential',
    backoffDelay: 500,
    backoffMultiplier: 1.5,
  }),

  /**
   * Slow retry - 5 attempts with long fixed delay
   */
  slow: (): RetryStrategy => ({
    maxAttempts: 5,
    backoffType: 'fixed',
    backoffDelay: 10000,
  }),

  /**
   * Custom retry with fibonacci-like backoff
   */
  fibonacci: (): RetryStrategy => ({
    maxAttempts: 8,
    backoffType: 'custom',
    backoffDelay: 1000,
    customBackoff: (attempt: number): number => {
      const fib = (n: number): number => {
        if (n <= 1) return n;
        let prev = 0,
          curr = 1;
        for (let i = 2; i <= n; i++) {
          const next = prev + curr;
          prev = curr;
          curr = next;
        }
        return curr;
      };
      return 1000 * fib(attempt);
    },
  }),

  /**
   * Linear backoff - increases delay linearly
   */
  linear: (baseDelay: number = 1000, maxAttempts: number = 5): RetryStrategy => ({
    maxAttempts,
    backoffType: 'custom',
    backoffDelay: baseDelay,
    customBackoff: (attempt: number) => baseDelay * attempt,
  }),
} as const;

// ============================================================================
// Job Attempt Tracking
// ============================================================================

/**
 * Create a new job attempt
 */
export const createJobAttempt = (
  attemptNumber: number,
  error?: Error
): JobAttempt => ({
  attemptNumber,
  timestamp: new Date(),
  error,
});

/**
 * Add attempt to job metadata
 */
export const addAttemptToJob = <T>(job: Job<T>, error?: Error): Job<T> => {
  const attemptNumber = job.metadata.attempts.length + 1;
  const attempt = createJobAttempt(attemptNumber, error);

  return {
    ...job,
    metadata: {
      ...job.metadata,
      attempts: [...job.metadata.attempts, attempt],
      status: 'failed' as const,
      failedAt: new Date(),
    },
  };
};

/**
 * Get next retry delay for a job
 */
export const getNextRetryDelay = (job: Job, strategy: RetryStrategy): number => {
  const attemptNumber = job.metadata.attempts.length + 1;
  return calculateJitteredBackoff(strategy, attemptNumber);
};

/**
 * Check if job has exceeded max attempts
 */
export const hasExceededMaxAttempts = (
  job: Job,
  strategy: RetryStrategy
): boolean => {
  return job.metadata.attempts.length >= strategy.maxAttempts;
};

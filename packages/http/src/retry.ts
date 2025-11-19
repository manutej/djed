/**
 * Retry logic with exponential backoff
 *
 * This module provides composable retry strategies using TaskEither
 * with exponential backoff and configurable retry policies.
 */

import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import {
  HttpError,
  RetryPolicy,
  defaultRetryPolicy,
  RetryPolicySemigroup,
} from './types';

// ============================================================================
// Delay Utilities
// ============================================================================

/**
 * Create a delay Task
 */
const delay = (ms: number): T.Task<void> => () =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const calculateBackoff = (
  attempt: number,
  policy: RetryPolicy
): number => {
  const exponentialDelay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt);
  const jitter = Math.random() * policy.initialDelay * 0.1; // 10% jitter
  return Math.min(exponentialDelay + jitter, policy.maxDelay);
};

// ============================================================================
// Retry Decision Logic
// ============================================================================

/**
 * Determine if an error should be retried
 */
const shouldRetry = (error: HttpError, policy: RetryPolicy): boolean => {
  // Check if error type is retryable
  if (policy.retryableErrors.includes(error.type)) {
    return true;
  }

  // Check if status code is retryable
  if (error.status && policy.retryableStatuses.includes(error.status)) {
    return true;
  }

  return false;
};

// ============================================================================
// Retry State
// ============================================================================

interface RetryState {
  readonly attempt: number;
  readonly lastError?: HttpError;
}

const initialRetryState: RetryState = {
  attempt: 0,
};

// ============================================================================
// Core Retry Logic
// ============================================================================

/**
 * Retry a TaskEither with exponential backoff
 */
export const retry = <E extends HttpError, A>(
  task: TE.TaskEither<E, A>,
  policy: RetryPolicy = defaultRetryPolicy
): TE.TaskEither<HttpError, A> => {
  const retryWithState = (state: RetryState): TE.TaskEither<HttpError, A> =>
    pipe(
      task,
      TE.orElse((error) => {
        // Check if we should retry
        if (state.attempt >= policy.maxRetries || !shouldRetry(error, policy)) {
          return TE.left(
            state.attempt > 0
              ? HttpError.retryExhausted(
                  `Failed after ${state.attempt + 1} attempts: ${error.message}`,
                  error.cause
                )
              : error
          );
        }

        // Calculate backoff and retry
        const backoffDelay = calculateBackoff(state.attempt, policy);

        return pipe(
          TE.fromTask(delay(backoffDelay)),
          TE.chain(() =>
            retryWithState({
              attempt: state.attempt + 1,
              lastError: error,
            })
          )
        );
      })
    );

  return retryWithState(initialRetryState);
};

/**
 * Retry with a custom policy
 */
export const retryWith = (policy: RetryPolicy) => <E extends HttpError, A>(
  task: TE.TaskEither<E, A>
): TE.TaskEither<HttpError, A> => retry(task, policy);

/**
 * Combine multiple retry policies using Semigroup
 */
export const combineRetryPolicies = (
  policies: RetryPolicy[]
): RetryPolicy => {
  if (policies.length === 0) {
    return defaultRetryPolicy;
  }

  return policies.reduce(
    (acc, policy) => RetryPolicySemigroup.concat(acc, policy),
    policies[0]
  );
};

// ============================================================================
// Predefined Retry Policies
// ============================================================================

/**
 * Conservative retry policy - fewer retries, longer delays
 */
export const conservativeRetryPolicy: RetryPolicy = {
  maxRetries: 2,
  initialDelay: 500,
  maxDelay: 30000,
  backoffMultiplier: 3,
  retryableStatuses: [503, 504],
  retryableErrors: ['NetworkError'],
};

/**
 * Aggressive retry policy - more retries, shorter delays
 */
export const aggressiveRetryPolicy: RetryPolicy = {
  maxRetries: 5,
  initialDelay: 50,
  maxDelay: 5000,
  backoffMultiplier: 1.5,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NetworkError', 'TimeoutError', 'ServerError'],
};

/**
 * No retry policy - fail fast
 */
export const noRetryPolicy: RetryPolicy = {
  maxRetries: 0,
  initialDelay: 0,
  maxDelay: 0,
  backoffMultiplier: 1,
  retryableStatuses: [],
  retryableErrors: [],
};

// ============================================================================
// Conditional Retry
// ============================================================================

/**
 * Retry only if a condition is met
 */
export const retryWhen = <E extends HttpError, A>(
  task: TE.TaskEither<E, A>,
  predicate: (error: E) => boolean,
  policy: RetryPolicy = defaultRetryPolicy
): TE.TaskEither<HttpError, A> => {
  const customPolicy: RetryPolicy = {
    ...policy,
    retryableErrors: [],
    retryableStatuses: [],
  };

  const retryWithCondition = (state: RetryState): TE.TaskEither<HttpError, A> =>
    pipe(
      task,
      TE.orElse((error) => {
        // Check if condition is met and we haven't exhausted retries
        if (state.attempt >= customPolicy.maxRetries || !predicate(error)) {
          return TE.left(
            state.attempt > 0
              ? HttpError.retryExhausted(
                  `Failed after ${state.attempt + 1} attempts: ${error.message}`,
                  error.cause
                )
              : error
          );
        }

        const backoffDelay = calculateBackoff(state.attempt, customPolicy);

        return pipe(
          TE.fromTask(delay(backoffDelay)),
          TE.chain(() =>
            retryWithCondition({
              attempt: state.attempt + 1,
              lastError: error,
            })
          )
        );
      })
    );

  return retryWithCondition(initialRetryState);
};

// ============================================================================
// Retry with Timeout
// ============================================================================

/**
 * Retry with a maximum total timeout
 */
export const retryWithTimeout = <E extends HttpError, A>(
  task: TE.TaskEither<E, A>,
  timeoutMs: number,
  policy: RetryPolicy = defaultRetryPolicy
): TE.TaskEither<HttpError, A> => {
  const startTime = Date.now();

  const retryWithTimeLimit = (state: RetryState): TE.TaskEither<HttpError, A> =>
    pipe(
      task,
      TE.orElse((error) => {
        const elapsed = Date.now() - startTime;

        // Check timeout first
        if (elapsed >= timeoutMs) {
          return TE.left(
            HttpError.timeoutError(
              `Retry timeout after ${elapsed}ms: ${error.message}`,
              timeoutMs
            )
          );
        }

        // Check retry limit and retryability
        if (state.attempt >= policy.maxRetries || !shouldRetry(error, policy)) {
          return TE.left(
            state.attempt > 0
              ? HttpError.retryExhausted(
                  `Failed after ${state.attempt + 1} attempts: ${error.message}`,
                  error.cause
                )
              : error
          );
        }

        const backoffDelay = calculateBackoff(state.attempt, policy);

        return pipe(
          TE.fromTask(delay(backoffDelay)),
          TE.chain(() =>
            retryWithTimeLimit({
              attempt: state.attempt + 1,
              lastError: error,
            })
          )
        );
      })
    );

  return retryWithTimeLimit(initialRetryState);
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a retry policy with custom max retries
 */
export const withMaxRetries = (maxRetries: number): RetryPolicy => ({
  ...defaultRetryPolicy,
  maxRetries,
});

/**
 * Create a retry policy with custom initial delay
 */
export const withInitialDelay = (initialDelay: number): RetryPolicy => ({
  ...defaultRetryPolicy,
  initialDelay,
});

/**
 * Create a retry policy with custom backoff multiplier
 */
export const withBackoffMultiplier = (multiplier: number): RetryPolicy => ({
  ...defaultRetryPolicy,
  backoffMultiplier: multiplier,
});

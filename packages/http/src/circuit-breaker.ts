/**
 * Circuit Breaker Pattern
 *
 * This module implements the circuit breaker pattern to prevent
 * cascading failures and provide graceful degradation.
 */

import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as Ref from 'fp-ts/IORef';
import { pipe } from 'fp-ts/function';
import {
  HttpError,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerStats,
  defaultCircuitBreakerConfig,
} from './types';

// ============================================================================
// Circuit Breaker State Management
// ============================================================================

class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Check if the circuit should allow a request
   */
  canExecute(): E.Either<HttpError, true> {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return E.right(true);

      case 'OPEN':
        // Check if enough time has passed to attempt recovery
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.state = 'HALF_OPEN';
          this.successes = 0;
          return E.right(true);
        }

        return E.left(
          HttpError.circuitBreakerOpen(
            `Circuit breaker is OPEN. Will retry after ${
              this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : 'unknown'
            }`
          )
        );

      case 'HALF_OPEN':
        return E.right(true);
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        this.nextAttemptTime = undefined;
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.openCircuit();
      return;
    }

    if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.state = 'OPEN';
    this.successes = 0;
    this.nextAttemptTime = Date.now() + this.config.resetTimeout;
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.openCircuit();
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = undefined;
  }
}

// ============================================================================
// Circuit Breaker Factory
// ============================================================================

/**
 * Create a new circuit breaker instance
 */
export const createCircuitBreaker = (
  config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker => {
  const fullConfig: CircuitBreakerConfig = {
    ...defaultCircuitBreakerConfig,
    ...config,
  };

  return new CircuitBreaker(fullConfig);
};

// ============================================================================
// Circuit Breaker Wrapper
// ============================================================================

/**
 * Wrap a TaskEither with circuit breaker protection
 */
export const withCircuitBreaker = <A>(
  breaker: CircuitBreaker
) => (task: TE.TaskEither<HttpError, A>): TE.TaskEither<HttpError, A> =>
  pipe(
    TE.fromEither<HttpError, true>(breaker.canExecute()),
    TE.chain(() => task),
    TE.fold(
      (error) => {
        breaker.recordFailure();
        return TE.left(error);
      },
      (success) => {
        breaker.recordSuccess();
        return TE.right(success);
      }
    )
  );

/**
 * Create a circuit breaker wrapper with configuration
 */
export const circuitBreaker = (
  config: Partial<CircuitBreakerConfig> = {}
) => {
  const breaker = createCircuitBreaker(config);

  return {
    execute: <A>(task: TE.TaskEither<HttpError, A>): TE.TaskEither<HttpError, A> =>
      withCircuitBreaker<A>(breaker)(task),

    getStats: () => breaker.getStats(),

    reset: () => breaker.reset(),

    open: () => breaker.open(),

    close: () => breaker.close(),
  };
};

// ============================================================================
// Multi-Service Circuit Breaker
// ============================================================================

/**
 * Manage multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  constructor(private readonly defaultConfig: CircuitBreakerConfig = defaultCircuitBreakerConfig) {}

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const fullConfig = { ...this.defaultConfig, ...config };
      this.breakers.set(serviceName, createCircuitBreaker(fullConfig));
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Execute a task with circuit breaker for a specific service
   */
  execute<A>(
    serviceName: string,
    task: TE.TaskEither<HttpError, A>,
    config?: Partial<CircuitBreakerConfig>
  ): TE.TaskEither<HttpError, A> {
    const breaker = this.getBreaker(serviceName, config);
    return withCircuitBreaker<A>(breaker)(task);
  }

  /**
   * Get stats for a specific service
   */
  getStats(serviceName: string): CircuitBreakerStats | undefined {
    const breaker = this.breakers.get(serviceName);
    return breaker ? breaker.getStats() : undefined;
  }

  /**
   * Get stats for all services
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset a specific service's circuit breaker
   */
  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  /**
   * Remove a circuit breaker
   */
  remove(serviceName: string): void {
    this.breakers.delete(serviceName);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a circuit breaker with custom failure threshold
 */
export const withFailureThreshold = (threshold: number): CircuitBreakerConfig => ({
  ...defaultCircuitBreakerConfig,
  failureThreshold: threshold,
});

/**
 * Create a circuit breaker with custom reset timeout
 */
export const withResetTimeout = (timeout: number): CircuitBreakerConfig => ({
  ...defaultCircuitBreakerConfig,
  resetTimeout: timeout,
});

/**
 * Check if a circuit breaker is open
 */
export const isOpen = (breaker: CircuitBreaker): boolean =>
  breaker.getStats().state === 'OPEN';

/**
 * Check if a circuit breaker is closed
 */
export const isClosed = (breaker: CircuitBreaker): boolean =>
  breaker.getStats().state === 'CLOSED';

/**
 * Check if a circuit breaker is half-open
 */
export const isHalfOpen = (breaker: CircuitBreaker): boolean =>
  breaker.getStats().state === 'HALF_OPEN';

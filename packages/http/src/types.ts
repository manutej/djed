/**
 * Core types for the HTTP client
 *
 * This module provides type-safe request/response types and error handling
 * for the functional HTTP client.
 */

import * as E from 'fp-ts/Either';
import * as M from 'fp-ts/Monoid';
import * as S from 'fp-ts/Semigroup';

// ============================================================================
// HTTP Methods
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// ============================================================================
// Headers - Monoid instance for combining headers
// ============================================================================

export type Headers = Record<string, string>;

/**
 * Monoid instance for Headers - allows combining headers
 * Later headers override earlier ones with the same key
 */
export const HeadersMonoid: M.Monoid<Headers> = {
  concat: (first: Headers, second: Headers): Headers => ({
    ...first,
    ...second,
  }),
  empty: {},
};

// ============================================================================
// Query Parameters - Monoid instance
// ============================================================================

export type QueryParams = Record<string, string | string[] | number | boolean | undefined>;

/**
 * Monoid instance for QueryParams
 */
export const QueryParamsMonoid: M.Monoid<QueryParams> = {
  concat: (first: QueryParams, second: QueryParams): QueryParams => ({
    ...first,
    ...second,
  }),
  empty: {},
};

// ============================================================================
// Request Configuration
// ============================================================================

export interface HttpRequest<A = unknown> {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Headers;
  readonly body?: A;
  readonly params?: QueryParams;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

export interface HttpRequestConfig {
  readonly baseURL?: string;
  readonly headers?: Headers;
  readonly timeout?: number;
  readonly validateStatus?: (status: number) => boolean;
}

// ============================================================================
// Response Types
// ============================================================================

export interface HttpResponse<A> {
  readonly data: A;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly request: HttpRequest;
}

export interface StreamResponse {
  readonly stream: ReadableStream<Uint8Array>;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
}

// ============================================================================
// Error Types
// ============================================================================

export type HttpErrorType =
  | 'NetworkError'
  | 'TimeoutError'
  | 'ParseError'
  | 'ValidationError'
  | 'ServerError'
  | 'ClientError'
  | 'CircuitBreakerOpen'
  | 'RetryExhausted';

export interface HttpError {
  readonly type: HttpErrorType;
  readonly message: string;
  readonly status?: number;
  readonly response?: unknown;
  readonly cause?: Error;
}

/**
 * Constructor functions for creating typed errors
 */
export const HttpError = {
  networkError: (message: string, cause?: Error): HttpError => ({
    type: 'NetworkError',
    message,
    cause,
  }),

  timeoutError: (message: string, timeout: number): HttpError => ({
    type: 'TimeoutError',
    message: `Request timeout after ${timeout}ms: ${message}`,
  }),

  parseError: (message: string, cause?: Error): HttpError => ({
    type: 'ParseError',
    message,
    cause,
  }),

  validationError: (message: string, status: number): HttpError => ({
    type: 'ValidationError',
    message,
    status,
  }),

  serverError: (message: string, status: number, response?: unknown): HttpError => ({
    type: 'ServerError',
    message,
    status,
    response,
  }),

  clientError: (message: string, status: number, response?: unknown): HttpError => ({
    type: 'ClientError',
    message,
    status,
    response,
  }),

  circuitBreakerOpen: (message: string): HttpError => ({
    type: 'CircuitBreakerOpen',
    message,
  }),

  retryExhausted: (message: string, cause?: Error): HttpError => ({
    type: 'RetryExhausted',
    message,
    cause,
  }),
};

// ============================================================================
// Retry Policy - Semigroup instance
// ============================================================================

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly retryableStatuses: number[];
  readonly retryableErrors: HttpErrorType[];
}

/**
 * Semigroup instance for RetryPolicy
 * Combines policies by taking the maximum retries and conservative delays
 */
export const RetryPolicySemigroup: S.Semigroup<RetryPolicy> = {
  concat: (first: RetryPolicy, second: RetryPolicy): RetryPolicy => ({
    maxRetries: Math.max(first.maxRetries, second.maxRetries),
    initialDelay: Math.max(first.initialDelay, second.initialDelay),
    maxDelay: Math.min(first.maxDelay, second.maxDelay),
    backoffMultiplier: Math.max(first.backoffMultiplier, second.backoffMultiplier),
    retryableStatuses: [...new Set([...first.retryableStatuses, ...second.retryableStatuses])],
    retryableErrors: [...new Set([...first.retryableErrors, ...second.retryableErrors])],
  }),
};

/**
 * Default retry policy
 */
export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NetworkError', 'TimeoutError'],
};

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly successThreshold: number;
  readonly timeout: number;
  readonly resetTimeout: number;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerStats {
  readonly state: CircuitBreakerState;
  readonly failures: number;
  readonly successes: number;
  readonly lastFailureTime?: number;
}

/**
 * Default circuit breaker configuration
 */
export const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 30000,
};

// ============================================================================
// Interceptor Types
// ============================================================================

export interface RequestInterceptor {
  readonly onRequest: (request: HttpRequest) => E.Either<HttpError, HttpRequest>;
}

export interface ResponseInterceptor {
  readonly onResponse: <A>(response: HttpResponse<A>) => E.Either<HttpError, HttpResponse<A>>;
  readonly onError?: (error: HttpError) => E.Either<HttpError, HttpError>;
}

// ============================================================================
// Middleware Types
// ============================================================================

export type Middleware<A, B> = (request: HttpRequest<A>) => HttpRequest<B>;

export interface MiddlewareConfig {
  readonly requestMiddleware: Middleware<unknown, unknown>[];
  readonly responseMiddleware: ResponseInterceptor[];
}

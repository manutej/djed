/**
 * @djed/http - Type-safe HTTP client with TaskEither
 *
 * A functional HTTP client built on fp-ts with:
 * - TaskEither for async operations with errors
 * - Automatic retries with exponential backoff
 * - Circuit breaker pattern
 * - Reader monad for interceptors
 * - Composable middleware
 * - Streaming support
 *
 * Progressive API:
 * - L1: Simple GET/POST requests
 * - L2: Retry/timeout/interceptors
 * - L3: Full TaskEither composition with circuit breaker
 */

import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as core from './core';
import * as retryModule from './retry';
import * as cbModule from './circuit-breaker';
import * as middlewareModule from './middleware';
import type { QueryParams, HttpRequestConfig } from './types';

// ============================================================================
// Re-export Core Types
// ============================================================================

export type {
  HttpMethod,
  Headers,
  QueryParams,
  HttpRequest,
  HttpRequestConfig,
  HttpResponse,
  StreamResponse,
  HttpError,
  HttpErrorType,
  RetryPolicy,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerStats,
  RequestInterceptor,
  ResponseInterceptor,
  Middleware,
  MiddlewareConfig,
} from './types';

export {
  HeadersMonoid,
  QueryParamsMonoid,
  HttpError as HttpErrorConstructor,
  RetryPolicySemigroup,
  defaultRetryPolicy,
  defaultCircuitBreakerConfig,
} from './types';

// ============================================================================
// Re-export Core HTTP Operations
// ============================================================================

export {
  request,
  get,
  post,
  put,
  patch,
  del,
  head,
  stream,
  getStream,
  getData,
  getStatus,
  getHeaders,
  createClient,
  type HttpClient,
} from './core';

// ============================================================================
// Re-export Retry
// ============================================================================

export {
  retry,
  retryWith,
  retryWhen,
  retryWithTimeout,
  combineRetryPolicies,
  conservativeRetryPolicy,
  aggressiveRetryPolicy,
  noRetryPolicy,
  withMaxRetries,
  withInitialDelay,
  withBackoffMultiplier,
} from './retry';

// ============================================================================
// Re-export Circuit Breaker
// ============================================================================

export {
  createCircuitBreaker,
  withCircuitBreaker,
  circuitBreaker,
  CircuitBreakerManager,
  withFailureThreshold,
  withResetTimeout,
  isOpen,
  isClosed,
  isHalfOpen,
} from './circuit-breaker';

// ============================================================================
// Re-export Interceptors
// ============================================================================

export {
  addHeaders,
  addHeadersR,
  addBearerToken,
  addBearerTokenR,
  addBasicAuth,
  addBasicAuthR,
  addApiKey,
  addApiKeyR,
  setContentType,
  jsonContentType,
  formContentType,
  setUserAgent,
  setTimeout,
  validateRequest,
  validateStatus,
  transformResponse,
  transformError,
  logRequest,
  logResponse,
  logError,
  composeRequestInterceptors,
  composeResponseInterceptors,
  applyRequestInterceptors,
  applyResponseInterceptors,
  applyErrorInterceptors,
  composeRequestInterceptorsR,
  jsonApiInterceptors,
  authenticatedJsonApi,
  type RequestInterceptorR,
  type ResponseInterceptorR,
} from './interceptors';

// ============================================================================
// Re-export Middleware
// ============================================================================

export {
  retryMiddleware,
  circuitBreakerMiddleware,
  timeoutMiddleware,
  requestInterceptorMiddleware,
  responseInterceptorMiddleware,
  loggingMiddleware,
  cacheMiddleware,
  rateLimitMiddleware,
  composeMiddleware,
  pipeMiddleware,
  MiddlewareChain,
  createMiddlewareChain,
  standardMiddleware,
  productionMiddleware,
  developmentMiddleware,
  withMiddleware,
  createMiddlewareClient,
  type HttpMiddleware,
} from './middleware';

// ============================================================================
// Level 1: Simple HTTP Requests
// ============================================================================

/**
 * Level 1 API - Simple, promise-based HTTP requests
 *
 * For developers who want a simple API without TaskEither complexity
 */
export namespace L1 {
  /**
   * Simple GET request that returns a Promise
   */
  export const get = <A = unknown>(
    url: string,
    params?: QueryParams,
    config?: HttpRequestConfig
  ): Promise<A> =>
    pipe(
      core.get<A>(url, params, config),
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();

  /**
   * Simple POST request that returns a Promise
   */
  export const post = <A = unknown, B = unknown>(
    url: string,
    data?: A,
    config?: HttpRequestConfig
  ): Promise<B> =>
    pipe(
      core.post<A, B>(url, data, config),
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();

  /**
   * Simple PUT request that returns a Promise
   */
  export const put = <A = unknown, B = unknown>(
    url: string,
    data?: A,
    config?: HttpRequestConfig
  ): Promise<B> =>
    pipe(
      core.put<A, B>(url, data, config),
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();

  /**
   * Simple DELETE request that returns a Promise
   */
  export const del = <A = unknown>(
    url: string,
    config?: HttpRequestConfig
  ): Promise<A> =>
    pipe(
      core.del<A>(url, config),
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();

  /**
   * Create a simple client with base configuration
   */
  export const createClient = (config: HttpRequestConfig) => {
    const client = core.createClient(config);

    return {
      get: <A = unknown>(url: string, params?: QueryParams) =>
        pipe(
          client.get<A>(url, params),
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),

      post: <A = unknown, B = unknown>(url: string, data?: A) =>
        pipe(
          client.post<A, B>(url, data),
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),

      put: <A = unknown, B = unknown>(url: string, data?: A) =>
        pipe(
          client.put<A, B>(url, data),
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),

      delete: <A = unknown>(url: string) =>
        pipe(
          client.delete<A>(url),
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),
    };
  };
}

// ============================================================================
// Level 2: Retry/Timeout/Interceptors
// ============================================================================

/**
 * Level 2 API - Enhanced requests with retry, timeout, and interceptors
 *
 * For developers who want resilient HTTP requests without full FP complexity
 */
export namespace L2 {

  /**
   * GET request with automatic retry
   */
  export function getWithRetry<A = unknown>(
    url: string,
    params?: QueryParams,
    retryPolicy?: import('./types').RetryPolicy,
    config?: HttpRequestConfig
  ): Promise<A> {
    return pipe(
      core.get<A>(url, params, config),
      retryModule.retry,
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();
  }

  /**
   * POST request with automatic retry
   */
  export function postWithRetry<A = unknown, B = unknown>(
    url: string,
    data?: A,
    retryPolicy?: import('./types').RetryPolicy,
    config?: HttpRequestConfig
  ): Promise<B> {
    return pipe(
      core.post<A, B>(url, data, config),
      retryModule.retry,
      TE.map((response) => response.data),
      TE.getOrElse((error) => {
        throw new Error(error.message);
      })
    )();
  }

  /**
   * Create a client with interceptors
   */
  export function createClient(
    config: HttpRequestConfig,
    options?: {
      requestInterceptors?: import('./types').RequestInterceptor[];
      responseInterceptors?: import('./types').ResponseInterceptor[];
      retryPolicy?: import('./types').RetryPolicy;
    }
  ) {
    const client = core.createClient(config);

    const applyOptions = <A>(operation: TE.TaskEither<import('./types').HttpError, import('./types').HttpResponse<A>>) => {
      let result = operation;

      if (options?.retryPolicy) {
        result = retryModule.retry(result, options.retryPolicy);
      }

      return result;
    };

    return {
      get: <A = unknown>(url: string, params?: QueryParams) =>
        pipe(
          client.get<A>(url, params),
          applyOptions,
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),

      post: <A = unknown, B = unknown>(url: string, data?: A) =>
        pipe(
          client.post<A, B>(url, data),
          applyOptions,
          TE.map((response) => response.data),
          TE.getOrElse((error) => {
            throw new Error(error.message);
          })
        )(),
    };
  }
}

// ============================================================================
// Level 3: Full TaskEither Composition
// ============================================================================

/**
 * Level 3 API - Full functional programming with TaskEither
 *
 * For developers who want complete control with TaskEither composition
 */
export namespace L3 {
  /**
   * Create a fully configured HTTP client with all features
   */
  export function createClient(
    config: HttpRequestConfig,
    options?: {
      retryPolicy?: import('./types').RetryPolicy;
      circuitBreaker?: import('./types').CircuitBreakerConfig;
      requestInterceptors?: import('./types').RequestInterceptor[];
      responseInterceptors?: import('./types').ResponseInterceptor[];
      middleware?: import('./middleware').HttpMiddleware;
    }
  ) {
    const client = core.createClient(config);

    // Build middleware chain
    const middlewareChain = middlewareModule.createMiddlewareChain();

    if (options?.requestInterceptors) {
      middlewareChain.withRequestInterceptors(options.requestInterceptors);
    }

    if (options?.circuitBreaker) {
      middlewareChain.withCircuitBreaker(options.circuitBreaker);
    }

    if (options?.retryPolicy) {
      middlewareChain.withRetry(options.retryPolicy);
    }

    if (options?.responseInterceptors) {
      middlewareChain.withResponseInterceptors(options.responseInterceptors);
    }

    if (options?.middleware) {
      middlewareChain.use(options.middleware);
    }

    const middleware = middlewareChain.build();

    return {
      get: <A = unknown>(url: string, params?: QueryParams) =>
        middleware(client.get<A>(url, params)),

      post: <A = unknown, B = unknown>(url: string, data?: A) =>
        middleware(client.post<A, B>(url, data)),

      put: <A = unknown, B = unknown>(url: string, data?: A) =>
        middleware(client.put<A, B>(url, data)),

      patch: <A = unknown, B = unknown>(url: string, data?: A) =>
        middleware(client.patch<A, B>(url, data)),

      delete: <A = unknown>(url: string) =>
        middleware(client.delete<A>(url)),

      request: <A = unknown, B = unknown>(req: import('./types').HttpRequest<A>) =>
        middleware(client.request<A, B>(req)),

      stream: (req: import('./types').HttpRequest) =>
        client.stream(req),
    };
  }
}

// ============================================================================
// Default Export - Recommended API
// ============================================================================

/**
 * Default export provides the core HTTP functions
 * Use L1, L2, or L3 namespaces for progressive enhancement
 */
export default {
  // Core operations
  get: core.get,
  post: core.post,
  put: core.put,
  patch: core.patch,
  del: core.del,
  head: core.head,
  request: core.request,
  stream: core.stream,
  createClient: core.createClient,

  // Progressive APIs
  L1,
  L2,
  L3,

  // Utilities
  retry: retryModule.retry,
  circuitBreaker: cbModule.circuitBreaker,
  createMiddlewareChain: middlewareModule.createMiddlewareChain,
};

/**
 * Request/Response Interceptors using Reader Monad
 *
 * This module provides composable interceptors for modifying requests
 * and responses using the Reader monad for dependency injection.
 */

import * as R from 'fp-ts/Reader';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import { pipe, flow } from 'fp-ts/function';
import {
  HttpRequest,
  HttpResponse,
  HttpError,
  Headers,
  HeadersMonoid,
  RequestInterceptor,
  ResponseInterceptor,
} from './types';

// ============================================================================
// Request Interceptor Types
// ============================================================================

/**
 * Reader-based request interceptor
 * Dependencies injected via Reader monad
 */
export type RequestInterceptorR<D> = R.Reader<
  D,
  (request: HttpRequest) => E.Either<HttpError, HttpRequest>
>;

/**
 * Response interceptor with dependencies
 */
export type ResponseInterceptorR<D> = R.Reader<
  D,
  {
    onResponse: <A>(response: HttpResponse<A>) => E.Either<HttpError, HttpResponse<A>>;
    onError?: (error: HttpError) => E.Either<HttpError, HttpError>;
  }
>;

// ============================================================================
// Request Interceptor Builders
// ============================================================================

/**
 * Create a request interceptor that adds headers
 */
export const addHeaders = (headers: Headers): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, headers),
    }),
});

/**
 * Create a request interceptor with Reader for dynamic headers
 */
export const addHeadersR = <D extends { headers: Headers }>(): RequestInterceptorR<D> =>
  R.asks((deps) => (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, deps.headers),
    })
  );

/**
 * Create an authentication interceptor
 */
export const addBearerToken = (token: string): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        Authorization: `Bearer ${token}`,
      }),
    }),
});

/**
 * Create a Bearer token interceptor with Reader
 */
export const addBearerTokenR = <D extends { token: string }>(): RequestInterceptorR<D> =>
  R.asks((deps) => (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        Authorization: `Bearer ${deps.token}`,
      }),
    })
  );

/**
 * Create a basic auth interceptor
 */
export const addBasicAuth = (username: string, password: string): RequestInterceptor => {
  const credentials = btoa(`${username}:${password}`);
  return {
    onRequest: (request) =>
      E.right({
        ...request,
        headers: HeadersMonoid.concat(request.headers || {}, {
          Authorization: `Basic ${credentials}`,
        }),
      }),
  };
};

/**
 * Create a basic auth interceptor with Reader
 */
export const addBasicAuthR = <D extends { username: string; password: string }>(): RequestInterceptorR<D> =>
  R.asks((deps) => {
    const credentials = btoa(`${deps.username}:${deps.password}`);
    return (request) =>
      E.right({
        ...request,
        headers: HeadersMonoid.concat(request.headers || {}, {
          Authorization: `Basic ${credentials}`,
        }),
      });
  });

/**
 * Create an API key interceptor
 */
export const addApiKey = (
  headerName: string,
  apiKey: string
): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        [headerName]: apiKey,
      }),
    }),
});

/**
 * Create an API key interceptor with Reader
 */
export const addApiKeyR = <D extends { apiKey: string }>(
  headerName: string
): RequestInterceptorR<D> =>
  R.asks((deps) => (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        [headerName]: deps.apiKey,
      }),
    })
  );

/**
 * Create a content-type interceptor
 */
export const setContentType = (contentType: string): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        'Content-Type': contentType,
      }),
    }),
});

/**
 * JSON content-type interceptor
 */
export const jsonContentType: RequestInterceptor = setContentType('application/json');

/**
 * Form content-type interceptor
 */
export const formContentType: RequestInterceptor = setContentType('application/x-www-form-urlencoded');

/**
 * Create a user-agent interceptor
 */
export const setUserAgent = (userAgent: string): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      headers: HeadersMonoid.concat(request.headers || {}, {
        'User-Agent': userAgent,
      }),
    }),
});

/**
 * Create a timeout interceptor
 */
export const setTimeout = (timeout: number): RequestInterceptor => ({
  onRequest: (request) =>
    E.right({
      ...request,
      timeout,
    }),
});

/**
 * Create a request validation interceptor
 */
export const validateRequest = (
  validator: (request: HttpRequest) => E.Either<string, HttpRequest>
): RequestInterceptor => ({
  onRequest: (request) =>
    pipe(
      validator(request),
      E.mapLeft((error) =>
        HttpError.validationError(`Request validation failed: ${error}`, 0)
      )
    ),
});

// ============================================================================
// Response Interceptor Builders
// ============================================================================

/**
 * Create a response status validator
 */
export const validateStatus = (
  validator: (status: number) => boolean
): ResponseInterceptor => ({
  onResponse: (response) =>
    validator(response.status)
      ? E.right(response)
      : E.left(
          HttpError.validationError(
            `Invalid status code: ${response.status}`,
            response.status
          )
        ),
});

/**
 * Create a response data transformer
 */
export const transformResponse = <A, B>(
  transformer: (data: A) => B
): ResponseInterceptor => ({
  onResponse: (response: any) =>
    E.tryCatch(
      () => ({
        ...response,
        data: transformer(response.data as A),
      }),
      (error) =>
        HttpError.parseError(
          `Response transformation failed: ${error}`,
          error as Error
        )
    ),
});

/**
 * Create an error transformer
 */
export const transformError = (
  transformer: (error: HttpError) => HttpError
): ResponseInterceptor => ({
  onResponse: E.right,
  onError: (error) => E.right(transformer(error)),
});

/**
 * Create a logging interceptor
 */
export const logRequest = (
  logger: (request: HttpRequest) => void
): RequestInterceptor => ({
  onRequest: (request) => {
    logger(request);
    return E.right(request);
  },
});

/**
 * Create a response logging interceptor
 */
export const logResponse = <A>(
  logger: (response: HttpResponse<A>) => void
): ResponseInterceptor => ({
  onResponse: (response: any) => {
    logger(response);
    return E.right(response);
  },
});

/**
 * Create an error logging interceptor
 */
export const logError = (
  logger: (error: HttpError) => void
): ResponseInterceptor => ({
  onResponse: E.right,
  onError: (error) => {
    logger(error);
    return E.right(error);
  },
});

// ============================================================================
// Interceptor Composition
// ============================================================================

/**
 * Compose multiple request interceptors
 */
export const composeRequestInterceptors = (
  interceptors: RequestInterceptor[]
): RequestInterceptor => ({
  onRequest: (request) =>
    pipe(
      interceptors,
      A.reduce(E.right(request) as E.Either<HttpError, HttpRequest>, (acc, interceptor) =>
        pipe(
          acc,
          E.chain(interceptor.onRequest)
        )
      )
    ),
});

/**
 * Compose multiple response interceptors
 */
export const composeResponseInterceptors = (
  interceptors: ResponseInterceptor[]
): ResponseInterceptor => ({
  onResponse: <A>(response: HttpResponse<A>) =>
    pipe(
      interceptors,
      A.reduce(E.right(response) as E.Either<HttpError, HttpResponse<A>>, (acc, interceptor) =>
        pipe(
          acc,
          E.chain(interceptor.onResponse)
        )
      )
    ),

  onError: (error) =>
    pipe(
      interceptors,
      A.reduce(E.right(error) as E.Either<HttpError, HttpError>, (acc, interceptor) =>
        pipe(
          acc,
          E.chain((err) => (interceptor.onError ? interceptor.onError(err) : E.right(err)))
        )
      )
    ),
});

// ============================================================================
// Apply Interceptors to HTTP Operations
// ============================================================================

/**
 * Apply request interceptors to a TaskEither HTTP operation
 */
export const applyRequestInterceptors = (
  interceptors: RequestInterceptor[]
) => <A>(
  request: HttpRequest
): E.Either<HttpError, HttpRequest> =>
  composeRequestInterceptors(interceptors).onRequest(request);

/**
 * Apply response interceptors to a response
 */
export const applyResponseInterceptors = (
  interceptors: ResponseInterceptor[]
) => (
  response: any
): E.Either<HttpError, any> =>
  composeResponseInterceptors(interceptors).onResponse(response);

/**
 * Apply error interceptors
 */
export const applyErrorInterceptors = (
  interceptors: ResponseInterceptor[]
) => (
  error: HttpError
): E.Either<HttpError, HttpError> =>
  composeResponseInterceptors(interceptors).onError?.(error) || E.right(error);

// ============================================================================
// Reader-based Interceptor Composition
// ============================================================================

/**
 * Compose Reader-based request interceptors
 */
export const composeRequestInterceptorsR = <D>(
  interceptors: RequestInterceptorR<D>[]
): RequestInterceptorR<D> =>
  pipe(
    interceptors,
    A.sequence(R.Applicative),
    R.map((fns) => (request: HttpRequest) =>
      pipe(
        fns,
        A.reduce(E.right(request) as E.Either<HttpError, HttpRequest>, (acc, fn) =>
          pipe(acc, E.chain(fn))
        )
      )
    )
  );

// ============================================================================
// Predefined Interceptor Combos
// ============================================================================

/**
 * Create a standard JSON API interceptor set
 */
export const jsonApiInterceptors = (baseURL: string): RequestInterceptor[] => [
  jsonContentType,
  addHeaders({
    Accept: 'application/json',
  }),
];

/**
 * Create an authenticated JSON API interceptor set
 */
export const authenticatedJsonApi = (
  token: string
): RequestInterceptor[] => [
  ...jsonApiInterceptors(''),
  addBearerToken(token),
];

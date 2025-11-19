/**
 * Core HTTP client with TaskEither for async operations
 *
 * This module provides the fundamental HTTP operations wrapped in TaskEither
 * for composable error handling and async operations.
 */

import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import { pipe, flow } from 'fp-ts/function';
import {
  HttpRequest,
  HttpResponse,
  HttpError,
  HttpMethod,
  Headers,
  QueryParams,
  HttpRequestConfig,
  StreamResponse,
  HeadersMonoid,
  QueryParamsMonoid,
} from './types';

// ============================================================================
// URL Building
// ============================================================================

/**
 * Build URL with query parameters
 */
const buildURL = (baseURL: string, url: string, params?: QueryParams): string => {
  const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;

  if (!params || Object.keys(params).length === 0) {
    return fullURL;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const separator = fullURL.includes('?') ? '&' : '?';
  return `${fullURL}${separator}${searchParams.toString()}`;
};

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse JSON response with error handling
 */
const parseJSON = <A>(response: Response): TE.TaskEither<HttpError, A> =>
  TE.tryCatch(
    () => response.json() as Promise<A>,
    (error) => HttpError.parseError('Failed to parse JSON response', error as Error)
  );

/**
 * Parse text response
 */
const parseText = (response: Response): TE.TaskEither<HttpError, string> =>
  TE.tryCatch(
    () => response.text(),
    (error) => HttpError.parseError('Failed to parse text response', error as Error)
  );

/**
 * Convert fetch Headers to our Headers type
 */
const headersToRecord = (headers: globalThis.Headers): Headers => {
  const result: Headers = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

// ============================================================================
// Status Validation
// ============================================================================

/**
 * Default status validator - accepts 2xx status codes
 */
const defaultValidateStatus = (status: number): boolean => status >= 200 && status < 300;

/**
 * Validate response status
 */
const validateResponse = (
  response: Response,
  validateStatus: (status: number) => boolean = defaultValidateStatus
): E.Either<HttpError, Response> => {
  if (validateStatus(response.status)) {
    return E.right(response);
  }

  if (response.status >= 500) {
    return E.left(
      HttpError.serverError(
        `Server error: ${response.statusText}`,
        response.status
      )
    );
  }

  if (response.status >= 400) {
    return E.left(
      HttpError.clientError(
        `Client error: ${response.statusText}`,
        response.status
      )
    );
  }

  return E.left(
    HttpError.validationError(
      `Invalid status: ${response.statusText}`,
      response.status
    )
  );
};

// ============================================================================
// Core HTTP Request
// ============================================================================

/**
 * Execute HTTP request with native fetch wrapped in TaskEither
 */
const executeRequest = <A>(
  request: HttpRequest,
  config: HttpRequestConfig = {}
): TE.TaskEither<HttpError, Response> => {
  const url = buildURL(
    config.baseURL || '',
    request.url,
    request.params
  );

  const headers = HeadersMonoid.concat(
    config.headers || {},
    request.headers || {}
  );

  const controller = new AbortController();
  const signal = request.signal || controller.signal;

  // Setup timeout
  const timeoutId = request.timeout || config.timeout
    ? setTimeout(() => controller.abort(), request.timeout || config.timeout)
    : undefined;

  const fetchTask: T.Task<E.Either<HttpError, Response>> = () =>
    fetch(url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal,
    })
      .then((response) => {
        if (timeoutId) clearTimeout(timeoutId);
        return validateResponse(response, config.validateStatus);
      })
      .catch((error: Error) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          return E.left(
            HttpError.timeoutError(
              'Request was aborted',
              request.timeout || config.timeout || 0
            )
          );
        }

        return E.left(
          HttpError.networkError(
            `Network error: ${error.message}`,
            error
          )
        );
      });

  return pipe(
    fetchTask,
    TE.fromTask,
    TE.chain(TE.fromEither)
  );
};

/**
 * Create HTTP response from fetch Response
 */
const createHttpResponse = <A>(
  response: Response,
  data: A,
  request: HttpRequest
): HttpResponse<A> => ({
  data,
  status: response.status,
  statusText: response.statusText,
  headers: headersToRecord(response.headers),
  request,
});

// ============================================================================
// HTTP Methods with TaskEither
// ============================================================================

/**
 * Generic HTTP request function
 */
export const request = <A = unknown, B = unknown>(
  req: HttpRequest<A>,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<B>> =>
  pipe(
    executeRequest(req, config),
    TE.chain((response) =>
      pipe(
        parseJSON<B>(response),
        TE.map((data) => createHttpResponse(response, data, req))
      )
    )
  );

/**
 * GET request
 */
export const get = <A = unknown>(
  url: string,
  params?: QueryParams,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<A>> =>
  request<never, A>(
    {
      url,
      method: 'GET',
      params,
    },
    config
  );

/**
 * POST request
 */
export const post = <A = unknown, B = unknown>(
  url: string,
  data?: A,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<B>> =>
  request<A, B>(
    {
      url,
      method: 'POST',
      body: data,
    },
    config
  );

/**
 * PUT request
 */
export const put = <A = unknown, B = unknown>(
  url: string,
  data?: A,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<B>> =>
  request<A, B>(
    {
      url,
      method: 'PUT',
      body: data,
    },
    config
  );

/**
 * PATCH request
 */
export const patch = <A = unknown, B = unknown>(
  url: string,
  data?: A,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<B>> =>
  request<A, B>(
    {
      url,
      method: 'PATCH',
      body: data,
    },
    config
  );

/**
 * DELETE request
 */
export const del = <A = unknown>(
  url: string,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<A>> =>
  request<never, A>(
    {
      url,
      method: 'DELETE',
    },
    config
  );

/**
 * HEAD request
 */
export const head = (
  url: string,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, HttpResponse<void>> =>
  request<never, void>(
    {
      url,
      method: 'HEAD',
    },
    config
  );

// ============================================================================
// Streaming Support
// ============================================================================

/**
 * Stream response as ReadableStream
 */
export const stream = (
  req: HttpRequest,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, StreamResponse> =>
  pipe(
    executeRequest(req, config),
    TE.chain((response) => {
      if (!response.body) {
        return TE.left(
          HttpError.parseError('Response body is not available for streaming')
        );
      }

      return TE.right({
        stream: response.body,
        status: response.status,
        statusText: response.statusText,
        headers: headersToRecord(response.headers),
      });
    })
  );

/**
 * GET request with streaming
 */
export const getStream = (
  url: string,
  params?: QueryParams,
  config?: HttpRequestConfig
): TE.TaskEither<HttpError, StreamResponse> =>
  stream(
    {
      url,
      method: 'GET',
      params,
    },
    config
  );

// ============================================================================
// Response Extractors
// ============================================================================

/**
 * Extract data from HttpResponse
 */
export const getData = <A>(response: HttpResponse<A>): A => response.data;

/**
 * Extract status from HttpResponse
 */
export const getStatus = <A>(response: HttpResponse<A>): number => response.status;

/**
 * Extract headers from HttpResponse
 */
export const getHeaders = <A>(response: HttpResponse<A>): Headers => response.headers;

// ============================================================================
// HTTP Client Factory
// ============================================================================

/**
 * Create a configured HTTP client instance
 */
export const createClient = (config: HttpRequestConfig) => ({
  request: <A = unknown, B = unknown>(req: HttpRequest<A>) =>
    request<A, B>(req, config),

  get: <A = unknown>(url: string, params?: QueryParams) =>
    get<A>(url, params, config),

  post: <A = unknown, B = unknown>(url: string, data?: A) =>
    post<A, B>(url, data, config),

  put: <A = unknown, B = unknown>(url: string, data?: A) =>
    put<A, B>(url, data, config),

  patch: <A = unknown, B = unknown>(url: string, data?: A) =>
    patch<A, B>(url, data, config),

  delete: <A = unknown>(url: string) =>
    del<A>(url, config),

  head: (url: string) =>
    head(url, config),

  stream: (req: HttpRequest) =>
    stream(req, config),

  getStream: (url: string, params?: QueryParams) =>
    getStream(url, params, config),
});

export type HttpClient = ReturnType<typeof createClient>;

import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import {
  addHeaders,
  addBearerToken,
  addBasicAuth,
  addApiKey,
  setContentType,
  jsonContentType,
  validateRequest,
  composeRequestInterceptors,
  composeResponseInterceptors,
  transformResponse,
} from '../src/interceptors';
import { HttpRequest, HttpResponse, HttpError } from '../src/types';

describe('Interceptors', () => {
  describe('Request Interceptors', () => {
    describe('addHeaders', () => {
      it('should add headers to request', () => {
        const interceptor = addHeaders({ 'X-Custom': 'value' });
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers).toEqual({ 'X-Custom': 'value' });
        }
      });

      it('should merge with existing headers', () => {
        const interceptor = addHeaders({ 'X-Custom': 'value' });
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
          headers: { Authorization: 'Bearer token' },
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers).toEqual({
            Authorization: 'Bearer token',
            'X-Custom': 'value',
          });
        }
      });
    });

    describe('addBearerToken', () => {
      it('should add Bearer token to headers', () => {
        const interceptor = addBearerToken('my-token');
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers?.Authorization).toBe('Bearer my-token');
        }
      });
    });

    describe('addBasicAuth', () => {
      it('should add Basic auth to headers', () => {
        const interceptor = addBasicAuth('user', 'pass');
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers?.Authorization).toContain('Basic ');
        }
      });
    });

    describe('addApiKey', () => {
      it('should add API key to headers', () => {
        const interceptor = addApiKey('X-API-Key', 'my-api-key');
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers?.['X-API-Key']).toBe('my-api-key');
        }
      });
    });

    describe('setContentType', () => {
      it('should set content type', () => {
        const interceptor = setContentType('application/xml');
        const request: HttpRequest = {
          url: '/api/test',
          method: 'POST',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers?.['Content-Type']).toBe('application/xml');
        }
      });
    });

    describe('jsonContentType', () => {
      it('should set JSON content type', () => {
        const request: HttpRequest = {
          url: '/api/test',
          method: 'POST',
        };

        const result = jsonContentType.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers?.['Content-Type']).toBe('application/json');
        }
      });
    });

    describe('validateRequest', () => {
      it('should validate request successfully', () => {
        const validator = (req: HttpRequest) =>
          req.url.startsWith('/api')
            ? E.right(req)
            : E.left('Invalid URL');

        const interceptor = validateRequest(validator);
        const request: HttpRequest = {
          url: '/api/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isRight(result)).toBe(true);
      });

      it('should fail validation', () => {
        const validator = (req: HttpRequest) =>
          req.url.startsWith('/api')
            ? E.right(req)
            : E.left('Invalid URL');

        const interceptor = validateRequest(validator);
        const request: HttpRequest = {
          url: '/other/test',
          method: 'GET',
        };

        const result = interceptor.onRequest(request);

        expect(E.isLeft(result)).toBe(true);
        if (E.isLeft(result)) {
          expect(result.left.type).toBe('ValidationError');
        }
      });
    });
  });

  describe('Response Interceptors', () => {
    describe('transformResponse', () => {
      it('should transform response data', () => {
        const transformer = (data: { value: number }) => ({ doubled: data.value * 2 });
        const interceptor = transformResponse(transformer);

        const response: HttpResponse<{ value: number }> = {
          data: { value: 10 },
          status: 200,
          statusText: 'OK',
          headers: {},
          request: { url: '/api/test', method: 'GET' },
        };

        const result = interceptor.onResponse(response);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.data).toEqual({ doubled: 20 });
        }
      });
    });
  });

  describe('Interceptor Composition', () => {
    describe('composeRequestInterceptors', () => {
      it('should compose multiple interceptors', () => {
        const interceptors = [
          jsonContentType,
          addBearerToken('token'),
          addHeaders({ 'X-Custom': 'value' }),
        ];

        const composed = composeRequestInterceptors(interceptors);
        const request: HttpRequest = {
          url: '/api/test',
          method: 'POST',
        };

        const result = composed.onRequest(request);

        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.headers).toEqual({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
            'X-Custom': 'value',
          });
        }
      });

      it('should short-circuit on error', () => {
        const failingInterceptor = {
          onRequest: () => E.left(HttpError.validationError('Validation failed', 0)),
        };

        const interceptors = [
          jsonContentType,
          failingInterceptor,
          addBearerToken('token'),
        ];

        const composed = composeRequestInterceptors(interceptors);
        const request: HttpRequest = {
          url: '/api/test',
          method: 'POST',
        };

        const result = composed.onRequest(request);

        expect(E.isLeft(result)).toBe(true);
      });
    });

    describe('composeResponseInterceptors', () => {
      it('should compose multiple response interceptors', () => {
        const interceptor1 = transformResponse((data: { value: number }) => ({
          ...data,
          doubled: data.value * 2,
        }));

        const interceptor2 = transformResponse((data: any) => ({
          ...data,
          tripled: data.value * 3,
        }));

        const composed = composeResponseInterceptors([interceptor1, interceptor2]);

        const response: HttpResponse<{ value: number }> = {
          data: { value: 10 },
          status: 200,
          statusText: 'OK',
          headers: {},
          request: { url: '/api/test', method: 'GET' },
        };

        const result = composed.onResponse(response);

        expect(E.isRight(result)).toBe(true);
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  HeadersMonoid,
  QueryParamsMonoid,
  RetryPolicySemigroup,
  defaultRetryPolicy,
  HttpError,
} from '../src/types';

describe('Types', () => {
  describe('HeadersMonoid', () => {
    it('should have an empty value', () => {
      expect(HeadersMonoid.empty).toEqual({});
    });

    it('should concat headers', () => {
      const headers1 = { 'Content-Type': 'application/json' };
      const headers2 = { Authorization: 'Bearer token' };

      const result = HeadersMonoid.concat(headers1, headers2);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });
    });

    it('should override headers with same key', () => {
      const headers1 = { 'Content-Type': 'application/json' };
      const headers2 = { 'Content-Type': 'text/plain' };

      const result = HeadersMonoid.concat(headers1, headers2);

      expect(result).toEqual({
        'Content-Type': 'text/plain',
      });
    });
  });

  describe('QueryParamsMonoid', () => {
    it('should have an empty value', () => {
      expect(QueryParamsMonoid.empty).toEqual({});
    });

    it('should concat query params', () => {
      const params1 = { page: 1 };
      const params2 = { limit: 10 };

      const result = QueryParamsMonoid.concat(params1, params2);

      expect(result).toEqual({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('RetryPolicySemigroup', () => {
    it('should combine retry policies', () => {
      const policy1 = {
        ...defaultRetryPolicy,
        maxRetries: 3,
        initialDelay: 100,
      };

      const policy2 = {
        ...defaultRetryPolicy,
        maxRetries: 5,
        initialDelay: 200,
      };

      const result = RetryPolicySemigroup.concat(policy1, policy2);

      expect(result.maxRetries).toBe(5);
      expect(result.initialDelay).toBe(200);
    });

    it('should combine retryable statuses', () => {
      const policy1 = {
        ...defaultRetryPolicy,
        retryableStatuses: [500, 502],
      };

      const policy2 = {
        ...defaultRetryPolicy,
        retryableStatuses: [503, 504],
      };

      const result = RetryPolicySemigroup.concat(policy1, policy2);

      expect(result.retryableStatuses).toContain(500);
      expect(result.retryableStatuses).toContain(502);
      expect(result.retryableStatuses).toContain(503);
      expect(result.retryableStatuses).toContain(504);
    });
  });

  describe('HttpError constructors', () => {
    it('should create network error', () => {
      const error = HttpError.networkError('Connection failed');

      expect(error.type).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
    });

    it('should create timeout error', () => {
      const error = HttpError.timeoutError('Request timeout', 5000);

      expect(error.type).toBe('TimeoutError');
      expect(error.message).toContain('5000ms');
    });

    it('should create server error', () => {
      const error = HttpError.serverError('Internal server error', 500);

      expect(error.type).toBe('ServerError');
      expect(error.status).toBe(500);
    });

    it('should create circuit breaker error', () => {
      const error = HttpError.circuitBreakerOpen('Circuit is open');

      expect(error.type).toBe('CircuitBreakerOpen');
    });
  });
});

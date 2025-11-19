import { describe, it, expect, vi } from 'vitest';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import {
  retry,
  combineRetryPolicies,
  withMaxRetries,
  retryWhen,
  conservativeRetryPolicy,
  aggressiveRetryPolicy,
} from '../src/retry';
import { HttpError, defaultRetryPolicy } from '../src/types';

describe('Retry', () => {
  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const task = TE.right({ data: 'success' });
      const result = await retry(task, defaultRetryPolicy)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.data).toBe('success');
      }
    });

    it('should retry on retryable error', async () => {
      let attempts = 0;
      const task = TE.fromIO(() => {
        attempts++;
        if (attempts < 3) {
          return E.left(HttpError.networkError('Network error'));
        }
        return E.right({ data: 'success' });
      });

      const policy = {
        ...defaultRetryPolicy,
        maxRetries: 3,
        initialDelay: 10,
      };

      const result = await retry(task, policy)();

      expect(attempts).toBe(3);
      expect(E.isRight(result)).toBe(true);
    });

    it('should not retry non-retryable error', async () => {
      let attempts = 0;
      const task = TE.fromIO(() => {
        attempts++;
        return E.left(HttpError.parseError('Parse error'));
      });

      const policy = {
        ...defaultRetryPolicy,
        maxRetries: 3,
        initialDelay: 10,
      };

      const result = await retry(task, policy)();

      expect(attempts).toBe(1);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should exhaust retries', async () => {
      const task = TE.left(HttpError.networkError('Network error'));

      const policy = {
        ...defaultRetryPolicy,
        maxRetries: 2,
        initialDelay: 10,
      };

      const result = await retry(task, policy)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('RetryExhausted');
      }
    });
  });

  describe('retryWhen', () => {
    it('should retry when predicate is true', async () => {
      let attempts = 0;
      const task = TE.fromIO(() => {
        attempts++;
        if (attempts < 3) {
          return E.left(HttpError.serverError('Server error', 500));
        }
        return E.right({ data: 'success' });
      });

      const predicate = (error: HttpError) => error.status === 500;
      const policy = {
        ...defaultRetryPolicy,
        maxRetries: 3,
        initialDelay: 10,
      };

      const result = await retryWhen(task, predicate, policy)();

      expect(attempts).toBe(3);
      expect(E.isRight(result)).toBe(true);
    });

    it('should not retry when predicate is false', async () => {
      let attempts = 0;
      const task = TE.fromIO(() => {
        attempts++;
        return E.left(HttpError.clientError('Client error', 400));
      });

      const predicate = (error: HttpError) => error.status === 500;
      const policy = {
        ...defaultRetryPolicy,
        maxRetries: 3,
        initialDelay: 10,
      };

      const result = await retryWhen(task, predicate, policy)();

      expect(attempts).toBe(1);
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('combineRetryPolicies', () => {
    it('should combine multiple policies', () => {
      const policy1 = { ...defaultRetryPolicy, maxRetries: 3 };
      const policy2 = { ...defaultRetryPolicy, maxRetries: 5 };

      const combined = combineRetryPolicies([policy1, policy2]);

      expect(combined.maxRetries).toBe(5);
    });

    it('should return default policy for empty array', () => {
      const combined = combineRetryPolicies([]);

      expect(combined).toEqual(defaultRetryPolicy);
    });
  });

  describe('withMaxRetries', () => {
    it('should create policy with custom max retries', () => {
      const policy = withMaxRetries(10);

      expect(policy.maxRetries).toBe(10);
      expect(policy.initialDelay).toBe(defaultRetryPolicy.initialDelay);
    });
  });

  describe('predefined policies', () => {
    it('conservative policy should have fewer retries', () => {
      expect(conservativeRetryPolicy.maxRetries).toBeLessThan(
        aggressiveRetryPolicy.maxRetries
      );
    });

    it('aggressive policy should have shorter delays', () => {
      expect(aggressiveRetryPolicy.initialDelay).toBeLessThan(
        conservativeRetryPolicy.initialDelay
      );
    });
  });
});

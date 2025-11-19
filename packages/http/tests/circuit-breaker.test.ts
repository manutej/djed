import { describe, it, expect, beforeEach } from 'vitest';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import {
  createCircuitBreaker,
  withCircuitBreaker,
  CircuitBreakerManager,
  isOpen,
  isClosed,
  isHalfOpen,
} from '../src/circuit-breaker';
import { HttpError, defaultCircuitBreakerConfig } from '../src/types';

describe('Circuit Breaker', () => {
  describe('createCircuitBreaker', () => {
    it('should start in closed state', () => {
      const breaker = createCircuitBreaker();
      const stats = breaker.getStats();

      expect(stats.state).toBe('CLOSED');
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });

    it('should open after failure threshold', () => {
      const config = { ...defaultCircuitBreakerConfig, failureThreshold: 3 };
      const breaker = createCircuitBreaker(config);

      // Record failures
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const stats = breaker.getStats();
      expect(stats.state).toBe('OPEN');
    });

    it('should reset failures on success', () => {
      const breaker = createCircuitBreaker();

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });

    it('should transition to half-open after reset timeout', async () => {
      const config = {
        ...defaultCircuitBreakerConfig,
        failureThreshold: 2,
        resetTimeout: 100,
      };
      const breaker = createCircuitBreaker(config);

      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getStats().state).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check if can execute (should transition to HALF_OPEN)
      const canExecute = breaker.canExecute();
      expect(E.isRight(canExecute)).toBe(true);
      expect(breaker.getStats().state).toBe('HALF_OPEN');
    });

    it('should close from half-open after success threshold', () => {
      const config = {
        ...defaultCircuitBreakerConfig,
        failureThreshold: 2,
        successThreshold: 2,
      };
      const breaker = createCircuitBreaker(config);

      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.open(); // Manually open for testing

      // Manually transition to half-open
      breaker.close();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker['state'] = 'HALF_OPEN' as any;

      // Record successes
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getStats().state).toBe('CLOSED');
    });
  });

  describe('withCircuitBreaker', () => {
    it('should execute task when circuit is closed', async () => {
      const breaker = createCircuitBreaker();
      const task = TE.right({ data: 'success' });

      const result = await withCircuitBreaker(breaker)(task)();

      expect(E.isRight(result)).toBe(true);
    });

    it('should reject task when circuit is open', async () => {
      const config = { ...defaultCircuitBreakerConfig, failureThreshold: 1 };
      const breaker = createCircuitBreaker(config);

      // Open the circuit
      breaker.recordFailure();

      const task = TE.right({ data: 'success' });
      const result = await withCircuitBreaker(breaker)(task)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('CircuitBreakerOpen');
      }
    });

    it('should record success', async () => {
      const breaker = createCircuitBreaker();
      const task = TE.right({ data: 'success' });

      await withCircuitBreaker(breaker)(task)();

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });

    it('should record failure', async () => {
      const breaker = createCircuitBreaker();
      const task = TE.left(HttpError.networkError('Network error'));

      await withCircuitBreaker(breaker)(task)();

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });
  });

  describe('CircuitBreakerManager', () => {
    let manager: CircuitBreakerManager;

    beforeEach(() => {
      manager = new CircuitBreakerManager();
    });

    it('should create breaker for service', () => {
      const breaker = manager.getBreaker('api-service');

      expect(breaker).toBeDefined();
      expect(breaker.getStats().state).toBe('CLOSED');
    });

    it('should reuse existing breaker', () => {
      const breaker1 = manager.getBreaker('api-service');
      const breaker2 = manager.getBreaker('api-service');

      expect(breaker1).toBe(breaker2);
    });

    it('should get stats for service', () => {
      manager.getBreaker('api-service');
      const stats = manager.getStats('api-service');

      expect(stats).toBeDefined();
      expect(stats?.state).toBe('CLOSED');
    });

    it('should get all stats', () => {
      manager.getBreaker('service1');
      manager.getBreaker('service2');

      const allStats = manager.getAllStats();

      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['service1']).toBeDefined();
      expect(allStats['service2']).toBeDefined();
    });

    it('should reset specific service', () => {
      const breaker = manager.getBreaker('api-service');
      breaker.recordFailure();

      manager.reset('api-service');

      const stats = manager.getStats('api-service');
      expect(stats?.failures).toBe(0);
    });

    it('should reset all services', () => {
      manager.getBreaker('service1').recordFailure();
      manager.getBreaker('service2').recordFailure();

      manager.resetAll();

      const allStats = manager.getAllStats();
      expect(allStats['service1'].failures).toBe(0);
      expect(allStats['service2'].failures).toBe(0);
    });
  });

  describe('utility functions', () => {
    it('isOpen should check if breaker is open', () => {
      const config = { ...defaultCircuitBreakerConfig, failureThreshold: 1 };
      const breaker = createCircuitBreaker(config);

      expect(isOpen(breaker)).toBe(false);

      breaker.recordFailure();

      expect(isOpen(breaker)).toBe(true);
    });

    it('isClosed should check if breaker is closed', () => {
      const breaker = createCircuitBreaker();

      expect(isClosed(breaker)).toBe(true);
    });

    it('isHalfOpen should check if breaker is half-open', () => {
      const breaker = createCircuitBreaker();

      expect(isHalfOpen(breaker)).toBe(false);
    });
  });
});

/**
 * Tests for @djed/validation
 * Comprehensive test suite for Applicative validation
 */

import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as V from '../src/index';

describe('@djed/validation', () => {
  describe('Basic validators', () => {
    it('should validate strings', () => {
      const result = V.string('hello');
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe('hello');
      }
    });

    it('should reject non-strings', () => {
      const result = V.string(123);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should validate numbers', () => {
      const result = V.number(42);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(42);
      }
    });

    it('should reject NaN', () => {
      const result = V.number(NaN);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should validate booleans', () => {
      expect(E.isRight(V.boolean(true))).toBe(true);
      expect(E.isRight(V.boolean(false))).toBe(true);
      expect(E.isLeft(V.boolean('true'))).toBe(true);
    });
  });

  describe('String validators', () => {
    it('should validate non-empty strings', () => {
      expect(E.isRight(V.nonEmptyString('hello'))).toBe(true);
      expect(E.isLeft(V.nonEmptyString(''))).toBe(true);
      expect(E.isLeft(V.nonEmptyString('   '))).toBe(true);
    });

    it('should validate email addresses', () => {
      expect(E.isRight(V.email('user@example.com'))).toBe(true);
      expect(E.isLeft(V.email('invalid'))).toBe(true);
      expect(E.isLeft(V.email('missing@domain'))).toBe(true);
    });

    it('should validate URLs', () => {
      expect(E.isRight(V.url('https://example.com'))).toBe(true);
      expect(E.isRight(V.url('http://localhost:3000'))).toBe(true);
      expect(E.isLeft(V.url('not-a-url'))).toBe(true);
    });

    it('should validate UUIDs', () => {
      expect(E.isRight(V.uuid('123e4567-e89b-12d3-a456-426614174000'))).toBe(true);
      expect(E.isLeft(V.uuid('invalid-uuid'))).toBe(true);
    });

    it('should validate min/max length', () => {
      const result1 = pipe(V.string('hello'), V.chain(V.minLength(3)));
      expect(E.isRight(result1)).toBe(true);

      const result2 = pipe(V.string('hi'), V.chain(V.minLength(5)));
      expect(E.isLeft(result2)).toBe(true);

      const result3 = pipe(V.string('hello'), V.chain(V.maxLength(10)));
      expect(E.isRight(result3)).toBe(true);

      const result4 = pipe(V.string('very long string'), V.chain(V.maxLength(5)));
      expect(E.isLeft(result4)).toBe(true);
    });

    it('should validate patterns', () => {
      const alphaOnly = V.pattern(/^[a-zA-Z]+$/);
      expect(E.isRight(pipe(V.string('hello'), V.chain(alphaOnly)))).toBe(true);
      expect(E.isLeft(pipe(V.string('hello123'), V.chain(alphaOnly)))).toBe(true);
    });
  });

  describe('Number validators', () => {
    it('should validate positive numbers', () => {
      expect(E.isRight(V.positiveNumber(5))).toBe(true);
      expect(E.isLeft(V.positiveNumber(0))).toBe(true);
      expect(E.isLeft(V.positiveNumber(-5))).toBe(true);
    });

    it('should validate non-negative numbers', () => {
      expect(E.isRight(V.nonNegativeNumber(0))).toBe(true);
      expect(E.isRight(V.nonNegativeNumber(5))).toBe(true);
      expect(E.isLeft(V.nonNegativeNumber(-1))).toBe(true);
    });

    it('should validate integers', () => {
      expect(E.isRight(V.integerNumber(42))).toBe(true);
      expect(E.isLeft(V.integerNumber(42.5))).toBe(true);
    });

    it('should validate min/max ranges', () => {
      const result1 = pipe(V.number(50), V.chain(V.min(0)), V.chain(V.max(100)));
      expect(E.isRight(result1)).toBe(true);

      const result2 = pipe(V.number(150), V.chain(V.max(100)));
      expect(E.isLeft(result2)).toBe(true);

      const result3 = pipe(V.number(-10), V.chain(V.min(0)));
      expect(E.isLeft(result3)).toBe(true);
    });

    it('should validate ports', () => {
      expect(E.isRight(V.port(8080))).toBe(true);
      expect(E.isRight(V.port(0))).toBe(true);
      expect(E.isRight(V.port(65535))).toBe(true);
      expect(E.isLeft(V.port(-1))).toBe(true);
      expect(E.isLeft(V.port(65536))).toBe(true);
      expect(E.isLeft(V.port(3000.5))).toBe(true);
    });
  });

  describe('Struct validation (Applicative)', () => {
    it('should validate valid structs', () => {
      const validateUser = V.struct({
        name: V.nonEmptyString,
        age: V.positiveNumber,
        email: V.email,
      });

      const result = validateUser({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });

      expect(E.isRight(result)).toBe(true);
    });

    it('should collect ALL errors from struct (Applicative)', () => {
      const validateUser = V.struct({
        name: V.nonEmptyString,
        age: V.positiveNumber,
        email: V.email,
      });

      const result = validateUser({
        name: '',
        age: -5,
        email: 'invalid',
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        // Should have 3 errors (one for each field)
        expect(result.left.length).toBe(3);

        const paths = result.left.map(e => e.path.join('.'));
        expect(paths).toContain('name');
        expect(paths).toContain('age');
        expect(paths).toContain('email');
      }
    });

    it('should handle nested structs', () => {
      const validateAddress = V.struct({
        street: V.nonEmptyString,
        city: V.nonEmptyString,
        zip: V.nonEmptyString,
      });

      const validateUser = V.struct({
        name: V.nonEmptyString,
        address: validateAddress,
      });

      const result = validateUser({
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          zip: '12345',
        },
      });

      expect(E.isRight(result)).toBe(true);
    });
  });

  describe('Array validation', () => {
    it('should validate arrays of elements', () => {
      const validateNumbers = V.array(V.positiveNumber);

      const result1 = validateNumbers([1, 2, 3, 4, 5]);
      expect(E.isRight(result1)).toBe(true);

      const result2 = validateNumbers([1, -2, 3]);
      expect(E.isLeft(result2)).toBe(true);
    });

    it('should collect errors with indices', () => {
      const validateEmails = V.array(V.email);

      const result = validateEmails(['valid@example.com', 'invalid', 'also@valid.com', 'bad']);

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.length).toBe(2);
        const paths = result.left.map(e => e.path[0]);
        expect(paths).toContain('1'); // 'invalid'
        expect(paths).toContain('3'); // 'bad'
      }
    });
  });

  describe('Optional and nullable', () => {
    it('should handle optional values', () => {
      const validateOptional = V.optional(V.email);

      expect(E.isRight(validateOptional(undefined))).toBe(true);
      expect(E.isRight(validateOptional('user@example.com'))).toBe(true);
      expect(E.isLeft(validateOptional('invalid'))).toBe(true);
    });

    it('should handle nullable values', () => {
      const validateNullable = V.nullable(V.positiveNumber);

      expect(E.isRight(validateNullable(null))).toBe(true);
      expect(E.isRight(validateNullable(42))).toBe(true);
      expect(E.isLeft(validateNullable(-5))).toBe(true);
    });
  });

  describe('Enum validation', () => {
    it('should validate enum values', () => {
      const validateStatus = V.enumValue('pending', 'active', 'completed');

      expect(E.isRight(validateStatus('active'))).toBe(true);
      expect(E.isLeft(validateStatus('invalid'))).toBe(true);
    });
  });

  describe('Tuple validation', () => {
    it('should validate tuples', () => {
      const validatePair = V.tuple(V.string, V.number);

      expect(E.isRight(validatePair(['hello', 42]))).toBe(true);
      expect(E.isLeft(validatePair([42, 'hello']))).toBe(true);
      expect(E.isLeft(validatePair(['hello']))).toBe(true);
    });
  });

  describe('Record validation', () => {
    it('should validate records', () => {
      const validateScores = V.record(V.positiveNumber);

      const result = validateScores({
        math: 95,
        science: 87,
        english: 92,
      });

      expect(E.isRight(result)).toBe(true);
    });

    it('should collect errors for invalid record values', () => {
      const validateScores = V.record(V.positiveNumber);

      const result = validateScores({
        math: 95,
        science: -10,
        english: 92,
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        const paths = result.left.map(e => e.path[0]);
        expect(paths).toContain('science');
      }
    });
  });

  describe('Utility functions', () => {
    it('should getOrElse with default', () => {
      const result1 = V.email('user@example.com');
      const result2 = V.email('invalid');

      expect(pipe(result1, V.getOrElse('default@example.com' as any))).toBe('user@example.com');
      expect(pipe(result2, V.getOrElse('default@example.com' as any))).toBe('default@example.com');
    });

    it('should fold over results', () => {
      const result1 = V.email('user@example.com');
      const result2 = V.email('invalid');

      const msg1 = pipe(
        result1,
        V.fold(
          (errors) => `Errors: ${errors.length}`,
          (email) => `Valid: ${email}`
        )
      );

      const msg2 = pipe(
        result2,
        V.fold(
          (errors) => `Errors: ${errors.length}`,
          (email) => `Valid: ${email}`
        )
      );

      expect(msg1).toContain('Valid:');
      expect(msg2).toContain('Errors:');
    });

    it('should format validation errors', () => {
      const error = V.validationError('Test error', ['user', 'email'], 'bad-value');
      const formatted = V.formatValidationError(error);

      expect(formatted).toContain('user.email');
      expect(formatted).toContain('Test error');
    });
  });

  describe('Composition', () => {
    it('should compose validators with chain', () => {
      const validateAdult = (value: unknown) => pipe(
        V.number(value),
        V.chain(V.min(18))
      );

      expect(E.isRight(validateAdult(25))).toBe(true);
      expect(E.isLeft(validateAdult(15))).toBe(true);
    });

    it('should compose validators with and', () => {
      const validatePositiveInt = V.and(
        V.positiveNumber,
        V.integerNumber as any
      );

      expect(E.isRight(validatePositiveInt(42))).toBe(true);
      expect(E.isLeft(validatePositiveInt(-5))).toBe(true);
      expect(E.isLeft(validatePositiveInt(3.14))).toBe(true);
    });

    it('should transform validated values', () => {
      const validateAndDouble = V.transform(
        V.positiveNumber,
        (n) => n * 2
      );

      const result = validateAndDouble(21);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(42);
      }
    });
  });

  describe('Real-world example', () => {
    it('should validate complete user registration', () => {
      const validateUsername = (value: unknown) =>
        pipe(V.nonEmptyString(value), V.chain(V.minLength(3)), V.chain(V.maxLength(20)));

      const validatePassword = (value: unknown) =>
        pipe(V.nonEmptyString(value), V.chain(V.minLength(8)));

      const validateAge = (value: unknown) =>
        pipe(V.positiveNumber(value), V.chain(V.min(18)));

      const validateRegistration = V.struct({
        username: validateUsername,
        email: V.email,
        password: validatePassword,
        age: validateAge,
        website: V.optional(V.url),
        roles: V.array(V.enumValue('user', 'admin', 'moderator')),
      });

      const validData = {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepass123',
        age: 25,
        website: 'https://johndoe.com',
        roles: ['user', 'moderator'],
      };

      const result1 = validateRegistration(validData);
      expect(E.isRight(result1)).toBe(true);

      const invalidData = {
        username: 'jd',  // too short
        email: 'invalid',  // bad email
        password: 'short',  // too short
        age: 15,  // too young
        website: 'not-a-url',  // invalid URL
        roles: ['user', 'hacker'],  // invalid role
      };

      const result2 = validateRegistration(invalidData);
      expect(E.isLeft(result2)).toBe(true);
      if (E.isLeft(result2)) {
        // Should collect errors from all fields
        expect(result2.left.length).toBeGreaterThan(5);
      }
    });
  });
});

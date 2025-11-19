/**
 * Built-in validators with branded types
 * All validators are pure functions returning ValidationResult
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import {
  Validator,
  ValidationResult,
  NonEmptyString,
  EmailAddress,
  URL,
  Port,
  PositiveNumber,
  NonNegativeNumber,
  IntegerNumber,
  UUID,
  ISODate,
  JSONString,
  validationError,
} from './types';
import { success, failure, chain } from './core';

/**
 * Basic type validators
 */

export const string: Validator<unknown, string> = (value) =>
  typeof value === 'string'
    ? success(value)
    : failure(validationError(`Expected string, got ${typeof value}`, [], value));

export const number: Validator<unknown, number> = (value) =>
  typeof value === 'number' && !isNaN(value)
    ? success(value)
    : failure(validationError(`Expected number, got ${typeof value}`, [], value));

export const boolean: Validator<unknown, boolean> = (value) =>
  typeof value === 'boolean'
    ? success(value)
    : failure(validationError(`Expected boolean, got ${typeof value}`, [], value));

export const unknown: Validator<unknown, unknown> = (value) => success(value);

export const literal = <T extends string | number | boolean>(expected: T): Validator<unknown, T> => (value) =>
  value === expected
    ? success(value as T)
    : failure(validationError(`Expected literal ${expected}, got ${value}`, [], value));

/**
 * String validators with branded types
 */

export const nonEmptyString: Validator<unknown, NonEmptyString> = (value) =>
  pipe(
    string(value),
    chain((s) =>
      s.trim().length > 0
        ? success(s as NonEmptyString)
        : failure(validationError('String cannot be empty', [], value))
    )
  );

export const minLength = (min: number) => (value: unknown): ValidationResult<string> =>
  pipe(
    string(value),
    chain((s) =>
      s.length >= min
        ? success(s)
        : failure(validationError(`String must be at least ${min} characters`, [], value))
    )
  );

export const maxLength = (max: number) => (value: unknown): ValidationResult<string> =>
  pipe(
    string(value),
    chain((s) =>
      s.length <= max
        ? success(s)
        : failure(validationError(`String must be at most ${max} characters`, [], value))
    )
  );

export const pattern = (regex: RegExp, message?: string) => (
  value: unknown
): ValidationResult<string> =>
  pipe(
    string(value),
    chain((s) =>
      regex.test(s)
        ? success(s)
        : failure(
            validationError(
              message || `String must match pattern ${regex.source}`,
              [],
              value
            )
          )
    )
  );

export const email: Validator<unknown, EmailAddress> = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pipe(
    string(value),
    chain((s) =>
      emailRegex.test(s)
        ? success(s as EmailAddress)
        : failure(validationError('Invalid email address', [], value))
    )
  );
};

export const url: Validator<unknown, URL> = (value) =>
  pipe(
    string(value),
    chain((s) => {
      try {
        new globalThis.URL(s);
        return success(s as URL);
      } catch {
        return failure(validationError('Invalid URL', [], value));
      }
    })
  );

export const uuid: Validator<unknown, UUID> = (value) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pipe(
    string(value),
    chain((s) =>
      uuidRegex.test(s)
        ? success(s as UUID)
        : failure(validationError('Invalid UUID', [], value))
    )
  );
};

export const isoDate: Validator<unknown, ISODate> = (value) =>
  pipe(
    string(value),
    chain((s) => {
      const date = new Date(s);
      return !isNaN(date.getTime())
        ? success(s as ISODate)
        : failure(validationError('Invalid ISO date string', [], value));
    })
  );

export const jsonString: Validator<unknown, JSONString> = (value) =>
  pipe(
    string(value),
    chain((s) => {
      try {
        JSON.parse(s);
        return success(s as JSONString);
      } catch {
        return failure(validationError('Invalid JSON string', [], value));
      }
    })
  );

/**
 * Number validators with branded types
 */

export const positiveNumber: Validator<unknown, PositiveNumber> = (value) =>
  pipe(
    number(value),
    chain((n) =>
      n > 0
        ? success(n as PositiveNumber)
        : failure(validationError('Number must be positive', [], value))
    )
  );

export const nonNegativeNumber: Validator<unknown, NonNegativeNumber> = (value) =>
  pipe(
    number(value),
    chain((n) =>
      n >= 0
        ? success(n as NonNegativeNumber)
        : failure(validationError('Number must be non-negative', [], value))
    )
  );

export const integerNumber: Validator<unknown, IntegerNumber> = (value) =>
  pipe(
    number(value),
    chain((n) =>
      Number.isInteger(n)
        ? success(n as IntegerNumber)
        : failure(validationError('Number must be an integer', [], value))
    )
  );

export const min = (minimum: number) => (value: unknown): ValidationResult<number> =>
  pipe(
    number(value),
    chain((n) =>
      n >= minimum
        ? success(n)
        : failure(validationError(`Number must be >= ${minimum}`, [], value))
    )
  );

export const max = (maximum: number) => (value: unknown): ValidationResult<number> =>
  pipe(
    number(value),
    chain((n) =>
      n <= maximum
        ? success(n)
        : failure(validationError(`Number must be <= ${maximum}`, [], value))
    )
  );

export const port: Validator<unknown, Port> = (value) =>
  pipe(
    number(value),
    chain((n) =>
      Number.isInteger(n) && n >= 0 && n <= 65535
        ? success(n as Port)
        : failure(validationError('Port must be an integer between 0 and 65535', [], value))
    )
  );

/**
 * Date validators
 */

export const date: Validator<unknown, Date> = (value) => {
  if (value instanceof Date) {
    return !isNaN(value.getTime())
      ? success(value)
      : failure(validationError('Invalid Date object', [], value));
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return !isNaN(d.getTime())
      ? success(d)
      : failure(validationError('Invalid date value', [], value));
  }

  return failure(validationError(`Expected Date, got ${typeof value}`, [], value));
};

export const minDate = (minimum: Date) => (value: unknown): ValidationResult<Date> =>
  pipe(
    date(value),
    chain((d) =>
      d >= minimum
        ? success(d)
        : failure(
            validationError(`Date must be >= ${minimum.toISOString()}`, [], value)
          )
    )
  );

export const maxDate = (maximum: Date) => (value: unknown): ValidationResult<Date> =>
  pipe(
    date(value),
    chain((d) =>
      d <= maximum
        ? success(d)
        : failure(
            validationError(`Date must be <= ${maximum.toISOString()}`, [], value)
          )
    )
  );

/**
 * Enum validator
 */

export const enumValue = <T extends readonly string[]>(
  ...values: T
): Validator<unknown, T[number]> => (value) =>
  typeof value === 'string' && (values as readonly string[]).includes(value)
    ? success(value as T[number])
    : failure(
        validationError(
          `Expected one of [${values.join(', ')}], got ${value}`,
          [],
          value
        )
      );

/**
 * Union validator (discriminated unions)
 */

export const union = <A extends readonly Validator<unknown, any>[]>(
  ...validators: A
): Validator<unknown, ReturnType<A[number]> extends ValidationResult<infer R> ? R : never> => (
  value
) => {
  const errors: ValidationResult<any>[] = [];

  for (const validator of validators) {
    const result = validator(value);
    if (E.isRight(result)) {
      return result;
    }
    errors.push(result);
  }

  // All validators failed - combine errors
  return failure(
    validationError(
      'Value did not match any of the union types',
      [],
      value
    )
  );
};

/**
 * Intersection validator (all must pass)
 */

export const intersection = <A, B>(
  v1: Validator<unknown, A>,
  v2: Validator<unknown, B>
): Validator<unknown, A & B> => (value) => {
  const r1 = v1(value);
  const r2 = v2(value);

  if (E.isRight(r1) && E.isRight(r2)) {
    return success({ ...r1.right, ...r2.right } as A & B);
  }

  if (E.isLeft(r1) && E.isLeft(r2)) {
    return E.left([...r1.left, ...r2.left]);
  }

  return E.isLeft(r1) ? r1 : r2;
};

/**
 * Tuple validator
 */

export const tuple = <A extends readonly unknown[]>(
  ...validators: { [K in keyof A]: Validator<unknown, A[K]> }
): Validator<unknown, A> => (value) => {
  if (!Array.isArray(value)) {
    return failure(validationError('Expected an array', [], value));
  }

  if (value.length !== validators.length) {
    return failure(
      validationError(
        `Expected tuple of length ${validators.length}, got ${value.length}`,
        [],
        value
      )
    );
  }

  const results = validators.map((validator, i) => validator(value[i]));

  // Check if all succeeded
  if (results.every(E.isRight)) {
    return success(results.map((r) => (r as E.Right<any>).right) as any as A);
  }

  // Collect all errors
  const errors = results.filter(E.isLeft).flatMap((r) => (r as E.Left<any>).left);
  return E.left(errors as any);
};

/**
 * Record validator (object with string keys)
 */

export const record = <A>(valueValidator: Validator<unknown, A>): Validator<unknown, Record<string, A>> => (
  value
) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure(validationError('Expected an object', [], value));
  }

  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);

  const results = entries.map(([key, val]) =>
    pipe(
      valueValidator(val),
      E.mapLeft(errors => errors.map(e => ({ ...e, path: [key, ...e.path] })))
    )
  );

  if (results.every(E.isRight)) {
    const validated: Record<string, A> = {};
    entries.forEach(([key], i) => {
      validated[key] = (results[i] as E.Right<A>).right;
    });
    return success(validated);
  }

  const errors = results.filter(E.isLeft).flatMap((r) => (r as E.Left<any>).left);
  return E.left(errors as any);
};

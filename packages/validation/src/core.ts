/**
 * Core validation with Applicative Functor
 * Enables error accumulation - collects ALL errors, not just the first
 *
 * Category Theory:
 * - Functor: map over successful validations
 * - Applicative: apply validated functions to validated values
 * - Semigroup: combine validation errors
 */

import * as E from 'fp-ts/Either';
import * as NEA from 'fp-ts/NonEmptyArray';
import * as A from 'fp-ts/Apply';
import { pipe, flow, constant } from 'fp-ts/function';
import {
  ValidationError,
  ValidationErrors,
  ValidationResult,
  Validator,
  validationError,
} from './types';

/**
 * Semigroup for ValidationErrors
 * Combines multiple validation errors
 */
export const ValidationErrorsSemigroup = NEA.getSemigroup<ValidationError>();

/**
 * Create a successful validation
 * Lifts a value into the validation context
 */
export const success = <A>(value: A): ValidationResult<A> => E.right(value);

/**
 * Create a failed validation with a single error
 */
export const failure = (error: ValidationError): ValidationResult<never> =>
  E.left([error] as ValidationErrors);

/**
 * Create a failed validation with multiple errors
 */
export const failures = (errors: ValidationErrors): ValidationResult<never> => E.left(errors);

/**
 * Map over a validation result (Functor)
 * Only transforms the success case
 */
export const map = <A, B>(f: (a: A) => B) => (
  va: ValidationResult<A>
): ValidationResult<B> => E.map(f)(va);

/**
 * Apply a validated function to a validated value (Applicative)
 * Accumulates errors from both if both fail
 */
export const ap = <A, B>(
  fab: ValidationResult<(a: A) => B>
) => (fa: ValidationResult<A>): ValidationResult<B> => {
  return pipe(
    fab,
    E.match(
      (leftErrors) =>
        pipe(
          fa,
          E.match(
            (rightErrors) => E.left([...leftErrors, ...rightErrors] as ValidationErrors),
            () => E.left(leftErrors)
          )
        ),
      (f) => E.map(f)(fa)
    )
  );
};

/**
 * Chain validations (Monad)
 * Short-circuits on first error (unlike ap)
 */
export const chain = <A, B>(f: (a: A) => ValidationResult<B>) => (
  va: ValidationResult<A>
): ValidationResult<B> => E.flatMap(f)(va);

/**
 * Alt operation - try alternative if first fails
 */
export const alt = <A>(second: () => ValidationResult<A>) => (
  first: ValidationResult<A>
): ValidationResult<A> => pipe(first, E.orElse(second));

/**
 * Bimap - transform both success and failure cases
 */
export const bimap = <A, B>(
  f: (errors: ValidationErrors) => ValidationErrors,
  g: (a: A) => B
) => (va: ValidationResult<A>): ValidationResult<B> => E.bimap(f, g)(va);

/**
 * Map over errors (left side)
 */
export const mapErrors = <A>(f: (errors: ValidationErrors) => ValidationErrors) => (
  va: ValidationResult<A>
): ValidationResult<A> => E.mapLeft(f)(va);

/**
 * Fold a validation - handle both cases
 */
export const fold = <A, B>(
  onFailure: (errors: ValidationErrors) => B,
  onSuccess: (value: A) => B
) => (va: ValidationResult<A>): B => pipe(va, E.match(onFailure, onSuccess));

/**
 * Get validation result or throw
 * Use sparingly - prefer fold for production code
 */
export const getOrThrow = <A>(va: ValidationResult<A>): A =>
  pipe(
    va,
    E.getOrElse((errors: ValidationErrors): A => {
      throw new Error(`Validation failed:\n${errors.map(e => `  - ${e.message}`).join('\n')}`);
    })
  );

/**
 * Get validation result or return default
 */
export const getOrElse = <A>(defaultValue: A) => (va: ValidationResult<A>): A =>
  pipe(va, E.getOrElse(constant(defaultValue)));

/**
 * Sequence an array of validations
 * Collects ALL errors from ALL validations (Applicative)
 */
export const sequenceArray = <A>(
  validations: readonly ValidationResult<A>[]
): ValidationResult<readonly A[]> => {
  const results: A[] = [];
  const errors: ValidationError[] = [];

  for (const validation of validations) {
    if (E.isRight(validation)) {
      results.push(validation.right);
    } else {
      errors.push(...validation.left);
    }
  }

  return errors.length > 0
    ? E.left(errors as ValidationErrors)
    : E.right(results);
};

/**
 * Traverse an array with a validation function
 * Applies validator to each element and collects ALL errors
 */
export const traverseArray = <A, B>(f: (a: A) => ValidationResult<B>) => (
  as: readonly A[]
): ValidationResult<readonly B[]> => sequenceArray(as.map(f));

/**
 * Validate a struct (object with multiple fields)
 * Uses Applicative to collect errors from ALL fields
 */
export const struct = <A extends Record<string, any>>(
  validators: { [K in keyof A]: Validator<unknown, A[K]> }
) => (value: unknown): ValidationResult<A> => {
  if (typeof value !== 'object' || value === null) {
    return failure(validationError('Expected an object', [], value));
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(validators) as (keyof A)[];

  // Use Applicative sequencing to collect ALL field errors
  const fieldValidations = keys.map((key) => {
    const validator = validators[key];
    const fieldValue = obj[key as string];

    return pipe(
      validator(fieldValue),
      mapErrors(errors => {
        const mapped: ValidationError[] = errors.map(e => ({
          ...e,
          path: [String(key), ...e.path],
        }));
        return mapped as unknown as ValidationErrors;
      })
    );
  });

  return pipe(
    sequenceArray(fieldValidations),
    map(values => {
      const result: any = {};
      keys.forEach((key, i) => {
        result[key] = values[i];
      });
      return result as A;
    })
  );
};

/**
 * Validate array elements
 * Collects errors with indices
 */
export const array = <A>(itemValidator: Validator<unknown, A>) => (
  value: unknown
): ValidationResult<readonly A[]> => {
  if (!Array.isArray(value)) {
    return failure(validationError('Expected an array', [], value));
  }

  const validations = value.map((item, index) =>
    pipe(
      itemValidator(item),
      mapErrors(errors => {
        const mapped: ValidationError[] = errors.map(e => ({
          ...e,
          path: [String(index), ...e.path],
        }));
        return mapped as unknown as ValidationErrors;
      })
    )
  );

  return sequenceArray(validations);
};

/**
 * Make a validator optional
 * Allows undefined, validates if present
 */
export const optional = <A>(validator: Validator<unknown, A>) => (
  value: unknown
): ValidationResult<A | undefined> => {
  if (value === undefined) {
    return success(undefined);
  }
  return validator(value);
};

/**
 * Make a validator nullable
 * Allows null, validates if present
 */
export const nullable = <A>(validator: Validator<unknown, A>) => (
  value: unknown
): ValidationResult<A | null> => {
  if (value === null) {
    return success(null);
  }
  return validator(value);
};

/**
 * Combine validators with AND logic
 * All must pass, collects errors from ALL
 */
export const and = <A, B extends A, C extends B>(
  v1: Validator<A, B>,
  v2: Validator<B, C>
) => (value: A): ValidationResult<C> => {
  const r1 = v1(value);
  const r2 = pipe(
    r1,
    chain(v2)
  );

  // Collect errors from both if both fail
  return pipe(
    r1,
    E.match(
      (e1) =>
        pipe(
          r2,
          E.match(
            (e2) => E.left([...e1, ...e2] as ValidationErrors),
            () => E.left(e1)
          )
        ),
      () => r2
    )
  );
};

/**
 * Combine validators with OR logic
 * At least one must pass
 */
export const or = <A, B>(v1: Validator<A, B>, v2: Validator<A, B>) => (
  value: A
): ValidationResult<B> => {
  const r1 = v1(value);
  if (E.isRight(r1)) {
    return r1;
  }
  return v2(value);
};

/**
 * Refine a validator with additional checks
 * Useful for adding business logic constraints
 */
export const refine = <A, B extends A>(
  validator: Validator<unknown, A>,
  predicate: (a: A) => a is B,
  errorMessage: string
) => (value: unknown): ValidationResult<B> => {
  return pipe(
    validator(value),
    chain((a) =>
      predicate(a)
        ? success(a)
        : failure(validationError(errorMessage, [], value))
    )
  );
};

/**
 * Transform a validated value
 * Safe transformation after validation succeeds
 */
export const transform = <A, B>(
  validator: Validator<unknown, A>,
  f: (a: A) => B
) => flow(validator, map(f));

/**
 * Validation Do notation for ergonomic composition
 */
export const Do = success({});

/**
 * Bind a validation in Do notation
 */
export const bind = <A, K extends string, B>(
  key: Exclude<K, keyof A>,
  f: (a: A) => ValidationResult<B>
) => (va: ValidationResult<A>): ValidationResult<A & { [k in K]: B }> =>
  pipe(
    va,
    chain((a) =>
      pipe(
        f(a),
        map((b) => ({ ...a, [key]: b } as A & { [k in K]: B }))
      )
    )
  );

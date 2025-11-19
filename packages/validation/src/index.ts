/**
 * @djed/validation
 * Composable validation with Applicative Functor
 *
 * Category Theory Foundations:
 * - Functor: map over successful validations
 * - Applicative Functor: apply functions + accumulate ALL errors
 * - Semigroup: combine validation errors
 * - Monad: chain dependent validations
 *
 * Progressive API:
 * - L1 (Novice): Use built-in validators (email, nonEmptyString, etc.)
 * - L2 (Intermediate): Compose with struct, array, optional
 * - L3 (Expert): Custom validators, Applicative composition
 */

// Core types and functions
export {
  // Types
  ValidationError,
  ValidationErrors,
  ValidationResult,
  Validator,
  Schema,
  InferSchema,
  StructSchema,
  InferStruct,
  // Branded types
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
  // Utilities
  validationError,
  formatValidationError,
} from './types';

// Core validation functions (Applicative)
export {
  // Constructors
  success,
  failure,
  failures,
  // Functor
  map,
  // Applicative
  ap,
  // Monad
  chain,
  // Alt
  alt,
  // Bifunctor
  bimap,
  mapErrors,
  // Fold
  fold,
  getOrThrow,
  getOrElse,
  // Combinators
  struct,
  array,
  optional,
  nullable,
  and,
  or,
  refine,
  transform,
  // Traversal
  sequenceArray,
  traverseArray,
  // Do notation
  Do,
  bind,
  // Semigroup
  ValidationErrorsSemigroup,
} from './core';

// Built-in validators
export {
  // Basic types
  string,
  number,
  boolean,
  unknown,
  literal,
  // String validators
  nonEmptyString,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  uuid,
  isoDate,
  jsonString,
  // Number validators
  positiveNumber,
  nonNegativeNumber,
  integerNumber,
  min,
  max,
  port,
  // Date validators
  date,
  minDate,
  maxDate,
  // Composite validators
  enumValue,
  union,
  intersection,
  tuple,
  record,
} from './validators';

/**
 * Example usage:
 *
 * @example
 * // L1: Basic validation
 * import { email, nonEmptyString } from '@djed/validation';
 *
 * const result = email('user@example.com');
 * // Right('user@example.com')
 *
 * @example
 * // L2: Struct validation (accumulates ALL errors)
 * import { struct, email, nonEmptyString, min } from '@djed/validation';
 * import { pipe } from 'fp-ts/function';
 *
 * const validateUser = struct({
 *   name: nonEmptyString,
 *   email: email,
 *   age: pipe(number, chain(min(18)))
 * });
 *
 * const result = validateUser({
 *   name: '',
 *   email: 'invalid',
 *   age: 10
 * });
 * // Left([
 * //   { path: ['name'], message: 'String cannot be empty' },
 * //   { path: ['email'], message: 'Invalid email address' },
 * //   { path: ['age'], message: 'Number must be >= 18' }
 * // ])
 *
 * @example
 * // L3: Custom validator with Applicative
 * import { Validator, success, failure, validationError, ap, map } from '@djed/validation';
 *
 * const customValidator: Validator<unknown, MyType> = (value) => {
 *   // Custom validation logic
 *   return condition
 *     ? success(value as MyType)
 *     : failure(validationError('Custom error'));
 * };
 *
 * // Compose with Applicative
 * const composed = pipe(
 *   success((a: A) => (b: B) => combine(a, b)),
 *   ap(validatorA),
 *   ap(validatorB)
 * );
 */

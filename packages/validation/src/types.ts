/**
 * Type-level constructs for validation
 * Uses Branded Types for zero-cost type safety
 */

import * as E from 'fp-ts/Either';
import * as NEA from 'fp-ts/NonEmptyArray';

/**
 * Branded type helper for compile-time distinctions
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Validation error with path information
 * Provides context about where validation failed
 */
export interface ValidationError {
  readonly path: readonly string[];
  readonly message: string;
  readonly value?: unknown;
}

/**
 * Create a validation error
 */
export const validationError = (
  message: string,
  path: readonly string[] = [],
  value?: unknown
): ValidationError => ({
  path,
  message,
  value,
});

/**
 * Format validation error for display
 */
export const formatValidationError = (error: ValidationError): string => {
  const pathStr = error.path.length > 0 ? `${error.path.join('.')}: ` : '';
  return `${pathStr}${error.message}`;
};

/**
 * Validation errors (non-empty array)
 * Guarantees at least one error exists
 */
export type ValidationErrors = NEA.NonEmptyArray<ValidationError>;

/**
 * Validation result type - Either with non-empty errors
 * Left: At least one validation error
 * Right: Validated value of type A
 */
export type ValidationResult<A> = E.Either<ValidationErrors, A>;

/**
 * Common branded types for validated values
 */

export type NonEmptyString = Brand<string, 'NonEmptyString'>;
export type EmailAddress = Brand<string, 'EmailAddress'>;
export type URL = Brand<string, 'URL'>;
export type Port = Brand<number, 'Port'>;
export type PositiveNumber = Brand<number, 'PositiveNumber'>;
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;
export type IntegerNumber = Brand<number, 'IntegerNumber'>;
export type UUID = Brand<string, 'UUID'>;
export type ISODate = Brand<string, 'ISODate'>;
export type JSONString = Brand<string, 'JSONString'>;

/**
 * Validators return ValidationResult
 */
export type Validator<A, B = A> = (value: A) => ValidationResult<B>;

/**
 * Schema type - defines structure and validation
 */
export interface Schema<A> {
  readonly validate: Validator<unknown, A>;
  readonly optional?: boolean;
  readonly nullable?: boolean;
  readonly description?: string;
}

/**
 * Infer type from Schema
 */
export type InferSchema<S> = S extends Schema<infer A> ? A : never;

/**
 * Struct schema type for objects
 */
export type StructSchema<A> = {
  readonly [K in keyof A]: Schema<A[K]>;
};

/**
 * Extract validated type from struct schema
 */
export type InferStruct<S> = S extends StructSchema<infer A> ? A : never;

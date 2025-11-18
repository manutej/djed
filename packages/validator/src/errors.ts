/**
 * Validation error types
 */

import { JsonValue } from '@djed/shared-types/common';

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, JsonValue>;
  message?: string;
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];
  public readonly data: unknown;

  constructor(message: string, errors: ValidationErrorDetail[], data?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.data = data;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Get formatted error message with all validation errors
   */
  getFormattedMessage(): string {
    const errorMessages = this.errors.map((err) => {
      const path = err.instancePath || '/';
      const message = err.message || 'validation failed';
      return `  - ${path}: ${message}`;
    });

    return `${this.message}\n${errorMessages.join('\n')}`;
  }

  /**
   * Get errors grouped by path
   */
  getErrorsByPath(): Map<string, ValidationErrorDetail[]> {
    const grouped = new Map<string, ValidationErrorDetail[]>();

    for (const error of this.errors) {
      const path = error.instancePath || '/';
      const existing = grouped.get(path) ?? [];
      existing.push(error);
      grouped.set(path, existing);
    }

    return grouped;
  }

  /**
   * Check if error exists for specific path
   */
  hasErrorForPath(path: string): boolean {
    return this.errors.some((err) => err.instancePath === path);
  }
}

/**
 * Schema compilation error
 */
export class SchemaCompilationError extends Error {
  constructor(message: string, public readonly schema: JsonValue) {
    super(message);
    this.name = 'SchemaCompilationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaCompilationError);
    }
  }
}

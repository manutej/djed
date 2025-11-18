/**
 * JSON schema validator implementation
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';
import { JsonValue, Result } from '@djed/shared-types/common';
import { ValidationError, ValidationErrorDetail, SchemaCompilationError } from './errors.js';

/**
 * Validator configuration
 */
export interface ValidatorConfig {
  /**
   * Allow additional properties not defined in schema (default: false)
   */
  additionalProperties?: boolean;

  /**
   * Remove additional properties instead of failing (default: false)
   */
  removeAdditional?: boolean | 'all' | 'failing';

  /**
   * Coerce types (e.g., string "123" to number 123) (default: false)
   */
  coerceTypes?: boolean | 'array';

  /**
   * Use defaults from schema (default: true)
   */
  useDefaults?: boolean;

  /**
   * Validate all errors instead of failing on first (default: true)
   */
  allErrors?: boolean;

  /**
   * Strict mode (default: true)
   */
  strict?: boolean;
}

/**
 * DjedValidator - JSON schema validation
 */
export class DjedValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;

  constructor(config: ValidatorConfig = {}) {
    this.ajv = new Ajv({
      additionalProperties: config.additionalProperties ?? false,
      removeAdditional: config.removeAdditional ?? false,
      coerceTypes: config.coerceTypes ?? false,
      useDefaults: config.useDefaults ?? true,
      allErrors: config.allErrors ?? true,
      strict: config.strict ?? true,
      validateFormats: true,
    });

    // Add format validators (email, url, uuid, etc.)
    addFormats(this.ajv);

    // Add custom error messages support
    ajvErrors(this.ajv);

    this.validators = new Map();
  }

  /**
   * Compile and cache a schema
   */
  compile(schemaId: string, schema: JsonValue): void {
    try {
      const validate = this.ajv.compile(schema);
      this.validators.set(schemaId, validate);
    } catch (error) {
      throw new SchemaCompilationError(
        `Failed to compile schema '${schemaId}': ${error instanceof Error ? error.message : String(error)}`,
        schema
      );
    }
  }

  /**
   * Validate data against a compiled schema
   */
  validate<T = unknown>(schemaId: string, data: unknown): Result<T, ValidationError> {
    const validate = this.validators.get(schemaId);

    if (!validate) {
      throw new Error(`Schema '${schemaId}' not found. Did you forget to compile it?`);
    }

    const valid = validate(data);

    if (valid) {
      return { success: true, data: data as T };
    }

    const errors = this.formatErrors(validate.errors ?? []);
    return {
      success: false,
      error: new ValidationError(`Validation failed for schema '${schemaId}'`, errors, data),
    };
  }

  /**
   * Validate data against a schema (without pre-compilation)
   */
  validateSchema<T = unknown>(schema: JsonValue, data: unknown): Result<T, ValidationError> {
    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (valid) {
        return { success: true, data: data as T };
      }

      const errors = this.formatErrors(validate.errors ?? []);
      return {
        success: false,
        error: new ValidationError('Validation failed', errors, data),
      };
    } catch (error) {
      throw new SchemaCompilationError(
        `Failed to compile schema: ${error instanceof Error ? error.message : String(error)}`,
        schema
      );
    }
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow<T = unknown>(schemaId: string, data: unknown): T {
    const result = this.validate<T>(schemaId, data);

    if (result.success) {
      return result.data;
    }

    throw result.error;
  }

  /**
   * Add a custom format validator
   */
  addFormat(name: string, validator: string | RegExp | ((data: string) => boolean)): void {
    this.ajv.addFormat(name, validator);
  }

  /**
   * Add a custom keyword
   */
  addKeyword(
    keyword: string,
    definition: {
      validate: (schema: unknown, data: unknown) => boolean;
      errors?: boolean;
    }
  ): void {
    this.ajv.addKeyword({
      keyword,
      validate: definition.validate,
      errors: definition.errors ?? true,
    });
  }

  /**
   * Remove a compiled schema
   */
  removeSchema(schemaId: string): boolean {
    return this.validators.delete(schemaId);
  }

  /**
   * Clear all compiled schemas
   */
  clearSchemas(): void {
    this.validators.clear();
  }

  /**
   * Get the underlying Ajv instance
   */
  getAjv(): Ajv {
    return this.ajv;
  }

  /**
   * Format Ajv errors
   */
  private formatErrors(errors: ErrorObject[]): ValidationErrorDetail[] {
    return errors.map((error) => ({
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      keyword: error.keyword,
      params: error.params as Record<string, JsonValue>,
      message: error.message,
    }));
  }
}

/**
 * Create a validator instance
 */
export function createValidator(config?: ValidatorConfig): DjedValidator {
  return new DjedValidator(config);
}

/**
 * Create a validator with strict defaults
 */
export function createStrictValidator(): DjedValidator {
  return new DjedValidator({
    additionalProperties: false,
    removeAdditional: false,
    coerceTypes: false,
    useDefaults: true,
    allErrors: true,
    strict: true,
  });
}

/**
 * Create a validator with lenient defaults
 */
export function createLenientValidator(): DjedValidator {
  return new DjedValidator({
    additionalProperties: true,
    removeAdditional: false,
    coerceTypes: true,
    useDefaults: true,
    allErrors: true,
    strict: false,
  });
}

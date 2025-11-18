/**
 * Common JSON schemas
 */

import { JsonValue } from '@djed/shared-types/common';

/**
 * Email schema
 */
export const emailSchema: JsonValue = {
  type: 'string',
  format: 'email',
};

/**
 * URL schema
 */
export const urlSchema: JsonValue = {
  type: 'string',
  format: 'uri',
};

/**
 * UUID schema
 */
export const uuidSchema: JsonValue = {
  type: 'string',
  format: 'uuid',
};

/**
 * ISO date-time schema
 */
export const dateTimeSchema: JsonValue = {
  type: 'string',
  format: 'date-time',
};

/**
 * ISO date schema
 */
export const dateSchema: JsonValue = {
  type: 'string',
  format: 'date',
};

/**
 * Positive integer schema
 */
export const positiveIntegerSchema: JsonValue = {
  type: 'integer',
  minimum: 1,
};

/**
 * Non-negative integer schema
 */
export const nonNegativeIntegerSchema: JsonValue = {
  type: 'integer',
  minimum: 0,
};

/**
 * Port number schema
 */
export const portSchema: JsonValue = {
  type: 'integer',
  minimum: 1,
  maximum: 65535,
};

/**
 * Non-empty string schema
 */
export const nonEmptyStringSchema: JsonValue = {
  type: 'string',
  minLength: 1,
};

/**
 * Enum schema builder
 */
export function enumSchema(values: string[]): JsonValue {
  return {
    type: 'string',
    enum: values,
  };
}

/**
 * Array schema builder
 */
export function arraySchema(itemSchema: JsonValue, minItems = 0, maxItems?: number): JsonValue {
  const schema: Record<string, JsonValue> = {
    type: 'array',
    items: itemSchema,
    minItems,
  };

  if (maxItems !== undefined) {
    schema.maxItems = maxItems;
  }

  return schema;
}

/**
 * Object schema builder
 */
export function objectSchema(
  properties: Record<string, JsonValue>,
  required?: string[],
  additionalProperties = false
): JsonValue {
  const schema: Record<string, JsonValue> = {
    type: 'object',
    properties,
    additionalProperties,
  };

  if (required && required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * OneOf schema builder
 */
export function oneOfSchema(...schemas: JsonValue[]): JsonValue {
  return {
    oneOf: schemas,
  };
}

/**
 * AllOf schema builder (intersection)
 */
export function allOfSchema(...schemas: JsonValue[]): JsonValue {
  return {
    allOf: schemas,
  };
}

/**
 * AnyOf schema builder (union)
 */
export function anyOfSchema(...schemas: JsonValue[]): JsonValue {
  return {
    anyOf: schemas,
  };
}

/**
 * Nullable schema builder
 */
export function nullableSchema(schema: JsonValue): JsonValue {
  return anyOfSchema(schema, { type: 'null' });
}

/**
 * Optional schema builder
 */
export function optionalSchema(schema: JsonValue): JsonValue {
  return {
    ...schema,
    nullable: true,
  };
}

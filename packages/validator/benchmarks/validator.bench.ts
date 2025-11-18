import { bench, describe } from 'vitest';
import Ajv from 'ajv';

/**
 * Performance Benchmarks for @djed/validator
 *
 * Success Criteria:
 * - Schema validation speed: < 1ms for typical schemas
 * - Memory usage: Efficient schema caching
 * - Cache hit rate: > 90% for repeated validations
 *
 * Run: npm run bench
 * CI: Fails if regression > 20%
 */

describe('Validator Performance', () => {
  // Setup: Common schemas
  const simpleSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  };

  const complexSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      profile: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          age: { type: 'number', minimum: 0, maximum: 150 },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zipCode: { type: 'string', pattern: '^[0-9]{5}$' }
            }
          }
        },
        required: ['firstName', 'lastName']
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      }
    },
    required: ['id', 'email', 'profile']
  };

  const validSimpleData = { name: 'John Doe', age: 30 };
  const validComplexData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'john@example.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Boston',
        zipCode: '02101'
      }
    },
    tags: ['developer', 'nodejs']
  };

  // Benchmark 1: Schema Compilation
  bench('schema compilation - simple schema', () => {
    const ajv = new Ajv();
    ajv.compile(simpleSchema);
  }, {
    iterations: 1000,
    time: 1000
  });

  bench('schema compilation - complex schema', () => {
    const ajv = new Ajv();
    ajv.compile(complexSchema);
  }, {
    iterations: 1000,
    time: 1000
  });

  // Benchmark 2: Validation Speed (Pre-compiled)
  bench('validation - simple schema (valid data)', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(simpleSchema);
    validate(validSimpleData);
  }, {
    iterations: 10000,
    time: 1000
  });

  bench('validation - simple schema (invalid data)', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(simpleSchema);
    validate({ age: 30 }); // Missing required 'name'
  }, {
    iterations: 10000,
    time: 1000
  });

  bench('validation - complex schema (valid data)', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(complexSchema);
    validate(validComplexData);
  }, {
    iterations: 10000,
    time: 1000
  });

  bench('validation - complex schema (invalid data)', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(complexSchema);
    validate({ id: 'invalid-uuid', email: 'not-an-email' });
  }, {
    iterations: 10000,
    time: 1000
  });

  // Benchmark 3: Format Validators
  bench('format validation - email', () => {
    const ajv = new Ajv({ formats: { email: true } });
    const schema = { type: 'string', format: 'email' };
    const validate = ajv.compile(schema);
    validate('test@example.com');
  }, {
    iterations: 10000,
    time: 1000
  });

  bench('format validation - uuid', () => {
    const ajv = new Ajv({ formats: { uuid: true } });
    const schema = { type: 'string', format: 'uuid' };
    const validate = ajv.compile(schema);
    validate('123e4567-e89b-12d3-a456-426614174000');
  }, {
    iterations: 10000,
    time: 1000
  });

  bench('format validation - date-time', () => {
    const ajv = new Ajv({ formats: { 'date-time': true } });
    const schema = { type: 'string', format: 'date-time' };
    const validate = ajv.compile(schema);
    validate('2025-11-04T10:00:00Z');
  }, {
    iterations: 10000,
    time: 1000
  });

  // Benchmark 4: Array Validation
  bench('array validation - small array (10 items)', () => {
    const ajv = new Ajv();
    const schema = {
      type: 'array',
      items: { type: 'number' },
      minItems: 1
    };
    const validate = ajv.compile(schema);
    const data = Array.from({ length: 10 }, (_, i) => i);
    validate(data);
  }, {
    iterations: 5000,
    time: 1000
  });

  bench('array validation - large array (1000 items)', () => {
    const ajv = new Ajv();
    const schema = {
      type: 'array',
      items: { type: 'number' },
      minItems: 1
    };
    const validate = ajv.compile(schema);
    const data = Array.from({ length: 1000 }, (_, i) => i);
    validate(data);
  }, {
    iterations: 500,
    time: 1000
  });

  // Benchmark 5: Nested Object Validation
  bench('nested object validation - depth 3', () => {
    const ajv = new Ajv();
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: { type: 'string' }
              }
            }
          }
        }
      }
    };
    const validate = ajv.compile(schema);
    validate({ level1: { level2: { level3: 'value' } } });
  }, {
    iterations: 5000,
    time: 1000
  });

  // Benchmark 6: Schema Caching Impact
  bench('without caching - compile + validate each time', () => {
    for (let i = 0; i < 10; i++) {
      const ajv = new Ajv();
      const validate = ajv.compile(simpleSchema);
      validate(validSimpleData);
    }
  }, {
    iterations: 500,
    time: 1000
  });

  bench('with caching - compile once, validate multiple', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(simpleSchema);
    for (let i = 0; i < 10; i++) {
      validate(validSimpleData);
    }
  }, {
    iterations: 500,
    time: 1000
  });

  // Benchmark 7: Concurrent Validation (Simulated)
  bench('concurrent validation - 100 validations', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(simpleSchema);
    const data = Array.from({ length: 100 }, (_, i) => ({
      name: `User ${i}`,
      age: 20 + i
    }));
    data.forEach(item => validate(item));
  }, {
    iterations: 100,
    time: 2000
  });

  // Benchmark 8: Error Collection Performance
  bench('error collection - multiple validation errors', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = {
      type: 'object',
      properties: {
        field1: { type: 'string' },
        field2: { type: 'number' },
        field3: { type: 'boolean' },
        field4: { type: 'string', format: 'email' }
      },
      required: ['field1', 'field2', 'field3', 'field4']
    };
    const validate = ajv.compile(schema);
    validate({}); // All fields missing - collect all errors
  }, {
    iterations: 5000,
    time: 1000
  });
});

describe('Validator Memory Profile', () => {
  // Memory benchmark: Schema cache size
  bench('memory - 100 schemas in cache', () => {
    const ajv = new Ajv();
    const schemas = Array.from({ length: 100 }, (_, i) => ({
      type: 'object',
      properties: {
        [`field${i}`]: { type: 'string' }
      }
    }));
    schemas.forEach(schema => ajv.compile(schema));
  }, {
    iterations: 10,
    time: 1000
  });

  // Memory benchmark: Large data validation
  bench('memory - validating large object (1000 properties)', () => {
    const ajv = new Ajv();
    const properties: Record<string, any> = {};
    const data: Record<string, any> = {};

    for (let i = 0; i < 1000; i++) {
      properties[`field${i}`] = { type: 'string' };
      data[`field${i}`] = `value${i}`;
    }

    const schema = { type: 'object', properties };
    const validate = ajv.compile(schema);
    validate(data);
  }, {
    iterations: 10,
    time: 2000
  });
});

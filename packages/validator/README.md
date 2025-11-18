# @djed/validator

JSON schema validation for LUXOR projects using Ajv.

## Features

- **JSON Schema**: Industry-standard validation with JSON Schema draft-07
- **Type-Safe**: Full TypeScript support with type inference
- **Rich Formats**: Email, URL, UUID, date-time, and more
- **Custom Validation**: Add custom formats and keywords
- **Error Details**: Comprehensive error messages with paths
- **Performance**: Compiled schemas for fast validation
- **Common Schemas**: Pre-built schemas for common use cases

## Installation

```bash
npm install @djed/validator
```

## Quick Start

```typescript
import { createValidator, objectSchema, nonEmptyStringSchema } from '@djed/validator';

// Create a validator
const validator = createValidator();

// Define a schema
const userSchema = objectSchema(
  {
    name: nonEmptyStringSchema,
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0 },
  },
  ['name', 'email'] // required fields
);

// Compile the schema
validator.compile('user', userSchema);

// Validate data
const result = validator.validate('user', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation errors:', result.error.errors);
}
```

## Usage

### Creating a Validator

```typescript
import { createValidator, createStrictValidator, createLenientValidator } from '@djed/validator';

// Default validator
const validator = createValidator();

// Strict validator (no additional properties, strict types)
const strictValidator = createStrictValidator();

// Lenient validator (allows additional properties, coerces types)
const lenientValidator = createLenientValidator();

// Custom configuration
const customValidator = createValidator({
  additionalProperties: false,
  coerceTypes: true,
  allErrors: true,
});
```

### Compiling Schemas

Pre-compile schemas for better performance:

```typescript
import { objectSchema, emailSchema } from '@djed/validator';

// Define schemas
const schemas = {
  user: objectSchema(
    {
      id: { type: 'string', format: 'uuid' },
      email: emailSchema,
      name: { type: 'string', minLength: 1 },
    },
    ['id', 'email', 'name']
  ),

  config: objectSchema({
    port: { type: 'integer', minimum: 1, maximum: 65535 },
    host: { type: 'string' },
    ssl: { type: 'boolean' },
  }),
};

// Compile all schemas
for (const [id, schema] of Object.entries(schemas)) {
  validator.compile(id, schema);
}
```

### Validating Data

```typescript
// Using compiled schema
const result = validator.validate('user', userData);

if (result.success) {
  // Type-safe access to validated data
  const user: User = result.data;
} else {
  // Handle validation errors
  console.error(result.error.getFormattedMessage());
}

// Validate without pre-compilation (slower)
const result2 = validator.validateSchema(userSchema, userData);

// Validate and throw on error
try {
  const user = validator.validateOrThrow<User>('user', userData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.getFormattedMessage());
  }
}
```

### Error Handling

```typescript
import { ValidationError } from '@djed/validator';

const result = validator.validate('user', invalidData);

if (!result.success) {
  const error = result.error;

  // Get all errors
  console.log(error.errors);
  // [
  //   {
  //     instancePath: '/email',
  //     schemaPath: '#/properties/email/format',
  //     keyword: 'format',
  //     params: { format: 'email' },
  //     message: 'must match format "email"'
  //   }
  // ]

  // Get formatted message
  console.log(error.getFormattedMessage());
  // Validation failed for schema 'user'
  //   - /email: must match format "email"

  // Get errors by path
  const errorsByPath = error.getErrorsByPath();
  const emailErrors = errorsByPath.get('/email');

  // Check if specific path has errors
  if (error.hasErrorForPath('/email')) {
    console.log('Email is invalid');
  }
}
```

## Common Schemas

Pre-built schemas for common use cases:

```typescript
import {
  emailSchema,
  urlSchema,
  uuidSchema,
  dateTimeSchema,
  portSchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
} from '@djed/validator';

const schema = objectSchema({
  email: emailSchema, // Valid email address
  website: urlSchema, // Valid URL
  id: uuidSchema, // Valid UUID
  createdAt: dateTimeSchema, // ISO 8601 date-time
  port: portSchema, // Port number (1-65535)
  name: nonEmptyStringSchema, // Non-empty string
  count: positiveIntegerSchema, // Positive integer
});
```

## Schema Builders

Utility functions for building complex schemas:

```typescript
import {
  objectSchema,
  arraySchema,
  enumSchema,
  oneOfSchema,
  allOfSchema,
  nullableSchema,
} from '@djed/validator';

// Enum
const roleSchema = enumSchema(['admin', 'user', 'guest']);

// Array
const tagsSchema = arraySchema({ type: 'string' }, 1, 10); // 1-10 strings

// Object
const userSchema = objectSchema(
  {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
  ['name'], // required fields
  false // no additional properties
);

// One of (union)
const idSchema = oneOfSchema({ type: 'string', format: 'uuid' }, { type: 'integer' });

// All of (intersection)
const extendedUserSchema = allOfSchema(userSchema, {
  type: 'object',
  properties: { role: roleSchema },
});

// Nullable
const optionalNameSchema = nullableSchema({ type: 'string' });
```

## Custom Formats

Add custom format validators:

```typescript
// Add a custom format
validator.addFormat('username', /^[a-z0-9_-]{3,16}$/);

// Use the format
const schema = objectSchema({
  username: { type: 'string', format: 'username' },
});

// With custom validation function
validator.addFormat('phone', (value: string) => {
  return /^\+?[1-9]\d{1,14}$/.test(value);
});
```

## Custom Keywords

Add custom validation keywords:

```typescript
// Add a custom keyword
validator.addKeyword('isEven', {
  validate: (schema: unknown, data: unknown) => {
    if (typeof data !== 'number') return false;
    return data % 2 === 0;
  },
  errors: true,
});

// Use the keyword
const schema = {
  type: 'object',
  properties: {
    evenNumber: { type: 'integer', isEven: true },
  },
};
```

## Configuration Options

```typescript
interface ValidatorConfig {
  additionalProperties?: boolean; // Allow extra properties (default: false)
  removeAdditional?: boolean | 'all' | 'failing'; // Remove extra properties
  coerceTypes?: boolean | 'array'; // Coerce types (e.g., "123" -> 123)
  useDefaults?: boolean; // Apply default values from schema (default: true)
  allErrors?: boolean; // Collect all errors (default: true)
  strict?: boolean; // Strict mode (default: true)
}
```

## Best Practices

1. **Pre-compile schemas**: Compile schemas once at startup
   ```typescript
   validator.compile('user', userSchema);
   ```

2. **Use Result type**: Prefer Result pattern over exceptions
   ```typescript
   const result = validator.validate('user', data);
   if (result.success) {
     // Use result.data
   }
   ```

3. **Type assertions**: Use TypeScript generics for type safety
   ```typescript
   const result = validator.validate<User>('user', data);
   ```

4. **Reuse validators**: Create one validator and compile multiple schemas
   ```typescript
   const validator = createValidator();
   validator.compile('user', userSchema);
   validator.compile('config', configSchema);
   ```

5. **Schema composition**: Use builders to compose complex schemas
   ```typescript
   const baseSchema = objectSchema({ id: uuidSchema });
   const extendedSchema = allOfSchema(baseSchema, {
     type: 'object',
     properties: { name: nonEmptyStringSchema },
   });
   ```

## Integration with MCP Servers

Perfect for validating MCP tool arguments:

```typescript
import { McpServer } from '@djed/mcp-base';
import { createValidator, objectSchema } from '@djed/validator';

class MyServer extends McpServer {
  private validator = createValidator();

  constructor() {
    super();

    // Compile schemas for tool arguments
    this.validator.compile(
      'calculateArgs',
      objectSchema(
        {
          operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
          a: { type: 'number' },
          b: { type: 'number' },
        },
        ['operation', 'a', 'b']
      )
    );
  }

  async handleToolCall(name: string, args: Record<string, unknown>) {
    if (name === 'calculate') {
      const result = this.validator.validate('calculateArgs', args);

      if (!result.success) {
        throw new Error(result.error.getFormattedMessage());
      }

      // Type-safe access to validated arguments
      const { operation, a, b } = result.data;
      // ...
    }
  }
}
```

## Replacing This Package

**Zero lock-in promise**: You can eject from `@djed/validator` anytime.

### Quick Ejection (Automated)

```bash
djed eject validator
```

The CLI will:
- Uninstall @djed/validator
- Install ajv and ajv-formats
- Generate EJECT-VALIDATOR.md migration guide
- Provide step-by-step instructions

**Time**: ~3 minutes (automated)

### Manual Ejection

**1. Install Ajv:**
```bash
npm uninstall @djed/validator
npm install ajv ajv-formats
```

**2. Replace imports:**
```typescript
// Before
import { createValidator } from '@djed/validator';

// After
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
```

**3. Replace initialization:**
```typescript
// Before
const validator = createValidator();

// After
const ajv = new Ajv();
addFormats(ajv);
```

**4. Replace validation:**
```typescript
// Before
validator.compile('user', schema);
const result = validator.validate('user', data);

// After
const validate = ajv.compile(schema);
const valid = validate(data);
if (!valid) {
  console.error(validate.errors);
}
```

**Time**: ~20 minutes (manual)

### Alternative Libraries

| Library | Use Case | Compatibility |
|---------|----------|---------------|
| **Ajv** (recommended) | JSON Schema, performance-focused | ⭐⭐⭐ |
| **Joi** | Object schema, developer-friendly | ⭐⭐ |
| **Yup** | Similar to Joi, React integration | ⭐⭐ |
| **Zod** | TypeScript-first, type inference | ⭐⭐ |

### Migration Checklist

- [ ] Install ajv and ajv-formats
- [ ] Update all imports
- [ ] Replace validator initialization
- [ ] Update schema compilation pattern
- [ ] Update validation calls
- [ ] Update error handling (Ajv error format differs)
- [ ] Run tests (`npm test`)
- [ ] Verify validation behavior

**Comprehensive Guide**: See [docs/EJECTION-GUIDE.md](../../docs/EJECTION-GUIDE.md) for detailed instructions

## License

MIT

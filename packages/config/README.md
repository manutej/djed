# @djed/config

Configuration management with Reader monad for dependency injection.

## Overview

`@djed/config` provides a pure functional approach to configuration management using the Reader monad pattern. It enables type-safe, composable, and testable configuration with support for validation, defaults, hot reload, and secret management.

## Features

- **Reader Monad**: Dependency injection pattern for composable configuration
- **Type Safety**: Branded types for validated configuration values
- **Schema Validation**: Integration with `@djed/validation` for type-safe validation
- **Monoid Defaults**: Composable defaults using Monoid pattern
- **Hot Reload**: Watch configuration files for changes
- **Secret Management**: Pluggable secret backends (env, files, external services)
- **Progressive API**: Three levels of complexity to match your needs
- **100% Pure**: All functions are pure except at I/O boundaries

## Installation

```bash
npm install @djed/config fp-ts
```

## Category Theory Foundations

### Reader Monad
The Reader monad provides dependency injection without impure effects:

```typescript
type ConfigReader<A> = Reader<ConfigEnv, ConfigResult<A>>
```

- **Environment**: `ConfigEnv` provides access to environment variables, files, secrets
- **Computation**: `ConfigReader<A>` is a computation that needs the environment to produce `A`
- **Composition**: Chain multiple readers with monad operations

### Monoid
Monoid pattern allows combining configurations with associative operation and identity:

```typescript
const config = mergeConfigs(defaults, userConfig, envConfig);
```

### Either
Error handling with `Either<ConfigError, A>` ensures all errors are explicit and typed.

## Quick Start

### L1: Simple Configuration Loading

Load configuration from environment variables:

```typescript
import { fromEnv, run, fromProcessEnv } from '@djed/config';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

// Load DATABASE_URL from environment
const config = pipe(
  fromEnv('DATABASE_URL'),
  run(fromProcessEnv())
);

// Result: Either<ConfigError, string>
if (E.isRight(config)) {
  console.log('Database URL:', config.right);
} else {
  console.error('Error:', config.left.message);
}
```

### L2: Schema Validation with Defaults

Use schemas for validation and provide defaults:

```typescript
import { fromSchemaWithDefaults, struct, run, fromProcessEnv } from '@djed/config';
import { nonEmptyString, port } from '@djed/validation';
import { pipe } from 'fp-ts/function';

// Define schema
const dbSchema = {
  validate: struct({
    host: nonEmptyString,
    port: port,
    database: nonEmptyString,
  }),
  default: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
  },
};

// Load with defaults
const config = pipe(
  fromSchemaWithDefaults(dbSchema, { type: 'env', key: 'DB_CONFIG' }),
  run(fromProcessEnv())
);
```

### L3: Full Reader Composition

Compose complex configurations using Reader monad:

```typescript
import {
  Do,
  bind,
  fromEnv,
  fromEnvOptional,
  map,
  run,
  fromProcessEnv,
} from '@djed/config';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';

// Compose configuration with dependencies
const appConfig = pipe(
  Do,
  bind('environment', () => fromEnv('NODE_ENV')),
  bind('port', () =>
    pipe(
      fromEnvOptional('PORT'),
      map(O.map(parseInt)),
      map(O.getOrElse(() => 3000))
    )
  ),
  bind('database', ({ environment }) =>
    fromEnv(environment === 'production' ? 'PROD_DB' : 'DEV_DB')
  ),
  bind('logLevel', ({ environment }) =>
    fromLiteral(environment === 'production' ? 'error' : 'debug')
  )
);

const config = run(fromProcessEnv())(appConfig);
```

## Core Concepts

### ConfigEnv - The Environment

`ConfigEnv` provides access to configuration sources:

```typescript
interface ConfigEnv {
  readonly getEnvVar: (key: string) => Option<string>;
  readonly readFile: (path: string) => Either<Error, string>;
  readonly secrets?: SecretManager;
}
```

Create environments:

```typescript
// From process.env
const env = fromProcessEnv();

// From custom object (testing)
const env = fromCustomEnv({
  DATABASE_URL: 'postgres://localhost/test',
  PORT: '3000',
});

// With secret manager
const env = fromEnvWithSecrets(secretManager);
```

### ConfigReader - The Computation

`ConfigReader<A>` is a computation that produces `A` given a `ConfigEnv`:

```typescript
type ConfigReader<A> = Reader<ConfigEnv, ConfigResult<A>>
```

Operations:
- **success**: Lift a value into ConfigReader
- **failure**: Lift an error into ConfigReader
- **map**: Transform the success value (Functor)
- **chain**: Sequence dependent computations (Monad)
- **ap**: Apply function in context (Applicative)
- **alt**: Try alternative on failure

### Running Configuration

Execute a ConfigReader with an environment:

```typescript
// Get Either<ConfigError, A>
const result: ConfigResult<A> = run(env)(reader);

// Get A or throw
const value: A = runOrThrow(env)(reader);

// Get A or default
const value: A = pipe(reader, getOrElse(defaultValue), R.run(env));
```

## Configuration Sources

### Environment Variables

```typescript
// Required environment variable
const dbUrl = fromEnv('DATABASE_URL');

// Optional environment variable
const port = fromEnvOptional('PORT');

// Parse environment variables
import { parseEnvInt, parseEnvBoolean, parseEnvJSON } from '@djed/config';

const portReader = pipe(
  fromEnv('PORT'),
  chain(value =>
    pipe(
      parseEnvInt(value),
      O.match(
        () => failure(configError('parse', 'PORT must be a number')),
        success
      )
    )
  )
);
```

### File-based Configuration

```typescript
// Load from JSON file
const config = fromSource({
  type: 'file',
  path: './config.json',
  format: 'json',
});

// Discover config file
import { findConfigFile, loadConfigFile } from '@djed/config';

const configPath = findConfigFile([process.cwd(), '/etc/myapp']);
```

### Literal Values

```typescript
// Use literal value
const config = fromLiteral({
  timeout: 5000,
  retries: 3,
});
```

## Validation

Integrate with `@djed/validation` for type-safe validation:

```typescript
import { struct, nonEmptyString, email, port } from '@djed/validation';
import { validate, fromEnv } from '@djed/config';
import { pipe } from 'fp-ts/function';

const configReader = pipe(
  fromEnv('APP_CONFIG'),
  validate(struct({
    name: nonEmptyString,
    email: email,
    port: port,
  }))
);
```

## Defaults and Merging

Use Monoid to combine configurations:

```typescript
import { mergeConfigs, withDefaults } from '@djed/config';

// Merge multiple configs (right-most wins)
const config = mergeConfigs(
  baseConfig,
  environmentConfig,
  userConfig
);

// Apply defaults
const configWithDefaults = pipe(
  loadedConfig,
  map(withDefaults({
    host: 'localhost',
    port: 3000,
    timeout: 5000,
  }))
);
```

## Struct Configuration

Compose multiple config readers:

```typescript
const appConfig = struct({
  database: pipe(
    fromEnv('DATABASE_URL'),
    validate(nonEmptyString)
  ),
  redis: struct({
    host: fromEnv('REDIS_HOST'),
    port: pipe(
      fromEnv('REDIS_PORT'),
      validate(port)
    ),
  }),
  features: fromLiteral({
    enableCache: true,
    enableMetrics: false,
  }),
});
```

## Hot Reload

Watch configuration files for changes:

```typescript
import { watchConfig } from '@djed/config';

// Setup watcher
const watcher = watchConfig(
  './config.json',
  (newConfig) => {
    console.log('Configuration reloaded:', newConfig);
    // Update application config
  },
  1000 // 1 second debounce
);

// Later: stop watching
watcher.stop();
```

## Secret Management

Multiple secret backends:

```typescript
import {
  createMemorySecretManager,
  createEnvSecretManager,
  createFileSecretManager,
} from '@djed/config';

// In-memory (testing)
const secretManager = createMemorySecretManager({
  API_KEY: 'secret-key-123',
  DB_PASSWORD: 'super-secret',
});

// From environment with prefix
const secretManager = createEnvSecretManager('SECRET_');

// From files (Docker secrets, Kubernetes)
const secretManager = createFileSecretManager('/run/secrets');

// Use in configuration
const env = fromEnvWithSecrets(secretManager);
```

## Branded Types

Zero-cost type safety with branded types:

```typescript
import type { ValidatedConfig, EnvVar, SecretValue } from '@djed/config';

// Validated configuration is branded
type AppConfig = ValidatedConfig<{
  host: string;
  port: number;
}>;

// Functions can require validated config
function startServer(config: ValidatedConfig<ServerConfig>) {
  // config is guaranteed to be validated
}
```

## Testing

Pure functions make testing easy:

```typescript
import { fromCustomEnv } from '@djed/config';
import { describe, it, expect } from 'vitest';

describe('Configuration', () => {
  it('loads from custom environment', () => {
    const testEnv = fromCustomEnv({
      DATABASE_URL: 'postgres://localhost/test',
    });

    const result = run(testEnv)(myConfigReader);

    expect(E.isRight(result)).toBe(true);
  });
});
```

## Error Handling

All errors are typed and explicit:

```typescript
interface ConfigError {
  readonly type: 'missing' | 'validation' | 'parse' | 'io';
  readonly message: string;
  readonly path?: readonly string[];
  readonly cause?: unknown;
}

// Handle errors with fold
const result = pipe(
  configReader,
  fold(
    (error) => {
      console.error(`Config error [${error.type}]: ${error.message}`);
      return defaultConfig;
    },
    (config) => config
  ),
  R.run(env)
);
```

## Progressive Complexity

### L1: Novice
- Use `fromEnv`, `fromFile`, `fromLiteral`
- Run with `run(fromProcessEnv())`
- Basic error handling with `E.match`

### L2: Intermediate
- Use `struct` for object configs
- Apply validation with `validate` and schemas
- Use `withDefaults` for default values
- Handle optional values with `fromEnvOptional`

### L3: Expert
- Compose with Reader monad operations
- Use Do notation for dependent configs
- Implement custom loaders
- Create custom secret managers
- Use hot reload for dynamic configs

## API Reference

### Core Functions

- `success<A>(value: A): ConfigReader<A>` - Lift value into ConfigReader
- `failure(error: ConfigError): ConfigReader<never>` - Lift error
- `map<A, B>(f: (a: A) => B): (fa: ConfigReader<A>) => ConfigReader<B>` - Functor map
- `chain<A, B>(f: (a: A) => ConfigReader<B>): (fa: ConfigReader<A>) => ConfigReader<B>` - Monadic bind
- `ap<A, B>(fab: ConfigReader<(a: A) => B>): (fa: ConfigReader<A>) => ConfigReader<B>` - Applicative apply
- `alt<A>(second: () => ConfigReader<A>): (first: ConfigReader<A>) => ConfigReader<A>` - Alternative
- `run<A>(env: ConfigEnv): (reader: ConfigReader<A>) => ConfigResult<A>` - Execute reader

### Loaders

- `fromEnv(key: string): ConfigReader<string>` - Load from environment
- `fromEnvOptional(key: string): ConfigReader<Option<string>>` - Optional env var
- `fromFile(path: string): ConfigReader<string>` - Load from file
- `fromLiteral<A>(value: A): ConfigReader<A>` - Use literal value
- `fromSource(source: ConfigSource): ConfigReader<unknown>` - Load from source

### Validation

- `validate<A, B>(validator: Validator<A, B>): (fa: ConfigReader<A>) => ConfigReader<B>` - Apply validator
- `fromSchema<A>(schema: ConfigSchema<A>, source: ConfigSource): ConfigReader<ValidatedConfig<A>>` - Load with schema
- `fromSchemaWithDefaults<A>(schema: ConfigSchema<A>, source: ConfigSource): ConfigReader<ValidatedConfig<A>>` - With defaults

### Struct

- `struct<A>(readers: { [K in keyof A]: ConfigReader<A[K]> }): ConfigReader<A>` - Combine readers

### Do Notation

- `Do: ConfigReader<{}>` - Start Do notation
- `bind<A, K, B>(key: K, f: (a: A) => ConfigReader<B>): (fa: ConfigReader<A>) => ConfigReader<A & { [k in K]: B }>` - Bind in Do

### Environment

- `fromProcessEnv(): ConfigEnv` - Create from process.env
- `fromCustomEnv(env: Record<string, string>): ConfigEnv` - Create from object
- `fromEnvWithSecrets(secretManager: SecretManager): ConfigEnv` - With secrets

## Best Practices

1. **Use branded types** for validated configuration
2. **Provide defaults** for optional configuration
3. **Validate early** using schemas
4. **Compose readers** instead of loading individually
5. **Test with custom environments** for predictable tests
6. **Use Do notation** for dependent configuration
7. **Handle errors explicitly** with fold or match
8. **Separate concerns**: loaders, validation, business logic

## License

MIT

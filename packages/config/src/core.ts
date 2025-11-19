/**
 * Core configuration with Reader monad for dependency injection
 *
 * Category Theory:
 * - Reader monad: dependency injection pattern
 * - Monoid: combining defaults and configuration
 * - Either: error handling
 * - Option: optional values
 */

import * as R from 'fp-ts/Reader';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as M from 'fp-ts/Monoid';
import { pipe, flow } from 'fp-ts/function';
import type { ValidationResult } from '@djed/validation';
import {
  ConfigEnv,
  ConfigError,
  ConfigResult,
  ConfigSchema,
  ConfigSource,
  ValidatedConfig,
  configError,
  InferConfig,
} from './types';

/**
 * Config Reader type - wraps computation that needs ConfigEnv
 * This is the core abstraction for dependency injection
 */
export type ConfigReader<A> = R.Reader<ConfigEnv, ConfigResult<A>>;

// ============================================================================
// Reader Monad Operations
// ============================================================================

/**
 * Lift a value into ConfigReader context (pure)
 */
export const success = <A>(value: A): ConfigReader<A> =>
  R.of(E.right(value));

/**
 * Lift an error into ConfigReader context
 */
export const failure = <A = never>(error: ConfigError): ConfigReader<A> =>
  R.of(E.left(error));

/**
 * Map over a ConfigReader (Functor)
 */
export const map = <A, B>(f: (a: A) => B) => (
  fa: ConfigReader<A>
): ConfigReader<B> =>
  pipe(
    fa,
    R.map(E.map(f))
  );

/**
 * Chain ConfigReaders (Monad)
 * Allows dependent configuration
 */
export const chain = <A, B>(f: (a: A) => ConfigReader<B>) => (
  fa: ConfigReader<A>
): ConfigReader<B> =>
  (env: ConfigEnv) => {
    const result = fa(env);
    return pipe(
      result,
      E.match(
        (error) => E.left(error),
        (value) => f(value)(env)
      )
    );
  };

/**
 * Apply a function in ConfigReader to a value in ConfigReader (Applicative)
 */
export const ap = <A, B>(
  fab: ConfigReader<(a: A) => B>
) => (fa: ConfigReader<A>): ConfigReader<B> =>
  (env: ConfigEnv) => {
    const resultF = fab(env);
    const resultA = fa(env);

    return pipe(
      resultF,
      E.flatMap((f) =>
        pipe(resultA, E.map(f))
      )
    );
  };

/**
 * Alternative operation - try second if first fails
 */
export const alt = <A>(second: () => ConfigReader<A>) => (
  first: ConfigReader<A>
): ConfigReader<A> =>
  (env: ConfigEnv) => {
    const result = first(env);
    return pipe(
      result,
      E.match(
        () => second()(env),
        () => result
      )
    );
  };

/**
 * Fold a ConfigReader - handle both success and failure
 */
export const fold = <A, B>(
  onFailure: (error: ConfigError) => B,
  onSuccess: (value: A) => B
) => (fa: ConfigReader<A>): R.Reader<ConfigEnv, B> =>
  pipe(
    fa,
    R.map(E.match(onFailure, onSuccess))
  );

/**
 * Get result or throw error
 * Use sparingly - prefer fold for production code
 */
export const getOrThrow = <A>(fa: ConfigReader<A>): R.Reader<ConfigEnv, A> =>
  pipe(
    fa,
    R.map(
      E.getOrElse((error: ConfigError): A => {
        throw new Error(`Configuration error [${error.type}]: ${error.message}`);
      })
    )
  );

/**
 * Get result or return default
 */
export const getOrElse = <A>(defaultValue: A) => (
  fa: ConfigReader<A>
): R.Reader<ConfigEnv, A> =>
  pipe(
    fa,
    R.map(E.getOrElse(() => defaultValue))
  );

/**
 * Ask - get the ConfigEnv
 * Useful for accessing environment directly
 */
export const ask: ConfigReader<ConfigEnv> = (env: ConfigEnv) =>
  E.right(env);

/**
 * Asks - get a specific part of ConfigEnv
 */
export const asks = <A>(f: (env: ConfigEnv) => A): ConfigReader<A> =>
  pipe(ask, map(f));

/**
 * Local - run a ConfigReader with modified environment
 */
export const local = <A>(f: (env: ConfigEnv) => ConfigEnv) => (
  fa: ConfigReader<A>
): ConfigReader<A> =>
  (env: ConfigEnv) => fa(f(env));

// ============================================================================
// Monoid for Configuration Merging
// ============================================================================

/**
 * Monoid for object configuration
 * Allows composing configuration with defaults
 */
export const getConfigMonoid = <A extends Record<string, any>>(): M.Monoid<A> => ({
  concat: (first, second) => ({ ...first, ...second }),
  empty: {} as A,
});

/**
 * Merge configurations using Monoid
 */
export const mergeConfigs = <A extends Record<string, any>>(
  ...configs: readonly A[]
): A => {
  const monoid = getConfigMonoid<A>();
  return configs.reduce((acc, config) => monoid.concat(acc, config), monoid.empty);
};

/**
 * Apply defaults using Monoid
 * Defaults are used only for missing keys
 */
export const withDefaults = <A extends Record<string, any>>(
  defaults: Partial<A>
) => (config: A): A =>
  mergeConfigs(defaults as A, config);

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Load configuration from environment variable
 */
export const fromEnv = (key: string): ConfigReader<string> =>
  (env: ConfigEnv) =>
    pipe(
      env.getEnvVar(key),
      O.match(
        () => E.left(configError('missing', `Environment variable ${key} not found`, [key])),
        (value) => E.right(value)
      )
    );

/**
 * Load optional configuration from environment variable
 */
export const fromEnvOptional = (key: string): ConfigReader<O.Option<string>> =>
  (env: ConfigEnv) => E.right(env.getEnvVar(key));

/**
 * Load configuration from file
 */
export const fromFile = (path: string): ConfigReader<string> =>
  (env: ConfigEnv) =>
    pipe(
      env.readFile(path),
      E.mapLeft((error) =>
        configError('io', `Failed to read file ${path}: ${error.message}`, [path], error)
      )
    );

/**
 * Load configuration from literal value
 */
export const fromLiteral = <A>(value: A): ConfigReader<A> =>
  success(value);

/**
 * Load configuration from source
 */
export const fromSource = (source: ConfigSource): ConfigReader<unknown> => {
  switch (source.type) {
    case 'env':
      return fromEnv(source.key);
    case 'file':
      return pipe(
        fromFile(source.path),
        chain((content) => parseContent(content, source.format))
      );
    case 'literal':
      return fromLiteral(source.value);
    case 'secret':
      return fromSecret(source.key);
  }
};

/**
 * Parse file content based on format
 */
const parseContent = (content: string, format: 'json' | 'yaml'): ConfigReader<unknown> =>
  (env: ConfigEnv) => {
    try {
      if (format === 'json') {
        return E.right(JSON.parse(content));
      }
      // YAML parsing would require additional dependency
      // For now, return error
      return E.left(configError('parse', 'YAML parsing not yet implemented'));
    } catch (error) {
      return E.left(
        configError('parse', `Failed to parse ${format}: ${(error as Error).message}`, [], error)
      );
    }
  };

/**
 * Load secret from secret manager
 */
export const fromSecret = (key: string): ConfigReader<string> =>
  (env: ConfigEnv) => {
    if (!env.secrets) {
      return E.left(configError('missing', 'Secret manager not configured'));
    }
    // Secrets are async, so this is a simplified sync version
    // In production, you'd want to handle async properly
    return E.left(configError('missing', `Secret loading requires async context: ${key}`));
  };

// ============================================================================
// Validation Integration
// ============================================================================

/**
 * Validate configuration value
 */
export const validate = <A, B>(validator: (value: A) => ValidationResult<B>) => (
  fa: ConfigReader<A>
): ConfigReader<B> =>
  pipe(
    fa,
    chain((value) => (env: ConfigEnv) =>
      pipe(
        validator(value),
        E.mapLeft((errors) =>
          configError(
            'validation',
            `Validation failed: ${errors.map(e => e.message).join(', ')}`,
            errors[0]?.path
          )
        )
      )
    )
  );

/**
 * Create validated config from schema
 */
export const fromSchema = <A>(schema: ConfigSchema<A>, source: ConfigSource): ConfigReader<ValidatedConfig<A>> =>
  pipe(
    fromSource(source),
    validate(schema.validate),
    map((value) => value as ValidatedConfig<A>)
  );

/**
 * Create validated config with defaults
 */
export const fromSchemaWithDefaults = <A>(
  schema: ConfigSchema<A>,
  source: ConfigSource
): ConfigReader<ValidatedConfig<A>> =>
  pipe(
    fromSchema(schema, source),
    alt(() =>
      schema.default !== undefined
        ? success(schema.default as ValidatedConfig<A>)
        : failure(configError('missing', 'No value and no default provided'))
    )
  );

// ============================================================================
// Struct Configuration
// ============================================================================

/**
 * Combine multiple config readers into a struct
 */
export const struct = <A extends Record<string, any>>(
  readers: { [K in keyof A]: ConfigReader<A[K]> }
): ConfigReader<A> =>
  (env: ConfigEnv) => {
    const result: Partial<A> = {};
    const errors: ConfigError[] = [];

    for (const key in readers) {
      const reader = readers[key];
      const value = reader(env);

      if (E.isRight(value)) {
        result[key] = value.right;
      } else {
        errors.push({
          ...value.left,
          path: [key, ...(value.left.path || [])],
        });
      }
    }

    if (errors.length > 0) {
      // Return first error (could accumulate all if needed)
      return E.left(errors[0]);
    }

    return E.right(result as A);
  };

/**
 * Traverse an array of config readers
 */
export const sequence = <A>(
  readers: readonly ConfigReader<A>[]
): ConfigReader<readonly A[]> =>
  (env: ConfigEnv) => {
    const results: A[] = [];

    for (const reader of readers) {
      const result = reader(env);
      if (E.isLeft(result)) {
        return result;
      }
      results.push(result.right);
    }

    return E.right(results);
  };

// ============================================================================
// Do Notation
// ============================================================================

/**
 * Do notation for ConfigReader
 */
export const Do = success({});

/**
 * Bind in Do notation
 */
export const bind = <A, K extends string, B>(
  key: Exclude<K, keyof A>,
  f: (a: A) => ConfigReader<B>
) => (fa: ConfigReader<A>): ConfigReader<A & { [k in K]: B }> =>
  pipe(
    fa,
    chain((a) =>
      pipe(
        f(a),
        map((b) => ({ ...a, [key]: b } as A & { [k in K]: B }))
      )
    )
  );

// ============================================================================
// Running Configuration
// ============================================================================

/**
 * Run a ConfigReader with the provided environment
 */
export const run = <A>(env: ConfigEnv) => (reader: ConfigReader<A>): ConfigResult<A> =>
  reader(env);

/**
 * Run a ConfigReader and extract value or throw
 */
export const runOrThrow = <A>(env: ConfigEnv) => (reader: ConfigReader<A>): A =>
  pipe(
    reader(env),
    E.getOrElse((error: ConfigError): A => {
      throw new Error(`Configuration error [${error.type}]: ${error.message}`);
    })
  );

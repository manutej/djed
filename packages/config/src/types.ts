/**
 * Type-level constructs for configuration management
 * Uses Branded Types for zero-cost type safety
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import type { ValidationResult, Validator } from '@djed/validation';

/**
 * Branded type helper for compile-time distinctions
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Branded types for validated configuration values
 */
export type ValidatedConfig<A> = Brand<A, 'ValidatedConfig'>;
export type EnvVar<A> = Brand<A, 'EnvVar'>;
export type SecretValue = Brand<string, 'SecretValue'>;
export type ConfigPath = Brand<string, 'ConfigPath'>;

/**
 * Configuration error types
 */
export interface ConfigError {
  readonly type: 'missing' | 'validation' | 'parse' | 'io';
  readonly message: string;
  readonly path?: readonly string[];
  readonly cause?: unknown;
}

/**
 * Create a configuration error
 */
export const configError = (
  type: ConfigError['type'],
  message: string,
  path?: readonly string[],
  cause?: unknown
): ConfigError => ({
  type,
  message,
  path,
  cause,
});

/**
 * Configuration result type - Either with config errors
 */
export type ConfigResult<A> = E.Either<ConfigError, A>;

/**
 * Environment context for Reader monad
 * Provides access to environment variables and configuration sources
 */
export interface ConfigEnv {
  readonly getEnvVar: (key: string) => O.Option<string>;
  readonly readFile: (path: string) => E.Either<Error, string>;
  readonly secrets?: SecretManager;
}

/**
 * Secret manager interface
 * Abstracts secret retrieval for different backends
 */
export interface SecretManager {
  readonly getSecret: (key: string) => Promise<O.Option<SecretValue>>;
}

/**
 * Configuration schema
 * Defines structure, validation, and defaults
 */
export interface ConfigSchema<A> {
  readonly validate: Validator<unknown, A>;
  readonly default?: A;
  readonly required?: boolean;
  readonly description?: string;
  readonly sensitive?: boolean;
}

/**
 * Infer type from ConfigSchema
 */
export type InferConfig<S> = S extends ConfigSchema<infer A> ? A : never;

/**
 * Struct config schema for objects
 */
export type ConfigStructSchema<A> = {
  readonly [K in keyof A]: ConfigSchema<A[K]>;
};

/**
 * Extract validated type from struct config schema
 */
export type InferConfigStruct<S> = S extends ConfigStructSchema<infer A> ? A : never;

/**
 * Configuration source type
 */
export type ConfigSource =
  | { readonly type: 'env'; readonly key: string }
  | { readonly type: 'file'; readonly path: string; readonly format: 'json' | 'yaml' }
  | { readonly type: 'literal'; readonly value: unknown }
  | { readonly type: 'secret'; readonly key: string };

/**
 * Hot reload configuration
 */
export interface HotReloadConfig {
  readonly enabled: boolean;
  readonly interval?: number; // milliseconds
  readonly onChange?: (newConfig: unknown) => void;
}

/**
 * Full configuration options
 */
export interface ConfigOptions<A> {
  readonly schema: ConfigSchema<A>;
  readonly source: ConfigSource;
  readonly hotReload?: HotReloadConfig;
}

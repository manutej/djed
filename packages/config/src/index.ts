/**
 * @djed/config
 * Configuration management with Reader monad for dependency injection
 *
 * Category Theory Foundations:
 * - Reader Monad: dependency injection pattern
 * - Monoid: combining defaults and configuration
 * - Either: error handling
 * - Option: optional values
 *
 * Progressive API:
 * - L1 (Novice): Simple config loading from env/file
 * - L2 (Intermediate): Schema validation, defaults, struct configs
 * - L3 (Expert): Full Reader monad composition, hot reload, secrets
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Branded types
  ValidatedConfig,
  EnvVar,
  SecretValue,
  ConfigPath,
  // Error types
  ConfigError,
  ConfigResult,
  // Environment
  ConfigEnv,
  SecretManager,
  // Schema types
  ConfigSchema,
  InferConfig,
  ConfigStructSchema,
  InferConfigStruct,
  // Source types
  ConfigSource,
  HotReloadConfig,
  ConfigOptions,
} from './types';

export {
  configError,
} from './types';

// ============================================================================
// Core Functions (Reader Monad)
// ============================================================================

export type {
  ConfigReader,
} from './core';

export {
  // Constructors
  success,
  failure,
  // Functor
  map,
  // Monad
  chain,
  // Applicative
  ap,
  // Alt
  alt,
  // Fold
  fold,
  getOrThrow,
  getOrElse,
  // Reader operations
  ask,
  asks,
  local,
  // Monoid
  getConfigMonoid,
  mergeConfigs,
  withDefaults,
  // Loaders
  fromEnv,
  fromEnvOptional,
  fromFile,
  fromLiteral,
  fromSource,
  fromSecret,
  // Validation
  validate,
  fromSchema,
  fromSchemaWithDefaults,
  // Struct
  struct,
  sequence,
  // Do notation
  Do,
  bind,
  // Running
  run,
  runOrThrow,
} from './core';

// ============================================================================
// Loaders and Environment
// ============================================================================

export {
  // Environment loaders
  fromProcessEnv,
  fromCustomEnv,
  fromEnvWithSecrets,
  // Secret managers
  createMemorySecretManager,
  createEnvSecretManager,
  createFileSecretManager,
  // Hot reload
  createHotReloadWatcher,
  watchConfig,
  // Environment detection
  detectEnvironment,
  isProduction,
  isDevelopment,
  isTest,
  // Config file discovery
  findConfigFile,
  loadConfigFile,
  // Parsing utilities
  parseEnvInt,
  parseEnvFloat,
  parseEnvBoolean,
  parseEnvJSON,
  parseEnvList,
  // Dotenv support
  loadDotEnv,
} from './loaders';

// ============================================================================
// Progressive API Examples
// ============================================================================

/**
 * Example usage:
 *
 * @example
 * // L1: Simple config loading from environment
 * import { fromEnv, run, fromProcessEnv } from '@djed/config';
 * import { pipe } from 'fp-ts/function';
 *
 * const config = pipe(
 *   fromEnv('DATABASE_URL'),
 *   run(fromProcessEnv())
 * );
 * // Either<ConfigError, string>
 *
 * @example
 * // L2: Schema-based validation with defaults
 * import { fromSchema, struct, run, fromProcessEnv } from '@djed/config';
 * import { nonEmptyString, port } from '@djed/validation';
 * import { pipe } from 'fp-ts/function';
 *
 * const schema = {
 *   validate: struct({
 *     host: nonEmptyString,
 *     port: port,
 *   }),
 *   default: { host: 'localhost', port: 5432 }
 * };
 *
 * const config = pipe(
 *   fromSchemaWithDefaults(schema, { type: 'env', key: 'DB_CONFIG' }),
 *   run(fromProcessEnv())
 * );
 * // Either<ConfigError, ValidatedConfig<{ host: NonEmptyString, port: Port }>>
 *
 * @example
 * // L3: Full Reader monad composition with Do notation
 * import {
 *   Do,
 *   bind,
 *   fromEnv,
 *   fromEnvOptional,
 *   chain,
 *   map,
 *   run,
 *   fromProcessEnv,
 * } from '@djed/config';
 * import { pipe } from 'fp-ts/function';
 * import * as O from 'fp-ts/Option';
 *
 * const appConfig = pipe(
 *   Do,
 *   bind('environment', () => fromEnv('NODE_ENV')),
 *   bind('port', () =>
 *     pipe(
 *       fromEnvOptional('PORT'),
 *       map(O.map(parseInt)),
 *       map(O.getOrElse(() => 3000))
 *     )
 *   ),
 *   bind('database', ({ environment }) =>
 *     fromEnv(environment === 'production' ? 'PROD_DB' : 'DEV_DB')
 *   )
 * );
 *
 * const config = run(fromProcessEnv())(appConfig);
 * // Either<ConfigError, {
 * //   environment: string;
 * //   port: number;
 * //   database: string;
 * // }>
 *
 * @example
 * // L3: Hot reload with file watching
 * import {
 *   fromFile,
 *   watchConfig,
 *   run,
 *   fromProcessEnv,
 * } from '@djed/config';
 * import { pipe } from 'fp-ts/function';
 *
 * // Initial load
 * const initialConfig = pipe(
 *   fromFile('./config.json'),
 *   run(fromProcessEnv())
 * );
 *
 * // Setup hot reload
 * const watcher = watchConfig(
 *   './config.json',
 *   (newConfig) => {
 *     console.log('Config reloaded:', newConfig);
 *   },
 *   1000 // 1 second debounce
 * );
 *
 * // Later: stop watching
 * watcher.stop();
 *
 * @example
 * // L3: Secret management
 * import {
 *   fromEnvWithSecrets,
 *   createFileSecretManager,
 *   fromSecret,
 *   run,
 * } from '@djed/config';
 * import { pipe } from 'fp-ts/function';
 *
 * const secretManager = createFileSecretManager('/run/secrets');
 * const env = fromEnvWithSecrets(secretManager);
 *
 * const apiKey = pipe(
 *   fromSecret('API_KEY'),
 *   run(env)
 * );
 * // Either<ConfigError, string>
 */

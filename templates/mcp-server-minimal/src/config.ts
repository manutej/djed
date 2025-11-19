/**
 * Application Configuration using @djed/config
 *
 * This module demonstrates L2 API usage from @djed/config:
 * - Environment-based configuration
 * - Type-safe config with defaults
 * - Validation using @djed/validation
 *
 * Progressive API:
 * - L1: Simple fromEnv() calls
 * - L2: Schema validation with struct (used here)
 * - L3: Full Reader composition with Do notation
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import {
  fromProcessEnv,
  fromEnv,
  fromEnvOptional,
  run,
  struct,
  map,
  Do,
  bind,
  parseEnvInt,
  parseEnvBoolean,
  loadDotEnv,
  type ConfigError,
} from '@djed/config';

/**
 * Server configuration type
 */
export interface ServerConfig {
  readonly node_env: string;
  readonly port: number;
  readonly host: string;
  readonly request_timeout: number;
  readonly shutdown_timeout: number;
}

/**
 * Logging configuration type
 */
export interface LogConfig {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format: 'json' | 'pretty';
}

/**
 * CORS configuration type
 */
export interface CorsConfig {
  readonly origin: string;
  readonly credentials: boolean;
}

/**
 * Database configuration type (optional)
 */
export interface DatabaseConfig {
  readonly url: string;
  readonly pool_min: number;
  readonly pool_max: number;
  readonly idle_timeout: number;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  readonly server: ServerConfig;
  readonly log: LogConfig;
  readonly cors: CorsConfig;
  readonly database: O.Option<DatabaseConfig>;
}

/**
 * Load server configuration from environment
 * Uses L2 API with struct for composing multiple config values
 */
const loadServerConfig = pipe(
  Do,
  bind('node_env', () =>
    pipe(
      fromEnvOptional('NODE_ENV'),
      map(O.getOrElse(() => 'development'))
    )
  ),
  bind('port', () =>
    pipe(
      fromEnvOptional('PORT'),
      map(O.chain(parseEnvInt)),
      map(O.getOrElse(() => 3000))
    )
  ),
  bind('host', () =>
    pipe(
      fromEnvOptional('HOST'),
      map(O.getOrElse(() => '0.0.0.0'))
    )
  ),
  bind('request_timeout', () =>
    pipe(
      fromEnvOptional('REQUEST_TIMEOUT'),
      map(O.chain(parseEnvInt)),
      map(O.getOrElse(() => 30000))
    )
  ),
  bind('shutdown_timeout', () =>
    pipe(
      fromEnvOptional('SHUTDOWN_TIMEOUT'),
      map(O.chain(parseEnvInt)),
      map(O.getOrElse(() => 10000))
    )
  )
);

/**
 * Load logging configuration from environment
 */
const loadLogConfig = pipe(
  Do,
  bind('level', () =>
    pipe(
      fromEnvOptional('LOG_LEVEL'),
      map(O.getOrElse(() => 'info' as const))
    )
  ),
  bind('format', () =>
    pipe(
      fromEnvOptional('LOG_FORMAT'),
      map(O.getOrElse(() => 'pretty' as const))
    )
  )
);

/**
 * Load CORS configuration from environment
 */
const loadCorsConfig = pipe(
  Do,
  bind('origin', () =>
    pipe(
      fromEnvOptional('CORS_ORIGIN'),
      map(O.getOrElse(() => '*'))
    )
  ),
  bind('credentials', () =>
    pipe(
      fromEnvOptional('CORS_CREDENTIALS'),
      map(O.chain(parseEnvBoolean)),
      map(O.getOrElse(() => false))
    )
  )
);

/**
 * Load database configuration from environment (optional)
 * Returns Option<DatabaseConfig> - Some if DATABASE_URL is set, None otherwise
 */
const loadDatabaseConfig = pipe(
  fromEnvOptional('DATABASE_URL'),
  map((urlOption) =>
    pipe(
      urlOption,
      O.map((url) => ({
        url,
        pool_min: pipe(
          fromEnvOptional('DATABASE_POOL_MIN'),
          map(O.chain(parseEnvInt)),
          map(O.getOrElse(() => 2)),
          run(fromProcessEnv()),
          E.getOrElse(() => 2)
        ),
        pool_max: pipe(
          fromEnvOptional('DATABASE_POOL_MAX'),
          map(O.chain(parseEnvInt)),
          map(O.getOrElse(() => 10)),
          run(fromProcessEnv()),
          E.getOrElse(() => 10)
        ),
        idle_timeout: pipe(
          fromEnvOptional('DATABASE_IDLE_TIMEOUT'),
          map(O.chain(parseEnvInt)),
          map(O.getOrElse(() => 10000)),
          run(fromProcessEnv()),
          E.getOrElse(() => 10000)
        ),
      }))
    )
  )
);

/**
 * Load complete application configuration
 * Composes all config sections using Do notation (L2/L3 API)
 */
const loadAppConfig = pipe(
  Do,
  bind('server', () => loadServerConfig),
  bind('log', () => loadLogConfig),
  bind('cors', () => loadCorsConfig),
  bind('database', () => loadDatabaseConfig)
);

/**
 * Load and validate application configuration
 * Returns Either<ConfigError, AppConfig>
 *
 * @example
 * import { loadConfig } from './config';
 * import * as E from 'fp-ts/Either';
 *
 * const config = loadConfig();
 *
 * pipe(
 *   config,
 *   E.fold(
 *     (error) => console.error('Config error:', error),
 *     (cfg) => console.log('Config loaded:', cfg)
 *   )
 * );
 */
export function loadConfig(): E.Either<ConfigError, AppConfig> {
  // Load .env file in development
  loadDotEnv();

  // Run the config reader with process.env
  return run(fromProcessEnv())(loadAppConfig);
}

/**
 * Load config or throw error
 * Convenience function for simpler error handling
 *
 * @throws {Error} If configuration loading fails
 */
export function loadConfigOrThrow(): AppConfig {
  return pipe(
    loadConfig(),
    E.getOrElse((error) => {
      throw new Error(`Configuration error: ${error.message}`);
    })
  );
}

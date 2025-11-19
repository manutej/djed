/**
 * Configuration loaders for different sources
 * Provides pure I/O boundary implementations
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { readFileSync, watch, FSWatcher } from 'fs';
import { ConfigEnv, SecretManager, SecretValue, HotReloadConfig } from './types';

// ============================================================================
// Environment Loaders
// ============================================================================

/**
 * Create ConfigEnv from process.env
 * Pure function that captures environment at creation time
 */
export const fromProcessEnv = (): ConfigEnv => ({
  getEnvVar: (key: string): O.Option<string> => {
    const value = process.env[key];
    return value !== undefined ? O.some(value) : O.none;
  },
  readFile: (path: string): E.Either<Error, string> => {
    try {
      const content = readFileSync(path, 'utf-8');
      return E.right(content);
    } catch (error) {
      return E.left(error as Error);
    }
  },
});

/**
 * Create ConfigEnv with custom environment
 * Useful for testing or custom env sources
 */
export const fromCustomEnv = (env: Record<string, string>): ConfigEnv => ({
  getEnvVar: (key: string): O.Option<string> => {
    const value = env[key];
    return value !== undefined ? O.some(value) : O.none;
  },
  readFile: (path: string): E.Either<Error, string> => {
    try {
      const content = readFileSync(path, 'utf-8');
      return E.right(content);
    } catch (error) {
      return E.left(error as Error);
    }
  },
});

/**
 * Create ConfigEnv with secret manager
 */
export const fromEnvWithSecrets = (
  secretManager: SecretManager
): ConfigEnv => ({
  getEnvVar: (key: string): O.Option<string> => {
    const value = process.env[key];
    return value !== undefined ? O.some(value) : O.none;
  },
  readFile: (path: string): E.Either<Error, string> => {
    try {
      const content = readFileSync(path, 'utf-8');
      return E.right(content);
    } catch (error) {
      return E.left(error as Error);
    }
  },
  secrets: secretManager,
});

// ============================================================================
// Secret Managers
// ============================================================================

/**
 * In-memory secret manager (for testing)
 */
export const createMemorySecretManager = (
  secrets: Record<string, string>
): SecretManager => ({
  getSecret: async (key: string): Promise<O.Option<SecretValue>> => {
    const value = secrets[key];
    return value !== undefined
      ? O.some(value as SecretValue)
      : O.none;
  },
});

/**
 * Environment variable secret manager
 * Reads secrets from environment with specific prefix
 */
export const createEnvSecretManager = (
  prefix: string = 'SECRET_'
): SecretManager => ({
  getSecret: async (key: string): Promise<O.Option<SecretValue>> => {
    const fullKey = `${prefix}${key}`;
    const value = process.env[fullKey];
    return value !== undefined
      ? O.some(value as SecretValue)
      : O.none;
  },
});

/**
 * File-based secret manager
 * Reads secrets from files (e.g., Docker secrets)
 */
export const createFileSecretManager = (
  baseDir: string
): SecretManager => ({
  getSecret: async (key: string): Promise<O.Option<SecretValue>> => {
    try {
      const secretPath = `${baseDir}/${key}`;
      const content = readFileSync(secretPath, 'utf-8').trim();
      return O.some(content as SecretValue);
    } catch {
      return O.none;
    }
  },
});

// ============================================================================
// Hot Reload Support
// ============================================================================

/**
 * Hot reload watcher state
 */
interface HotReloadWatcher {
  readonly watcher: FSWatcher;
  readonly stop: () => void;
}

/**
 * Create hot reload watcher for file-based config
 * Returns cleanup function
 */
export const createHotReloadWatcher = (
  filePath: string,
  config: HotReloadConfig
): HotReloadWatcher => {
  if (!config.enabled) {
    throw new Error('Hot reload is not enabled');
  }

  let timeoutId: NodeJS.Timeout | undefined;

  const watcher = watch(filePath, (eventType) => {
    if (eventType === 'change') {
      // Debounce file changes
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const newConfig = JSON.parse(content);

          if (config.onChange) {
            config.onChange(newConfig);
          }
        } catch (error) {
          console.error('Hot reload error:', error);
        }
      }, config.interval || 100);
    }
  });

  const stop = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    watcher.close();
  };

  return { watcher, stop };
};

/**
 * Create hot reload watcher with callback
 */
export const watchConfig = <A>(
  filePath: string,
  onReload: (config: A) => void,
  interval: number = 100
): HotReloadWatcher => {
  return createHotReloadWatcher(filePath, {
    enabled: true,
    interval,
    onChange: (newConfig) => onReload(newConfig as A),
  });
};

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect current environment from NODE_ENV
 */
export const detectEnvironment = (): string =>
  process.env.NODE_ENV || 'development';

/**
 * Check if running in production
 */
export const isProduction = (): boolean =>
  detectEnvironment() === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean =>
  detectEnvironment() === 'development';

/**
 * Check if running in test
 */
export const isTest = (): boolean =>
  detectEnvironment() === 'test';

// ============================================================================
// Configuration File Discovery
// ============================================================================

/**
 * Standard config file names to check
 */
const CONFIG_FILE_NAMES = [
  'config.json',
  'config.local.json',
  '.config.json',
  'app.config.json',
] as const;

/**
 * Find configuration file in standard locations
 * Returns Option of file path
 */
export const findConfigFile = (
  searchPaths: readonly string[] = [process.cwd(), '/etc']
): O.Option<string> => {
  for (const basePath of searchPaths) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const fullPath = `${basePath}/${fileName}`;
      try {
        // Try to access the file
        readFileSync(fullPath);
        return O.some(fullPath);
      } catch {
        // File doesn't exist, continue searching
        continue;
      }
    }
  }
  return O.none;
};

/**
 * Load config file from standard locations
 * Returns content if found
 */
export const loadConfigFile = (
  searchPaths?: readonly string[]
): O.Option<string> => {
  const filePath = findConfigFile(searchPaths);

  return O.match(
    () => O.none,
    (path: string) => {
      try {
        const content = readFileSync(path, 'utf-8');
        return O.some(content);
      } catch {
        return O.none;
      }
    }
  )(filePath);
};

// ============================================================================
// Environment Variable Parsing
// ============================================================================

/**
 * Parse environment variable as integer
 */
export const parseEnvInt = (value: string): O.Option<number> => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? O.none : O.some(parsed);
};

/**
 * Parse environment variable as float
 */
export const parseEnvFloat = (value: string): O.Option<number> => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? O.none : O.some(parsed);
};

/**
 * Parse environment variable as boolean
 */
export const parseEnvBoolean = (value: string): boolean => {
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

/**
 * Parse environment variable as JSON
 */
export const parseEnvJSON = <A>(value: string): O.Option<A> => {
  try {
    const parsed = JSON.parse(value);
    return O.some(parsed as A);
  } catch {
    return O.none;
  }
};

/**
 * Parse environment variable as comma-separated list
 */
export const parseEnvList = (value: string, separator: string = ','): string[] => {
  return value.split(separator).map(s => s.trim()).filter(s => s.length > 0);
};

// ============================================================================
// Dotenv Support
// ============================================================================

/**
 * Load .env file into environment
 * Simple implementation - for production use, consider dotenv package
 */
export const loadDotEnv = (filePath: string = '.env'): void => {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const trimmedKey = key.trim();
        let trimmedValue = value.trim();

        // Remove quotes if present
        if (
          (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
          (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
        ) {
          trimmedValue = trimmedValue.slice(1, -1);
        }

        // Only set if not already in environment
        if (process.env[trimmedKey] === undefined) {
          process.env[trimmedKey] = trimmedValue;
        }
      }
    }
  } catch (error) {
    // Silently fail if .env doesn't exist
    // In production, you might want to log this
  }
};

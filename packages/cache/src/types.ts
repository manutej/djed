/**
 * @djed/cache - Type definitions
 *
 * Core types for functional caching with IO monad support.
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { Monoid } from 'fp-ts/Monoid';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Time-to-live in milliseconds
 */
export type TTL = number;

/**
 * Cache key type
 */
export type CacheKey = string;

/**
 * Cache entry with metadata
 */
export interface CacheEntry<A> {
  readonly value: A;
  readonly expiresAt: O.Option<number>; // timestamp in ms, None = never expires
  readonly createdAt: number;
}

/**
 * Cache error types
 */
export type CacheError =
  | { readonly _tag: 'ConnectionError'; readonly message: string }
  | { readonly _tag: 'SerializationError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'DeserializationError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'OperationError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'NotFoundError'; readonly key: string };

/**
 * Create a connection error
 */
export const connectionError = (message: string): CacheError => ({
  _tag: 'ConnectionError',
  message,
});

/**
 * Create a serialization error
 */
export const serializationError = (message: string, cause: unknown): CacheError => ({
  _tag: 'SerializationError',
  message,
  cause,
});

/**
 * Create a deserialization error
 */
export const deserializationError = (message: string, cause: unknown): CacheError => ({
  _tag: 'DeserializationError',
  message,
  cause,
});

/**
 * Create an operation error
 */
export const operationError = (message: string, cause: unknown): CacheError => ({
  _tag: 'OperationError',
  message,
  cause,
});

/**
 * Create a not found error
 */
export const notFoundError = (key: string): CacheError => ({
  _tag: 'NotFoundError',
  key,
});

// ============================================================================
// TTL Monoid
// ============================================================================

/**
 * Monoid for TTL values using max operation
 * Identity: 0 (no cache)
 * Operation: max(a, b) - take the longer TTL
 */
export const TTLMonoid: Monoid<TTL> = {
  empty: 0,
  concat: (x: TTL, y: TTL) => Math.max(x, y),
};

/**
 * TTL constants for common use cases
 */
export const TTLPresets = {
  NO_CACHE: 0,
  FIVE_SECONDS: 5 * 1000,
  TEN_SECONDS: 10 * 1000,
  THIRTY_SECONDS: 30 * 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  NEVER: Number.MAX_SAFE_INTEGER,
} as const;

// ============================================================================
// Cache Backend Interface
// ============================================================================

/**
 * Cache backend interface - all backends must implement these operations
 */
export interface CacheBackend {
  /**
   * Get a value from the cache
   * Returns None if key doesn't exist or has expired
   */
  readonly get: <A>(key: CacheKey) => TE.TaskEither<CacheError, O.Option<A>>;

  /**
   * Set a value in the cache with optional TTL
   * TTL is in milliseconds, None means never expire
   */
  readonly set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>) => TE.TaskEither<CacheError, void>;

  /**
   * Delete a value from the cache
   * Returns true if the key existed and was deleted
   */
  readonly delete: (key: CacheKey) => TE.TaskEither<CacheError, boolean>;

  /**
   * Check if a key exists in the cache
   */
  readonly has: (key: CacheKey) => TE.TaskEither<CacheError, boolean>;

  /**
   * Clear all values from the cache
   */
  readonly clear: () => TE.TaskEither<CacheError, void>;

  /**
   * Delete all keys matching a pattern
   * Pattern syntax depends on the backend
   */
  readonly deletePattern: (pattern: string) => TE.TaskEither<CacheError, number>;

  /**
   * Get all keys matching a pattern
   * Pattern syntax depends on the backend
   */
  readonly keys: (pattern: string) => TE.TaskEither<CacheError, readonly CacheKey[]>;

  /**
   * Close/cleanup the cache backend
   */
  readonly close: () => TE.TaskEither<CacheError, void>;
}

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /**
   * Default TTL for cache entries (in milliseconds)
   */
  readonly defaultTTL: O.Option<TTL>;

  /**
   * Namespace prefix for all keys
   */
  readonly namespace: O.Option<string>;

  /**
   * Enable stampede prevention
   */
  readonly preventStampede: boolean;

  /**
   * Stampede prevention timeout (in milliseconds)
   */
  readonly stampedeTimeout: TTL;
}

/**
 * Default cache configuration
 */
export const defaultCacheConfig: CacheConfig = {
  defaultTTL: O.some(TTLPresets.FIVE_MINUTES),
  namespace: O.none,
  preventStampede: false,
  stampedeTimeout: TTLPresets.THIRTY_SECONDS,
};

// ============================================================================
// Namespace Utilities
// ============================================================================

/**
 * Create a namespaced key
 */
export const namespaceKey = (namespace: O.Option<string>) => (key: CacheKey): CacheKey =>
  O.fold(
    () => key,
    (ns: string) => `${ns}:${key}`
  )(namespace);

/**
 * Remove namespace from a key
 */
export const unnamespacedKey = (namespace: O.Option<string>) => (key: CacheKey): CacheKey =>
  O.fold(
    () => key,
    (ns: string) => key.startsWith(`${ns}:`) ? key.slice(ns.length + 1) : key
  )(namespace);

// ============================================================================
// Memory Backend Configuration
// ============================================================================

/**
 * Memory cache backend configuration
 */
export interface MemoryCacheConfig {
  /**
   * Maximum number of entries in the cache
   */
  readonly maxSize: O.Option<number>;

  /**
   * Cleanup interval for expired entries (in milliseconds)
   */
  readonly cleanupInterval: O.Option<TTL>;
}

/**
 * Default memory cache configuration
 */
export const defaultMemoryCacheConfig: MemoryCacheConfig = {
  maxSize: O.some(1000),
  cleanupInterval: O.some(TTLPresets.ONE_MINUTE),
};

// ============================================================================
// Redis Backend Configuration
// ============================================================================

/**
 * Redis cache backend configuration
 */
export interface RedisCacheConfig {
  /**
   * Redis host
   */
  readonly host: string;

  /**
   * Redis port
   */
  readonly port: number;

  /**
   * Redis password
   */
  readonly password: O.Option<string>;

  /**
   * Redis database number
   */
  readonly db: number;

  /**
   * Connection timeout (in milliseconds)
   */
  readonly connectionTimeout: TTL;

  /**
   * Command timeout (in milliseconds)
   */
  readonly commandTimeout: TTL;

  /**
   * Enable TLS
   */
  readonly tls: boolean;
}

/**
 * Default Redis cache configuration
 */
export const defaultRedisCacheConfig: RedisCacheConfig = {
  host: 'localhost',
  port: 6379,
  password: O.none,
  db: 0,
  connectionTimeout: TTLPresets.TEN_SECONDS,
  commandTimeout: TTLPresets.FIVE_SECONDS,
  tls: false,
};

// ============================================================================
// File Backend Configuration
// ============================================================================

/**
 * File cache backend configuration
 */
export interface FileCacheConfig {
  /**
   * Base directory for cache files
   */
  readonly directory: string;

  /**
   * File extension for cache files
   */
  readonly extension: string;

  /**
   * Cleanup interval for expired files (in milliseconds)
   */
  readonly cleanupInterval: O.Option<TTL>;
}

/**
 * Default file cache configuration
 */
export const defaultFileCacheConfig: FileCacheConfig = {
  directory: '.cache',
  extension: '.json',
  cleanupInterval: O.some(TTLPresets.FIVE_MINUTES),
};

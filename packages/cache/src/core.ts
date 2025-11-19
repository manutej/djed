/**
 * @djed/cache - Core cache operations
 *
 * Core functional cache operations using TaskEither and Reader pattern.
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';
import {
  CacheBackend,
  CacheConfig,
  CacheError,
  CacheKey,
  TTL,
  TTLMonoid,
  defaultCacheConfig,
  namespaceKey,
} from './types';

// ============================================================================
// L1: Simple get/set/delete operations
// ============================================================================

/**
 * Get a value from the cache
 * Returns None if key doesn't exist or has expired
 */
export const get = <A>(key: CacheKey): R.Reader<CacheBackend, TE.TaskEither<CacheError, O.Option<A>>> =>
  (backend: CacheBackend) => backend.get<A>(key);

/**
 * Get a value from the cache with namespace support
 */
export const getWithNamespace = <A>(
  key: CacheKey,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, O.Option<A>>> =>
  get<A>(namespaceKey(config.namespace)(key));

/**
 * Set a value in the cache
 */
export const set = <A>(
  key: CacheKey,
  value: A,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) => backend.set(key, value, ttl);

/**
 * Set a value in the cache with namespace support and default TTL
 */
export const setWithConfig = <A>(
  key: CacheKey,
  value: A,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);
  return set(namespacedKey, value, config.defaultTTL);
};

/**
 * Delete a value from the cache
 */
export const del = (key: CacheKey): R.Reader<CacheBackend, TE.TaskEither<CacheError, boolean>> =>
  (backend: CacheBackend) => backend.delete(key);

/**
 * Delete a value from the cache with namespace support
 */
export const delWithNamespace = (
  key: CacheKey,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, boolean>> =>
  del(namespaceKey(config.namespace)(key));

/**
 * Check if a key exists in the cache
 */
export const has = (key: CacheKey): R.Reader<CacheBackend, TE.TaskEither<CacheError, boolean>> =>
  (backend: CacheBackend) => backend.has(key);

/**
 * Check if a key exists in the cache with namespace support
 */
export const hasWithNamespace = (
  key: CacheKey,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, boolean>> =>
  has(namespaceKey(config.namespace)(key));

/**
 * Clear all values from the cache
 */
export const clear = (): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) => backend.clear();

// ============================================================================
// L2: TTL, namespaces, and patterns
// ============================================================================

/**
 * Set a value with a specific TTL in seconds (convenience function)
 */
export const setWithTTLSeconds = <A>(
  key: CacheKey,
  value: A,
  ttlSeconds: number
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  set(key, value, O.some(ttlSeconds * 1000));

/**
 * Set a value with a specific TTL in milliseconds (convenience function)
 */
export const setWithTTL = <A>(
  key: CacheKey,
  value: A,
  ttlMs: number
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  set(key, value, O.some(ttlMs));

/**
 * Combine multiple TTL values using the TTL Monoid (max)
 */
export const combineTTL = (ttls: readonly TTL[]): TTL =>
  ttls.reduce(TTLMonoid.concat, TTLMonoid.empty);

/**
 * Set multiple values with the same TTL
 */
export const setMany = <A>(
  entries: readonly [CacheKey, A][],
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) =>
    pipe(
      entries,
      TE.traverseArray(([key, value]) => backend.set(key, value, ttl)),
      TE.map(() => undefined)
    );

/**
 * Get multiple values from the cache
 */
export const getMany = <A>(
  keys: readonly CacheKey[]
): R.Reader<CacheBackend, TE.TaskEither<CacheError, readonly O.Option<A>[]>> =>
  (backend: CacheBackend) =>
    pipe(
      keys,
      TE.traverseArray((key) => backend.get<A>(key))
    );

/**
 * Delete all keys matching a pattern
 */
export const deletePattern = (pattern: string): R.Reader<CacheBackend, TE.TaskEither<CacheError, number>> =>
  (backend: CacheBackend) => backend.deletePattern(pattern);

/**
 * Delete all keys in a namespace
 */
export const deleteNamespace = (
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, number>> =>
  pipe(
    config.namespace,
    O.fold(
      () => (backend: CacheBackend) => TE.right(0),
      (ns) => deletePattern(`${ns}:*`)
    )
  );

/**
 * Get all keys matching a pattern
 */
export const keys = (pattern: string): R.Reader<CacheBackend, TE.TaskEither<CacheError, readonly CacheKey[]>> =>
  (backend: CacheBackend) => backend.keys(pattern);

/**
 * Get all keys in a namespace
 */
export const keysInNamespace = (
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, readonly CacheKey[]>> =>
  pipe(
    config.namespace,
    O.fold(
      () => keys('*'),
      (ns) => keys(`${ns}:*`)
    )
  );

// ============================================================================
// L3: Advanced operations with composition
// ============================================================================

/**
 * Get or set a value in the cache (cache-aside pattern)
 * If the value exists, return it; otherwise, compute it and store it
 */
export const getOrSet = <A>(
  key: CacheKey,
  compute: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            // Cache miss: compute, store, and return
            () =>
              pipe(
                compute,
                TE.chainFirst((value) => backend.set(key, value, ttl))
              ),
            // Cache hit: return the value
            (value) => TE.right(value)
          )
        )
      )
    );

/**
 * Get or set with namespace support
 */
export const getOrSetWithConfig = <A>(
  key: CacheKey,
  compute: TE.TaskEither<CacheError, A>,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);
  return getOrSet(namespacedKey, compute, config.defaultTTL);
};

/**
 * Refresh a cache entry by recomputing its value
 */
export const refresh = <A>(
  key: CacheKey,
  compute: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      compute,
      TE.chainFirst((value) => backend.set(key, value, ttl))
    );

/**
 * Refresh with namespace support
 */
export const refreshWithConfig = <A>(
  key: CacheKey,
  compute: TE.TaskEither<CacheError, A>,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);
  return refresh(namespacedKey, compute, config.defaultTTL);
};

/**
 * Invalidate (delete) and refresh a cache entry
 */
export const invalidateAndRefresh = <A>(
  key: CacheKey,
  compute: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.delete(key),
      TE.chain(() => compute),
      TE.chainFirst((value) => backend.set(key, value, ttl))
    );

/**
 * Update a cache entry by applying a transformation function
 */
export const update = <A>(
  key: CacheKey,
  f: (a: A) => A,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, O.Option<A>>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            () => TE.right(O.none),
            (value) => {
              const newValue = f(value);
              return pipe(
                backend.set(key, newValue, ttl),
                TE.map(() => O.some(newValue))
              );
            }
          )
        )
      )
    );

/**
 * Modify a cache entry by applying a TaskEither transformation
 */
export const modify = <A>(
  key: CacheKey,
  f: (a: A) => TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, O.Option<A>>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            () => TE.right(O.none),
            (value) =>
              pipe(
                f(value),
                TE.chainFirst((newValue) => backend.set(key, newValue, ttl)),
                TE.map(O.some)
              )
          )
        )
      )
    );

/**
 * Close the cache backend
 */
export const close = (): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) => backend.close();

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Create a namespaced cache interface
 */
export const withNamespace = (namespace: string) => (backend: CacheBackend): CacheBackend => {
  const ns = O.some(namespace);
  const nsKey = namespaceKey(ns);

  return {
    get: <A>(key: CacheKey) => backend.get<A>(nsKey(key)),
    set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>) => backend.set(nsKey(key), value, ttl),
    delete: (key: CacheKey) => backend.delete(nsKey(key)),
    has: (key: CacheKey) => backend.has(nsKey(key)),
    clear: () => backend.deletePattern(`${namespace}:*`) as TE.TaskEither<CacheError, void>,
    deletePattern: (pattern: string) => backend.deletePattern(`${namespace}:${pattern}`),
    keys: (pattern: string) => backend.keys(`${namespace}:${pattern}`),
    close: () => backend.close(),
  };
};

/**
 * Create a cache interface with default TTL
 */
export const withDefaultTTL = (ttl: TTL) => (backend: CacheBackend): CacheBackend => ({
  get: backend.get,
  set: <A>(key: CacheKey, value: A, customTtl: O.Option<TTL>) =>
    backend.set(key, value, O.isSome(customTtl) ? customTtl : O.some(ttl)),
  delete: backend.delete,
  has: backend.has,
  clear: backend.clear,
  deletePattern: backend.deletePattern,
  keys: backend.keys,
  close: backend.close,
});

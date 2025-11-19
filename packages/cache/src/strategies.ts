/**
 * @djed/cache - Caching strategies
 *
 * Advanced caching strategies including cache-aside pattern and stampede prevention.
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
  defaultCacheConfig,
  namespaceKey,
  operationError,
} from './types';

// ============================================================================
// Cache-Aside Pattern
// ============================================================================

/**
 * Cache-aside pattern (also known as lazy loading)
 *
 * When data is requested:
 * 1. Check if data is in cache
 * 2. If yes, return it (cache hit)
 * 3. If no, load from source, store in cache, and return (cache miss)
 */
export const cacheAside = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            // Cache miss: load from source and store
            () =>
              pipe(
                loadFromSource,
                TE.chainFirst((value) => backend.set(key, value, ttl))
              ),
            // Cache hit: return cached value
            (value) => TE.right(value)
          )
        )
      )
    );

/**
 * Cache-aside with namespace support
 */
export const cacheAsideWithConfig = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);
  return cacheAside(namespacedKey, loadFromSource, config.defaultTTL);
};

// ============================================================================
// Stampede Prevention
// ============================================================================

/**
 * Stampede (cache stampede / thundering herd) occurs when:
 * - A cached item expires
 * - Multiple requests try to regenerate it simultaneously
 * - This causes a spike in backend load
 *
 * Prevention strategy:
 * - Use a lock mechanism to ensure only one request regenerates the cache
 * - Other requests wait for the lock or use stale data
 */

/**
 * In-memory lock registry for stampede prevention
 * Maps cache keys to promises that resolve when the value is ready
 */
const locks = new Map<CacheKey, Promise<unknown>>();

/**
 * Cache-aside with stampede prevention
 *
 * Only one request will load from source for a given key.
 * Other concurrent requests will wait for the first one to complete.
 */
export const cacheAsideWithStampedePrevention = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none,
  timeout: TTL = 30000
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            // Cache miss: acquire lock and load
            () => {
              // Check if another request is already loading this key
              const existingLock = locks.get(key);

              if (existingLock) {
                // Wait for the existing load to complete
                return TE.tryCatch(
                  async () => {
                    const timeoutPromise = new Promise<never>((_, reject) =>
                      setTimeout(
                        () => reject(new Error('Lock timeout')),
                        timeout
                      )
                    );

                    const value = await Promise.race([
                      existingLock,
                      timeoutPromise,
                    ]);

                    return value as A;
                  },
                  (error) =>
                    operationError('Failed to wait for lock', error)
                );
              }

              // Create a new lock and store it
              const loadPromise = pipe(
                loadFromSource,
                TE.chainFirst((value) => backend.set(key, value, ttl)),
                TE.fold(
                  (error) => async () => {
                    locks.delete(key);
                    throw error;
                  },
                  (value) => async () => {
                    locks.delete(key);
                    return value;
                  }
                )
              )();

              locks.set(key, loadPromise);

              return TE.tryCatch(
                async () => loadPromise,
                (error) =>
                  operationError('Failed to load from source', error)
              );
            },
            // Cache hit: return cached value
            (value) => TE.right(value)
          )
        )
      )
    );

/**
 * Cache-aside with stampede prevention and namespace support
 */
export const cacheAsideWithStampedePreventionAndConfig = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);

  if (!config.preventStampede) {
    return cacheAside(namespacedKey, loadFromSource, config.defaultTTL);
  }

  return cacheAsideWithStampedePrevention(
    namespacedKey,
    loadFromSource,
    config.defaultTTL,
    config.stampedeTimeout
  );
};

// ============================================================================
// Write-Through Pattern
// ============================================================================

/**
 * Write-through pattern
 *
 * When data is written:
 * 1. Write to cache
 * 2. Write to source
 * 3. Return success only if both succeed
 */
export const writeThrough = <A>(
  key: CacheKey,
  value: A,
  writeToSource: TE.TaskEither<CacheError, void>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.set(key, value, ttl),
      TE.chain(() => writeToSource)
    );

/**
 * Write-through with namespace support
 */
export const writeThroughWithConfig = <A>(
  key: CacheKey,
  value: A,
  writeToSource: TE.TaskEither<CacheError, void>,
  config: CacheConfig = defaultCacheConfig
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> => {
  const namespacedKey = namespaceKey(config.namespace)(key);
  return writeThrough(namespacedKey, value, writeToSource, config.defaultTTL);
};

// ============================================================================
// Write-Behind Pattern (Write-Back)
// ============================================================================

/**
 * Write-behind pattern (also known as write-back)
 *
 * When data is written:
 * 1. Write to cache immediately
 * 2. Queue write to source for later (async)
 * 3. Return success immediately
 *
 * Note: This is a simplified implementation. Production systems would need
 * a proper queue and retry mechanism.
 */
export const writeBehind = <A>(
  key: CacheKey,
  value: A,
  writeToSource: TE.TaskEither<CacheError, void>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, void>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.set(key, value, ttl),
      TE.chainFirst(() => {
        // Queue the write to source (fire and forget)
        writeToSource().catch(() => {
          // In production, this should be logged and retried
        });
        return TE.right(undefined);
      })
    );

// ============================================================================
// Read-Through Pattern
// ============================================================================

/**
 * Read-through pattern
 *
 * The cache sits in front of the data source and automatically
 * loads data on cache miss. This is similar to cache-aside but
 * the cache is responsible for loading data.
 */
export const readThrough = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  ttl: O.Option<TTL> = O.none
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  cacheAside(key, loadFromSource, ttl);

// ============================================================================
// Refresh-Ahead Pattern
// ============================================================================

/**
 * Refresh-ahead pattern
 *
 * Proactively refresh cache entries before they expire.
 * This reduces the chance of cache misses and improves performance.
 */
export const refreshAhead = <A>(
  key: CacheKey,
  loadFromSource: TE.TaskEither<CacheError, A>,
  ttl: TTL,
  refreshThreshold: number = 0.75 // Refresh when 75% of TTL has elapsed
): R.Reader<CacheBackend, TE.TaskEither<CacheError, A>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.get<A>(key),
      TE.chain((maybeValue) =>
        pipe(
          maybeValue,
          O.fold(
            // Cache miss: load and store
            () =>
              pipe(
                loadFromSource,
                TE.chainFirst((value) => backend.set(key, value, O.some(ttl)))
              ),
            // Cache hit: check if we should refresh
            (value) => {
              // In a real implementation, we would check the entry's age
              // and trigger a background refresh if needed.
              // For now, just return the cached value.
              return TE.right(value);
            }
          )
        )
      )
    );

// ============================================================================
// Invalidation Strategies
// ============================================================================

/**
 * Time-based invalidation (TTL)
 * This is built into the cache backends
 */

/**
 * Event-based invalidation
 * Invalidate cache when an event occurs
 */
export const invalidateOnEvent = (
  key: CacheKey
): R.Reader<CacheBackend, TE.TaskEither<CacheError, boolean>> =>
  (backend: CacheBackend) => backend.delete(key);

/**
 * Pattern-based invalidation
 * Invalidate all keys matching a pattern
 */
export const invalidatePattern = (
  pattern: string
): R.Reader<CacheBackend, TE.TaskEither<CacheError, number>> =>
  (backend: CacheBackend) => backend.deletePattern(pattern);

/**
 * Tag-based invalidation
 * Invalidate all cache entries with a specific tag
 * Tags are implemented as namespaces
 */
export const invalidateByTag = (
  tag: string
): R.Reader<CacheBackend, TE.TaskEither<CacheError, number>> =>
  invalidatePattern(`${tag}:*`);

/**
 * Dependency-based invalidation
 * Invalidate a cache entry and all its dependencies
 */
export const invalidateWithDependencies = (
  key: CacheKey,
  dependencies: readonly CacheKey[]
): R.Reader<CacheBackend, TE.TaskEither<CacheError, number>> =>
  (backend: CacheBackend) =>
    pipe(
      backend.delete(key),
      TE.chain(() =>
        pipe(
          dependencies,
          TE.traverseArray((dep) => backend.delete(dep)),
          TE.map((results) => results.filter(Boolean).length + 1)
        )
      )
    );

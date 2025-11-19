/**
 * @djed/cache - Memory backend
 *
 * In-memory cache backend with LRU eviction and TTL support.
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  CacheBackend,
  CacheEntry,
  CacheError,
  CacheKey,
  TTL,
  MemoryCacheConfig,
  defaultMemoryCacheConfig,
} from '../types';

// ============================================================================
// Memory Cache Backend
// ============================================================================

/**
 * Create an in-memory cache backend
 */
export const createMemoryBackend = (config: MemoryCacheConfig = defaultMemoryCacheConfig): CacheBackend => {
  // Internal state
  const store = new Map<CacheKey, CacheEntry<unknown>>();
  let cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Check if an entry has expired
   */
  const isExpired = (entry: CacheEntry<unknown>): boolean =>
    pipe(
      entry.expiresAt,
      O.fold(
        () => false,
        (expiresAt) => Date.now() > expiresAt
      )
    );

  /**
   * Remove expired entries from the cache
   */
  const cleanupExpired = (): void => {
    const keysToDelete: CacheKey[] = [];

    for (const [key, entry] of store.entries()) {
      if (isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => store.delete(key));
  };

  /**
   * Evict oldest entry if max size is reached (LRU)
   */
  const evictIfNeeded = (): void => {
    pipe(
      config.maxSize,
      O.fold(
        () => {},
        (maxSize) => {
          if (store.size >= maxSize) {
            // Get the first key (oldest) and delete it
            const firstKey = store.keys().next().value;
            if (firstKey !== undefined) {
              store.delete(firstKey);
            }
          }
        }
      )
    );
  };

  /**
   * Start cleanup timer
   */
  const startCleanup = (): void => {
    pipe(
      config.cleanupInterval,
      O.fold(
        () => {},
        (interval) => {
          cleanupTimer = setInterval(cleanupExpired, interval);
        }
      )
    );
  };

  /**
   * Stop cleanup timer
   */
  const stopCleanup = (): void => {
    if (cleanupTimer !== null) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };

  // Start cleanup on creation
  startCleanup();

  // Implementation of CacheBackend interface
  return {
    get: <A>(key: CacheKey): TE.TaskEither<CacheError, O.Option<A>> =>
      TE.tryCatch(
        async () => {
          const entry = store.get(key);

          if (entry === undefined) {
            return O.none;
          }

          if (isExpired(entry as CacheEntry<A>)) {
            store.delete(key);
            return O.none;
          }

          // Move to end for LRU
          store.delete(key);
          store.set(key, entry);

          return O.some(entry.value as A);
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to get value from memory cache',
          cause: error,
        })
      ),

    set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          evictIfNeeded();

          const now = Date.now();
          const expiresAt = pipe(
            ttl,
            O.map((t) => now + t)
          );

          const entry: CacheEntry<A> = {
            value,
            expiresAt,
            createdAt: now,
          };

          // Remove if exists to update position
          store.delete(key);
          store.set(key, entry as CacheEntry<unknown>);
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to set value in memory cache',
          cause: error,
        })
      ),

    delete: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      TE.tryCatch(
        async () => store.delete(key),
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to delete value from memory cache',
          cause: error,
        })
      ),

    has: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      TE.tryCatch(
        async () => {
          const entry = store.get(key);

          if (entry === undefined) {
            return false;
          }

          if (isExpired(entry)) {
            store.delete(key);
            return false;
          }

          return true;
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to check key existence in memory cache',
          cause: error,
        })
      ),

    clear: (): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          store.clear();
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to clear memory cache',
          cause: error,
        })
      ),

    deletePattern: (pattern: string): TE.TaskEither<CacheError, number> =>
      TE.tryCatch(
        async () => {
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );

          let count = 0;
          const keysToDelete: CacheKey[] = [];

          for (const key of store.keys()) {
            if (regex.test(key)) {
              keysToDelete.push(key);
            }
          }

          keysToDelete.forEach((key) => {
            if (store.delete(key)) {
              count++;
            }
          });

          return count;
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to delete pattern from memory cache',
          cause: error,
        })
      ),

    keys: (pattern: string): TE.TaskEither<CacheError, readonly CacheKey[]> =>
      TE.tryCatch(
        async () => {
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );

          const matchingKeys: CacheKey[] = [];

          for (const key of store.keys()) {
            if (regex.test(key)) {
              matchingKeys.push(key);
            }
          }

          return matchingKeys;
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to get keys from memory cache',
          cause: error,
        })
      ),

    close: (): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          stopCleanup();
          store.clear();
        },
        (error) => ({
          _tag: 'OperationError' as const,
          message: 'Failed to close memory cache',
          cause: error,
        })
      ),
  };
};

/**
 * Create a memory backend with default configuration
 */
export const createDefaultMemoryBackend = (): CacheBackend =>
  createMemoryBackend(defaultMemoryCacheConfig);

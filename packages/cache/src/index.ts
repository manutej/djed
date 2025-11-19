/**
 * @djed/cache - Functional caching with IO monad
 *
 * A functional approach to caching with support for multiple backends,
 * TTL management, and advanced caching strategies.
 *
 * @example
 * ```typescript
 * import { createMemoryBackend, get, set, cacheAside } from '@djed/cache';
 * import * as O from 'fp-ts/Option';
 * import * as TE from 'fp-ts/TaskEither';
 * import { pipe } from 'fp-ts/function';
 *
 * // Create a backend
 * const cache = createMemoryBackend();
 *
 * // L1: Simple operations
 * const result = await pipe(
 *   set('user:123', { name: 'Alice' }, O.some(60000)),
 *   (setter) => setter(cache)
 * )();
 *
 * // L2: Cache-aside pattern
 * const loadUser = TE.right({ name: 'Bob' });
 * const user = await pipe(
 *   cacheAside('user:456', loadUser, O.some(60000)),
 *   (getter) => getter(cache)
 * )();
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export {
  // Core types
  TTL,
  CacheKey,
  CacheEntry,
  CacheError,
  CacheBackend,
  CacheConfig,
  // TTL Monoid
  TTLMonoid,
  TTLPresets,
  // Configuration types
  MemoryCacheConfig,
  RedisCacheConfig,
  FileCacheConfig,
  // Default configurations
  defaultCacheConfig,
  defaultMemoryCacheConfig,
  defaultRedisCacheConfig,
  defaultFileCacheConfig,
  // Error constructors
  connectionError,
  serializationError,
  deserializationError,
  operationError,
  notFoundError,
  // Utilities
  namespaceKey,
  unnamespacedKey,
} from './types';

// ============================================================================
// Core Operations (L1, L2, L3)
// ============================================================================

export {
  // L1: Simple operations
  get,
  getWithNamespace,
  set,
  setWithConfig,
  del,
  delWithNamespace,
  has,
  hasWithNamespace,
  clear,
  // L2: TTL, namespaces, and patterns
  setWithTTL,
  setWithTTLSeconds,
  combineTTL,
  setMany,
  getMany,
  deletePattern,
  deleteNamespace,
  keys,
  keysInNamespace,
  // L3: Advanced operations
  getOrSet,
  getOrSetWithConfig,
  refresh,
  refreshWithConfig,
  invalidateAndRefresh,
  update,
  modify,
  close,
  // Utilities
  withNamespace,
  withDefaultTTL,
} from './core';

// ============================================================================
// Backends
// ============================================================================

export {
  createMemoryBackend,
  createDefaultMemoryBackend,
} from './backends/memory';

export {
  createRedisBackend,
  createDefaultRedisBackend,
  createRedisBackendFromUrl,
} from './backends/redis';

export {
  createFileBackend,
  createDefaultFileBackend,
} from './backends/file';

// ============================================================================
// Strategies
// ============================================================================

export {
  // Cache-aside
  cacheAside,
  cacheAsideWithConfig,
  // Stampede prevention
  cacheAsideWithStampedePrevention,
  cacheAsideWithStampedePreventionAndConfig,
  // Write patterns
  writeThrough,
  writeThroughWithConfig,
  writeBehind,
  // Read patterns
  readThrough,
  refreshAhead,
  // Invalidation
  invalidateOnEvent,
  invalidatePattern,
  invalidateByTag,
  invalidateWithDependencies,
} from './strategies';

// ============================================================================
// Convenience Re-exports from fp-ts
// ============================================================================

// Re-export commonly used fp-ts functions for convenience
export { pipe, flow } from 'fp-ts/function';

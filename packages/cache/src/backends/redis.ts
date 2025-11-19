/**
 * @djed/cache - Redis backend
 *
 * Redis cache backend with distributed caching support.
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  CacheBackend,
  CacheError,
  CacheKey,
  TTL,
  RedisCacheConfig,
  defaultRedisCacheConfig,
  connectionError,
  serializationError,
  deserializationError,
  operationError,
} from '../types';

// ============================================================================
// Redis Backend (requires ioredis peer dependency)
// ============================================================================

/**
 * Create a Redis cache backend
 * Requires ioredis to be installed as a peer dependency
 */
export const createRedisBackend = (config: RedisCacheConfig = defaultRedisCacheConfig): CacheBackend => {
  // Lazy load ioredis to avoid errors when not installed
  let Redis: any;
  try {
    Redis = require('ioredis');
  } catch (error) {
    throw new Error(
      'ioredis is required for Redis backend. Install it with: npm install ioredis'
    );
  }

  // Create Redis client
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: pipe(config.password, O.toUndefined),
    db: config.db,
    connectTimeout: config.connectionTimeout,
    commandTimeout: config.commandTimeout,
    tls: config.tls ? {} : undefined,
    lazyConnect: true,
  });

  let isConnected = false;

  /**
   * Ensure connection is established
   */
  const ensureConnection = TE.tryCatch(
    async () => {
      if (!isConnected) {
        await client.connect();
        isConnected = true;
      }
    },
    (error) => connectionError(`Failed to connect to Redis: ${error}`)
  );

  /**
   * Serialize a value to JSON string
   */
  const serialize = <A>(value: A): TE.TaskEither<CacheError, string> =>
    TE.tryCatch(
      async () => JSON.stringify(value),
      (error) => serializationError('Failed to serialize value', error)
    );

  /**
   * Deserialize a JSON string to a value
   */
  const deserialize = <A>(json: string): TE.TaskEither<CacheError, A> =>
    TE.tryCatch(
      async () => JSON.parse(json) as A,
      (error) => deserializationError('Failed to deserialize value', error)
    );

  // Implementation of CacheBackend interface
  return {
    get: <A>(key: CacheKey): TE.TaskEither<CacheError, O.Option<A>> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const value = await client.get(key);
              return value;
            },
            (error) => operationError('Failed to get value from Redis', error)
          )
        ),
        TE.chain((value) =>
          value === null
            ? TE.right(O.none)
            : pipe(
                deserialize<A>(value),
                TE.map(O.some)
              )
        )
      ),

    set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureConnection,
        TE.chain(() => serialize(value)),
        TE.chain((serialized) =>
          TE.tryCatch(
            async () => {
              pipe(
                ttl,
                O.fold(
                  () => client.set(key, serialized),
                  (t) => client.set(key, serialized, 'PX', t) // PX = milliseconds
                )
              );
            },
            (error) => operationError('Failed to set value in Redis', error)
          )
        ),
        TE.map(() => undefined)
      ),

    delete: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const result = await client.del(key);
              return result > 0;
            },
            (error) => operationError('Failed to delete value from Redis', error)
          )
        )
      ),

    has: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const result = await client.exists(key);
              return result > 0;
            },
            (error) => operationError('Failed to check key existence in Redis', error)
          )
        )
      ),

    clear: (): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              await client.flushdb();
            },
            (error) => operationError('Failed to clear Redis cache', error)
          )
        )
      ),

    deletePattern: (pattern: string): TE.TaskEither<CacheError, number> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const keys = await client.keys(pattern);
              if (keys.length === 0) {
                return 0;
              }
              const result = await client.del(...keys);
              return result;
            },
            (error) => operationError('Failed to delete pattern from Redis', error)
          )
        )
      ),

    keys: (pattern: string): TE.TaskEither<CacheError, readonly CacheKey[]> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const keys = await client.keys(pattern);
              return keys as readonly CacheKey[];
            },
            (error) => operationError('Failed to get keys from Redis', error)
          )
        )
      ),

    close: (): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          if (isConnected) {
            await client.quit();
            isConnected = false;
          }
        },
        (error) => operationError('Failed to close Redis connection', error)
      ),
  };
};

/**
 * Create a Redis backend with default configuration
 */
export const createDefaultRedisBackend = (): CacheBackend =>
  createRedisBackend(defaultRedisCacheConfig);

/**
 * Create a Redis backend from connection string
 */
export const createRedisBackendFromUrl = (url: string): CacheBackend => {
  let Redis: any;
  try {
    Redis = require('ioredis');
  } catch (error) {
    throw new Error(
      'ioredis is required for Redis backend. Install it with: npm install ioredis'
    );
  }

  const client = new Redis(url, {
    lazyConnect: true,
  });

  let isConnected = false;

  const ensureConnection = TE.tryCatch(
    async () => {
      if (!isConnected) {
        await client.connect();
        isConnected = true;
      }
    },
    (error) => connectionError(`Failed to connect to Redis: ${error}`)
  );

  const serialize = <A>(value: A): TE.TaskEither<CacheError, string> =>
    TE.tryCatch(
      async () => JSON.stringify(value),
      (error) => serializationError('Failed to serialize value', error)
    );

  const deserialize = <A>(json: string): TE.TaskEither<CacheError, A> =>
    TE.tryCatch(
      async () => JSON.parse(json) as A,
      (error) => deserializationError('Failed to deserialize value', error)
    );

  return {
    get: <A>(key: CacheKey): TE.TaskEither<CacheError, O.Option<A>> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const value = await client.get(key);
              return value;
            },
            (error) => operationError('Failed to get value from Redis', error)
          )
        ),
        TE.chain((value) =>
          value === null
            ? TE.right(O.none)
            : pipe(
                deserialize<A>(value),
                TE.map(O.some)
              )
        )
      ),

    set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureConnection,
        TE.chain(() => serialize(value)),
        TE.chain((serialized) =>
          TE.tryCatch(
            async () => {
              pipe(
                ttl,
                O.fold(
                  () => client.set(key, serialized),
                  (t) => client.set(key, serialized, 'PX', t)
                )
              );
            },
            (error) => operationError('Failed to set value in Redis', error)
          )
        ),
        TE.map(() => undefined)
      ),

    delete: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const result = await client.del(key);
              return result > 0;
            },
            (error) => operationError('Failed to delete value from Redis', error)
          )
        )
      ),

    has: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const result = await client.exists(key);
              return result > 0;
            },
            (error) => operationError('Failed to check key existence in Redis', error)
          )
        )
      ),

    clear: (): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              await client.flushdb();
            },
            (error) => operationError('Failed to clear Redis cache', error)
          )
        )
      ),

    deletePattern: (pattern: string): TE.TaskEither<CacheError, number> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const keys = await client.keys(pattern);
              if (keys.length === 0) {
                return 0;
              }
              const result = await client.del(...keys);
              return result;
            },
            (error) => operationError('Failed to delete pattern from Redis', error)
          )
        )
      ),

    keys: (pattern: string): TE.TaskEither<CacheError, readonly CacheKey[]> =>
      pipe(
        ensureConnection,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const keys = await client.keys(pattern);
              return keys as readonly CacheKey[];
            },
            (error) => operationError('Failed to get keys from Redis', error)
          )
        )
      ),

    close: (): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          if (isConnected) {
            await client.quit();
            isConnected = false;
          }
        },
        (error) => operationError('Failed to close Redis connection', error)
      ),
  };
};

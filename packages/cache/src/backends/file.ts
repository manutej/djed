/**
 * @djed/cache - File backend
 *
 * File-based cache backend with TTL support.
 */

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  CacheBackend,
  CacheEntry,
  CacheError,
  CacheKey,
  TTL,
  FileCacheConfig,
  defaultFileCacheConfig,
  operationError,
  serializationError,
  deserializationError,
} from '../types';

// ============================================================================
// File Cache Backend
// ============================================================================

/**
 * Create a file-based cache backend
 */
export const createFileBackend = (config: FileCacheConfig = defaultFileCacheConfig): CacheBackend => {
  let cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Hash a cache key to create a safe filename
   */
  const hashKey = (key: CacheKey): string => {
    const hash = createHash('sha256').update(key).digest('hex');
    return hash;
  };

  /**
   * Get the file path for a cache key
   */
  const getFilePath = (key: CacheKey): string => {
    const filename = hashKey(key) + config.extension;
    return path.join(config.directory, filename);
  };

  /**
   * Ensure cache directory exists
   */
  const ensureDirectory = TE.tryCatch(
    async () => {
      await fs.mkdir(config.directory, { recursive: true });
    },
    (error) => operationError('Failed to create cache directory', error)
  );

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
   * Clean up expired cache files
   */
  const cleanupExpired = async (): Promise<void> => {
    try {
      const files = await fs.readdir(config.directory);

      for (const file of files) {
        if (file.endsWith(config.extension)) {
          const filePath = path.join(config.directory, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content) as CacheEntry<unknown>;

            if (isExpired(entry)) {
              await fs.unlink(filePath);
            }
          } catch {
            // Ignore errors reading individual files
          }
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
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
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const filePath = getFilePath(key);
              const content = await fs.readFile(filePath, 'utf-8');
              return content;
            },
            (error: any) => {
              // File not found is not an error, just return None
              if (error.code === 'ENOENT') {
                return null as any; // Signal for None
              }
              return operationError('Failed to read cache file', error);
            }
          )
        ),
        TE.chain((content) => {
          if (content === null) {
            return TE.right(O.none);
          }

          return pipe(
            TE.tryCatch(
              async () => JSON.parse(content) as CacheEntry<A>,
              (error) => deserializationError('Failed to parse cache file', error)
            ),
            TE.chain((entry) => {
              if (isExpired(entry)) {
                // Delete expired file asynchronously
                const filePath = getFilePath(key);
                fs.unlink(filePath).catch(() => {});
                return TE.right(O.none);
              }

              return TE.right(O.some(entry.value));
            })
          );
        })
      ),

    set: <A>(key: CacheKey, value: A, ttl: O.Option<TTL>): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureDirectory,
        TE.chain(() => {
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

          return pipe(
            TE.tryCatch(
              async () => JSON.stringify(entry, null, 2),
              (error) => serializationError('Failed to serialize cache entry', error)
            ),
            TE.chain((content) =>
              TE.tryCatch(
                async () => {
                  const filePath = getFilePath(key);
                  await fs.writeFile(filePath, content, 'utf-8');
                },
                (error) => operationError('Failed to write cache file', error)
              )
            )
          );
        })
      ),

    delete: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const filePath = getFilePath(key);
              await fs.unlink(filePath);
              return true;
            },
            (error: any) => {
              // File not found is not an error, just return false
              if (error.code === 'ENOENT') {
                return false as any;
              }
              return operationError('Failed to delete cache file', error);
            }
          )
        ),
        TE.orElse((error) => {
          if (typeof error === 'boolean') {
            return TE.right(error);
          }
          return TE.left(error);
        })
      ),

    has: (key: CacheKey): TE.TaskEither<CacheError, boolean> =>
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const filePath = getFilePath(key);
              await fs.access(filePath);

              // Check if expired
              const content = await fs.readFile(filePath, 'utf-8');
              const entry = JSON.parse(content) as CacheEntry<unknown>;

              if (isExpired(entry)) {
                await fs.unlink(filePath);
                return false;
              }

              return true;
            },
            (error: any) => {
              // File not found is not an error, just return false
              if (error.code === 'ENOENT') {
                return false as any;
              }
              return operationError('Failed to check cache file', error);
            }
          )
        ),
        TE.orElse((error) => {
          if (typeof error === 'boolean') {
            return TE.right(error);
          }
          return TE.left(error);
        })
      ),

    clear: (): TE.TaskEither<CacheError, void> =>
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const files = await fs.readdir(config.directory);

              for (const file of files) {
                if (file.endsWith(config.extension)) {
                  const filePath = path.join(config.directory, file);
                  await fs.unlink(filePath);
                }
              }
            },
            (error) => operationError('Failed to clear cache directory', error)
          )
        )
      ),

    deletePattern: (pattern: string): TE.TaskEither<CacheError, number> =>
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              // For file backend, we store the original key in the entry metadata
              // We need to read all files to match the pattern
              const regex = new RegExp(
                '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
              );

              const files = await fs.readdir(config.directory);
              let count = 0;

              for (const file of files) {
                if (file.endsWith(config.extension)) {
                  const filePath = path.join(config.directory, file);
                  try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const entry = JSON.parse(content) as CacheEntry<unknown> & { key?: string };

                    // If we have the original key stored, match against it
                    // Otherwise, we can't match patterns reliably for file backend
                    if (entry.key && regex.test(entry.key)) {
                      await fs.unlink(filePath);
                      count++;
                    }
                  } catch {
                    // Ignore errors reading individual files
                  }
                }
              }

              return count;
            },
            (error) => operationError('Failed to delete pattern from cache', error)
          )
        )
      ),

    keys: (pattern: string): TE.TaskEither<CacheError, readonly CacheKey[]> =>
      pipe(
        ensureDirectory,
        TE.chain(() =>
          TE.tryCatch(
            async () => {
              const regex = new RegExp(
                '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
              );

              const files = await fs.readdir(config.directory);
              const matchingKeys: CacheKey[] = [];

              for (const file of files) {
                if (file.endsWith(config.extension)) {
                  const filePath = path.join(config.directory, file);
                  try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const entry = JSON.parse(content) as CacheEntry<unknown> & { key?: string };

                    if (entry.key && regex.test(entry.key)) {
                      matchingKeys.push(entry.key);
                    }
                  } catch {
                    // Ignore errors reading individual files
                  }
                }
              }

              return matchingKeys as readonly CacheKey[];
            },
            (error) => operationError('Failed to get keys from cache', error)
          )
        )
      ),

    close: (): TE.TaskEither<CacheError, void> =>
      TE.tryCatch(
        async () => {
          stopCleanup();
        },
        (error) => operationError('Failed to close file cache', error)
      ),
  };
};

/**
 * Create a file backend with default configuration
 */
export const createDefaultFileBackend = (): CacheBackend =>
  createFileBackend(defaultFileCacheConfig);

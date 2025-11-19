/**
 * @djed/database - Connection Pooling
 *
 * Connection pool management with support for multiple database backends.
 * Implements safe resource acquisition and release patterns.
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import {
  ConnectionConfig,
  PoolConfig,
  Pool,
  Connection,
  DatabaseError,
  QueryResult,
  Row,
} from './types';
import { mkDatabaseError } from './core';

// ============================================================================
// Database Backend Adapters
// ============================================================================

/**
 * Postgres pool adapter using pg library
 */
const createPostgresPool = (
  config: ConnectionConfig,
  poolConfig?: PoolConfig
): E.Either<DatabaseError, Pool> => {
  try {
    // Dynamic import for optional peer dependency
    const pg = require('pg');
    const { Pool: PgPool } = pg;

    const pool = new PgPool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 30000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      max: poolConfig?.max || config.maxConnections || 10,
      min: poolConfig?.min || 0,
    });

    // Wrap pg.Client in our Connection interface
    const wrapConnection = (client: any): Connection => ({
      query: <T = Row>(sql: string, params?: readonly unknown[]) =>
        TE.tryCatch(
          async () => {
            const result = await client.query(sql, params || []);
            return {
              rows: result.rows,
              rowCount: result.rowCount || 0,
              command: result.command || '',
              fields: result.fields?.map((f: any) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
              })),
            } as QueryResult<T>;
          },
          (error) =>
            mkDatabaseError('QueryError', 'Query execution failed', {
              query: sql,
              params,
              originalError: error,
            })
        ),

      release: () =>
        TE.tryCatch(
          async () => {
            client.release();
            return undefined;
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to release connection', {
              originalError: error,
            })
        ),
    });

    // Implement Pool interface
    const poolImpl: Pool = {
      acquire: () =>
        TE.tryCatch(
          async () => {
            const client = await pool.connect();
            return wrapConnection(client);
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to acquire connection', {
              originalError: error,
            })
        ),

      end: () =>
        TE.tryCatch(
          async () => {
            await pool.end();
            return undefined;
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to end pool', {
              originalError: error,
            })
        ),

      get totalCount(): number {
        return pool.totalCount;
      },

      get idleCount(): number {
        return pool.idleCount;
      },

      get waitingCount(): number {
        return pool.waitingCount;
      },
    };

    return E.right(poolImpl);
  } catch (error) {
    return E.left(
      mkDatabaseError('ConnectionError', 'Failed to create Postgres pool', {
        originalError: error,
        context: { config },
      })
    );
  }
};

/**
 * MySQL pool adapter using mysql2 library
 */
const createMySQLPool = (
  config: ConnectionConfig,
  poolConfig?: PoolConfig
): E.Either<DatabaseError, Pool> => {
  try {
    // Dynamic import for optional peer dependency
    const mysql = require('mysql2/promise');

    const pool = mysql.createPool({
      host: config.host || 'localhost',
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: poolConfig?.max || config.maxConnections || 10,
      waitForConnections: true,
      queueLimit: 0,
    });

    // Wrap mysql2 connection in our Connection interface
    const wrapConnection = (conn: any): Connection => ({
      query: <T = Row>(sql: string, params?: readonly unknown[]) =>
        TE.tryCatch(
          async () => {
            const [rows, fields] = await conn.query(sql, params || []);
            return {
              rows: Array.isArray(rows) ? rows : [],
              rowCount: Array.isArray(rows) ? rows.length : 0,
              command: sql.split(' ')[0].toUpperCase(),
              fields: fields?.map((f: any) => ({
                name: f.name,
                dataType: f.type,
              })),
            } as QueryResult<T>;
          },
          (error) =>
            mkDatabaseError('QueryError', 'Query execution failed', {
              query: sql,
              params,
              originalError: error,
            })
        ),

      release: () =>
        TE.tryCatch(
          async () => {
            conn.release();
            return undefined;
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to release connection', {
              originalError: error,
            })
        ),
    });

    const poolImpl: Pool = {
      acquire: () =>
        TE.tryCatch(
          async () => {
            const conn = await pool.getConnection();
            return wrapConnection(conn);
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to acquire connection', {
              originalError: error,
            })
        ),

      end: () =>
        TE.tryCatch(
          async () => {
            await pool.end();
            return undefined;
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to end pool', {
              originalError: error,
            })
        ),

      // MySQL2 doesn't expose these stats directly
      get totalCount(): number {
        return 0;
      },
      get idleCount(): number {
        return 0;
      },
      get waitingCount(): number {
        return 0;
      },
    };

    return E.right(poolImpl);
  } catch (error) {
    return E.left(
      mkDatabaseError('ConnectionError', 'Failed to create MySQL pool', {
        originalError: error,
        context: { config },
      })
    );
  }
};

/**
 * SQLite pool adapter using better-sqlite3 library
 * Note: SQLite doesn't support true connection pooling, this is a simplified adapter
 */
const createSQLitePool = (
  config: ConnectionConfig,
  poolConfig?: PoolConfig
): E.Either<DatabaseError, Pool> => {
  try {
    // Dynamic import for optional peer dependency
    const Database = require('better-sqlite3');

    if (!config.filename) {
      return E.left(
        mkDatabaseError('ValidationError', 'SQLite requires filename in config')
      );
    }

    const db = new Database(config.filename);

    // SQLite connection wrapper
    const createConnection = (): Connection => ({
      query: <T = Row>(sql: string, params?: readonly unknown[]) =>
        TE.tryCatch(
          async () => {
            const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
            let rows: any[];

            if (isSelect) {
              const stmt = db.prepare(sql);
              rows = stmt.all(...(params || []));
            } else {
              const stmt = db.prepare(sql);
              const info = stmt.run(...(params || []));
              rows = [];
            }

            return {
              rows: rows as T[],
              rowCount: rows.length,
              command: sql.split(' ')[0].toUpperCase(),
            } as QueryResult<T>;
          },
          (error) =>
            mkDatabaseError('QueryError', 'Query execution failed', {
              query: sql,
              params,
              originalError: error,
            })
        ),

      release: () => TE.right(undefined), // No-op for SQLite
    });

    const poolImpl: Pool = {
      acquire: () => TE.right(createConnection()),

      end: () =>
        TE.tryCatch(
          async () => {
            db.close();
            return undefined;
          },
          (error) =>
            mkDatabaseError('ConnectionError', 'Failed to close database', {
              originalError: error,
            })
        ),

      get totalCount(): number {
        return 1;
      },
      get idleCount(): number {
        return 1;
      },
      get waitingCount(): number {
        return 0;
      },
    };

    return E.right(poolImpl);
  } catch (error) {
    return E.left(
      mkDatabaseError('ConnectionError', 'Failed to create SQLite connection', {
        originalError: error,
        context: { config },
      })
    );
  }
};

// ============================================================================
// Pool Creation
// ============================================================================

/**
 * Create a connection pool for the specified database backend
 *
 * @example
 * ```ts
 * const poolE = createPool({
 *   backend: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'user',
 *   password: 'password'
 * });
 * ```
 */
export const createPool = (
  config: ConnectionConfig,
  poolConfig?: PoolConfig
): E.Either<DatabaseError, Pool> => {
  switch (config.backend) {
    case 'postgres':
      return createPostgresPool(config, poolConfig);
    case 'mysql':
      return createMySQLPool(config, poolConfig);
    case 'sqlite':
      return createSQLitePool(config, poolConfig);
    default:
      return E.left(
        mkDatabaseError(
          'ValidationError',
          `Unsupported database backend: ${config.backend}`
        )
      );
  }
};

/**
 * Create a connection pool with TaskEither
 */
export const createPoolTE = (
  config: ConnectionConfig,
  poolConfig?: PoolConfig
): TE.TaskEither<DatabaseError, Pool> => TE.fromEither(createPool(config, poolConfig));

// ============================================================================
// Connection Bracket Pattern
// ============================================================================

/**
 * Execute an operation with a connection from the pool.
 * Automatically acquires and releases the connection.
 *
 * This is the recommended way to work with connections as it guarantees
 * proper cleanup.
 *
 * @example
 * ```ts
 * const result = await withConnection(pool)(async (conn) =>
 *   conn.query('SELECT * FROM users', [])
 * )();
 * ```
 */
export const withConnection =
  (pool: Pool) =>
  <A>(
    operation: (conn: Connection) => TE.TaskEither<DatabaseError, A>
  ): TE.TaskEither<DatabaseError, A> =>
    pipe(
      // Acquire connection
      pool.acquire(),

      // Use connection
      TE.chain((conn) =>
        pipe(
          operation(conn),

          // Release on success
          TE.chainFirst(() => conn.release()),

          // Release on error
          TE.orElse((err) =>
            pipe(
              conn.release(),
              TE.chain(() => TE.left(err))
            )
          )
        )
      )
    );

// ============================================================================
// Pool Statistics and Management
// ============================================================================

/**
 * Get pool statistics
 */
export const getPoolStats = (
  pool: Pool
): { total: number; idle: number; waiting: number } => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
});

/**
 * Check if pool is healthy (has idle connections available)
 */
export const isPoolHealthy = (pool: Pool): boolean => pool.idleCount > 0;

/**
 * Wait for pool to have available connections
 */
export const waitForPool = (
  pool: Pool,
  timeoutMs: number = 5000
): TE.TaskEither<DatabaseError, void> =>
  TE.tryCatch(
    () =>
      new Promise<void>((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
          if (isPoolHealthy(pool)) {
            resolve();
          } else if (Date.now() - startTime > timeoutMs) {
            reject(new Error('Pool health check timeout'));
          } else {
            setTimeout(check, 100);
          }
        };

        check();
      }),
    (error) =>
      mkDatabaseError('Timeout', 'Pool health check timeout', {
        originalError: error,
      })
  );

/**
 * Gracefully shutdown pool
 */
export const shutdownPool = (pool: Pool): TE.TaskEither<DatabaseError, void> =>
  pipe(
    pool.end(),
    TE.mapLeft((err) =>
      mkDatabaseError('ConnectionError', 'Failed to shutdown pool', {
        originalError: err,
      })
    )
  );

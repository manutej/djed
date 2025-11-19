/**
 * @djed/database - Transaction Management
 *
 * Transaction support with bracket pattern for safe resource management.
 * Implements automatic rollback on error and proper cleanup.
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import {
  Connection,
  Transaction,
  TransactionConfig,
  DatabaseError,
  Pool,
  QueryResult,
  Row,
} from './types';
import { mkDatabaseError } from './core';

// ============================================================================
// Transaction Implementation
// ============================================================================

/**
 * Create a transaction from a connection
 */
const createTransaction = (conn: Connection, config?: TransactionConfig): Transaction => {
  let isCommitted = false;
  let isRolledBack = false;

  const ensureNotFinalized = (): TE.TaskEither<DatabaseError, void> =>
    isCommitted || isRolledBack
      ? TE.left(
          mkDatabaseError('TransactionError', 'Transaction already finalized')
        )
      : TE.right(undefined);

  return {
    query: <T = Row>(sql: string, params?: readonly unknown[]) =>
      pipe(
        ensureNotFinalized(),
        TE.chain(() => conn.query<T>(sql, params))
      ),

    commit: () =>
      pipe(
        ensureNotFinalized(),
        TE.chain(() => conn.query('COMMIT', [])),
        TE.map(() => {
          isCommitted = true;
          return undefined;
        })
      ),

    rollback: () =>
      pipe(
        ensureNotFinalized(),
        TE.chain(() => conn.query('ROLLBACK', [])),
        TE.map(() => {
          isRolledBack = true;
          return undefined;
        })
      ),
  };
};

/**
 * Build transaction BEGIN statement with configuration
 */
const buildBeginStatement = (config?: TransactionConfig): string => {
  const parts: string[] = ['BEGIN'];

  if (config?.isolationLevel) {
    parts.push(`ISOLATION LEVEL ${config.isolationLevel}`);
  }

  if (config?.readOnly) {
    parts.push('READ ONLY');
  }

  if (config?.deferrable) {
    parts.push('DEFERRABLE');
  }

  return parts.join(' ');
};

/**
 * Begin a transaction
 */
const beginTransaction = (
  conn: Connection,
  config?: TransactionConfig
): TE.TaskEither<DatabaseError, Transaction> =>
  pipe(
    conn.query(buildBeginStatement(config), []),
    TE.map(() => createTransaction(conn, config))
  );

// ============================================================================
// Bracket Pattern for Transactions
// ============================================================================

/**
 * Execute an operation within a transaction using bracket pattern.
 * Automatically commits on success or rolls back on error.
 *
 * This is the recommended way to work with transactions as it guarantees
 * proper cleanup and rollback in case of errors.
 *
 * @example
 * ```ts
 * const transferMoney = (from: number, to: number, amount: number) =>
 *   withTransaction()(async (tx) =>
 *     pipe(
 *       tx.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]),
 *       TE.chain(() =>
 *         tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to])
 *       )
 *     )
 *   );
 * ```
 */
export const withTransaction =
  (config?: TransactionConfig) =>
  <A>(
    operation: (tx: Transaction) => TE.TaskEither<DatabaseError, A>
  ) =>
  (conn: Connection): TE.TaskEither<DatabaseError, A> =>
    pipe(
      // Acquire: Begin transaction
      beginTransaction(conn, config),

      // Use: Execute operation
      TE.chain((tx) =>
        pipe(
          operation(tx),

          // Success: Commit
          TE.chainFirst(() => tx.commit()),

          // Error: Rollback
          TE.orElse((err) =>
            pipe(
              tx.rollback(),
              TE.chain(() => TE.left(err))
            )
          )
        )
      )
    );

/**
 * Execute an operation within a transaction from a pool.
 * Acquires a connection, runs the transaction, and releases the connection.
 *
 * @example
 * ```ts
 * const result = await withTransactionFromPool(pool)()(async (tx) =>
 *   tx.query('INSERT INTO users (name) VALUES ($1)', ['Alice'])
 * )();
 * ```
 */
export const withTransactionFromPool =
  (pool: Pool) =>
  (config?: TransactionConfig) =>
  <A>(
    operation: (tx: Transaction) => TE.TaskEither<DatabaseError, A>
  ): TE.TaskEither<DatabaseError, A> =>
    pipe(
      // Acquire connection
      pool.acquire(),

      // Use connection with transaction
      TE.chain((conn) =>
        pipe(
          withTransaction(config)(operation)(conn),

          // Release connection
          TE.chainFirst(() => conn.release()),

          // Ensure release even on error
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
// Savepoints for Nested Transactions
// ============================================================================

/**
 * Create a savepoint within a transaction
 */
export const savepoint = (name: string) => (tx: Transaction): TE.TaskEither<DatabaseError, void> =>
  pipe(
    tx.query(`SAVEPOINT ${name}`, []),
    TE.map(() => undefined)
  );

/**
 * Release a savepoint
 */
export const releaseSavepoint = (name: string) => (
  tx: Transaction
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    tx.query(`RELEASE SAVEPOINT ${name}`, []),
    TE.map(() => undefined)
  );

/**
 * Rollback to a savepoint
 */
export const rollbackToSavepoint = (name: string) => (
  tx: Transaction
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    tx.query(`ROLLBACK TO SAVEPOINT ${name}`, []),
    TE.map(() => undefined)
  );

/**
 * Execute an operation within a savepoint.
 * Automatically releases savepoint on success or rolls back on error.
 *
 * @example
 * ```ts
 * const result = await withTransaction()(async (tx) =>
 *   pipe(
 *     tx.query('INSERT INTO users (name) VALUES ($1)', ['Alice']),
 *     TE.chain(() =>
 *       withSavepoint('inner')(tx)(async (tx) =>
 *         tx.query('INSERT INTO logs (message) VALUES ($1)', ['User created'])
 *       )
 *     )
 *   )
 * )();
 * ```
 */
export const withSavepoint =
  (name: string) =>
  (tx: Transaction) =>
  <A>(
    operation: (tx: Transaction) => TE.TaskEither<DatabaseError, A>
  ): TE.TaskEither<DatabaseError, A> =>
    pipe(
      // Acquire: Create savepoint
      savepoint(name)(tx),

      // Use: Execute operation
      TE.chain(() =>
        pipe(
          operation(tx),

          // Success: Release savepoint
          TE.chainFirst(() => releaseSavepoint(name)(tx)),

          // Error: Rollback to savepoint
          TE.orElse((err) =>
            pipe(
              rollbackToSavepoint(name)(tx),
              TE.chain(() => TE.left(err))
            )
          )
        )
      )
    );

// ============================================================================
// Transaction Utilities
// ============================================================================

/**
 * Execute multiple operations in a single transaction sequentially
 */
export const transactSequence =
  <A>(operations: readonly ((tx: Transaction) => TE.TaskEither<DatabaseError, A>)[]) =>
  (tx: Transaction): TE.TaskEither<DatabaseError, readonly A[]> =>
    pipe(
      operations,
      TE.traverseSeqArray((op) => op(tx))
    );

/**
 * Execute multiple operations in a single transaction in parallel.
 * Note: Be careful with parallel execution in transactions as it may
 * cause deadlocks depending on the operations.
 */
export const transactParallel =
  <A>(operations: readonly ((tx: Transaction) => TE.TaskEither<DatabaseError, A>)[]) =>
  (tx: Transaction): TE.TaskEither<DatabaseError, readonly A[]> =>
    pipe(
      operations,
      TE.traverseArray((op) => op(tx))
    );

/**
 * Retry a transaction operation on certain errors
 */
export const retryTransaction =
  (maxRetries: number, retryableErrors: readonly string[] = ['40001', '40P01']) =>
  <A>(
    operation: (tx: Transaction) => TE.TaskEither<DatabaseError, A>
  ) =>
  (conn: Connection): TE.TaskEither<DatabaseError, A> => {
    const attempt = (retriesLeft: number): TE.TaskEither<DatabaseError, A> =>
      pipe(
        withTransaction()(operation)(conn),
        TE.orElse((err) => {
          // Check if error is retryable and we have retries left
          const isRetryable =
            err.originalError &&
            typeof err.originalError === 'object' &&
            'code' in err.originalError &&
            typeof err.originalError.code === 'string' &&
            retryableErrors.includes(err.originalError.code);

          if (isRetryable && retriesLeft > 0) {
            // Exponential backoff
            const delay = Math.pow(2, maxRetries - retriesLeft) * 100;
            return pipe(
              TE.fromTask(T.delay(delay)(T.of(undefined))),
              TE.chain(() => attempt(retriesLeft - 1))
            );
          }

          return TE.left(err);
        })
      );

    return attempt(maxRetries);
  };

/**
 * Check if currently in a transaction
 */
export const inTransaction = (conn: Connection): TE.TaskEither<DatabaseError, boolean> =>
  pipe(
    conn.query<{ in_transaction: boolean }>(
      'SELECT current_setting(\'transaction_isolation\') != \'read uncommitted\' as in_transaction',
      []
    ),
    TE.map((result) => result.rows[0]?.in_transaction ?? false)
  );

/**
 * Get current transaction isolation level
 */
export const getIsolationLevel = (
  conn: Connection
): TE.TaskEither<DatabaseError, string> =>
  pipe(
    conn.query<{ transaction_isolation: string }>(
      'SHOW transaction_isolation',
      []
    ),
    TE.map((result) => result.rows[0]?.transaction_isolation ?? 'unknown')
  );

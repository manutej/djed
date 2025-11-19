/**
 * @djed/database
 *
 * Type-safe database operations with TaskEither for LUXOR projects.
 *
 * Features:
 * - Progressive API (L1: Simple queries, L2: Transactions/joins, L3: Full query builder)
 * - TaskEither for async database operations
 * - Reader for connection/config injection
 * - Bracket pattern for resource management
 * - Transaction support with automatic rollback
 * - Connection pooling
 * - Migration management
 * - Row parsing with validation
 * - Support for Postgres, MySQL, SQLite
 *
 * @example
 * ```ts
 * import { createPoolTE, withConnection, select, insert } from '@djed/database';
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 *
 * // Create pool
 * const poolTE = createPoolTE({
 *   backend: 'postgres',
 *   host: 'localhost',
 *   database: 'mydb',
 *   user: 'user',
 *   password: 'password'
 * });
 *
 * // Use pool with connection
 * const result = await pipe(
 *   poolTE,
 *   TE.chain(pool =>
 *     withConnection(pool)(conn =>
 *       select('users', ['id', 'name'])(conn)
 *     )
 *   )
 * )();
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Backend types
  DatabaseBackend,
  ConnectionConfig,
  PoolConfig,

  // Error types
  DatabaseErrorType,
  DatabaseError,

  // Query types
  Query,
  Row,
  QueryResult,
  FieldInfo,

  // Connection types
  Connection,
  Pool,

  // Transaction types
  IsolationLevel,
  TransactionConfig,
  Transaction,

  // Query builder types
  WhereOperator,
  WhereCondition,
  JoinType,
  JoinClause,
  OrderDirection,
  OrderByClause,
  SelectQueryBuilder,
  InsertQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,

  // Migration types
  Migration,
  MigrationStatus,
  MigrationPlan,

  // Parser types
  RowParser,
  RowValidator,

  // Context types
  DatabaseContext,
  DatabaseOperation,
} from './types';

// ============================================================================
// Core Query Operations (L1: Simple)
// ============================================================================

export {
  // Error constructors
  mkDatabaseError,
  queryError,
  validationError,

  // Simple queries
  executeQuery,
  select,
  selectWhere,
  insert,
  insertReturning,
  update,
  updateReturning,
  deleteFrom,
  deleteReturning,

  // L2: Query builders
  selectBuilder,
  where,
  join,
  orderBy,
  limit,
  offset,
  groupBy,
  executeSelect,

  // L3: Advanced builders
  insertBuilder,
  insertMany,
  returning,
  executeInsert,

  // Row parsing
  parseRows,
  parseOne,
  parseOptional,
  rowParser,

  // Query composition
  sequence,
  parallel,

  // Database context
  runQuery,
} from './core';

// ============================================================================
// Transaction Management
// ============================================================================

export {
  // Transaction bracket pattern
  withTransaction,
  withTransactionFromPool,

  // Savepoints
  savepoint,
  releaseSavepoint,
  rollbackToSavepoint,
  withSavepoint,

  // Transaction utilities
  transactSequence,
  transactParallel,
  retryTransaction,
  inTransaction,
  getIsolationLevel,
} from './transaction';

// ============================================================================
// Connection Pooling
// ============================================================================

export {
  // Pool creation
  createPool,
  createPoolTE,

  // Connection management
  withConnection,

  // Pool utilities
  getPoolStats,
  isPoolHealthy,
  waitForPool,
  shutdownPool,
} from './pool';

// ============================================================================
// Migration Management
// ============================================================================

export {
  // Migration execution
  migrate,
  rollback,
  getMigrationStatus,
  isMigrated,
  resetDatabase,

  // Migration planning
  createMigrationPlan,

  // Migration utilities
  createMigration,
  sqlMigration,
  generateMigrationId,
  formatMigrationStatus,
} from './migration';

// ============================================================================
// Re-exports from fp-ts for convenience
// ============================================================================

// Note: Users should install fp-ts as a peer dependency
// These are just type re-exports for convenience
export type { TaskEither } from 'fp-ts/TaskEither';
export type { Reader } from 'fp-ts/Reader';
export type { Either } from 'fp-ts/Either';

/**
 * @djed/database - Type Definitions
 *
 * Core types for type-safe database operations with fp-ts.
 */

import { TaskEither } from 'fp-ts/TaskEither';
import { Reader } from 'fp-ts/Reader';

// ============================================================================
// Database Backend Types
// ============================================================================

/**
 * Supported database backends
 */
export type DatabaseBackend = 'postgres' | 'mysql' | 'sqlite';

/**
 * Database connection configuration
 */
export interface ConnectionConfig {
  readonly backend: DatabaseBackend;
  readonly host?: string;
  readonly port?: number;
  readonly database: string;
  readonly user?: string;
  readonly password?: string;
  readonly filename?: string; // For SQLite
  readonly ssl?: boolean | { rejectUnauthorized?: boolean };
  readonly connectionTimeoutMillis?: number;
  readonly idleTimeoutMillis?: number;
  readonly maxConnections?: number;
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  readonly min?: number;
  readonly max?: number;
  readonly acquireTimeoutMillis?: number;
  readonly createTimeoutMillis?: number;
  readonly destroyTimeoutMillis?: number;
  readonly idleTimeoutMillis?: number;
  readonly reapIntervalMillis?: number;
  readonly createRetryIntervalMillis?: number;
}

// ============================================================================
// Database Error Types
// ============================================================================

/**
 * Database error categories
 */
export type DatabaseErrorType =
  | 'ConnectionError'
  | 'QueryError'
  | 'TransactionError'
  | 'ValidationError'
  | 'ConstraintViolation'
  | 'NotFound'
  | 'Timeout'
  | 'Unknown';

/**
 * Database error with context
 */
export interface DatabaseError {
  readonly type: DatabaseErrorType;
  readonly message: string;
  readonly query?: string;
  readonly params?: readonly unknown[];
  readonly originalError?: unknown;
  readonly context?: Record<string, unknown>;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * SQL query with parameters
 */
export interface Query {
  readonly sql: string;
  readonly params: readonly unknown[];
}

/**
 * Query result row (generic, can be validated later)
 */
export type Row = Record<string, unknown>;

/**
 * Query result
 */
export interface QueryResult<T = Row> {
  readonly rows: readonly T[];
  readonly rowCount: number;
  readonly command: string;
  readonly fields?: readonly FieldInfo[];
}

/**
 * Field information from query result
 */
export interface FieldInfo {
  readonly name: string;
  readonly dataTypeID?: number;
  readonly dataType?: string;
}

// ============================================================================
// Connection Types
// ============================================================================

/**
 * Database connection interface
 */
export interface Connection {
  readonly query: <T = Row>(
    sql: string,
    params?: readonly unknown[]
  ) => TaskEither<DatabaseError, QueryResult<T>>;
  readonly release: () => TaskEither<DatabaseError, void>;
}

/**
 * Connection pool interface
 */
export interface Pool {
  readonly acquire: () => TaskEither<DatabaseError, Connection>;
  readonly end: () => TaskEither<DatabaseError, void>;
  readonly totalCount: number;
  readonly idleCount: number;
  readonly waitingCount: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction isolation level
 */
export type IsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

/**
 * Transaction configuration
 */
export interface TransactionConfig {
  readonly isolationLevel?: IsolationLevel;
  readonly readOnly?: boolean;
  readonly deferrable?: boolean;
}

/**
 * Transaction context
 */
export interface Transaction {
  readonly query: <T = Row>(
    sql: string,
    params?: readonly unknown[]
  ) => TaskEither<DatabaseError, QueryResult<T>>;
  readonly commit: () => TaskEither<DatabaseError, void>;
  readonly rollback: () => TaskEither<DatabaseError, void>;
}

// ============================================================================
// Query Builder Types
// ============================================================================

/**
 * WHERE clause operator
 */
export type WhereOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN';

/**
 * WHERE clause condition
 */
export interface WhereCondition {
  readonly field: string;
  readonly operator: WhereOperator;
  readonly value?: unknown;
  readonly values?: readonly unknown[];
}

/**
 * JOIN type
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

/**
 * JOIN clause
 */
export interface JoinClause {
  readonly type: JoinType;
  readonly table: string;
  readonly on: string;
}

/**
 * ORDER BY direction
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * ORDER BY clause
 */
export interface OrderByClause {
  readonly field: string;
  readonly direction: OrderDirection;
}

/**
 * SELECT query builder state
 */
export interface SelectQueryBuilder {
  readonly table: string;
  readonly columns: readonly string[];
  readonly where: readonly WhereCondition[];
  readonly joins: readonly JoinClause[];
  readonly orderBy: readonly OrderByClause[];
  readonly limit?: number;
  readonly offset?: number;
  readonly groupBy: readonly string[];
  readonly having?: string;
}

/**
 * INSERT query builder state
 */
export interface InsertQueryBuilder {
  readonly table: string;
  readonly values: readonly Record<string, unknown>[];
  readonly returning: readonly string[];
  readonly onConflict?: {
    readonly target: readonly string[];
    readonly action: 'DO NOTHING' | { readonly update: readonly string[] };
  };
}

/**
 * UPDATE query builder state
 */
export interface UpdateQueryBuilder {
  readonly table: string;
  readonly set: Record<string, unknown>;
  readonly where: readonly WhereCondition[];
  readonly returning: readonly string[];
}

/**
 * DELETE query builder state
 */
export interface DeleteQueryBuilder {
  readonly table: string;
  readonly where: readonly WhereCondition[];
  readonly returning: readonly string[];
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration definition
 */
export interface Migration {
  readonly id: string;
  readonly name: string;
  readonly up: (conn: Connection) => TaskEither<DatabaseError, void>;
  readonly down: (conn: Connection) => TaskEither<DatabaseError, void>;
  readonly timestamp: number;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  readonly id: string;
  readonly name: string;
  readonly appliedAt: Date;
  readonly executionTimeMs: number;
}

/**
 * Migration plan
 */
export interface MigrationPlan {
  readonly pending: readonly Migration[];
  readonly applied: readonly MigrationStatus[];
}

// ============================================================================
// Row Parser Types
// ============================================================================

/**
 * Row parser - validates and transforms database rows
 */
export type RowParser<E, A> = (row: Row) => TaskEither<E, A>;

/**
 * Row validator using Reader for dependency injection
 */
export type RowValidator<E, A> = Reader<Row, TaskEither<E, A>>;

// ============================================================================
// Database Context Types
// ============================================================================

/**
 * Database context for Reader pattern
 */
export interface DatabaseContext {
  readonly pool: Pool;
  readonly config: ConnectionConfig;
}

/**
 * Database operation with Reader and TaskEither
 */
export type DatabaseOperation<A> = Reader<
  DatabaseContext,
  TaskEither<DatabaseError, A>
>;

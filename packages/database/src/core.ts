/**
 * @djed/database - Core Query Builder
 *
 * Type-safe query builder with TaskEither for database operations.
 * Progressive API: L1 (simple), L2 (transactions/joins), L3 (full builder)
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Reader';
import {
  Connection,
  DatabaseError,
  Query,
  QueryResult,
  Row,
  WhereCondition,
  SelectQueryBuilder,
  InsertQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
  JoinClause,
  OrderByClause,
  RowParser,
  DatabaseContext,
} from './types';

// ============================================================================
// Error Constructors
// ============================================================================

/**
 * Create a DatabaseError
 */
export const mkDatabaseError = (
  type: DatabaseError['type'],
  message: string,
  context?: Partial<DatabaseError>
): DatabaseError => ({
  type,
  message,
  ...context,
});

/**
 * Create a query error
 */
export const queryError = (message: string, query?: string): DatabaseError =>
  mkDatabaseError('QueryError', message, { query });

/**
 * Create a validation error
 */
export const validationError = (message: string): DatabaseError =>
  mkDatabaseError('ValidationError', message);

// ============================================================================
// Query Building Utilities
// ============================================================================

/**
 * Build WHERE clause from conditions
 */
const buildWhereClause = (
  conditions: readonly WhereCondition[],
  startIndex: number = 1
): { clause: string; params: unknown[] } => {
  if (conditions.length === 0) {
    return { clause: '', params: [] };
  }

  let paramIndex = startIndex;
  const params: unknown[] = [];
  const clauses: string[] = [];

  for (const cond of conditions) {
    switch (cond.operator) {
      case 'IS NULL':
        clauses.push(`${cond.field} IS NULL`);
        break;
      case 'IS NOT NULL':
        clauses.push(`${cond.field} IS NOT NULL`);
        break;
      case 'IN':
      case 'NOT IN':
        if (cond.values && cond.values.length > 0) {
          const placeholders = cond.values
            .map(() => `$${paramIndex++}`)
            .join(', ');
          clauses.push(`${cond.field} ${cond.operator} (${placeholders})`);
          params.push(...cond.values);
        }
        break;
      case 'BETWEEN':
        if (cond.values && cond.values.length === 2) {
          clauses.push(
            `${cond.field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`
          );
          paramIndex += 2;
          params.push(...cond.values);
        }
        break;
      default:
        clauses.push(`${cond.field} ${cond.operator} $${paramIndex++}`);
        params.push(cond.value);
    }
  }

  return {
    clause: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
};

/**
 * Build JOIN clauses
 */
const buildJoinClauses = (joins: readonly JoinClause[]): string =>
  joins.map((j) => `${j.type} JOIN ${j.table} ON ${j.on}`).join(' ');

/**
 * Build ORDER BY clause
 */
const buildOrderByClause = (orderBy: readonly OrderByClause[]): string =>
  orderBy.length > 0
    ? `ORDER BY ${orderBy.map((o) => `${o.field} ${o.direction}`).join(', ')}`
    : '';

// ============================================================================
// L1: Simple Query Operations
// ============================================================================

/**
 * Execute a raw SQL query
 */
export const executeQuery =
  <T = Row>(query: Query) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<T>> =>
    conn.query<T>(query.sql, query.params);

/**
 * Execute a simple SELECT query
 */
export const select =
  (table: string, columns: readonly string[] = ['*']) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const cols = columns.join(', ');
    const sql = `SELECT ${cols} FROM ${table}`;
    return conn.query(sql, []);
  };

/**
 * Execute a SELECT query with WHERE conditions
 */
export const selectWhere =
  (
    table: string,
    conditions: readonly WhereCondition[],
    columns: readonly string[] = ['*']
  ) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const cols = columns.join(', ');
    const { clause, params } = buildWhereClause(conditions);
    const sql = `SELECT ${cols} FROM ${table} ${clause}`;
    return conn.query(sql, params);
  };

/**
 * Execute an INSERT query
 */
export const insert =
  (table: string, values: Record<string, unknown>) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const columns = Object.keys(values);
    const params = Object.values(values);
    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    return conn.query(sql, params);
  };

/**
 * Execute an INSERT query with RETURNING clause
 */
export const insertReturning =
  (
    table: string,
    values: Record<string, unknown>,
    returning: readonly string[] = ['*']
  ) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const columns = Object.keys(values);
    const params = Object.values(values);
    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ${returning.join(', ')}`;
    return conn.query(sql, params);
  };

/**
 * Execute an UPDATE query
 */
export const update =
  (table: string, set: Record<string, unknown>, conditions: readonly WhereCondition[]) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const setColumns = Object.keys(set);
    const setParams = Object.values(set);
    const setClause = setColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const { clause, params } = buildWhereClause(conditions, setParams.length + 1);
    const sql = `UPDATE ${table} SET ${setClause} ${clause}`;

    return conn.query(sql, [...setParams, ...params]);
  };

/**
 * Execute an UPDATE query with RETURNING clause
 */
export const updateReturning =
  (
    table: string,
    set: Record<string, unknown>,
    conditions: readonly WhereCondition[],
    returning: readonly string[] = ['*']
  ) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const setColumns = Object.keys(set);
    const setParams = Object.values(set);
    const setClause = setColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const { clause, params } = buildWhereClause(conditions, setParams.length + 1);
    const sql = `UPDATE ${table} SET ${setClause} ${clause} RETURNING ${returning.join(', ')}`;

    return conn.query(sql, [...setParams, ...params]);
  };

/**
 * Execute a DELETE query
 */
export const deleteFrom =
  (table: string, conditions: readonly WhereCondition[]) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const { clause, params } = buildWhereClause(conditions);
    const sql = `DELETE FROM ${table} ${clause}`;
    return conn.query(sql, params);
  };

/**
 * Execute a DELETE query with RETURNING clause
 */
export const deleteReturning =
  (table: string, conditions: readonly WhereCondition[], returning: readonly string[] = ['*']) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<Row>> => {
    const { clause, params } = buildWhereClause(conditions);
    const sql = `DELETE FROM ${table} ${clause} RETURNING ${returning.join(', ')}`;
    return conn.query(sql, params);
  };

// ============================================================================
// L2: Query Builder with Joins and Advanced Features
// ============================================================================

/**
 * Build a SELECT query from builder state
 */
const buildSelectQuery = (builder: SelectQueryBuilder): Query => {
  const cols = builder.columns.length > 0 ? builder.columns.join(', ') : '*';
  const joins = buildJoinClauses(builder.joins);
  const { clause: whereClause, params } = buildWhereClause(builder.where);
  const orderBy = buildOrderByClause(builder.orderBy);
  const groupBy =
    builder.groupBy.length > 0 ? `GROUP BY ${builder.groupBy.join(', ')}` : '';
  const having = builder.having ? `HAVING ${builder.having}` : '';
  const limit = builder.limit !== undefined ? `LIMIT ${builder.limit}` : '';
  const offset = builder.offset !== undefined ? `OFFSET ${builder.offset}` : '';

  const sql = [
    `SELECT ${cols}`,
    `FROM ${builder.table}`,
    joins,
    whereClause,
    groupBy,
    having,
    orderBy,
    limit,
    offset,
  ]
    .filter((s) => s.length > 0)
    .join(' ');

  return { sql, params };
};

/**
 * Create a SELECT query builder
 */
export const selectBuilder = (table: string, columns: readonly string[] = ['*']): SelectQueryBuilder => ({
  table,
  columns,
  where: [],
  joins: [],
  orderBy: [],
  groupBy: [],
});

/**
 * Add WHERE condition to SELECT builder
 */
export const where = (condition: WhereCondition) => (
  builder: SelectQueryBuilder
): SelectQueryBuilder => ({
  ...builder,
  where: [...builder.where, condition],
});

/**
 * Add JOIN clause to SELECT builder
 */
export const join = (joinClause: JoinClause) => (
  builder: SelectQueryBuilder
): SelectQueryBuilder => ({
  ...builder,
  joins: [...builder.joins, joinClause],
});

/**
 * Add ORDER BY clause to SELECT builder
 */
export const orderBy = (field: string, direction: 'ASC' | 'DESC' = 'ASC') => (
  builder: SelectQueryBuilder
): SelectQueryBuilder => ({
  ...builder,
  orderBy: [...builder.orderBy, { field, direction }],
});

/**
 * Add LIMIT to SELECT builder
 */
export const limit = (n: number) => (builder: SelectQueryBuilder): SelectQueryBuilder => ({
  ...builder,
  limit: n,
});

/**
 * Add OFFSET to SELECT builder
 */
export const offset = (n: number) => (builder: SelectQueryBuilder): SelectQueryBuilder => ({
  ...builder,
  offset: n,
});

/**
 * Add GROUP BY to SELECT builder
 */
export const groupBy = (...fields: string[]) => (
  builder: SelectQueryBuilder
): SelectQueryBuilder => ({
  ...builder,
  groupBy: [...builder.groupBy, ...fields],
});

/**
 * Execute a SELECT query builder
 */
export const executeSelect =
  <T = Row>(builder: SelectQueryBuilder) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<T>> => {
    const query = buildSelectQuery(builder);
    return conn.query<T>(query.sql, query.params);
  };

// ============================================================================
// L3: Full Query Builder with Type Inference
// ============================================================================

/**
 * Build an INSERT query from builder state
 */
const buildInsertQuery = (builder: InsertQueryBuilder): Query => {
  if (builder.values.length === 0) {
    return { sql: '', params: [] };
  }

  const columns = Object.keys(builder.values[0]);
  const allParams: unknown[] = [];
  const valueSets: string[] = [];

  builder.values.forEach((row, rowIndex) => {
    const rowParams = columns.map((col) => row[col]);
    const placeholders = rowParams.map(
      (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`
    );
    valueSets.push(`(${placeholders.join(', ')})`);
    allParams.push(...rowParams);
  });

  let sql = `INSERT INTO ${builder.table} (${columns.join(', ')}) VALUES ${valueSets.join(', ')}`;

  if (builder.onConflict) {
    const target = builder.onConflict.target.join(', ');
    if (builder.onConflict.action === 'DO NOTHING') {
      sql += ` ON CONFLICT (${target}) DO NOTHING`;
    } else {
      const updateCols = builder.onConflict.action.update
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(', ');
      sql += ` ON CONFLICT (${target}) DO UPDATE SET ${updateCols}`;
    }
  }

  if (builder.returning.length > 0) {
    sql += ` RETURNING ${builder.returning.join(', ')}`;
  }

  return { sql, params: allParams };
};

/**
 * Create an INSERT query builder
 */
export const insertBuilder = (table: string, values: Record<string, unknown>): InsertQueryBuilder => ({
  table,
  values: [values],
  returning: [],
});

/**
 * Add multiple values to INSERT builder (batch insert)
 */
export const insertMany = (values: readonly Record<string, unknown>[]) => (
  builder: InsertQueryBuilder
): InsertQueryBuilder => ({
  ...builder,
  values: [...values],
});

/**
 * Add RETURNING clause to INSERT builder
 */
export const returning = (...columns: string[]) => (
  builder: InsertQueryBuilder | UpdateQueryBuilder | DeleteQueryBuilder
): typeof builder => ({
  ...builder,
  returning: columns,
});

/**
 * Execute an INSERT query builder
 */
export const executeInsert =
  <T = Row>(builder: InsertQueryBuilder) =>
  (conn: Connection): TE.TaskEither<DatabaseError, QueryResult<T>> => {
    const query = buildInsertQuery(builder);
    return conn.query<T>(query.sql, query.params);
  };

// ============================================================================
// Row Parsing and Validation
// ============================================================================

/**
 * Parse rows from query result using a parser
 */
export const parseRows =
  <E, A>(parser: RowParser<E, A>) =>
  <T extends Row>(
    result: QueryResult<T>
  ): TE.TaskEither<E, readonly A[]> =>
    pipe(
      result.rows,
      A.traverse(TE.ApplicativeSeq)((row) => parser(row))
    );

/**
 * Parse a single row (expects exactly one row)
 */
export const parseOne =
  <E, A>(parser: RowParser<E, A>) =>
  <T extends Row>(
    result: QueryResult<T>
  ): TE.TaskEither<E | DatabaseError, A> =>
    pipe(
      result.rows,
      E.fromPredicate(
        (rows) => rows.length === 1,
        () => mkDatabaseError('NotFound', 'Expected exactly one row, got ' + result.rows.length)
      ),
      E.map((rows) => rows[0]),
      TE.fromEither,
      TE.chain(parser)
    );

/**
 * Parse an optional row (expects 0 or 1 row)
 */
export const parseOptional =
  <E, A>(parser: RowParser<E, A>) =>
  <T extends Row>(
    result: QueryResult<T>
  ): TE.TaskEither<E | DatabaseError, A | null> =>
    pipe(
      result.rows,
      E.fromPredicate(
        (rows) => rows.length <= 1,
        () => mkDatabaseError('QueryError', 'Expected at most one row, got ' + result.rows.length)
      ),
      E.map((rows) => (rows.length === 0 ? null : rows[0])),
      TE.fromEither,
      TE.chain((row) => (row === null ? TE.right(null) : parser(row)))
    );

/**
 * Create a simple row parser from a validation function
 */
export const rowParser =
  <E, A>(validate: (row: Row) => E.Either<E, A>): RowParser<E, A> =>
  (row: Row) =>
    TE.fromEither(validate(row));

// ============================================================================
// Query Composition
// ============================================================================

/**
 * Compose multiple queries in sequence
 */
export const sequence = <A>(
  queries: readonly ((conn: Connection) => TE.TaskEither<DatabaseError, A>)[]
) => (conn: Connection): TE.TaskEither<DatabaseError, readonly A[]> =>
  pipe(
    queries,
    A.traverse(TE.ApplicativeSeq)((q) => q(conn))
  );

/**
 * Execute queries in parallel
 */
export const parallel = <A>(
  queries: readonly ((conn: Connection) => TE.TaskEither<DatabaseError, A>)[]
) => (conn: Connection): TE.TaskEither<DatabaseError, readonly A[]> =>
  pipe(
    queries,
    A.traverse(TE.ApplicativePar)((q) => q(conn))
  );

// ============================================================================
// Database Context Operations (Reader Pattern)
// ============================================================================

/**
 * Run a query operation with database context
 */
export const runQuery = <A>(
  operation: (conn: Connection) => TE.TaskEither<DatabaseError, A>
): R.Reader<DatabaseContext, TE.TaskEither<DatabaseError, A>> =>
  (ctx: DatabaseContext) =>
    pipe(
      ctx.pool.acquire(),
      TE.chain((conn) =>
        pipe(
          operation(conn),
          TE.chainFirst(() => conn.release())
        )
      )
    );

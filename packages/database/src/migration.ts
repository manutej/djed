/**
 * @djed/database - Migration Management
 *
 * Database migration management with type-safe operations.
 * Supports up/down migrations, rollback, and migration status tracking.
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import {
  Pool,
  Connection,
  DatabaseError,
  Migration,
  MigrationStatus,
  MigrationPlan,
} from './types';
import { mkDatabaseError } from './core';
import { withConnection } from './pool';
import { withTransaction } from './transaction';

// ============================================================================
// Migration Table Management
// ============================================================================

/**
 * Name of the migrations tracking table
 */
const MIGRATIONS_TABLE = 'djed_migrations';

/**
 * Create migrations tracking table if it doesn't exist
 */
const ensureMigrationsTable = (
  conn: Connection
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    conn.query(
      `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER NOT NULL
      )
    `,
      []
    ),
    TE.map(() => undefined)
  );

/**
 * Get all applied migrations from the database
 */
const getAppliedMigrations = (
  conn: Connection
): TE.TaskEither<DatabaseError, readonly MigrationStatus[]> =>
  pipe(
    ensureMigrationsTable(conn),
    TE.chain(() =>
      conn.query<{
        id: string;
        name: string;
        applied_at: Date;
        execution_time_ms: number;
      }>(
        `SELECT id, name, applied_at, execution_time_ms FROM ${MIGRATIONS_TABLE} ORDER BY applied_at ASC`,
        []
      )
    ),
    TE.map((result) =>
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        appliedAt: new Date(row.applied_at),
        executionTimeMs: row.execution_time_ms,
      }))
    )
  );

/**
 * Record a migration as applied
 */
const recordMigration = (
  conn: Connection,
  migration: Migration,
  executionTimeMs: number
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    conn.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (id, name, execution_time_ms) VALUES ($1, $2, $3)`,
      [migration.id, migration.name, executionTimeMs]
    ),
    TE.map(() => undefined)
  );

/**
 * Remove a migration record
 */
const removeMigration = (
  conn: Connection,
  migrationId: string
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    conn.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE id = $1`, [migrationId]),
    TE.map(() => undefined)
  );

// ============================================================================
// Migration Planning
// ============================================================================

/**
 * Create a migration plan by comparing available migrations with applied ones
 */
export const createMigrationPlan = (
  migrations: readonly Migration[]
) => (conn: Connection): TE.TaskEither<DatabaseError, MigrationPlan> =>
  pipe(
    getAppliedMigrations(conn),
    TE.map((applied) => {
      const appliedIds = new Set(applied.map((m) => m.id));

      const pending = migrations.filter((m) => !appliedIds.has(m.id));

      return {
        pending: pending.sort((a, b) => a.timestamp - b.timestamp),
        applied: applied,
      };
    })
  );

/**
 * Validate migration consistency
 */
const validateMigrations = (
  available: readonly Migration[],
  applied: readonly MigrationStatus[]
): E.Either<DatabaseError, void> => {
  // Check for missing migrations
  const availableIds = new Set(available.map((m) => m.id));
  const missingMigrations = applied.filter((m) => !availableIds.has(m.id));

  if (missingMigrations.length > 0) {
    return E.left(
      mkDatabaseError(
        'ValidationError',
        `Missing migration files: ${missingMigrations.map((m) => m.id).join(', ')}`,
        {
          context: { missingMigrations },
        }
      )
    );
  }

  // Check for duplicate IDs
  const idCounts = new Map<string, number>();
  for (const m of available) {
    idCounts.set(m.id, (idCounts.get(m.id) || 0) + 1);
  }

  const duplicates = Array.from(idCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);

  if (duplicates.length > 0) {
    return E.left(
      mkDatabaseError(
        'ValidationError',
        `Duplicate migration IDs: ${duplicates.join(', ')}`
      )
    );
  }

  return E.right(undefined);
};

// ============================================================================
// Migration Execution
// ============================================================================

/**
 * Execute a single migration (up)
 */
const executeMigrationUp = (migration: Migration) => (
  conn: Connection
): TE.TaskEither<DatabaseError, number> => {
  const startTime = Date.now();

  return pipe(
    withTransaction()(async (tx) =>
      pipe(
        migration.up(tx),
        TE.chain(() => {
          const executionTime = Date.now() - startTime;
          return recordMigration(tx, migration, executionTime);
        }),
        TE.map(() => Date.now() - startTime)
      )
    )(conn)
  );
};

/**
 * Execute a single migration (down)
 */
const executeMigrationDown = (migration: Migration) => (
  conn: Connection
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    withTransaction()(async (tx) =>
      pipe(
        migration.down(tx),
        TE.chain(() => removeMigration(tx, migration.id))
      )
    )(conn)
  );

// ============================================================================
// Public API
// ============================================================================

/**
 * Run pending migrations
 *
 * @example
 * ```ts
 * const migrations = [
 *   {
 *     id: '001',
 *     name: 'create_users_table',
 *     timestamp: 1234567890,
 *     up: (conn) => conn.query('CREATE TABLE users (...)', []),
 *     down: (conn) => conn.query('DROP TABLE users', [])
 *   }
 * ];
 *
 * const result = await migrate(migrations)(pool)();
 * ```
 */
export const migrate = (migrations: readonly Migration[]) => (
  pool: Pool
): TE.TaskEither<DatabaseError, readonly MigrationStatus[]> =>
  pipe(
    withConnection(pool)(async (conn) =>
      pipe(
        // Ensure migrations table exists
        ensureMigrationsTable(conn),

        // Get migration plan
        TE.chain(() => createMigrationPlan(migrations)(conn)),

        // Validate migrations
        TE.chainFirst((plan) =>
          TE.fromEither(validateMigrations(migrations, plan.applied))
        ),

        // Execute pending migrations
        TE.chain((plan) =>
          pipe(
            plan.pending,
            A.traverse(TE.ApplicativeSeq)((migration) =>
              pipe(
                executeMigrationUp(migration)(conn),
                TE.map((executionTime) => ({
                  id: migration.id,
                  name: migration.name,
                  appliedAt: new Date(),
                  executionTimeMs: executionTime,
                }))
              )
            )
          )
        )
      )
    )
  );

/**
 * Rollback the last N migrations
 *
 * @example
 * ```ts
 * // Rollback last migration
 * const result = await rollback(migrations, 1)(pool)();
 *
 * // Rollback all migrations
 * const result = await rollback(migrations)(pool)();
 * ```
 */
export const rollback = (
  migrations: readonly Migration[],
  count?: number
) => (pool: Pool): TE.TaskEither<DatabaseError, readonly string[]> =>
  pipe(
    withConnection(pool)(async (conn) =>
      pipe(
        // Get applied migrations
        getAppliedMigrations(conn),

        // Determine which migrations to rollback
        TE.map((applied) => {
          const toRollback = count !== undefined ? applied.slice(-count) : applied;
          return toRollback.reverse(); // Rollback in reverse order
        }),

        // Find migration definitions
        TE.chain((toRollback) =>
          pipe(
            toRollback,
            A.traverse(TE.ApplicativeSeq)((status) =>
              pipe(
                migrations.find((m) => m.id === status.id),
                O.fromNullable,
                E.fromOption(() =>
                  mkDatabaseError(
                    'ValidationError',
                    `Migration not found: ${status.id}`
                  )
                ),
                TE.fromEither,
                TE.chain((migration) =>
                  pipe(
                    executeMigrationDown(migration)(conn),
                    TE.map(() => migration.id)
                  )
                )
              )
            )
          )
        )
      )
    )
  );

/**
 * Get migration status
 */
export const getMigrationStatus = (migrations: readonly Migration[]) => (
  pool: Pool
): TE.TaskEither<DatabaseError, MigrationPlan> =>
  pipe(withConnection(pool)(createMigrationPlan(migrations)));

/**
 * Check if all migrations are applied
 */
export const isMigrated = (migrations: readonly Migration[]) => (
  pool: Pool
): TE.TaskEither<DatabaseError, boolean> =>
  pipe(
    getMigrationStatus(migrations)(pool),
    TE.map((plan) => plan.pending.length === 0)
  );

/**
 * Reset database by rolling back all migrations
 */
export const resetDatabase = (migrations: readonly Migration[]) => (
  pool: Pool
): TE.TaskEither<DatabaseError, void> =>
  pipe(
    rollback(migrations)(pool),
    TE.map(() => undefined)
  );

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Create a migration object
 */
export const createMigration = (
  id: string,
  name: string,
  up: (conn: Connection) => TE.TaskEither<DatabaseError, void>,
  down: (conn: Connection) => TE.TaskEither<DatabaseError, void>,
  timestamp: number = Date.now()
): Migration => ({
  id,
  name,
  up,
  down,
  timestamp,
});

/**
 * Create a simple SQL migration
 */
export const sqlMigration = (
  id: string,
  name: string,
  upSQL: string,
  downSQL: string,
  timestamp: number = Date.now()
): Migration =>
  createMigration(
    id,
    name,
    (conn) => pipe(conn.query(upSQL, []), TE.map(() => undefined)),
    (conn) => pipe(conn.query(downSQL, []), TE.map(() => undefined)),
    timestamp
  );

/**
 * Generate a migration ID based on timestamp
 */
export const generateMigrationId = (): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return timestamp;
};

/**
 * Format migration status for display
 */
export const formatMigrationStatus = (plan: MigrationPlan): string => {
  const lines: string[] = [];

  lines.push('Applied Migrations:');
  if (plan.applied.length === 0) {
    lines.push('  (none)');
  } else {
    for (const m of plan.applied) {
      lines.push(
        `  ${m.id} - ${m.name} (${m.appliedAt.toISOString()}, ${m.executionTimeMs}ms)`
      );
    }
  }

  lines.push('');
  lines.push('Pending Migrations:');
  if (plan.pending.length === 0) {
    lines.push('  (none)');
  } else {
    for (const m of plan.pending) {
      lines.push(`  ${m.id} - ${m.name}`);
    }
  }

  return lines.join('\n');
};

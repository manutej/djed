# @djed/database

Type-safe database operations with TaskEither for LUXOR projects.

## Overview

`@djed/database` provides a functional, type-safe approach to database operations using fp-ts. It implements:

- **Progressive API**: L1 (simple queries), L2 (transactions/joins), L3 (full query builder)
- **TaskEither**: For async database operations with error handling
- **Reader Pattern**: For dependency injection of connections and config
- **Bracket Pattern**: For safe resource management
- **Transaction Support**: With automatic rollback on error
- **Connection Pooling**: With multiple backend support
- **Migration Management**: Version control for database schema
- **Row Parsing**: With validation support

## Installation

```bash
npm install @djed/database fp-ts
# Install your database driver (peer dependency)
npm install pg  # for PostgreSQL
# or
npm install mysql2  # for MySQL
# or
npm install better-sqlite3  # for SQLite
```

## Quick Start

```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import {
  createPoolTE,
  withConnection,
  select,
  insert,
  withTransaction,
} from '@djed/database';

// Create a connection pool
const poolTE = createPoolTE({
  backend: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'user',
  password: 'password',
});

// Simple query
const getUsers = pipe(
  poolTE,
  TE.chain((pool) =>
    withConnection(pool)((conn) => select('users', ['id', 'name'])(conn))
  )
);

// Execute
const result = await getUsers();
// result: Either<DatabaseError, QueryResult>
```

## Progressive API Levels

### L1: Simple Queries

Direct, easy-to-use query functions for basic operations.

```typescript
import { select, selectWhere, insert, update, deleteFrom } from '@djed/database';

// SELECT * FROM users
const allUsers = select('users');

// SELECT id, name FROM users WHERE active = true
const activeUsers = selectWhere('users', [{ field: 'active', operator: '=', value: true }], [
  'id',
  'name',
]);

// INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
const newUser = insert('users', { name: 'Alice', email: 'alice@example.com' });

// UPDATE users SET name = 'Bob' WHERE id = 1
const updateUser = update('users', { name: 'Bob' }, [{ field: 'id', operator: '=', value: 1 }]);

// DELETE FROM users WHERE id = 1
const deleteUser = deleteFrom('users', [{ field: 'id', operator: '=', value: 1 }]);
```

### L2: Transactions and Joins

Advanced queries with transaction support and joins.

```typescript
import { withTransaction, selectBuilder, where, join, orderBy, limit } from '@djed/database';

// Transaction with automatic rollback on error
const transferMoney = (fromId: number, toId: number, amount: number) =>
  withConnection(pool)((conn) =>
    withTransaction()((tx) =>
      pipe(
        tx.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]),
        TE.chain(() =>
          tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId])
        )
      )
    )(conn)
  );

// Query with JOIN
const getUsersWithPosts = pipe(
  selectBuilder('users', ['users.id', 'users.name', 'posts.title']),
  join({
    type: 'LEFT',
    table: 'posts',
    on: 'users.id = posts.user_id',
  }),
  where({ field: 'users.active', operator: '=', value: true }),
  orderBy('users.name', 'ASC'),
  limit(10)
);
```

### L3: Full Query Builder

Complete query builder with type inference and composition.

```typescript
import {
  selectBuilder,
  insertBuilder,
  where,
  join,
  orderBy,
  groupBy,
  limit,
  offset,
  executeSelect,
  executeInsert,
  insertMany,
  returning,
} from '@djed/database';

// Complex SELECT with grouping
const query = pipe(
  selectBuilder('orders', ['customer_id', 'COUNT(*) as order_count', 'SUM(total) as total_spent']),
  join({
    type: 'INNER',
    table: 'customers',
    on: 'orders.customer_id = customers.id',
  }),
  where({ field: 'orders.status', operator: '=', value: 'completed' }),
  groupBy('customer_id'),
  orderBy('total_spent', 'DESC'),
  limit(100),
  offset(0)
);

const result = withConnection(pool)((conn) => executeSelect(query)(conn));

// Batch insert with RETURNING
const insertUsers = pipe(
  insertBuilder('users', { name: 'Alice', email: 'alice@example.com' }),
  insertMany([
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' },
  ]),
  returning('id', 'name', 'created_at')
);

const newUsers = withConnection(pool)((conn) => executeInsert(insertUsers)(conn));
```

## Connection Pooling

### Creating a Pool

```typescript
import { createPool, createPoolTE } from '@djed/database';
import * as E from 'fp-ts/Either';

// With Either
const poolE = createPool({
  backend: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'user',
  password: 'password',
  maxConnections: 20,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

// With TaskEither
const poolTE = createPoolTE({
  backend: 'postgres',
  host: 'localhost',
  database: 'mydb',
  user: 'user',
  password: 'password',
});
```

### Multiple Backend Support

```typescript
// PostgreSQL
const pgPool = createPool({
  backend: 'postgres',
  host: 'localhost',
  database: 'mydb',
  user: 'user',
  password: 'password',
});

// MySQL
const mysqlPool = createPool({
  backend: 'mysql',
  host: 'localhost',
  database: 'mydb',
  user: 'user',
  password: 'password',
});

// SQLite
const sqlitePool = createPool({
  backend: 'sqlite',
  filename: './mydb.sqlite',
  database: 'mydb',
});
```

### Using Connections Safely

The `withConnection` function implements the bracket pattern for safe resource management:

```typescript
import { withConnection } from '@djed/database';

// Connection is automatically acquired and released
const result = await pipe(
  poolTE,
  TE.chain((pool) =>
    withConnection(pool)((conn) =>
      // Connection is available here
      conn.query('SELECT * FROM users', [])
    )
  )
)();
// Connection is released even if query fails
```

### Pool Management

```typescript
import { getPoolStats, isPoolHealthy, waitForPool, shutdownPool } from '@djed/database';

// Get pool statistics
const stats = getPoolStats(pool);
console.log(stats); // { total: 10, idle: 5, waiting: 0 }

// Check pool health
const healthy = isPoolHealthy(pool);

// Wait for pool to be ready
await waitForPool(pool, 5000)();

// Graceful shutdown
await shutdownPool(pool)();
```

## Transactions

### Basic Transactions

```typescript
import { withTransaction } from '@djed/database';

const createUserWithProfile = (name: string, bio: string) =>
  withConnection(pool)((conn) =>
    withTransaction()((tx) =>
      pipe(
        tx.query('INSERT INTO users (name) VALUES ($1) RETURNING id', [name]),
        TE.chain((result) => {
          const userId = result.rows[0].id;
          return tx.query('INSERT INTO profiles (user_id, bio) VALUES ($1, $2)', [userId, bio]);
        })
      )
    )(conn)
  );

// Transaction automatically commits on success or rolls back on error
```

### Transaction Configuration

```typescript
import { withTransaction } from '@djed/database';

// Read-only transaction with serializable isolation
const readOnlyQuery = withTransaction({
  isolationLevel: 'SERIALIZABLE',
  readOnly: true,
})((tx) => tx.query('SELECT * FROM users', []));

// Available isolation levels:
// - 'READ UNCOMMITTED'
// - 'READ COMMITTED'
// - 'REPEATABLE READ'
// - 'SERIALIZABLE'
```

### Savepoints (Nested Transactions)

```typescript
import { withSavepoint } from '@djed/database';

const complexOperation = withTransaction()((tx) =>
  pipe(
    tx.query('INSERT INTO orders (total) VALUES (100)', []),
    TE.chain(() =>
      // Nested operation with savepoint
      withSavepoint('inner_operation')(tx)((tx) =>
        tx.query('INSERT INTO order_items (order_id, item) VALUES (1, "item")', [])
      )
    )
  )
);
```

### Retry on Deadlock

```typescript
import { retryTransaction } from '@djed/database';

// Automatically retry on deadlock or serialization failure
const operation = retryTransaction(3)((tx) =>
  tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 1])
);
```

## Row Parsing and Validation

### Basic Parsing

```typescript
import { parseRows, parseOne, parseOptional, rowParser } from '@djed/database';
import * as E from 'fp-ts/Either';

// Define a type
interface User {
  id: number;
  name: string;
  email: string;
}

// Create a parser
const userParser = rowParser<string, User>((row) => {
  if (typeof row.id !== 'number') {
    return E.left('Invalid id');
  }
  if (typeof row.name !== 'string') {
    return E.left('Invalid name');
  }
  if (typeof row.email !== 'string') {
    return E.left('Invalid email');
  }

  return E.right({
    id: row.id,
    name: row.name,
    email: row.email,
  });
});

// Parse query results
const users = pipe(
  select('users')(conn),
  TE.chain(parseRows(userParser))
);
// Result: TaskEither<string | DatabaseError, readonly User[]>

// Parse single row (expects exactly 1)
const user = pipe(
  selectWhere('users', [{ field: 'id', operator: '=', value: 1 }])(conn),
  TE.chain(parseOne(userParser))
);
// Result: TaskEither<string | DatabaseError, User>

// Parse optional row (expects 0 or 1)
const maybeUser = pipe(
  selectWhere('users', [{ field: 'email', operator: '=', value: 'alice@example.com' }])(conn),
  TE.chain(parseOptional(userParser))
);
// Result: TaskEither<string | DatabaseError, User | null>
```

### Integration with @djed/validation

```typescript
import { validate, string, number, object } from '@djed/validation';
import { rowParser } from '@djed/database';

const userSchema = object({
  id: number,
  name: string,
  email: string,
});

const userParser = rowParser((row) => validate(userSchema)(row));

const users = pipe(select('users')(conn), TE.chain(parseRows(userParser)));
```

## Migrations

### Creating Migrations

```typescript
import { createMigration, sqlMigration, generateMigrationId } from '@djed/database';

// SQL migration
const migration1 = sqlMigration(
  '001',
  'create_users_table',
  `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  `,
  'DROP TABLE users',
  1640000000000
);

// Programmatic migration
const migration2 = createMigration(
  '002',
  'seed_initial_data',
  (conn) =>
    pipe(
      conn.query(
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        ['Admin', 'admin@example.com']
      ),
      TE.map(() => undefined)
    ),
  (conn) => pipe(conn.query('DELETE FROM users WHERE email = $1', ['admin@example.com']), TE.map(() => undefined)),
  1640100000000
);

// Generate migration ID
const id = generateMigrationId(); // "20231215123045"
```

### Running Migrations

```typescript
import { migrate, getMigrationStatus, rollback, isMigrated } from '@djed/database';

const migrations = [migration1, migration2];

// Apply all pending migrations
const result = await migrate(migrations)(pool)();

// Check migration status
const status = await getMigrationStatus(migrations)(pool)();
if (E.isRight(status)) {
  console.log(`Applied: ${status.right.applied.length}`);
  console.log(`Pending: ${status.right.pending.length}`);
}

// Check if all migrations applied
const migrated = await isMigrated(migrations)(pool)();

// Rollback last migration
await rollback(migrations, 1)(pool)();

// Rollback all migrations
await rollback(migrations)(pool)();
```

### Migration Status

```typescript
import { formatMigrationStatus } from '@djed/database';

const status = await getMigrationStatus(migrations)(pool)();
if (E.isRight(status)) {
  console.log(formatMigrationStatus(status.right));
}
// Output:
// Applied Migrations:
//   001 - create_users_table (2023-12-15T10:30:00.000Z, 45ms)
//   002 - seed_initial_data (2023-12-15T10:30:01.000Z, 12ms)
//
// Pending Migrations:
//   003 - add_posts_table
```

## Query Composition

### Sequential Execution

```typescript
import { sequence } from '@djed/database';

const queries = [
  select('users'),
  select('posts'),
  select('comments')
];

// Execute queries in sequence
const results = withConnection(pool)(sequence(queries));
```

### Parallel Execution

```typescript
import { parallel } from '@djed/database';

const queries = [
  select('users'),
  select('posts'),
  select('comments')
];

// Execute queries in parallel
const results = withConnection(pool)(parallel(queries));
```

## Error Handling

### Database Errors

```typescript
import { mkDatabaseError, queryError, validationError } from '@djed/database';

// All database operations return TaskEither<DatabaseError, A>
const result = await select('users')(conn)();

if (E.isLeft(result)) {
  const error = result.left;
  console.log(error.type); // 'QueryError' | 'ConnectionError' | etc.
  console.log(error.message); // Error description
  console.log(error.query); // SQL query that failed
  console.log(error.params); // Query parameters
  console.log(error.originalError); // Original database error
}
```

### Error Categories

- `ConnectionError`: Failed to connect or connection issues
- `QueryError`: Query execution failed
- `TransactionError`: Transaction-specific errors
- `ValidationError`: Invalid configuration or data
- `ConstraintViolation`: Database constraint violated
- `NotFound`: Expected data not found
- `Timeout`: Operation timed out
- `Unknown`: Unclassified errors

## Category Theory Concepts

### TaskEither Monad

Represents async operations that may fail:

```typescript
import * as TE from 'fp-ts/TaskEither';

// All database operations return TaskEither<DatabaseError, A>
const result: TE.TaskEither<DatabaseError, QueryResult> = select('users')(conn);

// Chain operations
const userCount = pipe(
  select('users')(conn),
  TE.map((result) => result.rowCount)
);

// Handle errors
const safeQuery = pipe(
  select('users')(conn),
  TE.orElse((error) => {
    console.error(error);
    return TE.right({ rows: [], rowCount: 0, command: 'SELECT' });
  })
);
```

### Reader Pattern

Dependency injection for connections:

```typescript
import { runQuery } from '@djed/database';
import * as R from 'fp-ts/Reader';

// Define operation with Reader
const getUser = (id: number): DatabaseOperation<User> =>
  runQuery((conn) => pipe(selectWhere('users', [{ field: 'id', operator: '=', value: id }])(conn)));

// Provide context
const context: DatabaseContext = { pool, config };
const result = getUser(1)(context);
```

### Bracket Pattern

Safe resource management:

```typescript
// withConnection implements bracket pattern:
// 1. Acquire resource (connection)
// 2. Use resource (execute queries)
// 3. Release resource (even on error)

withConnection(pool)((conn) => {
  // Resource acquired
  return select('users')(conn);
  // Resource automatically released
});
```

### Traversable

Batch operations:

```typescript
import * as A from 'fp-ts/Array';

const userIds = [1, 2, 3, 4, 5];

// Traverse array with TaskEither
const users = pipe(
  userIds,
  A.traverse(TE.ApplicativeSeq)((id) =>
    selectWhere('users', [{ field: 'id', operator: '=', value: id }])(conn)
  )
);
// Result: TaskEither<DatabaseError, QueryResult[]>
```

## Best Practices

### 1. Always Use Connection Pooling

```typescript
// Good: Use pool with withConnection
const result = withConnection(pool)((conn) => select('users')(conn));

// Avoid: Manual connection management
```

### 2. Use Transactions for Multi-Step Operations

```typescript
// Good: Wrap related operations in transaction
withTransaction()((tx) =>
  pipe(
    tx.query('INSERT INTO ...', []),
    TE.chain(() => tx.query('UPDATE ...', []))
  )
);

// Avoid: Multiple separate queries without transaction
```

### 3. Parse and Validate Rows

```typescript
// Good: Parse rows with type safety
pipe(select('users')(conn), TE.chain(parseRows(userParser)));

// Avoid: Using raw rows without validation
```

### 4. Handle Errors Explicitly

```typescript
// Good: Handle errors appropriately
pipe(
  select('users')(conn),
  TE.fold(
    (error) => {
      logger.error('Query failed', error);
      return TE.right([]);
    },
    (result) => TE.right(result.rows)
  )
);
```

### 5. Use Migrations for Schema Changes

```typescript
// Good: Version control schema with migrations
const migrations = [createUsersTable, addIndexes, seedData];
migrate(migrations)(pool);

// Avoid: Manual schema changes
```

## TypeScript Configuration

Ensure strict mode is enabled in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createPool } from '@djed/database';
import * as E from 'fp-ts/Either';

describe('Database Operations', () => {
  const pool = E.getOrElseW(() => {
    throw new Error('Failed to create pool');
  })(
    createPool({
      backend: 'postgres',
      host: 'localhost',
      database: 'test_db',
      user: 'test',
      password: 'test',
    })
  );

  it('should select users', async () => {
    const result = await withConnection(pool)((conn) => select('users')(conn))();

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.rows).toBeDefined();
    }
  });
});
```

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## License

MIT License - see LICENSE file for details

## Related Packages

- `@djed/validation`: Composable validation with applicative functors
- `fp-ts`: Functional programming library for TypeScript

## Resources

- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
- [Category Theory for Programmers](https://github.com/hmemcpy/milewski-ctfp-pdf)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

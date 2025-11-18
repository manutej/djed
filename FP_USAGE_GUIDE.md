# Functional Programming Usage Guide - @djed/logger

Complete guide to using the FP core for advanced users and teams practicing functional programming.

---

## Quick Start: Three Levels

### Level 1: Object-Oriented (Backward Compatible)

No FP knowledge required - works exactly as before:

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('my-app', { level: 'debug' });

logger.info('User logged in', { userId: 123 });
logger.error('Connection failed', { retries: 3 });
logger.warn('Low memory', { available: '100MB' });
logger.debug('Debug info', { trace: true });
```

**Best for**: Existing codebases, simple use cases

---

### Level 2: Functional Pipeline (Type-Safe)

Compose pure functions with Either monad:

```typescript
import { validateAndBuild, createWinstonLogger } from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Pure validation and configuration
const loggerConfig = validateAndBuild('my-app', { level: 'debug' });

// Type-safe error handling
pipe(
  loggerConfig,
  E.fold(
    (error) => console.error(`Config failed: ${error}`),
    (options) => {
      const logger = winston.createLogger(options);
      logger.info('Logger configured');
    }
  )
);
```

**Best for**: Microservices, configuration-heavy apps

---

### Level 3: Full Functional Composition

Build complex logging pipelines with pure functions:

```typescript
import {
  validateLoggerConfig,
  buildWinstonLoggerOptions,
  executeLogOperation,
  logInfoCurried,
  logErrorCurried,
  composeLogOperations,
  kleisliCompose,
  bimap
} from '@djed/logger';
import * as E from 'fp-ts/Either';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';

// Pure function to create logger
const createLogger = (name: string) =>
  pipe(
    validateLoggerConfig(name),
    E.map(buildWinstonLoggerOptions),
    E.map(winston.createLogger)
  );

// Reusable logging pipeline
const userActionLogger = (action: string) =>
  composeLogOperations([
    logInfoCurried(`User action: ${action}`)(),
    logInfoCurried('Timestamp')(new Date()),
  ]);

// Create and execute
pipe(
  createLogger('user-service'),
  E.fold(
    (error) => console.error(error),
    (logger) => executeLogOperation(userActionLogger('login'), logger)
  )
);
```

**Best for**: Large applications, functional-first teams

---

## Functional Patterns

### 1. Either for Error Handling

**Problem**: Exceptions break composability

**Solution**: Use Either monad

```typescript
import { validateLoggerConfig, validateAndBuild } from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Each step is pure and composable
const result = validateAndBuild('app', { level: 'debug' });

// Type-safe handling of both cases
pipe(
  result,
  E.fold(
    (error) => {
      console.error(`Failed: ${error}`);
      // Return default config
      return defaultConfig;
    },
    (config) => {
      console.log('Success!');
      return config;
    }
  )
);

// Or chain operations
pipe(
  validateAndBuild('app'),
  E.flatMap((config) => {
    if (config.level === 'debug') {
      return E.right({ ...config, silent: true });
    }
    return E.left('Debug mode not allowed');
  })
);
```

### 2. Reader for Dependency Injection

**Problem**: Passing dependencies everywhere is verbose

**Solution**: Use Reader monad

```typescript
import {
  logInfo,
  logError,
  executeLogOperation,
  composeLogOperations,
  bindLogOperation
} from '@djed/logger';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';

// Define logging workflow (no dependencies)
const workflow = composeLogOperations([
  logInfo('Starting'),
  logError('Something happened'),
  logInfo('Finished'),
]);

// Execute only when you have the logger
const logger = winston.createLogger(options);
executeLogOperation(workflow, logger); // Side effect here!

// Compose operations with Reader monad
const advancedWorkflow = pipe(
  logInfo('Step 1'),
  bindLogOperation((_) => logInfo('Step 2')),
  bindLogOperation((_) => logInfo('Step 3'))
);

executeLogOperation(advancedWorkflow, logger);
```

### 3. Option for Null-Safety

**Problem**: Null reference errors

**Solution**: Use Option monad

```typescript
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// From logError implementation - safe Error handling
const processError = (meta: unknown) =>
  pipe(
    meta,
    O.fromNullable,                        // Option<unknown>
    O.filter((m): m is Error => m instanceof Error),  // Option<Error>
    O.map((err) => ({
      message: err.message,
      stack: err.stack,
    })),
    O.fold(
      () => meta,                          // If None, use original
      (processed) => processed             // If Some, use processed
    )
  );

// Usage
const metadata = new Error('Something went wrong');
const processed = processError(metadata); // Safe!
```

### 4. Currying for Partial Application

**Problem**: Functions with multiple parameters aren't reusable

**Solution**: Curry functions

```typescript
import {
  logMessage,
  logInfoCurried,
  logErrorCurried
} from '@djed/logger';

// Curried form allows partial application
const logMsg = logMessage('info');            // (msg: string) => (meta?) => LogOperation
const logUserAction = logMsg('User action');  // (meta?) => LogOperation
const logUserId = logUserAction({ userId: 123 }); // LogOperation

// Reusable pieces
const infoLogger = logInfoCurried('Server action');
const withUserId = infoLogger({ userId: 456 });

// Compose into pipelines
const userWorkflow = pipe(
  infoLogger({ action: 'login' }),
  // ... more operations
);
```

### 5. Kleisli Composition

**Problem**: Chaining functions that return monads is verbose

**Solution**: Use Kleisli composition

```typescript
import {
  validateLoggerConfig,
  buildWinstonLoggerOptions,
  kleisliCompose
} from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Kleisli arrows: a -> M b
const f = (name: string) => validateLoggerConfig(name);
const g = (config: LoggerConfig) => E.right(buildWinstonLoggerOptions(config));

// Kleisli composition
const composed = kleisliCompose(g, f);

// Use composed function
pipe(
  composed('my-app'),
  E.fold(
    (error) => console.error(error),
    (options) => console.log('Options:', options)
  )
);

// Equivalent to:
pipe(
  validateLoggerConfig('my-app'),
  E.flatMap((config) => E.right(buildWinstonLoggerOptions(config)))
);
```

### 6. Bifunctor Mapping

**Problem**: Need to transform both error and success paths

**Solution**: Use bifunctor operations

```typescript
import { validateAndBuild, bimap } from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const errorHandler = (error: ValidationError) => `ERROR: ${error}`;
const successHandler = (config: LoggerOptions) => ({ ...config, silent: false });

const result = validateAndBuild('app');

// Transform both sides
pipe(
  result,
  bimap(errorHandler, successHandler)
  // Returns Either<string, LoggerOptions>
);

// Or individually
pipe(
  result,
  E.mapLeft((error) => `Validation failed: ${error}`),
  E.map((config) => ({ ...config, level: 'debug' }))
);
```

### 7. Tap for Debugging

**Problem**: Debugging pure pipelines removes purity

**Solution**: Use tap operation

```typescript
import {
  validateAndBuild,
  logDebug,
  executeLogOperation,
  tapLogOperation
} from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const logger = winston.createLogger(options);

// Debug pipeline without breaking composition
pipe(
  validateAndBuild('app'),
  E.fold(
    (error) => {
      // Tap for debugging
      executeLogOperation(
        tapLogOperation(logDebug(`Config error: ${error}`)),
        logger
      );
      return null;
    },
    (config) => {
      // Tap for success logging
      executeLogOperation(
        tapLogOperation(logDebug('Config validated')),
        logger
      );
      return config;
    }
  )
);
```

### 8. Pattern Matching on ADTs

**Problem**: Runtime type checks are error-prone

**Solution**: Use discriminated unions

```typescript
import {
  createInfoLogEntry,
  matchLogEntry,
  type LogEntry
} from '@djed/logger';

// Create typed log entry
const entry: LogEntry = createInfoLogEntry('User action', { userId: 123 });

// Exhaustive pattern matching
const result = matchLogEntry(entry, {
  info: (message, meta) => `Info: ${message}`,
  error: (message, meta) => `Error: ${message}`,
  warn: (message, meta) => `Warn: ${message}`,
  debug: (message, meta) => `Debug: ${message}`,
});

console.log(result); // TypeScript ensures all cases handled
```

---

## Real-World Examples

### Example 1: Configuration-Driven Logging Setup

```typescript
import {
  validateAndBuild,
  createWinstonLogger,
  executeLogOperation,
  logInfo
} from '@djed/logger';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Load config from environment
const loggerConfig = {
  name: process.env.APP_NAME || 'app',
  level: (process.env.LOG_LEVEL || 'info') as any,
  format: (process.env.LOG_FORMAT || 'pretty') as any,
};

// Pure configuration
const setup: T.Task<E.Either<ValidationError, winston.Logger>> = async () => {
  return pipe(
    validateAndBuild(loggerConfig.name, loggerConfig),
    E.map((options) => winston.createLogger(options))
  );
};

// Execute
setup().then((result) => {
  pipe(
    result,
    E.fold(
      (error) => console.error(`Setup failed: ${error}`),
      (logger) => {
        executeLogOperation(logInfo('Application started'), logger);
      }
    )
  );
});
```

### Example 2: Structured Logging Pipeline

```typescript
import {
  logInfoCurried,
  logErrorCurried,
  composeLogOperations,
  executeLogOperation
} from '@djed/logger';

// Build reusable logging functions
const logRequest = (method: string, path: string) =>
  logInfoCurried(`${method} ${path}`);

const logResponse = (status: number, duration: number) =>
  logInfoCurried(`Response ${status}ms`)({ duration });

const logException = (error: Error) =>
  logErrorCurried(`Request failed`)(error);

// Middleware using functional logging
const httpMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const duration = () => Date.now() - startTime;

  try {
    // Log request
    const workflow = composeLogOperations([
      logRequest(req.method, req.path),
      logResponse(res.statusCode, duration()),
    ]);

    executeLogOperation(workflow, logger);
    next();
  } catch (error) {
    executeLogOperation(logException(error), logger);
  }
};
```

### Example 3: Type-Safe Logger Factory

```typescript
import {
  validateLoggerConfig,
  buildWinstonLoggerOptions,
  createLoggerBuilder
} from '@djed/logger';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Factory function
const createTypedLogger = (name: string, options: LoggerOptionsInput) =>
  pipe(
    validateLoggerConfig(name, options),
    E.map((config) => ({
      config,
      options: buildWinstonLoggerOptions(config),
    })),
    E.map(({ config, options }) => {
      const winstonLogger = winston.createLogger(options);
      return createLoggerBuilder(config)(winstonLogger);
    })
  );

// Usage
const userLogger = createTypedLogger('user-service', { level: 'debug' });

pipe(
  userLogger,
  E.fold(
    (error) => console.error(error),
    (logger) => {
      logger.info('User service started');
      logger.error('Connection failed');
    }
  )
);
```

### Example 4: Conditional Logging

```typescript
import {
  filterLogOperation,
  logInfo,
  executeLogOperation,
  composeLogOperations
} from '@djed/logger';

const isDevelop = process.env.NODE_ENV === 'development';

// Create conditional logging operations
const devLogging = filterLogOperation(() => isDevelop);

const workflow = composeLogOperations([
  devLogging(logInfo('Debug: starting process')),
  logInfo('Application started'),
  devLogging(logInfo('Debug: initialization complete')),
]);

executeLogOperation(workflow, logger);

// Only logs debug messages in development mode!
```

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Forgetting to Execute

```typescript
// WRONG: Creates LogOperation but doesn't execute it
logInfo('Hello');  // No side effect!

// RIGHT: Execute with logger
executeLogOperation(logInfo('Hello'), logger);
```

### ❌ Pitfall 2: Mixing Reader and Eager Execution

```typescript
// WRONG: Can't chain LogOperations
const op1 = logInfo('Step 1');
const op2 = logInfo('Step 2');
const combined = op1; // Lost op2!

// RIGHT: Use composeLogOperations
const combined = composeLogOperations([
  logInfo('Step 1'),
  logInfo('Step 2'),
]);
```

### ❌ Pitfall 3: Not Handling Either Cases

```typescript
// WRONG: Config error silently ignored
const config = validateAndBuild('app'); // Either<Error, Config>
const options = config; // Doesn't unwrap!

// RIGHT: Use E.fold to handle both cases
pipe(
  config,
  E.fold(
    (error) => { /* handle error */ },
    (options) => { /* handle success */ }
  )
);
```

### ❌ Pitfall 4: Losing Type Safety

```typescript
// WRONG: Unsafe casting
const level = 'invalid' as LogLevel;  // Type lies!

// RIGHT: Use smart constructor
const level = createLogLevel('invalid');  // Either<Error, LogLevel>
```

---

## Migration Guide: OOP → FP

### Step 1: Add Type-Safe Configuration

```typescript
// Before
const logger = new Logger('app', { level: 'debug' });

// After
import { validateAndBuild } from '@djed/logger';

pipe(
  validateAndBuild('app', { level: 'debug' }),
  E.fold(handleError, executeWith)
);
```

### Step 2: Use Curried Logging

```typescript
// Before
logger.info('User action', { userId });
logger.info('Completed', { duration });

// After
import { logInfoCurried } from '@djed/logger';

const logUserAction = logInfoCurried('User action');
const withUserId = logUserAction({ userId });
// Reuse: logUserAction({ userId: 456 })
```

### Step 3: Compose Operations

```typescript
// Before
logger.info('Start');
logger.debug('Debug');
logger.info('End');

// After
composeLogOperations([
  logInfo('Start'),
  logDebug('Debug'),
  logInfo('End'),
]);
```

### Step 4: Pure Pipelines

```typescript
// Before
const config = new Logger('app');
const options = config.getOptions();
const output = format(options);

// After
pipe(
  validateLoggerConfig('app'),
  E.map(buildWinstonLoggerOptions),
  E.map(createWinstonFormat)
);
```

---

## Performance Tips

1. **Reuse composed operations**: Don't recreate pipelines in loops
   ```typescript
   // ✅ Good
   const workflow = composeLogOperations([...]);
   for (let i = 0; i < 1000; i++) {
     executeLogOperation(workflow, logger);
   }

   // ❌ Bad
   for (let i = 0; i < 1000; i++) {
     executeLogOperation(composeLogOperations([...]), logger);
   }
   ```

2. **Defer expensive operations**: Use Reader for lazy evaluation
   ```typescript
   // Doesn't execute until executeLogOperation
   const expensiveOperation = logInfo(expensiveString());  // ✅ Fast!
   ```

3. **Filter early**: Use filterLogOperation to skip unnecessary work
   ```typescript
   const devOnlyLog = filterLogOperation(() => isDev);
   devOnlyLog(logInfo('Debug'));  // No overhead in production
   ```

---

## Conclusion

The FP API provides:

- ✅ Type safety at compile time
- ✅ Pure functions that are testable
- ✅ Composable pipelines for complex workflows
- ✅ Explicit error handling
- ✅ Deferred side effects for control
- ✅ Zero runtime overhead
- ✅ Mathematical guarantees (monad laws)

Start with Level 1, graduate to Level 2, master Level 3! 🚀

---

*Last Updated: 2025-11-18*
*FP Guidelines: ✅ Complete*

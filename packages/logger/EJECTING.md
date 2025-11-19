# Ejecting from @djed/logger

This guide explains how to eject from `@djed/logger` and use Winston directly.

## Why Eject?

You might want to eject if you need:
- Complete control over Winston configuration
- Custom transports not supported by @djed/logger
- To remove the @djed/logger dependency entirely
- Advanced Winston features (streams, profiling, etc.)

## Ejection Process

### Step 1: Install Winston

```bash
npm install winston
```

**Time**: < 1 minute

### Step 2: Replace Imports

Find all files using `@djed/logger`:

```bash
grep -r "@djed/logger" src/
```

Replace imports:

```typescript
// Before
import { Logger } from '@djed/logger';

// After
import winston from 'winston';
```

**Time**: < 2 minutes

### Step 3: Update Logger Instantiation

Replace `@djed/logger` API with Winston API:

#### L1 API (Zero Config)

```typescript
// Before
const logger = new Logger('my-app');

// After
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'my-app' }),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});
```

#### L2 API (With Options)

```typescript
// Before
const logger = new Logger('my-app', {
  level: 'debug',
  format: 'json'
});

// After
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'my-app' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});
```

#### L3 API (Winston Config)

Already using Winston directly - just remove the wrapper:

```typescript
// Before
const logger = new Logger('my-app', {
  winston: {
    level: 'warn',
    transports: [...]
  }
});

// After
const logger = winston.createLogger({
  level: 'warn',
  transports: [...]
});
```

**Time**: < 2 minutes

### Step 4: Update Method Calls

Method names remain the same (no changes needed):

```typescript
// These work identically in both @djed/logger and Winston
logger.info('message');
logger.error('message', { meta: 'data' });
logger.warn('message');
logger.debug('message');
```

✅ No changes required

### Step 5: Remove @djed/logger

```bash
npm uninstall @djed/logger
```

**Time**: < 1 minute

### Step 6: Verify

```bash
npm run build
npm test
```

**Time**: Depends on your project

## Total Ejection Time

**< 5 minutes** ✅

## Example: Complete Before/After

### Before (Using @djed/logger)

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('api-server', {
  level: 'debug',
  format: 'json'
});

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
```

### After (Pure Winston)

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'api-server' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
```

## Need Help?

If you encounter issues during ejection:

1. Check [Winston documentation](https://github.com/winstonjs/winston)
2. Review your existing logger configuration
3. Ensure all transports are properly configured
4. Test logging in development before deploying

## Why This is Easy

`@djed/logger` is designed as a **thin wrapper** (not a framework):

- ✅ Uses standard Winston underneath
- ✅ No custom APIs (just convenience layer)
- ✅ Direct access to Winston via `getWinstonLogger()`
- ✅ No lock-in - eject anytime

Zero lock-in by design.

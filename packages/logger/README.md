# @djed/logger

Structured logging wrapper around Winston for LUXOR projects.

## Quick Start

```bash
npm install @djed/logger winston
```

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('my-app');
logger.info('Hello world');
```

## Progressive API Design

### L1: Novice (Zero Config)

Perfect for getting started quickly. Works immediately with sensible defaults.

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('my-app');
logger.info('Application started');
logger.warn('Low memory');
logger.error('Connection failed');
logger.debug('Debug information');
```

**Time to first log**: < 30 seconds ✅

### L2: Intermediate (Customize)

Customize logging level and output format.

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('my-app', {
  level: 'debug',      // debug | info | warn | error
  format: 'json'       // json | pretty
});

logger.debug('Debug message', { userId: 123 });
logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
```

### L3: Expert (Full Winston Control)

Full access to Winston configuration for advanced use cases.

```typescript
import { Logger } from '@djed/logger';
import winston from 'winston';

const logger = new Logger('my-app', {
  winston: {
    level: 'silly',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  }
});
```

## API Reference

### `Logger`

Main logger class.

#### Constructor

```typescript
new Logger(name: string, options?: LoggerOptions)
```

**Parameters:**
- `name` - Logger name (appears in log output)
- `options` - Optional configuration

#### Methods

- `info(message: string, meta?: any)` - Log info message
- `error(message: string, meta?: any)` - Log error message
- `warn(message: string, meta?: any)` - Log warning message
- `debug(message: string, meta?: any)` - Log debug message
- `getWinstonLogger()` - Get underlying Winston logger (for ejecting)

### `LoggerOptions`

```typescript
interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'pretty';
  winston?: winston.LoggerOptions;  // Expert escape hatch
}
```

### `createLogger(name, options?)`

Convenience function to create a logger.

```typescript
import { createLogger } from '@djed/logger';

const logger = createLogger('my-app', { level: 'debug' });
```

### `measureTimeToFirstLog()`

Built-in performance measurement (for DX metrics).

```typescript
import { measureTimeToFirstLog } from '@djed/logger';

const time = measureTimeToFirstLog();
console.log(`Time to first log: ${time}ms`);
```

## Ejecting

To eject from `@djed/logger` and use Winston directly:

1. Install Winston:
   ```bash
   npm install winston
   ```

2. Replace imports:
   ```typescript
   // Before
   import { Logger } from '@djed/logger';
   
   // After
   import winston from 'winston';
   ```

3. Use Winston directly:
   ```typescript
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [new winston.transports.Console()]
   });
   
   logger.info('Hello world');
   ```

**Time to eject**: < 5 minutes ✅

## Success Criteria

- ✅ Bundle size: < 5 KB gzipped
- ✅ Test coverage: 100% (exceeds > 90% target)
- ✅ Time to first log: < 30 seconds
- ✅ Zero configuration required
- ✅ Zero runtime dependencies (Winston is peer dependency)

## License

MIT

## Part of Djed

**Djed** is LUXOR's shared infrastructure providing packages and templates for rapid development.

Learn more: [Djed Documentation](../../README.md)

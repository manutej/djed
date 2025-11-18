# @djed/logger Quick-Start Guide

**Get up and running with production-ready logging in under 5 minutes.**

---

## 📦 Installation

```bash
npm install @djed/logger winston
```

**Note**: `winston` is a peer dependency - you need both packages.

---

## ⚡ Fastest Start (30 seconds)

```javascript
const { createLogger } = require('@djed/logger');

// Create logger with smart defaults
const logger = createLogger();

// Start logging
logger.info('Application started');
logger.error('Something went wrong', { error: 'Details here' });
```

**Output** (to console):
```
2025-11-03T10:30:45.123Z [info]: Application started
2025-11-03T10:30:45.456Z [error]: Something went wrong error=Details here
```

**That's it!** You're now logging with:
- ✅ Timestamped messages
- ✅ JSON formatting
- ✅ Pretty console output
- ✅ File logging ready (just configure it)

---

## 🎯 Common Use Cases

### 1. Development Logging (Console Only)

```javascript
const logger = createLogger({
  level: 'debug',  // See debug messages too
  service: 'my-api'
});

logger.debug('Processing request', { userId: 123 });
logger.info('Request completed', { duration: '45ms' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Database timeout', { query: 'SELECT ...' });
```

### 2. Production Logging (Console + Files)

```javascript
const logger = createLogger({
  level: 'info',
  service: 'my-api',
  fileOptions: {
    directory: './logs',
    filename: 'app.log',
    maxSize: '20m',      // Rotate at 20MB
    maxFiles: '14d'      // Keep 14 days
  }
});

logger.info('Server started', { port: 3000 });
// Logs to console AND ./logs/app.log
```

### 3. TypeScript Usage

```typescript
import { createLogger, LogLevel } from '@djed/logger';

const logger = createLogger({
  level: LogLevel.INFO,
  service: 'my-api'
});

logger.info('Typed logging ready');
```

---

## 🔥 5-Minute Tutorial

Let's build a complete logging setup for a real application:

### Step 1: Install

```bash
npm install @djed/logger winston
```

### Step 2: Create `src/logger.js`

```javascript
const { createLogger } = require('@djed/logger');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  service: 'my-awesome-app',

  // Console logging (always enabled)
  consoleOptions: {
    format: 'pretty'  // or 'json' for production
  },

  // File logging (production ready)
  fileOptions: {
    directory: './logs',
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    compress: true  // gzip old logs
  }
});

module.exports = logger;
```

### Step 3: Use in Your Application

```javascript
// app.js
const logger = require('./logger');
const express = require('express');

const app = express();

// Log all requests
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Business logic
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  logger.debug('Fetching user', { userId: id });

  try {
    const user = await db.getUser(id);
    logger.info('User retrieved', { userId: id });
    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch user', {
      userId: id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV
  });
});
```

### Step 4: Run and See It Work

```bash
# Development (verbose logging)
LOG_LEVEL=debug node app.js

# Production (info and above)
LOG_LEVEL=info node app.js
```

**Console Output** (pretty format in development):
```
2025-11-03T10:30:45.123Z [info]: Server started port=3000 environment=development
2025-11-03T10:30:50.456Z [info]: Request received method=GET path=/api/users/123 ip=::1
2025-11-03T10:30:50.789Z [debug]: Fetching user userId=123
2025-11-03T10:30:51.012Z [info]: User retrieved userId=123
```

**File Output** (`logs/app-2025-11-03.log` - JSON format):
```json
{"timestamp":"2025-11-03T10:30:45.123Z","level":"info","message":"Server started","service":"my-awesome-app","port":3000,"environment":"development"}
{"timestamp":"2025-11-03T10:30:50.456Z","level":"info","message":"Request received","service":"my-awesome-app","method":"GET","path":"/api/users/123","ip":"::1"}
```

---

## 🎨 Configuration Options

### All Available Options

```javascript
const logger = createLogger({
  // Basic settings
  level: 'info',           // 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'
  service: 'my-app',       // Service name in logs

  // Console output
  consoleOptions: {
    format: 'pretty',      // 'pretty' | 'json'
    colorize: true,        // Colorize output (auto-disabled for non-TTY)
    timestamp: true        // Include timestamp
  },

  // File output (optional)
  fileOptions: {
    directory: './logs',
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',        // Rotate at size
    maxFiles: '14d',       // Keep duration
    compress: true,        // gzip rotated files
    level: 'info'          // Override log level for files
  },

  // Advanced Winston options
  format: customFormat,    // Custom winston format
  transports: [...]        // Custom transports
});
```

### Environment-Specific Configs

```javascript
// config/logger.js
const { createLogger } = require('@djed/logger');

const configs = {
  development: {
    level: 'debug',
    consoleOptions: { format: 'pretty' }
  },

  production: {
    level: 'info',
    consoleOptions: { format: 'json' },
    fileOptions: {
      directory: '/var/log/myapp',
      filename: 'app-%DATE%.log',
      maxSize: '50m',
      maxFiles: '30d',
      compress: true
    }
  },

  test: {
    level: 'warn',
    consoleOptions: { format: 'json' }
  }
};

const env = process.env.NODE_ENV || 'development';
const logger = createLogger({
  service: 'my-app',
  ...configs[env]
});

module.exports = logger;
```

---

## 💡 Best Practices

### ✅ DO: Structure Your Log Messages

```javascript
// Good - structured metadata
logger.info('User login successful', {
  userId: user.id,
  email: user.email,
  loginMethod: 'oauth',
  duration: loginTime
});

// Bad - unstructured string
logger.info(`User ${user.email} logged in via oauth in ${loginTime}ms`);
```

**Why?** Structured logs are searchable, filterable, and parseable.

### ✅ DO: Use Appropriate Log Levels

```javascript
logger.error('Database connection failed');     // Requires immediate attention
logger.warn('Cache miss - using fallback');     // Potentially problematic
logger.info('User registered');                 // Important business event
logger.http('GET /api/users 200 45ms');         // HTTP request/response
logger.debug('Cache hit for key: user:123');    // Debugging information
```

### ✅ DO: Include Context

```javascript
// Good - includes request context
app.use((req, res, next) => {
  req.logger = logger.child({
    requestId: req.id,
    userId: req.user?.id
  });
  next();
});

req.logger.info('Processing payment');
// Output includes requestId and userId automatically
```

### ❌ DON'T: Log Sensitive Data

```javascript
// Bad - logs passwords and tokens
logger.info('Login attempt', { password: req.body.password });
logger.debug('API call', { authToken: token });

// Good - redact sensitive data
logger.info('Login attempt', { username: req.body.username });
logger.debug('API call', { authToken: '[REDACTED]' });
```

### ❌ DON'T: Log in Hot Paths (Unless Needed)

```javascript
// Bad - logs every iteration
for (let i = 0; i < 1000000; i++) {
  logger.debug('Processing item', { index: i });
  processItem(i);
}

// Good - logs summary
logger.info('Starting batch processing', { count: items.length });
const results = items.map(processItem);
logger.info('Batch processing complete', {
  count: items.length,
  duration: Date.now() - start
});
```

---

## 🔧 Advanced Features

### Child Loggers (Add Context)

```javascript
const baseLogger = createLogger({ service: 'api' });

// Create child logger with additional context
const userLogger = baseLogger.child({ module: 'user-service' });
const authLogger = baseLogger.child({ module: 'auth-service' });

userLogger.info('User created', { userId: 123 });
// Output: { service: 'api', module: 'user-service', message: 'User created', userId: 123 }

authLogger.info('Login successful', { userId: 123 });
// Output: { service: 'api', module: 'auth-service', message: 'Login successful', userId: 123 }
```

### Custom Formats

```javascript
const { createLogger } = require('@djed/logger');
const winston = require('winston');

const logger = createLogger({
  service: 'my-app',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => {
      return `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`;
    })
  )
});
```

### Multiple Transports

```javascript
const logger = createLogger({
  service: 'my-app',
  transports: [
    // Console (always on)
    new winston.transports.Console({
      format: winston.format.simple()
    }),

    // Error-only file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),

    // All logs file
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});
```

---

## 🐛 Troubleshooting

### No Logs Appearing?

**Check log level:**
```javascript
// Too restrictive - only shows errors
const logger = createLogger({ level: 'error' });
logger.info('This will NOT appear');  // Won't show

// Solution: Use appropriate level
const logger = createLogger({ level: 'info' });
logger.info('This WILL appear');  // Shows
```

### Files Not Being Created?

**Check directory exists:**
```javascript
const fs = require('fs');
const path = require('path');

const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
  fileOptions: { directory: logDir }
});
```

### TypeScript Types Not Working?

**Install types:**
```bash
npm install --save-dev @types/winston
```

**Use proper imports:**
```typescript
import { createLogger, type Logger, type LoggerOptions } from '@djed/logger';
```

---

## 📚 Next Steps

### Learn More
- **[Full Documentation](README.md)** - Complete API reference
- **[Configuration Guide](docs/CONFIGURATION.md)** - All configuration options
- **[Examples](demos/)** - Real-world usage examples
- **[Migration Guide](docs/MIGRATION.md)** - Upgrade from winston

### Get Help
- **[GitHub Issues](https://github.com/manutej/djed/issues)** - Report bugs or request features
- **[Changelog](CHANGELOG.md)** - See what's new

### Integrate with Your Stack
- Express.js middleware
- Request ID tracking
- Error monitoring integration
- Log aggregation (ELK, Datadog, etc.)

---

## 🎉 You're Ready!

You now know how to:
- ✅ Install and configure @djed/logger
- ✅ Log to console and files
- ✅ Use appropriate log levels
- ✅ Structure log messages
- ✅ Configure for different environments
- ✅ Follow best practices

**Start logging better today!** 🚀

---

**Package**: [@djed/logger](https://github.com/manutej/djed)
**Version**: 0.1.0
**License**: MIT

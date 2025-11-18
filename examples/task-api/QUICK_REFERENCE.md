# Task API - Quick Reference Card

**One-page reference for common tasks**

---

## 🚀 Running the Project

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Docker
docker-compose up
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/` | Health check | - |
| GET | `/stats` | Statistics | - |
| GET | `/tasks` | List all tasks | - |
| GET | `/tasks/:id` | Get task by ID | - |
| POST | `/tasks` | Create task | `{title, description?, priority?}` |
| POST | `/tasks/bulk` | Bulk create | `{tasks: [{title, ...}]}` |
| PATCH | `/tasks/:id` | Update task | `{title?, completed?, priority?}` |
| DELETE | `/tasks/:id` | Delete task | - |
| POST | `/simulate-error` | Test error logging | - |

---

## 📝 Logger API Examples

### L1: Zero-Config
```typescript
const logger = new Logger('task-api');
logger.info('Hello world');
```

### L2: Configured
```typescript
const logger = new Logger('task-api', {
  level: 'debug',
  format: 'pretty'
});
```

### L3: Advanced
```typescript
const logger = new Logger('task-api', { level: 'info' });
const winston = logger.getWinstonLogger();
winston.add(new winston.transports.File({ filename: 'app.log' }));
```

---

## 🎨 Log Levels (Highest to Lowest)

| Level | When to Use | Example |
|-------|-------------|---------|
| **error** | System failures | `logger.error('DB connection failed', { error })` |
| **warn** | Potential issues | `logger.warn('High memory usage', { usage })` |
| **info** | Important events | `logger.info('User logged in', { userId })` |
| **debug** | Detailed debugging | `logger.debug('Query result', { count: 42 })` |

---

## 📦 Project Structure

```
task-api/
├── src/
│   ├── index.ts              # Main app
│   ├── logger.ts             # Logger config
│   ├── models/task.ts        # Data model
│   ├── routes/tasks.ts       # API routes
│   └── middleware/           # Request logging
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔍 Finding Logs

### Development
**Console**: Colored, pretty format
```
info: Task created taskId=1 requestId=req_xxx
```

### Production
**File**: `logs/task-api-YYYY-MM-DD.log` (JSON)
```json
{"timestamp":"...","level":"info","message":"Task created","taskId":"1"}
```

**Errors**: `logs/errors.log` (JSON, errors only)

---

## 🐛 Common Issues

### "Cannot find module '@djed/logger'"
```bash
# Link local package
cd ../../packages/logger && npm link
cd - && npm link @djed/logger
```

### "Port 3000 already in use"
```bash
# Change port
PORT=3001 npm run dev
```

### "No logs appearing"
```bash
# Set debug level
LOG_LEVEL=debug npm run dev
```

---

## 📊 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `debug` (dev), `info` (prod) | Minimum log level |

---

## 🧪 Testing the API

```bash
# Run interactive demo
./demo.sh

# Or manually:
curl http://localhost:3000/
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My task"}'
```

---

## 📚 Learn More

- **Full Documentation**: [README.md](README.md)
- **Complete Summary**: [EXAMPLE_SUMMARY.md](EXAMPLE_SUMMARY.md)
- **@djed/logger Docs**: [../../packages/logger/README.md](../../packages/logger/README.md)

---

**Last Updated**: 2025-11-03

# Task Management API - @djed/logger Example

**A complete REST API demonstrating real-world usage of [@djed/logger](https://github.com/manutej/djed/tree/main/packages/logger)**

This example shows how to integrate @djed/logger into a production-ready Express.js application, demonstrating all three API levels (L1 Novice, L2 Intermediate, L3 Expert).

---

## Features Demonstrated

### Logging Patterns
- ✅ **Environment-specific configuration** (dev vs production)
- ✅ **Request/response logging** middleware
- ✅ **Child loggers** for different modules (API, DB, Auth)
- ✅ **Structured logging** with metadata
- ✅ **Error tracking** and exception handling
- ✅ **Performance metrics** (request duration)
- ✅ **Log levels** (debug, info, warn, error)

### API Features
- ✅ **CRUD operations** for tasks
- ✅ **Request ID tracking** across logs
- ✅ **Error handling** with logging
- ✅ **Graceful shutdown** with cleanup logging
- ✅ **Health checks** and statistics

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `winston` - Peer dependency for @djed/logger
- `@djed/logger` - Our logging package (when published)

### 2. Run in Development

```bash
npm run dev
```

**Expected Output**:
```
2025-11-03T10:30:45.123Z [info]: Logger initialized environment=development logLevel=debug fileLogging=false
2025-11-03T10:30:45.456Z [info]: Starting server port=3000 environment=development
2025-11-03T10:30:45.789Z [info]: Server started successfully port=3000 url=http://localhost:3000
```

### 3. Try the API

**Create a task**:
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn @djed/logger","priority":"high"}'
```

**List tasks**:
```bash
curl http://localhost:3000/tasks
```

**Get task by ID**:
```bash
curl http://localhost:3000/tasks/1
```

**Update task**:
```bash
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

**Delete task**:
```bash
curl -X DELETE http://localhost:3000/tasks/1
```

---

## Project Structure

```
task-api/
├── src/
│   ├── index.ts                    # Main application
│   ├── logger.ts                   # Logger configuration (L1, L2, L3 examples)
│   ├── models/
│   │   └── task.ts                 # Task model and in-memory DB
│   ├── routes/
│   │   └── tasks.ts                # Task routes (with logging)
│   └── middleware/
│       └── requestLogger.ts        # Request logging middleware
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Logger Configuration Explained

### L1: Novice (Zero Config)

The simplest possible setup - just works:

```typescript
import { createLogger } from '@djed/logger';

const logger = createLogger();
logger.info('Application started');
```

**When to use**: Quick scripts, prototyping, learning

---

### L2: Intermediate (Environment-Specific)

**Used in this example** - See `src/logger.ts`:

```typescript
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  service: 'task-api',

  // Pretty console in dev, JSON in production
  consoleOptions: {
    format: environment === 'production' ? 'json' : 'pretty'
  },

  // File logging in production only
  ...(environment === 'production' && {
    fileOptions: {
      directory: './logs',
      filename: 'task-api-%DATE%.log',
      maxSize: '20m',
      maxFiles: '14d'
    }
  })
});
```

**When to use**: Most production applications

---

### L3: Expert (Custom Transports)

Examples included in `src/logger.ts` (commented out):

```typescript
// Add error-only file
logger.add(
  new winston.transports.File({
    filename: 'logs/errors.log',
    level: 'error'
  })
);

// Add HTTP transport for external service
logger.add(
  new HttpTransport({
    host: 'logs.example.com',
    path: '/api/logs'
  })
);
```

**When to use**: Advanced logging needs (multiple transports, external services)

---

## Logging Examples

### Request Logging

Every request is automatically logged with metadata:

```json
{
  "timestamp": "2025-11-03T10:30:45.123Z",
  "level": "info",
  "message": "Incoming request",
  "service": "task-api",
  "module": "api",
  "requestId": "req_1699012245123_abc123",
  "method": "POST",
  "path": "/tasks",
  "ip": "::1"
}
```

### Response Logging

Responses include duration metrics:

```json
{
  "timestamp": "2025-11-03T10:30:45.456Z",
  "level": "info",
  "message": "Response sent",
  "service": "task-api",
  "module": "api",
  "requestId": "req_1699012245123_abc123",
  "method": "POST",
  "path": "/tasks",
  "statusCode": 201,
  "duration": "45ms"
}
```

### Error Logging

Errors capture full context:

```json
{
  "timestamp": "2025-11-03T10:30:45.789Z",
  "level": "error",
  "message": "Request error",
  "service": "task-api",
  "module": "api",
  "requestId": "req_1699012245789_xyz789",
  "method": "POST",
  "path": "/tasks",
  "error": "Title is required",
  "stack": "Error: Title is required\n    at ..."
}
```

### Child Logger Usage

Different modules have contextual logging:

```typescript
// In routes/tasks.ts
import { apiLogger, dbLogger } from '../logger';

apiLogger.info('Creating task', { title: 'Learn logging' });
dbLogger.info('Task created', { taskId: '1' });
```

**Output**:
```
[info]: Creating task module=api title=Learn logging
[info]: Task created module=database taskId=1
```

---

## Environment Configuration

### Development (.env)

```env
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
```

**Logs to**: Console (pretty format, colorized)

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
PORT=8080
```

**Logs to**:
- Console (JSON format)
- Files in `./logs/` (rotated daily, compressed)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/stats` | API statistics |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/:id` | Get task by ID |
| POST | `/tasks` | Create new task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/bulk` | Bulk create tasks |
| POST | `/simulate-error` | Trigger error (for testing) |

---

## Testing Error Logging

Simulate an error to see error logging in action:

```bash
curl -X POST http://localhost:3000/simulate-error
```

**Console Output**:
```
[info]: Incoming request method=POST path=/simulate-error requestId=req_xxx
[warn]: Simulating error requestId=req_xxx
[error]: Request error requestId=req_xxx error="This is a simulated error for testing" stack="Error: This is a simulated error..."
[info]: Response sent method=POST path=/simulate-error statusCode=500 duration=5ms
```

---

## Testing Bulk Operations

Create multiple tasks at once:

```bash
curl -X POST http://localhost:3000/tasks/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"title":"Task 1","priority":"high"},
      {"title":"Task 2","priority":"medium"},
      {"title":"Task 3","priority":"low"}
    ]
  }'
```

**Console Output**:
```
[info]: Incoming request method=POST path=/tasks/bulk requestId=req_xxx
[info]: Bulk creating tasks requestId=req_xxx count=3
[info]: Bulk tasks created requestId=req_xxx count=3 ids=["1","2","3"]
[info]: Response sent method=POST path=/tasks/bulk statusCode=201 duration=12ms
```

---

## Production Deployment

### 1. Build

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory.

### 2. Run in Production

```bash
NODE_ENV=production npm start
```

### 3. Check Logs

**Console logs** (JSON format):
```bash
# View real-time logs
npm start
```

**File logs** (if configured):
```bash
# View today's logs
cat logs/task-api-2025-11-03.log

# View error logs only (if error-specific file configured)
cat logs/errors.log

# Follow logs in real-time
tail -f logs/task-api-2025-11-03.log
```

---

## Docker Support

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Build and Run

```bash
# Build
docker build -t task-api .

# Run
docker run -p 3000:3000 -e NODE_ENV=production task-api
```

---

## What You'll Learn

### From This Example

1. **Progressive API Design**
   - Start simple (L1)
   - Add configuration when needed (L2)
   - Use advanced features for edge cases (L3)

2. **Structured Logging**
   - Include metadata with every log
   - Use appropriate log levels
   - Create child loggers for context

3. **Request Tracking**
   - Generate request IDs
   - Track requests across application
   - Correlate logs for debugging

4. **Error Handling**
   - Log errors with full context
   - Capture stack traces
   - Differentiate error types

5. **Production Patterns**
   - Environment-specific configuration
   - File rotation and compression
   - Graceful shutdown with cleanup

---

## Troubleshooting

### Issue: Module not found '@djed/logger'

**Cause**: Package not installed or not published yet

**Solution**:
```bash
# If @djed/logger is published
npm install @djed/logger winston

# If testing locally (from djed monorepo)
cd ../../packages/logger && npm link
cd - && npm link @djed/logger
```

---

### Issue: No logs appearing

**Check log level**:
```bash
# Set to debug to see all logs
LOG_LEVEL=debug npm run dev
```

---

### Issue: TypeScript errors

**Solution**:
```bash
# Install dev dependencies
npm install --save-dev @types/express @types/node
```

---

## Next Steps

### Enhance This Example
- Add authentication (JWT tokens)
- Add database (PostgreSQL, MongoDB)
- Add caching (Redis)
- Add tests (Jest, Supertest)
- Add API documentation (Swagger/OpenAPI)

### Explore @djed/logger Features
- Custom formats
- Multiple transports
- Log sampling (for high-traffic apps)
- Integration with monitoring (Datadog, Sentry)

### Build Your Own
Use this as a template for your projects:
1. Copy project structure
2. Replace task logic with your business logic
3. Adjust logging to your needs
4. Deploy to production

---

## Resources

- **@djed/logger Documentation**: [GitHub](https://github.com/manutej/djed/tree/main/packages/logger)
- **Quick-Start Guide**: [QUICKSTART.md](https://github.com/manutej/djed/blob/main/packages/logger/QUICKSTART.md)
- **Winston Documentation**: [GitHub](https://github.com/winstonjs/winston)

---

## License

MIT - See LICENSE file in monorepo

---

**Built with ❤️ to demonstrate @djed/logger**

Questions or feedback? [Open an issue](https://github.com/manutej/djed/issues)

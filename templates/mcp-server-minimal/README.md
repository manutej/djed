# MCP Server Minimal Template

A minimal, production-ready MCP (Model Context Protocol) server template using @djed packages and functional programming patterns with fp-ts.

## Features

- **Type-Safe Configuration**: Environment-based configuration using `@djed/config` with validation
- **Structured Logging**: Production-ready logging with `@djed/logger`
- **Functional Error Handling**: Using `Either` and `TaskEither` from fp-ts
- **RESTful API**: Example CRUD endpoints with Express
- **Health Checks**: Kubernetes-ready liveness/readiness probes
- **Docker Support**: Multi-stage builds and docker-compose setup
- **Testing**: Integration tests with vitest and supertest
- **TypeScript**: Full type safety with strict mode
- **Progressive API**: Learn FP gradually (L1 → L2 → L3)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Edit `.env` to configure:
- Server port and host
- Log level and format
- Database connection (optional)
- CORS settings

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured port).

### 4. Test the API

Health check:
```bash
curl http://localhost:3000/health
```

List items:
```bash
curl http://localhost:3000/api/items
```

Create an item:
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","description":"A test item"}'
```

## Project Structure

```
mcp-server-minimal/
├── src/
│   ├── main.ts              # Application entry point
│   ├── config.ts            # Configuration using @djed/config
│   ├── server.ts            # Express server setup
│   ├── routes/
│   │   ├── health.ts        # Health check endpoints
│   │   └── api.ts           # API routes (CRUD example)
│   └── middleware/
│       ├── logging.ts       # Request logging middleware
│       └── error.ts         # Error handling middleware
├── tests/
│   └── integration.test.ts  # Integration tests
├── scripts/
│   └── dev.sh              # Development utility script
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment variables template
├── Dockerfile              # Production Docker image
└── docker-compose.yml      # Development Docker setup
```

## Available Scripts

### Development

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
```

### Testing

```bash
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Docker

```bash
npm run docker:build # Build Docker image
npm run docker:up    # Start containers
npm run docker:down  # Stop containers
npm run docker:logs  # View container logs
```

### Development Script

Use the included development script for common tasks:

```bash
./scripts/dev.sh install     # Install dependencies
./scripts/dev.sh dev         # Start dev server
./scripts/dev.sh test        # Run tests
./scripts/dev.sh docker:up   # Start Docker
```

## API Endpoints

### Health Checks

- `GET /health` - Simple health check
- `GET /health/detailed` - Detailed health status
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)

### API Routes

- `GET /api/version` - API version information
- `GET /api/items` - List all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

## Configuration

Configuration is managed through environment variables using `@djed/config`. See `.env.example` for all available options.

### Server Configuration

```env
NODE_ENV=development    # Environment (development, production, test)
PORT=3000              # Server port
HOST=0.0.0.0           # Server host
```

### Logging Configuration

```env
LOG_LEVEL=info         # Log level (debug, info, warn, error)
LOG_FORMAT=pretty      # Log format (pretty, json)
```

### Database Configuration (Optional)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT=10000
```

### CORS Configuration

```env
CORS_ORIGIN=*
CORS_CREDENTIALS=false
```

## Functional Programming Patterns

This template demonstrates progressive FP API usage:

### L1: Simple, Familiar APIs

```typescript
// Simple logger usage
const logger = new Logger('app');
logger.info('Hello world');
```

### L2: Intermediate FP Patterns

```typescript
// Configuration with Either
const config = pipe(
  loadConfig(),
  E.fold(
    (error) => { /* handle error */ },
    (cfg) => { /* use config */ }
  )
);
```

### L3: Advanced FP Composition

```typescript
// TaskEither for async operations
const result = await pipe(
  server.start(),
  TE.fold(
    (error) => TE.fromIO(() => handleError(error)),
    () => TE.fromIO(() => handleSuccess())
  )
)();
```

## Using @djed Packages

### @djed/config

Load and validate configuration:

```typescript
import { loadConfig, fromEnv, run, fromProcessEnv } from '@djed/config';
import { pipe } from 'fp-ts/function';

const config = pipe(
  fromEnv('DATABASE_URL'),
  run(fromProcessEnv())
);
```

### @djed/logger

Structured logging:

```typescript
import { Logger } from '@djed/logger';

const logger = new Logger('app', {
  level: 'info',
  format: 'pretty'
});

logger.info('User created', { userId: 123 });
logger.error('Failed to connect', { error });
```

### @djed/validation

Input validation:

```typescript
import { validateEmail, validatePort } from '@djed/validation';
import * as E from 'fp-ts/Either';

const emailResult = validateEmail('user@example.com');
// Either<ValidationError, Email>
```

### @djed/http

HTTP client for making requests:

```typescript
import { get } from '@djed/http';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

const result = await pipe(
  get('https://api.example.com/data'),
  TE.map((response) => response.data)
)();
```

## Docker Deployment

### Build and Run

```bash
# Build image
docker build -t mcp-server .

# Run container
docker run -p 3000:3000 --env-file .env mcp-server
```

### Docker Compose

```bash
# Start all services (app + postgres)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

### Build

```bash
npm run build
```

### Run

```bash
NODE_ENV=production npm start
```

### Environment Variables

Set all required environment variables in your deployment platform:

- Render, Railway, Fly.io: Set in dashboard
- AWS ECS: Use task definition
- Kubernetes: Use ConfigMaps and Secrets

### Health Checks

Configure your platform to use:
- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npx vitest run tests/integration.test.ts
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Extending the Template

### Adding New Routes

1. Create route file in `src/routes/`:

```typescript
// src/routes/users.ts
import { Router } from 'express';
import { Logger } from '@djed/logger';
import { AppConfig } from '../config';

export function usersRouter(config: AppConfig, logger: Logger): Router {
  const router = Router();

  router.get('/', (req, res) => {
    // Implementation
  });

  return router;
}
```

2. Register in `src/server.ts`:

```typescript
import { usersRouter } from './routes/users';

app.use('/api/users', usersRouter(config, logger));
```

### Adding Database Support

1. Uncomment database configuration in `.env`
2. Install database client: `npm install pg` (for PostgreSQL)
3. Use `@djed/database` for queries:

```typescript
import { createPool, query } from '@djed/database';
import * as TE from 'fp-ts/TaskEither';

const pool = createPool(config.database);

const users = await pipe(
  query(pool, 'SELECT * FROM users'),
  TE.map((result) => result.rows)
)();
```

### Adding Validation

Use `@djed/validation` for input validation:

```typescript
import { validateEmail, validateNonEmptyString } from '@djed/validation';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

router.post('/users', (req, res) => {
  const emailResult = validateEmail(req.body.email);
  const nameResult = validateNonEmptyString(req.body.name);

  // Combine validations and handle errors
});
```

## Troubleshooting

### Port Already in Use

Change the port in `.env`:
```env
PORT=3001
```

### TypeScript Errors

Ensure dependencies are installed:
```bash
npm install
```

Rebuild:
```bash
npm run build
```

### Database Connection Issues

1. Check `DATABASE_URL` in `.env`
2. Ensure database is running
3. Check network connectivity
4. Review logs: `npm run docker:logs`

## Best Practices

1. **Error Handling**: Always use `Either` or `TaskEither` for operations that can fail
2. **Logging**: Log structured data, not just strings
3. **Configuration**: Never hardcode config, use environment variables
4. **Testing**: Write tests for all business logic
5. **Type Safety**: Enable strict TypeScript mode
6. **FP Patterns**: Start with L1 APIs, progress to L2/L3 as you learn

## Learning Resources

- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
- [Functional Programming Guide](../../docs/FP_USAGE_GUIDE.md)
- [@djed Package Documentation](../../packages/README.md)

## License

MIT

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review example code in this template

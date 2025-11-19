# @djed/http

Type-safe HTTP client with TaskEither for async operations and functional patterns.

## Features

- **TaskEither for Async Operations**: Composable error handling with `fp-ts/TaskEither`
- **Automatic Retries**: Exponential backoff with configurable retry policies
- **Circuit Breaker**: Prevent cascading failures with circuit breaker pattern
- **Type-Safe**: Full TypeScript support with type inference
- **Reader Monad Interceptors**: Dependency injection for auth, headers, and config
- **Streaming Support**: Handle large responses with streaming
- **Composable Middleware**: Build complex request pipelines with middleware composition
- **Progressive API**: Three levels of abstraction (L1, L2, L3) for different use cases

## Installation

```bash
npm install @djed/http fp-ts
```

## Progressive API Levels

### Level 1: Simple HTTP Requests

For developers who want a simple, Promise-based API:

```typescript
import { L1 } from '@djed/http';

// Simple GET request
const user = await L1.get<User>('/api/users/1');

// Simple POST request
const created = await L1.post<CreateUserDto, User>('/api/users', {
  name: 'Alice',
  email: 'alice@example.com'
});

// Create a client with base configuration
const client = L1.createClient({
  baseURL: 'https://api.example.com',
  headers: { 'X-API-Key': 'secret' }
});

const users = await client.get<User[]>('/users');
```

### Level 2: Enhanced with Retry and Interceptors

For developers who want resilient requests:

```typescript
import { L2, defaultRetryPolicy } from '@djed/http';

// GET with automatic retry
const user = await L2.getWithRetry<User>(
  '/api/users/1',
  undefined,
  defaultRetryPolicy
);

// Create client with retry and interceptors
const client = L2.createClient(
  { baseURL: 'https://api.example.com' },
  {
    retryPolicy: defaultRetryPolicy,
    requestInterceptors: [
      addBearerToken('my-token'),
      jsonContentType
    ]
  }
);

const users = await client.get<User[]>('/users');
```

### Level 3: Full TaskEither Composition

For developers who want complete control with functional programming:

```typescript
import { L3, pipe, TE } from '@djed/http';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Create a fully configured client
const client = L3.createClient(
  { baseURL: 'https://api.example.com' },
  {
    retryPolicy: defaultRetryPolicy,
    circuitBreaker: defaultCircuitBreakerConfig,
    requestInterceptors: [addBearerToken('token')],
    responseInterceptors: [logResponse(console.log)]
  }
);

// Compose multiple operations
const result = await pipe(
  client.get<User>('/users/1'),
  TE.chain(response =>
    client.post<UpdateUserDto, User>('/users/1', {
      ...response.data,
      email: 'newemail@example.com'
    })
  ),
  TE.map(response => response.data),
  TE.fold(
    error => {
      console.error('Error:', error);
      return TE.right(null);
    },
    user => {
      console.log('Updated user:', user);
      return TE.right(user);
    }
  )
)();
```

## Core HTTP Operations

### Basic Requests

```typescript
import { get, post, put, patch, del } from '@djed/http';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// GET request
const getUserTask = get<User>('/api/users/1');

// POST request
const createUserTask = post<CreateUserDto, User>('/api/users', {
  name: 'Alice',
  email: 'alice@example.com'
});

// Execute the task
const result = await getUserTask();

// Handle result with pattern matching
if (E.isRight(result)) {
  console.log('User:', result.right.data);
} else {
  console.error('Error:', result.left);
}
```

### Create HTTP Client

```typescript
import { createClient } from '@djed/http';

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': 'secret'
  },
  timeout: 5000
});

// Use the client
const users = await client.get<User[]>('/users')();
```

## Retry with Exponential Backoff

```typescript
import { get, retry, defaultRetryPolicy, aggressiveRetryPolicy } from '@djed/http';
import { pipe } from 'fp-ts/function';

// Retry with default policy
const task = pipe(
  get<User>('/api/users/1'),
  retry
);

// Retry with custom policy
const customPolicy = {
  ...defaultRetryPolicy,
  maxRetries: 5,
  initialDelay: 200,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NetworkError', 'TimeoutError']
};

const taskWithCustomRetry = pipe(
  get<User>('/api/users/1'),
  retry(_, customPolicy)
);

// Predefined policies
import { conservativeRetryPolicy, aggressiveRetryPolicy } from '@djed/http';

const conservativeTask = pipe(
  get<User>('/api/users/1'),
  retry(_, conservativeRetryPolicy)
);
```

### Conditional Retry

```typescript
import { retryWhen } from '@djed/http';

// Retry only on specific errors
const task = pipe(
  get<User>('/api/users/1'),
  retryWhen(error => error.status === 503)
);
```

## Circuit Breaker Pattern

```typescript
import { createCircuitBreaker, withCircuitBreaker, CircuitBreakerManager } from '@djed/http';

// Create a circuit breaker
const breaker = createCircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 2,    // Close after 2 successes in half-open state
  timeout: 60000,         // Request timeout
  resetTimeout: 30000     // Time before trying to close
});

// Use with requests
const task = pipe(
  get<User>('/api/users/1'),
  withCircuitBreaker(breaker)
);

// Multi-service circuit breaker
const manager = new CircuitBreakerManager();

const apiTask = manager.execute(
  'api-service',
  get<User>('/api/users/1')
);

const dbTask = manager.execute(
  'database-service',
  get<Data>('/api/data')
);

// Get stats
const stats = manager.getStats('api-service');
console.log('Circuit state:', stats?.state);
```

## Interceptors

### Request Interceptors

```typescript
import {
  addBearerToken,
  addBasicAuth,
  addApiKey,
  addHeaders,
  jsonContentType,
  composeRequestInterceptors
} from '@djed/http';

// Add Bearer token
const authInterceptor = addBearerToken('my-token');

// Add Basic auth
const basicAuth = addBasicAuth('username', 'password');

// Add API key
const apiKey = addApiKey('X-API-Key', 'secret');

// Add custom headers
const customHeaders = addHeaders({
  'X-Custom': 'value',
  'X-Request-ID': '123'
});

// Compose multiple interceptors
const interceptors = composeRequestInterceptors([
  jsonContentType,
  addBearerToken('token'),
  addHeaders({ 'X-Custom': 'value' })
]);
```

### Reader-based Interceptors

```typescript
import { addBearerTokenR, addHeadersR } from '@djed/http';
import * as R from 'fp-ts/Reader';

// Define dependencies
interface AuthDeps {
  token: string;
}

interface HeadersDeps {
  headers: Headers;
}

// Create Reader-based interceptors
const authInterceptor = addBearerTokenR<AuthDeps>();
const headersInterceptor = addHeadersR<HeadersDeps>();

// Provide dependencies
const deps = { token: 'my-token', headers: { 'X-Custom': 'value' } };
const interceptor = authInterceptor(deps);
```

### Response Interceptors

```typescript
import { transformResponse, logResponse, validateStatus } from '@djed/http';

// Transform response data
const transformer = transformResponse((data: RawUser) => ({
  ...data,
  fullName: `${data.firstName} ${data.lastName}`
}));

// Log responses
const logger = logResponse((response) => {
  console.log('Response:', response.status, response.data);
});

// Validate status codes
const validator = validateStatus(status => status >= 200 && status < 300);
```

## Middleware

### Building Middleware Chains

```typescript
import { createMiddlewareChain, defaultRetryPolicy, defaultCircuitBreakerConfig } from '@djed/http';

const middleware = createMiddlewareChain()
  .withRetry(defaultRetryPolicy)
  .withCircuitBreaker(defaultCircuitBreakerConfig)
  .withTimeout(5000)
  .withLogging({
    request: req => console.log('Request:', req),
    response: res => console.log('Response:', res),
    error: err => console.error('Error:', err)
  })
  .withRateLimit(100, 60000) // 100 requests per minute
  .build();

// Apply middleware to request
const task = middleware(get<User>('/api/users/1'));
```

### Predefined Middleware Stacks

```typescript
import {
  standardMiddleware,
  productionMiddleware,
  developmentMiddleware
} from '@djed/http';

// Standard stack (retry + circuit breaker)
const standard = standardMiddleware(
  defaultRetryPolicy,
  defaultCircuitBreakerConfig
);

// Production stack (interceptors + retry + circuit breaker)
const production = productionMiddleware(
  defaultRetryPolicy,
  defaultCircuitBreakerConfig,
  [addBearerToken('token')],
  [logResponse(console.log)]
);

// Development stack (logging)
const development = developmentMiddleware(console);
```

## Streaming Support

```typescript
import { getStream } from '@djed/http';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

const streamTask = getStream('/api/large-file');

const result = await streamTask();

if (E.isRight(result)) {
  const reader = result.right.stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    console.log('Chunk:', value);
  }
}
```

## Error Handling

```typescript
import { HttpError } from '@djed/http';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const task = pipe(
  get<User>('/api/users/1'),
  TE.fold(
    (error: HttpError) => {
      switch (error.type) {
        case 'NetworkError':
          console.error('Network error:', error.message);
          break;
        case 'TimeoutError':
          console.error('Request timed out');
          break;
        case 'ServerError':
          console.error('Server error:', error.status, error.message);
          break;
        case 'CircuitBreakerOpen':
          console.error('Circuit breaker is open');
          break;
        default:
          console.error('Unknown error:', error);
      }
      return TE.right(null);
    },
    (response) => {
      console.log('Success:', response.data);
      return TE.right(response.data);
    }
  )
);
```

## Category Theory Features

### Monoid for Headers and Params

```typescript
import { HeadersMonoid, QueryParamsMonoid } from '@djed/http';

// Combine headers
const headers1 = { 'Content-Type': 'application/json' };
const headers2 = { 'Authorization': 'Bearer token' };
const combined = HeadersMonoid.concat(headers1, headers2);

// Empty header
const empty = HeadersMonoid.empty;
```

### Semigroup for Retry Policies

```typescript
import { RetryPolicySemigroup, combineRetryPolicies } from '@djed/http';

const policy1 = { maxRetries: 3, initialDelay: 100, ... };
const policy2 = { maxRetries: 5, initialDelay: 200, ... };

// Combine policies (takes max retries, conservative delays)
const combined = RetryPolicySemigroup.concat(policy1, policy2);

// Combine multiple policies
const policies = [policy1, policy2, policy3];
const result = combineRetryPolicies(policies);
```

## Complete Example

```typescript
import {
  L3,
  defaultRetryPolicy,
  defaultCircuitBreakerConfig,
  addBearerToken,
  jsonContentType,
  logResponse,
  createMiddlewareChain
} from '@djed/http';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Create a production-ready client
const client = L3.createClient(
  {
    baseURL: 'https://api.example.com',
    timeout: 5000
  },
  {
    retryPolicy: {
      ...defaultRetryPolicy,
      maxRetries: 5
    },
    circuitBreaker: defaultCircuitBreakerConfig,
    requestInterceptors: [
      jsonContentType,
      addBearerToken('my-token')
    ],
    responseInterceptors: [
      logResponse(console.log)
    ]
  }
);

// Compose complex operations
interface User {
  id: number;
  name: string;
  email: string;
}

const updateUserWorkflow = (userId: number, newEmail: string) =>
  pipe(
    // Fetch user
    client.get<User>(`/users/${userId}`),

    // Update user
    TE.chain(response =>
      client.put<Partial<User>, User>(`/users/${userId}`, {
        email: newEmail
      })
    ),

    // Extract data
    TE.map(response => response.data),

    // Handle errors
    TE.fold(
      error => {
        console.error('Update failed:', error.message);
        return TE.right(null);
      },
      user => {
        console.log('User updated:', user);
        return TE.right(user);
      }
    )
  );

// Execute the workflow
const result = await updateUserWorkflow(1, 'newemail@example.com')();
```

## API Reference

### Core Types

- `HttpRequest<A>` - HTTP request configuration
- `HttpResponse<A>` - HTTP response with data
- `HttpError` - Typed error with error types
- `RetryPolicy` - Retry configuration
- `CircuitBreakerConfig` - Circuit breaker configuration

### Core Functions

- `get<A>(url, params?, config?)` - GET request
- `post<A, B>(url, data?, config?)` - POST request
- `put<A, B>(url, data?, config?)` - PUT request
- `patch<A, B>(url, data?, config?)` - PATCH request
- `del<A>(url, config?)` - DELETE request
- `createClient(config)` - Create HTTP client

### Retry Functions

- `retry<E, A>(task, policy?)` - Retry with exponential backoff
- `retryWith(policy)` - Create retry function with policy
- `retryWhen<E, A>(task, predicate, policy?)` - Conditional retry
- `retryWithTimeout<E, A>(task, timeout, policy?)` - Retry with timeout

### Circuit Breaker Functions

- `createCircuitBreaker(config)` - Create circuit breaker
- `withCircuitBreaker<E, A>(breaker)` - Wrap task with circuit breaker
- `CircuitBreakerManager` - Manage multiple circuit breakers

### Interceptor Functions

- `addBearerToken(token)` - Add Bearer token
- `addBasicAuth(username, password)` - Add Basic auth
- `addApiKey(header, key)` - Add API key
- `addHeaders(headers)` - Add custom headers
- `composeRequestInterceptors(interceptors)` - Compose interceptors

### Middleware Functions

- `createMiddlewareChain()` - Create middleware builder
- `composeMiddleware(...middleware)` - Compose middleware
- `standardMiddleware(retry, cb)` - Standard stack
- `productionMiddleware(retry, cb, req, res)` - Production stack

## License

MIT

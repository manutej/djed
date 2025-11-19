# @djed/queue

Functional message queue with TaskEither for async operations and multiple backends.

## Features

- **TaskEither for async operations** - Type-safe error handling with fp-ts
- **Multiple backends** - Memory, Bull/Redis, RabbitMQ (extensible)
- **Job scheduling** - Delayed jobs, recurring jobs, cron expressions
- **Retry logic** - Exponential backoff with Semigroup for composing strategies
- **Dead letter queues** - Handle failed jobs gracefully
- **Job composition** - Chain, fan-out, fan-in patterns
- **Priority queues** - Control job execution order
- **Rate limiting** - Control job throughput
- **Reader pattern** - Clean dependency injection for queue backends
- **Progressive API** - L1 (simple), L2 (batch/management), L3 (composition)

## Installation

```bash
npm install @djed/queue fp-ts
```

For Bull/Redis backend:
```bash
npm install bull ioredis
```

## Quick Start

### L1: Simple Queue Operations

```typescript
import { createMemoryBackend, enqueue, process } from '@djed/queue';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Create a queue backend
const queue = createMemoryBackend({ name: 'emails' });

// Add a job
const result = await pipe(
  enqueue({ to: 'user@example.com', subject: 'Hello' }),
  (op) => op(queue)
)();

// Process jobs
const emailProcessor = (job) => {
  console.log('Sending email:', job.data);
  return TE.right({ sent: true });
};

await pipe(
  process(emailProcessor, 5), // Concurrency of 5
  (op) => op(queue)
)();
```

### L2: Job Scheduling and Retry

```typescript
import {
  createMemoryBackend,
  scheduleJobAt,
  processWithRetry,
  RetryPresets,
} from '@djed/queue';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const queue = createMemoryBackend({ name: 'tasks' });

// Schedule a job for later
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
await pipe(
  scheduleJobAt(queue, { task: 'cleanup' }, tomorrow),
)();

// Process with retry strategy
const processor = (job) => {
  // Simulate failure
  if (Math.random() < 0.5) {
    return TE.left({
      type: 'JOB_FAILED',
      message: 'Random failure',
    });
  }
  return TE.right({ success: true });
};

await pipe(
  processWithRetry(processor, RetryPresets.standard(), 5),
  (op) => op(queue)
)();
```

### L3: Job Composition

```typescript
import { createMemoryBackend, fanOut, chainJobs } from '@djed/queue';
import { pipe } from 'fp-ts/function';

const queue = createMemoryBackend({ name: 'pipeline' });

// Fan-out: One job creates multiple downstream jobs
const result = await pipe(
  fanOut(
    { userId: '123', action: 'signup' },
    [
      { data: { type: 'send-welcome-email' } },
      { data: { type: 'create-profile' } },
      { data: { type: 'notify-admin' } },
    ]
  ),
  (op) => op(queue)
)();

// Chain jobs: Second job runs after first completes
await pipe(
  chainJobs(
    { step: 'fetch-data' },
    (data) => ({ step: 'process-data', input: data })
  ),
  (op) => op(queue)
)();
```

## Category Theory Concepts

### TaskEither for Async Operations

All queue operations return `TaskEither<QueueError, A>`, providing:
- Type-safe error handling
- Composable async operations
- Clear separation of happy/error paths

```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const addAndProcess = pipe(
  enqueue({ data: 'value' }),
  TE.chain(() => getJobCounts()),
  TE.map((counts) => console.log('Waiting jobs:', counts.waiting))
);

await addAndProcess(queue)();
```

### Semigroup for Retry Policies

Combine retry strategies using Semigroup:

```typescript
import { combineRetryStrategies, RetryPresets } from '@djed/queue';

const customRetry = combineRetryStrategies([
  RetryPresets.quick(),     // 3 attempts, 1s fixed
  RetryPresets.standard(),  // 5 attempts, exponential
]);

// Result: 5 attempts (max), exponential backoff (preferred), 1s base delay (max)
```

### Monoid for Job Options

Combine job options with right-biased merging:

```typescript
import { combineJobOptions } from '@djed/queue';

const defaultOpts = { priority: 0, attempts: 3 };
const customOpts = { priority: 10 };

const finalOpts = combineJobOptions([defaultOpts, customOpts]);
// Result: { priority: 10, attempts: 3 }
```

### Reader for Backend Injection

Queue operations use Reader pattern for clean dependency injection:

```typescript
import { QueueOp, enqueue, runQueueOp } from '@djed/queue';

// Define operation (doesn't require backend yet)
const addJob: QueueOp<Job> = enqueue({ data: 'value' });

// Run with specific backend
const result1 = await runQueueOp(addJob, memoryBackend)();
const result2 = await runQueueOp(addJob, bullBackend)();
```

### Foldable for Batch Operations

Process collections of jobs functionally:

```typescript
import { foldJobs, mapJobs, filterJobs } from '@djed/queue';
import { pipe } from 'fp-ts/function';

// Map over all waiting jobs
await pipe(
  mapJobs('waiting', (job) => job.data),
  (op) => op(queue)
)();

// Filter jobs by predicate
await pipe(
  filterJobs('failed', (job) => job.metadata.attempts.length > 3),
  (op) => op(queue)
)();

// Fold over jobs
await pipe(
  foldJobs('completed', 0, (count, job) => count + 1),
  (op) => op(queue)
)();
```

## Backends

### Memory Backend

In-memory queue for development and testing:

```typescript
import { createMemoryBackend } from '@djed/queue';

const queue = createMemoryBackend({
  name: 'my-queue',
  maxSize: 10000,
});
```

### Bull/Redis Backend

Production-ready queue with Redis:

```typescript
import { createBullBackend } from '@djed/queue';

const queue = createBullBackend({
  name: 'production-queue',
  backend: 'bull',
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
  },
  prefix: 'myapp',
});

// Or use connection string
import { createBullBackendFromUrl } from '@djed/queue';

const queue2 = createBullBackendFromUrl(
  'my-queue',
  'redis://localhost:6379'
);
```

## Job Scheduling

### Delayed Jobs

```typescript
import { addDelayedJob, scheduleJobAt, scheduleJobAfter } from '@djed/queue';

// Delay by milliseconds
await addDelayedJob(queue, { task: 'cleanup' }, 60000); // 1 minute

// Schedule at specific time
const date = new Date('2025-12-31T23:59:59Z');
await scheduleJobAt(queue, { task: 'new-year' }, date);

// Schedule after duration
await scheduleJobAfter(queue, { task: 'reminder' }, 3600000); // 1 hour
```

### Daily/Hourly Jobs

```typescript
import { scheduleDailyJob, scheduleHourlyJob } from '@djed/queue';

// Run every day at 9:00 AM
await scheduleDailyJob(queue, { task: 'morning-report' }, 9, 0);

// Run every hour
await scheduleHourlyJob(queue, { task: 'hourly-sync' });
```

### Job Dependencies

```typescript
import { addJobWithDependencies } from '@djed/queue';

// Job B waits for Job A to complete
const jobA = await enqueue({ step: 'A' })(queue)();
const jobB = await addJobWithDependencies(
  queue,
  { step: 'B' },
  [jobA.right.id]
)();
```

## Retry Logic

### Retry Presets

```typescript
import { RetryPresets } from '@djed/queue';

RetryPresets.noRetry();      // 1 attempt
RetryPresets.quick();        // 3 attempts, 1s fixed delay
RetryPresets.standard();     // 5 attempts, exponential backoff
RetryPresets.aggressive();   // 10 attempts, exponential backoff
RetryPresets.slow();         // 5 attempts, 10s fixed delay
RetryPresets.fibonacci();    // 8 attempts, fibonacci backoff
RetryPresets.linear(1000, 5); // 5 attempts, linear backoff
```

### Custom Retry Strategy

```typescript
const customRetry = {
  maxAttempts: 5,
  backoffType: 'custom',
  backoffDelay: 1000,
  customBackoff: (attempt) => {
    // Custom logic
    return 1000 * Math.pow(2, attempt);
  },
};

await pipe(
  processWithRetry(processor, customRetry, 5),
  (op) => op(queue)
)();
```

### Combining Retry Strategies

```typescript
import { combineRetryStrategies, RetryStrategySemigroup } from '@djed/queue';

const combined = combineRetryStrategies([
  { maxAttempts: 3, backoffType: 'fixed', backoffDelay: 1000 },
  { maxAttempts: 5, backoffType: 'exponential', backoffDelay: 2000, backoffMultiplier: 2 },
]);

// Result: maxAttempts: 5, backoffType: 'exponential', backoffDelay: 2000
```

## Priority Queues

```typescript
import { addPriorityJob, addHighPriorityJob, addLowPriorityJob } from '@djed/queue';

// Higher number = higher priority
await addHighPriorityJob(queue, { urgent: true }); // Priority: 10
await addPriorityJob(queue, { task: 'normal' }, 5);
await addLowPriorityJob(queue, { task: 'background' }); // Priority: -10
```

## Rate Limiting

```typescript
import { addRateLimitedJob } from '@djed/queue';

// Max 100 jobs per minute
const rateLimit = {
  max: 100,
  duration: 60000,
};

await addRateLimitedJob(
  queue,
  { task: 'api-call' },
  rateLimit
)();
```

## Dead Letter Queue

```typescript
import { getFailedJobs, retryFailedJob, moveToFailed } from '@djed/queue';
import { pipe } from 'fp-ts/function';

// Get all failed jobs
const failed = await pipe(
  getFailedJobs(),
  (op) => op(queue)
)();

// Retry a specific failed job
if (failed._tag === 'Right' && failed.right.length > 0) {
  const jobId = failed.right[0].id;
  await pipe(
    retryFailedJob(jobId),
    (op) => op(queue)
  )();
}
```

## Queue Management

```typescript
import { pause, resume, drain, clean, close } from '@djed/queue';
import { pipe } from 'fp-ts/function';

// Pause processing
await pipe(pause(), (op) => op(queue))();

// Resume processing
await pipe(resume(), (op) => op(queue))();

// Remove all waiting jobs
await pipe(drain(), (op) => op(queue))();

// Clean old completed jobs (older than 1 hour)
await pipe(clean(3600000, 'completed'), (op) => op(queue))();

// Close queue
await pipe(close(), (op) => op(queue))();
```

## Event Handling

```typescript
import { onEvent } from '@djed/queue';

const handler = (event) => {
  switch (event.type) {
    case 'job:added':
      console.log('Job added:', event.job.id);
      break;
    case 'job:completed':
      console.log('Job completed:', event.job.id, event.result);
      break;
    case 'job:failed':
      console.log('Job failed:', event.job.id, event.error);
      break;
  }
};

await pipe(onEvent(handler), (op) => op(queue))();
```

## Advanced Patterns

### Job Pipeline (Chain)

```typescript
import { chainJobs } from '@djed/queue';

await pipe(
  chainJobs(
    { step: 1, data: 'fetch' },
    (result) => ({ step: 2, data: 'transform' }),
    { priority: 5 },
    { priority: 5 }
  ),
  (op) => op(queue)
)();
```

### Fan-Out Pattern

```typescript
import { fanOut } from '@djed/queue';

// One job triggers multiple downstream jobs
await pipe(
  fanOut(
    { userId: '123' },
    [
      { data: { action: 'email' } },
      { data: { action: 'sms' } },
      { data: { action: 'push' } },
    ]
  ),
  (op) => op(queue)
)();
```

### Fan-In Pattern

```typescript
import { fanIn } from '@djed/queue';

// Multiple jobs complete before final job
await pipe(
  fanIn(
    [
      { data: { source: 'db1' } },
      { data: { source: 'db2' } },
      { data: { source: 'api' } },
    ],
    { action: 'aggregate-all' }
  ),
  (op) => op(queue)
)();
```

### Batch Processing

```typescript
import { processBatch } from '@djed/queue';

const batchProcessor = (job) => {
  console.log('Processing:', job.data);
  return TE.right(job.data);
};

// Process 10 jobs at a time
await pipe(
  processBatch(batchProcessor, 10),
  (op) => op(queue)
)();
```

## Progressive API Levels

### L1: Simple Operations
- `enqueue` - Add jobs
- `getJob` - Get job by ID
- `removeJob` - Remove job
- `process` - Process jobs

### L2: Batch & Management
- `enqueueBulk` - Add multiple jobs
- `getJobsByStatus` - Query jobs
- `pause/resume` - Control queue
- `clean/drain` - Maintenance
- `processWithRetry` - Retry logic
- Event handling

### L3: Composition & Advanced
- `chainJobs` - Sequential composition
- `fanOut/fanIn` - Parallel patterns
- `processBatch` - Batch operations
- `mapJobs/filterJobs/foldJobs` - Functional collection ops
- `retryOp` - Retry any operation
- `withTimeout` - Add timeouts

## TypeScript

Fully typed with TypeScript. All operations are type-safe:

```typescript
interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

const result = await pipe(
  enqueue<EmailJob>({
    to: 'user@example.com',
    subject: 'Hello',
    body: 'Welcome!',
  }),
  (op) => op(queue)
)();

// result is Either<QueueError, Job<EmailJob>>
```

## Error Handling

```typescript
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const result = await pipe(
  enqueue({ data: 'value' }),
  (op) => op(queue)
)();

if (E.isLeft(result)) {
  // Handle error
  console.error('Queue error:', result.left);
} else {
  // Handle success
  console.log('Job added:', result.right);
}
```

## Testing

Use memory backend for testing:

```typescript
import { createMemoryBackend } from '@djed/queue';

describe('Email Queue', () => {
  let queue;

  beforeEach(() => {
    queue = createMemoryBackend({ name: 'test' });
  });

  afterEach(async () => {
    await queue.close()();
  });

  it('should process email jobs', async () => {
    const result = await enqueue({ to: 'test@example.com' })(queue)();
    expect(E.isRight(result)).toBe(true);
  });
});
```

## Best Practices

1. **Use Reader pattern** - Define operations separately from backend
2. **Handle errors with Either** - Always check Left/Right
3. **Use retry presets** - Start with standard strategies
4. **Combine strategies with Semigroup** - Compose retry policies
5. **Use dead letter queues** - Handle failures gracefully
6. **Monitor events** - Track job lifecycle
7. **Clean old jobs** - Prevent memory/storage growth
8. **Use priorities wisely** - Don't overuse high priority
9. **Rate limit carefully** - Prevent overwhelming downstream services
10. **Test with memory backend** - Fast, reliable tests

## License

MIT

## Author

LUXOR

# @djed/telemetry

> Functional observability and telemetry library with Prometheus and OpenTelemetry support

A comprehensive, type-safe telemetry library built with functional programming patterns using fp-ts. Provides metrics collection, distributed tracing, health checks, and structured logging with a progressive API design.

## Features

- **Metrics Collection**: Counters, Gauges, Histograms, and Summaries (Prometheus-compatible)
- **Distributed Tracing**: OpenTelemetry-compatible span management with W3C Trace Context propagation
- **Health Checks**: Composable health check system with monoid patterns
- **Structured Logging**: Writer monad integration for logging with values
- **Performance Monitoring**: Built-in performance measurement utilities
- **Multiple Exporters**: Prometheus, OpenTelemetry, and Console exporters
- **Backend-Agnostic**: Works with any backend through configurable exporters
- **Type-Safe**: Full TypeScript support with comprehensive types
- **Functional Patterns**: Category theory patterns (Monoid, Reader, Writer, TaskEither)

## Installation

```bash
npm install @djed/telemetry fp-ts
```

### Optional Peer Dependencies

For OpenTelemetry integration:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics
```

## Progressive API Design

The library provides three levels of API complexity:

- **L1**: Simple counters, gauges, and basic tracing
- **L2**: Advanced metrics (histograms), span management, health checks
- **L3**: Full observability with distributed tracing, Reader pattern, exporters

## Quick Start

### L1: Simple Metrics

```typescript
import { L1 } from '@djed/telemetry';

// Create and increment a counter
const requestCounter = L1.counter('http_requests_total', 'Total HTTP requests');
const updated = L1.inc(1)(requestCounter);

// Create and set a gauge
const memoryGauge = L1.gauge('memory_usage_bytes', 'Memory usage in bytes');
const withValue = L1.set(1024 * 1024)(memoryGauge);

// Basic span
const span = L1.createSpan('http_request', 'SERVER');
// ... do work ...
const endedSpan = L1.endSpan(span);
```

### L2: Advanced Usage

```typescript
import { L2 } from '@djed/telemetry';
import { pipe } from 'fp-ts/function';

// Histogram for latency tracking
const latencyHistogram = L2.histogram(
  'http_request_duration_seconds',
  'HTTP request latency in seconds'
);

// Observe values
const withObservation = L2.observe(0.125)(latencyHistogram);

// Active span with events
const activeSpan = L2.startSpan('database_query', 'CLIENT');
const withEvent = activeSpan
  .addEvent('query_started')
  .setAttribute('db.statement', 'SELECT * FROM users')
  .addEvent('query_completed');

const finalSpan = withEvent.end();

// Writer monad for logging
const computation = pipe(
  L2.tellInfo('Starting computation'),
  L2.chainWriter(() => {
    const result = 42;
    return pipe(
      L2.tellInfo('Computation completed', { result: String(result) }),
      L2.mapWriter(() => result)
    );
  })
);

const [result, logs] = L2.withLogging(computation);
```

### L3: Full Observability

```typescript
import { L3, startSession, generateDashboard } from '@djed/telemetry';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Start a telemetry session
const session = startSession({
  tracing: {
    enabled: true,
    serviceName: 'my-service',
    sampleRate: 1.0,
  },
  metrics: {
    enabled: true,
    prefix: 'myapp_',
  },
  exporters: [
    { type: 'prometheus' },
    { type: 'opentelemetry', endpoint: 'http://localhost:4318/v1/traces' },
  ],
});

// Record metrics with Reader pattern
const recordMetrics = pipe(
  L3.recordCounter('requests', 1, { method: 'GET', path: '/api/users' }),
  TE.chain(() => L3.recordHistogram('request_duration', 0.156))
);

// Trace async operations
const fetchUsers = async () => {
  const users = await fetch('/api/users').then((r) => r.json());
  return users;
};

const tracedOperation = L3.traceAsync('fetch_users', fetchUsers, 'CLIENT');

// Run operations
session.run(recordMetrics)().then((result) => {
  console.log('Metrics recorded:', result);
});

session.run(tracedOperation)().then((result) => {
  console.log('Operation traced:', result);
});

// Generate dashboard data
session.run(generateDashboard())().then((dashboard) => {
  console.log('Dashboard:', dashboard);
});

// Cleanup
await session.shutdown();
```

## Category Theory Patterns

### Monoid for Combining Metrics

```typescript
import { L3, counter, CounterMonoid } from '@djed/telemetry';

const counter1 = L3.inc(5)(L3.counter('requests', 'Total requests'));
const counter2 = L3.inc(3)(L3.counter('requests', 'Total requests'));

// Combine counters (values are summed)
const combined = CounterMonoid.concat(counter1, counter2);
console.log(combined.value); // 8
```

### Writer Monad for Logging

```typescript
import { L2 } from '@djed/telemetry';
import { pipe } from 'fp-ts/function';

const processData = (data: number[]) =>
  pipe(
    L2.tellInfo('Starting data processing'),
    L2.chainWriter(() => {
      const sum = data.reduce((a, b) => a + b, 0);
      return pipe(
        L2.tellDebug('Sum calculated', { sum: String(sum) }),
        L2.chainWriter(() => {
          const avg = sum / data.length;
          return pipe(
            L2.tellInfo('Processing complete', { avg: String(avg) }),
            L2.mapWriter(() => avg)
          );
        })
      );
    })
  );

const [average, logs] = L2.withLogging(processData([1, 2, 3, 4, 5]));
console.log('Average:', average); // 3
console.log('Logs:', logs.length); // 3
```

### Reader Pattern for Telemetry Context

```typescript
import { L3, TelemetryOp, createDefaultContext } from '@djed/telemetry';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Compose telemetry operations
const businessLogic: TelemetryOp<string> = pipe(
  L3.recordCounter('operations', 1),
  TE.chain(() =>
    L3.traceAsync('business_operation', async () => {
      // Business logic here
      return 'success';
    })
  )
);

// Run with context
const context = createDefaultContext();
businessLogic(context)().then((result) => {
  console.log('Result:', result);
});
```

### TaskEither for Async Operations

```typescript
import { L3 } from '@djed/telemetry';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const safeOperation = L3.traceAsync(
  'safe_operation',
  async () => {
    // Might throw
    if (Math.random() > 0.5) throw new Error('Random failure');
    return 'success';
  }
);

pipe(
  safeOperation,
  TE.fold(
    (error) => {
      console.error('Operation failed:', error);
      return TE.right('recovered');
    },
    (result) => {
      console.log('Operation succeeded:', result);
      return TE.right(result);
    }
  )
);
```

## Metrics

### Counter

Monotonically increasing value:

```typescript
import { counter, inc } from '@djed/telemetry';

const c = counter('total_requests', 'Total number of requests', {
  method: 'GET',
});

const updated = inc(1)(c);
```

### Gauge

Value that can go up or down:

```typescript
import { gauge, set, incGauge, dec } from '@djed/telemetry';

const g = gauge('active_connections', 'Number of active connections');

const withValue = set(42)(g);
const incremented = incGauge(1)(withValue);
const decremented = dec(1)(incremented);
```

### Histogram

Distribution of values (for latencies, sizes):

```typescript
import { histogram, observe } from '@djed/telemetry';

const h = histogram(
  'request_duration_seconds',
  'Request duration in seconds',
  [0.01, 0.05, 0.1, 0.5, 1.0, 5.0] // Custom buckets
);

const observed = observe(0.234)(h);
```

### Summary

Statistical distribution with quantiles:

```typescript
import { summary } from '@djed/telemetry';

const s = summary(
  'response_size_bytes',
  'Response size in bytes',
  [0.5, 0.9, 0.95, 0.99] // Quantiles
);
```

## Distributed Tracing

### Basic Tracing

```typescript
import { startSpan } from '@djed/telemetry';

const span = startSpan('http_request', 'SERVER', undefined, {
  'http.method': 'GET',
  'http.path': '/api/users',
});

span
  .addEvent('request_received')
  .setAttribute('http.status_code', '200')
  .addEvent('response_sent');

const finished = span.end();
```

### Trace Context Propagation

```typescript
import {
  serializeTraceParent,
  parseTraceParent,
  injectTraceContext,
  extractTraceContext,
} from '@djed/telemetry';
import * as O from 'fp-ts/Option';

// Inject trace context into HTTP headers
const headers = injectTraceContext(span.span.context, {
  'Content-Type': 'application/json',
});

// Extract trace context from incoming headers
const incomingContext = extractTraceContext(headers);

if (O.isSome(incomingContext)) {
  const childSpan = startSpan('child_operation', 'INTERNAL', incomingContext.value);
  // ... do work ...
  childSpan.end();
}
```

### Tracing Functions

```typescript
import { traceAsync } from '@djed/telemetry';

const fetchData = async (id: string) => {
  const response = await fetch(`/api/data/${id}`);
  return response.json();
};

const tracedFetch = traceAsync('fetch_data', () => fetchData('123'), 'CLIENT', {
  'data.id': '123',
});
```

## Health Checks

### Simple Health Checks

```typescript
import { healthy, degraded, unhealthy } from '@djed/telemetry';

const check1 = healthy('database', 'Database connection OK');
const check2 = degraded('cache', 'Cache running but slow');
const check3 = unhealthy('external_api', 'API timeout');
```

### Composable Health Checks

```typescript
import {
  fromAsyncPredicate,
  timed,
  withTimeout,
  withRetry,
  runHealthChecks,
} from '@djed/telemetry';
import { pipe } from 'fp-ts/function';

const dbCheck = pipe(
  fromAsyncPredicate(
    'database',
    async () => {
      // Check database connection
      return true;
    },
    'Database connection failed'
  ),
  timed,
  withTimeout(5000),
  withRetry(3, 1000)
);

const checks = [dbCheck];

runHealthChecks(checks)().then((result) => {
  if (result._tag === 'Right') {
    console.log('Health:', result.right.status);
    console.log('Checks:', result.right.checks);
  }
});
```

### Predefined Health Checks

```typescript
import { memoryCheck, uptimeCheck, databaseCheck } from '@djed/telemetry';

const checks = [
  memoryCheck(90), // Alert if memory usage > 90%
  uptimeCheck(),
  databaseCheck('postgres', async () => {
    // Check PostgreSQL connection
    return true;
  }),
];
```

## Structured Logging

### Writer Monad Pattern

```typescript
import { tellInfo, tellError, withLogging, chainWriter, mapWriter } from '@djed/telemetry';
import { pipe } from 'fp-ts/function';

const computation = pipe(
  tellInfo('Starting process'),
  chainWriter(() => {
    try {
      const result = 42;
      return pipe(
        tellInfo('Process completed', { result: String(result) }),
        mapWriter(() => result)
      );
    } catch (error) {
      return tellError('Process failed', {}, error);
    }
  })
);

const [value, logs] = withLogging(computation);
```

### Log Filtering and Analysis

```typescript
import {
  createLogCollection,
  filterByLevel,
  groupByLevel,
  getErrorLogs,
  getLogStats,
} from '@djed/telemetry';

const collection = createLogCollection(logs);

// Filter by level
const errorLogs = filterByLevel('error')(collection);

// Group by level
const grouped = groupByLevel(collection);

// Get statistics
const stats = getLogStats(collection);
console.log('Total logs:', stats?.total);
console.log('Error count:', stats?.errorCount);
```

## Exporters

### Prometheus Exporter

```typescript
import { exportPrometheus, getAllMetrics } from '@djed/telemetry';

// Export metrics in Prometheus text format
const metricsResult = await session.run(getAllMetrics())();

if (metricsResult._tag === 'Right') {
  const prometheusExport = exportPrometheus(metricsResult.right);

  if (prometheusExport._tag === 'Right') {
    console.log(prometheusExport.right);
    // # HELP http_requests_total Total HTTP requests
    // # TYPE http_requests_total counter
    // http_requests_total{method="GET"} 42
  }
}
```

### OpenTelemetry Exporter

```typescript
import { exportOpenTelemetry, getAllSpans } from '@djed/telemetry';

// Export spans in OpenTelemetry format
const spansResult = await session.run(getAllSpans())();

if (spansResult._tag === 'Right') {
  const otelExport = exportOpenTelemetry(
    spansResult.right,
    'my-service',
    '1.0.0'
  );

  if (otelExport._tag === 'Right') {
    // Send to OTLP collector
    console.log(JSON.stringify(otelExport.right, null, 2));
  }
}
```

### Console Exporter

```typescript
import { exportMetricsToConsole, exportSpansToConsole } from '@djed/telemetry';

// Pretty-print metrics to console
exportMetricsToConsole(metrics);

// Pretty-print spans to console
exportSpansToConsole(spans);
```

## Configuration

```typescript
import { startSession, TelemetryConfig } from '@djed/telemetry';

const config: TelemetryConfig = {
  metrics: {
    enabled: true,
    prefix: 'myapp_',
    defaultLabels: {
      environment: 'production',
      version: '1.0.0',
    },
    histogramBuckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  },
  tracing: {
    enabled: true,
    serviceName: 'my-service',
    sampleRate: 0.1, // Sample 10% of traces
  },
  health: {
    enabled: true,
    interval: 30000, // Check every 30 seconds
  },
  exporters: [
    {
      type: 'prometheus',
    },
    {
      type: 'opentelemetry',
      endpoint: 'http://localhost:4318/v1/traces',
      headers: {
        'Authorization': 'Bearer token',
      },
    },
    {
      type: 'console',
    },
  ],
  globalLabels: {
    service: 'my-service',
    environment: 'production',
  },
};

const session = startSession(config);
```

## Dashboard Generation

```typescript
import { generateDashboard } from '@djed/telemetry';

const dashboardResult = await session.run(generateDashboard())();

if (dashboardResult._tag === 'Right') {
  const dashboard = dashboardResult.right;

  console.log('Active Traces:', dashboard.activeTraces);
  console.log('Health Status:', dashboard.health.status);
  console.log('Metric Count:', dashboard.metrics.length);
  console.log('Timestamp:', dashboard.timestamp);
}
```

## Performance Monitoring

```typescript
import { measurePerformance, measureAsyncPerformance, timeFunction } from '@djed/telemetry';

// Measure sync function
const [result, measurement] = measurePerformance('calculation', () => {
  return Array(1000000).fill(0).reduce((a, b) => a + b, 0);
});

console.log('Duration:', measurement.duration, 'ms');

// Measure async function
const [data, asyncMeasurement] = await measureAsyncPerformance('fetch', async () => {
  return fetch('/api/data').then((r) => r.json());
});

// Automatic histogram recording with Reader pattern
const timedOp = timeFunction('expensive_operation', () => {
  // ... expensive work ...
  return 'result';
});
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { counter, inc, gauge, set } from '@djed/telemetry';

describe('Telemetry', () => {
  it('should increment counter', () => {
    const c = counter('test', 'Test counter');
    const updated = inc(5)(c);

    expect(updated.value).toBe(5);
  });

  it('should set gauge value', () => {
    const g = gauge('test', 'Test gauge');
    const updated = set(42)(g);

    expect(updated.value).toBe(42);
  });
});
```

## Best Practices

1. **Use Progressive API**: Start with L1 for simple use cases, move to L2/L3 as needs grow
2. **Label Cardinality**: Keep label combinations low to avoid metric explosion
3. **Sampling**: Use sampling for high-volume traces to reduce overhead
4. **Error Handling**: Always handle TaskEither results properly
5. **Context Propagation**: Use W3C Trace Context for distributed tracing
6. **Metric Naming**: Follow Prometheus naming conventions (snake_case, descriptive)
7. **Health Checks**: Implement timeouts and retries for external dependencies
8. **Cleanup**: Always call `session.shutdown()` when done

## TypeScript Support

The library is written in TypeScript with comprehensive type definitions:

```typescript
import type {
  Counter,
  Gauge,
  Histogram,
  Span,
  TelemetryContext,
  TelemetryOp,
  TelemetryConfig,
  HealthCheck,
  LogEntry,
} from '@djed/telemetry';
```

## Contributing

See the main Djed repository for contribution guidelines.

## License

MIT

## Related Packages

- `@djed/logger` - Structured logging wrapper
- `@djed/http` - HTTP client with telemetry
- `@djed/effect` - Effect system with telemetry integration

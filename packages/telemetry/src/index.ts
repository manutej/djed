/**
 * @djed/telemetry
 * Functional observability and telemetry library with Prometheus and OpenTelemetry support
 *
 * Progressive API Design:
 * - L1: Simple counters, gauges, and basic tracing
 * - L2: Advanced metrics (histograms), span management, health checks
 * - L3: Full observability with distributed tracing, Reader pattern, exporters
 */

import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

// ============================================================================
// Core Types
// ============================================================================

export * from './types';

// ============================================================================
// L1 API - Simple Metrics and Basic Operations
// ============================================================================

/**
 * L1: Simple metrics API for basic counters and gauges
 */
export namespace L1 {
  // Metrics
  export { counter, inc, gauge, set, incGauge, dec } from './metrics';

  // Basic tracing
  export {
    createSpan,
    endSpan,
    generateTraceId,
    generateSpanId,
    createTraceContext,
  } from './tracing';

  // Simple logging
  export { trace, debug, info, warn, error, fatal, createLogEntry } from './logging';

  // Basic health checks
  export { healthy, degraded, unhealthy, createHealthCheck } from './health';
}

// ============================================================================
// L2 API - Advanced Metrics and Span Management
// ============================================================================

/**
 * L2: Advanced metrics and span management
 */
export namespace L2 {
  // Include L1
  export * from './metrics';
  export * from './tracing';
  export * from './logging';
  export * from './health';

  // Advanced metrics (histograms, summaries)
  export {
    histogram,
    observe,
    summary,
    DEFAULT_BUCKETS,
    combineMetrics,
    createCollection,
    addMetric,
    filterByName,
    filterByLabels,
    getMetric,
    updateMetric,
    calculatePercentile,
    histogramAverage,
  } from './metrics';

  // Span management
  export {
    startSpan,
    addSpanEvent,
    setSpanAttribute,
    setSpanStatus,
    addSpanLink,
    createChildContext,
    getSpanDuration,
    isRootSpan,
  } from './tracing';

  // Writer monad for logging
  export {
    tell,
    tellTrace,
    tellDebug,
    tellInfo,
    tellWarn,
    tellError,
    tellFatal,
    withLogging,
    mapWriter,
    chainWriter,
    ofWriter,
    withTraceContext,
    withContext,
    formatJson,
    formatText,
  } from './logging';

  // Health check composition
  export {
    fromPredicate,
    fromAsyncPredicate,
    timed,
    withTimeout,
    withRetry,
    runHealthChecks,
    memoryCheck,
    uptimeCheck,
    databaseCheck,
    serviceCheck,
  } from './health';
}

// ============================================================================
// L3 API - Full Observability with Distributed Tracing
// ============================================================================

/**
 * L3: Full observability with Reader pattern and exporters
 */
export namespace L3 {
  // Include everything from L2
  export * from './metrics';
  export * from './tracing';
  export * from './logging';
  export * from './health';

  // Monoid instances for combining
  export {
    CounterMonoid,
    GaugeMonoid,
    HistogramMonoid,
    mergeCollections,
  } from './metrics';

  export { HealthStatusMonoid, HealthCheckMonoid } from './health';

  export { LogEntryMonoid } from './logging';

  // Reader pattern operations
  export {
    recordCounter,
    recordGauge,
    recordHistogram,
    getAllMetrics,
    clearMetrics,
    timeFunction,
    timeAsyncFunction,
  } from './metrics';

  export {
    startTracedSpan,
    endTracedSpan,
    trace,
    traceAsync,
    traceTaskEither,
    getAllSpans,
    getSpan,
    getSpansByTraceId,
    clearSpans,
    getChildSpans,
    buildSpanTree,
    serializeTraceParent,
    parseTraceParent,
    injectTraceContext,
    extractTraceContext,
  } from './tracing';

  export {
    registerHealthCheck,
    runAllHealthChecks,
    getHealthCheck,
    clearHealthChecks,
    formatHealthCheck as formatHealthCheckText,
    formatSystemHealth as formatSystemHealthText,
    isHealthy,
    getHealthSummary,
  } from './health';

  export {
    log,
    logWithTrace,
    filterByLevel,
    filterByTimeRange,
    groupByLevel,
    getErrorLogs,
    formatCollection,
    logExecution,
    logAsyncExecution,
    aggregateLogs,
    sampleLogs,
    limitLogs,
    getLogStats,
    formatLogStats,
  } from './logging';

  // Exporters
  export * from './exporters';
}

// ============================================================================
// Default Export - Full API
// ============================================================================

export * from './types';
export * from './metrics';
export * from './tracing';
export * from './health';
export * from './logging';
export * from './exporters';

// ============================================================================
// Telemetry Context Factory
// ============================================================================

import {
  TelemetryConfig,
  TelemetryContext,
  TelemetryOp,
  Metric,
  Span,
  HealthCheck,
  TelemetryError,
} from './types';

/**
 * Create a telemetry context
 */
export const createTelemetryContext = (
  config: TelemetryConfig
): TelemetryContext => ({
  config,
  metrics: new Map<string, Metric>(),
  spans: new Map<string, Span>(),
  healthChecks: new Map<string, () => TE.TaskEither<TelemetryError, HealthCheck>>(),
});

/**
 * Default telemetry configuration
 */
export const defaultConfig: TelemetryConfig = {
  metrics: {
    enabled: true,
    histogramBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  },
  tracing: {
    enabled: true,
    serviceName: 'djed-service',
    sampleRate: 1.0,
  },
  health: {
    enabled: true,
  },
  exporters: [
    {
      type: 'console',
    },
  ],
};

/**
 * Create telemetry context with default config
 */
export const createDefaultContext = (): TelemetryContext =>
  createTelemetryContext(defaultConfig);

/**
 * Run a telemetry operation with context
 */
export const runTelemetryOp = <A>(
  op: TelemetryOp<A>,
  ctx: TelemetryContext = createDefaultContext()
): TE.TaskEither<TelemetryError, A> => op(ctx);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a simple telemetry session
 */
export interface TelemetrySession {
  readonly context: TelemetryContext;
  readonly run: <A>(op: TelemetryOp<A>) => TE.TaskEither<TelemetryError, A>;
  readonly shutdown: () => Promise<void>;
}

/**
 * Start a telemetry session
 */
export const startSession = (config: Partial<TelemetryConfig> = {}): TelemetrySession => {
  const fullConfig: TelemetryConfig = {
    ...defaultConfig,
    ...config,
    metrics: { ...defaultConfig.metrics, ...config.metrics },
    tracing: { ...defaultConfig.tracing, ...config.tracing },
    health: { ...defaultConfig.health, ...config.health },
    exporters: config.exporters || defaultConfig.exporters,
  };

  const context = createTelemetryContext(fullConfig);

  return {
    context,
    run: (op) => op(context),
    shutdown: async () => {
      // Clear all data
      context.metrics.clear();
      context.spans.clear();
      context.healthChecks.clear();
    },
  };
};

// ============================================================================
// Dashboard Data Generation
// ============================================================================

import { DashboardData, MetricSnapshot, SystemHealth } from './types';
import { getAllMetrics } from './metrics';
import { getAllSpans } from './tracing';
import { runAllHealthChecks } from './health';

/**
 * Generate dashboard data from telemetry context
 */
export const generateDashboard = (): TelemetryOp<DashboardData> => (ctx) => {
  return pipe(
    TE.Do,
    TE.bind('metrics', () => getAllMetrics()(ctx)),
    TE.bind('spans', () => getAllSpans()(ctx)),
    TE.bind('health', () =>
      pipe(
        runAllHealthChecks()(ctx),
        TE.orElse(() =>
          TE.right({
            status: 'healthy' as const,
            checks: [],
            timestamp: new Date(),
          })
        )
      )
    ),
    TE.map(({ metrics, spans, health }) => {
      const metricSnapshots: MetricSnapshot[] = metrics.map((m) => {
        let value: number | readonly number[];

        switch (m._tag) {
          case 'Counter':
          case 'Gauge':
            value = m.value;
            break;
          case 'Histogram':
            value = m.buckets.map((b) => b.count);
            break;
          case 'Summary':
            value = m.quantiles.map((q) => q.value);
            break;
          default:
            value = 0;
        }

        return {
          name: m.metadata.name,
          type: m.metadata.type,
          value,
          labels: m.metadata.labels,
          timestamp: new Date(),
        };
      });

      return {
        metrics: metricSnapshots,
        health,
        activeTraces: new Set(spans.map((s) => s.context.traceId)).size,
        timestamp: new Date(),
      };
    })
  );
};

// ============================================================================
// Performance Monitoring Utilities
// ============================================================================

import { PerformanceMeasurement, ResourceUsage } from './types';

/**
 * Measure performance
 */
export const measurePerformance = <A>(
  name: string,
  fn: () => A
): [A, PerformanceMeasurement] => {
  const startTime = new Date();
  const result = fn();
  const endTime = new Date();

  const measurement: PerformanceMeasurement = {
    name,
    duration: endTime.getTime() - startTime.getTime(),
    startTime,
    endTime,
  };

  return [result, measurement];
};

/**
 * Measure async performance
 */
export const measureAsyncPerformance = async <A>(
  name: string,
  fn: () => Promise<A>
): Promise<[A, PerformanceMeasurement]> => {
  const startTime = new Date();
  const result = await fn();
  const endTime = new Date();

  const measurement: PerformanceMeasurement = {
    name,
    duration: endTime.getTime() - startTime.getTime(),
    startTime,
    endTime,
  };

  return [result, measurement];
};

/**
 * Get current resource usage (Node.js)
 */
export const getResourceUsage = (): ResourceUsage => {
  const usage = process.memoryUsage();

  return {
    memory: usage.heapUsed,
    timestamp: new Date(),
  };
};

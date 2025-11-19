/**
 * @djed/telemetry - Core Types
 * Functional observability types with category theory patterns
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';

// ============================================================================
// Error Types
// ============================================================================

export type TelemetryError =
  | { readonly _tag: 'MetricError'; readonly message: string; readonly cause?: unknown }
  | { readonly _tag: 'SpanError'; readonly message: string; readonly cause?: unknown }
  | { readonly _tag: 'ExportError'; readonly message: string; readonly cause?: unknown }
  | { readonly _tag: 'ConfigError'; readonly message: string; readonly cause?: unknown };

export const metricError = (message: string, cause?: unknown): TelemetryError => ({
  _tag: 'MetricError',
  message,
  cause,
});

export const spanError = (message: string, cause?: unknown): TelemetryError => ({
  _tag: 'SpanError',
  message,
  cause,
});

export const exportError = (message: string, cause?: unknown): TelemetryError => ({
  _tag: 'ExportError',
  message,
  cause,
});

export const configError = (message: string, cause?: unknown): TelemetryError => ({
  _tag: 'ConfigError',
  message,
  cause,
});

// ============================================================================
// Metric Types
// ============================================================================

/**
 * Metric types following Prometheus conventions
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Labels for metric dimensions (key-value pairs)
 */
export type Labels = Record<string, string>;

/**
 * Base metric metadata
 */
export interface MetricMetadata {
  readonly name: string;
  readonly help: string;
  readonly type: MetricType;
  readonly labels?: Labels;
}

/**
 * Counter - monotonically increasing value
 */
export interface Counter {
  readonly _tag: 'Counter';
  readonly metadata: MetricMetadata;
  readonly value: number;
}

/**
 * Gauge - value that can go up or down
 */
export interface Gauge {
  readonly _tag: 'Gauge';
  readonly metadata: MetricMetadata;
  readonly value: number;
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  readonly le: number; // less than or equal
  readonly count: number;
}

/**
 * Histogram - distribution of values
 */
export interface Histogram {
  readonly _tag: 'Histogram';
  readonly metadata: MetricMetadata;
  readonly buckets: readonly HistogramBucket[];
  readonly sum: number;
  readonly count: number;
}

/**
 * Summary quantile
 */
export interface SummaryQuantile {
  readonly quantile: number;
  readonly value: number;
}

/**
 * Summary - statistical distribution
 */
export interface Summary {
  readonly _tag: 'Summary';
  readonly metadata: MetricMetadata;
  readonly quantiles: readonly SummaryQuantile[];
  readonly sum: number;
  readonly count: number;
}

/**
 * Union type for all metrics
 */
export type Metric = Counter | Gauge | Histogram | Summary;

/**
 * Metric collection - aggregation of metrics
 */
export interface MetricCollection {
  readonly metrics: readonly Metric[];
  readonly timestamp: Date;
}

// ============================================================================
// Tracing Types
// ============================================================================

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly traceFlags: number;
  readonly traceState?: string;
}

/**
 * Span status
 */
export type SpanStatus =
  | { readonly code: 'OK' }
  | { readonly code: 'ERROR'; readonly message: string };

/**
 * Span event
 */
export interface SpanEvent {
  readonly name: string;
  readonly timestamp: Date;
  readonly attributes?: Labels;
}

/**
 * Span link
 */
export interface SpanLink {
  readonly context: TraceContext;
  readonly attributes?: Labels;
}

/**
 * Span kind
 */
export type SpanKind = 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';

/**
 * Span - represents a unit of work in a distributed trace
 */
export interface Span {
  readonly context: TraceContext;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly attributes: Labels;
  readonly events: readonly SpanEvent[];
  readonly links: readonly SpanLink[];
  readonly status: SpanStatus;
}

/**
 * Active span with methods to update it
 */
export interface ActiveSpan {
  readonly span: Span;
  readonly addEvent: (name: string, attributes?: Labels) => ActiveSpan;
  readonly setAttribute: (key: string, value: string) => ActiveSpan;
  readonly setStatus: (status: SpanStatus) => ActiveSpan;
  readonly end: () => Span;
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check result
 */
export interface HealthCheck {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly timestamp: Date;
  readonly duration?: number; // in milliseconds
  readonly metadata?: Record<string, unknown>;
}

/**
 * System health
 */
export interface SystemHealth {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheck[];
  readonly timestamp: Date;
}

// ============================================================================
// Logging Types
// ============================================================================

/**
 * Log level
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: Labels;
  readonly error?: unknown;
}

/**
 * Log collection
 */
export interface LogCollection {
  readonly entries: readonly LogEntry[];
}

// ============================================================================
// Telemetry Configuration
// ============================================================================

/**
 * Metric configuration
 */
export interface MetricConfig {
  readonly enabled: boolean;
  readonly prefix?: string;
  readonly defaultLabels?: Labels;
  readonly histogramBuckets?: readonly number[];
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  readonly enabled: boolean;
  readonly serviceName: string;
  readonly sampleRate: number; // 0.0 to 1.0
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly enabled: boolean;
  readonly interval?: number; // in milliseconds
}

/**
 * Exporter configuration
 */
export interface ExporterConfig {
  readonly type: 'prometheus' | 'opentelemetry' | 'console';
  readonly endpoint?: string;
  readonly headers?: Record<string, string>;
}

/**
 * Complete telemetry configuration
 */
export interface TelemetryConfig {
  readonly metrics: MetricConfig;
  readonly tracing: TracingConfig;
  readonly health: HealthCheckConfig;
  readonly exporters: readonly ExporterConfig[];
  readonly globalLabels?: Labels;
}

// ============================================================================
// Telemetry Context (Reader Pattern)
// ============================================================================

/**
 * Telemetry context for Reader monad
 */
export interface TelemetryContext {
  readonly config: TelemetryConfig;
  readonly metrics: Map<string, Metric>;
  readonly spans: Map<string, Span>;
  readonly healthChecks: Map<string, () => TE.TaskEither<TelemetryError, HealthCheck>>;
}

// ============================================================================
// Telemetry Operations
// ============================================================================

/**
 * Telemetry operation using Reader and TaskEither
 */
export type TelemetryOp<A> = (ctx: TelemetryContext) => TE.TaskEither<TelemetryError, A>;

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Dashboard metric snapshot
 */
export interface MetricSnapshot {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number | readonly number[];
  readonly labels?: Labels;
  readonly timestamp: Date;
}

/**
 * Dashboard data
 */
export interface DashboardData {
  readonly metrics: readonly MetricSnapshot[];
  readonly health: SystemHealth;
  readonly activeTraces: number;
  readonly timestamp: Date;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

/**
 * Performance measurement
 */
export interface PerformanceMeasurement {
  readonly name: string;
  readonly duration: number; // in milliseconds
  readonly startTime: Date;
  readonly endTime: Date;
  readonly metadata?: Labels;
}

/**
 * Resource usage
 */
export interface ResourceUsage {
  readonly cpu?: number; // percentage
  readonly memory?: number; // bytes
  readonly handles?: number;
  readonly timestamp: Date;
}

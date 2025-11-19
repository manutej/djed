/**
 * @djed/telemetry - Console Exporter
 * Export telemetry data to console for development
 */

import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import {
  Metric,
  Span,
  SystemHealth,
  HealthCheck,
  TelemetryError,
  exportError,
  DashboardData,
} from '../types';

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format duration in human-readable format
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

/**
 * Format timestamp
 */
const formatTimestamp = (date: Date): string => {
  return date.toISOString();
};

/**
 * Create indentation
 */
const indent = (level: number): string => '  '.repeat(level);

// ============================================================================
// Metric Formatting
// ============================================================================

/**
 * Format labels
 */
const formatLabels = (labels?: Record<string, string>): string => {
  if (!labels || Object.keys(labels).length === 0) return '';
  const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
  return `{${pairs.join(', ')}}`;
};

/**
 * Format counter
 */
const formatCounter = (metric: Metric): string => {
  if (metric._tag !== 'Counter') return '';

  const { name, labels } = metric.metadata;
  return `[COUNTER] ${name}${formatLabels(labels)}: ${metric.value}`;
};

/**
 * Format gauge
 */
const formatGauge = (metric: Metric): string => {
  if (metric._tag !== 'Gauge') return '';

  const { name, labels } = metric.metadata;
  return `[GAUGE] ${name}${formatLabels(labels)}: ${metric.value}`;
};

/**
 * Format histogram
 */
const formatHistogram = (metric: Metric): string => {
  if (metric._tag !== 'Histogram') return '';

  const { name, labels } = metric.metadata;
  const lines: string[] = [];

  lines.push(`[HISTOGRAM] ${name}${formatLabels(labels)}`);
  lines.push(`${indent(1)}Count: ${metric.count}`);
  lines.push(`${indent(1)}Sum: ${metric.sum.toFixed(4)}`);
  lines.push(
    `${indent(1)}Avg: ${metric.count > 0 ? (metric.sum / metric.count).toFixed(4) : 0}`
  );
  lines.push(`${indent(1)}Buckets:`);

  metric.buckets.forEach((bucket) => {
    lines.push(`${indent(2)}le ${bucket.le}: ${bucket.count}`);
  });

  return lines.join('\n');
};

/**
 * Format summary
 */
const formatSummary = (metric: Metric): string => {
  if (metric._tag !== 'Summary') return '';

  const { name, labels } = metric.metadata;
  const lines: string[] = [];

  lines.push(`[SUMMARY] ${name}${formatLabels(labels)}`);
  lines.push(`${indent(1)}Count: ${metric.count}`);
  lines.push(`${indent(1)}Sum: ${metric.sum.toFixed(4)}`);
  lines.push(`${indent(1)}Quantiles:`);

  metric.quantiles.forEach((q) => {
    lines.push(`${indent(2)}p${q.quantile * 100}: ${q.value.toFixed(4)}`);
  });

  return lines.join('\n');
};

/**
 * Format metric
 */
export const formatMetric = (metric: Metric): string => {
  switch (metric._tag) {
    case 'Counter':
      return formatCounter(metric);
    case 'Gauge':
      return formatGauge(metric);
    case 'Histogram':
      return formatHistogram(metric);
    case 'Summary':
      return formatSummary(metric);
    default:
      return `[UNKNOWN] ${(metric as any).metadata.name}`;
  }
};

/**
 * Format metrics collection
 */
export const formatMetrics = (metrics: readonly Metric[]): string => {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('METRICS');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  if (metrics.length === 0) {
    lines.push('No metrics available');
  } else {
    metrics.forEach((metric, index) => {
      lines.push(formatMetric(metric));
      if (index < metrics.length - 1) {
        lines.push('');
      }
    });
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
};

// ============================================================================
// Span Formatting
// ============================================================================

/**
 * Format span status
 */
const formatSpanStatus = (span: Span): string => {
  if (span.status.code === 'OK') {
    return '✓ OK';
  } else {
    return `✗ ERROR: ${span.status.message}`;
  }
};

/**
 * Format span
 */
export const formatSpan = (span: Span, indentLevel: number = 0): string => {
  const lines: string[] = [];
  const prefix = indent(indentLevel);

  const duration = span.endTime
    ? formatDuration(span.endTime.getTime() - span.startTime.getTime())
    : 'in progress';

  lines.push(
    `${prefix}[${span.kind}] ${span.name} (${duration}) ${formatSpanStatus(span)}`
  );
  lines.push(`${prefix}  Trace ID: ${span.context.traceId}`);
  lines.push(`${prefix}  Span ID: ${span.context.spanId}`);

  if (span.context.parentSpanId) {
    lines.push(`${prefix}  Parent: ${span.context.parentSpanId}`);
  }

  if (Object.keys(span.attributes).length > 0) {
    lines.push(`${prefix}  Attributes:`);
    Object.entries(span.attributes).forEach(([key, value]) => {
      lines.push(`${prefix}    ${key}: ${value}`);
    });
  }

  if (span.events.length > 0) {
    lines.push(`${prefix}  Events:`);
    span.events.forEach((event) => {
      const eventTime = formatTimestamp(event.timestamp);
      lines.push(`${prefix}    ${eventTime} - ${event.name}`);
      if (event.attributes) {
        Object.entries(event.attributes).forEach(([key, value]) => {
          lines.push(`${prefix}      ${key}: ${value}`);
        });
      }
    });
  }

  return lines.join('\n');
};

/**
 * Format spans collection
 */
export const formatSpans = (spans: readonly Span[]): string => {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('DISTRIBUTED TRACES');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  if (spans.length === 0) {
    lines.push('No spans available');
  } else {
    // Group by trace ID
    const traceGroups = new Map<string, Span[]>();
    spans.forEach((span) => {
      const traceId = span.context.traceId;
      const existing = traceGroups.get(traceId) || [];
      traceGroups.set(traceId, [...existing, span]);
    });

    traceGroups.forEach((traceSpans, traceId) => {
      lines.push(`Trace: ${traceId} (${traceSpans.length} spans)`);
      lines.push('');

      // Build span tree
      const rootSpans = traceSpans.filter((s) => !s.context.parentSpanId);
      const formatSpanTree = (span: Span, level: number) => {
        lines.push(formatSpan(span, level));
        lines.push('');

        // Find children
        const children = traceSpans.filter(
          (s) => s.context.parentSpanId === span.context.spanId
        );
        children.forEach((child) => formatSpanTree(child, level + 1));
      };

      rootSpans.forEach((root) => formatSpanTree(root, 1));
      lines.push('─────────────────────────────────────────────────');
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
};

// ============================================================================
// Health Check Formatting
// ============================================================================

/**
 * Format health status
 */
const formatHealthStatus = (status: string): string => {
  switch (status) {
    case 'healthy':
      return '✓ HEALTHY';
    case 'degraded':
      return '⚠ DEGRADED';
    case 'unhealthy':
      return '✗ UNHEALTHY';
    default:
      return status.toUpperCase();
  }
};

/**
 * Format health check
 */
export const formatHealthCheck = (check: HealthCheck): string => {
  const lines: string[] = [];

  const status = formatHealthStatus(check.status);
  const duration = check.duration ? ` (${check.duration}ms)` : '';

  lines.push(`  ${status} ${check.name}${duration}`);

  if (check.message) {
    lines.push(`    Message: ${check.message}`);
  }

  if (check.metadata) {
    lines.push(`    Metadata:`);
    Object.entries(check.metadata).forEach(([key, value]) => {
      lines.push(`      ${key}: ${JSON.stringify(value)}`);
    });
  }

  return lines.join('\n');
};

/**
 * Format system health
 */
export const formatSystemHealth = (health: SystemHealth): string => {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('SYSTEM HEALTH');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  lines.push(`Overall Status: ${formatHealthStatus(health.status)}`);
  lines.push(`Timestamp: ${formatTimestamp(health.timestamp)}`);
  lines.push('');

  lines.push(`Health Checks (${health.checks.length}):`);
  lines.push('');

  if (health.checks.length === 0) {
    lines.push('  No health checks configured');
  } else {
    health.checks.forEach((check) => {
      lines.push(formatHealthCheck(check));
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
};

// ============================================================================
// Dashboard Formatting
// ============================================================================

/**
 * Format dashboard data
 */
export const formatDashboard = (dashboard: DashboardData): string => {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('TELEMETRY DASHBOARD');
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  lines.push(`Timestamp: ${formatTimestamp(dashboard.timestamp)}`);
  lines.push(`Active Traces: ${dashboard.activeTraces}`);
  lines.push('');

  lines.push('─── System Health ─────────────────────────────────');
  lines.push(`Status: ${formatHealthStatus(dashboard.health.status)}`);
  lines.push(`Checks: ${dashboard.health.checks.length}`);
  const failedChecks = dashboard.health.checks.filter(
    (c) => c.status !== 'healthy'
  ).length;
  if (failedChecks > 0) {
    lines.push(`Failed Checks: ${failedChecks}`);
  }
  lines.push('');

  lines.push('─── Metrics Overview ──────────────────────────────');
  lines.push(`Total Metrics: ${dashboard.metrics.length}`);

  const metricsByType: Record<string, number> = {};
  dashboard.metrics.forEach((m) => {
    metricsByType[m.type] = (metricsByType[m.type] || 0) + 1;
  });

  Object.entries(metricsByType).forEach(([type, count]) => {
    lines.push(`  ${type}: ${count}`);
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
};

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export metrics to console
 */
export const exportMetricsToConsole = (
  metrics: readonly Metric[]
): E.Either<TelemetryError, void> => {
  try {
    console.log(formatMetrics(metrics));
    return E.right(undefined);
  } catch (error) {
    return E.left(exportError('Failed to export metrics to console', error));
  }
};

/**
 * Export spans to console
 */
export const exportSpansToConsole = (
  spans: readonly Span[]
): E.Either<TelemetryError, void> => {
  try {
    console.log(formatSpans(spans));
    return E.right(undefined);
  } catch (error) {
    return E.left(exportError('Failed to export spans to console', error));
  }
};

/**
 * Export health to console
 */
export const exportHealthToConsole = (
  health: SystemHealth
): E.Either<TelemetryError, void> => {
  try {
    console.log(formatSystemHealth(health));
    return E.right(undefined);
  } catch (error) {
    return E.left(exportError('Failed to export health to console', error));
  }
};

/**
 * Export dashboard to console
 */
export const exportDashboardToConsole = (
  dashboard: DashboardData
): E.Either<TelemetryError, void> => {
  try {
    console.log(formatDashboard(dashboard));
    return E.right(undefined);
  } catch (error) {
    return E.left(exportError('Failed to export dashboard to console', error));
  }
};

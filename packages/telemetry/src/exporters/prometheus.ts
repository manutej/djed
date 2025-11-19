/**
 * @djed/telemetry - Prometheus Exporter
 * Export metrics in Prometheus text format
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  Metric,
  Counter,
  Gauge,
  Histogram,
  Summary,
  Labels,
  TelemetryError,
  exportError,
  MetricCollection,
} from '../types';

// ============================================================================
// Prometheus Format Types
// ============================================================================

/**
 * Prometheus metric line
 */
interface PrometheusLine {
  readonly metric: string;
  readonly labels?: Labels;
  readonly value: number | string;
}

// ============================================================================
// Label Formatting
// ============================================================================

/**
 * Format labels for Prometheus
 */
const formatLabels = (labels?: Labels): string => {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }

  const pairs = Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');

  return `{${pairs}}`;
};

/**
 * Escape label values
 */
const escapeLabel = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
};

// ============================================================================
// Metric Formatting
// ============================================================================

/**
 * Format a counter for Prometheus
 */
const formatCounter = (counter: Counter): string[] => {
  const lines: string[] = [];
  const { name, help, labels } = counter.metadata;

  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} counter`);
  lines.push(`${name}${formatLabels(labels)} ${counter.value}`);

  return lines;
};

/**
 * Format a gauge for Prometheus
 */
const formatGauge = (gauge: Gauge): string[] => {
  const lines: string[] = [];
  const { name, help, labels } = gauge.metadata;

  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} gauge`);
  lines.push(`${name}${formatLabels(labels)} ${gauge.value}`);

  return lines;
};

/**
 * Format a histogram for Prometheus
 */
const formatHistogram = (histogram: Histogram): string[] => {
  const lines: string[] = [];
  const { name, help, labels } = histogram.metadata;

  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} histogram`);

  // Buckets
  histogram.buckets.forEach((bucket) => {
    const bucketLabels = { ...labels, le: String(bucket.le) };
    lines.push(`${name}_bucket${formatLabels(bucketLabels)} ${bucket.count}`);
  });

  // +Inf bucket
  const infLabels = { ...labels, le: '+Inf' };
  lines.push(`${name}_bucket${formatLabels(infLabels)} ${histogram.count}`);

  // Sum and count
  lines.push(`${name}_sum${formatLabels(labels)} ${histogram.sum}`);
  lines.push(`${name}_count${formatLabels(labels)} ${histogram.count}`);

  return lines;
};

/**
 * Format a summary for Prometheus
 */
const formatSummary = (summary: Summary): string[] => {
  const lines: string[] = [];
  const { name, help, labels } = summary.metadata;

  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} summary`);

  // Quantiles
  summary.quantiles.forEach((q) => {
    const quantileLabels = { ...labels, quantile: String(q.quantile) };
    lines.push(`${name}${formatLabels(quantileLabels)} ${q.value}`);
  });

  // Sum and count
  lines.push(`${name}_sum${formatLabels(labels)} ${summary.sum}`);
  lines.push(`${name}_count${formatLabels(labels)} ${summary.count}`);

  return lines;
};

/**
 * Format a single metric
 */
const formatMetric = (metric: Metric): string[] => {
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
      return [];
  }
};

// ============================================================================
// Exporter
// ============================================================================

/**
 * Export metrics to Prometheus text format
 */
export const exportPrometheus = (
  metrics: readonly Metric[]
): E.Either<TelemetryError, string> => {
  try {
    const lines: string[] = [];

    metrics.forEach((metric) => {
      const metricLines = formatMetric(metric);
      lines.push(...metricLines);
      lines.push(''); // Empty line between metrics
    });

    return E.right(lines.join('\n'));
  } catch (error) {
    return E.left(exportError('Failed to export Prometheus metrics', error));
  }
};

/**
 * Export metric collection to Prometheus format
 */
export const exportPrometheusCollection = (
  collection: MetricCollection
): E.Either<TelemetryError, string> => {
  return exportPrometheus(collection.metrics);
};

/**
 * Export to HTTP response format
 */
export const exportPrometheusHttp = (
  metrics: readonly Metric[]
): E.Either<TelemetryError, { body: string; contentType: string }> => {
  return pipe(
    exportPrometheus(metrics),
    E.map((body) => ({
      body,
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
    }))
  );
};

// ============================================================================
// Metric Name Validation
// ============================================================================

/**
 * Validate Prometheus metric name
 */
export const isValidMetricName = (name: string): boolean => {
  // Must match [a-zA-Z_:][a-zA-Z0-9_:]*
  const regex = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  return regex.test(name);
};

/**
 * Sanitize metric name for Prometheus
 */
export const sanitizeMetricName = (name: string): string => {
  // Replace invalid characters with underscores
  return name
    .replace(/[^a-zA-Z0-9_:]/g, '_')
    .replace(/^[0-9]/, '_$&'); // Prefix digits with underscore
};

/**
 * Validate label name
 */
export const isValidLabelName = (name: string): boolean => {
  // Must match [a-zA-Z_][a-zA-Z0-9_]*
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return regex.test(name) && !name.startsWith('__'); // __ prefix reserved
};

/**
 * Sanitize label name
 */
export const sanitizeLabelName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
};

// ============================================================================
// Metric Aggregation for Prometheus
// ============================================================================

/**
 * Group metrics by name (for aggregation)
 */
export const groupMetricsByName = (
  metrics: readonly Metric[]
): Map<string, Metric[]> => {
  const groups = new Map<string, Metric[]>();

  metrics.forEach((metric) => {
    const name = metric.metadata.name;
    const existing = groups.get(name) || [];
    groups.set(name, [...existing, metric]);
  });

  return groups;
};

/**
 * Create Prometheus-compatible metric with prefix
 */
export const withPrefix = (prefix: string) => <M extends Metric>(metric: M): M => ({
  ...metric,
  metadata: {
    ...metric.metadata,
    name: `${prefix}${metric.metadata.name}`,
  },
});

/**
 * Add default labels to metric
 */
export const withDefaultLabels = (defaultLabels: Labels) => <M extends Metric>(
  metric: M
): M => ({
  ...metric,
  metadata: {
    ...metric.metadata,
    labels: {
      ...defaultLabels,
      ...metric.metadata.labels,
    },
  },
});

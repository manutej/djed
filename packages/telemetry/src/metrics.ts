/**
 * @djed/telemetry - Metrics Module
 * Functional metrics collection with Monoid patterns for combining metrics
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { Monoid } from 'fp-ts/Monoid';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import {
  Counter,
  Gauge,
  Histogram,
  Summary,
  Metric,
  MetricMetadata,
  Labels,
  TelemetryError,
  metricError,
  HistogramBucket,
  SummaryQuantile,
  MetricCollection,
  TelemetryContext,
  TelemetryOp,
} from './types';

// ============================================================================
// L1 API - Simple Counters and Gauges
// ============================================================================

/**
 * Create a counter
 */
export const counter = (name: string, help: string, labels?: Labels): Counter => ({
  _tag: 'Counter',
  metadata: {
    name,
    help,
    type: 'counter',
    labels,
  },
  value: 0,
});

/**
 * Increment a counter
 */
export const inc = (amount: number = 1) => (c: Counter): Counter => ({
  ...c,
  value: c.value + Math.abs(amount), // Counters only go up
});

/**
 * Create a gauge
 */
export const gauge = (name: string, help: string, labels?: Labels): Gauge => ({
  _tag: 'Gauge',
  metadata: {
    name,
    help,
    type: 'gauge',
    labels,
  },
  value: 0,
});

/**
 * Set gauge value
 */
export const set = (value: number) => (g: Gauge): Gauge => ({
  ...g,
  value,
});

/**
 * Increment gauge
 */
export const incGauge = (amount: number = 1) => (g: Gauge): Gauge => ({
  ...g,
  value: g.value + amount,
});

/**
 * Decrement gauge
 */
export const dec = (amount: number = 1) => (g: Gauge): Gauge => ({
  ...g,
  value: g.value - amount,
});

// ============================================================================
// L2 API - Histograms and Advanced Metrics
// ============================================================================

/**
 * Default histogram buckets (in seconds)
 */
export const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Create a histogram
 */
export const histogram = (
  name: string,
  help: string,
  buckets: readonly number[] = DEFAULT_BUCKETS,
  labels?: Labels
): Histogram => ({
  _tag: 'Histogram',
  metadata: {
    name,
    help,
    type: 'histogram',
    labels,
  },
  buckets: buckets.map((le) => ({ le, count: 0 })),
  sum: 0,
  count: 0,
});

/**
 * Observe a value in a histogram
 */
export const observe = (value: number) => (h: Histogram): Histogram => {
  const newBuckets = h.buckets.map((bucket) => ({
    ...bucket,
    count: value <= bucket.le ? bucket.count + 1 : bucket.count,
  }));

  return {
    ...h,
    buckets: newBuckets,
    sum: h.sum + value,
    count: h.count + 1,
  };
};

/**
 * Create a summary
 */
export const summary = (
  name: string,
  help: string,
  quantiles: readonly number[] = [0.5, 0.9, 0.99],
  labels?: Labels
): Summary => ({
  _tag: 'Summary',
  metadata: {
    name,
    help,
    type: 'summary',
    labels,
  },
  quantiles: quantiles.map((q) => ({ quantile: q, value: 0 })),
  sum: 0,
  count: 0,
});

// ============================================================================
// Monoid Instances for Combining Metrics
// ============================================================================

/**
 * Monoid for combining counters (addition)
 */
export const CounterMonoid: Monoid<Counter> = {
  concat: (x, y) => ({
    ...x,
    value: x.value + y.value,
  }),
  empty: counter('', ''),
};

/**
 * Monoid for combining gauges (takes the last value)
 */
export const GaugeMonoid: Monoid<Gauge> = {
  concat: (x, y) => y, // Last write wins
  empty: gauge('', ''),
};

/**
 * Monoid for combining histogram buckets
 */
const HistogramBucketMonoid: Monoid<HistogramBucket> = {
  concat: (x, y) => ({
    le: x.le,
    count: x.count + y.count,
  }),
  empty: { le: 0, count: 0 },
};

/**
 * Monoid for combining histograms
 */
export const HistogramMonoid: Monoid<Histogram> = {
  concat: (x, y) => {
    // Combine buckets with matching le values
    const combinedBuckets = x.buckets.map((xBucket, i) => {
      const yBucket = y.buckets[i];
      return yBucket ? HistogramBucketMonoid.concat(xBucket, yBucket) : xBucket;
    });

    return {
      ...x,
      buckets: combinedBuckets,
      sum: x.sum + y.sum,
      count: x.count + y.count,
    };
  },
  empty: histogram('', ''),
};

/**
 * Combine metrics of the same type
 */
export const combineMetrics = (metrics: readonly Metric[]): E.Either<TelemetryError, Metric> => {
  if (metrics.length === 0) {
    return E.left(metricError('Cannot combine empty metrics array'));
  }

  const first = metrics[0];
  const rest = metrics.slice(1);

  // Check all metrics are the same type
  const allSameType = rest.every((m) => m._tag === first._tag);
  if (!allSameType) {
    return E.left(metricError('Cannot combine metrics of different types'));
  }

  switch (first._tag) {
    case 'Counter':
      return E.right(rest.reduce((acc, m) => CounterMonoid.concat(acc, m as Counter), first));
    case 'Gauge':
      return E.right(rest.reduce((acc, m) => GaugeMonoid.concat(acc, m as Gauge), first));
    case 'Histogram':
      return E.right(rest.reduce((acc, m) => HistogramMonoid.concat(acc, m as Histogram), first));
    default:
      return E.left(metricError(`Combining ${first._tag} not yet supported`));
  }
};

// ============================================================================
// L3 API - Metric Collections and Operations
// ============================================================================

/**
 * Create a metric collection
 */
export const createCollection = (metrics: readonly Metric[]): MetricCollection => ({
  metrics,
  timestamp: new Date(),
});

/**
 * Add a metric to a collection
 */
export const addMetric = (metric: Metric) => (
  collection: MetricCollection
): MetricCollection => ({
  ...collection,
  metrics: [...collection.metrics, metric],
});

/**
 * Filter metrics by name
 */
export const filterByName = (name: string) => (
  collection: MetricCollection
): MetricCollection => ({
  ...collection,
  metrics: collection.metrics.filter((m) => m.metadata.name === name),
});

/**
 * Filter metrics by labels
 */
export const filterByLabels = (labels: Labels) => (
  collection: MetricCollection
): MetricCollection => ({
  ...collection,
  metrics: collection.metrics.filter((m) => {
    if (!m.metadata.labels) return false;
    return Object.entries(labels).every(
      ([key, value]) => m.metadata.labels![key] === value
    );
  }),
});

/**
 * Get metric by name
 */
export const getMetric = (name: string) => (
  collection: MetricCollection
): O.Option<Metric> => {
  const metric = collection.metrics.find((m) => m.metadata.name === name);
  return metric ? O.some(metric) : O.none;
};

/**
 * Update metric in collection
 */
export const updateMetric = <M extends Metric>(
  name: string,
  update: (m: M) => M
) => (collection: MetricCollection): E.Either<TelemetryError, MetricCollection> => {
  const index = collection.metrics.findIndex((m) => m.metadata.name === name);

  if (index === -1) {
    return E.left(metricError(`Metric ${name} not found`));
  }

  const updated = [...collection.metrics];
  updated[index] = update(updated[index] as M);

  return E.right({
    ...collection,
    metrics: updated,
  });
};

// ============================================================================
// Reader Pattern - Telemetry Operations
// ============================================================================

/**
 * Record a counter increment
 */
export const recordCounter = (
  name: string,
  amount: number = 1,
  labels?: Labels
): TelemetryOp<Counter> => (ctx) => {
  const existing = ctx.metrics.get(name);

  if (existing && existing._tag === 'Counter') {
    const updated = inc(amount)(existing);
    ctx.metrics.set(name, updated);
    return TE.right(updated);
  }

  const newCounter = pipe(
    counter(name, `Counter: ${name}`, labels),
    inc(amount)
  );
  ctx.metrics.set(name, newCounter);
  return TE.right(newCounter);
};

/**
 * Record a gauge value
 */
export const recordGauge = (
  name: string,
  value: number,
  labels?: Labels
): TelemetryOp<Gauge> => (ctx) => {
  const existing = ctx.metrics.get(name);

  if (existing && existing._tag === 'Gauge') {
    const updated = set(value)(existing);
    ctx.metrics.set(name, updated);
    return TE.right(updated);
  }

  const newGauge = set(value)(gauge(name, `Gauge: ${name}`, labels));
  ctx.metrics.set(name, newGauge);
  return TE.right(newGauge);
};

/**
 * Record a histogram observation
 */
export const recordHistogram = (
  name: string,
  value: number,
  buckets?: readonly number[],
  labels?: Labels
): TelemetryOp<Histogram> => (ctx) => {
  const existing = ctx.metrics.get(name);

  if (existing && existing._tag === 'Histogram') {
    const updated = observe(value)(existing);
    ctx.metrics.set(name, updated);
    return TE.right(updated);
  }

  const newHistogram = observe(value)(
    histogram(name, `Histogram: ${name}`, buckets, labels)
  );
  ctx.metrics.set(name, newHistogram);
  return TE.right(newHistogram);
};

/**
 * Get all metrics from context
 */
export const getAllMetrics = (): TelemetryOp<readonly Metric[]> => (ctx) => {
  return TE.right(Array.from(ctx.metrics.values()));
};

/**
 * Clear all metrics
 */
export const clearMetrics = (): TelemetryOp<void> => (ctx) => {
  ctx.metrics.clear();
  return TE.right(undefined);
};

// ============================================================================
// Performance Helpers
// ============================================================================

/**
 * Time a function execution and record as histogram
 */
export const timeFunction = <A>(
  name: string,
  fn: () => A,
  labels?: Labels
): TelemetryOp<A> => (ctx) => {
  const start = Date.now();

  return pipe(
    TE.tryCatch(
      async () => {
        const result = fn();
        const duration = (Date.now() - start) / 1000; // Convert to seconds

        // Record duration
        await recordHistogram(name, duration, undefined, labels)(ctx)();

        return result;
      },
      (error) => metricError(`Failed to time function ${name}`, error)
    )
  );
};

/**
 * Time an async function execution
 */
export const timeAsyncFunction = <A>(
  name: string,
  fn: () => Promise<A>,
  labels?: Labels
): TelemetryOp<A> => (ctx) => {
  const start = Date.now();

  return pipe(
    TE.tryCatch(
      async () => {
        const result = await fn();
        const duration = (Date.now() - start) / 1000;

        await recordHistogram(name, duration, undefined, labels)(ctx)();

        return result;
      },
      (error) => metricError(`Failed to time async function ${name}`, error)
    )
  );
};

// ============================================================================
// Metric Aggregation Utilities
// ============================================================================

/**
 * Calculate percentile from histogram
 */
export const calculatePercentile = (percentile: number) => (
  h: Histogram
): O.Option<number> => {
  if (h.count === 0) return O.none;

  const targetCount = Math.ceil(h.count * percentile);
  const bucket = h.buckets.find((b) => b.count >= targetCount);

  return bucket ? O.some(bucket.le) : O.none;
};

/**
 * Get histogram average
 */
export const histogramAverage = (h: Histogram): number => {
  return h.count > 0 ? h.sum / h.count : 0;
};

/**
 * Merge metric collections
 */
export const mergeCollections = (
  collections: readonly MetricCollection[]
): MetricCollection => {
  const allMetrics = collections.flatMap((c) => c.metrics);
  return createCollection(allMetrics);
};

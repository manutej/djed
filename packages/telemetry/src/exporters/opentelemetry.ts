/**
 * @djed/telemetry - OpenTelemetry Exporter
 * Export spans in OpenTelemetry format
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import {
  Span,
  TraceContext,
  SpanStatus,
  SpanEvent,
  SpanKind,
  Labels,
  TelemetryError,
  exportError,
} from '../types';

// ============================================================================
// OpenTelemetry Format Types
// ============================================================================

/**
 * OpenTelemetry span representation (simplified)
 */
export interface OtelSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano?: string;
  readonly attributes: Record<string, string | number | boolean>;
  readonly events: readonly OtelEvent[];
  readonly status: OtelStatus;
  readonly traceState?: string;
}

/**
 * OpenTelemetry event
 */
export interface OtelEvent {
  readonly name: string;
  readonly timeUnixNano: string;
  readonly attributes: Record<string, string | number | boolean>;
}

/**
 * OpenTelemetry status
 */
export interface OtelStatus {
  readonly code: 'UNSET' | 'OK' | 'ERROR';
  readonly message?: string;
}

/**
 * OpenTelemetry trace export
 */
export interface OtelTraceExport {
  readonly resourceSpans: readonly {
    readonly resource: {
      readonly attributes: Record<string, string>;
    };
    readonly scopeSpans: readonly {
      readonly scope: {
        readonly name: string;
        readonly version?: string;
      };
      readonly spans: readonly OtelSpan[];
    }[];
  }[];
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert Date to Unix nanoseconds
 */
const toUnixNano = (date: Date): string => {
  return (date.getTime() * 1_000_000).toString();
};

/**
 * Convert span status
 */
const convertStatus = (status: SpanStatus): OtelStatus => {
  if (status.code === 'OK') {
    return { code: 'OK' };
  } else {
    return {
      code: 'ERROR',
      message: status.message,
    };
  }
};

/**
 * Convert span event
 */
const convertEvent = (event: SpanEvent): OtelEvent => ({
  name: event.name,
  timeUnixNano: toUnixNano(event.timestamp),
  attributes: event.attributes || {},
});

/**
 * Convert span to OpenTelemetry format
 */
export const convertSpan = (span: Span): OtelSpan => ({
  traceId: span.context.traceId,
  spanId: span.context.spanId,
  parentSpanId: span.context.parentSpanId,
  name: span.name,
  kind: span.kind,
  startTimeUnixNano: toUnixNano(span.startTime),
  endTimeUnixNano: span.endTime ? toUnixNano(span.endTime) : undefined,
  attributes: span.attributes,
  events: span.events.map(convertEvent),
  status: convertStatus(span.status),
  traceState: span.context.traceState,
});

// ============================================================================
// Exporter
// ============================================================================

/**
 * Export spans to OpenTelemetry format
 */
export const exportOpenTelemetry = (
  spans: readonly Span[],
  serviceName: string = 'djed-telemetry',
  serviceVersion?: string
): E.Either<TelemetryError, OtelTraceExport> => {
  try {
    const otelSpans = spans.map(convertSpan);

    const traceExport: OtelTraceExport = {
      resourceSpans: [
        {
          resource: {
            attributes: {
              'service.name': serviceName,
              ...(serviceVersion ? { 'service.version': serviceVersion } : {}),
            },
          },
          scopeSpans: [
            {
              scope: {
                name: '@djed/telemetry',
                version: '0.1.0',
              },
              spans: otelSpans,
            },
          ],
        },
      ],
    };

    return E.right(traceExport);
  } catch (error) {
    return E.left(exportError('Failed to export OpenTelemetry spans', error));
  }
};

/**
 * Export to JSON string
 */
export const exportOpenTelemetryJson = (
  spans: readonly Span[],
  serviceName?: string,
  serviceVersion?: string
): E.Either<TelemetryError, string> => {
  return pipe(
    exportOpenTelemetry(spans, serviceName, serviceVersion),
    E.chain((traceExport) =>
      E.tryCatch(
        () => JSON.stringify(traceExport, null, 2),
        (error) => exportError('Failed to serialize OpenTelemetry export', error)
      )
    )
  );
};

/**
 * Export to OTLP HTTP format
 */
export const exportOtlpHttp = (
  spans: readonly Span[],
  serviceName?: string,
  serviceVersion?: string
): E.Either<
  TelemetryError,
  {
    body: string;
    contentType: string;
    headers: Record<string, string>;
  }
> => {
  return pipe(
    exportOpenTelemetryJson(spans, serviceName, serviceVersion),
    E.map((body) => ({
      body,
      contentType: 'application/json',
      headers: {
        'Content-Type': 'application/json',
      },
    }))
  );
};

// ============================================================================
// Span Filtering and Sampling
// ============================================================================

/**
 * Filter completed spans only
 */
export const filterCompleted = (spans: readonly Span[]): readonly Span[] => {
  return spans.filter((span) => span.endTime !== undefined);
};

/**
 * Filter spans by trace ID
 */
export const filterByTraceId = (traceId: string) => (
  spans: readonly Span[]
): readonly Span[] => {
  return spans.filter((span) => span.context.traceId === traceId);
};

/**
 * Sample spans (take percentage)
 */
export const sampleSpans = (percentage: number) => (
  spans: readonly Span[]
): readonly Span[] => {
  if (percentage >= 100) return spans;
  if (percentage <= 0) return [];

  return spans.filter(() => Math.random() * 100 < percentage);
};

// ============================================================================
// Batch Exporting
// ============================================================================

/**
 * Batch spans by size
 */
export const batchSpans = (batchSize: number) => (
  spans: readonly Span[]
): readonly (readonly Span[])[] => {
  const batches: Span[][] = [];

  for (let i = 0; i < spans.length; i += batchSize) {
    batches.push(spans.slice(i, i + batchSize));
  }

  return batches;
};

/**
 * Export spans in batches
 */
export const exportInBatches = (
  spans: readonly Span[],
  batchSize: number,
  serviceName?: string,
  serviceVersion?: string
): E.Either<TelemetryError, readonly OtelTraceExport[]> => {
  const batches = batchSpans(batchSize)(spans);

  const results = batches.map((batch) =>
    exportOpenTelemetry(batch, serviceName, serviceVersion)
  );

  // Check if any exports failed
  const failed = results.find(E.isLeft);
  if (failed) {
    return failed;
  }

  // Extract all successful exports
  return E.right(results.map((result) => (result as E.Right<OtelTraceExport>).right));
};

// ============================================================================
// Remote Export (Async)
// ============================================================================

/**
 * Export spans to remote OTLP endpoint
 */
export const exportToOtlpEndpoint = (
  endpoint: string,
  spans: readonly Span[],
  serviceName?: string,
  serviceVersion?: string,
  headers?: Record<string, string>
): TE.TaskEither<TelemetryError, void> => {
  return pipe(
    TE.fromEither(exportOtlpHttp(spans, serviceName, serviceVersion)),
    TE.chain((payload) =>
      TE.tryCatch(
        async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              ...payload.headers,
              ...headers,
            },
            body: payload.body,
          });

          if (!response.ok) {
            throw new Error(
              `OTLP export failed: ${response.status} ${response.statusText}`
            );
          }
        },
        (error) => exportError('Failed to export to OTLP endpoint', error)
      )
    )
  );
};

// ============================================================================
// Span Analysis
// ============================================================================

/**
 * Calculate trace duration
 */
export const getTraceDuration = (spans: readonly Span[]): number | null => {
  if (spans.length === 0) return null;

  const startTimes = spans.map((s) => s.startTime.getTime());
  const endTimes = spans
    .filter((s) => s.endTime)
    .map((s) => s.endTime!.getTime());

  if (endTimes.length === 0) return null;

  const minStart = Math.min(...startTimes);
  const maxEnd = Math.max(...endTimes);

  return maxEnd - minStart;
};

/**
 * Count spans by status
 */
export const countByStatus = (
  spans: readonly Span[]
): { ok: number; error: number } => {
  return spans.reduce(
    (acc, span) => {
      if (span.status.code === 'OK') {
        return { ...acc, ok: acc.ok + 1 };
      } else {
        return { ...acc, error: acc.error + 1 };
      }
    },
    { ok: 0, error: 0 }
  );
};

/**
 * Get span tree depth
 */
export const getSpanDepth = (span: Span, allSpans: readonly Span[]): number => {
  if (!span.context.parentSpanId) return 0;

  const parent = allSpans.find((s) => s.context.spanId === span.context.parentSpanId);
  if (!parent) return 1;

  return 1 + getSpanDepth(parent, allSpans);
};

/**
 * @djed/telemetry - Distributed Tracing Module
 * OpenTelemetry-compatible distributed tracing with functional patterns
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import {
  Span,
  ActiveSpan,
  TraceContext,
  SpanStatus,
  SpanEvent,
  SpanLink,
  SpanKind,
  Labels,
  TelemetryError,
  spanError,
  TelemetryContext,
  TelemetryOp,
} from './types';

// ============================================================================
// L1 API - Basic Span Creation
// ============================================================================

/**
 * Generate a random hex string of specified length
 */
const randomHex = (length: number): string => {
  const bytes = new Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return bytes.join('');
};

/**
 * Generate a trace ID (32 hex characters)
 */
export const generateTraceId = (): string => randomHex(16);

/**
 * Generate a span ID (16 hex characters)
 */
export const generateSpanId = (): string => randomHex(8);

/**
 * Create a new trace context
 */
export const createTraceContext = (
  parentSpanId?: string,
  traceId?: string
): TraceContext => ({
  traceId: traceId || generateTraceId(),
  spanId: generateSpanId(),
  parentSpanId,
  traceFlags: 1, // Sampled by default
  traceState: undefined,
});

/**
 * Create a child trace context
 */
export const createChildContext = (parent: TraceContext): TraceContext => ({
  ...createTraceContext(parent.spanId, parent.traceId),
  traceFlags: parent.traceFlags,
  traceState: parent.traceState,
});

/**
 * Create a new span
 */
export const createSpan = (
  name: string,
  kind: SpanKind = 'INTERNAL',
  context?: TraceContext,
  attributes?: Labels
): Span => ({
  context: context || createTraceContext(),
  name,
  kind,
  startTime: new Date(),
  attributes: attributes || {},
  events: [],
  links: [],
  status: { code: 'OK' },
});

/**
 * End a span
 */
export const endSpan = (span: Span): Span => ({
  ...span,
  endTime: new Date(),
});

// ============================================================================
// L2 API - Active Spans with Mutations
// ============================================================================

/**
 * Create an active span that can be updated
 */
export const startSpan = (
  name: string,
  kind: SpanKind = 'INTERNAL',
  parentContext?: TraceContext,
  attributes?: Labels
): ActiveSpan => {
  const context = parentContext ? createChildContext(parentContext) : createTraceContext();
  const span = createSpan(name, kind, context, attributes);

  const addEvent = (eventName: string, eventAttributes?: Labels): ActiveSpan => {
    const event: SpanEvent = {
      name: eventName,
      timestamp: new Date(),
      attributes: eventAttributes,
    };

    return startSpanFromSpan({
      ...span,
      events: [...span.events, event],
    });
  };

  const setAttribute = (key: string, value: string): ActiveSpan => {
    return startSpanFromSpan({
      ...span,
      attributes: { ...span.attributes, [key]: value },
    });
  };

  const setStatus = (status: SpanStatus): ActiveSpan => {
    return startSpanFromSpan({
      ...span,
      status,
    });
  };

  const end = (): Span => endSpan(span);

  return {
    span,
    addEvent,
    setAttribute,
    setStatus,
    end,
  };
};

/**
 * Helper to create ActiveSpan from existing Span
 */
const startSpanFromSpan = (span: Span): ActiveSpan => {
  const addEvent = (eventName: string, eventAttributes?: Labels): ActiveSpan => {
    const event: SpanEvent = {
      name: eventName,
      timestamp: new Date(),
      attributes: eventAttributes,
    };

    return startSpanFromSpan({
      ...span,
      events: [...span.events, event],
    });
  };

  const setAttribute = (key: string, value: string): ActiveSpan => {
    return startSpanFromSpan({
      ...span,
      attributes: { ...span.attributes, [key]: value },
    });
  };

  const setStatus = (status: SpanStatus): ActiveSpan => {
    return startSpanFromSpan({
      ...span,
      status,
    });
  };

  const end = (): Span => endSpan(span);

  return {
    span,
    addEvent,
    setAttribute,
    setStatus,
    end,
  };
};

/**
 * Add an event to a span
 */
export const addSpanEvent = (name: string, attributes?: Labels) => (
  span: Span
): Span => {
  const event: SpanEvent = {
    name,
    timestamp: new Date(),
    attributes,
  };

  return {
    ...span,
    events: [...span.events, event],
  };
};

/**
 * Set span attribute
 */
export const setSpanAttribute = (key: string, value: string) => (span: Span): Span => ({
  ...span,
  attributes: { ...span.attributes, [key]: value },
});

/**
 * Set span status
 */
export const setSpanStatus = (status: SpanStatus) => (span: Span): Span => ({
  ...span,
  status,
});

/**
 * Add a link to a span
 */
export const addSpanLink = (context: TraceContext, attributes?: Labels) => (
  span: Span
): Span => {
  const link: SpanLink = { context, attributes };
  return {
    ...span,
    links: [...span.links, link],
  };
};

// ============================================================================
// L3 API - Traced Operations with Reader Pattern
// ============================================================================

/**
 * Start a span in the telemetry context
 */
export const startTracedSpan = (
  name: string,
  kind: SpanKind = 'INTERNAL',
  attributes?: Labels
): TelemetryOp<ActiveSpan> => (ctx) => {
  if (!ctx.config.tracing.enabled) {
    return TE.left(spanError('Tracing is disabled'));
  }

  // Check sample rate
  const shouldSample = Math.random() < ctx.config.tracing.sampleRate;
  if (!shouldSample) {
    return TE.left(spanError('Span not sampled'));
  }

  const activeSpan = startSpan(name, kind, undefined, attributes);
  ctx.spans.set(activeSpan.span.context.spanId, activeSpan.span);

  return TE.right(activeSpan);
};

/**
 * End a span and store it in context
 */
export const endTracedSpan = (activeSpan: ActiveSpan): TelemetryOp<Span> => (ctx) => {
  const endedSpan = activeSpan.end();
  ctx.spans.set(endedSpan.context.spanId, endedSpan);
  return TE.right(endedSpan);
};

/**
 * Trace a synchronous function
 */
export const trace = <A>(
  name: string,
  fn: () => A,
  kind: SpanKind = 'INTERNAL',
  attributes?: Labels
): TelemetryOp<A> => (ctx) => {
  return pipe(
    startTracedSpan(name, kind, attributes)(ctx),
    TE.chain((activeSpan) =>
      TE.tryCatch(
        async () => {
          try {
            const result = fn();
            await endTracedSpan(activeSpan)(ctx)();
            return result;
          } catch (error) {
            const errorSpan = activeSpan
              .setStatus({ code: 'ERROR', message: String(error) })
              .addEvent('exception', {
                'exception.message': String(error),
                'exception.type': error instanceof Error ? error.name : 'unknown',
              });
            await endTracedSpan(errorSpan)(ctx)();
            throw error;
          }
        },
        (error) => spanError(`Failed to trace function ${name}`, error)
      )
    )
  );
};

/**
 * Trace an async function
 */
export const traceAsync = <A>(
  name: string,
  fn: () => Promise<A>,
  kind: SpanKind = 'INTERNAL',
  attributes?: Labels
): TelemetryOp<A> => (ctx) => {
  return pipe(
    startTracedSpan(name, kind, attributes)(ctx),
    TE.chain((activeSpan) =>
      TE.tryCatch(
        async () => {
          try {
            const result = await fn();
            await endTracedSpan(activeSpan)(ctx)();
            return result;
          } catch (error) {
            const errorSpan = activeSpan
              .setStatus({ code: 'ERROR', message: String(error) })
              .addEvent('exception', {
                'exception.message': String(error),
                'exception.type': error instanceof Error ? error.name : 'unknown',
              });
            await endTracedSpan(errorSpan)(ctx)();
            throw error;
          }
        },
        (error) => spanError(`Failed to trace async function ${name}`, error)
      )
    )
  );
};

/**
 * Trace a TaskEither operation
 */
export const traceTaskEither = <E, A>(
  name: string,
  task: TE.TaskEither<E, A>,
  kind: SpanKind = 'INTERNAL',
  attributes?: Labels
): TelemetryOp<A> => (ctx) => {
  return pipe(
    startTracedSpan(name, kind, attributes)(ctx),
    TE.chain((activeSpan) =>
      pipe(
        task,
        TE.fold(
          (error) =>
            pipe(
              TE.fromIO(() => {
                const errorSpan = activeSpan.setStatus({
                  code: 'ERROR',
                  message: String(error),
                });
                return errorSpan;
              }),
              TE.chain((errorSpan) => endTracedSpan(errorSpan)(ctx)),
              TE.chain(() => TE.left(spanError(String(error))))
            ),
          (result) =>
            pipe(
              endTracedSpan(activeSpan)(ctx),
              TE.map(() => result)
            )
        )
      )
    )
  );
};

// ============================================================================
// Span Queries and Utilities
// ============================================================================

/**
 * Get all spans from context
 */
export const getAllSpans = (): TelemetryOp<readonly Span[]> => (ctx) => {
  return TE.right(Array.from(ctx.spans.values()));
};

/**
 * Get span by ID
 */
export const getSpan = (spanId: string): TelemetryOp<Span> => (ctx) => {
  const span = ctx.spans.get(spanId);
  return span
    ? TE.right(span)
    : TE.left(spanError(`Span ${spanId} not found`));
};

/**
 * Get spans by trace ID
 */
export const getSpansByTraceId = (traceId: string): TelemetryOp<readonly Span[]> => (
  ctx
) => {
  const spans = Array.from(ctx.spans.values()).filter(
    (s) => s.context.traceId === traceId
  );
  return TE.right(spans);
};

/**
 * Clear all spans
 */
export const clearSpans = (): TelemetryOp<void> => (ctx) => {
  ctx.spans.clear();
  return TE.right(undefined);
};

/**
 * Calculate span duration in milliseconds
 */
export const getSpanDuration = (span: Span): O.Option<number> => {
  if (!span.endTime) return O.none;
  return O.some(span.endTime.getTime() - span.startTime.getTime());
};

/**
 * Check if span is root (no parent)
 */
export const isRootSpan = (span: Span): boolean => {
  return !span.context.parentSpanId;
};

/**
 * Get child spans
 */
export const getChildSpans = (span: Span): TelemetryOp<readonly Span[]> => (ctx) => {
  const children = Array.from(ctx.spans.values()).filter(
    (s) => s.context.parentSpanId === span.context.spanId
  );
  return TE.right(children);
};

/**
 * Build span tree (for visualization)
 */
export interface SpanTree {
  readonly span: Span;
  readonly children: readonly SpanTree[];
}

export const buildSpanTree = (rootSpan: Span): TelemetryOp<SpanTree> => (ctx) => {
  const buildTree = (span: Span): SpanTree => {
    const children = Array.from(ctx.spans.values())
      .filter((s) => s.context.parentSpanId === span.context.spanId)
      .map(buildTree);

    return { span, children };
  };

  return TE.right(buildTree(rootSpan));
};

// ============================================================================
// Trace Context Propagation (W3C Trace Context)
// ============================================================================

/**
 * Serialize trace context to W3C traceparent header
 */
export const serializeTraceParent = (context: TraceContext): string => {
  const version = '00';
  const traceId = context.traceId.padStart(32, '0');
  const spanId = context.spanId.padStart(16, '0');
  const flags = context.traceFlags.toString(16).padStart(2, '0');

  return `${version}-${traceId}-${spanId}-${flags}`;
};

/**
 * Parse W3C traceparent header
 */
export const parseTraceParent = (
  header: string
): E.Either<TelemetryError, TraceContext> => {
  const parts = header.split('-');

  if (parts.length !== 4) {
    return E.left(spanError('Invalid traceparent header format'));
  }

  const [version, traceId, spanId, flags] = parts;

  if (version !== '00') {
    return E.left(spanError(`Unsupported traceparent version: ${version}`));
  }

  return E.right({
    traceId,
    spanId: generateSpanId(), // New span ID for this service
    parentSpanId: spanId, // Parent is the span from the header
    traceFlags: parseInt(flags, 16),
    traceState: undefined,
  });
};

/**
 * Inject trace context into headers
 */
export const injectTraceContext = (
  context: TraceContext,
  headers: Record<string, string>
): Record<string, string> => ({
  ...headers,
  traceparent: serializeTraceParent(context),
  ...(context.traceState ? { tracestate: context.traceState } : {}),
});

/**
 * Extract trace context from headers
 */
export const extractTraceContext = (
  headers: Record<string, string>
): O.Option<TraceContext> => {
  const traceparent = headers.traceparent || headers.Traceparent;
  if (!traceparent) return O.none;

  return pipe(
    parseTraceParent(traceparent),
    E.fold(
      () => O.none,
      (context) =>
        O.some({
          ...context,
          traceState: headers.tracestate || headers.Tracestate,
        })
    )
  );
};

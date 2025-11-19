import { describe, it, expect } from 'vitest';
import {
  createSpan,
  endSpan,
  startSpan,
  generateTraceId,
  generateSpanId,
  createTraceContext,
  createChildContext,
  serializeTraceParent,
  parseTraceParent,
  getSpanDuration,
  isRootSpan,
} from '../src/tracing';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

describe('Tracing', () => {
  describe('Trace Context', () => {
    it('should generate trace ID', () => {
      const traceId = generateTraceId();

      expect(traceId).toBeTruthy();
      expect(traceId.length).toBe(32); // 16 bytes * 2 hex chars
    });

    it('should generate span ID', () => {
      const spanId = generateSpanId();

      expect(spanId).toBeTruthy();
      expect(spanId.length).toBe(16); // 8 bytes * 2 hex chars
    });

    it('should create trace context', () => {
      const context = createTraceContext();

      expect(context.traceId).toBeTruthy();
      expect(context.spanId).toBeTruthy();
      expect(context.traceFlags).toBe(1); // Sampled
      expect(context.parentSpanId).toBeUndefined();
    });

    it('should create child context', () => {
      const parent = createTraceContext();
      const child = createChildContext(parent);

      expect(child.traceId).toBe(parent.traceId);
      expect(child.parentSpanId).toBe(parent.spanId);
      expect(child.spanId).not.toBe(parent.spanId);
      expect(child.traceFlags).toBe(parent.traceFlags);
    });
  });

  describe('Span Creation', () => {
    it('should create a span', () => {
      const span = createSpan('test_span', 'INTERNAL');

      expect(span.name).toBe('test_span');
      expect(span.kind).toBe('INTERNAL');
      expect(span.startTime).toBeInstanceOf(Date);
      expect(span.endTime).toBeUndefined();
      expect(span.status.code).toBe('OK');
    });

    it('should create span with attributes', () => {
      const span = createSpan('test_span', 'SERVER', undefined, {
        'http.method': 'GET',
        'http.path': '/api/test',
      });

      expect(span.attributes).toEqual({
        'http.method': 'GET',
        'http.path': '/api/test',
      });
    });

    it('should end a span', () => {
      const span = createSpan('test_span', 'INTERNAL');
      const ended = endSpan(span);

      expect(ended.endTime).toBeInstanceOf(Date);
      expect(ended.endTime!.getTime()).toBeGreaterThanOrEqual(
        span.startTime.getTime()
      );
    });
  });

  describe('Active Span', () => {
    it('should create an active span', () => {
      const active = startSpan('test_span', 'INTERNAL');

      expect(active.span.name).toBe('test_span');
      expect(typeof active.addEvent).toBe('function');
      expect(typeof active.setAttribute).toBe('function');
      expect(typeof active.setStatus).toBe('function');
      expect(typeof active.end).toBe('function');
    });

    it('should add events to span', () => {
      const active = startSpan('test_span', 'INTERNAL');
      const withEvent = active.addEvent('event1').addEvent('event2', { key: 'value' });

      expect(withEvent.span.events.length).toBe(2);
      expect(withEvent.span.events[0].name).toBe('event1');
      expect(withEvent.span.events[1].name).toBe('event2');
      expect(withEvent.span.events[1].attributes).toEqual({ key: 'value' });
    });

    it('should set attributes on span', () => {
      const active = startSpan('test_span', 'INTERNAL');
      const withAttrs = active
        .setAttribute('key1', 'value1')
        .setAttribute('key2', 'value2');

      expect(withAttrs.span.attributes).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should set status on span', () => {
      const active = startSpan('test_span', 'INTERNAL');
      const withError = active.setStatus({ code: 'ERROR', message: 'Test error' });

      expect(withError.span.status.code).toBe('ERROR');
      expect(withError.span.status.message).toBe('Test error');
    });

    it('should end active span', () => {
      const active = startSpan('test_span', 'INTERNAL');
      const ended = active.end();

      expect(ended.endTime).toBeInstanceOf(Date);
    });
  });

  describe('W3C Trace Context', () => {
    it('should serialize trace parent', () => {
      const context = createTraceContext();
      const traceparent = serializeTraceParent(context);

      expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    });

    it('should parse trace parent', () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const result = parseTraceParent(traceparent);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
        expect(result.right.parentSpanId).toBe('00f067aa0ba902b7');
        expect(result.right.traceFlags).toBe(1);
      }
    });

    it('should reject invalid trace parent format', () => {
      const result = parseTraceParent('invalid-format');

      expect(E.isLeft(result)).toBe(true);
    });

    it('should reject unsupported version', () => {
      const traceparent = '99-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const result = parseTraceParent(traceparent);

      expect(E.isLeft(result)).toBe(true);
    });

    it('should round-trip serialize and parse', () => {
      const context = createTraceContext();
      const serialized = serializeTraceParent(context);
      const parsed = parseTraceParent(serialized);

      expect(E.isRight(parsed)).toBe(true);

      if (E.isRight(parsed)) {
        expect(parsed.right.traceId).toBe(context.traceId);
        expect(parsed.right.traceFlags).toBe(context.traceFlags);
      }
    });
  });

  describe('Span Utilities', () => {
    it('should calculate span duration', () => {
      const span = createSpan('test_span', 'INTERNAL');

      // Simulate some work
      const endTime = new Date(span.startTime.getTime() + 100);
      const endedSpan = { ...span, endTime };

      const duration = getSpanDuration(endedSpan);

      expect(O.isSome(duration)).toBe(true);
      if (O.isSome(duration)) {
        expect(duration.value).toBeGreaterThanOrEqual(100);
      }
    });

    it('should return none for unfinished span', () => {
      const span = createSpan('test_span', 'INTERNAL');
      const duration = getSpanDuration(span);

      expect(O.isNone(duration)).toBe(true);
    });

    it('should identify root span', () => {
      const root = createSpan('root', 'INTERNAL');
      const child = createSpan('child', 'INTERNAL', createChildContext(root.context));

      expect(isRootSpan(root)).toBe(true);
      expect(isRootSpan(child)).toBe(false);
    });
  });

  describe('Span Kinds', () => {
    it('should support all span kinds', () => {
      const internal = createSpan('test', 'INTERNAL');
      const server = createSpan('test', 'SERVER');
      const client = createSpan('test', 'CLIENT');
      const producer = createSpan('test', 'PRODUCER');
      const consumer = createSpan('test', 'CONSUMER');

      expect(internal.kind).toBe('INTERNAL');
      expect(server.kind).toBe('SERVER');
      expect(client.kind).toBe('CLIENT');
      expect(producer.kind).toBe('PRODUCER');
      expect(consumer.kind).toBe('CONSUMER');
    });
  });
});

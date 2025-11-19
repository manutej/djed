import { describe, it, expect } from 'vitest';
import { counter, inc, gauge, set, incGauge, dec, histogram, observe } from '../src/metrics';
import { CounterMonoid, GaugeMonoid, HistogramMonoid } from '../src/metrics';
import * as E from 'fp-ts/Either';

describe('Metrics', () => {
  describe('Counter', () => {
    it('should create a counter with initial value 0', () => {
      const c = counter('test_counter', 'A test counter');

      expect(c._tag).toBe('Counter');
      expect(c.value).toBe(0);
      expect(c.metadata.name).toBe('test_counter');
      expect(c.metadata.type).toBe('counter');
    });

    it('should increment counter', () => {
      const c = counter('test_counter', 'A test counter');
      const updated = inc(5)(c);

      expect(updated.value).toBe(5);
    });

    it('should only increment (no negative values)', () => {
      const c = counter('test_counter', 'A test counter');
      const updated = inc(-5)(c);

      expect(updated.value).toBe(5); // Absolute value
    });

    it('should support labels', () => {
      const c = counter('test_counter', 'A test counter', { method: 'GET' });

      expect(c.metadata.labels).toEqual({ method: 'GET' });
    });
  });

  describe('Gauge', () => {
    it('should create a gauge with initial value 0', () => {
      const g = gauge('test_gauge', 'A test gauge');

      expect(g._tag).toBe('Gauge');
      expect(g.value).toBe(0);
      expect(g.metadata.name).toBe('test_gauge');
      expect(g.metadata.type).toBe('gauge');
    });

    it('should set gauge value', () => {
      const g = gauge('test_gauge', 'A test gauge');
      const updated = set(42)(g);

      expect(updated.value).toBe(42);
    });

    it('should increment gauge', () => {
      const g = gauge('test_gauge', 'A test gauge');
      const updated = incGauge(10)(set(5)(g));

      expect(updated.value).toBe(15);
    });

    it('should decrement gauge', () => {
      const g = gauge('test_gauge', 'A test gauge');
      const updated = dec(3)(set(10)(g));

      expect(updated.value).toBe(7);
    });

    it('should support negative values', () => {
      const g = gauge('test_gauge', 'A test gauge');
      const updated = set(-5)(g);

      expect(updated.value).toBe(-5);
    });
  });

  describe('Histogram', () => {
    it('should create a histogram with default buckets', () => {
      const h = histogram('test_histogram', 'A test histogram');

      expect(h._tag).toBe('Histogram');
      expect(h.buckets.length).toBeGreaterThan(0);
      expect(h.sum).toBe(0);
      expect(h.count).toBe(0);
    });

    it('should observe values', () => {
      const h = histogram('test_histogram', 'A test histogram', [0.1, 0.5, 1.0]);
      const updated = observe(0.3)(h);

      expect(updated.count).toBe(1);
      expect(updated.sum).toBe(0.3);

      // Check bucket counts
      expect(updated.buckets[0].count).toBe(0); // 0.1
      expect(updated.buckets[1].count).toBe(1); // 0.5
      expect(updated.buckets[2].count).toBe(1); // 1.0
    });

    it('should accumulate observations', () => {
      const h = histogram('test_histogram', 'A test histogram', [0.1, 0.5, 1.0]);
      const h1 = observe(0.2)(h);
      const h2 = observe(0.4)(h1);
      const h3 = observe(0.8)(h2);

      expect(h3.count).toBe(3);
      expect(h3.sum).toBeCloseTo(1.4, 5);
    });
  });

  describe('Monoid', () => {
    it('should combine counters', () => {
      const c1 = inc(5)(counter('test', 'Test'));
      const c2 = inc(3)(counter('test', 'Test'));

      const combined = CounterMonoid.concat(c1, c2);

      expect(combined.value).toBe(8);
    });

    it('should combine gauges (last write wins)', () => {
      const g1 = set(10)(gauge('test', 'Test'));
      const g2 = set(20)(gauge('test', 'Test'));

      const combined = GaugeMonoid.concat(g1, g2);

      expect(combined.value).toBe(20);
    });

    it('should combine histograms', () => {
      const h1 = observe(0.3)(histogram('test', 'Test', [0.1, 0.5, 1.0]));
      const h2 = observe(0.7)(histogram('test', 'Test', [0.1, 0.5, 1.0]));

      const combined = HistogramMonoid.concat(h1, h2);

      expect(combined.count).toBe(2);
      expect(combined.sum).toBeCloseTo(1.0, 5);
    });

    it('should use empty element as identity', () => {
      const c = inc(5)(counter('test', 'Test'));
      const withEmpty = CounterMonoid.concat(c, CounterMonoid.empty);

      expect(withEmpty.value).toBe(5);
    });
  });
});

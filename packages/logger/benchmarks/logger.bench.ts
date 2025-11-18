import { bench, describe } from 'vitest';
import { Logger } from '../src/index';

/**
 * Performance Benchmarks for @djed/logger
 *
 * Success Criteria:
 * - Time to first log: < 30ms
 * - Log throughput: > 10,000 logs/sec
 * - Memory footprint: < 5MB baseline
 *
 * Run: npm run bench
 * CI: Fails if regression > 20%
 */

describe('Logger Performance', () => {
  // Benchmark 1: Time to First Log (Initialization + First Log)
  bench('time to first log (L1 - zero config)', () => {
    const logger = new Logger('benchmark', { silent: true });
    logger.info('first log');
  }, {
    iterations: 1000,
    time: 1000 // 1 second
  });

  bench('time to first log (L2 - with options)', () => {
    const logger = new Logger('benchmark', {
      level: 'debug',
      format: 'json',
      silent: true
    });
    logger.info('first log');
  }, {
    iterations: 1000,
    time: 1000
  });

  // Benchmark 2: Log Throughput (How many logs per second)
  bench('log throughput - info level', () => {
    const logger = new Logger('benchmark', { silent: true });
    for (let i = 0; i < 100; i++) {
      logger.info('test message', { iteration: i });
    }
  }, {
    iterations: 100,
    time: 2000 // 2 seconds
  });

  bench('log throughput - debug level', () => {
    const logger = new Logger('benchmark', {
      level: 'debug',
      silent: true
    });
    for (let i = 0; i < 100; i++) {
      logger.debug('test message', { iteration: i });
    }
  }, {
    iterations: 100,
    time: 2000
  });

  bench('log throughput - error with metadata', () => {
    const logger = new Logger('benchmark', { silent: true });
    const error = new Error('Test error');
    for (let i = 0; i < 100; i++) {
      logger.error('error message', error);
    }
  }, {
    iterations: 100,
    time: 2000
  });

  // Benchmark 3: Different Log Formats
  bench('JSON format logging', () => {
    const logger = new Logger('benchmark', {
      format: 'json',
      silent: true
    });
    logger.info('test message', { data: 'value' });
  }, {
    iterations: 1000,
    time: 1000
  });

  bench('Pretty format logging', () => {
    const logger = new Logger('benchmark', {
      format: 'pretty',
      silent: true
    });
    logger.info('test message', { data: 'value' });
  }, {
    iterations: 1000,
    time: 1000
  });

  // Benchmark 4: Complex Metadata
  bench('logging with complex metadata', () => {
    const logger = new Logger('benchmark', { silent: true });
    const complexMeta = {
      user: { id: 123, name: 'test', email: 'test@example.com' },
      request: { method: 'POST', url: '/api/test', headers: {} },
      timestamp: Date.now(),
      data: { nested: { deeply: { value: 'test' } } }
    };
    logger.info('complex log', complexMeta);
  }, {
    iterations: 1000,
    time: 1000
  });

  // Benchmark 5: Concurrent Logging (Simulated)
  bench('concurrent logging simulation', () => {
    const logger = new Logger('benchmark', { silent: true });
    const operations = Array.from({ length: 50 }, (_, i) => ({
      level: i % 2 === 0 ? 'info' : 'debug',
      message: `concurrent log ${i}`,
      meta: { index: i }
    }));

    operations.forEach(op => {
      if (op.level === 'info') {
        logger.info(op.message, op.meta);
      } else {
        logger.debug(op.message, op.meta);
      }
    });
  }, {
    iterations: 100,
    time: 2000
  });

  // Benchmark 6: Logger Reuse vs Recreation
  bench('logger reuse (single instance)', () => {
    const logger = new Logger('benchmark', { silent: true });
    for (let i = 0; i < 10; i++) {
      logger.info('reused logger', { iteration: i });
    }
  }, {
    iterations: 500,
    time: 1000
  });

  bench('logger recreation (new instance each time)', () => {
    for (let i = 0; i < 10; i++) {
      const logger = new Logger('benchmark', { silent: true });
      logger.info('new logger', { iteration: i });
    }
  }, {
    iterations: 500,
    time: 1000
  });

  // Benchmark 7: Winston Ejection (L3 - Full Control)
  bench('L3 winston direct usage', () => {
    const logger = new Logger('benchmark', {
      winston: {
        silent: true,
        level: 'info'
      }
    });
    logger.info('winston direct');
  }, {
    iterations: 1000,
    time: 1000
  });
});

describe('Logger Memory Profile', () => {
  // Memory benchmark: Create multiple loggers
  bench('memory - multiple logger instances', () => {
    const loggers = Array.from({ length: 10 }, (_, i) =>
      new Logger(`logger-${i}`, { silent: true })
    );
    loggers.forEach(logger => logger.info('test'));
  }, {
    iterations: 100,
    time: 1000
  });

  // Memory benchmark: Sustained logging
  bench('memory - sustained logging (1000 logs)', () => {
    const logger = new Logger('benchmark', { silent: true });
    for (let i = 0; i < 1000; i++) {
      logger.info('sustained log', { iteration: i, timestamp: Date.now() });
    }
  }, {
    iterations: 10,
    time: 2000
  });
});

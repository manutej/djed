import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LoggerOptions, measureTimeToFirstLog, createLogger, winston } from '../src/index';

describe('@djed/logger', () => {
  // Silence console output during tests
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('L1: Novice API (Zero Config)', () => {
    it('should create logger with just name', () => {
      const logger = new Logger('test');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should log info messages', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'info');
      
      logger.info('test message');
      
      expect(spy).toHaveBeenCalledWith('test message', undefined);
    });

    it('should log error messages', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'error');
      
      logger.error('error message');
      
      expect(spy).toHaveBeenCalledWith('error message', undefined);
    });

    it('should log error messages with metadata', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'error');
      
      const meta = { code: 500, userId: 123 };
      logger.error('error message', meta);
      
      expect(spy).toHaveBeenCalledWith('error message', meta);
    });

    it('should log warn messages', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'warn');
      
      logger.warn('warning message');
      
      expect(spy).toHaveBeenCalledWith('warning message', undefined);
    });

    it('should log debug messages', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'debug');
      
      logger.debug('debug message');
      
      expect(spy).toHaveBeenCalledWith('debug message', undefined);
    });

    it('should provide access to underlying Winston logger', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      
      expect(winston).toBeDefined();
      expect(winston.level).toBe('info'); // default level
    });
  });

  describe('L2: Intermediate API (Customization)', () => {
    it('should accept level option', () => {
      const logger = new Logger('test', { level: 'debug' });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('debug');
    });

    it('should accept warn level', () => {
      const logger = new Logger('test', { level: 'warn' });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('warn');
    });

    it('should accept error level', () => {
      const logger = new Logger('test', { level: 'error' });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('error');
    });

    it('should accept format option: json', () => {
      const logger = new Logger('test', { format: 'json' });
      expect(logger).toBeDefined();
      // Winston is configured, exact format testing is implementation detail
    });

    it('should accept format option: pretty', () => {
      const logger = new Logger('test', { format: 'pretty' });
      expect(logger).toBeDefined();
    });

    it('should accept both level and format options', () => {
      const logger = new Logger('test', { 
        level: 'debug', 
        format: 'json' 
      });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('debug');
      expect(logger).toBeDefined();
    });

    it('should use default level if not specified', () => {
      const logger = new Logger('test', { format: 'json' });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('info');
    });
  });

  describe('L3: Expert API (Full Winston Control)', () => {
    it('should accept custom Winston config', () => {
      const logger = new Logger('test', {
        winston: {
          level: 'warn',
          transports: []
        }
      });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('warn');
      expect(winston.transports).toHaveLength(0);
    });

    it('should ignore level/format when winston option provided', () => {
      const logger = new Logger('test', {
        level: 'debug',
        format: 'json',
        winston: {
          level: 'error',
          transports: []
        }
      });
      const winston = logger.getWinstonLogger();
      
      // Winston config should take precedence
      expect(winston.level).toBe('error');
    });

    it('should allow custom transports via Winston config', () => {
      const logger = new Logger('test', {
        winston: {
          transports: []
        }
      });
      const winston = logger.getWinstonLogger();
      
      expect(winston.transports).toHaveLength(0);
    });
  });

  describe('createLogger convenience function', () => {
    it('should create logger with just name', () => {
      const logger = createLogger('test');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with options', () => {
      const logger = createLogger('test', { level: 'debug' });
      const winston = logger.getWinstonLogger();
      
      expect(winston.level).toBe('debug');
    });
  });

  describe('Performance: measureTimeToFirstLog', () => {
    it('should measure time to first log', () => {
      const time = measureTimeToFirstLog();
      
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(30000); // < 30 seconds (success criteria)
    });

    it('should typically complete in milliseconds', () => {
      const time = measureTimeToFirstLog();
      
      // Should be very fast (< 100ms in practice)
      expect(time).toBeLessThan(1000);
    });
  });

  describe('Integration: Real logging workflow', () => {
    it('should support typical logging workflow', () => {
      const logger = new Logger('app');
      const winston = logger.getWinstonLogger();
      
      const infoSpy = vi.spyOn(winston, 'info');
      const errorSpy = vi.spyOn(winston, 'error');
      const warnSpy = vi.spyOn(winston, 'warn');
      
      logger.info('Application started');
      logger.warn('Low memory', { available: '100MB' });
      logger.error('Connection failed', { retries: 3 });
      
      expect(infoSpy).toHaveBeenCalledWith('Application started', undefined);
      expect(warnSpy).toHaveBeenCalledWith('Low memory', { available: '100MB' });
      expect(errorSpy).toHaveBeenCalledWith('Connection failed', { retries: 3 });
    });

    it('should handle structured metadata', () => {
      const logger = new Logger('app');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'info');
      
      const meta = {
        userId: 123,
        action: 'login',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.1'
      };
      
      logger.info('User logged in', meta);
      
      expect(spy).toHaveBeenCalledWith('User logged in', meta);
    });
  });
});

  describe('Quick Win Enhancements', () => {
    describe('Silent Mode', () => {
      it('should support silent option for testing/benchmarking', () => {
        const logger = new Logger('test', { silent: true });
        const winston = logger.getWinstonLogger();

        expect(winston.silent).toBe(true);
      });

      it('should not output when silent is true', () => {
        const consoleSpy = vi.spyOn(console, 'log');
        const logger = new Logger('test', { silent: true });

        logger.info('This should not appear');
        logger.error('This should not appear');

        // Console should not have been called by logger
        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    describe('Error Object Serialization', () => {
      it('should serialize Error objects properly', () => {
        const logger = new Logger('test');
        const winston = logger.getWinstonLogger();
        const spy = vi.spyOn(winston, 'error');

        const error = new Error('Test error');
        logger.error('Failed', error);

        const callArgs = spy.mock.calls[0];
        expect(callArgs[1]).toHaveProperty('message', 'Test error');
        expect(callArgs[1]).toHaveProperty('stack');
        expect(callArgs[1]).toHaveProperty('name', 'Error');
      });

      it('should preserve custom error properties', () => {
        const logger = new Logger('test');
        const winston = logger.getWinstonLogger();
        const spy = vi.spyOn(winston, 'error');

        const error: any = new Error('Test error');
        error.code = 'E_TEST';
        error.statusCode = 500;

        logger.error('Failed', error);

        const callArgs = spy.mock.calls[0];
        expect(callArgs[1]).toHaveProperty('code', 'E_TEST');
        expect(callArgs[1]).toHaveProperty('statusCode', 500);
      });
    });

    describe('Winston Re-export', () => {
      it('should re-export winston for convenience', async () => {
        const module = await import('../src/index');
        expect(module.winston).toBeDefined();
        expect(module.winston.createLogger).toBeDefined();
      });
    });
  });

  describe('Priority 1: Resilience & Error Handling (MERCURIO #7: 88%)', () => {
    it('should handle circular references in metadata', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'info');

      const circular: any = { self: null };
      circular.self = circular;

      // Should not throw even with circular reference
      expect(() => logger.info('test', circular)).not.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle metadata with undefined/null values', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();
      const spy = vi.spyOn(winston, 'info');

      // Should handle various problematic metadata values
      logger.info('test', undefined);
      logger.info('test', null);
      logger.info('test', { undef: undefined, nul: null });

      expect(spy).toHaveBeenCalledTimes(3);
    });

  });

  describe('Priority 2: Documentation Examples (MERCURIO #6: 89%)', () => {
    it('README example: L1 Quick Start', () => {
      // Example from README
      const logger = new Logger('my-app');
      logger.info('Hello world');

      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('README example: L2 Customize', () => {
      const logger = new Logger('my-app', {
        level: 'debug',
        format: 'json'
      });
      logger.debug('Debug message', { userId: 123 });

      expect(logger.getWinstonLogger().level).toBe('debug');
    });

    it('README example: L3 Full Control', () => {
      const logger = new Logger('my-app', {
        winston: {
          level: 'silly',
          transports: []
        }
      });

      expect(logger.getWinstonLogger().level).toBe('silly');
    });
  });

  describe('Priority 3: Ejection Path Validation (MERCURIO #3: 92%)', () => {
    it('should allow direct Winston usage after ejection', () => {
      const logger = new Logger('test');
      const winston = logger.getWinstonLogger();

      // Use Winston directly (ejection simulation)
      const spy = vi.spyOn(winston, 'info');
      winston.info('Direct Winston call');

      expect(spy).toHaveBeenCalledWith('Direct Winston call');
    });

    it('should support Winston-only workflows', () => {
      const logger = new Logger('test', {
        winston: {
          level: 'debug',
          format: winston.format.json(),
          transports: []
        }
      });

      const winstonLogger = logger.getWinstonLogger();

      // Can use pure Winston from this point
      expect(winstonLogger.level).toBe('debug');
      expect(winstonLogger.transports).toHaveLength(0);

      // Logger wrapper is no longer needed
      const spy = vi.spyOn(winstonLogger, 'debug');
      winstonLogger.debug('Pure Winston');
      expect(spy).toHaveBeenCalledWith('Pure Winston');
    });
  });

import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import * as Compare from './compare';

describe('Compare', () => {
  describe('L1 API - Simple comparisons', () => {
    it('should compare equal strings correctly', () => {
      const result = Compare.equal('secret123', 'secret123');
      expect(result).toBe(true);
    });

    it('should compare different strings correctly', () => {
      const result = Compare.equal('secret123', 'secret456');
      expect(result).toBe(false);
    });

    it('should compare strings of different lengths', () => {
      const result = Compare.equal('short', 'longer string');
      expect(result).toBe(false);
    });

    it('should compare buffers correctly', () => {
      const buf1 = Buffer.from('test', 'utf8');
      const buf2 = Buffer.from('test', 'utf8');

      const result = Compare.buffers(buf1, buf2);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(true);
      }
    });

    it('should compare different buffers correctly', () => {
      const buf1 = Buffer.from('test1', 'utf8');
      const buf2 = Buffer.from('test2', 'utf8');

      const result = Compare.buffers(buf1, buf2);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(false);
      }
    });

    it('should compare hex strings correctly', () => {
      const hex1 = 'deadbeef';
      const hex2 = 'deadbeef';

      const result = Compare.hex(hex1, hex2);
      expect(result).toBe(true);
    });

    it('should compare different hex strings correctly', () => {
      const hex1 = 'deadbeef';
      const hex2 = 'cafebabe';

      const result = Compare.hex(hex1, hex2);
      expect(result).toBe(false);
    });

    it('should compare base64 strings correctly', () => {
      const b64_1 = Buffer.from('test').toString('base64');
      const b64_2 = Buffer.from('test').toString('base64');

      const result = Compare.base64(b64_1, b64_2);
      expect(result).toBe(true);
    });
  });

  describe('L2 API - Configured comparisons', () => {
    it('should compare with custom encoding', () => {
      const compareHex = Compare.withEncoding('hex');
      const result = compareHex('deadbeef', 'deadbeef');

      expect(result).toBe(true);
    });

    it('should validate with strict mode', () => {
      const strictCompare = Compare.withValidation(true);
      const buf1 = Buffer.from('test');
      const buf2 = Buffer.from('testing');

      const result = strictCompare(buf1, buf2);

      expect(E.isLeft(result)).toBe(true);
    });

    it('should validate with non-strict mode', () => {
      const nonStrictCompare = Compare.withValidation(false);
      const buf1 = Buffer.from('test');
      const buf2 = Buffer.from('testing');

      const result = nonStrictCompare(buf1, buf2);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(false);
      }
    });
  });

  describe('L3 API - Advanced operations', () => {
    it('should compare multiple string pairs', () => {
      const pairs: ReadonlyArray<readonly [string, string]> = [
        ['secret1', 'secret1'],
        ['token2', 'token2'],
        ['hash3', 'hash3'],
      ];

      const result = Compare.many(pairs);
      expect(result).toBe(true);
    });

    it('should detect mismatch in multiple pairs', () => {
      const pairs: ReadonlyArray<readonly [string, string]> = [
        ['secret1', 'secret1'],
        ['token2', 'different'],
        ['hash3', 'hash3'],
      ];

      const result = Compare.many(pairs);
      expect(result).toBe(false);
    });

    it('should create and use validator', () => {
      const validateSecret = Compare.validator('my-secret-key');

      expect(validateSecret('my-secret-key')).toBe(true);
      expect(validateSecret('wrong-key')).toBe(false);
    });

    it('should create and use buffer validator', () => {
      const expected = Buffer.from('test-hash');
      const validateHash = Compare.bufferValidator(expected);

      const result1 = validateHash(Buffer.from('test-hash'));
      expect(E.isRight(result1)).toBe(true);
      if (E.isRight(result1)) {
        expect(result1.right).toBe(true);
      }

      const result2 = validateHash(Buffer.from('wrong-hash'));
      expect(E.isRight(result2)).toBe(true);
      if (E.isRight(result2)) {
        expect(result2.right).toBe(false);
      }
    });
  });

  describe('TimingSafe utilities', () => {
    it('should check if value is in array', () => {
      const validTokens = ['token1', 'token2', 'token3'];

      expect(Compare.TimingSafe.includes('token2', validTokens)).toBe(true);
      expect(Compare.TimingSafe.includes('token4', validTokens)).toBe(false);
    });

    it('should find index of value in array', () => {
      const validTokens = ['token1', 'token2', 'token3'];

      expect(Compare.TimingSafe.indexOf('token2', validTokens)).toBe(1);
      expect(Compare.TimingSafe.indexOf('token4', validTokens)).toBe(-1);
    });
  });
});

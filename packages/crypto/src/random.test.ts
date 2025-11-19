import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import * as Random from './random';
import { RandomBytes, RandomString } from './types';

describe('Random', () => {
  describe('L1 API - Simple random generation', () => {
    it('should generate random bytes', () => {
      const result = Random.bytes(32);

      expect(RandomBytes.unwrap(result)).toBeInstanceOf(Buffer);
      expect(RandomBytes.unwrap(result).length).toBe(32);
    });

    it('should generate random string', () => {
      const result = Random.string(16);

      expect(typeof RandomString.unwrap(result)).toBe('string');
      expect(RandomString.unwrap(result).length).toBe(32); // hex encoding doubles length
    });

    it('should generate UUID', () => {
      const uuid = Random.uuid();

      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate random integer in range', () => {
      const result = Random.int(1, 10);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should generate URL-safe token', () => {
      const token = Random.token(32);

      expect(typeof RandomString.unwrap(token)).toBe('string');
      expect(RandomString.unwrap(token)).not.toContain('+');
      expect(RandomString.unwrap(token)).not.toContain('/');
      expect(RandomString.unwrap(token)).not.toContain('=');
    });

    it('should generate salt', () => {
      const salt = Random.salt();

      expect(Buffer.isBuffer(salt as any)).toBe(true);
    });
  });

  describe('L2 API - Configured generation', () => {
    it('should generate string with hex encoding', () => {
      const result = Random.stringWith(16, 'hex');

      expect(RandomString.unwrap(result).length).toBe(32);
    });

    it('should generate string with base64 encoding', () => {
      const result = Random.stringWith(16, 'base64');

      expect(typeof RandomString.unwrap(result)).toBe('string');
    });

    it('should generate multiple random bytes', () => {
      const results = Random.bytesMany(5, 16);

      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(RandomBytes.unwrap(result).length).toBe(16);
      });
    });

    it('should generate multiple UUIDs', () => {
      const uuids = Random.uuidMany(3);

      expect(uuids.length).toBe(3);
      uuids.forEach((uuid) => {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });
  });

  describe('L3 API - Advanced operations', () => {
    it('should select random element from array', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const result = Random.choice(array);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(array).toContain(result.right);
      }
    });

    it('should return error for empty array', () => {
      const result = Random.choice([]);

      expect(E.isLeft(result)).toBe(true);
    });

    it('should shuffle array', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = Random.shuffle(array);

      expect(shuffled.length).toBe(array.length);
      expect(shuffled).toEqual(expect.arrayContaining(array));
      // Note: There's a tiny chance this could fail randomly
      // but with 10 elements the probability is 1/10! ≈ 0.00000027%
    });

    it('should sample from array', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = Random.sample(array, 3);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.length).toBe(3);
        result.right.forEach((item) => {
          expect(array).toContain(item);
        });
      }
    });

    it('should generate alphanumeric string', () => {
      const result = Random.alphanumeric(10);

      expect(RandomString.unwrap(result).length).toBe(10);
      expect(RandomString.unwrap(result)).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate string from custom charset', () => {
      const result = Random.fromCharset(5, '01');

      expect(RandomString.unwrap(result).length).toBe(5);
      expect(RandomString.unwrap(result)).toMatch(/^[01]+$/);
    });
  });

  describe('RandomUtils', () => {
    it('should generate password', () => {
      const password = Random.RandomUtils.password(16);

      expect(RandomString.unwrap(password).length).toBe(16);
    });

    it('should generate PIN', () => {
      const pin = Random.RandomUtils.pin(4);

      expect(RandomString.unwrap(pin).length).toBe(4);
      expect(RandomString.unwrap(pin)).toMatch(/^[0-9]+$/);
    });

    it('should generate OTP', () => {
      const otp = Random.RandomUtils.otp(6);

      expect(RandomString.unwrap(otp).length).toBe(6);
      expect(RandomString.unwrap(otp)).toMatch(/^[0-9]+$/);
    });

    it('should generate session ID', () => {
      const sessionId = Random.RandomUtils.sessionId();

      expect(typeof RandomString.unwrap(sessionId)).toBe('string');
      expect(RandomString.unwrap(sessionId).length).toBeGreaterThan(0);
    });

    it('should generate API key', () => {
      const apiKey = Random.RandomUtils.apiKey();

      expect(typeof RandomString.unwrap(apiKey)).toBe('string');
      expect(RandomString.unwrap(apiKey).length).toBeGreaterThan(0);
    });
  });
});

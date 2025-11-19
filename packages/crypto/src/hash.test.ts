import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as Hash from './hash';
import { PlainPassword, HashedPassword } from './types';

describe('Hash', () => {
  describe('L1 API - Simple hash and verify', () => {
    it('should hash and verify a password with default settings', async () => {
      const password = PlainPassword.of('mySecretPassword123');

      const result = await pipe(
        Hash.hash(password),
        TE.chain((hashed) => Hash.verify(password)(hashed))
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(true);
      }
    });

    it('should reject incorrect password', async () => {
      const password = PlainPassword.of('correct');
      const wrong = PlainPassword.of('incorrect');

      const result = await pipe(
        Hash.hash(password),
        TE.chain((hashed) => Hash.verify(wrong)(hashed))
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe(false);
      }
    });
  });

  describe('L2 API - Configured hashing', () => {
    it('should hash with bcrypt configuration', async () => {
      const password = PlainPassword.of('testPassword');
      const config = Hash.HashConfig.bcrypt(10);

      const result = await Hash.hashWith(config)(password)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const hash = result.right;
        expect(hash.startsWith('$2')).toBe(true);
      }
    });

    it('should hash with argon2id configuration', async () => {
      const password = PlainPassword.of('testPassword');
      const config = Hash.HashConfig.argon2id(2, 32768, 2);

      const result = await Hash.hashWith(config)(password)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const hash = result.right;
        expect((hash as string).startsWith('$argon2id$')).toBe(true);
      }
    });
  });

  describe('L3 API - Advanced operations', () => {
    it('should detect when rehashing is needed', async () => {
      const password = PlainPassword.of('test');
      const config = Hash.HashConfig.bcrypt(8);

      const result = await Hash.hashWith(config)(password)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const hash = result.right;
        const needsRehash = Hash.needsRehashing(hash, 12);
        expect(needsRehash).toBe(true);
      }
    });

    it('should rehash if needed', async () => {
      const password = PlainPassword.of('test');
      const oldConfig = Hash.HashConfig.bcrypt(8);

      const oldHashResult = await Hash.hashWith(oldConfig)(password)();
      expect(E.isRight(oldHashResult)).toBe(true);

      if (E.isRight(oldHashResult)) {
        const oldHash = oldHashResult.right;

        const rehashResult = await Hash.rehashIfNeeded(12)(password)(oldHash)();

        expect(E.isRight(rehashResult)).toBe(true);
        if (E.isRight(rehashResult)) {
          expect(rehashResult.right.rehashed).toBe(true);
          expect(rehashResult.right.hash).not.toBe(oldHash);
        }
      }
    });

    it('should create a custom hasher', async () => {
      const config = Hash.HashConfig.bcrypt(10);
      const hasher = Hash.createHasher(config);

      const result = await hasher(PlainPassword.of('password'));

      expect(E.isRight(result)).toBe(true);
    });
  });
});

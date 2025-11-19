/**
 * @module random
 * @description Cryptographically secure random number and string generation
 *
 * Provides type-safe random generation using Node.js crypto module.
 * All random values are cryptographically secure and suitable for security-sensitive applications.
 *
 * Security Best Practices:
 * - Always use crypto.randomBytes for security-sensitive random values
 * - Never use Math.random() for passwords, tokens, or keys
 * - Generate sufficient entropy (at least 16 bytes for tokens)
 * - Use URL-safe base64 for tokens in URLs
 *
 * @example
 * ```typescript
 * import * as Random from '@djed/crypto/random';
 *
 * // Generate random bytes
 * const bytes = Random.bytes(32);
 *
 * // Generate random token
 * const token = Random.token(32);
 *
 * // Generate random UUID
 * const uuid = Random.uuid();
 * ```
 */

import * as crypto from 'crypto';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type {
  RandomBytes,
  RandomString,
  CryptoError,
  Salt,
} from './types';
import {
  RandomBytes as RandomBytesCtor,
  RandomString as RandomStringCtor,
  Salt as SaltCtor,
} from './types';

/**
 * Internal error constructor
 */
const mkCryptoError = (error: Error, context?: string): CryptoError => ({
  _tag: 'CryptoError',
  error,
  context,
});

/**
 * Encoding types for random strings
 */
export type Encoding = 'hex' | 'base64' | 'base64url';

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 *
 * @param size - Number of bytes to generate
 * @returns RandomBytes
 *
 * @example
 * ```typescript
 * const randomData = Random.bytes(32);
 * // 32 bytes of cryptographically secure random data
 * ```
 */
export const bytes = (size: number): RandomBytes => {
  return RandomBytesCtor.of(crypto.randomBytes(size));
};

/**
 * Generate a random string (hex-encoded by default)
 *
 * @param size - Number of random bytes (output will be 2x this in hex)
 * @returns RandomString
 *
 * @example
 * ```typescript
 * const token = Random.string(32);
 * // 64-character hex string from 32 random bytes
 * ```
 */
export const string = (size: number): RandomString => {
  return RandomStringCtor.of(crypto.randomBytes(size).toString('hex'));
};

/**
 * Generate a random UUID v4
 *
 * @example
 * ```typescript
 * const id = Random.uuid();
 * // e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
export const uuid = (): string => {
  return crypto.randomUUID();
};

/**
 * Generate a random integer between min (inclusive) and max (inclusive)
 *
 * Uses crypto.randomInt for cryptographically secure random integers.
 *
 * @example
 * ```typescript
 * const dice = Random.int(1, 6);
 * // Random number between 1 and 6 (inclusive)
 * ```
 */
export const int = (min: number, max: number): number => {
  return crypto.randomInt(min, max + 1);
};

/**
 * Generate a cryptographically secure random token (URL-safe base64)
 *
 * @param size - Number of random bytes
 * @returns RandomString
 *
 * @example
 * ```typescript
 * const token = Random.token(32);
 * // URL-safe base64 token from 32 random bytes
 * ```
 */
export const token = (size: number = 32): RandomString => {
  return RandomStringCtor.of(
    crypto.randomBytes(size).toString('base64url')
  );
};

/**
 * Generate a random salt for key derivation
 *
 * @param size - Number of bytes (default: 16)
 * @returns Salt
 *
 * @example
 * ```typescript
 * const salt = Random.salt();
 * // 16 bytes of random data suitable for key derivation
 * ```
 */
export const salt = (size: number = 16): Salt => {
  return SaltCtor.of(crypto.randomBytes(size));
};

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Generate a random string with specific encoding
 *
 * @param size - Number of random bytes
 * @param encoding - Output encoding (hex, base64, base64url)
 * @returns RandomString
 *
 * @example
 * ```typescript
 * const hexToken = Random.stringWith(32, 'hex');
 * const b64Token = Random.stringWith(32, 'base64');
 * const urlToken = Random.stringWith(32, 'base64url');
 * ```
 */
export const stringWith = (
  size: number,
  encoding: Encoding
): RandomString => {
  return RandomStringCtor.of(crypto.randomBytes(size).toString(encoding));
};

/**
 * Generate multiple random byte arrays
 *
 * @param count - Number of arrays to generate
 * @param size - Size of each array in bytes
 * @returns Array of RandomBytes
 *
 * @example
 * ```typescript
 * const keys = Random.bytesMany(5, 32);
 * // Array of 5 RandomBytes, each 32 bytes long
 * ```
 */
export const bytesMany = (count: number, size: number): RandomBytes[] => {
  return Array.from({ length: count }, () => bytes(size));
};

/**
 * Generate multiple random strings
 *
 * @param count - Number of strings to generate
 * @param size - Number of random bytes per string
 * @param encoding - Output encoding
 * @returns Array of RandomString
 *
 * @example
 * ```typescript
 * const tokens = Random.stringMany(10, 32, 'base64url');
 * // Array of 10 URL-safe tokens
 * ```
 */
export const stringMany = (
  count: number,
  size: number,
  encoding: Encoding = 'hex'
): RandomString[] => {
  return Array.from({ length: count }, () => stringWith(size, encoding));
};

/**
 * Generate multiple UUIDs
 *
 * @param count - Number of UUIDs to generate
 * @returns Array of UUID strings
 *
 * @example
 * ```typescript
 * const ids = Random.uuidMany(5);
 * // Array of 5 UUIDs
 * ```
 */
export const uuidMany = (count: number): string[] => {
  return Array.from({ length: count }, () => uuid());
};

// ============================================================================
// L3: Advanced API - Async operations and composition
// ============================================================================

/**
 * Asynchronously generate random bytes using TaskEither
 *
 * Useful for integration with other TaskEither-based operations.
 *
 * @param size - Number of bytes to generate
 * @returns TaskEither<CryptoError, RandomBytes>
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   Random.bytesAsync(32),
 *   TE.map(bytes => {
 *     // Process random bytes
 *     return bytes;
 *   })
 * );
 *
 * const result = await program();
 * ```
 */
export const bytesAsync = (
  size: number
): TE.TaskEither<CryptoError, RandomBytes> =>
  TE.tryCatch(
    () =>
      new Promise<RandomBytes>((resolve, reject) => {
        crypto.randomBytes(size, (err, buffer) => {
          if (err) reject(err);
          else resolve(RandomBytesCtor.of(buffer));
        });
      }),
    (error) => mkCryptoError(error as Error, 'random bytes generation')
  );

/**
 * Asynchronously generate a random string using TaskEither
 *
 * @param size - Number of random bytes
 * @param encoding - Output encoding
 * @returns TaskEither<CryptoError, RandomString>
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   Random.stringAsync(32, 'base64url'),
 *   TE.map(str => {
 *     // Use the random string
 *     return str;
 *   })
 * );
 * ```
 */
export const stringAsync = (
  size: number,
  encoding: Encoding = 'hex'
): TE.TaskEither<CryptoError, RandomString> =>
  pipe(
    bytesAsync(size),
    TE.map((randomBytes) =>
      RandomStringCtor.of(RandomBytesCtor.unwrap(randomBytes).toString(encoding))
    )
  );

/**
 * Generate a random integer asynchronously
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns TaskEither<CryptoError, number>
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   Random.intAsync(1, 100),
 *   TE.map(n => console.log(`Random number: ${n}`))
 * );
 * ```
 */
export const intAsync = (
  min: number,
  max: number
): TE.TaskEither<CryptoError, number> =>
  TE.tryCatch(
    () => Promise.resolve(crypto.randomInt(min, max + 1)),
    (error) => mkCryptoError(error as Error, 'random int generation')
  );

/**
 * Fill an existing buffer with random bytes
 *
 * @param buffer - Buffer to fill
 * @returns TaskEither<CryptoError, Buffer>
 *
 * @example
 * ```typescript
 * const buffer = Buffer.alloc(32);
 * const program = Random.fillBuffer(buffer);
 * // buffer is now filled with random bytes
 * ```
 */
export const fillBuffer = (
  buffer: Buffer
): TE.TaskEither<CryptoError, Buffer> =>
  TE.tryCatch(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        crypto.randomFill(buffer, (err, buf) => {
          if (err) reject(err);
          else resolve(buf);
        });
      }),
    (error) => mkCryptoError(error as Error, 'buffer fill')
  );

/**
 * Select a random element from an array
 *
 * @param array - Array to select from
 * @returns E.Either<CryptoError, T> (Left if array is empty)
 *
 * @example
 * ```typescript
 * const colors = ['red', 'green', 'blue'];
 * const selected = Random.choice(colors);
 * // E.Either<CryptoError, string>
 * ```
 */
export const choice = <T>(
  array: ReadonlyArray<T>
): E.Either<CryptoError, T> => {
  if (array.length === 0) {
    return E.left(
      mkCryptoError(new Error('Cannot select from empty array'), 'choice')
    );
  }

  const index = crypto.randomInt(0, array.length);
  return E.right(array[index]);
};

/**
 * Shuffle an array using Fisher-Yates algorithm with crypto random
 *
 * @param array - Array to shuffle
 * @returns New shuffled array
 *
 * @example
 * ```typescript
 * const deck = [1, 2, 3, 4, 5];
 * const shuffled = Random.shuffle(deck);
 * // [3, 1, 5, 2, 4] (cryptographically random order)
 * ```
 */
export const shuffle = <T>(array: ReadonlyArray<T>): T[] => {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

/**
 * Sample N random elements from an array without replacement
 *
 * @param array - Array to sample from
 * @param n - Number of elements to sample
 * @returns E.Either<CryptoError, T[]>
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const sample = Random.sample(numbers, 3);
 * // E.right([7, 2, 9]) - 3 random elements
 * ```
 */
export const sample = <T>(
  array: ReadonlyArray<T>,
  n: number
): E.Either<CryptoError, T[]> => {
  if (n > array.length) {
    return E.left(
      mkCryptoError(
        new Error(`Cannot sample ${n} elements from array of length ${array.length}`),
        'sample'
      )
    );
  }

  if (n <= 0) {
    return E.right([]);
  }

  const shuffled = shuffle(array);
  return E.right(shuffled.slice(0, n));
};

/**
 * Generate a random alphanumeric string
 *
 * @param length - Length of the output string
 * @returns RandomString
 *
 * @example
 * ```typescript
 * const code = Random.alphanumeric(8);
 * // e.g., "aB3xK9mZ" (8 characters)
 * ```
 */
export const alphanumeric = (length: number): RandomString => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const result = Array.from({ length }, () => {
    const index = crypto.randomInt(0, chars.length);
    return chars[index];
  }).join('');

  return RandomStringCtor.of(result);
};

/**
 * Generate a random string with custom character set
 *
 * @param length - Length of the output string
 * @param charset - Custom character set to use
 * @returns RandomString
 *
 * @example
 * ```typescript
 * const pin = Random.fromCharset(4, '0123456789');
 * // e.g., "7392" (4-digit PIN)
 * ```
 */
export const fromCharset = (length: number, charset: string): RandomString => {
  if (charset.length === 0) {
    throw new Error('Charset cannot be empty');
  }

  const result = Array.from({ length }, () => {
    const index = crypto.randomInt(0, charset.length);
    return charset[index];
  }).join('');

  return RandomStringCtor.of(result);
};

/**
 * Utilities for common random operations
 */
export const RandomUtils = {
  /**
   * Generate a random password with configurable character sets
   */
  password: (
    length: number = 16,
    options: {
      uppercase?: boolean;
      lowercase?: boolean;
      digits?: boolean;
      symbols?: boolean;
    } = {}
  ): RandomString => {
    const {
      uppercase = true,
      lowercase = true,
      digits = true,
      symbols = true,
    } = options;

    let charset = '';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (digits) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
      throw new Error('At least one character set must be enabled');
    }

    return fromCharset(length, charset);
  },

  /**
   * Generate a random PIN code
   */
  pin: (length: number = 4): RandomString => {
    return fromCharset(length, '0123456789');
  },

  /**
   * Generate a random OTP (one-time password)
   */
  otp: (length: number = 6): RandomString => {
    return fromCharset(length, '0123456789');
  },

  /**
   * Generate a random session ID
   */
  sessionId: (): RandomString => {
    return token(32);
  },

  /**
   * Generate a random API key
   */
  apiKey: (): RandomString => {
    return stringWith(32, 'base64url');
  },
};

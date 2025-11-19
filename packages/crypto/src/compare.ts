/**
 * @module compare
 * @description Constant-time comparison functions to prevent timing attacks
 *
 * Provides type-safe constant-time comparison using Node.js crypto.timingSafeEqual.
 * Essential for comparing security-sensitive values like hashes, tokens, and MACs.
 *
 * Security Best Practices:
 * - Always use constant-time comparison for security-sensitive values
 * - Never use === or == for comparing secrets, tokens, or hashes
 * - Timing attacks can leak information through variable execution time
 * - Use these functions whenever comparing user input to stored secrets
 *
 * Why Constant-Time Comparison?
 * Regular string comparison (===) exits early on the first mismatch, which
 * allows attackers to deduce information about the secret by measuring response time.
 * Constant-time comparison always takes the same amount of time regardless of
 * where differences occur.
 *
 * @example
 * ```typescript
 * import * as Compare from '@djed/crypto/compare';
 *
 * // Compare strings
 * const isMatch = Compare.equal('secret123', 'secret123'); // true
 *
 * // Compare buffers
 * const buf1 = Buffer.from('secret');
 * const buf2 = Buffer.from('secret');
 * const match = Compare.buffers(buf1, buf2); // E.right(true)
 * ```
 */

import * as crypto from 'crypto';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { CryptoError } from './types';

/**
 * Internal error constructor
 */
const mkCryptoError = (error: Error, context?: string): CryptoError => ({
  _tag: 'CryptoError',
  error,
  context,
});

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Constant-time string comparison
 *
 * Compares two strings in constant time to prevent timing attacks.
 * Both strings are converted to buffers using UTF-8 encoding.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * const token = 'abc123';
 * const userToken = 'abc123';
 *
 * if (Compare.equal(token, userToken)) {
 *   console.log('Valid token');
 * }
 * ```
 */
export const equal = (a: string, b: string): boolean => {
  // Convert strings to buffers of equal length
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // If lengths differ, still perform comparison to maintain constant time
  // We pad the shorter buffer to match the longer one
  if (bufA.length !== bufB.length) {
    // Create buffers of equal length (max of the two)
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);

    bufA.copy(paddedA);
    bufB.copy(paddedB);

    try {
      // This will always return false for different lengths,
      // but in constant time
      crypto.timingSafeEqual(paddedA, paddedB);
      return false; // Different lengths = not equal
    } catch {
      return false;
    }
  }

  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Constant-time buffer comparison
 *
 * Compares two buffers in constant time. Buffers must be of equal length.
 *
 * @param a - First buffer to compare
 * @param b - Second buffer to compare
 * @returns E.Either<CryptoError, boolean>
 *
 * @example
 * ```typescript
 * const hash1 = Buffer.from('abc123', 'utf8');
 * const hash2 = Buffer.from('abc123', 'utf8');
 *
 * const result = Compare.buffers(hash1, hash2);
 * // E.right(true)
 * ```
 */
export const buffers = (
  a: Buffer,
  b: Buffer
): E.Either<CryptoError, boolean> => {
  if (a.length !== b.length) {
    return E.right(false);
  }

  try {
    const isEqual = crypto.timingSafeEqual(a, b);
    return E.right(isEqual);
  } catch (error) {
    return E.left(
      mkCryptoError(error as Error, 'buffer comparison')
    );
  }
};

/**
 * Constant-time hex string comparison
 *
 * Compares two hex-encoded strings in constant time.
 * Useful for comparing hex-encoded hashes or tokens.
 *
 * @param a - First hex string
 * @param b - Second hex string
 * @returns true if equal, false otherwise
 *
 * @example
 * ```typescript
 * const hash1 = 'a1b2c3d4';
 * const hash2 = 'a1b2c3d4';
 *
 * const isMatch = Compare.hex(hash1, hash2); // true
 * ```
 */
export const hex = (a: string, b: string): boolean => {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Constant-time base64 string comparison
 *
 * Compares two base64-encoded strings in constant time.
 *
 * @param a - First base64 string
 * @param b - Second base64 string
 * @returns true if equal, false otherwise
 *
 * @example
 * ```typescript
 * const token1 = 'YWJjMTIz';
 * const token2 = 'YWJjMTIz';
 *
 * const isMatch = Compare.base64(token1, token2); // true
 * ```
 */
export const base64 = (a: string, b: string): boolean => {
  try {
    const bufA = Buffer.from(a, 'base64');
    const bufB = Buffer.from(b, 'base64');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Constant-time comparison with custom encoding
 *
 * @param encoding - Buffer encoding to use
 * @returns Comparison function
 *
 * @example
 * ```typescript
 * const compareHex = Compare.withEncoding('hex');
 * const isMatch = compareHex('a1b2c3', 'a1b2c3'); // true
 * ```
 */
export const withEncoding =
  (encoding: BufferEncoding) =>
  (a: string, b: string): boolean => {
    try {
      const bufA = Buffer.from(a, encoding);
      const bufB = Buffer.from(b, encoding);

      if (bufA.length !== bufB.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  };

/**
 * Create a custom comparator with length validation
 *
 * Returns an Either that captures length mismatch errors.
 *
 * @param strict - If true, return Left on length mismatch; if false, return Right(false)
 * @returns Comparison function
 *
 * @example
 * ```typescript
 * const strictCompare = Compare.withValidation(true);
 * const result = strictCompare(buf1, buf2);
 * // E.Either<CryptoError, boolean>
 * ```
 */
export const withValidation =
  (strict: boolean) =>
  (a: Buffer, b: Buffer): E.Either<CryptoError, boolean> => {
    if (a.length !== b.length) {
      if (strict) {
        return E.left(
          mkCryptoError(
            new Error(`Buffer length mismatch: ${a.length} vs ${b.length}`),
            'strict comparison'
          )
        );
      }
      return E.right(false);
    }

    try {
      const isEqual = crypto.timingSafeEqual(a, b);
      return E.right(isEqual);
    } catch (error) {
      return E.left(
        mkCryptoError(error as Error, 'buffer comparison')
      );
    }
  };

// ============================================================================
// L3: Advanced API - Specialized comparisons
// ============================================================================

/**
 * Compare multiple string pairs in constant time
 *
 * All comparisons are performed even if one fails, maintaining constant time.
 *
 * @param pairs - Array of string pairs to compare
 * @returns true if all pairs match, false otherwise
 *
 * @example
 * ```typescript
 * const allMatch = Compare.many([
 *   ['secret1', 'secret1'],
 *   ['token2', 'token2'],
 *   ['hash3', 'hash3']
 * ]);
 * // true if all match, false otherwise
 * ```
 */
export const many = (pairs: ReadonlyArray<readonly [string, string]>): boolean => {
  let allEqual = true;

  // Process all comparisons to maintain constant time
  for (const [a, b] of pairs) {
    const isEqual = equal(a, b);
    allEqual = allEqual && isEqual;
  }

  return allEqual;
};

/**
 * Compare multiple buffer pairs in constant time
 *
 * @param pairs - Array of buffer pairs to compare
 * @returns E.Either<CryptoError, boolean>
 *
 * @example
 * ```typescript
 * const result = Compare.manyBuffers([
 *   [buf1, buf2],
 *   [buf3, buf4]
 * ]);
 * ```
 */
export const manyBuffers = (
  pairs: ReadonlyArray<readonly [Buffer, Buffer]>
): E.Either<CryptoError, boolean> => {
  let allEqual = true;

  for (const [a, b] of pairs) {
    const result = buffers(a, b);

    if (E.isLeft(result)) {
      return result;
    }

    allEqual = allEqual && result.right;
  }

  return E.right(allEqual);
};

/**
 * Create a validator function that compares against a fixed value
 *
 * Useful for creating reusable validators for specific secrets.
 *
 * @param expected - The expected value to compare against
 * @returns Validator function
 *
 * @example
 * ```typescript
 * const validateApiKey = Compare.validator('my-secret-api-key');
 *
 * if (validateApiKey(userProvidedKey)) {
 *   console.log('Valid API key');
 * }
 * ```
 */
export const validator = (expected: string) => {
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return (actual: string): boolean => {
    const actualBuffer = Buffer.from(actual, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch {
      return false;
    }
  };
};

/**
 * Create a buffer validator function
 *
 * @param expected - The expected buffer to compare against
 * @returns Validator function
 *
 * @example
 * ```typescript
 * const expectedHash = Buffer.from('...', 'hex');
 * const validateHash = Compare.bufferValidator(expectedHash);
 *
 * const isValid = validateHash(userHash);
 * ```
 */
export const bufferValidator = (expected: Buffer) => {
  return (actual: Buffer): E.Either<CryptoError, boolean> => {
    return buffers(expected, actual);
  };
};

/**
 * Utilities for branded type comparisons
 */
export const BrandedCompare = {
  /**
   * Compare two values of the same branded type
   */
  equal: <T extends string>(a: T, b: T): boolean => {
    return equal(a as string, b as string);
  },

  /**
   * Create a validator for a specific branded type
   */
  validator: <T extends string>(expected: T) => {
    return (actual: T): boolean => {
      return equal(expected as string, actual as string);
    };
  },
};

/**
 * Timing-safe utilities
 */
export const TimingSafe = {
  /**
   * Check if a value is in an array using constant-time comparison
   *
   * @param value - Value to search for
   * @param array - Array to search in
   * @returns true if value is found, false otherwise
   *
   * @example
   * ```typescript
   * const validTokens = ['token1', 'token2', 'token3'];
   * const isValid = TimingSafe.includes('token2', validTokens); // true
   * ```
   */
  includes: (value: string, array: ReadonlyArray<string>): boolean => {
    let found = false;

    // Check all elements to maintain constant time
    for (const item of array) {
      const isEqual = equal(value, item);
      found = found || isEqual;
    }

    return found;
  },

  /**
   * Find index of a value in an array using constant-time comparison
   *
   * Note: While this uses constant-time comparison, the return value
   * may still leak information. Use carefully.
   *
   * @param value - Value to search for
   * @param array - Array to search in
   * @returns index if found, -1 otherwise
   */
  indexOf: (value: string, array: ReadonlyArray<string>): number => {
    let foundIndex = -1;

    for (let i = 0; i < array.length; i++) {
      const isEqual = equal(value, array[i]);
      // Update index without early exit to maintain constant time
      foundIndex = isEqual ? i : foundIndex;
    }

    return foundIndex;
  },
};

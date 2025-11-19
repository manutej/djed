/**
 * @module derive
 * @description Key derivation functions (PBKDF2, scrypt)
 *
 * Provides type-safe key derivation using Node.js crypto module with TaskEither.
 * Key derivation functions convert passwords into cryptographic keys suitable
 * for encryption.
 *
 * Security Best Practices:
 * - Use scrypt for new applications (more resistant to hardware attacks)
 * - Use PBKDF2 for compatibility with existing systems
 * - Always use a unique random salt per key
 * - Store the salt alongside the derived key
 * - Use high iteration/cost parameters appropriate for your security needs
 * - Derived keys should have sufficient length (32 bytes for AES-256)
 *
 * @example
 * ```typescript
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 * import * as Derive from '@djed/crypto/derive';
 *
 * // L1: Simple key derivation
 * const password = 'my-password';
 *
 * const program = pipe(
 *   Derive.scrypt(password),
 *   TE.map(({ key, salt }) => {
 *     // Use key for encryption
 *     // Store salt for future derivations
 *     return key;
 *   })
 * );
 * ```
 */

import * as crypto from 'crypto';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type {
  Salt,
  DerivedKey,
  KeyDerivationConfig,
  CryptoError,
} from './types';
import {
  Salt as SaltCtor,
  DerivedKey as DerivedKeyCtor,
} from './types';
import { salt as randomSalt } from './random';

/**
 * Internal error constructor
 */
const mkCryptoError = (error: Error, context?: string): CryptoError => ({
  _tag: 'CryptoError',
  error,
  context,
});

/**
 * Default configuration values
 */
const DEFAULT_PBKDF2_ITERATIONS = 600000; // OWASP recommendation (2023)
const DEFAULT_PBKDF2_KEY_LENGTH = 32; // 256 bits
const DEFAULT_PBKDF2_DIGEST = 'sha256';

const DEFAULT_SCRYPT_COST = 16384; // N = 2^14
const DEFAULT_SCRYPT_BLOCK_SIZE = 8; // r
const DEFAULT_SCRYPT_PARALLELIZATION = 1; // p
const DEFAULT_SCRYPT_KEY_LENGTH = 32; // 256 bits

/**
 * Result type for key derivation
 */
export interface DerivedKeyResult {
  readonly key: DerivedKey;
  readonly salt: Salt;
  readonly algorithm: 'pbkdf2' | 'scrypt';
  readonly config: KeyDerivationConfig;
}

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Derive a key using PBKDF2 with default parameters
 *
 * Uses SHA-256, 600,000 iterations, and 32-byte output.
 *
 * @param password - Password to derive key from
 * @param salt - Optional salt (random if not provided)
 * @returns TaskEither<CryptoError, DerivedKeyResult>
 *
 * @example
 * ```typescript
 * const password = 'my-secret-password';
 *
 * const result = await Derive.pbkdf2(password)();
 * // result: E.Either<CryptoError, DerivedKeyResult>
 * ```
 */
export const pbkdf2 =
  (password: string, salt?: Salt): TE.TaskEither<CryptoError, DerivedKeyResult> =>
    pipe(
      TE.of(salt || randomSalt()),
      TE.chainW((actualSalt) =>
        TE.tryCatch(
          () =>
            new Promise<DerivedKeyResult>((resolve, reject) => {
              crypto.pbkdf2(
                password,
                SaltCtor.unwrap(actualSalt),
                DEFAULT_PBKDF2_ITERATIONS,
                DEFAULT_PBKDF2_KEY_LENGTH,
                DEFAULT_PBKDF2_DIGEST,
                (err, derivedKey) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      key: DerivedKeyCtor.of(derivedKey),
                      salt: actualSalt,
                      algorithm: 'pbkdf2',
                      config: {
                        algorithm: 'pbkdf2',
                        salt: actualSalt,
                        iterations: DEFAULT_PBKDF2_ITERATIONS,
                        keyLength: DEFAULT_PBKDF2_KEY_LENGTH,
                        digest: DEFAULT_PBKDF2_DIGEST,
                      },
                    });
                  }
                }
              );
            }),
          (error) => mkCryptoError(error as Error, 'PBKDF2 key derivation')
        )
      )
    );

/**
 * Derive a key using scrypt with default parameters
 *
 * Uses N=16384, r=8, p=1, and 32-byte output.
 *
 * @param password - Password to derive key from
 * @param salt - Optional salt (random if not provided)
 * @returns TaskEither<CryptoError, DerivedKeyResult>
 *
 * @example
 * ```typescript
 * const password = 'my-secret-password';
 *
 * const result = await Derive.scrypt(password)();
 * // result: E.Either<CryptoError, DerivedKeyResult>
 * ```
 */
export const scrypt =
  (password: string, salt?: Salt): TE.TaskEither<CryptoError, DerivedKeyResult> =>
    pipe(
      TE.of(salt || randomSalt()),
      TE.chainW((actualSalt) =>
        TE.tryCatch(
          () =>
            new Promise<DerivedKeyResult>((resolve, reject) => {
              crypto.scrypt(
                password,
                SaltCtor.unwrap(actualSalt),
                DEFAULT_SCRYPT_KEY_LENGTH,
                {
                  N: DEFAULT_SCRYPT_COST,
                  r: DEFAULT_SCRYPT_BLOCK_SIZE,
                  p: DEFAULT_SCRYPT_PARALLELIZATION,
                },
                (err, derivedKey) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      key: DerivedKeyCtor.of(derivedKey),
                      salt: actualSalt,
                      algorithm: 'scrypt',
                      config: {
                        algorithm: 'scrypt',
                        salt: actualSalt,
                        cost: DEFAULT_SCRYPT_COST,
                        blockSize: DEFAULT_SCRYPT_BLOCK_SIZE,
                        parallelization: DEFAULT_SCRYPT_PARALLELIZATION,
                        keyLength: DEFAULT_SCRYPT_KEY_LENGTH,
                      },
                    });
                  }
                }
              );
            }),
          (error) => mkCryptoError(error as Error, 'scrypt key derivation')
        )
      )
    );

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Derive a key with custom PBKDF2 configuration
 *
 * @example
 * ```typescript
 * const config: KeyDerivationConfig = {
 *   algorithm: 'pbkdf2',
 *   iterations: 1000000,
 *   keyLength: 64,
 *   digest: 'sha512'
 * };
 *
 * const result = await Derive.pbkdf2With(config)('my-password')();
 * ```
 */
export const pbkdf2With =
  (config: KeyDerivationConfig) =>
  (password: string): TE.TaskEither<CryptoError, DerivedKeyResult> => {
    if (config.algorithm !== 'pbkdf2') {
      return TE.left(
        mkCryptoError(
          new Error('Invalid algorithm for pbkdf2With'),
          'PBKDF2 configuration'
        )
      );
    }

    const salt = config.salt || randomSalt();
    const iterations = config.iterations || DEFAULT_PBKDF2_ITERATIONS;
    const keyLength = config.keyLength || DEFAULT_PBKDF2_KEY_LENGTH;
    const digest = config.digest || DEFAULT_PBKDF2_DIGEST;

    return TE.tryCatch(
      () =>
        new Promise<DerivedKeyResult>((resolve, reject) => {
          crypto.pbkdf2(
            password,
            SaltCtor.unwrap(salt),
            iterations,
            keyLength,
            digest,
            (err, derivedKey) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  key: DerivedKeyCtor.of(derivedKey),
                  salt,
                  algorithm: 'pbkdf2',
                  config: {
                    algorithm: 'pbkdf2',
                    salt,
                    iterations,
                    keyLength,
                    digest,
                  },
                });
              }
            }
          );
        }),
      (error) => mkCryptoError(error as Error, 'PBKDF2 key derivation')
    );
  };

/**
 * Derive a key with custom scrypt configuration
 *
 * @example
 * ```typescript
 * const config: KeyDerivationConfig = {
 *   algorithm: 'scrypt',
 *   cost: 32768,
 *   blockSize: 8,
 *   parallelization: 2,
 *   keyLength: 64
 * };
 *
 * const result = await Derive.scryptWith(config)('my-password')();
 * ```
 */
export const scryptWith =
  (config: KeyDerivationConfig) =>
  (password: string): TE.TaskEither<CryptoError, DerivedKeyResult> => {
    if (config.algorithm !== 'scrypt') {
      return TE.left(
        mkCryptoError(
          new Error('Invalid algorithm for scryptWith'),
          'scrypt configuration'
        )
      );
    }

    const salt = config.salt || randomSalt();
    const cost = config.cost || DEFAULT_SCRYPT_COST;
    const blockSize = config.blockSize || DEFAULT_SCRYPT_BLOCK_SIZE;
    const parallelization = config.parallelization || DEFAULT_SCRYPT_PARALLELIZATION;
    const keyLength = config.keyLength || DEFAULT_SCRYPT_KEY_LENGTH;

    return TE.tryCatch(
      () =>
        new Promise<DerivedKeyResult>((resolve, reject) => {
          crypto.scrypt(
            password,
            SaltCtor.unwrap(salt),
            keyLength,
            {
              N: cost,
              r: blockSize,
              p: parallelization,
            },
            (err, derivedKey) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  key: DerivedKeyCtor.of(derivedKey),
                  salt,
                  algorithm: 'scrypt',
                  config: {
                    algorithm: 'scrypt',
                    salt,
                    cost,
                    blockSize,
                    parallelization,
                    keyLength,
                  },
                });
              }
            }
          );
        }),
      (error) => mkCryptoError(error as Error, 'scrypt key derivation')
    );
  };

/**
 * Derive a key with any configuration
 *
 * @example
 * ```typescript
 * const config: KeyDerivationConfig = {
 *   algorithm: 'scrypt',
 *   cost: 32768
 * };
 *
 * const result = await Derive.deriveWith(config)('my-password')();
 * ```
 */
export const deriveWith =
  (config: KeyDerivationConfig) =>
  (password: string): TE.TaskEither<CryptoError, DerivedKeyResult> => {
    return config.algorithm === 'pbkdf2'
      ? pbkdf2With(config)(password)
      : scryptWith(config)(password);
  };

// ============================================================================
// L3: Advanced API - Re-derivation and verification
// ============================================================================

/**
 * Re-derive a key using the same salt and configuration
 *
 * Useful for verifying passwords by re-deriving and comparing keys.
 *
 * @example
 * ```typescript
 * // Initial derivation
 * const result1 = await Derive.scrypt('password')();
 *
 * if (E.isRight(result1)) {
 *   const { key: originalKey, config } = result1.right;
 *
 *   // Later: re-derive to verify password
 *   const result2 = await Derive.rederive(config)('password')();
 *
 *   if (E.isRight(result2)) {
 *     const match = originalKey === result2.right.key;
 *     console.log('Password matches:', match);
 *   }
 * }
 * ```
 */
export const rederive =
  (config: KeyDerivationConfig) =>
  (password: string): TE.TaskEither<CryptoError, DerivedKeyResult> => {
    return deriveWith(config)(password);
  };

/**
 * Verify a password against a derived key result
 *
 * @example
 * ```typescript
 * const stored = await Derive.scrypt('correct-password')();
 *
 * if (E.isRight(stored)) {
 *   const result = await Derive.verifyPassword('user-input')(stored.right)();
 *   // result: E.Either<CryptoError, boolean>
 * }
 * ```
 */
export const verifyPassword =
  (password: string) =>
  (stored: DerivedKeyResult): TE.TaskEither<CryptoError, boolean> =>
    pipe(
      rederive(stored.config)(password),
      TE.map((derived) => {
        const storedKey = DerivedKeyCtor.unwrap(stored.key);
        const derivedKey = DerivedKeyCtor.unwrap(derived.key);

        // Use timing-safe comparison
        try {
          return crypto.timingSafeEqual(storedKey, derivedKey);
        } catch {
          return false;
        }
      })
    );

/**
 * Create a key deriver with fixed configuration
 *
 * @example
 * ```typescript
 * const deriver = Derive.createDeriver({
 *   algorithm: 'scrypt',
 *   cost: 32768,
 *   keyLength: 64
 * });
 *
 * const results = await Promise.all([
 *   deriver('password1'),
 *   deriver('password2')
 * ]);
 * ```
 */
export const createDeriver = (config: KeyDerivationConfig) => {
  const deriver = deriveWith(config);
  return (password: string) => deriver(password)();
};

/**
 * Derive multiple keys from different passwords using the same configuration
 *
 * @example
 * ```typescript
 * const passwords = ['pass1', 'pass2', 'pass3'];
 * const config = KeyDerivationConfig.scrypt();
 *
 * const result = await Derive.deriveMany(config)(passwords)();
 * ```
 */
export const deriveMany =
  (config: KeyDerivationConfig) =>
  (
    passwords: ReadonlyArray<string>
  ): TE.TaskEither<CryptoError, ReadonlyArray<DerivedKeyResult>> =>
    pipe(
      passwords,
      TE.traverseArray((password) => deriveWith(config)(password))
    );

/**
 * Utilities for working with key derivation configurations
 */
export const KeyDerivationConfig = {
  /**
   * Default PBKDF2 configuration (600,000 iterations, SHA-256)
   */
  pbkdf2: (
    iterations: number = DEFAULT_PBKDF2_ITERATIONS,
    keyLength: number = DEFAULT_PBKDF2_KEY_LENGTH
  ): KeyDerivationConfig => ({
    algorithm: 'pbkdf2',
    iterations,
    keyLength,
    digest: 'sha256',
  }),

  /**
   * High-security PBKDF2 configuration (1,000,000 iterations, SHA-512)
   */
  pbkdf2Strong: (): KeyDerivationConfig => ({
    algorithm: 'pbkdf2',
    iterations: 1000000,
    keyLength: 64,
    digest: 'sha512',
  }),

  /**
   * Default scrypt configuration (N=16384, r=8, p=1)
   */
  scrypt: (
    cost: number = DEFAULT_SCRYPT_COST,
    keyLength: number = DEFAULT_SCRYPT_KEY_LENGTH
  ): KeyDerivationConfig => ({
    algorithm: 'scrypt',
    cost,
    blockSize: DEFAULT_SCRYPT_BLOCK_SIZE,
    parallelization: DEFAULT_SCRYPT_PARALLELIZATION,
    keyLength,
  }),

  /**
   * High-security scrypt configuration (N=32768, r=8, p=1)
   */
  scryptStrong: (): KeyDerivationConfig => ({
    algorithm: 'scrypt',
    cost: 32768,
    blockSize: 8,
    parallelization: 1,
    keyLength: 64,
  }),

  /**
   * Add a custom salt to any configuration
   */
  withSalt: (config: KeyDerivationConfig, salt: Salt): KeyDerivationConfig => ({
    ...config,
    salt,
  }),
};

/**
 * Utilities for converting derived keys to encryption keys
 */
export const KeyUtils = {
  /**
   * Convert a derived key to a hex string
   */
  toHex: (key: DerivedKey): string => {
    return DerivedKeyCtor.unwrap(key).toString('hex');
  },

  /**
   * Convert a derived key to base64 string
   */
  toBase64: (key: DerivedKey): string => {
    return DerivedKeyCtor.unwrap(key).toString('base64');
  },

  /**
   * Convert a derived key to base64url string
   */
  toBase64Url: (key: DerivedKey): string => {
    return DerivedKeyCtor.unwrap(key).toString('base64url');
  },

  /**
   * Get first N bytes of a derived key
   */
  slice: (key: DerivedKey, length: number): DerivedKey => {
    return DerivedKeyCtor.of(DerivedKeyCtor.unwrap(key).subarray(0, length));
  },
};

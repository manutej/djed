/**
 * @module hash
 * @description Password hashing operations using bcrypt and argon2
 *
 * Provides type-safe password hashing with TaskEither for async operations.
 * Supports multiple hashing algorithms with sensible defaults.
 *
 * Security Best Practices:
 * - Use argon2id for new applications (winner of Password Hashing Competition)
 * - Use bcrypt for compatibility with existing systems
 * - Never log or store plain passwords
 * - Use high cost parameters appropriate for your security requirements
 *
 * @example
 * ```typescript
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 * import * as Hash from '@djed/crypto/hash';
 *
 * // L1: Simple hash and verify
 * const password = PlainPassword.of('mySecret123');
 *
 * const program = pipe(
 *   Hash.hash(password),
 *   TE.chain(hashed => Hash.verify(password, hashed))
 * );
 *
 * // L2: With configuration
 * const config: HashConfig = {
 *   algorithm: 'argon2id',
 *   timeCost: 3,
 *   memoryCost: 65536
 * };
 *
 * const withConfig = Hash.hashWith(config)(password);
 * ```
 */

import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type {
  PlainPassword,
  HashedPassword,
  HashConfig,
  HashError,
  HashAlgorithm,
} from './types';
import { HashedPassword as HashedPasswordCtor } from './types';

/**
 * Default hash configurations for different algorithms
 */
const DEFAULT_BCRYPT_ROUNDS = 12;
const DEFAULT_ARGON2_TIME_COST = 3;
const DEFAULT_ARGON2_MEMORY_COST = 65536; // 64 MB
const DEFAULT_ARGON2_PARALLELISM = 4;

/**
 * Internal error constructor
 */
const mkHashError = (error: Error, algorithm: HashAlgorithm): HashError => ({
  _tag: 'HashError',
  error,
  algorithm,
});

/**
 * Lazy loading for optional dependencies
 */
let bcryptModule: typeof import('bcrypt') | null = null;
let argon2Module: typeof import('argon2') | null = null;

const getBcrypt = (): E.Either<HashError, typeof import('bcrypt')> => {
  if (bcryptModule) return E.right(bcryptModule);

  try {
    bcryptModule = require('bcrypt');
    return E.right(bcryptModule);
  } catch (error) {
    return E.left(
      mkHashError(
        new Error(
          'bcrypt is not installed. Install it with: npm install bcrypt'
        ),
        'bcrypt'
      )
    );
  }
};

const getArgon2 = (): E.Either<HashError, typeof import('argon2')> => {
  if (argon2Module) return E.right(argon2Module);

  try {
    argon2Module = require('argon2');
    return E.right(argon2Module);
  } catch (error) {
    return E.left(
      mkHashError(
        new Error(
          'argon2 is not installed. Install it with: npm install argon2'
        ),
        'argon2id'
      )
    );
  }
};

/**
 * Hash a password using bcrypt
 */
const hashBcrypt =
  (saltRounds: number = DEFAULT_BCRYPT_ROUNDS) =>
  (password: PlainPassword): TE.TaskEither<HashError, HashedPassword> =>
    pipe(
      TE.fromEither(getBcrypt()),
      TE.chainW((bcrypt) =>
        TE.tryCatch(
          () => bcrypt.hash(password as string, saltRounds),
          (error) => mkHashError(error as Error, 'bcrypt')
        )
      ),
      TE.map(HashedPasswordCtor.of)
    );

/**
 * Hash a password using argon2
 */
const hashArgon2 =
  (
    type: 'argon2id' | 'argon2i' | 'argon2d',
    timeCost: number = DEFAULT_ARGON2_TIME_COST,
    memoryCost: number = DEFAULT_ARGON2_MEMORY_COST,
    parallelism: number = DEFAULT_ARGON2_PARALLELISM
  ) =>
  (password: PlainPassword): TE.TaskEither<HashError, HashedPassword> =>
    pipe(
      TE.fromEither(getArgon2()),
      TE.chainW((argon2) => {
        const argon2Type =
          type === 'argon2id'
            ? argon2.argon2id
            : type === 'argon2i'
              ? argon2.argon2i
              : argon2.argon2d;

        return TE.tryCatch(
          () =>
            argon2Type(password as string, {
              timeCost,
              memoryCost,
              parallelism,
            }),
          (error) => mkHashError(error as Error, type)
        );
      }),
      TE.map(HashedPasswordCtor.of)
    );

/**
 * Verify a password against a bcrypt hash
 */
const verifyBcrypt =
  (password: PlainPassword) =>
  (hash: HashedPassword): TE.TaskEither<HashError, boolean> =>
    pipe(
      TE.fromEither(getBcrypt()),
      TE.chainW((bcrypt) =>
        TE.tryCatch(
          () => bcrypt.compare(password as string, hash as string),
          (error) => mkHashError(error as Error, 'bcrypt')
        )
      )
    );

/**
 * Verify a password against an argon2 hash
 */
const verifyArgon2 =
  (password: PlainPassword) =>
  (hash: HashedPassword): TE.TaskEither<HashError, boolean> =>
    pipe(
      TE.fromEither(getArgon2()),
      TE.chainW((argon2) =>
        TE.tryCatch(
          () => argon2.verify(hash as string, password as string),
          (error) => mkHashError(error as Error, 'argon2id')
        )
      )
    );

/**
 * Determine algorithm from hash format
 */
const detectAlgorithm = (hash: HashedPassword): HashAlgorithm => {
  const hashStr = hash as string;
  if (hashStr.startsWith('$2a$') || hashStr.startsWith('$2b$')) {
    return 'bcrypt';
  }
  if (hashStr.startsWith('$argon2id$')) {
    return 'argon2id';
  }
  if (hashStr.startsWith('$argon2i$')) {
    return 'argon2i';
  }
  if (hashStr.startsWith('$argon2d$')) {
    return 'argon2d';
  }
  return 'bcrypt'; // fallback
};

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Hash a password using argon2id (recommended default)
 *
 * @example
 * ```typescript
 * const password = PlainPassword.of('mySecret123');
 * const result = await hash(password)();
 * ```
 */
export const hash = (
  password: PlainPassword
): TE.TaskEither<HashError, HashedPassword> =>
  hashArgon2('argon2id')(password);

/**
 * Verify a password against a hash
 *
 * Automatically detects the hash algorithm and uses the appropriate verification method.
 *
 * @example
 * ```typescript
 * const password = PlainPassword.of('mySecret123');
 * const hashed = HashedPassword.of('$argon2id$...');
 *
 * const result = await verify(password, hashed)();
 * // result: E.Either<HashError, boolean>
 * ```
 */
export const verify =
  (password: PlainPassword) =>
  (hash: HashedPassword): TE.TaskEither<HashError, boolean> => {
    const algorithm = detectAlgorithm(hash);

    return algorithm === 'bcrypt'
      ? verifyBcrypt(password)(hash)
      : verifyArgon2(password)(hash);
  };

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Hash a password with custom configuration
 *
 * @example
 * ```typescript
 * const config: HashConfig = {
 *   algorithm: 'bcrypt',
 *   saltRounds: 14
 * };
 *
 * const password = PlainPassword.of('mySecret123');
 * const result = await hashWith(config)(password)();
 * ```
 */
export const hashWith =
  (config: HashConfig) =>
  (password: PlainPassword): TE.TaskEither<HashError, HashedPassword> => {
    switch (config.algorithm) {
      case 'bcrypt':
        return hashBcrypt(config.saltRounds)(password);

      case 'argon2id':
      case 'argon2i':
      case 'argon2d':
        return hashArgon2(
          config.algorithm,
          config.timeCost,
          config.memoryCost,
          config.parallelism
        )(password);
    }
  };

/**
 * Verify a password with explicit algorithm specification
 *
 * @example
 * ```typescript
 * const password = PlainPassword.of('mySecret123');
 * const hashed = HashedPassword.of('$2b$12$...');
 *
 * const result = await verifyWith('bcrypt')(password)(hashed)();
 * ```
 */
export const verifyWith =
  (algorithm: HashAlgorithm) =>
  (password: PlainPassword) =>
  (hash: HashedPassword): TE.TaskEither<HashError, boolean> => {
    return algorithm === 'bcrypt'
      ? verifyBcrypt(password)(hash)
      : verifyArgon2(password)(hash);
  };

// ============================================================================
// L3: Advanced API - Fine-grained control and composition
// ============================================================================

/**
 * Create a custom hasher with specific parameters
 *
 * @example
 * ```typescript
 * const customHasher = createHasher({
 *   algorithm: 'argon2id',
 *   timeCost: 4,
 *   memoryCost: 131072,
 *   parallelism: 8
 * });
 *
 * const passwords = [
 *   PlainPassword.of('pass1'),
 *   PlainPassword.of('pass2')
 * ];
 *
 * const hashed = await Promise.all(passwords.map(customHasher));
 * ```
 */
export const createHasher = (config: HashConfig) => {
  const hasher = hashWith(config);
  return (password: PlainPassword) => hasher(password)();
};

/**
 * Create a custom verifier with specific algorithm
 *
 * @example
 * ```typescript
 * const bcryptVerifier = createVerifier('bcrypt');
 *
 * const isValid = await bcryptVerifier(
 *   PlainPassword.of('secret'),
 *   HashedPassword.of('$2b$12$...')
 * );
 * ```
 */
export const createVerifier = (algorithm: HashAlgorithm) => {
  const verifier = verifyWith(algorithm);
  return (password: PlainPassword, hash: HashedPassword) =>
    verifier(password)(hash)();
};

/**
 * Check if rehashing is needed (for bcrypt only)
 *
 * Returns true if the hash was created with fewer rounds than specified.
 *
 * @example
 * ```typescript
 * const hash = HashedPassword.of('$2b$10$...');
 * const needsRehash = needsRehashing(hash, 12); // true
 * ```
 */
export const needsRehashing = (
  hash: HashedPassword,
  rounds: number
): boolean => {
  const algorithm = detectAlgorithm(hash);
  if (algorithm !== 'bcrypt') return false;

  const match = (hash as string).match(/^\$2[aby]\$(\d+)\$/);
  if (!match) return false;

  const currentRounds = parseInt(match[1], 10);
  return currentRounds < rounds;
};

/**
 * Rehash a password if needed
 *
 * @example
 * ```typescript
 * const password = PlainPassword.of('secret');
 * const oldHash = HashedPassword.of('$2b$10$...');
 *
 * const result = await pipe(
 *   rehashIfNeeded(12)(password)(oldHash),
 *   TE.map(({ rehashed, hash }) => {
 *     if (rehashed) {
 *       // Update hash in database
 *       console.log('Hash updated');
 *     }
 *     return hash;
 *   })
 * )();
 * ```
 */
export const rehashIfNeeded =
  (rounds: number) =>
  (password: PlainPassword) =>
  (
    hash: HashedPassword
  ): TE.TaskEither<HashError, { rehashed: boolean; hash: HashedPassword }> => {
    if (needsRehashing(hash, rounds)) {
      return pipe(
        hashBcrypt(rounds)(password),
        TE.map((newHash) => ({ rehashed: true, hash: newHash }))
      );
    }

    return TE.right({ rehashed: false, hash });
  };

/**
 * Utilities for working with hash configurations
 */
export const HashConfig = {
  /**
   * Default bcrypt configuration
   */
  bcrypt: (saltRounds: number = DEFAULT_BCRYPT_ROUNDS): HashConfig => ({
    algorithm: 'bcrypt',
    saltRounds,
  }),

  /**
   * Default argon2id configuration (recommended)
   */
  argon2id: (
    timeCost: number = DEFAULT_ARGON2_TIME_COST,
    memoryCost: number = DEFAULT_ARGON2_MEMORY_COST,
    parallelism: number = DEFAULT_ARGON2_PARALLELISM
  ): HashConfig => ({
    algorithm: 'argon2id',
    timeCost,
    memoryCost,
    parallelism,
  }),

  /**
   * Argon2i configuration (optimized against side-channel attacks)
   */
  argon2i: (
    timeCost: number = DEFAULT_ARGON2_TIME_COST,
    memoryCost: number = DEFAULT_ARGON2_MEMORY_COST,
    parallelism: number = DEFAULT_ARGON2_PARALLELISM
  ): HashConfig => ({
    algorithm: 'argon2i',
    timeCost,
    memoryCost,
    parallelism,
  }),

  /**
   * Argon2d configuration (optimized for GPU resistance)
   */
  argon2d: (
    timeCost: number = DEFAULT_ARGON2_TIME_COST,
    memoryCost: number = DEFAULT_ARGON2_MEMORY_COST,
    parallelism: number = DEFAULT_ARGON2_PARALLELISM
  ): HashConfig => ({
    algorithm: 'argon2d',
    timeCost,
    memoryCost,
    parallelism,
  }),
};

/**
 * @djed/crypto
 *
 * Type-safe cryptography operations with fp-ts
 *
 * This package provides cryptographically secure operations with:
 * - Branded types for zero-cost type safety
 * - TaskEither for async operations
 * - Either for validation
 * - Progressive API design (L1, L2, L3)
 *
 * @example
 * ```typescript
 * import * as Crypto from '@djed/crypto';
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 *
 * // Hash a password
 * const password = Crypto.PlainPassword.of('secret123');
 * const hashed = await Crypto.Hash.hash(password)();
 *
 * // Encrypt data
 * const key = Crypto.EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const data = Crypto.DecryptedData.of('secret message');
 * const encrypted = await Crypto.Encrypt.encrypt(key)(data)();
 *
 * // Sign JWT
 * const secret = Crypto.JWTSecret.of('jwt-secret');
 * const token = await Crypto.JWT.sign(secret)({ userId: '123' })();
 *
 * // Generate random token
 * const token = Crypto.Random.token(32);
 * ```
 *
 * @module @djed/crypto
 */

// ============================================================================
// Types - Branded types for cryptographic values
// ============================================================================

export type {
  // Password types
  PlainPassword,
  HashedPassword,

  // JWT types
  JWT,
  JWTPayload,
  JWTSecret,

  // Encryption types
  EncryptedData,
  DecryptedData,
  EncryptionKey,
  IV,
  AuthTag,

  // Key derivation types
  Salt,
  DerivedKey,

  // Random types
  RandomBytes,
  RandomString,

  // Algorithm types
  HashAlgorithm,
  EncryptionAlgorithm,
  JWTAlgorithm,

  // Configuration types
  HashConfig,
  EncryptionConfig,
  JWTSignConfig,
  JWTVerifyConfig,
  KeyDerivationConfig,

  // Error types
  CryptoError,
  HashError,
  EncryptionError,
  JWTError,
} from './types';

export {
  // Branded type constructors
  PlainPassword,
  HashedPassword,
  JWT,
  JWTSecret,
  EncryptedData,
  DecryptedData,
  EncryptionKey,
  IV,
  AuthTag,
  Salt,
  DerivedKey,
  RandomBytes,
  RandomString,

  // Error constructors
  CryptoError,
  HashError,
  EncryptionError,
  JWTError,
} from './types';

// ============================================================================
// Hash - Password hashing operations
// ============================================================================

export * as Hash from './hash';

// ============================================================================
// Encrypt - Encryption/decryption operations
// ============================================================================

export * as Encrypt from './encrypt';

// ============================================================================
// JWT - JSON Web Token operations
// ============================================================================

export * as JWT from './jwt';

// ============================================================================
// Random - Secure random generation
// ============================================================================

export * as Random from './random';

// ============================================================================
// Compare - Constant-time comparison
// ============================================================================

export * as Compare from './compare';

// ============================================================================
// Derive - Key derivation functions
// ============================================================================

export * as Derive from './derive';

// ============================================================================
// Convenience exports for common operations
// ============================================================================

/**
 * L1 API - Simple operations with sensible defaults
 */
export const L1 = {
  // Password hashing
  hash: async (password: import('./types').PlainPassword) => {
    const { hash } = await import('./hash');
    return hash(password)();
  },

  verify: async (
    password: import('./types').PlainPassword,
    hashed: import('./types').HashedPassword
  ) => {
    const { verify } = await import('./hash');
    return verify(password)(hashed)();
  },

  // Encryption
  encrypt: async (
    key: import('./types').EncryptionKey,
    data: import('./types').DecryptedData
  ) => {
    const { encrypt } = await import('./encrypt');
    return encrypt(key)(data)();
  },

  decrypt: async (
    key: import('./types').EncryptionKey,
    encrypted: import('./types').EncryptedData
  ) => {
    const { decrypt } = await import('./encrypt');
    return decrypt(key)(encrypted)();
  },

  // JWT
  signJWT: async (
    secret: import('./types').JWTSecret,
    payload: import('./types').JWTPayload
  ) => {
    const { sign } = await import('./jwt');
    return sign(secret)(payload)();
  },

  verifyJWT: async (
    secret: import('./types').JWTSecret,
    token: import('./types').JWT
  ) => {
    const { verify } = await import('./jwt');
    return verify(secret)(token)();
  },

  // Random
  randomToken: () => {
    const { token } = require('./random');
    return token(32);
  },

  randomUUID: () => {
    const { uuid } = require('./random');
    return uuid();
  },

  // Compare
  safeCompare: (a: string, b: string) => {
    const { equal } = require('./compare');
    return equal(a, b);
  },

  // Key derivation
  deriveKey: async (password: string) => {
    const { scrypt } = await import('./derive');
    return scrypt(password)();
  },
};

/**
 * Default export provides access to all modules
 */
const Crypto = {
  // Modules
  Hash: require('./hash'),
  Encrypt: require('./encrypt'),
  JWT: require('./jwt'),
  Random: require('./random'),
  Compare: require('./compare'),
  Derive: require('./derive'),

  // Types (re-export)
  PlainPassword: require('./types').PlainPassword,
  HashedPassword: require('./types').HashedPassword,
  JWT: require('./types').JWT,
  JWTSecret: require('./types').JWTSecret,
  EncryptedData: require('./types').EncryptedData,
  DecryptedData: require('./types').DecryptedData,
  EncryptionKey: require('./types').EncryptionKey,
  IV: require('./types').IV,
  AuthTag: require('./types').AuthTag,
  Salt: require('./types').Salt,
  DerivedKey: require('./types').DerivedKey,
  RandomBytes: require('./types').RandomBytes,
  RandomString: require('./types').RandomString,

  // L1 API
  L1,
};

export default Crypto;

/**
 * @module types
 * @description Branded types for cryptographic values providing zero-cost type safety
 *
 * Branded types ensure that cryptographic values cannot be accidentally mixed or misused.
 * For example, a PlainPassword cannot be stored where a HashedPassword is expected.
 */

/**
 * Nominal typing utilities for creating branded types
 */
declare const brand: unique symbol;

export type Brand<B> = { readonly [brand]: B };
export type Branded<A, B> = A & Brand<B>;

/**
 * Password-related branded types
 */

/** Represents a plain-text password (should never be persisted) */
export type PlainPassword = Branded<string, 'PlainPassword'>;

/** Represents a hashed password (safe to persist) */
export type HashedPassword = Branded<string, 'HashedPassword'>;

/**
 * Constructor functions for password types
 */
export const PlainPassword = {
  /** Creates a PlainPassword from a string */
  of: (value: string): PlainPassword => value as PlainPassword,

  /** Unwraps a PlainPassword to a string */
  unwrap: (password: PlainPassword): string => password as string,
};

export const HashedPassword = {
  /** Creates a HashedPassword from a string */
  of: (value: string): HashedPassword => value as HashedPassword,

  /** Unwraps a HashedPassword to a string */
  unwrap: (password: HashedPassword): string => password as string,
};

/**
 * JWT-related branded types
 */

/** Represents a JSON Web Token */
export type JWT = Branded<string, 'JWT'>;

/** JWT payload (decoded but not verified) */
export type JWTPayload = Record<string, unknown>;

/** JWT secret for signing/verification */
export type JWTSecret = Branded<string, 'JWTSecret'>;

export const JWT = {
  /** Creates a JWT from a string */
  of: (value: string): JWT => value as JWT,

  /** Unwraps a JWT to a string */
  unwrap: (token: JWT): string => token as string,
};

export const JWTSecret = {
  /** Creates a JWTSecret from a string */
  of: (value: string): JWTSecret => value as JWTSecret,

  /** Unwraps a JWTSecret to a string */
  unwrap: (secret: JWTSecret): string => secret as string,
};

/**
 * Encryption-related branded types
 */

/** Represents encrypted data (cipher text) */
export type EncryptedData = Branded<string, 'EncryptedData'>;

/** Represents decrypted data (plain text) */
export type DecryptedData = Branded<string, 'DecryptedData'>;

/** Encryption key */
export type EncryptionKey = Branded<string, 'EncryptionKey'>;

/** Initialization vector for encryption */
export type IV = Branded<Buffer, 'IV'>;

/** Authentication tag for authenticated encryption */
export type AuthTag = Branded<Buffer, 'AuthTag'>;

export const EncryptedData = {
  /** Creates EncryptedData from a string */
  of: (value: string): EncryptedData => value as EncryptedData,

  /** Unwraps EncryptedData to a string */
  unwrap: (data: EncryptedData): string => data as string,
};

export const DecryptedData = {
  /** Creates DecryptedData from a string */
  of: (value: string): DecryptedData => value as DecryptedData,

  /** Unwraps DecryptedData to a string */
  unwrap: (data: DecryptedData): string => data as string,
};

export const EncryptionKey = {
  /** Creates an EncryptionKey from a string */
  of: (value: string): EncryptionKey => value as EncryptionKey,

  /** Unwraps an EncryptionKey to a string */
  unwrap: (key: EncryptionKey): string => key as string,
};

export const IV = {
  /** Creates an IV from a Buffer */
  of: (value: Buffer): IV => value as IV,

  /** Unwraps an IV to a Buffer */
  unwrap: (iv: IV): Buffer => iv as Buffer,
};

export const AuthTag = {
  /** Creates an AuthTag from a Buffer */
  of: (value: Buffer): AuthTag => value as AuthTag,

  /** Unwraps an AuthTag to a Buffer */
  unwrap: (tag: AuthTag): Buffer => tag as Buffer,
};

/**
 * Key derivation types
 */

/** Salt for key derivation */
export type Salt = Branded<Buffer, 'Salt'>;

/** Derived key from PBKDF2 or scrypt */
export type DerivedKey = Branded<Buffer, 'DerivedKey'>;

export const Salt = {
  /** Creates a Salt from a Buffer */
  of: (value: Buffer): Salt => value as Salt,

  /** Unwraps a Salt to a Buffer */
  unwrap: (salt: Salt): Buffer => salt as Buffer,
};

export const DerivedKey = {
  /** Creates a DerivedKey from a Buffer */
  of: (value: Buffer): DerivedKey => value as DerivedKey,

  /** Unwraps a DerivedKey to a Buffer */
  unwrap: (key: DerivedKey): Buffer => key as Buffer,
};

/**
 * Random data types
 */

/** Cryptographically secure random bytes */
export type RandomBytes = Branded<Buffer, 'RandomBytes'>;

/** Random string (hex or base64 encoded) */
export type RandomString = Branded<string, 'RandomString'>;

export const RandomBytes = {
  /** Creates RandomBytes from a Buffer */
  of: (value: Buffer): RandomBytes => value as RandomBytes,

  /** Unwraps RandomBytes to a Buffer */
  unwrap: (bytes: RandomBytes): Buffer => bytes as Buffer,
};

export const RandomString = {
  /** Creates a RandomString from a string */
  of: (value: string): RandomString => value as RandomString,

  /** Unwraps a RandomString to a string */
  unwrap: (str: RandomString): string => str as string,
};

/**
 * Configuration types
 */

/** Hash algorithm types */
export type HashAlgorithm = 'bcrypt' | 'argon2id' | 'argon2i' | 'argon2d';

/** Encryption algorithm types */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';

/** JWT algorithm types */
export type JWTAlgorithm =
  | 'HS256' | 'HS384' | 'HS512'
  | 'RS256' | 'RS384' | 'RS512'
  | 'ES256' | 'ES384' | 'ES512';

/**
 * Hash configuration
 */
export interface HashConfig {
  readonly algorithm: HashAlgorithm;
  readonly saltRounds?: number; // for bcrypt
  readonly timeCost?: number; // for argon2
  readonly memoryCost?: number; // for argon2 (in KB)
  readonly parallelism?: number; // for argon2
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  readonly algorithm: EncryptionAlgorithm;
  readonly key: EncryptionKey;
  readonly iv?: IV; // auto-generated if not provided
}

/**
 * JWT sign configuration
 */
export interface JWTSignConfig {
  readonly algorithm?: JWTAlgorithm;
  readonly expiresIn?: string | number; // e.g., '1h', 3600
  readonly notBefore?: string | number;
  readonly audience?: string | string[];
  readonly issuer?: string;
  readonly subject?: string;
}

/**
 * JWT verify configuration
 */
export interface JWTVerifyConfig {
  readonly algorithms?: JWTAlgorithm[];
  readonly audience?: string | string[];
  readonly issuer?: string | string[];
  readonly subject?: string;
  readonly clockTolerance?: number;
  readonly maxAge?: string | number;
}

/**
 * Key derivation configuration
 */
export interface KeyDerivationConfig {
  readonly algorithm: 'pbkdf2' | 'scrypt';
  readonly salt?: Salt; // auto-generated if not provided
  readonly iterations?: number; // for pbkdf2
  readonly keyLength?: number; // output key length in bytes
  readonly digest?: 'sha256' | 'sha512'; // for pbkdf2
  readonly cost?: number; // for scrypt (N parameter)
  readonly blockSize?: number; // for scrypt (r parameter)
  readonly parallelization?: number; // for scrypt (p parameter)
}

/**
 * Error types for crypto operations
 */
export interface CryptoError {
  readonly _tag: 'CryptoError';
  readonly error: Error;
  readonly context?: string;
}

export const CryptoError = {
  of: (error: Error, context?: string): CryptoError => ({
    _tag: 'CryptoError',
    error,
    context,
  }),
};

export interface HashError {
  readonly _tag: 'HashError';
  readonly error: Error;
  readonly algorithm: HashAlgorithm;
}

export const HashError = {
  of: (error: Error, algorithm: HashAlgorithm): HashError => ({
    _tag: 'HashError',
    error,
    algorithm,
  }),
};

export interface EncryptionError {
  readonly _tag: 'EncryptionError';
  readonly error: Error;
  readonly algorithm: EncryptionAlgorithm;
}

export const EncryptionError = {
  of: (error: Error, algorithm: EncryptionAlgorithm): EncryptionError => ({
    _tag: 'EncryptionError',
    error,
    algorithm,
  }),
};

export interface JWTError {
  readonly _tag: 'JWTError';
  readonly error: Error;
  readonly reason: 'sign' | 'verify' | 'decode' | 'expired' | 'invalid';
}

export const JWTError = {
  of: (error: Error, reason: JWTError['reason']): JWTError => ({
    _tag: 'JWTError',
    error,
    reason,
  }),
};

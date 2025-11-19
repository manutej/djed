/**
 * @module encrypt
 * @description Symmetric and asymmetric encryption/decryption operations
 *
 * Provides type-safe encryption using Node.js crypto module with TaskEither.
 * Supports AES-256-GCM (authenticated encryption) and AES-256-CBC.
 *
 * Security Best Practices:
 * - Use AES-256-GCM for authenticated encryption (prevents tampering)
 * - Never reuse IVs with the same key
 * - Store IVs alongside ciphertext (they don't need to be secret)
 * - Use random IVs for each encryption operation
 * - Keep encryption keys secure and rotate them regularly
 *
 * @example
 * ```typescript
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 * import * as Encrypt from '@djed/crypto/encrypt';
 *
 * // L1: Simple encryption/decryption
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const plaintext = DecryptedData.of('secret message');
 *
 * const program = pipe(
 *   Encrypt.encrypt(key)(plaintext),
 *   TE.chain(encrypted => Encrypt.decrypt(key)(encrypted))
 * );
 * ```
 */

import * as crypto from 'crypto';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type {
  EncryptedData,
  DecryptedData,
  EncryptionKey,
  EncryptionConfig,
  EncryptionAlgorithm,
  EncryptionError,
  IV,
  AuthTag,
} from './types';
import {
  EncryptedData as EncryptedDataCtor,
  DecryptedData as DecryptedDataCtor,
  IV as IVCtor,
  AuthTag as AuthTagCtor,
} from './types';

/**
 * Constants
 */
const AES_256_KEY_LENGTH = 32; // 256 bits
const GCM_IV_LENGTH = 12; // 96 bits (recommended for GCM)
const CBC_IV_LENGTH = 16; // 128 bits
const GCM_TAG_LENGTH = 16; // 128 bits

/**
 * Internal error constructor
 */
const mkEncryptionError = (
  error: Error,
  algorithm: EncryptionAlgorithm
): EncryptionError => ({
  _tag: 'EncryptionError',
  error,
  algorithm,
});

/**
 * Encrypted data envelope for GCM mode (includes IV and auth tag)
 */
interface EncryptedEnvelope {
  readonly algorithm: EncryptionAlgorithm;
  readonly iv: string; // base64
  readonly data: string; // base64
  readonly tag?: string; // base64 (for GCM)
}

/**
 * Validate encryption key length
 */
const validateKeyLength = (key: EncryptionKey): E.Either<EncryptionError, void> => {
  const keyBuffer = Buffer.from(key as string, 'utf8');
  if (keyBuffer.length !== AES_256_KEY_LENGTH) {
    return E.left(
      mkEncryptionError(
        new Error(
          `Encryption key must be exactly ${AES_256_KEY_LENGTH} bytes (256 bits). Got ${keyBuffer.length} bytes.`
        ),
        'aes-256-gcm'
      )
    );
  }
  return E.right(undefined);
};

/**
 * Generate a random IV for encryption
 */
const generateIV = (algorithm: EncryptionAlgorithm): IV => {
  const length = algorithm === 'aes-256-gcm' ? GCM_IV_LENGTH : CBC_IV_LENGTH;
  return IVCtor.of(crypto.randomBytes(length));
};

/**
 * Serialize encrypted data to JSON string
 */
const serializeEnvelope = (envelope: EncryptedEnvelope): string => {
  return JSON.stringify(envelope);
};

/**
 * Deserialize encrypted data from JSON string
 */
const deserializeEnvelope = (
  data: string
): E.Either<EncryptionError, EncryptedEnvelope> => {
  try {
    const parsed = JSON.parse(data) as EncryptedEnvelope;
    if (!parsed.algorithm || !parsed.iv || !parsed.data) {
      return E.left(
        mkEncryptionError(
          new Error('Invalid encrypted data format'),
          'aes-256-gcm'
        )
      );
    }
    return E.right(parsed);
  } catch (error) {
    return E.left(
      mkEncryptionError(error as Error, 'aes-256-gcm')
    );
  }
};

// ============================================================================
// AES-256-GCM (Authenticated Encryption)
// ============================================================================

/**
 * Encrypt data using AES-256-GCM
 */
const encryptGCM =
  (key: EncryptionKey, iv?: IV) =>
  (data: DecryptedData): TE.TaskEither<EncryptionError, EncryptedData> =>
    pipe(
      TE.fromEither(validateKeyLength(key)),
      TE.map(() => {
        const actualIV = iv || generateIV('aes-256-gcm');
        const cipher = crypto.createCipheriv(
          'aes-256-gcm',
          Buffer.from(key as string, 'utf8'),
          IVCtor.unwrap(actualIV)
        );

        const encrypted = Buffer.concat([
          cipher.update(data as string, 'utf8'),
          cipher.final(),
        ]);

        const tag = AuthTagCtor.of(cipher.getAuthTag());

        const envelope: EncryptedEnvelope = {
          algorithm: 'aes-256-gcm',
          iv: IVCtor.unwrap(actualIV).toString('base64'),
          data: encrypted.toString('base64'),
          tag: AuthTagCtor.unwrap(tag).toString('base64'),
        };

        return EncryptedDataCtor.of(serializeEnvelope(envelope));
      }),
      TE.mapLeft((error) =>
        error._tag === 'EncryptionError'
          ? error
          : mkEncryptionError(error as Error, 'aes-256-gcm')
      )
    );

/**
 * Decrypt data using AES-256-GCM
 */
const decryptGCM =
  (key: EncryptionKey) =>
  (encrypted: EncryptedData): TE.TaskEither<EncryptionError, DecryptedData> =>
    pipe(
      TE.fromEither(validateKeyLength(key)),
      TE.chainW(() =>
        TE.fromEither(deserializeEnvelope(encrypted as string))
      ),
      TE.chainW((envelope) =>
        TE.tryCatch(
          () => {
            if (!envelope.tag) {
              throw new Error('Missing authentication tag for GCM mode');
            }

            const decipher = crypto.createDecipheriv(
              'aes-256-gcm',
              Buffer.from(key as string, 'utf8'),
              Buffer.from(envelope.iv, 'base64')
            );

            decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));

            const decrypted = Buffer.concat([
              decipher.update(Buffer.from(envelope.data, 'base64')),
              decipher.final(),
            ]);

            return DecryptedDataCtor.of(decrypted.toString('utf8'));
          },
          (error) => mkEncryptionError(error as Error, 'aes-256-gcm')
        )
      )
    );

// ============================================================================
// AES-256-CBC
// ============================================================================

/**
 * Encrypt data using AES-256-CBC
 */
const encryptCBC =
  (key: EncryptionKey, iv?: IV) =>
  (data: DecryptedData): TE.TaskEither<EncryptionError, EncryptedData> =>
    pipe(
      TE.fromEither(validateKeyLength(key)),
      TE.map(() => {
        const actualIV = iv || generateIV('aes-256-cbc');
        const cipher = crypto.createCipheriv(
          'aes-256-cbc',
          Buffer.from(key as string, 'utf8'),
          IVCtor.unwrap(actualIV)
        );

        const encrypted = Buffer.concat([
          cipher.update(data as string, 'utf8'),
          cipher.final(),
        ]);

        const envelope: EncryptedEnvelope = {
          algorithm: 'aes-256-cbc',
          iv: IVCtor.unwrap(actualIV).toString('base64'),
          data: encrypted.toString('base64'),
        };

        return EncryptedDataCtor.of(serializeEnvelope(envelope));
      }),
      TE.mapLeft((error) =>
        error._tag === 'EncryptionError'
          ? error
          : mkEncryptionError(error as Error, 'aes-256-cbc')
      )
    );

/**
 * Decrypt data using AES-256-CBC
 */
const decryptCBC =
  (key: EncryptionKey) =>
  (encrypted: EncryptedData): TE.TaskEither<EncryptionError, DecryptedData> =>
    pipe(
      TE.fromEither(validateKeyLength(key)),
      TE.chainW(() =>
        TE.fromEither(deserializeEnvelope(encrypted as string))
      ),
      TE.chainW((envelope) =>
        TE.tryCatch(
          () => {
            const decipher = crypto.createDecipheriv(
              'aes-256-cbc',
              Buffer.from(key as string, 'utf8'),
              Buffer.from(envelope.iv, 'base64')
            );

            const decrypted = Buffer.concat([
              decipher.update(Buffer.from(envelope.data, 'base64')),
              decipher.final(),
            ]);

            return DecryptedDataCtor.of(decrypted.toString('utf8'));
          },
          (error) => mkEncryptionError(error as Error, 'aes-256-cbc')
        )
      )
    );

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Encrypt data using AES-256-GCM (recommended)
 *
 * Automatically generates a random IV and includes authentication tag.
 *
 * @example
 * ```typescript
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const data = DecryptedData.of('secret message');
 *
 * const result = await encrypt(key)(data)();
 * ```
 */
export const encrypt =
  (key: EncryptionKey) =>
  (data: DecryptedData): TE.TaskEither<EncryptionError, EncryptedData> =>
    encryptGCM(key)(data);

/**
 * Decrypt data
 *
 * Automatically detects the algorithm from the encrypted data envelope.
 *
 * @example
 * ```typescript
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const encrypted = EncryptedData.of('...');
 *
 * const result = await decrypt(key)(encrypted)();
 * ```
 */
export const decrypt =
  (key: EncryptionKey) =>
  (encrypted: EncryptedData): TE.TaskEither<EncryptionError, DecryptedData> =>
    pipe(
      TE.fromEither(deserializeEnvelope(encrypted as string)),
      TE.chainW((envelope) => {
        return envelope.algorithm === 'aes-256-gcm'
          ? decryptGCM(key)(encrypted)
          : decryptCBC(key)(encrypted);
      })
    );

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Encrypt data with custom configuration
 *
 * @example
 * ```typescript
 * const config: EncryptionConfig = {
 *   algorithm: 'aes-256-cbc',
 *   key: EncryptionKey.of('my-32-byte-secret-key-here!!!')
 * };
 *
 * const data = DecryptedData.of('secret message');
 * const result = await encryptWith(config)(data)();
 * ```
 */
export const encryptWith =
  (config: EncryptionConfig) =>
  (data: DecryptedData): TE.TaskEither<EncryptionError, EncryptedData> => {
    return config.algorithm === 'aes-256-gcm'
      ? encryptGCM(config.key, config.iv)(data)
      : encryptCBC(config.key, config.iv)(data);
  };

/**
 * Decrypt data with explicit algorithm
 *
 * @example
 * ```typescript
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const encrypted = EncryptedData.of('...');
 *
 * const result = await decryptWith('aes-256-gcm')(key)(encrypted)();
 * ```
 */
export const decryptWith =
  (algorithm: EncryptionAlgorithm) =>
  (key: EncryptionKey) =>
  (encrypted: EncryptedData): TE.TaskEither<EncryptionError, DecryptedData> => {
    return algorithm === 'aes-256-gcm'
      ? decryptGCM(key)(encrypted)
      : decryptCBC(key)(encrypted);
  };

// ============================================================================
// L3: Advanced API - Fine-grained control and composition
// ============================================================================

/**
 * Create a custom encryptor with specific configuration
 *
 * @example
 * ```typescript
 * const encryptor = createEncryptor({
 *   algorithm: 'aes-256-gcm',
 *   key: EncryptionKey.of('my-32-byte-secret-key-here!!!')
 * });
 *
 * const messages = [
 *   DecryptedData.of('message 1'),
 *   DecryptedData.of('message 2')
 * ];
 *
 * const encrypted = await Promise.all(messages.map(encryptor));
 * ```
 */
export const createEncryptor = (config: EncryptionConfig) => {
  const encryptor = encryptWith(config);
  return (data: DecryptedData) => encryptor(data)();
};

/**
 * Create a custom decryptor with specific configuration
 *
 * @example
 * ```typescript
 * const decryptor = createDecryptor(
 *   EncryptionKey.of('my-32-byte-secret-key-here!!!')
 * );
 *
 * const decrypted = await decryptor(encrypted);
 * ```
 */
export const createDecryptor = (key: EncryptionKey) => {
  const decryptor = decrypt(key);
  return (encrypted: EncryptedData) => decryptor(encrypted)();
};

/**
 * Encrypt multiple data items with the same key
 *
 * @example
 * ```typescript
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const items = [
 *   DecryptedData.of('item 1'),
 *   DecryptedData.of('item 2')
 * ];
 *
 * const result = await encryptMany(key)(items)();
 * ```
 */
export const encryptMany =
  (key: EncryptionKey) =>
  (
    items: ReadonlyArray<DecryptedData>
  ): TE.TaskEither<EncryptionError, ReadonlyArray<EncryptedData>> =>
    pipe(
      items,
      TE.traverseArray((item) => encrypt(key)(item))
    );

/**
 * Decrypt multiple data items with the same key
 *
 * @example
 * ```typescript
 * const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
 * const encrypted = [...]; // array of EncryptedData
 *
 * const result = await decryptMany(key)(encrypted)();
 * ```
 */
export const decryptMany =
  (key: EncryptionKey) =>
  (
    items: ReadonlyArray<EncryptedData>
  ): TE.TaskEither<EncryptionError, ReadonlyArray<DecryptedData>> =>
    pipe(
      items,
      TE.traverseArray((item) => decrypt(key)(item))
    );

/**
 * Generate a random encryption key
 *
 * @example
 * ```typescript
 * const key = generateKey();
 * // Use this key for encryption operations
 * ```
 */
export const generateKey = (): EncryptionKey => {
  const randomBytes = crypto.randomBytes(AES_256_KEY_LENGTH);
  return EncryptionKey.of(randomBytes.toString('base64').slice(0, AES_256_KEY_LENGTH));
};

/**
 * Utilities for working with encryption configurations
 */
export const EncryptionConfig = {
  /**
   * Create AES-256-GCM configuration (recommended)
   */
  gcm: (key: EncryptionKey, iv?: IV): EncryptionConfig => ({
    algorithm: 'aes-256-gcm',
    key,
    iv,
  }),

  /**
   * Create AES-256-CBC configuration
   */
  cbc: (key: EncryptionKey, iv?: IV): EncryptionConfig => ({
    algorithm: 'aes-256-cbc',
    key,
    iv,
  }),
};

/**
 * Key management utilities
 */
export const KeyUtils = {
  /**
   * Validate that a string can be used as an encryption key
   */
  validate: (key: string): E.Either<EncryptionError, EncryptionKey> => {
    const keyBuffer = Buffer.from(key, 'utf8');
    if (keyBuffer.length !== AES_256_KEY_LENGTH) {
      return E.left(
        mkEncryptionError(
          new Error(
            `Key must be exactly ${AES_256_KEY_LENGTH} bytes. Got ${keyBuffer.length} bytes.`
          ),
          'aes-256-gcm'
        )
      );
    }
    return E.right(EncryptionKey.of(key));
  },

  /**
   * Generate a new random encryption key
   */
  generate: generateKey,

  /**
   * Convert a key to base64 for storage
   */
  toBase64: (key: EncryptionKey): string => {
    return Buffer.from(key as string, 'utf8').toString('base64');
  },

  /**
   * Create a key from base64 string
   */
  fromBase64: (base64: string): E.Either<EncryptionError, EncryptionKey> => {
    try {
      const key = Buffer.from(base64, 'base64').toString('utf8');
      return KeyUtils.validate(key);
    } catch (error) {
      return E.left(
        mkEncryptionError(error as Error, 'aes-256-gcm')
      );
    }
  },
};

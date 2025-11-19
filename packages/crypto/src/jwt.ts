/**
 * @module jwt
 * @description JSON Web Token (JWT) operations with type safety
 *
 * Provides type-safe JWT signing, verification, and decoding with TaskEither.
 * Uses jsonwebtoken library for production-grade JWT handling.
 *
 * Security Best Practices:
 * - Use strong secrets (at least 256 bits for HS256)
 * - Set appropriate expiration times (expiresIn)
 * - Verify tokens before trusting their contents
 * - Use RS256 or ES256 for public/private key scenarios
 * - Never store sensitive data in JWT payload (it's not encrypted)
 * - Validate all claims (iss, aud, sub, exp, etc.)
 *
 * @example
 * ```typescript
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 * import * as JWT from '@djed/crypto/jwt';
 *
 * // L1: Simple sign and verify
 * const secret = JWTSecret.of('my-secret-key');
 * const payload = { userId: '123', role: 'admin' };
 *
 * const program = pipe(
 *   JWT.sign(secret)(payload),
 *   TE.chain(token => JWT.verify(secret)(token))
 * );
 * ```
 */

import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import type {
  JWT,
  JWTSecret,
  JWTPayload,
  JWTSignConfig,
  JWTVerifyConfig,
  JWTError,
} from './types';
import { JWT as JWTCtor } from './types';

/**
 * Lazy loading for optional jsonwebtoken dependency
 */
let jwtModule: typeof import('jsonwebtoken') | null = null;

const getJWT = (): E.Either<JWTError, typeof import('jsonwebtoken')> => {
  if (jwtModule) return E.right(jwtModule);

  try {
    jwtModule = require('jsonwebtoken');
    return E.right(jwtModule);
  } catch (error) {
    return E.left({
      _tag: 'JWTError',
      error: new Error(
        'jsonwebtoken is not installed. Install it with: npm install jsonwebtoken'
      ),
      reason: 'sign',
    });
  }
};

/**
 * Internal error constructors
 */
const mkJWTError = (error: Error, reason: JWTError['reason']): JWTError => ({
  _tag: 'JWTError',
  error,
  reason,
});

/**
 * Check if error is a TokenExpiredError
 */
const isExpiredError = (error: Error): boolean => {
  return error.name === 'TokenExpiredError';
};

/**
 * Check if error is a JsonWebTokenError
 */
const isInvalidError = (error: Error): boolean => {
  return error.name === 'JsonWebTokenError';
};

/**
 * Categorize JWT errors
 */
const categorizeError = (error: Error, defaultReason: JWTError['reason']): JWTError => {
  if (isExpiredError(error)) {
    return mkJWTError(error, 'expired');
  }
  if (isInvalidError(error)) {
    return mkJWTError(error, 'invalid');
  }
  return mkJWTError(error, defaultReason);
};

// ============================================================================
// L1: Simple API - High-level functions with sensible defaults
// ============================================================================

/**
 * Sign a JWT with default settings (HS256, 1 hour expiration)
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const payload = { userId: '123', role: 'admin' };
 *
 * const result = await sign(secret)(payload)();
 * // result: E.Either<JWTError, JWT>
 * ```
 */
export const sign =
  (secret: JWTSecret) =>
  (payload: JWTPayload): TE.TaskEither<JWTError, JWT> =>
    pipe(
      TE.fromEither(getJWT()),
      TE.chainW((jwt) =>
        TE.tryCatch(
          () => {
            const token = jwt.sign(payload, secret as string, {
              algorithm: 'HS256',
              expiresIn: '1h',
            });
            return JWTCtor.of(token);
          },
          (error) => categorizeError(error as Error, 'sign')
        )
      )
    );

/**
 * Verify a JWT and return its payload
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const token = JWT.of('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 *
 * const result = await verify(secret)(token)();
 * // result: E.Either<JWTError, JWTPayload>
 * ```
 */
export const verify =
  (secret: JWTSecret) =>
  (token: JWT): TE.TaskEither<JWTError, JWTPayload> =>
    pipe(
      TE.fromEither(getJWT()),
      TE.chainW((jwt) =>
        TE.tryCatch(
          () => {
            const decoded = jwt.verify(token as string, secret as string);
            return decoded as JWTPayload;
          },
          (error) => categorizeError(error as Error, 'verify')
        )
      )
    );

/**
 * Decode a JWT without verification (unsafe - for inspection only)
 *
 * Warning: This does NOT verify the signature. Only use for debugging
 * or when you need to inspect a token before verification.
 *
 * @example
 * ```typescript
 * const token = JWT.of('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 *
 * const result = decode(token);
 * // result: O.Option<JWTPayload>
 * ```
 */
export const decode = (token: JWT): O.Option<JWTPayload> => {
  return pipe(
    getJWT(),
    E.chain((jwt) => {
      try {
        const decoded = jwt.decode(token as string);
        if (decoded && typeof decoded === 'object') {
          return E.right(decoded as JWTPayload);
        }
        return E.left(new Error('Invalid token'));
      } catch (error) {
        return E.left(error as Error);
      }
    }),
    O.fromEither
  );
};

// ============================================================================
// L2: Configured API - Functions with explicit configuration
// ============================================================================

/**
 * Sign a JWT with custom configuration
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const config: JWTSignConfig = {
 *   algorithm: 'HS512',
 *   expiresIn: '7d',
 *   issuer: 'my-app',
 *   audience: 'my-api'
 * };
 *
 * const payload = { userId: '123' };
 * const result = await signWith(config)(secret)(payload)();
 * ```
 */
export const signWith =
  (config: JWTSignConfig) =>
  (secret: JWTSecret) =>
  (payload: JWTPayload): TE.TaskEither<JWTError, JWT> =>
    pipe(
      TE.fromEither(getJWT()),
      TE.chainW((jwt) =>
        TE.tryCatch(
          () => {
            const token = jwt.sign(payload, secret as string, {
              algorithm: config.algorithm || 'HS256',
              expiresIn: config.expiresIn,
              notBefore: config.notBefore,
              audience: config.audience,
              issuer: config.issuer,
              subject: config.subject,
            });
            return JWTCtor.of(token);
          },
          (error) => categorizeError(error as Error, 'sign')
        )
      )
    );

/**
 * Verify a JWT with custom configuration
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const config: JWTVerifyConfig = {
 *   algorithms: ['HS256', 'HS512'],
 *   issuer: 'my-app',
 *   audience: 'my-api',
 *   maxAge: '7d'
 * };
 *
 * const token = JWT.of('...');
 * const result = await verifyWith(config)(secret)(token)();
 * ```
 */
export const verifyWith =
  (config: JWTVerifyConfig) =>
  (secret: JWTSecret) =>
  (token: JWT): TE.TaskEither<JWTError, JWTPayload> =>
    pipe(
      TE.fromEither(getJWT()),
      TE.chainW((jwt) =>
        TE.tryCatch(
          () => {
            const decoded = jwt.verify(token as string, secret as string, {
              algorithms: config.algorithms || ['HS256'],
              audience: config.audience,
              issuer: config.issuer,
              subject: config.subject,
              clockTolerance: config.clockTolerance,
              maxAge: config.maxAge,
            });
            return decoded as JWTPayload;
          },
          (error) => categorizeError(error as Error, 'verify')
        )
      )
    );

// ============================================================================
// L3: Advanced API - Fine-grained control and composition
// ============================================================================

/**
 * Create a custom JWT signer with specific configuration
 *
 * @example
 * ```typescript
 * const signer = createSigner(
 *   JWTSecret.of('my-secret-key'),
 *   {
 *     algorithm: 'HS256',
 *     expiresIn: '1h',
 *     issuer: 'my-app'
 *   }
 * );
 *
 * const tokens = await Promise.all([
 *   signer({ userId: '1' }),
 *   signer({ userId: '2' })
 * ]);
 * ```
 */
export const createSigner = (secret: JWTSecret, config?: JWTSignConfig) => {
  const signer = config ? signWith(config)(secret) : sign(secret);
  return (payload: JWTPayload) => signer(payload)();
};

/**
 * Create a custom JWT verifier with specific configuration
 *
 * @example
 * ```typescript
 * const verifier = createVerifier(
 *   JWTSecret.of('my-secret-key'),
 *   {
 *     algorithms: ['HS256'],
 *     issuer: 'my-app'
 *   }
 * );
 *
 * const payload = await verifier(token);
 * ```
 */
export const createVerifier = (secret: JWTSecret, config?: JWTVerifyConfig) => {
  const verifier = config ? verifyWith(config)(secret) : verify(secret);
  return (token: JWT) => verifier(token)();
};

/**
 * Sign multiple payloads with the same configuration
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const payloads = [
 *   { userId: '1' },
 *   { userId: '2' }
 * ];
 *
 * const result = await signMany(secret)(payloads)();
 * ```
 */
export const signMany =
  (secret: JWTSecret) =>
  (
    payloads: ReadonlyArray<JWTPayload>
  ): TE.TaskEither<JWTError, ReadonlyArray<JWT>> =>
    pipe(
      payloads,
      TE.traverseArray((payload) => sign(secret)(payload))
    );

/**
 * Verify multiple tokens with the same configuration
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const tokens = [JWT.of('...'), JWT.of('...')];
 *
 * const result = await verifyMany(secret)(tokens)();
 * ```
 */
export const verifyMany =
  (secret: JWTSecret) =>
  (
    tokens: ReadonlyArray<JWT>
  ): TE.TaskEither<JWTError, ReadonlyArray<JWTPayload>> =>
    pipe(
      tokens,
      TE.traverseArray((token) => verify(secret)(token))
    );

/**
 * Refresh a token by decoding, verifying, and re-signing with new expiration
 *
 * @example
 * ```typescript
 * const secret = JWTSecret.of('my-secret-key');
 * const token = JWT.of('...');
 *
 * const result = await refresh(secret)(token)();
 * ```
 */
export const refresh =
  (secret: JWTSecret) =>
  (token: JWT): TE.TaskEither<JWTError, JWT> =>
    pipe(
      verify(secret)(token),
      TE.chain((payload) => {
        // Remove JWT standard claims that will be regenerated
        const { iat, exp, nbf, ...userPayload } = payload;
        return sign(secret)(userPayload);
      })
    );

/**
 * Check if a token is expired without full verification
 *
 * @example
 * ```typescript
 * const token = JWT.of('...');
 * const expired = isExpired(token); // true or false
 * ```
 */
export const isExpired = (token: JWT): boolean => {
  return pipe(
    decode(token),
    O.chain((payload) => {
      const exp = payload.exp;
      if (typeof exp === 'number') {
        return O.some(exp * 1000 < Date.now());
      }
      return O.none;
    }),
    O.getOrElse(() => false)
  );
};

/**
 * Get the expiration time from a token
 *
 * @example
 * ```typescript
 * const token = JWT.of('...');
 * const exp = getExpiration(token);
 * // exp: O.Option<Date>
 * ```
 */
export const getExpiration = (token: JWT): O.Option<Date> => {
  return pipe(
    decode(token),
    O.chain((payload) => {
      const exp = payload.exp;
      if (typeof exp === 'number') {
        return O.some(new Date(exp * 1000));
      }
      return O.none;
    })
  );
};

/**
 * Get the issued-at time from a token
 *
 * @example
 * ```typescript
 * const token = JWT.of('...');
 * const iat = getIssuedAt(token);
 * // iat: O.Option<Date>
 * ```
 */
export const getIssuedAt = (token: JWT): O.Option<Date> => {
  return pipe(
    decode(token),
    O.chain((payload) => {
      const iat = payload.iat;
      if (typeof iat === 'number') {
        return O.some(new Date(iat * 1000));
      }
      return O.none;
    })
  );
};

/**
 * Extract a specific claim from a token payload
 *
 * @example
 * ```typescript
 * const token = JWT.of('...');
 * const userId = getClaim('userId')(token);
 * // userId: O.Option<unknown>
 * ```
 */
export const getClaim =
  (claim: string) =>
  (token: JWT): O.Option<unknown> => {
    return pipe(
      decode(token),
      O.chain((payload) => {
        const value = payload[claim];
        return value !== undefined ? O.some(value) : O.none;
      })
    );
  };

/**
 * Utilities for working with JWT configurations
 */
export const JWTConfig = {
  /**
   * Default HMAC SHA-256 configuration
   */
  hs256: (expiresIn: string | number = '1h'): JWTSignConfig => ({
    algorithm: 'HS256',
    expiresIn,
  }),

  /**
   * HMAC SHA-512 configuration (more secure)
   */
  hs512: (expiresIn: string | number = '1h'): JWTSignConfig => ({
    algorithm: 'HS512',
    expiresIn,
  }),

  /**
   * Create a config with issuer, audience, and subject
   */
  withClaims: (
    config: JWTSignConfig,
    claims: {
      issuer?: string;
      audience?: string | string[];
      subject?: string;
    }
  ): JWTSignConfig => ({
    ...config,
    ...claims,
  }),
};

/**
 * JWT validation utilities
 */
export const JWTValidation = {
  /**
   * Verify configuration for strict validation
   */
  strict: (
    issuer: string,
    audience: string | string[]
  ): JWTVerifyConfig => ({
    algorithms: ['HS256', 'HS384', 'HS512'],
    issuer: [issuer],
    audience,
    clockTolerance: 0,
  }),

  /**
   * Verify configuration with clock tolerance
   */
  withTolerance: (
    config: JWTVerifyConfig,
    seconds: number
  ): JWTVerifyConfig => ({
    ...config,
    clockTolerance: seconds,
  }),
};

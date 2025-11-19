# @djed/crypto

Type-safe cryptography operations with fp-ts for the Djed Framework.

## Overview

`@djed/crypto` provides production-ready cryptographic operations with:

- **Type Safety**: Branded types prevent mixing plain and hashed passwords, encrypted and decrypted data
- **Functional Programming**: TaskEither for async operations, Either for validation
- **Progressive API**: Three levels (L1, L2, L3) from simple to advanced
- **Security First**: Built on Node.js crypto module with industry best practices
- **Zero-cost Abstractions**: Branded types have no runtime overhead

## Installation

```bash
npm install @djed/crypto fp-ts
```

### Optional Dependencies

For specific features, install these optional dependencies:

```bash
# Password hashing
npm install bcrypt argon2

# JWT operations
npm install jsonwebtoken
```

## Quick Start

```typescript
import * as Crypto from '@djed/crypto';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// Hash a password
const password = Crypto.PlainPassword.of('mySecret123');
const hashed = await Crypto.Hash.hash(password)();

// Encrypt data
const key = Crypto.EncryptionKey.of('my-32-byte-secret-key-here!!!');
const data = Crypto.DecryptedData.of('secret message');
const encrypted = await Crypto.Encrypt.encrypt(key)(data)();

// Sign JWT
const secret = Crypto.JWTSecret.of('jwt-secret');
const token = await Crypto.JWT.sign(secret)({ userId: '123' })();

// Generate random token
const randomToken = Crypto.Random.token(32);

// Constant-time comparison
const isValid = Crypto.Compare.equal(token1, token2);
```

## Modules

### Hash - Password Hashing

Secure password hashing with bcrypt and argon2.

#### L1: Simple API

```typescript
import * as Hash from '@djed/crypto/hash';
import { PlainPassword } from '@djed/crypto';

const password = PlainPassword.of('mySecret123');

// Hash with defaults (argon2id)
const hashed = await Hash.hash(password)();

// Verify password
const isValid = await Hash.verify(password)(hashed)();
```

#### L2: Configured API

```typescript
// Use bcrypt
const bcryptConfig = Hash.HashConfig.bcrypt(12);
const hashed = await Hash.hashWith(bcryptConfig)(password)();

// Use argon2id with custom parameters
const argon2Config = Hash.HashConfig.argon2id(3, 65536, 4);
const hashed = await Hash.hashWith(argon2Config)(password)();
```

#### L3: Advanced API

```typescript
// Create reusable hasher
const hasher = Hash.createHasher(Hash.HashConfig.argon2id());
const hashed1 = await hasher(password1);
const hashed2 = await hasher(password2);

// Check if rehashing needed
if (Hash.needsRehashing(oldHash, 14)) {
  const { rehashed, hash } = await Hash.rehashIfNeeded(14)(password)(oldHash)();
}
```

### Encrypt - Encryption/Decryption

AES-256 encryption with GCM (authenticated) and CBC modes.

#### L1: Simple API

```typescript
import * as Encrypt from '@djed/crypto/encrypt';
import { EncryptionKey, DecryptedData } from '@djed/crypto';

const key = EncryptionKey.of('my-32-byte-secret-key-here!!!');
const data = DecryptedData.of('secret message');

// Encrypt (uses AES-256-GCM by default)
const encrypted = await Encrypt.encrypt(key)(data)();

// Decrypt
const decrypted = await Encrypt.decrypt(key)(encrypted)();
```

#### L2: Configured API

```typescript
// Use AES-256-CBC
const config = Encrypt.EncryptionConfig.cbc(key);
const encrypted = await Encrypt.encryptWith(config)(data)();

// Specify algorithm
const decrypted = await Encrypt.decryptWith('aes-256-gcm')(key)(encrypted)();
```

#### L3: Advanced API

```typescript
// Create reusable encryptor
const encryptor = Encrypt.createEncryptor(config);
const encrypted1 = await encryptor(data1);
const encrypted2 = await encryptor(data2);

// Encrypt multiple items
const items = [data1, data2, data3];
const encryptedItems = await Encrypt.encryptMany(key)(items)();

// Generate encryption key
const newKey = Encrypt.generateKey();
```

### JWT - JSON Web Tokens

Type-safe JWT signing, verification, and decoding.

#### L1: Simple API

```typescript
import * as JWT from '@djed/crypto/jwt';
import { JWTSecret } from '@djed/crypto';

const secret = JWTSecret.of('my-secret-key');
const payload = { userId: '123', role: 'admin' };

// Sign (HS256, 1 hour expiration)
const token = await JWT.sign(secret)(payload)();

// Verify
const verified = await JWT.verify(secret)(token)();

// Decode without verification (for inspection only)
const decoded = JWT.decode(token);
```

#### L2: Configured API

```typescript
// Sign with custom config
const signConfig = {
  algorithm: 'HS512' as const,
  expiresIn: '7d',
  issuer: 'my-app',
  audience: 'my-api',
};
const token = await JWT.signWith(signConfig)(secret)(payload)();

// Verify with custom config
const verifyConfig = {
  algorithms: ['HS256', 'HS512'] as const,
  issuer: 'my-app',
  audience: 'my-api',
};
const verified = await JWT.verifyWith(verifyConfig)(secret)(token)();
```

#### L3: Advanced API

```typescript
// Create reusable signer
const signer = JWT.createSigner(secret, signConfig);
const token1 = await signer(payload1);
const token2 = await signer(payload2);

// Refresh token
const newToken = await JWT.refresh(secret)(oldToken)();

// Check expiration
const expired = JWT.isExpired(token);
const expiration = JWT.getExpiration(token);

// Extract claims
const userId = JWT.getClaim('userId')(token);
```

### Random - Secure Random Generation

Cryptographically secure random values using Node.js crypto.

#### L1: Simple API

```typescript
import * as Random from '@djed/crypto/random';

// Random bytes
const bytes = Random.bytes(32);

// Random string (hex)
const str = Random.string(16);

// UUID
const id = Random.uuid();

// Random integer
const dice = Random.int(1, 6);

// URL-safe token
const token = Random.token(32);

// Salt for key derivation
const salt = Random.salt();
```

#### L2: Configured API

```typescript
// String with encoding
const hexToken = Random.stringWith(32, 'hex');
const b64Token = Random.stringWith(32, 'base64');
const urlToken = Random.stringWith(32, 'base64url');

// Multiple values
const tokens = Random.stringMany(10, 32, 'base64url');
const ids = Random.uuidMany(5);
```

#### L3: Advanced API

```typescript
// Random selection
const selected = Random.choice(['a', 'b', 'c']);

// Shuffle array
const shuffled = Random.shuffle([1, 2, 3, 4, 5]);

// Sample without replacement
const sample = Random.sample(array, 3);

// Custom charset
const pin = Random.fromCharset(4, '0123456789');

// Utilities
const password = Random.RandomUtils.password(16);
const otp = Random.RandomUtils.otp(6);
const apiKey = Random.RandomUtils.apiKey();
```

### Compare - Constant-Time Comparison

Prevent timing attacks with constant-time comparison.

#### L1: Simple API

```typescript
import * as Compare from '@djed/crypto/compare';

// String comparison
const isValid = Compare.equal('secret1', 'secret2');

// Buffer comparison
const match = Compare.buffers(buf1, buf2);

// Hex comparison
const hexMatch = Compare.hex('deadbeef', 'deadbeef');

// Base64 comparison
const b64Match = Compare.base64(token1, token2);
```

#### L2: Configured API

```typescript
// Custom encoding
const compareHex = Compare.withEncoding('hex');
const isMatch = compareHex('abc', 'abc');

// Strict validation
const strictCompare = Compare.withValidation(true);
const result = strictCompare(buf1, buf2);
```

#### L3: Advanced API

```typescript
// Multiple comparisons
const allMatch = Compare.many([
  ['token1', 'token1'],
  ['token2', 'token2'],
]);

// Create validator
const validateApiKey = Compare.validator('my-secret-key');
const isValid = validateApiKey(userKey);

// Timing-safe array operations
const found = Compare.TimingSafe.includes('token', validTokens);
const index = Compare.TimingSafe.indexOf('token', validTokens);
```

### Derive - Key Derivation

Derive cryptographic keys from passwords using PBKDF2 or scrypt.

#### L1: Simple API

```typescript
import * as Derive from '@djed/crypto/derive';

// Derive with scrypt (recommended)
const result = await Derive.scrypt('password')();
const { key, salt } = result.right;

// Derive with PBKDF2
const result2 = await Derive.pbkdf2('password')();
```

#### L2: Configured API

```typescript
// PBKDF2 with custom parameters
const pbkdf2Config = Derive.KeyDerivationConfig.pbkdf2(1000000, 64);
const result = await Derive.pbkdf2With(pbkdf2Config)('password')();

// scrypt with custom parameters
const scryptConfig = Derive.KeyDerivationConfig.scrypt(32768, 64);
const result = await Derive.scryptWith(scryptConfig)('password')();
```

#### L3: Advanced API

```typescript
// Re-derive for password verification
const stored = await Derive.scrypt('password')();
const isValid = await Derive.verifyPassword('user-input')(stored.right)();

// Create reusable deriver
const deriver = Derive.createDeriver(config);
const key1 = await deriver('password1');
const key2 = await deriver('password2');

// Derive multiple
const passwords = ['pass1', 'pass2'];
const keys = await Derive.deriveMany(config)(passwords)();
```

## Branded Types

All cryptographic values use branded types for type safety:

```typescript
// These are compile-time only - no runtime overhead
type PlainPassword = Branded<string, 'PlainPassword'>;
type HashedPassword = Branded<string, 'HashedPassword'>;
type JWT = Branded<string, 'JWT'>;
type EncryptedData = Branded<string, 'EncryptedData'>;
type DecryptedData = Branded<string, 'DecryptedData'>;

// Create values
const plain = PlainPassword.of('secret');
const hashed = HashedPassword.of('$2b$12$...');

// Unwrap values
const str = PlainPassword.unwrap(plain);
```

## Security Best Practices

### Password Hashing

- **Use argon2id** for new applications (winner of Password Hashing Competition)
- **Use bcrypt** for compatibility with existing systems
- **Never log or store plain passwords**
- **Use high cost parameters** appropriate for your security requirements
- **Rehash passwords** when increasing cost parameters

### Encryption

- **Use AES-256-GCM** for authenticated encryption (prevents tampering)
- **Never reuse IVs** with the same key
- **Store IVs alongside ciphertext** (they don't need to be secret)
- **Use random IVs** for each encryption operation
- **Rotate encryption keys** regularly
- **Use key derivation** for password-based encryption

### JWT

- **Use strong secrets** (at least 256 bits for HS256)
- **Set appropriate expiration** times (expiresIn)
- **Verify tokens** before trusting their contents
- **Use RS256 or ES256** for public/private key scenarios
- **Never store sensitive data** in JWT payload (it's not encrypted)
- **Validate all claims** (iss, aud, sub, exp, etc.)

### Random Generation

- **Always use crypto.randomBytes** for security-sensitive values
- **Never use Math.random()** for passwords, tokens, or keys
- **Generate sufficient entropy** (at least 16 bytes for tokens)
- **Use URL-safe base64** for tokens in URLs

### Constant-Time Comparison

- **Always use constant-time comparison** for security-sensitive values
- **Never use === or ==** for comparing secrets, tokens, or hashes
- **Timing attacks can leak information** through variable execution time
- **Use these functions** whenever comparing user input to stored secrets

### Key Derivation

- **Use scrypt** for new applications (more resistant to hardware attacks)
- **Use PBKDF2** for compatibility with existing systems
- **Always use a unique random salt** per key
- **Store the salt** alongside the derived key
- **Use high iteration/cost parameters** appropriate for your security needs
- **Derived keys should have sufficient length** (32 bytes for AES-256)

## Progressive API Design

The package follows a three-level API design:

### L1: Simple API

- Sensible defaults
- Minimal configuration
- Quick to use
- Perfect for common cases

```typescript
const hashed = await Hash.hash(password)();
```

### L2: Configured API

- Explicit configuration
- More control
- Reusable configs
- Good for custom requirements

```typescript
const config = Hash.HashConfig.argon2id(4, 131072, 8);
const hashed = await Hash.hashWith(config)(password)();
```

### L3: Advanced API

- Maximum flexibility
- Composition utilities
- Batch operations
- For complex scenarios

```typescript
const hasher = Hash.createHasher(config);
const hashed = await Promise.all(passwords.map(hasher));
```

## Error Handling

All async operations return `TaskEither<Error, Result>`:

```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';

const result = await pipe(
  Hash.hash(password),
  TE.mapLeft((error) => {
    console.error('Hashing failed:', error.error.message);
    return error;
  })
)();

if (E.isRight(result)) {
  console.log('Success:', result.right);
} else {
  console.error('Error:', result.left);
}
```

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Testing

Run tests with:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

## License

MIT

## Contributing

Contributions are welcome! Please follow the existing patterns and ensure tests pass.

## Security Disclosure

If you discover a security vulnerability, please email security@djed.dev instead of using the issue tracker.

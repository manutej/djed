# @djed/validation

**Composable validation with Applicative Functor for LUXOR projects**

## Features

- ✅ **Applicative Validation** - Accumulates ALL errors, not just the first
- ✅ **Branded Types** - Compile-time type safety (zero runtime cost)
- ✅ **Pure Functions** - 100% pure, composable validators
- ✅ **Category Theory** - Proper Functor/Applicative/Monad instances
- ✅ **Progressive API** - L1 (novice) → L2 (intermediate) → L3 (expert)
- ✅ **Zero Lock-in** - Built on fp-ts, easy to extend/eject

## Quick Start

```bash
npm install @djed/validation fp-ts
```

### L1: Basic Validation

```typescript
import * as V from '@djed/validation';

// Built-in validators with branded types
const emailResult = V.email('user@example.com');
// Right(EmailAddress)

const portResult = V.port(8080);
// Right(Port)

const result = V.nonEmptyString('');
// Left([{ path: [], message: 'String cannot be empty', value: '' }])
```

### L2: Struct Validation (Error Accumulation)

```typescript
import * as V from '@djed/validation';
import { pipe } from 'fp-ts/function';

// Validate objects with multiple fields
const validateUser = V.struct({
  name: V.nonEmptyString,
  email: V.email,
  age: pipe(V.number, V.chain(V.min(18)), V.chain(V.max(120))),
  website: V.optional(V.url),
});

const result = validateUser({
  name: '',
  email: 'bad-email',
  age: 10,
});

// Left([
//   { path: ['name'], message: 'String cannot be empty' },
//   { path: ['email'], message: 'Invalid email address' },
//   { path: ['age'], message: 'Number must be >= 18' }
// ])
// ⬆️ ALL errors collected, not just the first!
```

### L3: Custom Validators & Composition

```typescript
import * as V from '@djed/validation';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

// Custom validator with business logic
const validatePassword: V.Validator<unknown, string> = (value) => {
  return pipe(
    V.string(value),
    V.chain((s) =>
      s.length >= 8
        ? V.success(s)
        : V.failure(V.validationError('Password must be at least 8 characters'))
    ),
    V.chain((s) =>
      /[A-Z]/.test(s)
        ? V.success(s)
        : V.failure(V.validationError('Password must contain uppercase letter'))
    ),
    V.chain((s) =>
      /[0-9]/.test(s)
        ? V.success(s)
        : V.failure(V.validationError('Password must contain a number'))
    )
  );
};

// Use Applicative to collect errors from multiple validators
const validateRegistration = V.struct({
  email: V.email,
  password: validatePassword,
  confirmPassword: V.string,
});

// Cross-field validation
const matchingPasswords = V.refine(
  validateRegistration,
  (data): data is typeof data & { passwordsMatch: true } =>
    data.password === data.confirmPassword,
  'Passwords must match'
);
```

## Category Theory

### Applicative Functor

The key insight: **Applicative allows error accumulation**.

```typescript
// Monad (chain) - stops at first error ❌
const v1 = pipe(
  validator1(value),
  V.chain(() => validator2(value)),  // Never runs if v1 fails
  V.chain(() => validator3(value))   // Never runs if v1 or v2 fail
);

// Applicative (ap) - collects ALL errors ✅
const v2 = pipe(
  V.success((a) => (b) => (c) => combine(a, b, c)),
  V.ap(validator1(value)),  // Runs even if others fail
  V.ap(validator2(value)),  // Runs even if others fail
  V.ap(validator3(value))   // Runs even if others fail
);
// Returns ALL validation errors together!
```

### Laws Verified

All categorical abstractions satisfy their laws:

```typescript
// Functor Laws
V.map(identity) ≡ identity
V.map(f).map(g) ≡ V.map(g ∘ f)

// Applicative Laws
V.ap(V.success(id)) ≡ id
V.success(f).ap(V.success(x)) ≡ V.success(f(x))

// Monad Laws
V.success(a).chain(f) ≡ f(a)
m.chain(V.success) ≡ m
```

## API Reference

### Built-in Validators

```typescript
// Primitive types
V.string(value)      // Validator<unknown, string>
V.number(value)      // Validator<unknown, number>
V.boolean(value)     // Validator<unknown, boolean>
V.date(value)        // Validator<unknown, Date>

// Branded string types (compile-time safety)
V.nonEmptyString(value)  // Validator<unknown, NonEmptyString>
V.email(value)           // Validator<unknown, EmailAddress>
V.url(value)             // Validator<unknown, URL>
V.uuid(value)            // Validator<unknown, UUID>
V.isoDate(value)         // Validator<unknown, ISODate>

// Branded number types
V.positiveNumber(value)     // Validator<unknown, PositiveNumber>
V.nonNegativeNumber(value)  // Validator<unknown, NonNegativeNumber>
V.integerNumber(value)      // Validator<unknown, IntegerNumber>
V.port(value)               // Validator<unknown, Port>

// Constraints
V.minLength(10)    // String length >= 10
V.maxLength(100)   // String length <= 100
V.min(0)           // Number >= 0
V.max(100)         // Number <= 100
V.pattern(/regex/) // String matches regex

// Composite types
V.struct({ ... })     // Object validation (Applicative!)
V.array(validator)    // Array of validated elements
V.tuple(v1, v2, v3)   // Fixed-length tuple
V.record(validator)   // Record<string, T>
V.union(v1, v2)       // A | B (tries all)
V.intersection(v1, v2) // A & B (all must pass)
V.enumValue('a', 'b', 'c') // Literal union

// Modifiers
V.optional(validator)  // T | undefined
V.nullable(validator)  // T | null
```

### Combinators

```typescript
// Functor
V.map(f: (a: A) => B)  // Transform success value

// Applicative
V.ap(fab: Result<(a: A) => B>)  // Apply function in context

// Monad
V.chain(f: (a: A) => Result<B>)  // Dependent validation

// Logic
V.and(v1, v2)  // Both must pass
V.or(v1, v2)   // Either must pass

// Transformation
V.refine(validator, predicate, msg)  // Add constraint
V.transform(validator, f)            // Map after validation

// Traversal
V.sequenceArray(validators)    // Validate array of validators
V.traverseArray(f)(array)      // Map + validate array

// Handling results
V.fold(onError, onSuccess)     // Pattern match
V.getOrElse(defaultValue)      // Get or default
V.getOrThrow()                 // Get or throw (use sparingly!)
```

## Error Handling

```typescript
import * as E from 'fp-ts/Either';

const result = V.email('bad-email');

// Pattern matching
pipe(
  result,
  V.fold(
    (errors) => console.error('Validation failed:', errors),
    (email) => console.log('Valid email:', email)
  )
);

// Using Either directly
if (E.isLeft(result)) {
  const errors = result.left;
  errors.forEach(err => {
    console.log(`${err.path.join('.')}: ${err.message}`);
  });
}

// Get or provide default
const email = pipe(result, V.getOrElse('default@example.com'));

// Get or throw (development only)
try {
  const email = V.getOrThrow(result);
} catch (e) {
  // Contains all validation errors
}
```

## Performance

- **Zero runtime overhead** for branded types
- **Pure functions** - easily memoizable
- **Lazy evaluation** - validators only run when called
- **Tree-shakeable** - only import what you use

## Ejection

Want to move away from @djed/validation? Easy!

```typescript
// Before
import * as V from '@djed/validation';

// After - use fp-ts directly
import * as E from 'fp-ts/Either';

const myValidator = (value: unknown): E.Either<string[], MyType> => {
  // Same logic, just using Either directly
};
```

All validators are just functions returning `Either<ValidationErrors, A>`.

## TypeScript

Requires TypeScript 4.5+ with `strict: true`.

```typescript
import * as V from '@djed/validation';

const validator = V.struct({
  name: V.nonEmptyString,
  age: V.positiveNumber,
});

type User = V.InferSchema<typeof validator>;
// { name: NonEmptyString; age: PositiveNumber }

// Use in functions with branded types
function greet(user: User) {
  // TypeScript knows name is NonEmptyString
  // and age is PositiveNumber
  console.log(`Hello ${user.name}, age ${user.age}`);
}
```

## Part of Djed

**Djed** is LUXOR's FP-first infrastructure suite.

Learn more: [Djed Documentation](../../README.md)

## License

MIT © LUXOR

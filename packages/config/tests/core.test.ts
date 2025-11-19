/**
 * Tests for core configuration functionality
 */

import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import * as Validation from '@djed/validation';
import {
  success,
  failure,
  map,
  chain,
  ap,
  alt,
  fold,
  getOrElse,
  fromEnv,
  fromEnvOptional,
  fromLiteral,
  struct,
  Do,
  bind,
  run,
  mergeConfigs,
  withDefaults,
  validate,
  fromSchema,
} from '../src/core';
import { fromCustomEnv } from '../src/loaders';
import type { ConfigEnv } from '../src/types';
import { configError } from '../src/types';

// Test environment
const testEnv: ConfigEnv = fromCustomEnv({
  HOST: 'localhost',
  PORT: '3000',
  DEBUG: 'true',
  EMPTY: '',
});

describe('ConfigReader - Functor Laws', () => {
  it('identity: map(id) === id', () => {
    const reader = success(42);
    const result1 = run(testEnv)(reader);
    const result2 = run(testEnv)(map((x: number) => x)(reader));

    expect(result1).toEqual(result2);
  });

  it('composition: map(f . g) === map(f) . map(g)', () => {
    const reader = success(10);
    const f = (x: number) => x * 2;
    const g = (x: number) => x + 5;

    const result1 = run(testEnv)(map((x: number) => f(g(x)))(reader));
    const result2 = run(testEnv)(pipe(reader, map(g), map(f)));

    expect(result1).toEqual(result2);
  });
});

describe('ConfigReader - Monad Laws', () => {
  it('left identity: chain(f)(success(a)) === f(a)', () => {
    const a = 42;
    const f = (x: number) => success(x * 2);

    const result1 = run(testEnv)(pipe(success(a), chain(f)));
    const result2 = run(testEnv)(f(a));

    expect(result1).toEqual(result2);
  });

  it('right identity: chain(success)(m) === m', () => {
    const m = success(42);

    const result1 = run(testEnv)(pipe(m, chain(success)));
    const result2 = run(testEnv)(m);

    expect(result1).toEqual(result2);
  });

  it('associativity: chain(g)(chain(f)(m)) === chain(x => chain(g)(f(x)))(m)', () => {
    const m = success(5);
    const f = (x: number) => success(x * 2);
    const g = (x: number) => success(x + 10);

    const result1 = run(testEnv)(pipe(m, chain(f), chain(g)));
    const result2 = run(testEnv)(pipe(m, chain((x) => pipe(f(x), chain(g)))));

    expect(result1).toEqual(result2);
  });
});

describe('ConfigReader - Basic Operations', () => {
  it('success lifts value into ConfigReader', () => {
    const reader = success(42);
    const result = run(testEnv)(reader);

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toBe(42);
    }
  });

  it('failure lifts error into ConfigReader', () => {
    const error = configError('missing', 'Test error');
    const reader = failure(error);
    const result = run(testEnv)(reader);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toEqual(error);
    }
  });

  it('map transforms successful value', () => {
    const reader = pipe(
      success(10),
      map((x) => x * 2)
    );
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(20));
  });

  it('map does not transform error', () => {
    const error = configError('missing', 'Test error');
    const reader = pipe(
      failure(error),
      map((x: number) => x * 2)
    );
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.left(error));
  });

  it('chain sequences dependent computations', () => {
    const reader = pipe(
      success(5),
      chain((x) => success(x * 2)),
      chain((x) => success(x + 10))
    );
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(20));
  });

  it('chain short-circuits on error', () => {
    const error = configError('missing', 'Test error');
    const reader = pipe(
      failure<number>(error),
      chain((x) => success(x * 2))
    );
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.left(error));
  });
});

describe('ConfigReader - Alt Operations', () => {
  it('alt returns first if successful', () => {
    const first = success(42);
    const second = () => success(100);

    const reader = pipe(first, alt(second));
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(42));
  });

  it('alt returns second if first fails', () => {
    const first = failure(configError('missing', 'Error'));
    const second = () => success(100);

    const reader = pipe(first, alt(second));
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(100));
  });
});

describe('ConfigReader - Fold Operations', () => {
  it('fold handles success case', () => {
    const reader = success(42);
    const result = run(testEnv)(
      pipe(
        reader,
        fold(
          () => 'error',
          (x) => `success: ${x}`
        )
      )
    );

    expect(result).toBe('success: 42');
  });

  it('fold handles error case', () => {
    const error = configError('missing', 'Test error');
    const reader = failure(error);
    const result = run(testEnv)(
      pipe(
        reader,
        fold(
          (e) => `error: ${e.message}`,
          (x) => `success: ${x}`
        )
      )
    );

    expect(result).toBe('error: Test error');
  });

  it('getOrElse returns value on success', () => {
    const reader = success(42);
    const result = run(testEnv)(pipe(reader, getOrElse(100)));

    expect(result).toBe(42);
  });

  it('getOrElse returns default on error', () => {
    const reader = failure(configError('missing', 'Error'));
    const result = run(testEnv)(pipe(reader, getOrElse(100)));

    expect(result).toBe(100);
  });
});

describe('Environment Loading', () => {
  it('fromEnv loads existing variable', () => {
    const reader = fromEnv('HOST');
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right('localhost'));
  });

  it('fromEnv fails for missing variable', () => {
    const reader = fromEnv('MISSING');
    const result = run(testEnv)(reader);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe('missing');
    }
  });

  it('fromEnvOptional returns Some for existing variable', () => {
    const reader = fromEnvOptional('PORT');
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(O.some('3000')));
  });

  it('fromEnvOptional returns None for missing variable', () => {
    const reader = fromEnvOptional('MISSING');
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(O.none));
  });

  it('fromLiteral wraps literal value', () => {
    const reader = fromLiteral({ key: 'value' });
    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right({ key: 'value' }));
  });
});

describe('Struct Configuration', () => {
  it('struct combines multiple readers', () => {
    const reader = struct({
      host: fromEnv('HOST'),
      port: fromEnv('PORT'),
      debug: fromEnv('DEBUG'),
    });

    const result = run(testEnv)(reader);

    expect(result).toEqual(
      E.right({
        host: 'localhost',
        port: '3000',
        debug: 'true',
      })
    );
  });

  it('struct fails if any field fails', () => {
    const reader = struct({
      host: fromEnv('HOST'),
      missing: fromEnv('MISSING'),
    });

    const result = run(testEnv)(reader);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe('missing');
      // Path includes struct field name followed by env var name
      expect(result.left.path).toEqual(['missing', 'MISSING']);
    }
  });
});

describe('Do Notation', () => {
  it('Do notation composes readers', () => {
    const reader = pipe(
      Do,
      bind('host', () => fromEnv('HOST')),
      bind('port', () => fromEnv('PORT'))
    );

    const result = run(testEnv)(reader);

    expect(result).toEqual(
      E.right({
        host: 'localhost',
        port: '3000',
      })
    );
  });

  it('Do notation supports dependent values', () => {
    const reader = pipe(
      Do,
      bind('debug', () => fromEnv('DEBUG')),
      bind('mode', ({ debug }) =>
        fromLiteral(debug === 'true' ? 'development' : 'production')
      )
    );

    const result = run(testEnv)(reader);

    expect(result).toEqual(
      E.right({
        debug: 'true',
        mode: 'development',
      })
    );
  });
});

describe('Monoid Operations', () => {
  it('mergeConfigs combines multiple configs', () => {
    const config1 = { a: 1, b: 2 };
    const config2 = { b: 3, c: 4 };
    const config3 = { c: 5, d: 6 };

    const result = mergeConfigs(config1, config2, config3);

    expect(result).toEqual({
      a: 1,
      b: 3,
      c: 5,
      d: 6,
    });
  });

  it('withDefaults applies defaults for missing keys', () => {
    const config = { b: 2 };
    const defaults = { a: 1, b: 100, c: 3 };

    const result = withDefaults(defaults)(config);

    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });
});

describe('Validation Integration', () => {
  it('validate applies validator to reader result', () => {
    const reader = pipe(
      fromEnv('PORT'),
      validate((value: string) => {
        const num = parseInt(value, 10);
        return isNaN(num)
          ? Validation.failure(Validation.validationError('Not a number'))
          : Validation.success(num);
      })
    );

    const result = run(testEnv)(reader);

    expect(result).toEqual(E.right(3000));
  });

  it('validate fails on validation error', () => {
    const reader = pipe(
      fromEnv('HOST'),
      validate((value: string) =>
        value === 'localhost'
          ? Validation.failure(Validation.validationError('Cannot use localhost'))
          : Validation.success(value)
      )
    );

    const result = run(testEnv)(reader);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe('validation');
    }
  });

  it('fromSchema validates with schema', () => {
    const schema = {
      validate: Validation.nonEmptyString,
    };

    const reader = fromSchema(schema, { type: 'env', key: 'HOST' });
    const result = run(testEnv)(reader);

    expect(E.isRight(result)).toBe(true);
  });

  it('fromSchema fails for invalid value', () => {
    const schema = {
      validate: Validation.nonEmptyString,
    };

    const reader = fromSchema(schema, { type: 'env', key: 'EMPTY' });
    const result = run(testEnv)(reader);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe('validation');
    }
  });
});

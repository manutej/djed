/**
 * Tests for configuration loaders
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import {
  fromProcessEnv,
  fromCustomEnv,
  createMemorySecretManager,
  createEnvSecretManager,
  parseEnvInt,
  parseEnvFloat,
  parseEnvBoolean,
  parseEnvJSON,
  parseEnvList,
  detectEnvironment,
  loadDotEnv,
} from '../src/loaders';

describe('Environment Loaders', () => {
  it('fromProcessEnv creates ConfigEnv from process.env', () => {
    process.env.TEST_VAR = 'test-value';

    const env = fromProcessEnv();
    const result = env.getEnvVar('TEST_VAR');

    expect(result).toEqual(O.some('test-value'));

    delete process.env.TEST_VAR;
  });

  it('fromProcessEnv returns None for missing variables', () => {
    const env = fromProcessEnv();
    const result = env.getEnvVar('NONEXISTENT_VAR');

    expect(result).toEqual(O.none);
  });

  it('fromCustomEnv creates ConfigEnv from custom object', () => {
    const customEnv = {
      HOST: 'localhost',
      PORT: '3000',
    };

    const env = fromCustomEnv(customEnv);
    const host = env.getEnvVar('HOST');
    const port = env.getEnvVar('PORT');
    const missing = env.getEnvVar('MISSING');

    expect(host).toEqual(O.some('localhost'));
    expect(port).toEqual(O.some('3000'));
    expect(missing).toEqual(O.none);
  });

  it('ConfigEnv can read files', () => {
    const testFile = '/tmp/test-config.txt';
    writeFileSync(testFile, 'test content');

    const env = fromProcessEnv();
    const result = env.readFile(testFile);

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toBe('test content');
    }

    unlinkSync(testFile);
  });

  it('ConfigEnv returns error for missing files', () => {
    const env = fromProcessEnv();
    const result = env.readFile('/nonexistent/file.txt');

    expect(E.isLeft(result)).toBe(true);
  });
});

describe('Secret Managers', () => {
  it('createMemorySecretManager stores and retrieves secrets', async () => {
    const secretManager = createMemorySecretManager({
      API_KEY: 'secret-key-123',
      DB_PASSWORD: 'super-secret',
    });

    const apiKey = await secretManager.getSecret('API_KEY');
    const dbPassword = await secretManager.getSecret('DB_PASSWORD');
    const missing = await secretManager.getSecret('MISSING');

    expect(apiKey).toEqual(O.some('secret-key-123'));
    expect(dbPassword).toEqual(O.some('super-secret'));
    expect(missing).toEqual(O.none);
  });

  it('createEnvSecretManager reads from environment with prefix', async () => {
    process.env.SECRET_API_KEY = 'env-secret';

    const secretManager = createEnvSecretManager('SECRET_');
    const result = await secretManager.getSecret('API_KEY');

    expect(result).toEqual(O.some('env-secret'));

    delete process.env.SECRET_API_KEY;
  });

  it('createEnvSecretManager uses custom prefix', async () => {
    process.env.CUSTOM_PREFIX_KEY = 'custom-secret';

    const secretManager = createEnvSecretManager('CUSTOM_PREFIX_');
    const result = await secretManager.getSecret('KEY');

    expect(result).toEqual(O.some('custom-secret'));

    delete process.env.CUSTOM_PREFIX_KEY;
  });
});

describe('Environment Variable Parsing', () => {
  it('parseEnvInt parses valid integers', () => {
    expect(parseEnvInt('42')).toEqual(O.some(42));
    expect(parseEnvInt('0')).toEqual(O.some(0));
    expect(parseEnvInt('-100')).toEqual(O.some(-100));
  });

  it('parseEnvInt returns None for invalid integers', () => {
    expect(parseEnvInt('not-a-number')).toEqual(O.none);
    expect(parseEnvInt('3.14')).toEqual(O.some(3)); // parseInt truncates
    expect(parseEnvInt('')).toEqual(O.none);
  });

  it('parseEnvFloat parses valid floats', () => {
    expect(parseEnvFloat('3.14')).toEqual(O.some(3.14));
    expect(parseEnvFloat('42')).toEqual(O.some(42));
    expect(parseEnvFloat('-10.5')).toEqual(O.some(-10.5));
  });

  it('parseEnvFloat returns None for invalid floats', () => {
    expect(parseEnvFloat('not-a-number')).toEqual(O.none);
    expect(parseEnvFloat('')).toEqual(O.none);
  });

  it('parseEnvBoolean parses boolean values', () => {
    expect(parseEnvBoolean('true')).toBe(true);
    expect(parseEnvBoolean('TRUE')).toBe(true);
    expect(parseEnvBoolean('1')).toBe(true);
    expect(parseEnvBoolean('yes')).toBe(true);
    expect(parseEnvBoolean('YES')).toBe(true);

    expect(parseEnvBoolean('false')).toBe(false);
    expect(parseEnvBoolean('FALSE')).toBe(false);
    expect(parseEnvBoolean('0')).toBe(false);
    expect(parseEnvBoolean('no')).toBe(false);
    expect(parseEnvBoolean('')).toBe(false);
  });

  it('parseEnvJSON parses valid JSON', () => {
    expect(parseEnvJSON('{"key":"value"}')).toEqual(O.some({ key: 'value' }));
    expect(parseEnvJSON('[1,2,3]')).toEqual(O.some([1, 2, 3]));
    expect(parseEnvJSON('"string"')).toEqual(O.some('string'));
  });

  it('parseEnvJSON returns None for invalid JSON', () => {
    expect(parseEnvJSON('not-json')).toEqual(O.none);
    expect(parseEnvJSON('{invalid}')).toEqual(O.none);
    expect(parseEnvJSON('')).toEqual(O.none);
  });

  it('parseEnvList parses comma-separated values', () => {
    expect(parseEnvList('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(parseEnvList('one, two, three')).toEqual(['one', 'two', 'three']);
    expect(parseEnvList('single')).toEqual(['single']);
    expect(parseEnvList('')).toEqual([]);
  });

  it('parseEnvList supports custom separators', () => {
    expect(parseEnvList('a:b:c', ':')).toEqual(['a', 'b', 'c']);
    expect(parseEnvList('a|b|c', '|')).toEqual(['a', 'b', 'c']);
  });
});

describe('Environment Detection', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('detectEnvironment returns NODE_ENV value', () => {
    process.env.NODE_ENV = 'production';
    expect(detectEnvironment()).toBe('production');

    process.env.NODE_ENV = 'development';
    expect(detectEnvironment()).toBe('development');
  });

  it('detectEnvironment defaults to development', () => {
    delete process.env.NODE_ENV;
    expect(detectEnvironment()).toBe('development');
  });
});

describe('File-based Secret Manager', () => {
  const secretDir = '/tmp/test-secrets';

  beforeEach(() => {
    try {
      mkdirSync(secretDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  });

  afterEach(() => {
    try {
      // Clean up secret files
      const files = ['api_key', 'db_password'];
      files.forEach(file => {
        try {
          unlinkSync(`${secretDir}/${file}`);
        } catch {
          // File might not exist
        }
      });
      rmdirSync(secretDir);
    } catch {
      // Directory might not be empty or not exist
    }
  });

  it('reads secrets from files', async () => {
    const { createFileSecretManager } = await import('../src/loaders');

    writeFileSync(`${secretDir}/api_key`, 'secret-from-file\n');

    const secretManager = createFileSecretManager(secretDir);
    const result = await secretManager.getSecret('api_key');

    expect(result).toEqual(O.some('secret-from-file'));
  });

  it('returns None for missing secret files', async () => {
    const { createFileSecretManager } = await import('../src/loaders');

    const secretManager = createFileSecretManager(secretDir);
    const result = await secretManager.getSecret('nonexistent');

    expect(result).toEqual(O.none);
  });

  it('trims whitespace from secret files', async () => {
    const { createFileSecretManager } = await import('../src/loaders');

    writeFileSync(`${secretDir}/padded_secret`, '  secret-value  \n');

    const secretManager = createFileSecretManager(secretDir);
    const result = await secretManager.getSecret('padded_secret');

    expect(result).toEqual(O.some('secret-value'));
  });
});

describe('DotEnv Support', () => {
  const envFile = '/tmp/.env.test';

  afterEach(() => {
    try {
      unlinkSync(envFile);
    } catch {
      // File might not exist
    }
  });

  it('loads environment variables from .env file', () => {
    const envContent = `
# Comment line
TEST_VAR_1=value1
TEST_VAR_2=value2
TEST_VAR_3="quoted value"
TEST_VAR_4='single quoted'
`;

    writeFileSync(envFile, envContent);
    loadDotEnv(envFile);

    expect(process.env.TEST_VAR_1).toBe('value1');
    expect(process.env.TEST_VAR_2).toBe('value2');
    expect(process.env.TEST_VAR_3).toBe('quoted value');
    expect(process.env.TEST_VAR_4).toBe('single quoted');

    // Cleanup
    delete process.env.TEST_VAR_1;
    delete process.env.TEST_VAR_2;
    delete process.env.TEST_VAR_3;
    delete process.env.TEST_VAR_4;
  });

  it('does not override existing environment variables', () => {
    process.env.EXISTING_VAR = 'original';

    const envContent = 'EXISTING_VAR=new-value';
    writeFileSync(envFile, envContent);
    loadDotEnv(envFile);

    expect(process.env.EXISTING_VAR).toBe('original');
  });

  it('silently fails for missing .env file', () => {
    expect(() => loadDotEnv('/nonexistent/.env')).not.toThrow();
  });
});

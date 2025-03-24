import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import type { ConfigOption, ValidatorConfig } from '../../src/interfaces/index.js';

import { MikroConf } from '../../src/MikroConf.js';
import { parsers } from '../../src/parsers.js';
import { validators } from '../../src/validators.js';

import { ValidationError } from '../../src/errors/index.js';

function createTempFile(content: string): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  const filePath = path.join(tempDir, 'config.json');
  writeFileSync(filePath, content);
  return filePath;
}

let tempFiles: string[] = [];

afterEach(() => {
  tempFiles.forEach((file) => {
    try {
      unlinkSync(file);
      rmdirSync(path.dirname(file));
    } catch (error) {
      console.error(`Error cleaning up test files: ${error}`);
    }
  });
  tempFiles = [];
});

describe('Basic functionality', () => {
  test('It should create a basic config with only path input and a default', () => {
    const options: ConfigOption[] = [
      {
        path: 'server.port',
        defaultValue: 3000
      }
    ];

    const config = new MikroConf({ options });

    expect(config.getValue('server.port')).toBe(3000);
  });

  test('It should create a config with path and CLI input and default values', () => {
    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      }
    ];

    const config = new MikroConf({ options });

    expect(config.getValue('server.port')).toBe(3000);
  });

  test('It should override defaults with config file values', () => {
    const configContent = JSON.stringify({
      server: { port: 4000 }
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      }
    ];

    const config = new MikroConf({
      configFilePath: configPath,
      options
    });

    expect(config.getValue('server.port')).toBe(4000);
  });

  test('It should override file config with provided config', () => {
    const configContent = JSON.stringify({
      server: { port: 4000 }
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      }
    ];

    const config = new MikroConf({
      configFilePath: configPath,
      options,
      config: { server: { port: 5000 } }
    });

    expect(config.getValue('server.port')).toBe(5000);
  });

  test('It should override provided config with CLI args', () => {
    const configContent = JSON.stringify({
      server: { port: 4000 }
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      }
    ];

    const config = new MikroConf({
      configFilePath: configPath,
      options,
      config: { server: { port: 5000 } },
      args: ['node', 'script.js', '--port', '6000']
    });

    expect(config.getValue('server.port')).toBe(6000);
  });

  test('It should handle deeply nested config paths correctly', () => {
    const options: ConfigOption[] = [
      {
        flag: '--deep-setting',
        path: 'category.subcategory.setting',
        defaultValue: 'default'
      }
    ];

    const config = new MikroConf({
      options,
      args: ['node', 'script.js', '--deep-setting', 'value']
    });

    expect(config.getValue('category.subcategory.setting')).toBe('value');
  });

  test('It should set and get values correctly', () => {
    const config = new MikroConf();

    config.setValue('test.path', 'test-value');

    expect(config.getValue('test.path')).toBe('test-value');
  });

  test('It should handle boolean flags correctly', () => {
    const options: ConfigOption[] = [
      { flag: '--verbose', path: 'verbose', isFlag: true, defaultValue: false }
    ];

    const config = new MikroConf({
      options,
      args: ['node', 'script.js', '--verbose']
    });

    expect(config.getValue('verbose')).toBe(true);
  });

  test('It should return the full config object', () => {
    const options: ConfigOption[] = [
      { flag: '--host', path: 'server.host', defaultValue: 'localhost' },
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      },
      { flag: '--debug', path: 'debug', isFlag: true, defaultValue: false }
    ];

    const config = new MikroConf({ options });

    expect(config.get()).toEqual({
      server: {
        host: 'localhost',
        port: 3000
      },
      debug: false
    });
  });

  test('It should handle non-node CLI args', () => {
    const options: ConfigOption[] = [
      { flag: '--port', path: 'port', defaultValue: 3000, parser: parsers.int }
    ];

    const config = new MikroConf({
      options,
      args: ['--port', '8080']
    });

    expect(config.getValue('port')).toBe(8080);
  });

  test('It should generate help text', () => {
    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int,
        description: 'Port to run the server on'
      },
      {
        flag: '--host',
        path: 'server.host',
        defaultValue: 'localhost',
        description: 'Host to bind to'
      }
    ];

    const config = new MikroConf({ options });
    const helpText = config.getHelpText();

    expect(helpText).toContain('--port <value>');
    expect(helpText).toContain('Port to run the server on');
    expect(helpText).toContain('Default: 3000');
    expect(helpText).toContain('--host <value>');
    expect(helpText).toContain('Host to bind to');
    expect(helpText).toContain('Default: "localhost"');
  });
});

describe('Parsers', () => {
  test('It should parse integer values', () => {
    const options: ConfigOption[] = [{ flag: '--number', path: 'number', parser: parsers.int }];

    const config = new MikroConf({
      options,
      args: ['--number', '42']
    });

    expect(config.getValue('number')).toBe(42);
    expect(typeof config.getValue('number')).toBe('number');
  });

  test('It should parse float values', () => {
    const options: ConfigOption[] = [{ flag: '--float', path: 'float', parser: parsers.float }];

    const config = new MikroConf({
      options,
      args: ['--float', '3.14']
    });

    expect(config.getValue('float')).toBe(3.14);
    expect(typeof config.getValue('float')).toBe('number');
  });

  test('It should parse boolean values', () => {
    const options: ConfigOption[] = [
      { flag: '--feature-on', path: 'features.on', parser: parsers.boolean },
      { flag: '--feature-off', path: 'features.off', parser: parsers.boolean }
    ];

    const config = new MikroConf({
      options,
      args: ['--feature-on', 'true', '--feature-off', 'false']
    });

    expect(config.getValue('features.on')).toBe(true);
    expect(config.getValue('features.off')).toBe(false);
    expect(typeof config.getValue('features.on')).toBe('boolean');
  });

  test('It should parse array values', () => {
    const options: ConfigOption[] = [{ flag: '--tags', path: 'tags', parser: parsers.array }];

    const config = new MikroConf({
      options,
      args: ['--tags', 'tag1,tag2,tag3']
    });

    expect(config.getValue('tags')).toEqual(['tag1', 'tag2', 'tag3']);
    expect(Array.isArray(config.getValue('tags'))).toBe(true);
  });

  test('It should parse JSON values', () => {
    const options: ConfigOption[] = [{ flag: '--data', path: 'data', parser: parsers.json }];

    const config = new MikroConf({
      options,
      args: ['--data', '{"name":"test","value":42}']
    });

    expect(config.getValue('data')).toEqual({ name: 'test', value: 42 });
    expect(typeof config.getValue('data')).toBe('object');
  });

  test('It should handle parser errors gracefully', () => {
    const options: ConfigOption[] = [{ flag: '--number', path: 'number', parser: parsers.int }];

    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    const config = new MikroConf({
      options,
      args: ['--number', 'not-a-number']
    });

    console.error = originalConsoleError;

    expect(config.getValue('number')).toBeUndefined();
    expect(errors.some((e) => e.includes('Error parsing value'))).toBe(true);
  });
});

describe('Validators', () => {
  test('It should validate integer range', () => {
    const rangeValidator = validators.range(1, 100);

    expect(rangeValidator(50)).toBe(true);
    expect(rangeValidator(0)).toMatch(/Value must be between/);
    expect(rangeValidator(101)).toMatch(/Value must be between/);
  });

  test('It should validate string patterns', () => {
    const urlValidator = validators.pattern(/^https?:\/\/.+/i, 'Must be a valid URL');

    expect(urlValidator('http://example.com')).toBe(true);
    expect(urlValidator('not-a-url')).toBe('Must be a valid URL');
  });

  test('It should validate enum values', () => {
    const colorValidator = validators.oneOf(['red', 'green', 'blue']);

    expect(colorValidator('red')).toBe(true);
    expect(colorValidator('yellow')).toMatch(/Value must be one of/);
  });

  test('It should validate string length', () => {
    const passwordValidator = validators.minLength(8);

    expect(passwordValidator('password123')).toBe(true);
    expect(passwordValidator('short')).toMatch(/Value must be at least/);
  });

  test('It should apply validators during CLI parsing', () => {
    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'port',
        parser: parsers.int,
        validator: validators.range(1, 65535)
      }
    ];

    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    const config = new MikroConf({
      options,
      args: ['--port', '70000'] // Invalid port
    });

    console.error = originalConsoleError;

    expect(config.getValue('port')).toBeUndefined();
    expect(errors.some((e) => e.includes('Invalid value'))).toBe(true);
  });

  test('It should apply custom validators', () => {
    const configValidators: ValidatorConfig[] = [
      {
        path: 'credentials.password',
        validator: (password) => {
          if (!password || typeof password !== 'string') return 'Password is required';
          if (password.length < 8) return 'Password must be at least 8 characters long';
          if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
          if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
          return true;
        },
        message: 'Invalid password'
      }
    ];

    const config = new MikroConf({
      validators: configValidators,
      config: {
        credentials: {
          password: 'weak'
        }
      },
      autoValidate: false
    });

    expect(() => config.validate()).toThrow(ValidationError);
    expect(() => config.validate()).toThrow(/Password must be at least 8 characters long/);

    config.setValue('credentials.password', 'StrongPass123');
    expect(() => config.validate()).not.toThrow();
  });

  test('It should validate interdependent config options', () => {
    const configValidators: ValidatorConfig[] = [
      {
        path: 'server.useHttps',
        validator: (useHttps, config) => {
          if (!useHttps) return true;
          return config.server?.sslCert ? true : 'SSL certificate is required for HTTPS';
        },
        message: 'HTTPS configuration error'
      }
    ];

    const config1 = new MikroConf({
      validators: configValidators,
      config: {
        server: {
          useHttps: true // Missing cert
        }
      },
      autoValidate: false
    });

    expect(() => config1.validate()).toThrow(ValidationError);
    expect(() => config1.validate()).toThrow(/SSL certificate is required/);

    const config2 = new MikroConf({
      validators: configValidators,
      config: {
        server: {
          useHttps: true,
          sslCert: '/path/to/cert.pem'
        }
      },
      autoValidate: false
    });

    expect(() => config2.validate()).not.toThrow();
  });

  test('It should validate on get() when autoValidate is true', () => {
    const configValidators: ValidatorConfig[] = [
      {
        path: 'server.port',
        validator: (port) => port > 0 && port < 65536,
        message: 'Port must be between 1 and 65535'
      }
    ];

    const config = new MikroConf({
      validators: configValidators,
      config: {
        server: {
          port: 70000 // Invalid port
        }
      }
    });

    expect(() => config.get()).toThrow(ValidationError);
    expect(() => config.get()).toThrow(/Port must be between 1 and 65535/);

    config.setValue('server.port', 8080);
    expect(() => config.get()).not.toThrow();
  });
});

describe('File loading', () => {
  test('It should load config from a JSON file', () => {
    const configContent = JSON.stringify({
      app: {
        name: 'TestApp',
        version: '1.0.0'
      },
      server: {
        port: 4200,
        host: '127.0.0.1'
      }
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const config = new MikroConf({ configFilePath: configPath });

    expect(config.getValue('app.name')).toBe('TestApp');
    expect(config.getValue('server.port')).toBe(4200);
  });

  test('It should handle non-existent config files gracefully', () => {
    const config = new MikroConf({
      configFilePath: '/path/to/nonexistent/config.json'
    });

    expect(config.get()).toEqual({});
  });

  test('It should handle malformed JSON in config files', () => {
    const configContent = '{ this is not valid JSON }';
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    const config = new MikroConf({ configFilePath: configPath });

    console.error = originalConsoleError;

    expect(config.get()).toEqual({});
    expect(errors.some((e) => e.includes('Error reading config file'))).toBe(true);
  });

  test('It should support the file exists validator', () => {
    const filePath = createTempFile('test content');
    tempFiles.push(filePath);

    expect(validators.fileExists(filePath)).toBe(true);
    expect(validators.fileExists('/path/to/nonexistent/file')).toMatch(/File not found/);
  });
});

describe('Deep merging', () => {
  test('It should correctly merge nested objects', () => {
    const configContent = JSON.stringify({
      database: {
        host: 'localhost',
        port: 5432,
        credentials: {
          username: 'user'
        }
      }
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const config = new MikroConf({
      configFilePath: configPath,
      config: {
        database: {
          name: 'testdb',
          credentials: {
            password: 'password'
          }
        }
      }
    });

    expect(config.getValue('database.host')).toBe('localhost');
    expect(config.getValue('database.port')).toBe(5432);
    expect(config.getValue('database.name')).toBe('testdb');
    expect(config.getValue('database.credentials.username')).toBe('user');
    expect(config.getValue('database.credentials.password')).toBe('password');
  });

  test('It should handle array overrides correctly', () => {
    const configContent = JSON.stringify({
      items: [1, 2, 3]
    });
    const configPath = createTempFile(configContent);
    tempFiles.push(configPath);

    const config = new MikroConf({
      configFilePath: configPath,
      config: {
        items: [4, 5, 6]
      }
    });

    expect(config.getValue('items')).toEqual([4, 5, 6]);
  });

  test('It should skip undefined values during merge', () => {
    const config = new MikroConf({
      config: {
        test: {
          value1: 'original',
          value2: 'keep'
        }
      }
    });

    config.setValue('test', {
      value1: undefined,
      value3: 'new'
    });

    expect(config.getValue('test.value1')).toBe('original');
    expect(config.getValue('test.value2')).toBe('keep');
    expect(config.getValue('test.value3')).toBe('new');
  });
});

describe('Real-world scenarios', () => {
  test('It should handle a complete configuration', () => {
    const options: ConfigOption[] = [
      {
        flag: '--port',
        path: 'server.port',
        defaultValue: 3000,
        parser: parsers.int
      },
      { flag: '--host', path: 'server.host', defaultValue: 'localhost' },
      {
        flag: '--https',
        path: 'server.useHttps',
        isFlag: true,
        defaultValue: false
      },
      { flag: '--cert', path: 'server.sslCert' },
      { flag: '--key', path: 'server.sslKey' },
      {
        flag: '--debug',
        path: 'server.debug',
        isFlag: true,
        defaultValue: false
      },
      {
        flag: '--jwtSecret',
        path: 'auth.jwtSecret',
        defaultValue: 'default-jwt-secret'
      },
      {
        flag: '--emailSecret',
        path: 'auth.emailSecret',
        defaultValue: 'default-email-secret'
      },
      {
        flag: '--linkExpiry',
        path: 'auth.magicLinkExpirySeconds',
        defaultValue: 300,
        parser: parsers.int
      },
      {
        flag: '--jwtExpiry',
        path: 'auth.jwtExpirySeconds',
        defaultValue: 3600,
        parser: parsers.int
      },
      {
        flag: '--url',
        path: 'auth.appUrl',
        defaultValue: 'http://localhost:3000'
      }
    ];

    const validators: ValidatorConfig[] = [
      {
        path: 'server.useHttps',
        validator: (useHttps, config) => {
          if (!useHttps) return true;
          return !!(config.server?.sslCert && config.server?.sslKey);
        },
        message: 'SSL certificate and key are required when using HTTPS'
      }
    ];

    const certPath = createTempFile('mock cert');
    const keyPath = createTempFile('mock key');
    tempFiles.push(certPath, keyPath);

    const config = new MikroConf({
      options,
      validators,
      args: [
        'node',
        'script.js',
        '--port',
        '8443',
        '--https',
        '--cert',
        certPath,
        '--key',
        keyPath,
        '--jwtSecret',
        'secure-jwt-token',
        '--url',
        'https://example.com'
      ]
    });

    const result = config.get();

    expect(result.server.port).toBe(8443);
    expect(result.server.host).toBe('localhost');
    expect(result.server.useHttps).toBe(true);
    expect(result.server.sslCert).toBe(certPath);
    expect(result.server.sslKey).toBe(keyPath);
    expect(result.server.debug).toBe(false);

    expect(result.auth.jwtSecret).toBe('secure-jwt-token');
    expect(result.auth.emailSecret).toBe('default-email-secret');
    expect(result.auth.magicLinkExpirySeconds).toBe(300);
    expect(result.auth.jwtExpirySeconds).toBe(3600);
    expect(result.auth.appUrl).toBe('https://example.com');
  });

  test('It should fail validation with appropriate message', () => {
    const options: ConfigOption[] = [
      {
        flag: '--https',
        path: 'server.useHttps',
        isFlag: true,
        defaultValue: false
      },
      { flag: '--cert', path: 'server.sslCert' },
      { flag: '--key', path: 'server.sslKey' }
    ];

    const validators: ValidatorConfig[] = [
      {
        path: 'server.useHttps',
        validator: (useHttps, config) => {
          if (!useHttps) return true;
          if (!config.server?.sslCert) return 'SSL certificate path is required when using HTTPS';
          if (!config.server?.sslKey) return 'SSL key path is required when using HTTPS';
          return true;
        },
        message: 'HTTPS configuration error'
      }
    ];

    const config = new MikroConf({
      options,
      validators,
      args: ['node', 'script.js', '--https']
    });

    expect(() => config.get()).toThrow(ValidationError);
    expect(() => config.get()).toThrow(/SSL certificate path is required/);
  });
});

describe('MikroConf validation edge cases', () => {
  test('It should handle boolean false validation results correctly', () => {
    // Create a validator that returns boolean false
    const booleanFalseValidator = (_value: number) => {
      return false; // Always fails with a boolean false
    };

    const options: ConfigOption[] = [
      {
        flag: '--limit',
        path: 'limit',
        parser: (v: string) => Number.parseInt(v, 10),
        validator: booleanFalseValidator
      }
    ];

    // Capture console.error output
    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    const config = new MikroConf({
      options,
      args: ['--limit', '100']
    });

    // Restore console.error
    console.error = originalConsoleError;

    // Validation should have failed with generic message
    expect(config.getValue('limit')).toBeUndefined();
    expect(errors.some((e) => e.includes('Invalid value for --limit'))).toBe(true);

    // Should not have added specific error details since only boolean false was returned
    expect(errors.some((e) => e.includes('Invalid value for --limit') && !e.includes(':'))).toBe(
      true
    );
  });

  test('It should handle missing values for options correctly', () => {
    const options: ConfigOption[] = [
      { flag: '--config', path: 'configPath' }, // Requires a value
      { flag: '--verbose', path: 'verbose', isFlag: true } // Flag doesn't require a value
    ];

    // Capture console.error output
    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    // Test with missing value - passing another flag instead of a value
    const config = new MikroConf({
      options,
      args: ['--config', '--verbose']
    });

    // Restore console.error
    console.error = originalConsoleError;

    // The config path should be undefined as validation failed
    expect(config.getValue('configPath')).toBeUndefined();

    // The verbose flag should be set though
    expect(config.getValue('verbose')).toBe(true);

    // Should have logged an error about missing value
    expect(errors.some((e) => e.includes('Missing value for option --config'))).toBe(true);
  });

  test('It should handle options at the end of args array', () => {
    const options: ConfigOption[] = [{ flag: '--name', path: 'name' }];

    // Capture console.error output
    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    // Test with flag at the end of args array (missing value)
    const config = new MikroConf({
      options,
      args: ['--name']
    });

    // Restore console.error
    console.error = originalConsoleError;

    // The name should be undefined as validation failed
    expect(config.getValue('name')).toBeUndefined();

    // Should have logged an error about missing value
    expect(errors.some((e) => e.includes('Missing value for option --name'))).toBe(true);
  });

  test('It should correctly handle combined boolean false and string validation scenarios', () => {
    // Create several validators with different return patterns
    const options: ConfigOption[] = [
      {
        flag: '--a',
        path: 'a',
        validator: () => false // Boolean false
      },
      {
        flag: '--b',
        path: 'b',
        validator: () => 'Error message' // String error
      },
      {
        flag: '--c',
        path: 'c',
        validator: () => true // Valid
      }
    ];

    // Capture console.error output
    const originalConsoleError = console.error;
    const errors: string[] = [];
    console.error = (message: string) => {
      errors.push(message);
    };

    const config = new MikroConf({
      options,
      args: ['--a', 'value-a', '--b', 'value-b', '--c', 'value-c']
    });

    // Restore console.error
    console.error = originalConsoleError;

    // Check values
    expect(config.getValue('a')).toBeUndefined(); // Should be undefined (failed)
    expect(config.getValue('b')).toBeUndefined(); // Should be undefined (failed)
    expect(config.getValue('c')).toBe('value-c'); // Should be set (passed)

    // Check error messages
    expect(errors.some((e) => e.includes('Invalid value for --a'))).toBe(true);
    expect(errors.some((e) => e.includes('Invalid value for --b: Error message'))).toBe(true);
    expect(errors.length).toBe(2); // Only 2 error messages
  });
});

import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validators } from '../../src/validators.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn()
  };
});

describe('File exists (fileExists)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('It should return true when a file exists', () => {
    // Setup the mock to return true
    vi.mocked(existsSync).mockReturnValue(true);

    const result = validators.fileExists('/path/to/existing/file.txt');

    expect(result).toBe(true);
    expect(existsSync).toHaveBeenCalledWith('/path/to/existing/file.txt');
  });

  test('It should return error message when a file does not exist', () => {
    // Setup the mock to return false
    vi.mocked(existsSync).mockReturnValue(false);

    const filePath = '/path/to/nonexistent/file.txt';
    const result = validators.fileExists(filePath);

    expect(result).toBe(`File not found: ${filePath}`);
    expect(existsSync).toHaveBeenCalledWith(filePath);
  });

  test('It should handle empty path', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = validators.fileExists('');

    expect(result).toBe('File not found: ');
    expect(existsSync).toHaveBeenCalledWith('');
  });
});

describe('Range (range)', () => {
  test('It should validate values within range', () => {
    const validator = validators.range(1, 10);

    expect(validator(1)).toBe(true);
    expect(validator(5)).toBe(true);
    expect(validator(10)).toBe(true);
  });

  test('It should return error message for values outside range', () => {
    const validator = validators.range(1, 10);

    expect(validator(0)).toBe('Value must be between 1 and 10');
    expect(validator(11)).toBe('Value must be between 1 and 10');
  });

  test('It should work with negative ranges', () => {
    const validator = validators.range(-10, -1);

    expect(validator(-5)).toBe(true);
    expect(validator(-11)).toBe('Value must be between -10 and -1');
    expect(validator(0)).toBe('Value must be between -10 and -1');
  });

  test('It should work with floating point values', () => {
    const validator = validators.range(0.1, 0.9);

    expect(validator(0.5)).toBe(true);
    expect(validator(0.05)).toBe('Value must be between 0.1 and 0.9');
    expect(validator(1.0)).toBe('Value must be between 0.1 and 0.9');
  });

  test('It should handle equal min and max values', () => {
    const validator = validators.range(5, 5);

    expect(validator(5)).toBe(true);
    expect(validator(4)).toBe('Value must be between 5 and 5');
    expect(validator(6)).toBe('Value must be between 5 and 5');
  });

  test('It should handle min greater than max (edge case)', () => {
    const validator = validators.range(10, 1);

    expect(validator(5)).toBe('Value must be between 10 and 1');
  });
});

describe('Pattern (pattern)', () => {
  test('It should validate strings matching pattern', () => {
    const emailValidator = validators.pattern(/^[\w.-]+@[\w.-]+\.\w+$/);

    expect(emailValidator('test@example.com')).toBe(true);
    expect(emailValidator('user.name@domain.co.uk')).toBe(true);
  });

  test('It should return error message for non-matching strings', () => {
    const emailValidator = validators.pattern(/^[\w.-]+@[\w.-]+\.\w+$/);

    expect(emailValidator('not-an-email')).toBe(
      'Value must match pattern /^[\\w.-]+@[\\w.-]+\\.\\w+$/'
    );
    expect(emailValidator('@missing-username.com')).toBe(
      'Value must match pattern /^[\\w.-]+@[\\w.-]+\\.\\w+$/'
    );
  });

  test('It should use custom error message if provided', () => {
    const customMessage = 'Please enter a valid email address';
    const emailValidator = validators.pattern(/^[\w.-]+@[\w.-]+\.\w+$/, customMessage);

    expect(emailValidator('not-an-email')).toBe(customMessage);
  });

  test('It should handle empty strings', () => {
    const validator = validators.pattern(/^[a-z]+$/);

    expect(validator('')).toBe('Value must match pattern /^[a-z]+$/');
  });

  test('It should work with various regex patterns', () => {
    // Numeric pattern
    const numericValidator = validators.pattern(/^\d+$/);
    expect(numericValidator('12345')).toBe(true);
    expect(numericValidator('abc')).toBe('Value must match pattern /^\\d+$/');

    // URL pattern
    const urlValidator = validators.pattern(/^https?:\/\/.+/);
    expect(urlValidator('https://example.com')).toBe(true);
    expect(urlValidator('example.com')).toBe('Value must match pattern /^https?:\\/\\/.+/');

    // Date pattern (YYYY-MM-DD)
    const dateValidator = validators.pattern(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateValidator('2023-01-15')).toBe(true);
    expect(dateValidator('01/15/2023')).toBe('Value must match pattern /^\\d{4}-\\d{2}-\\d{2}$/');
  });
});

describe('Inclusion (oneOf)', () => {
  test('It should validate values in the allowed set', () => {
    const colorValidator = validators.oneOf(['red', 'green', 'blue']);

    expect(colorValidator('red')).toBe(true);
    expect(colorValidator('green')).toBe(true);
    expect(colorValidator('blue')).toBe(true);
  });

  test('It should return error message for values not in the allowed set', () => {
    const colorValidator = validators.oneOf(['red', 'green', 'blue']);

    expect(colorValidator('yellow')).toBe('Value must be one of: red, green, blue');
    expect(colorValidator('purple')).toBe('Value must be one of: red, green, blue');
  });

  test('It should use custom error message if provided', () => {
    const customMessage = 'Please select a valid color';
    const colorValidator = validators.oneOf(['red', 'green', 'blue'], customMessage);

    expect(colorValidator('yellow')).toBe(customMessage);
  });

  test('It should work with numeric values', () => {
    const statusCodeValidator = validators.oneOf([200, 201, 204]);

    expect(statusCodeValidator(200)).toBe(true);
    expect(statusCodeValidator(404)).toBe('Value must be one of: 200, 201, 204');
  });

  test('It should work with empty arrays (edge case)', () => {
    const validator = validators.oneOf([]);

    // @ts-ignore
    expect(validator('anything')).toBe('Value must be one of: ');
  });

  test('It should handle array with mixed types (edge case)', () => {
    const mixedValidator = validators.oneOf(['string', 123, true] as any[]);

    expect(mixedValidator('string')).toBe(true);
    expect(mixedValidator(123)).toBe(true);
    expect(mixedValidator(true)).toBe(true);
    expect(mixedValidator('other')).toBe('Value must be one of: string, 123, true');
  });
});

describe('Minimum length (minLength)', () => {
  test('It should validate strings with sufficient length', () => {
    const passwordValidator = validators.minLength(8);

    expect(passwordValidator('password123')).toBe(true);
    expect(passwordValidator('exactly8')).toBe(true);
  });

  test('It should return error message for strings that are too short', () => {
    const passwordValidator = validators.minLength(8);

    expect(passwordValidator('short')).toBe('Value must be at least 8 characters long');
    expect(passwordValidator('')).toBe('Value must be at least 8 characters long');
  });

  test('It should handle zero length requirement (edge case)', () => {
    const validator = validators.minLength(0);

    expect(validator('')).toBe(true);
    expect(validator('any')).toBe(true);
  });

  test('It should handle negative length requirement (edge case)', () => {
    const validator = validators.minLength(-5);

    expect(validator('')).toBe(true);
    expect(validator('any')).toBe(true);
  });

  test('It should count whitespace and special characters', () => {
    const validator = validators.minLength(10);

    expect(validator('abc 123 !@')).toBe(true);
    expect(validator('abc123!@')).toBe('Value must be at least 10 characters long');
  });
});

describe('Validator composition', () => {
  test('It should be able to combine validators for complex validation', () => {
    // Create a password validator that requires:
    // - At least 8 characters
    // - Contains at least one uppercase letter
    // - Contains at least one number
    const validatePassword = (value: string) => {
      const lengthValidator = validators.minLength(8);
      const uppercaseValidator = validators.pattern(
        /[A-Z]/,
        'Password must contain at least one uppercase letter'
      );
      const numberValidator = validators.pattern(
        /[0-9]/,
        'Password must contain at least one number'
      );

      const lengthResult = lengthValidator(value);
      if (lengthResult !== true) return lengthResult;

      const uppercaseResult = uppercaseValidator(value);
      if (uppercaseResult !== true) return uppercaseResult;

      return numberValidator(value);
    };

    expect(validatePassword('Password123')).toBe(true);

    expect(validatePassword('short')).toBe('Value must be at least 8 characters long');
    expect(validatePassword('password123')).toBe(
      'Password must contain at least one uppercase letter'
    );
    expect(validatePassword('PASSWORDabc')).toBe('Password must contain at least one number');
  });
});

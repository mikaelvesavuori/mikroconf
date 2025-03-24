import { describe, expect, test } from 'vitest';

import { parsers } from '../../src/parsers.js';

describe('Integers (int)', () => {
  test('It should parse valid integer strings', () => {
    expect(parsers.int('123')).toBe(123);
    expect(parsers.int('0')).toBe(0);
    expect(parsers.int('-456')).toBe(-456);
    expect(parsers.int('  789  ')).toBe(789);
  });

  test('It should truncate floating point numbers', () => {
    expect(() => parsers.int('123.45')).toThrow();
    expect(() => parsers.int('-67.89')).toThrow();
  });

  test('It should handle leading zeros', () => {
    expect(parsers.int('0123')).toBe(123);
  });

  test('It should handle numeric strings with plus sign', () => {
    expect(parsers.int('+42')).toBe(42);
  });

  test('It should throw error for non-numeric strings', () => {
    expect(() => parsers.int('abc')).toThrow('Cannot parse "abc" as an integer');
    expect(() => parsers.int('123abc')).toThrow('Cannot parse "123abc" as an integer');
    expect(() => parsers.int('')).toThrow('Cannot parse "" as an integer');
    expect(() => parsers.int('   ')).toThrow('Cannot parse "   " as an integer');
  });

  test('It should throw error for special characters', () => {
    expect(() => parsers.int('$100')).toThrow();
    expect(() => parsers.int('1,000')).toThrow();
  });

  test('It should handle numeric edge cases', () => {
    expect(parsers.int('9007199254740991')).toBe(9007199254740991);

    const veryLargeNum = '9007199254740992'; // Beyond max safe integer
    expect(parsers.int(veryLargeNum)).toBe(Number.parseInt(veryLargeNum, 10));
  });
});

describe('Numbers (float)', () => {
  test('It should parse valid float strings', () => {
    expect(parsers.float('3.14')).toBe(3.14);
    expect(parsers.float('0.0')).toBe(0);
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
    expect(parsers.float('-2.718')).toBe(-2.718);
    expect(parsers.float('  42.0  ')).toBe(42);
  });

  test('It should parse strings with no decimal point as integers', () => {
    expect(parsers.float('123')).toBe(123);
    expect(parsers.float('-456')).toBe(-456);
  });

  test('It should handle scientific notation', () => {
    expect(parsers.float('1e3')).toBe(1000);
    expect(parsers.float('1.5e-2')).toBe(0.015);
  });

  test('It should handle strings with plus sign', () => {
    expect(parsers.float('+3.14')).toBe(3.14);
  });

  test('It should throw error for non-numeric strings', () => {
    expect(() => parsers.float('abc')).toThrow('Cannot parse "abc" as a number');
    expect(() => parsers.float('3.14abc')).toThrow('Cannot parse "3.14abc" as a number');
    expect(() => parsers.float('')).toThrow('Cannot parse "" as a number');
    expect(() => parsers.float('   ')).toThrow('Cannot parse "   " as a number');
  });

  test('It should throw error for special characters', () => {
    expect(() => parsers.float('$100.00')).toThrow();
    expect(() => parsers.float('1,000.00')).toThrow();
  });

  test('It should handle numeric edge cases', () => {
    expect(parsers.float('Infinity')).toBe(Number.POSITIVE_INFINITY);
    expect(parsers.float('-Infinity')).toBe(Number.NEGATIVE_INFINITY);

    expect(() => parsers.float('NaN')).toThrow();
  });
});

describe('True/false (boolean)', () => {
  test('It should parse "true" variations correctly', () => {
    expect(parsers.boolean('true')).toBe(true);
    expect(parsers.boolean('TRUE')).toBe(true);
    expect(parsers.boolean('True')).toBe(true);
    expect(parsers.boolean('yes')).toBe(true);
    expect(parsers.boolean('YES')).toBe(true);
    expect(parsers.boolean('1')).toBe(true);
    expect(parsers.boolean('y')).toBe(true);
    expect(parsers.boolean('Y')).toBe(true);
  });

  test('It should parse "false" variations correctly', () => {
    expect(parsers.boolean('false')).toBe(false);
    expect(parsers.boolean('FALSE')).toBe(false);
    expect(parsers.boolean('False')).toBe(false);
    expect(parsers.boolean('no')).toBe(false);
    expect(parsers.boolean('NO')).toBe(false);
    expect(parsers.boolean('0')).toBe(false);
    expect(parsers.boolean('n')).toBe(false);
    expect(parsers.boolean('N')).toBe(false);
  });

  test('It should handle whitespace', () => {
    expect(parsers.boolean('  true  ')).toBe(true);
    expect(parsers.boolean('  false  ')).toBe(false);
  });

  test('It should throw error for invalid boolean strings', () => {
    expect(() => parsers.boolean('maybe')).toThrow('Cannot parse "maybe" as a boolean');
    expect(() => parsers.boolean('2')).toThrow('Cannot parse "2" as a boolean');
    expect(() => parsers.boolean('')).toThrow('Cannot parse "" as a boolean');
    expect(() => parsers.boolean('truthy')).toThrow('Cannot parse "truthy" as a boolean');
    expect(() => parsers.boolean('falsey')).toThrow('Cannot parse "falsey" as a boolean');
  });
});

describe('Lists (array)', () => {
  test('It should parse comma-separated values', () => {
    expect(parsers.array('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(parsers.array('1,2,3')).toEqual(['1', '2', '3']);
  });

  test('It should trim whitespace from values', () => {
    expect(parsers.array('a, b, c')).toEqual(['a', 'b', 'c']);
    expect(parsers.array(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  test('It should handle empty values', () => {
    expect(parsers.array('a,,c')).toEqual(['a', '', 'c']);
    expect(parsers.array(',,')).toEqual(['', '', '']);
  });

  test('It should return empty array for empty string', () => {
    expect(parsers.array('')).toEqual(['']);
  });

  test('It should handle single value', () => {
    expect(parsers.array('single')).toEqual(['single']);
  });

  test('It should preserve special characters in values', () => {
    expect(parsers.array('a@b.com,example.com')).toEqual(['a@b.com', 'example.com']);
    expect(parsers.array('key=value,foo=bar')).toEqual(['key=value', 'foo=bar']);
  });
});

describe('Objects (json)', () => {
  test('It should parse valid JSON objects', () => {
    expect(parsers.json('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 });
  });

  test('It should parse valid JSON arrays', () => {
    expect(parsers.json('[1,2,3]')).toEqual([1, 2, 3]);
  });

  test('It should parse primitive JSON values', () => {
    expect(parsers.json('123')).toBe(123);
    expect(parsers.json('"text"')).toBe('text');
    expect(parsers.json('true')).toBe(true);
    expect(parsers.json('false')).toBe(false);
    expect(parsers.json('null')).toBe(null);
  });

  test('It should handle nested JSON structures', () => {
    const nestedJson =
      '{"user":{"name":"John","addresses":[{"city":"New York"},{"city":"Boston"}]}}';
    expect(parsers.json(nestedJson)).toEqual({
      user: {
        name: 'John',
        addresses: [{ city: 'New York' }, { city: 'Boston' }]
      }
    });
  });

  test('It should throw error for invalid JSON', () => {
    expect(() => parsers.json('{')).toThrow('Cannot parse "{" as JSON');
    expect(() => parsers.json('{"name":"John"')).toThrow('Cannot parse "{"name":"John"" as JSON');
    expect(() => parsers.json('not json')).toThrow('Cannot parse "not json" as JSON');
    expect(() => parsers.json('')).toThrow('Cannot parse "" as JSON');
  });

  test('It should handle whitespace in JSON', () => {
    expect(parsers.json(' { "name" : "John" } ')).toEqual({ name: 'John' });
  });
});

import { existsSync } from 'node:fs';

/**
 * @description Common validators for config values.
 */
export const validators = {
  /**
   * Validates that a file exists.
   */
  fileExists: (path: string) => {
    return existsSync(path) || `File not found: ${path}`;
  },

  /**
   * @description Validates that a value is within a range.
   */
  range: (min: number, max: number) => {
    return (value: number) => {
      return (value >= min && value <= max) || `Value must be between ${min} and ${max}`;
    };
  },

  /**
   * @description Validates that a string matches a regex pattern.
   */
  pattern: (regex: RegExp, message?: string) => {
    return (value: string) => {
      return regex.test(value) || message || `Value must match pattern ${regex}`;
    };
  },

  /**
   * @description Validates that a value is one of a set of allowed values.
   */
  oneOf: <T>(allowedValues: T[], message?: string) => {
    return (value: T) => {
      return (
        allowedValues.includes(value) ||
        message ||
        `Value must be one of: ${allowedValues.join(', ')}`
      );
    };
  },

  /**
   * @description Validates that a string has minimum length.
   */
  minLength: (min: number) => {
    return (value: string) => {
      return value.length >= min || `Value must be at least ${min} characters long`;
    };
  }
};

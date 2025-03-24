/**
 * @description Common parsers for CLI arguments.
 */
export const parsers = {
  /**
   * @description Parses a string to an integer.
   */
  int: (value: string): number => {
    const trimmedValue = value.trim();

    // Check if the string contains non-numeric characters (except leading + or - sign)
    if (!/^[+-]?\d+$/.test(trimmedValue)) throw new Error(`Cannot parse "${value}" as an integer`);

    const parsed = Number.parseInt(trimmedValue, 10);
    if (Number.isNaN(parsed)) throw new Error(`Cannot parse "${value}" as an integer`);

    return parsed;
  },

  /**
   * @description Parses a string to a float.
   */
  float: (value: string): number => {
    const trimmedValue = value.trim();

    // Check if the string contains non-numeric characters
    // This regex allows scientific notation (e.g., 1e3) and decimal points
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmedValue)) {
      if (trimmedValue === 'Infinity' || trimmedValue === '-Infinity')
        return trimmedValue === 'Infinity' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

      throw new Error(`Cannot parse "${value}" as a number`);
    }

    const parsed = Number.parseFloat(trimmedValue);
    if (Number.isNaN(parsed)) throw new Error(`Cannot parse "${value}" as a number`);

    return parsed;
  },

  /**
   * @description Parses a string to a boolean.
   */
  boolean: (value: string): boolean => {
    const lowerValue = value.trim().toLowerCase();

    if (['true', 'yes', '1', 'y'].includes(lowerValue)) return true;
    if (['false', 'no', '0', 'n'].includes(lowerValue)) return false;

    throw new Error(`Cannot parse "${value}" as a boolean`);
  },

  /**
   * @description Parses a comma-separated string to an array.
   */
  array: (value: string): string[] => {
    return value.split(',').map((item) => item.trim());
  },

  /**
   * @description Parses a JSON string.
   */
  json: (value: string): any => {
    try {
      return JSON.parse(value);
    } catch (_error) {
      throw new Error(`Cannot parse "${value}" as JSON`);
    }
  }
};

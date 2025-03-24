/**
 * @description Options for initializing the MikroConf.
 */
export interface MikroConfOptions {
  /**
   * Name of the default config file to look for.
   */
  configFilePath?: string;
  /**
   * CLI arguments (typically process.argv).
   */
  args?: string[];
  /**
   * Direct configuration object (highest precedence).
   */
  config?: Record<string, any>;
  /**
   * Definition of CLI options and their mapping to config paths.
   */
  options?: ConfigOption[];
  /**
   * Custom validators for config values.
   */
  validators?: ValidatorConfig[];
  /**
   * Whether to automatically validate during get().
   */
  autoValidate?: boolean;
}

/**
 * @description Defines a CLI argument with its parsing and validation logic.
 */
export interface ConfigOption<T = any> {
  /**
   * CLI flag name (e.g., '--port').
   */
  flag?: string;
  /**
   * Path to store the value in the config object (e.g., 'server.port').
   */
  path: string;
  /**
   * Default value if not specified.
   */
  defaultValue?: T;
  /**
   * Function to parse the input string to the desired type.
   */
  parser?: (value: string) => T;
  /**
   * Function to validate the parsed value.
   */
  validator?: (value: T) => boolean | string;
  /**
   * Whether this option doesn't require a value (boolean flag).
   */
  isFlag?: boolean;
  /**
   * Human-readable description for help text.
   */
  description?: string;
}

/**
 * @description Configuration for validator functions.
 */
export interface ValidatorConfig {
  /**
   * Path in config object to validate.
   */
  path: string;
  /**
   * Validation function.
   */
  validator: (value: any, config: Record<string, any>) => boolean | string;
  /**
   * Error message if validation fails.
   */
  message: string;
}

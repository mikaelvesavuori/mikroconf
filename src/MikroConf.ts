import { existsSync, readFileSync } from 'node:fs';

import type { ConfigOption, MikroConfOptions, ValidatorConfig } from './interfaces/index.js';

import { ValidationError } from './errors/index.js';

/**
 * @description MikroConf is a simple but powerful configuration manager
 * that handles CLI arguments, config files, and direct configuration with
 * merging, parsing, and validation capabilities.
 *
 * @example
 * import { MikroConf } from 'mikroconf';
 *
 * const config = new MikroConf({
 *   configFilePath: 'config.json',
 *   options: [
 *     { path: 'server.host', defaultValue: 'localhost' },
 *     { path: 'server.port', defaultValue: 3000 },
 *     { path: 'logging.level', defaultValue: 'info' },
 *     { path: 'debug', defaultValue: process.env.DEBUG === 'true' ? true : false }
 *   ]
 * });
 *
 * const appConfig = config.get();
 * console.log(appConfig);
 *
 * const port = config.getValue('server.port');
 * const host = config.getValue('server.host');
 * console.log(`Server will start at http://${host}:${port}`);
 */
export class MikroConf {
  private config: Record<string, any> = {};
  private options: ConfigOption[] = [];
  private validators: ValidatorConfig[] = [];
  private autoValidate = true;

  /**
   * @description Creates a new MikroConf instance.
   */
  constructor(options?: MikroConfOptions) {
    const configFilePath = options?.configFilePath;
    const args = options?.args || [];
    const configuration = options?.config || {};

    this.options = options?.options || [];
    this.validators = options?.validators || [];

    if (options?.autoValidate !== undefined) this.autoValidate = options.autoValidate;

    this.config = this.createConfig(configFilePath, args, configuration);
  }

  /**
   * @description Deep merges two objects.
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
    const result: Record<string, any> = { ...target };

    for (const key in source) {
      if (source[key] === undefined) continue;

      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        key in target &&
        target[key] !== null &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        // If both properties are objects, recursively merge them
        result[key] = this.deepMerge(target[key] as Record<string, any>, source[key]);
      } else if (source[key] !== undefined) result[key] = source[key];
    }

    return result as T;
  }

  /**
   * @description Sets a value at a nested path in an object.
   */
  private setValueAtPath(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!(part in current) || current[part] === null) current[part] = {};
      else if (typeof current[part] !== 'object') current[part] = {};

      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  /**
   * @description Gets a value from a nested path in an object.
   */
  private getValueAtPath(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;

      current = current[part];
    }

    return current;
  }

  /**
   * @description Creates a configuration object by merging defaults, config file settings,
   * explicit input, and CLI arguments.
   */
  private createConfig(
    configFilePath?: string,
    args: string[] = [],
    configuration: Record<string, any> = {}
  ): Record<string, any> {
    // Create defaults from options
    const defaults: Record<string, any> = {};
    for (const option of this.options) {
      if (option.defaultValue !== undefined)
        this.setValueAtPath(defaults, option.path, option.defaultValue);
    }

    // Load configuration from file if it exists
    let fileConfig: Record<string, any> = {};
    if (configFilePath && existsSync(configFilePath)) {
      try {
        const fileContent = readFileSync(configFilePath, 'utf8');
        fileConfig = JSON.parse(fileContent);
        console.log(`Loaded configuration from ${configFilePath}`);
      } catch (error) {
        console.error(
          `Error reading config file: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const cliConfig = this.parseCliArgs(args);

    // Merge configurations in order of precedence
    let mergedConfig = this.deepMerge({}, defaults);
    mergedConfig = this.deepMerge(mergedConfig, fileConfig);
    mergedConfig = this.deepMerge(mergedConfig, configuration);
    mergedConfig = this.deepMerge(mergedConfig, cliConfig);

    return mergedConfig;
  }

  /**
   * @description Parses command line arguments into a configuration object based on defined options.
   */
  private parseCliArgs(args: string[]): Record<string, any> {
    const cliConfig: Record<string, any> = {};

    // Skip the first two elements (node executable and script path) for typical Node.js applications
    let i = args[0]?.endsWith('node') || args[0]?.endsWith('node.exe') ? 2 : 0;

    while (i < args.length) {
      const arg = args[i++];
      const option = this.options.find((opt) => opt.flag === arg);

      if (option) {
        if (option.isFlag) {
          // Boolean flag
          this.setValueAtPath(cliConfig, option.path, true);
        } else if (i < args.length && !args[i].startsWith('-')) {
          // Option with value
          let value: any = args[i++];

          // Parse value if a parser is provided
          if (option.parser) {
            try {
              value = option.parser(value);
            } catch (error) {
              console.error(
                `Error parsing value for ${option.flag}: ${error instanceof Error ? error.message : String(error)}`
              );
              continue;
            }
          }

          // Validate if a validator is provided
          if (option.validator) {
            const validationResult = option.validator(value);
            if (validationResult !== true && typeof validationResult === 'string') {
              console.error(`Invalid value for ${option.flag}: ${validationResult}`);
              continue;
            }
            if (validationResult === false) {
              console.error(`Invalid value for ${option.flag}`);
              continue;
            }
          }

          this.setValueAtPath(cliConfig, option.path, value);
        } else {
          console.error(`Missing value for option ${arg}`);
        }
      }
    }

    return cliConfig;
  }

  /**
   * @description Validates the configuration against defined validators.
   */
  public validate(): void {
    for (const validator of this.validators) {
      const value = this.getValueAtPath(this.config, validator.path);
      const result = validator.validator(value, this.config);

      if (result === false) throw new ValidationError(validator.message);
      if (typeof result === 'string') throw new ValidationError(result);
    }
  }

  /**
   * @description Returns the complete configuration.
   * @returns The configuration object.
   */
  public get<T = Record<string, any>>(): T {
    if (this.autoValidate) this.validate();

    return this.config as T;
  }

  /**
   * @description Gets a specific configuration value by path.
   * @param path The dot-notation path to the configuration value.
   * @param defaultValue Optional default value if the path doesn't exist.
   */
  public getValue<T>(path: string, defaultValue?: T): T {
    const value = this.getValueAtPath(this.config, path);
    return value !== undefined ? value : (defaultValue as T);
  }

  /**
   * @description Sets a specific configuration value by path.
   * @param path The dot-notation path to set.
   * @param value The value to set.
   */
  public setValue(path: string, value: any): void {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // For objects, get the current value and merge them
      const currentValue = this.getValueAtPath(this.config, path) || {};
      if (typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        const mergedValue = this.deepMerge(currentValue, value);
        this.setValueAtPath(this.config, path, mergedValue);
        return;
      }
    }

    // For non-objects or if current value isn't an object, just set the value directly
    this.setValueAtPath(this.config, path, value);
  }

  /**
   * @description Generates help text based on the defined options.
   */
  public getHelpText(): string {
    let help = 'Available configuration options:\n\n';

    for (const option of this.options) {
      help += `${option.flag}${option.isFlag ? '' : ' <value>'}\n`;

      if (option.description) help += `  ${option.description}\n`;
      if (option.defaultValue !== undefined)
        help += `  Default: ${JSON.stringify(option.defaultValue)}\n`;

      help += '\n';
    }

    return help;
  }
}

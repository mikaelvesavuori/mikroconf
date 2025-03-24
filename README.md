# MikroConf

**A flexible, zero-dependency, type-safe configuration manager that just makes sense**.

[![npm version](https://img.shields.io/npm/v/mikroconf.svg)](https://www.npmjs.com/package/mikroconf)

[![bundle size](https://img.shields.io/bundlephobia/minzip/mikroconf)](https://bundlephobia.com/package/mikroconf)

![Build Status](https://github.com/mikaelvesavuori/mikroconf/workflows/main/badge.svg)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

- Load configuration from multiple sources (defaults, files, environment, CLI)
- Built-in parsers and validators
- Nested configuration with dot notation path support
- Strong TypeScript support with typed configuration access
- Simple API
- Tiny (~1.3kb gzipped)
- Zero dependencies

## Installation

```bash
npm install mikroconf -S
```

## Usage

### Quick Start

Let's look at a simple example where we use a configuration file to retrieve values. Values that are not provided are picked from the defaults.

```typescript
import { MikroConf } from 'mikroconf';

/*
// config.json
{
  "server": {
    "host: "http://1.2.3.4",
    "port": 8080
  }
}
*/

const config = new MikroConf({
  configFilePath: 'config.json', // Load from this file if it exists
  options: [
    { path: 'server.host', defaultValue: 'localhost' }, // Will use the provided value
    { path: 'server.port', defaultValue: 3000 }, // Will use the provided value
    { path: 'logging.level', defaultValue: 'info' }, // Will use the default value
    { path: 'debug', defaultValue: process.env.DEBUG === 'true' ? true : false } // Will use the default value
  ]
});

// Get the entire configuration
const appConfig = config.get();
console.log(appConfig);

// Get specific values
const port = config.getValue('server.port');
const host = config.getValue('server.host');
console.log(`Server will start at http://${host}:${port}`);
```

### Validation

You can add validators to ensure your configuration meets your requirements:

```typescript
import { MikroConf, validators } from 'mikroconf';

const config = new MikroConf({
  // ...
  validators: [
    {
      path: 'database.url',
      validator: (url) => {
        if (!url) return 'Database URL is required';
        return true;
      },
      message: 'Invalid database configuration'
    }
  ]
});

try {
  const appConfig = config.get(); // Validates automatically
  // Start application
  // ...
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}
```

### Working with CLI Arguments

MikroConf automatically maps CLI arguments to your configuration structure:

```typescript
import { MikroConf, parsers, validators } from 'mikroconf';

const config = new MikroConf({
  args: process.argv, // Pass in CLI arguments (typically process.argv)
  options: [
    {
      flag: '--port', // The CLI flag or parameter
      path: 'server.port',
      defaultValue: 3000,
      parser: parsers.int, // Convert string to integer
      validator: validators.range(1024, 65535) // Validate the value
    },
    { flag: '--tags', path: 'tags', parser: parsers.array }, // Array
    { flag: '--debug', path: 'debug', isFlag: true } // Boolean flag
  ]
});

// Example: node app.js --port 8080 --debug --tags api,auth,v1
console.log(config.getValue('server.port')); // 8080 (number)
console.log(config.getValue('debug')); // true (boolean)
console.log(config.getValue('tags')); // ['api', 'auth', 'v1'] (array)
```

And a more elaborate example:

```typescript
import { MikroConf, parsers, validators } from 'mikroconf';

/*
// app-config.json
{
  "server": {
    "port": 1234
  },
  "logging": {
    "level": "DEBUG"
  },
  "database": {
    "url": "postgres://my-db"
  }
}
*/

// Load values from a file and validate them
const config = new MikroConf({
  configFilePath: 'app-config.json',
  options: [
    {
      flag: '--port',
      path: 'server.port',
      defaultValue: 3000,
      parser: parsers.int,
      validator: validators.range(1024, 65535)
    },
    {
      flag: '--log-level',
      path: 'logging.level',
      defaultValue: 'info',
      validator: validators.oneOf(['debug', 'info', 'warn', 'error'])
    }
  ],
  validators: [
    {
      path: 'database.url',
      validator: (url) => {
        if (!url) return 'Database URL is required';
        if (typeof url !== 'string') return 'Database URL must be a string';
        if (!url.startsWith('mongodb://') && !url.startsWith('postgres://')) {
          return 'Database URL must start with mongodb:// or postgres://';
        }
        return true;
      },
      message: 'Invalid database configuration'
    }
  ]
});

try {
  const appConfig = config.get();
  console.log(appConfig);
  console.log('Configuration validated successfully');
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}
```

### Type Safety

Get full TypeScript type checking with your configuration:

```typescript
import { MikroConf, parsers } from 'mikroconf';

// Define your configuration type
interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  features: {
    enableAuth: boolean;
    enableCache: boolean;
  };
}

const config = new MikroConf({
  configFilePath: 'app-config.json',
  options: [
    { flag: '--port', path: 'server.port', defaultValue: 3000, parser: parsers.int },
    { flag: '--db-url', path: 'database.url' },
    { flag: '--enable-auth', path: 'features.enableAuth', isFlag: true }
  ]
});

// Get typed configuration
const appConfig = config.get<AppConfig>();
console.log('appConfig', appConfig);

// TypeScript knows the types of these properties
const serverPort: number = appConfig.server.port;
const dbUrl: string = appConfig.database.url;
const authEnabled: boolean = appConfig.features.enableAuth;

console.log(serverPort, dbUrl, authEnabled);
```

## Configuration Sources (in order of precedence)

1. Command line arguments (highest priority)
2. Programmatically provided config
3. Config file (JSON)
4. Default values (lowest priority)

## License

MIT. See the `LICENSE` file.

/**
 * djed add command - Add Djed package to existing project
 *
 * Usage:
 *   djed add logger                  (L1 - default behavior)
 *   djed add logger --no-install     (L2 - skip installation)
 *   djed add logger --no-example     (L3 - skip example generation)
 */

import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { validatePackageName, isInProject } from '../utils/validators.js';

interface AddOptions {
  install?: boolean;
  example?: boolean;
}

const PACKAGE_INFO: Record<string, {
  npmName: string;
  description: string;
  exampleCode: string;
}> = {
  logger: {
    npmName: '@djed/logger',
    description: 'Structured logging with Winston',
    exampleCode: `import { Logger } from '@djed/logger';

const logger = new Logger('my-app');

logger.info('Application started', { port: 3000 });
logger.error('Something went wrong', { error: 'details' });
`
  },
  validator: {
    npmName: '@djed/validator',
    description: 'JSON schema validation with Ajv',
    exampleCode: `import Ajv from 'ajv';

// Create validator instance
const ajv = new Ajv();

// Define schema
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// Compile and validate
const validate = ajv.compile(schema);
const valid = validate({ name: 'John', email: 'john@example.com' });

if (!valid) {
  console.error(validate.errors);
}
`
  },
  'mcp-base': {
    npmName: '@djed/mcp-base',
    description: 'Base MCP server implementation',
    exampleCode: `// Example MCP server setup will be added here
// See templates/mcp-server for complete example
`
  },
  'shared-types': {
    npmName: '@djed/shared-types',
    description: 'Common TypeScript types',
    exampleCode: `import type { Result, LogLevel } from '@djed/shared-types';

// Use Result type for error handling
function performOperation(): Result<string, Error> {
  try {
    return { ok: true, value: 'success' };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}
`
  }
};

export async function addCommand(
  packageName: string,
  options: AddOptions
): Promise<void> {
  try {
    logger.blank();
    logger.info(chalk.bold(`Adding @djed/${packageName}`));
    logger.blank();

    // Validate package name
    const validation = validatePackageName(packageName);
    if (validation !== true) {
      logger.error(validation);
      process.exit(1);
    }

    // Check if in a project
    if (!isInProject()) {
      logger.error('Not in a project directory');
      logger.info('Run "djed init" to create a new project first');
      process.exit(1);
    }

    const packageInfo = PACKAGE_INFO[packageName];
    logger.step(`Package: ${chalk.cyan(packageInfo.npmName)}`);
    logger.step(`Description: ${packageInfo.description}`);
    logger.blank();

    // Install package
    if (options.install !== false) {
      const installSpinner = logger.spinner(`Installing ${packageInfo.npmName}...`);
      try {
        await execa('npm', ['install', packageInfo.npmName]);
        installSpinner.succeed(`${packageInfo.npmName} installed`);
      } catch (error: any) {
        installSpinner.fail('Installation failed');
        logger.error(error.message);
        process.exit(1);
      }
    } else {
      logger.warning('Skipping installation (--no-install)');
      logger.info(`Run: npm install ${packageInfo.npmName}`);
    }

    // Generate example file
    if (options.example !== false) {
      const exampleSpinner = logger.spinner('Generating example usage...');
      try {
        const examplesDir = path.join(process.cwd(), 'examples');
        await fs.ensureDir(examplesDir);

        const exampleFile = path.join(examplesDir, `${packageName}-example.ts`);
        await fs.writeFile(exampleFile, packageInfo.exampleCode, 'utf-8');

        exampleSpinner.succeed(`Example created: ${chalk.dim('examples/' + packageName + '-example.ts')}`);
      } catch (error: any) {
        exampleSpinner.warn('Failed to create example file');
      }
    }

    // Success
    logger.blank();
    logger.success(chalk.bold(`@djed/${packageName} added successfully!`));
    logger.blank();
    logger.step('Next steps:');
    logger.info(`  Import in your code: import { ... } from '${packageInfo.npmName}'`);
    if (options.example !== false) {
      logger.info(`  Check example: examples/${packageName}-example.ts`);
    }
    logger.blank();
    logger.info(chalk.dim('To remove this package: djed eject ' + packageName));
    logger.blank();

  } catch (error: any) {
    logger.error(`Failed to add package: ${error.message}`);
    process.exit(1);
  }
}

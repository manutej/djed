/**
 * djed eject command - Replace Djed package with raw dependency
 *
 * This command demonstrates "zero lock-in" by providing a clear
 * path to eject from Djed packages to their underlying dependencies.
 *
 * Usage:
 *   djed eject logger                (L2 - with confirmation)
 *   djed eject logger -y             (L3 - skip confirmation)
 *   djed eject logger --dry-run      (L3 - preview changes)
 */

import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { validatePackageName, isInProject } from '../utils/validators.js';

interface EjectOptions {
  dryRun?: boolean;
  yes?: boolean;
}

interface EjectConfig {
  npmName: string;
  replacement: string;
  replacementVersion: string;
  migrationSteps: string[];
  codeChanges: Array<{
    from: string;
    to: string;
    description: string;
  }>;
}

const EJECT_CONFIGS: Record<string, EjectConfig> = {
  logger: {
    npmName: '@djed/logger',
    replacement: 'winston',
    replacementVersion: '^3.11.0',
    migrationSteps: [
      'Uninstall @djed/logger',
      'Install winston',
      'Update imports',
      'Replace Logger initialization',
      'Test logging functionality'
    ],
    codeChanges: [
      {
        from: `import { Logger } from '@djed/logger';
const logger = new Logger('app');`,
        to: `import winston from 'winston';
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});`,
        description: 'Replace Djed Logger with Winston'
      }
    ]
  },
  validator: {
    npmName: '@djed/validator',
    replacement: 'ajv',
    replacementVersion: '^8.12.0',
    migrationSteps: [
      'Uninstall @djed/validator',
      'Install ajv and ajv-formats',
      'Update imports',
      'Create Ajv instance directly',
      'Test validation functionality'
    ],
    codeChanges: [
      {
        from: `import { Validator } from '@djed/validator';
const validator = new Validator();`,
        to: `import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const ajv = new Ajv();
addFormats(ajv);`,
        description: 'Replace Djed Validator with Ajv'
      }
    ]
  },
  'mcp-base': {
    npmName: '@djed/mcp-base',
    replacement: '@modelcontextprotocol/sdk',
    replacementVersion: '^1.0.0',
    migrationSteps: [
      'Uninstall @djed/mcp-base',
      'Install @modelcontextprotocol/sdk',
      'Update imports',
      'Implement MCP server directly',
      'Test MCP protocol functionality'
    ],
    codeChanges: [
      {
        from: `import { MCPServer } from '@djed/mcp-base';`,
        to: `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';`,
        description: 'Replace Djed MCP wrapper with SDK'
      }
    ]
  },
  'shared-types': {
    npmName: '@djed/shared-types',
    replacement: 'none',
    replacementVersion: 'n/a',
    migrationSteps: [
      'Uninstall @djed/shared-types',
      'Copy type definitions to your project',
      'Update imports to local types',
      'Test TypeScript compilation'
    ],
    codeChanges: [
      {
        from: `import type { Result } from '@djed/shared-types';`,
        to: `// Copy type definitions to your project
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };`,
        description: 'Use local type definitions'
      }
    ]
  }
};

export async function ejectCommand(
  packageName: string,
  options: EjectOptions
): Promise<void> {
  try {
    logger.blank();
    logger.info(chalk.bold(`Ejecting @djed/${packageName}`));
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
      process.exit(1);
    }

    const config = EJECT_CONFIGS[packageName];

    // Check if package is installed
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    const hasPackage =
      packageJson.dependencies?.[config.npmName] ||
      packageJson.devDependencies?.[config.npmName];

    if (!hasPackage) {
      logger.warning(`${config.npmName} is not installed in this project`);
      process.exit(0);
    }

    // Show what will be changed
    logger.step(chalk.yellow('Migration Plan:'));
    logger.blank();
    config.migrationSteps.forEach((step, i) => {
      logger.info(`  ${i + 1}. ${step}`);
    });
    logger.blank();

    logger.step(chalk.yellow('Code Changes Required:'));
    logger.blank();
    config.codeChanges.forEach((change, i) => {
      logger.info(chalk.dim(`  Change ${i + 1}: ${change.description}`));
      logger.blank();
      logger.info(chalk.red('  - From:'));
      logger.info(chalk.dim('    ' + change.from.split('\n').join('\n    ')));
      logger.blank();
      logger.info(chalk.green('  + To:'));
      logger.info(chalk.dim('    ' + change.to.split('\n').join('\n    ')));
      logger.blank();
    });

    // Dry run exit
    if (options.dryRun) {
      logger.info(chalk.yellow('Dry run complete. No changes made.'));
      logger.blank();
      logger.info('Remove --dry-run flag to perform ejection');
      logger.blank();
      return;
    }

    // Confirmation
    if (!options.yes) {
      logger.warning(chalk.bold('⚠️  This operation will modify your project'));
      logger.blank();

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Eject ${config.npmName} and replace with ${config.replacement}?`,
          default: false
        }
      ]);

      if (!confirm) {
        logger.info('Operation cancelled');
        process.exit(0);
      }
    }

    // Perform ejection
    logger.blank();

    // Step 1: Uninstall Djed package
    const uninstallSpinner = logger.spinner(`Uninstalling ${config.npmName}...`);
    try {
      await execa('npm', ['uninstall', config.npmName]);
      uninstallSpinner.succeed(`${config.npmName} uninstalled`);
    } catch (error: any) {
      uninstallSpinner.fail('Uninstall failed');
      logger.error(error.message);
      process.exit(1);
    }

    // Step 2: Install replacement (if applicable)
    if (config.replacement !== 'none') {
      const installSpinner = logger.spinner(`Installing ${config.replacement}...`);
      try {
        await execa('npm', ['install', `${config.replacement}@${config.replacementVersion}`]);

        // Install additional dependencies
        if (packageName === 'validator') {
          await execa('npm', ['install', 'ajv-formats']);
        }

        installSpinner.succeed(`${config.replacement} installed`);
      } catch (error: any) {
        installSpinner.fail('Installation failed');
        logger.error(error.message);
        process.exit(1);
      }
    }

    // Step 3: Create migration guide
    const guideSpinner = logger.spinner('Creating migration guide...');
    try {
      const guidePath = path.join(process.cwd(), `EJECT-${packageName.toUpperCase()}.md`);
      const guideContent = generateMigrationGuide(packageName, config);
      await fs.writeFile(guidePath, guideContent, 'utf-8');
      guideSpinner.succeed(`Migration guide created: ${chalk.dim('EJECT-' + packageName.toUpperCase() + '.md')}`);
    } catch (error) {
      guideSpinner.warn('Failed to create migration guide');
    }

    // Success
    logger.blank();
    logger.success(chalk.bold('Ejection complete!'));
    logger.blank();
    logger.step('Next steps:');
    logger.info(`  1. Review migration guide: EJECT-${packageName.toUpperCase()}.md`);
    logger.info('  2. Update your code with the required changes');
    logger.info('  3. Test your application thoroughly');
    logger.blank();
    logger.warning('Make sure to update all imports and usages manually');
    logger.blank();

  } catch (error: any) {
    logger.error(`Ejection failed: ${error.message}`);
    process.exit(1);
  }
}

function generateMigrationGuide(packageName: string, config: EjectConfig): string {
  return `# Migration Guide: Ejecting @djed/${packageName}

**Generated**: ${new Date().toISOString()}

## Summary

You have ejected \`${config.npmName}\` and replaced it with \`${config.replacement}\`.

## Migration Steps

${config.migrationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Code Changes

${config.codeChanges.map((change, i) => `
### Change ${i + 1}: ${change.description}

**Before** (with Djed):
\`\`\`typescript
${change.from}
\`\`\`

**After** (without Djed):
\`\`\`typescript
${change.to}
\`\`\`
`).join('\n')}

## Testing Checklist

- [ ] All imports updated
- [ ] All usages updated
- [ ] Application builds successfully
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Documentation updated

## Rollback

If you need to rollback this ejection:

\`\`\`bash
npm uninstall ${config.replacement}
npm install ${config.npmName}
# Revert code changes
\`\`\`

## Support

If you encounter issues during migration:
- Review Djed documentation: https://github.com/luxor/djed
- Check ${config.replacement} documentation
- Review this migration guide carefully

---

**Note**: This migration was performed by \`djed eject ${packageName}\`
`;
}

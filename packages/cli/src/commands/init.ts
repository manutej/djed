/**
 * djed init command - Initialize new project from template
 *
 * Usage:
 *   djed init mcp-server my-project        (L1 - with name)
 *   djed init mcp-server                   (L2 - interactive)
 *   djed init mcp-server my-project -y     (L3 - skip prompts)
 */

import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import {
  validateProjectName,
  validatePort,
  validateDirectoryEmpty,
  validateTemplate
} from '../utils/validators.js';
import { copyTemplate, getTemplateDir, type TemplateContext } from '../utils/template.js';

interface InitOptions {
  port?: string;
  description?: string;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
}

export async function initCommand(
  template: string,
  name: string | undefined,
  options: InitOptions
): Promise<void> {
  try {
    logger.blank();
    logger.info(chalk.bold('Djed Project Initializer'));
    logger.blank();

    // Validate template
    const templateValidation = validateTemplate(template);
    if (templateValidation !== true) {
      logger.error(templateValidation);
      process.exit(1);
    }

    // Get project details (interactive or from args)
    const projectDetails = await getProjectDetails(name, options);

    // Validate target directory
    const targetDir = path.join(process.cwd(), projectDetails.name);
    const dirValidation = validateDirectoryEmpty(targetDir);
    if (dirValidation !== true) {
      logger.error(dirValidation);
      logger.info(`Use a different name or remove existing directory`);
      process.exit(1);
    }

    // Confirm if not using --yes flag
    if (!options.yes && name) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Create project "${projectDetails.name}" in ./${projectDetails.name}?`,
          default: true
        }
      ]);

      if (!confirm) {
        logger.warning('Operation cancelled');
        process.exit(0);
      }
    }

    // Copy template
    const spinner = logger.spinner('Creating project from template...');
    try {
      const templateDir = getTemplateDir(template);
      const context: TemplateContext = {
        projectName: projectDetails.name,
        description: projectDetails.description,
        port: projectDetails.port,
        author: projectDetails.author || 'LUXOR'
      };

      await copyTemplate(templateDir, targetDir, context);
      spinner.succeed('Project files created');
    } catch (error: any) {
      spinner.fail('Failed to create project files');
      logger.error(error.message);
      process.exit(1);
    }

    // Initialize git
    if (options.git !== false) {
      const gitSpinner = logger.spinner('Initializing git repository...');
      try {
        await execa('git', ['init'], { cwd: targetDir });
        await execa('git', ['add', '.'], { cwd: targetDir });
        await execa('git', ['commit', '-m', 'Initial commit from Djed CLI'], { cwd: targetDir });
        gitSpinner.succeed('Git repository initialized');
      } catch (error) {
        gitSpinner.warn('Git initialization skipped');
      }
    }

    // Install dependencies
    if (options.install !== false) {
      const installSpinner = logger.spinner('Installing dependencies...');
      try {
        await execa('npm', ['install'], { cwd: targetDir });
        installSpinner.succeed('Dependencies installed');
      } catch (error) {
        installSpinner.fail('Failed to install dependencies');
        logger.warning('Run "npm install" manually in the project directory');
      }
    }

    // Success message
    logger.blank();
    logger.success(chalk.bold('Project created successfully!'));
    logger.blank();
    logger.step('Next steps:');
    logger.info(`  cd ${projectDetails.name}`);
    if (options.install === false) {
      logger.info('  npm install');
    }
    logger.info('  npm run dev');
    logger.blank();
    logger.info(chalk.dim('For help: djed --help'));
    logger.blank();

  } catch (error: any) {
    logger.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

async function getProjectDetails(
  name: string | undefined,
  options: InitOptions
): Promise<{
  name: string;
  description: string;
  port: number;
  author?: string;
}> {
  // L1: Name provided, use defaults or options
  if (name && options.yes) {
    return {
      name,
      description: options.description || 'A Djed-powered project',
      port: options.port ? parseInt(options.port) : 3000
    };
  }

  // L2: Interactive prompts
  const questions: any[] = [];

  if (!name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: 'my-djed-project',
      validate: validateProjectName
    });
  }

  if (!options.description) {
    questions.push({
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A Djed-powered project'
    });
  }

  if (!options.port) {
    questions.push({
      type: 'input',
      name: 'port',
      message: 'Server port:',
      default: '3000',
      validate: validatePort
    });
  }

  questions.push({
    type: 'input',
    name: 'author',
    message: 'Author:',
    default: 'LUXOR'
  });

  const answers = await inquirer.prompt(questions);

  return {
    name: name || answers.name,
    description: options.description || answers.description,
    port: options.port ? parseInt(options.port) : parseInt(answers.port),
    author: answers.author
  };
}

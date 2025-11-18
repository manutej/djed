#!/usr/bin/env node

/**
 * Djed CLI - Project scaffolding and management tool
 *
 * Progressive API:
 * - L1 (Novice): Zero-config defaults
 * - L2 (Intermediate): Interactive prompts
 * - L3 (Expert): Full control via flags
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { ejectCommand } from './commands/eject.js';

const program = new Command();

program
  .name('djed')
  .description('CLI tool for scaffolding and managing Djed-based projects')
  .version('0.1.0');

// djed init command
program
  .command('init <template> [name]')
  .description('Initialize a new project from a template')
  .option('-p, --port <port>', 'Server port (default: 3000)')
  .option('-d, --description <desc>', 'Project description')
  .option('--no-install', 'Skip dependency installation')
  .option('--no-git', 'Skip git initialization')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(initCommand);

// djed add command
program
  .command('add <package>')
  .description('Add a Djed package to your project')
  .option('--no-install', 'Skip npm install')
  .option('--no-example', 'Skip generating example usage')
  .action(addCommand);

// djed eject command
program
  .command('eject <package>')
  .description('Replace a Djed package with its raw dependency')
  .option('--dry-run', 'Show what would be changed without making changes')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(ejectCommand);

// Global error handling
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

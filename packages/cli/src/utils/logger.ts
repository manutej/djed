/**
 * Utility functions for CLI logging with colors and spinners
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string) => {
    console.log(chalk.green('✔'), message);
  },

  warning: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string) => {
    console.log(chalk.red('✖'), message);
  },

  step: (message: string) => {
    console.log(chalk.cyan('→'), message);
  },

  blank: () => {
    console.log('');
  },

  spinner: (message: string): Ora => {
    return ora(message).start();
  }
};

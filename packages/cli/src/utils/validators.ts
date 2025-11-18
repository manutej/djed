/**
 * Validation utilities for CLI inputs
 */

import validateNpmPackageName from 'validate-npm-package-name';
import fs from 'fs-extra';
import path from 'path';

export function validateProjectName(name: string): string | true {
  const result = validateNpmPackageName(name);

  if (!result.validForNewPackages) {
    const errors = [...(result.errors || []), ...(result.warnings || [])];
    return `Invalid project name: ${errors.join(', ')}`;
  }

  return true;
}

export function validatePort(port: string): string | true {
  const portNum = parseInt(port, 10);

  if (isNaN(portNum)) {
    return 'Port must be a number';
  }

  if (portNum < 1024 || portNum > 65535) {
    return 'Port must be between 1024 and 65535';
  }

  return true;
}

export function validateDirectoryEmpty(dir: string): string | true {
  if (!fs.existsSync(dir)) {
    return true; // Directory doesn't exist, will be created
  }

  const files = fs.readdirSync(dir);

  // Allow only hidden files like .git, .gitignore
  const nonHiddenFiles = files.filter(f => !f.startsWith('.'));

  if (nonHiddenFiles.length > 0) {
    return `Directory "${dir}" is not empty`;
  }

  return true;
}

export function validatePackageName(packageName: string): string | true {
  const validPackages = ['logger', 'validator', 'mcp-base', 'shared-types'];

  if (!validPackages.includes(packageName)) {
    return `Unknown package "${packageName}". Valid packages: ${validPackages.join(', ')}`;
  }

  return true;
}

export function validateTemplate(template: string): string | true {
  const validTemplates = ['mcp-server', 'docker', 'github'];

  if (!validTemplates.includes(template)) {
    return `Unknown template "${template}". Valid templates: ${validTemplates.join(', ')}`;
  }

  return true;
}

export function isInProject(): boolean {
  // Check if we're in a project by looking for package.json
  const cwd = process.cwd();
  return fs.existsSync(path.join(cwd, 'package.json'));
}

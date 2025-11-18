/**
 * Template processing utilities using Handlebars
 */

import Handlebars from 'handlebars';
import fs from 'fs-extra';
import path from 'path';

export interface TemplateContext {
  projectName: string;
  description?: string;
  port?: number;
  author?: string;
  [key: string]: any;
}

/**
 * Process a file with Handlebars template engine
 */
export function processTemplate(content: string, context: TemplateContext): string {
  const template = Handlebars.compile(content);
  return template(context);
}

/**
 * Recursively copy template directory with variable substitution
 */
export async function copyTemplate(
  templateDir: string,
  targetDir: string,
  context: TemplateContext
): Promise<void> {
  await fs.ensureDir(targetDir);

  const files = await fs.readdir(templateDir);

  for (const file of files) {
    const sourcePath = path.join(templateDir, file);
    const targetPath = path.join(targetDir, file);

    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) {
      // Recursively copy directories
      await copyTemplate(sourcePath, targetPath, context);
    } else {
      // Process file
      const content = await fs.readFile(sourcePath, 'utf-8');

      // Check if file should be processed (avoid binary files)
      if (shouldProcessFile(file)) {
        const processed = processTemplate(content, context);
        await fs.writeFile(targetPath, processed, 'utf-8');
      } else {
        // Copy binary files as-is
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }
}

/**
 * Determine if a file should be processed as a template
 */
function shouldProcessFile(filename: string): boolean {
  const processableExtensions = [
    '.ts', '.js', '.json', '.md', '.yml', '.yaml',
    '.env', '.gitignore', '.prettierrc', '.eslintrc'
  ];

  const ext = path.extname(filename);
  return processableExtensions.includes(ext) || !ext; // Files without extension
}

/**
 * Find template directory
 */
export function getTemplateDir(templateName: string): string {
  // Look for templates in parent directory (djed/templates/)
  const cliDir = path.dirname(path.dirname(__dirname)); // Go up from dist/utils
  const templatesDir = path.join(cliDir, '..', '..', 'templates', templateName);

  if (fs.existsSync(templatesDir)) {
    return templatesDir;
  }

  throw new Error(`Template "${templateName}" not found at ${templatesDir}`);
}

/**
 * @djed/validator
 * JSON schema validation for LUXOR projects
 */

export {
  DjedValidator,
  createValidator,
  createStrictValidator,
  createLenientValidator,
} from './validator.js';

export type { ValidatorConfig } from './validator.js';

export { ValidationError, SchemaCompilationError } from './errors.js';
export type { ValidationErrorDetail } from './errors.js';

export * from './schemas.js';

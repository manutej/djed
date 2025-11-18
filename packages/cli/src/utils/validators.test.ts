/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validatePort,
  validatePackageName,
  validateTemplate
} from './validators';

describe('validateProjectName', () => {
  it('should accept valid project names', () => {
    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('textmate')).toBe(true);
    expect(validateProjectName('khepri')).toBe(true);
    expect(validateProjectName('my-project-123')).toBe(true);
  });

  it('should reject invalid project names', () => {
    expect(validateProjectName('My-Project')).toContain('Invalid project name');
    expect(validateProjectName('my_project!')).toContain('Invalid project name');
    expect(validateProjectName('')).toContain('Invalid project name');
    expect(validateProjectName('123')).toContain('Invalid project name');
  });
});

describe('validatePort', () => {
  it('should accept valid ports', () => {
    expect(validatePort('3000')).toBe(true);
    expect(validatePort('8080')).toBe(true);
    expect(validatePort('1024')).toBe(true);
    expect(validatePort('65535')).toBe(true);
  });

  it('should reject invalid ports', () => {
    expect(validatePort('abc')).toContain('Port must be a number');
    expect(validatePort('80')).toContain('Port must be between');
    expect(validatePort('70000')).toContain('Port must be between');
    expect(validatePort('-1')).toContain('Port must be between');
  });
});

describe('validatePackageName', () => {
  it('should accept valid package names', () => {
    expect(validatePackageName('logger')).toBe(true);
    expect(validatePackageName('validator')).toBe(true);
    expect(validatePackageName('mcp-base')).toBe(true);
    expect(validatePackageName('shared-types')).toBe(true);
  });

  it('should reject invalid package names', () => {
    expect(validatePackageName('unknown')).toContain('Unknown package');
    expect(validatePackageName('random')).toContain('Unknown package');
  });
});

describe('validateTemplate', () => {
  it('should accept valid templates', () => {
    expect(validateTemplate('mcp-server')).toBe(true);
    expect(validateTemplate('docker')).toBe(true);
    expect(validateTemplate('github')).toBe(true);
  });

  it('should reject invalid templates', () => {
    expect(validateTemplate('unknown')).toContain('Unknown template');
    expect(validateTemplate('random')).toContain('Unknown template');
  });
});

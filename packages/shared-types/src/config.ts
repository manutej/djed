/**
 * Configuration type definitions
 */

import { JsonValue } from './common.js';
import { LoggerConfig } from './logging.js';
import { McpTransport } from './mcp.js';

/**
 * Base configuration interface
 */
export interface BaseConfig {
  /**
   * Environment (development, staging, production)
   */
  env: 'development' | 'staging' | 'production';

  /**
   * Application name
   */
  name: string;

  /**
   * Application version
   */
  version: string;

  /**
   * Logging configuration
   */
  logging?: LoggerConfig;

  /**
   * Additional metadata
   */
  metadata?: Record<string, JsonValue>;
}

/**
 * MCP server configuration
 */
export interface McpServerBaseConfig extends BaseConfig {
  /**
   * Transport type
   */
  transport: McpTransport;

  /**
   * Server port (for HTTP/WebSocket)
   */
  port?: number;

  /**
   * Server host (for HTTP/WebSocket)
   */
  host?: string;

  /**
   * Enable CORS (for HTTP)
   */
  cors?: boolean;

  /**
   * Allowed origins (for CORS)
   */
  allowedOrigins?: string[];

  /**
   * Request timeout (milliseconds)
   */
  timeout?: number;

  /**
   * Maximum request size (bytes)
   */
  maxRequestSize?: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /**
   * Database type
   */
  type: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';

  /**
   * Connection string or host
   */
  host: string;

  /**
   * Port
   */
  port?: number;

  /**
   * Database name
   */
  database: string;

  /**
   * Username
   */
  username?: string;

  /**
   * Password
   */
  password?: string;

  /**
   * Connection pool size
   */
  poolSize?: number;

  /**
   * SSL/TLS
   */
  ssl?: boolean;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  /**
   * Redis host
   */
  host: string;

  /**
   * Redis port
   */
  port: number;

  /**
   * Redis password
   */
  password?: string;

  /**
   * Redis database number
   */
  db?: number;

  /**
   * Key prefix
   */
  keyPrefix?: string;
}

/**
 * API configuration
 */
export interface ApiConfig {
  /**
   * API base URL
   */
  baseUrl: string;

  /**
   * API key
   */
  apiKey?: string;

  /**
   * API secret
   */
  apiSecret?: string;

  /**
   * Request timeout
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: {
    attempts: number;
    delay: number; // milliseconds
    backoff?: 'linear' | 'exponential';
  };
}

/**
 * Feature flags
 */
export type FeatureFlags = Record<string, boolean>;

/**
 * Environment variable keys
 */
export type EnvVarKey = string;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
  /**
   * Config file path
   */
  configPath?: string;

  /**
   * Environment variable prefix
   */
  envPrefix?: string;

  /**
   * Validate configuration
   */
  validate?: boolean;

  /**
   * Default values
   */
  defaults?: Partial<BaseConfig>;
}

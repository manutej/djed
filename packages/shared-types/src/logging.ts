/**
 * Logging type definitions
 */

import { JsonValue } from './common.js';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * Log level values for comparison
 */
export const LogLevelValue: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
  [LogLevel.TRACE]: 4,
};

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, JsonValue>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  error(message: string, meta?: Record<string, JsonValue>): void;
  warn(message: string, meta?: Record<string, JsonValue>): void;
  info(message: string, meta?: Record<string, JsonValue>): void;
  debug(message: string, meta?: Record<string, JsonValue>): void;
  trace(message: string, meta?: Record<string, JsonValue>): void;
  child(context: string): Logger;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  context?: string;
  format?: 'json' | 'text';
  destinations?: LogDestination[];
  metadata?: Record<string, JsonValue>;
}

/**
 * Log destination
 */
export type LogDestination = 'console' | 'file' | 'syslog' | 'http';

/**
 * File logger configuration
 */
export interface FileLoggerConfig {
  filename: string;
  maxsize?: number; // bytes
  maxFiles?: number;
  tailable?: boolean;
}

/**
 * HTTP logger configuration
 */
export interface HttpLoggerConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  batchSize?: number;
  batchInterval?: number; // milliseconds
}

/**
 * Type guard for log level
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return Object.values(LogLevel).includes(level as LogLevel);
}

/**
 * Compare log levels
 */
export function shouldLog(configLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LogLevelValue[messageLevel] <= LogLevelValue[configLevel];
}

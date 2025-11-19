/**
 * Application Entry Point
 *
 * This is the main entry point for the MCP server.
 * It demonstrates:
 * - Loading configuration with Either for error handling
 * - Creating logger instance
 * - Starting server with TaskEither
 * - Graceful shutdown
 *
 * Progressive API usage:
 * - Config: L2 (struct with defaults)
 * - Logger: L1 (simple constructor)
 * - Server: TaskEither for async operations
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { Logger } from '@djed/logger';
import { loadConfig } from './config';
import { createServer, setupGracefulShutdown } from './server';

/**
 * Main application bootstrap function
 * Uses functional error handling throughout
 */
async function main(): Promise<void> {
  // Load configuration
  const configResult = loadConfig();

  // Handle configuration errors functionally
  return pipe(
    configResult,
    E.fold(
      // Configuration loading failed
      (error) => {
        console.error('Failed to load configuration:', error.message);
        process.exit(1);
      },
      // Configuration loaded successfully
      (config) => {
        // Create logger with config
        const logger = new Logger('mcp-server', {
          level: config.log.level,
          format: config.log.format,
        });

        logger.info('Starting MCP server', {
          env: config.server.node_env,
          port: config.server.port,
        });

        // Create server instance
        const server = createServer(config, logger);

        // Setup graceful shutdown
        setupGracefulShutdown(server);

        // Start server with functional error handling
        return pipe(
          server.start(),
          TE.fold(
            // Server start failed
            (error) =>
              TE.fromIO(() => {
                logger.error('Failed to start server', { error });
                process.exit(1);
              }),
            // Server started successfully
            () =>
              TE.fromIO(() => {
                logger.info('Server is ready', {
                  port: config.server.port,
                  host: config.server.host,
                });
              })
          )
        )();
      }
    )
  );
}

// Run the application
main().catch((error) => {
  console.error('Unhandled error during startup:', error);
  process.exit(1);
});

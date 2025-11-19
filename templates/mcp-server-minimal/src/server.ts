/**
 * HTTP Server Setup using Express
 *
 * This module sets up an Express server with:
 * - Functional error handling using Either
 * - Structured logging with @djed/logger
 * - Middleware composition
 * - Graceful shutdown
 *
 * The server uses a functional approach where possible,
 * but leverages Express's imperative API when needed.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { Logger } from '@djed/logger';
import { AppConfig } from './config';
import { loggingMiddleware } from './middleware/logging';
import { errorMiddleware } from './middleware/error';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';

/**
 * Server error type
 */
export interface ServerError {
  readonly type: 'SERVER_ERROR';
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Create a server error
 */
export const serverError = (message: string, cause?: unknown): ServerError => ({
  type: 'SERVER_ERROR',
  message,
  cause,
});

/**
 * Server instance with managed lifecycle
 */
export interface Server {
  readonly app: Express;
  readonly logger: Logger;
  readonly config: AppConfig;
  readonly start: () => TE.TaskEither<ServerError, void>;
  readonly stop: () => TE.TaskEither<ServerError, void>;
}

/**
 * Create Express application with middleware and routes
 */
function createExpressApp(config: AppConfig, logger: Logger): Express {
  const app = express();

  // Trust proxy in production (for correct IP addresses behind load balancers)
  if (config.server.node_env === 'production') {
    app.set('trust proxy', 1);
  }

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware (simple implementation)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', config.cors.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (config.cors.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  // Request logging middleware
  app.use(loggingMiddleware(logger));

  // Mount routes
  app.use('/health', healthRouter(config, logger));
  app.use('/api', apiRouter(config, logger));

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      path: req.path,
    });
  });

  // Error handling middleware (must be last)
  app.use(errorMiddleware(logger));

  return app;
}

/**
 * Create a server instance
 *
 * @example
 * import { createServer } from './server';
 * import { loadConfigOrThrow } from './config';
 * import { Logger } from '@djed/logger';
 * import { pipe } from 'fp-ts/function';
 * import * as TE from 'fp-ts/TaskEither';
 *
 * const config = loadConfigOrThrow();
 * const logger = new Logger('mcp-server');
 * const server = createServer(config, logger);
 *
 * pipe(
 *   server.start(),
 *   TE.fold(
 *     (error) => TE.fromIO(() => console.error('Failed to start:', error)),
 *     () => TE.fromIO(() => console.log('Server started'))
 *   )
 * )();
 */
export function createServer(config: AppConfig, logger: Logger): Server {
  const app = createExpressApp(config, logger);
  let serverInstance: ReturnType<Express['listen']> | null = null;

  /**
   * Start the server
   * Returns TaskEither for functional error handling
   */
  const start = (): TE.TaskEither<ServerError, void> =>
    TE.tryCatch(
      () =>
        new Promise<void>((resolve, reject) => {
          try {
            serverInstance = app.listen(
              config.server.port,
              config.server.host,
              () => {
                logger.info('Server started', {
                  port: config.server.port,
                  host: config.server.host,
                  env: config.server.node_env,
                });
                resolve();
              }
            );

            serverInstance.on('error', (error) => {
              logger.error('Server error', { error });
              reject(error);
            });
          } catch (error) {
            reject(error);
          }
        }),
      (error) => serverError('Failed to start server', error)
    );

  /**
   * Stop the server gracefully
   * Returns TaskEither for functional error handling
   */
  const stop = (): TE.TaskEither<ServerError, void> =>
    TE.tryCatch(
      () =>
        new Promise<void>((resolve, reject) => {
          if (!serverInstance) {
            resolve();
            return;
          }

          logger.info('Shutting down server...');

          // Set timeout for forceful shutdown
          const timeout = setTimeout(() => {
            logger.warn('Forcing server shutdown after timeout');
            reject(new Error('Shutdown timeout exceeded'));
          }, config.server.shutdown_timeout);

          serverInstance.close((error) => {
            clearTimeout(timeout);
            if (error) {
              logger.error('Error during shutdown', { error });
              reject(error);
            } else {
              logger.info('Server shut down successfully');
              serverInstance = null;
              resolve();
            }
          });
        }),
      (error) => serverError('Failed to stop server', error)
    );

  return {
    app,
    logger,
    config,
    start,
    stop,
  };
}

/**
 * Setup graceful shutdown handlers
 * Handles SIGTERM and SIGINT for clean shutdown
 */
export function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    server.logger.info(`Received ${signal}, starting graceful shutdown...`);

    const result = await server.stop()();

    pipe(
      result,
      E.fold(
        (error) => {
          server.logger.error('Shutdown failed', { error });
          process.exit(1);
        },
        () => {
          server.logger.info('Shutdown complete');
          process.exit(0);
        }
      )
    );
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    server.logger.error('Uncaught exception', { error });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    server.logger.error('Unhandled rejection', { reason });
    shutdown('unhandledRejection');
  });
}

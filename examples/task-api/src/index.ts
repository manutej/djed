/**
 * Task Management API
 *
 * Example application demonstrating @djed/logger usage
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger, apiLogger } from './logger';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { taskRouter } from './routes/tasks';
import { db } from './models/task';

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Parse JSON bodies
app.use(express.json());

// Request logging (demonstrates @djed/logger middleware integration)
app.use(requestLogger);

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET / - Health check
 */
app.get('/', (req: Request, res: Response) => {
  apiLogger.debug('Health check requested');

  res.json({
    service: 'task-api',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /stats - API statistics
 */
app.get('/stats', (req: Request, res: Response) => {
  const stats = {
    totalTasks: db.count(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  apiLogger.info('Stats requested', {
    requestId: (req as any).requestId,
    totalTasks: stats.totalTasks
  });

  res.json({
    success: true,
    data: stats
  });
});

/**
 * POST /simulate-error - Simulate error (for testing error logging)
 */
app.post('/simulate-error', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  apiLogger.warn('Simulating error', { requestId });

  throw new Error('This is a simulated error for testing');
});

/**
 * Task routes
 */
app.use('/tasks', taskRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Error logger middleware
 */
app.use(errorLogger);

/**
 * Global error handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;

  // Error already logged by errorLogger middleware
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  apiLogger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    requestId
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Start server
 */
function startServer() {
  logger.info('Starting server', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });

  const server = app.listen(PORT, () => {
    logger.info('Server started successfully', {
      port: PORT,
      url: `http://localhost:${PORT}`
    });

    // Log example commands
    logger.info('Try these commands:', {
      health: `curl http://localhost:${PORT}/`,
      createTask: `curl -X POST http://localhost:${PORT}/tasks -H "Content-Type: application/json" -d '{"title":"My first task"}'`,
      listTasks: `curl http://localhost:${PORT}/tasks`,
      stats: `curl http://localhost:${PORT}/stats`
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');

    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      reason,
      promise
    });
  });
}

// Start the server
startServer();

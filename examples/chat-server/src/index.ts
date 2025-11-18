/**
 * WebSocket Chat Server
 *
 * Real-time chat application demonstrating @djed/logger with Socket.io
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { logger, socketLogger } from './logger';
import { handleConnection } from './handlers/socketHandlers';
import { userManager } from './models/user';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files (HTML client)
app.use(express.static(path.join(__dirname, '../public')));

// REST API endpoints

/**
 * GET / - Serve chat client
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  logger.debug('Health check requested');

  res.json({
    service: 'chat-server',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    connections: io.sockets.sockets.size,
    users: userManager.count()
  });
});

/**
 * GET /stats - Server statistics
 */
app.get('/stats', (req, res) => {
  const stats = {
    connections: io.sockets.sockets.size,
    users: userManager.count(),
    usersByRoom: {} as Record<string, number>,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Count users by room
  const allUsers = userManager.getAllUsers();
  allUsers.forEach((user) => {
    stats.usersByRoom[user.room] = (stats.usersByRoom[user.room] || 0) + 1;
  });

  logger.info('Stats requested', {
    connections: stats.connections,
    users: stats.users,
    rooms: Object.keys(stats.usersByRoom).length
  });

  res.json({
    success: true,
    data: stats
  });
});

/**
 * GET /rooms - List active rooms
 */
app.get('/rooms', (req, res) => {
  const allUsers = userManager.getAllUsers();
  const roomsMap = new Map<string, { name: string; userCount: number; users: string[] }>();

  allUsers.forEach((user) => {
    if (!roomsMap.has(user.room)) {
      roomsMap.set(user.room, {
        name: user.room,
        userCount: 0,
        users: []
      });
    }

    const room = roomsMap.get(user.room)!;
    room.userCount++;
    room.users.push(user.username);
  });

  const rooms = Array.from(roomsMap.values());

  logger.info('Rooms listed', {
    roomCount: rooms.length,
    totalUsers: allUsers.length
  });

  res.json({
    success: true,
    count: rooms.length,
    data: rooms
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  handleConnection(io, socket);
});

// Start server
function startServer() {
  logger.info('Starting chat server', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });

  httpServer.listen(PORT, () => {
    logger.info('Chat server started successfully', {
      port: PORT,
      url: `http://localhost:${PORT}`
    });

    logger.info('Try these:', {
      client: `http://localhost:${PORT}/`,
      health: `curl http://localhost:${PORT}/health`,
      stats: `curl http://localhost:${PORT}/stats`,
      rooms: `curl http://localhost:${PORT}/rooms`
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');

    // Close socket connections
    io.close(() => {
      socketLogger.info('All socket connections closed');

      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
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

  // Log periodic stats
  setInterval(() => {
    socketLogger.debug('Periodic stats', {
      connections: io.sockets.sockets.size,
      users: userManager.count()
    });
  }, 60000); // Every minute
}

// Start the server
startServer();

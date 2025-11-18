/**
 * Socket.io Event Handlers
 *
 * Demonstrates @djed/logger in WebSocket event handling
 */

import { Server, Socket } from 'socket.io';
import { socketLogger, roomLogger, messageLogger } from '../logger';
import { userManager, User, Message } from '../models/user';

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle new socket connection
 */
export function handleConnection(io: Server, socket: Socket): void {
  const socketId = socket.id;

  socketLogger.info('Client connected', {
    socketId,
    address: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });

  /**
   * Handle user joining a room
   */
  socket.on('join', (data: { username: string; room: string }) => {
    const { username, room } = data;

    // Create user
    const user: User = {
      id: socketId,
      username,
      room,
      connectedAt: new Date()
    };

    userManager.add(user);

    // Join socket.io room
    socket.join(room);

    roomLogger.info('User joined room', {
      socketId,
      username,
      room,
      roomSize: userManager.roomCount(room)
    });

    // Notify room
    socket.to(room).emit('user-joined', {
      username,
      timestamp: new Date()
    });

    // Send room info to user
    const roomUsers = userManager.getByRoom(room);
    socket.emit('room-info', {
      room,
      users: roomUsers.map((u) => ({ username: u.username, connectedAt: u.connectedAt })),
      userCount: roomUsers.length
    });
  });

  /**
   * Handle chat message
   */
  socket.on('message', (data: { text: string }) => {
    const user = userManager.get(socketId);

    if (!user) {
      socketLogger.warn('Message from unknown user', {
        socketId,
        text: data.text
      });
      return;
    }

    const message: Message = {
      id: generateMessageId(),
      userId: user.id,
      username: user.username,
      room: user.room,
      text: data.text,
      timestamp: new Date()
    };

    messageLogger.info('Message sent', {
      messageId: message.id,
      socketId,
      username: user.username,
      room: user.room,
      textLength: message.text.length
    });

    // Broadcast to room
    io.to(user.room).emit('message', {
      id: message.id,
      username: message.username,
      text: message.text,
      timestamp: message.timestamp
    });
  });

  /**
   * Handle typing indicator
   */
  socket.on('typing', (isTyping: boolean) => {
    const user = userManager.get(socketId);

    if (!user) return;

    socketLogger.debug('Typing status', {
      socketId,
      username: user.username,
      room: user.room,
      isTyping
    });

    socket.to(user.room).emit('user-typing', {
      username: user.username,
      isTyping
    });
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', (reason: string) => {
    const user = userManager.remove(socketId);

    if (user) {
      const duration = Date.now() - user.connectedAt.getTime();

      socketLogger.info('Client disconnected', {
        socketId,
        username: user.username,
        room: user.room,
        reason,
        duration: `${duration}ms`,
        remainingInRoom: userManager.roomCount(user.room)
      });

      // Notify room
      io.to(user.room).emit('user-left', {
        username: user.username,
        timestamp: new Date()
      });

      roomLogger.info('User left room', {
        socketId,
        username: user.username,
        room: user.room,
        roomSize: userManager.roomCount(user.room)
      });
    } else {
      socketLogger.info('Unknown client disconnected', {
        socketId,
        reason
      });
    }
  });

  /**
   * Handle errors
   */
  socket.on('error', (error: Error) => {
    socketLogger.error('Socket error', {
      socketId,
      error: error.message,
      stack: error.stack
    });
  });
}

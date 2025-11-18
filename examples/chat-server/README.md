# WebSocket Chat Server - @djed/logger Example

**Real-time chat application demonstrating [@djed/logger](https://github.com/manutej/djed/tree/main/packages/logger) in WebSocket/event-driven context**

This example shows how to integrate @djed/logger into a real-time Socket.io application, with different logging patterns than REST APIs.

---

## Features Demonstrated

### Real-Time Logging Patterns
- ✅ **Connection/disconnection logging** with session duration
- ✅ **Message flow tracking** with message IDs
- ✅ **Room/channel management** logging
- ✅ **User activity tracking** (join, leave, typing)
- ✅ **Event-driven logging** (WebSocket events)
- ✅ **Module-specific loggers** (socket, room, message)
- ✅ **Performance metrics** (connection duration, message frequency)

### Chat Features
- ✅ **Multi-room support** (users can join different rooms)
- ✅ **Real-time messaging** (instant message delivery)
- ✅ **Typing indicators** (see when others are typing)
- ✅ **User presence** (see who's online in the room)
- ✅ **System notifications** (user join/leave events)
- ✅ **Beautiful web interface** (responsive HTML client)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Server

```bash
npm run dev
```

**Expected Output**:
```
info: Logger initialized environment=development logLevel=debug fileLogging=false
info: Starting chat server port=3000 environment=development
info: Chat server started successfully port=3000 url=http://localhost:3000
info: Try these: client=http://localhost:3000/ health=curl http://localhost:3000/health
```

### 3. Open the Chat Client

**Browser**: Open `http://localhost:3000/` in multiple browser windows/tabs

1. Enter a username
2. Join a room (default: "general")
3. Start chatting!

**Try opening 3-4 browser windows to see real-time messaging in action**

---

## Project Structure

```
chat-server/
├── src/
│   ├── index.ts                    # Main server + HTTP endpoints
│   ├── logger.ts                   # Logger configuration (socket, room, message loggers)
│   ├── models/
│   │   └── user.ts                 # User model + UserManager
│   └── handlers/
│       └── socketHandlers.ts       # Socket.io event handlers (with extensive logging)
├── public/
│   └── index.html                  # Chat client UI
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Chat client UI |
| GET | `/health` | Health check + connection count |
| GET | `/stats` | Server statistics (users, rooms, uptime) |
| GET | `/rooms` | List active rooms and users |

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{username, room}` | Join a chat room |
| `message` | `{text}` | Send a message |
| `typing` | `boolean` | Update typing status |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-info` | `{room, users, userCount}` | Room information on join |
| `user-joined` | `{username, timestamp}` | User joined the room |
| `user-left` | `{username, timestamp}` | User left the room |
| `message` | `{id, username, text, timestamp}` | New message |
| `user-typing` | `{username, isTyping}` | Typing indicator |

---

## Logging Examples

### Connection Logging

**User connects**:
```
info: Client connected socketId=abc123 address=::ffff:127.0.0.1 userAgent=Mozilla/5.0...
```

**User joins room**:
```
info: User joined room socketId=abc123 username=Alice room=general roomSize=1
```

**User leaves**:
```
info: Client disconnected socketId=abc123 username=Alice room=general reason=transport close duration=45000ms remainingInRoom=0
```

---

### Message Logging

```
info: Message sent messageId=msg_1699... socketId=abc123 username=Alice room=general textLength=15
```

**Benefits**:
- Track message flow
- Monitor message frequency
- Identify spam/abuse patterns
- Debug message delivery issues

---

### Room Management Logging

```
info: User joined room socketId=abc123 username=Alice room=general roomSize=3
info: User left room socketId=def456 username=Bob room=general roomSize=2
```

**Benefits**:
- Monitor room populations
- Track user distribution
- Identify popular rooms
- Debug room logic

---

### Typing Indicator Logging (Debug Level)

```
debug: Typing status socketId=abc123 username=Alice room=general isTyping=true
debug: Typing status socketId=abc123 username=Alice room=general isTyping=false
```

**Note**: Debug level prevents log spam from frequent typing events

---

## Module-Specific Loggers

### Socket Logger (`socketLogger`)
**Purpose**: Connection lifecycle events

```typescript
import { socketLogger } from './logger';

socketLogger.info('Client connected', { socketId, address });
socketLogger.info('Client disconnected', { socketId, duration });
```

---

### Room Logger (`roomLogger`)
**Purpose**: Room management events

```typescript
import { roomLogger } from './logger';

roomLogger.info('User joined room', { username, room, roomSize });
roomLogger.info('User left room', { username, room, roomSize });
```

---

### Message Logger (`messageLogger`)
**Purpose**: Chat message tracking

```typescript
import { messageLogger } from './logger';

messageLogger.info('Message sent', {
  messageId,
  username,
  room,
  textLength
});
```

---

## Testing the Chat

### Single Window Testing

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Check stats
curl http://localhost:3000/stats

# Browser: Open http://localhost:3000/
```

---

### Multi-User Testing

1. **Open 3 browser windows** (or tabs)
2. **Window 1**: Username: "Alice", Room: "general"
3. **Window 2**: Username: "Bob", Room: "general"
4. **Window 3**: Username: "Charlie", Room: "tech"

**Watch the logs** in your terminal running `npm run dev`:

```
info: Client connected socketId=abc123 ...
info: User joined room username=Alice room=general roomSize=1
info: Client connected socketId=def456 ...
info: User joined room username=Bob room=general roomSize=2
info: Message sent username=Alice room=general textLength=12
info: Message sent username=Bob room=general textLength=8
```

---

### Testing Disconnections

1. Close a browser window
2. **Watch the logs**:

```
info: Client disconnected socketId=abc123 username=Alice room=general reason=transport close duration=120000ms remainingInRoom=1
info: User left room username=Alice room=general roomSize=1
```

**Notice**: Duration tracking, reason capture, remaining user count

---

## Production Deployment

### Build for Production

```bash
npm run build
```

### Run in Production

```bash
NODE_ENV=production npm start
```

**Production Features**:
- JSON logging to files
- Log rotation (daily, compressed)
- Separate error log file
- Info-level logging (less noise)

**Log Files**:
- `logs/chat-server.log` - All logs (JSON format)
- `logs/errors.log` - Errors only (JSON format)

---

## Environment Configuration

### Development (.env)

```env
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
```

**Characteristics**:
- Pretty console logs
- Colored output
- Debug-level verbosity
- Typing indicators logged

---

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
PORT=8080
```

**Characteristics**:
- JSON logs to files
- Daily rotation
- Info-level only
- Typing indicators not logged (reduces noise)

---

## What You'll Learn

### 1. Event-Driven Logging

Unlike REST APIs (request/response), WebSocket apps are **event-driven**:

```typescript
socket.on('message', (data) => {
  messageLogger.info('Message received', { ... });
  // Process message
  messageLogger.info('Message sent', { ... });
});
```

**Key Insight**: Log at event boundaries (receive, process, send)

---

### 2. Connection Lifecycle Tracking

Track the full connection lifecycle:

```typescript
// On connect
socketLogger.info('Client connected', { socketId, timestamp: new Date() });

// On disconnect
const duration = Date.now() - startTime;
socketLogger.info('Client disconnected', { socketId, duration });
```

**Key Insight**: Duration tracking reveals user engagement patterns

---

### 3. Real-Time Metrics

Monitor live metrics:

```typescript
// Every minute
setInterval(() => {
  socketLogger.debug('Periodic stats', {
    connections: io.sockets.sockets.size,
    users: userManager.count()
  });
}, 60000);
```

**Key Insight**: Periodic logging helps monitor system health

---

### 4. Module Organization

Separate loggers for different concerns:

```typescript
export const socketLogger = new Logger('chat-server:socket', options);
export const roomLogger = new Logger('chat-server:room', options);
export const messageLogger = new Logger('chat-server:message', options);
```

**Key Insight**: Easy filtering in production (grep for "room" logs)

---

## Debugging Tips

### Filter Logs by Module

```bash
# Development
npm run dev | grep "socket"     # Connection logs only
npm run dev | grep "message"    # Message logs only
npm run dev | grep "room"       # Room logs only
```

### Production Log Analysis

```bash
# Count messages per hour
cat logs/chat-server.log | grep "Message sent" | grep "2025-11-03T10" | wc -l

# Find error patterns
cat logs/errors.log | jq '.message' | sort | uniq -c | sort -rn

# Track room populations
cat logs/chat-server.log | grep "User joined room" | jq '.room' | sort | uniq -c
```

---

## Comparison with REST API Example

| Aspect | REST API (task-api) | WebSocket (chat-server) |
|--------|---------------------|-------------------------|
| **Pattern** | Request/Response | Event-Driven |
| **Logging** | Per request | Per event |
| **IDs** | Request ID | Socket ID + Message ID |
| **Duration** | Request duration | Connection duration |
| **State** | Stateless | Stateful (connections) |
| **Metrics** | Response time | Active connections |

**Both examples** demonstrate @djed/logger best practices, adapted to their architecture.

---

## Troubleshooting

### Issue: "Cannot find module '@djed/logger'"

**Solution**:
```bash
# Link local package
cd ../../packages/logger && npm link
cd - && npm link @djed/logger
```

---

### Issue: CORS errors in browser

**Cause**: Socket.io CORS configuration

**Solution**: Already configured in `src/index.ts`:
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
```

---

### Issue: Messages not appearing

1. **Check browser console** for errors
2. **Check server logs** for connection events
3. **Verify Socket.io version** matches client and server

---

## Next Steps

### Enhance This Example
- Add authentication (JWT tokens)
- Add message persistence (database)
- Add file uploads
- Add private messaging
- Add message reactions
- Add user profiles

### Explore More Logging
- Add log aggregation (ELK, Splunk)
- Add real-time monitoring (Datadog, Grafana)
- Add alerting (threshold-based)
- Add analytics (user behavior, message patterns)

---

## Resources

- **@djed/logger Documentation**: [GitHub](https://github.com/manutej/djed/tree/main/packages/logger)
- **Socket.io Documentation**: [socket.io](https://socket.io/docs/)
- **Example Summary**: [EXAMPLE_SUMMARY.md](EXAMPLE_SUMMARY.md)
- **REST API Example**: [../task-api/](../task-api/)

---

## License

MIT - See LICENSE file in monorepo

---

**Built with ❤️ to demonstrate @djed/logger in real-time applications**

Questions or feedback? [Open an issue](https://github.com/manutej/djed/issues)

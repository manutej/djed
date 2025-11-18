# Djed Examples

**Real-world examples demonstrating Djed packages in production-ready applications**

---

## 📚 Available Examples

### 1. Task Management API (`task-api/`)

**Demonstrates**: [@djed/logger](../packages/logger/) in **REST API** context

**What it is**: Complete REST API for task management using Express.js + TypeScript

**What you'll learn**:
- Progressive API usage (L1 Novice → L2 Intermediate → L3 Expert)
- Request/response logging patterns
- Module-specific loggers
- Production deployment with Docker
- Error handling and tracking
- Performance monitoring

**Quick Start**:
```bash
cd task-api
npm install
npm run dev

# In another terminal
./demo.sh
```

**Documentation**:
- [README.md](task-api/README.md) - Complete guide
- [EXAMPLE_SUMMARY.md](task-api/EXAMPLE_SUMMARY.md) - Project overview
- [QUICK_REFERENCE.md](task-api/QUICK_REFERENCE.md) - One-page cheat sheet

**Stats**:
- **Lines of Code**: 575 TypeScript
- **Documentation**: 350+ lines
- **Endpoints**: 9 fully functional
- **Files**: 12 source files
- **Docker**: ✅ Ready to deploy

---

### 2. WebSocket Chat Server (`chat-server/`)

**Demonstrates**: [@djed/logger](../packages/logger/) in **WebSocket/Real-Time** context

**What it is**: Real-time chat application using Socket.io + Express + TypeScript

**What you'll learn**:
- Event-driven logging patterns
- Connection lifecycle tracking
- Real-time message logging
- Room/channel management logging
- Module-specific loggers (socket, room, message)
- High-frequency event handling (typing indicators)
- Production real-time metrics

**Quick Start**:
```bash
cd chat-server
npm install
npm run dev

# Open browser
open http://localhost:3000/
```

**Documentation**:
- [README.md](chat-server/README.md) - Complete guide
- [EXAMPLE_SUMMARY.md](chat-server/EXAMPLE_SUMMARY.md) - Project overview

**Stats**:
- **Lines of Code**: 461 TypeScript, 331 HTML/CSS/JS
- **Documentation**: 500+ lines
- **Socket Events**: 6 fully functional
- **Files**: 8 source files
- **Real-Time**: ✅ Multi-user chat

---

## 🎯 How to Use These Examples

### For Learning
1. **Read the README** - Understand what the example demonstrates
2. **Run the demo** - See it in action
3. **Read the code** - Follow the patterns
4. **Modify and experiment** - Make it your own

### For Building
1. **Copy the structure** - Use as a template
2. **Replace business logic** - Keep the infrastructure patterns
3. **Adjust to your needs** - Adapt configuration
4. **Deploy** - It's production-ready

---

## 📦 Example Template Structure

Each example follows this structure:

```
example-name/
├── src/                    # Source code
├── README.md               # Complete documentation
├── EXAMPLE_SUMMARY.md      # Project overview
├── QUICK_REFERENCE.md      # One-page reference
├── demo.sh                 # Interactive demo
├── Dockerfile              # Docker support
├── docker-compose.yml      # Docker Compose
├── package.json
└── tsconfig.json
```

**Why this structure?**
- **src/** - Clean, organized code
- **README.md** - In-depth learning
- **SUMMARY.md** - Quick understanding
- **REFERENCE.md** - Fast lookup
- **demo.sh** - See it working
- **Docker** - Deploy anywhere

---

## 🌟 Coming Soon

More examples demonstrating additional Djed packages:

### Phase 2A Examples
- **Config API** - Using @djed/config for environment management
- **Error Handling API** - Using @djed/errors for structured errors
- **HTTP Client Example** - Using @djed/http-client with retry and logging

### Phase 2B Examples
- **MCP Server** - Using mcp-server-minimal template
- **Full-Stack App** - Using express-api-starter template

---

## 💡 Learning Path

**Beginner** → Start with `task-api/`
- Learn @djed/logger basics
- Understand REST API patterns
- See production deployment
- Master request/response logging

**Intermediate** → Continue with `chat-server/`
- Event-driven logging patterns
- WebSocket/real-time architecture
- Connection lifecycle tracking
- High-frequency event handling

**Advanced** → Coming soon
- Multi-package integration (@djed/config, @djed/errors)
- Full template customization
- Multi-service architecture
- Production monitoring and alerting

---

## 🚀 Quick Commands

```bash
# Task API example (REST)
cd task-api && npm install && npm run dev
cd task-api && ./demo.sh

# Chat Server example (WebSocket)
cd chat-server && npm install && npm run dev
# Then open http://localhost:3000/ in multiple browser windows

# Docker deployment (task-api)
cd task-api && docker-compose up
```

---

## 📊 Example Quality Standards

All examples meet these criteria:

**Code Quality**:
- ✅ TypeScript with strict mode
- ✅ Clean, well-organized structure
- ✅ Comprehensive error handling
- ✅ Production-ready patterns

**Documentation**:
- ✅ README with quick start (< 5 min)
- ✅ API reference
- ✅ Configuration examples
- ✅ Deployment guide

**Deployment**:
- ✅ Docker support
- ✅ Environment configuration
- ✅ Health checks
- ✅ Graceful shutdown

**Learning**:
- ✅ Progressive complexity
- ✅ Real-world patterns
- ✅ Copy-paste ready code
- ✅ Interactive demo

---

## 🤝 Contributing Examples

Want to contribute an example? Great!

**Guidelines**:
1. Follow the template structure above
2. Include comprehensive documentation
3. Provide interactive demo script
4. Ensure Docker support
5. Write for learning (explain why, not just what)

**Suggested Examples**:
- Authentication service using @djed packages
- GraphQL API with logging
- Microservices communication
- Real-time WebSocket server
- Background job processor

---

## 📚 Resources

- **Djed Packages**: [../packages/](../packages/)
- **Documentation**: Each package's README
- **Phase 2 Roadmap**: [../PHASE_2_ROADMAP.md](../PHASE_2_ROADMAP.md)
- **Quality Criteria**: [../QUALITATIVE_SUCCESS_CRITERIA.md](../QUALITATIVE_SUCCESS_CRITERIA.md)

---

## ✨ Summary

These examples are **complete, production-ready demonstrations** of Djed packages that:

1. **Teach** best practices through working code
2. **Demonstrate** real-world patterns
3. **Provide** templates for your projects
4. **Document** every decision
5. **Deploy** to production

**Start with `task-api/` (REST API) and `chat-server/` (WebSocket) to see @djed/logger in different architectures!** 🚀

---

**Examples**: 2 complete examples
**Total Code**: 1,036 lines TypeScript, 331 lines HTML/CSS/JS
**Documentation**: 850+ lines per example
**Architectures**: REST API + WebSocket/Real-Time
**Status**: ✅ Ready to use

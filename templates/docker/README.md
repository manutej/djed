# Docker Template

Docker configuration for MCP servers using multi-stage builds and docker-compose.

## Files

- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - Service orchestration
- `.dockerignore` - Files to exclude from build

## Usage

### Build and Run

```bash
# Build the image
docker-compose build

# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Development

For development, you can mount the source code:

```yaml
volumes:
  - ./src:/app/src
  - ./dist:/app/dist
```

Then run with watch mode:

```yaml
command: npm run dev
```

### Environment Variables

Create a `.env` file:

```env
NODE_ENV=production
LOG_LEVEL=info
```

### Customization

#### Add Database

Uncomment the `database` service in `docker-compose.yml`:

```yaml
database:
  image: postgres:16-alpine
  environment:
    - POSTGRES_USER=user
    - POSTGRES_PASSWORD=password
    - POSTGRES_DB=database
```

#### Add Redis

Uncomment the `redis` service in `docker-compose.yml`.

#### Change Port

If using HTTP/WebSocket transport, uncomment the `ports` section:

```yaml
ports:
  - "3000:3000"
```

## Best Practices

1. **Multi-stage builds**: Separate build and runtime for smaller images
2. **Non-root user**: Run as `nodejs` user for security
3. **Layer caching**: Copy `package.json` first for better caching
4. **Health checks**: Add health checks for reliability
5. **Resource limits**: Set CPU and memory limits
6. **Volume mounts**: Persist logs and data

## Production

For production deployment:

1. Use specific image tags (not `latest`)
2. Enable restart policies
3. Set resource limits
4. Configure health checks
5. Use secrets for sensitive data
6. Enable logging drivers

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Security

- Run as non-root user
- Use official base images
- Minimize layers
- Scan for vulnerabilities: `docker scan mcp-server`
- Use secrets instead of environment variables for sensitive data

## Debugging

```bash
# Exec into container
docker-compose exec mcp-server sh

# View logs
docker-compose logs -f mcp-server

# Inspect container
docker inspect {{PROJECT_NAME}}-server
```

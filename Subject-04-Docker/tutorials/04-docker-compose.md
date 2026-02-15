# Tutorial 04: Docker Compose

## Overview
This tutorial covers Docker Compose, a tool for defining and running multi-container Docker applications. You'll learn how to use docker-compose.yml to orchestrate complex applications with multiple services.

## What is Docker Compose?

Docker Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file to configure your application's services, networks, and volumes.

### Key Benefits
- **Single command deployment**: `docker-compose up`
- **Service dependencies**: Automatic startup order
- **Environment isolation**: Separate environments for development, testing, production
- **Volume management**: Persistent data across container restarts
- **Network management**: Automatic service discovery

## docker-compose.yml Structure

### Version and Services
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"

  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: mypassword
```

### Complete Example
```yaml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:

networks:
  default:
    driver: bridge
```

## Service Configuration

### Image vs Build
```yaml
services:
  # Use existing image
  nginx:
    image: nginx:alpine

  # Build from Dockerfile
  web:
    build:
      context: ./web
      dockerfile: Dockerfile.prod

  # Build with args
  api:
    build:
      context: ./api
      args:
        NODE_ENV: production
```

### Ports and Networking
```yaml
services:
  web:
    ports:
      # Host:Container
      - "3000:3000"
      # Random host port
      - "3001"
      # IPv4 only
      - "127.0.0.1:3002:3002"
```

### Environment Variables
```yaml
services:
  db:
    environment:
      # Inline
      POSTGRES_PASSWORD: mypassword
      # From shell environment
      POSTGRES_USER: $DB_USER
      # From file
      POSTGRES_DB: $DB_NAME

    env_file:
      - .env
      - db.env
```

### Volumes
```yaml
services:
  db:
    volumes:
      # Named volume
      - db_data:/var/lib/postgresql/data
      # Bind mount
      - ./data:/var/lib/postgresql/data
      # Read-only
      - ./config:/etc/postgresql:ro

volumes:
  db_data:
    driver: local
```

### Dependencies
```yaml
services:
  web:
    depends_on:
      - db
      - redis
    # Wait for health checks
    depends_on:
      db:
        condition: service_healthy

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Resource Limits
```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Networks

### Custom Networks
```yaml
services:
  web:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend

  cache:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

### Network Configuration
```yaml
networks:
  mynetwork:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: my_bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Docker Compose Commands

### Basic Commands
```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs

# Follow logs
docker-compose logs -f web
```

### Service Management
```bash
# Build images
docker-compose build

# Build without cache
docker-compose build --no-cache

# Start specific service
docker-compose up web

# Scale services
docker-compose up -d --scale web=3

# Execute command in service
docker-compose exec web bash
```

### Cleanup Commands
```bash
# Stop and remove containers, networks
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Remove everything
docker-compose down -v --rmi all --remove-orphans
```

### Configuration
```bash
# Validate configuration
docker-compose config

# Show running services
docker-compose ps

# Show images
docker-compose images

# Show resource usage
docker-compose top
```

## Environment-Specific Configurations

### Multiple Compose Files
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Development Override
```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: myapp:latest
    ports:
      - "3000:3000"

# docker-compose.dev.yml
version: '3.8'
services:
  web:
    build: .
    volumes:
      - .:/app
    environment:
      DEBUG: true
```

### Production Override
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  web:
    image: myapp:v1.0.0
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    environment:
      NODE_ENV: production
```

## Real-World Examples

### Full-Stack Web Application
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:
```

### Microservices Application
```yaml
version: '3.8'

services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "4000:4000"
    depends_on:
      - auth-service
      - user-service

  auth-service:
    build: ./auth-service
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  user-service:
    build: ./user-service
    environment:
      DB_URL: postgres://user:pass@db:5432/users
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - user_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  user_data:
  redis_data:

networks:
  default:
    driver: bridge
```

## Best Practices

### Service Organization
- Group related services together
- Use clear, descriptive service names
- Define dependencies explicitly

### Environment Management
- Use environment files for secrets
- Separate development and production configs
- Use variables for configurable values

### Health Checks
- Implement health checks for stateful services
- Use `depends_on` with `condition: service_healthy`
- Set appropriate timeouts and intervals

### Security
- Don't store secrets in compose files
- Use environment files or secret management
- Limit resource usage
- Use specific image versions

### Performance
- Use appropriate resource limits
- Configure logging appropriately
- Use health checks to prevent cascade failures

## Troubleshooting

### Common Issues
```bash
# Service fails to start
docker-compose logs service_name

# Check service health
docker-compose ps

# Inspect service configuration
docker-compose config

# Check resource usage
docker-compose top
```

### Debugging Commands
```bash
# Run service with different command
docker-compose run --rm web bash

# Override entrypoint
docker-compose run --rm --entrypoint sh db

# View environment variables
docker-compose exec web env
```

## Hands-on Exercises

### Exercise 1: Basic Multi-Container App
1. Create a docker-compose.yml with web server and database
2. Start the services
3. Verify connectivity between services
4. Clean up resources

### Exercise 2: Full-Stack Application
1. Create a complete application stack (frontend, backend, database)
2. Configure networks and volumes
3. Implement health checks
4. Test scaling services

### Exercise 3: Environment Overrides
1. Create base compose file
2. Create development and production overrides
3. Test different configurations

## Next Steps
- [Volumes and Networks Tutorial](../tutorials/05-volumes-networks.md)
- [Workshop: Compose App + Postgres](../workshops/workshop-04-compose-app-postgres.md)

## Additional Resources
- [Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [Sample Applications](https://github.com/docker/awesome-compose)

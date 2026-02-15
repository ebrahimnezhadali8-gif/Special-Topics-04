# Workshop 02: Backend Dockerfile

## Overview
In this workshop, you'll create optimized Dockerfiles for backend applications. You'll work with both Python FastAPI and Node.js Express applications, implementing multi-stage builds and security best practices.

## Prerequisites
- Completed [Docker Hello World Workshop](../workshops/workshop-01-docker-hello-world.md)
- Basic knowledge of Python or Node.js
- Docker installed and running

## Learning Objectives
By the end of this workshop, you will be able to:
- Create optimized Dockerfiles for backend applications
- Implement multi-stage builds
- Apply security best practices
- Optimize image size and build performance

## Workshop Structure

### Part 1: Python FastAPI Application

#### Step 1: Create Application Structure

First, let's create a simple FastAPI application.

```bash
# Create project directory
mkdir fastapi-app
cd fastapi-app

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
EOF

# Create main.py
cat > main.py << EOF
from fastapi import FastAPI

app = FastAPI(title="My FastAPI App", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Hello World from FastAPI!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
EOF
```

#### Step 2: Create Basic Dockerfile

Let's start with a basic Dockerfile.

```dockerfile
# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install dependencies
RUN uv add --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and test:**
```bash
# Build the image
docker build -t fastapi-basic .

# Run the container
docker run -d --name fastapi-app -p 8000:8000 fastapi-basic

# Test the application
curl http://localhost:8000/
curl http://localhost:8000/health
curl http://localhost:8000/items/42?q=test

# Check image size
docker images fastapi-basic
```

#### Step 3: Optimize the Dockerfile

Now let's create an optimized version with best practices.

```dockerfile
# Multi-stage build for Python FastAPI
FROM python:3.11-slim AS builder

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment with uv
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim AS production

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/uv /opt/uv
ENV PATH="/opt/uv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code with correct ownership
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

**Build and compare:**
```bash
# Build optimized image
docker build -t fastapi-optimized .

# Compare sizes
docker images | grep fastapi

# Run optimized container
docker run -d --name fastapi-opt -p 8001:8000 fastapi-optimized

# Test the application
curl http://localhost:8001/
curl http://localhost:8001/health
```

### Part 2: Node.js Express Application

#### Step 1: Create Application Structure

Create a Node.js Express application.

```bash
# Create project directory
mkdir nodejs-app
cd nodejs-app

# Create package.json
cat > package.json << EOF
{
  "name": "nodejs-app",
  "version": "1.0.0",
  "description": "Simple Express.js application",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# Create app.js
cat > app.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello World from Express!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/items/:id', (req, res) => {
  res.json({
    item_id: req.params.id,
    query: req.query.q
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF
```

#### Step 2: Create Optimized Dockerfile

```dockerfile
# Multi-stage build for Node.js Express
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder --chown=nextjs:nodejs /build/node_modules ./node_modules

# Copy application code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

**Create healthcheck.js:**
```javascript
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

**Build and test:**
```bash
# Build the image
docker build -t nodejs-optimized .

# Run the container
docker run -d --name nodejs-app -p 3000:3000 nodejs-optimized

# Test the application
curl http://localhost:3000/
curl http://localhost:3000/health
curl "http://localhost:3000/items/123?q=test"
```

### Part 3: Advanced Optimizations

#### Step 1: Create .dockerignore

```dockerfile
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbnails.db
```

#### Step 2: Implement Build Arguments

```dockerfile
# Use build arguments for flexibility
FROM node:18-alpine AS builder

# Build argument for environment
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Build argument for app version
ARG APP_VERSION=1.0.0
ENV APP_VERSION=$APP_VERSION

WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production

# Pass build args to production stage
ARG NODE_ENV
ARG APP_VERSION
ENV NODE_ENV=$NODE_ENV
ENV APP_VERSION=$APP_VERSION

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /build/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

**Build with arguments:**
```bash
# Build with custom arguments
docker build --build-arg NODE_ENV=development --build-arg APP_VERSION=2.0.0 -t nodejs-v2 .

# Check environment variables
docker run --rm nodejs-v2 env | grep -E "(NODE_ENV|APP_VERSION)"
```

## Challenge Exercises

### Challenge 1: Go Application Dockerfile
1. Create a simple Go web server
2. Implement multi-stage build (build + runtime)
3. Optimize for size using scratch or alpine
4. Add health checks and proper user

### Challenge 2: Java Spring Boot Dockerfile
1. Create a Spring Boot application
2. Use multi-stage build with Maven
3. Implement distroless runtime image
4. Add security hardening

### Challenge 3: Microservices Dockerfile
1. Create Dockerfiles for 3 microservices
2. Use shared base images where possible
3. Implement proper health checks
4. Create docker-compose.yml to orchestrate them

## Verification Checklist

### Python FastAPI
- [ ] Application runs correctly
- [ ] Multi-stage build implemented
- [ ] Non-root user used
- [ ] Health check configured
- [ ] Image size optimized

### Node.js Express
- [ ] Application runs correctly
- [ ] Dependencies properly cached
- [ ] Security best practices applied
- [ ] Health check implemented
- [ ] .dockerignore configured

### Advanced Features
- [ ] Build arguments used
- [ ] Proper signal handling
- [ ] Resource limits considered
- [ ] Image scanning performed

## Troubleshooting

### Common Issues

**"Module not found" in production**
- Ensure all dependencies are in package.json
- Check if devDependencies are excluded in production build

**"Permission denied" errors**
- Check file ownership in COPY commands
- Ensure USER is set before runtime

**Large image sizes**
- Use multi-stage builds
- Clean up package manager cache
- Use smaller base images

**Health checks failing**
- Verify endpoint exists and returns correct status
- Check network connectivity within container

## Performance Benchmarking

```bash
# Compare build times
time docker build -t fastapi-basic .
time docker build -t fastapi-optimized .

# Compare image sizes
docker images | grep -E "(fastapi|nodejs)"

# Test startup times
docker run --rm fastapi-optimized time uvicorn main:app --host 0.0.0.0 --port 8000
```

## Next Steps
- [Docker Compose Tutorial](../tutorials/04-docker-compose.md)
- [Workshop: Crawler Dockerfile](../workshops/workshop-03-crawler-dockerfile.md)

## Additional Resources
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/)
- [Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

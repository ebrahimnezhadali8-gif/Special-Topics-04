# Tutorial 03: Dockerfile Best Practices

## Overview
This tutorial covers Dockerfile creation, optimization techniques, and best practices for building efficient, secure, and maintainable container images.

## Dockerfile Structure

A Dockerfile is a text file containing instructions for building a Docker image. Each instruction creates a new layer in the image.

### Basic Structure
```dockerfile
# Base image
FROM ubuntu:20.04

# Metadata
LABEL maintainer="your-email@example.com"
LABEL version="1.0"

# Working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Expose port
EXPOSE 8000

# Default command
CMD ["python3", "app.py"]
```

## Dockerfile Instructions

### FROM - Base Image
```dockerfile
# Official images
FROM ubuntu:20.04
FROM python:3.9-slim
FROM node:16-alpine

# Custom base images
FROM my-registry.com/base-image:latest

# Multi-stage builds
FROM golang:1.19 AS builder
FROM alpine:latest AS runtime
```

### RUN - Execute Commands
```dockerfile
# Single line
RUN apt-get update

# Multiple commands (recommended)
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Use array syntax for clarity
RUN ["/bin/bash", "-c", "echo hello"]
```

### COPY vs ADD
```dockerfile
# Copy files from build context
COPY package.json .
COPY src/ /app/src/

# Add supports URLs and auto-extraction
ADD https://example.com/file.tar.gz /tmp/
ADD file.tar.gz /tmp/  # Auto-extracts

# Best practice: Use COPY unless you need ADD features
```

### WORKDIR - Working Directory
```dockerfile
# Absolute path
WORKDIR /app

# Relative path (appends to previous WORKDIR)
WORKDIR src

# Current directory is now /app/src
```

### ENV - Environment Variables
```dockerfile
# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use in other instructions
EXPOSE $PORT
CMD ["node", "server.js"]
```

### ARG - Build Arguments
```dockerfile
# Define build argument
ARG VERSION=latest

# Use in other instructions
FROM ubuntu:${VERSION}

# Override at build time
# docker build --build-arg VERSION=20.04
```

### EXPOSE - Port Declaration
```dockerfile
# Single port
EXPOSE 3000

# Multiple ports
EXPOSE 3000 4000

# With protocol (TCP is default)
EXPOSE 443/tcp 80/udp
```

### CMD vs ENTRYPOINT

#### CMD - Default Command
```dockerfile
# Shell form (runs in shell)
CMD python app.py

# Exec form (recommended)
CMD ["python", "app.py"]

# Default parameters (can be overridden)
CMD ["nginx", "-g", "daemon off;"]
```

#### ENTRYPOINT - Container Executable
```dockerfile
# Exec form
ENTRYPOINT ["python", "app.py"]

# With CMD for default arguments
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
```

### USER - Execution User
```dockerfile
# Switch to non-root user
RUN useradd -m appuser
USER appuser

# Use numeric ID
USER 1001
```

### VOLUME - Mount Points
```dockerfile
# Declare volume mount points
VOLUME ["/data", "/logs"]

# Best practice: Let users mount volumes at runtime
```

### LABEL - Metadata
```dockerfile
# Add metadata
LABEL maintainer="team@example.com"
LABEL version="1.0.0"
LABEL description="My application"
```

### ONBUILD - Trigger Instructions
```dockerfile
# Instructions executed when image is used as base
ONBUILD COPY . /app/src/
ONBUILD RUN cd /app/src && npm install
```

## Dockerfile Best Practices

### Layer Optimization

#### Combine RUN Commands
```dockerfile
# Bad: Creates multiple layers
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# Good: Single layer
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

#### Order Instructions for Caching
```dockerfile
# Copy dependency files first
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code after (changes less frequently)
COPY . .
```

### Security Best Practices

#### Use Non-Root Users
```dockerfile
# Create non-root user
RUN useradd -r -u 1001 appuser

# Switch user after privileged operations
USER appuser
```

#### Minimal Base Images
```dockerfile
# Use Alpine for smaller images
FROM node:16-alpine

# Use distroless for even smaller images
FROM gcr.io/distroless/nodejs
```

#### Update Dependencies
```dockerfile
# Update package manager cache and install
RUN apt-get update && apt-get install -y \
    package1 \
    package2 \
    && rm -rf /var/lib/apt/lists/*
```

### Multi-Stage Builds

#### Go Application
```dockerfile
# Build stage
FROM golang:1.19-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o app .

# Runtime stage
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /build/app .
USER appuser
CMD ["./app"]
```

#### Node.js Application
```dockerfile
# Build stage
FROM node:16-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Application-Specific Examples

#### Python FastAPI Application
```dockerfile
FROM python:3.9-slim

# Create non-root user
RUN useradd -m appuser

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Change ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### React Application
```dockerfile
# Build stage
FROM node:16-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /build/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Build Optimization Techniques

### .dockerignore File
```dockerfile
# Node.js
node_modules
npm-debug.log*
.env
.git
README.md

# Python
__pycache__
*.pyc
.env
.git
README.md

# General
.DS_Store
.vscode
.idea
*.log
```

### BuildKit
Enable BuildKit for faster builds:
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
docker build -t my-app .
```

### Build Caching
```bash
# Use build cache
docker build -t my-app .

# Don't use cache
docker build --no-cache -t my-app .

# Use specific cache source
docker build --cache-from my-app:latest -t my-app .
```

## Debugging Dockerfiles

### Troubleshooting Commands
```bash
# Build with verbose output
docker build -t my-app . --progress=plain

# Build specific stage
docker build --target builder -t my-app-builder .

# Inspect build context
tar -tf context.tar.gz
```

### Common Issues
- Build context too large
- Missing dependencies in base image
- Permissions issues
- Cache invalidation problems

## Hands-on Exercises

### Exercise 1: Basic Dockerfile
1. Create a simple Python Flask application
2. Write a Dockerfile with proper layering
3. Build and run the container
4. Optimize the image size

### Exercise 2: Multi-Stage Build
1. Create a Node.js application with build process
2. Implement multi-stage Dockerfile
3. Compare image sizes between single and multi-stage builds

### Exercise 3: Security Hardening
1. Take an existing Dockerfile
2. Add non-root user
3. Use minimal base image
4. Scan for vulnerabilities

## Next Steps
- [Docker Compose Tutorial](../tutorials/04-docker-compose.md)
- [Workshop: Backend Dockerfile](../workshops/workshop-02-backend-dockerfile.md)

## Additional Resources
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Best Practices Guide](https://docs.docker.com/develop/dev-best-practices/)
- [Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

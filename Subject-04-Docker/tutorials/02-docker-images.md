# Tutorial 02: Docker Images

## Overview
This tutorial dives deep into Docker images - how they're built, layered, stored, and managed. Understanding images is crucial for creating efficient, secure, and maintainable containerized applications.

## What is a Docker Image?

A Docker image is a read-only template that contains a set of instructions for creating a container. It includes:
- The application code
- Runtime environment
- System libraries and dependencies
- Configuration files

Images are built from a `Dockerfile` using the `docker build` command.

## Image Layers

Docker images are composed of layers, each representing a change in the filesystem. This layered architecture provides:

### Benefits of Layering
- **Efficiency**: Layers can be shared between images
- **Caching**: Build process can reuse unchanged layers
- **Storage**: Only changed layers need to be stored/transferred
- **Versioning**: Each layer has a unique identifier (hash)

### Layer Types
- **Base Layer**: Contains the operating system
- **Dependency Layers**: Package installations, library updates
- **Application Layer**: Your application code and configuration
- **Configuration Layer**: Environment-specific settings

## Image Registry

### Docker Hub
- Public registry hosted by Docker
- Millions of pre-built images
- Official images from software vendors
- Community-contributed images

### Private Registries
- Harbor
- AWS ECR (Elastic Container Registry)
- Google Container Registry
- Azure Container Registry

## Working with Images

### Pulling Images
```bash
# Pull latest version
docker pull ubuntu

# Pull specific version
docker pull ubuntu:20.04

# Pull from specific registry
docker pull registry.example.com/my-image:tag
```

### Listing Images
```bash
# List all images
docker images

# List images with size information
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# List dangling images (unused layers)
docker images -f dangling=true
```

### Image Inspection
```bash
# Show image details
docker inspect ubuntu:20.04

# Show image history (layers)
docker history ubuntu:20.04

# Show image size breakdown
docker system df -v
```

### Tagging Images
```bash
# Tag an existing image
docker tag ubuntu:20.04 my-registry.com/ubuntu:v1.0

# Tag for multiple environments
docker tag my-app:latest my-app:staging
docker tag my-app:latest my-app:production
```

### Pushing Images
```bash
# Push to Docker Hub (requires login)
docker login
docker push username/my-image:tag

# Push to private registry
docker login registry.example.com
docker push registry.example.com/my-image:tag
```

### Removing Images
```bash
# Remove specific image
docker rmi ubuntu:20.04

# Remove by image ID
docker rmi abc123def456

# Force remove (even if containers use it)
docker rmi -f ubuntu:20.04

# Remove dangling images
docker image prune

# Remove unused images
docker image prune -a
```

## Image Building

### Dockerfile Basics
A Dockerfile contains instructions for building an image:

```dockerfile
# Use official Python image as base
FROM python:3.9-slim

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

# Command to run
CMD ["python", "app.py"]
```

### Build Context
The build context is the directory sent to the Docker daemon during build:

```bash
# Build from current directory
docker build -t my-app .

# Build from specific directory
docker build -t my-app ./my-app-dir

# Build with custom Dockerfile
docker build -f Dockerfile.prod -t my-app:prod .
```

### Build Options
```bash
# Build with no cache
docker build --no-cache -t my-app .

# Build with custom build arguments
docker build --build-arg VERSION=1.0 -t my-app .

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t my-app .
```

## Image Optimization

### Multi-Stage Builds
Multi-stage builds allow you to use multiple `FROM` statements to create smaller final images:

```dockerfile
# Build stage
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:16-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["npm", "start"]
```

### Best Practices for Small Images
- Use appropriate base images (`alpine`, `slim` variants)
- Combine RUN commands to reduce layers
- Clean up package manager cache
- Use `.dockerignore` to exclude unnecessary files

### .dockerignore File
```dockerfile
# Version control
.git
.gitignore

# Documentation
README.md
docs/

# Development files
.env
.vscode/
.idea/

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db

# Node.js
node_modules/
npm-debug.log*

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
uv/
```

## Image Security

### Security Best Practices
- Use official base images
- Scan images for vulnerabilities
- Don't run as root
- Keep images updated
- Use minimal base images
- Multi-stage builds reduce attack surface

### Vulnerability Scanning
```bash
# Scan image with Docker Desktop
docker scan my-image

# Use Trivy (third-party scanner)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock
  aquasecurity/trivy:latest image my-image
```

## Image Versioning Strategies

### Semantic Versioning
- `major.minor.patch` (e.g., `1.2.3`)
- `latest` tag should point to most recent stable version

### Environment-Based Tags
- `dev`, `staging`, `prod`
- `v1.0.0-dev`, `v1.0.0-staging`, `v1.0.0`

### Timestamp-Based Tags
- `2023-12-01-143022`
- Useful for CI/CD pipelines

## Hands-on Exercises

### Exercise 1: Image Exploration
1. Pull the `nginx:latest` image
2. Inspect its layers using `docker history`
3. Check the image size and compare with `nginx:alpine`

### Exercise 2: Custom Image Build
1. Create a simple Node.js application
2. Write a Dockerfile for it
3. Build the image with multiple tags
4. Push to Docker Hub (optional)

### Exercise 3: Multi-Stage Build
1. Create a React application
2. Implement a multi-stage Dockerfile (build + serve)
3. Compare the final image size with single-stage approach

## Next Steps
- [Dockerfile Tutorial](../tutorials/03-dockerfile.md)
- [Workshop: Backend Dockerfile](../workshops/workshop-02-backend-dockerfile.md)

## Additional Resources
- [Docker Image Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

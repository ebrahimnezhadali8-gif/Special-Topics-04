# Tutorial 01: Docker Basics

## Overview
This tutorial introduces the fundamental concepts of Docker, including containers, images, and basic Docker commands. By the end of this tutorial, you'll understand what Docker is and how it differs from traditional virtualization.

## What is Docker?

Docker is a platform for developing, shipping, and running applications inside containers. Containers are lightweight, portable, and self-sufficient environments that include everything needed to run an application.

### Key Concepts

#### Containers vs Virtual Machines
- **Virtual Machines**: Run a full OS on top of a hypervisor, including kernel, libraries, and applications
- **Containers**: Share the host OS kernel but isolate applications and their dependencies

**Advantages of Containers:**
- Faster startup times
- Lower resource overhead
- Better portability
- Consistent environments across development, testing, and production

#### Images vs Containers
- **Image**: A read-only template containing the application and its dependencies
- **Container**: A running instance of an image

#### Docker Architecture
- **Docker Client**: CLI tool for interacting with Docker
- **Docker Daemon**: Background service that manages containers
- **Docker Registry**: Repository for storing and sharing images (Docker Hub)

## Basic Docker Commands

### Working with Images

```bash
# Search for images on Docker Hub
docker search ubuntu

# Pull an image from Docker Hub
docker pull ubuntu:20.04

# List local images
docker images

# Remove an image
docker rmi ubuntu:20.04

# Show image history
docker history ubuntu:20.04
```

### Working with Containers

```bash
# Run a container (downloads image if not present)
docker run ubuntu:20.04 echo "Hello, Docker!"

# Run container in interactive mode
docker run -it ubuntu:20.04 /bin/bash

# Run container in background (detached mode)
docker run -d nginx

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop container_id

# Start a stopped container
docker start container_id

# Remove a container
docker rm container_id

# Remove all stopped containers
docker container prune
```

### Container Lifecycle

```bash
# View container logs
docker logs container_id

# Execute command in running container
docker exec -it container_id /bin/bash

# Copy files between host and container
docker cp file.txt container_id:/path/in/container
docker cp container_id:/path/in/container/file.txt .

# Inspect container details
docker inspect container_id
```

## Common Docker Run Options

### Port Mapping
```bash
# Map host port 8080 to container port 80
docker run -p 8080:80 nginx
```

### Volume Mounting
```bash
# Mount host directory to container
docker run -v /host/path:/container/path ubuntu:20.04
```

### Environment Variables
```bash
# Set environment variable
docker run -e MY_VAR=value ubuntu:20.04
```

### Container Naming
```bash
# Give container a custom name
docker run --name my_container ubuntu:20.04
```

## Docker System Management

```bash
# View system information
docker system info

# Show disk usage
docker system df

# Clean up unused resources
docker system prune

# Clean up everything (use with caution)
docker system prune -a --volumes
```

## Best Practices

### Image Management
- Use specific image tags instead of `latest`
- Keep images small by using appropriate base images
- Regularly clean up unused images and containers

### Security
- Don't run containers as root unless necessary
- Use official images when possible
- Keep images updated
- Limit container privileges

### Development Workflow
- Use `.dockerignore` to exclude unnecessary files
- Mount source code as volumes during development
- Use multi-stage builds for production images

## Hands-on Exercises

### Exercise 1: Hello World
1. Run the official hello-world image
2. Observe the output
3. Check what images are now available locally

### Exercise 2: Interactive Container
1. Start an Ubuntu container in interactive mode
2. Install a package (e.g., `apt update && apt install -y curl`)
3. Exit the container
4. Check the container status
5. Restart the container and verify the package is still installed

### Exercise 3: Web Server
1. Run an Nginx container with port mapping
2. Access the web server from your browser
3. Check container logs
4. Stop and remove the container

## Next Steps
- [Docker Images Tutorial](../tutorials/02-docker-images.md)
- [Workshop: Docker Hello World](../workshops/workshop-01-docker-hello-world.md)

## Additional Resources
- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Docker CLI Reference](https://docs.docker.com/engine/reference/commandline/cli/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

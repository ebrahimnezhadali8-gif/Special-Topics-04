# Workshop 01: Docker Hello World

## Overview
This workshop introduces you to Docker through hands-on exercises. You'll learn basic Docker commands, run your first container, and understand container lifecycle management.

## Prerequisites
- Docker installed and running ([Installation Guide](../installation/docker-setup.md))
- Basic command line knowledge
- 5-10 minutes of time

## Learning Objectives
By the end of this workshop, you will be able to:
- Verify Docker installation
- Run containers from images
- Manage container lifecycle
- Understand basic Docker concepts

## Workshop Steps

### Step 1: Verify Docker Installation

First, let's make sure Docker is properly installed and running.

```bash
# Check Docker version
docker --version

# Check Docker system information
docker system info

# Test Docker with hello-world image
docker run hello-world
```

**Expected Output:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

**What happened?**
- Docker downloaded the `hello-world` image from Docker Hub
- Created and ran a container from that image
- The container printed the message and exited

### Step 2: Explore Docker Images

Let's examine what images are available on your system.

```bash
# List all images
docker images

# Get detailed information about the hello-world image
docker inspect hello-world

# Check image history
docker history hello-world
```

**Questions to consider:**
- How big is the hello-world image?
- What is the image ID?
- When was it created?

### Step 3: Run Interactive Containers

Now let's run containers that you can interact with.

```bash
# Run Ubuntu container in interactive mode
docker run -it ubuntu:20.04

# Inside the container, try these commands:
echo "Hello from Ubuntu container!"
ls -la
whoami
exit
```

**Container Commands:**
```bash
# Update package list
apt update

# Install a package
apt install -y curl

# Test curl
curl --version

# Exit container
exit
```

### Step 4: Container Lifecycle Management

Let's learn how to manage container lifecycle.

```bash
# Run a container in the background
docker run -d --name web nginx:alpine

# Check running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Check container logs
docker logs web

# Stop the container
docker stop web

# Start the container again
docker start web

# Check if it's running
docker ps

# Stop and remove the container
docker stop web
docker rm web
```

### Step 5: Port Mapping

Let's run a web server and access it from your browser.

```bash
# Run Nginx with port mapping
docker run -d --name web -p 8080:80 nginx:alpine

# Check if the container is running
docker ps

# Test the web server
curl http://localhost:8080
```

**In your browser:**
- Open http://localhost:8080
- You should see the Nginx welcome page

### Step 6: Container Inspection

Let's examine container details and configuration.

```bash
# Inspect the running container
docker inspect web

# Check container processes
docker top web

# Check resource usage
docker stats web

# Execute commands in running container
docker exec -it web sh

# Inside the container:
echo "Inside the container!"
ps aux
exit
```

### Step 7: Environment Variables and Commands

Let's see how to pass environment variables and override commands.

```bash
# Run container with environment variable
docker run --rm -e MY_VAR="Hello World" ubuntu:20.04 env | grep MY_VAR

# Override default command
docker run --rm ubuntu:20.04 echo "Custom command executed"

# Run container with custom name
docker run --rm --name my-ubuntu ubuntu:20.04 echo "Named container"
```

### Step 8: Cleanup

Let's clean up the resources we created.

```bash
# Stop the web container
docker stop web

# Remove the container
docker rm web

# Remove unused images
docker image prune -f

# Remove unused containers
docker container prune -f

# Check remaining resources
docker ps -a
docker images
```

## Challenge Exercises

### Challenge 1: Multi-Container Setup
1. Run a PostgreSQL database container
2. Run a pgAdmin container to manage the database
3. Connect pgAdmin to PostgreSQL
4. Verify the connection works

### Challenge 2: Data Persistence
1. Create a named volume
2. Run a container that writes data to the volume
3. Stop and remove the container
4. Run a new container using the same volume
5. Verify the data persists

### Challenge 3: Custom Image
1. Create a simple HTML file
2. Serve it using Nginx
3. Create a custom Dockerfile
4. Build a custom image
5. Run a container from your custom image

## Troubleshooting

### Common Issues

**"docker: command not found"**
- Docker is not installed or not in PATH
- Restart your terminal or system

**"docker: permission denied"**
- On Linux: Add user to docker group: `sudo usermod -aG docker $USER`
- On Windows/Mac: Check Docker Desktop is running

**"docker: no space left on device"**
- Clean up unused resources: `docker system prune -a`

**"docker: port already in use"**
- Change the port mapping: `-p 8081:80` instead of `-p 8080:80`

### Getting Help

```bash
# Get help for any command
docker --help
docker run --help

# Check Docker status
docker system info

# View system resource usage
docker system df
```

## Verification Checklist

- [ ] Docker is installed and running
- [ ] Successfully ran hello-world container
- [ ] Listed Docker images
- [ ] Ran interactive Ubuntu container
- [ ] Managed container lifecycle (start/stop/remove)
- [ ] Exposed container port to host
- [ ] Inspected container details
- [ ] Used environment variables
- [ ] Cleaned up resources

## Next Steps
- [Docker Images Tutorial](../tutorials/02-docker-images.md)
- [Workshop: Backend Dockerfile](../workshops/workshop-02-backend-dockerfile.md)

## Additional Resources
- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Docker Run Reference](https://docs.docker.com/engine/reference/run/)
- [Docker Hub](https://hub.docker.com/)

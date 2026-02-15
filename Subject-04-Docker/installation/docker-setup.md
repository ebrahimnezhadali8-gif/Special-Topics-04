# Docker Installation & Setup Guide

## Overview
This guide covers Docker installation on Windows, macOS, and Linux, along with basic configuration and verification.

## Prerequisites
- Administrator/root privileges for installation
- At least 4GB RAM available
- 2GB free disk space
- Internet connection for downloads

---

## Windows Installation

### Method 1: Docker Desktop (Recommended)
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run the installer (.exe file)
3. Follow installation wizard
4. Enable WSL 2 feature if prompted
5. Restart computer
6. Launch Docker Desktop

### Method 2: Docker Engine (CLI Only)
```powershell
# Install via Chocolatey
choco install docker-cli docker-compose

# Or install via Scoop
scoop install docker docker-compose
```

### Verification
```bash
docker --version
docker run hello-world
```

---

## macOS Installation

### Method 1: Docker Desktop (Recommended)
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Open the .dmg file
3. Drag Docker to Applications
4. Launch Docker Desktop
5. Complete initial setup

### Method 2: Homebrew Installation
```bash
# Install Docker CLI
brew install docker docker-compose

# Install Docker Desktop
brew install --cask docker
```

### Verification
```bash
docker --version
docker run hello-world
```

---

## Linux Installation

### Ubuntu/Debian
```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### CentOS/RHEL
```bash
# Install prerequisites
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Verification
```bash
docker --version
sudo docker run hello-world
```

---

## Post-Installation Setup

### Linux: Add User to Docker Group
```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Test without sudo
docker run hello-world
```

### Configure Docker Daemon
Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

---

## Docker Desktop Configuration

### Resources Allocation
- **CPU**: Allocate at least 2 CPUs
- **Memory**: Allocate at least 4GB RAM
- **Disk**: Allocate at least 20GB

### Advanced Settings
- Enable Kubernetes (optional)
- Enable experimental features (optional)
- Configure proxy settings if needed

---

## Verification & Testing

### Basic Commands Test
```bash
# Version check
docker --version
docker-compose --version

# System info
docker system info

# Test container run
docker run --rm hello-world

# Check running containers
docker ps

# Check images
docker images
```

### Hello World Container
```bash
docker run hello-world
```
Expected output: "Hello from Docker!..."

---

## Troubleshooting

### Docker Desktop Won't Start
- Check virtualization is enabled in BIOS
- Ensure Hyper-V is enabled (Windows)
- Check Docker Desktop logs

### Permission Denied (Linux)
- Ensure user is in docker group: `groups $USER`
- Restart session after adding to group
- Or run with sudo: `sudo docker`

### Cannot Connect to Docker Daemon
```bash
# Check service status
sudo systemctl status docker

# Start service
sudo systemctl start docker

# Enable auto-start
sudo systemctl enable docker
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :port_number

# Kill process
sudo kill -9 PID
```

---

## Development Environment Setup

### Docker Compose Installation
```bash
# Install via package manager
sudo apt install docker-compose-plugin  # Ubuntu/Debian
sudo yum install docker-compose-plugin  # CentOS/RHEL

# Or install standalone
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### VS Code Extensions
- Docker (Microsoft)
- Remote-Containers (Microsoft)

---

## Security Considerations

- Keep Docker updated
- Don't run containers as root
- Use official images when possible
- Scan images for vulnerabilities
- Limit container privileges

---

## Next Steps
1. [Learn Docker fundamentals](../tutorials/01-docker-basics.md)
2. [Create your first container](../workshops/workshop-01-docker-hello-world.md)
3. [Work with Docker images](../tutorials/02-docker-images.md)

---

## Resources
- [Docker Documentation](https://docs.docker.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Hub](https://hub.docker.com/)

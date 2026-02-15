# Tutorial 05: Volumes and Networks

## Overview
This tutorial covers Docker volumes for data persistence and Docker networking for container communication. Understanding these concepts is essential for building robust, scalable containerized applications.

## Docker Volumes

Volumes provide persistent storage that exists independently of container lifecycle. Unlike container filesystems that are ephemeral, volumes persist data across container restarts and removals.

### Types of Volumes

#### Named Volumes
```bash
# Create named volume
docker volume create my-volume

# Use in container
docker run -v my-volume:/data nginx

# Inspect volume
docker volume inspect my-volume

# List volumes
docker volume ls

# Remove volume
docker volume rm my-volume
```

#### Bind Mounts
```bash
# Mount host directory to container
docker run -v /host/path:/container/path nginx

# Read-only bind mount
docker run -v /host/path:/container/path:ro nginx

# Windows bind mount
docker run -v C:\host\path:/container/path nginx
```

#### tmpfs Mounts
```bash
# Temporary filesystem in memory
docker run --tmpfs /tmp nginx

# With size limit
docker run --tmpfs /tmp:size=100m nginx
```

### Volume Management

#### Volume Commands
```bash
# Create volume
docker volume create --name my-vol

# List volumes
docker volume ls

# Inspect volume
docker volume inspect my-vol

# Remove volume
docker volume rm my-vol

# Remove unused volumes
docker volume prune

# Remove all unused volumes
docker volume prune -f
```

#### Volume Drivers
```bash
# Use specific driver
docker volume create --driver local my-vol

# NFS volume
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.1,rw \
  --opt device=:/path/to/dir \
  my-nfs-vol
```

### Data Persistence Strategies

#### Database Data
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:13
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: password

volumes:
  db_data:
```

#### Application Logs
```yaml
services:
  app:
    image: my-app
    volumes:
      - logs:/app/logs

  log-collector:
    image: fluentd
    volumes:
      - logs:/fluentd/log

volumes:
  logs:
```

#### Configuration Files
```yaml
services:
  web:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
```

### Volume Backup and Restore

#### Backup
```bash
# Backup named volume
docker run --rm -v my-vol:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

#### Restore
```bash
# Restore to volume
docker run --rm -v my-vol:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

## Docker Networks

Networks enable containers to communicate with each other and with external networks. Docker provides several network drivers for different use cases.

### Network Types

#### Bridge Network (Default)
```bash
# Create bridge network
docker network create my-bridge

# Connect container to network
docker run -d --network my-bridge --name web nginx

# Connect running container
docker network connect my-bridge web

# Disconnect container
docker network disconnect my-bridge web
```

#### Host Network
```bash
# Use host network (no isolation)
docker run --network host nginx
```

#### None Network
```bash
# Isolated network (no external connectivity)
docker run --network none nginx
```

#### Overlay Network (Swarm)
```bash
# Create overlay network for Swarm
docker network create --driver overlay my-overlay
```

### Network Management

#### Network Commands
```bash
# Create network
docker network create --driver bridge my-net

# List networks
docker network ls

# Inspect network
docker network inspect my-net

# Remove network
docker network rm my-net

# Remove unused networks
docker network prune
```

#### Network Configuration
```bash
# Create network with subnet
docker network create --driver bridge \
  --subnet=172.20.0.0/16 \
  --ip-range=172.20.10.0/24 \
  --gateway=172.20.10.1 \
  my-net

# Connect with specific IP
docker network connect --ip 172.20.10.10 my-net container_name
```

### Service Discovery

#### DNS Resolution
```bash
# Containers can reach each other by name
docker run -d --name db postgres:13
docker run -d --name web --link db nginx

# Web container can connect to db:5432
```

#### Custom DNS
```bash
# Use custom DNS servers
docker run --dns 8.8.8.8 --dns 8.8.4.4 nginx

# Add DNS search domains
docker run --dns-search example.com nginx
```

### Network Security

#### Network Segmentation
```yaml
# docker-compose.yml with network isolation
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

#### Firewall Rules
```bash
# Block external access to database
docker network create --internal backend

# Publish only necessary ports
docker run -p 80:80 -p 443:443 --network backend web
```

## Advanced Networking

### Macvlan Networks
```bash
# Create macvlan network
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  my-macvlan-net
```

### IPv6 Support
```bash
# Enable IPv6
docker network create --ipv6 --subnet=2001:db8::/64 my-ipv6-net
```

### Network Plugins
```bash
# Use third-party network plugins
docker network create --driver weave my-weave-net
```

## Multi-Container Applications

### Complete Application Stack
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    networks:
      - frontend
    depends_on:
      - api

  api:
    build: ./api
    networks:
      - frontend
      - backend
    depends_on:
      - db
    volumes:
      - ./api:/app
      - /app/node_modules

  db:
    image: postgres:13
    networks:
      - backend
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: password

  redis:
    image: redis:alpine
    networks:
      - backend
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

## Troubleshooting

### Volume Issues
```bash
# Check volume usage
docker system df -v

# Inspect volume location
docker volume inspect my-vol

# Check permissions
docker run --rm -v my-vol:/data alpine ls -la /data
```

### Network Issues
```bash
# Check network connectivity
docker exec container_name ping other_container

# Inspect network configuration
docker network inspect bridge

# Check DNS resolution
docker exec container_name nslookup other_container
```

### Common Problems
- **Permission denied**: Check volume permissions
- **Connection refused**: Verify network connectivity
- **DNS resolution failed**: Check network configuration
- **Volume not found**: Ensure volume exists before use

## Best Practices

### Volume Best Practices
- Use named volumes for important data
- Backup critical volumes regularly
- Use bind mounts for development
- Clean up unused volumes periodically

### Network Best Practices
- Use custom networks for multi-container apps
- Segment networks for security
- Use internal networks for backend services
- Publish only necessary ports

### Security Considerations
- Limit container privileges
- Use read-only volumes when possible
- Isolate sensitive services on separate networks
- Regularly update base images

## Hands-on Exercises

### Exercise 1: Volume Management
1. Create a named volume
2. Run a container that writes data to the volume
3. Stop and remove the container
4. Run a new container using the same volume
5. Verify data persistence

### Exercise 2: Network Configuration
1. Create a custom bridge network
2. Run multiple containers on the network
3. Test inter-container communication
4. Connect/disconnect containers dynamically

### Exercise 3: Complete Stack
1. Create a multi-service application
2. Configure volumes for data persistence
3. Set up networks for service isolation
4. Test the complete application

## Next Steps
- [Workshop: Docker Hello World](../workshops/workshop-01-docker-hello-world.md)
- [Workshop: Compose App + Postgres](../workshops/workshop-04-compose-app-postgres.md)

## Additional Resources
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Docker Networks](https://docs.docker.com/network/)
- [Storage Best Practices](https://docs.docker.com/storage/)
- [Network Security](https://docs.docker.com/network/#network-security)

# Workshop 05: Docker Volumes and Networking

## Duration: 90-120 minutes

## Overview
Master Docker data persistence with volumes and container communication with networks. Learn to create robust, interconnected containerized applications.

## Prerequisites
- Completed Workshops 1-4
- Basic understanding of Docker containers
- Familiarity with Docker Compose

## Learning Objectives
By the end of this workshop, you will be able to:
- Create and manage persistent Docker volumes
- Configure different volume types for various use cases
- Design and implement Docker networks
- Enable secure inter-container communication
- Troubleshoot networking issues
- Implement data persistence strategies

---

## Part 1: Docker Volumes Deep Dive

### Section 1.1: Named Volumes

#### Create and Manage Named Volumes
```bash
# Create a named volume
docker volume create my-app-data

# List all volumes
docker volume ls

# Inspect volume details
docker volume inspect my-app-data

# Use volume in a container
docker run -d --name web-app \
  -v my-app-data:/app/data \
  nginx:latest
```

#### Practical Exercise: Database Persistence
```bash
# Create PostgreSQL with persistent volume
docker run -d --name postgres-db \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myapp \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:13

# Create some data
docker exec -it postgres-db psql -U postgres -d myapp \
  -c "CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));"
docker exec -it postgres-db psql -U postgres -d myapp \
  -c "INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Charlie');"

# Stop and remove container
docker stop postgres-db
docker rm postgres-db

# Start new container with same volume - data persists!
docker run -d --name postgres-db-new \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myapp \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:13

# Verify data persistence
docker exec -it postgres-db-new psql -U postgres -d myapp \
  -c "SELECT * FROM users;"
```

### Section 1.2: Bind Mounts

#### Host-Container File Synchronization
```bash
# Mount host directory to container
docker run -d --name dev-container \
  -v $(pwd)/src:/app/src \
  -p 8000:8000 \
  python:3.9

# Real-time development workflow
echo "print('Hello from container!')" > src/app.py
docker exec dev-container python /app/src/app.py
```

#### Practical Exercise: Development Environment
```bash
# Create project structure
mkdir docker-dev && cd docker-dev
mkdir src logs

# Create Python app
cat > src/app.py << 'EOF'
from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return f"Hello from container! PID: {os.getpid()}"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOF

# Run with bind mounts
docker run -d --name flask-dev \
  -v $(pwd)/src:/app \
  -v $(pwd)/logs:/app/logs \
  -p 5000:5000 \
  -e FLASK_APP=/app/app.py \
  python:3.9 \
  sh -c "uv add flask && flask run --host=0.0.0.0"

# Test the application
curl http://localhost:5000

# Modify code and see changes instantly
echo "print('Code updated!')" >> src/app.py
```

### Section 1.3: Volume Management Best Practices

#### Volume Cleanup and Maintenance
```bash
# List all volumes with usage
docker volume ls

# Remove unused volumes
docker volume prune

# Remove specific volume
docker volume rm my-volume

# Backup volume data
docker run --rm \
  -v my-volume:/source \
  -v $(pwd)/backup:/backup \
  alpine:latest \
  tar czf /backup/volume-backup.tar.gz -C /source .
```

---

## Part 2: Docker Networking Fundamentals

### Section 2.1: Network Types

#### Bridge Networks (Default)
```bash
# Create custom bridge network
docker network create my-bridge-network

# Connect containers to network
docker run -d --name web1 \
  --network my-bridge-network \
  nginx:latest

docker run -d --name web2 \
  --network my-bridge-network \
  nginx:latest

# Test connectivity
docker exec web1 ping web2
```

#### Host Networking
```bash
# Use host network (no isolation)
docker run -d --name host-app \
  --network host \
  nginx:latest

# Container uses host's network stack directly
curl http://localhost
```

#### None Network (Isolated)
```bash
# Completely isolated container
docker run -d --name isolated \
  --network none \
  alpine:latest sleep 300

# No network interfaces except loopback
docker exec isolated ip addr show
```

### Section 2.2: Network Configuration

#### Static IP Assignment
```bash
# Create network with subnet
docker network create --subnet=172.20.0.0/16 my-custom-net

# Assign static IP
docker run -d --name static-ip-container \
  --network my-custom-net \
  --ip 172.20.0.10 \
  nginx:latest
```

#### Port Publishing and Mapping
```bash
# Multiple port mappings
docker run -d --name multi-port \
  -p 8080:80 \
  -p 8443:443 \
  nginx:latest

# Dynamic port assignment
docker run -d --name dynamic-port \
  -P \
  nginx:latest

# Check assigned ports
docker port dynamic-port
```

---

## Part 3: Multi-Container Applications

### Section 3.1: Manual Container Linking

#### Database + Application Setup
```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  --network my-app-network \
  postgres:13

# Start Redis cache
docker run -d --name redis \
  --network my-app-network \
  redis:alpine

# Start application
docker run -d --name my-app \
  -e DATABASE_URL=postgresql://postgres:secret@postgres:5432/myapp \
  -e REDIS_URL=redis://redis:6379 \
  --network my-app-network \
  -p 8000:8000 \
  my-app:latest
```

### Section 3.2: Docker Compose Networking

#### Complete Application Stack
```yaml
# docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  cache:
    image: redis:alpine
    networks:
      - backend

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://user:password@database:5432/myapp
      REDIS_URL: redis://cache:6379
    volumes:
      - ./api:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - database
      - cache
    networks:
      - backend
      - frontend

  web:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - api
    networks:
      - frontend

volumes:
  postgres_data:

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

### Section 3.3: Service Discovery

#### DNS Resolution in Docker
```bash
# Create network
docker network create app-network

# Start services
docker run -d --name db \
  --network app-network \
  postgres:13

docker run -d --name api \
  --network app-network \
  --link db:database \
  my-api:latest

# API can reach database by name
docker exec api ping db
docker exec api ping database  # Also works due to --link
```

---

## Part 4: Advanced Networking Scenarios

### Section 4.1: Load Balancing

#### Multiple App Instances
```bash
# Create overlay network (for swarm)
docker network create --driver overlay my-overlay-net

# Start multiple app instances
for i in {1..3}; do
  docker run -d --name app-$i \
    --network my-overlay-net \
    my-app:latest
done

# Load balancer configuration (nginx.conf)
cat > nginx.conf << 'EOF'
upstream backend {
    server app-1:8000;
    server app-2:8000;
    server app-3:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
EOF

# Start load balancer
docker run -d --name load-balancer \
  --network my-overlay-net \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf \
  -p 80:80 \
  nginx:latest
```

### Section 4.2: Network Security

#### Network Segmentation
```bash
# Create separate networks for security
docker network create frontend-net
docker network create backend-net
docker network create database-net

# Web server (public access)
docker run -d --name web \
  --network frontend-net \
  -p 80:80 \
  nginx:latest

# API server (internal only)
docker run -d --name api \
  --network frontend-net \
  --network backend-net \
  my-api:latest

# Database (most secure)
docker run -d --name db \
  --network backend-net \
  --network database-net \
  postgres:13
```

---

## Part 5: Troubleshooting and Monitoring

### Section 5.1: Network Debugging

#### Inspect Network Configuration
```bash
# List networks
docker network ls

# Inspect network details
docker network inspect bridge

# Check container network info
docker inspect container-name | jq '.[0].NetworkSettings'

# Test connectivity
docker exec container-a ping container-b
```

#### Common Network Issues
```bash
# DNS resolution problems
docker exec web nslookup api

# Firewall blocking traffic
docker exec web telnet api 8080

# Network isolation issues
docker network connect my-network isolated-container
```

### Section 5.2: Volume Troubleshooting

#### Volume Data Recovery
```bash
# Find volume location on host
docker volume inspect my-volume

# Mount volume to inspect contents
docker run --rm \
  -v my-volume:/data \
  alpine:latest \
  ls -la /data

# Copy data from volume
docker run --rm \
  -v my-volume:/source \
  -v $(pwd):/dest \
  alpine:latest \
  cp -r /source/* /dest/
```

---

## Part 6: Production-Ready Patterns

### Section 6.1: Data Backup Strategy

#### Automated Backups with Cron
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec postgres-db pg_dump -U postgres myapp > $BACKUP_DIR/db_$DATE.sql

# Backup application data
docker run --rm \
  -v app-data:/source \
  -v $BACKUP_DIR:/dest \
  alpine:latest \
  tar czf /dest/app_$DATE.tar.gz -C /source .

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

# Schedule with cron
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### Section 6.2: Monitoring and Logging

#### Centralized Logging
```bash
# Create logging network
docker network create logging-net

# Start ELK stack
docker run -d --name elasticsearch \
  --network logging-net \
  -p 9200:9200 \
  elasticsearch:7.10.1

docker run -d --name logstash \
  --network logging-net \
  -p 5044:5044 \
  logstash:7.10.1

# Configure app to send logs
docker run -d --name my-app \
  --network app-net \
  --network logging-net \
  --log-driver gelf \
  --log-opt gelf-address=udp://logstash:12201 \
  my-app:latest
```

---

## Exercise: Complete Application Architecture

### Requirements
Create a production-ready application with:
- Web frontend (Nginx)
- API backend (FastAPI/Python)
- Database (PostgreSQL)
- Cache (Redis)
- Background worker (Celery)
- Proper networking and volumes
- Backup strategy

### Implementation Steps

1. **Design Network Architecture**
   ```
   frontend-net (public)
   ├── web (nginx)
   └── api (fastapi)
   
   backend-net (private)
   ├── api (fastapi)
   ├── db (postgres)
   ├── cache (redis)
   └── worker (celery)
   ```

2. **Create Docker Compose Configuration**
   - Define all services
   - Configure networks
   - Set up volumes
   - Add environment variables

3. **Implement Data Persistence**
   - Database volumes
   - Static file storage
   - Log persistence

4. **Configure Security**
   - Network segmentation
   - Environment variable management
   - Access controls

5. **Test and Validate**
   - Service connectivity
   - Data persistence
   - Scalability testing

### Deliverables
- Complete docker-compose.yml
- Network architecture diagram
- Backup and recovery procedures
- Monitoring configuration
- Deployment documentation

---

## Key Takeaways

1. **Volumes**: Choose the right volume type for each use case
   - Named volumes for container data
   - Bind mounts for development
   - tmpfs for temporary data

2. **Networks**: Design network architecture for security and performance
   - Bridge networks for development
   - Overlay networks for orchestration
   - Host networks for performance

3. **Service Discovery**: Leverage Docker's built-in DNS
   - Container names as hostnames
   - Network aliases for flexibility
   - Service registration patterns

4. **Production Readiness**: Implement robust patterns
   - Data backup strategies
   - Network security
   - Monitoring and logging
   - Scalability considerations

## Next Steps
- Explore Docker Swarm for orchestration
- Implement Kubernetes networking concepts
- Study service mesh technologies (Istio, Linkerd)
- Learn about container security best practices

# Workshop 04: Complete Application with Docker Compose

## Overview
This comprehensive workshop brings together all Docker concepts to create a complete web application stack. You'll build a FastAPI backend with PostgreSQL database, Redis cache, and Nginx reverse proxy, all orchestrated with Docker Compose.

## Prerequisites
- Completed all previous workshops
- Understanding of Docker, Docker Compose, volumes, and networks
- Basic knowledge of FastAPI/Python and PostgreSQL

## Learning Objectives
By the end of this workshop, you will be able to:
- Design and implement multi-service architectures
- Configure databases and caching layers in containers
- Set up reverse proxy and load balancing
- Implement proper networking and service discovery
- Manage application secrets and environment variables
- Deploy and scale containerized applications

## Workshop Structure

### Part 1: Application Architecture Design

#### Step 1: Design the Application Stack

Our application will consist of:

```
Internet → Nginx (Reverse Proxy) → FastAPI (Backend) → PostgreSQL (Database)
                              → Redis (Cache)
```

**Services:**
- **nginx**: Reverse proxy and static file serving
- **api**: FastAPI application with database integration
- **db**: PostgreSQL database with persistent storage
- **redis**: Redis cache for session and data caching
- **pgadmin**: Database administration interface

**Networks:**
- **frontend**: External access network
- **backend**: Internal services network

**Volumes:**
- **db_data**: PostgreSQL data persistence
- **redis_data**: Redis data persistence
- **static_files**: Static file storage

#### Step 2: Create Project Structure

```bash
# Create main project directory
mkdir compose-fullstack
cd compose-fullstack

# Create service directories
mkdir -p api db redis nginx pgadmin

# Create shared directories
mkdir -p logs backups

# Create environment files
touch .env .env.db .env.redis
```

### Part 2: PostgreSQL Database Service

#### Step 1: Configure PostgreSQL

**Create db/init.sql:**
```sql
-- Create application database and user
CREATE DATABASE myapp;
CREATE USER myapp_user WITH ENCRYPTED PASSWORD 'myapp_password';
GRANT ALL PRIVILEGES ON DATABASE myapp TO myapp_user;

-- Connect to the application database
\c myapp;

-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Insert sample data
INSERT INTO users (username, email, password_hash) VALUES
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4fYw9iSJlO'),
('user1', 'user1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4fYw9iSJlO');

INSERT INTO posts (title, content, author_id) VALUES
('Welcome Post', 'This is the first post in our application!', 1),
('Docker Compose', 'Learn how to orchestrate multi-container applications.', 1);
```

**Create db/Dockerfile:**
```dockerfile
FROM postgres:15-alpine

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/

# Set proper permissions
RUN chmod 755 /docker-entrypoint-initdb.d/init.sql

# Custom configuration (optional)
# COPY postgresql.conf /etc/postgresql/postgresql.conf

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} || exit 1
```

### Part 3: Redis Cache Service

#### Step 1: Configure Redis

**Create redis/redis.conf:**
```redis
# Basic configuration
bind 0.0.0.0
protected-mode no
port 6379

# Memory management
maxmemory 128mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile ""

# Security
requirepass redis_password
```

**Create redis/Dockerfile:**
```dockerfile
FROM redis:7-alpine

# Copy configuration
COPY redis.conf /etc/redis/redis.conf

# Create data directory
RUN mkdir -p /data && chown redis:redis /data

# Switch to redis user
USER redis

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD redis-cli -a redis_password ping || exit 1

# Default command with config
CMD ["redis-server", "/etc/redis/redis.conf"]
```

### Part 4: FastAPI Backend Service

#### Step 1: Create FastAPI Application

**Create api/requirements.txt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
redis==5.0.1
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

**Create api/app/__init__.py:**
```python
# Empty init file
```

**Create api/app/config.py:**
```python
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://myapp_user:myapp_password@db:5432/myapp")

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://:redis_password@redis:6379/0")

    # Application
    app_name: str = "My FastAPI App"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")

    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:8080"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**Create api/app/database.py:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Create api/app/models.py:**
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Create api/app/schemas.py:**
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class PostBase(BaseModel):
    title: str
    content: Optional[str] = None

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    author_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
```

**Create api/app/crud.py:**
```python
from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_posts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Post).offset(skip).limit(limit).all()

def create_post(db: Session, post: schemas.PostCreate, author_id: int):
    db_post = models.Post(**post.dict(), author_id=author_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post
```

**Create api/app/main.py:**
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from . import crud, models, schemas
from .database import SessionLocal, engine
from .config import settings
import redis
import secrets

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, debug=settings.debug)
security = HTTPBasic()

# Redis client
redis_client = redis.from_url(settings.redis_url)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def authenticate_user(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI with PostgreSQL and Redis"}

@app.get("/health")
async def health():
    # Check database
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check Redis
    try:
        redis_client.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy",
        "database": db_status,
        "redis": redis_status
    }

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(authenticate_user)):
    return current_user

@app.get("/posts", response_model=list[schemas.Post])
async def read_posts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    posts = crud.get_posts(db, skip=skip, limit=limit)
    return posts

@app.post("/posts", response_model=schemas.Post)
async def create_post(post: schemas.PostCreate, current_user: models.User = Depends(authenticate_user), db: Session = Depends(get_db)):
    return crud.create_post(db=db, post=post, author_id=current_user.id)

@app.get("/cache/{key}")
async def get_cache(key: str):
    value = redis_client.get(key)
    return {"key": key, "value": value.decode() if value else None}

@app.post("/cache")
async def set_cache(key: str, value: str, expire: int = 3600):
    redis_client.setex(key, expire, value)
    return {"message": "Cache set", "key": key, "value": value}
```

**Create api/Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=app:app . .

# Switch to app user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Default command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

### Part 5: Nginx Reverse Proxy

#### Step 1: Configure Nginx

**Create nginx/nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Upstream backend
    upstream api_backend {
        server api:8000;
    }

    # Server block
    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # API routes
        location /api/ {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeout settings
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Default location
        location / {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Create nginx/Dockerfile:**
```dockerfile
FROM nginx:alpine

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx && chown nginx:nginx /var/log/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Default command
CMD ["nginx", "-g", "daemon off;"]
```

### Part 6: PgAdmin Service

#### Step 1: Configure PgAdmin

**Create pgadmin/Dockerfile:**
```dockerfile
FROM dpage/pgadmin4:latest

# Set environment variables
ENV PGADMIN_DEFAULT_EMAIL=admin@example.com
ENV PGADMIN_DEFAULT_PASSWORD=admin_password

# Copy servers configuration
COPY servers.json /pgadmin4/servers.json

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:80/login')" || exit 1
```

**Create pgadmin/servers.json:**
```json
{
    "Servers": {
        "1": {
            "Name": "PostgreSQL Database",
            "Group": "Servers",
            "Host": "db",
            "Port": 5432,
            "MaintenanceDB": "myapp",
            "Username": "myapp_user",
            "SSLMode": "prefer",
            "Comments": "Main application database"
        }
    }
}
```

### Part 7: Docker Compose Configuration

#### Step 1: Create docker-compose.yml

```yaml
version: '3.8'

services:
  # Reverse Proxy
  nginx:
    build: ./nginx
    ports:
      - "80:80"
    depends_on:
      - api
    networks:
      - frontend
    restart: unless-stopped

  # FastAPI Backend
  api:
    build: ./api
    environment:
      - DATABASE_URL=postgresql://myapp_user:myapp_password@db:5432/myapp
      - REDIS_URL=redis://:redis_password@redis:6379/0
      - DEBUG=false
      - SECRET_KEY=${SECRET_KEY:-your-secret-key-here}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - frontend
      - backend
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  # PostgreSQL Database
  db:
    build: ./db
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp_user
      - POSTGRES_PASSWORD=myapp_password
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp_user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    build: ./redis
    volumes:
      - redis_data:/data
    networks:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_password", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PgAdmin (Database Admin)
  pgadmin:
    build: ./pgadmin
    ports:
      - "8080:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@example.com
      - PGADMIN_DEFAULT_PASSWORD=admin_password
    depends_on:
      - db
    networks:
      - backend
    restart: unless-stopped

volumes:
  db_data:
    driver: local
  redis_data:
    driver: local

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

#### Step 2: Create Environment Files

**Create .env:**
```bash
# Application settings
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=false

# Database settings
POSTGRES_DB=myapp
POSTGRES_USER=myapp_user
POSTGRES_PASSWORD=myapp_password

# Redis settings
REDIS_PASSWORD=redis_password
```

**Create .env.db:**
```bash
POSTGRES_DB=myapp
POSTGRES_USER=myapp_user
POSTGRES_PASSWORD=myapp_password
```

**Create .env.redis:**
```bash
REDIS_PASSWORD=redis_password
```

### Part 8: Deployment and Testing

#### Step 1: Create Management Scripts

**Create scripts/manage.sh:**
```bash
#!/bin/bash

# Docker Compose management script

case "$1" in
    "up")
        echo "Starting services..."
        docker-compose up -d
        ;;
    "down")
        echo "Stopping services..."
        docker-compose down
        ;;
    "build")
        echo "Building services..."
        docker-compose build --no-cache
        ;;
    "logs")
        if [ -n "$2" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f
        fi
        ;;
    "restart")
        echo "Restarting services..."
        docker-compose restart
        ;;
    "status")
        docker-compose ps
        ;;
    "backup")
        echo "Creating database backup..."
        docker-compose exec db pg_dump -U myapp_user myapp > "backup_$(date +%Y%m%d_%H%M%S).sql"
        ;;
    "shell")
        if [ -n "$2" ]; then
            docker-compose exec "$2" bash
        else
            echo "Usage: $0 shell <service>"
        fi
        ;;
    *)
        echo "Usage: $0 {up|down|build|logs|restart|status|backup|shell}"
        echo "  up: Start all services"
        echo "  down: Stop all services"
        echo "  build: Build all services"
        echo "  logs [service]: Show logs"
        echo "  restart: Restart all services"
        echo "  status: Show service status"
        echo "  backup: Create database backup"
        echo "  shell <service>: Open shell in service"
        exit 1
        ;;
esac
```

**Make script executable:**
```bash
chmod +x scripts/manage.sh
```

#### Step 2: Create docker-compose.override.yml for Development

```yaml
version: '3.8'

services:
  api:
    environment:
      - DEBUG=true
    volumes:
      - ./api:/app
      - /app/__pycache__
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

  db:
    ports:
      - "5432:5432"

  redis:
    ports:
      - "6379:6379"
```

## Challenge Exercises

### Challenge 1: Add Monitoring
1. Add Prometheus and Grafana for monitoring
2. Configure metrics collection from all services
3. Create dashboards for application metrics
4. Set up alerting rules

### Challenge 2: Implement CI/CD
1. Create GitHub Actions workflow
2. Implement automated testing
3. Add security scanning
4. Configure automated deployment

### Challenge 3: Scaling and High Availability
1. Add Redis Sentinel for high availability
2. Implement database replication
3. Configure load balancing
4. Add service mesh (Istio/Linkerd)

## Production Considerations

### Security Hardening
```yaml
# Use secrets instead of environment variables
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password
```

### Resource Limits
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Backup Strategy
```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec db pg_dump -U myapp_user myapp > "$BACKUP_DIR/db_backup_$DATE.sql"

# Compress and cleanup old backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
```

## Verification Checklist

### Infrastructure Setup
- [ ] All services build successfully
- [ ] Networks configured correctly
- [ ] Volumes created and mounted
- [ ] Health checks passing

### Application Functionality
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Redis caching functional
- [ ] Nginx proxying correctly

### Development Workflow
- [ ] Hot reload working in development
- [ ] Logs accessible
- [ ] Database admin interface available
- [ ] Management scripts functional

### Production Readiness
- [ ] Security headers configured
- [ ] Resource limits set
- [ ] Backup strategy implemented
- [ ] Monitoring configured

## Troubleshooting

### Common Issues

**Services won't start**
```bash
# Check service logs
docker-compose logs

# Check service dependencies
docker-compose ps

# Restart specific service
docker-compose restart api
```

**Database connection issues**
```bash
# Check database health
docker-compose exec db pg_isready -U myapp_user -d myapp

# Check network connectivity
docker-compose exec api ping db
```

**Memory issues**
```bash
# Check resource usage
docker stats

# Clean up unused resources
docker system prune -f
```

## Next Steps
- [Docker Compose Tutorial](../tutorials/04-docker-compose.md)
- [Deploy to Production](#) (future workshop)

## Additional Resources
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

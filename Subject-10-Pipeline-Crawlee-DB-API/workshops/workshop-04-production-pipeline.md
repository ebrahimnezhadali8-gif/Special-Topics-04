# Workshop 04: Production-Ready ETL Pipeline

## Overview
This workshop implements a complete production-ready ETL pipeline system that combines all components from previous workshops. You'll learn to deploy, monitor, scale, and maintain a robust data pipeline that can handle real-world workloads with high reliability and performance.

## Prerequisites
- Completed all previous workshops ([Workshop 01](../workshops/workshop-01-crawlee-etl.md), [Workshop 02](../workshops/workshop-02-data-processing.md), [Workshop 03](../workshops/workshop-03-search-api.md))
- Docker and Docker Compose experience
- Basic Kubernetes knowledge (optional)

## Learning Objectives
By the end of this workshop, you will be able to:
- Deploy a complete ETL pipeline to production
- Implement comprehensive monitoring and alerting
- Set up automated scaling and load balancing
- Handle production failures gracefully
- Implement backup and recovery strategies
- Optimize performance for high-throughput scenarios

## Workshop Structure

### Part 1: Production Architecture

#### Step 1: System Architecture Design

**architecture/production-architecture.md:**
```markdown
# Production ETL Pipeline Architecture

## System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Crawlers  │───►│  Message Queue  │───►│ ETL Processors  │
│   (Crawlee)     │    │   (Redis/RMQ)   │    │   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Load Balancer  │    │   Cache Layer   │    │   PostgreSQL    │
│    (Nginx)      │    │    (Redis)      │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Search API    │───►│  Monitoring     │
                    │   (FastAPI)     │    │   (Prometheus)  │
                    └─────────────────┘    └─────────────────┘
```

## Component Responsibilities

### Crawler Layer
- **Crawlee crawlers**: Distributed web scraping
- **Rate limiting**: Respectful crawling with domain-specific limits
- **Queue integration**: Send crawled data to message queue
- **Health monitoring**: Report crawler status and metrics

### Message Queue Layer
- **Redis/ RabbitMQ**: Asynchronous data processing
- **Dead letter queues**: Handle processing failures
- **Priority queues**: Support different processing priorities
- **Monitoring**: Queue depth, processing rates, error rates

### ETL Processing Layer
- **Data validation**: Schema validation and quality checks
- **Data transformation**: Cleaning, normalization, enrichment
- **Deduplication**: URL and content-based deduplication
- **Database operations**: Batch inserts/updates with error handling

### Database Layer
- **PostgreSQL**: Primary data storage with full-text search
- **Connection pooling**: Efficient database connection management
- **Replication**: Read replicas for search queries
- **Backup/Recovery**: Automated backups and point-in-time recovery

### API Layer
- **FastAPI**: RESTful search and management APIs
- **Caching**: Response caching with Redis
- **Rate limiting**: API rate limiting and throttling
- **Authentication**: API key and JWT authentication

### Monitoring Layer
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **ELK Stack**: Log aggregation and analysis
- **Health checks**: System and component health monitoring

## Scalability Considerations

### Horizontal Scaling
- **Crawler scaling**: Multiple crawler instances per target
- **Processor scaling**: Auto-scaling based on queue depth
- **Database scaling**: Read replicas and sharding
- **API scaling**: Load balancing and auto-scaling

### Performance Optimization
- **Database indexing**: Optimized indexes for search queries
- **Caching strategy**: Multi-level caching (application, database, CDN)
- **Connection pooling**: Efficient resource utilization
- **Batch processing**: Minimize database round trips

## Reliability Features

### Fault Tolerance
- **Circuit breakers**: Prevent cascade failures
- **Retry mechanisms**: Exponential backoff for transient failures
- **Graceful degradation**: Continue operation with reduced functionality
- **Data consistency**: Transaction management and rollback

### Monitoring & Alerting
- **Real-time metrics**: System performance and health indicators
- **Automated alerts**: Proactive issue detection and notification
- **Log aggregation**: Centralized logging with correlation IDs
- **Tracing**: Distributed request tracing for debugging

## Security Considerations

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Access control**: Role-based access and API authentication
- **Input validation**: Prevent injection attacks and malicious input
- **Audit logging**: Track all data access and modifications

### Network Security
- **Firewalls**: Network segmentation and access control
- **TLS/SSL**: Encrypted communication between components
- **API security**: Rate limiting, authentication, and authorization
- **Secret management**: Secure storage of credentials and keys
```

#### Step 2: Production Configuration

**config/production.py:**
```python
import os
from pydantic import BaseSettings, validator
from typing import List, Optional

class ProductionSettings(BaseSettings):
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "production")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Application
    app_name: str = "crawlee-etl-pipeline"
    version: str = os.getenv("APP_VERSION", "1.0.0")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    # Database
    database_url: str = os.getenv("DATABASE_URL", "")
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "20"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "30"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379")
    redis_pool_size: int = int(os.getenv("REDIS_POOL_SIZE", "20"))

    # Message Queue
    queue_url: str = os.getenv("QUEUE_URL", "redis://redis:6379")
    queue_pool_size: int = int(os.getenv("QUEUE_POOL_SIZE", "10"))

    # Crawling
    max_concurrent_crawlers: int = int(os.getenv("MAX_CONCURRENT_CRAWLERS", "10"))
    crawler_timeout: int = int(os.getenv("CRAWLER_TIMEOUT", "60"))
    max_pages_per_crawl: int = int(os.getenv("MAX_PAGES_PER_CRAWL", "1000"))
    crawler_user_agent: str = os.getenv("CRAWLER_USER_AGENT", "CrawleeETL/1.0")

    # Processing
    batch_size: int = int(os.getenv("BATCH_SIZE", "100"))
    processing_workers: int = int(os.getenv("PROCESSING_WORKERS", "8"))
    max_processing_time: int = int(os.getenv("MAX_PROCESSING_TIME", "300"))

    # Search
    search_timeout: int = int(os.getenv("SEARCH_TIMEOUT", "10"))
    search_cache_ttl: int = int(os.getenv("SEARCH_CACHE_TTL", "300"))
    max_search_results: int = int(os.getenv("MAX_SEARCH_RESULTS", "1000"))

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "")
    api_keys: List[str] = os.getenv("API_KEYS", "").split(",") if os.getenv("API_KEYS") else []
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expiration: int = int(os.getenv("JWT_EXPIRATION", "3600"))

    # Monitoring
    enable_prometheus: bool = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    prometheus_port: int = int(os.getenv("PROMETHEUS_PORT", "9090"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    sentry_dsn: Optional[str] = os.getenv("SENTRY_DSN")

    # External Services
    elasticsearch_url: Optional[str] = os.getenv("ELASTICSEARCH_URL")
    slack_webhook: Optional[str] = os.getenv("SLACK_WEBHOOK")
    email_smtp_server: Optional[str] = os.getenv("EMAIL_SMTP_SERVER")

    # Limits and Quotas
    max_request_size: int = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    rate_limit_window: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # per minute

    # Backup and Recovery
    backup_schedule: str = os.getenv("BACKUP_SCHEDULE", "0 2 * * *")  # Daily at 2 AM
    backup_retention_days: int = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    enable_point_in_time_recovery: bool = os.getenv("ENABLE_PITR", "true").lower() == "true"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @validator('database_url')
    def validate_database_url(cls, v):
        if not v:
            raise ValueError("DATABASE_URL is required")
        if not v.startswith(('postgresql://', 'postgresql+psycopg2://')):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
        return v

    @validator('secret_key')
    def validate_secret_key(cls, v):
        if not v and cls().environment == "production":
            raise ValueError("SECRET_KEY is required in production")
        return v or "development-secret-key"

    @validator('api_keys')
    def validate_api_keys(cls, v):
        if cls().environment == "production" and not v:
            raise ValueError("API_KEYS are required in production")
        return v

# Global settings instance
settings = ProductionSettings()
```

### Part 2: Production Deployment

#### Step 3: Docker Production Setup

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # API Service
  api:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/crawlee_etl
      - REDIS_URL=redis://redis:6379
      - QUEUE_URL=redis://redis:6379
    ports:
      - "8000:8000"
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Crawler Service
  crawler:
    build:
      context: .
      dockerfile: Dockerfile.crawler
    environment:
      - NODE_ENV=production
      - API_URL=http://api:8000
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./crawler-config:/app/config:ro
      - ./logs:/app/logs
    depends_on:
      - api
      - redis
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Crawler healthy')"]
      interval: 60s
      timeout: 30s
      retries: 3
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  # ETL Processor
  processor:
    build:
      context: .
      dockerfile: Dockerfile.processor
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/crawlee_etl
      - REDIS_URL=redis://redis:6379
      - QUEUE_URL=redis://redis:6379
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "print('Processor healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crawlee_etl
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./database/postgres.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d crawlee_etl"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # Redis Cache and Queue
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M

  # Monitoring - Prometheus
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    restart: unless-stopped

  # Monitoring - Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  nginx_logs:
```

#### Step 4: Kubernetes Deployment (Optional)

**k8s/deployment.yml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crawlee-etl-api
  labels:
    app: crawlee-etl
    component: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crawlee-etl
      component: api
  template:
    metadata:
      labels:
        app: crawlee-etl
        component: api
    spec:
      containers:
      - name: api
        image: crawlee-etl:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: database-url
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: logs-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: crawlee-etl-api
  labels:
    app: crawlee-etl
    component: api
spec:
  selector:
    app: crawlee-etl
    component: api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crawlee-etl-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: crawlee-etl-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: crawlee-etl-api
            port:
              number: 80
```

### Part 3: Monitoring and Alerting

#### Step 5: Production Monitoring Setup

**monitoring/prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'crawlee-etl-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'crawlee-etl-processor'
    static_configs:
      - targets: ['processor:8001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s
```

**monitoring/alert_rules.yml:**
```yaml
groups:
  - name: crawlee_etl_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(etl_records_failed_total[5m]) / rate(etl_records_processed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High ETL error rate detected"
          description: "ETL error rate is {{ $value }}% over the last 5 minutes"

      - alert: DatabaseConnectionIssues
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection lost"
          description: "PostgreSQL is down"

      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"

      - alert: SlowSearchQueries
        expr: histogram_quantile(0.95, rate(etl_operation_duration_seconds_bucket{operation="search"}[5m])) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Slow search queries detected"
          description: "95th percentile search query time is {{ $value }}s"

      - alert: QueueBacklog
        expr: etl_queue_size > 10000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "ETL queue backlog"
          description: "ETL processing queue has {{ $value }} items"
```

#### Step 6: Comprehensive Logging

**config/logging_prod.py:**
```python
import logging
import logging.config
from pythonjsonlogger import jsonlogger
import sys
from typing import Dict, Any

class ProductionLogger:
    """Production logging configuration with structured JSON logs"""

    @staticmethod
    def setup_logging(
        level: str = "INFO",
        log_format: str = "json",
        enable_sentry: bool = False,
        sentry_dsn: str = None
    ):
        """Setup production logging configuration"""

        # Base configuration
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {},
            'handlers': {},
            'loggers': {},
            'root': {
                'level': level,
                'handlers': ['console', 'file']
            }
        }

        # JSON formatter for structured logging
        if log_format == "json":
            config['formatters']['json'] = {
                'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(module)s %(funcName)s %(lineno)d %(process)d %(thread)d'
            }

        # Standard formatter for human-readable logs
        config['formatters']['standard'] = {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        }

        # Console handler
        config['handlers']['console'] = {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if log_format == "json" else 'standard',
            'stream': sys.stdout,
            'level': level
        }

        # File handler with rotation
        config['handlers']['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/etl_pipeline.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'json' if log_format == "json" else 'standard',
            'level': level
        }

        # Error file handler
        config['handlers']['error_file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/etl_pipeline_error.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'json' if log_format == "json" else 'standard',
            'level': 'ERROR'
        }

        # Add error file handler to root logger
        config['root']['handlers'].append('error_file')

        # Specific logger configurations
        config['loggers'] = {
            'sqlalchemy.engine': {
                'level': 'WARNING',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'uvicorn': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'fastapi': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'crawlee': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            }
        }

        # Apply configuration
        logging.config.dictConfig(config)

        # Setup Sentry if enabled
        if enable_sentry and sentry_dsn:
            try:
                import sentry_sdk
                sentry_sdk.init(
                    dsn=sentry_dsn,
                    environment="production",
                    traces_sample_rate=0.1,
                    integrations=[]
                )
                print("Sentry error tracking enabled")
            except ImportError:
                print("Sentry SDK not installed, error tracking disabled")

    @staticmethod
    def get_correlation_logger(correlation_id: str = None):
        """Get logger with correlation ID context"""
        logger = logging.getLogger('etl_pipeline')

        if correlation_id:
            # Create child logger with correlation ID
            logger = logging.getLogger(f'etl_pipeline.{correlation_id}')

        return logger

class RequestLogger:
    """Middleware for logging HTTP requests"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract request information
        method = scope["method"]
        path = scope["path"]
        query = scope.get("query_string", b"").decode()

        # Generate correlation ID
        correlation_id = generate_correlation_id()

        # Add correlation ID to request state
        scope["state"]["correlation_id"] = correlation_id

        logger = ProductionLogger.get_correlation_logger(correlation_id)
        logger.info(f"Request started: {method} {path}", extra={
            'method': method,
            'path': path,
            'query': query,
            'correlation_id': correlation_id
        })

        # Track response
        start_time = time.time()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]

                # Log response
                duration = time.time() - start_time
                logger.info(f"Request completed: {status_code}", extra={
                    'status_code': status_code,
                    'duration': duration,
                    'correlation_id': correlation_id
                })

            await send(message)

        await self.app(scope, receive, send_wrapper)

def generate_correlation_id() -> str:
    """Generate unique correlation ID for request tracking"""
    import uuid
    return str(uuid.uuid4())

# Usage in FastAPI app
from fastapi import FastAPI, Request
from config.logging_prod import ProductionLogger, RequestLogger

# Setup logging
ProductionLogger.setup_logging(
    level=settings.log_level,
    log_format="json",
    enable_sentry=bool(settings.sentry_dsn),
    sentry_dsn=settings.sentry_dsn
)

# Create app with logging middleware
app = FastAPI(title="Crawlee ETL Pipeline API")
app.middleware("http")(RequestLogger(app))
```

### Part 4: Backup and Recovery

#### Step 7: Backup Strategy

**scripts/backup.sh:**
```bash
#!/bin/bash

# Production backup script for ETL pipeline

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Database backup
echo "Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
docker-compose exec -T postgres pg_dump \
    --username=user \
    --dbname=crawlee_etl \
    --format=custom \
    --compress=9 \
    --file=/tmp/backup_$TIMESTAMP.dump

# Copy backup to host
docker cp $(docker-compose ps -q postgres):/tmp/backup_$TIMESTAMP.dump "$BACKUP_DIR/"

# Compress backup
gzip "$BACKUP_DIR/backup_$TIMESTAMP.dump"

echo "Database backup completed: $BACKUP_DIR/backup_$TIMESTAMP.dump.gz"

# Redis backup (if using persistence)
if [ -d "/redis_data" ]; then
    echo "Backing up Redis data..."
    tar -czf "$BACKUP_DIR/redis_$TIMESTAMP.tar.gz" -C / redis_data
fi

# Clean up old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"

# Send notification (if configured)
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"ETL Pipeline backup completed: $TIMESTAMP\"}" \
        "$SLACK_WEBHOOK"
fi
```

**scripts/restore.sh:**
```bash
#!/bin/bash

# Production restore script for ETL pipeline

set -e

# Configuration
BACKUP_DIR="/backups"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.gz
    exit 1
fi

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting restore from: $BACKUP_FILE"

# Stop services
echo "Stopping services..."
docker-compose down

# Restore database
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres pg_restore \
    --username=user \
    --dbname=crawlee_etl \
    --clean \
    --if-exists \
    --create \
    --verbose

# Start services
echo "Starting services..."
docker-compose up -d

# Verify restore
echo "Verifying restore..."
sleep 10

# Check database connectivity
docker-compose exec postgres pg_isready -U user -d crawlee_etl

# Check API health
curl -f http://localhost/health

echo "Restore completed successfully"

# Send notification
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"ETL Pipeline restore completed from $BACKUP_FILE\"}" \
        "$SLACK_WEBHOOK"
fi
```

### Part 5: Security and Compliance

#### Step 8: Security Configuration

**security/api_auth.py:**
```python
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import time
from datetime import datetime, timedelta

from config.production import settings

class APIAuthenticator:
    """API authentication and authorization"""

    def __init__(self):
        self.security = HTTPBearer(auto_error=False)

    async def authenticate(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
    ):
        """Authenticate API requests"""

        # Check API key first
        api_key = self._extract_api_key(request)
        if api_key and api_key in settings.api_keys:
            return {"type": "api_key", "key": api_key}

        # Check JWT token
        if credentials:
            try:
                payload = jwt.decode(
                    credentials.credentials,
                    settings.jwt_secret,
                    algorithms=[settings.jwt_algorithm]
                )

                # Check expiration
                if payload.get("exp", 0) < time.time():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token expired"
                    )

                return {
                    "type": "jwt",
                    "user_id": payload.get("sub"),
                    "permissions": payload.get("permissions", [])
                }

            except jwt.PyJWTError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )

        # No valid authentication
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    def _extract_api_key(self, request: Request) -> Optional[str]:
        """Extract API key from request"""
        # Check header
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return api_key

        # Check query parameter
        api_key = request.query_params.get("api_key")
        if api_key:
            return api_key

        return None

    def require_permission(self, permission: str):
        """Dependency for requiring specific permissions"""
        def permission_checker(auth_data: dict = Depends(self.authenticate)):
            if auth_data["type"] == "jwt":
                permissions = auth_data.get("permissions", [])
                if permission not in permissions:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Permission '{permission}' required"
                    )
            # API keys have full access (for now)

            return auth_data

        return permission_checker

class RateLimiter:
    """API rate limiting"""

    def __init__(self, redis_client=None):
        self.redis = redis_client

    async def check_rate_limit(self, identifier: str, limit: int = None, window: int = None):
        """Check if request is within rate limits"""
        if not self.redis:
            return True  # No rate limiting if Redis not available

        limit = limit or settings.rate_limit_requests
        window = window or settings.rate_limit_window

        # Create rate limit key
        key = f"ratelimit:{identifier}:{int(time.time() / window)}"

        # Increment counter
        current = self.redis.incr(key)

        # Set expiration if first request in window
        if current == 1:
            self.redis.expire(key, window)

        # Check if over limit
        if current > limit:
            return False

        return True

# Global instances
authenticator = APIAuthenticator()
rate_limiter = RateLimiter()

# Usage in FastAPI
from security.api_auth import authenticator, rate_limiter

@app.get("/search", dependencies=[Depends(authenticator.authenticate)])
async def search_articles(
    request: Request,
    query: str = Query(...),
    # ... other parameters
):
    # Check rate limit
    client_ip = request.client.host
    if not await rate_limiter.check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )

    # Proceed with search...
    return await perform_search(query)
```

### Part 6: Performance Optimization

#### Step 9: Production Optimization

**optimization/query_optimizer.py:**
```python
from sqlalchemy import text, func, desc
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """Database query optimization for production"""

    def __init__(self, db_session: Session):
        self.db = db_session

    def optimize_search_query(self, query: str, filters: dict = None) -> str:
        """Generate optimized search query"""
        conditions = []

        # Full-text search with query expansion
        if query:
            # Use phrase search for quoted queries
            if '"' in query:
                search_condition = "search_vector @@ phraseto_tsquery('english', :query)"
            else:
                # Use websearch_to_tsquery for natural language queries
                search_condition = "search_vector @@ websearch_to_tsquery('english', :query)"

            conditions.append(search_condition)

        # Add filters with proper indexing
        if filters:
            if filters.get('author'):
                conditions.append("author ILIKE :author")

            if filters.get('source_id'):
                conditions.append("source_id = :source_id")

            if filters.get('published_after'):
                conditions.append("published_at >= :published_after")

            if filters.get('published_before'):
                conditions.append("published_at <= :published_before")

        # Build optimized query
        where_clause = " AND ".join(conditions) if conditions else "TRUE"

        sql = f"""
        SELECT
            id, title, url, author, published_at, summary,
            word_count, reading_time_minutes,
            ts_rank_cd(search_vector, websearch_to_tsquery('english', :query)) as rank,
            ts_headline('english', content,
                       websearch_to_tsquery('english', :query),
                       'MaxFragments=3, MinWords=5, MaxWords=20') as highlights
        FROM articles
        WHERE {where_clause}
        ORDER BY
            CASE WHEN :query != '' THEN rank ELSE published_at END DESC,
            published_at DESC
        LIMIT :limit OFFSET :offset
        """

        return sql

    def get_search_explain(self, query: str, filters: dict = None) -> str:
        """Get query execution plan for debugging"""
        sql = self.optimize_search_query(query, filters)
        explain_query = f"EXPLAIN ANALYZE {sql}"

        try:
            result = self.db.execute(text(explain_query), {
                'query': query,
                'limit': 10,
                'offset': 0,
                **(filters or {})
            }).fetchall()

            return "\n".join(row[0] for row in result)

        except Exception as e:
            logger.error(f"Failed to get query plan: {e}")
            return f"Error getting query plan: {e}"

    def optimize_database_indexes(self):
        """Ensure optimal database indexes exist"""
        indexes_to_check = [
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_search_vector_gin ON articles USING gin(search_vector)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_source_published ON articles (source_id, published_at DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_author ON articles (author)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_url_hash ON articles USING hash (url)",
        ]

        for index_sql in indexes_to_check:
            try:
                self.db.execute(text(index_sql))
                logger.info(f"Ensured index: {index_sql}")
            except Exception as e:
                logger.warning(f"Failed to create index: {e}")

        self.db.commit()

    def analyze_table_statistics(self):
        """Update table statistics for query planner"""
        try:
            self.db.execute(text("ANALYZE articles"))
            self.db.execute(text("ANALYZE sources"))
            self.db.execute(text("ANALYZE article_tags"))
            self.db.commit()
            logger.info("Updated table statistics")
        except Exception as e:
            logger.error(f"Failed to analyze tables: {e}")

    def get_performance_metrics(self) -> dict:
        """Get database performance metrics"""
        try:
            # Query execution statistics
            result = self.db.execute(text("""
                SELECT
                    schemaname, tablename,
                    seq_scan, seq_tup_read,
                    idx_scan, idx_tup_fetch,
                    n_tup_ins, n_tup_upd, n_tup_del
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
            """)).fetchall()

            # Index usage
            index_result = self.db.execute(text("""
                SELECT
                    schemaname, tablename, indexname,
                    idx_scan, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
            """)).fetchall()

            return {
                'table_stats': [dict(row) for row in result],
                'index_stats': [dict(row) for row in index_result]
            }

        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {}
```

## Running the Production System

### Deploy and Monitor

```bash
# 1. Environment setup
export POSTGRES_PASSWORD="secure_password"
export GRAFANA_PASSWORD="admin_password"
export SECRET_KEY="your-secret-key"
export API_KEYS="key1,key2,key3"

# 2. Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 3. Run database migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 4. Create optimized indexes
docker-compose -f docker-compose.prod.yml exec api python -c "
from optimization.query_optimizer import QueryOptimizer
from database.connection import get_db_session
optimizer = QueryOptimizer(next(get_db_session()))
optimizer.optimize_database_indexes()
"

# 5. Check system health
curl http://localhost/health

# 6. Monitor with Grafana
# Open http://localhost:3000 (admin/admin_password)

# 7. View Prometheus metrics
# Open http://localhost:9090

# 8. Test the API
curl "http://localhost/search/?q=fastapi"
```

### Scaling the System

```bash
# Scale API service
docker-compose -f docker-compose.prod.yml up -d --scale api=5

# Scale crawler service
docker-compose -f docker-compose.prod.yml up -d --scale crawler=3

# Scale processor service
docker-compose -f docker-compose.prod.yml up -d --scale processor=4
```

### Backup and Maintenance

```bash
# Run backup
./scripts/backup.sh

# Update table statistics
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "ANALYZE;"

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f api

# View system resources
docker stats
```

## Challenge Exercises

### Challenge 1: High Availability Setup
1. Implement database replication with automatic failover
2. Set up load balancing across multiple API instances
3. Configure automated scaling based on load metrics
4. Implement circuit breakers for external service calls

### Challenge 2: Advanced Security
1. Implement OAuth2 authentication for API access
2. Set up role-based access control (RBAC)
3. Configure audit logging for all data access
4. Implement data encryption at rest and in transit

### Challenge 3: Global Scale Optimization
1. Implement content delivery network (CDN) integration
2. Set up multi-region database replication
3. Configure cross-region load balancing
4. Implement data partitioning strategies

## Verification Checklist

### Production Deployment
- [ ] Docker containers build and deploy successfully
- [ ] Services communicate properly in production environment
- [ ] Environment variables configured securely
- [ ] SSL/TLS certificates configured for HTTPS
- [ ] Load balancer routes traffic correctly

### Monitoring & Alerting
- [ ] Prometheus collects metrics from all services
- [ ] Grafana dashboards display key metrics
- [ ] Alert rules trigger appropriate notifications
- [ ] Log aggregation captures all service logs
- [ ] Health checks monitor service availability

### Security & Compliance
- [ ] API authentication and authorization working
- [ ] Rate limiting prevents abuse
- [ ] Data encryption configured properly
- [ ] Access controls restrict sensitive operations
- [ ] Audit logging captures security events

### Performance & Scaling
- [ ] Database queries optimized with proper indexing
- [ ] Caching reduces response times
- [ ] Auto-scaling responds to load changes
- [ ] Resource limits prevent resource exhaustion
- [ ] Performance monitoring identifies bottlenecks

### Backup & Recovery
- [ ] Automated backups run on schedule
- [ ] Backup integrity verified regularly
- [ ] Recovery procedures tested and documented
- [ ] Point-in-time recovery capability available
- [ ] Disaster recovery plan documented

## Troubleshooting Production Issues

### Performance Issues

**Slow API responses:**
```bash
# Check API logs
docker-compose -f docker-compose.prod.yml logs api | tail -50

# Check database query performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "
SELECT pid, query, state, state_change
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat%'
ORDER BY state_change ASC;"

# Check Redis cache hit rate
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats | grep keyspace
```

**High memory usage:**
```bash
# Check container memory usage
docker stats

# Check database memory usage
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "
SELECT name, setting, unit
FROM pg_settings
WHERE name LIKE '%mem%' OR name LIKE '%cache%';"
```

### Data Issues

**Missing or corrupted data:**
```bash
# Check data integrity
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public';"

# Validate recent data
docker-compose -f docker-compose.prod.yml exec api python -c "
from database.models.article import Article
from database.connection import get_db_session
db = next(get_db_session())
recent = db.query(Article).order_by(Article.crawled_at.desc()).limit(5).all()
for article in recent:
    print(f'{article.id}: {article.title[:50]}...')
"
```

**Search quality issues:**
```bash
# Check search vector population
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "
SELECT id, title, search_vector IS NOT NULL as has_vector
FROM articles
WHERE search_vector IS NULL
LIMIT 10;"

# Rebuild search vectors if needed
docker-compose -f docker-compose.prod.yml exec postgres psql -U user -d crawlee_etl -c "
UPDATE articles SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
WHERE search_vector IS NULL;"
```

## Next Steps
- [Monitoring Tutorial](../tutorials/06-pipeline-monitoring.md)

## Additional Resources
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Production Guide](https://kubernetes.io/docs/concepts/overview/)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)
- [Performance Monitoring](https://prometheus.io/docs/practices/naming/)
- [Disaster Recovery Planning](https://aws.amazon.com/disaster-recovery/)

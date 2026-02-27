# Workshop 04: Advanced gRPC Patterns and Production Deployment

## Overview
This workshop covers advanced gRPC patterns and production-ready deployment strategies. You'll implement authentication, monitoring, load balancing, and deployment pipelines for gRPC services in production environments.

## Prerequisites
- Completed [Streaming Workshop](../workshops/workshop-03-streaming.md)
- Understanding of gRPC basics, services, and streaming

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement JWT-based authentication for gRPC services
- Set up monitoring and observability for gRPC applications
- Configure load balancing and service discovery
- Deploy gRPC services with Docker and Kubernetes
- Implement CI/CD pipelines for gRPC applications
- Handle production concerns like security, scaling, and reliability

## Workshop Structure

### Part 1: Authentication & Authorization

#### Step 1: JWT Authentication Service

**proto/auth.proto:**
```protobuf
syntax = "proto3";

package auth;

import "google/protobuf/empty.proto";

service AuthService {
  rpc Register (RegisterRequest) returns (RegisterResponse);
  rpc Login (LoginRequest) returns (LoginResponse);
  rpc RefreshToken (RefreshTokenRequest) returns (RefreshTokenResponse);
  rpc ValidateToken (google.protobuf.Empty) returns (TokenInfo);
  rpc Logout (google.protobuf.Empty) returns (google.protobuf.Empty);
}

message RegisterRequest {
  string username = 1;
  string email = 2;
  string password = 3;
  string full_name = 4;
}

message RegisterResponse {
  string user_id = 1;
  string message = 2;
}

message LoginRequest {
  string username = 1;
  string password = 2;
}

message LoginResponse {
  string access_token = 1;
  string refresh_token = 2;
  string token_type = 3;
  int64 expires_in = 4;
}

message RefreshTokenRequest {
  string refresh_token = 1;
}

message RefreshTokenResponse {
  string access_token = 1;
  string token_type = 2;
  int64 expires_in = 3;
}

message TokenInfo {
  string user_id = 1;
  string username = 2;
  repeated string roles = 3;
  int64 expires_at = 4;
}
```

#### Step 2: Implement Authentication Service

**services/auth_service.py:**
```python
import grpc
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import os
from proto.auth_pb2 import (
    RegisterResponse, LoginResponse, RefreshTokenResponse,
    TokenInfo
)
from proto.auth_pb2_grpc import AuthServiceServicer

class AuthService(AuthServiceServicer):
    """JWT-based authentication service"""

    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7

        # In-memory user store (use database in production)
        self.users = {}
        self.refresh_tokens = set()

    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode(), hashed.encode())

    def _create_access_token(self, data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def _create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        self.refresh_tokens.add(token)
        return token

    def _decode_token(self, token: str) -> Optional[dict]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def Register(self, request, context):
        """Register a new user"""
        # Validate input
        if not request.username or not request.email or not request.password:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Username, email, and password are required")
            return RegisterResponse()

        # Check if user already exists
        if request.username in self.users or any(u["email"] == request.email for u in self.users.values()):
            context.set_code(grpc.StatusCode.ALREADY_EXISTS)
            context.set_details("User already exists")
            return RegisterResponse()

        # Create user
        user_id = str(len(self.users) + 1)
        hashed_password = self._hash_password(request.password)

        self.users[request.username] = {
            "id": user_id,
            "username": request.username,
            "email": request.email,
            "full_name": request.full_name,
            "password_hash": hashed_password,
            "roles": ["user"],
            "created_at": datetime.utcnow()
        }

        return RegisterResponse(
            user_id=user_id,
            message="User registered successfully"
        )

    def Login(self, request, context):
        """Authenticate user and return tokens"""
        # Validate input
        if not request.username or not request.password:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Username and password are required")
            return LoginResponse()

        # Find user
        user = self.users.get(request.username)
        if not user or not self._verify_password(request.password, user["password_hash"]):
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Invalid credentials")
            return LoginResponse()

        # Create tokens
        token_data = {
            "sub": user["id"],
            "username": user["username"],
            "roles": user["roles"]
        }

        access_token = self._create_access_token(token_data)
        refresh_token = self._create_refresh_token(token_data)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=self.access_token_expire_minutes * 60
        )

    def RefreshToken(self, request, context):
        """Refresh access token using refresh token"""
        if not request.refresh_token:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Refresh token is required")
            return RefreshTokenResponse()

        # Validate refresh token
        if request.refresh_token not in self.refresh_tokens:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Invalid refresh token")
            return RefreshTokenResponse()

        # Decode token to get user data
        token_data = self._decode_token(request.refresh_token)
        if not token_data or token_data.get("type") != "refresh":
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Invalid refresh token")
            return RefreshTokenResponse()

        # Create new access token
        access_token_data = {
            "sub": token_data["sub"],
            "username": token_data["username"],
            "roles": token_data["roles"]
        }

        access_token = self._create_access_token(access_token_data)

        return RefreshTokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=self.access_token_expire_minutes * 60
        )

    def ValidateToken(self, request, context):
        """Validate current user's token"""
        # Get token from metadata
        metadata = dict(context.invocation_metadata())
        auth_header = metadata.get("authorization", "")

        if not auth_header.startswith("Bearer "):
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Invalid authorization header")
            return TokenInfo()

        token = auth_header[7:]  # Remove "Bearer " prefix

        # Decode and validate token
        token_data = self._decode_token(token)
        if not token_data or token_data.get("type") != "access":
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Invalid or expired token")
            return TokenInfo()

        return TokenInfo(
            user_id=token_data["sub"],
            username=token_data["username"],
            roles=token_data["roles"],
            expires_at=int(token_data["exp"])
        )

    def Logout(self, request, context):
        """Logout user (invalidate refresh tokens)"""
        # In a real implementation, you'd blacklist the token
        # For this demo, we'll just return success
        return google.protobuf.empty_pb2.Empty()
```

### Part 2: Monitoring and Observability

#### Step 3: Monitoring Interceptors

**monitoring/interceptors.py:**
```python
import grpc
import time
import logging
from typing import Dict, Any
from collections import defaultdict, deque
import prometheus_client as prom

logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = prom.Counter(
    'grpc_requests_total',
    'Total number of gRPC requests',
    ['method', 'status']
)

REQUEST_LATENCY = prom.Histogram(
    'grpc_request_duration_seconds',
    'gRPC request duration in seconds',
    ['method']
)

ACTIVE_CONNECTIONS = prom.Gauge(
    'grpc_active_connections',
    'Number of active gRPC connections'
)

class MonitoringInterceptor(grpc.ServerInterceptor):
    """Interceptor for monitoring gRPC requests"""

    def __init__(self):
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.latencies: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))

    def intercept_service(self, continuation, handler_call_details):
        def monitoring_wrapper(behavior, request, context):
            start_time = time.time()
            method_name = handler_call_details.method

            try:
                # Track active connections
                ACTIVE_CONNECTIONS.inc()

                # Call the actual method
                response = behavior(request, context)

                # Record metrics
                duration = time.time() - start_time
                REQUEST_LATENCY.labels(method=method_name).observe(duration)
                REQUEST_COUNT.labels(method=method_name, status="success").inc()

                # Log successful request
                logger.info(f"gRPC {method_name} - SUCCESS - {duration:.3f}s")

                return response

            except grpc.RpcError as e:
                duration = time.time() - start_time
                REQUEST_LATENCY.labels(method=method_name).observe(duration)
                REQUEST_COUNT.labels(method=method_name, status=e.code().name).inc()

                # Log error
                logger.error(f"gRPC {method_name} - {e.code().name} - {duration:.3f}s - {e.details()}")

                raise e
            finally:
                ACTIVE_CONNECTIONS.dec()

        return monitoring_wrapper

class AuthInterceptor(grpc.ServerInterceptor):
    """Interceptor for authentication"""

    def __init__(self, auth_service):
        self.auth_service = auth_service

    def intercept_service(self, continuation, handler_call_details):
        def auth_wrapper(behavior, request, context):
            method_name = handler_call_details.method

            # Skip auth for certain methods
            if method_name in ["/auth.AuthService/Register", "/auth.AuthService/Login"]:
                return behavior(request, context)

            # Validate token
            try:
                token_info = self.auth_service.ValidateToken(
                    google.protobuf.empty_pb2.Empty(),
                    context
                )
                # Add user info to context for use in handlers
                context.user_info = token_info
                return behavior(request, context)

            except grpc.RpcError:
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Authentication required")
                return None

        return auth_wrapper
```

#### Step 4: Health Checks and Metrics

**monitoring/health.py:**
```python
import grpc
from concurrent import futures
import time
from proto.health_pb2 import HealthCheckResponse
from proto.health_pb2_grpc import HealthServicer, add_HealthServicer_to_server

class HealthService(HealthServicer):
    """gRPC health checking service"""

    def __init__(self):
        self.start_time = time.time()
        self.services_status = {}

    def Check(self, request, context):
        """Standard health check"""
        # Check if all critical services are healthy
        all_healthy = all(status == "SERVING" for status in self.services_status.values())

        serving_status = "SERVING" if all_healthy else "NOT_SERVING"

        return HealthCheckResponse(status=serving_status)

    def Watch(self, request, context):
        """Health check streaming"""
        while context.is_active():
            # Send current health status
            all_healthy = all(status == "SERVING" for status in self.services_status.values())
            serving_status = "SERVING" if all_healthy else "NOT_SERVING"

            yield HealthCheckResponse(status=serving_status)
            time.sleep(30)  # Check every 30 seconds

    def set_service_status(self, service_name: str, status: str):
        """Update service status"""
        self.services_status[service_name] = status

    def get_service_status(self, service_name: str) -> str:
        """Get service status"""
        return self.services_status.get(service_name, "UNKNOWN")
```

### Part 3: Load Balancing and Service Discovery

#### Step 5: Load Balancing Setup

**load_balancer/client.py:**
```python
import grpc
import random
from typing import List

class LoadBalancedClient:
    """Client with load balancing capabilities"""

    def __init__(self, service_addresses: List[str], service_name: str):
        self.service_addresses = service_addresses
        self.service_name = service_name
        self.channels = {}

        # Create channels for all addresses
        for address in service_addresses:
            self.channels[address] = grpc.insecure_channel(address)

    def get_stub(self, stub_class):
        """Get load-balanced stub"""
        # Simple round-robin load balancing
        address = random.choice(self.service_addresses)
        channel = self.channels[address]
        return stub_class(channel)

    def close(self):
        """Close all channels"""
        for channel in self.channels.values():
            channel.close()

# DNS-based service discovery
class DNSServiceDiscovery:
    """Service discovery using DNS"""

    def __init__(self, service_name: str, dns_server: str = "localhost"):
        self.service_name = service_name
        self.dns_server = dns_server

    def get_service_addresses(self) -> List[str]:
        """Resolve service addresses from DNS"""
        # In a real implementation, you'd query DNS SRV records
        # For demo, return hardcoded addresses
        return [
            "service1.example.com:50051",
            "service2.example.com:50051",
            "service3.example.com:50051"
        ]
```

### Part 4: Docker and Kubernetes Deployment

#### Step 6: Production Dockerfile

**Dockerfile:**
```dockerfile
# Multi-stage build for production
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/uv
RUN uv venv /opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy requirements and install
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment
COPY --from=builder /opt/uv /opt/uv
ENV PATH="/opt/uv/bin:$PATH"

# Copy application
WORKDIR /app
COPY --chown=app:app . .

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import grpc; grpc.insecure_channel('localhost:50051')" || exit 1

# Expose port
EXPOSE 50051

# Run application
CMD ["python", "main.py"]
```

#### Step 7: Kubernetes Deployment

**k8s/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
    spec:
      containers:
      - name: grpc-service
        image: your-registry/grpc-service:latest
        ports:
        - containerPort: 50051
        env:
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: grpc-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          grpc:
            port: 50051
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          grpc:
            port: 50051
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
spec:
  selector:
    app: grpc-service
  ports:
    - port: 50051
      targetPort: 50051
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  tls:
  - hosts:
    - grpc.yourdomain.com
    secretName: grpc-tls
  rules:
  - host: grpc.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grpc-service
            port:
              number: 50051
```

#### Step 8: CI/CD Pipeline

**.github/workflows/deploy.yml:**
```yaml
name: Deploy gRPC Service

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        uv add -r requirements.txt
        uv add pytest pytest-cov
    - name: Generate protobuf
      run: python -m grpc_tools.protoc --proto_path=proto --python_out=proto --grpc_python_out=proto proto/*.proto
    - name: Run tests
      run: pytest --cov=. --cov-report=xml
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: your-registry/grpc-service:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v4
      with:
        namespace: production
        manifests: k8s/deployment.yaml
        images: your-registry/grpc-service:${{ github.sha }}
        kubectl-version: latest
```

### Part 5: Security and Production Hardening

#### Step 9: TLS Configuration

**security/tls_server.py:**
```python
import grpc
from concurrent import futures
import os

def create_secure_server(service, port=50051):
    """Create server with TLS encryption"""

    # Load certificates
    cert_file = os.getenv("TLS_CERT_FILE", "certs/server.crt")
    key_file = os.getenv("TLS_KEY_FILE", "certs/server.key")
    ca_file = os.getenv("TLS_CA_FILE", "certs/ca.crt")

    # Create server credentials
    with open(cert_file, 'rb') as f:
        cert = f.read()
    with open(key_file, 'rb') as f:
        key = f.read()

    server_credentials = grpc.ssl_server_credentials(
        [(key, cert)],
        root_certificates=ca_file,
        require_client_auth=True  # Mutual TLS
    )

    # Create server
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add service
    # add_YourServiceServicer_to_server(service, server)

    # Add secure port
    server.add_secure_port(f'[::]:{port}', server_credentials)

    return server

# Client with TLS
def create_secure_channel(host='localhost', port=50051):
    """Create client channel with TLS"""

    cert_file = os.getenv("TLS_CERT_FILE", "certs/server.crt")
    ca_file = os.getenv("TLS_CA_FILE", "certs/ca.crt")

    # Load certificates
    with open(cert_file, 'rb') as f:
        server_cert = f.read()
    with open(ca_file, 'rb') as f:
        ca_cert = f.read()

    # Create credentials
    credentials = grpc.ssl_channel_credentials(
        root_certificates=ca_cert,
        private_key=None,
        certificate_chain=None
    )

    return grpc.secure_channel(f'{host}:{port}', credentials)
```

#### Step 10: Rate Limiting and Security

**security/rate_limiting.py:**
```python
import grpc
import time
from collections import defaultdict, deque
from typing import Dict

class RateLimiter:
    """Simple rate limiter"""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, deque] = defaultdict(lambda: deque(maxlen=requests_per_minute))

    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        client_requests = self.requests[client_id]

        # Remove old requests (older than 1 minute)
        while client_requests and client_requests[0] < now - 60:
            client_requests.popleft()

        # Check if under limit
        if len(client_requests) < self.requests_per_minute:
            client_requests.append(now)
            return True

        return False

class SecurityInterceptor(grpc.ServerInterceptor):
    """Security interceptor with rate limiting"""

    def __init__(self):
        self.rate_limiter = RateLimiter(requests_per_minute=100)

    def intercept_service(self, continuation, handler_call_details):
        def security_wrapper(behavior, request, context):
            # Get client IP from metadata (simplified)
            client_ip = "unknown"  # In production, extract from X-Forwarded-For, etc.

            # Rate limiting
            if not self.rate_limiter.is_allowed(client_ip):
                context.set_code(grpc.StatusCode.RESOURCE_EXHAUSTED)
                context.set_details("Rate limit exceeded")
                return None

            # Continue with request
            return behavior(request, context)

        return security_wrapper
```

## Running the Production Setup

### Start Services with Monitoring
```bash
# Start auth service with monitoring
python services/auth_server.py

# Start metrics server (Prometheus format)
python -c "
import prometheus_client as prom
prom.start_http_server(8000)
print('Metrics server started on port 8000')
"

# View metrics
curl http://localhost:8000/metrics
```

### Docker Deployment
```bash
# Build and run with Docker
docker build -t grpc-service .
docker run -p 50051:50051 -e JWT_SECRET_KEY=your-secret grpc-service

# Docker Compose for full stack
docker-compose up -d
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods
kubectl logs -f deployment/grpc-service

# Port forward for testing
kubectl port-forward svc/grpc-service 50051:50051
```

## Challenge Exercises

### Challenge 1: Microservices Architecture
1. Split the monolithic service into microservices
2. Implement service mesh with Istio
3. Add distributed tracing with Jaeger
4. Implement circuit breakers and retries

### Challenge 2: Advanced Security
1. Implement OAuth2 with external providers
2. Add API key authentication
3. Implement fine-grained authorization (RBAC)
4. Add audit logging for security events

### Challenge 3: High Availability and Scaling
1. Implement database connection pooling
2. Add Redis caching layer
3. Configure horizontal pod autoscaling
4. Implement database replication

## Verification Checklist

### Authentication & Security
- [ ] JWT token generation and validation working
- [ ] Refresh token rotation implemented
- [ ] TLS encryption configured
- [ ] Rate limiting functional
- [ ] Authentication interceptors working

### Monitoring & Observability
- [ ] Prometheus metrics exposed
- [ ] Health checks implemented
- [ ] Logging configured properly
- [ ] Error tracking functional
- [ ] Performance monitoring active

### Deployment & Production
- [ ] Docker containers build successfully
- [ ] Kubernetes manifests valid
- [ ] CI/CD pipeline working
- [ ] Load balancing configured
- [ ] Service discovery operational

### Scalability & Reliability
- [ ] Horizontal scaling configured
- [ ] Database connections pooled
- [ ] Caching layer implemented
- [ ] Circuit breakers added
- [ ] Graceful shutdown implemented

## Troubleshooting

### Production Issues

**High latency:**
- Check network configuration
- Monitor database query performance
- Profile application code
- Check for memory leaks

**Authentication failures:**
- Verify JWT secret keys match
- Check token expiration times
- Validate certificate configurations
- Monitor token refresh flows

**Service discovery issues:**
- Verify DNS configuration
- Check load balancer settings
- Validate service registration
- Monitor health check endpoints

**Memory leaks:**
- Implement proper resource cleanup
- Monitor garbage collection
- Check for circular references
- Profile memory usage over time

## Next Steps

Congratulations! You have completed the gRPC curriculum with advanced production-ready patterns. You now have the skills to:

- Build secure, scalable gRPC services
- Implement authentication and authorization
- Set up monitoring and observability
- Deploy services in production environments
- Handle advanced networking and load balancing scenarios

## Additional Resources
- [gRPC Security Best Practices](https://grpc.io/docs/guides/auth/)
- [Kubernetes gRPC Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Prometheus Monitoring](https://prometheus.io/docs/practices/naming/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Service Mesh Patterns](https://istio.io/latest/docs/concepts/traffic-management/)

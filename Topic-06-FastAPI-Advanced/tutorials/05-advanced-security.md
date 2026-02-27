# Tutorial 05: Advanced Security Patterns

## Overview
This tutorial covers advanced security patterns and best practices for FastAPI applications. You'll learn how to implement comprehensive security measures including CORS, rate limiting, input validation, security headers, CSRF protection, and secure deployment practices.

## Security Fundamentals

### Security Principles

- **Defense in Depth**: Multiple layers of security controls
- **Fail-Safe Defaults**: Secure by default, explicit permissions
- **Least Privilege**: Minimum required permissions
- **Zero Trust**: Never trust, always verify
- **Secure by Design**: Security built into architecture

### Common Security Threats

- **Injection Attacks**: SQL injection, command injection
- **Broken Authentication**: Weak session management, JWT vulnerabilities
- **Sensitive Data Exposure**: Unencrypted data, weak encryption
- **XML External Entities (XXE)**: Malicious XML processing
- **Broken Access Control**: Improper authorization checks
- **Security Misconfiguration**: Default configurations, exposed debug info
- **Cross-Site Scripting (XSS)**: Malicious client-side scripts
- **Insecure Deserialization**: Unsafe object deserialization
- **Using Components with Known Vulnerabilities**: Outdated dependencies
- **Insufficient Logging & Monitoring**: Lack of security event tracking

## CORS (Cross-Origin Resource Sharing)

### CORS Configuration

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseSettings

class CORSSettings(BaseSettings):
    allow_origins: list = ["http://localhost:3000", "http://localhost:8080"]
    allow_credentials: bool = True
    allow_methods: list = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers: list = ["*"]
    max_age: int = 86400  # 24 hours

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_settings.allow_origins,
    allow_credentials=cors_settings.allow_credentials,
    allow_methods=cors_settings.allow_methods,
    allow_headers=cors_settings.allow_headers,
    max_age=cors_settings.max_age,
)
```

### Environment-Based CORS

```python
# config.py
import os
from typing import List

def get_cors_origins() -> List[str]:
    """Get allowed CORS origins based on environment"""
    if os.getenv("ENVIRONMENT") == "production":
        return [
            "https://yourdomain.com",
            "https://www.yourdomain.com",
        ]
    else:
        return [
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
        ]

# Dynamic CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
```

## Rate Limiting

### Basic Rate Limiting with Redis

```python
# middleware/rate_limit.py
from fastapi import Request, HTTPException, status
from redis.asyncio import Redis
import time
from typing import Optional

class RateLimiter:
    def __init__(self, redis: Redis, max_requests: int = 100, window_seconds: int = 60):
        self.redis = redis
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def is_allowed(self, key: str) -> bool:
        """Check if request is allowed"""
        current_time = int(time.time())
        window_start = current_time - self.window_seconds

        # Clean old entries and count current requests
        await self.redis.zremrangebyscore(key, 0, window_start)
        request_count = await self.redis.zcard(key)

        if request_count >= self.max_requests:
            return False

        # Add current request
        await self.redis.zadd(key, {str(current_time): current_time})
        await self.redis.expire(key, self.window_seconds)

        return True

class RateLimitMiddleware:
    def __init__(self, redis: Redis):
        self.redis = redis
        # Different limits for different endpoints
        self.endpoint_limits = {
            "/api/v1/auth/login": RateLimiter(redis, max_requests=5, window_seconds=300),  # 5 per 5 min
            "/api/v1/users": RateLimiter(redis, max_requests=10, window_seconds=60),      # 10 per min
        }
        self.default_limiter = RateLimiter(redis, max_requests=100, window_seconds=60)    # 100 per min

    async def __call__(self, request: Request, call_next):
        # Create key based on client IP and endpoint
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path

        # Get appropriate limiter
        limiter = self.endpoint_limits.get(endpoint, self.default_limiter)

        # Check rate limit
        key = f"rate_limit:{client_ip}:{endpoint}"
        if not await limiter.is_allowed(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"}
            )

        response = await call_next(request)
        return response

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check X-Forwarded-For header first (for proxies)
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # Take first IP if multiple
            return x_forwarded_for.split(",")[0].strip()

        # Fall back to direct client
        return request.client.host
```

### Advanced Rate Limiting

```python
# middleware/advanced_rate_limit.py
from fastapi import Request, HTTPException, status, Depends
from redis.asyncio import Redis
from typing import Optional
import time

class AdvancedRateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        burst_limit: Optional[int] = None
    ) -> dict:
        """
        Check rate limit with burst allowance
        Returns: {"allowed": bool, "remaining": int, "reset_time": int}
        """
        current_time = time.time()
        window_start = current_time - window_seconds

        # Use sorted set for sliding window
        cleanup_key = f"{key}:cleanup"
        last_cleanup = await self.redis.get(cleanup_key)

        # Periodic cleanup (every 10 seconds)
        if not last_cleanup or current_time - float(last_cleanup) > 10:
            await self.redis.zremrangebyscore(key, 0, window_start)
            await self.redis.setex(cleanup_key, 300, str(current_time))

        # Count requests in current window
        request_count = await self.redis.zcount(key, window_start, current_time)

        # Check burst limit (if set)
        if burst_limit and request_count >= burst_limit:
            reset_time = int(current_time + window_seconds)
            return {
                "allowed": False,
                "remaining": 0,
                "reset_time": reset_time
            }

        # Check regular limit
        if request_count >= max_requests:
            # Find oldest request to calculate reset time
            oldest_request = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_request:
                reset_time = int(oldest_request[0][1] + window_seconds)
            else:
                reset_time = int(current_time + window_seconds)

            return {
                "allowed": False,
                "remaining": 0,
                "reset_time": reset_time
            }

        # Add current request
        await self.redis.zadd(key, {str(current_time): current_time})
        await self.redis.expire(key, window_seconds * 2)  # Keep longer for cleanup

        remaining = max_requests - request_count - 1

        return {
            "allowed": True,
            "remaining": remaining,
            "reset_time": int(current_time + window_seconds)
        }

# Dependency for rate limiting
async def rate_limit_dependency(
    request: Request,
    redis: Redis = Depends(get_redis)
) -> dict:
    """Rate limit dependency that can be used in route handlers"""
    limiter = AdvancedRateLimiter(redis)

    client_ip = request.client.host
    endpoint = request.url.path
    user_id = getattr(request.state, 'user_id', None)

    # Use user ID if authenticated, otherwise IP
    key = f"rate_limit:{user_id or client_ip}:{endpoint}"

    result = await limiter.check_rate_limit(key, max_requests=100, window_seconds=60)

    if not result["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Remaining": str(result["remaining"]),
                "X-RateLimit-Reset": str(result["reset_time"]),
                "Retry-After": str(result["reset_time"] - int(time.time()))
            }
        )

    # Add rate limit headers to response
    request.state.rate_limit_info = result
    return result
```

## Security Headers

### Security Middleware

```python
# middleware/security_headers.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    def __init__(self, app, csp_directives: List[str] = None):
        super().__init__(app)
        self.csp_directives = csp_directives or [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'"
        ]

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy
        csp = "; ".join(self.csp_directives)
        response.headers["Content-Security-Policy"] = csp

        # HSTS (HTTP Strict Transport Security) - only for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Remove server header
        response.headers.pop("server", None)

        return response
```

### HTTPS Redirection

```python
# middleware/https_redirect.py
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse

class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirect HTTP requests to HTTPS"""

    async def dispatch(self, request: Request, call_next):
        # Skip redirect if already HTTPS or in development
        if request.url.scheme == "https" or os.getenv("ENVIRONMENT") != "production":
            return await call_next(request)

        # Redirect to HTTPS
        https_url = request.url.replace(scheme="https")
        return RedirectResponse(https_url, status_code=301)
```

## Input Validation and Sanitization

### Advanced Input Validation

```python
# schemas/validation.py
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
import re
from enum import Enum

class InputSanitizer:
    """Input sanitization utilities"""

    @staticmethod
    def sanitize_html(text: str) -> str:
        """Remove potentially dangerous HTML"""
        # Remove script tags and other dangerous elements
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
            r'<embed[^>]*>.*?</embed>',
            r'on\w+="[^"]*"',  # Remove event handlers
        ]

        for pattern in dangerous_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

        return text

    @staticmethod
    def validate_no_sql_injection(value: str) -> str:
        """Check for potential SQL injection patterns"""
        sql_patterns = [
            r';\s*(select|insert|update|delete|drop|create|alter)',
            r'--\s*$',
            r'/\*.*\*/',
            r'union\s+select',
            r'exec\s*\(',
        ]

        for pattern in sql_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValueError("Potentially dangerous SQL pattern detected")

        return value

class SecureUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, regex=r'^https?://[^\s/$.?#].[^\s]*$')

    @validator('username')
    def validate_username(cls, v):
        # Check for reserved words
        reserved_words = ['admin', 'root', 'system', 'api', 'www']
        if v.lower() in reserved_words:
            raise ValueError("Username is reserved")

        # Check for SQL injection
        InputSanitizer.validate_no_sql_injection(v)

        return v.lower().strip()

    @validator('full_name')
    def validate_full_name(cls, v):
        if v:
            # Sanitize HTML
            v = InputSanitizer.sanitize_html(v)
            # Check length
            if len(v.strip()) < 1:
                raise ValueError("Full name cannot be empty")
        return v

    @validator('bio')
    def validate_bio(cls, v):
        if v:
            # Sanitize HTML and check for dangerous content
            v = InputSanitizer.sanitize_html(v)
            InputSanitizer.validate_no_sql_injection(v)

            # Check for spam patterns
            spam_patterns = [r'http://[^\s]*', r'https://[^\s]*']
            url_count = sum(1 for pattern in spam_patterns for _ in re.finditer(pattern, v))
            if url_count > 3:
                raise ValueError("Bio contains too many URLs")

        return v

class SecurePostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10)
    excerpt: Optional[str] = Field(None, max_length=300)
    tags: List[str] = Field(default_factory=list, max_items=10)
    is_draft: bool = False

    @validator('title')
    def validate_title(cls, v):
        v = InputSanitizer.sanitize_html(v)
        InputSanitizer.validate_no_sql_injection(v)
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        # Allow some HTML tags but sanitize dangerous ones
        allowed_tags = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li']
        # This is a simplified example - use bleach library for production
        v = InputSanitizer.sanitize_html(v)
        InputSanitizer.validate_no_sql_injection(v)
        return v

    @validator('tags')
    def validate_tags(cls, v):
        validated_tags = []
        for tag in v:
            tag = tag.lower().strip()
            if not re.match(r'^[a-zA-Z0-9\-_\s]+$', tag):
                raise ValueError(f"Invalid tag format: {tag}")
            if len(tag) < 2 or len(tag) > 50:
                raise ValueError(f"Tag length must be between 2 and 50 characters: {tag}")
            validated_tags.append(tag)

        # Remove duplicates
        return list(set(validated_tags))
```

## CSRF Protection

### CSRF Token Implementation

```python
# middleware/csrf.py
from fastapi import Request, HTTPException, status, Depends
from starlette.middleware.base import BaseHTTPMiddleware
import secrets
import hashlib
from typing import Optional

class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""

    def __init__(self, app, secret_key: str, exempt_methods: set = None):
        super().__init__(app)
        self.secret_key = secret_key
        self.exempt_methods = exempt_methods or {"GET", "HEAD", "OPTIONS"}

    async def dispatch(self, request: Request, call_next):
        # Skip CSRF check for safe methods
        if request.method in self.exempt_methods:
            return await call_next(request)

        # Check CSRF token
        csrf_token = self._get_csrf_token(request)
        if not csrf_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )

        # Verify token
        if not self._verify_csrf_token(csrf_token, request):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token invalid"
            )

        response = await call_next(request)
        return response

    def _get_csrf_token(self, request: Request) -> Optional[str]:
        """Get CSRF token from request"""
        # Check header first
        token = request.headers.get("X-CSRF-Token")
        if token:
            return token

        # Check form data
        if hasattr(request, 'form'):
            token = request.form.get("csrf_token")
            if token:
                return token

        # Check JSON body
        if hasattr(request, 'json'):
            try:
                data = request.json()
                token = data.get("csrf_token")
                if token:
                    return token
            except:
                pass

        return None

    def _verify_csrf_token(self, token: str, request: Request) -> bool:
        """Verify CSRF token"""
        # For simplicity, we'll use a basic check
        # In production, you'd want to:
        # 1. Check token against session/user
        # 2. Verify token hasn't expired
        # 3. Check token entropy

        expected_token = self._generate_csrf_token(request)
        return token == expected_token

    def _generate_csrf_token(self, request: Request) -> str:
        """Generate expected CSRF token"""
        # Simple implementation - use session ID or user ID
        session_id = getattr(request.state, 'session_id', 'anonymous')
        token_data = f"{session_id}:{self.secret_key}"
        return hashlib.sha256(token_data.encode()).hexdigest()[:32]
```

### CSRF Token Endpoints

```python
# routes/csrf.py
from fastapi import APIRouter, Request, Depends
from ..middleware.csrf import CSRFMiddleware

router = APIRouter(prefix="/csrf", tags=["csrf"])

@router.get("/token")
async def get_csrf_token(request: Request):
    """Get CSRF token for the current session"""
    csrf_middleware = None
    # Find CSRF middleware in app.middleware
    for middleware in request.app.user_middleware:
        if isinstance(middleware.cls, type) and issubclass(middleware.cls, CSRFMiddleware):
            csrf_middleware = middleware.cls
            break

    if csrf_middleware:
        token = csrf_middleware._generate_csrf_token(None, request)
        return {"csrf_token": token}

    return {"csrf_token": None}
```

## API Key Authentication

### API Key Model

```python
# models/api_key.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import secrets

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scopes = Column(String(500), nullable=True)  # Comma-separated scopes
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="api_keys")

    @staticmethod
    def generate_key() -> str:
        """Generate a new API key"""
        return secrets.token_urlsafe(32)

    def set_key(self, key: str):
        """Set and hash the API key"""
        import hashlib
        self.key_hash = hashlib.sha256(key.encode()).hexdigest()

    def verify_key(self, key: str) -> bool:
        """Verify an API key"""
        import hashlib
        return self.key_hash == hashlib.sha256(key.encode()).hexdigest()
```

### API Key Authentication

```python
# auth/api_key.py
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.api_key import APIKey
from datetime import datetime

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(
    api_key: str = Security(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> APIKey:
    """Validate API key"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    # Hash the provided key for lookup
    import hashlib
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Find API key in database
    api_key_obj = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        )
    )
    api_key_obj = api_key_obj.scalars().first()

    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    # Check expiration
    if api_key_obj.expires_at and api_key_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired"
        )

    # Update last used timestamp
    api_key_obj.last_used_at = datetime.utcnow()
    await db.commit()

    return api_key_obj

async def get_api_key_with_scopes(
    required_scopes: list[str] = None,
    api_key_obj: APIKey = Depends(get_api_key)
) -> APIKey:
    """Validate API key with scope requirements"""
    if required_scopes:
        key_scopes = set(api_key_obj.scopes.split(',')) if api_key_obj.scopes else set()
        required_scopes = set(required_scopes)

        if not required_scopes.issubset(key_scopes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient API key permissions"
            )

    return api_key_obj
```

## Secure Deployment

### Environment Variables

```python
# config/security.py
import os
import secrets
from pydantic import BaseSettings, validator

class SecuritySettings(BaseSettings):
    # JWT settings
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Password settings
    bcrypt_rounds: int = 12

    # CORS settings
    allowed_origins: list = ["http://localhost:3000"]
    allow_credentials: bool = True

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60

    # Security headers
    enable_hsts: bool = True
    hsts_max_age: int = 31536000

    class Config:
        env_file = ".env"

    @validator('secret_key', pre=True, always=True)
    def validate_secret_key(cls, v):
        """Ensure secret key is set and secure"""
        if not v:
            if os.getenv("ENVIRONMENT") == "production":
                raise ValueError("SECRET_KEY is required in production")
            # Generate a random key for development
            v = secrets.token_urlsafe(32)
        return v

    @validator('allowed_origins')
    def validate_origins(cls, v):
        """Validate CORS origins"""
        if os.getenv("ENVIRONMENT") == "production":
            # Ensure only HTTPS origins in production
            for origin in v:
                if not origin.startswith("https://"):
                    raise ValueError(f"Insecure origin in production: {origin}")
        return v
```

### Docker Security

```dockerfile
# Dockerfile (security-focused)
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN uv add --no-cache-dir --user -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Create logs directory
RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run with security options
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Secrets Management

```python
# config/secrets.py
import os
from typing import Optional

class SecretsManager:
    """Secrets management utility"""

    @staticmethod
    def get_secret(name: str, default: Optional[str] = None) -> str:
        """Get secret from environment or file"""
        # Try environment variable first
        value = os.getenv(name.upper())
        if value:
            return value

        # Try file-based secret (Docker secrets, Kubernetes, etc.)
        secret_file = f"/run/secrets/{name.lower()}"
        if os.path.exists(secret_file):
            with open(secret_file, 'r') as f:
                return f.read().strip()

        if default is not None:
            return default

        raise ValueError(f"Secret '{name}' not found")

    @staticmethod
    def get_database_url() -> str:
        """Get database URL from secrets"""
        return SecretsManager.get_secret("database_url")

    @staticmethod
    def get_jwt_secret() -> str:
        """Get JWT secret from secrets"""
        return SecretsManager.get_secret("jwt_secret")

    @staticmethod
    def get_redis_url() -> str:
        """Get Redis URL from secrets"""
        return SecretsManager.get_secret("redis_url", "redis://localhost:6379")
```

## Monitoring and Logging

### Security Event Logging

```python
# logging/security.py
import logging
import json
from datetime import datetime
from typing import Dict, Any

class SecurityLogger:
    """Security event logger"""

    def __init__(self):
        self.logger = logging.getLogger("security")
        self.logger.setLevel(logging.INFO)

        # Create handler for security events
        handler = logging.FileHandler("logs/security.log")
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)

    def log_auth_attempt(self, username: str, success: bool, ip_address: str, user_agent: str = None):
        """Log authentication attempt"""
        event = {
            "event_type": "auth_attempt",
            "timestamp": datetime.utcnow().isoformat(),
            "username": username,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        self.logger.info(json.dumps(event))

    def log_rate_limit_exceeded(self, ip_address: str, endpoint: str, user_id: int = None):
        """Log rate limit violation"""
        event = {
            "event_type": "rate_limit_exceeded",
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": ip_address,
            "endpoint": endpoint,
            "user_id": user_id
        }
        self.logger.warning(json.dumps(event))

    def log_suspicious_activity(self, activity_type: str, details: Dict[str, Any], ip_address: str):
        """Log suspicious activity"""
        event = {
            "event_type": "suspicious_activity",
            "activity_type": activity_type,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details,
            "ip_address": ip_address
        }
        self.logger.warning(json.dumps(event))

# Global security logger
security_logger = SecurityLogger()
```

## Best Practices Summary

### Defense in Depth
1. **Input Validation**: Validate all inputs at multiple layers
2. **Authentication**: Use strong, multi-factor authentication
3. **Authorization**: Implement least-privilege access controls
4. **Session Management**: Secure session handling and timeouts
5. **Error Handling**: Don't expose sensitive information in errors
6. **Logging**: Log security events for monitoring and forensics
7. **Encryption**: Encrypt sensitive data in transit and at rest

### Secure Development Lifecycle
- **Security Requirements**: Define security requirements early
- **Secure Coding**: Follow secure coding practices
- **Code Review**: Review code for security vulnerabilities
- **Testing**: Include security testing in CI/CD
- **Monitoring**: Monitor applications for security events
- **Incident Response**: Have an incident response plan

## Hands-on Exercises

### Exercise 1: CORS and Rate Limiting
1. Configure CORS for your FastAPI application
2. Implement rate limiting with Redis
3. Test different rate limit scenarios
4. Add rate limit headers to responses

### Exercise 2: Security Headers and Input Validation
1. Implement security headers middleware
2. Create comprehensive input validation schemas
3. Add CSRF protection to sensitive endpoints
4. Test validation with malicious inputs

### Exercise 3: API Key Authentication
1. Implement API key generation and validation
2. Add scope-based permissions
3. Create API key management endpoints
4. Test authentication and authorization

## Next Steps
- [Workshop: JWT Auth](../workshops/workshop-01-jwt-auth.md)
- [Workshop: Advanced Auth](../workshops/workshop-04-advanced-auth.md)

## Additional Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [Security Headers Reference](https://owasp.org/www-project-secure-headers/)

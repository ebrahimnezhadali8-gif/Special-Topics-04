# Workshop 05: Advanced Security Implementation

## Duration: 150-180 minutes

## Overview
Implement comprehensive security measures for production FastAPI applications. Learn to protect against common attacks, implement secure authentication, and deploy with security best practices.

## Prerequisites
- Completed Workshops 1-4
- Understanding of JWT authentication and FastAPI security concepts
- Basic knowledge of web security principles

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement comprehensive security headers and CORS policies
- Set up rate limiting and DDoS protection
- Implement CSRF protection and secure session management
- Handle sensitive data securely with encryption
- Implement audit logging and monitoring
- Deploy with security best practices
- Conduct security testing and vulnerability assessment

---

## Part 1: Security Infrastructure Setup

### Project Structure
```bash
secure-fastapi-app/
├── main.py                    # Main FastAPI application
├── security/
│   ├── auth.py               # Authentication utilities
│   ├── crypto.py             # Encryption/decryption
│   ├── rate_limiter.py       # Rate limiting
│   ├── audit.py              # Audit logging
│   └── validators.py         # Input validation
├── middleware/
│   ├── security_headers.py   # Security headers middleware
│   ├── cors.py              # CORS configuration
│   └── csrf.py              # CSRF protection
├── models/
│   ├── user.py              # User models
│   ├── session.py           # Session models
│   └── audit.py             # Audit models
├── routers/
│   ├── auth.py              # Authentication routes
│   ├── users.py             # User management
│   └── admin.py             # Admin operations
├── tests/
│   ├── test_security.py     # Security tests
│   └── test_auth.py         # Authentication tests
└── config/
    ├── settings.py          # Application settings
    └── security.py          # Security configuration
```

### Dependencies
```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
slowapi==0.1.9
cryptography==41.0.7
bcrypt==4.0.1
pydantic[email]==2.5.0
redis==5.0.1
sqlalchemy==2.0.23
alembic==1.12.1
pytest==7.4.3
httpx==0.25.2
bandit==1.7.6
safety==2.3.5
```

---

## Part 2: Advanced Authentication and Authorization

### Multi-Factor Authentication (MFA)
```python
# security/auth.py
from fastapi import HTTPException, status
from typing import Optional
import pyotp
import qrcode
import io
from cryptography.fernet import Fernet

class MFAAuthenticator:
    def __init__(self, secret_key: str):
        self.cipher = Fernet(secret_key.encode())

    def generate_secret(self) -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()

    def get_totp_uri(self, username: str, secret: str) -> str:
        """Generate TOTP URI for QR code"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=username, issuer_name="SecureFastAPI")

    def generate_qr_code(self, uri: str) -> bytes:
        """Generate QR code image"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()

    def verify_totp(self, secret: str, token: str) -> bool:
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token)

    def encrypt_secret(self, secret: str) -> str:
        """Encrypt TOTP secret for storage"""
        return self.cipher.encrypt(secret.encode()).decode()

    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt TOTP secret"""
        return self.cipher.decrypt(encrypted_secret.encode()).decode()
```

### Role-Based Access Control (RBAC)
```python
# models/user.py
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class UserRole(str, Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

class Permission(str, Enum):
    READ_USERS = "read:users"
    WRITE_USERS = "write:users"
    DELETE_USERS = "delete:users"
    READ_POSTS = "read:posts"
    WRITE_POSTS = "write:posts"
    DELETE_POSTS = "delete:posts"
    ADMIN_ACCESS = "admin:access"

ROLE_PERMISSIONS = {
    UserRole.USER: [Permission.READ_POSTS, Permission.WRITE_POSTS],
    UserRole.MODERATOR: [
        Permission.READ_POSTS, Permission.WRITE_POSTS,
        Permission.DELETE_POSTS, Permission.READ_USERS
    ],
    UserRole.ADMIN: [
        Permission.READ_USERS, Permission.WRITE_USERS, Permission.DELETE_USERS,
        Permission.READ_POSTS, Permission.WRITE_POSTS, Permission.DELETE_POSTS,
        Permission.ADMIN_ACCESS
    ]
}

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
```

### Permission-Based Authorization
```python
# security/auth.py
from fastapi import Depends, HTTPException, status
from typing import List, Callable
from functools import wraps

from models.user import User, UserRole, Permission, ROLE_PERMISSIONS

def require_permissions(required_permissions: List[Permission]):
    """Decorator for permission-based authorization"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from kwargs (assuming dependency injection)
            user = kwargs.get('current_user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            user_permissions = ROLE_PERMISSIONS.get(UserRole(user.role), [])
            missing_permissions = set(required_permissions) - set(user_permissions)

            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permissions: {missing_permissions}"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user_with_permissions(
    required_permissions: Optional[List[Permission]] = None
):
    """Dependency for getting current user with permission check"""
    def dependency(current_user: User = Depends(get_current_user)):
        if required_permissions:
            user_permissions = ROLE_PERMISSIONS.get(UserRole(current_user.role), [])
            missing_permissions = set(required_permissions) - set(user_permissions)

            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {missing_permissions}"
                )
        return current_user
    return dependency
```

---

## Part 3: Security Middleware Implementation

### Security Headers Middleware
```python
# middleware/security_headers.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, List

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, csp_directives: Dict[str, List[str]] = None):
        super().__init__(app)
        self.csp_directives = csp_directives or {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'"],
            "connect-src": ["'self'"],
            "media-src": ["'self'"],
            "object-src": ["'none'"],
            "frame-src": ["'none'"],
        }

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy
        csp_value = "; ".join([
            f"{directive} {' '.join(sources)}"
            for directive, sources in self.csp_directives.items()
        ])
        response.headers["Content-Security-Policy"] = csp_value

        # Remove server header
        response.headers.pop("server", None)

        return response
```

### Advanced CORS Configuration
```python
# middleware/cors.py
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

class SecureCORSMiddleware(CORSMiddleware):
    def __init__(
        self,
        app,
        allow_origins: List[str] = None,
        allow_origin_regex: Optional[str] = None,
        allow_methods: List[str] = None,
        allow_headers: List[str] = None,
        allow_credentials: bool = False,
        expose_headers: List[str] = None,
        max_age: int = 600,
        allowed_hosts: List[str] = None,
    ):
        # Secure defaults
        allow_origins = allow_origins or []
        allow_methods = allow_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        allow_headers = allow_headers or [
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization"
        ]

        super().__init__(
            app=app,
            allow_origins=allow_origins,
            allow_origin_regex=allow_origin_regex,
            allow_methods=allow_methods,
            allow_headers=allow_headers,
            allow_credentials=allow_credentials,
            expose_headers=expose_headers,
            max_age=max_age,
        )

        self.allowed_hosts = set(allowed_hosts or [])

    def is_allowed_host(self, host: str) -> bool:
        """Check if host is in allowed hosts list"""
        if not self.allowed_hosts:
            return True
        return host in self.allowed_hosts
```

### CSRF Protection
```python
# middleware/csrf.py
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import secrets
import hashlib
import hmac
from typing import Optional

class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, secret_key: str, exempt_paths: List[str] = None):
        super().__init__(app)
        self.secret_key = secret_key
        self.exempt_paths = set(exempt_paths or ["/docs", "/redoc", "/openapi.json"])

    def generate_csrf_token(self) -> str:
        """Generate a new CSRF token"""
        token = secrets.token_urlsafe(32)
        return token

    def validate_csrf_token(self, token: str, session_token: str) -> bool:
        """Validate CSRF token"""
        if not token or not session_token:
            return False

        # Use HMAC for timing attack protection
        expected = hmac.new(
            self.secret_key.encode(),
            session_token.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(token, expected)

    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods and exempt paths
        if request.method in ["GET", "HEAD", "OPTIONS"] or request.url.path in self.exempt_paths:
            return await call_next(request)

        # Check for CSRF token in headers or form data
        csrf_token = (
            request.headers.get("X-CSRF-Token") or
            request.headers.get("X-XSRF-Token") or
            (await request.form()).get("csrf_token") if request.method in ["POST", "PUT", "PATCH", "DELETE"] else None
        )

        session_token = request.session.get("csrf_token") if hasattr(request, "session") else None

        if not self.validate_csrf_token(csrf_token, session_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed"
            )

        response = await call_next(request)

        # Set new CSRF token in response
        if hasattr(request, "session"):
            new_token = self.generate_csrf_token()
            request.session["csrf_token"] = new_token
            response.set_cookie(
                "csrf_token",
                new_token,
                httponly=True,
                secure=True,
                samesite="strict"
            )

        return response
```

---

## Part 4: Rate Limiting and DDoS Protection

### Advanced Rate Limiting
```python
# security/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, HTTPException, status
from redis import Redis
import time
from typing import Dict, Tuple

class AdvancedRateLimiter:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def sliding_window_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Implement sliding window rate limiting
        Returns: (allowed, remaining_requests)
        """
        now = time.time()
        window_start = now - window_seconds

        # Remove old requests outside the window
        self.redis.zremrangebyscore(key, 0, window_start)

        # Count requests in current window
        request_count = self.redis.zcard(key)

        if request_count >= limit:
            # Calculate reset time
            oldest_request = self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_request:
                reset_time = int(oldest_request[0][1]) + window_seconds
                remaining = max(0, int(reset_time - now))
            else:
                remaining = window_seconds
            return False, remaining

        # Add current request
        self.redis.zadd(key, {str(now): now})
        self.redis.expire(key, window_seconds)

        remaining = limit - request_count - 1
        return True, remaining

    def ip_based_rate_limit(self, request: Request, endpoint: str) -> Tuple[bool, Dict]:
        """Apply rate limiting based on IP and endpoint"""
        ip = get_remote_address(request)
        key = f"rate_limit:{ip}:{endpoint}"

        # Different limits for different endpoints
        limits = {
            "login": (5, 300),  # 5 attempts per 5 minutes
            "register": (3, 3600),  # 3 registrations per hour
            "api": (100, 60),  # 100 requests per minute
            "admin": (50, 60),  # 50 admin requests per minute
        }

        limit, window = limits.get(endpoint, (100, 60))
        allowed, remaining = self.sliding_window_rate_limit(key, limit, window)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "Retry-After": str(remaining),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + remaining)
                }
            )

        return True, {
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(time.time()) + window)
        }
```

### DDoS Protection Middleware
```python
# middleware/ddos_protection.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
import re

class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client=None, block_threshold: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.redis = redis_client
        self.block_threshold = block_threshold
        self.window_seconds = window_seconds
        self.suspicious_patterns = [
            r'\.\./',  # Directory traversal
            r'<script',  # XSS attempts
            r'union.*select',  # SQL injection
            r'eval\(',  # Code injection
        ]

    def is_suspicious_request(self, request: Request) -> bool:
        """Check for suspicious patterns in request"""
        # Check URL for suspicious patterns
        url = str(request.url)
        for pattern in self.suspicious_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True

        # Check headers for suspicious values
        user_agent = request.headers.get("user-agent", "")
        if len(user_agent) > 500 or not user_agent:
            return True

        # Check for rapid successive requests from same IP
        return False

    def track_request(self, ip: str) -> bool:
        """Track request frequency and block if threshold exceeded"""
        if not self.redis:
            return False

        key = f"ddos:{ip}"
        now = time.time()

        # Add request timestamp
        self.redis.zadd(key, {str(now): now})

        # Remove old requests
        self.redis.zremrangebyscore(key, 0, now - self.window_seconds)

        # Count requests in window
        request_count = self.redis.zcard(key)

        # Set expiry
        self.redis.expire(key, self.window_seconds)

        return request_count > self.block_threshold

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # Check for suspicious patterns
        if self.is_suspicious_request(request):
            return Response(
                content="Bad Request",
                status_code=400,
                media_type="text/plain"
            )

        # Check rate limiting
        if self.track_request(client_ip):
            return Response(
                content="Too Many Requests",
                status_code=429,
                media_type="text/plain",
                headers={"Retry-After": str(self.window_seconds)}
            )

        # Add security headers
        response = await call_next(request)
        response.headers["X-Request-ID"] = str(time.time())

        return response
```

---

## Part 5: Data Encryption and Secure Storage

### Sensitive Data Encryption
```python
# security/crypto.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from typing import Optional

class DataEncryption:
    def __init__(self, master_key: Optional[str] = None):
        if master_key:
            self.key = base64.urlsafe_b64encode(master_key.encode().ljust(32)[:32])
        else:
            self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)

    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()

    def hash_password(self, password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
        """Hash password with PBKDF2"""
        if salt is None:
            salt = os.urandom(32)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )

        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        salt_b64 = base64.urlsafe_b64encode(salt).decode()

        return key.decode(), salt_b64

    def verify_password(self, password: str, hashed: str, salt: str) -> bool:
        """Verify password against hash"""
        salt_bytes = base64.urlsafe_b64decode(salt.encode())
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_bytes,
            iterations=100000,
        )

        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key.decode() == hashed

class SecureField:
    """Descriptor for automatically encrypting/decrypting model fields"""

    def __init__(self, encryption_service: DataEncryption):
        self.encryption = encryption_service

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        encrypted_value = getattr(obj, f"_{self.name}", None)
        if encrypted_value:
            return self.encryption.decrypt_data(encrypted_value)
        return None

    def __set__(self, obj, value):
        if value is not None:
            encrypted = self.encryption.encrypt_data(value)
            setattr(obj, f"_{self.name}", encrypted)
        else:
            setattr(obj, f"_{self.name}", None)
```

### Secure Session Management
```python
# models/session.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base
import uuid

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, index=True)
    session_token = Column(String, unique=True, index=True)
    ip_address = Column(String)
    user_agent = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True))

    def is_expired(self) -> bool:
        """Check if session has expired"""
        from datetime import datetime
        return datetime.utcnow() > self.expires_at

    def update_activity(self):
        """Update last activity timestamp"""
        from datetime import datetime
        self.last_activity = datetime.utcnow()
```

---

## Part 6: Audit Logging and Monitoring

### Comprehensive Audit System
```python
# security/audit.py
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base
from typing import Dict, Any
import json

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)  # login, logout, password_change, etc.
    user_id = Column(Integer, index=True, nullable=True)
    ip_address = Column(String)
    user_agent = Column(String)
    resource_type = Column(String)  # user, post, file, etc.
    resource_id = Column(String, nullable=True)
    action = Column(String)  # create, read, update, delete
    status = Column(String)  # success, failure
    details = Column(JSON)  # Additional context
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    session_id = Column(String, index=True)

class AuditLogger:
    def __init__(self, db_session):
        self.db = db_session

    def log_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        ip_address: str = None,
        user_agent: str = None,
        resource_type: str = None,
        resource_id: str = None,
        action: str = None,
        status: str = "success",
        details: Dict[str, Any] = None,
        session_id: str = None
    ):
        """Log security event"""
        audit_event = AuditEvent(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            status=status,
            details=details or {},
            session_id=session_id
        )

        try:
            self.db.add(audit_event)
            self.db.commit()
        except Exception as e:
            # Log to file if database logging fails
            print(f"Audit logging failed: {e}")

    def log_authentication_attempt(self, username: str, success: bool, ip: str, user_agent: str):
        """Log authentication attempts"""
        status = "success" if success else "failure"
        self.log_event(
            event_type="authentication",
            ip_address=ip,
            user_agent=user_agent,
            status=status,
            details={"username": username}
        )

    def log_resource_access(self, user_id: int, resource_type: str, resource_id: str,
                           action: str, ip: str, session_id: str):
        """Log resource access"""
        self.log_event(
            event_type="resource_access",
            user_id=user_id,
            ip_address=ip,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            session_id=session_id
        )

    def log_security_incident(self, incident_type: str, details: Dict[str, Any], ip: str):
        """Log security incidents"""
        self.log_event(
            event_type="security_incident",
            ip_address=ip,
            status="alert",
            details={"incident_type": incident_type, **details}
        )
```

### Security Monitoring Middleware
```python
# middleware/security_monitor.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from security.audit import AuditLogger
import time
import re

class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, audit_logger: AuditLogger, db_session):
        super().__init__(app)
        self.audit_logger = audit_logger
        self.db = db_session

        # Patterns for suspicious activity
        self.suspicious_patterns = {
            'sql_injection': re.compile(r'(\b(select|union|insert|update|delete|drop|create|alter)\b.*\b(from|into|table|database)\b)', re.IGNORECASE),
            'xss_attempt': re.compile(r'<script|<iframe|<object|<embed', re.IGNORECASE),
            'path_traversal': re.compile(r'\.\./|\.\.\\'),
            'command_injection': re.compile(r'[;&|`$()]'),
        }

    def detect_suspicious_activity(self, request: Request) -> Dict[str, Any]:
        """Detect potentially malicious activity"""
        issues = {}

        # Check URL for suspicious patterns
        url = str(request.url)
        for threat_type, pattern in self.suspicious_patterns.items():
            if pattern.search(url):
                issues[threat_type] = True

        # Check headers
        user_agent = request.headers.get("user-agent", "")
        if len(user_agent) > 500:
            issues['suspicious_user_agent'] = True

        referer = request.headers.get("referer", "")
        if referer and not referer.startswith(request.headers.get("origin", "")):
            issues['referer_mismatch'] = True

        return issues

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"

        # Detect suspicious activity
        security_issues = self.detect_suspicious_activity(request)

        if security_issues:
            self.audit_logger.log_security_incident(
                incident_type="suspicious_request",
                details={
                    "method": request.method,
                    "url": str(request.url),
                    "issues": security_issues,
                    "headers": dict(request.headers)
                },
                ip=client_ip
            )

        response = await call_next(request)
        duration = time.time() - start_time

        # Log slow requests (potential DoS)
        if duration > 10:  # 10 seconds
            self.audit_logger.log_security_incident(
                incident_type="slow_request",
                details={
                    "method": request.method,
                    "url": str(request.url),
                    "duration": duration,
                    "status_code": response.status_code
                },
                ip=client_ip
            )

        # Log failed authentication attempts
        if response.status_code == 401:
            self.audit_logger.log_event(
                event_type="failed_authentication",
                ip_address=client_ip,
                status="failure",
                details={"endpoint": request.url.path}
            )

        return response
```

---

## Part 7: Security Testing and Validation

### Automated Security Testing
```python
# tests/test_security.py
import pytest
from fastapi.testclient import TestClient
from main import app
from security.crypto import DataEncryption
import json

client = TestClient(app)

class TestSecurityHeaders:
    def test_security_headers_present(self):
        response = client.get("/")
        assert response.status_code == 200

        # Check security headers
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Strict-Transport-Security" in response.headers
        assert "Content-Security-Policy" in response.headers

    def test_cors_headers(self):
        response = client.options("/api/users",
                                headers={"Origin": "https://trusted-domain.com"})
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers

class TestRateLimiting:
    def test_rate_limit_enforced(self):
        # Simulate multiple requests
        for i in range(110):  # Exceed limit
            response = client.get("/api/users")

        assert response.status_code == 429
        assert "Retry-After" in response.headers

    def test_rate_limit_headers(self):
        response = client.get("/api/users")
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers

class TestAuthentication:
    def test_mfa_setup(self):
        # Test MFA setup flow
        response = client.post("/auth/mfa/setup")
        assert response.status_code == 200

        data = response.json()
        assert "qr_code" in data
        assert "secret" in data

    def test_mfa_verification(self):
        # Test MFA verification (mock TOTP)
        response = client.post("/auth/mfa/verify",
                             json={"token": "123456"})
        assert response.status_code in [200, 400]  # Valid or invalid token

class TestDataEncryption:
    def test_data_encryption(self):
        crypto = DataEncryption()
        original = "sensitive_data_123"

        encrypted = crypto.encrypt_data(original)
        decrypted = crypto.decrypt_data(encrypted)

        assert decrypted == original
        assert encrypted != original

    def test_password_hashing(self):
        crypto = DataEncryption()

        hashed, salt = crypto.hash_password("mypassword")
        assert crypto.verify_password("mypassword", hashed, salt)
        assert not crypto.verify_password("wrongpassword", hashed, salt)

class TestInputValidation:
    def test_sql_injection_prevention(self):
        # Test various SQL injection attempts
        payloads = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1 UNION SELECT * FROM users--"
        ]

        for payload in payloads:
            response = client.post("/auth/login",
                                 json={"username": payload, "password": "pass"})
            # Should not succeed with malicious input
            assert response.status_code in [401, 422]  # Unauthorized or validation error

    def test_xss_prevention(self):
        xss_payloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')"
        ]

        for payload in xss_payloads:
            response = client.post("/api/posts",
                                 json={"title": "Test", "content": payload},
                                 headers={"Authorization": "Bearer valid_token"})
            # Content should be sanitized or rejected
            assert response.status_code in [201, 422]

class TestAuditLogging:
    def test_audit_log_creation(self, db_session):
        from security.audit import AuditLogger

        audit_logger = AuditLogger(db_session)

        # Perform action that should be logged
        response = client.post("/auth/login",
                             json={"username": "test", "password": "wrong"})

        # Check audit log
        logs = db_session.query(AuditEvent).filter(
            AuditEvent.event_type == "authentication",
            AuditEvent.status == "failure"
        ).all()

        assert len(logs) > 0
```

### Security Scanning Integration
```python
# scripts/security_scan.py
import subprocess
import sys
from pathlib import Path

def run_security_scans():
    """Run automated security scans"""
    project_root = Path(__file__).parent.parent

    print("🔒 Running Security Scans...")

    # Run Bandit (Python security linter)
    print("Running Bandit...")
    result = subprocess.run([
        sys.executable, "-m", "bandit", "-r", str(project_root),
        "-f", "json", "-o", "security_reports/bandit_report.json"
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print("❌ Bandit found security issues:")
        print(result.stdout)

    # Run Safety (dependency vulnerability check)
    print("Running Safety...")
    result = subprocess.run([
        sys.executable, "-m", "safety", "check",
        "--output", "security_reports/safety_report.json"
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print("❌ Safety found vulnerabilities:")
        print(result.stdout)

    print("✅ Security scans completed")

if __name__ == "__main__":
    run_security_scans()
```

---

## Part 8: Production Deployment Security

### Secure Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Security: Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Security: Install security updates
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Set working directory with proper permissions
WORKDIR /app
RUN chown -R appuser:appuser /app

# Security: Copy requirements first for better caching
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Security: Copy application code
COPY --chown=appuser:appuser . .

# Security: Switch to non-root user
USER appuser

# Security: Expose only necessary port
EXPOSE 8000

# Security: Use exec form for proper signal handling
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Security
```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:password@db:5432/app

# Security
SECRET_KEY=your-super-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
REDIS_URL=redis://redis:6379
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
```

### Health Checks and Monitoring
```python
# routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from redis import Redis
import psutil
import time

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
def health_check():
    """Basic health check"""
    return {"status": "healthy", "timestamp": time.time()}

@router.get("/detailed")
def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with dependencies"""
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }

    # Database check
    try:
        db.execute("SELECT 1")
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Redis check
    try:
        redis = Redis.from_url("redis://redis:6379")
        redis.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # System resources
    health_status["system"] = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }

    return health_status
```

---

## Exercise: Complete Security Implementation

### Requirements
Implement a production-ready secure FastAPI application with:

1. **Multi-Factor Authentication**
   - TOTP-based MFA
   - QR code generation
   - Backup codes

2. **Advanced Authorization**
   - Role-based access control
   - Permission-based endpoints
   - Resource ownership validation

3. **Security Middleware Stack**
   - Comprehensive security headers
   - Advanced CORS configuration
   - CSRF protection
   - DDoS protection

4. **Rate Limiting & Monitoring**
   - Multi-tier rate limiting
   - Request monitoring
   - Audit logging

5. **Data Protection**
   - Field-level encryption
   - Secure session management
   - Sensitive data handling

6. **Security Testing**
   - Automated security scans
   - Penetration testing preparation
   - Vulnerability assessment

### Deliverables
- Complete secure FastAPI application
- Security configuration documentation
- Automated testing suite
- Deployment security checklist
- Incident response plan

---

## Key Takeaways

1. **Defense in Depth**: Multiple security layers protect against various threats
2. **Secure by Default**: Implement security measures from the start
3. **Zero Trust**: Always verify, never assume trust
4. **Audit Everything**: Comprehensive logging for security monitoring
5. **Stay Updated**: Regularly update dependencies and security patches
6. **Test Security**: Automated testing prevents security regressions

## Next Steps
- Implement OAuth 2.0 / OpenID Connect
- Set up security information and event management (SIEM)
- Implement API gateway with security policies
- Learn about cloud security best practices
- Study compliance frameworks (GDPR, HIPAA, SOC 2)

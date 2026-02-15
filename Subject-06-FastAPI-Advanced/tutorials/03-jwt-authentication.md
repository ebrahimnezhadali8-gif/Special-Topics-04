# Tutorial 03: JWT Authentication

## Overview
This tutorial covers JSON Web Token (JWT) authentication in FastAPI applications. You'll learn how to implement secure user authentication, token-based authorization, password hashing, and protect your API endpoints with JWT tokens.

## Understanding JWT

### What is JWT?

JSON Web Token (JWT) is an open standard for securely transmitting information between parties as a JSON object. It's commonly used for authentication and authorization in web applications.

**JWT Structure:**
- **Header**: Contains token type and signing algorithm
- **Payload**: Contains claims (user data, expiration, etc.)
- **Signature**: Verifies token integrity

**Example JWT:**
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTY0MjE3MjgwMCwiZXhwIjoxNjQyMTc2NDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### JWT vs Session-Based Auth

| Aspect | JWT | Sessions |
|--------|-----|----------|
| **Stateless** | ✅ | ❌ |
| **Scalability** | ✅ | ❌ |
| **Mobile Friendly** | ✅ | ❌ |
| **Token Size** | Larger | Smaller |
| **Revocation** | Complex | Simple |
| **Storage** | Client-side | Server-side |

## Setting Up Authentication

### Dependencies

```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
sqlalchemy==2.0.23
alembic==1.12.1
```

### Basic JWT Configuration

```python
# config.py
from pydantic import BaseSettings
import os

class AuthSettings(BaseSettings):
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"

auth_settings = AuthSettings()
```

### Password Hashing

```python
# auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from .config import auth_settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    # Set expiration time
    expire = datetime.utcnow() + timedelta(minutes=auth_settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})

    # Create token
    encoded_jwt = jwt.encode(to_encode, auth_settings.secret_key, algorithm=auth_settings.algorithm)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()

    # Set longer expiration for refresh token
    expire = datetime.utcnow() + timedelta(days=auth_settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})

    encoded_jwt = jwt.encode(to_encode, auth_settings.secret_key, algorithm=auth_settings.algorithm)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, auth_settings.secret_key, algorithms=[auth_settings.algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

## User Management

### User Model

```python
# models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Pydantic Schemas

```python
# schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
```

## Authentication Endpoints

### Login and Token Generation

```python
# routes/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User as UserModel
from ..schemas.user import User, Token, TokenData
from ..auth import (
    authenticate_user, create_access_token, create_refresh_token,
    get_current_user, get_current_active_user
)

router = APIRouter(prefix="/auth", tags=["authentication"])

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def authenticate_user(db: Session, username: str, password: str):
    """Authenticate user with username/password"""
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = verify_token(token)
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        token_type: str = payload.get("type")

        if username is None or token_type != "access":
            raise credentials_exception

        token_data = TokenData(username=username, user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = db.query(UserModel).filter(UserModel.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserModel = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access/refresh tokens"""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id}
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        payload = verify_token(refresh_token)
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        token_type: str = payload.get("type")

        if username is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        # Create new access token
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id}
        )

        # Optionally create new refresh token
        new_refresh_token = create_refresh_token(
            data={"sub": user.username, "user_id": user.id}
        )

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
```

## Protected Endpoints

### User Management

```python
# routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User as UserModel
from ..schemas.user import User, UserCreate, UserUpdate, UserInDB
from ..auth import get_password_hash, get_current_active_user, get_current_superuser

router = APIRouter(prefix="/users", tags=["users"])

async def get_current_superuser(current_user: UserModel = Depends(get_current_active_user)):
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_superuser)
):
    """Create new user (admin only)"""
    # Check if username exists
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check if email exists
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=User)
async def read_users_me(current_user: UserModel = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user

@router.put("/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user"""
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users
```

## Advanced Authentication Patterns

### Role-Based Access Control

```python
# auth.py (continued)
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

def get_current_user_with_role(required_role: UserRole):
    """Dependency factory for role-based access"""
    async def dependency(
        current_user: UserModel = Depends(get_current_active_user)
    ):
        # Check if user has required role
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role} required"
            )
        return current_user
    return dependency

# Usage
get_moderator_user = get_current_user_with_role(UserRole.MODERATOR)
get_admin_user = get_current_user_with_role(UserRole.ADMIN)
```

### API Key Authentication

```python
# auth.py (continued)
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key: str = Depends(api_key_header)):
    """Validate API key"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    # Validate API key (check against database, cache, etc.)
    if api_key != "valid-api-key":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    return api_key
```

### OAuth2 Integration

```python
# routes/auth.py (continued)
from fastapi import Request
from authlib.integrations.fastapi_oauth2 import OAuth2Token
from authlib.integrations.httpx_oauth2 import OAuth2Client

# OAuth2 configuration would go here
# This is a simplified example

@router.get("/login/google")
async def login_google():
    """Redirect to Google OAuth2"""
    # OAuth2 flow implementation
    return {"message": "Redirect to Google OAuth2"}

@router.get("/auth/google/callback")
async def auth_google_callback(code: str, state: str):
    """Handle Google OAuth2 callback"""
    # Exchange code for token and create user session
    return {"message": "OAuth2 login successful"}
```

## Security Best Practices

### Password Policies

```python
# auth.py (continued)
import re

def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

def get_password_hash(password: str) -> str:
    """Enhanced password hashing with validation"""
    if not validate_password_strength(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet security requirements"
        )
    return pwd_context.hash(password)
```

### Rate Limiting

```python
# middleware/rate_limit.py
from fastapi import Request, HTTPException
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        client_requests = self.requests[client_ip]

        # Remove old requests
        client_requests[:] = [req for req in client_requests if now - req < 60]

        if len(client_requests) >= self.requests_per_minute:
            return False

        client_requests.append(now)
        return True

rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_ip = request.client.host

    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

    response = await call_next(request)
    return response
```

### CORS Configuration

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing Authentication

### Authentication Tests

```python
# tests/test_auth.py
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

def test_login_success(client: TestClient, test_db: Session):
    """Test successful login"""
    # Create test user
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123!"
    }

    # Register user
    response = client.post("/users/", json=user_data)
    assert response.status_code == 201

    # Login
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "TestPass123!"
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client: TestClient):
    """Test login with invalid credentials"""
    response = client.post("/auth/login", data={
        "username": "invalid",
        "password": "invalid"
    })

    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

def test_protected_endpoint_without_token(client: TestClient):
    """Test accessing protected endpoint without token"""
    response = client.get("/users/me")
    assert response.status_code == 401

def test_protected_endpoint_with_token(client: TestClient, test_db: Session):
    """Test accessing protected endpoint with valid token"""
    # Create user and get token (implementation depends on your test setup)

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
```

## Hands-on Exercises

### Exercise 1: Basic Authentication
1. Implement user registration and login endpoints
2. Create JWT token generation and validation
3. Protect API endpoints with authentication
4. Test authentication flow

### Exercise 2: Role-Based Access Control
1. Add user roles (user, moderator, admin)
2. Implement role-based endpoint protection
3. Create role-specific routes and permissions
4. Test different role access patterns

### Exercise 3: Token Refresh and Security
1. Implement refresh token functionality
2. Add token blacklisting for logout
3. Implement rate limiting and brute force protection
4. Add comprehensive security headers

## Next Steps
- [Async Database Tutorial](../tutorials/04-async-database.md)
- [Advanced Security Tutorial](../tutorials/05-advanced-security.md)
- [Workshop: JWT Auth](../workshops/workshop-01-jwt-auth.md)

## Additional Resources
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/)
- [OAuth2 Specification](https://tools.ietf.org/html/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

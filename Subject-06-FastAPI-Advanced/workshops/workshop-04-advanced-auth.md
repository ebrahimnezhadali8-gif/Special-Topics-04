# Workshop 04: Advanced Authentication Patterns

## Overview
This workshop implements advanced authentication patterns including OAuth2 social login, API keys, role-based access control (RBAC), multi-factor authentication (MFA), and session management. You'll build a comprehensive authentication system suitable for production applications.

## Prerequisites
- Completed [JWT Authentication Workshop](../workshops/workshop-01-jwt-auth.md)
- Understanding of OAuth2, JWT, and security principles
- Experience with FastAPI and database operations

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement OAuth2 social login with Google/GitHub
- Create API key authentication system
- Build role-based access control (RBAC)
- Add multi-factor authentication (MFA)
- Implement secure session management
- Handle token refresh and blacklisting

## Workshop Structure

### Part 1: OAuth2 Social Login

#### Step 1: OAuth2 Setup

Create a new project for advanced authentication:

```bash
mkdir advanced-auth-system
cd advanced-auth-system
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

uv add fastapi uvicorn authlib httpx python-jose[cryptography] passlib[bcrypt] sqlalchemy python-multipart pyotp qrcode[pil] redis

mkdir -p app/{auth,oauth,schemas,models,api,core}
touch app/__init__.py app/main.py app/config.py
touch app/auth/__init__.py app/auth/jwt.py app/auth/oauth.py app/auth/mfa.py
touch app/oauth/__init__.py app/oauth/google.py app/oauth/github.py
touch app/schemas/__init__.py app/schemas/auth.py app/schemas/oauth.py
touch app/models/__init__.py app/models/user.py app/models/oauth.py
touch app/api/__init__.py app/api/auth.py app/api/oauth.py
touch app/core/__init__.py app/core/security.py
```

#### Step 2: Enhanced Configuration

**app/config.py:**
```python
from pydantic import BaseSettings
import os

class OAuthSettings(BaseSettings):
    # OAuth2 Providers
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/oauth/google/callback"

    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET")
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/oauth/github/callback"

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security
    MFA_SECRET_LENGTH: int = 32
    API_KEY_LENGTH: int = 64

    class Config:
        env_file = ".env"

oauth_settings = OAuthSettings()
```

#### Step 3: Enhanced User Model

**app/models/user.py:**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String(50), nullable=False)  # 'google', 'github'
    provider_user_id = Column(String(100), nullable=False)
    provider_data = Column(Text)  # JSON data from provider
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="oauth_accounts")

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(128), unique=True, nullable=False)
    scopes = Column(Text)  # Comma-separated scopes
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="api_keys")
```

#### Step 4: OAuth2 Implementation

**app/oauth/google.py:**
```python
from authlib.integrations.fastapi_oauth2 import OAuth2Token
from authlib.integrations.httpx_oauth2 import OAuth2Client
from fastapi import HTTPException
import httpx
from ..config import oauth_settings

class GoogleOAuth:
    def __init__(self):
        self.client_id = oauth_settings.GOOGLE_CLIENT_ID
        self.client_secret = oauth_settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = oauth_settings.GOOGLE_REDIRECT_URI

        self.client = OAuth2Client(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            base_url="https://accounts.google.com"
        )

    async def get_authorization_url(self, state: str = None):
        """Get Google OAuth2 authorization URL"""
        uri, state = self.client.create_authorization_url(
            'https://accounts.google.com/o/oauth2/auth',
            scope=['openid', 'email', 'profile'],
            state=state
        )
        return uri, state

    async def get_access_token(self, code: str):
        """Exchange authorization code for access token"""
        try:
            token = await self.client.fetch_token(
                'https://oauth2.googleapis.com/token',
                authorization_response=f"{self.redirect_uri}?code={code}"
            )
            return token
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"OAuth2 error: {str(e)}")

    async def get_user_info(self, token: dict):
        """Get user info from Google"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            response.raise_for_status()
            return response.json()

# Global instance
google_oauth = GoogleOAuth()
```

**app/oauth/github.py:**
```python
from authlib.integrations.httpx_oauth2 import OAuth2Client
from fastapi import HTTPException
import httpx
from ..config import oauth_settings

class GitHubOAuth:
    def __init__(self):
        self.client_id = oauth_settings.GITHUB_CLIENT_ID
        self.client_secret = oauth_settings.GITHUB_CLIENT_SECRET
        self.redirect_uri = oauth_settings.GITHUB_REDIRECT_URI

        self.client = OAuth2Client(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            base_url="https://github.com"
        )

    async def get_authorization_url(self, state: str = None):
        """Get GitHub OAuth2 authorization URL"""
        uri, state = self.client.create_authorization_url(
            'https://github.com/login/oauth/authorize',
            scope=['user:email'],
            state=state
        )
        return uri, state

    async def get_access_token(self, code: str):
        """Exchange authorization code for access token"""
        try:
            token = await self.client.fetch_token(
                'https://github.com/login/oauth/access_token',
                authorization_response=f"{self.redirect_uri}?code={code}"
            )
            return token
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"OAuth2 error: {str(e)}")

    async def get_user_info(self, token: dict):
        """Get user info from GitHub"""
        async with httpx.AsyncClient() as client:
            # Get user profile
            response = await client.get(
                'https://api.github.com/user',
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            response.raise_for_status()
            user_data = response.json()

            # Get user email (might be private)
            email_response = await client.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            emails = email_response.json() if email_response.status_code == 200 else []

            # Find primary email
            primary_email = None
            for email_info in emails:
                if email_info.get('primary'):
                    primary_email = email_info['email']
                    break

            return {
                'id': str(user_data['id']),
                'email': primary_email or user_data.get('email'),
                'name': user_data.get('name'),
                'login': user_data['login'],
                'avatar_url': user_data.get('avatar_url')
            }

# Global instance
github_oauth = GitHubOAuth()
```

### Part 2: Multi-Factor Authentication (MFA)

#### Step 5: MFA Implementation

**app/auth/mfa.py:**
```python
import pyotp
import qrcode
import io
import base64
from typing import Optional
from fastapi import HTTPException

class MFAHandler:
    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()

    @staticmethod
    def generate_qr_code(secret: str, username: str, issuer: str = "YourApp") -> str:
        """Generate QR code for TOTP setup"""
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(username, issuer_name=issuer)

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        # Create QR code image
        img = qr.make_image(fill='black', back_color='white')

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{qr_code_base64}"

    @staticmethod
    def verify_totp(secret: str, token: str) -> bool:
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token)

    @staticmethod
    def get_backup_codes() -> list[str]:
        """Generate backup codes for MFA"""
        codes = []
        for _ in range(10):
            code = pyotp.random_base32()[:8].upper()
            codes.append(code)
        return codes

class MFAVerificationError(Exception):
    pass
```

### Part 3: API Key Authentication

#### Step 6: API Key System

**app/auth/api_key.py:**
```python
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.user import APIKey

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class APIKeyManager:
    @staticmethod
    def generate_api_key() -> str:
        """Generate a new API key"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()

    @staticmethod
    def verify_api_key(stored_hash: str, provided_key: str) -> bool:
        """Verify API key against stored hash"""
        return stored_hash == hashlib.sha256(provided_key.encode()).hexdigest()

async def get_api_key_user(
    api_key: str = Security(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> Optional[dict]:
    """Get user from API key"""
    if not api_key:
        return None

    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Find API key in database
    result = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        )
    )
    db_api_key = result.scalars().first()

    if not db_api_key:
        return None

    # Check expiration
    if db_api_key.expires_at and db_api_key.expires_at < datetime.utcnow():
        return None

    # Update last used
    db_api_key.last_used_at = datetime.utcnow()
    await db.commit()

    return {
        "user_id": db_api_key.user_id,
        "key_id": db_api_key.id,
        "scopes": db_api_key.scopes.split(",") if db_api_key.scopes else []
    }

async def require_api_key(api_key_data: dict = Depends(get_api_key_user)):
    """Require valid API key"""
    if not api_key_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid API key required"
        )
    return api_key_data

async def require_api_key_scope(required_scope: str):
    """Create dependency for specific API key scope"""
    async def dependency(api_key_data: dict = Depends(require_api_key)):
        scopes = api_key_data.get("scopes", [])
        if required_scope not in scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key lacks required scope: {required_scope}"
            )
        return api_key_data
    return dependency
```

### Part 4: Role-Based Access Control

#### Step 7: RBAC Implementation

**app/auth/rbac.py:**
```python
from typing import List, Dict, Set
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.user import User, Role, UserRole
from .jwt import get_current_user

# Define permissions
PERMISSIONS = {
    "users:read": "Read user information",
    "users:write": "Create and modify users",
    "posts:read": "Read posts",
    "posts:write": "Create and modify posts",
    "admin:full": "Full administrative access"
}

# Role definitions
ROLE_PERMISSIONS = {
    "user": ["users:read", "posts:read", "posts:write"],
    "moderator": ["users:read", "posts:read", "posts:write", "users:write"],
    "admin": ["admin:full"]
}

class RBACManager:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_permissions(self, user_id: int) -> Set[str]:
        """Get all permissions for a user"""
        # Get user roles
        result = await self.db.execute(
            select(Role.name).join(UserRole).where(UserRole.user_id == user_id)
        )
        role_names = result.scalars().all()

        # Collect permissions from all roles
        permissions = set()
        for role_name in role_names:
            if role_name in ROLE_PERMISSIONS:
                permissions.update(ROLE_PERMISSIONS[role_name])

        return permissions

    async def user_has_permission(self, user_id: int, permission: str) -> bool:
        """Check if user has specific permission"""
        user_permissions = await self.get_user_permissions(user_id)
        return permission in user_permissions

    async def user_has_any_permission(self, user_id: int, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions"""
        user_permissions = await self.get_user_permissions(user_id)
        return bool(set(permissions) & user_permissions)

    async def require_permission(self, permission: str):
        """Create dependency that requires specific permission"""
        async def dependency(current_user: User = Depends(get_current_user), db = Depends(get_db)):
            rbac = RBACManager(db)
            has_permission = await rbac.user_has_permission(current_user.id, permission)

            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission}"
                )

            return current_user
        return dependency

# Convenience functions for common permissions
require_admin = RBACManager.require_permission(None, "admin:full")
require_user_write = RBACManager.require_permission(None, "users:write")
require_post_write = RBACManager.require_permission(None, "posts:write")
```

### Part 5: Complete Authentication API

#### Step 8: Authentication Endpoints

**app/api/auth.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.auth import (
    UserCreate, UserLogin, Token, UserResponse, MFASetupResponse,
    APIKeyCreate, APIKeyResponse, PasswordResetRequest
)
from ..auth.jwt import create_access_token, create_refresh_token, get_current_user
from ..auth.mfa import MFAHandler, MFAVerificationError
from ..auth.api_key import APIKeyManager, require_api_key
from ..services.user import UserService
from ..tasks.email import send_password_reset_email

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    user_service = UserService(db)

    # Check for existing user
    if await user_service.get_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await user_service.get_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    db_user = await user_service.create(user)
    return db_user

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with username/email and password"""
    user_service = UserService(db)
    user = await user_service.authenticate(credentials.username, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if MFA is required
    if user.mfa_enabled:
        # Return partial token requiring MFA verification
        temp_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "mfa_required": True},
            expires_delta=timedelta(minutes=5)
        )
        return Token(access_token=temp_token, refresh_token="", token_type="mfa_required")

    # Create full tokens
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/mfa/verify")
async def verify_mfa(token: str, mfa_code: str, db: AsyncSession = Depends(get_db)):
    """Verify MFA code and get full tokens"""
    # Verify temporary token
    payload = verify_token(token, "access")
    if not payload.get("mfa_required"):
        raise HTTPException(status_code=400, detail="Invalid token for MFA verification")

    user_id = payload.get("user_id")
    user_service = UserService(db)
    user = await user_service.get(user_id)

    if not user or not user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA not enabled")

    # Verify MFA code
    if not MFAHandler.verify_totp(user.mfa_secret, mfa_code):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    # Create full tokens
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Set up MFA for current user"""
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA already enabled")

    # Generate MFA secret
    secret = MFAHandler.generate_secret()

    # Generate QR code
    qr_code = MFAHandler.generate_qr_code(secret, current_user.email)

    # Store secret temporarily (would normally use cache/session)
    # For demo, we'll store it in user object (not recommended for production)
    current_user.mfa_secret = secret
    db.commit()

    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=MFAHandler.get_backup_codes()
    )

@router.post("/mfa/enable")
async def enable_mfa(mfa_code: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Enable MFA after setup"""
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA not set up")

    if not MFAHandler.verify_totp(current_user.mfa_secret, mfa_code):
        raise HTTPException(status_code=400, detail="Invalid MFA code")

    current_user.mfa_enabled = True
    db.commit()

    return {"message": "MFA enabled successfully"}

@router.post("/password-reset/request")
async def request_password_reset(email: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Request password reset"""
    user_service = UserService(db)
    user = await user_service.get_by_email(email)

    if user:
        # Generate reset token
        reset_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )

        # Send reset email
        background_tasks.add_task(
            send_password_reset_email,
            user.email,
            reset_token
        )

    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create API key for current user"""
    key_manager = APIKeyManager()

    # Generate key
    api_key = key_manager.generate_api_key()
    key_hash = key_manager.hash_api_key(api_key)

    # Store in database
    db_api_key = APIKey(
        user_id=current_user.id,
        name=key_data.name,
        key_hash=key_hash,
        scopes=",".join(key_data.scopes) if key_data.scopes else None,
        expires_at=key_data.expires_at
    )

    db.add(db_api_key)
    await db.commit()
    await db.refresh(db_api_key)

    return APIKeyResponse(
        id=db_api_key.id,
        name=db_api_key.name,
        key=api_key,  # Only shown once
        scopes=key_data.scopes or [],
        expires_at=key_data.expires_at,
        created_at=db_api_key.created_at
    )
```

#### Step 9: OAuth2 Endpoints

**app/api/oauth.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..oauth.google import google_oauth
from ..oauth.github import github_oauth
from ..models.user import User, OAuthAccount
from ..auth.jwt import create_access_token, create_refresh_token
from ..schemas.auth import Token

router = APIRouter(prefix="/oauth")

@router.get("/google/login")
async def google_login():
    """Initiate Google OAuth2 login"""
    auth_url, state = await google_oauth.get_authorization_url()
    return {"authorization_url": auth_url, "state": state}

@router.get("/google/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth2 callback"""
    # Exchange code for token
    token = await google_oauth.get_access_token(code)

    # Get user info
    user_info = await google_oauth.get_user_info(token)

    # Find or create user
    user = await get_or_create_oauth_user(db, user_info, "google")

    # Create JWT tokens
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.get("/github/login")
async def github_login():
    """Initiate GitHub OAuth2 login"""
    auth_url, state = await github_oauth.get_authorization_url()
    return {"authorization_url": auth_url, "state": state}

@router.get("/github/callback")
async def github_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Handle GitHub OAuth2 callback"""
    # Exchange code for token
    token = await github_oauth.get_access_token(code)

    # Get user info
    user_info = await github_oauth.get_user_info(token)

    # Find or create user
    user = await get_or_create_oauth_user(db, user_info, "github")

    # Create JWT tokens
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)

async def get_or_create_oauth_user(db: AsyncSession, user_info: dict, provider: str) -> User:
    """Find or create user from OAuth data"""
    provider_user_id = str(user_info["id"])

    # Check if OAuth account exists
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id
        )
    )
    oauth_account = result.scalars().first()

    if oauth_account:
        # User exists, return it
        result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        return result.scalars().first()

    # Check if user with same email exists
    email = user_info.get("email")
    if email:
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalars().first()

        if existing_user:
            # Link OAuth account to existing user
            oauth_account = OAuthAccount(
                user_id=existing_user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                provider_data=str(user_info)
            )
            db.add(oauth_account)
            await db.commit()
            return existing_user

    # Create new user
    username = generate_unique_username(db, user_info.get("login") or user_info.get("email"))
    full_name = user_info.get("name")

    user = User(
        email=email,
        username=username,
        full_name=full_name,
        email_verified=True  # OAuth emails are pre-verified
    )

    db.add(user)
    await db.flush()  # Get user ID

    # Create OAuth account
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_data=str(user_info)
    )
    db.add(oauth_account)

    await db.commit()
    await db.refresh(user)

    return user

async def generate_unique_username(db: AsyncSession, base_username: str) -> str:
    """Generate unique username"""
    username = base_username.replace("@", "").replace(".", "_")[:50]

    # Check if username exists
    result = await db.execute(select(User).where(User.username == username))
    if not result.scalars().first():
        return username

    # Add number suffix
    counter = 1
    while True:
        candidate = f"{username}_{counter}"
        result = await db.execute(select(User).where(User.username == candidate))
        if not result.scalars().first():
            return candidate
        counter += 1
```

## Running the System

```bash
# Set up environment variables
export SECRET_KEY="your-super-secret-key"
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"

# Create database tables
python -c "from app.database import create_tables; create_tables()"

# Start Redis
redis-server

# Start the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Testing Authentication

### JWT Authentication
```bash
# Register user
curl -X POST "http://localhost:8000/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "SecurePass123!",
       "full_name": "Test User"
     }'

# Login
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "password": "SecurePass123!"
     }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
```

### OAuth2 Flow
```bash
# Get Google auth URL
curl "http://localhost:8000/api/auth/oauth/google/login"

# After authorization, handle callback
curl "http://localhost:8000/api/auth/oauth/google/callback?code=YOUR_CODE&state=YOUR_STATE"
```

### API Key Authentication
```bash
# Create API key
API_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/api-keys" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "My API Key", "scopes": ["read", "write"]}')

API_KEY=$(echo $API_RESPONSE | jq -r '.key')

# Use API key
curl -H "X-API-Key: $API_KEY" \
     "http://localhost:8000/api/protected-endpoint"
```

## Challenge Exercises

### Challenge 1: Social Login Integration
1. Complete OAuth2 implementation for Google and GitHub
2. Add support for additional providers (Facebook, Twitter)
3. Implement OAuth account linking/unlinking
4. Add social profile data synchronization

### Challenge 2: Advanced MFA
1. Implement backup codes for MFA
2. Add SMS-based MFA as alternative
3. Implement MFA recovery flow
4. Add MFA enforcement policies

### Challenge 3: Enterprise SSO
1. Implement SAML authentication
2. Add LDAP integration
3. Create role mapping from external systems
4. Implement user provisioning

## Verification Checklist

### Authentication Methods
- [ ] JWT token authentication working
- [ ] OAuth2 social login implemented
- [ ] API key authentication functional
- [ ] MFA setup and verification working

### Authorization
- [ ] Role-based access control implemented
- [ ] Permission checking working
- [ ] API key scopes enforced
- [ ] Admin functions protected

### Security Features
- [ ] Password hashing and verification
- [ ] Token refresh and blacklisting
- [ ] Rate limiting implemented
- [ ] Input validation comprehensive

### Testing & Documentation
- [ ] Authentication endpoints tested
- [ ] OAuth2 flows working
- [ ] API documentation complete
- [ ] Security best practices followed

## Troubleshooting

### OAuth2 Issues
**Invalid client error:**
- Check client ID and secret configuration
- Verify redirect URIs match OAuth app settings
- Ensure HTTPS for production

**State parameter mismatch:**
- Implement proper state parameter handling
- Store state in session/cache for verification
- Use cryptographically secure random state

**Token exchange failures:**
- Check token endpoint URLs
- Verify grant type and parameters
- Handle token refresh properly

### MFA Issues
**TOTP verification fails:**
- Check server time synchronization
- Verify secret key storage
- Test with multiple TOTP apps

**QR code generation fails:**
- Install required image libraries
- Check base64 encoding
- Verify QR code content

### API Key Issues
**Key verification slow:**
- Implement proper indexing on key_hash
- Use caching for frequently used keys
- Consider key format optimization

**Scope checking fails:**
- Verify scope format (comma-separated)
- Check scope validation logic
- Test with different scope combinations

## Best Practices Summary

### Authentication Security
- Use HTTPS for all authentication endpoints
- Implement proper password policies
- Enable MFA for sensitive accounts
- Use secure random generators for tokens

### OAuth2 Security
- Validate state parameters
- Use PKCE for public clients
- Store tokens securely
- Implement proper token refresh

### API Key Security
- Hash keys before storage
- Implement key rotation
- Use appropriate key lengths
- Monitor key usage patterns

### Session Management
- Implement secure session storage
- Use HttpOnly and Secure cookies
- Implement session timeout
- Monitor for suspicious activity

## Next Steps
Congratulations! You have implemented a comprehensive authentication system. The system now supports:

- JWT-based authentication
- OAuth2 social login
- Multi-factor authentication
- API key authentication
- Role-based access control
- Advanced security features

This provides a solid foundation for production applications with enterprise-grade security requirements.

## Additional Resources
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/rfc8725)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [MFA Implementation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [API Key Best Practices](https://cloud.google.com/endpoints/docs/openapi/when-why-api-key)

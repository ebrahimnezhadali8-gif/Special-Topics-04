# Workshop 03: Complete Async API

## Overview
This workshop builds a complete asynchronous FastAPI application that integrates all advanced concepts: async database operations, JWT authentication, background tasks, and comprehensive API design. You'll create a full-featured blog platform with user management, posts, comments, and background processing.

## Prerequisites
- Completed all previous tutorials and workshops
- Understanding of async programming, databases, and authentication
- Python environment with required dependencies

## Learning Objectives
By the end of this workshop, you will be able to:
- Build a complete async web application with FastAPI
- Integrate async database operations with SQLAlchemy
- Implement comprehensive authentication and authorization
- Use background tasks for email and data processing
- Create a scalable, production-ready API architecture

## Workshop Structure

### Part 1: Project Architecture

#### Step 1: Complete Project Setup

```bash
mkdir async-blog-api
cd async-blog-api
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

uv add fastapi uvicorn sqlalchemy[asyncio] asyncpg aiosqlite python-jose[cryptography] passlib[bcrypt] python-multipart redis aiofiles celery alembic pytest pytest-asyncio httpx

# Create comprehensive project structure
mkdir -p app/{api,core,db,models,schemas,services,tasks,utils}
mkdir -p app/api/{v1,dependencies}
mkdir -p tests/{unit,integration}

# Create all necessary files
touch app/__init__.py app/main.py app/config.py
touch app/core/{__init__.py,auth.py,security.py,events.py}
touch app/db/{__init__.py,session.py}
touch app/models/{__init__.py,user.py,post.py,comment.py}
touch app/schemas/{__init__.py,user.py,post.py,comment.py,task.py}
touch app/services/{__init__.py,user.py,post.py,email.py}
touch app/tasks/{__init__.py,email.py,cleanup.py}
touch app/utils/{__init__.py,validators.py,pagination.py}
touch app/api/__init__.py app/api/v1/__init__.py
touch app/api/v1/{auth.py,users.py,posts.py,comments.py,admin.py}
touch app/api/dependencies/{__init__.py,auth.py,database.py}
```

#### Step 2: Configuration

**app/config.py:**
```python
from pydantic import BaseSettings
import os
from typing import List

class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Server
    SERVER_NAME: str = os.getenv("SERVER_NAME", "Blog API")
    SERVER_HOST: str = os.getenv("SERVER_HOST", "http://localhost")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/blog")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_USER: str = os.getenv("SMTP_USER")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@example.com")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Blog API")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
    ]

    # Security
    MIN_PASSWORD_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### Part 2: Core Components

#### Step 3: Database Session

**app/db/session.py:**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

#### Step 4: Authentication Core

**app/core/auth.py:**
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app import models

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access"):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid {token_type} token"
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await db.execute(
        select(models.User).where(models.User.email == email)
    )
    user = user.scalars().first()

    if not user:
        return False
    if not pwd_context.verify(password, user.hashed_password):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = verify_token(token)
    user_id: int = payload.get("user_id")

    user = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = user.scalars().first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    return current_user

async def get_current_superuser(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
```

#### Step 5: Security Utilities

**app/core/security.py:**
```python
import secrets
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        return False
    if not any(char.isupper() for char in password):
        return False
    if not any(char.islower() for char in password):
        return False
    if not any(char.isdigit() for char in password):
        return False
    return True
```

### Part 3: Database Models

#### Step 6: User Model

**app/models/user.py:**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
```

#### Step 7: Post Model

**app/models/post.py:**
```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    excerpt = Column(String(300))
    featured_image = Column(String(500))
    published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("PostTag", back_populates="post", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    color = Column(String(7), default="#6b7280")

class PostTag(Base):
    __tablename__ = "post_tags"

    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

    post = relationship("Post", back_populates="tags")
    tag = relationship("Tag", back_populates="posts")
```

#### Step 8: Comment Model

**app/models/comment.py:**
```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"))  # For nested comments
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    replies = relationship("Comment", backref=backref('parent', remote_side=[id]), cascade="all, delete-orphan")
```

### Part 4: Schemas and Services

#### Step 9: Pydantic Schemas

**app/schemas/user.py:**
```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @validator('password')
    def validate_password(cls, v):
        from app.core.security import validate_password_strength
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters and contain uppercase, "
                "lowercase, and numeric characters"
            )
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
```

#### Step 10: Service Layer

**app/services/user.py:**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List
from app import models
from app.schemas.user import UserCreate, UserUpdate, UserInDB
from app.core.security import generate_password_hash

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int) -> Optional[models.User]:
        result = await self.db.execute(
            select(models.User).where(models.User.id == user_id)
        )
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[models.User]:
        result = await self.db.execute(
            select(models.User).where(models.User.email == email)
        )
        return result.scalars().first()

    async def get_by_username(self, username: str) -> Optional[models.User]:
        result = await self.db.execute(
            select(models.User).where(models.User.username == username)
        )
        return result.scalars().first()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[models.User]:
        result = await self.db.execute(
            select(models.User).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(self, user: UserCreate) -> models.User:
        hashed_password = generate_password_hash(user.password)
        db_user = models.User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_password,
            full_name=user.full_name,
            bio=user.bio
        )
        self.db.add(db_user)
        await self.db.commit()
        await self.db.refresh(db_user)
        return db_user

    async def update(self, user_id: int, user_update: UserUpdate) -> Optional[models.User]:
        update_data = user_update.dict(exclude_unset=True)
        if not update_data:
            return await self.get(user_id)

        stmt = (
            update(models.User)
            .where(models.User.id == user_id)
            .values(**update_data)
            .returning(models.User)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        updated_user = result.scalars().first()
        if updated_user:
            await self.db.refresh(updated_user)
        return updated_user

    async def delete(self, user_id: int) -> bool:
        user = await self.get(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True

    async def authenticate(self, email: str, password: str) -> Optional[models.User]:
        from app.core.security import verify_password

        user = await self.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user
```

### Part 5: API Endpoints

#### Step 11: Authentication API

**app/api/v1/auth.py:**
```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.core.auth import (
    authenticate_user, create_access_token, create_refresh_token,
    get_current_active_user, verify_token
)
from app.db.session import get_db
from app.services.user import UserService
from app.tasks.email import send_welcome_email

router = APIRouter()

@router.post("/register", response_model=schemas.User)
async def register(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    user_service = UserService(db)

    # Check if user already exists
    existing_user = await user_service.get_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    existing_user = await user_service.get_by_username(user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create user
    db_user = await user_service.create(user)

    # Send welcome email in background
    background_tasks.add_task(
        send_welcome_email,
        db_user.email,
        db_user.full_name or db_user.username
    )

    return db_user

@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token"""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return schemas.Token(
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    try:
        payload = verify_token(refresh_token, "refresh")
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        # Verify user still exists
        user_service = UserService(db)
        user = await user_service.get(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        # Create new tokens
        access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
        new_refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

        return schemas.Token(
            access_token=access_token,
            refresh_token=new_refresh_token
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/logout")
async def logout(current_user = Depends(get_current_active_user)):
    """Logout (client should discard tokens)"""
    # In a real implementation, you might want to blacklist tokens
    return {"message": "Successfully logged out"}
```

#### Step 12: Users API

**app/api/v1/users.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app import schemas
from app.db.session import get_db
from app.services.user import UserService
from app.core.auth import get_current_active_user, get_current_superuser

router = APIRouter()

@router.get("/me", response_model=schemas.User)
async def read_users_me(current_user = Depends(get_current_active_user)):
    """Get current user"""
    return current_user

@router.put("/me", response_model=schemas.User)
async def update_user_me(
    user_update: schemas.UserUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user"""
    user_service = UserService(db)
    updated_user = await user_service.update(current_user.id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.get("/", response_model=List[schemas.User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    user_service = UserService(db)
    users = await user_service.get_multi(skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.User)
async def read_user(
    user_id: int,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID"""
    # Allow users to view their own profile or admins to view any profile
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    user_service = UserService(db)
    user = await user_service.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Part 6: Application Setup

#### Step 13: Main Application

**app/main.py:**
```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.api.v1.api import api_router
from app.core.events import create_start_app_handler, create_stop_app_handler

def get_application() -> FastAPI:
    application = FastAPI(
        title=settings.SERVER_NAME,
        description="A complete async blog API with authentication and background tasks",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # Set up rate limiting
    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    application.add_middleware(SlowAPIMiddleware)

    # CORS
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Trusted hosts
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0"]
    )

    # Include API router
    application.include_router(api_router, prefix=settings.API_V1_STR)

    # Health check
    @application.get("/health")
    async def health_check():
        return {"status": "healthy"}

    return application

app = get_application()

# Event handlers
@app.on_event("startup")
async def startup_event():
    await create_start_app_handler(app)

@app.on_event("shutdown")
async def shutdown_event():
    await create_stop_app_handler(app)
```

#### Step 14: API Router

**app/api/v1/api.py:**
```python
from fastapi import APIRouter
from app.api.v1 import auth, users, posts, comments, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
# Add other routers as you implement them
```

## Running the Application

```bash
# Create database tables
python -c "from app.db.session import engine; import asyncio; from app.models import user; asyncio.run(engine.run_sync(user.Base.metadata.create_all))"

# Start Redis
redis-server

# Start Celery worker (if using background tasks)
celery -A app.core.celery_app worker --loglevel=info

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
pytest tests/ -v --cov=app --cov-report=html
```

## Testing the API

### Register a User
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "username": "testuser",
       "password": "SecurePass123!",
       "full_name": "Test User",
       "bio": "A test user for the API"
     }'
```

### Login
```bash
# Get tokens
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
     -d "username=testuser&password=SecurePass123!")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "Access Token: $ACCESS_TOKEN"
```

### Access Protected Endpoints
```bash
# Get current user
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "http://localhost:8000/api/v1/users/me"

# Update user profile
curl -X PUT -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"full_name": "Updated Test User"}' \
     "http://localhost:8000/api/v1/users/me"
```

## Challenge Exercises

### Challenge 1: Add Posts and Comments
1. Implement complete CRUD for posts
2. Add comment system with nested replies
3. Implement post search and filtering
4. Add post publishing workflow

### Challenge 2: Add File Uploads
1. Implement image upload for posts
2. Add file processing background tasks
3. Create image optimization pipeline
4. Add CDN integration

### Challenge 3: Add Real-time Features
1. Implement WebSocket connections
2. Add real-time notifications
3. Create live comment updates
4. Add typing indicators

## Verification Checklist

### Core Functionality
- [ ] Async database operations working
- [ ] JWT authentication implemented
- [ ] User registration and login functional
- [ ] Protected endpoints secured
- [ ] Background tasks operational

### API Features
- [ ] Complete user management API
- [ ] Proper error handling and validation
- [ ] Rate limiting implemented
- [ ] CORS configured correctly
- [ ] Security headers added

### Advanced Features
- [ ] Async database queries optimized
- [ ] Background tasks for email and processing
- [ ] Comprehensive logging and monitoring
- [ ] Proper error handling throughout

### Testing & Documentation
- [ ] Comprehensive test suite
- [ ] API documentation complete
- [ ] Interactive docs accessible
- [ ] Performance tested and optimized

## Troubleshooting

### Common Issues

**Database connection errors:**
- Check DATABASE_URL configuration
- Ensure database server is running
- Verify async driver installation

**Authentication failures:**
- Check SECRET_KEY configuration
- Verify JWT token format
- Check token expiration times

**Async operation errors:**
- Ensure all database operations use async/await
- Check for blocking operations in async functions
- Verify async driver compatibility

**Background task failures:**
- Check Redis connection
- Verify Celery worker is running
- Check task serialization

## Performance Optimization

### Database Optimization
- Use proper indexing on frequently queried columns
- Implement connection pooling
- Use selectinload for relationships
- Cache frequently accessed data

### API Optimization
- Implement response caching
- Use pagination for large datasets
- Optimize JSON serialization
- Implement rate limiting

### Monitoring
- Add request logging
- Implement health checks
- Monitor database connection pools
- Track API performance metrics

## Next Steps
- [Advanced Security Tutorial](../tutorials/05-advanced-security.md)
- [Workshop: Advanced Auth](../workshops/workshop-04-advanced-auth.md)

## Additional Resources
- [FastAPI Advanced User Guide](https://fastapi.tiangolo.com/tutorial/)
- [SQLAlchemy Async Best Practices](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [API Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/)

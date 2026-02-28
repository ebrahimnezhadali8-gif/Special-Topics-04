# Advanced FastAPI Setup Guide

## Overview
This guide covers advanced FastAPI development environment setup including async databases, authentication, testing frameworks, and deployment tools.

## Prerequisites
- Basic FastAPI knowledge (Subject 05)
- Python 3.8+ with virtual environment
- Basic database concepts
- Understanding of async/await

---

## Enhanced Dependencies Installation

### Core Dependencies
```bash
uv add fastapi uvicorn[standard] pydantic[email] sqlalchemy asyncpg aiosqlite
```

### Authentication & Security
```bash
uv add python-jose[cryptography] passlib[bcrypt] python-multipart
```

### Advanced Features
```bash
uv add redis aiofiles celery
```

### Testing & Development
```bash
uv add pytest pytest-asyncio pytest-cov httpx coverage
```

### Documentation & Monitoring
```bash
uv add mkdocs mkdocs-material uvicorn[standard]
```

---

## Project Structure for Advanced Features

```
advanced-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py          # Environment configuration
│   ├── database.py        # Database setup
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── auth.py            # Authentication logic
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   ├── items.py
│   │   └── admin.py
│   ├── dependencies.py    # Dependencies
│   ├── utils/             # Utility functions
│   └── services/          # Business logic
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_users.py
│   └── test_items.py
├── alembic/               # Database migrations
├── scripts/               # Utility scripts
├── docs/                  # Documentation
├── docker/                # Docker files
├── .env                   # Environment variables
├── requirements.txt
├── pytest.ini
└── mypy.ini              # Type checking
```

---

## Database Setup

### SQLAlchemy Async Configuration
```python
# database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_="AsyncSession", expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Alembic Setup
```bash
# Install alembic
uv add alembic

# Initialize alembic
alembic init alembic

# Configure alembic.ini
# Set sqlalchemy.url and script_location

# Create first migration
alembic revision --autogenerate -m "Initial migration"

# Run migration
alembic upgrade head
```

---

## Authentication Setup

### JWT Configuration
```python
# auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

---

## Testing Framework Setup

### pytest Configuration
```ini
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --strict-markers --cov=app --cov-report=html
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
```

### Test Database
```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

@pytest.fixture
async def db_session():
    # Create test database
    engine = create_async_engine("sqlite+aiosqlite:///./test.db")
    async_session = sessionmaker(engine, class_="AsyncSession")

    # Create tables
    async with engine.begin() as conn:
        # Create tables here

    yield async_session

    # Cleanup
    async with engine.begin() as conn:
        # Drop tables here
```

---

## Advanced FastAPI Application

### Main Application Setup
```python
# main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.routes import users, items, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Advanced FastAPI Application"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(users.router, prefix="/api/v1")
app.include_router(items.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1/admin")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Environment Configuration

### Settings Management
```python
# config.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Advanced FastAPI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    DATABASE_URL: str

    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### Environment File
```bash
# .env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
PROJECT_NAME="My Advanced API"
VERSION=1.0.0
```

---

## Docker Setup for Development

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db/dbname
    depends_on:
      - db
    volumes:
      - .:/app

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dbname
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Type Checking Setup

### mypy Configuration
```ini
# mypy.ini
[mypy]
python_version = 3.8
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_incomplete_defs = True
check_untyped_defs = True
disallow_untyped_decorators = True
no_implicit_optional = True
warn_redundant_casts = True
warn_unused_ignores = True
warn_no_return = True
warn_unreachable = True
strict_equality = True

[[tool.mypy.overrides]]
module = "tests.*"
ignore_errors = True
```

---

## Performance & Monitoring

### Redis Setup (Optional)
```bash
uv add redis

# Usage in FastAPI
from redis.asyncio import Redis

redis = Redis.from_url("redis://localhost:6379")

@app.on_event("startup")
async def startup_event():
    await redis.ping()

@app.on_event("shutdown")
async def shutdown_event():
    await redis.close()
```

---

## Running the Application

### Development Mode
```bash
# With hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# With workers
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

### Production Mode
```bash
# Using docker-compose
docker-compose up -d

# Direct uvicorn with production settings
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Testing Commands

### Run All Tests
```bash
# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test categories
pytest -m unit
pytest -m integration

# Run with different verbosity
pytest -v
pytest -s  # Show print statements
```

### Type Checking
```bash
# Run mypy
mypy app/

# Run with detailed output
mypy app/ --show-error-codes
```

---

## Next Steps

1. [Learn async operations](../tutorials/01-async-operations.md)
2. [Implement authentication](../workshops/workshop-01-jwt-auth.md)
3. [Set up database models](../tutorials/02-database-models.md)
4. [Create background tasks](../workshops/workshop-02-background-tasks.md)

---

## Resources

- [FastAPI Advanced Documentation](https://fastapi.tiangolo.com/tutorial/)
- [SQLAlchemy Async Documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [JWT Authentication Guide](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Testing FastAPI](https://fastapi.tiangolo.com/tutorial/testing/)

# Workshop 01: JWT Authentication Implementation

## Overview
This workshop implements a complete JWT-based authentication system for FastAPI. You'll build user registration, login, token refresh, and protected endpoints with proper security measures.

## Prerequisites
- Completed [JWT Authentication Tutorial](../tutorials/03-jwt-authentication.md)
- Basic understanding of FastAPI and Pydantic
- Python virtual environment with required packages

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement user registration and login with JWT tokens
- Create protected endpoints with authentication
- Handle token refresh and validation
- Implement proper password hashing and security
- Test authentication endpoints comprehensively

## Workshop Setup

### Step 1: Project Structure

```bash
mkdir jwt-auth-workshop
cd jwt-auth-workshop
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

uv add fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart pydantic[email] sqlalchemy

mkdir -p app/{auth,models,schemas,routes,tests}
touch app/__init__.py app/main.py app/database.py app/config.py
touch app/auth/__init__.py app/auth/jwt.py app/auth/password.py app/auth/dependencies.py
touch app/models/__init__.py app/models/user.py
touch app/schemas/__init__.py app/schemas/user.py app/schemas/token.py
touch app/routes/__init__.py app/routes/auth.py app/routes/users.py
mkdir tests && touch tests/__init__.py tests/test_auth.py tests/conftest.py
```

### Step 2: Configuration

**app/config.py:**
```python
from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./auth.db")

    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Security
    bcrypt_rounds: int = 12

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### Step 3: Database Setup

**app/database.py:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # Only for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
```

### Step 4: Password Security

**app/auth/password.py:**
```python
from passlib.context import CryptContext
from ..config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False
    if not any(char.isupper() for char in password):
        return False
    if not any(char.islower() for char in password):
        return False
    if not any(char.isdigit() for char in password):
        return False
    if not any(char in "!@#$%^&*(),.?\":{}|<>" for char in password):
        return False
    return True
```

### Step 5: JWT Token Management

**app/auth/jwt.py:**
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
from ..config import settings

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

        # Check token type
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid {token_type} token"
            )

        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_token_payload(token: str) -> dict:
    """Get payload from token without verification (for debugging)"""
    try:
        return jwt.get_unverified_claims(token)
    except:
        return {}
```

### Step 6: Authentication Dependencies

**app/auth/dependencies.py:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.user import User
from .jwt import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    payload = verify_token(token, "access")
    user_id: int = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (alias for get_current_user)"""
    return current_user

def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
```

### Step 7: User Model

**app/models/user.py:**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### Step 8: Pydantic Schemas

**app/schemas/user.py:**
```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @validator('password')
    def validate_password(cls, v):
        from ..auth.password import validate_password_strength
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters and contain uppercase, "
                "lowercase, digit, and special character"
            )
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UserInDB(User):
    hashed_password: str
```

**app/schemas/token.py:**
```python
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str
```

### Step 9: Authentication Routes

**app/routes/auth.py:**
```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, User
from ..schemas.token import Token, RefreshTokenRequest
from ..auth.password import get_password_hash, verify_password
from ..auth.jwt import create_access_token, create_refresh_token, verify_token

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access/refresh tokens"""
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Create tokens
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    try:
        payload = verify_token(request.refresh_token, "refresh")
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")

        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Verify user still exists and is active
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        # Create new tokens
        access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
        new_refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
```

### Step 10: Protected User Routes

**app/routes/users.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, User
from ..auth.dependencies import get_current_active_user, get_current_superuser

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.put("/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
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
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create new user (admin only)"""
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    from ..auth.password import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
```

### Step 11: Main Application

**app/main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_tables
from .routes.auth import router as auth_router
from .routes.users import router as users_router

# Create database tables
create_tables()

app = FastAPI(
    title="JWT Authentication API",
    description="A secure API with JWT authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-api"}
```

### Step 12: Comprehensive Testing

**tests/conftest.py:**
```python
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test_auth.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client():
    return TestClient(app)

@pytest.fixture(scope="function")
def test_user(test_db):
    """Create a test user"""
    from app.models.user import User
    from app.auth.password import get_password_hash

    db = TestSessionLocal()
    hashed_password = get_password_hash("TestPass123!")
    test_user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=hashed_password,
        full_name="Test User"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    db.close()
    return test_user

@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "TestPass123!"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

**tests/test_auth.py:**
```python
import pytest
from jose import jwt

def test_register_user_success(client, test_db):
    """Test successful user registration"""
    user_data = {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "SecurePass123!",
        "full_name": "New User"
    }

    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert data["full_name"] == "New User"
    assert "id" in data

def test_register_duplicate_email(client, test_db):
    """Test registration with duplicate email"""
    user_data = {
        "email": "test@example.com",  # Already exists from test_user fixture
        "username": "differentuser",
        "password": "SecurePass123!",
        "full_name": "Different User"
    }

    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_register_weak_password(client, test_db):
    """Test registration with weak password"""
    user_data = {
        "email": "weakpass@example.com",
        "username": "weakuser",
        "password": "weak",  # Weak password
        "full_name": "Weak User"
    }

    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 422
    # Password validation should fail

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "TestPass123!"
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Verify token contains correct data
    from app.auth.jwt import verify_token
    payload = verify_token(data["access_token"])
    assert payload["sub"] == "testuser"
    assert payload["user_id"] == test_user.id

def test_login_wrong_password(client, test_user):
    """Test login with wrong password"""
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "wrongpassword"
    })

    assert response.status_code == 401
    assert "Incorrect username/email or password" in response.json()["detail"]

def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post("/auth/login", data={
        "username": "nonexistent",
        "password": "password123"
    })

    assert response.status_code == 401

def test_refresh_token_success(client, test_user):
    """Test refreshing access token"""
    # First login to get refresh token
    login_response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "TestPass123!"
    })
    refresh_token = login_response.json()["refresh_token"]

    # Use refresh token to get new tokens
    refresh_response = client.post("/auth/refresh", json={
        "refresh_token": refresh_token
    })

    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_refresh_token_invalid(client):
    """Test refresh with invalid token"""
    response = client.post("/auth/refresh", json={
        "refresh_token": "invalid_token"
    })

    assert response.status_code == 401
    assert "Invalid refresh token" in response.json()["detail"]

def test_protected_endpoint_without_auth(client):
    """Test accessing protected endpoint without authentication"""
    response = client.get("/users/me")
    assert response.status_code == 401

def test_protected_endpoint_with_auth(client, auth_headers):
    """Test accessing protected endpoint with authentication"""
    response = client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"

def test_update_user_profile(client, auth_headers):
    """Test updating user profile"""
    update_data = {
        "full_name": "Updated Test User"
    }

    response = client.put("/users/me", json=update_data, headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["full_name"] == "Updated Test User"
```

## Running the Application

```bash
# Create database tables
python -c "from app.database import create_tables; create_tables()"

# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

## Testing the API

### Register a User
```bash
curl -X POST "http://localhost:8000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "username": "testuser",
       "password": "SecurePass123!",
       "full_name": "Test User"
     }'
```

### Login
```bash
# Login and get tokens
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/auth/login" \
     -d "username=testuser&password=SecurePass123!")

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

echo "Access Token: $ACCESS_TOKEN"
```

### Access Protected Endpoints
```bash
# Get current user info
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "http://localhost:8000/users/me"

# Update user profile
curl -X PUT -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"full_name": "Updated Name"}' \
     "http://localhost:8000/users/me"
```

### Refresh Token
```bash
# Extract refresh token
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refresh_token')

# Refresh access token
curl -X POST "http://localhost:8000/auth/refresh" \
     -H "Content-Type: application/json" \
     -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"
```

## Challenge Exercises

### Challenge 1: Password Reset
1. Add password reset request endpoint
2. Implement email sending for reset links
3. Add password reset confirmation endpoint
4. Test the complete password reset flow

### Challenge 2: User Roles and Permissions
1. Add role-based permissions system
2. Create different user roles (admin, moderator, user)
3. Implement role-specific endpoints
4. Add permission checking middleware

### Challenge 3: Social Login
1. Implement OAuth2 with Google/GitHub
2. Create social login endpoints
3. Handle user creation from social profiles
4. Test social authentication flow

## Verification Checklist

### Authentication
- [ ] User registration with validation
- [ ] User login with JWT tokens
- [ ] Token refresh functionality
- [ ] Protected endpoints working
- [ ] Password hashing and verification

### Security
- [ ] Password strength requirements
- [ ] JWT token validation
- [ ] Protected routes requiring authentication
- [ ] Proper error handling without information leakage

### Testing
- [ ] Unit tests for auth functions
- [ ] Integration tests for endpoints
- [ ] Authentication flow testing
- [ ] Error scenario testing
- [ ] Test coverage > 80%

### API Documentation
- [ ] OpenAPI documentation accessible
- [ ] Authentication documented
- [ ] Request/response examples provided
- [ ] Error responses documented

## Troubleshooting

### Common Issues

**Token decode errors:**
- Check SECRET_KEY is set correctly
- Verify token format and expiration
- Ensure algorithm matches (HS256)

**Database connection issues:**
- Check DATABASE_URL format
- Ensure database is running
- Verify table creation

**CORS issues:**
- Check allowed origins configuration
- Verify request headers
- Test with different browsers

**Password validation failures:**
- Check password strength requirements
- Verify validation logic
- Test with different password formats

## Next Steps
- [Background Tasks Tutorial](../tutorials/02-background-tasks.md)
- [Workshop: Background Tasks](../workshops/workshop-02-background-tasks.md)

## Additional Resources
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/)
- [OAuth2 with FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Passlib Documentation](https://passlib.readthedocs.io/)

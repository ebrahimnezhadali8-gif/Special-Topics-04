# Subject 6: FastAPI Advanced (Async, Background Tasks, Authentication)

## Overview

This subject dives deep into FastAPI's advanced features, focusing on asynchronous operations, background task processing, and robust authentication systems. You'll learn to build high-performance, secure APIs that can handle concurrent requests and complex authentication workflows.

## Learning Objectives

By the end of this subject, you will be able to:

- **Implement Async Operations**: Use async/await for concurrent request handling
- **Manage Background Tasks**: Process long-running tasks without blocking responses
- **Build Authentication Systems**: Implement JWT-based authentication and authorization
- **Handle Security**: Apply security best practices and protect API endpoints
- **Optimize Performance**: Use async database operations and connection pooling
- **Create Secure APIs**: Implement proper authentication flows and user management

## Prerequisites

- Completion of Subject 5 (FastAPI Fundamentals)
- Understanding of asynchronous programming concepts
- Basic knowledge of authentication and security principles
- Experience with REST API design

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[Async Operations](tutorials/01-async-operations.md)**
   - Understanding async/await in Python
   - FastAPI's async capabilities
   - Concurrent request handling
   - Performance benefits of async

2. **[Background Tasks](tutorials/02-background-tasks.md)**
   - What are background tasks?
   - Implementing task queues
   - Error handling in background tasks
   - Task monitoring and management

3. **[JWT Authentication](tutorials/03-jwt-authentication.md)**
   - JSON Web Tokens (JWT) fundamentals
   - Token generation and validation
   - Authentication middleware
   - User session management

4. **[Async Database Operations](tutorials/04-async-database.md)**
   - Async database drivers (asyncpg, databases)
   - Connection pooling strategies
   - Async ORM patterns (SQLAlchemy async)
   - Performance optimization

5. **[Advanced Security](tutorials/05-advanced-security.md)**
   - OAuth2 and OpenID Connect
   - API key authentication
   - Rate limiting and throttling
   - CORS and security headers

### 🛠️ Workshops (Hands-on Practice)

1. **[JWT Authentication](workshops/workshop-01-jwt-auth.md)**
   - Implementing user registration and login
   - JWT token generation and validation
   - Protected endpoints and middleware
   - Password hashing and security

2. **[Background Tasks](workshops/workshop-02-background-tasks.md)**
   - Email sending background tasks
   - File processing queues
   - Task status tracking
   - Error handling and retries

3. **[Async API](workshops/workshop-03-async-api.md)**
   - Converting sync endpoints to async
   - Async database operations
   - Concurrent API calls
   - Performance benchmarking

4. **[Advanced Authentication](workshops/workshop-04-advanced-auth.md)**
   - Role-based access control (RBAC)
   - Permission systems
   - User management APIs
   - Token refresh mechanisms

5. **[Advanced Security Implementation](workshops/workshop-05-advanced-security-implementation.md)**
   - API rate limiting
   - Security middleware
   - Audit logging
   - Production security practices

### 📝 Homework Assignments

The `homeworks/` directory contains:
- Authentication system implementation
- Background task processing challenges
- Async API optimization tasks

### 📋 Assessments

The `assessments/` directory contains:
- Security implementation quiz
- Performance optimization challenges
- Authentication flow assessments

## Key Advanced Concepts

### Async Operations

```python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.get("/async-endpoint")
async def async_endpoint():
    # Simulate async I/O operation
    await asyncio.sleep(1)
    return {"message": "Async operation completed"}

@app.get("/concurrent-requests")
async def concurrent_requests():
    # Make multiple concurrent API calls
    results = await asyncio.gather(
        fetch_data_from_api_1(),
        fetch_data_from_api_2(),
        fetch_data_from_api_3()
    )
    return {"results": results}
```

### Background Tasks

```python
from fastapi import BackgroundTasks, FastAPI

app = FastAPI()

def send_email_notification(email: str, message: str):
    # Simulate email sending
    print(f"Sending email to {email}: {message}")
    # In real app, use email service like SendGrid, Mailgun, etc.

@app.post("/send-notification")
async def send_notification(
    email: str,
    message: str,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(send_email_notification, email, message)
    return {"message": "Notification scheduled"}

# Background task with error handling
@app.post("/process-file")
async def process_file(
    file_id: str,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(
        process_file_background,
        file_id,
        retry_on_failure=True
    )
    return {"message": "File processing started"}
```

### JWT Authentication

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

# JWT Configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/login")
async def login(user_credentials: UserLogin):
    # Verify credentials
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/protected")
async def protected_route(current_user: str = Depends(verify_token)):
    return {"message": f"Hello {current_user}"}
```

### Async Database Operations

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from databases import Database

# SQLAlchemy Async
DATABASE_URL = "postgresql+asyncpg://user:password@localhost/db"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

@app.get("/users/")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

# Using databases library
database = Database(DATABASE_URL)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/items/")
async def get_items():
    query = "SELECT * FROM items"
    results = await database.fetch_all(query=query)
    return results
```

## Security Best Practices

### Password Security
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
```

### Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/limited-endpoint")
@limiter.limit("5/minute")
async def limited_endpoint():
    return {"message": "This endpoint is rate limited"}
```

### CORS Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Resources & References

### 📖 Official Documentation
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/) - Authentication guide
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) - Task processing
- [Jose JWT Library](https://python-jose.readthedocs.io/) - JWT implementation

### 🛠️ Tools & Libraries
- [Python-Jose](https://github.com/mpdavis/python-jose) - JWT encoding/decoding
- [Passlib](https://passlib.readthedocs.io/) - Password hashing
- [SlowAPI](https://github.com/laurentS/slowapi) - Rate limiting
- [AsyncPG](https://magicstack.github.io/asyncpg/) - Async PostgreSQL driver

### 📚 Additional Learning
- [FastAPI Advanced User Guide](https://fastapi.tiangolo.com/advanced/) - Advanced features
- [JWT.io](https://jwt.io/) - JWT debugger and information
- [OAuth 2.0](https://oauth.net/2/) - Authentication standards

## Getting Started

1. **Review Prerequisites** from Subject 5 (FastAPI Fundamentals)
2. **Set up Environment** following the installation guides in `installation/`
3. **Complete Workshop 1** to implement basic JWT authentication
4. **Work through Tutorials** to understand advanced concepts
5. **Practice with Workshops** to build complete secure APIs
6. **Complete Homework** assignments for comprehensive practice

## Common Advanced Patterns

### Token Refresh
```python
@app.post("/refresh-token")
async def refresh_token(
    refresh_token: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    # Verify refresh token and issue new access token
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Generate new access token
        access_token = create_access_token(data={"sub": username})
        return {"access_token": access_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

### Role-Based Access Control
```python
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

def require_role(required_role: UserRole):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Requires {required_role} role"
            )
        return current_user
    return role_checker

@app.get("/admin-only")
async def admin_endpoint(user: dict = Depends(require_role(UserRole.ADMIN))):
    return {"message": "Admin access granted"}
```

### WebSocket with Authentication
```python
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        # Verify token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")

        await websocket.accept()
        await websocket.send_text(f"Hello {username}")

        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except JWTError:
        await websocket.close(code=1008)  # Policy violation
    except WebSocketDisconnect:
        pass
```

## Performance Optimization

### Connection Pooling
```python
# AsyncPG connection pool
import asyncpg

pool = None

async def create_pool():
    global pool
    pool = await asyncpg.create_pool(
        user='user',
        password='password',
        database='database',
        host='localhost',
        min_size=5,
        max_size=20
    )

async def get_pool():
    return pool
```

### Caching
```python
from fastapi import Request, Response
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_data(key: str):
    # Expensive operation
    return compute_expensive_data(key)

@app.get("/cached-data/{key}")
async def get_data(key: str, response: Response):
    data = get_cached_data(key)
    response.headers["Cache-Control"] = "max-age=300"
    return data
```

## Assessment Criteria

- **Async Implementation**: Proper use of async/await patterns
- **Authentication Security**: Secure JWT implementation and validation
- **Background Tasks**: Proper task queuing and error handling
- **Performance**: Efficient async database operations
- **Security**: Implementation of security best practices
- **Code Quality**: Clean, maintainable, and well-tested code

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 7**: gRPC and protocol buffers for high-performance APIs
- **Subject 8**: Web crawling with Crawlee
- Building production-ready, secure APIs

---

*Advanced FastAPI features enable building high-performance, secure, and scalable APIs. This subject provides the skills needed for production-grade API development.*

# Tutorial 01: Async Operations in FastAPI

## Overview
This tutorial covers asynchronous programming in FastAPI, including async/await syntax, concurrent operations, and performance optimization. You'll learn how to write efficient async endpoints and understand when to use async vs sync operations.

## Understanding Async Programming

### Why Async?

Traditional synchronous web applications handle one request at a time per thread. With async programming, a single thread can handle multiple concurrent requests by switching between tasks when waiting for I/O operations.

**Benefits:**
- **Higher concurrency**: Handle thousands of concurrent connections
- **Better resource utilization**: Fewer threads needed
- **Faster response times**: Non-blocking I/O operations
- **Scalability**: Better performance under load

### Async vs Sync Comparison

```python
# Synchronous (blocking)
@app.get("/sync")
def sync_endpoint():
    # This blocks the thread
    time.sleep(1)  # Simulates I/O operation
    return {"message": "Done after 1 second"}

# Asynchronous (non-blocking)
@app.get("/async")
async def async_endpoint():
    # This doesn't block the thread
    await asyncio.sleep(1)  # Simulates I/O operation
    return {"message": "Done after 1 second"}
```

## Basic Async Syntax

### Coroutines and Await

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

# Define an async function (coroutine)
async def simulate_io_operation(delay: float) -> str:
    """Simulate an I/O operation like database query or HTTP request"""
    await asyncio.sleep(delay)  # Non-blocking sleep
    return f"Completed after {delay} seconds"

@app.get("/async-example")
async def async_example():
    # Call async function
    result = await simulate_io_operation(1.0)
    return {"result": result}

@app.get("/sync-in-async")
async def sync_in_async():
    # Call sync function from async context (runs in thread pool)
    result = await asyncio.get_event_loop().run_in_executor(
        None,  # Use default thread pool
        sync_function_that_takes_time
    )
    return {"result": result}
```

### When to Use Async

**Use async for:**
- Database queries (with async drivers)
- HTTP requests to external APIs
- File I/O operations
- Network operations
- Long-running computations that can be parallelized

**Use sync for:**
- CPU-bound operations (use async with thread pools)
- Libraries without async support
- Simple operations that complete quickly

## Async Database Operations

### SQLAlchemy Async Setup

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os

# Async database URL
DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True
)

# Create async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Async CRUD Operations

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from . import models, schemas

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    return result.scalars().first()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.User).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user(db: AsyncSession, user_id: int, user_update: schemas.UserUpdate):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    db_user = result.scalars().first()

    if db_user:
        for field, value in user_update.dict(exclude_unset=True).items():
            setattr(db_user, field, value)
        await db.commit()
        await db.refresh(db_user)

    return db_user
```

### FastAPI Integration

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/users/{user_id}")
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/users/")
async def read_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    users = await get_users(db, skip=skip, limit=limit)
    return users

@router.post("/users/")
async def create_new_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    return await create_user(db, user)
```

## Concurrent Operations

### Running Multiple Async Tasks

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

async def fetch_user_data(user_id: int) -> dict:
    """Simulate fetching user data from database"""
    await asyncio.sleep(0.1)  # Simulate DB query
    return {"user_id": user_id, "name": f"User {user_id}"}

async def fetch_user_posts(user_id: int) -> list:
    """Simulate fetching user posts"""
    await asyncio.sleep(0.2)  # Simulate DB query
    return [{"post_id": i, "title": f"Post {i}"} for i in range(1, 4)]

@app.get("/user-profile/{user_id}")
async def get_user_profile(user_id: int):
    """Sequential execution (slower)"""
    user_data = await fetch_user_data(user_id)
    user_posts = await fetch_user_posts(user_id)

    return {
        "user": user_data,
        "posts": user_posts
    }

@app.get("/user-profile-concurrent/{user_id}")
async def get_user_profile_concurrent(user_id: int):
    """Concurrent execution (faster)"""
    # Run both operations concurrently
    user_data_task = fetch_user_data(user_id)
    user_posts_task = fetch_user_posts(user_id)

    user_data, user_posts = await asyncio.gather(
        user_data_task,
        user_posts_task
    )

    return {
        "user": user_data,
        "posts": user_posts
    }
```

### Async Context Managers

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    # Initialize connections, caches, etc.
    yield
    # Shutdown
    print("Shutting down...")
    # Close connections, cleanup, etc.

app = FastAPI(lifespan=lifespan)

# Or for older FastAPI versions
@app.on_event("startup")
async def startup_event():
    print("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    print("Application shutting down")
```

## HTTP Client Operations

### Async HTTP Requests

```python
import httpx
from fastapi import FastAPI

app = FastAPI()

# Global HTTP client
client = httpx.AsyncClient()

@app.on_event("startup")
async def startup_event():
    pass

@app.on_event("shutdown")
async def shutdown_event():
    await client.aclose()

async def fetch_external_data(url: str) -> dict:
    """Fetch data from external API"""
    response = await client.get(url)
    response.raise_for_status()
    return response.json()

@app.get("/external-data")
async def get_external_data():
    """Fetch data from multiple external APIs concurrently"""
    urls = [
        "https://jsonplaceholder.typicode.com/users/1",
        "https://jsonplaceholder.typicode.com/posts/1",
        "https://jsonplaceholder.typicode.com/albums/1"
    ]

    # Fetch all concurrently
    tasks = [fetch_external_data(url) for url in urls]
    results = await asyncio.gather(*tasks)

    return {
        "user": results[0],
        "post": results[1],
        "album": results[2]
    }
```

### Timeout and Error Handling

```python
from httpx import Timeout, HTTPStatusError, RequestError
import asyncio

async def fetch_with_timeout(url: str, timeout: float = 5.0) -> dict:
    """Fetch with timeout and error handling"""
    try:
        async with httpx.AsyncClient(timeout=Timeout(timeout)) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"External API error: {e.response.text}"
        )
    except RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"External service unavailable: {str(e)}"
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="External service timeout"
        )
```

## File Operations

### Async File I/O

```python
import aiofiles
from fastapi import UploadFile, File
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload file asynchronously"""
    file_path = UPLOAD_DIR / file.filename

    # Write file asynchronously
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    return {"filename": file.filename, "size": len(content)}

@app.get("/files/{filename}")
async def read_file(filename: str):
    """Read file asynchronously"""
    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    async with aiofiles.open(file_path, 'rb') as f:
        content = await f.read()

    return {"filename": filename, "content": content}
```

## Performance Optimization

### Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine

# Configure connection pool
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # Maximum number of connections
    max_overflow=20,       # Additional connections beyond pool_size
    pool_timeout=30,       # Timeout for getting connection from pool
    pool_recycle=1800,     # Recycle connections after 30 minutes
)
```

### Caching

```python
from redis.asyncio import Redis
import json

redis = Redis.from_url("redis://localhost:6379")

async def get_cached_data(key: str) -> dict:
    """Get data from cache"""
    data = await redis.get(key)
    return json.loads(data) if data else None

async def set_cached_data(key: str, data: dict, expire: int = 300):
    """Set data in cache"""
    await redis.setex(key, expire, json.dumps(data))

@app.get("/cached-data/{key}")
async def get_data_with_cache(key: str):
    # Try cache first
    cached_data = await get_cached_data(key)
    if cached_data:
        return {"data": cached_data, "source": "cache"}

    # Fetch from database
    data = await fetch_from_database(key)

    # Cache the result
    await set_cached_data(key, data)

    return {"data": data, "source": "database"}
```

### Limiting Concurrency

```python
from asyncio import Semaphore
from fastapi import Request

# Limit concurrent requests
semaphore = Semaphore(10)  # Max 10 concurrent requests

@app.middleware("http")
async def concurrency_limiter(request: Request, call_next):
    async with semaphore:
        response = await call_next(request)
        return response
```

## Testing Async Code

### Async Test Functions

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        user_data = {"username": "testuser", "email": "test@example.com"}
        response = await client.post("/users/", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "testuser"

@pytest.mark.asyncio
async def test_get_user(db_session: AsyncSession):
    # Create test user
    user = await create_test_user(db_session)

    # Test getting user
    retrieved = await get_user(db_session, user.id)
    assert retrieved.id == user.id
    assert retrieved.username == user.username
```

### Mocking Async Functions

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_external_api_call():
    # Mock the external API call
    with patch('your_module.fetch_external_data') as mock_fetch:
        mock_fetch.return_value = {"external": "data"}

        result = await your_function_that_calls_external_api()

        assert result["external"] == "data"
        mock_fetch.assert_called_once()
```

## Best Practices

### Async Function Guidelines

1. **Use async for I/O operations**: Database queries, HTTP requests, file operations
2. **Avoid mixing sync and async**: Don't call sync functions from async contexts without proper handling
3. **Use appropriate libraries**: Choose async-compatible libraries (httpx, aiofiles, async SQL drivers)
4. **Handle exceptions properly**: Async code can have different exception handling patterns
5. **Test async code**: Use pytest-asyncio for testing async functions

### Performance Considerations

- **Connection pooling**: Reuse database connections
- **Caching**: Cache frequently accessed data
- **Concurrency limits**: Prevent resource exhaustion
- **Monitoring**: Monitor async operations and performance
- **Timeouts**: Always set timeouts for async operations

## Common Pitfalls

### Blocking Operations in Async Code

```python
# Bad: Blocking operation in async function
@app.get("/bad")
async def bad_endpoint():
    time.sleep(1)  # This blocks the event loop!
    return {"message": "done"}

# Good: Use asyncio.sleep or run in thread pool
@app.get("/good")
async def good_endpoint():
    await asyncio.sleep(1)  # Non-blocking
    return {"message": "done"}

# Alternative: Run sync code in thread pool
@app.get("/sync-in-async")
async def sync_in_async_endpoint():
    result = await asyncio.get_event_loop().run_in_executor(
        None,
        blocking_function
    )
    return {"result": result}
```

### Async Context Managers

```python
# Proper async context manager usage
async def async_operation():
    async with aiofiles.open("file.txt", "r") as f:
        content = await f.read()
    return content

# Database session management
async def database_operation(db: AsyncSession):
    async with db.begin():
        # All operations in transaction
        result = await db.execute(select(models.User))
        return result.scalars().all()
```

## Hands-on Exercises

### Exercise 1: Async Database Operations
1. Set up async SQLAlchemy with PostgreSQL
2. Create async CRUD operations
3. Implement concurrent database queries
4. Test with async fixtures

### Exercise 2: Concurrent API Calls
1. Create endpoints that call multiple external APIs
2. Implement concurrent requests using asyncio.gather
3. Add error handling and timeouts
4. Compare performance with sequential calls

### Exercise 3: File Upload/Download
1. Implement async file upload with aiofiles
2. Create file processing background tasks
3. Add file validation and size limits
4. Test with large files and concurrent uploads

## Next Steps
- [Background Tasks Tutorial](../tutorials/02-background-tasks.md)
- [JWT Authentication Tutorial](../tutorials/03-jwt-authentication.md)
- [Workshop: JWT Auth](../workshops/workshop-01-jwt-auth.md)

## Additional Resources
- [AsyncIO Documentation](https://docs.python.org/3/library/asyncio.html)
- [FastAPI Async](https://fastapi.tiangolo.com/async/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [HTTPX Documentation](https://www.python-httpx.org/)

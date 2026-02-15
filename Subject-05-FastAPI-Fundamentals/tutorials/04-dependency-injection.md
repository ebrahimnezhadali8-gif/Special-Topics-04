# Tutorial 04: Dependency Injection

## Overview
This tutorial covers dependency injection (DI) in FastAPI, a powerful pattern for managing dependencies like database connections, authentication, caching, and business logic. You'll learn how to create reusable, testable, and maintainable code.

## What is Dependency Injection?

Dependency injection is a design pattern where dependencies are "injected" into a component rather than being created inside it. This promotes:

- **Testability**: Easy to mock dependencies in tests
- **Reusability**: Dependencies can be shared across endpoints
- **Maintainability**: Changes to dependencies don't affect multiple places
- **Separation of Concerns**: Business logic separated from infrastructure

### Without Dependency Injection
```python
@app.get("/users/")
def get_users():
    db = get_database_connection()  # Dependency created inside function
    users = db.query("SELECT * FROM users")
    return users
```

### With Dependency Injection
```python
def get_db():
    db = get_database_connection()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/")
def get_users(db = Depends(get_db)):  # Dependency injected
    users = db.query("SELECT * FROM users")
    return users
```

## Basic Dependency Injection

### Simple Dependencies
```python
from fastapi import FastAPI, Depends
from typing import Optional

app = FastAPI()

def get_current_user(token: Optional[str] = None):
    # Simulate user authentication
    if not token:
        return {"username": "anonymous", "role": "guest"}
    return {"username": "john", "role": "admin"}

@app.get("/me")
def get_current_user_endpoint(user = Depends(get_current_user)):
    return user

@app.get("/admin")
def admin_endpoint(user = Depends(get_current_user)):
    if user["role"] != "admin":
        return {"error": "Not authorized"}
    return {"message": "Welcome admin!"}
```

### Database Dependencies
```python
from fastapi import FastAPI, Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/")
def read_users(db: Session = Depends(get_db)):
    # Use db session here
    return {"users": []}

@app.post("/users/")
def create_user(user_data: dict, db: Session = Depends(get_db)):
    # Create user using db session
    return {"message": "User created"}
```

## Advanced Dependency Patterns

### Class-Based Dependencies
```python
from fastapi import FastAPI, Depends, HTTPException
from typing import Optional

class UserService:
    def __init__(self, db_session):
        self.db = db_session

    def get_user(self, user_id: int):
        # Simulate database query
        return {"id": user_id, "name": f"User {user_id}"}

    def get_current_user(self):
        return {"id": 1, "name": "Current User"}

def get_user_service(db = Depends(get_db)):
    return UserService(db)

@app.get("/users/{user_id}")
def get_user(user_id: int, service: UserService = Depends(get_user_service)):
    return service.get_user(user_id)

@app.get("/me")
def get_current_user(service: UserService = Depends(get_user_service)):
    return service.get_current_user()
```

### Sub-Dependencies
```python
from fastapi import FastAPI, Depends

def get_database_url():
    return "sqlite:///./test.db"

def get_database_session(url = Depends(get_database_url)):
    # Create session using URL
    session = f"Session for {url}"
    return session

def get_user_repository(session = Depends(get_database_session)):
    return f"UserRepository with {session}"

@app.get("/users/")
def get_users(repo = Depends(get_user_repository)):
    return {"repository": repo}
```

### Global Dependencies
```python
from fastapi import FastAPI, Depends, Request

def log_request(request: Request):
    print(f"Request: {request.method} {request.url}")
    return True

# Apply to entire app
app = FastAPI(dependencies=[Depends(log_request)])

# Or apply to specific router
from fastapi import APIRouter

router = APIRouter(dependencies=[Depends(log_request)])

@router.get("/protected")
def protected_endpoint():
    return {"message": "This endpoint is logged"}
```

## Authentication Dependencies

### JWT Authentication
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
import os

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"

security = HTTPBearer()

class TokenData(BaseModel):
    username: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/protected")
def protected_route(user = Depends(get_current_user)):
    return {"message": f"Hello {user['username']}"}
```

### OAuth2 with Password
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

def fake_decode_token(token):
    # Simulate token decoding
    return {"username": "johndoe"}

def get_current_user(token: str = Depends(oauth2_scheme)):
    user = fake_decode_token(token)
    return user

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Validate credentials and return token
    return {"access_token": "fake-token", "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user
```

## Caching Dependencies

### Redis Cache
```python
from fastapi import FastAPI, Depends
import redis
import json
from typing import Optional

def get_redis():
    return redis.Redis(host='localhost', port=6379, db=0)

def get_cache(redis_client = Depends(get_redis)):
    def set_cache(key: str, value, expire: int = 3600):
        redis_client.setex(key, expire, json.dumps(value))

    def get_cache(key: str):
        data = redis_client.get(key)
        return json.loads(data) if data else None

    return {"set": set_cache, "get": get_cache}

@app.get("/data/{key}")
def get_data(key: str, cache = Depends(get_cache)):
    data = cache["get"](key)
    if data:
        return {"data": data, "cached": True}

    # Simulate expensive operation
    data = {"result": f"Computed for {key}"}
    cache["set"](key, data)
    return {"data": data, "cached": False}
```

## Testing with Dependencies

### Mocking Dependencies
```python
from fastapi.testclient import TestClient
from unittest.mock import Mock

def test_get_users():
    # Create mock dependency
    mock_db = Mock()
    mock_db.query.return_value = [{"id": 1, "name": "John"}]

    # Override dependency
    app.dependency_overrides[get_db] = lambda: mock_db

    client = TestClient(app)
    response = client.get("/users/")
    assert response.status_code == 200

    # Clean up
    app.dependency_overrides = {}
```

### Dependency Injection in Tests
```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

def test_with_dependency_override():
    def mock_get_current_user():
        return {"username": "testuser", "role": "admin"}

    app = FastAPI()
    app.dependency_overrides[get_current_user] = mock_get_current_user

    @app.get("/test")
    def test_endpoint(user = Depends(get_current_user)):
        return user

    client = TestClient(app)
    response = client.get("/test")
    assert response.json() == {"username": "testuser", "role": "admin"}
```

## Dependency Scopes

### Application Scope
```python
from fastapi import FastAPI
import time

start_time = time.time()

def get_app_start_time():
    return start_time

@app.get("/uptime")
def get_uptime(start_time: float = Depends(get_app_start_time)):
    return {"uptime": time.time() - start_time}
```

### Request Scope
```python
from fastapi import FastAPI, Request
import time

def get_request_timer(request: Request):
    return {"start_time": time.time(), "request_id": id(request)}

@app.get("/timed")
def timed_endpoint(timer = Depends(get_request_timer)):
    # Simulate work
    time.sleep(0.1)
    elapsed = time.time() - timer["start_time"]
    return {"elapsed": elapsed, "request_id": timer["request_id"]}
```

## Advanced Patterns

### Dependency with Configuration
```python
from fastapi import FastAPI, Depends
from pydantic import BaseModel
import os

class DatabaseConfig(BaseModel):
    url: str
    pool_size: int = 10
    echo: bool = False

def get_database_config():
    return DatabaseConfig(
        url=os.getenv("DATABASE_URL", "sqlite:///./test.db"),
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        echo=os.getenv("DB_ECHO", "false").lower() == "true"
    )

def get_database_session(config: DatabaseConfig = Depends(get_database_config)):
    # Create session using config
    return f"Session with pool_size={config.pool_size}"
```

### Conditional Dependencies
```python
from fastapi import FastAPI, Depends, Query
from typing import Optional

def get_pagination_params(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    return {"page": page, "size": size, "offset": (page - 1) * size}

def get_search_params(q: Optional[str] = None):
    return {"query": q}

@app.get("/items/")
def get_items(
    pagination = Depends(get_pagination_params),
    search = Depends(get_search_params)
):
    return {
        "pagination": pagination,
        "search": search,
        "items": []
    }
```

### Circular Dependencies
```python
from fastapi import FastAPI, Depends

# Avoid circular dependencies by using forward references
def get_service_a(service_b = Depends(lambda: get_service_b())):
    return f"Service A with {service_b}"

def get_service_b(service_a = Depends(lambda: get_service_a())):
    return f"Service B with {service_a}"

# Better approach: Use classes or restructure
class ServiceContainer:
    def __init__(self):
        self.service_a = ServiceA(self)
        self.service_b = ServiceB(self)

class ServiceA:
    def __init__(self, container):
        self.container = container

class ServiceB:
    def __init__(self, container):
        self.container = container

def get_services():
    return ServiceContainer()

@app.get("/services")
def get_service_data(services = Depends(get_services)):
    return {
        "service_a": str(services.service_a),
        "service_b": str(services.service_b)
    }
```

## Best Practices

### Dependency Design
- **Single Responsibility**: Each dependency should do one thing
- **Testability**: Design dependencies to be easily mocked
- **Reusability**: Create dependencies that can be used across endpoints
- **Performance**: Use appropriate scopes (app vs request)

### Error Handling
- **Graceful Degradation**: Handle dependency failures gracefully
- **Clear Error Messages**: Provide meaningful error messages
- **Logging**: Log dependency issues for debugging

### Security
- **Validate Inputs**: Always validate data from dependencies
- **Secure Credentials**: Never expose sensitive data in dependencies
- **Rate Limiting**: Implement rate limiting in dependencies

## Hands-on Exercises

### Exercise 1: Basic Dependencies
1. Create a user authentication dependency
2. Implement role-based access control
3. Test with mocked dependencies

### Exercise 2: Database Layer
1. Create database connection dependency
2. Implement repository pattern with dependencies
3. Add database transaction management

### Exercise 3: Service Layer
1. Create business logic services
2. Implement dependency injection for services
3. Add caching and external API calls

## Next Steps
- [CRUD Operations Tutorial](../tutorials/05-crud-operations.md)
- [Workshop: Basic API](../workshops/workshop-01-basic-api.md)

## Additional Resources
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Dependency Injection Principles](https://martinfowler.com/articles/injection.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Testing FastAPI](https://fastapi.tiangolo.com/tutorial/testing/)

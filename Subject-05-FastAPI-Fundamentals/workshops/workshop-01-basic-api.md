# Workshop 01: Basic FastAPI Application

## Overview
This workshop guides you through creating your first FastAPI application. You'll build a simple API with multiple endpoints, learn about request/response handling, and explore FastAPI's automatic documentation features.

## Prerequisites
- Python 3.8+ installed
- Basic understanding of Python
- Text editor or IDE

## Learning Objectives
By the end of this workshop, you will be able to:
- Set up a FastAPI project with proper structure
- Create basic API endpoints with different HTTP methods
- Handle path and query parameters
- Work with request bodies
- Use FastAPI's automatic documentation

## Workshop Setup

### Step 1: Create Project Structure

```bash
# Create project directory
mkdir fastapi-workshop
cd fastapi-workshop

# Create virtual environment
uv venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
uv add fastapi uvicorn

# Create project structure
mkdir app
touch app/__init__.py app/main.py app/models.py
```

### Step 2: Create Basic Application

**app/main.py:**
```python
from fastapi import FastAPI

# Create FastAPI application instance
app = FastAPI(
    title="My First API",
    description="A simple FastAPI application",
    version="1.0.0"
)

# Basic endpoint
@app.get("/")
async def read_root():
    return {"message": "Hello World from FastAPI!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2023-12-01T10:00:00Z"}
```

**Run the application:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Test the endpoints:**
```bash
# Test root endpoint
curl http://localhost:8000/

# Test health endpoint
curl http://localhost:8000/health
```

## Working with Parameters

### Step 3: Path Parameters

**Update app/main.py:**
```python
from fastapi import FastAPI

app = FastAPI(title="My First API", version="1.0.0")

# ... existing code ...

# Path parameters
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id, "name": f"User {user_id}"}

@app.get("/posts/{post_id}")
async def get_post(post_id: int):
    return {
        "post_id": post_id,
        "title": f"Post {post_id}",
        "content": f"This is the content of post {post_id}"
    }

@app.get("/categories/{category}/posts/{post_id}")
async def get_category_post(category: str, post_id: int):
    return {
        "category": category,
        "post_id": post_id,
        "data": f"Post {post_id} in category {category}"
    }
```

**Test path parameters:**
```bash
# Test user endpoint
curl http://localhost:8000/users/123

# Test post endpoint
curl http://localhost:8000/posts/456

# Test nested parameters
curl http://localhost:8000/categories/python/posts/789
```

### Step 4: Query Parameters

**Update app/main.py:**
```python
from fastapi import FastAPI
from typing import Optional

app = FastAPI(title="My First API", version="1.0.0")

# ... existing code ...

# Query parameters
@app.get("/search")
async def search_items(
    q: str,
    limit: int = 10,
    offset: int = 0,
    sort_by: Optional[str] = None
):
    return {
        "query": q,
        "limit": limit,
        "offset": offset,
        "sort_by": sort_by,
        "results": f"Found results for '{q}'"
    }

@app.get("/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: bool = True
):
    return {
        "filters": {
            "category": category,
            "price_range": {"min": min_price, "max": max_price},
            "in_stock": in_stock
        },
        "products": [
            {"id": 1, "name": "Product 1", "price": 29.99},
            {"id": 2, "name": "Product 2", "price": 49.99}
        ]
    }
```

**Test query parameters:**
```bash
# Basic search
curl "http://localhost:8000/search?q=python"

# Search with parameters
curl "http://localhost:8000/search?q=python&limit=5&offset=10&sort_by=date"

# Products with filters
curl "http://localhost:8000/products?category=electronics&min_price=20&max_price=100&in_stock=true"
```

## Working with Request Bodies

### Step 5: Create Pydantic Models

**app/models.py:**
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=150)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    created_at: datetime

class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    published: bool = True

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    published: bool
    author: str
    created_at: datetime
```

### Step 6: Request Body Endpoints

**Update app/main.py:**
```python
from fastapi import FastAPI, HTTPException
from typing import Optional, List
from .models import UserCreate, UserResponse, PostCreate, PostResponse
from datetime import datetime

app = FastAPI(title="My First API", version="1.0.0")

# In-memory storage (for demo purposes)
users_db = []
posts_db = []

# ... existing code ...

# Create user
@app.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate):
    # Check if username already exists
    if any(u["username"] == user.username for u in users_db):
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = {
        "id": len(users_db) + 1,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "age": user.age,
        "created_at": datetime.now()
    }
    users_db.append(new_user)
    return new_user

# Get all users
@app.get("/users/", response_model=List[UserResponse])
async def get_users():
    return users_db

# Get user by ID
@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    for user in users_db:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

# Create post
@app.post("/posts/", response_model=PostResponse)
async def create_post(post: PostCreate):
    new_post = {
        "id": len(posts_db) + 1,
        "title": post.title,
        "content": post.content,
        "published": post.published,
        "author": "Anonymous",  # In real app, get from authentication
        "created_at": datetime.now()
    }
    posts_db.append(new_post)
    return new_post

# Get all posts
@app.get("/posts/", response_model=List[PostResponse])
async def get_posts():
    return posts_db

# Get post by ID
@app.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int):
    for post in posts_db:
        if post["id"] == post_id:
            return post
    raise HTTPException(status_code=404, detail="Post not found")
```

**Test request bodies:**
```bash
# Create a user
curl -X POST "http://localhost:8000/users/" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "johndoe",
       "email": "john@example.com",
       "full_name": "John Doe",
       "age": 30
     }'

# Get all users
curl http://localhost:8000/users/

# Get specific user
curl http://localhost:8000/users/1

# Create a post
curl -X POST "http://localhost:8000/posts/" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "My First Post",
       "content": "This is the content of my first post",
       "published": true
     }'

# Get all posts
curl http://localhost:8000/posts/
```

## Exploring Documentation

### Step 7: Interactive Documentation

**Visit the documentation:**
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

**In the documentation, you can:**
1. See all available endpoints
2. View request/response schemas
3. Test endpoints directly from the browser
4. See validation rules and examples

## Advanced Features

### Step 8: Status Codes and Error Handling

**Update app/main.py:**
```python
from fastapi import FastAPI, HTTPException, status
from typing import Optional, List
from .models import UserCreate, UserResponse, PostCreate, PostResponse
from datetime import datetime

app = FastAPI(title="My First API", version="1.0.0")

# ... existing code ...

# Update user (PATCH)
@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: dict):
    for user in users_db:
        if user["id"] == user_id:
            # Update only provided fields
            for key, value in user_update.items():
                if key in user:
                    user[key] = value
            user["updated_at"] = datetime.now()
            return user
    raise HTTPException(status_code=404, detail="User not found")

# Delete user
@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    for i, user in enumerate(users_db):
        if user["id"] == user_id:
            users_db.pop(i)
            return
    raise HTTPException(status_code=404, detail="User not found")

# Update post
@app.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, post_update: PostCreate):
    for post in posts_db:
        if post["id"] == post_id:
            post.update(post_update.dict())
            post["updated_at"] = datetime.now()
            return post
    raise HTTPException(status_code=404, detail="Post not found")

# Delete post
@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int):
    for i, post in enumerate(posts_db):
        if post["id"] == post_id:
            posts_db.pop(i)
            return
    raise HTTPException(status_code=404, detail="Post not found")
```

**Test CRUD operations:**
```bash
# Create user
USER_ID=$(curl -s -X POST "http://localhost:8000/users/" \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "email": "test@example.com"}' | jq -r '.id')

# Update user
curl -X PATCH "http://localhost:8000/users/$USER_ID" \
     -H "Content-Type: application/json" \
     -d '{"full_name": "Test User"}'

# Create post
POST_ID=$(curl -s -X POST "http://localhost:8000/posts/" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Post", "content": "Test content"}' | jq -r '.id')

# Update post
curl -X PUT "http://localhost:8000/posts/$POST_ID" \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Post", "content": "Updated content"}'

# Delete post
curl -X DELETE "http://localhost:8000/posts/$POST_ID"

# Delete user
curl -X DELETE "http://localhost:8000/users/$USER_ID"
```

## Project Organization

### Step 9: Better Project Structure

**Create routes directory:**
```bash
mkdir app/routes
touch app/routes/__init__.py app/routes/users.py app/routes/posts.py
```

**app/routes/users.py:**
```python
from fastapi import APIRouter, HTTPException, status
from typing import List
from ..models import UserCreate, UserResponse
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])

users_db = []

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    # Check if username exists
    if any(u["username"] == user.username for u in users_db):
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = {
        "id": len(users_db) + 1,
        **user.dict(),
        "created_at": datetime.now()
    }
    users_db.append(new_user)
    return new_user

@router.get("/", response_model=List[UserResponse])
async def get_users():
    return users_db

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    for user in users_db:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: dict):
    for user in users_db:
        if user["id"] == user_id:
            for key, value in user_update.items():
                if key in user:
                    user[key] = value
            return user
    raise HTTPException(status_code=404, detail="User not found")

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    for i, user in enumerate(users_db):
        if user["id"] == user_id:
            users_db.pop(i)
            return
    raise HTTPException(status_code=404, detail="User not found")
```

**app/routes/posts.py:**
```python
from fastapi import APIRouter, HTTPException, status
from typing import List
from ..models import PostCreate, PostResponse
from datetime import datetime

router = APIRouter(prefix="/posts", tags=["posts"])

posts_db = []

@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate):
    new_post = {
        "id": len(posts_db) + 1,
        **post.dict(),
        "author": "Anonymous",
        "created_at": datetime.now()
    }
    posts_db.append(new_post)
    return new_post

@router.get("/", response_model=List[PostResponse])
async def get_posts():
    return posts_db

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: int):
    for post in posts_db:
        if post["id"] == post_id:
            return post
    raise HTTPException(status_code=404, detail="Post not found")

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, post_update: PostCreate):
    for post in posts_db:
        if post["id"] == post_id:
            post.update(post_update.dict())
            post["updated_at"] = datetime.now()
            return post
    raise HTTPException(status_code=404, detail="Post not found")

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int):
    for i, post in enumerate(posts_db):
        if post["id"] == post_id:
            posts_db.pop(i)
            return
    raise HTTPException(status_code=404, detail="Post not found")
```

**Update app/main.py:**
```python
from fastapi import FastAPI
from .routes import users, posts

app = FastAPI(
    title="My First API",
    description="A simple FastAPI application with users and posts",
    version="1.0.0"
)

# Include routers
app.include_router(users.router)
app.include_router(posts.router)

@app.get("/")
async def read_root():
    return {"message": "Welcome to My First API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Testing Your API

### Step 10: Basic Testing

**Create tests directory:**
```bash
mkdir tests
touch tests/__init__.py tests/test_main.py
```

**tests/test_main.py:**
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to My First API!"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_create_user():
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "age": 25
    }
    response = client.post("/users/", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_get_users():
    response = client.get("/users/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_post():
    post_data = {
        "title": "Test Post",
        "content": "This is a test post",
        "published": True
    }
    response = client.post("/posts/", json=post_data)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Post"
    assert data["content"] == "This is a test post"
```

**Run tests:**
```bash
# Install pytest
uv add pytest httpx

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

## Challenge Exercises

### Challenge 1: Add Categories
1. Create category management endpoints
2. Add category field to posts
3. Implement category filtering

### Challenge 2: Add Comments
1. Create comment endpoints
2. Associate comments with posts
3. Add comment validation

### Challenge 3: Add Authentication
1. Implement basic authentication
2. Protect sensitive endpoints
3. Add user ownership checks

## Verification Checklist

- [ ] FastAPI application created and running
- [ ] Basic endpoints working (/health)
- [ ] Path parameters implemented and tested
- [ ] Query parameters working
- [ ] Request bodies handled correctly
- [ ] Pydantic models created and validated
- [ ] CRUD operations implemented
- [ ] Proper HTTP status codes used
- [ ] Error handling implemented
- [ ] API documentation accessible
- [ ] Basic tests written and passing
- [ ] Project properly structured

## Troubleshooting

### Common Issues

**"Module not found" errors:**
- Ensure virtual environment is activated
- Check file structure and imports
- Reinstall dependencies: `uv add -r requirements.txt`

**Port already in use:**
- Kill process: `lsof -ti:8000 | xargs kill -9`
- Use different port: `uvicorn app.main:app --port 8001`

**Validation errors:**
- Check request data format
- Verify Pydantic model field types
- Look at error messages in API responses

**Import errors:**
- Ensure `__init__.py` files exist
- Check relative import paths
- Verify package structure

## Next Steps
- [Pydantic Models Tutorial](../tutorials/02-pydantic-models.md)
- [Workshop: Request Validation](../workshops/workshop-02-request-validation.md)

## Additional Resources
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

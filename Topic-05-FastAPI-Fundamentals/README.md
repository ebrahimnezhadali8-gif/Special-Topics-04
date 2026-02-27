# Subject 5: FastAPI Fundamentals (Routes, Pydantic Models)

## Overview

This subject introduces FastAPI, a modern, high-performance web framework for building APIs with Python. You'll learn to create robust REST APIs using Pydantic models for data validation, implement CRUD operations, and understand FastAPI's powerful dependency injection system.

## Learning Objectives

By the end of this subject, you will be able to:

- **Build REST APIs**: Create FastAPI applications with proper routing and endpoints
- **Use Pydantic Models**: Define request/response models with automatic validation
- **Implement CRUD Operations**: Build complete Create, Read, Update, Delete functionality
- **Handle Dependencies**: Use FastAPI's dependency injection for clean, testable code
- **Generate Documentation**: Leverage automatic API documentation features
- **Write Tests**: Create comprehensive tests for API endpoints

## Prerequisites

- Completion of Subjects 1-4 (Git, Environments, Project Management, Docker)
- Python 3.8+ proficiency
- Basic understanding of HTTP and REST concepts
- Familiarity with virtual environments (Subject 2)

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[FastAPI Introduction](tutorials/01-fastapi-introduction.md)**
   - What is FastAPI and why use it?
   - Installation and basic setup
   - First API endpoint
   - Development server with Uvicorn

2. **[Pydantic Models](tutorials/02-pydantic-models.md)**
   - Data validation with Pydantic
   - Model definitions and field types
   - Validation rules and constraints
   - Nested models and relationships

3. **[Request/Response Models](tutorials/03-request-response-models.md)**
   - Request body models
   - Response models and status codes
   - Path and query parameters
   - Error handling and validation

4. **[Dependency Injection](tutorials/04-dependency-injection.md)**
   - Understanding dependency injection
   - Creating and using dependencies
   - Dependency scopes and lifecycle
   - Testing with mocked dependencies

5. **[CRUD Operations](tutorials/05-crud-operations.md)**
   - Implementing Create operations
   - Read operations (single and multiple)
   - Update operations with partial data
   - Delete operations and soft deletes

### 🛠️ Workshops (Hands-on Practice)

1. **[Basic API](workshops/workshop-01-basic-api.md)**
   - Setting up FastAPI project structure
   - Creating basic endpoints
   - Running and testing the API
   - Understanding auto-generated documentation

2. **[Request Validation](workshops/workshop-02-request-validation.md)**
   - Implementing Pydantic models
   - Adding validation rules
   - Handling validation errors
   - Custom validators and field types

3. **[CRUD Articles](workshops/workshop-03-crud-articles.md)**
   - Building article management API
   - Implementing all CRUD operations
   - Data persistence patterns
   - Error handling for CRUD operations

4. **[Testing & Documentation](workshops/workshop-04-testing-documentation.md)**
   - Writing unit tests for endpoints
   - API documentation with OpenAPI
   - Interactive documentation (Swagger UI)
   - Testing best practices

5. **[Advanced CRUD & Relationships](workshops/workshop-05-advanced-crud-relationships.md)**
   - Complex data relationships
   - Nested resource operations
   - Advanced query parameters
   - API design patterns

### 📝 Homework Assignments

The `homeworks/` directory contains:
- API endpoint implementation assignments
- Model validation challenges
- Testing and documentation tasks

### 📋 Assessments

The `assessments/` directory contains:
- API design quiz
- Code review checklists
- Endpoint testing scenarios

## Key FastAPI Concepts

### Basic Application Structure

```python
from fastapi import FastAPI

app = FastAPI(
    title="My API",
    description="A simple FastAPI application",
    version="1.0.0"
)

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
```

### Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Item(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    description: Optional[str] = None
    tax: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ItemCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
```

### CRUD Operations Pattern

```python
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter()
items = []  # In-memory storage for demo

@router.post("/items/", response_model=Item)
async def create_item(item: ItemCreate):
    new_item = Item(**item.dict())
    items.append(new_item)
    return new_item

@router.get("/items/", response_model=List[Item])
async def read_items(skip: int = 0, limit: int = 10):
    return items[skip:skip + limit]

@router.get("/items/{item_id}", response_model=Item)
async def read_item(item_id: int):
    if item_id >= len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    return items[item_id]

@router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemCreate):
    if item_id >= len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = Item(**item.dict())
    items[item_id] = updated_item
    return updated_item

@router.delete("/items/{item_id}")
async def delete_item(item_id: int):
    if item_id >= len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    del items[item_id]
    return {"message": "Item deleted"}
```

## Dependency Injection

### Creating Dependencies

```python
from fastapi import Depends, HTTPException
from typing import Optional

# Dependency function
def get_current_user(token: str = Depends(get_token_header)):
    # Validate token and return user
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return User(id=1, name="John Doe")

# Using dependencies
@app.get("/users/me")
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

# Dependency with parameters
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/items/")
async def read_items(db: Session = Depends(get_db_session)):
    return db.query(Item).all()
```

## API Documentation

FastAPI automatically generates interactive documentation:

- **Swagger UI**: `/docs` - Interactive API documentation
- **ReDoc**: `/redoc` - Alternative documentation view
- **OpenAPI Schema**: `/openapi.json` - Machine-readable API spec

### Adding Documentation

```python
from fastapi import FastAPI

app = FastAPI(
    title="Item Management API",
    description="API for managing items with CRUD operations",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

@app.post(
    "/items/",
    response_model=Item,
    summary="Create an item",
    description="Create a new item with the provided data",
    response_description="The created item",
    tags=["items"]
)
async def create_item(item: ItemCreate):
    # Implementation
    pass
```

## Testing FastAPI Applications

### Basic Test Structure

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_item():
    response = client.post(
        "/items/",
        json={"name": "Test Item", "price": 10.99}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Item"
    assert data["price"] == 10.99

def test_read_items():
    response = client.get("/items/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

## Resources & References

### 📖 Official Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Official guide
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/) - Data validation
- [Uvicorn Documentation](https://www.uvicorn.org/) - ASGI server

### 🛠️ Tools & Setup
- [FastAPI CLI](https://fastapi.tiangolo.com/tutorial/bigger-applications/) - Project generator
- [Postman](https://www.postman.com/) - API testing tool
- [Insomnia](https://insomnia.rest/) - API client

### 📚 Additional Learning
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/) - Step-by-step guide
- [Real Python FastAPI](https://realpython.com/fastapi-python-web-apis/) - In-depth articles
- [FastAPI Examples](https://github.com/tiangolo/fastapi/tree/master/examples) - Code samples

## Getting Started

1. **Set up Environment** following the installation guides in `installation/`
2. **Complete Workshop 1** to create your first FastAPI application
3. **Work through Tutorials** to understand core concepts
4. **Practice with Workshops** to build complete CRUD APIs
5. **Complete Homework** assignments to demonstrate mastery

## Common FastAPI Patterns

### Pagination

```python
from fastapi import Query
from typing import List

@app.get("/items/", response_model=List[Item])
async def read_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return db.query(Item).offset(skip).limit(limit).all()
```

### Authentication

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.get("/protected/")
async def protected_route(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # Validate token
    return {"message": "Access granted"}
```

### File Upload

```python
from fastapi import File, UploadFile

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    # Process file
    return {"filename": file.filename, "size": len(contents)}
```

## Best Practices

### API Design
- Use RESTful conventions
- Consistent resource naming
- Proper HTTP status codes
- Meaningful error messages

### Code Organization
- Separate routers for different resources
- Use dependency injection for database connections
- Implement proper error handling
- Write comprehensive tests

### Performance
- Use async/await for I/O operations
- Implement proper database connection pooling
- Use caching where appropriate
- Monitor API performance

## Assessment Criteria

- **API Design**: Proper RESTful design and resource modeling
- **Data Validation**: Effective use of Pydantic models and validation
- **CRUD Implementation**: Complete and correct CRUD operations
- **Dependency Injection**: Proper use of FastAPI's dependency system
- **Testing**: Comprehensive test coverage and proper test structure
- **Documentation**: Clear API documentation and examples

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 6**: Advanced FastAPI features (async, auth, background tasks)
- **Subject 7**: gRPC and protocol buffers
- Building full-stack applications with authentication

---

*FastAPI combines the best of Python's type system with modern API development practices. This subject provides the foundation for building robust, scalable web APIs.*

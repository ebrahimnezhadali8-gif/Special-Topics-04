# Tutorial 05: CRUD Operations and RESTful API Design

## Overview
This tutorial demonstrates how to implement complete CRUD (Create, Read, Update, Delete) operations in FastAPI. You'll learn RESTful API design principles, proper HTTP status codes, and how to build a complete API for managing resources like articles or blog posts.

## RESTful API Principles

REST (Representational State Transfer) is an architectural style for designing networked applications. Key principles:

- **Resources**: Everything is a resource (articles, users, comments)
- **HTTP Methods**: Use appropriate HTTP methods for operations
- **Stateless**: Each request contains all information needed
- **Uniform Interface**: Consistent resource identification and manipulation

### HTTP Methods and CRUD Mapping

| Operation | HTTP Method | Endpoint | Status Code |
|-----------|-------------|----------|-------------|
| Create | POST | /articles | 201 Created |
| Read (List) | GET | /articles | 200 OK |
| Read (Single) | GET | /articles/{id} | 200 OK / 404 Not Found |
| Update | PUT/PATCH | /articles/{id} | 200 OK / 404 Not Found |
| Delete | DELETE | /articles/{id} | 204 No Content / 404 Not Found |

## Project Structure

### Complete API Structure
```
articles-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app instance
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── models.py            # Pydantic models
│   ├── crud.py              # CRUD operations
│   ├── routes/              # API routes
│   │   ├── __init__.py
│   │   └── articles.py
│   └── dependencies.py      # Dependencies
├── tests/
│   ├── __init__.py
│   ├── test_articles.py
│   └── conftest.py
├── requirements.txt
└── README.md
```

## Database Models

### SQLAlchemy Models
```python
# app/database.py
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./articles.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# app/models.py (SQLAlchemy)
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(100), nullable=False)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Pydantic Models
```python
# app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Base schema
class ArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1, max_length=100)
    published: bool = True

# Create schema (inherits from base)
class ArticleCreate(ArticleBase):
    pass

# Update schema (all fields optional)
class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    author: Optional[str] = Field(None, min_length=1, max_length=100)
    published: Optional[bool] = None

# Response schema
class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": 1,
                "title": "FastAPI Tutorial",
                "content": "Learn how to build APIs with FastAPI",
                "author": "John Doe",
                "published": True,
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-01T10:00:00Z"
            }
        }
```

## CRUD Operations

### Repository Pattern
```python
# app/crud.py
from sqlalchemy.orm import Session
from . import models, schemas
from typing import List, Optional

def get_article(db: Session, article_id: int) -> Optional[models.Article]:
    return db.query(models.Article).filter(models.Article.id == article_id).first()

def get_articles(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    published_only: bool = False
) -> List[models.Article]:
    query = db.query(models.Article)
    if published_only:
        query = query.filter(models.Article.published == True)
    return query.offset(skip).limit(limit).all()

def create_article(db: Session, article: schemas.ArticleCreate) -> models.Article:
    db_article = models.Article(**article.dict())
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article

def update_article(
    db: Session,
    article_id: int,
    article_update: schemas.ArticleUpdate
) -> Optional[models.Article]:
    db_article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if db_article:
        update_data = article_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_article, field, value)
        db.commit()
        db.refresh(db_article)
    return db_article

def delete_article(db: Session, article_id: int) -> bool:
    db_article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if db_article:
        db.delete(db_article)
        db.commit()
        return True
    return False
```

## API Routes

### Article Routes
```python
# app/routes/articles.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/articles", tags=["articles"])

@router.post("/", response_model=schemas.ArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(article: schemas.ArticleCreate, db: Session = Depends(get_db)):
    """Create a new article"""
    return crud.create_article(db=db, article=article)

@router.get("/", response_model=List[schemas.ArticleResponse])
def read_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    published_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get list of articles with pagination"""
    articles = crud.get_articles(db, skip=skip, limit=limit, published_only=published_only)
    return articles

@router.get("/{article_id}", response_model=schemas.ArticleResponse)
def read_article(article_id: int, db: Session = Depends(get_db)):
    """Get a specific article by ID"""
    db_article = crud.get_article(db, article_id=article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.put("/{article_id}", response_model=schemas.ArticleResponse)
def update_article(
    article_id: int,
    article: schemas.ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Update an article completely"""
    db_article = crud.update_article(db, article_id=article_id, article_update=article)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.patch("/{article_id}", response_model=schemas.ArticleResponse)
def partial_update_article(
    article_id: int,
    article: schemas.ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Update an article partially"""
    db_article = crud.update_article(db, article_id=article_id, article_update=article)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    """Delete an article"""
    success = crud.delete_article(db, article_id=article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return None
```

### Main Application
```python
# app/main.py
from fastapi import FastAPI
from .database import engine
from . import models
from .routes import articles

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Articles API",
    description="A RESTful API for managing articles",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include routers
app.include_router(articles.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "articles-api"}
```

## Advanced Features

### Filtering and Search
```python
# app/routes/articles.py (continued)
@router.get("/search/", response_model=List[schemas.ArticleResponse])
def search_articles(
    q: str = Query(..., min_length=1, max_length=100),
    author: Optional[str] = None,
    published: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search articles with filters"""
    query = db.query(models.Article)

    # Text search in title and content
    if q:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.Article.title.ilike(f"%{q}%"),
                models.Article.content.ilike(f"%{q}%")
            )
        )

    # Filter by author
    if author:
        query = query.filter(models.Article.author.ilike(f"%{author}%"))

    # Filter by published status
    if published is not None:
        query = query.filter(models.Article.published == published)

    articles = query.offset(skip).limit(limit).all()
    return articles
```

### Pagination Response
```python
# app/schemas.py (continued)
from pydantic import BaseModel
from typing import List, Generic, TypeVar

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(cls, items: List[T], total: int, page: int, size: int):
        pages = (total + size - 1) // size  # Ceiling division
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
```

```python
# app/routes/articles.py (continued)
from ..schemas import PaginatedResponse

@router.get("/paginated/", response_model=PaginatedResponse[schemas.ArticleResponse])
def read_articles_paginated(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get paginated list of articles"""
    # Get total count
    total = db.query(models.Article).count()

    # Calculate offset
    offset = (page - 1) * size

    # Get articles
    articles = crud.get_articles(db, skip=offset, limit=size)

    return PaginatedResponse.create(
        items=articles,
        total=total,
        page=page,
        size=size
    )
```

## Error Handling

### Custom Exceptions
```python
# app/exceptions.py
from fastapi import HTTPException

class ArticleNotFoundError(HTTPException):
    def __init__(self, article_id: int):
        super().__init__(
            status_code=404,
            detail=f"Article with id {article_id} not found"
        )

class ArticleValidationError(HTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=422,
            detail=message
        )
```

### Global Exception Handler
```python
# app/main.py (continued)
from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Database integrity error. Check your data."}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )
```

## Testing the API

### Basic Tests
```python
# tests/test_articles.py
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.main import app
from app.database import get_db, Base
from app import models

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_create_article(test_db):
    response = client.post(
        "/articles/",
        json={
            "title": "Test Article",
            "content": "Test content",
            "author": "Test Author"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Article"
    assert "id" in data

def test_read_articles(test_db):
    # Create test data
    client.post("/articles/", json={
        "title": "Test Article",
        "content": "Test content",
        "author": "Test Author"
    })

    response = client.get("/articles/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Article"

def test_read_article(test_db):
    # Create test data
    create_response = client.post("/articles/", json={
        "title": "Test Article",
        "content": "Test content",
        "author": "Test Author"
    })
    article_id = create_response.json()["id"]

    response = client.get(f"/articles/{article_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == article_id

def test_update_article(test_db):
    # Create test data
    create_response = client.post("/articles/", json={
        "title": "Test Article",
        "content": "Test content",
        "author": "Test Author"
    })
    article_id = create_response.json()["id"]

    # Update article
    response = client.put(f"/articles/{article_id}", json={
        "title": "Updated Title",
        "content": "Updated content"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"

def test_delete_article(test_db):
    # Create test data
    create_response = client.post("/articles/", json={
        "title": "Test Article",
        "content": "Test content",
        "author": "Test Author"
    })
    article_id = create_response.json()["id"]

    # Delete article
    response = client.delete(f"/articles/{article_id}")
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/articles/{article_id}")
    assert response.status_code == 404
```

## API Documentation

### OpenAPI Configuration
```python
# app/main.py (continued)
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Articles API",
        version="1.0.0",
        description="A RESTful API for managing articles",
        routes=app.routes,
    )
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

## Best Practices

### API Design
- **Consistent Naming**: Use plural nouns for resources (`/articles`)
- **Proper HTTP Methods**: Use appropriate methods for operations
- **Meaningful Status Codes**: Return correct HTTP status codes
- **Versioning**: Consider API versioning for breaking changes

### Performance
- **Pagination**: Always paginate list endpoints
- **Indexing**: Add database indexes for frequently queried fields
- **Caching**: Implement caching for frequently accessed data
- **Async Operations**: Use async for I/O operations

### Security
- **Input Validation**: Always validate input data
- **SQL Injection Prevention**: Use parameterized queries
- **Rate Limiting**: Implement rate limiting for public APIs
- **Authentication**: Add authentication for sensitive operations

## Hands-on Exercises

### Exercise 1: Basic CRUD
1. Create a complete CRUD API for articles
2. Implement proper error handling
3. Add request/response validation

### Exercise 2: Advanced Features
1. Add search and filtering capabilities
2. Implement pagination for list endpoints
3. Add sorting options

### Exercise 3: Testing
1. Write comprehensive unit tests
2. Test error scenarios
3. Implement integration tests

## Next Steps
- [Workshop: CRUD Articles](../workshops/workshop-03-crud-articles.md)
- [Workshop: Testing and Documentation](../workshops/workshop-04-testing-documentation.md)

## Additional Resources
- [REST API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OpenAPI Specification](https://swagger.io/specification/)
- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)

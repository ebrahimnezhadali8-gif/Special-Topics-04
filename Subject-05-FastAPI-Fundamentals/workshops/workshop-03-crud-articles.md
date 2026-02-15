# Workshop 03: CRUD Articles Implementation

## Overview
This workshop implements a complete CRUD (Create, Read, Update, Delete) API for articles using FastAPI. You'll build a fully functional blog/article management system with proper validation, error handling, and RESTful design principles.

## Prerequisites
- Completed [Request Validation Workshop](../workshops/workshop-02-request-validation.md)
- Understanding of FastAPI, Pydantic, and basic HTTP concepts

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement complete CRUD operations for a resource
- Design proper RESTful API endpoints
- Handle complex data relationships
- Implement search and filtering functionality
- Add proper pagination and sorting
- Write comprehensive tests for CRUD operations

## Workshop Structure

### Part 1: Project Setup and Models

#### Step 1: Create Project Structure

```bash
mkdir crud-articles-api
cd crud-articles-api
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv add fastapi uvicorn sqlalchemy pydantic[email] alembic pytest httpx

mkdir -p app/{models,schemas,crud,routes,tests}
touch app/__init__.py app/main.py app/database.py
touch app/models/__init__.py app/models/article.py
touch app/schemas/__init__.py app/schemas/article.py
touch app/crud/__init__.py app/crud/article.py
touch app/routes/__init__.py app/routes/articles.py
mkdir tests && touch tests/__init__.py tests/test_articles.py tests/conftest.py
```

#### Step 2: Database Setup

**app/database.py:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./articles.db")

engine = create_engine(
    DATABASE_URL,
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

#### Step 3: Article Models

**app/models/article.py:**
```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    excerpt = Column(String(300))
    author = Column(String(100), nullable=False, index=True)
    status = Column(String(20), default="draft", nullable=False)  # draft, published, archived
    published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Tags relationship (many-to-many)
    tags = relationship("ArticleTag", back_populates="article", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    color = Column(String(7), default="#6b7280")  # Hex color

    # Articles relationship (many-to-many)
    articles = relationship("ArticleTag", back_populates="tag")

class ArticleTag(Base):
    __tablename__ = "article_tags"

    article_id = Column(Integer, ForeignKey("articles.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

    article = relationship("Article", back_populates="tags")
    tag = relationship("Tag", back_populates="articles")
```

#### Step 4: Pydantic Schemas

**app/schemas/article.py:**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import re

class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field("#6b7280", regex=r'^#[0-9a-fA-F]{6}$')

    @validator('name')
    def validate_name(cls, v):
        if not re.match(r'^[a-zA-Z0-9\s\-_]+$', v):
            raise ValueError('Tag name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v.strip()

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    slug: str

    class Config:
        orm_mode = True

class ArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = Field(None, max_length=300)
    author: str = Field(..., min_length=1, max_length=100)
    status: ArticleStatus = ArticleStatus.DRAFT

    @validator('title')
    def validate_title(cls, v):
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters long')
        return v

class ArticleCreate(ArticleBase):
    tags: List[str] = Field(default_factory=list, max_items=10)

    @validator('tags')
    def validate_tags(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Tags must be unique')
        return [tag.lower().strip() for tag in v]

class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    excerpt: Optional[str] = Field(None, max_length=300)
    author: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[ArticleStatus] = None
    tags: Optional[List[str]] = Field(None, max_items=10)

    @validator('tags')
    def validate_tags(cls, v):
        if v is not None and len(v) != len(set(v)):
            raise ValueError('Tags must be unique')
        return [tag.lower().strip() for tag in v] if v else v

class Article(ArticleBase):
    id: int
    slug: str
    published: bool
    published_at: Optional[datetime]
    tags: List[Tag]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ArticleList(BaseModel):
    items: List[Article]
    total: int
    page: int
    size: int
    pages: int

class ArticleSearch(BaseModel):
    query: Optional[str] = None
    author: Optional[str] = None
    status: Optional[ArticleStatus] = None
    tags: Optional[List[str]] = None
    published_after: Optional[datetime] = None
    published_before: Optional[datetime] = None
```

### Part 2: CRUD Operations

#### Step 5: CRUD Functions

**app/crud/article.py:**
```python
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import List, Optional, Dict, Any
from ..models.article import Article, Tag, ArticleTag
from ..schemas.article import ArticleCreate, ArticleUpdate, ArticleStatus
import re

def create_article(db: Session, article: ArticleCreate) -> Article:
    # Generate slug from title
    slug = generate_slug(article.title)

    # Check if slug already exists
    counter = 1
    original_slug = slug
    while db.query(Article).filter(Article.slug == slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1

    # Create article
    db_article = Article(
        title=article.title,
        slug=slug,
        content=article.content,
        excerpt=article.excerpt,
        author=article.author,
        status=article.status
    )

    db.add(db_article)
    db.flush()  # Get article ID without committing

    # Add tags
    if article.tags:
        for tag_name in article.tags:
            tag = get_or_create_tag(db, tag_name)
            article_tag = ArticleTag(article_id=db_article.id, tag_id=tag.id)
            db.add(article_tag)

    db.commit()
    db.refresh(db_article)
    return db_article

def get_article(db: Session, article_id: int) -> Optional[Article]:
    return db.query(Article).options(
        joinedload(Article.tags).joinedload(ArticleTag.tag)
    ).filter(Article.id == article_id).first()

def get_article_by_slug(db: Session, slug: str) -> Optional[Article]:
    return db.query(Article).options(
        joinedload(Article.tags).joinedload(ArticleTag.tag)
    ).filter(Article.slug == slug).first()

def get_articles(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    author: Optional[str] = None,
    status: Optional[ArticleStatus] = None,
    tags: Optional[List[str]] = None,
    published_only: bool = False
) -> List[Article]:
    query = db.query(Article).options(
        joinedload(Article.tags).joinedload(ArticleTag.tag)
    )

    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Article.title.ilike(search_term),
                Article.content.ilike(search_term),
                Article.excerpt.ilike(search_term)
            )
        )

    if author:
        query = query.filter(Article.author.ilike(f"%{author}%"))

    if status:
        query = query.filter(Article.status == status)

    if published_only:
        query = query.filter(Article.published == True)

    if tags:
        # Filter articles that have any of the specified tags
        query = query.filter(
            Article.id.in_(
                db.query(ArticleTag.article_id).filter(
                    ArticleTag.tag_id.in_(
                        db.query(Tag.id).filter(Tag.name.in_(tags))
                    )
                )
            )
        )

    return query.offset(skip).limit(limit).all()

def get_articles_count(
    db: Session,
    search: Optional[str] = None,
    author: Optional[str] = None,
    status: Optional[ArticleStatus] = None,
    tags: Optional[List[str]] = None,
    published_only: bool = False
) -> int:
    query = db.query(func.count(Article.id))

    # Apply same filters as get_articles
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Article.title.ilike(search_term),
                Article.content.ilike(search_term),
                Article.excerpt.ilike(search_term)
            )
        )

    if author:
        query = query.filter(Article.author.ilike(f"%{author}%"))

    if status:
        query = query.filter(Article.status == status)

    if published_only:
        query = query.filter(Article.published == True)

    if tags:
        query = query.filter(
            Article.id.in_(
                db.query(ArticleTag.article_id).filter(
                    ArticleTag.tag_id.in_(
                        db.query(Tag.id).filter(Tag.name.in_(tags))
                    )
                )
            )
        )

    return query.scalar()

def update_article(
    db: Session,
    article_id: int,
    article_update: ArticleUpdate
) -> Optional[Article]:
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if not db_article:
        return None

    update_data = article_update.dict(exclude_unset=True, exclude={'tags'})

    # Update slug if title changed
    if 'title' in update_data and update_data['title'] != db_article.title:
        update_data['slug'] = generate_slug(update_data['title'])
        # Ensure slug uniqueness
        counter = 1
        original_slug = update_data['slug']
        while db.query(Article).filter(
            Article.slug == update_data['slug'],
            Article.id != article_id
        ).first():
            update_data['slug'] = f"{original_slug}-{counter}"
            counter += 1

    # Update status and published fields
    if 'status' in update_data:
        if update_data['status'] == ArticleStatus.PUBLISHED and not db_article.published:
            update_data['published'] = True
            from datetime import datetime
            update_data['published_at'] = datetime.utcnow()
        elif update_data['status'] != ArticleStatus.PUBLISHED:
            update_data['published'] = False
            update_data['published_at'] = None

    for field, value in update_data.items():
        setattr(db_article, field, value)

    # Update tags if provided
    if article_update.tags is not None:
        # Remove existing tags
        db.query(ArticleTag).filter(ArticleTag.article_id == article_id).delete()

        # Add new tags
        for tag_name in article_update.tags:
            tag = get_or_create_tag(db, tag_name)
            article_tag = ArticleTag(article_id=article_id, tag_id=tag.id)
            db.add(article_tag)

    db.commit()
    db.refresh(db_article)
    return db_article

def delete_article(db: Session, article_id: int) -> bool:
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if db_article:
        db.delete(db_article)
        db.commit()
        return True
    return False

def get_or_create_tag(db: Session, tag_name: str) -> Tag:
    # Generate slug for tag
    tag_slug = generate_slug(tag_name)

    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        tag = Tag(name=tag_name, slug=tag_slug)
        db.add(tag)
        db.flush()

    return tag

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[\s_-]+', '-', slug)
    return slug.strip('-')
```

### Part 3: API Routes

#### Step 6: Article Routes

**app/routes/articles.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..crud.article import (
    create_article, get_article, get_article_by_slug, get_articles,
    get_articles_count, update_article, delete_article
)
from ..schemas.article import (
    Article, ArticleCreate, ArticleUpdate, ArticleList,
    ArticleStatus, ArticleSearch
)

router = APIRouter(prefix="/articles", tags=["articles"])

@router.post("/", response_model=Article, status_code=status.HTTP_201_CREATED)
def create_new_article(article: ArticleCreate, db: Session = Depends(get_db)):
    """Create a new article"""
    return create_article(db=db, article=article)

@router.get("/", response_model=ArticleList)
def read_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    author: Optional[str] = None,
    status: Optional[ArticleStatus] = None,
    tags: Optional[List[str]] = Query(None),
    published_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get list of articles with optional filtering"""
    articles = get_articles(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        author=author,
        status=status,
        tags=tags,
        published_only=published_only
    )

    total = get_articles_count(
        db=db,
        search=search,
        author=author,
        status=status,
        tags=tags,
        published_only=published_only
    )

    pages = (total + limit - 1) // limit  # Ceiling division
    page = (skip // limit) + 1

    return ArticleList(
        items=articles,
        total=total,
        page=page,
        size=limit,
        pages=pages
    )

@router.get("/{article_id}", response_model=Article)
def read_article(article_id: int, db: Session = Depends(get_db)):
    """Get a specific article by ID"""
    db_article = get_article(db, article_id=article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.get("/slug/{slug}", response_model=Article)
def read_article_by_slug(slug: str, db: Session = Depends(get_db)):
    """Get a specific article by slug"""
    db_article = get_article_by_slug(db, slug=slug)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.put("/{article_id}", response_model=Article)
def update_existing_article(
    article_id: int,
    article: ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Update an article completely"""
    db_article = update_article(db, article_id=article_id, article_update=article)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.patch("/{article_id}", response_model=Article)
def partial_update_article(
    article_id: int,
    article: ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Update an article partially"""
    db_article = update_article(db, article_id=article_id, article_update=article)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_article(article_id: int, db: Session = Depends(get_db)):
    """Delete an article"""
    success = delete_article(db, article_id=article_id)
    if not success:
        raise HTTPException(status_code=404, detail="Article not found")
    return None

@router.post("/{article_id}/publish", response_model=Article)
def publish_article(article_id: int, db: Session = Depends(get_db)):
    """Publish an article"""
    article_update = ArticleUpdate(status=ArticleStatus.PUBLISHED)
    db_article = update_article(db, article_id=article_id, article_update=article_update)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

@router.post("/{article_id}/archive", response_model=Article)
def archive_article(article_id: int, db: Session = Depends(get_db)):
    """Archive an article"""
    article_update = ArticleUpdate(status=ArticleStatus.ARCHIVED)
    db_article = update_article(db, article_id=article_id, article_update=article_update)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article
```

#### Step 7: Main Application

**app/main.py:**
```python
from fastapi import FastAPI
from .database import create_tables
from .routes.articles import router as articles_router

# Create database tables
create_tables()

app = FastAPI(
    title="Articles API",
    description="A comprehensive CRUD API for managing articles",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include routers
app.include_router(articles_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "articles-api"}
```

### Part 4: Testing

#### Step 8: Comprehensive Tests

**tests/conftest.py:**
```python
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.main import app
from app.database import Base, get_db

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

@pytest.fixture(scope="module")
def client():
    return TestClient(app)
```

**tests/test_articles.py:**
```python
from fastapi.testclient import TestClient
import pytest

def test_create_article(client, test_db):
    """Test creating a new article"""
    article_data = {
        "title": "Test Article",
        "content": "This is a test article content that is long enough.",
        "author": "Test Author",
        "tags": ["test", "article"]
    }

    response = client.post("/articles/", json=article_data)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Test Article"
    assert data["author"] == "Test Author"
    assert data["status"] == "draft"
    assert len(data["tags"]) == 2
    assert "id" in data
    assert "slug" in data
    assert "created_at" in data

def test_get_articles(client, test_db):
    """Test getting list of articles"""
    # Create test articles
    articles = [
        {
            "title": "First Article",
            "content": "Content for first article.",
            "author": "Author 1"
        },
        {
            "title": "Second Article",
            "content": "Content for second article.",
            "author": "Author 2"
        }
    ]

    for article in articles:
        client.post("/articles/", json=article)

    response = client.get("/articles/")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["size"] == 10

def test_get_article_by_id(client, test_db):
    """Test getting a specific article"""
    # Create article
    article_data = {
        "title": "Specific Article",
        "content": "Content for specific article.",
        "author": "Test Author"
    }

    create_response = client.post("/articles/", json=article_data)
    article_id = create_response.json()["id"]

    # Get article
    response = client.get(f"/articles/{article_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == article_id
    assert data["title"] == "Specific Article"

def test_get_article_not_found(client, test_db):
    """Test getting non-existent article"""
    response = client.get("/articles/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Article not found"

def test_update_article(client, test_db):
    """Test updating an article"""
    # Create article
    article_data = {
        "title": "Original Title",
        "content": "Original content.",
        "author": "Original Author"
    }

    create_response = client.post("/articles/", json=article_data)
    article_id = create_response.json()["id"]

    # Update article
    update_data = {
        "title": "Updated Title",
        "content": "Updated content.",
        "author": "Updated Author"
    }

    response = client.put(f"/articles/{article_id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["author"] == "Updated Author"

def test_partial_update_article(client, test_db):
    """Test partial update of an article"""
    # Create article
    article_data = {
        "title": "Partial Update Test",
        "content": "Original content.",
        "author": "Original Author"
    }

    create_response = client.post("/articles/", json=article_data)
    article_id = create_response.json()["id"]

    # Partial update
    update_data = {"title": "Partially Updated Title"}

    response = client.patch(f"/articles/{article_id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Partially Updated Title"
    assert data["content"] == "Original content."  # Unchanged

def test_delete_article(client, test_db):
    """Test deleting an article"""
    # Create article
    article_data = {
        "title": "Article to Delete",
        "content": "This article will be deleted.",
        "author": "Test Author"
    }

    create_response = client.post("/articles/", json=article_data)
    article_id = create_response.json()["id"]

    # Delete article
    response = client.delete(f"/articles/{article_id}")
    assert response.status_code == 204

    # Verify deletion
    response = client.get(f"/articles/{article_id}")
    assert response.status_code == 404

def test_publish_article(client, test_db):
    """Test publishing an article"""
    # Create draft article
    article_data = {
        "title": "Draft Article",
        "content": "This is a draft article.",
        "author": "Test Author"
    }

    create_response = client.post("/articles/", json=article_data)
    article_id = create_response.json()["id"]

    # Publish article
    response = client.post(f"/articles/{article_id}/publish")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "published"
    assert data["published"] == True
    assert "published_at" in data

def test_search_articles(client, test_db):
    """Test searching articles"""
    # Create test articles
    articles = [
        {
            "title": "Python Tutorial",
            "content": "Learn Python programming.",
            "author": "Python Expert"
        },
        {
            "title": "JavaScript Guide",
            "content": "Master JavaScript development.",
            "author": "JS Developer"
        },
        {
            "title": "FastAPI Basics",
            "content": "Introduction to FastAPI framework.",
            "author": "API Expert"
        }
    ]

    for article in articles:
        client.post("/articles/", json=article)

    # Search by title
    response = client.get("/articles/?search=FastAPI")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "FastAPI Basics"

    # Search by author
    response = client.get("/articles/?author=Expert")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2

def test_filter_by_tags(client, test_db):
    """Test filtering articles by tags"""
    # Create articles with tags
    articles = [
        {
            "title": "Python Article",
            "content": "About Python.",
            "author": "Author 1",
            "tags": ["python", "programming"]
        },
        {
            "title": "Web Article",
            "content": "About web development.",
            "author": "Author 2",
            "tags": ["web", "javascript"]
        }
    ]

    for article in articles:
        client.post("/articles/", json=article)

    # Filter by tag
    response = client.get("/articles/?tags=python")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Python Article"

def test_pagination(client, test_db):
    """Test pagination"""
    # Create multiple articles
    for i in range(15):
        article_data = {
            "title": f"Article {i+1}",
            "content": f"Content for article {i+1}.",
            "author": "Test Author"
        }
        client.post("/articles/", json=article_data)

    # Get first page
    response = client.get("/articles/?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["total"] == 15
    assert data["page"] == 1
    assert data["pages"] == 3

    # Get second page
    response = client.get("/articles/?skip=5&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["page"] == 2

def test_slug_generation(client, test_db):
    """Test automatic slug generation"""
    article_data = {
        "title": "My Awesome Article!",
        "content": "Content for the article.",
        "author": "Test Author"
    }

    response = client.post("/articles/", json=article_data)
    assert response.status_code == 201

    data = response.json()
    assert data["slug"] == "my-awesome-article"

def test_validation_errors(client, test_db):
    """Test validation error handling"""
    # Empty title
    article_data = {
        "title": "",
        "content": "Valid content.",
        "author": "Test Author"
    }

    response = client.post("/articles/", json=article_data)
    assert response.status_code == 422

    # Too short content
    article_data = {
        "title": "Valid Title",
        "content": "Short",
        "author": "Test Author"
    }

    response = client.post("/articles/", json=article_data)
    assert response.status_code == 422
```

## Running the Application

```bash
# Create tables
python -c "from app.database import create_tables; create_tables()"

# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v --cov=app --cov-report=html
```

## API Testing Examples

```bash
# Create an article
curl -X POST "http://localhost:8000/articles/" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "My First Article",
       "content": "This is the content of my first article. It needs to be long enough for validation.",
       "author": "John Doe",
       "tags": ["tutorial", "fastapi"]
     }'

# Get all articles
curl "http://localhost:8000/articles/"

# Search articles
curl "http://localhost:8000/articles/?search=FastAPI"

# Get article by ID
curl "http://localhost:8000/articles/1"

# Update article
curl -X PUT "http://localhost:8000/articles/1" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Updated Article Title",
       "content": "Updated content for the article.",
       "author": "John Doe"
     }'

# Publish article
curl -X POST "http://localhost:8000/articles/1/publish"

# Delete article
curl -X DELETE "http://localhost:8000/articles/1"
```

## Challenge Exercises

### Challenge 1: Add Comments System
1. Create comment models and CRUD operations
2. Associate comments with articles
3. Add nested comment replies
4. Implement comment moderation

### Challenge 2: Add User Authentication
1. Create user authentication system
2. Add JWT token-based authorization
3. Implement article ownership
4. Add role-based permissions

### Challenge 3: Add File Uploads
1. Implement image upload for articles
2. Add file validation and storage
3. Create image resizing and optimization
4. Add CDN integration

## Verification Checklist

### CRUD Operations
- [ ] Create articles with validation
- [ ] Read articles (single and list)
- [ ] Update articles (full and partial)
- [ ] Delete articles
- [ ] Proper HTTP status codes

### Advanced Features
- [ ] Search and filtering working
- [ ] Pagination implemented
- [ ] Tag system functional
- [ ] Slug generation working
- [ ] Status management (draft/published/archived)

### Testing
- [ ] Unit tests for CRUD operations
- [ ] Integration tests for API endpoints
- [ ] Validation error testing
- [ ] Edge cases covered
- [ ] Test coverage > 80%

### Documentation
- [ ] API documentation accessible
- [ ] Interactive docs working
- [ ] Request/response examples provided
- [ ] Error responses documented

## Troubleshooting

### Common Issues

**Database connection errors:**
- Check DATABASE_URL environment variable
- Ensure database file exists and is writable
- Verify SQLAlchemy version compatibility

**Validation errors:**
- Check Pydantic model field definitions
- Verify request JSON structure
- Look at FastAPI error responses for details

**Test failures:**
- Ensure test database is properly cleaned up
- Check fixture dependencies
- Verify test data creation

**Performance issues:**
- Add database indexes for frequently queried fields
- Implement caching for read operations
- Use pagination for large result sets

## Next Steps
- [Testing and Documentation Workshop](../workshops/workshop-04-testing-documentation.md)

## Additional Resources
- [SQLAlchemy Documentation](https://sqlalchemy.org/)
- [FastAPI with SQLAlchemy](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [Pydantic with ORM](https://pydantic-docs.helpmanual.io/usage/models/#orm-mode-aka-arbitrary-class-instances)
- [REST API Design Guidelines](https://restfulapi.net/)

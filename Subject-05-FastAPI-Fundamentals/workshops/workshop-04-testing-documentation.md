# Workshop 04: Testing and API Documentation

## Overview
This workshop covers comprehensive testing strategies and API documentation for FastAPI applications. You'll learn to write unit tests, integration tests, and ensure your API is properly documented for both developers and automated tools.

## Prerequisites
- Completed [CRUD Articles Workshop](../workshops/workshop-03-crud-articles.md)
- Understanding of FastAPI, Pydantic, and basic testing concepts

## Learning Objectives
By the end of this workshop, you will be able to:
- Write comprehensive unit and integration tests
- Implement test fixtures and mocking
- Generate and customize API documentation
- Set up CI/CD pipelines with automated testing
- Write testable code following best practices

## Workshop Structure

### Part 1: Testing Fundamentals

#### Step 1: Testing Setup

Create a comprehensive testing environment for the articles API:

```bash
mkdir testing-documentation-workshop
cd testing-documentation-workshop
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

uv add fastapi uvicorn sqlalchemy pydantic[email] alembic
uv add pytest pytest-asyncio pytest-cov httpx pytest-mock factory-boy faker

# Copy the articles API from previous workshop
# (Assume we have the complete articles API from workshop 3)
```

#### Step 2: Test Configuration

**tests/__init__.py:**
```python
# Test package
```

**tests/conftest.py:**
```python
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.main import app
from app.database import Base, get_db

# Test database
TEST_DATABASE_URL = "sqlite:///./test.db"
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
    """Create and drop test database tables for each test"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client():
    """Test client fixture"""
    return TestClient(app)

@pytest.fixture(scope="function")
def db_session(test_db):
    """Database session fixture"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Step 3: Test Data Factories

**tests/factories.py:**
```python
import factory
from factory import Faker
from sqlalchemy.orm import Session
from app.models.article import Article, Tag
from app.schemas.article import ArticleCreate, ArticleStatus

class TagFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Tag
        sqlalchemy_session = None  # Will be set in fixture

    name = Faker('word')
    color = Faker('hex_color')

class ArticleFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Article
        sqlalchemy_session = None  # Will be set in fixture

    title = Faker('sentence', nb_words=4)
    slug = Faker('slug')
    content = Faker('paragraph', nb_sentences=3)
    excerpt = Faker('sentence')
    author = Faker('name')
    status = ArticleStatus.DRAFT

def create_test_article(db: Session, **kwargs) -> Article:
    """Helper function to create test articles"""
    ArticleFactory._meta.sqlalchemy_session = db
    return ArticleFactory(**kwargs)

def create_test_tag(db: Session, **kwargs) -> Tag:
    """Helper function to create test tags"""
    TagFactory._meta.sqlalchemy_session = db
    return TagFactory(**kwargs)

def create_multiple_articles(db: Session, count: int = 5) -> list[Article]:
    """Create multiple test articles"""
    ArticleFactory._meta.sqlalchemy_session = db
    return ArticleFactory.create_batch(count)
```

### Part 2: Unit Testing

#### Step 4: Unit Tests for Models

**tests/test_models.py:**
```python
import pytest
from pydantic import ValidationError
from app.schemas.article import ArticleCreate, ArticleUpdate, ArticleStatus

class TestArticleCreate:
    def test_valid_article_creation(self):
        """Test creating an article with valid data"""
        article_data = {
            "title": "Test Article",
            "content": "This is test content that is long enough for validation.",
            "author": "Test Author"
        }

        article = ArticleCreate(**article_data)
        assert article.title == "Test Article"
        assert article.content == "This is test content that is long enough for validation."
        assert article.author == "Test Author"
        assert article.status == ArticleStatus.DRAFT

    def test_article_title_validation(self):
        """Test title validation rules"""
        # Valid title
        article = ArticleCreate(title="Valid Title", content="Valid content", author="Author")
        assert article.title == "Valid Title"

        # Empty title should fail
        with pytest.raises(ValidationError):
            ArticleCreate(title="", content="Valid content", author="Author")

        # Title too long should fail
        long_title = "A" * 201
        with pytest.raises(ValidationError):
            ArticleCreate(title=long_title, content="Valid content", author="Author")

    def test_article_content_validation(self):
        """Test content validation rules"""
        # Valid content
        article = ArticleCreate(
            title="Test",
            content="This is valid content that meets the minimum length requirement.",
            author="Author"
        )
        assert len(article.content) >= 10

        # Content too short should fail
        with pytest.raises(ValidationError):
            ArticleCreate(title="Test", content="Short", author="Author")

    def test_article_tags_validation(self):
        """Test tags validation"""
        # Valid tags
        article = ArticleCreate(
            title="Test",
            content="Valid content",
            author="Author",
            tags=["python", "fastapi", "testing"]
        )
        assert len(article.tags) == 3

        # Duplicate tags should be cleaned
        article = ArticleCreate(
            title="Test",
            content="Valid content",
            author="Author",
            tags=["python", "python", "fastapi"]
        )
        assert article.tags == ["python", "fastapi"]  # Duplicates removed

        # Too many tags should fail
        too_many_tags = [f"tag{i}" for i in range(15)]
        with pytest.raises(ValidationError):
            ArticleCreate(
                title="Test",
                content="Valid content",
                author="Author",
                tags=too_many_tags
            )

class TestArticleUpdate:
    def test_partial_update(self):
        """Test partial update validation"""
        # Update only title
        update = ArticleUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.content is None
        assert update.author is None

        # Update multiple fields
        update = ArticleUpdate(
            title="New Title",
            status=ArticleStatus.PUBLISHED
        )
        assert update.title == "New Title"
        assert update.status == ArticleStatus.PUBLISHED
```

#### Step 5: Unit Tests for CRUD Operations

**tests/test_crud.py:**
```python
import pytest
from sqlalchemy.orm import Session
from app.crud.article import (
    create_article, get_article, get_articles,
    update_article, delete_article, generate_slug
)
from app.schemas.article import ArticleCreate, ArticleUpdate, ArticleStatus
from tests.factories import create_test_article

class TestCreateArticle:
    def test_create_basic_article(self, db_session):
        """Test creating a basic article"""
        article_data = ArticleCreate(
            title="Test Article",
            content="This is test content",
            author="Test Author"
        )

        article = create_article(db_session, article_data)

        assert article.title == "Test Article"
        assert article.content == "This is test content"
        assert article.author == "Test Author"
        assert article.status == ArticleStatus.DRAFT
        assert article.slug == "test-article"
        assert article.id is not None

    def test_create_article_with_tags(self, db_session):
        """Test creating an article with tags"""
        article_data = ArticleCreate(
            title="Tagged Article",
            content="Content with tags",
            author="Author",
            tags=["python", "fastapi"]
        )

        article = create_article(db_session, article_data)

        assert len(article.tags) == 2
        tag_names = [tag.tag.name for tag in article.tags]
        assert "python" in tag_names
        assert "fastapi" in tag_names

    def test_slug_uniqueness(self, db_session):
        """Test that slugs are made unique"""
        # Create first article
        article1_data = ArticleCreate(
            title="Same Title",
            content="Content 1",
            author="Author"
        )
        article1 = create_article(db_session, article1_data)
        assert article1.slug == "same-title"

        # Create second article with same title
        article2_data = ArticleCreate(
            title="Same Title",
            content="Content 2",
            author="Author"
        )
        article2 = create_article(db_session, article2_data)
        assert article2.slug == "same-title-1"

class TestReadArticle:
    def test_get_existing_article(self, db_session):
        """Test getting an existing article"""
        article = create_test_article(db_session, title="Test Article")

        retrieved = get_article(db_session, article.id)

        assert retrieved is not None
        assert retrieved.id == article.id
        assert retrieved.title == "Test Article"

    def test_get_nonexistent_article(self, db_session):
        """Test getting a non-existent article"""
        retrieved = get_article(db_session, 999)

        assert retrieved is None

    def test_get_articles_with_filters(self, db_session):
        """Test getting articles with filters"""
        # Create test articles
        create_test_article(db_session, title="Python Article", author="Alice")
        create_test_article(db_session, title="FastAPI Article", author="Bob")
        create_test_article(db_session, title="Testing Article", author="Alice")

        # Test search
        articles = get_articles(db_session, search="Python")
        assert len(articles) == 1
        assert articles[0].title == "Python Article"

        # Test author filter
        articles = get_articles(db_session, author="Alice")
        assert len(articles) == 2

        # Test pagination
        articles = get_articles(db_session, skip=1, limit=1)
        assert len(articles) == 1

class TestUpdateArticle:
    def test_update_article_title(self, db_session):
        """Test updating article title and slug"""
        article = create_test_article(db_session, title="Original Title")

        update_data = ArticleUpdate(title="Updated Title")
        updated = update_article(db_session, article.id, update_data)

        assert updated.title == "Updated Title"
        assert updated.slug == "updated-title"

    def test_update_article_status(self, db_session):
        """Test updating article status"""
        article = create_test_article(db_session, status=ArticleStatus.DRAFT)

        update_data = ArticleUpdate(status=ArticleStatus.PUBLISHED)
        updated = update_article(db_session, article.id, update_data)

        assert updated.status == ArticleStatus.PUBLISHED
        assert updated.published == True
        assert updated.published_at is not None

    def test_update_nonexistent_article(self, db_session):
        """Test updating a non-existent article"""
        update_data = ArticleUpdate(title="New Title")
        result = update_article(db_session, 999, update_data)

        assert result is None

class TestDeleteArticle:
    def test_delete_existing_article(self, db_session):
        """Test deleting an existing article"""
        article = create_test_article(db_session)

        result = delete_article(db_session, article.id)
        assert result is True

        # Verify deletion
        retrieved = get_article(db_session, article.id)
        assert retrieved is None

    def test_delete_nonexistent_article(self, db_session):
        """Test deleting a non-existent article"""
        result = delete_article(db_session, 999)
        assert result is False

class TestSlugGeneration:
    def test_slug_generation(self):
        """Test slug generation from titles"""
        assert generate_slug("Hello World") == "hello-world"
        assert generate_slug("FastAPI & Python!") == "fastapi-python"
        assert generate_slug("  Multiple   Spaces  ") == "multiple-spaces"
        assert generate_slug("Special@#$%Characters") == "specialcharacters"
```

### Part 3: Integration Testing

#### Step 6: API Integration Tests

**tests/test_api.py:**
```python
import pytest
from fastapi.testclient import TestClient
from tests.factories import create_test_article

class TestArticleAPI:
    def test_create_article_endpoint(self, client, test_db):
        """Test creating an article via API"""
        article_data = {
            "title": "API Test Article",
            "content": "This is content for API testing that meets the minimum length requirement.",
            "author": "API Tester",
            "tags": ["api", "test"]
        }

        response = client.post("/articles/", json=article_data)

        assert response.status_code == 201
        data = response.json()

        assert data["title"] == "API Test Article"
        assert data["author"] == "API Tester"
        assert data["status"] == "draft"
        assert len(data["tags"]) == 2
        assert "id" in data
        assert "created_at" in data

    def test_get_articles_list(self, client, test_db, db_session):
        """Test getting list of articles"""
        # Create test articles
        create_test_article(db_session, title="Article 1")
        create_test_article(db_session, title="Article 2")
        create_test_article(db_session, title="Article 3")

        response = client.get("/articles/")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["page"] == 1

    def test_get_article_by_id(self, client, test_db, db_session):
        """Test getting a specific article"""
        article = create_test_article(db_session, title="Specific Article")

        response = client.get(f"/articles/{article.id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == article.id
        assert data["title"] == "Specific Article"

    def test_get_nonexistent_article(self, client, test_db):
        """Test getting a non-existent article"""
        response = client.get("/articles/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Article not found"

    def test_update_article(self, client, test_db, db_session):
        """Test updating an article"""
        article = create_test_article(db_session, title="Original Title")

        update_data = {
            "title": "Updated Title",
            "content": "Updated content that is long enough.",
            "author": "Updated Author"
        }

        response = client.put(f"/articles/{article.id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["author"] == "Updated Author"

    def test_partial_update_article(self, client, test_db, db_session):
        """Test partial update of an article"""
        article = create_test_article(db_session, title="Original", author="Original Author")

        update_data = {"title": "Partially Updated"}

        response = client.patch(f"/articles/{article.id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["title"] == "Partially Updated"
        assert data["author"] == "Original Author"  # Unchanged

    def test_delete_article(self, client, test_db, db_session):
        """Test deleting an article"""
        article = create_test_article(db_session)

        response = client.delete(f"/articles/{article.id}")
        assert response.status_code == 204

        # Verify deletion
        response = client.get(f"/articles/{article.id}")
        assert response.status_code == 404

    def test_publish_article(self, client, test_db, db_session):
        """Test publishing an article"""
        article = create_test_article(db_session, status="draft")

        response = client.post(f"/articles/{article.id}/publish")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "published"
        assert data["published"] == True

    def test_search_articles(self, client, test_db, db_session):
        """Test searching articles"""
        create_test_article(db_session, title="Python Tutorial", content="Learn Python")
        create_test_article(db_session, title="FastAPI Guide", content="Learn FastAPI")
        create_test_article(db_session, title="JavaScript Basics", content="Learn JS")

        response = client.get("/articles/?search=FastAPI")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "FastAPI Guide"

    def test_filter_by_status(self, client, test_db, db_session):
        """Test filtering by status"""
        create_test_article(db_session, title="Draft Article", status="draft")
        create_test_article(db_session, title="Published Article", status="published")

        response = client.get("/articles/?status=published")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Published Article"

    def test_pagination(self, client, test_db, db_session):
        """Test pagination"""
        # Create 15 articles
        for i in range(15):
            create_test_article(db_session, title=f"Article {i+1}")

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

    def test_validation_errors(self, client, test_db):
        """Test validation error responses"""
        # Invalid title (empty)
        invalid_data = {
            "title": "",
            "content": "Valid content",
            "author": "Valid Author"
        }

        response = client.post("/articles/", json=invalid_data)
        assert response.status_code == 422

        errors = response.json()["detail"]
        assert len(errors) > 0
        assert any(error["field"] == "title" for error in errors)

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
```

### Part 4: API Documentation

#### Step 7: Enhanced Documentation

**app/main.py (continued):**
```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from app.routes.articles import router as articles_router

app = FastAPI(
    title="Articles Management API",
    description="""
    A comprehensive REST API for managing articles with full CRUD operations.

    ## Features

    * **Article Management**: Create, read, update, and delete articles
    * **Search & Filtering**: Search articles by title, content, author, or tags
    * **Pagination**: Efficient pagination for large result sets
    * **Tagging System**: Organize articles with tags
    * **Publishing Workflow**: Draft, published, and archived article states
    * **Automatic Documentation**: Interactive API docs with examples

    ## Getting Started

    1. Create an article: `POST /articles/`
    2. List articles: `GET /articles/`
    3. Get specific article: `GET /articles/{id}`
    4. Update article: `PUT /articles/{id}`
    5. Delete article: `DELETE /articles/{id}`

    ## Authentication

    Currently, this API doesn't require authentication. In production, consider adding:
    - JWT token authentication
    - API key authentication
    - OAuth2 integration
    """,
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        },
        "apiKey": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
        }
    }

    # Add global security (commented out for now)
    # openapi_schema["security"] = [{"bearerAuth": []}]

    # Add logo and branding
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Include routers
app.include_router(articles_router)

@app.get("/health", summary="Health Check", description="Check if the API is running")
async def health_check():
    """
    Health check endpoint to verify API status.

    Returns:
        dict: Status information including service name
    """
    return {"status": "healthy", "service": "articles-api"}
```

#### Step 8: Route Documentation

**app/routes/articles.py (enhanced):**
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.crud.article import (
    create_article, get_article, get_article_by_slug, get_articles,
    get_articles_count, update_article, delete_article
)
from app.schemas.article import (
    Article, ArticleCreate, ArticleUpdate, ArticleList,
    ArticleStatus, ArticleSearch
)

router = APIRouter(
    prefix="/articles",
    tags=["articles"],
    responses={
        404: {"description": "Article not found"},
        422: {"description": "Validation error"}
    }
)

@router.post(
    "/",
    response_model=Article,
    status_code=status.HTTP_201_CREATED,
    summary="Create Article",
    description="Create a new article with the provided data.",
    response_description="The created article"
)
async def create_new_article(
    article: ArticleCreate = ...,
    db: Session = Depends(get_db)
):
    """
    Create a new article.

    - **title**: Article title (1-200 characters)
    - **content**: Article content (minimum 10 characters)
    - **author**: Article author name
    - **excerpt**: Optional article excerpt (max 300 characters)
    - **tags**: List of tags (max 10, unique values)
    """
    return create_article(db=db, article=article)

@router.get(
    "/",
    response_model=ArticleList,
    summary="List Articles",
    description="Get a paginated list of articles with optional filtering and search."
)
async def read_articles(
    skip: int = Query(0, ge=0, description="Number of articles to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of articles to return"),
    search: Optional[str] = Query(None, description="Search query for title, content, or excerpt"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    status: Optional[ArticleStatus] = Query(None, description="Filter by article status"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    published_only: bool = Query(False, description="Show only published articles"),
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of articles with advanced filtering options.

    You can filter by:
    - **search**: Text search across title, content, and excerpt
    - **author**: Exact author name match
    - **status**: Article status (draft, published, archived)
    - **tags**: Articles containing any of the specified tags
    - **published_only**: Show only published articles
    """
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

@router.get(
    "/{article_id}",
    response_model=Article,
    summary="Get Article",
    description="Get a specific article by its ID.",
    responses={
        200: {
            "description": "Article found",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Sample Article",
                        "content": "Article content...",
                        "author": "John Doe",
                        "status": "published",
                        "published": True,
                        "tags": [{"id": 1, "name": "tutorial", "slug": "tutorial"}],
                        "created_at": "2023-12-01T10:00:00",
                        "updated_at": "2023-12-01T10:00:00"
                    }
                }
            }
        }
    }
)
async def read_article(article_id: int, db: Session = Depends(get_db)):
    """Get a specific article by ID."""
    db_article = get_article(db, article_id=article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article

# ... (similar documentation for other endpoints)
```

### Part 5: CI/CD and Test Automation

#### Step 9: GitHub Actions CI/CD

**.github/workflows/ci.yml:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, "3.10", "3.11"]

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}

    - name: Install dependencies
      run: |
        python -m uv add --upgrade pip
        uv add -r requirements.txt
        uv add pytest pytest-cov

    - name: Run tests
      run: |
        pytest --cov=app --cov-report=xml --cov-report=term-missing

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml

  lint:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: "3.11"

    - name: Install linting tools
      run: |
        uv add black flake8 isort

    - name: Run linters
      run: |
        black --check app tests
        isort --check-only app tests
        flake8 app tests

  docs:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: "3.11"

    - name: Install dependencies
      run: |
        uv add -r requirements.txt

    - name: Generate API docs
      run: |
        # Test that docs are accessible
        python -c "
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)
        response = client.get('/docs')
        assert response.status_code == 200
        response = client.get('/openapi.json')
        assert response.status_code == 200
        print('API documentation is accessible')
        "
```

#### Step 10: Coverage Configuration

**setup.cfg:**
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --cov=app --cov-report=html --cov-report=term-missing

[coverage:run]
source = app
omit =
    */uv/*
    */__pycache__/*
    */tests/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    class .*\bProtocol\):

[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = uv, __pycache__, .pytest_cache

[isort]
profile = black
multi_line_output = 3
line_length = 88
```

## Running Tests and Documentation

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py

# Run specific test
pytest tests/test_api.py::TestArticleAPI::test_create_article_endpoint

# Open coverage report
open htmlcov/index.html

# Run linters
black app tests
isort app tests
flake8 app tests

# Start server and check docs
uvicorn app.main:app --reload

# Visit documentation
# http://localhost:8000/docs
# http://localhost:8000/redoc
# http://localhost:8000/openapi.json
```

## Challenge Exercises

### Challenge 1: Add Test Fixtures
1. Create comprehensive test data fixtures
2. Implement database seeding for tests
3. Add performance testing fixtures
4. Create API response mocking

### Challenge 2: API Versioning
1. Implement API versioning strategy
2. Add version headers and URL prefixes
3. Create migration tests between versions
4. Document breaking changes

### Challenge 3: Load Testing
1. Implement load testing with Locust
2. Add performance monitoring
3. Create stress test scenarios
4. Analyze performance bottlenecks

## Verification Checklist

### Testing
- [ ] Unit tests for all models and functions
- [ ] Integration tests for API endpoints
- [ ] Test fixtures and factories implemented
- [ ] Test coverage > 80%
- [ ] CI/CD pipeline configured
- [ ] Linting and formatting automated

### Documentation
- [ ] OpenAPI schema properly configured
- [ ] Interactive docs accessible
- [ ] Request/response examples provided
- [ ] Error responses documented
- [ ] API versioning considered

### Quality Assurance
- [ ] Code formatting consistent
- [ ] Type hints used throughout
- [ ] Error handling comprehensive
- [ ] Security considerations addressed
- [ ] Performance tested

## Troubleshooting

### Test Issues

**Test database conflicts:**
```bash
# Ensure proper fixture cleanup
@pytest.fixture(scope="function", autouse=True)
def clean_db(test_db):
    # Clean up code here
    yield
    # More cleanup if needed
```

**Async test issues:**
```python
# Use pytest-asyncio for async tests
@pytest.mark.asyncio
async def test_async_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/endpoint")
        assert response.status_code == 200
```

**Mocking dependencies:**
```python
from unittest.mock import Mock, patch

def test_with_mock(client, test_db):
    with patch('app.crud.article.get_article') as mock_get:
        mock_get.return_value = Mock(id=1, title="Mocked Article")
        response = client.get("/articles/1")
        assert response.status_code == 200
```

### Documentation Issues

**Missing examples:**
```python
# Add examples to Pydantic models
class ArticleCreate(BaseModel):
    title: str = Field(..., example="My Article Title")
    content: str = Field(..., example="Article content here...")
```

**Custom responses:**
```python
from fastapi.responses import JSONResponse

@app.get("/custom")
def custom_response():
    return JSONResponse(
        content={"message": "Custom response"},
        status_code=200,
        headers={"X-Custom-Header": "value"}
    )
```

## Next Steps
Congratulations! You have completed the FastAPI Fundamentals curriculum. You now have:
- A solid understanding of FastAPI concepts
- Experience building RESTful APIs
- Comprehensive testing skills
- Professional documentation practices

## Additional Resources
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Pytest Documentation](https://docs.pytest.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [API Documentation Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)

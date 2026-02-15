# Workshop 6: FastAPI + Uvicorn Complete Project with UV

## 🎯 Objective
Create a complete FastAPI application using UV for dependency management and run it with Uvicorn.

## 📋 Prerequisites
- UV installed and working
- Completed previous workshops
- Basic FastAPI knowledge (helpful but not required)

## 📚 Session Overview
**Duration**: 60-90 minutes
**Focus**: Building a complete web application with modern tooling

---

## 🛠️ Step-by-Step: Complete FastAPI Application

### Step 1: Create UV Project
```bash
# Create new project
uv init fastapi-todo-app
cd fastapi-todo-app

# Check initial structure
ls -la
cat pyproject.toml
```

### Step 2: Add Dependencies
```bash
# Add core web framework
uv add fastapi uvicorn

# Add data validation and serialization
uv add pydantic

# Add development tools
uv add --dev pytest httpx black ruff mypy pytest-asyncio

# Check dependencies
uv tree
```

### Step 3: Create Application Structure
```bash
# Create additional directories
mkdir -p src/fastapi_todo_app/{models,routers,services,tests}

# Create __init__.py files
touch src/fastapi_todo_app/__init__.py
touch src/fastapi_todo_app/models/__init__.py
touch src/fastapi_todo_app/routers/__init__.py
touch src/fastapi_todo_app/services/__init__.py
```

### Step 4: Create Pydantic Models
```bash
# File: src/fastapi_todo_app/models/todo.py

cat > src/fastapi_todo_app/models/todo.py << 'EOF'
"""Todo item models."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4

class TodoBase(BaseModel):
    """Base todo model."""
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    completed: bool = False

class TodoCreate(TodoBase):
    """Model for creating todos."""
    pass

class TodoUpdate(BaseModel):
    """Model for updating todos."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    completed: Optional[bool] = None

class Todo(TodoBase):
    """Complete todo model."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True
EOF
```

### Step 5: Create Todo Service
```bash
# File: src/fastapi_todo_app/services/todo_service.py

cat > src/fastapi_todo_app/services/todo_service.py << 'EOF'
"""Todo service for business logic."""

from typing import List, Optional
from uuid import UUID
from ..models.todo import Todo, TodoCreate, TodoUpdate

class TodoService:
    """Service for managing todos."""
    
    def __init__(self):
        """Initialize with empty todo list."""
        self.todos: List[Todo] = []
    
    def get_all_todos(self) -> List[Todo]:
        """Get all todos."""
        return self.todos
    
    def get_todo_by_id(self, todo_id: UUID) -> Optional[Todo]:
        """Get todo by ID."""
        return next((todo for todo in self.todos if todo.id == todo_id), None)
    
    def create_todo(self, todo_data: TodoCreate) -> Todo:
        """Create a new todo."""
        todo = Todo(**todo_data.model_dump())
        self.todos.append(todo)
        return todo
    
    def update_todo(self, todo_id: UUID, update_data: TodoUpdate) -> Optional[Todo]:
        """Update an existing todo."""
        todo = self.get_todo_by_id(todo_id)
        if not todo:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(todo, field, value)
        todo.updated_at = datetime.now()
        return todo
    
    def delete_todo(self, todo_id: UUID) -> bool:
        """Delete a todo by ID."""
        todo = self.get_todo_by_id(todo_id)
        if todo:
            self.todos.remove(todo)
            return True
        return False

# Global service instance (in production, use dependency injection)
todo_service = TodoService()
EOF
```

### Step 6: Create API Router
```bash
# File: src/fastapi_todo_app/routers/todos.py

cat > src/fastapi_todo_app/routers/todos.py << 'EOF'
"""Todo API router."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from ..models.todo import Todo, TodoCreate, TodoUpdate
from ..services.todo_service import todo_service

router = APIRouter(prefix="/todos", tags=["todos"])

@router.get("/", response_model=List[Todo])
def get_todos():
    """Get all todos."""
    return todo_service.get_all_todos()

@router.get("/{todo_id}", response_model=Todo)
def get_todo(todo_id: UUID):
    """Get a specific todo by ID."""
    todo = todo_service.get_todo_by_id(todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    return todo

@router.post("/", response_model=Todo, status_code=status.HTTP_201_CREATED)
def create_todo(todo: TodoCreate):
    """Create a new todo."""
    return todo_service.create_todo(todo)

@router.put("/{todo_id}", response_model=Todo)
def update_todo(todo_id: UUID, todo_update: TodoUpdate):
    """Update an existing todo."""
    updated_todo = todo_service.update_todo(todo_id, todo_update)
    if not updated_todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    return updated_todo

@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: UUID):
    """Delete a todo."""
    if not todo_service.delete_todo(todo_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
EOF
```

### Step 7: Create Main Application
```bash
# File: src/fastapi_todo_app/main.py

cat > src/fastapi_todo_app/main.py << 'EOF'
"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.todos import router as todos_router

# Create FastAPI app
app = FastAPI(
    title="FastAPI Todo App",
    description="A simple todo application built with FastAPI and UV",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(todos_router)

@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to FastAPI Todo App",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
EOF
```

### Step 8: Run the Application
```bash
# Start the FastAPI server
uv run uvicorn fastapi_todo_app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, test the API
curl http://localhost:8000/
curl http://localhost:8000/health
curl http://localhost:8000/docs  # Open in browser for interactive docs
```

### Step 9: Test the API with Requests
```bash
# Create a todo
curl -X POST "http://localhost:8000/todos/" \
     -H "Content-Type: application/json" \
     -d '{"title": "Learn UV", "description": "Master UV package manager"}'

# Get all todos
curl http://localhost:8000/todos/

# Update a todo (replace ID with actual ID from response)
curl -X PUT "http://localhost:8000/todos/YOUR-TODO-ID" \
     -H "Content-Type: application/json" \
     -d '{"completed": true}'
```

### Step 10: Create Tests
```bash
# File: tests/test_todos.py

cat > tests/test_todos.py << 'EOF'
"""Tests for todo API."""

import pytest
from fastapi.testclient import TestClient
from fastapi_todo_app.main import app

client = TestClient(app)

def test_create_todo():
    """Test creating a todo."""
    todo_data = {
        "title": "Test Todo",
        "description": "This is a test",
        "completed": False
    }
    
    response = client.post("/todos/", json=todo_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == todo_data["title"]
    assert data["description"] == todo_data["description"]
    assert data["completed"] == todo_data["completed"]
    assert "id" in data

def test_get_todos():
    """Test getting all todos."""
    response = client.get("/todos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_todo_not_found():
    """Test getting non-existent todo."""
    response = client.get("/todos/12345678-1234-5678-9012-123456789012")
    assert response.status_code == 404

def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
EOF
```

### Step 11: Run Tests
```bash
# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=src/fastapi_todo_app --cov-report=html

# Open coverage report in browser
# coverage_html_report/index.html
```

### Step 12: Code Quality Checks
```bash
# Format code
uv run black src/ tests/

# Lint code
uv run ruff check src/ tests/

# Fix auto-fixable issues
uv run ruff check --fix src/ tests/

# Type check
uv run mypy src/fastapi_todo_app/
```

---

## 🔍 Understanding the Complete Application

### Application Structure
```
fastapi-todo-app/
├── pyproject.toml          # Project configuration
├── uv.lock                # Dependency lock file
├── src/
│   └── fastapi_todo_app/
│       ├── main.py        # FastAPI app instance
│       ├── models/
│       │   └── todo.py    # Pydantic models
│       ├── routers/
│       │   └── todos.py   # API endpoints
│       └── services/
│           └── todo_service.py  # Business logic
└── tests/
    └── test_todos.py      # API tests
```

### Key Components

#### 1. Models (Pydantic)
- **Data validation**: Automatic validation of request/response data
- **Type hints**: Better IDE support and documentation
- **Serialization**: Automatic JSON conversion

#### 2. Services (Business Logic)
- **Separation of concerns**: API routes separate from business logic
- **Testability**: Services can be tested independently
- **Reusability**: Logic can be used by multiple endpoints

#### 3. Routers (API Endpoints)
- **RESTful design**: Standard HTTP methods and status codes
- **Error handling**: Proper HTTP exceptions
- **Documentation**: Automatic OpenAPI generation

#### 4. Main Application
- **CORS support**: Cross-origin request handling
- **Router inclusion**: Modular API design
- **Health checks**: Application monitoring

---

## 🚀 Production Deployment

### Step 13: Production Configuration
```bash
# Add production dependencies if needed
uv add gunicorn  # For production ASGI server

# Create production startup script
# File: scripts/start_prod.sh

cat > scripts/start_prod.sh << 'EOF'
#!/bin/bash
# Production startup script

# Set production environment
export APP_ENV=production

# Start with Gunicorn
uv run gunicorn fastapi_todo_app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -
EOF

chmod +x scripts/start_prod.sh
```

### Step 14: Docker Integration (Optional)
```bash
# File: Dockerfile

cat > Dockerfile << 'EOF'
FROM python:3.11-slim

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy project files
COPY . /app
WORKDIR /app

# Install dependencies
RUN uv sync --frozen --no-install-project

# Run the application
CMD ["uv", "run", "uvicorn", "fastapi_todo_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
```

---

## 📋 API Documentation

Once running, visit `http://localhost:8000/docs` to see:

### Available Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /todos/` - List all todos
- `GET /todos/{id}` - Get specific todo
- `POST /todos/` - Create new todo
- `PUT /todos/{id}` - Update todo
- `DELETE /todos/{id}` - Delete todo

### Interactive Testing
- Use the Swagger UI at `/docs` to test endpoints
- Try creating, reading, updating, and deleting todos
- See automatic request/response validation

---

## 🎯 Key Takeaways

### Complete Development Workflow with UV
1. **Project setup**: `uv init` + `uv add`
2. **Code structure**: Organized by concerns (models, routers, services)
3. **Testing**: Comprehensive API tests with pytest
4. **Code quality**: Black, Ruff, MyPy integration
5. **Production ready**: Proper error handling and documentation

### UV Benefits Demonstrated
1. **Fast setup**: Instant environment creation
2. **Dependency management**: Clean separation of concerns
3. **Reproducible builds**: Lock files ensure consistency
4. **Integrated workflow**: Single tool for all operations

### FastAPI + Uvicorn Integration
1. **Automatic documentation**: OpenAPI/Swagger generation
2. **Type safety**: Pydantic models throughout
3. **Async ready**: Built for high performance
4. **Developer experience**: Interactive docs and validation

---

## 🚀 Next Steps

You've built a complete FastAPI application with UV! Next you can:

- Add a database (PostgreSQL with SQLAlchemy)
- Implement authentication (JWT tokens)
- Add background tasks (Celery integration)
- Deploy to production (Docker, cloud platforms)
- Add monitoring (logging, metrics)

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [UV with FastAPI Guide](https://docs.astral.sh/uv/guides/fastapi/)
- [REST API Design Best Practices](https://restfulapi.net/)
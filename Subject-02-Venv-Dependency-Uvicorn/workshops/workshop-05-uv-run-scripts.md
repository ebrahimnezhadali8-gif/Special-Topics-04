# Workshop 5: Running Scripts and Commands with UV

## 🎯 Objective
Learn how to run Python scripts, tests, and development tools using UV's integrated environment management.

## 📋 Prerequisites
- UV installed and working
- Completed Workshop 4 (adding dependencies)
- Basic Python scripting knowledge

## 📚 Session Overview
**Duration**: 45-60 minutes
**Focus**: UV's command execution and development workflow

---

## 🛠️ Step-by-Step: Running with UV

### Step 1: Create Project with Dependencies
```bash
# Create new project
uv init script-runner-demo
cd script-runner-demo

# Add dependencies
uv add requests fastapi uvicorn

# Add development tools
uv add --dev pytest black ruff pytest-asyncio
```

### Step 2: Create Python Scripts
```bash
# Create a simple data fetching script
# File: src/script_runner_demo/fetch_data.py

cat > src/script_runner_demo/fetch_data.py << 'EOF'
#!/usr/bin/env python3
"""Script to fetch data from an API."""

import requests
from datetime import datetime

def fetch_github_user(username: str) -> dict:
    """Fetch GitHub user information."""
    url = f"https://api.github.com/users/{username}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def main():
    """Main function."""
    print("GitHub User Info Fetcher")
    print("=" * 30)
    
    username = input("Enter GitHub username: ")
    try:
        user_data = fetch_github_user(username)
        print(f"Name: {user_data.get('name', 'N/A')}")
        print(f"Bio: {user_data.get('bio', 'N/A')}")
        print(f"Followers: {user_data.get('followers', 0)}")
        print(f"Following: {user_data.get('following', 0)}")
        print(f"Public repos: {user_data.get('public_repos', 0)}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    main()
EOF
```

### Step 3: Run Script with UV
```bash
# Run the script using UV
uv run python src/script_runner_demo/fetch_data.py

# Try with different usernames: octocat, torvalds, etc.
```

### Step 4: Create FastAPI Application
```bash
# Create FastAPI app
# File: src/script_runner_demo/app.py

cat > src/script_runner_demo/app.py << 'EOF'
#!/usr/bin/env python3
"""FastAPI application with basic endpoints."""

from fastapi import FastAPI, HTTPException
import requests

app = FastAPI(title="Script Runner Demo API")

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Welcome to Script Runner Demo API"}

@app.get("/github/{username}")
def get_github_user(username: str):
    """Get GitHub user information."""
    try:
        url = f"https://api.github.com/users/{username}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=404, detail=f"User {username} not found")

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}
EOF
```

### Step 5: Run FastAPI with UV
```bash
# Run FastAPI development server
uv run uvicorn script_runner_demo.app:app --reload --host 0.0.0.0 --port 8000

# In another terminal, test the API
curl http://localhost:8000/
curl http://localhost:8000/github/octocat
curl http://localhost:8000/health
```

### Step 6: Create and Run Tests
```bash
# Create test directory and files
mkdir tests

# Create test for the data fetching function
# File: tests/test_fetch_data.py

cat > tests/test_fetch_data.py << 'EOF'
"""Tests for fetch_data.py."""

import pytest
from unittest.mock import patch, MagicMock
from script_runner_demo.fetch_data import fetch_github_user

def test_fetch_github_user_success():
    """Test successful GitHub API call."""
    mock_response = {
        "login": "octocat",
        "name": "The Octocat",
        "bio": "GitHub mascot",
        "followers": 100,
        "following": 50,
        "public_repos": 25
    }
    
    with patch('requests.get') as mock_get:
        mock_response_obj = MagicMock()
        mock_response_obj.json.return_value = mock_response
        mock_get.return_value = mock_response_obj
        
        result = fetch_github_user("octocat")
        assert result["login"] == "octocat"
        assert result["name"] == "The Octocat"

def test_fetch_github_user_not_found():
    """Test GitHub API call for non-existent user."""
    with patch('requests.get') as mock_get:
        mock_response_obj = MagicMock()
        mock_response_obj.raise_for_status.side_effect = requests.exceptions.HTTPError("404 Not Found")
        mock_get.return_value = mock_response_obj
        
        with pytest.raises(requests.exceptions.HTTPError):
            fetch_github_user("nonexistentuser")
EOF
```

### Step 7: Run Tests with UV
```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/test_fetch_data.py

# Run with coverage
uv run pytest --cov=src/script_runner_demo
```

### Step 8: Code Formatting and Linting
```bash
# Format code with black
uv run black src/ tests/

# Lint code with ruff
uv run ruff check src/ tests/

# Fix auto-fixable issues
uv run ruff check --fix src/ tests/
```

### Step 9: Type Checking
```bash
# Run mypy for type checking
uv run mypy src/script_runner_demo/
```

---

## 🔍 Understanding UV Run

### What happens when you use `uv run`?
1. **Environment check**: Ensures virtual environment exists
2. **Dependency sync**: Installs/updates packages if needed
3. **Environment activation**: Automatically activates venv
4. **Command execution**: Runs command in proper environment
5. **Cleanup**: Environment remains active for subsequent commands

### Benefits of `uv run`
- **No manual activation**: Forget `source venv/bin/activate`
- **Consistent environment**: Same Python and packages every time
- **Dependency assurance**: Fails fast if dependencies missing
- **Cross-platform**: Works identically on Windows, Mac, Linux

---

## 📋 UV Run Patterns

### Development Workflow
```bash
# Start development server
uv run uvicorn script_runner_demo.app:app --reload

# Run tests in another terminal
uv run pytest

# Format code
uv run black .

# Lint code
uv run ruff check .

# Type check
uv run mypy .
```

### Production Commands
```bash
# Run production server
uv run uvicorn script_runner_demo.app:app --host 0.0.0.0 --port 8000

# Run database migrations
uv run alembic upgrade head

# Run custom management commands
uv run python -m script_runner_demo.manage migrate
```

### Utility Commands
```bash
# Run Python REPL with project dependencies
uv run python

# Run Jupyter notebook
uv run jupyter notebook

# Run custom scripts
uv run python scripts/process_data.py
```

---

## 🚀 Advanced UV Run Features

### Running with Different Python Versions
```bash
# Run with specific Python version
uv run --python 3.11 python --version

# Run with Python from path
uv run --python /usr/local/bin/python3.11 python --version
```

### Environment Variables
```bash
# Set environment variables
uv run --env APP_ENV=development uvicorn app:app

# Load from .env file
uv run --env-file .env uvicorn app:app
```

### Isolated Execution
```bash
# Run without syncing dependencies
uv run --no-sync python --version

# Run with frozen lockfile
uv run --locked uvicorn app:app
```

---

## 🎯 Best Practices for UV Run

### 1. Use for All Commands
```bash
# ✅ Always use uv run
uv run python main.py
uv run pytest
uv run black .

# ❌ Don't manually activate venv
source venv/bin/activate
python main.py
```

### 2. Development vs Production
```bash
# Development: auto-reload, debug mode
uv run uvicorn app:app --reload --log-level debug

# Production: optimized settings
uv run uvicorn app:app --host 0.0.0.0 --workers 4
```

### 3. Consistent Tool Versions
```bash
# Same versions across team
uv run black --version    # Always same Black version
uv run ruff --version     # Always same Ruff version
uv run mypy --version     # Always same MyPy version
```

### 4. Script Organization
```
project/
├── scripts/           # Utility scripts
│   ├── setup_db.py
│   ├── seed_data.py
│   └── cleanup.py
├── src/
└── pyproject.toml
```

```bash
# Run utility scripts
uv run python scripts/setup_db.py
uv run python scripts/seed_data.py
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Command Not Found
```bash
# Error: uvicorn command not found
uv run uvicorn app:app

# Solution: Make sure uvicorn is added as dependency
uv add uvicorn
```

### Issue 2: Module Not Found
```bash
# Error: No module named 'requests'
uv run python script.py

# Solution: Sync dependencies
uv sync
```

### Issue 3: Different Behavior
```bash
# Script behaves differently with/without uv run
# Check if you're accidentally using system Python
which python
uv run which python
```

### Issue 4: Performance Issues
```bash
# Slow first run (normal - building venv)
# Subsequent runs should be fast due to cache
uv run --no-sync python script.py  # Skip sync for speed
```

---

## 📋 Verification Checklist

After completing this workshop:

- [ ] Python scripts run successfully with `uv run`
- [ ] FastAPI application starts with `uv run uvicorn`
- [ ] Tests execute with `uv run pytest`
- [ ] Code formatting works with `uv run black`
- [ ] Linting works with `uv run ruff`
- [ ] Type checking works with `uv run mypy`
- [ ] Environment is consistent across runs

---

## 🎯 Key Takeaways

### UV Run Benefits
1. **Automatic environment management**: No manual venv activation
2. **Dependency assurance**: Ensures all packages are installed
3. **Consistent execution**: Same environment every time
4. **Cross-platform compatibility**: Works identically everywhere

### Development Workflow
1. **Write code** in `src/` directory
2. **Run scripts** with `uv run python script.py`
3. **Test code** with `uv run pytest`
4. **Format code** with `uv run black`
5. **Lint code** with `uv run ruff`

### Production Usage
1. **Deploy applications** with `uv run uvicorn app:app`
2. **Run utilities** with `uv run python scripts/manage.py`
3. **Execute tools** with consistent versions

---

## 🚀 Next Steps

Now you can:
- **Workshop 6**: Create complete FastAPI + Uvicorn applications
- Build production-ready applications with UV
- Integrate UV into your development workflow

---

## 📚 Additional Resources

- [UV Run Command Documentation](https://docs.astral.sh/uv/concepts/run/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Python Testing Best Practices](https://realpython.com/python-testing/)
- [Code Formatting with Black](https://black.readthedocs.io/en/stable/)
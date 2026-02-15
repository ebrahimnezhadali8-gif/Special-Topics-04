# Tutorial 3: Introduction to UV - Modern Python Package Management

## 🎯 Learning Objectives
By the end of this tutorial, you will:
- Understand what makes UV different from traditional package managers
- Know UV's core commands and workflow
- Appreciate UV's performance benefits
- Be ready to use UV in your projects

## 📋 Prerequisites
- Python 3.8+ installed
- UV installed (see installation guide)
- Basic terminal/command line knowledge
- Understanding of virtual environments (from Tutorial 1)

---

## 🚀 What is UV?

### UV: The Modern Python Package Manager

**Created by Astral** (the makers of Ruff, a fast Python linter)

**Key Characteristics:**
- ⚡ **Blazing Fast**: Written in Rust, 10-100x faster than pip
- 🔒 **Secure by Default**: Verifies package integrity
- 📦 **Integrated Workflow**: Handles projects, dependencies, and environments
- 🔄 **Reproducible**: Lock files ensure consistent installations
- 🌐 **Global Cache**: Downloads shared across projects

### Why UV Exists

Traditional Python packaging has problems:
- **pip is slow**: Downloads and installs packages sequentially
- **No lock files**: `pip freeze` is manual and error-prone
- **Poor dependency resolution**: Can't handle complex version conflicts well
- **Separate tools**: venv, pip, requirements.txt are disconnected

UV solves these by being:
- **Fast**: Rust implementation with parallel downloads
- **Integrated**: One tool for projects, dependencies, environments
- **Reliable**: Built-in lock files and better resolution
- **Modern**: Designed for contemporary Python development

---

## 🛠️ UV Core Concepts

### 1. Project-Based Workflow
```bash
# Traditional approach
mkdir myproject
cd myproject
python -m venv venv
source venv/bin/activate  # Different on Windows
pip install fastapi uvicorn

# UV approach
uv init myproject
cd myproject
uv add fastapi uvicorn
# venv created automatically, packages installed
```

### 2. Lock Files
```python
# pyproject.toml (project configuration)
[project]
name = "myproject"
version = "0.1.0"
dependencies = [
    "fastapi>=0.100.0",
]

# uv.lock (exact versions, created automatically)
# Contains exact versions of ALL dependencies (direct + transitive)
# Ensures reproducible installs
```

### 3. Global Cache
```bash
# UV downloads packages to global cache
# Shared across all projects on your machine
# Massive speed improvement for repeated packages

~/.cache/uv/
├── archive-v0/
│   ├── requests-2.31.0.tar.gz
│   ├── fastapi-0.104.1.tar.gz
│   └── ...
└── wheels-v0/
    ├── requests-2.31.0-py3-none-any.whl
    ├── fastapi-0.104.1-py3-none-any.whl
    └── ...
```

---

## ⚡ UV Performance Demonstration

### Real-World Speed Comparison

**Installing FastAPI + common dependencies:**

```bash
# First run (cold cache)
pip install fastapi uvicorn sqlalchemy pydantic
# Time: ~45-60 seconds

uv add fastapi uvicorn sqlalchemy pydantic
# Time: ~8-12 seconds
```

**Subsequent runs (warm cache):**
```bash
# pip: Still ~30-45 seconds (re-downloads everything)
# UV: ~2-3 seconds (uses cache)
```

**Why so fast?**
- **Parallel downloads**: Multiple packages simultaneously
- **Global cache**: No re-downloading
- **Compiled in Rust**: Much faster than Python
- **Optimized algorithms**: Better dependency resolution

---

## 📋 UV Command Structure

### Core Commands

```bash
# Project management
uv init <name>          # Create new project
uv run <command>        # Run commands in project environment
uv sync                 # Sync environment with lock file

# Dependency management
uv add <package>        # Add dependency
uv add --dev <package>  # Add development dependency
uv remove <package>     # Remove dependency
uv tree                 # Show dependency tree

# Python management
uv python install <version>  # Install Python version
uv python list              # List installed Pythons

# Utilities
uv cache clean          # Clean cache
uv --version            # Show version
uv --help               # Show help
```

### Command Patterns

```bash
# Add packages
uv add fastapi uvicorn        # Multiple packages
uv add "django>=4.2"          # With version constraint
uv add --dev pytest black     # Development dependencies

# Run commands
uv run python main.py         # Run Python script
uv run pytest                 # Run tests
uv run uvicorn main:app       # Run web server

# Project operations
uv init myproject             # Create project
uv sync                       # Sync dependencies
uv lock                       # Update lock file
```

---

## 🏗️ UV Project Structure

After `uv init myproject`:

```
myproject/
├── pyproject.toml      # Project configuration
├── uv.lock            # Lock file (auto-generated)
├── src/               # Source code (auto-created)
│   └── myproject/
│       └── __init__.py
├── .python-version    # Python version (optional)
└── README.md          # Auto-generated
```

### pyproject.toml Structure
```toml
[project]
name = "myproject"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.8"
dependencies = [
    "fastapi>=0.100.0,<1.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### uv.lock Structure (Auto-generated)
```toml
version = 1
requires-python = ">=3.8"

[[package]]
name = "fastapi"
version = "0.104.1"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "pydantic" },
    { name = "starlette" },
    { name = "uvicorn" },
]

[[package]]
name = "pydantic"
version = "2.5.0"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "typing-extensions" },
]
# ... and so on for all dependencies
```

---

## 🔄 UV Workflow in Practice

### Development Workflow

```bash
# 1. Create project
uv init my-fastapi-app
cd my-fastapi-app

# 2. Add dependencies
uv add fastapi uvicorn sqlalchemy

# 3. Add development tools
uv add --dev pytest black mypy

# 4. Create your code
# src/my_fastapi_app/main.py

# 5. Run development server
uv run uvicorn my_fastapi_app.main:app --reload

# 6. Run tests
uv run pytest

# 7. Format code
uv run black src/

# 8. Type check
uv run mypy src/
```

### Collaboration Workflow

```bash
# Clone repository
git clone https://github.com/user/myproject.git
cd myproject

# Install all dependencies (creates venv automatically)
uv sync

# Start developing
uv run python src/main.py
```

### Deployment Workflow

```bash
# Production deployment
uv sync --locked  # Use exact versions from lock file

# Or for Docker
FROM python:3.11-slim
COPY . /app
RUN pip install uv && uv sync --locked
```

---

## 🔒 Security Features

### Package Verification
- UV verifies package integrity during download
- Checks against known malicious packages
- Validates hash sums

### Supply Chain Security
```bash
# UV checks for known security vulnerabilities
uv add requests  # Will warn about vulnerable versions

# Audit existing dependencies
uv pip audit     # Check for vulnerabilities
```

---

## 🌍 UV vs Other Tools Comparison

| Feature | pip | poetry | pipenv | **UV** |
|---------|-----|--------|--------|--------|
| **Speed** | Slow | Medium | Medium | ⚡ Very Fast |
| **Lock File** | Manual | Yes | Yes | Yes |
| **Dev/Prod Deps** | Manual | Yes | Yes | Yes |
| **Environment Mgmt** | Separate | Yes | Yes | Yes |
| **Dependency Resolution** | Basic | Good | Good | Excellent |
| **Cache** | No | Basic | Basic | Global |
| **Security** | Basic | Basic | Basic | Advanced |

---

## 🚨 Common UV Patterns & Tips

### Pattern 1: Fast Development Setup
```bash
# Create project with all common tools
uv init myproject
cd myproject
uv add fastapi uvicorn sqlalchemy alembic
uv add --dev pytest black mypy ruff pytest-asyncio
```

### Pattern 2: Upgrading Dependencies
```bash
# Update specific package
uv add --upgrade fastapi

# Update all packages
uv lock --upgrade

# Update to latest compatible versions
uv sync --upgrade
```

### Pattern 3: Working with Existing Projects
```bash
# Convert existing project to UV
cd existing-project

# Create pyproject.toml
uv init --no-readme

# Add existing requirements
uv add -r requirements.txt

# Remove old requirements.txt
rm requirements.txt
```

### Pattern 4: Python Version Management
```bash
# Install specific Python version
uv python install 3.11

# Pin project to Python version
uv python pin 3.11

# List available Python versions
uv python list
```

---

## 🔍 Troubleshooting Common Issues

### Issue 1: "Python version not found"
```bash
# Error: No Python 3.11 found
uv python install 3.11  # Install it first
```

### Issue 2: "Package not found"
```bash
# Check package name spelling
uv add fastapi  # Correct
uv add FastAPI  # Wrong - case sensitive
```

### Issue 3: Lock file conflicts
```bash
# When uv.lock conflicts with pyproject.toml
uv sync --reinstall  # Force reinstall
# or
rm uv.lock && uv sync  # Regenerate lock file
```

### Issue 4: Permission issues
```bash
# On some systems, use --user
uv --user add package-name
```

---

## 🎯 Key Takeaways

### What Makes UV Special
1. **Performance**: 10-100x faster than pip
2. **Integrated**: One tool for everything
3. **Reliable**: Lock files prevent version drift
4. **Secure**: Built-in security features
5. **Modern**: Designed for contemporary Python development

### Core Workflow
1. `uv init` - Create project
2. `uv add` - Add dependencies
3. `uv run` - Execute commands
4. `uv sync` - Sync environment

### Benefits Over Traditional Tools
- **Faster installs**: Global cache + parallel downloads
- **Better reliability**: Automatic lock files
- **Simpler workflow**: No manual venv activation
- **Security**: Package verification and vulnerability scanning

---

## 🚀 Next Steps

Now that you understand UV fundamentals, you'll learn:
- **Tutorial 4**: Creating projects with UV
- **Tutorial 5**: Advanced dependency management
- **Tutorial 6**: Integrating with Uvicorn

---

## 📚 Additional Resources

- [UV Official Documentation](https://docs.astral.sh/uv/)
- [UV GitHub Repository](https://github.com/astral-sh/uv)
- [Astral Company Blog](https://astral.sh/blog)
- [Real Python: UV Guide](https://realpython.com/python-uv/)
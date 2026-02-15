# Workshop 3: Creating Your First UV Project

## 🎯 Objective
Create your first UV-managed Python project and understand the project structure.

## 📋 Prerequisites
- UV installed and working
- Basic terminal knowledge
- Text editor available

## 📚 Session Overview
**Duration**: 30-45 minutes
**Focus**: Hands-on UV project creation and structure understanding

---

## 🛠️ Step-by-Step: Creating Your First UV Project

### Step 1: Choose Project Location
```bash
# Create a projects directory (optional)
mkdir ~/python-projects
cd ~/python-projects
```

### Step 2: Initialize UV Project
```bash
# Create new project
uv init my-first-uv-project

# Enter project directory
cd my-first-uv-project
```

### Step 3: Explore Project Structure
```bash
# List all files created
ls -la

# Check main files
cat pyproject.toml
cat uv.lock
cat README.md
```

**What was created:**
- `pyproject.toml` - Project configuration
- `uv.lock` - Dependency lock file
- `src/my_first_uv_project/` - Source code directory
- `README.md` - Project documentation
- `.python-version` - Python version specification

### Step 4: Examine pyproject.toml
```toml
[project]
name = "my-first-uv-project"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.8"
dependencies = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### Step 5: Add Your First Dependency
```bash
# Add requests library
uv add requests

# Check what changed
cat pyproject.toml
cat uv.lock | head -20
```

### Step 6: Create a Simple Script
```bash
# Create a Python script in src directory
# File: src/my_first_uv_project/main.py

cat > src/my_first_uv_project/main.py << 'EOF'
#!/usr/bin/env python3
"""Simple script using requests library."""

import requests

def main():
    """Fetch and display a joke from an API."""
    response = requests.get("https://api.chucknorris.io/jokes/random")
    data = response.json()
    print(f"Chuck Norris Joke: {data['value']}")

if __name__ == "__main__":
    main()
EOF
```

### Step 7: Run Your Script with UV
```bash
# Run the script using UV (creates virtual environment automatically)
uv run python src/my_first_uv_project/main.py

# You should see a Chuck Norris joke!
```

### Step 8: Add Development Dependencies
```bash
# Add pytest for testing
uv add --dev pytest

# Check pyproject.toml again
cat pyproject.toml
```

### Step 9: Create and Run Tests
```bash
# Create test file
# File: tests/test_main.py

mkdir tests
cat > tests/test_main.py << 'EOF'
"""Tests for main.py."""

import pytest
from my_first_uv_project.main import main

def test_main_runs_without_error(capsys):
    """Test that main function runs without error."""
    main()
    captured = capsys.readouterr()
    assert "Chuck Norris" in captured.out
EOF
```

### Step 10: Run Tests
```bash
# Run tests using UV
uv run pytest

# Should show test results
```

---

## 🔍 Understanding UV Project Structure

### Complete Project Structure
```
my-first-uv-project/
├── pyproject.toml          # Project configuration
├── uv.lock                # Dependency lock file
├── README.md              # Documentation
├── .python-version        # Python version (optional)
├── src/                   # Source code
│   └── my_first_uv_project/
│       ├── __init__.py
│       └── main.py
└── tests/                 # Test files
    └── test_main.py
```

### Key Files Explained

#### pyproject.toml
- **Project metadata**: name, version, description
- **Dependencies**: runtime and development
- **Build system**: how to package the project

#### uv.lock
- **Exact versions**: of all dependencies
- **Integrity hashes**: for security
- **Dependency tree**: complete resolution
- **Reproducibility**: ensures same install everywhere

#### src/ Directory
- **Source code**: your actual Python modules
- **Import structure**: matches project name
- **Clean separation**: from tests and config

---

## 📋 UV Commands Used in This Workshop

```bash
# Project creation
uv init <project-name>     # Create new project

# Dependency management
uv add <package>           # Add runtime dependency
uv add --dev <package>     # Add development dependency

# Running commands
uv run <command>           # Run in project environment

# Synchronization
uv sync                    # Install all dependencies
```

---

## 🔄 What Happens Behind the Scenes

### When you run `uv init`:
1. Creates `pyproject.toml` with basic configuration
2. Creates `uv.lock` (initially minimal)
3. Sets up `src/` directory structure
4. Creates basic `README.md`

### When you run `uv add requests`:
1. Resolves dependency versions
2. Downloads packages to global cache
3. Updates `pyproject.toml` with dependency
4. Updates `uv.lock` with exact versions
5. Creates/updates virtual environment

### When you run `uv run python main.py`:
1. Ensures virtual environment exists
2. Activates environment (automatically)
3. Runs command in that environment
4. Deactivates when done

---

## 🚨 Common Issues & Solutions

### Issue 1: "Python version not available"
```bash
# Error: Python 3.11 not found
uv python install 3.11  # Install specific version
```

### Issue 2: Permission issues
```bash
# On some systems
uv run --no-sync python main.py  # Skip environment setup
```

### Issue 3: Import errors
```bash
# Make sure you're using uv run
uv run python src/my_first_uv_project/main.py

# Not just: python src/my_first_uv_project/main.py
```

### Issue 4: Lock file conflicts
```bash
# Regenerate lock file
rm uv.lock
uv sync
```

---

## 🎯 Key Takeaways

### UV Project Creation
1. `uv init` creates complete project structure
2. `pyproject.toml` defines project configuration
3. `uv.lock` ensures reproducible environments
4. `src/` layout follows Python packaging best practices

### Dependency Management
1. `uv add` adds dependencies to project
2. `--dev` flag separates development dependencies
3. `uv run` executes commands in proper environment

### Development Workflow
1. Create project with `uv init`
2. Add dependencies with `uv add`
3. Run code with `uv run`
4. Tests run in same environment

---

## 📋 Verification Checklist

After completing this workshop:

- [ ] UV project created with `uv init`
- [ ] Project structure includes pyproject.toml, uv.lock, src/
- [ ] Dependencies added with `uv add`
- [ ] Script runs successfully with `uv run`
- [ ] Tests execute with `uv run pytest`
- [ ] Virtual environment created automatically

---

## 🎓 What You Learned

1. **UV project structure**: pyproject.toml, uv.lock, src/ layout
2. **Dependency management**: runtime vs development dependencies
3. **Environment isolation**: automatic venv creation and management
4. **Command execution**: using `uv run` for all project commands
5. **Reproducible builds**: lock files ensure consistency

---

## 🚀 Next Steps

Now you can:
- **Workshop 4**: Add multiple dependencies with UV
- **Workshop 5**: Run and manage scripts with UV
- **Workshop 6**: Create FastAPI + Uvicorn project with UV

---

## 📚 Additional Resources

- [UV Project Layout Guide](https://docs.astral.sh/uv/concepts/projects/layout/)
- [pyproject.toml Specification](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [Python Packaging Best Practices](https://packaging.python.org/en/latest/tutorials/packaging-projects/)
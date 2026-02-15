# Tutorial 2: What is Dependency Management?

## 🎯 Learning Objectives
By the end of this tutorial, you will understand:
- What dependencies are in software development
- Why dependency management matters
- The problems it solves
- Traditional approaches vs modern solutions

## 📋 Prerequisites
- Basic understanding of Python programming
- Familiarity with installing packages via pip
- Completed venv tutorial (Workshop 1)

---

## 🔍 What Are Dependencies?

### Definition
**Dependencies** are external code libraries or packages that your project relies on to function.

### Examples in Python
```python
# Your code
import requests  # requests is a dependency
from fastapi import FastAPI  # fastapi is a dependency

# requests itself has dependencies
# requests depends on: urllib3, certifi, charset-normalizer, idna

# fastapi depends on: starlette, pydantic, uvicorn
```

### Types of Dependencies

#### 1. Direct Dependencies
Packages you explicitly import and use in your code
```python
import fastapi          # Direct dependency
import sqlalchemy       # Direct dependency
```

#### 2. Transitive Dependencies
Packages that your direct dependencies need
```python
# You install: fastapi
# fastapi needs: starlette, pydantic, uvicorn
# pydantic needs: typing-extensions, email-validator
# These are transitive dependencies
```

#### 3. Development Dependencies
Packages needed only during development
```python
# Runtime dependencies (production)
fastapi, uvicorn, sqlalchemy

# Development dependencies (local only)
pytest, black, mypy, jupyter
```

---

## 🚨 The Dependency Management Problem

### Scenario: The "Works on My Machine" Problem

**Developer A** (Ubuntu):
```bash
pip install requests
# Gets requests 2.28.0 + compatible dependencies
# Project works perfectly
```

**Developer B** (Windows):
```bash
pip install requests
# Gets requests 2.31.0 + different dependency versions
# Project breaks due to compatibility issues
```

**Production Server** (Linux):
```bash
pip install requests
# Gets latest requests + newest dependencies
# Different versions than both developers
# Project fails in production!
```

### Real-World Impact
- **Time wasted**: Hours debugging version conflicts
- **Broken deployments**: Code works locally but fails in production
- **Team frustration**: "It works on my machine!"
- **Security risks**: Unknown/untrusted package versions

---

## 🔧 Traditional Solutions (The Old Way)

### Method 1: requirements.txt
```bash
# Create requirements file
pip freeze > requirements.txt

# Share with team
# requirements.txt contains ALL installed packages with exact versions
# Other developers run: pip install -r requirements.txt
```

**Problems:**
- Includes system packages you don't need
- No distinction between dev and production dependencies
- Hard to update specific packages
- Manual management is error-prone

### Method 2: setup.py
```python
from setuptools import setup

setup(
    name="myproject",
    install_requires=[
        "fastapi>=0.68.0",
        "uvicorn>=0.15.0",
    ],
)
```

**Problems:**
- Still basic dependency management
- No lock files
- Version conflicts not resolved automatically

---

## 🎯 What Good Dependency Management Provides

### 1. **Reproducible Environments**
```
Same code + Same dependency versions = Same behavior everywhere
```

### 2. **Version Locking**
- Exact versions recorded in lock files
- No surprises when deploying
- Team members get identical environments

### 3. **Dependency Resolution**
- Automatically handles version conflicts
- Finds compatible package combinations
- Prevents "dependency hell"

### 4. **Development vs Production Separation**
```python
# Development needs
pytest          # testing
black           # code formatting
mypy            # type checking

# Production needs only
fastapi         # web framework
sqlalchemy      # database
```

### 5. **Security & Auditability**
- Know exactly what packages and versions are installed
- Easy to check for security vulnerabilities
- Clear dependency tree for compliance

---

## 🆚 Traditional Tools vs Modern Tools

| Feature | pip + requirements.txt | Modern Tools (UV, Poetry) |
|---------|------------------------|---------------------------|
| **Speed** | Slow | Very Fast ⚡ |
| **Lock Files** | Manual | Automatic |
| **Dev/Prod Separation** | Manual | Built-in |
| **Dependency Resolution** | Basic | Advanced |
| **Virtual Environment** | Separate tool | Integrated |
| **Security** | Limited | Built-in checks |
| **Performance** | Python-based | Rust-based |

---

## 🚀 Why UV is Different

### UV: The Modern Python Package Manager

**Key Innovations:**
1. **Written in Rust**: 10-100x faster than pip
2. **Integrated venv management**: No separate activation needed
3. **Advanced dependency resolver**: Better at finding compatible versions
4. **Lock files by default**: Reproducible builds guaranteed
5. **Global dependency cache**: Downloads shared across projects

### Performance Comparison
```bash
# Traditional pip
pip install fastapi uvicorn sqlalchemy
# Takes 30-60 seconds
# Downloads and compiles packages

# UV
uv add fastapi uvicorn sqlalchemy
# Takes 5-10 seconds
# Uses global cache, parallel downloads
```

### Real-World Impact
- **Development speed**: Faster installs = more productivity
- **CI/CD speed**: Faster builds = lower costs
- **Reproducibility**: Lock files prevent version drift
- **Security**: Built-in vulnerability scanning

---

## 📊 Understanding the Dependency Tree

### Visual Example
```
Your Project
├── fastapi (direct)
│   ├── starlette (transitive)
│   │   ├── anyio (transitive)
│   │   └── typing-extensions (transitive)
│   ├── pydantic (transitive)
│   │   └── typing-extensions (transitive)
│   └── uvicorn (transitive)
│       └── click (transitive)
└── sqlalchemy (direct)
    ├── greenlet (transitive)
    └── typing-extensions (transitive)
```

**Key Insights:**
- `typing-extensions` appears multiple times (deduplicated)
- Version conflicts can occur at any level
- Modern tools resolve these automatically

---

## 🎯 Best Practices for Dependency Management

### 1. **Use Modern Tools**
- UV, Poetry, or PDM instead of pip + requirements.txt
- Get lock files, fast installs, better resolution

### 2. **Separate Dev and Prod Dependencies**
```python
# Production only
uv add fastapi sqlalchemy

# Development only
uv add --dev pytest black mypy
```

### 3. **Pin Major Versions, Allow Minor Updates**
```python
# Good: Allows bug fixes and security updates
uv add "fastapi>=0.100.0,<1.0.0"

# Avoid: Too restrictive
uv add "fastapi==0.100.1"

# Avoid: Too loose (breaking changes)
uv add fastapi
```

### 4. **Regular Updates**
- Keep dependencies updated for security
- Test thoroughly after updates
- Use tools to automate updates

### 5. **Audit Regularly**
- Check for security vulnerabilities
- Remove unused dependencies
- Review dependency licenses

---

## 🔍 Common Dependency Issues

### Issue 1: Version Conflicts
```python
# Package A needs requests>=2.25.0
# Package B needs requests<2.28.0
# Result: No compatible version exists

# Modern tools detect and resolve this
# Traditional pip: "Dependency hell"
```

### Issue 2: Circular Dependencies
```python
# Package A depends on Package B v2.0
# Package B v2.0 depends on Package A v1.0
# Result: Impossible to resolve

# Modern tools detect circular dependencies
```

### Issue 3: Platform-Specific Issues
```python
# Package works on Linux but not Windows
# Different architectures (amd64 vs arm64)

# Modern tools handle platform-specific dependencies
```

---

## 🎓 Summary

### What You Learned
1. **Dependencies** are external packages your code needs
2. **Dependency management** prevents "works on my machine" problems
3. **Traditional tools** (pip + requirements.txt) have limitations
4. **Modern tools** (UV) provide better speed, reliability, and features
5. **Lock files** ensure reproducible environments
6. **Dev vs prod separation** keeps production lean

### Why It Matters
- **Reliability**: Code works the same everywhere
- **Security**: Known, audited package versions
- **Productivity**: Less time debugging deployment issues
- **Teamwork**: Consistent environments across team members

---

## 🚀 Next Steps

Now that you understand dependency management, you'll learn:
- **Tutorial 3**: Introduction to UV package manager
- **Tutorial 4**: Creating projects with UV
- **Tutorial 5**: Managing dependencies with UV
- **Tutorial 6**: Running Uvicorn in UV projects

---

## 📚 Additional Resources

- [UV Documentation](https://docs.astral.sh/uv/)
- [Python Dependency Management Guide](https://packaging.python.org/discussions/dependency-management/)
- [Semantic Versioning](https://semver.org/)
- [Security in Python Dependencies](https://snyk.io/blog/python-security-best-practices/)
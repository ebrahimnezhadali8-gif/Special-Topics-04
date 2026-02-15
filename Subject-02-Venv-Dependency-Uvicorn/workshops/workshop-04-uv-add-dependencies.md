# Workshop 4: Adding Dependencies with UV

## 🎯 Objective
Learn how to add, manage, and remove dependencies in UV projects.

## 📋 Prerequisites
- UV installed and working
- Completed Workshop 3 (UV project creation)
- Basic understanding of Python packages

## 📚 Session Overview
**Duration**: 45-60 minutes
**Focus**: Comprehensive dependency management with UV

---

## 🛠️ Step-by-Step: Dependency Management

### Step 1: Start with Clean Project
```bash
# Create new project for this workshop
uv init dependency-workshop
cd dependency-workshop

# Check initial state
cat pyproject.toml
```

### Step 2: Add Single Dependency
```bash
# Add requests library
uv add requests

# Check what changed
cat pyproject.toml
cat uv.lock | grep -A 5 "name = \"requests\""
```

### Step 3: Add Multiple Dependencies
```bash
# Add several packages at once
uv add fastapi uvicorn sqlalchemy

# Check pyproject.toml
cat pyproject.toml
```

### Step 4: Add Development Dependencies
```bash
# Add testing and development tools
uv add --dev pytest black mypy ruff

# Check separation in pyproject.toml
cat pyproject.toml
```

### Step 5: Add Dependencies with Version Constraints
```bash
# Add with specific version
uv add "django==4.2.0"

# Add with version range
uv add "pandas>=1.5.0,<2.0.0"

# Add with minimum version
uv add "numpy>=1.20.0"
```

### Step 6: View Dependency Tree
```bash
# Show all dependencies and their relationships
uv tree

# Show only production dependencies
uv tree --no-dev

# Show specific package dependencies
uv tree requests
```

### Step 7: Update Dependencies
```bash
# Update specific package to latest compatible version
uv add --upgrade fastapi

# Update all packages to latest compatible versions
uv lock --upgrade

# Check what changed
uv tree | head -20
```

### Step 8: Remove Dependencies
```bash
# Remove a package
uv remove django

# Remove development dependency
uv remove --dev mypy

# Check pyproject.toml after removal
cat pyproject.toml
```

---

## 🔍 Understanding Dependency Types

### Production Dependencies
```bash
# These run your application
uv add fastapi uvicorn sqlalchemy

# Appear in pyproject.toml under [project.dependencies]
[project]
dependencies = [
    "fastapi>=0.100.0,<1.0.0",
    "uvicorn>=0.23.0,<1.0.0",
    "sqlalchemy>=2.0.0,<3.0.0",
]
```

### Development Dependencies
```bash
# These help develop and test your application
uv add --dev pytest black ruff mypy

# Appear in pyproject.toml under [project.optional-dependencies.dev]
[project]
optional-dependencies = { dev = [
    "pytest>=7.0.0,<8.0.0",
    "black>=23.0.0,<24.0.0",
    "ruff>=0.1.0,<1.0.0",
    "mypy>=1.0.0,<2.0.0",
] }
```

### Why Separate Dev and Prod Dependencies?
- **Production**: Lean, fast, secure
- **Development**: Full tooling for coding, testing, linting
- **Deployment**: Only install what's needed to run the app

---

## 📊 Version Constraint Strategies

### Semantic Versioning Basics
```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug fixes only
  │     └──────── New features, backward compatible
  └───────────── Breaking changes
```

### Common Version Patterns
```bash
# Exact version (rarely recommended)
uv add "requests==2.31.0"

# Minimum version
uv add "requests>=2.25.0"

# Compatible release (recommended for libraries)
uv add "requests~=2.31.0"  # Same as >=2.31.0,<2.32.0

# Version range
uv add "requests>=2.25.0,<3.0.0"

# Exclude problematic versions
uv add "requests>=2.25.0,!=2.30.0"
```

### Best Practices
1. **Use compatible release** for most packages: `~=1.2.3`
2. **Pin major versions** to avoid breaking changes: `>=1.0.0,<2.0.0`
3. **Test thoroughly** after dependency updates
4. **Use `uv lock --upgrade`** regularly for security updates

---

## 🔍 Lock File Deep Dive

### What is uv.lock?
- **Complete dependency resolution**: Exact versions of ALL packages
- **Integrity verification**: SHA256 hashes for security
- **Reproducible installs**: Same environment everywhere
- **Conflict resolution**: UV's algorithm results

### Lock File Structure
```toml
[[package]]
name = "fastapi"
version = "0.104.1"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "...", hash = "sha256:...", size = 1234 }
wheels = [
    { url = "...", hash = "sha256:...", size = 1234 },
]

[package.dependencies]
pydantic = ">=1.6.2,<3.0.0"
starlette = ">=0.27.0,<0.28.0"
uvicorn = { version = ">=0.14.0", markers = "..." }
```

### Lock File Benefits
1. **Speed**: No resolution needed on subsequent installs
2. **Security**: Hashes prevent tampering
3. **Consistency**: Exact same versions across all environments
4. **Debugging**: Clear view of what was installed when

---

## 🚨 Dependency Conflict Resolution

### What are Conflicts?
```bash
# Package A needs: requests>=2.25.0
# Package B needs: requests<2.28.0
# Package C needs: requests==2.30.0

# UV finds compatible version or reports conflict
```

### UV's Resolution Strategy
1. **Backtracking**: Tries different version combinations
2. **Prioritization**: Prefers newer, more secure versions
3. **Minimal changes**: Keeps existing working versions when possible
4. **Clear errors**: Explains conflicts when resolution fails

### Handling Conflicts
```bash
# UV usually resolves automatically
uv add conflicting-package

# If conflict occurs, update one package
uv add --upgrade package-a

# Or pin specific version
uv add "package-a==1.2.3"
```

---

## 📋 Advanced UV Add Options

### Conditional Dependencies
```bash
# Add with environment markers
uv add --python-version ">=3.9" "package-name"

# Add for specific platforms
uv add --platform linux "linux-only-package"
```

### Optional Dependencies
```bash
# Add optional dependency group
uv add --optional docs sphinx

# Appears in pyproject.toml as optional-dependencies.docs
```

### From Requirements Files
```bash
# Convert existing requirements.txt
uv add -r requirements.txt

# Add from multiple files
uv add -r requirements.txt -r dev-requirements.txt
```

---

## 🎯 Practical Examples

### Web Application Stack
```bash
# Create project
uv init web-app
cd web-app

# Add core web framework
uv add fastapi uvicorn

# Add database layer
uv add sqlalchemy asyncpg alembic

# Add authentication
uv add python-jose[cryptography] passlib[bcrypt]

# Add development tools
uv add --dev pytest httpx black ruff pre-commit

# Check final dependency tree
uv tree
```

### Data Science Stack
```bash
# Create project
uv init data-analysis
cd data-analysis

# Add data processing
uv add pandas numpy scipy

# Add visualization
uv add matplotlib seaborn plotly

# Add machine learning
uv add scikit-learn

# Add Jupyter
uv add --dev jupyter ipykernel

# Check dependencies
uv tree --no-dev
```

---

## 🚨 Troubleshooting Common Issues

### Issue 1: Package Not Found
```bash
# Check spelling and case
uv add requests  # Correct
uv add Requests  # Wrong - case sensitive

# Check if package exists
uv add --dry-run unknown-package
```

### Issue 2: Version Conflicts
```bash
# Update conflicting package
uv add --upgrade conflicting-package

# Or pin specific version
uv add "package==1.2.3"
```

### Issue 3: Lock File Issues
```bash
# Regenerate lock file
rm uv.lock
uv sync

# Update all packages
uv lock --upgrade
```

### Issue 4: Network Issues
```bash
# Use different index
uv add --index https://pypi.org/simple package-name

# Retry with different timeout
uv add --timeout 300 package-name
```

---

## 📋 Verification Checklist

After completing this workshop:

- [ ] Multiple dependencies added with `uv add`
- [ ] Development dependencies separated with `--dev`
- [ ] Version constraints applied correctly
- [ ] Dependency tree viewed with `uv tree`
- [ ] Dependencies updated with `--upgrade`
- [ ] Packages removed with `uv remove`
- [ ] Lock file contains exact versions

---

## 🎯 Key Takeaways

### Dependency Management Best Practices
1. **Separate concerns**: Runtime vs development dependencies
2. **Version constraints**: Use compatible releases (`~=`)
3. **Regular updates**: Keep dependencies secure with `uv lock --upgrade`
4. **Review changes**: Always check `uv tree` after changes

### UV's Advantages
1. **Automatic resolution**: Handles complex dependency graphs
2. **Lock files**: Ensures reproducibility
3. **Fast operations**: Global cache and parallel downloads
4. **Integrated workflow**: No separate venv management

### Common Patterns
1. **Web apps**: fastapi + uvicorn + database + auth
2. **Data science**: pandas + numpy + matplotlib + jupyter
3. **Libraries**: Minimal dependencies, extensive dev tools

---

## 🚀 Next Steps

Now you can:
- **Workshop 5**: Run scripts and commands with UV
- **Workshop 6**: Create FastAPI + Uvicorn applications
- Build complex applications with multiple dependencies

---

## 📚 Additional Resources

- [UV Dependency Management](https://docs.astral.sh/uv/concepts/dependencies/)
- [Semantic Versioning](https://semver.org/)
- [Python Package Index (PyPI)](https://pypi.org/)
- [Dependency Resolution in Python](https://packaging.python.org/en/latest/discussions/dependency-resolution/)
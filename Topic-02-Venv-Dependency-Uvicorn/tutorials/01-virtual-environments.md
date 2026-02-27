# Tutorial 1: Python Virtual Environments with uv

## 🎯 Learning Objectives
By the end of this tutorial, you will understand:
- What virtual environments are and why they're essential
- How to create and manage virtual environments using uv
- The difference between global and isolated package installations
- Best practices for virtual environment management

## 📋 Prerequisites
- Python 3.8+ installed on your system
- Basic terminal/command line knowledge
- Understanding of Python package installation with pip

---

## 🔍 What Are Virtual Environments?

### The Problem: Package Conflicts

Imagine you're working on multiple Python projects:

**Project A** needs `requests==2.25.0` (older version)  
**Project B** needs `requests==2.28.0` (newer version)  
**Project C** needs `requests==2.26.0` (different version)

Without virtual environments, all projects share the same global Python installation. Installing different versions of the same package for different projects becomes impossible!

### The Solution: Isolated Environments

**Virtual environments** create isolated Python installations for each project, allowing:
- Different package versions per project
- Clean dependency separation
- No conflicts between projects
- Easy environment recreation

---

## 🛠️ Creating Virtual Environments with uv

### Basic uv Usage

#### 1. Create a Virtual Environment
```bash
# Navigate to your project directory
cd my-project

# Create a virtual environment named 'uv'
uv venv
```

#### 2. Activate the Virtual Environment

**Windows (Command Prompt):**
```cmd
.venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
.venv\Scripts\activate.ps1
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

#### 3. Verify Activation
```bash
# Check which Python is being used
which python  # or where python on Windows

# Check pip location
which pip     # or where pip on Windows

# Your paths should now point to the uv directory
```

#### 4. Install Packages
```bash
# Install packages (they go into the virtual environment)
uv add requests fastapi uvicorn

# List installed packages
pip list
```

#### 5. Deactivate the Environment
```bash
deactivate
```

### 📁 Project Structure with uv

```
my-project/
├── .venv/                    # Virtual environment (don't commit!)
├── main.py                  # Your Python code
├── requirements.txt         # Dependencies list
└── README.md               # Project documentation
```

---

## 📋 Managing Dependencies

### Creating Requirements Files

#### Method 1: Manual Creation
```bash
# After installing packages in activated uv
pip freeze > requirements.txt
```

#### Method 2: Selective Dependencies
```bash
# Create requirements.txt with specific packages
echo "fastapi==0.104.1" > requirements.txt
echo "uvicorn==0.24.0" >> requirements.txt
echo "requests==2.31.0" >> requirements.txt
```

### Installing from Requirements
```bash
# Activate virtual environment first
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install all dependencies
uv add -r requirements.txt
```

---

## 🔄 Environment Workflow

### Typical Development Cycle

```bash
# 1. Create project directory
mkdir my-fastapi-app
cd my-fastapi-app

# 2. Create virtual environment
uv venv

# 3. Activate environment
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 4. Install dependencies
uv add fastapi uvicorn

# 5. Develop your application
# ... write code ...

# 6. Save dependencies
pip freeze > requirements.txt

# 7. Deactivate when done
deactivate
```

### Switching Between Projects

```bash
# Project A
cd project-a
source .venv/bin/activate
# Work on project A...

# Switch to Project B
deactivate
cd ../project-b
source .venv/bin/activate
# Work on project B...
```

---

## 🏗️ Advanced uv Usage

### Custom Environment Names

```bash
# Create environment with custom name
uv venv myenv

# Or use .uv (common convention)
uv venv .uv
```

### Environment Variables

```bash
# Create environment with system packages access
uv venv --system-site-packages

# Clear existing environment
uv venv --clear
```

### Checking Environment Status

```bash
# Check if virtual environment is active
echo $VIRTUAL_ENV  # Shows path if activated

# Check Python path
python -c "import sys; print(sys.path[:3])"
```

---

## 🚨 Common Issues and Solutions

### 1. Permission Errors (Windows)
```cmd
# Run Command Prompt as Administrator, or use:
uv venv --clear
```

### 2. Activation Not Working
```bash
# Ensure you're using the correct activation script
# Windows PowerShell: .venv\Scripts\activate.ps1
# Windows CMD: .venv\Scripts\activate.bat
# Linux/macOS: source .venv/bin/activate
```

### 3. Packages Not Found After Activation
```bash
# Check if you're using the right Python
which python
which pip

# They should point to your uv directory
```

### 4. uv Module Not Found
```bash
# uv is included with Python 3.3+
# If missing, you might need to install python3-uv
# Ubuntu/Debian: sudo apt install python3-uv
```

---

## 📚 Best Practices

### 1. Environment Per Project
```
project-a/
├── .venv/
└── src/

project-b/
├── .venv/
└── src/
```

### 2. Never Commit Virtual Environments
Create `.gitignore`:
```
# Virtual environments
uv/
.uv/
env/
ENV/

# IDE
.vscode/
.idea/
```

### 3. Use Descriptive Requirements
```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
requests==2.31.0
pytest==7.4.3  # For testing
```

### 4. Document Setup Process
```markdown
# Setup
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv add -r requirements.txt
```

### 5. Keep Requirements Updated
```bash
# After adding new packages
pip freeze > requirements.txt
```
---

## 🔍 Understanding uv Internally

### What's Inside a Virtual Environment?

```
.venv/
├── bin/           # Executables (Linux/macOS)
│   ├── python
│   ├── pip
│   └── activate
├── Scripts/       # Executables (Windows)
│   ├── python.exe
│   ├── pip.exe
│   └── activate.bat
├── include/       # Header files
├── lib/           # Python libraries
└── pyuv.cfg     # Configuration
```

### How Activation Works

Activation modifies environment variables:
- `PATH`: Adds uv executables first
- `VIRTUAL_ENV`: Set to uv path
- `PYTHONHOME`: Cleared (uses uv Python)
- `PS1`: Modified prompt (bash)

---

## 🎯 Summary

Virtual environments are essential for:
- **Isolation**: Keep project dependencies separate
- **Reproducibility**: Recreate exact environments
- **Conflict Prevention**: Different package versions per project
- **Clean Development**: No system pollution

### Key Commands
```bash
# Create
uv venv

# Activate
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows

# Install packages
uv add package-name

# Save dependencies
pip freeze > requirements.txt

# Deactivate
deactivate
```

Now that you understand virtual environments, you're ready to learn about dependency management and modern tools like UV!

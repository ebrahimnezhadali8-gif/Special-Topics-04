# Workshop 1: venv Tutorial Session - Python Environment Isolation

## 🎯 Objective
By the end of this workshop, students will understand what Python virtual environments are, why they're important, and how to create and manage them using venv.

## 📋 Prerequisites
- Python 3.8+ installed on your system
- Basic terminal/command prompt knowledge
- Text editor (VS Code recommended)

## 📚 Session Overview
**Duration**: 45-60 minutes
**Format**: Interactive tutorial with live demonstrations
**Focus**: Understanding venv concepts and practical usage

---

## 🔍 What is venv? Why Do We Need It?

### The Problem: Global Package Conflicts
```python
# Without virtual environments, all packages go to system Python
# This can cause conflicts between different projects

# Project A needs requests==2.25.0
# Project B needs requests==2.28.0
# System can only have one version installed!
```

### The Solution: Isolated Environments
```
System Python (Global)
├── Project A Environment
│   ├── Python 3.8
│   ├── requests==2.25.0
│   └── other dependencies
│
├── Project B Environment
│   ├── Python 3.8
│   ├── requests==2.28.0
│   └── other dependencies
```

### Key Benefits of venv
1. **Isolation**: Each project has its own dependencies
2. **Reproducibility**: Same environment across different machines
3. **No Conflicts**: Different projects can use different package versions
4. **Clean Uninstall**: Remove project = remove its environment
5. **Development vs Production**: Different environments for different purposes

---

## 🛠️ Step-by-Step: Creating Your First Virtual Environment

### Step 1: Open Terminal/Command Prompt
**Windows**: Press `Win + R`, type `cmd`, press Enter
**macOS**: Press `Cmd + Space`, type `terminal`, press Enter
**Linux**: Press `Ctrl + Alt + T`

### Step 2: Navigate to Your Project Directory
```bash
# Create a new directory for our project
mkdir my-first-project
cd my-first-project
```

### Step 3: Create Virtual Environment
```bash
# Create a virtual environment named 'venv'
python -m venv venv

# This creates a 'venv' folder in your project directory
```

**What happens when you run this command?**
- Python creates a new folder called `venv`
- Inside this folder: complete Python installation
- Isolated from system Python packages

### Step 4: Activate the Virtual Environment

#### Windows (Command Prompt):
```cmd
venv\Scripts\activate
```

#### Windows (PowerShell):
```powershell
venv\Scripts\Activate.ps1
```

#### macOS/Linux:
```bash
source venv/bin/activate
```

**What changes when activated?**
- Command prompt shows `(venv)` at the beginning
- `python` and `pip` now point to virtual environment
- Packages installed will go to this environment

### Step 5: Verify Activation
```bash
# Check which Python we're using
which python  # Shows path to venv python
python --version

# Check pip location
which pip
pip --version
```

### Step 6: Install Packages
```bash
# Install a package
pip install requests

# Check installed packages
pip list

# Check if package is in our environment
pip show requests
```

### Step 7: Deactivate Environment
```bash
# Deactivate the virtual environment
deactivate

# Notice: (venv) disappears from command prompt
```

---

## 🔍 Understanding the venv Folder Structure

After creating venv, explore the folder structure:

```
venv/
├── bin/              # macOS/Linux executables
│   ├── python        # Python executable
│   ├── pip           # pip executable
│   └── activate      # Activation script
├── Scripts/          # Windows executables
│   ├── python.exe    # Python executable
│   ├── pip.exe       # pip executable
│   └── activate.bat  # Activation script
├── Lib/              # Python standard library
├── site-packages/    # Installed packages go here
└── pyvenv.cfg        # Configuration file
```

---

## 📝 Common venv Commands Cheat Sheet

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows CMD)
venv\Scripts\activate

# Activate (Windows PowerShell)
venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source venv/bin/activate

# Deactivate
deactivate

# Check Python path
which python

# Check pip path
which pip

# List installed packages
pip list

# Install package
pip install package-name

# Uninstall package
pip uninstall package-name
```

---

## 🚨 Common Issues and Solutions

### Issue 1: Permission Denied (Windows)
**Problem**: `venv\Scripts\activate` gives permission error
**Solution**: Run Command Prompt as Administrator, or use PowerShell with execution policy

### Issue 2: Command Not Found
**Problem**: `python -m venv venv` says command not found
**Solution**: Make sure Python is installed and in PATH

### Issue 3: Wrong Python Version
**Problem**: Virtual environment uses wrong Python version
**Solution**: Specify Python version: `python3 -m venv venv`

### Issue 4: Packages Still Install Globally
**Problem**: `pip install` installs to system Python
**Solution**: Make sure environment is activated (check `(venv)` in prompt)

---

## 🎯 Best Practices

### 1. One venv Per Project
```
project-a/
├── venv/
├── src/
└── requirements.txt

project-b/
├── venv/
├── src/
└── requirements.txt
```

### 2. Never Commit venv Folder
Add `venv/` to `.gitignore`

### 3. Use Descriptive Names When Needed
```bash
# For different environments
python -m venv venv-dev
python -m venv venv-prod
```

### 4. Always Activate Before Working
```bash
# Habit: cd to project, then activate
cd myproject
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

---

## 🔍 Real-World Scenarios

### Scenario 1: Django Project
```bash
mkdir django-blog
cd django-blog
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install django
django-admin startproject blog .
python manage.py runserver
```

### Scenario 2: FastAPI Project
```bash
mkdir fastapi-app
cd fastapi-app
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install fastapi uvicorn
# Create main.py with FastAPI app
uvicorn main:app --reload
```

### Scenario 3: Data Science Project
```bash
mkdir data-analysis
cd data-analysis
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install pandas numpy matplotlib jupyter
jupyter notebook
```

---

## 📋 Verification Checklist

After completing this workshop, you should be able to:

- [ ] Create a new virtual environment with `python -m venv venv`
- [ ] Activate the environment (platform-specific command)
- [ ] Verify activation by checking `(venv)` in command prompt
- [ ] Install packages with `pip install` while activated
- [ ] Confirm packages are installed in the virtual environment
- [ ] Deactivate the environment with `deactivate`
- [ ] Explain why virtual environments are important

---

## 🎓 Key Takeaways

1. **venv creates isolated Python environments** for each project
2. **Activation changes which Python/pip you're using**
3. **Packages installed in venv stay in that environment**
4. **Deactivation returns to system Python**
5. **One venv per project** prevents dependency conflicts

---

## 🚀 Next Steps

Now that you understand venv, in the next session we'll explore:
- What dependency management really means
- Why modern tools like UV are better than traditional pip
- How to use UV for faster, more reliable package management

## 📚 Additional Resources

- [Python venv Documentation](https://docs.python.org/3/library/venv.html)
- [Real Python: Virtual Environments](https://realpython.com/python-virtual-environments-a-primer/)
- [Python Packaging Guide](https://packaging.python.org/guides/installing-using-pip-and-virtual-environments/)
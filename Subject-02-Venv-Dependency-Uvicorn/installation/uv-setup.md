# UV Installation Guide

## 🎯 Overview
UV is a modern Python package manager written in Rust. This guide covers installation on different platforms.

## 📋 Prerequisites
- Python 3.8+ installed
- Terminal/Command Prompt access
- Internet connection

---

## 🪟 Windows Installation

### Method 1: PowerShell (Recommended)
```powershell
# Open PowerShell as Administrator
winget install --id=astral-sh.uv  # If winget is available

# Or using pip (alternative)
pip install uv
```

### Method 2: Using pip
```cmd
# Open Command Prompt or PowerShell
pip install uv

# Verify installation
uv --version
```

### Method 3: Standalone Installer
```powershell
# Download from GitHub releases
# https://github.com/astral-sh/uv/releases
# Run the .exe installer
```

---

## 🍎 macOS Installation

### Method 1: Homebrew (Recommended)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install UV
brew install uv
```

### Method 2: Using pip
```bash
# Install UV globally
pip install uv

# Or install with pipx for better isolation
pipx install uv
```

### Method 3: Standalone Installer
```bash
# Download from GitHub releases
# https://github.com/astral-sh/uv/releases
# Run the installer package
```

---

## 🐧 Linux Installation

### Method 1: Package Manager
```bash
# Ubuntu/Debian
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or using pip
pip install uv
```

### Method 2: Snap (Ubuntu)
```bash
sudo snap install uv --classic
```

### Method 3: Manual Installation
```bash
# Download binary from GitHub releases
# https://github.com/astral-sh/uv/releases
# Extract and add to PATH
```

---

## ✅ Verification

After installation, verify UV is working:

```bash
# Check version
uv --version

# Should show something like: uv 0.1.0

# Check help
uv --help
```

---

## 🔧 Configuration (Optional)

### Set Python Version (Optional)
```bash
# Tell UV to use a specific Python version
uv python install 3.11

# Set as default
uv python pin 3.11
```

### Configure Cache Location (Optional)
```bash
# UV automatically manages cache, but you can see where it is
uv cache dir
```

---

## 🚨 Troubleshooting

### Issue 1: Command Not Found
**Problem**: `uv` command not recognized
**Solutions**:
- Restart your terminal
- Check if UV is in PATH: `echo $PATH`
- Try full path: `/path/to/uv --version`

### Issue 2: Permission Denied
**Problem**: Installation fails due to permissions
**Solutions**:
- Use `sudo` on Linux/Mac
- Run terminal as Administrator on Windows
- Use `pipx` for user-space installation

### Issue 3: SSL Certificate Issues
**Problem**: Downloads fail due to SSL errors
**Solutions**:
- Update Python to latest version
- Use `--no-verify-ssl` temporarily (not recommended for production)

---

## 🎯 Next Steps

Once UV is installed, you can:
- Create your first UV project: `uv init myproject`
- Add dependencies: `uv add fastapi uvicorn`
- Run scripts: `uv run python main.py`

---

## 📚 Additional Resources

- [UV Official Documentation](https://docs.astral.sh/uv/)
- [UV GitHub Repository](https://github.com/astral-sh/uv)
- [UV Changelog](https://github.com/astral-sh/uv/blob/main/CHANGELOG.md)
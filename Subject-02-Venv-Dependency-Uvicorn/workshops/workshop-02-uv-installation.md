# Workshop 2: Installing UV Package Manager

## 🎯 Objective
Install UV on your system and verify it's working correctly.

## 📋 Prerequisites
- Python 3.8+ installed
- Internet connection
- Terminal/Command Prompt access

## 📚 Session Overview
**Duration**: 15-20 minutes
**Focus**: Getting UV installed and ready to use

---

## 🛠️ Installation Steps

### Step 1: Check Your Python Version
```bash
python --version
# Should show 3.8 or higher
```

### Step 2: Install UV

#### Windows
```powershell
# Using pip (recommended)
pip install uv

# Verify installation
uv --version
```

#### macOS
```bash
# Using Homebrew (recommended)
brew install uv

# Or using pip
pip install uv

# Verify
uv --version
```

#### Linux (Ubuntu/Debian)
```bash
# Using official installer
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or using pip
pip install uv

# Verify
uv --version
```

### Step 3: Test Basic Functionality
```bash
# Check UV help
uv --help

# Check available commands
uv --help | head -20
```

### Step 4: Configure UV (Optional)
```bash
# Check Python installations
uv python list

# Install a specific Python version (optional)
uv python install 3.11

# Check cache location
uv cache dir
```

---

## ✅ Verification Checklist

- [ ] Python 3.8+ is installed
- [ ] UV command is available
- [ ] `uv --version` shows version number
- [ ] `uv --help` displays help information
- [ ] Cache directory is accessible

---

## 🚨 Troubleshooting

### Issue: Command not found
```bash
# Restart terminal/command prompt
# Check if UV is in PATH
echo $PATH

# Try full path (find where UV was installed)
which uv
```

### Issue: Permission denied
```bash
# On Windows: Run as Administrator
# On Linux/Mac: Use sudo or install to user directory
pip install --user uv
```

### Issue: SSL errors
```bash
# Update Python to latest version
# Temporarily disable SSL (not recommended for production)
pip install --trusted-host pypi.org uv
```

---

## 🎯 Next Steps

With UV installed, you can now:
- Create your first UV project: `uv init myproject`
- Add dependencies: `uv add fastapi`
- Run commands: `uv run python main.py`

---

## 📚 Resources

- [UV Installation Guide](https://docs.astral.sh/uv/getting-started/installation/)
- [UV GitHub Releases](https://github.com/astral-sh/uv/releases)
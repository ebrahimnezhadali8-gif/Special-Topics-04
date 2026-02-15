# Git Installation Guide for Linux

## Overview
This guide covers Git installation on various Linux distributions and basic setup for the Git Basics course.

## Method 1: Using Package Manager (Recommended)

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Git
sudo apt install git

# Verify installation
git --version
```

### CentOS/RHEL/Fedora
```bash
# For CentOS/RHEL 7
sudo yum install git

# For CentOS/RHEL 8+ and Fedora
sudo dnf install git

# Verify installation
git --version
```

### Arch Linux
```bash
sudo pacman -S git
```

### openSUSE
```bash
sudo zypper install git
```

## Method 2: Compile from Source (Advanced)

If you need the latest version or your distribution doesn't have Git:

```bash
# Install dependencies
sudo apt install build-essential libssl-dev libcurl4-gnutls-dev libexpat1-dev gettext unzip

# Download latest Git source
wget https://github.com/git/git/archive/refs/heads/master.zip
unzip master.zip
cd git-master

# Compile and install
make prefix=/usr/local all
sudo make prefix=/usr/local install

# Clean up
cd ..
rm -rf git-master master.zip
```

## Method 3: Using Snap (Universal)
```bash
sudo snap install git-ubuntu --classic
```

## Basic Git Configuration

### Step 1: Set Your Identity
Open terminal and run these commands (replace with your actual information):

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"
```

**Example:**
```bash
git config --global user.name "John Doe"
git config --global user.email "john.doe@email.com"
```

### Step 2: Set Default Branch Name
```bash
git config --global init.defaultBranch main
```

### Step 3: Configure Line Endings for Linux
```bash
git config --global core.autocrlf input
```

### Step 4: Enable Helpful Features
```bash
git config --global pull.rebase false
git config --global credential.helper store
```

### Step 5: Verify Configuration
```bash
git config --global --list
```

## Setting Up SSH Keys (Recommended)

### Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

Press Enter for default location and enter a passphrase when prompted.

### Copy Public Key
```bash
# Display public key
cat ~/.ssh/id_ed25519.pub

# Or copy to clipboard (if available)
xclip -sel clip < ~/.ssh/id_ed25519.pub
```

### Add to GitHub/GitLab
1. Copy the entire output starting with `ssh-ed25519`
2. Go to GitHub.com → Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste your public key and save

### Test SSH Connection
```bash
ssh -T git@github.com
```

You should see:
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

## GUI Tools for Linux (Optional)

### Git Cola
```bash
# Ubuntu/Debian
sudo apt install git-cola

# Fedora
sudo dnf install git-cola

# Arch
sudo pacman -S git-cola
```

### Git GUI
```bash
# Ubuntu/Debian
sudo apt install git-gui

# Fedora
sudo dnf install git-gui
```

### Other Options
- **GitKraken**: Download from https://www.gitkraken.com/
- **SmartGit**: Commercial client with Linux support
- **Sublime Merge**: Modern Git client

## Environment Variables and PATH

### Check Git Location
```bash
which git
```

### Add to PATH (if needed)
If Git is not in your PATH, add it to your shell profile:

```bash
# For bash users
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# For zsh users
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Troubleshooting

### "git: command not found"
- Check if Git is installed: `dpkg -l | grep git` (Debian/Ubuntu)
- Try reinstalling with your package manager
- Check PATH: `echo $PATH`

### Permission Issues
- Use `sudo` for system-wide installations
- Check file permissions: `ls -la ~/.ssh/`
- Ensure proper ownership: `chown -R $USER:$USER ~/.ssh`

### SSH Issues
- Test basic SSH: `ssh -v git@github.com`
- Check SSH agent: `ssh-add -l`
- Verify key permissions: `ls -la ~/.ssh/id_ed25519*`

### Compilation Issues
If compiling from source fails:
- Install all build dependencies
- Check for missing libraries
- Try using a pre-compiled package instead

## Distribution-Specific Notes

### Ubuntu WSL (Windows Subsystem for Linux)
```bash
# Update and install
sudo apt update && sudo apt upgrade
sudo apt install git

# Configure for WSL
git config --global core.autocrlf true
```

### RHEL/CentOS with Older Versions
If your distribution has Git 1.x:
```bash
# Add IUS repository (CentOS 7)
sudo yum install https://repo.ius.io/ius-release-el7.rpm
sudo yum install git236

# Or use SCL (Software Collections)
sudo yum install centos-release-scl
sudo yum install rh-git218
```

## Verification Script

Run this comprehensive test:

```bash
#!/bin/bash
echo "=== Git Installation Verification ==="

# Check version
echo "Git version:"
git --version

echo -e "\nGit configuration:"
git config --global --list

echo -e "\nTesting basic commands..."
mkdir git-test && cd git-test
git init
echo "# Test" > README.md
git add README.md
git commit -m "Test commit"
cd .. && rm -rf git-test

echo -e "\nBasic Git functionality test: PASSED"

# Test SSH (optional)
echo -e "\nTesting SSH connection..."
if ssh -T git@github.com 2>/dev/null; then
    echo "SSH connection: SUCCESS"
else
    echo "SSH connection: Not configured or failed"
fi

echo -e "\n=== Setup Complete ==="
```

Save as `verify-git.sh`, make executable with `chmod +x verify-git.sh`, and run `./verify-git.sh`.

## Next Steps

Now that Git is installed and configured on Linux, you can:

1. [Create your first repository](../workshops/workshop-02-first-repo.md)
2. [Learn basic Git concepts](../tutorials/01-git-intro.md)
3. [Set up GitHub account](https://github.com) and start collaborating

## Additional Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [GitHub SSH Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Linux Package Management Guide](https://wiki.archlinux.org/title/Pacman/Rosetta)
- [Interactive Git Tutorial](https://learngitbranching.js.org/)

## Support

If you encounter issues:
1. Check your distribution's documentation
2. Search for your specific error message
3. Include your Linux distribution, version, and error messages when asking for help
4. Try the troubleshooting steps in this guide first
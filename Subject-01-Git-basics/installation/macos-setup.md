# Git Installation Guide for macOS

## Overview
This guide will help you install Git on macOS and set up your development environment for the Git Basics course.

## Method 1: Using Homebrew (Recommended)

### What is Homebrew?
Homebrew is a package manager for macOS that makes installing software easy.

### Install Homebrew (if not already installed)
1. Open Terminal (Applications → Utilities → Terminal)
2. Run this command:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
3. Follow the on-screen instructions
4. You may be prompted to install Command Line Tools for Xcode

### Install Git
```bash
brew install git
```

### Verify Installation
```bash
git --version
```

**Expected Output:**
```
git version 2.x.x
```

## Method 2: Using Xcode Command Line Tools

If you don't want to install Homebrew:

1. Open Terminal
2. Run: `xcode-select --install`
3. Click "Install" when prompted
4. Wait for the installation to complete

This installs Git along with other development tools.

## Method 3: Official Git Installer

1. Download from: https://git-scm.com/download/mac
2. Open the downloaded `.dmg` file
3. Double-click the `.pkg` file
4. Follow the installation wizard
5. Git will be installed to `/usr/local/git/bin/git`

## Method 4: Using MacPorts

If you have MacPorts installed:
```bash
sudo port install git
```

## Basic Git Configuration

### Step 1: Set Your Identity
Open Terminal and run these commands (replace with your actual information):

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

### Step 3: Configure Line Endings for macOS
```bash
git config --global core.autocrlf input
```

### Step 4: Enable Helpful Features
```bash
git config --global pull.rebase false
git config --global init.defaultBranch main
```

### Step 5: Verify Configuration
```bash
git config --global --list
```

## Setting Up SSH Keys (Recommended)

### Generate SSH Key
1. Open Terminal
2. Run: `ssh-keygen -t ed25519 -C "your.email@example.com"`
3. Press Enter for default location (`/Users/yourusername/.ssh/id_ed25519`)
4. Enter a passphrase (optional but recommended)
5. Your SSH key pair is now generated

### Copy Public Key to Clipboard
```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

Or manually:
```bash
cat ~/.ssh/id_ed25519.pub
```
Copy the entire output starting with `ssh-ed25519`.

### Add to GitHub
1. Go to GitHub.com → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Title: "MacBook Pro" (or your computer name)
4. Paste your public key
5. Click "Add SSH key"

### Test SSH Connection
```bash
ssh -T git@github.com
```

You should see:
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

## GUI Tools for macOS (Optional)

### GitHub Desktop
1. Download from: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. Great for beginners who prefer visual interfaces

### Other Options
- **Sourcetree**: Free Git client from Atlassian
- **GitKraken**: Modern Git GUI with advanced features
- **Tower**: Commercial Git client with excellent interface

## Path Configuration

### Check if Git is in PATH
```bash
which git
```

If it shows `/usr/local/bin/git` or similar, Git is properly configured.

### If Git Commands Don't Work
Add Git to your PATH by editing your shell profile:

1. Open Terminal
2. Run: `nano ~/.zshrc` (or `~/.bash_profile` if using bash)
3. Add this line at the end:
```
export PATH="/usr/local/bin:$PATH"
```
4. Save and exit (Ctrl+X, then Y, then Enter)
5. Restart Terminal or run: `source ~/.zshrc`

## Troubleshooting

### "command not found: git"
- Try reinstalling using one of the methods above
- Check if Git is installed: `ls /usr/local/bin/git`
- If using Homebrew, run: `brew doctor`

### Permission Issues
- Some commands may require `sudo`, but Git commands typically don't
- If you get permission errors, check file ownership: `ls -la ~/.ssh/`

### SSH Issues
- Test SSH: `ssh -T git@github.com`
- If it fails, check your key: `ls -la ~/.ssh/`
- Make sure the public key is correctly added to GitHub

### Xcode Command Line Tools Issues
If `xcode-select --install` fails:
1. Go to Apple's Developer website
2. Download and install Xcode from the Mac App Store
3. Then run: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

## Environment Setup Verification

Run this comprehensive test:

```bash
# Check Git version
git --version

# Check configuration
git config --global --list

# Test SSH connection
ssh -T git@github.com

# Create a test repository
mkdir git-test && cd git-test
git init
echo "# Test Repository" > README.md
git add README.md
git commit -m "Initial commit"
cd .. && rm -rf git-test

echo "Git setup complete!"
```

## Next Steps

Now that Git is installed and configured on macOS, you can:

1. [Create your first repository](../workshops/workshop-02-first-repo.md)
2. [Learn basic Git concepts](../tutorials/01-git-intro.md)
3. [Set up GitHub account](https://github.com) and start collaborating

## Additional Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [Homebrew Documentation](https://docs.brew.sh/)
- [GitHub SSH Key Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Interactive Git Tutorial](https://learngitbranching.js.org/)

## Support

If you encounter issues:
1. Check this troubleshooting section
2. Visit the [GitHub Community Forum](https://github.community/)
3. Include your macOS version and error messages when asking for help
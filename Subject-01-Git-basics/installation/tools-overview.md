# Git Tools and Extensions Overview

## Overview
While Git's command-line interface is powerful, various tools and extensions can enhance your Git workflow. This guide covers essential and optional tools for the Git Basics course.

## Essential Tools

### Text Editors with Git Integration

#### Visual Studio Code (Free)
- **Download**: https://code.visualstudio.com/
- **Git Features**:
  - Built-in Git commands in Source Control panel
  - Visual diff viewer
  - Commit, push, pull from the interface
  - GitLens extension for advanced features
- **Installation**: Download and run the installer
- **Best for**: Beginners and full-stack developers

#### Sublime Text (Free/Paid)
- **Download**: https://www.sublimetext.com/
- **Git Integration**: Via plugins
- **Best for**: Lightweight editing with Git support

### Terminal/Command Line Interfaces

#### Git Bash (Windows)
- **Included with**: Git for Windows installation
- **Features**: Unix-like terminal with Git commands
- **Location**: Usually `C:\Program Files\Git\git-bash.exe`
- **Best for**: Windows users who prefer Unix commands

#### Terminal (macOS)
- **Location**: Applications → Utilities → Terminal
- **Features**: Native macOS terminal with full Git support
- **Best for**: macOS users

#### GNOME Terminal / Konsole (Linux)
- **Installation**: Usually pre-installed
- **Features**: Native Linux terminals with Git support
- **Best for**: Linux users

## Optional GUI Tools

### GitHub Desktop (Free)
- **Download**: https://desktop.github.com/
- **Features**:
  - Visual repository management
  - Easy branching and merging
  - Integrated with GitHub
  - Great for beginners
- **Platforms**: Windows, macOS
- **Best for**: Visual learners and GitHub-focused workflows

### GitKraken (Free/Paid)
- **Download**: https://www.gitkraken.com/
- **Features**:
  - Beautiful visual interface
  - Advanced branching visualization
  - Integrated GitHub/GitLab support
  - Merge conflict resolution
  - Timelines and insights
- **Platforms**: Windows, macOS, Linux
- **Best for**: Teams and complex repositories

### Sourcetree (Free)
- **Download**: https://www.sourcetreeapp.com/
- **Features**:
  - Free Git client from Atlassian
  - Visual branching and merging
  - Interactive rebase
  - Bitbucket integration
- **Platforms**: Windows, macOS
- **Best for**: Users familiar with Bitbucket

### Tower (Paid)
- **Download**: https://www.git-tower.com/
- **Features**:
  - Intuitive drag-and-drop interface
  - Interactive staging
  - Detailed commit history
  - Excellent merge conflict tools
- **Platforms**: Windows, macOS
- **Best for**: Professional developers

## Git Extensions and Enhancements

### Git Aliases
Create shortcuts for common Git commands. Add these to your `.gitconfig`:

```bash
# Open Git config
git config --global --edit

# Add these aliases
[alias]
    co = checkout
    ci = commit
    st = status
    br = branch
    hist = log --pretty=format:\"%h %ad | %s%d [%an]\" --graph --date=short
    type = cat-file -t
    dump = cat-file -p
```

### Useful Git Configurations

#### Enhanced Status and Logging
```bash
# Better status output
git config --global status.short true

# Colored output
git config --global color.ui auto

# Better log format
git config --global log.decorate full

# Show branch information in prompt
git config --global bash.showBranchInPrompt true
```

#### Performance Optimizations
```bash
# Enable parallel operations
git config --global pack.threads 0

# Optimize for large repositories
git config --global core.preloadindex true
```

### Shell Enhancements

#### Bash Git Prompt (Linux/macOS)
```bash
# Clone the repository
git clone https://github.com/magicmonty/bash-git-prompt.git ~/.bash-git-prompt

# Add to ~/.bashrc
echo "source ~/.bash-git-prompt/gitprompt.sh" >> ~/.bashrc
```

#### Oh My Zsh with Git Plugin (macOS/Linux)
```bash
# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Enable git plugin (already enabled by default)
# Edit ~/.zshrc and ensure 'git' is in plugins array
```

## Development Environment Integration

### IDE Integration

#### VS Code Extensions
- **GitLens**: Advanced Git capabilities
- **Git History**: Visualize Git history
- **Git Blame**: See who changed each line

#### JetBrains IDEs (IntelliJ, PyCharm, etc.)
- Built-in Git integration
- Visual merge tools
- Commit templates
- Git workflow support

### Browser Extensions

#### Octotree (Chrome/Firefox)
- **Download**: Chrome Web Store / Firefox Add-ons
- **Features**: GitHub file tree navigation
- **Best for**: Browsing GitHub repositories

#### Refined GitHub (Chrome/Firefox)
- **Features**: Enhanced GitHub interface
- **Best for**: Improved GitHub usability

## Advanced Tools

### Git Large File Storage (LFS)
For repositories with large files:
```bash
# Install Git LFS
git lfs install

# Track file types
git lfs track "*.psd"
git lfs track "*.mov"
```

### Git Hooks
Automate tasks with Git hooks. Common hooks:
- `pre-commit`: Run tests before committing
- `commit-msg`: Validate commit messages
- `pre-push`: Run checks before pushing

Example pre-commit hook:
```bash
#!/bin/sh
# Run tests before commit
npm test
```

## Cloud and Collaboration Tools

### GitHub Features
- **GitHub Issues**: Track bugs and features
- **Projects**: Kanban-style project management
- **Actions**: CI/CD pipelines
- **Pages**: Host documentation and websites

### GitLab Features
- **CI/CD**: Built-in continuous integration
- **Container Registry**: Docker image storage
- **Wiki**: Documentation hosting
- **Snippets**: Code sharing

### Other Platforms
- **Bitbucket**: Atlassian integration
- **SourceForge**: Open source project hosting
- **Codeberg**: Community-driven Git hosting

## Learning and Practice Tools

### Interactive Learning
- **Learn Git Branching**: https://learngitbranching.js.org/
- **GitHub Learning Lab**: Hands-on GitHub exercises
- **Codecademy Git Course**: Interactive tutorials

### Practice Repositories
- **First Contributions**: https://github.com/firstcontributions/first-contributions
- **Git Game**: https://github.com/git-game/git-game
- **Practice Repository**: Create your own test repository

## Recommended Setup for Beginners

### Minimum Setup
1. **Git** (command line)
2. **Text Editor** (VS Code recommended)
3. **GitHub Account**
4. **Terminal/Command Prompt**

### Intermediate Setup
1. **All minimum tools**
2. **GitHub Desktop** or **GitKraken**
3. **SSH Keys** configured
4. **Basic Git aliases**

### Advanced Setup
1. **All intermediate tools**
2. **IDE with Git integration**
3. **Git hooks** for automation
4. **CI/CD pipeline** configured

## Tool Selection Guide

| Use Case | Recommended Tool | Why |
|----------|------------------|-----|
| Learning Git | Command Line + GitHub Desktop | Visual feedback while learning commands |
| Daily Development | VS Code + GitLens | Integrated workflow |
| Complex Repositories | GitKraken | Advanced visualization |
| Team Collaboration | GitHub + Issues | Built-in project management |
| Open Source | GitHub Desktop + Browser | Easy contribution workflow |

## Troubleshooting Tools

### Git Debug Commands
```bash
# Debug Git commands
git config --global alias.debug '!GIT_TRACE=1 git'

# Show Git environment
git debug config

# Check repository health
git fsck
```

### Network Debugging
```bash
# Test GitHub connection
ssh -T git@github.com

# Debug HTTP operations
GIT_CURL_VERBOSE=1 git clone <repository>
```

## Next Steps

1. Install your preferred text editor and GUI tool
2. Set up SSH keys for GitHub
3. Configure useful aliases and settings
4. Practice with the [workshops](../workshops/) in this course
5. Explore advanced tools as you become more comfortable with Git

## Resources

- [Git Tools Comparison](https://git-scm.com/book/en/v2/Appendix-A%3A-Git-in-Other-Environments-Graphical-Interfaces)
- [VS Code Git Documentation](https://code.visualstudio.com/docs/sourcecontrol/overview)
- [GitKraken Documentation](https://help.gitkraken.com/)
- [GitHub Desktop Guide](https://docs.github.com/en/desktop)
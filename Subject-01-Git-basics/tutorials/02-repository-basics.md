# Tutorial 2: Repository Basics

## Learning Objectives
By the end of this tutorial, you will be able to:
- Create new Git repositories
- Clone existing repositories from remote sources
- Understand repository structure and the `.git` folder
- Check repository status and history
- Use basic Git commands for repository management

## Prerequisites
- Git installed and configured (see [installation guides](../installation/))
- Basic understanding of Git concepts (see [Tutorial 1](01-git-intro.md))
- Familiarity with command line/terminal

## What is a Git Repository?

A **Git repository** (or "repo") is a directory that Git has been initialized in. It contains:
- Your project files
- A hidden `.git` folder with Git's internal data
- Complete history of all changes
- Configuration settings

There are two types of repositories:
- **Local repository**: Exists only on your computer
- **Remote repository**: Hosted on a server (like GitHub, GitLab)

## Creating a New Repository

### Method 1: Initialize in Existing Directory

If you have an existing project folder:

```bash
# Navigate to your project folder
cd my-project

# Initialize Git repository
git init

# Check what happened
ls -la
```

You'll see a new `.git` folder has been created.

### Method 2: Create New Directory and Initialize

```bash
# Create new directory and navigate to it
mkdir my-new-project
cd my-new-project

# Initialize Git
git init

# Create a README file
echo "# My Project" > README.md
```

### Method 3: Clone Existing Repository

To copy an existing repository:

```bash
# Clone from GitHub
git clone https://github.com/username/repository-name.git

# Clone from GitLab
git clone https://gitlab.com/username/repository-name.git

# Clone to specific folder name
git clone https://github.com/username/repo.git my-folder-name
```

## Understanding Repository Structure

### The `.git` Folder

The `.git` folder contains Git's internal files:

```
.git/
├── HEAD              # Points to current branch
├── config            # Repository configuration
├── refs/             # Branch and tag references
│   ├── heads/        # Local branches
│   └── tags/         # Tags
├── objects/          # Git objects (commits, trees, blobs)
├── logs/             # Reflog (history of changes)
└── index             # Staging area (binary file)
```

**Important**: Never manually edit files in `.git` folder!

### Working Directory Files

Your project files exist in the working directory. Git tracks:
- **Tracked files**: Files Git knows about
- **Untracked files**: New files not yet added to Git
- **Ignored files**: Files excluded via `.gitignore`

## Basic Repository Commands

### Check Repository Status

```bash
# Show current status
git status

# Short status format
git status --short
# or
git status -s
```

**Output example:**
```
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   README.md

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   index.html

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        new-file.txt
```

### View Commit History

```bash
# Show commit history
git log

# Compact format
git log --oneline

# Show with graph (for branches)
git log --graph --oneline

# Show specific number of commits
git log -5

# Show with dates
git log --pretty=format:"%h %ad | %s%d [%an]" --date=short
```

### Show Repository Information

```bash
# Show remote repositories
git remote -v

# Show current branch
git branch

# Show all branches (local and remote)
git branch -a

# Show current configuration
git config --list
```

## Repository Configuration

### Local Configuration (per repository)

```bash
# Set user name for this repository only
git config user.name "Your Name"
git config user.email "your.email@example.com"

# View local config
git config --local --list
```

### Global Configuration (for all repositories)

```bash
# Set global user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# View global config
git config --global --list
```

## Working with Remote Repositories

### Add Remote Repository

```bash
# Add origin remote
git remote add origin https://github.com/username/repo.git

# Verify remote
git remote -v
```

### Push to Remote

```bash
# Push main branch to origin
git push -u origin main

# Push other branches
git push origin feature-branch
```

### Pull from Remote

```bash
# Pull latest changes
git pull

# Pull from specific remote and branch
git pull origin main
```

### Fetch vs Pull

```bash
# Fetch downloads changes but doesn't merge
git fetch origin

# Pull = fetch + merge
git pull origin main
```

## Repository Maintenance

### Check Repository Health

```bash
# Check for issues
git fsck

# Clean untracked files (be careful!)
git clean -n  # Show what would be deleted
git clean -f  # Actually delete
```

### Compress Repository

```bash
# Optimize repository
git gc

# Aggressive optimization
git gc --aggressive
```

## Common Repository Scenarios

### Scenario 1: Starting a New Project

```bash
# Create project directory
mkdir my-awesome-project
cd my-awesome-project

# Initialize Git
git init

# Create initial files
echo "# My Awesome Project" > README.md
mkdir src
echo "print('Hello, World!')" > src/main.py

# Check status
git status

# Add files
git add .

# Commit
git commit -m "Initial commit"
```

### Scenario 2: Contributing to Existing Project

```bash
# Fork repository on GitHub (web interface)

# Clone your fork
git clone https://github.com/yourusername/project-name.git
cd project-name

# Add original repository as upstream
git remote add upstream https://github.com/original/project-name.git

# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit, push
# Then create pull request on GitHub
```

### Scenario 3: Working with Multiple Remotes

```bash
# Clone repository
git clone https://github.com/company/project.git
cd project

# Add multiple remotes
git remote add staging https://github.com/company/project-staging.git
git remote add production https://github.com/company/project-prod.git

# View all remotes
git remote -v
```

## Understanding Git URLs

### HTTPS URLs
```
https://github.com/username/repository.git
```
- Requires authentication (username/password or token)
- Works through firewalls
- Easier for beginners

### SSH URLs
```
git@github.com:username/repository.git
```
- Requires SSH key setup
- More secure
- Faster for frequent operations

### Convert between formats
```bash
# Change remote URL
git remote set-url origin git@github.com:username/repo.git
```

## Repository Best Practices

### Repository Structure
```
my-project/
├── .git/              # Git internal files
├── README.md          # Project description
├── .gitignore         # Files to ignore
├── src/               # Source code
├── tests/             # Test files
└── docs/              # Documentation
```

### Commit Early and Often
- Make small, focused commits
- Write clear commit messages
- Commit related changes together

### Use Meaningful Names
- Repository names should be descriptive
- Branch names should indicate purpose: `feature/user-auth`, `fix/login-bug`
- Commit messages should explain what and why

## Troubleshooting Common Issues

### "Not a git repository"
```bash
# Check if you're in the right directory
pwd
ls -la

# If .git folder is missing, re-initialize
git init
```

### "Remote origin already exists"
```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin <new-url>
```

### "Permission denied" (HTTPS)
- Use personal access token instead of password
- Or set up SSH keys

### "Repository is empty" after clone
- Check the repository URL
- Verify the repository exists and is public
- Try HTTPS instead of SSH or vice versa

## Practice Exercises

### Exercise 1: Create Local Repository
1. Create a new directory called `git-practice`
2. Initialize it as a Git repository
3. Create a `README.md` file with your name
4. Check the repository status
5. Add and commit the file

### Exercise 2: Clone a Repository
1. Find a public repository on GitHub
2. Clone it to your local machine
3. Explore the repository structure
4. Check the commit history

### Exercise 3: Repository Configuration
1. Set up user name and email for the repository
2. Create a simple `.gitignore` file
3. Add and commit these configuration files

## Summary

Key concepts covered:
- **Repository creation**: `git init` and `git clone`
- **Repository inspection**: `git status`, `git log`, `git remote`
- **Configuration**: Local vs global settings
- **Remote operations**: Adding remotes, pushing, pulling
- **Repository maintenance**: Health checks and optimization

Remember:
- Always check `git status` to understand repository state
- Use `git log` to understand project history
- Configure Git properly before starting work
- Push regularly to backup your work

Next, you'll learn about [working with files and the staging area](03-working-with-files.md).

## Additional Resources

- [Git Repository Documentation](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
- [GitHub Repository Guidelines](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories)
- [Repository Best Practices](https://www.git-tower.com/learn/git/ebook/en/command-line/basics/what-is-a-git-repository/)

## Quiz

1. What command initializes a new Git repository?
2. What's the difference between `git fetch` and `git pull`?
3. How do you check the current repository status?
4. What information does `git log` show?
5. When should you use global vs local Git configuration?
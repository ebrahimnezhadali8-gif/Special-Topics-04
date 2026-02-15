# Git Commands Cheatsheet

## Overview
This comprehensive cheatsheet covers essential Git commands for version control, organized by category with examples and use cases.

---

## 🚀 Getting Started

### Installation & Setup
```bash
# Check Git version
git --version

# Configure user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# View all configuration
git config --global --list

# Get help for any command
git help <command>
git <command> --help
```

### Repository Initialization
```bash
# Initialize new repository
git init

# Clone existing repository
git clone <repository-url>
git clone <repository-url> <directory-name>

# Add remote repository
git remote add origin <repository-url>
git remote add upstream <fork-url>

# View remote repositories
git remote -v
git remote show origin
```

---

## 📁 Working with Files

### File Status & Inspection
```bash
# Check repository status
git status
git status --short  # Concise output
git status --porcelain  # Script-friendly output

# View changes in working directory
git diff
git diff <file>  # Specific file

# View staged changes
git diff --staged
git diff --cached  # Same as --staged

# View file history
git blame <file>  # Who changed what and when
git log --follow <file>  # Follow file across renames
```

### Adding Files
```bash
# Stage specific file
git add <filename>

# Stage multiple files
git add <file1> <file2> <file3>

# Stage all changes
git add .

# Stage by pattern
git add *.txt
git add src/

# Interactive staging
git add -p  # Patch mode - choose hunks
git add -i  # Interactive mode - menu interface
```

### Committing Changes
```bash
# Commit staged changes
git commit -m "Commit message"

# Commit all tracked files (stage + commit)
git commit -a -m "Commit message"

# Amend last commit
git commit --amend -m "New message"
git commit --amend --no-edit  # Keep same message

# Commit with detailed message
git commit -m "Title

Detailed description of changes made.
- Bullet point 1
- Bullet point 2
- Fixes #123"
```

### Removing & Renaming Files
```bash
# Remove file from working directory and staging
git rm <filename>

# Remove from staging area only
git rm --cached <filename>

# Rename/move file
git mv <old-name> <new-name>
git mv <file> <new-directory>/

# Manual rename (same result)
mv <old-name> <new-name>
git rm <old-name>
git add <new-name>
```

---

## 🌿 Branching

### Branch Management
```bash
# List branches
git branch
git branch -a  # All branches (local + remote)
git branch -v  # Verbose (with last commit)
git branch --merged    # Branches merged into current
git branch --no-merged # Branches not merged

# Create branch
git branch <branch-name>

# Create and switch to branch
git checkout -b <branch-name>
git switch -c <branch-name>  # Git 2.23+

# Switch to existing branch
git checkout <branch-name>
git switch <branch-name>  # Git 2.23+

# Rename branch
git branch -m <old-name> <new-name>
git branch -M <old-name> <new-name>  # Force rename

# Delete branch
git branch -d <branch-name>  # Safe delete
git branch -D <branch-name>  # Force delete
```

### Merging Branches
```bash
# Merge branch into current branch
git merge <branch-name>

# Merge with custom commit message
git merge <branch> -m "Merge branch feature-x"

# Abort merge (if conflicts)
git merge --abort

# Merge strategies
git merge --no-ff <branch>  # Always create merge commit
git merge --ff-only <branch> # Fast-forward only
git merge --squash <branch> # Squash into single commit
```

### Rebasing
```bash
# Rebase current branch onto another
git rebase <base-branch>

# Interactive rebase (edit history)
git rebase -i HEAD~3  # Last 3 commits
git rebase -i <commit-hash>

# Continue rebase after resolving conflicts
git rebase --continue

# Abort rebase
git rebase --abort

# Rebase commands in interactive mode:
# pick = use commit
# reword = edit message
# edit = amend commit
# squash = merge with previous
# fixup = merge and discard message
# drop = remove commit
```

---

## 🔄 Remote Operations

### Working with Remotes
```bash
# View remote repositories
git remote -v
git remote show <remote-name>

# Add remote
git remote add <name> <url>

# Remove remote
git remote remove <name>

# Rename remote
git remote rename <old-name> <new-name>

# Change remote URL
git remote set-url origin <new-url>
```

### Pushing & Pulling
```bash
# Push branch to remote
git push <remote> <branch>
git push origin main

# Push and set upstream
git push -u origin main
git push --set-upstream origin main

# Push all branches
git push --all origin

# Push tags
git push --tags

# Pull changes
git pull
git pull origin main

# Pull with rebase (avoid merge commits)
git pull --rebase

# Fetch without merging
git fetch <remote>
git fetch --all  # All remotes
```

### Tracking Branches
```bash
# Set upstream branch
git branch --set-upstream-to=origin/main

# View tracking branches
git branch -vv

# Unset upstream
git branch --unset-upstream
```

---

## 📚 History & Logs

### Viewing History
```bash
# Basic log
git log

# Compact log
git log --oneline

# Log with graph
git log --graph --oneline --all

# Log with decorations
git log --decorate

# Log with dates
git log --pretty=format:"%h %ad | %s%d [%an]" --date=short

# Log for specific author
git log --author="John Doe"

# Log for date range
git log --since="2023-01-01" --until="2023-12-31"

# Log with file changes
git log --stat
git log --name-only

# Log following renames
git log --follow <file>
```

### Searching History
```bash
# Search commit messages
git log --grep="bug fix"

# Search code changes
git log -S "function_name"  # Search for additions/removals
git log -G "regex"         # Search with regex

# Show changes in commit
git show <commit-hash>
git show HEAD~2  # Two commits ago
git show <commit>:file.txt  # Specific file in commit
```

### Reflog (Reference Log)
```bash
# View all reference changes
git reflog

# Reflog for specific branch
git reflog show main

# Find lost commits
git reflog | grep "commit message"
```

---

## 🏷️ Tags

### Tag Management
```bash
# List tags
git tag
git tag -l "v1.*"  # Pattern matching

# Create lightweight tag
git tag v1.0

# Create annotated tag
git tag -a v1.0 -m "Version 1.0 release"

# Tag specific commit
git tag -a v2.0 <commit-hash>

# Delete tag
git tag -d v1.0

# Push tags
git push origin v1.0
git push origin --tags
```

---

## 🔧 Advanced Operations

### Stashing Changes
```bash
# Stash working directory changes
git stash
git stash save "Work in progress"

# Stash untracked files too
git stash -u
git stash --include-untracked

# List stashes
git stash list

# Apply stash
git stash apply
git stash apply stash@{1}  # Specific stash

# Apply and remove stash
git stash pop

# Create branch from stash
git stash branch <branch-name>

# Delete stash
git stash drop stash@{1}
```

### Resetting Changes
```bash
# Soft reset (keep changes staged)
git reset --soft HEAD~1

# Mixed reset (unstage but keep changes)
git reset HEAD~1
git reset --mixed HEAD~1

# Hard reset (discard all changes)
git reset --hard HEAD~1

# Reset to specific commit
git reset --hard <commit-hash>

# Reset specific file
git checkout HEAD -- <file>
```

### Cherry Picking
```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry pick multiple commits
git cherry-pick <hash1> <hash2>

# Cherry pick range
git cherry-pick <start>..<end>

# Continue after resolving conflicts
git cherry-pick --continue

# Abort cherry pick
git cherry-pick --abort
```

---

## 🔍 Searching & Finding

### Finding Files
```bash
# Find file by name
git ls-files | grep "pattern"

# Find files with specific content
git grep "search term"
git grep -n "search term"  # With line numbers
git grep --heading "search term"  # Group by file

# Search in specific commit
git grep "term" <commit-hash>

# Search with regex
git grep -E "regex_pattern"
```

### Finding Commits
```bash
# Find commits that changed specific text
git log -S "function_name"

# Find commits that added/removed specific line
git log -p -S "specific line of code"

# Find when file was added
git log --diff-filter=A -- <file>

# Find when file was deleted
git log --diff-filter=D -- <file>
```

---

## 🛠️ Maintenance & Cleanup

### Repository Maintenance
```bash
# Compress repository
git gc
git gc --aggressive  # More thorough

# Clean untracked files
git clean -n  # Preview
git clean -f  # Remove
git clean -fd  # Remove files and directories

# Check repository health
git fsck

# Verify connectivity
git fsck --connectivity-only
```

### Configuration Management
```bash
# List all config
git config --list --show-origin

# Repository-specific config
git config --local user.name "Different Name"
git config --local --list

# Global config
git config --global --list

# System config
git config --system --list
```

---

## 🚨 Emergency Commands

### When Things Go Wrong
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (remove changes)
git reset --hard HEAD~1

# Undo merge
git reset --hard HEAD~1  # If just merged
git reset --hard ORIG_HEAD  # If merge had conflicts

# Recover lost commits
git reflog
git reset --hard <commit-hash>

# Abort operations
git merge --abort
git rebase --abort
git cherry-pick --abort
git revert --abort

# Discard all uncommitted changes
git reset --hard HEAD
git clean -fd
```

---

## 📋 Workflows

### Feature Branch Workflow
```bash
# Start new feature
git checkout -b feature/new-feature

# Work on feature (multiple commits)
git add .
git commit -m "Implement feature part 1"
git add .
git commit -m "Implement feature part 2"

# Push feature branch
git push -u origin feature/new-feature

# Create pull request on GitHub

# After approval, merge
git checkout main
git pull origin main
git merge feature/new-feature
git push origin main
git branch -d feature/new-feature
```

### Hotfix Workflow
```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# Fix the bug
git add fix.txt
git commit -m "Fix critical security bug"

# Merge directly to main
git checkout main
git merge hotfix/critical-bug
git push origin main

# Also merge to develop if it exists
git checkout develop
git merge hotfix/critical-bug
git push origin develop

# Clean up
git branch -D hotfix/critical-bug
```

---

## 🎯 Best Practices Summary

### Commit Messages
```bash
# Good commit message format
type(scope): description

Detailed explanation if needed.

- Bullet point for changes
- Another bullet point
- Fixes #123
```

### Common Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style
- `refactor:` - Code refactoring
- `test:` - Testing
- `chore:` - Maintenance

### Daily Workflow
```bash
# Start of day
git pull --rebase
git status

# During work
git add <files>
git commit -m "feat: add user login"
git push

# Before end of day
git pull --rebase
git push
```

### Branch Naming
```
feature/user-authentication
bugfix/login-validation
hotfix/security-patch
release/v2.1.0
```

---

## 📚 Additional Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [Git Book (free)](https://git-scm.com/book/en/v2)
- [Interactive Git Tutorial](https://learngitbranching.js.org/)
- [GitHub Git Cheat Sheet](https://github.github.com/training-kit/downloads/github-git-cheat-sheet/)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)

---

## 🔍 Quick Reference

| Command | Description |
|---------|-------------|
| `git status` | Check repository state |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Commit staged changes |
| `git log --oneline` | View commit history |
| `git branch` | List branches |
| `git checkout -b name` | Create and switch branch |
| `git merge branch` | Merge branch |
| `git push origin main` | Push to remote |
| `git pull` | Pull latest changes |

*Remember: Always check `git status` before committing, and pull before pushing!* 
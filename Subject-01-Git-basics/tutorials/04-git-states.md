# Tutorial 4: Understanding Git States

## Learning Objectives
By the end of this tutorial, you will be able to:
- Understand Git's three main areas: working directory, staging area, and repository
- Explain how files move between different states
- Use commands to manage file states effectively
- Troubleshoot common state-related issues
- Understand Git's internal file tracking system

## Prerequisites
- Basic Git commands (see [Tutorial 3](03-working-with-files.md))
- Understanding of repository structure (see [Tutorial 2](02-repository-basics.md))
- Familiarity with file operations

## Git's Three Main Areas

Git operates with three main areas where your files can exist:

### 1. Working Directory
- **What it is**: Your local file system where you edit files
- **What it contains**: Actual files you can see and modify
- **Git's view**: Current state of your project on disk
- **Commands**: Regular file operations (create, edit, delete)

### 2. Staging Area (Index)
- **What it is**: A preparation area for the next commit
- **What it contains**: Changes you've marked to be included in next commit
- **Git's view**: Snapshot of what will be committed
- **Commands**: `git add`, `git reset`, `git rm --cached`

### 3. Repository (HEAD)
- **What it is**: Where committed snapshots are permanently stored
- **What it contains**: Complete history of all committed changes
- **Git's view**: Official project history
- **Commands**: `git commit`, `git log`, `git show`

## File States in Detail

### Untracked Files
Files that exist in the working directory but Git doesn't know about yet.

```bash
# Create a new file
echo "Hello World" > newfile.txt

# Check status
git status
# Output: Untracked files: newfile.txt
```

**How to handle:**
- `git add newfile.txt` → moves to staged
- Ignore with `.gitignore` → stays untracked but ignored

### Tracked Files - Unmodified
Files that are in the repository and match the last commit.

```bash
# File committed and unchanged
git status
# Shows clean working directory
```

### Tracked Files - Modified
Files that exist in repository but have been changed in working directory.

```bash
# Edit an existing file
echo "New content" >> existing.txt

git status
# Output: Changes not staged for commit: modified: existing.txt
```

**How to handle:**
- `git add existing.txt` → moves to staged
- `git checkout -- existing.txt` → discards changes

### Staged Files
Files in the staging area, ready for commit.

```bash
git add existing.txt

git status
# Output: Changes to be committed: modified: existing.txt
```

**How to handle:**
- `git commit` → moves to repository
- `git reset HEAD existing.txt` → moves back to modified

## State Transitions

### The Complete File Lifecycle

```
Untracked ────── git add ──────► Staged ────── git commit ──────► Committed
    ▲                                │                                │
    │                                │                                │
    └──────── git rm --cached ───────┘                                │
                                                                     │
    ┌────────────────────────────────────────────────────────────────┘
    │
    ▼
Modified ◄──── git checkout ──────┐
    ▲                             │
    │                             │
    └────── git add ──────────────┘
```

### Common State Transitions

#### Adding New Files
```bash
# Start: Untracked
echo "content" > newfile.txt
git status  # Shows: Untracked files

# Transition: Untracked → Staged
git add newfile.txt
git status  # Shows: Changes to be committed (new file)

# Transition: Staged → Committed
git commit -m "Add new file"
git status  # Shows: nothing to commit (clean)
```

#### Modifying Existing Files
```bash
# Start: Committed (clean state)
echo "new content" >> existing.txt
git status  # Shows: Changes not staged for commit (modified)

# Transition: Modified → Staged
git add existing.txt
git status  # Shows: Changes to be committed (modified)

# Transition: Staged → Committed
git commit -m "Update existing file"
git status  # Shows: clean
```

#### Unstaging Changes
```bash
# Have staged changes
git add file.txt
git status  # Shows: Changes to be committed

# Transition: Staged → Modified
git reset HEAD file.txt
git status  # Shows: Changes not staged for commit
```

## Inspecting States

### Check Current State

```bash
# Overall status
git status

# Short format
git status --short
# ?? = untracked
# A  = added (staged)
# M  = modified
# MM = modified in working + staged
# D  = deleted
```

### View Changes Between States

```bash
# Working directory vs staging area
git diff

# Staging area vs last commit
git diff --staged

# Working directory vs last commit
git diff HEAD

# Specific file comparisons
git diff HEAD~1 HEAD  # Last two commits
git diff branch1 branch2  # Between branches
```

### View Staged Files

```bash
# See what's in staging area
git ls-files --stage

# See staged changes
git diff --cached
```

## Managing File States

### Adding Files Selectively

```bash
# Add all files
git add .

# Add specific files
git add file1.txt file2.js

# Add by pattern
git add *.txt
git add src/

# Interactive adding (choose hunks)
git add -p
```

### Removing Files from Different States

```bash
# From working directory and staging area
git rm file.txt

# From staging area only (keep in working directory)
git rm --cached file.txt

# Remove untracked files
git clean -f  # Remove untracked files
git clean -fd  # Remove untracked files and directories
git clean -n  # Preview what would be removed
```

### Resetting File States

```bash
# Unstage all files
git reset

# Unstage specific file
git reset HEAD file.txt

# Reset to specific commit (affects working directory)
git reset --hard HEAD~1

# Reset staging area but keep working directory changes
git reset --soft HEAD~1
```

## Understanding the Index (Staging Area)

### What is the Index?
- A binary file (`.git/index`) that stores staging information
- Contains file paths, timestamps, and SHA-1 hashes
- Acts as a "proposed next commit"

### Index Operations

```bash
# View index contents
git ls-files --stage

# Update index manually (advanced)
git update-index --add file.txt

# Clear index
git read-tree --empty
```

## Practical Scenarios

### Scenario 1: Fixing Accidental Staging

```bash
# You accidentally staged a file
git add secret-passwords.txt

# Check what's staged
git status

# Unstage the file
git reset HEAD secret-passwords.txt

# File is back to modified state
git status
```

### Scenario 2: Selective Commit

```bash
# You modified multiple files but want to commit them separately
echo "fix1" >> file1.txt
echo "fix2" >> file2.txt
echo "fix3" >> file3.txt

# Stage only file1.txt
git add file1.txt

# Commit only the first fix
git commit -m "Fix issue #1"

# Stage and commit the second fix
git add file2.txt
git commit -m "Fix issue #2"

# Stage and commit the third fix
git add file3.txt
git commit -m "Fix issue #3"
```

### Scenario 3: Undoing Changes

```bash
# You made changes but want to start over

# Discard working directory changes (back to last commit)
git checkout -- file.txt

# Discard staged changes too
git reset --hard HEAD

# Go back to previous commit (destroys current changes!)
git reset --hard HEAD~1
```

## Troubleshooting State Issues

### "Changes not staged for commit"
```bash
# This means files are modified but not staged
git status

# Stage the changes
git add .

# Or stage specific files
git add filename.txt
```

### "Nothing added to commit"
```bash
# Check if files are staged
git status

# If no changes are staged, add files first
git add .

# If working directory is clean, there are no changes to commit
```

### Lost Changes
```bash
# Use reflog to find lost commits
git reflog

# Recover specific commit
git checkout <commit-hash>

# Create branch from lost state
git checkout -b recovery-branch <commit-hash>
```

### Confusing Status Output
```bash
# Use short status for clarity
git status -s

# Use porcelain format for scripts
git status --porcelain

# Check diff to understand changes
git diff
git diff --staged
```

## Best Practices

### State Management
- Always check `git status` before committing
- Use `git diff` to review changes before staging
- Stage logically related changes together
- Write descriptive commit messages

### Staging Strategy
- Stage complete features, not partial work
- Don't mix unrelated changes in one commit
- Use `git add -p` for fine-grained control
- Review staged changes with `git diff --staged`

### Recovery Planning
- Commit early and often to avoid losing work
- Use branches for experimental changes
- Don't use `git reset --hard` on uncommitted work
- Use `git stash` to temporarily save work

## Advanced State Concepts

### Detached HEAD State
When HEAD points directly to a commit, not a branch.

```bash
# Enter detached HEAD
git checkout <commit-hash>

# Create branch to exit detached HEAD
git checkout -b new-branch
```

### Stashing (Temporary State Saving)
```bash
# Save current work temporarily
git stash

# List stashes
git stash list

# Restore stashed work
git stash pop

# Apply without removing from stash
git stash apply
```

## Practice Exercises

### Exercise 1: State Exploration
1. Create a new file and check its state
2. Add it to staging and check state again
3. Modify the file and check all three areas
4. Commit and verify final state

### Exercise 2: Selective Staging
1. Modify three different files
2. Use `git add -p` to stage only parts of the changes
3. Check status and diffs at each step
4. Commit and verify what was actually committed

### Exercise 3: State Recovery
1. Make some changes and stage them
2. Use different reset commands to see their effects
3. Practice unstaging and discarding changes
4. Use reflog to track your actions

## Summary

Git's three areas work together to give you precise control over your code:

- **Working Directory**: Where you make changes
- **Staging Area**: Where you prepare commits
- **Repository**: Where history is stored

Key commands:
- `git status` - Check current state
- `git add` - Move to staging
- `git diff` - Compare states
- `git commit` - Move to repository
- `git reset` - Move backwards through states

Remember: Understanding states is key to mastering Git. Always know where your files are and how to move them between states.

Next, you'll learn about [branching fundamentals](05-branching-fundamentals.md).

## Additional Resources

- [Git Book: Git Basics](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials/inspecting-a-repository)
- [Git State Visualization](https://git-school.github.io/visualizing-git/)

## Quiz

1. What are Git's three main areas?
2. How do you check what's in the staging area?
3. What's the difference between `git reset HEAD` and `git reset --hard`?
4. How do you view changes between different states?
5. What happens when you run `git checkout -- file.txt`?
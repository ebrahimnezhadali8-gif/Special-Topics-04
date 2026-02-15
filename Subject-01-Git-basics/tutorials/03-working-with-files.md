# Tutorial 3: Working with Files in Git

## Learning Objectives
By the end of this tutorial, you will be able to:
- Understand Git's file states (untracked, modified, staged, committed)
- Use `git add` to stage files for commit
- Create commits with meaningful messages
- View and compare file changes using `git diff`
- Remove and rename files in Git

## Prerequisites
- Git repository created (see [Tutorial 2](02-repository-basics.md))
- Basic Git commands familiarity
- Understanding of working directory vs repository

## Git File States

Git tracks files in four main states:

### 1. Untracked
- Files that exist in your working directory but Git doesn't know about yet
- New files you haven't added to Git
- Git won't include these in commits unless you explicitly add them

### 2. Modified (Tracked but Changed)
- Files Git knows about that have been changed since last commit
- Changes exist in working directory but not staged for commit

### 3. Staged
- Files you've marked to be included in the next commit
- Changes are in the staging area (index)
- Ready to be committed

### 4. Committed
- Changes that have been saved to the repository history
- Permanent part of the project's history

## The Git Workflow

```
Working Directory ── git add ──► Staging Area ── git commit ──► Repository
       ▲                        ▲                        │
       │                        │                        │
       └──── git checkout ───────┘                        │
                                                         ▼
                                                    Remote Repository
```

## Adding Files to Git

### Add Specific Files

```bash
# Add a single file
git add filename.txt

# Add multiple specific files
git add file1.txt file2.js

# Add files in a directory
git add src/
```

### Add All Files

```bash
# Add all changes (tracked and untracked)
git add .

# Add all changes in current directory only
git add --all
```

### Interactive Add

```bash
# Interactively choose hunks to stage
git add -p

# Interactively choose files to stage
git add -i
```

## Checking File Status

### Basic Status

```bash
# Show status of working directory and staging area
git status

# Short format (more concise)
git status --short
# or
git status -s
```

**Status Symbols:**
- `??` - Untracked files
- `A` - Added (staged)
- `M` - Modified
- `D` - Deleted
- `R` - Renamed

### Detailed Status Examples

**Fresh repository:**
```bash
$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        README.md
        script.py

nothing added to commit but untracked files present (use "git add" to track)
```

**After adding files:**
```bash
$ git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   README.md
        new file:   script.py
```

## Viewing Changes

### Compare Working Directory with Staging Area

```bash
# Show unstaged changes
git diff

# Show changes for specific file
git diff filename.txt

# Show changes in specific directory
git diff src/
```

### Compare Staging Area with Last Commit

```bash
# Show staged changes
git diff --staged
# or
git diff --cached

# Show staged changes for specific file
git diff --staged filename.txt
```

### Compare with Specific Commit

```bash
# Compare with specific commit
git diff HEAD~1

# Compare specific commit with its parent
git diff HEAD~1 HEAD

# Compare two commits
git diff abc123 def456
```

## Making Commits

### Basic Commit

```bash
# Commit all staged changes
git commit -m "Add user authentication feature"

# Commit with detailed message
git commit -m "Add user authentication feature

- Implement login form
- Add password validation
- Create user session management"
```

### Commit Specific Files

```bash
# Stage and commit in one step
git commit filename.txt -m "Fix typo in documentation"

# Commit specific staged files
git commit file1.txt file2.txt -m "Update configuration files"
```

### Amend Last Commit

```bash
# Change last commit message
git commit --amend -m "New commit message"

# Add forgotten files to last commit
git add forgotten-file.txt
git commit --amend --no-edit
```

## Writing Good Commit Messages

### Commit Message Structure

```
Short summary (50 chars max)

Detailed description of changes (optional)

- Bullet point 1
- Bullet point 2
- Bullet point 3
```

### Good Commit Messages

```bash
# Good: Clear and descriptive
git commit -m "Add user registration form

- Create registration.html template
- Add client-side validation
- Implement backend registration endpoint"

# Good: Start with verb
git commit -m "Fix login timeout issue"

# Good: Reference issue numbers
git commit -m "Fix #123: Resolve memory leak in image processor"
```

### Bad Commit Messages

```bash
# Bad: Too vague
git commit -m "Update"

# Bad: No verb
git commit -m "Login bug"

# Bad: Too long single line
git commit -m "Fixed the login issue that was causing problems with user authentication and also updated some other stuff"
```

## Removing and Renaming Files

### Remove Files

```bash
# Remove file from working directory and staging area
git rm filename.txt

# Remove from staging area only (keep in working directory)
git rm --cached filename.txt

# Remove all files matching pattern
git rm *.log
```

### Rename/Move Files

```bash
# Rename file (Git tracks this as rename)
git mv oldname.txt newname.txt

# Move file to different directory
git mv file.txt src/file.txt

# Equivalent to manual rename
mv oldname.txt newname.txt
git rm oldname.txt
git add newname.txt
```

## Ignoring Files

### Create .gitignore File

```bash
# Create .gitignore
echo "*.log" > .gitignore
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore

# Add and commit .gitignore
git add .gitignore
git commit -m "Add .gitignore file"
```

### Common .gitignore Patterns

```bash
# Logs
*.log
logs/

# Runtime data
pids
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/
vendor/

# Environment variables
.env
.env.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db
```

## Practical Workflow Examples

### Example 1: Adding New Feature

```bash
# Check current status
git status

# Create new files
echo "function newFeature() { return 'Hello'; }" > feature.js
mkdir tests
echo "test feature" > tests/feature.test.js

# Check what changed
git status

# Stage the new files
git add feature.js tests/

# Check staged changes
git diff --staged

# Commit the feature
git commit -m "Add new feature with tests

- Implement newFeature function
- Add unit tests for the feature"
```

### Example 2: Fixing a Bug

```bash
# Check status
git status

# Edit the buggy file
# Fix the bug in bug.js

# Check what changed
git diff

# Stage the fix
git add bug.js

# Check staged changes
git diff --staged

# Commit the fix
git commit -m "Fix null pointer exception in user validation

- Add null check before accessing user properties
- Add unit test for edge case"
```

### Example 3: Refactoring Code

```bash
# Check status
git status

# Make refactoring changes across multiple files
# Rename functions, reorganize code structure

# Check all changes
git diff

# Stage related changes together
git add -p  # Interactive staging

# Commit refactoring
git commit -m "Refactor authentication module

- Extract validation logic to separate function
- Rename variables for clarity
- Add error handling"
```

## Troubleshooting

### "Nothing to commit" Error

```bash
# Check if files are staged
git status

# If files are modified but not staged
git add .

# If no changes at all
git status
# Check if you're on the right branch
git branch
```

### Accidental Staging

```bash
# Unstage specific file
git reset HEAD filename.txt

# Unstage all files
git reset HEAD

# Unstage and discard changes (CAUTION!)
git checkout -- filename.txt
```

### Lost Changes

```bash
# Find lost commits
git reflog

# Recover lost commit
git checkout <commit-hash>

# Create branch from lost commit
git checkout -b recovered-branch <commit-hash>
```

## Best Practices

### Staging Habits
- Stage related changes together
- Don't stage unrelated changes in same commit
- Review changes with `git diff --staged` before committing

### Commit Frequency
- Commit early and often
- Each commit should be a logical unit of work
- Don't commit broken code (unless using feature branches)

### File Organization
- Keep file names descriptive
- Use consistent naming conventions
- Organize files in logical directory structure

## Practice Exercises

### Exercise 1: File States
1. Create a new file called `test.txt`
2. Check `git status` - what state is the file in?
3. Add the file with `git add test.txt`
4. Check `git status` again - what changed?
5. Modify the file content
6. Check `git status` - how many states are shown?

### Exercise 2: Making Commits
1. Create a simple script file
2. Add it to Git
3. Commit with a good message
4. Modify the script
5. Check the diff
6. Commit the changes

### Exercise 3: File Operations
1. Create several files and directories
2. Add them to Git in separate commits
3. Rename a file using `git mv`
4. Remove a file using `git rm`
5. Check the history to see how Git tracks renames and deletions

## Summary

Key commands covered:
- `git add` - Stage files for commit
- `git status` - Check repository state
- `git diff` - View changes
- `git commit` - Save changes to history
- `git rm` / `git mv` - Remove and rename files

Remember:
- Always check `git status` before and after operations
- Use `git diff` to review changes before staging
- Write clear, descriptive commit messages
- Stage logically related changes together

Next, you'll learn about [Git states and the staging area](04-git-states.md).

## Additional Resources

- [Git Book: Recording Changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials/saving-changes)
- [Commit Message Guidelines](https://chris.beams.io/posts/git-commit/)

## Quiz

1. What are the four main states of files in Git?
2. What's the difference between `git diff` and `git diff --staged`?
3. How do you unstage a file that was accidentally added?
4. What makes a good commit message?
5. How does Git track file renames and deletions?
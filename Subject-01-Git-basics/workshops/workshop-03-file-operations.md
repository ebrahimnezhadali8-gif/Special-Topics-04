# Workshop 3: File Operations (Add, Commit, Push)

## Duration: 60-75 minutes

## Objective
By the end of this workshop, you will master file operations in Git, including staging, committing, and pushing to remote repositories.

## Prerequisites
- Git installed and configured ([Workshop 1](workshop-01-basic-setup.md))
- Basic repository created ([Workshop 2](workshop-02-first-repo.md))
- Understanding of Git states ([Tutorial 4](../tutorials/04-git-states.md))

## Materials Needed
- Computer with Git installed
- Terminal/command prompt
- Text editor
- GitHub account (for remote operations)

---

## Part 1: Setting Up a Test Repository

### Step 1: Create Test Repository

**What you'll do:** Create a fresh repository for practicing file operations.

**Instructions:**
1. Create and enter a new directory:
   ```bash
   mkdir git-file-practice
   cd git-file-practice
   ```

2. Initialize Git repository:
   ```bash
   git init
   ```

3. Create initial files:
   ```bash
   echo "# File Operations Practice" > README.md
   echo "print('Hello, Git!')" > hello.py
   echo "console.log('Hello, Git!');" > hello.js
   mkdir styles
   echo "body { color: blue; }" > styles/main.css
   ```

---

## Part 2: Understanding File States

### Step 2: Explore Initial State

**What you'll do:** Observe how Git sees your files.

**Instructions:**
```bash
git status
```

**Expected Output:**
```
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        README.md
        hello.js
        hello.py
        styles/main.css

nothing added to commit but untracked files present (use "git add" to track)
```

**Discussion Points:**
- What does "Untracked" mean?
- Why are files "not staged for commit"?
- What happens when you run `git add`?

### Step 3: Stage Files Selectively

**What you'll do:** Practice different ways to stage files.

**Instructions:**
1. Stage individual files:
   ```bash
   git add README.md
   git add hello.py
   ```

2. Check status:
   ```bash
   git status
   ```

**Expected Output:**
```
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   README.md
        new file:   hello.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        hello.js
        styles/main.css
```

3. Stage remaining files:
   ```bash
   git add .
   ```

4. Check final status:
   ```bash
   git status
   ```

---

## Part 3: Making Commits

### Step 4: Your First Commit

**What you'll do:** Create your initial commit.

**Instructions:**
```bash
git commit -m "Initial commit: Add basic project files"
```

**Expected Output:**
```
[main (root-commit) abc1234] Initial commit: Add basic project files
 4 files changed, 6 insertions(+)
 create mode 100644 README.md
 create mode 100644 hello.js
 create mode 100644 hello.py
 create mode 100644 styles/main.css
```

### Step 5: View Commit Details

**Instructions:**
```bash
git show HEAD
```

**Discussion:** What information does this show?

---

## Part 4: Modifying Files

### Step 6: Make Changes to Existing Files

**What you'll do:** Modify tracked files and observe state changes.

**Instructions:**
1. Edit README.md:
   ```bash
   echo "" >> README.md
   echo "## Project Description" >> README.md
   echo "This project demonstrates Git file operations." >> README.md
   ```

2. Edit hello.py:
   ```bash
   echo "# Enhanced hello script" > hello.py
   echo "" >> hello.py
   echo "def greet(name):" >> hello.py
   echo "    return f'Hello, {name}!' " >> hello.py
   echo "" >> hello.py
   echo "print(greet('Git User'))" >> hello.py
   ```

3. Check status:
   ```bash
   git status
   ```

**Expected Output:**
```
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   README.md
        modified:   hello.py

no changes added to commit (use "git add" and/or "git commit -a")
```

### Step 7: View Changes

**Instructions:**
```bash
git diff
```

**Discussion:** What does this show? How is it different from `git diff --staged`?

### Step 8: Stage and Commit Changes

**Instructions:**
1. Stage both files:
   ```bash
   git add README.md hello.py
   ```

2. Check what will be committed:
   ```bash
   git diff --staged
   ```

3. Commit changes:
   ```bash
   git commit -m "Enhance README and add greeting function to hello.py"
   ```

---

## Part 5: Working with New Files

### Step 9: Add New Files

**What you'll do:** Create and add new files to the repository.

**Instructions:**
1. Create new files:
   ```bash
   echo "# Test file for Git operations" > test.txt
   mkdir scripts
   echo "#!/bin/bash" > scripts/build.sh
   echo "echo 'Building project...'" >> scripts/build.sh
   echo "python hello.py" >> scripts/build.sh
   chmod +x scripts/build.sh
   ```

2. Check status:
   ```bash
   git status
   ```

3. Add specific files:
   ```bash
   git add test.txt
   git add scripts/
   ```

4. Commit new files:
   ```bash
   git commit -m "Add test file and build script"
   ```

---

## Part 6: Interactive Staging

### Step 10: Practice Selective Staging

**What you'll do:** Learn to stage only parts of file changes.

**Instructions:**
1. Make multiple changes to hello.py:
   ```bash
   echo "" >> hello.py
   echo "# Add more features" >> hello.py
   echo "def farewell(name):" >> hello.py
   echo "    return f'Goodbye, {name}!' " >> hello.py
   echo "" >> hello.py
   echo "print(farewell('Git User'))" >> hello.py
   ```

2. Make changes to README.md:
   ```bash
   echo "" >> README.md
   echo "## Installation" >> README.md
   echo "Clone the repository and run the build script." >> README.md
   ```

3. Check status:
   ```bash
   git status
   ```

4. Use interactive add (if available):
   ```bash
   git add -p
   ```
   - Type `y` to stage hunks you want
   - Type `n` to skip hunks
   - Type `s` to split large hunks
   - Type `q` to quit

5. Or stage files individually:
   ```bash
   git add hello.py
   git status
   ```

6. Commit staged changes:
   ```bash
   git commit -m "Add farewell function to hello.py"
   ```

---

## Part 7: Understanding Commit History

### Step 11: View Commit History

**Instructions:**
```bash
git log --oneline
```

**Expected Output:**
```
def5678 Add farewell function to hello.py
bcd3456 Add test file and build script
abc1234 Enhance README and add greeting function to hello.py
xyz7890 Initial commit: Add basic project files
```

### Step 12: Compare Commits

**Instructions:**
```bash
git diff HEAD~2 HEAD  # Compare 2 commits ago with latest
```

---

## Part 8: Pushing to Remote Repository

### Step 13: Create GitHub Repository

**What you'll do:** Set up a remote repository on GitHub.

**Instructions:**
1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New repository" (green button)
3. Repository name: `git-file-practice`
4. Description: `Practice repository for Git file operations`
5. Keep it public
6. **Don't initialize with README** (we already have one)
7. Click "Create repository"

### Step 14: Connect Local Repository to GitHub

**Instructions:**
```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/git-file-practice.git

# Verify remote
git remote -v
```

**Expected Output:**
```
origin  https://github.com/YOUR_USERNAME/git-file-practice.git (fetch)
origin  https://github.com/YOUR_USERNAME/git-file-practice.git (push)
```

### Step 15: Push Your Work

**Instructions:**
```bash
git push -u origin main
```

**Expected Output:**
```
Enumerating objects: 12, done.
Counting objects: 100% (12/12), done.
Delta compression using up to 4 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (12/12), 1.02 KiB | 1.02 KiB/s, done.
Total 12 (delta 2), reused 0 (delta 0), pack-objects
remote: Resolving deltas: 100% (2/2), done.
To https://github.com/YOUR_USERNAME/git-file-practice.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

### Step 16: Verify on GitHub

**Instructions:**
1. Go to your repository on GitHub
2. Check that all files are there
3. Look at commit history
4. Try editing a file directly on GitHub

---

## Part 9: More File Operations

### Step 17: Rename Files

**Instructions:**
```bash
# Rename using Git command
git mv hello.py main.py

# Or manually (then add)
# mv hello.py main.py
# git rm hello.py
# git add main.py
```

### Step 18: Remove Files

**Instructions:**
1. Remove a file:
   ```bash
   git rm test.txt
   ```

2. Remove from working directory only:
   ```bash
   rm styles/main.css
   git add styles/main.css  # Stage the deletion
   ```

3. Commit changes:
   ```bash
   git commit -m "Rename hello.py to main.py and remove test files"
   ```

4. Push changes:
   ```bash
   git push
   ```

---

## Part 10: Cleanup (Optional)

### Step 19: Remove Test Repository

**Instructions:** (Only if you want to clean up)
```bash
cd ..
rm -rf git-file-practice
```

---

## Verification Checklist

- [ ] Created and initialized repository
- [ ] Added files using different methods (`git add`, `git add .`, `git add -p`)
- [ ] Made multiple commits with good messages
- [ ] Modified existing files and committed changes
- [ ] Created and added new files
- [ ] Connected to remote repository
- [ ] Pushed commits to GitHub
- [ ] Renamed and removed files
- [ ] Viewed commit history and diffs

---

## Troubleshooting

### "fatal: remote origin already exists"
**Solution:**
```bash
git remote remove origin
git remote add origin <new-url>
```

### "Permission denied (publickey)"
**Solution:** Set up SSH keys or use HTTPS URL

### "failed to push some refs"
**Solution:** Pull first, then push:
```bash
git pull --rebase origin main
git push
```

### "Changes not staged for commit"
**Solution:** Stage changes first with `git add`

### Interactive add not working
**Solution:** Your terminal might not support it, use regular `git add` instead

---

## What You've Accomplished

✅ **File Staging:** Mastered different ways to stage files
✅ **Committing:** Created multiple commits with meaningful messages
✅ **File Modification:** Updated existing files and tracked changes
✅ **Remote Operations:** Connected to GitHub and pushed work
✅ **File Management:** Renamed and removed files with Git
✅ **History Analysis:** Viewed and compared commit history
✅ **Selective Staging:** Used interactive add for precise control

---

## Key Concepts Practiced

1. **File States:** Untracked → Staged → Committed
2. **Staging Area:** Preparation zone for commits
3. **Commit Messages:** Clear, descriptive commit messages
4. **Remote Repositories:** Pushing work to GitHub
5. **File Operations:** Add, remove, rename with Git tracking

---

## Commands Mastered

```bash
git add <file>        # Stage specific file
git add .             # Stage all changes
git add -p            # Interactive staging
git commit -m "msg"   # Commit staged changes
git diff              # View unstaged changes
git diff --staged     # View staged changes
git mv <old> <new>    # Rename file
git rm <file>         # Remove file
git push              # Push to remote
```

---

## Next Steps

Now that you master file operations, you can:

1. [Learn about branching](../tutorials/05-branching-fundamentals.md)
2. [Explore merge conflicts](../workshops/workshop-05-merge-conflict.md)
3. [Set up collaborative workflows](../tutorials/09-collaboration.md)
4. Complete [homework assignments](../homeworks/)

---

## Reflection Questions

1. How does staging help with organizing commits?
2. When would you use `git add .` vs `git add -p`?
3. Why are good commit messages important?
4. How does pushing to remote repositories help collaboration?

---

## Help & Support

- **Git Commands:** `git help <command>` or `git <command> --help`
- **GitHub Issues:** Check repository's Issues tab
- **Status Confusion:** Always run `git status` first
- **Push Problems:** Verify remote URL with `git remote -v`

---

## Workshop Complete! 🎉

You've mastered Git file operations! You can now:
- Stage files selectively
- Create meaningful commits
- Push work to remote repositories
- Manage file changes professionally

**Your GitHub repository now contains:**
- Multiple commits with good history
- All your practice files
- Professional development workflow
- Ready for collaboration and further development
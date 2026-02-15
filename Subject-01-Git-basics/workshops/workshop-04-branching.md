# Workshop 4: Branching Basics

## Duration: 60-75 minutes

## Objective
By the end of this workshop, you will understand Git branching, create and manage branches, and merge changes safely.

## Prerequisites
- Git installed and configured ([Workshop 1](workshop-01-basic-setup.md))
- Basic repository operations ([Workshop 2](workshop-02-first-repo.md))
- File operations ([Workshop 3](workshop-03-file-operations.md))
- Understanding of Git states ([Tutorial 4](../tutorials/04-git-states.md))

## Materials Needed
- Computer with Git installed
- Terminal/command prompt
- Text editor
- GitHub account (optional, for remote operations)

---

## Part 1: Understanding Branches

### Step 1: What is a Branch?

**Discussion Points:**
- A branch is a parallel version of your repository
- Main branch (usually `main` or `master`) is the default
- Branches allow safe experimentation
- Each branch has its own commit history
- Branches can be merged back together

**Visual Concept:**
```
main: A ── B ── C ── D
                   │
feature:           └─ E ── F
```

### Step 2: Create Test Repository

**Instructions:**
```bash
mkdir git-branching-practice
cd git-branching-practice
git init
echo "# Branching Practice" > README.md
git add README.md
git commit -m "Initial commit"
```

---

## Part 2: Creating and Switching Branches

### Step 3: View Current Branches

**Instructions:**
```bash
git branch
```

**Expected Output:**
```
* main
```

The `*` indicates the current branch.

### Step 4: Create a New Branch

**Instructions:**
```bash
git branch feature-login
```

**Verification:**
```bash
git branch
```

**Expected Output:**
```
  feature-login
* main
```

### Step 5: Switch to the New Branch

**Instructions:**
```bash
git checkout feature-login
```

**Alternative (create and switch in one command):**
```bash
git checkout -b feature-user-profile  # Creates and switches
```

**Verification:**
```bash
git branch
git status
```

**Expected Output:**
```
* feature-login
  main
```

### Step 6: Make Changes on the New Branch

**Instructions:**
1. Create a new file:
   ```bash
   echo "# Login Feature" > login.py
   echo "def login_user(username, password):" >> login.py
   echo "    # TODO: Implement login logic" >> login.py
   echo "    return True" >> login.py
   ```

2. Add and commit:
   ```bash
   git add login.py
   git commit -m "Add basic login function structure"
   ```

3. Check branch history:
   ```bash
   git log --oneline
   ```

**Notice:** This branch has the initial commit plus the new commit.

---

## Part 3: Switching Between Branches

### Step 7: Switch Back to Main Branch

**Instructions:**
```bash
git checkout main
```

**Verification:**
```bash
git branch
ls  # Notice login.py is gone!
```

**Discussion:** Why did `login.py` disappear? It's only on the `feature-login` branch.

### Step 8: View Branch Differences

**Instructions:**
```bash
git log --oneline --all --graph
```

**Expected Output:**
```
* abc1234 (feature-login) Add basic login function structure
* xyz7890 (HEAD -> main) Initial commit
```

This shows both branches and their relationship.

### Step 9: Create Another Branch

**Instructions:**
```bash
git checkout -b feature-dashboard
echo "# Dashboard Feature" > dashboard.py
echo "def show_dashboard(user):" >> dashboard.py
echo "    # TODO: Implement dashboard" >> dashboard.py
echo "    return 'Welcome to dashboard'" >> dashboard.py
git add dashboard.py
git commit -m "Add dashboard component"
```

---

## Part 4: Understanding Branch Relationships

### Step 10: Visualize Branch History

**Instructions:**
```bash
git log --oneline --all --graph --decorate
```

**Expected Output:**
```
* def4567 (feature-dashboard) Add dashboard component
* xyz7890 (HEAD -> main, feature-login) Initial commit
```

**Discussion:**
- All branches start from the same initial commit
- Each branch has its own commits
- `HEAD` points to current branch

### Step 11: Check Branch Status

**Instructions:**
```bash
git status
git branch -v  # Verbose branch info
```

---

## Part 5: Merging Branches

### Step 12: Merge Feature Branch into Main

**What you'll do:** Combine the dashboard feature into the main branch.

**Instructions:**
1. Switch to main:
   ```bash
   git checkout main
   ```

2. Merge the dashboard branch:
   ```bash
   git merge feature-dashboard
   ```

**Expected Output:**
```
Updating xyz7890..def4567
Fast-forward
 dashboard.py | 4 ++++
 1 file changed, 4 insertions(+)
 create mode 100644 dashboard.py
```

**Discussion:** This was a "fast-forward" merge because there were no conflicts.

### Step 13: View Updated History

**Instructions:**
```bash
git log --oneline --graph
```

**Expected Output:**
```
* def4567 (HEAD -> main) Add dashboard component
* xyz7890 Initial commit
```

The dashboard commits are now part of main.

### Step 14: Delete Merged Branch

**Instructions:**
```bash
git branch -d feature-dashboard
```

**Verification:**
```bash
git branch
```

---

## Part 6: Handling Merge Conflicts

### Step 15: Create Conflicting Changes

**What you'll do:** Create a merge conflict scenario.

**Instructions:**
1. Create and switch to a new branch:
   ```bash
   git checkout -b feature-conflict
   ```

2. Modify README.md:
   ```bash
   echo "" >> README.md
   echo "## Features (from feature branch)" >> README.md
   echo "- Login system" >> README.md
   echo "- User dashboard" >> README.md
   ```

3. Commit the change:
   ```bash
   git add README.md
   git commit -m "Add features list from feature branch"
   ```

4. Switch back to main:
   ```bash
   git checkout main
   ```

5. Make a different change to README.md on main:
   ```bash
   echo "" >> README.md
   echo "## Project Info" >> README.md
   echo "- Version: 1.0" >> README.md
   echo "- Language: Python" >> README.md
   ```

6. Commit this change:
   ```bash
   git add README.md
   git commit -m "Add project info to main branch"
   ```

### Step 16: Attempt to Merge (Create Conflict)

**Instructions:**
```bash
git merge feature-conflict
```

**Expected Output:**
```
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Automatic merge failed; fix conflicts and then commit the result.
```

### Step 17: Resolve the Conflict

**Instructions:**
1. Check status:
   ```bash
   git status
   ```

**Expected Output:**
```
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   README.md
```

2. View the conflicting file:
   ```bash
   cat README.md
   ```

**Expected Content:**
```
# Branching Practice

<<<<<<< HEAD
## Project Info
- Version: 1.0
- Language: Python
=======
## Features (from feature branch)
- Login system
- User dashboard
>>>>>>> feature-conflict
```

3. Edit the file to resolve conflict:
   ```bash
   # Replace the conflict markers with combined content
   echo "# Branching Practice" > README.md
   echo "" >> README.md
   echo "## Project Info" >> README.md
   echo "- Version: 1.0" >> README.md
   echo "- Language: Python" >> README.md
   echo "" >> README.md
   echo "## Features" >> README.md
   echo "- Login system" >> README.md
   echo "- User dashboard" >> README.md
   ```

4. Mark conflict as resolved:
   ```bash
   git add README.md
   ```

5. Complete the merge:
   ```bash
   git commit -m "Merge feature-conflict: Combine project info and features"
   ```

### Step 18: Verify Merge Completion

**Instructions:**
```bash
git status
git log --oneline --graph
```

---

## Part 7: Branch Management

### Step 19: View All Branches

**Instructions:**
```bash
git branch -a  # All branches
git branch -v  # Verbose info
```

### Step 20: Rename a Branch

**Instructions:**
```bash
git branch -m feature-conflict feature-auth  # Rename current branch
# or
git branch -m old-name new-name  # Rename any branch
```

### Step 21: Delete Branches

**Instructions:**
```bash
git branch -d feature-auth  # Safe delete (only if merged)
git branch -D feature-login  # Force delete (even if not merged)
```

---

## Part 8: Working with Remote Branches (Optional)

### Step 22: Push Branches to Remote

**Instructions:** (If you have a remote repository)
```bash
# Push main branch
git push origin main

# Push a feature branch
git push origin feature-login

# Set upstream for a branch
git push -u origin feature-login
```

### Step 23: View Remote Branches

**Instructions:**
```bash
git branch -r  # Remote branches
git branch -a  # All branches (local + remote)
```

---

## Part 9: Best Practices Demonstration

### Step 24: Feature Branch Workflow

**Instructions:**
1. Start new feature:
   ```bash
   git checkout -b feature-api
   ```

2. Work on feature:
   ```bash
   echo "# API Module" > api.py
   echo "def get_data():" >> api.py
   echo "    return {'status': 'success'}" >> api.py
   git add api.py
   git commit -m "Add basic API module"
   ```

3. Switch to main and merge:
   ```bash
   git checkout main
   git merge feature-api
   git branch -d feature-api
   ```

4. Push changes:
   ```bash
   git push
   ```

---

## Part 10: Cleanup (Optional)

### Step 25: Clean Up Repository

**Instructions:** (If you want to remove the practice repository)
```bash
cd ..
rm -rf git-branching-practice
```

---

## Verification Checklist

- [ ] Created and switched between branches
- [ ] Made commits on different branches
- [ ] Merged branches (fast-forward and with conflicts)
- [ ] Resolved merge conflicts manually
- [ ] Deleted merged branches
- [ ] Viewed branch history and relationships
- [ ] Understood branch isolation

---

## Troubleshooting

### "error: cannot delete branch" 
**Solution:** Branch not merged. Use `-D` to force delete or merge first.

### "You have unmerged paths"
**Solution:** Resolve conflicts, then `git add` and `git commit`.

### "Not currently on any branch"
**Solution:** You're in detached HEAD state. Create a branch: `git checkout -b temp-branch`

### "fatal: Not a valid object name"
**Solution:** Branch or commit doesn't exist. Check with `git branch -a`

### Merge conflict resolution stuck
**Solution:** Abort merge with `git merge --abort`, then try different approach

---

## What You've Accomplished

✅ **Branch Creation:** Created multiple branches for different features
✅ **Branch Switching:** Moved between branches safely
✅ **Independent Development:** Made changes on branches without affecting others
✅ **Branch Merging:** Combined branches with fast-forward and conflict resolution
✅ **Conflict Resolution:** Manually resolved merge conflicts
✅ **Branch Management:** Renamed, deleted, and organized branches
✅ **Workflow Understanding:** Experienced feature branch workflow

---

## Key Branching Concepts

1. **Branch Isolation:** Changes on one branch don't affect others
2. **Merge Types:** Fast-forward vs three-way merges
3. **Conflict Resolution:** Manual editing of conflicting files
4. **Branch Cleanup:** Deleting merged branches
5. **Workflow Patterns:** Feature branches, main branch stability

---

## Branching Commands Mastered

```bash
git branch              # List branches
git branch <name>       # Create branch
git checkout <name>     # Switch branch
git checkout -b <name>  # Create and switch
git merge <branch>      # Merge branch into current
git branch -d <name>    # Delete merged branch
git branch -D <name>    # Force delete branch
git log --graph --oneline  # View branch history
```

---

## Common Branching Scenarios

### Feature Development
```bash
git checkout -b feature/new-feature
# Work on feature
git checkout main
git merge feature/new-feature
git branch -d feature/new-feature
```

### Bug Fixes
```bash
git checkout -b fix/bug-name
# Fix the bug
git checkout main
git merge fix/bug-name
git branch -d fix/bug-name
```

### Experimentation
```bash
git checkout -b experiment/idea
# Try new things
# If successful, merge to main
# If not, delete branch
```

---

## Next Steps

Now that you understand branching, you can:

1. [Learn about merge conflicts in detail](../workshops/workshop-05-merge-conflict.md)
2. [Explore Git workflows](../tutorials/11-branching-strategies.md)
3. [Work on team collaboration](../tutorials/09-collaboration.md)
4. Practice with [branching homework](../homeworks/homework-03-branching-exercise.md)

---

## Reflection Questions

1. Why are branches important for development?
2. What happens during a fast-forward merge vs a conflict merge?
3. How do you decide when to create a new branch?
4. What are the risks of not using branches?

---

## Help & Support

- **Branch Issues:** Use `git branch -a` to see all branches
- **Merge Problems:** `git status` shows unmerged files
- **Conflict Help:** Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
- **History View:** `git log --graph --oneline --all` shows relationships

---

## Workshop Complete! 🎉

You've mastered Git branching! You can now:
- Create feature branches safely
- Work on multiple features simultaneously
- Merge changes without breaking main branch
- Resolve conflicts confidently
- Follow professional development workflows

**Branching Skills:**
- Branch creation and management
- Safe parallel development
- Conflict resolution
- Professional workflow adoption
- Repository organization
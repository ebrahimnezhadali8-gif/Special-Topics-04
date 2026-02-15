# Workshop 2: Creating Your First Repository

## Duration: 45-60 minutes

## Objective
By the end of this workshop, you will create your first Git repository, add files, make commits, and understand basic repository operations.

## Prerequisites
- Git installed and configured (completed [Workshop 1](workshop-01-basic-setup.md))
- Basic understanding of Git concepts ([Tutorial 1](../tutorials/01-git-intro.md))

## Materials Needed
- Computer with Git installed
- Terminal/command prompt
- Text editor (any will work)

---

## Part 1: Planning Your Repository

### Step 1: Choose a Project Idea

**What you'll do:** Decide what kind of project to create.

**Consider these options:**
- Personal website/portfolio
- Simple calculator application
- To-do list application
- Recipe collection
- Study notes organizer
- Simple game (like tic-tac-toe)

**Example Project:** We'll create a simple "Personal Journal" application.

**Your Project Idea:** __________________________

### Step 2: Plan Your Project Structure

**What you'll do:** Think about what files and folders your project needs.

**For a Personal Journal project:**
- `README.md` - Project description
- `journal.py` - Main application
- `entries/` - Folder for journal entries
- `requirements.txt` - Dependencies

**Sketch your project structure:**
```
my-project-name/
├── README.md
├── main-file.ext
├── folder1/
│   └── file1.ext
└── folder2/
    └── file2.ext
```

**Your Project Structure:**
```
[Your project name]/
├──
├──
└──
```

---

## Part 2: Creating the Repository

### Step 3: Create Project Directory

**What you'll do:** Create a folder for your project.

**Instructions:**
1. Open your terminal/command prompt
2. Navigate to a good location (like Desktop or Documents):
   ```bash
   cd Desktop  # or cd Documents
   ```
3. Create your project directory:
   ```bash
   mkdir my-first-repo
   ```
4. Enter the directory:
   ```bash
   cd my-first-repo
   ```

**Verification:**
```bash
pwd  # Shows current directory
ls   # Shows directory contents (should be empty)
```

### Step 4: Initialize Git Repository

**What you'll do:** Turn your directory into a Git repository.

**Instructions:**
```bash
git init
```

**Expected Output:**
```
Initialized empty Git repository in /path/to/your/my-first-repo/.git/
```

**Verification:**
```bash
ls -la  # You should see a .git folder
git status
```

**Expected Status Output:**
```
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

---

## Part 3: Creating Project Files

### Step 5: Create README File

**What you'll do:** Create a project description file.

**Instructions:**
1. Create a README.md file:
   ```bash
   echo "# My First Git Repository" > README.md
   echo "" >> README.md
   echo "This is my first project using Git version control." >> README.md
   echo "" >> README.md
   echo "## Features" >> README.md
   echo "- Feature 1" >> README.md
   echo "- Feature 2" >> README.md
   ```

2. Check the file contents:
   ```bash
   cat README.md  # Linux/macOS
   type README.md  # Windows
   ```

**Alternative:** Use a text editor to create the file.

### Step 6: Create Main Application File

**What you'll do:** Create the core functionality file.

**Instructions:**
1. Create a simple Python script:
   ```bash
   echo "# My First Application" > app.py
   echo "" >> app.py
   echo "def main():" >> app.py
   echo "    print('Hello from my first Git repository!')" >> app.py
   echo "    print('Welcome to version control!')" >> app.py
   echo "" >> app.py
   echo "if __name__ == '__main__':" >> app.py
   echo "    main()" >> app.py
   ```

2. Test the script (optional):
   ```bash
   python app.py  # or python3 app.py
   ```

**Expected Output:**
```
Hello from my first Git repository!
Welcome to version control!
```

### Step 7: Create Additional Files

**What you'll do:** Add more files to make your project complete.

**Instructions:**
1. Create a requirements file:
   ```bash
   echo "Python>=3.6" > requirements.txt
   ```

2. Create a simple data file:
   ```bash
   mkdir data
   echo "Sample data for my application" > data/sample.txt
   ```

3. Create a notes file:
   ```bash
   echo "# Development Notes" > NOTES.md
   echo "" >> NOTES.md
   echo "This file contains notes about the project development." >> NOTES.md
   ```

**Check your project structure:**
```bash
ls -la
tree  # if available, or ls -R
```

---

## Part 4: Working with Git

### Step 8: Check Repository Status

**What you'll do:** See what Git knows about your files.

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
        app.py
        data/sample.txt
        requirements.txt
        NOTES.md

nothing added to commit but untracked files present (use "git add" to track)
```

### Step 9: Add Files to Staging Area

**What you'll do:** Prepare files for commit.

**Instructions:**
1. Add all files:
   ```bash
   git add .
   ```

2. Check status again:
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
        new file:   app.py
        new file:   data/sample.txt
        new file:   NOTES.md
        new file:   requirements.txt
```

### Step 10: Make Your First Commit

**What you'll do:** Save your work to the repository.

**Instructions:**
```bash
git commit -m "Initial commit: Set up basic project structure"
```

**Expected Output:**
```
[main (root-commit) abc1234] Initial commit: Set up basic project structure
 5 files changed, 15 insertions(+)
 create mode 100644 README.md
 create mode 100644 app.py
 create mode 100644 NOTES.md
 create mode 100644 data/sample.txt
 create mode 100644 requirements.txt
```

### Step 11: View Commit History

**What you'll do:** See your commit history.

**Instructions:**
```bash
git log
```

**Expected Output:**
```
commit abc1234... (HEAD -> main)
Author: Your Name <your.email@example.com>
Date:   [Current Date and Time]

    Initial commit: Set up basic project structure
```

**Short format:**
```bash
git log --oneline
```

**Expected Output:**
```
abc1234 Initial commit: Set up basic project structure
```

---

## Part 5: Making Changes and More Commits

### Step 12: Modify a File

**What you'll do:** Make changes to demonstrate version control.

**Instructions:**
1. Edit the README.md file:
   ```bash
   echo "" >> README.md
   echo "## How to Run" >> README.md
   echo "Run the application with: \`python app.py\`" >> README.md
   ```

2. Check status:
   ```bash
   git status
   ```

**Expected Output:**
```
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   README.md

no changes added to commit (use "git add" and/or "git commit -a")
```

### Step 13: Stage and Commit Changes

**What you'll do:** Save your modifications.

**Instructions:**
1. Stage the changes:
   ```bash
   git add README.md
   ```

2. Check what will be committed:
   ```bash
   git diff --staged
   ```

3. Commit the changes:
   ```bash
   git commit -m "Add usage instructions to README"
   ```

4. View updated history:
   ```bash
   git log --oneline
   ```

**Expected Output:**
```
def5678 Add usage instructions to README
abc1234 Initial commit: Set up basic project structure
```

### Step 14: Add a New Feature

**What you'll do:** Add new functionality.

**Instructions:**
1. Create a new file:
   ```bash
   echo "# Utility functions" > utils.py
   echo "" >> utils.py
   echo "def greet(name):" >> utils.py
   echo "    return f'Hello, {name}!'" >> utils.py
   ```

2. Update the main app to use it:
   ```bash
   echo "from utils import greet" >> app.py
   echo "" >> app.py
   echo "def main():" >> app.py
   echo "    print('Hello from my first Git repository!')" >> app.py
   echo "    print(greet('Developer'))" >> app.py
   echo "    print('Welcome to version control!')" >> app.py
   echo "" >> app.py
   echo "if __name__ == '__main__':" >> app.py
   echo "    main()" >> app.py
   ```

3. Test the updated app:
   ```bash
   python app.py
   ```

**Expected Output:**
```
Hello from my first Git repository!
Hello, Developer!
Welcome to version control!
```

### Step 15: Commit New Feature

**Instructions:**
```bash
git add .
git status
git commit -m "Add greeting utility function and update main app"
```

**Check final history:**
```bash
git log --oneline
```

---

## Part 6: Repository Inspection

### Step 16: View Detailed Commit Information

**Instructions:**
```bash
git show HEAD  # Show latest commit details
```

### Step 17: Compare Commits

**Instructions:**
```bash
git diff HEAD~2 HEAD  # Compare first and latest commit
```

### Step 18: View Repository Statistics

**Instructions:**
```bash
git shortlog -sn  # Commit count by author
```

---

## Part 7: Cleaning Up (Optional)

### Step 19: Remove Test Repository

**Instructions:** (Only do this if you want to clean up)
```bash
cd ..  # Go up one directory
rm -rf my-first-repo  # Remove the test repository
```

**Note:** Keep your repository if you want to continue working on it!

---

## Verification Checklist

- [ ] Created project directory
- [ ] Initialized Git repository
- [ ] Created multiple files (README, main app, utilities)
- [ ] Added files to staging area
- [ ] Made initial commit
- [ ] Modified files and made additional commits
- [ ] Viewed commit history
- [ ] Used `git status` and `git diff`

---

## Troubleshooting

### "fatal: not a git repository"
**Solution:** Make sure you're in the correct directory and ran `git init`

### "nothing to commit, working tree clean"
**Solution:** You haven't made any changes, or files are already committed

### "error: pathspec 'filename' did not match any file(s) known to git"
**Solution:** Check spelling of filename, or file doesn't exist

### Python not found
**Solution:** Use `python3` instead of `python`, or install Python

### Permission denied
**Solution:** Check file permissions, or run terminal as administrator

---

## What You've Accomplished

✅ **Repository Creation:** Created and initialized your first Git repository
✅ **File Management:** Added, modified, and organized project files
✅ **Version Control:** Made multiple commits with meaningful messages
✅ **History Tracking:** Viewed and understood commit history
✅ **Git Workflow:** Experienced the complete add-commit cycle
✅ **Project Structure:** Organized files in a logical structure

---

## Project Showcase

**Share your repository:**
1. Create a GitHub account (if you haven't already)
2. Create a new repository on GitHub
3. Connect your local repository to GitHub (we'll cover this in later workshops)
4. Push your commits to GitHub

**Your repository contains:**
- A complete project with multiple files
- Professional commit history
- Clear documentation
- Working application

---

## Next Steps

Now that you have your first repository, you can:

1. [Learn about working with files](../tutorials/03-working-with-files.md)
2. [Explore Git states](../tutorials/04-git-states.md)
3. [Set up GitHub for collaboration](https://github.com)
4. [Create more complex projects](../homeworks/homework-02-personal-repo.md)

---

## Reflection Questions

Take a moment to think about:
1. How does Git help with organizing your project?
2. What would happen if you didn't use version control?
3. How might you use Git in future projects?
4. What surprised you about working with Git?

---

## Help & Support

- **Git Commands:** Use `git help <command>` for detailed help
- **Status Issues:** Always check `git status` first
- **File Problems:** Use `ls` to verify files exist
- **Course Forum:** Ask questions in the course discussion

---

## Workshop Complete! 🎉

You've successfully created your first Git repository and made multiple commits. This demonstrates your understanding of basic Git operations and sets you up for more advanced version control concepts.

**Repository Stats:**
- Files created: 5+
- Commits made: 3+
- Branches: 1 (main)
- Ready for: GitHub integration, collaboration, advanced features
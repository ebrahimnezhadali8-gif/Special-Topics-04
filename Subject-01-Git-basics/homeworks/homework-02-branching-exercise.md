## Homework 2: Git Branching & File Operations Exercise

**Due Date:** [1404-12-05]

**Objective:**
Apply Git branching and file operations skills by creating a feature branch, implementing changes, resolving merge conflicts, and maintaining clean commit history. This assignment combines the practical skills from file operations and branching workshops.

**Estimated time:** 60-90 minutes

---

### Prerequisites
- Completed Homework 1 (GitHub setup and repository cloning)
- Understanding of Git file states (untracked → staged → committed)
- Basic knowledge of branching concepts

---

### Task 1: Set Up Project Repository

1. **Create a new repository on GitHub:**
   - Repository name: `branching-exercise-[your-username]`
   - Description: "Git branching and file operations homework"
   - Make it **private** (you can change to public after grading)
   - Initialize with a README.md

2. **Clone the repository locally:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/branching-exercise-YOUR_USERNAME.git
   cd branching-exercise-YOUR_USERNAME
   ```

3. **Set up initial project structure:**
   ```bash
   # Create initial files
   # Create README.md using your text editor and paste this content:
   # Branching Exercise Project
   #
   # This project demonstrates Git branching and file operations.

   # Create a simple Python project
   mkdir src
   ```
   - Create `src/app.py` using your text editor and paste this content:
     ```
     def main():
         print("Welcome to the branching exercise!")
     ```
   echo 'if __name__ == "__main__":' >> src/app.py
   echo '    main()' >> src/app.py

   # Create requirements file
   echo "pytest==7.4.0" > requirements.txt

   # Stage and commit
   git add .
   git commit -m "Initial project setup with basic app structure"
   ```

**Deliverable:** Screenshot showing successful clone and initial commit.

---

### Task 2: Create and Develop a Feature Branch

1. **Create a new feature branch:**
   ```bash
   git checkout -b feature/user-authentication
   ```

2. **Implement user authentication module:**
   ```bash
   # Create authentication module
   mkdir src/auth
   echo 'class UserAuthenticator:' > src/auth/__init__.py
   echo '    def __init__(self):' >> src/auth/__init__.py
   echo '        self.users = {}' >> src/auth/__init__.py
   echo '' >> src/auth/__init__.py
   echo '    def register(self, username, password):' >> src/auth/__init__.py
   echo '        if username in self.users:' >> src/auth/__init__.py
   echo '            return False' >> src/auth/__init__.py
   echo '        self.users[username] = password' >> src/auth/__init__.py
   echo '        return True' >> src/auth/__init__.py
   echo '' >> src/auth/__init__.py
   echo '    def login(self, username, password):' >> src/auth/__init__.py
   echo '        return self.users.get(username) == password' >> src/auth/__init__.py
   ```

3. **Update main app to use authentication:**
   ```bash
   # Modify src/app.py to include authentication
   echo 'from src.auth import UserAuthenticator' > src/app.py
   echo '' >> src/app.py
   echo 'def main():' >> src/app.py
   echo '    auth = UserAuthenticator()' >> src/app.py
   echo '    print("Welcome to the branching exercise!")' >> src/app.py
   echo '    print("User authentication system initialized.")' >> src/app.py
   echo '' >> src/app.py
   echo 'if __name__ == "__main__":' >> src/app.py
   echo '    main()' >> src/app.py
   ```

4. **Add a test file:**
   ```bash
   mkdir tests
   echo 'import pytest' > tests/test_auth.py
   echo 'from src.auth import UserAuthenticator' >> tests/test_auth.py
   echo '' >> tests/test_auth.py
   echo 'def test_user_registration():' >> tests/test_auth.py
   echo '    auth = UserAuthenticator()' >> tests/test_auth.py
   echo '    assert auth.register("testuser", "password123") == True' >> tests/test_auth.py
   echo '    assert auth.register("testuser", "password456") == False  # Duplicate' >> tests/test_auth.py
   echo '' >> tests/test_auth.py
   echo 'def test_user_login():' >> tests/test_auth.py
   echo '    auth = UserAuthenticator()' >> tests/test_auth.py
   echo '    auth.register("testuser", "password123")' >> tests/test_auth.py
   echo '    assert auth.login("testuser", "password123") == True' >> tests/test_auth.py
   echo '    assert auth.login("testuser", "wrongpassword") == False' >> tests/test_auth.py
   ```

5. **Make multiple commits on this branch:**
   ```bash
   # First commit: Authentication module
   git add src/auth/
   git commit -m "Add user authentication module with register/login functionality"

   # Second commit: Update main app
   git add src/app.py
   git commit -m "Integrate authentication system into main application"

   # Third commit: Add tests
   git add tests/
   git commit -m "Add unit tests for authentication functionality"
   ```

**Deliverable:** Screenshot of `git log --oneline --graph` showing the three commits on the feature branch.

---

### Task 3: Create a Second Feature Branch

1. **Switch back to main and create another feature branch:**
   ```bash
   git checkout main
   git checkout -b feature/ui-improvements
   ```

2. **Add UI components:**
   ```bash
   mkdir src/ui
   echo 'class ConsoleUI:' > src/ui/__init__.py
   echo '    def display_menu(self):' >> src/ui/__init__.py
   echo '        print("=== Branching Exercise App ===")' >> src/ui/__init__.py
   echo '        print("1. Register")' >> src/ui/__init__.py
   echo '        print("2. Login")' >> src/ui/__init__.py
   echo '        print("3. Exit")' >> src/ui/__init__.py
   echo '' >> src/ui/__init__.py
   echo '    def get_user_input(self, prompt):' >> src/ui/__init__.py
   echo '        return input(prompt)' >> src/ui/__init__.py
   echo '' >> src/ui/__init__.py
   echo '    def display_message(self, message):' >> src/ui/__init__.py
   echo '        print(f"[INFO] {message}")' >> src/ui/__init__.py
   ```

3. **Create configuration file:**
   ```bash
   echo '# Application Configuration' > config.ini
   echo '[app]' >> config.ini
   echo 'name = Branching Exercise' >> config.ini
   echo 'version = 1.0.0' >> config.ini
   echo '' >> config.ini
   echo '[ui]' >> config.ini
   echo 'theme = console' >> config.ini
   echo 'language = en' >> config.ini
   ```

4. **Update README with UI features:**
   - Open `README.md` in your text editor and add this content at the end:
     ```

     ## Features
     - User authentication system
     - Console-based user interface
     - Configuration management
     - Comprehensive test suite

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add console UI components and configuration system"
   ```

**Deliverable:** Screenshot of branch status showing you're on the UI improvements branch with new files.

---

### Task 4: Create a Merge Conflict Scenario

1. **Modify README.md on the UI branch to add different content:**
   - Open `README.md` in your text editor and add this content at the end:
     ```

     ## UI Features
     - Interactive console menu
     - Input validation
     - Error handling
   ```bash
   git add README.md
   git commit -m "Add detailed UI features documentation"
   ```

2. **Switch to main branch and modify README.md differently:**
   ```bash
   git checkout main
   ```
   - Open `README.md` in your text editor and add this content at the end:
     ```

     ## Getting Started
     1. Clone the repository
     2. Install dependencies: pip install -r requirements.txt
     3. Run tests: python -m pytest
     4. Run the application: python src/app.py
   ```bash
   git add README.md
   git commit -m "Add getting started instructions to README"
   ```

**Deliverable:** Screenshot showing the different README content on main branch.

---

### Task 5: Merge First Feature Branch (No Conflicts)

1. **Merge the authentication feature branch:**
   ```bash
   git merge feature/user-authentication
   ```

2. **Verify the merge was successful:**
   ```bash
   git log --oneline --graph
   git status
   ```

**Deliverable:** Screenshot of successful merge output and updated commit history.

---

### Task 6: Merge Second Feature Branch (With Conflicts)

1. **Attempt to merge the UI improvements branch:**
   ```bash
   git merge feature/ui-improvements
   ```
   This should create a merge conflict in README.md.

2. **Check the conflict status:**
   ```bash
   git status
   ```

3. **View the conflicting file:**
   ```bash
   cat README.md
   ```

4. **Resolve the conflict by combining both changes:**
   - Open `README.md` in your text editor and replace its content with this combined version:
     ```
     # Branching Exercise Project

     This project demonstrates Git branching and file operations.

     ## Getting Started
     1. Clone the repository
     2. Install dependencies: pip install -r requirements.txt
     3. Run tests: python -m pytest
     4. Run the application: python src/app.py

     ## Features
     - User authentication system
     - Console-based user interface
     - Configuration management
     - Comprehensive test suite

     ## UI Features
     - Interactive console menu
     - Input validation
     - Error handling
     ```

5. **Complete the merge:**
   ```bash
   git add README.md
   git commit -m "Merge UI improvements: Combine getting started and UI features documentation"
   ```

**Deliverable:** Screenshot showing the resolved README.md content and successful merge commit.

---

### Task 7: Clean Up and Push

1. **Delete merged branches:**
   ```bash
   git branch -d feature/user-authentication
   git branch -d feature/ui-improvements
   ```

2. **Push all changes to GitHub:**
   ```bash
   git push origin main
   ```

3. **Verify repository structure:**
   ```bash
   ls -la
   git log --oneline --graph
   ```

**Deliverable:** Screenshot of the final repository structure and commit history.

---

### Task 8: Branch Management Exercise

1. **Create a new branch for a bug fix:**
   ```bash
   git checkout -b fix/typo-in-app
   ```

2. **Fix a "bug" (add a missing import or correct a typo):**
   ```bash
   # Add missing import to src/app.py
   echo 'import sys' > temp_app.py
   echo 'from src.auth import UserAuthenticator' >> temp_app.py
   echo '' >> temp_app.py
   cat src/app.py >> temp_app.py
   mv temp_app.py src/app.py
   ```

3. **Stage only the import line using interactive staging:**
   ```bash
   git add -p src/app.py
   # Select only the import line to stage
   ```

4. **Commit the partial change:**
   ```bash
   git commit -m "Fix missing sys import in app.py"
   ```

5. **Merge back to main:**
   ```bash
   git checkout main
   git merge fix/typo-in-app
   git branch -d fix/typo-in-app
   ```

**Deliverable:** Screenshot showing the interactive staging process and final merged result.

---

### Submission Instructions

**Important:** Please follow the comprehensive submission guidelines at the end of this document. You will need to fork the course repository and submit your homework via a pull request.

**Quick Checklist:**
- ✅ Complete all 8 tasks successfully
- ✅ Take all required screenshots
- ✅ Fork the course repository
- ✅ Create proper folder structure
- ✅ Submit via pull request

See the detailed **"Submission Instructions"** section at the end of this document for complete step-by-step guidance.

---

### Grading Criteria

- **Repository Setup (20%)**: Proper GitHub repository and local clone
- **Branch Creation & Development (25%)**: Feature branches with meaningful commits
- **File Operations (20%)**: Proper staging, committing, and file management
- **Merge Operations (15%)**: Successful merges and conflict resolution
- **Branch Cleanup (10%)**: Proper branch deletion and repository organization
- **Submission Quality (10%)**: Complete screenshots and clear documentation

---

### Troubleshooting Tips

- **"Permission denied"**: Make sure you're using your correct GitHub URL
- **Merge conflict resolution stuck**: Use `git merge --abort` to start over
- **Branch deletion fails**: Use `git branch -D` to force delete unmerged branches
- **Interactive staging issues**: Fall back to regular `git add` if `-p` doesn't work

---

### Expected Final Repository Structure
```
branching-exercise-[username]/
├── README.md (with complete documentation)
├── requirements.txt
├── config.ini
├── src/
│   ├── app.py (with authentication integration)
│   ├── auth/
│   │   └── __init__.py (authentication module)
│   └── ui/
│       └── __init__.py (UI components)
└── tests/
    └── test_auth.py (unit tests)
```

---

### Submission Instructions

#### Step 1: Fork the Course Repository

**What is Forking?**
Forking creates your own copy of a repository under your GitHub account. This allows you to:
- Make changes without affecting the original repository
- Submit pull requests with your work
- Keep your submissions organized and accessible

**How to Fork:**
1. Go to [https://github.com/buqaen-courses/Special-Topics-04](https://github.com/buqaen-courses/Special-Topics-04)
2. Click the **"Fork"** button in the top-right corner
3. Select your GitHub account as the destination
4. Wait for GitHub to create your fork (this may take a few seconds)

**Expected Result:** You now have a repository at `https://github.com/YOUR_USERNAME/Special-Topics-04`

#### Step 2: Clone Your Fork Locally

```bash
git clone https://github.com/YOUR_USERNAME/Special-Topics-04.git
cd Special-Topics-04
```

#### Step 3: Create the Submission Folder Structure

Create the following folder structure in your forked repository:

```
Special-Topics-04/
└── Homeworks/
    └── Subject-01-Git-basics/
        └── homework-02-branching-exercise/
            ├── README.md (your documentation)
            ├── screenshots/ (all required screenshots)
            └── repository-url.txt (link to your exercise repo)
```

**Commands to create the structure:**
```bash
# Create the main Homeworks folder
mkdir -p Homeworks/Subject-01-Git-basics/homework-02-branching-exercise/screenshots

# Create documentation file
# Create Homeworks/Subject-01-Git-basics/homework-02-branching-exercise/README.md
# using your text editor and paste this content:
# Homework 2 Submission: Git Branching & File Operations
#
# ## Student Information
# - Name: YOUR_FULL_NAME
# - GitHub Username: YOUR_USERNAME
# - Date: [Today's Date]
```

#### Step 4: Add Your Homework Files

1. **Create repository-url.txt:**
   ```bash
   echo "https://github.com/YOUR_USERNAME/branching-exercise-YOUR_USERNAME" > Homeworks/Subject-01-Git-basics/homework-02-branching-exercise/repository-url.txt
   ```

2. **Copy all required screenshots** to the `screenshots/` folder:
   - Task 1: Initial setup and clone
   - Task 2: Feature branch commit history
   - Task 3: UI branch with new files
   - Task 4: Different README on main
   - Task 5: Successful merge of auth feature
   - Task 6: Resolved merge conflict and final README
   - Task 7: Final repository structure and history
   - Task 8: Interactive staging and bug fix merge

3. **Update README.md** with your reflection answers and any additional notes.

#### Step 5: Commit and Push Your Submission

```bash
# Add all homework files
git add Homeworks/

# Commit with descriptive message
git commit -m "Submit Homework 2: Git Branching & File Operations Exercise

- Completed all 8 tasks including merge conflicts and interactive staging
- Repository: https://github.com/YOUR_USERNAME/branching-exercise-YOUR_USERNAME
- Demonstrated branching workflow, conflict resolution, and file operations"

# Push to your fork
git push origin main
```

#### Step 6: Create a Pull Request

1. Go to your forked repository on GitHub
2. Click **"Compare & pull request"** (or **"Contribute"** → **"Open pull request"**)
3. **Title:** `Homework 2 Submission: Git Branching Exercise - [YOUR_NAME]`
4. **Description:**
   ```
   ## Homework 2 Submission

   **Student:** YOUR_FULL_NAME
   **GitHub:** @YOUR_USERNAME

   ### Completed Tasks:
   - ✅ Repository setup and initial project
   - ✅ Feature branch development (authentication)
   - ✅ Second feature branch (UI components)
   - ✅ Merge conflict creation and resolution
   - ✅ Branch management and cleanup
   - ✅ Interactive staging demonstration
   - ✅ All required screenshots included

   ### Exercise Repository:
   https://github.com/YOUR_USERNAME/branching-exercise-YOUR_USERNAME

   ### Key Learnings:
   - Branch isolation and parallel development
   - Merge conflict resolution techniques
   - Interactive staging for focused commits
   - Professional branching workflows
   ```
5. Click **"Create pull request"**

#### Important Notes

- **Do NOT push directly to the main course repository** - always work with your fork
- **Keep your fork private** until submission to protect your work
- **Double-check** that all screenshots are included and clearly named
- **Test your repository link** to ensure it's accessible
- **Pull request titles** should follow the format: `Homework 2 Submission: Git Branching Exercise - [YOUR_NAME]`

### Submission Checklist

- [ ] Forked the course repository to my GitHub account
- [ ] Created proper folder structure: `Homeworks/Subject-01-Git-basics/homework-02-branching-exercise/`
- [ ] Added repository URL file (`repository-url.txt`)
- [ ] Copied all 8 required screenshots to `screenshots/` folder
- [ ] Completed README.md with student information and reflections
- [ ] Committed and pushed changes to my fork
- [ ] Created pull request with proper title and description
- [ ] Verified all files are accessible in the pull request

---

### Additional Resources

- [Git Branching Documentation](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [Resolving Merge Conflicts](https://help.github.com/articles/resolving-a-merge-conflict-using-the-command-line/)
- [Interactive Staging](https://git-scm.com/book/en/v2/Git-Tools-Interactive-Staging)
- [Forking on GitHub](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo)
- [Creating Pull Requests](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request)

Good luck! This exercise will test and reinforce your understanding of Git branching and file operations. 🎯
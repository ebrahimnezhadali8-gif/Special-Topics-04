# Tutorial 1: Introduction to Git

## Learning Objectives
By the end of this tutorial, you will be able to:
- Understand what Git is and why it's important
- Explain the basic concepts of version control
- Describe Git's role in software development
- Differentiate between Git and other version control systems

## Prerequisites
- Basic understanding of files and folders
- Familiarity with command line/terminal
- Git installed on your system (see [installation guides](../installation/))

## What is Git?

Git is a **distributed version control system** designed to track changes in source code during software development. It's like a time machine for your code that allows you to:

- Save snapshots of your work at different points in time
- Collaborate with others on the same project
- Experiment safely without breaking your main work
- Review and understand how your code evolved

## Why Version Control?

### The Problem Without Version Control
Imagine you're working on a project and you need to make changes. Without version control:

- You might create files like `index_final.html`, `index_final_v2.html`, `index_final_really_final.html`
- You lose track of what changed and when
- It's hard to collaborate with others
- Mistakes are permanent and hard to fix
- You can't experiment safely

### The Solution with Version Control
With Git:
- Every change is tracked with a clear history
- You can revert to any previous state
- Multiple people can work on the same files simultaneously
- You can create experimental branches that don't affect the main work
- Changes are documented with meaningful messages

## Key Concepts in Git

### Repository (Repo)
A **repository** is like a project folder that Git is tracking. It contains:
- Your project files
- Git's internal files (in the `.git` folder)
- History of all changes
- Configuration settings

### Commit
A **commit** is a snapshot of your project at a specific point in time. Each commit includes:
- Changes to files
- A commit message describing what changed
- Author information
- Timestamp
- A unique identifier (SHA hash)

### Working Directory
The **working directory** is your local folder where you edit files. This is what you see in your file explorer.

### Staging Area (Index)
The **staging area** is where you prepare changes before committing them. Think of it as a shopping cart where you collect items before checkout.

### Branches
**Branches** allow you to work on different versions of your project simultaneously. The main branch is usually called `main` or `master`.

## How Git Works: The Basic Flow

### 1. Initialize a Repository
```bash
git init
```
This creates a new Git repository in your current folder.

### 2. Make Changes
Edit your files normally using any text editor.

### 3. Check Status
```bash
git status
```
This shows which files have been modified, added, or deleted.

### 4. Stage Changes
```bash
git add filename.txt
# or stage all changes
git add .
```

### 5. Commit Changes
```bash
git commit -m "Describe your changes here"
```
This saves a snapshot of your staged changes.

### 6. View History
```bash
git log
```
This shows all previous commits.

## Git vs Other Version Control Systems

### Centralized Version Control (CVCS)
- **Examples**: SVN, CVS, Perforce
- **How it works**: Single central server holds all versions
- **Pros**: Simple to understand, centralized control
- **Cons**: Requires network connection, single point of failure

### Distributed Version Control (DVCS)
- **Examples**: Git, Mercurial
- **How it works**: Every developer has a full copy of the repository
- **Pros**: Work offline, multiple backups, flexible workflows
- **Cons**: More complex initially, larger storage requirements

### Git's Advantages
- **Speed**: Most operations are local
- **Flexibility**: Supports many workflows
- **Security**: Cryptographic integrity of data
- **Collaboration**: Excellent merge tools and branching

## Real-World Git Usage

### Individual Developer
- Track personal projects
- Experiment with new features safely
- Maintain different versions for different clients
- Backup work automatically

### Team Development
- Multiple developers working on the same codebase
- Code reviews via pull requests
- Automated testing and deployment
- Release management

### Open Source Projects
- Contributors from around the world
- Fork and contribute back
- Maintain project history
- Issue tracking and documentation

## Git in the Development Lifecycle

### Planning Phase
- Create repository structure
- Set up initial branches
- Configure collaboration rules

### Development Phase
- Create feature branches
- Make regular commits
- Push changes to share with team

### Review Phase
- Create pull requests
- Code review and feedback
- Automated testing

### Release Phase
- Merge approved changes
- Create release tags
- Deploy to production

## Common Git Terminology

| Term | Definition |
|------|------------|
| Repository | Project folder tracked by Git |
| Commit | Snapshot of project at a point in time |
| Branch | Parallel version of the repository |
| Merge | Combining changes from different branches |
| Clone | Copying a repository from remote to local |
| Push | Sending local commits to remote repository |
| Pull | Getting latest changes from remote repository |
| Fork | Creating your own copy of someone else's repository |

## Git's Philosophy

### "Snapshots, Not Differences"
Unlike some version control systems that store differences between files, Git stores complete snapshots of your project. This makes operations faster and more reliable.

### "Distributed First"
Git was designed for distributed development from the beginning, unlike centralized systems that were later made distributed.

### "Integrity"
Every commit has a SHA-1 hash that ensures data integrity. If anything changes, the hash changes too.

## Getting Started with Git

Now that you understand the basics, you're ready to:

1. [Install Git](../installation/) if you haven't already
2. [Create your first repository](../workshops/workshop-02-first-repo.md)
3. Learn about [working with files](02-repository-basics.md)

## Practice Exercises

### Exercise 1: Understanding Concepts
Answer these questions:
1. What is the difference between Git and a file backup system?
2. Why is Git called "distributed" version control?
3. What happens when you make a commit?

### Exercise 2: Explore Git
1. Open your terminal/command prompt
2. Type `git --version` and note the output
3. Type `git help` and explore the available commands

### Exercise 3: Think About Workflows
Consider a project you're working on (or plan to work on):
- How could Git help with this project?
- What kind of commits would you make?
- How would you handle collaboration?

## Summary

Git is a powerful tool that changes how you think about code and collaboration. It provides:

- **Safety**: Never lose your work
- **Flexibility**: Experiment without fear
- **Collaboration**: Work with others seamlessly
- **History**: Understand how your code evolved

The key concepts to remember:
- Repository: Your project's home
- Commits: Snapshots in time
- Branches: Parallel development paths
- Staging: Preparing changes for commit

Next, you'll learn about [creating and managing repositories](02-repository-basics.md).

## Additional Resources

- [Official Git Documentation](https://git-scm.com/doc)
- [GitHub Learning Lab](https://lab.github.com/)
- [Interactive Git Tutorial](https://learngitbranching.js.org/)
- [Pro Git Book](https://git-scm.com/book/en/v2) (free online)

## Quiz

Test your understanding:
1. What command initializes a new Git repository?
2. What is the staging area used for?
3. Why is Git considered "distributed"?
4. What does a commit contain?
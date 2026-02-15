# Homework 1: Git Profile Setup & Basic Configuration

## Due Date: [Insert due date - typically 1 week from assignment]

## Objective
Set up your Git environment professionally and demonstrate understanding of basic Git configuration and repository creation.

## Estimated Time: 45-60 minutes

---

## Part 1: Git Installation & Configuration (20 points)

### Task 1.1: Install Git (5 points)

**Requirements:**
- Install Git on your system following the appropriate guide
- Verify installation works correctly

**Deliverables:**
- Screenshot of `git --version` command output
- Confirmation that Git commands work in your terminal

**Verification Steps:**
```bash
git --version
# Should show: git version 2.x.x.x
```

### Task 1.2: Configure User Identity (5 points)

**Requirements:**
- Set global user name and email
- Use your real name and educational email
- Verify configuration is correct

**Deliverables:**
- Commands used for configuration
- Output of `git config --global --list` showing your settings

**Example:**
```bash
git config --global user.name "John Doe"
git config --global user.email "john.doe@university.edu"
```

### Task 1.3: Configure Git Settings (5 points)

**Requirements:**
- Set default branch to `main`
- Configure appropriate line endings for your OS
- Enable useful features (color output, etc.)

**Deliverables:**
- Complete list of global Git configuration
- Explanation of why each setting is important

**Required Settings:**
```bash
git config --global init.defaultBranch main
git config --global color.ui auto
# Plus OS-specific line ending setting
```

### Task 1.4: Set Up SSH Keys (Optional - 5 bonus points)

**Requirements:**
- Generate SSH key pair
- Add public key to GitHub/GitLab account
- Test SSH connection

**Deliverables:**
- Confirmation of SSH key generation
- Test connection output
- GitHub SSH key screenshot

---

## Part 2: Repository Creation & Basic Operations (30 points)

### Task 2.1: Create Personal Repository (10 points)

**Requirements:**
- Create a new directory for your homework
- Initialize as Git repository
- Create initial project structure

**Project Structure Requirements:**
```
homework-01-[your-name]/
├── README.md
├── profile.json
├── interests.txt
└── goals.md
```

**Deliverables:**
- Repository initialization commands
- File creation commands
- Initial project structure

### Task 2.2: Create Meaningful Files (10 points)

**Requirements:**
- Create a professional README.md
- Add personal information in JSON format
- List your interests/learning goals

**README.md Requirements:**
- Project title and description
- Your name and contact info
- Brief bio/academic background
- Purpose of this repository

**profile.json Example:**
```json
{
  "name": "John Doe",
  "university": "Your University",
  "major": "Computer Engineering",
  "year": "2024",
  "interests": ["programming", "version control", "web development"],
  "skills": ["Python", "JavaScript", "Git"]
}
```

**Deliverables:**
- All required files created
- Content is professional and complete

### Task 2.3: Make Initial Commits (10 points)

**Requirements:**
- Stage files appropriately
- Make logical commits (not one big commit)
- Use clear, descriptive commit messages

**Commit Strategy:**
- Commit 1: Add README and basic structure
- Commit 2: Add profile information
- Commit 3: Add interests and goals

**Example Commit Messages:**
```
Add project README and basic structure
Add personal profile information
Document interests and learning goals
```

**Deliverables:**
- Git log showing all commits
- Explanation of your commit strategy

---

## Part 3: Repository Management (20 points)

### Task 3.1: Repository Status & History (10 points)

**Requirements:**
- Demonstrate understanding of Git status
- Show commit history in multiple formats
- Explain repository state at each step

**Deliverables:**
- Output of `git status` at different stages
- Various `git log` formats
- Explanation of what each command shows

### Task 3.2: File Operations Practice (10 points)

**Requirements:**
- Modify existing files
- Add new files
- Practice staging selectively
- Make additional commits

**Tasks:**
1. Update your goals.md with new objectives
2. Add a new file with your favorite code snippet
3. Modify profile.json with additional information
4. Stage and commit changes appropriately

**Deliverables:**
- Commands used for modifications
- Selective staging demonstration
- Updated commit history

---

## Part 4: Documentation & Reflection (15 points)

### Task 4.1: Create Setup Documentation (5 points)

**Requirements:**
- Document your setup process
- Include troubleshooting steps you encountered
- Create a guide for others

**Deliverables:**
- Setup documentation file
- Screenshots where helpful
- Troubleshooting notes

### Task 4.2: Git Commands Reference (5 points)

**Requirements:**
- List all Git commands you learned
- Provide brief explanation for each
- Note any challenges you faced

**Deliverables:**
- Personal Git commands cheat sheet
- Explanations and examples

### Task 4.3: Reflection (5 points)

**Requirements:**
- What was most challenging?
- What did you learn?
- How will you use Git going forward?

**Deliverables:**
- Written reflection (200-300 words)
- Specific examples from your work
- Future Git usage plans

---

## Submission Requirements

### Repository Structure
Your repository must contain:
```
homework-01-[your-name]/
├── README.md                 # Project documentation
├── profile.json             # Personal information
├── interests.txt            # Your interests
├── goals.md                 # Learning goals
├── setup-guide.md          # Setup documentation
├── git-commands.md         # Commands reference
├── reflection.md           # Your reflection
└── screenshots/            # Screenshots folder
    ├── git-version.png
    ├── github-ssh-key.png
    └── git-config.png
```

### Submission Method
1. **Create GitHub Repository:**
   - Name: `homework-01-[your-name]`
   - Make it public
   - Add descriptive README

2. **Push Your Work:**
   ```bash
   git remote add origin https://github.com/yourusername/homework-01-yourname.git
   git push -u origin main
   ```

3. **Submit Repository URL:**
   - Share the GitHub repository URL
   - Ensure all files are committed and pushed

### Grading Criteria
- **Completeness (40%)**: All required files and tasks completed
- **Correctness (30%)**: Git commands used properly, configurations correct
- **Documentation (20%)**: Clear explanations, good commit messages
- **Professionalism (10%)**: Clean code, organized repository, professional presentation

---

## Verification Script

Run this script to verify your setup:

```bash
#!/bin/bash
echo "=== Git Setup Verification ==="
echo "Git version: $(git --version)"
echo ""
echo "Git configuration:"
git config --global --list
echo ""
echo "Testing repository operations..."
mkdir test-verification
cd test-verification
git init
echo "test" > test.txt
git add test.txt
git commit -m "Test commit"
echo "Repository test: SUCCESS"
cd ..
rm -rf test-verification
echo ""
echo "=== Verification Complete ==="
```

---

## Resources

- [Git Installation Guides](../installation/)
- [Git Configuration Documentation](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup)
- [GitHub SSH Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Git Cheat Sheet](../resources/cheatsheet.md)

---

## Academic Integrity

- This homework must be your own work
- You may reference documentation but not copy code
- Cite any external resources used
- Discussing concepts with classmates is encouraged
- Sharing complete solutions is not allowed

---

## Late Submission Policy

- 10% penalty per day late
- No submissions accepted after 1 week
- Technical issues are not valid excuses (test early)

---

## Support

- **Technical Issues:** Check troubleshooting sections in workshops
- **Git Problems:** Review workshop materials and tutorials
- **Questions:** Post in course discussion forum (don't share solutions)
- **Office Hours:** Attend instructor office hours for personalized help

---

## Grading Rubric

| Criteria | Excellent (90-100%) | Good (80-89%) | Satisfactory (70-79%) | Needs Improvement (<70%) |
|----------|-------------------|---------------|---------------------|-------------------------|
| Installation | Perfect setup, all configs correct | Minor config issues | Missing some settings | Major setup problems |
| Repository Ops | All operations correct, clean history | Few command errors | Multiple mistakes | Cannot perform basic ops |
| Documentation | Clear, professional, complete | Good but missing details | Basic documentation | Poor/incomplete docs |
| File Management | Proper staging, good commits | Some staging issues | Poor commit practices | No commit strategy |
| Reflection | Deep insights, specific examples | Good analysis | Basic reflection | Minimal effort |

---

## Frequently Asked Questions

**Q: Can I use a different code editor?**
A: Yes, any text editor is fine. Just ensure files are properly saved.

**Q: Do I need GitHub for this assignment?**
A: Yes, submission requires a public GitHub repository.

**Q: What if I don't have SSH access?**
A: You can use HTTPS for GitHub, but SSH is recommended.

**Q: Can I modify the file structure?**
A: Core files must be present, but you can add additional files.

**Q: What if I make mistakes in Git?**
A: That's part of learning! Document what you learned from mistakes.

---

*Remember: This homework is designed to build your Git skills progressively. Take your time, ask questions, and focus on understanding rather than just completing tasks.*
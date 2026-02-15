# Homework 2: Personal Repository & Project Management

## Due Date: [Insert due date - typically 1 week after Homework 1]

## Objective
Create a comprehensive personal repository demonstrating Git proficiency, project organization, and version control best practices.

## Estimated Time: 90-120 minutes

---

## Overview

In this homework, you'll create a personal repository that serves as your professional portfolio and demonstrates your Git skills. The repository will contain your personal projects, documentation, and follow industry best practices.

---

## Part 1: Repository Planning & Setup (20 points)

### Task 1.1: Repository Design (10 points)

**Requirements:**
- Design a professional repository structure
- Plan for scalability and organization
- Include appropriate documentation

**Repository Structure Requirements:**
```
your-name-portfolio/
├── README.md                 # Main project documentation
├── LICENSE                   # Open source license
├── .gitignore               # Git ignore rules
├── docs/                    # Documentation folder
│   ├── about.md            # About you
│   ├── projects.md         # Project showcase
│   └── skills.md           # Skills documentation
├── projects/                # Project portfolio
│   ├── project1/
│   ├── project2/
│   └── README.md
├── code-samples/           # Code examples
│   ├── python/
│   ├── javascript/
│   └── README.md
├── assets/                 # Images, documents
│   ├── images/
│   └── documents/
└── scripts/                # Utility scripts
    ├── setup.sh
    └── deploy.sh
```

**Planning Deliverables:**
- Repository structure diagram
- Explanation of each folder's purpose
- Scalability considerations

### Task 1.2: Repository Initialization (10 points)

**Requirements:**
- Create repository on GitHub first
- Clone to local machine
- Set up proper Git configuration

**Deliverables:**
- GitHub repository URL
- Local clone commands
- Repository configuration

---

## Part 2: Content Creation (35 points)

### Task 2.1: Professional README (15 points)

**Requirements:**
- Create an impressive main README.md
- Include professional formatting
- Showcase your work effectively

**README Requirements:**
- Project title with badge
- Professional description
- Your photo/avatar
- Contact information
- Skills overview with icons
- Featured projects section
- How to navigate the repository
- Contributing guidelines

**Example Structure:**
```markdown
# 👋 John Doe's Portfolio

[![GitHub](https://img.shields.io/badge/GitHub-Profile-blue)](https://github.com/johndoe)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue)](https://linkedin.com/in/johndoe)

> Computer Engineering Student | Full-Stack Developer | Open Source Enthusiast

## 🚀 About Me

I'm a passionate computer engineering student with experience in...

## 💻 Skills

- **Languages:** Python, JavaScript, Java
- **Frameworks:** React, Node.js, Django
- **Tools:** Git, Docker, AWS

## 📁 Repository Contents

- [`projects/`](./projects/) - Featured projects
- [`code-samples/`](./code-samples/) - Code examples
- [`docs/`](./docs/) - Documentation
```

### Task 2.2: Personal Documentation (10 points)

**Requirements:**
- Create comprehensive personal documentation
- Include academic and professional information
- Demonstrate technical writing skills

**Required Files:**
- `docs/about.md` - Detailed biography
- `docs/projects.md` - Project portfolio
- `docs/skills.md` - Technical skills assessment

**Content Guidelines:**
- Use proper Markdown formatting
- Include code examples where relevant
- Add links to external profiles/projects
- Keep content professional and current

### Task 2.3: Code Samples (10 points)

**Requirements:**
- Add representative code samples
- Organize by programming language
- Include README for each sample

**Sample Categories:**
- Algorithms and data structures
- Web development projects
- Automation scripts
- API integrations

**Each Sample Should Include:**
- Source code files
- README with explanation
- Requirements/dependencies
- Usage instructions

---

## Part 3: Git Workflow & Best Practices (25 points)

### Task 3.1: Branching Strategy (10 points)

**Requirements:**
- Use feature branches for development
- Demonstrate branching workflow
- Merge branches appropriately

**Required Branches:**
- `main` - Production-ready code
- `develop` - Integration branch
- Feature branches for new content

**Workflow Demonstration:**
1. Create feature branch for new content
2. Make commits on feature branch
3. Merge back to develop/main
4. Delete feature branch

**Deliverables:**
- Branch creation commands
- Commit history showing workflow
- Branch merge documentation

### Task 3.2: Commit Excellence (10 points)

**Requirements:**
- Use conventional commit messages
- Make atomic commits
- Demonstrate commit best practices

**Commit Message Convention:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Testing
- `chore:` - Maintenance

**Examples:**
```
feat: add project showcase section
docs: update README with installation instructions
fix: correct email link in contact section
```

### Task 3.3: Repository Maintenance (5 points)

**Requirements:**
- Set up proper .gitignore
- Configure repository settings
- Enable GitHub features

**Deliverables:**
- Comprehensive .gitignore file
- Repository settings documentation
- GitHub features enabled (Issues, Projects, etc.)

---

## Part 4: Advanced Features (15 points)

### Task 4.1: GitHub Integration (10 points)

**Requirements:**
- Set up GitHub Pages (optional)
- Add repository topics/tags
- Configure repository settings
- Create professional profile

**Features to Implement:**
- Repository description and topics
- Professional README with badges
- GitHub Actions for automation (optional)
- Repository insights and analytics

### Task 4.2: Documentation Excellence (5 points)

**Requirements:**
- Create contributing guidelines
- Add code of conduct
- Include license information
- Set up issue templates

**Deliverables:**
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `LICENSE` file
- Issue and PR templates

---

## Part 5: Quality Assurance (5 points)

### Task 5.1: Code Quality

**Requirements:**
- Ensure all files are properly formatted
- Test all links and references
- Validate repository structure
- Check for broken functionality

**Deliverables:**
- Quality checklist completion
- Validation script output
- Final repository audit

---

## Submission Requirements

### Repository Standards
- **Naming:** `your-name-portfolio` or `your-name-profile`
- **Visibility:** Public repository
- **License:** MIT or similar open source license
- **Description:** Professional repository description

### Required Files Checklist
- [ ] Professional README.md with badges and formatting
- [ ] Comprehensive .gitignore
- [ ] docs/about.md with personal information
- [ ] docs/projects.md with project showcase
- [ ] docs/skills.md with technical skills
- [ ] code-samples/ with representative code
- [ ] LICENSE file
- [ ] CONTRIBUTING.md guidelines

### Git History Requirements
- Minimum 10 commits
- Feature branch usage demonstrated
- Conventional commit messages
- Clean, logical commit progression

### Submission Method
1. **Repository URL:** Submit your GitHub repository URL
2. **Repository Access:** Ensure repository is public
3. **Branch Status:** All work merged to main branch
4. **Documentation:** All links and references working

---

## Grading Criteria

### Content Quality (40%)
- Professional presentation and formatting
- Comprehensive and accurate information
- Creative and engaging content
- Technical writing quality

### Git Proficiency (30%)
- Proper branching strategy implementation
- Conventional commit message usage
- Clean repository history
- Best practices adherence

### Repository Organization (20%)
- Logical file structure
- Professional documentation
- GitHub features utilization
- Scalability considerations

### Technical Implementation (10%)
- Working links and references
- Proper file formatting
- Code quality and organization
- Repository maintenance

---

## Resources

- [GitHub Profile README Ideas](https://github.com/abhisheknaiidu/awesome-github-profile-readme)
- [Markdown Guide](https://www.markdownguide.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Choose a License](https://choosealicense.com/)

---

## Example Repository Structure

```
johndoe-portfolio/
├── README.md
├── LICENSE
├── .gitignore
├── docs/
│   ├── about.md
│   ├── projects.md
│   └── skills.md
├── projects/
│   ├── calculator-app/
│   │   ├── README.md
│   │   └── calculator.py
│   └── todo-list/
│       ├── README.md
│       ├── app.js
│       └── index.html
├── code-samples/
│   ├── python/
│   │   ├── fibonacci.py
│   │   └── README.md
│   └── javascript/
│       ├── async-example.js
│       └── README.md
└── assets/
    └── images/
        └── profile.jpg
```

---

## Tips for Success

1. **Start Early:** Plan your repository structure before coding
2. **Quality over Quantity:** Better to have 3 well-documented projects than 10 poorly done ones
3. **Regular Commits:** Commit early and often with meaningful messages
4. **Professional Presentation:** Use badges, emojis, and proper formatting
5. **Test Everything:** Ensure all links work and content displays correctly

---

## Common Mistakes to Avoid

- Poor commit messages ("update" or "fix")
- No .gitignore file
- Broken links in README
- Unorganized file structure
- Missing license or documentation
- Not using branches for features

---

## Extension Activities (Bonus Points)

- Set up GitHub Pages for your portfolio
- Add GitHub Actions for automated testing
- Create a project website
- Integrate with other platforms (LinkedIn, personal website)
- Add repository analytics and insights

---

*This homework is your chance to create a professional online presence. Treat it as a real portfolio that potential employers or collaborators might see.*
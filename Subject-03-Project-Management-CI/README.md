# Subject 3: Project Management with Issues/Boards and Basic CI

## Overview

This subject covers modern software project management using GitHub's built-in tools and introduces Continuous Integration (CI) with GitHub Actions. Students will learn to organize development workflows, track progress, and automate code quality checks.

## Learning Objectives

By the end of this subject, you will be able to:

- **Manage Projects Effectively**: Create and organize GitHub Issues for task tracking
- **Use Project Boards**: Implement Kanban-style workflows with GitHub Projects
- **Apply CI/CD Practices**: Set up automated testing and code quality checks
- **Collaborate in Teams**: Use milestones, labels, and assignees for project coordination
- **Automate Workflows**: Configure GitHub Actions for continuous integration

## Prerequisites

- Completion of Subject 1 (Git Basics & Project Workflows)
- GitHub account with repository creation permissions
- Basic understanding of software development lifecycle
- Familiarity with code testing concepts

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[GitHub Issues Fundamentals](tutorials/01-github-issues.md)**
   - Creating and managing issues effectively
   - Issue templates and best practices
   - Labels, milestones, and assignees
   - Issue lifecycle management

2. **[Project Boards & Workflow](tutorials/02-project-boards.md)**
   - Kanban methodology on GitHub
   - Automated card movement
   - Custom workflows and automation
   - Team collaboration features

### 🛠️ Workshops (Hands-on Practice)

1. **[Creating Issues](workshops/workshop-01-create-issues.md)**
   - Setting up project repository
   - Creating comprehensive issues
   - Using templates and labels
   - Managing issue relationships

2. **[Project Boards Workflow](workshops/workshop-02-project-boards-workflow.md)**
   - Building project boards
   - Card management and automation
   - Progress tracking
   - Team coordination

### 📝 Homework Assignments

1. **[Issue Management](homeworks/homework-01-issue-management.md)**
   - Create comprehensive project issues
   - Implement issue tracking workflow
   - Document project management practices

### 📋 Assessments

The `assessments/` directory contains:
- Project management quiz
- CI/CD configuration assessment
- Peer review checklists

## Key Concepts

### GitHub Issues Management

Issues serve as the foundation for project management:

- **Task Tracking**: Individual work items and deliverables
- **Bug Reports**: Software defect documentation and tracking
- **Feature Requests**: New functionality proposals and discussions
- **Documentation**: Historical record of project decisions

### Project Boards (Kanban)

Visual project management using cards and columns:

- **Backlog**: Ideas and tasks to be prioritized
- **To Do**: Work ready to be started
- **In Progress**: Active development tasks
- **Review**: Work awaiting feedback
- **Done**: Completed deliverables

### Continuous Integration

Automated code quality and testing:

- **Automated Testing**: Run tests on every code change
- **Code Linting**: Enforce coding standards
- **Build Verification**: Ensure code compiles correctly
- **Security Scanning**: Check for vulnerabilities

## Resources & References

### 📖 Official Documentation
- [GitHub Issues Documentation](https://docs.github.com/en/issues)
- [GitHub Projects Guide](https://docs.github.com/en/issues/organizing-your-work-with-project-boards)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### 🛠️ Tools & Setup
- [Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [Project Board Automation](https://docs.github.com/en/issues/organizing-your-work-with-project-boards/managing-project-boards)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)

### 📚 Additional Learning
- [GitHub Skills: Project Management](https://skills.github.com/)
- [Kanban Methodology Guide](https://www.atlassian.com/agile/kanban)
- [CI/CD Best Practices](https://docs.github.com/en/actions/guides/about-continuous-integration)

## Getting Started

1. **Set up GitHub Account** following the guides in `installation/`
2. **Create Practice Repository** for hands-on exercises
3. **Complete Workshop 1** to create your first issues
4. **Build Project Board** in Workshop 2
5. **Configure CI/CD** for automated workflows

## GitHub Issues Best Practices

### Writing Effective Issues

```markdown
# Good Issue Title: "Add user authentication to login page"

## Description
**Problem:** Users cannot securely access their accounts
**Expected behavior:** Users should be able to log in with email/password
**Current behavior:** No login functionality exists

## Acceptance Criteria
- [ ] Login form on homepage
- [ ] Email/password validation
- [ ] Error messages for invalid credentials
- [ ] Session management after login

## Additional Context
- Design mockups attached
- Related to user story #123
- Priority: High
```

### Issue Labels Strategy

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Beginner-friendly tasks
- `help wanted`: Community contributions welcome
- `priority:high/medium/low`: Urgency levels

## Project Board Workflows

### Basic Kanban Setup

```
📋 Backlog          🔄 To Do           🚧 In Progress       ✅ Done
├── New features    ├── Ready tasks    ├── Active work      ├── Completed
├── Bug reports     ├── This sprint    ├── Code review       ├── Deployed
└── Improvements    └── High priority  └── Testing          └── Released
```

### Automation Rules

- Move issues to "To Do" when labeled `ready`
- Move to "In Progress" when assigned
- Move to "Done" when linked PR is merged
- Close issues automatically when moved to "Done"

## GitHub Actions CI/CD

### Basic Workflow Structure

```yaml
name: CI Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: uv add -r requirements.txt
      - name: Run tests
        run: pytest
      - name: Run linting
        run: flake8 src/
```

### Common CI Actions

- **Code Quality**: `psf/black`, `pre-commit/action`
- **Testing**: `pytest`, `jest`, test coverage reporting
- **Security**: `github/super-linter`, dependency scanning
- **Deployment**: AWS, Azure, Google Cloud integrations

## Assessment Criteria

- **Issue Management**: Clear, well-structured issues with proper metadata
- **Project Organization**: Effective use of boards and automation
- **CI/CD Setup**: Proper workflow configuration and automation
- **Team Collaboration**: Appropriate use of assignees, reviewers, and milestones
- **Documentation**: Clear project documentation and guidelines

## Common Project Management Patterns

### Sprint Planning
1. Review backlog and prioritize issues
2. Assign issues to sprint milestone
3. Move prioritized items to "To Do" column
4. Daily standups to track progress

### Code Review Process
1. Create feature branch from issue
2. Implement changes and create PR
3. Request reviews from team members
4. Address feedback and merge when approved
5. Close related issue automatically

## Troubleshooting

### Common Issues & Solutions

- **Issues not appearing on board**: Check project automation settings
- **CI not running**: Verify workflow file syntax and triggers
- **Labels not applying**: Review repository permissions and settings
- **Automation not working**: Check project board configuration

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 4**: Containerization with Docker
- **Subject 5**: FastAPI web development
- Advanced CI/CD pipelines in future subjects

---

*Effective project management and automated workflows are essential for scalable software development. This subject provides the foundation for professional development practices.*

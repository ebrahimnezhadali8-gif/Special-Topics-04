# Homework 3: Branching Strategy & Conflict Resolution

## Due Date: [Insert due date - typically 1 week after Homework 2]

## Objective
Master Git branching workflows, practice conflict resolution, and implement professional development practices through a simulated team project.

## Estimated Time: 120-150 minutes

---

## Scenario: Team Blog Platform Development

You are working on a team developing a blog platform called "TechBlog". The team consists of:
- **You (Lead Developer)**: Main feature implementation
- **Alice (UI Developer)**: Frontend styling
- **Bob (Backend Developer)**: API development
- **Charlie (DevOps)**: Deployment and infrastructure

The project requires multiple features to be developed simultaneously while maintaining code quality and avoiding conflicts.

---

## Part 1: Repository Setup & Branching Strategy (20 points)

### Task 1.1: Initialize Blog Project (10 points)

**Requirements:**
- Create a new repository called `techblog-platform`
- Set up professional project structure
- Initialize with basic blog functionality

**Project Structure:**
```
techblog-platform/
├── README.md
├── requirements.txt
├── app.py                    # Main Flask application
├── models.py                # Database models
├── routes.py                # API routes
├── templates/
│   ├── base.html
│   ├── index.html
│   └── post.html
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── tests/
│   └── test_basic.py
└── docs/
    └── api.md
```

**Initial Files to Create:**
- Basic Flask app structure
- Simple homepage template
- Basic CSS styling
- API documentation stub

**Deliverables:**
- Repository initialization
- Complete project structure
- Working basic application

### Task 1.2: Implement Branching Strategy (10 points)

**Requirements:**
- Set up Git Flow branching model
- Create appropriate branches for team development
- Document branching strategy

**Required Branches:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/user-auth` - User authentication feature
- `feature/post-management` - Blog post CRUD operations
- `feature/comments` - Comment system
- `hotfix/security-patch` - Security fixes

**Branch Naming Convention:**
```
feature/    - New features
hotfix/     - Critical fixes
release/    - Release preparation
bugfix/     - Bug fixes
```

**Deliverables:**
- Branch creation commands
- Branching strategy documentation
- Branch purpose explanation

---

## Part 2: Feature Development (40 points)

### Task 2.1: User Authentication Feature (15 points)

**Requirements:**
- Create feature branch for user authentication
- Implement login/logout functionality
- Add user registration
- Create user session management

**Implementation Steps:**
1. Create `feature/user-auth` branch
2. Add user model to `models.py`
3. Create authentication routes in `routes.py`
4. Add login/register templates
5. Implement session handling
6. Add form validation
7. Create unit tests

**Commit Strategy:**
- Use conventional commits
- Make atomic commits for each feature component
- Test after each major change

**Deliverables:**
- Complete authentication system
- User registration and login functionality
- Session management
- Unit tests for auth features

### Task 2.2: Blog Post Management (15 points)

**Requirements:**
- Implement CRUD operations for blog posts
- Create post creation/editing interface
- Add post listing and detail views
- Implement author permissions

**Implementation Steps:**
1. Create `feature/post-management` branch
2. Add Post model to `models.py`
3. Create post CRUD routes
4. Add post templates (create, edit, list, detail)
5. Implement author-only editing
6. Add post validation
7. Create post management tests

**Features Required:**
- Create new posts
- Edit existing posts (author only)
- Delete posts (author only)
- List all posts with pagination
- View individual posts

**Deliverables:**
- Complete post management system
- Author permission controls
- Post validation and error handling
- Comprehensive tests

### Task 2.3: Comments System (10 points)

**Requirements:**
- Add commenting functionality to posts
- Implement nested comments (optional)
- Add comment moderation features
- Create comment API endpoints

**Implementation Steps:**
1. Create `feature/comments` branch
2. Add Comment model
3. Create comment routes
4. Add comment forms to post detail page
5. Implement comment threading (optional)
6. Add comment moderation controls

**Deliverables:**
- Comment creation and display
- Comment moderation features
- API endpoints for comments
- Comment validation

---

## Part 3: Conflict Resolution & Merging (25 points)

### Task 3.1: Create Merge Conflicts (10 points)

**Requirements:**
- Intentionally create conflicting changes
- Practice different conflict scenarios
- Document conflict resolution process

**Conflict Scenarios to Create:**
1. **Template Conflict:** Modify same template file in different branches
2. **Route Conflict:** Add same route in different branches
3. **Model Conflict:** Modify same model in different branches
4. **Styling Conflict:** Edit same CSS file in different branches

**Steps:**
1. Make conflicting changes in different branches
2. Attempt to merge branches
3. Resolve conflicts manually
4. Complete merge successfully

**Deliverables:**
- Documented conflict scenarios
- Before/after conflict markers
- Resolution strategies used
- Final merged code

### Task 3.2: Branch Merging Strategy (10 points)

**Requirements:**
- Demonstrate different merge strategies
- Use appropriate merge types for different scenarios
- Maintain clean project history

**Merge Scenarios:**
1. **Fast-forward merge** for simple feature additions
2. **Three-way merge** for conflicting changes
3. **Squash merge** for consolidating small commits
4. **Rebase** for maintaining linear history

**Deliverables:**
- Different merge strategies demonstrated
- Git history showing merge types
- Explanation of when to use each strategy

### Task 3.3: Hotfix Implementation (5 points)

**Requirements:**
- Simulate critical security issue
- Create hotfix branch from main
- Deploy fix immediately

**Hotfix Process:**
1. Create `hotfix/security-patch` from `main`
2. Implement security fix
3. Test fix thoroughly
4. Merge directly to `main` and `develop`
5. Tag release version

**Deliverables:**
- Hotfix branch and commits
- Security fix implementation
- Release tagging

---

## Part 4: Code Review & Quality Assurance (10 points)

### Task 4.1: Pull Request Simulation (5 points)

**Requirements:**
- Create detailed pull request descriptions
- Simulate code review process
- Document review feedback and changes

**PR Requirements:**
- Clear title and description
- List of changes made
- Testing instructions
- Screenshots (if UI changes)
- Related issues/tasks

**Deliverables:**
- Pull request documentation
- Code review checklist
- Revision history

### Task 4.2: Testing & Validation (5 points)

**Requirements:**
- Create comprehensive test suite
- Validate all features work correctly
- Test conflict resolution didn't break functionality

**Testing Requirements:**
- Unit tests for all models
- Integration tests for API endpoints
- UI tests for key user flows
- Conflict resolution validation

**Deliverables:**
- Test files and test results
- Validation checklist
- Bug reports and fixes

---

## Part 5: Documentation & Presentation (5 points)

### Task 5.1: Project Documentation

**Requirements:**
- Create comprehensive project documentation
- Document development workflow
- Create deployment instructions

**Documentation Requirements:**
- API documentation
- Setup/installation guide
- Development workflow guide
- Branching strategy documentation
- Deployment instructions

**Deliverables:**
- Complete documentation set
- Workflow diagrams
- Setup scripts

---

## Submission Requirements

### Repository Structure
```
techblog-platform/
├── README.md                 # Main project documentation
├── requirements.txt         # Python dependencies
├── app.py                   # Main Flask application
├── models.py               # Database models
├── routes.py               # API routes
├── templates/              # HTML templates
├── static/                 # CSS, JS, images
├── tests/                  # Test files
├── docs/                   # Documentation
└── .gitignore
```

### Git History Requirements
- Minimum 15 branches created
- 50+ commits with conventional messages
- Demonstrated merge conflicts and resolution
- Clean branching strategy implementation
- Professional commit history

### Branch Status
- All feature branches merged or clearly documented
- `main` branch contains production-ready code
- `develop` branch contains latest integrated features
- Clear branch organization

### Submission Method
1. **Repository URL:** Submit GitHub repository URL
2. **Repository Access:** Ensure repository is public
3. **Documentation:** Include comprehensive README
4. **Demo:** Provide instructions to run the application

---

## Grading Criteria

### Branching Strategy (25%)
- Proper Git Flow implementation
- Appropriate branch naming
- Clean merge history
- Strategy documentation

### Feature Implementation (30%)
- Complete functionality for all features
- Code quality and organization
- Proper error handling
- User experience considerations

### Conflict Resolution (20%)
- Multiple conflict scenarios demonstrated
- Proper resolution techniques
- Documentation of process
- No broken functionality

### Code Quality (15%)
- Comprehensive testing
- Clean, readable code
- Proper documentation
- Best practices adherence

### Documentation (10%)
- Clear project documentation
- Workflow explanations
- Setup and deployment guides
- Professional presentation

---

## Technical Requirements

### Technology Stack
- **Backend:** Python Flask
- **Database:** SQLite (for simplicity)
- **Frontend:** HTML/CSS/JavaScript
- **Testing:** pytest or unittest
- **Documentation:** Markdown

### Dependencies
```
Flask==2.3.3
Flask-SQLAlchemy==3.0.5
Flask-WTF==1.1.1
pytest==7.4.0
```

---

## Resources

- [Git Flow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Git Merge Strategies](https://www.atlassian.com/git/tutorials/using-branches/merge-strategy)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## Tips for Success

1. **Plan Before Coding:** Design your branching strategy first
2. **Commit Frequently:** Make small, focused commits
3. **Test Merges:** Always test after merging branches
4. **Document Conflicts:** Keep records of complex conflict resolutions
5. **Clean Up Branches:** Delete merged branches to keep repository tidy

---

## Common Challenges

- **Complex Conflicts:** Break down large conflicts into smaller pieces
- **Branch Management:** Use `git branch -a` to track all branches
- **Merge Strategy Choice:** Consider project needs when choosing merge types
- **Testing After Merge:** Always run full test suite after merging

---

## Extension Activities (Bonus Points)

- Implement CI/CD pipeline with GitHub Actions
- Add Docker containerization
- Create admin dashboard for content management
- Implement real-time notifications
- Add user roles and permissions
- Create RESTful API documentation with Swagger

---

## Evaluation Checklist

- [ ] Professional repository structure
- [ ] Complete Git Flow implementation
- [ ] All required features implemented
- [ ] Merge conflicts created and resolved
- [ ] Comprehensive testing
- [ ] Professional documentation
- [ ] Working web application
- [ ] Clean commit history

---

*This homework simulates real-world team development. Focus on collaboration practices, code quality, and professional Git workflows.*
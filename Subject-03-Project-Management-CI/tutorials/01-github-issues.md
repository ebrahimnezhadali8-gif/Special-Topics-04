# Tutorial 1: GitHub Issues Fundamentals

## Learning Objectives
By the end of this tutorial, you will be able to:
- Create and manage GitHub issues effectively
- Use issue templates for consistency
- Apply labels, milestones, and assignees appropriately
- Write clear, actionable issue descriptions
- Understand the issue lifecycle and best practices

## Prerequisites
- GitHub account set up (see [setup guide](../installation/github-account-setup.md))
- Repository created (`project-management-practice`)
- Basic understanding of project management concepts

---

## What are GitHub Issues?

GitHub Issues are the building blocks of project management on GitHub. They serve as:

- **Task tracking**: Individual units of work to be completed
- **Bug reports**: Places to report and discuss software defects
- **Feature requests**: Ways to propose and discuss new functionality
- **Discussion forums**: Places for team communication and decision-making
- **Documentation**: Historical record of project decisions and changes

### Issue Components
Each issue contains:
- **Title**: Clear, descriptive summary
- **Description**: Detailed explanation with context
- **Labels**: Categories and metadata
- **Assignees**: People responsible for the work
- **Milestones**: Project phases or deadlines
- **Comments**: Discussion thread
- **Linked items**: Pull requests, commits, other issues

---

## Creating Your First Issue

### Step 1: Navigate to Issues
1. Go to your repository: `https://github.com/yourusername/project-management-practice`
2. Click the **"Issues"** tab
3. Click **"New issue"**

### Step 2: Write an Effective Title
**Good titles are:**
- Clear and specific
- Action-oriented
- Include key context

**Examples:**
- ✅ `Add user registration form to homepage`
- ✅ `Fix login button not responding on mobile`
- ✅ `Update API documentation for v2.0 endpoints`
- ❌ `Bug`
- ❌ `Need to fix something`
- ❌ `Issue with the website`

### Step 3: Write a Comprehensive Description
A good issue description includes:

#### Problem Statement
**What is the issue?**
- Clear explanation of what's wrong or what needs to be done
- Include steps to reproduce (for bugs)
- Provide context about why this matters

#### Acceptance Criteria
**What does "done" look like?**
- Specific, measurable outcomes
- Checklist of requirements
- Success metrics

#### Additional Context
**Supporting information:**
- Screenshots or error messages
- Environment details
- Related issues or discussions
- Proposed solutions or approaches

### Step 4: Example Issue Template

**Title:** `Implement dark mode toggle for user dashboard`

**Description:**
```
## Problem
Users have requested a dark mode option for better accessibility and to reduce eye strain during extended use. Currently, the application only supports light mode.

## Current Behavior
- Application renders in light mode only
- No user preference setting for theme

## Expected Behavior
- Users can toggle between light and dark modes
- Theme preference persists across sessions
- Smooth transition animation between themes

## Acceptance Criteria
- [ ] Add theme toggle button to dashboard header
- [ ] Implement CSS variables for theme colors
- [ ] Add localStorage to remember user preference
- [ ] Test theme switching on all major browsers
- [ ] Ensure proper contrast ratios for accessibility

## Additional Context
- Design mockups available in #design-resources
- Should work with existing component library
- Consider system preference detection as fallback

## Environment
- Browser: Chrome 110+, Firefox 105+, Safari 16+
- OS: Windows 10+, macOS 12+, Linux
- Screen size: Responsive design required
```

---

## Issue Templates

### Why Use Templates?
- **Consistency**: Standard format across all issues
- **Completeness**: Ensures all necessary information is captured
- **Efficiency**: Reduces time spent writing issue descriptions
- **Quality**: Guides contributors to provide better information

### Step 5: Create Issue Templates
1. In your repository, create the directory: `.github/ISSUE_TEMPLATES/`
2. Create template files:

**Bug Report Template** (`.github/ISSUE_TEMPLATES/bug-report.md`):
```markdown
---
name: Bug Report
about: Report a bug or unexpected behavior
title: "[BUG] "
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots to help explain the problem.

## Environment
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 110]
- Version: [e.g., v1.2.3]

## Additional Context
Any other information about the problem.
```

**Feature Request Template** (`.github/ISSUE_TEMPLATES/feature-request.md`):
```markdown
---
name: Feature Request
about: Suggest a new feature or enhancement
title: "[FEATURE] "
labels: enhancement
assignees: ''
---

## Feature Summary
Brief description of the proposed feature.

## Problem Statement
What problem does this feature solve? Why is it needed?

## Proposed Solution
Describe your proposed solution in detail.

## Alternative Solutions
Describe any alternative solutions you've considered.

## Additional Context
- Mockups, diagrams, or examples
- Related issues or discussions
- Implementation notes or constraints
```

### Step 6: Configure Template Properties
Each template can include:
- `name`: Display name in the issue creation dropdown
- `about`: Description shown to users
- `title`: Default title prefix
- `labels`: Automatically applied labels
- `assignees`: Automatically assigned users

---

## Labels and Organization

### Step 7: Create Useful Labels
Go to your repository → Issues → Labels → "New label"

**Bug Labels:**
- `bug`: Something isn't working
- `regression`: Worked before, now broken
- `security`: Security vulnerability

**Feature Labels:**
- `enhancement`: New feature or improvement
- `feature-request`: Requested functionality
- `breaking-change`: Changes that break existing functionality

**Priority Labels:**
- `critical`: Must fix immediately
- `high`: Should fix soon
- `medium`: Fix when possible
- `low`: Nice to have

**Status Labels:**
- `help-wanted`: Community contributions welcome
- `good-first-issue`: Beginner-friendly
- `question`: Needs more information
- `wontfix`: Will not be fixed

**Other Labels:**
- `documentation`: Documentation improvements
- `testing`: Testing related
- `performance`: Performance improvements
- `accessibility`: Accessibility concerns

### Step 8: Label Best Practices
- **Be consistent**: Use the same labels across projects
- **Limit quantity**: Don't create too many labels (aim for 10-15)
- **Clear names**: Use descriptive, unambiguous names
- **Color coding**: Use colors to group related labels

---

## Assignees and Responsibility

### Step 9: Assign Issues
1. Open an issue
2. Click **"Assignees"** on the right sidebar
3. Select team members or yourself
4. Assignees receive notifications about issue updates

### Step 10: Assignment Best Practices
- **Self-assignment**: Assign yourself when starting work
- **Team assignment**: Assign based on expertise and workload
- **Multiple assignees**: Use for complex issues requiring multiple people
- **Regular updates**: Keep assignees informed of progress

---

## Milestones and Project Planning

### Step 11: Create Milestones
1. Go to repository → Issues → Milestones
2. Click **"New milestone"**

**Milestone Components:**
- **Title**: Version number or release name (e.g., "v1.0.0", "Q4 2024")
- **Description**: What's included in this milestone
- **Due date**: Target completion date

### Step 12: Associate Issues with Milestones
1. Open an issue
2. Click **"Milestones"** in the right sidebar
3. Select the appropriate milestone

### Step 13: Milestone Progress Tracking
Milestones show:
- **Completion percentage**: Issues closed vs total issues
- **Due date warnings**: Visual indicators for approaching deadlines
- **Burndown charts**: Progress over time

---

## Issue Lifecycle Management

### Step 14: Issue States
- **Open**: Active issue requiring attention
- **Closed**: Issue resolved or no longer relevant
- **Reopened**: Previously closed issue that needs attention again

### Step 15: Closing Issues
**Automatic Closure:**
- Pull requests can close issues using keywords:
  - `Closes #123`
  - `Fixes #123`
  - `Resolves #123`

**Manual Closure:**
- Click "Close issue" when work is complete
- Add closing comment explaining the resolution

### Step 16: Issue References
**Link issues together:**
- `#123`: Reference another issue
- `username/repo#123`: Reference issue in another repository
- Commit messages can reference issues

---

## Advanced Issue Features

### Step 17: Issue Comments and Discussion
- **Threaded conversations**: Keep discussions organized
- **@mentions**: Notify specific people
- **Emoji reactions**: Quick feedback on comments
- **Code snippets**: Share code in comments
- **Task lists**: Create checklists within comments

### Step 18: Issue Search and Filtering
**Search Syntax:**
- `is:open`: Show only open issues
- `is:closed`: Show only closed issues
- `author:username`: Issues created by specific user
- `assignee:username`: Issues assigned to specific user
- `label:bug`: Issues with specific label
- `milestone:v1.0`: Issues in specific milestone

### Step 19: Saved Searches
1. Create custom search queries
2. Save them as bookmarks
3. Share search links with team members

---

## Issue Management Workflows

### Bug Report Workflow
1. **Report**: User creates bug report using template
2. **Triage**: Team reviews and adds appropriate labels
3. **Investigation**: Developer investigates and adds comments
4. **Fix**: Developer creates fix and pull request
5. **Review**: Code review and testing
6. **Close**: Issue closed when fix is deployed

### Feature Request Workflow
1. **Proposal**: User proposes feature with detailed description
2. **Discussion**: Team discusses feasibility and requirements
3. **Planning**: Feature added to milestone and project board
4. **Implementation**: Developer implements feature
5. **Review**: Code review and user acceptance testing
6. **Release**: Feature deployed and issue closed

### Maintenance Workflow
1. **Identify**: Regular review of open issues
2. **Prioritize**: Assign labels and milestones
3. **Schedule**: Add to project board and sprint planning
4. **Execute**: Work through prioritized issues
5. **Review**: Regular status updates and progress tracking

---

## Best Practices

### Writing Effective Issues
1. **Be specific**: Include concrete details, not vague descriptions
2. **Provide context**: Explain why the issue matters
3. **Include examples**: Show expected vs actual behavior
4. **Use formatting**: Code blocks, lists, and formatting for clarity
5. **Test reproduction**: Verify steps work for others

### Issue Maintenance
1. **Regular cleanup**: Close stale or irrelevant issues
2. **Label consistency**: Apply labels systematically
3. **Progress updates**: Comment on long-running issues
4. **Documentation**: Use issues to document decisions

### Team Collaboration
1. **Clear ownership**: Assign issues to responsible parties
2. **Regular communication**: Use comments for updates
3. **Knowledge sharing**: Document solutions for future reference
4. **Feedback culture**: Encourage constructive feedback

---

## Common Pitfalls to Avoid

- **Vague titles**: "Fix bug" instead of "Login form validation fails for special characters"
- **Missing context**: Issues without enough information to understand the problem
- **No acceptance criteria**: Unclear definition of "done"
- **Ignoring feedback**: Not responding to comments or review feedback
- **Over-labeling**: Too many labels making issues hard to find
- **Stale issues**: Leaving issues open when they're no longer relevant

---

## Practice Exercises

### Exercise 1: Create Issue Templates
1. Create the `.github/ISSUE_TEMPLATES/` directory
2. Add bug report and feature request templates
3. Test the templates by creating sample issues

### Exercise 2: Label System
1. Create a comprehensive label system for your repository
2. Apply labels to existing issues
3. Create issues using different label combinations

### Exercise 3: Milestone Planning
1. Create a milestone for your next project phase
2. Associate several issues with the milestone
3. Track progress as you complete issues

### Exercise 4: Issue Lifecycle
1. Create an issue from start to finish
2. Assign it, add comments, link to a pull request
3. Close it with proper documentation

---

## Summary

Key concepts covered:
- **Issue creation**: Clear titles and comprehensive descriptions
- **Templates**: Standardized issue creation process
- **Labels**: Effective categorization and filtering
- **Assignees**: Responsibility and accountability
- **Milestones**: Project planning and progress tracking
- **Lifecycle**: From creation to resolution
- **Best practices**: Professional issue management

Effective issue management is the foundation of successful project management. Well-structured issues lead to better communication, clearer requirements, and more successful project outcomes.

---

## Additional Resources

- [GitHub Issues Documentation](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues)
- [Issue Templates Guide](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [Issue Best Practices](https://github.com/github/docs/blob/main/content/issues/tracking-your-work-with-issues/about-issues.md)
- [Writing Effective Issues](https://wiredcraft.com/blog/how-we-write-our-github-issues/)

---

## Quiz

1. What are the key components of an effective issue description?
2. Why are issue templates important for project management?
3. How do labels help with issue organization?
4. What is the difference between assignees and mentions?
5. How do milestones contribute to project planning?
6. When should you close an issue?
7. How can issues be linked to pull requests?
8. What makes a good issue title?

---

*Mastering GitHub Issues is essential for effective project management. Clear, well-organized issues lead to better collaboration and successful project outcomes.* 📋

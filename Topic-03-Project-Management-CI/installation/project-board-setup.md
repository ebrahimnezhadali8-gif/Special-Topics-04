# Project Board Setup & Configuration

## Overview
This guide will help you set up and configure GitHub Project boards for effective project management. Project boards help you organize and track work using Kanban-style workflows.

## Prerequisites
- GitHub account set up (see [GitHub Account Setup](github-account-setup.md))
- Repository created (`project-management-practice`)
- Basic understanding of project management concepts

---

## Part 1: Understanding Project Boards

### What is a GitHub Project Board?
- **Kanban-style board**: Visualize work in columns (To Do, In Progress, Done)
- **Issue tracking**: Connect issues and pull requests to board items
- **Team collaboration**: Share boards with team members
- **Automation**: Automate card movement based on events
- **Templates**: Use built-in templates for common workflows

### When to Use Project Boards
- Sprint planning and tracking
- Feature development workflows
- Bug tracking and resolution
- Release management
- Team task coordination

---

## Part 2: Creating Your First Project Board

### Step 1: Navigate to Projects
1. Go to your repository: `https://github.com/yourusername/project-management-practice`
2. Click the **"Projects"** tab
3. Click **"New project"**

### Step 2: Choose Project Template
GitHub offers several built-in templates:

1. **Basic Kanban** (Recommended for beginners):
   - Columns: To do, In Progress, Done
   - Simple and straightforward

2. **Automated Kanban**:
   - Includes automation rules
   - Automatically moves cards based on events

3. **Bug triage**:
   - Specialized for bug tracking
   - Columns: New, Triaged, In Progress, Closed

4. **Team planning**:
   - For team sprint planning
   - Includes backlog and sprint columns

**For this course**: Choose **"Basic Kanban"** template

### Step 3: Configure Project Details
1. **Project name**: `Course Project Management`
2. **Description**: `Learning project management with GitHub Issues and CI`
3. **Project visibility**:
   - **Private**: Only you and invited collaborators can see
   - **Public**: Anyone can see (good for portfolio)
4. Click **"Create project"**

---

## Part 3: Customizing Your Board

### Step 4: Understanding Default Columns
Your Basic Kanban board comes with three columns:
- **To do**: Tasks waiting to be started
- **In Progress**: Tasks currently being worked on
- **Done**: Completed tasks

### Step 5: Add Custom Columns
Let's customize the board for our course workflow:

1. Click **"+"** next to the "Done" column
2. Add these columns in order:
   - `Review` (for pull request reviews)
   - `Testing` (for CI/testing phase)
   - `Blocked` (for tasks stuck on dependencies)

**Your board should now have**:
1. To do
2. In Progress
3. Review
4. Testing
5. Done
6. Blocked

### Step 6: Configure Column Settings
1. Click the **"..."** menu on each column
2. **Column name**: Edit if needed
3. **Column description**: Add descriptions:
   - To do: "Tasks ready to be worked on"
   - In Progress: "Currently active tasks"
   - Review: "Pull requests awaiting review"
   - Testing: "Running automated tests"
   - Done: "Completed and merged work"
   - Blocked: "Tasks waiting on dependencies"

---

## Part 4: Adding Issues to Your Board

### Step 7: Create Issues for Board Cards
Let's create some sample issues to populate your board:

1. Go to your repository → **"Issues"** tab
2. Click **"New issue"**
3. Create these issues:

**Issue 1: Set up project structure**
- Title: `Set up project structure`
- Description: `Create basic project folders and initial files`
- Labels: `enhancement`, `good first issue`
- Click "Submit new issue"

**Issue 2: Add CI workflow**
- Title: `Add GitHub Actions CI workflow`
- Description: `Create automated testing and linting workflow`
- Labels: `ci`, `automation`
- Click "Submit new issue"

**Issue 3: Create documentation**
- Title: `Create project documentation`
- Description: `Write README and API documentation`
- Labels: `documentation`
- Click "Submit new issue"

### Step 8: Add Issues to Project Board
1. Go back to your **"Projects"** tab
2. Click on your project: `Course Project Management`
3. Click **"+"** in the "To do" column
4. Select **"Add existing issues"**
5. Search for your repository: `yourusername/project-management-practice`
6. Select the issues you created
7. Click **"Add selected issues"**

---

## Part 5: Board Customization & Features

### Step 9: Add Automation Rules
GitHub Projects supports automation to move cards automatically:

1. Click the **"..."** menu in the top-right of your board
2. Select **"Workflows"**
3. Enable these automations:
   - **When an issue is closed**: Move to "Done"
   - **When a pull request is merged**: Move to "Done"
   - **When a pull request is closed**: Move to "Done"

### Step 10: Set Up Filters and Views
1. Click **"View options"** (funnel icon)
2. **Group by**: Try "Status" or "Assignee"
3. **Filter by**: Filter by labels, assignees, etc.
4. **Sort by**: Sort by creation date, updated date, etc.

### Step 11: Add Board Description
1. Click the **"..."** menu → **"Settings"**
2. Add a description: `Project management learning board for GitHub Issues and CI workflows`
3. Add README content for board documentation

---

## Part 6: Advanced Board Features

### Step 12: Create Sub-issues (if available)
GitHub now supports sub-issues for breaking down complex tasks:

1. Open an issue on your board
2. Click **"Add sub-issue"**
3. Create smaller, actionable tasks

### Step 13: Add Custom Fields (Beta)
If your organization has Projects (Beta) enabled:

1. Go to project settings
2. Add custom fields like:
   - Priority (High, Medium, Low)
   - Story Points (1, 2, 3, 5, 8)
   - Due Date
   - Tags

### Step 14: Board Templates
Create reusable templates for future projects:

1. Set up a board with your preferred columns and automation
2. Document the workflow in the board README
3. Use it as a template for future courses/projects

---

## Part 7: Integration with Issues

### Step 15: Link Issues to Board Cards
1. Each card on your board represents an issue
2. Click on a card to open the linked issue
3. Make changes to the issue (add comments, labels, assignees)
4. Changes are reflected on the board

### Step 16: Use Labels Effectively
Create and use labels to categorize issues:

**Suggested Labels**:
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Beginner-friendly tasks
- `help wanted`: Community contributions welcome
- `question`: Further information needed

### Step 17: Assign Issues
1. Open an issue from your board
2. Click **"Assignees"** and assign yourself or team members
3. This helps track responsibility and workload

---

## Part 8: Board Management Best Practices

### Step 18: Regular Board Maintenance
1. **Daily standups**: Move cards and update status
2. **Weekly cleanup**: Close completed issues, archive old cards
3. **Monthly review**: Analyze board performance and adjust workflow

### Step 19: Board Analytics
1. Use GitHub's built-in insights
2. Track cycle time (time from To do to Done)
3. Identify bottlenecks in your workflow
4. Adjust columns and automation as needed

### Step 20: Team Collaboration
1. **Invite collaborators**: Add team members to your repository
2. **Set permissions**: Give appropriate access levels
3. **Communication**: Use issue comments for discussion
4. **Reviews**: Set up pull request review requirements

---

## Verification Checklist

- [ ] Project board created with custom columns
- [ ] Issues created and linked to board
- [ ] Automation rules configured
- [ ] Labels and assignees set up
- [ ] Board description and documentation added
- [ ] Custom workflow established

---

## Troubleshooting

### Issues Not Appearing on Board
**Solution**:
- Ensure issues are in the same repository as the board
- Check if issues are open (closed issues don't appear by default)
- Try refreshing the board page

### Can't Move Cards Between Columns
**Solution**:
- Check repository permissions
- Ensure you have write access to the repository
- Try refreshing the page

### Automation Not Working
**Solution**:
- Check if automation rules are enabled in board settings
- Ensure repository allows actions
- Check GitHub status page for outages

### Board Loading Slowly
**Solution**:
- Too many issues/cards can slow down boards
- Archive completed items
- Create separate boards for different projects

---

## What You've Accomplished

✅ **Project Board**: Custom Kanban board with relevant columns
✅ **Issue Integration**: Issues linked and managed through board
✅ **Automation**: Basic workflow automation configured
✅ **Organization**: Proper categorization with labels and assignees
✅ **Documentation**: Board properly documented and configured
✅ **Workflow**: Functional project management system

---

## Board Workflow Examples

### Feature Development Workflow
```
To do → In Progress → Review → Testing → Done
```

### Bug Fix Workflow
```
To do → In Progress → Testing → Done
```

### Documentation Workflow
```
To do → In Progress → Review → Done
```

---

## Next Steps

Now that your project board is set up, you can:

1. [Learn about creating and managing issues](../tutorials/01-github-issues.md)
2. [Practice with the first workshop](../workshops/workshop-01-create-issues.md)
3. [Set up your first CI workflow](../workshops/workshop-05-basic-ci.md)
4. Complete the [board management homework](../homeworks/homework-01-issue-management.md)

---

## Advanced Features to Explore Later

- **GitHub Projects (Beta)**: New project experience with enhanced features
- **Project Insights**: Analytics and reporting
- **Project Automation**: Advanced workflow rules
- **Integration**: Connect with external tools (Jira, Trello, etc.)
- **API Access**: Programmatic board management

---

## Resources

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- [Project Board Best Practices](https://github.com/github/docs/blob/main/content/issues/organizing-your-work-with-project-boards/managing-project-boards.md)
- [Kanban Methodology](https://www.atlassian.com/agile/kanban)
- [Automation Examples](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project)

---

*Your project board is now ready to manage workflows effectively! Use it throughout the course to track your learning progress and project work.* 📋

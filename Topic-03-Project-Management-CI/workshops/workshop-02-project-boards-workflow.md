# Workshop 2: Project Boards and Workflow Management

## Duration: 60-75 minutes

## Objective
Learn to create and manage project boards for effective workflow visualization and team collaboration.

## Prerequisites
- GitHub account and repository (`project-management-practice`)
- Completed Workshop 1 (Issue creation)
- Understanding of basic project management concepts

---

## Part 1: Creating Your First Project Board

### Step 1: Access Project Boards
1. Go to your repository: `https://github.com/YOUR_USERNAME/project-management-practice`
2. Click **Projects** tab
3. Click **New project**
4. Choose **Board** layout (Kanban style)

### Step 2: Configure Basic Board Structure
**Board Name:** `Project Management Practice`

**Board Description:**
```
Learning project management with GitHub Issues and Project Boards.
Practice creating workflows, managing tasks, and tracking progress.
```

### Step 3: Set Up Columns
Create these standard Kanban columns:
1. **To Do** - Tasks ready to start
2. **In Progress** - Currently working on
3. **Review/QA** - Code review or testing
4. **Done** - Completed tasks

---

## Part 2: Connecting Issues to the Board

### Step 1: Add Existing Issues
1. Click **+ Add item** at the top of any column
2. Search for issues by title or number
3. Add the issues you created in Workshop 1

### Step 2: Create New Issues Directly on Board
1. Click **+ Add item** → **New issue**
2. Create issues directly on the board:
   - Title: `Implement user authentication system`
   - Title: `Design database schema for user data`
   - Title: `Create API endpoints for user management`

### Step 3: Organize Issues by Priority
Move issues between columns:
- High priority items → **In Progress**
- Medium priority items → **To Do**
- Completed items → **Done**

---

## Part 3: Advanced Board Features

### Step 1: Add Automation Rules
1. Go to board menu (⋯) → **Workflows**
2. Enable these automations:
   - **Auto-add to project**: When issues are created
   - **Auto-archive items**: When moved to "Done"
   - **Item closed**: Move to "Done" column

### Step 2: Create Custom Fields
1. Click board menu (⋯) → **Settings**
2. Add custom fields:
   - **Priority**: Single select (High, Medium, Low)
   - **Size**: Single select (Small, Medium, Large)
   - **Assignee**: Single select (Team members)

### Step 3: Use Filters and Sorting
1. Click **Filters** button
2. Filter by:
   - Assignee: `YOUR_USERNAME`
   - Label: `enhancement`
   - Status: Open/Closed

---

## Part 4: Team Collaboration Practice

### Step 1: Simulate Team Workflow
Create issues representing different team roles:

**Developer Tasks:**
- `Implement login functionality`
- `Create user registration form`
- `Add password reset feature`

**Designer Tasks:**
- `Design login page mockup`
- `Create user profile interface`
- `Design error message styling`

**QA Tasks:**
- `Test user authentication flow`
- `Validate form input handling`
- `Check cross-browser compatibility`

### Step 2: Assign and Label Issues
1. Assign issues to yourself (or team members if available)
2. Add appropriate labels:
   - `frontend`, `backend`, `design`
   - `bug`, `enhancement`, `documentation`
   - `high-priority`, `medium-priority`

### Step 3: Track Progress
Move issues through the workflow:
- **To Do** → **In Progress** (when starting work)
- **In Progress** → **Review/QA** (when implementation complete)
- **Review/QA** → **Done** (when testing/approval complete)

---

## Part 5: Project Insights and Reporting

### Step 1: View Project Insights
1. Go to board menu (⋯) → **Insights**
2. Analyze:
   - Issue completion over time
   - Current workflow distribution
   - Team productivity metrics

### Step 2: Create Status Reports
Use the board to answer:
- How many tasks are in progress?
- Which tasks are blocked?
- What's the team's velocity?
- Are there any bottlenecks?

---

## Part 6: Best Practices Implementation

### Step 1: Set Up Milestones
1. Go to repository **Issues** tab
2. Click **Milestones** → **New milestone**
3. Create milestone: `Sprint 1 - Authentication`
4. Add due date and description

### Step 2: Connect Issues to Milestones
1. Edit issues to assign them to the milestone
2. Track milestone progress in the board

### Step 3: Implement WIP Limits
1. Add notes to columns indicating limits:
   - **In Progress**: Max 3 items
   - **Review/QA**: Max 2 items

---

## Part 7: Advanced Workflows

### Step 1: Create Multiple Boards
Create separate boards for:
- **Development Board**: Technical implementation
- **Design Board**: UI/UX tasks
- **QA Board**: Testing and validation

### Step 2: Cross-Board Issue Movement
Link related issues across boards using:
- Issue references in descriptions
- Related issue linking
- Automated status updates

---

## Common Issues and Solutions

### Issue: Issues not appearing on board
**Solution:**
- Check automation settings
- Manually add issues to project
- Verify repository permissions

### Issue: Board not updating automatically
**Solution:**
- Refresh the page
- Check workflow automation settings
- Ensure issues are properly linked

### Issue: Team members can't access board
**Solution:**
- Check repository permissions
- Add collaborators to repository
- Set appropriate board visibility

---

## Exercise: Complete Workflow Simulation

### Scenario: Web Application Development
Create a complete project board for a web application with these components:

1. **Planning Phase** (To Do column)
   - Database design
   - API specification
   - UI wireframes

2. **Development Phase** (In Progress column)
   - Backend API implementation
   - Frontend component development
   - Database setup

3. **Testing Phase** (Review/QA column)
   - Unit testing
   - Integration testing
   - User acceptance testing

4. **Deployment Phase** (Done column)
   - Production deployment
   - Documentation update
   - User training

### Deliverables
- Fully configured project board
- 10+ interconnected issues
- Proper labels and assignments
- Workflow automation enabled
- Progress tracking insights

---

## Key Takeaways

1. **Visual Management**: Project boards provide clear workflow visualization
2. **Team Coordination**: Centralized view of all project activities
3. **Progress Tracking**: Easy identification of bottlenecks and delays
4. **Automation Benefits**: Reduce manual overhead with GitHub automation
5. **Scalability**: Works for both small teams and large organizations

## Next Steps
- Explore GitHub's advanced project features
- Integrate with CI/CD pipelines
- Set up automated reporting
- Connect with external project management tools

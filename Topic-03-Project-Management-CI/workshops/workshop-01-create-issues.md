# Workshop 1: Creating and Managing Issues

## Duration: 45-60 minutes

## Objective
Master GitHub issue creation, management, and organization through hands-on practice.

## Part 1: Issue Creation Fundamentals

### Step 1: Create Repository Issues
1. Navigate to your `project-management-practice` repository
2. Go to Issues tab → New issue
3. Create issues without templates first

### Step 2: Practice Issue Writing
Create these sample issues:

**Issue 1: Feature Request**
- Title: `Add dark mode toggle to user interface`
- Description with acceptance criteria
- Add appropriate labels

**Issue 2: Bug Report**
- Title: `Login form validation fails with special characters`
- Include steps to reproduce
- Add environment details

**Issue 3: Documentation Task**
- Title: `Update API documentation for v2.0 endpoints`
- List specific files to update
- Reference related issues

### Step 3: Issue Enhancement
For each issue, add:
- Relevant labels (bug, enhancement, documentation)
- Assign yourself as assignee
- Add to project board (To Do column)

## Part 2: Issue Templates Implementation

### Step 4: Create Templates Directory
```
.github/
  ISSUE_TEMPLATES/
    bug-report.md
    feature-request.md
    documentation.md
```

### Step 5: Template Creation
Create each template with proper YAML frontmatter and structured content.

### Step 6: Test Templates
- Create new issues using each template
- Verify all fields are properly filled
- Check that labels are auto-applied

## Part 3: Advanced Issue Management

### Step 7: Label System
Create comprehensive label system:
- Priority labels (critical, high, medium, low)
- Type labels (bug, feature, documentation)
- Status labels (help-wanted, good-first-issue)

### Step 8: Milestone Creation
- Create milestone "v1.0 Release"
- Set due date 4 weeks from now
- Associate issues with milestone

### Step 9: Issue Linking
- Link related issues using #references
- Create parent-child relationships
- Reference external documentation

## Part 4: Issue Lifecycle Practice

### Step 10: Status Transitions
- Move issues through different states
- Add comments with progress updates
- Close completed issues with resolution notes

### Step 11: Search and Filtering
- Use advanced search syntax
- Create saved searches for common queries
- Filter by labels, assignees, milestones

### Step 12: Bulk Operations
- Select multiple issues for batch operations
- Apply labels to multiple issues
- Bulk assign issues to team members

## Verification Checklist

- [ ] 5+ issues created with proper structure
- [ ] Issue templates implemented and tested
- [ ] Label system established
- [ ] Milestones created and associated
- [ ] Issues linked and cross-referenced
- [ ] Search and filtering practiced
- [ ] Issue lifecycle demonstrated

## Common Issues & Solutions

- Template not appearing: Check file naming and YAML syntax
- Labels not applying: Verify YAML frontmatter format
- Search not working: Use correct GitHub search syntax
- Permissions issues: Check repository access levels

## Next Steps
1. [Set up project boards](../workshops/workshop-02-setup-board.md)
2. Complete [homework assignment](../homeworks/homework-01-issue-management.md)

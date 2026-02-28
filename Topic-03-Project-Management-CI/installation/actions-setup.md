# GitHub Actions Setup & Introduction

## Overview
This guide introduces GitHub Actions and helps you set up your first CI/CD pipeline. GitHub Actions automates your software workflows, allowing you to build, test, and deploy code directly from GitHub.

## Prerequisites
- GitHub account set up (see [GitHub Account Setup](github-account-setup.md))
- Repository created (`project-management-practice`)
- Basic understanding of YAML syntax (optional, will be explained)

---

## Part 1: Understanding GitHub Actions

### What is GitHub Actions?
- **Automation platform**: Run code automatically in response to events
- **CI/CD**: Continuous Integration and Continuous Deployment
- **Workflows**: Automated processes defined in YAML files
- **Actions**: Reusable building blocks for common tasks
- **Free tier**: 2,000 minutes/month for public repositories

### Why Use GitHub Actions?
- **Automated testing**: Run tests on every push
- **Code quality**: Lint, format, and validate code
- **Deployment**: Automatically deploy to production
- **Notifications**: Alert team members of issues
- **Integration**: Connect with external services

### Key Concepts
- **Workflow**: Automated process (defined in `.github/workflows/`)
- **Job**: Set of steps that run on a virtual machine
- **Step**: Individual task within a job
- **Action**: Reusable code component
- **Event**: Trigger that starts a workflow (push, pull request, etc.)
- **Runner**: Virtual machine that executes jobs (Ubuntu, Windows, macOS)

---

## Part 2: Repository Preparation

### Step 1: Enable Actions in Repository
1. Go to your repository: `https://github.com/yourusername/project-management-practice`
2. Click **"Settings"** tab
3. Scroll down to **"Actions"** → **"General"**
4. Under **"Actions permissions"**:
   - ✅ **Allow all actions and reusable workflows**
5. Under **"Workflow permissions"**:
   - ✅ **Read and write permissions** (for checkout and pushing)
6. Click **"Save"**

### Step 2: Create Sample Code for Testing
Let's add some code that we can test with Actions:

1. Create a simple Python script:
   - File: `hello.py`
   - Content:
   ```python
   #!/usr/bin/env python3
   """Simple greeting script for testing."""

   def greet(name: str) -> str:
       """Return a greeting message."""
       return f"Hello, {name}!"

   def main():
       """Main function."""
       message = greet("GitHub Actions")
       print(message)

   if __name__ == "__main__":
       main()
   ```

2. Create a test file:
   - File: `test_hello.py`
   - Content:
   ```python
   """Tests for hello.py"""
   import hello

   def test_greet():
       """Test the greet function."""
       result = hello.greet("World")
       assert result == "Hello, World!"
       assert isinstance(result, str)

   def test_main(capsys):
       """Test the main function."""
       hello.main()
       captured = capsys.readouterr()
       assert "Hello, GitHub Actions" in captured.out

   if __name__ == "__main__":
       test_greet()
       print("All tests passed!")
   ```

3. Create `requirements.txt`:
   ```
   pytest==7.4.0
   pytest-cov==4.1.0
   ```

---

## Part 3: Creating Your First Workflow

### Step 3: Create Workflows Directory
1. In your repository, click **"Add file"** → **"Create new file"**
2. Create the directory structure: `.github/workflows/hello-world.yml`
3. The path should be: `.github/workflows/hello-world.yml`

### Step 4: Basic Workflow Structure
Copy this basic workflow into `hello-world.yml`:

```yaml
name: Hello World Workflow

# When to run this workflow
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# What to do
jobs:
  hello:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run hello script
      run: python hello.py
```

### Step 5: Commit the Workflow
1. **File name**: `.github/workflows/hello-world.yml`
2. **Content**: Paste the workflow above
3. Click **"Commit changes"**
4. **Commit message**: `Add basic GitHub Actions workflow`

---

## Part 4: Understanding Workflow Syntax

### Step 6: Analyze the Workflow
Let's break down each part of the workflow:

```yaml
name: Hello World Workflow
```
- **Purpose**: Display name for the workflow
- **Usage**: Shows in Actions tab and notifications

```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```
- **Purpose**: When to trigger the workflow
- **Events**: `push`, `pull_request`, `schedule`, `workflow_dispatch`, etc.
- **Filters**: Which branches, file paths, etc.

```yaml
jobs:
  hello:
    runs-on: ubuntu-latest
```
- **Purpose**: Define what to execute
- **Job name**: `hello` (can be any name)
- **Runner**: `ubuntu-latest` (also `windows-latest`, `macos-latest`)

```yaml
steps:
- name: Checkout code
  uses: actions/checkout@v4

- name: Run hello script
  run: python hello.py
```
- **Steps**: Individual commands to execute
- **uses**: Run an action from GitHub Marketplace
- **run**: Execute shell commands

---

## Part 5: Testing the Workflow

### Step 7: Trigger the Workflow
1. Go to your repository → **"Actions"** tab
2. You should see your workflow running
3. Click on the workflow run to see details
4. Check the logs for each step

**Expected Results**:
- ✅ Checkout step should pass
- ✅ Hello script step should show: "Hello, GitHub Actions!"

### Step 8: Debug Failed Workflows
If the workflow fails:

1. Click on the failed run
2. Check the logs for error messages
3. Common issues:
   - Missing files
   - Syntax errors in workflow
   - Permission issues

### Step 9: Manual Workflow Trigger
You can also trigger workflows manually:

1. Add this to your workflow:
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:  # Add this line
```

2. Go to Actions tab → Select workflow → **"Run workflow"**

---

## Part 6: Adding Testing to Workflow

### Step 10: Enhanced Workflow with Testing
Let's improve our workflow to include testing:

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'

    - name: Install dependencies
      run: |
        python -m uv add --upgrade pip
        uv add -r requirements.txt

    - name: Run tests
      run: python -m pytest test_hello.py -v

    - name: Run hello script
      run: python hello.py
```

### Step 11: Update Workflow File
1. Edit `.github/workflows/hello-world.yml`
2. Replace the content with the enhanced version above
3. Commit the changes

### Step 12: Test the Enhanced Workflow
1. Push the changes or create a pull request
2. Check the Actions tab for the new run
3. Verify all steps pass:
   - ✅ Python setup
   - ✅ Dependencies installation
   - ✅ Tests execution
   - ✅ Hello script execution

---

## Part 7: Workflow Best Practices

### Step 13: Add Linting
Let's add code quality checks:

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'

    - name: Install dependencies
      run: |
        python -m uv add --upgrade pip
        uv add -r requirements.txt
        uv add flake8 black

    - name: Lint with flake8
      run: flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

    - name: Format check with black
      run: black --check --diff .

    - name: Run tests
      run: python -m pytest test_hello.py -v --cov=hello --cov-report=term-missing

    - name: Run hello script
      run: python hello.py
```

### Step 14: Add Status Badges
1. Go to your repository main page
2. Edit the README.md
3. Add badges at the top:

```markdown
# Project Management Practice

[![CI](https://github.com/yourusername/project-management-practice/actions/workflows/hello-world.yml/badge.svg)](https://github.com/yourusername/project-management-practice/actions/workflows/hello-world.yml)
[![Code Coverage](https://img.shields.io/badge/coverage-95%25-green)](https://github.com/yourusername/project-management-practice/actions)
```

---

## Part 8: Advanced Workflow Features

### Step 15: Matrix Builds
Test on multiple Python versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, "3.10"]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}

    - name: Install dependencies
      run: uv add -r requirements.txt

    - name: Run tests
      run: python -m pytest test_hello.py -v
```

### Step 16: Conditional Steps
Run steps only under certain conditions:

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: echo "Deploying to production..."
```

### Step 17: Secrets and Environment Variables
1. Go to repository Settings → Secrets and variables → Actions
2. Add repository secrets (like API keys, deployment tokens)
3. Use in workflows:

```yaml
- name: Deploy
  run: |
    echo "Deploying with token: ${{ secrets.DEPLOY_TOKEN }}"
  env:
    API_KEY: ${{ secrets.MY_API_KEY }}
```

---

## Verification Checklist

- [ ] GitHub Actions enabled in repository settings
- [ ] Workflow file created in `.github/workflows/`
- [ ] Basic workflow tested and passing
- [ ] Enhanced workflow with testing implemented
- [ ] Status badge added to README
- [ ] Code quality checks added
- [ ] Multiple Python versions tested (optional)

---

## Troubleshooting

### Workflow Not Running
**Solution**:
- Check file path: Must be `.github/workflows/filename.yml`
- Verify YAML syntax (use online validator)
- Check repository settings for Actions permissions
- Ensure branch is included in triggers

### Python Not Found
**Solution**:
- Add `actions/setup-python` step before using Python
- Specify correct Python version
- Check if requirements.txt exists

### Tests Failing
**Solution**:
- Run tests locally first: `python -m pytest test_hello.py`
- Check test file syntax
- Ensure all dependencies are in requirements.txt
- Check Python path and imports

### Permission Denied
**Solution**:
- Check repository permissions
- Ensure GITHUB_TOKEN has correct permissions
- For deployments, add deployment permissions

---

## What You've Accomplished

✅ **GitHub Actions Setup**: Repository configured for automation
✅ **Basic Workflow**: Simple workflow created and tested
✅ **CI Pipeline**: Testing and quality checks implemented
✅ **Status Integration**: Badges added to repository
✅ **Advanced Features**: Matrix builds and conditional steps explored
✅ **Best Practices**: Professional CI/CD pipeline established

---

## Workflow Examples for Different Languages

### JavaScript/Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'

- name: Install dependencies
  run: npm ci

- name: Run tests
  run: npm test
```

### Java/Maven
```yaml
- name: Set up JDK
  uses: actions/setup-java@v4
  with:
    java-version: '11'
    distribution: 'temurin'

- name: Build with Maven
  run: mvn clean install

- name: Run tests
  run: mvn test
```

### Docker
```yaml
- name: Build Docker image
  run: docker build . --file Dockerfile --tag my-app:${{ github.sha }}

- name: Run tests in container
  run: docker run my-app:${{ github.sha }} npm test
```

---

## Next Steps

Now that you have GitHub Actions set up, you can:

1. [Learn about workflow optimization](../tutorials/06-github-actions.md)
2. [Create custom actions](../workshops/workshop-06-advanced-workflow.md)
3. [Set up deployment workflows](../homeworks/homework-03-ci-workflow.md)
4. Integrate with [project management](../tutorials/02-project-boards.md)

---

## Security Considerations

- **Never commit secrets**: Use repository secrets instead
- **Limit permissions**: Use minimal required permissions
- **Review third-party actions**: Check action security ratings
- **Regular updates**: Keep actions and dependencies updated
- **Audit workflows**: Regularly review workflow permissions

---

## Performance Optimization

- **Cache dependencies**: Speed up builds with caching
- **Parallel jobs**: Run independent jobs in parallel
- **Conditional execution**: Skip unnecessary steps
- **Artifact storage**: Share build artifacts between jobs

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Starter Workflows](https://github.com/actions/starter-workflows)
- [Actions Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

*Your GitHub Actions setup is now ready for automated testing, deployment, and continuous integration workflows!* 🤖

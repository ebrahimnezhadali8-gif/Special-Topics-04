# GitHub Account Setup & Configuration

## Overview
This guide will help you set up and configure your GitHub account for the Project Management & CI course. GitHub is the platform where you'll practice issue management, project boards, and CI/CD workflows.

## Prerequisites
- Internet connection
- Email address (for account creation)
- Basic understanding of Git (from Subject 1)

---

## Part 1: Creating a GitHub Account

### Step 1: Navigate to GitHub
1. Open your web browser
2. Go to: https://github.com
3. Click the green "Sign up" button in the top-right corner

### Step 2: Account Creation
1. Enter your email address
2. Create a strong password (at least 8 characters, mix of letters, numbers, symbols)
3. Choose a unique username:
   - Use your name or variation (e.g., `john-doe`, `johndoe-dev`)
   - Avoid numbers at the end unless necessary
   - Check availability as you type
4. Solve the captcha if prompted
5. Click "Create account"

### Step 3: Email Verification
1. Check your email for a verification message from GitHub
2. Click the verification link
3. If you don't see the email, check your spam/junk folder
4. Complete the verification process

### Step 4: Profile Setup
1. After verification, you'll be prompted to set up your profile
2. **Skip the questionnaire** for now (you can complete it later)
3. You'll land on your GitHub dashboard

---

## Part 2: Basic Account Configuration

### Step 5: Complete Your Profile
1. Click your profile picture (top-right) → "Settings"
2. Under "Profile":
   - **Name**: Your full name (as you want it displayed)
   - **Bio**: Brief description (e.g., "Computer Engineering Student | Git & DevOps Enthusiast")
   - **Location**: Your city/country (optional)
   - **Website**: Personal website or LinkedIn (optional)
3. **Profile Picture**: Upload a professional photo or use your initials
4. Click "Update profile" to save

### Step 6: Notification Preferences
1. In Settings, click "Notifications" in the left sidebar
2. **Email**: Choose how you want to receive notifications
   - Recommended: "Email" for important updates
3. **Repository**: Choose notification preferences
   - Recommended: Watch repositories you contribute to
4. **Save changes**

### Step 7: Security Settings
1. In Settings, click "Password and authentication"
2. **Two-factor authentication (2FA)**: Consider enabling this for security
   - Use an authenticator app (Google Authenticator, Authy)
   - Follow the setup wizard
3. **SSH Keys**: We'll set this up later if needed

---

## Part 3: Repository Creation

### Step 8: Create Your First Repository
1. Click the "+" icon (top-right) → "New repository"
2. **Repository name**: `project-management-practice`
3. **Description**: `Practice repository for GitHub project management and CI`
4. **Visibility**: Public (so instructors can view your work)
5. **Initialize with**:
   - ✅ Add a README file
   - ✅ Add .gitignore (choose Python or your preferred language)
   - ❌ Don't add license yet
6. Click "Create repository"

### Step 9: Explore Your Repository
1. **Code tab**: View files and commit history
2. **Issues tab**: Where you'll create and manage issues
3. **Pull requests tab**: For code reviews
4. **Actions tab**: For CI/CD workflows
5. **Projects tab**: For project boards
6. **Wiki tab**: For documentation
7. **Settings tab**: Repository configuration

---

## Part 4: Personal Access Token (Required for Some Operations)

### Step 10: Generate Personal Access Token
GitHub requires tokens for certain API operations and CLI access.

1. Go to Settings → "Developer settings" → "Personal access tokens" → "Tokens (classic)"
2. Click "Generate new token (classic)"
3. **Note**: Choose "Generate new token (classic)" for broader compatibility
4. **Token name**: `course-project-management`
5. **Expiration**: Set to 90 days or "No expiration" (be careful with security)
6. **Scopes**: Select these permissions:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `read:org` (Read org and team membership)
   - ✅ `project` (Full control of projects)
7. Click "Generate token"
8. **Important**: Copy the token immediately (you won't see it again!)
9. Save it securely (password manager, secure note)

### Step 11: Test Token (Optional)
1. Install GitHub CLI if you haven't: https://cli.github.com/
2. Authenticate: `gh auth login`
3. Choose GitHub.com
4. Choose "Paste an authentication token"
5. Paste your token
6. Test: `gh repo list` (should show your repositories)

---

## Part 5: GitHub CLI Installation (Optional but Recommended)

### Step 12: Install GitHub CLI
The GitHub CLI provides command-line access to GitHub features.

**Windows:**
```bash
winget install --id GitHub.cli
```

**macOS:**
```bash
brew install gh
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Step 13: CLI Authentication
```bash
gh auth login
# Choose: GitHub.com
# Choose: HTTPS
# Choose: Paste an authentication token
# Paste your personal access token
```

### Step 14: Test CLI
```bash
gh repo list
gh issue list --repo yourusername/project-management-practice
```

---

## Part 6: Repository Settings Configuration

### Step 15: Configure Repository Settings
1. Go to your repository → Settings tab
2. **General**:
   - Repository name and description (already set)
   - ✅ Features: Issues, Projects, Wiki (enable all)
   - ✅ Pull request template (we'll create this later)
3. **Branches** (left sidebar):
   - Default branch: `main` (should already be set)
   - Branch protection rules: Skip for now
4. **Actions** → General:
   - ✅ Allow all actions
   - ✅ Read and write permissions

### Step 16: Create Basic Repository Structure
Let's add some basic files to your repository:

1. **Create a docs folder** (via GitHub web interface):
   - Click "Add file" → "Create new file"
   - Name: `docs/README.md`
   - Content:
   ```markdown
   # Documentation

   This folder contains project documentation.
   ```
   - Click "Commit changes"

2. **Create a scripts folder**:
   - Create `scripts/hello.py`:
   ```python
   #!/usr/bin/env python3
   print("Hello from GitHub!")
   ```
   - Commit the file

---

## Verification Checklist

- [ ] GitHub account created and verified
- [ ] Profile completed with name, bio, and photo
- [ ] Repository `project-management-practice` created
- [ ] Personal access token generated and saved
- [ ] Repository has basic structure (README, docs/, scripts/)
- [ ] GitHub CLI installed and authenticated (optional)
- [ ] Repository settings configured

---

## Troubleshooting

### Can't Create Account
**Issue**: Email already in use or username taken
**Solution**:
- Try a different email or username variation
- Check if you already have a GitHub account
- Use school email if personal email doesn't work

### Email Verification Not Received
**Solution**:
- Check spam/junk folder
- Wait 5-10 minutes and check again
- Try resending verification from GitHub
- Contact GitHub support if issues persist

### Repository Creation Issues
**Solution**:
- Ensure repository name is unique to your account
- Check internet connection
- Try refreshing the page

### CLI Authentication Issues
**Solution**:
- Ensure you copied the token correctly
- Check token expiration date
- Regenerate token if needed
- Use web interface as alternative

### Permission Errors
**Solution**:
- Check if token has correct scopes
- Ensure you're logged into the correct GitHub account
- Verify repository permissions

---

## What You've Accomplished

✅ **GitHub Account**: Professional account with complete profile
✅ **Repository**: Practice repository with proper structure
✅ **Authentication**: Personal access token for API access
✅ **Tools**: GitHub CLI for command-line operations
✅ **Configuration**: Repository settings optimized for course work
✅ **Structure**: Basic project organization in place

---

## Next Steps

Now that your GitHub account is set up, you can:

1. [Learn about GitHub Issues](../tutorials/01-github-issues.md)
2. [Create your first issue](../workshops/workshop-01-create-issues.md)
3. [Set up project boards](../workshops/workshop-02-setup-board.md)
4. Start practicing with the [first homework](../homeworks/homework-01-issue-management.md)

---

## Additional Resources

- [GitHub Hello World Guide](https://guides.github.com/activities/hello-world/)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Repository Settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features)

---

## Security Best Practices

- **Never share tokens**: Keep tokens private and secure
- **Use 2FA**: Enable two-factor authentication
- **Regular token rotation**: Regenerate tokens periodically
- **Minimal permissions**: Only grant necessary permissions
- **Monitor usage**: Check token usage in GitHub settings

---

*Your GitHub account is now ready for professional project management and CI/CD workflows!* 🚀

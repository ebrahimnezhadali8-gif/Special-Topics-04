# Subject 2: Virtual Environments, Dependency Management 

## Overview

This subject focuses on modern Python development practices with special emphasis on **UV**, a high-performance package manager. While traditional tools like pip and venv are mentioned for context, the primary focus is on UV's workflow and benefits.

## Learning Path

### 1. Environment Isolation (venv)
- Understanding why isolated environments matter
- Creating and managing virtual environments
- Traditional approach vs modern tooling

### 2. Dependency Management Fundamentals
- What dependencies are and why they matter
- Problems with traditional approaches
- Introduction to modern solutions

### 3. UV Package Manager (Primary Focus)
- UV installation and setup
- Project creation and management
- Dependency addition and management
- Running scripts and applications
- FastAPI + Uvicorn integration

## Key Topics

- **venv**: Environment isolation basics
- **Dependency Management**: Understanding package relationships
- **UV**: Modern Python packaging (main focus)
- **FastAPI + Uvicorn**: Web application development

## Materials Structure

```
Subject-02-Venv-Dependency-Uvicorn/
├── README.md                           # This overview
├── SCRATCHPAD.md                       # Course planning document
├── installation/
│   ├── python-setup.md                 # Python installation
│   ├── venv-setup.md                   # venv basics
│   └── uv-setup.md                     # UV installation guide
├── tutorials/
│   ├── 01-python-environments.md       # venv tutorial
│   ├── 02-dependency-management.md     # Dependency concepts
│   ├── 03-uv-package-manager.md        # UV introduction
│   ├── 04-uv-project-creation.md       # Creating UV projects
│   ├── 05-uv-dependency-management.md  # Managing dependencies
│   └── 06-uvicorn-with-uv.md           # FastAPI + Uvicorn
├── workshops/
│   ├── workshop-01-venv-tutorial.md    # venv hands-on session
│   ├── workshop-02-uv-installation.md  # UV installation
│   ├── workshop-03-uv-project-init.md  # First UV project
│   ├── workshop-04-uv-add-dependencies.md # Dependency management
│   ├── workshop-05-uv-run-scripts.md   # Running with UV
│   └── workshop-06-uvicorn-uv-project.md # Complete application
├── homeworks/
│   ├── homework-01-venv-exercises.md   # venv exercises
│   ├── homework-02-uv-project-setup.md # UV project creation
│   ├── homework-03-dependency-management.md # Dependency tasks
│   └── homework-04-fastapi-uvicorn.md  # Complete application
├── resources/
│   ├── cheatsheet.md                   # UV & Python commands
│   ├── uv-best-practices.md            # UV best practices
│   ├── comparison-tools.md             # UV vs other tools
│   └── troubleshooting.md              # Common issues
└── assessments/
    ├── quiz-venv-concepts.md           # venv quiz
    ├── quiz-uv-fundamentals.md         # UV fundamentals quiz
    └── project-checklist.md            # Project completion checklist
```

## Prerequisites

- Basic command line knowledge
- Python fundamentals
- Understanding of software development concepts

## Learning Outcomes

By the end of this subject, students will be able to:

1. **Environment Management**: Create and manage Python virtual environments
2. **Dependency Understanding**: Explain dependency management concepts and challenges
3. **UV Proficiency**: Use UV for modern Python package management
4. **Project Creation**: Initialize and configure UV-managed projects
5. **Dependency Management**: Add, update, and manage project dependencies
6. **Application Development**: Build FastAPI applications with Uvicorn using UV
7. **Development Workflow**: Use UV for running scripts, tests, and development tools

## Special Focus: UV Package Manager

This subject places special emphasis on **UV** as the primary package management tool:

- **Performance**: 10-100x faster than traditional pip
- **Integrated Workflow**: Single tool for projects, dependencies, and environments
- **Modern Features**: Lock files, global cache, security features
- **Developer Experience**: Simplified commands and automatic environment management

## Progression

1. **Start with venv** (Workshop 1) - Understand environment isolation
2. **Learn dependency concepts** (Tutorial 2) - Why modern tools matter
3. **Master UV fundamentals** (Tutorials 3-6) - Core UV usage
4. **Hands-on practice** (Workshops 2-6) - Build real applications
5. **Complete projects** (Homework) - Apply knowledge independently

## Tools Coverage

| Tool | Coverage Level | Purpose |
|------|----------------|---------|
| **venv** | Basic concepts | Environment isolation |
| **pip** | Mentioned for comparison | Traditional package installation |
| **UV** | **Primary focus** | Modern package management |
| **FastAPI** | Application examples | Web framework |
| **Uvicorn** | Application examples | ASGI server |

## Assessment Strategy

- **Workshops**: Hands-on exercises with step-by-step guidance
- **Homework**: Independent project completion
- **Quizzes**: Concept verification
- **Project Checklist**: Comprehensive assessment rubric

## Next Steps

Begin with **Workshop 1: venv Tutorial** to understand environment isolation, then progress through UV-focused materials to master modern Python package management.
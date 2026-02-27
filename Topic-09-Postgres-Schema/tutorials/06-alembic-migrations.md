# Tutorial 06: Database Migrations with Alembic

## Overview
This tutorial covers Alembic, the database migration tool for SQLAlchemy. You'll learn how to create, manage, and apply database schema changes safely in development and production environments.

## What is Alembic?

Alembic is a database migration tool for SQLAlchemy that provides:

- **Version Control**: Track database schema changes over time
- **Environment Support**: Different configurations for dev/staging/production
- **Dependency Management**: Handle migration dependencies
- **Rollback Support**: Safely undo changes
- **Multi-Database**: Support for multiple database backends

### Why Database Migrations?
- **Version Control**: Schema changes are tracked like code
- **Team Collaboration**: Schema changes can be reviewed and merged
- **Production Safety**: Controlled deployment of schema changes
- **Rollback Capability**: Ability to undo changes
- **Environment Consistency**: Same schema across all environments

## Installation and Setup

### Installation
```bash
uv add alembic
```

### Initialize Alembic
```bash
# Initialize Alembic in your project
alembic init alembic

# This creates:
# alembic/
# ├── versions/
# ├── env.py
# ├── README
# └── script.py.mako
```

### Project Structure
```
myproject/
├── alembic/
│   ├── versions/          # Migration files
│   │   ├── 123abc_.py    # Migration file
│   │   └── ...
│   ├── env.py            # Migration environment
│   ├── script.py.mako    # Migration template
│   └── README
├── app/
│   ├── models.py         # SQLAlchemy models
│   └── database.py       # Database configuration
├── alembic.ini           # Alembic configuration
└── requirements.txt
```

## Configuration

### alembic.ini Configuration
```ini
[alembic]
# path to migration scripts
script_location = alembic

# template used to generate migration files
file_template = %%(year)d%%(month).2d%%(day).2d_%%(hour).2d%%(minute).2d%%(second).2d_%%(rev)s_%%(slug)s

# timezone to use when rendering the date
# within the migration file as well as the filename.
timezone = UTC

# max length of characters to apply to the
# "slug" field
truncate_slug_length = 40

# set to 'true' to run the environment file as a
# standalone script, false otherwise
# (default: false)
run_env_as_script = false

# revision environment configuration
# (default: generic)
revision_environment = false

# set to 'true' to have the command line tool
# also look for the configuration file in the
# current directory (default: true)
# (used by init command)
search_parent_directories = true

# sqlalchemy database url
# (default: none)
sqlalchemy.url = postgresql://user:password@localhost/database

[post_write_hooks]
# post_write_hooks defines scripts or Python functions that are run
# on newly generated revision scripts. See the documentation for further
# detail and examples

# format using "black" - use the console_scripts runner, against the "black" entrypoint:
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
# black.options = -l 79
```

### env.py Configuration
```python
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add your app's path to sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Import your models
from app.models import Base  # SQLAlchemy declarative base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

## Creating Migrations

### Auto-Generating Migrations
```bash
# Generate migration from model changes
alembic revision --autogenerate -m "add user table"

# This creates a new migration file in alembic/versions/
# The migration will include CREATE TABLE statements
```

### Manual Migration Creation
```bash
# Create empty migration
alembic revision -m "create user table"

# Edit the generated file manually
```

### Example Auto-Generated Migration
```python
"""add user table

Revision ID: 123456789abc
Revises: None
Create Date: 2023-12-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '123456789abc'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    # ### end Alembic commands ###

def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('users')
    # ### end Alembic commands ###
```

## Running Migrations

### Basic Commands
```bash
# Check current migration status
alembic current

# Check migration history
alembic history

# Check pending migrations
alembic heads

# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade 123456789abc

# Rollback last migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade 123456789abc

# Rollback all migrations
alembic downgrade base
```

### Migration Status
```bash
# Show current revision
alembic current
# Output: 123456789abc (head)

# Show all revisions
alembic history --verbose

# Check for pending migrations
alembic check
```

## Advanced Migration Patterns

### Data Migrations
```python
"""add default admin user

Revision ID: abcdef123456
Revises: 123456789abc
Create Date: 2023-12-01 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Boolean

revision = 'abcdef123456'
down_revision = '123456789abc'
branch_labels = None
depends_on = None

def upgrade():
    # Define table for data migration
    users_table = table('users',
        column('id', sa.Integer),
        column('username', sa.String),
        column('email', sa.String),
        column('password_hash', sa.String),
        column('is_active', sa.Boolean),
        column('is_admin', sa.Boolean)
    )

    # Insert default admin user
    op.bulk_insert(users_table, [
        {
            'username': 'admin',
            'email': 'admin@example.com',
            'password_hash': '$2b$12$...hashed_password...',  # Pre-hashed password
            'is_active': True,
            'is_admin': True
        }
    ])

def downgrade():
    # Remove admin user
    op.execute("DELETE FROM users WHERE username = 'admin'")
```

### Conditional Migrations
```python
"""add optional column

Revision ID: def123456789
Revises: abcdef123456
Create Date: 2023-12-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'def123456789'
down_revision = 'abcdef123456'
branch_labels = None
depends_on = None

def upgrade():
    # Check if column already exists (for safety)
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'phone' not in [col['name'] for col in inspector.get_columns('users')]:
        op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

def downgrade():
    # Check if column exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'phone' in [col['name'] for col in inspector.get_columns('users')]:
        op.drop_column('users', 'phone')
```

### Migration Dependencies
```python
"""create orders table

Revision ID: ghi789012345
Revises: def123456789
Create Date: 2023-12-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'ghi789012345'
down_revision = 'def123456789'
branch_labels = None
depends_on = ['def123456789', 'other_migration_id']  # Multiple dependencies

def upgrade():
    op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('orders')
```

## Migration Environments

### Multiple Environment Configuration
```bash
# Create separate config files
alembic -c alembic-dev.ini current
alembic -c alembic-prod.ini upgrade head
```

### Environment-Specific Config
```python
# env.py with environment detection
import os

def get_database_url():
    env = os.getenv('ENV', 'development')
    if env == 'production':
        return os.getenv('PROD_DATABASE_URL')
    elif env == 'staging':
        return os.getenv('STAGING_DATABASE_URL')
    else:
        return os.getenv('DEV_DATABASE_URL')

# In env.py
config.set_main_option('sqlalchemy.url', get_database_url())
```

### Branching and Merging
```bash
# Create branch for feature development
alembic revision --branch-label feature_x -m "feature x start"

# Merge branches
alembic merge -m "merge feature branches"

# Handle conflicts
alembic revision --depends-on abc123,def456 -m "resolve conflicts"
```

## Migration Testing

### Testing Migrations
```python
import pytest
from alembic import command
from alembic.config import Config
from alembic.environment import EnvironmentContext
from alembic.script import ScriptDirectory

def test_migration_upgrade():
    """Test migration upgrade"""
    config = Config("alembic.ini")

    # Create test database
    engine = create_engine("postgresql://test:test@localhost/test_db")

    # Run migrations
    with engine.connect() as conn:
        config.attributes['connection'] = conn
        command.upgrade(config, "head")

        # Verify schema changes
        inspector = sa.inspect(engine)
        assert 'users' in inspector.get_table_names()

def test_migration_downgrade():
    """Test migration downgrade"""
    config = Config("alembic.ini")

    with engine.connect() as conn:
        config.attributes['connection'] = conn

        # Upgrade first
        command.upgrade(config, "head")

        # Then downgrade
        command.downgrade(config, "base")

        # Verify rollback
        inspector = sa.inspect(engine)
        assert 'users' not in inspector.get_table_names()
```

### Migration Validation
```python
def validate_migration():
    """Validate migration before applying"""
    config = Config("alembic.ini")
    script = ScriptDirectory.from_config(config)

    # Check for circular dependencies
    for revision in script.walk_revisions():
        # Validate revision structure
        assert revision.revision
        assert revision.down_revision is not None or revision.is_base

    # Test migration on copy of production data
    # (Advanced: create test database with anonymized prod data)
```

## Production Deployment

### Safe Deployment Practices
```bash
# 1. Backup database
pg_dump mydatabase > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
alembic -c alembic-staging.ini upgrade head

# 3. Verify application works
# Run integration tests

# 4. Deploy to production
alembic -c alembic-prod.ini upgrade head

# 5. Monitor for issues
# Check logs, performance metrics
```

### Rollback Strategy
```bash
# Quick rollback
alembic downgrade -1

# Gradual rollback with feature flags
# 1. Deploy code that handles old schema
# 2. Run migration
# 3. Remove compatibility code

# Emergency rollback
alembic downgrade base  # Nuclear option
```

### Migration Monitoring
```sql
-- Track migration progress
SELECT * FROM alembic_version;

-- Monitor migration performance
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Check for long-running queries during migration
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

## Common Patterns and Best Practices

### Schema Evolution
```python
# Handle column renames
def upgrade():
    # Step 1: Add new column
    op.add_column('users', sa.Column('full_name', sa.String(100)))

    # Step 2: Populate data
    op.execute("UPDATE users SET full_name = first_name || ' ' || last_name")

    # Step 3: Drop old columns
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')

def downgrade():
    # Reverse the process
    op.add_column('users', sa.Column('first_name', sa.String(50)))
    op.add_column('users', sa.Column('last_name', sa.String(50)))
    op.execute("UPDATE users SET first_name = split_part(full_name, ' ', 1), last_name = split_part(full_name, ' ', 2)")
    op.drop_column('users', 'full_name')
```

### Large Table Migrations
```python
# Handle large table changes
def upgrade():
    # Create new table with new structure
    op.create_table('users_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Copy data in batches
    batch_size = 1000
    total_rows = op.get_bind().execute("SELECT COUNT(*) FROM users").scalar()

    for offset in range(0, total_rows, batch_size):
        op.execute(f"""
            INSERT INTO users_new (id, username, email, created_at)
            SELECT id, username, email, created_at
            FROM users
            ORDER BY id
            LIMIT {batch_size} OFFSET {offset}
        """)

    # Rename tables
    op.rename_table('users', 'users_old')
    op.rename_table('users_new', 'users')

    # Drop old table
    op.drop_table('users_old')
```

## Troubleshooting

### Common Migration Issues

**Migration fails with foreign key errors:**
```sql
-- Check existing constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f';

-- Disable constraints temporarily
ALTER TABLE child_table DISABLE TRIGGER ALL;
-- Run migration
ALTER TABLE child_table ENABLE TRIGGER ALL;
```

**Migration timeout:**
```bash
# Increase timeout in alembic.ini
sqlalchemy.url = postgresql://user:pass@host:port/db?connect_timeout=300

# Or in env.py
context.configure(
    connection=connection,
    target_metadata=target_metadata,
    command_timeout=300  # 5 minutes
)
```

**Auto-generation misses changes:**
```bash
# Force include all objects
alembic revision --autogenerate --head-only

# Manually review and adjust generated migration
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Database Migration Check

on:
  pull_request:
    paths:
      - 'app/models/**'
      - 'alembic/**'

jobs:
  migration-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        uv add -r requirements.txt
        uv add alembic

    - name: Check migrations
      run: |
        alembic check

    - name: Generate migration (if needed)
      run: |
        alembic revision --autogenerate -m "Auto-generated migration"
        if [ -n "$(find alembic/versions -name '*.py' -newer alembic/versions/HEAD)" ]; then
          echo "New migration generated"
          exit 1
        fi
```

## Hands-on Exercises

### Exercise 1: Basic Migrations
1. Create initial migration for a simple user model
2. Add new fields with subsequent migrations
3. Practice upgrade and downgrade operations

### Exercise 2: Data Migrations
1. Create migration that populates default data
2. Implement data transformation migrations
3. Handle complex data relationships

### Exercise 3: Production Deployment
1. Set up staging and production configurations
2. Implement migration testing and validation
3. Create rollback strategies and procedures

## Next Steps
- [Workshop: Basic Schema Design](../workshops/workshop-01-basic-schema-design.md)
- [Workshop: Normalized Schema Design](../workshops/workshop-03-normalized-schema.md)

## Additional Resources
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Database Migration Best Practices](https://www.martinfowler.com/articles/evodb.html)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

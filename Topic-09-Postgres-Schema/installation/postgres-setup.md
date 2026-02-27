# PostgreSQL Development Environment Setup

## Overview
This guide covers installing and configuring PostgreSQL for database development, including schema design and management tools.

## Prerequisites
- Administrator privileges for installation
- 2GB free disk space
- Basic SQL knowledge

---

## PostgreSQL Installation

### Windows Installation
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Choose components:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Command Line Tools
   - ✅ Stack Builder (optional)
4. Set password for postgres user
5. Choose port (default: 5432)
6. Complete installation

### macOS Installation
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or using Postgres.app
# Download from https://postgresapp.com/
```

### Linux Installation (Ubuntu)
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Basic Configuration

### Connect to PostgreSQL
```bash
# Windows (from PostgreSQL bin directory)
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

### Create Database and User
```sql
-- Create database
CREATE DATABASE myproject;

-- Create user
CREATE USER myuser WITH PASSWORD 'mypassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE myproject TO myuser;

-- Exit
\q
```

---

## Python PostgreSQL Setup

### Install Dependencies
```bash
# Create virtual environment
uv venv postgres-env
source postgres-env/bin/activate  # Linux/macOS
# or postgres-env\Scripts\activate  # Windows

# Install packages
uv add psycopg2-binary sqlalchemy asyncpg alembic

# Development tools
uv add pgcli ipython jupyter
```

### Database Connection
```python
# config.py
DATABASE_URL = "postgresql://myuser:mypassword@localhost/myproject"

# Using SQLAlchemy
from sqlalchemy import create_engine

engine = create_engine(DATABASE_URL)
connection = engine.connect()

# Using asyncpg
import asyncpg

async def get_connection():
    return await asyncpg.connect(DATABASE_URL)
```

---

## Schema Design Tools

### pgAdmin Installation
- **Windows/macOS**: Installed with PostgreSQL
- **Linux**: `sudo apt install pgadmin4`

### Alternative Tools
```bash
# DBeaver (Universal)
# Download from https://dbeaver.io/

# DataGrip (JetBrains)
# Part of JetBrains IDEs
```

---

## Project Structure

```
postgres-project/
├── database/
│   ├── __init__.py
│   ├── models.py       # SQLAlchemy models
│   ├── schemas.py      # Pydantic schemas
│   ├── connection.py   # Database connection
│   └── migrations/     # Alembic migrations
├── scripts/
│   ├── create_db.py
│   ├── seed_data.py
│   └── backup_db.py
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   └── test_queries.py
├── config/
│   └── settings.py
├── requirements.txt
└── README.md
```

---

## Alembic Setup for Migrations

```bash
# Install alembic
uv add alembic

# Initialize alembic
alembic init database/migrations

# Configure alembic.ini
# sqlalchemy.url = postgresql://user:password@localhost/dbname

# Create first migration
alembic revision --autogenerate -m "Initial schema"

# Run migration
alembic upgrade head
```

---

## Basic Schema Example

```python
# models.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
```

---

## Testing Setup

```python
# tests/test_models.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base, User

@pytest.fixture
def db_session():
    # Create test database
    engine = create_engine("postgresql://test:test@localhost/test_db")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    # Cleanup
    session.close()
    Base.metadata.drop_all(engine)

def test_create_user(db_session):
    user = User(username="testuser", email="test@example.com")
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.username == "testuser"
```

---

## Performance Optimization

### Connection Pooling
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)
```

### Indexing Strategy
```sql
-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Composite indexes
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at);
```

---

## Backup and Restore

### Database Backup
```bash
# Backup entire database
pg_dump -U myuser -h localhost myproject > backup.sql

# Backup specific table
pg_dump -U myuser -h localhost -t users myproject > users_backup.sql

# Compressed backup
pg_dump -U myuser -h localhost myproject | gzip > backup.sql.gz
```

### Database Restore
```bash
# Restore from backup
psql -U myuser -h localhost myproject < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql -U myuser -h localhost myproject
```

---

## Monitoring and Maintenance

### Basic Monitoring
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

### Maintenance Commands
```sql
-- Analyze tables for query planner
ANALYZE;

-- Vacuum database
VACUUM;

-- Reindex database
REINDEX DATABASE myproject;
```

---

## Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check listening ports
netstat -tlnp | grep 5432

# Test connection
psql -U myuser -h localhost -d myproject
```

### Permission Errors
```sql
-- Check user permissions
SELECT * FROM information_schema.role_table_grants WHERE grantee = 'myuser';

-- Grant additional permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myuser;
```

### Performance Issues
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

---

## Next Steps

1. [Learn PostgreSQL basics](../tutorials/01-postgres-fundamentals.md)
2. [Design your first schema](../workshops/workshop-01-schema-design.md)
3. [Implement data models](../tutorials/02-sqlalchemy-models.md)
4. [Set up migrations](../workshops/workshop-02-migrations.md)

---

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [SQLAlchemy Documentation](https://sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)

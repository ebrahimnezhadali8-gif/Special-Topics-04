# Workshop 01: Basic Schema Design and Implementation

## Overview
This workshop guides you through designing and implementing a basic database schema for a blog application. You'll create tables, relationships, constraints, and indexes using PostgreSQL and SQLAlchemy.

## Prerequisites
- PostgreSQL installed and running ([Installation Guide](../installation/postgres-setup.md))
- Basic understanding of SQL and relational databases
- Python virtual environment with required packages

## Learning Objectives
By the end of this workshop, you will be able to:
- Design a relational database schema
- Create tables with proper constraints
- Establish relationships between tables
- Implement indexes for performance
- Use SQLAlchemy to define and create database models

## Workshop Setup

### Step 1: Project Structure

```bash
mkdir blog-schema-workshop
cd blog-schema-workshop

# Create virtual environment
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
uv add sqlalchemy psycopg2-binary alembic python-dotenv

# Create project structure
mkdir -p app/{models,config}
touch app/__init__.py app/models/__init__.py app/config/__init__.py
touch app/models/blog.py app/config/database.py
touch .env requirements.txt
```

### Step 2: Configuration Setup

**app/config/database.py:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/blog_db")

# SQLAlchemy setup
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
```

**.env:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost/blog_db
```

**requirements.txt:**
```
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
python-dotenv==1.0.0
```

### Step 3: Database Creation

Create the blog database:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE blog_db;

-- Create user (optional, for security)
CREATE USER blog_user WITH PASSWORD 'blog_password';
GRANT ALL PRIVILEGES ON DATABASE blog_db TO blog_user;

-- Exit
\q
```

Update your `.env` file if using the new user:
```bash
DATABASE_URL=postgresql://blog_user:blog_password@localhost/blog_db
```

### Step 4: Basic Schema Design

Let's design a schema for a blog with the following entities:

1. **Users** - Blog authors and administrators
2. **Categories** - Blog post categories
3. **Posts** - Blog articles
4. **Comments** - User comments on posts
5. **Tags** - Keywords associated with posts

#### Entity Relationship Diagram
```
┌─────────────┐       ┌─────────────┐
│   Users     │       │ Categories  │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ username    │       │ name        │
│ email       │       │ slug        │
│ password    │       │ description │
│ full_name   │       └─────────────┘
│ is_admin    │              │
│ created_at  │              │
└─────────────┘              │
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│    Posts    │◄──────┤Post_Categories│
├─────────────┤       └─────────────┘
│ id (PK)     │              ▲
│ title       │              │
│ slug        │              │
│ content     │              │
│ author_id   │──────────────┘
│ status      │
│ published_at│
│ created_at  │
│ updated_at  │
└─────────────┘
       │
       │
       ▼
┌─────────────┐       ┌─────────────┐
│  Comments   │◄──────┤    Tags     │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ post_id     │       │ name        │
│ author_name │       │ slug        │
│ content     │       └─────────────┘
│ created_at  │              ▲
└─────────────┘              │
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│Post_Comments│       │ Post_Tags   │
└─────────────┘       └─────────────┘
```

### Step 5: SQLAlchemy Models

**app/models/blog.py:**
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.config.database import Base

# Association table for post-tag many-to-many relationship
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

# Association table for post-category many-to-many relationship
post_categories = Table(
    'post_categories',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    posts = relationship("Post", secondary=post_categories, back_populates="categories")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    posts = relationship("Post", secondary=post_tags, back_populates="tags")

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    excerpt = Column(String(300))
    content = Column(Text, nullable=False)
    status = Column(String(20), default="draft", nullable=False)  # draft, published, archived
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Foreign Keys
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")
    categories = relationship("Category", secondary=post_categories, back_populates="categories")

    def __repr__(self):
        return f"<Post(id={self.id}, title='{self.title}', status='{self.status}')>"

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_name = Column(String(100))  # For anonymous comments
    author_email = Column(String(255))  # For anonymous comments
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign Keys
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))  # NULL for anonymous

    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")

    def __repr__(self):
        return f"<Comment(id={self.id}, post_id={self.post_id})>"
```

### Step 6: Create Tables

**create_tables.py:**
```python
#!/usr/bin/env python3
"""Script to create database tables"""

from app.config.database import create_tables

if __name__ == "__main__":
    print("Creating database tables...")
    create_tables()
    print("Tables created successfully!")
```

Run the script:
```bash
python create_tables.py
```

### Step 7: Verify Schema

Check that tables were created correctly:

```sql
-- Connect to database
psql -U blog_user -d blog_db

-- List tables
\dt

-- Check table structure
\d users
\d posts
\d categories
\d tags
\d comments

-- Check constraints
SELECT conname, conrelid::regclass, contype
FROM pg_constraint
WHERE conrelid IN (
    SELECT oid FROM pg_class
    WHERE relname IN ('users', 'posts', 'categories', 'tags', 'comments')
);

-- Exit
\q
```

### Step 8: Add Sample Data

**seed_data.py:**
```python
#!/usr/bin/env python3
"""Script to seed database with sample data"""

from app.config.database import SessionLocal
from app.models.blog import User, Category, Tag, Post, Comment
import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing (use proper hashing in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def seed_data():
    """Seed database with sample data"""
    db = SessionLocal()

    try:
        # Create users
        admin = User(
            username="admin",
            email="admin@blog.com",
            password_hash=hash_password("admin123"),
            full_name="Blog Administrator",
            is_admin=True
        )

        author = User(
            username="john_doe",
            email="john@blog.com",
            password_hash=hash_password("password123"),
            full_name="John Doe"
        )

        db.add(admin)
        db.add(author)
        db.flush()  # Get IDs

        # Create categories
        tech = Category(
            name="Technology",
            slug="technology",
            description="Posts about technology and programming"
        )

        lifestyle = Category(
            name="Lifestyle",
            slug="lifestyle",
            description="Posts about lifestyle and personal development"
        )

        db.add(tech)
        db.add(lifestyle)
        db.flush()

        # Create tags
        python_tag = Tag(name="Python", slug="python")
        web_tag = Tag(name="Web Development", slug="web-development")
        ai_tag = Tag(name="AI", slug="ai")

        db.add(python_tag)
        db.add(web_tag)
        db.add(ai_tag)
        db.flush()

        # Create posts
        post1 = Post(
            title="Getting Started with Python",
            slug="getting-started-with-python",
            excerpt="A beginner's guide to Python programming",
            content="""
            Python is a high-level programming language known for its simplicity and readability.

            ## Why Python?

            - Easy to learn syntax
            - Large ecosystem of libraries
            - Used in web development, data science, AI, and more

            ## Getting Started

            Install Python from python.org and start coding!
            """,
            status="published",
            author_id=author.id,
            published_at=db.query(func.now()).scalar()
        )
        post1.tags = [python_tag]
        post1.categories = [tech]

        post2 = Post(
            title="Building Web Applications",
            slug="building-web-applications",
            excerpt="Learn how to build modern web applications",
            content="""
            Web development has evolved significantly over the years.

            ## Modern Web Stack

            - Frontend: React, Vue, Angular
            - Backend: Node.js, Python, Go
            - Database: PostgreSQL, MongoDB

            ## Best Practices

            - Use HTTPS
            - Implement proper authentication
            - Optimize for performance
            """,
            status="published",
            author_id=admin.id,
            published_at=db.query(func.now()).scalar()
        )
        post2.tags = [web_tag, python_tag]
        post2.categories = [tech]

        db.add(post1)
        db.add(post2)
        db.flush()

        # Create comments
        comment1 = Comment(
            content="Great article! Very helpful for beginners.",
            author_name="Anonymous Reader",
            post_id=post1.id
        )

        comment2 = Comment(
            content="Thanks for sharing this knowledge!",
            author_name="Dev Enthusiast",
            author_email="dev@example.com",
            post_id=post2.id
        )

        db.add(comment1)
        db.add(comment2)

        # Commit all changes
        db.commit()

        print("Database seeded successfully!")
        print(f"Created {db.query(User).count()} users")
        print(f"Created {db.query(Category).count()} categories")
        print(f"Created {db.query(Tag).count()} tags")
        print(f"Created {db.query(Post).count()} posts")
        print(f"Created {db.query(Comment).count()} comments")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
```

Run the seeding script:
```bash
python seed_data.py
```

### Step 9: Query Data

**query_data.py:**
```python
#!/usr/bin/env python3
"""Script to query and display database data"""

from app.config.database import SessionLocal
from app.models.blog import User, Category, Tag, Post, Comment
from sqlalchemy.orm import joinedload

def display_data():
    """Display database contents"""
    db = SessionLocal()

    try:
        print("=== USERS ===")
        users = db.query(User).all()
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Email: {user.email}, Admin: {user.is_admin}")

        print("\n=== CATEGORIES ===")
        categories = db.query(Category).all()
        for category in categories:
            print(f"ID: {category.id}, Name: {category.name}, Slug: {category.slug}")

        print("\n=== TAGS ===")
        tags = db.query(Tag).all()
        for tag in tags:
            print(f"ID: {tag.id}, Name: {tag.name}, Slug: {tag.slug}")

        print("\n=== POSTS ===")
        posts = db.query(Post).options(
            joinedload(Post.author),
            joinedload(Post.tags),
            joinedload(Post.categories)
        ).all()

        for post in posts:
            print(f"ID: {post.id}")
            print(f"Title: {post.title}")
            print(f"Author: {post.author.username}")
            print(f"Status: {post.status}")
            print(f"Tags: {[tag.name for tag in post.tags]}")
            print(f"Categories: {[cat.name for cat in post.categories]}")
            print(f"Comments: {len(post.comments)}")
            print("---")

        print("\n=== COMMENTS ===")
        comments = db.query(Comment).options(
            joinedload(Comment.post),
            joinedload(Comment.author)
        ).all()

        for comment in comments:
            print(f"ID: {comment.id}")
            print(f"Post: {comment.post.title}")
            print(f"Author: {comment.author_name or (comment.author.username if comment.author else 'Unknown')}")
            print(f"Content: {comment.content[:50]}...")
            print("---")

    finally:
        db.close()

if __name__ == "__main__":
    display_data()
```

Run the query script:
```bash
python query_data.py
```

### Step 10: Add Indexes

Based on our queries, let's add some performance indexes:

**add_indexes.sql:**
```sql
-- Performance indexes for the blog schema

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Posts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published_at ON posts(published_at) WHERE status = 'published';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Full-text search index on posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_fts
ON posts USING gin(to_tsvector('english', title || ' ' || coalesce(content, '')));

-- Comments table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id ON comments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Categories table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Tags table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Association table indexes (for many-to-many relationships)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_categories_post_id ON post_categories(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_categories_category_id ON post_categories(category_id);
```

Apply the indexes:
```bash
psql -U blog_user -d blog_db -f add_indexes.sql
```

### Step 11: Test Performance

**performance_test.py:**
```python
#!/usr/bin/env python3
"""Script to test database performance"""

import time
from app.config.database import SessionLocal
from app.models.blog import User, Post, Comment

def performance_test():
    """Run performance tests"""
    db = SessionLocal()

    try:
        # Test 1: Simple SELECT
        print("=== Performance Test: Simple SELECT ===")
        start_time = time.time()
        users = db.query(User).all()
        end_time = time.time()
        print(f"Selected {len(users)} users in {end_time - start_time:.4f} seconds")

        # Test 2: JOIN query
        print("\n=== Performance Test: JOIN Query ===")
        start_time = time.time()
        posts_with_authors = db.query(Post).options(joinedload(Post.author)).all()
        end_time = time.time()
        print(f"Selected {len(posts_with_authors)} posts with authors in {end_time - start_time:.4f} seconds")

        # Test 3: Complex query
        print("\n=== Performance Test: Complex Query ===")
        start_time = time.time()
        results = db.query(Post).options(
            joinedload(Post.author),
            joinedload(Post.tags),
            joinedload(Post.categories),
            joinedload(Post.comments)
        ).filter(Post.status == 'published').all()
        end_time = time.time()
        print(f"Complex query returned {len(results)} results in {end_time - start_time:.4f} seconds")

        # Test 4: Full-text search
        print("\n=== Performance Test: Full-Text Search ===")
        start_time = time.time()
        search_results = db.query(Post).filter(
            db.query(Post).filter(
                db.func.to_tsvector('english', Post.title + ' ' + db.func.coalesce(Post.content, ''))
                .match('python', postgresql_regconfig='english')
            ).exists()
        ).all()
        end_time = time.time()
        print(f"Full-text search returned {len(search_results)} results in {end_time - start_time:.4f} seconds")

    finally:
        db.close()

if __name__ == "__main__":
    performance_test()
```

Run the performance test:
```bash
python performance_test.py
```

## Challenge Exercises

### Challenge 1: Extend the Schema
1. Add user profiles with additional information
2. Implement post likes/favorites system
3. Add image/file attachments to posts
4. Create user roles and permissions

### Challenge 2: Optimize Queries
1. Analyze slow queries using EXPLAIN
2. Add missing indexes based on query patterns
3. Implement query result caching
4. Create database views for common queries

### Challenge 3: Data Validation
1. Add database-level constraints
2. Implement custom validation functions
3. Add triggers for data integrity
4. Create data sanitization procedures

## Verification Checklist

### Schema Design
- [ ] All entities identified and modeled
- [ ] Proper relationships established
- [ ] Appropriate data types chosen
- [ ] Constraints and defaults set

### Table Creation
- [ ] All tables created successfully
- [ ] Foreign keys working correctly
- [ ] Indexes added for performance
- [ ] Sample data inserted

### Data Integrity
- [ ] Referential integrity maintained
- [ ] Unique constraints enforced
- [ ] Default values working
- [ ] Data validation active

### Query Performance
- [ ] Basic queries working efficiently
- [ ] JOIN operations optimized
- [ ] Full-text search implemented
- [ ] Performance benchmarks completed

## Troubleshooting

### Common Schema Issues

**Foreign key constraint errors:**
```sql
-- Check existing foreign keys
SELECT
    tc.table_name, tc.constraint_name, tc.constraint_type,
    kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Temporarily disable constraints for data loading
ALTER TABLE child_table DISABLE TRIGGER ALL;
-- Load data
ALTER TABLE child_table ENABLE TRIGGER ALL;
```

**Index creation blocking:**
```sql
-- Create indexes concurrently (non-blocking)
CREATE INDEX CONCURRENTLY idx_table_column ON table_name(column_name);

-- Monitor index creation progress
SELECT
    schemaname, tablename, indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'your_index_name';
```

**Performance issues:**
```sql
-- Analyze table statistics
ANALYZE VERBOSE table_name;

-- Check query execution plan
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM table_name WHERE column = 'value';

-- Monitor slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

## Next Steps
- [Tutorial: Table Design and Normalization](../tutorials/02-table-design-normalization.md)
- [Workshop: Migration Management](../workshops/workshop-02-migration-management.md)

## Additional Resources
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [SQLAlchemy Models](https://docs.sqlalchemy.org/en/14/orm/declarative_tables.html)
- [Database Design Best Practices](https://www.lucidchart.com/pages/database-diagram/database-design)
- [Index Best Practices](https://www.postgresql.org/docs/current/indexes.html)

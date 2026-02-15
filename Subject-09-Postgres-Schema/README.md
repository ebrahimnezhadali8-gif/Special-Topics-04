# Subject 9: Storing Data in PostgreSQL and Schema Design

## Overview

This subject covers PostgreSQL database design and implementation, focusing on creating efficient schemas for storing crawled web data. You'll learn relational database principles, normalization, indexing strategies, and database migrations using SQLAlchemy and Alembic.

## Learning Objectives

By the end of this subject, you will be able to:

- **Design Database Schemas**: Create normalized relational database structures
- **Implement PostgreSQL Tables**: Define tables, constraints, and relationships
- **Use Indexing Strategies**: Optimize query performance with proper indexing
- **Manage Database Migrations**: Use Alembic for schema versioning and changes
- **Connect with SQLAlchemy**: Implement ORM patterns for database operations
- **Handle Crawled Data**: Store and retrieve web scraping results efficiently

## Prerequisites

- Completion of Subjects 1-8 (Git through Web Crawling)
- Basic understanding of relational databases
- SQL knowledge (SELECT, INSERT, UPDATE, DELETE)
- Python programming proficiency

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[PostgreSQL Fundamentals](tutorials/01-postgres-basics.md)**
   - PostgreSQL installation and setup
   - Basic SQL operations and data types
   - Database concepts and terminology
   - PostgreSQL-specific features

2. **[Schema Design Principles](tutorials/02-schema-design.md)**
   - Relational database design
   - Normalization (1NF, 2NF, 3NF)
   - Entity-Relationship modeling
   - Primary and foreign keys

3. **[Advanced PostgreSQL Features](tutorials/03-postgres-features.md)**
   - JSONB and advanced data types
   - Full-text search capabilities
   - Array and range types
   - PostgreSQL extensions

4. **[SQLAlchemy ORM](tutorials/04-sqlalchemy-orm.md)**
   - ORM concepts and patterns
   - Model definitions and relationships
   - Query building and execution
   - Session management

5. **[Database Migrations](tutorials/05-migrations.md)**
   - Alembic migration system
   - Creating and applying migrations
   - Migration best practices
   - Schema versioning

### 🛠️ Workshops (Hands-on Practice)

1. **[PostgreSQL Setup](workshops/workshop-01-postgres-setup.md)**
   - Installing and configuring PostgreSQL
   - Creating databases and users
   - Basic database administration
   - Connection testing

2. **[Schema Design](workshops/workshop-02-schema-design.md)**
   - Designing tables for crawled content
   - Implementing relationships
   - Adding constraints and indexes
   - Schema optimization

3. **[SQLAlchemy Integration](workshops/workshop-03-sqlalchemy-integration.md)**
   - Setting up SQLAlchemy with FastAPI
   - Creating models and relationships
   - Implementing CRUD operations
   - Error handling

4. **[Migrations with Alembic](workshops/workshop-04-migrations-alembic.md)**
   - Setting up Alembic
   - Creating initial migrations
   - Managing schema changes
   - Migration testing

5. **[Data Storage Pipeline](workshops/workshop-05-data-storage-pipeline.md)**
   - Integrating with crawling pipeline
   - Batch data insertion
   - Error handling and recovery
   - Performance optimization

### 📝 Homework Assignments

The `homeworks/` directory contains:
- Schema design projects
- Migration implementation tasks
- Data pipeline integration challenges

### 📋 Assessments

The `assessments/` directory contains:
- Database design quiz
- SQL query challenges
- Schema optimization exercises

## Key Database Concepts

### Schema Design for Web Crawling

```sql
-- Articles table for crawled content
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    url VARCHAR(2048) UNIQUE NOT NULL,
    title TEXT,
    content TEXT,
    summary TEXT,
    author VARCHAR(255),
    published_date TIMESTAMP,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(10) DEFAULT 'fa',
    site_domain VARCHAR(255),
    word_count INTEGER,
    reading_time INTEGER
);

-- Tags for categorization
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article-Tag relationship (many-to-many)
CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_articles_published_date ON articles(published_date);
CREATE INDEX idx_articles_site_domain ON articles(site_domain);
CREATE INDEX idx_tags_name ON tags(name);
```

### SQLAlchemy Models

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(2048), unique=True, nullable=False, index=True)
    title = Column(Text)
    content = Column(Text)
    summary = Column(Text)
    author = Column(String(255))
    published_date = Column(DateTime)
    crawled_at = Column(DateTime, default=datetime.utcnow)
    language = Column(String(10), default="fa")
    site_domain = Column(String(255), index=True)
    word_count = Column(Integer)
    reading_time = Column(Integer)

    # Relationships
    tags = relationship("Tag", secondary="article_tags", back_populates="articles")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    articles = relationship("Article", secondary="article_tags", back_populates="tags")
```

### Alembic Migration

```python
# migration script
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create articles table
    op.create_table('articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=2048), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('published_date', sa.DateTime(), nullable=True),
        sa.Column('crawled_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('language', sa.String(length=10), server_default='fa', nullable=True),
        sa.Column('site_domain', sa.String(length=255), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('reading_time', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('url')
    )

    # Create indexes
    op.create_index(op.f('ix_articles_id'), 'articles', ['id'], unique=False)
    op.create_index(op.f('ix_articles_url'), 'articles', ['url'], unique=False)
    op.create_index(op.f('ix_articles_site_domain'), 'articles', ['site_domain'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_articles_site_domain'), table_name='articles')
    op.drop_index(op.f('ix_articles_url'), table_name='articles')
    op.drop_index(op.f('ix_articles_id'), table_name='articles')
    op.drop_table('articles')
```

## Database Optimization

### Indexing Strategy

```sql
-- Single column indexes
CREATE INDEX idx_articles_published_date ON articles(published_date);
CREATE INDEX idx_articles_author ON articles(author);

-- Composite indexes
CREATE INDEX idx_articles_domain_date ON articles(site_domain, published_date);
CREATE INDEX idx_articles_language_date ON articles(language, published_date DESC);

-- Partial indexes
CREATE INDEX idx_recent_articles ON articles(published_date)
WHERE published_date > CURRENT_DATE - INTERVAL '30 days';

-- Full-text search index
CREATE INDEX idx_articles_content_fts ON articles
USING gin(to_tsvector('persian', content));
```

### Query Optimization

```python
# Efficient queries with SQLAlchemy
def get_recent_articles(db: Session, limit: int = 10):
    return db.query(Article)\
        .filter(Article.published_date >= datetime.utcnow() - timedelta(days=7))\
        .order_by(Article.published_date.desc())\
        .limit(limit)\
        .all()

def search_articles(db: Session, query: str, language: str = "fa"):
    # Full-text search
    search_query = func.plainto_tsquery(language, query)
    return db.query(Article)\
        .filter(Article.language == language)\
        .filter(func.ts_rank_cd(Article.content_tsv, search_query) > 0.1)\
        .order_by(func.ts_rank_cd(Article.content_tsv, search_query).desc())\
        .all()
```

## Data Integrity and Constraints

### Check Constraints

```sql
-- Ensure valid URLs
ALTER TABLE articles
ADD CONSTRAINT chk_valid_url
CHECK (url LIKE 'http%' OR url LIKE 'https%');

-- Ensure word count is positive
ALTER TABLE articles
ADD CONSTRAINT chk_positive_word_count
CHECK (word_count > 0);

-- Ensure reading time is reasonable
ALTER TABLE articles
ADD CONSTRAINT chk_reading_time_range
CHECK (reading_time BETWEEN 1 AND 120);
```

### Triggers for Data Validation

```sql
-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Assuming 200 words per minute reading speed
    NEW.reading_time := CEIL(NEW.word_count / 200.0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate reading time
CREATE TRIGGER trg_calculate_reading_time
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_reading_time();
```

## Resources & References

### 📖 Official Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Official PostgreSQL docs
- [SQLAlchemy Documentation](https://sqlalchemy.org/) - ORM documentation
- [Alembic Documentation](https://alembic.sqlalchemy.org/) - Migration tool

### 🛠️ Tools & Setup
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI
- [DBeaver](https://dbeaver.io/) - Universal database tool
- [psql](https://www.postgresql.org/docs/current/app-psql.html) - Command-line client

### 📚 Additional Learning
- [Database Design for Mere Mortals](https://www.amazon.com/Database-Design-Mere-Mortals-Hands/dp/0321884493) - Design principles
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html) - Optimization guide
- [SQLAlchemy Best Practices](https://docs.sqlalchemy.org/en/14/core/connections.html) - Usage patterns

## Getting Started

1. **Review Prerequisites** from previous database and Python subjects
2. **Install PostgreSQL** following the installation guides in `installation/`
3. **Complete Workshop 1** to set up your PostgreSQL environment
4. **Work through Tutorials** to understand schema design principles
5. **Practice with Workshops** to implement database operations
6. **Complete Homework** assignments for comprehensive practice

## Common Database Patterns

### Connection Pooling

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Batch Insertions

```python
async def insert_articles_batch(db: AsyncSession, articles_data: List[dict]):
    # Prepare data for bulk insert
    articles = [
        Article(
            url=data['url'],
            title=data['title'],
            content=data['content'],
            # ... other fields
        )
        for data in articles_data
    ]

    # Bulk insert with conflict resolution
    stmt = insert(Article).values([
        {
            'url': article.url,
            'title': article.title,
            'content': article.content,
            # ... other fields
        }
        for article in articles
    ])

    # Handle conflicts (duplicate URLs)
    stmt = stmt.on_conflict_do_nothing(index_elements=['url'])

    await db.execute(stmt)
    await db.commit()
```

### Data Validation

```python
from pydantic import BaseModel, validator
from typing import Optional

class ArticleCreate(BaseModel):
    url: str
    title: Optional[str]
    content: Optional[str]
    author: Optional[str]

    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

    @validator('content')
    def validate_content(cls, v):
        if v and len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters long')
        return v
```

## Assessment Criteria

- **Schema Design**: Proper normalization and relationship modeling
- **Indexing Strategy**: Effective use of indexes for query optimization
- **Migration Management**: Clean, versioned database schema changes
- **Data Integrity**: Proper constraints and validation
- **Performance**: Efficient queries and data operations
- **Code Quality**: Clean, maintainable database code

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 10**: Building complete data pipelines
- **Subject 11**: Database optimization and performance tuning
- Production database deployment and management

---

*Effective database design is crucial for scalable applications. This subject provides the foundation for storing and managing web crawling data efficiently in PostgreSQL.*

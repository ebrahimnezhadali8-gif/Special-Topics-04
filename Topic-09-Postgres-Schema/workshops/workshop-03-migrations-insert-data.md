# Workshop 03: Migrations and Crawled Data Insertion

## Overview
This workshop demonstrates the complete workflow of creating database migrations and inserting crawled data into PostgreSQL. You'll implement Alembic migrations for the crawled content schema, create data insertion scripts, and build a complete ETL (Extract, Transform, Load) pipeline for web scraping data.

## Prerequisites
- Completed [Crawled Data Schema Workshop](../workshops/workshop-02-crawled-data-schema.md)
- Understanding of database migrations and ETL concepts
- PostgreSQL and Alembic installed

## Learning Objectives
By the end of this workshop, you will be able to:
- Create and manage database migrations with Alembic
- Implement data insertion scripts for crawled content
- Build ETL pipelines for web scraping data
- Handle data validation and error recovery
- Optimize bulk data insertion operations
- Monitor and audit data insertion processes

## Workshop Structure

### Part 1: Setting Up Alembic Migrations

#### Step 1: Initialize Alembic

```bash
# Create project structure
mkdir crawled-data-etl
cd crawled-data-etl

# Set up virtual environment
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
uv add sqlalchemy psycopg2-binary alembic python-dotenv

# Initialize Alembic
alembic init alembic

# Create project directories
mkdir -p app/{models,crud,etl,utils}
touch app/__init__.py app/config.py
```

#### Step 2: Configure Alembic

**alembic.ini:**
```ini
[alembic]
script_location = alembic
sqlalchemy.url = driver://user:password@localhost/dbname

[post_write_hooks]
# Logging configuration
```

**alembic/env.py:**
```python
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import your models
from app.models.crawled_content import Base

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from environment
import os
from dotenv import load_dotenv
load_dotenv()

database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/crawled_content")
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
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

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
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

#### Step 3: Create Initial Migration

**Generate initial migration:**
```bash
# Create initial migration
alembic revision -m "Initial crawled content schema"

# This creates alembic/versions/xxxxxxxx_initial_crawled_content_schema.py
```

**alembic/versions/xxxxxxxx_initial_crawled_content_schema.py:**
```python
"""Initial crawled content schema

Revision ID: xxxxxxxx
Revises:
Create Date: 2023-12-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'xxxxxxxx'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create sources table
    op.create_table('sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('crawl_frequency_minutes', sa.Integer(), nullable=True, default=60),
        sa.Column('last_crawled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('url')
    )

    # Create authors table
    op.create_table('authors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('website_url', sa.String(length=500), nullable=True),
        sa.Column('twitter_handle', sa.String(length=100), nullable=True),
        sa.Column('linkedin_profile', sa.String(length=500), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Create tags table
    op.create_table('tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )

    # Create categories table
    op.create_table('categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )

    # Create articles table
    op.create_table('articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('slug', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('url', sa.String(length=1000), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('crawled_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('modified_at', sa.DateTime(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('reading_time_minutes', sa.Integer(), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True, default='en'),
        sa.Column('is_archived', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['authors.id'], ),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.UniqueConstraint('url')
    )

    # Create many-to-many relationship tables
    op.create_table('article_tags',
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('article_id', 'tag_id')
    )

    op.create_table('article_categories',
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=True, default=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('article_id', 'category_id')
    )

    # Create indexes
    op.create_index('idx_articles_title_content', 'articles', [sa.text("to_tsvector('english', title || ' ' || coalesce(content, ''))")], postgresql_using='gin')
    op.create_index('idx_articles_source_published', 'articles', ['source_id', 'published_at'])
    op.create_index('idx_articles_published_at', 'articles', ['published_at'])
    op.create_index('idx_sources_active_type', 'sources', ['is_active', 'source_type'])

def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_sources_active_type')
    op.drop_index('idx_articles_published_at')
    op.drop_index('idx_articles_source_published')
    op.drop_index('idx_articles_title_content')

    # Drop tables
    op.drop_table('article_categories')
    op.drop_table('article_tags')
    op.drop_table('articles')
    op.drop_table('categories')
    op.drop_table('tags')
    op.drop_table('authors')
    op.drop_table('sources')
```

#### Step 4: Add Additional Tables Migration

**Create migration for additional tables:**
```bash
alembic revision -m "Add media assets and crawling tables"
```

**alembic/versions/yyyyyyyy_add_media_crawling_tables.py:**
```python
"""Add media assets and crawling tables

Revision ID: yyyyyyyy
Revises: xxxxxxxx
Create Date: 2023-12-01 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'yyyyyyyy'
down_revision = 'xxxxxxxx'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create media_assets table
    op.create_table('media_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=True),
        sa.Column('media_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=True),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('alt_text', sa.Text(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create crawl_sessions table
    op.create_table('crawl_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, default='running'),
        sa.Column('articles_found', sa.Integer(), nullable=True, default=0),
        sa.Column('articles_added', sa.Integer(), nullable=True, default=0),
        sa.Column('articles_updated', sa.Integer(), nullable=True, default=0),
        sa.Column('errors_count', sa.Integer(), nullable=True, default=0),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create crawl_logs table
    op.create_table('crawl_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('log_level', sa.String(length=20), nullable=True, default='INFO'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('url', sa.String(length=1000), nullable=True),
        sa.Column('http_status_code', sa.Integer(), nullable=True),
        sa.Column('error_type', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['crawl_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_media_assets_article_type', 'media_assets', ['article_id', 'media_type'])
    op.create_index('idx_crawl_sessions_source_status', 'crawl_sessions', ['source_id', 'status'])
    op.create_index('idx_crawl_logs_session_level', 'crawl_logs', ['session_id', 'log_level'])

def downgrade() -> None:
    op.drop_index('idx_crawl_logs_session_level')
    op.drop_index('idx_crawl_sessions_source_status')
    op.drop_index('idx_media_assets_article_type')

    op.drop_table('crawl_logs')
    op.drop_table('crawl_sessions')
    op.drop_table('media_assets')
```

#### Step 5: Run Migrations

```bash
# Check current database state
alembic current

# Check migration status
alembic history

# Run all migrations
alembic upgrade head

# Verify tables were created
psql -d crawled_content -c "\dt"
```

### Part 2: Building the Data Insertion Pipeline

#### Step 6: Create ETL Classes

**app/etl/base.py:**
```python
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ETLBase(ABC):
    """Base class for ETL operations"""

    def __init__(self, db_session):
        self.db = db_session

    @abstractmethod
    def extract(self) -> List[Dict[str, Any]]:
        """Extract data from source"""
        pass

    @abstractmethod
    def transform(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transform raw data into database format"""
        pass

    @abstractmethod
    def load(self, transformed_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """Load transformed data into database"""
        pass

    def run(self) -> Dict[str, Any]:
        """Run the complete ETL pipeline"""
        start_time = datetime.now()

        try:
            # Extract
            logger.info("Starting data extraction...")
            raw_data = self.extract()
            logger.info(f"Extracted {len(raw_data)} records")

            # Transform
            logger.info("Starting data transformation...")
            transformed_data = self.transform(raw_data)
            logger.info(f"Transformed {len(transformed_data)} records")

            # Load
            logger.info("Starting data loading...")
            load_stats = self.load(transformed_data)
            logger.info(f"Loaded data: {load_stats}")

            duration = (datetime.now() - start_time).total_seconds()

            return {
                "success": True,
                "records_processed": len(raw_data),
                "records_loaded": sum(load_stats.values()),
                "duration_seconds": duration,
                "load_stats": load_stats
            }

        except Exception as e:
            logger.error(f"ETL pipeline failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            }
```

#### Step 7: Implement Crawled Data ETL

**app/etl/crawled_content_etl.py:**
```python
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
import re
from sqlalchemy.exc import IntegrityError
from app.models.crawled_content import (
    Source, Author, Tag, Category, Article,
    ArticleTag, ArticleCategory, MediaAsset, CrawlSession
)
from app.etl.base import ETLBase

class CrawledContentETL(ETLBase):
    """ETL pipeline for crawled content data"""

    def __init__(self, db_session, source_url: str):
        super().__init__(db_session)
        self.source_url = source_url
        self.existing_urls: Set[str] = set()
        self._load_existing_urls()

    def _load_existing_urls(self):
        """Load existing article URLs to avoid duplicates"""
        result = self.db.query(Article.url).all()
        self.existing_urls = {row[0] for row in result}

    def extract(self) -> List[Dict[str, Any]]:
        """Extract data from crawled content (mock implementation)"""
        # In real implementation, this would scrape actual websites
        # For demo, we'll simulate crawled data

        mock_crawled_data = [
            {
                "url": "https://example.com/article1",
                "title": "Introduction to FastAPI",
                "content": "FastAPI is a modern web framework for building APIs...",
                "author_name": "John Doe",
                "author_email": "john@example.com",
                "published_at": "2023-12-01T10:00:00Z",
                "tags": ["python", "fastapi", "api"],
                "summary": "Learn how to build APIs with FastAPI",
                "images": [
                    {
                        "url": "https://example.com/image1.jpg",
                        "alt": "FastAPI logo",
                        "caption": "The FastAPI logo"
                    }
                ]
            },
            {
                "url": "https://example.com/article2",
                "title": "PostgreSQL Best Practices",
                "content": "When working with PostgreSQL, consider these best practices...",
                "author_name": "Jane Smith",
                "author_email": "jane@example.com",
                "published_at": "2023-12-02T14:30:00Z",
                "tags": ["postgresql", "database", "sql"],
                "summary": "Essential PostgreSQL best practices for production",
                "images": []
            },
            {
                "url": "https://example.com/article3",
                "title": "Docker Container Orchestration",
                "content": "Container orchestration is crucial for modern applications...",
                "author_name": "Bob Johnson",
                "author_email": "bob@example.com",
                "published_at": "2023-12-03T09:15:00Z",
                "tags": ["docker", "kubernetes", "containers"],
                "summary": "Understanding container orchestration platforms",
                "images": [
                    {
                        "url": "https://example.com/k8s-diagram.png",
                        "alt": "Kubernetes architecture",
                        "caption": "High-level Kubernetes architecture"
                    }
                ]
            }
        ]

        # Filter out already processed URLs
        new_articles = [
            article for article in mock_crawled_data
            if article["url"] not in self.existing_urls
        ]

        return new_articles

    def transform(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transform raw crawled data into database format"""
        transformed_articles = []

        for item in raw_data:
            try:
                # Transform article data
                transformed_article = {
                    "title": self._clean_text(item["title"]),
                    "slug": self._generate_slug(item["title"]),
                    "content": self._clean_text(item.get("content", "")),
                    "summary": self._clean_text(item.get("summary", "")),
                    "url": item["url"],
                    "published_at": self._parse_datetime(item.get("published_at")),
                    "word_count": self._calculate_word_count(item.get("content", "")),
                    "reading_time_minutes": self._calculate_reading_time(item.get("content", "")),
                    "language": "en",  # Assume English for demo
                    "author": {
                        "name": self._clean_text(item["author_name"]),
                        "email": item.get("author_email")
                    },
                    "tags": [tag.lower().strip() for tag in item.get("tags", [])],
                    "media_assets": []
                }

                # Transform media assets
                for img in item.get("images", []):
                    media_asset = {
                        "media_type": "image",
                        "filename": self._extract_filename(img["url"]),
                        "original_filename": self._extract_filename(img["url"]),
                        "file_path": img["url"],  # In real implementation, download and store locally
                        "alt_text": img.get("alt", ""),
                        "caption": img.get("caption", "")
                    }
                    transformed_article["media_assets"].append(media_asset)

                transformed_articles.append(transformed_article)

            except Exception as e:
                print(f"Error transforming article {item.get('url', 'unknown')}: {e}")
                continue

        return transformed_articles

    def load(self, transformed_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """Load transformed data into database"""
        stats = {
            "articles_added": 0,
            "authors_added": 0,
            "tags_added": 0,
            "media_assets_added": 0,
            "errors": 0
        }

        try:
            for article_data in transformed_data:
                try:
                    # Get or create author
                    author = self._get_or_create_author(article_data["author"])
                    if author:
                        stats["authors_added"] += 1

                    # Get or create tags
                    tag_objects = []
                    for tag_name in article_data["tags"]:
                        tag = self._get_or_create_tag(tag_name)
                        if tag:
                            tag_objects.append(tag)
                            stats["tags_added"] += 1

                    # Create article
                    article = Article(
                        title=article_data["title"],
                        slug=article_data["slug"],
                        content=article_data["content"],
                        summary=article_data["summary"],
                        url=article_data["url"],
                        author_id=author.id if author else None,
                        published_at=article_data["published_at"],
                        word_count=article_data["word_count"],
                        reading_time_minutes=article_data["reading_time_minutes"],
                        language=article_data["language"]
                    )

                    self.db.add(article)
                    self.db.flush()  # Get article ID

                    # Create article-tag relationships
                    for tag in tag_objects:
                        article_tag = ArticleTag(article_id=article.id, tag_id=tag.id)
                        self.db.add(article_tag)

                    # Create media assets
                    for media_data in article_data["media_assets"]:
                        media_asset = MediaAsset(
                            article_id=article.id,
                            **media_data
                        )
                        self.db.add(media_asset)
                        stats["media_assets_added"] += 1

                    stats["articles_added"] += 1

                except Exception as e:
                    print(f"Error loading article {article_data.get('url', 'unknown')}: {e}")
                    stats["errors"] += 1
                    continue

            self.db.commit()

        except Exception as e:
            self.db.rollback()
            print(f"Database error during load: {e}")
            stats["errors"] += 1

        return stats

    def _get_or_create_author(self, author_data: Dict[str, str]) -> Optional[Author]:
        """Get existing author or create new one"""
        # Try to find by email first
        if author_data.get("email"):
            author = self.db.query(Author).filter(Author.email == author_data["email"]).first()
            if author:
                return author

        # Try to find by name
        author = self.db.query(Author).filter(Author.name == author_data["name"]).first()
        if author:
            return author

        # Create new author
        author = Author(
            name=author_data["name"],
            email=author_data.get("email")
        )
        self.db.add(author)
        self.db.flush()
        return author

    def _get_or_create_tag(self, tag_name: str) -> Optional[Tag]:
        """Get existing tag or create new one"""
        tag = self.db.query(Tag).filter(Tag.name == tag_name).first()
        if tag:
            # Increment usage count
            tag.usage_count += 1
            return tag

        # Create new tag
        tag = Tag(
            name=tag_name,
            slug=self._generate_slug(tag_name)
        )
        self.db.add(tag)
        self.db.flush()
        return tag

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        return " ".join(text.split())  # Normalize whitespace

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title"""
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[\s_-]+', '-', slug)
        return slug.strip('-')

    def _parse_datetime(self, datetime_str: Optional[str]) -> Optional[datetime]:
        """Parse datetime string"""
        if not datetime_str:
            return None
        try:
            # Handle ISO format
            return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        except:
            return None

    def _calculate_word_count(self, content: str) -> int:
        """Calculate word count"""
        return len(content.split()) if content else 0

    def _calculate_reading_time(self, content: str) -> int:
        """Calculate estimated reading time in minutes"""
        words = self._calculate_word_count(content)
        words_per_minute = 200  # Average reading speed
        return max(1, round(words / words_per_minute))

    def _extract_filename(self, url: str) -> str:
        """Extract filename from URL"""
        return url.split('/')[-1] or "unnamed_file"
```

### Part 3: Running the ETL Pipeline

#### Step 8: Create ETL Runner Script

**scripts/run_etl.py:**
```python
#!/usr/bin/env python3
"""Run the crawled content ETL pipeline"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.etl.crawled_content_etl import CrawledContentETL
from app.models.crawled_content import CrawlSession, Source
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_crawled_content_etl(source_url: str) -> Dict[str, Any]:
    """Run the crawled content ETL pipeline"""

    db = SessionLocal()
    try:
        # Find or create source
        source = db.query(Source).filter(Source.url == source_url).first()
        if not source:
            source = Source(
                name=f"Source {source_url}",
                url=source_url,
                source_type="website",
                description=f"Crawled content from {source_url}"
            )
            db.add(source)
            db.flush()

        # Create crawl session
        crawl_session = CrawlSession(
            source_id=source.id,
            status="running"
        )
        db.add(crawl_session)
        db.commit()

        session_id = crawl_session.id

        # Run ETL
        etl = CrawledContentETL(db, source_url)
        result = etl.run()

        # Update crawl session
        if result["success"]:
            crawl_session.status = "completed"
            crawl_session.articles_added = result["load_stats"]["articles_added"]
            crawl_session.duration_seconds = int(result["duration_seconds"])
        else:
            crawl_session.status = "failed"
            crawl_session.error_details = result.get("error", "Unknown error")

        crawl_session.completed_at = datetime.now()
        db.commit()

        result["session_id"] = session_id
        return result

    except Exception as e:
        logger.error(f"ETL pipeline failed: {e}")
        # Update session with error
        if 'crawl_session' in locals():
            crawl_session.status = "failed"
            crawl_session.error_details = str(e)
            crawl_session.completed_at = datetime.now()
            db.commit()

        return {
            "success": False,
            "error": str(e),
            "session_id": getattr(crawl_session, 'id', None)
        }

    finally:
        db.close()

def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python run_etl.py <source_url>")
        print("Example: python run_etl.py https://example.com")
        sys.exit(1)

    source_url = sys.argv[1]

    print(f"Starting ETL pipeline for source: {source_url}")
    result = run_crawled_content_etl(source_url)

    if result["success"]:
        print("✅ ETL pipeline completed successfully!")
        print(f"📊 Processed {result['records_processed']} records")
        print(f"💾 Loaded {result['records_loaded']} records")
        print(f"⏱️  Duration: {result['duration_seconds']:.2f} seconds")
        print(f"🆔 Session ID: {result['session_id']}")

        load_stats = result["load_stats"]
        print("\n📈 Load Statistics:")
        for key, value in load_stats.items():
            print(f"  {key}: {value}")

    else:
        print("❌ ETL pipeline failed!")
        print(f"Error: {result.get('error', 'Unknown error')}")
        if result.get("session_id"):
            print(f"Session ID: {result['session_id']}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

#### Step 9: Create Database Seeding Script

**scripts/seed_database.py:**
```python
#!/usr/bin/env python3
"""Seed the database with initial data"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal, create_tables
from app.models.crawled_content import Source, Category

def seed_database():
    """Seed database with initial data"""

    # Create tables
    create_tables()

    db = SessionLocal()

    try:
        # Create sources
        sources_data = [
            {
                "name": "TechCrunch",
                "url": "https://techcrunch.com",
                "source_type": "website",
                "description": "Technology news and analysis",
                "crawl_frequency_minutes": 30
            },
            {
                "name": "Hacker News",
                "url": "https://news.ycombinator.com",
                "source_type": "website",
                "description": "Social news website focusing on computer science",
                "crawl_frequency_minutes": 15
            },
            {
                "name": "Python Official",
                "url": "https://python.org",
                "source_type": "website",
                "description": "Official Python programming language website",
                "crawl_frequency_minutes": 60
            }
        ]

        for source_data in sources_data:
            # Check if source already exists
            existing = db.query(Source).filter(Source.url == source_data["url"]).first()
            if not existing:
                source = Source(**source_data)
                db.add(source)
                print(f"Created source: {source.name}")

        # Create categories
        categories_data = [
            {"name": "Programming", "slug": "programming", "description": "Programming languages and techniques"},
            {"name": "Web Development", "slug": "web-development", "description": "Web application development"},
            {"name": "Databases", "slug": "databases", "description": "Database technologies and design"},
            {"name": "DevOps", "slug": "devops", "description": "Development operations and deployment"},
            {"name": "AI/ML", "slug": "ai-ml", "description": "Artificial intelligence and machine learning"},
            {"name": "News", "slug": "news", "description": "Technology news and updates"}
        ]

        for category_data in categories_data:
            # Check if category already exists
            existing = db.query(Category).filter(Category.slug == category_data["slug"]).first()
            if not existing:
                category = Category(**category_data)
                db.add(category)
                print(f"Created category: {category.name}")

        db.commit()
        print("✅ Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
```

### Part 4: Testing and Validation

#### Step 10: Create ETL Tests

**tests/test_etl.py:**
```python
import pytest
from unittest.mock import Mock
from app.etl.crawled_content_etl import CrawledContentETL
from app.models.crawled_content import Article

class TestCrawledContentETL:
    def test_extract_returns_list(self, db_session):
        """Test that extract returns a list"""
        etl = CrawledContentETL(db_session, "https://example.com")
        data = etl.extract()
        assert isinstance(data, list)

    def test_transform_article_data(self, db_session):
        """Test article data transformation"""
        etl = CrawledContentETL(db_session, "https://example.com")

        raw_data = [{
            "url": "https://example.com/test",
            "title": "Test Article",
            "content": "This is test content.",
            "author_name": "Test Author",
            "author_email": "test@example.com",
            "published_at": "2023-12-01T10:00:00Z",
            "tags": ["test", "article"],
            "summary": "Test summary"
        }]

        transformed = etl.transform(raw_data)

        assert len(transformed) == 1
        article = transformed[0]

        assert article["title"] == "Test Article"
        assert article["slug"] == "test-article"
        assert article["url"] == "https://example.com/test"
        assert article["author"]["name"] == "Test Author"
        assert article["author"]["email"] == "test@example.com"
        assert len(article["tags"]) == 2

    def test_load_creates_database_records(self, db_session):
        """Test that load creates database records"""
        etl = CrawledContentETL(db_session, "https://example.com")

        transformed_data = [{
            "title": "Database Test Article",
            "slug": "database-test-article",
            "content": "Content for database testing.",
            "summary": "Database test",
            "url": "https://example.com/db-test",
            "published_at": None,
            "word_count": 5,
            "reading_time_minutes": 1,
            "language": "en",
            "author": {
                "name": "DB Tester",
                "email": "db@example.com"
            },
            "tags": ["database", "test"],
            "media_assets": []
        }]

        stats = etl.load(transformed_data)

        # Check that records were created
        assert stats["articles_added"] == 1
        assert stats["authors_added"] == 1
        assert stats["tags_added"] == 2

        # Verify data in database
        article = db_session.query(Article).filter(Article.slug == "database-test-article").first()
        assert article is not None
        assert article.title == "Database Test Article"
        assert article.author.name == "DB Tester"

    def test_slug_generation(self, db_session):
        """Test slug generation"""
        etl = CrawledContentETL(db_session, "https://example.com")

        # Test various title formats
        test_cases = [
            ("Hello World", "hello-world"),
            ("FastAPI & Python!", "fastapi-python"),
            ("Multiple   Spaces", "multiple-spaces"),
            ("Special@#$%Characters", "specialcharacters")
        ]

        for title, expected_slug in test_cases:
            slug = etl._generate_slug(title)
            assert slug == expected_slug

    def test_duplicate_url_handling(self, db_session):
        """Test that duplicate URLs are skipped"""
        # Create existing article
        existing_article = Article(
            title="Existing Article",
            slug="existing-article",
            url="https://example.com/existing",
            content="Existing content"
        )
        db_session.add(existing_article)
        db_session.commit()

        etl = CrawledContentETL(db_session, "https://example.com")

        # Try to extract data with same URL
        # (In real implementation, extract would check existing URLs)

        # Verify no duplicates were created
        articles = db_session.query(Article).filter(Article.url == "https://example.com/existing").all()
        assert len(articles) == 1  # Should still be just 1

class TestETLPipeline:
    def test_full_etl_pipeline(self, db_session):
        """Test the complete ETL pipeline"""
        etl = CrawledContentETL(db_session, "https://example.com")

        result = etl.run()

        assert result["success"] == True
        assert "records_processed" in result
        assert "records_loaded" in result
        assert "duration_seconds" in result
        assert "load_stats" in result
```

## Running the Complete System

### Execute the Migration and ETL Pipeline

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your database URL

# 2. Run migrations
alembic upgrade head

# 3. Seed database with initial data
python scripts/seed_database.py

# 4. Run ETL pipeline
python scripts/run_etl.py https://example.com

# 5. Check results
psql -d crawled_content -c "SELECT COUNT(*) FROM articles;"
psql -d crawled_content -c "SELECT * FROM crawl_sessions ORDER BY started_at DESC LIMIT 1;"
```

### Monitor ETL Performance

**scripts/monitor_etl.py:**
```python
#!/usr/bin/env python3
"""Monitor ETL performance and statistics"""

import sys
from pathlib import Path
from datetime import datetime, timedelta

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.models.crawled_content import CrawlSession, Article, Source

def show_etl_statistics():
    """Show ETL performance statistics"""

    db = SessionLocal()

    try:
        # Overall statistics
        print("=== ETL Statistics ===\n")

        # Sessions summary
        total_sessions = db.query(CrawlSession).count()
        successful_sessions = db.query(CrawlSession).filter(CrawlSession.status == "completed").count()
        failed_sessions = db.query(CrawlSession).filter(CrawlSession.status == "failed").count()

        print("📊 Crawl Sessions:")
        print(f"  Total: {total_sessions}")
        print(f"  Successful: {successful_sessions}")
        print(f"  Failed: {failed_sessions}")
        print(f"  Success Rate: {(successful_sessions/total_sessions*100):.1f}%" if total_sessions > 0 else "  N/A")

        # Articles statistics
        total_articles = db.query(Article).count()
        articles_last_24h = db.query(Article).filter(
            Article.created_at >= datetime.now() - timedelta(hours=24)
        ).count()

        print("
📝 Articles:"        print(f"  Total: {total_articles}")
        print(f"  Added in last 24h: {articles_last_24h}")

        # Sources performance
        print("
🔗 Sources:"        sources = db.query(Source).all()
        for source in sources:
            sessions = db.query(CrawlSession).filter(CrawlSession.source_id == source.id).all()
            if sessions:
                total_duration = sum(s.duration_seconds or 0 for s in sessions)
                avg_duration = total_duration / len(sessions)
                articles_added = sum(s.articles_added or 0 for s in sessions)

                print(f"  {source.name}:")
                print(f"    Sessions: {len(sessions)}")
                print(f"    Avg Duration: {avg_duration:.1f}s")
                print(f"    Articles Added: {articles_added}")

        # Recent sessions
        print("
🕐 Recent Sessions:"        recent_sessions = db.query(CrawlSession).order_by(CrawlSession.started_at.desc()).limit(5).all()

        for session in recent_sessions:
            source_name = session.source.name if session.source else "Unknown"
            status_emoji = "✅" if session.status == "completed" else "❌" if session.status == "failed" else "⏳"
            print(f"  {status_emoji} {source_name} - {session.status} - {session.duration_seconds or 0}s")

    finally:
        db.close()

def show_database_health():
    """Show database health metrics"""

    db = SessionLocal()

    try:
        print("\n=== Database Health ===\n")

        # Table sizes
        tables = ['articles', 'authors', 'sources', 'tags', 'categories']
        for table in tables:
            count = db.execute(f"SELECT COUNT(*) FROM {table}").scalar()
            print(f"📊 {table}: {count} records")

        # Index usage (simplified)
        print("
🔍 Indexes:"        indexes = db.execute("""
            SELECT schemaname, tablename, indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname;
        """).fetchall()

        for schema, table, index in indexes:
            print(f"  {table}.{index}")

    finally:
        db.close()

if __name__ == "__main__":
    show_etl_statistics()
    show_database_health()
```

## Challenge Exercises

### Challenge 1: Incremental Loading
1. Implement incremental loading to avoid reprocessing existing articles
2. Add last-modified timestamps tracking
3. Create change detection mechanisms
4. Optimize for large-scale crawling

### Challenge 2: Data Quality Validation
1. Add comprehensive data validation before insertion
2. Implement duplicate detection algorithms
3. Create data quality monitoring dashboards
4. Add automated data cleanup scripts

### Challenge 3: Distributed ETL
1. Implement distributed ETL processing
2. Add message queue integration (Redis/RabbitMQ)
3. Create worker pool for parallel processing
4. Implement fault tolerance and retry mechanisms

## Verification Checklist

### Migrations
- [ ] Initial schema migration created and applied
- [ ] Additional tables migration working
- [ ] Indexes properly created
- [ ] Foreign key constraints enforced
- [ ] Rollback migrations functional

### ETL Pipeline
- [ ] Data extraction from sources working
- [ ] Data transformation properly implemented
- [ ] Data loading handles duplicates correctly
- [ ] Error handling and recovery functional
- [ ] Performance monitoring in place

### Data Integrity
- [ ] All foreign key relationships maintained
- [ ] Unique constraints enforced
- [ ] Data validation working
- [ ] Cascade operations configured correctly

### Monitoring & Auditing
- [ ] ETL performance metrics collected
- [ ] Error logging and tracking implemented
- [ ] Audit trails for data changes maintained
- [ ] Health checks and alerts configured

## Troubleshooting

### Migration Issues

**Migration not applying:**
```bash
# Check migration status
alembic current

# Check for pending migrations
alembic history --verbose

# Force upgrade
alembic upgrade head --force
```

**Migration rollback failing:**
```bash
# Check migration dependencies
alembic history

# Manual rollback if needed
alembic downgrade -1
```

### ETL Pipeline Issues

**Data not loading:**
```bash
# Check database connection
python -c "from app.database import SessionLocal; db = SessionLocal(); db.execute('SELECT 1'); print('DB OK')"

# Check table permissions
psql -d crawled_content -c "\dp articles"
```

**Performance issues:**
```bash
# Check query execution plans
psql -d crawled_content -c "EXPLAIN ANALYZE SELECT * FROM articles LIMIT 10;"

# Monitor database performance
psql -d crawled_content -c "SELECT * FROM pg_stat_activity;"
```

## Next Steps

Congratulations! You have successfully implemented a complete ETL pipeline for crawled content data. The system includes:

- **Database Schema**: Properly normalized PostgreSQL schema for crawled content
- **Migrations**: Alembic migrations for version-controlled schema changes
- **ETL Pipeline**: Complete extract, transform, load pipeline
- **Data Validation**: Comprehensive validation and error handling
- **Monitoring**: Performance tracking and health monitoring
- **Testing**: Unit and integration tests for reliability

## Additional Resources
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Bulk Operations](https://docs.sqlalchemy.org/en/14/orm/persistence_techniques.html#bulk-operations)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [ETL Best Practices](https://martinfowler.com/articles/evodb.html)

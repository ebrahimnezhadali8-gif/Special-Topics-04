# Workshop 02: Crawled Data Schema Design

## Overview
This workshop focuses on designing a normalized database schema specifically for storing crawled/scraped content. You'll analyze typical web scraping data structures, design tables for articles, authors, sources, and metadata, and implement the schema using SQLAlchemy with proper relationships and constraints.

## Prerequisites
- Completed [Basic Schema Design Workshop](../workshops/workshop-01-basic-schema-design.md)
- Understanding of relational database design and normalization
- Familiarity with web scraping concepts

## Learning Objectives
By the end of this workshop, you will be able to:
- Design schemas for real-world web scraping data
- Implement proper normalization for crawled content
- Handle complex relationships between articles, sources, and metadata
- Design for scalability and performance
- Create migration scripts for production deployment

## Workshop Structure

### Part 1: Analyzing Crawled Data Requirements

#### Step 1: Understanding Crawled Content

Typical web scraping data includes:
- **Articles/Content**: Title, body, summary, publication date, author
- **Sources**: Websites, RSS feeds, APIs, social media platforms
- **Authors**: Names, bios, social profiles, contact information
- **Metadata**: Tags, categories, keywords, language, reading time
- **Media**: Images, videos, documents associated with articles
- **Relationships**: Citations, related articles, social shares
- **Crawling Metadata**: Crawl timestamps, success/failure status, HTTP status codes

#### Step 2: Data Analysis and Normalization

**First Normal Form (1NF)**: Eliminate repeating groups
```
Raw Data:
{
  "title": "FastAPI Tutorial",
  "content": "...",
  "author": "John Doe",
  "tags": ["python", "fastapi", "web"],
  "categories": ["tutorials", "backend"]
}

Normalized:
articles: id, title, content, author_id
authors: id, name, bio
tags: id, name
categories: id, name
article_tags: article_id, tag_id
article_categories: article_id, category_id
```

**Second Normal Form (2NF)**: Remove partial dependencies
```
Before:
articles: id, title, content, author_name, author_email, author_bio

After:
articles: id, title, content, author_id
authors: id, name, email, bio
```

**Third Normal Form (3NF)**: Remove transitive dependencies
```
Before:
articles: id, title, content, author_id, author_name, author_email

After:
articles: id, title, content, author_id
authors: id, name, email
```

### Part 2: Designing the Crawled Content Schema

#### Step 3: Core Tables Design

**sources** - Information about content sources
```sql
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL, -- 'website', 'rss', 'api', 'social'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    crawl_frequency_minutes INTEGER DEFAULT 60,
    last_crawled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**authors** - Content authors and creators
```sql
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    bio TEXT,
    website_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    linkedin_profile VARCHAR(500),
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**articles** - Main content table
```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT,
    summary TEXT,
    url VARCHAR(1000) UNIQUE NOT NULL,
    source_id INTEGER REFERENCES sources(id),
    author_id INTEGER REFERENCES authors(id),
    published_at TIMESTAMP,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    language VARCHAR(10) DEFAULT 'en',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Step 4: Metadata and Classification Tables

**tags** - Content categorization tags
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**categories** - Hierarchical content categories
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**article_tags** - Many-to-many relationship between articles and tags
```sql
CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id)
);
```

**article_categories** - Many-to-many relationship between articles and categories
```sql
CREATE TABLE article_categories (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, category_id)
);
```

#### Step 5: Media and Assets Tables

**media_assets** - Images, videos, and other media associated with articles
```sql
CREATE TABLE media_assets (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'document', 'audio'
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(1000) NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration_seconds INTEGER, -- For videos/audio
    alt_text TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Step 6: Crawling and Audit Tables

**crawl_sessions** - Track crawling sessions and their results
```sql
CREATE TABLE crawl_sessions (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES sources(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
    articles_found INTEGER DEFAULT 0,
    articles_added INTEGER DEFAULT 0,
    articles_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    duration_seconds INTEGER
);
```

**crawl_logs** - Detailed logging of crawl operations
```sql
CREATE TABLE crawl_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(id),
    log_level VARCHAR(20) DEFAULT 'INFO', -- 'DEBUG', 'INFO', 'WARNING', 'ERROR'
    message TEXT NOT NULL,
    url VARCHAR(1000),
    http_status_code INTEGER,
    error_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Part 3: Implementing the Schema with SQLAlchemy

#### Step 7: SQLAlchemy Models

**app/models/crawled_content.py:**
```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    source_type = Column(String(50), nullable=False)  # 'website', 'rss', 'api', 'social'
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    crawl_frequency_minutes = Column(Integer, default=60)
    last_crawled_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    articles = relationship("Article", back_populates="source")

class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True)
    bio = Column(Text)
    website_url = Column(String(500))
    twitter_handle = Column(String(100))
    linkedin_profile = Column(String(500))
    avatar_url = Column(String(500))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    articles = relationship("Article", back_populates="author")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    color = Column(String(7))
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    articles = relationship("ArticleTag", back_populates="tag")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("categories.id"))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    parent = relationship("Category", remote_side=[id])
    children = relationship("Category")
    articles = relationship("ArticleCategory", back_populates="category")

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), nullable=False, unique=True)
    content = Column(Text)
    summary = Column(Text)
    url = Column(String(1000), nullable=False, unique=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    author_id = Column(Integer, ForeignKey("authors.id"))
    published_at = Column(DateTime)
    crawled_at = Column(DateTime, server_default=func.now())
    modified_at = Column(DateTime)
    word_count = Column(Integer)
    reading_time_minutes = Column(Integer)
    language = Column(String(10), default='en')
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    source = relationship("Source", back_populates="articles")
    author = relationship("Author", back_populates="articles")
    tags = relationship("ArticleTag", back_populates="article")
    categories = relationship("ArticleCategory", back_populates="article")
    media_assets = relationship("MediaAsset", back_populates="article")

class ArticleTag(Base):
    __tablename__ = "article_tags"

    article_id = Column(Integer, ForeignKey("articles.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
    added_at = Column(DateTime, server_default=func.now())

    # Relationships
    article = relationship("Article", back_populates="tags")
    tag = relationship("Tag", back_populates="articles")

class ArticleCategory(Base):
    __tablename__ = "article_categories"

    article_id = Column(Integer, ForeignKey("articles.id"), primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), primary_key=True)
    is_primary = Column(Boolean, default=False)
    added_at = Column(DateTime, server_default=func.now())

    # Relationships
    article = relationship("Article", back_populates="categories")
    category = relationship("Category", back_populates="articles")

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    media_type = Column(String(50), nullable=False)  # 'image', 'video', 'document', 'audio'
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_path = Column(String(1000), nullable=False)
    file_size_bytes = Column(Integer)
    mime_type = Column(String(100))
    width = Column(Integer)
    height = Column(Integer)
    duration_seconds = Column(Integer)
    alt_text = Column(Text)
    caption = Column(Text)
    sort_order = Column(Integer, default=0)
    uploaded_at = Column(DateTime, server_default=func.now())

    # Relationships
    article = relationship("Article", back_populates="media_assets")

class CrawlSession(Base):
    __tablename__ = "crawl_sessions"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)
    status = Column(String(50), default='running')  # 'running', 'completed', 'failed'
    articles_found = Column(Integer, default=0)
    articles_added = Column(Integer, default=0)
    articles_updated = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    error_details = Column(Text)
    duration_seconds = Column(Integer)

    # Relationships
    source = relationship("Source")
    logs = relationship("CrawlLog", back_populates="session")

class CrawlLog(Base):
    __tablename__ = "crawl_logs"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("crawl_sessions.id"))
    log_level = Column(String(20), default='INFO')  # 'DEBUG', 'INFO', 'WARNING', 'ERROR'
    message = Column(Text, nullable=False)
    url = Column(String(1000))
    http_status_code = Column(Integer)
    error_type = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    session = relationship("CrawlSession", back_populates="logs")
```

### Part 4: Implementing Indexes for Performance

#### Step 8: Database Indexes

**Create indexes for optimal query performance:**
```sql
-- Full-text search indexes
CREATE INDEX idx_articles_title_content ON articles USING gin(to_tsvector('english', title || ' ' || coalesce(content, '')));
CREATE INDEX idx_articles_summary ON articles USING gin(to_tsvector('english', coalesce(summary, '')));

-- Foreign key indexes (automatically created by PostgreSQL for foreign keys)

-- Composite indexes for common queries
CREATE INDEX idx_articles_source_published ON articles(source_id, published_at DESC);
CREATE INDEX idx_articles_author_published ON articles(author_id, published_at DESC);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_articles_crawled_at ON articles(crawled_at DESC);

-- Tag and category lookup indexes
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX idx_article_categories_category_id ON article_categories(category_id);

-- Source and author indexes
CREATE INDEX idx_sources_active_type ON sources(is_active, source_type);
CREATE INDEX idx_authors_verified_name ON authors(is_verified, name);

-- Media assets indexes
CREATE INDEX idx_media_assets_article_type ON media_assets(article_id, media_type);

-- Crawling indexes
CREATE INDEX idx_crawl_sessions_source_status ON crawl_sessions(source_id, status);
CREATE INDEX idx_crawl_sessions_started ON crawl_sessions(started_at DESC);
CREATE INDEX idx_crawl_logs_session_level ON crawl_logs(session_id, log_level);
CREATE INDEX idx_crawl_logs_created ON crawl_logs(created_at DESC);
```

### Part 5: Creating Sample Data

#### Step 9: Sample Data Insertion

**Create sample data to test the schema:**
```python
from app.models.crawled_content import (
    Source, Author, Tag, Category, Article,
    ArticleTag, ArticleCategory, MediaAsset, CrawlSession
)
from app.database import SessionLocal
from datetime import datetime, timedelta
import random

def create_sample_data():
    """Create sample data for testing the crawled content schema"""
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
                "name": "Python Feed",
                "url": "https://python.org/rss",
                "source_type": "rss",
                "description": "Official Python RSS feed",
                "crawl_frequency_minutes": 60
            }
        ]

        sources = []
        for source_data in sources_data:
            source = Source(**source_data)
            db.add(source)
            sources.append(source)

        db.flush()

        # Create authors
        authors_data = [
            {
                "name": "Sarah Johnson",
                "email": "sarah.johnson@techcrunch.com",
                "bio": "Senior technology reporter covering AI and machine learning",
                "twitter_handle": "@sarahjtech",
                "is_verified": True
            },
            {
                "name": "Mike Chen",
                "email": "mike.chen@hackernews.io",
                "bio": "Software engineer and tech blogger",
                "website_url": "https://mikechen.dev",
                "is_verified": False
            },
            {
                "name": "Python Core Team",
                "email": "team@python.org",
                "bio": "Official Python programming language development team",
                "website_url": "https://python.org",
                "is_verified": True
            }
        ]

        authors = []
        for author_data in authors_data:
            author = Author(**author_data)
            db.add(author)
            authors.append(author)

        db.flush()

        # Create tags
        tags_data = [
            {"name": "Python", "slug": "python", "description": "Python programming language"},
            {"name": "FastAPI", "slug": "fastapi", "description": "Modern Python web framework"},
            {"name": "Machine Learning", "slug": "machine-learning", "description": "AI and ML technologies"},
            {"name": "Web Development", "slug": "web-development", "description": "Web application development"},
            {"name": "Database", "slug": "database", "description": "Database technologies and design"}
        ]

        tags = []
        for tag_data in tags_data:
            tag = Tag(**tag_data)
            db.add(tag)
            tags.append(tag)

        db.flush()

        # Create categories
        categories_data = [
            {"name": "Tutorials", "slug": "tutorials", "description": "How-to guides and tutorials"},
            {"name": "News", "slug": "news", "description": "Latest technology news"},
            {"name": "Programming", "slug": "programming", "description": "Programming languages and techniques"},
            {"name": "AI/ML", "slug": "ai-ml", "description": "Artificial intelligence and machine learning"}
        ]

        categories = []
        for category_data in categories_data:
            category = Category(**category_data)
            db.add(category)
            categories.append(category)

        db.flush()

        # Create articles
        articles_data = [
            {
                "title": "Building APIs with FastAPI: A Complete Guide",
                "slug": "building-apis-fastapi-complete-guide",
                "content": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+...",
                "summary": "Learn how to build robust APIs with FastAPI, including validation, documentation, and deployment.",
                "url": "https://techcrunch.com/building-apis-fastapi-guide",
                "source_id": sources[0].id,
                "author_id": authors[0].id,
                "published_at": datetime.now() - timedelta(days=1),
                "word_count": 2500,
                "reading_time_minutes": 12,
                "language": "en"
            },
            {
                "title": "Python 3.12 Released: What's New",
                "slug": "python-3-12-released-whats-new",
                "content": "The Python Software Foundation has released Python 3.12 with several new features...",
                "summary": "Explore the new features and improvements in Python 3.12.",
                "url": "https://python.org/news/python-3-12-released",
                "source_id": sources[2].id,
                "author_id": authors[2].id,
                "published_at": datetime.now() - timedelta(hours=6),
                "word_count": 800,
                "reading_time_minutes": 4,
                "language": "en"
            },
            {
                "title": "Machine Learning in Production: Best Practices",
                "slug": "ml-production-best-practices",
                "content": "Deploying machine learning models to production requires careful consideration...",
                "summary": "Essential best practices for deploying ML models in production environments.",
                "url": "https://hackernews.io/ml-production-practices",
                "source_id": sources[1].id,
                "author_id": authors[1].id,
                "published_at": datetime.now() - timedelta(hours=12),
                "word_count": 1800,
                "reading_time_minutes": 9,
                "language": "en"
            }
        ]

        articles = []
        for article_data in articles_data:
            article = Article(**article_data)
            db.add(article)
            articles.append(article)

        db.flush()

        # Create article-tag relationships
        article_tags_data = [
            (articles[0].id, tags[0].id),  # FastAPI article -> Python
            (articles[0].id, tags[1].id),  # FastAPI article -> FastAPI
            (articles[0].id, tags[3].id),  # FastAPI article -> Web Development
            (articles[1].id, tags[0].id),  # Python article -> Python
            (articles[2].id, tags[2].id),  # ML article -> Machine Learning
            (articles[2].id, tags[4].id),  # ML article -> Database
        ]

        for article_id, tag_id in article_tags_data:
            article_tag = ArticleTag(article_id=article_id, tag_id=tag_id)
            db.add(article_tag)

        # Create article-category relationships
        article_categories_data = [
            (articles[0].id, categories[0].id, True),   # FastAPI -> Tutorials (primary)
            (articles[0].id, categories[2].id, False),  # FastAPI -> Programming
            (articles[1].id, categories[1].id, True),   # Python -> News (primary)
            (articles[1].id, categories[2].id, False),  # Python -> Programming
            (articles[2].id, categories[3].id, True),   # ML -> AI/ML (primary)
        ]

        for article_id, category_id, is_primary in article_categories_data:
            article_category = ArticleCategory(
                article_id=article_id,
                category_id=category_id,
                is_primary=is_primary
            )
            db.add(article_category)

        # Create media assets
        media_assets_data = [
            {
                "article_id": articles[0].id,
                "media_type": "image",
                "filename": "fastapi-logo.png",
                "original_filename": "fastapi-logo.png",
                "file_path": "/uploads/images/fastapi-logo.png",
                "file_size_bytes": 12543,
                "mime_type": "image/png",
                "width": 400,
                "height": 200,
                "alt_text": "FastAPI logo",
                "sort_order": 1
            }
        ]

        for media_data in media_assets_data:
            media_asset = MediaAsset(**media_data)
            db.add(media_asset)

        # Create a crawl session
        crawl_session = CrawlSession(
            source_id=sources[0].id,
            completed_at=datetime.now(),
            status="completed",
            articles_found=15,
            articles_added=3,
            articles_updated=2,
            duration_seconds=45
        )
        db.add(crawl_session)

        db.commit()
        print("Sample data created successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()
```

### Part 6: Testing the Schema

#### Step 10: Schema Validation Queries

**Test queries to validate the schema design:**
```sql
-- Test article queries with joins
SELECT
    a.title,
    a.slug,
    s.name as source_name,
    auth.name as author_name,
    a.published_at,
    array_agg(DISTINCT t.name) as tags,
    array_agg(DISTINCT c.name) as categories
FROM articles a
LEFT JOIN sources s ON a.source_id = s.id
LEFT JOIN authors auth ON a.author_id = auth.id
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
LEFT JOIN article_categories ac ON a.id = ac.article_id
LEFT JOIN categories c ON ac.category_id = c.id
GROUP BY a.id, s.name, auth.name
ORDER BY a.published_at DESC;

-- Test full-text search
SELECT title, summary
FROM articles
WHERE to_tsvector('english', title || ' ' || coalesce(content, ''))
@@ plainto_tsquery('english', 'fastapi tutorial');

-- Test crawling statistics
SELECT
    s.name as source_name,
    COUNT(a.id) as total_articles,
    AVG(a.word_count) as avg_word_count,
    MAX(a.published_at) as latest_article
FROM sources s
LEFT JOIN articles a ON s.id = a.source_id
GROUP BY s.id, s.name;

-- Test performance with indexes
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE published_at >= '2023-12-01'
ORDER BY published_at DESC;
```

## Challenge Exercises

### Challenge 1: Add Social Features
1. Create tables for user comments and reactions
2. Implement article bookmarking and sharing
3. Add user following and recommendation system
4. Design notification system for new content

### Challenge 2: Implement Content Versioning
1. Add version control for article edits
2. Track changes and provide diff functionality
3. Implement rollback capabilities
4. Add editorial workflow management

### Challenge 3: Analytics and Reporting
1. Create tables for article view tracking
2. Implement user engagement metrics
3. Add content performance analytics
4. Design reporting queries and views

## Verification Checklist

### Schema Design
- [ ] All tables created with proper constraints
- [ ] Relationships established correctly
- [ ] Normalization principles applied
- [ ] Indexes created for performance
- [ ] Data types chosen appropriately

### SQLAlchemy Implementation
- [ ] All models defined with correct relationships
- [ ] Foreign keys and constraints implemented
- [ ] Indexes defined in models
- [ ] Sample data created successfully

### Query Performance
- [ ] Complex joins execute efficiently
- [ ] Full-text search working
- [ ] Aggregation queries performant
- [ ] Index usage verified with EXPLAIN

### Data Integrity
- [ ] Foreign key constraints enforced
- [ ] Unique constraints working
- [ ] Check constraints implemented
- [ ] Cascade operations configured

## Next Steps
- [Workshop: Migrations and Data Insertion](../workshops/workshop-03-migrations-insert-data.md)
- [Alembic Migrations Tutorial](../tutorials/06-alembic-migrations.md)

## Additional Resources
- [PostgreSQL Schema Design](https://www.postgresql.org/docs/current/ddl.html)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [SQLAlchemy Relationships](https://docs.sqlalchemy.org/en/14/orm/relationships.html)
- [Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)

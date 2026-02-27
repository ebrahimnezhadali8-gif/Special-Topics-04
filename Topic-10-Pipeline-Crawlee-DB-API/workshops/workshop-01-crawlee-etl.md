# Workshop 01: Complete Crawlee ETL Pipeline

## Overview
This workshop implements a complete ETL (Extract, Transform, Load) pipeline using Crawlee for web scraping, PostgreSQL for data storage, and FastAPI for data exposure. You'll build an end-to-end system that crawls articles, processes the data, stores it in a database, and provides search capabilities through a REST API.

## Prerequisites
- Completed ETL Design tutorial ([Tutorial 01](../tutorials/01-etl-pipeline-design.md))
- Understanding of Crawlee, PostgreSQL, and FastAPI
- Node.js and Python environments set up

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement a complete ETL pipeline with Crawlee
- Integrate data processing and validation
- Store crawled data in PostgreSQL with proper indexing
- Build a search API using FastAPI
- Monitor pipeline performance and handle errors

## Workshop Structure

### Part 1: Project Setup

#### Step 1: Create Project Structure

```bash
mkdir crawlee-etl-pipeline
cd crawlee-etl-pipeline

# Create main directories
mkdir -p crawlers processors database api tests config

# Create subdirectories
mkdir -p crawlers/sources crawlers/extractors
mkdir -p processors/validators processors/transformers
mkdir -p database/models database/migrations
mkdir -p api/routes api/schemas
mkdir -p tests/unit tests/integration

# Initialize files
touch README.md requirements.txt docker-compose.yml
touch config/settings.py config/logging.py
```

#### Step 2: Set Up Environment

**requirements.txt:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic[email]==2.5.0
python-multipart==0.0.6
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
redis==5.0.1
structlog==23.2.0
prometheus-client==0.19.0
```

**config/settings.py:**
```python
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/crawlee_etl")

    # Redis (optional, for caching)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # API
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))

    # Crawler
    max_concurrent_crawlers: int = int(os.getenv("MAX_CONCURRENT_CRAWLERS", "3"))
    crawler_timeout: int = int(os.getenv("CRAWLER_TIMEOUT", "30"))
    max_pages_per_source: int = int(os.getenv("MAX_PAGES_PER_SOURCE", "100"))

    # Processing
    batch_size: int = int(os.getenv("BATCH_SIZE", "50"))
    processing_workers: int = int(os.getenv("PROCESSING_WORKERS", "4"))

    # Monitoring
    enable_prometheus: bool = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"

settings = Settings()
```

### Part 2: Database Schema

#### Step 3: Create Database Models

**database/models/article.py:**
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import TSVECTOR

Base = declarative_base()

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    source_type = Column(String(50), nullable=False)  # 'website', 'rss', 'api'
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    crawl_frequency_minutes = Column(Integer, default=60)
    last_crawled_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    articles = relationship("Article", back_populates="source", cascade="all, delete-orphan")

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), nullable=False, unique=True)
    content = Column(Text)
    summary = Column(Text)
    url = Column(String(1000), nullable=False, unique=True)
    canonical_url = Column(String(1000))
    source_id = Column(Integer, ForeignKey("sources.id"))
    author = Column(String(255))
    published_at = Column(DateTime)
    crawled_at = Column(DateTime, server_default=func.now())
    modified_at = Column(DateTime)
    word_count = Column(Integer)
    reading_time_minutes = Column(Integer)
    language = Column(String(10), default='en')
    is_archived = Column(Boolean, default=False)

    # Search vector for full-text search
    search_vector = Column(TSVECTOR)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    source = relationship("Source", back_populates="articles")
    tags = relationship("ArticleTag", back_populates="article", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_articles_source_published', 'source_id', 'published_at'),
        Index('idx_articles_published_at', 'published_at'),
        Index('idx_articles_crawled_at', 'crawled_at'),
        Index('idx_articles_search_vector', 'search_vector', postgresql_using='gin'),
    )

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    color = Column(String(7), default="#6b7280")
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    articles = relationship("ArticleTag", back_populates="tag")

class ArticleTag(Base):
    __tablename__ = "article_tags"

    article_id = Column(Integer, ForeignKey("articles.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
    added_at = Column(DateTime, server_default=func.now())

    # Relationships
    article = relationship("Article", back_populates="tags")
    tag = relationship("Tag", back_populates="articles")

class CrawlSession(Base):
    __tablename__ = "crawl_sessions"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    session_id = Column(String(100), unique=True)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)
    status = Column(String(50), default='running')  # 'running', 'completed', 'failed'
    pages_requested = Column(Integer, default=0)
    pages_successful = Column(Integer, default=0)
    articles_found = Column(Integer, default=0)
    articles_added = Column(Integer, default=0)
    articles_updated = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    error_details = Column(Text)
    duration_seconds = Column(Integer)

    # Relationships
    source = relationship("Source")
```

### Part 3: Crawlee Implementation

#### Step 4: Create Crawlee Crawler

**crawlers/article_crawler.js:**
```javascript
const { CheerioCrawler, Dataset, log } = require('crawlee');
const axios = require('axios');

class ArticleCrawler {
    constructor(sourceConfig) {
        this.sourceConfig = sourceConfig;
        this.crawler = new CheerioCrawler({
            maxRequestsPerCrawl: sourceConfig.maxPages || 100,
            maxConcurrency: sourceConfig.concurrency || 2,
            requestHandlerTimeoutSecs: 30,

            // Polite crawling
            preNavigationHooks: [
                async ({ request }) => {
                    // Add user agent rotation
                    const userAgents = [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                    ];
                    request.userData = {
                        userAgent: userAgents[Math.floor(Math.random() * userAgents.length)]
                    };
                }
            ],

            requestHandler: this.handleRequest.bind(this),
            failedRequestHandler: this.handleFailedRequest.bind(this)
        });
    }

    async handleRequest({ $, request, enqueueLinks }) {
        log.info(`Processing ${request.url}`);

        try {
            const articleData = this.extractArticle($, request);

            if (articleData && this.isValidArticle(articleData)) {
                // Send to ETL pipeline
                await this.sendToETL(articleData);

                log.info(`Extracted article: ${articleData.title}`);

                // Optionally enqueue more links
                if (this.sourceConfig.followLinks) {
                    await enqueueLinks({
                        selector: 'a[href]',
                        transformRequestFunction: (req) => {
                            // Only follow links from same domain
                            const url = new URL(req.url);
                            const baseUrl = new URL(request.url);
                            if (url.hostname === baseUrl.hostname) {
                                return req;
                            }
                            return false;
                        }
                    });
                }
            }

        } catch (error) {
            log.error(`Error processing ${request.url}: ${error.message}`);
            throw error;
        }
    }

    extractArticle($, request) {
        // Generic article extraction - can be customized per source
        const title = $('title').text().trim() ||
                     $('h1').first().text().trim() ||
                     $('[class*="title"]').first().text().trim();

        const content = $('article, .content, .post-content, .entry-content')
                       .first().text().trim();

        const author = $('[class*="author"]').first().text().trim() ||
                      $('[rel="author"]').first().text().trim() ||
                      $('meta[name="author"]').attr('content');

        const publishedAt = this.extractDate($);

        const summary = $('meta[name="description"]').attr('content') ||
                       $('[class*="summary"], [class*="excerpt"]').first().text().trim();

        // Extract tags/keywords
        const tags = [];
        $('[class*="tag"], [class*="keyword"]').each((i, elem) => {
            const tag = $(elem).text().trim();
            if (tag && tag.length < 50) {
                tags.push(tag.toLowerCase());
            }
        });

        return {
            url: request.url,
            canonical_url: $('link[rel="canonical"]').attr('href') || request.url,
            title: title,
            content: content,
            summary: summary,
            author: author,
            published_at: publishedAt,
            tags: [...new Set(tags)], // Remove duplicates
            crawled_at: new Date().toISOString(),
            source_type: this.sourceConfig.type,
            metadata: {
                user_agent: request.userData?.userAgent,
                response_time: request.userData?.responseTime
            }
        };
    }

    extractDate($) {
        // Try multiple date extraction strategies
        const dateSelectors = [
            'time[datetime]',
            '[class*="date"]',
            '[class*="published"]',
            'meta[property="article:published_time"]'
        ];

        for (const selector of dateSelectors) {
            const element = $(selector).first();
            const dateStr = element.attr('datetime') || element.attr('content') || element.text();

            if (dateStr) {
                try {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        return null;
    }

    isValidArticle(article) {
        // Basic validation
        if (!article.title || article.title.length < 5) return false;
        if (!article.content || article.content.length < 50) return false;

        // Check for spam indicators
        const spamIndicators = ['buy now', 'click here', 'subscribe now'];
        const content = article.content.toLowerCase();

        if (spamIndicators.some(indicator => content.includes(indicator))) {
            return false;
        }

        return true;
    }

    async sendToETL(articleData) {
        try {
            const response = await axios.post('http://localhost:8000/api/etl/ingest', {
                source: this.sourceConfig.name,
                data: [articleData],
                session_id: this.sessionId
            }, {
                timeout: 10000
            });

            log.info(`Sent article to ETL: ${response.status}`);
        } catch (error) {
            log.error(`Failed to send to ETL: ${error.message}`);
            throw error;
        }
    }

    async handleFailedRequest({ request, error }) {
        log.warning(`Request failed: ${request.url} - ${error.message}`);

        // Could implement retry logic or send to dead letter queue
        await this.sendFailureToETL(request, error);
    }

    async sendFailureToETL(request, error) {
        try {
            await axios.post('http://localhost:8000/api/etl/failure', {
                url: request.url,
                error: error.message,
                source: this.sourceConfig.name,
                session_id: this.sessionId
            });
        } catch (e) {
            log.error(`Failed to send failure to ETL: ${e.message}`);
        }
    }

    async crawl(urls, sessionId) {
        this.sessionId = sessionId;
        log.info(`Starting crawl session ${sessionId} for ${this.sourceConfig.name}`);

        try {
            await this.crawler.run(urls);
            log.info(`Completed crawl session ${sessionId}`);
        } catch (error) {
            log.error(`Crawl session ${sessionId} failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = ArticleCrawler;
```

### Part 4: ETL Pipeline Implementation

#### Step 5: Create ETL Processor

**processors/etl_processor.py:**
```python
import asyncio
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.models.article import Article, Source, Tag, ArticleTag, CrawlSession
from processors.validators import ArticleValidator
from processors.transformers import ArticleTransformer
from config.logging import get_logger

logger = get_logger(__name__)

class ETLProcessor:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.validator = ArticleValidator()
        self.transformer = ArticleTransformer()

    async def process_batch(self, raw_articles: List[Dict[str, Any]], source_name: str) -> Dict[str, Any]:
        """Process a batch of raw articles through the ETL pipeline"""
        session_id = f"etl-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{hash(str(raw_articles)[:10])}"

        logger.info(f"Starting ETL batch processing", extra={
            'session_id': session_id,
            'batch_size': len(raw_articles),
            'source': source_name
        })

        stats = {
            'session_id': session_id,
            'input_count': len(raw_articles),
            'valid_count': 0,
            'processed_count': 0,
            'stored_count': 0,
            'duplicate_count': 0,
            'error_count': 0,
            'start_time': datetime.now()
        }

        try:
            # Validate articles
            valid_articles, invalid_articles = self.validator.validate_batch(raw_articles)
            stats['valid_count'] = len(valid_articles)
            stats['error_count'] = len(invalid_articles)

            # Transform valid articles
            transformed_articles = []
            for article in valid_articles:
                try:
                    transformed = self.transformer.transform(article)
                    transformed_articles.append(transformed)
                    stats['processed_count'] += 1
                except Exception as e:
                    logger.error(f"Transformation failed for article {article.get('url', 'unknown')}: {e}")
                    stats['error_count'] += 1

            # Store articles
            stored_count, duplicate_count = await self._store_articles(transformed_articles, source_name)
            stats['stored_count'] = stored_count
            stats['duplicate_count'] = duplicate_count

            stats['end_time'] = datetime.now()
            stats['duration_seconds'] = (stats['end_time'] - stats['start_time']).total_seconds()

            logger.info(f"ETL batch completed", extra=stats)

            return {
                'success': True,
                'stats': stats,
                'invalid_articles': invalid_articles
            }

        except Exception as e:
            logger.error(f"ETL batch failed: {e}", extra={'session_id': session_id})
            return {
                'success': False,
                'error': str(e),
                'stats': stats
            }

    async def _store_articles(self, articles: List[Dict[str, Any]], source_name: str) -> tuple[int, int]:
        """Store articles in database with deduplication"""
        stored_count = 0
        duplicate_count = 0

        # Get or create source
        source = self.db.query(Source).filter(Source.name == source_name).first()
        if not source:
            source = Source(name=source_name, url=f"https://{source_name.lower()}.com", source_type="website")
            self.db.add(source)
            self.db.flush()

        for article_data in articles:
            try:
                # Check for existing article by URL
                existing = self.db.query(Article).filter(Article.url == article_data['url']).first()

                if existing:
                    # Update existing article
                    self._update_existing_article(existing, article_data)
                    duplicate_count += 1
                else:
                    # Create new article
                    await self._create_new_article(article_data, source.id)
                    stored_count += 1

            except IntegrityError as e:
                logger.warning(f"Integrity error for article {article_data.get('url')}: {e}")
                duplicate_count += 1
                self.db.rollback()
            except Exception as e:
                logger.error(f"Failed to store article {article_data.get('url')}: {e}")
                self.db.rollback()

        try:
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to commit transaction: {e}")
            self.db.rollback()

        return stored_count, duplicate_count

    def _update_existing_article(self, existing: Article, article_data: Dict[str, Any]):
        """Update existing article with new data"""
        # Only update if new data is different and potentially more complete
        updates = {}

        if article_data.get('content') and len(article_data['content']) > len(existing.content or ''):
            updates['content'] = article_data['content']

        if article_data.get('summary') and not existing.summary:
            updates['summary'] = article_data['summary']

        if article_data.get('author') and not existing.author:
            updates['author'] = article_data['author']

        if article_data.get('published_at') and not existing.published_at:
            updates['published_at'] = article_data['published_at']

        if updates:
            for key, value in updates.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now()

    async def _create_new_article(self, article_data: Dict[str, Any], source_id: int):
        """Create new article with tags"""
        # Create article
        article = Article(
            title=article_data['title'],
            slug=article_data['slug'],
            content=article_data.get('content'),
            summary=article_data.get('summary'),
            url=article_data['url'],
            canonical_url=article_data.get('canonical_url'),
            source_id=source_id,
            author=article_data.get('author'),
            published_at=article_data.get('published_at'),
            word_count=article_data.get('word_count'),
            reading_time_minutes=article_data.get('reading_time_minutes'),
            language=article_data.get('language', 'en')
        )

        self.db.add(article)
        self.db.flush()  # Get article ID

        # Add tags
        if article_data.get('tags'):
            for tag_name in article_data['tags']:
                tag = self._get_or_create_tag(tag_name)
                article_tag = ArticleTag(article_id=article.id, tag_id=tag.id)
                self.db.add(article_tag)

    def _get_or_create_tag(self, tag_name: str) -> Tag:
        """Get existing tag or create new one"""
        tag = self.db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(
                name=tag_name,
                slug=tag_name.lower().replace(' ', '-')
            )
            self.db.add(tag)
            self.db.flush()
        else:
            # Increment usage count
            tag.usage_count += 1

        return tag

    async def handle_crawl_failure(self, failure_data: Dict[str, Any]):
        """Handle crawl failures"""
        logger.warning("Crawl failure reported", extra=failure_data)

        # Could implement retry logic or store in failure table
        # For now, just log the failure
```

### Part 5: FastAPI Search API

#### Step 6: Create Search API

**api/routes/search.py:**
```python
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc
from typing import List, Optional
from datetime import datetime, timedelta

from database.models.article import Article, Source, Tag, ArticleTag
from api.schemas.search import (
    SearchQuery, SearchFilters, SearchResponse, SearchResult,
    SearchSuggestions, PopularSearches
)
from database.connection import get_db

router = APIRouter(prefix="/search", tags=["search"])

@router.post("/", response_model=SearchResponse)
async def search_articles(
    search_query: SearchQuery,
    filters: Optional[SearchFilters] = None,
    db: Session = Depends(get_db)
):
    """Advanced article search with filtering and relevance ranking"""
    # Build search query
    query = db.query(Article)

    # Apply full-text search
    if search_query.q:
        search_vector = func.plainto_tsquery('english', search_query.q)
        query = query.filter(Article.search_vector.op('@@')(search_vector))

    # Apply filters
    if filters:
        if filters.author:
            query = query.filter(Article.author.ilike(f"%{filters.author}%"))

        if filters.date_range:
            if filters.date_range.from_date:
                query = query.filter(Article.published_at >= filters.date_range.from_date)
            if filters.date_range.to_date:
                query = query.filter(Article.published_at <= filters.date_range.to_date)

        if filters.tags:
            # Filter by tags
            query = query.join(ArticleTag).join(Tag).filter(Tag.name.in_(filters.tags))

        if filters.source:
            query = query.join(Source).filter(Source.name.ilike(f"%{filters.source}%"))

        if filters.published_only:
            query = query.filter(Article.published_at.isnot(None))

    # Apply sorting
    if search_query.sort_by == "date":
        query = query.order_by(desc(Article.published_at))
    else:  # relevance (default)
        if search_query.q:
            search_vector = func.plainto_tsquery('english', search_query.q)
            query = query.order_by(
                func.ts_rank_cd(Article.search_vector, search_vector).desc(),
                desc(Article.published_at)
            )
        else:
            query = query.order_by(desc(Article.published_at))

    # Get total count
    total_results = query.count()

    # Apply pagination
    articles = query.offset(search_query.offset).limit(search_query.limit).all()

    # Format results
    search_results = []
    for article in articles:
        result = SearchResult(
            id=article.id,
            title=article.title,
            url=article.url,
            author=article.author,
            published_at=article.published_at,
            tags=[tag.tag.name for tag in article.tags],
            # Calculate relevance score if searching
            relevance_score=self._calculate_relevance_score(article, search_query.q) if search_query.q else None
        )
        search_results.append(result)

    return SearchResponse(
        query=search_query.q or "",
        total_results=total_results,
        results=search_results,
        search_time_ms=0,  # Could measure actual time
        has_more=(search_query.offset + search_query.limit) < total_results,
        next_offset=search_query.offset + search_query.limit if (search_query.offset + search_query.limit) < total_results else None
    )

@router.get("/autocomplete", response_model=SearchSuggestions)
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get search autocomplete suggestions"""
    # Get title suggestions
    title_suggestions = db.query(Article.title.distinct()).filter(
        Article.title.ilike(f"{q}%")
    ).limit(limit).all()

    # Get tag suggestions
    tag_suggestions = db.query(Tag.name).filter(
        Tag.name.ilike(f"{q}%")
    ).limit(limit).all()

    # Combine and deduplicate
    suggestions = []
    seen = set()

    for suggestion, in title_suggestions + tag_suggestions:
        clean_suggestion = suggestion.strip()
        if clean_suggestion and clean_suggestion.lower() not in seen:
            suggestions.append(clean_suggestion)
            seen.add(clean_suggestion.lower())

    return SearchSuggestions(
        suggestions=suggestions[:limit],
        total_suggestions=len(suggestions)
    )

@router.get("/stats")
async def get_search_stats(db: Session = Depends(get_db)):
    """Get search statistics"""
    # Get basic counts
    total_articles = db.query(func.count(Article.id)).scalar()
    total_sources = db.query(func.count(Source.id)).scalar()
    total_tags = db.query(func.count(Tag.id)).scalar()

    # Get date range
    date_range = db.query(
        func.min(Article.published_at),
        func.max(Article.published_at)
    ).first()

    return {
        "total_articles": total_articles,
        "total_sources": total_sources,
        "total_tags": total_tags,
        "date_range": {
            "oldest": date_range[0],
            "newest": date_range[1]
        },
        "last_updated": datetime.now()
    }

def _calculate_relevance_score(self, article: Article, query: str) -> float:
    """Calculate relevance score for search results"""
    score = 0.0

    # Title matches (highest weight)
    if query.lower() in article.title.lower():
        score += 3.0

    # Author matches
    if article.author and query.lower() in article.author.lower():
        score += 2.0

    # Content matches
    if article.content and query.lower() in article.content.lower():
        content_matches = article.content.lower().count(query.lower())
        score += min(content_matches * 0.5, 2.0)  # Cap at 2.0

    # Tag matches
    tag_matches = sum(1 for tag in article.tags if query.lower() in tag.tag.name.lower())
    score += tag_matches * 1.5

    # Recency boost (newer articles slightly preferred)
    if article.published_at:
        days_old = (datetime.now() - article.published_at).days
        recency_boost = max(0, 1.0 - (days_old / 365)) * 0.5
        score += recency_boost

    return score
```

#### Step 7: Create ETL API Endpoint

**api/routes/etl.py:**
```python
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from processors.etl_processor import ETLProcessor
from database.connection import get_db
from config.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/etl", tags=["etl"])

class ETLIngestRequest(BaseModel):
    source: str
    data: List[Dict[str, Any]]
    session_id: str = None

class ETLResponse(BaseModel):
    success: bool
    message: str
    stats: Dict[str, Any] = None

@router.post("/ingest", response_model=ETLResponse)
async def ingest_crawled_data(
    request: ETLIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Ingest crawled data into the ETL pipeline"""
    logger.info(f"Received ETL ingest request", extra={
        'source': request.source,
        'data_count': len(request.data),
        'session_id': request.session_id
    })

    # Process in background for better API responsiveness
    background_tasks.add_task(process_etl_batch, request, db)

    return ETLResponse(
        success=True,
        message=f"ETL processing started for {len(request.data)} items from {request.source}"
    )

async def process_etl_batch(request: ETLIngestRequest, db: Session):
    """Process ETL batch in background"""
    processor = ETLProcessor(db)

    try:
        result = await processor.process_batch(request.data, request.source)

        if result['success']:
            logger.info(f"ETL batch completed successfully", extra={
                'source': request.source,
                'stats': result['stats']
            })
        else:
            logger.error(f"ETL batch failed", extra={
                'source': request.source,
                'error': result.get('error'),
                'stats': result['stats']
            })

    except Exception as e:
        logger.error(f"ETL processing error: {e}", extra={
            'source': request.source,
            'session_id': request.session_id
        })

@router.post("/failure")
async def report_crawl_failure(
    failure_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Report crawl failures"""
    background_tasks.add_task(handle_crawl_failure, failure_data, db)

    return {"message": "Failure reported"}

async def handle_crawl_failure(failure_data: Dict[str, Any], db: Session):
    """Handle crawl failure reports"""
    logger.warning("Crawl failure reported", extra=failure_data)

    # Could implement failure tracking, retry logic, etc.
    # For now, just log the failure
```

### Part 6: Running the Complete Pipeline

#### Step 8: Create Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crawlee_etl
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d crawlee_etl"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/crawlee_etl
      - REDIS_URL=redis://redis:6379
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
    command: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

  crawler:
    build:
      context: .
      dockerfile: Dockerfile.crawler
    environment:
      - API_URL=http://api:8000
    depends_on:
      - api
    volumes:
      - .:/app

volumes:
  postgres_data:
  redis_data:
```

#### Step 9: Create Runner Scripts

**scripts/run_crawler.py:**
```python
#!/usr/bin/env python3
"""Run the article crawler"""

import asyncio
import subprocess
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import settings
from database.connection import SessionLocal
from database.models.article import Source
from datetime import datetime
import uuid

async def run_crawler(source_name: str, urls: list):
    """Run crawler for a specific source"""
    session_id = f"crawl-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"

    # Create crawl session in database
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.name == source_name).first()
        if not source:
            source = Source(
                name=source_name,
                url=urls[0] if urls else f"https://{source_name.lower()}.com",
                source_type="website"
            )
            db.add(source)
            db.commit()

        print(f"Starting crawler session {session_id} for {source_name}")
        print(f"URLs to crawl: {urls}")

        # Run Node.js crawler
        cmd = [
            "node", "crawlers/run_crawler.js",
            source_name,
            session_id,
            *urls
        ]

        result = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)

        if result.returncode == 0:
            print("Crawler completed successfully")
            print(result.stdout)
        else:
            print("Crawler failed")
            print(result.stderr)
            sys.exit(1)

    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run_crawler.py <source_name> <url1> [url2] ...")
        sys.exit(1)

    source_name = sys.argv[1]
    urls = sys.argv[2:]

    asyncio.run(run_crawler(source_name, urls))
```

**crawlers/run_crawler.js:**
```javascript
const ArticleCrawler = require('./article_crawler.js');

async function main() {
    const sourceName = process.argv[2];
    const sessionId = process.argv[3];
    const urls = process.argv.slice(4);

    if (!sourceName || !urls.length) {
        console.error('Usage: node run_crawler.js <source_name> <session_id> <url1> [url2] ...');
        process.exit(1);
    }

    // Configure crawler based on source
    const sourceConfig = {
        name: sourceName,
        maxPages: 50,
        concurrency: 2,
        followLinks: true,
        type: 'website'
    };

    const crawler = new ArticleCrawler(sourceConfig);

    try {
        await crawler.crawl(urls, sessionId);
        console.log(`Crawler session ${sessionId} completed successfully`);
    } catch (error) {
        console.error(`Crawler session ${sessionId} failed:`, error);
        process.exit(1);
    }
}

main();
```

## Testing the Complete Pipeline

### Run the System

```bash
# 1. Start services
docker-compose up -d postgres redis

# 2. Run database migrations
alembic upgrade head

# 3. Start API
docker-compose up api

# 4. Run crawler (in another terminal)
python scripts/run_crawler.py "TechCrunch" "https://techcrunch.com/"

# 5. Test search API
curl "http://localhost:8000/search/?q=fastapi"
```

### Monitor Pipeline Performance

```bash
# Check API health
curl http://localhost:8000/health

# View search statistics
curl http://localhost:8000/search/stats

# Check database contents
docker-compose exec postgres psql -U user -d crawlee_etl -c "SELECT COUNT(*) FROM articles;"
```

## Challenge Exercises

### Challenge 1: Add Data Quality Monitoring
1. Implement data quality checks in the ETL pipeline
2. Add metrics for duplicate detection and data completeness
3. Create alerts for data quality issues
4. Build a dashboard to monitor data quality over time

### Challenge 2: Implement Incremental Crawling
1. Add last-modified date tracking for articles
2. Implement change detection using HTTP headers
3. Create resume functionality for interrupted crawls
4. Optimize crawling by prioritizing fresh content

### Challenge 3: Add Content Analysis
1. Integrate natural language processing for content categorization
2. Add sentiment analysis for articles
3. Implement content similarity detection
4. Create recommendation engine based on content analysis

## Verification Checklist

### ETL Pipeline
- [ ] Crawler successfully extracts data from websites
- [ ] Data transformation and validation working
- [ ] Articles stored in PostgreSQL with proper relationships
- [ ] Duplicate detection prevents duplicate storage
- [ ] Error handling and logging functional

### Search API
- [ ] Full-text search working with relevance ranking
- [ ] Filtering by author, date, tags, and source functional
- [ ] Pagination and sorting implemented
- [ ] Autocomplete suggestions working
- [ ] Search statistics and analytics available

### Integration
- [ ] Crawler sends data to ETL API successfully
- [ ] ETL processes data and stores in database
- [ ] Search API queries processed data correctly
- [ ] End-to-end pipeline working from crawl to search

### Production Readiness
- [ ] Docker containers build and run successfully
- [ ] Services communicate properly in containerized environment
- [ ] Error handling and recovery mechanisms in place
- [ ] Monitoring and logging configured
- [ ] Performance tested under load

## Next Steps
- [Workshop: Data Processing Pipeline](../workshops/workshop-02-data-processing.md)
- [Workshop: Search API Implementation](../workshops/workshop-03-search-api.md)

## Additional Resources
- [Crawlee Documentation](https://crawlee.dev/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [FastAPI Production Deployment](https://fastapi.tiangolo.com/deployment/)
- [ETL Best Practices](https://martinfowler.com/articles/evodb.html)

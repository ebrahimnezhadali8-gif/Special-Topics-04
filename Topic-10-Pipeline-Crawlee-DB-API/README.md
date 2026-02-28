# Subject 10: Building a Pipeline: Crawlee → DB → API

## Overview

This subject integrates all previous learning into a complete data pipeline. You'll build an end-to-end system that crawls Persian websites, stores data in PostgreSQL, and exposes it through REST and gRPC APIs. The focus is on ETL (Extract, Transform, Load) processes, data quality, and scalable pipeline architecture.

## Learning Objectives

By the end of this subject, you will be able to:

- **Design ETL Pipelines**: Create robust data extraction, transformation, and loading workflows
- **Handle Data Quality**: Implement deduplication, normalization, and validation
- **Build Scalable Systems**: Design pipelines that can handle large volumes of data
- **Integrate Components**: Connect crawling, database, and API components seamlessly
- **Implement Monitoring**: Add logging, error handling, and performance tracking
- **Deploy Complete Systems**: Containerize and orchestrate full-stack applications

## Prerequisites

- Completion of Subjects 1-9 (All previous subjects)
- Strong Python programming skills
- Understanding of all covered technologies (Crawlee, PostgreSQL, FastAPI, gRPC)
- Experience with Docker and containerization

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[ETL Pipeline Design](tutorials/01-etl-pipeline-design.md)**
   - ETL concepts and architecture
   - Pipeline orchestration patterns
   - Data flow design principles
   - Error handling strategies

2. **[Data Processing](tutorials/02-data-processing.md)**
   - Data cleaning and normalization
   - Deduplication techniques
   - Text processing for Persian content
   - Data validation and quality assurance

3. **[Pipeline Integration](tutorials/03-pipeline-integration.md)**
   - Connecting Crawlee with database
   - API integration patterns
   - Service communication
   - Data consistency across components

4. **[Monitoring & Logging](tutorials/04-monitoring-logging.md)**
   - Pipeline monitoring strategies
   - Logging best practices
   - Error tracking and alerting
   - Performance metrics

5. **[Scalability & Optimization](tutorials/05-scalability-optimization.md)**
   - Scaling pipeline components
   - Performance optimization
   - Resource management
   - Production deployment considerations

### 🛠️ Workshops (Hands-on Practice)

1. **[Basic ETL Pipeline](workshops/workshop-01-basic-etl-pipeline.md)**
   - Setting up pipeline components
   - Basic data flow implementation
   - Simple transformation logic
   - Initial testing and validation

2. **[Data Processing Pipeline](workshops/workshop-02-data-processing-pipeline.md)**
   - Implementing data cleaning
   - Deduplication logic
   - Content normalization
   - Quality assurance checks

3. **[API Integration](workshops/workshop-03-api-integration.md)**
   - Connecting pipeline to APIs
   - Implementing search endpoints
   - Data serialization
   - API documentation

4. **[Monitoring & Error Handling](workshops/workshop-04-monitoring-error-handling.md)**
   - Adding logging infrastructure
   - Error handling and recovery
   - Pipeline monitoring
   - Alerting systems

5. **[Production Pipeline](workshops/workshop-05-production-pipeline.md)**
   - Containerizing the pipeline
   - Orchestration with Docker Compose
   - Production configuration
   - Deployment and scaling

### 📝 Homework Assignments

The `homeworks/` directory contains:
- Complete pipeline implementation projects
- Data processing challenges
- Integration and deployment tasks

### 📋 Assessments

The `assessments/` directory contains:
- Pipeline design evaluation
- System integration challenges
- Performance optimization exercises

## Key Pipeline Concepts

### Complete ETL Architecture

```python
# Pipeline orchestrator
class ETLPipeline:
    def __init__(self):
        self.crawler = CrawleeCrawler()
        self.processor = DataProcessor()
        self.storage = DatabaseStorage()
        self.api = ContentAPI()

    async def run_pipeline(self, urls: List[str]):
        # Extract phase
        raw_data = await self.crawler.crawl_urls(urls)

        # Transform phase
        processed_data = await self.processor.process_batch(raw_data)

        # Load phase
        await self.storage.store_batch(processed_data)

        # Update API
        await self.api.refresh_cache()

# Data processing pipeline
class DataProcessor:
    async def process_batch(self, raw_articles: List[dict]) -> List[dict]:
        processed = []

        for article in raw_articles:
            try:
                # Clean and validate
                cleaned = await self.clean_article(article)

                # Check for duplicates
                if not await self.is_duplicate(cleaned):
                    # Normalize content
                    normalized = await self.normalize_content(cleaned)

                    # Extract metadata
                    enriched = await self.extract_metadata(normalized)

                    processed.append(enriched)

            except Exception as e:
                logger.error(f"Failed to process article {article.get('url')}: {e}")
                continue

        return processed
```

### Database Integration with Crawling

```python
from sqlalchemy.ext.asyncio import AsyncSession
from crawlee import PlaywrightCrawler, Request

class DatabaseIntegratedCrawler:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.crawler = PlaywrightCrawler()

    @crawler.router.default_handler
    async def process_page(self, context):
        # Extract article data
        article_data = await extract_article_data(context.page)

        # Check if URL already exists
        existing = await self.db.execute(
            select(Article).where(Article.url == article_data['url'])
        )
        if existing.scalar():
            logger.info(f"Skipping duplicate URL: {article_data['url']}")
            return

        # Store in database
        article = Article(**article_data)
        self.db.add(article)

        # Extract and store tags
        tags = await extract_tags(context.page)
        for tag_name in tags:
            tag = await self.get_or_create_tag(tag_name)
            article.tags.append(tag)

        await self.db.commit()

        # Index for search
        await self.index_for_search(article)

    async def get_or_create_tag(self, tag_name: str) -> Tag:
        tag = await self.db.execute(
            select(Tag).where(Tag.name == tag_name)
        )
        tag = tag.scalar()

        if not tag:
            tag = Tag(name=tag_name)
            self.db.add(tag)
            await self.db.commit()

        return tag
```

### API with Search Capabilities

```python
from fastapi import FastAPI, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

app = FastAPI(title="Content API", version="1.0.0")

@app.get("/articles/", response_model=List[ArticleResponse])
async def search_articles(
    q: Optional[str] = Query(None, description="Search query"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Article)

    # Apply filters
    if q:
        # Full-text search
        search_query = func.plainto_tsquery('persian', q)
        query = query.filter(
            func.ts_rank_cd(Article.content_tsv, search_query) > 0.1
        ).order_by(
            func.ts_rank_cd(Article.content_tsv, search_query).desc()
        )

    if tag:
        query = query.join(Article.tags).filter(Tag.name == tag)

    if domain:
        query = query.filter(Article.site_domain == domain)

    # Pagination
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    articles = result.scalars().all()

    return articles

@app.post("/crawl/", status_code=202)
async def trigger_crawl(
    urls: List[str],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    background_tasks.add_task(run_crawl_pipeline, urls, db)
    return {"message": "Crawl started", "urls": urls}
```

## Pipeline Monitoring and Logging

### Structured Logging

```python
import logging
import json
from datetime import datetime

class PipelineLogger:
    def __init__(self):
        self.logger = logging.getLogger('etl_pipeline')
        self.logger.setLevel(logging.INFO)

        # File handler for detailed logs
        fh = logging.FileHandler('pipeline.log')
        fh.setLevel(logging.INFO)

        # Console handler for important messages
        ch = logging.StreamHandler()
        ch.setLevel(logging.WARNING)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

    def log_pipeline_start(self, pipeline_id: str, config: dict):
        self.logger.info(f"Pipeline {pipeline_id} started", extra={
            'pipeline_id': pipeline_id,
            'event': 'pipeline_start',
            'config': json.dumps(config)
        })

    def log_article_processed(self, pipeline_id: str, article_url: str, status: str):
        self.logger.info(f"Article processed: {article_url}", extra={
            'pipeline_id': pipeline_id,
            'event': 'article_processed',
            'article_url': article_url,
            'status': status
        })

    def log_error(self, pipeline_id: str, error: Exception, context: dict = None):
        self.logger.error(f"Pipeline error: {str(error)}", extra={
            'pipeline_id': pipeline_id,
            'event': 'error',
            'error_type': type(error).__name__,
            'context': json.dumps(context or {})
        }, exc_info=True)
```

### Performance Monitoring

```python
import time
from functools import wraps

class PipelineMetrics:
    def __init__(self):
        self.metrics = {}

    def time_operation(self, operation_name: str):
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    duration = time.time() - start_time

                    self.record_metric(
                        f"{operation_name}_success",
                        duration,
                        {'status': 'success'}
                    )

                    return result
                except Exception as e:
                    duration = time.time() - start_time

                    self.record_metric(
                        f"{operation_name}_error",
                        duration,
                        {'status': 'error', 'error_type': type(e).__name__}
                    )

                    raise
            return wrapper
        return decorator

    def record_metric(self, name: str, value: float, tags: dict = None):
        key = f"{name}_{json.dumps(tags or {}, sort_keys=True)}"
        if key not in self.metrics:
            self.metrics[key] = []

        self.metrics[key].append({
            'timestamp': datetime.utcnow(),
            'value': value,
            'tags': tags or {}
        })

        # Keep only last 1000 metrics per type
        if len(self.metrics[key]) > 1000:
            self.metrics[key] = self.metrics[key][-1000:]
```

## Docker Compose Orchestration

### Complete Pipeline Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: content_db
      POSTGRES_USER: crawler
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  crawler:
    build:
      context: .
      dockerfile: Dockerfile.crawler
    environment:
      DATABASE_URL: postgresql://crawler:password@postgres:5432/content_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgresql://crawler:password@postgres:5432/content_db
      REDIS_URL: redis://redis:6379
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://crawler:password@postgres:5432/content_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: celery -A worker worker --loglevel=info

volumes:
  postgres_data:
```

## Resources & References

### 📖 Documentation
- [ETL Best Practices](https://www.oreilly.com/library/view/etl/9781491939505/) - Data pipeline patterns
- [Apache Airflow](https://airflow.apache.org/) - Workflow orchestration
- [Celery](https://docs.celeryproject.org/) - Task queue for Python

### 🛠️ Tools & Libraries
- [Prefect](https://www.prefect.io/) - Modern workflow orchestration
- [Dagster](https://dagster.io/) - Data orchestration platform
- [Great Expectations](https://greatexpectations.io/) - Data validation

### 📚 Additional Learning
- [Data Pipeline Design Patterns](https://www.confluent.io/blog/data-pipeline-architecture-patterns/) - Architecture patterns
- [Building Data Pipelines](https://github.com/spotify/luigi) - Pipeline frameworks
- [Monitoring Data Pipelines](https://www.datadoghq.com/blog/monitoring-data-pipelines/) - Best practices

## Getting Started

1. **Review Prerequisites** - Ensure all previous subjects are completed
2. **Set up Development Environment** - Install all required dependencies
3. **Complete Workshop 1** - Build your first basic ETL pipeline
4. **Work through Tutorials** - Understand pipeline design patterns
5. **Practice with Workshops** - Implement monitoring and error handling
6. **Complete Homework** - Build production-ready pipelines

## Assessment Criteria

- **Pipeline Design**: Well-architected ETL processes with proper separation of concerns
- **Data Quality**: Effective deduplication, normalization, and validation
- **Error Handling**: Robust error recovery and logging mechanisms
- **Performance**: Efficient processing of large data volumes
- **Monitoring**: Comprehensive logging and performance tracking
- **Integration**: Seamless component integration and data flow

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 11**: Database optimization and performance tuning
- **Subject 12**: AI-assisted frontend development
- **Subject 13**: Final project integration

---

*Building complete data pipelines is the culmination of all previous learning. This subject teaches you to integrate crawling, storage, and API components into production-ready systems.*

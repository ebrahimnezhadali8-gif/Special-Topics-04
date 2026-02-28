# ETL Pipeline Development Environment Setup

## Overview
This guide covers setting up a development environment for building ETL (Extract, Transform, Load) pipelines that crawl websites, store data in databases, and expose APIs.

## Prerequisites
- Python 3.8+ installed
- PostgreSQL installed (from Subject 09)
- FastAPI knowledge (from Subject 05)
- Crawlee knowledge (from Subject 08)

---

## Project Structure Setup

```bash
# Create project directory
mkdir etl-pipeline
cd etl-pipeline

# Create virtual environment
uv init
uv venv
source .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows

# Create project structure
mkdir -p \
  crawlers \
  processors \
  database \
  api \
  models \
  config \
  tests \
  scripts \
  data/{raw,processed,logs} \
  docker
```

---

## Dependencies Installation

```bash
# Core ETL dependencies
uv add crawlee fastapi uvicorn sqlalchemy asyncpg alembic

# Data processing
uv add pandas numpy pydantic[email]

# Additional tools
uv add loguru python-dotenv aiofiles schedule

# Testing and development
uv add pytest pytest-asyncio httpx black flake8

# Optional: Monitoring
uv add prometheus-client
```

---

## Configuration Setup

### Environment Configuration
```bash
# .env file
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/pipeline_db

# Crawling
CRAWL_DELAY=1.0
MAX_CONCURRENT_REQUESTS=5
USER_AGENT=ETL-Pipeline/1.0

# API
API_HOST=0.0.0.0
API_PORT=8000

# Logging
LOG_LEVEL=INFO
LOG_FILE=data/logs/pipeline.log

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Settings Management
```python
# config/settings.py
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str

    # Crawling
    crawl_delay: float = 1.0
    max_concurrent_requests: int = 5
    user_agent: str = "ETL-Pipeline/1.0"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Database Schema Setup

### SQLAlchemy Models
```python
# models/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# models/article.py
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from .base import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text)
    url = Column(String, unique=True, nullable=False)
    published_date = Column(DateTime)
    crawled_at = Column(DateTime, default=datetime.utcnow)
    source = Column(String)

    def __repr__(self):
        return f"<Article(title='{self.title}', url='{self.url}')>"
```

---

## Crawler Setup

### Base Crawler Class
```python
# crawlers/base_crawler.py
import asyncio
from typing import List, Dict, Any
from crawlee.crawlers import BeautifulSoupCrawler
from loguru import logger

class BaseCrawler:
    def __init__(self, delay: float = 1.0):
        self.delay = delay
        self.crawler = BeautifulSoupCrawler(
            max_requests_per_crawl=100,
            request_handler_timeout=30,
        )

    async def crawl_and_extract(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Crawl URLs and extract data"""
        results = []

        @self.crawler.router.default_handler
        async def extract_data(context):
            try:
                data = self.extract_data(context.soup, context.request.url)
                if data:
                    results.append(data)
                    logger.info(f"Extracted data from {context.request.url}")

                await asyncio.sleep(self.delay)

            except Exception as e:
                logger.error(f"Error processing {context.request.url}: {e}")

        await self.crawler.run(urls)
        return results

    def extract_data(self, soup, url: str) -> Dict[str, Any]:
        """Override this method in subclasses"""
        raise NotImplementedError
```

---

## Processor Setup

### Data Processor Class
```python
# processors/base_processor.py
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
import pandas as pd
from loguru import logger

class BaseProcessor(ABC):
    def __init__(self):
        self.stats = {"processed": 0, "errors": 0, "duplicates": 0}

    @abstractmethod
    def process_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single item"""
        pass

    def process_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of items"""
        processed_items = []

        for item in items:
            try:
                processed = self.process_item(item)
                if processed:
                    processed_items.append(processed)
                    self.stats["processed"] += 1
                else:
                    self.stats["duplicates"] += 1
            except Exception as e:
                logger.error(f"Error processing item: {e}")
                self.stats["errors"] += 1

        logger.info(f"Processing stats: {self.stats}")
        return processed_items

    def save_to_csv(self, items: List[Dict[str, Any]], filename: str):
        """Save processed data to CSV"""
        df = pd.DataFrame(items)
        df.to_csv(f"data/processed/{filename}", index=False)
        logger.info(f"Saved {len(items)} items to {filename}")
```

---

## API Setup

### FastAPI Application
```python
# api/main.py
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from config.settings import settings
from database.connection import get_db
from models.article import Article
from api.schemas import ArticleResponse, ArticleCreate

app = FastAPI(
    title="ETL Pipeline API",
    description="API for accessing crawled and processed data",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ETL Pipeline API"}

@app.get("/articles/", response_model=List[ArticleResponse])
async def get_articles(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of articles"""
    # Implementation here
    pass

@app.post("/articles/", response_model=ArticleResponse)
async def create_article(
    article: ArticleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new article"""
    # Implementation here
    pass
```

---

## Docker Setup

### Multi-service Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db/pipeline_db
    depends_on:
      - db
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=pipeline_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  crawler:
    build: .
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db/pipeline_db
    depends_on:
      - db
    volumes:
      - ./data:/app/data
    command: python scripts/run_pipeline.py

volumes:
  postgres_data:
```

---

## Pipeline Orchestration

### Main Pipeline Script
```python
# scripts/run_pipeline.py
import asyncio
from loguru import logger
from config.settings import settings

from crawlers.news_crawler import NewsCrawler
from processors.article_processor import ArticleProcessor
from database.connection import init_db, save_articles

async def run_etl_pipeline():
    """Run the complete ETL pipeline"""
    logger.info("Starting ETL pipeline")

    # Initialize database
    await init_db()

    # Crawling phase
    logger.info("Starting crawling phase")
    crawler = NewsCrawler(delay=settings.crawl_delay)
    urls = [
        "https://example-news-site.com",
        # Add more URLs
    ]
    raw_data = await crawler.crawl_and_extract(urls)

    # Processing phase
    logger.info("Starting processing phase")
    processor = ArticleProcessor()
    processed_data = processor.process_batch(raw_data)

    # Storage phase
    logger.info("Starting storage phase")
    await save_articles(processed_data)

    logger.info("ETL pipeline completed successfully")

if __name__ == "__main__":
    asyncio.run(run_etl_pipeline())
```

---

## Testing Setup

### Test Structure
```python
# tests/test_pipeline.py
import pytest
from unittest.mock import AsyncMock
from crawlers.base_crawler import BaseCrawler
from processors.base_processor import BaseProcessor

@pytest.mark.asyncio
async def test_crawler_basic():
    crawler = BaseCrawler()
    # Mock implementation
    assert crawler.delay == 1.0

def test_processor_stats():
    processor = BaseProcessor()
    assert processor.stats["processed"] == 0
    assert processor.stats["errors"] == 0
```

---

## Monitoring Setup

### Basic Metrics
```python
# api/metrics.py
from fastapi import APIRouter
from prometheus_client import Counter, Histogram, generate_latest

router = APIRouter()

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')

@router.get("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()
```

---

## Running the Pipeline

### Development Mode
```bash
# Start API server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Run pipeline (in another terminal)
python scripts/run_pipeline.py

# Run tests
pytest tests/
```

### Production Mode
```bash
# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api
```

---

## Troubleshooting

### Database Connection Issues
```python
# Test database connection
from database.connection import get_db
import asyncio

async def test_db():
    async for session in get_db():
        result = await session.execute("SELECT 1")
        print("Database connection successful")

asyncio.run(test_db())
```

### Crawler Issues
```python
# Test crawler with simple URL
import asyncio
from crawlers.base_crawler import BaseCrawler

async def test_crawl():
    crawler = BaseCrawler()
    results = await crawler.crawl_and_extract(["https://httpbin.org/html"])
    print(f"Extracted {len(results)} items")

asyncio.run(test_crawl())
```

### API Issues
```bash
# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs  # OpenAPI documentation
```

---

## Next Steps

1. [Learn ETL pipeline concepts](../tutorials/01-etl-basics.md)
2. [Create your first crawler](../workshops/workshop-01-crawler-implementation.md)
3. [Build data processors](../tutorials/02-data-processing.md)
4. [Design REST APIs](../workshops/workshop-02-api-development.md)

---

## Resources

- [Crawlee Documentation](https://crawlee-python.apify.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://sqlalchemy.org/)
- [ETL Best Practices](https://www.oreilly.com/library/view/building-etl-pipelines/9781492042537/)
- [Data Pipeline Patterns](https://martinfowler.com/articles/data-pipeline-patterns.html)

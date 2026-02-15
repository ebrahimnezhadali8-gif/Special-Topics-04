# Workshop 01: Basic Crawlee Python Crawler

## Overview
This workshop implements a complete basic web crawler using Crawlee Python SDK. You'll build a crawler that extracts article titles and content, handles errors gracefully, and saves data to JSON files or a database. This fulfills the core lab requirement of building a Python crawler for content extraction.

## Prerequisites
- Completed [Crawlee Basics Tutorial](../tutorials/01-crawlee-basics.md)
- Python environment with Crawlee installed
- Basic understanding of HTML and CSS selectors

## Learning Objectives
By the end of this workshop, you will be able to:
- Set up a Crawlee Python project
- Extract titles and content from web pages
- Handle different page types and errors
- Save crawled data to JSON or database
- Monitor crawler performance

## Workshop Structure

### Part 1: Project Setup

#### Step 1: Create Project Structure

```bash
# Create project directory
mkdir basic-crawler-workshop
cd basic-crawler-workshop

# Create virtual environment
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv add crawlee beautifulsoup4 requests python-dotenv

# Create project structure
mkdir -p crawlers extractors storage config tests data

# Create initial files
touch main.py
touch config/settings.py
touch crawlers/article_crawler.py
touch extractors/content_extractor.py
touch storage/json_storage.py
touch storage/db_storage.py
touch .env
```

#### Step 2: Configure Environment

**config/settings.py:**
```python
import os
from typing import List

class Settings:
    """Application settings"""

    # Crawler settings
    MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '2'))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
    MAX_REQUESTS_PER_CRAWL = int(os.getenv('MAX_REQUESTS_PER_CRAWL', '50'))

    # Storage settings
    STORAGE_TYPE = os.getenv('STORAGE_TYPE', 'json')  # 'json' or 'sqlite'
    DATA_DIR = os.getenv('DATA_DIR', 'data')
    DB_PATH = os.getenv('DB_PATH', 'data/crawled_data.db')

    # Crawler behavior
    USER_AGENT = os.getenv('USER_AGENT', 'BasicCrawlerWorkshop/1.0')
    RESPECT_ROBOTS_TXT = os.getenv('RESPECT_ROBOTS_TXT', 'true').lower() == 'true'

    # Target websites (for testing)
    DEFAULT_URLS = [
        'https://httpbin.org/html',  # Simple HTML page for testing
        'https://example.com',
    ]

settings = Settings()
```

**.env:**
```bash
# Crawler Configuration
MAX_CONCURRENT_REQUESTS=2
REQUEST_TIMEOUT=30
MAX_REQUESTS_PER_CRAWL=50

# Storage Configuration
STORAGE_TYPE=json
DATA_DIR=data

# Crawler Behavior
USER_AGENT=BasicCrawlerWorkshop/1.0
RESPECT_ROBOTS_TXT=true
```

### Part 2: Content Extractor

#### Step 3: Create Content Extractor

**extractors/content_extractor.py:**
```python
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
import re
from urllib.parse import urlparse

class ContentExtractor:
    """Extract content from HTML pages"""

    def __init__(self):
        self.min_content_length = 50
        self.max_title_length = 200

    def extract_article_data(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """
        Extract article data from HTML content

        Args:
            html_content: Raw HTML content
            url: Source URL

        Returns:
            Dictionary with extracted data or None if extraction fails
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # Extract basic information
            title = self._extract_title(soup)
            content = self._extract_content(soup)

            # Skip if we can't extract meaningful content
            if not title or not content or len(content) < self.min_content_length:
                return None

            # Extract additional metadata
            metadata = self._extract_metadata(soup, url)

            article_data = {
                'title': title,
                'content': content,
                'url': url,
                'domain': self._extract_domain(url),
                **metadata
            }

            return article_data

        except Exception as e:
            print(f"Error extracting content from {url}: {e}")
            return None

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title"""
        # Try different title sources in order of preference
        title_sources = [
            lambda: soup.find('title'),
            lambda: soup.find('h1'),
            lambda: soup.find('h1', class_=re.compile(r'title', re.I)),
            lambda: soup.find(['h1', 'h2', 'h3'], class_=re.compile(r'(title|headline)', re.I)),
        ]

        for source in title_sources:
            try:
                element = source()
                if element:
                    title_text = element.get_text(strip=True)
                    if title_text and len(title_text) <= self.max_title_length:
                        return title_text
            except:
                continue

        return None

    def _extract_content(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main content"""
        # Remove unwanted elements
        self._clean_soup(soup)

        # Try different content extraction strategies
        content_strategies = [
            self._extract_by_article_tag,
            self._extract_by_content_class,
            self._extract_by_main_tag,
            self._extract_by_paragraphs,
        ]

        for strategy in content_strategies:
            try:
                content = strategy(soup)
                if content and len(content) >= self.min_content_length:
                    # Clean and normalize content
                    content = self._clean_content(content)
                    return content
            except Exception as e:
                print(f"Content extraction strategy failed: {e}")
                continue

        return None

    def _extract_by_article_tag(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content from <article> tag"""
        article = soup.find('article')
        if article:
            return article.get_text(separator=' ', strip=True)
        return None

    def _extract_by_content_class(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content by common content class names"""
        content_selectors = [
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.main-content',
            '#content',
            '#main',
            '.text',
            '.body'
        ]

        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator=' ', strip=True)
                if len(text) >= self.min_content_length:
                    return text

        return None

    def _extract_by_main_tag(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content from <main> tag"""
        main = soup.find('main')
        if main:
            return main.get_text(separator=' ', strip=True)
        return None

    def _extract_by_paragraphs(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content from paragraphs"""
        paragraphs = soup.find_all('p')
        if not paragraphs:
            return None

        # Filter out short paragraphs (likely navigation, ads, etc.)
        content_paragraphs = [
            p.get_text(strip=True)
            for p in paragraphs
            if len(p.get_text(strip=True)) >= 20
        ]

        if content_paragraphs:
            return ' '.join(content_paragraphs)

        return None

    def _clean_soup(self, soup: BeautifulSoup):
        """Remove unwanted elements from soup"""
        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            element.decompose()

        # Remove common advertisement and navigation elements
        ad_selectors = [
            '.advertisement', '.ads', '.ad',
            '.sidebar', '.navigation', '.menu',
            '.comments', '.related', '.social-share'
        ]

        for selector in ad_selectors:
            for element in soup.select(selector):
                element.decompose()

    def _clean_content(self, content: str) -> str:
        """Clean and normalize extracted content"""
        if not content:
            return ""

        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content)

        # Remove excessive newlines
        content = re.sub(r'\n{3,}', '\n\n', content)

        # Trim whitespace
        content = content.strip()

        return content

    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract metadata from page"""
        metadata = {}

        # Extract description
        description = self._extract_description(soup)
        if description:
            metadata['description'] = description

        # Extract author
        author = self._extract_author(soup)
        if author:
            metadata['author'] = author

        # Extract publication date
        published_at = self._extract_date(soup)
        if published_at:
            metadata['published_at'] = published_at

        # Extract word count
        if 'content' in locals() and content:
            metadata['word_count'] = len(content.split())
            metadata['character_count'] = len(content)

        return metadata

    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page description"""
        # Try meta description first
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()

        # Try Open Graph description
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content'):
            return og_desc['content'].strip()

        return None

    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article author"""
        # Try meta author
        meta_author = soup.find('meta', attrs={'name': 'author'})
        if meta_author and meta_author.get('content'):
            return meta_author['content'].strip()

        # Try common author selectors
        author_selectors = [
            '.author', '.byline', '.writer',
            '[class*="author"]', '[rel="author"]'
        ]

        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) < 100:  # Reasonable author name length
                    return text

        return None

    def _extract_date(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract publication date"""
        # Try time element with datetime
        time_element = soup.find('time', attrs={'datetime': True})
        if time_element:
            return time_element['datetime']

        # Try meta published time
        published_meta = soup.find('meta', attrs={'property': 'article:published_time'})
        if published_meta and published_meta.get('content'):
            return published_meta['content']

        # Try common date selectors
        date_selectors = [
            '.date', '.published', '.timestamp',
            '[class*="date"]', '[class*="published"]'
        ]

        for selector in date_selectors:
            element = soup.select_one(selector)
            if element:
                # Try to find datetime attribute
                datetime_attr = element.get('datetime') or element.get('content')
                if datetime_attr:
                    return datetime_attr

                # Try to parse text content
                text = element.get_text(strip=True)
                if text:
                    return text

        return None

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except:
            return ""
```

### Part 3: Storage Implementations

#### Step 4: Create JSON Storage

**storage/json_storage.py:**
```python
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

class JSONStorage:
    """JSON-based storage for crawled data"""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def save_article(self, article_data: Dict[str, Any]) -> str:
        """
        Save article data to JSON file

        Args:
            article_data: Article data dictionary

        Returns:
            Path to saved file
        """
        # Create filename from title or timestamp
        title_slug = self._create_title_slug(article_data.get('title', ''))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{title_slug}.json"

        # Add storage metadata
        article_with_meta = {
            **article_data,
            'stored_at': datetime.now().isoformat(),
            'storage_type': 'json',
            'file_path': str(self.data_dir / filename)
        }

        # Save to file
        file_path = self.data_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(article_with_meta, f, ensure_ascii=False, indent=2)

        return str(file_path)

    def save_batch(self, articles: List[Dict[str, Any]], batch_name: Optional[str] = None) -> str:
        """
        Save multiple articles to a single JSON file

        Args:
            articles: List of article data dictionaries
            batch_name: Optional batch name

        Returns:
            Path to saved batch file
        """
        if not batch_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            batch_name = f"batch_{timestamp}"

        filename = f"{batch_name}.json"
        file_path = self.data_dir / filename

        batch_data = {
            'batch_info': {
                'name': batch_name,
                'created_at': datetime.now().isoformat(),
                'article_count': len(articles),
                'storage_type': 'json_batch'
            },
            'articles': articles
        }

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

        return str(file_path)

    def load_article(self, filename: str) -> Optional[Dict[str, Any]]:
        """Load article from JSON file"""
        file_path = self.data_dir / filename

        if not file_path.exists():
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return None

    def list_articles(self) -> List[str]:
        """List all saved article files"""
        json_files = []

        for file_path in self.data_dir.glob("*.json"):
            if not file_path.name.startswith('batch_'):
                json_files.append(file_path.name)

        # Sort by modification time (newest first)
        json_files.sort(key=lambda x: (self.data_dir / x).stat().st_mtime, reverse=True)

        return json_files

    def search_articles(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Simple search through stored articles"""
        results = []
        query_lower = query.lower()

        for filename in self.list_articles():
            article = self.load_article(filename)
            if not article:
                continue

            # Search in title and content
            title = article.get('title', '').lower()
            content = article.get('content', '').lower()

            if query_lower in title or query_lower in content:
                results.append(article)

                if len(results) >= limit:
                    break

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        json_files = list(self.data_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in json_files)

        return {
            'total_files': len([f for f in json_files if not f.name.startswith('batch_')]),
            'total_batches': len([f for f in json_files if f.name.startswith('batch_')]),
            'total_size_mb': total_size / (1024 * 1024),
            'storage_type': 'json'
        }

    def _create_title_slug(self, title: str) -> str:
        """Create URL-friendly slug from title"""
        import re

        if not title:
            return f"article_{datetime.now().strftime('%H%M%S')}"

        # Remove non-alphanumeric characters except spaces and hyphens
        slug = re.sub(r'[^\w\s-]', '', title.lower())

        # Replace spaces and underscores with hyphens
        slug = re.sub(r'[\s_]+', '-', slug)

        # Remove multiple hyphens
        slug = re.sub(r'-+', '-', slug)

        # Trim hyphens from start/end
        slug = slug.strip('-')

        # Limit length
        if len(slug) > 30:
            slug = slug[:30].rstrip('-')

        if not slug:
            return f"article_{datetime.now().strftime('%H%M%S')}"

        return slug
```

#### Step 5: Create Database Storage

**storage/db_storage.py:**
```python
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

class DatabaseStorage:
    """SQLite-based storage for crawled data"""

    def __init__(self, db_path: str = "data/crawled_data.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(exist_ok=True)
        self.init_database()

    def init_database(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT,
                    url TEXT UNIQUE NOT NULL,
                    domain TEXT,
                    author TEXT,
                    description TEXT,
                    published_at TEXT,
                    word_count INTEGER,
                    character_count INTEGER,
                    crawled_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            ''')

            # Create indexes for better query performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_domain ON articles(domain)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_crawled ON articles(crawled_at)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title)')

            conn.commit()

    def save_article(self, article_data: Dict[str, Any]) -> int:
        """
        Save article data to database

        Args:
            article_data: Article data dictionary

        Returns:
            Article ID
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            data = {
                'title': article_data.get('title', ''),
                'content': article_data.get('content'),
                'url': article_data['url'],
                'domain': article_data.get('domain'),
                'author': article_data.get('author'),
                'description': article_data.get('description'),
                'published_at': article_data.get('published_at'),
                'word_count': article_data.get('word_count'),
                'character_count': article_data.get('character_count'),
                'crawled_at': datetime.now().isoformat(),
                'created_at': datetime.now().isoformat()
            }

            cursor.execute('''
                INSERT OR REPLACE INTO articles
                (title, content, url, domain, author, description, published_at,
                 word_count, character_count, crawled_at, created_at)
                VALUES (:title, :content, :url, :domain, :author, :description, :published_at,
                       :word_count, :character_count, :crawled_at, :created_at)
            ''', data)

            conn.commit()
            return cursor.lastrowid

    def save_batch(self, articles: List[Dict[str, Any]]) -> int:
        """
        Save multiple articles to database

        Args:
            articles: List of article data dictionaries

        Returns:
            Number of articles saved
        """
        saved_count = 0

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            for article_data in articles:
                try:
                    data = {
                        'title': article_data.get('title', ''),
                        'content': article_data.get('content'),
                        'url': article_data['url'],
                        'domain': article_data.get('domain'),
                        'author': article_data.get('author'),
                        'description': article_data.get('description'),
                        'published_at': article_data.get('published_at'),
                        'word_count': article_data.get('word_count'),
                        'character_count': article_data.get('character_count'),
                        'crawled_at': datetime.now().isoformat(),
                        'created_at': datetime.now().isoformat()
                    }

                    cursor.execute('''
                        INSERT OR IGNORE INTO articles
                        (title, content, url, domain, author, description, published_at,
                         word_count, character_count, crawled_at, created_at)
                        VALUES (:title, :content, :url, :domain, :author, :description, :published_at,
                               :word_count, :character_count, :crawled_at, :created_at)
                    ''', data)

                    if cursor.rowcount > 0:
                        saved_count += 1

                except Exception as e:
                    print(f"Error saving article {article_data.get('url')}: {e}")

            conn.commit()

        return saved_count

    def get_article(self, article_id: int) -> Optional[Dict[str, Any]]:
        """Get article by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM articles WHERE id = ?', (article_id,))
            row = cursor.fetchone()

            return dict(row) if row else None

    def search_articles(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search articles by title or content"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Simple LIKE search
            search_query = f"%{query}%"

            cursor.execute('''
                SELECT * FROM articles
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY crawled_at DESC
                LIMIT ?
            ''', (search_query, search_query, limit))

            return [dict(row) for row in cursor.fetchall()]

    def get_recent_articles(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most recently crawled articles"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('''
                SELECT * FROM articles
                ORDER BY crawled_at DESC
                LIMIT ?
            ''', (limit,))

            return [dict(row) for row in cursor.fetchall()]

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get article count
            cursor.execute('SELECT COUNT(*) FROM articles')
            total_articles = cursor.fetchone()[0]

            # Get domain statistics
            cursor.execute('''
                SELECT domain, COUNT(*) as count
                FROM articles
                WHERE domain IS NOT NULL
                GROUP BY domain
                ORDER BY count DESC
                LIMIT 10
            ''')
            domain_stats = cursor.fetchall()

            # Get database file size
            db_size = Path(self.db_path).stat().st_size

            return {
                'total_articles': total_articles,
                'domains': [{'domain': row[0], 'count': row[1]} for row in domain_stats],
                'database_size_mb': db_size / (1024 * 1024),
                'storage_type': 'sqlite'
            }
```

### Part 4: Main Crawler Implementation

#### Step 6: Create Article Crawler

**crawlers/article_crawler.py:**
```python
from crawlee import BeautifulSoupCrawler, Request
from extractors.content_extractor import ContentExtractor
from storage.json_storage import JSONStorage
from storage.db_storage import DatabaseStorage
from config.settings import settings
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ArticleCrawler:
    """Main article crawler using Crawlee"""

    def __init__(self, storage_type: str = 'json'):
        self.extractor = ContentExtractor()

        # Initialize storage
        if storage_type == 'json':
            self.storage = JSONStorage(settings.DATA_DIR)
        elif storage_type == 'sqlite':
            self.storage = DatabaseStorage(settings.DB_PATH)
        else:
            raise ValueError(f"Unsupported storage type: {storage_type}")

        # Statistics
        self.stats = {
            'urls_processed': 0,
            'articles_extracted': 0,
            'errors': 0,
            'start_time': None,
            'end_time': None
        }

        # Setup crawler
        self.crawler = BeautifulSoupCrawler(
            max_concurrency=settings.MAX_CONCURRENT_REQUESTS,
            max_request_retries=2,
            request_timeout=settings.REQUEST_TIMEOUT
        )

        self._setup_handlers()

    def _setup_handlers(self):
        """Setup crawler request handlers"""

        @self.crawler.pre_navigation_hooks.append
        async def set_user_agent(context):
            """Set custom user agent"""
            context.request.headers['User-Agent'] = settings.USER_AGENT

        @self.crawler.router.default_handler
        async def article_handler(context):
            """Handle article page processing"""
            url = context.request.url
            self.stats['urls_processed'] += 1

            try:
                logger.info(f"Processing: {url}")

                # Extract article data
                html_content = context.http_response.text
                article_data = self.extractor.extract_article_data(html_content, url)

                if article_data:
                    # Save article data
                    if hasattr(self.storage, 'save_article'):
                        result = self.storage.save_article(article_data)
                        logger.info(f"Saved article: {article_data['title'][:50]}...")
                    else:
                        # Batch save for database storage
                        result = self.storage.save_batch([article_data])

                    self.stats['articles_extracted'] += 1
                    logger.info(f"Successfully extracted and saved article from {url}")
                else:
                    logger.warning(f"Could not extract article data from {url}")

            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"Error processing {url}: {e}")

        @self.crawler.router.error_handler
        async def error_handler(context):
            """Handle request errors"""
            self.stats['errors'] += 1
            logger.error(f"Request failed for {context.request.url}: {context.error}")

    async def crawl_urls(self, urls: List[str], max_requests: Optional[int] = None) -> Dict[str, Any]:
        """
        Crawl a list of URLs

        Args:
            urls: List of URLs to crawl
            max_requests: Maximum number of requests (overrides settings)

        Returns:
            Crawling statistics
        """
        self.stats['start_time'] = datetime.now()

        # Limit requests if specified
        if max_requests:
            urls = urls[:max_requests]

        logger.info(f"Starting crawl of {len(urls)} URLs")

        # Create requests
        requests = [Request.from_url(url) for url in urls]

        # Run crawler
        await self.crawler.run(requests)

        self.stats['end_time'] = datetime.now()

        # Calculate duration
        duration = self.stats['end_time'] - self.stats['start_time']
        self.stats['duration_seconds'] = duration.total_seconds()

        logger.info(f"Crawl completed. Processed: {self.stats['urls_processed']}, "
                   f"Extracted: {self.stats['articles_extracted']}, "
                   f"Errors: {self.stats['errors']}")

        return self.stats

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return self.storage.get_stats()

    def search_stored_content(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search through stored content"""
        if hasattr(self.storage, 'search_articles'):
            return self.storage.search_articles(query, limit)
        else:
            logger.warning("Search not supported for this storage type")
            return []
```

### Part 5: Main Application

#### Step 7: Create Main Application

**main.py:**
```python
#!/usr/bin/env python3
"""
Basic Crawlee Python Crawler Workshop

This script demonstrates a complete web crawler that extracts article titles and content,
then saves the data to JSON files or a SQLite database.
"""

import asyncio
import logging
import argparse
from datetime import datetime

from crawlers.article_crawler import ArticleCrawler
from config.settings import settings

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Basic Crawlee Python Crawler')

    parser.add_argument(
        'urls',
        nargs='*',
        help='URLs to crawl (if not provided, uses default test URLs)'
    )

    parser.add_argument(
        '--storage',
        choices=['json', 'sqlite'],
        default=settings.STORAGE_TYPE,
        help='Storage type for crawled data'
    )

    parser.add_argument(
        '--max-requests',
        type=int,
        default=settings.MAX_REQUESTS_PER_CRAWL,
        help='Maximum number of requests to make'
    )

    parser.add_argument(
        '--search',
        help='Search stored content for a query'
    )

    parser.add_argument(
        '--stats',
        action='store_true',
        help='Show storage statistics'
    )

    return parser.parse_args()

async def main():
    """Main application entry point"""
    setup_logging()
    logger = logging.getLogger(__name__)

    args = parse_arguments()

    # Create crawler
    crawler = ArticleCrawler(storage_type=args.storage)

    if args.stats:
        # Show storage statistics
        stats = crawler.get_storage_stats()
        print("Storage Statistics:")
        for key, value in stats.items():
            print(f"  {key}: {value}")

        return

    if args.search:
        # Search stored content
        results = crawler.search_stored_content(args.search)
        print(f"Search results for '{args.search}':")
        for i, result in enumerate(results, 1):
            print(f"{i}. {result.get('title', 'No title')}")
            print(f"   URL: {result.get('url')}")
            if result.get('author'):
                print(f"   Author: {result.get('author')}")
            print()

        return

    # Determine URLs to crawl
    urls = args.urls if args.urls else settings.DEFAULT_URLS

    print(f"Starting crawler with {args.storage} storage")
    print(f"Crawling {len(urls)} URLs:")
    for url in urls:
        print(f"  - {url}")
    print()

    # Run crawler
    start_time = datetime.now()
    stats = await crawler.crawl_urls(urls, args.max_requests)
    end_time = datetime.now()

    # Print results
    print("\nCrawling completed!")
    print("=" * 50)
    print(f"Duration: {stats['duration_seconds']:.2f} seconds")
    print(f"URLs processed: {stats['urls_processed']}")
    print(f"Articles extracted: {stats['articles_extracted']}")
    print(f"Errors: {stats['errors']}")
    print(f"Success rate: {(stats['articles_extracted'] / stats['urls_processed'] * 100):.1f}%" if stats['urls_processed'] > 0 else "0%")

    # Show storage stats
    storage_stats = crawler.get_storage_stats()
    print(f"\nStorage stats: {storage_stats}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 6: Testing the Crawler

#### Step 8: Create Test Script

**test_crawler.py:**
```python
#!/usr/bin/env python3
"""
Test script for the basic crawler
"""

import asyncio
from crawlers.article_crawler import ArticleCrawler
from extractors.content_extractor import ContentExtractor
from storage.json_storage import JSONStorage
from storage.db_storage import DatabaseStorage

async def test_content_extraction():
    """Test content extraction with sample HTML"""
    print("Testing content extraction...")

    extractor = ContentExtractor()

    # Simple HTML test
    sample_html = """
    <html>
    <head><title>Test Article Title</title></head>
    <body>
        <h1>Test Article Title</h1>
        <p>This is the main content of the article.</p>
        <p>It contains multiple paragraphs with useful information.</p>
    </body>
    </html>
    """

    result = extractor.extract_article_data(sample_html, "https://example.com/test")

    if result:
        print("✓ Content extraction successful")
        print(f"  Title: {result['title']}")
        print(f"  Content length: {len(result['content'])}")
    else:
        print("✗ Content extraction failed")

async def test_json_storage():
    """Test JSON storage functionality"""
    print("\nTesting JSON storage...")

    storage = JSONStorage("test_data")

    test_article = {
        'title': 'Test Article',
        'content': 'This is test content for storage testing.',
        'url': 'https://example.com/test'
    }

    # Save article
    filepath = storage.save_article(test_article)
    print(f"✓ Article saved to: {filepath}")

    # Load article
    loaded = storage.load_article(filepath.split('/')[-1])
    if loaded and loaded['title'] == test_article['title']:
        print("✓ Article loaded successfully")
    else:
        print("✗ Article loading failed")

async def test_database_storage():
    """Test database storage functionality"""
    print("\nTesting database storage...")

    storage = DatabaseStorage("test_data/test.db")

    test_article = {
        'title': 'Database Test Article',
        'content': 'This is test content for database storage.',
        'url': 'https://example.com/db-test'
    }

    # Save article
    article_id = storage.save_article(test_article)
    print(f"✓ Article saved with ID: {article_id}")

    # Load article
    loaded = storage.get_article(article_id)
    if loaded and loaded['title'] == test_article['title']:
        print("✓ Article loaded successfully")
    else:
        print("✗ Article loading failed")

async def test_crawler():
    """Test the complete crawler"""
    print("\nTesting complete crawler...")

    crawler = ArticleCrawler(storage_type='json')

    test_urls = [
        'https://httpbin.org/html',  # Simple HTML page
    ]

    stats = await crawler.crawl_urls(test_urls, max_requests=1)

    if stats['articles_extracted'] > 0:
        print("✓ Crawler extracted articles successfully")
        print(f"  Articles extracted: {stats['articles_extracted']}")
    else:
        print("✗ Crawler failed to extract articles")

    # Show storage stats
    storage_stats = crawler.get_storage_stats()
    print(f"  Storage stats: {storage_stats}")

async def main():
    """Run all tests"""
    print("Running Basic Crawler Tests")
    print("=" * 40)

    await test_content_extraction()
    await test_json_storage()
    await test_database_storage()
    await test_crawler()

    print("\n" + "=" * 40)
    print("Testing completed!")

if __name__ == "__main__":
    asyncio.run(main())
```

## Running the Workshop

### Basic Usage

```bash
# Activate virtual environment
source .venv/bin/activate

# Test the crawler components
python test_crawler.py

# Crawl a single URL and save to JSON
python main.py https://httpbin.org/html

# Crawl multiple URLs
python main.py https://httpbin.org/html https://example.com

# Use database storage instead of JSON
python main.py --storage sqlite https://httpbin.org/html

# Limit the number of requests
python main.py --max-requests 5 https://httpbin.org/html

# Search stored content
python main.py --search "test"

# Show storage statistics
python main.py --stats
```

### Advanced Usage

```bash
# Crawl with custom settings
MAX_CONCURRENT_REQUESTS=1 MAX_REQUESTS_PER_CRAWL=10 python main.py \
    https://httpbin.org/html

# Use different storage
STORAGE_TYPE=sqlite python main.py \
    https://httpbin.org/html

# Crawl with custom user agent
USER_AGENT="MyCustomCrawler/1.0" python main.py \
    https://httpbin.org/html
```

### Expected Output

```
Starting crawler with json storage
Crawling 1 URLs:
  - https://httpbin.org/html

INFO - Processing: https://httpbin.org/html
INFO - Successfully extracted and saved article from https://httpbin.org/html

Crawling completed!
==================================================
Duration: 1.23 seconds
URLs processed: 1
Articles extracted: 1
Errors: 0
Success rate: 100.0%

Storage stats: {'total_files': 1, 'total_batches': 0, 'total_size_mb': 0.001, 'storage_type': 'json'}
```

## Challenge Exercises

### Challenge 1: Add More Content Types
1. Extend the content extractor to handle different page types (news, blog, documentation)
2. Add support for extracting images and links
3. Implement content categorization based on structure

### Challenge 2: Improve Error Handling
1. Add retry logic for failed extractions
2. Implement circuit breaker pattern for unreliable sites
3. Add comprehensive error logging and reporting

### Challenge 3: Add Monitoring
1. Implement real-time crawler statistics
2. Add progress reporting during long crawls
3. Create a simple web dashboard for crawler status

## Verification Checklist

### Content Extraction
- [ ] Extracts titles from various HTML structures
- [ ] Extracts main content from article pages
- [ ] Handles different content layouts and selectors
- [ ] Gracefully handles missing or malformed content

### Storage Options
- [ ] JSON storage saves individual article files
- [ ] Database storage saves to SQLite with proper schema
- [ ] Both storage types support basic search functionality
- [ ] Storage statistics are accurate and informative

### Crawler Functionality
- [ ] Crawler processes URLs from command line arguments
- [ ] Handles HTTP errors and timeouts gracefully
- [ ] Respects crawler settings (concurrency, timeouts)
- [ ] Provides detailed statistics after crawling

### Code Quality
- [ ] Well-structured classes and functions
- [ ] Proper error handling and logging
- [ ] Configuration management with environment variables
- [ ] Clean separation of concerns (extraction, storage, crawling)

## Next Steps
- [Workshop: Persian Website Crawler](../workshops/workshop-02-persian-website-crawler.md)
- [Workshop: Pagination Crawler](../workshops/workshop-03-pagination-crawler.md)

## Additional Resources
- [Crawlee Python Documentation](https://crawlee-python.dev/)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Web Scraping Best Practices](https://blog.apify.com/web-scraping-legality/)

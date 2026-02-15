# Tutorial 05: Storage Options and Data Persistence

## Overview
This tutorial covers various storage options for crawled data, including JSON file storage, database storage, and cloud storage solutions. You'll learn how to choose appropriate storage methods, implement data persistence, and handle data retrieval for your crawling applications.

## JSON File Storage

### Basic JSON Storage

```python
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import gzip
import uuid

class JSONDataStorage:
    """Simple JSON-based data storage"""

    def __init__(self, base_dir: str = "crawled_data"):
        self.base_dir = base_dir
        self.ensure_directory_exists()

    def ensure_directory_exists(self):
        """Create storage directory if it doesn't exist"""
        os.makedirs(self.base_dir, exist_ok=True)

    def save_article(self, article: Dict[str, Any], filename: Optional[str] = None) -> str:
        """Save a single article to JSON file"""
        if not filename:
            # Generate filename based on title or ID
            title_slug = self._create_slug(article.get('title', 'untitled'))
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{title_slug}.json"

        filepath = os.path.join(self.base_dir, filename)

        # Add metadata
        article_with_meta = {
            **article,
            'stored_at': datetime.now().isoformat(),
            'storage_type': 'json_single'
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article_with_meta, f, ensure_ascii=False, indent=2)

        return filepath

    def save_batch(self, articles: List[Dict[str, Any]], batch_name: Optional[str] = None) -> str:
        """Save multiple articles to a single JSON file"""
        if not batch_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            batch_name = f"batch_{timestamp}"

        filename = f"{batch_name}.json"
        filepath = os.path.join(self.base_dir, filename)

        batch_data = {
            'batch_info': {
                'name': batch_name,
                'created_at': datetime.now().isoformat(),
                'article_count': len(articles),
                'storage_type': 'json_batch'
            },
            'articles': articles
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

        return filepath

    def load_article(self, filename: str) -> Optional[Dict[str, Any]]:
        """Load a single article from JSON file"""
        filepath = os.path.join(self.base_dir, filename)

        if not os.path.exists(filepath):
            return None

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return None

    def list_articles(self) -> List[str]:
        """List all stored article files"""
        if not os.path.exists(self.base_dir):
            return []

        files = []
        for filename in os.listdir(self.base_dir):
            if filename.endswith('.json') and not filename.startswith('batch_'):
                files.append(filename)

        return sorted(files, reverse=True)  # Most recent first

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

    def _create_slug(self, title: str) -> str:
        """Create URL-friendly slug from title"""
        import re

        if not title:
            return f"article_{uuid.uuid4().hex[:8]}"

        # Remove non-alphanumeric characters
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        # Replace spaces and underscores with hyphens
        slug = re.sub(r'[\s_]+', '-', slug)
        # Remove multiple hyphens
        slug = re.sub(r'-+', '-', slug)
        # Trim hyphens from start/end
        slug = slug.strip('-')

        # Limit length
        if len(slug) > 50:
            slug = slug[:50].rstrip('-')

        if not slug:
            slug = f"article_{uuid.uuid4().hex[:8]}"

        return slug
```

### Compressed JSON Storage

```python
import gzip
import json
from typing import Dict, Any, List
import os

class CompressedJSONStorage(JSONDataStorage):
    """Compressed JSON storage for space efficiency"""

    def save_article(self, article: Dict[str, Any], filename: Optional[str] = None) -> str:
        """Save article with gzip compression"""
        if not filename:
            title_slug = self._create_slug(article.get('title', 'untitled'))
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{title_slug}.json.gz"

        filepath = os.path.join(self.base_dir, filename)

        article_with_meta = {
            **article,
            'stored_at': datetime.now().isoformat(),
            'storage_type': 'compressed_json'
        }

        with gzip.open(filepath, 'wt', encoding='utf-8') as f:
            json.dump(article_with_meta, f, ensure_ascii=False, indent=2)

        return filepath

    def load_article(self, filename: str) -> Optional[Dict[str, Any]]:
        """Load compressed article"""
        filepath = os.path.join(self.base_dir, filename)

        if not os.path.exists(filepath):
            return None

        try:
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError, gzip.BadGzipFile):
            return None

    def save_batch_compressed(self, articles: List[Dict[str, Any]], batch_name: Optional[str] = None) -> str:
        """Save batch with compression"""
        if not batch_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            batch_name = f"batch_compressed_{timestamp}"

        filename = f"{batch_name}.json.gz"
        filepath = os.path.join(self.base_dir, filename)

        batch_data = {
            'batch_info': {
                'name': batch_name,
                'created_at': datetime.now().isoformat(),
                'article_count': len(articles),
                'storage_type': 'compressed_batch',
                'compression': 'gzip'
            },
            'articles': articles
        }

        with gzip.open(filepath, 'wt', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

        return filepath
```

## Database Storage Options

### SQLite Storage

```python
import sqlite3
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

class SQLiteStorage:
    """SQLite-based storage for crawled data"""

    def __init__(self, db_path: str = "crawled_data.db"):
        self.db_path = db_path
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
                    author TEXT,
                    published_at TEXT,
                    crawled_at TEXT NOT NULL,
                    tags TEXT,  -- JSON array
                    metadata TEXT,  -- JSON object
                    created_at TEXT NOT NULL
                )
            ''')

            # Create indexes for better query performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_articles_crawled ON articles(crawled_at)')

            conn.commit()

    def save_article(self, article: Dict[str, Any]) -> int:
        """Save article to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Prepare data
            data = {
                'title': article.get('title', ''),
                'content': article.get('content'),
                'url': article['url'],
                'author': article.get('author'),
                'published_at': article.get('published_at'),
                'crawled_at': datetime.now().isoformat(),
                'tags': json.dumps(article.get('tags', []), ensure_ascii=False),
                'metadata': json.dumps(article.get('metadata', {}), ensure_ascii=False),
                'created_at': datetime.now().isoformat()
            }

            cursor.execute('''
                INSERT OR REPLACE INTO articles
                (title, content, url, author, published_at, crawled_at, tags, metadata, created_at)
                VALUES (:title, :content, :url, :author, :published_at, :crawled_at, :tags, :metadata, :created_at)
            ''', data)

            conn.commit()
            return cursor.lastrowid

    def get_article(self, article_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve article by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM articles WHERE id = ?', (article_id,))
            row = cursor.fetchone()

            if row:
                article = dict(row)
                # Parse JSON fields
                article['tags'] = json.loads(article['tags'] or '[]')
                article['metadata'] = json.loads(article['metadata'] or '{}')
                return article

        return None

    def search_articles(self, query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Search articles using SQLite FTS"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Use simple LIKE search (can be enhanced with FTS extensions)
            search_query = f"%{query}%"

            cursor.execute('''
                SELECT * FROM articles
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY crawled_at DESC
                LIMIT ? OFFSET ?
            ''', (search_query, search_query, limit, offset))

            results = []
            for row in cursor.fetchall():
                article = dict(row)
                article['tags'] = json.loads(article['tags'] or '[]')
                article['metadata'] = json.loads(article['metadata'] or '{}')
                results.append(article)

            return results

    def get_articles_by_author(self, author: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get articles by specific author"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('''
                SELECT * FROM articles
                WHERE author LIKE ?
                ORDER BY published_at DESC
                LIMIT ?
            ''', (f"%{author}%", limit))

            results = []
            for row in cursor.fetchall():
                article = dict(row)
                article['tags'] = json.loads(article['tags'] or '[]')
                article['metadata'] = json.loads(article['metadata'] or '{}')
                results.append(article)

            return results

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get table statistics
            cursor.execute("SELECT COUNT(*) FROM articles")
            total_articles = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT author) FROM articles WHERE author IS NOT NULL")
            unique_authors = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT date(published_at)) FROM articles WHERE published_at IS NOT NULL")
            days_with_articles = cursor.fetchone()[0]

            return {
                'total_articles': total_articles,
                'unique_authors': unique_authors,
                'days_with_content': days_with_articles,
                'database_size_mb': os.path.getsize(self.db_path) / (1024 * 1024)
            }
```

### PostgreSQL Storage with Full-Text Search

```python
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class PostgreSQLStorage:
    """PostgreSQL-based storage with full-text search"""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.init_database()

    def init_database(self):
        """Initialize database schema"""
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                # Create articles table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS articles (
                        id SERIAL PRIMARY KEY,
                        title TEXT NOT NULL,
                        content TEXT,
                        url TEXT UNIQUE NOT NULL,
                        author TEXT,
                        published_at TIMESTAMP,
                        crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        tags JSONB,
                        metadata JSONB,
                        search_vector TSVECTOR,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Create indexes
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector)')

                # Create function to update search vector
                cursor.execute('''
                    CREATE OR REPLACE FUNCTION update_search_vector()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.search_vector :=
                            setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                ''')

                # Create trigger
                cursor.execute('''
                    DROP TRIGGER IF EXISTS trigger_update_search_vector ON articles;
                    CREATE TRIGGER trigger_update_search_vector
                        BEFORE INSERT OR UPDATE ON articles
                        FOR EACH ROW EXECUTE FUNCTION update_search_vector();
                ''')

            conn.commit()

    def save_article(self, article: Dict[str, Any]) -> int:
        """Save article with full-text search indexing"""
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                data = {
                    'title': article.get('title', ''),
                    'content': article.get('content'),
                    'url': article['url'],
                    'author': article.get('author'),
                    'published_at': article.get('published_at'),
                    'tags': json.dumps(article.get('tags', [])),
                    'metadata': json.dumps(article.get('metadata', {}))
                }

                cursor.execute('''
                    INSERT INTO articles (title, content, url, author, published_at, tags, metadata)
                    VALUES (%(title)s, %(content)s, %(url)s, %(author)s, %(published_at)s, %(tags)s, %(metadata)s)
                    ON CONFLICT (url) DO UPDATE SET
                        title = EXCLUDED.title,
                        content = EXCLUDED.content,
                        author = EXCLUDED.author,
                        published_at = EXCLUDED.published_at,
                        tags = EXCLUDED.tags,
                        metadata = EXCLUDED.metadata,
                        crawled_at = CURRENT_TIMESTAMP
                    RETURNING id
                ''', data)

                result = cursor.fetchone()
                conn.commit()

                return result[0] if result else None

    def search_articles(self, query: str, limit: int = 20, offset: int = 0,
                       filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Full-text search with filters"""
        with psycopg2.connect(self.connection_string, cursor_factory=RealDictCursor) as conn:
            with conn.cursor() as cursor:
                # Build query
                sql = """
                    SELECT id, title, content, url, author, published_at, crawled_at, tags, metadata,
                           ts_rank(search_vector, query) as relevance_score
                    FROM articles, plainto_tsquery('english', %s) query
                    WHERE search_vector @@ query
                """

                params = [query]

                # Add filters
                if filters:
                    if filters.get('author'):
                        sql += " AND author ILIKE %s"
                        params.append(f"%{filters['author']}%")

                    if filters.get('date_from'):
                        sql += " AND published_at >= %s"
                        params.append(filters['date_from'])

                    if filters.get('date_to'):
                        sql += " AND published_at <= %s"
                        params.append(filters['date_to'])

                    if filters.get('tags'):
                        sql += " AND tags ?| %s"
                        params.append(filters['tags'])

                # Add ordering and pagination
                sql += " ORDER BY relevance_score DESC, published_at DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])

                cursor.execute(sql, params)
                results = cursor.fetchall()

                # Convert to list of dicts
                articles = []
                for row in results:
                    article = dict(row)
                    # Parse JSON fields
                    article['tags'] = article['tags'] or []
                    article['metadata'] = article['metadata'] or {}
                    articles.append(article)

                return articles

    def get_similar_articles(self, article_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Find similar articles using full-text search"""
        with psycopg2.connect(self.connection_string, cursor_factory=RealDictCursor) as conn:
            with conn.cursor() as cursor:
                # Get the original article's search vector
                cursor.execute("SELECT search_vector FROM articles WHERE id = %s", (article_id,))
                result = cursor.fetchone()

                if not result:
                    return []

                search_vector = result['search_vector']

                # Find similar articles
                cursor.execute("""
                    SELECT id, title, url, author, published_at,
                           ts_rank(search_vector, %s) as similarity_score
                    FROM articles
                    WHERE id != %s AND search_vector @@ %s
                    ORDER BY similarity_score DESC
                    LIMIT %s
                """, (search_vector, article_id, search_vector, limit))

                return [dict(row) for row in cursor.fetchall()]

    def get_popular_tags(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get most popular tags"""
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT tag, COUNT(*) as count
                    FROM articles, jsonb_array_elements_text(tags) as tag
                    WHERE tags IS NOT NULL
                    GROUP BY tag
                    ORDER BY count DESC
                    LIMIT %s
                """, (limit,))

                return [{'tag': row[0], 'count': row[1]} for row in cursor.fetchall()]
```

## Cloud Storage Integration

### AWS S3 Storage

```python
import boto3
import json
from typing import Dict, Any, List
from datetime import datetime
import os

class S3Storage:
    """AWS S3-based storage for crawled data"""

    def __init__(self, bucket_name: str, region: str = 'us-east-1'):
        self.bucket_name = bucket_name
        self.region = region

        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )

        # Ensure bucket exists
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except self.s3_client.exceptions.NoSuchBucket:
            self.s3_client.create_bucket(
                Bucket=self.bucket_name,
                CreateBucketConfiguration={'LocationConstraint': self.region}
            )

    def save_article(self, article: Dict[str, Any]) -> str:
        """Save article to S3"""
        # Create S3 key
        timestamp = datetime.now().strftime("%Y/%m/%d")
        title_slug = self._create_slug(article.get('title', 'untitled'))
        key = f"articles/{timestamp}/{title_slug}.json"

        # Add metadata
        article_data = {
            **article,
            'stored_at': datetime.now().isoformat(),
            'storage_type': 's3',
            's3_bucket': self.bucket_name,
            's3_key': key
        }

        # Upload to S3
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=json.dumps(article_data, ensure_ascii=False, indent=2),
            ContentType='application/json'
        )

        return f"s3://{self.bucket_name}/{key}"

    def load_article(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Load article from S3"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            content = response['Body'].read().decode('utf-8')
            return json.loads(content)
        except (self.s3_client.exceptions.NoSuchKey, json.JSONDecodeError):
            return None

    def list_articles(self, prefix: str = "articles/") -> List[str]:
        """List articles in S3"""
        keys = []
        paginator = self.s3_client.get_paginator('list_objects_v2')

        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
            if 'Contents' in page:
                keys.extend([obj['Key'] for obj in page['Contents']])

        return keys

    def save_batch(self, articles: List[Dict[str, Any]], batch_name: Optional[str] = None) -> str:
        """Save batch of articles to S3"""
        if not batch_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            batch_name = f"batch_{timestamp}"

        key = f"batches/{batch_name}.json"

        batch_data = {
            'batch_info': {
                'name': batch_name,
                'created_at': datetime.now().isoformat(),
                'article_count': len(articles),
                'storage_type': 's3_batch'
            },
            'articles': articles
        }

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=json.dumps(batch_data, ensure_ascii=False, indent=2),
            ContentType='application/json'
        )

        return f"s3://{self.bucket_name}/{key}"

    def _create_slug(self, title: str) -> str:
        """Create URL-friendly slug"""
        import re
        import uuid

        if not title:
            return f"article_{uuid.uuid4().hex[:8]}"

        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')

        if len(slug) > 50:
            slug = slug[:50].rstrip('-')

        if not slug:
            slug = f"article_{uuid.uuid4().hex[:8]}"

        return slug
```

## Hybrid Storage Strategy

### Intelligent Storage Selection

```python
from typing import Dict, Any, List, Protocol
from abc import ABC, abstractmethod

class StorageBackend(Protocol):
    """Protocol for storage backends"""

    def save_article(self, article: Dict[str, Any]) -> str:
        """Save article and return identifier"""
        ...

    def load_article(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Load article by identifier"""
        ...

    def search_articles(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Search articles"""
        ...

class HybridStorage:
    """Intelligent storage that chooses backend based on data characteristics"""

    def __init__(self):
        self.backends = {
            'json': JSONDataStorage(),
            'sqlite': SQLiteStorage(),
            'postgres': PostgreSQLStorage(os.getenv('DATABASE_URL')),
            's3': S3Storage(os.getenv('S3_BUCKET'))
        }

        # Storage strategy rules
        self.strategies = {
            'small_dataset': 'json',      # < 1000 articles
            'medium_dataset': 'sqlite',   # 1000-10000 articles
            'large_dataset': 'postgres',  # > 10000 articles
            'backup': 's3',               # Long-term backup
            'persian_content': 'postgres' # Persian content needs FTS
        }

    def save_article(self, article: Dict[str, Any], strategy: str = 'auto') -> str:
        """Save article using appropriate storage strategy"""
        if strategy == 'auto':
            strategy = self._choose_strategy(article)

        backend = self.backends[self.strategies[strategy]]
        return backend.save_article(article)

    def _choose_strategy(self, article: Dict[str, Any]) -> str:
        """Choose storage strategy based on article characteristics"""

        # Check if it's Persian content
        content = article.get('content', '')
        if self._is_persian_content(content):
            return 'persian_content'

        # Check dataset size (simplified - in practice you'd track this)
        # For now, default to SQLite for development
        return 'medium_dataset'

    def _is_persian_content(self, text: str) -> bool:
        """Check if content is Persian"""
        if not text:
            return False

        persian_chars = len(re.findall(r'[\u0600-\u06FF]', text))
        return (persian_chars / len(text)) > 0.1

    def search_articles(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Search across all storage backends"""
        all_results = []

        # Search each backend
        for backend_name, backend in self.backends.items():
            try:
                results = backend.search_articles(query, **kwargs)
                # Add backend info to results
                for result in results:
                    result['_backend'] = backend_name
                all_results.extend(results)
            except Exception as e:
                print(f"Search failed on {backend_name}: {e}")

        # Sort by relevance (simplified)
        all_results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)

        return all_results[:kwargs.get('limit', 20)]

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get statistics from all storage backends"""
        stats = {}

        for backend_name, backend in self.backends.items():
            try:
                if hasattr(backend, 'get_stats'):
                    stats[backend_name] = backend.get_stats()
                else:
                    stats[backend_name] = {'status': 'no_stats_available'}
            except Exception as e:
                stats[backend_name] = {'error': str(e)}

        return stats
```

## Data Backup and Recovery

### Backup Manager

```python
import shutil
import gzip
from pathlib import Path
from typing import Dict, Any, List
import json

class BackupManager:
    """Manage data backups and recovery"""

    def __init__(self, backup_dir: str = "backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)

    def create_full_backup(self, storage_backends: Dict[str, Any]) -> str:
        """Create full backup of all storage backends"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"full_backup_{timestamp}"

        backup_path = self.backup_dir / backup_name
        backup_path.mkdir()

        backup_manifest = {
            'backup_name': backup_name,
            'created_at': datetime.now().isoformat(),
            'backends': {}
        }

        # Backup each storage backend
        for backend_name, backend in storage_backends.items():
            try:
                backend_backup = self._backup_backend(backend_name, backend, backup_path)
                backup_manifest['backends'][backend_name] = backend_backup
            except Exception as e:
                backup_manifest['backends'][backend_name] = {'error': str(e)}

        # Save manifest
        manifest_path = backup_path / "manifest.json"
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(backup_manifest, f, ensure_ascii=False, indent=2)

        # Compress backup
        archive_path = self.backup_dir / f"{backup_name}.tar.gz"
        self._compress_backup(backup_path, archive_path)

        # Clean up uncompressed backup
        shutil.rmtree(backup_path)

        return str(archive_path)

    def _backup_backend(self, backend_name: str, backend, backup_path: Path) -> Dict[str, Any]:
        """Backup a specific storage backend"""
        backend_backup_path = backup_path / backend_name
        backend_backup_path.mkdir()

        if backend_name == 'json':
            # Copy JSON files
            json_dir = Path(backend.base_dir)
            if json_dir.exists():
                shutil.copytree(json_dir, backend_backup_path / "data", dirs_exist_ok=True)

            return {
                'type': 'file_copy',
                'source': str(json_dir),
                'files_copied': len(list(backend_backup_path.glob("**/*.json")))
            }

        elif backend_name == 'sqlite':
            # Copy SQLite database
            db_path = Path(backend.db_path)
            if db_path.exists():
                shutil.copy2(db_path, backend_backup_path / db_path.name)

            return {
                'type': 'file_copy',
                'source': str(db_path),
                'size_bytes': db_path.stat().st_size
            }

        elif backend_name == 'postgres':
            # Use pg_dump for PostgreSQL
            dump_file = backend_backup_path / "postgres_dump.sql"
            # In practice, you'd call pg_dump here
            return {
                'type': 'pg_dump',
                'dump_file': str(dump_file)
            }

        return {'type': 'unsupported'}

    def _compress_backup(self, backup_path: Path, archive_path: Path):
        """Compress backup directory"""
        import tarfile

        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(backup_path, arcname=backup_path.name)

    def list_backups(self) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []

        for archive_path in self.backup_dir.glob("*.tar.gz"):
            try:
                # Extract manifest info
                with tarfile.open(archive_path, "r:gz") as tar:
                    manifest_file = tar.extractfile("manifest.json")
                    if manifest_file:
                        manifest = json.loads(manifest_file.read().decode('utf-8'))
                        manifest['archive_path'] = str(archive_path)
                        manifest['size_mb'] = archive_path.stat().st_size / (1024 * 1024)
                        backups.append(manifest)
            except Exception as e:
                backups.append({
                    'backup_name': archive_path.stem,
                    'error': str(e),
                    'archive_path': str(archive_path)
                })

        return sorted(backups, key=lambda x: x.get('created_at', ''), reverse=True)

    def restore_backup(self, backup_name: str, target_backends: Dict[str, Any]):
        """Restore from backup"""
        archive_path = self.backup_dir / f"{backup_name}.tar.gz"

        if not archive_path.exists():
            raise FileNotFoundError(f"Backup {backup_name} not found")

        # Extract backup
        extract_path = self.backup_dir / f"restore_{backup_name}"
        extract_path.mkdir()

        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(extract_path)

        # Restore each backend
        manifest_path = extract_path / "manifest.json"
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        restored_backends = {}
        for backend_name, backend_info in manifest['backends'].items():
            if backend_name in target_backends:
                try:
                    self._restore_backend(backend_name, backend_info, extract_path, target_backends[backend_name])
                    restored_backends[backend_name] = {'status': 'restored'}
                except Exception as e:
                    restored_backends[backend_name] = {'status': 'error', 'error': str(e)}

        # Clean up
        shutil.rmtree(extract_path)

        return {
            'backup_name': backup_name,
            'restored_backends': restored_backends,
            'restore_time': datetime.now().isoformat()
        }

    def _restore_backend(self, backend_name: str, backend_info: Dict, extract_path: Path, target_backend):
        """Restore a specific backend"""
        backend_restore_path = extract_path / backend_name

        if backend_name == 'json':
            # Copy JSON files back
            json_dir = Path(target_backend.base_dir)
            if backend_restore_path.exists():
                for json_file in backend_restore_path.glob("**/*.json"):
                    relative_path = json_file.relative_to(backend_restore_path)
                    target_file = json_dir / relative_path
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(json_file, target_file)

        elif backend_name == 'sqlite':
            # Copy SQLite database back
            db_files = list(backend_restore_path.glob("*.db"))
            if db_files:
                shutil.copy2(db_files[0], target_backend.db_path)
```

## Hands-on Exercises

### Exercise 1: JSON Storage Implementation
1. Create a JSON storage class with batch operations
2. Implement compressed storage for large datasets
3. Add search functionality to JSON storage
4. Compare performance with different compression levels

### Exercise 2: Database Storage
1. Set up SQLite storage with proper indexing
2. Implement PostgreSQL storage with full-text search
3. Create migration scripts for schema changes
4. Compare query performance across storage types

### Exercise 3: Hybrid Storage Strategy
1. Implement automatic storage selection based on data size
2. Create data synchronization between storage backends
3. Implement backup and restore functionality
4. Build monitoring for storage performance

## Next Steps
- [Workshop: Basic Crawler](../workshops/workshop-01-basic-crawler.md)

## Additional Resources
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Data Backup Strategies](https://en.wikipedia.org/wiki/Backup)

# Tutorial 04: Duplicate Data Handling and Deduplication

## Overview
This tutorial covers strategies for detecting, preventing, and handling duplicate data in ETL pipelines. You'll learn various deduplication techniques, similarity matching algorithms, and database-level duplicate prevention strategies essential for maintaining data quality in web scraping pipelines.

## Understanding Duplicates in Web Scraping

### Types of Duplicates

#### 1. Exact Duplicates
- Identical content from the same URL
- Multiple crawls of the same page
- Database insertion errors

#### 2. Near Duplicates
- Same content, different URLs
- Minor content variations
- Updated versions of articles

#### 3. Structural Duplicates
- Same data, different formats
- Reorganized content structure
- Different metadata, same core content

### Sources of Duplicates

```python
# Common duplicate sources in web scraping
duplicate_sources = {
    'url_variations': [
        'https://example.com/article/123',
        'https://example.com/article/123/',  # Trailing slash
        'https://www.example.com/article/123',  # www prefix
        'https://example.com/article/123?utm_source=newsletter'  # Query params
    ],
    'content_republication': [
        'Original article on news-site.com',
        'Same article republished on aggregator.com',
        'Same article syndicated to partner-site.com'
    ],
    'content_updates': [
        'Original article (v1)',
        'Updated article with new information (v2)',
        'Article with minor edits (v3)'
    ]
}
```

## URL Normalization and Deduplication

### URL Normalization Strategies

```python
import re
from urllib.parse import urlparse, urljoin, parse_qs, urlencode
from typing import Set, Dict, List
import hashlib

class URLNormalizer:
    def __init__(self):
        # Tracking parameters to remove
        self.tracking_params = {
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'session_id', 'ref', 'source'
        }

    def normalize_url(self, url: str) -> str:
        """Normalize URL for deduplication"""
        if not url:
            return ""

        try:
            parsed = urlparse(url)

            # Normalize scheme to https
            scheme = parsed.scheme.lower()
            if scheme == 'http' and parsed.netloc:
                # Only upgrade if it looks like it should be HTTPS
                scheme = 'https'

            # Normalize netloc (remove www, lowercase)
            netloc = parsed.netloc.lower()
            if netloc.startswith('www.'):
                netloc = netloc[4:]

            # Clean query parameters
            query_params = parse_qs(parsed.query)
            clean_params = {}

            for key, values in query_params.items():
                if key.lower() not in self.tracking_params:
                    # Keep only non-tracking parameters
                    clean_params[key] = values[0] if len(values) == 1 else values

            # Reconstruct query string
            query = urlencode(clean_params, doseq=True) if clean_params else ""

            # Normalize path (remove trailing slashes, except for root)
            path = parsed.path
            if len(path) > 1 and path.endswith('/'):
                path = path.rstrip('/')

            # Reconstruct normalized URL
            normalized = f"{scheme}://{netloc}{path}"
            if query:
                normalized += f"?{query}"

            return normalized

        except Exception as e:
            # If parsing fails, return original URL
            return url

    def generate_url_fingerprint(self, url: str) -> str:
        """Generate a fingerprint for URL deduplication"""
        normalized = self.normalize_url(url)

        # Create a hash of the normalized URL
        fingerprint = hashlib.md5(normalized.encode('utf-8')).hexdigest()
        return fingerprint

class URLDeduplicator:
    def __init__(self):
        self.normalizer = URLNormalizer()
        self.seen_urls: Set[str] = set()
        self.url_fingerprints: Set[str] = set()

    def is_duplicate_url(self, url: str) -> bool:
        """Check if URL is a duplicate"""
        fingerprint = self.normalizer.generate_url_fingerprint(url)

        if fingerprint in self.url_fingerprints:
            return True

        # Also check exact normalized URL
        normalized = self.normalizer.normalize_url(url)
        if normalized in self.seen_urls:
            return True

        return False

    def add_url(self, url: str) -> bool:
        """Add URL to deduplication set. Returns True if added, False if duplicate"""
        if self.is_duplicate_url(url):
            return False

        normalized = self.normalizer.normalize_url(url)
        fingerprint = self.normalizer.generate_url_fingerprint(url)

        self.seen_urls.add(normalized)
        self.url_fingerprints.add(fingerprint)

        return True

    def get_statistics(self) -> Dict[str, int]:
        """Get deduplication statistics"""
        return {
            'unique_normalized_urls': len(self.seen_urls),
            'unique_fingerprints': len(self.url_fingerprints)
        }
```

## Content-Based Deduplication

### Text Similarity Algorithms

```python
import difflib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import jellyfish  # For phonetic matching
from typing import List, Tuple, Dict
import re

class ContentDeduplicator:
    def __init__(self, similarity_threshold: float = 0.85):
        self.similarity_threshold = similarity_threshold
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.processed_texts: List[str] = []
        self.text_hashes: Set[str] = set()

    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""

        # Convert to lowercase
        text = text.lower()

        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        # Remove punctuation
        text = re.sub(r'[^\w\s]', '', text)

        return text

    def generate_text_hash(self, text: str) -> str:
        """Generate hash of normalized text"""
        normalized = self.normalize_text(text)
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts"""
        # Normalize texts
        norm1 = self.normalize_text(text1)
        norm2 = self.normalize_text(text2)

        # Exact match
        if norm1 == norm2:
            return 1.0

        # Length difference check
        len1, len2 = len(norm1), len(norm2)
        if abs(len1 - len2) / max(len1, len2) > 0.5:
            return 0.0

        # Sequence matcher (good for similar texts)
        seq_similarity = difflib.SequenceMatcher(None, norm1, norm2).ratio()

        # TF-IDF cosine similarity (good for semantic similarity)
        try:
            tfidf_matrix = self.vectorizer.fit_transform([norm1, norm2])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        except:
            cosine_sim = 0.0

        # Combine similarities (weighted average)
        combined_similarity = (seq_similarity * 0.7) + (cosine_sim * 0.3)

        return combined_similarity

    def find_similar_content(self, new_text: str) -> List[Tuple[str, float]]:
        """Find similar content in processed texts"""
        similar_texts = []

        for existing_text in self.processed_texts:
            similarity = self.calculate_similarity(new_text, existing_text)
            if similarity >= self.similarity_threshold:
                similar_texts.append((existing_text, similarity))

        return similar_texts

    def is_duplicate_content(self, text: str) -> Tuple[bool, List[Tuple[str, float]]]:
        """Check if content is duplicate"""
        # Check exact hash first
        text_hash = self.generate_text_hash(text)
        if text_hash in self.text_hashes:
            return True, []

        # Find similar content
        similar_texts = self.find_similar_content(text)

        if similar_texts:
            return True, similar_texts

        return False, []

    def add_content(self, text: str) -> bool:
        """Add content to deduplication set. Returns True if added, False if duplicate"""
        is_duplicate, similar_texts = self.is_duplicate_content(text)

        if is_duplicate:
            return False

        # Add to processed texts
        normalized = self.normalize_text(text)
        self.processed_texts.append(normalized)

        # Add hash
        text_hash = self.generate_text_hash(text)
        self.text_hashes.add(text_hash)

        return True
```

### Semantic Deduplication

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Tuple

class SemanticDeduplicator:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2', threshold: float = 0.8):
        self.model = SentenceTransformer(model_name)
        self.threshold = threshold
        self.embeddings: List[np.ndarray] = []
        self.texts: List[str] = []

    def encode_text(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        return self.model.encode([text])[0]

    def calculate_semantic_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between embeddings"""
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def find_semantic_duplicates(self, text: str) -> List[Tuple[str, float]]:
        """Find semantically similar texts"""
        if not self.embeddings:
            return []

        # Generate embedding for new text
        new_embedding = self.encode_text(text)

        # Calculate similarities
        similarities = []
        for i, existing_embedding in enumerate(self.embeddings):
            similarity = self.calculate_semantic_similarity(new_embedding, existing_embedding)
            if similarity >= self.threshold:
                similarities.append((self.texts[i], similarity))

        return sorted(similarities, key=lambda x: x[1], reverse=True)

    def is_semantic_duplicate(self, text: str) -> Tuple[bool, List[Tuple[str, float]]]:
        """Check if text is semantically duplicate"""
        similar_texts = self.find_semantic_duplicates(text)
        return len(similar_texts) > 0, similar_texts

    def add_semantic_content(self, text: str) -> bool:
        """Add content for semantic deduplication"""
        is_duplicate, _ = self.is_semantic_duplicate(text)

        if is_duplicate:
            return False

        # Add to collections
        embedding = self.encode_text(text)
        self.embeddings.append(embedding)
        self.texts.append(text)

        return True
```

## Database-Level Deduplication

### PostgreSQL Deduplication Strategies

```sql
-- Create unique constraints for exact duplicates
ALTER TABLE articles ADD CONSTRAINT unique_url UNIQUE (url);
ALTER TABLE articles ADD CONSTRAINT unique_slug UNIQUE (slug);

-- Create partial indexes for conditional uniqueness
CREATE UNIQUE INDEX idx_unique_title_per_author
ON articles (title, author_id)
WHERE published = true;

-- Use UPSERT for handling duplicates on insert
INSERT INTO articles (url, title, content, crawled_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    crawled_at = EXCLUDED.crawled_at,
    updated_at = CURRENT_TIMESTAMP;

-- Create indexes for duplicate detection queries
CREATE INDEX idx_articles_content_hash ON articles USING HASH ((md5(content)));
CREATE INDEX idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);

-- Similarity search using trigram matching
SELECT * FROM articles
WHERE similarity(title, 'target title') > 0.3
ORDER BY similarity(title, 'target title') DESC;
```

### SQLAlchemy Deduplication Patterns

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import func, text

Base = declarative_base()

class Article(Base):
    __tablename__ = 'articles'

    id = Column(Integer, primary_key=True)
    url = Column(String(1000), unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    content_hash = Column(String(32), index=True)  # MD5 hash
    search_vector = Column(TSVECTOR)  # Full-text search

    # Create GIN index for full-text search
    __table_args__ = (
        Index('idx_articles_search_vector', search_vector, postgresql_using='gin'),
    )

class DatabaseDeduplicator:
    def __init__(self, db_session):
        self.db = db_session

    def check_url_exists(self, url: str) -> bool:
        """Check if URL already exists in database"""
        return self.db.query(Article).filter(Article.url == url).first() is not None

    def find_similar_content(self, content: str, threshold: float = 0.8) -> List[Article]:
        """Find similar content using database similarity functions"""
        # Use PostgreSQL's similarity function
        similar_articles = self.db.query(Article).filter(
            func.similarity(Article.content, content) > threshold
        ).order_by(func.similarity(Article.content, content).desc()).limit(5).all()

        return similar_articles

    def upsert_article(self, article_data: dict) -> Tuple[bool, Article]:
        """Insert or update article (UPSERT pattern)"""
        # Check for existing article
        existing = self.db.query(Article).filter(Article.url == article_data['url']).first()

        if existing:
            # Update existing
            for key, value in article_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            self.db.commit()
            return False, existing
        else:
            # Create new
            content_hash = hashlib.md5(article_data['content'].encode()).hexdigest()
            article_data['content_hash'] = content_hash

            # Create search vector for full-text search
            search_text = f"{article_data['title']} {article_data['content']}"
            article_data['search_vector'] = func.to_tsvector('english', search_text)

            new_article = Article(**article_data)
            self.db.add(new_article)
            self.db.commit()
            return True, new_article

    def batch_upsert_articles(self, articles_data: List[dict]) -> Dict[str, int]:
        """Batch upsert multiple articles"""
        stats = {
            'inserted': 0,
            'updated': 0,
            'duplicates': 0,
            'errors': 0
        }

        for article_data in articles_data:
            try:
                is_new, _ = self.upsert_article(article_data)
                if is_new:
                    stats['inserted'] += 1
                else:
                    stats['updated'] += 1

            except Exception as e:
                stats['errors'] += 1
                print(f"Error upserting article {article_data.get('url', 'unknown')}: {e}")

        return stats
```

## Multi-Level Deduplication Pipeline

### Comprehensive Deduplication System

```python
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class ComprehensiveDeduplicator:
    def __init__(self, db_session):
        self.url_deduplicator = URLDeduplicator()
        self.content_deduplicator = ContentDeduplicator()
        self.database_deduplicator = DatabaseDeduplicator(db_session)

        # Statistics
        self.stats = {
            'processed': 0,
            'url_duplicates': 0,
            'content_duplicates': 0,
            'database_duplicates': 0,
            'accepted': 0
        }

    def deduplicate_article(self, article: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Comprehensive deduplication check.
        Returns: (is_duplicate, reason, enriched_data)
        """
        self.stats['processed'] += 1

        # Level 1: URL Deduplication
        if self.url_deduplicator.is_duplicate_url(article.get('url', '')):
            self.stats['url_duplicates'] += 1
            return True, "URL already processed", article

        # Level 2: Content Deduplication (in-memory)
        content = article.get('content', '')
        is_duplicate, similar_texts = self.content_deduplicator.is_duplicate_content(content)

        if is_duplicate:
            self.stats['content_duplicates'] += 1
            return True, f"Similar content found: {len(similar_texts)} matches", article

        # Level 3: Database Deduplication
        if self.database_deduplicator.check_url_exists(article.get('url', '')):
            self.stats['database_duplicates'] += 1
            return True, "URL exists in database", article

        # Check for similar content in database
        similar_db_articles = self.database_deduplicator.find_similar_content(content)
        if similar_db_articles:
            self.stats['content_duplicates'] += 1
            return True, f"Similar content in database: {len(similar_db_articles)} matches", article

        # Mark as processed in memory deduplicators
        self.url_deduplicator.add_url(article.get('url', ''))
        self.content_deduplicator.add_content(content)

        self.stats['accepted'] += 1
        return False, "", article

    def process_batch(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process a batch of articles with deduplication"""
        accepted_articles = []
        duplicate_articles = []

        for article in articles:
            is_duplicate, reason, enriched_article = self.deduplicate_article(article)

            if is_duplicate:
                duplicate_articles.append({
                    'article': article,
                    'reason': reason
                })
            else:
                accepted_articles.append(enriched_article)

        return {
            'accepted': accepted_articles,
            'duplicates': duplicate_articles,
            'statistics': self.stats.copy()
        }

    def get_deduplication_report(self) -> Dict[str, Any]:
        """Generate deduplication report"""
        total_processed = self.stats['processed']
        total_duplicates = (self.stats['url_duplicates'] +
                          self.stats['content_duplicates'] +
                          self.stats['database_duplicates'])

        return {
            'total_processed': total_processed,
            'total_accepted': self.stats['accepted'],
            'total_duplicates': total_duplicates,
            'duplicate_breakdown': {
                'url_duplicates': self.stats['url_duplicates'],
                'content_duplicates': self.stats['content_duplicates'],
                'database_duplicates': self.stats['database_duplicates']
            },
            'deduplication_rate': total_duplicates / total_processed if total_processed > 0 else 0,
            'acceptance_rate': self.stats['accepted'] / total_processed if total_processed > 0 else 0
        }
```

## Performance Optimization

### Bloom Filters for Fast Deduplication

```python
import mmh3
from bitarray import bitarray

class BloomFilter:
    def __init__(self, size: int = 1000000, hash_count: int = 7):
        self.size = size
        self.hash_count = hash_count
        self.bit_array = bitarray(size)
        self.bit_array.setall(0)

    def _hashes(self, item: str) -> List[int]:
        """Generate hash values for item"""
        hashes = []
        for i in range(self.hash_count):
            hash_value = mmh3.hash(item, i) % self.size
            hashes.append(hash_value)
        return hashes

    def add(self, item: str):
        """Add item to bloom filter"""
        for hash_value in self._hashes(item):
            self.bit_array[hash_value] = 1

    def contains(self, item: str) -> bool:
        """Check if item might be in the set"""
        return all(self.bit_array[hash_value] for hash_value in self._hashes(item))

class FastDeduplicator:
    def __init__(self):
        self.bloom_filter = BloomFilter()
        self.exact_matches = set()

    def is_duplicate(self, item: str) -> bool:
        """Fast duplicate check using bloom filter + exact match"""
        # Quick bloom filter check
        if not self.bloom_filter.contains(item):
            return False

        # Exact match verification
        return item in self.exact_matches

    def add_item(self, item: str):
        """Add item to deduplication sets"""
        self.bloom_filter.add(item)
        self.exact_matches.add(item)
```

### Redis-Based Deduplication

```python
import redis
import json

class RedisDeduplicator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.url_key = "processed_urls"
        self.content_key = "content_hashes"

    def is_duplicate_url(self, url: str) -> bool:
        """Check if URL is duplicate using Redis set"""
        normalized_url = self._normalize_url(url)
        return self.redis.sismember(self.url_key, normalized_url)

    def mark_url_processed(self, url: str):
        """Mark URL as processed"""
        normalized_url = self._normalize_url(url)
        self.redis.sadd(self.url_key, normalized_url)

    def is_duplicate_content(self, content: str) -> bool:
        """Check content hash"""
        content_hash = hashlib.md5(content.encode()).hexdigest()
        return self.redis.sismember(self.content_key, content_hash)

    def mark_content_processed(self, content: str):
        """Mark content as processed"""
        content_hash = hashlib.md5(content.encode()).hexdigest()
        self.redis.sadd(self.content_key, content_hash)

    def _normalize_url(self, url: str) -> str:
        """Simple URL normalization"""
        return url.lower().rstrip('/')
```

## Hands-on Exercises

### Exercise 1: URL Normalization
1. Implement URL normalization function
2. Create test cases for different URL variations
3. Build URL deduplication system
4. Measure performance improvements

### Exercise 2: Content Similarity
1. Implement text similarity algorithms
2. Create content deduplication pipeline
3. Test with various content types
4. Optimize for performance

### Exercise 3: Database Integration
1. Implement UPSERT operations
2. Create database indexes for deduplication
3. Build batch processing with deduplication
4. Monitor database performance

## Next Steps
- [Search API Design Tutorial](../tutorials/05-search-api-design.md)
- [Workshop: Crawlee ETL Pipeline](../workshops/workshop-01-crawlee-etl.md)

## Additional Resources
- [Database Deduplication Strategies](https://www.postgresql.org/docs/current/indexes-unique.html)
- [Similarity Algorithms](https://scikit-learn.org/stable/modules/metrics.html)
- [Bloom Filters](https://en.wikipedia.org/wiki/Bloom_filter)
- [Text Similarity Techniques](https://towardsdatascience.com/text-similarity-7594f4998c9)

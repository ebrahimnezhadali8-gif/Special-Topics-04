# Tutorial 05: Search API Design and Implementation

## Overview
This tutorial covers the design and implementation of search APIs for crawled content. You'll learn how to build efficient search endpoints with filtering, pagination, full-text search, and relevance ranking using PostgreSQL's advanced search capabilities and Elasticsearch integration.

## Search API Fundamentals

### Search vs Query APIs

```python
# Query API - Exact matches, structured data
@app.get("/articles/{article_id}")
def get_article(article_id: int):
    # Exact lookup by ID
    return db.query(Article).filter(Article.id == article_id).first()

# Search API - Fuzzy matches, relevance ranking
@app.get("/search")
def search_articles(q: str, filters: dict = None):
    # Complex search with ranking
    return search_engine.search(q, filters)
```

### Search API Characteristics

- **Fuzzy Matching**: Partial matches, typos
- **Relevance Ranking**: Results ordered by relevance
- **Multiple Filters**: Complex query combinations
- **Performance**: Fast response times for large datasets
- **Analytics**: Search term tracking and analytics

## PostgreSQL Full-Text Search

### Setting Up Full-Text Search

```sql
-- Add search vector column
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX idx_articles_search_vector ON articles USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Update existing records
UPDATE articles SET search_vector = 
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C');
```

### Basic Full-Text Search Queries

```python
from sqlalchemy import func, text

class PostgreSQLSearch:
    def __init__(self, db_session):
        self.db = db_session

    def basic_search(self, query: str, limit: int = 20):
        """Basic full-text search"""
        search_query = func.plainto_tsquery('english', query)

        results = self.db.query(Article).filter(
            Article.search_vector.op('@@')(search_query)
        ).order_by(
            func.ts_rank_cd(Article.search_vector, search_query).desc()
        ).limit(limit).all()

        return results

    def search_with_highlights(self, query: str):
        """Search with result highlighting"""
        search_query = func.plainto_tsquery('english', query)

        # Get highlighted snippets
        headline_title = func.ts_headline('english', Article.title, search_query,
                                        'StartSel=<mark>, StopSel=</mark>')
        headline_content = func.ts_headline('english', Article.content, search_query,
                                          'StartSel=<mark>, StopSel=</mark>, MaxFragments=3')

        results = self.db.query(
            Article.id,
            Article.title,
            Article.url,
            headline_title.label('title_highlight'),
            headline_content.label('content_highlight'),
            func.ts_rank_cd(Article.search_vector, search_query).label('rank')
        ).filter(
            Article.search_vector.op('@@')(search_query)
        ).order_by(
            text('rank DESC')
        ).limit(10).all()

        return results

    def advanced_search(self, query: str, filters: dict = None):
        """Advanced search with filters"""
        search_query = func.plainto_tsquery('english', query)
        base_query = self.db.query(Article).filter(
            Article.search_vector.op('@@')(search_query)
        )

        # Apply filters
        if filters:
            if 'author' in filters:
                base_query = base_query.filter(
                    Article.author.ilike(f"%{filters['author']}%")
                )

            if 'date_from' in filters:
                base_query = base_query.filter(
                    Article.published_at >= filters['date_from']
                )

            if 'date_to' in filters:
                base_query = base_query.filter(
                    Article.published_at <= filters['date_to']
                )

            if 'tags' in filters and filters['tags']:
                # Join with article_tags to filter by tags
                base_query = base_query.join(ArticleTag).join(Tag).filter(
                    Tag.name.in_(filters['tags'])
                )

        # Order by relevance and date
        results = base_query.order_by(
            func.ts_rank_cd(Article.search_vector, search_query).desc(),
            Article.published_at.desc()
        ).limit(50).all()

        return results
```

## Search API Design Patterns

### Request/Response Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=500, description="Search query string")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
    sort_by: str = Field("relevance", regex="^(relevance|date|title)$", description="Sort criteria")

class DateRange(BaseModel):
    from_date: Optional[datetime] = Field(None, description="Start date for filtering")
    to_date: Optional[datetime] = Field(None, description="End date for filtering")

class SearchFilters(BaseModel):
    author: Optional[str] = Field(None, description="Filter by author name")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    source: Optional[str] = Field(None, description="Filter by source")
    date_range: Optional[DateRange] = None
    published_only: bool = Field(True, description="Show only published articles")

class SearchHighlight(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SearchResult(BaseModel):
    id: int
    title: str
    url: str
    author: Optional[str]
    published_at: Optional[datetime]
    tags: List[str] = []
    highlights: Optional[SearchHighlight] = None
    relevance_score: Optional[float] = None

    class Config:
        orm_mode = True

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResult]
    search_time_ms: int
    has_more: bool
    next_offset: Optional[int] = None

class SearchSuggestions(BaseModel):
    suggestions: List[str]
    total_suggestions: int

class PopularSearches(BaseModel):
    searches: List[Dict[str, Any]]
    time_range: str
```

### Faceted Search

```python
class FacetValue(BaseModel):
    value: str
    count: int
    label: Optional[str] = None

class SearchFacets(BaseModel):
    authors: List[FacetValue] = []
    tags: List[FacetValue] = []
    sources: List[FacetValue] = []
    date_ranges: List[FacetValue] = []

class FacetedSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResult]
    facets: SearchFacets
    search_time_ms: int
```

## Advanced Search Features

### Autocomplete and Suggestions

```python
class SearchAutocomplete:
    def __init__(self, db_session):
        self.db = db_session

    def get_suggestions(self, query: str, limit: int = 10) -> List[str]:
        """Get search suggestions based on partial query"""
        # Search in titles
        title_suggestions = self.db.query(
            func.distinct(Article.title)
        ).filter(
            Article.title.ilike(f"{query}%")
        ).limit(limit).all()

        # Search in tags
        tag_suggestions = self.db.query(
            func.distinct(Tag.name)
        ).filter(
            Tag.name.ilike(f"{query}%")
        ).limit(limit).all()

        # Combine and deduplicate
        suggestions = []
        seen = set()

        for suggestion, in title_suggestions + tag_suggestions:
            if suggestion.lower() not in seen:
                suggestions.append(suggestion)
                seen.add(suggestion.lower())

        return suggestions[:limit]

    def get_popular_searches(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get popular search terms"""
        # This would typically use search analytics data
        # For demo, return mock data
        return [
            {"term": "python", "count": 150, "trend": "up"},
            {"term": "fastapi", "count": 89, "trend": "up"},
            {"term": "machine learning", "count": 67, "trend": "stable"}
        ]
```

### Relevance Tuning

```python
class RelevanceTuner:
    def __init__(self):
        self.title_weight = 2.0
        self.content_weight = 1.0
        self.author_weight = 1.5
        self.tag_weight = 1.2

    def calculate_relevance_score(self, article: Article, query: str) -> float:
        """Calculate custom relevance score"""
        score = 0.0

        # Title matches (highest weight)
        if query.lower() in article.title.lower():
            score += self.title_weight

        # Content matches
        content_matches = article.content.lower().count(query.lower())
        score += content_matches * self.content_weight

        # Author matches
        if article.author and query.lower() in article.author.lower():
            score += self.author_weight

        # Tag matches
        tag_matches = sum(1 for tag in article.tags
                         if query.lower() in tag.tag.name.lower())
        score += tag_matches * self.tag_weight

        # Recency boost (newer articles get slight boost)
        if article.published_at:
            days_old = (datetime.now() - article.published_at).days
            recency_boost = max(0, 1.0 - (days_old / 365)) * 0.1
            score += recency_boost

        return score

    def rerank_results(self, results: List[Article], query: str) -> List[Article]:
        """Rerank search results by custom relevance"""
        scored_results = []
        for article in results:
            score = self.calculate_relevance_score(article, query)
            scored_results.append((article, score))

        # Sort by score descending
        scored_results.sort(key=lambda x: x[1], reverse=True)

        return [article for article, score in scored_results]
```

## Search Analytics and Monitoring

### Search Term Tracking

```python
class SearchAnalytics:
    def __init__(self, db_session):
        self.db = db_session

    def track_search(self, query: str, results_count: int, search_time_ms: int,
                    user_agent: str = None, ip_address: str = None):
        """Track search queries for analytics"""
        # In a real implementation, you'd store this in a database
        search_record = {
            'query': query,
            'results_count': results_count,
            'search_time_ms': search_time_ms,
            'timestamp': datetime.now(),
            'user_agent': user_agent,
            'ip_address': ip_address
        }

        # Store in search_analytics table
        # self.db.add(SearchAnalyticsRecord(**search_record))
        # self.db.commit()

        print(f"Tracked search: '{query}' -> {results_count} results in {search_time_ms}ms")

    def get_popular_queries(self, days: int = 30, limit: int = 20):
        """Get most popular search queries"""
        # Query search analytics
        pass

    def get_search_performance_stats(self):
        """Get search performance statistics"""
        # Calculate average search time, success rate, etc.
        pass
```

## API Implementation

### Complete Search API

```python
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import time

from .database import get_db
from .models import Article
from .schemas import (
    SearchQuery, SearchFilters, SearchResponse, SearchResult,
    SearchSuggestions, PopularSearches
)
from .search_engine import PostgreSQLSearch, SearchAutocomplete, RelevanceTuner
from .analytics import SearchAnalytics

app = FastAPI(title="Article Search API", version="1.0.0")

@app.post("/search", response_model=SearchResponse)
async def search_articles(
    search_query: SearchQuery,
    filters: Optional[SearchFilters] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Advanced article search with filtering and relevance ranking"""
    start_time = time.time()

    try:
        search_engine = PostgreSQLSearch(db)
        relevance_tuner = RelevanceTuner()

        # Build search filters
        search_filters = {}
        if filters:
            search_filters.update({
                'author': filters.author,
                'tags': filters.tags,
                'published_only': filters.published_only
            })
            if filters.date_range:
                search_filters.update({
                    'date_from': filters.date_range.from_date,
                    'date_to': filters.date_range.to_date
                })

        # Perform search
        raw_results = search_engine.advanced_search(
            search_query.q,
            search_filters
        )

        # Apply custom relevance scoring
        ranked_results = relevance_tuner.rerank_results(raw_results, search_query.q)

        # Apply pagination
        total_results = len(ranked_results)
        start_idx = search_query.offset
        end_idx = start_idx + search_query.limit
        paginated_results = ranked_results[start_idx:end_idx]

        # Convert to response format
        search_results = []
        for article in paginated_results:
            result = SearchResult(
                id=article.id,
                title=article.title,
                url=article.url,
                author=article.author,
                published_at=article.published_at,
                tags=[tag.tag.name for tag in article.tags],
                relevance_score=relevance_tuner.calculate_relevance_score(article, search_query.q)
            )
            search_results.append(result)

        search_time_ms = int((time.time() - start_time) * 1000)

        # Track search analytics (async)
        if background_tasks:
            analytics = SearchAnalytics(db)
            background_tasks.add_task(
                analytics.track_search,
                search_query.q,
                len(search_results),
                search_time_ms
            )

        return SearchResponse(
            query=search_query.q,
            total_results=total_results,
            results=search_results,
            search_time_ms=search_time_ms,
            has_more=end_idx < total_results,
            next_offset=end_idx if end_idx < total_results else None
        )

    except Exception as e:
        search_time_ms = int((time.time() - start_time) * 1000)
        raise HTTPException(
            status_code=500,
            detail=f"Search failed after {search_time_ms}ms: {str(e)}"
        )

@app.get("/autocomplete", response_model=SearchSuggestions)
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get search autocomplete suggestions"""
    autocomplete = SearchAutocomplete(db)
    suggestions = autocomplete.get_suggestions(q, limit)

    return SearchSuggestions(
        suggestions=suggestions,
        total_suggestions=len(suggestions)
    )

@app.get("/popular-searches", response_model=PopularSearches)
async def get_popular_searches(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get popular search terms"""
    analytics = SearchAnalytics(db)
    popular = analytics.get_popular_searches(days)

    return PopularSearches(
        searches=popular,
        time_range=f"{days} days"
    )

@app.get("/search/stats")
async def get_search_stats(db: Session = Depends(get_db)):
    """Get search performance statistics"""
    analytics = SearchAnalytics(db)
    stats = analytics.get_search_performance_stats()

    return {
        "search_stats": stats,
        "timestamp": datetime.now()
    }
```

## Performance Optimization

### Search Result Caching

```python
from fastapi import Request
import hashlib
import json

class SearchCache:
    def __init__(self, redis_client=None, ttl_seconds=300):
        self.redis = redis_client
        self.ttl_seconds = ttl_seconds

    def generate_cache_key(self, query: str, filters: dict, offset: int, limit: int) -> str:
        """Generate cache key for search query"""
        cache_data = {
            'query': query,
            'filters': filters,
            'offset': offset,
            'limit': limit
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()

    async def get_cached_results(self, cache_key: str) -> Optional[dict]:
        """Get cached search results"""
        if not self.redis:
            return None

        cached_data = await self.redis.get(f"search:{cache_key}")
        if cached_data:
            return json.loads(cached_data)
        return None

    async def cache_results(self, cache_key: str, results: dict):
        """Cache search results"""
        if not self.redis:
            return

        await self.redis.setex(
            f"search:{cache_key}",
            self.ttl_seconds,
            json.dumps(results)
        )

# Usage in API
search_cache = SearchCache(redis_client)

@app.post("/search", response_model=SearchResponse)
async def search_articles(
    search_query: SearchQuery,
    filters: Optional[SearchFilters] = None,
    request: Request = None
):
    # Generate cache key
    cache_key = search_cache.generate_cache_key(
        search_query.q,
        filters.dict() if filters else {},
        search_query.offset,
        search_query.limit
    )

    # Check cache first
    cached_results = await search_cache.get_cached_results(cache_key)
    if cached_results:
        return SearchResponse(**cached_results)

    # Perform search...
    # (search logic here)

    # Cache results
    await search_cache.cache_results(cache_key, search_response.dict())

    return search_response
```

### Database Query Optimization

```python
class OptimizedSearch:
    def search_with_optimization(self, query: str, filters: dict):
        """Optimized search with proper indexing"""

        # Use CTE for complex queries
        search_query = self.db.query(Article).filter(
            Article.search_vector.op('@@')(func.plainto_tsquery('english', query))
        )

        # Apply filters efficiently
        if filters.get('author'):
            search_query = search_query.filter(
                func.lower(Article.author).contains(filters['author'].lower())
            )

        if filters.get('date_from'):
            search_query = search_query.filter(Article.published_at >= filters['date_from'])

        # Use window functions for ranking
        ranked_query = self.db.query(
            Article,
            func.row_number().over(
                order_by=func.ts_rank_cd(Article.search_vector,
                                       func.plainto_tsquery('english', query)).desc()
            ).label('rank')
        ).from_self()

        # Apply pagination
        results = ranked_query.limit(50).all()

        return [article for article, rank in results]
```

## Hands-on Exercises

### Exercise 1: Basic Search API
1. Create a simple search endpoint using PostgreSQL full-text search
2. Implement basic filtering by author and date
3. Add pagination to search results
4. Test search functionality with sample data

### Exercise 2: Advanced Search Features
1. Implement relevance scoring and ranking
2. Add search result highlighting
3. Create autocomplete suggestions
4. Implement faceted search with filters

### Exercise 3: Search Analytics
1. Track search queries and performance
2. Implement popular search terms
3. Add search result click tracking
4. Create search performance dashboards

## Next Steps
- [Pipeline Monitoring Tutorial](../tutorials/06-pipeline-monitoring.md)
- [Workshop: Search API Implementation](../workshops/workshop-03-search-api.md)

## Additional Resources
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Elasticsearch Integration](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Search API Design Best Practices](https://docs.microsoft.com/en-us/azure/search/search-api-2019-05-06)
- [Relevance Ranking Algorithms](https://en.wikipedia.org/wiki/Information_retrieval)

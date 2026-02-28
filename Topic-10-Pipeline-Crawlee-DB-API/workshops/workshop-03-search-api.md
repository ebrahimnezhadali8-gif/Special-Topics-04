# Workshop 03: Complete Search API Implementation

## Overview
This workshop implements a comprehensive search API for crawled content, featuring full-text search, filtering, faceting, autocomplete, and performance optimizations. You'll build a production-ready search service that can handle complex queries and provide relevant results.

## Prerequisites
- Completed [Data Processing Workshop](../workshops/workshop-02-data-processing.md)
- Understanding of FastAPI and PostgreSQL
- Knowledge of search concepts and relevance ranking

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement full-text search with PostgreSQL
- Create complex filtering and faceting systems
- Build autocomplete and suggestion features
- Optimize search performance with indexing
- Implement relevance ranking and scoring
- Create comprehensive search analytics

## Workshop Structure

### Part 1: Core Search Infrastructure

#### Step 1: Search Service Architecture

**search/__init__.py:**
```python
# Search service package
```

**search/config.py:**
```python
from pydantic import BaseSettings
import os

class SearchSettings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/crawlee_etl")

    # Search settings
    max_results: int = int(os.getenv("MAX_SEARCH_RESULTS", "100"))
    default_page_size: int = int(os.getenv("DEFAULT_PAGE_SIZE", "20"))
    max_page_size: int = int(os.getenv("MAX_PAGE_SIZE", "100"))

    # Performance settings
    search_timeout: int = int(os.getenv("SEARCH_TIMEOUT", "30"))  # seconds
    cache_ttl: int = int(os.getenv("CACHE_TTL", "300"))  # 5 minutes

    # Relevance settings
    title_boost: float = float(os.getenv("TITLE_BOOST", "2.0"))
    content_boost: float = float(os.getenv("CONTENT_BOOST", "1.0"))
    author_boost: float = float(os.getenv("AUTHOR_BOOST", "1.5"))
    tag_boost: float = float(os.getenv("TAG_BOOST", "1.2"))

    class Config:
        env_file = ".env"

search_settings = SearchSettings()
```

**search/database.py:**
```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class SearchDatabase:
    """Database connection optimized for search operations"""

    def __init__(self, database_url: str):
        self.engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800,  # Recycle connections every 30 minutes
            echo=False
        )

        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

    @contextmanager
    def get_session(self) -> Session:
        """Get database session with automatic cleanup"""
        session = self.SessionLocal()
        try:
            yield session
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()

    def execute_query(self, query: str, params: dict = None) -> list:
        """Execute raw SQL query safely"""
        with self.get_session() as session:
            try:
                result = session.execute(text(query), params or {})
                return result.fetchall()
            except Exception as e:
                logger.error(f"Query execution error: {e}")
                raise

    def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
```

#### Step 2: Core Search Engine

**search/engine.py:**
```python
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import func, text, desc, and_, or_
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
import re

logger = logging.getLogger(__name__)

class SearchEngine:
    """Advanced search engine for crawled content"""

    def __init__(self, db_session: Session):
        self.db = db_session

    def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "relevance",
        page: int = 1,
        page_size: int = 20,
        include_facets: bool = False
    ) -> Dict[str, Any]:
        """Execute comprehensive search with filters and faceting"""

        filters = filters or {}

        # Build search conditions
        search_conditions = self._build_search_conditions(query, filters)

        # Build base query
        base_query = self._build_base_query(search_conditions)

        # Get total count
        total_count = self._get_search_count(base_query)

        # Apply sorting
        sorted_query = self._apply_sorting(base_query, sort_by, query)

        # Apply pagination
        results_query = sorted_query.offset((page - 1) * page_size).limit(page_size)

        # Execute search
        results = self._execute_search(results_query, query)

        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_prev = page > 1

        # Get facets if requested
        facets = self._get_facets(query, filters) if include_facets else None

        return {
            "query": query,
            "total_results": total_count,
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "facets": facets,
            "search_time": datetime.now()
        }

    def _build_search_conditions(self, query: str, filters: Dict[str, Any]) -> List[Any]:
        """Build SQLAlchemy conditions for search"""
        conditions = []

        # Full-text search condition
        if query:
            search_vector = func.plainto_tsquery('english', query)
            conditions.append(text("search_vector @@ :search_query"))

        # Apply filters
        if filters.get('author'):
            conditions.append(text("author ILIKE :author"))

        if filters.get('source'):
            conditions.append(text("source_id = (SELECT id FROM sources WHERE name ILIKE :source)"))

        if filters.get('tags') and filters['tags']:
            # Articles that have any of the specified tags
            tag_condition = """
            id IN (
                SELECT article_id FROM article_tags at
                JOIN tags t ON at.tag_id = t.id
                WHERE t.name = ANY(:tags)
            )
            """
            conditions.append(text(tag_condition))

        if filters.get('published_only'):
            conditions.append(text("published_at IS NOT NULL"))

        if filters.get('date_from'):
            conditions.append(text("published_at >= :date_from"))

        if filters.get('date_to'):
            conditions.append(text("published_at <= :date_to"))

        if filters.get('language'):
            conditions.append(text("language = :language"))

        return conditions

    def _build_base_query(self, conditions: List[Any]):
        """Build base search query"""
        from database.models.article import Article

        query = self.db.query(Article)

        # Apply conditions
        for condition in conditions:
            if isinstance(condition, str):
                # Raw SQL condition
                query = query.filter(text(condition))
            else:
                query = query.filter(condition)

        return query

    def _get_search_count(self, base_query) -> int:
        """Get total count for search results"""
        count_query = base_query.statement.with_only_columns([func.count()]).order_by(None)
        count_result = self.db.execute(count_query)
        return count_result.scalar()

    def _apply_sorting(self, query, sort_by: str, search_query: str = None):
        """Apply sorting to search query"""
        if sort_by == "date":
            query = query.order_by(desc(text("published_at")))
        elif sort_by == "title":
            query = query.order_by(text("title"))
        elif sort_by == "relevance" and search_query:
            # Use PostgreSQL's ranking function for relevance
            rank_expr = func.ts_rank_cd(text("search_vector"), func.plainto_tsquery('english', search_query))
            query = query.order_by(desc(rank_expr), desc(text("published_at")))
        else:
            # Default: relevance then date
            if search_query:
                rank_expr = func.ts_rank_cd(text("search_vector"), func.plainto_tsquery('english', search_query))
                query = query.order_by(desc(rank_expr), desc(text("published_at")))
            else:
                query = query.order_by(desc(text("published_at")))

        return query

    def _execute_search(self, query, search_query: str = None) -> List[Dict[str, Any]]:
        """Execute search and format results"""
        articles = query.all()

        results = []
        for article in articles:
            result = {
                "id": article.id,
                "title": article.title,
                "url": article.url,
                "author": article.author,
                "published_at": article.published_at.isoformat() if article.published_at else None,
                "summary": article.summary,
                "tags": [tag.tag.name for tag in article.tags],
                "source": article.source.name if article.source else None,
                "word_count": article.word_count,
                "reading_time_minutes": article.reading_time_minutes,
                "relevance_score": self._calculate_relevance_score(article, search_query) if search_query else None
            }

            # Add highlights if searching
            if search_query:
                result["highlights"] = self._generate_highlights(article, search_query)

            results.append(result)

        return results

    def _calculate_relevance_score(self, article, query: str) -> float:
        """Calculate custom relevance score"""
        score = 0.0

        # Title matches
        if query.lower() in article.title.lower():
            score += 3.0

        # Author matches
        if article.author and query.lower() in article.author.lower():
            score += 2.0

        # Tag matches
        tag_matches = sum(1 for tag in article.tags if query.lower() in tag.tag.name.lower())
        score += tag_matches * 1.5

        # Content matches (basic)
        if article.content and query.lower() in article.content.lower():
            content_matches = article.content.lower().count(query.lower())
            score += min(content_matches * 0.5, 2.0)

        # Recency boost
        if article.published_at:
            days_old = (datetime.now() - article.published_at).days
            recency_boost = max(0, 1.0 - (days_old / 365)) * 0.5
            score += recency_boost

        return score

    def _generate_highlights(self, article, query: str) -> Dict[str, str]:
        """Generate search result highlights"""
        highlights = {}

        # Title highlight
        if query.lower() in article.title.lower():
            highlights["title"] = self._highlight_text(article.title, query)

        # Content highlight (first match in summary or content)
        text_to_highlight = article.summary or article.content or ""
        if text_to_highlight and query.lower() in text_to_highlight.lower():
            highlights["content"] = self._highlight_text(text_to_highlight, query, max_length=200)

        return highlights

    def _highlight_text(self, text: str, query: str, max_length: int = 100) -> str:
        """Highlight query terms in text"""
        # Simple highlighting - in production use more sophisticated methods
        highlighted = re.sub(
            f'({re.escape(query)})',
            r'<mark>\1</mark>',
            text,
            flags=re.IGNORECASE
        )

        # Truncate if too long
        if len(highlighted) > max_length:
            # Find the first highlight
            mark_start = highlighted.find('<mark>')
            if mark_start >= 0:
                # Include some context around the highlight
                start = max(0, mark_start - 50)
                end = min(len(highlighted), mark_start + 150)
                highlighted = "..." + highlighted[start:end] + "..."

        return highlighted

    def _get_facets(self, query: str, filters: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        """Generate search facets"""
        facets = {}

        # Author facets
        author_facets = self._get_facet_values("author", query, filters)
        if author_facets:
            facets["authors"] = author_facets[:10]  # Top 10

        # Tag facets
        tag_facets = self._get_tag_facets(query, filters)
        if tag_facets:
            facets["tags"] = tag_facets[:10]

        # Source facets
        source_facets = self._get_source_facets(query, filters)
        if source_facets:
            facets["sources"] = source_facets[:10]

        # Date range facets
        date_facets = self._get_date_facets(query, filters)
        if date_facets:
            facets["date_ranges"] = date_facets

        return facets

    def _get_facet_values(self, field: str, query: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get facet values for a field"""
        # This is a simplified implementation
        # In production, you'd use more efficient aggregation queries

        facet_query = f"""
        SELECT {field}, COUNT(*) as count
        FROM articles
        WHERE search_vector @@ plainto_tsquery('english', :query)
        AND {field} IS NOT NULL
        GROUP BY {field}
        ORDER BY count DESC
        LIMIT 20
        """

        try:
            results = self.db.execute(text(facet_query), {"query": query}).fetchall()
            return [{"value": row[0], "count": row[1]} for row in results]
        except Exception:
            return []

    def _get_tag_facets(self, query: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get tag facets"""
        tag_query = """
        SELECT t.name, COUNT(at.article_id) as count
        FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        JOIN articles a ON at.article_id = a.id
        WHERE a.search_vector @@ plainto_tsquery('english', :query)
        GROUP BY t.id, t.name
        ORDER BY count DESC
        LIMIT 20
        """

        try:
            results = self.db.execute(text(tag_query), {"query": query}).fetchall()
            return [{"value": row[0], "count": row[1]} for row in results]
        except Exception:
            return []

    def _get_source_facets(self, query: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get source facets"""
        source_query = """
        SELECT s.name, COUNT(a.id) as count
        FROM sources s
        JOIN articles a ON s.id = a.source_id
        WHERE a.search_vector @@ plainto_tsquery('english', :query)
        GROUP BY s.id, s.name
        ORDER BY count DESC
        LIMIT 20
        """

        try:
            results = self.db.execute(text(source_query), {"query": query}).fetchall()
            return [{"value": row[0], "count": row[1]} for row in results]
        except Exception:
            return []

    def _get_date_facets(self, query: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get date range facets"""
        date_query = """
        SELECT
            CASE
                WHEN published_at >= CURRENT_DATE - INTERVAL '1 day' THEN 'Last 24 hours'
                WHEN published_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last week'
                WHEN published_at >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last month'
                WHEN published_at >= CURRENT_DATE - INTERVAL '365 days' THEN 'Last year'
                ELSE 'Older'
            END as date_range,
            COUNT(*) as count
        FROM articles
        WHERE search_vector @@ plainto_tsquery('english', :query)
        AND published_at IS NOT NULL
        GROUP BY
            CASE
                WHEN published_at >= CURRENT_DATE - INTERVAL '1 day' THEN 'Last 24 hours'
                WHEN published_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last week'
                WHEN published_at >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last month'
                WHEN published_at >= CURRENT_DATE - INTERVAL '365 days' THEN 'Last year'
                ELSE 'Older'
            END
        ORDER BY count DESC
        """

        try:
            results = self.db.execute(text(date_query), {"query": query}).fetchall()
            return [{"value": row[0], "count": row[1]} for row in results]
        except Exception:
            return []
```

### Part 2: Autocomplete and Suggestions

#### Step 3: Autocomplete Service

**search/autocomplete.py:**
```python
from typing import List, Dict, Any, Optional
from sqlalchemy import text, func
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class AutocompleteService:
    """Service for search autocomplete and suggestions"""

    def __init__(self, db_session: Session):
        self.db = db_session

    def get_suggestions(self, query: str, limit: int = 10, include_metadata: bool = False) -> Dict[str, Any]:
        """Get autocomplete suggestions for search query"""
        if not query or len(query.strip()) < 2:
            return {"suggestions": [], "total": 0}

        query = query.strip().lower()

        suggestions = []
        seen = set()

        # Get title-based suggestions
        title_suggestions = self._get_title_suggestions(query, limit)
        for suggestion in title_suggestions:
            if suggestion not in seen:
                suggestions.append(suggestion)
                seen.add(suggestion)

        # Get tag-based suggestions
        if len(suggestions) < limit:
            tag_suggestions = self._get_tag_suggestions(query, limit - len(suggestions))
            for suggestion in tag_suggestions:
                if suggestion not in seen:
                    suggestions.append(suggestion)
                    seen.add(suggestion)

        # Get author-based suggestions
        if len(suggestions) < limit:
            author_suggestions = self._get_author_suggestions(query, limit - len(suggestions))
            for suggestion in author_suggestions:
                if suggestion not in seen:
                    suggestions.append(suggestion)
                    seen.add(suggestion)

        result = {
            "suggestions": suggestions[:limit],
            "total": len(suggestions),
            "query": query
        }

        if include_metadata:
            result["metadata"] = {
                "title_suggestions": len(title_suggestions),
                "tag_suggestions": len([s for s in suggestions if s in tag_suggestions]),
                "author_suggestions": len([s for s in suggestions if s in author_suggestions])
            }

        return result

    def _get_title_suggestions(self, query: str, limit: int) -> List[str]:
        """Get title-based suggestions"""
        try:
            # Find titles that start with or contain the query
            title_query = """
            SELECT DISTINCT title
            FROM articles
            WHERE LOWER(title) LIKE :prefix || '%'
               OR LOWER(title) LIKE '%' || :query || '%'
            ORDER BY
                CASE WHEN LOWER(title) LIKE :prefix || '%' THEN 1 ELSE 2 END,
                LENGTH(title),
                title
            LIMIT :limit
            """

            results = self.db.execute(text(title_query), {
                "prefix": query,
                "query": query,
                "limit": limit * 2  # Get more to filter duplicates
            }).fetchall()

            return [row[0] for row in results]

        except Exception as e:
            logger.error(f"Error getting title suggestions: {e}")
            return []

    def _get_tag_suggestions(self, query: str, limit: int) -> List[str]:
        """Get tag-based suggestions"""
        try:
            tag_query = """
            SELECT DISTINCT t.name
            FROM tags t
            WHERE LOWER(t.name) LIKE :query || '%'
            ORDER BY t.usage_count DESC, t.name
            LIMIT :limit
            """

            results = self.db.execute(text(tag_query), {
                "query": query,
                "limit": limit
            }).fetchall()

            return [row[0] for row in results]

        except Exception as e:
            logger.error(f"Error getting tag suggestions: {e}")
            return []

    def _get_author_suggestions(self, query: str, limit: int) -> List[str]:
        """Get author-based suggestions"""
        try:
            author_query = """
            SELECT DISTINCT author
            FROM articles
            WHERE LOWER(author) LIKE :query || '%'
               AND author IS NOT NULL
               AND LENGTH(TRIM(author)) > 0
            ORDER BY COUNT(*) DESC, author
            GROUP BY author
            LIMIT :limit
            """

            results = self.db.execute(text(author_query), {
                "query": query,
                "limit": limit
            }).fetchall()

            return [row[0] for row in results]

        except Exception as e:
            logger.error(f"Error getting author suggestions: {e}")
            return []

    def get_popular_searches(self, days: int = 7, limit: int = 20) -> List[Dict[str, Any]]:
        """Get popular search terms (requires search analytics)"""
        # This would typically query search analytics data
        # For demo, return mock data
        return [
            {"term": "fastapi", "count": 150, "trend": "up"},
            {"term": "machine learning", "count": 89, "trend": "stable"},
            {"term": "docker", "count": 67, "trend": "up"},
            {"term": "kubernetes", "count": 45, "trend": "down"},
            {"term": "python", "count": 123, "trend": "stable"}
        ]

    def get_search_trends(self, query: str, days: int = 30) -> Dict[str, Any]:
        """Get search trends for a specific query"""
        # This would analyze search analytics over time
        # For demo, return mock trend data
        return {
            "query": query,
            "trend": "increasing",
            "searches_last_7_days": 45,
            "searches_last_30_days": 180,
            "change_percent": 25.5,
            "peak_day": "2023-12-15"
        }
```

### Part 3: FastAPI Search Endpoints

#### Step 4: Search API Routes

**api/routes/search.py:**
```python
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import time

from search.engine import SearchEngine
from search.autocomplete import AutocompleteService
from api.schemas.search import (
    SearchQuery, SearchFilters, SearchResponse, SearchResult,
    AutocompleteResponse, PopularSearchesResponse, SearchTrendsResponse
)
from database.connection import get_db
from config.logging import get_logger

router = APIRouter(prefix="/search", tags=["search"])
logger = get_logger(__name__)

@router.post("/", response_model=SearchResponse)
async def search_articles(
    search_query: SearchQuery,
    filters: Optional[SearchFilters] = None,
    include_facets: bool = Query(False, description="Include search facets"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Advanced article search with filtering, pagination, and faceting"""
    start_time = time.time()

    try:
        search_engine = SearchEngine(db)

        # Prepare filters
        search_filters = {}
        if filters:
            search_filters = {
                'author': filters.author,
                'source': filters.source,
                'tags': filters.tags,
                'published_only': filters.published_only,
                'language': filters.language
            }

            if filters.date_range:
                search_filters.update({
                    'date_from': filters.date_range.from_date,
                    'date_to': filters.date_range.to_date
                })

        # Execute search
        result = search_engine.search(
            query=search_query.q,
            filters=search_filters,
            sort_by=search_query.sort_by,
            page=search_query.page,
            page_size=search_query.page_size,
            include_facets=include_facets
        )

        search_time_ms = int((time.time() - start_time) * 1000)

        # Add search time to result
        result['search_time_ms'] = search_time_ms

        # Log search analytics (async)
        if background_tasks:
            background_tasks.add_task(
                log_search_analytics,
                search_query.q,
                len(result['results']),
                search_time_ms,
                search_filters
            )

        logger.info(f"Search completed: '{search_query.q}' -> {len(result['results'])} results in {search_time_ms}ms")

        return SearchResponse(**result)

    except Exception as e:
        search_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Search failed: '{search_query.q}' - {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed after {search_time_ms}ms: {str(e)}"
        )

@router.get("/autocomplete", response_model=AutocompleteResponse)
async def get_autocomplete_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Partial search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum suggestions to return"),
    include_metadata: bool = Query(False, description="Include metadata about suggestion sources"),
    db: Session = Depends(get_db)
):
    """Get search autocomplete suggestions"""
    try:
        autocomplete_service = AutocompleteService(db)
        result = autocomplete_service.get_suggestions(q, limit, include_metadata)

        return AutocompleteResponse(**result)

    except Exception as e:
        logger.error(f"Autocomplete failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Autocomplete service unavailable")

@router.get("/popular", response_model=PopularSearchesResponse)
async def get_popular_searches(
    days: int = Query(7, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
    db: Session = Depends(get_db)
):
    """Get popular search terms"""
    try:
        autocomplete_service = AutocompleteService(db)
        popular_searches = autocomplete_service.get_popular_searches(days, limit)

        return PopularSearchesResponse(
            searches=popular_searches,
            time_range=f"{days} days",
            generated_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Popular searches failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Popular searches unavailable")

@router.get("/trends/{query}", response_model=SearchTrendsResponse)
async def get_search_trends(
    query: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get search trends for a specific query"""
    try:
        autocomplete_service = AutocompleteService(db)
        trends = autocomplete_service.get_search_trends(query, days)

        return SearchTrendsResponse(**trends)

    except Exception as e:
        logger.error(f"Search trends failed for '{query}': {str(e)}")
        raise HTTPException(status_code=500, detail="Search trends unavailable")

@router.get("/stats")
async def get_search_stats(db: Session = Depends(get_db)):
    """Get search performance statistics"""
    try:
        # Get basic statistics
        from database.models.article import Article, Source, Tag

        total_articles = db.query(Article).count()
        total_sources = db.query(Source).count()
        total_tags = db.query(Tag).count()

        # Get date range
        date_stats = db.query(
            func.min(Article.published_at),
            func.max(Article.published_at),
            func.avg(Article.word_count)
        ).first()

        # Get top tags
        top_tags = db.query(Tag.name, Tag.usage_count).order_by(
            Tag.usage_count.desc()
        ).limit(10).all()

        # Get top authors
        top_authors = db.query(
            Article.author,
            func.count(Article.id).label('article_count')
        ).filter(
            Article.author.isnot(None)
        ).group_by(Article.author).order_by(
            func.count(Article.id).desc()
        ).limit(10).all()

        return {
            "total_articles": total_articles,
            "total_sources": total_sources,
            "total_tags": total_tags,
            "date_range": {
                "oldest": date_stats[0].isoformat() if date_stats[0] else None,
                "newest": date_stats[1].isoformat() if date_stats[1] else None
            },
            "average_word_count": float(date_stats[2]) if date_stats[2] else None,
            "top_tags": [{"tag": tag, "count": count} for tag, count in top_tags],
            "top_authors": [{"author": author, "count": count} for author, count in top_authors],
            "last_updated": datetime.now()
        }

    except Exception as e:
        logger.error(f"Search stats failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Statistics unavailable")

async def log_search_analytics(query: str, result_count: int, search_time_ms: int, filters: Dict[str, Any]):
    """Log search analytics asynchronously"""
    try:
        # In a production system, you'd store this in a database or send to analytics service
        logger.info(f"Search analytics: '{query}' -> {result_count} results, {search_time_ms}ms, filters: {filters}")

        # Could send to monitoring service, update search popularity, etc.

    except Exception as e:
        logger.error(f"Failed to log search analytics: {e}")
```

#### Step 5: Search Schemas

**api/schemas/search.py:**
```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SortBy(str, Enum):
    RELEVANCE = "relevance"
    DATE = "date"
    TITLE = "title"

class DateRange(BaseModel):
    from_date: Optional[datetime] = Field(None, description="Start date for filtering")
    to_date: Optional[datetime] = Field(None, description="End date for filtering")

class SearchFilters(BaseModel):
    author: Optional[str] = Field(None, description="Filter by author name")
    source: Optional[str] = Field(None, description="Filter by source name")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    published_only: bool = Field(True, description="Show only published articles")
    language: Optional[str] = Field(None, description="Filter by language")
    date_range: Optional[DateRange] = None

class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=500, description="Search query string")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Results per page")
    sort_by: SortBy = Field(SortBy.RELEVANCE, description="Sort criteria")

class Highlight(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SearchResult(BaseModel):
    id: int
    title: str
    url: str
    author: Optional[str]
    published_at: Optional[datetime]
    summary: Optional[str]
    tags: List[str] = []
    source: Optional[str]
    word_count: Optional[int]
    reading_time_minutes: Optional[int]
    highlights: Optional[Highlight] = None
    relevance_score: Optional[float] = None

class FacetValue(BaseModel):
    value: str
    count: int
    label: Optional[str] = None

class SearchFacets(BaseModel):
    authors: List[FacetValue] = []
    tags: List[FacetValue] = []
    sources: List[FacetValue] = []
    date_ranges: List[FacetValue] = []

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResult]
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    next_offset: Optional[int] = None
    facets: Optional[SearchFacets] = None
    search_time_ms: int
    search_time: datetime

class AutocompleteSuggestion(BaseModel):
    text: str
    type: str  # 'title', 'tag', 'author'
    count: Optional[int] = None

class AutocompleteMetadata(BaseModel):
    title_suggestions: int
    tag_suggestions: int
    author_suggestions: int
    total_suggestions: int

class AutocompleteResponse(BaseModel):
    query: str
    suggestions: List[str]
    total: int
    metadata: Optional[AutocompleteMetadata] = None

class PopularSearch(BaseModel):
    term: str
    count: int
    trend: str  # 'up', 'down', 'stable'

class PopularSearchesResponse(BaseModel):
    searches: List[PopularSearch]
    time_range: str
    generated_at: datetime

class SearchTrendsResponse(BaseModel):
    query: str
    trend: str
    searches_last_7_days: int
    searches_last_30_days: int
    change_percent: float
    peak_day: str
```

### Part 4: Performance Optimization

#### Step 6: Search Caching

**search/cache.py:**
```python
import hashlib
import json
from typing import Dict, Any, Optional
import redis
import asyncio
from datetime import datetime, timedelta

class SearchCache:
    """Redis-based search cache"""

    def __init__(self, redis_client: redis.Redis = None, ttl_seconds: int = 300):
        self.redis = redis_client
        self.ttl_seconds = ttl_seconds

    def generate_cache_key(self, query: str, filters: Dict[str, Any], page: int, page_size: int) -> str:
        """Generate cache key for search query"""
        # Sort filters for consistent keys
        sorted_filters = json.dumps(filters, sort_keys=True)
        key_data = f"{query}|{sorted_filters}|{page}|{page_size}"
        return f"search:{hashlib.md5(key_data.encode()).hexdigest()}"

    async def get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached search result"""
        if not self.redis:
            return None

        try:
            cached_data = self.redis.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception:
            pass

        return None

    async def cache_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache search result"""
        if not self.redis:
            return

        try:
            # Add cache timestamp
            result_copy = result.copy()
            result_copy['cached_at'] = datetime.now().isoformat()

            self.redis.setex(cache_key, self.ttl_seconds, json.dumps(result_copy))
        except Exception:
            pass

    def invalidate_query_cache(self, query_pattern: str):
        """Invalidate cache for queries matching pattern"""
        if not self.redis:
            return

        try:
            # Find keys matching pattern
            keys = self.redis.keys(f"search:*")
            for key in keys:
                # Check if the cached data contains the query pattern
                try:
                    cached_data = self.redis.get(key)
                    if cached_data:
                        data = json.loads(cached_data)
                        if query_pattern.lower() in data.get('query', '').lower():
                            self.redis.delete(key)
                except Exception:
                    continue
        except Exception:
            pass

class AutocompleteCache:
    """Cache for autocomplete suggestions"""

    def __init__(self, redis_client: redis.Redis = None, ttl_seconds: int = 3600):
        self.redis = redis_client
        self.ttl_seconds = ttl_seconds

    def get_cache_key(self, query: str, limit: int) -> str:
        return f"autocomplete:{query}:{limit}"

    async def get_cached_suggestions(self, query: str, limit: int) -> Optional[Dict[str, Any]]:
        """Get cached autocomplete suggestions"""
        if not self.redis:
            return None

        try:
            cache_key = self.get_cache_key(query, limit)
            cached_data = self.redis.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception:
            pass

        return None

    async def cache_suggestions(self, query: str, limit: int, suggestions: Dict[str, Any]):
        """Cache autocomplete suggestions"""
        if not self.redis:
            return

        try:
            cache_key = self.get_cache_key(query, limit)
            self.redis.setex(cache_key, self.ttl_seconds, json.dumps(suggestions))
        except Exception:
            pass
```

## Running the Search API

### Start the Complete System

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
alembic upgrade head

# Start the API
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal, populate with sample data
python scripts/populate_sample_data.py

# Test the search API
curl "http://localhost:8000/search/?q=fastapi"
curl "http://localhost:8000/search/autocomplete?q=fas"
curl "http://localhost:8000/search/popular"
```

### API Usage Examples

```bash
# Basic search
curl -X POST "http://localhost:8000/search/" \
     -H "Content-Type: application/json" \
     -d '{
       "q": "machine learning",
       "page": 1,
       "page_size": 10,
       "sort_by": "relevance"
     }'

# Search with filters
curl -X POST "http://localhost:8000/search/" \
     -H "Content-Type: application/json" \
     -d '{
       "q": "python",
       "filters": {
         "tags": ["tutorial", "programming"],
         "published_only": true,
         "date_range": {
           "from_date": "2023-01-01T00:00:00Z"
         }
       }
     }'

# Autocomplete
curl "http://localhost:8000/search/autocomplete?q=mach&limit=5"

# Popular searches
curl "http://localhost:8000/search/popular?days=7"

# Search statistics
curl "http://localhost:8000/search/stats"
```

## Challenge Exercises

### Challenge 1: Advanced Search Features
1. Implement fuzzy search with Levenshtein distance
2. Add geographic search for location-based content
3. Create personalized search based on user preferences
4. Implement search result personalization

### Challenge 2: Search Analytics Dashboard
1. Build a real-time search analytics dashboard
2. Track search performance metrics (latency, throughput)
3. Implement A/B testing for search algorithms
4. Create search quality monitoring and alerts

### Challenge 3: Multi-Language Search
1. Implement search across multiple languages
2. Add automatic language detection
3. Create language-specific stemming and tokenization
4. Implement cross-language search capabilities

## Verification Checklist

### Search Functionality
- [ ] Full-text search working with relevance ranking
- [ ] Filtering by author, date, tags, and source functional
- [ ] Pagination and sorting implemented correctly
- [ ] Search result highlights generated properly
- [ ] Faceted search providing useful aggregations

### Autocomplete & Suggestions
- [ ] Autocomplete returning relevant suggestions
- [ ] Multiple suggestion sources (titles, tags, authors)
- [ ] Popular searches tracked and returned
- [ ] Search trends analysis working

### Performance & Caching
- [ ] Search results cached appropriately
- [ ] Autocomplete suggestions cached
- [ ] Database queries optimized with proper indexing
- [ ] Search response times within acceptable limits

### API Design
- [ ] RESTful endpoints following best practices
- [ ] Proper HTTP status codes and error responses
- [ ] Comprehensive OpenAPI documentation
- [ ] Request/response validation working
- [ ] API versioning considered

## Troubleshooting

### Search Performance Issues

**Slow search queries:**
```sql
-- Check query execution plan
EXPLAIN ANALYZE SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'query');

-- Check index usage
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND relname = 'articles';
```

**High memory usage:**
```python
# Monitor memory usage
import psutil
import os

process = psutil.Process(os.getpid())
memory_usage = process.memory_info().rss / 1024 / 1024  # MB
print(f"Memory usage: {memory_usage:.2f} MB")
```

**Cache issues:**
```python
# Clear Redis cache
redis_client.flushdb()

# Check cache hit rates
cache_hits = redis_client.get('cache_hits') or 0
cache_misses = redis_client.get('cache_misses') or 0
hit_rate = int(cache_hits) / (int(cache_hits) + int(cache_misses)) * 100
print(f"Cache hit rate: {hit_rate:.2f}%")
```

### Search Quality Issues

**Poor relevance ranking:**
```python
# Analyze search term frequency
from collections import Counter
search_terms = ["term1", "term2", "term3"]  # From analytics
term_frequency = Counter(search_terms)
print("Most searched terms:", term_frequency.most_common(10))
```

**Missing search results:**
```python
# Check if content is properly indexed
from sqlalchemy import text

# Verify search vector is populated
result = db.execute(text("""
    SELECT id, title, search_vector
    FROM articles
    WHERE search_vector @@ plainto_tsquery('english', 'test')
    LIMIT 5
""")).fetchall()

print(f"Found {len(result)} articles with search term 'test'")
```

## Next Steps
- [Pipeline Monitoring Tutorial](../tutorials/06-pipeline-monitoring.md)

## Additional Resources
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Search API Best Practices](https://docs.microsoft.com/en-us/azure/search/search-api-2019-05-06)
- [Autocomplete Implementation](https://www.algolia.com/doc/guides/textual-relevance/autocomplete/)

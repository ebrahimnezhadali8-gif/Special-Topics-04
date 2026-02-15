# Subject 11: Serving with PostgreSQL and Optimization

## Overview

This subject focuses on PostgreSQL performance optimization and production deployment. You'll learn connection pooling, query optimization, advanced indexing, backup strategies, and read replica configuration. The emphasis is on scaling PostgreSQL for high-traffic applications and maintaining optimal performance.

## Learning Objectives

By the end of this subject, you will be able to:

- **Optimize Database Performance**: Implement advanced indexing and query optimization
- **Configure Connection Pooling**: Use asyncpg for efficient connection management
- **Monitor Query Performance**: Profile and analyze slow queries
- **Implement Backup Strategies**: Set up automated backups and recovery
- **Configure Read Replicas**: Scale read operations with replication
- **Maintain Production Databases**: Monitor, tune, and troubleshoot PostgreSQL

## Prerequisites

- Completion of Subjects 1-10 (All previous subjects)
- Strong understanding of PostgreSQL and SQLAlchemy
- Experience with database design and querying
- Basic knowledge of system administration

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[Connection Pooling](tutorials/01-connection-pooling.md)**
   - Understanding connection pooling benefits
   - asyncpg pool configuration
   - Pool sizing and monitoring
   - Connection lifecycle management

2. **[Query Optimization](tutorials/02-query-optimization.md)**
   - Query execution planning
   - EXPLAIN ANALYZE usage
   - Identifying slow queries
   - Optimization techniques

3. **[Advanced Indexing](tutorials/03-indexing-strategies.md)**
   - Index types and strategies
   - Composite and partial indexes
   - Index maintenance
   - When not to use indexes

4. **[Backup & Recovery](tutorials/04-backup-recovery.md)**
   - Backup types and strategies
   - Point-in-time recovery
   - Automated backup solutions
   - Disaster recovery planning

5. **[Read Replicas & Scaling](tutorials/05-read-replicas.md)**
   - Replication concepts
   - Read replica setup
   - Load balancing strategies
   - High availability configuration

### 🛠️ Workshops (Hands-on Practice)

1. **[Connection Pooling Setup](workshops/workshop-01-asyncpg-pooling.md)**
   - Configuring asyncpg pools
   - Pool monitoring and metrics
   - Connection leak detection
   - Performance benchmarking

2. **[Query Profiling](workshops/workshop-02-query-profiling.md)**
   - Setting up query logging
   - Using pg_stat_statements
   - Analyzing execution plans
   - Performance bottleneck identification

3. **[Index Optimization](workshops/workshop-03-index-optimization.md)**
   - Creating optimal indexes
   - Index usage analysis
   - Index maintenance tasks
   - Performance measurement

4. **[Backup Implementation](workshops/workshop-04-backup-implementation.md)**
   - Automated backup setup
   - Testing recovery procedures
   - Backup validation
   - Retention policies

5. **[Replication Setup](workshops/workshop-05-replication-setup.md)**
   - Read replica configuration
   - Replication monitoring
   - Failover procedures
   - Load balancing implementation

## Key Optimization Concepts

### Connection Pooling with asyncpg

```python
import asyncpg
from typing import Optional

class DatabasePool:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def create_pool(self, dsn: str, **kwargs):
        """Create connection pool with optimal settings"""
        self._pool = await asyncpg.create_pool(
            dsn=dsn,
            # Pool configuration
            min_size=10,      # Minimum connections
            max_size=50,      # Maximum connections
            max_queries=50000, # Max queries per connection
            max_inactive_connection_lifetime=300.0,  # 5 minutes
            # Connection settings
            command_timeout=60.0,
            **kwargs
        )

    async def get_connection(self):
        """Get connection from pool"""
        if not self._pool:
            raise RuntimeError("Pool not initialized")
        return await self._pool.acquire()

    async def release_connection(self, conn):
        """Release connection back to pool"""
        await self._pool.release(conn)

    async def close(self):
        """Close all pool connections"""
        if self._pool:
            await self._pool.close()

# Usage in FastAPI
from fastapi import Depends

async def get_db_pool():
    # Dependency injection for pool
    pool = DatabasePool()
    await pool.create_pool(os.getenv("DATABASE_URL"))
    try:
        yield pool
    finally:
        await pool.close()

@app.get("/articles/")
async def get_articles(pool: DatabasePool = Depends(get_db_pool)):
    async with pool.get_connection() as conn:
        rows = await conn.fetch("""
            SELECT id, title, published_date
            FROM articles
            ORDER BY published_date DESC
            LIMIT 20
        """)
        return [dict(row) for row in rows]
```

### Query Optimization and Analysis

```sql
-- Enable query timing
\timing on

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT a.title, a.published_date, COUNT(at.article_id) as tag_count
FROM articles a
LEFT JOIN article_tags at ON a.id = at.article_id
WHERE a.published_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY a.id, a.title, a.published_date
ORDER BY a.published_date DESC;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'articles'
ORDER BY idx_scan DESC;

-- Query performance monitoring
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%articles%'
ORDER BY total_time DESC
LIMIT 10;
```

### Advanced Indexing Strategies

```sql
-- Composite index for common query patterns
CREATE INDEX idx_articles_domain_date ON articles(site_domain, published_date DESC);

-- Partial index for recent articles
CREATE INDEX idx_recent_articles ON articles(published_date)
WHERE published_date > CURRENT_DATE - INTERVAL '30 days';

-- Full-text search index for Persian content
CREATE INDEX idx_articles_content_fts ON articles
USING gin(to_tsvector('persian', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Index for JSON data (if using JSONB columns)
CREATE INDEX idx_articles_metadata ON articles USING gin(metadata);

-- Covering index for common SELECT queries
CREATE INDEX idx_articles_covering ON articles(id, title, published_date, site_domain);

-- Index maintenance
REINDEX INDEX CONCURRENTLY idx_articles_domain_date;
ANALYZE articles;  -- Update statistics
```

### Backup and Recovery

```bash
# Physical backup with pg_basebackup
pg_basebackup -h localhost -D /backup/base_backup -P -v

# Logical backup with pg_dump
pg_dump -h localhost -U username -d content_db -f /backup/content_db.sql
pg_dump -h localhost -U username -d content_db -F c -f /backup/content_db.dump

# Continuous archiving setup
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'

# Point-in-time recovery
# recovery.conf
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-01-15 10:00:00'
```

### Read Replica Configuration

```sql
-- Primary server configuration
-- postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64

-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replication_password';

-- Grant replication permissions
GRANT pg_read_all_data TO replicator;

-- Replica server setup
# recovery.conf
primary_conninfo = 'host=primary_host port=5432 user=replicator password=replication_password'
restore_command = 'cp /archive/%f %p'
standby_mode = on
```

## Performance Monitoring

### Key Metrics to Monitor

```sql
-- Connection statistics
SELECT
    datname,
    numbackends as active_connections,
    xact_commit + xact_rollback as transactions,
    blks_read + blks_hit as block_accesses
FROM pg_stat_database;

-- Lock monitoring
SELECT
    locktype,
    relation::regclass,
    mode,
    granted,
    pid,
    usename
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid;

-- Table bloat analysis
SELECT
    schemaname,
    tablename,
    n_tup_ins - n_tup_del as estimated_rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Resources & References

### 📖 Official Documentation
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)

### 🛠️ Tools & Monitoring
- [pgBadger](https://github.com/darold/pgbadger) - Log analyzer
- [pg_stat_monitor](https://github.com/percona/pg_stat_monitor) - Query monitoring
- [PgHero](https://github.com/ankane/pghero) - Performance dashboard

### 📚 Additional Learning
- [PostgreSQL High Performance](https://www.amazon.com/PostgreSQL-High-Performance-Books/dp/B07L7L6QZR)
- [Database Performance at Scale](https://www.brandur.org/postgres-performance)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/high-availability.html)

## Getting Started

1. **Review Prerequisites** - Ensure PostgreSQL expertise from Subject 9
2. **Set up Monitoring** - Install monitoring tools and extensions
3. **Complete Workshop 1** - Configure connection pooling
4. **Work through Tutorials** - Learn optimization techniques
5. **Practice with Workshops** - Implement production configurations
6. **Complete Homework** - Optimize real-world queries

## Assessment Criteria

- **Performance Analysis**: Effective query profiling and optimization
- **Connection Management**: Proper pool configuration and monitoring
- **Indexing Strategy**: Optimal index design and maintenance
- **Backup Implementation**: Comprehensive backup and recovery procedures
- **Replication Setup**: Correct read replica configuration and monitoring
- **Production Readiness**: System stability and performance under load

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 12**: AI-assisted frontend development
- **Subject 13**: Final project completion
- Production deployment and scaling

---

*Database optimization is critical for high-performance applications. This subject provides the skills needed to maintain and scale PostgreSQL databases in production environments.*

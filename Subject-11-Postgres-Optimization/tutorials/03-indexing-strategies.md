# Tutorial 03: Indexing Strategies and Index Types

## Overview
This tutorial covers PostgreSQL indexing strategies, including different index types, when to use them, index maintenance, and monitoring. You'll learn how to choose the right index for your queries and maintain optimal database performance.

## Index Fundamentals

### What is an Index?

An index is a data structure that improves the speed of data retrieval operations on a database table. Indexes work like book indexes - they allow the database to find data without scanning every row.

**Index Benefits:**
- Faster data retrieval
- Can enforce uniqueness constraints
- Support for efficient sorting and grouping

**Index Costs:**
- Slower INSERT/UPDATE/DELETE operations
- Additional storage space
- Maintenance overhead

### Index Structure in PostgreSQL

```
Table: users
├── id (Primary Key - implicit index)
├── email (Unique index)
├── name (B-tree index)
├── created_at (B-tree index)
└── profile_data (GIN index for JSON)

Index Storage:
├── pg_index directory
├── Index metadata
└── Index data structures
```

## B-tree Indexes (Default)

### Basic B-tree Index

```sql
-- Create basic B-tree index
CREATE INDEX idx_users_email ON users (email);

-- Create unique index
CREATE INDEX CONCURRENTLY idx_users_email_unique ON users (email);

-- Create index on multiple columns
CREATE INDEX idx_users_name_created ON users (name, created_at);

-- Partial index (index subset of table)
CREATE INDEX idx_active_users ON users (email) WHERE active = true;

-- Expression index
CREATE INDEX idx_users_email_domain ON users (substring(email from '@(.*)$'));
```

### B-tree Index Use Cases

```python
class BTreeIndexExamples:
    """Examples of B-tree index usage"""

    def equality_queries(self):
        """Equality queries (=)"""
        queries = [
            "SELECT * FROM users WHERE email = 'user@example.com'",
            "SELECT * FROM products WHERE category_id = 123"
        ]
        # B-tree indexes excel at equality lookups

    def range_queries(self):
        """Range queries (<, >, BETWEEN)"""
        queries = [
            "SELECT * FROM orders WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31'",
            "SELECT * FROM products WHERE price > 100",
            "SELECT * FROM users WHERE age >= 18 AND age <= 65"
        ]
        # B-tree indexes handle ranges efficiently

    def sorting_queries(self):
        """ORDER BY queries"""
        queries = [
            "SELECT * FROM users ORDER BY created_at DESC LIMIT 10",
            "SELECT * FROM products ORDER BY price ASC, name ASC"
        ]
        # B-tree indexes can satisfy ORDER BY without sorting

    def prefix_matching(self):
        """Prefix matching with LIKE"""
        queries = [
            "SELECT * FROM users WHERE name LIKE 'John%'",
            "SELECT * FROM products WHERE sku LIKE 'ABC%'"
        ]
        # B-tree indexes work well for left-anchored LIKE queries
```

### B-tree Index Maintenance

```python
class BTreeIndexMaintenance:
    """B-tree index maintenance operations"""

    def __init__(self, pool):
        self.pool = pool

    async def monitor_index_bloat(self):
        """Monitor index bloat"""
        query = """
        SELECT
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        ORDER BY pg_relation_size(indexrelid) DESC;
        """

        async with self.pool.acquire() as conn:
            results = await conn.fetch(query)
            return [dict(row) for row in results]

    async def reindex_unused_indexes(self):
        """Reindex or drop unused indexes"""
        query = """
        SELECT
            indexname,
            tablename,
            idx_scan,
            pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        ORDER BY pg_relation_size(indexrelid) DESC;
        """

        async with self.pool.acquire() as conn:
            unused_indexes = await conn.fetch(query)

            for row in unused_indexes:
                index_name = row['indexname']
                table_name = row['tablename']
                size = row['size']

                print(f"Consider dropping unused index: {index_name} on {table_name} ({size})")

                # Optionally drop the index
                # await conn.execute(f"DROP INDEX {index_name}")

    async def analyze_index_usage(self):
        """Analyze overall index usage"""
        query = """
        SELECT
            sum(idx_scan) as total_scans,
            sum(idx_tup_read) as total_tuples_read,
            sum(idx_tup_fetch) as total_tuples_fetched,
            count(*) as total_indexes,
            avg(idx_scan) as avg_scans_per_index
        FROM pg_stat_user_indexes;
        """

        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(query)
            return dict(result)

    async def rebuild_index_concurrently(self, index_name: str):
        """Rebuild index without blocking writes"""
        async with self.pool.acquire() as conn:
            # Create new index concurrently
            new_index_name = f"{index_name}_new"
            await conn.execute(f"CREATE INDEX CONCURRENTLY {new_index_name} ON ...")

            # Drop old index and rename new one
            await conn.execute(f"DROP INDEX {index_name}")
            await conn.execute(f"ALTER INDEX {new_index_name} RENAME TO {index_name}")

    async def create_index_if_beneficial(self, table: str, column: str, threshold: int = 1000):
        """Create index only if it would be beneficial"""
        async with self.pool.acquire() as conn:
            # Check table size
            table_size = await conn.fetchval(f"SELECT count(*) FROM {table}")

            if table_size < threshold:
                print(f"Table {table} too small for indexing ({table_size} rows)")
                return False

            # Check if index already exists
            index_exists = await conn.fetchval("""
                SELECT exists(
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = $1 AND indexdef LIKE $2
                )
            """, table, f"%({column})%")

            if index_exists:
                print(f"Index on {table}.{column} already exists")
                return False

            # Create index
            index_name = f"idx_{table}_{column}"
            await conn.execute(f"CREATE INDEX {index_name} ON {table} ({column})")

            print(f"Created index {index_name} on {table}.{column}")
            return True
```

## Specialized Index Types

### Hash Indexes

```sql
-- Create hash index (good for equality only)
CREATE INDEX idx_users_session_hash ON users USING hash (session_id);

-- Hash indexes are smaller and faster for equality lookups
-- but don't support range queries or sorting
```

```python
class HashIndexUseCases:
    """When to use hash indexes"""

    def session_management(self):
        """Session ID lookups"""
        queries = [
            "SELECT * FROM user_sessions WHERE session_id = 'abc123'",
            "SELECT user_id FROM sessions WHERE token = 'xyz789'"
        ]
        # Hash indexes perfect for exact matches

    def category_lookups(self):
        """Category or status lookups"""
        queries = [
            "SELECT * FROM products WHERE category = 'electronics'",
            "SELECT * FROM orders WHERE status = 'pending'"
        ]
        # Good when you have many rows with same value
```

### GIN Indexes (Generalized Inverted Index)

```sql
-- GIN index for arrays
CREATE INDEX idx_posts_tags_gin ON posts USING gin (tags);

-- GIN index for full-text search
CREATE INDEX idx_articles_search_gin ON articles USING gin (to_tsvector('english', content));

-- GIN index for JSONB
CREATE INDEX idx_products_metadata_gin ON products USING gin (metadata);
```

```python
class GINIndexExamples:
    """GIN index use cases"""

    def array_operations(self):
        """Array containment and overlap queries"""
        queries = [
            "SELECT * FROM posts WHERE tags @> ARRAY['python', 'django']",
            "SELECT * FROM products WHERE features && ARRAY['wireless', 'bluetooth']",
            "SELECT * FROM users WHERE interests <@ ARRAY['sports', 'music', 'tech']"
        ]

    def full_text_search(self):
        """Full-text search queries"""
        queries = [
            "SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('database & optimization')",
            "SELECT * FROM products WHERE to_tsvector('english', description) @@ plainto_tsquery('wireless headphones')"
        ]

    def json_operations(self):
        """JSONB queries"""
        queries = [
            "SELECT * FROM users WHERE metadata @> '{\"plan\": \"premium\"}'",
            "SELECT * FROM products WHERE specs ? 'color'",
            "SELECT * FROM events WHERE data -> 'type' = '\"conference\"'"
        ]
```

### GiST Indexes (Generalized Search Tree)

```sql
-- GiST for geometric data
CREATE INDEX idx_places_location_gist ON places USING gist (location);

-- GiST for range types
CREATE INDEX idx_events_duration_gist ON events USING gist (duration);

-- GiST for full-text search (alternative to GIN)
CREATE INDEX idx_documents_content_gist ON documents USING gist (to_tsvector('english', content));
```

```python
class GiSTIndexExamples:
    """GiST index use cases"""

    def geometric_queries(self):
        """Geometric/spatial queries"""
        queries = [
            "SELECT * FROM restaurants WHERE location <@ '((40.7128, -74.0060), 5000)'::circle",
            "SELECT * FROM properties WHERE boundaries && '((40.7, -74.0), (40.8, -74.1))'::box"
        ]

    def range_queries(self):
        """Range type queries"""
        queries = [
            "SELECT * FROM events WHERE duration && '[2 hours, 4 hours]'::interval",
            "SELECT * FROM schedules WHERE availability && '[2023-01-01, 2023-12-31]'::daterange"
        ]

    def text_similarity(self):
        """Text similarity searches"""
        queries = [
            "SELECT * FROM articles WHERE content % 'database optimization'",
            "SELECT * FROM products WHERE description %> 'wireless speaker'"
        ]
```

### Partial and Expression Indexes

```sql
-- Partial index (smaller, targeted)
CREATE INDEX idx_active_users_email ON users (email) WHERE active = true;

-- Expression index
CREATE INDEX idx_users_email_domain ON users (lower(substring(email from '@(.*)$')));

-- Functional index
CREATE INDEX idx_orders_total ON orders ((quantity * price));

-- Unique index with condition
CREATE UNIQUE INDEX idx_active_emails ON users (email) WHERE deleted_at IS NULL;
```

```python
class AdvancedIndexPatterns:
    """Advanced indexing patterns"""

    def partial_indexes(self):
        """When to use partial indexes"""
        scenarios = [
            # Index only active users
            "CREATE INDEX idx_active_users ON users (email) WHERE active = true",

            # Index only recent orders
            "CREATE INDEX idx_recent_orders ON orders (created_at) WHERE created_at > '2023-01-01'",

            # Index non-null values
            "CREATE INDEX idx_user_phones ON users (phone) WHERE phone IS NOT NULL"
        ]

    def expression_indexes(self):
        """Expression index examples"""
        expressions = [
            # Case-insensitive search
            "CREATE INDEX idx_users_email_ci ON users (lower(email))",

            # Date extraction
            "CREATE INDEX idx_logs_date ON logs (date(created_at))",

            # JSON path
            "CREATE INDEX idx_products_brand ON products ((metadata->>'brand'))",

            # Text length
            "CREATE INDEX idx_posts_length ON posts (length(content))"
        ]

    def covering_indexes(self):
        """Include all needed columns in index"""
        covering = [
            # Include data columns to avoid table lookup
            "CREATE INDEX idx_users_covering ON users (last_login) INCLUDE (name, email)",

            # For queries that only need these columns
            "SELECT name, email FROM users WHERE last_login > '2023-01-01'"
            # Can be satisfied entirely from index
        ]
```

## Index Strategy Selection

### Index Selection Framework

```python
class IndexStrategyAdvisor:
    """Recommend index strategies based on query patterns"""

    def __init__(self, pool):
        self.pool = pool

    async def analyze_query_patterns(self) -> dict:
        """Analyze current query patterns to recommend indexes"""

        async with self.pool.acquire() as conn:
            # Get slow queries
            slow_queries = await conn.fetch("""
                SELECT query, calls, total_time, mean_time
                FROM pg_stat_statements
                WHERE mean_time > 100  -- queries taking > 100ms on average
                ORDER BY mean_time DESC
                LIMIT 20
            """)

            # Get table access patterns
            table_scans = await conn.fetch("""
                SELECT schemaname, tablename, seq_scan, idx_scan,
                       seq_tup_read, idx_tup_fetch
                FROM pg_stat_user_tables
                WHERE seq_scan > idx_scan  -- More sequential than index scans
                ORDER BY seq_scan DESC
            """)

            return {
                'slow_queries': [dict(q) for q in slow_queries],
                'table_scans': [dict(t) for t in table_scans]
            }

    def recommend_indexes(self, analysis: dict) -> list:
        """Generate index recommendations"""

        recommendations = []

        # Analyze slow queries
        for query_info in analysis['slow_queries']:
            query = query_info['query']

            # Simple pattern matching for index recommendations
            if 'WHERE' in query.upper():
                table, columns = self._extract_table_and_columns(query)
                if table and columns:
                    recommendations.append({
                        'type': 'btree',
                        'table': table,
                        'columns': columns,
                        'reason': f'Slow query: {query_info["mean_time"]:.2f}ms avg',
                        'impact': 'high'
                    })

        # Analyze table scan patterns
        for table_info in analysis['table_scans']:
            table = table_info['tablename']
            seq_scans = table_info['seq_scan']
            idx_scans = table_info['idx_scan']

            if seq_scans > idx_scans * 2:  # Significantly more sequential scans
                recommendations.append({
                    'type': 'btree',
                    'table': table,
                    'columns': ['id'],  # Default primary key index
                    'reason': f'High sequential scan ratio: {seq_scans}/{idx_scans}',
                    'impact': 'medium'
                })

        return recommendations

    def _extract_table_and_columns(self, query: str) -> tuple:
        """Extract table and column info from query (simplified)"""

        # This is a very simplified parser
        # In production, use proper SQL parsing

        import re

        # Find FROM clause
        from_match = re.search(r'FROM\s+(\w+)', query, re.IGNORECASE)
        if not from_match:
            return None, None

        table = from_match.group(1)

        # Find WHERE conditions
        where_match = re.search(r'WHERE\s+(.+?)(ORDER|GROUP|LIMIT|$)', query, re.IGNORECASE | re.DOTALL)
        if not where_match:
            return table, None

        where_clause = where_match.group(1)

        # Extract column names from conditions
        columns = re.findall(r'(\w+)\s*[=<>!]+\s*[^=<>!]', where_clause)

        return table, list(set(columns)) if columns else None

    async def implement_recommendations(self, recommendations: list) -> dict:
        """Implement index recommendations"""

        results = []

        async with self.pool.acquire() as conn:
            for rec in recommendations:
                try:
                    # Generate index DDL
                    ddl = self._generate_index_ddl(rec)

                    # Execute DDL
                    await conn.execute(ddl)

                    results.append({
                        'recommendation': rec,
                        'ddl': ddl,
                        'status': 'created'
                    })

                except Exception as e:
                    results.append({
                        'recommendation': rec,
                        'error': str(e),
                        'status': 'failed'
                    })

        return {'results': results}

    def _generate_index_ddl(self, recommendation: dict) -> str:
        """Generate CREATE INDEX DDL"""

        table = recommendation['table']
        columns = recommendation['columns']
        index_type = recommendation.get('type', 'btree')

        # Generate index name
        col_part = '_'.join(columns)
        index_name = f"idx_{table}_{col_part}"

        if index_type == 'btree':
            return f"CREATE INDEX {index_name} ON {table} ({', '.join(columns)})"
        elif index_type == 'gin':
            return f"CREATE INDEX {index_name} ON {table} USING gin ({', '.join(columns)})"
        elif index_type == 'gist':
            return f"CREATE INDEX {index_name} ON {table} USING gist ({', '.join(columns)})"
        else:
            return f"CREATE INDEX {index_name} ON {table} ({', '.join(columns)})"
```

## Index Maintenance and Monitoring

### Index Health Monitoring

```python
class IndexHealthMonitor:
    """Monitor index health and performance"""

    def __init__(self, pool):
        self.pool = pool

    async def get_index_statistics(self) -> list:
        """Get comprehensive index statistics"""

        query = """
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            pg_stat_get_blocks_fetched(indexrelid) - pg_stat_get_blocks_hit(indexrelid) as blocks_missed,
            CASE
                WHEN idx_scan > 0 THEN round((idx_tup_fetch::float / idx_scan), 2)
                ELSE 0
            END as avg_tuples_per_scan
        FROM pg_stat_user_indexes
        ORDER BY pg_relation_size(indexrelid) DESC;
        """

        async with self.pool.acquire() as conn:
            results = await conn.fetch(query)
            return [dict(row) for row in results]

    async def identify_problematic_indexes(self) -> dict:
        """Identify indexes that may need attention"""

        stats = await self.get_index_statistics()

        problems = {
            'unused_indexes': [],
            'large_indexes': [],
            'inefficient_indexes': []
        }

        for stat in stats:
            # Unused indexes (no scans)
            if stat['scans'] == 0:
                problems['unused_indexes'].append(stat)

            # Large indexes (> 100MB)
            size_mb = self._parse_size_to_mb(stat['index_size'])
            if size_mb > 100:
                problems['large_indexes'].append(stat)

            # Low efficiency (few tuples per scan)
            if stat['scans'] > 0 and stat['avg_tuples_per_scan'] < 1:
                problems['inefficient_indexes'].append(stat)

        return problems

    def _parse_size_to_mb(self, size_str: str) -> float:
        """Parse PostgreSQL size string to MB"""
        import re

        match = re.match(r'(\d+(?:\.\d+)?)\s*(kB|MB|GB)', size_str)
        if not match:
            return 0

        value, unit = match.groups()
        value = float(value)

        if unit == 'kB':
            return value / 1024
        elif unit == 'MB':
            return value
        elif unit == 'GB':
            return value * 1024
        else:
            return value

    async def get_index_usage_report(self) -> dict:
        """Generate index usage report"""

        stats = await self.get_index_statistics()
        problems = await self.identify_problematic_indexes()

        total_indexes = len(stats)
        total_scans = sum(stat['scans'] for stat in stats)
        total_size_mb = sum(self._parse_size_to_mb(stat['index_size']) for stat in stats)

        return {
            'summary': {
                'total_indexes': total_indexes,
                'total_scans': total_scans,
                'total_size_mb': total_size_mb,
                'avg_scans_per_index': total_scans / total_indexes if total_indexes > 0 else 0,
                'avg_size_mb_per_index': total_size_mb / total_indexes if total_indexes > 0 else 0
            },
            'problems': problems,
            'top_indexes_by_size': sorted(stats, key=lambda x: self._parse_size_to_mb(x['index_size']), reverse=True)[:5],
            'top_indexes_by_usage': sorted(stats, key=lambda x: x['scans'], reverse=True)[:5],
            'generated_at': datetime.now().isoformat()
        }
```

### Index Maintenance Operations

```python
class IndexMaintenance:
    """Index maintenance operations"""

    def __init__(self, pool):
        self.pool = pool

    async def reindex_concurrently(self, index_name: str) -> bool:
        """Reindex without blocking writes"""

        async with self.pool.acquire() as conn:
            try:
                # Check if index exists
                exists = await conn.fetchval("""
                    SELECT exists(SELECT 1 FROM pg_indexes WHERE indexname = $1)
                """, index_name)

                if not exists:
                    print(f"Index {index_name} does not exist")
                    return False

                # Create new index concurrently
                new_index_name = f"{index_name}_reindex"
                await conn.execute(f"CREATE INDEX CONCURRENTLY {new_index_name} ON ...")  # Would need table/columns

                # Swap indexes
                await conn.execute(f"DROP INDEX {index_name}")
                await conn.execute(f"ALTER INDEX {new_index_name} RENAME TO {index_name}")

                print(f"Successfully reindexed {index_name}")
                return True

            except Exception as e:
                print(f"Reindexing failed: {e}")
                return False

    async def analyze_table_indexes(self, table_name: str) -> dict:
        """Analyze indexes for a specific table"""

        async with self.pool.acquire() as conn:
            # Get table indexes
            indexes = await conn.fetch("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = $1
                ORDER BY indexname
            """, table_name)

            # Get index statistics
            stats = await conn.fetch("""
                SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE tablename = $1
                ORDER BY indexname
            """, table_name)

            return {
                'table': table_name,
                'indexes': [dict(idx) for idx in indexes],
                'statistics': [dict(stat) for stat in stats]
            }

    async def cleanup_unused_indexes(self, dry_run: bool = True) -> list:
        """Identify and optionally drop unused indexes"""

        async with self.pool.acquire() as conn:
            unused_indexes = await conn.fetch("""
                SELECT schemaname, tablename, indexname,
                       pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes
                WHERE idx_scan = 0
                AND schemaname = 'public'
                ORDER BY pg_relation_size(indexrelid) DESC
            """)

            results = []

            for index in unused_indexes:
                action = "WOULD DROP" if dry_run else "DROPPING"

                print(f"{action} unused index: {index['indexname']} "
                      f"on {index['tablename']} ({index['size']})")

                if not dry_run:
                    try:
                        await conn.execute(f"DROP INDEX {index['indexname']}")
                        results.append({
                            'index': index['indexname'],
                            'table': index['tablename'],
                            'size': index['size'],
                            'status': 'dropped'
                        })
                    except Exception as e:
                        results.append({
                            'index': index['indexname'],
                            'table': index['tablename'],
                            'error': str(e),
                            'status': 'failed'
                        })

            return results
```

## Hands-on Exercises

### Exercise 1: B-tree Index Creation
1. Create a table with sample data (100k+ rows)
2. Add B-tree indexes on different column types
3. Compare query performance with and without indexes
4. Analyze index size and maintenance overhead

### Exercise 2: Specialized Index Types
1. Create GIN indexes for array and JSON operations
2. Implement full-text search with GIN indexes
3. Create GiST indexes for geometric data
4. Compare performance across index types

### Exercise 3: Index Strategy Optimization
1. Analyze slow queries in your application
2. Identify missing indexes using pg_stat_statements
3. Implement recommended indexes
4. Monitor impact on query performance

## Next Steps
- [Performance Monitoring Tutorial](../tutorials/04-performance-monitoring.md)
- [Workshop: asyncpg Pooling Lab](../workshops/workshop-01-asyncpg-pooling.md)

## Additional Resources
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Index Maintenance](https://www.postgresql.org/docs/current/routine-reindex.html)
- [Query Planning](https://www.postgresql.org/docs/current/geqo.html)
- [Index Best Practices](https://wiki.postgresql.org/wiki/Index_Maintenance)

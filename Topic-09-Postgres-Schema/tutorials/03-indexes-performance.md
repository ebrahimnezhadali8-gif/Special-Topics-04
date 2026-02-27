# Tutorial 03: Indexes and Database Performance Optimization

## Overview
This tutorial covers indexing strategies, query optimization, and performance tuning techniques in PostgreSQL. You'll learn how to identify slow queries, create appropriate indexes, and optimize database performance for different workloads.

## Understanding Indexes

### What is an Index?
An index is a data structure that improves the speed of data retrieval operations on a database table. It works similar to an index in a book - allowing quick lookup of information without scanning the entire content.

### Index Types in PostgreSQL

#### B-Tree Indexes (Default)
```sql
-- Single column B-Tree index
CREATE INDEX idx_users_email ON users(email);

-- Composite B-Tree index
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);

-- Unique index
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

#### Hash Indexes
```sql
-- Hash index (good for equality comparisons)
CREATE INDEX idx_products_sku ON products USING hash(sku);
```

#### GIN Indexes (Generalized Inverted Index)
```sql
-- For arrays and full-text search
CREATE INDEX idx_posts_tags ON posts USING gin(tags);
CREATE INDEX idx_posts_content ON posts USING gin(to_tsvector('english', content));
```

#### GiST Indexes (Generalized Search Tree)
```sql
-- For geometric data and full-text search
CREATE INDEX idx_locations_geom ON locations USING gist(ST_Point(longitude, latitude));

-- For full-text search (alternative to GIN)
CREATE INDEX idx_articles_content ON articles USING gist(to_tsvector('english', title || ' ' || content));
```

#### BRIN Indexes (Block Range INdexes)
```sql
-- For large tables with naturally ordered data
CREATE INDEX idx_logs_timestamp ON logs USING brin(created_at);
```

#### Partial Indexes
```sql
-- Index only active users
CREATE INDEX idx_active_users ON users(email) WHERE is_active = true;

-- Index recent orders
CREATE INDEX idx_recent_orders ON orders(user_id, created_at)
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
```

#### Expression Indexes
```sql
-- Index on expression
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Index on computed values
CREATE INDEX idx_products_discounted_price ON products((price * (1 - discount_rate)));
```

## Index Best Practices

### When to Create Indexes
- **Foreign keys**: Always index foreign key columns
- **WHERE clauses**: Index columns used in WHERE conditions
- **JOIN operations**: Index columns used in JOIN conditions
- **ORDER BY**: Index columns used for sorting
- **Frequently queried**: Index columns accessed often

### When NOT to Create Indexes
- **Small tables**: Tables with < 1000 rows
- **Low selectivity**: Columns with few distinct values
- **Write-heavy**: Tables with frequent INSERT/UPDATE/DELETE
- **Rarely queried**: Columns accessed infrequently

### Index Maintenance
```sql
-- Reindex (rebuild index)
REINDEX INDEX idx_users_email;

-- Reindex entire database
REINDEX DATABASE mydatabase;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Remove unused indexes
DROP INDEX IF EXISTS unused_index;
```

## Query Optimization

### EXPLAIN and ANALYZE
```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- Detailed EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';

-- EXPLAIN with different formats
EXPLAIN (FORMAT JSON) SELECT * FROM products WHERE category_id = 5;
EXPLAIN (FORMAT XML) SELECT * FROM users WHERE created_at > '2023-01-01';
```

### Reading EXPLAIN Output
```
Seq Scan on users  (cost=0.00..15.00 rows=1 width=32)
  Filter: (email = 'john@example.com'::text)

Index Scan using idx_users_email on users  (cost=0.28..8.29 rows=1 width=32)
  Index Cond: (email = 'john@example.com'::text)
```

**Key metrics:**
- **cost**: Estimated startup cost and total cost
- **rows**: Estimated number of rows returned
- **width**: Average width of rows in bytes
- **actual time**: Real execution time (with ANALYZE)

### Common Query Patterns

#### Pattern 1: Single Table Queries
```sql
-- Slow query
SELECT * FROM users WHERE last_login > '2023-01-01';
-- Add index
CREATE INDEX idx_users_last_login ON users(last_login);

-- Optimized query
SELECT * FROM users WHERE status = 'active' AND last_login > '2023-01-01';
-- Add composite index
CREATE INDEX idx_users_status_login ON users(status, last_login);
```

#### Pattern 2: JOIN Queries
```sql
-- Slow JOIN query
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01';

-- Add indexes
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

#### Pattern 3: Aggregation Queries
```sql
-- Slow aggregation
SELECT category_id, AVG(price), COUNT(*)
FROM products
GROUP BY category_id;

-- Add index for GROUP BY
CREATE INDEX idx_products_category ON products(category_id);

-- For more complex aggregations
CREATE INDEX idx_products_category_price ON products(category_id, price);
```

## Advanced Indexing Strategies

### Covering Indexes
```sql
-- Index covers all columns needed by query
CREATE INDEX idx_users_covering ON users(id, name, email, status);

-- Query can be satisfied entirely from index
SELECT id, name, email FROM users WHERE status = 'active';
```

### Index-Only Scans
```sql
-- PostgreSQL can scan index without touching table
CREATE INDEX idx_posts_published_covering ON posts(published_at, title, author_id)
WHERE status = 'published';

-- Query uses index-only scan
SELECT title, author_id FROM posts
WHERE published_at > '2023-01-01' AND status = 'published';
```

### Partial Indexes for Filtering
```sql
-- Index only unprocessed items
CREATE INDEX idx_queue_unprocessed ON job_queue(job_type, created_at)
WHERE processed = false;

-- Index only active subscriptions
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, expires_at)
WHERE status = 'active';
```

## Performance Monitoring

### System Catalogs and Views
```sql
-- View index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View table bloat
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    pg_size_pretty(pg_total_relation_size(tablename::text)) as total_size
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;

-- View slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### pg_stat_statements Extension
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View query statistics
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    temp_blks_written
FROM pg_stat_statements
WHERE query LIKE '%SELECT%'
ORDER BY total_time DESC
LIMIT 20;
```

## Query Optimization Techniques

### Optimizing SELECT Queries
```sql
-- Use LIMIT for large result sets
SELECT * FROM products ORDER BY created_at DESC LIMIT 100;

-- Use OFFSET efficiently
SELECT * FROM products ORDER BY id LIMIT 100 OFFSET 1000;

-- Use DISTINCT judiciously
SELECT DISTINCT category_id FROM products;  -- Consider separate categories table

-- Optimize subqueries
-- Slow
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100);

-- Fast
SELECT DISTINCT u.* FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100;
```

### Optimizing JOINs
```sql
-- Ensure proper indexing on JOIN columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Use appropriate JOIN types
-- INNER JOIN for required relationships
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN for optional relationships
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### Optimizing INSERT/UPDATE/DELETE
```sql
-- Batch operations for better performance
INSERT INTO logs (event_type, message, created_at)
VALUES ('info', 'Batch operation started', NOW()),
       ('info', 'Processing item 1', NOW()),
       ('info', 'Processing item 2', NOW());

-- Use ON CONFLICT for upsert operations
INSERT INTO user_preferences (user_id, theme, language)
VALUES (123, 'dark', 'en')
ON CONFLICT (user_id)
DO UPDATE SET theme = EXCLUDED.theme, language = EXCLUDED.language;

-- Bulk updates with CTEs
WITH updated_users AS (
    SELECT id FROM users WHERE last_login < CURRENT_DATE - INTERVAL '1 year'
)
UPDATE users SET status = 'inactive'
WHERE id IN (SELECT id FROM updated_users);
```

## Configuration Tuning

### Memory Settings
```sql
-- View current settings
SHOW shared_buffers;
SHOW work_mem;
SHOW maintenance_work_mem;

-- Adjust for your workload (postgresql.conf or ALTER SYSTEM)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Connection Settings
```sql
-- Connection pooling settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Restart required for shared_preload_libraries
-- sudo systemctl restart postgresql
```

### Autovacuum Settings
```sql
-- View autovacuum settings
SELECT name, setting, unit FROM pg_settings WHERE name LIKE 'autovacuum%';

-- Adjust autovacuum for high-write tables
ALTER TABLE user_activity SET (autovacuum_vacuum_scale_factor = 0.02);
ALTER TABLE user_activity SET (autovacuum_analyze_scale_factor = 0.01);

-- Manual vacuum and analyze
VACUUM ANALYZE user_activity;
```

## Performance Testing

### pgBench for Load Testing
```bash
# Initialize pgBench database
pgbench -i -s 10 testdb

# Run standard test
pgbench -c 10 -j 2 -T 60 testdb

# Custom benchmark script
cat > custom_benchmark.sql << 'EOF'
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
SELECT u.name, SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 10;
EOF

pgbench -f custom_benchmark.sql -c 5 -j 2 -T 30 testdb
```

### Monitoring Query Performance
```sql
-- Enable timing
\timing on

-- Test query performance
SELECT COUNT(*) FROM large_table;
SELECT * FROM large_table WHERE indexed_column = 'value';
SELECT * FROM large_table WHERE non_indexed_column = 'value';

-- View execution plan
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM large_table WHERE indexed_column = 'value';
```

## Real-World Optimization Examples

### E-commerce Query Optimization
```sql
-- Problematic query
SELECT p.name, p.price, c.name as category_name, AVG(r.rating) as avg_rating
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN reviews r ON p.id = r.product_id
WHERE p.price BETWEEN 50 AND 200
  AND c.name = 'Electronics'
  AND p.stock_quantity > 0
GROUP BY p.id, p.name, p.price, c.name
ORDER BY avg_rating DESC, p.price ASC
LIMIT 20;

-- Optimization steps
CREATE INDEX idx_products_category_price ON products(category_id, price);
CREATE INDEX idx_products_stock ON products(stock_quantity) WHERE stock_quantity > 0;
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_reviews_product_rating ON reviews(product_id, rating);

-- Optimized query with CTE
WITH product_stats AS (
    SELECT
        p.id,
        p.name,
        p.price,
        c.name as category_name,
        AVG(r.rating) as avg_rating
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.price BETWEEN 50 AND 200
      AND c.name = 'Electronics'
      AND p.stock_quantity > 0
    GROUP BY p.id, p.name, p.price, c.name
)
SELECT * FROM product_stats
ORDER BY avg_rating DESC NULLS LAST, price ASC
LIMIT 20;
```

### User Activity Log Optimization
```sql
-- High-volume logging table
CREATE TABLE user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE user_activity_2024_01 PARTITION OF user_activity
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
CREATE INDEX CONCURRENTLY idx_activity_user_action ON user_activity(user_id, action);
CREATE INDEX CONCURRENTLY idx_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX CONCURRENTLY idx_activity_resource ON user_activity(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_activity_metadata ON user_activity USING gin(metadata);

-- Optimized queries
SELECT COUNT(*) FROM user_activity WHERE user_id = ? AND created_at > CURRENT_DATE - INTERVAL '7 days';
SELECT action, COUNT(*) FROM user_activity WHERE created_at > CURRENT_DATE - INTERVAL '24 hours' GROUP BY action;
SELECT * FROM user_activity WHERE metadata->>'event_type' = 'login' ORDER BY created_at DESC LIMIT 50;
```

## Best Practices Summary

### Index Strategy
1. **Index foreign keys** - Always index foreign key columns
2. **Index WHERE clauses** - Columns used in WHERE conditions
3. **Composite indexes** - For multi-column WHERE clauses
4. **Partial indexes** - For filtered queries
5. **Monitor usage** - Remove unused indexes

### Query Optimization
1. **EXPLAIN queries** - Understand execution plans
2. **Choose appropriate JOINs** - INNER vs LEFT vs FULL
3. **Limit result sets** - Use LIMIT and OFFSET wisely
4. **Avoid SELECT *** - Specify required columns
5. **Use prepared statements** - For repeated queries

### Configuration Tuning
1. **shared_buffers** - 25% of RAM for dedicated servers
2. **work_mem** - Increase for complex queries
3. **maintenance_work_mem** - Increase for index creation
4. **autovacuum** - Configure for write-heavy workloads

### Monitoring and Maintenance
1. **Regular VACUUM** - Prevent table bloat
2. **ANALYZE tables** - Update statistics
3. **Monitor slow queries** - Use pg_stat_statements
4. **Reindex periodically** - Maintain index performance

## Hands-on Exercises

### Exercise 1: Index Analysis
1. Create a table with sample data
2. Run queries without indexes and measure performance
3. Add appropriate indexes and compare performance
4. Use EXPLAIN to understand query plans

### Exercise 2: Query Optimization
1. Identify slow queries in your application
2. Analyze execution plans using EXPLAIN
3. Create appropriate indexes
4. Rewrite queries for better performance

### Exercise 3: Performance Monitoring
1. Set up pg_stat_statements
2. Monitor query performance over time
3. Identify optimization opportunities
4. Create performance reports

## Next Steps
- [SQLAlchemy ORM Tutorial](../tutorials/04-sqlalchemy-orm.md)
- [Workshop: Migration Management](../workshops/workshop-02-migration-management.md)

## Additional Resources
- [PostgreSQL Documentation - Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Performance Tuning](https://www.postgresql.org/docs/current/runtime-config-query.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Monitoring Best Practices](https://www.postgresql.org/docs/current/monitoring.html)

# Workshop 03: PostgreSQL Optimization Assignment

## Overview
This workshop provides a comprehensive assignment where you'll optimize a slow PostgreSQL query, document the improvements, and create a performance analysis report. You'll apply all the concepts learned from the tutorials and previous workshops to solve real-world database performance problems.

## Prerequisites
- Completed [Query Profiling Workshop](../workshops/workshop-02-query-profiling.md)
- Understanding of EXPLAIN ANALYZE output
- Knowledge of PostgreSQL indexing and query optimization

## Learning Objectives
By the end of this assignment, you will be able to:
- Analyze slow queries using systematic profiling techniques
- Implement multiple optimization strategies
- Measure and quantify performance improvements
- Document optimization findings and recommendations
- Create comprehensive performance analysis reports

## Assignment Structure

### Part 1: Setup and Baseline Measurement

#### Step 1: Environment Setup

```bash
# Create assignment database
createdb optimization_assignment

# Connect to database
psql optimization_assignment

# Enable timing and create sample schema
\timing on
```

**assignment_schema.sql:**
```sql
-- Assignment database schema
-- Create tables for e-commerce scenario

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    city VARCHAR(100),
    country VARCHAR(100),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    payment_method VARCHAR(50)
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Product reviews table
CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    helpful_votes INTEGER DEFAULT 0
);

-- Indexes (minimal for baseline testing)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### Step 2: Generate Test Data

**generate_test_data.py:**
```python
#!/usr/bin/env python3
"""
Generate test data for optimization assignment
"""

import asyncio
import asyncpg
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

class TestDataGenerator:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def generate_users(self, count: int = 50000):
        """Generate users"""
        print(f"Generating {count} users...")

        users = []
        for i in range(count):
            user = {
                'username': fake.user_name() + str(i),
                'email': fake.email(),
                'full_name': fake.name(),
                'age': random.randint(18, 80),
                'city': fake.city(),
                'country': fake.country(),
                'registration_date': fake.date_time_between(start_date='-2y', end_date='now'),
                'last_login': fake.date_time_between(start_date='-1y', end_date='now') if random.random() > 0.3 else None
            }
            users.append(user)

            # Batch insert
            if len(users) >= 1000:
                await self._insert_users_batch(users)
                users = []

        if users:
            await self._insert_users_batch(users)

    async def _insert_users_batch(self, users: list):
        await self.pool.executemany("""
            INSERT INTO users (username, email, full_name, age, city, country, registration_date, last_login)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, [(u['username'], u['email'], u['full_name'], u['age'],
               u['city'], u['country'], u['registration_date'], u['last_login']) for u in users])

    async def generate_products(self, count: int = 10000):
        """Generate products"""
        print(f"Generating {count} products...")

        categories = ['Electronics', 'Books', 'Clothing', 'Home', 'Sports', 'Beauty', 'Toys', 'Automotive']
        brands = [fake.company() for _ in range(200)]

        products = []
        for i in range(count):
            product = {
                'name': fake.sentence(nb_words=random.randint(2, 6))[:-1],
                'description': fake.paragraph(),
                'price': round(random.uniform(5, 2000), 2),
                'category': random.choice(categories),
                'brand': random.choice(brands),
                'stock_quantity': random.randint(0, 1000),
                'created_at': fake.date_time_between(start_date='-1y', end_date='now')
            }
            products.append(product)

            if len(products) >= 500:
                await self._insert_products_batch(products)
                products = []

        if products:
            await self._insert_products_batch(products)

    async def _insert_products_batch(self, products: list):
        await self.pool.executemany("""
            INSERT INTO products (name, description, price, category, brand, stock_quantity, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, [(p['name'], p['description'], p['price'], p['category'],
               p['brand'], p['stock_quantity'], p['created_at']) for p in products])

    async def generate_orders_and_reviews(self, user_count: int, product_count: int):
        """Generate orders and reviews"""
        print("Generating orders and reviews...")

        # Generate orders
        order_count = 80000  # Roughly 1.6 orders per user on average

        async with self.pool.acquire() as conn:
            # Get user and product IDs
            user_ids = await conn.fetch("SELECT id FROM users ORDER BY RANDOM() LIMIT $1", user_count)
            product_ids = await conn.fetch("SELECT id FROM products ORDER BY RANDOM() LIMIT $1", product_count)

        user_ids = [row['id'] for row in user_ids]
        product_ids = [row['id'] for row in product_ids]

        # Generate orders
        orders = []
        for i in range(order_count):
            user_id = random.choice(user_ids)
            order_date = fake.date_time_between(start_date='-1y', end_date='now')

            # Generate 1-5 items per order
            item_count = random.randint(1, 5)
            total_amount = 0
            order_items = []

            for _ in range(item_count):
                product_id = random.choice(product_ids)
                quantity = random.randint(1, 3)
                # Get product price (simplified - using random price)
                unit_price = round(random.uniform(10, 500), 2)
                total_price = unit_price * quantity
                total_amount += total_price

                order_items.append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total_price
                })

            order = {
                'user_id': user_id,
                'order_date': order_date,
                'total_amount': total_amount,
                'status': random.choice(['completed', 'pending', 'shipped', 'cancelled']),
                'shipping_address': fake.address(),
                'payment_method': random.choice(['credit_card', 'paypal', 'bank_transfer']),
                'items': order_items
            }
            orders.append(order)

        # Batch insert orders and items
        for i in range(0, len(orders), 1000):
            batch = orders[i:i+1000]
            await self._insert_orders_batch(batch)

        # Generate product reviews
        review_count = 15000
        reviews = []
        for i in range(review_count):
            review = {
                'product_id': random.choice(product_ids),
                'user_id': random.choice(user_ids),
                'rating': random.randint(1, 5),
                'review_text': fake.paragraph() if random.random() > 0.5 else fake.sentence(),
                'helpful_votes': random.randint(0, 50)
            }
            reviews.append(review)

        # Insert reviews in batches
        for i in range(0, len(reviews), 1000):
            batch = reviews[i:i+1000]
            await self.pool.executemany("""
                INSERT INTO product_reviews (product_id, user_id, rating, review_text, helpful_votes)
                VALUES ($1, $2, $3, $4, $5)
            """, [(r['product_id'], r['user_id'], r['rating'], r['review_text'], r['helpful_votes']) for r in batch])

    async def _insert_orders_batch(self, orders: list):
        """Insert orders and their items"""
        async with self.pool.acquire() as conn:
            for order in orders:
                # Insert order
                order_id = await conn.fetchval("""
                    INSERT INTO orders (user_id, order_date, total_amount, status, shipping_address, payment_method)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                """, order['user_id'], order['order_date'], order['total_amount'],
                    order['status'], order['shipping_address'], order['payment_method'])

                # Insert order items
                for item in order['items']:
                    await conn.execute("""
                        INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                        VALUES ($1, $2, $3, $4, $5)
                    """, order_id, item['product_id'], item['quantity'],
                        item['unit_price'], item['total_price'])

async def main():
    """Generate all test data"""
    pool = await asyncpg.create_pool(
        user='postgres',
        password='password',
        database='optimization_assignment',
        host='localhost'
    )

    try:
        generator = TestDataGenerator(pool)

        print("Starting test data generation...")
        start_time = datetime.now()

        await generator.generate_users(50000)
        await generator.generate_products(10000)
        await generator.generate_orders_and_reviews(50000, 10000)

        end_time = datetime.now()
        duration = end_time - start_time

        print(f"Data generation completed in {duration}")

        # Print statistics
        async with pool.acquire() as conn:
            stats = await conn.fetch("""
                SELECT
                    (SELECT COUNT(*) FROM users) as users,
                    (SELECT COUNT(*) FROM products) as products,
                    (SELECT COUNT(*) FROM orders) as orders,
                    (SELECT COUNT(*) FROM order_items) as order_items,
                    (SELECT COUNT(*) FROM product_reviews) as reviews
            """)

            row = stats[0]
            print(f"Generated: {row['users']} users, {row['products']} products, "
                  f"{row['orders']} orders, {row['order_items']} order items, "
                  f"{row['reviews']} reviews")

    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 2: The Optimization Challenge

#### Step 3: The Target Query

**target_query.sql:**
```sql
-- TARGET QUERY FOR OPTIMIZATION
-- This query represents a complex business intelligence query that
-- retrieves user purchase analytics with product performance metrics

SELECT
    u.city,
    u.country,
    p.category,
    p.brand,
    DATE_TRUNC('month', o.order_date) as order_month,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT o.user_id) as unique_customers,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    COUNT(oi.id) as total_items_sold,
    SUM(oi.quantity) as total_quantity_sold,
    AVG(pr.rating) as avg_product_rating,
    COUNT(pr.id) as total_reviews,
    SUM(CASE WHEN pr.rating >= 4 THEN 1 ELSE 0 END) as positive_reviews
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
LEFT JOIN product_reviews pr ON p.id = pr.product_id
WHERE o.order_date >= '2023-01-01'
  AND o.status = 'completed'
  AND u.is_active = true
  AND p.is_available = true
GROUP BY u.city, u.country, p.category, p.brand, DATE_TRUNC('month', o.order_date)
ORDER BY total_revenue DESC, order_month DESC
LIMIT 100;
```

This query is designed to be slow and demonstrate common optimization opportunities:

**Performance Issues:**
- Multiple JOINs across large tables
- Complex aggregations with grouping
- LEFT JOIN that may not be necessary
- No appropriate indexes for the query pattern
- Suboptimal execution plan

#### Step 4: Baseline Performance Measurement

**baseline_measurement.py:**
```python
#!/usr/bin/env python3
"""
Measure baseline performance of the target query
"""

import asyncio
import asyncpg
import json
import time
from datetime import datetime

class PerformanceMeasurer:
    def __init__(self, database_url: str):
        self.database_url = database_url

    async def measure_query_performance(self, query: str, iterations: int = 3) -> dict:
        """Measure query performance over multiple runs"""

        pool = await asyncpg.create_pool(self.database_url)

        try:
            results = []

            print(f"Measuring query performance over {iterations} iterations...")

            for i in range(iterations):
                print(f"  Run {i+1}/{iterations}...")

                # Clear caches before each run
                async with pool.acquire() as conn:
                    await conn.execute("DISCARD ALL")

                # Measure execution time
                start_time = time.time()
                async with pool.acquire() as conn:
                    result = await conn.fetch(query)
                end_time = time.time()

                execution_time = (end_time - start_time) * 1000  # milliseconds
                row_count = len(result)

                results.append({
                    'run': i + 1,
                    'execution_time_ms': execution_time,
                    'row_count': row_count
                })

                print(".2f")

            # Calculate statistics
            execution_times = [r['execution_time_ms'] for r in results]
            avg_time = sum(execution_times) / len(execution_times)
            min_time = min(execution_times)
            max_time = max(execution_times)
            std_dev = (sum((x - avg_time) ** 2 for x in execution_times) / len(execution_times)) ** 0.5

            # Get EXPLAIN ANALYZE for the last run
            async with pool.acquire() as conn:
                explain_result = await conn.fetchval(f"EXPLAIN (FORMAT JSON, ANALYZE) {query}")
                explain_data = json.loads(explain_result)[0]

            return {
                'query': query,
                'measurements': results,
                'statistics': {
                    'average_time_ms': avg_time,
                    'min_time_ms': min_time,
                    'max_time_ms': max_time,
                    'std_dev_ms': std_dev,
                    'total_runs': iterations
                },
                'explain_plan': explain_data,
                'timestamp': datetime.now().isoformat()
            }

        finally:
            await pool.close()

    async def analyze_explain_plan(self, explain_data: dict) -> dict:
        """Analyze EXPLAIN plan for performance insights"""

        plan = explain_data['Plan']

        analysis = {
            'total_cost': plan.get('Total Cost', 0),
            'execution_time': explain_data.get('Execution Time', 0),
            'planning_time': explain_data.get('Planning Time', 0),
            'bottlenecks': self._identify_bottlenecks(plan),
            'node_types': self._count_node_types(plan),
            'recommendations': []
        }

        # Generate recommendations based on analysis
        if analysis['total_cost'] > 10000:
            analysis['recommendations'].append("High query cost detected - consider optimization")

        bottlenecks = analysis['bottlenecks']
        if any('Seq Scan' in b for b in bottlenecks):
            analysis['recommendations'].append("Sequential scans detected - add appropriate indexes")

        if any('Nested Loop' in b for b in bottlenecks):
            analysis['recommendations'].append("Nested loop joins detected - consider different join strategies")

        return analysis

    def _identify_bottlenecks(self, plan: dict) -> list:
        """Identify performance bottlenecks"""

        bottlenecks = []

        def analyze_node(node, path=""):
            node_type = node.get('Node Type', '')

            if node_type == 'Seq Scan' and node.get('Actual Rows', 0) > 10000:
                bottlenecks.append(f"Large sequential scan: {node.get('Actual Rows', 0)} rows")

            if node_type == 'Nested Loop':
                actual_loops = node.get('Actual Loops', 0)
                if actual_loops > 100:
                    bottlenecks.append(f"Inefficient nested loop: {actual_loops} iterations")

            if node_type == 'Sort':
                sort_method = node.get('Sort Method', '')
                if 'external' in sort_method.lower():
                    bottlenecks.append("External sort - consider increasing work_mem")

            if 'Plans' in node:
                for i, child in enumerate(node['Plans']):
                    analyze_node(child, f"{path}/child_{i}" if path else f"child_{i}")

        analyze_node(plan)
        return bottlenecks

    def _count_node_types(self, plan: dict) -> dict:
        """Count different node types in the plan"""

        counts = {}

        def count_nodes(node):
            node_type = node.get('Node Type', 'Unknown')
            counts[node_type] = counts.get(node_type, 0) + 1

            if 'Plans' in node:
                for child in node['Plans']:
                    count_nodes(child)

        count_nodes(plan)
        return counts

async def main():
    """Run baseline performance measurement"""

    database_url = "postgresql://postgres:password@localhost/optimization_assignment"

    measurer = PerformanceMeasurer(database_url)

    # Load target query
    with open('target_query.sql', 'r') as f:
        target_query = f.read().strip()

    print("BASELINE PERFORMANCE MEASUREMENT")
    print("=" * 50)
    print("Target Query:")
    print(target_query)
    print()

    # Measure performance
    baseline_results = await measurer.measure_query_performance(target_query, iterations=3)

    # Analyze explain plan
    explain_analysis = await measurer.analyze_explain_plan(baseline_results['explain_plan'])

    # Combine results
    report = {
        'baseline_measurement': baseline_results,
        'explain_analysis': explain_analysis,
        'query_complexity': 'high',  # Based on multiple joins and aggregations
        'estimated_optimization_potential': 'high'  # Based on analysis
    }

    # Save baseline report
    with open('baseline_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print("\nBASELINE RESULTS:")
    print(".2f")
    print(f"Total Cost: {baseline_results['explain_plan']['Plan'].get('Total Cost', 0):.2f}")
    print(f"Row Count: {len(baseline_results['measurements'][0].get('rows', []))}")

    print(f"\nBottlenecks Found: {len(explain_analysis['bottlenecks'])}")
    for bottleneck in explain_analysis['bottlenecks']:
        print(f"  • {bottleneck}")

    print("
Recommendations:"    for rec in explain_analysis['recommendations']:
        print(f"  • {rec}")

    print("
Baseline report saved to baseline_report.json"    print("\nNow proceed with optimization strategies!")

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 3: Optimization Implementation

#### Step 5: Index Optimization Strategy

**index_optimization.sql:**
```sql
-- INDEX OPTIMIZATION STRATEGY
-- Based on the target query analysis, implement appropriate indexes

-- 1. Composite index for JOIN conditions and WHERE clauses
CREATE INDEX CONCURRENTLY idx_orders_user_date_status
ON orders (user_id, order_date, status);

-- 2. Index for order items JOIN
CREATE INDEX CONCURRENTLY idx_order_items_order_product
ON order_items (order_id, product_id);

-- 3. Index for product filtering
CREATE INDEX CONCURRENTLY idx_products_category_available
ON products (category, is_available);

-- 4. Index for user filtering
CREATE INDEX CONCURRENTLY idx_users_active_city_country
ON users (is_active, city, country);

-- 5. Index for product reviews JOIN
CREATE INDEX CONCURRENTLY idx_product_reviews_product_rating
ON product_reviews (product_id, rating);

-- 6. Partial index for completed orders (most common filter)
CREATE INDEX CONCURRENTLY idx_orders_completed_date
ON orders (order_date)
WHERE status = 'completed';

-- 7. Expression index for monthly aggregation
CREATE INDEX CONCURRENTLY idx_orders_month
ON orders (DATE_TRUNC('month', order_date));

-- 8. Covering index for frequently accessed columns
CREATE INDEX CONCURRENTLY idx_users_covering
ON users (id, city, country, is_active)
INCLUDE (full_name);

-- 9. Index for brand filtering
CREATE INDEX CONCURRENTLY idx_products_brand_category
ON products (brand, category)
WHERE brand IS NOT NULL;
```

#### Step 6: Query Rewrite Optimization

**query_rewrite.sql:**
```sql
-- QUERY REWRITE OPTIMIZATION
-- Original query with performance optimizations

-- OPTIMIZED VERSION 1: Pre-aggregated subqueries
WITH monthly_order_stats AS (
    SELECT
        DATE_TRUNC('month', o.order_date) as order_month,
        o.user_id,
        u.city,
        u.country,
        COUNT(DISTINCT o.id) as user_orders,
        SUM(o.total_amount) as user_revenue,
        SUM(oi.quantity) as user_quantity
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.order_date >= '2023-01-01'
      AND o.status = 'completed'
      AND u.is_active = true
    GROUP BY DATE_TRUNC('month', o.order_date), o.user_id, u.city, u.country
),
product_performance AS (
    SELECT
        p.category,
        p.brand,
        DATE_TRUNC('month', o.order_date) as order_month,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as unique_customers,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.total_price) as avg_order_value
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_date >= '2023-01-01'
      AND o.status = 'completed'
      AND p.is_available = true
    GROUP BY p.category, p.brand, DATE_TRUNC('month', o.order_date)
),
product_ratings AS (
    SELECT
        p.category,
        p.brand,
        AVG(pr.rating) as avg_rating,
        COUNT(pr.id) as total_reviews,
        SUM(CASE WHEN pr.rating >= 4 THEN 1 ELSE 0 END) as positive_reviews
    FROM products p
    LEFT JOIN product_reviews pr ON p.id = pr.product_id
    WHERE p.is_available = true
    GROUP BY p.category, p.brand
)
SELECT
    mos.city,
    mos.country,
    pp.category,
    pp.brand,
    mos.order_month,
    SUM(pp.total_orders) as total_orders,
    SUM(pp.unique_customers) as unique_customers,
    SUM(pp.total_revenue) as total_revenue,
    AVG(pp.avg_order_value) as avg_order_value,
    SUM(pp.total_quantity) as total_items_sold,
    pr.avg_rating as avg_product_rating,
    pr.total_reviews,
    pr.positive_reviews
FROM monthly_order_stats mos
JOIN product_performance pp ON mos.order_month = pp.order_month
LEFT JOIN product_ratings pr ON pp.category = pr.category AND pp.brand = pr.brand
GROUP BY mos.city, mos.country, pp.category, pp.brand, mos.order_month,
         pr.avg_rating, pr.total_reviews, pr.positive_reviews
ORDER BY total_revenue DESC, order_month DESC
LIMIT 100;

-- OPTIMIZED VERSION 2: Simplified aggregation
SELECT
    u.city,
    u.country,
    p.category,
    p.brand,
    DATE_TRUNC('month', o.order_date) as order_month,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT o.user_id) as unique_customers,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    SUM(oi.quantity) as total_items_sold,
    AVG(pr.rating) as avg_product_rating,
    COUNT(pr.id) as total_reviews,
    SUM(CASE WHEN pr.rating >= 4 THEN 1 ELSE 0 END) as positive_reviews
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.created_at >= '2023-01-01'
WHERE o.order_date >= '2023-01-01'
  AND o.status = 'completed'
  AND u.is_active = true
  AND p.is_available = true
GROUP BY u.city, u.country, p.category, p.brand, DATE_TRUNC('month', o.order_date)
ORDER BY total_revenue DESC, order_month DESC
LIMIT 100;
```

#### Step 7: Configuration Optimization

**postgresql_optimization.conf:**
```sql
-- PostgreSQL configuration optimizations for this workload

-- Memory settings (adjust based on server resources)
SET work_mem = '128MB';           -- Increase for complex queries
SET maintenance_work_mem = '256MB'; -- For index creation
SET shared_buffers = '256MB';     -- Increase shared buffers

-- Query planning settings
SET random_page_cost = 1.1;       -- SSD optimization
SET effective_cache_size = '1GB'; -- Server cache estimate
SET default_statistics_target = 100; -- Better statistics

-- Parallel processing
SET max_parallel_workers_per_gather = 4;
SET max_parallel_workers = 8;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 1000.0;

-- Connection settings
SET statement_timeout = '300s';   -- 5 minute timeout

-- Logging for performance analysis
SET log_statement = 'ddl';
SET log_duration = on;
SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Autovacuum settings
SET autovacuum_max_workers = 4;
SET autovacuum_naptime = '20s';
SET autovacuum_vacuum_threshold = 50;
SET autovacuum_analyze_threshold = 50;
```

### Part 4: Performance Measurement and Reporting

#### Step 8: Optimization Results Measurement

**optimization_results.py:**
```python
#!/usr/bin/env python3
"""
Measure and compare optimization results
"""

import asyncio
import asyncpg
import json
from datetime import datetime
from baseline_measurement import PerformanceMeasurer

class OptimizationEvaluator:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.measurer = PerformanceMeasurer(database_url)

    async def run_optimization_comparison(self) -> dict:
        """Compare baseline vs optimized performance"""

        # Load target query
        with open('target_query.sql', 'r') as f:
            original_query = f.read().strip()

        # Define optimization strategies
        optimizations = {
            'baseline': original_query,
            'with_indexes': original_query,  # Same query, different indexes
            'query_rewrite_v1': self._load_query_rewrite('query_rewrite_v1.sql'),
            'query_rewrite_v2': self._load_query_rewrite('query_rewrite_v2.sql'),
        }

        results = {}

        print("COMPREHENSIVE OPTIMIZATION EVALUATION")
        print("=" * 50)

        for name, query in optimizations.items():
            print(f"\nTesting: {name}")
            print("-" * 30)

            try:
                # Measure performance
                performance = await self.measurer.measure_query_performance(query, iterations=3)

                # Analyze plan
                plan_analysis = await self.measurer.analyze_explain_plan(performance['explain_plan'])

                results[name] = {
                    'performance': performance,
                    'analysis': plan_analysis,
                    'query_length': len(query)
                }

                # Print summary
                stats = performance['statistics']
                print(".2f")
                print(".2f")
                print(f"Bottlenecks: {len(plan_analysis['bottlenecks'])}")

            except Exception as e:
                print(f"Error testing {name}: {e}")
                results[name] = {'error': str(e)}

        # Generate comparison report
        comparison = self._generate_comparison_report(results)

        # Save detailed report
        report = {
            'optimization_comparison': results,
            'comparison_summary': comparison,
            'generated_at': datetime.now().isoformat(),
            'database_info': await self._get_database_info()
        }

        with open('optimization_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)

        return report

    def _load_query_rewrite(self, filename: str) -> str:
        """Load query rewrite from file"""
        try:
            with open(filename, 'r') as f:
                return f.read().strip()
        except FileNotFoundError:
            return "-- Query rewrite not found"

    async def _get_database_info(self) -> dict:
        """Get database and system information"""
        pool = await asyncpg.create_pool(self.database_url)

        try:
            async with pool.acquire() as conn:
                # Database version and settings
                version = await conn.fetchval("SELECT version()")

                # Table sizes
                table_sizes = await conn.fetch("""
                    SELECT schemaname, tablename,
                           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                """)

                # Index information
                index_info = await conn.fetch("""
                    SELECT count(*) as total_indexes,
                           sum(pg_relation_size(indexrelid)) as total_index_size
                    FROM pg_stat_user_indexes
                """)

                return {
                    'postgresql_version': version,
                    'table_sizes': [dict(row) for row in table_sizes],
                    'index_summary': dict(index_info[0]) if index_info else {},
                    'measurement_time': datetime.now().isoformat()
                }

        finally:
            await pool.close()

    def _generate_comparison_report(self, results: dict) -> dict:
        """Generate comprehensive comparison report"""

        valid_results = {k: v for k, v in results.items() if 'error' not in v}

        if not valid_results:
            return {'error': 'No valid results to compare'}

        # Extract performance metrics
        performance_data = {}
        for name, data in valid_results.items():
            perf = data['performance']['statistics']
            performance_data[name] = {
                'avg_time': perf['average_time_ms'],
                'min_time': perf['min_time_ms'],
                'max_time': perf['max_time_ms'],
                'total_cost': data['performance']['explain_plan']['Plan'].get('Total Cost', 0),
                'bottlenecks': len(data['analysis']['bottlenecks'])
            }

        # Calculate improvements
        baseline = performance_data.get('baseline', {})
        improvements = {}

        for name, data in performance_data.items():
            if name != 'baseline' and baseline:
                time_improvement = ((baseline['avg_time'] - data['avg_time']) / baseline['avg_time']) * 100
                cost_improvement = ((baseline['total_cost'] - data['total_cost']) / baseline['total_cost']) * 100

                improvements[name] = {
                    'time_improvement_percent': time_improvement,
                    'cost_improvement_percent': cost_improvement,
                    'bottleneck_reduction': baseline['bottlenecks'] - data['bottlenecks']
                }

        # Find best performing optimization
        best_optimization = min(
            [(name, data) for name, data in performance_data.items() if name != 'baseline'],
            key=lambda x: x[1]['avg_time'],
            default=None
        )

        return {
            'performance_comparison': performance_data,
            'improvements': improvements,
            'best_optimization': best_optimization[0] if best_optimization else None,
            'overall_improvement': self._calculate_overall_improvement(improvements),
            'recommendations': self._generate_final_recommendations(improvements, best_optimization)
        }

    def _calculate_overall_improvement(self, improvements: dict) -> dict:
        """Calculate overall improvement statistics"""

        if not improvements:
            return {}

        time_improvements = [data['time_improvement_percent'] for data in improvements.values()]
        cost_improvements = [data['cost_improvement_percent'] for data in improvements.values()]

        return {
            'average_time_improvement': sum(time_improvements) / len(time_improvements),
            'average_cost_improvement': sum(cost_improvements) / len(cost_improvements),
            'best_time_improvement': max(time_improvements) if time_improvements else 0,
            'best_cost_improvement': max(cost_improvements) if cost_improvements else 0,
            'optimizations_tested': len(improvements)
        }

    def _generate_final_recommendations(self, improvements: dict, best_optimization) -> list:
        """Generate final recommendations"""

        recommendations = []

        if not improvements:
            recommendations.append("No optimizations were successfully tested")
            return recommendations

        # Recommend best performing optimization
        if best_optimization:
            best_name, best_data = best_optimization
            time_imp = best_data['time_improvement_percent']
            cost_imp = best_data['cost_improvement_percent']

            recommendations.append(f"Best performing optimization: {best_name}")
            recommendations.append(".1f")
            recommendations.append(".1f")

        # General recommendations
        avg_time_imp = sum(data['time_improvement_percent'] for data in improvements.values()) / len(improvements)

        if avg_time_imp > 50:
            recommendations.append("Excellent optimization results - significant performance improvement achieved")
        elif avg_time_imp > 25:
            recommendations.append("Good optimization results - noticeable performance improvement")
        else:
            recommendations.append("Modest optimization results - consider additional optimization strategies")

        # Specific recommendations based on improvements
        max_time_imp = max((data['time_improvement_percent'] for data in improvements.values()), default=0)
        if max_time_imp < 10:
            recommendations.append("Consider query redesign or additional indexing strategies")

        return recommendations

async def main():
    """Run optimization evaluation"""

    database_url = "postgresql://postgres:password@localhost/optimization_assignment"

    evaluator = OptimizationEvaluator(database_url)

    print("Starting comprehensive optimization evaluation...")

    # Run comparison
    report = await evaluator.run_optimization_comparison()

    # Print summary
    comparison = report.get('comparison_summary', {})

    if 'error' in comparison:
        print(f"Error: {comparison['error']}")
        return

    print("\nOPTIMIZATION RESULTS SUMMARY")
    print("=" * 40)

    perf_comp = comparison.get('performance_comparison', {})
    improvements = comparison.get('improvements', {})
    overall = comparison.get('overall_improvement', {})

    print("Performance Comparison:")
    for name, data in perf_comp.items():
        print(".2f")

    print("
Optimization Improvements:"    for name, data in improvements.items():
        print(".1f")

    print("
Overall Results:"    print(".1f")
    print(".1f")
    print(f"Optimizations tested: {overall.get('optimizations_tested', 0)}")
    print(f"Best optimization: {comparison.get('best_optimization', 'None')}")

    print("
Final Recommendations:"    for rec in comparison.get('recommendations', []):
        print(f"• {rec}")

    print("
Detailed report saved to optimization_report.json"
    print("Assignment completed! 🎉")

if __name__ == "__main__":
    asyncio.run(main())
```

## Running the Assignment

### Execute the Complete Assignment

```bash
# 1. Set up database and generate data
createdb optimization_assignment
psql optimization_assignment < assignment_schema.sql
python generate_test_data.py

# 2. Establish baseline performance
python baseline_measurement.py

# 3. Implement optimizations
psql optimization_assignment < index_optimization.sql

# 4. Test query rewrites (uncomment one at a time in query_rewrite.sql)
psql optimization_assignment < query_rewrite.sql

# 5. Configure PostgreSQL optimizations
psql optimization_assignment < postgresql_optimization.conf

# 6. Run final evaluation
python optimization_results.py
```

### Assignment Deliverables

#### 1. Performance Analysis Report

**optimization_report.md:**
```markdown
# PostgreSQL Query Optimization Assignment Report

## Executive Summary

[Brief summary of optimization results and key findings]

## Baseline Performance

### Original Query Performance
- Average execution time: X ms
- Total cost: Y
- Bottlenecks identified: Z

### Query Analysis
[Describe the original query structure and identified performance issues]

## Optimization Strategies Implemented

### 1. Index Optimization
[Describe indexes added and their impact]

### 2. Query Rewrites
[Describe query restructuring approaches and results]

### 3. Configuration Changes
[Document PostgreSQL configuration optimizations]

## Results and Improvements

### Performance Comparison

| Strategy | Avg Time (ms) | Improvement | Cost Reduction |
|----------|---------------|-------------|----------------|
| Baseline | XXX | - | - |
| With Indexes | XXX | XX% | XX% |
| Query Rewrite V1 | XXX | XX% | XX% |
| Query Rewrite V2 | XXX | XX% | XX% |

### Bottleneck Analysis
[Detail how bottlenecks were addressed]

## Key Insights and Learnings

### What Worked Well
[List successful optimization strategies]

### Challenges Encountered
[Describe difficulties and how they were overcome]

### Best Practices Identified
[Document optimization best practices discovered]

## Recommendations

### Immediate Actions
[Short-term optimizations to implement]

### Long-term Improvements
[Architectural or infrastructure improvements]

### Monitoring Strategy
[How to monitor query performance going forward]

## Conclusion

[Summarize the overall optimization success and lessons learned]
```

## Challenge Exercises

### Challenge 1: Advanced Query Optimization
1. Implement partitioning on the orders table by date
2. Create materialized views for complex aggregations
3. Implement query result caching strategies
4. Test the impact of different PostgreSQL versions

### Challenge 2: Scalability Testing
1. Scale the dataset to 1M+ records
2. Test optimization strategies under concurrent load
3. Implement horizontal scaling with read replicas
4. Measure performance under different workload patterns

### Challenge 3: Automated Optimization
1. Create a script that automatically analyzes slow queries
2. Implement automatic index recommendations
3. Build a query optimization pipeline
4. Create performance regression tests

## Verification Checklist

### Assignment Completion
- [ ] Database schema created with appropriate test data
- [ ] Baseline performance measurements taken
- [ ] Multiple optimization strategies implemented and tested
- [ ] Performance improvements quantified and documented
- [ ] Comprehensive analysis report written

### Technical Implementation
- [ ] Indexes properly designed and implemented
- [ ] Query rewrites tested for correctness and performance
- [ ] PostgreSQL configuration optimizations applied
- [ ] Results properly measured and compared

### Analysis Quality
- [ ] Execution plans analyzed for bottlenecks
- [ ] Performance metrics collected systematically
- [ ] Optimization trade-offs documented
- [ ] Recommendations based on empirical evidence

### Documentation
- [ ] Performance analysis methodology documented
- [ ] Results clearly presented with visualizations
- [ ] Lessons learned and best practices identified
- [ ] Future optimization roadmap outlined

## Next Steps
- [Tutorial: Performance Monitoring](../tutorials/04-performance-monitoring.md)

## Additional Resources
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Index Best Practices](https://wiki.postgresql.org/wiki/Index_Maintenance)
- [Query Optimization Techniques](https://www.postgresql.org/docs/current/geqo.html)
- [EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)

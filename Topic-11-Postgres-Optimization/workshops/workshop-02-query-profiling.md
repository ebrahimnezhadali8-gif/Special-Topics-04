# Workshop 02: Query Profiling and Slow Query Analysis

## Overview
This workshop focuses on identifying, analyzing, and optimizing slow queries using PostgreSQL's EXPLAIN command and profiling tools. You'll learn to use `EXPLAIN ANALYZE`, interpret execution plans, identify performance bottlenecks, and implement optimizations.

## Prerequisites
- Completed [Query Optimization Tutorial](../tutorials/02-query-optimization.md)
- PostgreSQL database with sample data
- Basic understanding of SQL and database performance

## Learning Objectives
By the end of this workshop, you will be able to:
- Use EXPLAIN ANALYZE to profile query execution
- Identify common performance bottlenecks
- Interpret execution plan metrics
- Implement query optimizations
- Monitor query performance over time

## Workshop Structure

### Part 1: Setting Up the Profiling Environment

#### Step 1: Create Sample Database Schema

```sql
-- Create profiling workshop database
CREATE DATABASE query_profiling_workshop;
\c query_profiling_workshop;

-- Enable timing for queries
\timing on

-- Create sample tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_date TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Create some indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
```

#### Step 2: Generate Sample Data

**generate_sample_data.py:**
```python
#!/usr/bin/env python3
"""
Generate sample data for query profiling workshop
"""

import asyncio
import asyncpg
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

class DataGenerator:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def generate_users(self, count: int = 10000):
        """Generate sample users"""
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
                'created_at': fake.date_time_between(start_date='-2y', end_date='now')
            }
            users.append(user)

            # Batch insert every 1000 users
            if len(users) >= 1000:
                await self._insert_users_batch(users)
                users = []

        # Insert remaining users
        if users:
            await self._insert_users_batch(users)

    async def _insert_users_batch(self, users: list):
        """Insert a batch of users"""
        async with self.pool.acquire() as conn:
            await conn.executemany("""
                INSERT INTO users (username, email, full_name, age, city, country, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, [(u['username'], u['email'], u['full_name'], u['age'],
                   u['city'], u['country'], u['created_at']) for u in users])

    async def generate_products(self, count: int = 5000):
        """Generate sample products"""
        print(f"Generating {count} products...")

        categories = ['Electronics', 'Books', 'Clothing', 'Home', 'Sports', 'Beauty', 'Toys']
        brands = [fake.company() for _ in range(50)]

        products = []
        for i in range(count):
            product = {
                'name': fake.sentence(nb_words=3)[:-1],  # Remove trailing period
                'description': fake.paragraph(),
                'price': round(random.uniform(10, 1000), 2),
                'category': random.choice(categories),
                'brand': random.choice(brands),
                'in_stock': random.choice([True, False]),
                'stock_quantity': random.randint(0, 1000)
            }
            products.append(product)

            # Batch insert every 500 products
            if len(products) >= 500:
                await self._insert_products_batch(products)
                products = []

        # Insert remaining products
        if products:
            await self._insert_products_batch(products)

    async def _insert_products_batch(self, products: list):
        """Insert a batch of products"""
        async with self.pool.acquire() as conn:
            await conn.executemany("""
                INSERT INTO products (name, description, price, category, brand, in_stock, stock_quantity)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, [(p['name'], p['description'], p['price'], p['category'],
                   p['brand'], p['in_stock'], p['stock_quantity']) for p in products])

    async def generate_orders(self, count: int = 20000):
        """Generate sample orders"""
        print(f"Generating {count} orders...")

        # Get user and product IDs
        async with self.pool.acquire() as conn:
            user_ids = await conn.fetch("SELECT id FROM users ORDER BY RANDOM() LIMIT 1000")
            product_ids = await conn.fetch("SELECT id, price FROM products ORDER BY RANDOM() LIMIT 1000")

        user_ids = [row['id'] for row in user_ids]
        product_data = {row['id']: row['price'] for row in product_ids}

        orders = []
        for i in range(count):
            user_id = random.choice(user_ids)
            product_id = random.choice(list(product_data.keys()))
            quantity = random.randint(1, 5)
            unit_price = product_data[product_id]
            total_price = unit_price * quantity

            order = {
                'user_id': user_id,
                'product_id': product_id,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
                'status': random.choice(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
                'order_date': fake.date_time_between(start_date='-1y', end_date='now')
            }
            orders.append(order)

            # Batch insert every 1000 orders
            if len(orders) >= 1000:
                await self._insert_orders_batch(orders)
                orders = []

        # Insert remaining orders
        if orders:
            await self._insert_orders_batch(orders)

    async def _insert_orders_batch(self, orders: list):
        """Insert a batch of orders"""
        async with self.pool.acquire() as conn:
            await conn.executemany("""
                INSERT INTO orders (user_id, product_id, quantity, unit_price, total_price, status, order_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, [(o['user_id'], o['product_id'], o['quantity'], o['unit_price'],
                   o['total_price'], o['status'], o['order_date']) for o in orders])

    async def generate_order_items(self):
        """Generate order items from existing orders"""
        print("Generating order items...")

        async with self.pool.acquire() as conn:
            # Get all orders with their details
            orders = await conn.fetch("""
                SELECT id, user_id, product_id, quantity, unit_price, total_price
                FROM orders
                ORDER BY id
            """)

            # For simplicity, each order has one item (itself)
            # In a real scenario, orders might have multiple items
            await conn.executemany("""
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            """, [(o['id'], o['product_id'], o['quantity'], o['unit_price'], o['total_price'])
                  for o in orders])

async def main():
    """Generate all sample data"""
    pool = await asyncpg.create_pool(
        user='postgres',
        password='password',
        database='query_profiling_workshop',
        host='localhost'
    )

    try:
        generator = DataGenerator(pool)

        print("Starting data generation...")
        start_time = datetime.now()

        await generator.generate_users(10000)
        await generator.generate_products(5000)
        await generator.generate_orders(20000)
        await generator.generate_order_items()

        end_time = datetime.now()
        duration = end_time - start_time

        print(f"Data generation completed in {duration}")

        # Print some statistics
        async with pool.acquire() as conn:
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            product_count = await conn.fetchval("SELECT COUNT(*) FROM products")
            order_count = await conn.fetchval("SELECT COUNT(*) FROM orders")

            print(f"Generated: {user_count} users, {product_count} products, {order_count} orders")

    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 2: Basic Query Profiling

#### Step 3: Create Profiling Tools

**query_profiler.py:**
```python
#!/usr/bin/env python3
"""
PostgreSQL Query Profiler for Workshop
"""

import asyncio
import asyncpg
import json
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class QueryProfile:
    """Query profiling result"""
    query: str
    execution_time: float
    planning_time: float
    total_cost: float
    actual_rows: int
    plan_rows: int
    execution_plan: Dict[str, Any]
    timestamp: datetime

class QueryProfiler:
    """PostgreSQL query profiler"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def profile_query(self, query: str, params: tuple = None, explain_analyze: bool = True) -> QueryProfile:
        """Profile a single query"""
        explain_cmd = "EXPLAIN (FORMAT JSON"
        if explain_analyze:
            explain_cmd += ", ANALYZE"
        explain_cmd += ")"

        full_query = f"{explain_cmd} {query}"

        async with self.pool.acquire() as conn:
            start_time = time.time()

            if params:
                result = await conn.fetchval(full_query, *params)
            else:
                result = await conn.fetchval(full_query)

            end_time = time.time()

        plan_data = json.loads(result)[0]

        profile = QueryProfile(
            query=query,
            execution_time=plan_data.get('Execution Time', 0),
            planning_time=plan_data.get('Planning Time', 0),
            total_cost=plan_data['Plan'].get('Total Cost', 0),
            actual_rows=plan_data['Plan'].get('Actual Rows', 0),
            plan_rows=plan_data['Plan'].get('Plan Rows', 0),
            execution_plan=plan_data['Plan'],
            timestamp=datetime.now()
        )

        return profile

    async def profile_multiple_queries(self, queries: List[str]) -> List[QueryProfile]:
        """Profile multiple queries"""
        profiles = []

        for query in queries:
            try:
                profile = await self.profile_query(query)
                profiles.append(profile)
                print(f"✓ Profiled query: {query[:50]}...")
            except Exception as e:
                print(f"✗ Failed to profile query: {e}")

        return profiles

    def analyze_profile(self, profile: QueryProfile) -> Dict[str, Any]:
        """Analyze a query profile for performance insights"""

        analysis = {
            'query_length': len(profile.query),
            'execution_efficiency': self._calculate_efficiency(profile),
            'bottlenecks': self._identify_bottlenecks(profile.execution_plan),
            'recommendations': self._generate_recommendations(profile),
            'metrics': {
                'execution_time_ms': profile.execution_time,
                'planning_time_ms': profile.planning_time,
                'total_cost': profile.total_cost,
                'actual_vs_planned_rows_ratio': profile.actual_rows / max(profile.plan_rows, 1)
            }
        }

        return analysis

    def _calculate_efficiency(self, profile: QueryProfile) -> float:
        """Calculate query execution efficiency (0-1, higher is better)"""
        # Simple efficiency calculation based on cost per row
        if profile.actual_rows == 0:
            return 1.0

        cost_per_row = profile.total_cost / profile.actual_rows

        # Lower cost per row is better (arbitrary scale)
        if cost_per_row < 10:
            return 1.0
        elif cost_per_row < 100:
            return 0.8
        elif cost_per_row < 1000:
            return 0.6
        else:
            return 0.3

    def _identify_bottlenecks(self, plan: Dict[str, Any]) -> List[str]:
        """Identify performance bottlenecks in execution plan"""

        bottlenecks = []

        def analyze_node(node: Dict[str, Any], path: str = ""):
            node_type = node.get('Node Type', '')

            # Sequential scans on large tables
            if node_type == 'Seq Scan':
                actual_rows = node.get('Actual Rows', 0)
                if actual_rows > 10000:
                    bottlenecks.append(f"Sequential scan on large dataset ({actual_rows} rows) at {path}")

            # Nested loops with many iterations
            if node_type == 'Nested Loop':
                actual_loops = node.get('Actual Loops', 0)
                if actual_loops > 1000:
                    bottlenecks.append(f"Inefficient nested loop ({actual_loops} iterations) at {path}")

            # Sorts that might benefit from indexes
            if node_type == 'Sort':
                sort_method = node.get('Sort Method', '')
                if 'external' in sort_method.lower():
                    bottlenecks.append(f"External sort spilling to disk at {path}")

            # Hash operations that spill to disk
            if 'Temp Space Used' in node:
                temp_space = node['Temp Space Used']
                if temp_space > 50 * 1024 * 1024:  # 50MB
                    bottlenecks.append(f"Large temporary space usage ({temp_space} bytes) at {path}")

            # Recursively analyze child nodes
            if 'Plans' in node:
                for i, child in enumerate(node['Plans']):
                    analyze_node(child, f"{path}/child_{i}" if path else f"child_{i}")

        analyze_node(plan)
        return bottlenecks

    def _generate_recommendations(self, profile: QueryProfile) -> List[str]:
        """Generate optimization recommendations"""

        recommendations = []

        # Check for common issues
        plan = profile.execution_plan

        # Large sequential scans
        if self._has_large_seq_scan(plan):
            recommendations.append("Consider adding appropriate indexes for frequently queried columns")

        # Nested loops
        if self._has_nested_loop(plan):
            recommendations.append("Consider using Hash Join or Merge Join with proper indexes")

        # External sorts
        if self._has_external_sort(plan):
            recommendations.append("Consider increasing work_mem or using indexes to avoid sorting")

        # Row estimate mismatch
        if abs(profile.actual_rows - profile.plan_rows) / max(profile.plan_rows, 1) > 2:
            recommendations.append("Consider updating table statistics with ANALYZE")

        # Slow execution
        if profile.execution_time > 1000:  # More than 1 second
            recommendations.append("Query is slow - consider breaking into smaller queries or optimizing")

        return recommendations

    def _has_large_seq_scan(self, plan: Dict[str, Any]) -> bool:
        """Check if plan has large sequential scans"""
        def check_node(node):
            if node.get('Node Type') == 'Seq Scan':
                actual_rows = node.get('Actual Rows', 0)
                if actual_rows > 5000:
                    return True
            if 'Plans' in node:
                for child in node['Plans']:
                    if check_node(child):
                        return True
            return False

        return check_node(plan)

    def _has_nested_loop(self, plan: Dict[str, Any]) -> bool:
        """Check if plan uses nested loops"""
        def check_node(node):
            if node.get('Node Type') == 'Nested Loop':
                return True
            if 'Plans' in node:
                for child in node['Plans']:
                    if check_node(child):
                        return True
            return False

        return check_node(plan)

    def _has_external_sort(self, plan: Dict[str, Any]) -> bool:
        """Check if plan has external sorts"""
        def check_node(node):
            if node.get('Node Type') == 'Sort':
                sort_method = node.get('Sort Method', '')
                if 'external' in sort_method.lower():
                    return True
            if 'Plans' in node:
                for child in node['Plans']:
                    if check_node(child):
                        return True
            return False

        return check_node(plan)

    async def compare_query_variants(self, query_variants: List[str]) -> Dict[str, Any]:
        """Compare performance of different query variants"""

        profiles = await self.profile_multiple_queries(query_variants)

        if not profiles:
            return {'error': 'No profiles generated'}

        # Sort by execution time
        sorted_profiles = sorted(profiles, key=lambda p: p.execution_time)

        comparison = {
            'variants_tested': len(profiles),
            'best_performing': {
                'query': sorted_profiles[0].query[:100] + '...' if len(sorted_profiles[0].query) > 100 else sorted_profiles[0].query,
                'execution_time': sorted_profiles[0].execution_time,
                'total_cost': sorted_profiles[0].total_cost
            },
            'worst_performing': {
                'query': sorted_profiles[-1].query[:100] + '...' if len(sorted_profiles[-1].query) > 100 else sorted_profiles[-1].query,
                'execution_time': sorted_profiles[-1].execution_time,
                'total_cost': sorted_profiles[-1].total_cost
            },
            'performance_improvement': None
        }

        if len(sorted_profiles) > 1:
            best_time = sorted_profiles[0].execution_time
            worst_time = sorted_profiles[-1].execution_time

            if worst_time > 0:
                improvement = ((worst_time - best_time) / worst_time) * 100
                comparison['performance_improvement'] = improvement

        return comparison
```

#### Step 4: Sample Slow Queries

**slow_queries.py:**
```python
#!/usr/bin/env python3
"""
Sample slow queries for profiling workshop
"""

# These are intentionally suboptimal queries for profiling practice

SLOW_QUERIES = {
    'sequential_scan': """
        SELECT u.username, u.email, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at > '2023-01-01'
        GROUP BY u.id, u.username, u.email
        ORDER BY order_count DESC
        LIMIT 10
    """,

    'nested_loop_join': """
        SELECT u.full_name, p.name, o.quantity, o.total_price
        FROM users u
        JOIN orders o ON u.id = o.user_id
        JOIN products p ON o.product_id = p.id
        WHERE u.city = 'New York'
        AND p.category = 'Electronics'
    """,

    'inefficient_subquery': """
        SELECT u.username,
               (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
               (SELECT AVG(total_price) FROM orders WHERE user_id = u.id) as avg_order_value
        FROM users u
        WHERE u.created_at > '2023-01-01'
    """,

    'large_sort_operation': """
        SELECT p.name, p.price, p.category, COUNT(o.id) as sales_count
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        GROUP BY p.id, p.name, p.price, p.category
        ORDER BY sales_count DESC, p.price ASC
        LIMIT 100
    """,

    'cross_join_risk': """
        SELECT u.username, p.name
        FROM users u, products p
        WHERE u.age > 25
        AND p.price < 50
        LIMIT 20
    """,

    'unindexed_filter': """
        SELECT u.username, u.full_name, u.email
        FROM users u
        WHERE LOWER(u.full_name) LIKE '%john%'
        AND u.age BETWEEN 25 AND 35
    """,

    'complex_aggregation': """
        SELECT
            DATE_TRUNC('month', o.order_date) as month,
            p.category,
            COUNT(DISTINCT o.user_id) as unique_customers,
            SUM(o.total_price) as total_revenue,
            AVG(o.total_price) as avg_order_value,
            COUNT(o.id) as total_orders
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.order_date >= '2023-01-01'
        GROUP BY DATE_TRUNC('month', o.order_date), p.category
        ORDER BY month DESC, total_revenue DESC
    """
}

OPTIMIZED_VERSIONS = {
    'sequential_scan': """
        -- Optimized with proper indexes
        SELECT u.username, u.email, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at > '2023-01-01'
        GROUP BY u.id, u.username, u.email
        ORDER BY order_count DESC
        LIMIT 10
    """,

    'nested_loop_join': """
        -- Optimized with better join order and indexes
        SELECT u.full_name, p.name, o.quantity, o.total_price
        FROM users u
        JOIN orders o ON u.id = o.user_id
        JOIN products p ON o.product_id = p.id
        WHERE u.city = 'New York'
        AND p.category = 'Electronics'
    """,

    'inefficient_subquery': """
        -- Optimized with JOIN instead of subqueries
        SELECT u.username, stats.order_count, stats.avg_order_value
        FROM users u
        LEFT JOIN (
            SELECT user_id,
                   COUNT(*) as order_count,
                   AVG(total_price) as avg_order_value
            FROM orders
            GROUP BY user_id
        ) stats ON u.id = stats.user_id
        WHERE u.created_at > '2023-01-01'
    """
}
```

### Part 3: Profiling Analysis Tools

#### Step 5: Profiling Runner

**profiling_runner.py:**
```python
#!/usr/bin/env python3
"""
Query Profiling Runner for Workshop
"""

import asyncio
import asyncpg
import json
from datetime import datetime
from query_profiler import QueryProfiler
from slow_queries import SLOW_QUERIES, OPTIMIZED_VERSIONS

class ProfilingRunner:
    """Run query profiling analysis"""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None
        self.profiler = None

    async def setup(self):
        """Setup database connection and profiler"""
        self.pool = await asyncpg.create_pool(self.database_url)
        self.profiler = QueryProfiler(self.pool)
        print("✓ Database connection established")

    async def teardown(self):
        """Clean up connections"""
        if self.pool:
            await self.pool.close()
            print("✓ Database connection closed")

    async def profile_slow_queries(self) -> dict:
        """Profile all slow queries and analyze results"""

        print("🔍 Profiling slow queries...")
        print("=" * 60)

        results = {}

        for query_name, query in SLOW_QUERIES.items():
            print(f"\n📊 Profiling: {query_name}")
            print("-" * 40)

            try:
                # Profile the query
                profile = await self.profiler.profile_query(query)

                # Analyze the profile
                analysis = self.profiler.analyze_profile(profile)

                results[query_name] = {
                    'profile': {
                        'execution_time': profile.execution_time,
                        'planning_time': profile.planning_time,
                        'total_cost': profile.total_cost,
                        'actual_rows': profile.actual_rows,
                        'plan_rows': profile.plan_rows
                    },
                    'analysis': analysis,
                    'bottlenecks': analysis['bottlenecks'],
                    'recommendations': analysis['recommendations']
                }

                # Print summary
                print(f"Execution Time: {profile.execution_time:.2f} ms")
                print(f"Total Cost: {profile.total_cost:.2f}")
                print(f"Actual Rows: {profile.actual_rows}")
                print(f"Plan Rows: {profile.plan_rows}")

                if analysis['bottlenecks']:
                    print(f"🚨 Bottlenecks: {len(analysis['bottlenecks'])}")
                    for bottleneck in analysis['bottlenecks'][:3]:  # Show first 3
                        print(f"  • {bottleneck}")

                if analysis['recommendations']:
                    print(f"💡 Recommendations: {len(analysis['recommendations'])}")
                    for rec in analysis['recommendations'][:2]:  # Show first 2
                        print(f"  • {rec}")

            except Exception as e:
                print(f"❌ Error profiling {query_name}: {e}")
                results[query_name] = {'error': str(e)}

        return results

    async def compare_optimizations(self) -> dict:
        """Compare original vs optimized queries"""

        print("\n🔄 Comparing Query Optimizations...")
        print("=" * 60)

        comparisons = {}

        for query_name in OPTIMIZED_VERSIONS.keys():
            if query_name in SLOW_QUERIES:
                print(f"\n⚡ Comparing: {query_name}")
                print("-" * 40)

                original_query = SLOW_QUERIES[query_name]
                optimized_query = OPTIMIZED_VERSIONS[query_name]

                try:
                    # Profile both queries
                    original_profile = await self.profiler.profile_query(original_query)
                    optimized_profile = await self.profiler.profile_query(optimized_query)

                    # Calculate improvement
                    time_improvement = ((original_profile.execution_time - optimized_profile.execution_time)
                                      / max(original_profile.execution_time, 0.001) * 100)

                    cost_improvement = ((original_profile.total_cost - optimized_profile.total_cost)
                                      / max(original_profile.total_cost, 0.001) * 100)

                    comparisons[query_name] = {
                        'original': {
                            'execution_time': original_profile.execution_time,
                            'total_cost': original_profile.total_cost
                        },
                        'optimized': {
                            'execution_time': optimized_profile.execution_time,
                            'total_cost': optimized_profile.total_cost
                        },
                        'improvement': {
                            'time_percent': time_improvement,
                            'cost_percent': cost_improvement
                        }
                    }

                    print(".2f")
                    print(".2f")
                    print(".1f")
                    print(".1f")

                except Exception as e:
                    print(f"❌ Error comparing {query_name}: {e}")
                    comparisons[query_name] = {'error': str(e)}

        return comparisons

    async def generate_report(self, profiling_results: dict, comparisons: dict) -> dict:
        """Generate comprehensive profiling report"""

        report = {
            'generated_at': datetime.now().isoformat(),
            'database_info': await self.get_database_info(),
            'profiling_summary': self._summarize_results(profiling_results),
            'optimization_results': comparisons,
            'recommendations': self._generate_overall_recommendations(profiling_results, comparisons)
        }

        return report

    async def get_database_info(self) -> dict:
        """Get database information"""

        async with self.pool.acquire() as conn:
            # Get PostgreSQL version
            version = await conn.fetchval("SELECT version()")

            # Get table sizes
            tables_info = await conn.fetch("""
                SELECT schemaname, tablename,
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """)

            # Get index information
            indexes_info = await conn.fetch("""
                SELECT schemaname, tablename, indexname,
                       pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                ORDER BY pg_relation_size(indexrelid) DESC
                LIMIT 10
            """)

            return {
                'postgresql_version': version,
                'tables': [dict(row) for row in tables_info],
                'top_indexes': [dict(row) for row in indexes_info]
            }

    def _summarize_results(self, results: dict) -> dict:
        """Summarize profiling results"""

        total_queries = len(results)
        successful_profiles = sum(1 for r in results.values() if 'error' not in r)
        total_bottlenecks = sum(len(r.get('bottlenecks', [])) for r in results.values() if 'error' not in r)
        total_recommendations = sum(len(r.get('recommendations', [])) for r in results.values() if 'error' not in r)

        avg_execution_time = sum(r['profile']['execution_time'] for r in results.values()
                                if 'error' not in r) / max(successful_profiles, 1)

        return {
            'total_queries_analyzed': total_queries,
            'successful_profiles': successful_profiles,
            'total_bottlenecks_identified': total_bottlenecks,
            'total_recommendations': total_recommendations,
            'average_execution_time_ms': avg_execution_time
        }

    def _generate_overall_recommendations(self, profiling_results: dict, comparisons: dict) -> list:
        """Generate overall optimization recommendations"""

        recommendations = []

        # Analyze common bottlenecks
        all_bottlenecks = []
        for result in profiling_results.values():
            if 'bottlenecks' in result:
                all_bottlenecks.extend(result['bottlenecks'])

        bottleneck_counts = {}
        for bottleneck in all_bottlenecks:
            # Simplify bottleneck description
            if 'Sequential scan' in bottleneck:
                key = 'sequential_scans'
            elif 'nested loop' in bottleneck.lower():
                key = 'nested_loops'
            elif 'external sort' in bottleneck.lower():
                key = 'external_sorts'
            else:
                key = 'other'

            bottleneck_counts[key] = bottleneck_counts.get(key, 0) + 1

        # Generate recommendations based on patterns
        if bottleneck_counts.get('sequential_scans', 0) > 2:
            recommendations.append("Add indexes on frequently queried columns to reduce sequential scans")

        if bottleneck_counts.get('nested_loops', 0) > 1:
            recommendations.append("Review join strategies and ensure proper indexes on join columns")

        if bottleneck_counts.get('external_sorts', 0) > 0:
            recommendations.append("Consider increasing work_mem or using indexes to avoid external sorts")

        # Check optimization improvements
        significant_improvements = sum(1 for comp in comparisons.values()
                                     if isinstance(comp, dict) and
                                     comp.get('improvement', {}).get('time_percent', 0) > 50)

        if significant_improvements > 0:
            recommendations.append("Several queries showed significant improvement with optimization")

        return recommendations

    async def run_complete_analysis(self) -> dict:
        """Run complete profiling analysis"""

        print("🚀 Starting Complete Query Profiling Analysis")
        print("=" * 60)

        # Profile slow queries
        profiling_results = await self.profile_slow_queries()

        # Compare optimizations
        comparisons = await self.compare_optimizations()

        # Generate report
        report = await self.generate_report(profiling_results, comparisons)

        print(f"\n✅ Analysis Complete!")
        print(f"📊 Analyzed {report['profiling_summary']['total_queries_analyzed']} queries")
        print(f"🔍 Found {report['profiling_summary']['total_bottlenecks_identified']} bottlenecks")
        print(f"💡 Generated {report['profiling_summary']['total_recommendations']} recommendations")

        return report

async def main():
    """Main profiling runner"""

    # Database connection
    database_url = "postgresql://postgres:password@localhost/query_profiling_workshop"

    runner = ProfilingRunner(database_url)

    try:
        await runner.setup()
        report = await runner.run_complete_analysis()

        # Save report to file
        with open('profiling_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)

        print("\n📄 Report saved to profiling_report.json")

        # Print key insights
        summary = report['profiling_summary']
        print("
📈 Key Insights:"        print(f"• Average query time: {summary['average_execution_time_ms']:.2f} ms")
        print(f"• Bottlenecks found: {summary['total_bottlenecks_identified']}")
        print(f"• Optimization opportunities: {summary['total_recommendations']}")

        if report['recommendations']:
            print("
🎯 Top Recommendations:"            for rec in report['recommendations'][:3]:
                print(f"• {rec}")

    finally:
        await runner.teardown()

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 4: Running the Profiling Workshop

#### Step 6: Workshop Execution

```bash
# 1. Set up PostgreSQL database
createdb query_profiling_workshop

# 2. Generate sample data
python generate_sample_data.py

# 3. Run profiling analysis
python profiling_runner.py

# 4. View results
cat profiling_report.json | jq '.profiling_summary'

# 5. Analyze specific queries manually
psql query_profiling_workshop

# Inside psql:
\timing on
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25 LIMIT 10;
EXPLAIN ANALYZE SELECT u.username, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.username ORDER BY count DESC LIMIT 5;
```

#### Step 7: Manual Query Analysis

**manual_analysis.sql:**
```sql
-- Manual query analysis examples

-- 1. Basic EXPLAIN
EXPLAIN SELECT * FROM users WHERE age > 25;

-- 2. EXPLAIN with execution
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;

-- 3. EXPLAIN with detailed buffers
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE age > 25;

-- 4. Analyze join performance
EXPLAIN ANALYZE
SELECT u.username, p.name, o.total_price
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id
WHERE u.city = 'New York';

-- 5. Check index usage
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
EXPLAIN ANALYZE SELECT * FROM users WHERE city = 'New York';

-- 6. Analyze sorting performance
EXPLAIN ANALYZE SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
EXPLAIN ANALYZE SELECT * FROM products ORDER BY price DESC LIMIT 20;

-- 7. Check subquery performance
EXPLAIN ANALYZE
SELECT u.username,
       (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
FROM users u
WHERE u.created_at > '2023-01-01';

-- 8. Analyze aggregation queries
EXPLAIN ANALYZE
SELECT p.category, COUNT(*) as product_count, AVG(p.price) as avg_price
FROM products p
GROUP BY p.category
ORDER BY product_count DESC;

-- 9. Check complex query performance
EXPLAIN ANALYZE
SELECT
    DATE_TRUNC('month', o.order_date) as month,
    p.category,
    COUNT(DISTINCT o.user_id) as customers,
    SUM(o.total_price) as revenue
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.order_date >= '2023-01-01'
GROUP BY month, p.category
ORDER BY month DESC, revenue DESC;

-- 10. Test with different query forms
-- Original slow query
EXPLAIN ANALYZE SELECT u.username, COUNT(o.id)
FROM users u LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY count DESC LIMIT 10;

-- Optimized version
CREATE INDEX idx_orders_user_count ON orders(user_id);
EXPLAIN ANALYZE SELECT u.username, COUNT(o.id)
FROM users u LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY count DESC LIMIT 10;
```

## Challenge Exercises

### Challenge 1: Query Optimization
1. Identify the 3 slowest queries from the profiling results
2. Analyze their execution plans to find bottlenecks
3. Implement optimizations (indexes, query rewriting, etc.)
4. Measure and document the performance improvements

### Challenge 2: Index Strategy Design
1. Based on the profiling results, design a comprehensive indexing strategy
2. Consider query patterns, data distribution, and maintenance overhead
3. Implement the indexes and measure impact on query performance
4. Create a maintenance plan for the indexes

### Challenge 3: Query Performance Monitoring
1. Set up automated query performance monitoring
2. Create alerts for slow queries
3. Implement query execution statistics collection
4. Build a dashboard to visualize query performance trends

## Verification Checklist

### Profiling Setup
- [ ] Sample database created with realistic data
- [ ] Query profiler can analyze execution plans
- [ ] Slow queries identified and categorized
- [ ] Profiling results properly analyzed

### Analysis Capabilities
- [ ] Bottlenecks correctly identified in execution plans
- [ ] Performance recommendations generated
- [ ] Query optimization comparisons working
- [ ] Comprehensive profiling report created

### Optimization Implementation
- [ ] Indexes added based on profiling recommendations
- [ ] Query rewrites implemented and tested
- [ ] Performance improvements measured and documented
- [ ] Best practices applied to query optimization

### Monitoring and Maintenance
- [ ] Query performance monitoring configured
- [ ] Automated profiling reports generated
- [ ] Index maintenance strategy implemented
- [ ] Performance trends tracked over time

## Next Steps
- [Workshop: Optimization Assignment](../workshops/workshop-03-optimization-assignment.md)

## Additional Resources
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Query Optimization Best Practices](https://www.postgresql.org/docs/current/performance-tips.html)
- [Index Maintenance Guide](https://www.postgresql.org/docs/current/routine-reindex.html)
- [pg_stat_statements Extension](https://www.postgresql.org/docs/current/pgstatstatements.html)

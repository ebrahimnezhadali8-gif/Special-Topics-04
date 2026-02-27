# Tutorial 05: Async Database Connections with asyncpg

## Overview
This tutorial covers asyncpg, a fast PostgreSQL database client library for Python that provides asynchronous database operations. You'll learn how to connect to PostgreSQL asynchronously, execute queries, handle transactions, and build high-performance database applications.

## What is asyncpg?

asyncpg is a high-performance asynchronous PostgreSQL database client library for Python. It's designed for asyncio and provides a clean, modern API for database operations.

### Key Features
- **Asynchronous**: Built for asyncio, non-blocking operations
- **High Performance**: One of the fastest PostgreSQL clients
- **Type Safety**: Strong typing support
- **Connection Pooling**: Built-in connection pool
- **Prepared Statements**: Automatic statement preparation
- **Binary Protocol**: Uses PostgreSQL binary protocol for speed

### Why asyncpg?
```python
# Synchronous (blocking)
import psycopg2
conn = psycopg2.connect("postgresql://user:pass@localhost/db")
cursor = conn.cursor()
cursor.execute("SELECT * FROM users")
users = cursor.fetchall()

# Asynchronous (non-blocking)
import asyncpg
conn = await asyncpg.connect("postgresql://user:pass@localhost/db")
users = await conn.fetch("SELECT * FROM users")
```

## Installation and Setup

### Installation
```bash
uv add asyncpg
```

### Basic Connection
```python
import asyncpg
import asyncio

async def main():
    # Connect to database
    conn = await asyncpg.connect(
        user='myuser',
        password='mypassword',
        database='mydatabase',
        host='localhost',
        port=5432
    )

    # Use connection
    result = await conn.fetchval("SELECT 1")
    print(f"Result: {result}")

    # Close connection
    await conn.close()

asyncio.run(main())
```

### Connection String
```python
# Using connection string
DATABASE_URL = "postgresql://user:password@localhost:5432/database"

async def connect_with_url():
    conn = await asyncpg.connect(DATABASE_URL)
    # ... use connection
    await conn.close()
```

## Connection Pooling

### Basic Connection Pool
```python
import asyncpg
from asyncpg import Pool

async def create_pool():
    """Create a connection pool"""
    pool = await asyncpg.create_pool(
        user='myuser',
        password='mypassword',
        database='mydatabase',
        host='localhost',
        min_size=5,      # Minimum connections
        max_size=20,     # Maximum connections
        max_queries=50000,  # Max queries per connection
        max_inactive_connection_lifetime=300.0  # 5 minutes
    )

    return pool

async def use_pool():
    pool = await create_pool()

    # Get connection from pool
    async with pool.acquire() as conn:
        result = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"Total users: {result}")

    # Close pool
    await pool.close()
```

### Pool Configuration
```python
pool = await asyncpg.create_pool(
    dsn=DATABASE_URL,
    min_size=10,
    max_size=50,
    max_queries=100000,
    max_inactive_connection_lifetime=60.0,
    setup=setup_connection,
    init=initialize_connection
)

async def setup_connection(conn):
    """Setup function called for each new connection"""
    # Set timezone
    await conn.execute("SET timezone = 'UTC'")

    # Set application name
    await conn.execute("SET application_name = 'my_app'")

async def initialize_connection(conn):
    """Initialization function called for each new connection"""
    # Create temporary tables or set session variables
    await conn.execute("CREATE TEMP TABLE temp_data (id SERIAL, data TEXT)")
```

## Executing Queries

### Basic Query Execution
```python
async def basic_queries():
    conn = await asyncpg.connect(DATABASE_URL)

    # Execute without result
    await conn.execute("INSERT INTO users (name, email) VALUES ($1, $2)", "John", "john@example.com")

    # Fetch single value
    count = await conn.fetchval("SELECT COUNT(*) FROM users")
    print(f"Total users: {count}")

    # Fetch single row
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", 1)
    print(f"User: {user}")

    # Fetch multiple rows
    users = await conn.fetch("SELECT * FROM users LIMIT 10")
    for user in users:
        print(f"User: {user['name']} - {user['email']}")

    await conn.close()
```

### Parameterized Queries
```python
async def parameterized_queries():
    conn = await asyncpg.connect(DATABASE_URL)

    # Safe parameterized query
    user_id = 1
    user = await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1 AND active = $2",
        user_id, True
    )

    # Bulk insert
    users_data = [
        ("Alice", "alice@example.com"),
        ("Bob", "bob@example.com"),
        ("Charlie", "charlie@example.com")
    ]

    await conn.executemany(
        "INSERT INTO users (name, email) VALUES ($1, $2)",
        users_data
    )

    # Batch operations
    async with conn.transaction():
        # Multiple operations in one transaction
        await conn.execute("UPDATE users SET last_login = NOW() WHERE id = $1", user_id)
        await conn.execute("INSERT INTO audit_log (action, user_id) VALUES ($1, $2)", "login", user_id)

    await conn.close()
```

### Prepared Statements
```python
async def prepared_statements():
    conn = await asyncpg.connect(DATABASE_URL)

    # Prepare statement for reuse
    stmt = await conn.prepare("SELECT * FROM products WHERE category_id = $1 AND price > $2")

    # Execute multiple times with different parameters
    electronics = await stmt.fetch(1, 100.00)  # Electronics category, > $100
    books = await stmt.fetch(2, 20.00)         # Books category, > $20

    print(f"Expensive electronics: {len(electronics)}")
    print(f"Expensive books: {len(books)}")

    await conn.close()
```

## Transaction Management

### Basic Transactions
```python
async def basic_transaction():
    conn = await asyncpg.connect(DATABASE_URL)

    async with conn.transaction():
        # All operations in this block are transactional
        await conn.execute(
            "INSERT INTO orders (user_id, total) VALUES ($1, $2)",
            user_id, order_total
        )

        # Update inventory
        for item in order_items:
            await conn.execute(
                "UPDATE products SET stock = stock - $1 WHERE id = $2",
                item.quantity, item.product_id
            )

    # Transaction automatically committed if no exceptions
    await conn.close()
```

### Advanced Transaction Control
```python
async def advanced_transaction():
    conn = await asyncpg.connect(DATABASE_URL)

    # Manual transaction control
    tr = conn.transaction()
    await tr.start()

    try:
        # Perform operations
        await conn.execute("UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from_account)
        await conn.execute("UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, to_account)

        # Check business rules
        from_balance = await conn.fetchval("SELECT balance FROM accounts WHERE id = $1", from_account)
        if from_balance < 0:
            raise ValueError("Insufficient funds")

        await tr.commit()

    except Exception as e:
        await tr.rollback()
        print(f"Transaction failed: {e}")

    await conn.close()
```

### Nested Transactions
```python
async def nested_transactions():
    conn = await asyncpg.connect(DATABASE_URL)

    # Outer transaction
    async with conn.transaction():
        await conn.execute("UPDATE users SET points = points + 10 WHERE id = $1", user_id)

        # Inner transaction (savepoint)
        async with conn.transaction():
            await conn.execute("INSERT INTO achievements (user_id, type) VALUES ($1, $2)", user_id, "bonus")

            # If something fails here, only inner transaction rolls back
            # Outer transaction continues

    await conn.close()
```

## Data Types and Conversions

### PostgreSQL Data Types
```python
async def data_types_demo():
    conn = await asyncpg.connect(DATABASE_URL)

    # Create table with various data types
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS demo_types (
            id SERIAL PRIMARY KEY,
            name TEXT,
            age INTEGER,
            balance DECIMAL(10,2),
            is_active BOOLEAN,
            tags TEXT[],
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert data with different types
    await conn.execute("""
        INSERT INTO demo_types (name, age, balance, is_active, tags, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
    """,
    "John Doe",
    30,
    1234.56,
    True,
    ["python", "async", "postgresql"],
    {"level": "expert", "skills": ["fastapi", "asyncpg"]}
    )

    # Query with type conversion
    row = await conn.fetchrow("SELECT * FROM demo_types WHERE id = $1", 1)

    print(f"Name: {row['name']} (type: {type(row['name'])})")
    print(f"Age: {row['age']} (type: {type(row['age'])})")
    print(f"Balance: {row['balance']} (type: {type(row['balance'])})")
    print(f"Is Active: {row['is_active']} (type: {type(row['is_active'])})")
    print(f"Tags: {row['tags']} (type: {type(row['tags'])})")
    print(f"Metadata: {row['metadata']} (type: {type(row['metadata'])})")

    await conn.close()
```

### Custom Type Converters
```python
import json
from datetime import datetime
from typing import List

# Custom JSON encoder for dataclasses
class CustomEncoder:
    @staticmethod
    def encode_user(user):
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        }

async def custom_types_demo():
    conn = await asyncpg.connect(DATABASE_URL)

    # Register custom type codec
    await conn.set_type_codec(
        'jsonb',
        encoder=CustomEncoder.encode_user,
        decoder=json.loads,
        schema='pg_catalog'
    )

    # Use custom codec
    user_data = {"id": 1, "name": "John", "email": "john@example.com", "created_at": datetime.now()}
    await conn.execute("INSERT INTO user_cache (user_id, data) VALUES ($1, $2)", 1, user_data)

    # Retrieve with custom decoding
    cached_user = await conn.fetchval("SELECT data FROM user_cache WHERE user_id = $1", 1)
    print(f"Cached user: {cached_user}")

    await conn.close()
```

## Connection Lifecycle Management

### Connection Health Checks
```python
import asyncio
from asyncpg.exceptions import PostgresError

class DatabaseManager:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def initialize(self):
        """Initialize connection pool"""
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20,
            command_timeout=60
        )

    async def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
                return True
        except Exception:
            return False

    async def execute_with_retry(self, query: str, *args, max_retries: int = 3):
        """Execute query with retry logic"""
        for attempt in range(max_retries):
            try:
                async with self.pool.acquire() as conn:
                    return await conn.execute(query, *args)
            except (PostgresError, asyncio.TimeoutError) as e:
                if attempt == max_retries - 1:
                    raise e
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
```

### Error Handling
```python
async def robust_query_execution():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Handle connection errors
        result = await conn.fetch("SELECT * FROM users")

    except asyncpg.exceptions.UniqueViolationError:
        print("Duplicate entry error")
        # Handle unique constraint violations

    except asyncpg.exceptions.ForeignKeyViolationError:
        print("Foreign key constraint error")
        # Handle foreign key violations

    except asyncpg.exceptions.CheckViolationError:
        print("Check constraint error")
        # Handle check constraint violations

    except asyncpg.exceptions.PostgresError as e:
        print(f"Database error: {e}")
        # Handle general database errors

    except asyncio.TimeoutError:
        print("Query timeout")
        # Handle timeout errors

    finally:
        await conn.close()
```

## Performance Optimization

### Connection Pool Tuning
```python
# Optimized pool configuration
pool = await asyncpg.create_pool(
    dsn=DATABASE_URL,
    min_size=10,
    max_size=50,
    max_queries=10000,  # Recycle connections after many queries
    max_inactive_connection_lifetime=300,  # 5 minutes
    command_timeout=30,  # 30 second timeout
    init=setup_connection
)

async def setup_connection(conn):
    """Optimize connection settings"""
    await conn.execute("SET timezone = 'UTC'")
    await conn.execute("SET work_mem = '64MB'")  # Increase working memory
    await conn.execute("SET maintenance_work_mem = '128MB'")
```

### Query Optimization
```python
async def optimized_queries():
    conn = await asyncpg.connect(DATABASE_URL)

    # Use prepared statements for repeated queries
    get_user_stmt = await conn.prepare("SELECT * FROM users WHERE id = $1")
    update_user_stmt = await conn.prepare("UPDATE users SET name = $1 WHERE id = $2")

    # Batch operations
    async with conn.transaction():
        # Multiple inserts
        users_data = [("User1",), ("User2",), ("User3",)]
        await conn.executemany("INSERT INTO users (name) VALUES ($1)", users_data)

        # Bulk update
        await conn.execute("""
            UPDATE products SET price = price * 1.1
            WHERE category_id = $1
        """, category_id)

    # Use cursors for large result sets
    async for record in conn.cursor("SELECT * FROM large_table"):
        process_record(record)

    await conn.close()
```

### Monitoring and Metrics
```python
import time
from typing import Dict, Any

class QueryMetrics:
    def __init__(self):
        self.query_count = 0
        self.total_time = 0.0
        self.slow_queries = []

    def record_query(self, query: str, duration: float):
        self.query_count += 1
        self.total_time += duration

        if duration > 1.0:  # Log slow queries
            self.slow_queries.append({
                'query': query,
                'duration': duration,
                'timestamp': time.time()
            })

class MonitoredConnection:
    def __init__(self, conn, metrics: QueryMetrics):
        self.conn = conn
        self.metrics = metrics

    async def execute(self, query: str, *args):
        start_time = time.time()
        result = await self.conn.execute(query, *args)
        duration = time.time() - start_time

        self.metrics.record_query(query, duration)
        return result

    async def fetch(self, query: str, *args):
        start_time = time.time()
        result = await self.conn.fetch(query, *args)
        duration = time.time() - start_time

        self.metrics.record_query(query, duration)
        return result
```

## Integration with Web Frameworks

### FastAPI Integration
```python
from fastapi import FastAPI, Depends, HTTPException
from asyncpg import Pool
import asyncpg

app = FastAPI()
pool = None

async def get_database_pool():
    """Dependency to get database connection"""
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(
            dsn="postgresql://user:pass@localhost/db",
            min_size=5,
            max_size=20
        )
    return pool

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    global pool
    pool = await asyncpg.create_pool(
        dsn="postgresql://user:pass@localhost/db",
        min_size=5,
        max_size=20
    )

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    global pool
    if pool:
        await pool.close()

@app.get("/users/{user_id}")
async def get_user(user_id: int, db_pool: Pool = Depends(get_database_pool)):
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)

@app.post("/users/")
async def create_user(user_data: dict, db_pool: Pool = Depends(get_database_pool)):
    async with db_pool.acquire() as conn:
        user_id = await conn.fetchval(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
            user_data["name"], user_data["email"]
        )
        return {"id": user_id, "message": "User created"}
```

## Best Practices

### Connection Management
1. **Use connection pools** - Never create connections for each request
2. **Configure pool sizes appropriately** - Balance memory usage with performance
3. **Handle connection failures** - Implement retry logic
4. **Monitor connection health** - Regular health checks

### Query Execution
1. **Use parameterized queries** - Prevent SQL injection
2. **Prepare statements** - For frequently executed queries
3. **Batch operations** - Reduce network round trips
4. **Handle timeouts** - Set appropriate timeouts

### Error Handling
1. **Catch specific exceptions** - Handle different error types appropriately
2. **Implement retry logic** - For transient failures
3. **Log errors properly** - Include context and stack traces
4. **Graceful degradation** - Handle database unavailability

### Performance
1. **Profile queries** - Use EXPLAIN ANALYZE
2. **Use appropriate indexes** - Based on query patterns
3. **Batch operations** - Reduce network overhead
4. **Connection pooling** - Reuse connections efficiently

## Hands-on Exercises

### Exercise 1: Basic Async Operations
1. Create a connection pool and perform basic CRUD operations
2. Implement parameterized queries and prepared statements
3. Handle different data types and JSON operations

### Exercise 2: Transaction Management
1. Implement complex business operations with transactions
2. Add error handling and rollback scenarios
3. Create nested transaction logic

### Exercise 3: Performance Optimization
1. Implement connection pooling and monitoring
2. Add query optimization and batching
3. Create performance benchmarks and monitoring

## Next Steps
- [Alembic Migrations Tutorial](../tutorials/06-alembic-migrations.md)
- [Workshop: Migration Management](../workshops/workshop-02-migration-management.md)

## Additional Resources
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/current/)
- [PostgreSQL Async Programming](https://www.postgresql.org/docs/current/libpq-async.html)
- [Connection Pooling Best Practices](https://github.com/MagicStack/asyncpg#connection-pools)
- [FastAPI with asyncpg](https://fastapi.tiangolo.com/tutorial/sql-databases/)

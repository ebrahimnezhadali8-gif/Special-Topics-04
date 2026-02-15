# Workshop 01: asyncpg Connection Pooling Lab

## Overview
This workshop provides hands-on experience with asyncpg connection pooling, focusing on configuration, monitoring, and optimization for high-performance PostgreSQL applications. You'll learn to implement connection pooling patterns and measure their impact on application performance.

## Prerequisites
- Completed [Connection Pooling Tutorial](../tutorials/01-connection-pooling.md)
- Python 3.8+ with asyncpg installed
- PostgreSQL database access
- Basic asyncio knowledge

## Learning Objectives
By the end of this workshop, you will be able to:
- Configure asyncpg connection pools for different scenarios
- Implement connection lifecycle management
- Monitor pool performance and health
- Optimize pool settings for concurrent workloads
- Handle connection failures gracefully

## Workshop Structure

### Part 1: Basic Pool Setup

#### Step 1: Project Setup

```bash
# Create workshop directory
mkdir asyncpg-pooling-workshop
cd asyncpg-pooling-workshop

# Create virtual environment
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
uv add asyncpg psycopg2-binary aiohttp uvicorn fastapi pydantic

# Create project structure
mkdir -p src tests config

# Create files
touch src/__init__.py
touch src/database.py
touch src/models.py
touch src/api.py
touch config/settings.py
touch tests/test_pooling.py
touch main.py
touch requirements.txt
```

#### Step 2: Configuration Setup

**config/settings.py:**
```python
import os
from typing import Optional

class DatabaseSettings:
    """Database configuration for the workshop"""

    # Database connection
    host: str = os.getenv('DB_HOST', 'localhost')
    port: int = int(os.getenv('DB_PORT', '5432'))
    database: str = os.getenv('DB_NAME', 'pooling_workshop')
    user: str = os.getenv('DB_USER', 'postgres')
    password: str = os.getenv('DB_PASSWORD', 'password')

    # Pool configuration
    pool_min_size: int = int(os.getenv('POOL_MIN_SIZE', '5'))
    pool_max_size: int = int(os.getenv('POOL_MAX_SIZE', '20'))
    pool_max_queries: int = int(os.getenv('POOL_MAX_QUERIES', '50000'))
    pool_max_inactive_time: float = float(os.getenv('POOL_MAX_INACTIVE_TIME', '300.0'))

    # Connection settings
    command_timeout: float = float(os.getenv('COMMAND_TIMEOUT', '30.0'))
    connect_timeout: float = float(os.getenv('CONNECT_TIMEOUT', '10.0'))

    # Workshop settings
    enable_monitoring: bool = os.getenv('ENABLE_MONITORING', 'true').lower() == 'true'
    simulation_concurrency: int = int(os.getenv('SIMULATION_CONCURRENCY', '10'))

    def get_connection_string(self) -> str:
        """Get PostgreSQL connection string"""
        return f'postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}'

# Global settings instance
settings = DatabaseSettings()
```

#### Step 3: Database Models and Schema

**src/models.py:**
```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class User(BaseModel):
    """User model for workshop"""
    id: Optional[int] = None
    username: str
    email: str
    full_name: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Product(BaseModel):
    """Product model for workshop"""
    id: Optional[int] = None
    name: str
    description: str
    price: float
    category: str
    in_stock: bool = True
    created_at: Optional[datetime] = None

class Order(BaseModel):
    """Order model for workshop"""
    id: Optional[int] = None
    user_id: int
    product_id: int
    quantity: int
    total_price: float
    status: str = 'pending'
    created_at: Optional[datetime] = None

# SQL Schema
SCHEMA_SQL = """
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
"""
```

### Part 2: Connection Pool Implementation

#### Step 4: Database Connection Pool

**src/database.py:**
```python
import asyncpg
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator, Dict, Any, List
from datetime import datetime, timedelta
import logging

from config.settings import settings

logger = logging.getLogger(__name__)

class DatabasePool:
    """PostgreSQL connection pool manager"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._pool_stats = {
            'connections_created': 0,
            'connections_acquired': 0,
            'connections_released': 0,
            'queries_executed': 0,
            'errors': 0,
            'start_time': None
        }

    async def initialize(self) -> None:
        """Initialize the connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                dsn=settings.get_connection_string(),
                min_size=settings.pool_min_size,
                max_size=settings.pool_max_size,
                max_queries=settings.pool_max_queries,
                max_inactive_connection_lifetime=settings.pool_max_inactive_time,
                command_timeout=settings.command_timeout,
                init=self._init_connection,
                loop=asyncio.get_event_loop()
            )

            self._pool_stats['start_time'] = datetime.now()
            logger.info(f"Database pool initialized: min={settings.pool_min_size}, max={settings.pool_max_size}")

        except Exception as e:
            logger.error(f"Failed to initialize pool: {e}")
            raise

    async def close(self) -> None:
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database pool closed")

    async def _init_connection(self, conn: asyncpg.Connection) -> None:
        """Initialize a new connection"""
        self._pool_stats['connections_created'] += 1

        # Set connection parameters
        await conn.execute('SET timezone = "UTC"')
        await conn.execute('SET search_path = public')
        await conn.execute("SET application_name = 'pooling_workshop'")

        # Set statement timeout for long-running queries
        await conn.execute(f'SET statement_timeout = {int(settings.command_timeout * 1000)}')

        logger.debug(f"Connection initialized: {conn}")

    @asynccontextmanager
    async def connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Context manager for database connections"""
        if not self.pool:
            raise RuntimeError("Pool not initialized. Call initialize() first.")

        conn = None
        try:
            conn = await self.pool.acquire()
            self._pool_stats['connections_acquired'] += 1
            logger.debug(f"Connection acquired: {conn}")
            yield conn
        except Exception as e:
            self._pool_stats['errors'] += 1
            logger.error(f"Connection error: {e}")
            raise
        finally:
            if conn:
                await self.pool.release(conn)
                self._pool_stats['connections_released'] += 1
                logger.debug(f"Connection released: {conn}")

    async def execute_query(self, query: str, *params) -> list:
        """Execute a query and return results"""
        async with self.connection() as conn:
            try:
                result = await conn.fetch(query, *params)
                self._pool_stats['queries_executed'] += 1
                return result
            except Exception as e:
                self._pool_stats['errors'] += 1
                logger.error(f"Query execution error: {e}")
                raise

    async def execute_single(self, query: str, *params):
        """Execute a query and return a single value"""
        async with self.connection() as conn:
            try:
                result = await conn.fetchval(query, *params)
                self._pool_stats['queries_executed'] += 1
                return result
            except Exception as e:
                self._pool_stats['errors'] += 1
                logger.error(f"Single query error: {e}")
                raise

    async def execute_transaction(self, queries: List[tuple]) -> List[list]:
        """Execute multiple queries in a transaction"""
        async with self.connection() as conn:
            async with conn.transaction():
                results = []
                for query, params in queries:
                    try:
                        result = await conn.fetch(query, *params)
                        self._pool_stats['queries_executed'] += 1
                        results.append(result)
                    except Exception as e:
                        self._pool_stats['errors'] += 1
                        logger.error(f"Transaction query error: {e}")
                        raise
                return results

    def get_pool_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        if not self.pool:
            return {'status': 'not_initialized'}

        pool_stats = self.pool.get_pool_stats() if hasattr(self.pool, 'get_pool_stats') else {}
        runtime = datetime.now() - self._pool_stats['start_time'] if self._pool_stats['start_time'] else timedelta(0)

        return {
            'pool_stats': pool_stats,
            'custom_stats': self._pool_stats,
            'runtime_seconds': runtime.total_seconds(),
            'queries_per_second': self._pool_stats['queries_executed'] / max(runtime.total_seconds(), 1),
            'error_rate': self._pool_stats['errors'] / max(self._pool_stats['queries_executed'], 1)
        }

    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on the database"""
        try:
            start_time = datetime.now()
            result = await self.execute_single("SELECT 1 as health_check")
            response_time = (datetime.now() - start_time).total_seconds()

            return {
                'status': 'healthy',
                'response_time': response_time,
                'pool_stats': self.get_pool_stats()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'pool_stats': self.get_pool_stats()
            }

# Global pool instance
db_pool = DatabasePool()
```

### Part 3: Data Access Layer

#### Step 5: Repository Pattern Implementation

**src/repository.py:**
```python
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg

from .database import db_pool
from .models import User, Product, Order

class UserRepository:
    """User data access operations"""

    async def create_user(self, user: User) -> int:
        """Create a new user"""
        query = """
        INSERT INTO users (username, email, full_name, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """
        result = await db_pool.execute_single(
            query,
            user.username,
            user.email,
            user.full_name,
            user.is_active
        )
        return result

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = $1"
        result = await db_pool.execute_query(query, user_id)

        if result:
            return User(**dict(result[0]))
        return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        query = "SELECT * FROM users WHERE email = $1"
        result = await db_pool.execute_query(query, email)

        if result:
            return User(**dict(result[0]))
        return None

    async def update_user(self, user_id: int, updates: Dict[str, Any]) -> bool:
        """Update user information"""
        set_parts = []
        params = [user_id]
        param_count = 1

        for key, value in updates.items():
            param_count += 1
            set_parts.append(f"{key} = ${param_count}")
            params.append(value)

        set_clause = ", ".join(set_parts)
        query = f"UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1"

        result = await db_pool.execute_single(query, *params)
        return result is not None

    async def list_users(self, limit: int = 50, offset: int = 0) -> List[User]:
        """List users with pagination"""
        query = "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        results = await db_pool.execute_query(query, limit, offset)

        return [User(**dict(row)) for row in results]

class ProductRepository:
    """Product data access operations"""

    async def create_product(self, product: Product) -> int:
        """Create a new product"""
        query = """
        INSERT INTO products (name, description, price, category, in_stock)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """
        result = await db_pool.execute_single(
            query,
            product.name,
            product.description,
            product.price,
            product.category,
            product.in_stock
        )
        return result

    async def get_products_by_category(self, category: str, limit: int = 20) -> List[Product]:
        """Get products by category"""
        query = "SELECT * FROM products WHERE category = $1 AND in_stock = true ORDER BY created_at DESC LIMIT $2"
        results = await db_pool.execute_query(query, category, limit)

        return [Product(**dict(row)) for row in results]

    async def update_stock(self, product_id: int, in_stock: bool) -> bool:
        """Update product stock status"""
        query = "UPDATE products SET in_stock = $1 WHERE id = $2"
        result = await db_pool.execute_single(query, in_stock, product_id)
        return result is not None

class OrderRepository:
    """Order data access operations"""

    async def create_order(self, order: Order) -> int:
        """Create a new order with transaction"""
        # First check if user and product exist
        user_exists = await db_pool.execute_single("SELECT 1 FROM users WHERE id = $1", order.user_id)
        product_exists = await db_pool.execute_single("SELECT 1 FROM products WHERE id = $1", order.product_id)

        if not user_exists or not product_exists:
            raise ValueError("Invalid user or product ID")

        # Create order in transaction
        queries = [
            ("""
            INSERT INTO orders (user_id, product_id, quantity, total_price, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """, (order.user_id, order.product_id, order.quantity, order.total_price, order.status))
        ]

        results = await db_pool.execute_transaction(queries)
        return results[0][0]['id']

    async def get_user_orders(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get orders for a user with product details"""
        query = """
        SELECT o.*, p.name as product_name, p.price as product_price
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2
        """
        results = await db_pool.execute_query(query, user_id, limit)

        return [dict(row) for row in results]

# Repository instances
user_repo = UserRepository()
product_repo = ProductRepository()
order_repo = OrderRepository()
```

### Part 4: FastAPI Integration

#### Step 6: API Implementation

**src/api.py:**
```python
from fastapi import FastAPI, HTTPException, Depends, Query
from typing import List, Optional
import asyncio
import time

from .models import User, Product, Order
from .repository import user_repo, product_repo, order_repo
from .database import db_pool
from config.settings import settings

app = FastAPI(
    title="Pooling Workshop API",
    description="PostgreSQL Connection Pooling Workshop",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Initialize database pool on startup"""
    await db_pool.initialize()

    # Initialize schema
    from .models import SCHEMA_SQL
    async with db_pool.connection() as conn:
        await conn.execute(SCHEMA_SQL)

    print("Database initialized and schema created")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database pool on shutdown"""
    await db_pool.close()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health = await db_pool.health_check()
    pool_stats = db_pool.get_pool_stats()

    return {
        "status": "healthy" if health['status'] == 'healthy' else "unhealthy",
        "database": health,
        "pool": pool_stats,
        "timestamp": time.time()
    }

@app.get("/pool/stats")
async def get_pool_stats():
    """Get connection pool statistics"""
    return db_pool.get_pool_stats()

# User endpoints
@app.post("/users/", response_model=User)
async def create_user(user: User):
    """Create a new user"""
    try:
        user_id = await user_repo.create_user(user)
        created_user = await user_repo.get_user_by_id(user_id)

        if created_user:
            return created_user
        raise HTTPException(status_code=500, detail="Failed to create user")

    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Username or email already exists")

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get user by ID"""
    user = await user_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/", response_model=List[User])
async def list_users(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    """List users with pagination"""
    return await user_repo.list_users(limit, offset)

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, updates: dict):
    """Update user information"""
    success = await user_repo.update_user(user_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await user_repo.get_user_by_id(user_id)
    return updated_user

# Product endpoints
@app.post("/products/", response_model=Product)
async def create_product(product: Product):
    """Create a new product"""
    try:
        product_id = await product_repo.create_product(product)
        # For simplicity, return the created product (would need to fetch it in real implementation)
        product.id = product_id
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create product: {e}")

@app.get("/products/category/{category}", response_model=List[Product])
async def get_products_by_category(category: str, limit: int = Query(20, ge=1, le=100)):
    """Get products by category"""
    return await product_repo.get_products_by_category(category, limit)

# Order endpoints
@app.post("/orders/", response_model=dict)
async def create_order(order: Order):
    """Create a new order"""
    try:
        order_id = await order_repo.create_order(order)
        return {"order_id": order_id, "status": "created"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {e}")

@app.get("/users/{user_id}/orders")
async def get_user_orders(user_id: int, limit: int = Query(10, ge=1, le=50)):
    """Get orders for a user"""
    # Verify user exists
    user = await user_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    orders = await order_repo.get_user_orders(user_id, limit)
    return {"user_id": user_id, "orders": orders}

# Load testing endpoint
@app.get("/load-test")
async def load_test(iterations: int = Query(10, ge=1, le=100)):
    """Load testing endpoint to stress the connection pool"""
    import asyncio

    async def single_query():
        return await db_pool.execute_single("SELECT 1")

    # Execute multiple queries concurrently
    tasks = [single_query() for _ in range(iterations)]
    start_time = time.time()

    results = await asyncio.gather(*tasks, return_exceptions=True)

    end_time = time.time()
    duration = end_time - start_time

    successful = sum(1 for r in results if not isinstance(r, Exception))
    failed = len(results) - successful

    return {
        "iterations": iterations,
        "successful": successful,
        "failed": failed,
        "duration": duration,
        "queries_per_second": iterations / duration if duration > 0 else 0,
        "pool_stats": db_pool.get_pool_stats()
    }
```

### Part 5: Load Testing and Monitoring

#### Step 7: Load Testing Script

**tests/load_test.py:**
```python
import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict, Any
import json

class LoadTester:
    """Load testing for connection pool"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session: aiohttp.ClientSession = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def run_load_test(self,
                           concurrent_users: int = 10,
                           requests_per_user: int = 50,
                           test_endpoint: str = "/load-test") -> Dict[str, Any]:
        """Run load test with multiple concurrent users"""

        print(f"Starting load test: {concurrent_users} users × {requests_per_user} requests")

        async def user_simulation(user_id: int) -> List[float]:
            """Simulate a single user making requests"""
            response_times = []

            for i in range(requests_per_user):
                start_time = time.time()

                try:
                    params = {"iterations": 1}  # Single query per request
                    async with self.session.get(f"{self.base_url}{test_endpoint}", params=params) as response:
                        await response.json()
                        response_time = time.time() - start_time
                        response_times.append(response_time)

                except Exception as e:
                    print(f"User {user_id}, Request {i}: Error - {e}")
                    response_times.append(time.time() - start_time)  # Still record time

            return response_times

        # Run all users concurrently
        start_time = time.time()
        user_tasks = [user_simulation(i) for i in range(concurrent_users)]
        all_response_times = await asyncio.gather(*user_tasks)
        end_time = time.time()

        # Flatten response times
        all_times = [time for user_times in all_response_times for time in user_times]

        # Calculate statistics
        total_requests = len(all_times)
        total_time = end_time - start_time
        successful_requests = sum(1 for t in all_times if t < 10.0)  # Assume < 10s is successful

        stats = {
            "test_configuration": {
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": total_requests,
                "test_duration": total_time
            },
            "performance_metrics": {
                "total_requests_per_second": total_requests / total_time,
                "average_response_time": statistics.mean(all_times),
                "median_response_time": statistics.median(all_times),
                "min_response_time": min(all_times),
                "max_response_time": max(all_times),
                "95th_percentile": statistics.quantiles(all_times, n=20)[18],  # 95th percentile
                "successful_requests": successful_requests,
                "failed_requests": total_requests - successful_requests,
                "success_rate": successful_requests / total_requests * 100
            }
        }

        return stats

    async def test_connection_pool_limits(self, max_concurrent: int = 50) -> Dict[str, Any]:
        """Test connection pool limits"""

        print(f"Testing pool limits with up to {max_concurrent} concurrent connections")

        async def make_request():
            try:
                async with self.session.get(f"{self.base_url}/health") as response:
                    return await response.json()
            except Exception as e:
                return {"error": str(e)}

        # Gradually increase concurrent connections
        results = {}
        for concurrent in [5, 10, 20, 30, 50][:max_concurrent//10 + 1]:
            print(f"Testing with {concurrent} concurrent connections...")

            start_time = time.time()
            tasks = [make_request() for _ in range(concurrent)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()

            successful = sum(1 for r in responses if isinstance(r, dict) and 'pool' in r)
            failed = len(responses) - successful

            results[concurrent] = {
                "successful": successful,
                "failed": failed,
                "duration": end_time - start_time,
                "requests_per_second": successful / (end_time - start_time) if successful > 0 else 0
            }

        return results

async def main():
    """Run load tests"""
    async with LoadTester() as tester:
        # Basic load test
        print("Running basic load test...")
        basic_results = await tester.run_load_test(
            concurrent_users=5,
            requests_per_user=20
        )

        print("Basic Load Test Results:")
        print(json.dumps(basic_results, indent=2))

        # Pool limits test
        print("\nTesting connection pool limits...")
        pool_results = await tester.test_connection_pool_limits(max_concurrent=30)

        print("Pool Limits Test Results:")
        print(json.dumps(pool_results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

### Part 6: Running the Workshop

#### Step 8: Main Script and Testing

**main.py:**
```python
#!/usr/bin/env python3
"""
AsyncPG Connection Pooling Workshop Main Script
"""

import asyncio
import uvicorn
import argparse
from tests.load_test import LoadTester

def main():
    parser = argparse.ArgumentParser(description='AsyncPG Connection Pooling Workshop')
    parser.add_argument('command', choices=['api', 'load-test', 'pool-test'],
                       help='Command to run')
    parser.add_argument('--host', default='0.0.0.0', help='API host')
    parser.add_argument('--port', type=int, default=8000, help='API port')
    parser.add_argument('--users', type=int, default=10, help='Concurrent users for load test')
    parser.add_argument('--requests', type=int, default=50, help='Requests per user')

    args = parser.parse_args()

    if args.command == 'api':
        # Start the API server
        print("Starting API server...")
        uvicorn.run(
            "src.api:app",
            host=args.host,
            port=args.port,
            reload=True,
            log_level="info"
        )

    elif args.command == 'load-test':
        # Run load testing
        print(f"Running load test with {args.users} users × {args.requests} requests...")

        async def run_test():
            async with LoadTester(f"http://{args.host}:{args.port}") as tester:
                results = await tester.run_load_test(
                    concurrent_users=args.users,
                    requests_per_user=args.requests
                )

                print("\nLoad Test Results:")
                print("=" * 50)
                config = results['test_configuration']
                metrics = results['performance_metrics']

                print(f"Configuration: {config['concurrent_users']} users × {config['requests_per_user']} requests")
                print(".2f")
                print(".3f")
                print(".3f")
                print(".3f")
                print(".1f")
                print(f"Pool stats available: {'pool_stats' in str(results)}")

        asyncio.run(run_test())

    elif args.command == 'pool-test':
        # Test pool limits
        print("Testing connection pool limits...")

        async def run_pool_test():
            async with LoadTester(f"http://{args.host}:{args.port}") as tester:
                results = await tester.test_connection_pool_limits()

                print("\nPool Limits Test Results:")
                print("=" * 50)
                for concurrent, stats in results.items():
                    print(f"{concurrent} concurrent: {stats['successful']}/{concurrent} successful "
                          ".2f")

        asyncio.run(run_pool_test())

if __name__ == "__main__":
    main()
```

**tests/test_pooling.py:**
```python
import pytest
import asyncio
from src.database import db_pool
from src.repository import user_repo, product_repo, order_repo
from src.models import User, Product, Order

class TestPoolingWorkshop:
    """Test cases for the pooling workshop"""

    @pytest.fixture(autouse=True)
    async def setup_teardown(self):
        """Setup and teardown for tests"""
        # Initialize pool
        await db_pool.initialize()

        # Create test data
        await self.create_test_data()

        yield

        # Cleanup
        await self.cleanup_test_data()
        await db_pool.close()

    async def create_test_data(self):
        """Create test data for tests"""
        # Create test user
        self.test_user = User(
            username="testuser",
            email="test@example.com",
            full_name="Test User"
        )
        self.test_user.id = await user_repo.create_user(self.test_user)

        # Create test product
        self.test_product = Product(
            name="Test Product",
            description="A test product",
            price=29.99,
            category="electronics"
        )
        self.test_product.id = await product_repo.create_product(self.test_product)

    async def cleanup_test_data(self):
        """Clean up test data"""
        async with db_pool.connection() as conn:
            await conn.execute("DELETE FROM orders WHERE user_id = $1", self.test_user.id)
            await conn.execute("DELETE FROM users WHERE id = $1", self.test_user.id)
            await conn.execute("DELETE FROM products WHERE id = $1", self.test_product.id)

    @pytest.mark.asyncio
    async def test_connection_pool_health(self):
        """Test connection pool health"""
        health = await db_pool.health_check()
        assert health['status'] == 'healthy'
        assert 'pool_stats' in health

    @pytest.mark.asyncio
    async def test_user_crud_operations(self):
        """Test user CRUD operations"""
        # Create user (already done in setup)

        # Read user
        user = await user_repo.get_user_by_id(self.test_user.id)
        assert user is not None
        assert user.username == self.test_user.username

        # Update user
        updates = {"full_name": "Updated Test User"}
        success = await user_repo.update_user(self.test_user.id, updates)
        assert success

        # Verify update
        updated_user = await user_repo.get_user_by_id(self.test_user.id)
        assert updated_user.full_name == "Updated Test User"

    @pytest.mark.asyncio
    async def test_product_operations(self):
        """Test product operations"""
        # Get products by category
        products = await product_repo.get_products_by_category("electronics")
        assert len(products) >= 1
        assert any(p.id == self.test_product.id for p in products)

    @pytest.mark.asyncio
    async def test_order_creation(self):
        """Test order creation with transaction"""
        order = Order(
            user_id=self.test_user.id,
            product_id=self.test_product.id,
            quantity=2,
            total_price=59.98
        )

        order_id = await order_repo.create_order(order)
        assert order_id is not None

        # Verify order was created
        user_orders = await order_repo.get_user_orders(self.test_user.id)
        assert len(user_orders) >= 1
        assert any(o['id'] == order_id for o in user_orders)

    @pytest.mark.asyncio
    async def test_concurrent_operations(self):
        """Test concurrent database operations"""
        async def create_user_task(task_id: int):
            user = User(
                username=f"concurrent_user_{task_id}",
                email=f"concurrent_{task_id}@example.com",
                full_name=f"Concurrent User {task_id}"
            )
            user_id = await user_repo.create_user(user)
            return user_id

        # Run 10 concurrent user creation tasks
        tasks = [create_user_task(i) for i in range(10)]
        user_ids = await asyncio.gather(*tasks)

        assert len(user_ids) == 10
        assert all(uid is not None for uid in user_ids)

    @pytest.mark.asyncio
    async def test_pool_statistics(self):
        """Test pool statistics collection"""
        stats = db_pool.get_pool_stats()

        assert 'custom_stats' in stats
        assert 'connections_created' in stats['custom_stats']
        assert 'queries_executed' in stats['custom_stats']

        # Verify some queries were executed during tests
        assert stats['custom_stats']['queries_executed'] > 0
```

## Running the Workshop

### Start the Database

```bash
# Start PostgreSQL (using Docker for simplicity)
docker run -d \
  --name postgres-workshop \
  -e POSTGRES_DB=pooling_workshop \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# Wait for database to be ready
sleep 10
```

### Run the API Server

```bash
# Set environment variables
export DB_HOST=localhost
export DB_NAME=pooling_workshop
export DB_USER=postgres
export DB_PASSWORD=password

# Start the API server
python main.py api
```

### Test Basic Functionality

```bash
# In another terminal, test the API
curl http://localhost:8000/health

# Create a test user
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe"
  }'

# List users
curl http://localhost:8000/users/

# Create a product
curl -X POST http://localhost:8000/products/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "High-quality wireless headphones",
    "price": 99.99,
    "category": "electronics"
  }'

# Create an order
curl -X POST http://localhost:8000/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "product_id": 1,
    "quantity": 1,
    "total_price": 99.99
  }'
```

### Run Load Tests

```bash
# Run basic load test
python main.py load-test --users 5 --requests 20

# Test pool limits
python main.py pool-test

# Run comprehensive load test
python -m pytest tests/test_pooling.py -v

# Run load testing script directly
python tests/load_test.py
```

### Monitor Pool Performance

```bash
# Check pool statistics
curl http://localhost:8000/pool/stats

# Monitor during load test
watch -n 2 'curl -s http://localhost:8000/pool/stats | jq .'
```

### Experiment with Pool Settings

```bash
# Test with different pool sizes
POOL_MIN_SIZE=2 POOL_MAX_SIZE=10 python main.py load-test --users 10 --requests 30

POOL_MIN_SIZE=10 POOL_MAX_SIZE=50 python main.py load-test --users 10 --requests 30

# Test with different concurrency levels
python main.py load-test --users 20 --requests 50
python main.py load-test --users 50 --requests 20
```

## Challenge Exercises

### Challenge 1: Pool Size Optimization
1. Experiment with different pool sizes for your workload
2. Measure response times and resource usage
3. Find the optimal pool configuration
4. Document your findings and recommendations

### Challenge 2: Connection Failure Handling
1. Simulate database connection failures
2. Implement automatic reconnection logic
3. Test graceful degradation under failure conditions
4. Monitor recovery time and success rate

### Challenge 3: High-Concurrency Optimization
1. Implement connection pool sharding
2. Test with 100+ concurrent connections
3. Monitor CPU and memory usage patterns
4. Optimize for your specific workload characteristics

## Verification Checklist

### Pool Configuration
- [ ] Connection pool initializes with correct settings
- [ ] Min/max pool sizes are properly configured
- [ ] Connection timeouts are set appropriately
- [ ] Pool statistics are collected and exposed

### CRUD Operations
- [ ] User creation, reading, and updates work correctly
- [ ] Product operations function properly
- [ ] Order creation uses proper transactions
- [ ] Error handling prevents invalid operations

### Load Testing
- [ ] Basic load tests complete successfully
- [ ] Pool statistics show proper connection usage
- [ ] Concurrent operations don't cause failures
- [ ] Response times remain acceptable under load

### Monitoring and Health Checks
- [ ] Health check endpoint returns proper status
- [ ] Pool statistics endpoint shows relevant metrics
- [ ] Error rates are tracked and reported
- [ ] Connection lifecycle is properly managed

## Next Steps
- [Workshop: Query Profiling Lab](../workshops/workshop-02-query-profiling.md)
- [Workshop: Optimization Assignment](../workshops/workshop-03-optimization-assignment.md)

## Additional Resources
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/current/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/libpq-connect.html)
- [Connection Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [FastAPI Production Guide](https://fastapi.tiangolo.com/deployment/)

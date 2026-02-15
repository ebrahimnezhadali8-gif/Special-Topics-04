# Tutorial 01: Connection Pooling and Management

## Overview
This tutorial covers connection pooling in PostgreSQL, focusing on asyncpg connection pools, connection lifecycle management, and best practices for high-performance database applications. Understanding connection pooling is crucial for building scalable applications that can handle high concurrency without overwhelming the database server.

## Connection Pooling Fundamentals

### Why Connection Pooling Matters

**Without Connection Pooling:**
```python
# Each request creates a new connection
async def handle_request():
    conn = await asyncpg.connect(database_url)
    try:
        result = await conn.fetchval("SELECT COUNT(*) FROM users")
        return result
    finally:
        await conn.close()  # Expensive operation!
```

**Problems:**
- High connection overhead (TCP handshake, authentication)
- Database server connection limits
- Resource exhaustion under load
- Poor performance for concurrent requests

**With Connection Pooling:**
```python
# Reuse connections from a pool
pool = await asyncpg.create_pool(database_url, min_size=10, max_size=50)

async def handle_request():
    async with pool.acquire() as conn:
        result = await conn.fetchval("SELECT COUNT(*) FROM users")
        return result
```

### Connection Pool Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│  Connection     │───►│ PostgreSQL      │
│   Requests      │    │  Pool           │    │ Server          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │
         │                        │
    ┌────▼────┐              ┌────▼────┐
    │  Idle   │              │ Active  │
    │  Conns  │              │ Conns   │
    └─────────┘              └─────────┘
```

**Pool Components:**
- **Min Size**: Minimum number of connections to maintain
- **Max Size**: Maximum number of connections allowed
- **Idle Timeout**: How long to keep idle connections
- **Max Lifetime**: Maximum connection lifetime before renewal

## asyncpg Connection Pools

### Basic Pool Creation

```python
import asyncpg
from typing import Optional

class DatabasePool:
    """PostgreSQL connection pool manager"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def initialize(
        self,
        host: str = 'localhost',
        port: int = 5432,
        database: str = 'postgres',
        user: str = 'postgres',
        password: str = '',
        min_size: int = 10,
        max_size: int = 50,
        max_queries: int = 50000,
        max_inactive_connection_lifetime: float = 300.0,
        command_timeout: float = 60.0
    ):
        """Initialize the connection pool"""

        # Build connection string
        dsn = f'postgresql://{user}:{password}@{host}:{port}/{database}'

        self.pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=min_size,
            max_size=max_size,
            max_queries=max_queries,  # Close connection after this many queries
            max_inactive_connection_lifetime=max_inactive_connection_lifetime,
            command_timeout=command_timeout,
            # Connection initialization
            init=lambda conn: self._init_connection(conn)
        )

        print(f"Connection pool initialized: min={min_size}, max={max_size}")

    async def _init_connection(self, conn: asyncpg.Connection):
        """Initialize a new connection"""
        # Set connection parameters
        await conn.execute('SET timezone = "UTC"')
        await conn.execute('SET search_path = public')

        # Set application name for monitoring
        await conn.execute("SET application_name = 'my_app_pool'")

        # Enable statement timeout for long-running queries
        await conn.execute('SET statement_timeout = 30000')  # 30 seconds

    async def close(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            print("Connection pool closed")

    async def acquire(self) -> asyncpg.Connection:
        """Acquire a connection from the pool"""
        if not self.pool:
            raise RuntimeError("Pool not initialized")

        return await self.pool.acquire()

    async def release(self, conn: asyncpg.Connection):
        """Release a connection back to the pool"""
        if self.pool:
            await self.pool.release(conn)

    def get_pool_stats(self) -> dict:
        """Get pool statistics"""
        if not self.pool:
            return {}

        return {
            'min_size': self.pool._min_size,
            'max_size': self.pool._max_size,
            'size': self.pool._size,
            'acquired_count': getattr(self.pool, '_acquired_count', 0),
            'queue_size': len(getattr(self.pool, '_queue', []))
        }

# Usage
pool = DatabasePool()

async def main():
    await pool.initialize(
        host='localhost',
        database='myapp',
        user='myuser',
        password='mypass',
        min_size=5,
        max_size=20
    )

    try:
        # Use the pool
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT COUNT(*) FROM users")
            print(f"User count: {result}")

    finally:
        await pool.close()
```

### Context Manager Pattern

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator

class PooledDatabase:
    """Database class with connection pooling"""

    def __init__(self, pool: DatabasePool):
        self.pool = pool

    @asynccontextmanager
    async def connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Context manager for database connections"""
        conn = None
        try:
            conn = await self.pool.acquire()
            yield conn
        except Exception as e:
            # Log the error
            print(f"Database error: {e}")
            raise
        finally:
            if conn:
                await self.pool.release(conn)

    async def execute_query(self, query: str, *args) -> list:
        """Execute a query using pooled connection"""
        async with self.connection() as conn:
            return await conn.fetch(query, *args)

    async def execute_single(self, query: str, *args):
        """Execute a single-result query"""
        async with self.connection() as conn:
            return await conn.fetchval(query, *args)

    async def execute_transaction(self, queries: list) -> list:
        """Execute multiple queries in a transaction"""
        async with self.connection() as conn:
            async with conn.transaction():
                results = []
                for query, params in queries:
                    result = await conn.fetch(query, *params)
                    results.append(result)
                return results

# Usage
db = PooledDatabase(pool)

# Simple query
user_count = await db.execute_single("SELECT COUNT(*) FROM users")

# Transaction
queries = [
    ("INSERT INTO users (name, email) VALUES ($1, $2)", ["John", "john@example.com"]),
    ("INSERT INTO profiles (user_id, bio) VALUES (currval('users_id_seq'), $1)", ["Bio text"])
]

results = await db.execute_transaction(queries)
```

### Connection Health Monitoring

```python
import asyncio
import time
from typing import Dict, Any

class ConnectionHealthMonitor:
    """Monitor connection pool health"""

    def __init__(self, pool: DatabasePool, check_interval: int = 30):
        self.pool = pool
        self.check_interval = check_interval
        self.health_stats: Dict[str, Any] = {}
        self.monitoring = False

    async def start_monitoring(self):
        """Start background health monitoring"""
        self.monitoring = True
        asyncio.create_task(self._monitor_loop())

    async def stop_monitoring(self):
        """Stop health monitoring"""
        self.monitoring = False

    async def _monitor_loop(self):
        """Background monitoring loop"""
        while self.monitoring:
            try:
                await self._check_health()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                print(f"Health check error: {e}")
                await asyncio.sleep(5)  # Retry sooner on error

    async def _check_health(self):
        """Perform health check"""
        start_time = time.time()

        try:
            # Test query
            async with self.pool.acquire() as conn:
                await conn.execute('SELECT 1')

            response_time = time.time() - start_time

            self.health_stats.update({
                'last_check': time.time(),
                'status': 'healthy',
                'response_time': response_time,
                'pool_stats': self.pool.get_pool_stats()
            })

        except Exception as e:
            self.health_stats.update({
                'last_check': time.time(),
                'status': 'unhealthy',
                'error': str(e),
                'pool_stats': self.pool.get_pool_stats()
            })

    def get_health_status(self) -> Dict[str, Any]:
        """Get current health status"""
        return self.health_stats.copy()

    def is_healthy(self) -> bool:
        """Check if pool is healthy"""
        return self.health_stats.get('status') == 'healthy'

# Usage
monitor = ConnectionHealthMonitor(pool)
await monitor.start_monitoring()

# Check health
if monitor.is_healthy():
    print("Database pool is healthy")
else:
    print("Database pool is unhealthy:", monitor.get_health_status())
```

## Connection Pool Configuration

### Environment-Based Configuration

```python
import os
from pydantic import BaseSettings, validator

class DatabaseSettings(BaseSettings):
    """Database configuration settings"""

    # Connection settings
    host: str = os.getenv('DB_HOST', 'localhost')
    port: int = int(os.getenv('DB_PORT', '5432'))
    database: str = os.getenv('DB_NAME', 'postgres')
    user: str = os.getenv('DB_USER', 'postgres')
    password: str = os.getenv('DB_PASSWORD', '')

    # Pool settings
    pool_min_size: int = int(os.getenv('DB_POOL_MIN_SIZE', '5'))
    pool_max_size: int = int(os.getenv('DB_POOL_MAX_SIZE', '20'))
    pool_max_queries: int = int(os.getenv('DB_POOL_MAX_QUERIES', '10000'))
    pool_max_inactive_lifetime: float = float(os.getenv('DB_POOL_MAX_INACTIVE_LIFETIME', '300.0'))

    # Connection settings
    command_timeout: float = float(os.getenv('DB_COMMAND_TIMEOUT', '30.0'))
    connect_timeout: float = float(os.getenv('DB_CONNECT_TIMEOUT', '10.0'))

    # SSL settings
    ssl_mode: str = os.getenv('DB_SSL_MODE', 'prefer')
    ssl_ca: str = os.getenv('DB_SSL_CA', '')
    ssl_cert: str = os.getenv('DB_SSL_CERT', '')
    ssl_key: str = os.getenv('DB_SSL_KEY', '')

    class Config:
        env_file = '.env'

    @validator('pool_min_size', 'pool_max_size')
    def validate_pool_sizes(cls, v, values):
        """Validate pool size constraints"""
        if 'pool_min_size' in values and v < values['pool_min_size']:
            raise ValueError('pool_max_size must be >= pool_min_size')
        return v

    def get_connection_string(self) -> str:
        """Build PostgreSQL connection string"""
        conn_parts = [
            f'host={self.host}',
            f'port={self.port}',
            f'database={self.database}',
            f'user={self.user}',
            f'password={self.password}',
            f'sslmode={self.ssl_mode}'
        ]

        if self.ssl_ca:
            conn_parts.append(f'sslrootcert={self.ssl_ca}')
        if self.ssl_cert:
            conn_parts.append(f'sslcert={self.ssl_cert}')
        if self.ssl_key:
            conn_parts.append(f'sslkey={self.ssl_key}')

        return ' '.join(conn_parts)

    def get_pool_kwargs(self) -> dict:
        """Get pool initialization kwargs"""
        return {
            'min_size': self.pool_min_size,
            'max_size': self.pool_max_size,
            'max_queries': self.pool_max_queries,
            'max_inactive_connection_lifetime': self.pool_max_inactive_lifetime,
            'command_timeout': self.command_timeout,
            'server_settings': {
                'application_name': 'my_app',
                'timezone': 'UTC'
            }
        }

# Usage
settings = DatabaseSettings()

pool = await asyncpg.create_pool(
    settings.get_connection_string(),
    **settings.get_pool_kwargs()
)
```

### Production Configuration Examples

```python
# Development configuration
dev_config = DatabaseSettings(
    pool_min_size=2,
    pool_max_size=10,
    pool_max_queries=1000,
    command_timeout=60.0
)

# Production configuration
prod_config = DatabaseSettings(
    pool_min_size=10,
    pool_max_size=100,
    pool_max_queries=50000,
    pool_max_inactive_lifetime=600.0,  # 10 minutes
    command_timeout=30.0
)

# High-traffic configuration
high_traffic_config = DatabaseSettings(
    pool_min_size=50,
    pool_max_size=200,
    pool_max_queries=100000,
    pool_max_inactive_lifetime=300.0,  # 5 minutes
    command_timeout=15.0
)
```

## Connection Lifecycle Management

### Connection Initialization and Cleanup

```python
class AdvancedPoolManager:
    """Advanced connection pool with lifecycle management"""

    def __init__(self):
        self.pool = None
        self.health_monitor = None
        self.connection_counter = 0
        self.error_counter = 0

    async def initialize_pool(self, settings: DatabaseSettings):
        """Initialize pool with advanced configuration"""
        self.pool = await asyncpg.create_pool(
            settings.get_connection_string(),
            **settings.get_pool_kwargs(),
            init=self._on_connect,
            cleanup=self._on_release
        )

        # Start health monitoring
        self.health_monitor = ConnectionHealthMonitor(self)
        await self.health_monitor.start_monitoring()

    async def _on_connect(self, conn: asyncpg.Connection):
        """Called when a new connection is established"""
        self.connection_counter += 1

        # Set connection-specific settings
        await conn.execute('SET SESSION timezone = "UTC"')
        await conn.execute('SET SESSION work_mem = "64MB"')  # Increase work memory
        await conn.execute('SET SESSION maintenance_work_mem = "256MB"')

        # Log connection establishment
        print(f"Connection {self.connection_counter} established")

        # Set up connection-specific event handlers
        conn.add_log_listener(self._on_connection_log)

    async def _on_release(self, conn: asyncpg.Connection):
        """Called when a connection is released back to pool"""
        # Clean up connection-specific state
        try:
            await conn.execute('RESET ALL')  # Reset all session settings
        except Exception:
            pass  # Ignore cleanup errors

    def _on_connection_log(self, conn: asyncpg.Connection, message: str):
        """Handle connection-specific log messages"""
        if 'ERROR' in message or 'WARNING' in message:
            self.error_counter += 1
            print(f"Connection log: {message}")

    async def execute_with_retry(self, query: str, *args, max_retries: int = 3):
        """Execute query with automatic retry on connection errors"""
        last_error = None

        for attempt in range(max_retries):
            try:
                async with self.pool.acquire() as conn:
                    return await conn.fetch(query, *args)
            except (asyncpg.exceptions.ConnectionDoesNotExistError,
                    asyncpg.exceptions.InterfaceError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    continue
            except Exception as e:
                # Non-connection error, don't retry
                raise e

        raise last_error

    async def get_pool_metrics(self) -> Dict[str, Any]:
        """Get comprehensive pool metrics"""
        pool_stats = self.pool.get_pool_stats() if self.pool else {}
        health_stats = self.health_monitor.get_health_status() if self.health_monitor else {}

        return {
            'pool_stats': pool_stats,
            'health_stats': health_stats,
            'connection_counter': self.connection_counter,
            'error_counter': self.error_counter,
            'error_rate': self.error_counter / max(self.connection_counter, 1)
        }

    async def graceful_shutdown(self):
        """Gracefully shutdown the pool"""
        if self.health_monitor:
            await self.health_monitor.stop_monitoring()

        if self.pool:
            await self.pool.close()

        print("Pool shutdown completed")
```

## Performance Optimization

### Pool Sizing Guidelines

```python
def calculate_optimal_pool_size(
    concurrent_requests: int,
    avg_query_time_ms: float,
    target_utilization: float = 0.8
) -> tuple[int, int]:
    """
    Calculate optimal pool size based on application characteristics

    Args:
        concurrent_requests: Expected concurrent database requests
        avg_query_time_ms: Average query execution time in milliseconds
        target_utilization: Target connection utilization (0.0-1.0)

    Returns:
        Tuple of (min_size, max_size)
    """

    # Estimate connections needed
    # Formula: connections = (concurrent_requests * avg_query_time) / target_response_time

    # Assuming target response time is avg_query_time (no queueing)
    connections_needed = concurrent_requests

    # Adjust for utilization target
    max_size = int(connections_needed / target_utilization)
    min_size = max(1, int(max_size * 0.2))  # Keep 20% as minimum

    return min_size, max_size

# Example calculations
print("Low traffic app (10 concurrent, 50ms queries):")
min_size, max_size = calculate_optimal_pool_size(10, 50)
print(f"Pool size: {min_size}-{max_size}")

print("High traffic app (1000 concurrent, 20ms queries):")
min_size, max_size = calculate_optimal_pool_size(1000, 20)
print(f"Pool size: {min_size}-{max_size}")
```

### Connection Pool Monitoring

```python
import psutil
import time
from typing import Dict, Any

class PoolPerformanceMonitor:
    """Monitor pool performance and system resources"""

    def __init__(self, pool_manager: AdvancedPoolManager):
        self.pool_manager = pool_manager
        self.metrics_history = []
        self.collection_interval = 60  # seconds

    async def start_monitoring(self):
        """Start performance monitoring"""
        while True:
            metrics = await self.collect_metrics()
            self.metrics_history.append(metrics)

            # Keep only last 100 measurements
            if len(self.metrics_history) > 100:
                self.metrics_history.pop(0)

            await asyncio.sleep(self.collection_interval)

    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect current performance metrics"""
        pool_metrics = await self.pool_manager.get_pool_metrics()

        # System metrics
        system_metrics = {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_io': psutil.disk_io_counters().read_bytes + psutil.disk_io_counters().write_bytes
        }

        return {
            'timestamp': time.time(),
            'pool_metrics': pool_metrics,
            'system_metrics': system_metrics
        }

    def get_performance_report(self) -> Dict[str, Any]:
        """Generate performance report"""
        if not self.metrics_history:
            return {}

        recent_metrics = self.metrics_history[-10:]  # Last 10 minutes

        # Calculate averages
        avg_pool_size = sum(m['pool_metrics']['pool_stats'].get('size', 0) for m in recent_metrics) / len(recent_metrics)
        avg_cpu = sum(m['system_metrics']['cpu_percent'] for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m['system_metrics']['memory_percent'] for m in recent_metrics) / len(recent_metrics)

        return {
            'time_range': f"{len(recent_metrics)} measurements",
            'pool_performance': {
                'average_pool_size': avg_pool_size,
                'pool_utilization': avg_pool_size / max(self.pool_manager.pool._max_size, 1)
            },
            'system_performance': {
                'average_cpu_percent': avg_cpu,
                'average_memory_percent': avg_memory
            },
            'recommendations': self._generate_recommendations(avg_pool_size, avg_cpu, avg_memory)
        }

    def _generate_recommendations(self, avg_pool_size: float, avg_cpu: float, avg_memory: float) -> list:
        """Generate performance recommendations"""
        recommendations = []

        if avg_pool_size > self.pool_manager.pool._max_size * 0.9:
            recommendations.append("Consider increasing max pool size")

        if avg_cpu > 80:
            recommendations.append("High CPU usage - consider optimizing queries or scaling")

        if avg_memory > 85:
            recommendations.append("High memory usage - monitor for memory leaks")

        if avg_pool_size < self.pool_manager.pool._min_size * 0.5:
            recommendations.append("Pool underutilized - consider reducing min pool size")

        return recommendations
```

## Best Practices

### 1. Proper Pool Sizing
```python
# Calculate based on your application needs
concurrent_users = 100
avg_query_time = 0.05  # 50ms
target_utilization = 0.8

min_size, max_size = calculate_optimal_pool_size(concurrent_users, avg_query_time * 1000, target_utilization)

pool = await asyncpg.create_pool(
    dsn=database_url,
    min_size=min_size,
    max_size=max_size
)
```

### 2. Connection Lifetime Management
```python
# Set appropriate timeouts
pool = await asyncpg.create_pool(
    dsn=database_url,
    max_inactive_connection_lifetime=300,  # 5 minutes
    max_queries=10000,  # Recycle after 10k queries
    command_timeout=30  # 30 second query timeout
)
```

### 3. Error Handling and Recovery
```python
async def safe_query_execution(pool, query, *args):
    """Execute query with proper error handling"""
    try:
        async with pool.acquire() as conn:
            return await conn.fetch(query, *args)
    except asyncpg.exceptions.ConnectionDoesNotExistError:
        # Connection lost, pool will handle reconnection
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Resource already exists")
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### 4. Monitoring and Alerting
```python
# Monitor pool health
async def health_check(pool):
    """Database health check"""
    try:
        async with pool.acquire() as conn:
            await conn.execute('SELECT 1')
        return {"status": "healthy", "pool_size": pool._size}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Alert on pool exhaustion
pool_stats = pool.get_pool_stats()
if pool_stats['queue_size'] > 10:
    alert_system.send_alert("Database connection pool queue growing")
```

## Hands-on Exercises

### Exercise 1: Basic Pool Setup
1. Create a DatabasePool class with initialization
2. Implement connection acquisition and release
3. Add basic health checking
4. Test with concurrent requests

### Exercise 2: Pool Configuration
1. Implement environment-based pool configuration
2. Calculate optimal pool sizes for different scenarios
3. Set up proper connection timeouts and limits
4. Monitor pool performance metrics

### Exercise 3: Advanced Pool Management
1. Implement connection lifecycle hooks
2. Add automatic retry logic for failed connections
3. Create pool performance monitoring
4. Set up alerting for pool issues

## Next Steps
- [Query Optimization Tutorial](../tutorials/02-query-optimization.md)
- [Workshop: asyncpg Pooling Lab](../workshops/workshop-01-asyncpg-pooling.md)

## Additional Resources
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/current/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/libpq-connect.html)
- [Database Connection Pooling Best Practices](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [Connection Pool Monitoring](https://www.cockroachlabs.com/docs/stable/monitor-and-debug.html)

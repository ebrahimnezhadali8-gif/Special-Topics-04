# PostgreSQL Optimization Environment Setup

## Overview
This guide covers advanced PostgreSQL setup for performance optimization, monitoring, and scaling.

## Prerequisites
- PostgreSQL installed (from Subject 09)
- Basic SQL knowledge
- System administration experience

---

## Advanced PostgreSQL Installation

### Optimized PostgreSQL Configuration

**postgresql.conf key settings:**
```bash
# Memory settings (adjust based on server RAM)
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 75% of RAM
work_mem = 4MB                  # Per connection
maintenance_work_mem = 64MB     # For maintenance operations

# Connection settings
max_connections = 100           # Maximum concurrent connections
listen_addresses = 'localhost'  # Listen on localhost

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'           # Log DDL statements
log_duration = on               # Log query duration
```

### Performance Monitoring Setup

```bash
# Install monitoring tools
sudo apt install pgtop pg_stat_statements

# Enable pg_stat_statements extension
psql -U postgres -d mydb -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Install pgBadger for log analysis
wget https://github.com/darold/pgBadger/archive/refs/tags/v12.0.tar.gz
tar xzf v12.0.tar.gz
cd pgBadger-12.0
perl Makefile.PL
make && sudo make install
```

---

## Python Optimization Tools

### Install Dependencies
```bash
uv add psycopg2-binary asyncpg sqlalchemy
uv add pgcli  # Enhanced CLI
uv add pg_activity  # Activity monitoring
uv add poormanspgtune  # Configuration tuning
```

### Connection Pooling Setup
```python
# database/connection.py
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager

pool = SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    host='localhost',
    database='mydb',
    user='myuser',
    password='mypassword'
)

@contextmanager
def get_connection():
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)
```

---

## Monitoring Dashboard Setup

### pgAdmin Advanced Configuration
1. Install pgAdmin
2. Configure dashboards for:
   - Server activity
   - Database statistics
   - Query performance
   - Table/index statistics

### Custom Monitoring Script
```python
# monitoring/dashboard.py
import psycopg2
import time
from datetime import datetime

def get_db_stats():
    conn = psycopg2.connect("dbname=mydb user=myuser")
    cur = conn.cursor()

    # Active connections
    cur.execute("""
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
    """)
    active_conn = cur.fetchone()[0]

    # Slow queries
    cur.execute("""
        SELECT query, total_time
        FROM pg_stat_statements
        ORDER BY total_time DESC
        LIMIT 5
    """)
    slow_queries = cur.fetchall()

    cur.close()
    conn.close()

    return {
        'active_connections': active_conn,
        'slow_queries': slow_queries,
        'timestamp': datetime.now()
    }

if __name__ == "__main__":
    while True:
        stats = get_db_stats()
        print(f"Active connections: {stats['active_connections']}")
        print("Top slow queries:")
        for query, time in stats['slow_queries'][:3]:
            print(f"  {time:.2f}ms: {query[:50]}...")
        time.sleep(60)  # Update every minute
```

---

## Index Optimization Tools

### Index Analysis Scripts
```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY n_distinct DESC;
```

### Index Maintenance
```bash
# Reindex database
psql -U postgres -d mydb -c "REINDEX DATABASE mydb;"

# Analyze tables
psql -U postgres -d mydb -c "ANALYZE;"

# Vacuum database
psql -U postgres -d mydb -c "VACUUM;"
```

---

## Query Optimization Setup

### EXPLAIN Plan Analysis
```sql
-- Analyze query execution
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM articles
WHERE published_date > '2024-01-01'
ORDER BY views DESC
LIMIT 10;
```

### Query Monitoring
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();
```

---

## Backup & Recovery Optimization

### Automated Backup Scripts
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mydb"

pg_dump -U postgres -h localhost $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### Point-in-Time Recovery Setup
```bash
# Enable WAL archiving
psql -U postgres -c "ALTER SYSTEM SET wal_level = replica;"
psql -U postgres -c "ALTER SYSTEM SET archive_mode = on;"
psql -U postgres -c "ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/archive/%f';"
psql -U postgres -c "SELECT pg_reload_conf();"
```

---

## Replication Setup (Optional)

### Streaming Replication
```bash
# On primary server
psql -U postgres -c "CREATE USER replica REPLICATION LOGIN PASSWORD 'replica_password';"

# Configure pg_hba.conf
echo "host replication replica 192.168.1.100/32 md5" >> /etc/postgresql/15/main/pg_hba.conf

# Configure postgresql.conf
echo "wal_level = replica" >> /etc/postgresql/15/main/postgresql.conf
echo "max_wal_senders = 3" >> /etc/postgresql/15/main/postgresql.conf
echo "wal_keep_size = 64MB" >> /etc/postgresql/15/main/postgresql.conf
```

---

## Performance Testing Tools

### pgbench Setup
```bash
# Initialize test database
pgbench -i -U postgres testdb

# Run performance test
pgbench -c 10 -j 2 -T 60 -U postgres testdb

# Custom test script
pgbench -f custom_test.sql -c 10 -j 2 -T 60 -U postgres testdb
```

### Load Testing
```python
# load_test.py
import psycopg2
import concurrent.futures
import time

def worker(queries):
    conn = psycopg2.connect("dbname=testdb user=postgres")
    cur = conn.cursor()

    start_time = time.time()
    for query in queries:
        cur.execute(query)
        cur.fetchall()

    cur.close()
    conn.close()
    return time.time() - start_time

# Run concurrent load test
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(worker, queries) for _ in range(10)]
    results = [f.result() for f in concurrent.futures.as_completed(futures)]

print(f"Average query time: {sum(results)/len(results):.2f} seconds")
```

---

## Monitoring & Alerting

### Prometheus + Grafana Setup
```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xzf prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64
./prometheus

# Install Grafana
sudo apt install grafana
sudo systemctl start grafana-server
```

### PostgreSQL Exporter
```bash
# Install postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.12.1/postgres_exporter-0.12.1.linux-amd64.tar.gz
tar xzf postgres_exporter-0.12.1.linux-amd64.tar.gz
cd postgres_exporter-0.12.1.linux-amd64
./postgres_exporter --extend.query-path=queries.yaml
```

---

## Next Steps

1. [Learn PostgreSQL performance tuning](../tutorials/01-performance-tuning.md)
2. [Analyze query performance](../workshops/workshop-01-query-optimization.md)
3. [Set up monitoring dashboards](../tutorials/02-monitoring-setup.md)
4. [Implement backup strategies](../workshops/workshop-02-backup-recovery.md)

---

## Resources

- [PostgreSQL Performance Wiki](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [pgBadger Documentation](https://pgbadger.darold.net/)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Monitoring Best Practices](https://www.datadoghq.com/blog/postgresql-monitoring/)

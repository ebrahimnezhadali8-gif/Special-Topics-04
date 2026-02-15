# Tutorial 02: Query Optimization and EXPLAIN Analysis

## Overview
This tutorial covers PostgreSQL query optimization techniques, focusing on the EXPLAIN command, query execution planning, and performance analysis. You'll learn how to analyze query performance, identify bottlenecks, and optimize slow queries for better application performance.

## Understanding Query Execution

### PostgreSQL Query Processing Pipeline

```
SQL Query → Parser → Rewriter → Planner → Executor → Result
```

**Stages:**
1. **Parser**: Checks syntax and creates query tree
2. **Rewriter**: Applies rules (views, rules, etc.)
3. **Planner**: Creates execution plan with cost estimates
4. **Executor**: Executes the plan and returns results

### Query Cost Estimation

PostgreSQL estimates query costs using:
- **CPU costs**: Processing operations
- **I/O costs**: Disk access operations
- **Memory costs**: Sort and hash operations

**Cost Parameters:**
- `seq_page_cost`: Sequential page access cost (default: 1.0)
- `random_page_cost`: Random page access cost (default: 4.0)
- `cpu_tuple_cost`: CPU cost per tuple (default: 0.01)
- `cpu_index_tuple_cost`: CPU cost per index tuple (default: 0.005)

## EXPLAIN Command Fundamentals

### Basic EXPLAIN Usage

```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM users WHERE age > 25;

-- EXPLAIN with execution
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;

-- EXPLAIN with detailed costs
EXPLAIN (VERBOSE, COSTS, BUFFERS) SELECT * FROM users WHERE age > 25;

-- EXPLAIN with timing
EXPLAIN (ANALYZE, TIMING) SELECT * FROM users WHERE age > 25;
```

### EXPLAIN Output Structure

```
QUERY PLAN
├── Seq Scan on users (cost=0.00..10.50 rows=5 width=36)
│   Filter: (age > 25)
│   Rows Removed by Filter: 15
└── Total runtime: 0.123 ms
```

**Key Metrics:**
- **cost**: Estimated startup cost .. total cost
- **rows**: Estimated number of rows
- **width**: Average row width in bytes
- **actual time**: Real execution time
- **loops**: Number of times operation was executed

### Reading EXPLAIN Output

```python
import asyncpg
import json

class QueryAnalyzer:
    """Analyze PostgreSQL query execution plans"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def explain_query(self, query: str, params: tuple = None, analyze: bool = True) -> dict:
        """Execute EXPLAIN on a query and return structured results"""

        explain_cmd = "EXPLAIN (FORMAT JSON"
        if analyze:
            explain_cmd += ", ANALYZE"
        explain_cmd += ")"

        full_query = f"{explain_cmd} {query}"

        async with self.pool.acquire() as conn:
            try:
                result = await conn.fetchval(full_query, *params if params else ())
                return json.loads(result)[0]  # EXPLAIN returns array
            except Exception as e:
                print(f"EXPLAIN error: {e}")
                return {}

    async def analyze_query_performance(self, query: str, params: tuple = None) -> dict:
        """Comprehensive query performance analysis"""

        # Get execution plan
        plan = await self.explain_query(query, params, analyze=True)

        analysis = {
            'query': query,
            'execution_time': plan.get('Execution Time', 0),
            'planning_time': plan.get('Planning Time', 0),
            'total_cost': self._extract_total_cost(plan['Plan']),
            'issues': self._identify_performance_issues(plan['Plan']),
            'recommendations': self._generate_recommendations(plan['Plan'])
        }

        return analysis

    def _extract_total_cost(self, plan: dict) -> float:
        """Extract total cost from execution plan"""
        return plan.get('Total Cost', 0)

    def _identify_performance_issues(self, plan: dict) -> list:
        """Identify performance issues in the execution plan"""

        issues = []

        # Check for sequential scans on large tables
        if plan.get('Node Type') == 'Seq Scan':
            plan_rows = plan.get('Plan Rows', 0)
            actual_rows = plan.get('Actual Rows', 0)

            if plan_rows > 1000 and actual_rows > plan_rows * 2:
                issues.append("Large table sequential scan detected")

        # Check for nested loops on large datasets
        if plan.get('Node Type') == 'Nested Loop':
            if plan.get('Actual Loops', 0) > 100:
                issues.append("Expensive nested loop join")

        # Check for sorts without indexes
        if plan.get('Node Type') == 'Sort':
            if not any(node.get('Node Type') == 'Index Scan'
                      for node in self._flatten_plan(plan)):
                issues.append("Sort operation without index")

        # Check for hash joins that spill to disk
        if plan.get('Node Type') in ['Hash Join', 'Hash']:
            temp_space = plan.get('Temp Space Used', 0)
            if temp_space > 100 * 1024 * 1024:  # 100MB
                issues.append("Hash operation spilling to disk")

        return issues

    def _generate_recommendations(self, plan: dict) -> list:
        """Generate optimization recommendations"""

        recommendations = []

        node_type = plan.get('Node Type')

        if node_type == 'Seq Scan':
            table = plan.get('Relation Name')
            if table:
                recommendations.append(f"Consider adding index on {table}")

        elif node_type == 'Nested Loop':
            recommendations.append("Consider using Hash Join or Merge Join")
            recommendations.append("Check if indexes exist on join columns")

        elif node_type == 'Sort':
            sort_key = plan.get('Sort Key')
            if sort_key:
                recommendations.append(f"Consider index on sort key: {sort_key}")

        # Check actual vs estimated rows
        actual_rows = plan.get('Actual Rows', 0)
        plan_rows = plan.get('Plan Rows', 0)

        if plan_rows > 0:
            ratio = actual_rows / plan_rows
            if ratio > 10:
                recommendations.append("Statistics may be outdated - consider ANALYZE")
            elif ratio < 0.1:
                recommendations.append("Query planner overestimating rows")

        return recommendations

    def _flatten_plan(self, plan: dict) -> list:
        """Flatten nested plan structure"""
        plans = [plan]

        if 'Plans' in plan:
            for subplan in plan['Plans']:
                plans.extend(self._flatten_plan(subplan))

        return plans

    async def compare_query_plans(self, queries: list) -> dict:
        """Compare multiple query plans"""

        results = {}
        for i, query in enumerate(queries):
            plan = await self.explain_query(query, analyze=True)
            results[f"query_{i+1}"] = {
                'query': query,
                'total_cost': plan['Plan'].get('Total Cost', 0),
                'execution_time': plan.get('Execution Time', 0),
                'plan': plan['Plan']
            }

        # Find best performing query
        best_query = min(results.values(), key=lambda x: x['total_cost'])

        return {
            'comparisons': results,
            'best_query': best_query['query'],
            'performance_gain': self._calculate_performance_gain(results)
        }

    def _calculate_performance_gain(self, results: dict) -> dict:
        """Calculate performance improvement between queries"""

        costs = [(name, data['total_cost']) for name, data in results.items()]
        costs.sort(key=lambda x: x[1])  # Sort by cost

        if len(costs) < 2:
            return {}

        best_cost = costs[0][1]
        worst_cost = costs[-1][1]

        if best_cost > 0:
            improvement = ((worst_cost - best_cost) / worst_cost) * 100
        else:
            improvement = 0

        return {
            'best_query': costs[0][0],
            'worst_query': costs[-1][0],
            'cost_reduction_percent': improvement,
            'cost_difference': worst_cost - best_cost
        }
```

## Query Execution Analysis

### Understanding Execution Plans

```python
class ExecutionPlanAnalyzer:
    """Detailed analysis of PostgreSQL execution plans"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def analyze_plan(self, plan: dict) -> dict:
        """Comprehensive plan analysis"""

        analysis = {
            'node_types': self._count_node_types(plan),
            'cost_breakdown': self._analyze_costs(plan),
            'bottlenecks': self._identify_bottlenecks(plan),
            'index_usage': self._analyze_index_usage(plan),
            'memory_usage': self._analyze_memory_usage(plan),
            'io_operations': self._analyze_io_operations(plan)
        }

        return analysis

    def _count_node_types(self, plan: dict) -> dict:
        """Count different node types in the plan"""

        node_counts = {}

        def count_nodes(node):
            node_type = node.get('Node Type', 'Unknown')
            node_counts[node_type] = node_counts.get(node_type, 0) + 1

            if 'Plans' in node:
                for subplan in node['Plans']:
                    count_nodes(subplan)

        count_nodes(plan)
        return node_counts

    def _analyze_costs(self, plan: dict) -> dict:
        """Analyze cost distribution in the plan"""

        costs = {'startup': 0, 'total': 0}

        def collect_costs(node):
            if 'Startup Cost' in node:
                costs['startup'] += node['Startup Cost']
            if 'Total Cost' in node:
                costs['total'] += node['Total Cost']

            if 'Plans' in node:
                for subplan in node['Plans']:
                    collect_costs(subplan)

        collect_costs(plan)

        return {
            'total_startup_cost': costs['startup'],
            'total_execution_cost': costs['total'],
            'cost_distribution': self._calculate_cost_distribution(plan)
        }

    def _calculate_cost_distribution(self, plan: dict) -> dict:
        """Calculate cost distribution by operation type"""

        distribution = {}

        def collect_by_type(node, path=""):
            node_type = node.get('Node Type', 'Unknown')
            total_cost = node.get('Total Cost', 0)

            key = f"{path}/{node_type}" if path else node_type
            distribution[key] = distribution.get(key, 0) + total_cost

            if 'Plans' in node:
                for i, subplan in enumerate(node['Plans']):
                    collect_by_type(subplan, f"{key}[{i}]")

        collect_by_type(plan)
        return distribution

    def _identify_bottlenecks(self, plan: dict) -> list:
        """Identify performance bottlenecks"""

        bottlenecks = []

        def check_node(node, path=""):
            node_type = node.get('Node Type', '')
            total_cost = node.get('Total Cost', 0)

            # Sequential scans on large tables
            if node_type == 'Seq Scan':
                actual_rows = node.get('Actual Rows', 0)
                if actual_rows > 10000:
                    bottlenecks.append({
                        'type': 'large_sequential_scan',
                        'node': path,
                        'rows': actual_rows,
                        'recommendation': 'Consider adding appropriate indexes'
                    })

            # Expensive sorts
            if node_type == 'Sort':
                sort_space = node.get('Sort Space Used', 0)
                if sort_space > 50 * 1024 * 1024:  # 50MB
                    bottlenecks.append({
                        'type': 'expensive_sort',
                        'node': path,
                        'space_used': sort_space,
                        'recommendation': 'Consider increasing work_mem or using indexes'
                    })

            # Nested loops with many iterations
            if node_type == 'Nested Loop':
                actual_loops = node.get('Actual Loops', 0)
                if actual_loops > 1000:
                    bottlenecks.append({
                        'type': 'expensive_nested_loop',
                        'node': path,
                        'iterations': actual_loops,
                        'recommendation': 'Consider different join strategy or indexes'
                    })

            if 'Plans' in node:
                for i, subplan in enumerate(node['Plans']):
                    check_node(subplan, f"{path}[{i}]" if path else str(i))

        check_node(plan)
        return bottlenecks

    def _analyze_index_usage(self, plan: dict) -> dict:
        """Analyze how indexes are being used"""

        index_usage = {
            'index_scans': 0,
            'bitmap_scans': 0,
            'sequential_scans': 0,
            'index_only_scans': 0
        }

        def analyze_indexes(node):
            node_type = node.get('Node Type', '')

            if node_type == 'Index Scan':
                index_usage['index_scans'] += 1
            elif node_type == 'Bitmap Heap Scan':
                index_usage['bitmap_scans'] += 1
            elif node_type == 'Seq Scan':
                index_usage['sequential_scans'] += 1
            elif node_type == 'Index Only Scan':
                index_usage['index_only_scans'] += 1

            if 'Plans' in node:
                for subplan in node['Plans']:
                    analyze_indexes(subplan)

        analyze_indexes(plan)

        return {
            'usage_stats': index_usage,
            'total_scans': sum(index_usage.values()),
            'index_scan_ratio': (index_usage['index_scans'] + index_usage['bitmap_scans'] +
                               index_usage['index_only_scans']) / max(sum(index_usage.values()), 1)
        }

    def _analyze_memory_usage(self, plan: dict) -> dict:
        """Analyze memory usage in the plan"""

        memory_stats = {
            'work_mem_used': 0,
            'temp_space_used': 0,
            'sort_space_used': 0,
            'hash_space_used': 0
        }

        def collect_memory(node):
            # Collect various memory metrics
            if 'Sort Space Used' in node:
                memory_stats['sort_space_used'] += node['Sort Space Used']
            if 'Temp Space Used' in node:
                memory_stats['temp_space_used'] += node['Temp Space Used']
            if 'Hash Space Used' in node:
                memory_stats['hash_space_used'] += node['Hash Space Used']

            if 'Plans' in node:
                for subplan in node['Plans']:
                    collect_memory(subplan)

        collect_memory(plan)

        return memory_stats

    def _analyze_io_operations(self, plan: dict) -> dict:
        """Analyze I/O operations"""

        io_stats = {
            'shared_hit_blocks': 0,
            'shared_read_blocks': 0,
            'local_hit_blocks': 0,
            'local_read_blocks': 0,
            'temp_read_blocks': 0,
            'temp_write_blocks': 0
        }

        def collect_io(node):
            # Collect buffer usage statistics
            if 'Shared Hit Blocks' in node:
                io_stats['shared_hit_blocks'] += node['Shared Hit Blocks']
            if 'Shared Read Blocks' in node:
                io_stats['shared_read_blocks'] += node['Shared Read Blocks']
            if 'Local Hit Blocks' in node:
                io_stats['local_hit_blocks'] += node['Local Hit Blocks']
            if 'Local Read Blocks' in node:
                io_stats['local_read_blocks'] += node['Local Read Blocks']
            if 'Temp Read Blocks' in node:
                io_stats['temp_read_blocks'] += node['Temp Read Blocks']
            if 'Temp Written Blocks' in node:
                io_stats['temp_write_blocks'] += node['Temp Written Blocks']

            if 'Plans' in node:
                for subplan in node['Plans']:
                    collect_io(subplan)

        collect_io(plan)

        # Calculate derived metrics
        total_reads = (io_stats['shared_read_blocks'] + io_stats['local_read_blocks'] +
                      io_stats['temp_read_blocks'])
        total_hits = (io_stats['shared_hit_blocks'] + io_stats['local_hit_blocks'])

        return {
            **io_stats,
            'total_reads': total_reads,
            'total_hits': total_hits,
            'cache_hit_ratio': total_hits / max(total_reads + total_hits, 1)
        }
```

## Query Optimization Techniques

### Index Optimization

```python
class IndexOptimizer:
    """Optimize indexes based on query analysis"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def analyze_missing_indexes(self, slow_queries: list) -> list:
        """Analyze slow queries and suggest missing indexes"""

        suggestions = []

        for query_info in slow_queries:
            query = query_info['query']
            plan = await self._explain_query(query)

            missing_indexes = self._identify_missing_indexes(plan, query)
            suggestions.extend(missing_indexes)

        # Remove duplicates
        unique_suggestions = []
        seen = set()

        for suggestion in suggestions:
            key = (suggestion['table'], tuple(suggestion['columns']))
            if key not in seen:
                unique_suggestions.append(suggestion)
                seen.add(key)

        return unique_suggestions

    def _identify_missing_indexes(self, plan: dict, query: str) -> list:
        """Identify where indexes might help"""

        suggestions = []

        # Look for sequential scans that might benefit from indexes
        if plan.get('Node Type') == 'Seq Scan':
            table = plan.get('Relation Name')
            filter_conditions = self._extract_filter_conditions(query)

            if table and filter_conditions:
                for condition in filter_conditions:
                    if condition['type'] == 'equality':
                        suggestions.append({
                            'table': table,
                            'type': 'btree',
                            'columns': [condition['column']],
                            'reason': 'Equality filter on sequential scan'
                        })
                    elif condition['type'] == 'range':
                        suggestions.append({
                            'table': table,
                            'type': 'btree',
                            'columns': [condition['column']],
                            'reason': 'Range filter on sequential scan'
                        })

        # Recursively check subplans
        if 'Plans' in plan:
            for subplan in plan['Plans']:
                suggestions.extend(self._identify_missing_indexes(subplan, query))

        return suggestions

    def _extract_filter_conditions(self, query: str) -> list:
        """Extract filter conditions from SQL query (simplified)"""

        conditions = []
        query_lower = query.lower()

        # Look for WHERE clause
        where_pos = query_lower.find('where')
        if where_pos == -1:
            return conditions

        where_clause = query[where_pos + 5:].strip()

        # Simple pattern matching for conditions
        # This is a simplified implementation
        import re

        # Match column = value or column > value patterns
        patterns = [
            (r'(\w+)\s*=\s*[^=]', 'equality'),
            (r'(\w+)\s*>\s*\w+', 'range'),
            (r'(\w+)\s*<\s*\w+', 'range'),
            (r'(\w+)\s*>=\s*\w+', 'range'),
            (r'(\w+)\s*<=\s*\w+', 'range'),
        ]

        for pattern, cond_type in patterns:
            matches = re.findall(pattern, where_clause)
            for match in matches:
                conditions.append({
                    'column': match.strip(),
                    'type': cond_type
                })

        return conditions

    async def generate_index_ddl(self, suggestions: list) -> list:
        """Generate DDL statements for suggested indexes"""

        ddl_statements = []

        for suggestion in suggestions:
            table = suggestion['table']
            columns = suggestion['columns']
            index_type = suggestion['type']

            # Generate index name
            col_str = '_'.join(columns)
            index_name = f"idx_{table}_{col_str}"

            if index_type == 'btree':
                ddl = f"CREATE INDEX {index_name} ON {table} ({', '.join(columns)});"
            elif index_type == 'hash':
                ddl = f"CREATE INDEX {index_name} ON {table} USING hash ({', '.join(columns)});"
            else:
                ddl = f"CREATE INDEX {index_name} ON {table} ({', '.join(columns)});"

            ddl_statements.append({
                'ddl': ddl,
                'table': table,
                'columns': columns,
                'reason': suggestion.get('reason', 'Performance optimization')
            })

        return ddl_statements

    async def _explain_query(self, query: str) -> dict:
        """Get EXPLAIN plan for a query"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchval(f"EXPLAIN (FORMAT JSON, ANALYZE) {query}")
            return json.loads(result)[0]['Plan']
```

### Query Rewriting Techniques

```python
class QueryRewriter:
    """Rewrite queries for better performance"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def suggest_query_rewrites(self, slow_queries: list) -> list:
        """Suggest query rewrites for slow queries"""

        suggestions = []

        for query_info in slow_queries:
            query = query_info['query']
            original_plan = await self._explain_query(query)

            # Try different rewrite strategies
            rewrites = self._generate_rewrite_candidates(query)

            for rewrite in rewrites:
                rewrite_plan = await self._explain_query(rewrite['query'])

                improvement = self._calculate_improvement(original_plan, rewrite_plan)

                if improvement > 0.1:  # 10% improvement
                    suggestions.append({
                        'original_query': query,
                        'rewritten_query': rewrite['query'],
                        'improvement_percent': improvement * 100,
                        'rewrite_type': rewrite['type'],
                        'reason': rewrite['reason']
                    })

        return suggestions

    def _generate_rewrite_candidates(self, query: str) -> list:
        """Generate potential query rewrites"""

        rewrites = []

        # Strategy 1: Use EXISTS instead of IN for subqueries
        if 'IN (' in query.upper() and 'SELECT' in query.upper():
            rewritten = self._rewrite_in_to_exists(query)
            if rewritten != query:
                rewrites.append({
                    'query': rewritten,
                    'type': 'IN to EXISTS',
                    'reason': 'EXISTS often performs better than IN for subqueries'
                })

        # Strategy 2: Use UNION ALL instead of UNION where appropriate
        if 'UNION ' in query.upper() and 'DISTINCT' not in query.upper():
            rewritten = query.replace('UNION', 'UNION ALL')
            rewrites.append({
                'query': rewritten,
                'type': 'UNION to UNION ALL',
                'reason': 'UNION ALL avoids duplicate elimination overhead'
            })

        # Strategy 3: Use LIMIT in subqueries
        if 'IN (' in query.upper() and 'ORDER BY' in query.upper():
            rewritten = self._add_limit_to_subquery(query)
            if rewritten != query:
                rewrites.append({
                    'query': rewritten,
                    'type': 'Limit Subquery',
                    'reason': 'Limit subquery results when only checking existence'
                })

        # Strategy 4: Avoid SELECT *
        if 'SELECT *' in query.upper():
            # This is just a suggestion, not an automatic rewrite
            rewrites.append({
                'query': query.replace('SELECT *', 'SELECT [specify columns]'),
                'type': 'Avoid SELECT *',
                'reason': 'Specify only needed columns to reduce I/O'
            })

        return rewrites

    def _rewrite_in_to_exists(self, query: str) -> str:
        """Rewrite IN subquery to EXISTS"""
        # This is a simplified implementation
        # Real implementation would need proper SQL parsing

        # Look for patterns like: column IN (SELECT ...)
        import re

        pattern = r'(\w+)\s+IN\s*\(\s*SELECT\s+(.+?)\s+FROM\s+(.+?)\s+WHERE\s+(.+?)\)'
        match = re.search(pattern, query, re.IGNORECASE | re.DOTALL)

        if match:
            column, select_cols, from_table, where_clause = match.groups()

            # Create EXISTS version
            exists_query = f"EXISTS (SELECT 1 FROM {from_table} WHERE {where_clause} AND {from_table}.id = {column})"

            rewritten = query.replace(match.group(0), exists_query)
            return rewritten

        return query

    def _add_limit_to_subquery(self, query: str) -> str:
        """Add LIMIT 1 to subqueries used for existence checks"""
        # Simplified implementation
        if 'EXISTS' in query.upper():
            return query

        # Look for IN subqueries
        import re

        # Add LIMIT 1 to subqueries (simplified)
        pattern = r'(\(\s*SELECT\s+.+?\s+FROM\s+.+?\s*\))'
        match = re.search(pattern, query, re.IGNORECASE | re.DOTALL)

        if match:
            subquery = match.group(1)
            if 'LIMIT' not in subquery.upper():
                # Add LIMIT 1
                if 'ORDER BY' in subquery.upper():
                    # Insert before ORDER BY
                    limit_subquery = re.sub(r'(\s+ORDER BY\s+.+)', r' LIMIT 1\1', subquery, flags=re.IGNORECASE)
                else:
                    # Add at the end
                    limit_subquery = subquery.rstrip() + ' LIMIT 1'

                rewritten = query.replace(subquery, limit_subquery)
                return rewritten

        return query

    async def _explain_query(self, query: str) -> dict:
        """Get EXPLAIN plan for a query"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchval(f"EXPLAIN (FORMAT JSON, ANALYZE) {query}")
            return json.loads(result)[0]

    def _calculate_improvement(self, original_plan: dict, rewrite_plan: dict) -> float:
        """Calculate performance improvement"""

        original_cost = original_plan.get('Total Cost', 0)
        rewrite_cost = rewrite_plan.get('Total Cost', 0)

        if original_cost == 0:
            return 0

        improvement = (original_cost - rewrite_cost) / original_cost
        return max(0, improvement)  # Ensure non-negative
```

## Performance Monitoring and Alerting

### Slow Query Monitoring

```python
class SlowQueryMonitor:
    """Monitor and analyze slow queries"""

    def __init__(self, pool: asyncpg.Pool, slow_query_threshold: float = 1.0):
        self.pool = pool
        self.threshold = slow_query_threshold
        self.slow_queries = []

    async def enable_query_logging(self):
        """Enable PostgreSQL query logging"""

        async with self.pool.acquire() as conn:
            # Set logging parameters
            await conn.execute("SET log_statement = 'all'")
            await conn.execute("SET log_duration = on")
            await conn.execute(f"SET log_min_duration_statement = {int(self.threshold * 1000)}")  # milliseconds

            # Enable auto-explain for slow queries
            await conn.execute("LOAD 'auto_explain'")
            await conn.execute("SET auto_explain.log_min_duration = 1000")
            await conn.execute("SET auto_explain.log_analyze = true")
            await conn.execute("SET auto_explain.log_verbose = true")

    async def capture_slow_queries(self, duration_hours: int = 1) -> list:
        """Capture slow queries from PostgreSQL logs"""

        # This would typically parse PostgreSQL log files
        # For demonstration, we'll query pg_stat_statements

        async with self.pool.acquire() as conn:
            # Get slow queries from pg_stat_statements
            slow_queries = await conn.fetch("""
                SELECT query, calls, total_time, mean_time, rows
                FROM pg_stat_statements
                WHERE mean_time > $1
                ORDER BY mean_time DESC
                LIMIT 20
            """, self.threshold * 1000)

            return [dict(row) for row in slow_queries]

    async def analyze_slow_queries(self) -> dict:
        """Analyze captured slow queries"""

        queries = await self.capture_slow_queries()

        analysis = {
            'total_slow_queries': len(queries),
            'queries': []
        }

        analyzer = QueryAnalyzer(self.pool)

        for query_info in queries:
            plan = await analyzer.explain_query(query_info['query'], analyze=False)

            query_analysis = {
                'query': query_info['query'],
                'calls': query_info['calls'],
                'mean_time': query_info['mean_time'],
                'total_time': query_info['total_time'],
                'plan_cost': plan.get('Total Cost', 0) if plan else 0,
                'issues': analyzer._identify_performance_issues(plan) if plan else []
            }

            analysis['queries'].append(query_analysis)

        return analysis

    async def generate_optimization_report(self) -> dict:
        """Generate comprehensive optimization report"""

        slow_query_analysis = await self.analyze_slow_queries()

        # Additional analysis
        index_optimizer = IndexOptimizer(self.pool)
        query_rewriter = QueryRewriter(self.pool)

        missing_indexes = await index_optimizer.analyze_missing_indexes(
            slow_query_analysis['queries']
        )

        rewrite_suggestions = await query_rewriter.suggest_query_rewrites(
            slow_query_analysis['queries']
        )

        return {
            'slow_queries': slow_query_analysis,
            'missing_indexes': missing_indexes,
            'rewrite_suggestions': rewrite_suggestions,
            'generated_at': datetime.now().isoformat()
        }
```

## Hands-on Exercises

### Exercise 1: Basic EXPLAIN Analysis
1. Use EXPLAIN to analyze simple SELECT queries
2. Compare estimated vs actual row counts
3. Identify sequential scans on indexed columns
4. Measure query execution times

### Exercise 2: Index Optimization
1. Create test tables with sample data
2. Analyze queries without indexes
3. Add appropriate indexes and measure improvement
4. Compare different index types (btree, hash, gin)

### Exercise 3: Query Rewriting
1. Identify slow queries in your application
2. Rewrite using EXISTS instead of IN
3. Replace UNION with UNION ALL where appropriate
4. Measure performance improvements

## Next Steps
- [Indexing Strategies Tutorial](../tutorials/03-indexing-strategies.md)
- [Workshop: Query Profiling Lab](../workshops/workshop-02-query-profiling.md)

## Additional Resources
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Query Optimization Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)

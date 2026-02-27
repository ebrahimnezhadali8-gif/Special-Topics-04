# Tutorial 01: ETL Pipeline Design and Architecture

## Overview
This tutorial covers the fundamental concepts of ETL (Extract, Transform, Load) pipeline design. You'll learn about ETL architecture patterns, data flow principles, error handling strategies, and best practices for building robust data pipelines that connect web scraping with database storage and API exposure.

## What is ETL?

ETL stands for **Extract, Transform, Load** - a data integration process that combines data from multiple sources into a single, consistent data store.

### ETL Components

#### 1. Extract (E)
- **Purpose**: Pull data from various sources
- **Sources**: Web pages, APIs, databases, files, streams
- **Challenges**: Rate limiting, authentication, data formats, error handling

#### 2. Transform (T)
- **Purpose**: Clean, normalize, and enrich data
- **Operations**: Validation, deduplication, format conversion, business logic
- **Challenges**: Data quality, schema evolution, performance

#### 3. Load (L)
- **Purpose**: Store processed data in target system
- **Targets**: Databases, data warehouses, search engines, APIs
- **Challenges**: Concurrency, transactions, indexing, rollback

## ETL Pipeline Architecture Patterns

### 1. Simple Linear Pipeline

```
Source → Extract → Transform → Load → Destination
```

**Characteristics:**
- Straightforward data flow
- Easy to understand and debug
- Limited scalability
- Single point of failure

**Use cases:**
- Small datasets
- Simple transformations
- Development/testing environments

### 2. Batch Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Sources   │───►│   Staging   │───►│Processing  │
│             │    │   Area      │    │ Engine     │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
┌─────────────┐    ┌─────────────┐         ▼
│   Quality   │◄───┤   Loading   │    ┌─────────────┐
│   Checks    │    │   Engine    │    │Destination │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Characteristics:**
- Processes data in batches
- Better resource utilization
- Handles large volumes
- Checkpoint recovery possible

### 3. Streaming Pipeline

```
┌─────────────┐
│   Sources   │
│ (Streams)   │
└─────┬───────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│ Stream      │───►│   Buffer    │───►│Processing  │
│ Processing  │    │   Queue     │    │ Engine     │
└─────┬───────┘    └─────────────┘    └─────────────┘
      │                                        │
┌─────▼───────┐    ┌─────────────┐             ▼
│ Error       │    │   Loading   │    ┌─────────────┐
│ Handling    │◄───┤   Engine    │    │Destination │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Characteristics:**
- Real-time processing
- Low latency
- Continuous data flow
- Complex error handling

### 4. Lambda Architecture Pipeline

```
┌─────────────┐    ┌─────────────┐
│   Sources   │───►│ Speed Layer │  (Real-time)
│             │    │ (Streaming) │
└─────────────┘    └─────┬───────┘
                         │
┌─────────────┐    ┌─────▼───────┐
│ Batch Layer │───►│ Serving    │
│ (Hadoop)    │    │ Layer      │
└─────────────┘    └─────────────┘
```

**Characteristics:**
- Combines batch and real-time processing
- Handles both historical and live data
- Complex to implement
- High reliability

## ETL Pipeline Design Principles

### 1. Idempotency
- **Definition**: Operations can be repeated without side effects
- **Importance**: Ensures pipeline reliability and restartability
- **Implementation**: Use UPSERT operations, check existing data

```python
def load_data_idempotent(data, db_session):
    """Idempotent data loading"""
    for item in data:
        # Use UPSERT pattern
        existing = db_session.query(Model).filter_by(unique_key=item['key']).first()
        if existing:
            # Update existing record
            for key, value in item.items():
                setattr(existing, key, value)
        else:
            # Create new record
            new_record = Model(**item)
            db_session.add(new_record)

    db_session.commit()
```

### 2. Fault Tolerance
- **Definition**: System continues operating despite failures
- **Strategies**:
  - Circuit breakers
  - Retry mechanisms
  - Dead letter queues
  - Graceful degradation

```python
class FaultTolerantETL:
    def __init__(self, max_retries=3):
        self.max_retries = max_retries
        self.circuit_breaker = CircuitBreaker()

    def process_with_retry(self, data):
        """Process data with retry logic"""
        for attempt in range(self.max_retries):
            try:
                if self.circuit_breaker.is_open():
                    raise CircuitBreakerOpenError()

                return self._process_batch(data)

            except TemporaryError as e:
                if attempt == self.max_retries - 1:
                    self._handle_permanent_failure(data, e)
                    break
                self._wait_before_retry(attempt)

            except PermanentError as e:
                self._handle_permanent_failure(data, e)
                break

        self.circuit_breaker.record_failure()
```

### 3. Scalability
- **Horizontal scaling**: Add more processing nodes
- **Vertical scaling**: Increase resources per node
- **Partitioning**: Split data across multiple workers
- **Load balancing**: Distribute work evenly

```python
class ScalableETL:
    def __init__(self, num_workers=4):
        self.num_workers = num_workers
        self.work_queue = multiprocessing.Queue()
        self.result_queue = multiprocessing.Queue()

    def process_distributed(self, data):
        """Process data across multiple workers"""
        # Split data into chunks
        chunks = self._split_data(data, self.num_workers)

        # Start worker processes
        processes = []
        for i in range(self.num_workers):
            p = multiprocessing.Process(
                target=self._worker_process,
                args=(chunks[i], self.work_queue, self.result_queue)
            )
            p.start()
            processes.append(p)

        # Collect results
        results = []
        for _ in processes:
            result = self.result_queue.get()
            results.extend(result)

        # Wait for all processes to complete
        for p in processes:
            p.join()

        return results
```

### 4. Monitoring and Observability
- **Metrics**: Processing rates, error rates, latency
- **Logging**: Structured logs with correlation IDs
- **Tracing**: End-to-end request tracing
- **Health checks**: System and component health

```python
class MonitoredETL:
    def __init__(self):
        self.metrics = {
            'records_processed': 0,
            'errors_count': 0,
            'processing_time': 0,
            'last_success_time': None
        }
        self.logger = logging.getLogger(__name__)

    def process_with_monitoring(self, data):
        """Process data with monitoring"""
        start_time = time.time()
        correlation_id = str(uuid.uuid4())

        self.logger.info(f"Starting ETL batch {correlation_id}, size: {len(data)}")

        try:
            result = self._process_data(data)

            # Update metrics
            processing_time = time.time() - start_time
            self.metrics['records_processed'] += len(data)
            self.metrics['processing_time'] += processing_time
            self.metrics['last_success_time'] = datetime.now()

            self.logger.info(
                f"ETL batch {correlation_id} completed successfully. "
                f"Processed: {len(data)}, Time: {processing_time:.2f}s"
            )

            return result

        except Exception as e:
            self.metrics['errors_count'] += 1
            self.logger.error(
                f"ETL batch {correlation_id} failed: {str(e)}",
                exc_info=True
            )
            raise
```

## Data Flow Patterns

### 1. Push vs Pull Patterns

#### Push Pattern
```python
class PushETL:
    def __init__(self):
        self.subscribers = []

    def subscribe(self, callback):
        """Subscribe to data updates"""
        self.subscribers.append(callback)

    def process_and_push(self, data):
        """Process data and push to subscribers"""
        processed_data = self._transform(data)

        for subscriber in self.subscribers:
            try:
                subscriber(processed_data)
            except Exception as e:
                self.logger.error(f"Subscriber error: {e}")
```

#### Pull Pattern
```python
class PullETL:
    def __init__(self):
        self.data_store = {}

    def store_processed_data(self, data):
        """Store processed data for later retrieval"""
        batch_id = str(uuid.uuid4())
        self.data_store[batch_id] = self._transform(data)
        return batch_id

    def retrieve_data(self, batch_id):
        """Retrieve processed data"""
        return self.data_store.get(batch_id)
```

### 2. Pipeline Stages

#### Stage-Based Processing
```python
class PipelineETL:
    def __init__(self):
        self.stages = []

    def add_stage(self, stage_func):
        """Add a processing stage to the pipeline"""
        self.stages.append(stage_func)

    def process_through_pipeline(self, data):
        """Process data through all pipeline stages"""
        current_data = data

        for stage in self.stages:
            try:
                current_data = stage(current_data)
                self._validate_stage_output(current_data)
            except Exception as e:
                self._handle_stage_error(stage, current_data, e)
                raise

        return current_data

    def _validate_stage_output(self, data):
        """Validate output from each stage"""
        if not isinstance(data, (list, dict)):
            raise ValueError("Stage output must be list or dict")

    def _handle_stage_error(self, stage, data, error):
        """Handle errors in pipeline stages"""
        self.logger.error(f"Pipeline stage {stage.__name__} failed: {error}")
        # Could implement stage-specific error recovery here
```

### 3. State Management

#### Stateless Processing
```python
class StatelessETL:
    def process(self, data):
        """Process data without maintaining state"""
        # Each batch is processed independently
        return self._transform(data)
```

#### Stateful Processing
```python
class StatefulETL:
    def __init__(self):
        self.processed_ids = set()  # Track processed items
        self.batch_counters = {}    # Track batch statistics

    def process_with_state(self, data, batch_id):
        """Process data while maintaining state"""
        # Deduplication
        unique_data = [item for item in data if item['id'] not in self.processed_ids]

        # Process unique items
        processed_data = self._transform(unique_data)

        # Update state
        for item in processed_data:
            self.processed_ids.add(item['id'])

        # Update batch counters
        self.batch_counters[batch_id] = len(processed_data)

        return processed_data
```

## Error Handling Strategies

### 1. Circuit Breaker Pattern
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def is_open(self):
        """Check if circuit breaker is open"""
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = 'HALF_OPEN'
                return False
            return True
        return False

    def record_success(self):
        """Record successful operation"""
        if self.state == 'HALF_OPEN':
            self.state = 'CLOSED'
            self.failure_count = 0

    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
```

### 2. Dead Letter Queue
```python
class DeadLetterQueue:
    def __init__(self, max_retries=3):
        self.queue = []
        self.max_retries = max_retries

    def add_failed_item(self, item, error, retry_count=0):
        """Add failed item to dead letter queue"""
        if retry_count < self.max_retries:
            # Schedule for retry
            self._schedule_retry(item, retry_count + 1)
        else:
            # Add to dead letter queue
            self.queue.append({
                'item': item,
                'error': str(error),
                'timestamp': datetime.now(),
                'retry_count': retry_count
            })

    def process_dead_letters(self):
        """Process items in dead letter queue"""
        # Could implement manual review, reprocessing, or notifications
        for item in self.queue:
            self.logger.warning(f"Dead letter item: {item}")

    def _schedule_retry(self, item, retry_count):
        """Schedule item for retry"""
        # Implement exponential backoff
        delay = 2 ** retry_count
        # Schedule retry with delay
        self._retry_after_delay(item, delay, retry_count)
```

### 3. Graceful Degradation
```python
class GracefulETL:
    def __init__(self):
        self.full_mode = True
        self.fallback_mode = False

    def process_with_graceful_degradation(self, data):
        """Process data with graceful degradation"""
        try:
            if self.full_mode:
                return self._full_processing(data)
            else:
                return self._degraded_processing(data)

        except Exception as e:
            if not self.fallback_mode:
                self.logger.warning(f"Switching to degraded mode: {e}")
                self.full_mode = False
                self.fallback_mode = True
                return self._degraded_processing(data)
            else:
                # Already in fallback mode, raise error
                raise

    def _full_processing(self, data):
        """Full processing with all features"""
        # Complex transformations, validations, enrichments
        return self._transform_full(data)

    def _degraded_processing(self, data):
        """Simplified processing for degraded mode"""
        # Basic transformations only
        return self._transform_basic(data)
```

## Performance Optimization

### 1. Batch Processing
```python
class BatchOptimizedETL:
    def __init__(self, batch_size=1000):
        self.batch_size = batch_size

    def process_in_batches(self, data):
        """Process data in optimized batches"""
        results = []

        for i in range(0, len(data), self.batch_size):
            batch = data[i:i + self.batch_size]

            # Process batch
            batch_result = self._process_batch_optimized(batch)
            results.extend(batch_result)

            # Yield control to prevent blocking
            if i % (self.batch_size * 10) == 0:
                time.sleep(0.01)

        return results

    def _process_batch_optimized(self, batch):
        """Optimized batch processing"""
        # Use bulk operations, minimize database calls
        # Pre-compile transformations, cache lookups
        return self._bulk_transform(batch)
```

### 2. Parallel Processing
```python
import concurrent.futures

class ParallelETL:
    def __init__(self, max_workers=4):
        self.max_workers = max_workers

    def process_parallel(self, data):
        """Process data in parallel"""
        # Split data into chunks
        chunk_size = len(data) // self.max_workers
        chunks = [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit tasks
            futures = [
                executor.submit(self._process_chunk, chunk)
                for chunk in chunks
            ]

            # Collect results
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    results.extend(result)
                except Exception as e:
                    self.logger.error(f"Parallel processing error: {e}")

            return results

    def _process_chunk(self, chunk):
        """Process a chunk of data"""
        return [self._transform_item(item) for item in chunk]
```

## Monitoring and Alerting

### 1. Metrics Collection
```python
from prometheus_client import Counter, Histogram, Gauge

class ETLMetrics:
    def __init__(self):
        self.records_processed = Counter(
            'etl_records_processed_total',
            'Total number of records processed',
            ['pipeline', 'stage']
        )

        self.processing_time = Histogram(
            'etl_processing_duration_seconds',
            'Time spent processing records',
            ['pipeline', 'stage']
        )

        self.errors_total = Counter(
            'etl_errors_total',
            'Total number of errors',
            ['pipeline', 'stage', 'error_type']
        )

        self.active_batches = Gauge(
            'etl_active_batches',
            'Number of currently active batches',
            ['pipeline']
        )
```

### 2. Structured Logging
```python
import structlog

class StructuredETLLogger:
    def __init__(self):
        self.logger = structlog.get_logger()

    def log_batch_start(self, batch_id, size):
        """Log batch processing start"""
        self.logger.info(
            "batch_started",
            batch_id=batch_id,
            size=size,
            timestamp=datetime.now().isoformat()
        )

    def log_batch_complete(self, batch_id, processed_count, duration):
        """Log batch processing completion"""
        self.logger.info(
            "batch_completed",
            batch_id=batch_id,
            processed_count=processed_count,
            duration=duration,
            throughput=processed_count / duration if duration > 0 else 0
        )

    def log_error(self, batch_id, error, stage):
        """Log processing error"""
        self.logger.error(
            "processing_error",
            batch_id=batch_id,
            error=str(error),
            stage=stage,
            timestamp=datetime.now().isoformat()
        )
```

## Best Practices

### 1. Design Principles
- **Single Responsibility**: Each component has one job
- **Dependency Injection**: Loose coupling between components
- **Configuration Management**: Externalize configuration
- **Testing**: Comprehensive test coverage

### 2. Operational Excellence
- **Health Checks**: Implement readiness/liveness probes
- **Graceful Shutdown**: Handle termination signals properly
- **Resource Limits**: Set appropriate memory/CPU limits
- **Auto-scaling**: Scale based on load metrics

### 3. Data Quality
- **Validation**: Validate data at each stage
- **Auditing**: Track data lineage and changes
- **Backup**: Regular data backups and recovery testing
- **Monitoring**: Continuous data quality monitoring

## Hands-on Exercises

### Exercise 1: Basic ETL Pipeline
1. Create a simple ETL class with extract, transform, load methods
2. Implement basic error handling and logging
3. Add metrics collection
4. Test with sample data

### Exercise 2: Fault-Tolerant Pipeline
1. Add retry logic with exponential backoff
2. Implement circuit breaker pattern
3. Create dead letter queue for failed items
4. Test failure scenarios

### Exercise 3: Scalable Pipeline
1. Implement parallel processing
2. Add batch processing optimization
3. Create load balancing for multiple workers
4. Monitor performance improvements

## Next Steps
- [Crawlee Integration Tutorial](../tutorials/02-crawlee-integration.md)
- [Workshop: Crawlee ETL Pipeline](../workshops/workshop-01-crawlee-etl.md)

## Additional Resources
- [ETL Best Practices](https://martinfowler.com/articles/evodb.html)
- [Data Pipeline Patterns](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
- [Monitoring Microservices](https://microservices.io/patterns/observability/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

# Workshop 05: Advanced Streaming gRPC Application

## Duration: 180-240 minutes

## Overview
Build a complete real-time data processing application using gRPC streaming. Implement server streaming for live data feeds, client streaming for batch uploads, and bidirectional streaming for real-time collaboration. Learn advanced patterns for error handling, flow control, and performance optimization.

## Prerequisites
- Completed Workshops 1-4
- Understanding of gRPC basics, protobuf, and streaming concepts
- Python 3.8+ with grpcio installed
- Basic understanding of async programming

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement complex streaming gRPC services
- Handle bidirectional streaming for real-time features
- Manage streaming flow control and backpressure
- Implement streaming error handling and recovery
- Build real-time data processing pipelines
- Optimize streaming performance
- Deploy and monitor streaming applications

---

## Part 1: Project Architecture and Setup

### Application Overview
We'll build a **Real-Time Analytics Platform** with:

- **Data Ingestion Service**: Client streaming for batch data uploads
- **Live Dashboard Service**: Server streaming for real-time metrics
- **Collaboration Service**: Bidirectional streaming for live collaboration
- **Alert System**: Server streaming for real-time notifications

### Project Structure
```bash
streaming-analytics/
├── proto/
│   ├── analytics.proto       # Main protobuf definitions
│   ├── generated/           # Generated Python code
│   └── __init__.py
├── services/
│   ├── ingestion_service.py  # Client streaming service
│   ├── dashboard_service.py  # Server streaming service
│   ├── collaboration_service.py # Bidirectional streaming
│   └── alert_service.py     # Notification streaming
├── clients/
│   ├── data_ingestor.py     # Client streaming client
│   ├── dashboard_client.py  # Server streaming client
│   ├── collab_client.py     # Bidirectional client
│   └── alert_client.py      # Alert subscriber
├── utils/
│   ├── metrics.py          # Metrics collection
│   ├── logger.py           # Structured logging
│   └── config.py           # Configuration management
├── tests/
│   ├── test_ingestion.py
│   ├── test_dashboard.py
│   ├── test_collaboration.py
│   └── test_alerts.py
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── requirements.txt
```

### Dependencies
```txt
# requirements.txt
grpcio==1.59.0
grpcio-tools==1.59.0
protobuf==4.24.3
asyncio-mqtt==0.13.1
redis==5.0.1
prometheus-client==0.17.1
structlog==23.2.0
pydantic==2.4.2
uvloop==0.17.0
aiofiles==23.2.1
numpy==1.24.3
pandas==2.0.3
pytest==7.4.3
pytest-asyncio==0.21.1
```

### Protobuf Definitions
```protobuf
// proto/analytics.proto
syntax = "proto3";

package analytics;
option python_package = "proto.generated";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// Data structures
message DataPoint {
  string id = 1;
  string metric_name = 2;
  double value = 3;
  map<string, string> tags = 4;
  google.protobuf.Timestamp timestamp = 5;
}

message BatchData {
  repeated DataPoint points = 1;
  string batch_id = 2;
  string source = 3;
}

message MetricValue {
  string name = 1;
  double value = 2;
  google.protobuf.Timestamp timestamp = 3;
}

message DashboardData {
  repeated MetricValue metrics = 1;
  string dashboard_id = 2;
  int32 update_interval_ms = 3;
}

message CollaborationMessage {
  string user_id = 1;
  string message = 2;
  google.protobuf.Timestamp timestamp = 3;
  string message_type = 4; // "chat", "action", "update"
  map<string, string> metadata = 5;
}

message Alert {
  string id = 1;
  string title = 2;
  string description = 3;
  string severity = 4; // "low", "medium", "high", "critical"
  google.protobuf.Timestamp created_at = 5;
  map<string, string> context = 6;
}

// Service definitions

// 1. Data Ingestion Service (Client Streaming)
service DataIngestion {
  rpc UploadData(stream BatchData) returns (UploadResponse);
}

message UploadResponse {
  string batch_id = 1;
  int32 points_processed = 2;
  int32 points_failed = 3;
  repeated string errors = 4;
}

// 2. Dashboard Service (Server Streaming)
service Dashboard {
  rpc SubscribeMetrics(MetricSubscription) returns (stream DashboardData);
}

message MetricSubscription {
  repeated string metric_names = 1;
  int32 update_interval_ms = 2;
  map<string, string> filters = 3;
}

// 3. Collaboration Service (Bidirectional Streaming)
service Collaboration {
  rpc JoinSession(SessionRequest) returns (stream CollaborationMessage);
}

message SessionRequest {
  string session_id = 1;
  string user_id = 2;
  string user_name = 3;
}

// 4. Alert Service (Server Streaming)
service Alerts {
  rpc SubscribeAlerts(AlertSubscription) returns (stream Alert);
}

message AlertSubscription {
  repeated string severities = 1;
  repeated string sources = 2;
  bool include_acknowledged = 3;
}
```

---

## Part 2: Client Streaming - Data Ingestion Service

### Service Implementation
```python
# services/ingestion_service.py
import asyncio
import uuid
from typing import AsyncGenerator, List
from concurrent import futures
import grpc
from prometheus_client import Counter, Histogram

from proto.generated.analytics_pb2 import (
    BatchData, UploadResponse, DataPoint
)
from proto.generated.analytics_pb2_grpc import (
    DataIngestionServicer, add_DataIngestionServicer_to_server
)
from utils.metrics import ingestion_counter, ingestion_duration
from utils.logger import get_logger

logger = get_logger(__name__)

class DataIngestionService(DataIngestionServicer):
    def __init__(self, data_processor):
        self.data_processor = data_processor
        self.max_batch_size = 10000  # Max points per batch
        self.max_concurrent_batches = 10

    @ingestion_duration.time()
    async def UploadData(self, request_iterator, context):
        """
        Client streaming RPC for batch data upload
        """
        batch_id = str(uuid.uuid4())
        logger.info(f"Starting batch upload", batch_id=batch_id)

        points_processed = 0
        points_failed = 0
        errors = []
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)

        async def process_batch(batch_data: BatchData) -> tuple[int, int, List[str]]:
            """Process a single batch"""
            async with semaphore:
                try:
                    batch_points = len(batch_data.points)
                    logger.debug(f"Processing batch {batch_data.batch_id}",
                               points=batch_points, source=batch_data.source)

                    # Validate batch
                    if batch_points > self.max_batch_size:
                        raise ValueError(f"Batch too large: {batch_points} > {self.max_batch_size}")

                    # Process points
                    success_count, fail_count, batch_errors = await self.data_processor.process_batch(
                        batch_data.points, batch_data.source
                    )

                    return success_count, fail_count, batch_errors

                except Exception as e:
                    logger.error(f"Batch processing failed: {e}")
                    return 0, len(batch_data.points), [str(e)]

        # Process all batches concurrently
        tasks = []
        async for batch_data in request_iterator:
            if context.is_active():
                task = asyncio.create_task(process_batch(batch_data))
                tasks.append(task)
            else:
                logger.warning("Context cancelled during streaming")
                break

        # Wait for all processing to complete
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    points_failed += 1  # Assume 1 point failed per exception
                    errors.append(str(result))
                else:
                    batch_success, batch_failed, batch_errors = result
                    points_processed += batch_success
                    points_failed += batch_failed
                    errors.extend(batch_errors)

        # Update metrics
        ingestion_counter.labels(status="success").inc(points_processed)
        ingestion_counter.labels(status="failed").inc(points_failed)

        logger.info(f"Batch upload completed",
                   batch_id=batch_id,
                   processed=points_processed,
                   failed=points_failed)

        return UploadResponse(
            batch_id=batch_id,
            points_processed=points_processed,
            points_failed=points_failed,
            errors=errors[:10]  # Limit error messages
        )
```

### Data Processor Implementation
```python
# utils/data_processor.py
import asyncio
import aiofiles
from typing import List, Tuple
import json
from datetime import datetime
import redis.asyncio as redis

from proto.generated.analytics_pb2 import DataPoint
from utils.logger import get_logger

logger = get_logger(__name__)

class DataProcessor:
    def __init__(self, redis_client: redis.Redis, storage_path: str = "./data"):
        self.redis = redis_client
        self.storage_path = storage_path
        self.batch_size = 1000

    async def process_batch(self, points: List[DataPoint], source: str) -> Tuple[int, int, List[str]]:
        """
        Process a batch of data points
        Returns: (success_count, fail_count, errors)
        """
        success_count = 0
        fail_count = 0
        errors = []

        # Group points by metric for batch processing
        metric_batches = {}
        for point in points:
            if point.metric_name not in metric_batches:
                metric_batches[point.metric_name] = []
            metric_batches[point.metric_name].append(point)

        # Process each metric batch
        for metric_name, metric_points in metric_batches.items():
            try:
                batch_success, batch_errors = await self._process_metric_batch(
                    metric_name, metric_points, source
                )
                success_count += batch_success
                if batch_errors:
                    fail_count += len(batch_errors)
                    errors.extend(batch_errors)

            except Exception as e:
                logger.error(f"Failed to process metric {metric_name}: {e}")
                fail_count += len(metric_points)
                errors.append(f"Metric {metric_name}: {str(e)}")

        return success_count, fail_count, errors

    async def _process_metric_batch(self, metric_name: str, points: List[DataPoint],
                                   source: str) -> Tuple[int, List[str]]:
        """Process points for a specific metric"""
        errors = []

        # Store in Redis for real-time access
        pipeline = self.redis.pipeline()
        for point in points:
            key = f"metric:{metric_name}:{source}"
            timestamp = point.timestamp.ToDatetime()

            # Store latest value
            pipeline.set(key, point.value)

            # Add to time series
            ts_key = f"ts:{metric_name}:{source}"
            pipeline.zadd(ts_key, {str(timestamp.timestamp()): point.value})

            # Set expiry (keep 24 hours of data)
            pipeline.expire(ts_key, 86400)

        await pipeline.execute()

        # Write to file storage for persistence
        try:
            await self._write_to_file(metric_name, points, source)
        except Exception as e:
            errors.append(f"File storage failed: {str(e)}")

        # Validate data quality
        validation_errors = await self._validate_data(points)
        errors.extend(validation_errors)

        return len(points) - len(validation_errors), errors

    async def _write_to_file(self, metric_name: str, points: List[DataPoint], source: str):
        """Write data to persistent file storage"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"{self.storage_path}/{metric_name}/{source}/{date_str}.jsonl"

        # Ensure directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        async with aiofiles.open(filename, 'a') as f:
            for point in points:
                data = {
                    "metric": metric_name,
                    "value": point.value,
                    "timestamp": point.timestamp.ToDatetime().isoformat(),
                    "tags": dict(point.tags),
                    "source": source
                }
                await f.write(json.dumps(data) + '\n')

    async def _validate_data(self, points: List[DataPoint]) -> List[str]:
        """Validate data quality"""
        errors = []

        for i, point in enumerate(points):
            # Check for invalid values
            if not isinstance(point.value, (int, float)) or not str(point.value).replace('.', '').replace('-', '').isdigit():
                errors.append(f"Point {i}: Invalid value {point.value}")

            # Check timestamp is not in future
            if point.timestamp.ToDatetime() > datetime.now():
                errors.append(f"Point {i}: Future timestamp")

            # Check metric name format
            if not point.metric_name or not point.metric_name.replace('_', '').replace('.', '').isalnum():
                errors.append(f"Point {i}: Invalid metric name '{point.metric_name}'")

        return errors
```

### Client Implementation
```python
# clients/data_ingestor.py
import asyncio
import grpc
from typing import List, AsyncGenerator
import aiofiles
import json

from proto.generated.analytics_pb2 import BatchData, DataPoint
from proto.generated.analytics_pb2_grpc import DataIngestionStub
from utils.logger import get_logger

logger = get_logger(__name__)

class DataIngestor:
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address
        self.max_batch_size = 5000
        self.max_concurrent_streams = 5

    async def upload_file(self, file_path: str, source: str) -> dict:
        """
        Upload data from file using streaming
        """
        async with grpc.aio.insecure_channel(self.server_address) as channel:
            stub = DataIngestionStub(channel)

            async def generate_batches() -> AsyncGenerator[BatchData, None]:
                """Generate batches from file"""
                batch_points = []
                batch_id = f"file_{source}_{asyncio.get_event_loop().time()}"

                async with aiofiles.open(file_path, 'r') as f:
                    async for line in f:
                        try:
                            data = json.loads(line.strip())
                            point = DataPoint(
                                id=data.get('id', str(uuid.uuid4())),
                                metric_name=data['metric'],
                                value=data['value'],
                                tags=data.get('tags', {}),
                                timestamp=Timestamp.FromDatetime(
                                    datetime.fromisoformat(data['timestamp'])
                                )
                            )
                            batch_points.append(point)

                            # Yield batch when it reaches max size
                            if len(batch_points) >= self.max_batch_size:
                                yield BatchData(
                                    points=batch_points,
                                    batch_id=f"{batch_id}_{len(batch_points)}",
                                    source=source
                                )
                                batch_points = []

                        except (json.JSONDecodeError, KeyError) as e:
                            logger.warning(f"Skipping invalid line: {e}")
                            continue

                # Yield remaining points
                if batch_points:
                    yield BatchData(
                        points=batch_points,
                        batch_id=f"{batch_id}_final",
                        source=source
                    )

            try:
                response = await stub.UploadData(generate_batches())
                logger.info(f"Upload completed: {response.points_processed} processed, {response.points_failed} failed")
                return {
                    "batch_id": response.batch_id,
                    "processed": response.points_processed,
                    "failed": response.points_failed,
                    "errors": list(response.errors)
                }
            except grpc.RpcError as e:
                logger.error(f"Upload failed: {e}")
                raise

    async def upload_stream(self, data_stream: AsyncGenerator[dict, None], source: str) -> dict:
        """
        Upload data from async generator
        """
        async with grpc.aio.insecure_channel(self.server_address) as channel:
            stub = DataIngestionStub(channel)

            async def generate_batches() -> AsyncGenerator[BatchData, None]:
                batch_points = []
                batch_id = f"stream_{source}_{asyncio.get_event_loop().time()}"

                async for data in data_stream:
                    try:
                        point = DataPoint(
                            id=data.get('id', str(uuid.uuid4())),
                            metric_name=data['metric'],
                            value=data['value'],
                            tags=data.get('tags', {}),
                            timestamp=Timestamp.FromDatetime(
                                datetime.fromisoformat(data['timestamp']) if isinstance(data['timestamp'], str)
                                else data['timestamp']
                            )
                        )
                        batch_points.append(point)

                        if len(batch_points) >= self.max_batch_size:
                            yield BatchData(
                                points=batch_points,
                                batch_id=f"{batch_id}_{len(batch_points)}",
                                source=source
                            )
                            batch_points = []

                    except Exception as e:
                        logger.warning(f"Skipping invalid data point: {e}")
                        continue

                if batch_points:
                    yield BatchData(
                        points=batch_points,
                        batch_id=f"{batch_id}_final",
                        source=source
                    )

            response = await stub.UploadData(generate_batches())
            return {
                "batch_id": response.batch_id,
                "processed": response.points_processed,
                "failed": response.points_failed,
                "errors": list(response.errors)
            }

    async def upload_multiple_files(self, file_paths: List[str], source: str):
        """
        Upload multiple files concurrently
        """
        semaphore = asyncio.Semaphore(self.max_concurrent_streams)

        async def upload_single_file(file_path: str):
            async with semaphore:
                return await self.upload_file(file_path, source)

        tasks = [upload_single_file(path) for path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful = []
        failed = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed.append({"file": file_paths[i], "error": str(result)})
            else:
                successful.append({"file": file_paths[i], "result": result})

        return {"successful": successful, "failed": failed}
```

---

## Part 3: Server Streaming - Live Dashboard Service

### Service Implementation
```python
# services/dashboard_service.py
import asyncio
from typing import AsyncGenerator
import grpc
from google.protobuf.timestamp_pb2 import Timestamp
import redis.asyncio as redis

from proto.generated.analytics_pb2 import (
    MetricSubscription, DashboardData, MetricValue
)
from proto.generated.analytics_pb2_grpc import (
    DashboardServicer, add_DashboardServicer_to_server
)
from utils.metrics import dashboard_connections, dashboard_updates
from utils.logger import get_logger

logger = get_logger(__name__)

class DashboardService(DashboardServicer):
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.min_interval = 1000  # Minimum 1 second between updates
        self.max_interval = 60000  # Maximum 1 minute between updates

    async def SubscribeMetrics(self, request: MetricSubscription, context):
        """
        Server streaming RPC for live dashboard updates
        """
        logger.info(f"New dashboard subscription",
                   metrics=request.metric_names,
                   interval=request.update_interval_ms,
                   filters=dict(request.filters))

        # Validate subscription parameters
        interval = max(self.min_interval, min(self.max_interval, request.update_interval_ms))

        dashboard_connections.inc()

        try:
            async for dashboard_data in self._stream_dashboard_data(
                request.metric_names, interval, dict(request.filters), context
            ):
                if context.is_active():
                    dashboard_updates.inc()
                    yield dashboard_data
                else:
                    logger.info("Dashboard subscription cancelled")
                    break

        except Exception as e:
            logger.error(f"Dashboard streaming error: {e}")
            raise
        finally:
            dashboard_connections.dec()

    async def _stream_dashboard_data(self, metric_names: list, interval: int,
                                   filters: dict, context) -> AsyncGenerator[DashboardData, None]:
        """Generate streaming dashboard data"""

        dashboard_id = f"dash_{asyncio.get_event_loop().time()}"

        while context.is_active():
            try:
                # Collect current metric values
                metrics = []
                for metric_name in metric_names:
                    # Get latest value from Redis
                    keys = await self.redis.keys(f"metric:{metric_name}:*")

                    for key in keys:
                        # Apply filters
                        if self._matches_filters(key, filters):
                            value = await self.redis.get(key)
                            if value:
                                # Extract source from key
                                source = key.split(':')[-1]

                                metric_value = MetricValue(
                                    name=f"{metric_name}:{source}",
                                    value=float(value),
                                    timestamp=Timestamp.FromDatetime(datetime.now())
                                )
                                metrics.append(metric_value)

                if metrics:
                    dashboard_data = DashboardData(
                        metrics=metrics,
                        dashboard_id=dashboard_id,
                        update_interval_ms=interval
                    )

                    yield dashboard_data

                # Wait for next update
                await asyncio.sleep(interval / 1000.0)

            except asyncio.CancelledError:
                logger.info(f"Dashboard stream cancelled: {dashboard_id}")
                break
            except Exception as e:
                logger.error(f"Error generating dashboard data: {e}")
                # Continue streaming despite errors
                await asyncio.sleep(5)  # Brief pause before retry

    def _matches_filters(self, metric_key: str, filters: dict) -> bool:
        """Check if metric matches subscription filters"""
        if not filters:
            return True

        # Parse key format: metric:{metric_name}:{source}
        parts = metric_key.split(':')
        if len(parts) < 3:
            return False

        metric_name = parts[1]
        source = parts[2]

        # Check filters
        for filter_key, filter_value in filters.items():
            if filter_key == "source" and source != filter_value:
                return False
            elif filter_key == "metric" and metric_name != filter_value:
                return False

        return True
```

### Client Implementation
```python
# clients/dashboard_client.py
import asyncio
import grpc
from typing import Callable, List
import json

from proto.generated.analytics_pb2 import MetricSubscription
from proto.generated.analytics_pb2_grpc import DashboardStub
from utils.logger import get_logger

logger = get_logger(__name__)

class DashboardClient:
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address

    async def subscribe_dashboard(self, metric_names: List[str],
                                update_interval_ms: int = 5000,
                                filters: dict = None,
                                callback: Callable = None):
        """
        Subscribe to live dashboard updates
        """
        filters = filters or {}

        subscription = MetricSubscription(
            metric_names=metric_names,
            update_interval_ms=update_interval_ms,
            filters=filters
        )

        async with grpc.aio.insecure_channel(self.server_address) as channel:
            stub = DashboardStub(channel)

            try:
                async for dashboard_data in stub.SubscribeMetrics(subscription):
                    logger.debug(f"Received dashboard update",
                               dashboard_id=dashboard_data.dashboard_id,
                               metrics=len(dashboard_data.metrics))

                    # Format data for callback
                    data = {
                        "dashboard_id": dashboard_data.dashboard_id,
                        "update_interval_ms": dashboard_data.update_interval_ms,
                        "metrics": [
                            {
                                "name": metric.name,
                                "value": metric.value,
                                "timestamp": metric.timestamp.ToDatetime().isoformat()
                            }
                            for metric in dashboard_data.metrics
                        ]
                    }

                    if callback:
                        await callback(data)
                    else:
                        # Default: print to console
                        print(json.dumps(data, indent=2))

            except grpc.RpcError as e:
                logger.error(f"Dashboard subscription failed: {e}")
                raise

    async def monitor_metrics(self, metric_names: List[str], duration_seconds: int = 60):
        """
        Monitor metrics for a specified duration
        """
        updates_received = 0
        start_time = asyncio.get_event_loop().time()

        async def update_callback(data):
            nonlocal updates_received
            updates_received += 1

            print(f"\n📊 Dashboard Update #{updates_received}")
            print(f"Dashboard ID: {data['dashboard_id']}")
            print("Metrics:")
            for metric in data['metrics']:
                print(f"  {metric['name']}: {metric['value']}")
            print(f"Timestamp: {data['metrics'][0]['timestamp'] if data['metrics'] else 'N/A'}")

        try:
            await asyncio.wait_for(
                self.subscribe_dashboard(metric_names, callback=update_callback),
                timeout=duration_seconds
            )
        except asyncio.TimeoutError:
            logger.info(f"Monitoring completed after {duration_seconds} seconds")
        except KeyboardInterrupt:
            logger.info("Monitoring interrupted by user")

        logger.info(f"Total updates received: {updates_received}")
```

---

## Part 4: Bidirectional Streaming - Collaboration Service

### Service Implementation
```python
# services/collaboration_service.py
import asyncio
from typing import Dict, Set, AsyncGenerator
import grpc
from google.protobuf.timestamp_pb2 import Timestamp
import redis.asyncio as redis

from proto.generated.analytics_pb2 import (
    SessionRequest, CollaborationMessage
)
from proto.generated.analytics_pb2_grpc import (
    CollaborationServicer, add_CollaborationServicer_to_server
)
from utils.logger import get_logger

logger = get_logger(__name__)

class CollaborationService(CollaborationServicer):
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.active_sessions: Dict[str, Set[str]] = {}  # session_id -> set of user_ids
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id
        self.message_queues: Dict[str, asyncio.Queue] = {}

    async def JoinSession(self, request_iterator, context):
        """
        Bidirectional streaming RPC for real-time collaboration
        """
        session_id = None
        user_id = None

        try:
            # Handle incoming messages from client
            async def handle_client_messages():
                nonlocal session_id, user_id

                async for client_message in request_iterator:
                    if not session_id:
                        # First message should be session join
                        session_id = client_message.session_id if hasattr(client_message, 'session_id') else None
                        user_id = client_message.user_id if hasattr(client_message, 'user_id') else None

                        if session_id and user_id:
                            await self._join_session(session_id, user_id)
                            logger.info(f"User {user_id} joined session {session_id}")
                        else:
                            logger.warning("Invalid session join message")
                            return

                    else:
                        # Broadcast message to all session participants
                        await self._broadcast_message(session_id, client_message, exclude_user=user_id)

            # Start handling client messages
            client_task = asyncio.create_task(handle_client_messages())

            # Stream messages to client
            async for message in self._stream_session_messages(session_id, user_id, context):
                if context.is_active():
                    yield message
                else:
                    break

            # Wait for client message handling to complete
            await client_task

        except Exception as e:
            logger.error(f"Collaboration session error: {e}")
            raise
        finally:
            if session_id and user_id:
                await self._leave_session(session_id, user_id)

    async def _join_session(self, session_id: str, user_id: str):
        """Add user to session"""
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = set()
            self.message_queues[session_id] = asyncio.Queue()

        self.active_sessions[session_id].add(user_id)
        self.user_sessions[user_id] = session_id

        # Notify others of user joining
        join_message = CollaborationMessage(
            user_id=user_id,
            message=f"User {user_id} joined the session",
            timestamp=Timestamp.FromDatetime(datetime.now()),
            message_type="system",
            metadata={"action": "join"}
        )

        await self._broadcast_message(session_id, join_message, exclude_user=user_id)

        # Store session info in Redis for persistence
        await self.redis.sadd(f"session:{session_id}:users", user_id)
        await self.redis.set(f"user:{user_id}:session", session_id)

    async def _leave_session(self, session_id: str, user_id: str):
        """Remove user from session"""
        if session_id in self.active_sessions:
            self.active_sessions[session_id].discard(user_id)

            # Notify others of user leaving
            leave_message = CollaborationMessage(
                user_id=user_id,
                message=f"User {user_id} left the session",
                timestamp=Timestamp.FromDatetime(datetime.now()),
                message_type="system",
                metadata={"action": "leave"}
            )

            await self._broadcast_message(session_id, leave_message, exclude_user=user_id)

            # Clean up empty sessions
            if not self.active_sessions[session_id]:
                del self.active_sessions[session_id]
                del self.message_queues[session_id]

        if user_id in self.user_sessions:
            del self.user_sessions[user_id]

        # Update Redis
        await self.redis.srem(f"session:{session_id}:users", user_id)
        await self.redis.delete(f"user:{user_id}:session")

    async def _broadcast_message(self, session_id: str, message: CollaborationMessage,
                                exclude_user: str = None):
        """Broadcast message to all session participants"""
        if session_id not in self.message_queues:
            return

        # Add message to queue for all participants
        for user_id in self.active_sessions.get(session_id, set()):
            if user_id != exclude_user:
                await self.message_queues[session_id].put((user_id, message))

    async def _stream_session_messages(self, session_id: str, user_id: str, context) \
            -> AsyncGenerator[CollaborationMessage, None]:
        """Stream messages to specific user"""

        if not session_id or session_id not in self.message_queues:
            return

        while context.is_active():
            try:
                # Wait for message with timeout
                target_user, message = await asyncio.wait_for(
                    self.message_queues[session_id].get(),
                    timeout=30.0
                )

                # Only send messages intended for this user
                if target_user == user_id:
                    yield message

            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                heartbeat = CollaborationMessage(
                    user_id="system",
                    message="heartbeat",
                    timestamp=Timestamp.FromDatetime(datetime.now()),
                    message_type="system",
                    metadata={"type": "heartbeat"}
                )
                yield heartbeat

            except asyncio.CancelledError:
                logger.info(f"Message streaming cancelled for user {user_id}")
                break
```

### Client Implementation
```python
# clients/collab_client.py
import asyncio
import grpc
from typing import Callable, AsyncGenerator
import uuid

from proto.generated.analytics_pb2 import CollaborationMessage, SessionRequest
from proto.generated.analytics_pb2_grpc import CollaborationStub
from google.protobuf.timestamp_pb2 import Timestamp
from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__)

class CollaborationClient:
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address
        self.user_id = str(uuid.uuid4())[:8]  # Short user ID for demo

    async def join_session(self, session_id: str, user_name: str = None,
                          message_callback: Callable = None):
        """
        Join a collaboration session with bidirectional streaming
        """
        user_name = user_name or f"User-{self.user_id}"

        async def generate_requests() -> AsyncGenerator[CollaborationMessage, None]:
            """Generate outgoing messages"""
            # Send join message
            join_message = CollaborationMessage(
                user_id=self.user_id,
                message=f"{user_name} joined",
                timestamp=Timestamp.FromDatetime(datetime.now()),
                message_type="system",
                metadata={"action": "join", "user_name": user_name}
            )
            yield join_message

            # Send periodic heartbeats and handle user input
            while True:
                try:
                    # Wait for user input or timeout
                    message = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(None, input, "> "),
                        timeout=10.0
                    )

                    if message.lower() in ['quit', 'exit', 'bye']:
                        break

                    if message.strip():
                        chat_message = CollaborationMessage(
                            user_id=self.user_id,
                            message=message,
                            timestamp=Timestamp.FromDatetime(datetime.now()),
                            message_type="chat",
                            metadata={"user_name": user_name}
                        )
                        yield chat_message

                except asyncio.TimeoutError:
                    # Send heartbeat
                    heartbeat = CollaborationMessage(
                        user_id=self.user_id,
                        message="ping",
                        timestamp=Timestamp.FromDatetime(datetime.now()),
                        message_type="heartbeat",
                        metadata={"user_name": user_name}
                    )
                    yield heartbeat

        async with grpc.aio.insecure_channel(self.server_address) as channel:
            stub = CollaborationStub(channel)

            try:
                async for response_message in stub.JoinSession(generate_requests()):
                    if message_callback:
                        await message_callback(response_message)
                    else:
                        self._display_message(response_message)

            except grpc.RpcError as e:
                logger.error(f"Collaboration session failed: {e}")
            except KeyboardInterrupt:
                logger.info("Collaboration session interrupted")

    def _display_message(self, message: CollaborationMessage):
        """Display received message"""
        timestamp = message.timestamp.ToDatetime().strftime("%H:%M:%S")
        user_name = message.metadata.get("user_name", message.user_id)

        if message.message_type == "system":
            print(f"[{timestamp}] *** {message.message} ***")
        elif message.message_type == "heartbeat":
            pass  # Skip heartbeat messages
        else:
            print(f"[{timestamp}] {user_name}: {message.message}")

    async def send_message(self, session_id: str, message: str):
        """
        Send a single message to session (requires active connection)
        """
        # This would need to be implemented with a persistent connection
        # For now, it's a placeholder for future implementation
        logger.info(f"Message queued for session {session_id}: {message}")

    async def list_sessions(self) -> list:
        """
        List active sessions (would need additional RPC method)
        """
        # Placeholder for session listing functionality
        return []
```

---

## Part 5: Server Streaming - Alert System

### Service Implementation
```python
# services/alert_service.py
import asyncio
from typing import AsyncGenerator, Dict, List
import grpc
from google.protobuf.timestamp_pb2 import Timestamp
import redis.asyncio as redis
import json

from proto.generated.analytics_pb2 import AlertSubscription, Alert
from proto.generated.analytics_pb2_grpc import (
    AlertsServicer, add_AlertsServicer_to_server
)
from utils.logger import get_logger

logger = get_logger(__name__)

class AlertService(AlertsServicer):
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.alert_channel = "alerts:notifications"

    async def SubscribeAlerts(self, request: AlertSubscription, context):
        """
        Server streaming RPC for real-time alerts
        """
        logger.info(f"New alert subscription",
                   severities=request.severities,
                   sources=request.sources)

        try:
            async for alert in self._stream_alerts(request, context):
                if context.is_active():
                    yield alert
                else:
                    break

        except Exception as e:
            logger.error(f"Alert streaming error: {e}")
            raise

    async def _stream_alerts(self, subscription: AlertSubscription, context) \
            -> AsyncGenerator[Alert, None]:
        """Stream alerts based on subscription"""

        # Subscribe to Redis pub/sub for real-time alerts
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(self.alert_channel)

        try:
            while context.is_active():
                # Check for new messages
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)

                if message:
                    try:
                        alert_data = json.loads(message['data'])

                        # Check if alert matches subscription
                        if self._matches_alert_subscription(alert_data, subscription):
                            alert = Alert(
                                id=alert_data['id'],
                                title=alert_data['title'],
                                description=alert_data['description'],
                                severity=alert_data['severity'],
                                created_at=Timestamp.FromDatetime(
                                    datetime.fromisoformat(alert_data['created_at'])
                                ),
                                context=alert_data.get('context', {})
                            )
                            yield alert

                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"Invalid alert message: {e}")
                        continue

                # Small delay to prevent busy waiting
                await asyncio.sleep(0.1)

        finally:
            await pubsub.unsubscribe(self.alert_channel)

    def _matches_alert_subscription(self, alert_data: dict, subscription: AlertSubscription) -> bool:
        """Check if alert matches subscription criteria"""

        # Check severity filter
        if subscription.severities and alert_data.get('severity') not in subscription.severities:
            return False

        # Check source filter
        if subscription.sources:
            alert_source = alert_data.get('source')
            if not alert_source or alert_source not in subscription.sources:
                return False

        # Check acknowledged filter
        if not subscription.include_acknowledged:
            if alert_data.get('acknowledged', False):
                return False

        return True

    async def publish_alert(self, alert_data: dict):
        """
        Publish a new alert (called by other services)
        """
        alert_json = json.dumps({
            "id": alert_data.get('id', str(uuid.uuid4())),
            "title": alert_data['title'],
            "description": alert_data['description'],
            "severity": alert_data['severity'],
            "source": alert_data.get('source', 'system'),
            "created_at": datetime.now().isoformat(),
            "context": alert_data.get('context', {}),
            "acknowledged": False
        })

        await self.redis.publish(self.alert_channel, alert_json)
        logger.info(f"Alert published: {alert_data['title']}")

    async def acknowledge_alert(self, alert_id: str, user_id: str):
        """
        Acknowledge an alert
        """
        # Store acknowledgment in Redis
        ack_key = f"alert:{alert_id}:acknowledged"
        await self.redis.set(ack_key, user_id)
        await self.redis.expire(ack_key, 86400)  # Expire after 24 hours

        logger.info(f"Alert {alert_id} acknowledged by {user_id}")
```

### Client Implementation
```python
# clients/alert_client.py
import asyncio
import grpc
from typing import Callable, List

from proto.generated.analytics_pb2 import AlertSubscription
from proto.generated.analytics_pb2_grpc import AlertsStub
from utils.logger import get_logger

logger = get_logger(__name__)

class AlertClient:
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address

    async def subscribe_alerts(self, severities: List[str] = None,
                             sources: List[str] = None,
                             include_acknowledged: bool = False,
                             callback: Callable = None):
        """
        Subscribe to real-time alerts
        """
        subscription = AlertSubscription(
            severities=severities or [],
            sources=sources or [],
            include_acknowledged=include_acknowledged
        )

        async with grpc.aio.insecure_channel(self.server_address) as channel:
            stub = AlertsStub(channel)

            try:
                async for alert in stub.SubscribeAlerts(subscription):
                    alert_data = {
                        "id": alert.id,
                        "title": alert.title,
                        "description": alert.description,
                        "severity": alert.severity,
                        "created_at": alert.created_at.ToDatetime().isoformat(),
                        "context": dict(alert.context)
                    }

                    if callback:
                        await callback(alert_data)
                    else:
                        self._display_alert(alert_data)

            except grpc.RpcError as e:
                logger.error(f"Alert subscription failed: {e}")
                raise

    def _display_alert(self, alert: dict):
        """Display received alert"""
        severity_emoji = {
            "low": "ℹ️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔴"
        }

        emoji = severity_emoji.get(alert['severity'], "❓")
        print(f"{emoji} ALERT: {alert['title']}")
        print(f"   Severity: {alert['severity']}")
        print(f"   Description: {alert['description']}")
        print(f"   Time: {alert['created_at']}")
        if alert['context']:
            print(f"   Context: {alert['context']}")
        print("-" * 50)

    async def monitor_alerts(self, severities: List[str] = None, duration_seconds: int = 300):
        """
        Monitor alerts for a specified duration
        """
        alerts_received = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        async def alert_callback(alert_data):
            severity = alert_data['severity']
            alerts_received[severity] += 1
            self._display_alert(alert_data)

        try:
            logger.info(f"Starting alert monitoring for {duration_seconds} seconds")
            await asyncio.wait_for(
                self.subscribe_alerts(severities=severities, callback=alert_callback),
                timeout=duration_seconds
            )
        except asyncio.TimeoutError:
            logger.info("Alert monitoring completed")
        except KeyboardInterrupt:
            logger.info("Alert monitoring interrupted")

        print(f"\n📊 Alert Summary:")
        for severity, count in alerts_received.items():
            print(f"   {severity}: {count}")
```

---

## Part 6: Integration and Testing

### Main Server
```python
# main.py
import asyncio
import grpc
from concurrent import futures
import redis.asyncio as redis

from services.ingestion_service import DataIngestionService
from services.dashboard_service import DashboardService
from services.collaboration_service import CollaborationService
from services.alert_service import AlertService
from utils.data_processor import DataProcessor
from utils.logger import setup_logging

async def serve():
    """Start all gRPC services"""
    setup_logging()

    # Initialize Redis client
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Initialize services
    data_processor = DataProcessor(redis_client)
    ingestion_service = DataIngestionService(data_processor)
    dashboard_service = DashboardService(redis_client)
    collaboration_service = CollaborationService(redis_client)
    alert_service = AlertService(redis_client)

    # Create server
    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),  # 50MB
            ('grpc.max_send_message_length', 50 * 1024 * 1024),     # 50MB
        ]
    )

    # Add services
    add_DataIngestionServicer_to_server(ingestion_service, server)
    add_DashboardServicer_to_server(dashboard_service, server)
    add_CollaborationServicer_to_server(collaboration_service, server)
    add_AlertsServicer_to_server(alert_service, server)

    # Start server
    server.add_insecure_port('[::]:50051')
    await server.start()
    print("🚀 Streaming Analytics Server started on port 50051")

    # Graceful shutdown
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        print("🛑 Shutting down server...")
        await server.stop(5)

if __name__ == '__main__':
    asyncio.run(serve())
```

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  analytics-server:
    build: .
    ports:
      - "50051:50051"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  redis_data:
  analytics_data:
```

### Testing the Complete System
```python
# tests/test_streaming_integration.py
import pytest
import asyncio
import grpc
from unittest.mock import AsyncMock

from clients.data_ingestor import DataIngestor
from clients.dashboard_client import DashboardClient
from clients.alert_client import AlertClient

class TestStreamingIntegration:
    @pytest.fixture
    async def server_channel(self):
        """Start test server"""
        # Implementation would start a test server instance
        pass

    async def test_data_ingestion_flow(self):
        """Test complete data ingestion flow"""
        ingestor = DataIngestor()

        # Generate test data
        test_data = [
            {"metric": "cpu_usage", "value": 85.5, "tags": {"host": "server1"}},
            {"metric": "memory_usage", "value": 72.3, "tags": {"host": "server1"}},
        ]

        async def data_generator():
            for item in test_data:
                yield item

        # Upload data
        result = await ingestor.upload_stream(data_generator(), "test_source")

        assert result["processed"] == len(test_data)
        assert result["failed"] == 0

    async def test_dashboard_streaming(self):
        """Test dashboard real-time updates"""
        client = DashboardClient()
        updates_received = []

        async def collect_updates(data):
            updates_received.append(data)

        # Subscribe for 5 seconds
        try:
            await asyncio.wait_for(
                client.subscribe_dashboard(
                    ["cpu_usage", "memory_usage"],
                    callback=collect_updates
                ),
                timeout=5
            )
        except asyncio.TimeoutError:
            pass

        assert len(updates_received) > 0

    async def test_alert_system(self):
        """Test alert subscription and publishing"""
        client = AlertClient()
        alerts_received = []

        async def collect_alerts(alert):
            alerts_received.append(alert)

        # Subscribe to alerts
        subscription_task = asyncio.create_task(
            client.subscribe_alerts(
                severities=["high", "critical"],
                callback=collect_alerts
            )
        )

        # Simulate alert publishing (would need service instance)
        # await alert_service.publish_alert({
        #     "title": "High CPU Usage",
        #     "description": "CPU usage above 90%",
        #     "severity": "high"
        # })

        await asyncio.sleep(2)  # Brief test period
        subscription_task.cancel()

        # Verify alert handling (would depend on actual alerts published)

    async def test_collaboration_session(self):
        """Test bidirectional collaboration streaming"""
        client1 = CollaborationClient()
        client2 = CollaborationClient()

        messages_received = []

        async def message_callback(message):
            messages_received.append(message)

        # Start session with client 1
        session_task1 = asyncio.create_task(
            client1.join_session("test_session", "User1", message_callback)
        )

        await asyncio.sleep(1)  # Let session establish

        # Join with client 2 (would need input simulation)
        # This is complex to test automatically - would need mocking

        session_task1.cancel()

        # Verify session establishment
```

---

## Exercise: Build a Complete Streaming Application

### Requirements
Create a complete **Real-Time IoT Monitoring System** with:

1. **Device Data Ingestion** (Client Streaming)
   - Sensors send telemetry data in batches
   - Handle multiple concurrent device connections
   - Validate and process sensor readings

2. **Live Monitoring Dashboard** (Server Streaming)
   - Real-time visualization of device metrics
   - Customizable update intervals
   - Multi-device filtering and aggregation

3. **Operator Collaboration** (Bidirectional Streaming)
   - Live chat between monitoring operators
   - Real-time issue annotations
   - Session-based collaboration rooms

4. **Alert Management System** (Server Streaming)
   - Configurable alert thresholds
   - Real-time alert notifications
   - Alert acknowledgment and escalation

### Implementation Steps

1. **Extend Protobuf Definitions**
   - Add IoT-specific message types
   - Define device and sensor schemas
   - Create monitoring and alert structures

2. **Implement Device Simulator**
   - Generate realistic sensor data
   - Simulate network conditions
   - Test batch processing and error handling

3. **Build Monitoring Dashboard**
   - Real-time charts and graphs
   - Device status monitoring
   - Alert visualization

4. **Add Collaboration Features**
   - Operator chat system
   - Issue tracking and assignment
   - Session recording and replay

5. **Implement Alert Engine**
   - Configurable threshold rules
   - Multi-level escalation
   - Alert correlation and grouping

### Advanced Features to Consider

- **Flow Control**: Handle backpressure in streaming
- **Load Balancing**: Distribute load across multiple servers
- **Persistence**: Store streaming data for historical analysis
- **Authentication**: Secure streaming connections
- **Monitoring**: Track streaming performance metrics

### Deliverables
- Complete gRPC streaming application
- Docker containerization setup
- Comprehensive test suite
- Performance benchmarking scripts
- Deployment and scaling documentation

---

## Key Takeaways

1. **Streaming Patterns**: Different RPC types solve different problems
   - **Client Streaming**: Batch uploads, file transfers
   - **Server Streaming**: Live feeds, notifications, monitoring
   - **Bidirectional**: Real-time collaboration, chat, gaming

2. **Performance Considerations**: Streaming requires careful resource management
   - Connection pooling and lifecycle management
   - Backpressure handling and flow control
   - Memory management for large streams

3. **Error Handling**: Streaming introduces complex error scenarios
   - Network interruptions and reconnection logic
   - Partial failure handling in batches
   - Client and server state synchronization

4. **Scalability**: Design for high-throughput streaming applications
   - Asynchronous processing and concurrency
   - Load balancing across service instances
   - Horizontal scaling strategies

5. **Monitoring**: Comprehensive observability for streaming systems
   - Connection health and throughput metrics
   - Error rates and latency tracking
   - Resource usage monitoring

## Next Steps
- Implement gRPC interceptors for authentication
- Add service mesh integration (Istio/Linkerd)
- Implement streaming data compression
- Add end-to-end encryption for sensitive streams
- Explore WebRTC for browser-based streaming

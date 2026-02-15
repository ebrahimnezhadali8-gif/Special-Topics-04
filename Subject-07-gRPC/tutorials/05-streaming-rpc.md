# Tutorial 05: Streaming RPC Operations in gRPC

## Overview
This tutorial covers gRPC's streaming capabilities, including server streaming, client streaming, and bidirectional streaming. You'll learn when and how to use each streaming pattern, implement them in Python, and understand the performance implications.

## Streaming RPC Types

### 1. Unary RPC (Standard)
```
Client → Server: Single request
Client ← Server: Single response
```
- Most common pattern
- Similar to HTTP request/response
- Used for simple operations

### 2. Server Streaming
```
Client → Server: Single request
Client ← Server: Stream of responses
```
- Server sends multiple messages
- Client reads until stream ends
- Good for: Large datasets, real-time updates, logs

### 3. Client Streaming
```
Client → Server: Stream of requests
Client ← Server: Single response
```
- Client sends multiple messages
- Server processes all and responds once
- Good for: File uploads, batch operations, real-time data collection

### 4. Bidirectional Streaming
```
Client ↔ Server: Streams in both directions
```
- Both sides send and receive streams
- Messages can be sent at any time
- Good for: Chat applications, real-time collaboration, gaming

## Protocol Buffer Definition

### Streaming Service Definition
```protobuf
syntax = "proto3";

package streaming;

service StreamingService {
  // Unary RPC
  rpc UnaryCall (Message) returns (Message);

  // Server streaming
  rpc ServerStreaming (StreamRequest) returns (stream Message);

  // Client streaming
  rpc ClientStreaming (stream Message) returns (StreamResponse);

  // Bidirectional streaming
  rpc BidirectionalStreaming (stream Message) returns (stream Message);
}

message Message {
  string content = 1;
  int64 timestamp = 2;
  string sender = 3;
}

message StreamRequest {
  string topic = 1;
  int32 max_messages = 2;
}

message StreamResponse {
  int32 messages_processed = 1;
  string status = 2;
}
```

## Server Streaming Implementation

### Server-Side Implementation
```python
import grpc
from concurrent import futures
import time
from proto.generated.streaming_pb2 import Message, StreamResponse
from proto.generated.streaming_pb2_grpc import StreamingServiceServicer, add_StreamingServiceServicer_to_server

class StreamingService(StreamingServiceServicer):
    def ServerStreaming(self, request, context):
        """Server streaming RPC"""
        topic = request.topic
        max_messages = request.max_messages or 10

        print(f"Starting server stream for topic: {topic}")

        for i in range(max_messages):
            # Check if client is still connected
            if not context.is_active():
                print("Client disconnected, stopping stream")
                break

            message = Message(
                content=f"Message {i+1} for topic {topic}",
                timestamp=int(time.time() * 1000),
                sender="server"
            )

            yield message

            # Simulate processing time
            time.sleep(0.5)

        print(f"Server streaming completed for topic: {topic}")

    def ClientStreaming(self, request_iterator, context):
        """Client streaming RPC"""
        messages_received = 0
        total_content_length = 0

        print("Starting client streaming")

        try:
            for message in request_iterator:
                messages_received += 1
                total_content_length += len(message.content)

                print(f"Received message {messages_received}: {message.content}")

                # Process message
                # In real implementation, you might save to database, etc.

        except Exception as e:
            print(f"Error processing stream: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Error processing messages")

        return StreamResponse(
            messages_processed=messages_received,
            status=f"Processed {messages_received} messages, total length: {total_content_length}"
        )

    def BidirectionalStreaming(self, request_iterator, context):
        """Bidirectional streaming RPC"""
        print("Starting bidirectional streaming")

        try:
            for client_message in request_iterator:
                print(f"Received: {client_message.content}")

                # Process the message and send response
                server_message = Message(
                    content=f"Echo: {client_message.content}",
                    timestamp=int(time.time() * 1000),
                    sender="server"
                )

                yield server_message

                # Simulate processing delay
                time.sleep(0.2)

        except Exception as e:
            print(f"Error in bidirectional stream: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Stream processing error")
```

### Client-Side Implementation
```python
import grpc
import threading
import time
from proto.generated.streaming_pb2 import Message, StreamRequest
from proto.generated.streaming_pb2_grpc import StreamingServiceStub

class StreamingClient:
    def __init__(self, host='localhost', port=50051):
        self.channel = grpc.insecure_channel(f'{host}:{port}')
        self.stub = StreamingServiceStub(self.channel)

    def server_streaming_example(self):
        """Demonstrate server streaming"""
        print("=== Server Streaming Example ===")

        request = StreamRequest(topic="news", max_messages=5)

        try:
            responses = self.stub.ServerStreaming(request)

            for response in responses:
                print(f"Received: {response.content} (from: {response.sender})")

        except grpc.RpcError as e:
            print(f"RPC error: {e}")

    def client_streaming_example(self):
        """Demonstrate client streaming"""
        print("=== Client Streaming Example ===")

        def message_generator():
            messages = [
                "Hello from client",
                "This is message 2",
                "Final message"
            ]

            for content in messages:
                message = Message(
                    content=content,
                    timestamp=int(time.time() * 1000),
                    sender="client"
                )
                yield message
                time.sleep(0.5)  # Simulate delay between messages

        try:
            response = self.stub.ClientStreaming(message_generator())
            print(f"Response: {response.status}")

        except grpc.RpcError as e:
            print(f"RPC error: {e}")

    def bidirectional_streaming_example(self):
        """Demonstrate bidirectional streaming"""
        print("=== Bidirectional Streaming Example ===")

        def client_message_generator():
            """Generate messages from client"""
            messages = ["Hello", "How are you?", "Goodbye"]
            for content in messages:
                message = Message(
                    content=content,
                    timestamp=int(time.time() * 1000),
                    sender="client"
                )
                yield message
                time.sleep(1)  # Wait for server response

        try:
            responses = self.stub.BidirectionalStreaming(client_message_generator())

            for response in responses:
                print(f"Server: {response.content}")

        except grpc.RpcError as e:
            print(f"RPC error: {e}")

    def close(self):
        """Close the channel"""
        self.channel.close()

def main():
    client = StreamingClient()

    try:
        # Run examples
        client.server_streaming_example()
        print()

        client.client_streaming_example()
        print()

        client.bidirectional_streaming_example()

    finally:
        client.close()

if __name__ == '__main__':
    main()
```

## Advanced Streaming Patterns

### Flow Control
```python
class FlowControlService(StreamingServiceServicer):
    def ServerStreaming(self, request, context):
        """Server streaming with flow control"""
        batch_size = 10
        total_messages = request.max_messages or 100

        for batch_start in range(0, total_messages, batch_size):
            batch_end = min(batch_start + batch_size, total_messages)

            # Send batch of messages
            for i in range(batch_start, batch_end):
                if not context.is_active():
                    break

                message = Message(
                    content=f"Message {i+1}",
                    timestamp=int(time.time() * 1000),
                    sender="server"
                )

                try:
                    yield message
                except Exception as e:
                    print(f"Error sending message: {e}")
                    break

            # Small delay between batches
            time.sleep(0.1)
```

### Error Handling in Streams
```python
class RobustStreamingService(StreamingServiceServicer):
    def BidirectionalStreaming(self, request_iterator, context):
        """Bidirectional streaming with error handling"""
        try:
            message_count = 0

            for client_message in request_iterator:
                message_count += 1

                try:
                    # Process message
                    if not client_message.content:
                        # Send error back to client
                        error_message = Message(
                            content="ERROR: Empty message content",
                            timestamp=int(time.time() * 1000),
                            sender="server"
                        )
                        yield error_message
                        continue

                    # Process valid message
                    response = Message(
                        content=f"Processed: {client_message.content}",
                        timestamp=int(time.time() * 1000),
                        sender="server"
                    )

                    yield response

                except Exception as e:
                    # Send error message
                    error_response = Message(
                        content=f"ERROR: {str(e)}",
                        timestamp=int(time.time() * 1000),
                        sender="server"
                    )
                    yield error_response

        except Exception as e:
            print(f"Stream error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Stream processing failed")
```

## Async Streaming

### Async Server Implementation
```python
import grpc
from grpc import aio
import asyncio
from proto.generated.streaming_pb2 import Message, StreamResponse
from proto.generated.streaming_pb2_grpc import StreamingServiceServicer

class AsyncStreamingService(StreamingServiceServicer):
    async def ServerStreaming(self, request, context):
        """Async server streaming"""
        for i in range(request.max_messages or 5):
            if not context.is_active():
                break

            message = Message(
                content=f"Async message {i+1}",
                timestamp=int(asyncio.get_event_loop().time() * 1000),
                sender="async-server"
            )

            yield message
            await asyncio.sleep(0.5)  # Non-blocking sleep

    async def BidirectionalStreaming(self, request_iterator, context):
        """Async bidirectional streaming"""
        async for client_message in request_iterator:
            # Process message asynchronously
            response = Message(
                content=f"Async echo: {client_message.content}",
                timestamp=int(asyncio.get_event_loop().time() * 1000),
                sender="async-server"
            )

            yield response
            await asyncio.sleep(0.2)
```

### Async Client Implementation
```python
import asyncio
import grpc
from grpc import aio

class AsyncStreamingClient:
    def __init__(self, host='localhost', port=50051):
        self.channel = aio.insecure_channel(f'{host}:{port}')

    async def server_streaming_example(self):
        """Async server streaming"""
        stub = streaming_pb2_grpc.StreamingServiceStub(self.channel)

        request = StreamRequest(topic="async", max_messages=3)

        try:
            async for response in stub.ServerStreaming(request):
                print(f"Async received: {response.content}")

        except grpc.RpcError as e:
            print(f"RPC error: {e}")

    async def bidirectional_example(self):
        """Async bidirectional streaming"""
        stub = streaming_pb2_grpc.StreamingServiceStub(self.channel)

        async def message_generator():
            messages = ["Async hello", "Async world", "Async bye"]
            for content in messages:
                message = Message(
                    content=content,
                    timestamp=int(asyncio.get_event_loop().time() * 1000),
                    sender="async-client"
                )
                yield message
                await asyncio.sleep(1)

        try:
            async for response in stub.BidirectionalStreaming(message_generator()):
                print(f"Async bidirectional: {response.content}")

        except grpc.RpcError as e:
            print(f"RPC error: {e}")

    async def close(self):
        """Close the channel"""
        await self.channel.close()

async def main():
    client = AsyncStreamingClient()

    try:
        await client.server_streaming_example()
        print()
        await client.bidirectional_example()

    finally:
        await client.close()

if __name__ == '__main__':
    asyncio.run(main())
```

## Performance Considerations

### Memory Management
```python
class MemoryEfficientService(StreamingServiceServicer):
    def ServerStreaming(self, request, context):
        """Memory-efficient streaming"""
        batch_size = 100  # Process in batches

        for batch in self.get_data_batches(request, batch_size):
            for item in batch:
                if not context.is_active():
                    break

                # Convert to message
                message = self.convert_to_message(item)
                yield message

                # Clear references to help GC
                del item

            # Small delay to prevent overwhelming client
            time.sleep(0.01)
```

### Backpressure Handling
```python
class BackpressureService(StreamingServiceServicer):
    def BidirectionalStreaming(self, request_iterator, context):
        """Handle backpressure in bidirectional streams"""
        buffer_size = 10
        buffer = []

        try:
            for client_message in request_iterator:
                buffer.append(client_message)

                # Process when buffer is full or on timeout
                if len(buffer) >= buffer_size:
                    responses = self.process_batch(buffer)
                    for response in responses:
                        yield response
                    buffer.clear()

            # Process remaining messages
            if buffer:
                responses = self.process_batch(buffer)
                for response in responses:
                    yield response

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Processing error: {e}")
```

## Testing Streaming Services

### Unit Testing Streams
```python
import pytest
from unittest.mock import Mock
from proto.generated.streaming_pb2 import Message, StreamRequest

class TestStreamingService:
    def test_server_streaming(self):
        """Test server streaming"""
        service = StreamingService()
        context = Mock()
        context.is_active.return_value = True

        request = StreamRequest(topic="test", max_messages=3)

        messages = list(service.ServerStreaming(request, context))

        assert len(messages) == 3
        assert messages[0].content == "Message 1 for topic test"
        assert messages[1].content == "Message 2 for topic test"
        assert messages[2].content == "Message 3 for topic test"

    def test_client_streaming(self):
        """Test client streaming"""
        service = StreamingService()
        context = Mock()

        messages = [
            Message(content="Hello"),
            Message(content="World"),
            Message(content="!")
        ]

        response = service.ClientStreaming(iter(messages), context)

        assert response.messages_processed == 3
        assert "3 messages" in response.status
```

### Integration Testing
```python
@pytest.mark.asyncio
async def test_bidirectional_streaming():
    """Integration test for bidirectional streaming"""
    # Start server in background
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    service = StreamingService()
    add_StreamingServiceServicer_to_server(service, server)
    server.add_insecure_port('[::]:0')
    server.start()

    try:
        # Get the port
        port = server._server.server_port

        # Create client
        async with grpc.aio.insecure_channel(f'localhost:{port}') as channel:
            stub = StreamingServiceStub(channel)

            # Test bidirectional streaming
            messages = [Message(content=f"Test {i}") for i in range(3)]

            responses = []
            async for response in stub.BidirectionalStreaming(iter(messages)):
                responses.append(response)

            assert len(responses) == 3
            for i, response in enumerate(responses):
                assert f"Test {i}" in response.content

    finally:
        server.stop(None)
```

## Real-World Use Cases

### File Upload/Download
```protobuf
service FileService {
  rpc UploadFile (stream FileChunk) returns (UploadResponse);
  rpc DownloadFile (DownloadRequest) returns (stream FileChunk);
}

message FileChunk {
  bytes data = 1;
  int64 offset = 2;
}

message UploadResponse {
  string file_id = 1;
  int64 total_size = 2;
}
```

### Real-Time Chat
```protobuf
service ChatService {
  rpc JoinChat (JoinRequest) returns (stream ChatMessage);
  rpc SendMessage (ChatMessage) returns (SendResponse);
}

message ChatMessage {
  string room_id = 1;
  string sender = 2;
  string content = 3;
  int64 timestamp = 4;
}
```

### Live Data Streaming
```protobuf
service MonitoringService {
  rpc StreamMetrics (MetricsRequest) returns (stream MetricData);
  rpc StreamLogs (LogRequest) returns (stream LogEntry);
}

message MetricData {
  string metric_name = 1;
  double value = 2;
  int64 timestamp = 3;
  map<string, string> labels = 4;
}
```

## Hands-on Exercises

### Exercise 1: Server Streaming
1. Implement a server streaming service that sends stock prices
2. Create a client that subscribes to price updates
3. Add filtering by stock symbol

### Exercise 2: Client Streaming
1. Implement a client streaming service for log aggregation
2. Create a client that sends log entries
3. Add batch processing and acknowledgment

### Exercise 3: Bidirectional Chat
1. Implement a bidirectional chat service
2. Create multiple clients that can chat with each other
3. Add room management and user presence

## Next Steps
- [Workshop: Basic gRPC Service](../workshops/workshop-01-basic-grpc.md)
- [Workshop: Error Handling](../workshops/workshop-02-error-handling.md)

## Additional Resources
- [gRPC Streaming](https://grpc.io/docs/what-is-grpc/core-concepts/#bidirectional-streaming-rpc)
- [Async gRPC Python](https://grpc.github.io/grpc/python/grpc_asyncio.html)
- [Streaming Best Practices](https://grpc.io/docs/guides/performance/)
- [Flow Control](https://grpc.io/blog/flow-control/)

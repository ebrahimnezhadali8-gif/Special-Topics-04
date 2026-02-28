# Tutorial 04: Implementing gRPC Services and Clients

## Overview
This tutorial covers the implementation of gRPC services and clients using generated code from Protocol Buffer definitions. You'll learn how to create server implementations, build client applications, handle errors, and manage connections.

## Server Implementation

### Basic Server Structure
```python
from concurrent import futures
import grpc
import logging

# Import generated code
from proto.generated.service_pb2 import HelloReply
from proto.generated.service_pb2_grpc import GreeterServicer, add_GreeterServicer_to_server

class GreeterService(GreeterServicer):
    """Implementation of the Greeter service"""

    def SayHello(self, request, context):
        """Implement the SayHello RPC method"""
        message = f"Hello, {request.name}!"
        return HelloReply(message=message, timestamp=1234567890)

def serve():
    """Start the gRPC server"""
    # Create server with thread pool
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add service implementation
    greeter_service = GreeterService()
    add_GreeterServicer_to_server(greeter_service, server)

    # Add insecure port (for development)
    server.add_insecure_port('[::]:50051')

    # Start server
    server.start()
    print("Server started on port 50051")

    # Wait for termination
    server.wait_for_termination()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
```

### Service Implementation Patterns

#### Dependency Injection
```python
class UserService(GreeterServicer):
    def __init__(self, user_repository, logger=None):
        self.user_repository = user_repository
        self.logger = logger or logging.getLogger(__name__)

    def GetUser(self, request, context):
        try:
            user = self.user_repository.get_user(request.user_id)
            if not user:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details('User not found')
                return User()

            return User(
                id=user.id,
                name=user.name,
                email=user.email
            )
        except Exception as e:
            self.logger.error(f"Error getting user: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details('Internal server error')
            return User()
```

#### Context Management
```python
class CalculatorService(CalculatorServicer):
    def Add(self, request, context):
        # Access request metadata
        metadata = dict(context.invocation_metadata())
        user_id = metadata.get('user-id', 'anonymous')

        # Check for cancellation
        if context.is_active():
            result = request.a + request.b
            return AddResponse(result=result)
        else:
            context.set_code(grpc.StatusCode.CANCELLED)
            context.set_details('Request was cancelled')
            return AddResponse()
```

## Client Implementation

### Basic Client
```python
import grpc
from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

def run_client():
    # Create insecure channel
    with grpc.insecure_channel('localhost:50051') as channel:
        # Create stub
        stub = GreeterStub(channel)

        # Create request
        request = HelloRequest(name='World')

        # Call service method
        response = stub.SayHello(request)

        print(f"Response: {response.message}")
        print(f"Timestamp: {response.timestamp}")

if __name__ == '__main__':
    run_client()
```

### Async Client
```python
import asyncio
import grpc
from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

async def run_async_client():
    async with grpc.aio.insecure_channel('localhost:50051') as channel:
        stub = GreeterStub(channel)

        request = HelloRequest(name='Async World')
        response = await stub.SayHello(request)

        print(f"Async Response: {response.message}")

if __name__ == '__main__':
    asyncio.run(run_async_client())
```

## Error Handling

### Server-Side Error Handling
```python
import grpc
from proto.generated.service_pb2 import User, ErrorResponse

class UserService(UserServiceServicer):
    def GetUser(self, request, context):
        try:
            # Validate input
            if not request.user_id or request.user_id <= 0:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details('Invalid user ID')
                return User()

            # Business logic
            user = self.get_user_from_db(request.user_id)
            if not user:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details('User not found')
                return User()

            return User(id=user.id, name=user.name, email=user.email)

        except DatabaseError as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details('Database error')
            return User()
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details('Internal server error')
            return User()
```

### Client-Side Error Handling
```python
import grpc
from grpc import RpcError

def get_user_with_error_handling(stub, user_id):
    request = GetUserRequest(user_id=user_id)

    try:
        response = stub.GetUser(request)
        return response
    except RpcError as e:
        if e.code() == grpc.StatusCode.NOT_FOUND:
            print(f"User {user_id} not found")
            return None
        elif e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            print(f"Invalid user ID: {user_id}")
            return None
        elif e.code() == grpc.StatusCode.INTERNAL:
            print("Server internal error")
            return None
        else:
            print(f"Unexpected error: {e.code()} - {e.details()}")
            return None
```

## Connection Management

### Channel Configuration
```python
import grpc

# Basic insecure channel
channel = grpc.insecure_channel('localhost:50051')

# Secure channel with TLS
credentials = grpc.ssl_channel_credentials()
channel = grpc.secure_channel('api.example.com:443', credentials)

# Channel with custom options
options = [
    ('grpc.keepalive_time_ms', 30000),
    ('grpc.keepalive_timeout_ms', 5000),
    ('grpc.http2.max_pings_without_data', 0),
]
channel = grpc.insecure_channel('localhost:50051', options=options)
```

### Connection Pooling
```python
from grpc import aio

class ConnectionPool:
    def __init__(self):
        self.channels = {}

    async def get_channel(self, target):
        if target not in self.channels:
            self.channels[target] = await aio.insecure_channel(target)
        return self.channels[target]

    async def close_all(self):
        for channel in self.channels.values():
            await channel.close()
        self.channels.clear()
```

## Streaming RPCs

### Server Streaming
```python
class DataService(DataServiceServicer):
    def GetDataStream(self, request, context):
        # Simulate streaming data
        for i in range(request.count):
            if not context.is_active():
                break

            data_chunk = DataChunk(
                id=i,
                data=f"Chunk {i}",
                timestamp=time.time()
            )

            yield data_chunk
            time.sleep(0.1)  # Simulate processing time
```

### Client Streaming
```python
class UploadService(UploadServiceServicer):
    def UploadFile(self, request_iterator, context):
        total_size = 0
        chunks_received = 0

        for chunk in request_iterator:
            total_size += len(chunk.data)
            chunks_received += 1

            # Process chunk
            self.process_chunk(chunk)

        return UploadResponse(
            file_id=str(uuid.uuid4()),
            total_size=total_size,
            chunks_received=chunks_received
        )
```

### Bidirectional Streaming
```python
class ChatService(ChatServiceServicer):
    def Chat(self, request_iterator, context):
        # Handle incoming messages and send responses
        for message in request_iterator:
            # Process message
            response = self.process_message(message)

            # Send response
            yield ChatMessage(
                sender="server",
                content=f"Echo: {message.content}",
                timestamp=time.time()
            )
```

## Interceptors

### Server Interceptors
```python
class LoggingInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        def logging_wrapper(behavior, request, context):
            start_time = time.time()

            # Log request
            print(f"Request: {handler_call_details.method}")

            try:
                response = behavior(request, context)
                duration = time.time() - start_time
                print(f"Response: {handler_call_details.method} - {duration:.3f}s")
                return response
            except Exception as e:
                duration = time.time() - start_time
                print(f"Error: {handler_call_details.method} - {duration:.3f}s - {e}")
                raise

        return logging_wrapper

# Add interceptor to server
server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    interceptors=[LoggingInterceptor()]
)
```

### Client Interceptors
```python
class AuthInterceptor(grpc.UnaryUnaryClientInterceptor):
    def __init__(self, token):
        self.token = token

    def intercept_unary_unary(self, continuation, client_call_details, request):
        # Add authorization header
        metadata = list(client_call_details.metadata or [])
        metadata.append(('authorization', f'Bearer {self.token}'))

        new_details = client_call_details._replace(metadata=metadata)
        return continuation(new_details, request)

# Use interceptor with client
interceptor = AuthInterceptor('my-token')
channel = grpc.intercept_channel(
    grpc.insecure_channel('localhost:50051'),
    interceptor
)
```

## Testing gRPC Services

### Unit Testing Services
```python
import pytest
from unittest.mock import Mock
from proto.generated.user_pb2 import GetUserRequest, User
from services.user_service import UserService

class TestUserService:
    def test_get_user_success(self):
        # Mock repository
        mock_repo = Mock()
        mock_repo.get_user.return_value = Mock(id=1, name="John", email="john@example.com")

        service = UserService(mock_repo)

        # Create mock context
        context = Mock()

        # Call service method
        request = GetUserRequest(user_id=1)
        response = service.GetUser(request, context)

        # Assertions
        assert response.id == 1
        assert response.name == "John"
        assert response.email == "john@example.com"
        mock_repo.get_user.assert_called_once_with(1)

    def test_get_user_not_found(self):
        mock_repo = Mock()
        mock_repo.get_user.return_value = None

        service = UserService(mock_repo)
        context = Mock()

        request = GetUserRequest(user_id=999)
        response = service.GetUser(request, context)

        # Check that error was set
        context.set_code.assert_called_with(grpc.StatusCode.NOT_FOUND)
        context.set_details.assert_called_with('User not found')
```

### Integration Testing
```python
import pytest
import grpc
from concurrent import futures
from proto.generated.user_pb2_grpc import UserServiceStub

@pytest.fixture(scope="module")
def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add your service implementation
    user_service = UserService()
    add_UserServiceServicer_to_server(user_service, server)

    server.add_insecure_port('[::]:0')  # Use random port
    server.start()

    yield server

    server.stop(None)

@pytest.fixture(scope="module")
def grpc_client(grpc_server):
    # Get the actual port the server is running on
    port = grpc_server._server.server_port
    channel = grpc.insecure_channel(f'localhost:{port}')
    client = UserServiceStub(channel)

    yield client

    channel.close()

def test_get_user_integration(grpc_client):
    request = GetUserRequest(user_id=1)
    response = grpc_client.GetUser(request)

    assert response.id == 1
    assert response.name == "Test User"
```

## Performance Optimization

### Connection Reuse
```python
class ConnectionManager:
    def __init__(self):
        self.channels = {}

    def get_channel(self, target):
        if target not in self.channels:
            self.channels[target] = grpc.insecure_channel(target)
        return self.channels[target]

    def close_all(self):
        for channel in self.channels.values():
            channel.close()
        self.channels.clear()
```

### Load Balancing
```python
# DNS-based load balancing
channel = grpc.insecure_channel('dns:///my-service:50051')

# Custom load balancing
from grpc import experimental
channel = experimental.insecure_channel(
    'localhost:50051,localhost:50052,localhost:50053'
)
```

### Compression
```python
# Enable gzip compression
options = [
    ('grpc.default_compression_algorithm', grpc.CompressionAlgorithm.gzip),
    ('grpc.default_compression_level', grpc.CompressionLevel.medium),
]
channel = grpc.insecure_channel('localhost:50051', options=options)
```

## Best Practices

### Service Design
- Keep services focused on a single domain
- Use consistent naming conventions
- Implement proper error handling
- Add request validation
- Use appropriate RPC types (unary, streaming)

### Client Implementation
- Reuse channels when possible
- Implement proper error handling
- Use timeouts for requests
- Implement retry logic for transient failures
- Close channels when done

### Performance
- Use connection pooling
- Implement request batching
- Use streaming for large data
- Monitor service metrics
- Optimize message sizes

## Hands-on Exercises

### Exercise 1: Basic Service Implementation
1. Create a simple calculator service
2. Implement basic arithmetic operations
3. Add proper error handling
4. Create a client to test the service

### Exercise 2: User Management Service
1. Design a user management service
2. Implement CRUD operations
3. Add authentication checks
4. Create comprehensive tests

### Exercise 3: Streaming Service
1. Implement a file upload service with streaming
2. Add progress tracking
3. Implement bidirectional chat service
4. Test with multiple clients

## Next Steps
- [Streaming RPC Tutorial](../tutorials/05-streaming-rpc.md)
- [Workshop: Basic gRPC Service](../workshops/workshop-01-basic-grpc.md)

## Additional Resources
- [gRPC Python Basics](https://grpc.io/docs/languages/python/basics/)
- [Error Handling](https://grpc.io/docs/guides/error/)
- [Interceptors](https://grpc.io/docs/guides/interceptors/)
- [Performance Best Practices](https://grpc.io/docs/guides/performance/)

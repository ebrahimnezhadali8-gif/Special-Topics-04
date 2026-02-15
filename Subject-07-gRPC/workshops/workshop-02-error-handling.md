# Workshop 02: Error Handling in gRPC Services

## Overview
This workshop focuses on implementing comprehensive error handling in gRPC services. You'll learn how to handle different types of errors, implement proper status codes, create custom error messages, and build robust error handling on both server and client sides.

## Prerequisites
- Completed [Basic gRPC Workshop](../workshops/workshop-01-basic-grpc.md)
- Understanding of gRPC services and clients

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement proper gRPC status codes and error messages
- Handle different types of errors (validation, business logic, system errors)
- Create custom error handling middleware
- Build resilient clients with retry logic
- Test error scenarios comprehensively

## Workshop Structure

### Part 1: Understanding gRPC Errors

#### Step 1: gRPC Status Codes

gRPC uses standard status codes defined in the gRPC specification. Learn the most common ones:

| Status Code | Description | Use Case |
|-------------|-------------|----------|
| OK | Success | Normal operation |
| CANCELLED | Cancelled | Client cancelled request |
| UNKNOWN | Unknown error | Unexpected error |
| INVALID_ARGUMENT | Invalid argument | Bad request data |
| DEADLINE_EXCEEDED | Deadline exceeded | Request timeout |
| NOT_FOUND | Not found | Resource doesn't exist |
| ALREADY_EXISTS | Already exists | Resource conflict |
| PERMISSION_DENIED | Permission denied | Authorization failure |
| UNAUTHENTICATED | Unauthenticated | Authentication required |
| RESOURCE_EXHAUSTED | Resource exhausted | Rate limiting, quotas |
| FAILED_PRECONDITION | Failed precondition | Invalid state |
| ABORTED | Aborted | Concurrency conflict |
| OUT_OF_RANGE | Out of range | Invalid range |
| UNIMPLEMENTED | Unimplemented | Method not implemented |
| INTERNAL | Internal error | Server bug |
| UNAVAILABLE | Unavailable | Service down |
| DATA_LOSS | Data loss | Data corruption |

#### Step 2: Create Error Handling Service

Create a service that demonstrates different error scenarios.

**proto/error_demo.proto:**
```protobuf
syntax = "proto3";

package error_demo;

service ErrorDemoService {
  rpc ProcessData (DataRequest) returns (DataResponse);
  rpc AuthenticateUser (AuthRequest) returns (AuthResponse);
  rpc ProcessStream (stream StreamRequest) returns (stream StreamResponse);
}

message DataRequest {
  string data = 1;
  int32 operation_type = 2;
}

message DataResponse {
  string result = 1;
  string message = 2;
}

message AuthRequest {
  string username = 1;
  string password = 2;
}

message AuthResponse {
  string token = 1;
  string user_id = 2;
}

message StreamRequest {
  string data = 1;
  int32 sequence = 2;
}

message StreamResponse {
  string result = 1;
  int32 sequence = 2;
}
```

### Part 2: Server-Side Error Handling

#### Step 3: Implement Error Demo Service

**services/error_demo_service.py:**
```python
import grpc
from proto.error_demo_pb2 import (
    DataResponse, AuthResponse, StreamResponse
)
from proto.error_demo_pb2_grpc import ErrorDemoServiceServicer
import time
import random

class ErrorDemoService(ErrorDemoServiceServicer):
    """Service that demonstrates various error handling scenarios"""

    def ProcessData(self, request, context):
        """Process data with various error scenarios"""
        try:
            # Validate input
            if not request.data:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Data field cannot be empty")
                return DataResponse()

            # Simulate different operations
            if request.operation_type == 1:
                # Success case
                result = f"Processed: {request.data.upper()}"
                return DataResponse(result=result, message="Success")

            elif request.operation_type == 2:
                # Not found error
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(f"Data '{request.data}' not found in database")
                return DataResponse()

            elif request.operation_type == 3:
                # Permission denied
                context.set_code(grpc.StatusCode.PERMISSION_DENIED)
                context.set_details("You don't have permission to perform this operation")
                return DataResponse()

            elif request.operation_type == 4:
                # Resource exhausted (rate limiting)
                context.set_code(grpc.StatusCode.RESOURCE_EXHAUSTED)
                context.set_details("Rate limit exceeded. Try again later.")
                return DataResponse()

            elif request.operation_type == 5:
                # Internal error
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details("An internal server error occurred")
                return DataResponse()

            else:
                # Invalid argument
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details(f"Unknown operation type: {request.operation_type}")
                return DataResponse()

        except Exception as e:
            # Catch-all for unexpected errors
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Unexpected error: {str(e)}")
            return DataResponse()

    def AuthenticateUser(self, request, context):
        """Authenticate user with various auth scenarios"""
        try:
            # Validate input
            if not request.username or not request.password:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Username and password are required")
                return AuthResponse()

            # Simulate authentication scenarios
            if request.username == "admin" and request.password == "admin123":
                # Success
                return AuthResponse(
                    token="fake-jwt-token-admin",
                    user_id="user-admin-123"
                )

            elif request.username == "locked":
                # Account locked
                context.set_code(grpc.StatusCode.PERMISSION_DENIED)
                context.set_details("Account is locked. Contact support.")
                return AuthResponse()

            elif request.username == "expired":
                # Token expired (though this is auth, not login)
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Credentials have expired")
                return AuthResponse()

            else:
                # Invalid credentials
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Invalid username or password")
                return AuthResponse()

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Authentication error: {str(e)}")
            return AuthResponse()

    def ProcessStream(self, request_iterator, context):
        """Process streaming data with error handling"""
        sequence_num = 0

        try:
            for request in request_iterator:
                sequence_num += 1

                # Simulate processing
                time.sleep(0.1)

                # Random error simulation
                if random.random() < 0.1:  # 10% chance of error
                    error_type = random.choice(['validation', 'processing', 'timeout'])

                    if error_type == 'validation':
                        context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                        context.set_details(f"Invalid data in sequence {sequence_num}")
                        return
                    elif error_type == 'processing':
                        context.set_code(grpc.StatusCode.INTERNAL)
                        context.set_details(f"Processing failed at sequence {sequence_num}")
                        return
                    elif error_type == 'timeout':
                        context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                        context.set_details(f"Processing timeout at sequence {sequence_num}")
                        return

                # Success response
                yield StreamResponse(
                    result=f"Processed: {request.data}",
                    sequence=sequence_num
                )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Stream processing error: {str(e)}")
```

#### Step 4: Create Error Handling Server

**services/error_server.py:**
```python
from concurrent import futures
import grpc
import logging
from error_demo_service import ErrorDemoService
from proto.error_demo_pb2_grpc import add_ErrorDemoServiceServicer_to_server

def create_server():
    """Create gRPC server with error handling"""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_send_message_length', 50 * 1024 * 1024),  # 50MB
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),  # 50MB
        ]
    )

    # Add service
    service = ErrorDemoService()
    add_ErrorDemoServiceServicer_to_server(service, server)

    return server

def serve():
    """Start the server"""
    server = create_server()
    server.add_insecure_port('[::]:50052')

    server.start()
    print("Error Demo Server started on port 50052")
    print("Press Ctrl+C to stop")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.stop(0)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
```

### Part 3: Client-Side Error Handling

#### Step 5: Create Robust Error-Handling Client

**clients/error_client.py:**
```python
import grpc
import sys
from proto.error_demo_pb2 import (
    DataRequest, AuthRequest, StreamRequest
)
from proto.error_demo_pb2_grpc import ErrorDemoServiceStub

class ErrorHandlingClient:
    """gRPC client with comprehensive error handling"""

    def __init__(self, host='localhost', port=50052):
        self.channel = grpc.insecure_channel(f'{host}:{port}')
        self.stub = ErrorDemoServiceStub(self.channel)

    def process_data(self, data, operation_type):
        """Process data with error handling"""
        request = DataRequest(data=data, operation_type=operation_type)

        try:
            response = self.stub.ProcessData(request, timeout=5.0)
            print(f"✅ Success: {response.result}")
            if response.message:
                print(f"   Message: {response.message}")

        except grpc.RpcError as e:
            self._handle_grpc_error(e, "ProcessData")

    def authenticate(self, username, password):
        """Authenticate user with error handling"""
        request = AuthRequest(username=username, password=password)

        try:
            response = self.stub.AuthenticateUser(request, timeout=5.0)
            print("✅ Authentication successful!"            print(f"   Token: {response.token}")
            print(f"   User ID: {response.user_id}")

        except grpc.RpcError as e:
            self._handle_grpc_error(e, "AuthenticateUser")

    def process_stream(self, data_items):
        """Process streaming data with error handling"""
        def request_generator():
            for i, data in enumerate(data_items, 1):
                yield StreamRequest(data=data, sequence=i)

        try:
            print("Starting stream processing...")
            responses = self.stub.ProcessStream(request_generator(), timeout=30.0)

            for response in responses:
                print(f"✅ Stream response {response.sequence}: {response.result}")

            print("Stream processing completed!")

        except grpc.RpcError as e:
            self._handle_grpc_error(e, "ProcessStream")

    def _handle_grpc_error(self, error, operation):
        """Handle gRPC errors with appropriate user-friendly messages"""
        status_code = error.code()
        details = error.details()

        print(f"❌ {operation} failed: {status_code.name}")

        # Provide user-friendly error messages
        if status_code == grpc.StatusCode.INVALID_ARGUMENT:
            print(f"   Invalid input: {details}")
        elif status_code == grpc.StatusCode.NOT_FOUND:
            print(f"   Resource not found: {details}")
        elif status_code == grpc.StatusCode.PERMISSION_DENIED:
            print(f"   Permission denied: {details}")
        elif status_code == grpc.StatusCode.UNAUTHENTICATED:
            print(f"   Authentication failed: {details}")
        elif status_code == grpc.StatusCode.RESOURCE_EXHAUSTED:
            print(f"   Resource limit exceeded: {details}")
        elif status_code == grpc.StatusCode.INTERNAL:
            print(f"   Server error: {details}")
        elif status_code == grpc.StatusCode.UNAVAILABLE:
            print(f"   Service unavailable: {details}")
        elif status_code == grpc.StatusCode.DEADLINE_EXCEEDED:
            print(f"   Request timeout: {details}")
        else:
            print(f"   Error details: {details}")

def interactive_demo():
    """Interactive demo of error scenarios"""
    client = ErrorHandlingClient()

    try:
        while True:
            print("\n=== Error Handling Demo ===")
            print("1. Test ProcessData - Success")
            print("2. Test ProcessData - Empty data")
            print("3. Test ProcessData - Not found")
            print("4. Test ProcessData - Permission denied")
            print("5. Test ProcessData - Rate limited")
            print("6. Test Authentication - Success")
            print("7. Test Authentication - Invalid credentials")
            print("8. Test Authentication - Account locked")
            print("9. Test Stream Processing")
            print("0. Quit")

            choice = input("Choose test case (0-9): ").strip()

            if choice == '0':
                break

            try:
                if choice == '1':
                    client.process_data("Hello World", 1)
                elif choice == '2':
                    client.process_data("", 1)
                elif choice == '3':
                    client.process_data("nonexistent", 2)
                elif choice == '4':
                    client.process_data("restricted", 3)
                elif choice == '5':
                    client.process_data("flood", 4)
                elif choice == '6':
                    client.authenticate("admin", "admin123")
                elif choice == '7':
                    client.authenticate("wrong", "wrong")
                elif choice == '8':
                    client.authenticate("locked", "password")
                elif choice == '9':
                    client.process_stream(["item1", "item2", "item3", "error", "item5"])

            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Unexpected error: {e}")

    finally:
        client.close()

def automated_demo():
    """Automated demo of all error scenarios"""
    client = ErrorHandlingClient()

    print("=== Automated Error Handling Demo ===")

    # ProcessData tests
    print("\n--- ProcessData Tests ---")
    client.process_data("Hello World", 1)  # Success
    client.process_data("", 1)             # Empty data
    client.process_data("missing", 2)      # Not found
    client.process_data("denied", 3)       # Permission denied
    client.process_data("limited", 4)      # Rate limited

    # Authentication tests
    print("\n--- Authentication Tests ---")
    client.authenticate("admin", "admin123")  # Success
    client.authenticate("bad", "creds")       # Invalid
    client.authenticate("locked", "pass")     # Locked

    # Stream processing
    print("\n--- Stream Processing Test ---")
    client.process_stream(["data1", "data2", "data3"])

    client.close()
    print("\nDemo completed!")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--auto':
        automated_demo()
    else:
        interactive_demo()
```

### Part 4: Testing Error Scenarios

#### Step 6: Comprehensive Error Tests

**tests/test_error_handling.py:**
```python
import pytest
import grpc
from unittest.mock import Mock
from services.error_demo_service import ErrorDemoService
from clients.error_client import ErrorHandlingClient

class TestErrorDemoService:
    def setup_method(self):
        self.service = ErrorDemoService()

    def test_process_data_success(self):
        """Test successful data processing"""
        context = Mock()
        request = Mock()
        request.data = "test data"
        request.operation_type = 1

        response = self.service.ProcessData(request, context)

        assert response.result == "Processed: TEST DATA"
        assert response.message == "Success"

    def test_process_data_empty_input(self):
        """Test empty data validation"""
        context = Mock()
        request = Mock()
        request.data = ""

        response = self.service.ProcessData(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.INVALID_ARGUMENT)
        context.set_details.assert_called_with("Data field cannot be empty")

    def test_process_data_not_found(self):
        """Test not found error"""
        context = Mock()
        request = Mock()
        request.data = "missing"
        request.operation_type = 2

        response = self.service.ProcessData(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.NOT_FOUND)
        context.set_details.assert_called_with("Data 'missing' not found in database")

    def test_authenticate_success(self):
        """Test successful authentication"""
        context = Mock()
        request = Mock()
        request.username = "admin"
        request.password = "admin123"

        response = self.service.AuthenticateUser(request, context)

        assert response.token == "fake-jwt-token-admin"
        assert response.user_id == "user-admin-123"

    def test_authenticate_invalid_credentials(self):
        """Test invalid credentials"""
        context = Mock()
        request = Mock()
        request.username = "wrong"
        request.password = "wrong"

        response = self.service.AuthenticateUser(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.UNAUTHENTICATED)
        context.set_details.assert_called_with("Invalid username or password")

class TestErrorHandlingClient:
    def setup_method(self):
        self.client = ErrorHandlingClient()

    def teardown_method(self):
        self.client.close()

    def test_handle_invalid_argument_error(self):
        """Test client handles INVALID_ARGUMENT error"""
        # This would normally test against a mock server
        # For demo purposes, we'll test the error handling logic
        pass

    def test_handle_not_found_error(self):
        """Test client handles NOT_FOUND error"""
        pass

    def test_handle_permission_denied_error(self):
        """Test client handles PERMISSION_DENIED error"""
        pass
```

### Part 5: Advanced Error Handling Patterns

#### Step 7: Retry Logic and Circuit Breaker

**clients/resilient_client.py:**
```python
import grpc
import time
import random
from functools import wraps
from proto.error_demo_pb2 import DataRequest
from proto.error_demo_pb2_grpc import ErrorDemoServiceStub

class ResilientClient:
    """gRPC client with retry logic and circuit breaker"""

    def __init__(self, host='localhost', port=50052, max_retries=3):
        self.host = host
        self.port = port
        self.max_retries = max_retries
        self.channel = None
        self.stub = None
        self.connect()

    def connect(self):
        """Establish connection"""
        if self.channel:
            self.channel.close()

        self.channel = grpc.insecure_channel(f'{self.host}:{self.port}')
        self.stub = ErrorDemoServiceStub(self.channel)

    def retry_on_failure(retries=3, backoff_factor=0.5):
        """Decorator for retry logic"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                last_exception = None

                for attempt in range(retries):
                    try:
                        return func(*args, **kwargs)
                    except grpc.RpcError as e:
                        last_exception = e

                        # Don't retry on certain errors
                        if e.code() in [
                            grpc.StatusCode.INVALID_ARGUMENT,
                            grpc.StatusCode.PERMISSION_DENIED,
                            grpc.StatusCode.UNAUTHENTICATED
                        ]:
                            raise e

                        if attempt < retries - 1:
                            wait_time = backoff_factor * (2 ** attempt) + random.uniform(0, 0.1)
                            print(f"Attempt {attempt + 1} failed, retrying in {wait_time:.2f}s...")
                            time.sleep(wait_time)
                        else:
                            print(f"All {retries} attempts failed")

                raise last_exception
            return wrapper
        return decorator

    @retry_on_failure(retries=3)
    def process_data_safe(self, data, operation_type):
        """Process data with retry logic"""
        request = DataRequest(data=data, operation_type=operation_type)

        try:
            response = self.stub.ProcessData(request, timeout=5.0)
            return response

        except grpc.RpcError as e:
            # Reconnect on UNAVAILABLE errors
            if e.code() == grpc.StatusCode.UNAVAILABLE:
                print("Service unavailable, reconnecting...")
                self.connect()
            raise e

    def close(self):
        """Close connection"""
        if self.channel:
            self.channel.close()
```

#### Step 8: Error Monitoring and Logging

**services/error_monitoring.py:**
```python
import grpc
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ErrorMonitor:
    """Monitor and log gRPC errors"""

    def __init__(self, window_minutes=5):
        self.window_minutes = window_minutes
        self.errors = defaultdict(lambda: deque(maxlen=1000))
        self.start_time = datetime.now()

    def log_error(self, method_name, error_code, error_details, client_ip=None):
        """Log an error occurrence"""
        timestamp = datetime.now()

        error_record = {
            'timestamp': timestamp,
            'method': method_name,
            'code': error_code,
            'details': error_details,
            'client_ip': client_ip
        }

        self.errors[method_name].append(error_record)

        # Log to file/system
        logger.warning(f"gRPC Error - Method: {method_name}, Code: {error_code}, Details: {error_details}")

        # Check for error spikes
        self._check_error_rate(method_name)

    def _check_error_rate(self, method_name):
        """Check if error rate is abnormally high"""
        window_start = datetime.now() - timedelta(minutes=self.window_minutes)
        recent_errors = [e for e in self.errors[method_name] if e['timestamp'] > window_start]

        if len(recent_errors) > 10:  # Threshold for alerting
            logger.error(f"High error rate detected for {method_name}: {len(recent_errors)} errors in {self.window_minutes} minutes")

    def get_error_stats(self, method_name=None):
        """Get error statistics"""
        if method_name:
            errors = list(self.errors[method_name])
        else:
            errors = []
            for method_errors in self.errors.values():
                errors.extend(method_errors)

        if not errors:
            return {"total_errors": 0, "methods": {}}

        # Group by error code
        by_code = defaultdict(int)
        for error in errors:
            by_code[error['code']] += 1

        # Group by method
        by_method = defaultdict(int)
        for error in errors:
            by_method[error['method']] += 1

        return {
            "total_errors": len(errors),
            "by_error_code": dict(by_code),
            "by_method": dict(by_method),
            "time_window": f"{self.window_minutes} minutes"
        }

# Global error monitor
error_monitor = ErrorMonitor()

class ErrorMonitoringInterceptor(grpc.ServerInterceptor):
    """Interceptor that monitors all gRPC calls"""

    def intercept_service(self, continuation, handler_call_details):
        def monitoring_wrapper(behavior, request, context):
            start_time = time.time()

            try:
                response = behavior(request, context)
                duration = time.time() - start_time

                # Log successful calls (optional)
                if duration > 1.0:  # Log slow calls
                    logger.info(f"Slow call: {handler_call_details.method} took {duration:.2f}s")

                return response

            except grpc.RpcError as e:
                duration = time.time() - start_time

                # Log the error
                error_monitor.log_error(
                    method_name=handler_call_details.method,
                    error_code=e.code().name,
                    error_details=e.details(),
                    client_ip=self._get_client_ip(context)
                )

                raise e

        return monitoring_wrapper

    def _get_client_ip(self, context):
        """Extract client IP from context (if available)"""
        # In real implementation, extract from metadata or peer info
        return "unknown"
```

## Running the Workshop

### Start the Error Demo Server
```bash
python services/error_server.py
```

### Test Error Scenarios
```bash
# Terminal 2: Interactive error testing
python clients/error_client.py

# Terminal 3: Automated error demo
python clients/error_client.py --auto
```

### Run Tests
```bash
pytest tests/test_error_handling.py -v
```

## Challenge Exercises

### Challenge 1: Custom Error Types
1. Create custom error messages with structured data
2. Implement error codes specific to your domain
3. Add error localization support

### Challenge 2: Circuit Breaker Pattern
1. Implement circuit breaker for failing services
2. Add exponential backoff retry logic
3. Create fallback responses for degraded service

### Challenge 3: Error Aggregation Service
1. Create a service that aggregates errors from multiple services
2. Implement error correlation and root cause analysis
3. Add alerting based on error patterns

## Verification Checklist

### Server-Side Error Handling
- [ ] Proper gRPC status codes implemented
- [ ] Detailed error messages provided
- [ ] Input validation working
- [ ] Different error scenarios handled
- [ ] Streaming errors managed correctly

### Client-Side Error Handling
- [ ] All gRPC status codes handled
- [ ] User-friendly error messages
- [ ] Retry logic implemented
- [ ] Connection issues managed
- [ ] Timeout handling working

### Testing and Monitoring
- [ ] Error scenarios tested comprehensively
- [ ] Error monitoring implemented
- [ ] Logging working correctly
- [ ] Performance impact measured
- [ ] Recovery mechanisms tested

## Troubleshooting

### Common Error Handling Issues

**Status codes not working:**
- Ensure context.set_code() is called before returning
- Check that the method returns after setting error
- Verify client handles the specific status code

**Error messages not detailed enough:**
- Use context.set_details() with descriptive messages
- Include relevant context information
- Avoid exposing sensitive internal details

**Client retry logic not working:**
- Check exception handling catches the right RpcError types
- Ensure channel is properly recreated on reconnection
- Verify timeout values are reasonable

**Memory leaks in error handling:**
- Clear large error message strings
- Use bounded queues for error logs
- Implement periodic cleanup of error history

## Next Steps
- [Streaming RPC Tutorial](../tutorials/05-streaming-rpc.md)
- [Workshop: Streaming Workshop](../workshops/workshop-03-streaming.md)

## Additional Resources
- [gRPC Error Handling Guide](https://grpc.io/docs/guides/error/)
- [Status Code Reference](https://grpc.io/docs/guides/status-codes/)
- [Error Details Best Practices](https://grpc.io/docs/guides/error-details/)
- [Circuit Breaker Pattern](https://microservices.io/patterns/reliability/circuit-breaker.html)

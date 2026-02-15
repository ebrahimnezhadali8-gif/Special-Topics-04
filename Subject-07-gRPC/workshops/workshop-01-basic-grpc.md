# Workshop 01: Building Your First gRPC Service and Client

## Overview
This workshop guides you through creating your first gRPC service and client in Python. You'll define a Protocol Buffer service, implement a server, build a client, and test the complete communication flow.

## Prerequisites
- Python 3.8+ installed
- Protocol Buffer compiler installed ([Installation Guide](../installation/grpc-setup.md))
- Basic understanding of Python and command line

## Learning Objectives
By the end of this workshop, you will be able to:
- Define a Protocol Buffer service and messages
- Generate Python code from .proto files
- Implement a gRPC server with service methods
- Create a gRPC client to call service methods
- Test the complete gRPC communication flow

## Workshop Setup

### Step 1: Create Project Structure

```bash
mkdir grpc-workshop
cd grpc-workshop

# Create virtual environment
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
uv add grpcio grpcio-tools protobuf

# Create project structure
mkdir -p proto services clients
touch proto/__init__.py services/__init__.py clients/__init__.py
```

### Step 2: Define Protocol Buffer Service

Create your first .proto file that defines the service and message types.

**proto/calculator.proto:**
```protobuf
syntax = "proto3";

package calculator;

// Calculator service definition
service Calculator {
  // Unary RPC - simple request/response
  rpc Add (AddRequest) returns (AddResponse);
  rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
  rpc Divide (DivideRequest) returns (DivideResponse);
}

// Message definitions
message AddRequest {
  double a = 1;
  double b = 2;
}

message AddResponse {
  double result = 1;
}

message MultiplyRequest {
  double a = 1;
  double b = 2;
}

message MultiplyResponse {
  double result = 1;
}

message DivideRequest {
  double dividend = 1;
  double divisor = 2;
}

message DivideResponse {
  double quotient = 1;
  double remainder = 2;
}
```

### Step 3: Generate Python Code

Generate the Python client and server code from your .proto file.

```bash
# Generate Python code
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=proto \
  --grpc_python_out=proto \
  proto/calculator.proto

# Create __init__.py file
touch proto/__init__.py

# Verify generated files
ls -la proto/
```

**Expected output:**
```
total 32
drwxr-xr-x  6 user  staff   192 Dec  1 10:00 .
-rw-r--r--  1 user  staff    28 Dec  1 10:00 __init__.py
-rw-r--r--  1 user  staff   462 Dec  1 10:00 calculator_pb2.py
-rw-r--r--  1 user  staff  2079 Dec  1 10:00 calculator_pb2_grpc.py
-rw-r--r--  1 user  staff   423 Dec  1 10:00 calculator.proto
```

### Step 4: Implement the Server

Create a gRPC server that implements the Calculator service.

**services/server.py:**
```python
from concurrent import futures
import grpc
import logging

# Import generated code
from proto.calculator_pb2 import AddResponse, MultiplyResponse, DivideResponse
from proto.calculator_pb2_grpc import CalculatorServicer, add_CalculatorServicer_to_server

class CalculatorService(CalculatorServicer):
    """Implementation of the Calculator service"""

    def Add(self, request, context):
        """Add two numbers"""
        result = request.a + request.b
        print(f"Add: {request.a} + {request.b} = {result}")
        return AddResponse(result=result)

    def Multiply(self, request, context):
        """Multiply two numbers"""
        result = request.a * request.b
        print(f"Multiply: {request.a} * {request.b} = {result}")
        return MultiplyResponse(result=result)

    def Divide(self, request, context):
        """Divide two numbers and return quotient and remainder"""
        if request.divisor == 0:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Cannot divide by zero")
            return DivideResponse()

        quotient = request.dividend // request.divisor
        remainder = request.dividend % request.divisor
        print(f"Divide: {request.dividend} ÷ {request.divisor} = {quotient} remainder {remainder}")

        return DivideResponse(quotient=quotient, remainder=remainder)

def serve():
    """Start the gRPC server"""
    # Create server with thread pool
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add service implementation
    calculator_service = CalculatorService()
    add_CalculatorServicer_to_server(calculator_service, server)

    # Add insecure port (for development)
    server.add_insecure_port('[::]:50051')

    # Start server
    server.start()
    print("Calculator server started on port 50051")
    print("Press Ctrl+C to stop the server")

    # Wait for termination
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.stop(0)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
```

### Step 5: Implement the Client

Create a gRPC client that calls the Calculator service methods.

**clients/client.py:**
```python
import grpc
import sys

# Import generated code
from proto.calculator_pb2 import AddRequest, MultiplyRequest, DivideRequest
from proto.calculator_pb2_grpc import CalculatorStub

class CalculatorClient:
    """gRPC client for Calculator service"""

    def __init__(self, host='localhost', port=50051):
        """Initialize client with server connection"""
        self.channel = grpc.insecure_channel(f'{host}:{port}')
        self.stub = CalculatorStub(self.channel)

    def add(self, a, b):
        """Add two numbers"""
        request = AddRequest(a=a, b=b)
        try:
            response = self.stub.Add(request)
            return response.result
        except grpc.RpcError as e:
            print(f"Add failed: {e}")
            return None

    def multiply(self, a, b):
        """Multiply two numbers"""
        request = MultiplyRequest(a=a, b=b)
        try:
            response = self.stub.Multiply(request)
            return response.result
        except grpc.RpcError as e:
            print(f"Multiply failed: {e}")
            return None

    def divide(self, dividend, divisor):
        """Divide two numbers"""
        request = DivideRequest(dividend=dividend, divisor=divisor)
        try:
            response = self.stub.Divide(request)
            return response.quotient, response.remainder
        except grpc.RpcError as e:
            print(f"Divide failed: {e}")
            return None, None

    def close(self):
        """Close the connection"""
        self.channel.close()

def interactive_client():
    """Interactive client for testing"""
    client = CalculatorClient()

    try:
        while True:
            print("\n=== Calculator Client ===")
            print("1. Add")
            print("2. Multiply")
            print("3. Divide")
            print("4. Quit")

            choice = input("Choose operation (1-4): ").strip()

            if choice == '4':
                break

            try:
                if choice in ['1', '2', '3']:
                    a = float(input("Enter first number: "))
                    b = float(input("Enter second number: "))

                    if choice == '1':
                        result = client.add(a, b)
                        if result is not None:
                            print(f"{a} + {b} = {result}")

                    elif choice == '2':
                        result = client.multiply(a, b)
                        if result is not None:
                            print(f"{a} × {b} = {result}")

                    elif choice == '3':
                        quotient, remainder = client.divide(a, b)
                        if quotient is not None:
                            print(f"{a} ÷ {b} = {quotient} (remainder: {remainder})")

                else:
                    print("Invalid choice. Please select 1-4.")

            except ValueError:
                print("Invalid input. Please enter numbers.")

    except KeyboardInterrupt:
        print("\nExiting...")

    finally:
        client.close()

def demo_client():
    """Demonstration client"""
    client = CalculatorClient()

    print("=== Calculator Demo ===")

    # Test addition
    result = client.add(10, 5)
    print(f"10 + 5 = {result}")

    # Test multiplication
    result = client.multiply(6, 7)
    print(f"6 × 7 = {result}")

    # Test division
    quotient, remainder = client.divide(17, 3)
    print(f"17 ÷ 3 = {quotient} (remainder: {remainder})")

    # Test division by zero
    quotient, remainder = client.divide(10, 0)
    if quotient is None:
        print("Division by zero handled correctly")

    client.close()

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--demo':
        demo_client()
    else:
        interactive_client()
```

### Step 6: Test the Complete System

#### Start the Server
```bash
# Terminal 1: Start the server
python services/server.py
```

**Expected output:**
```
Calculator server started on port 50051
Press Ctrl+C to stop the server
```

#### Test with Demo Client
```bash
# Terminal 2: Run demo client
python clients/client.py --demo
```

**Expected output:**
```
=== Calculator Demo ===
10 + 5 = 15.0
6 × 7 = 42.0
17 ÷ 3 = 5.0 (remainder: 2.0)
Division by zero handled correctly
```

#### Test with Interactive Client
```bash
# Terminal 2: Run interactive client
python clients/client.py
```

**Expected interaction:**
```
=== Calculator Client ===
1. Add
2. Multiply
3. Divide
4. Quit
Choose operation (1-4): 1
Enter first number: 15
Enter second number: 27
15.0 + 27.0 = 42.0
```

### Step 7: Add Error Handling

Enhance the client with better error handling and the server with validation.

**Update services/server.py:**
```python
from concurrent import futures
import grpc
import logging
import math

# Import generated code
from proto.calculator_pb2 import AddResponse, MultiplyResponse, DivideResponse
from proto.calculator_pb2_grpc import CalculatorServicer, add_CalculatorServicer_to_server

class CalculatorService(CalculatorServicer):
    """Implementation of the Calculator service with validation"""

    def Add(self, request, context):
        """Add two numbers with validation"""
        try:
            # Validate inputs
            if not self._is_valid_number(request.a) or not self._is_valid_number(request.b):
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Invalid number provided")
                return AddResponse()

            result = request.a + request.b

            # Check for overflow (simple check)
            if not self._is_valid_number(result):
                context.set_code(grpc.StatusCode.OUT_OF_RANGE)
                context.set_details("Result is too large")
                return AddResponse()

            print(f"Add: {request.a} + {request.b} = {result}")
            return AddResponse(result=result)

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")
            return AddResponse()

    def Multiply(self, request, context):
        """Multiply two numbers with validation"""
        try:
            if not self._is_valid_number(request.a) or not self._is_valid_number(request.b):
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Invalid number provided")
                return MultiplyResponse()

            result = request.a * request.b

            if not self._is_valid_number(result):
                context.set_code(grpc.StatusCode.OUT_OF_RANGE)
                context.set_details("Result is too large")
                return MultiplyResponse()

            print(f"Multiply: {request.a} * {request.b} = {result}")
            return MultiplyResponse(result=result)

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")
            return MultiplyResponse()

    def Divide(self, request, context):
        """Divide two numbers with validation"""
        try:
            if not self._is_valid_number(request.dividend) or not self._is_valid_number(request.divisor):
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Invalid number provided")
                return DivideResponse()

            if request.divisor == 0:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Cannot divide by zero")
                return DivideResponse()

            quotient = request.dividend / request.divisor
            remainder = request.dividend % request.divisor

            # Handle floating point precision
            if request.dividend == int(request.dividend) and request.divisor == int(request.divisor):
                quotient = float(int(quotient))
                remainder = float(int(remainder))

            print(f"Divide: {request.dividend} ÷ {request.divisor} = {quotient} (remainder: {remainder})")

            return DivideResponse(quotient=quotient, remainder=remainder)

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal error: {str(e)}")
            return DivideResponse()

    def _is_valid_number(self, value):
        """Check if value is a valid finite number"""
        return isinstance(value, (int, float)) and math.isfinite(value)

def serve():
    """Start the gRPC server with error handling"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    calculator_service = CalculatorService()
    add_CalculatorServicer_to_server(calculator_service, server)

    server.add_insecure_port('[::]:50051')

    try:
        server.start()
        print("Calculator server started on port 50051")
        print("Press Ctrl+C to stop the server")
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        server.stop(5)  # Wait up to 5 seconds for ongoing calls
    except Exception as e:
        print(f"Server error: {e}")
        server.stop(0)

if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    serve()
```

### Step 8: Create Unit Tests

Create comprehensive tests for your gRPC service.

**tests/__init__.py:**
```python
# Test package
```

**tests/test_calculator.py:**
```python
import pytest
from unittest.mock import Mock
import grpc
from proto.calculator_pb2 import AddRequest, MultiplyRequest, DivideRequest
from services.server import CalculatorService

class TestCalculatorService:
    def test_add_success(self):
        """Test successful addition"""
        service = CalculatorService()
        context = Mock()

        request = AddRequest(a=10, b=5)
        response = service.Add(request, context)

        assert response.result == 15

    def test_add_invalid_input(self):
        """Test addition with invalid input"""
        service = CalculatorService()
        context = Mock()

        # Test with NaN
        request = AddRequest(a=float('nan'), b=5)
        response = service.Add(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.INVALID_ARGUMENT)
        context.set_details.assert_called_with("Invalid number provided")

    def test_multiply_success(self):
        """Test successful multiplication"""
        service = CalculatorService()
        context = Mock()

        request = MultiplyRequest(a=6, b=7)
        response = service.Multiply(request, context)

        assert response.result == 42

    def test_divide_success(self):
        """Test successful division"""
        service = CalculatorService()
        context = Mock()

        request = DivideRequest(dividend=17, divisor=3)
        response = service.Divide(request, context)

        assert response.quotient == 5
        assert response.remainder == 2

    def test_divide_by_zero(self):
        """Test division by zero"""
        service = CalculatorService()
        context = Mock()

        request = DivideRequest(dividend=10, divisor=0)
        response = service.Divide(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.INVALID_ARGUMENT)
        context.set_details.assert_called_with("Cannot divide by zero")

    def test_divide_invalid_input(self):
        """Test division with invalid input"""
        service = CalculatorService()
        context = Mock()

        request = DivideRequest(dividend=float('inf'), divisor=2)
        response = service.Divide(request, context)

        context.set_code.assert_called_with(grpc.StatusCode.INVALID_ARGUMENT)
        context.set_details.assert_called_with("Invalid number provided")

def test_calculator_service_instantiation():
    """Test that service can be instantiated"""
    service = CalculatorService()
    assert service is not None
```

**tests/test_client.py:**
```python
import pytest
from unittest.mock import Mock, patch
import grpc
from clients.client import CalculatorClient

class TestCalculatorClient:
    def setup_method(self):
        """Set up test fixtures"""
        self.client = CalculatorClient()

    def teardown_method(self):
        """Clean up after tests"""
        self.client.close()

    @patch('grpc.insecure_channel')
    def test_add_success(self, mock_channel):
        """Test successful addition"""
        # Mock the stub and response
        mock_stub = Mock()
        mock_response = Mock()
        mock_response.result = 15
        mock_stub.Add.return_value = mock_response
        mock_channel.return_value = Mock()

        # Replace the stub
        self.client.stub = mock_stub

        result = self.client.add(10, 5)

        assert result == 15
        mock_stub.Add.assert_called_once()

    @patch('grpc.insecure_channel')
    def test_add_grpc_error(self, mock_channel):
        """Test addition with gRPC error"""
        mock_stub = Mock()
        mock_stub.Add.side_effect = grpc.RpcError("Test error")
        mock_channel.return_value = Mock()

        self.client.stub = mock_stub

        result = self.client.add(10, 5)

        assert result is None

    @patch('grpc.insecure_channel')
    def test_multiply_success(self, mock_channel):
        """Test successful multiplication"""
        mock_stub = Mock()
        mock_response = Mock()
        mock_response.result = 42
        mock_stub.Multiply.return_value = mock_response
        mock_channel.return_value = Mock()

        self.client.stub = mock_stub

        result = self.client.multiply(6, 7)

        assert result == 42

    @patch('grpc.insecure_channel')
    def test_divide_success(self, mock_channel):
        """Test successful division"""
        mock_stub = Mock()
        mock_response = Mock()
        mock_response.quotient = 5
        mock_response.remainder = 2
        mock_stub.Divide.return_value = mock_response
        mock_channel.return_value = Mock()

        self.client.stub = mock_stub

        quotient, remainder = self.client.divide(17, 3)

        assert quotient == 5
        assert remainder == 2

    def test_client_initialization(self):
        """Test client initialization"""
        client = CalculatorClient(host='test-host', port=9999)
        assert client is not None
        client.close()
```

**pytest.ini:**
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --cov=services --cov=clients --cov-report=html
```

### Step 9: Run Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=services --cov=clients --cov-report=html

# Run specific test
pytest tests/test_calculator.py::TestCalculatorService::test_add_success -v
```

### Step 10: Add Documentation

Create a simple README for your project.

**README.md:**
```markdown
# gRPC Calculator Service

A simple gRPC service that provides basic calculator operations (addition, multiplication, division).

## Features

- Addition of two numbers
- Multiplication of two numbers
- Division with quotient and remainder
- Comprehensive error handling
- Unit tests with high coverage

## Running the Service

### Start Server
```bash
python services/server.py
```

### Run Client
```bash
# Interactive mode
python clients/client.py

# Demo mode
python clients/client.py --demo
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=services --cov=clients
```

## Protocol Buffer Definition

See `proto/calculator.proto` for the service definition.

## API Methods

- `Add(AddRequest) -> AddResponse`: Add two numbers
- `Multiply(MultiplyRequest) -> MultiplyResponse`: Multiply two numbers
- `Divide(DivideRequest) -> DivideResponse`: Divide two numbers with remainder
```

## Challenge Exercises

### Challenge 1: Add More Operations
1. Add subtraction operation
2. Add power/exponentiation
3. Add square root function
4. Update client and tests

### Challenge 2: Add History Feature
1. Add operation history storage
2. Create history retrieval method
3. Update client to show history
4. Add history clearing functionality

### Challenge 3: Add Authentication
1. Add basic authentication to service
2. Update client with authentication
3. Add authorization checks
4. Test authenticated and unauthenticated access

## Verification Checklist

- [ ] Protocol buffer file created and valid
- [ ] Python code generated successfully
- [ ] Server implements all service methods
- [ ] Client can connect and call all methods
- [ ] Error handling works for invalid inputs
- [ ] Unit tests created and passing
- [ ] Interactive client works correctly
- [ ] Documentation created

## Troubleshooting

### Common Issues

**"Module not found" errors:**
- Ensure generated Python files are in the correct location
- Check that `__init__.py` files exist
- Verify Python path includes project directory

**Connection refused:**
- Ensure server is running on the correct port
- Check firewall settings
- Verify host and port in client

**Protocol buffer compilation errors:**
- Check .proto file syntax
- Ensure protoc is installed and in PATH
- Verify import paths in .proto files

**Test failures:**
- Check test fixtures and setup
- Verify mock objects are configured correctly
- Look at test error messages for details

## Next Steps
- [Proto Syntax Tutorial](../tutorials/02-proto-syntax.md)
- [Workshop: Error Handling](../workshops/workshop-02-error-handling.md)

## Additional Resources
- [gRPC Python Quickstart](https://grpc.io/docs/languages/python/quickstart/)
- [Protocol Buffers Documentation](https://developers.google.com/protocol-buffers)
- [gRPC Error Handling](https://grpc.io/docs/guides/error/)

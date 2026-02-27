# gRPC Development Environment Setup

## Overview
This guide covers setting up a development environment for gRPC development, including protocol buffers, language-specific tools, and testing frameworks.

## Prerequisites
- Python 3.8+ installed
- Basic command line knowledge
- Understanding of API concepts
- Text editor or IDE

---

## Protocol Buffers Installation

### What are Protocol Buffers?
Protocol Buffers (protobuf) are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data.

### Install Protocol Buffer Compiler

**Windows:**
```powershell
# Download from GitHub releases
# https://github.com/protocolbuffers/protobuf/releases/latest
# Download protoc-*-win64.zip

# Extract and add to PATH
# Add protoc.exe to your system PATH
```

**macOS:**
```bash
# Using Homebrew
brew install protobuf

# Verify installation
protoc --version
```

**Linux (Ubuntu/Debian):**
```bash
# Install from package manager
sudo apt update
sudo apt install protobuf-compiler

# Or install from source
wget https://github.com/protocolbuffers/protobuf/releases/download/v25.0/protoc-25.0-linux-x86_64.zip
unzip protoc-25.0-linux-x86_64.zip
sudo mv bin/protoc /usr/local/bin/
sudo mv include/* /usr/local/include/

# Verify
protoc --version
```

---

## Python gRPC Setup

### Install gRPC Tools
```bash
# Initialize UV project
uv init

# Create virtual environment
uv venv

# Install gRPC packages
uv add grpcio grpcio-tools

# Additional useful packages
uv add protobuf
uv add grpcio-reflection  # For server reflection
uv add grpcio-testing    # For testing
```

### Verify Installation
```python
# Create test file
cat > test_grpc.py << 'EOF'
import grpc
print("gRPC version:", grpc.__version__)

# Test protobuf
import google.protobuf
print("Protobuf available")
EOF

# Run test
python test_grpc.py
```

---

## Project Structure Setup

### Create gRPC Project
```bash
mkdir grpc-project
cd grpc-project
uv venv
source .venv/bin/activate

# Install dependencies
uv add grpcio grpcio-tools protobuf grpcio-reflection

# Create project structure
mkdir -p proto services clients tests
touch proto/__init__.py
touch services/__init__.py
touch clients/__init__.py
touch tests/__init__.py
```

### Standard Project Structure
```
grpc-project/
├── .venv/
├── proto/              # Protocol buffer definitions
│   ├── __init__.py
│   ├── service.proto
│   └── generated/      # Auto-generated files
├── services/           # gRPC service implementations
│   ├── __init__.py
│   ├── server.py
│   └── service_impl.py
├── clients/            # gRPC clients
│   ├── __init__.py
│   ├── client.py
│   └── async_client.py
├── tests/              # Test files
│   ├── __init__.py
│   ├── test_server.py
│   └── test_client.py
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Protocol Buffer Development

### Create .proto File
```protobuf
// proto/service.proto
syntax = "proto3";

package greeter;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
  rpc SayHelloStream (HelloRequest) returns (stream HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
  int32 timestamp = 2;
}
```

### Generate Python Code
```bash
# Generate Python files from .proto
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=proto/generated \
  --grpc_python_out=proto/generated \
  proto/service.proto

# Create __init__.py in generated folder
touch proto/generated/__init__.py
```

### Generated Files
The protoc command generates:
- `service_pb2.py` - Message classes
- `service_pb2_grpc.py` - Client and server classes

---

## gRPC Server Implementation

### Basic Server
```python
# services/server.py
from concurrent import futures
import grpc
import time

from proto.generated.service_pb2 import HelloReply
from proto.generated.service_pb2_grpc import GreeterServicer, add_GreeterServicer_to_server

class GreeterService(GreeterServicer):
    def SayHello(self, request, context):
        return HelloReply(
            message=f"Hello, {request.name}!",
            timestamp=int(time.time())
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_GreeterServicer_to_server(GreeterService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("Server started on port 50051")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

---

## gRPC Client Implementation

### Basic Client
```python
# clients/client.py
import grpc

from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

def run():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = GreeterStub(channel)
        response = stub.SayHello(HelloRequest(name='World'))
        print(f"Response: {response.message}")
        print(f"Timestamp: {response.timestamp}")

if __name__ == '__main__':
    run()
```

### Async Client
```python
# clients/async_client.py
import asyncio
import grpc

from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

async def run():
    async with grpc.aio.insecure_channel('localhost:50051') as channel:
        stub = GreeterStub(channel)
        response = await stub.SayHello(HelloRequest(name='Async World'))
        print(f"Async Response: {response.message}")

if __name__ == '__main__':
    asyncio.run(run())
```

---

## Testing Setup

### Install Testing Dependencies
```bash
uv add pytest pytest-asyncio grpcio-testing
```

### Server Test
```python
# tests/test_server.py
import pytest
import grpc
from grpc.experimental import aio as grpc_aio

from services.server import GreeterService
from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

@pytest.fixture
def grpc_server():
    server = grpc.server()
    service = GreeterService()
    # Add service to server
    # server.add_insecure_port('[::]:0')
    # server.start()
    yield server
    server.stop(None)

def test_say_hello(grpc_server):
    # Test implementation
    pass
```

---

## Development Tools

### Code Generation Script
```bash
# generate_proto.sh (Linux/macOS)
#!/bin/bash
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=proto/generated \
  --grpc_python_out=proto/generated \
  proto/*.proto

# generate_proto.bat (Windows)
@echo off
python -m grpc_tools.protoc ^
  --proto_path=proto ^
  --python_out=proto/generated ^
  --grpc_python_out=proto/generated ^
  proto/*.proto
```

### VS Code Extensions
- `ms-vscode.vscode-proto3` - Protocol Buffers support
- `zxh404.vscode-proto3` - Alternative protobuf extension
- `ms-python.python` - Python support

---

## Running gRPC Services

### Start Server
```bash
# Terminal 1: Start server
python services/server.py
```

### Run Client
```bash
# Terminal 2: Run client
python clients/client.py
```

### Test with gRPC CLI (Optional)
```bash
# Install grpcurl
# macOS
brew install grpcurl

# Linux
wget https://github.com/fullstorydev/grpcurl/releases/latest/download/grpcurl_1.8.7_linux_x86_64.tar.gz
tar -xzf grpcurl_1.8.7_linux_x86_64.tar.gz
sudo mv grpcurl /usr/local/bin/

# Test service
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"name": "Test"}' localhost:50051 greeter.Greeter/SayHello
```

---

## Advanced Configuration

### Server with Reflection
```python
# Add to server.py
from grpc_reflection.v1alpha import reflection

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_GreeterServicer_to_server(GreeterService(), server)

    # Enable reflection
    SERVICE_NAMES = (
        reflection.SERVICE_NAME,
        'greeter.Greeter',
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)

    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()
```

### SSL/TLS Configuration
```python
# Secure server
import ssl

def serve_secure():
    server_credentials = grpc.ssl_server_credentials([
        (private_key, certificate_chain)
    ])
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_GreeterServicer_to_server(GreeterService(), server)
    server.add_secure_port('[::]:50051', server_credentials)
    server.start()
    server.wait_for_termination()
```

---

## Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install protoc
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Generate protobuf files
RUN python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=proto/generated \
    --grpc_python_out=proto/generated \
    proto/*.proto

# Run the server
CMD ["python", "services/server.py"]
```

---

## Troubleshooting

### Import Errors
```python
# Check Python path
python -c "import sys; print(sys.path)"

# Regenerate proto files
python -m grpc_tools.protoc --proto_path=proto --python_out=proto/generated --grpc_python_out=proto/generated proto/*.proto
```

### Connection Refused
```python
# Check if server is running
netstat -tlnp | grep 50051

# Check firewall
sudo ufw status
sudo ufw allow 50051
```

### Protobuf Compilation Errors
```python
# Check proto file syntax
protoc --dry-run --proto_path=proto proto/*.proto

# Validate generated files
python -c "from proto.generated import service_pb2, service_pb2_grpc; print('Import successful')"
```

---

## Next Steps

1. [Learn protocol buffer syntax](../tutorials/01-proto-syntax.md)
2. [Create your first gRPC service](../workshops/workshop-01-basic-grpc.md)
3. [Implement streaming RPCs](../tutorials/02-streaming-rpc.md)
4. [Add error handling](../workshops/workshop-02-error-handling.md)

---

## Resources

- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers)
- [gRPC Python Examples](https://github.com/grpc/grpc/tree/master/examples/python)
- [Protocol Buffer Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [gRPC Testing](https://grpc.io/docs/guides/testing/)

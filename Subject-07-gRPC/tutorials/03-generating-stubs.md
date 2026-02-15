# Tutorial 03: Generating Stubs and Code from Proto Files

## Overview
This tutorial covers the process of generating client and server code (stubs) from Protocol Buffer definitions using the Protocol Buffer compiler (protoc). You'll learn how to set up the build process, generate code for different languages, and integrate generated code into your applications.

## Protocol Buffer Compiler Setup

### Installing protoc

**Windows:**
```powershell
# Download from GitHub releases
# https://github.com/protocolbuffers/protobuf/releases
# Download: protoc-*-win64.zip

# Extract to a folder (e.g., C:\protoc)
# Add to PATH: C:\protoc\bin
```

**macOS:**
```bash
# Using Homebrew
brew install protobuf

# Verify installation
protoc --version
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install protobuf-compiler

# Or download from releases
wget https://github.com/protocolbuffers/protobuf/releases/download/v25.0/protoc-25.0-linux-x86_64.zip
unzip protoc-25.0-linux-x86_64.zip
sudo mv bin/protoc /usr/local/bin/
sudo mv include/* /usr/local/include/
```

### Language-Specific Plugins

#### Python
```bash
uv add grpcio-tools
```

#### Go
```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

#### JavaScript/Node.js
```bash
npm install -g grpc-tools
```

#### Java
```bash
# Download from Maven Central or use Gradle/Maven plugins
```

## Basic Code Generation

### Project Structure
```
grpc-project/
├── proto/
│   ├── service.proto
│   └── generated/
│       ├── __init__.py          # Python
│       ├── service_pb2.py       # Message classes
│       └── service_pb2_grpc.py  # Service classes
├── server.py
└── client.py
```

### Simple Proto File
```protobuf
// proto/service.proto
syntax = "proto3";

package greeter;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
  int64 timestamp = 2;
}
```

### Generating Python Code
```bash
# Navigate to project root
cd grpc-project

# Generate Python code
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=proto/generated \
  --grpc_python_out=proto/generated \
  proto/service.proto

# Create __init__.py for Python package
touch proto/generated/__init__.py
```

**Generated Files:**
- `service_pb2.py` - Contains message classes and serialization code
- `service_pb2_grpc.py` - Contains service stub classes and server implementation

## Understanding Generated Code

### Message Classes
```python
# proto/generated/service_pb2.py
import service_pb2 as service__pb2

class HelloRequest(service__pb2.Message):
    DESCRIPTOR = ...

    def __init__(self, name: str = None):
        self.name = name

class HelloReply(service__pb2.Message):
    DESCRIPTOR = ...

    def __init__(self, message: str = None, timestamp: int = None):
        self.message = message
        self.timestamp = timestamp
```

### Service Classes
```python
# proto/generated/service_pb2_grpc.py

class GreeterStub:
    """Client stub for Greeter service"""
    def SayHello(self, request, timeout=None, ...):
        return self._channel.unary_unary(
            '/greeter.Greeter/SayHello',
            request_serializer=service__pb2.HelloRequest.SerializeToString,
            response_deserializer=service__pb2.HelloReply.FromString,
        )

class GreeterServicer:
    """Server interface for Greeter service"""
    def SayHello(self, request, context):
        raise NotImplementedError()

def add_GreeterServicer_to_server(servicer, server):
    """Register servicer with server"""
```

## Advanced Generation Options

### Multiple Proto Files
```bash
# Directory structure
proto/
├── common/
│   └── types.proto
├── user/
│   └── user.proto
└── product/
    └── product.proto

# Generate all proto files
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated \
  --grpc_python_out=generated \
  proto/**/*.proto
```

### Import Handling
```protobuf
// proto/common/types.proto
syntax = "proto3";
package common;

message Timestamp {
  int64 seconds = 1;
  int32 nanos = 2;
}
```

```protobuf
// proto/user/user.proto
syntax = "proto3";
package user;

import "common/types.proto";

message User {
  string id = 1;
  string name = 2;
  common.Timestamp created_at = 3;
}
```

```bash
# Generate with imports
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated \
  --grpc_python_out=generated \
  proto/common/types.proto \
  proto/user/user.proto
```

### Custom Options
```bash
# Add Python-specific options
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated \
  --grpc_python_out=generated \
  --mypy_out=generated \
  proto/service.proto
```

## Integration with Build Systems

### Makefile
```makefile
.PHONY: proto clean

# Proto file locations
PROTO_DIR = proto
GENERATED_DIR = $(PROTO_DIR)/generated

# Find all .proto files
PROTO_FILES = $(shell find $(PROTO_DIR) -name "*.proto")

# Generate Python code
proto:
	python -m grpc_tools.protoc \
		--proto_path=$(PROTO_DIR) \
		--python_out=$(GENERATED_DIR) \
		--grpc_python_out=$(GENERATED_DIR) \
		$(PROTO_FILES)
	touch $(GENERATED_DIR)/__init__.py

# Clean generated files
clean:
	rm -rf $(GENERATED_DIR)/*
```

### Setup.py Integration
```python
# setup.py
from setuptools import setup, find_packages
from setuptools.command.build_py import build_py
import subprocess
import os

class BuildProtoCommand(build_py):
    def run(self):
        # Generate protobuf code
        proto_dir = 'proto'
        generated_dir = os.path.join(proto_dir, 'generated')

        subprocess.check_call([
            'python', '-m', 'grpc_tools.protoc',
            f'--proto_path={proto_dir}',
            f'--python_out={generated_dir}',
            f'--grpc_python_out={generated_dir}',
            'proto/service.proto'
        ])

        # Create __init__.py
        init_file = os.path.join(generated_dir, '__init__.py')
        with open(init_file, 'w') as f:
            f.write('')

        super().run()

setup(
    name="grpc-service",
    packages=find_packages(),
    cmdclass={
        'build_py': BuildProtoCommand,
    },
)
```

### Docker Integration
```dockerfile
FROM python:3.11-slim

# Install protobuf compiler
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy proto files first
COPY proto/ ./proto/

# Generate Python code from proto files
RUN python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=proto/generated \
    --grpc_python_out=proto/generated \
    proto/*.proto && \
    touch proto/generated/__init__.py

# Copy rest of the application
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "server.py"]
```

## Working with Generated Code

### Message Usage
```python
from proto.generated.service_pb2 import HelloRequest, HelloReply

# Create messages
request = HelloRequest(name="World")
print(f"Request: {request}")

# Serialize to bytes
serialized = request.SerializeToString()
print(f"Serialized: {serialized}")

# Deserialize from bytes
deserialized = HelloRequest()
deserialized.ParseFromString(serialized)
print(f"Deserialized: {deserialized}")

# Convert to dict
request_dict = {
    "name": request.name
}

# Create from dict
reply = HelloReply(**{
    "message": "Hello, World!",
    "timestamp": 1234567890
})
```

### Service Implementation
```python
from proto.generated.service_pb2 import HelloReply
from proto.generated.service_pb2_grpc import GreeterServicer
import time

class GreeterService(GreeterServicer):
    def SayHello(self, request, context):
        """Implement the SayHello RPC method"""
        message = f"Hello, {request.name}!"
        timestamp = int(time.time() * 1000)  # milliseconds

        return HelloReply(
            message=message,
            timestamp=timestamp
        )
```

### Client Usage
```python
import grpc
from proto.generated.service_pb2 import HelloRequest
from proto.generated.service_pb2_grpc import GreeterStub

def run_client():
    # Create channel
    with grpc.insecure_channel('localhost:50051') as channel:
        # Create stub
        stub = GreeterStub(channel)

        # Create request
        request = HelloRequest(name="World")

        # Call service
        response = stub.SayHello(request)

        print(f"Response: {response.message}")
        print(f"Timestamp: {response.timestamp}")
```

## Code Generation Best Practices

### Directory Structure
```
project/
├── proto/              # Source proto files
│   ├── service.proto
│   └── common.proto
├── generated/          # Generated code (gitignored)
│   ├── __init__.py
│   ├── service_pb2.py
│   └── service_pb2_grpc.py
├── src/               # Your application code
│   ├── server.py
│   └── client.py
└── scripts/           # Build scripts
    └── generate_proto.py
```

### Git Management
```bash
# .gitignore
generated/
*.pyc
__pycache__/

# Include in version control
proto/
scripts/
src/
```

### Version Control Strategy
```bash
# Store proto files in git
git add proto/*.proto

# Generate code during build (not stored in git)
# generated/ directory should be gitignored
```

## Multi-Language Code Generation

### Python and Go
```bash
# Generate Python code
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated/python \
  --grpc_python_out=generated/python \
  proto/service.proto

# Generate Go code
protoc \
  --proto_path=proto \
  --go_out=generated/go \
  --go-grpc_out=generated/go \
  proto/service.proto
```

### JavaScript and Python
```bash
# Generate JavaScript code
grpc_tools_node_protoc \
  --proto_path=proto \
  --js_out=import_style=commonjs:generated/js \
  --grpc_out=generated/js \
  proto/service.proto

# Generate Python code
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated/python \
  --grpc_python_out=generated/python \
  proto/service.proto
```

## Debugging Generated Code

### Inspecting Messages
```python
# Check message descriptor
print(HelloRequest.DESCRIPTOR)
print(HelloRequest.DESCRIPTOR.fields_by_name)

# Check field types
field = HelloRequest.DESCRIPTOR.fields_by_name['name']
print(f"Field type: {field.type}")
print(f"Field number: {field.number}")
```

### Testing Serialization
```python
# Test serialization/deserialization
original = HelloRequest(name="Test")
serialized = original.SerializeToString()
deserialized = HelloRequest()
deserialized.ParseFromString(serialized)

assert original == deserialized
print("Serialization test passed!")
```

### Debugging Service Calls
```python
# Enable gRPC debug logging
import logging
logging.basicConfig()
logging.getLogger('grpc').setLevel(logging.DEBUG)

# Add interceptors for debugging
from grpc import interceptors

class DebugInterceptor(interceptors.UnaryUnaryClientInterceptor):
    def intercept_unary_unary(self, continuation, client_call_details, request):
        print(f"Making call to: {client_call_details.method}")
        print(f"Request: {request}")
        return continuation(client_call_details, request)
```

## Automation Scripts

### Python Generation Script
```python
#!/usr/bin/env python3
# scripts/generate_proto.py

import subprocess
import os
from pathlib import Path

def generate_proto():
    """Generate Python code from proto files"""
    proto_dir = Path("proto")
    generated_dir = proto_dir / "generated"

    # Create generated directory
    generated_dir.mkdir(exist_ok=True)

    # Find all proto files
    proto_files = list(proto_dir.glob("**/*.proto"))

    if not proto_files:
        print("No .proto files found")
        return

    # Generate Python code
    cmd = [
        "python", "-m", "grpc_tools.protoc",
        f"--proto_path={proto_dir}",
        f"--python_out={generated_dir}",
        f"--grpc_python_out={generated_dir}",
    ] + [str(f) for f in proto_files]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        # Create __init__.py
        (generated_dir / "__init__.py").touch()
        print(f"Generated code for {len(proto_files)} proto files")
    else:
        print("Error generating proto code:")
        print(result.stderr)

if __name__ == "__main__":
    generate_proto()
```

### Watch Mode Script
```python
#!/usr/bin/env python3
# scripts/watch_proto.py

import time
from pathlib import Path
from generate_proto import generate_proto

def watch_proto_files():
    """Watch proto files for changes and regenerate"""
    proto_dir = Path("proto")
    last_modified = {}

    # Get initial modification times
    for proto_file in proto_dir.glob("**/*.proto"):
        last_modified[proto_file] = proto_file.stat().st_mtime

    print("Watching proto files for changes...")

    while True:
        time.sleep(1)  # Check every second

        for proto_file in proto_dir.glob("**/*.proto"):
            current_mtime = proto_file.stat().st_mtime

            if proto_file not in last_modified or last_modified[proto_file] != current_mtime:
                print(f"Detected change in {proto_file}")
                generate_proto()
                last_modified[proto_file] = current_mtime

if __name__ == "__main__":
    watch_proto_files()
```

## Hands-on Exercises

### Exercise 1: Basic Code Generation
1. Create a simple .proto file with a service and messages
2. Generate Python code using protoc
3. Inspect the generated files and understand their structure

### Exercise 2: Multi-Service Generation
1. Create multiple .proto files with imports
2. Set up a proper directory structure
3. Generate code for all services and test imports

### Exercise 3: Build System Integration
1. Create a Makefile for proto generation
2. Set up automated generation in CI/CD
3. Implement code generation for multiple languages

## Troubleshooting

### Common Issues

**Import errors:**
```python
# Check PYTHONPATH
import sys
sys.path.append('proto/generated')

# Verify file exists
import os
print(os.listdir('proto/generated'))
```

**Protobuf version mismatch:**
```bash
# Check versions
protoc --version
python -c "import google.protobuf; print(google.protobuf.__version__)"

# Ensure compatibility
uv add protobuf==3.20.3  # Match protoc version
```

**Generated code issues:**
```python
# Regenerate after proto changes
rm -rf proto/generated/*
python -m grpc_tools.protoc --proto_path=proto --python_out=proto/generated --grpc_python_out=proto/generated proto/*.proto
```

## Next Steps
- [gRPC Services Tutorial](../tutorials/04-grpc-services.md)
- [Workshop: Basic gRPC Service](../workshops/workshop-01-basic-grpc.md)

## Additional Resources
- [protoc Documentation](https://developers.google.com/protocol-buffers/docs/reference/cpp/google.protobuf.compiler.command_line_interface)
- [gRPC Python Tools](https://grpc.github.io/grpc/python/grpc_tools.html)
- [Build System Integration](https://grpc.io/docs/languages/python/quickstart/)
- [Multi-Language Generation](https://grpc.io/docs/languages/)

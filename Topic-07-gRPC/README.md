# Subject 7: Introduction to gRPC and Protocol Buffer Design

## Overview

This subject introduces gRPC (gRPC Remote Procedure Calls), a high-performance, open-source universal RPC framework. You'll learn to design Protocol Buffer schemas, implement gRPC services, and understand the differences between REST and gRPC communication patterns.

## Learning Objectives

By the end of this subject, you will be able to:

- **Compare API Technologies**: Understand REST vs gRPC trade-offs and use cases
- **Design Protocol Buffers**: Create efficient `.proto` files for data serialization
- **Implement gRPC Services**: Build server and client applications using gRPC
- **Handle Streaming**: Implement unary, server streaming, client streaming, and bidirectional streaming
- **Generate Code**: Use protoc to generate language-specific stubs
- **Manage Errors**: Implement proper error handling in gRPC services

## Prerequisites

- Completion of Subjects 1-6 (Git through Advanced FastAPI)
- Python programming proficiency
- Understanding of network communication concepts
- Experience with API design (REST preferred)

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[REST vs gRPC](tutorials/01-rest-vs-grpc.md)**
   - HTTP/REST limitations and gRPC advantages
   - Use cases for each technology
   - Performance comparisons
   - When to choose gRPC over REST

2. **[Protocol Buffer Syntax](tutorials/02-proto-syntax.md)**
   - Protocol Buffer language basics
   - Message definitions and field types
   - Nested messages and imports
   - Service definitions and RPC methods

3. **[Generating Stubs](tutorials/03-generating-stubs.md)**
   - Installing Protocol Buffer compiler
   - Code generation for different languages
   - Understanding generated code structure
   - Build integration and automation

4. **[gRPC Services](tutorials/04-grpc-services.md)**
   - Service implementation patterns
   - Server setup and configuration
   - Client implementation
   - Synchronous vs asynchronous calls

5. **[Streaming RPC](tutorials/05-streaming-rpc.md)**
   - Unary, server, client, and bidirectional streaming
   - Stream processing patterns
   - Error handling in streaming scenarios
   - Performance considerations

### 🛠️ Workshops (Hands-on Practice)

1. **[Basic gRPC](workshops/workshop-01-basic-grpc.md)**
   - Setting up gRPC development environment
   - Creating first `.proto` file
   - Implementing simple unary RPC
   - Testing with gRPC CLI tools

2. **[Error Handling](workshops/workshop-02-error-handling.md)**
   - gRPC status codes and error handling
   - Custom error messages
   - Exception handling patterns
   - Debugging gRPC services

3. **[Streaming](workshops/workshop-03-streaming.md)**
   - Implementing server streaming
   - Client streaming patterns
   - Bidirectional streaming
   - Real-time data processing

4. **[Advanced gRPC](workshops/workshop-04-advanced-grpc.md)**
   - Authentication and security
   - Interceptors and middleware
   - Load balancing
   - Service discovery

5. **[Advanced Streaming Application](workshops/workshop-05-advanced-streaming-application.md)**
   - Complex streaming scenarios
   - File transfer over gRPC
   - Real-time notifications
   - Production-ready streaming services

### 📝 Homework Assignments

The `homeworks/` directory contains:
- Protocol buffer design assignments
- Service implementation challenges
- Streaming application development

### 📋 Assessments

The `assessments/` directory contains:
- Protocol design quiz
- gRPC implementation challenges
- Performance comparison exercises

## Key gRPC Concepts

### REST vs gRPC Comparison

| Aspect | REST | gRPC |
|--------|------|------|
| **Protocol** | HTTP/1.1, HTTP/2 | HTTP/2 |
| **Data Format** | JSON, XML | Protocol Buffers |
| **Communication** | Request-Response | Various RPC patterns |
| **Performance** | Good | Excellent |
| **Type Safety** | Weak | Strong |
| **Streaming** | Limited | Full support |
| **Code Generation** | Manual | Automatic |

### Protocol Buffer Syntax

```protobuf
syntax = "proto3";

package ecommerce;

// Message definitions
message Product {
    string id = 1;
    string name = 2;
    string description = 3;
    double price = 4;
    repeated string tags = 5;
    google.protobuf.Timestamp created_at = 6;
}

message CreateProductRequest {
    Product product = 1;
}

message CreateProductResponse {
    Product product = 2;
    string status = 3;
}

message ListProductsRequest {
    int32 page_size = 1;
    string page_token = 2;
}

message ListProductsResponse {
    repeated Product products = 1;
    string next_page_token = 2;
}

// Service definition
service ProductService {
    rpc CreateProduct(CreateProductRequest) returns (CreateProductResponse);
    rpc GetProduct(GetProductRequest) returns (GetProductResponse);
    rpc ListProducts(ListProductsRequest) returns (ListProductsResponse);
    rpc UpdateProduct(UpdateProductRequest) returns (UpdateProductResponse);
    rpc DeleteProduct(DeleteProductRequest) returns (DeleteProductResponse);

    // Streaming RPC
    rpc StreamProductUpdates(google.protobuf.Empty) returns (stream ProductUpdate);
}
```

### Python gRPC Implementation

#### Server Implementation

```python
import grpc
from concurrent import futures
import product_service_pb2
import product_service_pb2_grpc

class ProductService(product_service_pb2_grpc.ProductServiceServicer):
    def CreateProduct(self, request, context):
        # Business logic for creating product
        product = request.product
        # Save to database, etc.

        response = product_service_pb2.CreateProductResponse(
            product=product,
            status="CREATED"
        )
        return response

    def StreamProductUpdates(self, request, context):
        # Server streaming implementation
        while True:
            # Check for new updates
            if self.has_new_updates():
                update = self.get_next_update()
                yield update
            else:
                time.sleep(1)  # Wait before checking again

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    product_service_pb2_grpc.add_ProductServiceServicer_to_server(
        ProductService(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

#### Client Implementation

```python
import grpc
import product_service_pb2
import product_service_pb2_grpc

def run():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = product_service_pb2_grpc.ProductServiceStub(channel)

        # Unary RPC
        product = product_service_pb2.Product(
            name="Sample Product",
            description="A sample product",
            price=29.99
        )
        request = product_service_pb2.CreateProductRequest(product=product)
        response = stub.CreateProduct(request)
        print(f"Created product: {response.product.name}")

        # Server streaming
        print("Listening for product updates...")
        for update in stub.StreamProductUpdates(google.protobuf.empty_pb2.Empty()):
            print(f"Update: {update}")

if __name__ == '__main__':
    run()
```

### Code Generation

```bash
# Generate Python code from .proto files
python -m grpc_tools.protoc \
    --proto_path=. \
    --python_out=. \
    --grpc_python_out=. \
    ecommerce/product.proto

# This generates:
# - product_pb2.py (message classes)
# - product_pb2_grpc.py (service stubs)
```

## Streaming Patterns

### Server Streaming
```python
# Proto definition
rpc GetProductUpdates(ProductFilter) returns (stream ProductUpdate);

# Server implementation
def GetProductUpdates(self, request, context):
    products = self.get_filtered_products(request.filter)
    for product in products:
        update = ProductUpdate(product=product, type="UPDATE")
        yield update
```

### Client Streaming
```python
# Proto definition
rpc UploadProducts(stream Product) returns (UploadSummary);

# Server implementation
def UploadProducts(self, request_iterator, context):
    count = 0
    for product in request_iterator:
        self.save_product(product)
        count += 1
    return UploadSummary(total_uploaded=count)
```

### Bidirectional Streaming
```python
# Proto definition
rpc Chat(stream ChatMessage) returns (stream ChatMessage);

# Server implementation
def Chat(self, request_iterator, context):
    for message in request_iterator:
        # Process incoming message
        response = self.process_message(message)
        yield response
```

## Resources & References

### 📖 Official Documentation
- [gRPC Documentation](https://grpc.io/docs/) - Official gRPC docs
- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers) - Proto language reference
- [gRPC Python](https://grpc.github.io/grpc/python/) - Python-specific docs

### 🛠️ Tools & Installation
- [Protocol Buffers](https://github.com/protocolbuffers/protobuf) - Proto compiler
- [gRPC Tools](https://grpc.io/docs/languages/python/quickstart/) - Python code generation
- [grpcui](https://github.com/fullstorydev/grpcui) - gRPC web UI

### 📚 Additional Learning
- [gRPC Best Practices](https://grpc.io/docs/guides/) - Implementation guidelines
- [API Design Guide](https://cloud.google.com/apis/design) - Google API design principles
- [gRPC vs REST](https://docs.microsoft.com/en-us/dotnet/architecture/grpc-for-wepis/grpc-versus-http-apis) - Technology comparison

## Getting Started

1. **Review Prerequisites** from FastAPI subjects
2. **Install gRPC Tools** following the installation guides in `installation/`
3. **Complete Workshop 1** to create your first gRPC service
4. **Work through Tutorials** to understand proto design and streaming
5. **Practice with Workshops** to implement various gRPC patterns
6. **Complete Homework** assignments for comprehensive practice

## Common gRPC Patterns

### Authentication
```python
# Proto definition
service AuthenticatedService {
    rpc SecureMethod(Request) returns (Response) {
        option (google.api.http) = {
            get: "/v1/secure"
        };
    }
}

# Server with authentication
def authenticate_request(context):
    metadata = dict(context.invocation_metadata())
    token = metadata.get('authorization')
    if not validate_token(token):
        context.abort(grpc.StatusCode.UNAUTHENTICATED, 'Invalid token')

def SecureMethod(self, request, context):
    authenticate_request(context)
    # Process authenticated request
    return response
```

### Error Handling
```python
# Custom error handling
def validate_product(product):
    if not product.name:
        context.abort(
            grpc.StatusCode.INVALID_ARGUMENT,
            'Product name is required',
            grpc.Metadata([('field', 'name'), ('reason', 'required')])
        )

def CreateProduct(self, request, context):
    try:
        validate_product(request.product)
        product = self.save_product(request.product)
        return CreateProductResponse(product=product)
    except DatabaseError as e:
        context.abort(
            grpc.StatusCode.INTERNAL,
            f'Database error: {str(e)}'
        )
```

### Interceptors
```python
class LoggingInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        print(f"Received call: {handler_call_details.method}")
        return continuation(handler_call_details)

server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    interceptors=[LoggingInterceptor()]
)
```

## Performance Considerations

### Connection Management
- Use connection pooling for high-throughput services
- Implement proper connection timeouts
- Handle connection failures gracefully

### Message Size
- Protocol Buffers are efficient but monitor message sizes
- Implement pagination for large datasets
- Use streaming for large data transfers

### Load Balancing
```python
# Client-side load balancing
with grpc.insecure_channel(
    'localhost:50051,localhost:50052,localhost:50053',
    options=[('grpc.lb_policy_name', 'round_robin')]
) as channel:
    stub = MyServiceStub(channel)
```

## Assessment Criteria

- **Protocol Design**: Effective use of Protocol Buffers and message design
- **Service Implementation**: Proper gRPC service and client implementation
- **Error Handling**: Appropriate error handling and status codes
- **Streaming**: Correct implementation of streaming RPC patterns
- **Performance**: Efficient service design and resource usage
- **Code Quality**: Clean, maintainable, and well-documented code

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 8**: Web crawling with Crawlee Python SDK
- **Subject 9**: Database design with PostgreSQL
- High-performance microservices architecture

---

*gRPC provides a powerful alternative to REST APIs for high-performance, type-safe communication. This subject equips you with the skills to design and implement efficient RPC services.*

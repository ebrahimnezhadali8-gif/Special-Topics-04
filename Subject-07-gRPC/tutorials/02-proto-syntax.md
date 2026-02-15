# Tutorial 02: Protocol Buffer Syntax and Design

## Overview
This tutorial covers Protocol Buffers (protobuf) syntax, message definition, service design, and best practices for creating efficient and maintainable .proto files. Protocol Buffers are the foundation of gRPC communication, defining both data structures and service interfaces.

## What are Protocol Buffers?

Protocol Buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data. They are smaller, faster, and simpler than XML or JSON.

### Key Benefits
- **Compact**: Binary format, smaller than JSON/XML
- **Fast**: 5-10x faster parsing than JSON
- **Typed**: Strongly typed with schema validation
- **Cross-platform**: Works across different languages
- **Version-safe**: Backward/forward compatibility
- **Code generation**: Automatic code generation

## Basic Syntax

### File Structure
```protobuf
// Define the protobuf version
syntax = "proto3";

// Package declaration (optional but recommended)
package mypackage;

// Import statements
import "google/protobuf/timestamp.proto";

// Message definitions
message MyMessage {
  // Field definitions
}

// Service definitions
service MyService {
  // RPC method definitions
}
```

### Proto3 vs Proto2
```protobuf
// Proto2 (older)
message Person {
  required string name = 1;
  optional int32 age = 2;
  repeated string hobbies = 3;
}

// Proto3 (current, simpler)
message Person {
  string name = 1;
  int32 age = 2;
  repeated string hobbies = 3;
}
```

**Proto3 changes:**
- No `required/optional` keywords
- Fields are optional by default
- No default values for primitives
- Removed extensions and groups
- Added `map` and `any` types

## Message Definitions

### Scalar Types
```protobuf
message ScalarTypes {
  // Numbers
  int32 signed_32bit = 1;
  int64 signed_64bit = 2;
  uint32 unsigned_32bit = 3;
  uint64 unsigned_64bit = 4;
  sint32 zigzag_encoded = 5;  // Efficient for negative numbers
  sint64 zigzag_encoded = 6;
  fixed32 always_4_bytes = 7;
  fixed64 always_8_bytes = 8;
  sfixed32 always_signed_4 = 9;
  sfixed64 always_signed_8 = 10;

  // Floating point
  float float_32bit = 11;
  double float_64bit = 12;

  // Boolean
  bool boolean_value = 13;

  // Strings
  string text_value = 14;

  // Bytes
  bytes binary_data = 15;
}
```

### Complex Messages
```protobuf
message User {
  int32 id = 1;
  string username = 2;
  string email = 3;
  Profile profile = 4;
  repeated string roles = 5;
  map<string, string> metadata = 6;
}

message Profile {
  string first_name = 1;
  string last_name = 2;
  Address address = 3;
  google.protobuf.Timestamp created_at = 4;
}

message Address {
  string street = 1;
  string city = 2;
  string state = 3;
  string zip_code = 4;
  string country = 5;
}
```

### Field Rules

#### Repeated Fields (Arrays)
```protobuf
message BlogPost {
  int32 id = 1;
  string title = 2;
  repeated string tags = 3;        // Array of strings
  repeated Comment comments = 4;   // Array of messages
}

message Comment {
  int32 id = 1;
  string author = 2;
  string content = 3;
}
```

#### Map Fields
```protobuf
message Configuration {
  map<string, string> settings = 1;      // string -> string
  map<int32, User> users_by_id = 2;      // int32 -> User
  map<string, bytes> file_contents = 3;  // string -> bytes
}
```

### Enumerations
```protobuf
enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
}

enum Priority {
  PRIORITY_LOW = 0;
  PRIORITY_MEDIUM = 1;
  PRIORITY_HIGH = 2;
  PRIORITY_URGENT = 3;
}

message Task {
  int32 id = 1;
  string title = 2;
  UserStatus status = 3;
  Priority priority = 4;
}
```

## Service Definitions

### Basic Service
```protobuf
service Calculator {
  rpc Add (AddRequest) returns (AddResponse);
  rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
  int32 a = 1;
  int32 b = 2;
}

message AddResponse {
  int32 result = 1;
}

message MultiplyRequest {
  int32 a = 1;
  int32 b = 2;
}

message MultiplyResponse {
  int32 result = 1;
}
```

### Streaming Services
```protobuf
service ChatService {
  // Unary RPC (request -> response)
  rpc SendMessage (Message) returns (MessageResponse);

  // Server streaming (request -> stream of responses)
  rpc GetMessageHistory (HistoryRequest) returns (stream Message);

  // Client streaming (stream of requests -> response)
  rpc UploadFile (stream FileChunk) returns (UploadResponse);

  // Bidirectional streaming (stream both ways)
  rpc Chat (stream Message) returns (stream Message);
}

message Message {
  int32 id = 1;
  string sender = 2;
  string content = 3;
  google.protobuf.Timestamp timestamp = 4;
}

message MessageResponse {
  bool success = 1;
  string message_id = 2;
}

message HistoryRequest {
  string channel = 1;
  google.protobuf.Timestamp since = 2;
}

message FileChunk {
  bytes data = 1;
  bool eof = 2;
}

message UploadResponse {
  string file_id = 1;
  int64 size = 2;
}
```

### Advanced Service Patterns
```protobuf
service UserService {
  // CRUD operations
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc GetUser (GetUserRequest) returns (User);
  rpc UpdateUser (UpdateUserRequest) returns (User);
  rpc DeleteUser (DeleteUserRequest) returns (google.protobuf.Empty);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);

  // Batch operations
  rpc BatchCreateUsers (BatchCreateUsersRequest) returns (BatchCreateUsersResponse);
  rpc BatchGetUsers (BatchGetUsersRequest) returns (stream User);

  // Search and filtering
  rpc SearchUsers (SearchUsersRequest) returns (stream User);
}

message User {
  int32 id = 1;
  string username = 2;
  string email = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
}

message CreateUserRequest {
  string username = 1;
  string email = 2;
  string password = 3;
}

message GetUserRequest {
  int32 id = 1;
}

message UpdateUserRequest {
  int32 id = 1;
  google.protobuf.FieldMask update_mask = 2;  // Fields to update
  User user = 3;
}

message DeleteUserRequest {
  int32 id = 1;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
  string order_by = 3;
}

message ListUsersResponse {
  repeated User users = 1;
  int32 total_count = 2;
  string next_page_token = 3;
}
```

## Well-Known Types

Google provides common message types that you can import:

```protobuf
import "google/protobuf/timestamp.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/wrappers.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/any.proto";

message Example {
  // Timestamp
  google.protobuf.Timestamp created_at = 1;

  // Duration
  google.protobuf.Duration timeout = 2;

  // Optional values
  google.protobuf.StringValue name = 3;
  google.protobuf.Int32Value age = 4;

  // Empty response
  google.protobuf.Empty empty_response = 5;

  // Field mask for updates
  google.protobuf.FieldMask update_mask = 6;

  // Any type for extensibility
  google.protobuf.Any data = 7;
}
```

## Best Practices

### Message Design

#### 1. Use Meaningful Names
```protobuf
// Good
message UserProfile {
  string full_name = 1;
  string email_address = 2;
  repeated string phone_numbers = 3;
}

// Bad
message U {
  string n = 1;
  string e = 2;
  repeated string p = 3;
}
```

#### 2. Consistent Field Numbering
```protobuf
// Reserve numbers for future use
message Product {
  string name = 1;
  string description = 2;
  double price = 3;
  // reserved 4, 5;  // Save for future fields
  bool active = 6;
}
```

#### 3. Use Appropriate Types
```protobuf
// Good
message Order {
  int64 order_id = 1;      // Large numbers
  double total_amount = 2; // Money with decimals
  fixed32 item_count = 3;  // Always 4 bytes, efficient
  string customer_id = 4;  // UUID as string
}

// Bad
message Order {
  int32 order_id = 1;      // Might overflow
  float total_amount = 2;  // Precision issues
  int32 item_count = 3;    // Unnecessary overhead
}
```

### Service Design

#### 1. Use Consistent Naming
```protobuf
service UserManagementService {
  rpc CreateUser = 1;
  rpc GetUser = 2;
  rpc UpdateUser = 3;
  rpc DeleteUser = 4;
  rpc ListUsers = 5;
}
```

#### 2. Design for Streaming Wisely
```protobuf
// Good: Use streaming for large datasets
service DataService {
  rpc GetLargeDataset (DatasetRequest) returns (stream DataChunk);
}

// Bad: Don't stream single small responses
service BadService {
  rpc GetSingleValue (Request) returns (stream SingleValue);
}
```

#### 3. Version Your APIs
```protobuf
// api/v1/user.proto
package api.v1;

service UserService {
  rpc CreateUser (CreateUserRequest) returns (User);
}

// api/v2/user.proto
package api.v2;

service UserServiceV2 {
  rpc CreateUser (CreateUserRequestV2) returns (UserV2);
}
```

## Field Number Guidelines

### Reserved Numbers
```protobuf
message MyMessage {
  string name = 1;
  int32 age = 2;

  // Reserve numbers for future use
  // reserved 3, 4, 5;
  // reserved "old_field";

  string new_field = 6;
}
```

### Field Number Best Practices
- **1-15**: Frequent fields (1 byte encoding)
- **16-2047**: Regular fields (2 byte encoding)
- **Avoid**: Numbers > 2047 (3+ byte encoding)
- **Never reuse**: Deleted field numbers

## Import and Package Management

### Package Organization
```
proto/
├── google/                    # Well-known types
├── mycompany/
│   ├── common/               # Shared messages
│   │   ├── pagination.proto
│   │   └── errors.proto
│   ├── user/
│   │   ├── user.proto
│   │   └── auth.proto
│   └── product/
│       ├── product.proto
│       └── inventory.proto
└── third_party/              # External dependencies
```

### Import Examples
```protobuf
// proto/mycompany/common/pagination.proto
syntax = "proto3";
package mycompany.common;

message PaginationRequest {
  int32 page = 1;
  int32 page_size = 2;
  string order_by = 3;
}

message PaginationResponse {
  int32 total_count = 1;
  string next_page_token = 2;
}
```

```protobuf
// proto/mycompany/user/user.proto
syntax = "proto3";
package mycompany.user;

import "mycompany/common/pagination.proto";

service UserService {
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
}

message ListUsersRequest {
  mycompany.common.PaginationRequest pagination = 1;
  string search_query = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  mycompany.common.PaginationResponse pagination = 2;
}
```

## Advanced Features

### Oneof (Union Types)
```protobuf
message SearchRequest {
  string query = 1;

  oneof search_type {
    UserSearch user_search = 2;
    ProductSearch product_search = 3;
    OrderSearch order_search = 4;
  }
}

message UserSearch {
  string username = 1;
  string email = 2;
}

message ProductSearch {
  string category = 1;
  double min_price = 2;
  double max_price = 3;
}
```

### Extensions (Proto2 only)
```protobuf
// Proto2 syntax for extensions
message Foo {
  extensions 100 to 199;
}

extend Foo {
  optional int32 bar = 123;
}
```

### Custom Options
```protobuf
import "google/protobuf/descriptor.proto";

extend google.protobuf.FieldOptions {
  optional string field_description = 50000;
}

message MyMessage {
  string name = 1 [(field_description) = "The name field"];
}
```

## Error Handling

### Status Messages
```protobuf
import "google/rpc/status.proto";

service MyService {
  rpc DoSomething (Request) returns (Response) {}
}

message Response {
  oneof result {
    SuccessData success = 1;
    google.rpc.Status error = 2;
  }
}

message SuccessData {
  string message = 1;
  // ... other success fields
}
```

## Code Generation

### Basic Generation
```bash
# Generate Python code
python -m grpc_tools.protoc \
  --proto_path=proto \
  --python_out=generated \
  --grpc_python_out=generated \
  proto/my_service.proto
```

### Advanced Generation
```bash
# Multiple files
python -m grpc_tools.protoc \
  --proto_path=proto \
  --proto_path=third_party \
  --python_out=generated \
  --grpc_python_out=generated \
  --mypy_out=generated \
  proto/*.proto
```

## Hands-on Exercises

### Exercise 1: Basic Message Design
1. Create a message for a blog post with comments
2. Add appropriate field types and validation
3. Include nested messages and repeated fields

### Exercise 2: Service Definition
1. Design a complete e-commerce service
2. Include CRUD operations for products and orders
3. Add search and filtering capabilities

### Exercise 3: Advanced Patterns
1. Implement pagination using common messages
2. Add error handling with status messages
3. Use oneof for polymorphic responses

## Next Steps
- [Generating Stubs Tutorial](../tutorials/03-generating-stubs.md)
- [Workshop: Basic gRPC Service](../workshops/workshop-01-basic-grpc.md)

## Additional Resources
- [Protocol Buffers Language Guide](https://developers.google.com/protocol-buffers/docs/proto3)
- [Protocol Buffers Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [gRPC Proto Best Practices](https://grpc.io/docs/guides/)
- [Well-Known Types](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf)

# Workshop 03: gRPC Streaming Operations

## Overview
This workshop implements real-world streaming scenarios in gRPC. You'll build services that handle server streaming, client streaming, and bidirectional streaming, learning how to manage stream lifecycle, handle backpressure, and implement robust streaming applications.

## Prerequisites
- Completed [Error Handling Workshop](../workshops/workshop-02-error-handling.md)
- Understanding of basic gRPC concepts and streaming types

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement server streaming for real-time data feeds
- Build client streaming for batch processing
- Create bidirectional streaming for interactive applications
- Handle stream lifecycle and error scenarios
- Implement backpressure and flow control
- Test streaming applications comprehensively

## Workshop Structure

### Part 1: Server Streaming - Real-Time Data Feed

#### Step 1: Create Stock Price Streaming Service

**proto/stock_stream.proto:**
```protobuf
syntax = "proto3";

package stock_stream;

service StockService {
  rpc GetStockPrices (StockRequest) returns (stream StockPrice);
  rpc GetMarketData (MarketRequest) returns (stream MarketUpdate);
}

message StockRequest {
  repeated string symbols = 1;
  int32 update_interval_ms = 2;
}

message StockPrice {
  string symbol = 1;
  double price = 2;
  double change = 3;
  double change_percent = 4;
  int64 timestamp = 5;
  int64 volume = 6;
}

message MarketRequest {
  repeated string indices = 1;
}

message MarketUpdate {
  string index_name = 1;
  double value = 2;
  double change = 3;
  double change_percent = 4;
  int64 timestamp = 5;
  string status = 6;  // OPEN, CLOSED, PRE_MARKET, etc.
}
```

#### Step 2: Implement Stock Streaming Service

**services/stock_service.py:**
```python
import grpc
import asyncio
import random
import time
from datetime import datetime
from proto.stock_stream_pb2 import StockPrice, MarketUpdate
from proto.stock_stream_pb2_grpc import StockServiceServicer

class StockService(StockServiceServicer):
    """Stock price streaming service"""

    # Mock stock data
    STOCKS = {
        'AAPL': {'base_price': 150.0, 'volatility': 0.02},
        'GOOGL': {'base_price': 2800.0, 'volatility': 0.015},
        'MSFT': {'base_price': 300.0, 'volatility': 0.018},
        'AMZN': {'base_price': 3200.0, 'volatility': 0.025},
        'TSLA': {'base_price': 800.0, 'volatility': 0.03}
    }

    def GetStockPrices(self, request, context):
        """Stream real-time stock prices"""
        symbols = request.symbols if request.symbols else list(self.STOCKS.keys())
        interval_ms = request.update_interval_ms or 1000

        print(f"Starting stock price stream for: {symbols}")

        # Initialize price tracking
        current_prices = {}
        for symbol in symbols:
            if symbol in self.STOCKS:
                current_prices[symbol] = self.STOCKS[symbol]['base_price']

        try:
            while not context.is_active():
                timestamp = int(time.time() * 1000)

                for symbol in symbols:
                    if symbol not in self.STOCKS:
                        continue

                    # Generate realistic price movement
                    volatility = self.STOCKS[symbol]['volatility']
                    change_percent = random.gauss(0, volatility)  # Normal distribution
                    price_change = current_prices[symbol] * change_percent
                    new_price = current_prices[symbol] + price_change

                    # Ensure price doesn't go negative
                    new_price = max(new_price, 0.01)

                    # Calculate change
                    change = new_price - current_prices[symbol]
                    change_percent_actual = (change / current_prices[symbol]) * 100

                    # Generate volume (simplified)
                    volume = random.randint(1000, 100000)

                    # Update current price
                    current_prices[symbol] = new_price

                    # Create and yield stock price
                    stock_price = StockPrice(
                        symbol=symbol,
                        price=round(new_price, 2),
                        change=round(change, 2),
                        change_percent=round(change_percent_actual, 2),
                        timestamp=timestamp,
                        volume=volume
                    )

                    yield stock_price

                # Wait for next update
                time.sleep(interval_ms / 1000.0)

        except Exception as e:
            print(f"Stock streaming error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Streaming error: {str(e)}")

    def GetMarketData(self, request, context):
        """Stream market index data"""
        indices = request.indices if request.indices else ['SPY', 'QQQ', 'IWM']

        print(f"Starting market data stream for: {indices}")

        # Mock market indices
        market_data = {
            'SPY': {'base': 400.0, 'volatility': 0.01},
            'QQQ': {'base': 350.0, 'volatility': 0.015},
            'IWM': {'base': 180.0, 'volatility': 0.012}
        }

        current_values = {}
        for index in indices:
            if index in market_data:
                current_values[index] = market_data[index]['base']

        try:
            while not context.is_active():
                timestamp = int(time.time() * 1000)

                # Simulate market hours (simplified)
                current_hour = datetime.now().hour
                market_status = "OPEN" if 9 <= current_hour <= 16 else "CLOSED"

                for index in indices:
                    if index not in market_data:
                        continue

                    if market_status == "OPEN":
                        # Generate market movement
                        volatility = market_data[index]['volatility']
                        change_percent = random.gauss(0, volatility)
                        value_change = current_values[index] * change_percent
                        new_value = current_values[index] + value_change
                        new_value = max(new_value, 0.01)

                        change = new_value - current_values[index]
                        change_percent_actual = (change / current_values[index]) * 100

                        current_values[index] = new_value
                    else:
                        # Market closed - no change
                        new_value = current_values[index]
                        change = 0
                        change_percent_actual = 0

                    market_update = MarketUpdate(
                        index_name=index,
                        value=round(new_value, 2),
                        change=round(change, 2),
                        change_percent=round(change_percent_actual, 2),
                        timestamp=timestamp,
                        status=market_status
                    )

                    yield market_update

                time.sleep(2)  # Update every 2 seconds

        except Exception as e:
            print(f"Market data streaming error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Market streaming error: {str(e)}")
```

### Part 2: Client Streaming - File Upload Service

#### Step 3: Create File Upload Service

**proto/file_upload.proto:**
```protobuf
syntax = "proto3";

package file_upload;

service FileService {
  rpc UploadFile (stream FileChunk) returns (UploadResponse);
  rpc DownloadFile (DownloadRequest) returns (stream FileChunk);
  rpc ListFiles (ListRequest) returns (ListResponse);
}

message FileChunk {
  string filename = 1;
  bytes data = 2;
  int64 offset = 3;
  bool eof = 4;
  string content_type = 5;
}

message UploadResponse {
  string file_id = 1;
  string filename = 2;
  int64 total_size = 3;
  string checksum = 4;
  int64 upload_time_ms = 5;
}

message DownloadRequest {
  string file_id = 1;
}

message ListRequest {
  int32 page = 1;
  int32 page_size = 2;
}

message ListResponse {
  repeated FileInfo files = 1;
  int32 total_count = 2;
}

message FileInfo {
  string file_id = 1;
  string filename = 2;
  int64 size = 3;
  string content_type = 4;
  int64 upload_time = 5;
}
```

#### Step 4: Implement File Upload Service

**services/file_service.py:**
```python
import grpc
import hashlib
import time
import os
from typing import Dict, List
from dataclasses import dataclass
from proto.file_upload_pb2 import UploadResponse, FileChunk, ListResponse, FileInfo
from proto.file_upload_pb2_grpc import FileServiceServicer

@dataclass
class StoredFile:
    """Represents a stored file"""
    file_id: str
    filename: str
    size: int
    content_type: str
    checksum: str
    upload_time: int
    data: bytes

class FileService(FileServiceServicer):
    """File upload/download service with streaming"""

    def __init__(self):
        self.files: Dict[str, StoredFile] = {}
        self.max_file_size = 50 * 1024 * 1024  # 50MB limit

    def UploadFile(self, request_iterator, context):
        """Handle file upload with streaming"""
        file_data = bytearray()
        filename = None
        content_type = "application/octet-stream"
        start_time = time.time()

        try:
            for chunk in request_iterator:
                # Get metadata from first chunk
                if filename is None:
                    filename = chunk.filename or "unnamed_file"
                    content_type = chunk.content_type or content_type

                # Accumulate file data
                file_data.extend(chunk.data)

                # Check file size limit
                if len(file_data) > self.max_file_size:
                    context.set_code(grpc.StatusCode.RESOURCE_EXHAUSTED)
                    context.set_details(f"File size exceeds maximum limit of {self.max_file_size} bytes")
                    return UploadResponse()

                # Check if client cancelled
                if not context.is_active():
                    context.set_code(grpc.StatusCode.CANCELLED)
                    context.set_details("Upload cancelled by client")
                    return UploadResponse()

            # File upload completed
            if not file_data:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("No file data received")
                return UploadResponse()

            # Calculate checksum
            checksum = hashlib.sha256(file_data).hexdigest()

            # Generate file ID
            file_id = hashlib.md5(f"{filename}{checksum}{time.time()}".encode()).hexdigest()

            # Store file
            upload_time = int(time.time() * 1000)
            stored_file = StoredFile(
                file_id=file_id,
                filename=filename,
                size=len(file_data),
                content_type=content_type,
                checksum=checksum,
                upload_time=upload_time,
                data=bytes(file_data)
            )

            self.files[file_id] = stored_file

            upload_duration = int((time.time() - start_time) * 1000)

            print(f"File uploaded: {filename} ({len(file_data)} bytes)")

            return UploadResponse(
                file_id=file_id,
                filename=filename,
                total_size=len(file_data),
                checksum=checksum,
                upload_time_ms=upload_duration
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Upload failed: {str(e)}")
            return UploadResponse()

    def DownloadFile(self, request, context):
        """Handle file download with streaming"""
        file_id = request.file_id

        if file_id not in self.files:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"File not found: {file_id}")
            return

        stored_file = self.files[file_id]

        # Stream file in chunks
        chunk_size = 64 * 1024  # 64KB chunks
        offset = 0

        try:
            while offset < len(stored_file.data):
                chunk_end = min(offset + chunk_size, len(stored_file.data))
                chunk_data = stored_file.data[offset:chunk_end]

                chunk = FileChunk(
                    filename=stored_file.filename,
                    data=chunk_data,
                    offset=offset,
                    eof=(chunk_end >= len(stored_file.data)),
                    content_type=stored_file.content_type
                )

                yield chunk

                offset = chunk_end

                # Check if client is still connected
                if not context.is_active():
                    break

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Download failed: {str(e)}")

    def ListFiles(self, request, context):
        """List uploaded files with pagination"""
        page = request.page or 1
        page_size = request.page_size or 10

        # Convert stored files to FileInfo
        all_files = []
        for stored_file in self.files.values():
            file_info = FileInfo(
                file_id=stored_file.file_id,
                filename=stored_file.filename,
                size=stored_file.size,
                content_type=stored_file.content_type,
                upload_time=stored_file.upload_time
            )
            all_files.append(file_info)

        # Sort by upload time (newest first)
        all_files.sort(key=lambda x: x.upload_time, reverse=True)

        # Apply pagination
        total_count = len(all_files)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        paginated_files = all_files[start_idx:end_idx]

        return ListResponse(
            files=paginated_files,
            total_count=total_count
        )
```

### Part 3: Bidirectional Streaming - Chat Service

#### Step 5: Create Chat Service

**proto/chat.proto:**
```protobuf
syntax = "proto3";

package chat;

service ChatService {
  rpc JoinChat (JoinRequest) returns (stream ChatMessage);
  rpc SendMessage (stream ChatMessage) returns (SendResponse);
  rpc GetChatHistory (HistoryRequest) returns (stream ChatMessage);
}

message JoinRequest {
  string username = 1;
  string room_id = 2;
}

message ChatMessage {
  string message_id = 1;
  string username = 2;
  string room_id = 3;
  string content = 4;
  int64 timestamp = 5;
  MessageType type = 6;
}

enum MessageType {
  MESSAGE = 0;
  JOIN = 1;
  LEAVE = 2;
  SYSTEM = 3;
}

message SendResponse {
  int32 messages_sent = 1;
  string status = 2;
}

message HistoryRequest {
  string room_id = 1;
  int32 limit = 2;
  int64 since_timestamp = 3;
}
```

#### Step 6: Implement Chat Service

**services/chat_service.py:**
```python
import grpc
import asyncio
import threading
import time
from typing import Dict, List, Set
from collections import defaultdict, deque
from dataclasses import dataclass
from proto.chat_pb2 import ChatMessage, SendResponse, MessageType
from proto.chat_pb2_grpc import ChatServiceServicer

@dataclass
class ChatRoom:
    """Represents a chat room"""
    room_id: str
    messages: deque = None  # Limited history
    active_users: Set[str] = None

    def __post_init__(self):
        if self.messages is None:
            self.messages = deque(maxlen=1000)  # Keep last 1000 messages
        if self.active_users is None:
            self.active_users = set()

class ChatService(ChatServiceServicer):
    """Real-time chat service with bidirectional streaming"""

    def __init__(self):
        self.rooms: Dict[str, ChatRoom] = defaultdict(ChatRoom)
        self.active_streams: Dict[str, grpc.ServicerContext] = {}

    def JoinChat(self, request, context):
        """Join a chat room and receive message stream"""
        username = request.username
        room_id = request.room_id

        if not username or not room_id:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Username and room_id are required")
            return

        # Add user to room
        room = self.rooms[room_id]
        room.active_users.add(username)

        # Send join message to room
        join_message = ChatMessage(
            message_id=f"join-{username}-{int(time.time())}",
            username=username,
            room_id=room_id,
            content=f"{username} joined the chat",
            timestamp=int(time.time() * 1000),
            type=MessageType.JOIN
        )

        room.messages.append(join_message)

        print(f"{username} joined room {room_id}")

        try:
            # Send recent messages first
            recent_messages = list(room.messages)[-10:]  # Last 10 messages
            for message in recent_messages:
                yield message

            # Keep connection alive and send new messages
            last_message_time = time.time()

            while context.is_active():
                current_time = time.time()

                # Check for new messages
                new_messages = [msg for msg in room.messages
                              if msg.timestamp > (last_message_time * 1000)]

                for message in new_messages:
                    yield message

                if new_messages:
                    last_message_time = current_time

                # Send heartbeat every 30 seconds
                if current_time - last_message_time > 30:
                    heartbeat = ChatMessage(
                        message_id=f"heartbeat-{int(current_time)}",
                        username="system",
                        room_id=room_id,
                        content="ping",
                        timestamp=int(current_time * 1000),
                        type=MessageType.SYSTEM
                    )
                    yield heartbeat
                    last_message_time = current_time

                time.sleep(0.1)  # Small delay to prevent busy waiting

        except Exception as e:
            print(f"Error in chat stream for {username}: {e}")
        finally:
            # Remove user from room
            room.active_users.discard(username)

            # Send leave message
            leave_message = ChatMessage(
                message_id=f"leave-{username}-{int(time.time())}",
                username=username,
                room_id=room_id,
                content=f"{username} left the chat",
                timestamp=int(time.time() * 1000),
                type=MessageType.LEAVE
            )

            room.messages.append(leave_message)

            print(f"{username} left room {room_id}")

    def SendMessage(self, request_iterator, context):
        """Send messages to chat rooms"""
        messages_sent = 0

        try:
            for message in request_iterator:
                if not message.username or not message.room_id or not message.content:
                    continue

                # Create full message
                full_message = ChatMessage(
                    message_id=f"msg-{message.username}-{int(time.time())}",
                    username=message.username,
                    room_id=message.room_id,
                    content=message.content,
                    timestamp=int(time.time() * 1000),
                    type=MessageType.MESSAGE
                )

                # Add to room history
                room = self.rooms[message.room_id]
                room.messages.append(full_message)

                messages_sent += 1

                print(f"Message from {message.username} in {message.room_id}: {message.content}")

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error processing messages: {str(e)}")
            return SendResponse(messages_sent=messages_sent, status="error")

        return SendResponse(
            messages_sent=messages_sent,
            status="success"
        )

    def GetChatHistory(self, request, context):
        """Get chat history for a room"""
        room_id = request.room_id
        limit = request.limit or 50
        since_timestamp = request.since_timestamp or 0

        if room_id not in self.rooms:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"Room not found: {room_id}")
            return

        room = self.rooms[room_id]

        # Filter messages
        filtered_messages = [
            msg for msg in room.messages
            if msg.timestamp >= since_timestamp
        ]

        # Apply limit (most recent first)
        filtered_messages = filtered_messages[-limit:]

        for message in filtered_messages:
            yield message
```

## Running the Streaming Services

### Start All Services
```bash
# Terminal 1: Stock service
python services/stock_service.py

# Terminal 2: File service
python services/file_service.py

# Terminal 3: Chat service
python services/chat_service.py
```

### Test Streaming Scenarios
```bash
# Test stock streaming
python clients/stock_client.py

# Test file upload/download
python clients/file_client.py

# Test chat functionality
python clients/chat_client.py
```

## Challenge Exercises

### Challenge 1: Real-Time Analytics Dashboard
1. Create a service that streams real-time metrics
2. Implement client-side charts and graphs
3. Add filtering and aggregation capabilities
4. Handle high-frequency data streams

### Challenge 2: Collaborative Document Editing
1. Implement operational transformation for concurrent edits
2. Stream document changes in real-time
3. Handle conflict resolution
4. Add user presence indicators

### Challenge 3: IoT Sensor Network
1. Create sensor data ingestion service
2. Implement real-time alerting for sensor readings
3. Add data aggregation and analytics
4. Handle thousands of concurrent sensor streams

## Verification Checklist

### Server Streaming
- [ ] Stock price service streams real-time data
- [ ] Client can subscribe to specific symbols
- [ ] Stream handles client disconnection gracefully
- [ ] Error scenarios are handled properly

### Client Streaming
- [ ] File upload works with chunked streaming
- [ ] Large files are handled efficiently
- [ ] Upload progress is tracked
- [ ] Error recovery works correctly

### Bidirectional Streaming
- [ ] Chat service handles multiple concurrent users
- [ ] Real-time message delivery works
- [ ] User join/leave notifications work
- [ ] Message history is maintained

### Performance & Reliability
- [ ] Services handle high load appropriately
- [ ] Memory usage is controlled
- [ ] Connection timeouts are handled
- [ ] Backpressure mechanisms work

## Troubleshooting

### Streaming Issues

**Stream not receiving data:**
- Check if client is properly reading from the stream
- Verify server is yielding messages correctly
- Look for exceptions in server logs

**Memory issues with large streams:**
- Implement proper chunking for large data
- Use streaming responses for large datasets
- Monitor memory usage in production

**Connection drops:**
- Implement reconnection logic in clients
- Add heartbeat messages for long-running streams
- Handle network interruptions gracefully

**Performance bottlenecks:**
- Profile server performance
- Optimize message serialization
- Use appropriate chunk sizes
- Implement rate limiting

## Next Steps
- [Workshop: Advanced gRPC Patterns](../workshops/workshop-04-advanced-grpc.md)

## Additional Resources
- [gRPC Streaming Guide](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [Streaming Best Practices](https://grpc.io/docs/guides/performance/)
- [Flow Control](https://grpc.io/blog/flow-control/)
- [Real-time Applications with gRPC](https://grpc.io/docs/guides/auth/)

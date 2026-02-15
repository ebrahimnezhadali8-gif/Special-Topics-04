# Workshop 02: Background Tasks Implementation

## Overview
This workshop implements background task processing in FastAPI applications. You'll create a system for handling email notifications, data processing, and long-running operations asynchronously, improving application performance and user experience.

## Prerequisites
- Completed [Background Tasks Tutorial](../tutorials/02-background-tasks.md)
- Completed [JWT Authentication Workshop](../workshops/workshop-01-jwt-auth.md)
- Understanding of async programming and task queues

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement background tasks for email sending and notifications
- Set up Celery for advanced task processing
- Handle long-running data processing operations
- Monitor and manage background task execution
- Implement proper error handling and retries

## Workshop Structure

### Part 1: Basic Background Tasks

#### Step 1: Project Setup

Create a new project that builds on the authentication system:

```bash
mkdir background-tasks-workshop
cd background-tasks-workshop
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

uv add fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart sqlalchemy redis celery

# Optional: For email sending
uv add aiosmtplib

mkdir -p app/{tasks,models,schemas,routes,core}
touch app/__init__.py app/main.py app/database.py app/config.py
touch app/tasks/__init__.py app/tasks/email.py app/tasks/data_processing.py
touch app/models/__init__.py app/models/task.py
touch app/schemas/__init__.py app/schemas/task.py
touch app/routes/__init__.py app/routes/tasks.py
touch app/core/__init__.py app/core/celery_app.py app/core/redis_client.py
mkdir tests && touch tests/__init__.py tests/test_tasks.py
```

#### Step 2: Configuration

**app/config.py:**
```python
from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./tasks.db")

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Email settings
    smtp_server: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME")
    smtp_password: str = os.getenv("SMTP_PASSWORD")
    from_email: str = os.getenv("FROM_EMAIL", "noreply@example.com")

    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

#### Step 3: Redis Client Setup

**app/core/redis_client.py:**
```python
from redis.asyncio import Redis
from ..config import settings

# Global Redis client
redis_client = Redis.from_url(settings.redis_url)

async def get_redis():
    """Dependency to get Redis client"""
    return redis_client

async def init_redis():
    """Initialize Redis connection"""
    try:
        await redis_client.ping()
        print("Redis connection successful")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        raise

async def close_redis():
    """Close Redis connection"""
    await redis_client.close()
```

#### Step 4: Task Models

**app/models/task.py:**
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.sql import func
from ..database import Base

class BackgroundTask(Base):
    __tablename__ = "background_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String(50), nullable=False, index=True)  # email, data_processing, etc.
    task_id = Column(String(100), unique=True, nullable=False, index=True)  # Celery task ID
    status = Column(String(20), default="pending", nullable=False)  # pending, running, completed, failed
    progress = Column(Float, default=0.0)  # Progress percentage (0-100)
    result = Column(Text, nullable=True)  # Task result data
    error = Column(Text, nullable=True)  # Error message if failed
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    user_id = Column(Integer, nullable=True)  # User who initiated the task
    metadata_ = Column(Text, nullable=True)  # Additional task data as JSON
```

#### Step 5: Task Schemas

**app/schemas/task.py:**
```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskType(str, Enum):
    EMAIL = "email"
    DATA_PROCESSING = "data_processing"
    REPORT_GENERATION = "report_generation"
    FILE_PROCESSING = "file_processing"

class BackgroundTaskBase(BaseModel):
    task_type: TaskType
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    progress: float = Field(0.0, ge=0.0, le=100.0)
    result: Optional[str] = None
    error: Optional[str] = None

class BackgroundTaskCreate(BaseModel):
    task_type: TaskType
    user_id: Optional[int] = None
    metadata_: Optional[Dict[str, Any]] = None

class BackgroundTask(BackgroundTaskBase):
    id: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: Optional[int] = None
    metadata_: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

class EmailTaskRequest(BaseModel):
    to_email: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body content")
    priority: str = Field("normal", regex=r'^(low|normal|high|urgent)$')

class DataProcessingTaskRequest(BaseModel):
    data_source: str = Field(..., description="Source of data to process")
    processing_type: str = Field(..., regex=r'^(clean|analyze|transform|aggregate)$')
    output_format: str = Field("json", regex=r'^(json|csv|xml)$')
    filters: Optional[Dict[str, Any]] = None
```

### Part 2: Email Background Tasks

#### Step 6: Email Task Implementation

**app/tasks/email.py:**
```python
import asyncio
from typing import Dict, Any
from ..config import settings
from ..core.redis_client import redis_client

async def send_email_task(
    to_email: str,
    subject: str,
    body: str,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Send email asynchronously
    In a real application, you'd use aiosmtplib or an email service like SendGrid
    """
    try:
        # Simulate email sending with different delays based on priority
        delays = {
            "low": 3,
            "normal": 1,
            "high": 0.5,
            "urgent": 0.1
        }
        delay = delays.get(priority, 1)

        await asyncio.sleep(delay)

        # Simulate email sending
        email_data = {
            "to": to_email,
            "subject": subject,
            "body": body[:100] + "..." if len(body) > 100 else body,
            "priority": priority,
            "sent_at": asyncio.get_event_loop().time()
        }

        # Store email in Redis for tracking (in production, you'd use a proper email service)
        await redis_client.lpush(f"emails:{to_email}", str(email_data))

        print(f"Email sent to {to_email}: {subject}")

        return {
            "status": "sent",
            "email_id": f"email_{int(asyncio.get_event_loop().time())}",
            "recipient": to_email,
            "priority": priority
        }

    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        raise

async def send_welcome_email(user_email: str, user_name: str) -> Dict[str, Any]:
    """Send welcome email to new user"""
    subject = f"Welcome to our platform, {user_name}!"
    body = f"""
    Dear {user_name},

    Welcome to our platform! We're excited to have you on board.

    Your account has been successfully created and you can now start using all our features.

    If you have any questions, please don't hesitate to contact our support team.

    Best regards,
    The Team
    """

    return await send_email_task(user_email, subject, body, "high")

async def send_password_reset_email(user_email: str, reset_token: str) -> Dict[str, Any]:
    """Send password reset email"""
    subject = "Password Reset Request"
    body = f"""
    You have requested to reset your password.

    Please click the following link to reset your password:
    https://yourapp.com/reset-password?token={reset_token}

    This link will expire in 1 hour.

    If you didn't request this reset, please ignore this email.

    Best regards,
    The Security Team
    """

    return await send_email_task(user_email, subject, body, "urgent")

async def send_notification_email(
    user_email: str,
    notification_type: str,
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """Send notification email"""
    subjects = {
        "account_update": "Your Account Has Been Updated",
        "new_feature": "New Feature Available",
        "security_alert": "Security Alert for Your Account",
        "newsletter": "Weekly Newsletter"
    }

    subject = subjects.get(notification_type, "Notification")

    # Generate body based on notification type
    if notification_type == "account_update":
        body = f"Your account information has been updated: {data}"
    elif notification_type == "new_feature":
        body = f"We've added a new feature: {data.get('feature_name', 'Unknown feature')}"
    elif notification_type == "security_alert":
        body = f"Security alert: {data.get('message', 'Please check your account')}"
    else:
        body = f"Notification: {data}"

    return await send_email_task(user_email, subject, body)
```

### Part 3: Data Processing Background Tasks

#### Step 7: Data Processing Tasks

**app/tasks/data_processing.py:**
```python
import asyncio
import json
from typing import Dict, Any, List
import csv
import io

async def process_data_task(
    data_source: str,
    processing_type: str,
    output_format: str,
    filters: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Process data asynchronously
    """
    try:
        # Simulate data fetching
        await asyncio.sleep(0.5)
        raw_data = await fetch_data_from_source(data_source)

        # Apply filters if provided
        if filters:
            raw_data = apply_filters(raw_data, filters)

        # Process data based on type
        if processing_type == "clean":
            processed_data = clean_data(raw_data)
        elif processing_type == "analyze":
            processed_data = analyze_data(raw_data)
        elif processing_type == "transform":
            processed_data = transform_data(raw_data)
        elif processing_type == "aggregate":
            processed_data = aggregate_data(raw_data)
        else:
            processed_data = raw_data

        # Format output
        if output_format == "json":
            output = json.dumps(processed_data, indent=2)
        elif output_format == "csv":
            output = convert_to_csv(processed_data)
        elif output_format == "xml":
            output = convert_to_xml(processed_data)
        else:
            output = str(processed_data)

        return {
            "status": "completed",
            "processing_type": processing_type,
            "output_format": output_format,
            "records_processed": len(processed_data) if isinstance(processed_data, list) else 1,
            "data": output
        }

    except Exception as e:
        raise Exception(f"Data processing failed: {str(e)}")

async def fetch_data_from_source(source: str) -> List[Dict]:
    """Simulate fetching data from various sources"""
    # In a real application, this would connect to databases, APIs, files, etc.
    await asyncio.sleep(0.2)

    if source == "users":
        return [
            {"id": 1, "name": "Alice", "email": "alice@example.com", "active": True},
            {"id": 2, "name": "Bob", "email": "bob@example.com", "active": False},
            {"id": 3, "name": "Charlie", "email": "charlie@example.com", "active": True},
        ]
    elif source == "orders":
        return [
            {"id": 1, "user_id": 1, "amount": 99.99, "status": "completed"},
            {"id": 2, "user_id": 2, "amount": 49.99, "status": "pending"},
            {"id": 3, "user_id": 1, "amount": 149.99, "status": "completed"},
        ]
    else:
        return [{"message": f"Sample data from {source}"}]

def apply_filters(data: List[Dict], filters: Dict[str, Any]) -> List[Dict]:
    """Apply filters to data"""
    filtered_data = data

    for key, value in filters.items():
        if isinstance(value, dict):
            # Range filters
            if "min" in value:
                filtered_data = [item for item in filtered_data if item.get(key, 0) >= value["min"]]
            if "max" in value:
                filtered_data = [item for item in filtered_data if item.get(key, 0) <= value["max"]]
        else:
            # Exact match filters
            filtered_data = [item for item in filtered_data if item.get(key) == value]

    return filtered_data

def clean_data(data: List[Dict]) -> List[Dict]:
    """Clean and normalize data"""
    cleaned = []
    for item in data:
        cleaned_item = {}
        for key, value in item.items():
            # Normalize keys
            clean_key = key.lower().replace(" ", "_")

            # Clean values
            if isinstance(value, str):
                clean_value = value.strip()
            else:
                clean_value = value

            cleaned_item[clean_key] = clean_value
        cleaned.append(cleaned_item)
    return cleaned

def analyze_data(data: List[Dict]) -> Dict[str, Any]:
    """Analyze data and return statistics"""
    if not data:
        return {"error": "No data to analyze"}

    # Basic statistics
    stats = {
        "total_records": len(data),
        "fields": list(data[0].keys()) if data else [],
        "field_types": {}
    }

    # Analyze field types and values
    for field in stats["fields"]:
        values = [item.get(field) for item in data if item.get(field) is not None]
        if values:
            stats["field_types"][field] = {
                "type": type(values[0]).__name__,
                "unique_values": len(set(str(v) for v in values)),
                "null_count": len(data) - len(values)
            }

    return stats

def transform_data(data: List[Dict]) -> List[Dict]:
    """Transform data structure"""
    transformed = []
    for item in data:
        # Example transformation: flatten nested structures, rename fields
        transformed_item = {
            "record_id": item.get("id"),
            "name": item.get("name") or item.get("title"),
            "details": {k: v for k, v in item.items() if k not in ["id", "name", "title"]},
            "processed": True
        }
        transformed.append(transformed_item)
    return transformed

def aggregate_data(data: List[Dict]) -> Dict[str, Any]:
    """Aggregate data for reporting"""
    if not data:
        return {"error": "No data to aggregate"}

    # Group by common fields and calculate aggregates
    aggregated = {
        "total_count": len(data),
        "groups": {}
    }

    # Group by status if it exists
    if any("status" in item for item in data):
        status_groups = {}
        for item in data:
            status = item.get("status", "unknown")
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append(item)

        aggregated["groups"]["by_status"] = {
            status: len(items) for status, items in status_groups.items()
        }

    # Calculate numeric aggregates
    numeric_fields = []
    for item in data:
        for key, value in item.items():
            if isinstance(value, (int, float)):
                numeric_fields.append(key)

    if numeric_fields:
        aggregated["numeric_aggregates"] = {}
        for field in set(numeric_fields):
            values = [item[field] for item in data if field in item and isinstance(item[field], (int, float))]
            if values:
                aggregated["numeric_aggregates"][field] = {
                    "sum": sum(values),
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }

    return aggregated

def convert_to_csv(data: List[Dict]) -> str:
    """Convert data to CSV format"""
    if not data:
        return ""

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()

def convert_to_xml(data: List[Dict]) -> str:
    """Convert data to XML format"""
    if not data:
        return "<data></data>"

    xml_parts = ["<data>"]
    for item in data:
        xml_parts.append("  <item>")
        for key, value in item.items():
            xml_parts.append(f"    <{key}>{value}</{key}>")
        xml_parts.append("  </item>")
    xml_parts.append("</data>")

    return "\n".join(xml_parts)
```

### Part 4: Celery Integration

#### Step 8: Celery Configuration

**app/core/celery_app.py:**
```python
from celery import Celery
from ..config import settings

celery_app = Celery(
    "background_tasks",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.celery_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.tasks.celery_tasks.send_email_celery": {"queue": "email"},
        "app.tasks.celery_tasks.process_data_celery": {"queue": "processing"},
    },
    task_default_queue="default",
    task_default_exchange="tasks",
    task_default_routing_key="task.default",
)

if __name__ == "__main__":
    celery_app.start()
```

**app/tasks/celery_tasks.py:**
```python
from ..core.celery_app import celery_app
from .email import send_email_task, send_welcome_email, send_password_reset_email
from .data_processing import process_data_task
import asyncio

@celery_app.task(bind=True)
def send_email_celery(self, to_email: str, subject: str, body: str, priority: str = "normal"):
    """Celery task for sending emails"""
    # Update task state
    self.update_state(state="PROGRESS", meta={"progress": 10})

    try:
        # Run async function in new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(send_email_task(to_email, subject, body, priority))
        loop.close()

        self.update_state(state="PROGRESS", meta={"progress": 100})
        return result

    except Exception as e:
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise

@celery_app.task(bind=True)
def process_data_celery(self, data_source: str, processing_type: str, output_format: str, filters=None):
    """Celery task for data processing"""
    self.update_state(state="PROGRESS", meta={"progress": 5})

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Simulate progress updates
        self.update_state(state="PROGRESS", meta={"progress": 25})

        result = loop.run_until_complete(
            process_data_task(data_source, processing_type, output_format, filters)
        )

        loop.close()
        self.update_state(state="PROGRESS", meta={"progress": 100})
        return result

    except Exception as e:
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise

@celery_app.task(bind=True)
def send_welcome_email_celery(self, user_email: str, user_name: str):
    """Celery task for welcome emails"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(send_welcome_email(user_email, user_name))
        loop.close()
        return result
    except Exception as e:
        raise
```

### Part 5: API Integration

#### Step 9: Task Management API

**app/routes/tasks.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.task import BackgroundTask
from ..schemas.task import (
    BackgroundTask, BackgroundTaskCreate, EmailTaskRequest,
    DataProcessingTaskRequest, TaskStatus
)
from ..tasks.email import send_email_task, send_welcome_email
from ..tasks.data_processing import process_data_task
from ..core.celery_app import celery_app
from ..auth.dependencies import get_current_active_user
import uuid

router = APIRouter(prefix="/tasks", tags=["background-tasks"])

@router.post("/email/send", response_model=BackgroundTask, status_code=status.HTTP_201_CREATED)
async def send_email_background(
    email_request: EmailTaskRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Send email as background task"""
    task_id = str(uuid.uuid4())

    # Create task record
    db_task = BackgroundTask(
        task_type="email",
        task_id=task_id,
        user_id=current_user.id,
        metadata_={
            "to_email": email_request.to_email,
            "subject": email_request.subject,
            "priority": email_request.priority
        }
    )
    db.add(db_task)
    db.commit()

    # Add background task
    background_tasks.add_task(
        process_email_task,
        task_id,
        email_request.to_email,
        email_request.subject,
        email_request.body,
        email_request.priority
    )

    return db_task

@router.post("/data/process", response_model=BackgroundTask, status_code=status.HTTP_201_CREATED)
async def process_data_background(
    data_request: DataProcessingTaskRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Process data as background task"""
    task_id = str(uuid.uuid4())

    # Create task record
    db_task = BackgroundTask(
        task_type="data_processing",
        task_id=task_id,
        user_id=current_user.id,
        metadata_={
            "data_source": data_request.data_source,
            "processing_type": data_request.processing_type,
            "output_format": data_request.output_format,
            "filters": data_request.filters
        }
    )
    db.add(db_task)
    db.commit()

    # Add background task
    background_tasks.add_task(
        process_data_background_task,
        task_id,
        data_request.data_source,
        data_request.processing_type,
        data_request.output_format,
        data_request.filters
    )

    return db_task

@router.get("/", response_model=List[BackgroundTask])
async def get_user_tasks(
    skip: int = 0,
    limit: int = 100,
    task_type: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get user's background tasks"""
    query = db.query(BackgroundTask).filter(BackgroundTask.user_id == current_user.id)

    if task_type:
        query = query.filter(BackgroundTask.task_type == task_type)
    if status:
        query = query.filter(BackgroundTask.status == status)

    tasks = query.offset(skip).limit(limit).all()
    return tasks

@router.get("/{task_id}", response_model=BackgroundTask)
async def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get specific task by ID"""
    task = db.query(BackgroundTask).filter(
        BackgroundTask.task_id == task_id,
        BackgroundTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Cancel a pending task"""
    task = db.query(BackgroundTask).filter(
        BackgroundTask.task_id == task_id,
        BackgroundTask.user_id == current_user.id,
        BackgroundTask.status == TaskStatus.PENDING
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or cannot be cancelled")

    # Cancel Celery task if it exists
    try:
        celery_app.control.revoke(task_id, terminate=True)
    except:
        pass  # Task might not exist in Celery

    # Update task status
    task.status = TaskStatus.FAILED
    task.error = "Cancelled by user"
    db.commit()

# Background task functions
async def process_email_task(task_id: str, to_email: str, subject: str, body: str, priority: str):
    """Process email sending task"""
    from ..database import SessionLocal
    import datetime

    db = SessionLocal()
    try:
        # Update task status to running
        task = db.query(BackgroundTask).filter(BackgroundTask.task_id == task_id).first()
        if task:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.datetime.utcnow()
            db.commit()

        # Send email
        result = await send_email_task(to_email, subject, body, priority)

        # Update task as completed
        if task:
            task.status = TaskStatus.COMPLETED
            task.progress = 100.0
            task.result = str(result)
            task.completed_at = datetime.datetime.utcnow()
            db.commit()

    except Exception as e:
        # Update task as failed
        if task:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.datetime.utcnow()
            db.commit()
    finally:
        db.close()

async def process_data_background_task(
    task_id: str,
    data_source: str,
    processing_type: str,
    output_format: str,
    filters: dict = None
):
    """Process data processing task"""
    from ..database import SessionLocal
    import datetime

    db = SessionLocal()
    try:
        # Update task status to running
        task = db.query(BackgroundTask).filter(BackgroundTask.task_id == task_id).first()
        if task:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.datetime.utcnow()
            db.commit()

        # Process data
        result = await process_data_task(data_source, processing_type, output_format, filters)

        # Update task as completed
        if task:
            task.status = TaskStatus.COMPLETED
            task.progress = 100.0
            task.result = str(result)
            task.completed_at = datetime.datetime.utcnow()
            db.commit()

    except Exception as e:
        # Update task as failed
        if task:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.datetime.utcnow()
            db.commit()
    finally:
        db.close()
```

## Running the Application

```bash
# Start Redis (if not already running)
redis-server

# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info --queues=email,processing

# Create database tables
python -c "from app.database import create_tables; create_tables()"

# Start FastAPI application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v
```

## Testing Background Tasks

```bash
# Send email task
curl -X POST "http://localhost:8000/tasks/email/send" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "to_email": "user@example.com",
       "subject": "Test Email",
       "body": "This is a test email sent as background task",
       "priority": "normal"
     }'

# Process data task
curl -X POST "http://localhost:8000/tasks/data/process" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "data_source": "users",
       "processing_type": "analyze",
       "output_format": "json"
     }'

# Check task status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/tasks/TASK_ID_HERE"

# List user tasks
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/tasks/"
```

## Challenge Exercises

### Challenge 1: File Processing Pipeline
1. Create file upload endpoint with background processing
2. Implement image resizing and optimization
3. Add file format conversion (PDF to text, etc.)
4. Create progress tracking for large files

### Challenge 2: Notification System
1. Implement real-time notifications using WebSockets
2. Create notification preferences for users
3. Add notification scheduling and queuing
4. Implement push notifications for mobile

### Challenge 3: Advanced Task Monitoring
1. Add task retry logic with exponential backoff
2. Implement task dependencies and workflows
3. Create task analytics and reporting
4. Add task prioritization and resource limits

## Verification Checklist

### Background Tasks
- [ ] Basic background tasks implemented
- [ ] Email sending functionality working
- [ ] Data processing tasks operational
- [ ] Task status tracking implemented
- [ ] Error handling and retries working

### Celery Integration
- [ ] Celery worker configured
- [ ] Task queues set up correctly
- [ ] Task routing working
- [ ] Monitoring and logging functional

### API Integration
- [ ] Task creation endpoints working
- [ ] Task status checking implemented
- [ ] Task cancellation available
- [ ] Proper authentication and authorization

### Testing
- [ ] Unit tests for task functions
- [ ] Integration tests for background tasks
- [ ] API endpoint tests
- [ ] Error scenario testing

## Troubleshooting

### Common Issues

**Redis connection errors:**
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL configuration
- Verify network connectivity

**Celery worker not starting:**
- Check Celery installation: `celery --version`
- Verify import paths in celery_app.py
- Check Redis broker configuration

**Tasks not executing:**
- Check Celery worker logs
- Verify task registration
- Test task functions directly

**Database session errors:**
- Ensure proper session management in background tasks
- Check for connection leaks
- Verify database availability

## Next Steps
- [Async Database Tutorial](../tutorials/04-async-database.md)
- [Workshop: Async API](../workshops/workshop-03-async-api.md)

## Additional Resources
- [Celery Documentation](https://docs.celeryproject.org/)
- [Redis Documentation](https://redis.io/documentation)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Task Queue Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)

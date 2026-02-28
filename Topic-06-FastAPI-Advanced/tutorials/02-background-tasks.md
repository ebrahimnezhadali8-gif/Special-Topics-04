# Tutorial 02: Background Tasks

## Overview
This tutorial covers background tasks in FastAPI, allowing you to execute operations asynchronously after returning a response to the client. You'll learn how to implement email sending, data processing, notifications, and other background operations that don't block the main request/response cycle.

## What are Background Tasks?

Background tasks allow you to run operations after sending the response to the client. This is useful for:

- **Email sending**: Send confirmation emails without delaying response
- **Data processing**: Process uploaded files or large datasets
- **Notifications**: Send push notifications or webhooks
- **Logging**: Log analytics data without affecting response time
- **Cleanup**: Perform cleanup operations after request completion

## Basic Background Tasks

### Simple Background Task

```python
from fastapi import FastAPI, BackgroundTasks
import time

app = FastAPI()

def send_email_notification(email: str, message: str):
    """Simulate sending an email (would normally use smtplib or service like SendGrid)"""
    print(f"Sending email to {email}: {message}")
    time.sleep(2)  # Simulate email sending time
    print(f"Email sent to {email}")

@app.post("/send-notification")
async def send_notification(email: str, message: str, background_tasks: BackgroundTasks):
    """
    Send a notification and return immediately.
    The actual email sending happens in the background.
    """
    # Add background task
    background_tasks.add_task(send_email_notification, email, message)

    # Return response immediately
    return {"message": "Notification will be sent in the background"}
```

### Background Task with Dependencies

```python
from fastapi import FastAPI, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

app = FastAPI()

async def process_user_registration(user_id: int, db: AsyncSession):
    """Process user registration in background"""
    await asyncio.sleep(1)  # Simulate processing time

    # Update user status in database
    # await update_user_status(db, user_id, "processed")

    print(f"User {user_id} registration processed")

@app.post("/register-user")
async def register_user(
    user_data: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a user and process registration in background.
    """
    # Create user immediately
    # user = await create_user(db, user_data)

    user_id = 123  # Placeholder

    # Add background task with database dependency
    background_tasks.add_task(process_user_registration, user_id, db)

    return {"message": "User registered, processing in background", "user_id": user_id}
```

## Advanced Background Tasks

### Task with Error Handling

```python
from fastapi import BackgroundTasks, HTTPException
import logging

logger = logging.getLogger(__name__)

def process_payment_with_retry(payment_id: str, max_retries: int = 3):
    """Process payment with retry logic"""
    for attempt in range(max_retries):
        try:
            # Simulate payment processing
            print(f"Processing payment {payment_id}, attempt {attempt + 1}")

            # Simulate random failure
            import random
            if random.random() < 0.7:  # 70% failure rate
                raise Exception("Payment gateway error")

            print(f"Payment {payment_id} processed successfully")
            return

        except Exception as e:
            logger.error(f"Payment {payment_id} attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logger.error(f"Payment {payment_id} failed after {max_retries} attempts")
                # Could send failure notification here
                return

@app.post("/process-payment")
async def process_payment(payment_data: dict, background_tasks: BackgroundTasks):
    """Process payment in background with retry logic"""
    payment_id = payment_data.get("payment_id", "unknown")

    background_tasks.add_task(process_payment_with_retry, payment_id)

    return {"message": "Payment processing started", "payment_id": payment_id}
```

### Multiple Background Tasks

```python
from fastapi import BackgroundTasks

def send_welcome_email(email: str):
    """Send welcome email"""
    print(f"Sending welcome email to {email}")
    # Email logic here

def create_user_profile(user_id: int):
    """Create user profile and initialize data"""
    print(f"Creating profile for user {user_id}")
    # Profile creation logic

def log_user_registration(user_id: int, ip_address: str):
    """Log user registration for analytics"""
    print(f"Logging registration: user {user_id} from {ip_address}")
    # Analytics logging

@app.post("/register-complete")
async def register_complete_user(
    user_data: dict,
    background_tasks: BackgroundTasks,
    request: Request
):
    """Complete user registration with multiple background tasks"""
    user_id = 123  # Would come from database

    # Add multiple background tasks
    background_tasks.add_task(send_welcome_email, user_data["email"])
    background_tasks.add_task(create_user_profile, user_id)
    background_tasks.add_task(
        log_user_registration,
        user_id,
        request.client.host
    )

    return {"message": "User registered, all tasks queued"}
```

## Background Tasks with Celery

### Integrating Celery for Advanced Background Processing

```python
# celery_app.py
from celery import Celery

celery_app = Celery(
    "fastapi_app",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def send_email_task(email: str, subject: str, body: str):
    """Celery task for sending emails"""
    print(f"Sending email to {email}")
    # Email sending logic
    return {"status": "sent", "email": email}

@celery_app.task
def process_file_task(file_path: str, user_id: int):
    """Process uploaded file"""
    print(f"Processing file {file_path} for user {user_id}")
    # File processing logic
    return {"status": "processed", "file_path": file_path}
```

```python
# main.py
from fastapi import FastAPI, BackgroundTasks, UploadFile, File
from .celery_app import send_email_task, process_file_task

app = FastAPI()

@app.post("/upload-and-process")
async def upload_and_process_file(
    file: UploadFile = File(...),
    user_email: str = None,
    background_tasks: BackgroundTasks = None
):
    """Upload file and process it in background using Celery"""
    # Save file
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Queue Celery tasks
    email_task = send_email_task.delay(
        user_email,
        "File Processing Started",
        f"Your file {file.filename} is being processed"
    )

    process_task = process_file_task.delay(file_path, 123)

    return {
        "message": "File uploaded and processing started",
        "email_task_id": email_task.id,
        "process_task_id": process_task.id
    }

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    """Check Celery task status"""
    from .celery_app import celery_app

    task_result = celery_app.AsyncResult(task_id)

    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None
    }
```

## Background Tasks with Database Operations

### Async Background Tasks

```python
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

async def update_user_stats_async(db: AsyncSession, user_id: int):
    """Update user statistics asynchronously"""
    await asyncio.sleep(0.1)  # Simulate processing

    # Database operation
    # await db.execute(update(models.UserStats).where(...))

    print(f"Updated stats for user {user_id}")

def update_user_stats_background(db: AsyncSession, user_id: int):
    """Wrapper to run async task in background"""
    asyncio.create_task(update_user_stats_async(db, user_id))

@app.post("/user-action")
async def user_action(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Handle user action and update stats in background"""
    # Main logic here
    action_result = {"user_id": user_id, "action": "completed"}

    # Add background task
    background_tasks.add_task(update_user_stats_background, db, user_id)

    return action_result
```

### Task Queues and Priorities

```python
from enum import Enum

class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

def process_task_with_priority(task_data: dict, priority: TaskPriority):
    """Process task based on priority"""
    print(f"Processing {priority} priority task: {task_data}")

    # Simulate different processing times
    delays = {
        TaskPriority.LOW: 5,
        TaskPriority.NORMAL: 2,
        TaskPriority.HIGH: 1,
        TaskPriority.URGENT: 0.1
    }

    import time
    time.sleep(delays[priority])

    print(f"Task completed: {task_data}")

@app.post("/queue-task")
async def queue_task(
    task_data: dict,
    priority: TaskPriority = TaskPriority.NORMAL,
    background_tasks: BackgroundTasks = None
):
    """Queue a task with priority"""
    background_tasks.add_task(
        process_task_with_priority,
        task_data,
        priority
    )

    return {
        "message": f"Task queued with {priority} priority",
        "task_data": task_data
    }
```

## Monitoring and Error Handling

### Task Monitoring

```python
from fastapi import BackgroundTasks, HTTPException
import uuid

# Store task status (in production, use Redis or database)
task_status = {}

def monitored_background_task(task_id: str, task_data: dict):
    """Background task with status tracking"""
    try:
        task_status[task_id] = {"status": "running", "progress": 0}

        # Simulate work with progress updates
        import time
        for i in range(10):
            time.sleep(0.5)
            task_status[task_id]["progress"] = (i + 1) * 10

        task_status[task_id] = {
            "status": "completed",
            "progress": 100,
            "result": f"Processed: {task_data}"
        }

    except Exception as e:
        task_status[task_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.post("/start-monitored-task")
async def start_monitored_task(
    task_data: dict,
    background_tasks: BackgroundTasks
):
    """Start a monitored background task"""
    task_id = str(uuid.uuid4())

    background_tasks.add_task(monitored_background_task, task_id, task_data)

    return {"task_id": task_id, "message": "Task started"}

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    """Get task status"""
    if task_id not in task_status:
        raise HTTPException(status_code=404, detail="Task not found")

    return task_status[task_id]
```

### Error Handling in Background Tasks

```python
import logging
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)

def safe_background_task(task_data: dict):
    """Background task with comprehensive error handling"""
    try:
        logger.info(f"Starting background task with data: {task_data}")

        # Task logic here
        result = perform_task_logic(task_data)

        logger.info(f"Background task completed successfully: {result}")

    except Exception as e:
        logger.error(f"Background task failed: {e}", exc_info=True)

        # Could send error notification, update database, etc.
        # send_error_notification(task_data, str(e))

def perform_task_logic(task_data: dict):
    """Task logic that might raise exceptions"""
    if "error" in task_data:
        raise ValueError("Simulated error")

    return {"processed": task_data, "status": "success"}

@app.post("/safe-background-task")
async def run_safe_background_task(
    task_data: dict,
    background_tasks: BackgroundTasks
):
    """Run background task with error handling"""
    background_tasks.add_task(safe_background_task, task_data)

    return {"message": "Task queued safely"}
```

## Best Practices

### When to Use Background Tasks

**Good use cases:**
- Email sending and notifications
- File processing and uploads
- Data analytics and logging
- External API calls that don't affect response
- Database maintenance tasks
- Report generation

**When NOT to use background tasks:**
- Operations required for response
- Critical path operations
- Operations that must complete before response
- Simple, fast operations

### Task Design Patterns

1. **Fire and Forget**: Tasks that don't need monitoring
2. **Monitored Tasks**: Tasks with status tracking
3. **Retry Logic**: Tasks with automatic retry on failure
4. **Priority Queues**: Different priority levels for tasks
5. **Batch Processing**: Group similar tasks for efficiency

### Performance Considerations

- **Resource Limits**: Limit concurrent background tasks
- **Timeout Handling**: Implement timeouts for long-running tasks
- **Error Recovery**: Implement retry logic and dead letter queues
- **Monitoring**: Track task success/failure rates
- **Cleanup**: Clean up completed tasks from memory

## Testing Background Tasks

### Testing Background Tasks

```python
from fastapi.testclient import TestClient
import pytest
from unittest.mock import patch, MagicMock

def test_background_task_called():
    """Test that background task is queued"""
    app = FastAPI()
    client = TestClient(app)

    mock_task = MagicMock()

    @app.post("/test")
    async def test_endpoint(background_tasks: BackgroundTasks):
        background_tasks.add_task(mock_task, "arg1", "arg2")
        return {"message": "ok"}

    response = client.post("/test")
    assert response.status_code == 200

    # Verify task was added
    mock_task.assert_called_once_with("arg1", "arg2")

def test_background_task_execution():
    """Test actual task execution"""
    from your_app import send_email_notification

    # Test the function directly
    send_email_notification("test@example.com", "Test message")

    # Verify email was "sent" (check logs, mock SMTP, etc.)
```

## Hands-on Exercises

### Exercise 1: Email Notification System
1. Create user registration endpoint with email confirmation
2. Implement background email sending
3. Add email templates and personalization
4. Test with mock email service

### Exercise 2: File Processing Pipeline
1. Create file upload endpoint
2. Process files in background (resize images, extract text, etc.)
3. Update processing status
4. Handle processing failures gracefully

### Exercise 3: Analytics and Logging
1. Add analytics tracking to endpoints
2. Log user actions in background
3. Aggregate analytics data periodically
4. Create analytics dashboard

## Next Steps
- [JWT Authentication Tutorial](../tutorials/03-jwt-authentication.md)
- [Async Database Tutorial](../tutorials/04-async-database.md)
- [Workshop: Background Tasks](../workshops/workshop-02-background-tasks.md)

## Additional Resources
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [Redis for Task Queues](https://redis.io/)
- [Background Task Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/async-request-reply)

# Tutorial 03: Request and Response Models

## Overview
This tutorial covers the design and implementation of request and response models in FastAPI. You'll learn how to create separate models for input and output, handle different scenarios, and ensure proper API documentation.

## Why Separate Request and Response Models?

Different models for requests and responses provide several benefits:

- **Security**: Hide sensitive fields from responses
- **Flexibility**: Different validation rules for input/output
- **Clarity**: Clear separation of concerns
- **Documentation**: Better OpenAPI documentation
- **Performance**: Exclude unnecessary fields from responses

## Basic Request/Response Pattern

### Simple Example
```python
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

# Request model - what clients send
class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

# Response model - what clients receive
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: str

    class Config:
        orm_mode = True

@app.post("/users/", response_model=UserResponse)
async def create_user(user: CreateUserRequest):
    # In real app, save to database and get back user with ID
    new_user = {
        "id": 1,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": True,
        "created_at": "2023-12-01T10:00:00Z"
    }
    return new_user
```

## Advanced Response Models

### Excluding Fields
```python
from pydantic import BaseModel, Field
from typing import Optional

class User(BaseModel):
    id: int
    username: str
    email: str
    password_hash: str  # Never expose this!
    is_active: bool
    created_at: str

# Response model that excludes sensitive fields
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: str

    class Config:
        orm_mode = True

# Alternative: Using Field exclusions
class UserResponseExclude(BaseModel):
    id: int
    username: str
    email: str
    password_hash: str = Field(exclude=True)  # Explicitly exclude
    is_active: bool
    created_at: str

    class Config:
        orm_mode = True
```

### Conditional Responses
```python
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Union

app = FastAPI()

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

class AdminUserResponse(UserResponse):
    role: str
    permissions: list[str]

# Union response - different models for different scenarios
@app.get("/users/{user_id}", response_model=Union[UserResponse, AdminUserResponse])
async def get_user(user_id: int, is_admin: bool = False):
    user = {"id": user_id, "username": "john", "email": "john@example.com", "is_active": True}

    if is_admin:
        return AdminUserResponse(**user, role="admin", permissions=["read", "write"])
    else:
        return UserResponse(**user)
```

## Request Model Patterns

### Optional Fields in Updates
```python
from pydantic import BaseModel, Field
from typing import Optional

class UserUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        extra = 'forbid'  # Don't allow extra fields

@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdateRequest):
    # Only update provided fields
    update_data = user_update.dict(exclude_unset=True)

    # In real app, update database
    updated_user = {
        "id": user_id,
        "username": update_data.get("username", "existing_username"),
        "email": update_data.get("email", "existing@email.com"),
        "is_active": update_data.get("is_active", True)
    }

    return updated_user
```

### Nested Request Models
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class AddressRequest(BaseModel):
    street: str
    city: str
    country: str
    postal_code: str = Field(..., regex=r'^\d{5}(-\d{4})?$')

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    addresses: List[AddressRequest] = []

class UserPreferencesRequest(BaseModel):
    theme: str = Field(..., regex=r'^(light|dark)$')
    notifications: bool = True
    language: str = "en"

class CompleteUserRequest(BaseModel):
    user: CreateUserRequest
    preferences: UserPreferencesRequest

@app.post("/users/complete")
async def create_complete_user(user_data: CompleteUserRequest):
    return {
        "message": "User created with preferences",
        "user": user_data.user,
        "preferences": user_data.preferences
    }
```

## Response Model Strategies

### Pagination Responses
```python
from pydantic import BaseModel, Field
from typing import List, Generic, TypeVar

T = TypeVar('T')

class PaginationMeta(BaseModel):
    total: int
    page: int
    size: int
    pages: int

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta

class UserSummary(BaseModel):
    id: int
    username: str
    email: str

@app.get("/users/", response_model=PaginatedResponse[UserSummary])
async def list_users(page: int = 1, size: int = 10):
    # In real app, query database with pagination
    users = [
        {"id": 1, "username": "user1", "email": "user1@example.com"},
        {"id": 2, "username": "user2", "email": "user2@example.com"}
    ]

    return {
        "data": users,
        "meta": {
            "total": 2,
            "page": page,
            "size": size,
            "pages": 1
        }
    }
```

### Error Responses
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: dict = {}

class ValidationErrorResponse(BaseModel):
    error: str = "validation_error"
    message: str
    fields: dict  # Field name -> error message

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id == 999:
        # Custom error response
        raise HTTPException(
            status_code=404,
            detail={
                "error": "user_not_found",
                "message": "User not found",
                "details": {"user_id": user_id}
            }
        )

    return {"id": user_id, "username": "user"}
```

## Advanced Patterns

### Different Response Models per Status Code
```python
from fastapi import FastAPI, responses
from pydantic import BaseModel

class Item(BaseModel):
    id: int
    name: str
    price: float

class ItemCreated(BaseModel):
    id: int
    name: str
    price: float
    created_at: str

class ItemList(BaseModel):
    items: list[Item]
    total: int

@app.post("/items/", responses={
    201: {"model": ItemCreated, "description": "Item created successfully"},
    400: {"model": dict, "description": "Validation error"}
})
async def create_item(item: Item):
    # Simulate creation
    created_item = ItemCreated(
        id=1,
        name=item.name,
        price=item.price,
        created_at="2023-12-01T10:00:00Z"
    )

    return responses.JSONResponse(
        status_code=201,
        content=created_item.dict()
    )

@app.get("/items/", response_model=ItemList)
async def list_items():
    return {
        "items": [
            {"id": 1, "name": "Item 1", "price": 10.0}
        ],
        "total": 1
    }
```

### File Upload/Download Models
```python
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional

class FileUploadRequest(BaseModel):
    description: str
    category: str

class FileResponse(BaseModel):
    id: int
    filename: str
    size: int
    content_type: str
    uploaded_at: str

@app.post("/files/", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    metadata: str = Form(...)  # JSON string
):
    # Parse metadata
    import json
    meta_dict = json.loads(metadata)

    return {
        "id": 1,
        "filename": file.filename,
        "size": 1024,
        "content_type": file.content_type,
        "uploaded_at": "2023-12-01T10:00:00Z"
    }

@app.get("/files/{file_id}/download")
async def download_file(file_id: int):
    # Return file response
    return {
        "filename": "example.txt",
        "content": b"file content"
    }
```

## Model Inheritance and Composition

### Base Models
```python
from pydantic import BaseModel, Field
from typing import Optional

class BaseModelMixin(BaseModel):
    id: int
    created_at: str
    updated_at: str

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class UserResponse(UserBase, BaseModelMixin):
    is_active: bool = True

    class Config:
        orm_mode = True
```

### Polymorphic Responses
```python
from pydantic import BaseModel
from typing import Union

class Animal(BaseModel):
    name: str

class Dog(Animal):
    breed: str
    good_boy: bool = True

class Cat(Animal):
    lives_remaining: int = 9
    lazy: bool = True

# Union type for different animal types
AnimalResponse = Union[Dog, Cat]

@app.get("/animals/{animal_id}", response_model=AnimalResponse)
async def get_animal(animal_id: int):
    if animal_id == 1:
        return Dog(name="Buddy", breed="Golden Retriever")
    else:
        return Cat(name="Whiskers", lives_remaining=8)
```

## API Documentation

### Model Examples
```python
from pydantic import BaseModel, Field

class CreatePostRequest(BaseModel):
    title: str = Field(..., example="My Blog Post")
    content: str = Field(..., example="This is the content of my blog post")
    published: bool = Field(True, example=True)
    tags: list[str] = Field([], example=["python", "fastapi"])

    class Config:
        schema_extra = {
            "example": {
                "title": "Complete Guide to FastAPI",
                "content": "FastAPI is a modern web framework...",
                "published": True,
                "tags": ["python", "fastapi", "api"]
            }
        }

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    published: bool
    tags: list[str]
    author: str
    created_at: str
    updated_at: str

    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "title": "Complete Guide to FastAPI",
                "content": "FastAPI is a modern web framework...",
                "published": True,
                "tags": ["python", "fastapi", "api"],
                "author": "John Doe",
                "created_at": "2023-12-01T10:00:00Z",
                "updated_at": "2023-12-01T10:00:00Z"
            }
        }
```

### Custom Field Info
```python
from pydantic import BaseModel, Field

class UserRequest(BaseModel):
    username: str = Field(
        ...,
        title="Username",
        description="Unique username for the user",
        min_length=3,
        max_length=50,
        example="johndoe"
    )

    email: str = Field(
        ...,
        title="Email Address",
        description="Valid email address",
        example="john.doe@example.com"
    )
```

## Best Practices

### Model Design Principles
- **Single Responsibility**: Each model should have one clear purpose
- **Consistent Naming**: Use consistent field names across models
- **Versioning**: Consider API versioning for model changes
- **Documentation**: Always include examples and descriptions

### Security Considerations
- **Never expose sensitive data** in response models
- **Validate all input** thoroughly
- **Use appropriate field types** for security
- **Consider rate limiting** for public APIs

### Performance Tips
- **Use response_model** to filter unnecessary fields
- **Cache validation schemas** in production
- **Minimize nested model depth** for better performance
- **Use exclude/include** strategically

## Hands-on Exercises

### Exercise 1: Basic CRUD Models
1. Create request/response models for a blog API
2. Implement separate models for create, update, and response
3. Add proper validation and examples

### Exercise 2: Nested Models
1. Design models for an e-commerce API with products, orders, and users
2. Implement proper relationships between models
3. Add pagination for list endpoints

### Exercise 3: Error Handling
1. Create custom error response models
2. Implement proper HTTP status codes
3. Add validation error handling

## Next Steps
- [Dependency Injection Tutorial](../tutorials/04-dependency-injection.md)
- [Workshop: Request Validation](../workshops/workshop-02-request-validation.md)

## Additional Resources
- [FastAPI Request Body](https://fastapi.tiangolo.com/tutorial/body/)
- [FastAPI Response Model](https://fastapi.tiangolo.com/tutorial/response-model/)
- [OpenAPI Examples](https://swagger.io/docs/specification/adding-examples/)
- [API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)

# Tutorial 02: Pydantic Models and Validation

## Overview
This tutorial covers Pydantic, the data validation and parsing library that FastAPI uses extensively. You'll learn how to create robust data models with validation, serialization, and type safety.

## What is Pydantic?

Pydantic is a Python library for data validation and parsing using Python type hints. It enforces type hints at runtime and provides user-friendly error messages.

### Key Features

- **Type Validation**: Enforces Python type hints at runtime
- **Data Parsing**: Converts input data to correct types
- **Error Handling**: Provides detailed validation error messages
- **JSON Serialization**: Easy conversion to/from JSON
- **Custom Validators**: Extensible validation system
- **FastAPI Integration**: Built-in support for request/response models

### Why Pydantic?

```python
# Without Pydantic
def create_user(name, age, email):
    if not isinstance(name, str):
        raise ValueError("name must be a string")
    if not isinstance(age, int) or age < 0:
        raise ValueError("age must be a positive integer")
    # ... more validation code

# With Pydantic
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str

    # Automatic validation
    def __init__(self, **data):
        super().__init__(**data)
```

## Basic Models

### Creating Your First Model
```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str
    age: int

# Usage
user = User(id=1, name="John Doe", email="john@example.com", age=30)
print(user.name)  # John Doe
print(user.dict())  # {'id': 1, 'name': 'John Doe', 'email': 'john@example.com', 'age': 30}
```

### Type Annotations
```python
from typing import Optional, List
from pydantic import BaseModel

class Post(BaseModel):
    title: str
    content: str
    published: bool = True  # Default value
    tags: List[str] = []     # Default empty list
    author_id: Optional[int] = None  # Optional field

# All these are valid
post1 = Post(title="Hello", content="World")
post2 = Post(title="Hello", content="World", published=False, tags=["python", "fastapi"])
post3 = Post(title="Hello", content="World", author_id=1)
```

## Field Types and Validation

### Basic Types
```python
from pydantic import BaseModel
from typing import List, Dict, Set, Tuple
from datetime import datetime
from uuid import UUID

class Item(BaseModel):
    # Basic types
    name: str
    price: float
    quantity: int
    is_available: bool

    # Collections
    tags: List[str]
    metadata: Dict[str, str]
    categories: Set[str]
    dimensions: Tuple[int, int, int]  # (width, height, depth)

    # Date/Time
    created_at: datetime

    # UUID
    item_id: UUID
```

### String Validation
```python
from pydantic import BaseModel, Field, constr

class User(BaseModel):
    name: constr(min_length=2, max_length=50)  # String with length constraints
    email: constr(regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    username: str = Field(..., min_length=3, max_length=20, regex=r'^[a-zA-Z0-9_]+$')

# Usage
try:
    user = User(name="J", email="invalid-email", username="user@name")
except Exception as e:
    print(e)
    # Validation errors will be raised
```

### Numeric Validation
```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str
    price: float = Field(..., gt=0, le=10000)  # Greater than 0, less than or equal to 10000
    discount: float = Field(0, ge=0, le=1)     # Between 0 and 1
    quantity: int = Field(..., ge=0)           # Greater than or equal to 0
    rating: float = Field(..., ge=1, le=5)     # Between 1 and 5
```

### List and Dict Validation
```python
from pydantic import BaseModel, Field
from typing import List, Dict

class BlogPost(BaseModel):
    title: str
    content: str
    tags: List[str] = Field(..., min_items=1, max_items=10)
    metadata: Dict[str, str] = Field(..., max_items=20)

    # Custom validation for tags
    @Field.validator('tags')
    def validate_tags(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Tags must be unique')
        return v
```

## Advanced Validation

### Custom Validators
```python
from pydantic import BaseModel, validator, Field
from typing import List

class User(BaseModel):
    name: str
    email: str
    age: int = Field(..., ge=0, le=150)
    password: str = Field(..., min_length=8)
    confirm_password: str

    # Field-level validator
    @validator('name')
    def name_must_not_contain_spaces(cls, v):
        if ' ' in v:
            raise ValueError('Name must not contain spaces')
        return v

    # Model-level validator
    @validator('confirm_password')
    def passwords_match(cls, v, values, field, config):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    # Pre-validation
    @validator('email')
    def email_must_be_valid(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email address')
        return v.lower()
```

### Conditional Validation
```python
from pydantic import BaseModel, validator

class Payment(BaseModel):
    method: str  # 'card' or 'paypal'
    card_number: str = None
    paypal_email: str = None
    amount: float

    @validator('card_number', always=True)
    def validate_card_number(cls, v, values):
        if values.get('method') == 'card' and not v:
            raise ValueError('Card number required for card payments')
        return v

    @validator('paypal_email', always=True)
    def validate_paypal_email(cls, v, values):
        if values.get('method') == 'paypal' and not v:
            raise ValueError('PayPal email required for PayPal payments')
        return v
```

## Model Configuration

### Model Config
```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        # Allow arbitrary fields
        extra = 'allow'  # 'ignore', 'forbid', 'allow'

        # Case sensitivity
        case_sensitive = False

        # JSON schema configuration
        title = 'User Model'
        description = 'A user in the system'

        # Validation configuration
        validate_all = True  # Validate default values
        validate_assignment = True  # Validate field assignments

# Usage
user = User(id=1, name="John", email="john@example.com", extra_field="allowed")
```

### Field Configuration
```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str = Field(
        ...,
        title="Product Name",
        description="The name of the product",
        max_length=100,
        min_length=1
    )

    price: float = Field(
        ...,
        gt=0,
        description="Price in USD",
        example=29.99
    )

    category: str = Field(
        ...,
        regex=r'^(electronics|books|clothing)$',
        description="Product category"
    )
```

## Serialization and Parsing

### JSON Serialization
```python
from pydantic import BaseModel
import json

class User(BaseModel):
    name: str
    age: int

user = User(name="John", age=30)

# Convert to dict
user_dict = user.dict()
print(user_dict)  # {'name': 'John', 'age': 30}

# Convert to JSON
user_json = user.json()
print(user_json)  # {"name": "John", "age": 30}

# Parse from dict
user_from_dict = User(**user_dict)

# Parse from JSON
user_from_json = User.parse_raw(user_json)
```

### Custom JSON Encoders
```python
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class Post(BaseModel):
    id: UUID
    title: str
    created_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }

post = Post(id=UUID('12345678-1234-5678-9abc-def012345678'), title="Hello", created_at=datetime.now())
print(post.json())
# {"id": "12345678-1234-5678-9abc-def012345678", "title": "Hello", "created_at": "2023-12-01T10:30:00"}
```

## Nested Models

### Basic Nesting
```python
from pydantic import BaseModel
from typing import List, Optional

class Address(BaseModel):
    street: str
    city: str
    country: str
    postal_code: str

class Company(BaseModel):
    name: str
    address: Address

class User(BaseModel):
    name: str
    age: int
    company: Company
    addresses: List[Address] = []

# Usage
user = User(
    name="John",
    age=30,
    company=Company(
        name="Tech Corp",
        address=Address(
            street="123 Main St",
            city="New York",
            country="USA",
            postal_code="10001"
        )
    ),
    addresses=[
        Address(street="456 Oak St", city="Boston", country="USA", postal_code="02101")
    ]
)
```

### Forward References
```python
from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: int
    name: str
    manager: Optional['User'] = None

    class Config:
        orm_mode = True

# Update forward references
User.update_forward_refs()

# Usage
manager = User(id=1, name="Alice")
employee = User(id=2, name="Bob", manager=manager)
```

## Generic Models

### Type Variables
```python
from pydantic import BaseModel
from typing import TypeVar, Generic, List

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int

class User(BaseModel):
    id: int
    name: str

# Usage
users_response = PaginatedResponse[User](
    items=[User(id=1, name="Alice"), User(id=2, name="Bob")],
    total=2,
    page=1,
    size=10
)
```

## Error Handling

### Validation Errors
```python
from pydantic import BaseModel, ValidationError
from typing import List

class User(BaseModel):
    name: str
    age: int
    email: str

try:
    user = User(name="", age="not_a_number", email="invalid-email")
except ValidationError as e:
    print(e)
    """
    3 validation errors for User
    name
      String should have at least 1 character (type=value_error.const; given=; const=)
    age
      Value is not a valid integer (type=type_error.integer)
    email
      Value is not a valid email address (type=value_error.const; given=invalid-email; const=)
    """
```

### Custom Error Messages
```python
from pydantic import BaseModel, validator

class User(BaseModel):
    age: int

    @validator('age')
    def age_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Age must be positive')
        if v > 150:
            raise ValueError('Age must be less than 150')
        return v
```

## Integration with FastAPI

### Request Models
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "securepassword123",
                "full_name": "John Doe"
            }
        }

@app.post("/users/")
async def create_user(user: CreateUserRequest):
    # User data is automatically validated
    return {"message": "User created", "user": user}
```

### Response Models
```python
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool = True

    class Config:
        orm_mode = True

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    # In real app, fetch from database
    return UserResponse(
        id=user_id,
        username="johndoe",
        email="john@example.com",
        full_name="John Doe"
    )
```

## Best Practices

### Model Design
- Use descriptive field names
- Provide meaningful default values
- Add field descriptions and examples
- Use appropriate validation constraints

### Validation Strategy
- Validate at the edge (API boundaries)
- Use field-level validation for simple rules
- Use model-level validation for complex business logic
- Provide clear error messages

### Performance Considerations
- Reuse model instances when possible
- Use `orm_mode` for database models
- Minimize nested model depth
- Cache validation schemas in production

## Hands-on Exercises

### Exercise 1: Basic Models
1. Create a User model with validation
2. Create a Product model with pricing validation
3. Test validation with invalid data

### Exercise 2: Nested Models
1. Create an Order model with nested items
2. Implement validation for order totals
3. Add custom validators for business rules

### Exercise 3: API Integration
1. Create request/response models for a blog API
2. Implement validation for post creation
3. Add proper error handling

## Next Steps
- [Request/Response Models Tutorial](../tutorials/03-request-response-models.md)
- [Workshop: Request Validation](../workshops/workshop-02-request-validation.md)

## Additional Resources
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [Pydantic Field Types](https://pydantic-docs.helpmanual.io/usage/types/)
- [Pydantic Validators](https://pydantic-docs.helpmanual.io/usage/validators/)
- [FastAPI with Pydantic](https://fastapi.tiangolo.com/tutorial/body/)

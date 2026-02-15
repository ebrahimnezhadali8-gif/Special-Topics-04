# Workshop 02: Request Validation

## Overview
This workshop focuses on implementing comprehensive request validation using Pydantic models in FastAPI. You'll learn to create robust validation rules, handle validation errors gracefully, and ensure data integrity in your API.

## Prerequisites
- Completed [Basic API Workshop](../workshops/workshop-01-basic-api.md)
- Understanding of FastAPI basics and Pydantic models

## Learning Objectives
By the end of this workshop, you will be able to:
- Create comprehensive validation rules with Pydantic
- Implement custom validators and error handling
- Validate nested data structures
- Handle validation errors gracefully
- Use advanced validation features

## Workshop Structure

### Part 1: Basic Validation Rules

#### Step 1: Create Validation Models

Create a new project for this workshop:

```bash
mkdir validation-workshop
cd validation-workshop
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv add fastapi uvicorn pydantic[email]

mkdir app
touch app/__init__.py app/main.py app/models.py app/validation.py
```

**app/models.py:**
```python
from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import re

class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class Address(BaseModel):
    street: str = Field(..., min_length=1, max_length=200)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    zip_code: str = Field(..., regex=r'^\d{5}(-\d{4})?$')
    country: str = Field("US", min_length=2, max_length=2)

    @validator('state')
    def validate_state(cls, v):
        # Simple validation - in production, use a proper list
        valid_states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                       'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                       'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                       'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                       'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
        if v.upper() not in valid_states:
            raise ValueError('Invalid US state code')
        return v.upper()

class SocialLinks(BaseModel):
    website: Optional[HttpUrl] = None
    twitter: Optional[str] = Field(None, regex=r'^@?[a-zA-Z0-9_]{1,15}$')
    linkedin: Optional[HttpUrl] = None
    github: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$')

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    full_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    role: UserRole = UserRole.USER
    address: Address
    social_links: SocialLinks = SocialLinks()
    interests: List[str] = Field(default_factory=list, max_items=10)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('confirm_password')
    def passwords_match(cls, v, values, field, config):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('date_of_birth')
    def validate_age(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 13:
            raise ValueError('Must be at least 13 years old')
        if age > 120:
            raise ValueError('Invalid date of birth')
        return v

    @validator('interests')
    def validate_interests(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Interests must be unique')
        return [interest.lower().strip() for interest in v]

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john.doe@example.com",
                "password": "securepassword123",
                "confirm_password": "securepassword123",
                "full_name": "John Doe",
                "date_of_birth": "1990-01-15",
                "role": "user",
                "address": {
                    "street": "123 Main St",
                    "city": "Anytown",
                    "state": "CA",
                    "zip_code": "12345",
                    "country": "US"
                },
                "social_links": {
                    "website": "https://johndoe.com",
                    "twitter": "@johndoe",
                    "github": "johndoe"
                },
                "interests": ["python", "fastapi", "web development"]
            }
        }

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[Address] = None
    social_links: Optional[SocialLinks] = None
    interests: Optional[List[str]] = Field(None, max_items=10)
    status: Optional[UserStatus] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    status: UserStatus
    address: Address
    social_links: SocialLinks
    interests: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
```

#### Step 2: Create API Endpoints

**app/main.py:**
```python
from fastapi import FastAPI, HTTPException, status
from typing import List, Optional
from .models import UserCreate, UserUpdate, UserResponse, UserStatus
from datetime import datetime

app = FastAPI(
    title="Validation Workshop API",
    description="API with comprehensive request validation",
    version="1.0.0"
)

# In-memory storage for demo
users_db = []

@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    # Check if username already exists
    if any(u["username"] == user.username for u in users_db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email already exists
    if any(u["email"] == user.email for u in users_db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    new_user = {
        "id": len(users_db) + 1,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "status": UserStatus.ACTIVE,
        "address": user.address.dict(),
        "social_links": user.social_links.dict(),
        "interests": user.interests,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    users_db.append(new_user)
    return new_user

@app.get("/users/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 10,
    status_filter: Optional[UserStatus] = None
):
    users = users_db[skip:skip + limit]

    if status_filter:
        users = [u for u in users if u["status"] == status_filter]

    return users

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    for user in users_db:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate):
    for user in users_db:
        if user["id"] == user_id:
            update_data = user_update.dict(exclude_unset=True)

            # Handle nested updates
            if "address" in update_data:
                user["address"].update(update_data["address"])
                del update_data["address"]

            if "social_links" in update_data:
                user["social_links"].update(update_data["social_links"])
                del update_data["social_links"]

            user.update(update_data)
            user["updated_at"] = datetime.now()
            return user

    raise HTTPException(status_code=404, detail="User not found")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "users_count": len(users_db)}
```

### Part 2: Advanced Validation

#### Step 3: Custom Validators

**app/validation.py:**
```python
from pydantic import validator, ValidationError
from typing import Any, Dict, List
import re

def validate_password_strength(password: str) -> str:
    """
    Validate password strength requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")

    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")

    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")

    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Password must contain at least one special character")

    return password

def validate_username_uniqueness(username: str, exclude_user_id: Optional[int] = None) -> str:
    """Check if username is unique in the database"""
    # This would normally check against your database
    # For demo purposes, we'll just do a simple check
    existing_usernames = ["admin", "root", "system"]

    if username.lower() in existing_usernames:
        raise ValueError(f"Username '{username}' is reserved")

    return username

def validate_email_domain(email: str) -> str:
    """Validate email domain is allowed"""
    blocked_domains = ["spam.com", "blocked.com", "temp-mail.org"]

    domain = email.split('@')[1].lower()
    if domain in blocked_domains:
        raise ValueError(f"Email domain '{domain}' is not allowed")

    return email

class ValidationHelper:
    @staticmethod
    def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            raise ValueError("Value must be a string")

        # Trim whitespace
        value = value.strip()

        # Check length
        if max_length and len(value) > max_length:
            raise ValueError(f"Value must be at most {max_length} characters")

        return value

    @staticmethod
    def validate_list_items(items: List[Any], item_validator: callable = None) -> List[Any]:
        """Validate each item in a list"""
        if not isinstance(items, list):
            raise ValueError("Value must be a list")

        validated_items = []
        for i, item in enumerate(items):
            try:
                if item_validator:
                    item = item_validator(item)
                validated_items.append(item)
            except Exception as e:
                raise ValueError(f"Item {i}: {str(e)}")

        return validated_items

    @staticmethod
    def validate_dict_keys(data: Dict[str, Any], allowed_keys: List[str]) -> Dict[str, Any]:
        """Validate that dict only contains allowed keys"""
        extra_keys = set(data.keys()) - set(allowed_keys)
        if extra_keys:
            raise ValueError(f"Unexpected fields: {', '.join(extra_keys)}")

        return data
```

#### Step 4: Enhanced Models with Custom Validation

**Update app/models.py:**
```python
from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from .validation import validate_password_strength, validate_username_uniqueness, validate_email_domain

# ... existing code ...

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    full_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    role: UserRole = UserRole.USER
    address: Address
    social_links: SocialLinks = SocialLinks()
    interests: List[str] = Field(default_factory=list, max_items=10)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('username')
    def validate_username(cls, v):
        return validate_username_uniqueness(v)

    @validator('email')
    def validate_email(cls, v):
        return validate_email_domain(v)

    @validator('password')
    def validate_password(cls, v):
        return validate_password_strength(v)

    # ... existing validators ...
```

### Part 3: Error Handling

#### Step 5: Custom Error Responses

**app/main.py (continued):**
```python
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from typing import List, Optional, Dict, Any
from .models import UserCreate, UserUpdate, UserResponse, UserStatus
from datetime import datetime

# ... existing code ...

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    errors = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Request data is invalid",
            "details": errors
        }
    )

@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Handle additional Pydantic validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Data validation failed",
            "details": exc.errors()
        }
    )

@app.exception_handler(ValueError)
async def value_error_exception_handler(request: Request, exc: ValueError):
    """Handle custom validation ValueErrors"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation Error",
            "message": str(exc)
        }
    )
```

### Part 4: Testing Validation

#### Step 6: Create Tests

**tests/__init__.py:**
```python
# Empty init file
```

**tests/test_validation.py:**
```python
from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

def test_valid_user_creation():
    """Test creating a user with valid data"""
    user_data = {
        "username": "validuser",
        "email": "valid@example.com",
        "password": "ValidPass123!",
        "confirm_password": "ValidPass123!",
        "full_name": "Valid User",
        "date_of_birth": "1990-01-01",
        "address": {
            "street": "123 Valid St",
            "city": "Valid City",
            "state": "CA",
            "zip_code": "12345"
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 201

    data = response.json()
    assert data["username"] == "validuser"
    assert data["email"] == "valid@example.com"
    assert "id" in data

def test_invalid_username():
    """Test various username validation failures"""
    invalid_usernames = [
        "ab",  # Too short
        "user-name!",  # Invalid characters
        "",  # Empty
        "admin",  # Reserved word
    ]

    for username in invalid_usernames:
        user_data = {
            "username": username,
            "email": "test@example.com",
            "password": "ValidPass123!",
            "confirm_password": "ValidPass123!",
            "full_name": "Test User",
            "date_of_birth": "1990-01-01",
            "address": {
                "street": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "zip_code": "12345"
            }
        }

        response = client.post("/users/", json=user_data)
        assert response.status_code == 422

def test_invalid_email():
    """Test email validation"""
    user_data = {
        "username": "testuser",
        "email": "invalid-email",  # Invalid format
        "password": "ValidPass123!",
        "confirm_password": "ValidPass123!",
        "full_name": "Test User",
        "date_of_birth": "1990-01-01",
        "address": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345"
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 422

def test_weak_password():
    """Test password strength requirements"""
    weak_passwords = [
        "short",  # Too short
        "nouppercase123!",  # No uppercase
        "NOLOWERCASE123!",  # No lowercase
        "NoDigits!",  # No digits
        "NoSpecial123",  # No special characters
    ]

    for password in weak_passwords:
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": password,
            "confirm_password": password,
            "full_name": "Test User",
            "date_of_birth": "1990-01-01",
            "address": {
                "street": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "zip_code": "12345"
            }
        }

        response = client.post("/users/", json=user_data)
        assert response.status_code == 422

def test_password_mismatch():
    """Test password confirmation"""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "ValidPass123!",
        "confirm_password": "DifferentPass123!",
        "full_name": "Test User",
        "date_of_birth": "1990-01-01",
        "address": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345"
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 422

def test_invalid_age():
    """Test age validation"""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "ValidPass123!",
        "confirm_password": "ValidPass123!",
        "full_name": "Test User",
        "date_of_birth": "2010-01-01",  # Too young
        "address": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345"
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 422

def test_invalid_address():
    """Test address validation"""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "ValidPass123!",
        "confirm_password": "ValidPass123!",
        "full_name": "Test User",
        "date_of_birth": "1990-01-01",
        "address": {
            "street": "",  # Empty street
            "city": "Test City",
            "state": "XX",  # Invalid state
            "zip_code": "123"  # Invalid zip
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 422

def test_duplicate_username():
    """Test duplicate username handling"""
    # Create first user
    user_data = {
        "username": "duplicateuser",
        "email": "first@example.com",
        "password": "ValidPass123!",
        "confirm_password": "ValidPass123!",
        "full_name": "First User",
        "date_of_birth": "1990-01-01",
        "address": {
            "street": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345"
        }
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 201

    # Try to create user with same username
    user_data["email"] = "second@example.com"
    response = client.post("/users/", json=user_data)
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]
```

### Part 5: Advanced Validation Features

#### Step 7: Conditional Validation

**Update app/models.py:**
```python
class UserCreate(BaseModel):
    # ... existing fields ...

    is_business_account: bool = False
    company_name: Optional[str] = None
    tax_id: Optional[str] = None

    @validator('company_name', always=True)
    def validate_company_name(cls, v, values):
        if values.get('is_business_account') and not v:
            raise ValueError('Company name is required for business accounts')
        return v

    @validator('tax_id', always=True)
    def validate_tax_id(cls, v, values):
        if values.get('is_business_account'):
            if not v:
                raise ValueError('Tax ID is required for business accounts')
            # Simple tax ID validation (9 digits)
            if not re.match(r'^\d{9}$', v):
                raise ValueError('Tax ID must be 9 digits')
        return v
```

#### Step 8: Custom Field Types

**app/validation.py (continued):**
```python
from pydantic import BaseModel, Field
from typing import Annotated

# Custom field types
PasswordStr = Annotated[str, Field(min_length=8, max_length=128)]
UsernameStr = Annotated[str, Field(min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_]+$')]
ZipCodeStr = Annotated[str, Field(regex=r'^\d{5}(-\d{4})?$')]

class StrongPasswordModel(BaseModel):
    password: PasswordStr

    @validator('password')
    def validate_password_strength(cls, v):
        return validate_password_strength(v)

class UserRegistration(BaseModel):
    username: UsernameStr
    password: PasswordStr
    zip_code: ZipCodeStr
```

## Challenge Exercises

### Challenge 1: E-commerce Validation
1. Create product models with pricing validation
2. Implement order validation with inventory checks
3. Add payment information validation
4. Create shipping address validation

### Challenge 2: API Rate Limiting
1. Create request models with rate limit validation
2. Implement API key validation
3. Add request size limits
4. Create usage tracking models

### Challenge 3: File Upload Validation
1. Create file upload models with size/type validation
2. Implement image validation (dimensions, format)
3. Add virus scanning validation
4. Create batch upload validation

## Running and Testing

```bash
# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v

# Test validation manually
curl -X POST "http://localhost:8000/users/" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "ValidPass123!",
       "confirm_password": "ValidPass123!",
       "full_name": "Test User",
       "date_of_birth": "1990-01-01",
       "address": {
         "street": "123 Test St",
         "city": "Test City",
         "state": "CA",
         "zip_code": "12345"
       }
     }'
```

## Verification Checklist

### Basic Validation
- [ ] String length and regex validation implemented
- [ ] Numeric range validation working
- [ ] Email validation functional
- [ ] Enum validation working

### Advanced Validation
- [ ] Custom validators implemented
- [ ] Password strength validation working
- [ ] Date and age validation functional
- [ ] Nested model validation working

### Error Handling
- [ ] Validation errors properly formatted
- [ ] Custom error handlers implemented
- [ ] Appropriate HTTP status codes returned
- [ ] Error messages user-friendly

### Testing
- [ ] Unit tests for validation rules written
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Integration tests passing

## Troubleshooting

### Common Validation Issues

**Validation errors not showing properly:**
- Check exception handlers are registered
- Verify error response format
- Look at FastAPI logs for details

**Custom validators not working:**
- Ensure `@validator` decorator is imported
- Check validator method signatures
- Verify field names match

**Nested validation failing:**
- Check nested model field types
- Verify all required fields are provided
- Look at validation error paths

**Performance issues with validation:**
- Avoid complex validation on frequently called endpoints
- Cache validation results where possible
- Use async validation for I/O operations

## Next Steps
- [Dependency Injection Tutorial](../tutorials/04-dependency-injection.md)
- [Workshop: CRUD Articles](../workshops/workshop-03-crud-articles.md)

## Additional Resources
- [Pydantic Validators](https://pydantic-docs.helpmanual.io/usage/validators/)
- [FastAPI Validation](https://fastapi.tiangolo.com/tutorial/body/)
- [Data Validation Best Practices](https://docs.python.org/3/library/stdtypes.html)
- [Regular Expressions](https://docs.python.org/3/library/re.html)

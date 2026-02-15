# Workshop 05: Advanced CRUD Operations and Relationships

## Duration: 120-150 minutes

## Overview
Build sophisticated CRUD APIs with relationships, data validation, and complex business logic. Learn to handle nested resources, implement proper error handling, and create maintainable API designs.

## Prerequisites
- Completed Workshops 1-4
- Understanding of FastAPI, Pydantic, and basic CRUD operations
- Familiarity with SQLAlchemy (helpful but not required)

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement complex CRUD operations with relationships
- Handle nested resource creation and updates
- Implement proper error handling and validation
- Design RESTful APIs for related resources
- Use advanced FastAPI features for complex scenarios
- Implement data consistency and referential integrity

---

## Part 1: Setting Up the Project

### Project Structure
```bash
advanced-crud-api/
├── main.py                 # FastAPI application
├── models.py              # Pydantic models and database schemas
├── database.py            # Database configuration
├── crud.py                # CRUD operations
├── schemas.py             # Request/Response schemas
├── dependencies.py        # Dependency injection
├── routers/
│   ├── users.py
│   ├── posts.py
│   └── comments.py
├── tests/
│   ├── test_users.py
│   ├── test_posts.py
│   └── test_comments.py
└── requirements.txt
```

### Dependencies Setup
```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
python-multipart==0.0.6
pytest==7.4.3
httpx==0.25.2
```

### Database Configuration
```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://user:password@localhost/advanced_crud"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Part 2: Database Models with Relationships

### User-Post-Comment Relationship Design
```python
# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))

    # Relationships
    author = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
```

---

## Part 3: Pydantic Schemas for Complex Operations

### Base Schemas with Relationships
```python
# schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Post schemas
class PostBase(BaseModel):
    title: str
    content: str
    published: bool = True

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    published: Optional[bool] = None

class Post(PostBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    author_id: int
    author: User  # Include author info

    class Config:
        from_attributes = True

# Comment schemas
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class CommentUpdate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    created_at: datetime
    author_id: int
    post_id: int
    author: User  # Include author info

    class Config:
        from_attributes = True

# Nested schemas for complex responses
class PostWithComments(Post):
    comments: List[Comment] = []

class UserWithPosts(User):
    posts: List[Post] = []
```

---

## Part 4: Advanced CRUD Operations

### User CRUD with Validation
```python
# crud.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from models import User, Post, Comment
from schemas import UserCreate, UserUpdate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    # Check for existing user
    if get_user_by_email(db, user.email):
        raise ValueError("Email already registered")
    if get_user_by_username(db, user.username):
        raise ValueError("Username already taken")

    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None

    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False
```

### Post CRUD with Relationships
```python
# Post CRUD
def get_post(db: Session, post_id: int):
    return db.query(Post).filter(Post.id == post_id).first()

def get_posts(db: Session, skip: int = 0, limit: int = 100, published_only: bool = True):
    query = db.query(Post)
    if published_only:
        query = query.filter(Post.published == True)
    return query.offset(skip).limit(limit).all()

def get_posts_by_author(db: Session, author_id: int, skip: int = 0, limit: int = 100):
    return db.query(Post).filter(Post.author_id == author_id)\
                        .offset(skip).limit(limit).all()

def create_post(db: Session, post: PostCreate, author_id: int):
    db_post = Post(**post.model_dump(), author_id=author_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def update_post(db: Session, post_id: int, post_update: PostUpdate, author_id: int):
    db_post = db.query(Post).filter(
        and_(Post.id == post_id, Post.author_id == author_id)
    ).first()

    if not db_post:
        return None

    update_data = post_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)

    db_post.updated_at = func.now()
    db.commit()
    db.refresh(db_post)
    return db_post

def delete_post(db: Session, post_id: int, author_id: int):
    db_post = db.query(Post).filter(
        and_(Post.id == post_id, Post.author_id == author_id)
    ).first()

    if db_post:
        db.delete(db_post)
        db.commit()
        return True
    return False
```

### Comment CRUD with Nested Relationships
```python
# Comment CRUD
def get_comment(db: Session, comment_id: int):
    return db.query(Comment).filter(Comment.id == comment_id).first()

def get_comments_by_post(db: Session, post_id: int, skip: int = 0, limit: int = 100):
    return db.query(Comment).filter(Comment.post_id == post_id)\
                           .offset(skip).limit(limit).all()

def create_comment(db: Session, comment: CommentCreate, post_id: int, author_id: int):
    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError("Post not found")

    db_comment = Comment(**comment.model_dump(),
                        post_id=post_id,
                        author_id=author_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def update_comment(db: Session, comment_id: int, comment_update: CommentUpdate, author_id: int):
    db_comment = db.query(Comment).filter(
        and_(Comment.id == comment_id, Comment.author_id == author_id)
    ).first()

    if not db_comment:
        return None

    update_data = comment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_comment, field, value)

    db.commit()
    db.refresh(db_comment)
    return db_comment

def delete_comment(db: Session, comment_id: int, author_id: int):
    db_comment = db.query(Comment).filter(
        and_(Comment.id == comment_id, Comment.author_id == author_id)
    ).first()

    if db_comment:
        db.delete(db_comment)
        db.commit()
        return True
    return False
```

---

## Part 5: FastAPI Routes with Complex Logic

### User Routes
```python
# routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import User, UserCreate, UserUpdate
from crud import get_user, get_users, create_user, update_user, delete_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = get_users(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = create_user(db, user)
        return db_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = get_user(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=User)
def update_existing_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = update_user(db, user_id, user)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_user(user_id: int, db: Session = Depends(get_db)):
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
```

### Post Routes with Author Validation
```python
# routers/posts.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import Post, PostCreate, PostUpdate, PostWithComments
from crud import get_post, get_posts, create_post, update_post, delete_post
from dependencies import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])

@router.get("/", response_model=List[Post])
def read_posts(skip: int = 0, limit: int = 100, published: bool = True,
               db: Session = Depends(get_db)):
    posts = get_posts(db, skip=skip, limit=limit, published_only=published)
    return posts

@router.post("/", response_model=Post, status_code=status.HTTP_201_CREATED)
def create_new_post(post: PostCreate, db: Session = Depends(get_db),
                   current_user = Depends(get_current_user)):
    return create_post(db, post, current_user.id)

@router.get("/{post_id}", response_model=PostWithComments)
def read_post(post_id: int, db: Session = Depends(get_db)):
    db_post = get_post(db, post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

@router.put("/{post_id}", response_model=Post)
def update_existing_post(post_id: int, post: PostUpdate, db: Session = Depends(get_db),
                        current_user = Depends(get_current_user)):
    db_post = update_post(db, post_id, post, current_user.id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
    return db_post

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_post(post_id: int, db: Session = Depends(get_db),
                        current_user = Depends(get_current_user)):
    success = delete_post(db, post_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
```

### Comment Routes with Complex Dependencies
```python
# routers/comments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import Comment, CommentCreate, CommentUpdate
from crud import (get_comment, get_comments_by_post, create_comment,
                 update_comment, delete_comment)
from dependencies import get_current_user

router = APIRouter(prefix="/comments", tags=["comments"])

@router.get("/", response_model=List[Comment])
def read_comments(post_id: int = None, skip: int = 0, limit: int = 100,
                 db: Session = Depends(get_db)):
    if post_id:
        comments = get_comments_by_post(db, post_id, skip=skip, limit=limit)
    else:
        # Get all comments (not recommended for production)
        comments = db.query(Comment).offset(skip).limit(limit).all()
    return comments

@router.post("/", response_model=Comment, status_code=status.HTTP_201_CREATED)
def create_new_comment(comment: CommentCreate, post_id: int, db: Session = Depends(get_db),
                      current_user = Depends(get_current_user)):
    try:
        return create_comment(db, comment, post_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{comment_id}", response_model=Comment)
def read_comment(comment_id: int, db: Session = Depends(get_db)):
    db_comment = get_comment(db, comment_id)
    if db_comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return db_comment

@router.put("/{comment_id}", response_model=Comment)
def update_existing_comment(comment_id: int, comment: CommentUpdate, db: Session = Depends(get_db),
                           current_user = Depends(get_current_user)):
    db_comment = update_comment(db, comment_id, comment, current_user.id)
    if db_comment is None:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    return db_comment

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_comment(comment_id: int, db: Session = Depends(get_db),
                           current_user = Depends(get_current_user)):
    success = delete_comment(db, comment_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
```

---

## Part 6: Authentication and Authorization

### JWT Token Implementation
```python
# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

from database import get_db
from models import User

SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
```

### Authentication Routes
```python
# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from crud import authenticate_user, get_user_by_username
from dependencies import create_access_token

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
```

---

## Part 7: Testing Complex Relationships

### Test Setup
```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db

TEST_DATABASE_URL = "postgresql://user:password@localhost/test_db"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
        Base.metadata.drop_all(bind=engine)
```

### Complex CRUD Tests
```python
# tests/test_relationships.py
def test_create_user_with_posts(db):
    # Create user
    user_data = UserCreate(
        email="test@example.com",
        username="testuser",
        password="password123",
        full_name="Test User"
    )
    user = create_user(db, user_data)

    # Create posts for user
    post1 = create_post(db, PostCreate(title="First Post", content="Content 1"), user.id)
    post2 = create_post(db, PostCreate(title="Second Post", content="Content 2"), user.id)

    # Verify relationships
    assert len(user.posts) == 2
    assert post1.author.username == "testuser"
    assert post2.author.username == "testuser"

def test_nested_comments(db):
    # Create user and post
    user = create_user(db, UserCreate(
        email="author@example.com",
        username="author",
        password="pass"
    ))
    post = create_post(db, PostCreate(title="Test Post", content="Content"), user.id)

    # Create comments
    comment1 = create_comment(db, CommentCreate(content="First comment"), post.id, user.id)
    comment2 = create_comment(db, CommentCreate(content="Second comment"), post.id, user.id)

    # Verify post has comments
    db.refresh(post)
    assert len(post.comments) == 2
    assert comment1.post.title == "Test Post"
    assert comment2.post.title == "Test Post"

def test_cascade_delete(db):
    # Create user with posts and comments
    user = create_user(db, UserCreate(email="user@example.com", username="user", password="pass"))
    post = create_post(db, PostCreate(title="Post", content="Content"), user.id)
    comment = create_comment(db, CommentCreate(content="Comment"), post.id, user.id)

    # Delete user
    delete_user(db, user.id)

    # Verify cascade delete
    assert get_user(db, user.id) is None
    assert get_post(db, post.id) is None
    assert get_comment(db, comment.id) is None
```

---

## Part 8: Performance and Optimization

### Database Indexing
```sql
-- Add indexes for performance
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Composite indexes for common queries
CREATE INDEX idx_posts_author_published ON posts(author_id, published);
```

### Query Optimization
```python
# Optimized queries with joins
def get_posts_with_authors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Post).join(User).options(
        selectinload(Post.author),
        selectinload(Post.comments).selectinload(Comment.author)
    ).offset(skip).limit(limit).all()

# Paginated queries
def get_posts_paginated(db: Session, page: int = 1, per_page: int = 20):
    offset = (page - 1) * per_page
    return db.query(Post).offset(offset).limit(per_page).all()
```

### Response Caching
```python
from fastapi import Request, Response
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_user(user_id: int):
    # Implement caching logic
    pass

@router.get("/users/{user_id}")
def read_user(request: Request, response: Response, user_id: int):
    # Check cache headers
    if request.headers.get("if-none-match"):
        response.status_code = 304
        return

    user = get_user(user_id)
    response.headers["etag"] = f"user-{user_id}-{user.updated_at}"
    return user
```

---

## Exercise: Complete Blog API

### Requirements
Implement a complete blog API with:
- User registration and authentication
- Post CRUD with author validation
- Comment system with threading
- Categories and tags
- Search and filtering
- Rate limiting
- API versioning
- Comprehensive testing

### Implementation Steps

1. **Database Design**
   - Extend existing models with categories, tags
   - Add many-to-many relationships
   - Implement soft deletes

2. **API Design**
   - RESTful endpoints for all resources
   - Proper HTTP status codes
   - Pagination and filtering
   - Input validation and sanitization

3. **Security Implementation**
   - JWT authentication
   - Role-based permissions
   - Rate limiting
   - Input sanitization

4. **Testing Strategy**
   - Unit tests for all CRUD operations
   - Integration tests for relationships
   - Authentication tests
   - Performance tests

### Deliverables
- Complete FastAPI application
- Database schema with migrations
- Comprehensive test suite
- API documentation
- Docker configuration
- Deployment instructions

---

## Key Takeaways

1. **Relationship Management**: Handle complex data relationships properly
   - Foreign keys and constraints
   - Cascade operations
   - Lazy vs eager loading

2. **Data Validation**: Implement robust validation at all levels
   - Pydantic models for requests/responses
   - Database constraints
   - Business logic validation

3. **Security First**: Always implement proper authentication and authorization
   - JWT tokens
   - Password hashing
   - Permission checks

4. **Performance**: Optimize database queries and API responses
   - Proper indexing
   - Pagination
   - Caching strategies

5. **Testing**: Write comprehensive tests for complex operations
   - Relationship testing
   - Authorization testing
   - Integration testing

## Next Steps
- Implement GraphQL API
- Add real-time features with WebSockets
- Implement caching with Redis
- Add background job processing
- Deploy to cloud platforms

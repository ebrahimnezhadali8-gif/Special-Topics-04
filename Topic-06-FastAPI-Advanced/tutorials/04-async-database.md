# Tutorial 04: Async Database Operations

## Overview
This tutorial covers asynchronous database operations in FastAPI using SQLAlchemy with async drivers. You'll learn how to set up async database connections, perform CRUD operations asynchronously, and optimize database performance in async applications.

## Why Async Databases?

**Benefits of async database operations:**
- **Non-blocking I/O**: Database queries don't block the event loop
- **Higher concurrency**: Handle more concurrent requests
- **Better resource utilization**: Efficient use of threads and connections
- **Scalability**: Better performance under high load

**When to use async databases:**
- High-concurrency applications
- I/O-bound workloads
- Microservices architectures
- Real-time applications

## Setting Up Async SQLAlchemy

### Dependencies

```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0  # For PostgreSQL
aiosqlite==0.19.0  # For SQLite (development)
alembic==1.12.1
pydantic==2.5.0
```

### Database Configuration

```python
# config.py
from pydantic import BaseSettings
import os

class DatabaseSettings(BaseSettings):
    # Database URLs
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/dbname")
    test_database_url: str = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///./test.db")

    # Connection pool settings
    pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    pool_timeout: float = float(os.getenv("DB_POOL_TIMEOUT", "30.0"))
    pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # 30 minutes

    # Engine settings
    echo: bool = os.getenv("DB_ECHO", "false").lower() == "true"
    future: bool = True  # Use SQLAlchemy 2.0 style

    class Config:
        env_file = ".env"

db_settings = DatabaseSettings()
```

### Async Engine and Session Setup

```python
# database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import db_settings

class Base(DeclarativeBase):
    """Base class for all database models"""
    pass

# Create async engine
engine = create_async_engine(
    db_settings.database_url,
    echo=db_settings.echo,
    future=db_settings.future,
    pool_size=db_settings.pool_size,
    max_overflow=db_settings.max_overflow,
    pool_timeout=db_settings.pool_timeout,
    pool_recycle=db_settings.pool_recycle,
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def drop_tables():
    """Drop all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

## Database Models

### SQLAlchemy Models with Relationships

```python
# models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    posts: Mapped[List["Post"]] = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt: Mapped[str] = mapped_column(String(300), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="posts")
    comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags: Mapped[List["PostTag"]] = relationship("PostTag", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="comments")

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(7), default="#6b7280")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    posts: Mapped[List["PostTag"]] = relationship("PostTag", back_populates="tag")

class PostTag(Base):
    __tablename__ = "post_tags"

    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tags.id"), primary_key=True)

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="posts")
```

## Async CRUD Operations

### Repository Pattern with Async

```python
# crud/user.py
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        stmt = select(User).where(User.username == username)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get multiple users with pagination"""
        stmt = select(User).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(self, user_data: UserCreate) -> User:
        """Create new user"""
        # Hash password (would be done in service layer)
        user = User(**user_data.dict())
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Update user"""
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(**user_data.dict(exclude_unset=True))
            .returning(User)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        updated_user = result.scalars().first()
        if updated_user:
            await self.db.refresh(updated_user)
        return updated_user

    async def delete(self, user_id: int) -> bool:
        """Delete user"""
        stmt = delete(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def exists(self, user_id: int) -> bool:
        """Check if user exists"""
        stmt = select(User.id).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first() is not None
```

### Post Repository with Complex Queries

```python
# crud/post.py
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Tuple
from ..models.post import Post, Comment, Tag, PostTag
from ..schemas.post import PostCreate, PostUpdate

class PostRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, post_id: int) -> Optional[Post]:
        """Get post with relationships loaded"""
        stmt = (
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.comments).selectinload(Comment.author),
                selectinload(Post.tags).selectinload(PostTag.tag)
            )
            .where(Post.id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Optional[Post]:
        """Get post by slug"""
        stmt = (
            select(Post)
            .options(selectinload(Post.author))
            .where(Post.slug == slug)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        author_id: Optional[int] = None,
        published_only: bool = False,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[Post]:
        """Get multiple posts with filtering"""
        stmt = (
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.tags).selectinload(PostTag.tag)
            )
            .order_by(desc(Post.created_at))
        )

        # Apply filters
        conditions = []
        if author_id:
            conditions.append(Post.author_id == author_id)

        if published_only:
            conditions.append(Post.published == True)

        if search:
            search_term = f"%{search}%"
            conditions.append(
                or_(
                    Post.title.ilike(search_term),
                    Post.content.ilike(search_term),
                    Post.excerpt.ilike(search_term)
                )
            )

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Tag filtering (more complex)
        if tags:
            stmt = stmt.join(PostTag).join(Tag).where(Tag.name.in_(tags))

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    async def get_count(
        self,
        author_id: Optional[int] = None,
        published_only: bool = False,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> int:
        """Get total count of posts matching filters"""
        stmt = select(func.count(Post.id))

        conditions = []
        if author_id:
            conditions.append(Post.author_id == author_id)
        if published_only:
            conditions.append(Post.published == True)
        if search:
            search_term = f"%{search}%"
            conditions.append(
                or_(
                    Post.title.ilike(search_term),
                    Post.content.ilike(search_term),
                    Post.excerpt.ilike(search_term)
                )
            )

        if conditions:
            stmt = stmt.where(and_(*conditions))

        if tags:
            stmt = stmt.join(PostTag).join(Tag).where(Tag.name.in_(tags))

        result = await self.db.execute(stmt)
        return result.scalar()

    async def create(self, post_data: PostCreate, author_id: int) -> Post:
        """Create new post with tags"""
        # Generate slug
        slug = self._generate_slug(post_data.title)

        # Ensure unique slug
        counter = 1
        original_slug = slug
        while await self._slug_exists(slug):
            slug = f"{original_slug}-{counter}"
            counter += 1

        # Create post
        post = Post(
            title=post_data.title,
            slug=slug,
            content=post_data.content,
            excerpt=post_data.excerpt,
            author_id=author_id,
            published=post_data.published
        )

        self.db.add(post)
        await self.db.flush()  # Get post ID

        # Add tags
        if post_data.tags:
            for tag_name in post_data.tags:
                tag = await self._get_or_create_tag(tag_name)
                post_tag = PostTag(post_id=post.id, tag_id=tag.id)
                self.db.add(post_tag)

        await self.db.commit()
        await self.db.refresh(post)
        return post

    async def update(self, post_id: int, post_data: PostUpdate, author_id: int) -> Optional[Post]:
        """Update post"""
        # Get existing post
        post = await self.get(post_id)
        if not post or post.author_id != author_id:
            return None

        # Update fields
        update_data = post_data.dict(exclude_unset=True, exclude={'tags'})

        # Handle slug update
        if 'title' in update_data and update_data['title'] != post.title:
            update_data['slug'] = self._generate_slug(update_data['title'])

        for field, value in update_data.items():
            setattr(post, field, value)

        # Update tags if provided
        if post_data.tags is not None:
            # Remove existing tags
            await self.db.execute(
                delete(PostTag).where(PostTag.post_id == post_id)
            )

            # Add new tags
            for tag_name in post_data.tags:
                tag = await self._get_or_create_tag(tag_name)
                post_tag = PostTag(post_id=post_id, tag_id=tag.id)
                self.db.add(post_tag)

        await self.db.commit()
        await self.db.refresh(post)
        return post

    async def delete(self, post_id: int, author_id: int) -> bool:
        """Delete post (only by author)"""
        stmt = delete(Post).where(
            and_(Post.id == post_id, Post.author_id == author_id)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def publish(self, post_id: int, author_id: int) -> Optional[Post]:
        """Publish a post"""
        from datetime import datetime
        stmt = (
            update(Post)
            .where(and_(Post.id == post_id, Post.author_id == author_id))
            .values(published=True, published_at=datetime.utcnow())
            .returning(Post)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        post = result.scalars().first()
        if post:
            await self.db.refresh(post)
        return post

    async def _slug_exists(self, slug: str) -> bool:
        """Check if slug exists"""
        stmt = select(Post.id).where(Post.slug == slug)
        result = await self.db.execute(stmt)
        return result.scalars().first() is not None

    async def _get_or_create_tag(self, tag_name: str) -> Tag:
        """Get or create tag"""
        # Normalize tag name
        tag_name = tag_name.lower().strip()

        # Check if exists
        stmt = select(Tag).where(Tag.name == tag_name)
        result = await self.db.execute(stmt)
        tag = result.scalars().first()

        if not tag:
            tag = Tag(
                name=tag_name,
                slug=self._generate_slug(tag_name)
            )
            self.db.add(tag)
            await self.db.flush()

        return tag

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug"""
        import re
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[\s_-]+', '-', slug)
        return slug.strip('-')
```

## FastAPI Integration

### Dependency Injection

```python
# dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db
from .crud.user import UserRepository
from .crud.post import PostRepository

def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Get user repository"""
    return UserRepository(db)

def get_post_repository(db: AsyncSession = Depends(get_db)) -> PostRepository:
    """Get post repository"""
    return PostRepository(db)
```

### API Routes

```python
# routes/posts.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..database import get_db
from ..crud.post import PostRepository
from ..schemas.post import Post, PostCreate, PostUpdate, PostList
from ..dependencies import get_post_repository

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    repo: PostRepository = Depends(get_post_repository),
    current_user = Depends(get_current_user)  # From auth
):
    """Create a new post"""
    return await repo.create(post, current_user.id)

@router.get("/", response_model=PostList)
async def read_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    author_id: Optional[int] = None,
    published_only: bool = False,
    tags: Optional[List[str]] = Query(None),
    repo: PostRepository = Depends(get_post_repository)
):
    """Get posts with filtering and pagination"""
    posts = await repo.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        author_id=author_id,
        published_only=published_only,
        tags=tags
    )

    total = await repo.get_count(
        search=search,
        author_id=author_id,
        published_only=published_only,
        tags=tags
    )

    from math import ceil
    pages = ceil(total / limit) if total > 0 else 0
    page = (skip // limit) + 1

    return PostList(
        items=posts,
        total=total,
        page=page,
        size=limit,
        pages=pages
    )

@router.get("/{post_id}", response_model=Post)
async def read_post(
    post_id: int,
    repo: PostRepository = Depends(get_post_repository)
):
    """Get a specific post"""
    post = await repo.get(post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.put("/{post_id}", response_model=Post)
async def update_post(
    post_id: int,
    post: PostUpdate,
    repo: PostRepository = Depends(get_post_repository),
    current_user = Depends(get_current_user)
):
    """Update a post"""
    updated_post = await repo.update(post_id, post, current_user.id)
    if updated_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return updated_post

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    repo: PostRepository = Depends(get_post_repository),
    current_user = Depends(get_current_user)
):
    """Delete a post"""
    success = await repo.delete(post_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found")

@router.post("/{post_id}/publish", response_model=Post)
async def publish_post(
    post_id: int,
    repo: PostRepository = Depends(get_post_repository),
    current_user = Depends(get_current_user)
):
    """Publish a post"""
    post = await repo.publish(post_id, current_user.id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
```

## Performance Optimization

### Connection Pooling

```python
# config.py (enhanced)
class DatabaseSettings(BaseSettings):
    # Pool settings
    pool_pre_ping: bool = True  # Verify connections before use
    pool_reset_on_return: str = "rollback"  # Reset connections on return

# database.py (enhanced)
engine = create_async_engine(
    db_settings.database_url,
    pool_pre_ping=db_settings.pool_pre_ping,
    pool_reset_on_return=db_settings.pool_reset_on_return,
    # ... other settings
)
```

### Query Optimization

```python
# Use selectinload for N+1 prevention
async def get_posts_with_comments(self) -> List[Post]:
    """Get posts with comments loaded efficiently"""
    stmt = (
        select(Post)
        .options(
            selectinload(Post.comments).selectinload(Comment.author),
            selectinload(Post.author)
        )
        .where(Post.published == True)
        .order_by(desc(Post.created_at))
    )
    result = await self.db.execute(stmt)
    return result.scalars().unique().all()
```

### Database Indexing Strategy

```sql
-- Important indexes for performance
CREATE INDEX CONCURRENTLY idx_posts_author_id ON posts(author_id);
CREATE INDEX CONCURRENTLY idx_posts_published_created_at ON posts(published, created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_slug ON posts(slug);
CREATE INDEX CONCURRENTLY idx_comments_post_id ON comments(post_id);
CREATE INDEX CONCURRENTLY idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX CONCURRENTLY idx_post_tags_tag_id ON post_tags(tag_id);

-- Full-text search index
CREATE INDEX CONCURRENTLY idx_posts_search ON posts USING gin(to_tsvector('english', title || ' ' || content));
```

### Caching Strategy

```python
# cache.py
from redis.asyncio import Redis
import json
from typing import Optional, Any

class Cache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = Redis.from_url(redis_url)

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set(self, key: str, value: Any, expire: int = 300) -> None:
        """Set value in cache"""
        await self.redis.setex(key, expire, json.dumps(value))

    async def delete(self, key: str) -> None:
        """Delete from cache"""
        await self.redis.delete(key)

    async def clear_pattern(self, pattern: str) -> None:
        """Clear keys matching pattern"""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

# Usage in repository
class CachedPostRepository(PostRepository):
    def __init__(self, db: AsyncSession, cache: Cache):
        super().__init__(db)
        self.cache = cache

    async def get(self, post_id: int) -> Optional[Post]:
        """Get post with caching"""
        cache_key = f"post:{post_id}"

        # Try cache first
        cached_post = await self.cache.get(cache_key)
        if cached_post:
            return Post(**cached_post)

        # Get from database
        post = await super().get(post_id)
        if post:
            # Cache for 5 minutes
            await self.cache.set(cache_key, post.dict(), expire=300)

        return post

    async def update(self, post_id: int, post_data: PostUpdate, author_id: int) -> Optional[Post]:
        """Update post and clear cache"""
        post = await super().update(post_id, post_data, author_id)
        if post:
            # Clear related caches
            await self.cache.delete(f"post:{post_id}")
            await self.cache.clear_pattern("posts:*")
        return post
```

## Migration with Alembic

### Alembic Setup

```bash
# Initialize alembic
alembic init alembic

# Configure alembic.ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://user:password@localhost/dbname

# Create first migration
alembic revision --autogenerate -m "Initial migration"

# Run migration
alembic upgrade head
```

### Async Migration Operations

```python
# alembic/env.py (modified for async)
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.database import Base

# Import all models
from app.models import user, post

config = context.config

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=Base.metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """Run migrations with async connection"""
    context.configure(connection=connection, target_metadata=Base.metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Run migrations in async mode"""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())
```

## Testing Async Databases

### Test Database Setup

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture(scope="session")
def test_engine():
    """Create test engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine

@pytest.fixture(scope="function")
async def test_db(test_engine):
    """Create and drop test database tables"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def db_session(test_engine, test_db):
    """Database session fixture"""
    TestSessionLocal = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with TestSessionLocal() as session:
        yield session
```

### Async Test Examples

```python
# tests/test_posts.py
import pytest
from app.crud.post import PostRepository
from app.schemas.post import PostCreate

@pytest.mark.asyncio
async def test_create_post(db_session):
    """Test creating a post"""
    repo = PostRepository(db_session)

    post_data = PostCreate(
        title="Test Post",
        content="Test content",
        author_id=1
    )

    post = await repo.create(post_data)
    assert post.title == "Test Post"
    assert post.slug == "test-post"
    assert post.author_id == 1

@pytest.mark.asyncio
async def test_get_post_with_relations(db_session):
    """Test getting post with relationships loaded"""
    repo = PostRepository(db_session)

    # Create post with tags
    post_data = PostCreate(
        title="Post with Tags",
        content="Content",
        author_id=1,
        tags=["python", "fastapi"]
    )

    post = await repo.create(post_data)

    # Retrieve with relationships
    retrieved = await repo.get(post.id)
    assert retrieved is not None
    assert len(retrieved.tags) == 2
    assert retrieved.author is not None
```

## Best Practices

### Database Design
- **Use appropriate data types**: Choose correct types for performance
- **Normalize when appropriate**: Balance between read/write performance
- **Index strategically**: Index frequently queried columns
- **Use constraints**: Enforce data integrity at database level

### Async Patterns
- **Use async sessions**: Always use AsyncSession for database operations
- **Handle transactions properly**: Use async context managers
- **Batch operations**: Use bulk operations when possible
- **Connection pooling**: Configure appropriate pool settings

### Performance Optimization
- **Select only needed columns**: Use selective column loading
- **Use relationships wisely**: Choose appropriate loading strategies
- **Cache frequently accessed data**: Implement caching layers
- **Monitor query performance**: Use database query logs

## Hands-on Exercises

### Exercise 1: Async CRUD Operations
1. Set up async SQLAlchemy with PostgreSQL
2. Create models with relationships
3. Implement repository pattern
4. Test all CRUD operations

### Exercise 2: Query Optimization
1. Implement complex queries with joins
2. Add proper indexing strategy
3. Implement pagination and filtering
4. Profile and optimize slow queries

### Exercise 3: Database Transactions
1. Implement multi-table operations
2. Handle transaction rollbacks
3. Implement optimistic locking
4. Test concurrent operations

## Next Steps
- [Advanced Security Tutorial](../tutorials/05-advanced-security.md)
- [Workshop: Async API](../workshops/workshop-03-async-api.md)

## Additional Resources
- [SQLAlchemy Async Documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [AsyncPG Documentation](https://magicstack.github.io/asyncpg/)
- [Database Performance Best Practices](https://use-the-index-luke.com/)
- [PostgreSQL Async Drivers](https://wiki.postgresql.org/wiki/List_of_drivers)

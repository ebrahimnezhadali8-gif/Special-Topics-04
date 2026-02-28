# Tutorial 04: SQLAlchemy ORM - Object-Relational Mapping

## Overview
This tutorial covers SQLAlchemy, the most popular Python ORM (Object-Relational Mapping) library. You'll learn how to use SQLAlchemy ORM to interact with PostgreSQL databases using Python objects instead of raw SQL queries.

## What is SQLAlchemy?

SQLAlchemy is a Python SQL toolkit and Object-Relational Mapping (ORM) library that provides a full suite of well-known enterprise-level persistence patterns. It allows you to interact with databases using Python objects and methods instead of writing raw SQL.

### SQLAlchemy Components
- **SQLAlchemy Core**: SQL abstraction layer
- **SQLAlchemy ORM**: Object-Relational Mapping layer
- **SQLAlchemy Engine**: Database connection management

### ORM vs Core
```python
# SQLAlchemy Core (lower level)
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/db")
with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": 1})
    user = result.fetchone()

# SQLAlchemy ORM (higher level)
from sqlalchemy.orm import sessionmaker, Session

Session = sessionmaker(bind=engine)
with Session() as session:
    user = session.query(User).filter(User.id == 1).first()
```

## Installation and Setup

### Installation
```bash
uv add sqlalchemy psycopg2-binary
```

### Basic Setup
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

# Database URL
DATABASE_URL = "postgresql://username:password@localhost:5432/database_name"

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()
```

## Defining Models

### Basic Model Definition
```python
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Basic fields
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))

    # Boolean field
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
```

### Model with Relationships
```python
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # One-to-many relationship
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(DECIMAL(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0)

    # Foreign key
    category_id = Column(Integer, ForeignKey("categories.id"))

    # Relationship
    category = relationship("Category", back_populates="products")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Advanced Model Features
```python
from sqlalchemy import Column, Integer, String, DateTime, JSON, ARRAY, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import enum

class OrderStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"

    # UUID primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Enum field
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)

    # JSON fields
    metadata = Column(JSONB)  # Indexed JSON
    notes = Column(JSON)      # Regular JSON

    # Array field
    tags = Column(ARRAY(String(50)))

    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))
    shipping_address_id = Column(Integer, ForeignKey("addresses.id"))

    # Relationships
    user = relationship("User", backref="orders")
    shipping_address = relationship("Address")
    items = relationship("OrderItem", back_populates="order")

    # Computed fields (hybrid properties)
    @property
    def total_amount(self):
        return sum(item.total_price for item in self.items)

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)

    # Calculated field
    total_price = Column(DECIMAL(10, 2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
```

## CRUD Operations with ORM

### Creating Records
```python
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User, Category, Product

def create_user(db: Session, username: str, email: str, password: str):
    # Create user object
    user = User(
        username=username,
        email=email,
        password_hash=get_password_hash(password)
    )

    # Add to session
    db.add(user)

    # Commit to database
    db.commit()

    # Refresh to get auto-generated fields
    db.refresh(user)

    return user

def create_product_with_category(db: Session, name: str, price: float, category_name: str):
    # Get or create category
    category = db.query(Category).filter(Category.name == category_name).first()
    if not category:
        category = Category(name=category_name)
        db.add(category)
        db.flush()  # Get category ID

    # Create product
    product = Product(
        name=name,
        price=price,
        category_id=category.id
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product

# Usage
def main():
    db = SessionLocal()

    try:
        # Create user
        user = create_user(db, "johndoe", "john@example.com", "password123")
        print(f"Created user: {user.username}")

        # Create product
        product = create_product_with_category(db, "Laptop", 999.99, "Electronics")
        print(f"Created product: {product.name} in category: {product.category.name}")

    finally:
        db.close()
```

### Reading Records
```python
def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def get_active_users(db: Session):
    return db.query(User).filter(User.is_active == True).all()

def get_users_with_orders(db: Session):
    """Get users with their order count"""
    from sqlalchemy import func

    return db.query(
        User,
        func.count(Order.id).label("order_count")
    ).outerjoin(Order).group_by(User.id).all()

def search_products(db: Session, query: str, category_id: int = None):
    """Search products by name and category"""
    q = db.query(Product).filter(Product.name.ilike(f"%{query}%"))

    if category_id:
        q = q.filter(Product.category_id == category_id)

    return q.all()

def get_products_with_category(db: Session):
    """Get products with their category information"""
    return db.query(Product).options(joinedload(Product.category)).all()

def get_order_with_items(db: Session, order_id: str):
    """Get order with all its items and product details"""
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
```

### Updating Records
```python
def update_user(db: Session, user_id: int, update_data: dict):
    """Update user with provided data"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return None

    # Update fields
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    # Update timestamp
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user

def update_product_stock(db: Session, product_id: int, quantity_change: int):
    """Update product stock (thread-safe)"""
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        return None

    # Use SQL UPDATE for atomic operation
    db.query(Product).filter(Product.id == product_id).update({
        "stock_quantity": Product.stock_quantity + quantity_change,
        "updated_at": datetime.utcnow()
    })

    db.commit()

    # Refresh the object
    db.refresh(product)

    return product

def bulk_update_user_status(db: Session, user_ids: list, is_active: bool):
    """Bulk update user status"""
    db.query(User).filter(User.id.in_(user_ids)).update({
        "is_active": is_active,
        "updated_at": datetime.utcnow()
    })

    db.commit()
```

### Deleting Records
```python
def delete_user(db: Session, user_id: int):
    """Delete user by ID"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return False

    db.delete(user)
    db.commit()

    return True

def delete_inactive_users(db: Session):
    """Delete all inactive users"""
    deleted_count = db.query(User).filter(User.is_active == False).delete()
    db.commit()

    return deleted_count

def soft_delete_product(db: Session, product_id: int):
    """Soft delete by marking as inactive"""
    db.query(Product).filter(Product.id == product_id).update({
        "is_active": False,
        "updated_at": datetime.utcnow()
    })

    db.commit()
```

## Advanced Query Techniques

### Filtering and Sorting
```python
def get_filtered_products(db: Session, filters: dict):
    """Advanced product filtering"""
    query = db.query(Product)

    # Price range
    if 'min_price' in filters:
        query = query.filter(Product.price >= filters['min_price'])
    if 'max_price' in filters:
        query = query.filter(Product.price <= filters['max_price'])

    # Category filter
    if 'category_id' in filters:
        query = query.filter(Product.category_id == filters['category_id'])

    # Stock filter
    if 'in_stock' in filters:
        query = query.filter(Product.stock_quantity > 0)

    # Text search
    if 'search' in filters:
        search_term = f"%{filters['search']}%"
        query = query.filter(Product.name.ilike(search_term))

    # Sorting
    sort_by = filters.get('sort_by', 'name')
    sort_order = filters.get('sort_order', 'asc')

    if sort_order == 'desc':
        query = query.order_by(getattr(Product, sort_by).desc())
    else:
        query = query.order_by(getattr(Product, sort_by))

    return query.all()

def get_user_statistics(db: Session):
    """Get user statistics using aggregation"""
    from sqlalchemy import func

    # Count users by status
    status_counts = db.query(
        User.is_active,
        func.count(User.id).label('count')
    ).group_by(User.is_active).all()

    # Recent user registrations
    recent_users = db.query(func.count(User.id)).filter(
        User.created_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar()

    return {
        'total_users': db.query(func.count(User.id)).scalar(),
        'active_users': db.query(func.count(User.id)).filter(User.is_active == True).scalar(),
        'recent_registrations': recent_users,
        'status_breakdown': {str(status): count for status, count in status_counts}
    }
```

### Complex Relationships
```python
def get_user_order_history(db: Session, user_id: int):
    """Get user's complete order history"""
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product),
        joinedload(Order.shipping_address)
    ).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()

def get_product_sales_report(db: Session, product_id: int):
    """Get sales report for a product"""
    from sqlalchemy import func, extract

    # Monthly sales for the last 12 months
    monthly_sales = db.query(
        extract('year', Order.created_at).label('year'),
        extract('month', Order.created_at).label('month'),
        func.sum(OrderItem.quantity).label('total_quantity'),
        func.sum(OrderItem.total_price).label('total_revenue')
    ).join(OrderItem).join(Order).filter(
        OrderItem.product_id == product_id,
        Order.created_at >= datetime.utcnow() - timedelta(days=365)
    ).group_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).order_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).all()

    return monthly_sales

def get_category_performance(db: Session):
    """Get sales performance by category"""
    return db.query(
        Category.name,
        func.count(Product.id).label('product_count'),
        func.sum(OrderItem.total_price).label('total_revenue'),
        func.avg(Product.price).label('avg_price')
    ).join(Product).join(OrderItem).join(Order).filter(
        Order.status == 'completed'
    ).group_by(Category.id, Category.name).all()
```

## Transaction Management

### Basic Transactions
```python
def create_order_with_items(db: Session, user_id: int, items: list):
    """Create order with multiple items in a transaction"""
    try:
        # Create order
        order = Order(user_id=user_id, status=OrderStatus.PENDING)
        db.add(order)
        db.flush()  # Get order ID

        total_amount = 0

        # Add order items
        for item_data in items:
            product = db.query(Product).get(item_data['product_id'])

            if not product or product.stock_quantity < item_data['quantity']:
                raise ValueError(f"Insufficient stock for product {item_data['product_id']}")

            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data['product_id'],
                quantity=item_data['quantity'],
                unit_price=product.price,
                total_price=product.price * item_data['quantity']
            )

            db.add(order_item)
            total_amount += order_item.total_price

            # Update stock
            product.stock_quantity -= item_data['quantity']

        # Update order total
        order.total_amount = total_amount

        db.commit()

        return order

    except Exception as e:
        db.rollback()
        raise e
```

### Nested Transactions
```python
from sqlalchemy import exc

def process_payment_and_update_inventory(db: Session, order_id: str):
    """Process payment and update inventory atomically"""
    try:
        # Get order with items
        order = db.query(Order).options(joinedload(Order.items)).get(order_id)

        if not order:
            raise ValueError("Order not found")

        # Process payment (simulated)
        payment_success = process_payment(order.total_amount)

        if not payment_success:
            raise ValueError("Payment failed")

        # Update order status
        order.status = OrderStatus.PROCESSING

        # Update inventory
        for item in order.items:
            product = item.product
            if product.stock_quantity < item.quantity:
                raise ValueError(f"Insufficient stock for {product.name}")

            product.stock_quantity -= item.quantity

        db.commit()

        return True

    except exc.IntegrityError as e:
        db.rollback()
        raise ValueError("Data integrity error")

    except Exception as e:
        db.rollback()
        raise e
```

## Session Management Patterns

### Dependency Injection with FastAPI
```python
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Repository pattern
class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, user_data: dict):
        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

def get_user_repository(db: Session = Depends(get_db)):
    return UserRepository(db)

# API endpoints
@app.get("/users/{user_id}")
def get_user(user_id: int, repo: UserRepository = Depends(get_user_repository)):
    user = repo.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Context Manager Pattern
```python
class DatabaseSession:
    def __init__(self):
        self.session = None

    def __enter__(self):
        self.session = SessionLocal()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            if exc_type:
                self.session.rollback()
            else:
                self.session.commit()
            self.session.close()

# Usage
def process_user_data(user_id: int, data: dict):
    with DatabaseSession() as db:
        user = db.query(User).get(user_id)
        if not user:
            raise ValueError("User not found")

        # Process data
        user.full_name = data.get('full_name', user.full_name)

        # Automatic commit on success, rollback on exception
```

## Best Practices

### Session Management
1. **Always close sessions** - Use context managers or dependency injection
2. **Avoid long-running sessions** - Create sessions for specific operations
3. **Use transactions wisely** - Wrap related operations in transactions
4. **Handle exceptions properly** - Rollback on errors

### Model Design
1. **Use meaningful names** - Follow Python naming conventions
2. **Define relationships** - Use back_populates for bidirectional relationships
3. **Add constraints** - Use database constraints for data integrity
4. **Document models** - Add docstrings and comments

### Query Optimization
1. **Use selective queries** - Only load needed data
2. **Leverage relationships** - Use joinedload for related data
3. **Batch operations** - Use bulk operations for multiple records
4. **Monitor performance** - Use SQLAlchemy's query logging

## Hands-on Exercises

### Exercise 1: Basic CRUD Operations
1. Create User and Post models with relationships
2. Implement CRUD operations for both models
3. Add proper error handling and validation
4. Test with sample data

### Exercise 2: Advanced Queries
1. Implement search functionality across multiple fields
2. Add filtering and sorting capabilities
3. Create aggregation queries for statistics
4. Optimize queries with proper indexing

### Exercise 3: Transaction Management
1. Implement complex business operations with transactions
2. Add rollback handling for error scenarios
3. Create nested transaction logic
4. Test transaction isolation levels

## Next Steps
- [AsyncPG Connections Tutorial](../tutorials/05-asyncpg-connections.md)
- [Workshop: Basic Schema Design](../workshops/workshop-01-basic-schema-design.md)

## Additional Resources
- [SQLAlchemy Documentation](https://sqlalchemy.org/)
- [SQLAlchemy ORM Tutorial](https://docs.sqlalchemy.org/en/14/orm/tutorial.html)
- [PostgreSQL with SQLAlchemy](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)
- [SQLAlchemy Best Practices](https://docs.sqlalchemy.org/en/14/core/connections.html#basic-usage)

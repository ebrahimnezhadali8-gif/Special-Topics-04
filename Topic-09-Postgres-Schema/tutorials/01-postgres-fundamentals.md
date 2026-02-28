# Tutorial 01: PostgreSQL Fundamentals and Schema Design

## Overview
This tutorial introduces PostgreSQL fundamentals, database concepts, and schema design principles. You'll learn about relational databases, PostgreSQL features, and how to design effective database schemas for your applications.

## What is PostgreSQL?

PostgreSQL is a powerful, open-source object-relational database system that uses and extends the SQL language. It's known for its robustness, extensibility, and standards compliance.

### Key Features

- **ACID Compliance**: Atomicity, Consistency, Isolation, Durability
- **Extensible**: Custom data types, operators, and functions
- **Standards Compliant**: Full SQL:2016 standard support
- **Concurrent**: Excellent multi-user concurrency support
- **Advanced Features**: JSON support, full-text search, geospatial data
- **Reliable**: 25+ years of active development

### PostgreSQL vs Other Databases

| Feature | PostgreSQL | MySQL | SQLite | MongoDB |
|---------|------------|-------|--------|---------|
| Type | Relational | Relational | Embedded | Document |
| ACID | ✅ Full | ✅ Partial | ❌ | ❌ |
| JSON Support | ✅ Advanced | ✅ Basic | ❌ | ✅ Native |
| Extensibility | ✅ High | ⚠️ Limited | ❌ | ⚠️ Limited |
| Performance | ✅ Excellent | ✅ Good | ⚠️ Limited | ✅ High |
| Use Case | Enterprise apps | Web apps | Embedded | Big Data |

## Database Concepts

### Relational Model

The relational model organizes data into tables (relations) with rows and columns. Each table represents an entity, and relationships between tables are established through keys.

### Key Concepts

#### Tables (Relations)
- **Structure**: Rows (records) and columns (attributes)
- **Constraints**: Rules that data must follow
- **Indexes**: Data structures for fast retrieval

#### Primary Keys
- **Unique identifier** for each row
- **Cannot be NULL**
- **Usually auto-incrementing integers or UUIDs**

#### Foreign Keys
- **References** primary key in another table
- **Maintains referential integrity**
- **Enforces relationships between tables**

#### Relationships
- **One-to-One**: One record relates to one record
- **One-to-Many**: One record relates to many records
- **Many-to-Many**: Many records relate to many records (requires junction table)

## PostgreSQL Architecture

### Database Server Components

#### Database Cluster
- **Collection of databases** managed by a single PostgreSQL server
- **Default location**: `/var/lib/postgresql/data` (Linux), `C:\Program Files\PostgreSQL\data` (Windows)

#### Databases
- **Named container** for tables, views, etc.
- **Multiple databases** per cluster
- **Default database**: `postgres`

#### Schemas
- **Namespace** within a database
- **Groups related objects** together
- **Default schema**: `public`

### Connection Architecture

#### Client Connections
- **TCP/IP connections** from applications
- **Connection pooling** for performance
- **Authentication** and authorization

#### Processes
- **Postmaster**: Main server process
- **Backend processes**: One per client connection
- **Background processes**: WAL writer, checkpointer, etc.

## Getting Started with PostgreSQL

### Basic Commands

#### Connect to Database
```bash
# Using psql (command line)
psql -h localhost -p 5432 -U postgres -d postgres

# Connect to specific database
psql -U username -d database_name
```

#### Basic SQL Operations
```sql
-- Show version
SELECT version();

-- List databases
\l

-- Connect to database
\c database_name

-- List tables
\dt

-- Show table structure
\d table_name

-- Exit
\q
```

### Creating Your First Database

```sql
-- Create database
CREATE DATABASE myapp_db;

-- Connect to database
\c myapp_db

-- Create schema
CREATE SCHEMA app;

-- Set search path
SET search_path TO app, public;
```

## Schema Design Principles

### Entity-Relationship Modeling

#### Entities
- **Real-world objects** you want to store
- **Examples**: Users, Products, Orders, Categories

#### Attributes
- **Properties** of entities
- **Examples**: name, email, price, quantity

#### Relationships
- **Connections** between entities
- **Examples**: User places Order, Product belongs to Category

### Example: E-commerce Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Users     │       │   Orders    │       │  Products   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────┤ user_id (FK)│       │ id (PK)     │
│ name        │       │ id (PK)     │       │ name        │
│ email       │       │ total       │       │ price       │
│ created_at  │       │ status      │       │ category_id │
└─────────────┘       └─────────────┘       └─────────────┘
      │                       │                     │
      │                       │                     │
      ▼                       ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Addresses  │       │Order_Items │       │ Categories  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ user_id (FK)│       │order_id (FK)│       │ id (PK)     │
│ street      │       │product_id(FK│       │ name        │
│ city        │       │ quantity    │       │ description │
│ zip_code    │       │ unit_price  │       └─────────────┘
└─────────────┘       └─────────────┘
```

### Design Steps

#### 1. Identify Entities
- **Brainstorm** all objects in your domain
- **Group related concepts** together
- **Eliminate redundancies**

#### 2. Define Attributes
- **Choose appropriate data types**
- **Identify required vs optional fields**
- **Plan for future extensibility**

#### 3. Establish Relationships
- **Determine cardinalities** (1:1, 1:N, N:M)
- **Choose appropriate keys**
- **Plan junction tables for many-to-many**

#### 4. Apply Normalization
- **Eliminate data redundancy**
- **Ensure data integrity**
- **Optimize for queries**

## PostgreSQL Data Types

### Numeric Types
```sql
-- Integer types
SMALLINT     -- -32,768 to 32,767 (2 bytes)
INTEGER      -- -2,147,483,648 to 2,147,483,647 (4 bytes)
BIGINT       -- -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 (8 bytes)

-- Auto-incrementing
SERIAL       -- Auto-incrementing integer (4 bytes)
BIGSERIAL    -- Auto-incrementing bigint (8 bytes)

-- Decimal types
DECIMAL(precision, scale)  -- Exact decimal
NUMERIC(precision, scale)  -- Same as DECIMAL
REAL                        -- 6 decimal digits precision (4 bytes)
DOUBLE PRECISION           -- 15 decimal digits precision (8 bytes)
```

### String Types
```sql
-- Fixed length
CHAR(n)      -- Fixed-length string, padded with spaces
VARCHAR(n)   -- Variable-length string with limit
TEXT         -- Variable-length string (unlimited)

-- Example usage
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT
);
```

### Date/Time Types
```sql
-- Date and time
DATE                    -- Date only (YYYY-MM-DD)
TIME                    -- Time only (HH:MM:SS)
TIMESTAMP              -- Date and time
TIMESTAMP WITH TIME ZONE -- Date and time with timezone
INTERVAL               -- Time intervals

-- Example usage
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Boolean and UUID Types
```sql
-- Boolean
BOOLEAN     -- TRUE/FALSE

-- UUID
UUID        -- Universally Unique Identifier

-- Example usage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    author_id INTEGER REFERENCES users(id)
);
```

### JSON Types
```sql
-- JSON support
JSON        -- JSON data as text
JSONB       -- Binary JSON (indexed, faster)

-- Example usage
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    preferences JSONB,
    metadata JSON
);

-- Insert JSON data
INSERT INTO user_preferences (user_id, preferences)
VALUES (1, '{"theme": "dark", "language": "en", "notifications": {"email": true, "sms": false}}');

-- Query JSON data
SELECT user_id, preferences->>'theme' as theme
FROM user_preferences
WHERE preferences->>'language' = 'en';
```

### Arrays
```sql
-- Array types
INTEGER[]           -- Array of integers
VARCHAR(50)[]       -- Array of strings
TEXT[]              -- Array of text

-- Example usage
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tags VARCHAR(50)[],
    images TEXT[]
);

-- Insert array data
INSERT INTO products (name, tags, images)
VALUES ('Laptop', ARRAY['electronics', 'computer'], ARRAY['laptop1.jpg', 'laptop2.jpg']);

-- Query arrays
SELECT name FROM products WHERE 'electronics' = ANY(tags);
```

## Constraints and Validation

### Primary Key Constraints
```sql
-- Single column primary key
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL
);

-- Composite primary key
CREATE TABLE user_permissions (
    user_id INTEGER REFERENCES users(id),
    permission VARCHAR(50),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission)
);
```

### Foreign Key Constraints
```sql
-- Basic foreign key
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL
);

-- Foreign key with actions
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL
);
```

### Check Constraints
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) CHECK (price > 0),
    discount DECIMAL(3,2) CHECK (discount >= 0 AND discount <= 1),
    stock_quantity INTEGER CHECK (stock_quantity >= 0)
);
```

### Unique Constraints
```sql
-- Single column unique
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE
);

-- Multiple columns unique
CREATE TABLE friendships (
    user_id INTEGER REFERENCES users(id),
    friend_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, friend_id),
    CHECK (user_id != friend_id)  -- Can't befriend yourself
);
```

## Views and Indexes

### Views
```sql
-- Simple view
CREATE VIEW active_users AS
SELECT id, username, email, created_at
FROM users
WHERE is_active = TRUE;

-- Complex view with joins
CREATE VIEW order_summary AS
SELECT
    o.id,
    u.username,
    o.total,
    o.status,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.username, o.total, o.status;

-- Query the view
SELECT * FROM active_users WHERE created_at > '2023-01-01';
```

### Basic Indexes
```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index
CREATE INDEX idx_active_users ON users(username) WHERE is_active = TRUE;

-- Unique index
CREATE UNIQUE INDEX idx_unique_username ON users(LOWER(username));
```

## Best Practices

### Naming Conventions
```sql
-- Tables: plural, snake_case
users, user_permissions, order_items

-- Columns: snake_case
user_id, created_at, is_active, full_name

-- Indexes: idx_table_columns
idx_users_email, idx_orders_user_created

-- Constraints: descriptive names
fk_orders_user_id, ck_products_price_positive
```

### Schema Organization
```sql
-- Use schemas to organize related tables
CREATE SCHEMA app;
CREATE SCHEMA audit;

-- Place tables in appropriate schemas
CREATE TABLE app.users (...);
CREATE TABLE audit.user_changes (...);

-- Set default search path
ALTER DATABASE myapp_db SET search_path TO app, public;
```

### Security Considerations
```sql
-- Create roles with minimal privileges
CREATE ROLE app_user LOGIN PASSWORD 'secure_password';
CREATE ROLE app_admin LOGIN PASSWORD 'admin_password';

-- Grant specific permissions
GRANT SELECT, INSERT ON users TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA app TO app_admin;

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_data ON users
    FOR ALL USING (user_id = current_user_id());
```

## Hands-on Exercises

### Exercise 1: Basic Schema Design
1. Design a schema for a blog application
2. Create tables for users, posts, and comments
3. Establish proper relationships and constraints

### Exercise 2: Data Types Practice
1. Create a products table with appropriate data types
2. Add validation constraints
3. Insert sample data and test constraints

### Exercise 3: Relationships and Keys
1. Design a library management system
2. Create tables for books, authors, borrowers
3. Implement proper foreign key relationships

## Next Steps
- [Table Design and Normalization Tutorial](../tutorials/02-table-design-normalization.md)
- [Workshop: Basic Schema Design](../workshops/workshop-01-basic-schema-design.md)

## Additional Resources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design for Mere Mortals](https://www.amazon.com/Database-Design-Mere-Mortals-Hands/dp/0321884493)
- [SQLZoo](https://sqlzoo.net/) - Interactive SQL learning
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

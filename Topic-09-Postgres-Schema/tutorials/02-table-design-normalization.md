# Tutorial 02: Table Design and Database Normalization

## Overview
This tutorial covers the principles of relational database design, focusing on table creation, normalization techniques, and best practices for designing efficient and maintainable database schemas. You'll learn how to eliminate data redundancy and ensure data integrity.

## Database Design Process

### Requirements Analysis
1. **Identify Entities**: Real-world objects (Users, Products, Orders)
2. **Define Attributes**: Properties of each entity
3. **Determine Relationships**: How entities relate to each other
4. **Specify Constraints**: Business rules and data integrity requirements

### Conceptual Design
- **Entity-Relationship Diagrams (ERD)**
- **High-level relationships**
- **Business rules**

### Logical Design
- **Convert ERD to relations**
- **Apply normalization**
- **Define keys and constraints**

### Physical Design
- **Choose data types**
- **Create indexes**
- **Consider performance**

## Table Creation Basics

### Basic Table Structure
```sql
-- Basic table creation
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.username IS 'Unique username for login';
```

### Advanced Table Options
```sql
-- Table with schema and options
CREATE TABLE IF NOT EXISTS app.products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) CHECK (price >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Table constraints
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL,

    -- Check constraints
    CONSTRAINT ck_products_price_positive
        CHECK (price >= 0),

    -- Exclusion constraints (PostgreSQL specific)
    EXCLUDE (sku WITH =)  -- Ensure SKU uniqueness
) WITH (
    -- Storage parameters
    fillfactor = 80,
    autovacuum_enabled = true
);

-- Create indexes
CREATE INDEX CONCURRENTLY idx_products_category ON app.products(category_id);
CREATE INDEX CONCURRENTLY idx_products_name ON app.products USING gin(to_tsvector('english', name));
```

## Database Normalization

### What is Normalization?

Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity. It involves dividing large tables into smaller, related tables and defining relationships between them.

### Normal Forms

#### First Normal Form (1NF)
**Rule**: Each column must contain atomic (indivisible) values, and each record must be unique.

**Violation Example**:
```sql
-- NOT 1NF - Multiple values in single column
CREATE TABLE bad_orders (
    order_id INTEGER,
    customer_name VARCHAR(100),
    products VARCHAR(500)  -- "Laptop,Mouse,Keyboard"
);
```

**Correct 1NF**:
```sql
-- 1NF - Atomic values
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_name VARCHAR(100),
    order_date DATE
);

CREATE TABLE order_items (
    order_id INTEGER REFERENCES orders(order_id),
    product_name VARCHAR(100),
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    PRIMARY KEY (order_id, product_name)
);
```

#### Second Normal Form (2NF)
**Rule**: Table must be in 1NF, and all non-key attributes must depend on the entire primary key.

**Violation Example**:
```sql
-- NOT 2NF - Partial dependency
CREATE TABLE bad_orders (
    order_id INTEGER,
    product_id INTEGER,
    customer_name VARCHAR(100),  -- Depends only on order_id
    product_name VARCHAR(100),   -- Depends only on product_id
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id)
);
```

**Correct 2NF**:
```sql
-- 2NF - Remove partial dependencies
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_name VARCHAR(100),
    order_date DATE
);

CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name VARCHAR(100),
    unit_price DECIMAL(10,2)
);

CREATE TABLE order_items (
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id)
);
```

#### Third Normal Form (3NF)
**Rule**: Table must be in 2NF, and no transitive dependencies exist.

**Violation Example**:
```sql
-- NOT 3NF - Transitive dependency
CREATE TABLE bad_employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name VARCHAR(100),
    department_name VARCHAR(50),
    department_location VARCHAR(100),  -- Depends on department_name
    salary DECIMAL(10,2)
);
```

**Correct 3NF**:
```sql
-- 3NF - Remove transitive dependencies
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name VARCHAR(100),
    department_name VARCHAR(50),
    salary DECIMAL(10,2),
    FOREIGN KEY (department_name) REFERENCES departments(name)
);

CREATE TABLE departments (
    name VARCHAR(50) PRIMARY KEY,
    location VARCHAR(100),
    manager_id INTEGER REFERENCES employees(employee_id)
);
```

### Boyce-Codd Normal Form (BCNF)
**Rule**: Every determinant must be a candidate key.

**Violation Example**:
```sql
-- NOT BCNF
CREATE TABLE course_instructors (
    course_id INTEGER,
    instructor_id INTEGER,
    course_name VARCHAR(100),  -- Determined by course_id
    instructor_name VARCHAR(100),  -- Determined by instructor_id
    semester VARCHAR(10),
    PRIMARY KEY (course_id, instructor_id, semester)
);
```

**Correct BCNF**:
```sql
-- BCNF
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name VARCHAR(100)
);

CREATE TABLE instructors (
    instructor_id INTEGER PRIMARY KEY,
    instructor_name VARCHAR(100)
);

CREATE TABLE course_schedule (
    course_id INTEGER REFERENCES courses(course_id),
    instructor_id INTEGER REFERENCES instructors(instructor_id),
    semester VARCHAR(10),
    PRIMARY KEY (course_id, instructor_id, semester)
);
```

## Practical Schema Design Examples

### E-commerce Schema
```sql
-- Categories (hierarchical)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product variants (colors, sizes, etc.)
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., "Color", "Size"
    value VARCHAR(100) NOT NULL, -- e.g., "Red", "Large"
    price_modifier DECIMAL(8,2) DEFAULT 0,
    stock_modifier INTEGER DEFAULT 0,
    UNIQUE (product_id, name, value)
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('billing', 'shipping')),
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    is_default BOOLEAN DEFAULT FALSE,
    UNIQUE (customer_id, type, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_address_id INTEGER REFERENCES addresses(id),
    shipping_address_id INTEGER REFERENCES addresses(id),
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0)
);

-- Indexes for performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_addresses_customer ON addresses(customer_id);
```

### Blog/Content Management Schema
```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280', -- Hex color
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    excerpt VARCHAR(300),
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure published posts have published_at
    CONSTRAINT ck_posts_published_at
        CHECK (
            (status = 'published' AND published_at IS NOT NULL) OR
            (status != 'published')
        )
);

-- Tags
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post tags (many-to-many)
CREATE TABLE post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id), -- NULL for anonymous
    author_name VARCHAR(100), -- For anonymous comments
    author_email VARCHAR(255), -- For anonymous comments
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES comments(id), -- For nested comments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure we have author info for non-anonymous comments
    CONSTRAINT ck_comments_author
        CHECK (
            (author_id IS NOT NULL) OR
            (author_name IS NOT NULL AND author_email IS NOT NULL)
        )
);

-- Full-text search index
CREATE INDEX idx_posts_content_fts ON posts USING gin(to_tsvector('english', title || ' ' || coalesce(content, '')));
CREATE INDEX idx_comments_content_fts ON comments USING gin(to_tsvector('english', content));

-- Performance indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at) WHERE status = 'published';
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
```

## Denormalization Considerations

### When to Denormalize
- **Read-heavy workloads**: When reads are much more frequent than writes
- **Performance requirements**: When normalization causes performance issues
- **Caching scenarios**: When data is cached and updated infrequently
- **Reporting databases**: Data warehouses often use denormalized schemas

### Controlled Denormalization Example
```sql
-- Normalized approach
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    total DECIMAL(10,2)
);

CREATE TABLE order_totals_cache (
    order_id INTEGER PRIMARY KEY REFERENCES orders(id),
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    shipping_amount DECIMAL(10,2),
    total DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Denormalized approach (for read-heavy systems)
CREATE TABLE orders_denorm (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    customer_name VARCHAR(100),      -- Denormalized
    customer_email VARCHAR(255),     -- Denormalized
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    shipping_amount DECIMAL(10,2),
    total DECIMAL(10,2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Advanced Table Features

### Table Inheritance
```sql
-- Parent table
CREATE TABLE content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Child tables inherit from parent
CREATE TABLE blog_posts (
    excerpt VARCHAR(300),
    published_at TIMESTAMP,
    tags TEXT[]
) INHERITS (content);

CREATE TABLE pages (
    slug VARCHAR(100) UNIQUE,
    is_published BOOLEAN DEFAULT FALSE
) INHERITS (content);

-- Query across all content types
SELECT id, title, tableoid::regclass AS table_name
FROM content
WHERE author_id = 1;
```

### Partitioning
```sql
-- Partitioned table for large datasets
CREATE TABLE user_activity (
    id BIGSERIAL,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE user_activity_2023_01 PARTITION OF user_activity
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

CREATE TABLE user_activity_2023_02 PARTITION OF user_activity
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');

-- Automatic partition creation (PostgreSQL 14+)
CREATE TABLE user_activity_default PARTITION OF user_activity DEFAULT;
```

### Generated Columns
```sql
-- Generated columns (PostgreSQL 12+)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discounted_price DECIMAL(10,2) GENERATED ALWAYS AS (price * (1 - discount_percent / 100)) STORED,
    name_upper VARCHAR(100) GENERATED ALWAYS AS (UPPER(name)) STORED
);

-- Insert data
INSERT INTO products (name, price, discount_percent)
VALUES ('Laptop', 1000.00, 10.00);

-- Query generated columns
SELECT name, price, discount_percent, discounted_price, name_upper
FROM products;
-- Result: Laptop, 1000.00, 10.00, 900.00, LAPTOP
```

## Best Practices

### Design Principles
1. **Start with normalization**: Begin with fully normalized design
2. **Consider access patterns**: Denormalize based on actual usage
3. **Use appropriate data types**: Choose types that match your data
4. **Plan for growth**: Design for scalability
5. **Document your schema**: Comment tables and columns

### Naming Conventions
```sql
-- Tables: plural, snake_case
users, user_profiles, order_items

-- Columns: snake_case
user_id, created_at, is_active

-- Primary keys: id (for simple tables)
-- Foreign keys: table_id
user_id, category_id

-- Constraints: descriptive names
pk_users_id, fk_posts_author_id, ck_products_price_positive
```

### Performance Considerations
- **Index foreign keys**: Always index foreign key columns
- **Choose primary keys wisely**: Use auto-incrementing integers or UUIDs
- **Use appropriate constraints**: Balance integrity with performance
- **Plan for archiving**: Design for data lifecycle management

## Hands-on Exercises

### Exercise 1: Library Management System
1. Design a schema for books, authors, borrowers, and loans
2. Apply proper normalization (3NF)
3. Add appropriate constraints and indexes
4. Create sample data and queries

### Exercise 2: Social Media Platform
1. Design tables for users, posts, comments, and likes
2. Handle many-to-many relationships (followers, post tags)
3. Implement soft deletes and audit trails
4. Add full-text search capabilities

### Exercise 3: E-commerce Optimization
1. Take the e-commerce schema from this tutorial
2. Identify potential performance bottlenecks
3. Add strategic denormalization where appropriate
4. Create indexes for common query patterns

## Next Steps
- [Indexes and Performance Tutorial](../tutorials/03-indexes-performance.md)
- [Workshop: Basic Schema Design](../workshops/workshop-01-basic-schema-design.md)

## Additional Resources
- [Database Design for Mere Mortals](https://www.amazon.com/Database-Design-Mere-Mortals-Hands/dp/0321884493)
- [SQL Antipatterns](https://www.amazon.com/SQL-Antipatterns-Programming-Prentice-Hall/dp/1934356557)
- [PostgreSQL Documentation - DDL](https://www.postgresql.org/docs/current/ddl.html)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)

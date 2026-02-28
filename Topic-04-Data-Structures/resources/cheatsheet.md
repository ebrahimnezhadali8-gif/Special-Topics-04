# Python Data Structures Cheatsheet

**Section 6**: Working with Lists and Sets  
**Quick Reference**: Key operations, methods, and best practices

---

## 📋 Lists - Core Operations

### Creating Lists

```python
# Different ways to create lists
empty = []
numbers = [1, 2, 3, 4, 5]
fruits = ["apple", "banana", "orange"]
mixed = [1, "hello", 3.14, True]

# From other iterables
from_range = list(range(5))        # [0, 1, 2, 3, 4]
from_string = list("hello")        # ['h', 'e', 'l', 'l', 'o']
from_tuple = list((1, 2, 3))       # [1, 2, 3]
```

### Accessing Elements

```python
fruits = ["apple", "banana", "orange", "grape"]

# Indexing (zero-based)
fruits[0]      # "apple"  (first element)
fruits[-1]     # "grape"  (last element)
fruits[-2]     # "orange" (second to last)

# Slicing [start:end:step]
fruits[0:2]    # ["apple", "banana"]  (first two)
fruits[1:4]    # ["banana", "orange", "grape"]  (middle three)
fruits[::2]    # ["apple", "orange"]  (every other)
fruits[::-1]   # ["grape", "orange", "banana", "apple"]  (reversed)
```

### Adding Elements

```python
numbers = [1, 2, 3]

# append() - Add single element at end
numbers.append(4)          # [1, 2, 3, 4]

# extend() - Add multiple elements
numbers.extend([5, 6])     # [1, 2, 3, 4, 5, 6]

# insert() - Add at specific position
numbers.insert(0, 0)       # [0, 1, 2, 3, 4, 5, 6]

# Concatenation
more = numbers + [7, 8]    # [0, 1, 2, 3, 4, 5, 6, 7, 8]
```

### Removing Elements

```python
fruits = ["apple", "banana", "orange", "banana"]

# remove() - Remove first occurrence by value
fruits.remove("banana")    # ["apple", "orange", "banana"]

# pop() - Remove and return element at index
last = fruits.pop()        # "banana", fruits = ["apple", "orange"]
first = fruits.pop(0)      # "apple", fruits = ["orange"]

# del - Remove by index or slice
del fruits[0]              # Remove first element
del fruits[1:3]            # Remove slice

# clear() - Remove all elements
fruits.clear()             # []
```

### Searching & Counting

```python
fruits = ["apple", "banana", "orange", "banana"]

# index() - Find index of first occurrence
apple_idx = fruits.index("apple")     # 0
banana_idx = fruits.index("banana")   # 1

# index() with bounds
second_banana = fruits.index("banana", 2)  # 3 (start from index 2)

# count() - Count occurrences
banana_count = fruits.count("banana") # 2

# Membership testing
has_apple = "apple" in fruits        # True
has_mango = "mango" in fruits        # False
```

### Sorting

```python
numbers = [3, 1, 4, 1, 5, 9, 2]

# sort() - Sort in place
numbers.sort()              # [1, 1, 2, 3, 4, 5, 9]
numbers.sort(reverse=True)  # [9, 6, 5, 4, 3, 2, 1, 1]

# sorted() - Return new sorted list
original = [3, 1, 4]
sorted_nums = sorted(original)  # [1, 3, 4], original unchanged

# Sort with key function
words = ["Apple", "banana", "Cherry"]
words.sort(key=str.lower)   # ["Apple", "banana", "Cherry"]
```

---

## ⚡ List Comprehensions

### Basic Syntax

```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x**2)

# List comprehension
squares = [x**2 for x in range(10)]  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

### With Conditions

```python
# Filter with condition
evens = [x for x in range(10) if x % 2 == 0]  # [0, 2, 4, 6, 8]

# Multiple conditions
filtered = [x for x in range(20) if x % 2 == 0 and x > 10]  # [12, 14, 16, 18]

# Conditional expression
results = [x if x % 2 == 0 else -x for x in range(5)]  # [0, -1, 2, -3, 4]
```

### Nested Comprehensions

```python
# Nested loops
pairs = [(x, y) for x in range(3) for y in range(3)]  # [(0,0), (0,1), (0,2), ...]

# Matrix operations
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flattened = [x for row in matrix for x in row]  # [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Create matrix
identity = [[1 if i == j else 0 for j in range(3)] for i in range(3)]
```

---

## 🔸 Sets - Core Operations

### Creating Sets

```python
# Empty set (not {})
empty_set = set()

# From elements
numbers = {1, 2, 3, 4, 5}
fruits = {"apple", "banana", "orange"}

# From iterables (removes duplicates)
from_list = set([1, 2, 2, 3, 3, 3])  # {1, 2, 3}
from_string = set("hello")            # {'h', 'e', 'l', 'o'}

# Set comprehension
squares = {x**2 for x in range(5)}    # {0, 1, 4, 9, 16}
```

### Adding Elements

```python
fruits = {"apple", "banana"}

# add() - Single element
fruits.add("orange")  # {"apple", "banana", "orange"}

# update() - Multiple elements
fruits.update(["grape", "kiwi"])  # {"apple", "banana", "orange", "grape", "kiwi"}
```

### Removing Elements

```python
fruits = {"apple", "banana", "orange"}

# remove() - Remove element (error if not found)
fruits.remove("banana")  # {"apple", "orange"}

# discard() - Remove element (no error if not found)
fruits.discard("mango")  # No change

# pop() - Remove and return arbitrary element
removed = fruits.pop()   # Removes random element

# clear() - Remove all
fruits.clear()           # set()
```

---

## 🔧 Set Operations

### Mathematical Operations

```python
set_a = {1, 2, 3, 4, 5}
set_b = {4, 5, 6, 7, 8}

# Union - All elements from both sets
union_op = set_a | set_b               # {1, 2, 3, 4, 5, 6, 7, 8}
union_method = set_a.union(set_b)      # Same result

# Intersection - Common elements
intersect_op = set_a & set_b           # {4, 5}
intersect_method = set_a.intersection(set_b)  # Same result

# Difference - Elements in A but not B
diff_op = set_a - set_b                # {1, 2, 3}
diff_method = set_a.difference(set_b)  # Same result

# Symmetric difference - Elements in either set but not both
sym_diff_op = set_a ^ set_b            # {1, 2, 3, 6, 7, 8}
sym_diff_method = set_a.symmetric_difference(set_b)  # Same result
```

### In-Place Operations

```python
set_a = {1, 2, 3}
set_b = {3, 4, 5}

set_a |= set_b  # Union in-place: {1, 2, 3, 4, 5}
set_a &= set_b  # Intersection in-place: {3, 4, 5}
set_a -= set_b  # Difference in-place: set()
set_a ^= set_b  # Symmetric difference in-place: {3}
```

### Set Methods

```python
set_a = {1, 2, 3}
set_b = {2, 3, 4}

# Subset/Superset
is_subset = set_a <= set_b        # False
is_superset = set_a >= {1, 2}     # True

# Proper subset/superset
is_proper_subset = set_a < {1, 2, 3, 4}    # True
is_proper_superset = set_a > {2}            # True

# Disjoint (no common elements)
are_disjoint = set_a.isdisjoint({5, 6})     # True

# Copy
set_copy = set_a.copy()           # {1, 2, 3}
```

---

## 🔄 Converting Between Lists and Sets

### List to Set

```python
# Remove duplicates
numbers = [1, 2, 2, 3, 3, 3, 4]
unique = set(numbers)             # {1, 2, 3, 4}

# Preserve order (Python 3.7+)
unique_ordered = list(dict.fromkeys(numbers))  # [1, 2, 3, 4]
```

### Set to List

```python
fruits = {"apple", "banana", "orange"}
fruit_list = list(fruits)         # ["apple", "banana", "orange"] (order may vary)

# Sort when converting
sorted_fruits = sorted(fruits)    # ["apple", "banana", "orange"]
```

### Practical Conversions

```python
# Find unique elements across lists
list1 = [1, 2, 3]
list2 = [2, 3, 4]
unique_elements = list(set(list1 + list2))  # [1, 2, 3, 4]

# Remove specific values
numbers = [1, 2, 3, 2, 4, 2, 5]
to_remove = {2, 4}
filtered = [x for x in numbers if x not in to_remove]  # [1, 3, 5]
```

---

## ⚡ Performance Quick Reference

### When to Use Lists

```python
# ✓ Ordered collections
# ✓ Index-based access: O(1)
# ✓ Allows duplicates
# ✓ Sequential processing
# ✓ Memory efficient for small datasets

numbers = [1, 2, 3, 4, 5]
first = numbers[0]        # Fast O(1)
numbers.append(6)         # Fast O(1) amortized
```

### When to Use Sets

```python
# ✓ Membership testing: O(1) average
# ✓ Remove duplicates automatically
# ✓ Mathematical set operations
# ✓ Unordered unique collections

unique_items = {1, 2, 3, 4, 5}
has_item = 3 in unique_items    # Very fast O(1)
unique_items.add(6)             # Fast O(1)
```

### Common Time Complexities

| Operation | List | Set |
|-----------|------|-----|
| Access by index | O(1) | N/A |
| Membership (x in ...) | O(n) | O(1) |
| Add element | O(1)* | O(1) |
| Remove element | O(n) | O(1) |
| Find min/max | O(n) | N/A |

*O(1) amortized for append, O(n) for insert at arbitrary position

---

## 🐛 Common Mistakes & Fixes

### List Mistakes

```python
# Wrong: Modifying list while iterating
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    if num % 2 == 0:
        numbers.remove(num)  # Skips elements!

# Right: Iterate over copy or use list comprehension
numbers = [num for num in numbers if num % 2 != 0]  # [1, 3, 5]

# Wrong: Using [] for empty set
empty = {}  # This is a dict!

# Right: Use set() for empty set
empty = set()

# Wrong: Mutable objects as set elements
mutable_set = {[1, 2], [3, 4]}  # TypeError!

# Right: Use tuples for immutable collections
immutable_set = {(1, 2), (3, 4)}  # Works
```

### Best Practices

```python
# Use list comprehensions for simple transformations
squares = [x**2 for x in range(10)]  # Clean and readable

# Use sets for membership testing
valid_colors = {"red", "green", "blue"}
if user_color in valid_colors:  # O(1) lookup
    print("Valid color")

# Chain operations for readability
result = sorted(list(set(numbers)))  # Remove duplicates and sort

# Prefer built-in functions over manual loops
total = sum(numbers)              # Better than manual loop
maximum = max(numbers)            # Better than manual search
minimum = min(numbers)            # Better than manual search
```

---

## 🔍 Useful Built-in Functions

### List Functions

```python
numbers = [3, 1, 4, 1, 5]

len(numbers)          # 5 (length)
sum(numbers)          # 14 (sum of elements)
max(numbers)          # 5 (maximum value)
min(numbers)          # 1 (minimum value)
any(numbers)          # True (any truthy elements)
all(numbers)          # True (all truthy elements)

# With key functions
max(words, key=len)   # Longest word
sorted(numbers, reverse=True)  # Sort descending
```

### Set Functions

```python
set_a = {1, 2, 3}
len(set_a)           # 3 (number of elements)
```

---

## 📚 Quick Examples

### Data Processing Pipeline

```python
# Process a list of numbers
data = [1, 2, 2, 3, 3, 3, 4, 5, 5]

# Remove duplicates, filter, transform
processed = [x**2 for x in list(set(data)) if x > 2]  # [9, 16, 25]
```

### Text Processing

```python
text = "the quick brown fox jumps over the lazy dog"
words = text.split()
unique_words = set(words)  # Remove duplicates
word_lengths = [len(word) for word in words]  # List comprehension
```

### Set-Based Filtering

```python
students = {"Alice", "Bob", "Charlie", "Diana"}
passed = {"Alice", "Charlie", "Eve"}

# Find who passed
passed_students = students & passed  # {"Alice", "Charlie"}

# Find who didn't take the test
no_show = students - passed          # {"Bob", "Diana"}

# Find external participants
external = passed - students         # {"Eve"}
```

---

**Cheatsheet Version**: 1.0  
**Last Updated**: February 2026  
**Pages**: 1
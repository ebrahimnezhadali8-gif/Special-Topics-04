# Tutorial 0: Python Type Hints Basics

## 🎯 Learning Objectives

By the end of this tutorial, you will:

1. **Understand Type Hints**: Learn why and how to use Python's type annotations
2. **Use Basic Types**: Work with simple type hints for variables and functions
3. **Apply to Lists**: Use type hints with collections
4. **Write Clear Code**: Make your code easier to understand and debug

---

## 📋 Prerequisites

- Python 3.8+ installed
- Basic Python knowledge (variables, functions, lists)

---

## 🔍 Why Use Type Hints?

### The Problem: Unclear Code

```python
# Without type hints - what should we pass?
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

# What if someone passes wrong data?
result = calculate_average([10, 20, 30])  # Works
result = calculate_average("hello")       # Fails!
```

### The Solution: Clear Expectations

```python
# With type hints - everyone knows what to expect
def calculate_average(numbers: list) -> float:
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

# Now it's clear: pass a list, get back a float
result = calculate_average([10, 20, 30])  # ✅ Clear intent
```

---

## 🏗️ Basic Type Hints

### 1. Simple Variable Types

**Type hints tell others what type of data a variable should hold.**

```python
# Basic type hints
name: str = "Alice"
age: int = 25
height: float = 5.7
is_student: bool = True
```

**Example with type hints:**
```python
student_name: str = "Bob"
student_age: int = 20
student_gpa: float = 3.5
is_graduated: bool = False
```

### 2. Function Type Hints

**Type hints on functions show what goes in and what comes out.**

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add_numbers(a: int, b: int) -> int:
    return a + b
```

**Example with type hints:**
```python
def calculate_area(length: float, width: float) -> float:
    return length * width
```

### 3. List Type Hints

**Show that a variable should be a list of specific types.**

```python
from typing import List

names: List[str] = ["Alice", "Bob", "Charlie"]
scores: List[int] = [85, 92, 78]
```

**Example with type hints:**
```python
from typing import List

student_names: List[str] = ["Anna", "Ben", "Cathy"]
test_scores: List[int] = [88, 95, 77]
```

---

## 📝 More Examples

### Complete Variable Examples

```python
# Variables with type hints
student_name: str = "Maria"
student_id: int = 12345
average_score: float = 87.5
is_enrolled: bool = True
```

### Complete Function Examples

```python
def check_passed(score: int, passing_score: int) -> bool:
    return score >= passing_score

# Test the function
print(check_passed(85, 70))  # Should return True
print(check_passed(65, 70))  # Should return False
```

### Complete List Examples

```python
from typing import List

# Lists with proper type hints
student_names: List[str] = ["John", "Jane", "Mike"]
exam_scores: List[int] = [92, 88, 95]
```

---

## 🏁 Summary

Type hints help you write clearer, more reliable code by:

1. **Making Intent Clear**: Others know what types to expect
2. **Catching Errors**: IDEs can warn about type mismatches
3. **Better Documentation**: Code explains itself
4. **Easier Maintenance**: Changes are safer to make

**Start simple**: Add type hints to your variables and function parameters. You'll get better at it with practice!

---

**Tutorial Version**: 1.0
**Last Updated**: February 2026
**Estimated Completion Time**: 15-20 minutes

### 1. Union Types

```python
from typing import Union, List

# A value can be one of several types
def process_data(data: Union[str, int, float]) -> str:
    """Process different types of data."""
    if isinstance(data, str):
        return f"String: {data.upper()}"
    elif isinstance(data, (int, float)):
        return f"Number: {data * 2}"
    else:
        return "Unknown type"

# List that can contain mixed types
mixed_list: List[Union[str, int]] = ["hello", 42, "world", 100]
```

### 2. Generic Types

```python
from typing import TypeVar, Generic, List

T = TypeVar('T')  # Type variable

class Stack(Generic[T]):
    """A simple stack implementation with type safety."""

    def __init__(self) -> None:
        self.items: List[T] = []

    def push(self, item: T) -> None:
        """Add an item to the stack."""
        self.items.append(item)

    def pop(self) -> T:
        """Remove and return the top item."""
        if not self.items:
            raise IndexError("Stack is empty")
        return self.items.pop()

    def is_empty(self) -> bool:
        """Check if stack is empty."""
        return len(self.items) == 0

# Usage
string_stack: Stack[str] = Stack()
string_stack.push("hello")
string_stack.push("world")

int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
```

### 3. Callable Types

```python
from typing import Callable, List

def apply_operation(numbers: List[int], operation: Callable[[int], int]) -> List[int]:
    """Apply a function to each number in the list."""
    return [operation(num) for num in numbers]

def double(x: int) -> int:
    return x * 2

def square(x: int) -> int:
    return x ** 2

# Usage
numbers = [1, 2, 3, 4, 5]
doubled = apply_operation(numbers, double)    # [2, 4, 6, 8, 10]
squared = apply_operation(numbers, square)    # [1, 4, 9, 16, 25]
```

---

## 📝 Practical Examples

### Example 1: Type-Safe Data Processing

```python
from typing import List, Dict, Optional, Union
import statistics

def analyze_scores(scores: List[Union[int, float]]) -> Dict[str, float]:
    """
    Analyze a list of scores and return statistics.

    Args:
        scores: List of numeric scores

    Returns:
        Dictionary containing statistical measures

    Raises:
        ValueError: If scores list is empty
    """
    if not scores:
        raise ValueError("Scores list cannot be empty")

    # Convert to float for consistency
    float_scores: List[float] = [float(score) for score in scores]

    return {
        'count': len(float_scores),
        'mean': statistics.mean(float_scores),
        'median': statistics.median(float_scores),
        'min': min(float_scores),
        'max': max(float_scores),
        'std_dev': statistics.stdev(float_scores) if len(float_scores) > 1 else 0.0
    }

# Usage
student_scores = [85, 92, 78, 96, 88]
result = analyze_scores(student_scores)
print(f"Average score: {result['mean']:.2f}")
```

### Example 2: Generic Data Structures

```python
from typing import TypeVar, Generic, List, Optional

T = TypeVar('T')

class Queue(Generic[T]):
    """A simple queue implementation with type safety."""

    def __init__(self) -> None:
        self._items: List[T] = []

    def enqueue(self, item: T) -> None:
        """Add an item to the back of the queue."""
        self._items.append(item)

    def dequeue(self) -> T:
        """Remove and return the front item."""
        if self.is_empty():
            raise IndexError("Queue is empty")
        return self._items.pop(0)

    def peek(self) -> Optional[T]:
        """Return the front item without removing it."""
        return self._items[0] if not self.is_empty() else None

    def is_empty(self) -> bool:
        """Check if the queue is empty."""
        return len(self._items) == 0

    def size(self) -> int:
        """Return the number of items in the queue."""
        return len(self._items)

# Usage
string_queue: Queue[str] = Queue()
string_queue.enqueue("first")
string_queue.enqueue("second")

int_queue: Queue[int] = Queue()
int_queue.enqueue(1)
int_queue.enqueue(2)
```

---

## 🧪 Testing Type-Safe Code

### 1. Unit Tests with Type Checking

```python
import pytest
from typing import List
from my_module import analyze_scores, Queue

class TestAnalyzeScores:
    """Test cases for analyze_scores function."""

    def test_valid_scores(self) -> None:
        """Test with valid numeric scores."""
        scores = [85, 92, 78, 96, 88]
        result = analyze_scores(scores)

        assert isinstance(result, dict)
        assert result['count'] == 5
        assert result['mean'] == 87.8
        assert result['min'] == 78
        assert result['max'] == 96

    def test_empty_scores_raises_error(self) -> None:
        """Test that empty scores list raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            analyze_scores([])

    def test_single_score(self) -> None:
        """Test with single score."""
        result = analyze_scores([85])
        assert result['count'] == 1
        assert result['mean'] == 85
        assert result['std_dev'] == 0.0

class TestQueue:
    """Test cases for Queue class."""

    def test_queue_operations(self) -> None:
        """Test basic queue operations."""
        queue: Queue[str] = Queue()

        assert queue.is_empty()
        assert queue.size() == 0

        queue.enqueue("first")
        assert not queue.is_empty()
        assert queue.size() == 1
        assert queue.peek() == "first"

        queue.enqueue("second")
        assert queue.size() == 2
        assert queue.peek() == "first"

        first = queue.dequeue()
        assert first == "first"
        assert queue.size() == 1
        assert queue.peek() == "second"
```

---

## 📚 Best Practices

### 1. Start Simple
- Begin with basic type annotations for function parameters and return types
- Gradually add more complex types as you become comfortable

### 2. Use Type Comments for Older Python
```python
# For Python < 3.5
def greet(name):
    # type: (str) -> str
    return f"Hello, {name}!"
```

### 3. Leverage IDE Support
- Use VS Code, PyCharm, or similar IDEs with type checking enabled
- Enable auto-completion and inline error detection

### 4. Combine with Documentation
```python
def calculate_discount(price: float, discount_percent: float) -> float:
    """
    Calculate discounted price.

    Args:
        price: Original price (must be positive)
        discount_percent: Discount percentage (0-100)

    Returns:
        Final price after discount

    Raises:
        ValueError: If inputs are invalid
    """
    if price < 0:
        raise ValueError("Price must be positive")
    if not 0 <= discount_percent <= 100:
        raise ValueError("Discount percent must be between 0 and 100")

    discount_amount = price * (discount_percent / 100)
    return price - discount_amount
```

### 5. Common Patterns
- Use `Optional[T]` instead of `Union[T, None]`
- Prefer `List[T]` over `list` for clarity
- Use descriptive variable names that indicate type expectations

---

## 🔗 Additional Resources

- [Python Typing Documentation](https://docs.python.org/3/library/typing.html)
- [Real Python: Type Checking](https://realpython.com/python-type-checking/)
- [PEP 484 - Type Hints](https://www.python.org/dev/peps/pep-0484/)

---

## 🏁 Summary

Type hints help you write clearer, more reliable code by:

1. **Making Intent Clear**: Others know what types to expect
2. **Catching Errors**: IDEs can warn about type mismatches
3. **Better Documentation**: Code explains itself
4. **Easier Maintenance**: Changes are safer to make

**Start simple**: Add type hints to your variables and function parameters. You'll get better at it with practice!

---

**Tutorial Version**: 1.0
**Last Updated**: February 2026
**Estimated Completion Time**: 15-20 minutes
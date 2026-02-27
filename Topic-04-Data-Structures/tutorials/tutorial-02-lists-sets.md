# Tutorial 2: Lists and Sets

**Section**: 7 - Lists and Sets (30 min)
**Level**: Beginner
**Prerequisites**: Tutorial 1 (Arrays and Matrices)

---

## 📋 Learning Objectives

By the end of this tutorial, you will be able to:

1. **Create and use lists** (ordered collections)
2. **Create and use sets** (unique collections)
3. **Perform basic operations** on lists and sets

---

## 📚 Table of Contents

1. [What are Lists?](#what-are-lists)
2. [Using Lists](#using-lists)
3. [What are Sets?](#what-are-sets)
4. [Using Sets](#using-sets)

---

## 🔸 What are Lists?

Lists are ordered collections that can hold multiple items. Lists can contain different types of data.

### Creating Lists

```python
# Empty list
empty = []

# List with numbers
numbers = [1, 2, 3, 4, 5]

# List with text
fruits = ["apple", "banana", "orange"]
```

### Using Lists

```python
# Print the list
print(numbers)  # [1, 2, 3, 4, 5]

# Count items in list
print(len(numbers))  # 5
```

---

## 🔸 Using Lists

### Accessing List Elements

```python
numbers = [10, 20, 30, 40, 50]

# Get first element
first = numbers[0]  # 10

# Get last element
last = numbers[4]  # 50

# Get second element
second = numbers[1]  # 20
```

### Adding to Lists

```python
numbers = [1, 2, 3]

# Add to end
numbers.append(4)
print(numbers)  # [1, 2, 3, 4]

# Add at specific position
numbers.insert(1, 10)
print(numbers)  # [1, 10, 2, 3, 4]
```

### Changing List Elements

```python
numbers = [1, 2, 3, 4, 5]

# Change first element
numbers[0] = 100
print(numbers)  # [100, 2, 3, 4, 5]
```

---

## 🔸 What are Sets?

Sets are collections that contain unique items. Sets do not allow duplicates and are unordered.

### Creating Sets

```python
# Empty set
empty = set()

# Set with elements
numbers = {1, 2, 3, 4, 5}

# Set with text
colors = {"red", "green", "blue"}
```

### Using Sets

```python
# Print the set
print(numbers)  # {1, 2, 3, 4, 5}

# Count items in set
print(len(numbers))  # 5

# Check if item is in set
print(3 in numbers)  # True
print(10 in numbers)  # False
```

### Adding to Sets

```python
colors = {"red", "green", "blue"}

# Add one item
colors.add("yellow")
print(colors)  # {'red', 'green', 'blue', 'yellow'}

# Add multiple items
colors.update(["purple", "orange"])
print(colors)  # {'red', 'green', 'blue', 'yellow', 'purple', 'orange'}
```

---

## 🎯 Practice Exercises

### Exercise 1: List Basics
Create a list with numbers 1-5 and print the third element.

### Exercise 2: List Modification
Start with list `[1, 2, 3]`, add 4 to the end, then change the second element to 10.

### Exercise 3: Set Basics
Create a set with colors "red", "blue", "green" and check if "yellow" is in the set.

### Exercise 4: Set Operations
Create a set with numbers 1, 2, 3, then add 4 and 5 to it.

---

## 🎯 Key Takeaways

1. **Lists** are ordered collections that can have duplicates
2. **Sets** are unordered collections with unique items only
3. Use **lists** when you need order and duplicates
4. Use **sets** when you need unique items and fast checking

---

**Tutorial Version**: 2.0 - Simplified
**Last Updated**: February 2026
**Estimated Reading Time**: 15 minutes
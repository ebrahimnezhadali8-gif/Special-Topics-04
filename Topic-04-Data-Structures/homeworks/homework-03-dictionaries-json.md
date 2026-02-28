# Homework 3: Dictionaries and JSON

**Section**: 8 - Dictionaries and JSON (30 min)
**Level**: Beginner
**Prerequisites**: Tutorial 3 (Dictionaries and JSON)

---

## 🎯 Assignment Objectives

By completing this homework, you will:

1. **Create and use dictionaries** with basic operations
2. **Work with JSON data** conversion
3. **Access dictionary data** by keys

---

## 📋 Assignment Structure

Complete 3 simple tasks:

1. [Task 1: Dictionary Basics](#task-1-dictionary-basics)
2. [Task 2: Dictionary Operations](#task-2-dictionary-operations)
3. [Task 3: JSON Practice](#task-3-json-practice)

---

## 🏃 Task 1: Dictionary Basics

**Objective:** Create and access basic dictionaries.

Create a Python file `homework_03_dict.py` with the following functions:

### Function 1: Create Person Dictionary
Write a function that creates a dictionary with name and age.

```python
def create_person_dict():
    # TODO: Create {"name": "Alice", "age": 25}
    pass
```

### Function 2: Get Name
Write a function that returns the name from a person dictionary.

```python
def get_person_name(person):
    # TODO: Return the name value from person dict
    pass
```

### Function 3: Get Age
Write a function that returns the age from a person dictionary.

```python
def get_person_age(person):
    # TODO: Return the age value from person dict
    pass
```

---

## 🏃 Task 2: Dictionary Operations

**Objective:** Modify and work with dictionary data.

### Function 4: Add City
Write a function that adds a city to a person dictionary.

```python
def add_city(person):
    # TODO: Add "city": "New York" to person dict
    pass
```

### Function 5: Change Age
Write a function that changes the age in a person dictionary.

```python
def change_age(person, new_age):
    # TODO: Change the age to new_age
    pass
```

### Function 6: Check Key
Write a function that checks if "city" key exists in a dictionary.

```python
def has_city_key(person):
    # TODO: Return True if "city" key exists
    pass
```

---

## 🏃 Task 3: JSON Practice

**Objective:** Convert between dictionaries and JSON.

### Function 7: Dict to JSON
Write a function that converts a dictionary to JSON string.

```python
import json

def dict_to_json(data):
    # TODO: Convert dictionary to JSON string
    pass
```

### Function 8: JSON to Dict
Write a function that converts a JSON string to dictionary.

```python
import json

def json_to_dict(json_str):
    # TODO: Convert JSON string to dictionary
    pass
```

### Function 9: Save and Load
Write functions that save a dictionary to JSON file and load it back.

```python
import json

def save_to_json(data, filename):
    # TODO: Save dictionary to JSON file
    pass

def load_from_json(filename):
    # TODO: Load dictionary from JSON file
    pass
```

---

## 📝 Submission Instructions

1. Create `homework_03_dict.py` with all 9 functions
2. Test each function with the provided examples
3. Submit your Python file

---

## ✅ Grading Criteria

- **Function 1-3:** Dictionary basics (30 points)
- **Function 4-6:** Dictionary operations (30 points)
- **Function 7-9:** JSON practice (30 points)
- **Code quality:** Clear, readable code (10 points)

**Total: 100 points**

---

**Homework Version**: 3.0 - Simplified
**Last Updated**: February 2026
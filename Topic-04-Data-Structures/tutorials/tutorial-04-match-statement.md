# Tutorial 4: Match Statement

**Section**: 9 - Match Statement (20 min)
**Level**: Beginner
**Prerequisites**: Basic Python knowledge (variables, if statements)

---

## 📋 Learning Objectives

By the end of this tutorial, you will be able to:

1. **Use the match statement** for simple value matching
2. **Replace basic if-elif chains** with match
3. **Handle default cases** with match

---

## 📚 Table of Contents

1. [What is Match?](#what-is-match)
2. [Basic Match Usage](#basic-match-usage)
3. [Match with Default Case](#match-with-default-case)

---

## 🔸 What is Match?

The match statement is a new way to check values in Python (available in Python 3.10+). It works like a switch statement in other languages.

### Basic Match Structure

```python
match value:
    case pattern1:
        # code to run
    case pattern2:
        # code to run
    case _:
        # default case
```

---

## 🔸 Basic Match Usage

### Simple Value Matching

```python
# Check a number
number = 2

match number:
    case 1:
        print("One")
    case 2:
        print("Two")
    case 3:
        print("Three")

# Output: Two
```

### Match with Strings

```python
# Check a color
color = "red"

match color:
    case "red":
        print("Stop")
    case "yellow":
        print("Wait")
    case "green":
        print("Go")

# Output: Stop
```

### Comparing with If-Elif

```python
# Using if-elif
day = "monday"

if day == "monday":
    print("Start of work week")
elif day == "friday":
    print("End of work week")
elif day == "saturday":
    print("Weekend")
elif day == "sunday":
    print("Weekend")

# Same thing with match
match day:
    case "monday":
        print("Start of work week")
    case "friday":
        print("End of work week")
    case "saturday":
        print("Weekend")
    case "sunday":
        print("Weekend")
```

---

## 🔸 Match with Default Case

### Using Underscore for Default

```python
# Check any number
value = 5

match value:
    case 1:
        print("One")
    case 2:
        print("Two")
    case _:  # This matches anything else
        print("Other number")

# Output: Other number
```

### Default Case for Strings

```python
# Check fruit type
fruit = "apple"

match fruit:
    case "apple":
        print("Red fruit")
    case "banana":
        print("Yellow fruit")
    case _:  # Default case
        print("Other fruit")

# Output: Red fruit
```

### Match with Variables

```python
# Match against variable values
x = 10
y = 20

match x:
    case y:  # This compares x with the value of y
        print("x equals y")
    case _:
        print("x does not equal y")

# Output: x does not equal y
```

---

## 🎯 Practice Exercises

### Exercise 1: Number Matching
Create a match statement that checks if a number is 1, 2, or 3, and prints the word.

### Exercise 2: Day of Week
Use match to check a day ("monday", "tuesday", "wednesday") and print if it's a weekday.

### Exercise 3: Default Case
Create a match statement for colors that handles "red", "blue", and uses default for others.

### Exercise 4: Simple Calculator
Use match to check an operation ("add", "subtract") and print what it does.

---

## 🎯 Key Takeaways

1. **Match statement** checks values against patterns
2. **Case** defines what value to match
3. **Underscore (_)** is the default case for anything else
4. **Match** can replace simple if-elif chains
5. **Use match** for clear, readable value checking

---

**Tutorial Version**: 1.0 - Basic Match
**Last Updated**: February 2026
**Estimated Reading Time**: 10 minutes
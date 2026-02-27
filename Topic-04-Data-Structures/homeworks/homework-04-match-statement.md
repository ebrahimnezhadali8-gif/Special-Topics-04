# Homework 4: Match Statement

**Section**: 9 - Match Statement (25 min)
**Level**: Beginner
**Prerequisites**: Tutorial 4 (Match Statement)

---

## 🎯 Assignment Objectives

By completing this homework, you will:

1. **Use match statement** for value checking
2. **Replace if-elif chains** with match
3. **Handle default cases** in match

---

## 📋 Assignment Structure

Complete 3 simple tasks:

1. [Task 1: Basic Match](#task-1-basic-match)
2. [Task 2: Match with Default](#task-2-match-with-default)
3. [Task 3: Match Applications](#task-3-match-applications)

---

## 🏃 Task 1: Basic Match

**Objective:** Use match for simple value matching.

Create a Python file `homework_04_match.py` with the following functions:

### Function 1: Number to Word
Write a function that converts numbers 1, 2, 3 to words using match.

```python
def number_to_word(num):
    # TODO: Use match to return "one", "two", "three"
    match num:
        case 1:
            return "one"
        case 2:
            return "two"
        case 3:
            return "three"
```

### Function 2: Color to Description
Write a function that describes colors using match.

```python
def describe_color(color):
    # TODO: Use match for "red", "blue", "green"
    match color:
        case "red":
            return "hot color"
        case "blue":
            return "cool color"
        case "green":
            return "natural color"
```

### Function 3: Day Type
Write a function that categorizes days using match.

```python
def get_day_type(day):
    # TODO: Use match for "monday", "tuesday", etc.
    match day:
        case "monday":
            return "work day"
        case "tuesday":
            return "work day"
        case "wednesday":
            return "work day"
        case "thursday":
            return "work day"
        case "friday":
            return "work day"
        case "saturday":
            return "weekend"
        case "sunday":
            return "weekend"
```

---

## 🏃 Task 2: Match with Default

**Objective:** Handle default cases in match statements.

### Function 4: Grade Description with Default
Write a function that describes grades with a default case.

```python
def describe_grade(grade):
    # TODO: Use match with default case
    match grade:
        case "A":
            return "excellent"
        case "B":
            return "good"
        case "C":
            return "fair"
        case _:  # Default case
            return "needs improvement"
```

### Function 5: Animal Sound with Default
Write a function that returns animal sounds with default.

```python
def animal_sound(animal):
    # TODO: Match "dog", "cat", "cow" with default
    match animal:
        case "dog":
            return "woof"
        case "cat":
            return "meow"
        case "cow":
            return "moo"
        case _:
            return "unknown sound"
```

### Function 6: Number Range with Default
Write a function that categorizes numbers with default.

```python
def categorize_number(num):
    # TODO: Match specific numbers with default
    match num:
        case 1:
            return "first"
        case 2:
            return "second"
        case 3:
            return "third"
        case _:
            return "other number"
```

---

## 🏃 Task 3: Match Applications

**Objective:** Apply match in practical scenarios.

### Function 7: Calculator Operation
Write a function that performs simple calculator operations.

```python
def calculator(op, a, b):
    # TODO: Match operation and return result
    match op:
        case "add":
            return a + b
        case "subtract":
            return a - b
        case "multiply":
            return a * b
        case "divide":
            return a / b if b != 0 else "error"
```

### Function 8: Weather Activity
Write a function that suggests activities based on weather.

```python
def weather_activity(weather):
    # TODO: Match weather conditions
    match weather:
        case "sunny":
            return "go to park"
        case "rainy":
            return "stay inside"
        case "cloudy":
            return "go for walk"
        case _:
            return "check weather app"
```

### Function 9: Menu Choice
Write a function that handles menu selections.

```python
def handle_menu(choice):
    # TODO: Match menu choices 1-4 with default
    match choice:
        case 1:
            return "view profile"
        case 2:
            return "edit settings"
        case 3:
            return "get help"
        case 4:
            return "exit program"
        case _:
            return "invalid choice"
```

---

## 📝 Submission Instructions

1. Create `homework_04_match.py` with all 9 functions
2. Test each function with the provided examples
3. Submit your Python file

---

## ✅ Grading Criteria

- **Function 1-3:** Basic match (30 points)
- **Function 4-6:** Match with default (30 points)
- **Function 7-9:** Match applications (30 points)
- **Code quality:** Clear, readable code (10 points)

**Total: 100 points**

---

**Homework Version**: 4.0 - Simplified
**Last Updated**: February 2026
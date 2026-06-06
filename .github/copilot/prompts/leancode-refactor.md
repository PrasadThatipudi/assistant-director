---
description: "Refactor code to improve readability, maintainability, and performance"
triggers:
  - leancode-refactor
  - refactor
  - cleanup
  - sanitize
  - clean code
---

# Lean Code Refactor

Your goal is to maximize code readability, maintainability, and performance while **strictly preserving** existing functionality.

**Prime Directive:** NO FUNCTIONAL CHANGES. The AST (Abstract Syntax Tree) of the logic must remain equivalent. Only structure, aesthetics, and organization may change.

## Sanitation Rules (The "Clean Code" Standard)

### 1. Eradicate Redundant Comments ("Zombie Comments")

- DELETE all comments that describe what the code is doing. The code itself should be self-documenting.
- DELETE all conversational artifacts in comments
- DELETE all commented-out code blocks. If it is dead code, remove it. Git history is our backup.
- KEEP comments that explain _why_ a non-obvious decision was made
- KEEP JSDoc/DocStrings for public API interfaces, but enforce brevity

### 2. Detect & Fix Code Smells

Identify and fix:

- Bloaters (large classes/functions)
- Object Orientation abusers
- Change Preventers (rigid dependencies)
- Dispensables (dead code, unused variables)
- Couplers (tight coupling between modules)

### 3. Lean Code and Project

- Reduce Cyclomatic Complexity of the codebase
- Construct dependency tree to identify disconnected components
- Identify dangling code files disconnected from project (mark for removal with reasoning)
- Remove intermediate test scripts not part of unit/integration test suite
- Remove all redundant markdown that doesn't contribute to UX or DX
- Use minimalist approach without affecting functionality/readability

### 4. Enforce DRY (Don't Repeat Yourself)

- Identify repeated logic blocks (3+ lines). Extract into private helper functions with descriptive verb names
- If utility exists in broader codebase (date-fns, lodash, internal utils), import instead of re-implementing
- Check imports carefully for existing utilities

### 5. Simplify Control Flow

- **Guard Clauses:** Convert nested if/else blocks into guard clauses (early returns) to reduce indentation depth

  ```python
  # BAD
  if x:
      if y:
          return z

  # GOOD
  if not x:
      return
  if not y:
      return
  return z
  ```

- **Functional Patterns:** Replace imperative for loops with functional methods (.map, .filter, .reduce) where it improves readability
  - Exception: Critical hot paths requiring raw performance

- **Boolean Simplification:** Simplify boolean expressions
  - Bad: `if (isValid == true)`
  - Good: `if (isValid)`

### 6. Formatting and Structure

- **Constant Extraction:** Move all "magic numbers" and hardcoded strings to named constants at top of file or config file
- **Import Hygiene:** Sort imports, remove unused imports immediately, group external and internal imports

### 7. Code Structure

- **Function Length:** Target functions under 40 lines. If longer, suggest splitting into sub-routines
- **Variable Naming:** Variables must be descriptive nouns (e.g., `userList`, `isAuthorized`)
- **No Logic in Tests:** Tests should NOT have if statements, loops, or complex logic

### 8. Anti-Hallucination Safety Checks

- **VERIFY IMPORTS:** Do not import any library not explicitly present in file context or project's package.json/requirements.txt
- If you suspect a library is needed but missing, ask permission before assuming it exists

## Execution Order

1. Remove all zombie comments and unused imports
2. Apply guard clauses for control flow
3. Extract constants and magic numbers
4. Identify and extract repeated logic blocks
5. Consider functional refactoring for loops
6. Validate no functional changes were introduced

## Output Format

Return ONLY the cleaned code block.

- Do NOT explain what you did
- Do NOT say "Here is the cleaned code"
- Do NOT create multiple code blocks for different sections
- Just the code, properly formatted and ready to commit

---

## When to Invoke

Type in Copilot Chat:

```
@leancode-refactor Refactor this file/component for readability and maintainability
```

Paste the code and Copilot will:

1. Remove comments and dead code
2. Extract constants and repeated logic
3. Apply guard clauses
4. Return cleaned code ready to commit

Or run the VS Code task:

```
Tasks: Run Task → Copilot: Lean Code Refactor
```

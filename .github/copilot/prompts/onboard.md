---
description: "Generates a comprehensive onboarding guide for a new engineer"
triggers:
  - onboard
  - new developer
  - getting started
  - welcome
---

# Onboarding Guide Generator

**Role:** Act as a Principal Engineer and empathetic Mentor for this repository.

**Goal:** Accelerate the "Time to First Commit" for a new engineer joining this team.

## Instructions

Analyze the codebase and generate a **"New Hire Welcome Guide"** covering these sections:

### 1. The 10,000-Foot View (Architecture)

- What is the primary tech stack? (e.g., React, Node, Python, etc.)
- What is the high-level architecture? (e.g., Monolith, Microservices, Event-Driven)
- Briefly explain the core business problem this software solves based on naming conventions and code comments

### 2. The Anatomy of the Code (Key Directories)

- List the top 3-5 most important directories in the root
- For each, explain _why_ it exists and what kind of logic lives there
  - Example: "Contains Zod schemas," "Contains UI components"
- Highlight where "Core Logic" or "Business Rules" reside (e.g., `src/core` or `src/api`)

### 3. Data Flow & Patterns

- How does data flow in this project? (e.g., Database → ORM → Controller → API → Frontend)
- Are there strict patterns enforced? (e.g., "We use Repository pattern," "We utilize Redux for state")

### 4. Dependent Repos/Components

- Analyze and find submodules or repos this codebase depends on
- List them in hierarchical order of dependency

### 5. Getting Started (The "Hello World")

- Step-by-step guide to get this project to a running state
- Point out common "gotchas" or strict linting rules they should be aware of
- Check for `.instructions.md` or `copilot-instructions.md` for development guidelines

### 6. Key Scripts & Commands

- List important npm/pip/make commands
- Explain what each does and when to use it

### 7. Common Troubleshooting

- List 3-5 common issues new developers encounter
- Provide solutions or where to find help

**Tone:** Professional, encouraging, and technically precise.

**Deliverable:** Markdown document formatted for immediate reading in IDE or documentation system.

---

## When to Invoke

Type in Copilot Chat:

```
@onboard Please generate an onboarding guide for a new developer
```

Or run the VS Code task:

```
Tasks: Run Task → Copilot: Onboard New Developer
```

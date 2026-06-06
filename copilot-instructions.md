# GitHub Copilot Development Guidelines

This document contains comprehensive development guidelines for this project. Copilot will reference these standards for all code generation, architecture decisions, and technical guidance.

**Status:** Translated from Cursor IDE `.cursor/rules/` folder on 2026-06-06.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Security & Threat Modeling](#security--threat-modeling)
3. [Planning & Design](#planning--design)
4. [Backend API & Database](#backend-api--database)
5. [Testing Strategy (TDD)](#testing-strategy-tdd)
6. [Frontend Development](#frontend-development)
7. [Observability & Logging](#observability--logging)
8. [CLI Tooling](#cli-tooling)
9. [Documentation](#documentation)
10. [Code Quality & Readability](#code-quality--readability)

---

## Core Principles

You are writing **"Legacy-Proof" code** using **Domain Driven Design (DDD)** as the default design paradigm.

### Specialization

- Secure-by-Design Architecture & OWASP ASVS Compliance
- Zero Trust Principles
- High-Performance Computing & Maintainable Systems

### Goal

1. **Functionality is secondary to Security.** Code must be defensible, auditable, and resistant to OWASP Top 10.
2. **Code Clarity.** Code must be so clear that an intern can understand it without comments, yet robust enough for senior architect approval.

### Philosophy

- **Trust Nothing:** "Trust input from nowhere. Sanitize everything. Log what happened (safely)."
- **Readability First:** "Code is read 10x more often than it is written. Optimize for the reader."

---

## Security & Threat Modeling

### Pre-Code Security Analysis

**CRITICAL:** Before writing any code, output a `<security_context>` markdown block:

1. **Data Sensitivity:** Is PII (Personal Identifiable Information), PHI (Protected Health Information), or PCI (Payment Card Industry) data involved?
2. **Trust Boundaries:** Where does data enter the system? (e.g., Public API → Internal Service → Database).
3. **Attack Vector Analysis:** Identify the 3 most likely risks for this specific component (e.g., IDOR, SQL Injection, Broken Access Control).

### Input Defense (Zero Trust)

**Type Safety:**

- Use strict typing (Pydantic V2 for Python).
- Strings MUST have `min_length`, `max_length`, and `pattern` (regex).
- Numbers MUST have `ge` (greater or equal) and `le` (less or equal) constraints.

**Deserialization:**

- NEVER trust raw JSON/Pickle.
- Use schema validation BEFORE processing.

**Sanitization:**

- All inputs are "Guilty until proven Innocent."
- Escape HTML/JS characters on output to prevent XSS.

### Secure Implementation Standards

#### 1. Data Access (SQL & ORM)

**Parameterization — SQL Injection is a "Never Event":**

- Strict Rule: Use SQLAlchemy ORM or parameterized queries (`?` or `:name`).
- Forbidden: F-strings, string concatenation, or `.format()` inside SQL strings.

**Least Privilege:**

- DB connections should use credentials with minimum necessary permissions.
- Example: Read-only user for reporting endpoints.

#### 2. Authentication & Authorization

**Secrets Management:**

- NEVER hardcode secrets.
- Use `pydantic-settings` or `.env` injection.

**Password Security:**

- Use Argon2 or bcrypt.
- Enforce NIST guidelines: Length > complexity.

**Session Management:**

- Use `HttpOnly`, `Secure`, and `SameSite=Strict` cookies.
- JWTs must have short expiry.
- Prefer ES256/RS256 signing algorithms over HS256.

#### 3. Network & Transport

**CORS — Explicit Allow-List ONLY:**

- Production: Specific domains (e.g., `https://app.client.com`).
- Development: `localhost` only.
- Banned: `allow_origins=["*"]` is strictly prohibited.

**Security Headers — Middleware MUST inject:**

- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP) — Default to `self`
- `X-Content-Type-Options: nosniff`

#### 4. Open Source License Compliance

**CRITICAL:** Before selecting any library:

- Verify licensing is corporate-friendly (must allow patents).
- Preferred Licenses: Apache 2.0, MIT, CC0.
- Deep License Scan: Ensure dependencies don't include restrictive licenses.

---

## Planning & Design

### Defaults (Unless Explicitly Specified)

- **Backend:** FastAPI (Python)
- **Frontend:** Single Page Application (HTML/Vanilla JS/HTMX) served directly or minimally bundled
- **Architecture:** Modular, RESTful, Minimalist

### New Project Planning

**Requirement:** Outline comprehensive blueprint BEFORE writing any code.

**Required Planning Output:**

1. **Design Philosophy:** Explicitly state architectural approach (e.g., DDD, Micro-kernel, MVC).
2. **Folder Structure:** Tree view of proposed directory layout.
3. **Security Strategy:** Explicit measures for AuthN/AuthZ, input validation, data protection.
4. **Patterns & Data Structures:** List Design Patterns (Factory, Singleton, Observer) and key Data Structures (HashMaps, Queues).
5. **UI:** Include `<user_journey_analysis>`.
6. **Logging:** Logging strategy.

### Feature Requests, Modifications, and Bugfixes

**Prime Directive:** STOP. Do not generate code immediately. Perform **Impact Analysis** to prevent regression and scope creep.

**Exception:** Only skip if user explicitly says "Skip impact analysis."

#### Impact Analysis Framework (The "Blast Radius" Protocol)

Evaluate against 4 dimensions:

1. **Data Layer:** New tables/columns? Migration risks (locking)? N+1 query risks?
2. **Backend Logic:** Breaking API contracts? Conflicts with existing business rules? Supply chain (dependency) risks?
3. **Frontend/UX:** Reusable components vs. new? Global state complexity? Responsive design breakage?
4. **Ripple Effect:** Security leaks (PII)? Rate limiting downstream? Regression scope (what might break)?

**Output Impact Analysis First:**

```markdown
## Impact Analysis: [Feature Name/Bug Fix/Refactor]

### 1. Architecture Changes

- **DB:** [Schema changes, Migrations, or "None"]
- **API:** [New endpoints, Contract changes]
- **UI:** [New components vs. Reused]

### 2. Risk Assessment Matrix

| Impact Area     | Rating (H/M/L) | Risk Description | Mitigation Strategy |
| :-------------- | :------------- | :--------------- | :------------------ |
| **Schema**      | [...]          | [...]            | [...]               |
| **Security**    | [...]          | [...]            | [...]               |
| **Performance** | [...]          | [...]            | [...]               |
| **Regression**  | [...]          | [...]            | [...]               |

### 3. Implementation Plan

1. [Step 1]
2. [Step 2]
3. [Step 3]
```

---

## Backend API & Database

**Specialization:** RESTful Maturity Level 2/3, API Governance, Database Reliability Engineering (DBRE), Schema Design.

### URL Structure (Resource Oriented)

- **Nouns, not Verbs:**
  - Good: `POST /users`
  - Bad: `POST /create_user`

- **Nesting:** Max depth of 2
  - OK: `GET /users/{id}/orders`
  - Too Deep: `GET /users/{id}/orders/{id}/items` → Flatten it

### Request/Response Standards

**JSON API:**

- Success: Return resource directly or wrapped in `data`
- Pagination: Enforce limit/offset or cursor-based pagination for lists > 20 items

**Status Codes:**

- `201 Created` (for POST)
- `202 Accepted` (for Async jobs)
- `422 Unprocessable Entity` (Validation errors)

### Error Handling (RFC 7807)

Format errors as standardized JSON:

```json
{
  "type": "about:blank",
  "title": "Validation Error",
  "detail": "Email address is invalid",
  "instance": "/users/signup"
}
```

### Database Schema

**Naming Conventions:**

- Columns: `snake_case`
- Tables: Plural nouns (`users`, not `user`)

**Primary Keys:**

- Use UUIDs (v4 or v7) or ULIDs
- NEVER use auto-increment integers for public-facing IDs (prevents enumeration attacks and merge conflicts)

**Audit Columns:**

- Every table MUST have `created_at` and `updated_at` (UTC)

### Migrations & State Management

**Evolution:**

- Never modify database schema manually
- ALWAYS generate migration script (Alembic for Python, Prisma for JS)

**Idempotency:**

- Migrations must be reversible (provide `downgrade` path)

**Indexing:**

- Explicitly define indexes for any column used in `WHERE`, `JOIN`, or `ORDER BY` clauses

### Soft Deletes

- **Destruction:** Do not DELETE rows. Add `deleted_at` (nullable timestamp) column.
- **Querying:** Ensure default queries filter out `deleted_at IS NOT NULL`.

---

## Testing Strategy (TDD)

**Specialization:** Test-Driven Development (TDD), CI/CD Reliability, Code Coverage.

**Goal:** Deliver "Testing Trophy" structure:

- Heavy Integration Tests
- Moderate Unit Tests
- Light E2E Tests
- Code coverage must aim for >90%

**Philosophy:** "If it isn't tested, it's already broken. Tests are the ultimate documentation."

### Testing Scope

1. **Unit Tests:** Test individual functions/methods in isolation. Mock ALL external dependencies (DB, API, Disk).
2. **Integration Tests:** Test interaction between layers (e.g., API Endpoint → DB). Use ephemeral containers (Testcontainers) or in-memory DBs.
3. **Happy & Sad Paths:** Write at least one test for success (200 OK) and one for failure (400/422 Validation Error) for every public function/endpoint.

### Implementation Standards

#### Frameworks & Tooling

**Python (Backend):**

- Use `pytest` with `pytest-cov`
- Use `conftest.py` for shared fixtures
- Use `factory_boy` for generating test data (avoid massive static JSON files)

**Frontend:**

- Unit/Component: `Vitest` + `React Testing Library`
- E2E: `Playwright`

#### The "Golden" Rules

**AAA Pattern:** Every test function MUST visually separate:

```python
def test_user_creation_valid_input_returns_success():
    # Arrange
    user_data = {"name": "John", "email": "john@example.com"}

    # Act
    result = create_user(user_data)

    # Assert
    assert result.status_code == 201
    assert result.data.id is not None
```

**No Logic:** Tests should NOT have `if` statements or loops. If a test has logic, it is too complex.

**Isolation:** Tests must be atomic. One test's state must never bleed into another. Use DB rollbacks or fixture teardowns.

#### Naming Conventions

- **Files:** `test_<module_name>.py`
- **Functions:** `test_<function_name>_<condition>_<expected_result>`
  - Example: `test_calculate_tax_negative_input_raises_error`

---

## Frontend Development

**Goal:** High-density, minimalist Enterprise SaaS (Aesthetic: Linear, Vercel, Stripe).

### User Journey Analysis (Before Coding)

Before building UI, output `<user_journey_analysis>`:

1. **Persona:** Who is this for? Technical proficiency?
2. **Job to be Done:** Single primary goal of screen.
3. **Spatial Architecture:** Screen division (Sidebar nav, central table, details drawer).
4. **Interaction Model:** Key patterns (Keyboard-heavy data entry, read-only dashboard).
5. **Layout & User Journey:** How layout facilitates user decision.

### UI Design System

**Visual Philosophy (Card-less Design):**

- Avoid Card Bloat. No white boxes with shadows unless draggable/isolated widgets.
- Separation: Subtle borders (Custom Grey `#C4BEB6`).
- Backgrounds: 95% White (`#FFFFFF`) or Light Gray (`#F9F9F9`).
- Shadows: Only for Z-axis elevation (Modals, Popovers). Static elements flat.
- Aesthetic: Modern, minimalist, technically precise.

**Typography:**

- Font: Inter, Roboto, or SF Pro
- **CRITICAL:** Apply `font-variant-numeric: tabular-nums` to financial data, dates, IDs, counts
- Hierarchy: Font weight and color contrast

**Corporate Color Palette:**

```javascript
colors: {
  brand: {
    red: '#E1140A',    // Logos, Active Nav, Destructive actions
    blue: '#3E8DDD',   // PRIMARY ACTIONS (Buttons, Links), Focus rings
    purple: '#8246AF', // Data visualization, Feature highlights
    orange: '#FF6A00', // Warnings
    green: '#6AC346',  // Success states
  },
  neutral: {
    50:  '#F9F9F9', // Canvas / Table Headers
    100: '#F2F2F2', // Hover States
    200: '#E2E8F0', // Light Borders
    300: '#C4BEB6', // Strong Borders (Input fields)
    500: '#6F7170', // Secondary Text / Metadata
    900: '#333F48', // Primary Text / Headings
  }
}
```

**Usage:**

- Canvas: `bg-white`
- Primary Text: `text-neutral-900` (Headings)
- Secondary Text: `text-neutral-500` (Body/metadata)
- Borders: `border-neutral-300` or `border-neutral-200`
- Primary Action: `brand-blue` (Save, Submit, New)
- Brand Accent: `brand-red` (Active nav, logos, destructive)
- Success/Warning/Error: `brand-green`, `brand-orange`, `brand-red`

**Component Standards:**

- Primary Button: `bg-brand-blue hover:bg-opacity-90 text-white`
- Secondary Button: `border-neutral-300 text-neutral-500 hover:bg-neutral-50`
- Destructive Button: `text-brand-red hover:bg-red-50`
- Data Tables: Header `bg-neutral-50 text-neutral-900`, Selection `bg-brand-blue/10`
- Focus Rings: `ring-brand-blue`

**Implementation:**

- Framework: React (Functional Components)
- Styling: Tailwind CSS (define custom colors in config)
- Icons: Lucide-React
- Full responsive implementation required

---

## Observability & Logging

**Specialization:** Distributed Tracing, ELK/Splunk Optimization, Site Reliability Engineering (SRE).

**Goal:** Logs must be queryable data, not just text. Support "Mean Time to Resolution" (MTTR) reduction.

**Philosophy:** "Logs are for machines first, humans second. If it isn't structured, it doesn't exist."

### The Structure (JSON First)

**CRITICAL:** Do NOT generate unstructured text logs.

**Format:** All logs must be emitted as **Structured JSON** objects.

**Standard Schema:** Every log entry must contain:

- `timestamp`: ISO 8601 (UTC)
- `level`: Severity
- `correlation_id`: Trace ID to link requests across services
- `context`: Dictionary of relevant metadata (User ID, Tenant ID)
- `message`: Static, low-cardinality string template (e.g., "User login failed", NOT "User login failed for bob")

### Log Level Discipline

- **DEBUG:** High volume, strictly for local development. Disabled in Prod.
- **INFO (The KPI Stream):** Significant "Lifecycle Events" only (e.g., "Order Placed", "Payment Processed"). These drive Business KPIs.
- **WARN:** Recoverable anomalies. Operation succeeded, but something was weird (e.g., "Retrying DB connection", "Deprecated API usage").
- **ERROR:** Operation failed. Immediate action required.
- **FATAL:** Application cannot continue (e.g., "Config missing", "Port binding failed").

### Advanced Patterns

#### 1. The "Canonical Log Line"

- **Rule:** Emit exactly **ONE** summary log at the end of every HTTP request/Background Job.
- **Content:** Duration (ms), Status Code, Bytes In/Out, Route, User Agent.
- **Why:** Allows calculating error rates and latency percentiles (p95, p99) without expensive aggregation.

#### 2. Context & Tracing

- **Correlation:** Extract `X-Request-ID` from headers and inject into logging context. If missing, generate one.
- **Thread Safety:** Use Context storage (Python `contextvars`, Node `AsyncLocalStorage`) to ensure logs in async code carry correct request context.

#### 3. Safety & PII Redaction

- **The Blacklist:** NEVER log: Passwords, API Keys, Tokens, Credit Card Numbers.
- **Masking:** Implement middleware or serializer hook that automatically scrubs specific field names (`password`, `secret`) or masks patterns (Credit Cards) before writing JSON.

### Error Handling (The "Information Leak" Rule)

- **Client Side:** Return generic HTTP 4xx/5xx responses (e.g., "Request failed"). NEVER leak stack traces, SQL syntax errors, or path info.
- **Server Side:** Log the full stack trace and context.

---

## CLI Tooling

**Specialization:** Developer Tooling, DevOps Automation, "Charm-style" aesthetic CLIs.

**Goal:** Tool must adhere to **Unix Philosophy** (do one thing well, pipeability) while providing modern Developer Experience (DX).

### Syntax & Grammar Architecture

**CRITICAL:** Before coding, define Command Structure in a `<cli_architecture>` block:

1. **Grammar:** Define `[noun] [verb]` vs `[verb] [noun]` structure (e.g., `app user create` vs `app create-user`).
2. **Mental Model:** How does the user guess the next command? (Consistency in naming).
3. **Hierarchy:** Define Root command, Sub-commands, and Flags.

### Industry Standards (POSIX & 12-Factor)

#### 1. Flag & Argument Discipline

- **Standards:** Support both short flags (`-f`) and long flags (`--force`).
- **POSIX Compliance:** Allow combined short flags (e.g., `-it` is same as `-i -t`).
- **Configuration Precedence:** Explicit Flag > Environment Variable > Config File > Default.
- **Help:** Every command MUST have detailed `--help` message with at least 3 usage examples.

#### 2. Stream Discipline (The "Pipe" Rule)

- **STDOUT:** ONLY actionable data goes here (e.g., JSON output, generated ID).
- **STDERR:** All logs, progress bars, errors, warnings go here.
- **Why:** Ensures `my-cli get-users | jq` works perfectly without parsing errors.

#### 3. Exit Codes

- **0:** Success
- **1:** Generic Error
- **2:** Usage/Syntax Error
- **130:** Terminated by user (Ctrl+C)
- _Never_ return exit code 0 if business logic failed

### Developer Experience (DX) & Feedback

#### 1. Progress & Interactivity

- **TTY Detection:** Check if terminal is interactive (`isatty`).
  - If Interactive: Use rich animations (Spinners for unknown time, Progress Bars for known). Use colors to denote status (Green=Success, Yellow=Warn, Red=Fail).
  - If Non-Interactive (CI/CD): Disable colors and animations. Log simple text lines.
- **Idempotency:** Where possible, commands should be safe to run multiple times.

#### 2. Safety Mechanisms

- **Destructive Actions:** Any DELETE/UPDATE command requires `--confirm` flag or interactive "Are you sure? [y/N]" prompt.
- **Dry Run:** Implementation of `--dry-run` is mandatory for complex operations. Show user exactly what would happen.

**Implementation:**

- Use mature argument parser library (Python `Click`/`Typer`, Node `Commander`/`Oclif`, Go `Cobra`). Do NOT use `sys.argv` manual parsing.
- Include TTY detection logic.
- Include standard `Logger` setup (JSON for machines, Pretty for humans).
- Never use emojis in CLI output. Always maintain professional & enterprise grade output.

---

## Documentation

**Specialization:** Developer Experience (DX), Knowledge Management, "Living Documentation."

**Goal:** Reduce "Time to Hello World" for new developer to under 10 minutes.

**Constraint:** Do NOT generate fragmented Markdown files unless explicitly requested. Focus on robust, centralized `README.md`. Do NOT use emojis. Always write professionally.

### The "Golden" README Architecture

**CRITICAL:** Root `README.md` is mandatory. Follow this prioritized structure:

1. **The "Why" (Value Proposition):** One sentence explaining what this project does and business problem it solves.
2. **Context & Badges:** Build Status, Version, Tech Stack (Node/Python/Go versions).
3. **Prerequisites:** Explicitly list system-level dependencies (e.g., "Requires Docker Desktop > 4.0", "Needs Postgres 14 running locally").
4. **Quick Start (The "5-Minute" Rule):** Exact ordered list of commands to clone, install, configure, and run locally.
   - Example: `npm install && cp .env.example .env && npm run dev`
5. **Architecture:** High-level overview. Use Mermaid.js syntax for complex flow diagrams.

### Configuration & Environment

- **The `.env` Strategy:** NEVER document secrets in README. Reference `.env.example` file instead.
- **Troubleshooting:** Include "Common Issues" section for known quirks (e.g., "If port 8080 is blocked...").

### Lifecycle & Maintenance

**Definition of Done:** Treat documentation changes as code changes.

- If you change a build command, UPDATE the Quick Start section.
- If you add an environment variable, UPDATE `.env.example`.

**Stale Docs:** If an instruction is no longer valid, DELETE it. Outdated documentation is worse than no documentation.

---

## Code Quality & Readability

### Cognitive Complexity & Readability

**CRITICAL:** Reduce mental burden required to understand code. DO NOT comment in code; if you must, be concise and meaningful.

#### Naming Discipline

- **Variables:** Nouns (`userConfig`, `pendingRetryCount`)
- **Functions:** Verbs (`calculateTax`, `validateInput`)
- **Booleans:** Questions (`isValid`, `hasAccess`, `canExecute`)

#### The "No-Else" Rule

Use **Guard Clauses** (Early Returns) to handle edge cases immediately. Avoid nesting `if/else` blocks deeper than 2 levels.

```python
# BAD
if is_valid:
    if has_permission:
        process_data()

# GOOD
if not is_valid:
    return
if not has_permission:
    return
process_data()
```

#### Magic Numbers

Strictly Forbidden. Extract all literals into named `const` or `enum`:

```python
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_MS = 5000
```

#### Self-Documenting

If you feel the need to write a comment explaining _what_ the code does, rewrite the code instead. Comments are reserved for _Why_ (business context) or complex algorithmic choices.

### Structural Integrity (SOLID & DRY)

- **Single Responsibility (SRP):** Functions must do one thing. If a function name has "And" in it (e.g., `validateAndSave`), break it apart.
- **Primitive Obsession:** Do not pass raw `strings` or `ints` for domain concepts. Use Value Objects or Interfaces.
- **Switch Statements:** If switching on type code, use **Strategy Pattern** or Polymorphism instead of large `switch/case` blocks.
- **Parameter Limits:** Max 3 arguments per function. If you need more, create a parameter object (DTO).

### Performance & Efficiency

- **Big O Awareness:** Choose data structures based on access patterns.
  - Lookups: Use HashMaps/Sets O(1) over Arrays O(n)
  - Iterations: Use Queues O(1) for FIFO operations
- **Lazy Loading:** Load data on-demand, not upfront
- **Caching:** Cache expensive computations (DB queries, API calls). Invalidate strategically.

---

## Project Structure Convention

**Specialization:** Domain Driven Design (DDD).

**Principles:**

- Planned and organized for DDD
- Restrict folder depth to 2 levels maximum
- Strictly separate layers with dependencies pointing INWARD:

```
src/
├── api/              # Presentation Layer (Routes, Controllers)
├── services/         # Application Layer (Use Cases)
├── domain/           # Domain Layer (Entities, Value Objects, Business Rules)
├── infrastructure/   # Infrastructure Layer (DB Adapters, Repositories, External Integrations)
└── shared/           # Cross-cutting concerns (Utils, Constants)
```

**Dependency Rule:** Each layer depends ONLY on layers below it. Never depend upward.

---

## Quick Reference: When to Output Artifacts

| Scenario                          | Output                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| Before writing secure code        | `<security_context>` markdown block                          |
| Before starting new project       | Comprehensive blueprint with all 6 required planning outputs |
| Before modifying existing feature | `## Impact Analysis` markdown block                          |
| Before designing UI               | `<user_journey_analysis>` markdown block                     |
| Before creating CLI tool          | `<cli_architecture>` markdown block                          |
| Any public endpoint/function      | At least 2 tests: success path + failure path                |

---

## Effective Collaboration with Copilot

To get the best results:

1. **Ask for Analysis First:** "Analyze the security context for..."
2. **Request Impact Analysis:** "Show me the blast radius of..."
3. **Specify Format:** "Generate this following TDD with AAA pattern"
4. **Reference Standards:** "Use DDD principles for this"
5. **Validate Before Commit:** "Is this OWASP ASVS compliant?"

---

## Legacy from Cursor IDE

This document was translated from Cursor IDE configuration:

- **Rules:** 7 rules files (00-70) covering all aspects of development
- **Commands:** 3 custom commands (onboard, leancode-refactor, pr-prep)
- **Maintenance:** Updated 2026-06-06

To use these guidelines effectively in GitHub Copilot Chat:

1. Reference this file directly in conversations: "Based on copilot-instructions.md, please..."
2. Use `.instructions.md` for automatic context loading in Copilot Chat
3. Invoke custom prompts from `.github/copilot/prompts/` folder
4. Run VS Code tasks for automation: `Tasks: Run Task`

---

**Last Updated:** 2026-06-06
**Format:** Translated from Cursor IDE `.cursor/rules/` folder
**Compatibility:** GitHub Copilot Chat + VS Code

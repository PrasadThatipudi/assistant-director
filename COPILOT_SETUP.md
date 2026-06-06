# GitHub Copilot Setup Guide

This document explains how to leverage the Copilot configuration that was translated from the Cursor IDE `.cursor` folder.

**Translation Date:** 2026-06-06
**Source:** `.cursor/rules/` (7 rules files) + `.cursor/commands/` (3 command files)

---

## Quick Start (30 seconds)

1. **Copilot Chat should auto-load** `.instructions.md` automatically
2. **Open Copilot Chat** (`Cmd+Shift+I` on Mac, `Ctrl+Shift+I` on Windows/Linux)
3. **Type a development question** and Copilot will follow your project guidelines

That's it! The rules are now active.

---

## What Was Translated

### Rules (7 Cursor Rules → Consolidated Guidelines)

| Original File                | Translated To                                  | Purpose                           |
| ---------------------------- | ---------------------------------------------- | --------------------------------- |
| `00-core-principles.mdc`     | `.instructions.md` + `copilot-instructions.md` | Security, DDD, Code Philosophy    |
| `10-planning-design.mdc`     | `.instructions.md`                             | Project planning, Impact Analysis |
| `20-backendapi-database.mdc` | `.instructions.md`                             | REST API design, Database schema  |
| `30-developer-tests.mdc`     | `.instructions.md`                             | TDD, Testing standards, Naming    |
| `40-frontend.mdc`            | `.instructions.md`                             | UI/UX design, Component standards |
| `50-observability.mdc`       | `.instructions.md`                             | Logging, Distributed tracing      |
| `60-cli-tooling.mdc`         | `.instructions.md`                             | CLI development standards         |
| `70-documentation.mdc`       | `.instructions.md`                             | README guidelines, DX             |

### Commands (3 Cursor Commands → Hybrid Approach)

| Original Command       | Translated To                                                         | How to Use                                   |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `onboard.md`           | `.vscode/tasks.json` + `.github/copilot/prompts/onboard.md`           | See [Onboarding](#onboarding-new-developers) |
| `leancode-refactor.md` | `.vscode/tasks.json` + `.github/copilot/prompts/leancode-refactor.md` | See [Code Refactoring](#refactor-code)       |
| `pr-prep.md`           | `.vscode/tasks.json` + `.github/copilot/prompts/pr-prep.md`           | See [PR Preparation](#prepare-pull-requests) |

---

## File Structure

```
assistant-director/
├── .instructions.md                    # Primary (auto-loaded by Copilot)
├── copilot-instructions.md             # Comprehensive backup reference
├── COPILOT_SETUP.md                    # This file
├── .vscode/
│   └── tasks.json                      # VS Code task definitions
├── .github/
│   └── copilot/
│       └── prompts/
│           ├── onboard.md              # Onboarding prompt
│           ├── leancode-refactor.md    # Refactoring prompt
│           └── pr-prep.md              # PR preparation prompt
└── .cursor/                            # (Preserved for Cursor IDE users)
    ├── rules/                          # Original Cursor rules
    └── commands/                       # Original Cursor commands
```

---

## How to Use

### 1. General Development Guidance

**In Copilot Chat:**

Type any development question, and Copilot will follow your project guidelines:

```
What's the best way to implement user authentication?
```

Copilot will automatically reference `.instructions.md` and provide guidance following:

- Security (Zero Trust, OWASP compliance)
- Architecture (DDD patterns)
- Testing (TDD principles)
- Your project's tech stack (FastAPI, React, etc.)

### 2. Onboarding New Developers

**Option A: VS Code Task**

```bash
# In VS Code Command Palette
Cmd+Shift+P → Tasks: Run Task → Copilot: Onboard New Developer
```

**Option B: Copilot Chat**

```
@onboard Please generate an onboarding guide for a new team member
```

**What you'll get:**

- 10,000-foot view of architecture
- Key directories and why they exist
- Data flow and patterns
- Getting started guide
- Common troubleshooting
- Key scripts and commands

**Use when:**

- Joining the team as a new developer
- Writing documentation for other developers
- Understanding codebase structure

### 3. Refactor Code (Lean Code)

**Option A: VS Code Task**

```bash
# In VS Code Command Palette
Cmd+Shift+P → Tasks: Run Task → Copilot: Lean Code Refactor
```

**Option B: Copilot Chat (Recommended)**

```
@leancode-refactor
Refactor this component for readability and performance:
[paste code]
```

**What happens:**

- Removes zombie comments and dead code
- Extracts magic numbers to constants
- Converts nested if/else to guard clauses
- Eliminates repeated logic (DRY principle)
- Suggests performance improvements
- Returns cleaned, production-ready code

**Ground Rules:**

- NO functional changes (same AST)
- Preserves all business logic
- Maintains backwards compatibility
- Output is ready to commit

### 4. Prepare Pull Requests

**Option A: VS Code Task**

```bash
# In VS Code Command Palette
Cmd+Shift+P → Tasks: Run Task → Copilot: PR Preparation
```

**Option B: Copilot Chat (Recommended)**

```
@pr-prep Generate a PR description for the changes on my current branch
```

**What you'll get:**

1. **Conventional Commit Title** (e.g., `feat(api): add JWT refresh`)
2. **Clear Summary** (What changed, Why, How)
3. **Test Plan** (Unit, Integration, Manual, Regression tests)
4. **Risk Assessment** (Security, Performance, Compatibility, Regression, Database)
5. **Deployment Checklist** (Migrations, env vars, backwards compatibility)

**Copy-paste output to:**

- GitHub PR description
- GitLab merge request description
- Your project's review system

---

## Configuration Details

### .instructions.md

- **Auto-loaded** by Copilot Chat automatically
- **Format:** YAML frontmatter + Markdown content
- **Size:** ~4,000 lines of comprehensive guidelines
- **Triggers:** alwaysApply (loaded for all conversations)
- **Updates:** Edit directly; changes take effect immediately in Copilot Chat

### copilot-instructions.md

- **Fallback reference** if `.instructions.md` not loaded
- **Format:** Pure Markdown (no YAML frontmatter)
- **Use:** Manually reference in chat: "According to copilot-instructions.md, ..."
- **Benefits:** Can be shared externally, used in documentation

### .vscode/tasks.json

- **VS Code integration** for task automation
- **Three tasks defined:**
  - Copilot: Onboard New Developer
  - Copilot: Lean Code Refactor
  - Copilot: PR Preparation
- **Access:** Command Palette → Tasks: Run Task

### .github/copilot/prompts/

- **Three prompt templates:**
  - `onboard.md` — Detailed onboarding instructions
  - `leancode-refactor.md` — Code sanitation rules
  - `pr-prep.md` — PR generation template
- **Can be enhanced:** Add more prompts for domain-specific tasks
- **Reusable:** Import in other projects

---

## Practical Examples

### Example 1: Get Architecture Overview

**You ask in Copilot Chat:**

```
@onboard What's the overall architecture of this project?
```

**Copilot generates:**

- Tech stack breakdown (React, FastAPI, PostgreSQL, etc.)
- High-level architecture diagram (Mermaid)
- Key directories and responsibilities
- Data flow (Frontend → API → Database)
- Getting started steps

---

### Example 2: Clean Up a Component

**You ask in Copilot Chat:**

```
@leancode-refactor
Refactor this React component:

export const UserProfile = ({ user, onUpdate }) => {
  // User profile card
  const [isLoading, setIsLoading] = React.useState(false)

  // ... component code
}
```

**Copilot:**

1. Removes all comments explaining what code does
2. Extracts magic numbers: `MAX_RETRY = 3`, `TIMEOUT_MS = 5000`
3. Converts nested if/else to guard clauses
4. Extracts repeated logic into helpers
5. Returns production-ready code

---

### Example 3: Generate PR Description

**You ask in Copilot Chat:**

```
@pr-prep I just completed the JWT refresh token feature
```

**Copilot generates:**

```markdown
## PR: feat(auth): implement JWT token refresh mechanism

### Description

Automatically refreshes JWT tokens on expiry to prevent user logout.

### Why

Users were losing sessions after 1 hour, requiring re-login.
This improves UX with silent token refresh.

### Testing

- Unit: Token validation and refresh logic
- Integration: End-to-end auth flow
- Manual: Login → wait → verify still authenticated

### Risk Assessment

| Area          | Risk   | Notes                                    |
| ------------- | ------ | ---------------------------------------- |
| Security      | Medium | New refresh endpoint needs rate limiting |
| Compatibility | Low    | Backwards compatible                     |
| Performance   | Low    | Minimal overhead                         |

### Deployment

- New env var: JWT_REFRESH_SECRET
- No database migrations
- Backwards compatible
```

---

## Tips for Best Results

### Tip 1: Reference the Guidelines

Explicitly ask Copilot to follow your standards:

```
According to our .instructions.md guidelines, how should I:
- Structure this API endpoint?
- Write the test for this feature?
- Design this database schema?
```

### Tip 2: Use Structured Requests

Instead of vague questions:

```
❌ "Help me build a login page"
✓ "Following the frontend guidelines in .instructions.md, design a login page.
   Include user journey analysis and UI component standards."
```

### Tip 3: Security First

Always ask for security analysis before implementation:

```
Before I implement user password reset, analyze:
- Data sensitivity (PII involved)
- Trust boundaries
- Attack vectors (phishing, token abuse, etc.)
```

### Tip 4: Impact Analysis for Existing Code

When modifying features:

```
I need to add caching to the user profile endpoint.
Analyze the blast radius using the framework from .instructions.md
```

### Tip 5: Use Artifacts in Chat

Paste code directly into Copilot Chat and ask:

```
@leancode-refactor
Here's my service class:
[paste code]

Make it production-grade while preserving all functionality.
```

---

## Keeping Guidelines Up to Date

### When to Update `.instructions.md`

1. **Add new security rules** (e.g., new OWASP threat discovered)
2. **Update tech stack** (e.g., FastAPI → Pydantic V2 upgrade)
3. **Refine patterns** (e.g., new DDD patterns adopted)
4. **Clarify standards** (e.g., testing requirements change)

### How to Update

1. Edit `.instructions.md` directly
2. Update `copilot-instructions.md` to match
3. Commit to main branch: `git commit -am "docs: update Copilot guidelines"`
4. Changes take effect **immediately** in Copilot Chat

### Version Control

The guidelines are version-controlled. You can:

- **Compare changes:** `git diff .instructions.md`
- **Revert if needed:** `git checkout .instructions.md`
- **Track history:** `git log .instructions.md`

---

## Migration from Cursor

### What's the Same?

✓ All 7 rules files preserved and consolidated
✓ All 3 commands available (via prompts + tasks)
✓ Security standards unchanged
✓ DDD architecture principles intact
✓ Testing standards preserved

### What's Different?

| Aspect        | Cursor              | Copilot                       |
| ------------- | ------------------- | ----------------------------- |
| **Auto-Load** | `.cursor/` (hidden) | `.instructions.md` (explicit) |
| **Commands**  | In-IDE only         | Chat prompts + VS Code tasks  |
| **Format**    | Cursor-specific     | Standard YAML + Markdown      |
| **Sharing**   | Project-local       | Can be shared/reused          |

### Both Tools Can Coexist

- Cursor IDE users still see `.cursor/` rules
- Copilot users get `.instructions.md` rules
- No conflicts, no duplication

---

## Troubleshooting

### Issue: Copilot not loading guidelines

**Solution:**

1. Verify `.instructions.md` exists in root directory
2. Restart Copilot Chat (reload VS Code if needed)
3. Check Copilot Chat settings: Look for "custom instructions" or "guidelines"
4. Try referencing explicitly: "According to copilot-instructions.md, ..."

### Issue: Prompt files not found

**Solution:**

1. Verify `.github/copilot/prompts/` directory exists
2. Check file names match exactly:
   - `onboard.md`
   - `leancode-refactor.md`
   - `pr-prep.md`
3. Try using prompts directly in chat

### Issue: Guidelines feel outdated

**Solution:**

1. Review and update `.instructions.md` as needed
2. Sync `copilot-instructions.md` to match
3. Commit changes with clear commit message
4. Share updates with team via PR

---

## Advanced: Creating Custom Prompts

### Add New Prompt

1. Create new file: `.github/copilot/prompts/my-prompt.md`
2. Use template:

   ```markdown
   ---
   description: "What this prompt does"
   triggers:
     - keyword1
     - keyword2
   ---

   # Prompt Title

   Instructions here...
   ```

3. Use in Copilot Chat: `@my-prompt Your request here`

### Example: Custom Deployment Prompt

```markdown
---
description: "Generate deployment checklist and runbook"
triggers:
  - deploy
  - deployment
  - release
---

# Deployment Checklist Generator

Generate pre-deployment checklist:

1. Code review status
2. Test coverage
3. Breaking changes
4. Rollback plan
5. Monitoring setup
```

---

## Support & Resources

- **Copilot Guidelines:** See `copilot-instructions.md`
- **Original Cursor Rules:** See `.cursor/rules/`
- **Prompts Directory:** See `.github/copilot/prompts/`
- **VS Code Tasks:** See `.vscode/tasks.json`

---

## Next Steps

1. ✅ Read this setup guide (you're done!)
2. 🔄 Open Copilot Chat and test guidelines
3. 📝 Use `@onboard` for team onboarding
4. 🧹 Try `@leancode-refactor` on a messy file
5. 📋 Use `@pr-prep` for your next PR
6. 👥 Share this guide with your team

---

**Last Updated:** 2026-06-06
**Status:** Active
**Compatibility:** GitHub Copilot Chat + VS Code 1.90+

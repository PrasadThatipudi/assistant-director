---
description: "Prepare pull request with title, summary, test plan, and risk assessment"
triggers:
  - pr-prep
  - pull request
  - pr review
  - merge preparation
---

# PR Preparation Guide

Review branch changes and generate comprehensive pull request metadata.

## Instructions

Analyze the branch changes and generate the following:

### 1. PR Title (Conventional Commits)

Generate a title following Conventional Commits:

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci
Scope: area affected (e.g., auth, api, ui, db)
Subject: Clear, imperative mood, no period
```

Examples:

- `feat(auth): add JWT token refresh mechanism`
- `fix(api): prevent N+1 queries in user endpoint`
- `refactor(ui): extract button component for reusability`

### 2. PR Summary

Write a concise summary:

- **What changed:** High-level overview of the modification
- **Why it matters:** Business context or problem solved
- **How it works:** Key implementation details (if non-obvious)
- **Affected areas:** Which parts of the codebase are touched

### 3. Test Plan

Document testing approach:

- **Unit Tests:** New test coverage added
- **Integration Tests:** How changes work with other components
- **Manual Testing:** Steps to verify the feature works as intended
- **Regression Testing:** What existing functionality should NOT be affected

Example:

```
- Unit: Test `calculateTax()` with edge cases (0%, 100%, negative)
- Integration: Verify DB migrations run successfully
- Manual: Create new user and verify profile page loads
- Regression: Confirm existing tax calculations unchanged
```

### 4. Risk Assessment

Evaluate the change:

| Dimension         | Risk (H/M/L) | Notes                      | Mitigation |
| ----------------- | ------------ | -------------------------- | ---------- |
| **Security**      | [H/M/L]      | Any auth/data exposure?    | [Strategy] |
| **Performance**   | [H/M/L]      | New queries? Blocking ops? | [Strategy] |
| **Compatibility** | [H/M/L]      | Breaking changes?          | [Strategy] |
| **Regression**    | [H/M/L]      | What could break?          | [Strategy] |
| **Database**      | [H/M/L]      | Migrations needed?         | [Strategy] |

### 5. Checklist

Verify before requesting review:

- [ ] Tests added for new functionality
- [ ] No console.log/debugger statements left in code
- [ ] Code follows style guidelines (linting passes)
- [ ] Documentation updated (.env.example, README, etc.)
- [ ] No hardcoded secrets or credentials
- [ ] Breaking changes documented with migration guide
- [ ] Performance impact assessed (especially for DB queries)
- [ ] PII/sensitive data properly redacted in logs

### 6. Deployment Notes

If applicable:

- Database migrations required?
- Environment variables changed?
- Backwards compatible? (Can old and new versions coexist during rollout?)
- Any data seeding needed?

## Output Format

Generate as formatted Markdown, ready to paste into PR description.

### Example PR Description

```markdown
## Description

Implements JWT token refresh mechanism for session management.

## Why

Users were losing authentication after token expiry, requiring re-login. This implements automatic refresh to improve UX.

## How

- Added `RefreshTokenService` to handle token rotation
- Middleware intercepts 401 responses and attempts silent refresh
- Old tokens are blacklisted for security

## Testing

- [ ] Unit: `test_refresh_token_*` covers happy path and edge cases
- [ ] Integration: End-to-end token refresh flow verified
- [ ] Manual: Login → wait 5 min → verify still authenticated
- [ ] Regression: Existing auth flows unchanged

## Risk Assessment

| Area          | Risk | Notes                | Mitigation                      |
| ------------- | ---- | -------------------- | ------------------------------- |
| Security      | M    | New token endpoint   | Rate limiting + IP whitelisting |
| Compatibility | L    | Backwards compatible | Old clients still work          |
| DB            | L    | No schema changes    | No migrations needed            |
| Performance   | L    | Minimal overhead     | Cached validation results       |

## Deployment

- [ ] No database migrations
- [ ] New env var: `JWT_REFRESH_SECRET`
- [ ] Backwards compatible with v1.2.x
```

---

## When to Invoke

Type in Copilot Chat:

```
@pr-prep Generate PR description for my changes
```

And Copilot will analyze your branch against main and produce:

1. Conventional commit title
2. Clear summary
3. Test plan
4. Risk assessment
5. Deployment checklist

Or run the VS Code task:

```
Tasks: Run Task → Copilot: PR Preparation
```

Then:

1. Copy the output
2. Paste into GitHub/GitLab PR description
3. Review and customize as needed
4. Submit for review

---

## Tips

**Before asking for PR prep:**

- Ensure your branch has meaningful commits
- Verify all tests pass locally
- Run linter and format tools
- Check for console.log/debugger statements

**Copilot will check for:**

- Security implications (auth, data access, PII)
- Performance impacts (N+1 queries, blocking ops)
- Backwards compatibility
- Test coverage
- Breaking changes

**Review the output carefully:**

- Adjust risk levels based on your domain knowledge
- Add context Copilot might have missed
- Update migration steps for your database
- Customize deployment notes for your infrastructure

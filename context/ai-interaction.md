# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Never add features not described in the current SPEC file
- Never delete files without explicit confirmation
- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes — ask for clarification

---

## Workflow

Follow this workflow for every single feature or fix:

1. **Read spec** — Read `context/project-overview.md` then the
   relevant `context/features/SPEC_XX_*.md` file
2. **Update current-feature** — Update `context/current-feature.md`
   based on what you read in the SPEC file. Fill in:
   - Feature name and goals
   - Implementation order
   - Definition of done checklist
   Do NOT start coding until this is done and confirmed.
3. **Branch** — Create a new git branch for the feature
4. **Implement** — Implement only what is described in the SPEC file
5. **Test** — Test every new endpoint in `http://127.0.0.1:8000/docs`
   and verify the frontend renders correctly in the browser
6. **Iterate** — Fix issues found during testing
7. **Commit** — Only after testing passes — ask before committing
8. **Merge** — Merge to main after confirmation
9. **Delete branch** — Ask to delete branch after merge
10. **Mark complete** — Update `context/current-feature.md` status
    to Completed and add a one-line summary to the history section

Do NOT commit without permission.
Do NOT start coding before updating current-feature.md.
Do NOT implement anything not in the SPEC file.

---

## Feature File Structure

All SPEC files live in `context/features/`:

```
context/
├── project-overview.md       ← read before every session
├── ai-interaction.md         ← this file
├── coding-standards.md       ← code style rules
├── current-feature.md        ← always reflects what we are building NOW
└── features/
    ├── SPEC_01_PROJECT_SETUP.md
    ├── SPEC_02_AUTH.md
    ├── SPEC_03_FRONTEND_SETUP.md
    ├── SPEC_17_CASE_STUDIES.md
    └── ... (one file per feature)
```

When the user says "work on SPEC_05", you:
1. Read `context/features/SPEC_05_*.md`
2. Update `context/current-feature.md` from that spec
3. Confirm the plan with the user before coding

---

## Branching

Create a new branch for every feature or fix.

Name format:
- `feature/case-studies-api`
- `feature/student-dashboard-ui`
- `fix/auth-import-error`
- `chore/update-requirements`

---

## Commits

- Ask before committing
- Use conventional commit messages:
  - `feat: add case study attempt endpoint`
  - `fix: correct shared import path in auth router`
  - `chore: update requirements.txt`
  - `refactor: extract scoring logic to service`
- Keep commits focused — one feature or fix per commit
- Never include "Generated with Claude" or "Generated with AI" in messages

---

## Code Changes

- Make minimal changes to accomplish the task
- Do not refactor unrelated code unless explicitly asked
- Do not add "nice to have" features beyond the SPEC
- Preserve existing patterns already in the codebase
- When fixing a bug, only touch the files that need changing

---

## When Stuck

- If a fix isn't working after 2-3 attempts, stop
- Explain what you tried and why it failed
- Ask for clarification rather than guessing
- Do not keep trying random approaches

---

## Code Review Checklist

Review all AI-generated code for:

- Security: auth checks on every protected endpoint, input validation
- Logic: edge cases, off-by-one errors, missing null checks
- Database: correct use of `sqlalchemy.text()`, no raw string injection
- Imports: all `shared/` imports use `from shared.x import y`
- Patterns: consistent with existing code in the same module
- Performance: no unnecessary DB queries in loops

---

## Backend-Specific Rules

- Use `from shared.database import get_db` (never relative `..shared`)
- Use raw SQL with `sqlalchemy.text()` for all database operations
- Always use `db.commit()` after INSERT/UPDATE
- Always use `RETURNING` clause to get inserted row data
- Wrap endpoint logic in try/except and print errors clearly
- Return proper HTTP status codes (400, 401, 403, 404, 409, 500)
- Never expose password hashes or internal errors in API responses

---

## Frontend-Specific Rules

- Use functional React components only
- Use Axios for all API calls — base URL from `.env`
- Store JWT token in localStorage under key `pcdc_token`
- Send token as: `Authorization: Bearer {token}`
- Use React Router for navigation
- Use Tailwind CSS for all styling — no inline styles
- Show loading states while API calls are in progress
- Show clear error messages when API calls fail

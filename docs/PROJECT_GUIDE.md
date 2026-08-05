# PCDC — Project Guide

Practical guide to getting the project running and working in it day to
day. For *what* the system does, see `FEATURES.md`; for *how it's built*,
see `TECH_ARCHITECTURE.md`; for exact schema/API reference, see
`TECH_SPECS.md`.

---

## 1. What This Project Is

PCDC (Prestige Capability Development Centre) is a capability-development
platform for business students: AI-assisted case studies with a
structured attempt flow (analysis → AI discussion → solution → AI defense
→ reflection → evaluation), a rolling capability-score dashboard, and
portals for faculty, mentors, and admins to author content, coach
students, and manage the academic structure (courses/batches/sections).

---

## 2. Prerequisites

- Python 3.x with a virtualenv at `backend/.venv`
- Node.js + npm
- Access to the project's Neon Postgres database (connection string in
  `backend/.env`, not committed to git)
- An OpenAI API key with access to `gpt-4o-mini` (also in `.env`)

---

## 3. First-Time Setup

```bash
# Backend
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt     # macOS/Linux

# Frontend
cd ../frontend
npm install
```

Create `backend/.env` (never commit this file) with at minimum:

```env
DATABASE_URL=postgresql://<user>:<password>@<neon-pooler-host>/neondb?sslmode=require&channel_binding=require
SECRET_KEY=<any-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=sk-proj-...
```

Optional overrides: `OPENAI_MODEL`, `OPENAI_CASE_GENERATION_MODEL` (both
default to `gpt-4o-mini` if unset).

> **A note on `DATABASE_URL`**: this project's Neon connection string has
> gone stale before (pointing at an old/archived branch after the project
> was reconfigured in the Neon dashboard). If you get
> `password authentication failed` or `relation "X" does not exist`
> errors, open the Neon dashboard → your project → **Connect** and copy
> the *current* pooled connection string fresh rather than assuming the
> one in `.env` is still correct.

Apply the database schema:

```bash
cd backend
python -m alembic upgrade head
```

Seed test accounts:

```bash
python seeds/seed_users.py
```

This creates 6 accounts (see §6). It does **not** create any case study
content — cases are authored through the Faculty portal (or via direct
DB/API calls) and are not part of the generic seed script.

---

## 4. Running Locally

```bash
# Backend (from backend/)
.venv/Scripts/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (from frontend/)
npm run dev
```

- Backend: `http://localhost:8000` (interactive API docs at
  `http://localhost:8000/docs`)
- Frontend: `http://localhost:5173`

`--host 0.0.0.0` lets the API be reached from other devices on the same
network (by LAN IP) — useful for testing from a phone/second laptop. The
frontend's API base URL auto-derives from whatever hostname served the
page, so no rebuild is needed to switch between `localhost` and a LAN IP.

These exact commands are also recorded in `context/server_running_commands.txt`.

---

## 5. Project Structure

```
pcdc/
├── backend/
│   ├── main.py                      ← FastAPI app, CORS, router mounting
│   ├── requirements.txt
│   ├── .env                         ← never commit
│   ├── alembic/versions/            ← migrations, 0001–0011
│   ├── seeds/seed_users.py          ← the only seed script
│   ├── shared/
│   │   ├── database.py              ← engine, SessionLocal, get_db()
│   │   └── cache.py                 ← in-process TTL cache
│   └── services/
│       ├── auth/                    ← register, login, JWT
│       ├── simulation/              ← Case Studies + attempt flow (misleadingly named)
│       ├── student/                 ← student dashboard/profile/capability engine
│       ├── faculty/                 ← Case Builder, rubric builder, sections
│       ├── mentor/                  ← mentor roster, sessions, interventions
│       ├── admin/                   ← users, courses/batches/sections, CSV import
│       ├── capability/ ai/ notification/  ← dead stubs, health-check only
│       └── director/                ← does not exist (no backend built yet)
├── frontend/src/
│   ├── App.tsx                      ← top-level routes
│   ├── api/                         ← one axios wrapper file per domain
│   ├── pages/                       ← one folder per portal + shared pages
│   ├── components/                  ← one folder per portal + shared UI
│   ├── layouts/                     ← DashboardLayout (student), portal layouts
│   ├── context/AuthContext.tsx
│   └── utils/auth.ts                ← JWT storage/decoding
└── context/
    ├── project-overview.md          ← original aspirational design doc (partially stale — see TECH_ARCHITECTURE.md's drift note)
    ├── current-feature.md           ← running log of what's in progress/done, with detailed implementation history
    ├── coding-standards.md
    ├── ai-interaction.md
    └── features/SPEC_*.md           ← one file per feature spec, worked through sequentially
```

---

## 6. Seed Accounts

| Email | Password | Role |
|---|---|---|
| `student@pcdc.com` | `Student@123` | student |
| `student2@pcdc.com` | `Student@123` | student |
| `faculty@pcdc.com` | `Faculty@123` | faculty |
| `mentor@pcdc.com` | `Mentor@123` | mentor |
| `admin@pcdc.com` | `Admin@123` | admin |
| `director@pcdc.com` | `Director@123` | director (portal is a placeholder — nothing to see yet) |

---

## 7. Common Workflows

### Adding a new migration
1. Add a new file `backend/alembic/versions/00NN_description.py` following
   the existing files' format (`revision`, `down_revision`, `upgrade()`,
   `downgrade()`, raw `op.execute()` SQL — no autogeneration is used in
   this project's history).
2. `python -m alembic upgrade head` to apply it locally.
3. Never edit an already-applied migration file after the fact — add a
   new one.

### Adding a new backend endpoint
1. Pick the right service module (or create a new one following the
   4-file pattern in §2.2 of `TECH_ARCHITECTURE.md`).
2. Write the query/logic in `service.py` using raw `text()` SQL — don't
   introduce ORM model classes, it'd be inconsistent with every other
   endpoint in the codebase.
3. Add a thin route in `router.py` that calls the service function and
   wraps it in `try/except HTTPException: raise / except Exception:
   raise HTTPException(500, ...)`, matching the existing pattern.
4. Check `require_role(...)` is called with the right allowed roles if
   the endpoint should be restricted.

### Adding a new frontend page
1. Add the page component under `pages/<portal>/`.
2. Add a typed API function in `api/<domain>.ts` if it needs backend data.
3. Wire the route into `App.tsx` (student-level pages) or the relevant
   `XPortal.tsx` (faculty/mentor/admin/director sub-routes), wrapped in
   `<ProtectedRoute allowedRole="...">`.

### Verifying a change (no test suite exists)
- Backend: `python -m py_compile <changed files>` for a fast syntax check.
- Frontend: `npx tsc -b` (type-check) and `npx vite build` (production
  build) from `frontend/`.
- Behavior: either call the endpoint directly (`curl` or a small
  `SessionLocal()` script — see `context/current-feature.md`'s history for
  many examples of this pattern) against the live dev DB, or drive the UI
  through a real browser. No headless-browser tool is installed by
  default in most working sessions on this project — Playwright has been
  installed ad hoc into a scratch directory when a visual check was
  needed, rather than as a project dependency.

### Reading feature history
`context/current-feature.md` is the single most information-dense file in
the repo — every implemented feature has a detailed history entry
covering what was built, what deviated from the spec and why, what was
verified, and what's still open. Read it before assuming something is or
isn't implemented.

---

## 8. Known Gaps

- Director portal: role exists, login works, but the portal itself is an
  unbuilt placeholder.
- No automated tests, no CI.
- `case_questions` (faculty-authored "Structured Written Questions" with
  marks/rubrics) exists in the schema and Case Builder UI but the real
  student attempt flow does not use it yet — attempts still take one
  free-text `initial_analysis` blob rather than per-question responses.
- `eligible_for_evaluation` on `case_study_attempts` and a "70% completion
  threshold" concept are referenced in one feature spec but were never
  defined or implemented — no code reads or writes that column.
- `recommended_career_tracks` (a chip shown in one page's design) has no
  backing column or Case Builder UI to set it.

# PCDC — Development Plan (Architecture, Phases, Schema)

> Build plan for the PCDC platform. **AI is a static stub** for now (real LLM swaps in later behind one interface). UI is built properly with a real framework + component library (the approved `final/` design set is the visual spec). Go-live target: 28 July.

## 1. Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | Proper component library, routing, role-based layouts |
| Data/state | TanStack Query + Zustand; forms react-hook-form + zod | Caching, optimistic updates |
| Backend | Python + FastAPI (mandated) | Async, typed, Pydantic v2 |
| ORM/migrations | SQLAlchemy 2.0 + Alembic | Versioned schema |
| Database | PostgreSQL (SQLite for local dev) | Relational, mandated |
| Auth | JWT (access+refresh), temp-password onboarding, role guard | Admin / Mentor / Student |
| AI | `LLMProvider` interface — static stub now | Canned rapid-fire/suggestions/score; swap later, no API/UI change |
| Files/Email | S3-compatible / transactional email | Uploads + invites |
| Hosting | Frontend → Vercel; Backend + Postgres → Render/Railway | Matches current setup |

## 2. Architecture (3 tiers)
- **Client** — one Next.js app, role-gated into Admin / Mentor / Student portals.
- **API** — FastAPI; modules: Auth & Users, Master data & Scoring config, Case studies & Launch, Assessments, Scoring & Progression engine, Reporting/Analytics, Notifications, AI orchestration.
- **Data & services** — PostgreSQL, file storage, email, and the **AI engine (static stub)**.
- All AI behind one `LLMProvider` — the assessment flow + scoring math run end-to-end without a real model.

## 3. Database tables (core)
| Table | Key columns | Purpose |
|---|---|---|
| users | id, full_name, email, password_hash, role, status, must_reset_pw, college_id | All accounts |
| subjects | id, name, status | Master subjects |
| mentor_subjects | mentor_id, subject_id | Mentor ↔ subject (M:N) |
| student_subjects | student_id, subject_id, current_level (1–5), status | Mapping + progression |
| capabilities | id, family, name | Capability framework |
| scoring_parameters | id, name, weight, capability_id?, active | Dynamic scheme (total 100) |
| case_studies | id, title, content, file_url?, difficulty (1–5), created_by, status, launch_mode, reading_minutes, attempt_minutes, disqualify_below_pct, opens_at, closes_at | Case-study bank |
| case_study_subjects / _capabilities / _bloom | case_study_id + tag | Multi-mapping |
| questions | id, case_study_id, text, order | Faculty questions |
| case_study_assignees | case_study_id, student_id? | Assignment (null = all in subject) |
| attempts | id, case_study_id, student_id, attempt_no, started_at, submitted_at, time_taken, completion_pct, total_score (0–100), status, outcome | One run |
| attempt_answers | id, attempt_id, question_id, stage, answer_text | Think-first + revised |
| rapid_fire | id, attempt_id, question, answer, order | AI Q&A (stub) |
| ai_suggestions | id, attempt_id, text | "What's missing" (stub) |
| attempt_scores | id, attempt_id, parameter_id, score, weight | Per-parameter weighted /100 |
| capability_scores | id, student_id, capability_id, score, updated_at | Running profile (graphs) |
| feedback | id, attempt_id, mentor_id, text | Mentor remarks |
| notifications | id, user_id, type, payload, read_at | Alerts |
| ai_interaction_log | id, attempt_id, prompt, response, tokens, latency | Logging/audit (stub) |

## 4. Backend API (by module)
- **Auth:** login, set-password, refresh, logout
- **Users:** mentors CRUD + invite; students import (CSV) + invite; list
- **Master data:** subjects CRUD; capabilities; scoring-parameters (get/put)
- **Case studies:** CRUD; launch; questions
- **Campaigns/Reporting:** campaigns; campaign responses; attempt scorecard
- **Assessment:** start; answer; rapid-fire; submit
- **Scoring/Progression:** internal — weighted /100, completion %, outcome, level advance
- **AI (stub):** generate_rapid_fire / suggestions / score → canned
- **Analytics:** student capabilities; trend; overview

Standard `{success, data/error}` responses; every route role-guarded.

## 5. Frontend (properly built)
- One Next.js app; `(admin)` `(mentor)` `(student)` route groups; shared role-aware layout.
- Tailwind theme tokens (blue/white) + shadcn/ui; reusable: DataTable, StatCard, Stepper, FormField, ChipSelect, Badge, ScoreBar, Timer.
- JWT in httpOnly cookie; route middleware by role.
- Screens built from the finalized designs (difficulty 1–5, /100 weighted scorecards, reading+attempt reverse timer, dynamic scoring settings).

## 6. AI = static stub
- `LLMProvider` interface: `generate_rapid_fire()`, `suggestions()`, `score()`.
- `StubProvider` returns canned rapid-fire questions, canned suggestions, and a deterministic score → the full flow + real scoring math (weighted /100, completion %, pass/retry/lock, level advance) work end-to-end. Real Llama/Gemini swaps in as one class change.

## 7. Phases
| Phase | Build | Outcome |
|---|---|---|
| 0 · Setup & architecture | Repos, CI, FastAPI+Postgres+Alembic, Next.js+shadcn, theme, JWT skeleton | Stack running, login shell |
| 1 · Auth & users | Login, temp-password, roles; invite mentors; student CSV import | Onboarding works |
| 2 · Master data | Subjects, Capabilities, dynamic Scoring Parameters | Platform configurable |
| 3 · Case studies | Authoring, 4-param mapping, questions, reading+attempt times, launch modes, disqualify threshold, launch/assign | Mentor publishes |
| 4 · Assessment loop | Briefing → reading lock → paste-blocked answer → rapid-fire (stub) → suggestions (stub) → revise → submit | Student completes attempt |
| 5 · Scoring & progression | Weighted /100, completion %, pass/retry/lock, levels 1–5, disqualification | Real marks + auto-advance |
| 6 · Reporting & analytics | Campaigns → responses → scorecards; capability profiles; strength/weakness + progress graphs | Insight |
| 7 · Notifications & dashboards | Email + in-app; role dashboards | Full feature set |
| 8 · Integration → UAT → Go-live | E2E tests, polish, UAT deploy, fixes, production | Live (28 July) |

*(Real AI-provider integration is a later, separate phase — the stub keeps everything shippable.)*

## 8. Build order decision
**Admin panel first** — it's the entry point for all data (subjects, capabilities, scoring config, mentors, students) that the Mentor and Student portals depend on. Sequence within the admin panel:
1. Backend foundation (FastAPI + DB models + auth) → 2. Admin auth + login/set-password → 3. Master data (Subjects, Capabilities, Scoring Parameters) → 4. Mentor management + invite → 5. Student provisioning (CSV + invite) → 6. Campaigns view (read) + Admin dashboard.

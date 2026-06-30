# SPEC_14: Faculty Portal

**Status:** Planning (Sprint 3)
**Depends on:** Auth module (done), Role-based routing (done), Case Studies schema (done), Student Portal (done — reference for patterns)
**Prefix:** `/faculty/*`

## 0. Scope for today

Build out the 7 faculty pages in this order (each unblocks the next):

1. `dashboard` — landing screen, summary stats
2. `case-library` — view/manage uploaded case studies
3. `case-builder` — create/edit a case study (AI-assisted)
4. `rubric-builder` — define evaluation criteria per case
5. `students` — roster + filters
6. `analytics` — per-student / per-cohort capability views
7. `reports` — exportable summaries

Build order matters: `case-builder` and `rubric-builder` share data shapes, and `analytics`/`reports` read from data the others write, so do them last.

---

## 1. Page: Faculty Dashboard

**Route:** `/faculty/dashboard`

**Purpose:** Landing screen after login. At-a-glance status, not a deep-dive page.

**UI elements (from spec doc, Section 5):**
- Faculty name / greeting
- Active Students (count)
- Simulations Running (count)
- Pending Reviews (count) — links to case studies/attempts awaiting faculty input
- Capability Alerts (count) — mirrors mentor "at risk" concept, faculty-scoped
- Quick links to the other 6 modules

**Data needed:**
- Count of students in faculty's assigned case studies/cohorts
- Count of `SIMULATION_ATTEMPTS` with status = in-progress, scoped to this faculty's cases
- Count of attempts awaiting faculty review (new status needed — see Open Questions)
- Count of capability alerts (likely reuse mentor's alert logic, scoped differently)

**API endpoints (new):**
- `GET /api/faculty/dashboard/summary` → `{active_students, simulations_running, pending_reviews, capability_alerts}`

**Tables touched:** `simulation_attempts`, `students`, `student_capability` (read-only)

---

## 2. Page: Case Study Library

**Route:** `/faculty/case-library`

**Purpose:** Browse, search, and manage case studies this faculty member owns or has access to.

**UI elements:**
- Table/grid: Title, Industry, Difficulty, Duration, Status (Draft/Published), Attempts count, Last edited
- Filters: industry, difficulty, status
- Actions per row: Edit (→ case-builder), View attempts, Archive/Unpublish
- "+ New Case Study" button → case-builder

**Data needed:** List of case studies from the 5-table case studies schema, filtered by `CreatedBy = faculty_id` (or org-wide if admin grants visibility).

**API endpoints:**
- `GET /api/faculty/cases?industry=&difficulty=&status=`
- `PATCH /api/faculty/cases/{id}/status` (publish/archive)

**Tables touched:** case studies schema tables (need to confirm exact table names from your 5-table Alembic migration — flagged below)

---

## 3. Page: Case Builder

**Route:** `/faculty/case-builder` (new) and `/faculty/case-builder/{id}` (edit)

**Purpose:** Create/edit a case study. Per spec doc Section 5, faculty enters core fields and AI auto-generates the rest, then faculty edits before publishing.

**UI elements — Faculty enters:**
- Title, Industry, Difficulty (Level 1–7), Duration, Capabilities Targeted (multi-select), Expected Outcomes

**AI-generated (faculty reviews/edits before publish):**
- Background, Data, Characters, Events, Questions, Rubrics (draft), Reflection prompts

**Flow:**
1. Faculty fills core fields → clicks "Generate with AI"
2. AI call returns structured draft (background/data/characters/events/questions) — same pattern as your Claude API artifact integration, server-side this time
3. Faculty edits each section inline
4. Save as Draft / Publish

**API endpoints:**
- `POST /api/faculty/cases` (create draft)
- `PUT /api/faculty/cases/{id}` (update)
- `POST /api/faculty/cases/{id}/generate` (trigger AI generation for one or more sections)
- `POST /api/faculty/cases/{id}/publish`

**Tables touched:** case studies schema (situation/background/data/characters/constraints/objectives/timeline fields — map to your existing 5 tables)

**Note:** This is the most complex page — AI generation, multi-section form state, draft/publish lifecycle. Budget the most time here.

---

## 4. Page: Rubric Builder

**Route:** `/faculty/rubric-builder/{case_id}`

**Purpose:** Define/edit evaluation criteria for a specific case study, aligned to the AI Evaluation Engine weighting in the spec doc (Thinking Depth 30%, Logic 20%, Creativity 15%, Practicality 15%, Risk Awareness 10%, Reflection 10%).

**UI elements:**
- Default weighted criteria pre-filled from the standard model above
- Faculty can adjust weights (must sum to 100%) or add capability-specific criteria
- Save/Publish tied to the case study

**API endpoints:**
- `GET /api/faculty/cases/{id}/rubric`
- `PUT /api/faculty/cases/{id}/rubric`

**Tables touched:** likely a `rubrics` or `evaluation_criteria` table within the case studies schema — confirm if this exists yet or needs a migration.

---

## 5. Page: Students

**Route:** `/faculty/students`

**Purpose:** Roster of students taking this faculty's case studies, with drill-down.

**UI elements:**
- Table: Name, Program, Career Track, Current Level, capability snapshot (mini bars), last activity
- Filters: career track, level, "needs review"
- Click row → student detail (capability profile + attempt history, read-only for faculty — contrast with mentor's intervention tools)

**API endpoints:**
- `GET /api/faculty/students?track=&level=`
- `GET /api/faculty/students/{id}`

**Tables touched:** `students`, `student_capability`, `simulation_attempts`

---

## 6. Page: Analytics

**Route:** `/faculty/analytics`

**Purpose:** Cohort-level view — not individual mentoring, but teaching effectiveness signals: which cases work well, where students struggle.

**UI elements:**
- Capability score distribution across cohort (chart)
- Per-case-study average scores (Quality/Logic/Innovation/Time/Reflection)
- Weakest capability area(s) flagged
- Trend over time

**API endpoints:**
- `GET /api/faculty/analytics/cohort-summary`
- `GET /api/faculty/analytics/case/{id}`

**Tables touched:** `simulation_attempts`, `student_capability` (aggregated, read-only)

---

## 7. Page: Reports

**Route:** `/faculty/reports`

**Purpose:** Exportable summaries (PDF/CSV) for program reviews, accreditation, etc.

**UI elements:**
- Report type selector (cohort summary, individual student, case study performance)
- Date range filter
- Export button (PDF via your `pdf` skill / CSV)

**API endpoints:**
- `GET /api/faculty/reports/{type}?format=pdf|csv`

**Tables touched:** read-only aggregation across existing tables, no new schema needed.

---

## Open Questions Before Cline Starts

1. **"Pending Reviews" status** — does `simulation_attempts` currently have a status that distinguishes "awaiting faculty review" from "AI-evaluated, done"? If not, this needs a column/enum addition.
2. **Case studies schema field names** — confirm the exact 5 table names/columns from your existing Alembic migration so case-builder and rubric-builder map correctly instead of guessing.
3. **Rubric storage** — is there already a table for this, or does it need a new migration?
4. **Faculty-to-case ownership** — is it `CreatedBy` on the case study, or a separate faculty-cases join table (for co-taught cases)?
5. **AI generation calls** — case-builder's "Generate with AI" should reuse whatever Claude API wrapper pattern you used for the student-side AI Coach — confirm that module's location so Cline imports rather than duplicates it.

## Suggested Workflow

For each page, update `context/current-feature.md` to point at this spec's relevant section before generating code, same pattern as before. Recommend tackling **dashboard → case-library → case-builder** today as one branch (`feature/faculty-cases`), and leaving **rubric-builder, students, analytics, reports** for a follow-up branch (`feature/faculty-students-analytics`) once the case-builder data shape is locked in — analytics/reports depend on attempts data flowing through real case studies first.

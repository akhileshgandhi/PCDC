# SPEC_15 — Case Publishing, Cohort Targeting & Notification

## 1. Why This Spec Exists

An audit of the current codebase against the intended end-to-end flow

```
Admin adds users -> Faculty creates case -> Faculty targets a
department/program/class of students -> Case is published -> targeted
students are notified -> students opt in and complete before an end date
```

found that only the first two steps are actually implemented. This spec
covers the remaining three steps: cohort targeting, publish-time
notification, and a deadline/opt-in model. It also **supersedes** the
SPEC_10 decision that case visibility is an "open library" with no cohort
scoping and that the faculty-to-student relationship is case-based only —
that decision is replaced by explicit cohort targeting described below.

## 2. Current State (verified against code, not prior specs)

| Step | Status | Evidence |
|---|---|---|
| Admin creates student/faculty/mentor users | Done | `POST /admin/users` — `backend/services/admin/router.py:378` |
| Faculty creates/edits/publishes case studies | Done | `backend/services/faculty/router.py:1071` (create), `:1442` (publish) |
| Faculty targets a department/program/class of students | **Missing** | No cohort/department/class concept exists on `users`/`students`. `case_studies.target_learners` (`0007_case_schema_gap_analysis.py`) is free-text only, never used to filter recipients. |
| Publish notifies targeted students | **Missing** | `publish_faculty_case` (`faculty/router.py:1442-1493`) only flips `status='published'`. No `assigned_cases` rows created, no notification fired. |
| Student has an end date to opt in and complete | **Missing** | No `due_date`/`deadline`/`opt_in` column anywhere in schema or code. |

Today the *only* way a student gets a case is a mentor manually assigning
one case to one student (`assign_case_to_student`,
`backend/services/mentor/router.py:373-438`). This spec adds a second,
bulk path: faculty targets a cohort at publish time.

## 3. Scope

- New admin-managed `departments` and `classes` reference lists (same
  shape/precedent as the existing `career_tracks` table), captured on
  `students` at admin creation time. Existing free-text `users.program`
  is unchanged and reused as the third targeting dimension.
- A cohort-targeting step in the faculty publish flow: pick department,
  program, and/or class (any combination, each optional = "all").
- A due date on the case study, applied to every student the case is
  targeted at.
- On publish, bulk-create `assigned_cases` rows (status `pending`) for
  every matching student who doesn't already have one, and send each of
  them a notification.
- Reuse the existing `assigned_cases` status lifecycle
  (`pending` -> `active` -> `completed`) for opt-in: a student "opts in"
  by starting the attempt (already flips `pending` -> `active` today).
  No separate accept/decline step.
- Add an `expired` **flag** (not a hard block) for assignments whose due
  date passes while still `pending` or `active` — student can still
  start/finish late; faculty and mentor views show it as overdue.
- Does **not** cover: mentor-initiated per-student assignment (unchanged),
  AI evaluation, rubric builder, director/analytics reporting on
  targeting, or admin CRUD UI for departments/classes (seeded like
  `career_tracks`, list-only for this spec) — all future work.

## 4. Proposed Schema Changes

### 4.1 `departments` / `classes` — new managed reference lists

Mirrors the existing `career_tracks` table exactly (id, name,
description; seeded via migration, exposed read-only via
`GET /admin/departments` and `GET /admin/classes`, same as
`GET /admin/career-tracks`). Admin CRUD UI for these lists is out of
scope for this spec.

```sql
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id),
    ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes(id);

CREATE INDEX IF NOT EXISTS idx_students_department_id ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
```

`department_id` + `class_id` (both new, on `students`) plus the existing
free-text `users.program` together form the three targeting dimensions.
Faculty's Program dropdown is populated from `SELECT DISTINCT program`
over existing students (unchanged pattern); Department/Class dropdowns
come from the new reference tables.

### 4.2 `case_studies` — targeting + deadline

```sql
ALTER TABLE case_studies
    ADD COLUMN IF NOT EXISTS target_department_id INT REFERENCES departments(id),
    ADD COLUMN IF NOT EXISTS target_program VARCHAR(100),
    ADD COLUMN IF NOT EXISTS target_class_id INT REFERENCES classes(id),
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
```

Each `target_*` column is nullable; null means "no filter on this
dimension" (matches every value). A case with all three null targets
every active student — that remains a supported (if unlikely) choice.
A student with a null `department_id`/`class_id` (legacy/incomplete
profile) is excluded from a case that filters on that dimension — a
null on the case is "match everyone," a null on the student is "matches
nothing specific."

### 4.3 `assigned_cases` — deadline + expiry

```sql
ALTER TABLE assigned_cases
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(20) NOT NULL DEFAULT 'mentor';
    -- assignment_source: 'mentor' | 'faculty_publish'
```

`due_date` is copied from `case_studies.due_date` at assignment time (a
snapshot, so a later edit to the case's due date doesn't silently move
deadlines students already saw). `assignment_source` distinguishes
faculty bulk-targeting from mentor manual assignment for reporting.

No new `status` value or CHECK constraint change is needed — "expired"
is a **derived, display-only flag** (`due_date < NOW() AND status IN
('pending','active')`), not a stored status. This keeps the existing
`pending` -> `active` -> `completed` lifecycle and attempt-start logic
completely untouched; overdue assignments remain fully startable and
completable, just visually flagged as late wherever they're listed
(student list, mentor roster, faculty analytics).

## 5. Proposed API Changes

### 5.1 Admin — user creation / CSV import

- `GET /admin/departments`, `GET /admin/classes` — list endpoints,
  mirroring `GET /admin/career-tracks`.
- `AdminUserCreate` gains `department_id: Optional[int]` and
  `class_id: Optional[int]` (student-only, like `career_track_id`),
  each validated to exist (`ensure_department`/`ensure_class`, mirroring
  `ensure_career_track`).
- CSV template/import gains `Department` and `Class` columns alongside
  the existing `Program` and `Batch`, resolved by name to
  `department_id`/`class_id` at import time.

### 5.2 Faculty — targeting at publish

- `GET /faculty/targeting-options` — `departments` and `classes` from
  the new reference tables, plus distinct `program` values across active
  students, for the targeting picker.
- `PATCH /faculty/cases/{id}/targeting` — sets
  `target_department_id` / `target_program` / `target_class_id` /
  `due_date` on a draft case (called before publish).
- `POST /faculty/cases/{id}/publish` (existing endpoint) — after the
  existing validation, additionally:
  1. Resolves matching students (`students` JOIN `users` filtered by the
     three nullable target columns).
  2. For each match without an existing `assigned_cases` row and without
     a prior attempt on this case, inserts one `assigned_cases` row
     (`status='pending'`, `assignment_source='faculty_publish'`,
     `due_date` copied from the case).
  3. Writes one `notification_log` row per newly-assigned student
     (`event_type='case_published'`).
  4. Returns a summary: `{ "matched_students": N, "newly_assigned": M }`.
- `POST /faculty/cases/{id}/retarget` — published cases only; re-runs
  the same matching + assign + notify logic against the case's current
  targeting criteria (which can be updated first via the same `PATCH`
  endpoint), so faculty can widen an audience after publishing without
  creating a duplicate case. Students already assigned are skipped.

### 5.3 Overdue visibility

- No scheduled sweep needed since expiry is derived, not stored. Any
  endpoint returning an `assigned_cases` row (student list, mentor
  roster, faculty analytics) includes an `is_overdue` boolean computed
  as `due_date IS NOT NULL AND due_date < NOW() AND status IN
  ('pending', 'active')`.

## 6. Frontend Changes

- Faculty Case Builder: a "Publish Settings" step/panel with three
  dropdowns (Department, Program, Class, each optional, Department/Class
  sourced from the new reference tables) and a due-date picker, shown
  before the existing publish confirmation. A "Retarget" action on
  already-published cases reopens the same panel.
- Admin Users: add Department and Class select fields (from the new
  reference lists) to the manual creation drawer and CSV template/import.
- Student case-study list: show the due date on assigned-pending/active
  cards; show an "Overdue" badge when `is_overdue` is true (still fully
  usable, not blocked).
- Mentor roster / Faculty analytics: surface overdue assignments among
  a student's/cohort's assigned cases for visibility.

## 7. Decisions Log (resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Free-text or managed list for department/program/class? | Managed list for department and class: new `departments`/`classes` tables mirroring `career_tracks` (seeded, list-only, no admin CRUD UI yet). `program` stays the existing free-text `users.program` column. |
| 2 | Editable targeting after publish? | Editable: a `POST /faculty/cases/{id}/retarget` action re-runs matching + assign + notify against updated criteria; already-assigned students are skipped. |
| 3 | Hard-block or allow late completion past due date? | Allow late completion. No new stored status; overdue is a derived `is_overdue` flag surfaced in student/mentor/faculty views. Attempt start/completion logic is unchanged. |
| 4 | Explicit opt-in step or is starting the attempt enough? | Starting the attempt is the opt-in, no separate accept/decline UI, matching today's mentor-assignment behavior. |
| 5 | Student matches on some but not all target dimensions (e.g. no class assigned)? | Excluded: a null on the student's `department_id`/`class_id` does not match a specific case filter on that dimension. A null filter on the case (no targeting set for that dimension) matches everyone. |

## 8. Implementation Order

1. Migration: `departments`, `classes` tables (seeded); `students.department_id/class_id`;
   `case_studies.target_department_id/target_program/target_class_id/due_date`;
   `assigned_cases.due_date/assignment_source`.
2. Admin: `GET /admin/departments`, `GET /admin/classes`; add department/class to
   user creation and CSV template/import.
3. Faculty: targeting options endpoint, targeting PATCH endpoint,
   publish endpoint bulk-assign + notify logic, retarget endpoint.
4. Shared `is_overdue` computation surfaced wherever `assigned_cases` rows
   are returned (student list, mentor roster, faculty analytics).
5. Faculty Case Builder UI: publish settings panel + retarget action.
6. Admin Users UI: department/class fields.
7. Student case list UI: due date display, overdue badge.
8. Frontend build + backend checks.

## 9. Definition of Done

- [ ] `departments` and `classes` reference tables exist, seeded, and listable via admin endpoints
- [ ] Admin can set department and class when creating a student (manual + CSV)
- [ ] Faculty can set department/program/class targeting and a due date before publishing
- [ ] Publishing a targeted case bulk-creates `assigned_cases` rows for every matching, not-yet-assigned, not-yet-attempted student
- [ ] Publishing a targeted case sends a notification to every newly-assigned student
- [ ] Each assignment snapshots the case's due date
- [ ] Faculty can retarget an already-published case to reach additional matching students
- [ ] Overdue assignments are flagged (`is_overdue`) but remain fully startable/completable
- [ ] Student case list shows due dates and an overdue badge
- [ ] Frontend build and backend checks pass

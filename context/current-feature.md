# Current Feature

## Status

In Progress

## Feature

SPEC_16 Faculty → Course → Student Mapping

## Spec File

`context/features/SPEC_16_FACULTY_STUDENT_COURSE_MAPPING.md`

## Goals

- Build the admin-controlled structural layer (faculty-to-section, student-to-section) and the faculty-controlled academic layer (case-to-section assignment) on top of SPEC_12's `class_sections`/`faculty_sections`/`student_sections`/`case_section_assignments` tables
- Admin Portal: new `/admin/sections` Section Management page (list/create sections, filter by course/batch/status, flag unassigned-faculty sections), "Manage Faculty" drawer, "Manage Students" drawer (with bulk CSV enroll), and a "Teaching Sections" block on the faculty user detail page
- Faculty Portal: "My Sections" block on the dashboard, section-grouped Students page (replacing attempt-based grouping), "Assign to Section" flow from the Case Library (multi-section select, due date, note, notifies all enrolled students), and an "Assigned Cases" tracking tab with per-student progress
- Student Portal: Case Studies page grouped by source ("Assigned by Your Faculty" vs "Assigned by Your Mentor"), plus in-app + email notification on faculty assignment
- New endpoints under `/api/admin/sections/*`, `/api/faculty/sections/*`, `/api/faculty/cases/{id}/assign`, `/api/faculty/cases/assigned*`, `/api/student/cases`, and an internal case-assigned notification trigger
- Confirm SPEC_12 tables (`class_sections`, `faculty_sections`, `student_sections`, `case_section_assignments`, and `assigned_cases.assignment_source`/`section_assignment_id`) already exist before starting; run the SPEC_12 migration first if any are missing

## References

- `context/project-overview.md`
- `context/features/SPEC_16_FACULTY_STUDENT_COURSE_MAPPING.md`
- `context/features/SPEC_12` work (courses/sections schema and admin/faculty groundwork this spec builds on)

## Implementation Order (per spec's Build Order)

1. Admin: Section Management page (`/admin/sections`) — list + create sections
2. Admin: Manage Faculty drawer — assign/remove faculty per section
3. Admin: Manage Students drawer — enroll/remove students per section
4. Admin: Faculty detail page — add "Teaching Sections" block
5. Faculty: My Sections on dashboard — reads from `faculty_sections`
6. Faculty: Students page — section-grouped roster
7. Faculty: Assign to Section flow — case library → assign modal → write records
8. Faculty: Assigned Cases tracking tab — progress view
9. Student: Case list — show faculty-assigned vs mentor-assigned, grouped
10. Notification dispatch — email + in-app on case assignment

## Definition of Done

- [x] Admin can create sections, assign/remove faculty (with required subject field), and enroll/remove students (single + bulk CSV) via `/admin/sections`
- [ ] Faculty detail page shows a "Teaching Sections" block sourced from `faculty_sections`
- [x] Faculty dashboard shows "My Sections" with per-section student/active-case counts and updated summary totals (My Students, Simulations Running, Pending Reviews) — already built under SPEC_12
- [x] Faculty Students page groups rosters by section, each student showing capability score/attempts/status — already built under SPEC_12 (not collapsible yet, and links to no detail view yet)
- [x] Faculty can assign a published case to one or more sections from the Case Library, seeing the notified-student count before confirming; writes `case_section_assignments` + one `assigned_cases` row per enrolled student — already built under SPEC_12 ("Assign to Class")
- [ ] Faculty Case Library has an "Assigned" tab showing per-assignment progress (already built under SPEC_12), with a "View Detail" per-student breakdown (not yet built)
- [ ] Student Case Studies page groups cases into "Assigned by Your Faculty" vs "Assigned by Your Mentor", each faculty-assigned case showing due date/note
- [ ] Students receive in-app + email notification immediately when a faculty assigns a case to their section
- [ ] Frontend build passes; backend endpoints verified end-to-end against the live dev DB

---

## History

- 2026-07-04: Started implementation on branch `feature/faculty-course-student-mapping`
  (branched from `main`). Audited the spec against the codebase first and found
  most of the Faculty/Student sides were already built under SPEC_12: faculty
  dashboard "My Sections", section-grouped Faculty Students page, the
  "Assign to Class" case-to-section flow, and the Case Library "Class
  Assignments" progress tab all already existed and matched the spec's intent
  (see updated Definition of Done above for the exact per-item status). The
  real gap was on the Admin side, which only supported managing sections by
  drilling into a course on `/admin/courses` — no cross-course list, no way
  to remove a faculty/student from a section, and no bulk enrollment.

  Built the spec's dedicated Admin Section Management page: `GET
  /admin/sections` (new flat endpoint in `backend/services/admin/router.py`,
  filterable by `course_id`/`batch_id`/`status`, returning course/batch/
  semester names and the assigned-faculty list per section so an unassigned
  section can be flagged), `DELETE /admin/sections/{id}/faculty/{faculty_id}`,
  `DELETE /admin/sections/{id}/students/{student_id}` (soft-removes via a new
  `student_sections.status = 'removed'`, matching the existing `'dropped'`
  convention, and clears the student's `current_section_id` if it pointed at
  this section), and `POST /admin/sections/{id}/students/bulk` (CSV import by
  email, per-row savepoint isolation mirroring the existing user-CSV-import
  pattern). Added `frontend/src/pages/admin/AdminSections.tsx` at
  `/admin/sections` (new sidebar nav item) with course/batch/status filters,
  section cards showing the "Unassigned ⚠" flag and cases-assigned count,
  a "New Section" modal (course → batch/semester → name), and "Manage
  Faculty"/"Manage Students" drawers with add, remove, and bulk-CSV-upload
  actions. Left the existing `/admin/courses` page and its inline section
  management untouched — it still works for course/batch setup.

  Verified end-to-end against the live dev DB: created an isolated throwaway
  test course/batch/section, exercised assign-faculty → remove-faculty (plus
  a repeat-remove 404 check), enroll-student → remove-student (plus a
  repeat-remove 404 check), and a bulk CSV upload with one valid and one
  invalid row (confirmed partial success with a per-row error message), then
  deleted the test course (cascades through batch/section/enrollment rows)
  and confirmed the original two sections were unaffected. Frontend
  (`tsc -b && vite build`) and backend (`py_compile`) both passed; could not
  visually drive the new page in a browser since no headless-browser tool is
  available in this environment.

  Follow-up same day: user reported "admin can not assign courses/sections to
  a student" after trying the app directly. Turned out to be the new
  `/admin/sections` page not yet being visible to them (confirmed once
  pointed there — "I can see the option now"), not a functional bug; live DB
  inspection during the conversation showed they'd already successfully
  created a PGDM course/section and assigned a student to it via the new
  Manage Students drawer while we were talking. While addressing this, tightened
  the student picker in that drawer per the spec's exact requirement (only
  show students matching the section's course/batch and not already enrolled
  elsewhere): added `GET /admin/sections/{id}/eligible-students` (permissive
  on `NULL` course/batch so newly-created, not-yet-assigned students remain
  pickable everywhere, strict-match once a student has a course/batch, and
  excluded entirely once `current_section_id` is set) and wired
  `AdminSections.tsx`'s Manage Students dropdown to it instead of the
  unfiltered all-students list, refreshing it after every enroll/remove/bulk
  action. Verified against the live DB directly (queried real `students` rows
  including the user's own just-created PGDM enrollment) that the endpoint
  correctly excludes an already-enrolled student from their own section's
  list while keeping unassigned students eligible everywhere. Frontend and
  backend builds both re-verified clean after the change.

  Remaining before this spec is fully done: the "Teaching Sections" block on
  the faculty user detail page (`/admin/user/:id` is still a full
  placeholder — building this also means giving that page real content for
  the first time), a per-student "View Detail" breakdown on the faculty
  Assigned Cases tab, the student Case Studies page grouping into "Assigned
  by Your Faculty" vs "Assigned by Your Mentor" (currently a flat filterable
  list), and a real in-app notification bell (currently icon-only — no
  backend-fed dropdown/unread state anywhere in the app, though the
  email-notification-log write on assignment already exists from SPEC_12).

- 2026-07-04: SPEC_16 Faculty → Course → Student Mapping moved to In Progress.
  Scope covers the admin structural layer (Section Management page, Manage
  Faculty/Students drawers, faculty "Teaching Sections" block), the faculty
  academic layer ("My Sections" dashboard block, section-grouped Students
  page, "Assign to Section" case flow, "Assigned Cases" tracking tab), the
  student-facing grouped case list (faculty- vs mentor-assigned), and the
  case-assignment notification trigger — all building on SPEC_12's
  `class_sections`/`faculty_sections`/`student_sections`/
  `case_section_assignments` schema.

- 2026-07-03: Started the "Bugs-fixes" initiative on branch `Bugs-fixes`
  (branched from `main`, separate from the not-yet-merged
  `feature/platform-audit` docs branch), working page-by-page through
  SPEC_14's 🔴 findings. Round 1 (`/student/dashboard`): fixed the
  hardcoded header identity by wiring `DashboardLayout.tsx` to real
  `GET /student/profile` data (name from the decoded JWT, career
  track/course from the profile call) — this layout is shared across
  every student page, so the fix applies everywhere, not just the
  dashboard. Replaced the dashboard's generic "Unable to load your
  dashboard right now" catch-all with a `describeDashboardError()`
  helper that surfaces the real HTTP status/detail. Fixed the actual
  root cause identified by the audit: `register_user()` in
  `backend/services/auth/service.py` now creates a `students` row and
  seeds all capability rows at 0 for `role="student"` (and a `mentors`
  row for `role="mentor"`), mirroring what Admin-driven user creation
  already does, so `/auth/register` can no longer produce a
  profile-less account that 404s on every dashboard load. Added a new
  `active_case` field to `GET /student/dashboard/summary`
  (`backend/services/student/router.py`) sourced from the first
  `assigned_cases` row with `status='active'`, and wired the hero
  "Continue Active Case" button and the "Active Case Study" card to it
  — real case title/domain/difficulty/due-date when one exists, a real
  empty state with a "Browse Case Studies" link when there isn't one;
  removed the fully-fabricated 6-stage progress indicator and fake
  "45 min / Progress 50%" line since no real per-stage attempt data is
  available yet. Also fixed the "View Capability Profile" button,
  which had no link at all.

  Incidental but significant finding during verification: the standard
  seed test accounts (`student@pcdc.com`, `student2@pcdc.com` in
  `backend/seeds/seed_users.py`) have been missing `students` rows
  since project init — `insert_seed_user()` only ever inserted into
  `users`. This is almost certainly the exact account/scenario behind
  the original bug report. Fixed the seed script the same way as
  `register_user()`, and backfilled the two already-existing broken
  accounts directly in the dev DB (created their `students` rows +
  seeded capabilities) so they're usable immediately without a full
  reseed.

  Deferred per explicit user decision: the Capability Matrix (blocked
  on the Attempt Flow being wired up, plus a taxonomy mismatch between
  SPEC_13's hardcoded categories and the real backend's flat capability
  list) and the static "Your next challenge" text / "Active" status
  badge (intentional UX copy, not fake data). The Mentor
  Support/Career Pathway/AI Coaches/Achievements/Recent Evaluations
  cards that also appear on this same dashboard page were left
  untouched — those belong to SPEC_14 Sections 2e-2h, which are later,
  lower-priority rounds, not this one.

  Verified end-to-end against the live dev DB: registered a fresh
  student via `/auth/register` and confirmed dashboard/profile now
  return 200 (previously 404); confirmed `student@pcdc.com` (broken
  since init) now loads correctly after the seed backfill; inserted
  and then removed a temporary `assigned_cases` row to confirm
  `active_case` populates with real data and clears correctly. All
  test data cleaned up afterward. Frontend build (`tsc -b && vite
  build`) passed; could not visually screenshot the page since no
  headless-browser tool is available in this environment.

- 2026-07-03: Implemented SPEC_13 on `feature/capability-matrix-component`.
  Added `frontend/src/components/student/CapabilityMatrix.tsx` (a
  TypeScript component, matching the codebase's existing convention
  rather than the spec's illustrative `.jsx` path): a 2x2 grid of the 4
  category boxes plus a single shared accordion panel driven by one
  `activeCategory` state value, using the exact hardcoded data object
  from the spec (no API calls). Replaced the student dashboard's
  Capability Matrix section — which rendered blank whenever
  `summary.capability_scores` came back empty from the live API — with
  this component, and removed the now-unused `CAPABILITY_ICONS` map and
  three now-unused lucide icon imports (`BarChart3`, `CheckCircle2`,
  `Target`) from `frontend/src/pages/student/Dashboard.tsx`. Styling
  reuses only colors already present in the file (`#c9a227` gold,
  `#081d3a` navy, `#e6e8eb`/`#6b7280`/`#111827`/`#fff7df`), introducing
  no new tokens. Frontend build (`tsc -b && vite build`) passed; booted
  both the backend and frontend dev servers to confirm no startup
  errors, but could not visually drive the page in a browser since no
  headless-browser tool (e.g. `chromium-cli`, Playwright) is installed
  in this environment — correctness rests on the passing TypeScript
  build and matching the spec's data/logic exactly. No API wiring was
  done, per the spec.

- 2026-07-03: SPEC_12 Courses, Faculty Management, Student Management &
  Case Assignment marked Completed (all Definition of Done items
  checked). SPEC_13 Student Dashboard Capability Matrix Component moved
  to In Progress: fix the blank Capability Matrix section on the
  student dashboard with a 2x2 category grid and a shared accordion
  panel showing 5 sub-capabilities per category, using hardcoded data
  only — no API wiring in this pass.

- 2026-07-03: Finished the 4 remaining SPEC_12 items on `main`, closing
  out every unchecked box in the Definition of Done. Admin Users CSV
  import: added `POST /admin/users/import` (multipart file upload,
  `Name/Email/Role/Program/AdmissionYear/CourseCode/BatchName/SectionName/MentorID`
  columns, per-row savepoint isolation so one bad row doesn't roll back
  earlier successful rows, course/batch/section resolved by name) plus
  a matching "Import CSV" button and inline error-report panel on the
  Admin Users page; updated the template download to the new columns.
  Faculty completion-rate view: added a "Class Assignments" section to
  the Case Library page consuming the existing (previously
  frontend-less) `GET /faculty/cases/assigned` and `PATCH
  /faculty/case-assignments/{id}/close` endpoints, with a per-assignment
  completion-rate bar and Close button. Faculty Case Builder tagging:
  added `case_studies.recommended_semesters`/`recommended_course_ids`
  read/write support (new `recommendation` field alongside
  metadata/timing/marks), a new `GET /faculty/courses` endpoint, and a
  "Recommended Course & Semester" panel (semester chips, course
  checkboxes) in the case builder; soft tag only, does not restrict
  assignment. Faculty Analytics: added `GET /faculty/analytics/summary`
  (per-section student count, average capability score, cases assigned,
  completion rate, plus faculty-wide totals) and replaced the Analytics
  placeholder page with a real bar chart (Recharts) and per-section
  table. Also installed the missing `python-multipart` dependency
  (required by FastAPI for file uploads) and added it to
  requirements.txt. Verified all four backend endpoints end-to-end
  against the live dev database via direct API calls (CSV import with
  valid/invalid/duplicate rows, section enrollment resolution,
  recommendation save/reload, assignment close/reopen, analytics
  aggregation correctness), then cleaned up all test data created
  during verification. Frontend build passed
  (`tsc -b && vite build`); could not visually drive the new UI in a
  browser because no headless-browser tool was available in this
  environment, so UI correctness rests on the passing TypeScript build
  plus the verified backend contracts.

- 2026-07-02: Implemented the core of SPEC_12 on
  `feature/courses-faculty-student-management`. Added migration 0008
  (`courses`, `semesters`, `batches`, `class_sections`, `faculty_sections`,
  `student_sections` with a partial-unique one-active-section constraint,
  `case_section_assignments`, plus new columns on `students`, `case_studies`,
  and `assigned_cases`) and a follow-up migration 0009 fixing a missed
  `assigned_cases.due_date` column. Built Admin course/batch/section
  management APIs and a new `/admin/courses` UI (create course with
  semester auto-seeding, add batches, create sections, assign faculty,
  enroll students, per-batch semester advancement with flagged students
  when no next-semester section exists). Added `section_id` to admin
  student creation and course/batch/section columns to the admin users
  list. Built Faculty `/faculty/sections` and `/faculty/students` roster
  APIs (replacing case-attempt-only visibility with real section
  enrollment) and a new Faculty Students page. Built the faculty
  "Assign to Class" flow end-to-end: `POST
  /faculty/cases/{id}/assign-section` bulk-creates `assigned_cases` rows
  and notifications for every enrolled student, wired into the Case
  Library with a section-picker dialog. Added `GET
  /faculty/cases/assigned` and a close-assignment endpoint (backend only,
  no frontend view yet). Added `GET /student/profile` and wired course/
  semester/batch/section/mentor identity into the student dashboard.
  Updated the student case list to show "Assigned by Faculty" vs
  "Assigned by Mentor" and due dates using the existing Completed tab.
  Fixed two bugs found during testing: a route-ordering collision where
  `/faculty/cases/{case_id}` was shadowing `/faculty/cases/assigned`, and
  the missing `due_date` column from migration 0008. Verified the full
  admin-to-student flow end-to-end with a headless browser (create
  course/batch/section, enroll student, assign faculty, publish a case,
  assign it to the section, confirm the student sees it with the correct
  badge and due date) with zero console errors. Deprioritized and left
  unstarted: Faculty Case Builder course/semester tagging, Faculty
  Analytics section dimension, and a dedicated CSV bulk-enrollment upload
  (CSV import doesn't exist anywhere in the codebase yet, only template
  download). Frontend build passed and backend Python syntax checks
  passed via `py`.

- 2026-07-02: SPEC_12 Courses, Faculty Management, Student Management &
  Case Assignment moved to In Progress. Scope updated to a full academic
  structure (courses, semesters, batches, class sections), faculty and
  student section enrollment, faculty-to-section case assignment
  ("Assign to Class") alongside existing mentor per-student assignment,
  admin course/section management and semester progression, and the
  corresponding faculty/student portal updates for section-based
  visibility. SPEC_11 (Case Study Schema Gap Analysis) is not fully
  complete — Admin Case Import, Student Attempt flow, AI evaluation
  against model answers, Mentor Thinking Path, and marks analytics
  remain unchecked — but work is intentionally moving to SPEC_12 next
  per direction.

- 2026-07-02: Continued SPEC_11 implementation on `main`. Added the
  Faculty Case Builder UI for the stakeholder case schema: a Case Metadata
  panel (case code, volume, subject, functional area, capability category,
  difficulty label, target learners, Bloom's levels), a Time & Marks
  Breakdown panel, a Student Instructions & Faculty Notes panel (8 fields),
  a Structured Written Questions editor (3 fixed question cards with marks,
  Bloom's level, word limits, instructions, model answer, alternative
  answers, marking scheme), and a Rapid Fire Questions editor (6 Q&A
  pairs). Wired Save Draft to persist all of it through the existing
  backend PUT endpoint. Verified end-to-end with a headless-browser run
  against the live dev server (login, draft creation, filling every new
  panel, save, and DB read-back all confirmed) with zero console errors.
  Frontend build passed.

  Also drafted `context/features/SPEC_15_CASE_PUBLISHING_TARGETING.md`
  covering the gap found while testing the intended admin-to-student
  flow: faculty cohort targeting (department/program/class) at publish
  time, publish-time notification, and a due-date/opt-in model for
  assigned cases. Not yet implemented; queued to start after the rest of
  SPEC_11.

- 2026-07-02: Continued SPEC_10 dashboard work on `feature/case-builder`.
  Added a `student` backend service module with a live `GET
  /api/v1/student/dashboard/summary` endpoint (overall capability score,
  per-capability scores, pending/completed simulation counts, current level,
  upcoming mentor session) backed by the shared TTL cache; added the TTL
  cache wrapper to the faculty dashboard summary endpoint; wired the student
  Dashboard page's score circle, level, capability matrix, and mentor-session
  card to live data. Found the Neon database was 3 migrations behind head
  (0004 vs 0007) and applied `alembic upgrade head`, which surfaced a
  pre-existing bug in the mentor `list_students` query (`ORDER BY` referenced
  an out-of-scope `u.name` alias, 500ing every roster/dashboard call) and
  fixed it. Verified student, faculty, mentor, and admin dashboard endpoints
  end-to-end against the live DB. Frontend build passed and backend Python
  syntax check passed via `py`.

- 2026-07-02: Started SPEC_11 implementation on
  `feature/case-schema-gap-analysis`. Added case schema migration for rich
  case metadata, time and marks breakdowns, instructional sections, structured
  written questions, rapid fire questions, written/rapid-fire responses, and
  attempt marks/timing/eligibility fields. Extended faculty case APIs to
  read/write metadata, timing, marks, instructions, written questions, and
  rapid fire questions. Exposed case code, subject, difficulty label, marks,
  and phase timing through case list APIs and student case cards. Frontend
  build passed and backend Python syntax check passed via `py`.

- 2026-07-02: SPEC_11 Case Study Schema Gap Analysis moved to In Progress.
  Scope updated to stakeholder case schema alignment, rich case metadata,
  structured written questions, rapid fire questions, marks scoring,
  phase-specific timing, eligibility rules, model-answer-aware AI evaluation,
  case library display updates, mentor thinking path updates, and marks
  analytics.

- 2026-07-02: Started SPEC_10 implementation on
  `feature/dynamic-data-mapping`. Added `assigned_cases` migration, shared TTL
  cache helper, admin APIs for optional mentor/career-track onboarding plus
  single and bulk mentor reassignment, mentor published-case selector and case
  assignment APIs, student assigned-case listing, attempt status transitions for
  assigned cases, rolling capability score updates with configurable recency
  weight, level progression, immediate score-drop alerts, completion
  notifications, and live student case-study UI. Frontend build passed and
  backend Python syntax check passed via `py`.

- 2026-07-02: SPEC_10 Dynamic Data & Role Mapping moved to In Progress.
  Scope updated to cross-portal relationship mapping, assigned case queueing,
  mentor and career track assignment flows, capability score recalculation,
  level progression, score-drop alerts, live dashboard aggregations, TTL
  caching, and notification wiring.

- 2026-07-02: Started SPEC_09 implementation on `feature/mentor-portal`.
  Added mentor portal migration for sessions, session_students,
  mentor_attempt_comments, alerts, and intervention metadata; replaced the
  mentor backend stub with dashboard, students, alerts, sessions,
  interventions, and thinking-path comment APIs; moved mentor API routing under
  `/api/v1`; added mentor frontend API client, layout/navigation, dashboard,
  students roster, and placeholder routes for remaining mentor modules.
  Frontend build passed and backend Python syntax check passed via `py`.

- 2026-07-02: SPEC_09 Mentor Portal moved to In Progress. Scope updated to
  mentor-only coaching workflows under `/mentor/*`, assigned-student roster,
  student detail with capability trends and AI suggestions, thinking path review,
  intervention logging, session scheduling/completion, alert handling, required
  mentor persistence, and dashboard summaries.

- 2026-07-01: Started SPEC_08 implementation on `feature/admin-portal`.
  Added admin operations migration, `/api/v1/admin` dashboard/users APIs,
  login activity tracking, admin layout/navigation, dashboard, users list,
  manual user creation drawer, status/role actions, reset-password queueing,
  CSV template download, and placeholder routes for remaining admin modules.

- 2026-07-01: SPEC_08 Admin Portal moved to In Progress. Scope updated to
  admin-only platform operations under `/admin/*`, user roster and onboarding,
  CSV imports, role-aware user detail, external case imports, system settings,
  notification logs/rules/broadcasts, and operational dashboard summary.

- 2026-06-30: Implemented SPEC_07c on `feature/rubric-builder`. Added rubric
  save/load APIs backed by `case_studies.evaluation_rubric`, fixed default
  criteria and weight validation, max two qualitative case-specific criteria,
  the `/faculty/rubric-builder/{case_id}` editor, active-attempt warning, reset
  behavior, and frontend/backend verification.

- 2026-06-30: SPEC_07c Rubric Builder moved to In Progress. Scope updated to
  per-case rubric editing, fixed global default criteria, adjustable weights
  totaling 100, max two qualitative case-specific criteria, rubric save/load
  APIs, publish-gate integration, and active-attempt warnings.

- 2026-06-30: Implemented SPEC_07b on `feature/ai-case-generation-async`.
  Added OpenAI `gpt-4o-mini` structured generation, async generation job
  creation/status endpoints, validation-before-save behavior, array storage for
  reflection questions and learning outcomes, editor polling, queued/in-progress
  UI, and per-section regeneration support.

- 2026-06-30: SPEC_07b answered questions recorded: standard model is
  `gpt-4o-mini`, reflection questions and learning outcomes are arrays,
  full-case generation should be async, and faculty review is sufficient as
  the output guardrail.

- 2026-06-30: SPEC_07b AI Case Generation moved to In Progress. Scope updated
  to the Generate with AI path, OpenAI structured generation, full-case and
  per-section generation, validation-before-save behavior, provenance updates,
  and frontend loading/error/retry states.

- 2026-06-30: Started implementation on feature/case-builder. Added
  faculty case-builder APIs for capabilities, draft create, editor fetch,
  manual save, AI generation, and publish validation. Replaced the frontend
  case-builder placeholder with entry cards, core fields, section editor,
  provenance tags, generation controls, save draft, and publish flow.

- 2026-06-30: SPEC_07a Case Builder moved to In progress. Scope updated to
  faculty case-builder entry flow, core fields, draft creation, shared section
  editor, manual saves, AI generation, provenance tracking, and publish
  validation.

- 2026-06-30: Started implementation on feature/faculty-cases. Added
  faculty API endpoints for dashboard summary and case list, replaced the
  placeholder faculty portal with routed faculty layout/navigation, and built
  `/faculty/dashboard` plus `/faculty/case-library`.

- 2026-06-30: SPEC_14 Faculty Portal moved to In Progress. Scope updated to
  seven faculty pages under `/faculty/*`: dashboard, case-library,
  case-builder, rubric-builder, students, analytics, and reports.

- 2026-06-29: SPEC_13 JWT Auth Implementation + Seed Users moved to
  In progress. Scope updated to backend seed users, JWT role payload
  verification, frontend backend-login integration, protected routing,
  role redirects, and logout.

- 2026-06-26: SPEC_10_11_12 Career, Achievements, and Mentor Support completed
  on feature/career_achievement_mentor. Added independent /career-pathway,
  /achievements, and /mentor-support routes with mock career readiness,
  achievement badge, leaderboard, mentor profile, upcoming session, notes,
  intervention, and session request flows. npm run build passed and all three
  routes returned 200 locally.

- 2026-06-26: SPEC_09 AI Coach Page completed on feature/ai-coach-page.
  Added /ai-coach with six coach cards, active coach selection, automatic
  opening messages, mock AI chat responses, new session reset, and mock session
  history. npm run build passed and /ai-coach returned 200 locally.

- 2026-06-26: SPEC_08 Capability Profile Page completed on feature/capability-profile.
  Added /capability-profile with Recharts radar chart, current vs previous-month
  capability datasets, 8 score cards, recent case-study performance table,
  recommended next-step cards, and independent sidebar navigation. npm run build
  passed and /capability-profile returned 200 locally.

- 2026-06-26: SPEC_07 Case Attempt Flow completed on feature/case-attempt-flow.
  Added /case-studies/:id/attempt with six sequential mock screens,
  persistent progress bar, elapsed timer, 200-word analysis gate, mock AI chat,
  solution validation, one-question-at-a-time defense, radar evaluation, and
  case study return link. npm run build passed and
  /case-studies/1/attempt returned 200 locally.

- 2026-06-26: SPEC_06 Case Detail Page completed on feature/case-detail-page.
  Added /case-studies/:id pre-flight detail page with exact mock data,
  case context sections, learning outcomes, reflection preview, sticky attempt
  sidebar, capabilities/career tags, and attempt navigation. npm run build
  passed and /case-studies/1 returned 200 locally.

- 2026-06-26: SPEC_05 My Case Studies Page completed on feature/my-case-studies.
  Added /case-studies with exact mock case study data, client-side
  domain/difficulty/status/search filters, responsive case cards, sidebar
  navigation active state, and route links for start/continue/results actions.
  npm run build passed and /case-studies returned 200 locally.

- 2026-06-25: Dashboard UI Phase 1 completed on feature/dashboard-ui-phase-1.
  Added /dashboard route with static student dashboard layout, sidebar,
  header/search/user area, welcome panel, score card, capability matrix,
  and lower dashboard placeholder cards. npm run build passed and
  /dashboard returned 200 locally.

- 2026-06-25: SPEC_03 frontend foundation completed on feature/frontend-foundation.
  React TypeScript Vite app created with Tailwind, React Router, Axios,
  Lucide React, mock AuthContext, AuthLayout, DashboardLayout, and
  /login plus /register routes verified by local access.

- 2026-06-25: SPEC_17 backend completed on feature/case-studies-system.
  Alembic 0002 applied successfully, all case study backend endpoints
  implemented under /api/v1/cases, and endpoint test suite passed
  27/27 checks with mocked Claude responses.

- 2026-06-25: Project initialized. Folder structure created by Cline.
  All 12 initial tables created on Neon via schema.sql.
  FastAPI backend running with auth module (register + login working).
  JWT auth tested via /docs - registration and login returning tokens.
  Neon pooler connection string configured in .env.
  Alembic installed, ready for migration 0002.
  Context files created: project-overview, ai-interaction,
  coding-standards, current-feature. Feature specs moved to
  context/features/ folder.

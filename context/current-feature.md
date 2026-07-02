# Current Feature

## Status

In Progress

## Feature

SPEC_12 - Courses, Faculty Management, Student Management & Case Assignment

## Spec File

`context/features/SPEC_12_COURSES_FACULTY_STUDENT_MANAGEMENT.md`

## Goals

- Introduce a real academic structure: courses, semesters, batches, and class sections
- Link faculty to the class sections they teach (`faculty_sections`)
- Link students to the one class section they are enrolled in (`student_sections`)
- Let faculty assign a published case study to an entire class section at once (`case_section_assignments`), alongside the existing mentor per-student assignment path
- Extend `assigned_cases` with `assignment_source` and `section_assignment_id` to distinguish section-based (faculty) assignments from mentor assignments
- Add Admin Course & Section Management: create courses (auto-seeds semesters), add batches, create class sections, assign faculty and students to sections (individual, bulk, and CSV import)
- Add an admin bulk "advance semester" action per batch
- Update Admin Users list/CSV import/user creation to capture course, batch, and section
- Update Faculty Dashboard to show real section counts, student counts, and cases assigned
- Update Faculty Students page to show the full class roster by section, including students with zero attempts (not just students who've attempted a case)
- Add Faculty "Assign to Class" flow on the case library, with due date and instructions, plus a per-section completion-rate view and close-assignment action
- Update Faculty Case Builder with recommended course/semester tagging (soft, non-restrictive)
- Update Faculty Analytics with a section dimension
- Update Student Dashboard to show course/semester/batch/section identity
- Update Student case list to separate faculty-assigned (by section) from mentor-assigned cases, with a Completed tab
- One-time admin-driven migration of existing students into course/section data (no automated migration)

## References

- `context/project-overview.md`
- `context/features/SPEC_12_COURSES_FACULTY_STUDENT_MANAGEMENT.md`
- `context/features/SPEC_08_ADMIN_PORTAL.md`
- `context/features/SPEC_10_DYNAMIC_DATA_MAPPING.md`
- `context/features/SPEC_11_CASE_SCHEMA_GAP_ANALYSIS.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`
- `context/features/SPEC_15_CASE_PUBLISHING_TARGETING.md`

## Answered Questions

- A student belongs to exactly one section at a time; no secondary/elective sections in phase 1
- Section naming is admin-defined at creation time and not editable after students are enrolled
- Existing students with no section are migrated via a one-time admin bulk enrollment CSV (student email + section_name); no automated migration
- Faculty assigning the same case to multiple sections creates a separate `case_section_assignments` record per section, with independent completion analytics per section
- Active/pending case assignments show in the student's main case list; completed cases move to a separate Completed tab

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_12_COURSES_FACULTY_STUDENT_MANAGEMENT.md`
3. Confirm current `users`, `students`, `case_studies`, `assigned_cases` schema and existing Admin, Faculty, and Student portal behavior
4. Add Alembic migration for `courses`, `semesters`, `batches`, `class_sections`, `faculty_sections`, `student_sections`, and `case_section_assignments` tables
5. Add Alembic migration for `students.course_id/batch_id/current_section_id/current_semester_number`, `case_studies.recommended_semester/recommended_courses`, and `assigned_cases.assignment_source/section_assignment_id`
6. Implement Admin course and batch management APIs (creating a course seeds its semesters)
7. Implement Admin section management APIs: create section, assign faculty, enroll students, bulk CSV enroll
8. Implement Admin bulk semester-advancement API
9. Update Admin Users UI and CSV import/template for course/batch/section fields
10. Build Admin Course & Section management UI
11. Implement Faculty sections-roster API and update Faculty Dashboard summary
12. Implement Faculty students-by-section API and update the Faculty Students page
13. Implement Faculty case-to-section assignment API ("Assign to Class"), assigned-cases completion view, and close-assignment action
14. Update Faculty Case Builder with recommended course/semester tagging
15. Update Faculty Analytics with a section dimension
16. Update Student profile/dashboard API and UI for course/semester/batch/section identity
17. Update Student case list API/UI to separate faculty-assigned (by section) vs mentor-assigned cases, plus a Completed tab
18. Build the one-time admin bulk tool to migrate existing students into course/section data
19. Run frontend build and relevant backend checks

## Definition of Done

- [x] `courses` table stores course name, code, total semesters, duration, and status
- [x] Creating a course auto-seeds its `semesters` rows
- [x] `batches` table stores batch name, start/end year, and status per course
- [x] `class_sections` table links course + semester + batch with a section name and academic year
- [x] `faculty_sections` table links faculty to sections with a subject
- [x] `student_sections` table links each student to their one active section (enforced via partial unique index)
- [x] `case_section_assignments` table records case-to-section assignments with due date, instructions, and status
- [x] `assigned_cases` gains `assignment_source` and `section_assignment_id`
- [x] Admin can create courses and batches; creating a course seeds semesters (course rename/status edit exists; batch edit does not)
- [x] Admin can create class sections and assign faculty and students to them (individual and bulk-by-selection)
- [ ] Admin Users CSV import (file upload) supports course/batch/section columns — deferred: no CSV upload/parse endpoint exists anywhere in the codebase yet (only template download), so this wasn't built as part of this pass. Admin Users list and the manual creation drawer do support course/batch/section.
- [x] Admin can run a bulk semester-advancement action per batch
- [x] Faculty Dashboard shows section count and student count drawn from real sections (a dedicated "cases assigned" tile was not added)
- [x] Faculty Students page lists the full class roster grouped by section, including students with zero attempts
- [x] Faculty can assign a published case to one or more sections via "Assign to Class"
- [ ] Faculty can view per-section assigned-case completion rates and close an assignment — backend endpoints exist (`GET /faculty/cases/assigned`, `PATCH /faculty/case-assignments/{id}/close`) and are tested, but no frontend screen was built to display them
- [ ] Faculty Case Builder supports recommended course/semester tagging — deprioritized, not started
- [ ] Faculty Analytics includes a section dimension — deprioritized, Analytics page remains the pre-existing placeholder
- [x] Student Dashboard shows course/semester/batch/section identity
- [x] Student case list separates faculty-assigned (by section) from mentor-assigned cases, with a Completed tab
- [x] Frontend build and relevant backend checks pass

---

## History

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

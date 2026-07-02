# Current Feature

## Status

In Progress

## Feature

SPEC_10 - Dynamic Data & Role Mapping

## Spec File

`context/features/SPEC_10_DYNAMIC_DATA_MAPPING.md`

## Goals

- Implement the dynamic relationship and data-flow layer across admin, faculty, mentor, student, and director portals
- Add `assigned_cases` persistence to separate case assignment intent from actual student attempts
- Ensure admin-created students seed user, student, capability rows, optional mentor assignment, optional career track, and onboarding notifications
- Support single and bulk student-to-mentor assignment with mentor load warnings and immediate mentor roster updates
- Support student-to-career-track assignment from admin and student flows, with downstream recommendation refresh behavior
- Keep faculty-to-student mapping case-based: faculty sees students only through attempts on faculty-created cases
- Implement mentor case assignment from the published case library to assigned students, with assignment status tracking and intervention logging
- Update student case-study lists to show assigned pending cases and "Assigned by Mentor" state
- Ensure capability scores update after completed attempts using rolling weighted average and configurable recency weight
- Add level progression checks after capability score updates
- Add immediate score-drop alert creation inside score update transactions
- Wire dashboard summary stats to live DB aggregations for student, faculty, mentor, admin, and director dashboards
- Add a thin in-memory TTL cache wrapper for dashboard summary endpoints
- Wire cross-portal notifications for mentor assignment, case assignment, simulation completion, score drops, level achievement, sessions, placement readiness, and delivery failures

## References

- `context/project-overview.md`
- `context/features/SPEC_10_DYNAMIC_DATA_MAPPING.md`
- `context/features/SPEC_09_MENTOR_PORTAL.md`
- `context/features/SPEC_08_ADMIN_PORTAL.md`
- `context/features/SPEC_13_JWT_AUTH_IMPLEMENTATION.md`
- `context/features/SPEC_07a_CASE_BUILDER.md`
- `context/features/SPEC_07c_RUBRIC_BUILDER.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- Case library scoping is open: all published cases are visible globally, with phase 1 student attempts driven by assigned cases
- Faculty-to-student relationship is case-based only; no direct faculty-student cohort assignment table
- Phase 1 student case selection is assigned cases only; future self-selection can unlock by current level and case difficulty
- Recency weight for capability score updates is admin-configurable, defaulting to 0.3
- Dashboard summaries use DB-level aggregations and a 5-minute in-memory TTL cache
- Capability scores are seeded and displayed as 0 until the first completed attempt
- Mentor load is a soft cap of 25 students, warned in UI but not hard-blocked in the database
- Reassigning a mentor preserves historical interventions and transfers open alerts to the new mentor

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_10_DYNAMIC_DATA_MAPPING.md`
3. Confirm existing user, student, mentor, career track, capability, case study, attempt, evaluation, alert, session, intervention, notification, and settings schema
4. Add `assigned_cases` migration and indexes
5. Add or confirm capability score seeding for new students
6. Implement shared TTL cache wrapper for dashboard summary endpoints
7. Implement capability score update logic after completed attempts using configurable recency weight
8. Add level progression checks after score updates
9. Add score-drop alert writes inside the same transaction as score updates
10. Implement admin single mentor assignment API and UI behavior
11. Implement admin bulk mentor assignment API and UI behavior
12. Implement admin and student career-track assignment APIs and UI behavior
13. Implement mentor published-case selector API
14. Implement mentor case assignment API with duplicate-attempt blocking, `assigned_cases` write, notification, and intervention log
15. Update student case-study list API and UI to read assigned pending cases and assignment status
16. Update attempt start/completion flow to transition assigned case status pending to active to completed
17. Update faculty student and analytics endpoints to use case-based student relationships
18. Update dashboard summary endpoints across portals to use live aggregation and cache
19. Wire notification events from the dynamic data flows
20. Run frontend build and relevant backend checks

## Definition of Done

- [x] `assigned_cases` table exists with student, case, assigner, assigned_at, status, and useful indexes
- [x] New student creation seeds user, student, and one capability row per capability with score 0
- [x] Single student creation supports optional mentor and career track assignment
- [ ] Bulk CSV import validates optional mentor and career track data with mentor load warnings
- [x] Admin can assign or reassign one student's mentor from user detail
- [x] Admin can bulk assign selected students to a mentor
- [ ] Mentor reassignment updates student roster visibility immediately and preserves intervention history
- [x] Open alerts for reassigned students transfer to the new mentor
- [x] Admin can assign or update a student's career track
- [ ] Student can self-select or update career track from the student career page
- [ ] Faculty student visibility is based on attempts on faculty-created cases only
- [x] Mentor can search/select published cases for assigned students
- [x] Mentor case assignment blocks cases already attempted by that student
- [x] Mentor case assignment creates an `assigned_cases` pending record
- [x] Mentor case assignment notifies the student and auto-logs a case-assigned intervention
- [x] Student case-study list shows assigned pending cases with "Assigned by Mentor" state
- [x] Attempt start changes matching assigned case status from pending to active
- [x] Attempt completion changes matching assigned case status from active to completed
- [x] Capability scores update after completed attempts using rolling weighted average
- [x] Recency weight is read from admin settings with default 0.3 fallback
- [x] Student level updates when overall score crosses configured thresholds
- [x] Score-drop alerts are written immediately in the score update transaction
- [ ] Student, faculty, mentor, admin, and director dashboard summary stats use live DB aggregation
- [ ] Dashboard summary endpoints use the shared 5-minute TTL cache wrapper
- [ ] Notification events are wired for mentor assignment, case assignment, simulation completion, score drops, level achievement, sessions, placement readiness, and delivery failures
- [x] Frontend build and relevant backend checks pass

---

## History

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

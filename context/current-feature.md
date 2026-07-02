# Current Feature

## Status

In Progress

## Feature

SPEC_09 - Mentor Portal

## Spec File

`context/features/SPEC_09_MENTOR_PORTAL.md`

## Goals

- Implement the Mentor Portal under `/mentor/*` as the human intervention layer for assigned students
- Keep mentor scope focused on capability trends, struggling or stagnant students, thinking paths, sessions, alerts, and intervention logs
- Build mentor role routing and navigation separate from student, faculty, admin, and director experiences
- Add `/mentor/dashboard` for assigned-student counts, at-risk counts, top performers, sessions this week, cohort weakness signals, urgent alerts, and upcoming sessions
- Add `/mentor/students` roster with search, status/career track/weakest capability/level filters, sorting, and row links to student detail
- Add `/mentor/student/:id` for student profile, capability trend, recent simulations, AI intervention suggestions, direct actions, and intervention history
- Add `/mentor/thinking-path` so mentors can inspect a student's full case attempt trace: initial analysis, AI conversation, solution, defense, and reflection
- Support mentor comments and per-stage flags on thinking paths, including flagging attempts for session discussion
- Add `/mentor/interventions` for filtering, viewing, creating, and updating mentor actions across assigned students
- Add `/mentor/sessions` for scheduling one-on-one and group sessions, completing sessions with notes, and writing completed sessions into interventions
- Add `/mentor/alerts` for active and dismissed system-generated student alerts with actions to view student, view thinking path, log intervention, or dismiss
- Add required persistence for sessions, session students, mentor attempt comments, and alerts if missing
- Add alert generation using immediate score-drop checks and APScheduler sweeps for inactivity, stagnation, low capability score, copy-paste risk, and placement-readiness concerns
- Use existing OpenAI configuration for mentor AI suggestions with a coaching-specific prompt
- Provide backend mentor APIs needed by each mentor page

## References

- `context/project-overview.md`
- `context/features/SPEC_09_MENTOR_PORTAL.md`
- `context/features/SPEC_13_JWT_AUTH_IMPLEMENTATION.md`
- `context/features/SPEC_08_ADMIN_PORTAL.md`
- `context/features/SPEC_10_11_12_CAREER_ACHIEVEMENTS_MENTOR.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- Mentor portal is the human intervention layer, not an evaluator, content creator, or platform operator
- Mentors are assigned up to 25 students and focus on early, intelligent intervention
- Sessions need a dedicated table because they have a scheduled-to-completed lifecycle separate from interventions
- Mentor attempt comments need a dedicated `mentor_attempt_comments` table
- Alert generation is hybrid: immediate score-drop checks plus APScheduler sweeps every 6 hours for slow-moving conditions
- Case assignment from mentor recommendations is immediate and appears in the student's pending list
- AI suggestions use the same OpenAI setup as case generation with a mentor-coaching-specific prompt
- Group sessions use one session record with a `session_students` join table

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_09_MENTOR_PORTAL.md`
3. Confirm existing auth, role routing, mentor assignment, student, capability, simulation attempt, AI conversation, reflection, intervention, case assignment, and settings-related schema
4. Confirm whether `sessions`, `session_students`, `mentor_attempt_comments`, and `alerts` tables already exist
5. Add Alembic migrations for missing mentor portal tables and enums
6. Define mentor API contracts and shared mentor response shapes
7. Build mentor auth/role guards and frontend mentor layout/navigation
8. Build `/mentor/students` list API and page with search, filters, sorting, status labels, and links to student detail
9. Build `/mentor/student/:id` API and page with capability profile, trend data, recent simulations, AI suggestions, actions, and intervention history
10. Build mentor AI suggestions API using published case library recommendations
11. Build case assignment API so recommended or selected cases appear in the student's pending list immediately
12. Build `/mentor/thinking-path` APIs and page for attempt trace, per-stage flags, overall comments, and flag-for-session behavior
13. Build `/mentor/alerts` APIs and page for active/dismissed alerts, filters, actions, and dismissal audit trail
14. Add score-drop alert writes inside score update flow and APScheduler sweeps for inactivity, level stagnation, low capability, copy-paste risk, and placement readiness
15. Build `/mentor/sessions` APIs and page for scheduling, upcoming/past views, completion notes, and intervention auto-write
16. Build `/mentor/interventions` APIs and page with filters, log modal, create, and update behavior
17. Build `/mentor/dashboard` summary APIs and page after roster, alerts, sessions, and interventions are available
18. Run frontend build and relevant backend checks

## Definition of Done

- [x] `/mentor/*` routes are protected for mentor users only
- [x] Mentor layout/navigation supports dashboard, students, student detail, thinking path, interventions, sessions, and alerts
- [x] Required persistence exists for sessions, session students, mentor attempt comments, and alerts
- [x] `/mentor/students` lists only the authenticated mentor's assigned students
- [ ] Student roster supports search, status, career track, weakest capability, and level filters
- [ ] Student roster supports sorting by capability score, last activity, and level
- [ ] Student roster shows status labels for On Track, At Risk, Stagnant, Top Performer, and Inactive
- [ ] `/mentor/student/:id` enforces mentor assignment ownership
- [ ] Student detail shows profile, career track, level, status, capability scores, trends, recent simulations, AI suggestions, actions, and intervention history
- [ ] AI suggestions identify weak areas and recommend published cases or exercises
- [ ] Recommended or selected case assignment appears in the student's pending list immediately
- [ ] `/mentor/thinking-path` shows initial analysis, AI conversation log, solution, defense, reflection, time taken, and final score for a selected attempt
- [ ] Thinking path supports per-stage comments and flags
- [ ] Thinking path supports overall mentor comments and flagging an attempt for session discussion
- [ ] `/mentor/alerts` lists active and dismissed alerts with type, student, and status filters
- [ ] Alerts support View Student, View Thinking Path, Log Intervention, and Dismiss actions
- [ ] Score-drop alerts are created immediately when score changes exceed the configured threshold
- [ ] APScheduler sweep creates alerts for inactivity, level stagnation, low capability score, copy-paste risk, and placement readiness concerns
- [ ] `/mentor/sessions` lists upcoming and past sessions
- [ ] Sessions can be scheduled for one-on-one and group mentoring
- [ ] Completed sessions save notes, link discussed thinking paths, and auto-create intervention entries
- [ ] `/mentor/interventions` lists actions with student, type, and date range filters
- [ ] Mentors can create and update interventions with type, date, notes, action taken, and optional follow-up date
- [x] `/mentor/dashboard` summarizes assigned students, at-risk students, top performers, sessions this week, weakness signals, urgent alerts, and upcoming sessions
- [x] Frontend build and relevant backend checks pass

---

## History

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

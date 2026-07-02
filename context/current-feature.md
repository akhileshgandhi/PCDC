# Current Feature

## Status

In Progress

## Feature

SPEC_11 - Case Study Schema Gap Analysis

## Spec File

`context/features/SPEC_11_CASE_SCHEMA_GAP_ANALYSIS.md`

## Goals

- Align the case study schema with stakeholder-provided case samples from `AI_Case_Samples.docx`
- Add missing case identity and classification fields: case code, volume, subject, functional area, capability category, Bloom's levels, target learners, and difficulty label
- Support stakeholder 5-level difficulty labels while preserving current numeric difficulty behavior where needed
- Add case time breakdown fields for reading, answer writing, and rapid fire phases
- Add marks breakdown fields for total, written, and rapid fire marks
- Add instructional content sections for student instructions, company/industry background, faculty notes, and key learning points
- Add structured `case_questions` persistence for the three written questions, word limits, Bloom's level, model answers, alternatives, and marking scheme
- Add `rapid_fire_questions` persistence for six quick-response questions per case
- Add student response persistence for written question responses and rapid fire responses
- Add attempt marks fields for written marks, rapid fire marks, total marks, eligibility, and phase-specific time spent
- Update Faculty Case Builder to create and edit the new metadata, structured questions, rapid fire questions, instructions, and faculty notes
- Update Student Case Attempt flow from one free-form answer to structured question responses plus a rapid fire phase
- Update AI evaluation to score against model answers, alternatives, and marking schemes while still deriving capability scores
- Update case library displays to show case code, subject, difficulty label, and marks/time breakdown
- Update Mentor Thinking Path to show structured written responses and rapid fire responses
- Update analytics to include marks distribution alongside capability scores

## References

- `context/project-overview.md`
- `context/features/SPEC_11_CASE_SCHEMA_GAP_ANALYSIS.md`
- `context/features/SPEC_07a_CASE_BUILDER.md`
- `context/features/SPEC_07c_RUBRIC_BUILDER.md`
- `context/features/SPEC_10_DYNAMIC_DATA_MAPPING.md`
- `context/features/SPEC_09_MENTOR_PORTAL.md`
- `context/features/SPEC_08_ADMIN_PORTAL.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- Stakeholder cases are the source of truth for the initial import schema
- Actual stakeholder cases use 5 named difficulty levels: Foundation, Regular, Pro, Expert, and Champion
- Current 7-level platform difficulty needs a compatibility strategy; recommended approach is adopting the 5 stakeholder levels for these cases
- Structured written assessment has three specific questions with marks, word limits, model answers, alternatives, and marking schemes
- Rapid Fire is a new post-written phase with six quick questions and 3 total marks
- Student attempts need both marks scores and capability scores
- Students should see both marks and capability-score outcomes because they answer different feedback needs
- 70% written completion eligibility determines whether an attempt is evaluated
- Bloom's Taxonomy data should be stored per question from day one, even if analytics come later

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_11_CASE_SCHEMA_GAP_ANALYSIS.md`
3. Confirm current `case_studies`, `case_study_attempts`, `cs_evaluations`, `cs_ai_conversations`, Faculty Case Builder, Student Case Attempt, case library, Admin Case Import, and Mentor Thinking Path behavior
4. Add Alembic migration for new case metadata columns on `case_studies`
5. Add Alembic migration for marks, eligibility, and phase timing columns on `case_study_attempts`
6. Add `case_questions`, `rapid_fire_questions`, `case_question_responses`, and `rapid_fire_responses` tables
7. Update backend case serialization/parsing helpers to include new metadata and structured sections
8. Update Faculty Case Builder APIs to read/write metadata, instructions, faculty notes, written questions, and rapid fire questions
9. Update Faculty Case Builder UI with metadata, question editor, rapid fire editor, student instructions, faculty notes, and key learning points
10. Update Admin Case Import mapping to accept the full stakeholder case structure
11. Update student case library APIs and cards to show case code, subject, difficulty label, time breakdown, and marks
12. Update Student Case Attempt flow to reading phase, structured written questions, word counts, eligibility check, and rapid fire phase
13. Update AI evaluation to compare against model answers, alternatives, and marking schemes
14. Persist per-question marks, rapid fire marks, total marks, feedback, and capability score updates
15. Update Mentor Thinking Path to display written question responses and rapid fire responses
16. Update faculty and director analytics to include marks distributions
17. Run frontend build and relevant backend checks

## Definition of Done

- [x] `case_studies` stores case code, volume, subject, functional area, capability category, Bloom's levels, target learners, and difficulty label
- [x] `case_studies` stores reading, answer writing, and rapid fire time breakdowns
- [x] `case_studies` stores total, written, and rapid fire marks breakdowns
- [x] `case_studies` stores student instructions, company background, industry background, faculty discussion notes, and key learning points
- [x] `case_questions` table stores question number, text, marks, Bloom's level, word limits, instructions, model answer, alternative answers, and marking scheme
- [x] `rapid_fire_questions` table stores six ordered quick questions and answers per case
- [x] `case_question_responses` table stores per-attempt written responses, word counts, AI marks, and feedback
- [x] `rapid_fire_responses` table stores per-attempt rapid fire responses, correctness, and marks awarded
- [x] `case_study_attempts` stores written marks, rapid fire marks, total marks, eligibility, and phase-specific time spent
- [ ] Faculty Case Builder can create and edit all new metadata and instructional fields
- [ ] Faculty Case Builder can create and edit three structured written questions
- [ ] Faculty Case Builder can create and edit six rapid fire questions
- [ ] Admin Case Import can map/import the stakeholder case schema
- [x] Student case library displays case code, subject, difficulty label, marks breakdown, and time breakdown
- [ ] Student attempt flow supports reading, structured writing, and rapid fire phases
- [ ] Written question response UI shows word count indicators and enforces eligibility rules
- [ ] Rapid fire UI supports six short-answer questions with phase timer
- [ ] AI evaluation awards marks per written question using model answers, alternatives, and marking schemes
- [ ] AI evaluation awards rapid fire marks and persists total marks out of 10
- [ ] Capability score updates still run after structured case completion
- [ ] Mentor Thinking Path shows written question responses and rapid fire responses
- [ ] Faculty/director analytics include marks distributions alongside capability scores
- [x] Frontend build and relevant backend checks pass

---

## History

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

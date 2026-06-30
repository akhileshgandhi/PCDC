# Current Feature

## Status

In Progress

## Feature

SPEC_14 - Faculty Portal

## Spec File

`context/features/SPEC_14_FACULTY_PORTAL.md`

## Goals

- Build the faculty portal under `/faculty/*`
- Add the faculty dashboard with summary stats and module quick links
- Add a case study library for browsing and managing faculty-owned cases
- Add a case builder for creating, editing, AI-generating, saving, and publishing case studies
- Add a rubric builder for weighted evaluation criteria per case
- Add a students roster with filters and faculty read-only drill-down views
- Add cohort and case analytics for capability trends and teaching effectiveness
- Add exportable reports for cohort, student, and case study summaries
- Confirm schema and ownership details before implementing case-builder, rubric, and review flows

## References

- `context/project-overview.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_14_FACULTY_PORTAL.md`
3. Inspect current faculty routing, auth role guards, dashboard layout patterns, and student portal components
4. Confirm exact case studies table names and fields from the existing Alembic migration
5. Confirm whether `simulation_attempts` supports a pending faculty review status
6. Confirm rubric storage model or add the required migration if no table exists
7. Confirm faculty-to-case ownership model
8. Locate the existing Claude/AI wrapper pattern for reuse by case-builder generation
9. Build `/faculty/dashboard` with summary cards and quick links
10. Build `/faculty/case-library` with filters, case rows/cards, and status actions
11. Build `/faculty/case-builder` and `/faculty/case-builder/{id}` with draft, AI generation, edit, save, and publish flow
12. Build `/faculty/rubric-builder/{case_id}` with default weighted criteria and 100% validation
13. Build `/faculty/students` with roster filters and student detail drill-down
14. Build `/faculty/analytics` with cohort and case-level aggregate views
15. Build `/faculty/reports` with report type, date range, and PDF/CSV export flow
16. Run frontend build and relevant backend checks

## Definition of Done

- [x] `/faculty/dashboard` renders after faculty login and shows summary stats
- [x] Dashboard quick links route to all six faculty modules
- [x] `/faculty/case-library` lists faculty-accessible case studies with search/filter/status controls
- [ ] Faculty can create a new case study draft from `/faculty/case-builder`
- [ ] Faculty can edit an existing case study from `/faculty/case-builder/{id}`
- [ ] Case builder reuses the existing server-side AI integration pattern for generation
- [ ] Faculty can save draft and publish case studies
- [ ] `/faculty/rubric-builder/{case_id}` supports default weighted criteria
- [ ] Rubric weights validate to 100%
- [ ] `/faculty/students` shows roster data with filters and read-only detail drill-down
- [ ] `/faculty/analytics` shows cohort and case-level capability/performance summaries
- [ ] `/faculty/reports` supports report type, date range, and PDF/CSV export flow
- [x] Faculty routes are protected by JWT role checks
- [x] Frontend build and relevant backend checks pass

---

## History

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

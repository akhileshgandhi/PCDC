# Current Feature

## Status

In Progress

## Feature

SPEC_08 - Admin Portal

## Spec File

`context/features/SPEC_08_ADMIN_PORTAL.md`

## Goals

- Implement the Admin Portal under `/admin/*` for platform operations
- Keep admin scope focused on users, onboarding, external case imports, system settings, and notifications
- Build admin role routing and navigation separate from student, faculty, mentor, and director experiences
- Add `/admin/users` for roster search, role/program/status/batch filters, pagination, row actions, and bulk actions
- Support manual user creation with welcome/set-password flow and no admin-managed raw passwords
- Support CSV user import with template download, upload, preview, inline validation, confirmation, and import summary
- Add `/admin/user/:id` for role-aware user profile editing, account actions, login history, and mentor assignment
- Add mentor assignment search with student-load display and overload warnings
- Add `/admin/settings` for thresholds, adaptive difficulty rules, mentor assignment rules, career tracks, notification channels, and AI/LLM configuration
- Ensure API keys in settings are write-only, masked in UI, never returned raw, and stored securely
- Add `/admin/notifications` for delivery log filters, retry failed notifications, editable notification rules, and broadcast sending
- Add notification log and notification rules persistence if missing
- Add `/admin/case-import` for external case import queue, upload, field mapping, review, approval, rejection, and draft save
- Reuse the faculty Case Builder case schema for imported case sections and core fields
- Add `/admin/dashboard` for operational summary, users by role, active users, pending imports, recent activity, and quick actions
- Provide backend admin APIs needed by each admin page

## References

- `context/project-overview.md`
- `context/features/SPEC_08_ADMIN_PORTAL.md`
- `context/features/SPEC_13_JWT_AUTH_IMPLEMENTATION.md`
- `context/features/SPEC_07a_CASE_BUILDER.md`
- `context/features/SPEC_07b_AI_CASE_GENERATION.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- Admin portal is for platform operations, not academic evaluation, mentoring, or institution-wide analytics
- PCDC is a closed system: no self-registration; accounts are created or imported by admins
- Admin should not handle raw passwords; account creation sends welcome/set-password links
- External cases are imported by admin and attributed to External / Institution
- Faculty can edit imported cases only when given editor rights
- Settings API keys are write-only fields and only masked values should be displayed
- Recommended mentor ratio is 1:25, with warnings when mentor load exceeds configured thresholds

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_08_ADMIN_PORTAL.md`
3. Confirm existing auth, role routing, user, student, mentor, case study, and settings-related schema
4. Confirm whether login events, activity events, notification log, and notification rules tables exist
5. Confirm SMTP/email provider behavior for welcome and reset-password emails
6. Define admin API contracts and shared admin response shapes
7. Build admin auth/role guards and frontend admin layout/navigation
8. Build `/admin/users` list API and page with filters, pagination, manual add, status toggle, and bulk export/deactivate hooks
9. Build user CSV template, upload, preview validation, confirm import, and summary flow
10. Build `/admin/user/:id` detail API and page with role-conditional fields, account actions, login history, and mentor assignment
11. Build settings storage and `/admin/settings` sections for thresholds, adaptive difficulty, mentor rules, career tracks, channels, and AI configuration
12. Add secure handling for masked/write-only API key fields
13. Build notification log/rules storage if missing
14. Build `/admin/notifications` APIs and page with delivery filters, retry, rules CRUD, and broadcast flow
15. Build `/admin/case-import` APIs and page for import queue, upload, mapping, review, approve, reject, and draft save
16. Build `/admin/dashboard` summary API and page after dependent operational data exists
17. Run frontend build and relevant backend checks

## Definition of Done

- [x] `/admin/*` routes are protected for admin users only
- [x] Admin layout/navigation supports dashboard, users, user detail, case import, settings, and notifications
- [x] `/admin/users` lists users with search, role, program, status, and batch filters
- [ ] Users list supports pagination and row actions for edit, deactivate/reactivate, reset password, and role change
- [ ] Manual Add User creates an account and triggers welcome/set-password flow
- [x] CSV import template downloads with required headers
- [ ] CSV upload preview flags missing email, duplicate email, invalid role, and other validation errors
- [ ] Confirmed CSV import creates valid accounts and reports created/skipped/failed counts
- [ ] `/admin/user/:id` loads role-aware profile, account metadata, and recent login history
- [ ] User detail supports editable profile fields allowed by role
- [ ] Mentor assignment shows active mentors with current student counts and overload warnings
- [ ] Settings page saves thresholds, adaptive difficulty, mentor rules, career tracks, notification channels, and AI/LLM configuration
- [ ] API keys are masked in the UI, write-only through APIs, and never returned raw
- [ ] Notifications page lists delivery logs with role, channel, status, and date filters
- [ ] Failed notifications can be retried
- [ ] Notification rules can be created, edited, and deleted
- [ ] Broadcast flow supports recipient targeting, channel selection, preview, confirmation, and delivery log entries
- [ ] Case import queue supports upload, mapping, edit, review, approve, reject, and save-draft flows
- [ ] Imported cases use the same section/core-field schema as faculty Case Builder
- [x] Admin dashboard summarizes users, active users, pending imports, users by role, recent activity, and quick actions
- [ ] Frontend build and relevant backend checks pass

---

## History

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

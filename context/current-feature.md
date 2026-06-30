# Current Feature

## Status

In Progress

## Feature

SPEC_07c - Rubric Builder

## Spec File

`context/features/SPEC_07c_RUBRIC_BUILDER.md`

## Goals

- Implement the faculty Rubric Builder route at `/faculty/rubric-builder/{case_id}`
- Load an existing case before editing its rubric
- Pre-fill new rubrics with the six global default criteria and weights
- Let faculty adjust weights for thinking depth, logic, creativity, practicality, risk awareness, and reflection
- Keep the six default criteria fixed so capability scoring remains comparable across cases
- Validate that default criterion weights sum to 100 before saving
- Add Reset to Default behavior for the global 30/20/15/15/10/10 split
- Support up to two case-specific qualitative criteria
- Save rubric weights and case-specific criteria to the case record
- Connect saved rubrics to the Case Builder publish gate
- Show active-attempt warnings when rubric edits could affect in-progress student evaluations
- Preserve historical evaluation text and scores when future rubric criteria change

## References

- `context/project-overview.md`
- `context/features/SPEC_07c_RUBRIC_BUILDER.md`
- `context/features/SPEC_07a_CASE_BUILDER.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- Rubric model: fixed global default criteria with per-case weight adjustments
- Default weights: Thinking Depth 30%, Logic 20%, Creativity 15%, Practicality 15%, Risk Awareness 10%, Reflection 10%
- Case-specific criteria: qualitative only, capped at 2, no separate weight
- Storage approach: use the existing case record rubric field unless implementation discovers a blocking reason for a separate table

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_07c_RUBRIC_BUILDER.md`
3. Confirm the current case record field used for `evaluation_rubric`
4. Confirm Case Builder publish validation checks for saved rubric existence
5. Define rubric payload shape with fixed weights and case-specific criteria
6. Build `GET /api/v1/faculty/cases/{id}/rubric` returning saved rubric or defaults
7. Build `PUT /api/v1/faculty/cases/{id}/rubric` with weight-sum and max-criteria validation
8. Add frontend API helpers for rubric fetch/save
9. Add `/faculty/rubric-builder/:case_id` route
10. Build Rubric Builder page with back link, case title, default criteria controls, total validator, and save action
11. Add Reset to Default behavior
12. Add case-specific criteria add/remove behavior with max-2 cap
13. Show active-attempt warning when relevant
14. Confirm Case Builder publish blocker clears after rubric save
15. Run frontend build and relevant backend checks

## Definition of Done

- [x] `/faculty/rubric-builder/{case_id}` loads for an existing faculty-owned case
- [x] New rubric opens with six default criteria and 30/20/15/15/10/10 weights
- [x] Existing saved rubric loads exactly as saved
- [x] Faculty can adjust each default criterion weight with numeric controls
- [x] Running total is visible and save is disabled unless weights sum to 100
- [x] Reset to Default restores the global default weights
- [x] Faculty can add and remove case-specific qualitative criteria
- [x] Case-specific criteria are capped at 2
- [x] Backend validates weight total and criteria count before saving
- [x] Saved rubric persists to the case record
- [x] Case Builder recognizes saved rubric for publish validation
- [x] Active-attempt warning appears when rubric changes may affect in-progress evaluations
- [x] Historical evaluations are not retroactively changed by rubric edits
- [x] Frontend build and relevant backend checks pass

---

## History

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

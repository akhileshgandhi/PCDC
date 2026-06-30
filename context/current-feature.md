# Current Feature

## Status

In Progress

## Feature

SPEC_07b - AI Case Generation

## Spec File

`context/features/SPEC_07b_AI_CASE_GENERATION.md`

## Goals

- Implement the Generate with AI path for faculty case builder drafts
- Let faculty create a draft from core fields before making any AI call
- Add explicit full-case generation from the editor via a Generate Full Case Draft action
- Use the OpenAI API with `gpt-4o-mini` and structured JSON output for the 9 case sections
- Run full-case generation asynchronously so faculty can leave the editor while generation completes
- Validate AI output before saving generated content
- Preserve existing draft content if generation fails or returns malformed output
- Mark generated sections as `ai_generated` in section provenance metadata
- Populate the editor with generated situation, background, data, characters, constraints, objectives, timeline, reflection questions, and learning outcomes
- Store reflection questions and learning outcomes as arrays
- Support per-section generation and regeneration with existing sections provided as consistency context
- Show queued/in-progress, polling/refresh, retry, and inline error states for generation requests
- Use faculty review as the sufficient output guardrail before publish

## References

- `context/project-overview.md`
- `context/features/SPEC_07b_AI_CASE_GENERATION.md`
- `context/features/SPEC_07a_CASE_BUILDER.md`
- `context/features/SPEC_14_FACULTY_PORTAL.md`

## Answered Questions

- OpenAI model: `gpt-4o-mini`
- Reflection questions / learning outcomes storage: arrays
- Full-case generation mode: async
- Output guardrails: faculty review is sufficient

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_07b_AI_CASE_GENERATION.md`
3. Confirm existing case-builder draft creation, editor loading, section save, and provenance behavior from SPEC_07a
4. Confirm current backend route prefix for faculty case generation and align with existing API conventions
5. Confirm OpenAI client setup, `.env` key loading, timeout handling, and selected generation model
6. Define the AI case JSON schema and system prompt for all 9 case sections
7. Test prompt/schema directly against OpenAI with representative core fields
8. Build async generation job creation for `POST /api/v1/faculty/cases/{id}/generate` with `scope: full`
9. Add generation status/result retrieval so the editor can poll or refresh without blocking the request
10. Validate structured output before saving and fail without modifying draft content on malformed responses
11. Save generated sections and mark written sections as `ai_generated`
12. Wire the editor Generate Full Case Draft button to create the async generation job
13. Add queued/in-progress, polling/refresh, retry, and inline failure states on the frontend
14. Add per-section `scope: section` generation and regeneration support
15. Send existing non-target sections as context during per-section regeneration
16. Run frontend build and relevant backend checks

## Definition of Done

- [x] Generate with AI creates a draft from core fields without automatically calling AI
- [x] Editor shows a prominent Generate Full Case Draft button before generation
- [x] Backend full-case generation runs asynchronously
- [x] Backend full-case generation calls OpenAI `gpt-4o-mini` with structured JSON schema output
- [x] Generated output includes situation, background, data, characters, constraints, objectives, timeline, reflection questions, and learning outcomes
- [x] Reflection questions and learning outcomes are stored and returned as arrays
- [x] Backend validates generated output before saving
- [x] Failed or malformed AI output leaves existing draft content untouched
- [x] Successfully generated sections are saved with `ai_generated` provenance
- [x] Frontend shows queued/in-progress state while generation is in flight
- [x] Frontend can poll or refresh generation status
- [x] Frontend shows inline error and retry behavior on generation failure
- [x] Faculty review remains the output guardrail before publish
- [x] Per-section generation/regeneration works without changing unrelated sections
- [x] Per-section regeneration sends existing sections as consistency context
- [x] Frontend build and relevant backend checks pass

---

## History

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

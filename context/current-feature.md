# Current Feature

## Status

Completed

## Feature

SPEC_07 - Case Attempt Flow

## Spec File

`context/features/SPEC_07_CASE_ATTEMPT_FLOW.md`

## Goals

- Add a `/dashboard/case-studies/:id/attempt` route for students
- Build the mock-only six-screen case attempt flow
- Render one sequential screen at a time with no backward navigation
- Add a persistent progress bar and elapsed-time counter
- Implement briefing, initial analysis, AI discussion, solution, defense, and evaluation screens
- Use mock AI responses and mock evaluation data
- Do not connect this flow to backend APIs yet

## References

- `context/project-overview.md`
- `context/features/SPEC_07_CASE_ATTEMPT_FLOW.md`

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_07_CASE_ATTEMPT_FLOW.md`
3. Inspect the existing attempt placeholder route and case page components
4. Create the CaseAttempt page and attempt flow components
5. Add the `/dashboard/case-studies/:id/attempt` route to render `CaseAttempt`
6. Implement state management for current screen, timer, analysis, chat, solution, and defense answers
7. Implement Screen 1 briefing and Screen 2 analysis with the 200-word gate
8. Implement Screen 3 mock AI chat with cycling responses
9. Implement Screen 4 solution form requiring all four sections
10. Implement Screen 5 defense flow with one question at a time
11. Implement Screen 6 evaluation results with mock scores and radar chart
12. Verify the route and all screen transitions
13. Run `npm run build`
14. Fix all TypeScript, Vite, and layout startup errors

## Definition of Done

- [x] All 6 screens render without errors
- [x] Progress bar shows correct stage on each screen
- [x] Timer counts up from 0:00
- [x] Screen 2 word counter works and enables button at 200 words
- [x] Screen 3 mock AI chat sends and receives messages
- [x] Screen 4 requires all 4 sections before enabling submit
- [x] Screen 5 shows one question at a time
- [x] Screen 6 radar chart renders with mock scores
- [x] Screen 6 score label matches score range
- [x] "Back to My Case Studies" link works
- [x] Cannot navigate backwards between screens

---

## History

- 2026-06-26: SPEC_07 Case Attempt Flow completed on feature/case-attempt-flow.
  Added /dashboard/case-studies/:id/attempt with six sequential mock screens,
  persistent progress bar, elapsed timer, 200-word analysis gate, mock AI chat,
  solution validation, one-question-at-a-time defense, radar evaluation, and
  case study return link. npm run build passed and
  /dashboard/case-studies/1/attempt returned 200 locally.

- 2026-06-26: SPEC_06 Case Detail Page completed on feature/case-detail-page.
  Added /dashboard/case-studies/:id pre-flight detail page with exact mock data,
  case context sections, learning outcomes, reflection preview, sticky attempt
  sidebar, capabilities/career tags, and attempt navigation. npm run build
  passed and /dashboard/case-studies/1 returned 200 locally.

- 2026-06-26: SPEC_05 My Case Studies Page completed on feature/my-case-studies.
  Added /dashboard/case-studies with exact mock case study data, client-side
  domain/difficulty/status/search filters, responsive case cards, sidebar
  navigation active state, and route links for start/continue/results actions.
  npm run build passed and /dashboard/case-studies returned 200 locally.

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

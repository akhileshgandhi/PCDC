# Current Feature

## Status

Completed

## Feature

SPEC_06 - Case Detail Page

## Spec File

`context/features/SPEC_06_CASE_DETAIL.md`

## Goals

- Add a `/dashboard/case-studies/:id` route for students
- Build the mock-only case detail pre-flight page
- Reuse the existing dashboard layout and case badge components
- Show the full case header, situation, learning outcomes, and reflection preview
- Add the sticky right-column attempt info, capabilities, and career tracks cards
- Route start/continue actions to `/dashboard/case-studies/:id/attempt`
- Do not connect this page to backend APIs yet

## References

- `context/project-overview.md`
- `context/features/SPEC_06_CASE_DETAIL.md`

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_06_CASE_DETAIL.md`
3. Inspect the existing case studies route, placeholder detail route, and shared case components
4. Create the case detail page using the exact mock data from the spec
5. Replace the placeholder detail route with `CaseDetail`
6. Implement the back link to `/dashboard/case-studies`
7. Render the left column header, situation, outcomes, and reflection question preview
8. Render the sticky right column with attempt state, capabilities, career tracks, and action button
9. Wire start/continue actions to `/dashboard/case-studies/:id/attempt`
10. Verify `/dashboard/case-studies/1` renders successfully in the browser
11. Run `npm run build`
12. Fix all TypeScript, Vite, and layout startup errors

## Definition of Done

- [x] Page renders at `/dashboard/case-studies/1`
- [x] Back link works
- [x] All sections render: header, situation, outcomes, reflection preview
- [x] Right column shows correct state for available / in_progress / completed
- [x] Start or continue button navigates to attempt flow
- [x] Sticky right column works on desktop scroll

---

## History

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

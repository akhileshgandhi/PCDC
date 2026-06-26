# Current Feature

## Status

Completed

## Feature

SPEC_05 - My Case Studies Page

## Spec File

`context/features/SPEC_05_MY_CASE_STUDIES.md`

## Goals

- Add a `/dashboard/case-studies` route for students
- Build the My Case Studies page using mock data only
- Reuse the existing dashboard sidebar/layout foundation
- Add filter controls for domain, difficulty, status, and search
- Render responsive case study cards with domain, difficulty, status, metadata, tags, and action buttons
- Add client-side navigation targets for start, continue, and results actions
- Do not connect this page to backend APIs yet

## References

- `context/project-overview.md`
- `context/features/SPEC_05_MY_CASE_STUDIES.md`

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_05_MY_CASE_STUDIES.md`
3. Inspect the existing dashboard route, layout, and sidebar components
4. Create the case studies page and supporting case card components
5. Add the `/dashboard/case-studies` route
6. Add the My Case Studies sidebar link with `BookOpen` icon and active state
7. Implement the exact mock data from the spec
8. Implement client-side domain, difficulty, status, and search filtering
9. Wire card buttons to the routes specified in the spec
10. Verify the page renders responsively at `/dashboard/case-studies`
11. Run `npm run build`
12. Fix all TypeScript, Vite, and layout startup errors

## Definition of Done

- [x] Page renders at `/dashboard/case-studies`
- [x] Sidebar link navigates to this page and shows active state
- [x] All 6 mock cards render with correct domain/difficulty/status
- [x] Domain filter works client-side
- [x] Difficulty filter works client-side
- [x] Status tabs filter correctly
- [x] Search filters by title and description
- [x] Card buttons navigate to correct routes
- [x] Completed card shows green checkmark badge
- [x] In Progress card shows Continue button
- [x] Responsive on mobile with 1 column

---

## History

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

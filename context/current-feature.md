# Current Feature

## Status

In progress

## Feature

SPEC_13 - JWT Auth Implementation + Seed Users

## Spec File

`context/features/SPEC_13_JWT_AUTH_SEED_USERS.md`

## Goals

- Implement complete JWT authentication from React frontend to FastAPI backend
- Create seed users for student, faculty, mentor, admin, and director roles
- Ensure login JWT payload includes `sub`, `email`, `role`, and `exp`
- Remove self-registration link from the login page and show administrator access text
- Add password visibility toggle to the login page
- Add shared frontend JWT auth utilities
- Update protected routing to use token validity and role checks
- Add logout controls for portal sidebars/pages
- Verify root and role-based redirects for all supported roles

## References

- `context/project-overview.md`
- `context/features/SPEC_13_JWT_AUTH_SEED_USERS.md`

## Implementation Order

1. Read and follow `context/project-overview.md`
2. Read `context/features/SPEC_13_JWT_AUTH_SEED_USERS.md`
3. Inspect current backend auth service, JWT creation, and user table fields
4. Create `backend/seeds/seed_users.py` with the exact seed users from the spec
5. Verify or fix backend login so JWT includes the user role
6. Verify `/api/v1/auth/login` and `/api/v1/auth/me`
7. Update frontend login to call the backend auth endpoint
8. Remove the register link and add administrator access text
9. Add password visibility toggle and login error states
10. Add shared frontend JWT utility functions
11. Update `ProtectedRoute` to use token validity and role checks
12. Add logout controls to portal navigation or placeholder pages
13. Verify all role redirects and unauthorized route protection
14. Run frontend build and relevant backend checks

## Definition of Done

- [x] Seed script runs cleanly and creates 6 users on Neon
- [x] Re-running seed script skips existing users without duplicates
- [ ] All 6 seed users can log in successfully
- [x] JWT contains `sub`, `email`, `role`, and `exp` fields
- [x] Each role redirects to its correct portal after login
- [x] Register link removed from login page
- [x] Administrator access text shown on login page
- [x] Password visibility toggle works
- [x] ProtectedRoute blocks missing-token and wrong-role access
- [x] Root `/` redirects correctly based on auth state
- [x] Logout clears token and returns user to `/login`
- [x] Shared auth utility file is used throughout the frontend
- [x] Frontend build and relevant backend checks pass

---

## History

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


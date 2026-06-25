# Current Feature

## Status

Completed

## Feature

SPEC_17 — Case Studies System

## Spec File

`context/features/SPEC_17_CASE_STUDIES.md`

## Goals

- Create 5 new database tables via Alembic migration 0002
- Implement all 9 backend endpoints for case study management
- Implement the 6-screen student attempt flow in React
- Implement faculty case builder UI
- Connect Claude API for AI discussion, defense, and evaluation
- Update capability scores after each completed attempt

## Implementation Order

1. Run Alembic migration 0002 to create new tables
2. Backend: models.py — add all Pydantic schemas
3. Backend: service.py — add create, list, attempt logic
4. Backend: router.py — wire up all 9 endpoints
5. Test all endpoints in /docs
6. Frontend: CaseList page — browse and filter cases
7. Frontend: CaseAttempt 6-screen flow
8. Frontend: CreateCase faculty builder
9. End-to-end test: faculty creates → student attempts → mentor views

## Definition of Done

- [x] Alembic migration runs cleanly
- [x] POST /api/v1/cases/create works for faculty role
- [x] GET /api/v1/cases/list returns published cases with tag filters
- [x] POST /api/v1/cases/attempt/start blocks second attempt correctly
- [x] POST /api/v1/cases/attempt/submit-analysis blocks under 200 words
- [x] POST /api/v1/cases/attempt/ai-message logs to cs_ai_conversations
- [x] POST /api/v1/cases/attempt/submit-defense triggers evaluation
- [x] cs_evaluations row created with all scores after defense
- [x] student_capabilities updated after evaluation
- [ ] CaseList page renders with domain/difficulty filters
- [ ] 6-screen attempt flow works end to end in browser
- [ ] Faculty CreateCase form submits successfully

---

## History

- 2026-06-25: SPEC_17 backend completed on feature/case-studies-system.
  Alembic 0002 applied successfully, all case study backend endpoints
  implemented under /api/v1/cases, and endpoint test suite passed
  27/27 checks with mocked Claude responses.

- 2026-06-25: Project initialized. Folder structure created by Cline.
  All 12 initial tables created on Neon via schema.sql.
  FastAPI backend running with auth module (register + login working).
  JWT auth tested via /docs — registration and login returning tokens.
  Neon pooler connection string configured in .env.
  Alembic installed, ready for migration 0002.
  Context files created: project-overview, ai-interaction,
  coding-standards, current-feature. Feature specs moved to
  context/features/ folder.

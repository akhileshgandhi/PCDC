
# Current Feature

## Status

In Progress

## Feature

SPEC_18 Case Builder Form — Revision

## Spec File

`context/features/SPEC_18_CASE_BUILDER_FORM_REVISION.md`

Note: the spec file's own internal heading reads "SPEC_16: Case Builder Form — Revision" even though the filename is `SPEC_18_...` — a mismatch between filename and in-document title, on top of the project's existing pattern of duplicate spec numbers (two SPEC_16 files, two SPEC_17 files). Treating the filename (`SPEC_18`) as authoritative here since it's what's referenced going forward.

## Goals

- Capabilities Targeted: replace the flat capability chip row with a hierarchical 4-category expandable selector (Cognitive / Leadership / Entrepreneurial / Professional, 5 sub-capabilities each); at least 1 sub-capability required to save; selected values still save as the same flat array of names as before (no DB change)
- Remove the Expected Outcomes textarea from Core Fields entirely (UI-only removal; leave the DB column alone)
- Remove the entire Case Metadata section (Case Code, Volume, Subject, Functional Area, Capability Category, Difficulty Label, Target Learners, Bloom's Levels) — UI-only, DB columns stay for Admin Case Import
- Recommended Semesters: cut from Sem 1–12 down to Sem 1–4 only
- Time & Marks Breakdown: remove Rapid Fire Time, Total Marks, Written Marks, Rapid Fire Marks fields from the form; backend must silently default these on every save (`rapid_fire_time_minutes=8`, `rapid_fire_marks=3`, `written_marks=7`, `total_marks=10`) since they're fixed platform constants, not faculty-configurable
- Structured Written Questions: add a "Generate Questions with AI" button + summary-input modal; new `POST /faculty/cases/{id}/generate-questions` endpoint calling OpenAI with title/difficulty/capabilities/summary context, returning 3 questions (fixed marks Q1=2/Q2=2/Q3=3, Bloom's progression low→high); overwrite-confirm dialog if manual content already exists
- Rapid Fire Questions: replace the 6 manual Q&A cards entirely with AI generation from a case-summary textarea; new `POST /faculty/cases/{id}/generate-rapid-fire` endpoint returning 6 `{question, answer}` pairs; results shown as read-only cards with per-card "Edit" toggle and a "Regenerate" button
- Out of scope per spec: no other Case Builder sections affected (Recommended Course & Semester's course list, Student Instructions & Faculty Notes panel stay unchanged)

## References

- `context/project-overview.md`
- `context/features/SPEC_18_CASE_BUILDER_FORM_REVISION.md`
- `frontend/src/pages/faculty/FacultyCaseBuilder.tsx` — the actual current file (spec's illustrative path is `CaseBuilder.jsx`); this is where all 7 UI changes land, including the Capabilities Targeted section fixed in the prior conversation turn (bug: duplicate capability names from mixing `case_study`/`simulation` engagement types — see `backend/services/faculty/router.py`'s `faculty_capabilities` endpoint)
- New component per spec: `frontend/src/components/faculty/CapabilitySelector.tsx` (spec names it `.jsx`; match this project's TS convention instead)
- `backend/services/faculty/router.py` — add `generate-questions` and `generate-rapid-fire` endpoints; also home of the existing `replace_capability_tags`/case save logic that needs the new hardcoded rapid-fire/marks defaults
- `backend/services/faculty/service.py` — spec's suggested home for the two new OpenAI calls (module may not exist yet under this exact name; check `router.py`'s existing `call_openai_case_generation` pattern first)

## Implementation Order

1. Capabilities Targeted hierarchical selector (Change 1) — new `CapabilitySelector` component, 4 fixed categories × 5 fixed sub-capabilities per the spec's mockup (this introduces a *second*, separate taxonomy from the `capabilities` DB table's flat list — needs a decision on how the two reconcile, since the spec's category/sub-capability names don't exactly match the existing `capabilities` table rows)
2. Remove Expected Outcomes field (Change 2) and Case Metadata section (Change 3) — pure UI deletions
3. Recommended Semesters trim to Sem 1–4 (Change 4)
4. Time & Marks Breakdown field removal (Change 5) + backend silent-default logic on save
5. Structured Written Questions AI generation (Change 6) — modal, new endpoint, service-layer OpenAI call
6. Rapid Fire Questions AI generation (Change 7) — replaces manual cards, new endpoint, service-layer OpenAI call
7. Verify against Acceptance Criteria checklist in the spec; confirm no regressions to Recommended Course & Semester or Student Instructions & Faculty Notes panels

## Definition of Done

- [ ] Capabilities Targeted shows 4 collapsible categories, each with 5 sub-capability checkboxes; at least 1 required to save; summary line shows count + names
- [ ] Expected Outcomes field removed from the form
- [ ] Case Metadata section removed from the form
- [ ] Recommended Semesters shows only Sem 1–4
- [ ] Time Breakdown shows only Reading Time and Answer Writing Time; Rapid Fire Time/Total Marks/Written Marks/Rapid Fire Marks fields removed
- [ ] Backend auto-sets rapid_fire_time=8, rapid_fire_marks=3, written_marks=7, total_marks=10 on every case save
- [ ] "Generate Questions with AI" button + summary modal implemented; generation populates all 3 question cards; overwrite-confirm shown when manual content exists
- [ ] Rapid Fire section replaced with summary textarea + "Generate" button; no manual Q&A cards remain
- [ ] Rapid Fire generation produces 6 Q&A cards; "Regenerate" and per-card "Edit" toggle both work
- [ ] No other Case Builder sections affected

---

## History

- 2026-07-08: SPEC_17 Fix Internal Network Access merged into `main` (see
  `677b946`, merge of `feature/network-access-fix`) — moving on per direction
  even though its own Definition of Done still had two unchecked items
  (firewall inbound rules and a true second-physical-device confirmation,
  both unverifiable from this environment). SPEC_18 Case Builder Form —
  Revision moved to In Progress: a 7-part revision of the faculty Case
  Builder form (`FacultyCaseBuilder.tsx`) — hierarchical 4-category
  capability selector replacing the flat chip row, removal of Expected
  Outcomes and the entire Case Metadata section, trimming Recommended
  Semesters to Sem 1–4, removing the Rapid Fire time/marks fields from the
  Time & Marks Breakdown (backend to silently default them instead), and AI
  generation replacing manual entry for both Structured Written Questions and
  Rapid Fire Questions (two new endpoints). Flagged an open question before
  implementation starts: the spec's new 4-category/20-sub-capability
  taxonomy for the capability selector (Cognitive/Leadership/Entrepreneurial/
  Professional) doesn't match the existing flat `capabilities` DB table's
  names 1:1 (that table was just fixed this session — see prior turn — to
  filter by `engagement_type = 'case_study'` after a duplicate-display bug),
  so how the two reconcile needs a decision first.

- 2026-07-07: Implemented SPEC_17 Fix Internal Network Access on branch
  `feature/network-access-fix` (branched from `main`). Investigated before
  implementing: this machine's actual LAN IP (`192.168.4.16`, via
  `Get-NetIPAddress`) didn't match the spec's example
  (`183.182.87.172`) — turned out `context/server_running_commands.txt`
  already documented `183.182.87.172` as the "public IP" (not a private
  LAN address) used for external access, alongside a `192.168.4.44` local
  IP. Asked the user whether to hardcode a `VITE_API_URL` per the spec's
  literal wording or derive the API host dynamically; they chose dynamic.
  Changed `frontend/src/api/axios.ts`'s baseURL fallback from the hardcoded
  `http://127.0.0.1:8000/api/v1` to
  `` `${window.location.protocol}//${window.location.hostname}:8000/api/v1` ``,
  so the frontend always calls back to whatever host served the page —
  works for `127.0.0.1`, `localhost`, any LAN IP, or the public IP, with no
  address to maintain (`VITE_API_URL` still overrides it if ever needed).
  Note: searched the whole frontend for hardcoded `127.0.0.1`/`localhost`
  references and found only this one line — `AuthContext.tsx`, which the
  spec named specifically, already routes through this same shared `api`
  instance and had no hardcoded URL of its own.

  For `backend/main.py`'s CORS config (found already showing signs of a
  prior manual edit toward the spec's quoted "before" state — a redundant
  `"*"` mixed with explicit origins under `allow_credentials=True`), first
  tried an `allow_origin_regex` restricted to private RFC1918 ranges, then
  caught during testing that this would incorrectly exclude the
  spec's own public-IP access pattern; broadened it, but a second test
  round caught that an overly-permissive version (`[\w.\-]+`) let
  `evil.com:5173` through — a real CORS security regression, since matched
  origins get their exact Origin reflected and accepted with credentials.
  Settled on `allow_origin_regex=r"https?://(localhost|(\d{1,3}\.){3}\d{1,3}):5173"`
  — matches `localhost` or any bare IPv4 address on the Vite port (covers
  every device on the network regardless of IP, public or private) while
  rejecting arbitrary hostnames. Verified with curl: preflight + real
  `/auth/login` requests using `Origin` headers for `192.168.4.16:5173`,
  `183.182.87.172:5173`, `localhost:5173`, and `127.0.0.1:5173` all
  succeeded with the correct origin reflected back and a valid token
  returned; `evil.com:5173` got 400. Also updated
  `context/server_running_commands.txt`'s documented uvicorn command to
  include `--host 0.0.0.0 --port 8000` (previously undocumented and
  defaulting to loopback-only), confirmed via `netstat` that the server
  actually listens on `0.0.0.0:8000` once started that way, and added
  `server: { host: true }` to `frontend/vite.config.ts` so `npm run dev`
  reliably binds to all interfaces without relying on an unrecorded manual
  flag. Frontend build (`tsc -b && vite build`) and backend syntax check
  (`py_compile`) both passed. Could not test from an actual second
  physical device in this environment — verification here is a curl-based
  simulation of LAN origins against localhost, not a true cross-machine
  test; recommend a final real-device check per the spec's Section 4.

- 2026-07-07: SPEC_16 Active Engagements Section (Student Dashboard) marked
  Completed — all Definition of Done items checked (see the prior entries
  below for the full implementation history). Committed and merged into
  `main` via `feature/active-engagements-section` (`--no-ff`), local branch
  deleted, and pushed to `origin/main`. SPEC_17 Fix Internal Network Access
  moved to In Progress: login fails when the app is accessed from another
  machine on the internal network via the server's LAN IP, because the
  frontend's API base URL is hardcoded to `127.0.0.1:8000` (resolves to the
  *requesting* machine's own loopback, not the server) and/or uvicorn isn't
  bound to `0.0.0.0`. Scope: centralize the frontend API base URL into a
  `VITE_API_BASE_URL` env var pointed at the LAN IP, confirm/fix the uvicorn
  host binding, clean up the CORS `allow_origins` wildcard-plus-credentials
  redundancy in `main.py`, and verify login end-to-end from at least two
  other LAN devices. Note this spec number collides with the
  already-completed `SPEC_17_CASE_STUDIES.md` (Case Studies backend) —
  same collision pattern as the two SPEC_16 files earlier in this project.

- 2026-07-07: Simplified the Active Engagements boxes per user feedback on
  a screenshot: the "Active Case Study" box was rendering two
  visually-identical "Browse Case Studies" buttons — the pre-existing
  empty-state `Link` that navigated to `/student/case-studies`, plus the
  new non-navigating `MatrixFilterButton` added earlier this session.
  Removed the navigating Link entirely (case_study is the default filter
  view anyway, and the page-level "Browse Case Studies" action still exists
  in the hero section above), leaving one button. Also removed the
  Think/Lead/Execute/Grow accordion detail from the Simulations and Concept
  Study boxes per direction ("we just need the buttons there, remove rest
  of the content because that will come in the capability box") — those
  two boxes now render as just a `<Card>` title + their single "Browse ..."
  button, with the full group/capability breakdown appearing only in the
  Capability Matrix section below once that box's filter is selected.
  Deleted `SimulationsBox.tsx` and `ConceptStudyBox.tsx` as dead code since
  nothing renders their accordion content anymore. Frontend build
  (`tsc -b && vite build`) passed.

- 2026-07-07: Implemented the Capability Matrix filter buttons on
  `feature/active-engagements-section`, resolving the open question from
  the previous entry. User simplified the design themselves: instead of
  mapping Think/Lead/Execute/Grow onto the existing Cognitive/Leadership/
  Entrepreneurial/Professional taxonomy to compute filtered averages, the
  Capability Matrix now directly swaps to each engagement type's *own*
  groups. Confirmed with the user (via question) that there is no 4th
  combined/all state (`case_study` is simply the default of 3 states) and
  that the Concept Study filter shows the same Think/Lead/Execute/Grow
  headers as Simulations but with a "Coming Soon" expand, mirroring the
  Concept Study box itself. No new backend endpoint was needed — the
  existing `/student/active-engagements` payload already carries everything
  (`simulations.groups` and `concept_study.groups`), so the whole feature
  is frontend-only. Rewrote `CapabilityMatrix.tsx` to accept `filter` +
  `simulationGroups` + `conceptGroups` props and compute its 4 displayed
  cards per filter (`case_study`: unchanged hardcoded cards; `simulation`:
  real per-group average of the 5 capability scores; `concept_study`: null
  score + null items, rendered as "TBD"/"Coming Soon"), resetting the
  expanded accordion category whenever the filter changes. Added a
  `MatrixFilterButton` component in `Dashboard.tsx` (filled navy when
  active, outlined otherwise; clicking the active one resets to
  `case_study`) placed at the bottom of all three Active Engagements boxes,
  plus a "Showing: X only — Clear filter" indicator under the Capability
  Matrix heading when a non-default filter is active. Frontend build
  (`tsc -b && vite build`) passed; not yet driven in an actual browser since
  no headless-browser tool is available in this environment — correctness
  rests on the passing build plus the already-verified `/student/
  active-engagements` payload shape.

- 2026-07-07: Spec updated by the user — `SPEC_16_Active_Engagements_Section.md`
  grew significant new scope beyond what was already implemented (see entry
  below). Added: a full-width "Browse Case Studies / Browse Simulations /
  Browse Concepts" button on each of the three Active Engagements boxes
  (Section 3.4); clicking one sets a dashboard-level `activeMatrixFilter`
  state (no navigation) that filters the existing SPEC_13 Capability Matrix
  below to show averages computed only from that engagement type, with a
  "Showing: X only — Clear filter" indicator (Section 3.5), and re-clicking
  the active button clears back to the combined view; a new
  `GET /api/student/{student_id}/capability-matrix?engagement_type=...`
  endpoint to serve the filtered card averages (Section 7.1); and an
  explicit open question in Section 5.1 (marked "ASSUMPTION — CONFIRM")
  about how the box groups (Think/Lead/Execute/Grow) map onto the existing
  Capability Matrix cards (Cognitive/Leadership/Entrepreneurial/
  Professional) — the spec's proposed mapping sends Grow → Entrepreneurial,
  but flags that split as debatable (Innovation reads as Entrepreneurial;
  Learning Agility/Professional Ethics read as Professional) and says it
  needs confirmation before the filtered-average logic is built. Status
  kept at In Progress; updated Goals/Implementation Order/Definition of
  Done above to reflect the already-completed pieces (migration, seed,
  `/student/active-engagements` endpoint, the three boxes, accordions) versus
  the new unstarted scope (buttons, filter state, filtered endpoint,
  `<CapabilityMatrix />` extension), and flagged the Section 5.1 mapping
  as the blocking next step before that new scope can be implemented.

- 2026-07-07: Implemented SPEC_16 Active Engagements Section on branch
  `feature/active-engagements-section` (branched from `main`). Added Alembic
  migration 0010: extended `capabilities` with `engagement_type` (default
  `'case_study'`) and `capability_group` columns, created
  `simulation_capability_scores` (referencing `simulation_attempts.id`, the
  real PK name — the spec's illustrative SQL used `attempt_id`), and seeded
  the 20 Simulations capabilities (5 each under Think/Lead/Execute/Grow),
  idempotently via a `WHERE NOT EXISTS` guard. Added `GET
  /student/active-engagements` to `backend/services/student/router.py`,
  returning `active_case_study` (same shape as the existing dashboard
  summary's `active_case`), `simulations.groups[].capabilities[].score`
  (aggregated from `student_capabilities` LEFT JOINed against the new
  simulation capabilities so students with no rows yet still see all 20 at a
  0 score instead of being dropped), and a static `concept_study` placeholder
  — deviated from the spec's illustrative `/api/student/{student_id}/...`
  path to `/student/active-engagements` with the student derived from the
  JWT, matching every other endpoint in this router. Frontend: added
  `SimulationsBox.tsx` and `ConceptStudyBox.tsx` (both a vertical
  one-group-expanded-at-a-time accordion, per the spec's box mockup, distinct
  from SPEC_13's 2x2-grid-plus-panel accordion shape but the same visual
  language/primitive), wrapped the dashboard in a new "Active Engagements"
  heading + 3-column grid, and moved the existing "Active Case Study" card
  into it unchanged (still sourced from `dashboard/summary.active_case`,
  not the new endpoint's duplicate field, to avoid changing its behavior).
  Restructured the section below it (AI Coaches / Mentor Support) from a
  3-column to a 2-column grid now that Active Case Study no longer lives
  there. Verified end-to-end against the live dev DB: called the new
  endpoint as the seed student (`student@pcdc.com`), confirmed all 20
  simulation capabilities render at score 0 by default, inserted a temporary
  `student_capabilities` row (Strategic Thinking = 77) and confirmed it
  appeared correctly in the Think group's response, then deleted the test
  row. Frontend build (`tsc -b && vite build`) passed.

- 2026-07-07: SPEC_16 Active Engagements Section (Student Dashboard) moved to
  In Progress. Note this spec number collides with the already-in-progress
  "SPEC_16 Faculty → Course → Student Mapping" (`SPEC_16_FACULTY_STUDENT_COURSE_MAPPING.md`)
  — two different spec files were independently numbered SPEC_16. That spec's
  remaining items (faculty "Teaching Sections" block, Assigned Cases
  per-student detail view, student faculty-vs-mentor case grouping, real
  in-app notification bell — see the 2026-07-04 entry below for full detail)
  are paused, not completed, while work shifts to this new spec per direction.
  This new spec adds an "Active Engagements" section above the existing
  Capability Matrix (SPEC_13) on the Student Dashboard: the existing Active
  Case Study box re-parented as-is, a new Simulations box (4 groups × 5
  capabilities, backed by new `capabilities.engagement_type`/
  `capability_group` columns and a new `simulation_capability_scores` table),
  and a placeholder-only Concept Study box (static "Coming Soon", no data
  model yet).

- 2026-07-04: Started implementation on branch `feature/faculty-course-student-mapping`
  (branched from `main`). Audited the spec against the codebase first and found
  most of the Faculty/Student sides were already built under SPEC_12: faculty
  dashboard "My Sections", section-grouped Faculty Students page, the
  "Assign to Class" case-to-section flow, and the Case Library "Class
  Assignments" progress tab all already existed and matched the spec's intent
  (see updated Definition of Done above for the exact per-item status). The
  real gap was on the Admin side, which only supported managing sections by
  drilling into a course on `/admin/courses` — no cross-course list, no way
  to remove a faculty/student from a section, and no bulk enrollment.

  Built the spec's dedicated Admin Section Management page: `GET
  /admin/sections` (new flat endpoint in `backend/services/admin/router.py`,
  filterable by `course_id`/`batch_id`/`status`, returning course/batch/
  semester names and the assigned-faculty list per section so an unassigned
  section can be flagged), `DELETE /admin/sections/{id}/faculty/{faculty_id}`,
  `DELETE /admin/sections/{id}/students/{student_id}` (soft-removes via a new
  `student_sections.status = 'removed'`, matching the existing `'dropped'`
  convention, and clears the student's `current_section_id` if it pointed at
  this section), and `POST /admin/sections/{id}/students/bulk` (CSV import by
  email, per-row savepoint isolation mirroring the existing user-CSV-import
  pattern). Added `frontend/src/pages/admin/AdminSections.tsx` at
  `/admin/sections` (new sidebar nav item) with course/batch/status filters,
  section cards showing the "Unassigned ⚠" flag and cases-assigned count,
  a "New Section" modal (course → batch/semester → name), and "Manage
  Faculty"/"Manage Students" drawers with add, remove, and bulk-CSV-upload
  actions. Left the existing `/admin/courses` page and its inline section
  management untouched — it still works for course/batch setup.

  Verified end-to-end against the live dev DB: created an isolated throwaway
  test course/batch/section, exercised assign-faculty → remove-faculty (plus
  a repeat-remove 404 check), enroll-student → remove-student (plus a
  repeat-remove 404 check), and a bulk CSV upload with one valid and one
  invalid row (confirmed partial success with a per-row error message), then
  deleted the test course (cascades through batch/section/enrollment rows)
  and confirmed the original two sections were unaffected. Frontend
  (`tsc -b && vite build`) and backend (`py_compile`) both passed; could not
  visually drive the new page in a browser since no headless-browser tool is
  available in this environment.

  Follow-up same day: user reported "admin can not assign courses/sections to
  a student" after trying the app directly. Turned out to be the new
  `/admin/sections` page not yet being visible to them (confirmed once
  pointed there — "I can see the option now"), not a functional bug; live DB
  inspection during the conversation showed they'd already successfully
  created a PGDM course/section and assigned a student to it via the new
  Manage Students drawer while we were talking. While addressing this, tightened
  the student picker in that drawer per the spec's exact requirement (only
  show students matching the section's course/batch and not already enrolled
  elsewhere): added `GET /admin/sections/{id}/eligible-students` (permissive
  on `NULL` course/batch so newly-created, not-yet-assigned students remain
  pickable everywhere, strict-match once a student has a course/batch, and
  excluded entirely once `current_section_id` is set) and wired
  `AdminSections.tsx`'s Manage Students dropdown to it instead of the
  unfiltered all-students list, refreshing it after every enroll/remove/bulk
  action. Verified against the live DB directly (queried real `students` rows
  including the user's own just-created PGDM enrollment) that the endpoint
  correctly excludes an already-enrolled student from their own section's
  list while keeping unassigned students eligible everywhere. Frontend and
  backend builds both re-verified clean after the change.

  Remaining before this spec is fully done: the "Teaching Sections" block on
  the faculty user detail page (`/admin/user/:id` is still a full
  placeholder — building this also means giving that page real content for
  the first time), a per-student "View Detail" breakdown on the faculty
  Assigned Cases tab, the student Case Studies page grouping into "Assigned
  by Your Faculty" vs "Assigned by Your Mentor" (currently a flat filterable
  list), and a real in-app notification bell (currently icon-only — no
  backend-fed dropdown/unread state anywhere in the app, though the
  email-notification-log write on assignment already exists from SPEC_12).

- 2026-07-04: SPEC_16 Faculty → Course → Student Mapping moved to In Progress.
  Scope covers the admin structural layer (Section Management page, Manage
  Faculty/Students drawers, faculty "Teaching Sections" block), the faculty
  academic layer ("My Sections" dashboard block, section-grouped Students
  page, "Assign to Section" case flow, "Assigned Cases" tracking tab), the
  student-facing grouped case list (faculty- vs mentor-assigned), and the
  case-assignment notification trigger — all building on SPEC_12's
  `class_sections`/`faculty_sections`/`student_sections`/
  `case_section_assignments` schema.

- 2026-07-03: Started the "Bugs-fixes" initiative on branch `Bugs-fixes`
  (branched from `main`, separate from the not-yet-merged
  `feature/platform-audit` docs branch), working page-by-page through
  SPEC_14's 🔴 findings. Round 1 (`/student/dashboard`): fixed the
  hardcoded header identity by wiring `DashboardLayout.tsx` to real
  `GET /student/profile` data (name from the decoded JWT, career
  track/course from the profile call) — this layout is shared across
  every student page, so the fix applies everywhere, not just the
  dashboard. Replaced the dashboard's generic "Unable to load your
  dashboard right now" catch-all with a `describeDashboardError()`
  helper that surfaces the real HTTP status/detail. Fixed the actual
  root cause identified by the audit: `register_user()` in
  `backend/services/auth/service.py` now creates a `students` row and
  seeds all capability rows at 0 for `role="student"` (and a `mentors`
  row for `role="mentor"`), mirroring what Admin-driven user creation
  already does, so `/auth/register` can no longer produce a
  profile-less account that 404s on every dashboard load. Added a new
  `active_case` field to `GET /student/dashboard/summary`
  (`backend/services/student/router.py`) sourced from the first
  `assigned_cases` row with `status='active'`, and wired the hero
  "Continue Active Case" button and the "Active Case Study" card to it
  — real case title/domain/difficulty/due-date when one exists, a real
  empty state with a "Browse Case Studies" link when there isn't one;
  removed the fully-fabricated 6-stage progress indicator and fake
  "45 min / Progress 50%" line since no real per-stage attempt data is
  available yet. Also fixed the "View Capability Profile" button,
  which had no link at all.

  Incidental but significant finding during verification: the standard
  seed test accounts (`student@pcdc.com`, `student2@pcdc.com` in
  `backend/seeds/seed_users.py`) have been missing `students` rows
  since project init — `insert_seed_user()` only ever inserted into
  `users`. This is almost certainly the exact account/scenario behind
  the original bug report. Fixed the seed script the same way as
  `register_user()`, and backfilled the two already-existing broken
  accounts directly in the dev DB (created their `students` rows +
  seeded capabilities) so they're usable immediately without a full
  reseed.

  Deferred per explicit user decision: the Capability Matrix (blocked
  on the Attempt Flow being wired up, plus a taxonomy mismatch between
  SPEC_13's hardcoded categories and the real backend's flat capability
  list) and the static "Your next challenge" text / "Active" status
  badge (intentional UX copy, not fake data). The Mentor
  Support/Career Pathway/AI Coaches/Achievements/Recent Evaluations
  cards that also appear on this same dashboard page were left
  untouched — those belong to SPEC_14 Sections 2e-2h, which are later,
  lower-priority rounds, not this one.

  Verified end-to-end against the live dev DB: registered a fresh
  student via `/auth/register` and confirmed dashboard/profile now
  return 200 (previously 404); confirmed `student@pcdc.com` (broken
  since init) now loads correctly after the seed backfill; inserted
  and then removed a temporary `assigned_cases` row to confirm
  `active_case` populates with real data and clears correctly. All
  test data cleaned up afterward. Frontend build (`tsc -b && vite
  build`) passed; could not visually screenshot the page since no
  headless-browser tool is available in this environment.

- 2026-07-03: Implemented SPEC_13 on `feature/capability-matrix-component`.
  Added `frontend/src/components/student/CapabilityMatrix.tsx` (a
  TypeScript component, matching the codebase's existing convention
  rather than the spec's illustrative `.jsx` path): a 2x2 grid of the 4
  category boxes plus a single shared accordion panel driven by one
  `activeCategory` state value, using the exact hardcoded data object
  from the spec (no API calls). Replaced the student dashboard's
  Capability Matrix section — which rendered blank whenever
  `summary.capability_scores` came back empty from the live API — with
  this component, and removed the now-unused `CAPABILITY_ICONS` map and
  three now-unused lucide icon imports (`BarChart3`, `CheckCircle2`,
  `Target`) from `frontend/src/pages/student/Dashboard.tsx`. Styling
  reuses only colors already present in the file (`#c9a227` gold,
  `#081d3a` navy, `#e6e8eb`/`#6b7280`/`#111827`/`#fff7df`), introducing
  no new tokens. Frontend build (`tsc -b && vite build`) passed; booted
  both the backend and frontend dev servers to confirm no startup
  errors, but could not visually drive the page in a browser since no
  headless-browser tool (e.g. `chromium-cli`, Playwright) is installed
  in this environment — correctness rests on the passing TypeScript
  build and matching the spec's data/logic exactly. No API wiring was
  done, per the spec.

- 2026-07-03: SPEC_12 Courses, Faculty Management, Student Management &
  Case Assignment marked Completed (all Definition of Done items
  checked). SPEC_13 Student Dashboard Capability Matrix Component moved
  to In Progress: fix the blank Capability Matrix section on the
  student dashboard with a 2x2 category grid and a shared accordion
  panel showing 5 sub-capabilities per category, using hardcoded data
  only — no API wiring in this pass.

- 2026-07-03: Finished the 4 remaining SPEC_12 items on `main`, closing
  out every unchecked box in the Definition of Done. Admin Users CSV
  import: added `POST /admin/users/import` (multipart file upload,
  `Name/Email/Role/Program/AdmissionYear/CourseCode/BatchName/SectionName/MentorID`
  columns, per-row savepoint isolation so one bad row doesn't roll back
  earlier successful rows, course/batch/section resolved by name) plus
  a matching "Import CSV" button and inline error-report panel on the
  Admin Users page; updated the template download to the new columns.
  Faculty completion-rate view: added a "Class Assignments" section to
  the Case Library page consuming the existing (previously
  frontend-less) `GET /faculty/cases/assigned` and `PATCH
  /faculty/case-assignments/{id}/close` endpoints, with a per-assignment
  completion-rate bar and Close button. Faculty Case Builder tagging:
  added `case_studies.recommended_semesters`/`recommended_course_ids`
  read/write support (new `recommendation` field alongside
  metadata/timing/marks), a new `GET /faculty/courses` endpoint, and a
  "Recommended Course & Semester" panel (semester chips, course
  checkboxes) in the case builder; soft tag only, does not restrict
  assignment. Faculty Analytics: added `GET /faculty/analytics/summary`
  (per-section student count, average capability score, cases assigned,
  completion rate, plus faculty-wide totals) and replaced the Analytics
  placeholder page with a real bar chart (Recharts) and per-section
  table. Also installed the missing `python-multipart` dependency
  (required by FastAPI for file uploads) and added it to
  requirements.txt. Verified all four backend endpoints end-to-end
  against the live dev database via direct API calls (CSV import with
  valid/invalid/duplicate rows, section enrollment resolution,
  recommendation save/reload, assignment close/reopen, analytics
  aggregation correctness), then cleaned up all test data created
  during verification. Frontend build passed
  (`tsc -b && vite build`); could not visually drive the new UI in a
  browser because no headless-browser tool was available in this
  environment, so UI correctness rests on the passing TypeScript build
  plus the verified backend contracts.

- 2026-07-02: Implemented the core of SPEC_12 on
  `feature/courses-faculty-student-management`. Added migration 0008
  (`courses`, `semesters`, `batches`, `class_sections`, `faculty_sections`,
  `student_sections` with a partial-unique one-active-section constraint,
  `case_section_assignments`, plus new columns on `students`, `case_studies`,
  and `assigned_cases`) and a follow-up migration 0009 fixing a missed
  `assigned_cases.due_date` column. Built Admin course/batch/section
  management APIs and a new `/admin/courses` UI (create course with
  semester auto-seeding, add batches, create sections, assign faculty,
  enroll students, per-batch semester advancement with flagged students
  when no next-semester section exists). Added `section_id` to admin
  student creation and course/batch/section columns to the admin users
  list. Built Faculty `/faculty/sections` and `/faculty/students` roster
  APIs (replacing case-attempt-only visibility with real section
  enrollment) and a new Faculty Students page. Built the faculty
  "Assign to Class" flow end-to-end: `POST
  /faculty/cases/{id}/assign-section` bulk-creates `assigned_cases` rows
  and notifications for every enrolled student, wired into the Case
  Library with a section-picker dialog. Added `GET
  /faculty/cases/assigned` and a close-assignment endpoint (backend only,
  no frontend view yet). Added `GET /student/profile` and wired course/
  semester/batch/section/mentor identity into the student dashboard.
  Updated the student case list to show "Assigned by Faculty" vs
  "Assigned by Mentor" and due dates using the existing Completed tab.
  Fixed two bugs found during testing: a route-ordering collision where
  `/faculty/cases/{case_id}` was shadowing `/faculty/cases/assigned`, and
  the missing `due_date` column from migration 0008. Verified the full
  admin-to-student flow end-to-end with a headless browser (create
  course/batch/section, enroll student, assign faculty, publish a case,
  assign it to the section, confirm the student sees it with the correct
  badge and due date) with zero console errors. Deprioritized and left
  unstarted: Faculty Case Builder course/semester tagging, Faculty
  Analytics section dimension, and a dedicated CSV bulk-enrollment upload
  (CSV import doesn't exist anywhere in the codebase yet, only template
  download). Frontend build passed and backend Python syntax checks
  passed via `py`.

- 2026-07-02: SPEC_12 Courses, Faculty Management, Student Management &
  Case Assignment moved to In Progress. Scope updated to a full academic
  structure (courses, semesters, batches, class sections), faculty and
  student section enrollment, faculty-to-section case assignment
  ("Assign to Class") alongside existing mentor per-student assignment,
  admin course/section management and semester progression, and the
  corresponding faculty/student portal updates for section-based
  visibility. SPEC_11 (Case Study Schema Gap Analysis) is not fully
  complete — Admin Case Import, Student Attempt flow, AI evaluation
  against model answers, Mentor Thinking Path, and marks analytics
  remain unchecked — but work is intentionally moving to SPEC_12 next
  per direction.

- 2026-07-02: Continued SPEC_11 implementation on `main`. Added the
  Faculty Case Builder UI for the stakeholder case schema: a Case Metadata
  panel (case code, volume, subject, functional area, capability category,
  difficulty label, target learners, Bloom's levels), a Time & Marks
  Breakdown panel, a Student Instructions & Faculty Notes panel (8 fields),
  a Structured Written Questions editor (3 fixed question cards with marks,
  Bloom's level, word limits, instructions, model answer, alternative
  answers, marking scheme), and a Rapid Fire Questions editor (6 Q&A
  pairs). Wired Save Draft to persist all of it through the existing
  backend PUT endpoint. Verified end-to-end with a headless-browser run
  against the live dev server (login, draft creation, filling every new
  panel, save, and DB read-back all confirmed) with zero console errors.
  Frontend build passed.

  Also drafted `context/features/SPEC_15_CASE_PUBLISHING_TARGETING.md`
  covering the gap found while testing the intended admin-to-student
  flow: faculty cohort targeting (department/program/class) at publish
  time, publish-time notification, and a due-date/opt-in model for
  assigned cases. Not yet implemented; queued to start after the rest of
  SPEC_11.

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

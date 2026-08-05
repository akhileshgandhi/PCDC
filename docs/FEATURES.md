# PCDC — Feature Document

What each portal actually does today, organized by role. "Live" means
wired to a real backend endpoint and the Neon database; "Static/mock"
means the page renders fixed placeholder data with no API call — both are
explicitly noted below since the two are mixed within the same portal in
places.

---

## 1. Student Portal (`/student/*`)

| Page | Route | Status | What it does |
|---|---|---|---|
| Dashboard | `/student/dashboard` | **Live** | Hero panel (name/course/semester/batch/section/mentor from DB), Overall Score + numeric Level + level label, a hero message that names the student's weakest capability category, real 4-category Capability Matrix (loading skeleton while fetching), Active Case Study card wired to real assignment data. Active Engagements' Simulations/Academic Fundamentals/Career Compass cards and the AI Coaches / Mentor Support / Recent Evaluations / Achievements / Career Pathway cards below the matrix are **static** placeholders. |
| Profile | `/student/profile` | **Live** | Read-only: name, email, course, batch, semester, section, mentor (with initials avatar), career track. Info banner explains academic fields are institution-managed. Reachable from the header avatar dropdown. |
| My Case Studies | `/student/case-studies` | **Live** | Real list of cases assigned to the student (`assigned_cases` join), with domain/difficulty/status filters and search. Each card links to case detail (available), the attempt flow directly (in progress), or the attempt flow acting as a results viewer (completed). |
| Case Detail | `/student/case-studies/:id` | **Live** | Full case content (situation, learning outcomes, reflection-question preview, capabilities assessed) from the database; right-panel attempt state (Not Started / In Progress with stage number / Completed with score + grade label) drives the Start/Continue/View Results action. No "Ineligible" state and no "Relevant Career Tracks" chip section — both explicitly out of scope (see `TECH_SPECS.md` for why). |
| Case Attempt | `/student/case-studies/:id/attempt` | **Live** | The full 6-stage flow, each stage backed by a real endpoint: Briefing → Initial Analysis (200-word gate) → AI Discussion (real opening message + real chat replies) → Solution submission → AI Defense (3 real AI-generated questions) → Reflection + Evaluation. Resumes correctly from any stage on reload by reconstructing state from the DB — nothing is stored only in local React state. |
| Capability Profile | `/student/capability-profile` | Static/mock | Radar chart, 8 score cards, mock evaluation history and recommendations. Not wired to the real capability engine. |
| AI Coach | `/student/ai-coach` | Static/mock | 6 canned coach personas with scripted opening messages and mock chat responses. Not a real AI integration. |
| Achievements | `/student/achievements` | Static/mock | Fixed badge/leaderboard/streak data. |
| Career Pathway | `/student/career-pathway` | Static/mock | Fixed readiness score, milestone list, mentor notes. |
| Mentor Support | `/student/mentor-support` | Static/mock | Fixed mentor profile, upcoming session, session-request flow (no persistence). |

---

## 2. Faculty Portal (`/faculty/*`)

| Page | Status | What it does |
|---|---|---|
| Dashboard | **Live** | Summary counts (cases, sections, students), recent activity. |
| Case Library | **Live** | List of the faculty's cases with status/domain/difficulty; a "Class Assignments" section shows per-assignment completion rate with a Close action. |
| Case Builder | **Live** | Full authoring flow: core fields, 9-section case content editor, capability/career-track tagging, timing & marks fields, "Recommended Course & Semester" tagging, Structured Written Questions and Rapid Fire Questions editors, AI-assisted **Generate** (full case or per-section) via OpenAI structured output, publish-time validation, and an "Assign to Class" section-picker flow that bulk-creates `assigned_cases` rows + notifications. |
| Rubric Builder | **Live** | Per-case evaluation rubric: fixed global criteria + up to 2 case-specific qualitative criteria, adjustable weights summing to 100, active-attempt warning before changing a rubric mid-use. |
| Students | **Live** | Section-grouped student roster (real enrollment data, not just attempt history). |
| Analytics | **Live** | Per-section student count, average capability score, cases assigned, completion rate (Recharts bar chart + table). |
| Reports | Placeholder | Not built. |

---

## 3. Mentor Portal (`/mentor/*`)

| Page | Status | What it does |
|---|---|---|
| Dashboard | **Live** | Assigned-student summary, alert counts, upcoming sessions. |
| Students | **Live** | Full assigned roster with capability trends. |
| Student detail | **Live** | Per-student capability breakdown and case history. |
| Thinking Path | **Live** | Reviews a student's full attempt (initial analysis → AI discussion → solution → defense → evaluation) with the ability to leave comments and flag entries for a coaching session. |
| Interventions | **Live** | Log/view intervention records with type, notes, follow-up date. |
| Sessions | **Live** | Schedule/complete mentoring sessions; notifies enrolled students. |
| Alerts | **Live** | Automatic score-drop alerts (fires when a capability score drops by more than a configurable threshold in one attempt) plus dismiss action. |

---

## 4. Admin Portal (`/admin/*`)

| Page | Status | What it does |
|---|---|---|
| Dashboard | **Live** | Platform-wide summary + recent login activity. |
| Users | **Live** | Full roster with role/course/batch/section columns, manual creation, CSV bulk import (per-row error isolation), status/role toggles, mentor/career-track assignment (single + bulk), reset-password queueing. |
| User detail | Placeholder | `/admin/user/:id` has no real content yet (no "Teaching Sections" block etc.). |
| Courses | **Live** | Create courses (auto-seeds semesters), batches, sections; assign faculty/enroll students inline; per-batch semester advancement (flags students with no next-semester section). |
| Sections | **Live** | Cross-course Section Management: filter by course/batch/status, flags unassigned sections, Manage Faculty/Students drawers (add/remove/bulk-CSV), eligible-students filtering (course/batch-matched, not already enrolled elsewhere). |
| Case Import | Placeholder | Route exists; not built out. |
| Settings | Placeholder | Not built. |
| Notifications | Placeholder | Not built (though `notification_log`/`notification_rules` tables exist and are written to by other features). |

---

## 5. Director Portal (`/director/*`)

Login and role-based routing work; the portal itself is a single
placeholder screen (`PortalPlaceholder`). No director-specific backend
endpoints exist.

---

## 6. Cross-Cutting Features

- **Capability scoring engine**: rolling weighted-average score per
  sub-capability, updated immediately on every completed case attempt,
  feeding both the student dashboard's Capability Matrix and a 7-level
  progression system (`students.current_level`) used by both the student
  dashboard and the mentor roster. See `TECH_SPECS.md §4` for the exact
  algorithm.
- **Score-drop alerts**: when an attempt drops a capability score by more
  than a configurable threshold, an alert is created for the student's
  assigned mentor automatically.
- **Notification log**: case assignment, attempt completion (to both
  mentor and the case's faculty author), and level-up events all write to
  `notification_log` (currently email-channel rows marked `pending` — no
  actual email-sending integration is wired up to consume this queue yet).
- **CSV import**: both Admin Users and Admin Sections support CSV bulk
  operations with per-row failure isolation (one bad row doesn't roll
  back the successful ones).

---

## 7. Explicitly Out of Scope / Deferred (by prior decision, not oversight)

These came up as real design forks during implementation and were
deliberately deferred — see `context/current-feature.md` history for the
reasoning behind each:

- **Case Detail "Ineligible" attempt state** — the spec's "under 70%
  completion" concept was never precisely defined against the real
  attempt schema; only Not Started / In Progress / Completed are
  implemented.
- **"Relevant Career Tracks" chips** on Case Detail — no data source
  exists (no column, no Case Builder UI to set it).
- **Capability score change indicators** (↑/↔/↓) on Case Detail — would
  need a score-snapshot/history mechanism that doesn't exist; plain
  current scores are shown instead.
- **Structured Written Questions in the real attempt flow** — faculty can
  author them (`case_questions` table + Case Builder UI), but students
  still submit one free-text initial-analysis blob rather than answering
  per-question.

# SPEC_09: Mentor Portal — Detailed Plan

**Route prefix:** `/mentor/*`
**Sprint:** 3 (parallel to Faculty Portal)
**Depends on:** Auth module (done), Role-based routing (done), Student Portal (done), Student capability scores being written to DB
**Pages (from routing diagram):** dashboard, students, student/:id, thinking-path, interventions, sessions, alerts

---

## 0. Mentor Role Definition

The spec doc is explicit: Mentor is the **most important human intervention layer** in the platform.

Mentor is NOT:
- An evaluator (that's AI + faculty)
- A content creator (that's faculty)
- A platform operator (that's admin)

Mentor IS:
- A human coach who watches capability trends across their assigned students (max 25 per mentor)
- The person who intervenes when a student is struggling, plateauing, or heading the wrong direction
- The person who sees the full student thinking path — initial analysis, AI conversation log, reflection, defense — not just the final score
- The person who schedules and runs 1:1 sessions and logs what actions were taken

Every design decision on every mentor page must serve this single purpose: **helping mentors intervene early and intelligently**.

---

## 1. Page: Mentor Dashboard

**Route:** `/mentor/dashboard`

**Purpose:** At-a-glance pulse on all 25 assigned students. Who needs attention today, and what kind.

**UI layout (from spec doc Section 6, Part 2):**

```
┌──────────────────────────────────────────────────────┐
│  Welcome, Ravi Mehta                                  │
│  Mentor · 25 students assigned                        │
├───────────┬─────────────┬──────────────┬─────────────┤
│ Assigned  │  At Risk    │ Top          │ Sessions     │
│ Students  │  (score     │  Performers  │  This Week   │
│    25     │  dropped/   │     3        │    4         │
│           │  below 60)  │              │              │
│           │     4       │              │              │
├───────────┴─────────────┴──────────────┴─────────────┤
│ WEAKNESS SIGNALS (capability-level, across cohort)   │
│  Leadership Weakness    : 11 students                 │
│  Communication Weakness :  9 students                 │
│  Innovation Weakness    :  6 students                 │
├─────────────────────────────────────────────────────┤
│ ALERTS (needs immediate attention)                   │
│  🔴 Priya Desai     — Score dropped 14pts in 7 days  │
│  🔴 Arjun Mehta     — No activity for 12 days        │
│  🟡 Sneha Patel     — Stuck at Level 2 for 3 weeks   │
│  🟡 Rohit Sharma    — Innovation score below 50       │
├─────────────────────────────────────────────────────┤
│ UPCOMING SESSIONS                                    │
│  Tomorrow 11:00 AM — Amit Sharma (1:1 check-in)     │
│  Thursday 3:00 PM  — Group session (Leadership)      │
└─────────────────────────────────────────────────────┘
```

**Alert types (from spec doc sections 4, 6, 12):**
- 🔴 Red: capability score dropped significantly (threshold from admin settings), or no activity for X days
- 🟡 Yellow: stuck at same difficulty level for too long, single capability below 50, AI utilization score low (copy-paste risk signal)

**Quick actions from dashboard:**
- Click any student name → `/mentor/student/:id`
- Click "View All Alerts" → `/mentor/alerts`
- Click "Sessions" → `/mentor/sessions`

**API endpoints:**
- `GET /api/mentor/dashboard/summary` → counts + weakness signals
- `GET /api/mentor/dashboard/alerts` → top 4-5 most urgent alerts
- `GET /api/mentor/dashboard/sessions/upcoming` → next 5 sessions

**Tables touched:** `students`, `student_capability`, `simulation_attempts`, `interventions` (read-only)

---

## 2. Page: Students (Roster)

**Route:** `/mentor/students`

**Purpose:** Full list of the mentor's 25 assigned students with enough at-a-glance signal to prioritize who to look at.

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│  My Students (25)          Search...   Filter ▼       │
├──────┬──────────────┬───────┬──────────┬─────────────┤
│      │ Name         │ Level │ Cap Score│ Status      │
├──────┼──────────────┼───────┼──────────┼─────────────┤
│  ●   │ Amit Sharma  │  L3   │   72     │ On Track    │
│  🔴  │ Priya Desai  │  L2   │   54     │ At Risk     │
│  🟡  │ Arjun Mehta  │  L2   │   63     │ Stagnant    │
│  ⭐  │ Sneha Kapoor │  L5   │   88     │ Top Perform │
│  ... │              │       │          │             │
└──────┴──────────────┴───────┴──────────┴─────────────┘
```

**Status labels:**
- On Track — progressing normally
- At Risk — score dropped or inactivity
- Stagnant — stuck at same level for too long
- Top Performer — consistently above 85%
- Inactive — no login in X days (separate from At Risk)

**Filters:**
- Status (At Risk / Stagnant / On Track / Top Performer / Inactive)
- Career Track
- Weakest Capability (e.g. show me all students weak in Leadership)
- Level (1–7)

**Click a row → `/mentor/student/:id`**

**Sorting:** by capability score (asc/desc), by last activity, by level

**API endpoints:**
- `GET /api/mentor/students?status=&track=&level=&weakness=`

**Tables touched:** `students`, `student_capability`, `simulation_attempts` (read-only)

---

## 3. Page: Student Detail

**Route:** `/mentor/student/:id`

**Purpose:** The richest page in the mentor portal. Full picture of one student — capability profile, simulation history, AI suggestions for intervention, and direct actions (schedule session, log intervention, assign a case).

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│ ← My Students                                        │
│                                                      │
│ [Avatar] Amit Sharma          Career: Consulting     │
│          MBA 2025 · Level 3   Status: On Track       │
├──────────────────────────────────────────────────────┤
│ CAPABILITY PROFILE                                   │
│                                                      │
│ Leadership        58  ████████░░░░░░░░  ↘ (-4 pts)  │
│ Communication     72  ████████████░░░░  → (stable)  │
│ Problem Solving   80  █████████████░░░  ↗ (+6 pts)  │
│ Innovation        54  ████████░░░░░░░░  ↘ (-3 pts)  │
│ Decision Making   68  ███████████░░░░░  → (stable)  │
│ Strategic Thinkng 74  ████████████░░░░  ↗ (+2 pts)  │
│                                                      │
│ [View Trend Graph]                                   │
├──────────────────────────────────────────────────────┤
│ AI SUGGESTIONS (Mentor Assistant)                    │
│                                                      │
│ Based on Amit's last 5 simulations:                  │
│ • Leadership and Innovation are declining            │
│ • Recommend: Leadership Simulation #21               │
│ • Recommend: Conflict Resolution Exercise            │
│ • Recommend: Team Management Module                  │
│                                                      │
│ [Assign Recommended Case]                            │
├──────────────────────────────────────────────────────┤
│ RECENT SIMULATIONS                                   │
│ Supply Chain Crisis  L3  Score: 74  Jun 28           │
│ Market Entry India   L3  Score: 68  Jun 20           │
│ Pricing Strategy     L2  Score: 81  Jun 12           │
│                                                      │
│ [View Thinking Path →]   (links to thinking-path)   │
├──────────────────────────────────────────────────────┤
│ ACTIONS                                              │
│ [Schedule Session]  [Log Intervention]               │
│ [Assign Case Study] [Add Note]                       │
├──────────────────────────────────────────────────────┤
│ INTERVENTION HISTORY                                 │
│ Jun 15 — 1:1 session — "Discussed leadership gap,   │
│          assigned conflict resolution exercise"      │
│ May 28 — Email nudge — "Encouraged to attempt L3"   │
└──────────────────────────────────────────────────────┘
```

**AI Suggestions block (Mentor Assistant — spec doc Section 15):**
- Calls the AI with the student's last N simulation scores, capability trends, and current level
- Returns: identified weak areas + recommended case studies/exercises (from published case library)
- Mentor can click "Assign Recommended Case" → directly assigns a specific case to this student (queues it in student's pending simulations)

**Trend graph:**
- Line chart, all capabilities over time (last 30/60/90 days toggle)
- This is the visual equivalent of the spec doc's "trend graphs" in the mentor dashboard

**"View Thinking Path"** → links to `/mentor/thinking-path` pre-filtered to this student's most recent attempt

**API endpoints:**
- `GET /api/mentor/students/{id}` (full profile: capabilities + trend + recent attempts + interventions)
- `GET /api/mentor/students/{id}/ai-suggestions` (calls AI, returns recommendations)
- `POST /api/mentor/students/{id}/assign-case` (assign a specific case to student)
- `POST /api/mentor/sessions` (schedule session — see Sessions page)
- `POST /api/mentor/interventions` (log intervention — see Interventions page)

**Tables touched:** `students`, `student_capability`, `simulation_attempts`, `interventions`, `simulations` (for case assignment)

---

## 4. Page: Thinking Path

**Route:** `/mentor/thinking-path`

**Purpose:** This is the most intellectually powerful page in the mentor portal — and the most unique feature of PCDC. Mentor sees the full chronological trace of how a student thought through a case: initial analysis before AI, every AI prompt and response, reflection, defense responses. This is what makes the "how did you arrive at the answer" philosophy concrete and visible to a human mentor.

**This page directly serves spec doc Layer 2 (AI Interaction Logging):**
> *"Mentor can see: Student Thinking Path"*

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│ ← Student: Amit Sharma                               │
│ Thinking Path — "Supply Chain Crisis"  Jun 28, 2026  │
│                                                      │
│ Time taken: 42 min (Expected: 45 min) ✓              │
│ Final Score: 74                                      │
├──────────────────────────────────────────────────────┤
│ STAGE 1: INITIAL ANALYSIS (before AI unlocked)       │
│                                                      │
│ "I believe the supply chain disruption is primarily  │
│  caused by over-reliance on a single supplier in     │
│  Southeast Asia. The assumptions I am making are..." │
│                                                      │
│ Word count: 247 ✓  Time to submit: 8 min             │
│ Mentor flag: [Add flag/comment]                      │
├──────────────────────────────────────────────────────┤
│ STAGE 2: AI CONVERSATION LOG                         │
│                                                      │
│ [08:14] Student: "What financial metrics should I    │
│          look at for a supply chain case?"           │
│ [08:14] AI: "Focus on inventory turnover, days       │
│          payable outstanding, and supplier           │
│          concentration ratio..."                     │
│                                                      │
│ [08:22] Student: "What if we consider nearshoring?"  │
│ [08:22] AI: "Nearshoring reduces lead time but..."   │
│                                                      │
│ Prompts used: 6   Avg time between prompts: 4 min    │
│ AI Utilization Score: 78 (Thoughtful — not copy-paste)│
│                                                      │
│ Mentor flag: [Add flag/comment]                      │
├──────────────────────────────────────────────────────┤
│ STAGE 3: SOLUTION SUBMITTED                          │
│                                                      │
│ Recommendations: "Diversify supplier base across     │
│  3 regions, negotiate 90-day buffer stock..."        │
│ Reasoning: [...]                                     │
│ Implementation Plan: [...]                           │
│ Risks identified: [...]                              │
│                                                      │
│ Mentor flag: [Add flag/comment]                      │
├──────────────────────────────────────────────────────┤
│ STAGE 4: AI DEFENSE RESPONSES                        │
│                                                      │
│ AI: "What if your primary alternate supplier         │
│      also faces disruption?"                         │
│ Student: "We maintain a minimum 45-day buffer..."    │
│                                                      │
│ Mentor flag: [Add flag/comment]                      │
├──────────────────────────────────────────────────────┤
│ STAGE 5: REFLECTION                                  │
│                                                      │
│ "AI helped me identify that I had not considered     │
│  currency hedging as a risk factor. I disagreed     │
│  with AI's suggestion to fully exit the Southeast   │
│  Asian supply chain because..."                      │
│                                                      │
│ Reflection Score: 88                                 │
│ Mentor flag: [Add flag/comment]                      │
├──────────────────────────────────────────────────────┤
│ MENTOR OVERALL COMMENT                               │
│ ┌──────────────────────────────────────────────┐    │
│ │ Add your overall observation for this attempt│    │
│ └──────────────────────────────────────────────┘    │
│ [Save Comment]   [Flag for Session Discussion]       │
└──────────────────────────────────────────────────────┘
```

**AI Utilization Score signal:**
- Shown in the AI conversation log block
- High score + short prompts + copy-pasted AI text in solution = copy-paste risk flag
- Low number of prompts + good solution = independent thinking signal
- Mentor uses this to calibrate their 1:1 conversation

**Mentor flags:**
- Per-stage flag/comment (e.g. "Stage 1: Initial analysis is shallow — student jumped to solution without asking what information is missing")
- These flags are stored and visible in the intervention log for that student
- "Flag for Session Discussion" marks this attempt as a discussion agenda item for the next scheduled session

**Filters at top of page (when arriving from mentor/students not from student/:id):**
- Student selector
- Case study selector
- Attempt date

**API endpoints:**
- `GET /api/mentor/thinking-path/{attempt_id}` (full attempt: initial analysis + AI conversations + solution + defense + reflection)
- `POST /api/mentor/thinking-path/{attempt_id}/flag` (add per-stage comment/flag)
- `POST /api/mentor/thinking-path/{attempt_id}/comment` (overall mentor comment)

**Tables touched:** `simulation_attempts`, `ai_conversations`, `reflections` (read-only), new `mentor_attempt_comments` table (see Section 8 for schema)

---

## 5. Page: Interventions

**Route:** `/mentor/interventions`

**Purpose:** Full log of every action a mentor has taken across all their students — sessions, assignments, nudges, notes. Also the place where mentors log new interventions directly (without going through a specific student's profile).

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│  Interventions             [+ Log Intervention]       │
│  Filter: All students ▼  All types ▼  Date range ▼   │
├──────────────────────────────────────────────────────┤
│ Jun 28 · Amit Sharma   · 1:1 Session                 │
│  "Discussed leadership gap, assigned conflict        │
│   resolution exercise. Follow up in 2 weeks."       │
│                                                      │
│ Jun 20 · Priya Desai   · Case Assigned               │
│  "Assigned Leadership Simulation #21 to address      │
│   declining leadership score."                       │
│                                                      │
│ Jun 15 · Arjun Mehta   · Note                        │
│  "Student has not logged in for 8 days. Sent         │
│   WhatsApp nudge. Awaiting response."               │
└──────────────────────────────────────────────────────┘
```

**Intervention types (align with INTERVENTIONS table in spec doc):**
- 1:1 Session (links to session record)
- Group Session
- Case Assigned
- Email/WhatsApp Nudge
- Note / Observation
- Escalated to Faculty
- Escalated to Admin

**"+ Log Intervention" modal:**
- Student selector (dropdown of mentor's 25 students)
- Type (from list above)
- Date
- Notes / Action taken
- Follow-up date (optional)
- Save

**API endpoints:**
- `GET /api/mentor/interventions?student_id=&type=&from=&to=`
- `POST /api/mentor/interventions`
- `PUT /api/mentor/interventions/{id}`

**Tables touched:** `interventions`

---

## 6. Page: Sessions

**Route:** `/mentor/sessions`

**Purpose:** Calendar-style view of all mentoring sessions (past and upcoming). Schedule new sessions, view past session notes, and mark sessions as completed.

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│  Sessions                   [+ Schedule Session]      │
├──────────────────────────────────────────────────────┤
│  UPCOMING                                            │
│                                                      │
│  Jul 3 · 11:00 AM  Amit Sharma    1:1 Check-in       │
│  Jul 5 · 03:00 PM  Group (8 stud) Leadership Focus   │
│  Jul 8 · 10:00 AM  Priya Desai   At-Risk Review      │
├──────────────────────────────────────────────────────┤
│  PAST SESSIONS                                       │
│                                                      │
│  Jun 28 · Amit Sharma  · Completed                   │
│  "Discussed supply chain case thinking path.         │
│   Student showed shallow risk analysis in Stage 1.   │
│   Assigned conflict resolution exercise."           │
│  [View Thinking Path discussed]                      │
│                                                      │
│  Jun 20 · Group (5 stud) · Completed                 │
│  "Innovation workshop — all 5 students showed..."    │
└──────────────────────────────────────────────────────┘
```

**"+ Schedule Session" modal:**
- Session type: 1:1 / Group
- Student(s) — if 1:1: single student selector; if group: multi-select
- Date + Time
- Agenda / Purpose (short text)
- Save → notification sent to student(s) automatically (Email/WhatsApp per admin settings)

**Mark as Completed (on past session):**
- Session notes textarea
- Link to any thinking paths discussed (select from attempts)
- Automatically creates an entry in the INTERVENTIONS table (type: 1:1 Session or Group Session) so intervention log stays complete

**API endpoints:**
- `GET /api/mentor/sessions?status=upcoming|past`
- `POST /api/mentor/sessions` (schedule)
- `PATCH /api/mentor/sessions/{id}/complete` (mark done + add notes)

**Tables touched:** new `sessions` table (confirm if exists or needs migration), `interventions` (auto-written on session completion)

---

## 7. Page: Alerts

**Route:** `/mentor/alerts`

**Purpose:** Dedicated page for all system-generated alerts about mentor's students. Dashboard shows top 4–5; this page shows the full list, filterable and actionable.

**UI layout:**

```
┌──────────────────────────────────────────────────────┐
│  Alerts (17 active)        Filter: Type ▼  Student ▼ │
├──────────────────────────────────────────────────────┤
│ 🔴 CRITICAL                                          │
│  Priya Desai    — Capability score dropped 14pts     │
│                   in 7 days (Leadership: 72 → 58)    │
│  [View Student] [Log Intervention] [Dismiss]         │
│                                                      │
│  Arjun Mehta    — No platform activity for 12 days   │
│  [View Student] [Log Intervention] [Dismiss]         │
├──────────────────────────────────────────────────────┤
│ 🟡 WATCH                                             │
│  Sneha Patel    — Stuck at Level 2 for 21 days       │
│  [View Student] [Log Intervention] [Dismiss]         │
│                                                      │
│  Rohit Sharma   — Innovation score below 50 (3 wks)  │
│  [View Student] [Log Intervention] [Dismiss]         │
│                                                      │
│  Kavita Joshi   — AI Utilization Score very low      │
│                   (possible copy-paste behavior)     │
│  [View Thinking Path] [Log Intervention] [Dismiss]   │
├──────────────────────────────────────────────────────┤
│  DISMISSED (last 30 days)          [Show / Hide]     │
└──────────────────────────────────────────────────────┘
```

**Alert types (derived from spec doc Sections 6, 11, 12):**
- 🔴 Score dropped significantly (threshold from admin settings)
- 🔴 No activity for X days
- 🟡 Stuck at same level for X days
- 🟡 Single capability score below threshold (50)
- 🟡 AI Utilization Score very low (copy-paste risk)
- 🟡 Placement readiness threshold not reached by target date

**Per-alert actions:**
- View Student → `/mentor/student/:id`
- View Thinking Path → `/mentor/thinking-path` (for copy-paste alerts, takes mentor directly to the flagged attempt)
- Log Intervention → opens log intervention modal pre-filled with student name
- Dismiss → removes from active alerts, adds to dismissed log with timestamp (audit trail)

**API endpoints:**
- `GET /api/mentor/alerts?type=&student_id=&status=active|dismissed`
- `PATCH /api/mentor/alerts/{id}/dismiss`

**Tables touched:** `simulation_attempts`, `ai_conversations`, `reflections` (read-only), `alerts` (read-only), `mentor_attempt_comments` (write)

---

## 8. Decisions Log (all resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Sessions table | **New dedicated table** — separate from INTERVENTIONS (sessions have a scheduled→completed lifecycle that interventions don't) |
| 2 | Mentor attempt comments | **New dedicated table** — `mentor_attempt_comments` |
| 3 | Alert generation | **Hybrid** — event-triggered for score drops (immediate, written inside the same transaction as score update) + APScheduler sweep every 6 hours for slow-moving conditions (inactivity, level stagnation, capability below 50). Both write to the same `alerts` table. No Redis/Celery needed — APScheduler runs inside the FastAPI process. |
| 4 | Case assignment | **Immediate** — assigned case appears in student's pending list right away |
| 5 | AI Suggestions | **Same OpenAI setup** (same key + model as case generation), different system prompt scoped to capability coaching |
| 6 | Group sessions | **One record** with a `session_students` join table (cleaner than a raw array for querying per-student session history) |

---

## 9. New Database Migrations Required

Three new tables needed before Cline starts. Add to Alembic migrations in this order:

### Table: `sessions`
```
session_id        UUID, PK
mentor_id         FK → mentors.mentor_id
session_type      ENUM('one_on_one', 'group')
agenda            TEXT
scheduled_at      TIMESTAMP
completed_at      TIMESTAMP (nullable — null = not yet completed)
notes             TEXT (nullable — filled on completion)
created_at        TIMESTAMP
```

### Table: `session_students` (join)
```
id                UUID, PK
session_id        FK → sessions.session_id
student_id        FK → students.student_id
notified_at       TIMESTAMP (nullable — when notification was sent)
```

### Table: `mentor_attempt_comments`
```
comment_id        UUID, PK
attempt_id        FK → simulation_attempts.attempt_id
mentor_id         FK → mentors.mentor_id
stage             ENUM('initial_analysis', 'ai_conversation', 'solution', 'defense', 'reflection', 'overall')
comment_text      TEXT
flagged_for_session BOOLEAN, DEFAULT false
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Table: `alerts`
```
alert_id          UUID, PK
mentor_id         FK → mentors.mentor_id
student_id        FK → students.student_id
alert_type        ENUM('score_drop', 'inactivity', 'level_stagnant', 'capability_low', 'copy_paste_risk', 'placement_not_ready')
severity          ENUM('critical', 'watch')
message           TEXT (human-readable, e.g. "Leadership score dropped 14pts in 7 days")
metadata          JSONB (e.g. {"capability": "leadership", "from": 72, "to": 58, "attempt_id": "..."})
status            ENUM('active', 'dismissed'), DEFAULT 'active'
dismissed_at      TIMESTAMP (nullable)
created_at        TIMESTAMP
```

### Alert generation logic (APScheduler — inside FastAPI startup)

```python
# Runs every 6 hours
def sweep_alerts():
    # Inactivity: no simulation_attempt in last X days
    # Level stagnant: same CurrentLevel for > 21 days
    # Capability low: any student_capability.CurrentScore < 50
    # Copy-paste risk: AI Utilization Score < threshold on latest attempt
    # Placement not ready: overall score < placement threshold + target date approaching

# Runs inside score-write transaction (event-triggered, immediate)
def check_score_drop(student_id, capability_id, old_score, new_score):
    drop = old_score - new_score
    if drop >= SCORE_DROP_THRESHOLD:  # from admin settings, default 10
        write_alert(type='score_drop', severity='critical', ...)
```

---

## 10. Build Order

1. **Run Alembic migrations** for the 4 new tables above — must come first
2. **Students roster** — simplest page, establishes navigation pattern
3. **Student detail** — core of the mentor experience, most other pages link back to here
4. **Thinking path** — needs `simulation_attempts` + `ai_conversations` populated; use seeded test data if student portal attempts aren't available yet
5. **Alerts** — wire APScheduler sweep + event-triggered score-drop check; UI reads from `alerts` table
6. **Sessions** — schedule + complete flow; completion auto-writes to `interventions`
7. **Interventions** — log view, reads from data written by sessions + student detail actions
8. **Dashboard** — built last, aggregates everything above

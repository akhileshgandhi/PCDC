# SPEC_10: Dynamic Data & Role Mapping — Complete Plan

**Scope:** All relationships between roles, all dynamic data flows, all cross-portal linkages.
**Depends on:** All portal specs (SPEC_07 through SPEC_09), existing DB schema (12-table base + case studies migration + 4 new mentor tables from SPEC_09)
**This spec covers:** Who assigns what to whom, how data flows between portals, what updates dynamically and when.

---

## 0. The Complete Relationship Map

```
ADMIN
  │
  ├── creates / imports ──────────────► STUDENTS (bulk CSV or single)
  ├── creates / imports ──────────────► FACULTY
  ├── creates / imports ──────────────► MENTORS
  ├── assigns ─────────────────────────► STUDENT → MENTOR (1 mentor per student)
  ├── assigns ─────────────────────────► STUDENT → CAREER TRACK
  └── imports external ────────────────► CASE STUDIES (case-import page)

FACULTY
  │
  ├── creates ─────────────────────────► CASE STUDIES (case-builder)
  ├── defines ─────────────────────────► RUBRICS (rubric-builder, per case)
  └── views ───────────────────────────► STUDENTS who attempted their cases

MENTOR
  │
  ├── views ───────────────────────────► ASSIGNED STUDENTS (up to 25)
  ├── assigns ─────────────────────────► CASE STUDY → STUDENT (from published library)
  ├── schedules ───────────────────────► SESSIONS (1:1 or group, for their students)
  └── logs ────────────────────────────► INTERVENTIONS (for their students)

STUDENT
  │
  ├── attempts ────────────────────────► CASE STUDIES (assigned by mentor only — phase 1)
  │                                      Future phase: system unlocks self-selection based
  │                                      on students.CurrentLevel matching case difficulty
  ├── receives ────────────────────────► CAPABILITY SCORES (updated after each attempt)
  └── chats with ─────────────────────► AI COACH (logged, mentor-visible)

DIRECTOR
  └── views (read-only) ──────────────► ALL of the above, institution-wide aggregates
```

---

## 1. Relationship: Admin → Students (User Creation & Onboarding)

**Already specced in SPEC_08 (Admin Portal, Users page). Summarised here for cross-reference.**

### 1a. Single student creation
- Admin fills: Name, Email, Program, Batch/Year, Career Track (optional at creation), Mentor (optional at creation)
- System: creates user record + student record, sends set-password email
- If Career Track assigned at creation: immediately shows in student's `/student/career` page
- If Mentor assigned at creation: immediately shows in mentor's `/mentor/students` roster

### 1b. Bulk CSV import
- CSV columns: `name, email, program, batch_year, career_track (optional), mentor_id (optional)`
- System: validates, creates all records in a transaction, sends set-password emails in batch
- Import summary: X created, Y skipped (duplicate email), Z failed (validation error)
- Mentor load check: if mentor_id is provided and that mentor already has 25 students, flag as a warning in the import preview (don't block — admin may be intentionally overriding the ratio)

### 1c. What triggers on student creation
```
Student created
    │
    ├── user record written (users table)
    ├── student record written (students table)
    ├── student_capability rows seeded (one row per capability, score = 0)
    ├── set-password email sent
    ├── if mentor_id provided → mentor.StudentsAssigned count incremented
    └── if career_track provided → career pathway simulations queued
```

**API:** `POST /api/admin/users` · `POST /api/admin/users/import`

---

## 2. Relationship: Admin → Student → Mentor Assignment

**This is the most operationally critical mapping. Every student must have exactly one mentor.**

### Rules
- One mentor per student (enforced at DB level — `mentor_id` FK on students table, not nullable after onboarding)
- One mentor can have up to 25 students (soft cap — warning shown, not a hard DB constraint, so admin can override in edge cases)
- A student without a mentor assigned is flagged on the admin dashboard as "unassigned"
- Mentor reassignment is allowed (e.g. mid-year mentor leaves) — old mentor's intervention history is preserved, not deleted

### Assignment flows

**Flow A — At import time (bulk or single):**
- mentor_id included in CSV or single-create form
- Assigned immediately on account creation

**Flow B — Post-import from Admin User Detail page:**
- Admin opens `/admin/user/:id` (student)
- Clicks "Assign Mentor" → searchable dropdown showing all active mentors + their current student count
- Mentor count shown in real time: `Ravi Mehta (18/25 students)`
- On save: student.mentor_id updated, mentor.StudentsAssigned incremented

**Flow C — Bulk reassignment (new):**
- On `/admin/users` page, multi-select students → bulk action "Assign Mentor"
- Select mentor from dropdown → all selected students reassigned in one operation
- Useful when a mentor leaves mid-year

### What updates when mentor is assigned/changed
```
Mentor assigned to student
    │
    ├── students.mentor_id = new_mentor_id
    ├── mentors.StudentsAssigned recalculated (count query, not a stored counter)
    ├── student appears in mentor's /mentor/students roster immediately
    ├── any open alerts for that student transfer to new mentor
    └── notification sent to mentor: "Amit Sharma has been assigned to you"
```

**API:** `PATCH /api/admin/users/{student_id}/mentor` · `POST /api/admin/users/bulk-assign-mentor`

---

## 3. Relationship: Admin → Student → Career Track Assignment

### Rules
- One career track per student at a time (can be changed — e.g. student switches from Finance to Consulting)
- Career tracks are defined/managed in Admin Settings (SPEC_08 Section 5d)
- Career track drives which case studies the system recommends/auto-queues for the student

### Assignment flows

**Flow A — At import time:** career_track column in CSV
**Flow B — Admin User Detail page:** dropdown field, editable any time
**Flow C — Student self-selects:** from `/student/career` page, student picks their track. This is the primary flow — admin assignment is a fallback/override.

### What updates when career track is assigned/changed
```
Career track assigned/changed
    │
    ├── students.career_track updated
    ├── student's /student/career page reflects new track immediately
    ├── system re-evaluates recommended case studies queue
    │     (cases tagged with capabilities that match the new track)
    └── mentor notified if track changed by student (not if changed by admin)
```

**API:** `PATCH /api/admin/users/{student_id}/career-track` · `PATCH /api/student/career/track`

---

## 4. Relationship: Faculty → Case Studies → Students

**Faculty don't directly assign students to themselves. The relationship is indirect — through case studies.**

### How it works
- Faculty publishes a case study
- Published cases appear in the case library, visible to all students (open library — no cohort scoping)
- Students attempt cases from the library → this creates the faculty-student data relationship
- Faculty sees which students have attempted their cases via `/faculty/students` page

### Faculty sees students who:
- Have an active attempt on any case the faculty created
- Have a completed attempt on any case the faculty created

### Faculty does NOT:
- Have a direct assignment relationship with specific students
- See students who haven't touched any of their cases
- Manage or mentor students (that's the mentor's role)

### Decisions (locked)
- **Open library:** All published cases are visible to all students — no cohort scoping needed
- **Case-based faculty-student relationship:** Faculty sees only students who have an active or completed attempt on one of their cases. No cohort assignment table. The relationship forms naturally as students attempt cases. Faculty dashboard shows total published cases count + total students in system as context, but the student list stays attempt-scoped.

```
Faculty publishes case
    │
    ├── case appears in /student/case-studies library
    ├── mentor can see and assign it to their students
    ├── students can attempt it (one attempt per case, enforced at DB level)
    └── faculty/students page shows any student who starts an attempt
```

**API:** `GET /api/faculty/students` (students with attempts on this faculty's cases)

---

## 5. Relationship: Mentor → Case Study → Student (Case Assignment)

**This is the active intervention flow — mentor proactively assigns a specific case to a student.**

### Rules
- Mentor can only assign published cases (from the full case library)
- One attempt per case per student — if student already attempted that case, assignment is blocked with a message: "This student has already attempted this case"
- Assigned case appears immediately in student's `/student/case-studies` pending list, tagged "Assigned by mentor"
- Mentor can see assignment status: Pending (student hasn't started) / Active (in progress) / Completed

### Assignment flow
```
Mentor clicks "Assign Case" on /mentor/student/:id
    │
    ├── opens case selector (searchable, shows published cases only)
    ├── system checks: has student already attempted this case?
    │     YES → block + show message
    │     NO  → proceed
    ├── creates assigned_cases record:
    │     (student_id, case_id, assigned_by_mentor_id, assigned_at, status='pending')
    ├── case appears in student's pending list immediately
    ├── notification sent to student: "Your mentor has assigned you a new case study"
    └── intervention logged automatically:
          (student_id, mentor_id, type='case_assigned', notes='Case: [title]')
```

**New table needed:** `assigned_cases`
```
assignment_id     UUID, PK
student_id        FK → students
case_id           FK → simulations (cases)
assigned_by       FK → mentors
assigned_at       TIMESTAMP
status            ENUM('pending', 'active', 'completed')
```

**API:**
- `GET /api/mentor/cases` (published case library, for the selector)
- `POST /api/mentor/students/{id}/assign-case`
- `GET /api/mentor/students/{id}/assigned-cases` (with status)

---

## 6. Dynamic Data: Capability Scores

**The most important dynamic data in the platform. Every portal reads from this.**

### When scores update
Capability scores update after every completed simulation attempt. The update happens in this sequence:

```
Student submits Defense responses (Stage 4 complete)
    │
    ├── AI Evaluation Engine runs
    │     (applies rubric weights from rubric-builder per case)
    │     returns: quality_score, logic_score, creativity_score,
    │              practicality_score, risk_score, reflection_score
    │
    ├── Attempt record updated:
    │     simulation_attempts.score = weighted_total
    │     simulation_attempts.end_time = now
    │     simulation_attempts.status = 'completed'
    │
    ├── Capability scores recalculated (per capability):
    │     new_score = (current_score * weight) + (attempt_score * (1 - weight))
    │     (rolling weighted average — recent attempts count more)
    │     written to student_capability table
    │
    ├── Level progression check:
    │     if new overall score crosses a level threshold → update students.CurrentLevel
    │
    ├── Score drop alert check (event-triggered, immediate):
    │     if (old_score - new_score) >= SCORE_DROP_THRESHOLD → write alert row
    │
    └── APScheduler sweep re-evaluates remaining alert conditions at next 6hr interval
```

### Which portals read capability scores
| Portal | Page | What they see |
|---|---|---|
| Student | `/student/capability` | Their own scores + trend over time |
| Student | `/student/dashboard` | Summary bar chart |
| Mentor | `/mentor/student/:id` | Full capability profile + trend |
| Mentor | `/mentor/students` | Single aggregate score per student |
| Mentor | `/mentor/dashboard` | Weakness signals across cohort |
| Faculty | `/faculty/students` | Capability snapshot per student |
| Faculty | `/faculty/analytics` | Cohort-level distribution |
| Director | `/director/cohort-analytics` | Institution-wide aggregates |
| Admin | `/admin/dashboard` | No capability scores (operational role) |

### Scoring formula
```python
# Rolling weighted average — gives more weight to recent attempts
RECENCY_WEIGHT = 0.3  # admin-configurable in Settings → Capability Thresholds (default: 0.3)

def update_capability_score(current_score, new_attempt_score):
    return round(
        (current_score * (1 - RECENCY_WEIGHT)) + (new_attempt_score * RECENCY_WEIGHT),
        1
    )
```

**API:**
- `GET /api/student/capabilities` (student's own scores + history)
- `GET /api/mentor/students/{id}/capabilities` (mentor view)
- `GET /api/faculty/analytics/capabilities` (cohort aggregate)

---

## 7. Dynamic Data: Dashboard Stats (All Portals)

Each portal's dashboard must reflect live counts. Here's what each number is computed from:

### Student Dashboard
| Stat | Source |
|---|---|
| Overall Capability Score | AVG of all student_capability.CurrentScore for this student |
| Per-capability scores | student_capability rows for this student |
| Pending simulations | simulation_attempts with status='pending' OR assigned_cases with status='pending' |
| Completed simulations | simulation_attempts with status='completed' |
| Current Level | students.CurrentLevel |
| Upcoming mentor session | sessions JOIN session_students WHERE student_id AND scheduled_at > now |

### Faculty Dashboard
| Stat | Source |
|---|---|
| Active Students | DISTINCT student_id from simulation_attempts WHERE case created_by = this faculty AND status='active' |
| Simulations Running | simulation_attempts WHERE status='active' AND case created_by = this faculty |
| Pending Reviews | simulation_attempts WHERE status='completed' AND reviewed=false AND case created_by = this faculty |
| Capability Alerts | alerts WHERE student_id IN (students who attempted this faculty's cases) AND status='active' |

### Mentor Dashboard
| Stat | Source |
|---|---|
| Assigned Students | COUNT(students WHERE mentor_id = this mentor) |
| At Risk | COUNT(alerts WHERE mentor_id = this mentor AND severity='critical' AND status='active') |
| Top Performers | COUNT(students WHERE mentor_id = this mentor AND overall_score >= 85) |
| Sessions This Week | COUNT(sessions WHERE mentor_id = this mentor AND scheduled_at BETWEEN week_start AND week_end) |
| Weakness Signals | GROUP BY capability: COUNT(student_capability WHERE score < 60 AND student.mentor_id = this mentor) |

### Admin Dashboard
| Stat | Source |
|---|---|
| Total Users | COUNT(users WHERE status='active') |
| Active Today | COUNT(users WHERE last_login >= today) |
| Pending Imports | COUNT(import_queue WHERE status='pending_review') |
| Users by Role | COUNT(users) GROUP BY role |

### Director Dashboard
| Stat | Source |
|---|---|
| Total Students | COUNT(students) |
| Average Capability Score | AVG(student_capability.CurrentScore) across all students |
| Strongest/Weakest Area | MAX/MIN AVG(score) GROUP BY capability |
| Placements Ready | COUNT(students WHERE overall_score >= PLACEMENT_THRESHOLD) |
| Startup Ready | COUNT(students WHERE career_track = 'Entrepreneurship' AND overall_score >= STARTUP_THRESHOLD) |

**All dashboard summary endpoints use DB-level aggregations (not application-level loops) and are cached for 5 minutes.**

**Caching approach (locked):** In-memory caching using a thin `cache.get/set` wrapper around `functools.lru_cache` with a TTL — zero new infrastructure, handles current scale (4,000 students) comfortably in a single FastAPI process. The wrapper is Redis-ready: when multi-process scaling is needed, only the cache backend file changes, not any endpoint code.

```python
# cache.py — swap backing store here only when Redis is needed
from functools import lru_cache
import time

_cache = {}

def cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() < entry['expires']:
        return entry['value']
    return None

def cache_set(key: str, value, ttl_seconds: int = 300):
    _cache[key] = {'value': value, 'expires': time.time() + ttl_seconds}
```

---

## 8. Dynamic Data: Notifications & Alerts Cross-Portal

### Who gets notified of what

| Event | Student | Mentor | Faculty | Admin | Director |
|---|---|---|---|---|---|
| Account created | ✓ (set-password email) | — | — | — | — |
| Mentor assigned | ✓ | ✓ | — | — | — |
| Case assigned by mentor | ✓ | — | — | — | — |
| Simulation completed | — | ✓ | ✓ | — | — |
| Score drop (critical) | — | ✓ (alert) | — | — | — |
| Level achieved | ✓ | ✓ | — | — | — |
| Session scheduled | ✓ | — | — | — | — |
| Placement ready threshold | ✓ | ✓ | — | — | ✓ |
| No activity X days | — | ✓ (alert) | — | — | — |
| Notification delivery failure | — | — | — | ✓ | — |

### Notification channels (per admin settings)
Each event above fires through whichever channels are enabled: Email / WhatsApp / SMS / Mobile Push

---

## 9. Decisions Log (all resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Case library scoping | **Open library** — all published cases visible to all students, no cohort scoping |
| 2 | Faculty-to-student relationship | **Case-based** — faculty sees students through attempts on their cases only. No cohort assignment table. The relationship forms naturally. Faculty dashboard shows total published cases + total students in system as audience context. |
| 3 | Student case selection | **Assigned cases only — phase 1.** Future phase: system auto-unlocks self-selection when `students.CurrentLevel` matches or exceeds a case's difficulty level. No UI change needed for phase 1 — the case library simply shows only assigned cases. |
| 4 | Recency weight | **Admin-configurable** — stored in settings, default 0.3. Surfaced in Admin Settings → Capability Thresholds section (SPEC_08 Section 5a). |
| 5 | Dashboard caching | **In-memory `lru_cache` with TTL wrapper** — zero new infrastructure, Redis-ready interface. See caching code block in Section 7. |
| 6 | Capability score seeding | **Show as 0** — student dashboard shows all capability scores at 0 until first attempt is completed. No hiding or special empty state needed. |

---

## 10. New Table Required (from this spec)

### Table: `assigned_cases`
```
assignment_id     UUID, PK
student_id        FK → students.student_id
case_id           FK → simulations.simulation_id
assigned_by       FK → mentors.mentor_id (nullable — null = system/admin assigned)
assigned_at       TIMESTAMP
status            ENUM('pending', 'active', 'completed')
```
This is separate from `simulation_attempts` — an assignment is a *queue entry* (intent), an attempt is the *actual work record* (execution). When a student starts an assigned case, a `simulation_attempt` row is created and the `assigned_cases.status` is updated to 'active'.

---

## 11. Full Data Flow: End-to-End Example

**"Admin onboards a new batch → mentor is assigned → mentor assigns a case → student completes it → scores update across all portals"**

```
1. Admin imports 60 students via CSV (with mentor_id column)
      → 60 user + student records created
      → 3 mentors each get 20 new students in their roster
      → 60 set-password emails sent

2. Student Amit Sharma logs in, selects career track: Consulting
      → students.career_track updated
      → Consulting-relevant cases highlighted in his case library

3. Mentor Ravi Mehta opens /mentor/students
      → Sees Amit Sharma in his roster
      → Opens /mentor/student/amit-id
      → Sees capability scores all at 0 (no attempts yet)
      → AI Suggestions: "No simulation data yet — recommend starting with a Level 1 case"
      → Assigns: "Restaurant Sales Decline (Level 1)"

4. Amit receives notification: "Your mentor has assigned you a case study"
      → Opens /student/case-studies
      → Sees "Restaurant Sales Decline" tagged "Assigned by Mentor" in pending list
      → intervention_log auto-written: type=case_assigned

5. Amit starts the case
      → simulation_attempts row created (status='active', start_time=now)
      → assigned_cases.status updated to 'active'
      → Faculty dashboard: Simulations Running count +1

6. Amit completes all 5 stages (analysis → AI → solution → defense → reflection)
      → AI Evaluation Engine runs, applies rubric weights
      → Returns: Quality=72, Logic=68, Creativity=65, Practicality=70,
                 Risk=60, Reflection=75
      → simulation_attempts.score = weighted total (69.5)
      → simulation_attempts.status = 'completed'
      → student_capability rows updated (rolling weighted average)
      → assigned_cases.status = 'completed'

7. Score update triggers:
      → Score drop check: first attempt, no previous score → no alert
      → Level check: score 69.5 → Level 2 (60-70 range) → students.CurrentLevel = 2
      → Mentor notified: "Amit Sharma completed Restaurant Sales Decline — Score: 69"
      → Faculty notified: "New attempt on your case — Restaurant Sales Decline"

8. Ravi opens /mentor/student/amit-id
      → Sees updated capability bars (not all zero anymore)
      → Clicks "View Thinking Path" on the completed attempt
      → Reads Amit's initial analysis, AI conversation log, solution, reflection
      → Adds a mentor comment: "Good first attempt. Initial analysis was shallow —
         didn't identify cost structure as a variable. Discuss in next session."
      → Flags for session discussion

9. All portals now reflect updated data:
      → Student dashboard: capability scores visible, Level 2 badge
      → Mentor dashboard: Amit no longer showing "no data"
      → Faculty analytics: cohort attempt count +1, average score updated
      → Director dashboard: institution average capability score recalculated
```

---

## 12. Build Order for This Spec

Run in this sequence to avoid blocked dependencies:

1. **`assigned_cases` migration** (new table — needed for case assignment flow)
2. **Capability score update logic** (backend: score recalculation + level progression, triggered by attempt completion — this is the engine everything else reads from)
3. **Score drop alert trigger** (event-triggered, inside the score-write transaction)
4. **Admin: mentor assignment** (single + bulk) — unblocks mentor roster
5. **Admin: career track assignment** — unblocks student career page data
6. **Mentor: case assignment** → `assigned_cases` write + student notification
7. **Student: pending list** — reads `assigned_cases` + shows "Assigned by Mentor" tag
8. **Dashboard stat queries** (all portals — each portal's summary endpoint) — built after the underlying data is flowing
9. **Notification dispatch** (wire all the events from Section 8 to the notification engine)
11. **Cache wrapper** (`cache.py`) — implement the thin TTL wrapper early so all dashboard endpoints use it from the start; swap to Redis later without touching endpoint code

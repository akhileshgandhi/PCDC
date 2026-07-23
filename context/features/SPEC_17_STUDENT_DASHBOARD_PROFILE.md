# SPEC_17: Student Portal — Dynamic Dashboard + Profile

**Pages:** `/student/dashboard`, `/student/profile` (new)
**Type:** Make existing static sections dynamic + add profile feature
**Depends on:** Auth module (done), student_capability table, simulation_attempts table, assigned_cases table, class_sections/student_sections tables (SPEC_12)

---

## 0. What's Dynamic vs Static (Locked Decisions)

| Section | Status |
|---|---|
| Hero panel (welcome, course info, score, level) | **Dynamic** |
| Top-right header (name, role) | **Dynamic** |
| Capability Matrix (4 categories + 20 sub-capabilities) | **Dynamic** |
| Student Profile page (name, email, course, section etc.) | **Dynamic** (read-only) |
| Active Engagements (4 cards) | **Static** |
| AI Coaches | **Static** |
| Mentor Support | **Static** |
| Recent Evaluations | **Static** |
| Achievements | **Static** |
| Career Pathway | **Static** |

---

## 1. Dynamic: Hero Panel

**Currently shows:** "Welcome back, Sanjay · MBA · Semester II · MBA 2024-26 · MBA-II-A" + Overall Score 0 + Level 1

**Must come from the database, not hardcoded.**

### Data needed:

| Field | Source |
|---|---|
| Student first name | `users.full_name` (split to first name) |
| Course | `courses.course_name` via `student_sections → class_sections → courses` |
| Semester | `semesters.semester_name` via same join chain |
| Batch | `batches.batch_name` |
| Section | `class_sections.section_name` |
| Overall Score | Calculated — see Section 4 (Capability Score Algorithm) |
| Level | Derived from Overall Score — see Section 4 |
| Career Track | `students.career_track` |

### Hero panel motivational text:

Currently: "Your next challenge is designed to strengthen strategic judgment and risk awareness. Keep sharpening."

**Rule:** Pick the student's lowest-scoring capability category and use a fixed message map:

```python
HERO_MESSAGES = {
    "cognitive": "Your next challenge is designed to sharpen analytical thinking and decision quality.",
    "leadership": "Your next challenge is designed to strengthen leadership presence and communication.",
    "entrepreneurial": "Your next challenge is designed to build risk awareness and entrepreneurial thinking.",
    "professional": "Your next challenge is designed to develop professional judgment and execution skills.",
    "no_attempts": "Your next challenge is designed to strengthen strategic judgment and risk awareness. Keep sharpening."  # default before any attempts
}
```

If no attempts yet → show the default "no_attempts" message.

### CTA Button:

- If student has an active in-progress attempt → show "Continue Active Case →" (links to that attempt)
- If no active attempt → show "Browse Case Studies →" (links to `/student/case-studies`)

### API endpoint:
`GET /api/student/dashboard/hero`

Response:
```json
{
  "first_name": "Sanjay",
  "course": "MBA",
  "semester": "Semester II",
  "batch": "MBA 2024-26",
  "section": "MBA-II-A",
  "career_track": "Management Consulting",
  "overall_score": 0,
  "level": 1,
  "level_label": "Foundation",
  "hero_message": "Your next challenge is designed to...",
  "active_attempt_id": null
}
```

---

## 2. Dynamic: Top-Right Header

**Currently shows:** "Sanjay Mehta, MBA · MBA" (role shown twice — this is a bug)

**Should show:** Name from database + role label

| Field | Source |
|---|---|
| Full name | `users.full_name` |
| Role label | `users.role` → display as "Student" not raw value |
| Avatar initials | First letter of first name + first letter of last name |
| Avatar image | Not implemented yet — initials fallback is fine |

**Fix the duplicate "MBA" bug:** The header subtitle should show the role ("Student"), not the program again. The program is already shown in the hero panel.

This data comes from the JWT payload decoded on the frontend — no separate API call needed. Ensure the JWT includes: `full_name`, `role`, and `student_id`.

---

## 3. Dynamic: Capability Matrix

**Currently:** Blank (SPEC_13 wrote a hardcoded version as a stopgap)

**Now:** Replace the hardcoded `capabilityData` array with a real API call.

### API endpoint:
`GET /api/student/dashboard/capabilities`

Response:
```json
{
  "categories": [
    {
      "id": "cognitive",
      "label": "Cognitive Capabilities",
      "score": 68,
      "items": [
        { "name": "Analytical Thinking", "score": 74, "attempts": 3 },
        { "name": "Critical Thinking", "score": 65, "attempts": 1 },
        { "name": "Strategic Thinking", "score": 71, "attempts": 2 },
        { "name": "Systems Thinking", "score": 0, "attempts": 0 },
        { "name": "Decision Making", "score": 70, "attempts": 2 }
      ]
    },
    ...
  ],
  "overall_score": 68,
  "total_attempts": 8
}
```

Sub-capabilities with 0 attempts show score as 0 (per SPEC_10 decision). The `attempts` count is shown as a tooltip on hover: "Based on 3 case attempts".

### Score calculation algorithm — see Section 4 below.

### Frontend change:
Replace the hardcoded `capabilityData` constant with `useEffect` → fetch from `/api/student/dashboard/capabilities` → same component structure as SPEC_13, same accordion interaction. Add a loading skeleton while fetching.

---

## 4. Capability Score Algorithm (Backend)

This is the core engine. Runs every time a student completes an attempt, and also on-demand when the dashboard loads.

### Step 1 — Per-attempt, per-capability score attribution

When a student completes a case attempt:
- The case has `targeted_capabilities` (array of sub-capability names, e.g. `["Analytical Thinking", "Decision Making"]`)
- The attempt produces a `marks_total` (out of 10)
- Convert marks to a 0–100 score: `attempt_score = (marks_total / 10) * 100`
- This score is attributed equally to ALL targeted capabilities of that case

```python
attempt_score = (attempt.marks_total / 10) * 100
targeted_capabilities = case.targeted_capabilities  # e.g. ["Analytical Thinking", "Decision Making"]

for capability_name in targeted_capabilities:
    update_capability_score(student_id, capability_name, attempt_score)
```

### Step 2 — Rolling weighted average per sub-capability

```python
RECENCY_WEIGHT = 0.3  # admin-configurable, default 0.3

def update_capability_score(student_id, capability_name, new_score):
    current = get_current_score(student_id, capability_name)  # from student_capability table

    if current.attempt_count == 0:
        # First attempt — set score directly
        new_stored_score = new_score
    else:
        # Rolling weighted average — recent attempts count more
        new_stored_score = round(
            (current.score * (1 - RECENCY_WEIGHT)) + (new_score * RECENCY_WEIGHT),
            1
        )

    save_score(student_id, capability_name, new_stored_score)
    increment_attempt_count(student_id, capability_name)
```

### Step 3 — Category score (average of 5 sub-capabilities)

```python
CATEGORY_MAP = {
    "cognitive": ["Analytical Thinking", "Critical Thinking", "Strategic Thinking",
                  "Systems Thinking", "Decision Making"],
    "leadership": ["Communication", "Influence", "Negotiation",
                   "Conflict Resolution", "Team Management"],
    "entrepreneurial": ["Opportunity Recognition", "Innovation", "Business Model Thinking",
                        "Risk Assessment", "Resourcefulness"],
    "professional": ["Professional Judgment", "Business Acumen", "Execution Orientation",
                     "Learning Agility", "Adaptability"]
}

def get_category_score(student_id, category):
    sub_scores = [get_score(student_id, cap) for cap in CATEGORY_MAP[category]]
    return round(sum(sub_scores) / len(sub_scores), 1)
```

### Step 4 — Overall Score and Level

```python
def get_overall_score(student_id):
    all_scores = [get_score(student_id, cap) for all 20 capabilities]
    return round(sum(all_scores) / 20, 1)

LEVEL_THRESHOLDS = [
    (0,  19,  1, "Foundation"),
    (20, 39,  2, "Regular"),
    (40, 59,  3, "Pro"),
    (60, 79,  4, "Expert"),
    (80, 100, 5, "Champion"),
]

def get_level(overall_score):
    for min_score, max_score, level, label in LEVEL_THRESHOLDS:
        if min_score <= overall_score <= max_score:
            return level, label
    return 1, "Foundation"
```

**Note on thresholds:** These adopt the 5-level system from the actual case studies (SPEC_11). Open question flagged in SPEC_11 — these values should be confirmed. Current proposal: 0–19=Foundation, 20–39=Regular, 40–59=Pro, 60–79=Expert, 80–100=Champion. Update `LEVEL_THRESHOLDS` in admin settings later if needed.

### When does this run?

**Trigger 1 — On attempt completion:**
Inside the same DB transaction that writes `simulation_attempts.status = 'completed'`, call the update function for each targeted capability. This is event-triggered and immediate (per SPEC_10 Section 6 decision).

**Trigger 2 — On dashboard load (safety net):**
The `GET /api/student/dashboard/capabilities` endpoint reads directly from `student_capability` table — it does NOT recalculate on every load. The table is always up to date because Trigger 1 keeps it current.

### student_capability table structure (confirm exists):
```
student_id          FK → students
capability_name     VARCHAR(100)   -- exact sub-capability name
current_score       NUMERIC(5,1)   -- 0.0 to 100.0
attempt_count       INTEGER        -- how many attempts contributed to this score
last_updated        TIMESTAMP
```

If `attempt_count = 0`, score = 0 (per SPEC_10 decision — show as 0, not hidden).

---

## 5. New: Student Profile Page

**Route:** `/student/profile`
**Access:** Via dropdown from top-right avatar/name click

### Top-right dropdown menu:

Clicking the avatar/name in the header opens a small dropdown:
```
┌──────────────────────────┐
│  [SM] Sanjay Mehta       │
│       Student            │
│  ─────────────────────   │
│  👤 My Profile           │
│  🎯 Career Pathway       │
│  ─────────────────────   │
│  🚪 Logout               │
└──────────────────────────┘
```

"My Profile" → navigates to `/student/profile`

### Profile page layout:

```
┌─────────────────────────────────────────────────────┐
│  My Profile                                          │
│  Your personal and academic information              │
├─────────────────────────────────────────────────────┤
│  [SM]  Sanjay Mehta                                  │
│        Student · MBA 2024-26                         │
├─────────────────────────────────────────────────────┤
│  PERSONAL INFORMATION                               │
│  Full Name        Sanjay Mehta          (read-only) │
│  Email            sanjay@prestige.edu   (read-only) │
├─────────────────────────────────────────────────────┤
│  ACADEMIC INFORMATION                               │
│  Course           MBA                   (read-only) │
│  Batch            MBA 2024-26           (read-only) │
│  Semester         Semester II           (read-only) │
│  Section          MBA-II-A              (read-only) │
│  Program          MBA                   (read-only) │
├─────────────────────────────────────────────────────┤
│  MENTOR                                             │
│  [AR]  Dr. Ananya Rao                               │
│        Assigned Executive Mentor                    │
│        [Schedule Session]                           │
├─────────────────────────────────────────────────────┤
│  CAREER                                             │
│  Current Pathway  Management Consulting             │
│                   [Change Pathway →]                │
│                   (links to /student/career)        │
├─────────────────────────────────────────────────────┤
│  ⓘ Academic details (course, semester, section)     │
│  are managed by the institution. Contact your       │
│  program administrator to make changes.             │
└─────────────────────────────────────────────────────┘
```

### Rules:
- ALL fields are **read-only** — no edit buttons, no input fields
- Course, Semester, Batch, Section cannot be changed by the student (ERP-connected — per your requirement)
- Career Pathway is the only navigable action — links to `/student/career` which has its own change flow
- The info banner at the bottom explains why fields are read-only (don't leave the student confused)

### API endpoint:
`GET /api/student/profile`

Response:
```json
{
  "full_name": "Sanjay Mehta",
  "email": "sanjay@prestige.edu",
  "course": "MBA",
  "batch": "MBA 2024-26",
  "semester": "Semester II",
  "section": "MBA-II-A",
  "career_track": "Management Consulting",
  "mentor": {
    "name": "Dr. Ananya Rao",
    "initials": "AR"
  }
}
```

---

## 6. API Endpoints Summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/student/dashboard/hero` | Hero panel data (name, course, score, level, CTA) |
| GET | `/api/student/dashboard/capabilities` | All 20 capability scores + 4 category scores |
| GET | `/api/student/profile` | Full profile for profile page |

All 3 endpoints require auth (JWT), return data scoped to the logged-in student only.

---

## 7. Files to Touch

**Backend:**
- `backend/services/student/router.py` — add 3 new endpoints
- `backend/services/student/service.py` — hero data query, capability score read, profile query
- `backend/services/student/capability_engine.py` — **new file** for the scoring algorithm (Steps 1–4 in Section 4). Keep this isolated so it can be called from the attempt completion flow AND tested independently.
- `backend/services/attempts/service.py` (or equivalent) — call `capability_engine.update_scores()` on attempt completion

**Frontend:**
- `frontend/src/pages/student/Dashboard.jsx` — replace hardcoded hero data with API call; replace hardcoded capability data with API call
- `frontend/src/components/student/CapabilityMatrix.jsx` (from SPEC_13) — add `useEffect` fetch, loading skeleton, replace hardcoded data prop
- `frontend/src/components/layout/StudentHeader.jsx` (or equivalent) — add dropdown menu, fix duplicate role/program bug
- `frontend/src/pages/student/Profile.jsx` — **new page**, read-only profile
- `frontend/src/App.jsx` (or router file) — add `/student/profile` route

---

## 8. Acceptance Criteria

**Hero panel:**
- [ ] Student name comes from database (not hardcoded)
- [ ] Course, Semester, Batch, Section come from the student's enrolled section
- [ ] Overall Score comes from capability engine (0 if no attempts)
- [ ] Level shows as numeric (1–5) with label (Foundation/Regular/Pro/Expert/Champion)
- [ ] Hero message reflects weakest capability category (or default if no attempts)
- [ ] CTA shows "Continue Active Case" if active attempt exists, "Browse Case Studies" otherwise

**Header:**
- [ ] Name comes from JWT/API (not hardcoded)
- [ ] Role shows "Student" not "MBA" or raw role value
- [ ] Dropdown opens on click with Profile, Career Pathway, Logout options

**Capability Matrix:**
- [ ] All 20 sub-capabilities show real scores from student_capability table
- [ ] Scores start at 0 before any attempts
- [ ] Category scores are averages of their 5 sub-capabilities
- [ ] Loading skeleton shows while API call is in flight
- [ ] Accordion interaction still works (from SPEC_13)

**Capability Engine:**
- [ ] Score updates immediately when an attempt is marked complete
- [ ] Rolling weighted average uses RECENCY_WEIGHT = 0.3
- [ ] First attempt sets score directly (no weighted average on first entry)
- [ ] All targeted capabilities of a case are updated equally
- [ ] Overall score = average of all 20 sub-capability scores

**Profile page:**
- [ ] All fields read-only — no editable inputs anywhere
- [ ] Course/Semester/Section/Batch display correctly
- [ ] Mentor name shown
- [ ] Info banner explains why fields are not editable
- [ ] Career Pathway shows current track with link to change it
- [ ] Accessible from top-right dropdown

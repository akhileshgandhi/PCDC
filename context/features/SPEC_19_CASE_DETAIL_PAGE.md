# SPEC_18: Student Case Study Detail Page — Dynamic

**Route:** `/student/case/:id`
**Current state:** Fully static/hardcoded
**Goal:** All content from DB + live attempt state + correct CTA based on attempt status

---

## 0. What This Page Does

When a student clicks a case study from their list, this page opens. It serves two purposes:
1. **Briefing** — show the student everything about the case before they start
2. **Attempt gateway** — show their current attempt state and the correct action to take (Start / Continue / View Results)

The right panel ("Your Attempt") is the most important dynamic element — it drives what the student does next.

---

## 1. Page Layout — All Sections

```
┌──────────────────────────────────┐  ┌─────────────────────────────┐
│ LEFT — Case Content              │  │ RIGHT — Attempt State       │
│                                  │  │                             │
│ [Industry] [Level X]             │  │ Your Attempt                │
│ Case Title                       │  │ ─────────────────────────  │
│ Short description                │  │ ⏱ Duration                 │
│ Estimated time · Added · By      │  │ 📊 Level + Capability name  │
│                                  │  │ 🎯 One attempt only         │
│ The Situation                    │  │                             │
│ [full case background text]      │  │ [Warning box]               │
│                                  │  │ [Status + CTA button]       │
│ What You Will Develop            │  │                             │
│ • Learning outcome 1             │  ├─────────────────────────────┤
│ • Learning outcome 2             │  │ Capabilities Assessed       │
│ • ...                            │  │ [chip] [chip] [chip]        │
│                                  │  ├─────────────────────────────┤
│ You Will Be Asked To Reflect On  │  │ Relevant Career Tracks      │
│ 1. Reflection Q 1 (greyed out)   │  │ [chip] [chip]               │
│ 2. Reflection Q 2 (greyed out)   │  └─────────────────────────────┘
│ 3. Reflection Q 3 (greyed out)   │
│ "These appear after AI discussion"│
└──────────────────────────────────┘
```

---

## 2. Left Panel — Case Content (from DB)

All fields pulled from the `simulations` table and related tables.

| UI Element | DB Source |
|---|---|
| Industry tag | `simulations.industry` |
| Level tag ("Level 3") | `simulations.difficulty` |
| Case title | `simulations.title` |
| Short description (subtitle under title) | First 2 sentences of `simulations.situation` — truncated, not a separate field |
| Estimated time | `simulations.reading_time_minutes + simulations.answer_writing_time_minutes + 8 (rapid fire constant)` — display as total minutes |
| Added date | `simulations.created_at` formatted as "Jun 20, 2025" |
| Created by | `users.full_name` via `simulations.created_by → users.id` |
| The Situation | `simulations.situation` (full text) |
| What You Will Develop | `simulations.learning_outcomes` — stored as array, rendered as bullet list |
| You Will Be Asked To Reflect On | `case_questions.question_text` for all 3 questions (from `case_questions` table, ordered by `question_number`) — shown greyed out with note "These questions appear after your AI discussion" |

**Note on Reflection Questions display:** Show all 3 structured questions in italic/greyed style so the student knows what they'll be asked — but cannot interact with them yet. This is a preview only, not the answer form. The actual answer form is in the attempt flow.

---

## 3. Right Panel — Attempt State (Dynamic)

This panel changes entirely based on the student's attempt status for this case. There are 4 possible states:

### State A — Not Started (no attempt record exists)

```
Your Attempt
─────────────────────────────
⏱  45 minutes
📊 Level 3 · Decision Making
🎯 One attempt only

⚠ Read the full case before starting.
  You cannot restart once begun.

[          Start Attempt →          ]
```

CTA: Gold "Start Attempt →" button
Action on click: Creates a new `simulation_attempts` record (status='active', start_time=now, stage=1), redirects to `/student/attempt/{attempt_id}/stage/1`

### State B — In Progress (attempt exists, status='active')

```
Your Attempt
─────────────────────────────
⏱  45 minutes
📊 Level 3 · Decision Making
🎯 One attempt only

⚠ Read the full case before starting.
  You cannot restart once begun.

● In Progress — Stage 3 of 6

[         Continue Attempt →        ]
```

CTA: Gold "Continue Attempt →" button
Action on click: Redirects to `/student/attempt/{attempt_id}/stage/{current_stage}`
Stage indicator: "Stage X of 6" — X comes from `simulation_attempts.current_stage`

### State C — Completed (attempt exists, status='completed')

```
Your Attempt
─────────────────────────────
⏱  45 minutes
📊 Level 3 · Decision Making
🎯 One attempt only

✓ Completed — Jun 20, 2025
  Score: 7.5 / 10  |  Good

[          View My Results          ]
```

CTA: Outline "View My Results" button
Action on click: Redirects to `/student/attempt/{attempt_id}/results`
Score shown: `simulation_attempts.marks_total` out of 10 + grade label (see Section 6)

### State D — Ineligible (attempt submitted but marked ineligible — less than 70% completion)

```
Your Attempt
─────────────────────────────
⏱  45 minutes
📊 Level 3 · Decision Making
🎯 One attempt only

✗ Attempt Incomplete
  You did not meet the 70% completion
  threshold. This attempt cannot be
  evaluated.

[          View Submission          ]
```

CTA: Grey "View Submission" button — shows what they submitted but no score
No retry allowed — one attempt only.

---

## 4. Right Panel — Capabilities Assessed & Career Tracks

### Capabilities Assessed

Source: `simulations.targeted_capabilities` (array of sub-capability names)
Display: Pills/chips, same style as shown in screenshot

```
Capabilities Assessed
[Strategic Thinking] [Decision Making] [Analytical Thinking]
```

If the student has already attempted this case (State C or D), add a small score indicator next to each capability:
```
[Strategic Thinking ↑74] [Decision Making ↔68] [Analytical Thinking ↑71]
```
↑ = score increased from this attempt, ↔ = unchanged, ↓ = decreased. Pull from `student_capability` table comparison before/after this attempt.

### Relevant Career Tracks

Source: `simulations.recommended_courses` (array) — but this field stores course IDs, not career track names. 

**Clarification needed:** The screenshot shows "Consulting" and "Marketing" as career tracks, not course names. This field likely needs to be either:
- A separate `recommended_career_tracks` array on the case (e.g. ["Consulting", "Marketing"])
- Or derived from the capabilities targeted (Consulting cases typically involve Strategic Thinking etc.)

**Recommendation:** Add a `recommended_career_tracks TEXT[]` column to `simulations` table. Faculty sets this in Case Builder (multi-select from the career track list). Display as chips here.

---

## 5. The Attempt Flow — Stage Map

When "Start Attempt" or "Continue Attempt" is clicked, student goes into the attempt flow. This page is the gateway — it doesn't handle the actual attempt stages. For completeness, the stage map:

| Stage | Screen | Route |
|---|---|---|
| 1 | Read case + Initial Analysis form (3 questions) | `/student/attempt/:id/stage/1` |
| 2 | AI Discussion | `/student/attempt/:id/stage/2` |
| 3 | Solution Submission | `/student/attempt/:id/stage/3` |
| 4 | Rapid Fire Round | `/student/attempt/:id/stage/4` |
| 5 | AI Defense | `/student/attempt/:id/stage/5` |
| 6 | Results & Evaluation | `/student/attempt/:id/stage/6` |

`simulation_attempts.current_stage` is updated as the student progresses. This case detail page reads the current stage and shows "Stage X of 6" in State B.

---

## 6. Grade Labels (for State C — Completed)

Map `marks_total` (out of 10) to a display label:

| Score | Label | Color |
|---|---|---|
| 9.0 – 10.0 | Exceptional | Green |
| 7.5 – 8.9 | Excellent | Green |
| 6.5 – 7.4 | Good | Blue |
| 5.5 – 6.4 | Improving | Amber |
| 0 – 5.4 | Needs Work | Red |

These labels match what's visible in the Recent Evaluations section of the dashboard (Image 3 from previous spec).

---

## 7. DB Changes Required

### Add column to `simulation_attempts`:
```sql
ALTER TABLE simulation_attempts
ADD COLUMN current_stage INTEGER DEFAULT 1;
-- Tracks which stage the student is currently on (1-6)
-- Updated every time student advances to next stage
```

### Add column to `simulations`:
```sql
ALTER TABLE simulations
ADD COLUMN recommended_career_tracks TEXT[];
-- e.g. '{"Consulting", "Marketing"}'
-- Set by faculty in Case Builder
```

### Confirm existing columns:
- `simulations.targeted_capabilities TEXT[]` — should exist from SPEC_16 (hierarchical capability selector)
- `simulations.learning_outcomes TEXT[]` — should exist from original 9-section schema
- `simulations.situation TEXT` — should exist from original 9-section schema
- `simulation_attempts.marks_total NUMERIC(4,1)` — should exist from SPEC_11
- `simulation_attempts.eligible_for_evaluation BOOLEAN` — should exist from SPEC_11

---

## 8. API Endpoint

`GET /api/student/cases/:case_id`

Single endpoint returns everything the page needs:

```json
{
  "case": {
    "id": "uuid",
    "title": "Q3 Market Entry Strategy",
    "industry": "Business",
    "difficulty": 3,
    "difficulty_label": "Pro",
    "situation": "ABC Electronics, a mid-sized consumer electronics...",
    "learning_outcomes": [
      "Apply strategic frameworks to diagnose business decline",
      "Evaluate trade-offs in market re-entry strategies",
      "Develop data-driven recommendations under time pressure",
      "Anticipate competitive responses to strategic decisions"
    ],
    "reflection_questions": [
      "What assumptions did you make that could be challenged?",
      "How did your thinking evolve after the AI discussion?",
      "What would you do differently with more information?"
    ],
    "targeted_capabilities": ["Strategic Thinking", "Decision Making", "Analytical Thinking"],
    "recommended_career_tracks": ["Consulting", "Marketing"],
    "total_duration_minutes": 45,
    "created_by_name": "Dr. Ananya Rao",
    "created_at": "2025-06-20"
  },
  "attempt": {
    "exists": true,
    "attempt_id": "uuid",
    "status": "active",
    "current_stage": 3,
    "started_at": "2025-07-21T10:30:00Z",
    "completed_at": null,
    "marks_total": null,
    "eligible_for_evaluation": true
  }
}
```

If `attempt.exists = false` → right panel shows State A.
If `attempt.status = 'active'` → State B, use `current_stage`.
If `attempt.status = 'completed'` → State C, use `marks_total`.
If `attempt.eligible_for_evaluation = false` → State D.

---

## 9. Start Attempt Action

`POST /api/student/cases/:case_id/start`

- Checks: does an attempt already exist for this student + case? If yes → return 409 Conflict with `{"attempt_id": "...", "current_stage": 3}` so frontend redirects to existing attempt
- If no existing attempt → creates `simulation_attempts` record, returns `{"attempt_id": "...", "stage": 1}`
- Frontend redirects to `/student/attempt/{attempt_id}/stage/1`

---

## 10. Files to Touch

**Backend:**
- `backend/services/student/router.py` — add `GET /cases/:id` and `POST /cases/:id/start`
- `backend/services/student/service.py` — case detail query + attempt state query
- Alembic migration — `current_stage` column on `simulation_attempts` + `recommended_career_tracks` on `simulations`

**Frontend:**
- `frontend/src/pages/student/CaseDetail.jsx` (or `Case.jsx`) — replace all hardcoded content with API data
- Right panel component: extract as `frontend/src/components/student/AttemptPanel.jsx` — takes `attempt` object, renders correct state (A/B/C/D)
- Handle loading state (skeleton) and error state (case not found / not assigned to this student)

---

## 11. Acceptance Criteria

- [ ] Case title, industry, difficulty, description load from DB
- [ ] "Created by" shows faculty's real name from DB
- [ ] "Estimated time" is calculated as reading + writing + 8 (rapid fire)
- [ ] "Added" date shows `created_at` formatted correctly
- [ ] The Situation text comes from `simulations.situation`
- [ ] Learning outcomes render as bullet list from `learning_outcomes` array
- [ ] Reflection questions show greyed out from `case_questions` table
- [ ] Capabilities Assessed chips come from `targeted_capabilities`
- [ ] Relevant Career Tracks chips come from `recommended_career_tracks`
- [ ] Right panel shows State A if no attempt exists
- [ ] Right panel shows State B with correct stage number if attempt is active
- [ ] Right panel shows State C with score + grade label if attempt is completed
- [ ] Right panel shows State D if attempt is ineligible
- [ ] "Start Attempt" creates a new attempt record and redirects to stage 1
- [ ] "Start Attempt" is blocked (409 handled) if attempt already exists
- [ ] "Continue Attempt" redirects to the correct current stage
- [ ] "View My Results" redirects to results page
- [ ] Page shows 403/redirect if this case is not assigned to the student's section or by their mentor

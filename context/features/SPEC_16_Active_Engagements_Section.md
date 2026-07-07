# SPEC_16: Active Engagements Section (Student Dashboard)

## 1. PURPOSE

Introduce a new section on the Student Dashboard titled **"Active Engagements"**, positioned directly above the existing Capability Matrix (SPEC_13). This section groups three parallel engagement types into three side-by-side boxes, each behaving like a self-contained capability matrix (click-to-expand headers, accordion panel behavior, consistent visual language with SPEC_13).

This spec depends on and extends SPEC_13. It does not modify SPEC_13's existing Capability Matrix — it adds a new section above it.

## 2. SCOPE

Three boxes, left to right:

1. **Active Case Study** — existing component, relocated under the new "Active Engagements" heading. No structural or behavioral changes; only a possible container/wrapper change to sit inside the new section.
2. **Simulations** — new box. Fully defined capability structure (below).
3. **Concept Study** — new box. Placeholder only (TBD state) until a future spec defines its structure.

## 3. UI LAYOUT (ASCII)

```
------------------------------------------------------------------------------
ACTIVE ENGAGEMENTS
------------------------------------------------------------------------------
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ ACTIVE CASE STUDY       │ SIMULATIONS             │ CONCEPT STUDY          │
│                         │                         │                        │
│ ▸ Think                 │ ▸ Think                 │ ▸ Think                │
│ ▸ Lead                  │ ▸ Lead                  │ ▸ Lead                 │
│ ▸ Execute               │ ▸ Execute               │ ▸ Execute              │
│ ▸ Grow                  │ ▸ Grow                  │ ▸ Grow                 │
│                         │                         │                        │
│ [ Browse Case Studies ] │ [ Browse Simulations ]  │ [ Browse Concepts ]    │
└────────────────────────┴────────────────────────┴────────────────────────┘
------------------------------------------------------------------------------
CAPABILITY MATRIX   (existing — SPEC_13, now filterable — see Section 3.4)
------------------------------------------------------------------------------
```

### 3.4 Filter Button Behavior (NEW)

Each of the three boxes gets a full-width button at the bottom, matching the existing "Browse Case Studies" style:

| Box | Button Label |
|---|---|
| Active Case Study | Browse Case Studies |
| Simulations | Browse Simulations |
| Concept Study | Browse Concepts |

**Behavior:**
- Clicking a button does **not** navigate anywhere. The user stays on the dashboard.
- Clicking a button sets that box's engagement type as the **active filter** for the Capability Matrix section below. The Capability Matrix re-renders showing the four group averages (Cognitive / Leadership / Entrepreneurial / Professional) computed **only from that engagement type's data**.
- The clicked button is visually marked active/selected (e.g. filled/highlighted state) while the other two remain in their default outlined state.
- Default state on page load: no filter applied — Capability Matrix shows the combined/overall average across all engagement types (current behavior, unchanged from SPEC_13), and none of the three buttons appear selected.
- Clicking the already-active button again clears the filter and returns the Capability Matrix to the combined/overall view.
- Concept Study button is present and clickable in this phase for UI consistency, but since Concept Study has no backing capability data yet (Section 5), selecting it shows a "Coming Soon" state in place of the Capability Matrix scores rather than empty/zeroed cards.

### 3.5 Capability Matrix — Filtered State (ASCII)

```
Capability Matrix                                                    Details >
Real-time performance across core executive competencies.
Showing: Simulations only                                    [ Clear filter ]

┌────────────────────────────┐   ┌────────────────────────────┐
│ Cognitive Capabilities      │   │ Leadership Capabilities     │
│           71                │   │           64                │
│        avg score            │   │        avg score            │
└────────────────────────────┘   └────────────────────────────┘
┌────────────────────────────┐   ┌────────────────────────────┐
│ Entrepreneurial Capabilities│   │ Professional Capabilities   │
│           59                │   │           69                │
│        avg score            │   │        avg score            │
└────────────────────────────┘   └────────────────────────────┘
```

### 3.1 Simulations Box — Expanded State (example: "Think" expanded)

```
┌────────────────────────────────────┐
│ SIMULATIONS                        │
│                                     │
│ ▾ Think                            │
│     Strategic Thinking      xx     │
│     Analytical Thinking     xx     │
│     Problem Solving         xx     │
│     Decision Making         xx     │
│     Business Acumen         xx     │
│ ▸ Lead                             │
│ ▸ Execute                          │
│ ▸ Grow                             │
└────────────────────────────────────┘
```

Only one group expanded at a time per box (accordion behavior, consistent with SPEC_13).

### 3.2 Concept Study Box — Collapsed / TBD State

```
┌────────────────────────────────────┐
│ CONCEPT STUDY                      │
│                                     │
│ ▸ Think        (TBD)               │
│ ▸ Lead         (TBD)                │
│ ▸ Execute      (TBD)                │
│ ▸ Grow         (TBD)                │
└────────────────────────────────────┘
```

### 3.3 Concept Study Box — Expanded State

Clicking any group (Think / Lead / Execute / Grow) expands to a single placeholder row:

```
┌────────────────────────────────────┐
│ CONCEPT STUDY                      │
│                                     │
│ ▾ Think                            │
│     Coming Soon                    │
│ ▸ Lead                             │
│ ▸ Execute                          │
│ ▸ Grow                             │
└────────────────────────────────────┘
```

No scores, no capability names — just the four group headers and a "Coming Soon" message on expand. This box is intentionally inert until a future SPEC defines its real structure and data model.

## 4. CAPABILITY STRUCTURE — SIMULATIONS BOX

4 groups × 5 capabilities = 20 capabilities tracked.

**Think**
1. Strategic Thinking
2. Analytical Thinking
3. Problem Solving
4. Decision Making
5. Business Acumen

**Lead**
1. Leadership
2. Communication
3. Teamwork
4. Emotional Intelligence
5. Negotiation

**Execute**
1. Planning & Execution
2. Project Management
3. Time Management
4. Accountability
5. Result Orientation

**Grow**
1. Innovation
2. Adaptability
3. Learning Agility
4. Professional Ethics
5. AI & Digital Literacy

## 5. CAPABILITY STRUCTURE — CONCEPT STUDY BOX

Placeholder only. Group headers exist (Think / Lead / Execute / Grow) but carry no capability list. Expanding any group shows "Coming Soon". No scores are computed or stored for this box in this phase.

## 5.1 GROUP MAPPING — BOX GROUPS → CAPABILITY MATRIX CARDS (ASSUMPTION — CONFIRM)

The Active Engagements boxes use **Think / Lead / Execute / Grow** as group labels, while the existing Capability Matrix (SPEC_13) uses **Cognitive / Leadership / Entrepreneurial / Professional** cards. These are not identical taxonomies, so a mapping is needed to compute filtered Capability Matrix averages. Proposed mapping, pending your confirmation:

| Box Group | Capability Matrix Card |
|---|---|
| Think | Cognitive Capabilities |
| Lead | Leadership Capabilities |
| Execute | Professional Capabilities |
| Grow | Entrepreneurial Capabilities |

If this mapping isn't right (e.g. "Innovation" under Grow arguably belongs to Entrepreneurial, but "Learning Agility" and "Professional Ethics" under Grow arguably belong to Professional), let me know and I'll adjust before this goes to Cline — this affects how filtered averages are calculated.

## 6. DATA MODEL

### 6.1 New/Reused Tables

Reuses the existing `CAPABILITIES` and `STUDENT_CAPABILITY` tables (see PCDC core spec, Section 8), extended with a `source_type` so the same capability name can be tracked independently per engagement type (e.g. "Strategic Thinking" scored separately for Case Study vs. Simulations).

```sql
-- Extend CAPABILITIES to tag which engagement type + group a capability belongs to
ALTER TABLE capabilities
    ADD COLUMN engagement_type VARCHAR(20) NOT NULL DEFAULT 'case_study',
        -- 'case_study' | 'simulation' | 'concept_study'
    ADD COLUMN capability_group VARCHAR(20);
        -- 'think' | 'lead' | 'execute' | 'grow' (NULL for case_study if not grouped)

-- STUDENT_CAPABILITY already keyed by (StudentID, CapabilityID) — no change needed,
-- since engagement_type now travels with the CapabilityID via the capabilities table.
```

```sql
-- New table: SIMULATION_CAPABILITY_SCORES
-- Tracks per-student, per-simulation-attempt capability deltas feeding into
-- the aggregated STUDENT_CAPABILITY rows for engagement_type = 'simulation'.
CREATE TABLE simulation_capability_scores (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES students(student_id),
    attempt_id      INTEGER NOT NULL REFERENCES simulation_attempts(attempt_id),
    capability_id   INTEGER NOT NULL REFERENCES capabilities(capability_id),
    score           NUMERIC(5,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
```

### 6.2 Seed Data

Insert the 20 Simulations capabilities (5 per group × 4 groups) into `capabilities` with `engagement_type = 'simulation'` and the appropriate `capability_group`.

Concept Study capabilities are **not** seeded in this phase — the box has no backing rows and renders purely from a static TBD/"Coming Soon" template on the frontend.

## 7. API ENDPOINTS

```
GET /api/student/{student_id}/active-engagements
```
Returns a single payload for all three boxes:

```json
{
  "active_case_study": { "...": "existing SPEC_13 shape, unchanged" },
  "simulations": {
    "groups": [
      { "name": "Think",   "capabilities": [ { "name": "Strategic Thinking", "score": 74 }, ... ] },
      { "name": "Lead",    "capabilities": [ ... ] },
      { "name": "Execute", "capabilities": [ ... ] },
      { "name": "Grow",    "capabilities": [ ... ] }
    ]
  },
  "concept_study": {
    "status": "coming_soon",
    "groups": ["Think", "Lead", "Execute", "Grow"]
  }
}
```

Notes:
- `concept_study` intentionally has no scores — frontend renders group headers only, each expanding to a static "Coming Soon" message. No per-group API calls needed for this box in this phase.
- `simulations.groups[].capabilities[].score` is pulled from aggregated `student_capability` rows filtered by `engagement_type = 'simulation'`.

### 7.1 Capability Matrix Filtering (NEW)

```
GET /api/student/{student_id}/capability-matrix?engagement_type={all|case_study|simulation|concept_study}
```

- `engagement_type` defaults to `all` (existing SPEC_13 combined behavior, unchanged).
- `case_study` / `simulation` → returns the four cards (Cognitive/Leadership/Entrepreneurial/Professional) computed only from `student_capability` rows matching that `engagement_type`, using the group mapping in Section 5.1.
- `concept_study` → returns `{ "status": "coming_soon" }` instead of card data; frontend renders the Coming Soon state in place of the four cards.

Example filtered response (`engagement_type=simulation`):

```json
{
  "engagement_type": "simulation",
  "cards": [
    { "name": "Cognitive Capabilities",       "avg_score": 71 },
    { "name": "Leadership Capabilities",      "avg_score": 64 },
    { "name": "Entrepreneurial Capabilities", "avg_score": 59 },
    { "name": "Professional Capabilities",    "avg_score": 69 }
  ]
}
```

## 8. FRONTEND BEHAVIOR

- New `<ActiveEngagements />` container component renders the "Active Engagements" heading and the three boxes in a responsive 3-column layout (stacks to 1 column on mobile).
- Existing `<ActiveCaseStudy />` component is reused as-is, just re-parented under `<ActiveEngagements />`.
- New `<SimulationsBox />` component reuses the same accordion primitive as SPEC_13's Capability Matrix (one group expanded at a time, click-to-expand/collapse, same visual styling — border, chevron icon, score bars).
- New `<ConceptStudyBox />` component uses the same accordion primitive but renders static "Coming Soon" content on expand instead of fetching/rendering scores.
- Each box (`ActiveCaseStudy`, `SimulationsBox`, `ConceptStudyBox`) gets a full-width "Browse ..." button matching the existing Active Case Study button style.
- Dashboard holds a single piece of state: `activeMatrixFilter` (`'all' | 'case_study' | 'simulation' | 'concept_study'`, default `'all'`).
- Clicking a box's button: if it's already the active filter, reset to `'all'`; otherwise set it as the active filter. No routing/navigation occurs.
- The active button gets a visually distinct "selected" style (e.g. filled background); the other two stay in default outlined style.
- `<CapabilityMatrix />` (SPEC_13 component) is extended to accept `activeMatrixFilter`, re-fetches from the endpoint in Section 7.1 whenever it changes, and shows a small "Showing: X only — Clear filter" indicator when filter ≠ `'all'`. When filter is `'concept_study'`, it renders the Coming Soon state instead of the four cards.

## 9. BUILD ORDER

1. Confirm group mapping in Section 5.1 (Think/Lead/Execute/Grow → Cognitive/Leadership/Entrepreneurial/Professional).
2. DB migration: extend `capabilities` table with `engagement_type` and `capability_group` columns (Alembic migration).
3. DB migration: create `simulation_capability_scores` table.
4. Seed the 20 Simulations capabilities (Think/Lead/Execute/Grow × 5).
5. Backend: implement `GET /api/student/{student_id}/active-engagements` endpoint, aggregating existing Case Study data, new Simulations capability scores, and static Concept Study placeholder.
6. Backend: extend Capability Matrix endpoint to accept `engagement_type` query param (Section 7.1), returning filtered card averages or the Concept Study "coming_soon" status.
7. Frontend: build `<ActiveEngagements />` wrapper + heading.
8. Frontend: re-parent existing `<ActiveCaseStudy />` box under the new wrapper, add "Browse Case Studies" button wiring to `activeMatrixFilter` state (no other logic changes).
9. Frontend: build `<SimulationsBox />` using the SPEC_13 accordion pattern, wired to the new endpoint, with "Browse Simulations" button.
10. Frontend: build `<ConceptStudyBox />` with static TBD group headers + "Coming Soon" expand state, with "Browse Concepts" button (no API dependency for the box itself, but button still drives the Capability Matrix filter state).
11. Frontend: extend `<CapabilityMatrix />` to accept `activeMatrixFilter`, re-fetch on change, show "Showing: X only — Clear filter" indicator, and render Coming Soon state for Concept Study filter.
12. Manual verification: confirm all three boxes render side by side, accordion behavior works independently per box, each button toggles the correct filter (including re-click to clear), and Capability Matrix updates accordingly without navigation.

## 10. OUT OF SCOPE (this spec)

- Real capability structure/scoring for Concept Study (future spec).
- Any change to how Simulations themselves are created, run, or scored end-to-end (covered by other specs) — this spec only covers the **dashboard display** of aggregated Simulations capability scores.
- Mentor/Faculty/Admin/Director views of this new section (student dashboard only, this phase).

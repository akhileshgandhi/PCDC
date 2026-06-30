# SPEC_07c: Rubric Builder — Detailed Plan

**Route:** `/faculty/rubric-builder/{case_id}`
**Parent spec:** SPEC_07_FACULTY_PORTAL.md
**Depends on:** Case Builder (case must exist before a rubric can be attached to it)

## 1. Core Decision — Shared vs. Per-Case Rubric

Neither pure-shared nor pure-custom. Approach:

- A **fixed global default**: the 6 criteria and weights from the spec doc's AI Evaluation Engine (Thinking Depth 30%, Logic 20%, Creativity 15%, Practicality 15%, Risk Awareness 10%, Reflection 10%). This stays consistent across cases so capability scores remain comparable over a student's history — this is what makes the longitudinal Capability Profile (spec doc Section 13/Part 2 Section 9) meaningful instead of noise.
- **Per-case adjustment within that frame**: faculty can re-weight the 6 criteria (must still sum to 100%) to match what the specific case is testing, and optionally add a small number of case-specific criteria.
- Case-specific criteria are capped (recommend max 2 per case) so rubrics don't sprawl into unstructured free-for-alls that the AI evaluator can't apply consistently.

## 2. Page Layout

```
┌─────────────────────────────────────────────┐
│ ← Back to Case Builder                       │
│ Rubric Builder — "Effect of war on Indian    │
│ economy"                                     │
├─────────────────────────────────────────────┤
│ Default Criteria (adjust weights, sum=100%)  │
│                                               │
│ Thinking Depth     [====25%====] ▲▼          │
│ Logic              [====20%====] ▲▼          │
│ Creativity         [==10%======] ▲▼          │
│ Practicality       [====15%====] ▲▼          │
│ Risk Awareness     [====20%====] ▲▼          │
│ Reflection         [====10%====] ▲▼          │
│                                               │
│ Total: 100%  ✓                               │
├─────────────────────────────────────────────┤
│ Case-Specific Criteria (max 2)               │
│                                               │
│ + Add criterion                              │
│   "Considers second-order effects on trade   │
│    partners"                          [x]    │
├─────────────────────────────────────────────┤
│ [Save Rubric]                                │
└─────────────────────────────────────────────┘
```

## 3. Behavior Details

**On open, new case (no rubric yet):**
- Pre-fill the 6 default criteria at the global default weights
- Pre-fill nothing for case-specific criteria

**On open, existing rubric:**
- Load saved weights and any case-specific criteria as-is

**Weight adjustment:**
- Sliders or numeric inputs, faculty can drag/type
- Live running total shown; "Save Rubric" disabled until total = 100%
- A "Reset to Default" link restores the global 30/20/15/15/10/10 split

**Case-specific criteria:**
- "+ Add criterion" opens a single text input (short phrase, e.g. "Considers second-order effects on trade partners") — no separate weight; these are evaluated qualitatively by the AI evaluator as flags/notes rather than folded into the weighted score, so they don't disturb the 100% total
- Hard cap at 2; "+ Add criterion" hides/disables once 2 exist
- Each has a remove (x) button

**Save:**
- `Save Rubric` writes the 6 weights + any case-specific criteria to the case record
- This is what the Case Builder publish-validation checks for ("a rubric exists for this case") — confirms the link between SPEC_07a and this page

## 4. Where This Plugs Into the Rest of the System

- **Case Builder publish gate**: a case can't be published without a saved rubric (already specified in SPEC_07a, Section 4)
- **AI Evaluation Engine**: when a student submits a solution (Screen 6, Evaluation, per spec doc Section 4), the per-case weights here are what the AI applies instead of always using the flat global default — this is the actual point of having this page rather than hardcoding the weights once
- **Capability scoring**: because the 6 criteria names stay fixed even when weights shift, the underlying capability score calculation can still aggregate across cases consistently — only the *emphasis* changes per case, not the *vocabulary*

## 5. Data Model Notes / Open Questions

- Recommend a `rubrics` table (or a `rubric` JSON column on the case study record, similar to the `section_meta` pattern proposed in SPEC_07a) with shape:
  ```json
  {
    "weights": {
      "thinking_depth": 25,
      "logic": 20,
      "creativity": 10,
      "practicality": 15,
      "risk_awareness": 20,
      "reflection": 10
    },
    "case_specific_criteria": [
      "Considers second-order effects on trade partners"
    ]
  }
  ```
  Confirm whether a dedicated table is preferred (e.g. if you anticipate rubric versioning/history later) or whether a JSON column on the case record is sufficient for now.
- Confirm the global default weights live as a constant in code, or as a seeded row faculty could theoretically edit institution-wide (the latter is a bigger feature — recommend hardcoding the default for now and revisiting only if multiple faculty ask for it).

## 6. API Endpoints

- `GET /api/faculty/cases/{id}/rubric` — fetch existing or return default-pre-filled shape if none saved yet
- `PUT /api/faculty/cases/{id}/rubric` — save weights + case-specific criteria (validates weights sum to 100, criteria count ≤ 2)

## 7. Edge Cases

- Faculty adjusts weights to not sum to 100% and tries to navigate away → warn before discarding, same pattern as unsaved-changes guards elsewhere in the portal
- Case already published and has student attempts → still allow rubric edits, but show the same "X students have an active attempt" warning used in Case Builder, since rubric changes affect evaluation just as much as content changes do
- Faculty deletes a case-specific criterion that's already been referenced in AI evaluation feedback for a submitted attempt → keep the historical evaluation text as-is (don't retroactively alter past scores), only future evaluations stop using the removed criterion

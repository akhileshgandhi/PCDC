# SPEC_07a: Case Builder — Detailed Plan

**Route:** `/faculty/case-builder` (new) · `/faculty/case-builder/{id}` (edit existing draft)
**Parent spec:** SPEC_07_FACULTY_PORTAL.md

## 1. Entry Flow

Landing on `/faculty/case-builder` (no id) shows two clear entry cards — this is a one-time fork, not a toggle:

```
┌─────────────────────────┐   ┌─────────────────────────┐
│   Start from Scratch     │   │     Generate with AI     │
│   Build every section     │   │   AI drafts the case,    │
│   yourself                │   │   you edit and refine    │
└─────────────────────────┘   └─────────────────────────┘
```

Both paths converge on the same Core Fields step next — there's no meaningful case without title/industry/difficulty/duration regardless of how the body gets written.

**Mode is not stored on the record.** Once a case exists, both "fill manually" and "generate with AI" are available on every section, every time — see Section 3. The two entry cards just set the *default* starting state of the editor (empty vs. AI-filled).

## 2. Step 1 — Core Fields (mandatory, manual, both modes)

| Field | Type | Notes |
|---|---|---|
| Title | text | required |
| Industry | select/text | required |
| Difficulty | select, Level 1–7 | required — maps to spec doc's difficulty ladder (Observation → Executive Leadership) |
| Duration | number (minutes) | required — drives Time Score later |
| Capabilities Targeted | multi-select | required, ≥1 — pulls from the CAPABILITIES table |
| Expected Outcomes | textarea | required |

"Continue" button:
- **Scratch mode** → creates draft record (`status: draft`, all body sections empty) → opens editor
- **AI mode** → creates draft record → shows a single **"Generate Full Case Draft"** CTA before opening the editor (so faculty isn't surprised by an automatic AI call)

## 3. Step 2 — Section Editor (shared by both modes)

Sections, per the spec doc's simulation template (rubric is excluded — that's its own page, linked from here):

1. Situation
2. Background
3. Data
4. Characters
5. Constraints
6. Objectives
7. Timeline
8. Reflection Questions
9. Learning Outcomes

**Per-section controls (identical regardless of entry mode):**
- Editable textarea/rich text
- `Generate with AI` button if empty → becomes `Regenerate with AI` once filled
- Small status tag: `AI-generated` / `Edited` / `Manual` — tracked so faculty and reviewers can see provenance at a glance
- Regenerating a section that has manual edits triggers a confirm dialog: *"This will overwrite your edits to this section. Continue?"*

**Two generation actions available at all times (per your answer):**
- **Generate Full Case** (top of editor) — one AI call, fills all empty/selected sections, skips sections marked `Manual` unless faculty explicitly confirms overwrite
- **Per-section Generate/Regenerate** — one AI call scoped to a single section

**Context sent to AI on every generation call** (full or per-section): core fields + all currently-filled sections (even manual ones), so a regenerated "Characters" stays consistent with an already-written "Situation." This avoids the common failure mode of AI sections contradicting each other.

## 4. Lifecycle

Per your answer: **Draft → Published only**, no in-between review state.

- `Save Draft` — always available, saves whatever is filled, no validation
- `Publish` — validates required fields before allowing it:
  - Core fields (already required at Step 1)
  - Situation, Objectives, Timeline non-empty
  - At least 1 Reflection Question
  - A rubric exists for this case (link to rubric-builder if not — publish is blocked until rubric is set)
- Once published, editing is still allowed (faculty can fix typos etc.), but if students have active attempts against it, a warning shows: *"X students have an active attempt on this case. Changes may affect their evaluation."*

No Archive action lives on this page — that's a case-library action per the earlier spec, not part of case-builder itself.

## 5. Data Model Notes / Open Questions

- Need a `status` enum on the case study record: `draft` | `published` (confirm this matches or extends what's already in the 5-table case studies schema)
- Need per-section provenance tracking — recommend a single JSON column `section_meta` like `{"situation": "ai_generated", "characters": "edited", ...}` rather than 9 new boolean columns — confirm this is acceptable or if you'd prefer explicit columns
- Confirm exact column names for the 9 sections in the existing schema so Cline maps fields correctly instead of guessing
- Capabilities Targeted — confirm this is a join to the existing `CAPABILITIES` table (many-to-many) rather than free text

## 6. API Endpoints

- `POST /api/faculty/cases` — create draft from core fields
- `PUT /api/faculty/cases/{id}` — save any field (manual edit or draft save)
- `POST /api/faculty/cases/{id}/generate` — body: `{ scope: "full" | "section", sections?: ["characters", ...] }`
- `POST /api/faculty/cases/{id}/publish` — runs validation, flips status
- `GET /api/faculty/cases/{id}` — fetch for editor

## 7. Edge Cases to Handle

- AI generation call fails → show retry, never wipe existing content
- Faculty navigates away mid-generation → either block navigation or auto-save draft state
- Faculty selects "Generate Full Case" when some sections already have manual content → only the empty (or explicitly selected) sections regenerate by default, with a separate "regenerate everything including edited sections" option behind a confirm
- Publish attempted with missing rubric → redirect to rubric-builder with a "come back and publish" banner

## 8. Suggested Build Order

1. Core Fields step + draft creation (no AI yet) — gets Start from Scratch fully working
2. Section editor shell with manual save (still no AI) — both modes now functional minus generation
3. Wire up `generate` endpoint — full + per-section
4. Provenance tags + regenerate-confirm dialog
5. Publish validation + rubric-link guard

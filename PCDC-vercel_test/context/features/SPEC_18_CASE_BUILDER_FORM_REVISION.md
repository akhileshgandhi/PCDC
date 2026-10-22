# SPEC_16: Case Builder Form — Revision

**Page:** `/faculty/case-builder`
**Type:** UI + logic changes to existing form
**Status:** Ready for implementation

---

## Summary of All Changes

1. Capabilities Targeted → replace flat chips with hierarchical 4-category selector
2. Remove Expected Outcomes field
3. Remove entire Case Metadata section
4. Recommended Semesters → keep only Sem 1 through Sem 4
5. Time & Marks Breakdown → remove Rapid Fire Time + Rapid Fire Marks fields
6. Structured Written Questions → add "Generate with AI" button
7. Rapid Fire Questions → replace manual entry with AI generation from summary

---

## Change 1: Capabilities Targeted — Hierarchical Selector

**Remove:** The current flat chip row (Communication, Decision Making, Entrepreneurship, Innovation, Leadership, Problem Solving, Professionalism, Strategic Thinking)

**Replace with:** A 4-category expandable selector. Faculty clicks a category to expand it and selects one or more sub-capabilities from the dropdown list inside.

**UI behaviour:**
```
Capabilities Targeted

┌─────────────────────────────────────────────┐
│ 🧠 Cognitive Capabilities            ▼      │
├─────────────────────────────────────────────┤
│   ☑ Analytical Thinking                     │
│   ☐ Critical Thinking                       │
│   ☐ Strategic Thinking                      │
│   ☐ Systems Thinking                        │
│   ☑ Decision Making                         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 👥 Leadership Capabilities           ▼      │
├─────────────────────────────────────────────┤
│   ☐ Communication                           │
│   ☐ Influence                               │
│   ☐ Negotiation                             │
│   ☐ Conflict Resolution                     │
│   ☐ Team Management                         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 💡 Entrepreneurial Capabilities      ▼      │
├─────────────────────────────────────────────┤
│   ☐ Opportunity Recognition                 │
│   ☐ Innovation                              │
│   ☐ Business Model Thinking                 │
│   ☐ Risk Assessment                         │
│   ☐ Resourcefulness                         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ⭐ Professional Capabilities          ▼      │
├─────────────────────────────────────────────┤
│   ☐ Professional Judgment                   │
│   ☐ Business Acumen                         │
│   ☐ Execution Orientation                   │
│   ☐ Learning Agility                        │
│   ☐ Adaptability                            │
└─────────────────────────────────────────────┘
```

**Rules:**
- All 4 categories visible by default, each collapsible individually
- Faculty can select sub-capabilities across multiple categories
- Selected sub-capabilities shown as a summary line below the selector:
  `Selected: Analytical Thinking, Decision Making, Communication (3 selected)`
- At least 1 sub-capability must be selected before the form can be saved
- The category header itself is NOT selectable — only the sub-capabilities are

**Data saved:** Array of selected sub-capability names (same as before, just a better UI for selecting them). No DB change needed.

---

## Change 2: Remove Expected Outcomes

**Remove the "Expected Outcomes" textarea from the Core Fields section entirely.**

No replacement. No DB change needed — just remove from the UI form. If the column exists in the DB it can stay (don't drop it), just stop collecting it from faculty.

---

## Change 3: Remove Case Metadata Section

**Remove the entire "Case Metadata" section** (Image 2) — all fields:
- Case Code
- Volume
- Subject
- Functional Area
- Capability Category
- Difficulty Label
- Target Learners
- Bloom's Levels

Remove the section heading, subtitle, and all fields. No DB changes — leave the columns in the DB as they are (needed for imported cases from Admin Case Import). Just stop showing this section in the faculty Case Builder UI.

---

## Change 4: Recommended Semesters — 4 Only

**Current:** Sem 1 through Sem 12 (12 chips)

**Change to:** Sem 1, Sem 2, Sem 3, Sem 4 only (4 chips)

All MBA/PGDM programs have 4 semesters maximum. Remove Sem 5 through Sem 12.

```
Recommended Semesters

  [ Sem 1 ]  [ Sem 2 ]  [ Sem 3 ]  [ Sem 4 ]
```

No DB change needed — the values stored are just integers 1–4.

---

## Change 5: Time & Marks Breakdown — Remove Rapid Fire Fields

**Current fields:** Reading Time, Answer Writing Time, Rapid Fire Time, Total Marks, Written Marks, Rapid Fire Marks

**Keep:**
- Reading Time (min)
- Answer Writing Time (min)

**Remove:**
- Rapid Fire Time (min)
- Total Marks
- Written Marks
- Rapid Fire Marks

**Reason:** Rapid Fire time and marks are fixed platform constants (8 min, 3 marks) that never change case-to-case. Faculty don't need to configure them. They are hardcoded in the backend when the case is evaluated.

**New layout:**
```
Time Breakdown

Reading Time (min)    Answer Writing Time (min)
[        ]            [        ]
```

No DB change for the kept fields. The removed fields (rapid_fire_time_minutes, total_marks, written_marks, rapid_fire_marks) stay in the DB but get set to their fixed defaults automatically by the backend on save — not from the form.

Backend defaults to apply silently on every case save:
- `rapid_fire_time_minutes = 8`
- `rapid_fire_marks = 3`
- `written_marks = 7`
- `total_marks = 10`

---

## Change 6: Structured Written Questions — AI Generation

**Current:** 3 manual question cards (Question Text, Marks, Bloom's Level, Word Limit Min/Max, Per-Question Instructions, Model Answer, Alternative Answers, Marking Scheme)

**Add:** A "Generate Questions with AI" button at the top of the Structured Written Questions section.

**UI:**
```
Structured Written Questions
Three questions with marks, word limits, model answers, and a marking scheme.

[✨ Generate Questions with AI]          [or fill manually below]
```

**How it works:**
1. Faculty clicks "Generate Questions with AI"
2. A modal opens asking for a brief case summary:
   ```
   ┌────────────────────────────────────────────────────┐
   │  Generate Questions                                 │
   │                                                     │
   │  Briefly describe what this case is about:          │
   │  ┌─────────────────────────────────────────────┐   │
   │  │ A mid-sized FMCG company is facing margin    │   │
   │  │ pressure due to rising input costs...        │   │
   │  └─────────────────────────────────────────────┘   │
   │                                                     │
   │  The AI will generate 3 questions calibrated to:    │
   │  • Difficulty: Level 3                              │
   │  • Capabilities: Analytical Thinking, Decision      │
   │    Making                                           │
   │  • Marks: Q1=2, Q2=2, Q3=3                         │
   │                                                     │
   │  [Cancel]        [Generate Questions]               │
   └────────────────────────────────────────────────────┘
   ```
3. On "Generate Questions": call OpenAI with a structured prompt
4. AI returns 3 questions in JSON, each with:
   - question_text
   - marks (Q1=2, Q2=2, Q3=3 — fixed)
   - blooms_level
   - word_limit_min
   - word_limit_max
   - per_question_instructions
   - model_answer
   - alternative_answers (array)
   - marking_scheme
5. All 3 question cards are populated with the generated content
6. Faculty can edit any field after generation
7. If faculty already has manually entered content in any question, show a confirm dialog: "This will overwrite your existing questions. Continue?"

**AI prompt context sent:**
- Case title
- Difficulty level (and its label — Foundation/Regular/Pro/Expert/Champion)
- Selected capabilities
- Case summary (from the modal textarea)
- Fixed marks distribution: Q1=2, Q2=2, Q3=3
- Bloom's taxonomy progression: Q1=lower order (Remember/Understand), Q2=middle (Apply/Analyse), Q3=higher order (Evaluate/Create)

**API endpoint (new):**
`POST /api/faculty/cases/{id}/generate-questions`
Body: `{ "summary": "A mid-sized FMCG company..." }`
Returns: Array of 3 question objects

---

## Change 7: Rapid Fire Questions — AI Generation

**Current:** 6 manual Q&A cards (Q1–Q6, each with Question textarea + Answer textarea)

**Replace entirely with:** AI-generated Rapid Fire questions from a summary input. Faculty does not write these manually.

**New UI:**
```
Rapid Fire Questions
Six quick question/answer pairs shown after the written submission.

┌────────────────────────────────────────────────────────┐
│  Case Summary for Rapid Fire Generation                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Briefly describe the core business situation      │  │
│  │ and key facts from this case...                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [✨ Generate Rapid Fire Questions]                     │
└────────────────────────────────────────────────────────┘

── Generated Questions (shown after generation) ──────────

Q1  What is the primary reason for the company's margin
    pressure?
    Answer: Rising input costs combined with an inability
    to pass on price increases to price-sensitive consumers.

Q2  ...
Q3  ...
Q4  ...
Q5  ...
Q6  ...

[Regenerate]
```

**How it works:**
1. Faculty types a brief case summary in the textarea (can reuse the same summary from Question generation if they already typed one — pre-fill it)
2. Clicks "Generate Rapid Fire Questions"
3. OpenAI call returns 6 Q&A pairs in JSON
4. Questions displayed as read-only cards below the summary box
5. Faculty can click "Regenerate" to get a new set if unsatisfied
6. Individual editing: each Q&A pair has a small "Edit" toggle that makes the text editable for minor corrections without full regeneration

**AI prompt context sent:**
- Case title
- Difficulty level + label
- Selected capabilities
- Case summary (from the textarea)
- Instruction to AI: generate 6 short-answer factual questions that test recall and understanding of the case facts, appropriate for a timed 8-minute round, with concise 1–2 sentence answers

**API endpoint (new):**
`POST /api/faculty/cases/{id}/generate-rapid-fire`
Body: `{ "summary": "..." }`
Returns: Array of 6 `{ question, answer }` objects

---

## Summary of UI Sections After All Changes

The Case Builder page sections, in order, after changes are applied:

1. **Core Fields** — Title, Industry, Difficulty, Duration, Capabilities Targeted (hierarchical), *(Expected Outcomes removed)*
2. ~~Case Metadata~~ — **REMOVED**
3. **Recommended Course & Semester** — Recommended Semesters (Sem 1–4 only), Recommended Courses
4. **Time Breakdown** — Reading Time, Answer Writing Time *(Rapid Fire + Marks fields removed)*
5. **Student Instructions & Faculty Notes** — unchanged (Images 5)
6. **Structured Written Questions** — 3 question cards + "Generate with AI" button (Change 6)
7. **Rapid Fire Questions** — Summary input + AI generation (Change 7)

---

## Files to Touch

- `frontend/src/pages/faculty/CaseBuilder.jsx` (or equivalent) — all 7 UI changes
- `frontend/src/components/faculty/CapabilitySelector.jsx` — new component for Change 1 (extract as separate component)
- `backend/services/faculty/router.py` — add 2 new endpoints: `generate-questions` and `generate-rapid-fire`
- `backend/services/faculty/service.py` — OpenAI calls for both generation endpoints

---

## Acceptance Criteria

- [ ] Capabilities Targeted shows 4 collapsible categories, each with 5 sub-capability checkboxes
- [ ] At least 1 sub-capability must be selected to save/publish
- [ ] Summary line shows count and names of selected sub-capabilities
- [ ] Expected Outcomes field is gone from the form
- [ ] Case Metadata section is completely gone from the form
- [ ] Recommended Semesters shows only Sem 1, Sem 2, Sem 3, Sem 4
- [ ] Time Breakdown shows only Reading Time and Answer Writing Time
- [ ] Rapid Fire Time, Total Marks, Written Marks, Rapid Fire Marks fields are removed
- [ ] Backend auto-sets rapid_fire_time=8, rapid_fire_marks=3, written_marks=7, total_marks=10 on save
- [ ] "Generate Questions with AI" button opens summary modal
- [ ] After generation, all 3 question cards are populated
- [ ] Existing content in question cards triggers overwrite confirm before generation
- [ ] Rapid Fire section shows summary textarea + "Generate" button (no manual Q&A cards)
- [ ] After rapid fire generation, 6 Q&A pairs display as readable cards
- [ ] "Regenerate" button on rapid fire works independently of question generation
- [ ] Individual rapid fire Q&A editable via "Edit" toggle
- [ ] No other sections of the Case Builder are affected

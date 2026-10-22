# SPEC_11: Case Study Schema Gap Analysis
# Stakeholder Cases vs. Current Database & Functionality

**Source:** AI_Case_Samples.docx (stakeholder-provided cases)
**Date:** July 2026
**Purpose:** Identify every field, concept, and feature in the actual case studies that is missing or misaligned with our current DB schema and platform functionality — so we know exactly what to build before importing these cases.

---

## 1. Cases Identified in the Document

| Case ID | Subject | Capability | Difficulty | Category |
|---|---|---|---|---|
| F-AT-002 | Finance | Analytical Thinking | Level 1 (Foundation) | Cognitive |
| F-AT-001 | Finance | Analytical Thinking | Level 1 (Foundation) | Cognitive |
| M-NG-001 | Marketing | Negotiation | Level 2 (Regular) | Leadership |
| HR-PJ-001 | HRM | Professional Judgment | Level 4 (Expert) | Professional |
| OP-IN-001 | Operations | Innovation | Level 5 (Champion) | Entrepreneurial |
| OP-CR-001 | Operations | Conflict Resolution | Level 3 (Pro) | Leadership |
| F-RA-001 | Finance | Risk Assessment | Level 4 (Expert) | Entrepreneurial |
| M-ST-001 | Marketing | Strategic Thinking | Level 2 (Regular) | Cognitive |
| F-BA-001 | Finance | Business Acumen | Level 3 (Pro) | Professional |
| HR-RS-001 | HRM | Resourcefulness | Level 5 (Champion) | Entrepreneurial |
| OP-DM-001 | Operations | Decision Making | Level 3 (Pro) | Cognitive |
| M-TM-001 | Marketing | Team Management | Level 1 (Foundation) | Leadership |
| HR-CM-001 | HRM | Communication | Level 1 (Foundation) | Leadership |
| HR-TM-001 | HRM | Team Management | Level 1 (Foundation) | Leadership |
| OP-AT-001 | Operations | Analytical Thinking | Level 1 (Foundation) | Cognitive |
| MK-OR-001 | Marketing | Opportunity Recognition | Level 1 (Foundation) | Entrepreneurial |
| HR-LA-001 | HRM | Learning Agility | Level 1 (Foundation) | Professional |
| OP-EO-001 | Operations | Execution Orientation | Level 1 (Foundation) | Professional |
| MK-IN-001 | Marketing | Innovation | Level 1 (Foundation) | Entrepreneurial |
| F-RA-001 (v2) | Finance | Risk Assessment | Level 1 (Foundation) | Entrepreneurial |
| OP-BA-001 | Operations | Business Acumen | Level 1 (Foundation) | Professional |
| HR-PJ-001 (v2) | HRM | Professional Judgment | Level 1 (Foundation) | Professional |
| OP-AD-001 | Operations | Adaptability | Level 1 (Foundation) | Professional |

**Naming convention in the cases:** `[Subject]-[CapabilityCode]-[SequenceNumber]`
- F = Finance, M/MK = Marketing, HR = Human Resource Management, OP = Operations Management

---

## 2. Difficulty Level: Critical Mismatch

**Our current system (spec doc):** 7 levels (Observation → Executive Leadership)
**Actual cases from stakeholders:** 5 levels with named tiers

| Level | Case Label | Case Name |
|---|---|---|
| 1 | Foundation / Basic | Simple observation cases |
| 2 | Regular | Multiple variables |
| 3 | Pro / Professional | Apply and Analyse |
| 4 | Expert | Analyse and Evaluate |
| 5 | Champion | Evaluate and Create |

**Decision needed:** Our spec doc defined 7 levels but the actual cases only use 5. Options:
- **Option A (Recommended):** Adopt 5 levels from the actual cases. The stakeholders built these cases — their taxonomy is the source of truth. Levels 6 and 7 can be added later if needed.
- Option B: Keep 7, map 1–5 from cases to 1–5 of 7 internally.

**Impact:** `simulations.difficulty` column currently likely stores an integer 1–7. Needs an accompanying `difficulty_label` field or enum update to 5 levels + label.

---

## 3. Database Schema Gaps (Fields Missing from `simulations` / case tables)

Every field below exists in the actual cases but has NO equivalent in our current schema:

### 3a. Case Identity & Classification
| Missing Field | From Case | Suggested Column |
|---|---|---|
| Human-readable case code | "CASE F-AT-002" | `case_code VARCHAR(20) UNIQUE` |
| Volume / collection name | "Foundation Cases", "Volume 2 Regular" | `volume VARCHAR(50)` |
| Subject | Finance / Marketing / HRM / Operations | `subject VARCHAR(50)` |
| Functional Area | "Cost & Profitability Analysis" | `functional_area VARCHAR(100)` |
| Capability Category | Cognitive / Leadership / Professional / Entrepreneurial | `capability_category VARCHAR(50)` |
| Bloom's Taxonomy levels | "Remember, Understand" | `blooms_levels TEXT[]` (array) |
| Target Learners | "MBA/PGDM – Semester III" | `target_learners VARCHAR(100)` |
| Difficulty label | "Foundation", "Regular", "Pro", "Expert", "Champion" | `difficulty_label VARCHAR(20)` |

### 3b. Time Breakdown (currently we only store total `Duration`)
| Missing Field | From Case | Suggested Column |
|---|---|---|
| Reading time | 8 Minutes | `reading_time_minutes INTEGER` |
| Answer writing time | 12 Minutes | `answer_writing_time_minutes INTEGER` |
| Rapid Fire time | 8 Minutes | `rapid_fire_time_minutes INTEGER` |

Note: Total Duration = reading + writing + rapid fire (8+12+8 = 28 min, currently stored as single field)

### 3c. Marks Breakdown (currently we have no marks system — only capability scores)
| Missing Field | From Case | Suggested Column |
|---|---|---|
| Total marks | 10 | `total_marks INTEGER DEFAULT 10` |
| Written marks | 7 | `written_marks INTEGER DEFAULT 7` |
| Rapid Fire marks | 3 | `rapid_fire_marks INTEGER DEFAULT 3` |

### 3d. Instructional Content (new sections not in our 9-section schema)
| Missing Field | From Case | Suggested Column |
|---|---|---|
| Student instructions (before reading) | "Read the complete case carefully..." | `student_instructions_before TEXT` |
| Student instructions (while answering) | "Write your answers in your own words..." | `student_instructions_during TEXT` |
| Student instructions (submission) | "Complete within 12 minutes..." | `student_instructions_submission TEXT` |
| Company Background | Full company profile section | `company_background TEXT` |
| Industry Background | Industry context section | `industry_background TEXT` |
| Faculty Discussion Notes - Common Mistakes | "Students often assume..." | `faculty_common_mistakes TEXT` |
| Faculty Discussion Notes - Discussion Points | "Why is profit a better indicator..." | `faculty_discussion_points TEXT` |
| Key Learning Points | Bullet list of takeaways | `key_learning_points TEXT` |
| Bloom's Taxonomy mapping per question | Q1→Remember, Q2→Understand | stored in questions table |

### 3e. New Table: `case_questions`
The current schema has no structure for the 3 structured questions per case. This is a fundamental change — currently our platform assumes free-form analysis, but these cases have 3 specific questions with marks.

```sql
CREATE TABLE case_questions (
    question_id     UUID PRIMARY KEY,
    case_id         FK → simulations.simulation_id,
    question_number INTEGER,           -- 1, 2, or 3
    question_text   TEXT,              -- the question itself
    marks           INTEGER,           -- 2, 2, 3
    blooms_level    VARCHAR(20),       -- "Remember", "Understand", "Apply", etc.
    word_limit_min  INTEGER,           -- e.g. 80
    word_limit_max  INTEGER,           -- e.g. 100
    instructions    TEXT,              -- per-question instructions
    model_answer    TEXT,              -- primary model answer
    alternative_answers TEXT,          -- alternative acceptable answers
    marking_scheme  JSONB              -- {"criteria": "Correct identification", "marks": 1.0}
);
```

### 3f. New Table: `rapid_fire_questions`
Rapid Fire is an entirely new concept — 6 quick Q&A pairs displayed after written submission.

```sql
CREATE TABLE rapid_fire_questions (
    rf_question_id  UUID PRIMARY KEY,
    case_id         FK → simulations.simulation_id,
    sequence        INTEGER,           -- 1 through 6
    question_text   TEXT,
    answer_text     TEXT
);
```

### 3g. New Table: `case_question_responses`
Students currently submit one free-form analysis. Now they submit responses to 3 specific questions.

```sql
CREATE TABLE case_question_responses (
    response_id     UUID PRIMARY KEY,
    attempt_id      FK → simulation_attempts.attempt_id,
    question_id     FK → case_questions.question_id,
    response_text   TEXT,
    word_count      INTEGER,
    submitted_at    TIMESTAMP,
    ai_score        NUMERIC(4,1),     -- marks awarded by AI out of question's max marks
    ai_feedback     TEXT              -- per-question AI feedback
);
```

### 3h. New Table: `rapid_fire_responses`
```sql
CREATE TABLE rapid_fire_responses (
    rf_response_id  UUID PRIMARY KEY,
    attempt_id      FK → simulation_attempts.attempt_id,
    rf_question_id  FK → rapid_fire_questions.rf_question_id,
    response_text   TEXT,
    is_correct      BOOLEAN,          -- AI-evaluated
    marks_awarded   NUMERIC(3,1)
);
```

---

## 4. Functionality Gaps (What the Cases Require That We Haven't Built Yet)

### 4a. Rapid Fire Round — ENTIRELY NEW FEATURE
Every case ends with a "Rapid Fire" round: 6 quick questions, 8 minutes, 3 marks total.
- Appears AFTER the written submission (Stage 4 in our current flow)
- Questions are pre-defined by faculty (stored in `rapid_fire_questions` table)
- Time-limited: 8 minutes, visible countdown
- Student answers each question (short free-text)
- AI evaluates against the stored model answer
- 3 marks split across 6 questions (0.5 marks each, likely)

This maps to the spec doc's "Layer 5: Oral Challenge" concept but in a structured written format rather than a live AI interview.

**New screen needed:** `SCREEN 4b: Rapid Fire Round` between current Screen 4 (Solution) and Screen 5 (AI Defense)

OR — more likely given the case structure — it replaces the AI Defense stage at this level of cases.

### 4b. Structured Question Flow — Replaces Free-Form Analysis
Currently our platform (spec doc Screen 2) asks:
- "What is your initial assessment?" (free-form, 200+ words)

The actual cases have 3 specific questions with word limits:
- Q1 (2 marks, 80–100 words): Identify/Observe
- Q2 (2 marks, 100–150 words): Explain/Analyse  
- Q3 (3 marks, 150–220 words): Recommend/Create

**Impact:** The student interface for answering needs to show 3 separate text areas with word-count indicators and per-question instructions — not one big text box.

### 4c. Word Limit Enforcement
Each question has min and max word counts. The platform needs:
- Live word counter per question
- Warning if below minimum
- Block submission if over maximum (or warn — decide policy)

### 4d. AI Evaluation Against Model Answers
Currently planned: AI evaluates "how you think" using rubric weights.
The cases provide: Specific model answers + alternative acceptable answers + per-criterion marking schemes.

The AI evaluation now needs to:
1. Compare student response against the model answer AND alternatives
2. Award marks per question (not just a rubric-weighted capability score)
3. Still derive a capability score from the marks + quality of reasoning
4. Provide per-question feedback referencing the marking scheme

This doesn't conflict with PCDC's philosophy — model answers serve as rubric anchors, not the only accepted response (alternative acceptable answers exist). The AI still evaluates quality of reasoning, not just whether they matched the model.

### 4e. Marks Score in Addition to Capability Score
Every attempt now needs two scores tracked:
- **Marks Score:** Out of 10 (7 written + 3 rapid fire) — what students see as their grade
- **Capability Score:** The weighted rubric score we already planned — what the system uses for progression

`simulation_attempts` needs two new columns:
- `marks_written NUMERIC(4,1)` — marks out of 7
- `marks_rapid_fire NUMERIC(4,1)` — marks out of 3
- `marks_total NUMERIC(4,1)` — total out of 10
(Existing `score` column can remain as the capability score)

### 4f. Time Management Per Phase
Currently we track total time for the attempt. The cases split time into 3 phases:
- Reading: 8 min (student reads, no submission)
- Writing: 12 min (3 questions answered)
- Rapid Fire: 8 min

The student interface needs:
- Phase-specific timers shown to the student
- Reading timer → transitions to Writing
- Writing timer → transitions to Rapid Fire
- System records time spent in each phase on the attempt record

New columns on `simulation_attempts`:
- `reading_time_spent INTEGER` (seconds)
- `writing_time_spent INTEGER` (seconds)
- `rapid_fire_time_spent INTEGER` (seconds)

### 4g. 70% Completion Eligibility Rule
Every case has: "Students completing at least 70% of the written assessment within the allotted time will be eligible for evaluation."

This means: if a student submits fewer than 2 of 3 questions OR submits with fewer than 70% of the word count across all questions → their attempt is marked as ineligible for evaluation (no marks awarded, attempt noted as incomplete).

New field: `simulation_attempts.eligible_for_evaluation BOOLEAN DEFAULT true`

### 4h. Faculty Case Code Display
Cases have human-readable IDs (F-AT-002, HR-PJ-001 etc.). These need to:
- Display on the case library page (both student and faculty views)
- Be searchable/filterable
- Follow the auto-generation pattern: `[SubjectCode]-[CapabilityCode]-[Sequence]`

### 4i. Bloom's Taxonomy Tracking Per Question
The platform should eventually track which Bloom's level students perform best/worst at (this feeds the capability development engine). Not urgent for MVP but the data needs to be stored from day 1.

---

## 5. What Stays the Same (No Changes Needed)

- The 9-section case body (Situation, Background, Data, Characters, Constraints, Objectives, Timeline, Reflection Questions, Learning Outcomes) → maps well to Company Background + Industry Background + Business Situation + Questions + Rapid Fire + Student Reflection
- The rubric-builder's 6-criterion weighting system — still applies, now anchored to model answers
- The capability score update logic (rolling weighted average)
- The AI conversation log (stage 3 still exists)
- Draft → Published lifecycle
- One attempt per student per case
- Mentor can view thinking path
- AI generates provenance tags

---

## 6. Impact on Existing Pages

| Page | Impact |
|---|---|
| Faculty Case Builder | Add all new metadata fields (case code, subject, functional area, Bloom's, target learners, time breakdown, marks). Add structured Questions section (3 Q&A editors with model answers + alternatives + marking scheme). Add Rapid Fire Questions section (6 Q&A pairs). Add Student Instructions section. Add Faculty Discussion Notes + Key Learning Points sections. |
| Student Case Attempt | Replace single text area with 3-question structured form. Add word count indicators. Add phase timers (reading → writing → rapid fire). Add Rapid Fire screen after writing submission. |
| AI Evaluation Engine | Must now compare against model answers + alternatives + marking scheme. Must award marks per question. Must still derive capability score. |
| Case Library (student) | Show case code, subject, difficulty label, marks breakdown. |
| Case Library (faculty) | Show case code, functional area, Bloom's levels, target learners. |
| Faculty Analytics | Add marks distribution analytics alongside capability scores. |
| Admin Case Import | Must handle the full case structure including questions, rapid fire, model answers. |
| Mentor Thinking Path | Now shows 3 separate question responses + rapid fire responses, not one free-form analysis. |

---

## 7. Summary: New Migrations Required

| Migration | Tables | Priority |
|---|---|---|
| Add metadata columns to `simulations` | case_code, subject, functional_area, capability_category, blooms_levels, target_learners, difficulty_label, volume, reading_time_minutes, answer_writing_time_minutes, rapid_fire_time_minutes, total_marks, written_marks, rapid_fire_marks, student_instructions_before/during/submission, company_background, industry_background, faculty_common_mistakes, faculty_discussion_points, key_learning_points | HIGH |
| Add marks columns to `simulation_attempts` | marks_written, marks_rapid_fire, marks_total, eligible_for_evaluation, reading_time_spent, writing_time_spent, rapid_fire_time_spent | HIGH |
| New table: `case_questions` | Full schema above | HIGH |
| New table: `rapid_fire_questions` | Full schema above | HIGH |
| New table: `case_question_responses` | Full schema above | HIGH |
| New table: `rapid_fire_responses` | Full schema above | HIGH |
| Update difficulty to 5 levels | Add difficulty_label, update constraint on difficulty INTEGER to 1-5 | MEDIUM |

---

## 8. Recommended Build Order

1. **Run migrations** (all 6 above — do them together in one Alembic revision)
2. **Update Case Builder (faculty)** — add all new fields, question editor, rapid fire editor
3. **Import the 23 cases** from this document via Admin Case Import (first real data in the system)
4. **Update Student Attempt flow** — 3-question form + phase timers + rapid fire screen
5. **Update AI Evaluation Engine** — model-answer-aware scoring, marks calculation
6. **Update Case Library displays** — case code, subject, difficulty label on both portals
7. **Update Mentor Thinking Path** — show per-question responses
8. **Update Analytics** — marks alongside capability scores

---

## 9. One Open Question

**Marks vs. Capability Score display to students:**
The cases clearly have a 10-mark system (7 written + 3 rapid fire). Our platform was designed around capability scores (no traditional marks). Should students see:
- Both: "You scored 7.5/10 marks | Your capability scores updated"
- Only capability scores (we convert marks to capability score internally, hide marks)
- Marks only for now, capability scores as an additional layer later

**Recommendation:** Show both. Marks give students immediate, familiar feedback. Capability scores show the bigger picture of where they're developing. The two serve different purposes and don't conflict.

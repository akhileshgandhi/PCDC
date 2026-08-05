# PCDC — Technical Specifications

Reference document: full database schema, full API endpoint catalog, and
the exact algorithms behind scoring/evaluation. Generated from the live
schema and router source as of 2026-07-28 (11 migrations applied).

---

## 1. Database Schema

41 tables total. Grouped by purpose below; every column is listed as
`name: type`. Primary keys are all `id: integer` (serial) unless noted.

### 1.1 Identity & Auth

**`users`** — every role (student/faculty/mentor/admin/director/program_head) in one table
```
id, name, email, password_hash, role, program, specialization,
admission_year, created_at, status, last_login_at, updated_at
```

**`students`** — one row per student user
```
id, user_id, mentor_id, career_track_id, current_level, created_at,
course_id, batch_id, current_section_id, current_semester_number
```

**`mentors`**
```
id, user_id, department, max_students
```

**`career_tracks`**
```
id, name, description
```

**`login_events`**
```
id, user_id, user_agent, ip_address, created_at
```

### 1.2 Academic Structure (courses → semesters → batches → sections)

**`courses`**: `id, name, code, total_semesters, duration_years, status, created_at`
**`semesters`**: `id, course_id, semester_number, name`
**`batches`**: `id, course_id, name, start_year, end_year, status, created_at`
**`class_sections`**: `id, course_id, semester_id, batch_id, name, academic_year, status, created_at`
**`faculty_sections`**: `id, faculty_id, section_id, subject, assigned_at, assigned_by`
**`student_sections`**: `id, student_id, section_id, enrolled_at, enrolled_by, status`
(status includes `'active'`/`'dropped'`/`'removed'`; a partial-unique
constraint enforces one active section per student)

### 1.3 Case Studies & the Attempt Flow

**`case_studies`** — the real case-authoring table (NOT `simulations`, see below)
```
id, title, description, content, domain, difficulty, estimated_minutes,
source, status, created_by, evaluation_rubric, learning_outcomes,
reflection_questions, created_at, updated_at,
case_code, volume, subject, functional_area, capability_category,
blooms_levels, target_learners, difficulty_label,
reading_time_minutes, answer_writing_time_minutes, rapid_fire_time_minutes,
total_marks, written_marks, rapid_fire_marks,
student_instructions_before, student_instructions_during,
student_instructions_submission, company_background, industry_background,
faculty_common_mistakes, faculty_discussion_points, key_learning_points,
recommended_semesters, recommended_course_ids
```
Notes:
- `content` is a JSON string: `{expected_outcomes, sections: {situation,
  background, data, characters, constraints, objectives, timeline,
  reflection_questions[], learning_outcomes[]}, section_meta}`.
  `learning_outcomes` and `reflection_questions` columns are kept as
  newline-joined plain-text mirrors of the corresponding JSON arrays.
- `domain` enum: `geopolitics | sports | business | social | science |
  technology | environment | healthcare`.
- `difficulty`: integer 1–7.
- No `recommended_career_tracks` column exists (see `FEATURES.md §7`).

**`case_study_tags`**: `id, case_study_id, tag_type, tag_value`
(`tag_type` ∈ `domain | career_track | capability`; only `capability` tags
are actually written by any current UI — `career_track` tags are never
populated despite being a valid type)

**`case_study_attempts`** — one row per (case, student), enforced unique
```
id, case_study_id, student_id (→ users.id, despite the column name),
initial_analysis, initial_word_count, final_solution, defense_responses,
reflection_text, status, start_time, end_time, time_taken_minutes,
ai_unlocked_at,
marks_written, marks_rapid_fire, marks_total, eligible_for_evaluation,
reading_time_spent, writing_time_spent, rapid_fire_time_spent
```
`status` state machine (see §5 for the full flow):
`analysis_submitted → ai_discussion → solution_submitted →
defense_complete → evaluated`
(the name `analysis_submitted` is the value **immediately after row
creation**, before any analysis has actually been submitted — a naming
quirk, not a bug, confirmed by reading the transition code).

`marks_written` / `marks_rapid_fire` / `marks_total` /
`eligible_for_evaluation` / `reading_time_spent` / `writing_time_spent` /
`rapid_fire_time_spent` are **schema that exists but no application code
reads or writes them** — added in migration 0007 for a scope that was
never implemented. The real score lives in `cs_evaluations.total_score`.

**`cs_evaluations`** — one row per attempt, the real score record
```
id, attempt_id, thinking_depth, logic_score, creativity_score,
practicality_score, risk_awareness_score, reflection_score, total_score,
time_score, ai_utilization_score, strengths, weaknesses, blind_spots,
improvement_areas, next_recommended_case_id, evaluated_at
```
All scores 0–100. `total_score` is the weighted composite (§3).
`next_recommended_case_id` is a schema field the AI evaluation prompt
never actually asks the model to populate — it is effectively always
`NULL` in practice.

**`cs_ai_conversations`** — full chat log per attempt
```
id, attempt_id, role, stage, message, prompt_tokens, response_tokens, timestamp
```
`role` ∈ `student | ai`. `stage` ∈ `discussion | defense` (the opening AI
message and every subsequent chat reply are logged as `stage='discussion'`;
the 3 AI-generated defense questions are logged as one JSON-array message
with `role='ai', stage='defense'`).

**`case_questions`** — faculty-authored "Structured Written Questions" (marks/rubric-bearing, distinct from the free-text attempt flow above)
```
id, case_study_id, question_number, question_text, marks, blooms_level,
word_limit_min, word_limit_max, instructions, model_answer,
alternative_answers, marking_scheme, created_at, updated_at
```

**`case_question_responses`**: `id, attempt_id, question_id, response_text, word_count, submitted_at, ai_score, ai_feedback`
— schema exists; not used by the current attempt flow (which still takes
one `initial_analysis` blob).

**`rapid_fire_questions`** / **`rapid_fire_responses`** — similar
Case-Builder-authored schema (6 Q&A pairs per case with sequence, answer
text) not yet consumed by the student attempt flow.

**`assigned_cases`** — the assignment/eligibility record joining a student to a case
```
id, student_id (→ students.id), case_study_id, assigned_by, assigned_at,
status, started_attempt_id, completed_at, assignment_source,
section_assignment_id, due_date
```
`status` ∈ `pending | active | completed` (also historically `removed` /
`dropped` equivalents on the section-membership side, not this table).
`assignment_source` records whether a faculty, mentor, or admin action
created the assignment.

**`case_section_assignments`**: `id, case_study_id, section_id, assigned_by, assigned_at, due_date, instructions, status`
— the "Assign to Class" bulk-assignment record; fans out into individual
`assigned_cases` rows per enrolled student.

**`case_imports`**: `id, title, source_type, status, original_filename, mapped_content, created_by, approved_case_id, created_at, updated_at`
— schema for the Admin "Case Import" feature; the admin page for it is a
placeholder (`FEATURES.md`).

### 1.4 Capability Scoring

**`capabilities`**: `id, name, weightage, engagement_type, capability_group`
- `engagement_type` ∈ `case_study | simulation` — 8 case_study rows
  (Communication, Leadership, Problem Solving, Decision Making,
  Innovation, Strategic Thinking, Entrepreneurship, Professionalism) + 20
  simulation rows (5 each under Think/Lead/Execute/Grow `capability_group`
  values).

**`student_capabilities`**: `id, student_id, capability_id, current_score, last_updated, attempt_count`
— one row per (student, capability); `current_score` 0–100,
`attempt_count` tracks how many real attempts have contributed (added in
migration 0011 specifically so `attempt_count == 0` can distinguish a
seed-created placeholder row from a real first attempt — see §4).

**`simulation_capability_scores`**: `id, student_id, attempt_id, capability_id, score, created_at`
— per-attempt snapshot for the Simulations feature (distinct from
`student_capabilities`'s single current-value-per-capability model).

### 1.5 Mentor, Sessions, Alerts

**`sessions`**: `id, mentor_id, session_type, agenda, scheduled_at, completed_at, notes, created_at`
**`session_students`**: `id, session_id, student_id, notified_at`
**`interventions`**: `id, student_id, mentor_id, action_taken, notes, created_at, intervention_type, follow_up_date, updated_at`
**`alerts`**: `id, mentor_id, student_id, alert_type, severity, message, metadata, status, dismissed_at, created_at`
**`mentor_attempt_comments`**: `id, attempt_id, mentor_id, stage, comment_text, flagged_for_session, created_at, updated_at`

### 1.6 Admin, Notifications, Settings

**`notification_log`**: `id, recipient_user_id, event_type, channel, status, subject, body, error_message, created_at, sent_at`
(rows are created for assignment/completion/level-up events; nothing
currently consumes the queue to actually send email)
**`notification_rules`**: `id, event_type, recipient_roles, channels, message_template, is_active, created_at, updated_at`
**`platform_settings`**: `id, section, config (JSON text), updated_by, updated_at`
(currently used for the `capability_thresholds` section — recency weight
and score-drop threshold, both admin-configurable, see §4)
**`system_events`**: `id, actor_user_id, event_type, message, metadata, created_at`

### 1.7 Other Student-Facing Tables

**`achievements`**: `id, student_id, badge_name, description, earned_at` — schema exists, not populated by any real logic (the Achievements page is static/mock).
**`reflections`**: `id, student_id, attempt_id, reflection_text, score, submitted_at` — legacy table, superseded by `case_study_attempts.reflection_text` for the current flow.
**`ai_conversations`**: `id, student_id, simulation_id, attempt_id, role, message, timestamp` — legacy, part of the dead `simulations` system (§1.8), not `cs_ai_conversations`.

### 1.8 Legacy / Dead Tables — Do Not Build Against These

**`simulations`**: `id, title, industry, difficulty, duration_minutes, created_by, source, status, created_at`
**`simulation_attempts`**: `id, student_id, simulation_id, start_time, end_time, quality_score, logic_score, innovation_score, time_score, reflection_score, total_score, status`

These two (plus `ai_conversations` above) are from the original migration
0001 baseline and are **not read or written by any current application
code** — confirmed by a full repo grep. Several feature spec documents
were written illustratively against these table names; when implementing
against a spec, always verify the real target is `case_studies` /
`case_study_attempts` / `cs_ai_conversations` instead.

---

## 2. API Endpoint Catalog

All routes below are mounted under `/api/v1` unless noted. `role: X`
means `require_role` restricts the endpoint to that role (or roles).

### 2.1 Auth (`/api/v1/auth`)
| Method | Path | Role |
|---|---|---|
| POST | `/register` | any |
| POST | `/login` | any |
| GET | `/me` | authenticated |

### 2.2 Cases (`/api/v1/cases`) — the real Case Studies + attempt-flow module
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/health` | any | |
| POST | `/create` | faculty, mentor, admin | |
| GET | `/list` | authenticated | filters: `domain`, `difficulty`, `career_track`, `capability`, `status` |
| GET | `/{case_id}/detail` | student | case content + this student's attempt state (§5) |
| GET | `/{case_id}` | authenticated | list-row shape; students only see `status='published'` |
| PUT | `/{case_id}/publish` | faculty, admin | |
| PUT | `/{case_id}/archive` | faculty, admin | |
| POST | `/attempt/start` | student | 403 if not assigned, 409 if an attempt already exists |
| POST | `/attempt/submit-analysis` | student | 200-word minimum; generates the opening AI discussion message |
| POST | `/attempt/ai-message` | student | requires `status='ai_discussion'` |
| POST | `/attempt/submit-solution` | student | requires `status='ai_discussion'`; generates 3 AI defense questions |
| POST | `/attempt/submit-defense` | student | requires `status='solution_submitted'`; generates the evaluation |
| POST | `/attempt/submit-reflection` | student | requires `status='defense_complete'`; finalizes capability scores + notifications |
| GET | `/attempt/{attempt_id}` | student (own), mentor (assigned), admin | full resume state: analysis/conversations/solution/defense/reflection/evaluation |
| GET | `/mentor/student/{student_id}/attempts` | mentor | |
| GET | `/mentor/student/{student_id}/thinking-path/{attempt_id}` | mentor | |

### 2.3 Student (`/api/v1/student`)
| Method | Path | Notes |
|---|---|---|
| GET | `/profile` | full_name, email, course/batch/semester/section, mentor `{name, initials}`, career track |
| GET | `/dashboard/summary` | overall score, flat capability list, level + level_label, hero_message, active_case, upcoming_session |
| GET | `/dashboard/capabilities` | 4-category matrix (§4) |
| GET | `/active-engagements` | active case study + Simulations groups (Think/Lead/Execute/Grow) + Concept Study placeholder |

### 2.4 Faculty (`/api/v1/faculty`)
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/summary` | |
| GET | `/cases` | |
| GET | `/analytics/summary` | per-section stats + faculty-wide totals |
| GET | `/courses` | |
| GET | `/capabilities` | case_study-engagement capabilities, self-seeding on first call |
| POST | `/cases` | create draft |
| GET | `/cases/assigned` | assignment tracking with completion rate |
| GET / PUT | `/cases/{case_id}` | full editor read/write |
| GET / PUT | `/cases/{case_id}/rubric` | |
| POST | `/cases/{case_id}/generate` | async AI full-case generation (job-based) |
| GET | `/cases/{case_id}/generate/{job_id}` | poll job status |
| POST | `/cases/{case_id}/generate-questions` | AI-generate 3 Structured Written Questions |
| POST | `/cases/{case_id}/generate-rapid-fire` | AI-generate 6 rapid-fire Q&A pairs |
| POST | `/cases/{case_id}/publish` | publish-gate validation |
| POST | `/cases/{case_id}/assign-section` | bulk-assigns to every enrolled student + notifications |
| GET | `/sections` / `/students` | roster views |
| PATCH | `/case-assignments/{assignment_id}/close` | |

### 2.5 Mentor (`/api/v1/mentor`)
`/health`, `/students`, `/students/{id}`, `/cases`,
`/students/{id}/assign-case`, `/students/{id}/assigned-cases`,
`/dashboard/summary`, `/dashboard/alerts`, `/dashboard/sessions/upcoming`,
`/alerts` (+ dismiss), `/sessions` (+ complete), `/interventions`,
`/thinking-path/{attempt_id}` (+ comment, + flag).

### 2.6 Admin (`/api/v1/admin`)
`/dashboard/summary`, `/users` (list/create/CSV-import + template),
`/users/{id}/status`, `/users/{id}/role`, `/users/{id}/reset-password`,
`/users/{id}/mentor` (+ bulk-assign), `/users/{id}/career-track`,
`/mentors`, `/career-tracks`, `/courses` (+ semesters/batches/sections
nested underneath), `/sections` (list/detail/eligible-students, add/
remove faculty & students, bulk CSV), `/batches/{id}/advance-semester`.

### 2.7 Dead stub routers (health-check only, not under `/api/v1`)
`GET /capability/health`, `GET /ai/health`, `GET /notification/health`.

---

## 3. Evaluation Weighting (per case attempt)

`services/simulation/service.py::calculate_total_score`:

```
total_score = thinking_depth   × 0.30
            + logic_score      × 0.20
            + creativity_score × 0.15
            + practicality_score × 0.15
            + risk_awareness_score × 0.10
            + reflection_score × 0.10
```
(`time_score` and `ai_utilization_score` are captured in `cs_evaluations`
but not part of the weighted total — display-only metrics.) All inputs
and the output are on a 0–100 scale.

**Grade labels** (Case Detail page, `services/simulation/service.py::grade_label`):

| Score | Label |
|---|---|
| 90–100 | Exceptional |
| 75–89 | Excellent |
| 65–74 | Good |
| 55–64 | Improving |
| 0–54 | Needs Work |

(A separate, slightly different threshold set is used only inside the
attempt flow's own Screen 6 evaluation display component — the two were
never unified since they're small, independent display helpers.)

---

## 4. Capability Scoring Algorithm

Source of truth: `services/simulation/service.py` (writes, triggered on
attempt completion) + `services/student/capability_engine.py` (read-only
aggregation for the dashboard).

### 4.1 Write path — `update_capability_scores`

Runs inside `submit_reflection`'s transaction (the final step of the
attempt flow):

1. Look up every `capability_id` this case is tagged with
   (`case_study_tags` where `tag_type='capability'`, matched by
   normalized name). If a case has **no** capability tags, the fallback
   is to update *every* capability in the table (a known latent
   quirk — only triggers for untagged cases).
2. For each targeted capability, call `update_single_capability_score`
   with the attempt's `cs_evaluations.total_score`:
   - If no row exists yet for (student, capability) → **insert** with
     `current_score = total_score`, `attempt_count = 1`.
   - If a row exists but `attempt_count == 0` (a seed-created placeholder
     row, not a real prior attempt) → **set directly**,
     `current_score = total_score`, `attempt_count = 1`. This distinction
     exists specifically so a student's true first real attempt isn't
     wrongly blended against a seeded zero.
   - Otherwise → **rolling weighted average**:
     `new_score = round(old_score × (1 − w) + total_score × w)`,
     `attempt_count += 1`.
3. `w` = `RECENCY_WEIGHT`, default `0.3`, overridable via
   `platform_settings` (section `capability_thresholds`, key
   `recency_weight`, clamped to `[0, 1]`).
4. If the score *dropped* by more than `SCORE_DROP_THRESHOLD` (default
   `10`, same settings section, key `score_drop_threshold`) and the
   student has an assigned mentor, an `alerts` row is created
   automatically (severity `critical`).
5. `update_student_level` recomputes `students.current_level` from the
   student's **average score across all capabilities** (not just the
   ones just updated):

   | Average score | Level |
   |---|---|
   | < 60 | 1 |
   | < 70 | 2 |
   | < 80 | 3 |
   | < 85 | 4 |
   | < 90 | 5 |
   | < 95 | 6 |
   | ≥ 95 | 7 |

   A level change writes `notification_log` rows for the student and
   their mentor.

### 4.2 Read path — the dashboard Capability Matrix

`services/student/capability_engine.py` does **not** duplicate the write
logic above — it only aggregates `student_capabilities` for display,
filtered to `engagement_type='case_study'`. It reconciles two taxonomies
that don't naturally align (a product decision made explicitly, not an
oversight — see `context/current-feature.md`'s SPEC_17 history for the
full reasoning):

- The dashboard wants 4 categories × 5 sub-capabilities each (20 total,
  matching an earlier illustrative design).
- The real `capabilities` table only has 8 flat `case_study`-engagement
  rows, no category column.

So `CATEGORY_MAP` hand-maps the real 8 onto the 4 categories, 2 each:

| Category | Capabilities |
|---|---|
| Cognitive | Decision Making, Strategic Thinking |
| Leadership | Communication, Leadership |
| Entrepreneurial | Innovation, Entrepreneurship |
| Professional | Problem Solving, Professionalism |

Category score = simple average of its capabilities' `current_score`.
Overall score (as used for the hero message's weakest-category pick) =
average across all 8. **This is a separate number from
`dashboard/summary.overall_capability_score`**, which averages *all* of a
student's `student_capabilities` rows regardless of `engagement_type` — a
known, documented discrepancy once a student has any Simulations-type
scores (see `TECH_ARCHITECTURE.md` / current-feature history).

Also holds `LEVEL_LABELS` (extends the 7-level scale above with display
labels — Foundation/Developing/Regular/Proficient/Advanced/Expert/
Champion) and `HERO_MESSAGES` (one fixed message per category naming the
skill it targets, plus a `no_attempts` default shown before the student
has any real attempt).

---

## 5. Case Attempt State Machine

```
(no row)
   │  POST /cases/attempt/start
   ▼
analysis_submitted   ── POST /attempt/submit-analysis (≥200 words) ──▶ ai_discussion
                                                                          │
                                          POST /attempt/ai-message (any number of times)
                                                                          │
                                          POST /attempt/submit-solution (generates 3 defense Qs)
                                                                          ▼
                                                                  solution_submitted
                                                                          │
                                          POST /attempt/submit-defense (generates evaluation)
                                                                          ▼
                                                                  defense_complete
                                                                          │
                                          POST /attempt/submit-reflection (finalizes scores)
                                                                          ▼
                                                                     evaluated
```

Display-stage mapping used by both the Case Detail page and the attempt
flow's resume logic (derived from `status`, **not** a persisted
`current_stage` column — deliberately, to avoid a second source of truth
that could drift out of sync):

| `status` | Stage # | Label |
|---|---|---|
| `analysis_submitted` | 2 | Analysis |
| `ai_discussion` | 3 | AI Chat |
| `solution_submitted` | 5 | Defense |
| `defense_complete` | 6 | Evaluation |
| `evaluated` | 6 | Evaluation |

(Stage 1 "Briefing" and stage 4 "Solution" are momentary client-side
states between two status values with no separate persisted state of
their own.)

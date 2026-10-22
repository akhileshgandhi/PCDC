# SPEC_17 — Case Studies System

## Overview
This spec covers the complete case studies feature for PCDC.
Case studies are real-world scenarios (geopolitics, sports,
business, social issues etc.) that students attempt once to
demonstrate and develop their capabilities.

Cline must implement this feature across backend and frontend
exactly as described. Do not deviate from naming conventions,
table names, or folder structure.

---

## Database tables (already created via migration 0002)

| Table | Purpose |
|---|---|
| case_studies | Core case content and metadata |
| case_study_tags | Multi-dimensional tags (domain, career, capability) |
| case_study_attempts | One row per student per case (enforced unique) |
| cs_evaluations | AI-generated scores after completion |
| cs_ai_conversations | Full conversation log per attempt |

---

## Backend — file locations

All files go inside `backend/services/simulation/`
(reuse the simulation module for case studies — they are
the same domain).

```
backend/services/simulation/
├── __init__.py
├── router.py        ← add all new endpoints here
├── models.py        ← add all Pydantic schemas here
└── service.py       ← add all business logic here
```

---

## Backend — Pydantic schemas (models.py)

Add these schemas. Do not use SQLAlchemy models — use raw
SQL with `sqlalchemy.text()` for all database operations.

```python
class CaseStudyCreate(BaseModel):
    title: str
    description: Optional[str]
    content: str
    domain: str  # geopolitics | sports | business | social | science | technology | environment | healthcare
    difficulty: int  # 1-7
    estimated_minutes: int = 45
    source: str = "faculty"  # faculty | mentor | ai_generated | admin_import
    evaluation_rubric: Optional[str]
    learning_outcomes: Optional[str]
    reflection_questions: Optional[str]
    tags: List[CaseStudyTagInput]  # list of {tag_type, tag_value}

class CaseStudyTagInput(BaseModel):
    tag_type: str  # domain | career_track | capability
    tag_value: str

class CaseStudyResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    domain: str
    difficulty: int
    estimated_minutes: int
    source: str
    status: str
    created_by: Optional[int]
    tags: List[dict]
    created_at: str

class StartAttemptRequest(BaseModel):
    case_study_id: int

class SubmitAnalysisRequest(BaseModel):
    attempt_id: int
    initial_analysis: str  # minimum 200 words enforced in service

class SubmitSolutionRequest(BaseModel):
    attempt_id: int
    final_solution: str

class SubmitDefenseRequest(BaseModel):
    attempt_id: int
    defense_responses: str

class SubmitReflectionRequest(BaseModel):
    attempt_id: int
    reflection_text: str
```

---

## Backend — API endpoints (router.py)

Add all endpoints under prefix `/api/v1/cases`.

### Faculty / Mentor / Admin endpoints

```
POST   /api/v1/cases/create
       Body: CaseStudyCreate
       Auth: role must be faculty | mentor | admin
       Action: Insert into case_studies + case_study_tags
       Returns: CaseStudyResponse

GET    /api/v1/cases/list
       Auth: any logged-in user
       Query params: domain, difficulty, career_track,
                     capability, status (default: published)
       Action: SELECT with JOIN on case_study_tags
       Returns: List[CaseStudyResponse]

GET    /api/v1/cases/{case_id}
       Auth: any logged-in user
       Returns: Full CaseStudyResponse including all tags

PUT    /api/v1/cases/{case_id}/publish
       Auth: faculty | admin only
       Action: UPDATE status = 'published'

PUT    /api/v1/cases/{case_id}/archive
       Auth: faculty | admin only
       Action: UPDATE status = 'archived'
```

### Student attempt endpoints

```
POST   /api/v1/cases/attempt/start
       Body: StartAttemptRequest
       Auth: student only
       Action:
         1. Check case_study_attempts for existing row
            with (case_study_id, student_id)
         2. If exists: return 409 "Already attempted"
         3. If not: INSERT into case_study_attempts
            with status = 'analysis_submitted'
         4. Return: attempt_id, case study content,
            reflection_questions
       Note: Do NOT return AI access yet

POST   /api/v1/cases/attempt/submit-analysis
       Body: SubmitAnalysisRequest
       Auth: student only
       Action:
         1. Count words in initial_analysis
         2. If < 200 words: return 400 "Minimum 200 words required"
         3. UPDATE case_study_attempts SET
            initial_analysis = ?,
            initial_word_count = ?,
            ai_unlocked_at = NOW(),
            status = 'ai_discussion'
         4. Return: { ai_unlocked: true, attempt_id }
       Note: Only after this can student access AI chat

POST   /api/v1/cases/attempt/ai-message
       Body: { attempt_id: int, message: str }
       Auth: student only
       Action:
         1. Verify attempt status = 'ai_discussion'
         2. Load full conversation history from
            cs_ai_conversations for this attempt_id
         3. Build system prompt (see AI prompts section)
         4. Call Claude API with full history + new message
         5. INSERT both student message and AI response
            into cs_ai_conversations with stage='discussion'
         6. Return: { response: str }

POST   /api/v1/cases/attempt/submit-solution
       Body: SubmitSolutionRequest
       Auth: student only
       Action:
         1. UPDATE case_study_attempts SET
            final_solution = ?,
            status = 'solution_submitted'
         2. Trigger defense question generation (see AI section)
         3. Return: { defense_questions: List[str] }

POST   /api/v1/cases/attempt/submit-defense
       Body: SubmitDefenseRequest
       Auth: student only
       Action:
         1. UPDATE defense_responses, status='defense_complete'
         2. Trigger full evaluation (see AI section)
         3. Return: EvaluationResult

POST   /api/v1/cases/attempt/submit-reflection
       Body: SubmitReflectionRequest
       Auth: student only
       Action:
         1. UPDATE reflection_text, status='evaluated'
         2. Calculate time_taken_minutes
         3. Trigger capability score update
         4. Return: FinalEvaluation with all scores

GET    /api/v1/cases/attempt/{attempt_id}
       Auth: student (own) | mentor (assigned students) | faculty
       Returns: Full attempt including conversations and evaluation
```

### Mentor endpoints

```
GET    /api/v1/cases/mentor/student/{student_id}/attempts
       Auth: mentor only
       Returns: All attempts for a student with scores

GET    /api/v1/cases/mentor/student/{student_id}/thinking-path/{attempt_id}
       Auth: mentor only
       Returns: Full cs_ai_conversations log for an attempt
```

---

## Backend — service.py business logic

### AI system prompts

#### Discussion stage prompt
```python
DISCUSSION_SYSTEM_PROMPT = """
You are an expert business advisor and case study mentor.
The student has submitted their initial analysis of a case study.
Your role is to:
1. Ask probing questions to deepen their thinking
2. Provide relevant frameworks, data, or perspectives they may have missed
3. Challenge assumptions gently but firmly
4. Never give them the answer directly — guide their thinking
5. Keep responses concise and focused

The student's initial analysis is provided in the conversation history.
"""
```

#### Defense stage prompt
```python
DEFENSE_PROMPT = """
You are a critical examiner reviewing the student's solution.
Generate exactly 3 challenging defense questions based on their solution.
Questions must test:
1. Risk awareness — what could go wrong?
2. Alternative thinking — what other approaches exist?
3. Implementation reality — how would this actually work?

Return exactly 3 questions as a JSON array:
["question1", "question2", "question3"]
"""
```

#### Evaluation prompt
```python
EVALUATION_PROMPT = """
You are an expert capability evaluator. Evaluate the student's
complete case study attempt and return a JSON object with these
exact keys:

{
  "thinking_depth": 0-100,
  "logic_score": 0-100,
  "creativity_score": 0-100,
  "practicality_score": 0-100,
  "risk_awareness_score": 0-100,
  "reflection_score": 0-100,
  "ai_utilization_score": 0-100,
  "time_score": 0-100,
  "strengths": "2-3 sentences",
  "weaknesses": "2-3 sentences",
  "blind_spots": "1-2 sentences",
  "improvement_areas": "2-3 actionable suggestions"
}

Weighted total = (thinking_depth × 0.30) + (logic × 0.20) +
(creativity × 0.15) + (practicality × 0.15) +
(risk_awareness × 0.10) + (reflection × 0.10)

Evaluate based on:
- Initial analysis (think-first quality)
- Quality of AI questions asked (AI utilization)
- Final solution depth and practicality
- Defense responses under challenge
- Reflection quality and self-awareness
"""
```

### Capability score update logic

After evaluation is complete, update `student_capabilities` table.
Map case study capabilities from tags to capability IDs:

```python
CAPABILITY_MAP = {
    "analytical_thinking": 1,
    "critical_thinking": 2,
    "strategic_thinking": 3,
    "decision_making": 4,
    "communication": 5,
    "leadership": 6,
    "innovation": 7,
    "risk_assessment": 8,
}

def update_capability_scores(db, student_id, attempt_id, evaluation):
    # Get capability tags for this case study
    # For each tagged capability, update student_capabilities:
    # new_score = (current_score * 0.7) + (total_score * 0.3)
    # This is a weighted rolling average — past performance matters
    pass
```

---

## Frontend — file locations

```
frontend/src/
├── pages/
│   ├── cases/
│   │   ├── CaseList.jsx         ← browse + filter cases
│   │   ├── CaseDetail.jsx       ← view case before starting
│   │   └── CaseAttempt.jsx      ← 5-screen attempt flow
│   └── faculty/
│       └── CreateCase.jsx       ← faculty case builder
├── components/
│   └── cases/
│       ├── CaseCard.jsx         ← card for list view
│       ├── DifficultyBadge.jsx  ← coloured 1-7 badge
│       ├── DomainTag.jsx        ← coloured domain pill
│       ├── AttemptScreen1.jsx   ← briefing
│       ├── AttemptScreen2.jsx   ← initial analysis (word counter)
│       ├── AttemptScreen3.jsx   ← AI chat (unlocked after Screen 2)
│       ├── AttemptScreen4.jsx   ← solution submission
│       ├── AttemptScreen5.jsx   ← defense questions
│       └── AttemptScreen6.jsx   ← evaluation results
```

---

## Frontend — screen by screen

### Screen 1: Case briefing
- Show: title, domain badge, difficulty badge, estimated time
- Show: description and learning outcomes
- Show warning: "You have one attempt — read carefully"
- Button: "I'm ready — start my attempt"
- API call: POST /api/v1/cases/attempt/start

### Screen 2: Initial analysis (think first)
- Heading: "What is your initial analysis?"
- Large textarea with live word counter
- Show: minimum 200 words required
- Counter turns green when >= 200 words
- Button disabled until 200 words reached
- Button: "Submit analysis and unlock AI"
- API call: POST /api/v1/cases/attempt/submit-analysis

### Screen 3: AI discussion
- Two-column layout: case content (left) + AI chat (right)
- Chat interface with message history
- Student types question, AI responds
- Show: "AI is now available to help you think"
- Button at bottom: "I'm ready to submit my solution"
- API call: POST /api/v1/cases/attempt/ai-message

### Screen 4: Solution submission
- Heading: "Submit your final recommendation"
- Large textarea for full solution
- Sub-sections: Recommendation | Reasoning | Implementation | Risks
- Button: "Submit solution"
- API call: POST /api/v1/cases/attempt/submit-solution

### Screen 5: Defense
- Show 3 AI-generated challenge questions one at a time
- Student answers each before seeing the next
- Button: "Submit defense"
- API call: POST /api/v1/cases/attempt/submit-defense

### Screen 6: Evaluation results
- Radar/spider chart showing 6 capability scores
- Strengths, weaknesses, blind spots panels
- Improvement areas with next recommended case
- Share button for mentor
- API call result from submit-defense triggers this

---

## Faculty case builder (CreateCase.jsx)

Fields:
- Title (text input)
- Domain (dropdown: geopolitics, sports, business, social,
  science, technology, environment, healthcare)
- Difficulty (1-7 slider with level descriptions)
- Estimated time (number input, minutes)
- Description (short textarea)
- Content (rich textarea — the full case body)
- Learning outcomes (textarea)
- Evaluation rubric (textarea — optional custom criteria)
- Reflection questions (textarea — 3-5 questions)
- Tags section:
  - Career tracks (multi-select checkboxes)
  - Capabilities targeted (multi-select checkboxes)
- Status toggle: Save as draft / Publish immediately
- Button: "Create case study"

---

## Alembic setup (run once)

Ask Cline to run these commands in the backend folder:

```bash
pip install alembic
alembic init alembic
```

Then update `alembic/env.py` to read DATABASE_URL from .env.
Then place migration file `0002_add_case_studies.py` in
`alembic/versions/`.

To run migration:
```bash
alembic upgrade head
```

To rollback:
```bash
alembic downgrade -1
```

---

## Error handling rules

| Situation | HTTP code | Message |
|---|---|---|
| Student already attempted | 409 | "You have already attempted this case study" |
| Analysis under 200 words | 400 | "Minimum 200 words required. Current: X words" |
| AI accessed before analysis | 403 | "Please submit your initial analysis first" |
| Case not published | 404 | "Case study not found" |
| Wrong role for create | 403 | "Only faculty, mentors, and admins can create cases" |

---

## Security rules

1. Students can only see their own attempts
2. Mentors can only see attempts of their assigned students
3. Faculty can see all attempts for cases they created
4. Admin can see everything
5. Case content is only returned AFTER attempt is started
   (prevents students from sharing content without attempting)
6. AI chat endpoint verifies attempt belongs to requesting student

---

## Definition of done

- [ ] All 9 backend endpoints working and tested in /docs
- [ ] Migration runs cleanly via alembic upgrade head
- [ ] One-attempt constraint enforced at DB level
- [ ] 200-word minimum enforced before AI unlocks
- [ ] AI conversation logged to cs_ai_conversations
- [ ] Evaluation scores saved to cs_evaluations
- [ ] Capability scores updated after evaluation
- [ ] CaseList page shows published cases with filters
- [ ] Full 6-screen attempt flow works end to end
- [ ] Faculty can create and publish a case
- [ ] Mentor can view student thinking path

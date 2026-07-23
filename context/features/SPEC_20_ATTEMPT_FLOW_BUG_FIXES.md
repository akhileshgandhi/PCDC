# SPEC_20: Case Attempt Flow — End-to-End Bug Fixes

**Type:** Bug fix + functional wiring
**Priority:** Critical — blocks all student case submissions
**Affects:** Stages 1–6 of the attempt flow at `/student/attempt/:id/stage/:stage`

---

## 0. Bugs Identified (from screenshots)

| # | Stage | Bug | Screenshot |
|---|---|---|---|
| 1 | All | Stage stepper shows 5 stages on some cases, 6 on others — inconsistent | Image 1 vs Image 2 |
| 2 | Stage 3 (AI Chat) | AI chat area is empty on load — no initial AI message | Image 4 |
| 3 | Stage 3 (AI Chat) | AI does not respond to student messages — error: "The AI did not respond" | Image 5 |

| 5 | Stage 4 (Solution) | Submitting solution fails — error: "Unable to submit your solution right now" | Images 1 + 6 |

Fix all 5 in a single pass. They are likely connected — if the solution submission endpoint is broken, the root cause is probably the same as the AI chat endpoint (missing/misconfigured backend route or OpenAI key not being read).

---

## 1. Bug Fix: Stage Stepper — Always 6 Stages

**Problem:** Image 1 shows 5 steps (Briefing, Analysis, AI Chat, Solution, Defense). Images 2–6 show 6 steps (+ Evaluation). The stepper is inconsistent.

**Fix:** Hardcode the stepper to always show exactly 6 stages:

```
1. Briefing → 2. Analysis → 3. AI Chat → 4. Solution → 5. Defense → 6. Evaluation
```

The stepper component is likely reading stage count from somewhere dynamic (attempt data or case data). Replace it with a fixed 6-stage constant. The active stage is still dynamic (comes from `current_stage` on the attempt), but the total always = 6.

**File to fix:** The attempt flow component / stepper component.

**Check:** Does the stepper exist as a shared component or is it duplicated per stage? If duplicated, fix all instances.

---

## 2. Bug Fix: AI Chat — Initial AI Message on Load

**Problem:** Stage 3 opens with a completely empty chat window (Image 4). Student sees a blank space and doesn't know what to do.

**Fix:** When Stage 3 loads, check if `ai_conversations` has any messages for this attempt. If zero messages exist, fire an automatic opening message from the AI.

**Opening message logic (backend):**

`GET /api/student/attempts/:attempt_id/stage/3` (or whatever the stage load endpoint is)

On load, if `ai_conversations` is empty for this attempt:
1. Build an opening prompt using the case context + student's initial analysis
2. Call OpenAI
3. Store the response in `ai_conversations`
4. Return it as the first message

**Opening system prompt:**
```
You are an AI business coach helping an MBA student work through a case study.

Case: {case.title}
Situation: {case.situation}
Student's initial analysis: {attempt.initial_analysis}

Your role: Challenge their thinking, ask probing questions, help them see angles they may have missed. Do NOT give them the answer. Ask one focused question to start.

Start with a brief acknowledgment of their analysis, then ask one sharp question that challenges an assumption or pushes them to think deeper.
```

**Opening user message trigger:**
```python
# On stage 3 load, if no conversations exist yet
if conversation_count == 0:
    opening_ai_message = call_openai(opening_prompt)
    save_to_ai_conversations(attempt_id, role='assistant', content=opening_ai_message)
    return opening_ai_message
```

This means the student arrives at Stage 3 and immediately sees an AI message waiting for them — much better UX.

---

## 3. Bug Fix: AI Chat — AI Not Responding to Student Messages

**Problem:** Student sends a message, gets error "The AI did not respond. Please try sending your message again." (Image 5). The AI call is failing.

**Root cause to investigate (in this order):**

**Step 1 — Check the backend endpoint exists and is registered:**
```
POST /api/student/attempts/:attempt_id/chat
```
Does this route exist in `router.py`? If not, this is the entire problem.

**Step 2 — Check OpenAI API key is being read:**
```python
import os
api_key = os.getenv("OPENAI_API_KEY")
print(f"Key loaded: {api_key is not None}")  # Add this debug log temporarily
```
If the key is None, the call fails silently. Ensure `.env` has `OPENAI_API_KEY=sk-...` and the FastAPI startup loads it correctly.

**Step 3 — Check the OpenAI call itself:**
The chat endpoint should:
1. Receive student message from request body
2. Fetch full conversation history for this attempt from `ai_conversations`
3. Build messages array (system prompt + conversation history + new student message)
4. Call OpenAI
5. Save both student message and AI response to `ai_conversations`
6. Return AI response

**Correct implementation:**
```python
@router.post("/attempts/{attempt_id}/chat")
async def chat(attempt_id: str, body: ChatRequest, db: Session = Depends(get_db)):
    # 1. Verify attempt belongs to current student
    attempt = get_attempt(db, attempt_id)

    # 2. Get case context
    case = get_case(db, attempt.simulation_id)

    # 3. Get conversation history
    history = get_conversation_history(db, attempt_id)

    # 4. Build messages for OpenAI
    messages = [
        {
            "role": "system",
            "content": f"""You are an AI business coach for an MBA case study.
Case: {case.title}
Situation: {case.situation}
Student's initial analysis: {attempt.initial_analysis}

Challenge their thinking. Ask probing questions. Do NOT give direct answers.
Keep responses concise — 2-4 sentences maximum."""
        }
    ]

    # Add conversation history
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # Add new student message
    messages.append({"role": "user", "content": body.message})

    # 5. Call OpenAI
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=300
    )
    ai_response = response.choices[0].message.content

    # 6. Save both to DB
    save_message(db, attempt_id, role="user", content=body.message)
    save_message(db, attempt_id, role="assistant", content=ai_response)

    return {"response": ai_response}
```

**Step 4 — Check frontend error handling:**
The frontend catches the error and shows "The AI did not respond." — but what HTTP status is the backend returning? Add a `console.error` temporarily to log the full error response:
```javascript
} catch (error) {
  console.error('AI chat error:', error.response?.data, error.response?.status)
  setError('The AI did not respond. Please try sending your message again.')
}
```
Run the test again, check browser console, and the actual error will be visible.

---

## 4. Bug Fix: Solution Form — Pre-filled with Lorem Ipsum

**Problem:** Stage 4 opens with all 4 solution sections (Recommendation, Reasoning, Implementation Plan, Risks & Mitigations) already filled with Lorem Ipsum text (Images 1 + 6). They should be empty for the student to write in.

**Root cause:** The form fields are initialized with a hardcoded placeholder string somewhere in the component:
```javascript
// BAD — this is what currently exists somewhere
const [recommendation, setRecommendation] = useState("the librarian at St Bride...")
```

**Fix:** Replace hardcoded initial values with empty strings:
```javascript
// CORRECT
const [recommendation, setRecommendation] = useState("")
const [reasoning, setReasoning] = useState("")
const [implementationPlan, setImplementationPlan] = useState("")
const [risksAndMitigations, setRisksAndMitigations] = useState("")
```

Also check: if the student previously saved a draft of their solution (by navigating back and forward), those values should be restored from the DB — not from hardcoded strings. The load sequence should be:
1. Fetch attempt data from API
2. If `attempt.solution_draft` exists in DB → pre-fill form with saved draft
3. If no draft exists → show empty form

---

## 5. Bug Fix: Solution Submission Failing

**Problem:** Clicking "Submit Solution" shows "Unable to submit your solution right now. Please try again." (Images 1 + 6). The form data is never saved.

**Root cause to investigate (in this order):**

**Step 1 — Check the endpoint exists:**
```
POST /api/student/attempts/:attempt_id/solution
```
Check if this route is registered in the backend router.

**Step 2 — Check what the frontend is sending:**
Open browser DevTools → Network tab → click Submit Solution → look at the request payload. Confirm:
- The request is actually being sent (not blocked by frontend validation)
- The body contains the 4 fields
- The URL is correct (right attempt_id, right base URL)

**Step 3 — Check backend validation:**
If the endpoint exists but returns 4xx/5xx, the backend may be rejecting the request due to:
- Missing required field validation (one of the 4 fields required but empty)
- Wrong field names in the Pydantic schema vs what frontend sends
- Attempt status not being 'active' (if status was already updated)
- DB constraint violation

**Correct implementation:**
```python
class SolutionSubmission(BaseModel):
    recommendation: str
    reasoning: str
    implementation_plan: str
    risks_and_mitigations: str

@router.post("/attempts/{attempt_id}/solution")
async def submit_solution(
    attempt_id: str,
    body: SolutionSubmission,
    db: Session = Depends(get_db)
):
    attempt = get_attempt(db, attempt_id)

    # Validate attempt is active and at correct stage
    if attempt.status != 'active':
        raise HTTPException(400, "Attempt is not active")

    # Save solution fields
    update_attempt(db, attempt_id, {
        "recommendation": body.recommendation,
        "reasoning": body.reasoning,
        "implementation_plan": body.implementation_plan,
        "risks_and_mitigations": body.risks_and_mitigations,
        "current_stage": 5  # advance to Defense
    })

    return {"success": True, "next_stage": 5}
```

**Step 4 — Check simulation_attempts table has solution columns:**
Does the `simulation_attempts` table have columns for:
- `recommendation TEXT`
- `reasoning TEXT`
- `implementation_plan TEXT`
- `risks_and_mitigations TEXT`

If not, these columns are missing and need an Alembic migration. Check the actual table schema:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'simulation_attempts';
```

---

## 6. Additional Check: Initial Analysis Save

Before fixing stages 3 and 4, verify Stage 2 actually saves correctly. From Images 2–3, Stage 2 looks visually correct, but check:

- Does clicking "Submit Analysis & Unlock AI" actually POST to backend?
- Is `attempt.initial_analysis` being saved to DB?
- Is `current_stage` being updated to 3 after submission?

If Stage 2 isn't saving, Stage 3's left panel "Your Analysis" will be empty (it should show the student's submitted analysis — Image 4 shows Lorem Ipsum there, which is the same dummy data problem as Stage 4).

---

## 7. DB Columns Check (Run Before Any Code Changes)

Ask Claude Code to run this query against the Neon DB and report the results before touching any code:

```sql
-- Check what columns exist on simulation_attempts
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'simulation_attempts'
ORDER BY ordinal_position;

-- Check what columns exist on ai_conversations
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_conversations'
ORDER BY ordinal_position;
```

Missing columns = migration needed before the endpoint can work.

---

## 8. What "Done" Looks Like (Test Sequence)

After all fixes, test this exact sequence on a published case:

1. **Start Attempt** on case detail page → redirected to Stage 1 (Briefing)
2. **Stage 1** → read case, click "Continue to Analysis" → Stage 2 loads
3. **Stage 2** → type 200+ words → word count turns green → "Submit Analysis & Unlock AI" becomes active → click it → redirected to Stage 3
4. **Stage 3** → AI Chat loads with an opening AI message visible → type a message → AI responds within 5 seconds → have 2–3 exchanges → click "I'm ready to submit my solution" → redirected to Stage 4
5. **Stage 4** → Solution form is EMPTY (no Lorem Ipsum) → fill in all 4 sections → click "Submit Solution" → no error → redirected to Stage 5
6. **Stage 5** → Defense (AI challenges) → respond → click continue → Stage 6
7. **Stage 6** → Evaluation/Results → scores visible → attempt marked complete

Each stage advances `current_stage` on the attempt record. If student navigates back to case detail page mid-attempt, right panel shows State B "In Progress — Stage X of 6".

---

## 9. Instruction for Claude Code

> Read `context/features/SPEC_19_CASE_ATTEMPT_FLOW_FIXES.md`.
>
> Before writing any code, do the following in order:
> 1. Run the SQL query in Section 7 and report what columns exist on `simulation_attempts` and `ai_conversations`
> 2. Check if these backend routes exist in router.py: `POST /attempts/:id/chat`, `POST /attempts/:id/solution`
> 3. Check if `OPENAI_API_KEY` is being loaded from `.env` in the backend startup
> 4. Find where Stage 4 form fields are initialized in the frontend and confirm they have hardcoded Lorem Ipsum
>
> Report findings before changing any code. Once confirmed, fix all 5 bugs from Section 0 in this order: Bug 4 (easiest — frontend init values), Bug 1 (stepper constant), Bug 5 (solution endpoint), Bug 3 (AI chat endpoint), Bug 2 (AI opening message).

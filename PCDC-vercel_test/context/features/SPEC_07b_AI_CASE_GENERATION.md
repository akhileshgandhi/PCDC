# SPEC_07b: AI Case Generation — Plan of Action

**Scope:** The "Generate with AI" path on Case Builder. Faculty enters Core Fields → AI drafts the full case → faculty reviews/edits in the section editor.

**Model:** OpenAI API (key already in `.env`) — confirm which model you want to standardize on (see Open Question 1). Given your Cline setup already defaults to `gpt-4o-mini` for cost reasons, recommend the same here unless quality testing says otherwise.

---

## 1. Flow Recap

1. Faculty picks "Generate with AI" card
2. Faculty fills Core Fields (Title, Industry, Difficulty, Duration, Capabilities Targeted, Expected Outcomes) → clicks "Create Draft"
3. Draft record saved (`status: draft`, body sections empty)
4. Editor opens, showing a single prominent **"Generate Full Case Draft"** button (not auto-triggered — faculty makes an explicit second click, per your earlier "different entry flows but no surprise AI calls" decision)
5. On click: backend calls OpenAI, generates all 9 body sections in one structured call, saves them, returns to frontend
6. Editor re-renders with all sections filled, each tagged `AI-generated`
7. Faculty edits any section; can regenerate individual sections afterward (separate smaller calls)

## 2. Backend: Generation Endpoint

`POST /api/faculty/cases/{id}/generate`

**Request body:**
```json
{ "scope": "full" }
```
or
```json
{ "scope": "section", "sections": ["characters"] }
```

**Server-side steps:**
1. Fetch the case record (core fields + any existing sections)
2. Build the prompt (see Section 3)
3. Call OpenAI Chat Completions with `response_format: json_schema` (structured output) so we get back exactly the 9 fields, not free text we have to parse
4. Validate the response against the expected schema before saving — if a field is missing or malformed, fail loudly rather than save partial garbage
5. Save sections to the case record, set `section_meta[section] = "ai_generated"` for each one written
6. Return updated case object to frontend

## 3. Prompt Design

**System prompt** (fixed, not faculty-editable) — encodes the simulation template from your spec doc:

> You are generating a business case study simulation for MBA students. Given the core fields below, produce a complete, realistic, internally consistent case with these 9 sections: situation, background, data, characters, constraints, objectives, timeline, reflection_questions, learning_outcomes. The case must be solvable using the inputs provided, free of real named companies or real living people, and calibrated to the stated difficulty level [1-7 ladder from spec: Observation → Executive Leadership]. Reflection questions should provoke analysis, not just summary. Output must match the provided JSON schema exactly.

**User message** = the Core Fields, formatted plainly:
```
Title: Effect of war on Indian economy
Industry: Business
Difficulty: Level 3 (Decision Making — several valid answers, judgment, trade-off analysis)
Duration: 45 minutes
Capabilities Targeted: Strategic Thinking, Risk Assessment
Expected Outcomes: detailed analysis of war and its effects on Indian economy
```

**For full generation:** that's the entire user message.
**For per-section regeneration:** append the *other* already-filled sections as context, so e.g. regenerating "Characters" stays consistent with the existing "Situation" — this was already a Case Builder requirement from the earlier spec, just confirming it carries through here.

**Structured output schema** (JSON schema passed to OpenAI):
```json
{
  "situation": "string",
  "background": "string",
  "data": "string",
  "characters": "string",
  "constraints": "string",
  "objectives": "string",
  "timeline": "string",
  "reflection_questions": ["string"],
  "learning_outcomes": ["string"]
}
```

## 4. Frontend Changes

- Editor screen: "Generate Full Case Draft" button, disabled while a request is in flight, with a loading state (this can take 10-20+ seconds for a full case — show a spinner with a real status, not a frozen button)
- On success: populate all 9 section fields, tag each `AI-generated`
- On failure: show an inline error with a retry button, leave the draft record untouched (don't save partial/garbage output)
- Per-section "Generate"/"Regenerate" buttons unlocked once the draft exists, independent of whether full generation was used

## 5. Error Handling & Limits

- OpenAI call timeout → retry button, no silent failure
- Malformed/incomplete JSON response → treat as failure, don't save, surface to faculty ("AI generation failed, please retry")
- Rate limiting: same lesson you hit with Cline (gpt-4o limits) applies here — if you go with gpt-4o-mini for cost reasons, decide now rather than discover it under load
- Cost note: this is a separate API bill from your ChatGPT Pro subscription — confirm OpenAI billing/usage caps are set on the account tied to the `.env` key, so a generation loop can't run up an unexpected bill

## 6. Open Questions Before Building

1. **Which OpenAI model** — `gpt-4o-mini` (cheap, matches your existing default) vs `gpt-4o` (better quality, costlier, rate-limit risk you've already hit once)? Recommend starting with mini and only upgrading specific calls if output quality is weak.
2. **Reflection Questions / Learning Outcomes** — store as arrays (cleaner for the UI to render as a list) or as a single text block? Affects both the DB column type and the editor's input control.
3. **Synchronous vs background generation** — full-case generation could take 15-30s. Is a blocking request with a frontend spinner acceptable, or do you want this to be async (job queued, faculty notified when ready, can navigate away meanwhile)? Recommend starting synchronous for simplicity, revisit if it's too slow in practice.
4. **Guardrails on output** — should generated cases go through any automatic check (e.g. flagging real company/person names) before being shown to faculty, or is faculty review sufficient given they always see it before publish?

## 7. Build Order

1. Define the JSON schema + system prompt, test directly against OpenAI (script, not UI) using a couple of real Core Fields examples to validate output quality
2. Build `generate` endpoint with `scope: full` only
3. Wire up the editor's "Generate Full Case Draft" button end-to-end
4. Add per-section `scope: section` support once full generation is solid
5. Add the consistency-context behavior for regeneration (send existing sections along)

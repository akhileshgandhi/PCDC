# PCDC / CDOS — 1-Month PoC Plan

> **Goal:** an investor/client-grade demo that *also* proves the core tech.
> **Stack:** speed-optimized (FastAPI + PostgreSQL + hosted LLM behind an abstraction; Llama/vector-DB deferred).
> **Builder:** solo + Claude Code.
> **Timebox:** 4 weeks.

---

## 1. The strategy: one loop, done beautifully

The full CDOS is a multi-quarter platform (6 portals, 10 agents, mobile, digital twin). A 1-month
PoC cannot build that — and shouldn't try. We build the **single thing nobody else has** and make
it convincing:

> **The anti-copy-paste capability loop:** Think-First gating → logged AI collaboration →
> solution → AI defense → weighted AI evaluation → capability profile update → mentor sees the
> thinking path.

Everything else is **seeded, stubbed, or static**. The demo's persuasive power is the *depth* of
this one path, not breadth.

### Build vs. fake

| BUILD (real, end-to-end) | FAKE / SEED / SKIP |
|---|---|
| Student 6-screen simulation flow | Real SSO/auth → **mock login + role picker** |
| Think-First gate (AI locked until analysis submitted) | Faculty Simulation Builder → **pre-seed 2–3 simulations** |
| Logged AI discussion (prompts/responses/time) | 10 AI agents → **just evaluator + defense + 1 coach** |
| Solution submission + reflection | Vector DB, RAG → **skip** |
| AI defense questions (generated from *their* answer) | Mobile app → **skip** |
| AI evaluation w/ the 30/20/15/15/10/10 rubric (structured JSON) | Notifications (WhatsApp/SMS) → **skip / mock toast** |
| Capability scoring + level progression | Adaptive difficulty → **simple rule, or skip** |
| Mentor dashboard: students, risk flags, thinking path, AI suggestions | Self-hosted Llama → **hosted Claude now, swap later** |
| 1 light Director analytics screen (seeded) — investor eye-candy | Digital twin → **skip (future phase)** |

---

## 2. Stack (concrete)

- **Backend:** Python + FastAPI, SQLModel/SQLAlchemy, Pydantic.
- **DB:** PostgreSQL (docker-compose locally). Schema = trimmed version of the client's 11 tables.
- **LLM:** hosted **Claude** via an `LLMProvider` interface (one method per AI job) so OpenAI/Llama
  drop in later with zero call-site changes. Use **structured outputs (JSON schema)** for every
  evaluation/scoring call so results are reliable on stage.
- **Frontend:** Next.js + TypeScript + Tailwind + shadcn/ui (fast to build, looks polished).
- **Auth:** mock — seeded users, a role switcher (Student / Mentor / Director). No real OAuth.
- **Deploy:** frontend on Vercel, backend + Postgres on Render/Railway (or one small VPS). Get a
  public demo URL by end of Week 3 so Week 4 is polish, not plumbing.

---

## 3. The 4 AI jobs (the differentiator) — behind one interface

```
LLMProvider:
  generate_simulation(spec)        -> structured simulation (situation, data, characters, rubric…)
  generate_benchmark(simulation)   -> model answer + scoring guide   (cached per simulation)
  generate_defense(submission)     -> 3–4 probing questions tailored to the student's answer
  evaluate(submission, benchmark)  -> {thinking_depth, logic, creativity, practicality,
                                       risk_awareness, reflection} + weighted total + rationale
```
Evaluation weights (from the spec): **30% Thinking Depth · 20% Logic · 15% Creativity ·
15% Practicality · 10% Risk Awareness · 10% Reflection.** Each AI call returns JSON validated
against a schema; retry on mismatch. Pre-test prompts against the seeded simulations so the demo
is reliable.

---

## 4. Week-by-week (solo + Claude Code)

### Week 1 — Foundation + skeleton
- Repo + `CLAUDE.md` (project conventions, so Claude Code stays consistent), docker-compose (FastAPI + Postgres), Next.js app.
- Core data model + migrations: `students, capabilities, student_capability, simulations, attempts, ai_conversations, reflections, evaluations, mentors`.
- `LLMProvider` abstraction wired to Claude; one smoke-test call.
- Seed script: 1 program, ~6 students, 1 mentor, 2–3 hand-authored simulations (e.g. the "ABC Electronics, sales down 20%, 45 min" marketing case).
- Mock login + role switch; route skeletons for all demo screens.
- **Milestone:** log in as a student, see dashboard, open a simulation briefing.

### Week 2 — The student loop (the spine)
- Screen 2 **Think-First gate**: initial-analysis form, min word count, **AI stays locked** until submitted.
- Screen 3 **AI discussion**: chat with the coach; persist every prompt/response/timestamp/iteration.
- Screen 4 **Solution submission**: recommendations, reasoning, plan, risks + reflection questions.
- Server-authoritative timer per attempt.
- **Milestone:** a student completes a simulation end-to-end (no scoring yet); everything is logged.

### Week 3 — The AI brain + scoring
- `generate_benchmark` + `evaluate` (weighted rubric, structured JSON).
- Screen 5 **AI defense**: generate questions from the submission, capture answers, grade.
- Screen 6 **Evaluation**: the score breakdown visual (the money shot).
- Capability score updates + level progression bands.
- **Deploy to public URL.**
- **Milestone:** submit → defense → real AI scores → capability profile updates live.

### Week 4 — Mentor side, polish, demo
- **Mentor dashboard:** assigned students, risk flags; click a student → capability scores, trend graph,
  **the AI thinking path** (their logged prompts — the "we can see how they think" wow), AI-recommended next simulation.
- **Director screen (light):** institution KPIs with seeded data (heat map / averages) — investor eye-candy.
- UI polish pass (consistent shadcn styling, empty/loading states), bug fixes.
- Seed a pristine **demo scenario**; write + rehearse the **demo script** (§5).
- **Milestone:** full path rehearsed on the deployed URL; backup recording made.

---

## 5. The 5-minute demo narrative (what wins the room)
1. "Traditional exams are dead — here's how you measure *thinking*." Open the student dashboard (capability scores, not marks).
2. Start the marketing simulation. **Show AI is locked.** "First, the student must think." Type the initial analysis → AI unlocks. *(This is the hook.)*
3. Collaborate with the AI; point out **every prompt is logged.**
4. Submit a solution. AI **fires defense questions** — "it interrogates their own reasoning."
5. Reveal the **evaluation**: 30% thinking depth, etc. "It scored *how they thought*, not whether they were right."
6. Switch to **Mentor view**: "The mentor sees the entire thinking path and gets an AI intervention suggestion." Show a risk alert.
7. (If built) **Director view**: "Across 4,000 students, in real time." Close.

## 6. Cut-line (if behind — drop in this order)
Director screen → adaptive difficulty → AI-generated simulations (rely on seeded) → defense grading
(show questions, lighter scoring) → reflection scoring. **Never cut:** Think-First gate, logged AI
chat, weighted evaluation, mentor thinking-path. Those four *are* the pitch.

## 7. Using Claude Code well (solo force-multiplier)
- **`CLAUDE.md`** at repo root: stack, conventions, the response/JSON formats, "always validate LLM output against schema," seed-data facts. Keeps generated code consistent.
- **Plan mode** before each big feature; let Claude Code propose the file-level plan, then execute.
- **Subagents** for parallel research/boilerplate (e.g. scaffold FastAPI routers while you design prompts).
- **Tests on the AI layer:** golden-file tests for evaluator JSON shape so prompt tweaks don't silently break the demo.
- **Commit per screen/feature**, deploy early (Week 3) so Week 4 is polish.
- Keep a **`DEMO.md`** with the exact click path + seeded credentials so a rebuild/rehearsal is repeatable.

## 8. Open items to confirm with the client (don't block the PoC)
- 7 difficulty levels vs 5 score bands (the spec conflicts) — PoC uses 5 bands, note it.
- Is hosted-LLM-for-PoC acceptable to them, with Llama 3.3 as the production target? (We architect for the swap.)
- Which single simulation/domain do they most want to see on stage? (Author that one richly.)

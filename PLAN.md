# Prestige PCDC — Development Plan (v0.1, deck + flagged assumptions)

> Built from `REQUIREMENTS.md` (slides 3–10). Items marked 🔶 are **assumptions** to confirm —
> the call's audio was silent and slides 1–2 / 11–20 weren't shown.

---

## 1. Architecture decision: Standalone vs. build on QuikIT

| | **Standalone new app** | **On QuikIT platform** |
|---|---|---|
| Auth / SSO | Build it (NextAuth + OAuth/email) | ✅ Free (QuikIT OAuth, `@quikit/auth`) |
| Multi-tenant (many institutions) | Build it | ✅ Free (`tenantId` everywhere) |
| Billing / licensing | Build it | ✅ Free (platform-handled) |
| Admin/roles/user mgmt | Build it | ✅ Largely free (admin portal) |
| UI kit / theming | Build it | ✅ `@quikit/ui` + CSS-var theming |
| The PCDC engine (challenges, AI eval, rapid-fire, scoring) | **New code** | **New code** (same either way) |
| Coupling / freedom | Full control, no platform constraints | Coupled to QuikIT conventions & release cadence |
| Best when | Selling to non-QuikIT institutions; want independence | Institution is already a QuikIT tenant; vendor standardises on QuikIT |

**Recommendation:** The AI assessment engine is net-new work in both cases — the only thing
QuikIT saves is the "boring" platform layer (auth, tenancy, billing, admin). So:
- If the buyer is/will be a **QuikIT tenant** and MoreYeahs standardises on it → **build on QuikIT** (fastest to MVP).
- If PCDC must sell independently to **any institution** → **standalone**, but copy QuikIT's proven conventions (Next 15 / Prisma / Redis / tenant-scoping).

Either way the engine code below is identical; only the **shell** differs. I've written the plan
shell-agnostic and noted where the choice matters.

---

## 2. Recommended stack 🔶 (mirrors QuikIT defaults — safe baseline)
- **Frontend/Backend:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **DB:** PostgreSQL + Prisma; **Cache/queues:** Redis
- **AI:** Claude (Opus 4.x for evaluation/benchmark answers, Sonnet for rapid-fire question gen / cheaper paths); provider abstraction so model is swappable
- **Realtime (rapid-fire):** WebSocket / SSE
- **Validation:** Zod · **Auth:** QuikIT OAuth *or* NextAuth (per decision above)
- **Proctoring:** browser-based controls for MVP; native lockdown client later for "Lab PC"

---

## 3. Domain model 🔶 (core entities)
- **User** (roles: `student`, `mentor`, `admin`)
- **Challenge** — `type` (simulation | case | leadership | startup), `title`, `brief`, `contextMaterials[]`, `timeLimit`, `capabilityDomains[]`, `difficultyLevel` (1–5)
- **Attempt** — `challengeId`, `studentId`, `startedAt`, `submittedAt`, `timeConsumed`, `status`
- **Submission** — `attemptId`, `solution`, `reasoning`, `aiPromptsUsed[]` (logged prompts)
- **AiBenchmark** — `attemptId`, model-generated reference answer + rubric
- **Evaluation** — `attemptId`, scores vs benchmark, `timeScore`, rationale
- **RapidFireSession** — `attemptId`, `questions[]` (AI-generated), `answers[]`, per-question timing, verdicts on Understanding/OriginalThinking/BusinessJudgment/DecisionLogic
- **CapabilityScore** — `studentId`, `domain`, `level` (1–5), running score, history
- **MentorReport** — `studentId`, generated report + intervention flags

## 4. AI subsystem (the heart of PCDC)
1. **Benchmark generator** — given a challenge, produce a model answer + scoring rubric (run once per challenge, cached).
2. **Evaluator** — compare student submission to benchmark; score per capability domain; factor in `timeConsumed`. Returns structured scores + rationale.
3. **Rapid-fire generator** — read the student's *actual* submission, generate probing questions (the 4 archetypes: rationale, risk, rejected-alternatives, competitor-response) tailored to their answer.
4. **Rapid-fire grader** — score answers for genuine understanding; detect surface/copy-paste.
> Design all four behind a `providerService` with structured (Zod-validated) outputs so models are swappable and testable.

## 5. Secure workspace requirements
- **Paste blocking** in the work editor (clipboard paste disabled) 🔶 *scope: hard requirement from slide 6.*
- **Time-on-task tracking** — server-authoritative timer; track active time, tab-blur events.
- **AI assistant pane** — allowed, but **every prompt is logged** and submitted with the solution.
- **"Own laptop or Lab PC"** — browser app works on both for MVP; true kiosk lockdown (block other apps) needs a native/Electron client — **defer to a later phase** 🔶.

---

## 6. Phased roadmap

**Phase 0 — Spec completion** *(do first)*
Resolve the 🔶 items + open questions in `REQUIREMENTS.md §Open questions`. Recover slides 1–2, 11–20. Decide shell (QuikIT vs standalone). **Deliverable:** signed-off spec.

**Phase 1 — Foundation** (1–2 wks 🔶)
Scaffold, auth, roles, base data model, CI, test harness. **Deliverable:** login + empty dashboards per role.

**Phase 2 — Challenge engine** (1–2 wks)
Authoring UI + delivery + countdown timer + context materials. **Deliverable:** admin creates a challenge, student opens it timed.

**Phase 3 — Secure workspace** (1–2 wks)
Work editor with paste-block, time tracking, AI assistant + prompt logging, submission capture (solution + reasoning + prompts). **Deliverable:** end-to-end submit.

**Phase 4 — AI core** (2–3 wks)
Benchmark generator, evaluator/scorer, rapid-fire generator + interactive round + grader. **Deliverable:** submit → AI questions → AI scores.

**Phase 5 — Scoring & progression** (1–2 wks)
Multi-domain capability scoring, 5-level progression, score history. **Deliverable:** capability profile updates after each attempt.

**Phase 6 — Dashboards** (1–2 wks)
Mentor reports + intervention alerts; student growth tracking. **Deliverable:** mentor report generated per attempt.

**Phase 7 — Hardening**
Anti-cheat depth, native lockdown client (if needed), security review, load test, QA vs spec.

> Timelines are rough 🔶 placeholders pending team size & the Phase-0 spec.

## 7. Top risks
- **AI evaluation fairness/consistency** — needs rubric design + calibration + human spot-checks.
- **Proctoring on personal laptops** — browser paste-block is bypassable; set realistic anti-cheat expectations or invest in a native client.
- **Cost/latency of AI** per attempt (benchmark + eval + N rapid-fire turns) — cache benchmarks, pick model tiers deliberately.
- **Silent-audio gap** — verbal scope from the call is lost; validate assumptions with stakeholders before heavy build.

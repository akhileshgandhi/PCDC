# Functional Requirements Document (FRD)
## Prestige Capability Development Centre (PCDC) — Full Platform

| | |
|---|---|
| **Document** | FRD — PCDC (Staff Portal + Student Portal) |
| **Product** | PCDC / CDOS |
| **Scope** | Both applications — the role-gated **Staff Portal** (Admin + Mentor) and the **Student Portal** — plus the shared **AI Evaluation** and **Level-Progression** engines. |
| **Status** | Draft v3 — supersedes the staff-only FRD. Client decisions folded in (see §10). Remaining open items marked 🔶 |

---

## 1. Introduction

### 1.1 Purpose
Define the complete functional behaviour of the PCDC platform across both portals and the AI/progression engines they share.

### 1.2 Scope
- **In scope:** Staff Portal (Admin + Mentor), Student Portal, the AI-evaluation assessment loop, the level-progression engine, capability scoring, reporting, notifications.
- **Out of scope:** self-hosted Llama / vector DB (hosted LLM used for MVP), mobile app, digital twin, multi-college tenancy, live college-system integration.

### 1.3 Definitions
- **Domain** — a static, pre-defined subject area (e.g. Marketing, Finance, HR). Case studies and students both belong to domains; domains are **not** created by mentors.
- **Admin** — institution superuser; manages domains, mentors, students; sees everything.
- **Mentor (Faculty)** — staff assigned one or more domains; authors case studies, launches them, reviews student work, unlocks students.
- **Student** — pre-provisioned from college data, mapped to a domain; consumes the Student Portal.
- **Case Study** — assessment content authored by a mentor, tagged to one or more domains and a level, containing the scenario the student responds to.
- **Level** — difficulty tier: L1 Beginner → L2 Intermediate → L3 Hard.
- **Attempt** — one full run of the AI evaluation loop for a (student, case study), ending in a final score.
- **AI Evaluation Loop** — paste-blocked answer → AI rapid-fire questions → AI suggestions → optional revise → weighted final score (see §8).

### 1.4 Actors
**Admin**, **Mentor** (Staff Portal); **Student** (Student Portal).

### 1.5 Assumptions 🔶
- A1. Domains are a fixed master list, seeded/maintained by Admin.
- A2. Students and their domain mapping are **imported from college data** (CSV for MVP). No student self-registration or interest-selection — the student's domain is already known.
- A3. Scoring is by **AI evaluation** (not objective questions); the loop in §8 produces the percentage that drives progression.
- A4. A hosted LLM powers the AI engine for the MVP, behind an abstraction so Llama 3.3 can replace it later.

---

## 2. System Overview
Two applications share one backend, database, and the AI/progression engines:
- **Staff Portal** — Admin and Mentor manage domains, mentors, students, case studies, launches, and reporting (role-gated views).
- **Student Portal** — students work case studies through the AI evaluation loop, progress through levels, and track their capability growth.

Students belong to a domain and begin at L1; case studies are authored into domains + levels; a student sees case studies for their domain at their current unlocked level; AI-evaluated performance drives automatic progression L1 → L2 → L3.

---

## 3. Roles & Permissions

| Capability | Admin | Mentor | Student |
|---|---|---|---|
| Manage domain master list | ✅ | ❌ | ❌ |
| Invite/manage mentors, assign domains | ✅ | ❌ | ❌ |
| Import/manage students | ✅ | view (assigned domains) | ❌ |
| Create/edit case studies | ✅ (any domain) | ✅ (assigned domains) | ❌ |
| Launch / set time window | ✅ | ✅ (own case studies) | ❌ |
| View responses & reports | ✅ (all) | ✅ (assigned domains) | own only |
| Give feedback / **unlock** students | ✅ | ✅ (assigned domains) | ❌ |
| Take assessments (AI loop) | ❌ | ❌ | ✅ |
| View own capability profile | ❌ | ❌ | ✅ |
| Cross-domain analytics | ✅ | ❌ | ❌ |
| Org settings | ✅ | ❌ | ❌ |

---

## 4. Staff Portal — Functional Requirements

### FR-1 — Authentication & Invitations
- **FR-1.1** Staff log in with email + password. The first Admin is seeded.
- **FR-1.2** Admin invites a Mentor (name + email) and **assigns one or more domains**. System creates the user as `invited` with an expiring token (🔶 7 days) and emails an accept link.
- **FR-1.3** Invitee opens the link → sets password → becomes `active` (role = Mentor) with assigned domains.
- **FR-1.4** Re-inviting an `invited` user resends the email; an already-active email is rejected.
- **FR-1.5** States: `invited` → `active` → `inactive` (Admin deactivates; inactive users can't log in).

### FR-2 — Domain Management (Admin)
- **FR-2.1** Admin views the static domain master list (name, description, # mentors, # students, # case studies).
- **FR-2.2** Admin can add / edit / archive a domain (🔶 archive preserves history).
- **FR-2.3** Mentors and students reference domains; they cannot create them.

### FR-3 — Mentor Management & Domain Assignment (Admin)
- **FR-3.1** Admin lists all mentors with assigned domains and status.
- **FR-3.2** Admin assigns/edits a mentor's domains (multi-select), at invite or later.
- **FR-3.3** A mentor's authoring & reporting access is restricted to assigned domains.
- **FR-3.4** Admin can deactivate/reactivate a mentor; authored case studies remain.
- **FR-3.5** **Multiple mentors may share a domain**; the system records **authorship** of each case study.

### FR-4 — Student Provisioning (Admin)
- **FR-4.1** Students are **imported via CSV** with name, email, college identifiers, and domain. (Live integration = future.)
- **FR-4.2** On import each student is mapped to their domain and initialised at **L1** with 0 attempts; a **registration email (email + temporary password)** is sent (FR-S1).
- **FR-4.3** **MVP: single domain per student** (multi-domain future). Progression tracked per (student, domain).
- **FR-4.4** Admin can view/search all students; Mentors view students in their assigned domains.

### FR-5 — Case Study Authoring (Mentor / Admin)
- **FR-5.1** Create a case study: title, description, scenario content (situation, background, data, characters, constraints, objective — rich text and/or attachment 🔶), and 🔶 an optional model-answer/rubric note to guide AI evaluation.
- **FR-5.2** Select **one or more domains** (multi-select) — restricted to the mentor's assigned domains (Admin: any).
- **FR-5.3** Select the **level**: Beginner / Intermediate / Hard.
- **FR-5.4** 🔶 Tag the **capabilities** the case study develops (for capability scoring, §9 of student profile).
- **FR-5.5** Saved as **Draft**; not visible to students until launched.
- **FR-5.6** Edit/duplicate/delete drafts; launched case studies can't be deleted (close instead).

### FR-6 — Launch & Time Window (Mentor / Admin)
- **FR-6.1** The mentor sets the **time window at creation/launch** — a **fixed open→close window** and/or a **per-attempt countdown** (timer that starts when the student opens it), the mentor's choice.
- **FR-6.2** On launch, the case study becomes discoverable to eligible students (matching domain + level).
- **FR-6.3** Lifecycle: Draft → Launched (Scheduled/Live) → Closed (auto at end or mentor closes early). No submissions after Closed.

### FR-7 — Reporting & Feedback (Mentor / Admin)
- **FR-7.1** Open a case study → roster of eligible students with status (Not started / In progress / Submitted), latest score, attempt count, outcome.
- **FR-7.2** Individual report: the student's typed answer(s), the **rapid-fire Q&A**, AI suggestions, per-attempt history, scores & the 6-dimension breakdown, time taken, current level/status.
- **FR-7.3** Mentor can add written **feedback** (visible to student) and **unlock** a locked student (reset attempts / clear locked state) — within assigned domains.
- **FR-7.4** Admin sees all reports plus a **cross-domain rollup** (completion %, average scores, pass/fail by domain & level).
- **FR-7.5** 🔶 Export per-assessment results as CSV.

### FR-8 — Staff Dashboards
- **FR-8.1 Admin:** counts (domains, mentors, students, live case studies), recent activity, cross-domain rollup, quick actions.
- **FR-8.2 Mentor:** assigned domains, own case studies (draft/live/closed), students needing review, attention items (closing soon, **locked students** needing unlock).

---

## 5. Student Portal — Functional Requirements

### FR-S1 — Access & Authentication
- **FR-S1.1** On provisioning (FR-4) the student receives a **registration email containing their email and a temporary password**. On first login they enter the temporary password and are required to **set a new password**; thereafter they log in with email + their own password.
- **FR-S1.2** After login the student sees their dashboard, scoped to **their domain** and **current level**.
- **FR-S1.3** A deactivated/blocked student cannot log in.

### FR-S2 — Student Dashboard
- **FR-S2.1** Shows: welcome, **overall capability score**, a snapshot of per-capability scores, **current domain & level**, and a **progress indicator** across L1 → L2 → L3.
- **FR-S2.2** **Tasks / case studies** for their domain at the current level, each with status: Available · In progress · Completed · **Locked**.
- **FR-S2.3** Highlights: recent **mentor feedback**, notifications, assessments **closing soon**.

### FR-S3 — Case Study Discovery
- **FR-S3.1** The student sees case studies **only for their domain**, at their **current unlocked level** (banded — not cumulative 🔶).
- **FR-S3.2** Each card shows title, level, time window/duration, and status. Higher levels appear **locked** until the previous level is passed.
- **FR-S3.3** If the student's level is **Locked** (failed/exhausted), case studies are not startable and a banner shows **"Please contact your mentor."**

### FR-S4 — Taking an Assessment (the AI Evaluation Loop)
*Screen-by-screen; powered by the engine in §8.*
- **FR-S4.1 — Briefing:** the scenario (situation, background, data, characters, constraints, objective) and the time allowed. The student clicks **Start** (begins the per-attempt countdown if set).
- **FR-S4.2 — Answer (think-first, paste-blocked):** the student types their solution + reasoning into the response field. **Copy-paste is disabled.** A timer is visible. On **Submit**, the AI engages (not before).
- **FR-S4.3 — Rapid-fire round:** the AI presents **3–4 probing questions** tailored to the student's answer; the student answers each.
- **FR-S4.4 — Suggestions & second submission:** the AI returns **what is missing / strengths**; the student **revises and submits a second (final) time**. There are **exactly two submissions per attempt** — the initial answer (FR-S4.2) and this one revision. No further resubmissions.
- **FR-S4.5 — Final score:** after the second submission the AI computes the **final score** with the **6-dimension breakdown** — Thinking Depth (30%), Logic (20%), Creativity (15%), Practicality (15%), Risk Awareness (10%), Reflection (10%) — and the outcome (Pass / Retry / Locked) with what happens next (FR-S5).
- **FR-S4.6 — Persistence:** the full attempt (answer(s), rapid-fire Q&A, suggestions, time, score) is saved and visible to the student and to staff reporting.

### FR-S5 — Progression Feedback (student-facing)
- **FR-S5.1 (Pass, ≥75%):** "Passed — Level *N+1* unlocked." Next level's case studies become available. At L3 → **domain completed**.
- **FR-S5.2 (Retry, 33–<75%):** "Not passed — *X* attempts remaining. Review the suggestions and try again." (Best score retained — §8.)
- **FR-S5.3 (<33%):** behaviour per **client decision** (hard-lock or consumes an attempt) — §8 / §10.
- **FR-S5.4 (Locked, 4 attempts exhausted):** the level locks; the student sees **"Please contact your mentor"** and cannot proceed until a mentor unlocks them (FR-7.3).

### FR-S6 — Capability Profile
- **FR-S6.1** Per-capability scores across the taxonomy (Cognitive, Leadership, Entrepreneurial, Professional families 🔶), with a **trend graph** over time.
- **FR-S6.2** Current **level & status per domain**, and history of completed case studies with scores and the 6-dimension breakdowns.
- **FR-S6.3** Framing: the student **competes against themselves** (improvement over time), not against peers (🔶 rankings optional).
- **FR-S6.4** 🔶 Capability-to-score mapping: each case study is tagged with the capabilities it develops; an attempt's result updates those capabilities (running value — method TBC).

### FR-S7 — Feedback & Mentor Communication
- **FR-S7.1** The student views written **mentor feedback** on their attempts.
- **FR-S7.2** Locked state surfaces clear guidance to **contact the mentor**.
- **FR-S7.3** 🔶 (Future) in-app request-help / messaging to the mentor.

### FR-S8 — Student Notifications 🔶
- New case study available, assessment closing soon, **results ready**, mentor feedback posted, **level unlocked**, **locked — contact mentor**. (Email + in-app; WhatsApp/SMS deferred.)

### FR-S9 — Achievements 🔶 (light / optional)
- Badges, milestones, level completion markers. (Rankings optional.)

---

## 6. Cross-Cutting: Anti-Cheat & Integrity
- **CC-1** **Paste blocking** in the answer field (FR-S4.2).
- **CC-2** **Think-first gating** — AI engages only after the student submits their own written answer.
- **CC-3** **Full interaction logging** — typed answers, rapid-fire Q&A, AI suggestions, timestamps, time taken, attempt number (visible to staff).
- **CC-4** **Time monitoring** — server-authoritative timers; 🔶 tab-blur / focus-loss tracking.
- **CC-5** Role/domain authorization enforced **server-side** on every request.

---

## 7. (reserved)

---

## 8. Shared Engine — AI Evaluation Loop
The single attempt flow, shared by FR-S4 (student) and FR-7 (staff reporting):
1. **Input:** student's paste-blocked typed answer (think-first).
2. **Analysis:** AI analyses the answer against the case scenario (🔶 and the mentor's optional model-answer/rubric).
3. **Rapid-fire:** AI generates **3–4 probing questions** from the answer (archetypes: rationale, risks, rejected alternatives, competitor response); captures responses.
4. **Suggestions & second submission:** AI returns what is missing / strengths; the student **revises and submits a final time**. (Exactly **two submissions per attempt**: initial + one revision.)
5. **Scoring:** after the second submission the AI computes the **final score** on the weighted rubric:

| Dimension | Weight |
|---|---|
| Thinking Depth | 30% |
| Logic | 20% |
| Creativity | 15% |
| Practicality | 15% |
| Risk Awareness | 10% |
| Reflection | 10% |

6. **Output:** final % + breakdown + outcome, persisted as an Attempt and fed to the Level-Progression Engine (§9).

> **Implementation note (MVP):** AI calls go through an `LLMProvider` abstraction (hosted model now; Llama 3.3 later) and return **schema-validated structured output** so scores are reliable.

---

## 9. Shared Engine — Level Progression (Business Rules)

> Applies **per student, per domain**, evaluated on every attempt's final score.

- **BR-1 (Pass & auto-advance):** `score ≥ 75%` → level **Passed**, next level unlocks automatically. L3 pass → domain **Completed**.
- **BR-2 (Retry band & cap):** `33% ≤ score < 75%` → not passed; re-attempt up to **4 attempts** total. Standing = **best** score (latest if best-tracking is descoped).
- **BR-3 (Low-score handling):** `score < 33%` → **client decision (deferred)**: hard-lock the level, OR simply consume an attempt. Engine is **configurable**. 🔶
- **BR-4 (Exhaustion):** 4 attempts without ≥75% → level **Failed & locked**.
- **BR-5 (Locked state & unlock):** locked student sees **"Please contact your mentor"** and cannot continue; a **mentor (or Admin) unlocks** (resets attempts / clears lock).
- **BR-6 (Sequential gating):** a level is attemptable only after the previous level is Passed. All students start at **L1**.

### Decision table
| Final score | Outcome | System action |
|---|---|---|
| ≥ 75% | **Pass** | Unlock next level (or complete domain at L3) |
| 33% – <75% | **Retry** | Re-attempt if attempts used < 4 |
| < 33% | **Client decision** 🔶 | Hard-lock OR consume an attempt (configurable) |
| <75% after 4 attempts | **Locked** | "Please contact your mentor"; mentor unlocks |

---

## 10. Data Entities (high level)
- **Domain**: id, name, description, status.
- **User**: id, name, email, role (Admin|Mentor), status, password.
- **UserDomain**: userId, domainId (mentor↔domain).
- **Student**: id, name, email, collegeId, status.
- **StudentDomain**: studentId, domainId, currentLevel, domainStatus (in-progress|completed|locked).
- **CaseStudy**: id, title, content, level, status, createdBy, timeWindow, perAttemptDuration.
- **CaseStudyDomain**: caseStudyId, domainId (multi).
- **CaseStudyCapability**: caseStudyId, capabilityId (multi) 🔶.
- **Capability**: id, name, family.
- **StudentCapability**: studentId, capabilityId, score, updatedAt.
- **Attempt**: id, studentId, caseStudyId, domainId, level, attemptNo, finalScore, dimensionScores(json), outcome, startedAt, submittedAt, timeTaken.
- **AttemptAnswer**: id, attemptId, stage (initial|revised), text.
- **RapidFire**: id, attemptId, question, answer, order.
- **AiSuggestion**: id, attemptId, text.
- **Feedback**: id, attemptId(or studentId+level), mentorId, text, createdAt.
- **Notification**: id, userId/studentId, type, payload, readAt.

---

## 11. Non-Functional Requirements 🔶
- Server-side role/domain authorization on every request.
- All answers, rapid-fire, suggestions, scores auditable & persisted.
- AI outputs schema-validated; provider swappable (hosted → Llama 3.3).
- Reasonable latency for the AI loop; graceful handling of AI timeouts/errors.
- Single-college for MVP (multi-college tenancy = future).

## 12. Out of Scope / Future
Self-hosted Llama & vector DB, mobile app, WhatsApp/SMS, digital twin, AI-agent coaches, multi-domain students, live college-system integration, multi-college tenancy, adaptive difficulty beyond the 3-level ladder.

## 13. Decisions & Open Items

### 13.1 Resolved (v2/v3)
| # | Item | Decision |
|---|---|---|
| 2 | Scoring method | AI evaluation loop (paste-blocked answer → 3–4 rapid-fire → suggestions → optional revise → weighted final score 30/20/15/15/10/10). §8 |
| 3 | After fail / exhaustion | Level locks; student sees "Please contact your mentor"; mentor unlocks. BR-5 |
| 4 | Best vs latest score | Best if feasible, else latest. BR-2 |
| 5 | Student domains | Single domain per student in MVP; multi = future. FR-4.3 |
| 6 | Time window | Mentor sets at creation — fixed window and/or per-attempt countdown. FR-6.1 |
| 7 | Student import | CSV for MVP; live integration future. FR-4.1 |
| 8 | Multiple mentors / domain | Yes; authorship tracked. FR-3.5 |
| 10 | Student auth | Registration email with email + temporary password → first login forces setting a new password. FR-S1.1 |
| 11 | Revise cap | Exactly two submissions per attempt — initial answer + one revision after AI suggestions. FR-S4.4 |

### 13.2 Still open 🔶
| # | Item | Note |
|---|---|---|
| 1 | <33% rule | Client to decide — hard-lock vs consume attempt; engine configurable. BR-3 |
| 9 | Multi-college isolation | Defaulting to single-college MVP; confirm if needed. |
| 12 | Capability mapping | How an attempt's score updates the capability taxonomy. FR-S6.4 |

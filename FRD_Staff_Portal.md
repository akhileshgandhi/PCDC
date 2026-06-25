# Functional Requirements Document (FRD)
## Prestige Capability Development Centre (PCDC) — Staff Portal (Admin + Mentor)

| | |
|---|---|
| **Document** | FRD — Staff Portal (Admin & Mentor) |
| **Product** | PCDC / CDOS |
| **Scope of this FRD** | The single role-gated staff portal (Admin + Mentor) and the shared **Domain / Case-Study / Level-Progression** engine. Student portal is specified separately (already covered in the student-side flowchart). |
| **Status** | Draft v2 — client decisions folded in (see §9). Remaining open items marked 🔶 |

---

## 1. Introduction

### 1.1 Purpose
Define the functional behaviour of the PCDC staff portal: how Admins and Mentors manage domains, mentors, case studies, assessments, level progression, and reporting.

### 1.2 Scope
**In scope:** Admin & Mentor features, domain management, case-study authoring, assessment attempts & scoring, the level-progression engine, reporting, notifications.
**Out of scope (here):** the student portal UI/UX (separately designed), self-hosted Llama / vector DB, mobile app, digital twin.

### 1.3 Definitions
- **Domain** — a **static, pre-defined** subject area (e.g. Marketing, Finance, HR). Case studies and students both belong to domains. Domains are **not** created by mentors.
- **Mentor (Faculty)** — staff member assigned one or more domains; authors case studies and reviews student work in those domains.
- **Admin** — institution superuser; manages domains, mentors, and sees everything.
- **Student** — pre-provisioned from college records, already associated with their interest **domain**. (Consumer of the student portal.)
- **Case Study** — assessment content authored by a mentor, tagged to one or more domains and a **level**, containing a **questionnaire** the student answers.
- **Questionnaire** — the scored question set inside a case study; produces a **percentage score**.
- **Level** — difficulty tier: **L1 Beginner → L2 Intermediate → L3 Hard**.
- **Attempt** — one submission of a level's questionnaire by a student.

### 1.4 Actors
Admin, Mentor. (Student referenced where the shared engine requires it.)

### 1.5 Assumptions 🔶
- A1. Domains are a fixed master list, seeded/maintained by Admin.
- A2. Students and their domain mapping are **imported from college data** — there is **no student self-registration / interest-selection / placement test** in this portal.
- A3. Scoring is by **AI evaluation** (not objective questions). Each attempt runs an AI-guided loop (answer → rapid-fire → suggestions → optional revise → weighted final score) that produces the percentage driving auto-progression. See FR-8.

---

## 2. System Overview
One web application; the view and permissions are gated by role (Admin vs Mentor). Students belong to domains; case studies are authored into domains and levels; students see case studies for **their domain** at **their currently unlocked level**; performance on each level's questionnaire drives automatic progression through L1→L2→L3.

---

## 3. Roles & Permissions

| Capability | Admin | Mentor |
|---|---|---|
| Manage domain master list | ✅ | ❌ |
| Invite/manage mentors, assign domains, deactivate | ✅ | ❌ |
| Import / manage students | ✅ | 🔶 view only |
| Create/edit case studies | ✅ (any domain) | ✅ (only assigned domains) |
| Publish / set time window | ✅ | ✅ (own case studies) |
| View responses & reports | ✅ (all) | ✅ (assigned domains) |
| Give feedback / reset a student's attempts | ✅ | ✅ (assigned domains) |
| Cross-domain analytics | ✅ | ❌ |
| Org settings | ✅ | ❌ |

---

## 4. Functional Requirements

### FR-1 — Authentication & Invitations
- **FR-1.1** Staff log in with email + password. The first Admin is seeded.
- **FR-1.2** Admin invites a Mentor by entering name + email **and selecting one or more domains** to assign (FR-3). System creates the user in `invited` status with an expiring token (🔶 7 days) and emails an accept link.
- **FR-1.3** Invitee opens the link → sets password → status becomes `active`, role = Mentor, with the assigned domains attached.
- **FR-1.4** Re-inviting an `invited` user resends the email; inviting an already-active email is rejected ("already a member").
- **FR-1.5** User states: `invited` → `active` → `inactive` (Admin can deactivate; inactive users cannot log in).

### FR-2 — Domain Management (Admin)
- **FR-2.1** Admin views the static domain master list (name, description, # mentors, # students, # case studies).
- **FR-2.2** Admin can add / edit / archive a domain. 🔶 Archiving hides it from new assignments but preserves history.
- **FR-2.3** Mentors and students reference domains; they cannot create them.

### FR-3 — Mentor Management & Domain Assignment (Admin)
- **FR-3.1** Admin lists all mentors with their assigned domains and status.
- **FR-3.2** Admin assigns/edits a mentor's domains (multi-select) at invite time or later.
- **FR-3.3** A mentor's access (case-study authoring, reporting) is **restricted to their assigned domains**.
- **FR-3.4** Admin can deactivate/reactivate a mentor; case studies they authored remain in the domain.
- **FR-3.5** **Multiple mentors may share the same domain.** The system records **authorship** — which mentor created each case study — so reporting can attribute content and review accordingly.

### FR-4 — Student Provisioning (Admin)
- **FR-4.1** Students are **imported** (🔶 CSV/college-system sync) with: name, email, college identifiers, and their **domain/interest**.
- **FR-4.2** On import, each student is mapped to their domain and initialised at **Level 1 (Beginner)** with 0 attempts.
- **FR-4.3** In the **MVP a student belongs to a single domain**; multi-domain is **future scope**. Progression is tracked per (student, domain).
- **FR-4.4** Admin can view/search students; Mentors can view students **in their assigned domains** only.

### FR-5 — Case Study Authoring (Mentor / Admin)
- **FR-5.1** A mentor creates a case study with: title, description, the case content (rich text and/or attachment 🔶 PDF/doc), and the **questionnaire** (questions, options, correct answers / scoring weights).
- **FR-5.2** The mentor selects **one or more domains** (multi-select) — restricted to the mentor's assigned domains (Admin: any).
- **FR-5.3** The mentor selects the **level**: Beginner / Intermediate / Hard.
- **FR-5.4** Case study is saved as **Draft**; not visible to students until published (FR-6).
- **FR-5.5** Mentor can edit/duplicate/delete drafts; published case studies cannot be deleted (close instead).

### FR-6 — Publishing & Time Window (Mentor / Admin)
- **FR-6.1** The mentor sets the **time window when creating/uploading** the case study. Two controls, the mentor's choice (either or both): a **fixed open→close window** (start/end datetimes) and/or a **per-attempt countdown** (timer that starts when the student opens it).
- **FR-6.2** Once published, the case study becomes discoverable to eligible students (FR-7).
- **FR-6.3** Status lifecycle: Draft → Published (Scheduled/Live) → Closed (auto at end, or mentor closes early). No submissions after Closed.

### FR-7 — Student Discovery (engine behaviour; student UI separate)
- **FR-7.1** A student sees case studies **only for their domain(s)**.
- **FR-7.2** Within a domain, a student sees case studies at their **currently unlocked level** only — by default **Level 1**; higher levels appear only after the previous level is passed (FR-9).
- **FR-7.3** 🔶 Visibility is **banded** (a student sees only their current level), not cumulative.

### FR-8 — Assessment Attempts, AI Evaluation & Scoring *(core)*
The assessment is **AI-evaluated**, not objective. A single **attempt** runs as a guided loop:
- **FR-8.1 (Think-first, paste-blocked):** The student reads the case study and types their answer into the response field. **Copy-paste is disabled** in this field — the student must write their own answer. The AI does **not** engage until the student submits this initial answer.
- **FR-8.2 (AI analysis):** On submit, the AI analyses the student's answer.
- **FR-8.3 (Rapid-fire round):** The AI generates **3–4 rapid-fire questions** tailored to that answer; the student responds to each.
- **FR-8.4 (Suggestions & revise):** From the answer + rapid-fire responses, the AI evaluates and returns **suggestions on what is missing**. The student may **revise and resubmit** their answer in light of the feedback.
- **FR-8.5 (Final score):** The AI computes the **final score** using the specification's weighted model — **30% Thinking Depth · 20% Logic · 15% Creativity · 15% Practicality · 10% Risk Awareness · 10% Reflection** — and presents the breakdown to the student.
- **FR-8.6 (Attempt record):** The full attempt (typed answer(s), rapid-fire Q&A, AI suggestions, time taken, final score) is persisted per (student, domain, level) and feeds the Level Progression Engine (FR-9).
- **FR-8.7 (Attempt vs revise):** The revise/resubmit in FR-8.4 is part of **one** attempt that ends with a final score. The **4-attempt cap (BR-2)** governs **re-taking the level** after a final score below 75% — i.e. running the whole loop again.

### FR-9 — Level Progression Engine *(core)*
Governs movement through L1 → L2 → L3 per domain. See **Business Rules BR-1 to BR-5**. Summary:
- ≥ 75% → **Pass**, auto-unlock next level (L3 pass → domain complete).
- 33%–<75% → **Retry** (consumes an attempt; up to 4).
- < 33% → **Fail** (🔶 hard-fail, level locked for mentor intervention).
- 4 attempts exhausted without ≥75% → **Level Failed** (locked).

### FR-10 — Reporting & Feedback
- **FR-10.1** Mentor opens a case study/level → roster of eligible students with status (Not started / In progress / Submitted), latest score, attempt count, and outcome.
- **FR-10.2** Individual report: full answers, per-attempt history, scores, time taken, current level & status in the domain.
- **FR-10.3** Mentor can add written **feedback** (visible to the student) and can **reset a student's attempts** / override status (e.g. after coaching a failed student) — within assigned domains.
- **FR-10.4** Admin sees all reports plus a **cross-domain rollup** (completion %, average scores, pass/fail counts by domain & level).
- **FR-10.5** 🔶 Export per-assessment results as CSV.

### FR-11 — Notifications 🔶
- Email: mentor invite, case-study published (to eligible students), 🔶 closing-soon reminder.
- In-app notification list for the same events. (WhatsApp/SMS deferred.)

### FR-12 — Dashboards
- **FR-12.1 Admin:** counts (domains, mentors, students, live case studies), recent activity, cross-domain rollup, quick actions.
- **FR-12.2 Mentor:** their assigned domains, their case studies (draft/live/closed), students needing review, attention items (closing soon, failed students needing intervention).

---

## 5. Business Rules — Level Progression Engine

> Applies **per student, per domain**, evaluated on every submitted attempt.

- **BR-1 (Pass & auto-advance):** If `score ≥ 75%`, the level is **Passed**. The next level unlocks automatically. If the passed level is **L3 (Hard)**, the domain is marked **Completed**.
- **BR-2 (Retry band & attempt cap):** If `33% ≤ score < 75%`, the level is **not** passed; the student may **re-attempt**, up to **4 attempts total** for that level. The student's standing reflects their **best** score across attempts (if best-tracking is descoped, the **latest** score is used).
- **BR-3 (Low-score handling):** Behaviour for `score < 33%` is a **client decision (deferred)** — either a **hard fail** that locks the level immediately, or simply **consuming one of the 4 attempts**. The engine is built configurable so the client can choose. 🔶
- **BR-4 (Attempt exhaustion):** If the student completes **4 attempts** without reaching 75%, the level is marked **Failed** and **locked**.
- **BR-5 (Locked state & mentor unlock):** When a level is locked (failed/exhausted), the student sees a warning — **“Please contact your mentor”** — and cannot attempt further. A **mentor (or Admin) unlocks** the student (resets attempts / clears the locked state), re-enabling the level.
- **BR-6 (Sequential gating):** A student can only attempt a level once the previous level is Passed. Everyone begins at **L1 Beginner**.

### Decision table

| Score on an attempt | Outcome | System action |
|---|---|---|
| ≥ 75% | **Pass** | Unlock next level (or complete domain at L3) |
| 33% – <75% | **Retry** | Allow re-attempt if attempts used < 4 |
| < 33% | **Client decision** 🔶 | Hard-lock OR consume an attempt (configurable) |
| <75% after 4 attempts | **Level Failed → locked** | Student sees “Please contact your mentor”; mentor unlocks |

---

## 6. Data Entities (high level)
- **Domain** (static): id, name, description, status.
- **User**: id, name, email, role (Admin|Mentor), status, password.
- **UserDomain**: userId, domainId (mentor↔domain assignment).
- **Student**: id, name, email, collegeId, status (imported).
- **StudentDomain**: studentId, domainId, currentLevel, domainStatus (in-progress/completed/failed).
- **CaseStudy**: id, title, content, createdBy, level, status, timeWindow.
- **CaseStudyDomain**: caseStudyId, domainId (multi-domain).
- **Question**: id, caseStudyId, text, type, options, scoringKey.
- **Attempt**: id, studentId, caseStudyId, domainId, level, attemptNo, score, outcome, startedAt, submittedAt, timeTaken.
- **Answer**: id, attemptId, questionId, response, awardedScore.
- **Feedback**: id, attemptId(or studentId+level), mentorId, text, createdAt.
- **Notification**: id, userId, type, payload, readAt.

---

## 7. Non-Functional (brief) 🔶
- Role-based authorization enforced server-side on every request (domain-scoping for mentors).
- All student answers, attempts, scores auditable/persisted.
- Tenant/college data isolation if multi-college 🔶.

## 8. Out of Scope / Future
Student portal UI (separate), self-hosted Llama & vector DB, mobile app, WhatsApp/SMS, digital twin, AI-agent coaches, adaptive difficulty beyond the 3-level ladder.

## 9. Decisions & Open Items

### 9.1 Resolved (v2)
| # | Item | Decision |
|---|---|---|
| 2 | Scoring method | **AI evaluation** loop: paste-blocked typed answer → AI 3–4 rapid-fire questions → suggestions on what's missing → optional revise/resubmit → weighted final score (30/20/15/15/10/10). See FR-8. |
| 3 | After fail / exhaustion | Level **locks**; student sees **“Please contact your mentor”**; a **mentor unlocks** the student. (BR-5) |
| 4 | Best vs latest score | Use **best** score if feasible; **latest** if best-tracking is descoped. (BR-2) |
| 5 | Student domains | **Single domain per student in MVP**; multi-domain is future scope. (FR-4.3) |
| 6 | Time window | Mentor sets at case-study creation — **fixed window and/or per-attempt countdown**, mentor's choice. (FR-6.1) |
| 7 | Student import | **CSV** for MVP; live college-system integration is future scope. (FR-4.1) |
| 8 | Multiple mentors / domain | **Yes** — shared domains; **authorship** of each case study is tracked. (FR-3.5) |

### 9.2 Still open 🔶
| # | Item | Note |
|---|---|---|
| 1 | **<33% rule** | **Client to decide** — hard-lock vs consume an attempt. Engine built configurable. (BR-3) |
| 9 | **Multi-college isolation** | Not yet raised; **defaulting to single-college for MVP**. Confirm if multi-college tenancy is needed. |

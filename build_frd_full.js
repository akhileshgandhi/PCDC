const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer, LineRuleType
} = require("docx");
const LINE = { line: 276, lineRule: LineRuleType.AUTO };

const NAVY = "1F3864", ACCENT = "2E75B6", ZEBRA = "F2F6FB", GREYTXT = "595959";
const CONTENT_W = 9360;
const clean = (s) => String(s).replace(/🔶/g, "[OPEN]");

function runs(text) {
  text = clean(text);
  const out = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) out.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    else out.push(new TextRun({ text: part }));
  }
  return out.length ? out : [new TextRun(text)];
}
const P = (text, opts = {}) => new Paragraph({ spacing: { after: 140, ...LINE }, children: [new TextRun({ text: clean(text), ...opts.run })], ...opts.par });
const bullet = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 80, ...LINE }, children: runs(t) });
const numItem = (t) => new Paragraph({ numbering: { reference: "num", level: 0 }, spacing: { after: 80, ...LINE }, children: runs(t) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(clean(t))] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(clean(t))] });
const spacer = (after = 140) => new Paragraph({ children: [], spacing: { after } });

const bd = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd };
function cell(content, { width, fill, bold, align, color } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    new Paragraph({ alignment: align || AlignmentType.LEFT, spacing: { line: 264, lineRule: LineRuleType.AUTO, after: 0 },
      children: [new TextRun({ text: clean(c), bold: !!bold, size: 20, color: color || (bold ? "FFFFFF" : "1A1A1A") })] }));
  return new TableCell({ width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER, children: paras });
}
function table(colWidths, headerRow, dataRows) {
  const rows = [new TableRow({ tableHeader: true,
    children: headerRow.map((h, i) => cell(h, { width: colWidths[i], fill: ACCENT, bold: true })) })];
  dataRows.forEach((r, ri) => rows.push(new TableRow({
    children: r.map((c, i) => cell(c, { width: colWidths[i], fill: ri % 2 ? ZEBRA : undefined })) })));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colWidths, borders, rows });
}
function frGroup(title, items) { const o = [H2(title)]; items.forEach((t) => o.push(bullet(t))); return o; }

const body = [];
const pushT = (t) => { body.push(t); body.push(spacer(160)); };

// Title page
body.push(new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Functional Requirements Document", bold: true, size: 52, color: NAVY })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
  children: [new TextRun({ text: "Prestige Capability Development Centre (PCDC)", size: 32, color: ACCENT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 },
  children: [new TextRun({ text: "Full Platform — Staff Portal & Student Portal", size: 26, color: GREYTXT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1300 },
  children: [new TextRun({ text: "Draft v3", size: 24, bold: true })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 },
  children: [new TextRun({ text: "Items marked “[OPEN]” are open decisions to confirm", size: 20, italics: true, color: GREYTXT })] }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// TOC
body.push(new Paragraph({ children: [new TextRun({ text: "Table of Contents", bold: true, size: 28, color: NAVY })], spacing: { after: 160 } }));
body.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// Document control
body.push(H1("Document Control"));
pushT(table([2600, 6760], ["Field", "Detail"], [
  ["Document", "FRD — PCDC (Staff Portal + Student Portal)"],
  ["Product", "PCDC / CDOS"],
  ["Scope", "Both applications — the role-gated Staff Portal (Admin + Mentor) and the Student Portal — plus the shared AI-evaluation and level-progression engines."],
  ["Status", "Draft v3 — supersedes the staff-only FRD. Client decisions folded in (see §13). Remaining open items marked 🔶"],
]));
body.push(spacer());

// 1. Introduction
body.push(H1("1. Introduction"));
body.push(H2("1.1 Purpose"));
body.push(P("Define the complete functional behaviour of the PCDC platform across both portals and the AI/progression engines they share."));
body.push(H2("1.2 Scope"));
body.push(bullet("**In scope:** Staff Portal (Admin + Mentor), Student Portal, the AI-evaluation assessment loop, the level-progression engine, capability scoring, reporting, notifications."));
body.push(bullet("**Out of scope:** self-hosted Llama / vector DB (hosted LLM used for MVP), mobile app, digital twin, multi-college tenancy, live college-system integration."));
body.push(H2("1.3 Definitions"));
[
  "**Domain** — a static, pre-defined subject area. Case studies and students belong to domains; domains are not created by mentors.",
  "**Admin** — institution superuser; manages domains, mentors, students; sees everything.",
  "**Mentor (Faculty)** — staff assigned one or more domains; authors and launches case studies, reviews work, unlocks students.",
  "**Student** — pre-provisioned from college data, mapped to a domain; consumes the Student Portal.",
  "**Case Study** — assessment content authored by a mentor, tagged to domain(s) and a level, with the scenario the student responds to.",
  "**Level** — difficulty tier: L1 Beginner → L2 Intermediate → L3 Hard.",
  "**Attempt** — one full run of the AI evaluation loop for a (student, case study), ending in a final score.",
  "**AI Evaluation Loop** — paste-blocked answer → AI rapid-fire questions → AI suggestions → optional revise → weighted final score (§8).",
].forEach((t) => body.push(bullet(t)));
body.push(H2("1.4 Actors"));
body.push(P("Admin, Mentor (Staff Portal); Student (Student Portal)."));
body.push(H2("1.5 Assumptions 🔶"));
[
  "A1. Domains are a fixed master list, seeded/maintained by Admin.",
  "A2. Students and their domain mapping are imported from college data (CSV for MVP). No student self-registration or interest-selection.",
  "A3. Scoring is by AI evaluation (not objective questions); the loop in §8 produces the percentage that drives progression.",
  "A4. A hosted LLM powers the AI engine for the MVP, behind an abstraction so Llama 3.3 can replace it later.",
].forEach((t) => body.push(bullet(t)));

// 2. System overview
body.push(H1("2. System Overview"));
body.push(P("Two applications share one backend, database, and the AI/progression engines: the Staff Portal (Admin & Mentor management, role-gated) and the Student Portal (students work case studies through the AI evaluation loop and track capability growth)."));
body.push(P("Students belong to a domain and begin at L1; case studies are authored into domains + levels; a student sees case studies for their domain at their current unlocked level; AI-evaluated performance drives automatic progression L1 → L2 → L3."));

// 3. Roles & permissions
body.push(H1("3. Roles & Permissions"));
pushT(table([4360, 1666, 1667, 1667],
  ["Capability", "Admin", "Mentor", "Student"],
  [
    ["Manage domain master list", "Yes", "No", "No"],
    ["Invite/manage mentors, assign domains", "Yes", "No", "No"],
    ["Import/manage students", "Yes", "View (assigned)", "No"],
    ["Create/edit case studies", "Yes (any)", "Yes (assigned)", "No"],
    ["Launch / set time window", "Yes", "Yes (own)", "No"],
    ["View responses & reports", "Yes (all)", "Yes (assigned)", "Own only"],
    ["Give feedback / unlock students", "Yes", "Yes (assigned)", "No"],
    ["Take assessments (AI loop)", "No", "No", "Yes"],
    ["View own capability profile", "No", "No", "Yes"],
    ["Cross-domain analytics / org settings", "Yes", "No", "No"],
  ]
));

// 4. Staff portal FRs
body.push(H1("4. Staff Portal — Functional Requirements"));
[
  ["FR-1 — Authentication & Invitations", [
    "FR-1.1 Staff log in with email + password. The first Admin is seeded.",
    "FR-1.2 Admin invites a Mentor (name + email) and assigns one or more domains. User created as ‘invited’ with an expiring token (🔶 7 days) + accept-link email.",
    "FR-1.3 Invitee opens the link → sets password → becomes ‘active’ (Mentor) with assigned domains.",
    "FR-1.4 Re-inviting an ‘invited’ user resends; an already-active email is rejected.",
    "FR-1.5 States: invited → active → inactive (Admin deactivates).",
  ]],
  ["FR-2 — Domain Management (Admin)", [
    "FR-2.1 Admin views the static domain master list (name, description, # mentors/students/case studies).",
    "FR-2.2 Admin can add / edit / archive a domain (🔶 archive preserves history).",
    "FR-2.3 Mentors and students reference domains; they cannot create them.",
  ]],
  ["FR-3 — Mentor Management & Domain Assignment (Admin)", [
    "FR-3.1 Admin lists mentors with assigned domains and status.",
    "FR-3.2 Admin assigns/edits a mentor’s domains (multi-select).",
    "FR-3.3 A mentor’s authoring & reporting access is restricted to assigned domains.",
    "FR-3.4 Admin can deactivate/reactivate a mentor; authored case studies remain.",
    "FR-3.5 Multiple mentors may share a domain; the system records authorship of each case study.",
  ]],
  ["FR-4 — Student Provisioning (Admin)", [
    "FR-4.1 Students imported via CSV (name, email, college identifiers, domain). Live integration = future.",
    "FR-4.2 On import each student is mapped to their domain, initialised at L1 with 0 attempts; a registration email (email + temporary password) is sent (FR-S1).",
    "FR-4.3 MVP: single domain per student (multi-domain future). Progression tracked per (student, domain).",
    "FR-4.4 Admin views/searches all students; Mentors view students in their assigned domains.",
  ]],
  ["FR-5 — Case Study Authoring (Mentor / Admin)", [
    "FR-5.1 Create: title, description, scenario (situation, background, data, characters, constraints, objective — rich text and/or attachment 🔶), and 🔶 an optional model-answer/rubric note to guide AI evaluation.",
    "FR-5.2 Select one or more domains (multi-select) — restricted to assigned domains (Admin: any).",
    "FR-5.3 Select the level: Beginner / Intermediate / Hard.",
    "FR-5.4 🔶 Tag the capabilities the case study develops (for capability scoring).",
    "FR-5.5 Saved as Draft; not visible to students until launched.",
    "FR-5.6 Edit/duplicate/delete drafts; launched case studies can’t be deleted (close instead).",
  ]],
  ["FR-6 — Launch & Time Window (Mentor / Admin)", [
    "FR-6.1 Mentor sets the time window at creation/launch — a fixed open→close window and/or a per-attempt countdown, the mentor’s choice.",
    "FR-6.2 On launch, the case study becomes discoverable to eligible students (matching domain + level).",
    "FR-6.3 Lifecycle: Draft → Launched (Scheduled/Live) → Closed (auto at end or mentor closes early). No submissions after Closed.",
  ]],
  ["FR-7 — Reporting & Feedback (Mentor / Admin)", [
    "FR-7.1 Open a case study → roster with status (Not started / In progress / Submitted), latest score, attempt count, outcome.",
    "FR-7.2 Individual report: typed answer(s), the rapid-fire Q&A, AI suggestions, per-attempt history, scores + 6-dimension breakdown, time taken, level/status.",
    "FR-7.3 Mentor adds written feedback (visible to student) and unlocks a locked student (reset attempts / clear lock) — within assigned domains.",
    "FR-7.4 Admin sees all reports plus a cross-domain rollup (completion %, average scores, pass/fail by domain & level).",
    "FR-7.5 🔶 Export per-assessment results as CSV.",
  ]],
  ["FR-8 — Staff Dashboards", [
    "FR-8.1 Admin: counts (domains, mentors, students, live case studies), recent activity, cross-domain rollup, quick actions.",
    "FR-8.2 Mentor: assigned domains, own case studies (draft/live/closed), students needing review, attention items (closing soon, locked students needing unlock).",
  ]],
].forEach(([t, items]) => frGroup(t, items).forEach((p) => body.push(p)));

// 5. Student portal FRs
body.push(H1("5. Student Portal — Functional Requirements"));
[
  ["FR-S1 — Access & Authentication", [
    "FR-S1.1 On provisioning the student receives a registration email containing their email and a temporary password. On first login they enter the temporary password and are required to set a new password; thereafter they log in with email + their own password.",
    "FR-S1.2 After login the student sees their dashboard, scoped to their domain and current level.",
    "FR-S1.3 A deactivated/blocked student cannot log in.",
  ]],
  ["FR-S2 — Student Dashboard", [
    "FR-S2.1 Shows welcome, overall capability score, a snapshot of per-capability scores, current domain & level, and a progress indicator across L1 → L2 → L3.",
    "FR-S2.2 Tasks / case studies for their domain at the current level, with status: Available / In progress / Completed / Locked.",
    "FR-S2.3 Highlights: recent mentor feedback, notifications, assessments closing soon.",
  ]],
  ["FR-S3 — Case Study Discovery", [
    "FR-S3.1 The student sees case studies only for their domain, at their current unlocked level (banded, not cumulative 🔶).",
    "FR-S3.2 Each card shows title, level, time window/duration, status. Higher levels appear locked until the previous level is passed.",
    "FR-S3.3 If the student’s level is Locked, case studies are not startable and a banner shows ‘Please contact your mentor.’",
  ]],
  ["FR-S4 — Taking an Assessment (the AI Evaluation Loop)", [
    "FR-S4.1 Briefing: scenario (situation, background, data, characters, constraints, objective) and the time allowed. Student clicks Start (begins per-attempt countdown if set).",
    "FR-S4.2 Answer (think-first, paste-blocked): student types solution + reasoning. Copy-paste disabled. Timer visible. On Submit, the AI engages (not before).",
    "FR-S4.3 Rapid-fire round: AI presents 3–4 probing questions tailored to the answer; student answers each.",
    "FR-S4.4 Suggestions & second submission: AI returns what is missing / strengths; the student revises and submits a second (final) time. Exactly two submissions per attempt — the initial answer (FR-S4.2) and this one revision. No further resubmissions.",
    "FR-S4.5 Final score: after the second submission the AI computes the final score with the 6-dimension breakdown (Thinking Depth 30%, Logic 20%, Creativity 15%, Practicality 15%, Risk Awareness 10%, Reflection 10%) and the outcome with what happens next.",
    "FR-S4.6 Persistence: the full attempt (answer(s), rapid-fire Q&A, suggestions, time, score) is saved and visible to the student and to staff reporting.",
  ]],
  ["FR-S5 — Progression Feedback (student-facing)", [
    "FR-S5.1 Pass (≥75%): ‘Passed — Level N+1 unlocked.’ Next level’s case studies become available. L3 pass → domain completed.",
    "FR-S5.2 Retry (33–<75%): ‘Not passed — X attempts remaining. Review the suggestions and try again.’ (Best score retained.)",
    "FR-S5.3 <33%: behaviour per client decision (hard-lock or consume an attempt).",
    "FR-S5.4 Locked (4 attempts exhausted): level locks; student sees ‘Please contact your mentor’ until a mentor unlocks them.",
  ]],
  ["FR-S6 — Capability Profile", [
    "FR-S6.1 Per-capability scores across the taxonomy (Cognitive, Leadership, Entrepreneurial, Professional families 🔶), with a trend graph over time.",
    "FR-S6.2 Current level & status per domain, and history of completed case studies with scores and the 6-dimension breakdowns.",
    "FR-S6.3 Framing: the student competes against themselves (improvement over time); 🔶 rankings optional.",
    "FR-S6.4 🔶 Capability-to-score mapping: each case study is tagged with the capabilities it develops; an attempt’s result updates those capabilities (method TBC).",
  ]],
  ["FR-S7 — Feedback & Mentor Communication", [
    "FR-S7.1 The student views written mentor feedback on their attempts.",
    "FR-S7.2 Locked state surfaces clear guidance to contact the mentor.",
    "FR-S7.3 🔶 (Future) in-app request-help / messaging to the mentor.",
  ]],
  ["FR-S8 — Student Notifications 🔶", [
    "New case study available, closing soon, results ready, mentor feedback posted, level unlocked, locked — contact mentor. (Email + in-app; WhatsApp/SMS deferred.)",
  ]],
  ["FR-S9 — Achievements 🔶 (light / optional)", [
    "Badges, milestones, level-completion markers. (Rankings optional.)",
  ]],
].forEach(([t, items]) => frGroup(t, items).forEach((p) => body.push(p)));

// 6. Cross-cutting
body.push(H1("6. Cross-Cutting — Anti-Cheat & Integrity"));
[
  "CC-1 Paste blocking in the answer field (FR-S4.2).",
  "CC-2 Think-first gating — AI engages only after the student submits their own written answer.",
  "CC-3 Full interaction logging — typed answers, rapid-fire Q&A, AI suggestions, timestamps, time taken, attempt number (visible to staff).",
  "CC-4 Time monitoring — server-authoritative timers; 🔶 tab-blur / focus-loss tracking.",
  "CC-5 Role/domain authorization enforced server-side on every request.",
].forEach((t) => body.push(bullet(t)));

// 8. AI evaluation engine
body.push(H1("8. Shared Engine — AI Evaluation Loop"));
body.push(P("The single attempt flow, shared by FR-S4 (student) and FR-7 (staff reporting):"));
[
  "1. Input: student’s paste-blocked typed answer (think-first).",
  "2. Analysis: AI analyses the answer against the case scenario (🔶 and the mentor’s optional model-answer/rubric).",
  "3. Rapid-fire: AI generates 3–4 probing questions from the answer (rationale, risks, rejected alternatives, competitor response); captures responses.",
  "4. Suggestions & second submission: AI returns what is missing / strengths; the student revises and submits a final time (exactly two submissions per attempt: initial + one revision).",
  "5. Scoring: after the second submission the AI computes the final score on the weighted rubric (below).",
  "6. Output: final % + breakdown + outcome, persisted as an Attempt and fed to the Level-Progression Engine (§9).",
].forEach((t) => body.push(numItem(t)));
body.push(spacer());
pushT(table([6360, 3000], ["Dimension", "Weight"], [
  ["Thinking Depth", "30%"], ["Logic", "20%"], ["Creativity", "15%"],
  ["Practicality", "15%"], ["Risk Awareness", "10%"], ["Reflection", "10%"],
]));
body.push(P("Implementation note (MVP): AI calls go through an LLMProvider abstraction (hosted model now; Llama 3.3 later) and return schema-validated structured output so scores are reliable.",
  { run: { italics: true, color: GREYTXT } }));

// 9. Level progression
body.push(H1("9. Shared Engine — Level Progression (Business Rules)"));
body.push(P("Applies per student, per domain, evaluated on every attempt’s final score.", { run: { italics: true, color: GREYTXT } }));
[
  "BR-1 (Pass & auto-advance): score ≥ 75% → level Passed, next level unlocks automatically. L3 pass → domain Completed.",
  "BR-2 (Retry band & cap): 33% ≤ score < 75% → not passed; re-attempt up to 4 attempts total. Standing = best score (latest if best-tracking is descoped).",
  "BR-3 (Low-score handling): score < 33% → client decision (deferred): hard-lock the level, OR simply consume an attempt. Engine is configurable. 🔶",
  "BR-4 (Exhaustion): 4 attempts without ≥75% → level Failed & locked.",
  "BR-5 (Locked state & unlock): locked student sees ‘Please contact your mentor’ and cannot continue; a mentor (or Admin) unlocks (resets attempts / clears lock).",
  "BR-6 (Sequential gating): a level is attemptable only after the previous level is Passed. All students start at L1.",
].forEach((t) => body.push(bullet(t)));
body.push(spacer());
body.push(H2("Decision Table"));
pushT(table([3000, 2400, 3960], ["Final score", "Outcome", "System action"], [
  ["≥ 75%", "Pass", "Unlock next level (or complete domain at L3)"],
  ["33% – <75%", "Retry", "Re-attempt if attempts used < 4"],
  ["< 33%", "Client decision 🔶", "Hard-lock OR consume an attempt (configurable)"],
  ["<75% after 4 attempts", "Locked", "‘Please contact your mentor’; mentor unlocks"],
]));

// 10. Data entities
body.push(H1("10. Data Entities (high level)"));
[
  "**Domain**: id, name, description, status.",
  "**User**: id, name, email, role (Admin|Mentor), status, password.",
  "**UserDomain**: userId, domainId.",
  "**Student**: id, name, email, collegeId, status.",
  "**StudentDomain**: studentId, domainId, currentLevel, domainStatus.",
  "**CaseStudy**: id, title, content, level, status, createdBy, timeWindow, perAttemptDuration.",
  "**CaseStudyDomain**: caseStudyId, domainId (multi).",
  "**CaseStudyCapability**: caseStudyId, capabilityId (multi) 🔶.",
  "**Capability**: id, name, family.",
  "**StudentCapability**: studentId, capabilityId, score, updatedAt.",
  "**Attempt**: id, studentId, caseStudyId, domainId, level, attemptNo, finalScore, dimensionScores(json), outcome, startedAt, submittedAt, timeTaken.",
  "**AttemptAnswer**: id, attemptId, stage (initial|revised), text.",
  "**RapidFire**: id, attemptId, question, answer, order.",
  "**AiSuggestion**: id, attemptId, text.",
  "**Feedback**: id, attemptId(or studentId+level), mentorId, text, createdAt.",
  "**Notification**: id, userId/studentId, type, payload, readAt.",
].forEach((t) => body.push(bullet(t)));

// 11. NFR
body.push(H1("11. Non-Functional Requirements 🔶"));
[
  "Server-side role/domain authorization on every request.",
  "All answers, rapid-fire, suggestions, scores auditable & persisted.",
  "AI outputs schema-validated; provider swappable (hosted → Llama 3.3).",
  "Reasonable latency for the AI loop; graceful handling of AI timeouts/errors.",
  "Single-college for MVP (multi-college tenancy = future).",
].forEach((t) => body.push(bullet(t)));

// 12. Out of scope
body.push(H1("12. Out of Scope / Future"));
body.push(P("Self-hosted Llama & vector DB, mobile app, WhatsApp/SMS, digital twin, AI-agent coaches, multi-domain students, live college-system integration, multi-college tenancy, adaptive difficulty beyond the 3-level ladder."));

// 13. Decisions
body.push(H1("13. Decisions & Open Items"));
body.push(H2("13.1 Resolved"));
pushT(table([600, 2400, 6360], ["#", "Item", "Decision"], [
  ["2", "Scoring method", "AI evaluation loop (paste-blocked answer → 3–4 rapid-fire → suggestions → optional revise → weighted final score 30/20/15/15/10/10). §8"],
  ["3", "After fail / exhaustion", "Level locks; student sees ‘Please contact your mentor’; mentor unlocks. BR-5"],
  ["4", "Best vs latest score", "Best if feasible, else latest. BR-2"],
  ["5", "Student domains", "Single domain per student in MVP; multi = future. FR-4.3"],
  ["6", "Time window", "Mentor sets at creation — fixed window and/or per-attempt countdown. FR-6.1"],
  ["7", "Student import", "CSV for MVP; live integration future. FR-4.1"],
  ["8", "Multiple mentors / domain", "Yes; authorship tracked. FR-3.5"],
  ["10", "Student auth", "Registration email with email + temporary password → first login forces setting a new password. FR-S1.1"],
  ["11", "Revise cap", "Exactly two submissions per attempt — initial answer + one revision after AI suggestions. FR-S4.4"],
]));
body.push(spacer());
body.push(H2("13.2 Still Open 🔶"));
pushT(table([600, 2600, 6160], ["#", "Item", "Note"], [
  ["1", "<33% rule", "Client to decide — hard-lock vs consume attempt; engine configurable. BR-3"],
  ["9", "Multi-college isolation", "Defaulting to single-college MVP; confirm if needed."],
  ["12", "Capability mapping", "How an attempt’s score updates the capability taxonomy. FR-S6.4"],
]));

// assemble
const doc = new Document({
  creator: "PCDC", title: "FRD — PCDC Full Platform",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: ACCENT, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 600, hanging: 280 } } } }] },
    { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 600, hanging: 320 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } },
      children: [new TextRun({ text: "PCDC — FRD — Full Platform", color: GREYTXT, size: 16 })] }) ] }) },
    footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREYTXT }),
        new TextRun({ text: " of ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREYTXT })] }) ] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("C:\\Users\\user\\Downloads\\Prestige\\FRD_PCDC.docx", buf);
  console.log("WROTE FRD_PCDC.docx (" + buf.length + " bytes)");
});

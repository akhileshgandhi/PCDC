const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer
} = require("docx");

const NAVY = "1F3864", ACCENT = "2E75B6", HEADhex = "D5E8F0", ZEBRA = "F2F6FB", GREYTXT = "595959";
const CONTENT_W = 9360;

// ---------- helpers ----------
const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text: clean(text), ...opts.run })], ...opts.par });
const bullet = (text) => new Paragraph({ numbering: { reference: "bul", level: 0 }, children: runs(text) });
const numItem = (text) => new Paragraph({ numbering: { reference: "num", level: 0 }, children: runs(text) });

// strip emoji that Arial can't render; keep professional markers
const clean = (s) => String(s).replace(/🔶/g, "[OPEN]");

// supports **bold** segments inside a string
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

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(clean(t))] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(clean(t))] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(clean(t))] });
const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };

function cell(content, { width, fill, bold, align, color } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({ text: clean(c), bold: !!bold, color: color || (bold ? "FFFFFF" : "000000") })],
    })
  );
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: paras,
  });
}

function table(colWidths, headerRow, dataRows) {
  const rows = [];
  rows.push(new TableRow({
    tableHeader: true,
    children: headerRow.map((h, i) => cell(h, { width: colWidths[i], fill: ACCENT, bold: true })),
  }));
  dataRows.forEach((r, ri) => {
    rows.push(new TableRow({
      children: r.map((c, i) => cell(c, { width: colWidths[i], fill: ri % 2 ? ZEBRA : undefined })),
    }));
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colWidths, borders, rows });
}

// ---------- document body ----------
const body = [];

// Title page
body.push(new Paragraph({ spacing: { before: 2600 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Functional Requirements Document", bold: true, size: 52, color: NAVY })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
  children: [new TextRun({ text: "Prestige Capability Development Centre (PCDC)", size: 32, color: ACCENT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 },
  children: [new TextRun({ text: "Staff Portal — Admin & Mentor", size: 28, color: GREYTXT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1400 },
  children: [new TextRun({ text: "Draft v2", size: 24, bold: true })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 },
  children: [new TextRun({ text: "Items marked “[OPEN]” are open decisions to confirm", size: 20, italics: true, color: GREYTXT })] }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// TOC
body.push(new Paragraph({ children: [new TextRun({ text: "Table of Contents", bold: true, size: 28, color: NAVY })], spacing: { after: 160 } }));
body.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// Document control table
body.push(H1("Document Control"));
body.push(table([2600, 6760],
  ["Field", "Detail"],
  [
    ["Document", "FRD — Staff Portal (Admin & Mentor)"],
    ["Product", "PCDC / CDOS"],
    ["Scope", "The single role-gated staff portal (Admin + Mentor) and the shared Domain / Case-Study / Level-Progression engine. The student portal is specified separately."],
    ["Status", "Draft v2 — client decisions folded in (see §9). Remaining open items marked 🔶"],
  ]
));
body.push(spacer());

// 1. Introduction
body.push(H1("1. Introduction"));
body.push(H2("1.1 Purpose"));
body.push(P("Define the functional behaviour of the PCDC staff portal: how Admins and Mentors manage domains, mentors, case studies, assessments, level progression, and reporting."));
body.push(H2("1.2 Scope"));
body.push(bullet("**In scope:** Admin & Mentor features, domain management, case-study authoring, assessment attempts & scoring, the level-progression engine, reporting, notifications."));
body.push(bullet("**Out of scope (here):** the student portal UI/UX (separately designed), self-hosted Llama / vector DB, mobile app, digital twin."));
body.push(H2("1.3 Definitions"));
[
  "**Domain** — a static, pre-defined subject area (e.g. Marketing, Finance, HR). Case studies and students both belong to domains. Domains are not created by mentors.",
  "**Mentor (Faculty)** — staff member assigned one or more domains; authors case studies and reviews student work in those domains.",
  "**Admin** — institution superuser; manages domains, mentors, and sees everything.",
  "**Student** — pre-provisioned from college records, already associated with their interest domain.",
  "**Case Study** — assessment content authored by a mentor, tagged to one or more domains and a level, containing a questionnaire the student answers.",
  "**Questionnaire** — the scored question set inside a case study; produces a percentage score.",
  "**Level** — difficulty tier: L1 Beginner → L2 Intermediate → L3 Hard.",
  "**Attempt** — one submission of a level’s questionnaire by a student.",
].forEach((t) => body.push(bullet(t)));
body.push(H2("1.4 Actors"));
body.push(P("Admin, Mentor. (Student is referenced where the shared engine requires it.)"));
body.push(H2("1.5 Assumptions 🔶"));
[
  "A1. Domains are a fixed master list, seeded/maintained by Admin.",
  "A2. Students and their domain mapping are imported from college data — there is no student self-registration, interest-selection, or placement test in this portal.",
  "A3. Scoring is by AI evaluation (not objective questions). Each attempt runs an AI-guided loop (answer → rapid-fire → suggestions → optional revise → weighted final score) that produces the percentage driving auto-progression. See FR-8.",
].forEach((t) => body.push(bullet(t)));

// 2. System overview
body.push(H1("2. System Overview"));
body.push(P("One web application; the view and permissions are gated by role (Admin vs Mentor). Students belong to domains; case studies are authored into domains and levels; students see case studies for their domain at their currently unlocked level; performance on each level’s questionnaire drives automatic progression through L1 → L2 → L3."));

// 3. Roles & permissions
body.push(H1("3. Roles & Permissions"));
body.push(table([5560, 1900, 1900],
  ["Capability", "Admin", "Mentor"],
  [
    ["Manage domain master list", "Yes", "No"],
    ["Invite / manage mentors, assign domains, deactivate", "Yes", "No"],
    ["Import / manage students", "Yes", "View only 🔶"],
    ["Create / edit case studies", "Yes (any domain)", "Yes (assigned domains)"],
    ["Publish / set time window", "Yes", "Yes (own case studies)"],
    ["View responses & reports", "Yes (all)", "Yes (assigned domains)"],
    ["Give feedback / reset a student’s attempts", "Yes", "Yes (assigned domains)"],
    ["Cross-domain analytics", "Yes", "No"],
    ["Org settings", "Yes", "No"],
  ]
));

// 4. Functional requirements
body.push(H1("4. Functional Requirements"));

const FRs = [
  ["FR-1 — Authentication & Invitations", [
    "FR-1.1 Staff log in with email + password. The first Admin is seeded.",
    "FR-1.2 Admin invites a Mentor by entering name + email and selecting one or more domains to assign. System creates the user in ‘invited’ status with an expiring token (🔶 7 days) and emails an accept link.",
    "FR-1.3 Invitee opens the link → sets password → status becomes ‘active’, role = Mentor, with assigned domains attached.",
    "FR-1.4 Re-inviting an ‘invited’ user resends the email; inviting an already-active email is rejected (‘already a member’).",
    "FR-1.5 User states: invited → active → inactive (Admin can deactivate; inactive users cannot log in).",
  ]],
  ["FR-2 — Domain Management (Admin)", [
    "FR-2.1 Admin views the static domain master list (name, description, # mentors, # students, # case studies).",
    "FR-2.2 Admin can add / edit / archive a domain. 🔶 Archiving hides it from new assignments but preserves history.",
    "FR-2.3 Mentors and students reference domains; they cannot create them.",
  ]],
  ["FR-3 — Mentor Management & Domain Assignment (Admin)", [
    "FR-3.1 Admin lists all mentors with their assigned domains and status.",
    "FR-3.2 Admin assigns/edits a mentor’s domains (multi-select) at invite time or later.",
    "FR-3.3 A mentor’s access (authoring, reporting) is restricted to their assigned domains.",
    "FR-3.4 Admin can deactivate/reactivate a mentor; case studies they authored remain in the domain.",
    "FR-3.5 Multiple mentors may share the same domain. The system records authorship — which mentor created each case study — so reporting can attribute content and review accordingly.",
  ]],
  ["FR-4 — Student Provisioning (Admin)", [
    "FR-4.1 Students are imported (🔶 CSV/college-system sync) with name, email, college identifiers, and their domain/interest.",
    "FR-4.2 On import, each student is mapped to their domain and initialised at Level 1 (Beginner) with 0 attempts.",
    "FR-4.3 In the MVP a student belongs to a single domain; multi-domain is future scope. Progression is tracked per (student, domain).",
    "FR-4.4 Admin can view/search students; Mentors can view students in their assigned domains only.",
  ]],
  ["FR-5 — Case Study Authoring (Mentor / Admin)", [
    "FR-5.1 A mentor creates a case study with title, description, the case content (rich text and/or attachment 🔶 PDF/doc), and the questionnaire (questions, options, correct answers / scoring weights).",
    "FR-5.2 The mentor selects one or more domains (multi-select) — restricted to assigned domains (Admin: any).",
    "FR-5.3 The mentor selects the level: Beginner / Intermediate / Hard.",
    "FR-5.4 Case study is saved as Draft; not visible to students until published.",
    "FR-5.5 Mentor can edit/duplicate/delete drafts; published case studies cannot be deleted (close instead).",
  ]],
  ["FR-6 — Publishing & Time Window (Mentor / Admin)", [
    "FR-6.1 The mentor sets the time window when creating/uploading the case study — a fixed open→close window (start/end) and/or a per-attempt countdown (timer that starts when the student opens it), the mentor’s choice.",
    "FR-6.2 Once published, the case study becomes discoverable to eligible students.",
    "FR-6.3 Status lifecycle: Draft → Published (Scheduled/Live) → Closed (auto at end, or mentor closes early). No submissions after Closed.",
  ]],
  ["FR-7 — Student Discovery (engine behaviour; student UI separate)", [
    "FR-7.1 A student sees case studies only for their domain(s).",
    "FR-7.2 Within a domain, a student sees case studies at their currently unlocked level only — by default Level 1; higher levels appear only after the previous level is passed.",
    "FR-7.3 🔶 Visibility is banded (a student sees only their current level), not cumulative.",
  ]],
  ["FR-8 — Assessment Attempts, AI Evaluation & Scoring (core)", [
    "The assessment is AI-evaluated, not objective. A single attempt runs as a guided loop:",
    "FR-8.1 (Think-first, paste-blocked): The student reads the case study and types their answer into the response field. Copy-paste is disabled in this field — the student must write their own answer. The AI does not engage until the student submits this initial answer.",
    "FR-8.2 (AI analysis): On submit, the AI analyses the student’s answer.",
    "FR-8.3 (Rapid-fire round): The AI generates 3–4 rapid-fire questions tailored to that answer; the student responds to each.",
    "FR-8.4 (Suggestions & revise): From the answer + rapid-fire responses, the AI evaluates and returns suggestions on what is missing. The student may revise and resubmit their answer.",
    "FR-8.5 (Final score): The AI computes the final score using the specification’s weighted model — 30% Thinking Depth, 20% Logic, 15% Creativity, 15% Practicality, 10% Risk Awareness, 10% Reflection — and presents the breakdown to the student.",
    "FR-8.6 (Attempt record): The full attempt (typed answer(s), rapid-fire Q&A, AI suggestions, time taken, final score) is persisted per (student, domain, level) and feeds the Level Progression Engine (FR-9).",
    "FR-8.7 (Attempt vs revise): The revise/resubmit in FR-8.4 is part of one attempt that ends with a final score. The 4-attempt cap (BR-2) governs re-taking the level after a final score below 75% — i.e. running the whole loop again.",
  ]],
  ["FR-9 — Level Progression Engine (core)", [
    "Governs movement through L1 → L2 → L3 per domain. See Business Rules BR-1 to BR-6. Summary: ≥75% → Pass & auto-advance; 33%–<75% → Retry (up to 4 attempts); <33% → client-configurable (hard-lock or consume an attempt); <75% after 4 attempts → Level Failed & locked (student sees “Please contact your mentor”; mentor unlocks).",
  ]],
  ["FR-10 — Reporting & Feedback", [
    "FR-10.1 Mentor opens a case study/level → roster of eligible students with status (Not started / In progress / Submitted), latest score, attempt count, and outcome.",
    "FR-10.2 Individual report: full answers, per-attempt history, scores, time taken, current level & status in the domain.",
    "FR-10.3 Mentor can add written feedback (visible to the student) and can reset a student’s attempts / override status — within assigned domains.",
    "FR-10.4 Admin sees all reports plus a cross-domain rollup (completion %, average scores, pass/fail counts by domain & level).",
    "FR-10.5 🔶 Export per-assessment results as CSV.",
  ]],
  ["FR-11 — Notifications 🔶", [
    "Email: mentor invite, case-study published (to eligible students), 🔶 closing-soon reminder.",
    "In-app notification list for the same events. (WhatsApp/SMS deferred.)",
  ]],
  ["FR-12 — Dashboards", [
    "FR-12.1 Admin: counts (domains, mentors, students, live case studies), recent activity, cross-domain rollup, quick actions.",
    "FR-12.2 Mentor: their assigned domains, their case studies (draft/live/closed), students needing review, attention items (closing soon, failed students needing intervention).",
  ]],
];
FRs.forEach(([title, items]) => {
  body.push(H2(title));
  items.forEach((t) => body.push(bullet(t)));
});

// 5. Business rules
body.push(H1("5. Business Rules — Level Progression Engine"));
body.push(P("Applies per student, per domain, evaluated on every submitted attempt.", { run: { italics: true, color: GREYTXT } }));
[
  "BR-1 (Pass & auto-advance): If score ≥ 75%, the level is Passed. The next level unlocks automatically. If the passed level is L3 (Hard), the domain is marked Completed.",
  "BR-2 (Retry band & attempt cap): If 33% ≤ score < 75%, the level is not passed; the student may re-attempt, up to 4 attempts total for that level. Standing reflects their best score across attempts (latest score used if best-tracking is descoped).",
  "BR-3 (Low-score handling): Behaviour for score < 33% is a client decision (deferred) — either a hard fail that locks the level immediately, or simply consuming one of the 4 attempts. The engine is built configurable so the client can choose. 🔶",
  "BR-4 (Attempt exhaustion): If the student completes 4 attempts without reaching 75%, the level is marked Failed and locked.",
  "BR-5 (Locked state & mentor unlock): When a level is locked, the student sees a warning — “Please contact your mentor” — and cannot attempt further. A mentor (or Admin) unlocks the student (resets attempts / clears the locked state), re-enabling the level.",
  "BR-6 (Sequential gating): A student can only attempt a level once the previous level is Passed. Everyone begins at L1 Beginner.",
].forEach((t) => body.push(bullet(t)));
body.push(spacer());
body.push(H2("Decision Table"));
body.push(table([3400, 2000, 3960],
  ["Score on an attempt", "Outcome", "System action"],
  [
    ["≥ 75%", "Pass", "Unlock next level (or complete domain at L3)"],
    ["33% – <75%", "Retry", "Allow re-attempt if attempts used < 4"],
    ["< 33%", "Client decision 🔶", "Hard-lock OR consume an attempt (configurable)"],
    ["<75% after 4 attempts", "Level Failed → locked", "Student sees “Please contact your mentor”; mentor unlocks"],
  ]
));

// 6. Data entities
body.push(H1("6. Data Entities (high level)"));
[
  "**Domain** (static): id, name, description, status.",
  "**User**: id, name, email, role (Admin|Mentor), status, password.",
  "**UserDomain**: userId, domainId (mentor↔domain assignment).",
  "**Student**: id, name, email, collegeId, status (imported).",
  "**StudentDomain**: studentId, domainId, currentLevel, domainStatus (in-progress/completed/failed).",
  "**CaseStudy**: id, title, content, createdBy, level, status, timeWindow.",
  "**CaseStudyDomain**: caseStudyId, domainId (multi-domain).",
  "**Question**: id, caseStudyId, text, type, options, scoringKey.",
  "**Attempt**: id, studentId, caseStudyId, domainId, level, attemptNo, score, outcome, startedAt, submittedAt, timeTaken.",
  "**Answer**: id, attemptId, questionId, response, awardedScore.",
  "**Feedback**: id, attemptId(or studentId+level), mentorId, text, createdAt.",
  "**Notification**: id, userId, type, payload, readAt.",
].forEach((t) => body.push(bullet(t)));

// 7. Non-functional
body.push(H1("7. Non-Functional Requirements 🔶"));
[
  "Role-based authorization enforced server-side on every request (domain-scoping for mentors).",
  "All student answers, attempts, and scores are auditable and persisted.",
  "College/tenant data isolation if multi-college 🔶.",
].forEach((t) => body.push(bullet(t)));

// 8. Out of scope
body.push(H1("8. Out of Scope / Future"));
body.push(P("Student portal UI (separate), self-hosted Llama & vector DB, mobile app, WhatsApp/SMS, digital twin, AI-agent coaches, and adaptive difficulty beyond the 3-level ladder."));

// 9. Decisions & open items
body.push(H1("9. Decisions & Open Items"));
body.push(H2("9.1 Resolved (v2)"));
body.push(table([600, 2400, 6360],
  ["#", "Item", "Decision"],
  [
    ["2", "Scoring method", "AI evaluation loop: paste-blocked typed answer → AI 3–4 rapid-fire questions → suggestions on what’s missing → optional revise/resubmit → weighted final score (30/20/15/15/10/10). See FR-8."],
    ["3", "After fail / exhaustion", "Level locks; student sees “Please contact your mentor”; a mentor unlocks the student. (BR-5)"],
    ["4", "Best vs latest score", "Use best score if feasible; latest if best-tracking is descoped. (BR-2)"],
    ["5", "Student domains", "Single domain per student in MVP; multi-domain is future scope. (FR-4.3)"],
    ["6", "Time window", "Mentor sets at case-study creation — fixed window and/or per-attempt countdown, mentor’s choice. (FR-6.1)"],
    ["7", "Student import", "CSV for MVP; live college-system integration is future scope. (FR-4.1)"],
    ["8", "Multiple mentors / domain", "Yes — shared domains; authorship of each case study is tracked. (FR-3.5)"],
  ]
));
body.push(spacer());
body.push(H2("9.2 Still Open 🔶"));
body.push(table([600, 2600, 6160],
  ["#", "Item", "Note"],
  [
    ["1", "<33% rule", "Client to decide — hard-lock vs consume an attempt. Engine built configurable. (BR-3)"],
    ["9", "Multi-college isolation", "Not yet raised; defaulting to single-college for MVP. Confirm if multi-college tenancy is needed."],
  ]
));

// ---------- assemble ----------
const doc = new Document({
  creator: "PCDC",
  title: "FRD — PCDC Staff Portal",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: ACCENT, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: "404040", font: "Arial" },
        paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 600, hanging: 280 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 600, hanging: 320 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [ new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } },
      children: [new TextRun({ text: "PCDC — FRD — Staff Portal", color: GREYTXT, size: 16 })] }) ] }) },
    footers: { default: new Footer({ children: [ new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREYTXT }),
        new TextRun({ text: " of ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREYTXT })] }) ] }) },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("C:\\Users\\user\\Downloads\\Prestige\\FRD_Staff_Portal.docx", buf);
  console.log("WROTE FRD_Staff_Portal.docx (" + buf.length + " bytes)");
});

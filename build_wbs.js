const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer, LineRuleType
} = require("docx");

const NAVY = "1F3864", ACCENT = "2E75B6", ZEBRA = "F2F6FB", GREYTXT = "595959", MODBG = "E8EEF7", SIGNBG = "FCE9D6";

const CONTENT_W = 9360;
const LINE = { line: 276, lineRule: LineRuleType.AUTO }; // 1.15 line spacing
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t, o = {}) => new Paragraph({ spacing: { after: 140, ...LINE }, children: [new TextRun({ text: t, ...o.run })], ...o.par });
const bullet = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 80, ...LINE }, children: [new TextRun(t)] });
const spacer = (after = 140) => new Paragraph({ children: [], spacing: { after } });

const bd = { style: BorderStyle.SINGLE, size: 1, color: "C9C9C9" };
const borders = { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd };
function cell(content, { width, fill, bold, align, color, span, header } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    new Paragraph({ alignment: align || AlignmentType.LEFT, spacing: { line: 264, lineRule: LineRuleType.AUTO, after: 0 },
      children: [new TextRun({ text: String(c), bold: !!bold, size: header ? 20 : 20, color: color || (bold ? "FFFFFF" : "1A1A1A") })] }));
  return new TableCell({ width: { size: width, type: WidthType.DXA }, columnSpan: span,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER, children: paras });
}
function table(colWidths, headerRow, dataRows, opts = {}) {
  const rows = [new TableRow({ tableHeader: true,
    children: headerRow.map((h, i) => cell(h, { width: colWidths[i], fill: ACCENT, bold: true, header: true })) })];
  dataRows.forEach((r, ri) => {
    rows.push(new TableRow({ children: r.map((c, i) => cell(c, {
      width: colWidths[i], fill: r._fill || (ri % 2 ? ZEBRA : undefined),
      bold: r._bold || (opts.boldFirst && i === 0) })) }));
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colWidths, borders, rows });
}
function tag(arr, fill, bold) { arr._fill = fill; arr._bold = bold; return arr; }

// ---------------- WBS data ----------------
const modules = [
  { code: "EPIC 0", name: "Designing & Planning", effort: 2, timeline: "Day 1–2",
    outcome: "Approved FRD, wireframes, DB schema & API contract; project plan ready.",
    tasks: [
      { task: "Requirements & flow finalization", subs: [["Finalize FRD, user flows, acceptance criteria", "Plan", 0.5]] },
      { task: "UI/UX design", subs: [["Wireframes for all Admin + Student screens", "FE", 0.75]] },
      { task: "Architecture & data design", subs: [["Database schema & ER design", "DB", 0.25], ["API contract / endpoint design", "BE", 0.25], ["Project plan, repo conventions, AI prompt strategy", "Plan", 0.25]] },
    ] },
  { code: "EPIC 1", name: "Foundation & Setup", effort: 1, timeline: "Day 3",
    outcome: "Running skeleton of backend, frontend and DB; deploy pipeline ready.",
    tasks: [
      { task: "Project scaffolding", subs: [["FastAPI project, config, Docker + Postgres", "BE", 0.25], ["Next.js app, Tailwind, base layout & routing", "FE", 0.25], ["Migrations baseline / ORM setup", "DB", 0.2]] },
      { task: "DevOps", subs: [["Dev/CI environment + backend & DB hosting", "DevOps", 0.15], ["Frontend deploy (public URL)", "DevOps", 0.15]] },
    ] },
  { code: "EPIC 2", name: "Authentication & User Management", effort: 2, timeline: "Day 4–5",
    outcome: "Login works; mentors invited and students bulk-provisioned with temp-password onboarding.",
    tasks: [
      { task: "Auth core", subs: [["Email/password auth, JWT, temp-password → reset", "BE", 0.4], ["User & role tables", "DB", 0.2], ["Login + set-new-password screens (staff & student)", "FE", 0.3]] },
      { task: "Mentor invitation", subs: [["Invite API + email with temp password", "BE", 0.3], ["Admin invite UI + mentor accept flow", "FE", 0.2]] },
      { task: "Student provisioning", subs: [["CSV import + temp-password generation + email", "BE", 0.3], ["Student tables", "DB", 0.1], ["Admin student-import UI", "FE", 0.2]] },
    ] },
  { code: "EPIC 3", name: "Domain Management", effort: 1, timeline: "Day 6",
    outcome: "Admin maintains the static domain master list.",
    tasks: [
      { task: "Domain CRUD", subs: [["Domain table", "DB", 0.1], ["Domain CRUD API (Admin)", "BE", 0.4], ["Domain list + add/edit UI", "FE", 0.5]] },
    ] },
  { code: "EPIC 4", name: "Mentor Management & Domain Assignment", effort: 1, timeline: "Day 7",
    outcome: "Mentors assigned to domains; access scoped to assigned domains.",
    tasks: [
      { task: "Mentor management", subs: [["Mentor list + domain-assignment API", "BE", 0.4], ["UserDomain mapping table", "DB", 0.1], ["Mentor management + assign-domains UI", "FE", 0.4], ["Domain-scoped authorization middleware", "BE", 0.1]] },
    ] },
  { code: "EPIC 5", name: "Case Study Authoring & Launch", effort: 2, timeline: "Day 8–9",
    outcome: "Mentors author case studies (level + domains) and launch them with a time window.",
    tasks: [
      { task: "Authoring", subs: [["CaseStudy + CaseStudyDomain + capability tables", "DB", 0.2], ["Case study CRUD (multi-domain, level, capabilities)", "BE", 0.5], ["Case study builder UI (scenario, level, domains)", "FE", 0.6]] },
      { task: "Launch", subs: [["Publish + time-window + per-attempt-duration logic", "BE", 0.35], ["Launch UI + status lifecycle", "FE", 0.35]] },
    ] },
  { code: "EPIC 6", name: "AI Engine", effort: 3.5, timeline: "Day 10–13",
    outcome: "Full AI evaluation: analysis, rapid-fire questions, suggestions and weighted scoring — reliable & swappable.",
    tasks: [
      { task: "LLM abstraction", subs: [["LLMProvider interface + hosted-model integration", "AI", 0.4]] },
      { task: "Answer analysis", subs: [["Analyze submission prompt + structured output", "AI", 0.5]] },
      { task: "Rapid-fire generation", subs: [["Generate 3–4 probing questions from the answer", "AI", 0.6]] },
      { task: "Suggestions", subs: [["‘What is missing’ suggestion generation", "AI", 0.5]] },
      { task: "Scoring", subs: [["Weighted rubric scoring (30/20/15/15/10/10) + JSON", "AI", 0.7]] },
      { task: "Reliability", subs: [["Schema validation, retries, error/timeout handling", "AI", 0.3], ["Prompt tuning vs seeded cases + golden tests", "AI", 0.5]] },
    ] },
  { code: "EPIC 7", name: "Student Assessment Loop", effort: 2.5, timeline: "Day 13–15",
    outcome: "Student completes a case study end-to-end: briefing → paste-blocked answer → rapid-fire → suggestions → 2nd submission → score.",
    tasks: [
      { task: "Briefing", subs: [["Scenario briefing screen + Start + timer", "FE", 0.25]] },
      { task: "Answer (paste-blocked)", subs: [["Answer editor with paste-block + visible timer", "FE", 0.4], ["Attempt create + answer persist + server timer", "BE", 0.3], ["Attempt / AttemptAnswer tables", "DB", 0.15]] },
      { task: "Rapid-fire round", subs: [["Rapid-fire Q&A screen", "FE", 0.35], ["Wire to AI engine + persist responses", "BE", 0.25], ["RapidFire table", "DB", 0.1]] },
      { task: "Suggestions & 2nd submission", subs: [["Suggestions + revise/resubmit screen", "FE", 0.3], ["Second-submission handling + final-score trigger", "BE", 0.2]] },
      { task: "Final score", subs: [["Score breakdown screen (6 dimensions)", "FE", 0.2]] },
    ] },
  { code: "EPIC 8", name: "Level Progression Engine", effort: 1, timeline: "Day 16",
    outcome: "Auto-advance, retry (max 4), configurable <33% rule, lock + mentor unlock.",
    tasks: [
      { task: "Progression logic", subs: [["Progression rules (pass/retry/lock, configurable <33%)", "BE", 0.4], ["StudentDomain level/status + attempt cap", "DB", 0.15], ["Auto-advance + lock + unlock APIs", "BE", 0.25], ["Progression feedback UI (pass/retry/locked banner)", "FE", 0.2]] },
    ] },
  { code: "EPIC 9", name: "Capability Scoring & Profile", effort: 1, timeline: "Day 17",
    outcome: "Capability scores update from attempts; student sees profile + growth trend.",
    tasks: [
      { task: "Capability scoring", subs: [["Capability + StudentCapability tables", "DB", 0.15], ["Score update from attempts + capability mapping", "BE", 0.35], ["Student capability profile + trend graph", "FE", 0.5]] },
    ] },
  { code: "EPIC 10", name: "Reporting & Feedback", effort: 1.5, timeline: "Day 18–19",
    outcome: "Mentors review answers, rapid-fire, scores & history; give feedback; unlock students; Admin rollup.",
    tasks: [
      { task: "Reporting", subs: [["Roster + individual report APIs", "BE", 0.4], ["Mentor report screens", "FE", 0.45]] },
      { task: "Feedback & unlock", subs: [["Feedback + unlock APIs", "BE", 0.2], ["Feedback + unlock UI", "FE", 0.2]] },
      { task: "Admin rollup", subs: [["Cross-domain rollup API", "BE", 0.15], ["Rollup view", "FE", 0.1]] },
    ] },
  { code: "EPIC 11", name: "Dashboards", effort: 1, timeline: "Day 19–20",
    outcome: "Role-specific dashboards for Admin, Mentor and Student.",
    tasks: [
      { task: "Admin dashboard", subs: [["Stats API", "BE", 0.15], ["Admin dashboard UI", "FE", 0.25]] },
      { task: "Mentor dashboard", subs: [["Mentor dashboard (attention items)", "FE", 0.25]] },
      { task: "Student dashboard", subs: [["Student dashboard (scores, tasks, progress)", "FE", 0.35]] },
    ] },
  { code: "EPIC 12", name: "Notifications", effort: 0.5, timeline: "Day 20",
    outcome: "Email + in-app notifications for invites, launches, results and unlocks.",
    tasks: [
      { task: "Notifications", subs: [["Email triggers + in-app notification API", "BE", 0.3], ["Notification table", "DB", 0.05], ["In-app notification list", "FE", 0.15]] },
    ] },
  { code: "EPIC 13", name: "Internal QA, Polish & Demo Prep", effort: 2, timeline: "Day 21–22",
    outcome: "Internally tested & polished build; demo data and UAT test plan ready.",
    tasks: [
      { task: "Internal QA", subs: [["End-to-end testing across all flows + bug fixing", "QA", 0.8]] },
      { task: "Polish", subs: [["UI polish, empty / loading / error states", "FE", 0.5]] },
      { task: "Prep", subs: [["Seed demo data + UAT test plan", "Plan", 0.4], ["Build hardening", "BE", 0.3]] },
    ] },
  { code: "EPIC 14", name: "UAT & Demo (1-week extension)", effort: 3, timeline: "Day 23–25",
    outcome: "First client demo on UAT, defects fixed, regression passed — UAT SIGN-OFF.",
    tasks: [
      { task: "UAT deployment", subs: [["Provision & deploy to UAT environment", "DevOps", 0.5]] },
      { task: "Demo & acceptance", subs: [["First client demo on UAT", "PM", 0.5], ["UAT sign-off coordination", "PM", 0.3]] },
      { task: "UAT testing & fixes", subs: [["UAT regression testing", "QA", 1.0], ["UAT defect fixes", "Dev", 0.7]] },
    ] },
  { code: "EPIC 15", name: "Production Release & Go-Live (1-week extension)", effort: 2, timeline: "Day 26–27",
    outcome: "Production deployed, go-live regression passed — PRODUCTION GO-LIVE SIGN-OFF.",
    tasks: [
      { task: "Production deployment", subs: [["Provision production environment + deploy", "DevOps", 0.7], ["Go-live cutover + monitoring/alerts setup", "DevOps", 0.4]] },
      { task: "Go-live verification", subs: [["Go-live regression / smoke testing", "QA", 0.6], ["Production go-live sign-off", "PM", 0.3]] },
    ] },
];
const TOTAL = modules.reduce((s, m) => s + m.effort, 0);

// Resourcing
const resourcing = [
  ["Full-Stack Developer (with AI)", "100% — 8 hrs/day", "All Frontend, Backend, Database and AI-engine development; UAT & production defect fixes; deployment support."],
  ["Project Manager (PM)", "40% bandwidth", "Planning & coordination, client communication, weekly sign-offs, UAT facilitation and go-live sign-off."],
  ["QA / Tester", "Weekly sanity + full regression at UAT & Go-Live", "Sanity testing each week during development; regression testing during UAT and at production go-live."],
  ["DevOps Engineer", "30% bandwidth", "CI/CD, environment setup (dev / UAT / production), UAT & production deployment, monitoring."],
];

// Weekly sign-offs (the week layer)
const weeks = [
  ["Week 1", "Day 1–5", "Design & planning, foundation/setup, authentication & user management", "Design & wireframes approved; environments ready; login + onboarding working."],
  ["Week 2", "Day 6–10", "Domains, mentor management, case-study authoring & launch, AI engine begins", "Admin & mentor management + case-study authoring/launch demonstrated."],
  ["Week 3", "Day 11–15", "AI engine completed + student assessment loop", "AI evaluation engine + full student attempt working end-to-end."],
  ["Week 4", "Day 16–20", "Progression, capability scoring, reporting, dashboards, notifications", "Feature-complete build (all modules)."],
  ["Week 5", "Day 21–25", "Internal QA & polish, then UAT deploy, first demo on UAT, fixes & regression", "UAT SIGN-OFF (client acceptance on UAT)."],
  ["Week 6", "Day 26–27", "Production release & go-live regression", "PRODUCTION GO-LIVE SIGN-OFF."],
];

// ---------------- body ----------------
const body = [];
const pushT = (t) => { body.push(t); body.push(spacer(160)); };

body.push(new Paragraph({ spacing: { before: 2300 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Work Breakdown Structure", bold: true, size: 52, color: NAVY })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
  children: [new TextRun({ text: "Prestige Capability Development Centre (PCDC)", size: 32, color: ACCENT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 },
  children: [new TextRun({ text: "Proof of Concept — Staff Portal & Student Portal", size: 26, color: GREYTXT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 },
  children: [new TextRun({ text: "Timeline: 27 working days (≈ 5 weeks)", size: 24, bold: true })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 },
  children: [new TextRun({ text: "22-day build  +  1-week extension for UAT & Production Release", size: 20, italics: true, color: GREYTXT })] }));
body.push(new Paragraph({ children: [new PageBreak()] }));

body.push(new Paragraph({ children: [new TextRun({ text: "Contents", bold: true, size: 28, color: NAVY })], spacing: { after: 160 } }));
body.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// 1. Introduction
body.push(H1("1. Introduction"));
body.push(P("This document presents the scope and Work Breakdown Structure (WBS) for the Proof of Concept (PoC) of the Prestige Capability Development Centre (PCDC) — an AI-powered capability development and assessment platform."));
body.push(P("PCDC replaces traditional answer-based testing with capability evaluation. Students solve real-world case studies using AI as a professional tool; an AI engine then interrogates and scores how they think — not just what they answered — and tracks their growth across difficulty levels. The platform comprises two applications: a role-gated Staff Portal (Admin & Mentor) and a Student Portal, sharing a common AI evaluation and level-progression engine."));
body.push(P("Delivery is planned over 27 working days (≈ 5 weeks): a 22-working-day build followed by a 1-week extension for UAT and Production Release. The first client demo is conducted on the UAT environment, leading to a UAT sign-off and then production go-live. The sections below cover the user types, technology, team/resourcing, the features of each portal (with the end-to-end flow), and a day-estimated WBS broken down by Module → Task → Subtask across Frontend (FE), Backend (BE), Database (DB) and AI work, with weekly sign-offs."));

// 2. User types
body.push(H1("2. User Types"));
pushT(table([1700, 1700, 5960], ["User Type", "Portal", "Description & Key Access"], [
  ["Admin", "Staff Portal", "Institution superuser. Manages the domain master list, invites mentors and assigns domains, bulk-imports students, sees all reports and cross-domain analytics, and manages settings."],
  ["Mentor (Faculty)", "Staff Portal", "Subject expert assigned one or more domains. Authors and launches case studies, reviews student answers and AI scores, gives feedback, and unlocks students — scoped to assigned domains."],
  ["Student", "Student Portal", "Learner pre-mapped to a domain (from college data). Takes AI-evaluated case studies, progresses through levels, and tracks their capability growth."],
]));

// 3. Technology
body.push(H1("3. Technology Stack"));
pushT(table([2200, 2800, 4360], ["Layer", "Technology", "Purpose"], [
  ["Frontend", "Next.js (React) + Tailwind CSS", "Admin and Student web portals."],
  ["Backend", "Python + FastAPI", "APIs, business logic, AI orchestration."],
  ["Database", "PostgreSQL", "Domains, users, case studies, attempts, scores."],
  ["AI / LLM", "Hosted LLM API via provider abstraction (architected for Llama 3.3 in production)", "Answer analysis, rapid-fire questions, suggestions and weighted scoring."],
  ["Authentication", "JWT + email/password (temporary-password onboarding)", "Secure, role-based access."],
  ["Email", "Transactional email service", "Invitations, credentials and notifications."],
  ["Hosting", "Cloud (dev / UAT / production)", "Environments for development, UAT and go-live."],
]));

// 4. Team & resourcing
body.push(H1("4. Team & Resourcing"));
pushT(table([3000, 2500, 3860], ["Role", "Allocation", "Responsibilities"], resourcing));
body.push(P("Note: the developer is the single full-time builder; PM, QA and DevOps contribute at the bandwidths above. QA runs a weekly sanity pass during the build and full regression at UAT and go-live.", { run: { italics: true, color: GREYTXT } }));

// 5. Admin features
body.push(H1("5. Admin / Staff Portal — Features"));
pushT(table([2800, 6560], ["Feature", "Description & Flow"], [
  ["Authentication & Invitations", "Secure login. Admin invites a mentor by email; the mentor receives a temporary password and is forced to set a new password on first login."],
  ["Domain Management", "Admin maintains a static master list of domains (subjects). Domains anchor every case study and every student."],
  ["Mentor Management & Domain Assignment", "Admin invites mentors and assigns each one or more domains. Mentors can only access their assigned domains; multiple mentors may share a domain (authorship of each case study is tracked)."],
  ["Student Provisioning", "Admin bulk-imports students from college data (CSV) with their domain. Each student is initialised at Level 1 and emailed login credentials."],
  ["Case Study Authoring", "Mentors create case studies — scenario (situation, data, constraints, objective), difficulty level (Beginner / Intermediate / Hard) and target domain(s) — saved as a draft."],
  ["Launch & Time Window", "Mentors publish a case study to matching students, setting a fixed open→close window and/or a per-attempt countdown timer."],
  ["Reporting & Feedback", "Mentors view each student's typed answer, the AI rapid-fire Q&A, the score breakdown and attempt history; add written feedback; and unlock students who have exhausted their attempts."],
  ["Dashboards & Analytics", "Admin sees institution-wide counts and cross-domain rollups; mentors see their domains, their case studies and students needing attention."],
]));

// 6. Student features
body.push(H1("6. Student Portal — Features"));
pushT(table([2800, 6560], ["Feature", "Description & Flow"], [
  ["Registration & Login", "Student receives an email with their login and a temporary password, and sets a new password on first login."],
  ["Dashboard", "Shows overall capability score, current domain & level, available case studies, progress across levels, and recent mentor feedback."],
  ["Case Study Discovery", "The student sees case studies for their domain at their current unlocked level. Higher levels stay locked until the previous level is passed."],
  ["AI Assessment Loop", "Read the scenario → type the answer (copy-paste disabled, AI engages only after submitting) → AI asks 3–4 rapid-fire questions → AI returns suggestions on what is missing → the student submits one revision → the AI gives a final score across 6 dimensions (Thinking Depth, Logic, Creativity, Practicality, Risk Awareness, Reflection)."],
  ["Level Progression", "Score ≥ 75% auto-advances to the next level; 33–<75% allows a retry (up to 4 attempts); a locked level prompts the student to contact their mentor."],
  ["Capability Profile", "The student tracks capability scores and growth over time — competing against themselves, not peers."],
  ["Feedback & Notifications", "The student reads mentor feedback and is notified of new case studies, results, level unlocks and locks."],
]));

// 7. End-to-end flow
body.push(H1("7. End-to-End Flow (Summary)"));
[
  "Admin sets up domains and invites mentors (assigning domains); students are bulk-imported with their domain and emailed credentials.",
  "A mentor authors a case study at a chosen level and launches it with a time window.",
  "A matching student opens it, types an answer (paste blocked), and submits — only then does the AI engage.",
  "The AI asks 3–4 rapid-fire questions, returns suggestions, and the student submits one revision.",
  "The AI produces a weighted final score; ≥75% auto-advances, 33–<75% allows retry (max 4), exhaustion locks the level until a mentor unlocks.",
  "Capability scores update; mentors review the full thinking path and intervene where needed.",
].forEach((t) => body.push(bullet(t)));

// 8. WBS
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(H1("8. Work Breakdown Structure"));
body.push(P("Estimates are in working days, summing to 27 (22-day build + 1-week UAT & production release). Layers: FE = Frontend, BE = Backend, DB = Database, AI = AI engine, Plan = design/planning, QA = testing, DevOps = environments/deployment, PM = project management, Dev = developer fixes.", { run: { italics: true, color: GREYTXT } }));

// 8.1 Weekly sign-offs
body.push(H2("8.1 Phased Timeline & Weekly Sign-offs"));
pushT(table([1100, 1300, 3760, 3200], ["Week", "Days", "Focus", "Output / Sign-off"],
  weeks.map((w) => tag([w[0], w[1], w[2], w[3]], SIGNBG, false))));

// 8.2 Module summary
body.push(H2("8.2 Module Timeline Summary"));
const summaryRows = modules.map((m) => [`${m.code} — ${m.name}`, `${m.effort}d`, m.timeline, m.outcome]);
summaryRows.push(tag([`TOTAL`, `${TOTAL}d`, "Day 1–27", "22-day build + 1-week UAT & production release."], MODBG, true));
pushT(table([2700, 800, 1360, 4500], ["Module / Epic", "Effort", "Timeline", "Key Outcome"], summaryRows));

// 8.3 Detailed breakdown
body.push(H2("8.3 Detailed Breakdown"));
modules.forEach((m) => {
  body.push(new Paragraph({ spacing: { before: 160, after: 60 },
    children: [
      new TextRun({ text: `${m.code} — ${m.name}`, bold: true, size: 23, color: NAVY }),
      new TextRun({ text: `   ·   ${m.effort}d   ·   ${m.timeline}`, size: 20, color: GREYTXT }),
    ] }));
  const rows = [];
  m.tasks.forEach((tk) => tk.subs.forEach((s, idx) => rows.push([idx === 0 ? tk.task : "", s[0], s[1], `${s[2]}d`])));
  pushT(table([2300, 4560, 800, 1700], ["Task", "Subtask", "Layer", "Effort"], rows));
});

// 9. Assumptions
body.push(H1("9. Assumptions & Notes"));
[
  "Delivery is 27 working days: a 22-day build (Day 1–22) plus a 1-week extension (Day 23–27) for UAT and production release.",
  "The first client demo is on the UAT environment; UAT sign-off precedes production deployment, which ends in a go-live sign-off.",
  "Effort-day estimates are timeline-aligned and assume the resourcing in §4 (developer full-time; PM 40%; QA weekly sanity + UAT/Live regression; DevOps 30%). Some FE/BE/DB work interleaves within a module.",
  "Scope is a PoC: email/password auth with temp-password onboarding (no SSO); hosted LLM behind an abstraction (Llama 3.3 targeted for production); vector DB, mobile app, WhatsApp/SMS and digital twin are out of scope.",
  "Single college; single domain per student; banded case-study visibility — per the FRD. Open decisions (e.g. behaviour below 33%) are built configurable and do not affect the timeline.",
].forEach((t) => body.push(bullet(t)));

// 10. Open queries
body.push(H1("10. Open Queries (Pending Client Inputs)"));
body.push(P("Living list of items awaiting client confirmation. Resolving these does not block the build (defaults are in place), but they are needed before UAT sign-off and go-live.", { run: { italics: true, color: GREYTXT } }));
const openQueries = [
  ["Behaviour when a student scores below 33% — hard-lock the level immediately, or simply consume one of the 4 attempts?", "FRD BR-3", "Open"],
  ["Single-college only, or is multi-college data isolation required?", "FRD §11", "Open"],
  ["How should an attempt's score map to the capability taxonomy (which capabilities, weighting)?", "FRD FR-S6.4", "Open"],
  ["Confirm hosted LLM for the PoC with Llama 3.3 as the production target — acceptable?", "Technology", "Open"],
  ["Who provides the production environment / hosting, domain name and SSL certificate?", "DevOps / Go-Live", "Open"],
  ["Required format and a sample of the student CSV (fields, college identifiers).", "Student provisioning", "Open"],
  ["Transactional email service and sender domain for invitations, credentials and notifications.", "Notifications", "Open"],
  ["Branding / UI guidelines (logo, colours, fonts) for the portals.", "UI/UX", "Open"],
  ["Number of domains and seeded case studies required for the UAT demo.", "Demo content", "Open"],
  ["Client availability / dates for the UAT demo, UAT sign-off and the go-live window.", "Schedule", "Open"],
  ["Confirm banded case-study visibility (current level only) vs cumulative.", "FRD FR-S3", "Open"],
  ["Confirm scoring standing = best score across attempts (vs latest).", "FRD BR-2", "Open"],
];
pushT(table([460, 5540, 2160, 1200], ["#", "Open Query", "Area / Reference", "Status"],
  openQueries.map((q, i) => [String(i + 1), q[0], q[1], q[2]])));

// assemble
const doc = new Document({
  creator: "PCDC", title: "WBS — PCDC PoC",
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
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } },
      children: [new TextRun({ text: "PCDC — Work Breakdown Structure (PoC)", color: GREYTXT, size: 16 })] }) ] }) },
    footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREYTXT }),
        new TextRun({ text: " of ", size: 16, color: GREYTXT }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREYTXT })] }) ] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("C:\\Users\\user\\Downloads\\Prestige\\WBS_PCDC.docx", buf);
  console.log("WROTE WBS_PCDC.docx (" + buf.length + " bytes); total = " + TOTAL + " days");
});

const fs=require("fs");
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,LevelFormat,HeadingLevel,BorderStyle,WidthType,ShadingType,VerticalAlign,PageNumber,Header,Footer,LineRuleType,TableOfContents,PageBreak}=require("docx");
const NAVY="1F3864",ACC="2E75B6",ZEBRA="F2F6FB",GREY="595959",W=9360;const LN={line:276,lineRule:LineRuleType.AUTO};
const runs=t=>{const o=[];String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).forEach(p=>{if(p.startsWith("**")&&p.endsWith("**"))o.push(new TextRun({text:p.slice(2,-2),bold:true}));else o.push(new TextRun(p));});return o.length?o:[new TextRun(String(t))];};
const P=(t,o={})=>new Paragraph({spacing:{after:140,...LN},children:[new TextRun({text:String(t),...o.run})],...o.par});
const B=t=>new Paragraph({numbering:{reference:"bul",level:0},spacing:{after:80,...LN},children:runs(t)});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(t)]});
const sp=(a=140)=>new Paragraph({children:[],spacing:{after:a}});
const bd={style:BorderStyle.SINGLE,size:1,color:"C9C9C9"};const bds={top:bd,bottom:bd,left:bd,right:bd,insideHorizontal:bd,insideVertical:bd};
function cell(c,{w,fill,bold,color}={}){const ps=(Array.isArray(c)?c:[c]).map(x=>new Paragraph({spacing:{line:258,lineRule:LineRuleType.AUTO,after:0},children:[new TextRun({text:String(x),bold:!!bold,size:19,color:color||(bold?"FFFFFF":"1A1A1A")})]}));return new TableCell({width:{size:w,type:WidthType.DXA},shading:fill?{fill,type:ShadingType.CLEAR}:undefined,margins:{top:70,bottom:70,left:120,right:120},verticalAlign:VerticalAlign.CENTER,children:ps});}
function table(cw,head,rows){const r=[new TableRow({tableHeader:true,children:head.map((h,i)=>cell(h,{w:cw[i],fill:ACC,bold:true}))})];rows.forEach((row,ri)=>r.push(new TableRow({children:row.map((c,i)=>cell(c,{w:cw[i],fill:ri%2?ZEBRA:undefined}))})));return new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,borders:bds,rows:r});}
const body=[];const T=t=>{body.push(t);body.push(sp(150));};

body.push(new Paragraph({spacing:{before:2400},alignment:AlignmentType.CENTER,children:[new TextRun({text:"Development Plan",bold:true,size:50,color:NAVY})]}));
body.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:120},children:[new TextRun({text:"Prestige Capability Development Centre (PCDC)",size:30,color:ACC})]}));
body.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80},children:[new TextRun({text:"Architecture · Phases · Schema  ·  AI stubbed for now",size:24,color:GREY})]}));
body.push(new Paragraph({children:[new PageBreak()]}));
body.push(new Paragraph({children:[new TextRun({text:"Contents",bold:true,size:28,color:NAVY})],spacing:{after:160}}));
body.push(new TableOfContents("Contents",{hyperlink:true,headingStyleRange:"1-1"}));
body.push(new Paragraph({children:[new PageBreak()]}));

body.push(H1("1. Technology Stack"));
T(table([2200,3400,3760],["Layer","Choice","Why"],[
["Frontend","Next.js 15 + TypeScript + Tailwind + shadcn/ui","Proper component library, routing, role layouts"],
["Data / state","TanStack Query + Zustand; react-hook-form + zod","Caching, optimistic updates, forms"],
["Backend","Python + FastAPI","Async, typed, Pydantic v2"],
["ORM / migrations","SQLAlchemy 2.0 + Alembic","Versioned schema"],
["Database","PostgreSQL (SQLite for local dev)","Relational, mandated"],
["Auth","JWT (access+refresh), temp-password, role guard","Admin / Mentor / Student"],
["AI","LLMProvider interface — static stub now","Swap real model later, no API/UI change"],
["Files / Email","S3-compatible / transactional email","Uploads + invites"],
["Hosting","Frontend → Vercel; Backend + DB → Render/Railway","Matches current setup"],
]));

body.push(H1("2. Architecture (3 tiers)"));
[ "Client — one Next.js app, role-gated into Admin / Mentor / Student portals.",
  "API — FastAPI; modules: Auth & Users, Master data & Scoring config, Case studies & Launch, Assessments, Scoring & Progression engine, Reporting/Analytics, Notifications, AI orchestration.",
  "Data & services — PostgreSQL, file storage, email, and the AI engine (static stub).",
  "All AI behind one LLMProvider — the assessment flow and scoring math run end-to-end without a real model.",
].forEach(t=>body.push(B(t)));

body.push(H1("3. Database Tables (core)"));
T(table([2300,4060,3000],["Table","Key columns","Purpose"],[
["users","id, full_name, email, password_hash, role, status, must_reset_pw, college_id","All accounts"],
["subjects","id, name, status","Master subjects"],
["mentor_subjects","mentor_id, subject_id","Mentor ↔ subject (M:N)"],
["student_subjects","student_id, subject_id, current_level (1–5), status","Mapping + progression"],
["capabilities","id, family, name","Capability framework"],
["scoring_parameters","id, name, weight, capability_id?, active","Dynamic scheme (total 100)"],
["case_studies","id, title, content, file_url?, difficulty (1–5), created_by, status, launch_mode, reading_minutes, attempt_minutes, disqualify_below_pct, opens_at, closes_at","Case-study bank"],
["case_study_subjects / _capabilities / _bloom","case_study_id + tag","Multi-mapping"],
["questions","id, case_study_id, text, order","Faculty questions"],
["case_study_assignees","case_study_id, student_id?","Assignment (null = all in subject)"],
["attempts","id, case_study_id, student_id, attempt_no, times, completion_pct, total_score (0–100), status, outcome","One run"],
["attempt_answers","id, attempt_id, question_id, stage, answer_text","Think-first + revised"],
["rapid_fire","id, attempt_id, question, answer, order","AI Q&A (stub)"],
["ai_suggestions","id, attempt_id, text","'What's missing' (stub)"],
["attempt_scores","id, attempt_id, parameter_id, score, weight","Per-parameter weighted /100"],
["capability_scores","id, student_id, capability_id, score, updated_at","Running profile (graphs)"],
["feedback / notifications / ai_interaction_log","—","Remarks · alerts · audit log"],
]));

body.push(H1("4. Backend API (by module)"));
[ "Auth: login, set-password, refresh, logout",
  "Users: mentors CRUD + invite; students import (CSV) + invite; list",
  "Master data: subjects CRUD; capabilities; scoring-parameters (get/put)",
  "Case studies: CRUD; launch; questions",
  "Campaigns / Reporting: campaigns; responses; attempt scorecard",
  "Assessment: start; answer; rapid-fire; submit",
  "Scoring / Progression (internal): weighted /100, completion %, outcome, level advance",
  "AI (stub): generate_rapid_fire / suggestions / score → canned",
  "Analytics: student capabilities; trend; overview",
].forEach(t=>body.push(B(t)));
body.push(P("Standard {success, data/error} responses; every route role-guarded.",{run:{italics:true,color:GREY}}));

body.push(H1("5. Frontend (properly built)"));
[ "One Next.js app; (admin) (mentor) (student) route groups; shared role-aware layout.",
  "Tailwind theme tokens (blue/white) + shadcn/ui; reusable: DataTable, StatCard, Stepper, FormField, ChipSelect, Badge, ScoreBar, Timer.",
  "JWT in httpOnly cookie; route middleware by role.",
  "Screens built from the finalized designs (difficulty 1–5, /100 weighted scorecards, reading+attempt reverse timer, dynamic scoring settings).",
].forEach(t=>body.push(B(t)));

body.push(H1("6. AI = static stub"));
body.push(P("LLMProvider interface: generate_rapid_fire(), suggestions(), score(). A StubProvider returns canned rapid-fire questions, canned suggestions and a deterministic score, so the full flow plus the real scoring math (weighted /100, completion %, pass/retry/lock, level advance) work end-to-end. Real Llama/Gemini swaps in as one class change."));

body.push(H1("7. Phases"));
T(table([2200,4760,2400],["Phase","Build","Outcome"],[
["0 · Setup & architecture","Repos, CI, FastAPI+Postgres+Alembic, Next.js+shadcn, theme, JWT skeleton","Stack running, login shell"],
["1 · Auth & users","Login, temp-password, roles; invite mentors; student CSV import","Onboarding works"],
["2 · Master data","Subjects, Capabilities, dynamic Scoring Parameters","Platform configurable"],
["3 · Case studies","Authoring, 4-param mapping, questions, reading+attempt times, launch modes, disqualify threshold, launch/assign","Mentor publishes"],
["4 · Assessment loop","Briefing → reading lock → paste-blocked answer → rapid-fire (stub) → suggestions (stub) → revise → submit","Student completes attempt"],
["5 · Scoring & progression","Weighted /100, completion %, pass/retry/lock, levels 1–5, disqualification","Real marks + auto-advance"],
["6 · Reporting & analytics","Campaigns → responses → scorecards; capability profiles; strength/weakness + progress graphs","Insight"],
["7 · Notifications & dashboards","Email + in-app; role dashboards","Full feature set"],
["8 · Integration → UAT → Go-live","E2E tests, polish, UAT deploy, fixes, production","Live (28 July)"],
]));
body.push(P("Real AI-provider integration is a later, separate phase — the stub keeps everything shippable.",{run:{italics:true,color:GREY}}));

body.push(H1("8. Build order — Admin panel first"));
body.push(P("The admin panel is the entry point for all data (subjects, capabilities, scoring config, mentors, students) that the Mentor and Student portals depend on. Sequence within the admin panel:"));
[ "Backend foundation (FastAPI + DB models + auth)",
  "Admin auth + login / set-password",
  "Master data (Subjects, Capabilities, Scoring Parameters)",
  "Mentor management + invite",
  "Student provisioning (CSV + invite)",
  "Campaigns view (read) + Admin dashboard",
].forEach((t,i)=>body.push(new Paragraph({numbering:{reference:"num",level:0},spacing:{after:80,...LN},children:[new TextRun(t)]})));

const doc=new Document({creator:"PCDC",title:"PCDC Development Plan",
 styles:{default:{document:{run:{font:"Arial",size:22}}},paragraphStyles:[
  {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{size:29,bold:true,color:NAVY,font:"Arial"},paragraph:{spacing:{before:280,after:140},outlineLevel:0}}]},
 numbering:{config:[
  {reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:600,hanging:280}}}}]},
  {reference:"num",levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:600,hanging:320}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
  headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:ACC,space:4}},children:[new TextRun({text:"PCDC — Development Plan",color:GREY,size:16})]})]})},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Page ",size:16,color:GREY}),new TextRun({children:[PageNumber.CURRENT],size:16,color:GREY}),new TextRun({text:" of ",size:16,color:GREY}),new TextRun({children:[PageNumber.TOTAL_PAGES],size:16,color:GREY})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("C:\\Users\\user\\Downloads\\Prestige\\DEV_PLAN.docx",b);console.log("WROTE DEV_PLAN.docx ("+b.length+" bytes)");});

const fs = require("fs"), path = require("path");
const OUT = "C:\\Users\\user\\Downloads\\Prestige\\final";
fs.mkdirSync(OUT, { recursive: true });
const w = (f, h) => fs.writeFileSync(path.join(OUT, f), h);

/* ---------- clean & spacious design system ---------- */
const CSS = `
:root{
  --blue:#2563eb;--blue-d:#1d4ed8;--blue-50:#f2f7ff;--blue-100:#e4eefe;--blue-200:#cfe0fc;
  --ink:#0f172a;--slate:#64748b;--muted:#9aa6b8;--line:#edf1f7;--line-2:#f4f7fb;
  --bg:#f7f9fd;--white:#fff;--green:#15a34a;--green-bg:#e9f9ef;--amber:#b45309;--amber-bg:#fef3c7;--red:#dc2626;--red-bg:#fdecec;
  --r:16px;--r-sm:11px;--shadow:0 1px 2px rgba(16,24,40,.04),0 12px 28px -12px rgba(37,99,235,.10);
}
*{box-sizing:border-box;}
body{margin:0;font-family:'Segoe UI',Inter,Roboto,-apple-system,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--ink);font-size:14.5px;line-height:1.6;-webkit-font-smoothing:antialiased;}
a{color:inherit;text-decoration:none;}
/* topbar */
.topbar{height:68px;background:var(--white);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:18px;padding:0 26px;position:sticky;top:0;z-index:40;}
.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:17px;}
.brand .logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--blue),var(--blue-d));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;}
.brand small{display:block;font-weight:500;font-size:11px;color:var(--muted);margin-top:-2px;}
.switcher{margin-left:10px;display:flex;background:var(--blue-50);border-radius:12px;padding:5px;gap:3px;}
.switcher a{padding:8px 16px;border-radius:9px;font-weight:600;font-size:13px;color:var(--slate);display:flex;align-items:center;gap:7px;}
.switcher a .dot{width:7px;height:7px;border-radius:50%;background:var(--muted);}
.switcher a.active{background:var(--white);color:var(--blue-d);box-shadow:0 1px 4px rgba(16,24,40,.08);}
.switcher a.active .dot{background:var(--blue);}
.topbar .sp{flex:1;}
.bell{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--slate);border:1px solid var(--line);}
.chip-user{display:flex;align-items:center;gap:11px;}
.av{width:40px;height:40px;border-radius:50%;background:var(--blue-100);color:var(--blue-d);display:flex;align-items:center;justify-content:center;font-weight:700;}
.chip-user .w{font-size:12px;}.chip-user .w b{display:block;font-size:13.5px;}.chip-user .w span{color:var(--muted);}
/* shell */
.shell{display:flex;min-height:calc(100vh - 68px);}
.side{width:252px;background:var(--white);border-right:1px solid var(--line);padding:22px 16px;}
.side .lab{font-size:11px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:700;margin:4px 12px 14px;}
.side a{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:12px;color:var(--slate);font-weight:600;font-size:14px;margin-bottom:4px;}
.side a .i{width:20px;text-align:center;}
.side a:hover{background:var(--blue-50);color:var(--blue-d);}
.side a.active{background:var(--blue);color:#fff;box-shadow:var(--shadow);}
.main{flex:1;padding:34px 40px;max-width:1100px;}
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:26px;}
.head h1{font-size:26px;margin:0;letter-spacing:-.3px;}
.head p{margin:6px 0 0;color:var(--slate);}
.crumb{display:inline-block;color:var(--blue-d);font-weight:600;font-size:13px;margin-bottom:12px;}
/* cards */
.grid{display:grid;gap:20px;}.g3{grid-template-columns:repeat(3,1fr);}.g2{grid-template-columns:repeat(2,1fr);}
.card{background:var(--white);border:1px solid var(--line);border-radius:var(--r);padding:24px;box-shadow:var(--shadow);}
.card h3{margin:0 0 18px;font-size:16px;}
.tile .t{color:var(--slate);font-size:13.5px;font-weight:600;}
.tile .n{font-size:34px;font-weight:800;margin-top:12px;letter-spacing:-1px;}
.tile .s{color:var(--muted);font-size:12.5px;margin-top:4px;}
.tile .ic{width:42px;height:42px;border-radius:12px;background:var(--blue-50);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;float:right;}
/* buttons */
.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:12px 20px;font-weight:700;font-size:14px;cursor:pointer;}
.btn-pri{background:var(--blue);color:#fff;box-shadow:0 4px 14px -4px rgba(37,99,235,.5);}.btn-pri:hover{background:var(--blue-d);}
.btn-gh{background:var(--white);color:var(--blue-d);border:1px solid var(--blue-200);}.btn-gh:hover{background:var(--blue-50);}
.btn-sm{padding:9px 14px;font-size:13px;border-radius:10px;}
/* list */
.row{display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid var(--line-2);}
.row:last-child{border-bottom:0;}
.row .ic{width:40px;height:40px;border-radius:11px;background:var(--blue-50);color:var(--blue);display:flex;align-items:center;justify-content:center;flex:none;}
.row .gr{flex:1;}.row .gr b{font-size:14px;}.row .gr small{color:var(--muted);display:block;}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:5px 12px;border-radius:30px;}
.c-green{background:var(--green-bg);color:var(--green);}.c-amber{background:var(--amber-bg);color:var(--amber);}.c-red{background:var(--red-bg);color:var(--red);}.c-blue{background:var(--blue-100);color:var(--blue-d);}.c-slate{background:#eef2f7;color:var(--slate);}
.lv{font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;background:var(--blue-50);color:var(--blue);}
/* table */
table{width:100%;border-collapse:collapse;}
th{text-align:left;font-size:11.5px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 14px 14px;}
td{padding:16px 14px;border-top:1px solid var(--line-2);font-size:14px;}
tbody tr:hover{background:var(--blue-50);}
.u{display:flex;align-items:center;gap:12px;}.u .a{width:36px;height:36px;border-radius:50%;background:var(--blue-100);color:var(--blue-d);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;}
/* form */
.field{margin-bottom:20px;}
.field label{display:block;font-size:13px;font-weight:700;color:var(--slate);margin-bottom:8px;}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:13px 15px;font-size:14.5px;font-family:inherit;outline:none;background:var(--white);}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-50);}
.field .hint{font-size:12px;color:var(--muted);margin-top:7px;}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;}
.chips{display:flex;flex-wrap:wrap;gap:9px;}
.sel{padding:9px 15px;border-radius:30px;border:1px solid var(--blue-200);background:#fff;color:var(--blue-d);font-size:13px;font-weight:600;cursor:pointer;}
.sel.on{background:var(--blue);color:#fff;border-color:var(--blue);}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.seg button{border:0;background:#fff;padding:11px 18px;font-weight:600;font-size:13.5px;color:var(--slate);cursor:pointer;}
.seg button.on{background:var(--blue);color:#fff;}
.drop{border:2px dashed var(--blue-200);border-radius:14px;padding:34px;text-align:center;color:var(--slate);background:var(--blue-50);}
.note{background:var(--blue-50);border:1px solid var(--blue-100);color:var(--blue-d);border-radius:12px;padding:13px 16px;font-size:13px;font-weight:600;}
.capgroup{margin-bottom:16px;}.capgroup .gh{font-size:11.5px;letter-spacing:.4px;text-transform:uppercase;font-weight:700;color:var(--blue-d);margin-bottom:9px;}
/* wizard */
.wiz{display:flex;gap:10px;margin-bottom:26px;}
.wiz .s{flex:1;display:flex;align-items:center;gap:11px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid var(--line);color:var(--slate);font-weight:700;font-size:13.5px;cursor:pointer;}
.wiz .s .n{width:26px;height:26px;border-radius:50%;background:var(--blue-50);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:13px;}
.wiz .s.active{border-color:var(--blue);background:var(--blue-50);color:var(--blue-d);}
.wiz .s.active .n{background:var(--blue);color:#fff;}
.wiz .s.done .n{background:var(--green);color:#fff;}
.step{display:none;}.step.on{display:block;animation:f .25s ease;}
@keyframes f{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
textarea.big{min-height:180px;resize:vertical;}
/* hero / score */
.hero{background:linear-gradient(120deg,var(--blue-d),var(--blue));color:#fff;border-radius:20px;padding:30px 32px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;box-shadow:0 16px 40px -16px rgba(37,99,235,.6);}
.hero h2{margin:0 0 6px;font-size:24px;}.hero p{margin:0;opacity:.92;}
.ring{text-align:center;}.ring .n{font-size:46px;font-weight:800;line-height:1;}.ring .l{opacity:.85;font-size:12.5px;}
.track{display:flex;align-items:center;}
.track .st{flex:1;text-align:center;}
.track .b{width:38px;height:38px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-weight:700;background:var(--blue-50);color:var(--blue);border:2px solid var(--blue-200);}
.track .st.done .b{background:var(--green);color:#fff;border-color:var(--green);}
.track .st.cur .b{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 0 0 5px var(--blue-50);}
.track .st.lock .b{background:#fff;color:var(--muted);border-style:dashed;}
.track .st .l{font-size:12.5px;color:var(--slate);font-weight:600;}
.track .ln{height:3px;width:46px;background:var(--blue-100);}
.markbig{display:flex;align-items:baseline;gap:8px;}.markbig .v{font-size:52px;font-weight:800;line-height:1;}.markbig .d{font-size:22px;color:var(--muted);font-weight:700;}
.mrow{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--line-2);}.mrow:last-child{border-bottom:0;}.mrow b{font-weight:700;}
.barrow{display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.barrow .nm{width:140px;font-size:13.5px;color:var(--slate);font-weight:600;}
.bar{flex:1;height:9px;background:var(--blue-50);border-radius:8px;overflow:hidden;}.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--blue-d));}
.barrow .vl{width:34px;text-align:right;font-weight:700;}
.qbox{background:var(--blue-50);border:1px solid var(--blue-100);border-radius:14px;padding:18px;margin-bottom:14px;}
.qbox .q{font-weight:700;color:var(--blue-d);margin-bottom:10px;}
.qbox input{width:100%;border:1px solid var(--line);border-radius:11px;padding:12px 14px;font-size:14px;outline:none;}
.bubble{display:flex;gap:13px;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:13px;padding:16px;margin-bottom:12px;}
.bubble .a{width:32px;height:32px;border-radius:9px;background:var(--blue);color:#fff;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;}
.paste{font-size:12.5px;color:var(--amber);background:var(--amber-bg);padding:8px 12px;border-radius:10px;display:inline-flex;gap:8px;margin-top:12px;}
.muted{color:var(--muted);}.mt{margin-top:22px;}.flex{display:flex;gap:14px;}.bt{justify-content:space-between;align-items:center;}.right{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
/* gallery */
.gal{min-height:100vh;padding:50px;max-width:1000px;margin:0 auto;}
.gal h1{font-size:30px;margin:0 0 4px;}.gal .sub{color:var(--slate);margin:0 0 30px;}
.gcards{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
.gcards a{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:24px;box-shadow:var(--shadow);}
.gcards a:hover{border-color:var(--blue-200);transform:translateY(-2px);transition:.15s;}
.gcards .tag{font-size:11.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;}
.gcards b{font-size:17px;display:block;margin:6px 0 4px;}.gcards span{color:var(--muted);font-size:13px;}
@media(max-width:900px){.g3,.g2,.fg,.gcards{grid-template-columns:1fr;}.side{display:none;}.wiz{flex-direction:column;}}
`;
w("styles.css", CSS.trim());

/* ---------- shell ---------- */
const USER = { admin:["Anita Desai","Administrator","AD"], mentor:["Dr. Sanjeev Patni","Faculty · Marketing","SP"], student:["Sanjay Kumar","Student · Marketing","SK"] };
const NAV = {
  admin:[["Dashboard","▤","admin-dashboard.html"],["Campaigns","◆","admin-campaigns.html"],["Mentors","◑","admin-mentors.html"],["Students","◍","admin-students.html"],["Settings","⚙","admin-settings.html"]],
  mentor:[["Dashboard","▤","mentor-dashboard.html"],["Case Studies","◆","mentor-cases.html"],["Students","◍","mentor-students.html"]],
  student:[["Home","▤","student-home.html"],["My Tasks","◆","student-tasks.html"],["My Progress","◍","student-progress.html"]]
};
const LAB = { admin:"Admin", mentor:"Faculty", student:"Student" };
function side(role, active){
  return `<div class="lab">${LAB[role]} Portal</div>`+NAV[role].map(n=>`<a href="${n[2]}" class="${n[0]===active?'active':''}"><span class="i">${n[1]}</span>${n[0]}</a>`).join("");
}
function top(role){
  const sw=["admin","mentor","student"].map(r=>`<a href="${r==='admin'?'admin-dashboard.html':r==='mentor'?'mentor-dashboard.html':'student-home.html'}" class="${r===role?'active':''}"><span class="dot"></span>${r[0].toUpperCase()+r.slice(1)}</a>`).join("");
  const u=USER[role];
  return `<div class="topbar"><div class="brand"><span class="logo">PC</span><div>PCDC<small>Capability Development Centre</small></div></div><div class="switcher">${sw}</div><div class="sp"></div><div class="bell">◔</div><div class="chip-user"><div class="av">${u[2]}</div><div class="w"><b>${u[0]}</b><span>${u[1]}</span></div></div></div>`;
}
function pg(role, active, title, sub, actions, content, script=""){
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — ${title}</title><link rel="stylesheet" href="styles.css"></head><body>${top(role)}<div class="shell"><aside class="side">${side(role,active)}</aside><main class="main"><div class="head"><div><h1>${title}</h1><p>${sub}</p></div>${actions||""}</div>${content}</main></div><script>${script}</script></body></html>`;
}
const bars=(r)=>r.map(x=>`<div class="barrow"><div class="nm">${x[0]}</div><div class="bar"><i style="width:${x[1]}%"></i></div><div class="vl">${x[1]}</div></div>`).join("");
const CAPS={"Cognitive":["Analytical Thinking","Strategic Thinking","Decision Making"],"Leadership":["Communication","Influence","Negotiation","Conflict Resolution","Team Management"],"Entrepreneurial":["Opportunity Recognition","Innovation","Business Model Thinking","Risk Assessment","Resourcefulness"],"Professional":["Professional Judgment","Business Acumen","Execution Orientation","Learning Agility","Adaptability"]};
const capChips=(on=[])=>Object.entries(CAPS).map(([g,l])=>`<div class="capgroup"><div class="gh">${g} Capabilities</div><div class="chips">${l.map(c=>`<span class="sel ${on.includes(c)?'on':''}">${c}</span>`).join("")}</div></div>`).join("");
const SUB=["Finance","Marketing","HR","Operations"],BLOOM=["Remember","Understand","Apply","Analyse","Evaluate","Create"];
const mark=(t,n)=> t==='r'?`<span class="chip c-red">Rejected</span>`: t==='i'?`<span class="chip c-amber">${n} / 100 · Incomplete</span>`:`<span class="chip c-green">${n} / 100 · Completed</span>`;
const pscore=(r)=>r.map(x=>`<div class="barrow"><div class="nm">${x[0]} <span class="muted">(wt ${x[1]})</span></div><div class="bar"><i style="width:${Math.round(x[2]/x[1]*100)}%"></i></div><div class="vl">${x[2]}/${x[1]}</div></div>`).join("");
const SCORE_PARAMS=[["Analytical Thinking",30,25],["Strategic Thinking",30,24],["Decision Making",40,33]]; // mapped capabilities, weighted /100 (dynamic)

/* ---------- gallery index ---------- */
w("index.html",`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — Final Designs</title><link rel="stylesheet" href="styles.css"></head><body><div class="gal"><h1>PCDC — Final Designs <span style="font-size:14px;color:var(--blue);background:var(--blue-50);padding:5px 12px;border-radius:30px;vertical-align:middle">v1 · hero screens</span></h1><p class="sub">Clean &amp; spacious direction · simplified navigation · full screen set. Use the top-bar switcher and sidebar to move around, or jump to any screen below.</p><div class="gcards">
<a href="login.html"><span class="tag">Auth</span><b>Login &amp; Set Password</b><span>Temporary-password onboarding.</span></a>
<a href="admin-dashboard.html"><span class="tag">Admin</span><b>Dashboard</b><span>Key stats + recent campaigns.</span></a>
<a href="admin-campaigns.html"><span class="tag">Admin</span><b>Campaigns → detail → scorecard</b><span>Faculty/subject filter, responses, marks.</span></a>
<a href="admin-mentors.html"><span class="tag">Admin</span><b>Mentors &amp; invite</b><span>Department, experience, subjects.</span></a>
<a href="admin-students.html"><span class="tag">Admin</span><b>Students &amp; invite / import</b><span>Single invite + bulk CSV.</span></a>
<a href="admin-settings.html"><span class="tag">Admin</span><b>Settings</b><span>Subjects · Capabilities · Marks Scheme.</span></a>
<a href="mentor-dashboard.html"><span class="tag">Faculty</span><b>Dashboard</b><span>Scoped to assigned subjects.</span></a>
<a href="mentor-case-create.html"><span class="tag">Faculty</span><b>Create Case Study (wizard)</b><span>Content → Mapping &amp; questions → Assign.</span></a>
<a href="mentor-cases.html"><span class="tag">Faculty</span><b>Case Studies → responses</b><span>List, responses, scorecard.</span></a>
<a href="mentor-scorecard.html"><span class="tag">Faculty</span><b>Scorecard</b><span>Mark /10, Q&amp;A + Rapid-Fire, assign another task.</span></a>
<a href="student-home.html"><span class="tag">Student</span><b>Home</b><span>Score, progress, assigned tasks.</span></a>
<a href="student-tasks.html"><span class="tag">Student</span><b>My Tasks</b><span>Assigned case studies + time brackets.</span></a>
<a href="student-assessment.html"><span class="tag">Student</span><b>Assessment loop</b><span>Briefing → answer → rapid-fire → suggestions → marks.</span></a>
<a href="student-progress.html"><span class="tag">Student</span><b>My Progress</b><span>Capabilities, mark trend, recent marks.</span></a>
</div></div></body></html>`);

/* ---------- ADMIN DASHBOARD ---------- */
w("admin-dashboard.html", pg("admin","Dashboard","Good morning, Anita","Here's what's happening across PCDC today.",
`<a class="btn btn-pri" href="index.html">+ New campaign</a>`,
`<div class="grid g3"><div class="card tile"><span class="ic">◍</span><div class="t">Students</div><div class="n">320</div><div class="s">across 4 subjects</div></div>
<div class="card tile"><span class="ic">◑</span><div class="t">Faculty</div><div class="n">14</div><div class="s">2 invitations pending</div></div>
<div class="card tile"><span class="ic">◆</span><div class="t">Live campaigns</div><div class="n">12</div><div class="s">running now</div></div></div>
<div class="card mt"><div class="bt flex" style="margin-bottom:6px"><h3 style="margin:0">Recent campaigns</h3><a class="chip c-blue" href="index.html">View all</a></div>
<div class="row"><span class="ic">◆</span><div class="gr"><b>Market Entry Crisis</b><small>Dr. S. Patni · Marketing · 17–19 Jun</small></div><span class="chip c-blue">23 / 32 done</span></div>
<div class="row"><span class="ic">◆</span><div class="gr"><b>Brand Revival</b><small>Dr. S. Patni · Marketing · 15–18 Jun</small></div><span class="chip c-blue">40 / 52 done</span></div>
<div class="row"><span class="ic">◆</span><div class="gr"><b>Cost Optimisation</b><small>R. Khan · Operations · 16–20 Jun</small></div><span class="chip c-blue">8 / 18 done</span></div></div>`));

/* ---------- MENTOR CREATE CASE STUDY (wizard) ---------- */
w("mentor-case-create.html", pg("mentor","Case Studies","Create case study","Three quick steps — content, mapping, and assignment.","",
`<a class="crumb" href="index.html">← Case studies</a>
<div class="wiz"><div class="s active" data-s="0"><span class="n">1</span>Content</div><div class="s" data-s="1"><span class="n">2</span>Mapping &amp; questions</div><div class="s" data-s="2"><span class="n">3</span>Assign</div></div>
<div class="step on" data-s="0"><div class="card"><div class="field"><label>Title</label><input placeholder="e.g. Market Entry Crisis"></div>
<div class="field"><label>Case content</label><div class="seg" style="margin-bottom:14px"><button class="on" onclick="cs('t')">✎ Type</button><button onclick="cs('u')">⭳ Upload file</button></div>
<div id="t"><textarea class="field big" style="margin:0" placeholder="Situation, background, data, characters, constraints, objective…"></textarea></div>
<div id="u" style="display:none"><div class="drop"><div style="font-size:26px">⭳</div><b>Drop a file</b> or click to browse<div class="hint" style="margin-top:6px">PDF · DOCX · TXT</div></div></div></div>
<div class="right"><button class="btn btn-pri" onclick="go(1)">Next: Mapping →</button></div></div></div>
<div class="step" data-s="1"><div class="card"><div class="field"><label>Capabilities <span class="muted">(one or more)</span></label>${capChips(["Strategic Thinking","Decision Making"])}</div>
<div class="fg"><div class="field"><label>Subject <span class="muted">(one or more)</span></label><div class="chips">${SUB.map((s,i)=>`<span class="sel ${i===1?'on':''}">${s}</span>`).join("")}</div></div>
<div class="field"><label>Difficulty (1–5)</label><div class="seg"><button>1</button><button class="on">2</button><button>3</button><button>4</button><button>5</button></div></div></div>
<div class="field"><label>Bloom's Taxonomy <span class="muted">(one or more)</span></label><div class="chips">${BLOOM.map((b,i)=>`<span class="sel ${i>1&&i<4?'on':''}">${b}</span>`).join("")}</div></div>
<div class="field"><label>Questions</label><div class="qbox"><div class="q">Question 1</div><input value="Diagnose the cause of the sales decline and recommend a recovery strategy."></div><div class="qbox"><div class="q">Question 2</div><input value="What risks does your strategy carry and how would you mitigate them?"></div><button class="btn btn-gh btn-sm">+ Add question</button></div>
<div class="field"><label>Launch mode</label><div class="seg"><button class="on">Fixed exam duration</button><button>Open time window</button></div></div>
<div class="fg"><div class="field"><label>Reading time (minutes)</label><input value="5"><div class="hint">Student reads the case; answering is locked until this ends (they can start early).</div></div><div class="field"><label>Attempt time (minutes)</label><input value="45"><div class="hint">Shown as a reverse countdown timer.</div></div></div>
<div class="fg"><div class="field"><label>Disqualify if completion below</label><input value="70%"><div class="hint">Mentor-configurable threshold.</div></div></div>
<div class="note">⚡ Rapid-Fire questions are generated by AI from each student's answers.</div>
<div class="right"><button class="btn btn-gh" onclick="go(0)">← Back</button><button class="btn btn-pri" onclick="go(2)">Next: Assign →</button></div></div></div>
<div class="step" data-s="2"><div class="card"><div class="field"><label>Assign to students</label><div class="chips"><span class="sel on">All students in subject</span><span class="sel">Select students…</span></div></div>
<div class="fg"><div class="field"><label>Available from</label><input type="date" value="2026-06-17"></div><div class="field"><label>Available to</label><input type="date" value="2026-06-19"></div></div>
<div class="right"><button class="btn btn-gh" onclick="go(1)">← Back</button><a class="btn btn-gh" href="index.html">Save draft</a><a class="btn btn-pri" href="index.html">Assign &amp; publish</a></div></div></div>`,
`function go(n){document.querySelectorAll('.wiz .s').forEach(s=>{const i=+s.dataset.s;s.classList.toggle('active',i===n);s.classList.toggle('done',i<n);});document.querySelectorAll('.step').forEach(s=>s.classList.toggle('on',+s.dataset.s===n));window.scrollTo({top:0,behavior:'smooth'});}function cs(m){document.getElementById('t').style.display=m==='t'?'block':'none';document.getElementById('u').style.display=m==='u'?'block':'none';}document.querySelectorAll('.wiz .s').forEach(s=>s.onclick=()=>go(+s.dataset.s));`));

/* ---------- STUDENT HOME ---------- */
w("student-home.html", pg("student","Home","Welcome back, Sanjay","Marketing · Level 2. Keep building your capabilities.","",
`<div class="hero"><div><h2>Capability Score 72</h2><p>You're in the top third of your cohort — nice momentum.</p></div><div class="ring"><div class="n">72</div><div class="l">out of 100</div></div></div>
<div class="card mt"><h3>Your progress</h3><div class="track"><div class="st done"><div class="b">✓</div><div class="l">Level 1</div></div><div class="ln"></div><div class="st cur"><div class="b">2</div><div class="l">Level 2</div></div><div class="ln"></div><div class="st lock"><div class="b">🔒</div><div class="l">Level 3</div></div><div class="ln"></div><div class="st lock"><div class="b">🔒</div><div class="l">Level 4</div></div><div class="ln"></div><div class="st lock"><div class="b">🔒</div><div class="l">Level 5</div></div></div></div>
<div class="grid g2 mt"><div class="card"><h3>My tasks</h3>
<div class="row"><span class="ic">◆</span><div class="gr"><b>Market Entry Crisis</b><small>Assigned · 17–19 Jun · 5 min read + 45 min</small></div><a class="btn btn-pri btn-sm" href="student-assessment.html">Start</a></div>
<div class="row"><span class="ic" style="background:var(--green-bg);color:var(--green)">✓</span><div class="gr"><b>Brand Revival</b><small>Completed</small></div><span class="chip c-green">82 / 100</span></div></div>
<div class="card"><h3>Your capabilities</h3>${bars([["Problem Solving",80],["Communication",74],["Strategic Thinking",68],["Decision Making",71]])}</div></div>`));

/* ---------- STUDENT ASSESSMENT ---------- */
w("student-assessment.html", pg("student","My Tasks","Market Entry Crisis","Marketing · Level 2 · ⏳ 44:32 remaining (reverse timer)","",
`<div class="wiz"><div class="s active" data-s="0"><span class="n">1</span>Briefing</div><div class="s" data-s="1"><span class="n">2</span>Your answer</div><div class="s" data-s="2"><span class="n">3</span>Rapid-fire</div><div class="s" data-s="3"><span class="n">4</span>Suggestions</div><div class="s" data-s="4"><span class="n">5</span>Result</div></div>
<div class="step on" data-s="0"><div class="card"><h3>Scenario</h3><p><b>Role:</b> Marketing Head, ABC Electronics &nbsp;·&nbsp; <b>Reading:</b> 5 min &nbsp;·&nbsp; <b>Attempt:</b> 45 min</p><p><b>Situation:</b> Sales dropped 20% over two quarters; a new competitor entered with aggressive pricing.</p><p><b>Objective:</b> Recommend a recovery strategy with reasoning, risks and a plan.</p><div class="note">⏱ Reading time (5 min) — answering is locked until it ends, or click "I'm ready" to start early. The attempt then runs on a 45-min reverse countdown.</div><div class="right"><button class="btn btn-pri" onclick="go(1)">I'm ready — start attempt →</button></div></div></div>
<div class="step" data-s="1"><div class="card"><h3>Your answer</h3><p class="muted" style="margin-top:-8px">Write in your own words — the AI engages only after you submit.</p><textarea class="field big" style="margin:0" placeholder="Your solution and reasoning…"></textarea><div class="paste">⛔ Copy-paste is disabled</div><div class="right"><button class="btn btn-pri" onclick="go(2)">Submit →</button></div></div></div>
<div class="step" data-s="2"><div class="card"><h3>Rapid-fire round</h3><div class="qbox"><div class="q">Why did you choose this strategy over alternatives?</div><input placeholder="Your answer…"></div><div class="qbox"><div class="q">What are the biggest risks in your approach?</div><input placeholder="Your answer…"></div><div class="qbox"><div class="q">How would the competitor respond?</div><input placeholder="Your answer…"></div><div class="right"><button class="btn btn-pri" onclick="go(3)">Submit →</button></div></div></div>
<div class="step" data-s="3"><div class="card"><h3>AI suggestions</h3><div class="bubble"><div class="a">AI</div><div><b>Strengths</b><br><span class="muted">Clear positioning and a practical plan.</span></div></div><div class="bubble"><div class="a">AI</div><div><b>What's missing</b><br><span class="muted">Add a margin analysis and a fallback if the competitor matches your move.</span></div></div><p class="muted">Revise once — this is your final submission.</p><textarea class="field big" style="margin:0;min-height:120px" placeholder="Revise your answer…"></textarea><div class="right"><button class="btn btn-pri" onclick="go(4)">Submit final →</button></div></div></div>
<div class="step" data-s="4"><div class="grid g2"><div class="card"><h3>Your result</h3><div class="markbig"><span class="v">82</span><span class="d">/ 100</span></div><span class="chip c-green" style="margin-top:10px">Completed · Passed (≥ 75)</span><div class="mt"><div class="mrow"><span>Rapid-fire</span><b>2 / 3</b></div></div><p class="muted mt" style="font-size:13px">Scored across this case study's mapped capability parameters (weighted, out of 100).</p><div class="right"><a class="btn btn-pri" href="student-home.html">Back to home</a></div></div><div class="card"><h3>Parameter breakdown <span class="muted" style="font-weight:400">· /100, weighted</span></h3>${pscore(SCORE_PARAMS)}<div class="bubble" style="margin-top:14px"><div class="a">AI</div><div><b>Review remark</b><br><span class="muted">Strong strategy and reasoning; quantify the margin impact to lift Decision Making.</span></div></div></div></div></div>`,
`function go(n){document.querySelectorAll('.wiz .s').forEach(s=>{const i=+s.dataset.s;s.classList.toggle('active',i===n);s.classList.toggle('done',i<n);});document.querySelectorAll('.step').forEach(s=>s.classList.toggle('on',+s.dataset.s===n));window.scrollTo({top:0,behavior:'smooth'});}document.querySelectorAll('.wiz .s').forEach(s=>s.onclick=()=>go(+s.dataset.s));`));

/* ---------- SCORECARD ---------- */
w("mentor-scorecard.html", pg("mentor","Students","Sanjay Kumar — Scorecard","Market Entry Crisis · Marketing · L2 · 17–19 Jun",
`<a class="btn btn-gh" href="index.html">+ Assign another task</a>`,
`<a class="crumb" href="index.html">← Responses</a>
<div class="grid g2"><div class="card"><h3>Marks <span class="muted" style="font-weight:400">· /100, weighted parameters</span></h3><div class="markbig"><span class="v">82</span><span class="d">/ 100</span></div><span class="chip c-green" style="margin-top:10px">Completed · Passed (≥ 75)</span>
<div class="mt">${pscore(SCORE_PARAMS)}<div class="mrow"><span>Rapid-fire</span><b>2 / 3</b></div></div>
<h3 style="margin:22px 0 12px">Feedback to student</h3><textarea class="field big" style="margin:0;min-height:90px">Strong analysis — quantify the margin impact next time.</textarea><div class="right"><button class="btn btn-gh btn-sm">Save</button></div></div>
<div class="card"><h3>Submitted answer</h3><p class="muted">"Segment the market and re-enter with a value tier while protecting the premium line; targeted retention and a phased rollout to limit risk."</p>
<h3 style="margin:22px 0 12px">Rapid-fire <span class="muted" style="font-weight:400">· AI-generated</span></h3><div class="bubble"><div class="a">AI</div><div><b>Why this over a price cut?</b><br><span class="muted">"Protects brand equity and margins." — strong.</span></div></div><div class="bubble"><div class="a">AI</div><div><b>Competitor response?</b><br><span class="muted">"Pre-empt with loyalty lock-ins." — good foresight.</span></div></div></div></div>`));

/* ================= ADMIN — remaining ================= */
w("admin-campaigns.html", pg("admin","Campaigns","Campaigns","All case-study campaigns generated by faculty.",
`<a class="btn btn-pri" href="index.html">+ New campaign</a>`,
`<div class="flex" style="margin-bottom:18px"><div class="field" style="margin:0;min-width:220px"><label>Faculty</label><select><option>All faculty</option><option selected>Dr. Sanjeev Patni</option><option>Aarti Menon</option></select></div><div class="field" style="margin:0;min-width:200px"><label>Subject</label><select><option>All subjects</option>${SUB.map(s=>`<option>${s}</option>`).join("")}</select></div></div>
<div class="card" style="padding:8px 12px"><table><thead><tr><th>Campaign</th><th>Faculty</th><th>Subject</th><th>Difficulty</th><th>Time bracket</th><th>Responses</th><th>Status</th></tr></thead><tbody>
${[["Market Entry Crisis","Marketing","L2","17–19 Jun","23 / 32","Live"],["Brand Revival","Marketing","L1","15–18 Jun","40 / 52","Live"],["Cost Optimisation","Operations","L3","16–20 Jun","8 / 18","Live"],["Hiring Crunch","HR","L5","10–14 Jun","61 / 61","Closed"]].map(c=>`<tr onclick="location.href='admin-campaign-detail.html'" style="cursor:pointer"><td><b>${c[0]}</b></td><td>Dr. S. Patni</td><td>${c[1]}</td><td><span class="lv">${c[2]}</span></td><td>${c[3]}</td><td>${c[4]}</td><td><span class="chip ${c[5]==='Live'?'c-blue':'c-slate'}">${c[5]}</span></td></tr>`).join("")}
</tbody></table></div>`));

w("admin-campaign-detail.html", pg("admin","Campaigns","Market Entry Crisis","Dr. Sanjeev Patni · Marketing · L2 · 17–19 Jun",
`<a class="btn btn-gh" href="admin-campaigns.html">← Campaigns</a>`,
`<div class="grid g3"><div class="card tile"><div class="t">Responses</div><div class="n">23</div><div class="s">of 32 assigned</div></div><div class="card tile"><div class="t">Average mark</div><div class="n">76<span style="font-size:18px;color:var(--muted)"> /100</span></div></div><div class="card tile"><div class="t">Rejected</div><div class="n">2</div><div class="s">below 70%</div></div></div>
<div class="card mt" style="padding:8px 12px"><table><thead><tr><th>Student</th><th>Completion</th><th>Marks</th><th>Status</th></tr></thead><tbody>
<tr onclick="location.href='admin-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">SK</span><b>Sanjay Kumar</b></div></td><td>100%</td><td><b>82 / 100</b></td><td>${mark('c',82)}</td></tr>
<tr onclick="location.href='admin-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">NR</span><b>Neha Rao</b></div></td><td>80%</td><td><b>64 / 100</b></td><td>${mark('i',64)}</td></tr>
<tr onclick="location.href='admin-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">AS</span><b>Amit Sharma</b></div></td><td>55%</td><td><span class="muted">—</span></td><td>${mark('r')}</td></tr>
</tbody></table></div>`));

w("admin-scorecard.html", pg("admin","Campaigns","Sanjay Kumar — Scorecard","Market Entry Crisis · Marketing · L2 · 17–19 Jun",
`<a class="btn btn-gh" href="admin-campaign-detail.html">← Campaign</a>`,
`<div class="grid g2"><div class="card"><h3>Marks <span class="muted" style="font-weight:400">· /100, weighted parameters</span></h3><div class="markbig"><span class="v">82</span><span class="d">/ 100</span></div><span class="chip c-green" style="margin-top:10px">Completed · Passed (≥ 75)</span><h3 style="margin:22px 0 12px">Parameter breakdown</h3>${pscore(SCORE_PARAMS)}<div class="mrow"><span>Rapid-fire</span><b>2 / 3</b></div></div>
<div class="card"><h3>Submitted answer</h3><p class="muted">"Segment the market and re-enter with a value tier while protecting the premium line; targeted retention and a phased rollout to limit risk."</p><h3 style="margin:22px 0 12px">Rapid-fire <span class="muted" style="font-weight:400">· AI-generated</span></h3><div class="bubble"><div class="a">AI</div><div><b>Why this over a price cut?</b><br><span class="muted">"Protects brand equity and margins." — strong.</span></div></div><div class="bubble"><div class="a">AI</div><div><b>Competitor response?</b><br><span class="muted">"Pre-empt with loyalty lock-ins." — good foresight.</span></div></div></div></div>`));

w("admin-mentors.html", pg("admin","Mentors","Mentors / Faculty","Invite faculty and assign their subjects, department and experience.",
`<a class="btn btn-pri" href="admin-mentor-invite.html">+ Invite mentor</a>`,
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Mentor</th><th>Department</th><th>Subjects</th><th>Experience</th><th>Status</th></tr></thead><tbody>
<tr><td><div class="u"><span class="a">SP</span><div><b>Dr. Sanjeev Patni</b><div class="muted" style="font-size:12px">s.patni@pibm.in</div></div></div></td><td>Marketing</td><td><span class="chip c-blue">Marketing</span></td><td>14 yrs</td><td><span class="chip c-green">Active</span></td></tr>
<tr><td><div class="u"><span class="a">AM</span><div><b>Aarti Menon</b><div class="muted" style="font-size:12px">a.menon@pibm.in</div></div></div></td><td>Finance</td><td><span class="chip c-blue">Finance</span></td><td>9 yrs</td><td><span class="chip c-green">Active</span></td></tr>
<tr><td><div class="u"><span class="a">VN</span><div><b>Vikram Nair</b><div class="muted" style="font-size:12px">v.nair@pibm.in</div></div></div></td><td>HR</td><td><span class="chip c-blue">HR</span></td><td>6 yrs</td><td><span class="chip c-amber">Invited</span></td></tr>
</tbody></table></div>`));

w("admin-mentor-invite.html", pg("admin","Mentors","Invite mentor","They receive an email with a temporary password and set a new one on first login.",
`<a class="btn btn-gh" href="admin-mentors.html">← Mentors</a>`,
`<div class="card" style="max-width:720px"><div class="fg"><div class="field"><label>Full name</label><input placeholder="e.g. Dr. Sanjeev Patni"></div><div class="field"><label>Email</label><input placeholder="name@pibm.in"></div></div>
<div class="fg"><div class="field"><label>Department</label><select>${SUB.map(s=>`<option>${s}</option>`).join("")}</select></div><div class="field"><label>Experience</label><select><option>0–3 years</option><option>3–6 years</option><option selected>6–10 years</option><option>10+ years</option></select></div></div>
<div class="field"><label>Assign subjects <span class="muted">(one or more)</span></label><div class="chips">${SUB.map((s,i)=>`<span class="sel ${i===1?'on':''}">${s}</span>`).join("")}</div><div class="hint">The mentor can author and review only within these subjects.</div></div>
<div class="right"><a class="btn btn-gh" href="admin-mentors.html">Cancel</a><a class="btn btn-pri" href="admin-mentors.html">Send invitation</a></div></div>`));

w("admin-students.html", pg("admin","Students","Students","Invite students individually or bulk-import from college data.",
`<div class="flex"><a class="btn btn-gh" href="admin-student-import.html">⭳ Bulk import</a><a class="btn btn-pri" href="admin-student-invite.html">+ Invite student</a></div>`,
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Student</th><th>Subject</th><th>Level</th><th>Status</th></tr></thead><tbody>
<tr><td><div class="u"><span class="a">SK</span><div><b>Sanjay Kumar</b><div class="muted" style="font-size:12px">sanjay.k@pibm.in</div></div></div></td><td>Marketing</td><td><span class="lv">L2</span></td><td><span class="chip c-green">Active</span></td></tr>
<tr><td><div class="u"><span class="a">PM</span><div><b>Priya Mehta</b><div class="muted" style="font-size:12px">priya.m@pibm.in</div></div></div></td><td>Finance</td><td><span class="lv">L3</span></td><td><span class="chip c-green">Active</span></td></tr>
<tr><td><div class="u"><span class="a">AS</span><div><b>Amit Sharma</b><div class="muted" style="font-size:12px">amit.s@pibm.in</div></div></div></td><td>Marketing</td><td><span class="lv">L1</span></td><td><span class="chip c-amber">Invited</span></td></tr>
</tbody></table></div>`));

w("admin-student-invite.html", pg("admin","Students","Invite student","Send a single invitation with a temporary password.",
`<a class="btn btn-gh" href="admin-students.html">← Students</a>`,
`<div class="card" style="max-width:680px"><div class="fg"><div class="field"><label>Full name</label><input placeholder="e.g. Sanjay Kumar"></div><div class="field"><label>Email</label><input placeholder="name@pibm.in"></div></div>
<div class="fg"><div class="field"><label>College ID</label><input placeholder="PIBM-XXXX"></div><div class="field"><label>Subject</label><select>${SUB.map(s=>`<option>${s}</option>`).join("")}</select></div></div>
<div class="note">Need to add many at once? Use <a href="admin-student-import.html" style="text-decoration:underline">Bulk import</a>.</div>
<div class="right"><a class="btn btn-gh" href="admin-students.html">Cancel</a><a class="btn btn-pri" href="admin-students.html">Send invitation</a></div></div>`));

w("admin-student-import.html", pg("admin","Students","Bulk import students","Upload a CSV from college data. Each row is mapped to a subject.",
`<a class="btn btn-gh" href="admin-students.html">← Students</a>`,
`<div class="card" style="max-width:760px"><div class="drop"><div style="font-size:28px">⭳</div><b>Drop your CSV here</b> or click to browse<div class="hint" style="margin-top:6px">Columns: name, email, college_id, subject</div></div>
<h3 style="margin:24px 0 12px">Preview</h3><table><thead><tr><th>Name</th><th>Email</th><th>College ID</th><th>Subject</th></tr></thead><tbody><tr><td>Sanjay Kumar</td><td>sanjay.k@pibm.in</td><td>PIBM-2401</td><td>Marketing</td></tr><tr><td>Priya Mehta</td><td>priya.m@pibm.in</td><td>PIBM-2402</td><td>Finance</td></tr></tbody></table>
<div class="right"><a class="btn btn-gh" href="admin-students.html">Cancel</a><a class="btn btn-pri" href="admin-students.html">Import 60 students</a></div></div>`));

w("admin-settings.html", pg("admin","Settings","Settings","Super-Admin configuration · Subjects, Capabilities and Marks Scheme.","",
`<div class="seg" style="margin-bottom:22px"><button class="on" onclick="tab('sub')">Subjects</button><button onclick="tab('cap')">Capabilities</button><button onclick="tab('mk')">Marks Scheme</button></div>
<div id="sub" class="tabp"><div class="card"><div class="bt flex" style="margin-bottom:6px"><h3 style="margin:0">Subjects</h3><button class="btn btn-gh btn-sm">+ Add subject</button></div>
${SUB.map(s=>`<div class="row"><div class="gr"><b>${s}</b></div><button class="btn btn-gh btn-sm" style="color:var(--red);border-color:#f3c4c4">Delete</button></div>`).join("")}</div></div>
<div id="cap" class="tabp" style="display:none">${Object.entries(CAPS).map(([g,l])=>`<div class="card" style="margin-bottom:18px"><div class="bt flex" style="margin-bottom:12px"><h3 style="margin:0">${g} Capabilities</h3><button class="btn btn-gh btn-sm">+ Add</button></div><div class="chips">${l.map(c=>`<span class="sel on">${c} <b style="margin-left:6px;opacity:.7">✕</b></span>`).join("")}</div></div>`).join("")}</div>
<div id="mk" class="tabp" style="display:none"><div class="note" style="margin-bottom:16px">Scoring is out of 100, weighted across each case study's mapped capability parameters. Parameters &amp; weights are dynamic — edit them here.</div>
<div class="grid g3"><div class="card"><h3>Pass mark</h3><div class="markbig"><span class="v">75</span><span class="d">/100</span></div><p class="muted mt">≥ this auto-advances to the next level (1–5).</p></div><div class="card"><h3>Completion tiers</h3><div class="mt"><div class="mrow"><span>Completed</span><b>100% submitted</b></div><div class="mrow"><span>Incomplete</span><b>≥ 70%</b></div><div class="mrow"><span>Disqualified</span><b>&lt; 70%</b></div></div></div><div class="card"><h3>Disqualification</h3><div class="chip c-red" style="margin-top:6px">&lt; 70% in time → Rejected</div><p class="muted mt" style="font-size:13px">"Try again later. Contact your faculty/admin." Mentor can re-assign; threshold configurable.</p></div></div>
<div class="card mt" style="max-width:620px"><h3>Scoring parameters &amp; weights <span class="muted" style="font-weight:400">· must total 100</span></h3>
${[["Analytical Thinking",30],["Strategic Thinking",30],["Decision Making",40]].map(p=>`<div class="mrow"><span>${p[0]}</span><input value="${p[1]}" style="width:80px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:14px"></div>`).join("")}
<button class="btn btn-gh btn-sm" style="margin-top:10px">+ Add parameter</button>
<div class="fg" style="margin-top:14px"><div class="field"><label>Pass mark (/100)</label><input value="75"></div><div class="field"><label>Disqualify below</label><input value="70%"></div></div>
<div class="right"><button class="btn btn-pri">Save scheme</button></div></div></div>`,
`function tab(t){['sub','cap','mk'].forEach(x=>document.getElementById(x).style.display=x===t?'block':'none');document.querySelectorAll('.seg button').forEach(b=>b.classList.remove('on'));event.target.classList.add('on');}`));

/* ================= MENTOR — remaining ================= */
w("mentor-dashboard.html", pg("mentor","Dashboard","Good morning, Dr. Patni","Your subjects: Marketing. Here's what needs you.",
`<a class="btn btn-pri" href="mentor-case-create.html">+ Create case study</a>`,
`<div class="note" style="margin-bottom:18px">You see only students, case studies and responses within your assigned subjects.</div>
<div class="grid g3"><div class="card tile"><span class="ic">◆</span><div class="t">My case studies</div><div class="n">11</div><div class="s">3 live</div></div><div class="card tile"><span class="ic">⧖</span><div class="t">Awaiting review</div><div class="n">9</div><div class="s">submitted</div></div><div class="card tile"><span class="ic">✕</span><div class="t">Rejected</div><div class="n">4</div><div class="s">assign another task</div></div></div>
<div class="card mt"><div class="bt flex" style="margin-bottom:6px"><h3 style="margin:0">Needs attention</h3><a class="chip c-blue" href="mentor-cases.html">My case studies</a></div>
<div class="row"><span class="ic" style="background:var(--red-bg);color:var(--red)">✕</span><div class="gr"><b>Amit Sharma</b> — Market Entry Crisis<small>Rejected · 55% complete</small></div><a class="btn btn-gh btn-sm" href="mentor-scorecard.html">Review</a></div>
<div class="row"><span class="ic" style="background:var(--amber-bg);color:var(--amber)">⧖</span><div class="gr"><b>Market Entry Crisis</b><small>Closes in 1 day · 9 not started</small></div><a class="btn btn-gh btn-sm" href="mentor-responses.html">Responses</a></div></div>`));

w("mentor-cases.html", pg("mentor","Case Studies","Case studies","Author case studies for your subjects and assign them.",
`<a class="btn btn-pri" href="mentor-case-create.html">+ Create case study</a>`,
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Title</th><th>Subject</th><th>Difficulty</th><th>Time bracket</th><th>Responses</th><th>Status</th></tr></thead><tbody>
<tr onclick="location.href='mentor-responses.html'" style="cursor:pointer"><td><b>Market Entry Crisis</b></td><td>Marketing</td><td><span class="lv">L2</span></td><td>17–19 Jun</td><td>23 / 32</td><td><span class="chip c-blue">Live</span></td></tr>
<tr onclick="location.href='mentor-responses.html'" style="cursor:pointer"><td><b>Brand Revival</b></td><td>Marketing</td><td><span class="lv">L1</span></td><td>15–18 Jun</td><td>40 / 52</td><td><span class="chip c-blue">Live</span></td></tr>
<tr onclick="location.href='mentor-case-create.html'" style="cursor:pointer"><td><b>Growth Levers</b></td><td>Marketing</td><td><span class="lv">L3</span></td><td>—</td><td>—</td><td><span class="chip c-slate">Draft</span></td></tr>
</tbody></table></div>`));

w("mentor-responses.html", pg("mentor","Case Studies","Market Entry Crisis — responses","Marketing · L2 · 17–19 Jun · 23 of 32 submitted.",
`<a class="btn btn-gh" href="mentor-cases.html">← Case studies</a>`,
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Student</th><th>Completion</th><th>Marks</th><th>Status</th></tr></thead><tbody>
<tr onclick="location.href='mentor-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">SK</span><b>Sanjay Kumar</b></div></td><td>100%</td><td><b>82 / 100</b></td><td>${mark('c',82)}</td></tr>
<tr onclick="location.href='mentor-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">NR</span><b>Neha Rao</b></div></td><td>80%</td><td><b>64 / 100</b></td><td>${mark('i',64)}</td></tr>
<tr onclick="location.href='mentor-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">AS</span><b>Amit Sharma</b></div></td><td>55%</td><td><span class="muted">—</span></td><td>${mark('r')}</td></tr>
</tbody></table></div>`));

w("mentor-students.html", pg("mentor","Students","My students","Students within your assigned subjects only.","",
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Student</th><th>Subject</th><th>Level</th><th>Avg. mark</th><th>Status</th></tr></thead><tbody>
<tr onclick="location.href='mentor-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">SK</span><b>Sanjay Kumar</b></div></td><td>Marketing</td><td><span class="lv">L2</span></td><td>78 / 100</td><td><span class="chip c-green">On track</span></td></tr>
<tr onclick="location.href='mentor-scorecard.html'" style="cursor:pointer"><td><div class="u"><span class="a">AS</span><b>Amit Sharma</b></div></td><td>Marketing</td><td><span class="lv">L1</span></td><td>—</td><td><span class="chip c-red">Rejected</span></td></tr>
</tbody></table></div>`));

/* ================= STUDENT — remaining ================= */
w("student-tasks.html", pg("student","My Tasks","My tasks","Case studies assigned to you, with their time brackets.","",
`<div class="card" style="padding:8px 12px"><table><thead><tr><th>Case study</th><th>Difficulty</th><th>Time bracket</th><th>Status</th><th></th></tr></thead><tbody>
<tr><td><b>Market Entry Crisis</b><div class="muted" style="font-size:12px">Marketing</div></td><td><span class="lv">L2</span></td><td>17–19 Jun</td><td><span class="chip c-blue">Available</span></td><td style="text-align:right"><a class="btn btn-pri btn-sm" href="student-assessment.html">Start</a></td></tr>
<tr><td><b>Customer Retention</b><div class="muted" style="font-size:12px">Marketing</div></td><td><span class="lv">L2</span></td><td>18–21 Jun</td><td><span class="chip c-blue">Available</span></td><td style="text-align:right"><a class="btn btn-gh btn-sm" href="student-assessment.html">Start</a></td></tr>
<tr><td><b>Brand Revival</b><div class="muted" style="font-size:12px">Marketing</div></td><td><span class="lv">L1</span></td><td>15–18 Jun</td><td>${mark('c',82)}</td><td style="text-align:right"><span class="chip c-green">82 / 100</span></td></tr>
</tbody></table></div>`));

w("student-progress.html", pg("student","My Progress","My progress","Your capability growth over time — you compete against yourself.","",
`<div class="grid g2"><div class="card"><h3>Capability scores</h3>${bars([["Problem Solving",80],["Communication",74],["Strategic Thinking",68],["Decision Making",71],["Innovation",61],["Leadership",65]])}</div>
<div class="card"><h3>Mark trend</h3><svg viewBox="0 0 320 150" style="width:100%;height:auto"><polygon fill="#e4eefe" opacity=".6" points="10,120 60,108 110,92 160,88 210,70 260,58 305,46 305,140 10,140"/><polyline fill="none" stroke="#2563eb" stroke-width="3" points="10,120 60,108 110,92 160,88 210,70 260,58 305,46"/><circle cx="305" cy="46" r="4" fill="#1d4ed8"/></svg><p class="muted">Steady improvement across your last 7 case studies.</p><div class="note" style="margin:12px 0">💪 Strongest: Problem Solving · 🎯 Focus area: Innovation</div><h3 style="margin:12px 0 12px">Recent marks</h3><div class="mrow"><span>Brand Revival · L1</span><b>82 / 100</b></div><div class="mrow"><span>Founder's Brief · L1</span><b>70 / 100</b></div></div></div>`));

w("student-notifications.html", pg("student","Home","Notifications","Updates on your tasks and progress.",
`<a class="btn btn-gh" href="student-home.html">← Home</a>`,
`<div class="card"><div class="row"><span class="ic" style="background:var(--green-bg);color:var(--green)">✓</span><div class="gr"><b>Brand Revival graded</b><small>You scored 82 / 100 · Completed</small></div></div>
<div class="row"><span class="ic">◆</span><div class="gr"><b>New task assigned</b><small>Market Entry Crisis · due 19 Jun</small></div></div>
<div class="row"><span class="ic" style="background:var(--amber-bg);color:var(--amber)">⧖</span><div class="gr"><b>Closing soon</b><small>Market Entry Crisis closes tomorrow 5 PM</small></div></div>
<div class="row"><span class="ic">✦</span><div class="gr"><b>Faculty feedback</b><small>Dr. S. Patni commented on your submission</small></div></div></div>`));

/* ================= AUTH ================= */
const authShell=(tabActive,body)=>`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — ${tabActive==='login'?'Login':'Set Password'}</title><link rel="stylesheet" href="styles.css"></head><body><div style="display:flex;min-height:100vh"><div style="flex:1;background:linear-gradient(135deg,var(--blue-d),var(--blue));color:#fff;padding:56px;display:flex;flex-direction:column;justify-content:center"><div style="width:54px;height:54px;border-radius:15px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:21px;margin-bottom:28px">PC</div><h1 style="font-size:36px;margin:0 0 14px;line-height:1.2">Prestige Capability<br>Development Centre</h1><p style="font-size:15px;opacity:.92;max-width:430px">An AI-powered learning platform that measures how you think — not just what you answer.</p></div><div style="width:460px;max-width:100%;padding:54px 50px;display:flex;flex-direction:column;justify-content:center"><div style="display:flex;gap:20px;margin-bottom:26px"><a href="login.html" style="font-weight:700;color:${tabActive==='login'?'var(--blue-d)':'var(--muted)'};border-bottom:2px solid ${tabActive==='login'?'var(--blue)':'transparent'};padding-bottom:8px">Login</a><a href="set-password.html" style="font-weight:700;color:${tabActive==='setpw'?'var(--blue-d)':'var(--muted)'};border-bottom:2px solid ${tabActive==='setpw'?'var(--blue)':'transparent'};padding-bottom:8px">Set Password</a></div>${body}</div></div></body></html>`;
w("login.html", authShell('login',`<h1 style="font-size:25px;margin:0 0 6px">Welcome back</h1><p class="muted" style="margin:0 0 24px">Sign in to your PCDC account.</p><div class="field"><label>Email</label><input value="sanjay.k@pibm.in"></div><div class="field"><label>Password</label><input type="password" value="••••••••"></div><a class="btn btn-pri" style="width:100%;justify-content:center" href="index.html">Sign in</a><p class="muted" style="font-size:12.5px;text-align:center;margin-top:16px">New users receive a temporary password by email.</p>`));
w("set-password.html", authShell('setpw',`<h1 style="font-size:25px;margin:0 0 6px">Set your password</h1><p class="muted" style="margin:0 0 24px">First-time login — replace your temporary password.</p><div class="field"><label>Email</label><input value="sanjay.k@pibm.in" disabled></div><div class="field"><label>Temporary password</label><input type="password" placeholder="From your email"></div><div class="field"><label>New password</label><input type="password"></div><div class="field"><label>Confirm new password</label><input type="password"></div><a class="btn btn-pri" style="width:100%;justify-content:center" href="login.html">Set password &amp; continue</a>`));

console.log("WROTE "+fs.readdirSync(OUT).filter(f=>f.endsWith('.html')).length+" pages + styles.css to "+OUT);

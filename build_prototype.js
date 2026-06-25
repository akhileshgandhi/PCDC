const fs = require("fs");
const path = require("path");
const OUT = "C:\\Users\\user\\Downloads\\Prestige\\prototype";
fs.mkdirSync(OUT, { recursive: true });
const w = (file, html) => fs.writeFileSync(path.join(OUT, file), html);

/* ---------------- shared CSS ---------------- */
const CSS = `
:root{--blue-50:#eff6ff;--blue-100:#dbeafe;--blue-200:#bfdbfe;--blue-300:#93c5fd;--blue-500:#3b82f6;--blue-600:#2563eb;--blue-700:#1d4ed8;--blue-800:#1e40af;--ink:#0f172a;--slate:#475569;--muted:#94a3b8;--line:#e6edf6;--line2:#eef3fa;--bg:#f3f7fe;--white:#fff;--green:#16a34a;--green-bg:#dcfce7;--amber:#b45309;--amber-bg:#fef3c7;--red:#dc2626;--red-bg:#fee2e2;--slate-bg:#eef2f7;--shadow:0 1px 2px rgba(15,23,42,.04),0 6px 20px rgba(37,99,235,.06);--radius:14px;}
*{box-sizing:border-box;}
body{margin:0;font-family:'Segoe UI',Roboto,-apple-system,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;}
a{color:inherit;text-decoration:none;}
.topbar{height:62px;background:var(--white);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;padding:0 22px;position:sticky;top:0;z-index:50;}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;}
.brand .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--blue-600),var(--blue-800));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;}
.brand small{display:block;font-weight:500;font-size:11px;color:var(--muted);margin-top:-2px;}
.switcher{margin-left:12px;display:flex;background:var(--blue-50);border:1px solid var(--line);border-radius:11px;padding:4px;gap:2px;}
.switcher a{border:0;background:transparent;color:var(--slate);font-weight:600;font-size:13px;padding:7px 15px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:7px;}
.switcher a .dot{width:7px;height:7px;border-radius:50%;background:var(--muted);}
.switcher a.active{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3);}
.switcher a.active .dot{background:#fff;}
.topbar .spacer{flex:1;}
.proto-tag{font-size:11px;color:var(--blue-700);background:var(--blue-50);border:1px solid var(--blue-200);padding:5px 10px;border-radius:20px;font-weight:600;}
.linkbtn{font-size:12.5px;color:var(--blue-700);font-weight:700;cursor:pointer;border:1px solid var(--blue-200);background:#fff;border-radius:9px;padding:7px 12px;}
.userchip{display:flex;align-items:center;gap:10px;}
.avatar{width:36px;height:36px;border-radius:50%;background:var(--blue-100);color:var(--blue-700);display:flex;align-items:center;justify-content:center;font-weight:700;}
.userchip .who{font-size:12px;}.userchip .who b{display:block;font-size:13px;}.userchip .who span{color:var(--muted);}
.shell{display:flex;min-height:calc(100vh - 62px);}
.sidebar{width:240px;background:var(--white);border-right:1px solid var(--line);padding:18px 14px;}
.nav-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);font-weight:700;margin:6px 10px 12px;}
.nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--slate);font-weight:600;font-size:13.5px;margin-bottom:3px;cursor:pointer;}
.nav a:hover{background:var(--blue-50);color:var(--blue-700);}
.nav a.active{background:var(--blue-600);color:#fff;box-shadow:var(--shadow);}
.nav a .ni{width:18px;display:inline-block;text-align:center;flex:none;}
.sidebar .help{margin-top:22px;background:linear-gradient(135deg,var(--blue-600),var(--blue-800));color:#fff;border-radius:var(--radius);padding:16px;font-size:12.5px;}
.sidebar .help b{font-size:13.5px;}.sidebar .help p{opacity:.85;margin:6px 0 0;}
.content{flex:1;padding:26px 30px;max-width:1180px;}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
.page-head h1{font-size:22px;margin:0;}.page-head p{margin:4px 0 0;color:var(--slate);font-size:13.5px;}
.crumb{font-size:12.5px;color:var(--blue-700);font-weight:700;cursor:pointer;margin-bottom:8px;display:inline-block;}
.grid{display:grid;gap:16px;}.cards-4{grid-template-columns:repeat(4,1fr);}.cards-3{grid-template-columns:repeat(3,1fr);}.cards-2{grid-template-columns:repeat(2,1fr);}
.card{background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);}
.stat .label{color:var(--slate);font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;}
.stat .ic{width:34px;height:34px;border-radius:10px;background:var(--blue-50);color:var(--blue-600);display:flex;align-items:center;justify-content:center;}
.stat .num{font-size:30px;font-weight:800;margin-top:10px;letter-spacing:-.5px;}.stat .sub{font-size:12px;color:var(--muted);margin-top:2px;}
.card h3{font-size:15px;margin:0 0 14px;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:700;padding:11px 12px;border-bottom:1px solid var(--line);}
td{padding:13px 12px;border-bottom:1px solid var(--line2);font-size:13.5px;vertical-align:middle;}
tr:last-child td{border-bottom:0;}tbody tr:hover{background:var(--blue-50);}
tr.click{cursor:pointer;}
.uname{display:flex;align-items:center;gap:11px;}
.uname .av{width:32px;height:32px;border-radius:50%;background:var(--blue-100);color:var(--blue-700);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;}
.uname b{font-size:13.5px;}.uname span{color:var(--muted);font-size:12px;}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px;}
.b-green{background:var(--green-bg);color:var(--green);}.b-amber{background:var(--amber-bg);color:var(--amber);}.b-red{background:var(--red-bg);color:var(--red);}.b-slate{background:var(--slate-bg);color:var(--slate);}.b-blue{background:var(--blue-100);color:var(--blue-700);}
.lv{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;}
.lv1{background:var(--blue-50);color:var(--blue-600);}.lv2{background:var(--blue-200);color:var(--blue-800);}.lv3{background:var(--blue-700);color:#fff;}.lv4{background:#172554;color:#fff;}
.capgroup{margin-bottom:14px;}.capgroup .gh{font-size:12px;font-weight:700;color:var(--blue-700);margin-bottom:7px;text-transform:uppercase;letter-spacing:.4px;}
.qitem{border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px;background:var(--blue-50);}
.qitem .qh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:700;color:var(--slate);font-size:12.5px;}
.markbig{display:flex;align-items:baseline;gap:6px;}.markbig .v{font-size:40px;font-weight:800;line-height:1;}.markbig .d{font-size:18px;color:var(--muted);font-weight:700;}
.markrow{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line2);font-size:13.5px;}
.markrow:last-child{border-bottom:0;}.markrow b{font-weight:700;}
.rejected{background:var(--red-bg);border:1px solid #fca5a5;color:#991b1b;border-radius:12px;padding:16px;font-weight:700;text-align:center;}
.btn{border:0;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-decoration:none;}
.btn-primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.25);}.btn-primary:hover{background:var(--blue-700);}
.btn-ghost{background:var(--white);color:var(--blue-700);border:1px solid var(--blue-200);}.btn-ghost:hover{background:var(--blue-50);}
.btn-danger{background:#fff;color:var(--red);border:1px solid #fecaca;}.btn-danger:hover{background:var(--red-bg);}
.btn-sm{padding:7px 12px;font-size:12px;border-radius:8px;}.btn[disabled]{opacity:.5;cursor:not-allowed;}
.bar{height:8px;background:var(--blue-50);border-radius:6px;overflow:hidden;}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--blue-500),var(--blue-700));border-radius:6px;}
.cap-row{display:flex;align-items:center;gap:12px;margin-bottom:13px;}
.cap-row .nm{width:150px;font-size:13px;font-weight:600;color:var(--slate);}.cap-row .bar{flex:1;}.cap-row .vl{width:38px;text-align:right;font-weight:700;font-size:13px;}
.activity{margin:0;padding:0;}
.activity li{display:flex;gap:12px;padding:11px 0;border-bottom:1px solid var(--line2);list-style:none;align-items:center;}
.activity li:last-child{border-bottom:0;}
.activity .ai{width:32px;height:32px;border-radius:9px;background:var(--blue-50);color:var(--blue-600);display:flex;align-items:center;justify-content:center;flex:none;}
.activity small{color:var(--muted);}
.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}
.search{flex:1;max-width:300px;display:flex;align-items:center;gap:8px;background:var(--white);border:1px solid var(--line);border-radius:10px;padding:9px 13px;color:var(--muted);font-size:13px;}
.search input{border:0;outline:0;font-size:13px;flex:1;background:transparent;}
.picker{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:13px;font-weight:600;color:var(--slate);}
.picker select{border:0;outline:0;font-size:13px;font-weight:700;color:var(--blue-700);background:transparent;}
.field{margin-bottom:16px;}
.field label{display:block;font-size:12.5px;font-weight:700;color:var(--slate);margin-bottom:6px;}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:14px;font-family:inherit;outline:none;background:#fff;}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue-500);box-shadow:0 0 0 3px var(--blue-100);}
.field .hint{font-size:11.5px;color:var(--muted);margin-top:5px;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;}
.chips{display:flex;flex-wrap:wrap;gap:8px;}
.chip{padding:7px 13px;border-radius:20px;border:1px solid var(--blue-200);background:#fff;color:var(--blue-700);font-size:12.5px;font-weight:600;cursor:pointer;}
.chip.on{background:var(--blue-600);color:#fff;border-color:var(--blue-600);}
.dropzone{border:2px dashed var(--blue-300);border-radius:14px;padding:30px;text-align:center;color:var(--slate);background:var(--blue-50);}
.dropzone b{color:var(--blue-700);}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;}
.seg button{border:0;background:#fff;padding:9px 16px;font-weight:600;font-size:13px;cursor:pointer;color:var(--slate);}
.seg button.on{background:var(--blue-600);color:#fff;}
.form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;}
.switchbox{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--slate);}
.toggle{width:42px;height:24px;border-radius:20px;background:var(--blue-200);position:relative;cursor:pointer;}
.toggle.on{background:var(--blue-600);}
.toggle::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s;}
.toggle.on::after{left:21px;}
.info{background:var(--blue-50);border:1px solid var(--blue-100);color:var(--blue-800);border-radius:10px;padding:11px 14px;font-size:12.5px;font-weight:600;}
.hero{background:linear-gradient(120deg,var(--blue-700),var(--blue-500));color:#fff;border-radius:18px;padding:24px 26px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;box-shadow:0 10px 30px rgba(37,99,235,.25);}
.hero h2{margin:0 0 4px;font-size:22px;}.hero p{margin:0;opacity:.9;font-size:13.5px;}
.score-ring{text-align:center;}.score-ring .n{font-size:42px;font-weight:800;line-height:1;}.score-ring .l{font-size:12px;opacity:.85;}
.level-track{display:flex;align-items:center;margin:8px 0;}
.level-track .step{flex:1;text-align:center;}
.level-track .step .ball{width:34px;height:34px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-weight:700;background:var(--blue-50);color:var(--blue-600);border:2px solid var(--blue-200);font-size:13px;}
.level-track .step.done .ball{background:var(--green);color:#fff;border-color:var(--green);}
.level-track .step.current .ball{background:var(--blue-600);color:#fff;border-color:var(--blue-600);box-shadow:0 0 0 4px var(--blue-100);}
.level-track .step.locked .ball{background:#fff;color:var(--muted);border-style:dashed;}
.level-track .step .lab{font-size:12px;color:var(--slate);font-weight:600;}
.level-track .line{height:3px;width:40px;background:var(--blue-100);}
.case-card{display:flex;flex-direction:column;gap:10px;}
.case-card .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.case-card h4{margin:2px 0 0;font-size:15px;}.case-card p{margin:0;color:var(--slate);font-size:13px;}
.case-card.locked{opacity:.6;}
.timechip{font-size:11.5px;color:var(--slate);background:var(--slate-bg);padding:3px 9px;border-radius:6px;}
.warn{background:var(--red-bg);border:1px solid #fca5a5;color:#991b1b;border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:center;font-size:13.5px;font-weight:600;}
.stepper{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.stepper .s{display:flex;align-items:center;gap:9px;background:var(--white);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:600;color:var(--slate);cursor:pointer;}
.stepper .s .n{width:22px;height:22px;border-radius:50%;background:var(--blue-50);color:var(--blue-600);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.stepper .s.active{border-color:var(--blue-600);color:var(--blue-700);background:var(--blue-50);}.stepper .s.active .n{background:var(--blue-600);color:#fff;}
.astep{display:none;}.astep.active{display:block;}
textarea.answer{width:100%;min-height:170px;border:1px solid var(--line);border-radius:12px;padding:14px;font-size:14px;font-family:inherit;resize:vertical;outline:none;}
textarea.answer:focus{border-color:var(--blue-500);box-shadow:0 0 0 3px var(--blue-100);}
.paste-note{font-size:12px;color:var(--amber);background:var(--amber-bg);padding:6px 10px;border-radius:8px;display:inline-flex;gap:7px;align-items:center;margin-top:10px;}
.qbox{background:var(--blue-50);border:1px solid var(--blue-100);border-radius:12px;padding:15px 16px;margin-bottom:12px;}
.qbox .q{font-weight:700;color:var(--blue-800);margin-bottom:8px;}
.qbox input{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;font-size:13.5px;outline:none;}
.ai-bubble{display:flex;gap:12px;background:var(--white);border:1px solid var(--line);border-left:4px solid var(--blue-500);border-radius:12px;padding:14px 16px;margin-bottom:10px;}
.ai-bubble .ai{width:30px;height:30px;border-radius:8px;background:var(--blue-600);color:#fff;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;}
.scoreband{display:flex;align-items:center;justify-content:center;flex-direction:column;background:var(--green-bg);color:var(--green);border-radius:14px;padding:18px;font-weight:800;}
.scoreband.fail{background:var(--red-bg);color:var(--red);}
.scoreband .big{font-size:40px;line-height:1;}
.muted{color:var(--muted);}.right{text-align:right;}.mt{margin-top:18px;}.flex{display:flex;gap:16px;}.between{justify-content:space-between;align-items:center;}
/* auth pages */
.authpage{display:flex;min-height:100vh;}
.auth-brand{flex:1;background:linear-gradient(135deg,var(--blue-700),var(--blue-500));color:#fff;padding:54px;display:flex;flex-direction:column;justify-content:center;}
.auth-brand .logo{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:26px;}
.auth-brand h1{font-size:34px;margin:0 0 14px;line-height:1.2;}.auth-brand p{font-size:15px;opacity:.9;max-width:420px;}
.auth-brand ul{margin:26px 0 0;padding:0;list-style:none;}.auth-brand li{display:flex;gap:10px;align-items:center;margin-bottom:12px;font-size:14px;opacity:.95;}
.auth-brand li .tick{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;}
.auth-form{width:460px;padding:50px 48px;display:flex;flex-direction:column;justify-content:center;}
.auth-form h2{font-size:24px;margin:0 0 6px;}.auth-form .sub{color:var(--slate);margin:0 0 22px;font-size:13.5px;}
.auth-tabs{display:flex;gap:18px;margin-bottom:22px;}
.auth-tabs a{font-weight:700;font-size:14px;color:var(--muted);padding-bottom:8px;border-bottom:2px solid transparent;}
.auth-tabs a.active{color:var(--blue-700);border-color:var(--blue-600);}
/* landing */
.landing{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;}
.landing .logo{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,var(--blue-600),var(--blue-800));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;margin-bottom:20px;}
.landing h1{font-size:30px;margin:0 0 6px;}.landing p{color:var(--slate);margin:0 0 30px;}
.role-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:760px;width:100%;}
.role-cards a{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:26px;box-shadow:var(--shadow);transition:.15s;}
.role-cards a:hover{border-color:var(--blue-300);transform:translateY(-2px);}
.role-cards .ic{width:46px;height:46px;border-radius:12px;background:var(--blue-50);color:var(--blue-600);display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 12px;}
.role-cards b{font-size:16px;}.role-cards span{display:block;color:var(--muted);font-size:12.5px;margin-top:4px;}
@media(max-width:980px){.cards-4{grid-template-columns:repeat(2,1fr);}.cards-3,.cards-2,.form-grid,.role-cards{grid-template-columns:1fr;}}
@media(max-width:680px){.sidebar{display:none;}.auth-brand{display:none;}.auth-form{width:100%;}}
`;
w("styles.css", CSS.trim());

/* ---------------- shell ---------------- */
const USER = { admin:["Anita Desai","Administrator","AD"], mentor:["Dr. Sanjeev Patni","Mentor · Marketing","SP"], student:["Sanjay Kumar","Student · Marketing","SK"] };
const NAV = {
  admin:[["dashboard","Dashboard","▤","admin-dashboard.html"],["subjects","Subjects","▣","admin-subjects.html"],["capabilities","Capabilities","◈","admin-capabilities.html"],["marks","Marks Scheme","▦","admin-marks.html"],["mentors","Mentors / Faculty","◑","admin-mentors.html"],["students","Students","◍","admin-students.html"],["campaigns","Campaigns","◆","admin-campaigns.html"],["analytics","Analytics","◔","admin-analytics.html"]],
  mentor:[["dashboard","Dashboard","▤","mentor-dashboard.html"],["cases","My Case Studies","◆","mentor-cases.html"],["responses","Responses","◔","mentor-responses.html"],["students","My Students","◍","mentor-students.html"]],
  student:[["dashboard","Dashboard","▤","student-dashboard.html"],["cases","My Case Studies","◆","student-cases.html"],["assess","Active Assessment","✦","student-assessment.html"],["profile","Capability Profile","◍","student-profile.html"],["notifications","Notifications","◔","student-notifications.html"]]
};
const LABEL = { admin:"Admin Portal", mentor:"Mentor Portal", student:"Student Portal" };
function sidebar(role, active){
  const items = NAV[role].map(it=>`<a href="${it[3]}" class="${it[0]===active?'active':''}"><span class="ni">${it[2]}</span>${it[1]}</a>`).join("");
  return `<div class="nav-label">${LABEL[role]}</div><nav class="nav">${items}</nav><div class="help"><b>Design prototype</b><p>Use the sidebar to open each module. Switch roles in the top bar.</p></div>`;
}
function topbar(role){
  const sw = ["admin","mentor","student"].map(r=>`<a href="${r}-dashboard.html" class="${r===role?'active':''}"><span class="dot"></span>${r[0].toUpperCase()+r.slice(1)}</a>`).join("");
  const u = USER[role];
  return `<header class="topbar"><div class="brand"><span class="logo">PC</span><div>PCDC<small>Capability Development Centre</small></div></div>
  <div class="switcher">${sw}</div><div class="spacer"></div>
  <a class="linkbtn" href="login.html">⊞ Sign-in screens</a><span class="proto-tag">● Static Prototype</span>
  <div class="userchip"><div class="avatar">${u[2]}</div><div class="who"><b>${u[0]}</b><span>${u[1]}</span></div></div></header>`;
}
function page(role, active, title, sub, actions, content, extraScript=""){
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — ${title}</title><link rel="stylesheet" href="styles.css"></head><body>
${topbar(role)}
<div class="shell"><aside class="sidebar">${sidebar(role,active)}</aside><main class="content">
<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>${actions||""}</div>
${content}
</main></div>
<script>document.addEventListener('click',e=>{if(e.target.classList.contains('chip'))e.target.classList.toggle('on');if(e.target.parentElement&&e.target.parentElement.classList.contains('seg')&&e.target.tagName==='BUTTON'){[...e.target.parentElement.children].forEach(b=>b.classList.remove('on'));e.target.classList.add('on');}});${extraScript}</script>
</body></html>`;
}

/* ============ LANDING + AUTH ============ */
w("index.html", `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — Prototype</title><link rel="stylesheet" href="styles.css"></head><body><div class="landing"><div class="logo">PC</div><h1>Prestige Capability Development Centre</h1><p>Static design prototype · choose a portal to explore</p><div class="role-cards"><a href="admin-dashboard.html"><div class="ic">◑</div><b>Admin Portal</b><span>Domains, mentors, students, campaigns</span></a><a href="mentor-dashboard.html"><div class="ic">◆</div><b>Mentor Portal</b><span>Case studies, responses, students</span></a><a href="student-dashboard.html"><div class="ic">✦</div><b>Student Portal</b><span>Assessments, capability growth</span></a></div><a class="btn btn-ghost" style="margin-top:26px" href="login.html">View sign-in screens →</a></div></body></html>`);

const authBrand = `<div class="auth-brand"><div class="logo">PC</div><h1>Prestige Capability<br>Development Centre</h1><p>An AI-powered learning platform that measures how you think — not just what you answer.</p><ul><li><span class="tick">✓</span> Real-world case studies, AI-evaluated</li><li><span class="tick">✓</span> Rapid-fire questioning that rewards understanding</li><li><span class="tick">✓</span> Capability growth across levels</li></ul></div>`;
w("login.html", `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — Login</title><link rel="stylesheet" href="styles.css"></head><body><div class="authpage">${authBrand}<div class="auth-form"><div class="auth-tabs"><a class="active" href="login.html">Login</a><a href="set-password.html">Set Password</a></div><h2>Welcome back</h2><p class="sub">Sign in to your PCDC account.</p><div class="field"><label>Email</label><input value="sanjay.k@pibm.in"></div><div class="field"><label>Password</label><input type="password" value="••••••••"></div><div class="flex between" style="margin-bottom:18px"><label class="switchbox"><input type="checkbox" checked> Remember me</label><span class="crumb">Forgot password?</span></div><a class="btn btn-primary" style="width:100%;justify-content:center" href="index.html">Sign in</a><p class="muted" style="font-size:12.5px;text-align:center;margin-top:16px">New users receive a temporary password by email.</p></div></div></body></html>`);
w("set-password.html", `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCDC — Set Password</title><link rel="stylesheet" href="styles.css"></head><body><div class="authpage">${authBrand}<div class="auth-form"><div class="auth-tabs"><a href="login.html">Login</a><a class="active" href="set-password.html">Set Password</a></div><h2>Set your password</h2><p class="sub">First-time login — replace your temporary password.</p><div class="field"><label>Email</label><input value="sanjay.k@pibm.in" disabled></div><div class="field"><label>Temporary password</label><input type="password" placeholder="From your registration email"></div><div class="field"><label>New password</label><input type="password" placeholder="Create a new password"></div><div class="field"><label>Confirm new password</label><input type="password" placeholder="Re-enter new password"></div><a class="btn btn-primary" style="width:100%;justify-content:center" href="login.html">Set password &amp; continue</a></div></div></body></html>`);

/* helper bits */
const capRows = (rows)=>rows.map(r=>`<div class="cap-row"><div class="nm">${r[0]}</div><div class="bar"><i style="width:${r[1]}%"></i></div><div class="vl">${r[1]}</div></div>`).join("");
const CAPS = {
  "Cognitive Capabilities":["Analytical Thinking","Strategic Thinking","Decision Making"],
  "Leadership Capabilities":["Communication","Influence","Negotiation","Conflict Resolution","Team Management"],
  "Entrepreneurial Capabilities":["Opportunity Recognition","Innovation","Business Model Thinking","Risk Assessment","Resourcefulness"],
  "Professional Capabilities":["Professional Judgment","Business Acumen","Execution Orientation","Learning Agility","Adaptability"]
};
const SUBJECTS = ["Finance","Marketing","HR","Operations"];
const BLOOM = ["Remember","Understand","Apply","Analyse","Evaluate","Create"];
// grouped capability chips (on = preselected names)
const capChips = (on=[])=>Object.entries(CAPS).map(([g,list])=>`<div class="capgroup"><div class="gh">${g}</div><div class="chips">${list.map(c=>`<span class="chip ${on.includes(c)?'on':''}">${c}</span>`).join("")}</div></div>`).join("");
// mark chip for tables: [type] -> html. type: 'c'=completed n/10, 'i'=incomplete n/7, 'r'=rejected
const markChip = (t,n)=> t==='r' ? `<span class="badge b-red">Rejected</span>` : t==='i' ? `<span class="badge b-amber">${n} / 7 · Incomplete</span>` : `<span class="badge b-green">${n} / 10 · Completed</span>`;

/* ============ ADMIN ============ */
w("admin-dashboard.html", page("admin","dashboard","Dashboard","Institution overview across all domains.",
`<div class="flex"><a class="btn btn-ghost" href="admin-mentor-invite.html">+ Invite Mentor</a><a class="btn btn-primary" href="admin-student-invite.html">+ Invite Student</a></div>`,
`<div class="grid cards-4"><div class="card stat"><div class="label"><span class="ic">▣</span>Subjects</div><div class="num">4</div><div class="sub">Finance, Marketing, HR, Operations</div></div><div class="card stat"><div class="label"><span class="ic">◑</span>Mentors</div><div class="num">14</div><div class="sub">2 invited</div></div><div class="card stat"><div class="label"><span class="ic">◍</span>Students</div><div class="num">320</div><div class="sub">All subjects</div></div><div class="card stat"><div class="label"><span class="ic">◆</span>Campaigns</div><div class="num">12</div><div class="sub">Live now</div></div></div>
<div class="grid cards-2 mt"><div class="card"><h3>Average capability by subject</h3>${capRows([["Marketing",74],["Finance",68],["Operations",71],["HR",63]])}</div><div class="card"><h3>Recent activity</h3><ul class="activity"><li><span class="ai">✦</span><div>Dr. S. Patni launched <b>Market Entry Crisis</b><br><small>Marketing · 20 min ago</small></div></li><li><span class="ai">◍</span><div><b>60 students</b> imported (bulk)<br><small>Finance · 2 hours ago</small></div></li><li><span class="ai">◑</span><div>Mentor <b>R. Khan</b> accepted invite<br><small>Operations · Yesterday</small></div></li></ul></div></div>`));

w("admin-subjects.html", page("admin","subjects","Subjects","Master list of subjects (configurable by Super Admin). Add or delete subjects.",
`<a class="btn btn-primary" href="admin-subject-add.html">+ Add Subject</a>`,
`<div class="info" style="margin-bottom:14px">⚙ Super Admin configuration · Subjects are one of the four case-study mapping parameters.</div>
<div class="card"><table><thead><tr><th>Subject</th><th>Mentors</th><th>Students</th><th>Case Studies</th><th>Status</th><th></th></tr></thead><tbody>
${[["Finance",2,64,7,"Active"],["Marketing",3,72,9,"Active"],["HR",2,40,5,"Active"],["Operations",2,48,6,"Active"]].map(d=>`<tr><td><b>${d[0]}</b></td><td>${d[1]}</td><td>${d[2]}</td><td>${d[3]}</td><td><span class="badge b-green">${d[4]}</span></td><td class="right"><button class="btn btn-danger btn-sm">Delete</button></td></tr>`).join("")}
</tbody></table></div>`));

w("admin-subject-add.html", page("admin","subjects","Add Subject","Create a subject. Subjects anchor students and case studies.","",
`<span class="crumb" onclick="location.href='admin-subjects.html'">← Subjects</span>
<div class="card" style="max-width:620px"><div class="field"><label>Subject name</label><input placeholder="e.g. Finance"></div><div class="field"><label>Description</label><textarea rows="3" placeholder="Short description..."></textarea></div><div class="field"><label>Status</label><div class="seg"><button class="on">Active</button><button>Draft</button></div></div><div class="form-actions"><a class="btn btn-ghost" href="admin-subjects.html">Cancel</a><a class="btn btn-primary" href="admin-subjects.html">Save Subject</a></div></div>`));

w("admin-capabilities.html", page("admin","capabilities","Capabilities","The capability framework (configurable by Super Admin). Case studies map to one or more capabilities.","",
`<div class="info" style="margin-bottom:16px">⚙ Super Admin configuration · grouped into four families. Add or remove capabilities per family.</div>
${Object.entries(CAPS).map(([g,list])=>`<div class="card" style="margin-bottom:16px"><div class="flex between" style="margin-bottom:12px"><h3 style="margin:0">${g}</h3><button class="btn btn-ghost btn-sm">+ Add capability</button></div><div class="chips">${list.map(c=>`<span class="chip on">${c} <b style="margin-left:6px;opacity:.7">✕</b></span>`).join("")}</div></div>`).join("")}`));

w("admin-marks.html", page("admin","marks","Marks Scheme","How assignments are scored (configurable by Super Admin).","",
`<div class="info" style="margin-bottom:16px">⚙ Super Admin configuration · AI evaluates answers against this scheme. Marks appear on both student and faculty interfaces.</div>
<div class="grid cards-3">
  <div class="card"><h3>✓ Completed assignment</h3><div class="markbig"><span class="v">10</span><span class="d">total</span></div>
    <div class="mt"><div class="markrow"><span>Questions &amp; Answers</span><b>7</b></div><div class="markrow"><span>Rapid-Fire</span><b>3</b></div></div></div>
  <div class="card"><h3>◑ Incomplete (≥ 70%)</h3><div class="markbig"><span class="v">7</span><span class="d">total</span></div>
    <div class="mt"><div class="markrow"><span>Questions &amp; Answers</span><b>5</b></div><div class="markrow"><span>Rapid-Fire</span><b>2</b></div></div></div>
  <div class="card"><h3>✕ Less than 70%</h3><div class="rejected mt" style="text-align:left">Rejected — “Try again later. Contact your faculty/admin.”</div>
    <p class="muted mt" style="font-size:12.5px">Faculty can then assign another task to the student.</p></div>
</div>
<div class="card mt" style="max-width:560px"><h3>Configure thresholds</h3>
  <div class="form-grid"><div class="field"><label>Completed — Q&amp;A marks</label><input value="7"></div><div class="field"><label>Completed — Rapid-Fire marks</label><input value="3"></div></div>
  <div class="form-grid"><div class="field"><label>Incomplete — Q&amp;A marks</label><input value="5"></div><div class="field"><label>Incomplete — Rapid-Fire marks</label><input value="2"></div></div>
  <div class="form-grid"><div class="field"><label>Incomplete threshold</label><input value="70%"></div><div class="field"><label>Rejection threshold (below)</label><input value="70%"></div></div>
  <div class="form-actions"><button class="btn btn-primary">Save Scheme</button></div></div>`));

w("admin-mentors.html", page("admin","mentors","Mentors / Faculty","Invite faculty and assign their department, domains and experience.",
`<a class="btn btn-primary" href="admin-mentor-invite.html">+ Invite Mentor</a>`,
`<div class="toolbar"><div class="search">⌕ <input placeholder="Search mentors..."></div></div>
<div class="card"><table><thead><tr><th>Mentor</th><th>Department</th><th>Domains</th><th>Experience</th><th>Status</th></tr></thead><tbody>
<tr><td><div class="uname"><span class="av">SP</span><div><b>Dr. Sanjeev Patni</b><span>s.patni@pibm.in</span></div></div></td><td>Marketing</td><td><span class="badge b-blue">Marketing</span> <span class="badge b-blue">Entrepreneurship</span></td><td>14 yrs</td><td><span class="badge b-green">Active</span></td></tr>
<tr><td><div class="uname"><span class="av">AM</span><div><b>Aarti Menon</b><span>a.menon@pibm.in</span></div></div></td><td>Finance</td><td><span class="badge b-blue">Finance</span></td><td>9 yrs</td><td><span class="badge b-green">Active</span></td></tr>
<tr><td><div class="uname"><span class="av">VN</span><div><b>Vikram Nair</b><span>v.nair@pibm.in</span></div></div></td><td>HR</td><td><span class="badge b-blue">Human Resources</span></td><td>6 yrs</td><td><span class="badge b-amber">Invited</span></td></tr>
</tbody></table></div>`));

w("admin-mentor-invite.html", page("admin","mentors","Invite Mentor / Faculty","They receive an email with a temporary password and set a new one on first login.","",
`<span class="crumb" onclick="location.href='admin-mentors.html'">← Mentors</span>
<div class="card" style="max-width:700px"><div class="form-grid"><div class="field"><label>Full name</label><input placeholder="e.g. Dr. Sanjeev Patni"></div><div class="field"><label>Email</label><input placeholder="name@pibm.in"></div></div>
<div class="form-grid"><div class="field"><label>Department</label><select><option>Marketing</option><option>Finance</option><option>Operations</option><option>Human Resources</option><option>Entrepreneurship</option></select></div><div class="field"><label>Experience</label><select><option>0–3 years</option><option>3–6 years</option><option selected>6–10 years</option><option>10+ years</option></select></div></div>
<div class="field"><label>Assign subjects (multi-select)</label><div class="chips">${SUBJECTS.map((s,i)=>`<span class="chip ${i===1?'on':''}">${s}</span>`).join("")}</div><div class="hint">The mentor can author case studies and see responses only for these subjects.</div></div>
<div class="form-actions"><a class="btn btn-ghost" href="admin-mentors.html">Cancel</a><a class="btn btn-primary" href="admin-mentors.html">Send Invitation</a></div></div>`));

w("admin-students.html", page("admin","students","Students","Invite students individually or bulk-import. Each is mapped to a domain at Level 1.",
`<div class="flex"><a class="btn btn-ghost" href="admin-student-import.html">⭳ Bulk Import</a><a class="btn btn-primary" href="admin-student-invite.html">+ Invite Student</a></div>`,
`<div class="toolbar"><div class="search">⌕ <input placeholder="Search students..."></div></div>
<div class="card"><table><thead><tr><th>Student</th><th>Subject</th><th>Level</th><th>Status</th></tr></thead><tbody>
<tr><td><div class="uname"><span class="av">SK</span><div><b>Sanjay Kumar</b><span>sanjay.k@pibm.in</span></div></div></td><td>Marketing</td><td><span class="lv lv2">L2 Intermediate</span></td><td><span class="badge b-green">Active</span></td></tr>
<tr><td><div class="uname"><span class="av">PM</span><div><b>Priya Mehta</b><span>priya.m@pibm.in</span></div></div></td><td>Finance</td><td><span class="lv lv3">L3 Hard</span></td><td><span class="badge b-green">Active</span></td></tr>
<tr><td><div class="uname"><span class="av">AS</span><div><b>Amit Sharma</b><span>amit.s@pibm.in</span></div></div></td><td>Marketing</td><td><span class="lv lv1">L1 Beginner</span></td><td><span class="badge b-red">Locked</span></td></tr>
<tr><td><div class="uname"><span class="av">TD</span><div><b>Tara Das</b><span>tara.d@pibm.in</span></div></div></td><td>HR</td><td><span class="lv lv1">L1 Beginner</span></td><td><span class="badge b-amber">Invited</span></td></tr>
</tbody></table></div>`));

w("admin-student-invite.html", page("admin","students","Invite Student","Send a single invitation. The student gets an email with a temporary password.","",
`<span class="crumb" onclick="location.href='admin-students.html'">← Students</span>
<div class="card" style="max-width:640px"><div class="form-grid"><div class="field"><label>Full name</label><input placeholder="e.g. Sanjay Kumar"></div><div class="field"><label>Email</label><input placeholder="name@pibm.in"></div></div>
<div class="form-grid"><div class="field"><label>College ID</label><input placeholder="PIBM-XXXX"></div><div class="field"><label>Subject</label><select>${SUBJECTS.map(s=>`<option>${s}</option>`).join("")}</select><div class="hint">Student is mapped to this subject.</div></div></div>
<div class="form-actions"><a class="btn btn-ghost" href="admin-students.html">Cancel</a><a class="btn btn-primary" href="admin-students.html">Send Invitation</a></div>
<div class="info mt">Need to add many at once? Use <a href="admin-student-import.html" style="text-decoration:underline"><b>Bulk Import</b></a>.</div></div>`));

w("admin-student-import.html", page("admin","students","Bulk Import Students","Upload a CSV from college data. Each row is mapped to a domain and starts at Level 1.","",
`<span class="crumb" onclick="location.href='admin-students.html'">← Students</span>
<div class="card" style="max-width:760px"><div class="dropzone"><div style="font-size:30px">⭳</div><b>Drop your CSV here</b> or click to browse<div class="hint" style="margin-top:6px">Required columns: name, email, college_id, domain</div></div>
<h3 style="margin-top:22px">Preview (first 3 rows)</h3><table><thead><tr><th>Name</th><th>Email</th><th>College ID</th><th>Subject</th></tr></thead><tbody><tr><td>Sanjay Kumar</td><td>sanjay.k@pibm.in</td><td>PIBM-2401</td><td>Marketing</td></tr><tr><td>Priya Mehta</td><td>priya.m@pibm.in</td><td>PIBM-2402</td><td>Finance</td></tr><tr><td>Neha Rao</td><td>neha.r@pibm.in</td><td>PIBM-2403</td><td>Operations</td></tr></tbody></table>
<div class="form-actions" style="margin-top:18px"><a class="btn btn-ghost" href="admin-students.html">Cancel</a><a class="btn btn-primary" href="admin-students.html">Import 60 students</a></div></div>`));

w("admin-campaigns.html", page("admin","campaigns","Campaigns","All case-study campaigns generated by faculty. Filter by faculty, open a campaign to see responses.","",
`<div class="toolbar"><div class="picker">Faculty: <select><option>All faculty</option><option selected>Dr. Sanjeev Patni</option><option>Aarti Menon</option><option>Vikram Nair</option></select></div><div class="picker">Subject: <select><option>All subjects</option>${SUBJECTS.map(s=>`<option>${s}</option>`).join("")}</select></div></div>
<div class="card"><table><thead><tr><th>Campaign (Case Study)</th><th>Faculty</th><th>Subject</th><th>Difficulty</th><th>Time bracket</th><th>Responses</th><th>Status</th></tr></thead><tbody>
${[["Market Entry Crisis","Marketing","lv2","L2","17–19 Jun","23 / 32","Live"],["Brand Revival","Marketing","lv1","L1","15–18 Jun","40 / 52","Live"],["Cost Optimisation","Operations","lv3","L3","16–20 Jun","8 / 18","Live"],["Hiring Crunch","HR","lv4","L4","10–14 Jun","61 / 61","Closed"]].map(c=>`<tr class="click" onclick="location.href='admin-campaign-detail.html'"><td><b>${c[0]}</b></td><td>Dr. S. Patni</td><td>${c[1]}</td><td><span class="lv ${c[2]}">${c[3]}</span></td><td>${c[4]}</td><td>${c[5]}</td><td><span class="badge ${c[6]==='Live'?'b-blue':'b-slate'}">${c[6]}</span></td></tr>`).join("")}
</tbody></table></div>`));

w("admin-campaign-detail.html", page("admin","campaigns","Market Entry Crisis","By Dr. Sanjeev Patni · Marketing · Difficulty L2 · Time bracket 17–19 Jun. Click a student for their scorecard.","",
`<span class="crumb" onclick="location.href='admin-campaigns.html'">← Campaigns</span>
<div class="grid cards-4"><div class="card stat"><div class="label">Responses</div><div class="num">23</div></div><div class="card stat"><div class="label">Avg. mark</div><div class="num">7.6<span style="font-size:16px;color:var(--muted)">/10</span></div></div><div class="card stat"><div class="label">Completed</div><div class="num">17</div></div><div class="card stat"><div class="label">Rejected</div><div class="num">2</div></div></div>
<div class="card mt"><table><thead><tr><th>Student</th><th>Completion</th><th>Marks</th><th>Status</th><th></th></tr></thead><tbody>
<tr class="click" onclick="location.href='admin-scorecard.html'"><td><div class="uname"><span class="av">SK</span><div><b>Sanjay Kumar</b></div></div></td><td>100%</td><td><b>8 / 10</b><br><span class="muted" style="font-size:12px">QA 6/7 · RF 2/3</span></td><td>${markChip('c',8)}</td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='admin-scorecard.html'"><td><div class="uname"><span class="av">NR</span><div><b>Neha Rao</b></div></div></td><td>80%</td><td><b>5 / 7</b><br><span class="muted" style="font-size:12px">QA 4/5 · RF 1/2</span></td><td>${markChip('i',5)}</td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='admin-scorecard.html'"><td><div class="uname"><span class="av">AS</span><div><b>Amit Sharma</b></div></div></td><td>55%</td><td><span class="muted">—</span></td><td>${markChip('r')}</td><td class="right">›</td></tr>
</tbody></table></div>`));

const scorecardBody = (back, opts={})=>`<span class="crumb" onclick="location.href='${back}'">← Back</span>
${opts.actions||""}
<div class="grid cards-2"><div class="card"><h3>Submitted answer</h3><p class="muted" style="font-size:13px">"I'd segment the market and re-enter with a value-tier product while protecting the premium line, paired with targeted retention offers and a phased rollout to limit risk..."</p><h3 style="margin-top:18px">Rapid-fire Q&amp;A <span class="muted" style="font-weight:400">(AI-generated from the student's answer)</span></h3><div class="ai-bubble"><div class="ai">AI</div><div><b>Why this strategy over a price cut?</b><br><span class="muted">"Protects brand equity and margins." — <i>strong rationale.</i></span></div></div><div class="ai-bubble"><div class="ai">AI</div><div><b>How would the competitor respond?</b><br><span class="muted">"Likely match the value tier; I'd pre-empt with loyalty lock-ins." — <i>good foresight.</i></span></div></div></div>
<div class="card"><h3>Marks</h3><div class="markbig"><span class="v">8</span><span class="d">/ 10</span></div><span class="badge b-green" style="margin-top:8px;display:inline-flex">Completed</span>
<div class="mt"><div class="markrow"><span>Questions &amp; Answers</span><b>6 / 7</b></div><div class="markrow"><span>Rapid-Fire</span><b>2 / 3</b></div></div>
<h3 style="margin-top:18px">AI quality assessment</h3>${capRows([["Thinking Depth",84],["Logic",82],["Creativity",78],["Practicality",80],["Risk Awareness",76],["Reflection",88]])}</div></div>`;
w("admin-scorecard.html", page("admin","campaigns","Scorecard — Sanjay Kumar","Market Entry Crisis · Marketing · Difficulty L2 · Time bracket 17–19 Jun",`<span class="badge b-green" style="font-size:14px">8 / 10 · Completed</span>`, scorecardBody("admin-campaign-detail.html")));

w("admin-analytics.html", page("admin","analytics","Analytics","Cross-domain rollup of completion and performance.","",
`<div class="grid cards-3"><div class="card stat"><div class="label">Avg. capability score</div><div class="num">68</div></div><div class="card stat"><div class="label">Completion rate</div><div class="num">72%</div></div><div class="card stat"><div class="label">Students at risk</div><div class="num">17</div></div></div>
<div class="card mt"><h3>Domain performance</h3><table><thead><tr><th>Subject</th><th>Avg. score</th><th>Completion</th><th>Pass rate</th></tr></thead><tbody><tr><td>Marketing</td><td>74</td><td>81%</td><td>76%</td></tr><tr><td>Finance</td><td>68</td><td>74%</td><td>69%</td></tr><tr><td>Operations</td><td>71</td><td>70%</td><td>72%</td></tr></tbody></table></div>`));

/* ============ MENTOR ============ */
w("mentor-dashboard.html", page("mentor","dashboard","Mentor Dashboard","Scoped to your domains only: Marketing &amp; Entrepreneurship.",
`<a class="btn btn-primary" href="mentor-case-create.html">+ Create Case Study</a>`,
`<div class="info" style="margin-bottom:16px">You only see students, case studies and responses within your assigned domains.</div>
<div class="grid cards-4"><div class="card stat"><div class="label"><span class="ic">◆</span>My case studies</div><div class="num">11</div><div class="sub">3 live</div></div><div class="card stat"><div class="label"><span class="ic">◍</span>My students</div><div class="num">124</div><div class="sub">2 domains</div></div><div class="card stat"><div class="label"><span class="ic">⧖</span>Awaiting review</div><div class="num">9</div></div><div class="card stat"><div class="label"><span class="ic">⚑</span>Locked students</div><div class="num">4</div></div></div>
<div class="grid cards-2 mt"><div class="card"><h3>Needs attention</h3><ul class="activity"><li><span class="ai" style="background:var(--red-bg);color:var(--red)">⚑</span><div><b>Amit Sharma</b> locked at L1 (4 attempts)<br><small>Marketing</small></div><div style="margin-left:auto"><a class="btn btn-ghost btn-sm" href="mentor-scorecard.html">Review</a></div></li><li><span class="ai" style="background:var(--amber-bg);color:var(--amber)">⧖</span><div><b>Market Entry Crisis</b> closes in 1 day<br><small>9 of 32 not started</small></div></li></ul></div>
<div class="card"><h3>My live case studies</h3><table><tbody><tr class="click" onclick="location.href='mentor-responses.html'"><td><b>Market Entry Crisis</b><br><span class="muted">Marketing · L2</span></td><td class="right"><span class="muted">23/32</span> ›</td></tr><tr class="click" onclick="location.href='mentor-responses.html'"><td><b>Brand Revival</b><br><span class="muted">Marketing · L1</span></td><td class="right"><span class="muted">40/52</span> ›</td></tr></tbody></table></div></div>`));

w("mentor-cases.html", page("mentor","cases","My Case Studies","Author case studies for your domains and launch them.",
`<a class="btn btn-primary" href="mentor-case-create.html">+ Create Case Study</a>`,
`<div class="card"><table><thead><tr><th>Title</th><th>Subject(s)</th><th>Difficulty</th><th>Time bracket</th><th>Responses</th><th>Status</th><th></th></tr></thead><tbody>
<tr><td><b>Market Entry Crisis</b></td><td>Marketing</td><td><span class="lv lv2">L2</span></td><td>17–19 Jun</td><td>23 / 32</td><td><span class="badge b-blue">Live</span></td><td class="right"><a class="btn btn-ghost btn-sm" href="mentor-responses.html">Responses</a></td></tr>
<tr><td><b>Brand Revival</b></td><td>Marketing</td><td><span class="lv lv1">L1</span></td><td>15–18 Jun</td><td>40 / 52</td><td><span class="badge b-blue">Live</span></td><td class="right"><a class="btn btn-ghost btn-sm" href="mentor-responses.html">Responses</a></td></tr>
<tr><td><b>Growth Levers</b></td><td>Marketing, Operations</td><td><span class="lv lv3">L3</span></td><td>—</td><td>—</td><td><span class="badge b-slate">Draft</span></td><td class="right"><a class="btn btn-ghost btn-sm" href="mentor-case-create.html">Edit</a></td></tr>
</tbody></table></div>`));

w("mentor-case-create.html", page("mentor","cases","Create Case Study","Build a case study, map it to the four parameters, add questions and assign it.","",
`<span class="crumb" onclick="location.href='mentor-cases.html'">← My Case Studies</span>
<div class="card"><h3>1 · Details &amp; content</h3>
<div class="field"><label>Title</label><input placeholder="e.g. Market Entry Crisis"></div>
<div class="field"><label>Case content</label><div class="seg" style="margin-bottom:12px"><button class="on" onclick="csMode('type')">✎ Type content</button><button onclick="csMode('upload')">⭳ Upload file</button></div>
<div id="cs-type"><textarea class="answer" placeholder="Type the scenario: situation, background, data, characters, constraints, objective..."></textarea></div>
<div id="cs-upload" style="display:none"><div class="dropzone"><div style="font-size:28px">⭳</div><b>Drop a file</b> or click to browse<div class="hint" style="margin-top:6px">PDF, DOCX or TXT · the case content will be parsed</div></div></div></div></div>

<div class="card mt"><h3>2 · Mapping matrix</h3>
<div class="field"><label>a. Capabilities <span class="muted" style="font-weight:400">(one or more)</span></label>${capChips(["Strategic Thinking","Decision Making"])}</div>
<div class="form-grid">
  <div class="field"><label>b. Subject <span class="muted" style="font-weight:400">(one or more)</span></label><div class="chips">${SUBJECTS.map((s,i)=>`<span class="chip ${i===1?'on':''}">${s}</span>`).join("")}</div><div class="hint">A student in any selected subject can see this case study.</div></div>
  <div class="field"><label>c. Difficulty level</label><div class="seg"><button>1</button><button class="on">2</button><button>3</button><button>4</button></div></div>
</div>
<div class="field"><label>d. Bloom's Taxonomy <span class="muted" style="font-weight:400">(one or more)</span></label><div class="chips">${BLOOM.map((b,i)=>`<span class="chip ${i>1&&i<4?'on':''}">${b}</span>`).join("")}</div></div></div>

<div class="card mt"><h3>3 · Questions &amp; time-limit</h3>
<div class="qitem"><div class="qh"><span>Question 1</span><b style="cursor:pointer;opacity:.6">✕</b></div><input class="qinput" style="width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;font-size:13.5px" placeholder="Type the question..." value="Diagnose the cause of the sales decline and recommend a recovery strategy."></div>
<div class="qitem"><div class="qh"><span>Question 2</span><b style="cursor:pointer;opacity:.6">✕</b></div><input class="qinput" style="width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;font-size:13.5px" placeholder="Type the question..." value="What risks does your strategy carry and how would you mitigate them?"></div>
<button class="btn btn-ghost btn-sm">+ Add question</button>
<div class="field mt" style="max-width:220px"><label>Time-limit (minutes)</label><input value="45"></div>
<div class="info">⚡ Rapid-Fire questions are generated by the AI automatically, based on each student's answers.</div></div>

<div class="card mt"><h3>4 · Assign &amp; time bracket</h3>
<div class="field"><label>Assign to students</label><div class="chips"><span class="chip on">All students in subject</span><span class="chip">Select students…</span></div></div>
<div class="form-grid"><div class="field"><label>Available from</label><input type="date" value="2026-06-17"></div><div class="field"><label>Available to</label><input type="date" value="2026-06-19"></div></div>
<div class="form-actions"><a class="btn btn-ghost" href="mentor-cases.html">Save Draft</a><a class="btn btn-primary" href="mentor-cases.html">Assign &amp; Publish</a></div></div>`,
`function csMode(m){document.getElementById('cs-type').style.display=m==='type'?'block':'none';document.getElementById('cs-upload').style.display=m==='upload'?'block':'none';}`));

w("mentor-responses.html", page("mentor","responses","Responses — Market Entry Crisis","Marketing · Difficulty L2 · 17–19 Jun · 23 of 32 submitted. Click a student for their scorecard.","",
`<span class="crumb" onclick="location.href='mentor-cases.html'">← My Case Studies</span>
<div class="card"><table><thead><tr><th>Student</th><th>Completion</th><th>Marks</th><th>Status</th><th></th></tr></thead><tbody>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">SK</span><div><b>Sanjay Kumar</b></div></div></td><td>100%</td><td><b>8 / 10</b><br><span class="muted" style="font-size:12px">QA 6/7 · RF 2/3</span></td><td>${markChip('c',8)}</td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">NR</span><div><b>Neha Rao</b></div></div></td><td>80%</td><td><b>5 / 7</b><br><span class="muted" style="font-size:12px">QA 4/5 · RF 1/2</span></td><td>${markChip('i',5)}</td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">AS</span><div><b>Amit Sharma</b></div></div></td><td>55%</td><td><span class="muted">—</span></td><td>${markChip('r')}</td><td class="right">›</td></tr>
</tbody></table></div>`));

w("mentor-scorecard.html", page("mentor","responses","Scorecard — Amit Sharma","Marketing · Market Entry Crisis · Difficulty L2 · 17–19 Jun",`<button class="btn btn-primary">+ Assign another task</button>`,
`<span class="crumb" onclick="location.href='mentor-responses.html'">← Responses</span>
<div class="warn" style="margin-bottom:18px;">✕ Submission was <b style="margin:0 4px">55% complete</b> (below 70%) → <b style="margin:0 4px">Rejected</b>. Student sees: “Try again later. Contact your faculty/admin.” You can assign another task.</div>
<div class="grid cards-2"><div class="card"><h3>Submitted answer</h3><p class="muted" style="font-size:13px">"I would reposition the brand toward younger buyers and cut prices to regain share..." <i>(incomplete — implementation plan and risks not submitted)</i></p><h3 style="margin-top:18px">Rapid-fire Q&amp;A</h3><div class="ai-bubble"><div class="ai">AI</div><div><b>What risks exist in cutting prices?</b><br><span class="muted">"It may reduce margins" — <i>shallow.</i></span></div></div></div>
<div class="card"><h3>Marks</h3><div class="rejected">Rejected · 55% complete</div><div class="mt"><div class="markrow"><span>Questions &amp; Answers</span><b>—</b></div><div class="markrow"><span>Rapid-Fire</span><b>—</b></div></div>
<h3 style="margin-top:18px">Mentor feedback</h3><textarea class="answer" style="min-height:80px">Your submission was incomplete. Please attempt the full case (solution, risks, plan). I'm assigning a fresh task.</textarea><div class="form-actions"><button class="btn btn-ghost btn-sm">Save feedback</button><button class="btn btn-primary btn-sm">+ Assign another task</button></div></div></div>`));

w("mentor-students.html", page("mentor","students","My Students","Students in your assigned domains only.","",
`<div class="card"><table><thead><tr><th>Student</th><th>Subject</th><th>Level</th><th>Avg. score</th><th>Status</th><th></th></tr></thead><tbody>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">SK</span><div><b>Sanjay Kumar</b></div></div></td><td>Marketing</td><td><span class="lv lv2">L2</span></td><td>78</td><td><span class="badge b-green">On track</span></td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">AS</span><div><b>Amit Sharma</b></div></div></td><td>Marketing</td><td><span class="lv lv1">L1</span></td><td>31</td><td><span class="badge b-red">Locked</span></td><td class="right">›</td></tr>
<tr class="click" onclick="location.href='mentor-scorecard.html'"><td><div class="uname"><span class="av">MJ</span><div><b>Manish Joshi</b></div></div></td><td>Entrepreneurship</td><td><span class="lv lv3">L3</span></td><td>85</td><td><span class="badge b-green">Top</span></td><td class="right">›</td></tr>
</tbody></table></div>`));

/* ============ STUDENT ============ */
w("student-dashboard.html", page("student","dashboard","Dashboard","Marketing track · Level 2 — Intermediate.","",
`<div class="hero"><div><h2>Welcome back, Sanjay 👋</h2><p>Keep building your capabilities.</p></div><div class="score-ring"><div class="n">72</div><div class="l">Capability Score</div></div></div>
<div class="card mt"><h3>Your progress</h3><div class="level-track"><div class="step done"><div class="ball">✓</div><div class="lab">L1 Beginner</div></div><div class="line"></div><div class="step current"><div class="ball">2</div><div class="lab">L2 Intermediate</div></div><div class="line"></div><div class="step locked"><div class="ball">🔒</div><div class="lab">L3 Hard</div></div></div></div>
<div class="grid cards-2 mt"><div class="card"><h3>Today's tasks</h3><ul class="activity"><li><span class="ai">◆</span><div><b>Market Entry Crisis</b> · Difficulty L2<br><small>Assigned by Dr. S. Patni · 17–19 Jun · 45 min</small></div><div style="margin-left:auto"><a class="btn btn-primary btn-sm" href="student-assessment.html">Start</a></div></li><li><span class="ai" style="background:var(--green-bg);color:var(--green)">✓</span><div><b>Brand Revival</b> · Difficulty L1<br><small>Completed · 8 / 10</small></div><div style="margin-left:auto"><span class="badge b-green">8 / 10</span></div></li></ul></div>
<div class="card"><h3>Your capabilities</h3>${capRows([["Problem Solving",80],["Communication",74],["Strategic Thinking",68],["Decision Making",71]])}</div></div>`));

w("student-cases.html", page("student","cases","My Case Studies","Marketing · Level 2. Pass each level to unlock the next.","",
`<div class="grid cards-3"><div class="card case-card"><div class="meta"><span class="lv lv2">L2</span><span class="timechip">⧖ 45 min</span></div><h4>Market Entry Crisis</h4><p>Recommend a market-entry strategy for a struggling brand.</p><a class="btn btn-primary btn-sm" href="student-assessment.html">Start assessment</a></div>
<div class="card case-card"><div class="meta"><span class="lv lv2">L2</span><span class="timechip">⧖ 40 min</span></div><h4>Customer Retention</h4><p>Diagnose churn and design a retention plan.</p><a class="btn btn-primary btn-sm" href="student-assessment.html">Start assessment</a></div>
<div class="card case-card locked"><div class="meta"><span class="lv lv3">L3</span><span class="badge b-slate">🔒 Locked</span></div><h4>Global Expansion</h4><p>Unlocks after you pass Level 2.</p><button class="btn btn-ghost btn-sm" disabled>Locked</button></div></div>`));

w("student-assessment.html", page("student","assess","Market Entry Crisis","Marketing · Level 2 · ⧖ 45:00 remaining","",
`<div class="stepper" id="astepper"><div class="s active" data-step="0"><span class="n">1</span>Briefing</div><div class="s" data-step="1"><span class="n">2</span>Your Answer</div><div class="s" data-step="2"><span class="n">3</span>Rapid-Fire</div><div class="s" data-step="3"><span class="n">4</span>Suggestions</div><div class="s" data-step="4"><span class="n">5</span>Score</div></div>
<div class="astep active" data-step="0"><div class="card"><h3>Scenario</h3><p><b>Role:</b> Marketing Head, ABC Electronics &nbsp; <b>Time:</b> 45 minutes</p><p><b>Situation:</b> Sales dropped 20% over two quarters; a new competitor entered with aggressive pricing. Customer reviews, competitor data and sales trends are provided.</p><p><b>Objective:</b> Recommend a recovery strategy with reasoning, risks and an implementation plan.</p><button class="btn btn-primary mt" onclick="goStep(1)">Start — I'm ready</button></div></div>
<div class="astep" data-step="1"><div class="card"><h3>Your answer</h3><p class="muted" style="font-size:13px;margin-top:-6px">Think first and write in your own words. The AI engages only after you submit.</p><textarea class="answer" placeholder="Type your solution and reasoning..."></textarea><div class="paste-note">⛔ Copy-paste is disabled for this field</div><div class="mt"><button class="btn btn-primary" onclick="goStep(2)">Submit answer →</button></div></div></div>
<div class="astep" data-step="2"><div class="card"><h3>Rapid-Fire Round</h3><p class="muted" style="font-size:13px;margin-top:-6px">The AI asks about your submission to test genuine understanding.</p><div class="qbox"><div class="q">1. Why did you choose this strategy over alternatives?</div><input placeholder="Your answer..."></div><div class="qbox"><div class="q">2. What are the biggest risks in your approach?</div><input placeholder="Your answer..."></div><div class="qbox"><div class="q">3. How would the competitor likely respond?</div><input placeholder="Your answer..."></div><div class="mt"><button class="btn btn-primary" onclick="goStep(3)">Submit responses →</button></div></div></div>
<div class="astep" data-step="3"><div class="card"><h3>AI Suggestions</h3><div class="ai-bubble"><div class="ai">AI</div><div><b>Strengths</b><br><span class="muted">Clear positioning idea and a practical campaign plan.</span></div></div><div class="ai-bubble"><div class="ai">AI</div><div><b>What's missing</b><br><span class="muted">Add a margin/profitability analysis and a fallback if the competitor matches your move.</span></div></div><p class="muted" style="font-size:13px">Revise your answer once based on this feedback — this is your final submission.</p><textarea class="answer" style="min-height:110px" placeholder="Revise your answer (final submission)..."></textarea><div class="mt"><button class="btn btn-primary" onclick="goStep(4)">Submit final answer →</button></div></div></div>
<div class="astep" data-step="4"><div class="grid cards-2"><div class="card"><h3>Your result</h3><div class="markbig"><span class="v">8</span><span class="d">/ 10</span></div><span class="badge b-green" style="margin-top:8px;display:inline-flex">Completed</span><div class="mt"><div class="markrow"><span>Questions &amp; Answers</span><b>6 / 7</b></div><div class="markrow"><span>Rapid-Fire</span><b>2 / 3</b></div></div><p class="muted mt" style="font-size:13px">Your marks are visible to you and your faculty.</p><a class="btn btn-primary" href="student-dashboard.html">Back to dashboard</a></div><div class="card"><h3>AI quality assessment</h3>${capRows([["Thinking Depth",84],["Logic",82],["Creativity",78],["Practicality",80],["Risk Awareness",76],["Reflection",88]])}</div></div></div>`,
`function goStep(n){document.querySelectorAll('#astepper .s').forEach(s=>s.classList.toggle('active',+s.dataset.step===n));document.querySelectorAll('.astep').forEach(s=>s.classList.toggle('active',+s.dataset.step===n));}document.querySelectorAll('#astepper .s').forEach(s=>s.onclick=()=>goStep(+s.dataset.step));`));

w("student-profile.html", page("student","profile","Capability Profile","Your growth over time — you compete against yourself.","",
`<div class="grid cards-2"><div class="card"><h3>Capability scores</h3>${capRows([["Problem Solving",80],["Communication",74],["Strategic Thinking",68],["Decision Making",71],["Innovation",61]])}</div>
<div class="card"><h3>Score trend</h3><svg viewBox="0 0 320 160" style="width:100%;height:auto"><polygon fill="#dbeafe" opacity=".5" points="10,130 60,118 110,100 160,96 210,78 260,64 305,50 305,150 10,150"/><polyline fill="none" stroke="#2563eb" stroke-width="3" points="10,130 60,118 110,100 160,96 210,78 260,64 305,50"/><circle cx="305" cy="50" r="4" fill="#1d4ed8"/></svg><p class="muted" style="font-size:13px">Steady improvement across your last 7 assessments.</p><h3 style="margin-top:14px">Mentor feedback</h3><div class="ai-bubble"><div class="ai">M</div><div><b>Dr. S. Patni</b><br><span class="muted">Strong analysis — quantify risk further next time.</span></div></div></div></div>`));

w("student-notifications.html", page("student","notifications","Notifications","Updates on your assessments and progress.","",
`<div class="card"><ul class="activity"><li><span class="ai" style="background:var(--green-bg);color:var(--green)">✓</span><div><b>Level 3 unlocked!</b> You passed Market Entry Crisis with 82%.<br><small>Just now</small></div></li><li><span class="ai">◆</span><div>New case study: <b>Customer Retention</b> (L2)<br><small>2 hours ago</small></div></li><li><span class="ai" style="background:var(--amber-bg);color:var(--amber)">⧖</span><div><b>Market Entry Crisis</b> closes tomorrow 5:00 PM<br><small>Yesterday</small></div></li><li><span class="ai">✦</span><div>Mentor <b>Dr. S. Patni</b> left feedback<br><small>2 days ago</small></div></li></ul></div>`));

const files = fs.readdirSync(OUT).filter(f=>f.endsWith(".html"));
console.log("WROTE "+files.length+" pages + styles.css to "+OUT);
console.log(files.join("\n"));

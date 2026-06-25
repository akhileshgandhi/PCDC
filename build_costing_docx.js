const fs=require("fs");
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,LevelFormat,HeadingLevel,BorderStyle,WidthType,ShadingType,VerticalAlign,PageNumber,Header,Footer,LineRuleType,TableOfContents,PageBreak}=require("docx");
const NAVY="1F3864",ACC="2E75B6",ZEBRA="F2F6FB",GREY="595959",W=9360;
const LN={line:276,lineRule:LineRuleType.AUTO};
const clean=s=>String(s).replace(/🔶/g,"[verify]");
const runs=t=>{t=clean(t);const o=[];t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).forEach(p=>{if(p.startsWith("**")&&p.endsWith("**"))o.push(new TextRun({text:p.slice(2,-2),bold:true}));else o.push(new TextRun(p));});return o.length?o:[new TextRun(t)];};
const P=(t,o={})=>new Paragraph({spacing:{after:140,...LN},children:[new TextRun({text:clean(t),...o.run})],...o.par});
const B=t=>new Paragraph({numbering:{reference:"bul",level:0},spacing:{after:80,...LN},children:runs(t)});
const N=t=>new Paragraph({numbering:{reference:"num",level:0},spacing:{after:80,...LN},children:runs(t)});
const H1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(clean(t))]});
const H2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun(clean(t))]});
const sp=(a=140)=>new Paragraph({children:[],spacing:{after:a}});
const bd={style:BorderStyle.SINGLE,size:1,color:"C9C9C9"};const bds={top:bd,bottom:bd,left:bd,right:bd,insideHorizontal:bd,insideVertical:bd};
function cell(c,{w,fill,bold,color}={}){const ps=(Array.isArray(c)?c:[c]).map(x=>new Paragraph({spacing:{line:264,lineRule:LineRuleType.AUTO,after:0},children:[new TextRun({text:clean(x),bold:!!bold,size:20,color:color||(bold?"FFFFFF":"1A1A1A")})]}));return new TableCell({width:{size:w,type:WidthType.DXA},shading:fill?{fill,type:ShadingType.CLEAR}:undefined,margins:{top:80,bottom:80,left:140,right:140},verticalAlign:VerticalAlign.CENTER,children:ps});}
function table(cw,head,rows){const r=[new TableRow({tableHeader:true,children:head.map((h,i)=>cell(h,{w:cw[i],fill:ACC,bold:true}))})];rows.forEach((row,ri)=>r.push(new TableRow({children:row.map((c,i)=>cell(c,{w:cw[i],fill:ri%2?ZEBRA:undefined}))})));return new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,borders:bds,rows:r});}
const body=[];const T=t=>{body.push(t);body.push(sp(160));};

// title
body.push(new Paragraph({spacing:{before:2400},alignment:AlignmentType.CENTER,children:[new TextRun({text:"AI Costing & Plan",bold:true,size:50,color:NAVY})]}));
body.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:120},children:[new TextRun({text:"Prestige Capability Development Centre (PCDC)",size:30,color:ACC})]}));
body.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80},children:[new TextRun({text:"UAT (free) → Go-Live · with fallbacks & monthly cost",size:24,color:GREY})]}));
body.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60},children:[new TextRun({text:"[verify] = provider price/limit to confirm (they change often)",size:19,italics:true,color:GREY})]}));
body.push(new Paragraph({children:[new PageBreak()]}));
body.push(new Paragraph({children:[new TextRun({text:"Contents",bold:true,size:28,color:NAVY})],spacing:{after:160}}));
body.push(new TableOfContents("Contents",{hyperlink:true,headingStyleRange:"1-1"}));
body.push(new Paragraph({children:[new PageBreak()]}));

body.push(H1("1. What drives AI cost"));
body.push(P("Cost scales per student, per attempt — every student uses the AI, and a launched campaign creates concurrency spikes (a class doing it together). Each attempt = 3 LLM calls: (1) analyse answer → generate 3–4 rapid-fire questions; (2) grade rapid-fire → suggestions; (3) final scoring (6 dimensions → marks /10)."));
body.push(P("Tokens per attempt: ~7,000 input + ~1,300 output. The case study + rubric dominate the input and are identical for every student in a campaign — the main saving (via caching)."));

body.push(H1("2. Free plan for UAT (tokens that don't expire)"));
body.push(P("Use perpetually-free tiers (rate-limited but always free) — not promotional trial credits that expire in 30–90 days. Perpetual free tiers reset their limits daily and never expire."));
T(table([2600,3000,3760],["Free tier","Model","Use for UAT"],[
["Groq (free)","Llama 3.3 70B (mandated model)","Primary"],
["Google AI Studio / Gemini","Gemini Flash","Secondary"],
["OpenRouter (free models)","Llama & others","Tertiary"],
["Cerebras (free)","Llama 3.3","Quaternary"],
["OpenAI / Anthropic trial credit","—","Avoid (expires)"],
]));
body.push(P("**Fallback chain so UAT never runs dry:** Groq → (on daily limit) Gemini Flash → OpenRouter → Cerebras → queue + retry (and mentor manual review if all are exhausted). Because each free tier resets daily and the chain rotates across providers, tokens effectively never expire and UAT is never blocked."));
body.push(P("**UAT operating notes:** free tiers can't sustain a full class at once — run UAT in small batches, and rely on the Think-First gate (students type for minutes before the AI engages), which naturally staggers calls under the rate limits."));

body.push(H1("3. Go-live: cost-optimal approach for live data"));
[ "Prompt-cache the campaign's case study + rubric (identical for every student) → read at ~0.1× after the first student → up to 80–90% off input tokens.",
  "Tier models by task: Llama 3.3 70B / Gemini Flash for rapid-fire generation + suggestions; a stronger model (Llama 3.3 405B, Claude Sonnet 4.6, or GPT-4o) for final scoring.",
  "Batch the scoring (not real-time) through a batch lane (~50% cheaper).",
  "Queue + global concurrency cap sized to provider rate limits → no 429 storms when a class hits together.",
  "Fallback chain: paid primary → secondary → mentor manual review, so peaks/outages degrade gracefully and never fail a student.",
  "Cap output tokens + structured JSON output — scoring output is small; no waste, no re-tries.",
].forEach(t=>body.push(B(t)));
body.push(P("Self-hosting Llama 3.3 on a dedicated GPU costs ~$700–1,500/month running 24/7 — only cheaper than API at very high, steady volume. At the volumes below, hosted API is cheaper and simpler.",{run:{italics:true,color:GREY}}));

body.push(H1("4. Average monthly cost (by student volume)"));
body.push(P("Assumptions [verify]: ~10 attempts per student per month; ~7k in + 1.3k out per attempt, with caching of the shared case study."));
T(table([2400,4060,2900],["Approach","Models","~Cost / attempt"],[
["Budget","Gemini Flash (all 3 calls)","~$0.0015"],
["Cost-optimal (recommended)","Llama 3.3 70B (all 3 calls)","~$0.005"],
["Quality blend","Flash (gen) + Sonnet 4.6 (scoring), cached","~$0.016"],
]));
body.push(P("Monthly cost = active students × 10 attempts × cost/attempt:"));
T(table([3000,2120,2120,2120],["Active students / month","Budget","Cost-optimal","Quality blend"],[
["1,000","~$15","~$50","~$160"],
["2,500","~$38","~$125","~$400"],
["4,000 (full cohort)","~$60","~$200","~$640"],
]));
body.push(P("**Recommended planning figure:** for the full 4,000-student cohort, budget ~$200–$650 / month depending on the scoring-quality tier — with ~$200/month (Llama 3.3 70B + caching + batching) as the cost-optimal target, and ~$640/month for a premium model on the final mark."));

body.push(H1("5. Notes & risks"));
[ "Non-Claude prices/limits [verify] are approximate — confirm on each provider's current pricing page.",
  "Caching savings assume students in a campaign share one case study (true in the current design).",
  "Concurrency, not cost, is the binding constraint during launches — size paid rate limits to peak concurrent students, not the monthly total.",
  "Keep the mentor-review fallback as the final safety net so AI cost/limits never block a student's progress.",
].forEach(t=>body.push(B(t)));

body.push(H1("6. Appendix — Scoring questions to confirm with client"));
[ "Pass mark per level — 75% (= 7.5/10)? Does it differ by difficulty level?",
  "Definition of '% complete' for the Incomplete/Rejected split — questions answered, word count, or rubric criteria met?",
  "The <33% rule — hard-fail-and-lock immediately, or consume one of the 4 attempts?",
  "Across 4 attempts, use best score or latest?",
  "How the 7 Q&A marks map from the 6 AI quality dimensions — equal weight or 30/20/15/15/10/10?",
  "Rapid-fire (3 marks) — how many questions, marks each, partial credit allowed?",
  "How an attempt's mark updates capability scores — running average, latest, or weighted by difficulty?",
  "Does difficulty level weight the contribution (L4 worth more than L1)?",
  "Does time taken affect the score?",
  "Can a mentor override the AI mark, and is the override the final record?",
].forEach(t=>body.push(N(t)));

const doc=new Document({creator:"PCDC",title:"AI Costing & Plan",
 styles:{default:{document:{run:{font:"Arial",size:22}}},paragraphStyles:[
  {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{size:29,bold:true,color:NAVY,font:"Arial"},paragraph:{spacing:{before:280,after:140},outlineLevel:0}},
  {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,run:{size:24,bold:true,color:ACC,font:"Arial"},paragraph:{spacing:{before:200,after:100},outlineLevel:1}},
 ]},
 numbering:{config:[
  {reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:600,hanging:280}}}}]},
  {reference:"num",levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:600,hanging:320}}}}]},
 ]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
  headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:ACC,space:4}},children:[new TextRun({text:"PCDC — AI Costing & Plan",color:GREY,size:16})]})]})},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Page ",size:16,color:GREY}),new TextRun({children:[PageNumber.CURRENT],size:16,color:GREY}),new TextRun({text:" of ",size:16,color:GREY}),new TextRun({children:[PageNumber.TOTAL_PAGES],size:16,color:GREY})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("C:\\Users\\user\\Downloads\\Prestige\\AI_Costing_Plan.docx",b);console.log("WROTE AI_Costing_Plan.docx ("+b.length+" bytes)");});

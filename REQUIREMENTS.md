# Prestige Capability Development Centre (PCDC) — Requirements (recovered from recording)

> **Source:** `prestige recording.mp4` (14:07, dated 2026‑06‑15). A Zoom/Meet requirement‑gathering call.
> **⚠️ The recording's audio track is digital silence (−91 dB) — no spoken content was captured.**
> Everything below was reconstructed by extracting video frames of the shared PowerPoint
> deck (`Prestige-Capability-Development-Centre.pptx`, 20 slides) and reading the slides.
> The **verbal discussion / decisions are unrecoverable.** Slides **1–2 and 11–20 were never
> shown on screen**, so they are unknown.
>
> **Participants:** Dr. Sanjeev Patni (presenting), Himanshu Pandey, Akhilesh Gandhi,
> Amanpreet Dutta, Dhwani Sharma.

## Product in one line
An **AI‑powered experiential learning & assessment platform** for students. Instead of
traditional exams, students solve **real‑world business challenges / simulations** using AI
as a professional tool, then **defend their work in an AI‑driven "Rapid‑Fire" probing round**.
The system continuously measures **capabilities** across domains and reports to mentors.

## Recovered slide content

**Slide 3 (partial):** capability types — two groups: "…Entrepreneurial Capabilities" and
"…Professional Capabilities". (Title cut off.)

**Slide 4 — Students Develop These Capabilities**
- *Challenge Types:* Business Simulations · Case Studies · Leadership Scenarios · Startup Challenges · (sectoral) Challenges
- *Students Learn:* Thinking & Analyzing · Thinking & Deciding · Reflecting & Improving · Developing on Real Problems

**Slide 5 — From Challenge to Capability Growth** (5‑step journey)
Receive Challenge → Study Situation → Work & Use AI → Submit Solution → Rapid‑Fire Round.
Caption: *"Every step is designed to mirror professional decision‑making — with AI as a tool,
not a crutch, and continuous feedback replacing end‑of‑term exams."*

**Slide 6 — System Work Flow (8 steps)**
1. **Receive Challenge** — student assigned a real‑world business challenge / simulation; time allotted is activated; can be done from own laptop or Lab PC.
2. **Study the Situation** — reviews context, data, background materials independently.
3. **Work & Use AI** — works independently, may leverage AI as a professional tool. **Cannot copy‑paste — pasting is blocked. Time consumed is monitored.**
4. **Submit Solution** — submits solution + reasoning.
5. **Rapid‑Fire Round** — faces AI‑generated probing questions about the submission.
6. **AI Evaluation** — AI benchmarks the student's performance against its own answer, and time consumed.
7. **Scores Updated** — capability scores across all domains automatically updated.
8. **Mentor Report** — mentor receives a detailed performance report for timely intervention.

**Slide 7 — AI as a Professional Companion**
- *Students May Use AI For:* Research & Analysis · Validation of Ideas · Alternative Viewpoints · Data Interpretation · Strategic Options
- *Students Must Submit:* Their Solution · Their Reasoning · AI Prompts (used)
- *This Develops:* Better Thinking & Questions · Better Judgment · Better Use of AI

**Slide 8 — The Rapid‑Fire Intelligence Round**
After every submission, AI‑generated probing questions verify genuine understanding, original
thinking, and sound business judgment. *"Surface‑level or copy‑paste learning becomes impossible."*
Sample questions:
- "Why did you choose this solution?" — tests decision‑making rationale.
- "What risks exist in your approach?" — probes risk awareness / strategic foresight.
- "What alternatives did you reject — and why?" — reveals quality of analytical thinking.
- "How would a competitor respond?" — forces thinking beyond own perspective.
Verifies: **Understanding · Original Thinking · Business Judgment · Decision Logic.**

**Slide 9 — Multi‑Level Capability Development** (progression levels)
- Level 1 — Observation & Understanding
- Level 2 — Analysis & Diagnosis
- Level 3 — Problem‑Solving & Decision‑Making
- Level 4 — Leadership & Entrepreneurship
- Level 5 — Executive Leadership Simulations (high‑stakes, complex)

**Slide 10 — AI‑Based Evaluation & Continuous Assessment** (title only — content not shown).

## Derived functional requirements
- **Challenge/simulation engine** — authoring + delivery, typed (simulation/case/leadership/startup), with per‑attempt **countdown timer**.
- **Secure assessment workspace** — **paste blocking**, **time‑on‑task tracking**, works on personal laptop *or* Lab PC (browser‑based, lockdown‑style).
- **Integrated AI assistant** (student‑facing, allowed) with **prompt logging** (prompts must be submitted).
- **AI evaluator** — generates a benchmark/model answer and scores the student against it + time consumed.
- **AI question generator** — produces probing rapid‑fire questions from the student's submission.
- **Rapid‑fire interactive round** — timed Q&A capture (text and/or voice — TBD).
- **Capability scoring engine** — multi‑domain scores, 5 progression levels, continuous (not end‑of‑term).
- **Mentor dashboard** — detailed per‑student performance reports + intervention alerts.
- **Student dashboard** — capability growth tracking over time.
- **Roles:** Student, Mentor/Faculty, Admin (institution).

## Open questions (need verbal discussion or follow‑up — audio was lost)
1. Is PCDC **standalone** or built on the **QuikIT platform**? (The repo's `CLAUDE.md` describes the unrelated "QuikScale Admin Portal" — needs reconciling.)
2. Tech stack, hosting, and which AI model/provider for evaluation & question generation.
3. "Lab PC" + paste‑blocking + time monitoring — how strict is proctoring? Native lockdown app vs browser?
4. Rapid‑fire modality: typed answers vs spoken/voice; time limits per question.
5. Scoring rubric details (slide 10 content), capability taxonomy, level promotion rules.
6. Slides 1–2 (vision/problem) and 11–20 (architecture, roadmap, pricing, team) — not shown.
7. Target users/scale (institution type, number of students), data residency, integrations (LMS/SIS).

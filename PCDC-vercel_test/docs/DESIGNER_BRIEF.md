# PCDC Case Studio — Project Brief for UI/UX Design

> **Purpose of this document:** give a designer (and their AI assistant) a complete mental model of the product — what it is, who uses it, every screen, the core flows, the domain language, the current visual system, and the constraints — so they can redesign or extend the UI confidently and consistently.

---

## 1. What the product is

**PCDC (Prestige Capability Development Centre) Case Studio** is a web platform where business-school (MBA/PGDM) students attempt **AI-evaluated case studies** to build and measure real-world **capabilities** (analytical thinking, leadership, etc.).

- Faculty author case studies and assign them to class sections.
- Students read a case, write an analysis, answer structured questions, face an AI "rapid fire" round, and receive an AI-generated, rubric-based evaluation.
- The platform tracks each student's capability growth over time.

**Audience:** Indian management institutes. Tone should be **professional, academic, trustworthy** — not playful/consumer. Think "serious learning tool," clean and focused.

---

## 2. The three roles

| Role | Who | What they do |
|------|-----|--------------|
| **Admin** | Institute IT/program office | Creates users, courses, class sections; maps faculty↔course↔students; bulk-imports students/faculty; system settings. |
| **Faculty** | Professors | Author case studies, define rubrics, assign cases to sections, review student attempts, see analytics/reports. |
| **Student** | MBA/PGDM learners | Attempt assigned cases, view evaluations, track capabilities, achievements, and a career pathway. |

There are **only these three roles** (earlier "mentor"/"director" roles were removed).

---

## 3. End-to-end flow (the big picture)

```
ADMIN                     FACULTY                         STUDENT
─────                     ───────                         ───────
Create courses &          Build a case study
sections            ─▶    (content + questions +
Create/import users       rubric + timing + marks)
(faculty, students)              │
Map faculty to a                 ▼
section, enroll           Assign case to section(s)  ─▶  Case appears in
students                         │                        "My Case Studies"
                                 │                              │
                                 │                              ▼
                                 │                        Attempt the case
                                 │                        (timed, one shot)
                                 │                              │
                                 ▼                              ▼
                          Review attempts,          ◀─   AI evaluates &
                          marks, analytics,               scores against rubric;
                          reports                         capabilities update
```

---

## 4. Visual design system (current state)

The app is built with **Tailwind CSS**. The current look is clean/utilitarian; there is **no custom webfont** (system font stack). A designer may refine this, but here is what exists today so you can stay consistent or deliberately evolve it.

**Color tokens in use:**
- **Ink / primary navy:** `#0B1D3A` (sidebars, primary buttons), text `#111827`, hover `#17315C`
- **Accent gold:** `#C9A227` (highlights, primary CTAs in the attempt flow, focus rings), hover `#B08D20`
- **App background:** `#F6F7F9` / `#F6F7FB`; **cards:** white
- **Borders:** `#E6E8EB` / `#E6EBEB`
- **Muted text:** `#6B7280`, lighter `#9CA3AF`
- **Semantic:** success green `#16A34A`/`#027A48`, warning amber `#B45309`/`#F59E0B`, danger red `#B91C1C`/`#B42318`, info blue `#1D4ED8`

**Layout patterns:**
- **Faculty & Admin portals:** dark navy **left sidebar** (logo + nav) + top header (title, search, user chip) + content area of white cards.
- **Student portal:** dashboard layout with sidebar navigation.
- Cards: `rounded-lg`, `shadow-sm`, `border` in the light grey. Inputs: `h-11`, rounded, gold focus ring.
- Should be **responsive** (works down to tablet/mobile widths); wide tables scroll horizontally.

---

## 5. Screen inventory (routes + purpose)

### Auth (shared)
| Route | Screen | Notes |
|-------|--------|-------|
| `/login` | Login | Email/password **+ "Continue with Google"** (Google SSO, login-only). |
| `/register` | Register | Placeholder; Google button also here. |
| `/unauthorized` | Unauthorized | Wrong-role access. |

### Student portal (`/student/*`)
| Route | Screen | Purpose |
|-------|--------|---------|
| `/student/dashboard` | Dashboard | Hero/greeting, capability matrix, recent evaluations, quick stats. **All real data.** |
| `/student/case-studies` | My Case Studies | List of assigned cases (available / in-progress / completed). |
| `/student/case-studies/:id` | Case Detail | Pre-attempt overview: title, difficulty, timing, marks, "Start attempt". |
| `/student/case-studies/:id/attempt` | **Case Attempt** | The core timed flow (see §6). |
| `/student/case-studies/:id/results` | Results | Post-attempt destination. |
| `/student/capability-profile` | Capability Profile | Radar/breakdown of capability scores. |
| `/student/career-pathway` | Career Pathway | Progress toward a track, focus areas, recommended cases. |
| `/student/achievements` | Achievements | Badges, streak, points, cohort leaderboard, milestones. |
| `/student/ai-coach` | AI Coach | Conversational guidance. |
| `/student/profile` | Profile | Student details. |

### Faculty portal (`/faculty/*`) — sidebar nav
`Dashboard · Case Library · Case Builder · Rubric Builder · Students · Analytics · Reports`
| Screen | Purpose |
|--------|---------|
| **Dashboard** | Active students, cases, pending reviews, capability alerts. |
| **Case Library** | All faculty's cases; publish/delete; drill into student attempts per case. |
| **Case Builder** | Author a case — the biggest form (see §7). Two modes: **Scratch** (manual) and **AI** (AI-assisted generation). |
| **Rubric Builder** | Set per-case rubric weights + case-specific criteria. |
| **Students** | Roster across sections; per-student status (on track / at risk / not started); "View report". |
| **Analytics** | Avg case score & completion per section (stat cards + bar chart + table). |
| **Reports** | Section Summary & Student Performance reports; CSV export + print/PDF. |
| Attempt Report | Per-attempt view: student's initial analysis, written answers, rapid-fire answers, marks, rubric scores. |

### Admin portal (`/admin/*`)
`Dashboard · Users · Courses · Sections · Case Import · Notifications · Settings`
- **Users**: create/manage users (role = admin/faculty/student), bulk CSV import.
- **Courses / Sections**: academic structure; map faculty and enroll students into sections.

---

## 6. ⭐ The core UX: Student Case Attempt flow

This is the heart of the product and the most important flow to get right. It is a **linear, timed, one-shot** experience (a student gets **one attempt**; if a timed phase runs out, the attempt is locked — no resume).

```
Screen 1: READING           Screen 2: WRITING                 Screen 3: RAPID FIRE        Screen 4: EVALUATION
──────────────────          ─────────────────                 ────────────────────        ────────────────────
Case briefing               (a) Initial Analysis (ungraded)   3 AI-generated              Rubric-based scores,
(situation, background,     (b) Structured Questions (graded) short-answer questions       marks, strengths,
data, characters, etc.)                                       probing their reasoning     weaknesses, grade
   ⏱ Reading timer             ⏱ Answer-writing timer            ⏱ Rapid-fire timer
```

**Phase details:**

1. **Reading** — Student reads the case sections (Situation, Background, Data, Characters, Constraints, Objectives, Timeline). A **countdown timer** (faculty-set minutes) runs. When it ends, they move on.

2. **Writing** (one screen, two parts, under one writing timer):
   - **Initial Analysis** *(ungraded)* — a free-text reflection answering a fixed 5-question prompt: *What's happening? · Possible causes? · Assumptions? · Missing info? · Tentative solution?* (min ~200 words). Shown with a "Not marked" chip.
   - **Structured Written Questions** *(graded)* — 3 questions, each with its own marks and min/max word limits, model answer, marking scheme.

3. **Rapid Fire** — The AI **generates 3 short questions live**, based on the student's own initial analysis + written answers, to probe their reasoning. Shown one at a time with a countdown. (Faculty do **not** write these; they only set the rapid-fire time.)

4. **Evaluation** — AI scores the whole attempt against the faculty's **rubric**, judging the initial analysis + written answers + rapid fire together. Produces per-question marks, rubric-dimension scores, strengths, weaknesses, blind spots, improvement areas, and an overall grade.

**Critical UX states to design for:**
- **Live countdown timers** per phase (prominent, non-alarming until low).
- **Time's up / expired lockout** — a hard stop screen ("This attempt has expired and cannot be resumed").
- **AI generating** states (spinners): "Preparing your rapid fire questions…", "AI is generating your evaluation…" (these can take several seconds).
- **Word-count progress** bars on writing fields (below min = amber, met = green).
- **One-shot warnings** ("Once submitted, you cannot edit").

---

## 7. Case Builder (faculty's biggest form)

Two modes, switchable ("Change mode"):
- **Start from Scratch** — fully manual entry.
- **Generate with AI** — AI drafts content/questions the faculty then edits.

Sections of the form (in order):
1. **Core Fields** — Title, Industry, Difficulty (Level 1–7), **Duration (hours + minutes)**, Capabilities targeted.
2. **Recommendation** — which courses/semesters this case suits.
3. **Timing** — Reading time + Rapid-fire time (Answer-writing time auto-calculated = duration − reading − rapid fire).
4. **Student Instructions & Faculty Notes** — before/during/submission instructions, company & industry background, common mistakes, discussion points, key learning points.
5. **Case Content sections** — Situation, Background, Data, Characters, Constraints, Objectives, Timeline, Learning Outcomes.
6. **Structured Written Questions** — **Total Marks** (configurable; written marks auto-distribute across questions), then 3 questions each with marks, Bloom's level, word limits, model answer, alt answers, marking scheme.
7. **Rapid Fire** — informational only; questions are AI-generated per student at attempt time.

---

## 8. Domain glossary (learn this language)

- **Capability** — a measurable skill the platform develops. There are **20 capabilities in 4 groups**:
  - **Cognitive:** Analytical Thinking, Critical Thinking, Strategic Thinking, Systems Thinking, Decision Making
  - **Leadership:** Communication, Influence, Negotiation, Conflict Resolution, Team Management
  - **Entrepreneurial:** Opportunity Recognition, Innovation, Business Model Thinking, Risk Assessment, Resourcefulness
  - **Professional:** Professional Judgment, Business Acumen, Execution Orientation, Learning Agility, Adaptability
- **Capability Matrix** — the student's scores across these groups (dashboard visual).
- **Rubric** — faculty-defined scoring criteria for a case (weights across thinking depth, logic, creativity, practicality, risk awareness, reflection + case-specific criteria).
- **Marks model** — Total marks are configurable per case; **rapid fire is a fixed 3 marks** (3 questions × 1), the rest is written. Example: 10 total = 7 written + 3 rapid fire.
- **Bloom's Taxonomy** — cognitive level tag per question (Remember, Understand, Apply, Analyze, Evaluate, Create).
- **Difficulty** — Level 1 (Basic) → higher.
- **Section** — a class/cohort of students under a course, taught by a faculty.
- **Attempt** — one student's timed run through a case (one allowed).

---

## 9. Constraints & things the designer should know

- **Stack:** React + Vite + Tailwind CSS + Redux Toolkit + recharts (charts). Backend is Python/FastAPI + PostgreSQL; AI via Google Gemini. (Designer doesn't touch backend, but this frames what's feasible.)
- **Everything on the student dashboard is real, dynamic data** — design for empty/partial/loading states (new student with no attempts, at-risk student, etc.).
- **AI latency** is real — evaluation and rapid-fire generation take seconds; loading states matter.
- **Timers are authoritative/server-side** — the UI must reflect a countdown that can hard-stop.
- **Responsive** — faculty may use laptops, students may use tablets/phones.
- **Auth:** email/password + Google Sign-In (login-only: the account must already exist).

---

## 10. Current status

Built and working: all three portals, the full student attempt flow (reading → initial analysis → structured questions → rapid fire → evaluation), faculty case builder/rubric/library/students/analytics/reports, AI evaluation on Gemini, Google SSO, real-data student dashboard/achievements/career pathway. Deployed on Vercel.

Good candidates for **design attention**: the student attempt flow (timers, progress, AI-wait states), the dashboard/capability visuals, the Case Builder form (it's long/dense — needs strong information hierarchy), and overall visual identity/typography (currently system-font utilitarian).

---

## 11. How to use this document

Drop this file into a Claude session and ask things like:
- "Based on this brief, propose a redesign of the student Case Attempt flow with better timer and progress affordances."
- "Design an information hierarchy for the Case Builder form so it's less overwhelming."
- "Suggest a cohesive visual identity (palette + type) that fits an academic capability-development product."

The designer should treat §4 (current system) as the baseline to evolve, §6 (attempt flow) as the priority experience, and §8 (glossary) as the domain vocabulary to respect.

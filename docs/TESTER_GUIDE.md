# PCDC Case Studio — Tester Guide

_Last updated: 10 Aug 2026_

This document gives a QA tester everything needed to understand and test the
**PCDC (Prestige Capability Development Centre) Case Studio** — an AI-evaluated
business case-study platform with **Admin**, **Faculty**, and **Student** portals.

---

## 1. What the product is

PCDC Case Studio lets a business school run **AI-evaluated case studies**:

- **Admins** set up the academic structure (institutions → departments → courses →
  semesters → sections → subjects) and manage people.
- **Faculty** declare what they teach, add their students, build/assign case
  studies, and review AI-generated evaluations.
- **Students** attempt case studies. They write an initial analysis and structured
  answers, are challenged by **AI-generated rapid-fire questions**, and receive a
  final **AI evaluation against the case rubric**.

The AI provider is **Google Gemini** (`gemini-flash-latest`).

---

## 2. Environments & access

| Environment | URL |
|---|---|
| **Live (production)** | https://pcdc-psi.vercel.app |
| Login page | https://pcdc-psi.vercel.app/login |

The frontend is React + Vite; the backend is Python FastAPI; the database is
PostgreSQL (Neon). Everything runs on Vercel. All portals share **one login page**
and route the user to their portal automatically based on role.

---

## 3. Test accounts

> These are shared demo accounts on the live database. Passwords may be reset by
> other testers — if a login fails, tell the dev team to re-seed them.

| Role | Login | Password | Notes |
|---|---|---|---|
| **Admin** | `admin@pcdc.com` | `Admin@123` | Full admin portal |
| **Faculty** | `deepak.k@pcdc.in` | `Faculty@123` | Existing faculty with teaching set up |
| **Student** | `amanpreetdutta09@gmail.com` | `Student@123` | Normal student login |
| **Student (first-login)** | `123456789` | `123456789` | Scholar-number login; **forces a password change** on first sign-in |

After you use the "first-login" student once, its password changes and
`123456789` will no longer work — that is expected (see §4.3).

---

## 4. Authentication — what to test

### 4.1 Login (email or scholar number)
- The **"Email or scholar number"** field accepts **either** an email address
  **or** a student's scholar number (e.g. `123456789`).
- Wrong credentials → "Invalid email or password".
- After login, the user lands on their role's portal automatically.

### 4.2 Google Sign-In (login-only)
- "Continue with Google" only logs in users whose email **already exists** in the
  system (there is no self-signup). Unknown Google emails are rejected with a
  clear message.
- ⚠️ Known limitation: Google SSO must have the domain whitelisted in Google Cloud.
  If "Continue with Google" errors on the live domain, that whitelist step is
  pending — test password login instead and flag it.

### 4.3 Student first-login forced password change
1. Log in as the first-login student (`123456789` / `123456789`).
2. You should be **forced** to a "Set a new password" screen before reaching any
   portal — you cannot navigate away from it.
3. Set a new password (min 8 chars) → you're taken into the student portal.
4. Log out and confirm the **old** scholar-number password no longer works and the
   **new** one does.

### 4.4 Faculty invite → set password (email flow)
1. As **Admin**, go to **People → Faculty → Invite faculty**.
2. Fill Name + Email (use an inbox you can check), select Institution(s) and
   Department(s), Designation, then **Invite faculty**.
3. The invitee receives a branded **"Set your password"** email.
4. Clicking the link opens `/set-password?token=…`, shows the invitee's email, and
   lets them choose a password, then logs them straight in.
5. Test edge cases: reusing a link (should say "already used"), an expired/garbage
   token (should say "invalid/expired").

---

## 5. Admin portal (`/admin`)

Grouped sidebar: **Academic Setup**, **People**, **System**.

### 5.1 Academic Setup
Tabs: **Institutions, Departments, Courses, Batches, Semesters, Sections,
Subjects**. Seeded demo data exists for four institutions:

| Institution | Departments | Courses |
|---|---|---|
| PIMR PG | MBA, PGDM | MBA-Marketing, MBA-Finance, PGDM-Business Analytics |
| PIMR UG | BBA, B.Com | BBA-General, B.Com-Honours |
| PIMR LAW | BA LLB, LLB | BA LLB (10 sems), LLB (6 sems) |
| PIBM | PGDM | PGDM-Marketing, PGDM-Finance |

Test: create/edit each entity via the right-side "Add" drawers; confirm counts on
the tab headers update; confirm subjects auto-generate codes (e.g. `MBA-MKT-S1-1`);
confirm the hierarchy filters correctly (a course belongs to a department belongs
to an institution).

### 5.2 People
- **Faculty** — list of everyone teaching or invited; filters: All / Awaiting
  response / Active / Needs attention; **Invite faculty** drawer.
  - In the invite drawer, test the **cascading multi-select**: pick one or more
    **institutions**, then each institution shows its own **department dropdown**
    (multi-select, removable chips). Departments only from the chosen institutions.
- **Teaching Approvals** — a toggle for "require approval"; when on, faculty
  self-selections appear as **Pending** with Approve/Reject; approved ones appear
  in an **Approved** list with Revoke.
- **All Users** — every account in the system.

### 5.3 Things to verify
- Inviting a faculty sends the email and the new row shows under "Awaiting".
- Selected departments are saved on the faculty record.

---

## 6. Faculty portal (`/faculty`)

Grouped sidebar: **Dashboard**, **Onboarding** (My Teaching, Students, Add
Students), **Cases** (Case Library, Case Builder), **Insights** (Analytics,
Reports).

### 6.1 Onboarding
- **My Teaching** — the faculty self-selects what they teach as a checklist:
  Institution → Department → Course → Semester → Section, with multi-select
  subjects. Saving may require admin approval (see Teaching Approvals).
- **Students** — everyone enrolled in the faculty's sections; search + section
  filter; click a student to see their record.
- **Add Students** — create student logins for a section:
  - **Single add**: Section, Name, Scholar number, optional Email. The initial
    password **is the scholar number**, and the student is forced to change it on
    first login. A credential slip appears on the right.
  - **Bulk import**: download the CSV template, upload a filled CSV; created
    students appear with slips, and skipped rows are listed with reasons.
  - The Section dropdown shows the **subject(s)** the faculty teaches for it.

### 6.2 Cases
- **Case Library** — the faculty's case studies; assign a case to sections.
- **Case Builder** — create/edit a case: core fields, **duration in hours and
  minutes**, **total marks** + **per-question marks** (with a mismatch warning),
  a **rapid-fire time** (questions are AI-generated live, not authored), an
  **ungraded initial-analysis** step, and a **rubric editor**.

### 6.3 Insights
- **Analytics** — cohort performance, capability signals.
- **Reports** — Section Summary + Student Performance, CSV export, print/PDF.

---

## 7. Student portal (`/student`)

Sidebar includes Dashboard, Profile, Capability Profile, AI Coach, Career Pathway,
Achievements, and **Case Studies**.

### 7.1 Case attempt flow (the core test)
When a student opens an assigned case and starts an attempt, they go through
staged screens:
1. **Briefing** — read the case.
2. **Initial Analysis** — a fixed 5-question free-text step, ungraded, with a
   minimum word count (~200–300 words). No marks.
3. **Structured questions** — the graded written answers (per-question marks).
4. **AI Chat / Rapid-fire** — the AI generates **rapid-fire questions live**,
   based on the student's initial analysis + structured answers, to probe their
   thinking.
5. **Evaluation** — a final **AI evaluation** judging all three inputs (initial
   analysis + written answers + rapid fire) against the case **rubric**.

### 7.2 Things to verify
- Word-count minimums are enforced on the initial analysis.
- Rapid-fire questions actually reflect what the student wrote.
- The final evaluation references the rubric and produces scores/feedback.
- Progress is saved between screens (a resumed attempt continues where it left off).

---

## 8. Key end-to-end scenarios

1. **Faculty onboarding**: Admin invites a faculty → faculty sets password via
   email → faculty selects teaching in My Teaching → (admin approves if required)
   → sections appear for the faculty.
2. **Student onboarding**: Faculty adds a student (or bulk imports) → student logs
   in with scholar number → forced password change → student dashboard.
3. **Full case cycle**: Faculty builds a case with rubric + marks → assigns to a
   section → student attempts it (analysis → answers → rapid fire → evaluation) →
   faculty reviews the result in Analytics/Reports.
4. **Academic setup**: Admin adds a new institution/department/course/section/
   subject → it becomes selectable in the faculty My Teaching flow and the invite
   drawer.

---

## 9. Known behaviors & gotchas (not bugs)

- The **first-login student password is single-use**: once changed, the scholar
  number no longer logs in. Re-test needs a reset by the dev team.
- **Set-password / invite links are single-use** and expire in 72 hours.
- **Google SSO** needs the live domain whitelisted in Google Cloud; until then it
  may error while password login works.
- AI responses (rapid-fire, evaluation) depend on the Gemini API; occasional
  slowness or a retry is expected under load.
- All portals share one login; you're routed by role, so use the matching account.

---

## 10. How to report a bug

Please include:
- **Role & account** used (e.g. Admin `admin@pcdc.com`).
- **URL / screen** and the exact steps to reproduce.
- **What you expected** vs. **what happened** (with screenshots).
- **Browser** and rough time (helps match server logs).
- Any error text shown on screen or a red toast/banner.

For API-level issues, the browser DevTools **Network** tab response (status code +
JSON `detail` message) is extremely helpful.

---

## 11. Quick reference

- **Live app:** https://pcdc-psi.vercel.app
- **Admin:** `admin@pcdc.com` / `Admin@123`
- **Faculty:** `deepak.k@pcdc.in` / `Faculty@123`
- **Student:** `amanpreetdutta09@gmail.com` / `Student@123`
- **Student first-login:** `123456789` / `123456789` (forces password change)

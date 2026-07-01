# SPEC_08: Admin Portal — Detailed Plan

**Route prefix:** `/admin/*`
**Sprint:** 4
**Depends on:** Auth module (done), Role-based routing (done), Student Portal (done), Faculty Portal (Sprint 3)
**Core principle:** PCDC is a **closed system**. No self-registration. Every user account is created or imported by Admin. This makes the Admin portal the operational backbone of the platform — every academic year begins here.

---

## 0. Admin Role Definition

Admin is not a super-faculty or a director. Admin's job is **platform operations**, not academic content:

- Who can log in and as what role
- How users are onboarded in bulk
- How external case studies enter the system
- How the platform behaves system-wide (thresholds, notification rules, API keys)
- Whether notifications are actually reaching people

Admin does **not**:
- Evaluate students (that's faculty + AI)
- Mentor students (that's mentors)
- View institution-wide capability analytics (that's director)
- Create case studies (that's faculty)

This boundary matters for UI decisions — admin pages should not drift into analytics or academic territory.

---

## 1. Page: Admin Dashboard

**Route:** `/admin/dashboard`

**Purpose:** System health at a glance. Operational pulse, not academic analytics.

**UI elements:**

```
┌─────────────────────────────────────────────────────┐
│  Admin Portal                      [Dr. Admin Name]  │
│  System operations and user management               │
├──────────────┬──────────────┬───────────────────────┤
│ Total Users  │ Active Today │ Pending Imports        │
│    4,312     │     847      │      23               │
├──────────────┴──────────────┴───────────────────────┤
│ Users by Role                                        │
│  Students: 4,000  Faculty: 48  Mentors: 160          │
│  Directors: 3     Admins: 5 (including you)          │
├─────────────────────────────────────────────────────┤
│ Recent Activity Feed                                 │
│  • 23 student accounts imported — 2 hours ago        │
│  • Faculty Dr. Sharma published case "Supply Chain   │
│    Crisis" — 4 hours ago                             │
│  • 3 notification delivery failures — yesterday      │
├─────────────────────────────────────────────────────┤
│ Quick Actions                                        │
│  [+ Add User]  [↑ Import Users]  [↑ Import Cases]   │
└─────────────────────────────────────────────────────┘
```

**Data needed:**
- User counts by role (`users` table, group by role)
- Active sessions today (login events from last 24h)
- Pending imports count (imported records not yet approved)
- Recent activity feed (last 10 system events — user creations, case publishes, notification failures)

**API endpoints:**
- `GET /api/admin/dashboard/summary`

---

## 2. Page: Users

**Route:** `/admin/users`

**Purpose:** Full roster of all platform users across every role. Primary day-to-day admin page.

**UI elements:**

```
┌─────────────────────────────────────────────────────┐
│  Users                    [+ Add User] [↑ Import]    │
├───────────┬──────────┬───────────┬──────────────────┤
│ Search... │ Role ▼   │ Program ▼ │ Status ▼  Batch▼  │
├───────────┴──────────┴───────────┴──────────────────┤
│ Name          Role      Program    Status   Actions  │
│ Amit Sharma   Student   MBA 2025   Active   ···      │
│ Dr. A. Rao    Faculty   —          Active   ···      │
│ Ravi Mehta    Mentor    —          Active   ···      │
│ ...                                                  │
├─────────────────────────────────────────────────────┤
│ Showing 1–50 of 4,312          [< Prev]  [Next >]   │
└─────────────────────────────────────────────────────┘
```

**Filters:** Role (Student / Faculty / Mentor / Director / Admin), Program, Batch/Admission Year, Status (Active / Inactive)

**Actions per row (··· menu):**
- View/Edit → `/admin/user/:id`
- Deactivate / Reactivate
- Reset Password (sends a reset link via email)
- Change Role (e.g. Mentor → Faculty, but warn if they have active student assignments)

**Bulk actions (checkbox select):**
- Deactivate selected
- Export selected to CSV

**"+ Add User" flow (single user, manual):**
Opens a modal/drawer with:
- Name, Email, Role (select), Program (if student), Batch/Year (if student)
- On save: account created, welcome email with login credentials sent automatically
- No password set by admin — system sends a set-password link on first login (no admin ever handles raw passwords)

**"↑ Import" flow:**
→ Navigates to `/admin/users` import sub-flow (see below) or opens the Import drawer inline.

**Import flow (bulk, CSV):**
1. Download CSV template (column headers pre-defined: Name, Email, Role, Program, Batch, MentorID optional)
2. Upload filled CSV
3. Preview table: show all rows, flag errors (missing email, duplicate email, invalid role) inline
4. Admin reviews, fixes errors in the UI or re-uploads
5. Confirm import → accounts created in bulk, welcome emails sent
6. Import summary shown: X created, Y skipped (duplicates), Z failed (errors)

**API endpoints:**
- `GET /api/admin/users?role=&program=&status=&batch=&search=`
- `POST /api/admin/users` (single create)
- `POST /api/admin/users/import` (bulk CSV)
- `GET /api/admin/users/import/template` (download CSV template)
- `PATCH /api/admin/users/{id}/status` (activate/deactivate)
- `PATCH /api/admin/users/{id}/role`
- `POST /api/admin/users/{id}/reset-password`

**Tables touched:** `users` (or equivalent auth/users table), `students`, `mentors`

---

## 3. Page: User Detail

**Route:** `/admin/user/:id`

**Purpose:** Full profile view and edit for a single user. Different fields shown depending on role.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ← Users                                              │
│                                                      │
│ [Avatar] Amit Sharma                 [Deactivate]    │
│          Student · MBA 2025 · Active                 │
├─────────────────────────────────────────────────────┤
│ PROFILE                                              │
│ Name         [Amit Sharma          ]                 │
│ Email        [amit@prestige.edu    ]                 │
│ Role         [Student              ] (read-only)     │
│ Program      [MBA                  ]                 │
│ Admission Yr [2024                 ]                 │
│ Career Track [Management Consulting] (editable)      │
│ Mentor       [Ravi Mehta           ] [Change]        │
│                                      [Save Changes]  │
├─────────────────────────────────────────────────────┤
│ ACCOUNT                                              │
│ Status       Active    [Deactivate]                  │
│ Last Login   June 28, 2026 at 11:42 AM               │
│ Created      January 15, 2025                        │
│              [Reset Password]                        │
├─────────────────────────────────────────────────────┤
│ LOGIN HISTORY (last 10)                              │
│ June 28 · 11:42 AM · Chrome · Indore                 │
│ June 27 · 9:15 AM  · Mobile · Indore                 │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

**Role-conditional fields:**
- Student: Program, Admission Year, Career Track, Mentor assignment
- Faculty: Department (optional)
- Mentor: Students Assigned count (read-only link to filter users page)
- Director/Admin: No extra fields

**Mentor assignment ("Change" button):**
- Opens a searchable dropdown of active Mentor-role users
- Shows current student count next to each mentor name (so admin doesn't overload one mentor)
- Spec doc recommends 1:25 ratio — warn if selected mentor already has 25+ students

**API endpoints:**
- `GET /api/admin/users/{id}`
- `PUT /api/admin/users/{id}`
- `GET /api/admin/mentors` (for mentor assignment dropdown, includes student count per mentor)
- `POST /api/admin/users/{id}/reset-password`
- `PATCH /api/admin/users/{id}/status`

**Tables touched:** `users`, `students`, `mentors`

---

## 4. Page: Case Import

**Route:** `/admin/case-import`

**Purpose:** Bring externally-sourced case studies into the platform — Harvard-style cases, industry-provided challenges, institute-developed cases (spec doc Section 7, Sources C and D). Faculty create their own cases via Case Builder; admin handles everything that comes from outside.

**UI elements:**

```
┌─────────────────────────────────────────────────────┐
│  Case Import                                         │
│  Import external case studies from industry,         │
│  institutions, or case repositories.                 │
├─────────────────────────────────────────────────────┤
│ IMPORT QUEUE                      [+ New Import]     │
│                                                      │
│ "HBR Supply Chain Crisis"  Pending Review  [Review]  │
│ "Tata Motors Turnaround"   Approved        [View]    │
│ "Zomato Unit Economics"    Rejected        [Edit]    │
├─────────────────────────────────────────────────────┤
│ IMPORT HISTORY                                       │
│ 47 cases imported total  ·  41 active  ·  6 archived│
└─────────────────────────────────────────────────────┘
```

**"+ New Import" flow:**
1. **Source selection:** Industry Provided / Harvard-style Repository / Institute-Developed / Other
2. **Upload:** PDF, DOCX, or structured JSON (format depends on source)
3. **Field mapping:** System auto-parses what it can; admin reviews and maps extracted content to the 9 case sections (Situation, Background, Data, Characters, Constraints, Objectives, Timeline, Reflection Questions, Learning Outcomes) — same schema as faculty Case Builder
4. **Core fields:** Admin fills Title, Industry, Difficulty, Duration, Capabilities Targeted (same as Case Builder Core Fields) — these can't be auto-inferred reliably from external documents
5. **Review:** Full preview of all sections as they'll appear to faculty/students
6. **Approve → Published** or **Save as Draft** for faculty to review and complete before publishing

**Key difference from Case Builder:** Admin imports and maps the content, but the case is attributed to "External / Institution" rather than a faculty member. Faculty can still edit imported cases if given editor rights.

**API endpoints:**
- `GET /api/admin/cases/imports` (import queue)
- `POST /api/admin/cases/import` (upload + initiate)
- `PUT /api/admin/cases/import/{id}` (field mapping + edits)
- `POST /api/admin/cases/import/{id}/approve`
- `POST /api/admin/cases/import/{id}/reject`

**Tables touched:** case studies schema tables (same as faculty Case Builder)

---

## 5. Page: Settings

**Route:** `/admin/settings`

**Purpose:** System-wide platform configuration. Grouped into logical sections so it doesn't become one giant form.

### 5a. Capability Thresholds
- **At-risk score threshold** — default: score below X triggers mentor alert (recommended default: 60)
- **Capability drop alert** — alert mentor/faculty if a student's score drops by more than X points in a rolling window (e.g. 10 points in 30 days)
- **Placement readiness threshold** — what overall capability score = "placement ready" (spec doc shows 72% of students in director dashboard example)

### 5b. Adaptive Difficulty Rules
- **Level-up threshold** — student scoring above X% consistently triggers difficulty increase (spec doc default: 85%)
- **Level-down threshold** — student struggling below X% triggers difficulty decrease
- **Consistency window** — how many consecutive attempts before difficulty adjusts (e.g. 3 in a row)

### 5c. Mentor Assignment Rules
- **Target ratio** — mentor:student ratio target (spec doc recommends 1:25)
- **Overload warning threshold** — warn admin if mentor exceeds X students (recommend: 30)
- **Auto-assign mentors** — toggle: when a new student is imported, automatically assign the mentor with the lowest current load

### 5d. Career Track Management
- View, add, rename, deactivate career tracks (Consulting, Finance, Marketing, HR, Operations, Family Business, Entrepreneurship, Sales Leadership, Business Analytics, General Management — per spec doc Section 12)
- Deactivating a track does not remove it from students already on it — just hides it from new assignments

### 5e. Notification Channels
- Toggle channels on/off: Email / WhatsApp / SMS / Mobile Push (spec doc Section 14)
- Default "from" email address for system emails
- WhatsApp/SMS provider API key fields (redacted display — show last 4 chars only)

### 5f. AI / LLM Configuration
- OpenAI API key (redacted display)
- Model selection for case generation (gpt-4o-mini / gpt-4o — maps to SPEC_07b open question 1)
- Ollama local fallback toggle (on/off) + endpoint URL
- Monthly token usage summary (read-only, pulled from OpenAI usage API if feasible)

**API endpoints:**
- `GET /api/admin/settings`
- `PUT /api/admin/settings` (full settings object, or sectioned: `PUT /api/admin/settings/thresholds`, etc.)
- `GET /api/admin/settings/career-tracks`
- `POST /api/admin/settings/career-tracks`
- `PATCH /api/admin/settings/career-tracks/{id}`

**Note:** API keys are never returned in GET responses — write-only fields. Display only masked version.

---

## 6. Page: Notifications

**Route:** `/admin/notifications`

**Purpose:** Visibility and control over all system notifications — what was sent, to whom, whether it arrived, and the ability to trigger broadcasts.

**UI elements:**

```
┌─────────────────────────────────────────────────────┐
│  Notifications               [+ Send Broadcast]      │
├─────────────────────────────────────────────────────┤
│ DELIVERY LOG          Filter: All roles ▼  Channel ▼ │
│                                                      │
│ Amit Sharma   Simulation completed  Email ✓  Jun 28  │
│ Ravi Mehta    At-risk student alert Email ✗  Jun 28  │
│ Dr. A. Rao    New attempt pending   Email ✓  Jun 27  │
│ ...                                                  │
├─────────────────────────────────────────────────────┤
│ NOTIFICATION RULES                    [+ Add Rule]   │
│                                                      │
│ Capability drop > 10pts  → Mentor (Email + WhatsApp) │
│ Simulation completed     → Faculty (Email)           │
│ Level achieved           → Student (Email + Push)    │
│ Placement ready          → Mentor + Director (Email) │
│ Mentor session scheduled → Student (Email + SMS)     │
└─────────────────────────────────────────────────────┘
```

**Delivery Log:**
- Each row: recipient name, event type, channel used, status (✓ delivered / ✗ failed / ⏳ pending), timestamp
- Failed deliveries shown prominently — admin should be able to retry individual failed notifications
- Filter by role, channel, status, date range

**Notification Rules:**
- View all active rules (event → recipient role → channels)
- Add/edit/delete rules
- Rules map to events from spec doc Section 12: simulation completed, capability drop, level achieved, mentor meeting scheduled, placement readiness threshold reached
- Each rule: event trigger, recipient role(s), channel(s), optional message template

**"+ Send Broadcast" flow:**
- Recipient: All users / specific role / specific program / specific batch
- Channel: Email / WhatsApp / SMS / Push (multi-select, only channels enabled in Settings)
- Message: subject + body (plain text)
- Preview → Confirm → Send
- Broadcast appears in delivery log with per-recipient status

**API endpoints:**
- `GET /api/admin/notifications/log?role=&channel=&status=&from=&to=`
- `POST /api/admin/notifications/{id}/retry`
- `GET /api/admin/notifications/rules`
- `POST /api/admin/notifications/rules`
- `PUT /api/admin/notifications/rules/{id}`
- `DELETE /api/admin/notifications/rules/{id}`
- `POST /api/admin/notifications/broadcast`

**Tables touched:** new `notification_log` table + `notification_rules` table (confirm if these exist or need migration)

---

## 7. Open Questions Before Building

1. **Users table shape** — is there a single `users` table with a `role` column, or separate tables per role? This affects how the users list page queries and how role changes work.
2. **Welcome email trigger** — confirm SMTP/email provider configured. If not, the "send welcome email on account creation" feature is blocked and needs a settings step first.
3. **Case import parsing** — for PDF/DOCX uploads, does the backend use a parsing library to auto-extract text into sections, or does admin map everything manually? Auto-parsing (even imperfect) will dramatically reduce admin's workload per import.
4. **Notification log table** — does this exist yet or needs a new migration?
5. **Notification rules storage** — seeded rows (hardcoded) or admin-editable rows in DB? Recommend DB rows so admin can configure without a code deploy.
6. **API key security** — confirm API keys in Settings are stored encrypted at rest, never logged, never returned in GET responses.

---

## 8. Build Order

1. Users page (list + single add + status toggle) — unblocks everything else, platform is unusable without user management
2. User detail page — builds on users list
3. Bulk import (CSV) — biggest operational need at batch onboarding time
4. Settings (thresholds + career tracks + notification channel toggles first; AI keys second)
5. Notifications (rules + delivery log + broadcast)
6. Case import — last, since it depends on the case study schema being stable from the faculty portal work
7. Dashboard — built last, reads from everything above

# SPEC_15: Faculty → Course → Student Mapping

**Status:** Ready for implementation
**Affects:** Admin Portal, Faculty Portal, Student Portal, Notification Engine
**Depends on:** SPEC_12 (Courses/Sections tables — migrations must have run), Auth module (done)

---

## 0. The Core Relationship

```
FACULTY
    │
    └── teaches ──────────────► COURSE SECTION(S)
                                      │
                                      └── enrolled ────────────► STUDENTS
                                                                      │
                                      CASE STUDY ──── assigned to ───┘
                                      (by faculty)     (notifies all
                                                        students in
                                                        that section)
```

Rules locked in:
- A faculty can teach multiple course sections (e.g. Dr. Rao teaches MBA Sem II Section A AND PGDM Sem I Section B)
- A course section has many students enrolled
- When faculty assigns a case study to a section, ALL students in that section are notified and the case appears in their pending list immediately
- The assignment lives in `faculty_sections` (faculty ↔ section) and `student_sections` (student ↔ section) — both tables from SPEC_12

---

## 1. Where Assignments Are Managed

Three places, each with a distinct responsibility:

| Where | Who | What they do |
|---|---|---|
| Admin Portal → Sections | Admin | Creates sections, assigns faculty to sections, enrolls students into sections |
| Faculty Portal → My Sections | Faculty | Views their assigned sections + student rosters (read-only, cannot self-assign) |
| Faculty Portal → Case Library | Faculty | Assigns a published case to one or more of their sections |

Admin controls the structural assignments (who teaches what, who is enrolled where). Faculty controls the academic work (what cases to assign to their classes).

---

## 2. Admin Portal Changes

### 2a. New page: Section Management

**Route:** `/admin/sections`

This is where all faculty-course-student mapping happens. Add it as a top-level item in the Admin sidebar alongside Users, Case Import, Settings, Notifications.

**Page layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Sections                              [+ New Section]   │
│  Filter: Course ▼   Batch ▼   Status ▼                  │
├─────────────────────────────────────────────────────────┤
│  MBA · Semester II · Batch 2024–26 · Section A          │
│  Faculty: Dr. Ananya Rao (Marketing), Prof. Patel (Fin) │
│  Students: 60 enrolled                                  │
│  Cases Assigned: 4 active                               │
│  [Manage Faculty]  [Manage Students]  [View Cases]      │
├─────────────────────────────────────────────────────────┤
│  MBA · Semester III · Batch 2023–25 · Section A         │
│  Faculty: Dr. Mehta (Operations)                        │
│  Students: 58 enrolled                                  │
│  Cases Assigned: 2 active                               │
│  [Manage Faculty]  [Manage Students]  [View Cases]      │
├─────────────────────────────────────────────────────────┤
│  PGDM · Semester I · Batch 2025–27 · Section B          │
│  Faculty: Unassigned ⚠                                  │
│  Students: 60 enrolled                                  │
│  Cases Assigned: 0                                      │
│  [Manage Faculty]  [Manage Students]  [View Cases]      │
└─────────────────────────────────────────────────────────┘
```

Sections with no faculty assigned are flagged with ⚠ so admin knows to fix them.

### 2b. New Section creation flow

"+ New Section" button opens a modal:

```
Create New Section

Course    [MBA              ▼]
Batch     [MBA 2024–26      ▼]   (filtered by course)
Semester  [Semester II      ▼]   (filtered by course)
Section Name  [MBA-II-A        ]  (admin types this)

[Cancel]  [Create Section]
```

On create: empty section exists, ready for faculty + student assignment.

### 2c. "Manage Faculty" drawer (assign faculty to section)

Opens from the section card. Shows:

```
Faculty for: MBA Sem II · 2024–26 · Section A

Currently assigned:
  Dr. Ananya Rao    Marketing        [Remove]
  Prof. Ravi Patel  Finance          [Remove]

Add faculty:
  Search faculty...  [dropdown]
  Subject they teach in this section: [text input]
  [Add to Section]
```

Rules:
- Faculty must exist in the system (role = faculty) before being assigned
- Subject field is required — "Dr. Rao teaches Marketing in this section"
- One faculty can be added to the same section multiple times for different subjects (e.g. if they teach both Marketing and Strategy in the same class) — but this is an edge case; one record per faculty-section pair is sufficient for now
- Removing a faculty from a section does NOT delete their cases — cases already assigned to the section remain active

### 2d. "Manage Students" drawer (enroll students into section)

Opens from the section card. Shows:

```
Students in: MBA Sem II · 2024–26 · Section A  (60 enrolled)

[Search and add student...]          [↑ Bulk Enroll CSV]

Currently enrolled:
  Amit Sharma     Active    [Remove]
  Priya Desai     Active    [Remove]
  Arjun Mehta     Active    [Remove]
  ...
```

- Search dropdown shows students who: (a) are role=student, (b) match the section's course and batch, (c) are not already enrolled in another section
- Bulk CSV: columns `email, section_name` — enrolls multiple students at once
- Remove: removes `student_sections` row, student loses access to cases assigned to this section. Cases they already completed remain in their history.

### 2e. Faculty detail page update (`/admin/user/:id` for faculty)

Add a "Teaching Sections" block to the faculty user detail page:

```
TEACHING SECTIONS
  MBA Sem II · 2024–26 · Section A    Marketing
  PGDM Sem I · 2025–27 · Section B    Marketing, Strategy
  [+ Assign to Section]
```

"+ Assign to Section" → same as "Manage Faculty" drawer above but initiated from the faculty's profile instead of the section card. Both routes write to the same `faculty_sections` table.

---

## 3. Faculty Portal Changes

### 3a. Faculty Dashboard (updated)

Add a "My Sections" block showing each section the faculty teaches:

```
MY SECTIONS
  MBA Sem II · 2024–26 · Section A    60 students    4 cases active
  PGDM Sem I · 2025–27 · Section B    60 students    2 cases active
  MBA Sem III · 2023–25 · Section A   58 students    2 cases active

  Total students across all sections: 178
```

Dashboard summary counts update accordingly:
- "My Students" = total distinct students across all sections
- "Simulations Running" = active attempts on cases faculty assigned to their sections
- "Pending Reviews" = completed attempts on their cases awaiting faculty review

### 3b. Faculty Students page (updated)

Previously: showed students by attempt. Now: shows students by section enrollment.

```
┌─────────────────────────────────────────────────────────┐
│  My Students (178)    Search...   Section ▼   Status ▼  │
├─────────────────────────────────────────────────────────┤
│  ▼ MBA Sem II · 2024–26 · Section A  (60 students)     │
│  ──────────────────────────────────────────────────    │
│  Amit Sharma    Score: 72   Attempts: 3   On Track      │
│  Priya Desai    Score: 54   Attempts: 1   At Risk       │
│  Arjun Mehta    Score: 68   Attempts: 2   Active        │
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  ▼ PGDM Sem I · 2025–27 · Section B  (60 students)     │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

Faculty can collapse/expand sections. Each student row links to a read-only view of their capability profile and attempt history (faculty view — no intervention tools, those are mentor-only).

### 3c. Case Library → "Assign to Section" flow

This is the key action: faculty assigns a published case to one or more of their sections.

"Assign to Section" button appears on each published case card in the case library.

**Flow:**

```
Assign Case: "Working Capital Management (F-AT-002)"

Select sections to assign to:
  ☑ MBA Sem II · 2024–26 · Section A       (60 students)
  ☐ MBA Sem III · 2023–25 · Section A      (58 students)
  ☐ PGDM Sem I · 2025–27 · Section B       (60 students)

Due Date (optional):  [date picker]

Note to students (optional):
  [Complete before Thursday's session...]

                        [Cancel]  [Assign to 60 Students]
```

Button label shows the count of students who will be notified ("Assign to 60 Students") so faculty knows the impact before confirming.

**On confirm:**
```
For each selected section:
    1. Write case_section_assignments record
          (case_id, section_id, assigned_by=faculty_id,
           assigned_at=now, due_date, instructions, status='active')

    2. For each student enrolled in that section:
          Write assigned_cases record
          (student_id, case_id, assigned_by=faculty_id,
           assignment_source='faculty',
           section_assignment_id=FK to case_section_assignments)

    3. Trigger notification to each student:
          "Dr. Ananya Rao has assigned a new case study:
           Working Capital Management. Due: July 10."
          Channels: Email + in-app notification
```

**Notification content:**
- Student name
- Faculty name
- Case title + case code (e.g. F-AT-002)
- Due date (if set)
- Faculty's note (if added)
- Link: "Go to Case Studies →"

### 3d. Assigned Cases tracking view

A tab on the Case Library page ("Assigned" tab alongside "My Cases" / "All Cases"):

```
┌─────────────────────────────────────────────────────────┐
│  Assigned Cases                                          │
├──────────────────────┬──────────────────┬───────────────┤
│ Case                 │ Section          │ Progress      │
├──────────────────────┼──────────────────┼───────────────┤
│ Working Capital Mgmt │ MBA Sem II A     │ 42/60  (70%)  │
│ F-AT-002 · Level 1   │ Due: Jul 10      │ ████████░░    │
│                      │                  │ [View Detail] │
├──────────────────────┼──────────────────┼───────────────┤
│ Negotiation Case     │ MBA Sem III A    │ 31/58  (53%)  │
│ M-NG-001 · Level 2   │ No due date      │ ██████░░░░    │
│                      │                  │ [View Detail] │
└──────────────────────┴──────────────────┴───────────────┘
```

"View Detail" → shows per-student attempt status for that case + section (who has completed, who hasn't started, who is in-progress).

---

## 4. Student Portal Changes

### 4a. Case Studies page (updated)

Cases now come from two sources — faculty-assigned (via section) and mentor-assigned (direct). Both appear on the same page, grouped separately.

```
┌─────────────────────────────────────────────────────────┐
│  ASSIGNED BY YOUR FACULTY                               │
│  Dr. Ananya Rao · MBA Sem II · Section A                │
│                                                         │
│  Working Capital Management    Finance · Level 1        │
│  "Complete before Thursday's session"                   │
│  Due: July 10                   10 marks  [Start →]     │
│                                                         │
│  Negotiation Case              Marketing · Level 2      │
│  Due: July 18                   10 marks  [Start →]     │
├─────────────────────────────────────────────────────────┤
│  ASSIGNED BY YOUR MENTOR                                │
│  Ravi Mehta                                             │
│                                                         │
│  Leadership Conflict Case      Operations · Level 3     │
│  No due date                    10 marks  [Start →]     │
├─────────────────────────────────────────────────────────┤
│  COMPLETED                                    [3 cases] │
└─────────────────────────────────────────────────────────┘
```

### 4b. In-app notification on assignment

When a faculty assigns a case to a section, students in that section receive an in-app notification (bell icon in header) in addition to email:
- "New case assigned: Working Capital Management — due July 10"
- Clicking notification → goes directly to the case

---

## 5. Data Flow End-to-End

```
ADMIN creates section "MBA-II-A"
    │
    ├── Admin assigns Dr. Rao to MBA-II-A (subject: Marketing)
    │       → faculty_sections record written
    │       → Dr. Rao's dashboard shows MBA-II-A in "My Sections"
    │
    └── Admin enrolls 60 students into MBA-II-A
            → 60 student_sections records written
            → All 60 students show in Dr. Rao's /faculty/students roster

DR. RAO publishes case "Working Capital Management (F-AT-002)"
    │
    └── Dr. Rao clicks "Assign to Section" → selects MBA-II-A → confirms
            → case_section_assignments record written
            → 60 assigned_cases records written (one per student)
            → 60 notifications dispatched
            → Case appears in all 60 students' pending list immediately

STUDENT Amit Sharma logs in
    │
    └── Sees "Working Capital Management" in "Assigned by Faculty" section
            → Starts attempt → completes it
            → Dr. Rao's assigned cases view: progress updates to 43/60
```

---

## 6. New API Endpoints

### Admin
```
GET    /api/admin/sections                          list all sections
POST   /api/admin/sections                          create new section
GET    /api/admin/sections/{id}                     section detail
POST   /api/admin/sections/{id}/faculty             assign faculty to section
DELETE /api/admin/sections/{id}/faculty/{faculty_id} remove faculty from section
GET    /api/admin/sections/{id}/students            list enrolled students
POST   /api/admin/sections/{id}/students            enroll single student
POST   /api/admin/sections/{id}/students/bulk       bulk enroll via CSV
DELETE /api/admin/sections/{id}/students/{student_id} remove student from section
```

### Faculty
```
GET    /api/faculty/sections                        faculty's own sections
GET    /api/faculty/sections/{id}/students          roster for one section
POST   /api/faculty/cases/{id}/assign               assign case to section(s)
GET    /api/faculty/cases/assigned                  all assigned cases with progress
GET    /api/faculty/cases/assigned/{assignment_id}  per-student detail for one assignment
PATCH  /api/faculty/cases/assigned/{assignment_id}/close   close assignment
```

### Student
```
GET    /api/student/cases                           pending + active + completed (grouped by source)
```

### Notifications (internal, triggered by case assignment)
```
POST   /api/internal/notify/case-assigned           called internally when assignment is created
       body: { case_id, section_id, assigned_by, due_date, note }
```

---

## 7. DB changes needed (if not already from SPEC_12)

Confirm these tables exist after SPEC_12 migration ran:
- `class_sections` ✓
- `faculty_sections` ✓
- `student_sections` ✓
- `case_section_assignments` ✓
- `assigned_cases` (with `assignment_source` and `section_assignment_id` columns) ✓

If any of the above are missing — run the SPEC_12 migration before starting this build.

---

## 8. Build Order

1. **Admin: Section Management page** (`/admin/sections`) — list + create sections
2. **Admin: Manage Faculty drawer** — assign/remove faculty per section
3. **Admin: Manage Students drawer** — enroll/remove students per section
4. **Admin: Faculty detail page** — add "Teaching Sections" block
5. **Faculty: My Sections on dashboard** — reads from `faculty_sections`
6. **Faculty: Students page** — section-grouped roster
7. **Faculty: Assign to Section flow** — case library → assign modal → write records
8. **Faculty: Assigned Cases tracking tab** — progress view
9. **Student: Case list** — show faculty-assigned vs mentor-assigned, grouped
10. **Notification dispatch** — email + in-app on case assignment

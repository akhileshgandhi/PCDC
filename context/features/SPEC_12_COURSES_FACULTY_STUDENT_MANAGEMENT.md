# SPEC_12: Courses, Faculty Management, Student Management & Case Assignment

**Status:** New — covers gaps identified after stakeholder case review
**Affects:** Admin Portal, Faculty Portal, Student Portal, Database schema
**Depends on:** SPEC_08 (Admin Portal), SPEC_07 (Faculty Portal), SPEC_10 (Dynamic Data Mapping), SPEC_11 (Case Schema Gap Analysis)

---

## 0. The Problem Statement

Currently the platform has no concept of:
- Academic courses (MBA, PGDM, BBA etc.)
- Semesters (I, II, III, IV)
- Batches/years (2024–25, 2025–26)
- Which faculty teaches which course in which semester
- Which students are enrolled in which course and semester
- How faculty directly see and manage their class roster
- How faculty assign case studies to a specific class (not individual students)

Without this, faculty logging in have no idea which students they are responsible for, and there is no logical grouping for case study assignment — a case about "Working Capital Management" should go to Semester III Finance students, not everyone in the system.

This spec closes all of those gaps.

---

## 1. The Complete Academic Structure

```
INSTITUTION
    │
    ├── COURSE (MBA, PGDM, BBA etc.)
    │       │
    │       └── SEMESTER (I, II, III, IV etc.)
    │               │
    │               └── BATCH (2024–25, 2025–26 etc.)
    │                       │
    │                       ├── ENROLLED STUDENTS (many)
    │                       └── ASSIGNED FACULTY (one or more)
    │
    └── CASE STUDY
            │
            └── ASSIGNED TO → COURSE + SEMESTER + BATCH
                              (or to individual students via Mentor)
```

A faculty member teaches one or more **course-semester-batch combinations**. They see only the students enrolled in those combinations. They assign case studies to those combinations (which pushes the case to all enrolled students at once, or to selected students within the class).

---

## 2. New Database Tables

### Table: `courses`
```
course_id       UUID, PK
course_name     VARCHAR(100)    -- e.g. "MBA", "PGDM", "BBA", "Executive MBA"
course_code     VARCHAR(20)     -- e.g. "MBA", "PGDM"
total_semesters INTEGER         -- e.g. 4 for MBA, 6 for BBA
duration_years  INTEGER         -- e.g. 2 for MBA, 3 for BBA
status          ENUM('active', 'inactive'), DEFAULT 'active'
created_at      TIMESTAMP
```

### Table: `semesters`
```
semester_id     UUID, PK
course_id       FK → courses.course_id
semester_number INTEGER         -- 1, 2, 3, 4 etc.
semester_name   VARCHAR(20)     -- "Semester I", "Semester II" etc.
```
Note: Semesters are seeded automatically when a course is created (e.g. MBA with 4 semesters → seeds 4 rows).

### Table: `batches`
```
batch_id        UUID, PK
course_id       FK → courses.course_id
batch_name      VARCHAR(50)     -- e.g. "MBA 2024–26", "PGDM 2025–27"
start_year      INTEGER         -- e.g. 2024
end_year        INTEGER         -- e.g. 2026
status          ENUM('active', 'completed', 'upcoming'), DEFAULT 'active'
created_at      TIMESTAMP
```

### Table: `class_sections`
This is the key linking table — it represents one specific class:
"MBA Semester II Batch 2024–26 taught by Dr. Ananya Rao"

```
section_id      UUID, PK
course_id       FK → courses.course_id
semester_id     FK → semesters.semester_id
batch_id        FK → batches.batch_id
section_name    VARCHAR(50)     -- e.g. "MBA-II-A", "PGDM-III-Finance"
academic_year   VARCHAR(10)     -- e.g. "2025–26" (current teaching year)
status          ENUM('active', 'completed'), DEFAULT 'active'
created_at      TIMESTAMP
```

### Table: `faculty_sections` (Faculty → Class assignment)
```
id              UUID, PK
faculty_id      FK → users.id (where role = 'faculty')
section_id      FK → class_sections.section_id
subject         VARCHAR(100)    -- e.g. "Financial Management", "Marketing Strategy"
assigned_at     TIMESTAMP
assigned_by     FK → users.id (admin who assigned)
```
One faculty can teach multiple sections. One section can have multiple faculty (different subjects).

### Table: `student_sections` (Student → Class enrollment)
```
id              UUID, PK
student_id      FK → students.student_id
section_id      FK → class_sections.section_id
enrolled_at     TIMESTAMP
enrolled_by     FK → users.id (admin who enrolled)
status          ENUM('active', 'dropped'), DEFAULT 'active'
```
One student can be enrolled in one section at a time (can change semester as they progress through the program).

### Table: `case_section_assignments` (Case Study → Class assignment)
```
assignment_id   UUID, PK
case_id         FK → simulations.simulation_id
section_id      FK → class_sections.section_id
assigned_by     FK → users.id (faculty who assigned)
assigned_at     TIMESTAMP
due_date        TIMESTAMP (nullable)
instructions    TEXT (nullable) -- faculty's note to the class about this case
status          ENUM('active', 'closed'), DEFAULT 'active'
```
When a faculty assigns a case to a section, it creates one record here — and the student portal automatically shows it to all students enrolled in that section.

---

## 3. Changes to Existing Tables

### `students` table — add course tracking
```sql
ALTER TABLE students ADD COLUMN current_section_id UUID REFERENCES class_sections(section_id);
ALTER TABLE students ADD COLUMN current_semester_number INTEGER;  -- denormalized for quick queries
ALTER TABLE students ADD COLUMN course_id UUID REFERENCES courses(course_id);
ALTER TABLE students ADD COLUMN batch_id UUID REFERENCES batches(batch_id);
```
(The existing `program` text field can stay for backward compatibility but `course_id` becomes the FK reference going forward.)

### `users` table (faculty records) — no structural change needed
Faculty are already `role = 'faculty'` in the users table. Their class assignments live in `faculty_sections`.

### `simulations` table (case studies) — add subject alignment
```sql
ALTER TABLE simulations ADD COLUMN recommended_semester INTEGER[];  -- e.g. [3, 4] means Semester III or IV
ALTER TABLE simulations ADD COLUMN recommended_courses UUID[];      -- optional course scope
```
These are soft recommendations, not hard locks. Faculty can assign any published case to any section.

---

## 4. Admin Portal Changes

### 4a. Course Management (new sub-section in Admin Settings)

**Route:** `/admin/settings/courses` (or `/admin/courses` as a dedicated page)

**What admin can do:**
- View all courses (name, code, total semesters, active batches count, enrolled students count)
- Add a new course → fields: Course Name, Course Code, Total Semesters, Duration (years)
  - Creating a course auto-seeds semester rows
- Edit a course (rename, change status to inactive)
- Add a new batch to a course → fields: Batch Name, Start Year, End Year
- Create a class section → link Course + Semester + Batch + give it a section name

**UI layout:**
```
┌────────────────────────────────────────────────┐
│  Courses                        [+ Add Course]  │
├────────────────────────────────────────────────┤
│  MBA                                            │
│  4 semesters · 2 years                         │
│  Batches: 2024–26 (active) · 2023–25 (active)  │
│  Students: 240  Faculty: 18                     │
│  [Manage Sections]                              │
├────────────────────────────────────────────────┤
│  PGDM                                           │
│  4 semesters · 2 years                         │
│  Batches: 2025–27 (upcoming)                    │
│  Students: 120  Faculty: 9                      │
│  [Manage Sections]                              │
└────────────────────────────────────────────────┘
```

### 4b. Section Management

**Route:** `/admin/courses/{course_id}/sections`

Admin can see all sections for a course:
```
MBA Semester I — Batch 2024–26 — Section A
  Faculty: Dr. Ananya Rao (Marketing), Prof. Ravi Patel (Finance)
  Students: 60 enrolled
  [Manage Faculty] [Manage Students] [View Cases Assigned]

MBA Semester II — Batch 2024–26 — Section A
  Faculty: Dr. Ananya Rao (Marketing), Dr. Mehta (Operations)
  Students: 58 enrolled
  [Manage Faculty] [Manage Students] [View Cases Assigned]
```

**Assign Faculty to Section:**
- Select faculty from active faculty list
- Enter subject they're teaching in that section
- Faculty immediately gains visibility of that section's students

**Assign Students to Section:**
- Bulk: select multiple students → assign to section
- Individual: from student detail page
- Import: during bulk CSV import, `section_id` column supported

### 4c. Updated User Management (students)

The existing `/admin/users` student view should add columns for:
- Course (e.g. MBA)
- Batch (e.g. 2024–26)
- Current Semester Section (e.g. MBA-II-A)

The "Add User" form for students should include:
- Course (dropdown → populated from `courses` table)
- Batch (dropdown → filtered by selected course)
- Section (dropdown → filtered by course + batch)

The CSV import template should include:
- `course_code` (e.g. MBA)
- `batch_name` (e.g. 2024–26)
- `section_name` (e.g. MBA-II-A)
- `semester_number` (e.g. 2)

### 4d. Semester Progression (Admin action)
At the end of each semester, admin performs a batch "advance semester" action:
- Selects a batch (e.g. MBA 2024–26)
- System moves all active students from their current section to the next semester's section
- Students whose section doesn't exist yet get flagged (admin creates the new section first)
- This is a bulk operation, not automated — admin controls when it happens

**API endpoints (new):**
- `GET /api/admin/courses`
- `POST /api/admin/courses`
- `GET /api/admin/courses/{id}/sections`
- `POST /api/admin/courses/{id}/sections`
- `POST /api/admin/sections/{id}/faculty` (assign faculty)
- `POST /api/admin/sections/{id}/students` (enroll students)
- `POST /api/admin/batches/{id}/advance-semester` (bulk semester progression)

---

## 5. Faculty Portal Changes

### 5a. Faculty Dashboard (updated)

The dashboard stats change significantly now that faculty have a defined class roster:

```
┌────────────────────────────────────────────────────┐
│  Welcome, Dr. Ananya Rao                           │
│  Faculty · Marketing                               │
├──────────────┬────────────┬──────────┬────────────┤
│ My Sections  │ My Students│ Cases    │ Pending    │
│     3        │    178     │ Assigned │ Reviews    │
│              │            │    12    │     8      │
├──────────────┴────────────┴──────────┴────────────┤
│ MY SECTIONS                                        │
│  MBA Sem II · Batch 2024–26 · Section A  (60 std) │
│  MBA Sem III · Batch 2023–25 · Section A (58 std) │
│  PGDM Sem I · Batch 2025–27 · Section B  (60 std) │
├────────────────────────────────────────────────────┤
│ RECENT ACTIVITY                                    │
│  14 students completed "Working Capital" case      │
│  3 new attempts on "Negotiation" case pending      │
└────────────────────────────────────────────────────┘
```

### 5b. Faculty Students Page (updated)

Previously: faculty saw only students who had attempted their cases.
Now: faculty sees all students in their sections, with case attempt status.

**Route:** `/faculty/students`

```
┌─────────────────────────────────────────────────────────┐
│  My Students (178)                                       │
│  Filter: Section ▼  Attempt Status ▼  Capability ▼      │
├──────────────────────────────────────────────────────────┤
│  Section: MBA Sem II · 2024–26 · Section A (60 students)│
├──────────────────────────────────────────────────────────┤
│  Amit Sharma    · Score: 72  · Attempts: 3/5  · Active  │
│  Priya Desai    · Score: 54  · Attempts: 1/5  · At Risk │
│  Arjun Mehta    · Score: 68  · Attempts: 2/5  · Active  │
│  ...                                                     │
├──────────────────────────────────────────────────────────┤
│  Section: PGDM Sem I · 2025–27 · Section B (60 students)│
├──────────────────────────────────────────────────────────┤
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**Columns:** Name, Capability Score, Cases Attempted (out of cases assigned to this section), Last Active, Status (On Track / At Risk / Inactive)

**Key change:** Faculty can now see students who haven't attempted any case yet — because they see by enrollment, not by attempts. This is important — faculty needs to see who's falling behind.

### 5c. Case Assignment by Faculty (new flow)

Previously: cases were only assigned by mentors to individual students.
Now: faculty can assign a case study to an entire section (all students in that class) — this is the primary case distribution method.

**Route:** `/faculty/case-library` → "Assign to Class" button on each published case

**"Assign to Class" flow:**
1. Faculty clicks "Assign to Class" on a case
2. Modal opens:
   ```
   Assign: "Working Capital Management"
   
   Select Section(s):
   ☑ MBA Sem II · 2024–26 · Section A (60 students)
   ☐ MBA Sem III · 2023–25 · Section A (58 students)
   ☐ PGDM Sem I · 2025–27 · Section B (60 students)
   
   Due Date: [optional date picker]
   
   Instructions to class: [optional text]
   e.g. "Complete this before Thursday's session"
   
   [Assign to Selected Sections]
   ```
3. On confirm:
   - Creates `case_section_assignments` record per selected section
   - All students in those sections see the case in their pending list immediately
   - Tagged "Assigned by Faculty" (distinguishable from "Assigned by Mentor")
   - Notification sent to all students in the section

**"Assigned Cases" view for faculty:**
A tab on the case-library page showing:
- Which cases are currently assigned to which sections
- Attempt completion rate per case per section (e.g. "42/60 students completed")
- Average score per section
- Option to close assignment (no new attempts allowed after close date)

### 5d. Faculty Case Builder (updated)

When creating a case, faculty should now be able to set:
- **Recommended Course(s):** multi-select from active courses
- **Recommended Semester(s):** multi-select (filtered by selected courses)
- **Subject alignment:** which subject does this case support (from faculty's own teaching subjects)

These are soft tags — they help faculty filter cases when assigning, but don't restrict who can attempt them.

### 5e. Faculty Analytics (updated)

Analytics now has a section dimension:
- Compare capability score distribution across sections (are MBA Sem III students stronger than Sem II?)
- Per-case completion rates per section
- Which section has the most at-risk students

---

## 6. Student Portal Changes

### 6a. Student Dashboard (updated)

Student should see their academic identity clearly:
```
Welcome, Amit Sharma
MBA · Semester II · Batch 2024–26 · Section A
Mentor: Ravi Mehta
```

### 6b. Student Case Studies Page (updated)

Cases now come from two sources:
1. **Faculty-assigned** (assigned to the student's section — new)
2. **Mentor-assigned** (assigned directly to the student — existing)

In phase 1 these are the only two sources (student self-selection is phase 2).

Visual distinction:
```
┌──────────────────────────────────────────────────────┐
│  ASSIGNED TO YOUR CLASS (by Dr. Ananya Rao)          │
│                                                      │
│  Working Capital Management     Finance · Level 1    │
│  Due: July 10                   10 marks             │
│  [Start]                                             │
│                                                      │
│  Negotiation Case               Marketing · Level 2  │
│  No due date                    10 marks             │
│  [Start]                                             │
├──────────────────────────────────────────────────────┤
│  ASSIGNED BY YOUR MENTOR (Ravi Mehta)                │
│                                                      │
│  Leadership Conflict Resolution Operations · Level 3 │
│  [Start]                                             │
└──────────────────────────────────────────────────────┘
```

---

## 7. Relationship Summary (Updated from SPEC_10)

SPEC_10 Section 4 said: "Faculty sees students through case attempts — no direct assignment." That decision is now revised:

**Revised decision:** Faculty has a direct class roster via `faculty_sections` → `student_sections`. Faculty sees all enrolled students regardless of whether they've attempted any case. This is more operationally correct — a faculty member needs to know all their students from day one, not only after attempts happen.

**SPEC_10 Section 5 (Mentor case assignment)** remains unchanged. Mentors assign cases to individual students. Faculty assign cases to entire sections. Both create `assigned_cases` entries visible to students.

Updated `assigned_cases` table:
```sql
ALTER TABLE assigned_cases ADD COLUMN assignment_source ENUM('mentor', 'faculty', 'admin') DEFAULT 'mentor';
ALTER TABLE assigned_cases ADD COLUMN section_assignment_id UUID REFERENCES case_section_assignments(assignment_id);
-- section_assignment_id is set when the case was pushed to student via a section assignment
-- null when assigned directly by mentor to individual student
```

---

## 8. API Endpoints Summary

**Admin (new):**
- `GET/POST /api/admin/courses`
- `GET/PUT/DELETE /api/admin/courses/{id}`
- `GET/POST /api/admin/courses/{id}/batches`
- `GET/POST /api/admin/courses/{id}/sections`
- `POST /api/admin/sections/{id}/assign-faculty`
- `POST /api/admin/sections/{id}/enroll-students`
- `POST /api/admin/sections/{id}/bulk-enroll` (CSV)
- `POST /api/admin/batches/{id}/advance-semester`

**Faculty (new/updated):**
- `GET /api/faculty/sections` (faculty's own sections)
- `GET /api/faculty/sections/{id}/students` (roster for one section)
- `GET /api/faculty/students` (all students across all sections — updated)
- `POST /api/faculty/cases/{id}/assign-section` (assign case to section(s))
- `GET /api/faculty/cases/assigned` (view all assigned cases with completion rates)
- `PATCH /api/faculty/case-assignments/{id}/close`

**Student (updated):**
- `GET /api/student/cases` (returns faculty-assigned + mentor-assigned, separated)
- `GET /api/student/profile` (now includes course/section/batch/semester info)

---

## 9. Decisions Log (all resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Multiple sections per student | **One section only.** A student belongs to exactly one section at a time. No secondary/elective sections in phase 1. |
| 2 | Section naming convention | **Admin-defined** at creation time (e.g. "MBA-II-A"). Not editable after students are enrolled to protect data integrity. |
| 3 | Existing students with no section | **Admin bulk-assigns** existing students to sections as a one-time migration using the bulk enrollment tool (CSV upload with student email + section_name columns). No automated migration — admin controls when and how it happens. |
| 4 | Faculty assigning same case to multiple sections | **Separate `case_section_assignments` record per section.** Completion analytics, scores, and attempt counts are tracked independently per section. Dr. Rao sees "42/60 in MBA Sem II" and "38/58 in MBA Sem III" as separate lines. |
| 5 | Case visibility after completion | **Completed tab.** Active/pending assignments show in the main case list. Once a student completes a case, it moves to a "Completed" tab — main view stays clean and focused on what still needs doing. |

---

## 10. Build Order

1. **DB migrations** — all new tables + alterations to existing tables (do in one Alembic revision)
2. **Admin: Course & Section Management** — add courses, batches, sections; assign faculty and students to sections
3. **Seed existing data** — migrate existing students' `program` field to `course_id`; assign to sections
4. **Faculty: Sections roster view** — faculty dashboard now shows sections + student counts
5. **Faculty: Students page** — show by section, not just by attempts
6. **Faculty: Case assignment to section** — "Assign to Class" flow
7. **Student: Case list** — faculty-assigned cases appear immediately on section assignment
8. **Analytics updates** — section dimension added to faculty analytics
9. **Admin: Semester advancement** — batch operation for end-of-semester progression

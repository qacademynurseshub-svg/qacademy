# MyTeacher — Slice 12–14 Build Plan
**Document prepared for Claude Desktop implementation**
**Date: April 2026**
**Status: Approved and ready to build**

---

## Context

This document covers three new slices for the MyTeacher feature of QAcademy Nurses Hub. These slices introduce a proper academic structure layer to the platform — Programmes, Cohorts, and Courses — that has been missing from the original design.

The current system uses `teacher_classes` as an all-purpose object carrying too many meanings at once (student group + course identity + semester context). This plan separates those concerns cleanly.

**Stack reminder:**
- Frontend: Vanilla HTML/CSS/JS on Cloudflare Pages
- Database: Supabase PostgreSQL with RLS
- Repo: `mybackpacc-byte/qacademy-gamma`
- No real users yet — clean migration, no legacy data concerns

---

## The Mental Model

```
Programme  = the academic programme (BSc Nursing, BSc Midwifery)
Cohort     = WHO   (BSc Nursing 2024 Intake)
Course     = WHAT  (Pharmacology 1)
Class      = WHO + WHAT + WHEN  (BSc Nursing 2024 Intake — Pharmacology 1 — Sem 1 2024/2025)
Quiz       = reusable assessment belonging to a Course
Assignment = a Quiz linked to one or more Classes via teacher_quiz_classes
```

**One-line rule:**
- A teacher creates Courses and Cohorts independently
- A Class is the intersection of a Cohort + a Course + a Semester
- A Quiz belongs to a Course and gets assigned to Classes — reused every year

---

## Relationship Summary

```
Teacher
  ├── creates many Programmes
  ├── creates many Cohorts (each linked to one Programme)
  ├── creates many Courses (not restricted to one Programme)
  ├── creates many Classes (linked to Cohort + Course — required in UI, nullable in DB)
  └── creates many Quizzes (each linked to one Course)

Programme
  └── belongs to one Teacher
  └── has many Cohorts

Cohort
  └── belongs to one Teacher
  └── belongs to one Programme
  └── has many Classes

Course
  └── belongs to one Teacher
  └── has many Quizzes
  └── has many Classes

Class
  └── optionally belongs to one Cohort (nullable in DB, required in UI for new classes)
  └── optionally belongs to one Course (nullable in DB, required in UI for new classes)
  └── has many Members (students)
  └── has many Quizzes (via teacher_quiz_classes)

Quiz
  └── belongs to one Course (course_id required going forward, subject text kept as fallback)
  └── assigned to many Classes (via teacher_quiz_classes — unchanged)
```

---

## Slice 12 — Teacher Courses

### What it is
A Course is what a teacher teaches — Pharmacology 1, Anatomy 1, Research Methods. Created once, reused every year. Quizzes belong to a Course.

### New table

```sql
CREATE TABLE teacher_courses (
  course_id    TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL REFERENCES teachers(teacher_id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_courses_teacher_id ON teacher_courses(teacher_id);
```

### RLS
```sql
-- Teacher can only see and manage their own courses
CREATE POLICY "teacher_courses_select" ON teacher_courses
  FOR SELECT USING (auth_user_id() = teacher_id);

CREATE POLICY "teacher_courses_insert" ON teacher_courses
  FOR INSERT WITH CHECK (auth_user_id() = teacher_id);

CREATE POLICY "teacher_courses_update" ON teacher_courses
  FOR UPDATE USING (auth_user_id() = teacher_id);
```

### API functions to add to `myteacher-api.js`
- `createCourse(teacherId, payload)` — insert new course
- `getCourses(teacherId, opts)` — list teacher's courses, filter by status
- `updateCourse(courseId, teacherId, patch)` — update title/description
- `archiveCourse(courseId, teacherId)` — set status = 'ARCHIVED'

### Existing table changes

```sql
-- Add course_id to teacher_quizzes (nullable for now — subject kept as fallback)
ALTER TABLE teacher_quizzes
  ADD COLUMN course_id TEXT REFERENCES teacher_courses(course_id);

CREATE INDEX idx_teacher_quizzes_course_id ON teacher_quizzes(course_id);
```

**Important:** Do NOT drop `subject` column yet. Display logic:
- If `course_id` is set → show course title from lookup
- If `course_id` is null → fall back to displaying `subject` text
- Remove `subject` column only after all quizzes are migrated and system is stable

---

## Slice 13 — Teacher Cohorts

### What it is
A Cohort is the permanent identity of a student group. "BSc Nursing 2024 Intake" — created once, never changes. The same group of students progresses through semesters and years under this cohort label.

Every year the teacher gets a new intake — a new cohort. Multiple programmes can exist within one intake year (Nursing 2024, Midwifery 2024, Mental Health 2024 — all separate cohorts, same intake year).

### New tables

```sql
-- Programmes (lightweight — just a title)
CREATE TABLE teacher_programmes (
  programme_id  TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES teachers(teacher_id),
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_programmes_teacher_id ON teacher_programmes(teacher_id);

-- Cohorts
-- No uniqueness constraint — a teacher can have multiple cohorts for the same
-- programme and intake year (e.g. Group A and Group B of the same intake).
-- Cohorts are identified by their title only.
CREATE TABLE teacher_cohorts (
  cohort_id     TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES teachers(teacher_id),
  programme_id  TEXT NOT NULL REFERENCES teacher_programmes(programme_id),
  title         TEXT NOT NULL,
  intake_year   INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_cohorts_teacher_id   ON teacher_cohorts(teacher_id);
CREATE INDEX idx_teacher_cohorts_programme_id ON teacher_cohorts(programme_id);
```

### RLS (same pattern)
```sql
-- Programmes
CREATE POLICY "teacher_programmes_select" ON teacher_programmes
  FOR SELECT USING (auth_user_id() = teacher_id);
CREATE POLICY "teacher_programmes_insert" ON teacher_programmes
  FOR INSERT WITH CHECK (auth_user_id() = teacher_id);
CREATE POLICY "teacher_programmes_update" ON teacher_programmes
  FOR UPDATE USING (auth_user_id() = teacher_id);

-- Cohorts
CREATE POLICY "teacher_cohorts_select" ON teacher_cohorts
  FOR SELECT USING (auth_user_id() = teacher_id);
CREATE POLICY "teacher_cohorts_insert" ON teacher_cohorts
  FOR INSERT WITH CHECK (auth_user_id() = teacher_id);
CREATE POLICY "teacher_cohorts_update" ON teacher_cohorts
  FOR UPDATE USING (auth_user_id() = teacher_id);
```

### API functions to add to `myteacher-api.js`
- `createProgramme(teacherId, payload)`
- `getProgrammes(teacherId, opts)`
- `updateProgramme(programmeId, teacherId, patch)`
- `archiveProgramme(programmeId, teacherId)`
- `createCohort(teacherId, payload)` — payload includes `programme_id`, `title`, `intake_year`
- `getCohorts(teacherId, opts)` — optionally filter by programme_id
- `updateCohort(cohortId, teacherId, patch)`
- `archiveCohort(cohortId, teacherId)`

---

## Slice 14 — Wire Courses and Cohorts into Classes and Quizzes

### Existing table changes

```sql
-- Add cohort_id and course_id to teacher_classes
-- Both nullable in DB for backward compatibility
-- Both required in UI for all new classes going forward
ALTER TABLE teacher_classes
  ADD COLUMN cohort_id TEXT REFERENCES teacher_cohorts(cohort_id),
  ADD COLUMN course_id TEXT REFERENCES teacher_courses(course_id);

CREATE INDEX idx_teacher_classes_cohort_id ON teacher_classes(cohort_id);
CREATE INDEX idx_teacher_classes_course_id ON teacher_classes(course_id);
```

### UI changes

**`myteacher/teacher/classes.html`**
- Class creation modal: add required dropdowns for Cohort and Course
  - Cohort dropdown: pulls from `getCohorts(teacherId)` — grouped by programme
  - Course dropdown: pulls from `getCourses(teacherId)`
  - Both required before teacher can save a new class
- Class list: group classes by cohort in the left panel
  - Show cohort label as a section header
  - Classes under each cohort sorted by academic_year + semester

**`myteacher/teacher/quizzes.html`**
- Settings pane: replace the subject free-text input with a Course selector dropdown
  - Pulls from `getCourses(teacherId)`
  - If existing quiz has no `course_id` but has `subject` text — show subject as placeholder hint
  - Saving always writes `course_id`

**`myteacher/student/my-classes.html`**
- Group student's classes by programme/cohort
- Instead of flat list — show cohort as a section header
- Each class under that cohort represents one course for that semester

---

## New Page — Academic Structure

**File:** `myteacher/teacher/academic-structure.html`

A single page that loads three self-contained components. This is where teachers set up their academic structure before creating classes and quizzes.

**Page layout:** Three panels side by side (or stacked on mobile):
- Programmes panel
- Cohorts panel
- Courses panel

**Component files:**
```
myteacher/teacher/components/programmes-panel.js
myteacher/teacher/components/cohorts-panel.js
myteacher/teacher/components/courses-panel.js
```

Each component:
- Injects its own CSS and HTML
- Has its own fetch, render, create, edit, archive logic
- Self-contained — can be dropped into any page independently in future
- Exposes a simple public init function e.g. `initProgrammesPanel(containerId, teacherId)`

**Navigation:** Add "Academic Structure" link to the teacher nav (`myteacher-teacher-nav.js`)

---

## Build Order

Follow this exact order — each step depends on the previous:

```
1. Create teacher_programmes table + RLS
2. Create teacher_cohorts table + RLS
3. Create teacher_courses table + RLS
4. Alter teacher_classes — add cohort_id, course_id (nullable)
5. Alter teacher_quizzes — add course_id (nullable, keep subject)
6. Add all indexes
7. Add API functions to myteacher-api.js
8. Build programmes-panel.js component
9. Build cohorts-panel.js component
10. Build courses-panel.js component
11. Build academic-structure.html (thin shell loading all three)
12. Add Academic Structure to teacher nav
13. Update classes.html — cohort + course selectors, grouped class list
14. Update quizzes.html — course selector in settings pane
15. Update my-classes.html — group by programme/cohort
```

---

## On Hold — Student Panel Component

**File planned:** `myteacher/teacher/student-panel.js`

**What it is:** A reusable modal component triggered from anywhere a teacher sees a student. Shows the full picture of one student — identity, classes, custom fields, all attempts.

**Why on hold:** The student panel is designed to show a student's classes and attempts. Once Courses and Cohorts are wired into classes, the data shape and display logic for classes changes significantly. Building the student panel now would require rebuilding it after Slice 12-14. Build this after Slices 12-14 are complete.

**Spec when ready to build:**

Trigger function: `openStudentPanel(userId, teacherId)`

Modal design:
- Top bar (B design): avatar initials, name, email, attempts count, avg score, pass rate
- Tabbed body (C design): Attempts tab, Classes tab, Fields tab

Attempts tab:
- All attempts across all teacher's quizzes sorted newest first
- Each row: quiz title, class, course, attempt number, score, pass/fail chip, date
- Clicking an attempt navigates to `results.html?class_id=X&quiz_id=Y&attempt_id=Z`
- Filter: All time / This class / This year

Classes tab:
- All of this teacher's classes the student is in
- Shows cohort, course, semester, joined date, status
- Colour dot from class carried through

Fields tab:
- Custom field values per class (student may be in multiple classes)
- Grouped by class with class title as section header

Trigger button label: **"Student overview"**

Wire into:
- `classes.html` — on each member row
- `results.html` — on each marksheet student row

**Do not build until Slices 12-14 are complete.**

---

## Key Principles to Respect

- **Automation first:** All dropdowns pull from DB — adding a new programme/cohort/course reflects everywhere instantly
- **Backward compatible:** Existing classes and quizzes without cohort_id/course_id continue to work
- **No breaking changes:** teacher_quiz_classes unchanged — quiz-to-class assignment already works correctly
- **RLS pattern:** Use existing `auth_user_id()` and `auth_user_role()` helper functions — do not write raw auth calls in policies
- **XSS:** Use `safeText()` and `safeAvatar()` from `js/utils.js` — no innerHTML injection
- **Naming:** Use `esc()` for all user-generated content rendered in HTML
- **IDs:** Generate using existing `make*Id()` pattern in `myteacher-api.js`

---

## Files to Create

```
NEW:
myteacher/teacher/academic-structure.html
myteacher/teacher/components/programmes-panel.js
myteacher/teacher/components/cohorts-panel.js
myteacher/teacher/components/courses-panel.js

MODIFIED:
js/myteacher-api.js          — new API functions
js/myteacher-teacher-nav.js  — add Academic Structure link
myteacher/teacher/classes.html   — cohort + course selectors, grouped list
myteacher/teacher/quizzes.html   — course selector in settings pane
myteacher/student/my-classes.html — group by programme/cohort

DB (run in Supabase SQL editor):
— CREATE teacher_programmes
— CREATE teacher_cohorts
— CREATE teacher_courses
— ALTER teacher_classes
— ALTER teacher_quizzes
— All indexes
— All RLS policies
```

---

*End of document. Share with Claude Desktop to begin implementation.*

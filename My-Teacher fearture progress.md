# QAcademy My Teacher — Feature Progress

Last updated: March 2026 — v1.7 (Slices 1–5 complete. Next: Slice 6 — Teacher Quiz Manager)

---

## Slice Table

| Slice | What | Status |
|---|---|---|
| 1 | DB + Guard | ✅ COMPLETE |
| 2 | Admin: Teacher Access + Router + Dashboards | ✅ COMPLETE |
| 3 | Teacher: Classes | ✅ COMPLETE |
| 4 | Student: My Classes | ✅ COMPLETE |
| 5 | Teacher: Question Bank | ✅ COMPLETE |
| 6 | Teacher: Quiz Manager | ← Next |
| 7 | Student: Quiz Runner | Queued |
| 8 | Teacher: Results | Queued |
| 9 | Teacher: Dashboard (wired) | Queued |

---

## Slice 5 Delivery Notes — ✅ Complete

### Files delivered

| Item | File | Notes |
|---|---|---|
| teacher-api.js (Slice 5) | `js/teacher-api.js` | 7 new functions appended |
| Teacher Question Bank | `myteacher/teacher/bank.html` | Full page |

### teacher-api.js — new functions

| Function | Purpose |
|---|---|
| `getBankFilterOptions(teacherId)` | Distinct subject, maintopic, subtopic values for filter dropdowns |
| `getBankItems(teacherId, filters)` | Full fetch with server-side filters: status, subject, maintopic, subtopic, difficulty, keyword |
| `getBankItem(bankItemId)` | Single full row for editor — always fetches fresh |
| `createBankItem(teacherId, payload)` | Insert new row, auto-generates `TBANK_` + `Date.now()` ID, sets `source_type = TEACHER` |
| `updateBankItem(bankItemId, patch)` | Patch-only update, always stamps `updated_at` |
| `setArchiveBankItem(bankItemId, action)` | Soft archive/restore — never deletes |
| `appendToDraftItems(teacherQuizId, bankItemIds)` | Picker mode: merges selected IDs into `draft_items_json`, returns `{ added, skipped, total }` |

### bank.html — features

- Two-column layout: scrollable card list (left) + sticky editor panel (right)
- Full question card display — no truncation: full stem, all options with per-option feedback, correct answer highlighted green with ✓ tick, rationale text, image thumbnail inline
- Question types: MCQ (up to 6 options), TF (A=True / B=False, locked), SATA (multi-correct checkboxes)
- Image upload to `rationale-images` Supabase Storage bucket — same pattern as admin bank
- Classification: Subject / Main Topic / Subtopic (three-level, aligns with QAcademy library)
- Filters: keyword (client-side debounced), status, difficulty, subject, maintopic, subtopic — tag dropdowns auto-built from bank data
- Status: ACTIVE / ARCHIVED (soft — never hard delete)
- Editor header colour: green tint = New Question, amber tint = Edit Question
- Picker mode: `?mode=picker&teacher_quiz_id=TQ_xxx&return_to=...` — editor hidden, checkboxes on cards, bottom dock with quiz selector (when no `teacher_quiz_id` in URL), Select all visible, Add to Draft, ← Back to Bank
- **"Add questions to a quiz"** button: reloads page in picker mode, quiz selector dropdown in dock populated with teacher's DRAFT quizzes
- **"Bulk add (CSV)"** button: navigates to `import.html?return_to=<current_url>`
- Ctrl/Cmd + S keyboard shortcut saves from editor

### Key decisions

- Filter dropdowns (status, subject, maintopic, subtopic, difficulty) trigger a full server re-query via `loadItems()` — keyword is client-side only for fast feedback
- No scroll constraint on list — page scrolls freely, editor stays sticky
- `source_type` is auto-set to `TEACHER` on create — not editable in the form; shown as read-only pill in cards
- `shuffle_options` auto-managed by question type: TF sets false, MCQ/SATA sets true; teacher can override
- Picker mode entered from bank button uses clean URL navigation back (strips `?mode=picker`); called from quiz manager uses `return_to`
- CSV import is a separate page (`import.html`) — not a modal — deferred to Slice 5b

---

## Slice 5b — Queued (after Slice 6)

- `myteacher/teacher/import.html` — CSV bulk import into teacher bank
- Columns: `question_type`, `stem`, `option_a–f`, `fb_a–f`, `correct`, `rationale`, `rationale_img`, `subject`, `maintopic`, `subtopic`, `difficulty`, `marks`, `shuffle_options`
- SATA support: `correct` as comma-separated e.g. `a,c,e`
- `source_type = IMPORT`, `imported_at = now()` set on all imported rows
- Max 300 rows per upload
- Parse → preview table → validate → import flow
- Download template button

---

## Slice 2 Delivery Notes — ✅ Complete

| Item | File | Notes |
|---|---|---|
| myteacher-teacher-nav.js | `js/myteacher-teacher-nav.js` | Topbar for /myteacher/teacher/* pages |
| myteacher-student-nav.js | `js/myteacher-student-nav.js` | Topbar for /myteacher/student/* pages |
| myteacher-admin-nav.js | `js/myteacher-admin-nav.js` | Topbar for /myteacher/admin/* pages |
| Teacher dashboard shell | `/myteacher/teacher/dashboard.html` | Stats shell, wired in Slice 9 |
| Student dashboard shell | `/myteacher/student/dashboard.html` | Stats shell, quick links |
| Admin dashboard shell | `/myteacher/admin/dashboard.html` | Live pending count from teacher_profiles |
| Admin teachers page | `/myteacher/admin/teachers.html` | Full teacher access management |
| access-request.html | `/myteacher/teacher/access-request.html` | First-time request only |
| router.html | `/router.html` | Teacher Assess card uses teacher_profiles + teacher_class_members |

**Key decisions:**
- Router ignores `users.role` for Teacher Assess card — source of truth is `teacher_profiles` (teacher side) and `teacher_class_members` (student side)
- Pending/disabled states handled inline on router — no separate page navigation
- Admin approve flips both `teacher_profiles.active = true` and `users.role = 'TEACHER'`
- Admin disable flips `teacher_profiles.active = false` — `users.role` stays TEACHER, guard's second-level check handles the block

---

## Slice 3 Delivery Notes — ✅ Complete

| Item | File | Notes |
|---|---|---|
| teacher-api.js (Slice 3) | `js/teacher-api.js` | New file. Classes + members data layer |
| Teacher Classes page | `/myteacher/teacher/classes.html` | Two-column layout, create/edit modal, custom fields, member roster, join code |

**Key decisions:**
- `teacher-api.js` is a separate file from `api.js`
- Custom fields: text labels only, max 4, each with label, key (auto-generated), required toggle
- Join codes: 6-character alphanumeric, no 0/O/1/I
- Remove member sets `status = REMOVED` — never deletes rows
- `getMemberCounts()` uses a single batch query for all classes

---

## Slice 4 Delivery Notes — ✅ Complete

| Item | File | Notes |
|---|---|---|
| teacher-api.js (Slice 4) | `js/teacher-api.js` | 5 new functions appended |
| Student My Classes page | `/myteacher/student/my-classes.html` | Two-column layout, join flow, custom fields, Quizzes tab shell |

**Key decisions:**
- `getStudentClasses()` joins `teacher_class_members` + `teacher_classes` in one query
- Join flow: validate code → check existing membership → show custom fields → insert row
- Profile completeness calculated client-side
- Quizzes tab is a shell placeholder — wired in Slice 7

---

## Open Questions / Still Pending

- `teacher-api.js` split into domain files — review after Slice 6 when full weight is known
- RLS policies — tighten all Teacher Assess tables before go-live
- Test data: Albert (`U_MESI42D7Z`) has 25 questions in `teacher_bank_items` covering MCQ, TF, SATA across Medical Nursing, Pharmacology, Infection Control, Midwifery, Mental Health Nursing

---

## Slice 6 — Next: Teacher Quiz Manager

**Page:** `myteacher/teacher/quizzes.html`

**Scope:**
- Quiz list: all teacher's quizzes with status pill (DRAFT / PUBLISHED / ARCHIVED), attempt count, open/close dates
- Create new quiz: settings form — title, subject, preset (EXAM/STUDY/PRACTICE), duration, shuffle questions, shuffle options, max attempts, results release policy, access code, open/close dates, grading policy, pass threshold, score display policy
- Questions tab: shows `draft_items_json` items as ordered list; reorder by drag-and-drop; remove item; **Add from Bank** button → calls `bank.html?mode=picker&teacher_quiz_id=TQ_xxx&return_to=...`
- Class assignment tab: assign quiz to one or more of teacher's classes (checkboxes)
- Publish: checklist validation (questions added, class assigned, settings complete) → sets `status = PUBLISHED`, creates immutable `teacher_quiz_items` snapshots
- Unpublish / Archive actions
- `teacher-api.js` additions: `getTeacherQuizzes`, `getTeacherQuiz`, `createTeacherQuiz`, `updateTeacherQuiz`, `publishTeacherQuiz`, `getDraftItems` (fetches full bank items for the draft_items_json list)

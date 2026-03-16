# QAcademy Nurses Hub

A web platform for nursing students in Ghana preparing for NMC licensure exams.

## Live URL
https://qacademy-gamma.pages.dev

## Stack
- **Frontend:** HTML/CSS/JS hosted on Cloudflare Pages
- **Database & Auth:** Supabase
- **Repo:** GitHub
- **Payments:** Paystack (coming soon)
- **Bot:** Telegram (coming soon)

## Supabase
- **URL:** https://zrakjibtxyzoqcdtvpmq.supabase.co
- **Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYWtqaWJ0eHl6b3FjZHR2cG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDcyODAsImV4cCI6MjA4ODk4MzI4MH0.saSEaK1IkbP03rfVvuwFpXQlLtAdKLIg9V7UwO7a2po
- **Client variable:** always use `db` (not `supabase`) in all files

## Important Rules
1. Always use `db` not `supabase` when calling Supabase in JS files
2. All pages load `/js/config.js` and `/js/guard.js` before their own scripts
3. Protected pages call `guardPage()` on load
4. Logout calls `logout()` from guard.js
5. Shared Supabase read queries live in `js/api.js` — never repeat them in pages
6. Write operations (insert/update) are page-specific and stay in the page
7. Always use `.maybeSingle()` not `.single()` when result might be empty

## File Structure
```
qacademy-gamma/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── reset-password.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── guard.js
│   ├── api.js
│   ├── admin-sidebar.js
│   └── student-sidebar.js
├── images/
│   └── QAcademy_Logo.png
├── student/
│   ├── dashboard.html
│   ├── announcements.html
│   ├── course.html
│   ├── fixed-quizzes.html
│   ├── learning-history.html
│   └── quiz-builder.html
├── admin/
│   ├── dashboard.html
│   ├── users.html
│   ├── subscriptions.html
│   ├── products.html
│   ├── courses.html
│   ├── payments.html
│   ├── announcements.html
│   ├── fixed-quizzes.html
│   ├── question-bank.html
│   └── config.html
└── runner/
    ├── instant.html
    └── timed.html
```

## User Roles
| Role | Access |
|---|---|
| STUDENT | Student dashboard, courses, quizzes |
| TEACHER | Teacher features (intentionally deferred) |
| ADMIN | Full admin panel |

## Role Routing (login redirect)
- STUDENT → /student/dashboard.html
- TEACHER → /teacher/dashboard.html (coming soon)
- ADMIN → /admin/dashboard.html

## Database Tables
| Table | Purpose | Has Data |
|---|---|---|
| programs | Nursing programmes | ✅ 5 rows |
| courses | Subject courses | ✅ 11 rows |
| levels | Academic levels | ✅ 4 rows |
| products | Subscription products | ✅ seeded |
| users | Student/admin accounts | ✅ live |
| subscriptions | Course access grants | ✅ live |
| announcements | Platform announcements | ✅ live |
| user_notice_state | Per-user announcement state | ✅ live |
| config | Platform-wide settings (key/value) | ✅ 3 rows |
| quizzes | Fixed quiz definitions | ✅ 13 sample quizzes |
| attempts | Student quiz attempts | ✅ live |
| items_gp | General Paper question bank | ✅ 10 sample questions |
| items_rn_med | Medicine & Medical Nursing | ✅ 10 sample questions |
| items_rn_surg | Surgery & Surgical Nursing | ✅ 10 sample questions |
| items_rm_ped_obs_hrn | Paediatric, Obstetric & HRN | ✅ 10 sample questions |
| items_rm_mid | Midwifery | ✅ 10 sample questions |
| items_rphn_pphn | Public Health Nursing | ✅ 10 sample questions |
| items_rphn_disease_ctrl | Disease Management | ✅ 10 sample questions |
| items_rmhn_psych_nurs | Psychiatric Nursing | ✅ 10 sample questions |
| items_rmhn_psych_ppharm | Psychopharmacology | ✅ 10 sample questions |
| items_nac_basic_clin | Basic Clinical Nursing | ✅ 10 sample questions |
| items_nac_basic_prev | Basic Preventive Nursing | ✅ 10 sample questions |

## Quiz Engine Architecture

### Items Tables
- One separate table per course: `items_{course_id}` (e.g. `items_gp`)
- Item IDs are globally unique and course-prefixed: `GP_001`, `RN_MED_001`
- `question_type`: MCQ | TF | SATA
- `correct`: single letter for MCQ/TF, comma-separated for SATA (e.g. `"a,c,e"`)
- `maintopic` + `subtopic` replace old single `topic` column
- `batch_id`: tag for bulk import grouping
- `shuffle_options`: per-item boolean, default true. Set false to preserve option order.
- All sample questions tagged `batch_id = SAMPLE_BATCH_001` for easy cleanup

### Quizzes Table
- One shared table for all courses (filtered by `course_id`)
- `item_ids TEXT[]` — ordered array of item IDs assigned to quiz
- `allowed_modes`: BOTH | INSTANT_ONLY | TIMED_ONLY (default BOTH)
- `shuffle BOOLEAN` — shuffle question order at spawn (default false)
- `time_limit_sec` — for timed mode. If null: n × 60 seconds
- `status`: draft | active | archived
- `published`: boolean master switch
- `publish_at` / `unpublish_at`: scheduling for UPCOMING / CLOSED states

### Quiz Availability State Machine
Used by both `student/fixed-quizzes.html` and `admin/fixed-quizzes.html`
via `getQuizAvailability(quiz)` in `api.js`:
1. `status !== 'active'` → HIDDEN
2. `published !== true` → HIDDEN
3. `now < publish_at` → UPCOMING (card visible, buttons disabled)
4. `now > unpublish_at` → CLOSED (card visible, buttons disabled)
5. All clear → ACTIVE (fully playable)

### Attempts Table
- One shared table for all courses
- `mode`: instant | timed
- `source`: fixed | builder | retake
- `status`: in_progress | completed | abandoned
- `answers_json`: array of `{item_id, chosen, correct, is_correct, flagged, time_spent_s}`
  - MCQ/TF: `chosen` and `correct` are single letters
  - SATA: `chosen` and `correct` are arrays e.g. `["a","c","e"]`

### Runners
- Both runners support MCQ (radio), TF (radio 2 options), SATA (checkboxes A–F)
- Option shuffling: client-side, deterministic seed (`attempt_id + item_id`)
- Questions per page: read from `config` table key `runner_questions_per_page`
- Preview mode: `?preview=1` — no attempt recorded, admin only
- Progress bar: animated stripes, stops on submit, green/amber/red by score
- Feedback modes (instant runner + post-submit timed): Inline | Standalone | Hide
  - **Inline**: per-option feedback shown directly under each option
  - **Standalone**: all option feedbacks grouped below the question
  - **Hide**: correct/wrong chips only, no explanations
- Rationale image: thumbnail shown in rationale block, tap to enlarge full-screen
- Send feedback button per question — wired to /student/messages.html (coming soon)
- Grid overlay: floating ☰ button, question grid with answered/flagged/correct states
- Exit overlay: Save & Resume Later | Submit & Exit | Cancel
- Preflight screen: quiz details before starting, "Don't show again" per runner
- Autosave: configurable interval from config table
- Timed runner: countdown timer, amber <20%, red+pulse <10%, auto-submit at zero
- 10-check preflight: auth, URL params, attempt exists, ownership, course access,
  mode match, attempt status, review check, preview check, items loaded

### Config Table
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
Current rows:
- `runner_questions_per_page` = `1`
- `builder_max_questions` = `50`
- `runner_autosave_interval_sec` = `60`

## RLS
Enabled on all tables with `dev_allow_all` policy.
Replace with proper policies before going live.

## Test Accounts
| Role | Email | Notes |
|---|---|---|
| ADMIN | samquatleumas@gmail.com | role=ADMIN in users table |
| STUDENT | Albert Owusu-Ansah | RN / L300 / 2024 cohort / TRIAL |
| STUDENT | Justice Asiamah | RM / L100 / 2023 cohort / TRIAL |

## api.js Functions

### Existing (pre-quiz engine)
- `getPrograms()` — all programmes
- `getProducts()` — active products (student-facing)
- `getAllProducts()` — all products including archived (admin)
- `getCourses()` — active courses (student-facing)
- `getAllCourses()` — all courses including archived (admin)
- `getCourseById(courseId)` — single course
- `getUsers()` — filtered user list
- `getUserById()` — full user + subscription history
- `assignSubscription()` — grants subscription
- `deactivateUser()` / `activateUser()`
- `sendPasswordReset()`
- `updateUserProfile()`
- `getAnnouncements()` — active in-schedule announcements
- `getDismissedAnnouncements(userId)`
- `getStudentCourseAccess(userId)` — stacked course expiry map
- `filterAnnouncementsForStudent()` — client-side scope filter

### Quiz Engine (added this session)
- `getConfig()` — config table as key-value object
- `getQuizzes(courseId, adminMode)` — quizzes for a course
- `getAllQuizzes()` — all quizzes (admin)
- `getQuizById(quizId)` — single quiz
- `getItemsByIds(courseId, itemIds)` — fetch questions in order
- `getItemsByFilters(courseId, filters)` — filtered item search (admin picker)
- `getItemFilterOptions(courseId)` — distinct filter values for dropdowns
- `getQuizAvailability(quiz)` — HIDDEN | UPCOMING | ACTIVE | CLOSED
- `spawnFixedAttempt(userId, quiz, mode)` — create or resume fixed attempt
- `spawnBuilderAttempt(userId, courseId, itemIds, mode)` — builder attempt
- `saveAttemptProgress(attemptId, answersJson)` — autosave
- `finishAttempt(attemptId, answersJson, scoreRaw, scoreTotal, scorePct, timeTakenS)` — submit
- `retakeAttempt(originAttempt, userId)` — new attempt from completed
- `getAttemptForReview(attemptId)` — attempt + items for review mode
- `getStudentAttempts(userId, courseId)` — attempt history

## Build Progress

### Done ✅
- Foundation (Supabase, Cloudflare, GitHub)
- Auth pages (login, register, forgot password, reset password)
- Student dashboard (courses, subscription bar, announcements block, quick links)
- Admin dashboard (stats, recent users, quick links)
- Brand colours (Navy + Teal)
- Landing page (index.html)
- Images folder with logo
- js/api.js — shared data layer (existing + full quiz engine functions)
- admin/users.html — full user management
- admin/subscriptions.html — full CRUD, 7 stat cards, 6 filters
- admin/products.html — full CRUD, course picker, Telegram group keys
- admin/courses.html — combined courses & programmes, two tabs
- Programme-specific trials (auto-assigned on registration via SELF_TRIAL_SIGNUP)
- trial_product_id moved to programs table — fully data-driven
- Stacked subscription logic
- admin/announcements.html — full CRUD, all 8 scopes, live audience summary
- student/announcements.html — 4 tabs, Mark as Read, Dismiss, CTA tracking
- student/dashboard.html — announcements block, course cards, recent attempts
- filterAnnouncementsForStudent() — client-side scope filtering
- Shared sidebar architecture — js/admin-sidebar.js + js/student-sidebar.js
- student/course.html — dynamic course page, access check, 4 sections
- Full announcement feature signed off ✅
- config table — created + 3 rows inserted ✅
- items tables — all 11 courses created + 10 sample questions each ✅
- quizzes table — created with full schema ✅
- attempts table — created with full schema ✅
- api.js quiz engine functions — all added ✅
- admin/fixed-quizzes.html — 4-pane flow, auto quiz ID, item picker, publish toggle ✅
- student/fixed-quizzes.html — fully wired, card state machine, availability states ✅
- runner/instant.html — practice mode runner, full feature set ✅
- runner/timed.html — exam mode runner, countdown timer, auto-submit ✅
- Sample quizzes inserted — 11 active + 2 test quizzes (UPCOMING, CLOSED) ✅

### Known Issues / Runner Polish Needed ⚠️
- Runner issues identified during testing — to be fixed next session
- Admin fixed-quizzes: draft/published state enforcement UI fixes pending
- Admin question-bank.html — stub page needed in sidebar

### Next Up ⏭️
1. Fix runner issues found during testing
2. Add `admin/question-bank.html` stub to sidebar
3. `student/learning-history.html` — wire real attempts
4. `student/quiz-builder.html` — 4-step wizard
5. `admin/config.html` — config table UI
6. Supabase Storage setup for rationale images
7. `admin/question-bank.html` — full CRUD for question management + image upload
8. Bulk CSV import script for real question banks
9. `admin/question-bank.html` — add question bank to admin sidebar

### After Quiz Engine
- Payments: Paystack webhook, admin/payments.html
- Messaging: messages.html, admin messages
- Downloads: downloads.html (offline packs)
- Telegram: bot integration, telegram.html
- My Teacher feature (intentionally deferred)

### Intentionally Skipped (for now)
- Teacher features — separate phase
- Sequential runner mode — future feature

## Automation Notes
The platform is fully data-driven:
- Add a new programme → insert row in `programs` table
- Add a new course → insert row in `courses` table + create `items_{course_id}` table
- Add a new product → insert row in `products` table
- Add a new announcement → fill form on admin/announcements.html
- Add a new fixed quiz → fill form on admin/fixed-quizzes.html
- Change platform settings → update row in `config` table
- Everything reflects on frontend automatically — no code changes needed

## Before Going Live Checklist
- [ ] Replace dev_allow_all RLS policies with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Set up Paystack webhook
- [ ] Set up Supabase Storage bucket for rationale images
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Remove SAMPLE_BATCH_001 questions and replace with real question banks

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

## Database Tables (Portal DB)
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
| config | Platform-wide settings (key/value) | ⏳ next |
| quizzes | Fixed quiz definitions | ⏳ next |
| attempts | Student quiz attempts | ⏳ next |
| items_gp | General Paper question bank | ⏳ next |
| items_rn_med | Medicine & Medical Nursing questions | ⏳ future |
| items_rn_surg | Surgery & Surgical Nursing questions | ⏳ future |
| items_rm_ped_obs_hrn | Paediatric, Obstetric & HRN questions | ⏳ future |
| items_rm_mid | Midwifery questions | ⏳ future |
| items_rphn_pphn | Public Health Nursing questions | ⏳ future |
| items_rphn_disease_ctrl | Disease Management questions | ⏳ future |
| items_rmhn_psych_nurs | Psychiatric Nursing questions | ⏳ future |
| items_rmhn_psych_ppharm | Psychopharmacology questions | ⏳ future |
| items_nac_basic_clin | Basic Clinical Nursing questions | ⏳ future |
| items_nac_basic_prev | Basic Preventive Nursing questions | ⏳ future |

## Quiz Engine Architecture (planned & locked — March 2026)

### Items Tables
- One separate table per course: `items_{course_id}` (e.g. `items_gp`)
- Item IDs are globally unique and course-prefixed (e.g. `GP_001`, `RN_MED_001`)
- Columns: `item_id, question_type, stem, option_a–f, fb_a–f, correct, rationale, rationale_img, subject, maintopic, subtopic, difficulty, marks, batch_id, shuffle_options`
- `question_type`: MCQ | TF | SATA
- `correct`: single letter for MCQ/TF, comma-separated for SATA (e.g. `"a,c,e"`)
- `maintopic` + `subtopic` replace old single `topic` column (colon-format removed)
- `batch_id`: tag for bulk import grouping — used in admin item picker for fast selection
- `shuffle_options`: per-item boolean, default true. Set false to preserve option order.

### Quizzes Table
- One shared table for all courses (filtered by `course_id`)
- `item_ids TEXT[]` — ordered array of item IDs assigned to quiz (NOT on items anymore)
- `allowed_modes`: BOTH | INSTANT_ONLY | TIMED_ONLY (default BOTH)
- `shuffle BOOLEAN` — shuffle question order at spawn (default false)
- `time_limit_sec` — for timed mode. If null: n × 60 seconds

### Quiz Modes
- Student picks mode at launch: **Practice** (instant) or **Exam** (timed)
- Two independent buttons per quiz card on student/fixed-quizzes.html
- Each mode has its own in-progress slot, stats, resume/retake/review state
- Two separate runners: runner/instant.html and runner/timed.html

### Attempts Table
- One shared table for all courses
- `mode`: instant | timed (set at spawn from student choice)
- `source`: fixed | builder | retake
- `status`: in_progress | completed | abandoned
- `answers_json`: array of `{item_id, chosen, correct, is_correct, flagged, time_spent_s}`
  - MCQ/TF: `chosen` and `correct` are single letters
  - SATA: `chosen` and `correct` are arrays e.g. `["a","c","e"]`

### Runners
- Both runners support MCQ (radio), TF (radio 2 options), SATA (checkboxes)
- Option shuffling: client-side, deterministic seed (`attempt_id + item_id`). On for all types unless `shuffle_options = false` on item.
- Questions per page: read from `config` table key `runner_questions_per_page` (default 1)
- Preview mode: `?preview=1` — no attempt recorded, admin use only
- Progress bar: animated stripes, stops on submit, colour changes by score (green/amber/red)
- "Send feedback" button per question — wired to /student/messages.html (coming soon)
- `time_spent_s` per question: null for this build (back-and-forth navigation makes it unreliable)
- `time_taken_s` on attempt: accurately tracked

### Config Table
Simple key-value store for platform settings.
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
Initial rows:
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

## Build Progress

### Done ✅
- Foundation (Supabase, Cloudflare, GitHub)
- Auth pages (login, register, forgot password, reset password)
- Student dashboard (courses, subscription bar, announcements block, quick links)
- Admin dashboard (stats, recent users, quick links)
- Brand colours (Navy + Teal)
- Landing page (index.html)
- Images folder with logo
- js/api.js — shared data layer
- admin/users.html — full user management
- admin/subscriptions.html — full CRUD, 7 stat cards, 6 filters
- admin/products.html — full CRUD, course picker, Telegram group keys
- admin/courses.html — combined courses & programmes, two tabs
- Programme-specific trials (auto-assigned on registration via SELF_TRIAL_SIGNUP)
- trial_product_id moved to programs table — fully data-driven, no hardcoded map
- Stacked subscription logic
- admin/announcements.html — full CRUD, all 8 scopes, live audience summary, engagement tracking
- student/announcements.html — 4 tabs, Mark as Read, Dismiss, CTA tracking
- student/dashboard.html — announcements block, course cards, recent attempts
- filterAnnouncementsForStudent() — client-side scope filtering in api.js
- Shared sidebar architecture — js/admin-sidebar.js + js/student-sidebar.js
- student/course.html — dynamic course page, access check, 4 sections
- student/fixed-quizzes.html — accordion layout, shells (not yet wired)
- student/learning-history.html — table structure, filters, shells (not yet wired)
- Full announcement feature signed off ✅
- Quiz engine fully planned and designed ✅ (March 2026)

### Next Up ⏭️ (Quiz Engine — Build Order)
1. Create `config` table + insert initial rows
2. Create `items_gp` table + import GP CSV (split topic → maintopic/subtopic)
3. Update `quizzes` table schema (add item_ids, allowed_modes, shuffle etc.)
4. Update `api.js` (add quiz engine functions)
5. `admin/fixed-quizzes.html` — full CRUD with item picker
6. `student/fixed-quizzes.html` — wire real quizzes, two-section cards
7. `runner/instant.html` — practice mode runner
8. `runner/timed.html` — exam mode runner
9. `student/learning-history.html` — wire real attempts
10. `student/quiz-builder.html` — 4-step wizard
11. `admin/config.html` — config table UI
12. Import remaining 10 course item tables

### After Quiz Engine
- Payments: Paystack webhook, admin/payments.html
- Messaging: messages.html, admin messages
- Downloads: downloads.html (offline packs)
- Telegram: bot integration, telegram.html
- My Teacher feature (intentionally deferred)

### Intentionally Skipped (for now)
- Teacher features — separate phase after core student experience
- Sequential runner mode — future feature (enables clean per-question timing)

## Automation Notes
The platform is fully data-driven:
- Add a new programme → insert row in `programs` table
- Add a new course → insert row in `courses` table + create `items_{course_id}` table
- Add a new product → insert row in `products` table
- Add a new announcement → fill form on admin/announcements.html
- Add a new fixed quiz → fill form on admin/fixed-quizzes.html
- Change platform settings → update row in `config` table
- Everything reflects on frontend automatically — no code changes needed
- Add a new sidebar link → update js/student-sidebar.js or js/admin-sidebar.js once

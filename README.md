# QAcademy Nurses Hub — README
*Last updated: March 2026*

## What This Is
QAcademy Nurses Hub is a web-based learning management system for nursing students in Ghana preparing for NMC licensure exams. It serves five programmes: RN, RM, RPHN, RMHN, and NACNAP.

## Stack
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS |
| Hosting | Cloudflare Pages (`qacademy-gamma.pages.dev`) |
| Database & Auth | Supabase |
| Version Control | GitHub (`mybackpacc-byte/qacademy-gamma`) |
| Payments | Paystack (planned) |
| Messaging | Telegram (planned) |

No separate backend server. Everything is JAMstack — Supabase handles all data and auth directly from the browser. A single Cloudflare Worker will be added later, isolated, for Paystack webhook handling only.

---

## Key Conventions
- Supabase JS CDN occupies the global `supabase` variable. The project uses `const db = supabase.createClient(...)` in `js/config.js`. All files reference `db`, never `supabase`.
- `.maybeSingle()` is used instead of `.single()` on queries where the result might be empty.
- `js/api.js` is the shared data layer. If more than one page needs a function, it goes in `api.js`. Page-specific logic stays in the page file.
- When adding to `api.js`, provide only the new function block — never a full rewrite.
- Item IDs are globally unique and course-prefixed: `GP_001`, `RN_MED_001`, etc.

---

## Brand Palette
```css
--primary:       #1e3a5f
--primary-dark:  #142d4c
--primary-light: #edf6f5
--accent:        #2d7d72
```

---

## Build Progress

### Done ✅
- Foundation: Supabase project, Cloudflare Pages, GitHub repo
- Auth pages: login, register, forgot-password, reset-password (fully tested end-to-end)
- Student dashboard: course cards, subscription bar, announcements strip, recent attempts, quick links
- Admin dashboard: stats cards, recent users, quick links
- Brand colours, landing page (index.html), logo
- `js/api.js` — full shared data layer (see function list below)
- `admin/users.html` — full user management, side panel, assign subscription
- `admin/subscriptions.html` — full CRUD, 7 stat cards, 6 filters
- `admin/products.html` — full CRUD, course picker, Telegram group keys
- `admin/courses.html` — two tabs: Programmes + Courses
- `admin/announcements.html` — full CRUD, 8 targeting scopes, live audience summary, scheduling
- `admin/fixed-quizzes.html` — 4-pane flow: List → Details → Item Picker → Review/Save
- Programme-specific TRIAL products (auto-assigned on registration via `SELF_TRIAL_SIGNUP`)
- Shared sidebar architecture: `js/admin-sidebar.js` + `js/student-sidebar.js`
- `student/announcements.html` — 4 tabs, Mark as Read, Dismiss, CTA tracking
- `student/course.html` — dynamic course page, access check, 4 sections
- `student/fixed-quizzes.html` — fully wired, card state machine (Not Started / In Progress / Completed / Upcoming / Closed)
- `student/learning-history.html` — full attempt history, filters (course, mode, status, search), Resume / Review / Retake actions, paginated ✅
- `student/quiz-builder.html` — 5-step wizard: course → topic/concept → difficulty+type → count+mode → review+launch ✅ (testing & improvements in progress)
- `runner/instant.html` — practice mode runner, full feature set ✅
- `runner/timed.html` — exam mode runner, countdown timer, auto-submit ✅
- Runner fixes applied ✅
- `config` table: created, 3 rows inserted
- All 11 `items_*` tables: created with 10 sample questions each (tagged `SAMPLE_BATCH_001`)
- `quizzes` table: full schema
- `attempts` table: full schema
- Sample quizzes inserted: 11 active + 2 test quizzes (UPCOMING, CLOSED)

### In Progress / Testing ⚠️
- `student/quiz-builder.html` — built, currently being tested; improvements pending
- `admin/fixed-quizzes.html` — draft/published state enforcement UI fixes pending

### Next Up ⏭️
1. Quiz builder testing & improvements (current)
2. `admin/question-bank.html` — stub in sidebar, then full CRUD + image upload
3. `admin/config.html` — config table UI
4. Supabase Storage setup for rationale images (`rationale-images` bucket)
5. Bulk CSV import script for real question banks (616 GP questions ready)
6. `admin/payments.html` — shell page
7. Paystack webhook (Cloudflare Worker — isolated single file)
8. Messaging: `student/messages.html` + admin messages
9. Telegram integration

### Intentionally Deferred
- My Teacher feature (teacher classes, question banks, teacher-created quizzes)
- Sequential runner mode
- Offline packs / PDF downloads

---

## Page Reference

### Admin Pages
| Page | Status | Notes |
|---|---|---|
| admin/dashboard.html | ✅ Done | Stats, recent users, quick links |
| admin/users.html | ✅ Done | Full CRUD, side panel, assign subscription |
| admin/subscriptions.html | ✅ Done | Full CRUD, 7 stat cards, 6 filters |
| admin/products.html | ✅ Done | Full CRUD, course picker, Telegram keys |
| admin/courses.html | ✅ Done | Two tabs: Programmes + Courses |
| admin/announcements.html | ✅ Done | Full CRUD, 8 scopes, audience summary |
| admin/fixed-quizzes.html | ✅ Done | 4-pane flow: List → Details → Picker → Review |
| admin/question-bank.html | ⏳ Next | Stub needed, then full CRUD + image upload |
| admin/config.html | ⏳ Next | Config table UI |
| admin/payments.html | ⏳ Later | Shell only |

### Student Pages
| Page | Status | Notes |
|---|---|---|
| student/dashboard.html | ✅ Done | Courses, announcements, recent attempts |
| student/announcements.html | ✅ Done | 4 tabs, Mark as Read, Dismiss |
| student/course.html | ✅ Done | Dynamic course page, access check |
| student/fixed-quizzes.html | ✅ Done | Fully wired, card state machine |
| student/learning-history.html | ✅ Done | Wired to real attempts, filters, paginated |
| student/quiz-builder.html | ⚠️ Testing | Built — 5 steps, topic+concept modes; improvements pending |

### Runners
| Runner | Status | Notes |
|---|---|---|
| runner/instant.html | ✅ Done | Practice mode, 3 feedback modes, full feature set |
| runner/timed.html | ✅ Done | Exam mode, countdown timer, auto-submit |

Runner URL patterns:
- `/runner/instant.html?attempt_id=ATT_xxx` — normal play
- `/runner/instant.html?attempt_id=ATT_xxx&review=1` — review completed attempt
- `/runner/instant.html?quiz_id=GP_Q001&preview=1` — admin preview (no DB write)

---

## Quiz Builder — What Was Built
`student/quiz-builder.html` has a 5-step wizard:

| Step | What the student does |
|---|---|
| 1 | Pick a course (enrolled courses only) |
| 2 | Select topics (Browse by maintopic) OR search by concept (subtopic keyword search) |
| 3 | Filter by difficulty + question type |
| 4 | Set question count (N) + mode (Instant / Timed) |
| 5 | Review summary → Build Quiz |

Key behaviours:
- Live pool count updates as filters change (drawn from loaded items in memory)
- N capped at available pool count and `builder_max_questions` from config
- On launch: `spawnBuilderAttempt()` → redirects to correct runner
- Saves recent setup to localStorage for restore on next visit
- `display_label` built from selection for learning history display

---

## Quiz Engine — Key Design Decisions

### Items Architecture
- One table per course: `items_{course_id}` (e.g. `items_gp`)
- Item IDs are globally unique and course-prefixed: `GP_001`, `RN_MED_001`
- `question_type`: MCQ | TF | SATA
- `correct`: single letter for MCQ/TF. Comma-separated for SATA e.g. `"a,c,e"`
- `maintopic` + `subtopic` replace the old single `topic` column
- `batch_id`: tag for bulk import grouping (e.g. `SAMPLE_BATCH_001`, `GP_BATCH_001`)
- `shuffle_options`: false = preserve option order (use for TF questions)
- All sample questions tagged `SAMPLE_BATCH_001` — remove before go-live

### Quiz Modes
- Student picks mode at launch: Practice (instant) or Exam (timed)
- `allowed_modes` on quiz controls which modes are available: BOTH | INSTANT_ONLY | TIMED_ONLY
- Two separate runners: `runner/instant.html` and `runner/timed.html`
- In-progress slots are independent per mode — student can have one in-progress instant AND one in-progress timed for the same quiz

### Quiz Availability State Machine
Used by `student/fixed-quizzes.html` and `admin/fixed-quizzes.html` via `getQuizAvailability(quiz)`:
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

### Runners
- Both runners support MCQ (radio), TF (radio 2 options), SATA (checkboxes A–F)
- Option shuffling: client-side, deterministic seed (`attempt_id + item_id`)
- Questions per page: read from `config` table key `runner_questions_per_page`
- Preview mode: `?preview=1` — no attempt recorded, admin only
- Feedback modes (instant runner + post-submit timed): Inline | Standalone | Hide
- Timed runner: countdown timer, amber <20%, red+pulse <10%, auto-submit at zero
- 10-check preflight: auth, URL params, attempt exists, ownership, course access, mode match, attempt status, review check, preview check, items loaded

### Config Table
Current rows:
- `runner_questions_per_page` = `1`
- `builder_max_questions` = `50`
- `runner_autosave_interval_sec` = `60`

---

## api.js Functions

### Core (pre-quiz engine)
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

### Quiz Engine
- `getConfig()` — config table as key-value object
- `getQuizzes(courseId, adminMode)` — quizzes for a course
- `getAllQuizzes()` — all quizzes (admin)
- `getQuizById(quizId)` — single quiz
- `getItemsByIds(courseId, itemIds)` — fetch questions in order
- `getItemsByFilters(courseId, filters)` — filtered item search
- `getItemFilterOptions(courseId)` — distinct filter values for dropdowns
- `getQuizAvailability(quiz)` — HIDDEN | UPCOMING | ACTIVE | CLOSED
- `spawnFixedAttempt(userId, quiz, mode)` — create or resume fixed attempt
- `spawnBuilderAttempt(userId, courseId, itemIds, mode, meta)` — builder attempt
- `saveAttemptProgress(attemptId, answersJson)` — autosave
- `finishAttempt(attemptId, answersJson, scoreRaw, scoreTotal, scorePct, timeTakenS)` — submit
- `retakeAttempt(originAttempt, userId)` — new attempt from completed
- `getAttemptForReview(attemptId)` — attempt + items for review mode
- `getStudentAttempts(userId, courseId)` — attempt history
- `getAttemptById(attemptId)` — single attempt row (used by runners)

---

## Automation — How the Platform Stays Data-Driven
- Add a new programme → insert row in `programs` table
- Add a new course → insert row in `courses` table + create `items_{course_id}` table
- Add a new product → insert row in `products` table
- Add a new announcement → fill form on `admin/announcements.html`
- Add a new fixed quiz → fill form on `admin/fixed-quizzes.html`
- Change platform settings → update row in `config` table
- Everything reflects on the frontend automatically — no code changes needed

---

## Test Accounts
| Role | Email | Notes |
|---|---|---|
| ADMIN | samquatleumas@gmail.com | role=ADMIN in users table |
| STUDENT | Albert Owusu-Ansah | RN / L300 / 2024 cohort / TRIAL |
| STUDENT | Justice Asiamah | RM / L100 / 2023 cohort / TRIAL |

---

## RLS
All tables have RLS enabled with `dev_allow_all` policies during build phase. Replace with proper role-based policies before going live.

---

## Before Going Live Checklist
- [ ] Replace dev_allow_all RLS policies with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Set up Paystack webhook (Cloudflare Worker)
- [ ] Set up Supabase Storage bucket `rationale-images`
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Remove SAMPLE_BATCH_001 questions and replace with real question banks

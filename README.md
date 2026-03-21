# QAcademy Nurses Hub — README
*Last updated: March 2026*

## What This Is
QAcademy Nurses Hub is a web-based learning management system for nursing students in Ghana preparing for NMC licensure exams. It serves five programmes: RN, RM, RPHN, RMHN, and NACNAP.

## Stack
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS — no build step |
| Hosting | Cloudflare Pages (`qacademy-gamma.pages.dev`) |
| Database & Auth | Supabase (free tier) |
| Version Control | GitHub (`mybackpacc-byte/qacademy-gamma`) |
| Payments | Paystack — Cloudflare Worker deployed (`payments-worker/`) |
| Messaging | Built-in thread-based system (Supabase) |

No separate backend server. Everything is JAMstack. The Cloudflare Worker is isolated to payments only — it does not touch the rest of the frontend build.

---

## Key Conventions
- Supabase JS CDN uses `supabase` as global variable. Project uses `const db = supabase.createClient(...)` in `js/config.js`. All files reference `db`, never `supabase`.
- `.maybeSingle()` instead of `.single()` on queries where result might be empty.
- `js/api.js` is the shared data layer. Shared reads go here. Page-specific logic stays in the page file.
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
- Foundation: Supabase, Cloudflare Pages, GitHub repo
- Auth pages: login, register, forgot-password, reset-password
- Student dashboard: course cards, subscription bar, announcements strip, recent attempts
- Admin dashboard: stats, recent users, quick links
- Brand colours, landing page, logo
- `js/api.js` — full shared data layer including all quiz engine functions
- `admin/users.html` — full CRUD, side panel, assign subscription
- `admin/subscriptions.html` — full CRUD, 7 stat cards, 6 filters, Sync Status button, Grant from panel
- `admin/products.html` — full CRUD, course picker, Telegram keys
- `admin/courses.html` — two tabs: Programmes + Courses
- `admin/announcements.html` — full CRUD, 8 scopes, audience summary, scheduling
- `admin/fixed-quizzes.html` — 4-pane flow: List → Details → Picker → Review
- `admin/question-bank.html` — browse cards, edit panel, image upload to Supabase Storage, CSV import, batch filter
- `admin/config.html` — edit values, add new keys, delete with warning
- Mobile hamburger menu — fixed top-left, slide-in, injected via sidebar JS files
- Programme-specific TRIAL products, auto-assigned on registration
- Shared sidebar: `js/admin-sidebar.js` + `js/student-sidebar.js`
- `student/announcements.html` — 4 tabs, Mark as Read, Dismiss
- `student/course.html` — dynamic course page, access check
- `student/fixed-quizzes.html` — card state machine
- `student/learning-history.html` — full attempt history, filters, Resume / Review / Retake
- `student/quiz-builder.html` — 5-step wizard, topic + concept modes ✅ signed off
- `runner/instant.html` — practice mode, 3 feedback modes, full feature set
- `runner/timed.html` — exam mode, countdown timer, auto-submit
- All 11 `items_*` tables created and seeded
- `quizzes` table + sample quizzes
- `attempts` table
- `config` table with 5 keys
- Supabase Storage: `rationale-images` bucket created, public policy set
- **Payments — Cloudflare Worker** (`payments-worker/`) fully deployed:
  - `POST /payments/init-public` — new student pays before having an account
  - `POST /payments/init-upgrade` — existing logged-in student upgrades
  - `GET /payments/verify` — confirms payment with Paystack, activates subscription
  - `POST /payments/setup-complete` — creates account for new students post-payment
  - Payment statuses: `INIT → PAID → ACTIVATED` + `SETUP_REQUIRED` flow
  - `payments` table in Supabase for full audit trail
- `subscribe.html` — public payment page for new students
- `student/upgrade.html` — upgrade page for existing logged-in students
- `payment-confirmation.html` — post-payment redirect handler, calls verify

### Teacher Assess — MyTeacher ✅ (Slices 1–11)
- **Slice 1–2: Foundation** — Teacher profiles, access request/approval, admin approval page
- **Slice 3: Classes Manager** — Full CRUD, join codes, custom fields, member management, extended class metadata (programme, course, academic year, semester, description, dates, capacity, colour)
- **Slice 4: Student My Classes** — Join by code, class detail, quizzes tab with attempts modal
- **Slice 5: Question Bank** — Full CRUD, MCQ/TF/SATA support, image upload, CSV import, filters
- **Slice 5b: CSV Import** — Standalone import page with validation, duplicate detection, AI help section with ready-made prompt
- **Slice 6: Quiz Manager** — 4-tab editor (Settings, Classes, Questions, Publish), presets, grade bands, quiz custom fields, inline create, bank browser, library picker, publish with snapshots, clone, archive, SATA scoring policy, mutable settings post-publish
- **Slice 7: Quiz Runner** — Intake form, timer, question grid, MCQ/TF/SATA rendering, auto-save, pre-submit modal, completion screen with context-aware messaging, keyboard nav, desktop sidebar grid, progress indicators
- **Slice 8: Student Results & Review** — Results tab (score card, grade, pass/fail gate, metadata, print), Review tab (questions with correct/wrong, feedback, rationale, filters, sidebar question map)
- **Slice 9: Teacher Results Dashboard** — Marksheet tab (sortable, searchable, paginated), Item Analysis tab (per-question stats, distractor analysis), drawers (attempts list, view attempt, view item), CSV export, print
- **Slice 10: Dashboard Wiring** — Teacher dashboard (live stats, recent activity), Student dashboard (live stats, first-visit join overlay)
- **Slice 11: Library Picker** — Standalone full-screen page, course browser with filters, add to quiz draft, wired to quiz manager Library tab, edit-to-copy flow (LIB items save to personal bank with source tracking, original library untouched)
- **Integrity Hardening** — 12 fixes across 3 tiers (see Quiz Lifecycle Rules below)

### Profile Pages ✅
- **Student NMC Profile** (`student/profile.html`) — Personal details (name, phone, avatar), academic details (level, cohort), subscription status. Inline edit with save.
- **Teacher Profile** (`myteacher/teacher/profile.html`) — QAcademy account (name, phone, avatar, plan, status) + Organisation (name, tagline, region, logo). Inline edit with save.
- **Student Teacher Assess Profile** (`myteacher/student/profile.html`) — Account info (read-only) + per-class custom fields with completeness tracking. Editable custom fields with save.

### Class Join Approval ✅
- **Require approval toggle** — Teachers can enable "require approval to join" per class (create/edit modal)
- **Pending queue** — Students with pending status shown in member list with approve/reject buttons
- **Student UX** — Pending class cards (dashed border), appropriate messaging, blocked from class content until approved
- **Org identity on join** — Join flow shows teacher name, org name, and logo when entering a class code
- **Schema**: `teacher_classes.require_approval` (boolean), `teacher_class_members.status` supports `PENDING`/`REJECTED`

### Extended Class Metadata ✅
- **9 new optional fields** on `teacher_classes`: `description`, `programme`, `course`, `academic_year`, `semester`, `max_capacity`, `start_date`, `end_date`, `colour`
- **Teacher modal** — grouped form (academic details, settings, colour picker with 8 presets)
- **Teacher class cards** — colour accent border, programme/course subtitle, academic period chip, capacity counter, "Ended" badge
- **Teacher detail panel** — description, info chips, date display, capacity slots
- **Student class cards** — colour accent, programme/course subtitle, academic period chip
- **Student join flow** — org card shows programme, course, description
- **Max capacity** — enforced on join (counts ACTIVE + PENDING members), returns "class is full" message

### MyLicensure Messaging ✅ (v2)

Thread-based messaging system between admin and students.

**Schema:** `messages_threads` + `messages` tables in Supabase. Thread reuse for general/course contexts, always new for question context. `ref_text` column stores human-readable question reference for question context threads.

**Student side** (`student/messages.html`):
- Split-pane inbox with refined chat bubbles, initials avatars, grouped messages, date dividers
- Deep-link from quiz runners and course page, optimistic send, Supabase Realtime
- Question threads show persistent ref card with formatted question text, options, and student's answer
- Mobile-responsive with thread list / conversation toggle

**Admin side** (`admin/messages.html`):
- Flat feed layout (Intercom-style) with accent left-border on admin messages
- 4 filters: search (name, email, question text), context type, status, unread
- **New Thread modal**: student search with manual user_id fallback, context-aware (general/course), multi-select course picker dynamically loaded from student's entitled courses, creates one thread per selected course
- **Bulk Send modal**: 5 multi-select pill picker scopes (programme, level, cohort, subscription kind, course entitlement), live preview count, confirmation step
- Close/reopen threads with inline banner
- Question threads show ref card with question_id, formatted question text, and admin guidance

**Quiz runner integration** (`runner/instant.html`, `runner/timed.html`):
- "Send feedback" button builds rich `ref_text` via `buildFriendlyRefText()`: course name, question position, topic, full stem, all options as displayed, student's current answer
- Correct answer deliberately excluded to prevent mid-quiz leaks
- `ref_text` stored on thread for persistent display and admin searchability

**API** (`js/api.js`):
- 14 functions: thread CRUD, message send/fetch, unread counts, recipient resolution, bulk send
- `ensureThread()` stores `ref_text` on thread creation
- `resolveRecipients()` supports array-based scope filters (AND across fields, OR within)
- Unread count badge on Messages nav link in both sidebars via `guard.js`

**Entry points:**
| Entry point | Context type | Pre-filled data |
|---|---|---|
| `runner/instant.html` → "Send feedback" | `question` | course_id, quiz_id, attempt_id, item_id, rich ref_text |
| `runner/timed.html` → "Send feedback" | `question` | course_id, quiz_id, attempt_id, item_id, rich ref_text |
| `student/course.html` → "Message us" | `course` | course_id |
| `student/messages.html` → "+ New" | `general` | — |
| `admin/messages.html` → "New Thread" | `general` / `course` | selected student, multi-select courses |
| `admin/messages.html` → "Bulk Send" | `general` / `course` | scoped recipients via 5 pill pickers |

### Future ⏭️
1. Teacher guidance / how-to pages (teachers first, then students)
2. Notifications — quiz published, results released, join request approved
3. MyTeacher messaging (teacher ↔ student within classes)
4. RLS policies — tighten all tables before go-live
5. `teacher_ref` column on `teacher_bank_items` — optional teacher-defined reference code per question. Surface in bank editor, bank list, CSV import/export, and teacher-api (create/update). Lets teachers tag questions with their own IDs for cross-referencing.

### Intentionally Deferred
- Sequential runner mode

---

## Page Reference

### Admin Pages
| Page | Status | Notes |
|---|---|---|
| admin/dashboard.html | ✅ Done | Stats, recent users, quick links |
| admin/users.html | ✅ Done | Full CRUD, side panel, assign subscription |
| admin/subscriptions.html | ✅ Done | Full CRUD, 7 stat cards, 6 filters, Sync Status, Grant from panel |
| admin/products.html | ✅ Done | Full CRUD, course picker, Telegram keys |
| admin/courses.html | ✅ Done | Two tabs: Programmes + Courses |
| admin/announcements.html | ✅ Done | Full CRUD, 8 scopes, audience summary |
| admin/fixed-quizzes.html | ✅ Done | 4-pane: List → Details → Picker → Review |
| admin/question-bank.html | ✅ Done | Browse, edit, create, image upload, CSV import |
| admin/config.html | ✅ Done | Edit values, add keys, delete with warning |
| admin/messages.html | ✅ Done | Thread-based messaging — admin inbox, bulk send, recipient scoping |
| admin/payments.html | ⏳ Later | Worker done, admin page not yet built |

### Student Pages
| Page | Status | Notes |
|---|---|---|
| student/dashboard.html | ✅ Done | Courses, announcements, recent attempts |
| student/announcements.html | ✅ Done | 4 tabs, Mark as Read, Dismiss |
| student/course.html | ✅ Done | Dynamic, access check |
| student/fixed-quizzes.html | ✅ Done | Card state machine |
| student/learning-history.html | ✅ Done | Filters, paginated, Resume/Review/Retake |
| student/quiz-builder.html | ✅ Done | 5 steps, topic + concept modes |
| student/upgrade.html | ✅ Done | Upgrade payment flow for logged-in students |
| student/profile.html | ✅ Done | Personal details, academic details, subscription, avatar upload |
| student/downloads.html | ⏳ Later | Offline packs / PDF downloads |
| student/messages.html | ✅ Done | Thread-based messaging — inbox, reply, context-aware from quiz runners |

### Teacher Assess — Teacher Pages
| Page | Status | Notes |
|---|---|---|
| myteacher/teacher/dashboard.html | ✅ Done | Live stats (classes, quizzes, students, attempts), recent activity feed |
| myteacher/teacher/classes.html | ✅ Done | Full CRUD, join codes, custom fields, members |
| myteacher/teacher/bank.html | ✅ Done | MCQ/TF/SATA, image upload, CSV import, filters |
| myteacher/teacher/quizzes.html | ✅ Done | 4-tab editor, presets, publish with snapshots, clone, archive, release results, SATA scoring policy, mutable settings, library picker |
| myteacher/teacher/import.html | ✅ Done | CSV import with validation, duplicate detection, AI help prompt |
| myteacher/teacher/library.html | ✅ Done | Full-screen library browser, course filters, add to quiz draft |
| myteacher/teacher/results.html | ✅ Done | Marksheet, item analysis, drawers, CSV export, print |
| myteacher/teacher/profile.html | ✅ Done | QAcademy account + Organisation profile, avatar & logo upload, inline edit |

### Teacher Assess — Student Pages
| Page | Status | Notes |
|---|---|---|
| myteacher/student/dashboard.html | ✅ Done | Live stats, first-visit join class overlay |
| myteacher/student/my-classes.html | ✅ Done | Join by code, class detail, quizzes tab with attempts modal |
| myteacher/student/quiz-runner.html | ✅ Done | Full exam engine: intake, timer, grid, MCQ/TF/SATA, auto-save, submit, 12 UX enhancements |
| myteacher/student/my-results.html | ✅ Done | Results tab + Review tab, gated by release policy |
| myteacher/student/profile.html | ✅ Done | Account info, per-class custom fields, completeness tracking |

### Public Pages
| Page | Status | Notes |
|---|---|---|
| subscribe.html | ✅ Done | Public payment page for new students |
| payment-confirmation.html | ✅ Done | Post-payment redirect, calls verify |

### Runners
| Runner | Status | Notes |
|---|---|---|
| runner/instant.html | ✅ Done | Practice mode, 3 feedback modes |
| runner/timed.html | ✅ Done | Exam mode, countdown, auto-submit |

URL patterns:
- `?attempt_id=ATT_xxx` — normal play
- `?attempt_id=ATT_xxx&review=1` — review completed attempt
- `?quiz_id=GP_Q001&preview=1` — admin preview (no DB write)

### Payments Worker Routes
| Route | Method | Purpose |
|---|---|---|
| /payments/init-public | POST | New student (no account) initiates payment |
| /payments/init-upgrade | POST | Logged-in student upgrades subscription |
| /payments/verify | GET | Verify payment with Paystack, activate subscription |
| /payments/setup-complete | POST | Create account for student who paid before registering |

---

## admin/subscriptions.html — Behaviour Notes
- **Sync Status button:** manually flips `ACTIVE → EXPIRED` where `expires_utc < now()`. One direction only. Run on each admin visit to keep status column truthful. Required because Supabase free tier has no pg_cron for scheduled jobs.
- **Grant Subscription in panel:** appears on ALL subscription statuses (not just expired/cancelled). Pre-fills the student automatically via `openGrantForUser(userId, name, email)`.

---

## Question Bank — CSV Import Rules
1. 24 columns in fixed order — always download the template from the page
2. `question_type`: MCQ | TF | SATA (case sensitive)
3. `stem` and `correct` are required — rows missing either are skipped
4. At least `option_a` and `option_b` must be filled
5. `correct`: single letter for MCQ/TF (e.g. `b`), quoted comma-separated for SATA (e.g. `"a,c,e"`)
6. `item_id` can be blank — auto-generated on import
7. Re-importing same `item_id` updates the row, does not duplicate (upsert)
8. `shuffle_options`: `true` for MCQ/SATA, `false` for TF
9. Export from Google Sheets or Excel as CSV — they handle quoting automatically

---

## Config Table
Every key is a system key referenced by platform code. Never rename or delete unless certain nothing depends on it.

| Key | Value | What it controls |
|---|---|---|
| `runner_questions_per_page` | `2` | Questions per page in both runners |
| `runner_autosave_interval_sec` | `60` | Autosave frequency in runners (seconds) |
| `builder_max_questions` | `50` | Max questions student can request in builder |
| `builder_default_questions` | `20` | Default question count in builder |
| `builder_minutes_per_question` | `1` | Time estimate per question in builder |

---

## api.js Functions

### Core
- `getPrograms()`, `getProducts()`, `getAllProducts()`
- `getCourses()`, `getAllCourses()`, `getCourseById()`
- `getUsers()`, `getUserById()`
- `assignSubscription()`, `deactivateUser()`, `activateUser()`
- `sendPasswordReset()`, `updateUserProfile()`, `uploadProfileImage()`
- `getAnnouncements()`, `getDismissedAnnouncements()`
- `getStudentCourseAccess()`, `filterAnnouncementsForStudent()`

### Quiz Engine
- `getConfig()`, `getQuizzes()`, `getAllQuizzes()`, `getQuizById()`
- `getItemsByIds()`, `getItemsByFilters()`, `getItemFilterOptions()`
- `getBuilderCourseItems()`
- `getQuizAvailability()`, `spawnFixedAttempt()`, `spawnBuilderAttempt()`
- `saveAttemptProgress()`, `saveTimedAttemptProgress()`, `markTimedAttemptStarted()`
- `finishAttempt()`, `retakeAttempt()`
- `getAttemptForReview()`, `getStudentAttempts()`, `getAttemptById()`

### Teacher Assess (teacher-api.js)
- **Quiz CRUD:** `createTeacherQuiz()`, `getTeacherQuiz()`, `getTeacherQuizzes()`, `updateTeacherQuiz()`
- **Quiz Lifecycle:** `publishTeacherQuiz()`, `archiveTeacherQuiz()`, `cloneTeacherQuiz()`, `releaseQuizResults()`
- **Quiz Relations:** `setQuizClasses()`, `getQuizClasses()`, `removeFromDraftItems()`
- **Student Quiz:** `startQuizAttempt()`, `saveAttemptProgress()`, `submitQuizAttempt()`
- **Attempts:** `getAttempt()`, `getAttemptResults()`, `getAttemptReview()`, `getQuizzesForClass()`, `getPublishedQuizWithItems()`
- **Teacher Results:** `getTeacherQuizResults()`, `getTeacherItemAnalysis()`, `getAttemptDetail()`
- **Classes:** `createTeacherClass()`, `updateTeacherClass()`, `archiveTeacherClass()`, `getTeacherClasses()`, `joinClassByCode()`
- **Bank:** `createBankItem()`, `updateBankItem()`, `getBankItems()`, `getBankFilterOptions()`, `getDraftPreview()`
- **Library:** `getLibraryCourses()`, `getLibraryItems()`, `resolveLibraryRefs()`, `copyLibItemToBank()`, `getDraftQuizzes()`, `addLibItemsToDraft()`
- **Dashboard:** `getTeacherDashboardStats()`, `getStudentDashboardStats()`
- **Profile:** `getTeacherFullProfile()`, `updateTeacherProfile()`

---

## Quiz Lifecycle Rules

### State Machine
```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
  │                                          ▲
  └────────────archive───────────────────────┘
```
No unpublish. No unarchive. Clone creates a new DRAFT from any state.

### Field Mutability After Publish

| Category | Fields | DRAFT | PUBLISHED | ARCHIVED |
|---|---|---|---|---|
| **Integrity (scoring)** | `sata_scoring_policy`, `duration_minutes`, `shuffle_questions`, `shuffle_options`, `custom_fields_json`, `draft_items_json` | ✏️ Editable | 🔒 Locked | 🔒 Locked |
| **Administrative** | `title`, `subject`, `max_attempts`, `open_at`, `close_at` | ✏️ Editable | ✏️ Editable | 🔒 Locked |
| **Display & Policy** | `results_release_policy`, `show_results`, `show_review`, `score_display_policy`, `pass_threshold_pct`, `grade_bands_json` | ✏️ Editable | ✏️ Editable | ✏️ Editable |
| **Access** | `access_code` | ✏️ Editable | 🔒 Locked | 🔒 Locked |

**Why?** Integrity fields affect scoring — changing them mid-flight would make some students' scores invalid. Administrative fields are schedule/logistics. Display/policy fields only affect how results are shown, not how scores are calculated.

### Snapshots (frozen at submit time)
These values are captured from the live quiz onto each attempt's `score_json` at submission, so retroactive teacher changes don't corrupt historical results:
- `pass_threshold_pct`, `sata_scoring_policy`
- `results_release_policy`, `show_review`, `show_results`, `results_released`, `close_at`
- `grading_policy`, `grade_bands_json`, `score_display_policy` (stored as separate columns on attempt)

### Safety Guards
- **Archive blocked** while students have IN_PROGRESS attempts
- **Concurrency guard** prevents double-click from creating duplicate attempts
- **Date validation** enforced: `close_at > open_at`, `AFTER_CLOSE` requires `close_at`
- **Draft deduplication** at publish time (server-side)
- **Release Results** works on both PUBLISHED and ARCHIVED quizzes (prevents permanent lock)

---

## Automation
- Add programme → insert row in `programs`
- Add course → insert row in `courses` + create `items_{course_id}` table
- Add product → insert row in `products`
- Add announcement → use `admin/announcements.html`
- Add fixed quiz → use `admin/fixed-quizzes.html`
- Add/edit questions → use `admin/question-bank.html`
- Change settings → use `admin/config.html`
- Manage teacher classes → use `myteacher/teacher/classes.html`
- Manage question bank → use `myteacher/teacher/bank.html`
- Bulk import questions → use `myteacher/teacher/import.html` (or "Bulk add CSV" button in bank)
- Browse QAcademy library → use `myteacher/teacher/library.html`
- Create/publish quizzes → use `myteacher/teacher/quizzes.html`
- Release quiz results → Publish tab on quiz editor, or "Release Results" button
- View quiz analytics → use `myteacher/teacher/results.html`

---

## Test Accounts
| Role | Email | Notes |
|---|---|---|
| ADMIN | samquatleumas@gmail.com | role=ADMIN |
| STUDENT | Albert Owusu-Ansah | RN / L300 / 2024 cohort / TRIAL |
| STUDENT | Justice Asiamah | RM / L100 / 2023 cohort / TRIAL |

---

## Role Guards
- Admin pages (`admin/*`) — guarded by `guardPage('ADMIN')`
- Teacher pages (`myteacher/teacher/*`) — guarded by `guardPage('TEACHER')`
- Student pages (`myteacher/student/*`) — guarded by `guardPage('STUDENT')`
- Original student pages (`student/*`) — guarded by sidebar auth check
- Wrong role → redirected to `/router.html`; no session → redirected to `/login`

## RLS
All tables use `dev_allow_all` policies during build. Replace with proper role-based policies before go-live.

---

## Before Going Live Checklist
- [ ] Replace dev_allow_all RLS with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [x] Set up Paystack webhook (Cloudflare Worker) ✅
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Review and clean up question bank content before go-live

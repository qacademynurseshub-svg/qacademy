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

No separate backend server. Everything is JAMstack. A single Cloudflare Worker will be added later, isolated, for Paystack webhook handling only.

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
- `js/api.js` — full shared data layer
- `admin/users.html` — full CRUD, side panel, assign subscription
- `admin/subscriptions.html` — full CRUD, 7 stat cards, 6 filters
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
- `student/quiz-builder.html` — 5-step wizard, topic + concept modes
- `runner/instant.html` — practice mode, 3 feedback modes, full feature set
- `runner/timed.html` — exam mode, countdown timer, auto-submit
- All 11 `items_*` tables with sample questions (`SAMPLE_BATCH_001`)
- `quizzes` table + sample quizzes
- `attempts` table
- `config` table with 5 keys
- Supabase Storage: `rationale-images` bucket created, public policy set

### In Progress ⚠️
- `student/quiz-builder.html` — testing and improvements pending
- `admin/fixed-quizzes.html` — draft/published state enforcement UI fixes pending

### Next Up ⏭️
1. Quiz builder testing and improvements
2. Paystack webhook (Cloudflare Worker)
3. `admin/payments.html`
4. Messaging: `student/messages.html` + admin messages
5. Telegram integration
6. Real question bank import — 616 GP questions ready

### Intentionally Deferred
- My Teacher feature
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
| admin/fixed-quizzes.html | ✅ Done | 4-pane: List → Details → Picker → Review |
| admin/question-bank.html | ✅ Done | Browse, edit, create, image upload, CSV import |
| admin/config.html | ✅ Done | Edit values, add keys, delete with warning |
| admin/payments.html | ⏳ Later | Shell only |

### Student Pages
| Page | Status | Notes |
|---|---|---|
| student/dashboard.html | ✅ Done | Courses, announcements, recent attempts |
| student/announcements.html | ✅ Done | 4 tabs, Mark as Read, Dismiss |
| student/course.html | ✅ Done | Dynamic, access check |
| student/fixed-quizzes.html | ✅ Done | Card state machine |
| student/learning-history.html | ✅ Done | Filters, paginated, Resume/Review/Retake |
| student/quiz-builder.html | ⚠️ Testing | 5 steps, topic + concept modes |

### Runners
| Runner | Status | Notes |
|---|---|---|
| runner/instant.html | ✅ Done | Practice mode, 3 feedback modes |
| runner/timed.html | ✅ Done | Exam mode, countdown, auto-submit |

URL patterns:
- `?attempt_id=ATT_xxx` — normal play
- `?attempt_id=ATT_xxx&review=1` — review completed attempt
- `?quiz_id=GP_Q001&preview=1` — admin preview (no DB write)

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

## Mobile Navigation
Hamburger (☰) injected by both sidebar JS files:
- Fixed top-left on mobile (≤768px), hidden on desktop
- Slides sidebar in from left, dark overlay behind it
- Tap overlay or nav link to close
- Button swaps ☰ ↔ ✕

---

## api.js Functions

### Core
- `getPrograms()`, `getProducts()`, `getAllProducts()`
- `getCourses()`, `getAllCourses()`, `getCourseById()`
- `getUsers()`, `getUserById()`
- `assignSubscription()`, `deactivateUser()`, `activateUser()`
- `sendPasswordReset()`, `updateUserProfile()`
- `getAnnouncements()`, `getDismissedAnnouncements()`
- `getStudentCourseAccess()`, `filterAnnouncementsForStudent()`

### Quiz Engine
- `getConfig()`, `getQuizzes()`, `getAllQuizzes()`, `getQuizById()`
- `getItemsByIds()`, `getItemsByFilters()`, `getItemFilterOptions()`
- `getBuilderCourseItems()` — lightweight items for client-side builder filtering
- `getQuizAvailability()`, `spawnFixedAttempt()`, `spawnBuilderAttempt()`
- `saveAttemptProgress()`, `finishAttempt()`, `retakeAttempt()`
- `getAttemptForReview()`, `getStudentAttempts()`, `getAttemptById()`

---

## Automation
- Add programme → insert row in `programs`
- Add course → insert row in `courses` + create `items_{course_id}` table
- Add product → insert row in `products`
- Add announcement → use `admin/announcements.html`
- Add fixed quiz → use `admin/fixed-quizzes.html`
- Add/edit questions → use `admin/question-bank.html`
- Change settings → use `admin/config.html`

---

## Test Accounts
| Role | Email | Notes |
|---|---|---|
| ADMIN | samquatleumas@gmail.com | role=ADMIN |
| STUDENT | Albert Owusu-Ansah | RN / L300 / 2024 cohort / TRIAL |
| STUDENT | Justice Asiamah | RM / L100 / 2023 cohort / TRIAL |

---

## RLS
All tables use `dev_allow_all` policies during build. Replace with proper role-based policies before go-live.

---

## Before Going Live Checklist
- [ ] Replace dev_allow_all RLS with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Set up Paystack webhook (Cloudflare Worker)
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Remove SAMPLE_BATCH_001 questions and replace with real question banks

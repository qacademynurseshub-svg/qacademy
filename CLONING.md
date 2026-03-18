# QAcademy Nurses Hub — README
*Last updated: March 2026*

## What This Is
QAcademy Nurses Hub is a web-based learning management system for nursing students in Ghana preparing for NMC licensure exams. It serves five programmes: RN, RM, RPHN, RMHN, and NACNAP.

## Stack
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS — no build step |
| Hosting | Cloudflare Pages (`qacademy-gamma.pages.dev`) |
| Database & Auth | Supabase |
| Version Control | GitHub (`mybackpacc-byte/qacademy-gamma`) |
| Payments | Paystack (planned — Cloudflare Worker, isolated) |
| Messaging | Telegram (planned) |

No separate backend server. Everything is JAMstack. A single Cloudflare Worker will be added later, isolated, for Paystack webhook handling only.

---

## Key Conventions
- Supabase JS CDN uses `supabase` as global variable. Project uses `const db = supabase.createClient(...)` in `js/config.js`. All files reference `db`, never `supabase`.
- `.maybeSingle()` instead of `.single()` on queries where result might be empty.
- `js/api.js` is the shared data layer. Shared reads go here. Page-specific logic stays in the page file.
- When adding to `api.js`, provide only the new function block — never a full rewrite.
- Item IDs are globally unique and course-prefixed: `GP_001`, `RN_MED_001`, etc.
- `announcement_id` generated as `ANN_` + `Date.now()` (TEXT PRIMARY KEY, manually supplied).
- Font stack: Plus Jakarta Sans (homepage), Inter (all dashboard/app pages).

---

## Build Status by Phase

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation | ✅ Complete |
| 2 | Student Dashboard | ✅ Complete |
| 3 | Quiz Engine | ✅ Complete |
| 4 | Quiz Builder | ⚠️ Testing |
| 5 | Offline Packs | ⏳ Deferred |
| 6 | Messaging | ⏳ Later |
| 7 | Teacher Assess | ⏳ Deferred |
| 8 | Payments | ⏳ Later |
| 9 | Telegram | ⏳ Later |
| 10 | Admin Tools | ✅ Mostly complete (payments shell only) |

---

## Page Reference

### Public Pages
| Page | Status | Notes |
|---|---|---|
| index.html | ✅ Done | Marketing homepage — dynamic programmes from Supabase, path block, NMC exam structure, socials strip, ambient background |
| login.html | ✅ Done | Email/password login, back-to-home link |
| register.html | ✅ Done | Auto-assigns trial product based on programme |
| forgot-password.html | ✅ Done | Supabase reset email |
| reset-password.html | ✅ Done | Password recovery flow |
| subscribe.html | ✅ Done | Payment/subscription page (pre-login) |

### Admin Pages
| Page | Status | Notes |
|---|---|---|
| admin/dashboard.html | ✅ Done | Stats, recent users, quick links |
| admin/users.html | ✅ Done | Full CRUD, side panel, assign subscription |
| admin/subscriptions.html | ✅ Done | Full CRUD, 7 stat cards, 6 filters |
| admin/products.html | ✅ Done | Full CRUD, course picker, Telegram keys |
| admin/courses.html | ✅ Done | Two tabs: Programmes + Courses |
| admin/announcements.html | ✅ Done | Full CRUD, 8 scopes, audience summary, scheduling |
| admin/fixed-quizzes.html | ✅ Done | 4-pane: List → Details → Picker → Review |
| admin/question-bank.html | ✅ Done | Browse, edit, create, image upload, CSV import |
| admin/config.html | ✅ Done | Edit values, add keys, delete with warning |
| admin/payments.html | ⏳ Later | Shell only |

### Student Pages
| Page | Status | Notes |
|---|---|---|
| student/dashboard.html | ✅ Done | Courses, announcements strip, recent attempts, subscription bar |
| student/announcements.html | ✅ Done | 4 tabs, Mark as Read, Dismiss |
| student/course.html | ✅ Done | Dynamic, access check |
| student/fixed-quizzes.html | ✅ Done | Card state machine |
| student/learning-history.html | ✅ Done | Filters, paginated, Resume/Review/Retake |
| student/quiz-builder.html | ⚠️ Testing | 5 steps, topic + concept modes |
| student/upgrade.html | ✅ Done | Upgrade/extend access for logged-in users |
| student/messages.html | ⏳ Later | Shell only |
| student/downloads.html | ⏳ Later | Shell only |
| student/telegram.html | ⏳ Later | Shell only |

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

## Navigation

### Student Sidebar (`js/student-sidebar.js`)
- Dashboard
- My Courses (collapsible — populated dynamically)
- Fixed Quizzes
- Quiz Builder
- Learning History
- Announcements
- Downloads
- Messages
- Telegram
- **My Account** (collapsible — bottom of nav)
  - Upgrade / Extend (`student/upgrade.html`)
  - *(Profile and other items to be added)*

### Home Page (`index.html`)
Top nav: Subscribe link (text), Sign In (outline button), Register Free (solid button).

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

## Config Table Keys
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
- `getBuilderCourseItems()`
- `getQuizAvailability()`, `spawnFixedAttempt()`, `spawnBuilderAttempt()`
- `saveAttemptProgress()`, `finishAttempt()`, `retakeAttempt()`
- `getAttemptForReview()`, `getStudentAttempts()`, `getAttemptById()`

---

## Automation Principle
The platform is built to automate. Adding new content never requires code changes:
- Add programme → insert row in `programs` → appears on homepage and register page automatically
- Add course → insert row in `courses` → appears in student dashboard and sidebar
- Add product → insert row in `products` → appears in subscribe and upgrade pages
- Add announcement → use `admin/announcements.html`
- Add fixed quiz → use `admin/fixed-quizzes.html`
- Add/edit questions → use `admin/question-bank.html`
- Change platform settings → use `admin/config.html`

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

## What's Next
1. Finalise and sign off quiz builder (`student/quiz-builder.html`)
2. Paystack webhook — Cloudflare Worker (isolated single file)
3. `admin/payments.html` — full payment records page
4. Messaging: `student/messages.html` + admin messages view
5. Telegram bot integration
6. Real question bank import — 616 GP questions ready in CSV
7. RLS policy tightening before go-live

### Intentionally Deferred
- My Teacher feature (teacher classes, question banks, teacher-created quizzes)
- Sequential runner mode
- Offline packs / PDF downloads
- Student profile page (`student/profile.html`) — placeholder in My Account sidebar menu

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
│   └── learning-history.html
└── admin/
    ├── dashboard.html
    ├── users.html
    ├── subscriptions.html
    ├── products.html
    ├── courses.html
    ├── payments.html
    ├── announcements.html
    ├── fixed-quizzes.html
    └── config.html
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
| products | Subscription products | ✅ 27 rows |
| users | All platform users | ✅ |
| subscriptions | User subscriptions | ✅ |
| announcements | Platform announcements | ✅ |
| user_notice_state | Announcement interaction state | ✅ |

## Announcement States (user_notice_state)
| State | Trigger | Meaning |
|---|---|---|
| `read` | Student clicks "Mark as Read" | Consciously acknowledged |
| `clicked` | Student clicks a link/button inside body | Took action |
| `dismissed` | Student clicks × | Closed, never shows again |

## api.js — Shared Functions
| Function | Returns | Used by |
|---|---|---|
| `getPrograms()` | All programmes | Register, admin filters, quiz builder |
| `getProducts()` | Active products only | Grant modal, payments, student pages |
| `getAllProducts()` | All products including archived | admin/products.html, admin/announcements.html |
| `getCourses()` | Active courses only | Student dashboard, quiz builder, admin/announcements.html |
| `getAllCourses()` | All courses including archived | admin/courses.html |
| `getUsers()` | Filtered user list | admin/users.html |
| `getUserById()` | Full user + subscription history | Admin user panel |
| `assignSubscription()` | Grants a subscription | admin/subscriptions.html, admin/users.html |
| `deactivateUser()` | Deactivates account | admin/users.html |
| `activateUser()` | Reactivates account | admin/users.html |
| `sendPasswordReset()` | Sends reset email | admin/users.html |
| `updateUserProfile()` | Updates user fields | admin/users.html |
| `getAnnouncements()` | Active in-schedule announcements | Student dashboard, student/announcements.html |
| `getDismissedAnnouncements()` | Dismissed announcement IDs | Student dashboard (legacy, still used) |
| `getStudentCourseAccess()` | Stacked course access map | Student dashboard, course pages |

## Key Design Decisions
- **Trial is a product Kind** (PAID / TRIAL / FREE), not a subscription status
- **Subscription status** is only: ACTIVE / EXPIRED / CANCELLED
- **Stacked subscriptions** — remaining days are summed across all active subscriptions per course
- **Programme scope on courses** is an array — a course can belong to multiple programmes or none
- **Product ID and Course ID** cannot be changed after creation
- **Archive not delete** — products and courses are archived, never hard deleted
- **Announcement ID** is TEXT PRIMARY KEY — must be supplied on insert as `ANN_` + timestamp
- **Announcement scopes work as AND** — student must match ALL conditions set
- **Dashboard strip shows max 2 unread** — pinned first, then by priority. "View all" link shows full count
- **Cohort targeting** uses a lean single-column query on users table — not getUsers()

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
- admin/announcements.html — full CRUD, all 8 scopes, live audience summary, engagement tracking, duplicate protection, character count, draft warning
- student/announcements.html — 4 tabs (All/Unread/Read/Dismissed), Mark as Read, Dismiss, CTA button/link tracking
- student/dashboard.html — always-visible announcements block, collapsed cards (pinned auto-expands), full HTML render, two empty states, ✕ marks as Read
- filterAnnouncementsForStudent() — client-side scope filtering in api.js
- newlinesToParagraphs() — body text formatting fix
- data-qa="btn" — consistent button styling across all pages
- Full announcement feature tested and signed off ✅
- Shared sidebar architecture — js/admin-sidebar.js + js/student-sidebar.js
- All 9 admin pages updated to shared sidebar
- All student pages updated to shared sidebar
- Dynamic My Courses dropdown in student sidebar — auto-populates enrolled courses only
- Active link detection fixed for Cloudflare Pages URL format (no .html)
- getCourses() added to api.js
- getCourseById() added to api.js
- student/course.html — dynamic course page, reads ?id= from URL, access check, 4 sections (course header, fixed quizzes shell, quiz builder shell, course announcements scoped to course)
- student/fixed-quizzes.html — accordion layout per enrolled course, ?course= filter wired, shell placeholders
- student/learning-history.html — full table structure, course + status filters, ?course= filter wired, graceful empty state for missing attempts table
- Sidebar links pass ?course=COURSE_ID to quiz pages for future filtering
- Dashboard course cards updated to /student/course.html?id=COURSE_ID

### Next Up ⏭️
- Quiz engine:
  - admin/fixed-quizzes.html — full CRUD for managing fixed quizzes
  - student/fixed-quizzes.html — wire up real quizzes into accordion shells
  - runner/instant.html — instant quiz runner
  - runner/timed.html — timed quiz runner
  - student/learning-history.html — wire up real attempts from attempts table
- Quiz builder: student/quiz-builder.html

### After That
- Payments: Paystack webhook, admin/payments.html
- Messaging: messages.html, admin messages
- Downloads: downloads.html (offline packs)
- Telegram: bot integration, telegram.html
- My Teacher feature (intentionally deferred)

### Intentionally Skipped (for now)
- Teacher features — separate phase after core student experience

## Automation Notes
The platform is fully data-driven:
- Add a new programme → insert row in `programs` table
- Add a new course → insert row in `courses` table
- Add a new product → insert row in `products` table
- Add a new announcement → fill form on admin/announcements.html
- Everything reflects on frontend automatically — no code changes needed
- Add a new sidebar link → update js/student-sidebar.js or js/admin-sidebar.js once — reflects on all pages automatically

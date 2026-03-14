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
│   └── api.js
├── images/
│   └── QAcademy_Logo.png
├── student/
│   ├── dashboard.html
│   └── announcements.html
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
| STUDENT | (your test email) | Has RN_FULL subscription |
| ADMIN | samquatleumas@gmail.com | role=ADMIN in users table |

## Build Progress

### Done ✅
- Foundation (Supabase, Cloudflare, GitHub)
- Auth pages (login, register, forgot password, reset password)
- Student dashboard (courses, subscription bar, announcements strip, quick links)
- Admin dashboard (stats, recent users, quick links)
- Brand colours (Navy + Teal)
- Landing page (index.html)
- Images folder with logo
- js/api.js — shared data layer
- admin/users.html — full user management
- admin/subscriptions.html — full CRUD, 7 stat cards, 6 filters
- admin/products.html — full CRUD, course picker, Telegram group keys
- admin/courses.html — combined courses & programmes, two tabs
- Programme-specific trials (auto-assigned on registration)
- Stacked subscription logic
- 20 test users seeded
- admin/announcements.html — full CRUD, all 8 scopes, live audience summary, engagement tracking
- student/announcements.html — full student view, read/clicked/dismissed states, tabs, "View all" link
- student/dashboard.html — announcements strip updated (max 2 unread, upsert dismiss, "View all" footer)

### Pending — Scope Testing ⏭️
- Create two test students (Test Alice: RN/L300/2024/PAID, Test Ben: RM/L100/2023/TRIAL)
- Create varied announcements covering all scope combinations
- Verify correct announcements show/hide for each student

### After That
- Quiz engine: admin/fixed-quizzes.html, fixed-quizzes.html, runner/instant.html, runner/timed.html, history.html
- Quiz builder: quiz-builder.html
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

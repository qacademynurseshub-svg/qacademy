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
│   └── guard.js
├── student/
│   └── dashboard.html
└── admin/
    └── dashboard.html
```

## User Roles
| Role | Access |
|---|---|
| STUDENT | Student dashboard, courses, quizzes |
| TEACHER | Teacher features (My Teacher - coming soon) |
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
| user_notice_state | Announcement dismiss state | ✅ |

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
- Student dashboard (courses, subscription bar, announcements, quick links)
- Admin dashboard (stats, recent users, quick links)

### Next Session
- Admin pages: Users, Products, Subscriptions, Courses, Programs
- Then: Quiz engine for students

### Intentionally Skipped (for now)
- My Teacher feature (teacher classes, question banks, teacher quizzes)
- Will be built later as a separate feature

## Automation Notes
The platform is built to be data-driven:
- Add a new programme → insert row in `programs` table
- Add a new course → insert row in `courses` table
- Add a new product → insert row in `products` table
- Assign courses to a product → update `courses_included` array
- Everything reflects on frontend automatically

# Build List

**Status: 30-day sprint to free trial launch (May 2026)**

Last updated: April 2026

---

## 30-Day Launch Sprint (free trial ready)

### Week 1–2: Emails & Error Handling
- [ ] Set up custom SMTP for emails
- [ ] Welcome email on registration
- [ ] Password reset confirmation email
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Fix 14 silent catch blocks in myteacher-api.js
- [ ] Standardise error response shapes across both API files
- [ ] User-facing error states on critical flows (login, quiz submission, join class, payment)

### Week 2–3: Empty States & Polish
- [ ] Empty state guidance on every page ("No quizzes yet — create your first one")
- [ ] Consolidate escapeHtml() and safeText() in utils.js
- [ ] Stats bar on learning-history reflects loaded page only — needs separate count query for true totals

### Week 3–4: Cleanup & Launch Prep
- [ ] Set up dev/prod split — second Supabase project (prod), prod branch on Cloudflare, separate config per environment. Run all migrations on prod DB.
- [ ] Revisit session expiry length (currently 7 days)
- [ ] users.last_login_utc — wire up or drop
- [ ] users.username — wire up or drop
- [ ] Remove test accounts (MANUAL_TEST rows)
- [ ] Review and clean up question bank content
- [ ] README and CLONING files need updating to reflect current folder structure and My Teacher naming
- [ ] Set up custom domain on Cloudflare

---

## After Trial: Server-Side & Business Logic

These are important but shouldn't block the free trial. Real user feedback will help prioritise.

### Move Business Logic Server-Side
- [ ] Look into new stack that offers proper backend — almost all business logic lives in the browser
- [ ] DB transactions for multi-step ops (quiz publish, subscription assign)
- [ ] Create Supabase RPCs or worker endpoints for admin bulk ops, subscription assignment, quiz publish, result release
- [ ] Correlation IDs on key flows (payment, join, publish, submission)
- [ ] Explore moving config from the front end

### Product Separation
- [ ] Gradually stop sharing things between myteacher & mynmclicensure so they can become separate products

### Admin Tools
- [ ] Admin create user
- [ ] Admin token audit / sessions audit / auth events audit
- [ ] Admin reset request audit (data already in reset_requests table)
- [ ] Admin Expiry reminder / auto expiry reminder
- [ ] Admin diagnostics — failed payments view, failed ops log
- [ ] Admin Users page Stage 2 — Quiz History and Payment History panels in user side panel

### Features & Enhancements
- [ ] Telegram for premium members
- [ ] Skeleton loaders replacing "Loading..." text
- [ ] Export/print — CSV for teachers, PDF results for students
- [ ] Search — courses, questions, messages
- [ ] Notifications — quiz published, results released, join approved
- [ ] Student analytics — strength/weakness, progress trends
- [ ] Teacher guidance / how-to pages
- [ ] Accessibility basics — semantic HTML, aria labels, keyboard nav on key flows
- [ ] teacher_ref column on teacher_bank_items
- [ ] Sequential runner mode
- [ ] My Teacher payment model — define tiers when platform has real users

### Testing
- [ ] Playwright smoke tests for 8 critical paths
- [ ] Audit/event logging for important actions (payment, publish, archive, grant subscription)
- [ ] Retry mechanisms on failed data loads

### Future
- [ ] Beta v2 rebuild in React + Next.js — planned, not started
- [ ] Rotate Supabase anon key if ever committed publicly

    ### Sam's new ideas
- [ ] Introduce a teacher public question bank for sharing of resources
- [ ] Introcues tagging system into questions bank
- [ ] Introduces myteacher kinda exams listing timeline


---

## Completed Work

### Sprint 1: Security Hardening (April 2026)
RLS on all 36 tables, XSS fixes (4 locations + safeText/escapeHtml helpers), CORS fix on payments worker, payment timestamp validation, crypto.getRandomValues() for IDs, rate limiting on payment endpoints, sensitive writes moved behind trusted boundaries.

### Sprint 2: Service Boundaries (April 2026)
Pagination on all admin and student list pages (users, payments, fixed-quizzes, bank, learning-history). DB-side search replacing client-side filtering (users, bank, messages, recipient resolution). Narrow select replacing select('*') on all list queries (users, payments, subscriptions, quizzes, bank, attempts, classes, messages). Fixed payments.created_at schema mismatch.

### Sprint 3: Auth Hardening (April 2026)
- Auth events table for login attempt tracking
- Rate limit on login (5 fails / 10 min → lockout, 10 fails / 24 hr → long lockout)
- Rate limit on password reset (3 per email per 60 min) — dedicated reset_requests table with full audit trail (user_exists, status, device info, used tracking). Admin UI deferred.
- Login methods: username + password, Google OAuth, magic link (passwordless email)
- Reset password error handling for invalid/expired/replaced links

### Slices 12–14: Academic Structure (April 2026)
- 3 new tables: teacher_programmes, teacher_cohorts, teacher_courses (all with RLS)
- CRUD APIs for all three + self-contained panel components (programmes-panel.js, cohorts-panel.js, courses-panel.js)
- Academic Structure page (academic-structure.html) with all three panels, added to teacher nav as "Academics"
- Classes wired to cohorts: cohort dropdown replaces programme/course text fields, class list grouped by cohort, auto-suggested titles
- Quizzes wired to courses: course dropdown replaces subject free-text, backward compat for old quizzes with subject hint
- Key decision: courses link through quizzes only (not classes). A class = cohort + semester (student group). A quiz = course (subject identity)
- Schema: cohort_id on teacher_classes, course_id on teacher_quizzes. Both nullable for backward compat. 39 tables total

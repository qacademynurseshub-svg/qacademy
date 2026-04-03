# Build List

**Status: Active development. Working from Must Do list.**

Last updated: April 2026

---
## Sam's Next plan

- [ ] Create auth_events table for login attempt tracking
- [ ] Rate limit on login (5 fails / 10 min → lockout, 10 fails / 24 hr → long lockout)
- [ ] Rate limit on password reset (3 requests per identifier in 60 min)
- [ ] Revisit session expiry length (currently 7 days)
- [ ] Add login methods: username + password, Google OAuth, magic link (passwordless email)
      
## Must Do(suggetsd by agents review)

### Security & Data Integrity
- [ ] DB transactions for multi-step ops (quiz publish, subscription assign) — revisit before go-live
- [ ] Correlation IDs on key flows (payment, join, publish, submission) — revisit before go-live
- [ ] Create Supabase RPCs or worker endpoints for admin bulk ops, subscription assignment, quiz publish, result release — revisit before go-live

### Code Quality
- [ ] Fix 14 silent catch blocks in myteacher-api.js
- [ ] Standardise error response shapes across both API files
- [ ] Consolidate escapeHtml() and safeText() in utils.js
- [ ] Stats bar on learning-history reflects loaded page only — needs separate count query for true totals
- [ ] users.last_login_utc — exists in DB but nothing writes to it. Wire up or drop.
- [ ] users.username — exists in DB but no code references it. Drop if not planned.

### Testing & Observability
- [ ] Playwright smoke tests for 8 critical paths: login/register, router redirect, join class, fixed quiz flow, timed runner flow, payment verify/setup, result gating, offline packs
- [ ] User-facing error states on all critical flows (not just console.error)
- [ ] Audit/event logging for important actions (payment, publish, archive, grant subscription)
- [ ] Admin diagnostics — failed payments view, failed ops log
- [ ] Retry mechanisms on failed data loads

### Product Polish (do after must-do)
- [ ] Empty state guidance on every page ("No quizzes yet — create your first one")
- [ ] Skeleton loaders replacing "Loading..." text
- [ ] Export/print — CSV for teachers, PDF results for students
- [ ] Search — courses, questions, messages
- [ ] Notifications — quiz published, results released, join approved
- [ ] Student analytics — strength/weakness, progress trends
- [ ] Teacher guidance / how-to pages
- [ ] Accessibility basics — semantic HTML, aria labels, keyboard nav on key flows
- [ ] teacher_ref column on teacher_bank_items
- [ ] Sequential runner mode

### Things to Consider
- [ ] README and CLONING files need updating to reflect current folder structure and My Teacher naming
- [ ] Remove test accounts (MANUAL_TEST rows) before go-live
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Review and clean up question bank content before go-live
- [ ] My Teacher payment model — define tiers when platform has real users
- [ ] Beta v2 rebuild in React + Next.js — planned, not started
- [ ] Admin Users page Stage 2 — Quiz History and Payment History panels in user side panel

---

## Completed Work

### Sprint 1: Security Hardening (April 2026)
RLS on all 36 tables, XSS fixes (4 locations + safeText/escapeHtml helpers), CORS fix on payments worker, payment timestamp validation, crypto.getRandomValues() for IDs, rate limiting on payment endpoints, sensitive writes moved behind trusted boundaries.

### Sprint 2: Service Boundaries (April 2026)
Pagination on all admin and student list pages (users, payments, fixed-quizzes, bank, learning-history). DB-side search replacing client-side filtering (users, bank, messages, recipient resolution). Narrow select replacing select('*') on all list queries (users, payments, subscriptions, quizzes, bank, attempts, classes, messages). Fixed payments.created_at schema mismatch.

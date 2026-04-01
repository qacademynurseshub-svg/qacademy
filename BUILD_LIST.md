# Build List

**Status: Hardening phase** — no new features until sprints 1-4 are done.

Last updated: April 2026

---

## Sprint 1: Security Hardening

**✅ Complete — April 2026**

The single biggest risk. With dev_allow_all RLS, any logged-in user can read/write every table from the browser console.

- [x] Replace dev_allow_all with proper RLS on every table (ownership rules per role)
- [x] Fix 4 XSS vulnerabilities (innerHTML with user data in myteacher-teacher-nav.js:362, myteacher-student-nav.js:229, mynmclicensure-student-sidebar.js:275, router.html:265)
- [x] Fix CORS wildcard fallback in payments worker (payments-worker/src/index.js:82)
- [x] Add payment timestamp validation (expire old setup tokens)
- [x] Replace Math.random() ID generation with crypto.getRandomValues() (register.html:107)
- [x] Add rate limiting on payment endpoints
- [x] Move sensitive writes behind trusted boundaries (worker/RPCs) where browser shouldn't mutate directly

## Sprint 2: Service Boundaries

Too much logic runs in the browser with no server-side validation.

- [ ] Create Supabase RPCs or worker endpoints for: admin bulk ops, subscription assignment, quiz publish, result release
- [ ] Move search/filter to database (replace client-side text search in getUsers(), recipient resolution)
- [ ] Add pagination to all list queries (users, quizzes, attempts, bank items)
- [ ] Narrow select('*') to only needed columns per context
- [ ] Standardize error response shapes across both API files
- [ ] Add database transactions for multi-step operations (publish quiz, set classes)
- [ ] Add correlation IDs to payment, join, publish, and submission flows

## Sprint 3: Code Refactor

Giant files make every change risky. Refactor in place, don't rewrite.

- [ ] Split API files by domain: auth, subscriptions, announcements, attempts, messaging, offline-packs
- [ ] Extract inline script blocks from HTML pages into separate JS files
- [ ] Move repeated inline CSS into shared stylesheets
- [ ] Create shared UI helpers: loading states, empty states, error states, toasts, modals
- [ ] Fix 14 silent catch blocks in myteacher-api.js — add proper error logging
- [ ] Unify design tokens between MyTeacher and Licensure (or document the intentional split)

## Sprint 4: Testing & Observability

At this size, every patch is risky without tests.

- [ ] Playwright smoke tests for 8 critical paths: login/register, router redirect, join class, fixed quiz flow, timed runner flow, payment verify/setup, result gating, offline packs
- [ ] User-facing error states on all critical flows (not just console.error)
- [ ] Audit/event logging for important actions (payment, publish, archive, grant subscription)
- [ ] Admin diagnostics — failed payments view, failed operations log
- [ ] Retry mechanisms on failed data loads

## Sprint 5: Product Polish

Only after the foundation is solid.

- [ ] Empty state guidance on every page ("No quizzes yet — create your first one")
- [ ] Skeleton loaders replacing "Loading..." text
- [ ] Export/print — CSV for teachers, PDF results for students
- [ ] Search — courses, questions, messages
- [ ] Notifications — quiz published, results released, join approved
- [ ] Student analytics — strength/weakness, progress trends
- [ ] Teacher guidance / how-to pages
- [ ] Accessibility basics — semantic HTML, aria labels, keyboard nav on key flows
- [ ] teacher_ref column on teacher_bank_items

## Schema Cleanup (slot into Sprint 1 or 2)

- [ ] payments.created_at — admin payments page tries to display it but column doesn't exist in DB
- [ ] users.last_login_utc — exists in DB but nothing writes to it. Wire up or drop.
- [ ] users.username — exists in DB but no code references it. Drop if not planned.

## Intentionally Deferred

- Sequential runner mode

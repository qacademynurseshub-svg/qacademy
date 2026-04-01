# Sprint 1: Security Hardening

**Status:** In progress
**Rule:** Security only — no unrelated refactors or features.

---

## 1. Lock the Scope

- [ ] Freeze major feature work until Sprint 1 is complete
- [ ] Keep a running log of every file touched (bottom of this file)

## 2. RLS Replacement

### 2a. Access matrix

- [x] Inventory all tables from db/schema.sql
- [x] Group by access type: public-read, student-owned, teacher-owned, admin-only, worker-only
- [x] Write table-by-table access matrix

### 2b. Implementation (high-risk tables first)

- [x] users
- [x] subscriptions
- [x] payments
- [ ] teacher_profiles
- [ ] teacher_classes
- [ ] teacher_class_members
- [ ] teacher_quizzes
- [ ] teacher_quiz_attempts
- [ ] messages_threads
- [ ] messages

### 2c. Remaining tables

- [ ] programs
- [ ] courses
- [ ] levels
- [ ] products
- [ ] announcements
- [ ] user_notice_state
- [ ] config
- [ ] quizzes
- [ ] mock_quizzes
- [ ] attempts
- [ ] items tables (11 tables, same policy)
- [ ] offline_packs
- [ ] teacher_bank_items
- [ ] teacher_quiz_items
- [ ] teacher_quiz_classes
- [ ] teacher_library_courses

### 2d. RLS done when

- [ ] A logged-in student cannot read or mutate other users' rows from the browser
- [ ] A teacher cannot reach admin-only data
- [ ] Worker/server-side flows still function after policies are applied
- [ ] Document final RLS rules in repo

## 3. XSS Cleanup

### 3a. Fix unsafe innerHTML injection

- [ ] js/myteacher-teacher-nav.js:362
- [ ] js/myteacher-student-nav.js:229
- [ ] js/mynmclicensure-student-sidebar.js:275
- [ ] router.html:265

### 3b. Rules

- Replace innerHTML for user-controlled values with DOM creation + textContent
- Treat as unsafe: names, emails, avatar URLs, org/profile text
- Add safe avatar rendering fallback when URL is missing or invalid

### 3c. XSS done when

- [ ] No user-controlled value is injected through string-built HTML in the flagged areas
- [ ] All affected pages still render correctly for student, teacher, and admin

## 4. Payments Worker Hardening

### 4a. CORS

- [ ] Remove wildcard CORS fallback from payments-worker/src/index.js
- [ ] Make APP_ORIGIN mandatory in production
- [ ] Reject requests from disallowed origins cleanly

### 4b. Setup token expiry

- [ ] Define a token lifetime rule (e.g. 24 hours)
- [ ] Add expiry validation in verify/setup-complete
- [ ] Reject stale SETUP_REQUIRED tokens

### 4c. Rate limiting

- [ ] /payments/init-public
- [ ] /payments/init-upgrade
- [ ] /payments/verify
- [ ] /payments/setup-complete

### 4d. Other

- [ ] Log blocked/expired/rate-limited cases clearly
- [ ] Confirm admin subscription routes still work after changes

### 4e. Payments done when

- [ ] No request succeeds with empty-origin fallback
- [ ] Old setup tokens cannot be reused
- [ ] Repeated payment endpoint abuse is throttled

## 5. ID Generation Cleanup

- [ ] Replace generateUserId() in register.html with crypto.getRandomValues()
- [ ] Replace trial subscription_id generation in register.html
- [ ] Search repo for other Math.random() ID generation
- [ ] Keep ID prefix conventions (U_, SUB_) unchanged
- [ ] Prefer crypto-based generation everywhere new IDs are created in browser

### Done when

- [ ] No security-sensitive ID in active flows uses Math.random()
- [ ] Existing prefix conventions still match app expectations

## 6. Trusted-Boundary Map

No code moves in Sprint 1 — just the analysis.

- [ ] List all direct browser writes to sensitive tables
- [ ] Mark each as: safe under RLS / should move to worker / should move to RPC
- [ ] Prioritize highest-risk write paths
- [ ] Define first migration targets for Sprint 2

### Done when

- [ ] Written trusted-boundary map exists
- [ ] First high-risk candidates identified for Sprint 2

## 7. Schema Cleanup Triage

Only change schema if it blocks security work.

- [ ] Decide: payments.created_at — needed now or defer?
- [ ] Decide: users.last_login_utc — wire up or drop?
- [ ] Decide: users.username — future scope or dead weight?

## 8. Final Verification Checklist

- [ ] Student login still works
- [ ] Teacher login still works
- [ ] Admin login still works
- [ ] Router sends users to correct area
- [ ] Teacher top nav renders correctly
- [ ] Student sidebar renders correctly
- [ ] Public register still works
- [ ] Trial subscription created correctly after register
- [ ] Payment init works
- [ ] Payment verify works
- [ ] Setup-complete works for paid-before-signup flow
- [ ] Admin grant/update/revoke subscription flows still work
- [ ] Browser console cannot read/write unrelated rows after RLS

---

## Execution Order

1. RLS access matrix
2. XSS fixes
3. Payments worker hardening
4. ID generation cleanup
5. Trusted-boundary map
6. Schema triage
7. Full regression pass

## Exit Criteria

Sprint 1 is complete only when:
- RLS is no longer effectively open
- The 4 named XSS targets are fixed
- Payment CORS/token/rate-limit issues are closed
- Math.random() ID generation is removed from security-relevant flows
- A clear trusted-boundary map exists for Sprint 2

---

## Files Touched Log

_(update as we work)_

| Date | File | Change |
|---|---|---|
| April 2026 | db/rls.sql | Created — RLS policy source of truth |
| April 2026 | db/schema.sql | No change — reference only |
| April 2026 | users table | Replaced dev_allow_all with users_select, users_update |
| April 2026 | subscriptions table | Replaced dev_allow_all with subscriptions_select, subscriptions_insert, subscriptions_update |
| April 2026 | payments table | Replaced dev_allow_all with payments_select |

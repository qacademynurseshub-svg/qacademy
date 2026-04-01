# Sprint 1: Security Hardening

**Status:** ✅ Complete — April 2026
**Rule:** Security only — no unrelated refactors or features.

---

## 1. Lock the Scope

- [x] Freeze major feature work until Sprint 1 is complete
- [x] Keep a running log of every file touched (bottom of this file)

## 2. RLS Replacement

### 2a. Access matrix

- [x] Inventory all tables from db/schema.sql
- [x] Group by access type: public-read, student-owned, teacher-owned, admin-only, worker-only
- [x] Write table-by-table access matrix

### 2b. Implementation (high-risk tables first)

- [x] users
- [x] subscriptions
- [x] payments
- [x] teacher_profiles
- [x] teacher_classes
- [x] teacher_class_members
- [x] teacher_quizzes
- [x] teacher_quiz_attempts
- [x] messages_threads
- [x] messages

### 2c. Remaining tables

- [x] programs
- [x] courses
- [x] levels
- [x] products
- [x] announcements
- [x] user_notice_state
- [x] config
- [x] quizzes
- [x] mock_quizzes
- [x] attempts
- [x] items tables (11 tables, same policy)
- [x] offline_packs
- [x] teacher_bank_items
- [x] teacher_quiz_items
- [x] teacher_quiz_classes
- [x] teacher_library_courses

### 2d. RLS done when

- [x] A logged-in student cannot read or mutate other users' rows from the browser
- [x] A teacher cannot reach admin-only data
- [x] Worker/server-side flows still function after policies are applied
- [x] Document final RLS rules in repo

## 3. XSS Cleanup

### 3a. Fix unsafe innerHTML injection

- [x] js/myteacher-teacher-nav.js:362
- [x] js/myteacher-student-nav.js:229
- [x] js/mynmclicensure-student-sidebar.js:275
- [x] router.html:265

### 3b. Rules

- Replace innerHTML for user-controlled values with DOM creation + textContent
- Treat as unsafe: names, emails, avatar URLs, org/profile text
- Add safe avatar rendering fallback when URL is missing or invalid

### 3c. XSS done when

- [x] No user-controlled value is injected through string-built HTML in the flagged areas
- [x] All affected pages still render correctly for student, teacher, and admin

## 4. Payments Worker Hardening

### 4a. CORS

- [x] Remove wildcard CORS fallback from payments-worker/src/index.js
- [x] Make APP_ORIGIN mandatory in production
- [x] Reject requests from disallowed origins cleanly

### 4b. Setup token expiry

- [x] Define a token lifetime rule (48 hours)
- [x] Add expiry validation in setup-complete
- [x] Reject stale SETUP_REQUIRED tokens

### 4c. Rate limiting

- [x] /payments/init-public
- [x] /payments/init-upgrade
- [x] /payments/verify
- [x] /payments/setup-complete

### 4d. Other

- [x] Log blocked/expired/rate-limited cases clearly
- [x] Confirm admin subscription routes still work after changes

### 4e. Payments done when

- [x] No request succeeds with empty-origin fallback
- [x] Old setup tokens cannot be reused
- [x] Repeated payment endpoint abuse is throttled

## 5. ID Generation Cleanup

- [x] Replace generateUserId() in register.html with crypto.getRandomValues()
- [x] Replace trial subscription_id generation in register.html
- [x] Search repo for other Math.random() ID generation
- [x] Keep ID prefix conventions (U_, SUB_) unchanged
- [x] Prefer crypto-based generation everywhere new IDs are created in browser

### Done when

- [x] No security-sensitive ID in active flows uses Math.random()
- [x] Existing prefix conventions still match app expectations

## 6. Trusted-Boundary Map

No code moves in Sprint 1 — just the analysis.

- [x] List all direct browser writes to sensitive tables
- [x] Mark each as: safe under RLS / should move to worker / should move to RPC
- [x] Prioritize highest-risk write paths
- [x] Define first migration targets for Sprint 2

### Done when

- [x] Written trusted-boundary map exists
- [x] First high-risk candidates identified for Sprint 2

## 7. Schema Cleanup Triage

Only change schema if it blocks security work.

- [x] Decide: payments.created_at — needed now or defer?
- [x] Decide: users.last_login_utc — wire up or drop?
- [x] Decide: users.username — future scope or dead weight?

## 8. Final Verification Checklist

- [x] Student login still works
- [x] Teacher login still works
- [x] Admin login still works
- [x] Router sends users to correct area
- [x] Teacher top nav renders correctly
- [x] Student sidebar renders correctly
- [x] Public register still works
- [x] Trial subscription created correctly after register
- [x] Payment init works
- [x] Payment verify works
- [x] Setup-complete works for paid-before-signup flow
- [x] Admin grant/update/revoke subscription flows still work
- [x] Browser console cannot read/write unrelated rows after RLS

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
| April 2026 | db/rls.sql | Added auth_user_id() helper, batch 2 policies, lessons learned |
| April 2026 | teacher_profiles | Replaced dev_allow_all with teacher_profiles_select, _insert, _update |
| April 2026 | teacher_classes | Replaced dev_allow_all with teacher_classes_select, _insert, _update |
| April 2026 | teacher_class_members | Replaced dev_allow_all with teacher_class_members_select, _insert, _update |
| April 2026 | teacher_quizzes | Replaced dev_allow_all with teacher_quizzes_select, _insert, _update |
| April 2026 | teacher_quiz_attempts | Replaced dev_allow_all with teacher_quiz_attempts_select, _insert, _update |
| April 2026 | messages_threads | Replaced dev_allow_all with messages_threads_select, _insert, _update |
| April 2026 | messages | Replaced dev_allow_all with messages_select, _insert, _update |
| April 2026 | db/rls.sql | Batch 3 — all remaining tables locked down |
| April 2026 | programs | Public SELECT, admin writes |
| April 2026 | courses, levels, products, config, teacher_library_courses | Logged-in SELECT, admin writes |
| April 2026 | attempts, offline_packs, user_notice_state | Student-owned rows, admin reads all |
| April 2026 | announcements, quizzes, mock_quizzes | Logged-in SELECT, admin writes |
| April 2026 | items_* (11 tables) | Logged-in SELECT, admin full CRUD |
| April 2026 | teacher_quiz_items, teacher_quiz_classes | Teacher writes, students/teachers read |
| April 2026 | teacher_bank_items | Teacher-owned rows, admin reads all |
| April 2026 | js/utils.js | Created — safeText() and safeAvatar() helpers |
| April 2026 | js/myteacher-teacher-nav.js | XSS fix — DOM methods replace innerHTML |
| April 2026 | js/myteacher-student-nav.js | XSS fix — DOM methods replace innerHTML |
| April 2026 | js/mynmclicensure-student-sidebar.js | XSS fix — DOM methods replace innerHTML |
| April 2026 | router.html | XSS fix — addEventListener replaces onclick string injection |
| April 2026 | 24 HTML pages | utils.js script tag added |
| April 2026 | AGENTS.md | Security rules updated with safeText/safeAvatar convention |
| April 2026 | payments-worker/src/index.js | CORS hardened, rate limit checks (5/60s), token expiry 48hr, token refresh on verify |
| April 2026 | payments-worker/wrangler.jsonc | ratelimits binding added — RATE_LIMITER, namespace_id 1001, 5 req/60s |
| April 2026 | mynmclicensure/admin/payments.html | Retry Activation button now shown for SETUP_REQUIRED rows |
| April 2026 | register.html | Replaced Math.random() with makeSecureId() and crypto.getRandomValues() |
| April 2026 | js/mynmclicensure-api.js | Replaced Math.random() with makeSecureId(), secureShuffle() |
| April 2026 | js/myteacher-api.js | Replaced Math.random() with makeSecureId(), secureShuffle(), makeSecureJoinCode() |
| April 2026 | db/rls.sql | products_select changed to USING(true) — public read for subscribe.html |
| April 2026 | docs/product/ | Created — 8 plain English product documentation files |

# Sprint 2: Service Boundaries

**Status:** In progress
**Rule:** Stability and boundaries only — no new features.

---

## What This Sprint Is About

Right now too much logic runs in the browser with no server-side validation. This sprint moves the right work to the right place — database filtering, chunked loading, and cleaner error handling across the platform.

---

## 1. Pagination

Load large lists in chunks instead of all at once.
Default sort is newest first unless specified otherwise.
Chunk size: 50 rows per page for admin lists, 20 rows for student-facing lists.

Pages that need pagination (work through in this order):

### Admin pages
- [x] admin/users.html — paginate user list, 50 per page, newest registered first
- [x] admin/payments.html — already sorted by paid_utc, add formal pagination (currently loads all)
- [x] mynmclicensure/admin/fixed-quizzes.html — paginate quiz list if large
- [x] myteacher/teacher/bank.html — paginate question bank, 50 per page, newest first

### Student pages
- [x] mynmclicensure/student/learning-history.html — paginate attempts, 20 per page, newest first
- [x] myteacher/student/my-classes.html — narrow select (small list, pagination deferred)

### Done when
- [x] No page loads more than 50 rows in a single query on initial load
- [x] Each paginated page has a clear Load More button or page controls
- [x] Total count is shown so user knows how many records exist

---

## 2. Database-Side Search and Filtering

Move search from browser JavaScript to Supabase queries.
Only apply to lists that could realistically grow large.
Leave small static lists (programmes, products, courses) as browser-side — they will always be small.

- [x] admin/users.html — move name/email search to Supabase ilike query instead of client-side filter
- [x] myteacher/teacher/bank.html — move topic/stem search to Supabase instead of client-side filter
- [x] admin/messages.html — move student name/email search to Supabase instead of client-side filter
- [x] Recipient resolution in bulk announcement send — move to Supabase query with AND filters instead of client-side intersection

### Done when
- [x] Search on users page queries Supabase directly
- [x] Search on question bank queries Supabase directly
- [x] No large list filtering happens entirely in the browser

---

## 3. Narrow select('*') Queries

Replace select('*') with only the columns each page needs.
Priority: pages that load many rows or sensitive tables.

High priority (admin pages seeing all rows):
- [x] admin/users.html — select only: user_id, name, forename, surname, email, program_id, role, active, created_utc, cohort, level
- [x] admin/payments.html — narrow to needed columns only
- [x] admin/subscriptions.html — narrow subscription and joined product columns
- [x] admin/messages.html — narrow messages_threads to explicit columns
- [x] myteacher/teacher/bank.html — narrow to columns shown in the list view

Lower priority (student pages — RLS already limits rows):
- [x] mynmclicensure/student/learning-history.html — narrow attempts columns (omit answers_json, item_ids)
- [x] myteacher/student/my-classes.html — narrow class + membership columns

### Done when
- [x] No admin list page uses select('*') on a large table
- [x] Each query only fetches columns the page displays or uses in logic

---

## 4. Standardise Error Response Shapes

Agree on one error shape and apply it consistently across both API files.

Agreed shape:
```
{
  ok: false,
  error: 'snake_case_code',
  message: 'Human readable explanation'
}
```

- [ ] Audit all functions in js/mynmclicensure-api.js — list every place that returns null, false, or throws instead of a structured error
- [ ] Audit all functions in js/myteacher-api.js — same
- [ ] Fix silent catch blocks in myteacher-api.js (14 identified in build list)
- [ ] Standardise error returns in mynmclicensure-api.js
- [ ] Confirm all page-level error handlers can receive and display the standard shape

### Done when
- [ ] No API function returns null or false as an error signal
- [ ] All catch blocks log the error and return structured shape
- [ ] Student-facing pages show a clear message when any data load fails

---

## 5. Database Transactions for Multi-Step Operations

Wrap related multi-step writes in Supabase RPCs so they are atomic — all succeed or all roll back.

Operations that need transactions:
- [ ] Quiz publish — writing quiz status + snapshotting items must be atomic
- [ ] Result release — updating quiz status + notifying students must be atomic
- [ ] Admin subscription assignment — creating subscription + updating payment row must be atomic
- [ ] Bulk message send — creating threads + messages for many recipients must be atomic or chunked safely

### Done when
- [ ] Each multi-step operation either fully completes or fully rolls back
- [ ] No half-written quiz publishes or subscription assignments are possible
- [ ] RPCs are documented in CLONING.md

---

## 6. Correlation IDs on Key Flows

Add a unique tracking ID to important operations so they can be traced across browser, worker, and database logs.

Flows that need correlation IDs:
- [ ] Payment flow — already has reference as natural ID, confirm it appears in all log statements
- [ ] Quiz submission — add attempt_id to all log statements in the runner
- [ ] Class join — add a join_id to the log when a student joins a class
- [ ] Quiz publish — log the quiz_id and teacher_id at every step
- [ ] Bulk message send — BULK_ batch ID already exists, confirm it appears in logs

### Done when
- [ ] Every key operation has an ID that appears in console logs at every step
- [ ] Admin can identify a specific operation from a student's report using that ID

---

## Exit Criteria

Sprint 2 is complete only when:
- No page loads more than 50 rows on initial load
- Search on large lists queries Supabase directly
- No admin page uses select('*') on a large table
- All API errors return a consistent structured shape
- Multi-step operations are wrapped in transactions or RPCs
- Key flows have traceable IDs in logs

---

## Files Touched Log

| Date | File | Change |
|---|---|---|
| 2026-04-02 | js/mynmclicensure-api.js | Added getUsers() pagination + ilike search, getPaymentsPaginated(), getPaymentStatusCounts(), getUsersByIds(), getAllQuizzesPaginated(), getStudentAttemptsPaginated(); DB-side search on getAdminThreads(); DB-side resolveRecipients(); narrow selects throughout |
| 2026-04-02 | js/myteacher-api.js | Added getBankItemsPaginated(); narrowed getStudentClasses() select |
| 2026-04-02 | js/utils.js | Added escapeHtml() string helper for template literals |
| 2026-04-02 | mynmclicensure/admin/users.html | Paginated loading, Load More, 300ms search debounce, escapeHtml on user data |
| 2026-04-02 | mynmclicensure/admin/payments.html | Paginated loading, Load More, status count queries, revenue query, rowMap for panel |
| 2026-04-02 | mynmclicensure/admin/fixed-quizzes.html | Paginated loading, Load More, client-side filters preserved |
| 2026-04-02 | mynmclicensure/admin/messages.html | DB-side search + context/status filters, read filter stays client-side, 300ms debounce |
| 2026-04-02 | mynmclicensure/admin/subscriptions.html | Narrowed select to explicit columns |
| 2026-04-02 | mynmclicensure/student/learning-history.html | Paginated loading, Load More, omit answers_json/item_ids |
| 2026-04-02 | myteacher/teacher/bank.html | Paginated loading, Load More, 300ms keyword debounce |

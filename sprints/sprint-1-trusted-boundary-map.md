# Sprint 1 — Trusted Boundary Map

## What This Document Is

A trusted boundary map is an inventory of every place where the application writes data, classified by where that write happens and how much we trust it. The goal is to identify which writes are safe as they are, and which ones should be moved behind a more secure boundary in Sprint 2. This matters because code running in a student's browser can be inspected, modified, or replayed — so any write that touches money, access control, or other students' data needs extra protection beyond what the browser can provide.

## The Three Boundaries

### Browser (untrusted)
Code running in the student's, teacher's, or admin's browser. This includes everything in `js/mynmclicensure-api.js`, `js/myteacher-api.js`, and inline scripts in HTML pages. Anyone can open DevTools, inspect the code, modify requests, or replay them. Browser code uses the Supabase anon key, which means RLS policies are the only thing standing between a user and someone else's data.

### Cloudflare Worker (trusted)
Server-side code that we control, running on Cloudflare's infrastructure. The payments worker (`payments-worker/src/index.js`) is the only worker today. It holds the Supabase service role key and the Paystack secret key — neither of which is ever exposed to the browser. Users cannot inspect or modify worker code. This is the right place for operations involving money, account creation, or anything that needs secret keys.

### Supabase RLS (trusted)
Row Level Security policies enforced by the database itself, regardless of what the browser sends. Even if someone crafts a malicious request from the browser, RLS ensures they can only read or write rows they are authorised to touch. RLS is defined in `db/rls.sql` and covers all 36 tables. It is the safety net that makes many browser writes acceptable.

---

## Browser Writes — Full Inventory

### From register.html

| Table | What is written | Assessment | Reason |
|---|---|---|---|
| users | New user row (user_id, email, name, programme, role) | MOVE TO RPC | Account creation is a sensitive operation. Currently the browser generates the user_id and inserts directly. The auth signup happens via Supabase Auth, but the public `users` row insert is unprotected beyond RLS. A malicious client could insert a row with role=ADMIN. |
| subscriptions | Trial subscription row after registration | MOVE TO RPC | Subscription creation controls access. A browser client could craft a subscription with any product_id, any duration, or source=PAYSTACK to fake a paid subscription. Should be an atomic operation tied to the auth signup. |

### From js/mynmclicensure-api.js

| Table | What is written | Assessment | Reason |
|---|---|---|---|
| subscriptions | Admin assigns subscription via `assignSubscription()` | MOVE TO RPC | Creates an ACTIVE subscription from the browser. Although called by admin pages, the write itself goes through the browser with the anon key. RLS allows admin writes, but the operation should validate product existence and duration server-side. |
| users | Admin deactivates/activates user, updates profile fields | SAFE UNDER RLS | RLS restricts updates to own row (students) or any row (admin). Profile updates only touch the user's own non-sensitive fields. |
| attempts | New attempt row (spawn fixed, spawn builder, spawn timed, retake) | SAFE UNDER RLS | Student can only create attempts tied to their own user_id. RLS enforces ownership. No financial or access-control impact — an attempt is just a quiz session record. |
| attempts | Save progress (answers_json, flags_json, time updates) | SAFE UNDER RLS | Student updates their own in-progress attempt. RLS enforces ownership. |
| attempts | Finish attempt (score, status change to completed) | SAFE UNDER RLS | Student marks their own attempt complete. Score is calculated client-side, but this only affects the student's own record. No impact on other students or access control. |
| offline_packs | New pack row, update pack content | SAFE UNDER RLS | Student creates and manages their own offline packs. RLS enforces ownership. No impact on other students. |
| messages_threads | New thread row | SAFE UNDER RLS | Student creates a thread tied to their own user_id. RLS enforces ownership. |
| messages | New message row | SAFE UNDER RLS | Student sends a message in their own thread. RLS enforces thread ownership. |
| messages_threads | Update thread (last_message_at, status) | SAFE UNDER RLS | Updates only the student's own threads. |
| messages | Mark messages as read | SAFE UNDER RLS | Student marks messages in their own threads. |
| user_notice_state | Announcement read/dismissed state | SAFE UNDER RLS | Student writes only their own notice state rows. No impact on others. |

### From js/myteacher-api.js

| Table | What is written | Assessment | Reason |
|---|---|---|---|
| teacher_classes | Create, update, archive class | SAFE UNDER RLS | Teacher can only write their own classes. RLS enforces teacher_id ownership. |
| teacher_class_members | Join class, update member, remove/approve/reject | SAFE UNDER RLS | Students can insert their own membership row. Teachers can update members in their own classes. RLS enforces both. |
| teacher_bank_items | Create, update, archive bank items | SAFE UNDER RLS | Teacher can only write their own bank items. RLS enforces teacher_id ownership. |
| teacher_quizzes | Create, update, archive, publish, clone quiz | MOVE TO RPC | Publishing a quiz is a multi-step operation: it deletes old snapshot items, inserts new snapshots into teacher_quiz_items, and updates the quiz status — all in separate database calls. If the browser loses connection mid-publish, the quiz can end up in a broken state (items deleted but status not updated, or vice versa). This should be an atomic server-side operation. |
| teacher_quiz_items | Snapshot rows inserted at publish time | MOVE TO RPC | Part of the publish operation. Should be atomic with the quiz status update. |
| teacher_quiz_classes | Link/unlink classes to quiz | SAFE UNDER RLS | Teacher manages their own quiz-class associations. RLS enforces ownership through the quiz's teacher_id. |
| teacher_quiz_attempts | Start attempt, save progress, submit attempt | SAFE UNDER RLS | Student creates and updates their own attempt. RLS enforces user_id ownership. Scoring happens client-side but only affects the student's own record. |
| teacher_profiles | Create and update teacher profile | SAFE UNDER RLS | Teacher writes only their own profile. RLS enforces ownership. |

---

## High Risk Candidates for Sprint 2

These are the write paths that most urgently need to move behind a trusted boundary:

1. **Registration: users + subscriptions insert (register.html)** — Account creation and trial subscription grant happen as two separate browser writes. A crafted request could insert a user with role=ADMIN or create a subscription with arbitrary product/duration. Should be a single atomic RPC that validates role, product, and duration server-side.

2. **Admin subscription assignment (mynmclicensure-api.js → assignSubscription)** — Creates an ACTIVE subscription directly from the browser. Even though RLS restricts this to admin role, the operation should validate product existence, duration, and prevent duplicate active subscriptions server-side.

3. **Quiz publish (myteacher-api.js → publishTeacherQuiz)** — A multi-step operation (delete old snapshots, insert new snapshots, update quiz status) that is not atomic. If interrupted mid-way, the quiz ends up in a broken state. Should be a single database transaction via RPC.

4. **Quiz result release (myteacher-api.js)** — Changes visibility of results to students. Currently a direct browser update. Should verify the teacher owns the quiz server-side and that the release policy is valid.

5. **Bulk message send (mynmclicensure-api.js → bulkSend)** — Sends messages to potentially hundreds of students in a loop from the browser. Should be a server-side operation for reliability (browser closing mid-send leaves partial sends) and to prevent abuse.

---

## What Is Already Safe

These write paths are safe to remain as browser writes under RLS:

- **Quiz attempts (create, save, finish)** — Student writes only their own rows. No financial impact. RLS enforces ownership.
- **Offline packs (create, update)** — Student manages their own packs. No impact on others.
- **Messages (send, read)** — Student writes in their own threads. RLS enforces ownership.
- **Announcement state (read, dismiss)** — Student writes only their own notice state.
- **Teacher classes (create, update, archive)** — Teacher writes only their own classes. RLS enforces ownership.
- **Teacher bank items (create, update)** — Teacher writes only their own items. RLS enforces ownership.
- **Teacher class members (join, approve, reject)** — RLS enforces that students can only insert their own membership and teachers can only manage members in their own classes.
- **User profile updates** — Students update their own profile. Admins update any profile. RLS enforces the distinction.
- **Teacher profile updates** — Teachers update only their own profile. RLS enforces ownership.
- **Quiz-class links** — Teacher manages associations for their own quizzes. RLS enforces ownership.
- **Student quiz attempts (teacher side)** — Students write only their own attempts. RLS enforces ownership.

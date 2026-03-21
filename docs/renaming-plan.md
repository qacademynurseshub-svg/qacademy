# QAcademy — Restructure & Rename Plan
*Prepared: March 2026 — Execute on Claude Desktop*

---

## Overview

This plan reorganises the project from a flat `student/` and `admin/` 
structure into a proper `mynmclicensure/` product folder, mirroring the 
existing `myteacher/` structure. Three JS files are also renamed for 
consistency.

---

## Part 1 — JS Files to Rename

Do these first. Rename in place inside `js/` — do not move them.

| Old filename | New filename |
|---|---|
| `js/api.js` | `js/mynmclicensure-api.js` |
| `js/admin-sidebar.js` | `js/mynmclicensure-admin-sidebar.js` |
| `js/student-sidebar.js` | `js/mynmclicensure-student-sidebar.js` |

**JS files that stay unchanged (do not touch):**
- `js/config.js`
- `js/guard.js`
- `js/teacher-api.js`
- `js/myteacher-admin-nav.js`
- `js/myteacher-teacher-nav.js`
- `js/myteacher-student-nav.js`

---

## Part 2 — Folders & Files to Move

Create the new folder structure first:
```
mynmclicensure/
  admin/
  student/
  runner/
```

### Admin files — move from `admin/` to `mynmclicensure/admin/`

| Old path | New path |
|---|---|
| `admin/dashboard.html` | `mynmclicensure/admin/dashboard.html` |
| `admin/users.html` | `mynmclicensure/admin/users.html` |
| `admin/subscriptions.html` | `mynmclicensure/admin/subscriptions.html` |
| `admin/products.html` | `mynmclicensure/admin/products.html` |
| `admin/courses.html` | `mynmclicensure/admin/courses.html` |
| `admin/announcements.html` | `mynmclicensure/admin/announcements.html` |
| `admin/fixed-quizzes.html` | `mynmclicensure/admin/fixed-quizzes.html` |
| `admin/mock-exams.html` | `mynmclicensure/admin/mock-exams.html` |
| `admin/question-bank.html` | `mynmclicensure/admin/question-bank.html` |
| `admin/config.html` | `mynmclicensure/admin/config.html` |
| `admin/messages.html` | `mynmclicensure/admin/messages.html` |
| `admin/payments.html` | `mynmclicensure/admin/payments.html` |

### Student files — move from `student/` to `mynmclicensure/student/`

| Old path | New path |
|---|---|
| `student/dashboard.html` | `mynmclicensure/student/dashboard.html` |
| `student/announcements.html` | `mynmclicensure/student/announcements.html` |
| `student/course.html` | `mynmclicensure/student/course.html` |
| `student/fixed-quizzes.html` | `mynmclicensure/student/fixed-quizzes.html` |
| `student/mock-exams.html` | `mynmclicensure/student/mock-exams.html` |
| `student/learning-history.html` | `mynmclicensure/student/learning-history.html` |
| `student/quiz-builder.html` | `mynmclicensure/student/quiz-builder.html` |
| `student/upgrade.html` | `mynmclicensure/student/upgrade.html` |
| `student/profile.html` | `mynmclicensure/student/profile.html` |
| `student/messages.html` | `mynmclicensure/student/messages.html` |
| `student/telegram.html` | `mynmclicensure/student/telegram.html` |
| `student/offline-pack-builder.html` | `mynmclicensure/student/offline-pack-builder.html` |
| `student/my-offline-packs.html` | `mynmclicensure/student/my-offline-packs.html` |
| `student/offline-pack-renderer.html` | `mynmclicensure/student/offline-pack-renderer.html` |

### Runner files — move from `runner/` to `mynmclicensure/runner/`

| Old path | New path |
|---|---|
| `runner/instant.html` | `mynmclicensure/runner/instant.html` |
| `runner/timed.html` | `mynmclicensure/runner/timed.html` |

### Files that stay at root (do not move)
```
index.html
router.html
subscribe.html
payment-confirmation.html
login.html
register.html
forgot-password.html
reset-password.html
```

---

## Part 3 — Path Changes Inside Files

Work through each file and apply the find/replace changes listed.
After moving a file, open it and fix all references before moving on.

---

### `router.html` (stays at root)

| Find | Replace with |
|---|---|
| `/student/dashboard.html` | `/mynmclicensure/student/dashboard.html` |
| `/admin/dashboard.html` | `/mynmclicensure/admin/dashboard.html` |

---

### `js/mynmclicensure-admin-sidebar.js`

| Find | Replace with |
|---|---|
| `/admin/dashboard.html` | `/mynmclicensure/admin/dashboard.html` |
| `/admin/users.html` | `/mynmclicensure/admin/users.html` |
| `/admin/subscriptions.html` | `/mynmclicensure/admin/subscriptions.html` |
| `/admin/payments.html` | `/mynmclicensure/admin/payments.html` |
| `/admin/products.html` | `/mynmclicensure/admin/products.html` |
| `/admin/courses.html` | `/mynmclicensure/admin/courses.html` |
| `/admin/announcements.html` | `/mynmclicensure/admin/announcements.html` |
| `/admin/fixed-quizzes.html` | `/mynmclicensure/admin/fixed-quizzes.html` |
| `/admin/mock-exams.html` | `/mynmclicensure/admin/mock-exams.html` |
| `/admin/question-bank.html` | `/mynmclicensure/admin/question-bank.html` |
| `/admin/messages.html` | `/mynmclicensure/admin/messages.html` |
| `/admin/config.html` | `/mynmclicensure/admin/config.html` |

---

### `js/mynmclicensure-student-sidebar.js`

| Find | Replace with |
|---|---|
| `/student/dashboard.html` | `/mynmclicensure/student/dashboard.html` |
| `/student/fixed-quizzes.html` | `/mynmclicensure/student/fixed-quizzes.html` |
| `/student/mock-exams.html` | `/mynmclicensure/student/mock-exams.html` |
| `/student/quiz-builder.html` | `/mynmclicensure/student/quiz-builder.html` |
| `/student/learning-history.html` | `/mynmclicensure/student/learning-history.html` |
| `/student/announcements.html` | `/mynmclicensure/student/announcements.html` |
| `/student/my-offline-packs.html` | `/mynmclicensure/student/my-offline-packs.html` |
| `/student/offline-pack-builder.html` | `/mynmclicensure/student/offline-pack-builder.html` |
| `/student/messages.html` | `/mynmclicensure/student/messages.html` |
| `/student/telegram.html` | `/mynmclicensure/student/telegram.html` |
| `/student/profile.html` | `/mynmclicensure/student/profile.html` |
| `/student/upgrade.html` | `/mynmclicensure/student/upgrade.html` |
| `/student/course.html` | `/mynmclicensure/student/course.html` |

---

### `js/myteacher-admin-nav.js`

| Find | Replace with |
|---|---|
| `/admin/dashboard.html` | `/mynmclicensure/admin/dashboard.html` |

---

### Every file in `mynmclicensure/admin/` (all 12 pages)

Apply to every admin HTML file:

| Find | Replace with |
|---|---|
| `/js/api.js` | `/js/mynmclicensure-api.js` |
| `/js/admin-sidebar.js` | `/js/mynmclicensure-admin-sidebar.js` |

---

### Every file in `mynmclicensure/student/` (all 14 pages)

Apply to every student HTML file:

| Find | Replace with |
|---|---|
| `/js/api.js` | `/js/mynmclicensure-api.js` |
| `/js/student-sidebar.js` | `/js/mynmclicensure-student-sidebar.js` |

---

### Every file in `mynmclicensure/runner/` (both runner pages)

Apply to both runner HTML files:

| Find | Replace with |
|---|---|
| `/js/api.js` | `/js/mynmclicensure-api.js` |

---

### `mynmclicensure/runner/instant.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/student/fixed-quizzes.html` | `/mynmclicensure/student/fixed-quizzes.html` |

---

### `mynmclicensure/runner/timed.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |
| `/student/fixed-quizzes.html` | `/mynmclicensure/student/fixed-quizzes.html` |

---

### `mynmclicensure/student/dashboard.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/student/course.html` | `/mynmclicensure/student/course.html` |

---

### `mynmclicensure/student/learning-history.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |
| `/student/learning-history.html` | `/mynmclicensure/student/learning-history.html` |

---

### `mynmclicensure/student/fixed-quizzes.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |

---

### `mynmclicensure/student/mock-exams.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |

---

### `mynmclicensure/student/quiz-builder.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |

---

### `mynmclicensure/student/offline-pack-builder.html` (specific)

| Find | Replace with |
|---|---|
| `/student/dashboard.html` | `/mynmclicensure/student/dashboard.html` |
| `/student/my-offline-packs.html` | `/mynmclicensure/student/my-offline-packs.html` |

---

### `mynmclicensure/student/my-offline-packs.html` (specific)

| Find | Replace with |
|---|---|
| `/student/dashboard.html` | `/mynmclicensure/student/dashboard.html` |
| `/student/offline-pack-builder.html` | `/mynmclicensure/student/offline-pack-builder.html` |

---

### `mynmclicensure/student/course.html` (specific)

| Find | Replace with |
|---|---|
| `/runner/instant.html` | `/mynmclicensure/runner/instant.html` |
| `/runner/timed.html` | `/mynmclicensure/runner/timed.html` |
| `/student/mock-exams.html` | `/mynmclicensure/student/mock-exams.html` |
| `/student/fixed-quizzes.html` | `/mynmclicensure/student/fixed-quizzes.html` |

---

### `mynmclicensure/admin/dashboard.html` (specific)

| Find | Replace with |
|---|---|
| `/admin/users.html` | `/mynmclicensure/admin/users.html` |
| `/admin/subscriptions.html` | `/mynmclicensure/admin/subscriptions.html` |
| `/admin/payments.html` | `/mynmclicensure/admin/payments.html` |
| `/admin/products.html` | `/mynmclicensure/admin/products.html` |
| `/admin/courses.html` | `/mynmclicensure/admin/courses.html` |
| `/admin/announcements.html` | `/mynmclicensure/admin/announcements.html` |
| `/admin/question-bank.html` | `/mynmclicensure/admin/question-bank.html` |
| `/admin/config.html` | `/mynmclicensure/admin/config.html` |

---

## Part 4 — Verification Checklist

After execution, verify the following before pushing to GitHub:

- [ ] `router.html` correctly routes to both new dashboards
- [ ] Admin sidebar links all resolve correctly
- [ ] Student sidebar links all resolve correctly
- [ ] `myteacher-admin-nav.js` switch link goes to correct admin dashboard
- [ ] Runner instant ↔ timed cross-redirects work
- [ ] Learning history Resume/Review/Retake buttons launch correct runner
- [ ] Quiz builder launches correct runner after building
- [ ] Fixed quizzes and mock exams launch correct runner
- [ ] Offline pack builder links back to correct pages
- [ ] All admin pages load with correct sidebar
- [ ] All student pages load with correct sidebar
- [ ] No 404s on any navigation path

---

## Part 5 — What Does NOT Change

- `myteacher/` — entire folder untouched
- `js/config.js` — untouched
- `js/guard.js` — untouched
- `js/teacher-api.js` — untouched
- `js/myteacher-teacher-nav.js` — untouched
- `js/myteacher-student-nav.js` — untouched (switch link points to `/router.html` which stays at root)
- `payments-worker/` — entirely separate deployment, untouched
- `subscribe.html`, `payment-confirmation.html` — stay at root, no internal path changes needed
- `css/style.css` — untouched
- `images/` — untouched
- All Supabase tables, RLS policies, config keys — no changes

---

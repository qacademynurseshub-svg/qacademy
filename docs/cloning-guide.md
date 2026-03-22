# QAcademy — Cloning Guide
*How to create a new product from an existing one*

---

## Overview

The codebase uses a config-driven path system (`js/paths.js`) so that all dynamic URLs are defined in one place. This makes it possible to clone a product by copying its folder, updating a few config values, and renaming its JS files — without hunting through dozens of HTML files for hardcoded paths.

---

## How Paths Work

### The config file: `js/paths.js`

```js
const LICENSURE = {
  admin:   '/mynmclicensure/admin',
  student: '/mynmclicensure/student',
  runner:  '/mynmclicensure/runner',
};

const MYTEACHER = {
  admin:   '/myteacher/admin',
  teacher: '/myteacher/teacher',
  student: '/myteacher/student',
};
```

Every JS file that builds URLs dynamically uses these constants:
- Sidebar nav links: `${LICENSURE.admin}/dashboard.html`
- Inline JS redirects: `MYTEACHER.student + '/my-classes.html'`
- Template literal hrefs: `` `${LICENSURE.runner}/instant.html?quiz_id=${id}` ``

### What CANNOT use the config

Static HTML `href` attributes (not inside `<script>` tags) cannot reference JS variables. These are hardcoded:
```html
<a href="/mynmclicensure/student/dashboard.html">Dashboard</a>
```

When cloning, these must be find-and-replaced. The config approach minimises how many of these exist.

---

## The Golden Rule: Never Hardcode Paths in JS

When adding new pages, links, or redirects:

**DO THIS:**
```js
window.location.href = LICENSURE.student + '/new-page.html';
```

**NOT THIS:**
```js
window.location.href = '/mynmclicensure/student/new-page.html';
```

Every hardcoded path in JS is one more thing to find-and-replace when cloning. Using the config constants means cloning only requires changing `js/paths.js`.

---

## Steps to Clone a Product

Example: cloning `mynmclicensure/` to create `mypharmacy/`.

### 1. Add the new product to `js/paths.js`

```js
const PHARMACY = {
  admin:   '/mypharmacy/admin',
  student: '/mypharmacy/student',
  runner:  '/mypharmacy/runner',
};
```

### 2. Copy the folder

```bash
cp -r mynmclicensure/ mypharmacy/
```

### 3. Copy and rename the JS files

```bash
cp js/mynmclicensure-api.js js/mypharmacy-api.js
cp js/mynmclicensure-admin-sidebar.js js/mypharmacy-admin-sidebar.js
cp js/mynmclicensure-student-sidebar.js js/mypharmacy-student-sidebar.js
```

### 4. Update the new JS files

In the 3 new JS files, replace `LICENSURE` with `PHARMACY`:
- `LICENSURE.admin` → `PHARMACY.admin`
- `LICENSURE.student` → `PHARMACY.student`
- `LICENSURE.runner` → `PHARMACY.runner`

### 5. Update script tags in the new HTML files

In all HTML files under `mypharmacy/`:
- `mynmclicensure-api.js` → `mypharmacy-api.js`
- `mynmclicensure-admin-sidebar.js` → `mypharmacy-admin-sidebar.js`
- `mynmclicensure-student-sidebar.js` → `mypharmacy-student-sidebar.js`

### 6. Update hardcoded HTML hrefs

Find-and-replace in all `mypharmacy/` HTML files:
- `/mynmclicensure/admin/` → `/mypharmacy/admin/`
- `/mynmclicensure/student/` → `/mypharmacy/student/`
- `/mynmclicensure/runner/` → `/mypharmacy/runner/`

### 7. Update `router.html`

Add routing logic for the new product's dashboards, using the new config constant.

### 8. Update cross-product links

If the new product needs "Switch to X" buttons (like the existing admin nav switch buttons), add those links using the config constants.

### 9. Update `guard.js` (if needed)

If the new product has different role requirements, update the guard logic.

---

## Files That Do NOT Need Cloning

These are shared infrastructure and stay untouched:

| File | Why |
|---|---|
| `js/config.js` | Supabase credentials — shared across all products |
| `js/guard.js` | Auth & role guards — shared logic |
| `js/paths.js` | Just add the new product config to the existing file |
| `css/style.css` | Shared styles |
| `images/` | Shared assets |
| Root pages (login, register, router, etc.) | Shared entry points |
| `payments-worker/` | Separate deployment |

---

## Checklist After Cloning

- [ ] New product config added to `js/paths.js`
- [ ] Folder copied and renamed
- [ ] JS files copied, renamed, and updated to use new config constant
- [ ] Script tags in HTML files point to new JS filenames
- [ ] Hardcoded HTML hrefs updated to new product path
- [ ] `router.html` routes to new product dashboards
- [ ] Cross-product switch buttons added (if applicable)
- [ ] All pages load without 404s
- [ ] Sidebar nav links all work
- [ ] Browser console shows zero missing-script errors
- [ ] Grep confirms no stale old-product paths in new files

---

## Why This Approach Exists

Before this system was introduced, the codebase had 60+ hardcoded paths scattered across JS and HTML files. Renaming or cloning required manually finding and updating every single one — error-prone and time-consuming.

The config-driven approach means:
- **JS paths are centralised** — change `paths.js` and everything updates
- **Static HTML paths are minimised** — only unavoidable cases use hardcoded paths
- **Each product is self-contained** — its own folder, its own API file, its own sidebar
- **Products are independent** — modifying one doesn't risk breaking another

---

# QAcademy Nurses Hub — Cloning & Rebuild Guide

This document is a step-by-step guide to rebuilding the QAcademy Nurses Hub 
platform from scratch. Follow every step in order.

---

## What You Need Before Starting
- A GitHub account
- A Supabase account
- A Cloudflare account
- A domain (optional for dev, required for production)

---

## Step 1 — Create the GitHub Repo

1. Go to github.com and log in
2. Click "+" (top right) → "New repository"
3. Fill in:
   - Repository name: qacademy-gamma (or your chosen name)
   - Description: QAcademy Nurses Hub
   - Visibility: Private
   - ✅ Check "Add a README file"
4. Click "Create repository"
5. Note your repo URL: https://github.com/[your-username]/[repo-name]

---

## Step 2 — Create the Supabase Project

1. Go to supabase.com and log in
2. Click "New project"
3. Fill in:
   - Name: qacademy-gamma
   - Database Password: create a strong password and save it
   - Region: West EU (Ireland) — closest to West Africa
   - Pricing plan: Free tier
4. Click "Create new project"
5. Wait 1-2 minutes for setup to complete
6. Go to Project Settings → API
7. Copy and save:
   - Project URL (e.g. https://xxxxxxxxxxxx.supabase.co)
   - Anon public key (starts with eyJ...)

---

## Step 3 — Connect Cloudflare Pages

1. Go to Cloudflare dashboard and log in
2. Click "Workers & Pages" on left sidebar
3. Click "Create" → "Pages" tab → "Connect to Git"
4. Connect your GitHub account
5. Select your repo → click "Begin setup"
6. Fill in:
   - Project name: qacademy-gamma
   - Production branch: main
   - Framework preset: None
   - Build command: leave blank
   - Build output directory: leave blank
7. Click "Save and Deploy"
8. Note your Cloudflare URL: https://[project-name].pages.dev

---

## Step 4 — Configure Supabase Auth

### Email Provider
1. Go to Supabase → Authentication → Providers
2. Click Email provider
3. Set:
   - Enable Email provider: ON
   - Confirm email: OFF (turn on before going live)
   - Minimum password length: 8
4. Click Save

### URL Configuration
1. Go to Supabase → Authentication → URL Configuration
2. Set Site URL to your Cloudflare URL:
   https://[your-project].pages.dev
3. Add Redirect URLs:
   https://[your-project].pages.dev/login.html
   https://[your-project].pages.dev/reset-password.html
4. Click Save

### Email Template (Reset Password)
1. Go to Supabase → Authentication → Email Templates
2. Click "Reset Password"
3. Set subject to: Reset your QAcademy password
4. Set body to:
```html
<h2>Reset your QAcademy password</h2>
<p>Hi there,</p>
<p>We received a request to reset your QAcademy Nurses Hub password.</p>
<p>Click the button below to set a new password:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
<p>If you did not request a password reset, ignore this email.</p>
<p>— The QAcademy Team</p>
```
5. Click Save

### Email Sender Name
- Built-in Supabase SMTP is used for dev
- For production: set up custom SMTP under Project Settings → Authentication
- Change sender name to: QAcademy Nurses Hub

---

## Step 5 — Create Database Tables

Go to Supabase → SQL Editor → New Query.
Run each block below in order.

### programs
```sql
CREATE TABLE programs (
  program_id TEXT PRIMARY KEY,
  program_name TEXT NOT NULL
);

INSERT INTO programs (program_id, program_name) VALUES
  ('RN', 'Registered Nursing'),
  ('RM', 'Registered Midwifery'),
  ('RPHN', 'Registered Public Health Nursing'),
  ('RMHN', 'Registered Mental Health Nursing'),
  ('NACNAP', 'NACNAP');
```

### courses
```sql
CREATE TABLE courses (
  course_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  program_scope TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  page_slug TEXT,
  sheet_id TEXT
);

INSERT INTO courses (course_id, title, program_scope, status) VALUES
  ('GP', 'General Paper', ARRAY['RN','RM','RPHN','RMHN','NACNAP'], 'active'),
  ('RN_MED', 'Medicine & Medical Nursing', ARRAY['RN'], 'active'),
  ('RN_SURG', 'Surgery & Surgical Nursing', ARRAY['RN'], 'active'),
  ('RM_PED_OBS_HRN', 'Paediatric, Obstetric Anatomy, & High-Risk Neonates', ARRAY['RM'], 'active'),
  ('RM_MID', 'Midwifery', ARRAY['RM'], 'active'),
  ('RPHN_PPHN', 'Principles of Public Health Nursing', ARRAY['RPHN'], 'active'),
  ('RPHN_DISEASE_CTRL', 'Principles of Disease Management & Control', ARRAY['RPHN'], 'active'),
  ('RMHN_PSYCH_NURS', 'Principles & Practice of Psychiatric Nursing', ARRAY['RMHN'], 'active'),
  ('RMHN_PSYCH_PPHARM', 'Psychiatry, Psychopathology & Psychopharmacology', ARRAY['RMHN'], 'active'),
  ('NAC_BASIC_CLIN', 'Basic Clinical Nursing', ARRAY['NACNAP'], 'active'),
  ('NAC_BASIC_PREV', 'Basic Preventive Nursing', ARRAY['NACNAP'], 'active');
```

### levels
```sql
CREATE TABLE levels (
  level_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO levels (level_id, label) VALUES
  ('L100', 'Level 100'),
  ('L200', 'Level 200'),
  ('L300', 'Level 300'),
  ('L400', 'Level 400');
```

### users
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  auth_id UUID UNIQUE,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  name TEXT,
  forename TEXT,
  surname TEXT,
  program_id TEXT REFERENCES programs(program_id),
  cohort TEXT,
  level TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  signup_source TEXT DEFAULT 'SUPABASE_AUTH',
  created_utc TIMESTAMPTZ DEFAULT NOW(),
  last_login_utc TIMESTAMPTZ
);
```

### products
```sql
CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'PAID',
  status TEXT NOT NULL DEFAULT 'active',
  courses_included TEXT[] NOT NULL,
  price_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  duration_days INTEGER NOT NULL,
  telegram_group_keys TEXT[]
);

INSERT INTO products (product_id, name, courses_included, duration_days, status, kind, price_minor, currency, telegram_group_keys) VALUES
  ('RN_TRIAL', 'Registered Nursing Trial', ARRAY['GP','RN_MED','RN_SURG'], 7, 'active', 'TRIAL', 0, 'GHS', NULL),
  ('RM_TRIAL', 'Registered Midwifery Trial', ARRAY['GP','RM_PED_OBS_HRN','RM_MID'], 7, 'active', 'TRIAL', 0, 'GHS', NULL),
  ('RPHN_TRIAL', 'Registered Public Health Nursing Trial', ARRAY['GP','RPHN_PPHN','RPHN_DISEASE_CTRL'], 7, 'active', 'TRIAL', 0, 'GHS', NULL),
  ('RMHN_TRIAL', 'Registered Mental Health Nursing Trial', ARRAY['GP','RMHN_PSYCH_NURS','RMHN_PSYCH_PPHARM'], 7, 'active', 'TRIAL', 0, 'GHS', NULL),
  ('NACNAP_TRIAL', 'NACNAP Trial', ARRAY['GP','NAC_BASIC_CLIN','NAC_BASIC_PREV'], 7, 'active', 'TRIAL', 0, 'GHS', NULL),
  ('RN_FULL', 'Registered Nursing Full Access', ARRAY['GP','RN_MED','RN_SURG'], 365, 'active', 'PAID', 15000, 'GHS', NULL),
  ('RM_FULL', 'Registered Midwife Full Access', ARRAY['GP','RM_PED_OBS_HRN','RM_MID'], 365, 'active', 'PAID', 15000, 'GHS', NULL),
  ('RPHN_FULL', 'Registered Public Health Nursing Full Access', ARRAY['GP','RPHN_PPHN','RPHN_DISEASE_CTRL'], 365, 'active', 'PAID', 15000, 'GHS', NULL),
  ('RMHN_FULL', 'Registered Mental Health Nursing Full Access', ARRAY['GP','RMHN_PSYCH_NURS','RMHN_PSYCH_PPHARM'], 365, 'active', 'PAID', 15000, 'GHS', NULL),
  ('NACNAP_FULL', 'Nursing Assistant, Preventive/Clinical Full Access', ARRAY['GP','NAC_BASIC_CLIN','NAC_BASIC_PREV'], 365, 'active', 'PAID', 15000, 'GHS', NULL),
  ('GP_ONLY', 'General Paper Standalone Access', ARRAY['GP'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RN_MED_ONLY', 'Medicine & Medical Nursing Standalone Access', ARRAY['RN_MED'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RN_SURG_ONLY', 'Surgery & Surgical Nursing Standalone Access', ARRAY['RN_SURG'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RM_PED_OBS_HRN_ONLY', 'Paediatric, Obstetric Anatomy, & High-Risk Neonates Standalone Access', ARRAY['RM_PED_OBS_HRN'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RM_MID_ONLY', 'Midwifery Standalone Access', ARRAY['RM_MID'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RPHN_PPHN_ONLY', 'Principles of Public Health Nursing Standalone Access', ARRAY['RPHN_PPHN'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RPHN_DISEASE_CTRL_ONLY', 'Principles of Disease Management & Control Standalone Access', ARRAY['RPHN_DISEASE_CTRL'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RMHN_PSYCH_NURS_ONLY', 'Principles & Practice of Psychiatric Nursing Standalone Access', ARRAY['RMHN_PSYCH_NURS'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RMHN_PSYCH_PPHARM_ONLY', 'Psychiatry, Psychopathology & Psychopharmacology Standalone Access', ARRAY['RMHN_PSYCH_PPHARM'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('NAC_BASIC_CLIN_ONLY', 'Basic Clinical Nursing Standalone Access', ARRAY['NAC_BASIC_CLIN'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('NAC_BASIC_PREV_ONLY', 'Basic Preventive Nursing Standalone Access', ARRAY['NAC_BASIC_PREV'], 365, 'active', 'PAID', 5900, 'GHS', NULL),
  ('RN_FULL_FREE', 'Registered Nursing Free Full Access', ARRAY['GP','RN_MED','RN_SURG'], 30, 'active', 'FREE', 0, 'GHS', NULL),
  ('RM_FULL_FREE', 'Registered Midwife Free Full Access', ARRAY['GP','RM_PED_OBS_HRN','RM_MID'], 30, 'active', 'FREE', 0, 'GHS', NULL),
  ('RPHN_FULL_FREE', 'Registered Public Health Nursing Free Full Access', ARRAY['GP','RPHN_PPHN','RPHN_DISEASE_CTRL'], 30, 'active', 'FREE', 0, 'GHS', NULL),
  ('RMHN_FULL_FREE', 'Registered Mental Health Nursing Free Full Access', ARRAY['GP','RMHN_PSYCH_NURS','RMHN_PSYCH_PPHARM'], 30, 'active', 'FREE', 0, 'GHS', NULL),
  ('NACNAP_FULL_FREE', 'Nursing Assistant, Preventive/Clinical Free Full Access', ARRAY['GP','NAC_BASIC_CLIN','NAC_BASIC_PREV'], 30, 'active', 'FREE', 0, 'GHS', NULL),
  ('RN_2026_PREP', 'Registered Nursing 2026 Premium Prep', ARRAY['GP','RN_MED','RN_SURG'], 240, 'active', 'PAID', 7900, 'GHS', ARRAY['PREMIUM_2026','RN_2026']),
  ('RM_2026_PREP', 'Registered Midwife 2026 Premium Prep', ARRAY['GP','RM_PED_OBS_HRN','RM_MID'], 240, 'active', 'PAID', 7900, 'GHS', ARRAY['PREMIUM_2026','RM_2026']),
  ('RPHN_2026_PREP', 'Registered Public Health Nursing 2026 Premium Prep', ARRAY['GP','RPHN_PPHN','RPHN_DISEASE_CTRL'], 240, 'active', 'PAID', 7900, 'GHS', ARRAY['PREMIUM_2026','RPHN_2026']),
  ('RMHN_2026_PREP', 'Registered Mental Health Nursing 2026 Premium Prep', ARRAY['GP','RMHN_PSYCH_NURS','RMHN_PSYCH_PPHARM'], 240, 'active', 'PAID', 7900, 'GHS', ARRAY['PREMIUM_2026','RMHN_2026']),
  ('NACNAP_2026_PREP', 'Nursing Assistant, Preventive/Clinical 2026 Premium Prep', ARRAY['GP','NAC_BASIC_CLIN','NAC_BASIC_PREV'], 240, 'active', 'PAID', 7900, 'GHS', ARRAY['PREMIUM_2026','NACNAP_2026']);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(product_id),
  start_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_utc TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expiry_reminded BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'PAYMENT',
  source_ref TEXT
);
```

### announcements
```sql
CREATE TABLE announcements (
  announcement_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  scope_programs TEXT[],
  scope_courses TEXT[],
  scope_level TEXT,
  scope_subscription_kind TEXT,
  scope_product_ids TEXT[],
  scope_audience TEXT DEFAULT 'ALL',
  scope_cohort TEXT,
  scope_user_ids TEXT[]
);
```

### user_notice_state
```sql
CREATE TABLE user_notice_state (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
  item_id TEXT NOT NULL,
  state TEXT NOT NULL,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Step 6 — Enable RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notice_state ENABLE ROW LEVEL SECURITY;

-- Dev only: allow everything
-- Replace with proper policies before going live
CREATE POLICY "dev_allow_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON levels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON user_notice_state FOR ALL USING (true) WITH CHECK (true);

-- Allow unauthenticated read on programs (needed for register page dropdown)
CREATE POLICY "public_read_programs" ON programs FOR SELECT USING (true);
```

---

## Step 7 — Add Images Folder
1. Go to your GitHub repo
2. Click "Add file" → "Upload files"
3. Create `/images/` folder and upload your logo as `QAcademy_Logo.png`
4. Reference images in code as `/images/filename.png`

---

## Step 8 — Brand Colours
The platform uses Navy + Teal. These are set in `css/style.css` `:root`:
- `--primary: #1e3a5f`
- `--primary-dark: #142d4c`
- `--primary-light: #edf6f5`
- `--accent: #2d7d72`
To rebrand in future — change only these 4 lines.

---

## Step 9 — Create Core JS Files

### js/config.js
```javascript
const SUPABASE_URL = 'https://zrakjibtxyzoqcdtvpmq.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### js/guard.js
- Checks session on every protected page
- Redirects to /login.html if no session
- Checks role and redirects to correct dashboard
- Provides `logout()` function
- Uses `db` not `supabase`

### js/api.js
Shared data access layer. All Supabase read queries live here.
Key functions:
- `getPrograms()` — all programmes
- `getProducts()` — active products only (student-facing)
- `getAllProducts()` — all products including archived (admin only)
- `getCourses()` — active courses only (student-facing)
- `getAllCourses()` — all courses including archived (admin only)
- `getUsers()` — filtered user list
- `getUserById()` — full user + subscription history
- `assignSubscription()` — grants a subscription, auto-calculates expiry, sets correct status based on product kind
- `deactivateUser()` / `activateUser()`
- `sendPasswordReset()`
- `updateUserProfile()`
- `getAnnouncements()` — active in-schedule announcements
- `getDismissedAnnouncements()` — dismissed IDs per user
- `getStudentCourseAccess()` — stacked course expiry map
- `getCourseById(courseId)` — single course by ID, uses .maybeSingle()
- `getCourses()` — active courses only, ordered by title
- `getStudentCourseAccess(userId)` — stacked course expiry map from active subscriptions

**Rule:** Shared reads go in api.js. Write operations stay in the page.

### Shared Sidebar Architecture

Both admin and student pages use shared sidebar JS files.

- js/admin-sidebar.js — injected into all admin pages
- js/student-sidebar.js — injected into all student pages

To use on any page:

1. Add `<div id="sidebar"></div>` where sidebar should appear
2. Load the script after guard.js: `<script src="/js/admin-sidebar.js"></script>`
   or: `<script src="/js/student-sidebar.js"></script>`

Active link is auto-detected by comparing href to window.location.pathname. No need to manually set class="active" on any page.

Student sidebar — My Courses dropdown:
- Auto-populates with enrolled courses only
- Call `populateCourseDropdown(courseAccessMap, allCourses)` after auth completes
- `courseAccessMap` comes from `getStudentCourseAccess(userId)`
- `allCourses` comes from `getCourses()`
- Dropdown auto-opens when student is on a course page (/student/course)

Course context passing:
- Sidebar links include `?course=COURSE_ID` when on a course page
- Destination pages (fixed-quizzes, learning-history, quiz-builder) read `?course=` and pre-filter
- Filter chip with ✕ shown when `?course=` is active

### css/style.css
- Shared styles for all pages
- Inter font from Google Fonts
- CSS variables for colours and spacing
- Styles for auth pages, dashboard, cards, forms, buttons, alerts

---

## Step 10 — Create Pages

### Auth Pages
| File | Purpose |
|---|---|
| login.html | Email/password login + role redirect |
| register.html | New account + auto programme dropdown + auto trial assignment |
| forgot-password.html | Send reset email |
| reset-password.html | Set new password from reset link |

### Student Pages
| File | Purpose |
|---|---|
| student/dashboard.html | Courses, subscription bar, announcements strip, quick links, recent attempts |
| student/announcements.html | 4 tabs (All/Unread/Read/Dismissed), Mark as Read, Dismiss, CTA tracking |
| student/course.html | Dynamic course page — reads ?id= from URL, access check, course header, fixed quizzes shell, quiz builder shell, course-scoped announcements |
| student/fixed-quizzes.html | Accordion layout per enrolled course, ?course= filter, shell — wired for quiz engine |
| student/learning-history.html | Full attempt history table, course + status filters, ?course= filter, resume/review links — wired for quiz engine |

### Admin Pages
| File | Purpose |
|---|---|
| admin/dashboard.html | Stats, recent users, quick links |
| admin/users.html | Full user management — search, filters, side panel, assign subscription, password reset, activate/deactivate |
| admin/subscriptions.html | Full CRUD — grant, edit, cancel. Visual grouping by student. 7 stat cards. 6 filters including Kind (Paid/Trial/Free) separate from Status |
| admin/products.html | Full CRUD — create/edit products, course picker grouped by programme, Telegram group key tag input, archive/restore |
| admin/courses.html | Combined page — two tabs: Programmes tab + Courses tab. Full CRUD for both. Courses show programme scope as checkboxes (a course can belong to multiple programmes) |
| admin/payments.html | Shell — to be built in payments phase |
| admin/announcements.html | To be built next session |
| admin/fixed-quizzes.html | Shell — to be built in quiz engine phase |
| admin/config.html | Shell — to be built later |

---
| admin/announcements.html | Full CRUD — create/edit/archive announcements, all 8 scope fields, live audience summary, engagement counts, duplicate title protection, character count, draft/archived status warning |
| student/announcements.html | Student view — 4 tabs (All/Unread/Read/Dismissed), Mark as Read, Dismiss (permanent, moves to Dismissed tab), CTA button/link click tracking |
| student/dashboard.html | Always-visible announcements block, max 2 unread, collapsed by default (pinned auto-expands), full HTML body render, ✕ marks as Read not Dismissed, two empty states |

### Announcement ID generation
announcement_id is TEXT PRIMARY KEY — Supabase does not auto-generate it.
Must be supplied on insert as: 'ANN_' + Date.now()
Example: ANN_1710432000000

### Announcement scopes — AND logic
All scope fields work as intersection (AND).
A student must match every condition set to see the announcement.
Leave all scopes blank = shown to everyone.
### Student announcements page — 4 tabs
- All — shows everything except dismissed
- Unread — no interaction yet
- Read — marked as read or cleared from dashboard strip
- Dismissed — permanently dismissed from announcements page
Expired announcements (past end_at date) disappear from all tabs automatically.

### Announcement button styling
Buttons in announcement bodies use data-qa="btn" attribute — NOT inline styles.
The CSS on each page handles button appearance automatically.
Example: <a href="https://..." data-qa="btn">Start Exam</a>
Never use inline style="background:..." for announcement buttons.

### Body text formatting
Admin types plain text in the body textarea.
newlinesToParagraphs() converts newlines to <p> and <br> tags before saving.
This runs in both refreshPreview() and saveAnnouncement() in admin/announcements.html.
Single Enter = <br> within same paragraph.
Double Enter = new <p> paragraph.
Lines starting with HTML tags are not wrapped in <p> to avoid double-wrapping buttons/links.
### user_notice_state unique constraint
Required for upsert to work correctly on dismiss/read/clicked actions.
Run once in Supabase SQL editor:
ALTER TABLE user_notice_state
ADD CONSTRAINT unique_user_notice UNIQUE (user_id, item_type, item_id);

### Dashboard announcements block rules
- Block is ALWAYS visible — never disappears even when empty
- Two empty states:
  - "Nothing from us yet — check back soon" = no announcements exist at all
  - "You're all caught up! 🎉" = announcements exist but student has seen/cleared them all
- Shows max 2 unread announcements (pinned first, then by priority)
- Cards are collapsed by default — click header to expand/collapse
- Pinned announcements auto-expand on load
- Full body HTML renders inside expanded card including links and buttons
- ✕ button marks announcement as Read (not Dismissed) — clears from strip, visible on Read tab
- Dismiss is only available on the announcements page — moves to Dismissed tab permanently
- "View all announcements →" footer always shown
- Shows unread count in footer if more than 2 unread

### Cohort targeting query
Cohort values are fetched with a lean single-column query — NOT getUsers().
This avoids loading all user data just to populate a dropdown.
Query: SELECT cohort FROM users WHERE cohort IS NOT NULL
Deduplication done client-side with Set.
## Step 11 — Create First Admin Account

1. Register a new account via /register.html
2. Go to Supabase Table Editor → users table
3. Find the new user row
4. Change role from STUDENT to ADMIN
5. Save

---

## Key Design Decisions

### Trial is a product Kind, not a subscription status
- `products.kind` = PAID | TRIAL | FREE
- `subscriptions.status` = ACTIVE | EXPIRED | CANCELLED
- Never put TRIAL in the status filter — use a separate Kind filter

### Stacked Subscription Logic
Course access is calculated by summing remaining days across all active
subscriptions covering each course. This means a student who buys a second
subscription before the first expires gets the days added together.
The top bar shows the longest expiry across all courses.
Each course card shows its own specific stacked expiry.

### Programme Scope on Courses
`program_scope` is a TEXT[] array. A course can belong to multiple
programmes (e.g. General Paper belongs to all 5 programmes).
This is not a hard tie — it is just a label for filtering and display.
A course can also have an empty scope if it is truly independent.

### Auto-assign Trial on Registration
When a student registers, the system reads their `program_id` and
auto-assigns the matching programme trial product:
- RN → RN_TRIAL
- RM → RM_TRIAL
- RPHN → RPHN_TRIAL
- RMHN → RMHN_TRIAL
- NACNAP → NACNAP_TRIAL

### Product ID and Course ID are immutable
Cannot be changed after creation. They are used as foreign keys
throughout the system. Archive instead of delete.

---

## Known Issues & Fixes

### Issue: programmes not loading on register page
**Cause:** Supabase JS library uses `supabase` as global variable name.
config.js was also trying to create `const supabase` — name clash.
**Fix:** Use `const db = supabase.createClient(...)` in config.js.
Use `db` everywhere in all JS files.

### Issue: 406 error on subscriptions query
**Cause:** `.single()` throws 406 when no rows found.
**Fix:** Use `.maybeSingle()` instead of `.single()` when result might be empty.

### Issue: course counts show 0 on programmes tab
**Cause:** `loadPrograms()` and `loadCourses()` ran in parallel — courses
not ready when programmes rendered.
**Fix:** `await loadCourses()` first, then `await loadPrograms()`.

### Issue: Telegram group keys not saving on products page
**Cause:** Tag input only captures keys on Enter keypress. Typing a key
and clicking Save without pressing Enter loses the value.
**Fix:** In `submitProduct()`, check for any pending text in the tag input
before building the payload and add it to the tgKeys array automatically.

### Issue: variable name collision on products table render
**Cause:** Local variable `tgKeys` in renderTable() clashed with global
`tgKeys` array used by the tag input.
**Fix:** Renamed local render variables to `tgTagsHtml` and `tgGroupsHtml`.

### Issue: Trial subscription writing 'false' to status column
**Cause:** register.html was calling assignSubscription() which had
`status: product.kind === 'TRIAL' ? 'TRIAL' : 'ACTIVE'` — writing the
string 'TRIAL' which Supabase coerced to 'false' in some contexts.
**Fix:** Registration now does its own direct insert with `status: 'ACTIVE'`
and `source: 'SELF_TRIAL_SIGNUP'`. Never use assignSubscription() for
registration trial assignment.

### Issue: All students seeing all announcements regardless of scope
**Cause:** getAnnouncements() in api.js fetches all active announcements
without any scope filtering. Scope fields were saved to DB but never checked.
**Fix:** Added filterAnnouncementsForStudent(announcements, profile, subscriptionKind)
to api.js. Called on both student/dashboard.html and student/announcements.html
after fetching announcements. Requires student's active subscription kind and
product_id to be fetched separately before filtering.

### Issue: Announcement body text rendering as one continuous line
**Cause:** HTML ignores newline characters (\n) from textarea input.
**Fix:** Added newlinesToParagraphs() function in admin/announcements.html.
Called in both refreshPreview() and saveAnnouncement() before sanitiseHtml().

### Issue: trial_product_id hardcoded in register.html
**Cause:** TRIAL_PRODUCTS map was hardcoded in register.html — adding a new
programme required a code change.
**Fix:** Added trial_product_id column to programs table. register.html reads
it from the selected option's data-trial attribute set during loadPrograms().
SQL to add column:
ALTER TABLE programs ADD COLUMN trial_product_id TEXT REFERENCES products(product_id);
UPDATE programs SET trial_product_id = 'RN_TRIAL'     WHERE program_id = 'RN';
UPDATE programs SET trial_product_id = 'RM_TRIAL'     WHERE program_id = 'RM';
UPDATE programs SET trial_product_id = 'RPHN_TRIAL'   WHERE program_id = 'RPHN';
UPDATE programs SET trial_product_id = 'RMHN_TRIAL'   WHERE program_id = 'RMHN';
UPDATE programs SET trial_product_id = 'NACNAP_TRIAL' WHERE program_id = 'NACNAP';
---

## Before Going Live Checklist
- [ ] Replace dev_allow_all RLS policies with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Set up Paystack webhook
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if it was ever committed publicly

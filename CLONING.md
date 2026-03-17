# QAcademy Nurses Hub — CLONING NOTES
*Last updated: March 2026*

This document is the technical rebuild guide. If you are starting fresh from the repo, follow this end-to-end to recreate the full environment.

---

## 1. Stack Overview
- **Frontend:** Vanilla HTML / CSS / JS — no build step, no framework
- **Hosting:** Cloudflare Pages (connected to GitHub — auto-deploys on push to `main`)
- **Database & Auth:** Supabase
- **Version Control:** GitHub (`mybackpacc-byte/qacademy-gamma`)
- **Payments:** Paystack (planned — Cloudflare Worker, not yet built)
- **Telegram:** Planned, not yet built

---

## 2. Environment Setup

### Supabase
1. Create a new Supabase project
2. Copy the Project URL and anon key
3. Paste both into `js/config.js`:
```js
const db = supabase.createClient('YOUR_PROJECT_URL', 'YOUR_ANON_KEY');
```

> ⚠️ The Supabase JS CDN uses `supabase` as its global variable name. That is why we use `const db = supabase.createClient(...)`. All JS files reference `db`, never `supabase`.

### Cloudflare Pages
1. Connect GitHub repo to Cloudflare Pages
2. No build command needed — set root directory as `/`
3. Set output directory to `/` (static site)

### GitHub
- Repo: `mybackpacc-byte/qacademy-gamma`
- Push to `main` triggers auto-deploy on Cloudflare Pages

---

## 3. Database Setup — Run in Supabase SQL Editor

### 3.1 Core Tables

#### programs
```sql
CREATE TABLE programs (
  program_id       TEXT PRIMARY KEY,
  program_name     TEXT NOT NULL,
  trial_product_id TEXT
);
```

#### courses
```sql
CREATE TABLE courses (
  course_id     TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  program_scope TEXT[],
  status        TEXT NOT NULL DEFAULT 'active',
  sort_order    INTEGER DEFAULT 0
);
-- status values: active | draft | archived
-- program_scope: array of program_ids this course belongs to e.g. '{"RN","RM"}'
```

#### products
```sql
CREATE TABLE products (
  product_id       TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'PAID',
  price            NUMERIC,
  duration_days    INTEGER,
  course_ids       TEXT[],
  telegram_keys    TEXT[],
  status           TEXT NOT NULL DEFAULT 'active',
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
-- kind values: PAID | TRIAL | FREE
-- status values: active | archived
```

#### users
```sql
CREATE TABLE users (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id),
  email        TEXT,
  forename     TEXT,
  surname      TEXT,
  program_id   TEXT REFERENCES programs(program_id),
  level        TEXT,
  cohort       TEXT,
  role         TEXT NOT NULL DEFAULT 'STUDENT',
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- role values: STUDENT | ADMIN | TEACHER
-- status values: active | inactive
```

#### subscriptions
```sql
CREATE TABLE subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id         UUID REFERENCES users(user_id),
  product_id      TEXT REFERENCES products(product_id),
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  source          TEXT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- status values: ACTIVE | EXPIRED | CANCELLED
-- source values: SELF_TRIAL_SIGNUP | MANUAL | PAYSTACK (planned)
```

#### announcements
```sql
CREATE TABLE announcements (
  announcement_id   TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  cta_label         TEXT,
  cta_url           TEXT,
  priority          INTEGER DEFAULT 0,
  pinned            BOOLEAN DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'active',
  scope_audience    TEXT DEFAULT 'ALL',
  scope_programme   TEXT[],
  scope_course      TEXT[],
  scope_level       TEXT[],
  scope_sub_kind    TEXT[],
  scope_product     TEXT[],
  scope_cohort      TEXT[],
  scope_user_ids    TEXT[],
  publish_at        TIMESTAMPTZ,
  unpublish_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- announcement_id generated as: 'ANN_' + Date.now() (TEXT PRIMARY KEY — supply manually)
-- scope_audience values: ALL | PAID | TRIAL | FREE
```

#### user_notice_state
```sql
CREATE TABLE user_notice_state (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(user_id),
  item_type   TEXT NOT NULL DEFAULT 'announcement',
  item_id     TEXT NOT NULL,
  state       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- state values: read | clicked | dismissed
ALTER TABLE user_notice_state
  ADD CONSTRAINT unique_user_notice UNIQUE (user_id, item_type, item_id);
```

#### config
```sql
CREATE TABLE config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config (key, value, description) VALUES
  ('runner_questions_per_page', '1', 'Number of questions shown per page in both runners'),
  ('builder_max_questions', '50', 'Maximum questions a student can request in the quiz builder'),
  ('runner_autosave_interval_sec', '60', 'How often runners autosave in-progress attempts in seconds');
```

---

### 3.2 Quiz Engine Tables

#### quizzes
```sql
CREATE TABLE quizzes (
  quiz_id        TEXT PRIMARY KEY,
  course_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  n              INTEGER NOT NULL,
  item_ids       TEXT[] NOT NULL DEFAULT '{}',
  allowed_modes  TEXT NOT NULL DEFAULT 'BOTH',
  shuffle        BOOLEAN NOT NULL DEFAULT false,
  time_limit_sec INTEGER,
  status         TEXT NOT NULL DEFAULT 'draft',
  published      BOOLEAN NOT NULL DEFAULT false,
  visibility     TEXT NOT NULL DEFAULT 'ALL',
  publish_at     TIMESTAMPTZ,
  unpublish_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
-- allowed_modes values: BOTH | INSTANT_ONLY | TIMED_ONLY
-- status values: draft | active | archived
-- visibility values: ALL | PAID | TRIAL
-- shuffle: true = randomise question order at spawn
-- time_limit_sec: null = n × 60 seconds

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_allow_all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
```

#### attempts
```sql
CREATE TABLE attempts (
  attempt_id        TEXT PRIMARY KEY,
  user_id           UUID REFERENCES users(user_id),
  quiz_id           TEXT,
  course_id         TEXT NOT NULL,
  mode              TEXT NOT NULL,
  source            TEXT NOT NULL,
  n                 INTEGER,
  seed              TEXT,
  item_ids          TEXT,
  status            TEXT NOT NULL DEFAULT 'in_progress',
  score_raw         NUMERIC,
  score_total       NUMERIC,
  score_pct         NUMERIC,
  time_taken_s      NUMERIC,
  duration_min      INTEGER,
  answers_json      TEXT,
  display_label     TEXT,
  origin_attempt_id TEXT,
  ts_iso            TIMESTAMPTZ DEFAULT NOW()
);
-- mode values: instant | timed
-- source values: fixed | builder | retake
-- status values: in_progress | completed | abandoned
-- answers_json: JSON array stored as text
--   MCQ/TF: {item_id, chosen:"C", correct:"C", is_correct:true, flagged:false, time_spent_s:null}
--   SATA:   {item_id, chosen:["A","C"], correct:["A","C"], is_correct:true, flagged:false, time_spent_s:null}

CREATE INDEX ON attempts (user_id);
CREATE INDEX ON attempts (quiz_id);
CREATE INDEX ON attempts (course_id);
CREATE INDEX ON attempts (status);
CREATE INDEX ON attempts (user_id, quiz_id, mode, status);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_allow_all" ON attempts FOR ALL USING (true) WITH CHECK (true);
```

---

### 3.3 Items Tables (one per course)

All 11 course items tables follow this schema. Replace `items_gp` and index prefix with the correct course table name.

Course table names:
- `items_gp`
- `items_rn_med`
- `items_rn_surg`
- `items_rm_ped_obs_hrn`
- `items_rm_mid`
- `items_rphn_pphn`
- `items_rphn_disease_ctrl`
- `items_rmhn_psych_nurs`
- `items_rmhn_psych_ppharm`
- `items_nac_basic_clin`
- `items_nac_basic_prev`

```sql
CREATE TABLE items_gp (
  item_id         TEXT PRIMARY KEY,
  question_type   TEXT NOT NULL DEFAULT 'MCQ',
  stem            TEXT NOT NULL,
  option_a        TEXT,
  fb_a            TEXT,
  option_b        TEXT,
  fb_b            TEXT,
  option_c        TEXT,
  fb_c            TEXT,
  option_d        TEXT,
  fb_d            TEXT,
  option_e        TEXT,
  fb_e            TEXT,
  option_f        TEXT,
  fb_f            TEXT,
  correct         TEXT NOT NULL,
  rationale       TEXT,
  rationale_img   TEXT,
  subject         TEXT,
  maintopic       TEXT,
  subtopic        TEXT,
  difficulty      TEXT,
  marks           NUMERIC NOT NULL DEFAULT 1,
  batch_id        TEXT,
  shuffle_options BOOLEAN NOT NULL DEFAULT true
);
-- question_type: MCQ | TF | SATA
-- correct: single letter for MCQ/TF e.g. "a". Comma-separated for SATA e.g. "a,c,d"
-- rationale_img: URL to image in Supabase Storage (rationale-images bucket)
-- shuffle_options: false = preserve option order (use for TF questions)
-- batch_id: tag for bulk import grouping e.g. SAMPLE_BATCH_001, GP_BATCH_001

CREATE INDEX ON items_gp (maintopic);
CREATE INDEX ON items_gp (subtopic);
CREATE INDEX ON items_gp (subject);
CREATE INDEX ON items_gp (difficulty);
CREATE INDEX ON items_gp (question_type);
CREATE INDEX ON items_gp (batch_id);

ALTER TABLE items_gp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_allow_all" ON items_gp FOR ALL USING (true) WITH CHECK (true);
```

> Repeat this block for each of the 11 courses, substituting the table name and index prefix.

---

### 3.4 RLS
All tables use `dev_allow_all` policies during build. Replace with proper role-based policies before go-live.

```sql
-- Pattern for every table:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_allow_all" ON table_name FOR ALL USING (true) WITH CHECK (true);
```

---

## 4. Auth Setup (Supabase)
- Email/password auth enabled
- Email confirmation: OFF during build (turn ON before go-live)
- Password reset emails: enabled
- After a user registers via Supabase Auth, a trigger or the register page inserts a row into the `users` table with `role = 'STUDENT'`
- Trial subscription is auto-assigned on registration based on `program_id` → matching trial product

---

## 5. Key Design Decisions

### Stacked Subscription Access
For each course, sum remaining days across all active subscriptions covering that course. Display expiry as today plus that total. The top bar shows the longest expiry across all courses. Each course card shows its own specific stacked expiry. Admin views retain raw per-subscription data for full transaction transparency.

### Trial is a Product Kind
`kind` on the `products` table is `PAID | TRIAL | FREE`. Trial is not a subscription status — status is always `ACTIVE | EXPIRED | CANCELLED`. Do not write `TRIAL` to the status column.

### Announcement Scope Filtering
Scope filtering uses AND logic — a student must match every condition set in an announcement's targeting. This is handled client-side by `filterAnnouncementsForStudent()` in `api.js`.

### Interaction States on Announcements
Three states in `user_notice_state`: `read`, `clicked`, `dismissed`. No automatic `seen` state. Students click "Mark as Read" deliberately.

### Quiz Builder — Selection Modes
The builder has two topic selection modes feeding the same pool:
- **Browse by Topic:** maintopic checkboxes → expand to subtopics
- **Concept Search:** keyword search filters the subtopic list live

Both modes draw from `maintopic` and `subtopic` columns in the items table.

### Builder Attempt — No Resume
Builder attempts are always fresh. There is no resume logic for builder attempts — every Build Quiz click creates a new attempt. Old in-progress builder attempts remain in learning history.

### Items Architecture
- One table per course: `items_{course_id}`
- `maintopic` + `subtopic` are clean separate columns (old build used a single `topic` column with colon-separated values like `"Anatomy: Cardiovascular"`)
- `getItemFilterOptions(courseId)` in `api.js` returns distinct maintopics and subtopics ready to use — no parsing needed

---

## 6. Known Issues Log

| Issue | Status |
|---|---|
| Runner issues identified during testing | ✅ Fixed |
| admin/fixed-quizzes.html draft/published state enforcement UI | ⚠️ Pending |
| admin/question-bank.html stub missing from sidebar | ⚠️ Pending |

---

## 7. Supabase Storage (Rationale Images) — TO SET UP
- Create bucket: `rationale-images`
- Set bucket to **public**
- Admin uploads image via question bank page → auto URL saved to `rationale_img`
- URL format: `https://[project].supabase.co/storage/v1/object/public/rationale-images/[filename]`

---

## 8. CSV Import — Real Question Banks
- 616 GP questions are ready to import from `1_General_Paper_items.csv`
- Old CSV has `topic` (colon-separated) — needs splitting into `maintopic` + `subtopic`
- Old CSV has `instant_id` and `timed_id` columns — not needed in new schema, discard
- Old CSV has `rationale_img` as float (0/null) — map to TEXT, set NULL if 0
- All other columns map cleanly to the new schema
- Tag the import batch as `GP_BATCH_001`
- After import, remove SAMPLE_BATCH_001 rows

---

## 9. Before Going Live Checklist
- [ ] Replace dev_allow_all RLS with proper role-based policies
- [ ] Set up custom SMTP for emails
- [ ] Turn on email confirmation in Supabase Auth
- [ ] Set up custom domain on Cloudflare
- [ ] Set up Paystack webhook (Cloudflare Worker — isolated single file)
- [ ] Set up Supabase Storage bucket `rationale-images`
- [ ] Remove test accounts
- [ ] Rotate Supabase anon key if ever committed publicly
- [ ] Remove SAMPLE_BATCH_001 questions and replace with real question banks

---

## 10. Test Accounts
| Role | Email | Notes |
|---|---|---|
| ADMIN | samquatleumas@gmail.com | role=ADMIN in users table |
| STUDENT | Albert Owusu-Ansah | RN / L300 / 2024 cohort / TRIAL |
| STUDENT | Justice Asiamah | RM / L100 / 2023 cohort / TRIAL |

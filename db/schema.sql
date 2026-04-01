-- ============================================================
-- QAcademy Nurses Hub — Full Database Schema
-- Supabase (PostgreSQL)
-- Last updated: April 2026
--
-- HOW TO USE THIS FILE:
--   - This is the single source of truth for all tables.
--   - When adding a new table, add it here first.
--   - Run the relevant CREATE/ALTER in Supabase SQL editor.
--   - All tables use dev_allow_all RLS during build.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. CORE TABLES (MyNMCLicensure)
-- ────────────────────────────────────────────────────────────

-- 1.1 programs
CREATE TABLE programs (
  program_id       TEXT PRIMARY KEY,
  program_name     TEXT NOT NULL,
  trial_product_id TEXT
);

-- 1.2 courses
CREATE TABLE courses (
  course_id     TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  program_scope TEXT[],
  status        TEXT NOT NULL DEFAULT 'active',
  sort_order    INTEGER DEFAULT 0
);
-- status: active | draft | archived

-- 1.3 levels
CREATE TABLE levels (
  level_id   TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 products
CREATE TABLE products (
  product_id    TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'PAID',
  price_minor   INTEGER,
  currency      TEXT NOT NULL DEFAULT 'GHS',
  duration_days INTEGER,
  course_ids    TEXT[],
  telegram_keys TEXT[],
  status        TEXT NOT NULL DEFAULT 'active',
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- kind: PAID | TRIAL | FREE

-- 1.6 users
CREATE TABLE users (
  user_id        UUID PRIMARY KEY,
  auth_id        UUID REFERENCES auth.users(id),
  email          TEXT,
  forename       TEXT,
  surname        TEXT,
  name           TEXT,
  program_id     TEXT REFERENCES programs(program_id),
  level          TEXT,
  cohort         TEXT,
  role           TEXT NOT NULL DEFAULT 'STUDENT',
  active         BOOLEAN NOT NULL DEFAULT true,
  phone_number   TEXT,
  avatar_url     TEXT,
  signup_source  TEXT,
  created_utc    TIMESTAMPTZ DEFAULT NOW()
);
-- role: STUDENT | ADMIN | TEACHER
-- signup_source: REGISTER | PAYSTACK_SETUP

-- 1.7 subscriptions
CREATE TABLE subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id         UUID REFERENCES users(user_id),
  product_id      TEXT REFERENCES products(product_id),
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  source          TEXT,
  source_ref      TEXT,
  start_utc       TIMESTAMPTZ,
  expires_utc     TIMESTAMPTZ,
  expiry_reminded BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- status: ACTIVE | EXPIRED | CANCELLED
-- source: SELF_TRIAL_SIGNUP | ADMIN | PAYSTACK | IMPORT

-- 1.8 payments
CREATE TABLE payments (
  reference              TEXT PRIMARY KEY,
  status                 TEXT NOT NULL DEFAULT 'INIT',
  email                  TEXT,
  user_id                UUID,
  product_id             TEXT,
  product_name           TEXT,
  amount_minor_expected  INTEGER,
  amount_minor_paid      INTEGER,
  currency               TEXT,
  paid_utc               TIMESTAMPTZ,
  activated_utc          TIMESTAMPTZ,
  subscription_id        TEXT,
  failure_note           TEXT,
  raw                    JSONB,
  setup_token            TEXT,
  setup_created_utc      TIMESTAMPTZ,
  setup_completed_utc    TIMESTAMPTZ,
  program_id             TEXT,
  phone_number           TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
-- status: INIT | PAID | ACTIVATED | SETUP_REQUIRED | FAILED

-- 1.9 announcements
CREATE TABLE announcements (
  announcement_id TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  cta_label       TEXT,
  cta_url         TEXT,
  priority        INTEGER DEFAULT 0,
  pinned          BOOLEAN DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  scope_audience  TEXT DEFAULT 'ALL',
  scope_programme TEXT[],
  scope_course    TEXT[],
  scope_level     TEXT[],
  scope_sub_kind  TEXT[],
  scope_product   TEXT[],
  scope_cohort    TEXT[],
  scope_user_ids  TEXT[],
  publish_at      TIMESTAMPTZ,
  unpublish_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- announcement_id: 'ANN_' + Date.now()

-- 1.10 user_notice_state
CREATE TABLE user_notice_state (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(user_id),
  item_type  TEXT NOT NULL DEFAULT 'announcement',
  item_id    TEXT NOT NULL,
  state      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_notice UNIQUE (user_id, item_type, item_id)
);
-- state: read | clicked | dismissed

-- 1.11 config
CREATE TABLE config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config (key, value, description) VALUES
  ('runner_questions_per_page',   '2',  'Questions per page in both runners'),
  ('runner_autosave_interval_sec','60', 'Autosave frequency in runners (seconds)'),
  ('builder_max_questions',       '50', 'Max questions student can request in builder'),
  ('builder_default_questions',   '20', 'Default question count in builder'),
  ('builder_minutes_per_question','1',  'Time estimate per question in builder');


-- ────────────────────────────────────────────────────────────
-- 2. QUIZ ENGINE TABLES (MyNMCLicensure)
-- ────────────────────────────────────────────────────────────

-- 2.1 quizzes (fixed quizzes)
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
-- allowed_modes: BOTH | INSTANT_ONLY | TIMED_ONLY
-- status: draft | active | archived
-- visibility: ALL | PAID | TRIAL

-- 2.2 mock_quizzes
CREATE TABLE mock_quizzes (
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

-- 2.3 attempts
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
-- mode: instant | timed
-- source: fixed | builder | retake | mock
-- status: in_progress | completed | abandoned

CREATE INDEX ON attempts (user_id);
CREATE INDEX ON attempts (quiz_id);
CREATE INDEX ON attempts (course_id);
CREATE INDEX ON attempts (status);
CREATE INDEX ON attempts (user_id, quiz_id, mode, status);


-- ────────────────────────────────────────────────────────────
-- 3. ITEMS TABLES (one per course — MyNMCLicensure)
-- ────────────────────────────────────────────────────────────
-- All 11 tables follow this schema. Replace items_gp with:
--   items_gp, items_rn_med, items_rn_surg,
--   items_rm_ped_obs_hrn, items_rm_mid,
--   items_rphn_pphn, items_rphn_disease_ctrl,
--   items_rmhn_psych_nurs, items_rmhn_psych_ppharm,
--   items_nac_basic_clin, items_nac_basic_prev

CREATE TABLE items_gp (
  item_id         TEXT PRIMARY KEY,
  question_type   TEXT NOT NULL DEFAULT 'MCQ',
  stem            TEXT NOT NULL,
  option_a        TEXT, fb_a TEXT,
  option_b        TEXT, fb_b TEXT,
  option_c        TEXT, fb_c TEXT,
  option_d        TEXT, fb_d TEXT,
  option_e        TEXT, fb_e TEXT,
  option_f        TEXT, fb_f TEXT,
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
-- correct: single letter for MCQ/TF e.g. "b", comma-separated for SATA e.g. "a,c,e"
-- rationale_img: public URL from Supabase Storage rationale-images bucket
-- shuffle_options: false for TF questions

CREATE INDEX ON items_gp (maintopic);
CREATE INDEX ON items_gp (subtopic);
CREATE INDEX ON items_gp (subject);
CREATE INDEX ON items_gp (difficulty);
CREATE INDEX ON items_gp (question_type);
CREATE INDEX ON items_gp (batch_id);

-- 3.2 offline_packs
CREATE TABLE offline_packs (
  pack_id        TEXT NOT NULL PRIMARY KEY,
  user_id        TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  pack_name      TEXT NOT NULL,
  selection_mode TEXT NOT NULL DEFAULT 'topics',
  maintopics     TEXT[] NOT NULL DEFAULT '{}',
  subtopics      TEXT[] NOT NULL DEFAULT '{}',
  difficulties   TEXT[] NOT NULL DEFAULT '{}',
  question_types TEXT[] NOT NULL DEFAULT '{}',
  concept_query  TEXT,
  display_label  TEXT,
  item_ids       TEXT[] NOT NULL,
  question_count INTEGER NOT NULL,
  watermark      JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'active',
  created_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- selection_mode: topics | concepts


-- ────────────────────────────────────────────────────────────
-- 4. MESSAGING TABLES
-- ────────────────────────────────────────────────────────────

-- 4.1 messages_threads
CREATE TABLE messages_threads (
  thread_id        TEXT PRIMARY KEY,
  user_id          UUID REFERENCES users(user_id),
  admin_id         TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  context_type     TEXT NOT NULL DEFAULT 'general',
  subject          TEXT,
  course_id        TEXT,
  quiz_id          TEXT,
  question_id      TEXT,
  attempt_id       TEXT,
  bulk_batch_id    TEXT,
  ref_text         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  last_sender_role TEXT
);
-- thread_id: 'THR_' + Date.now() + random
-- context_type: general | course | question
-- status: open | closed
-- ref_text: human-readable question reference for question context threads

-- 4.2 messages
CREATE TABLE messages (
  message_id   TEXT PRIMARY KEY,
  thread_id    TEXT REFERENCES messages_threads(thread_id),
  sender_id    TEXT NOT NULL,
  sender_role  TEXT NOT NULL,
  body_text    TEXT NOT NULL,
  read_by_user  BOOLEAN DEFAULT false,
  read_by_admin BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- message_id: 'MSG_' + Date.now() + random
-- sender_role: student | admin


-- ────────────────────────────────────────────────────────────
-- 5. TEACHER ASSESS TABLES (MyTeacher)
-- ────────────────────────────────────────────────────────────

-- 5.1 teacher_profiles
CREATE TABLE teacher_profiles (
  teacher_id       TEXT NOT NULL PRIMARY KEY REFERENCES users(user_id),
  display_name     TEXT,
  email            TEXT,
  phone_number     TEXT,
  organisation     TEXT,
  org_logo_url     TEXT,
  role_requested   TEXT DEFAULT 'TEACHER',
  plan_type        TEXT NOT NULL DEFAULT 'FREE',
  active           BOOLEAN NOT NULL DEFAULT false,
  request_status   TEXT NOT NULL DEFAULT 'PENDING',
  request_note     TEXT,
  request_count    INTEGER NOT NULL DEFAULT 0,
  requested_at     TIMESTAMPTZ,
  last_request_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
-- request_status: PENDING | APPROVED | REJECTED
-- plan_type: FREE | PRO

-- 5.2 teacher_classes
CREATE TABLE teacher_classes (
  class_id          TEXT NOT NULL PRIMARY KEY,
  teacher_id        TEXT NOT NULL REFERENCES users(user_id),
  title             TEXT NOT NULL,
  join_code         TEXT NOT NULL UNIQUE,
  custom_fields_json JSONB NOT NULL DEFAULT '{"fields": []}',
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  require_approval  BOOLEAN NOT NULL DEFAULT false,
  description       TEXT,
  programme         TEXT,
  course            TEXT,
  academic_year     TEXT,
  semester          TEXT,
  max_capacity      INTEGER,
  start_date        DATE,
  end_date          DATE,
  colour            TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
-- status: ACTIVE | ARCHIVED

CREATE INDEX ON teacher_classes (teacher_id);
CREATE INDEX ON teacher_classes (join_code);

-- 5.3 teacher_class_members
CREATE TABLE teacher_class_members (
  member_id          TEXT NOT NULL PRIMARY KEY,
  class_id           TEXT NOT NULL REFERENCES teacher_classes(class_id),
  user_id            TEXT NOT NULL REFERENCES users(user_id),
  teacher_id         TEXT NOT NULL REFERENCES users(user_id),
  display_name       TEXT,
  email              TEXT,
  member_fields_json JSONB NOT NULL DEFAULT '{"fields": {}}',
  status             TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_class_member UNIQUE (class_id, user_id)
);
-- status: ACTIVE | PENDING | REJECTED

CREATE INDEX ON teacher_class_members (class_id);
CREATE INDEX ON teacher_class_members (user_id);
CREATE INDEX ON teacher_class_members (teacher_id);

-- 5.4 teacher_bank_items
CREATE TABLE teacher_bank_items (
  bank_item_id     TEXT NOT NULL PRIMARY KEY,
  teacher_id       TEXT NOT NULL REFERENCES users(user_id),
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  question_type    TEXT NOT NULL DEFAULT 'MCQ',
  stem             TEXT NOT NULL,
  option_a         TEXT, fb_a TEXT,
  option_b         TEXT, fb_b TEXT,
  option_c         TEXT, fb_c TEXT,
  option_d         TEXT, fb_d TEXT,
  option_e         TEXT, fb_e TEXT,
  option_f         TEXT, fb_f TEXT,
  correct          TEXT NOT NULL,
  rationale        TEXT,
  rationale_img    TEXT,
  subject          TEXT,
  maintopic        TEXT,
  subtopic         TEXT,
  difficulty       TEXT,
  marks            INTEGER NOT NULL DEFAULT 1,
  shuffle_options  BOOLEAN NOT NULL DEFAULT true,
  source_type      TEXT NOT NULL DEFAULT 'TEACHER',
  source_course_id TEXT,
  source_item_id   TEXT,
  imported_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
-- question_type: MCQ | TF | SATA
-- source_type: TEACHER | IMPORT | QUIZ_INLINE | LIBRARY

CREATE INDEX ON teacher_bank_items (teacher_id);
CREATE INDEX ON teacher_bank_items (teacher_id, status);
CREATE INDEX ON teacher_bank_items (maintopic);
CREATE INDEX ON teacher_bank_items (source_type);

-- 5.5 teacher_quizzes
CREATE TABLE teacher_quizzes (
  teacher_quiz_id        TEXT NOT NULL PRIMARY KEY,
  teacher_id             TEXT NOT NULL REFERENCES users(user_id),
  title                  TEXT NOT NULL,
  subject                TEXT,
  preset                 TEXT NOT NULL DEFAULT 'EXAM',
  duration_minutes       INTEGER NOT NULL DEFAULT 0,
  shuffle_questions      BOOLEAN NOT NULL DEFAULT false,
  shuffle_options        BOOLEAN NOT NULL DEFAULT true,
  max_attempts           INTEGER NOT NULL DEFAULT 1,
  show_review            BOOLEAN NOT NULL DEFAULT false,
  show_results           BOOLEAN NOT NULL DEFAULT true,
  results_release_policy TEXT NOT NULL DEFAULT 'MANUAL',
  results_released       BOOLEAN NOT NULL DEFAULT false,
  results_released_at    TIMESTAMPTZ,
  open_at                TIMESTAMPTZ,
  close_at               TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'DRAFT',
  access_code            TEXT,
  custom_fields_json     JSONB NOT NULL DEFAULT '{"fields": []}',
  draft_items_json       JSONB NOT NULL DEFAULT '{"items": []}',
  sata_scoring_policy    TEXT NOT NULL DEFAULT 'ALL_OR_NOTHING',
  grading_policy         TEXT NOT NULL DEFAULT 'BANDS_PCT',
  grade_bands_json       JSONB NOT NULL DEFAULT '{"bands": []}',
  pass_threshold_pct     NUMERIC NOT NULL DEFAULT 50,
  score_display_policy   TEXT NOT NULL DEFAULT 'RAW_AND_PCT',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
-- status: DRAFT | PUBLISHED | ARCHIVED
-- preset: EXAM | PRACTICE | HOMEWORK
-- results_release_policy: IMMEDIATE | AFTER_CLOSE | MANUAL
-- sata_scoring_policy: ALL_OR_NOTHING | PARTIAL_CREDIT | PER_OPTION
-- grading_policy: BANDS_PCT | PASS_FAIL | NONE
-- score_display_policy: RAW_AND_PCT | PCT_ONLY | RAW_ONLY | HIDDEN

CREATE INDEX ON teacher_quizzes (teacher_id);
CREATE INDEX ON teacher_quizzes (teacher_id, status);

-- 5.6 teacher_quiz_items (snapshot at publish time)
CREATE TABLE teacher_quiz_items (
  quiz_item_id       TEXT NOT NULL PRIMARY KEY,
  teacher_quiz_id    TEXT NOT NULL REFERENCES teacher_quizzes(teacher_quiz_id),
  position           INTEGER NOT NULL,
  bank_item_id       TEXT,
  snap_stem          TEXT NOT NULL,
  snap_option_a      TEXT, snap_fb_a TEXT,
  snap_option_b      TEXT, snap_fb_b TEXT,
  snap_option_c      TEXT, snap_fb_c TEXT,
  snap_option_d      TEXT, snap_fb_d TEXT,
  snap_option_e      TEXT, snap_fb_e TEXT,
  snap_option_f      TEXT, snap_fb_f TEXT,
  snap_correct       TEXT NOT NULL,
  snap_rationale     TEXT,
  snap_rationale_img TEXT,
  snap_subject       TEXT,
  snap_maintopic     TEXT,
  snap_subtopic      TEXT,
  snap_difficulty    TEXT,
  snap_marks         INTEGER NOT NULL DEFAULT 1,
  snap_question_type TEXT NOT NULL DEFAULT 'MCQ',
  snap_shuffle_options BOOLEAN NOT NULL DEFAULT true,
  snapped_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON teacher_quiz_items (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_items (teacher_quiz_id, position);

-- 5.7 teacher_quiz_classes
CREATE TABLE teacher_quiz_classes (
  tqc_id          TEXT NOT NULL PRIMARY KEY,
  teacher_quiz_id TEXT NOT NULL REFERENCES teacher_quizzes(teacher_quiz_id),
  class_id        TEXT NOT NULL REFERENCES teacher_classes(class_id),
  teacher_id      TEXT NOT NULL REFERENCES users(user_id),
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_quiz_class UNIQUE (teacher_quiz_id, class_id)
);

CREATE INDEX ON teacher_quiz_classes (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_classes (class_id);
CREATE INDEX ON teacher_quiz_classes (teacher_id);

-- 5.8 teacher_quiz_attempts
CREATE TABLE teacher_quiz_attempts (
  attempt_id           TEXT NOT NULL PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(user_id),
  teacher_quiz_id      TEXT NOT NULL REFERENCES teacher_quizzes(teacher_quiz_id),
  teacher_id           TEXT NOT NULL REFERENCES users(user_id),
  class_id             TEXT NOT NULL REFERENCES teacher_classes(class_id),
  attempt_no           INTEGER NOT NULL DEFAULT 1,
  mode                 TEXT NOT NULL,
  duration_minutes     INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  started_at           TIMESTAMPTZ DEFAULT NOW(),
  due_at               TIMESTAMPTZ,
  submitted_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  items_json           JSONB NOT NULL DEFAULT '[]',
  answers_json         JSONB NOT NULL DEFAULT '{}',
  flags_json           JSONB NOT NULL DEFAULT '{}',
  candidate_fields_json JSONB NOT NULL DEFAULT '{"fields": {}}',
  score_raw            NUMERIC,
  score_total          NUMERIC,
  score_pct            NUMERIC,
  time_taken_s         INTEGER,
  score_json           JSONB,
  grading_policy       TEXT,
  grade_bands_json     JSONB,
  score_display_policy TEXT
);
-- status: IN_PROGRESS | SUBMITTED

CREATE INDEX ON teacher_quiz_attempts (user_id);
CREATE INDEX ON teacher_quiz_attempts (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_attempts (teacher_id);
CREATE INDEX ON teacher_quiz_attempts (class_id);
CREATE INDEX ON teacher_quiz_attempts (user_id, teacher_quiz_id);
CREATE INDEX ON teacher_quiz_attempts (status);

-- 5.9 teacher_library_courses
CREATE TABLE teacher_library_courses (
  course_id    TEXT NOT NULL PRIMARY KEY,
  title        TEXT NOT NULL,
  program_scope TEXT[] NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'active',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  items_table  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
-- items_table: points to the actual items table (e.g. items_gp, items_rn_med)

CREATE INDEX ON teacher_library_courses (status);
CREATE INDEX ON teacher_library_courses (sort_order);


-- ────────────────────────────────────────────────────────────
-- 6. RLS (dev mode — replace before go-live)
-- ────────────────────────────────────────────────────────────
-- Apply to every table above:
--
-- ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "dev_allow_all" ON <table_name> FOR ALL USING (true) WITH CHECK (true);

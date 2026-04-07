-- ============================================================
-- PROD SETUP — Script 1 of 4: Tables + Indexes
-- Paste this into the prod Supabase SQL Editor and run.
-- Creates all 42 tables with indexes.
-- ============================================================

-- ── 1. CORE TABLES ──────────────────────────────────────────

CREATE TABLE programs (
  program_id       TEXT PRIMARY KEY,
  program_name     TEXT NOT NULL,
  trial_product_id TEXT
);

CREATE TABLE courses (
  course_id     TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  program_scope TEXT[] NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  page_slug     TEXT
);

CREATE TABLE levels (
  level_id   TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  product_id          TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  kind                TEXT NOT NULL DEFAULT 'PAID',
  status              TEXT NOT NULL DEFAULT 'active',
  courses_included    TEXT[] NOT NULL,
  price_minor         INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  duration_days       INTEGER NOT NULL,
  telegram_group_keys TEXT[]
);

CREATE TABLE users (
  user_id              TEXT PRIMARY KEY,
  auth_id              UUID,
  username             TEXT,
  email                TEXT NOT NULL,
  phone_number         TEXT,
  name                 TEXT,
  forename             TEXT,
  surname              TEXT,
  program_id           TEXT,
  cohort               TEXT,
  level                TEXT,
  role                 TEXT NOT NULL DEFAULT 'STUDENT',
  active               BOOLEAN NOT NULL DEFAULT true,
  avatar_url           TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  signup_source        TEXT DEFAULT 'SUPABASE_AUTH',
  created_utc          TIMESTAMPTZ DEFAULT NOW(),
  last_login_utc       TIMESTAMPTZ
);

CREATE TABLE subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  product_id      TEXT NOT NULL,
  start_utc       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_utc     TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  expiry_reminded BOOLEAN NOT NULL DEFAULT false,
  source          TEXT NOT NULL DEFAULT 'PAYMENT',
  source_ref      TEXT
);

CREATE TABLE payments (
  reference             TEXT PRIMARY KEY,
  status                TEXT NOT NULL,
  email                 TEXT NOT NULL,
  user_id               TEXT,
  product_id            TEXT NOT NULL,
  product_name          TEXT,
  amount_minor_expected INTEGER NOT NULL,
  currency              TEXT NOT NULL,
  amount_minor_paid     INTEGER,
  paid_utc              TIMESTAMPTZ,
  activated_utc         TIMESTAMPTZ,
  subscription_id       TEXT,
  failure_note          TEXT,
  raw                   JSONB,
  setup_token           TEXT,
  setup_created_utc     TIMESTAMPTZ,
  setup_completed_utc   TIMESTAMPTZ,
  program_id            TEXT,
  phone_number          TEXT
);

CREATE TABLE announcements (
  announcement_id         TEXT PRIMARY KEY,
  title                   TEXT NOT NULL,
  body_html               TEXT,
  body_text               TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  start_at                TIMESTAMPTZ,
  end_at                  TIMESTAMPTZ,
  pinned                  BOOLEAN NOT NULL DEFAULT false,
  priority                INTEGER NOT NULL DEFAULT 0,
  dismissible             BOOLEAN NOT NULL DEFAULT true,
  scope_programs          TEXT[],
  scope_courses           TEXT[],
  scope_level             TEXT,
  scope_subscription_kind TEXT,
  scope_product_ids       TEXT[],
  scope_audience          TEXT DEFAULT 'ALL',
  scope_cohort            TEXT,
  scope_user_ids          TEXT[]
);

CREATE TABLE user_notice_state (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  item_type  TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
  item_id    TEXT NOT NULL,
  state      TEXT NOT NULL,
  seen_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_notice UNIQUE (user_id, item_type, item_id)
);

CREATE TABLE config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. QUIZ ENGINE TABLES ───────────────────────────────────

CREATE TABLE quizzes (
  quiz_id        TEXT PRIMARY KEY,
  course_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  item_ids       TEXT[] NOT NULL DEFAULT '{}',
  n              INTEGER NOT NULL DEFAULT 0,
  allowed_modes  TEXT NOT NULL DEFAULT 'BOTH',
  shuffle        BOOLEAN NOT NULL DEFAULT false,
  time_limit_sec INTEGER,
  published      BOOLEAN NOT NULL DEFAULT false,
  publish_at     TIMESTAMPTZ,
  unpublish_at   TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'draft',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE attempts (
  attempt_id        TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  quiz_id           TEXT,
  course_id         TEXT NOT NULL,
  mode              TEXT NOT NULL,
  source            TEXT NOT NULL,
  item_ids          TEXT NOT NULL,
  n                 INTEGER NOT NULL,
  seed              TEXT,
  duration_min      INTEGER,
  status            TEXT NOT NULL DEFAULT 'in_progress',
  score_raw         NUMERIC,
  score_total       NUMERIC,
  score_pct         NUMERIC,
  time_taken_s      INTEGER,
  origin_attempt_id TEXT,
  display_label     TEXT,
  answers_json      TEXT NOT NULL DEFAULT '[]',
  ts_iso            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON attempts (user_id);
CREATE INDEX ON attempts (quiz_id);
CREATE INDEX ON attempts (course_id);
CREATE INDEX ON attempts (status);
CREATE INDEX ON attempts (user_id, quiz_id, mode, status);

-- ── 3. ITEMS TABLES (11 tables, identical schema) ───────────

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'items_gp','items_rn_med','items_rn_surg',
    'items_rm_ped_obs_hrn','items_rm_mid',
    'items_rphn_pphn','items_rphn_disease_ctrl',
    'items_rmhn_psych_nurs','items_rmhn_psych_ppharm',
    'items_nac_basic_clin','items_nac_basic_prev'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('
      CREATE TABLE %I (
        item_id         TEXT PRIMARY KEY,
        question_type   TEXT NOT NULL DEFAULT ''MCQ'',
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
      )', tbl);
    EXECUTE format('CREATE INDEX ON %I (maintopic)', tbl);
    EXECUTE format('CREATE INDEX ON %I (subtopic)', tbl);
    EXECUTE format('CREATE INDEX ON %I (subject)', tbl);
    EXECUTE format('CREATE INDEX ON %I (difficulty)', tbl);
    EXECUTE format('CREATE INDEX ON %I (question_type)', tbl);
    EXECUTE format('CREATE INDEX ON %I (batch_id)', tbl);
  END LOOP;
END $$;

-- ── 3b. OFFLINE PACKS ──────────────────────────────────────

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

-- ── 4. MESSAGING TABLES ────────────────────────────────────

CREATE TABLE messages_threads (
  thread_id        TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  admin_id         TEXT NOT NULL DEFAULT 'admin1',
  status           TEXT NOT NULL DEFAULT 'open',
  context_type     TEXT NOT NULL DEFAULT 'general',
  subject          TEXT,
  course_id        TEXT,
  quiz_id          TEXT,
  question_id      TEXT,
  attempt_id       TEXT,
  bulk_batch_id    TEXT,
  ref_text         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sender_role TEXT NOT NULL DEFAULT 'student'
);

CREATE TABLE messages (
  message_id    TEXT PRIMARY KEY,
  thread_id     TEXT NOT NULL,
  sender_id     TEXT NOT NULL,
  sender_role   TEXT NOT NULL,
  body_text     TEXT NOT NULL,
  read_by_user  BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. TEACHER ASSESS TABLES ───────────────────────────────

-- Must create programmes and cohorts before classes (FK references)
-- Must create courses before quizzes (FK references)

CREATE TABLE teacher_profiles (
  teacher_id      TEXT NOT NULL PRIMARY KEY,
  display_name    TEXT,
  email           TEXT,
  phone_number    TEXT,
  organisation    TEXT,
  role_requested  TEXT DEFAULT 'TEACHER',
  plan_type       TEXT NOT NULL DEFAULT 'FREE',
  active          BOOLEAN NOT NULL DEFAULT false,
  request_status  TEXT NOT NULL DEFAULT 'PENDING',
  request_note    TEXT,
  request_count   INTEGER NOT NULL DEFAULT 0,
  requested_at    TIMESTAMPTZ,
  last_request_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  avatar_url      TEXT,
  org_tagline     TEXT,
  org_region      TEXT,
  org_logo_url    TEXT
);

CREATE TABLE teacher_programmes (
  programme_id  TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON teacher_programmes (teacher_id);

CREATE TABLE teacher_cohorts (
  cohort_id     TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL,
  programme_id  TEXT NOT NULL REFERENCES teacher_programmes(programme_id),
  title         TEXT NOT NULL,
  intake_year   INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON teacher_cohorts (teacher_id);
CREATE INDEX ON teacher_cohorts (programme_id);

CREATE TABLE teacher_classes (
  class_id           TEXT NOT NULL PRIMARY KEY,
  teacher_id         TEXT NOT NULL,
  title              TEXT NOT NULL,
  join_code          TEXT NOT NULL UNIQUE,
  custom_fields_json JSONB NOT NULL DEFAULT '{"fields": []}',
  status             TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  require_approval   BOOLEAN DEFAULT false,
  description        TEXT,
  programme          TEXT,
  course             TEXT,
  academic_year      TEXT,
  semester           TEXT,
  max_capacity       INTEGER,
  start_date         DATE,
  end_date           DATE,
  colour             TEXT,
  cohort_id          TEXT REFERENCES teacher_cohorts(cohort_id)
);
CREATE INDEX ON teacher_classes (teacher_id);
CREATE INDEX ON teacher_classes (join_code);
CREATE INDEX ON teacher_classes (cohort_id);

CREATE TABLE teacher_class_members (
  member_id          TEXT NOT NULL PRIMARY KEY,
  class_id           TEXT NOT NULL,
  user_id            TEXT NOT NULL,
  teacher_id         TEXT NOT NULL,
  display_name       TEXT,
  email              TEXT,
  member_fields_json JSONB NOT NULL DEFAULT '{"fields": {}}',
  status             TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_class_member UNIQUE (class_id, user_id)
);
CREATE INDEX ON teacher_class_members (class_id);
CREATE INDEX ON teacher_class_members (user_id);
CREATE INDEX ON teacher_class_members (teacher_id);

CREATE TABLE teacher_bank_items (
  bank_item_id     TEXT NOT NULL PRIMARY KEY,
  teacher_id       TEXT NOT NULL,
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
CREATE INDEX ON teacher_bank_items (teacher_id);
CREATE INDEX ON teacher_bank_items (teacher_id, status);
CREATE INDEX ON teacher_bank_items (maintopic);
CREATE INDEX ON teacher_bank_items (source_type);

CREATE TABLE teacher_courses (
  course_id    TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON teacher_courses (teacher_id);

CREATE TABLE teacher_quizzes (
  teacher_quiz_id        TEXT NOT NULL PRIMARY KEY,
  teacher_id             TEXT NOT NULL,
  title                  TEXT NOT NULL,
  subject                TEXT,
  course_id              TEXT REFERENCES teacher_courses(course_id),
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
  grading_policy         TEXT NOT NULL DEFAULT 'BANDS_PCT',
  grade_bands_json       JSONB NOT NULL DEFAULT '{"bands": []}',
  pass_threshold_pct     NUMERIC NOT NULL DEFAULT 50,
  score_display_policy   TEXT NOT NULL DEFAULT 'RAW_AND_PCT',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  sata_scoring_policy    TEXT NOT NULL DEFAULT 'ALL_OR_NOTHING'
);
CREATE INDEX ON teacher_quizzes (teacher_id);
CREATE INDEX ON teacher_quizzes (teacher_id, status);

CREATE TABLE teacher_quiz_items (
  quiz_item_id         TEXT NOT NULL PRIMARY KEY,
  teacher_quiz_id      TEXT NOT NULL,
  position             INTEGER NOT NULL,
  bank_item_id         TEXT,
  snap_stem            TEXT NOT NULL,
  snap_option_a        TEXT, snap_fb_a TEXT,
  snap_option_b        TEXT, snap_fb_b TEXT,
  snap_option_c        TEXT, snap_fb_c TEXT,
  snap_option_d        TEXT, snap_fb_d TEXT,
  snap_option_e        TEXT, snap_fb_e TEXT,
  snap_option_f        TEXT, snap_fb_f TEXT,
  snap_correct         TEXT NOT NULL,
  snap_rationale       TEXT,
  snap_rationale_img   TEXT,
  snap_subject         TEXT,
  snap_maintopic       TEXT,
  snap_subtopic        TEXT,
  snap_difficulty      TEXT,
  snap_marks           INTEGER NOT NULL DEFAULT 1,
  snap_question_type   TEXT NOT NULL DEFAULT 'MCQ',
  snap_shuffle_options BOOLEAN NOT NULL DEFAULT true,
  snapped_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON teacher_quiz_items (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_items (teacher_quiz_id, position);

CREATE TABLE teacher_quiz_classes (
  tqc_id          TEXT NOT NULL PRIMARY KEY,
  teacher_quiz_id TEXT NOT NULL,
  class_id        TEXT NOT NULL,
  teacher_id      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_quiz_class UNIQUE (teacher_quiz_id, class_id)
);
CREATE INDEX ON teacher_quiz_classes (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_classes (class_id);
CREATE INDEX ON teacher_quiz_classes (teacher_id);

CREATE TABLE teacher_quiz_attempts (
  attempt_id            TEXT NOT NULL PRIMARY KEY,
  user_id               TEXT NOT NULL,
  teacher_quiz_id       TEXT NOT NULL,
  teacher_id            TEXT NOT NULL,
  class_id              TEXT NOT NULL,
  attempt_no            INTEGER NOT NULL DEFAULT 1,
  mode                  TEXT NOT NULL,
  duration_minutes      INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  due_at                TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  items_json            JSONB NOT NULL DEFAULT '[]',
  answers_json          JSONB NOT NULL DEFAULT '{}',
  flags_json            JSONB NOT NULL DEFAULT '{}',
  candidate_fields_json JSONB NOT NULL DEFAULT '{"fields": {}}',
  score_raw             NUMERIC,
  score_total           NUMERIC,
  score_pct             NUMERIC,
  time_taken_s          INTEGER,
  score_json            JSONB,
  grading_policy        TEXT,
  grade_bands_json      JSONB,
  score_display_policy  TEXT
);
CREATE INDEX ON teacher_quiz_attempts (user_id);
CREATE INDEX ON teacher_quiz_attempts (teacher_quiz_id);
CREATE INDEX ON teacher_quiz_attempts (teacher_id);
CREATE INDEX ON teacher_quiz_attempts (class_id);
CREATE INDEX ON teacher_quiz_attempts (user_id, teacher_quiz_id);
CREATE INDEX ON teacher_quiz_attempts (status);

CREATE TABLE teacher_library_courses (
  course_id     TEXT NOT NULL PRIMARY KEY,
  title         TEXT NOT NULL,
  program_scope TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  items_table   TEXT
);
CREATE INDEX ON teacher_library_courses (status);
CREATE INDEX ON teacher_library_courses (sort_order);

-- ── 6. AUTH & SESSION TABLES ────────────────────────────────

CREATE TABLE sessions (
  session_id    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'LOGIN',
  issued_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_utc   TIMESTAMPTZ NOT NULL,
  last_seen_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_label  TEXT,
  ua_hash       TEXT,
  ip_hash       TEXT,
  login_via     TEXT NOT NULL DEFAULT 'EMAIL',
  active        BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ON sessions (user_id);
CREATE INDEX ON sessions (user_id, active, expires_utc);

CREATE TABLE auth_events (
  event_id      TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  identifier    TEXT NOT NULL,
  user_id       TEXT,
  fp_hash       TEXT,
  ua_hash       TEXT,
  device_label  TEXT,
  fail_reason   TEXT,
  created_utc   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX auth_events_identifier_created ON auth_events (identifier, created_utc);
CREATE INDEX auth_events_fp_hash_created ON auth_events (fp_hash, created_utc) WHERE fp_hash IS NOT NULL;
CREATE INDEX auth_events_user_id_created ON auth_events (user_id, created_utc) WHERE user_id IS NOT NULL;
CREATE INDEX auth_events_created ON auth_events (created_utc);

CREATE TABLE reset_requests (
  request_id    TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  user_exists   BOOLEAN NOT NULL DEFAULT FALSE,
  status        TEXT NOT NULL,
  fp_hash       TEXT,
  device_label  TEXT,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  used_utc      TIMESTAMPTZ,
  created_utc   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX reset_requests_email_created ON reset_requests (email, created_utc);
CREATE INDEX reset_requests_created ON reset_requests (created_utc);

-- ============================================================
-- PROD SETUP — Script 2 of 4: Functions + Triggers
-- Paste this into the prod Supabase SQL Editor and run.
-- Creates all 9 functions + 1 trigger.
-- ============================================================

-- ── 1. RLS HELPER FUNCTIONS ─────────────────────────────────

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id FROM users WHERE auth_id = auth.uid()
$$;

-- ── 2. AUTH EVENT LOGGING ───────────────────────────────────

CREATE OR REPLACE FUNCTION log_auth_event(
  p_event_id     TEXT,
  p_event_type   TEXT,
  p_identifier   TEXT,
  p_user_id      TEXT    DEFAULT NULL,
  p_fp_hash      TEXT    DEFAULT NULL,
  p_ua_hash      TEXT    DEFAULT NULL,
  p_device_label TEXT    DEFAULT NULL,
  p_fail_reason  TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_event_type NOT IN ('LOGIN_SUCCESS', 'LOGIN_FAIL') THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  INSERT INTO auth_events (
    event_id, event_type, identifier, user_id,
    fp_hash, ua_hash, device_label, fail_reason
  ) VALUES (
    p_event_id,
    p_event_type,
    LOWER(TRIM(p_identifier)),
    p_user_id,
    p_fp_hash,
    p_ua_hash,
    p_device_label,
    p_fail_reason
  );
END;
$$;

-- ── 3. LOGIN RATE LIMIT ─────────────────────────────────────

CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_identifier TEXT,
  p_fp_hash    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_identifier   TEXT := LOWER(TRIM(p_identifier));
  v_now          TIMESTAMPTZ := NOW();
  v_10m_ago      TIMESTAMPTZ := v_now - INTERVAL '10 minutes';
  v_24h_ago      TIMESTAMPTZ := v_now - INTERVAL '24 hours';
  v_id_short     INT;
  v_id_long      INT;
  v_fp_short     INT;
  v_fp_long      INT;
  v_oldest_short TIMESTAMPTZ;
  v_oldest_long  TIMESTAMPTZ;
  v_retry        INT;
BEGIN
  SELECT COUNT(*), MIN(created_utc)
  INTO v_id_short, v_oldest_short
  FROM auth_events
  WHERE identifier = v_identifier
    AND event_type = 'LOGIN_FAIL'
    AND fail_reason != 'RATE_LIMITED'
    AND created_utc > v_10m_ago;

  SELECT COUNT(*), MIN(created_utc)
  INTO v_id_long, v_oldest_long
  FROM auth_events
  WHERE identifier = v_identifier
    AND event_type = 'LOGIN_FAIL'
    AND fail_reason != 'RATE_LIMITED'
    AND created_utc > v_24h_ago;

  v_fp_short := 0;
  v_fp_long  := 0;
  IF p_fp_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_fp_short
    FROM auth_events
    WHERE fp_hash = p_fp_hash
      AND event_type = 'LOGIN_FAIL'
      AND fail_reason != 'RATE_LIMITED'
      AND created_utc > v_10m_ago;

    SELECT COUNT(*) INTO v_fp_long
    FROM auth_events
    WHERE fp_hash = p_fp_hash
      AND event_type = 'LOGIN_FAIL'
      AND fail_reason != 'RATE_LIMITED'
      AND created_utc > v_24h_ago;
  END IF;

  IF v_id_long >= 10 OR v_fp_long >= 10 THEN
    v_retry := GREATEST(
      EXTRACT(EPOCH FROM (v_oldest_long + INTERVAL '24 hours' - v_now))::INT,
      60
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry,
      'reason', 'TOO_MANY_ATTEMPTS_24H'
    );
  END IF;

  IF v_id_short >= 5 OR v_fp_short >= 5 THEN
    v_retry := GREATEST(
      EXTRACT(EPOCH FROM (v_oldest_short + INTERVAL '10 minutes' - v_now))::INT,
      30
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry,
      'reason', 'TOO_MANY_ATTEMPTS'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ── 4. RESET RATE LIMIT ─────────────────────────────────────

CREATE OR REPLACE FUNCTION check_reset_rate_limit(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email   TEXT := LOWER(TRIM(p_email));
  v_now     TIMESTAMPTZ := NOW();
  v_60m_ago TIMESTAMPTZ := v_now - INTERVAL '60 minutes';
  v_count   INT;
  v_oldest  TIMESTAMPTZ;
  v_retry   INT;
BEGIN
  SELECT COUNT(*), MIN(created_utc)
  INTO v_count, v_oldest
  FROM reset_requests
  WHERE email = v_email
    AND status != 'RATE_LIMITED'
    AND created_utc > v_60m_ago;

  IF v_count >= 3 THEN
    v_retry := GREATEST(
      EXTRACT(EPOCH FROM (v_oldest + INTERVAL '60 minutes' - v_now))::INT,
      60
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry,
      'reason', 'TOO_MANY_RESET_REQUESTS'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ── 5. LOG RESET REQUEST ────────────────────────────────────

CREATE OR REPLACE FUNCTION log_reset_request(
  p_request_id   TEXT,
  p_email        TEXT,
  p_status       TEXT,
  p_fp_hash      TEXT DEFAULT NULL,
  p_device_label TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email       TEXT := LOWER(TRIM(p_email));
  v_user_exists BOOLEAN;
BEGIN
  IF p_status NOT IN ('EMAIL_SENT', 'RATE_LIMITED', 'EMAIL_FAILED') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM users WHERE LOWER(email) = v_email
  ) INTO v_user_exists;

  INSERT INTO reset_requests (
    request_id, email, user_exists, status,
    fp_hash, device_label
  ) VALUES (
    p_request_id,
    v_email,
    v_user_exists,
    p_status,
    p_fp_hash,
    p_device_label
  );
END;
$$;

-- ── 6. MARK RESET USED ─────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_reset_used(
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(p_email));
BEGIN
  UPDATE reset_requests
  SET used = TRUE,
      used_utc = NOW()
  WHERE request_id = (
    SELECT request_id
    FROM reset_requests
    WHERE email = v_email
      AND status = 'EMAIL_SENT'
      AND used = FALSE
    ORDER BY created_utc DESC
    LIMIT 1
  );
END;
$$;

-- ── 7. OFFLINE PACKS TRIGGER ────────────────────────────────

CREATE OR REPLACE FUNCTION set_offline_packs_updated_utc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_utc = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offline_packs_updated_utc
  BEFORE UPDATE ON offline_packs
  FOR EACH ROW
  EXECUTE FUNCTION set_offline_packs_updated_utc();

-- ── 8. TEACHER QUIZ HELPER FUNCTIONS ────────────────────────
-- tq_item_option_letters: returns array of letter labels for
-- non-null options (used by tq_student_item_result for test data)

CREATE OR REPLACE FUNCTION tq_item_option_letters(
  p_a TEXT, p_b TEXT, p_c TEXT,
  p_d TEXT, p_e TEXT, p_f TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_a IS NOT NULL AND p_a != '' THEN result := array_append(result, 'a'); END IF;
  IF p_b IS NOT NULL AND p_b != '' THEN result := array_append(result, 'b'); END IF;
  IF p_c IS NOT NULL AND p_c != '' THEN result := array_append(result, 'c'); END IF;
  IF p_d IS NOT NULL AND p_d != '' THEN result := array_append(result, 'd'); END IF;
  IF p_e IS NOT NULL AND p_e != '' THEN result := array_append(result, 'e'); END IF;
  IF p_f IS NOT NULL AND p_f != '' THEN result := array_append(result, 'f'); END IF;
  RETURN result;
END;
$$;

-- tq_student_item_result: generates a deterministic answer for
-- a simulated student (used for test/demo data generation)

CREATE OR REPLACE FUNCTION tq_student_item_result(
  p_student_idx INTEGER,
  p_item_row RECORD,
  p_threshold DOUBLE PRECISION
)
RETURNS TABLE(answer_json JSONB, gained_marks INTEGER)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  opt_letters TEXT[];
  rand_val FLOAT;
  marks INT := COALESCE(p_item_row.snap_marks, 1);
  qtype TEXT := COALESCE(p_item_row.snap_question_type, 'MCQ');
  correct TEXT := TRIM(p_item_row.snap_correct::TEXT);
  wrong_letter TEXT;
  sata_answers TEXT[];
BEGIN
  opt_letters := tq_item_option_letters(
    p_item_row.snap_option_a, p_item_row.snap_option_b, p_item_row.snap_option_c,
    p_item_row.snap_option_d, p_item_row.snap_option_e, p_item_row.snap_option_f
  );

  rand_val := ((p_student_idx * 13 + p_item_row.position * 7 + 5) % 100) / 100.0;

  IF rand_val < p_threshold THEN
    IF qtype = 'SATA' THEN
      IF correct = '' OR correct IS NULL THEN
        sata_answers := ARRAY[]::TEXT[];
      ELSE
        sata_answers := string_to_array(correct, ',');
      END IF;
      answer_json := jsonb_build_object(p_item_row.quiz_item_id, sata_answers);
    ELSE
      answer_json := jsonb_build_object(p_item_row.quiz_item_id, correct);
    END IF;
    gained_marks := marks;
  ELSE
    IF qtype = 'SATA' THEN
      IF array_length(opt_letters, 1) IS NULL THEN
        answer_json := jsonb_build_object(p_item_row.quiz_item_id, ARRAY[]::TEXT);
      ELSE
        wrong_letter := opt_letters[((p_student_idx + p_item_row.position) % array_length(opt_letters, 1)) + 1];
        answer_json := jsonb_build_object(p_item_row.quiz_item_id, jsonb_build_array(wrong_letter)::JSONB);
      END IF;
      gained_marks := 0;
    ELSE
      wrong_letter := NULL;
      IF array_length(opt_letters, 1) IS NOT NULL THEN
        FOR i IN 1..array_length(opt_letters, 1) LOOP
          IF opt_letters[i] IS DISTINCT FROM correct THEN
            wrong_letter := opt_letters[i];
            EXIT;
          END IF;
        END LOOP;
        IF wrong_letter IS NULL THEN wrong_letter := opt_letters[1]; END IF;
        answer_json := jsonb_build_object(p_item_row.quiz_item_id, wrong_letter);
      ELSE
        answer_json := jsonb_build_object(p_item_row.quiz_item_id, NULL);
      END IF;
      gained_marks := 0;
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

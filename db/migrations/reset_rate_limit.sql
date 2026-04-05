-- ============================================================
-- Migration: Password-reset rate limiting
-- Reuses the auth_events table. Run in Supabase SQL Editor.
-- ============================================================

-- 1. Expand log_auth_event to accept RESET_REQUEST
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
  IF p_event_type NOT IN ('LOGIN_SUCCESS', 'LOGIN_FAIL', 'RESET_REQUEST') THEN
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

-- 2. New RPC: check_reset_rate_limit
-- Counts RESET_REQUEST events for an email in the last 60 min.
-- Threshold: 3 requests per email per 60 minutes.
CREATE OR REPLACE FUNCTION check_reset_rate_limit(
  p_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_identifier TEXT := LOWER(TRIM(p_identifier));
  v_now        TIMESTAMPTZ := NOW();
  v_60m_ago    TIMESTAMPTZ := v_now - INTERVAL '60 minutes';
  v_count      INT;
  v_oldest     TIMESTAMPTZ;
  v_retry      INT;
BEGIN
  SELECT COUNT(*), MIN(created_utc)
  INTO v_count, v_oldest
  FROM auth_events
  WHERE identifier = v_identifier
    AND event_type = 'RESET_REQUEST'
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

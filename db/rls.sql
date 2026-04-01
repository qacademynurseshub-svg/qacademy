-- ============================================================
-- QAcademy Nurses Hub — Row Level Security Policies
-- Supabase (PostgreSQL)
-- Last updated: April 2026
--
-- HOW TO USE THIS FILE:
--   - This is the single source of truth for all RLS policies.
--   - When adding a new policy, add it here first, then run
--     it in the Supabase SQL Editor.
--   - Policies are grouped by table, in the same order as
--     db/schema.sql.
--   - All remaining tables still use dev_allow_all until
--     Sprint 1 is complete.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTION
-- Used by policies to check the current user's role without
-- causing recursion on the users table.
-- SECURITY DEFINER means it runs with elevated privileges,
-- bypassing RLS so it can safely read the users table.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$;


-- ────────────────────────────────────────────────────────────
-- GROUP A: REFERENCE / CATALOGUE DATA
-- (programs, courses, levels, products, config,
--  teacher_library_courses)
-- Status: dev_allow_all — pending Batch 2
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- GROUP B: STUDENT-OWNED DATA
-- ────────────────────────────────────────────────────────────

-- 1. users
-- Students read and update their own row only.
-- Admins read and update all rows.
-- No browser INSERT or DELETE.
-- Worker uses service role key — bypasses RLS.

DROP POLICY IF EXISTS "dev_allow_all" ON users;

CREATE POLICY "users_select"
ON users FOR SELECT
USING (
  auth.uid() = auth_id
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "users_update"
ON users FOR UPDATE
USING (
  auth.uid() = auth_id
  OR auth_user_role() = 'ADMIN'
);


-- 2. subscriptions
-- Students read their own rows only.
-- Students can insert their own trial subscription (register flow).
-- Admins read all rows and can insert/update from browser.
-- All other writes go through worker (service role, bypasses RLS).
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON subscriptions;

CREATE POLICY "subscriptions_select"
ON subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND u.user_id = subscriptions.user_id
  )
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "subscriptions_insert"
ON subscriptions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.user_id = subscriptions.user_id
      OR auth_user_role() = 'ADMIN'
    )
  )
);

CREATE POLICY "subscriptions_update"
ON subscriptions FOR UPDATE
USING (
  auth_user_role() = 'ADMIN'
);


-- ────────────────────────────────────────────────────────────
-- GROUP B (remaining): attempts, offline_packs,
--   user_notice_state
-- Status: dev_allow_all — pending Batch 3
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- GROUP C: ADMIN-ONLY DATA
-- ────────────────────────────────────────────────────────────

-- 3. payments
-- Only admins can read payment rows from the browser.
-- All writes go through worker (service role, bypasses RLS).
-- Students cannot read payment rows at all.

DROP POLICY IF EXISTS "dev_allow_all" ON payments;

CREATE POLICY "payments_select"
ON payments FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
);


-- ────────────────────────────────────────────────────────────
-- GROUP D: CONTENT READABLE BY STUDENTS (ADMIN-MANAGED)
-- (announcements, quizzes, mock_quizzes, items_* x11)
-- Status: dev_allow_all — pending Batch 4
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- GROUP E: TEACHER-OWNED DATA
-- (teacher_profiles, teacher_classes, teacher_bank_items,
--  teacher_quizzes, teacher_quiz_items, teacher_quiz_classes)
-- Status: dev_allow_all — pending Batch 5
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- GROUP F: SHARED ACCESS (TEACHER <-> STUDENT)
-- (teacher_class_members, teacher_quiz_attempts)
-- Status: dev_allow_all — pending Batch 5
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- GROUP G: MESSAGING
-- (messages_threads, messages)
-- Status: dev_allow_all — pending Batch 6
-- ────────────────────────────────────────────────────────────

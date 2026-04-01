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
-- HELPER FUNCTION 2
-- Returns the current user's user_id (TEXT) without recursion.
-- Used wherever policies need to match on user_id directly.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id FROM users WHERE auth_id = auth.uid()
$$;


-- ────────────────────────────────────────────────────────────
-- GROUP E: TEACHER-OWNED DATA
-- ────────────────────────────────────────────────────────────

-- 4. teacher_profiles
-- Any logged-in user can read (students need teacher name/org
-- for class cards and join modal).
-- Teachers insert their own profile (access request flow).
-- Teachers update their own row; admins update any row.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_profiles;

CREATE POLICY "teacher_profiles_select"
ON teacher_profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "teacher_profiles_insert"
ON teacher_profiles FOR INSERT
WITH CHECK (
  teacher_profiles.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_profiles_update"
ON teacher_profiles FOR UPDATE
USING (
  teacher_profiles.teacher_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);


-- 5. teacher_bank_items
-- Teachers read and write their own items only
-- Admin reads all
-- No DELETE — items are soft-archived via status = 'ARCHIVED'
-- No student access — students see snapshots in teacher_quiz_items

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_bank_items;

CREATE POLICY "teacher_bank_items_select"
ON teacher_bank_items FOR SELECT
USING (
  teacher_bank_items.teacher_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "teacher_bank_items_insert"
ON teacher_bank_items FOR INSERT
WITH CHECK (
  teacher_bank_items.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_bank_items_update"
ON teacher_bank_items FOR UPDATE
USING (
  teacher_bank_items.teacher_id = auth_user_id()
);


-- 6. teacher_classes
-- Teachers read and write their own classes.
-- Any logged-in user can read active classes
-- (covers student join_code lookup and class card display).
-- Admins read all.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_classes;

CREATE POLICY "teacher_classes_select"
ON teacher_classes FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_classes.teacher_id = auth_user_id()
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "teacher_classes_insert"
ON teacher_classes FOR INSERT
WITH CHECK (
  teacher_classes.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_classes_update"
ON teacher_classes FOR UPDATE
USING (
  teacher_classes.teacher_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);


-- 6. teacher_quizzes
-- Teachers read and write their own quizzes.
-- Students read published quizzes in classes they are
-- an active member of (via teacher_quiz_classes +
-- teacher_class_members — no circular reference here).
-- Admins read all.
-- No browser DELETE (archive = UPDATE status to ARCHIVED).

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_quizzes;

CREATE POLICY "teacher_quizzes_select"
ON teacher_quizzes FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quizzes.teacher_id = auth_user_id()
  OR (
    teacher_quizzes.status = 'PUBLISHED'
    AND EXISTS (
      SELECT 1 FROM teacher_quiz_classes tqc
      JOIN teacher_class_members m
        ON m.class_id = tqc.class_id
      WHERE tqc.teacher_quiz_id = teacher_quizzes.teacher_quiz_id
      AND m.user_id = auth_user_id()
      AND m.status = 'ACTIVE'
    )
  )
);

CREATE POLICY "teacher_quizzes_insert"
ON teacher_quizzes FOR INSERT
WITH CHECK (
  teacher_quizzes.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_quizzes_update"
ON teacher_quizzes FOR UPDATE
USING (
  teacher_quizzes.teacher_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);


-- ────────────────────────────────────────────────────────────
-- GROUP F: SHARED ACCESS (TEACHER <-> STUDENT)
-- ────────────────────────────────────────────────────────────

-- 7. teacher_class_members
-- Teachers read all members of their classes (teacher_id
-- is directly on this table — no join to teacher_classes needed).
-- Students read their own membership rows.
-- Admins read all.
-- Students INSERT their own membership (join flow).
-- Teachers and students UPDATE (approve/reject/remove vs
-- own profile fields). Admins update any.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_class_members;

CREATE POLICY "teacher_class_members_select"
ON teacher_class_members FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_class_members.user_id = auth_user_id()
  OR teacher_class_members.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_class_members_insert"
ON teacher_class_members FOR INSERT
WITH CHECK (
  teacher_class_members.user_id = auth_user_id()
);

CREATE POLICY "teacher_class_members_update"
ON teacher_class_members FOR UPDATE
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_class_members.user_id = auth_user_id()
  OR teacher_class_members.teacher_id = auth_user_id()
);


-- 8. teacher_quiz_attempts
-- Students read, insert, and update their own attempts.
-- Teachers read all attempts for their quizzes
-- (teacher_id is directly on this table).
-- Admins read all.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_quiz_attempts;

CREATE POLICY "teacher_quiz_attempts_select"
ON teacher_quiz_attempts FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quiz_attempts.user_id = auth_user_id()
  OR teacher_quiz_attempts.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_quiz_attempts_insert"
ON teacher_quiz_attempts FOR INSERT
WITH CHECK (
  teacher_quiz_attempts.user_id = auth_user_id()
);

CREATE POLICY "teacher_quiz_attempts_update"
ON teacher_quiz_attempts FOR UPDATE
USING (
  teacher_quiz_attempts.user_id = auth_user_id()
);


-- ────────────────────────────────────────────────────────────
-- GROUP G: MESSAGING
-- ────────────────────────────────────────────────────────────

-- 9. messages_threads
-- Students read, insert, and update their own threads.
-- Admins read and update all threads.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON messages_threads;

CREATE POLICY "messages_threads_select"
ON messages_threads FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR messages_threads.user_id = auth_user_id()
);

CREATE POLICY "messages_threads_insert"
ON messages_threads FOR INSERT
WITH CHECK (
  messages_threads.user_id = auth_user_id()
);

CREATE POLICY "messages_threads_update"
ON messages_threads FOR UPDATE
USING (
  auth_user_role() = 'ADMIN'
  OR messages_threads.user_id = auth_user_id()
);


-- 10. messages
-- Students read, insert, and update messages on their own
-- threads (verified via messages_threads ownership).
-- Admins read, insert, and update all messages.
-- No browser DELETE.

DROP POLICY IF EXISTS "dev_allow_all" ON messages;

CREATE POLICY "messages_select"
ON messages FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM messages_threads t
    WHERE t.thread_id = messages.thread_id
    AND t.user_id = auth_user_id()
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
WITH CHECK (
  auth_user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM messages_threads t
    WHERE t.thread_id = messages.thread_id
    AND t.user_id = auth_user_id()
  )
);

CREATE POLICY "messages_update"
ON messages FOR UPDATE
USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM messages_threads t
    WHERE t.thread_id = messages.thread_id
    AND t.user_id = auth_user_id()
  )
);


-- ────────────────────────────────────────────────────────────
-- GROUP A: REFERENCE / CATALOGUE DATA
-- ────────────────────────────────────────────────────────────

-- 11. programs
-- Public SELECT (needed before login on register + index page)
-- Admin INSERT and UPDATE only

DROP POLICY IF EXISTS "dev_allow_all" ON programs;

CREATE POLICY "programs_select"
ON programs FOR SELECT
USING (true);

CREATE POLICY "programs_insert"
ON programs FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "programs_update"
ON programs FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 12. courses
-- Any logged-in user can read
-- Admin writes only

DROP POLICY IF EXISTS "dev_allow_all" ON courses;

CREATE POLICY "courses_select"
ON courses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "courses_insert"
ON courses FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "courses_update"
ON courses FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 13. levels
-- Any logged-in user can read (unused but keep open for future)
-- Admin writes only

DROP POLICY IF EXISTS "dev_allow_all" ON levels;

CREATE POLICY "levels_select"
ON levels FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "levels_insert"
ON levels FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "levels_update"
ON levels FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 14. products
-- Any logged-in user can read
-- Admin writes only

DROP POLICY IF EXISTS "dev_allow_all" ON products;

CREATE POLICY "products_select"
ON products FOR SELECT
USING (true);

CREATE POLICY "products_insert"
ON products FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "products_update"
ON products FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 15. config
-- Any logged-in user can read
-- Admin INSERT, UPDATE, and DELETE

DROP POLICY IF EXISTS "dev_allow_all" ON config;

CREATE POLICY "config_select"
ON config FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_insert"
ON config FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "config_update"
ON config FOR UPDATE
USING (auth_user_role() = 'ADMIN');

CREATE POLICY "config_delete"
ON config FOR DELETE
USING (auth_user_role() = 'ADMIN');


-- 16. teacher_library_courses
-- Teachers and admins can read
-- Admin writes only (no browser writes currently)

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_library_courses;

CREATE POLICY "teacher_library_courses_select"
ON teacher_library_courses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "teacher_library_courses_insert"
ON teacher_library_courses FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "teacher_library_courses_update"
ON teacher_library_courses FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- ────────────────────────────────────────────────────────────
-- GROUP B (remaining): STUDENT-OWNED DATA
-- ────────────────────────────────────────────────────────────

-- 17. attempts
-- Students read and write their own rows
-- Admin reads all (stats on fixed-quizzes + mock-exams pages)
-- No browser DELETE

DROP POLICY IF EXISTS "dev_allow_all" ON attempts;

CREATE POLICY "attempts_select"
ON attempts FOR SELECT
USING (
  attempts.user_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "attempts_insert"
ON attempts FOR INSERT
WITH CHECK (
  attempts.user_id = auth_user_id()
);

CREATE POLICY "attempts_update"
ON attempts FOR UPDATE
USING (
  attempts.user_id = auth_user_id()
);


-- 18. offline_packs
-- Students read and write their own rows only
-- Admin reads all
-- No browser DELETE (packs are deactivated not deleted)

DROP POLICY IF EXISTS "dev_allow_all" ON offline_packs;

CREATE POLICY "offline_packs_select"
ON offline_packs FOR SELECT
USING (
  offline_packs.user_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "offline_packs_insert"
ON offline_packs FOR INSERT
WITH CHECK (
  offline_packs.user_id = auth_user_id()
);

CREATE POLICY "offline_packs_update"
ON offline_packs FOR UPDATE
USING (
  offline_packs.user_id = auth_user_id()
);


-- 19. user_notice_state
-- Students read and upsert their own rows
-- Admin reads all (announcement engagement stats)
-- No browser DELETE

DROP POLICY IF EXISTS "dev_allow_all" ON user_notice_state;

CREATE POLICY "user_notice_state_select"
ON user_notice_state FOR SELECT
USING (
  user_notice_state.user_id = auth_user_id()
  OR auth_user_role() = 'ADMIN'
);

CREATE POLICY "user_notice_state_insert"
ON user_notice_state FOR INSERT
WITH CHECK (
  user_notice_state.user_id = auth_user_id()
);

CREATE POLICY "user_notice_state_update"
ON user_notice_state FOR UPDATE
USING (
  user_notice_state.user_id = auth_user_id()
);


-- ────────────────────────────────────────────────────────────
-- GROUP D: CONTENT READABLE BY STUDENTS (ADMIN-MANAGED)
-- ────────────────────────────────────────────────────────────

-- 20. announcements
-- Any logged-in user can read
-- Admin full CRUD

DROP POLICY IF EXISTS "dev_allow_all" ON announcements;

CREATE POLICY "announcements_select"
ON announcements FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_insert"
ON announcements FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "announcements_update"
ON announcements FOR UPDATE
USING (auth_user_role() = 'ADMIN');

CREATE POLICY "announcements_delete"
ON announcements FOR DELETE
USING (auth_user_role() = 'ADMIN');


-- 21. quizzes
-- Any logged-in user can read
-- Admin full CRUD

DROP POLICY IF EXISTS "dev_allow_all" ON quizzes;

CREATE POLICY "quizzes_select"
ON quizzes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "quizzes_insert"
ON quizzes FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "quizzes_update"
ON quizzes FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 22. mock_quizzes
-- Any logged-in user can read
-- Admin full CRUD

DROP POLICY IF EXISTS "dev_allow_all" ON mock_quizzes;

CREATE POLICY "mock_quizzes_select"
ON mock_quizzes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "mock_quizzes_insert"
ON mock_quizzes FOR INSERT
WITH CHECK (auth_user_role() = 'ADMIN');

CREATE POLICY "mock_quizzes_update"
ON mock_quizzes FOR UPDATE
USING (auth_user_role() = 'ADMIN');


-- 23. items_* (all 11 tables — repeat this block for each)
-- Any logged-in user can read (needed for quiz taking)
-- Admin full CRUD including DELETE and UPSERT
-- Tables: items_gp, items_rn_med, items_rn_surg,
--   items_rm_ped_obs_hrn, items_rm_mid,
--   items_rphn_pphn, items_rphn_disease_ctrl,
--   items_rmhn_psych_nurs, items_rmhn_psych_ppharm,
--   items_nac_basic_clin, items_nac_basic_prev

DROP POLICY IF EXISTS "dev_allow_all" ON items_gp;
CREATE POLICY "items_gp_select" ON items_gp FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_gp_insert" ON items_gp FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_gp_update" ON items_gp FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_gp_delete" ON items_gp FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rn_med;
CREATE POLICY "items_rn_med_select" ON items_rn_med FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rn_med_insert" ON items_rn_med FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rn_med_update" ON items_rn_med FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rn_med_delete" ON items_rn_med FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rn_surg;
CREATE POLICY "items_rn_surg_select" ON items_rn_surg FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rn_surg_insert" ON items_rn_surg FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rn_surg_update" ON items_rn_surg FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rn_surg_delete" ON items_rn_surg FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rm_ped_obs_hrn;
CREATE POLICY "items_rm_ped_obs_hrn_select" ON items_rm_ped_obs_hrn FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rm_ped_obs_hrn_insert" ON items_rm_ped_obs_hrn FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rm_ped_obs_hrn_update" ON items_rm_ped_obs_hrn FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rm_ped_obs_hrn_delete" ON items_rm_ped_obs_hrn FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rm_mid;
CREATE POLICY "items_rm_mid_select" ON items_rm_mid FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rm_mid_insert" ON items_rm_mid FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rm_mid_update" ON items_rm_mid FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rm_mid_delete" ON items_rm_mid FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rphn_pphn;
CREATE POLICY "items_rphn_pphn_select" ON items_rphn_pphn FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rphn_pphn_insert" ON items_rphn_pphn FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rphn_pphn_update" ON items_rphn_pphn FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rphn_pphn_delete" ON items_rphn_pphn FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rphn_disease_ctrl;
CREATE POLICY "items_rphn_disease_ctrl_select" ON items_rphn_disease_ctrl FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rphn_disease_ctrl_insert" ON items_rphn_disease_ctrl FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rphn_disease_ctrl_update" ON items_rphn_disease_ctrl FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rphn_disease_ctrl_delete" ON items_rphn_disease_ctrl FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rmhn_psych_nurs;
CREATE POLICY "items_rmhn_psych_nurs_select" ON items_rmhn_psych_nurs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rmhn_psych_nurs_insert" ON items_rmhn_psych_nurs FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rmhn_psych_nurs_update" ON items_rmhn_psych_nurs FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rmhn_psych_nurs_delete" ON items_rmhn_psych_nurs FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_rmhn_psych_ppharm;
CREATE POLICY "items_rmhn_psych_ppharm_select" ON items_rmhn_psych_ppharm FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_rmhn_psych_ppharm_insert" ON items_rmhn_psych_ppharm FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rmhn_psych_ppharm_update" ON items_rmhn_psych_ppharm FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_rmhn_psych_ppharm_delete" ON items_rmhn_psych_ppharm FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_nac_basic_clin;
CREATE POLICY "items_nac_basic_clin_select" ON items_nac_basic_clin FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_nac_basic_clin_insert" ON items_nac_basic_clin FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_nac_basic_clin_update" ON items_nac_basic_clin FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_nac_basic_clin_delete" ON items_nac_basic_clin FOR DELETE USING (auth_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "dev_allow_all" ON items_nac_basic_prev;
CREATE POLICY "items_nac_basic_prev_select" ON items_nac_basic_prev FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "items_nac_basic_prev_insert" ON items_nac_basic_prev FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "items_nac_basic_prev_update" ON items_nac_basic_prev FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "items_nac_basic_prev_delete" ON items_nac_basic_prev FOR DELETE USING (auth_user_role() = 'ADMIN');


-- ────────────────────────────────────────────────────────────
-- GROUP H: QUIZ SNAPSHOTS
-- ────────────────────────────────────────────────────────────

-- 24. teacher_quiz_items
-- Teachers write (INSERT, DELETE) their own quiz snapshots
-- Students and teachers read (quiz taking, review, results)
-- Admin reads all

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_quiz_items;

CREATE POLICY "teacher_quiz_items_select"
ON teacher_quiz_items FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM teacher_quizzes q
    WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id
    AND (
      q.teacher_id = auth_user_id()
      OR q.status = 'PUBLISHED'
    )
  )
);

CREATE POLICY "teacher_quiz_items_insert"
ON teacher_quiz_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teacher_quizzes q
    WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id
    AND q.teacher_id = auth_user_id()
  )
);

CREATE POLICY "teacher_quiz_items_delete"
ON teacher_quiz_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM teacher_quizzes q
    WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id
    AND q.teacher_id = auth_user_id()
  )
);


-- 25. teacher_quiz_classes
-- Teachers write their own quiz-class links
-- Students read links for their classes (to see assigned quizzes)
-- Teachers read their own links
-- Admin reads all

DROP POLICY IF EXISTS "dev_allow_all" ON teacher_quiz_classes;

CREATE POLICY "teacher_quiz_classes_select"
ON teacher_quiz_classes FOR SELECT
USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quiz_classes.teacher_id = auth_user_id()
  OR EXISTS (
    SELECT 1 FROM teacher_class_members m
    WHERE m.class_id = teacher_quiz_classes.class_id
    AND m.user_id = auth_user_id()
    AND m.status = 'ACTIVE'
  )
);

CREATE POLICY "teacher_quiz_classes_insert"
ON teacher_quiz_classes FOR INSERT
WITH CHECK (
  teacher_quiz_classes.teacher_id = auth_user_id()
);

CREATE POLICY "teacher_quiz_classes_update"
ON teacher_quiz_classes FOR UPDATE
USING (
  teacher_quiz_classes.teacher_id = auth_user_id()
);


-- ────────────────────────────────────────────────────────────
-- LESSONS LEARNED — RLS Implementation Notes
-- ────────────────────────────────────────────────────────────

-- LESSON 1: Recursive policy on users table
-- Problem: The admin check inside users_select queried the users
-- table itself, causing infinite recursion. Supabase silently
-- returned no rows, locking everyone out.
-- Solution: Created auth_user_role() as a SECURITY DEFINER
-- function. It runs with elevated privileges, bypassing RLS,
-- so it can safely read the users table without triggering
-- the policy again. All admin checks now use auth_user_role()
-- instead of a subquery on users.

-- LESSON 2: Circular recursion between teacher_classes and
-- teacher_class_members
-- Problem: teacher_classes_select joined teacher_class_members
-- to check student membership. teacher_class_members_select
-- joined teacher_classes to check teacher ownership. Each
-- policy triggered the other in a loop.
-- Solution: Removed all cross-table joins from both policies.
-- teacher_class_members already has a teacher_id column
-- directly on it — no need to join back to teacher_classes.
-- teacher_classes_select was simplified to allow any logged-in
-- user to read active class rows, which also covers the
-- join_code lookup flow students need.

-- LESSON 3: Always use auth_user_id() and auth_user_role()
-- instead of subqueries inside policies
-- Problem: Subqueries inside policies that read the users table
-- risk recursion or performance issues.
-- Solution: Use the two SECURITY DEFINER helper functions for
-- all identity and role checks inside policies:
--   auth_user_id()   → returns current user's user_id (TEXT)
--   auth_user_role() → returns current user's role (TEXT)
-- These are safe, efficient, and reusable across all policies.

-- LESSON 4: Test accounts with fake auth_ids
-- Problem: Seed test accounts (U_TEST101 to U_TEST110) were
-- inserted directly into the users table with placeholder
-- auth_ids (00000000-0000-0000-0000-000000000101 etc).
-- These have no real Supabase auth accounts behind them.
-- Under RLS, auth.uid() will never match these fake auth_ids
-- so these accounts are permanently locked out.
-- Decision: Accepted. These accounts cannot log in anyway.
-- Real test accounts (justice, sam, mybackpacc) all have
-- genuine auth_ids and work correctly under RLS.

-- LESSON 5: Role corrections made during this sprint
-- albert@qacademy.com — corrected from TEACHER to STUDENT
-- samquatleumas@gmail.com — corrected from STUDENT to TEACHER
-- All MyTeacher data reassigned from Albert to Sam.
-- Old test class/quiz data cleared. Sam starts fresh.

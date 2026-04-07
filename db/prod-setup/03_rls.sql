-- ============================================================
-- PROD SETUP — Script 3 of 4: Enable RLS + Create Policies
-- Paste this into the prod Supabase SQL Editor and run.
-- MUST run AFTER Script 1 (tables) and Script 2 (functions).
-- ============================================================

-- ── Enable RLS on ALL 42 tables ─────────────────────────────

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notice_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_gp ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rn_med ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rn_surg ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rm_ped_obs_hrn ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rm_mid ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rphn_pphn ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rphn_disease_ctrl ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rmhn_psych_nurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_rmhn_psych_ppharm ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_nac_basic_clin ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_nac_basic_prev ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_quiz_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_quiz_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_library_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_requests ENABLE ROW LEVEL SECURITY;


-- ── GROUP A: REFERENCE / CATALOGUE DATA ─────────────────────

-- programs: public SELECT, admin writes
CREATE POLICY "programs_select" ON programs FOR SELECT USING (true);
CREATE POLICY "programs_insert" ON programs FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "programs_update" ON programs FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- courses: logged-in SELECT, admin writes
CREATE POLICY "courses_select" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "courses_insert" ON courses FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "courses_update" ON courses FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- levels: logged-in SELECT, admin writes
CREATE POLICY "levels_select" ON levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "levels_insert" ON levels FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "levels_update" ON levels FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- products: public SELECT, admin writes
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "products_update" ON products FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- config: logged-in SELECT, admin full CRUD
CREATE POLICY "config_select" ON config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "config_insert" ON config FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "config_update" ON config FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "config_delete" ON config FOR DELETE USING (auth_user_role() = 'ADMIN');

-- teacher_library_courses: logged-in SELECT, admin writes
CREATE POLICY "teacher_library_courses_select" ON teacher_library_courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_library_courses_insert" ON teacher_library_courses FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "teacher_library_courses_update" ON teacher_library_courses FOR UPDATE USING (auth_user_role() = 'ADMIN');


-- ── GROUP B: STUDENT-OWNED DATA ─────────────────────────────

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = auth_id OR auth_user_role() = 'ADMIN');
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = auth_id OR auth_user_role() = 'ADMIN');

-- subscriptions
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_id = subscriptions.user_id)
  OR auth_user_role() = 'ADMIN'
);
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND (u.user_id = subscriptions.user_id OR auth_user_role() = 'ADMIN'))
);
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- attempts
CREATE POLICY "attempts_select" ON attempts FOR SELECT USING (attempts.user_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "attempts_insert" ON attempts FOR INSERT WITH CHECK (attempts.user_id = auth_user_id());
CREATE POLICY "attempts_update" ON attempts FOR UPDATE USING (attempts.user_id = auth_user_id());

-- offline_packs
CREATE POLICY "offline_packs_select" ON offline_packs FOR SELECT USING (offline_packs.user_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "offline_packs_insert" ON offline_packs FOR INSERT WITH CHECK (offline_packs.user_id = auth_user_id());
CREATE POLICY "offline_packs_update" ON offline_packs FOR UPDATE USING (offline_packs.user_id = auth_user_id());

-- user_notice_state
CREATE POLICY "user_notice_state_select" ON user_notice_state FOR SELECT USING (user_notice_state.user_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "user_notice_state_insert" ON user_notice_state FOR INSERT WITH CHECK (user_notice_state.user_id = auth_user_id());
CREATE POLICY "user_notice_state_update" ON user_notice_state FOR UPDATE USING (user_notice_state.user_id = auth_user_id());


-- ── GROUP C: ADMIN-ONLY DATA ────────────────────────────────

-- payments: admin SELECT only, all writes via worker (service role)
CREATE POLICY "payments_select" ON payments FOR SELECT USING (auth_user_role() = 'ADMIN');


-- ── GROUP D: CONTENT (logged-in read, admin write) ──────────

-- announcements
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "announcements_update" ON announcements FOR UPDATE USING (auth_user_role() = 'ADMIN');
CREATE POLICY "announcements_delete" ON announcements FOR DELETE USING (auth_user_role() = 'ADMIN');

-- quizzes
CREATE POLICY "quizzes_select" ON quizzes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "quizzes_insert" ON quizzes FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "quizzes_update" ON quizzes FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- mock_quizzes
CREATE POLICY "mock_quizzes_select" ON mock_quizzes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mock_quizzes_insert" ON mock_quizzes FOR INSERT WITH CHECK (auth_user_role() = 'ADMIN');
CREATE POLICY "mock_quizzes_update" ON mock_quizzes FOR UPDATE USING (auth_user_role() = 'ADMIN');

-- items_* (all 11 tables)
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
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)', tbl || '_select', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth_user_role() = ''ADMIN'')', tbl || '_insert', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (auth_user_role() = ''ADMIN'')', tbl || '_update', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (auth_user_role() = ''ADMIN'')', tbl || '_delete', tbl);
  END LOOP;
END $$;


-- ── GROUP E: TEACHER-OWNED DATA ─────────────────────────────

-- teacher_profiles
CREATE POLICY "teacher_profiles_select" ON teacher_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_profiles_insert" ON teacher_profiles FOR INSERT WITH CHECK (teacher_profiles.teacher_id = auth_user_id());
CREATE POLICY "teacher_profiles_update" ON teacher_profiles FOR UPDATE USING (teacher_profiles.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');

-- teacher_bank_items
CREATE POLICY "teacher_bank_items_select" ON teacher_bank_items FOR SELECT USING (teacher_bank_items.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "teacher_bank_items_insert" ON teacher_bank_items FOR INSERT WITH CHECK (teacher_bank_items.teacher_id = auth_user_id());
CREATE POLICY "teacher_bank_items_update" ON teacher_bank_items FOR UPDATE USING (teacher_bank_items.teacher_id = auth_user_id());

-- teacher_classes
CREATE POLICY "teacher_classes_select" ON teacher_classes FOR SELECT USING (auth_user_role() = 'ADMIN' OR teacher_classes.teacher_id = auth_user_id() OR auth.uid() IS NOT NULL);
CREATE POLICY "teacher_classes_insert" ON teacher_classes FOR INSERT WITH CHECK (teacher_classes.teacher_id = auth_user_id());
CREATE POLICY "teacher_classes_update" ON teacher_classes FOR UPDATE USING (teacher_classes.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');

-- teacher_quizzes
CREATE POLICY "teacher_quizzes_select" ON teacher_quizzes FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quizzes.teacher_id = auth_user_id()
  OR (
    teacher_quizzes.status = 'PUBLISHED'
    AND EXISTS (
      SELECT 1 FROM teacher_quiz_classes tqc
      JOIN teacher_class_members m ON m.class_id = tqc.class_id
      WHERE tqc.teacher_quiz_id = teacher_quizzes.teacher_quiz_id
      AND m.user_id = auth_user_id()
      AND m.status = 'ACTIVE'
    )
  )
);
CREATE POLICY "teacher_quizzes_insert" ON teacher_quizzes FOR INSERT WITH CHECK (teacher_quizzes.teacher_id = auth_user_id());
CREATE POLICY "teacher_quizzes_update" ON teacher_quizzes FOR UPDATE USING (teacher_quizzes.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');

-- teacher_programmes
CREATE POLICY "teacher_programmes_select" ON teacher_programmes FOR SELECT USING (teacher_programmes.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "teacher_programmes_insert" ON teacher_programmes FOR INSERT WITH CHECK (teacher_programmes.teacher_id = auth_user_id());
CREATE POLICY "teacher_programmes_update" ON teacher_programmes FOR UPDATE USING (teacher_programmes.teacher_id = auth_user_id());

-- teacher_cohorts
CREATE POLICY "teacher_cohorts_select" ON teacher_cohorts FOR SELECT USING (teacher_cohorts.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "teacher_cohorts_insert" ON teacher_cohorts FOR INSERT WITH CHECK (teacher_cohorts.teacher_id = auth_user_id());
CREATE POLICY "teacher_cohorts_update" ON teacher_cohorts FOR UPDATE USING (teacher_cohorts.teacher_id = auth_user_id());

-- teacher_courses
CREATE POLICY "teacher_courses_select" ON teacher_courses FOR SELECT USING (teacher_courses.teacher_id = auth_user_id() OR auth_user_role() = 'ADMIN');
CREATE POLICY "teacher_courses_insert" ON teacher_courses FOR INSERT WITH CHECK (teacher_courses.teacher_id = auth_user_id());
CREATE POLICY "teacher_courses_update" ON teacher_courses FOR UPDATE USING (teacher_courses.teacher_id = auth_user_id());


-- ── GROUP F: SHARED ACCESS (TEACHER <-> STUDENT) ────────────

-- teacher_class_members
CREATE POLICY "teacher_class_members_select" ON teacher_class_members FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR teacher_class_members.user_id = auth_user_id()
  OR teacher_class_members.teacher_id = auth_user_id()
);
CREATE POLICY "teacher_class_members_insert" ON teacher_class_members FOR INSERT WITH CHECK (teacher_class_members.user_id = auth_user_id());
CREATE POLICY "teacher_class_members_update" ON teacher_class_members FOR UPDATE USING (
  auth_user_role() = 'ADMIN'
  OR teacher_class_members.user_id = auth_user_id()
  OR teacher_class_members.teacher_id = auth_user_id()
);

-- teacher_quiz_attempts
CREATE POLICY "teacher_quiz_attempts_select" ON teacher_quiz_attempts FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quiz_attempts.user_id = auth_user_id()
  OR teacher_quiz_attempts.teacher_id = auth_user_id()
);
CREATE POLICY "teacher_quiz_attempts_insert" ON teacher_quiz_attempts FOR INSERT WITH CHECK (teacher_quiz_attempts.user_id = auth_user_id());
CREATE POLICY "teacher_quiz_attempts_update" ON teacher_quiz_attempts FOR UPDATE USING (teacher_quiz_attempts.user_id = auth_user_id());


-- ── GROUP G: MESSAGING ──────────────────────────────────────

-- messages_threads
CREATE POLICY "messages_threads_select" ON messages_threads FOR SELECT USING (auth_user_role() = 'ADMIN' OR messages_threads.user_id = auth_user_id());
CREATE POLICY "messages_threads_insert" ON messages_threads FOR INSERT WITH CHECK (messages_threads.user_id = auth_user_id());
CREATE POLICY "messages_threads_update" ON messages_threads FOR UPDATE USING (auth_user_role() = 'ADMIN' OR messages_threads.user_id = auth_user_id());

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (SELECT 1 FROM messages_threads t WHERE t.thread_id = messages.thread_id AND t.user_id = auth_user_id())
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth_user_role() = 'ADMIN'
  OR EXISTS (SELECT 1 FROM messages_threads t WHERE t.thread_id = messages.thread_id AND t.user_id = auth_user_id())
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (SELECT 1 FROM messages_threads t WHERE t.thread_id = messages.thread_id AND t.user_id = auth_user_id())
);


-- ── GROUP H: QUIZ SNAPSHOTS ─────────────────────────────────

-- teacher_quiz_items
CREATE POLICY "teacher_quiz_items_select" ON teacher_quiz_items FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM teacher_quizzes q
    WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id
    AND (q.teacher_id = auth_user_id() OR q.status = 'PUBLISHED')
  )
);
CREATE POLICY "teacher_quiz_items_insert" ON teacher_quiz_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teacher_quizzes q WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id AND q.teacher_id = auth_user_id())
);
CREATE POLICY "teacher_quiz_items_delete" ON teacher_quiz_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM teacher_quizzes q WHERE q.teacher_quiz_id = teacher_quiz_items.teacher_quiz_id AND q.teacher_id = auth_user_id())
);

-- teacher_quiz_classes
CREATE POLICY "teacher_quiz_classes_select" ON teacher_quiz_classes FOR SELECT USING (
  auth_user_role() = 'ADMIN'
  OR teacher_quiz_classes.teacher_id = auth_user_id()
  OR EXISTS (SELECT 1 FROM teacher_class_members m WHERE m.class_id = teacher_quiz_classes.class_id AND m.user_id = auth_user_id() AND m.status = 'ACTIVE')
);
CREATE POLICY "teacher_quiz_classes_insert" ON teacher_quiz_classes FOR INSERT WITH CHECK (teacher_quiz_classes.teacher_id = auth_user_id());
CREATE POLICY "teacher_quiz_classes_update" ON teacher_quiz_classes FOR UPDATE USING (teacher_quiz_classes.teacher_id = auth_user_id());


-- ── GROUP I: SESSIONS & AUTH (locked down) ──────────────────

-- sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_id = sessions.user_id)
  OR auth_user_role() = 'ADMIN'
);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_id = sessions.user_id)
);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_id = sessions.user_id)
);

-- auth_events: NO policies — fully locked. Only RPCs can access.
-- reset_requests: NO policies — fully locked. Only RPCs can access.

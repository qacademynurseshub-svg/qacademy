// ============================================================
// QAcademy — guard.js
// Protects all pages that require login.
// Called as: const profile = await guardPage('STUDENT')
//                         or guardPage('TEACHER')
//                         or guardPage('ADMIN')
//
// Supported roles: STUDENT | TEACHER | ADMIN
//
// TEACHER check is two-level:
//   1. users.role === 'TEACHER'
//   2. teacher_profiles.active === true
// Both must pass. A teacher with active=false is pending/disabled
// and gets redirected to the access request page.
//
// ADMIN bypass: role=ADMIN always passes any guardPage() call
// regardless of requiredRole. Admin can access all pages.
// ============================================================

async function guardPage(requiredRole = null) {

  // ── 1. Check session ──────────────────────────────────────
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  // ── 2. Get user profile from users table ──────────────────
  const { data: profile } = await db
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .maybeSingle();

  if (!profile) {
    window.location.href = '/login.html';
    return null;
  }

  // ── 3. Check account is active ────────────────────────────
  if (!profile.active) {
    await db.auth.signOut();
    window.location.href = '/login.html';
    return null;
  }

  // ── 4. ADMIN bypass ───────────────────────────────────────
  // Admin can access any page regardless of requiredRole
  if (profile.role === 'ADMIN') {
    _notifySidebar(profile);
    return profile;
  }

  // ── 5. Role check ─────────────────────────────────────────
  if (requiredRole) {

    // ── 5a. TEACHER — two-level check ───────────────────────
    if (requiredRole === 'TEACHER') {

      // First level: role must be TEACHER
      if (profile.role !== 'TEACHER') {
        window.location.href = '/router.html';
        return null;
      }

      // Second level: teacher_profiles.active must be true
      const { data: teacherProfile } = await db
        .from('teacher_profiles')
        .select('active')
        .eq('teacher_id', profile.user_id)
        .maybeSingle();

      if (!teacherProfile || !teacherProfile.active) {
        // Has TEACHER role but not yet active — send to access request page
        window.location.href = '/myteacher/teacher/access-request.html';
        return null;
      }

      // Both checks passed — return full profile
      _notifySidebar(profile);
      return profile;
    }

    // ── 5b. STUDENT check ───────────────────────────────────
    if (requiredRole === 'STUDENT') {
      if (profile.role !== 'STUDENT' && profile.role !== 'TEACHER') {
        // TEACHER can also access student-facing myteacher pages
        // (e.g. /myteacher/student/my-classes.html as a student view)
        window.location.href = '/router.html';
        return null;
      }
      _notifySidebar(profile);
      return profile;
    }

    // ── 5c. Any other role mismatch ─────────────────────────
    if (profile.role !== requiredRole) {
      window.location.href = '/router.html';
      return null;
    }
  }

  _notifySidebar(profile);
  return profile;
}

// Auto-set avatar in sidebar/nav if the functions exist
function _notifySidebar(profile) {
  if (typeof window.sidebarSetUser === 'function') window.sidebarSetUser(profile);
  if (typeof window.mtSetUser === 'function') window.mtSetUser(profile);
}


// ============================================================
// logout()
// Signs out and redirects to login.
// Called by all pages via onclick="logout()"
// ============================================================
async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

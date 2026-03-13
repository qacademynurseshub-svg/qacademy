// QAcademy Guard - Protects all pages that require login
async function guardPage(requiredRole = null) {
  // Get current session from Supabase
  const { data: { session }, error } = await supabase.auth.getSession();

  // If no session, redirect to login
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  // Get user profile from users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  // If no profile found, redirect to login
  if (!profile) {
    window.location.href = '/login.html';
    return null;
  }

  // If account is inactive, redirect to login
  if (!profile.active) {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
    return null;
  }

  // If a specific role is required, check it
  if (requiredRole && profile.role !== requiredRole && profile.role !== 'ADMIN') {
    // Redirect to their correct dashboard
    if (profile.role === 'STUDENT') {
      window.location.href = '/student/dashboard.html';
    } else if (profile.role === 'TEACHER') {
      window.location.href = '/teacher/dashboard.html';
    } else {
      window.location.href = '/login.html';
    }
    return null;
  }

  return profile;
}

// Logout function - used by all pages
async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

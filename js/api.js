// ============================================================
// QAcademy — api.js
// Shared data access layer. All Supabase queries live here.
// Pages call these functions and use only the fields they need.
// ============================================================


// ------------------------------------------------------------
// PROGRAMMES
// Returns: array of { program_id, program_name }
// Used by: register page, admin filters, quiz builder
// ------------------------------------------------------------
async function getPrograms() {
  const { data, error } = await db
    .from('programs')
    .select('program_id, program_name')
    .order('program_name');

  if (error) { console.error('getPrograms:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// PRODUCTS (ACTIVE ONLY)
// Returns: array of all active products
// Used by: grant subscription modal, payment page, student-facing pages
// ------------------------------------------------------------
async function getProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) { console.error('getProducts:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// PRODUCTS (ALL — ADMIN ONLY)
// Returns: ALL products regardless of status (active + archived)
// Reason: admin products page needs to show and manage archived
//         products too. Student-facing pages use getProducts().
// Used by: admin/products.html, admin/subscriptions.html filters
// ------------------------------------------------------------
async function getAllProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('name');

  if (error) { console.error('getAllProducts:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// COURSES
// Returns: array of all active course fields
// Used by: student dashboard, quiz builder, admin courses
// ------------------------------------------------------------
async function getCourses() {
  const { data, error } = await db
    .from('courses')
    .select('*')
    .eq('status', 'active')
    .order('title');

  if (error) { console.error('getCourses:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// COURSES (ALL — ADMIN ONLY)
// Returns: ALL courses regardless of status (active, draft, archived)
// Reason: admin courses page needs to show and manage all statuses.
//         Student-facing pages use getCourses().
// Used by: admin/courses.html
// ------------------------------------------------------------
async function getAllCourses() {
  const { data, error } = await db
    .from('courses')
    .select('*')
    .order('title');

  if (error) { console.error('getAllCourses:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// USERS — LIST
// Returns: lighter list-level data for all users
// Reason: loading full data for hundreds of users is wasteful
// searchTerm: matches name or email (leave blank for all)
// roleFilter: 'STUDENT' | 'TEACHER' | 'ADMIN' | '' for all
// programFilter: program_id | '' for all
// Used by: admin users page, admin subscriptions page
// ------------------------------------------------------------
async function getUsers(searchTerm = '', roleFilter = '', programFilter = '') {
  let query = db
    .from('users')
    .select(`
      user_id,
      name,
      forename,
      surname,
      email,
      role,
      program_id,
      active,
      created_utc,
      level,
      cohort
    `)
    .order('created_utc', { ascending: false });

  if (roleFilter) query = query.eq('role', roleFilter);
  if (programFilter) query = query.eq('program_id', programFilter);

  const { data, error } = await query;
  if (error) { console.error('getUsers:', error); return []; }

  // Text search done client-side (simple and works on free tier)
  let users = data || [];
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    users = users.filter(u =>
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.forename && u.forename.toLowerCase().includes(term)) ||
      (u.surname && u.surname.toLowerCase().includes(term))
    );
  }

  return users;
}


// ------------------------------------------------------------
// USER — SINGLE (FULL DETAIL)
// Returns: complete user object including:
//   - all user profile fields
//   - active subscription (with product details)
//   - full subscription history
// Pages pick only the fields they need from this
// Used by: admin user panel, student dashboard, messaging
// ------------------------------------------------------------
async function getUserById(userId) {
  // Full user profile
  const { data: user, error: userError } = await db
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError || !user) {
    console.error('getUserById - user not found:', userError);
    return null;
  }

  // Active subscription with full product details joined
  const { data: activeSubscription } = await db
    .from('subscriptions')
    .select(`
      *,
      products (
        product_id,
        name,
        kind,
        duration_days,
        price_minor,
        currency,
        courses_included,
        telegram_group_keys
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('expires_utc', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Full subscription history (all past and current)
  const { data: subscriptionHistory } = await db
    .from('subscriptions')
    .select(`
      *,
      products ( name, kind )
    `)
    .eq('user_id', userId)
    .order('start_utc', { ascending: false });

  // Return everything together — pages use what they need
  return {
    ...user,
    activeSubscription: activeSubscription || null,
    subscriptionHistory: subscriptionHistory || []
  };
}


// ------------------------------------------------------------
// ASSIGN SUBSCRIPTION
// Grants a product subscription to a user
// Calculates expiry automatically from product.duration_days
// Returns: { success: true, subscriptionId } or { success: false, message }
// Used by: admin users page, admin subscriptions page
// ------------------------------------------------------------
async function assignSubscription(userId, productId, startDate = null) {
  // Get product to calculate expiry date and kind
  const { data: product, error: productError } = await db
    .from('products')
    .select('duration_days, kind')
    .eq('product_id', productId)
    .maybeSingle();

  if (productError || !product) {
    return { success: false, message: 'Product not found.' };
  }

  const start = startDate ? new Date(startDate) : new Date();
  const expires = new Date(start);
  expires.setDate(expires.getDate() + product.duration_days);

  const subscriptionId = 'SUB_' + Math.random().toString(36).substr(2, 9).toUpperCase();

  const { error } = await db
    .from('subscriptions')
    .insert({
      subscription_id : subscriptionId,
      user_id         : userId,
      product_id      : productId,
      start_utc       : start.toISOString(),
      expires_utc     : expires.toISOString(),
      status          : product.kind === 'ACTIVE',
      source          : 'ADMIN',
      source_ref      : 'admin_grant',
      expiry_reminded : false
    });

  if (error) {
    console.error('assignSubscription:', error);
    return { success: false, message: error.message };
  }

  return { success: true, subscriptionId };
}


// ------------------------------------------------------------
// USER ACCOUNT ACTIONS
// All return: { success: true } or { success: false, message }
// ------------------------------------------------------------

// Deactivate — user can no longer log in
async function deactivateUser(userId) {
  const { error } = await db
    .from('users')
    .update({ active: false })
    .eq('user_id', userId);

  if (error) { console.error('deactivateUser:', error); return { success: false, message: error.message }; }
  return { success: true };
}

// Reactivate a previously deactivated account
async function activateUser(userId) {
  const { error } = await db
    .from('users')
    .update({ active: true })
    .eq('user_id', userId);

  if (error) { console.error('activateUser:', error); return { success: false, message: error.message }; }
  return { success: true };
}

// Send password reset email via Supabase Auth
async function sendPasswordReset(email) {
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://qacademy-gamma.pages.dev/reset-password.html'
  });

  if (error) { console.error('sendPasswordReset:', error); return { success: false, message: error.message }; }
  return { success: true };
}

// Update any fields on a user profile
// fields: object of column:value pairs e.g. { role: 'TEACHER', level: 'L300' }
async function updateUserProfile(userId, fields) {
  const { error } = await db
    .from('users')
    .update(fields)
    .eq('user_id', userId);

  if (error) { console.error('updateUserProfile:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// ANNOUNCEMENTS
// Returns: all active, in-schedule announcements
// Ordered: pinned first, then by priority
// Used by: student dashboard, announcements page
// ------------------------------------------------------------
async function getAnnouncements() {
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('announcements')
    .select('*')
    .eq('status', 'active')
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('pinned', { ascending: false })
    .order('priority', { ascending: false });

  if (error) { console.error('getAnnouncements:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// DISMISSED ANNOUNCEMENTS
// Returns: array of announcement IDs the user has dismissed
// Used by: student dashboard, announcements page
// ------------------------------------------------------------
async function getDismissedAnnouncements(userId) {
  const { data, error } = await db
    .from('user_notice_state')
    .select('item_id')
    .eq('user_id', userId)
    .eq('state', 'dismissed');

  if (error) { console.error('getDismissedAnnouncements:', error); return []; }
  return data ? data.map(d => d.item_id) : [];
}


// ------------------------------------------------------------
// STUDENT COURSE ACCESS
// Returns a map of every course the student can access,
// with stacked expiry calculated from ALL active subscriptions.
//
// Logic:
// - Fetch all ACTIVE subscriptions
// - For each subscription, loop through courses_included
// - For each course, sum remaining days across all subs
// - Return map: { course_id: { days, expires, label } }
//
// Used by: student dashboard, course pages
// ------------------------------------------------------------
async function getStudentCourseAccess(userId) {
  const now = new Date();

  // Fetch all active subscriptions with product details
  const { data: subscriptions, error } = await db
    .from('subscriptions')
    .select(`
      *,
      products (
        product_id,
        name,
        kind,
        courses_included
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  if (error) { console.error('getStudentCourseAccess:', error); return {}; }
  if (!subscriptions || subscriptions.length === 0) return {};

  // Build course access map
  // For each course, accumulate remaining days from every
  // active subscription that includes it
  const courseMap = {};

  subscriptions.forEach(sub => {
    if (!sub.products?.courses_included) return;

    const subExpiry      = new Date(sub.expires_utc);
    const remainingMs    = subExpiry - now;
    const remainingDays  = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    // Skip expired subscriptions (safety check)
    if (remainingDays === 0) return;

    sub.products.courses_included.forEach(courseId => {
      if (!courseMap[courseId]) {
        // First subscription covering this course
        courseMap[courseId] = {
          totalDays: remainingDays,
          // Expiry = today + total stacked days
          expires: new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000)
        };
      } else {
        // Stack on top of existing days for this course
        courseMap[courseId].totalDays += remainingDays;
        courseMap[courseId].expires = new Date(
          now.getTime() + courseMap[courseId].totalDays * 24 * 60 * 60 * 1000
        );
      }
    });
  });

  return courseMap;
}

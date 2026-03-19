// ============================================================
// teacher-api.js
// Teacher Assess data layer — loaded only by /myteacher/* pages
// Requires: db from js/config.js (loaded before this file)
//
// Slice 3: Classes
// ============================================================


// ── ID generators ────────────────────────────────────────────

function makeClassId() {
  return 'CLS_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function makeJoinCode() {
  // 6-character alphanumeric, uppercase, easy to read/type
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function makeClassMemberId() {
  return 'MBR_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}


// ── Custom field key normaliser ───────────────────────────────
// Converts a label like "Index Number" → "index_number"
// Ensures uniqueness within the field set

function normaliseFieldKey(label, usedKeys) {
  let key = String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  if (!key) key = 'field';
  const base = key;
  let suffix = 1;
  while (usedKeys && usedKeys[key]) {
    key = base + '_' + suffix;
    suffix++;
  }
  return key;
}


// ── buildCustomFieldsJson ─────────────────────────────────────
// Takes raw modal fields array, normalises keys, drops blanks
// Returns JSON string ready to store in teacher_classes

function buildCustomFieldsJson(fields) {
  const used = {};
  const out  = [];
  (fields || []).forEach(f => {
    const label = String(f.label || '').trim();
    if (!label) return;
    const key = normaliseFieldKey(label, used);
    used[key] = true;
    out.push({ key, label, required: !!f.required });
  });
  return JSON.stringify(out);
}


// ============================================================
// CLASSES
// ============================================================

// ------------------------------------------------------------
// GET TEACHER CLASSES
// Returns all classes for this teacher, newest first
// Used by: myteacher/teacher/classes.html
// ------------------------------------------------------------
async function getTeacherClasses(teacherId, { statusFilter = '' } = {}) {
  let query = db
    .from('teacher_classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) { console.error('getTeacherClasses:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// GET SINGLE CLASS
// Used by: classes.html detail panel
// ------------------------------------------------------------
async function getClassById(classId) {
  const { data, error } = await db
    .from('teacher_classes')
    .select('*')
    .eq('class_id', classId)
    .maybeSingle();

  if (error) { console.error('getClassById:', error); return null; }
  return data;
}


// ------------------------------------------------------------
// CREATE CLASS
// Generates class_id and join_code client-side
// Returns the created row
// Used by: myteacher/teacher/classes.html
// ------------------------------------------------------------
async function createClass(teacherId, title, customFieldsJson) {
  const now     = new Date().toISOString();
  const classId = makeClassId();
  const joinCode = makeJoinCode();

  const { data, error } = await db
    .from('teacher_classes')
    .insert({
      class_id          : classId,
      teacher_id        : teacherId,
      title             : title,
      join_code         : joinCode,
      custom_fields_json: customFieldsJson || '[]',
      status            : 'ACTIVE',
      created_at        : now,
      updated_at        : now
    })
    .select()
    .single();

  if (error) { console.error('createClass:', error); return { success: false, message: error.message }; }
  return { success: true, data };
}


// ------------------------------------------------------------
// UPDATE CLASS
// Updates title, status, and/or custom_fields_json
// Used by: myteacher/teacher/classes.html edit modal
// ------------------------------------------------------------
async function updateClass(classId, fields) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_classes')
    .update({ ...fields, updated_at: now })
    .eq('class_id', classId);

  if (error) { console.error('updateClass:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// REGENERATE JOIN CODE
// Replaces the join_code with a fresh one
// Old code immediately stops working
// Used by: myteacher/teacher/classes.html
// ------------------------------------------------------------
async function regenerateJoinCode(classId) {
  const newCode = makeJoinCode();
  const now     = new Date().toISOString();

  const { data, error } = await db
    .from('teacher_classes')
    .update({ join_code: newCode, updated_at: now })
    .eq('class_id', classId)
    .select('join_code')
    .single();

  if (error) { console.error('regenerateJoinCode:', error); return { success: false, message: error.message }; }
  return { success: true, join_code: data.join_code };
}


// ============================================================
// CLASS MEMBERS
// ============================================================

// ------------------------------------------------------------
// GET CLASS MEMBERS
// Returns members for a given class
// statusFilter: 'ACTIVE' | 'REMOVED' | 'ALL'
// Used by: myteacher/teacher/classes.html member roster
// ------------------------------------------------------------
async function getClassMembers(classId, { statusFilter = 'ACTIVE' } = {}) {
  let query = db
    .from('teacher_class_members')
    .select('*')
    .eq('class_id', classId)
    .order('joined_at', { ascending: false });

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) { console.error('getClassMembers:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// REMOVE MEMBER
// Sets status to REMOVED — does not delete the row
// Keeps the record for audit / results history
// Used by: myteacher/teacher/classes.html
// ------------------------------------------------------------
async function removeMember(classId, userId) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_class_members')
    .update({ status: 'REMOVED', updated_at: now })
    .eq('class_id', classId)
    .eq('user_id', userId);

  if (error) { console.error('removeMember:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// GET MEMBER COUNT PER CLASS (batch)
// Takes an array of class_ids
// Returns a map: { class_id: count }
// Used by: classes.html list — shows member count on each card
// ------------------------------------------------------------
async function getMemberCounts(classIds) {
  if (!classIds || !classIds.length) return {};

  const { data, error } = await db
    .from('teacher_class_members')
    .select('class_id')
    .in('class_id', classIds)
    .eq('status', 'ACTIVE');

  if (error) { console.error('getMemberCounts:', error); return {}; }

  const counts = {};
  (data || []).forEach(row => {
    counts[row.class_id] = (counts[row.class_id] || 0) + 1;
  });
  return counts;
}


// ============================================================
// Slice 4: Student — My Classes
// ============================================================

// ------------------------------------------------------------
// GET STUDENT CLASSES
// Returns all active class memberships for a student,
// with the class details joined in a single query.
// Used by: myteacher/student/my-classes.html
// ------------------------------------------------------------
async function getStudentClasses(userId) {
  const { data, error } = await db
    .from('teacher_class_members')
    .select(`
      *,
      teacher_classes (
        class_id,
        title,
        join_code,
        status,
        custom_fields_json,
        teacher_id,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('joined_at', { ascending: false });

  if (error) { console.error('getStudentClasses:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// GET CLASS BY JOIN CODE
// Validates a join code and returns the class if found and active.
// Returns null if not found or archived.
// Used by: myteacher/student/my-classes.html join flow
// ------------------------------------------------------------
async function getClassByJoinCode(joinCode) {
  const { data, error } = await db
    .from('teacher_classes')
    .select('*')
    .eq('join_code', String(joinCode || '').trim().toUpperCase())
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) { console.error('getClassByJoinCode:', error); return null; }
  return data;
}


// ------------------------------------------------------------
// CHECK IF STUDENT ALREADY MEMBER
// Returns the existing membership row or null.
// Used by: join flow — prevent duplicate joins
// ------------------------------------------------------------
async function getExistingMembership(userId, classId) {
  const { data, error } = await db
    .from('teacher_class_members')
    .select('class_id, status')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .maybeSingle();

  if (error) { console.error('getExistingMembership:', error); return null; }
  return data;
}


// ------------------------------------------------------------
// JOIN CLASS
// Inserts a new row into teacher_class_members.
// memberFieldsJson: JSON string of { key: value } pairs
// Returns { success, message }
// Used by: myteacher/student/my-classes.html
// ------------------------------------------------------------
async function joinClass(userId, classId, teacherId, displayName, email, memberFieldsJson) {
  const now      = new Date().toISOString();
  const memberId = makeClassMemberId();  // ← was missing

  const { error } = await db
    .from('teacher_class_members')
    .insert({
      member_id         : memberId,       // ← add this line
      class_id          : classId,
      user_id           : userId,
      teacher_id        : teacherId,
      display_name      : displayName || '',
      email             : email || '',
      member_fields_json: memberFieldsJson || '{}',
      status            : 'ACTIVE',
      joined_at         : now,
      updated_at        : now
    });

  if (error) { console.error('joinClass:', error); return { success: false, message: error.message }; }
  return { success: true };
}

// ------------------------------------------------------------
// UPDATE MEMBER PROFILE
// Updates the member_fields_json for an existing membership.
// memberFieldsJson: JSON string of { key: value } pairs
// Used by: myteacher/student/my-classes.html profile tab
// ------------------------------------------------------------
async function updateMemberProfile(classId, userId, memberFieldsJson) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_class_members')
    .update({
      member_fields_json: memberFieldsJson,
      updated_at        : now
    })
    .eq('class_id', classId)
    .eq('user_id', userId);

  if (error) { console.error('updateMemberProfile:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ============================================================
// Slice 5: Teacher Question Bank
// ============================================================

// ------------------------------------------------------------
// GET BANK FILTER OPTIONS
// Returns distinct subject, maintopic, subtopic values
// from this teacher's bank — used to populate the three
// filter dropdowns dynamically.
// Called on page load and after every save so new tags
// appear immediately without a full page refresh.
// Used by: myteacher/teacher/bank.html
// ------------------------------------------------------------
async function getBankFilterOptions(teacherId) {
  const { data, error } = await db
    .from('teacher_bank_items')
    .select('subject, maintopic, subtopic')
    .eq('teacher_id', teacherId)
    .neq('status', 'ARCHIVED');   // only surface tags from active items

  if (error) { console.error('getBankFilterOptions:', error); return { subjects: [], maintopics: [], subtopics: [] }; }

  const subjects   = [...new Set((data || []).map(r => r.subject).filter(Boolean))].sort();
  const maintopics = [...new Set((data || []).map(r => r.maintopic).filter(Boolean))].sort();
  const subtopics  = [...new Set((data || []).map(r => r.subtopic).filter(Boolean))].sort();

  return { subjects, maintopics, subtopics };
}


// ------------------------------------------------------------
// GET BANK ITEMS
// Fetches all items for this teacher with optional filters.
// All columns are returned — the card list renders full
// stem, all options, rationale, and image.
//
// filters: {
//   status      — 'ACTIVE' | 'ARCHIVED' | 'ALL'  (default: 'ACTIVE')
//   subject     — exact match string or ''
//   maintopic   — exact match string or ''
//   subtopic    — exact match string or ''
//   difficulty  — 'Easy' | 'Moderate' | 'Hard' or ''
//   keyword     — substring search against stem
// }
//
// Results ordered by updated_at DESC so most recently
// edited items appear first.
// Used by: myteacher/teacher/bank.html
// ------------------------------------------------------------
async function getBankItems(teacherId, filters = {}) {
  const {
    status     = 'ACTIVE',
    subject    = '',
    maintopic  = '',
    subtopic   = '',
    difficulty = '',
    keyword    = ''
  } = filters;

  let query = db
    .from('teacher_bank_items')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('updated_at', { ascending: false });

  // Status filter — ALL means no status constraint
  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  if (subject)    query = query.eq('subject',   subject);
  if (maintopic)  query = query.eq('maintopic', maintopic);
  if (subtopic)   query = query.eq('subtopic',  subtopic);
  if (difficulty) query = query.eq('difficulty', difficulty);

  // Keyword: case-insensitive substring match on stem
  // ilike is Supabase's case-insensitive LIKE
  if (keyword) query = query.ilike('stem', `%${keyword}%`);

  const { data, error } = await query;
  if (error) { console.error('getBankItems:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// GET SINGLE BANK ITEM
// Fetches one full row by bank_item_id.
// Called when opening the editor for an existing item —
// ensures the form always has fresh data, not stale list cache.
// Returns null if not found.
// Used by: myteacher/teacher/bank.html editor
// ------------------------------------------------------------
async function getBankItem(bankItemId) {
  const { data, error } = await db
    .from('teacher_bank_items')
    .select('*')
    .eq('bank_item_id', bankItemId)
    .maybeSingle();

  if (error) { console.error('getBankItem:', error); return null; }
  return data;
}


// ------------------------------------------------------------
// CREATE BANK ITEM
// Inserts a new question into teacher_bank_items.
// bank_item_id is generated here as TBANK_ + Date.now()
// so the page can show the ID before the save completes.
// source_type is always 'TEACHER' for manually created items.
// Returns { success, item } on success or { success: false, message }
// Used by: myteacher/teacher/bank.html editor
// ------------------------------------------------------------
async function createBankItem(teacherId, payload) {
  const now        = new Date().toISOString();
  const bankItemId = 'TBANK_' + Date.now();

  const row = {
    bank_item_id   : bankItemId,
    teacher_id     : teacherId,
    status         : 'ACTIVE',
    source_type    : 'TEACHER',
    created_at     : now,
    updated_at     : now,

    // question fields — spread from payload
    question_type  : payload.question_type  || 'MCQ',
    stem           : payload.stem,
    option_a       : payload.option_a       || null,
    fb_a           : payload.fb_a           || null,
    option_b       : payload.option_b       || null,
    fb_b           : payload.fb_b           || null,
    option_c       : payload.option_c       || null,
    fb_c           : payload.fb_c           || null,
    option_d       : payload.option_d       || null,
    fb_d           : payload.fb_d           || null,
    option_e       : payload.option_e       || null,
    fb_e           : payload.fb_e           || null,
    option_f       : payload.option_f       || null,
    fb_f           : payload.fb_f           || null,
    correct        : payload.correct,
    rationale      : payload.rationale      || null,
    rationale_img  : payload.rationale_img  || null,
    subject        : payload.subject        || null,
    maintopic      : payload.maintopic      || null,
    subtopic       : payload.subtopic       || null,
    difficulty     : payload.difficulty     || null,
    marks          : payload.marks          || 1,
    shuffle_options: payload.shuffle_options !== undefined ? payload.shuffle_options : true,
  };

  const { data, error } = await db
    .from('teacher_bank_items')
    .insert(row)
    .select('*')
    .single();

  if (error) { console.error('createBankItem:', error); return { success: false, message: error.message }; }
  return { success: true, item: data };
}


// ------------------------------------------------------------
// UPDATE BANK ITEM
// Applies a patch (only the changed fields) to an existing row.
// Always updates updated_at.
// The page builds the patch by comparing form values to the
// original loaded item — only sends what changed.
// Returns { success } or { success: false, message }
// Used by: myteacher/teacher/bank.html editor
// ------------------------------------------------------------
async function updateBankItem(bankItemId, patch) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_bank_items')
    .update({ ...patch, updated_at: now })
    .eq('bank_item_id', bankItemId);

  if (error) { console.error('updateBankItem:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// ARCHIVE / RESTORE BANK ITEM
// Soft operation — sets status to ARCHIVED or back to ACTIVE.
// Never deletes rows (audit trail, snapshot integrity).
// action: 'ARCHIVE' | 'RESTORE'
// Returns { success } or { success: false, message }
// Used by: myteacher/teacher/bank.html card footer + editor
// ------------------------------------------------------------
async function setArchiveBankItem(bankItemId, action) {
  const newStatus = action === 'RESTORE' ? 'ACTIVE' : 'ARCHIVED';
  const now       = new Date().toISOString();

  const { error } = await db
    .from('teacher_bank_items')
    .update({ status: newStatus, updated_at: now })
    .eq('bank_item_id', bankItemId);

  if (error) { console.error('setArchiveBankItem:', error); return { success: false, message: error.message }; }
  return { success: true, newStatus };
}


// ------------------------------------------------------------
// APPEND TO DRAFT ITEMS  (Picker mode)
// Used when the teacher picks questions from the bank and
// adds them to a quiz draft in the quiz manager.
//
// Fetches the current draft_items_json from teacher_quizzes,
// merges in the new bankItemIds (appending, no duplicates),
// writes back.
//
// draft_items_json shape: { items: ["TBANK_001", "TBANK_002", ...] }
// The items array is an ordered list of bank_item_ids that
// the quiz builder uses to build its question list.
//
// Returns { success, added, skipped, total }
// — added:   how many new IDs were appended
// — skipped: how many were already in the draft
// — total:   new total item count in the draft
//
// Used by: myteacher/teacher/bank.html (picker mode dock)
// Wired into: myteacher/teacher/quizzes.html in Slice 6
// ------------------------------------------------------------
async function appendToDraftItems(teacherQuizId, bankItemIds) {
  if (!teacherQuizId || !bankItemIds || !bankItemIds.length) {
    return { success: false, message: 'Missing quiz ID or item IDs.' };
  }

  // 1. Fetch the current quiz row — we only need draft_items_json
  const { data: quiz, error: fetchError } = await db
    .from('teacher_quizzes')
    .select('draft_items_json, status')
    .eq('teacher_quiz_id', teacherQuizId)
    .maybeSingle();

  if (fetchError) { console.error('appendToDraftItems fetch:', fetchError); return { success: false, message: fetchError.message }; }
  if (!quiz)      { return { success: false, message: 'Quiz not found.' }; }
  if (quiz.status === 'PUBLISHED') { return { success: false, message: 'Cannot edit a published quiz.' }; }

  // 2. Parse existing draft items
  let existingItems = [];
  try {
    const parsed = typeof quiz.draft_items_json === 'string'
      ? JSON.parse(quiz.draft_items_json)
      : (quiz.draft_items_json || {});
    existingItems = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (_) {
    existingItems = [];
  }

  // 3. Merge — append new IDs, skip duplicates, preserve order
  const existingSet = new Set(existingItems.map(id => String(id).trim()));
  let added   = 0;
  let skipped = 0;

  bankItemIds.forEach(id => {
    id = String(id || '').trim();
    if (!id) return;
    if (existingSet.has(id)) {
      skipped++;
    } else {
      existingSet.add(id);
      existingItems.push(id);
      added++;
    }
  });

  const total = existingItems.length;

  // 4. Write back
  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from('teacher_quizzes')
    .update({
      draft_items_json: JSON.stringify({ items: existingItems }),
      updated_at      : now
    })
    .eq('teacher_quiz_id', teacherQuizId);

  if (updateError) { console.error('appendToDraftItems update:', updateError); return { success: false, message: updateError.message }; }

  return { success: true, added, skipped, total };
}


// ============================================================
// Slice 6: Teacher Quizzes
// ============================================================

// ── ID generators ───────────────────────────────────────────

function makeQuizId() {
  return 'TQ_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function makeAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function makeQuizItemId() {
  return 'TQI_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function makeQuizClassId() {
  return 'TQC_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}


// ── QUERY FUNCTIONS ─────────────────────────────────────────

// ------------------------------------------------------------
// GET TEACHER QUIZZES
// Lists all quizzes for this teacher with optional filters.
// Used by: myteacher/teacher/quizzes.html list view
// ------------------------------------------------------------
async function getTeacherQuizzes(teacherId, { statusFilter = '', keyword = '' } = {}) {
  let query = db
    .from('teacher_quizzes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('updated_at', { ascending: false });

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }
  if (keyword) {
    query = query.ilike('title', `%${keyword}%`);
  }

  const { data, error } = await query;
  if (error) { console.error('getTeacherQuizzes:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// GET SINGLE TEACHER QUIZ
// Returns the full quiz row or null.
// Used by: quizzes.html editor — loaded when opening a tile
// ------------------------------------------------------------
async function getTeacherQuiz(quizId) {
  const { data, error } = await db
    .from('teacher_quizzes')
    .select('*')
    .eq('teacher_quiz_id', quizId)
    .maybeSingle();

  if (error) { console.error('getTeacherQuiz:', error); return null; }
  return data;
}


// ------------------------------------------------------------
// GET DRAFT PREVIEW
// Resolves the draft_items_json into full bank item rows.
// Returns { items: [...bankItemRows], missing: [...ids] }
// Used by: quizzes.html — "Load Details" button on draft list
// ------------------------------------------------------------
async function getDraftPreview(quizId) {
  const quiz = await getTeacherQuiz(quizId);
  if (!quiz) return { items: [], missing: [] };

  let ids = [];
  try {
    const parsed = typeof quiz.draft_items_json === 'object'
      ? quiz.draft_items_json
      : JSON.parse(quiz.draft_items_json || '{}');
    ids = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (_) { ids = []; }

  if (!ids.length) return { items: [], missing: [] };

  const { data, error } = await db
    .from('teacher_bank_items')
    .select('*')
    .in('bank_item_id', ids);

  if (error) { console.error('getDraftPreview:', error); return { items: [], missing: ids }; }

  const found = new Map((data || []).map(r => [r.bank_item_id, r]));
  const items = [];
  const missing = [];
  ids.forEach(id => {
    if (found.has(id)) items.push(found.get(id));
    else missing.push(id);
  });

  return { items, missing };
}


// ------------------------------------------------------------
// GET QUIZ CLASSES
// Returns ACTIVE links with joined class details.
// Used by: quizzes.html Classes tab — pre-check linked classes
// ------------------------------------------------------------
async function getQuizClasses(quizId) {
  const { data, error } = await db
    .from('teacher_quiz_classes')
    .select(`
      tqc_id,
      teacher_quiz_id,
      class_id,
      status,
      teacher_classes (
        class_id,
        title,
        status
      )
    `)
    .eq('teacher_quiz_id', quizId)
    .eq('status', 'ACTIVE');

  if (error) { console.error('getQuizClasses:', error); return []; }
  return data || [];
}


// ------------------------------------------------------------
// GET QUIZ PUBLISHED ITEM COUNT
// Returns the number of snapshot rows in teacher_quiz_items.
// Used by: quiz tiles — shows "Items: 12" on published quizzes
// ------------------------------------------------------------
async function getQuizPublishedItemCount(quizId) {
  const { count, error } = await db
    .from('teacher_quiz_items')
    .select('quiz_item_id', { count: 'exact', head: true })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('getQuizPublishedItemCount:', error); return 0; }
  return count || 0;
}


// ── MUTATION FUNCTIONS ──────────────────────────────────────

// ------------------------------------------------------------
// CREATE TEACHER QUIZ
// Inserts a new DRAFT quiz with generated ID and access code.
// payload: { title, subject, preset, duration_minutes, ... }
// Returns { success, data } or { success: false, message }
// Used by: quizzes.html — "New Quiz" → Save
// ------------------------------------------------------------
async function createTeacherQuiz(teacherId, payload) {
  const now    = new Date().toISOString();
  const quizId = makeQuizId();
  const code   = makeAccessCode();

  const row = {
    teacher_quiz_id       : quizId,
    teacher_id            : teacherId,
    title                 : payload.title,
    subject               : payload.subject           || null,
    preset                : payload.preset             || 'EXAM',
    duration_minutes      : payload.duration_minutes   ?? 0,
    shuffle_questions     : payload.shuffle_questions  ?? false,
    shuffle_options       : payload.shuffle_options    ?? true,
    max_attempts          : payload.max_attempts       ?? 1,
    show_review           : payload.show_review        ?? false,
    show_results          : payload.show_results       ?? true,
    results_release_policy: payload.results_release_policy || 'MANUAL',
    results_released      : false,
    results_released_at   : null,
    open_at               : payload.open_at            || null,
    close_at              : payload.close_at           || null,
    status                : 'DRAFT',
    access_code           : code,
    custom_fields_json    : payload.custom_fields_json || { fields: [] },
    draft_items_json      : { items: [] },
    grading_policy        : 'BANDS_PCT',
    grade_bands_json      : payload.grade_bands_json   || { bands: [
      { min_pct: 0,  label: 'Fail' },
      { min_pct: 50, label: 'Pass' },
      { min_pct: 65, label: 'Merit' },
      { min_pct: 80, label: 'Distinction' }
    ]},
    pass_threshold_pct    : payload.pass_threshold_pct ?? 50,
    score_display_policy  : payload.score_display_policy || 'RAW_AND_PCT',
    created_at            : now,
    updated_at            : now
  };

  const { data, error } = await db
    .from('teacher_quizzes')
    .insert(row)
    .select()
    .single();

  if (error) { console.error('createTeacherQuiz:', error); return { success: false, message: error.message }; }
  return { success: true, data };
}


// ------------------------------------------------------------
// UPDATE TEACHER QUIZ
// Patch update — only send changed fields.
// Always stamps updated_at.
// Returns { success } or { success: false, message }
// Used by: quizzes.html — Save settings, draft save, etc.
// ------------------------------------------------------------
async function updateTeacherQuiz(quizId, patch) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_quizzes')
    .update({ ...patch, updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('updateTeacherQuiz:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// ARCHIVE TEACHER QUIZ
// Sets status to ARCHIVED. Works on DRAFT or PUBLISHED.
// One-way — no unarchive.
// Used by: quizzes.html Publish tab
// ------------------------------------------------------------
async function archiveTeacherQuiz(quizId) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_quizzes')
    .update({ status: 'ARCHIVED', updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('archiveTeacherQuiz:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// REMOVE FROM DRAFT ITEMS
// Removes a single bank_item_id from the draft_items_json.
// Used by: quizzes.html — Remove button on draft list
// ------------------------------------------------------------
async function removeFromDraftItems(quizId, bankItemId) {
  const { data: quiz, error: fetchErr } = await db
    .from('teacher_quizzes')
    .select('draft_items_json')
    .eq('teacher_quiz_id', quizId)
    .maybeSingle();

  if (fetchErr || !quiz) return { success: false, message: fetchErr?.message || 'Quiz not found.' };

  let items = [];
  try {
    const parsed = typeof quiz.draft_items_json === 'object'
      ? quiz.draft_items_json
      : JSON.parse(quiz.draft_items_json || '{}');
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (_) { items = []; }

  const before = items.length;
  items = items.filter(id => id !== bankItemId);

  if (items.length === before) return { success: true, removed: 0, total: items.length };

  const now = new Date().toISOString();
  const { error } = await db
    .from('teacher_quizzes')
    .update({ draft_items_json: { items }, updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('removeFromDraftItems:', error); return { success: false, message: error.message }; }
  return { success: true, removed: 1, total: items.length };
}


// ------------------------------------------------------------
// CLEAR DRAFT ITEMS
// Empties the draft_items_json completely.
// Used by: quizzes.html — Clear button on draft list
// ------------------------------------------------------------
async function clearDraftItems(quizId) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_quizzes')
    .update({ draft_items_json: { items: [] }, updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('clearDraftItems:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// SET QUIZ CLASSES (atomic replace)
// Takes the desired set of class IDs for a quiz.
// Adds missing links, soft-removes extras (status=REMOVED).
// Re-activates previously removed links if re-selected.
// Used by: quizzes.html Classes tab — Save Links
// ------------------------------------------------------------
async function setQuizClasses(quizId, teacherId, classIds) {
  // 1. Fetch all current links (including REMOVED for re-activation)
  const { data: existing, error: fetchErr } = await db
    .from('teacher_quiz_classes')
    .select('tqc_id, class_id, status')
    .eq('teacher_quiz_id', quizId);

  if (fetchErr) { console.error('setQuizClasses fetch:', fetchErr); return { success: false, message: fetchErr.message }; }

  const existingMap = new Map((existing || []).map(r => [r.class_id, r]));
  const desiredSet  = new Set(classIds);
  const now         = new Date().toISOString();

  const toInsert     = [];
  const toActivate   = [];
  const toDeactivate = [];

  // 2. Find new and re-activate
  desiredSet.forEach(classId => {
    const row = existingMap.get(classId);
    if (!row) {
      toInsert.push({
        tqc_id           : makeQuizClassId(),
        teacher_quiz_id  : quizId,
        class_id         : classId,
        teacher_id       : teacherId,
        status           : 'ACTIVE',
        created_at       : now,
        updated_at       : now
      });
    } else if (row.status !== 'ACTIVE') {
      toActivate.push(row.tqc_id);
    }
  });

  // 3. Find removed
  (existing || []).forEach(row => {
    if (row.status === 'ACTIVE' && !desiredSet.has(row.class_id)) {
      toDeactivate.push(row.tqc_id);
    }
  });

  // 4. Execute
  if (toInsert.length) {
    const { error } = await db.from('teacher_quiz_classes').insert(toInsert);
    if (error) { console.error('setQuizClasses insert:', error); return { success: false, message: error.message }; }
  }
  if (toActivate.length) {
    const { error } = await db.from('teacher_quiz_classes')
      .update({ status: 'ACTIVE', updated_at: now })
      .in('tqc_id', toActivate);
    if (error) { console.error('setQuizClasses activate:', error); return { success: false, message: error.message }; }
  }
  if (toDeactivate.length) {
    const { error } = await db.from('teacher_quiz_classes')
      .update({ status: 'REMOVED', updated_at: now })
      .in('tqc_id', toDeactivate);
    if (error) { console.error('setQuizClasses deactivate:', error); return { success: false, message: error.message }; }
  }

  return { success: true, added: toInsert.length, reactivated: toActivate.length, removed: toDeactivate.length };
}


// ------------------------------------------------------------
// PUBLISH TEACHER QUIZ
// 1. Validates status is DRAFT and draft has items
// 2. Fetches bank items for all draft IDs
// 3. Deletes any old snapshot rows (safety re-publish)
// 4. Creates snapshot rows in teacher_quiz_items
// 5. Flips quiz status to PUBLISHED
// Returns { success, snapshotted } or { success: false, message }
// Used by: quizzes.html Publish tab
// ------------------------------------------------------------
async function publishTeacherQuiz(quizId, teacherId) {
  // 1. Fetch quiz
  const quiz = await getTeacherQuiz(quizId);
  if (!quiz) return { success: false, message: 'Quiz not found.' };
  if (quiz.status !== 'DRAFT') return { success: false, message: 'Only DRAFT quizzes can be published.' };
  if (quiz.teacher_id !== teacherId) return { success: false, message: 'Not your quiz.' };

  // 2. Parse draft items
  let draftIds = [];
  try {
    const parsed = typeof quiz.draft_items_json === 'object'
      ? quiz.draft_items_json
      : JSON.parse(quiz.draft_items_json || '{}');
    draftIds = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (_) { draftIds = []; }

  if (!draftIds.length) return { success: false, message: 'Draft has no items.' };

  // 3. Fetch bank items
  const { data: bankItems, error: bankErr } = await db
    .from('teacher_bank_items')
    .select('*')
    .in('bank_item_id', draftIds);

  if (bankErr) return { success: false, message: 'Failed to fetch bank items: ' + bankErr.message };

  const bankMap = new Map((bankItems || []).map(r => [r.bank_item_id, r]));

  // 4. Validate all items found
  const missingIds = draftIds.filter(id => !bankMap.has(id));
  if (missingIds.length) {
    return { success: false, message: 'Missing bank items: ' + missingIds.join(', ') };
  }

  // 5. Delete old snapshots (safety — shouldn't exist for DRAFT)
  await db.from('teacher_quiz_items').delete().eq('teacher_quiz_id', quizId);

  // 6. Build snapshot rows
  const now = new Date().toISOString();
  const snapshotRows = draftIds.map((bankId, idx) => {
    const b = bankMap.get(bankId);
    return {
      quiz_item_id       : makeQuizItemId(),
      teacher_quiz_id    : quizId,
      position           : idx + 1,
      bank_item_id       : bankId,
      snap_stem          : b.stem,
      snap_option_a      : b.option_a,
      snap_fb_a          : b.fb_a,
      snap_option_b      : b.option_b,
      snap_fb_b          : b.fb_b,
      snap_option_c      : b.option_c,
      snap_fb_c          : b.fb_c,
      snap_option_d      : b.option_d,
      snap_fb_d          : b.fb_d,
      snap_option_e      : b.option_e,
      snap_fb_e          : b.fb_e,
      snap_option_f      : b.option_f,
      snap_fb_f          : b.fb_f,
      snap_correct       : b.correct,
      snap_rationale     : b.rationale,
      snap_rationale_img : b.rationale_img,
      snap_subject       : b.subject,
      snap_maintopic     : b.maintopic,
      snap_subtopic      : b.subtopic,
      snap_difficulty    : b.difficulty,
      snap_marks         : b.marks || 1,
      snap_question_type : b.question_type || 'MCQ',
      snap_shuffle_options: b.shuffle_options ?? true,
      snapped_at         : now
    };
  });

  // 7. Insert snapshots
  const { error: snapErr } = await db.from('teacher_quiz_items').insert(snapshotRows);
  if (snapErr) return { success: false, message: 'Snapshot insert failed: ' + snapErr.message };

  // 8. Flip status to PUBLISHED
  const { error: pubErr } = await db
    .from('teacher_quizzes')
    .update({ status: 'PUBLISHED', updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (pubErr) return { success: false, message: 'Status update failed: ' + pubErr.message };

  return { success: true, snapshotted: snapshotRows.length };
}


// ------------------------------------------------------------
// RELEASE QUIZ RESULTS
// For MANUAL policy quizzes — makes results visible to students.
// Sets results_released=true and timestamps it.
// Used by: quizzes.html Publish tab — Release Results button
// ------------------------------------------------------------
async function releaseQuizResults(quizId) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('teacher_quizzes')
    .update({
      results_released   : true,
      results_released_at: now,
      updated_at         : now
    })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('releaseQuizResults:', error); return { success: false, message: error.message }; }
  return { success: true };
}


// ------------------------------------------------------------
// CLONE TEACHER QUIZ
// Creates a new DRAFT from an existing quiz.
// Copies all settings, grade bands, custom fields.
// Title = "Original (Copy)"
// New access code generated.
// If source was PUBLISHED, extracts bank_item_ids from
// snapshot rows into the clone's draft_items_json.
// options: { copySchedule: false }
// Returns { success, data } (the new quiz row)
// Used by: quizzes.html — Clone button
// ------------------------------------------------------------
async function cloneTeacherQuiz(sourceQuizId, teacherId, { copySchedule = false } = {}) {
  // 1. Fetch source
  const source = await getTeacherQuiz(sourceQuizId);
  if (!source) return { success: false, message: 'Source quiz not found.' };
  if (source.teacher_id !== teacherId) return { success: false, message: 'Not your quiz.' };

  // 2. Build draft items — from draft_items_json or snapshots
  let draftItems = [];
  if (source.status === 'PUBLISHED') {
    // Extract from published snapshots
    const { data: snaps, error: snapErr } = await db
      .from('teacher_quiz_items')
      .select('bank_item_id')
      .eq('teacher_quiz_id', sourceQuizId)
      .order('position', { ascending: true });

    if (!snapErr && snaps) {
      draftItems = snaps.map(s => s.bank_item_id).filter(Boolean);
    }
  } else {
    // Copy from draft
    try {
      const parsed = typeof source.draft_items_json === 'object'
        ? source.draft_items_json
        : JSON.parse(source.draft_items_json || '{}');
      draftItems = Array.isArray(parsed.items) ? parsed.items : [];
    } catch (_) { draftItems = []; }
  }

  // 3. Create clone
  const now    = new Date().toISOString();
  const quizId = makeQuizId();
  const code   = makeAccessCode();

  const row = {
    teacher_quiz_id       : quizId,
    teacher_id            : teacherId,
    title                 : (source.title || 'Untitled') + ' (Copy)',
    subject               : source.subject,
    preset                : source.preset,
    duration_minutes      : source.duration_minutes,
    shuffle_questions     : source.shuffle_questions,
    shuffle_options       : source.shuffle_options,
    max_attempts          : source.max_attempts,
    show_review           : source.show_review,
    show_results          : source.show_results,
    results_release_policy: source.results_release_policy,
    results_released      : false,
    results_released_at   : null,
    open_at               : copySchedule ? source.open_at  : null,
    close_at              : copySchedule ? source.close_at : null,
    status                : 'DRAFT',
    access_code           : code,
    custom_fields_json    : source.custom_fields_json,
    draft_items_json      : { items: draftItems },
    grading_policy        : source.grading_policy,
    grade_bands_json      : source.grade_bands_json,
    pass_threshold_pct    : source.pass_threshold_pct,
    score_display_policy  : source.score_display_policy,
    created_at            : now,
    updated_at            : now
  };

  const { data, error } = await db
    .from('teacher_quizzes')
    .insert(row)
    .select()
    .single();

  if (error) { console.error('cloneTeacherQuiz:', error); return { success: false, message: error.message }; }

  // 4. Copy class links
  const links = await getQuizClasses(sourceQuizId);
  if (links.length) {
    const linkRows = links.map(l => ({
      tqc_id          : makeQuizClassId(),
      teacher_quiz_id : quizId,
      class_id        : l.class_id,
      teacher_id      : teacherId,
      status          : 'ACTIVE',
      created_at      : now,
      updated_at      : now
    }));
    await db.from('teacher_quiz_classes').insert(linkRows);
  }

  return { success: true, data };
}


// ------------------------------------------------------------
// REGENERATE QUIZ ACCESS CODE
// Generates a new 6-char access code. DRAFT only.
// Returns { success, access_code }
// Used by: quizzes.html Settings tab
// ------------------------------------------------------------
async function regenerateQuizAccessCode(quizId) {
  const quiz = await getTeacherQuiz(quizId);
  if (!quiz) return { success: false, message: 'Quiz not found.' };
  if (quiz.status !== 'DRAFT') return { success: false, message: 'Can only regenerate code for DRAFT quizzes.' };

  const newCode = makeAccessCode();
  const now     = new Date().toISOString();

  const { error } = await db
    .from('teacher_quizzes')
    .update({ access_code: newCode, updated_at: now })
    .eq('teacher_quiz_id', quizId);

  if (error) { console.error('regenerateQuizAccessCode:', error); return { success: false, message: error.message }; }
  return { success: true, access_code: newCode };
}


// ============================================================
// Slice 7: Student Quiz Runner
// ============================================================

// ── ID generator ───────────────────────────────────────────

function makeAttemptId() {
  return 'ATT_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}


// ------------------------------------------------------------
// GET QUIZZES FOR CLASS (Student)
// Returns all PUBLISHED quizzes linked to a given class.
// Joins through teacher_quiz_classes → teacher_quizzes.
// Also fetches the student's attempts so UI can show status.
// Used by: myteacher/student/my-classes.html Quizzes tab
// ------------------------------------------------------------
async function getQuizzesForClass(classId, userId) {
  // 1. Get quiz links for this class
  const { data: links, error: linkErr } = await db
    .from('teacher_quiz_classes')
    .select('teacher_quiz_id')
    .eq('class_id', classId)
    .eq('status', 'ACTIVE');

  if (linkErr) { console.error('getQuizzesForClass links:', linkErr); return []; }
  if (!links || !links.length) return [];

  const quizIds = links.map(l => l.teacher_quiz_id);

  // 2. Fetch full quiz rows — only PUBLISHED
  const { data: quizzes, error: qErr } = await db
    .from('teacher_quizzes')
    .select('*')
    .in('teacher_quiz_id', quizIds)
    .eq('status', 'PUBLISHED')
    .order('updated_at', { ascending: false });

  if (qErr) { console.error('getQuizzesForClass quizzes:', qErr); return []; }
  if (!quizzes || !quizzes.length) return [];

  // 3. Fetch student's attempts for these quizzes
  const { data: attempts, error: aErr } = await db
    .from('teacher_quiz_attempts')
    .select('attempt_id, teacher_quiz_id, attempt_no, status, score_pct, started_at, submitted_at')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .in('teacher_quiz_id', quizzes.map(q => q.teacher_quiz_id))
    .neq('status', 'ABANDONED')
    .order('started_at', { ascending: false });

  if (aErr) console.error('getQuizzesForClass attempts:', aErr);

  // 4. Attach attempts to quizzes
  const attemptMap = {};
  (attempts || []).forEach(a => {
    if (!attemptMap[a.teacher_quiz_id]) attemptMap[a.teacher_quiz_id] = [];
    attemptMap[a.teacher_quiz_id].push(a);
  });

  // 5. Get item counts for each quiz
  const { data: itemCounts, error: icErr } = await db
    .from('teacher_quiz_items')
    .select('teacher_quiz_id')
    .in('teacher_quiz_id', quizzes.map(q => q.teacher_quiz_id));

  const countMap = {};
  (itemCounts || []).forEach(r => {
    countMap[r.teacher_quiz_id] = (countMap[r.teacher_quiz_id] || 0) + 1;
  });

  return quizzes.map(q => ({
    ...q,
    item_count: countMap[q.teacher_quiz_id] || 0,
    attempts: attemptMap[q.teacher_quiz_id] || []
  }));
}


// ------------------------------------------------------------
// GET PUBLISHED QUIZ WITH ITEMS (Student)
// Returns the quiz row + all snapshot items (ordered by position).
// Does NOT return correct answers — those stay server-side
// for grading only (but we're client-side, so we omit from
// the items_json stored on the attempt instead).
// Used by: quiz-runner.html — loading the quiz
// ------------------------------------------------------------
async function getPublishedQuizWithItems(quizId) {
  // Fetch quiz
  const { data: quiz, error: qErr } = await db
    .from('teacher_quizzes')
    .select('*')
    .eq('teacher_quiz_id', quizId)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (qErr) { console.error('getPublishedQuizWithItems quiz:', qErr); return null; }
  if (!quiz) return null;

  // Fetch snapshot items
  const { data: items, error: iErr } = await db
    .from('teacher_quiz_items')
    .select('*')
    .eq('teacher_quiz_id', quizId)
    .order('position', { ascending: true });

  if (iErr) { console.error('getPublishedQuizWithItems items:', iErr); return null; }

  return { quiz, items: items || [] };
}


// ------------------------------------------------------------
// START QUIZ ATTEMPT (Student)
// Creates a new attempt or resumes an existing IN_PROGRESS one.
// Handles: max attempt enforcement, open/close window check,
//          question shuffling with opt_map, due_at calculation.
//
// candidateFields: { key: value } from intake form
// Returns { success, attempt, resumed } or { success: false, ... }
// Used by: quiz-runner.html
// ------------------------------------------------------------
async function startQuizAttempt(userId, quizId, classId, candidateFields = {}) {
  // 1. Fetch quiz
  const quizData = await getPublishedQuizWithItems(quizId);
  if (!quizData) return { success: false, message: 'Quiz not found or not published.' };
  const { quiz, items } = quizData;

  // 2. Verify class link
  const { data: link, error: linkErr } = await db
    .from('teacher_quiz_classes')
    .select('tqc_id')
    .eq('teacher_quiz_id', quizId)
    .eq('class_id', classId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (linkErr || !link) return { success: false, message: 'This quiz is not linked to your class.' };

  // 3. Verify class membership
  const membership = await getExistingMembership(userId, classId);
  if (!membership || membership.status !== 'ACTIVE') {
    return { success: false, message: 'You are not an active member of this class.' };
  }

  // 4. Check open/close window
  const now = new Date();
  if (quiz.open_at && new Date(quiz.open_at) > now) {
    return { success: false, code: 'NOT_OPEN', message: 'This quiz is not open yet.', open_at: quiz.open_at };
  }
  if (quiz.close_at && new Date(quiz.close_at) < now) {
    return { success: false, code: 'CLOSED', message: 'This quiz has closed.' };
  }

  // 5. Check for existing IN_PROGRESS attempt — resume if found
  const { data: existing, error: exErr } = await db
    .from('teacher_quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('teacher_quiz_id', quizId)
    .eq('class_id', classId)
    .eq('status', 'IN_PROGRESS')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!exErr && existing) {
    // Check if timed out
    if (existing.due_at && new Date(existing.due_at) < now) {
      // Auto-submit as TIMED_OUT
      await _autoTimeoutAttempt(existing);
      // Fall through to create new attempt
    } else {
      // Resume — patch time and return
      const timePatch = _calcTimePatch(existing, now);
      if (timePatch.updated) {
        await db.from('teacher_quiz_attempts')
          .update({ time_taken_s: timePatch.time_taken_s, updated_at: now.toISOString() })
          .eq('attempt_id', existing.attempt_id);
        existing.time_taken_s = timePatch.time_taken_s;
        existing.updated_at = now.toISOString();
      }
      return { success: true, attempt: existing, quiz, resumed: true };
    }
  }

  // 6. Check max attempts
  const { count, error: countErr } = await db
    .from('teacher_quiz_attempts')
    .select('attempt_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('teacher_quiz_id', quizId)
    .eq('class_id', classId)
    .neq('status', 'ABANDONED');

  if (countErr) return { success: false, message: 'Could not check attempt count.' };

  const maxAttempts = quiz.max_attempts || 0; // 0 = unlimited
  if (maxAttempts > 0 && (count || 0) >= maxAttempts) {
    return { success: false, code: 'MAX_ATTEMPTS', message: `Maximum attempts reached (${maxAttempts}).` };
  }

  // 7. Build items_json with shuffle + opt_map
  const attemptItems = _buildAttemptItems(items, quiz.shuffle_questions, quiz.shuffle_options);

  // 8. Calculate due_at
  let dueAt = null;
  if (quiz.duration_minutes && quiz.duration_minutes > 0) {
    dueAt = new Date(now.getTime() + quiz.duration_minutes * 60 * 1000);
    // Cap to quiz close_at if earlier
    if (quiz.close_at) {
      const closeDate = new Date(quiz.close_at);
      if (closeDate < dueAt) dueAt = closeDate;
    }
  }

  // 9. Create attempt row
  const attemptId = makeAttemptId();
  const attemptNo = (count || 0) + 1;
  const nowIso = now.toISOString();

  const row = {
    attempt_id          : attemptId,
    user_id             : userId,
    teacher_quiz_id     : quizId,
    teacher_id          : quiz.teacher_id,
    class_id            : classId,
    attempt_no          : attemptNo,
    mode                : quiz.preset || 'EXAM',
    duration_minutes    : quiz.duration_minutes || 0,
    status              : 'IN_PROGRESS',
    started_at          : nowIso,
    due_at              : dueAt ? dueAt.toISOString() : null,
    submitted_at        : null,
    updated_at          : nowIso,
    items_json          : attemptItems,
    answers_json        : {},
    flags_json          : {},
    candidate_fields_json: { fields: candidateFields },
    score_raw           : null,
    score_total         : null,
    score_pct           : null,
    time_taken_s        : 0,
    score_json          : null,
    grading_policy      : null,
    grade_bands_json    : null,
    score_display_policy: null
  };

  const { data, error: insErr } = await db
    .from('teacher_quiz_attempts')
    .insert(row)
    .select()
    .single();

  if (insErr) { console.error('startQuizAttempt:', insErr); return { success: false, message: insErr.message }; }

  return { success: true, attempt: data, quiz, resumed: false };
}


// ------------------------------------------------------------
// SAVE ATTEMPT PROGRESS (auto-save)
// Updates answers_json, flags_json, and time_taken_s.
// Also checks for timeout — auto-submits if expired.
// Returns { success, timed_out }
// Used by: quiz-runner.html — debounced auto-save
// ------------------------------------------------------------
async function saveAttemptProgress(attemptId, answersJson, flagsJson, timeTakenS) {
  const now = new Date();
  const nowIso = now.toISOString();

  // Fetch current attempt to check timeout
  const { data: attempt, error: fetchErr } = await db
    .from('teacher_quiz_attempts')
    .select('status, due_at, duration_minutes')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (fetchErr || !attempt) return { success: false, message: 'Attempt not found.' };
  if (attempt.status !== 'IN_PROGRESS') return { success: false, message: 'Attempt is not in progress.' };

  // Check timeout
  if (attempt.due_at && new Date(attempt.due_at) < now) {
    // Save answers first, then auto-submit
    await db.from('teacher_quiz_attempts')
      .update({ answers_json: answersJson, flags_json: flagsJson, updated_at: nowIso })
      .eq('attempt_id', attemptId);
    return { success: true, timed_out: true };
  }

  // Cap time_taken_s
  const maxSeconds = (attempt.duration_minutes || 0) * 60;
  let cappedTime = timeTakenS || 0;
  if (maxSeconds > 0 && cappedTime > maxSeconds) cappedTime = maxSeconds;

  const { error } = await db
    .from('teacher_quiz_attempts')
    .update({
      answers_json : answersJson,
      flags_json   : flagsJson,
      time_taken_s : cappedTime,
      updated_at   : nowIso
    })
    .eq('attempt_id', attemptId);

  if (error) { console.error('saveAttemptProgress:', error); return { success: false, message: error.message }; }
  return { success: true, timed_out: false };
}


// ------------------------------------------------------------
// SUBMIT QUIZ ATTEMPT (Student)
// Grades the attempt, writes scores, flips status.
// Snapshots grading settings from quiz onto attempt row.
// Returns { success, attempt } with final scores.
// Used by: quiz-runner.html — submit button + auto-timeout
// ------------------------------------------------------------
async function submitQuizAttempt(attemptId, answersJson, timeTakenS) {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Fetch full attempt
  const { data: attempt, error: aErr } = await db
    .from('teacher_quiz_attempts')
    .select('*')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (aErr || !attempt) return { success: false, message: 'Attempt not found.' };
  if (attempt.status !== 'IN_PROGRESS') return { success: false, message: 'Attempt already submitted.' };

  // 2. Fetch quiz for grading settings + SATA scoring policy
  const quiz = await getTeacherQuiz(attempt.teacher_quiz_id);
  if (!quiz) return { success: false, message: 'Quiz not found.' };

  // 3. Fetch snapshot items for grading
  const { data: snapItems, error: sErr } = await db
    .from('teacher_quiz_items')
    .select('*')
    .eq('teacher_quiz_id', attempt.teacher_quiz_id);

  if (sErr) return { success: false, message: 'Could not fetch quiz items.' };

  const snapMap = new Map((snapItems || []).map(s => [s.quiz_item_id, s]));

  // 4. Grade
  const finalAnswers = answersJson || attempt.answers_json || {};
  const attemptItems = attempt.items_json || [];
  const sataPolicy = quiz.sata_scoring_policy || 'ALL_OR_NOTHING';

  let totalMarks = 0;
  let scoreMarks = 0;

  attemptItems.forEach(item => {
    const snap = snapMap.get(item.quiz_item_id);
    if (!snap) return;
    const marks = snap.snap_marks || 1;
    totalMarks += marks;

    const qType = snap.snap_question_type || 'MCQ';
    const studentAnswer = finalAnswers[item.quiz_item_id];

    if (qType === 'SATA') {
      // SATA: snap_correct is comma-separated e.g. "A,C,E"
      const correctSet = new Set((snap.snap_correct || '').split(',').map(s => s.trim()).filter(Boolean));
      const studentSet = new Set(
        Array.isArray(studentAnswer) ? studentAnswer :
        (typeof studentAnswer === 'string' ? studentAnswer.split(',').map(s => s.trim()).filter(Boolean) : [])
      );

      // Reverse shuffle via opt_map
      const origStudentSet = new Set();
      studentSet.forEach(displayLetter => {
        const origLetter = item.opt_map ? item.opt_map[displayLetter] : displayLetter;
        if (origLetter) origStudentSet.add(origLetter);
      });

      if (sataPolicy === 'ALL_OR_NOTHING') {
        // Must match exactly
        if (origStudentSet.size === correctSet.size &&
            [...origStudentSet].every(l => correctSet.has(l))) {
          scoreMarks += marks;
        }
      } else if (sataPolicy === 'PARTIAL_CREDIT') {
        // +1 per correct pick, -1 per wrong pick, floor 0, scaled to marks
        const totalOptions = _countSataOptions(snap);
        let credit = 0;
        origStudentSet.forEach(l => { credit += correctSet.has(l) ? 1 : -1; });
        credit = Math.max(0, credit);
        scoreMarks += Math.round((credit / correctSet.size) * marks * 100) / 100;
      } else if (sataPolicy === 'PER_OPTION') {
        // Each option scored independently
        const allOptions = _getSataOptionLetters(snap);
        let correct = 0;
        allOptions.forEach(letter => {
          const shouldBeSelected = correctSet.has(letter);
          const wasSelected = origStudentSet.has(letter);
          if (shouldBeSelected === wasSelected) correct++;
        });
        scoreMarks += Math.round((correct / allOptions.length) * marks * 100) / 100;
      }
    } else {
      // MCQ or TF — single answer
      const chosen = typeof studentAnswer === 'string' ? studentAnswer.trim() : '';
      // Reverse shuffle via opt_map
      const origChosen = item.opt_map ? (item.opt_map[chosen] || chosen) : chosen;
      if (origChosen && origChosen === snap.snap_correct) {
        scoreMarks += marks;
      }
    }
  });

  const pct = totalMarks > 0 ? Math.round((scoreMarks / totalMarks) * 10000) / 100 : 0;

  // Determine if timed out
  const timedOut = attempt.due_at && new Date(attempt.due_at) < now;

  // Cap time
  const maxSeconds = (attempt.duration_minutes || 0) * 60;
  let finalTime = timeTakenS || attempt.time_taken_s || 0;
  if (maxSeconds > 0 && finalTime > maxSeconds) finalTime = maxSeconds;

  // 5. Update attempt
  const patch = {
    status              : timedOut ? 'TIMED_OUT' : 'SUBMITTED',
    answers_json        : finalAnswers,
    submitted_at        : nowIso,
    updated_at          : nowIso,
    time_taken_s        : finalTime,
    score_raw           : scoreMarks,
    score_total         : totalMarks,
    score_pct           : pct,
    score_json          : { total_marks: totalMarks, score_marks: scoreMarks, percent: pct },
    grading_policy      : quiz.grading_policy,
    grade_bands_json    : quiz.grade_bands_json,
    score_display_policy: quiz.score_display_policy
  };

  const { data: updated, error: uErr } = await db
    .from('teacher_quiz_attempts')
    .update(patch)
    .eq('attempt_id', attemptId)
    .select()
    .single();

  if (uErr) { console.error('submitQuizAttempt:', uErr); return { success: false, message: uErr.message }; }

  return { success: true, attempt: updated };
}


// ------------------------------------------------------------
// GET ATTEMPT (for resume or completion screen)
// Returns the full attempt row.
// Used by: quiz-runner.html — resume or completion page
// ------------------------------------------------------------
async function getAttempt(attemptId) {
  const { data, error } = await db
    .from('teacher_quiz_attempts')
    .select('*')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (error) { console.error('getAttempt:', error); return null; }
  return data;
}


// ── Helper: auto-timeout an expired attempt ─────────────────
async function _autoTimeoutAttempt(attempt) {
  const now = new Date().toISOString();
  const maxSeconds = (attempt.duration_minutes || 0) * 60;
  let finalTime = attempt.time_taken_s || 0;
  if (maxSeconds > 0 && finalTime > maxSeconds) finalTime = maxSeconds;

  await db.from('teacher_quiz_attempts')
    .update({
      status      : 'TIMED_OUT',
      submitted_at: now,
      updated_at  : now,
      time_taken_s: finalTime
    })
    .eq('attempt_id', attempt.attempt_id);
}


// ── Helper: calculate time patch on resume ──────────────────
function _calcTimePatch(attempt, now) {
  const lastUpdate = new Date(attempt.updated_at || attempt.started_at);
  const deltaSec = Math.max(0, Math.floor((now.getTime() - lastUpdate.getTime()) / 1000));
  let newTime = (attempt.time_taken_s || 0) + deltaSec;
  const maxSeconds = (attempt.duration_minutes || 0) * 60;
  if (maxSeconds > 0 && newTime > maxSeconds) newTime = maxSeconds;
  return { time_taken_s: newTime, updated: deltaSec > 0 };
}


// ── Helper: build attempt items with shuffle + opt_map ──────
function _buildAttemptItems(snapshotItems, shuffleQuestions, quizShuffleOptions) {
  // Copy items
  let items = snapshotItems.map(snap => {
    const optMap = {};
    const letters = ['A','B','C','D','E','F'];
    const availableLetters = letters.filter(l => snap['snap_option_' + l.toLowerCase()] != null);

    // Determine if we should shuffle this question's options
    const shouldShuffle = quizShuffleOptions && snap.snap_shuffle_options !== false;

    if (shouldShuffle && snap.snap_question_type !== 'TF') {
      // Fisher-Yates shuffle
      const shuffled = [...availableLetters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // optMap: display letter → original letter
      shuffled.forEach((origLetter, idx) => {
        optMap[availableLetters[idx]] = origLetter;
      });
    } else {
      // No shuffle — identity map
      availableLetters.forEach(l => { optMap[l] = l; });
    }

    return {
      quiz_item_id: snap.quiz_item_id,
      position    : snap.position,
      marks       : snap.snap_marks || 1,
      opt_map     : optMap,
      question_type: snap.snap_question_type || 'MCQ'
    };
  });

  // Shuffle question order if enabled
  if (shuffleQuestions) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    // Re-assign position after shuffle
    items.forEach((item, idx) => { item.position = idx + 1; });
  }

  return items;
}


// ── Helper: count SATA options ──────────────────────────────
function _countSataOptions(snap) {
  let count = 0;
  ['a','b','c','d','e','f'].forEach(l => {
    if (snap['snap_option_' + l] != null) count++;
  });
  return count;
}

function _getSataOptionLetters(snap) {
  const letters = [];
  ['A','B','C','D','E','F'].forEach(l => {
    if (snap['snap_option_' + l.toLowerCase()] != null) letters.push(l);
  });
  return letters;
}


// ============================================================
// Slice 8: Student Results & Review
// ============================================================

// ------------------------------------------------------------
// GET ATTEMPT RESULTS (Student)
// Returns the attempt with score data, gated by release policy.
// Computes: gate_met, display_score, grade_label, pass_status,
//           results/review availability, and metadata.
// Used by: myteacher/student/my-results.html — Results tab
// ------------------------------------------------------------
async function getAttemptResults(attemptId, userId) {
  // 1. Fetch attempt
  const { data: attempt, error: aErr } = await db
    .from('teacher_quiz_attempts')
    .select('*')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (aErr || !attempt) return { success: false, message: 'Attempt not found.' };
  if (attempt.user_id !== userId) return { success: false, message: 'Not your attempt.' };
  if (attempt.status === 'IN_PROGRESS') return { success: false, message: 'Attempt is still in progress.' };

  // 2. Fetch quiz
  const quiz = await getTeacherQuiz(attempt.teacher_quiz_id);
  if (!quiz) return { success: false, message: 'Quiz not found.' };

  // 3. Fetch class membership for "My Details"
  const { data: member } = await db
    .from('teacher_class_members')
    .select('display_name, email, member_fields_json')
    .eq('user_id', userId)
    .eq('class_id', attempt.class_id)
    .maybeSingle();

  const { data: cls } = await db
    .from('teacher_classes')
    .select('title, custom_fields_json')
    .eq('class_id', attempt.class_id)
    .maybeSingle();

  // 4. Compute results gate
  const now = new Date();
  const policy = quiz.results_release_policy || 'MANUAL';
  let gateMet = false;
  let gateReason = '';
  let availableAt = null;

  if (policy === 'IMMEDIATE') {
    gateMet = true;
  } else if (policy === 'AFTER_CLOSE') {
    if (!quiz.close_at) {
      gateReason = 'MISSING_CLOSE_AT';
    } else if (new Date(quiz.close_at) > now) {
      gateReason = 'QUIZ_NOT_CLOSED';
      availableAt = quiz.close_at;
    } else {
      gateMet = true;
      availableAt = quiz.close_at;
    }
  } else {
    // MANUAL
    if (quiz.results_released) {
      gateMet = true;
      availableAt = quiz.results_released_at;
    } else {
      gateReason = 'RESULTS_NOT_RELEASED';
    }
  }

  // 5. Compute display score (respecting policy)
  const showResults = quiz.show_results !== false;
  const scorePolicy = attempt.score_display_policy || quiz.score_display_policy || 'RAW_AND_PCT';
  let displayScore = null;
  let gradeLabel = null;
  let passStatus = null;

  if (gateMet && showResults && attempt.score_pct != null) {
    displayScore = {};
    if (scorePolicy === 'RAW_AND_PCT' || scorePolicy === 'RAW_ONLY') {
      displayScore.score_marks = attempt.score_raw;
      displayScore.total_marks = attempt.score_total;
    }
    if (scorePolicy === 'RAW_AND_PCT' || scorePolicy === 'PCT_ONLY') {
      displayScore.percent = attempt.score_pct;
    }
    // HIDE: displayScore stays null
    if (scorePolicy === 'HIDE') displayScore = null;

    // Grade label
    gradeLabel = _gradeLabelFromBands(
      attempt.grade_bands_json || quiz.grade_bands_json,
      attempt.score_pct
    );

    // Pass/fail
    const threshold = quiz.pass_threshold_pct ?? 50;
    passStatus = attempt.score_pct >= threshold ? 'PASS' : 'FAIL';
  }

  // Even if score hidden, grade may still show
  if (gateMet && showResults && scorePolicy === 'HIDE' && attempt.score_pct != null) {
    gradeLabel = _gradeLabelFromBands(
      attempt.grade_bands_json || quiz.grade_bands_json,
      attempt.score_pct
    );
  }

  // 6. Review availability
  const canReviewNow = gateMet && quiz.show_review;

  // 7. Build "My Details"
  let classFields = [];
  let classValues = {};
  try {
    const cf = typeof cls?.custom_fields_json === 'object' ? cls.custom_fields_json : JSON.parse(cls?.custom_fields_json || '[]');
    classFields = Array.isArray(cf) ? cf : (Array.isArray(cf.fields) ? cf.fields : []);
  } catch(_) {}
  try {
    const mf = typeof member?.member_fields_json === 'object' ? member.member_fields_json : JSON.parse(member?.member_fields_json || '{}');
    classValues = (mf && typeof mf === 'object' && !Array.isArray(mf)) ? mf : (mf?.fields || {});
  } catch(_) {}

  let candidateFields = {};
  try {
    const cf = typeof attempt.candidate_fields_json === 'object' ? attempt.candidate_fields_json : JSON.parse(attempt.candidate_fields_json || '{}');
    candidateFields = cf.fields || cf || {};
  } catch(_) {}

  // Quiz custom fields schema
  let quizFieldsSchema = [];
  try {
    const qf = typeof quiz.custom_fields_json === 'object' ? quiz.custom_fields_json : JSON.parse(quiz.custom_fields_json || '{}');
    quizFieldsSchema = Array.isArray(qf.fields) ? qf.fields : [];
  } catch(_) {}

  return {
    success: true,
    quiz_meta: {
      title: quiz.title,
      subject: quiz.subject,
      preset: quiz.preset,
      duration_minutes: quiz.duration_minutes,
      max_attempts: quiz.max_attempts,
      show_review: quiz.show_review,
      show_results: quiz.show_results,
      results_release_policy: policy,
      score_display_policy: scorePolicy,
      pass_threshold_pct: quiz.pass_threshold_pct,
      close_at: quiz.close_at
    },
    attempt_meta: {
      attempt_id: attempt.attempt_id,
      attempt_no: attempt.attempt_no,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      time_taken_s: attempt.time_taken_s,
      mode: attempt.mode
    },
    gate_met: gateMet,
    gate_reason: gateReason,
    available_at: availableAt,
    show_results: showResults,
    can_review_now: canReviewNow,
    display_score: displayScore,
    grade_label: gradeLabel,
    pass_status: passStatus,
    my_details: {
      class_profile: {
        class_title: cls?.title || '',
        display_name: member?.display_name || '',
        email: member?.email || '',
        fields: classFields,
        values: classValues
      },
      attempt_submitted: {
        fields: quizFieldsSchema,
        values: candidateFields
      }
    }
  };
}


// ------------------------------------------------------------
// GET ATTEMPT REVIEW (Student)
// Returns all questions with student's answers, correct answers,
// option feedback, and rationale — for read-only review.
// Gated: only returns if show_review + gate met.
// Used by: myteacher/student/my-results.html — Review tab
// ------------------------------------------------------------
async function getAttemptReview(attemptId, userId) {
  // 1. Fetch attempt
  const { data: attempt, error: aErr } = await db
    .from('teacher_quiz_attempts')
    .select('*')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (aErr || !attempt) return { success: false, message: 'Attempt not found.' };
  if (attempt.user_id !== userId) return { success: false, message: 'Not your attempt.' };
  if (attempt.status === 'IN_PROGRESS') return { success: false, message: 'Attempt still in progress.' };

  // 2. Fetch quiz
  const quiz = await getTeacherQuiz(attempt.teacher_quiz_id);
  if (!quiz) return { success: false, message: 'Quiz not found.' };

  // 3. Check review gate
  if (!quiz.show_review) {
    return { success: false, code: 'REVIEW_DISABLED', message: 'Review is not enabled for this quiz.' };
  }

  // Check release gate
  const now = new Date();
  const policy = quiz.results_release_policy || 'MANUAL';
  let gateMet = false;
  if (policy === 'IMMEDIATE') gateMet = true;
  else if (policy === 'AFTER_CLOSE') gateMet = quiz.close_at && new Date(quiz.close_at) <= now;
  else gateMet = !!quiz.results_released;

  if (!gateMet) {
    return { success: false, code: 'RESULTS_NOT_RELEASED', message: 'Results have not been released yet. Review will be available when results are released.' };
  }

  // 4. Fetch snapshot items
  const { data: snapItems, error: sErr } = await db
    .from('teacher_quiz_items')
    .select('*')
    .eq('teacher_quiz_id', attempt.teacher_quiz_id)
    .order('position', { ascending: true });

  if (sErr) return { success: false, message: 'Could not load quiz items.' };

  const snapMap = new Map((snapItems || []).map(s => [s.quiz_item_id, s]));

  // 5. Build review questions
  const attemptItems = attempt.items_json || [];
  const answers = attempt.answers_json || {};

  const questions = attemptItems.map(item => {
    const snap = snapMap.get(item.quiz_item_id);
    if (!snap) return null;

    const qType = snap.snap_question_type || 'MCQ';
    const isSATA = qType === 'SATA';
    const correctOrig = snap.snap_correct || '';

    // Build options array in display order
    const displayLetters = Object.keys(item.opt_map || {}).sort();
    const options = [];

    if (qType === 'TF') {
      options.push({ key: 'A', text: 'True', feedback: snap.snap_fb_a || '' });
      options.push({ key: 'B', text: 'False', feedback: snap.snap_fb_b || '' });
    } else {
      displayLetters.forEach(dl => {
        const orig = item.opt_map[dl];
        const text = snap['snap_option_' + orig.toLowerCase()] || '';
        if (!text) return;
        options.push({
          key: dl,
          orig_key: orig,
          text: text,
          feedback: snap['snap_fb_' + orig.toLowerCase()] || ''
        });
      });
    }

    // Determine student's answer
    const studentAnswer = answers[item.quiz_item_id];

    // Determine correct display key(s) by reversing opt_map
    const reverseMap = {};
    Object.entries(item.opt_map || {}).forEach(([display, orig]) => { reverseMap[orig] = display; });

    let correctDisplayKeys = [];
    if (isSATA) {
      correctDisplayKeys = correctOrig.split(',').map(s => s.trim()).filter(Boolean).map(orig => reverseMap[orig] || orig);
    } else {
      correctDisplayKeys = [reverseMap[correctOrig] || correctOrig];
    }

    // Determine student display keys
    let studentDisplayKeys = [];
    if (isSATA) {
      if (Array.isArray(studentAnswer)) studentDisplayKeys = studentAnswer;
      else if (typeof studentAnswer === 'string' && studentAnswer) studentDisplayKeys = studentAnswer.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      if (studentAnswer) studentDisplayKeys = [studentAnswer];
    }

    // Is correct?
    let isCorrect = false;
    if (isSATA) {
      // Reverse student answers to original
      const studentOrigSet = new Set(studentDisplayKeys.map(dl => item.opt_map[dl] || dl));
      const correctSet = new Set(correctOrig.split(',').map(s => s.trim()).filter(Boolean));
      isCorrect = studentOrigSet.size === correctSet.size && [...studentOrigSet].every(l => correctSet.has(l));
    } else {
      const studentOrig = item.opt_map[studentAnswer] || studentAnswer;
      isCorrect = studentOrig === correctOrig;
    }

    return {
      quiz_item_id: item.quiz_item_id,
      position: item.position,
      marks: item.marks || 1,
      question_type: qType,
      stem: snap.snap_stem,
      subject: snap.snap_subject,
      maintopic: snap.snap_maintopic,
      subtopic: snap.snap_subtopic,
      difficulty: snap.snap_difficulty,
      rationale: snap.snap_rationale,
      rationale_img: snap.snap_rationale_img,
      options: options,
      student_answer: studentDisplayKeys,
      correct_answer: correctDisplayKeys,
      is_correct: isCorrect
    };
  }).filter(Boolean);

  // Score summary (if visible)
  const scorePolicy = attempt.score_display_policy || quiz.score_display_policy || 'RAW_AND_PCT';
  let displayScore = null;
  if (quiz.show_results !== false && attempt.score_pct != null && scorePolicy !== 'HIDE') {
    displayScore = {};
    if (scorePolicy === 'RAW_AND_PCT' || scorePolicy === 'RAW_ONLY') {
      displayScore.score_marks = attempt.score_raw;
      displayScore.total_marks = attempt.score_total;
    }
    if (scorePolicy === 'RAW_AND_PCT' || scorePolicy === 'PCT_ONLY') {
      displayScore.percent = attempt.score_pct;
    }
  }

  return {
    success: true,
    review_allowed: true,
    display_score: displayScore,
    grade_label: _gradeLabelFromBands(attempt.grade_bands_json || quiz.grade_bands_json, attempt.score_pct),
    pass_status: attempt.score_pct != null ? (attempt.score_pct >= (quiz.pass_threshold_pct ?? 50) ? 'PASS' : 'FAIL') : null,
    questions: questions
  };
}


// ── Helper: grade label from bands ──────────────────────────
function _gradeLabelFromBands(bandsJson, pct) {
  if (pct == null) return null;
  let bands = [];
  try {
    const parsed = typeof bandsJson === 'object' ? bandsJson : JSON.parse(bandsJson || '{}');
    bands = Array.isArray(parsed.bands) ? parsed.bands : [];
  } catch(_) { return null; }

  if (!bands.length) return null;

  // Sort descending by min_pct so we match highest first
  const sorted = [...bands].sort((a, b) => (b.min_pct || 0) - (a.min_pct || 0));
  for (const band of sorted) {
    if (pct >= (band.min_pct || 0)) return band.label || null;
  }
  return sorted[sorted.length - 1]?.label || null;
}

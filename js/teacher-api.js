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

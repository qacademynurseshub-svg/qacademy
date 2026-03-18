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

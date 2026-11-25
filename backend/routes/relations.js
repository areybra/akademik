const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');

const READ_ROLES = ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'];
const { getRoles } = require('../scope');
const { normalizeSubject, profileForAccount, subjectsForAccount, canTeachSubject } = require('../lib/capability');

const isTeacherUser = (row) => {
  const roles = getRoles({ role: row.role, roles: row.roles });
  return roles.includes('guru') || roles.includes('guru_mapel');
};

const findTeacherAccount = (email) => {
  const rows = db.prepare('SELECT id, name, email, role, roles FROM users WHERE email = ?').all(email);
  return rows.find(isTeacherUser) || null;
};

const capabilityMessage = (teacher, subject) => {
  if (!profileForAccount(teacher.id)) {
    return `Akun ${teacher.name} belum tertaut ke Data Guru. Tautkan akun ke data guru terlebih dahulu.`;
  }
  const available = subjectsForAccount(teacher.id);
  if (available.length === 0) {
    return `${teacher.name} belum punya mapel di Data Guru. Tambahkan mapel yang mampu diajar terlebih dahulu.`;
  }
  return `Mapel ${subject} belum ada di daftar mapel yang mampu diajar ${teacher.name}. Tambahkan dulu di Data Guru.`;
};

const assertCapability = (teacher, subject) => canTeachSubject(teacher.id, subject);

const assignmentRow = (id) =>
  db.prepare(`
    SELECT ta.id, ta.teacher_id, u.name AS teacher_name, u.email AS teacher_email,
           ta.subject, ta.class
    FROM teacher_assignments ta
    JOIN users u ON u.id = ta.teacher_id
    WHERE ta.id = ?
  `).get(id);

const scheduleCountFor = (className, subject) =>
  db.prepare('SELECT COUNT(*) AS n FROM schedules WHERE class = ? AND subject = ?').get(className, subject).n;

const syncSchedules = db.prepare(
  'UPDATE schedules SET teacher_id = ?, teacher = ? WHERE class = ? AND subject = ?'
);

// GET /api/relations/teachers: daftar akun guru (untuk penugasan & jadwal)
router.get('/teachers', authenticateToken, authorizeRoles(...READ_ROLES), (_req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, roles FROM users ORDER BY name').all();
  res.json(rows.filter(isTeacherUser));
});

// GET /api/relations/parent-accounts: daftar akun orang tua (untuk dropdown tautan)
router.get('/parent-accounts', authenticateToken, authorizeRoles(...READ_ROLES), (_req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, roles FROM users ORDER BY name').all();
  res.json(rows.filter((row) => getRoles(row).includes('orang_tua')));
});

// GET /api/relations/parents: daftar relasi orang tua -> siswa
router.get('/parents', authenticateToken, authorizeRoles(...READ_ROLES), (req, res) => {
  const rows = db.prepare(`
    SELECT ps.parent_id, u.name AS parent_name, u.email AS parent_email,
           ps.student_id, s.name AS student_name, s.class
    FROM parent_students ps
    JOIN users u ON u.id = ps.parent_id
    JOIN students s ON s.id = ps.student_id
    ORDER BY u.name, s.name
  `).all();
  res.json(rows);
});

// POST /api/relations/parents { parentEmail, studentId }
router.post('/parents', authenticateToken, authorizeRoles('admin', 'kepala_tu'), (req, res) => {
  const { parentEmail, studentId } = req.body;
  if (!parentEmail || !studentId) {
    return res.status(400).json({ message: 'Email orang tua dan siswa wajib diisi' });
  }

  const rows = db.prepare('SELECT id, name, email, role, roles FROM users WHERE email = ?').all(parentEmail);
  const parent = rows.find((row) => getRoles(row).includes('orang_tua'));
  if (!parent) return res.status(404).json({ message: 'Akun orang tua tidak ditemukan' });

  const studentIds = [...new Set([
    studentId,
    ...(Array.isArray(req.body.studentIds) ? req.body.studentIds.map((id) => String(id)) : [])
  ])];
  for (const id of studentIds) {
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(id);
    if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
  }

  const insert = db.prepare('INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)');
  db.transaction(() => studentIds.forEach((id) => insert.run(parent.id, id)))();
  res.status(201).json({ message: 'Relasi orang tua dan siswa tersimpan', count: studentIds.length });
});

// DELETE /api/relations/parents/:parentId/:studentId
router.delete('/parents/:parentId/:studentId', authenticateToken, authorizeRoles('admin', 'kepala_tu'), (req, res) => {
  const result = db
    .prepare('DELETE FROM parent_students WHERE parent_id = ? AND student_id = ?')
    .run(req.params.parentId, req.params.studentId);
  if (result.changes === 0) return res.status(404).json({ message: 'Relasi tidak ditemukan' });
  res.json({ message: 'Relasi dihapus' });
});

// GET /api/relations/teacher-directory: data guru beserta akun login yang tertaut
router.get('/teacher-directory', authenticateToken, authorizeRoles(...READ_ROLES), (_req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.name, t.niup, t.subjects, t.classes,
           u.id AS account_id, u.name AS account_name, u.email AS account_email
    FROM teachers t
    LEFT JOIN users u ON u.teacher_id = t.id
    ORDER BY t.name
  `).all();
  res.json(rows.map((row) => ({
    ...row,
    subjects: JSON.parse(row.subjects || '[]'),
    classes: JSON.parse(row.classes || '[]')
  })));
});

// GET /api/relations/teacher-assignments/mine: penugasan milik akun yang login
router.get('/teacher-assignments/mine', authenticateToken, (req, res) => {
  const rows = db.prepare(`
    SELECT ta.id, ta.teacher_id, ta.subject, ta.class
    FROM teacher_assignments ta
    WHERE ta.teacher_id = ?
    ORDER BY ta.class, ta.subject
  `).all(req.user.id);
  res.json(rows);
});

// GET /api/relations/teacher-assignments: daftar mapel/kelas yang diampu guru
router.get('/teacher-assignments', authenticateToken, authorizeRoles(...READ_ROLES), (req, res) => {
  const rows = db.prepare(`
    SELECT ta.id, ta.teacher_id, u.name AS teacher_name, u.email AS teacher_email,
           ta.subject, ta.class
    FROM teacher_assignments ta
    JOIN users u ON u.id = ta.teacher_id
    ORDER BY ta.class, ta.subject, u.name
  `).all();
  res.json(rows);
});

// POST /api/relations/teacher-assignments { teacherEmail, subject, class }
router.post('/teacher-assignments', authenticateToken, authorizeRoles('admin', 'kepala_sekolah'), (req, res) => {
  const teacherEmail = String(req.body.teacherEmail || '').trim();
  const subject = normalizeSubject(req.body.subject);
  const className = String(req.body.class || '').trim();
  if (!teacherEmail || !subject || !className) {
    return res.status(400).json({ message: 'Email guru, mapel, dan kelas wajib diisi' });
  }

  const teacher = findTeacherAccount(teacherEmail);
  if (!teacher) return res.status(404).json({ message: 'Akun guru tidak ditemukan' });
  if (!assertCapability(teacher, subject)) {
    return res.status(400).json({ message: capabilityMessage(teacher, subject) });
  }

  const existing = db.prepare('SELECT id, teacher_id FROM teacher_assignments WHERE subject = ? AND class = ?')
    .get(subject, className);
  if (existing) {
    const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(existing.teacher_id);
    return res.status(409).json({
      message: `Mapel ${subject} di kelas ${className} sudah diampu ${owner?.name || 'guru lain'}.`
    });
  }

  const id = `assign-${teacher.id}-${subject}-${className}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();
  try {
    db.prepare('INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)')
      .run(id, teacher.id, subject, className);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ message: 'Mapel dan kelas ini sudah diampu guru lain' });
    }
    return res.status(500).json({ message: err.message });
  }
  res.status(201).json(assignmentRow(id));
});

// PUT /api/relations/teacher-assignments/:id { teacherEmail }
// Ganti guru penanggung jawab, lalu samakan guru pada seluruh jadwal mapel+kelas tersebut.
router.put('/teacher-assignments/:id', authenticateToken, authorizeRoles('admin', 'kepala_sekolah'), (req, res) => {
  const assignment = db.prepare('SELECT * FROM teacher_assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Penugasan tidak ditemukan' });

  const teacherEmail = String(req.body.teacherEmail || '').trim();
  if (!teacherEmail) return res.status(400).json({ message: 'Akun guru wajib dipilih' });

  const teacher = findTeacherAccount(teacherEmail);
  if (!teacher) return res.status(404).json({ message: 'Akun guru tidak ditemukan' });
  if (!assertCapability(teacher, assignment.subject)) {
    return res.status(400).json({ message: capabilityMessage(teacher, assignment.subject) });
  }

  db.transaction(() => {
    db.prepare('UPDATE teacher_assignments SET teacher_id = ? WHERE id = ?').run(teacher.id, assignment.id);
    syncSchedules.run(teacher.id, teacher.name, assignment.class, assignment.subject);
  })();

  res.json(assignmentRow(assignment.id));
});

// DELETE /api/relations/teacher-assignments/:id
// Tanpa force: tolak bila masih ada jadwal. Dengan ?force=1: hapus penugasan beserta jadwalnya.
router.delete('/teacher-assignments/:id', authenticateToken, authorizeRoles('admin', 'kepala_sekolah'), (req, res) => {
  const assignment = db.prepare('SELECT * FROM teacher_assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Penugasan tidak ditemukan' });

  const scheduleCount = scheduleCountFor(assignment.class, assignment.subject);
  if (scheduleCount > 0 && req.query.force !== '1') {
    return res.status(409).json({
      message: `Masih ada ${scheduleCount} jadwal untuk ${assignment.subject} di ${assignment.class}.`,
      scheduleCount
    });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM schedules WHERE class = ? AND subject = ?').run(assignment.class, assignment.subject);
    db.prepare('DELETE FROM teacher_assignments WHERE id = ?').run(assignment.id);
  })();

  res.json({ message: 'Penugasan dihapus', deletedSchedules: scheduleCount });
});

module.exports = router;

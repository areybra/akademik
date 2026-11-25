const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const csvUpload = require('../middleware/uploadCsv');
const { canTeachSubject } = require('../lib/capability');
const { planScheduleImport, applyScheduleImport } = require('../lib/scheduleImport');

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const teacherAccount = (teacherId) => {
  if (!teacherId) return null;
  return db.prepare(`
    SELECT id, name, email FROM users
    WHERE id = ? AND (role IN ('guru', 'guru_mapel') OR roles LIKE '%guru%')
  `).get(teacherId) || null;
};

const findAssignment = (className, subject) =>
  db.prepare('SELECT id, teacher_id, subject, class FROM teacher_assignments WHERE class = ? AND subject = ?')
    .get(className, subject);

const scheduleRow = (id) => db.prepare(`
  SELECT s.*, u.email AS teacher_email
  FROM schedules s
  LEFT JOIN users u ON u.id = s.teacher_id
  WHERE s.id = ?
`).get(id);

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const assignmentId = (teacherId, subject, className) =>
  `assign-${teacherId}-${subject}-${className}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();

const capabilityMessage = (teacher, subject) =>
  `${teacher.name} belum mencantumkan ${subject} di daftar mapel yang mampu diajar pada Data Guru.`;

// GET /api/schedules
router.get('/', authenticateToken, (req, res) => {
  const { class: classFilter, day, teacherId } = req.query;
  let query = `
    SELECT s.*, u.email AS teacher_email
    FROM schedules s
    LEFT JOIN users u ON u.id = s.teacher_id
  `;
  const conditions = [];
  const params = [];

  if (classFilter) {
    conditions.push('s.class = ?');
    params.push(classFilter);
  }
  if (day) {
    conditions.push('s.day = ?');
    params.push(day);
  }
  if (teacherId) {
    conditions.push('s.teacher_id = ?');
    params.push(teacherId);
  }
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY s.class ASC, s.time ASC';

  const schedules = db.prepare(query).all(...params);
  schedules.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    if (a.class !== b.class) return a.class.localeCompare(b.class, 'id');
    return a.time.localeCompare(b.time);
  });
  res.json(schedules);
});

// POST /api/schedules/import: pratinjau dan eksekusi impor CSV
router.post(
  '/import',
  authenticateToken,
  authorizeRoles('admin', 'kepala_tu', 'staff_tu'),
  csvUpload.single('file'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File CSV wajib diunggah' });
    const text = req.file.buffer.toString('utf8');
    const mode = String(req.body.mode || 'merge') === 'replace' ? 'replace' : 'merge';
    const dryRun = String(req.body.dryRun) === '1' || req.body.dryRun === true;
    const syncAssignments = String(req.body.syncAssignments) === '1' || req.body.syncAssignments === true;

    try {
      const report = dryRun
        ? planScheduleImport({ text, mode, syncAssignments })
        : applyScheduleImport({ text, mode, syncAssignments });
      if (!dryRun && report.errors.length > 0) {
        return res.status(400).json(report);
      }
      res.json({ ...report, applied: !dryRun });
    } catch (error) {
      res.status(500).json({ message: 'Gagal memproses file CSV', detail: error.message });
    }
  }
);

// GET /api/schedules/:id
router.get('/:id', authenticateToken, (req, res) => {
  const schedule = scheduleRow(req.params.id);
  if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  res.json(schedule);
});

// POST /api/schedules
router.post('/', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const schedClass = String(req.body.class || '').trim();
  const subject = String(req.body.subject || '').trim();
  const time = String(req.body.time || '').trim();
  const room = String(req.body.room || '').trim();
  const day = String(req.body.day || '').trim() || 'Belum ditentukan';
  const requestedTeacher = req.body.teacherId || req.body.teacher_id || null;

  if (!schedClass || !time || !subject || !room) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const assignment = findAssignment(schedClass, subject);
  let owner = null;
  if (assignment) {
    owner = teacherAccount(assignment.teacher_id);
    if (!owner) return res.status(400).json({ message: 'Akun guru pemilik penugasan tidak ditemukan' });
    if (requestedTeacher && requestedTeacher !== assignment.teacher_id) {
      return res.status(400).json({
        message: `Mapel ${subject} di kelas ${schedClass} sudah diampu ${owner.name}. Ubah penugasan bila ingin mengganti guru.`
      });
    }
  } else {
    if (!requestedTeacher) {
      return res.status(400).json({
        message: `Belum ada guru pengampu untuk ${subject} di ${schedClass}. Pilih guru pengampu terlebih dahulu.`
      });
    }
    owner = teacherAccount(requestedTeacher);
    if (!owner) return res.status(400).json({ message: 'Akun guru wajib dipilih' });
    if (!canTeachSubject(owner.id, subject)) {
      return res.status(400).json({ message: capabilityMessage(owner, subject) });
    }
  }

  const id = makeId('sched');
  try {
    db.transaction(() => {
      if (!assignment) {
        db.prepare('INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)')
          .run(assignmentId(owner.id, subject, schedClass), owner.id, subject, schedClass);
      }
      db.prepare(`
        INSERT INTO schedules (id, class, time, subject, teacher, teacher_id, room, day)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, schedClass, time, subject, owner.name, owner.id, room, day);
    })();
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message || '')) {
      return res.status(409).json({ message: 'Mapel dan kelas ini baru saja diampu guru lain. Muat ulang data.' });
    }
    return res.status(500).json({ message: error.message });
  }

  res.status(201).json(scheduleRow(id));
});

// PUT /api/schedules/:id
router.put('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

  const schedClass = String(req.body.class ?? existing.class).trim();
  const subject = String(req.body.subject ?? existing.subject).trim();
  const time = String(req.body.time ?? existing.time).trim();
  const room = String(req.body.room ?? existing.room).trim();
  const day = String(req.body.day ?? existing.day).trim() || 'Belum ditentukan';
  const requestedTeacher =
    req.body.teacherId !== undefined
      ? req.body.teacherId || null
      : req.body.teacher_id !== undefined
        ? req.body.teacher_id || null
        : null;

  const assignment = findAssignment(schedClass, subject);
  let owner = null;
  if (assignment) {
    owner = teacherAccount(assignment.teacher_id);
    if (!owner) return res.status(400).json({ message: 'Akun guru pemilik penugasan tidak ditemukan' });
    if (requestedTeacher && requestedTeacher !== assignment.teacher_id) {
      return res.status(400).json({
        message: `Mapel ${subject} di kelas ${schedClass} sudah diampu ${owner.name}. Ubah penugasan bila ingin mengganti guru.`
      });
    }
  } else {
    const candidate = requestedTeacher || existing.teacher_id;
    if (!candidate) {
      return res.status(400).json({
        message: `Belum ada guru pengampu untuk ${subject} di ${schedClass}. Pilih guru pengampu terlebih dahulu.`
      });
    }
    owner = teacherAccount(candidate);
    if (!owner) return res.status(400).json({ message: 'Akun guru wajib dipilih' });
    if (!canTeachSubject(owner.id, subject)) {
      return res.status(400).json({ message: capabilityMessage(owner, subject) });
    }
  }

  try {
    db.transaction(() => {
      if (!assignment) {
        db.prepare('INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)')
          .run(assignmentId(owner.id, subject, schedClass), owner.id, subject, schedClass);
      }
      db.prepare(`
        UPDATE schedules SET class = ?, time = ?, subject = ?, teacher = ?, teacher_id = ?, room = ?, day = ?
        WHERE id = ?
      `).run(schedClass, time, subject, owner.name, owner.id, room, day, req.params.id);
    })();
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message || '')) {
      return res.status(409).json({ message: 'Mapel dan kelas ini baru saja diampu guru lain. Muat ulang data.' });
    }
    return res.status(500).json({ message: error.message });
  }

  res.json(scheduleRow(req.params.id));
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  res.json({ message: 'Jadwal berhasil dihapus' });
});

module.exports = router;

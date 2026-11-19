const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { isTeacher, gradeScope, canManageStudent, canManageSubject } = require('../scope');

function mapGrade(g) {
  return {
    id: g.id,
    studentId: g.student_id,
    studentName: g.student_name,
    subject: g.subject,
    score: g.score,
    date: g.date
  };
}

// Batasi data nilai sesuai peran; dipakai untuk daftar dan detail.
function scopeFor(user) {
  return gradeScope(user);
}

// GET /api/grades
router.get('/', authenticateToken, (req, res) => {
  const { studentId, subject, class: classFilter } = req.query;
  let query = 'SELECT * FROM grades';
  const scope = scopeFor(req.user);
  const params = [...scope.params];
  const conditions = [scope.sql];

  if (studentId) {
    conditions.push('student_id = ?');
    params.push(studentId);
  }
  if (subject) {
    conditions.push('subject = ?');
    params.push(subject);
  }
  if (classFilter) {
    conditions.push('student_id IN (SELECT id FROM students WHERE class = ?)');
    params.push(classFilter);
  }
  query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY date DESC';

  const grades = db.prepare(query).all(...params).map(mapGrade);
  res.json(grades);
});

// GET /api/grades/:id
router.get('/:id', authenticateToken, (req, res) => {
  const scope = scopeFor(req.user);
  const grade = db
    .prepare(`SELECT * FROM grades WHERE id = ? AND (${scope.sql})`)
    .get(req.params.id, ...scope.params);
  if (!grade) return res.status(404).json({ message: 'Data nilai tidak ditemukan' });
  res.json(mapGrade(grade));
});

const normalizeGrade = (g) => ({
  id: g.id || null,
  studentId: g.studentId || g.student_id,
  studentName: g.studentName || g.student_name || '',
  subject: g.subject,
  score: g.score,
  date: g.date
});

const validateGrade = (g) => {
  if (!g.studentId || !g.studentName || !g.subject || g.score === undefined || !g.date) {
    return 'Data tidak lengkap';
  }
  const score = Number(g.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return 'Skor nilai harus berada di antara 0 dan 100';
  }
  return null;
};

// Nilai ikut terkunci bila sesi mengajar kelas/mapel/tanggal itu sudah dikirim.
const LOCKED_MESSAGE = 'Nilai sesi ini sudah dikirim dan dikunci';
const lockedSession = (studentId, subject, date) =>
  !!db.prepare(`
    SELECT 1 FROM lesson_sessions ls
    JOIN students s ON s.class = ls.class
    WHERE s.id = ? AND ls.subject = ? AND ls.date = ? AND ls.status = 'submitted'
  `).get(studentId, subject, date);

// POST /api/grades/bulk — simpan nilai satu kelas/mapel sekaligus
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru'), (req, res) => {
  const payload = Array.isArray(req.body.grades) ? req.body.grades : null;
  if (!payload || payload.length === 0) {
    return res.status(400).json({ message: 'Data nilai tidak valid' });
  }

  const grades = payload.map(normalizeGrade);
  for (const grade of grades) {
    const error = validateGrade(grade);
    if (error) return res.status(400).json({ message: error });
    if (!canManageSubject(req.user, grade.subject) || !canManageStudent(req.user, grade.studentId, grade.subject)) {
      return res.status(403).json({ message: 'Akses ditolak: bukan siswa/mapel yang Anda ampu' });
    }
    if (lockedSession(grade.studentId, grade.subject, grade.date)) {
      return res.status(409).json({ message: LOCKED_MESSAGE });
    }
  }

  const findExisting = db.prepare(
    'SELECT id FROM grades WHERE student_id = ? AND subject = ? AND date = ?'
  );
  const insert = db.prepare(`
    INSERT INTO grades (id, student_id, student_name, subject, score, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const update = db.prepare('UPDATE grades SET score = ?, student_name = ? WHERE id = ?');

  const saveAll = db.transaction((list) => {
    for (const grade of list) {
      const existing = findExisting.get(grade.studentId, grade.subject, grade.date);
      if (existing) {
        update.run(Number(grade.score), grade.studentName, existing.id);
      } else {
        insert.run(`grade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, grade.studentId, grade.studentName, grade.subject, Number(grade.score), grade.date);
      }
    }
  });

  try {
    saveAll(grades);
    res.status(201).json({ message: 'Nilai berhasil disimpan', total: grades.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/grades
router.post('/', authenticateToken, authorizeRoles('admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru'), (req, res) => {
  const grade = normalizeGrade(req.body);
  const validationError = validateGrade(grade);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (!canManageStudent(req.user, grade.studentId, grade.subject)) {
    return res.status(403).json({ message: 'Akses ditolak: bukan siswa/mapel yang Anda ampu' });
  }
  if (lockedSession(grade.studentId, grade.subject, grade.date)) {
    return res.status(409).json({ message: LOCKED_MESSAGE });
  }

  const id = `grade-${Date.now()}`;

  db.prepare(`
    INSERT INTO grades (id, student_id, student_name, subject, score, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, grade.studentId, grade.studentName, grade.subject, Number(grade.score), grade.date);

  const newGrade = mapGrade(db.prepare('SELECT * FROM grades WHERE id = ?').get(id));
  res.status(201).json(newGrade);
});

// PUT /api/grades/:id
router.put('/:id', authenticateToken, authorizeRoles('admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru'), (req, res) => {
  const body = normalizeGrade(req.body);
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM grades WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: 'Data nilai tidak ditemukan' });

  const nextStudentId = body.studentId ?? existing.student_id;
  const nextSubject = body.subject ?? existing.subject;
  const nextDate = body.date ?? existing.date;
  const nextScore = body.score === undefined ? existing.score : Number(body.score);
  if (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > 100) {
    return res.status(400).json({ message: 'Skor nilai harus berada di antara 0 dan 100' });
  }
  if (!canManageSubject(req.user, nextSubject) || !canManageStudent(req.user, nextStudentId, nextSubject)) {
    return res.status(403).json({ message: 'Akses ditolak: bukan siswa/mapel yang Anda ampu' });
  }
  if (lockedSession(nextStudentId, nextSubject, nextDate)) {
    return res.status(409).json({ message: LOCKED_MESSAGE });
  }

  db.prepare(`
    UPDATE grades SET student_id = ?, student_name = ?, subject = ?, score = ?, date = ?
    WHERE id = ?
  `).run(
    nextStudentId,
    body.studentName ?? existing.student_name,
    nextSubject,
    nextScore,
    nextDate,
    id
  );

  const updated = mapGrade(db.prepare('SELECT * FROM grades WHERE id = ?').get(id));
  res.json(updated);
});

// DELETE /api/grades/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru'), (req, res) => {
  const existing = db.prepare('SELECT * FROM grades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Data nilai tidak ditemukan' });
  if (!canManageSubject(req.user, existing.subject) || !canManageStudent(req.user, existing.student_id, existing.subject)) {
    return res.status(403).json({ message: 'Akses ditolak: bukan siswa/mapel yang Anda ampu' });
  }
  if (lockedSession(existing.student_id, existing.subject, existing.date)) {
    return res.status(409).json({ message: LOCKED_MESSAGE });
  }

  db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id);
  res.json({ message: 'Data nilai berhasil dihapus' });
});

module.exports = router;

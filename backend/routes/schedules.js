const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const teacherName = (teacherId) => {
  if (!teacherId) return null;
  const teacher = db.prepare('SELECT name FROM users WHERE id = ?').get(teacherId);
  return teacher ? teacher.name : null;
};

// GET /api/schedules
router.get('/', authenticateToken, (req, res) => {
  const { class: classFilter, day, teacherId } = req.query;
  let query = 'SELECT * FROM schedules';
  const conditions = [];
  const params = [];

  if (classFilter) {
    conditions.push('class = ?');
    params.push(classFilter);
  }
  if (day) {
    conditions.push('day = ?');
    params.push(day);
  }
  if (teacherId) {
    conditions.push('teacher_id = ?');
    params.push(teacherId);
  }
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY class ASC, time ASC';

  const schedules = db.prepare(query).all(...params);
  schedules.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    if (a.class !== b.class) return a.class.localeCompare(b.class, 'id');
    return a.time.localeCompare(b.time);
  });
  res.json(schedules);
});

// GET /api/schedules/:id
router.get('/:id', authenticateToken, (req, res) => {
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  res.json(schedule);
});

// POST /api/schedules
router.post('/', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const { class: schedClass, day, time, subject, room } = req.body;
  const teacherId = req.body.teacherId || req.body.teacher_id || null;
  const teacher = teacherName(teacherId) || req.body.teacher;

  if (!schedClass || !time || !subject || !teacher || !room) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const id = Date.now().toString();

  db.prepare(`
    INSERT INTO schedules (id, class, time, subject, teacher, teacher_id, room, day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, schedClass, time, subject, teacher, teacherId, room, day || 'Belum ditentukan');

  const newSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.status(201).json(newSchedule);
});

// PUT /api/schedules/:id
router.put('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const { class: schedClass, day, time, subject, room } = req.body;
  const teacherId = req.body.teacherId || req.body.teacher_id || null;
  const teacher = teacherName(teacherId) || req.body.teacher;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

  db.prepare(`
    UPDATE schedules SET class = ?, time = ?, subject = ?, teacher = ?, teacher_id = ?, room = ?, day = ?
    WHERE id = ?
  `).run(
    schedClass ?? existing.class,
    time ?? existing.time,
    subject ?? existing.subject,
    teacher ?? existing.teacher,
    teacherId ?? existing.teacher_id,
    room ?? existing.room,
    day ?? existing.day,
    id
  );

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  res.json({ message: 'Jadwal berhasil dihapus' });
});

module.exports = router;

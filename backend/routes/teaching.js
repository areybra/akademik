const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { hasFullAccess, canTeachSchedule } = require('../scope');

const TEACHING_ROLES = ['admin', 'kepala_sekolah', 'waka', 'guru', 'guru_mapel', 'wali_kelas'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const dayName = (iso) => DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

// Jam jadwal disimpan sebagai rentang teks, mis. "07:00 - 08:30".
const parseTimeRange = (text) => {
  const match = String(text || '').match(/(\d{1,2}):(\d{2})\s*[-\u2013]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  const endMin = Number(match[3]) * 60 + Number(match[4]);
  return endMin > startMin ? { startMin, endMin } : null;
};

const windowOf = (date, time) => {
  const range = parseTimeRange(time);
  if (!range) return null;
  const [year, month, day] = String(date).split('-').map(Number);
  const base = [year || 1970, (month || 1) - 1, day || 1];
  return {
    startAt: new Date(...base, 0, range.startMin).toISOString(),
    endAt: new Date(...base, 0, range.endMin).toISOString()
  };
};

const attendanceCount = (sessionId) =>
  db.prepare('SELECT COUNT(*) AS count FROM lesson_attendances WHERE session_id = ?').get(sessionId).count;

// Sesi yang sudah lewat jam selesai otomatis ditutup agar tidak menggantung.
const syncSession = (session, schedule) => {
  if (!session || session.status === 'submitted') return session;
  const window = schedule ? windowOf(session.date, schedule.time) : null;
  if (!window || Date.now() <= new Date(window.endAt).getTime()) return session;
  db.prepare(`
    UPDATE lesson_sessions SET status = 'submitted', submitted_at = ?, updated_at = ?
    WHERE id = ? AND status = 'draft'
  `).run(window.endAt, new Date().toISOString(), session.id);
  return db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(session.id);
};

const assignmentsOf = (user) => db.prepare(`
  SELECT id, subject, class FROM teacher_assignments
  WHERE teacher_id = ? ORDER BY class, subject
`).all(user.id);

const isAssigned = (user, className, subject) =>
  !!db.prepare(`
    SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class = ? AND subject = ?
  `).get(user.id, className, subject);

const studentsOf = (className) => db.prepare(`
  SELECT id, name, class FROM students
  WHERE class = ? AND status = 'siswa aktif'
  ORDER BY name ASC
`).all(className);

const mapSession = (session, className) => {
  const rows = db.prepare(`
    SELECT student_id, student_name, status, note FROM lesson_attendances WHERE session_id = ?
  `).all(session.id);
  return {
    id: session.id,
    scheduleId: session.schedule_id,
    date: session.date,
    class: session.class || className,
    subject: session.subject,
    teacherId: session.teacher_id,
    updatedAt: session.updated_at,
    status: session.status || 'draft',
    submittedAt: session.submitted_at || null,
    records: rows.map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      status: row.status,
      note: row.note || ''
    }))
  };
};

// GET /api/teaching/today?date=YYYY-MM-DD
router.get('/today', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const date = String(req.query.date || todayISO());
  const day = dayName(date);

  const daySchedules = db.prepare(`
    SELECT * FROM schedules WHERE day = ? ORDER BY time ASC
  `).all(day);

  const mySchedules = hasFullAccess(req.user)
    ? daySchedules
    : daySchedules.filter((schedule) => canTeachSchedule(req.user, schedule));

  const slots = mySchedules.map((schedule) => {
    let session = db.prepare(
      'SELECT * FROM lesson_sessions WHERE schedule_id = ? AND date = ?'
    ).get(schedule.id, date);
    session = syncSession(session, schedule);
    const total = studentsOf(schedule.class).length;
    const filled = session ? attendanceCount(session.id) : 0;
    const window = windowOf(date, schedule.time);

    return {
      id: schedule.id,
      class: schedule.class,
      time: schedule.time,
      subject: schedule.subject,
      teacher: schedule.teacher,
      teacherId: schedule.teacher_id,
      room: schedule.room,
      day: schedule.day,
      sessionId: session ? session.id : null,
      filled,
      total,
      complete: total > 0 && filled >= total,
      status: session ? session.status || 'draft' : 'draft',
      submittedAt: session ? session.submitted_at || null : null,
      startAt: window ? window.startAt : null,
      endAt: window ? window.endAt : null,
      missingInput: !!window && Date.now() > new Date(window.endAt).getTime() && filled === 0
    };
  });

  res.json({
    date,
    day,
    assignments: assignmentsOf(req.user),
    slots
  });
});

// GET /api/teaching/assignments
router.get('/assignments', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  res.json(assignmentsOf(req.user));
});

// POST /api/teaching/sessions { scheduleId, date }
router.post('/sessions', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const scheduleId = String(req.body.scheduleId || '');
  const date = String(req.body.date || todayISO());

  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
  if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  if (!canTeachSchedule(req.user, schedule)) {
    return res.status(403).json({ message: 'Jadwal ini bukan jadwal mengajar Anda' });
  }

  const window = windowOf(date, schedule.time);
  if (!hasFullAccess(req.user) && window && Date.now() < new Date(window.startAt).getTime()) {
    return res.status(403).json({ message: 'Sesi belum dimulai' });
  }

  const existing = db.prepare(
    'SELECT * FROM lesson_sessions WHERE schedule_id = ? AND date = ?'
  ).get(scheduleId, date);

  let session = existing;
  const now = new Date().toISOString();
  if (!session) {
    const id = `session-${scheduleId}-${date}`;
    db.prepare(`
      INSERT INTO lesson_sessions (id, schedule_id, date, class, subject, teacher_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, scheduleId, date, schedule.class, schedule.subject, req.user.id, now, now);
    session = db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(id);
  }
  session = syncSession(session, schedule);

  res.json({
    ...mapSession(session, schedule.class),
    students: studentsOf(schedule.class)
  });
});

// GET /api/teaching/sessions/:id
router.get('/sessions/:id', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const session = db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Sesi mengajar tidak ditemukan' });
  if (!hasFullAccess(req.user) && session.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(session.schedule_id);
  const current = syncSession(session, schedule);
  res.json({
    ...mapSession(current),
    students: studentsOf(session.class)
  });
});

// PUT /api/teaching/sessions/:id { attendances: [{ studentId, status, note }] }
router.put('/sessions/:id', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const session = db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Sesi mengajar tidak ditemukan' });
  if (!hasFullAccess(req.user) && session.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(session.schedule_id);
  const current = syncSession(session, schedule);
  if (current.status === 'submitted') {
    return res.status(409).json({ message: 'Sesi sudah ditutup dan dikunci' });
  }
  const window = schedule ? windowOf(session.date, schedule.time) : null;
  if (!hasFullAccess(req.user) && window && Date.now() < new Date(window.startAt).getTime()) {
    return res.status(403).json({ message: 'Sesi belum dimulai' });
  }

  const payload = Array.isArray(req.body.attendances) ? req.body.attendances : null;
  if (!payload || payload.length === 0) {
    return res.status(400).json({ message: 'Data absensi tidak valid' });
  }

  const className = session.class;
  const validStudents = new Map(studentsOf(className).map((student) => [student.id, student]));
  const rows = [];
  for (const item of payload) {
    const studentId = item.studentId || item.student_id;
    const student = validStudents.get(studentId);
    if (!student) {
      return res.status(400).json({ message: 'Ada siswa yang bukan anggota kelas ini' });
    }
    const status = ['hadir', 'izin', 'alfa'].includes(item.status) ? item.status : 'hadir';
    rows.push({ studentId, studentName: student.name, status, note: item.note || null });
  }

  const upsert = db.prepare(`
    INSERT INTO lesson_attendances (session_id, student_id, student_name, status, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id, student_id) DO UPDATE SET status = excluded.status, note = excluded.note
  `);
  const saveAll = db.transaction((list) => {
    for (const row of list) {
      upsert.run(session.id, row.studentId, row.studentName, row.status, row.note);
    }
    db.prepare('UPDATE lesson_sessions SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), session.id);
  });

  try {
    saveAll(rows);
    res.json({ message: 'Absensi mengajar tersimpan', total: rows.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/teaching/sessions/:id/submit — kunci sesi setelah absensi + nilai selesai
router.post('/sessions/:id/submit', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const session = db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Sesi mengajar tidak ditemukan' });
  if (!hasFullAccess(req.user) && session.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(session.schedule_id);
  const current = syncSession(session, schedule);
  if (current.status === 'submitted') {
    return res.json({ message: 'Sesi sudah ditutup', status: 'submitted', submittedAt: current.submitted_at });
  }

  const total = studentsOf(session.class).length;
  const filled = attendanceCount(session.id);
  if (total > 0 && filled < total) {
    return res.status(400).json({ message: 'Absensi belum lengkap. Isi semua siswa sebelum mengirim.' });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE lesson_sessions SET status = 'submitted', submitted_at = ?, updated_at = ? WHERE id = ?"
  ).run(now, now, session.id);
  res.json({ message: 'Sesi dikirim dan dikunci', status: 'submitted', submittedAt: now });
});

// POST /api/teaching/sessions/:id/unlock — admin membuka kembali sesi terkunci
router.post('/sessions/:id/unlock', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const session = db.prepare('SELECT * FROM lesson_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Sesi mengajar tidak ditemukan' });

  db.prepare(
    "UPDATE lesson_sessions SET status = 'draft', submitted_at = NULL, updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), session.id);
  res.json({ message: 'Sesi dibuka kembali', status: 'draft' });
});

// GET /api/teaching/gradebook?class=&subject=
router.get('/gradebook', authenticateToken, authorizeRoles(...TEACHING_ROLES), (req, res) => {
  const className = String(req.query.class || '');
  const subject = String(req.query.subject || '');
  if (!className || !subject) {
    return res.status(400).json({ message: 'Kelas dan mata pelajaran wajib diisi' });
  }
  if (!hasFullAccess(req.user) && !isAssigned(req.user, className, subject)) {
    return res.status(403).json({ message: 'Anda tidak mengampu mapel/kelas ini' });
  }

  const latestRows = db.prepare(`
    SELECT g.student_id, g.score, g.date
    FROM grades g
    JOIN (
      SELECT student_id, MAX(date) AS date FROM grades
      WHERE subject = ? GROUP BY student_id
    ) latest ON latest.student_id = g.student_id AND latest.date = g.date
    WHERE g.subject = ?
  `).all(subject, subject);
  const latestMap = new Map();
  for (const row of latestRows) latestMap.set(row.student_id, row);

  const students = studentsOf(className).map((student) => {
    const latest = latestMap.get(student.id);
    return {
      ...student,
      latestScore: latest ? latest.score : null,
      latestDate: latest ? latest.date : null
    };
  });

  res.json({ class: className, subject, students });
});

module.exports = router;

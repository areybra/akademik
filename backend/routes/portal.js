const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { getRoles, hasFullAccess, studentIdOf } = require('../scope');

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const shiftDate = (iso, days) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dayName = (iso) => DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const allowedStudents = (user) => {
  const roles = getRoles(user);
  if (hasFullAccess(user)) {
    return db.prepare('SELECT id, name, class, foto_siswa AS photo FROM students ORDER BY name').all();
  }
  if (roles.includes('orang_tua')) {
    return db.prepare(`
      SELECT s.id, s.name, s.class, s.foto_siswa AS photo
      FROM students s
      JOIN parent_students ps ON ps.student_id = s.id
      WHERE ps.parent_id = ?
      ORDER BY s.name
    `).all(user.id);
  }
  if (roles.includes('siswa')) {
    return db.prepare('SELECT id, name, class, foto_siswa AS photo FROM students WHERE id = ?')
      .all(studentIdOf(user));
  }
  return [];
};

const attendanceSummary = (studentId, referenceDate) => {
  const since = shiftDate(referenceDate, -29);
  const rows = db.prepare(`
    SELECT date, status, note FROM attendances
    WHERE student_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(studentId, since, referenceDate);

  const counts = { hadir: 0, izin: 0, alfa: 0, total: 0 };
  for (const row of rows) {
    counts.total += 1;
    if (row.status === 'hadir') counts.hadir += 1;
    else if (row.status === 'izin') counts.izin += 1;
    else if (row.status === 'alfa') counts.alfa += 1;
  }

  const trendStart = shiftDate(referenceDate, -13);
  const trendRows = db.prepare(`
    SELECT date, status, note FROM attendances
    WHERE student_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(studentId, trendStart, referenceDate);
  const trendMap = new Map(trendRows.map((row) => [row.date, row]));
  const trend = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = shiftDate(trendStart, offset);
    const row = trendMap.get(date);
    trend.push({
      date,
      status: row ? row.status : null,
      hadir: row && row.status === 'hadir' ? 1 : 0,
      izin: row && row.status === 'izin' ? 1 : 0,
      alfa: row && row.status === 'alfa' ? 1 : 0
    });
  }

  return {
    referenceDate,
    rate: counts.total > 0 ? round((counts.hadir / counts.total) * 100) : 0,
    counts,
    trend,
    records: rows
  };
};

const gradeSummary = (studentId) => {
  const rows = db.prepare(`
    SELECT subject, score, date FROM grades
    WHERE student_id = ?
    ORDER BY date ASC, rowid ASC
  `).all(studentId);

  const bySubject = new Map();
  for (const row of rows) {
    const entry = bySubject.get(row.subject) || { scores: [], dates: [] };
    entry.scores.push(Number(row.score) || 0);
    entry.dates.push(row.date);
    bySubject.set(row.subject, entry);
  }

  const subjects = Array.from(bySubject.entries()).map(([subject, entry]) => {
    const latest = entry.scores[entry.scores.length - 1] || 0;
    const previous = entry.scores.length > 1 ? entry.scores[entry.scores.length - 2] : latest;
    const average = entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length;
    return {
      subject,
      score: latest,
      average: round(average),
      delta: round(latest - previous),
      count: entry.scores.length,
      date: entry.dates[entry.dates.length - 1] || null
    };
  }).sort((a, b) => b.score - a.score);

  const average = subjects.length > 0
    ? round(subjects.reduce((sum, item) => sum + item.score, 0) / subjects.length)
    : 0;

  const recent = db.prepare(`
    SELECT subject, score, date FROM grades
    WHERE student_id = ?
    ORDER BY date DESC, rowid DESC
    LIMIT 5
  `).all(studentId);

  return { average, subjects, recent };
};

const billingSummary = (studentId) => {
  const rows = db.prepare(`
    SELECT period, amount, status FROM bills WHERE student_id = ? ORDER BY period ASC
  `).all(studentId);

  const unpaid = rows.filter((row) => row.status !== 'paid');
  const paid = rows.filter((row) => row.status === 'paid');
  const labels = {
    paid: 'Lunas',
    pending_verification: 'Menunggu verifikasi',
    requested: 'Belum dibayar',
    rejected: 'Ditolak'
  };

  return {
    total: rows.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    outstanding: unpaid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    totalAmount: rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    paidAmount: paid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    nextBill: unpaid[0]
      ? { period: unpaid[0].period, amount: Number(unpaid[0].amount) || 0, status: unpaid[0].status, label: labels[unpaid[0].status] || unpaid[0].status }
      : null,
    byStatus: Object.keys(labels).map((status) => ({
      status,
      label: labels[status],
      count: rows.filter((row) => row.status === status).length,
      amount: rows.filter((row) => row.status === status).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    })).filter((item) => item.count > 0)
  };
};

const scheduleSummary = (className, date) => {
  const tomorrow = shiftDate(date, 1);
  const load = (day) => db.prepare(`
    SELECT time, subject, teacher, room FROM schedules
    WHERE class = ? AND day = ?
    ORDER BY time ASC
  `).all(className, day);

  return {
    today: load(dayName(date)),
    tomorrow: load(dayName(tomorrow)),
    todayLabel: dayName(date),
    tomorrowLabel: dayName(tomorrow)
  };
};

// GET /api/portal/summary?studentId=
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const children = allowedStudents(req.user);
    if (children.length === 0) {
      return res.json({
        children: [],
        selected: null,
        message: 'Akun ini belum tertaut ke data siswa. Hubungi admin sekolah.'
      });
    }

    const requested = String(req.query.studentId || '');
    const student = children.find((child) => child.id === requested) || children[0];
    const today = todayISO();

    const latestRow = db
      .prepare('SELECT MAX(date) AS latest FROM attendances WHERE student_id = ? AND date <= ?')
      .get(student.id, today);
    const referenceDate = latestRow && latestRow.latest ? latestRow.latest : today;
    const attendance = attendanceSummary(student.id, referenceDate);
    const todayRow = db
      .prepare('SELECT date, status, note FROM attendances WHERE student_id = ? AND date = ?')
      .get(student.id, today);

    const waliKelas = db.prepare(`
      SELECT name FROM users
      WHERE (role = 'wali_kelas' OR roles LIKE '%wali_kelas%') AND class = ?
      LIMIT 1
    `).get(student.class);

    const prestasi = db.prepare(`
      SELECT kategori, juara, event, tahun FROM prestasi
      WHERE student_id = ? ORDER BY tahun DESC, rowid DESC LIMIT 3
    `).all(student.id);

    res.json({
      generatedAt: new Date().toISOString(),
      children,
      selected: {
        profile: {
          ...student,
          waliKelas: waliKelas ? waliKelas.name : null
        },
        attendance: {
          ...attendance,
          today: {
            date: today,
            status: todayRow ? todayRow.status : null,
            note: todayRow ? todayRow.note : null,
            isToday: Boolean(todayRow)
          }
        },
        grades: gradeSummary(student.id),
        billing: billingSummary(student.id),
        schedule: scheduleSummary(student.class, today),
        prestasi
      }
    });
  } catch (error) {
    console.error('Portal summary error:', error);
    res.status(500).json({ message: 'Gagal memuat ringkasan anak' });
  }
});

module.exports = router;

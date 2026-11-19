const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const {
  studentScope,
  attendanceScope,
  gradeScope,
  billingScope,
  getRoles,
  hasFullAccess,
  canTeachSchedule
} = require('../scope');

const LEVEL_ORDER = ['X', 'XI', 'XII'];
const MAJOR_ORDER = ['AKL', 'BDP', 'MM', 'OTKP', 'RPL', 'TBSM', 'TKJ', 'TKR'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const shiftDate = (iso, days) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const levelOf = (className) => {
  const first = String(className || '').trim().split(/\s+/)[0] || '';
  return first.toUpperCase();
};

const majorOf = (className) => {
  const parts = String(className || '').trim().split(/\s+/);
  return (parts[1] || '').toUpperCase();
};

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

// Jam selesai dilewati → sesi dianggap tertutup walau belum sempat dikirim.
const hasEnded = (iso, time) => {
  const match = String(time || '').match(/-\s*(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const [year, month, day] = String(iso).split('-').map(Number);
  const end = new Date(year || 1970, (month || 1) - 1, day || 1, Number(match[1]), Number(match[2]));
  return Date.now() > end.getTime();
};

const emptyAttendance = () => ({ total: 0, hadir: 0, izin: 0, alfa: 0, percentage: 0 });

const summarizeAttendance = (rows) => {
  const stats = emptyAttendance();
  for (const row of rows) {
    const count = Number(row.count) || 0;
    stats.total += count;
    if (row.status === 'hadir') stats.hadir += count;
    else if (row.status === 'izin') stats.izin += count;
    else if (row.status === 'alfa') stats.alfa += count;
  }
  stats.percentage = stats.total > 0 ? round((stats.hadir / stats.total) * 100) : 0;
  return stats;
};

// GET /api/dashboard/summary — ringkasan dashboard (data mengikuti scope peran)
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const roles = getRoles(user);
    const fullAccess = hasFullAccess(user);
    const personal = roles.includes('siswa') || roles.includes('orang_tua');
    let audience = 'teacher';
    if (roles.includes('admin')) audience = 'admin';
    else if (roles.includes('kepala_sekolah') || roles.includes('waka')) audience = 'supervisor';
    else if (roles.includes('kepala_tu') || roles.includes('staff_tu')) audience = 'tu';
    else if (personal) audience = 'personal';

    // ---- Siswa ----
    const studentScopeDef = studentScope(user);
    const studentRows = db
      .prepare(`SELECT class, gender FROM students WHERE ${studentScopeDef.sql}`)
      .all(...studentScopeDef.params);

    const byLevelMap = new Map();
    const byMajorMap = new Map();
    const byGenderMap = new Map();
    const classSet = new Set();

    for (const row of studentRows) {
      const className = String(row.class || '').trim();
      if (className) classSet.add(className);

      const level = levelOf(className);
      byLevelMap.set(level, (byLevelMap.get(level) || 0) + 1);

      const major = majorOf(className);
      if (major) byMajorMap.set(major, (byMajorMap.get(major) || 0) + 1);

      const gender = row.gender === 'P' ? 'P' : 'L';
      byGenderMap.set(gender, (byGenderMap.get(gender) || 0) + 1);
    }

    const sortByOrder = (map, order, prefix = '') => {
      const entries = Array.from(map.entries());
      return entries
        .sort((a, b) => {
          const indexA = order.indexOf(a[0]);
          const indexB = order.indexOf(b[0]);
          if (indexA !== -1 || indexB !== -1) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          }
          return a[0].localeCompare(b[0], 'id', { numeric: true });
        })
        .map(([label, count]) => ({ label: `${prefix}${label}`, count }));
    };

    // ---- Guru ----
    let teachers = null;
    if (fullAccess) {
      teachers = db.prepare('SELECT COUNT(*) AS count FROM teachers').get().count;
    }

    // ---- Absensi ----
    const attendanceScopeDef = attendanceScope(user);
    const latestRow = db
      .prepare(`SELECT MAX(date) AS latest FROM attendances WHERE ${attendanceScopeDef.sql}`)
      .get(...attendanceScopeDef.params);
    const today = todayISO();
    const latestDate = latestRow && latestRow.latest ? latestRow.latest : today;
    const referenceDate = latestDate > today ? today : latestDate;
    const isToday = referenceDate === today;

    const todayRows = db
      .prepare(
        `SELECT status, COUNT(*) AS count FROM attendances
         WHERE date = ? AND (${attendanceScopeDef.sql}) GROUP BY status`
      )
      .all(referenceDate, ...attendanceScopeDef.params);
    const todayStats = summarizeAttendance(todayRows);

    const trendStart = shiftDate(referenceDate, -13);
    const trendRows = db
      .prepare(
        `SELECT date, status, COUNT(*) AS count FROM attendances
         WHERE date >= ? AND date <= ? AND (${attendanceScopeDef.sql})
         GROUP BY date, status`
      )
      .all(trendStart, referenceDate, ...attendanceScopeDef.params);

    const trendMap = new Map();
    for (const row of trendRows) {
      if (!trendMap.has(row.date)) trendMap.set(row.date, {});
      const bucket = trendMap.get(row.date);
      bucket[row.status] = (Number(row.count) || 0);
    }

    const trend = [];
    for (let offset = 0; offset < 14; offset++) {
      const date = shiftDate(trendStart, offset);
      const bucket = trendMap.get(date) || {};
      const hadir = bucket.hadir || 0;
      const izin = bucket.izin || 0;
      const alfa = bucket.alfa || 0;
      trend.push({ date, hadir, izin, alfa, total: hadir + izin + alfa });
    }

    // ---- Nilai ----
    const gradeScopeDef = gradeScope(user);
    const gradeRows = db
      .prepare(`SELECT subject, score, student_id, student_name FROM grades WHERE ${gradeScopeDef.sql}`)
      .all(...gradeScopeDef.params);

    const subjectMap = new Map();
    const bandCounts = { '90+': 0, '80-89': 0, '70-79': 0, '<70': 0 };
    let scoreSum = 0;

    for (const row of gradeRows) {
      const score = Number(row.score) || 0;
      scoreSum += score;

      const subject = String(row.subject || 'Lainnya');
      const entry = subjectMap.get(subject) || { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      subjectMap.set(subject, entry);

      if (score >= 90) bandCounts['90+'] += 1;
      else if (score >= 80) bandCounts['80-89'] += 1;
      else if (score >= 70) bandCounts['70-79'] += 1;
      else bandCounts['<70'] += 1;
    }

    const bySubject = Array.from(subjectMap.entries())
      .map(([subject, entry]) => ({
        subject,
        average: round(entry.sum / entry.count),
        count: entry.count
      }))
      .sort((a, b) => b.average - a.average);

    const distribution = ['90+', '80-89', '70-79', '<70'].map((label) => ({
      label,
      count: bandCounts[label]
    }));

    const studentAverageMap = new Map();
    for (const row of gradeRows) {
      if (!row.student_id) continue;
      const entry = studentAverageMap.get(row.student_id) || {
        name: row.student_name,
        sum: 0,
        count: 0
      };
      entry.sum += Number(row.score) || 0;
      entry.count += 1;
      studentAverageMap.set(row.student_id, entry);
    }

    const topStudents = Array.from(studentAverageMap.entries())
      .map(([studentId, entry]) => {
        const student = db.prepare('SELECT class FROM students WHERE id = ?').get(studentId);
        return {
          name: entry.name,
          class: student ? student.class : '',
          average: round(entry.sum / entry.count)
        };
      })
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    // ---- Tagihan ----
    const billingScopeDef = billingScope(user);
    const billRows = db
      .prepare(`SELECT status, amount, period FROM bills WHERE ${billingScopeDef.sql}`)
      .all(...billingScopeDef.params);

    const billStatusMap = new Map();
    const billMonthlyMap = new Map();
    let amountTotal = 0;
    let amountPaid = 0;
    let paidCount = 0;

    for (const row of billRows) {
      const amount = Number(row.amount) || 0;
      amountTotal += amount;
      if (row.status === 'paid') {
        amountPaid += amount;
        paidCount += 1;
      }

      const statusEntry = billStatusMap.get(row.status) || { count: 0, amount: 0 };
      statusEntry.count += 1;
      statusEntry.amount += amount;
      billStatusMap.set(row.status, statusEntry);

      if (row.period) {
        const periodEntry = billMonthlyMap.get(row.period) || { total: 0, paid: 0 };
        periodEntry.total += amount;
        if (row.status === 'paid') periodEntry.paid += amount;
        billMonthlyMap.set(row.period, periodEntry);
      }
    }

    const billingStatusLabels = {
      paid: 'Lunas',
      pending_verification: 'Menunggu Verifikasi',
      requested: 'Diajukan',
      rejected: 'Ditolak'
    };

    const byStatus = Array.from(billStatusMap.entries())
      .map(([status, entry]) => ({
        status,
        label: billingStatusLabels[status] || status,
        count: entry.count,
        amount: entry.amount
      }))
      .sort((a, b) => b.count - a.count);

    const monthly = Array.from(billMonthlyMap.entries())
      .map(([period, entry]) => ({ period, total: entry.total, paid: entry.paid }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-6);

    // ---- Kelas dengan kehadiran terendah (30 hari terakhir) ----
    const since = shiftDate(referenceDate, -29);
    const classAttendanceRows = db
      .prepare(
        `SELECT s.class AS class, COUNT(*) AS total,
                SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) AS hadir
         FROM attendances a
         JOIN students s ON s.id = a.student_id
         WHERE a.date >= ? AND a.date <= ? AND (${attendanceScopeDef.sql})
         GROUP BY s.class
         HAVING total > 0
         ORDER BY (CAST(hadir AS REAL) / total) ASC
         LIMIT 5`
      )
      .all(since, referenceDate, ...attendanceScopeDef.params);

    const topClasses = classAttendanceRows.map((row) => ({
      class: row.class,
      total: row.total,
      hadir: row.hadir,
      rate: row.total > 0 ? round((row.hadir / row.total) * 100) : 0
    }));

    // ---- Sesi mengajar hari ini (guru) ----
    let teaching = null;
    if (audience === 'teacher') {
      const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = DAY_NAMES[new Date(`${today}T00:00:00Z`).getUTCDay()];
      const mySchedules = db
        .prepare('SELECT * FROM schedules WHERE day = ? ORDER BY time ASC')
        .all(dayName)
        .filter((schedule) => canTeachSchedule(user, schedule));

      const slots = mySchedules.map((schedule) => {
        const session = db
          .prepare('SELECT * FROM lesson_sessions WHERE schedule_id = ? AND date = ?')
          .get(schedule.id, today);
        const total = db
          .prepare("SELECT COUNT(*) AS count FROM students WHERE class = ? AND status = 'siswa aktif'")
          .get(schedule.class).count;
        const filled = session
          ? db.prepare('SELECT COUNT(*) AS count FROM lesson_attendances WHERE session_id = ?').get(session.id).count
          : 0;

        let status = 'empty';
        if (filled > 0) status = total > 0 && filled >= total ? 'complete' : 'partial';
        if ((session && session.status === 'submitted') || hasEnded(today, schedule.time)) status = 'locked';

        return {
          id: schedule.id,
          time: schedule.time,
          class: schedule.class,
          subject: schedule.subject,
          room: schedule.room,
          filled,
          total,
          status
        };
      });

      teaching = {
        date: today,
        total: slots.length,
        submitted: slots.filter((slot) => slot.status === 'locked').length,
        pending: slots.filter((slot) => slot.status !== 'locked').length,
        missing: slots.filter((slot) => slot.filled === 0).length,
        slots
      };
    }

    res.json({
      generatedAt: new Date().toISOString(),
      audience,
      fullAccess,
      counts: {
        students: studentRows.length,
        teachers,
        classes: classSet.size
      },
      attendance: {
        referenceDate,
        isToday,
        today: todayStats,
        trend
      },
      students: {
        byLevel: sortByOrder(byLevelMap, LEVEL_ORDER),
        byMajor: sortByOrder(byMajorMap, MAJOR_ORDER),
        byGender: ['L', 'P']
          .map((gender) => ({
            label: gender === 'L' ? 'Laki-laki' : 'Perempuan',
            count: byGenderMap.get(gender) || 0
          }))
          .filter((item) => item.count > 0)
      },
      grades: {
        average: gradeRows.length > 0 ? round(scoreSum / gradeRows.length) : 0,
        total: gradeRows.length,
        bySubject,
        distribution
      },
      billing: {
        total: billRows.length,
        paid: paidCount,
        unpaid: billRows.length - paidCount,
        amountTotal,
        amountPaid,
        amountOutstanding: amountTotal - amountPaid,
        byStatus,
        monthly
      },
      topClasses,
      topStudents,
      teaching
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Gagal memuat ringkasan dashboard' });
  }
});

module.exports = router;

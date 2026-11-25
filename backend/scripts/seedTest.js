require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../database');

const dbFile = path.join(__dirname, '..', 'school.db');
const backupDir = path.join(__dirname, '..', 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const today = new Date();
const ymd = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

const users = [
  { email: 'admin@example.com', password: 'Password123', name: 'Administrator', role: 'admin', roles: ['admin'] },
  { email: 'stafftu@smk.id', password: 'Password123', name: 'Staff Tata Usaha', role: 'staff_tu', roles: ['staff_tu'] },
  { email: 'guru@smk.id', password: 'guru123', name: 'Budi Santoso, S.Kom.', role: 'guru', roles: ['guru', 'guru_mapel'], teacher_id: 'teacher-001' },
  { email: 'rina@smk.id', password: 'guru123', name: 'Rina Marlina, S.Pd.', role: 'guru_mapel', roles: ['guru_mapel', 'wali_kelas'], class: 'X RPL 1', teacher_id: 'teacher-002' },
  { email: 'agus@smk.id', password: 'guru123', name: 'Agus Setiawan, M.Pd.', role: 'guru_mapel', roles: ['guru_mapel'], teacher_id: 'teacher-003' },
  { email: 'siswa@smk.id', password: 'siswa123', name: 'Ahmad Fauzi', role: 'siswa', roles: ['siswa'], student_id: 'std-001' },
  { email: 'ortu@smk.id', password: 'ortu123', name: 'Siti Aminah', role: 'orang_tua', roles: ['orang_tua'], children: ['std-001', 'std-002'] },
  { email: 'ortu2@smk.id', password: 'ortu123', name: 'Dewi Lestari', role: 'orang_tua', roles: ['orang_tua'], children: ['std-005'] }
];

const students = [
  ['std-001', 'Ahmad Fauzi', 'NJ2026001', 'Laki-laki', 'X RPL 1', 'siswa aktif'],
  ['std-002', 'Bella Putri Lestari', 'NJ2026002', 'Perempuan', 'X RPL 1', 'siswa aktif'],
  ['std-003', 'Candra Wijaya', 'NJ2026003', 'Laki-laki', 'X RPL 1', 'siswa aktif'],
  ['std-004', 'Dewi Anggraini', 'NJ2026004', 'Perempuan', 'X RPL 1', 'siswa aktif'],
  ['std-005', 'Eko Prasetyo', 'NJ2026005', 'Laki-laki', 'XI RPL 1', 'siswa aktif'],
  ['std-006', 'Fitri Handayani', 'NJ2026006', 'Perempuan', 'XI RPL 1', 'siswa aktif'],
  ['std-007', 'Gilang Ramadhan', 'NJ2026007', 'Laki-laki', 'XI RPL 1', 'siswa aktif'],
  ['std-008', 'Hana Safira', 'NJ2026008', 'Perempuan', 'XI RPL 1', 'siswa aktif'],
  ['std-009', 'Irfan Maulana', 'NJ2026009', 'Laki-laki', 'XII TKJ 1', 'siswa aktif'],
  ['std-010', 'Jihan Aulia', 'NJ2026010', 'Perempuan', 'XII TKJ 1', 'siswa aktif'],
  ['std-011', 'Kurniawan Adi', 'NJ2026011', 'Laki-laki', 'XII TKJ 1', 'siswa aktif'],
  ['std-012', 'Lestari Ningsih', 'NJ2026012', 'Perempuan', 'XII TKJ 1', 'siswa lulus']
];

const teachers = [
  ['teacher-001', 'Budi Santoso, S.Kom.', 'GJ2001', 'Laki-laki', ['Informatika', 'Pemrograman Web'], ['X RPL 1', 'XI RPL 1']],
  ['teacher-002', 'Rina Marlina, S.Pd.', 'GJ2002', 'Perempuan', ['Matematika'], ['X RPL 1', 'XI RPL 1', 'XII TKJ 1']],
  ['teacher-003', 'Agus Setiawan, M.Pd.', 'GJ2003', 'Laki-laki', ['Bahasa Indonesia'], ['X RPL 1', 'XI RPL 1', 'XII TKJ 1']]
];

const teacherName = Object.fromEntries(teachers.map((row) => [row[0], row[1]]));
const teacherAccount = {
  'teacher-001': 'user-guru',
  'teacher-002': 'user-rina',
  'teacher-003': 'user-agus'
};

const schedules = [
  ['sched-001', 'X RPL 1', '07:00 - 08:30', 'Matematika', 'teacher-002', 'R-101', 'Senin'],
  ['sched-002', 'X RPL 1', '08:30 - 10:00', 'Informatika', 'teacher-001', 'Lab Kom 1', 'Senin'],
  ['sched-003', 'X RPL 1', '10:15 - 11:45', 'Bahasa Indonesia', 'teacher-003', 'R-101', 'Senin'],
  ['sched-004', 'XI RPL 1', '07:00 - 08:30', 'Pemrograman Web', 'teacher-001', 'Lab Kom 2', 'Senin'],
  ['sched-005', 'XI RPL 1', '10:15 - 11:45', 'Bahasa Indonesia', 'teacher-003', 'R-202', 'Senin'],
  ['sched-006', 'XII TKJ 1', '08:30 - 10:00', 'Matematika', 'teacher-002', 'R-303', 'Senin'],
  ['sched-007', 'X RPL 1', '07:00 - 08:30', 'Pemrograman Web', 'teacher-001', 'Lab Kom 1', 'Selasa'],
  ['sched-008', 'XI RPL 1', '08:30 - 10:00', 'Informatika', 'teacher-001', 'Lab Kom 2', 'Selasa'],
  ['sched-009', 'XII TKJ 1', '13:00 - 14:30', 'Bahasa Indonesia', 'teacher-003', 'R-303', 'Selasa'],
  ['sched-010', 'X RPL 1', '07:00 - 08:30', 'Bahasa Indonesia', 'teacher-003', 'R-101', 'Rabu'],
  ['sched-011', 'XI RPL 1', '10:15 - 11:45', 'Matematika', 'teacher-002', 'R-202', 'Rabu'],
  ['today-1', 'X RPL 1', '16:30 - 18:00', 'Informatika', 'teacher-001', 'Lab Kom 1', DAY_NAMES[today.getDay()]],
  ['today-2', 'XI RPL 1', '16:30 - 18:00', 'Bahasa Indonesia', 'teacher-003', 'R-202', DAY_NAMES[today.getDay()]],
  ['today-3', 'XII TKJ 1', '16:30 - 18:00', 'Matematika', 'teacher-002', 'R-303', DAY_NAMES[today.getDay()]]
];

const assignments = [
  ['teacher-001', 'Informatika', 'X RPL 1'],
  ['teacher-001', 'Pemrograman Web', 'X RPL 1'],
  ['teacher-001', 'Informatika', 'XI RPL 1'],
  ['teacher-001', 'Pemrograman Web', 'XI RPL 1'],
  ['teacher-002', 'Matematika', 'X RPL 1'],
  ['teacher-002', 'Matematika', 'XI RPL 1'],
  ['teacher-002', 'Matematika', 'XII TKJ 1'],
  ['teacher-003', 'Bahasa Indonesia', 'X RPL 1'],
  ['teacher-003', 'Bahasa Indonesia', 'XI RPL 1'],
  ['teacher-003', 'Bahasa Indonesia', 'XII TKJ 1']
];

const parentLinks = [
  ['ortu@smk.id', 'std-001'],
  ['ortu@smk.id', 'std-002'],
  ['ortu2@smk.id', 'std-005']
];

const subjectsByClass = {
  'X RPL 1': ['Informatika', 'Pemrograman Web', 'Matematika', 'Bahasa Indonesia'],
  'XI RPL 1': ['Informatika', 'Pemrograman Web', 'Matematika', 'Bahasa Indonesia'],
  'XII TKJ 1': ['Matematika', 'Bahasa Indonesia']
};

const attendanceStatuses = ['hadir', 'hadir', 'izin', 'hadir', 'alfa', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'hadir', 'hadir'];

db.pragma('wal_checkpoint(TRUNCATE)');
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `school-${stamp}.db`);
fs.copyFileSync(dbFile, backup);
console.log(`Backup database tersimpan di ${backup}`);

const wipe = db.transaction(() => {
  for (const table of [
    'lesson_attendances', 'lesson_sessions', 'attendances', 'grades', 'bills',
    'parent_students', 'teacher_assignments', 'schedules', 'prestasi', 'ekskul',
    'announcements', 'users', 'teachers', 'students'
  ]) {
    db.exec(`DELETE FROM ${table}`);
  }
});

const seed = db.transaction(() => {
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, role, roles, class, student_id, teacher_id, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const user of users) {
    insertUser.run(
      `user-${user.email.split('@')[0]}`,
      user.name,
      user.email,
      bcrypt.hashSync(user.password, 10),
      user.role,
      JSON.stringify(user.roles),
      user.class || null,
      user.student_id || null,
      user.teacher_id || null
    );
  }

  const insertStudent = db.prepare(
    "INSERT INTO students (id, name, niup, gender, class, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  students.forEach((row) => insertStudent.run(...row));

  const insertTeacher = db.prepare(
    'INSERT INTO teachers (id, name, niup, gender, subjects, classes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  teachers.forEach(([id, name, niup, gender, subjects, classes]) =>
    insertTeacher.run(id, name, niup, gender, JSON.stringify(subjects), JSON.stringify(classes))
  );

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, class, time, subject, teacher, teacher_id, room, day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  schedules.forEach(([id, className, time, subject, teacherId, room, day]) =>
    insertSchedule.run(id, className, time, subject, teacherName[teacherId], teacherAccount[teacherId], room, day)
  );

  const assignmentOwner = new Map(assignments.map(([teacherId, subject, className]) => [`${className}|${subject}`, teacherAccount[teacherId]]));
  const insertAssignment = db.prepare(
    'INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)'
  );
  assignments.forEach(([teacherId, subject, className]) =>
    insertAssignment.run(
      `assign-${teacherAccount[teacherId]}-${subject}-${className}`.replace(/\s+/g, '-').toLowerCase(),
      teacherAccount[teacherId],
      subject,
      className
    )
  );

  const findUser = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertParent = db.prepare('INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)');
  parentLinks.forEach(([email, studentId]) => insertParent.run(findUser.get(email).id, studentId));

  const insertGrade = db.prepare(`
    INSERT INTO grades (id, student_id, student_name, subject, score, date, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const gradeDate = ymd(daysAgo(1));
  let gradeNo = 0;
  for (const [studentId, studentName, , , className] of students) {
    for (const subject of subjectsByClass[className] || []) {
      insertGrade.run(
        `grade-test-${++gradeNo}`,
        studentId,
        studentName,
        subject,
        70 + (gradeNo % 26),
        gradeDate,
        assignmentOwner.get(`${className}|${subject}`)
      );
    }
  }

  const insertAttendance = db.prepare(`
    INSERT INTO attendances (id, student_id, student_name, date, status, note) VALUES (?, ?, ?, ?, ?, ?)
  `);
  let attendanceNo = 0;
  for (let d = 0; d < 3; d++) {
    const date = ymd(daysAgo(d));
    for (const [studentId, studentName, , , className, status] of students) {
      if (status !== 'siswa aktif') continue;
      const value = attendanceStatuses[attendanceNo % attendanceStatuses.length];
      insertAttendance.run(
        `att-test-${++attendanceNo}`,
        studentId,
        studentName,
        date,
        value,
        value === 'izin' ? 'Izin keperluan keluarga' : null
      );
    }
  }

  const insertBill = db.prepare(`
    INSERT INTO bills (id, student_id, student_name, amount, period, description, status, payment_proof, proof_filename, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
  `);
  const periods = [['2026-10', 'Oktober 2026'], ['2026-11', 'November 2026']];
  for (const [studentId, studentName] of students) {
    periods.forEach(([period, label], index) => {
      insertBill.run(
        `bill-test-${studentId}-${period}`,
        studentId,
        studentName,
        350000,
        period,
        `SPP Bulan ${label}`,
        index === 0 ? 'paid' : 'requested',
        new Date().toISOString(),
        new Date().toISOString()
      );
    });
  }

  const insertEkskul = db.prepare(
    'INSERT INTO ekskul (id, nama, pembina, jadwal, deskripsi, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertEkskul.run('ekskul-test-1', 'Robotika', 'Budi Santoso, S.Kom.', 'Rabu 15:00', 'Klub robotika sekolah', new Date().toISOString());

  const insertPrestasi = db.prepare(`
    INSERT INTO prestasi (id, student_id, student_name, class, kategori, juara, event, tahun, deskripsi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPrestasi.run('prestasi-test-1', 'std-001', 'Ahmad Fauzi', 'X RPL 1', 'Pemrograman', 'Juara 1', 'OSP Pemrograman Web', '2026', 'Juara pertama OSP');

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'help-contacts',
    JSON.stringify({ wa: ['+628123456789', ''], ig: ['smk_nuruljadid', ''] })
  );
});

wipe();
seed();

const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
console.log('Seed uji selesai:', {
  users: count('users'),
  students: count('students'),
  teachers: count('teachers'),
  schedules: count('schedules'),
  assignments: count('teacher_assignments'),
  parentLinks: count('parent_students'),
  grades: count('grades'),
  attendances: count('attendances'),
  bills: count('bills')
});
console.log('Login uji:');
console.log('  admin@example.com / Password123');
console.log('  stafftu@smk.id / Password123');
console.log('  guru@smk.id / guru123');
console.log('  rina@smk.id / guru123');
console.log('  agus@smk.id / guru123');
console.log('  siswa@smk.id / siswa123');
console.log('  ortu@smk.id / ortu123');
console.log('  ortu2@smk.id / ortu123');

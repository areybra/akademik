const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'school.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    student_id TEXT
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    niup TEXT UNIQUE NOT NULL,
    gender TEXT NOT NULL,
    class TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'siswa aktif'
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    niup TEXT UNIQUE NOT NULL,
    gender TEXT NOT NULL,
    subjects TEXT NOT NULL DEFAULT '[]',
    classes TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'info',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    score INTEGER NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'hadir',
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    class TEXT NOT NULL,
    time TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher TEXT NOT NULL,
    teacher_id TEXT,
    room TEXT NOT NULL,
    day TEXT NOT NULL DEFAULT 'Belum ditentukan'
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    period TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    payment_proof TEXT,
    proof_filename TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ekskul (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    pembina TEXT,
    jadwal TEXT,
    deskripsi TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS parent_students (
    parent_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (parent_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    UNIQUE (teacher_id, subject, class)
  );

  CREATE TABLE IF NOT EXISTS lesson_sessions (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    date TEXT NOT NULL,
    class TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (schedule_id, date)
  );

  CREATE TABLE IF NOT EXISTS lesson_attendances (
    session_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'hadir',
    note TEXT,
    PRIMARY KEY (session_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS prestasi (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    class TEXT,
    kategori TEXT,
    juara TEXT,
    event TEXT,
    tahun TEXT,
    deskripsi TEXT
  );
`);

// Kolom class dipakai untuk scoping wali kelas.
// Kolom roles (JSON array) dipakai untuk multi-role pada satu akun.
// Migrasi idempotent untuk DB lama.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('class')) {
  db.exec('ALTER TABLE users ADD COLUMN class TEXT');
}
if (!userColumns.includes('roles')) {
  db.exec('ALTER TABLE users ADD COLUMN roles TEXT');
}
if (!userColumns.includes('student_id')) {
  db.exec('ALTER TABLE users ADD COLUMN student_id TEXT');
}
if (!userColumns.includes('teacher_id')) {
  db.exec('ALTER TABLE users ADD COLUMN teacher_id TEXT');
}
if (!userColumns.includes('active')) {
  db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
}

// Kolom jadwal: hari dan tautan ke akun guru.
const scheduleColumns = db.prepare('PRAGMA table_info(schedules)').all().map((c) => c.name);
if (!scheduleColumns.includes('day')) {
  db.exec("ALTER TABLE schedules ADD COLUMN day TEXT NOT NULL DEFAULT 'Belum ditentukan'");
}
if (!scheduleColumns.includes('teacher_id')) {
  db.exec('ALTER TABLE schedules ADD COLUMN teacher_id TEXT');
}

// Sesi mengajar: draft bisa diedit, submitted terkunci setelah guru kirim.
const sessionColumns = db.prepare('PRAGMA table_info(lesson_sessions)').all().map((c) => c.name);
if (!sessionColumns.includes('status')) {
  db.exec("ALTER TABLE lesson_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'");
}
if (!sessionColumns.includes('submitted_at')) {
  db.exec('ALTER TABLE lesson_sessions ADD COLUMN submitted_at TEXT');
}
// Sesi yang dibuka paksa oleh admin tidak boleh dikunci ulang oleh auto-lock.
if (!sessionColumns.includes('unlocked_at')) {
  db.exec('ALTER TABLE lesson_sessions ADD COLUMN unlocked_at TEXT');
}

const gradeColumns = db.prepare('PRAGMA table_info(grades)').all().map((c) => c.name);
if (!gradeColumns.includes('teacher_id')) {
  db.exec('ALTER TABLE grades ADD COLUMN teacher_id TEXT');
}

// Indeks unik baru menolak tautan ganda. Bersihkan dulu baris lama yang
// bertabrakan sebelum backfill, kalau tidak server gagal start saat DB sudah ada.
db.exec(`
  UPDATE users SET teacher_id = NULL
  WHERE teacher_id IS NOT NULL
    AND rowid NOT IN (
      SELECT MIN(rowid) FROM users WHERE teacher_id IS NOT NULL GROUP BY teacher_id
    );
  UPDATE users SET student_id = NULL
  WHERE student_id IS NOT NULL
    AND rowid NOT IN (
      SELECT MIN(rowid) FROM users WHERE student_id IS NOT NULL GROUP BY student_id
    );
`);

// Backfill: akun siswa ditautkan ke baris students berdasarkan nama yang sama.
db.exec(`
  UPDATE users
  SET student_id = (
    SELECT s.id FROM students s
    WHERE s.name = users.name
      AND NOT EXISTS (
        SELECT 1 FROM users u2 WHERE u2.student_id = s.id AND u2.id <> users.id
      )
    ORDER BY CASE WHEN s.status = 'siswa aktif' THEN 0 ELSE 1 END
    LIMIT 1
  )
  WHERE student_id IS NULL
    AND role = 'siswa'
    AND EXISTS (SELECT 1 FROM students s WHERE s.name = users.name)
`);

// Backfill: jadwal lama yang menyimpan nama guru ditautkan ke akun guru.
db.exec(`
  UPDATE schedules
  SET teacher_id = (
    SELECT u.id FROM users u
    WHERE u.name = schedules.teacher
      AND (u.role IN ('guru', 'guru_mapel') OR u.roles LIKE '%guru%')
    LIMIT 1
  )
  WHERE teacher_id IS NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.name = schedules.teacher
        AND (u.role IN ('guru', 'guru_mapel') OR u.roles LIKE '%guru%')
    )
`);

db.exec(`
  UPDATE users
  SET teacher_id = (
    SELECT t.id FROM teachers t
    WHERE TRIM(t.name) = TRIM(users.name)
      AND (users.role IN ('guru', 'guru_mapel') OR users.roles LIKE '%guru%')
      AND (SELECT COUNT(*) FROM teachers t2 WHERE TRIM(t2.name) = TRIM(users.name)) = 1
      AND NOT EXISTS (
        SELECT 1 FROM users u2 WHERE u2.teacher_id = t.id AND u2.id <> users.id
      )
  )
  WHERE teacher_id IS NULL
    AND (users.role IN ('guru', 'guru_mapel') OR users.roles LIKE '%guru%')
    AND EXISTS (
      SELECT 1 FROM teachers t
      WHERE TRIM(t.name) = TRIM(users.name)
        AND (SELECT COUNT(*) FROM teachers t2 WHERE TRIM(t2.name) = TRIM(users.name)) = 1
    )
`);

const duplicateAssignments = db.prepare(`
  SELECT subject, class FROM teacher_assignments
  GROUP BY subject, class HAVING COUNT(*) > 1
`).all();
let reconciledAssignments = 0;
const dedupAssignments = db.transaction(() => {
  const scheduleCount = db.prepare(`
    SELECT COUNT(*) AS n FROM schedules WHERE class = ? AND subject = ? AND teacher_id = ?
  `);
  const moveSchedules = db.prepare(`
    UPDATE schedules SET teacher_id = ? WHERE class = ? AND subject = ? AND teacher_id = ?
  `);
  const moveGrades = db.prepare(`
    UPDATE grades SET teacher_id = ? WHERE teacher_id = ? AND subject = ?
      AND student_id IN (SELECT id FROM students WHERE class = ?)
  `);
  const removeAssignment = db.prepare('DELETE FROM teacher_assignments WHERE rowid = ?');

  for (const group of duplicateAssignments) {
    const rows = db.prepare(`
      SELECT rowid AS rid, teacher_id FROM teacher_assignments
      WHERE subject = ? AND class = ? ORDER BY rowid
    `).all(group.subject, group.class);
    const countFor = (teacherId) => scheduleCount.get(group.class, group.subject, teacherId).n;
    let keep = rows[0];
    for (const row of rows.slice(1)) {
      if (countFor(row.teacher_id) > countFor(keep.teacher_id)) keep = row;
    }
    for (const row of rows) {
      if (row.rid === keep.rid) continue;
      moveSchedules.run(keep.teacher_id, group.class, group.subject, row.teacher_id);
      moveGrades.run(keep.teacher_id, row.teacher_id, group.subject, group.class);
      removeAssignment.run(row.rid);
      reconciledAssignments++;
    }
  }
});
dedupAssignments();
if (reconciledAssignments > 0) {
  console.log(`Migrasi: ${reconciledAssignments} penugasan ganda digabung; jadwal dan nilai ikut dialihkan.`);
}

// Migrasi: jadwal mengikuti pemilik penugasan; profil guru dilengkapi mapel dari penugasan lama.
const assignmentOwners = db.prepare(`
  SELECT ta.teacher_id, ta.subject, ta.class, u.name AS teacher_name, u.teacher_id AS profile_id
  FROM teacher_assignments ta
  JOIN users u ON u.id = ta.teacher_id
`).all();
let alignedSchedules = 0;
let completedProfiles = 0;
const alignTransactions = db.transaction(() => {
  const updateSchedule = db.prepare(
    'UPDATE schedules SET teacher_id = ?, teacher = ? WHERE class = ? AND subject = ?'
  );
  const readProfile = db.prepare('SELECT subjects FROM teachers WHERE id = ?');
  const saveProfile = db.prepare('UPDATE teachers SET subjects = ? WHERE id = ?');

  for (const assignment of assignmentOwners) {
    alignedSchedules += updateSchedule.run(
      assignment.teacher_id,
      assignment.teacher_name,
      assignment.class,
      assignment.subject
    ).changes;

    if (!assignment.profile_id) continue;
    const row = readProfile.get(assignment.profile_id);
    if (!row) continue;
    let subjects;
    try {
      subjects = JSON.parse(row.subjects || '[]');
    } catch {
      subjects = [];
    }
    if (!Array.isArray(subjects)) subjects = [];
    if (subjects.some((item) => String(item).trim().toLowerCase() === assignment.subject.toLowerCase())) {
      continue;
    }
    subjects.push(assignment.subject);
    saveProfile.run(JSON.stringify(subjects), assignment.profile_id);
    completedProfiles++;
  }
});
alignTransactions();
if (alignedSchedules > 0 || completedProfiles > 0) {
  console.log(
    `Migrasi: ${alignedSchedules} jadwal diselaraskan ke guru penugasan; ${completedProfiles} mapel dilengkapi di Data Guru.`
  );
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id) WHERE teacher_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_subject_class ON teacher_assignments(subject, class);
  CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students (student_id);
  CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day ON schedules (teacher_id, day);
  CREATE INDEX IF NOT EXISTS idx_grades_teacher ON grades (teacher_id);
  CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances (date);
  CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances (student_id);
  CREATE INDEX IF NOT EXISTS idx_grades_student ON grades (student_id);
  CREATE INDEX IF NOT EXISTS idx_lesson_sessions_date ON lesson_sessions (date);
  CREATE INDEX IF NOT EXISTS idx_lesson_sessions_teacher ON lesson_sessions (teacher_id);
`);

// Migrasi kolom baru untuk tabel students (nisn, foto, alamat)
const studentColumns = db.prepare('PRAGMA table_info(students)').all().map((c) => c.name);
if (!studentColumns.includes('nisn')) {
  db.exec('ALTER TABLE students ADD COLUMN nisn TEXT');
}
if (!studentColumns.includes('tgl_lahir')) {
  db.exec('ALTER TABLE students ADD COLUMN tgl_lahir TEXT');
}
if (!studentColumns.includes('tmp_lahir')) {
  db.exec('ALTER TABLE students ADD COLUMN tmp_lahir TEXT');
}
if (!studentColumns.includes('foto_siswa')) {
  db.exec('ALTER TABLE students ADD COLUMN foto_siswa TEXT');
}
if (!studentColumns.includes('provinsi')) {
  db.exec('ALTER TABLE students ADD COLUMN provinsi TEXT');
}
if (!studentColumns.includes('kabupaten')) {
  db.exec('ALTER TABLE students ADD COLUMN kabupaten TEXT');
}
if (!studentColumns.includes('kecamatan')) {
  db.exec('ALTER TABLE students ADD COLUMN kecamatan TEXT');
}
if (!studentColumns.includes('negara')) {
  db.exec('ALTER TABLE students ADD COLUMN negara TEXT DEFAULT \"Indonesia\"');
}

// Migrasi kolom baru untuk tabel teachers (nip, pangkat, foto, alamat)
const teacherColumns = db.prepare('PRAGMA table_info(teachers)').all().map((c) => c.name);
if (!teacherColumns.includes('nip')) {
  db.exec('ALTER TABLE teachers ADD COLUMN nip TEXT');
}
if (!teacherColumns.includes('pangkat')) {
  db.exec('ALTER TABLE teachers ADD COLUMN pangkat TEXT');
}
if (!teacherColumns.includes('pendidikan')) {
  db.exec('ALTER TABLE teachers ADD COLUMN pendidikan TEXT');
}
if (!teacherColumns.includes('foto_guru')) {
  db.exec('ALTER TABLE teachers ADD COLUMN foto_guru TEXT');
}
if (!teacherColumns.includes('provinsi')) {
  db.exec('ALTER TABLE teachers ADD COLUMN provinsi TEXT DEFAULT \"Indonesia\"');
}
if (!teacherColumns.includes('kabupaten')) {
  db.exec('ALTER TABLE teachers ADD COLUMN kabupaten TEXT DEFAULT \"Indonesia\"');
}
if (!teacherColumns.includes('kecamatan')) {
  db.exec('ALTER TABLE teachers ADD COLUMN kecamatan TEXT DEFAULT \"Indonesia\"');
}
if (!teacherColumns.includes('negara')) {
  db.exec('ALTER TABLE teachers ADD COLUMN negara TEXT DEFAULT \"Indonesia\"');
}

module.exports = db;

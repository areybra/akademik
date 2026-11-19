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

// Backfill: akun siswa ditautkan ke baris students berdasarkan nama yang sama.
db.exec(`
  UPDATE users
  SET student_id = (
    SELECT s.id FROM students s
    WHERE s.name = users.name
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

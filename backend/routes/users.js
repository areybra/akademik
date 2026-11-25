const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { canTeachSubject } = require('../lib/capability');

const ROLE_VALUES = [
  'admin',
  'kepala_sekolah',
  'waka',
  'guru',
  'guru_mapel',
  'wali_kelas',
  'kepala_tu',
  'staff_tu',
  'siswa',
  'orang_tua'
];
const ROLE_SET = new Set(ROLE_VALUES);
const TEACHER_ROLES = ['guru', 'guru_mapel'];

const ADMIN_ONLY = authorizeRoles('admin');

class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const USER_SELECT = `SELECT u.id, u.name, u.email, u.role, u.roles, u.class, u.student_id, u.teacher_id, u.active,
       s.name AS student_name, t.name AS teacher_name, t.niup AS teacher_niup
  FROM users u
  LEFT JOIN students s ON s.id = u.student_id
  LEFT JOIN teachers t ON t.id = u.teacher_id`;

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const rolesOf = (row) => {
  const arr = parseJsonArray(row.roles);
  return arr.length > 0 ? arr : [row.role];
};

const normalizeName = (value) => {
  const name = String(value ?? '').trim();
  if (name.length < 2 || name.length > 100) {
    throw new ValidationError('Nama wajib diisi 2–100 karakter');
  }
  return name;
};

const normalizeEmail = (value) => {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Format email tidak valid');
  }
  return email;
};

const normalizePrimaryRole = (value) => {
  const role = String(value ?? '').trim();
  if (!ROLE_SET.has(role)) throw new ValidationError('Role tidak dikenal');
  return role;
};

const normalizeExtraRoles = (raw) => {
  if (raw === undefined || raw === null) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw || '[]');
    } catch {
      throw new ValidationError('Format roles tidak valid');
    }
  }
  if (!Array.isArray(arr)) throw new ValidationError('Roles harus berupa array');
  return arr.map((item) => String(item ?? '').trim()).filter(Boolean);
};

// role utama selalu ada di roles[0]; semua nilai divalidasi whitelist dan unik.
const buildRoles = (primary, extras) => {
  const result = [primary];
  for (const item of normalizeExtraRoles(extras)) {
    if (!ROLE_SET.has(item)) throw new ValidationError(`Role tidak dikenal: ${item}`);
    if (!result.includes(item)) result.push(item);
  }
  return result;
};

const assertStudentExists = (studentId) => {
  if (!db.prepare('SELECT 1 FROM students WHERE id = ?').get(studentId)) {
    throw new ValidationError('Siswa tidak ditemukan');
  }
};

const normalizeTeacherId = (value, roles, name) => {
  if (!roles.some((item) => TEACHER_ROLES.includes(item))) return null;
  const teacherId = String(value ?? '').trim();
  if (teacherId) {
    if (!db.prepare('SELECT 1 FROM teachers WHERE id = ?').get(teacherId)) {
      throw new ValidationError('Data guru tidak ditemukan');
    }
    return teacherId;
  }
  const matches = db.prepare('SELECT id FROM teachers WHERE TRIM(name) = TRIM(?)').all(name);
  return matches.length === 1 ? matches[0].id : null;
};

const normalizeStudentIds = (raw) => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('parentStudentIds harus berupa array');
  const ids = [...new Set(raw.map((item) => String(item ?? '').trim()).filter(Boolean))];
  for (const id of ids) assertStudentExists(id);
  return ids;
};

const normalizeAssignments = (raw) => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('assignments harus berupa array');
  const result = [];
  const seen = new Set();
  for (const item of raw) {
    const subject = String(item?.subject ?? '').trim();
    const className = String(item?.class ?? '').trim();
    if (!subject || !className) {
      throw new ValidationError('Setiap penugasan wajib punya mapel dan kelas');
    }
    const key = `${subject}\u0000${className}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ subject, class: className });
  }
  return result;
};

const assignmentId = (teacherId, subject, className) =>
  `assign-${teacherId}-${subject}-${className}`.replace(/\s+/g, '-').toLowerCase();

const assertEmailAvailable = (email, excludeId) => {
  const row = excludeId
    ? db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id <> ?').get(email, excludeId)
    : db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (row) throw new ValidationError('Email sudah terdaftar', 409);
};

const listAssignments = (teacherId) =>
  db.prepare('SELECT id, subject, class FROM teacher_assignments WHERE teacher_id = ? ORDER BY class, subject').all(teacherId);

const detailOf = (id) => {
  const row = db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roles: rolesOf(row),
    class: row.class,
    student_id: row.student_id,
    student_name: row.student_name || null,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name || null,
    teacher_niup: row.teacher_niup || null,
    active: row.active,
    parentStudentIds: db
      .prepare('SELECT student_id FROM parent_students WHERE parent_id = ? ORDER BY student_id')
      .all(id)
      .map((item) => item.student_id),
    assignments: listAssignments(id)
  };
};

const insertAssignments = (teacherId, assignments) => {
  const stmt = db.prepare('INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)');
  const seen = new Set();
  for (const item of assignments) {
    if (!canTeachSubject(teacherId, item.subject)) {
      throw new ValidationError(
        `Mapel ${item.subject} tidak ada di daftar mapel yang mampu diajar akun ini. Tambahkan dulu di Data Guru.`
      );
    }
    const id = assignmentId(teacherId, item.subject, item.class);
    if (seen.has(id)) continue;
    seen.add(id);
    stmt.run(id, teacherId, item.subject, item.class);
  }
};

const insertParents = (parentId, studentIds) => {
  const stmt = db.prepare('INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)');
  for (const studentId of studentIds) stmt.run(parentId, studentId);
};

const route = (handler) => (req, res) => {
  try {
    handler(req, res);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (/UNIQUE constraint failed: users\.email/i.test(error.message || '')) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }
    if (/UNIQUE constraint failed/i.test(error.message || '')) {
      return res.status(409).json({ message: 'Data relasi duplikat' });
    }
    console.error('users route error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// GET /api/users — daftar akun + ringkasan relasi (admin)
router.get(
  '/',
  authenticateToken,
  ADMIN_ONLY,
  route((_req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.roles, u.class, u.student_id, u.teacher_id, u.active,
                s.name AS student_name, t.name AS teacher_name, t.niup AS teacher_niup,
                (SELECT GROUP_CONCAT(st.name, ', ')
                   FROM parent_students ps JOIN students st ON st.id = ps.student_id
                  WHERE ps.parent_id = u.id) AS children,
                (SELECT GROUP_CONCAT(ta.subject || ' · ' || ta.class, ', ')
                   FROM teacher_assignments ta
                  WHERE ta.teacher_id = u.id) AS assignments
           FROM users u
           LEFT JOIN students s ON s.id = u.student_id
           LEFT JOIN teachers t ON t.id = u.teacher_id
          ORDER BY u.name`
      )
      .all();

    res.json(
      rows.map((row) => ({
        ...row,
        roles: rolesOf(row),
        active: row.active
      }))
    );
  })
);

// GET /api/users/me — profil akun sendiri (semua pengguna terautentikasi)
router.get(
  '/me',
  authenticateToken,
  route((req, res) => {
    const user = db
      .prepare('SELECT id, name, email, role, class, roles, student_id, teacher_id, avatar, active FROM users WHERE id = ?')
      .get(req.user.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ ...user, roles: rolesOf(user) });
  })
);

// GET /api/users/:id — data akun + relasi mentah untuk form edit (admin)
router.get(
  '/:id',
  authenticateToken,
  ADMIN_ONLY,
  route((req, res) => {
    const detail = detailOf(req.params.id);
    if (!detail) return res.status(404).json({ message: 'Akun tidak ditemukan' });
    res.json(detail);
  })
);

// POST /api/users — buat akun + relasi dalam satu transaksi (admin)
router.post(
  '/',
  authenticateToken,
  ADMIN_ONLY,
  route((req, res) => {
    const body = req.body || {};
    const name = normalizeName(body.name);
    const email = normalizeEmail(body.email);
    if (body.password === undefined || body.password === null || String(body.password).length === 0) {
      throw new ValidationError('Password wajib diisi');
    }
    const password = String(body.password);
    if (password.length < 6) throw new ValidationError('Password minimal 6 karakter');
    const role = normalizePrimaryRole(body.role);
    const roles = buildRoles(role, body.roles);
    const className = body.class === undefined || body.class === null ? null : String(body.class).trim() || null;
    const teacherId = normalizeTeacherId(body.teacherId, roles, name);

    let studentId = null;
    if (roles.includes('siswa')) {
      studentId = String(body.studentId ?? '').trim();
      if (!studentId) throw new ValidationError('Siswa wajib dipilih untuk akun siswa');
      assertStudentExists(studentId);
    }
    if (roles.includes('wali_kelas') && !className) {
      throw new ValidationError('Kelas wajib diisi untuk akun wali kelas');
    }

    const parentStudentIds = normalizeStudentIds(body.parentStudentIds);
    if (roles.includes('orang_tua') && parentStudentIds.length === 0) {
      throw new ValidationError('Pilih minimal satu anak untuk akun orang tua');
    }

    const assignments = normalizeAssignments(body.assignments);
    if (roles.some((item) => TEACHER_ROLES.includes(item)) && assignments.length === 0) {
      throw new ValidationError('Isi minimal satu mapel dan kelas untuk akun guru');
    }

    assertEmailAvailable(email);

    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const hashed = bcrypt.hashSync(password, 10);

    const create = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, name, email, password, role, class, roles, student_id, teacher_id, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(id, name, email, hashed, role, className, JSON.stringify(roles), studentId, teacherId);

      if (roles.includes('orang_tua')) insertParents(id, parentStudentIds);
      if (roles.some((item) => TEACHER_ROLES.includes(item))) insertAssignments(id, assignments);
    });
    create();

    res.status(201).json({ ...detailOf(id), message: 'Akun berhasil dibuat' });
  })
);

// PUT /api/users/:id — update parsial, kunci yang tidak dikirim tidak diubah (admin)
router.put(
  '/:id',
  authenticateToken,
  ADMIN_ONLY,
  route((req, res) => {
    const body = req.body || {};
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Akun tidak ditemukan' });

    const name = body.name !== undefined ? normalizeName(body.name) : row.name;
    const email = body.email !== undefined ? normalizeEmail(body.email) : row.email;
    if (email !== row.email) assertEmailAvailable(email, row.id);

    let password = row.password;
    if (body.password !== undefined && body.password !== null && String(body.password).length > 0) {
      const raw = String(body.password);
      if (raw.length < 6) throw new ValidationError('Password minimal 6 karakter');
      password = bcrypt.hashSync(raw, 10);
    }

    // Roles: bila role atau roles dikirim, validasi ulang dan normalkan.
    let role = row.role;
    let roles = rolesOf(row);
    if (body.role !== undefined || body.roles !== undefined) {
      role = body.role !== undefined ? normalizePrimaryRole(body.role) : row.role;
      // Ganti role utama tidak boleh menyisakan role lama; bila `roles` tidak dikirim,
      // role tambahan lama dipertahankan kecuali role utama sebelumnya.
      const extras = body.roles !== undefined ? body.roles : roles.filter((item) => item !== row.role);
      roles = buildRoles(role, extras);
    }

    let className = row.class;
    if (body.class !== undefined) {
      className = body.class === null ? null : String(body.class).trim() || null;
    }
    if (roles.includes('wali_kelas') && !className) {
      throw new ValidationError('Kelas wajib diisi untuk akun wali kelas');
    }

    let studentId = row.student_id;
    if (roles.includes('siswa')) {
      if (body.studentId !== undefined) {
        studentId = String(body.studentId ?? '').trim() || null;
      }
      if (!studentId) throw new ValidationError('Siswa wajib dipilih untuk akun siswa');
      assertStudentExists(studentId);
    } else {
      // Invariant: student_id hanya terisi untuk akun siswa.
      studentId = null;
    }

    const teacherId = normalizeTeacherId(
      body.teacherId !== undefined ? body.teacherId : row.teacher_id,
      roles,
      name
    );

    let active = row.active;
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') throw new ValidationError('active harus boolean');
      if (body.active === false && row.id === req.user.id) {
        throw new ValidationError('Tidak bisa menonaktifkan akun sendiri');
      }
      active = body.active ? 1 : 0;
    }

    const nextParentIds = body.parentStudentIds !== undefined ? normalizeStudentIds(body.parentStudentIds) : null;
    const nextAssignments = body.assignments !== undefined ? normalizeAssignments(body.assignments) : null;

    if (nextAssignments === null && teacherId && teacherId !== row.teacher_id) {
      const profile = db.prepare('SELECT subjects FROM teachers WHERE id = ?').get(teacherId);
      const capable = JSON.parse(profile?.subjects || '[]').map((item) => String(item).trim().toLowerCase());
      const incompatible = listAssignments(row.id).filter(
        (item) => !capable.includes(item.subject.trim().toLowerCase())
      );
      if (incompatible.length > 0) {
        const list = incompatible.map((item) => `${item.subject} di ${item.class}`).join(', ');
        throw new ValidationError(
          `Data guru baru belum mencantumkan mapel penugasan berikut: ${list}. Lengkapi Data Guru atau sesuaikan penugasan.`
        );
      }
    }

    const update = db.transaction(() => {
      db.prepare(
        `UPDATE users
            SET name = ?, email = ?, password = ?, role = ?, class = ?, roles = ?,
                student_id = ?, teacher_id = ?, active = ?
          WHERE id = ?`
      ).run(name, email, password, role, className, JSON.stringify(roles), studentId, teacherId, active, row.id);

      if (nextParentIds !== null) {
        db.prepare('DELETE FROM parent_students WHERE parent_id = ?').run(row.id);
        if (roles.includes('orang_tua')) insertParents(row.id, nextParentIds);
      } else if (!roles.includes('orang_tua')) {
        // Invariant 3.3: relasi anak hanya untuk akun orang_tua.
        db.prepare('DELETE FROM parent_students WHERE parent_id = ?').run(row.id);
      }
      if (nextAssignments !== null) {
        db.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(row.id);
        if (roles.some((item) => TEACHER_ROLES.includes(item))) insertAssignments(row.id, nextAssignments);
      } else if (!roles.some((item) => TEACHER_ROLES.includes(item))) {
        db.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(row.id);
      }
    });
    update();

    res.json({ ...detailOf(row.id), message: 'Akun diperbarui' });
  })
);

// DELETE /api/users/:id — hapus akun + bersihkan relasi (admin)
router.delete(
  '/:id',
  authenticateToken,
  ADMIN_ONLY,
  route((req, res) => {
    if (req.params.id === req.user.id) {
      throw new ValidationError('Tidak bisa menghapus akun sendiri');
    }
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Akun tidak ditemukan' });

    const remove = db.transaction(() => {
      db.prepare('DELETE FROM parent_students WHERE parent_id = ?').run(row.id);
      db.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(row.id);
      db.prepare('UPDATE schedules SET teacher_id = NULL WHERE teacher_id = ?').run(row.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(row.id);
    });
    remove();

    res.json({ message: 'Akun dihapus', id: row.id });
  })
);

module.exports = router;

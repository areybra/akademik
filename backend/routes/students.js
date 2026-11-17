const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const upload = require('../middleware/upload');
const { studentScope } = require('../scope');

// GET /api/students — ambil semua siswa
router.get('/', authenticateToken, (req, res) => {
  const { search, class: classFilter } = req.query;
  let query = 'SELECT * FROM students';
  const scope = studentScope(req.user);
  const params = [...scope.params];
  const conditions = [scope.sql];

  if (search) {
    conditions.push("(name LIKE ? OR niup LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (classFilter) {
    conditions.push("class = ?");
    params.push(classFilter);
  }

  query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY name ASC';

  const students = db.prepare(query).all(...params);
  res.json(students);
});

// GET /api/students/:id
router.get('/:id', authenticateToken, (req, res) => {
  const scope = studentScope(req.user);
  const student = db
    .prepare(`SELECT * FROM students WHERE id = ? AND (${scope.sql})`)
    .get(req.params.id, ...scope.params);
  if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
  res.json(student);
});

// POST /api/students — tambah siswa
router.post('/', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const { name, niup, nisn, gender, tgl_lahir, tmp_lahir, class: studentClass, provinsi, kabupaten, kecamatan, negara, foto_siswa, status } = req.body;

  if (!name || !niup || !gender || !studentClass) {
    return res.status(400).json({ message: 'Data wajib (name, niup, gender, class) tidak lengkap' });
  }

  const id = `std-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    db.prepare(`
      INSERT INTO students (id, name, niup, nisn, gender, tgl_lahir, tmp_lahir, class, provinsi, kabupaten, kecamatan, negara, foto_siswa, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, niup, nisn, gender, tgl_lahir, tmp_lahir, studentClass, provinsi || '', kabupaten || '', kecamatan || '', negara || 'Indonesia', foto_siswa || '', status || 'siswa aktif');

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.status(201).json(newStudent);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ message: 'NIUP sudah terdaftar' });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/students/:id — update siswa
router.put('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const { name, niup, nisn, gender, tgl_lahir, tmp_lahir, class: studentClass, provinsi, kabupaten, kecamatan, negara, foto_siswa, status } = req.body;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: 'Siswa tidak ditemukan' });

  try {
    db.prepare(`
      UPDATE students SET name = ?, niup = ?, nisn = ?, gender = ?, tgl_lahir = ?, tmp_lahir = ?, class = ?, provinsi = ?, kabupaten = ?, kecamatan = ?, negara = ?, foto_siswa = ?, status = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      niup ?? existing.niup,
      nisn ?? existing.nisn,
      gender ?? existing.gender,
      tgl_lahir ?? existing.tgl_lahir,
      tmp_lahir ?? existing.tmp_lahir,
      studentClass ?? existing.class,
      provinsi ?? existing.provinsi,
      kabupaten ?? existing.kabupaten,
      kecamatan ?? existing.kecamatan,
      negara ?? existing.negara,
      foto_siswa ?? existing.foto_siswa,
      status ?? existing.status,
      id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ message: 'NIUP sudah terdaftar' });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/students/:id — hapus siswa
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
  res.json({ message: 'Siswa berhasil dihapus' });
});

// POST /api/students/bulk — import masal
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Data siswa tidak valid' });
  }

  const insertStudent = db.prepare(`
    INSERT OR IGNORE INTO students (id, name, niup, nisn, gender, tgl_lahir, tmp_lahir, class, provinsi, kabupaten, kecamatan, negara, foto_siswa, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const bulkInsert = db.transaction((students) => {
    const results = [];
    for (const s of students) {
      const id = `std-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      insertStudent.run(
        id,
        s.name,
        s.niup,
        s.nisn || '',
        s.gender,
        s.tgl_lahir || '',
        s.tmp_lahir || '',
        s.class,
        s.provinsi || 'Indonesia',
        s.kabupaten || '',
        s.kecamatan || '',
        s.negara || 'Indonesia',
        s.foto_siswa || '',
        s.status || 'siswa aktif'
      );
      results.push({ ...s, id });
    }
    return results;
  });

  try {
    const results = bulkInsert(students);
    res.status(201).json({ message: `${results.length} siswa berhasil diimpor`, students: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/students/upload-foto — upload foto siswa
router.post('/upload-foto', authenticateToken, authorizeRoles('admin', 'kepala_tu', 'staff_tu'), upload.single('foto'), (req, res) => {
  // Multer middleware sudah diproses di server.js, ambil filename dari req.file
  if (!req.file) {
    return res.status(400).json({ message: 'File tidak diunggah' });
  }
  const fotoPath = `/uploads/${req.file.filename}`; // Path relativ untuk frontend
  res.json({ filename: req.file.filename, path: fotoPath });
});

module.exports = router;

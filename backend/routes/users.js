const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');

const READ_ROLES = ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'];

// GET /api/users — daftar semua akun (hanya untuk admin/pimpinan)
router.get('/', authenticateToken, authorizeRoles(...READ_ROLES), (_req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, class, roles, student_id FROM users ORDER BY name').all();
  res.json(rows);
});

// GET /api/users/me — profil akun sendiri (digunakan oleh frontend)
router.get('/me', authenticateToken, (_req, res) => {
  const user = db.prepare('SELECT id, name, email, role, class, roles, student_id, avatar FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
  res.json(user);
});

// GET /api/users/:id — ambil satu akun
router.get('/:id', authenticateToken, authorizeRoles(...READ_ROLES), (req, res) => {
  const row = db.prepare('SELECT id, name, email, role, class, roles, student_id, avatar FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Akun tidak ditemukan' });
  res.json(row);
});

// POST /api/users — buat akun baru
router.post('/', authenticateToken, authorizeRoles(...READ_ROLES), (req, res) => {
  const { name, email, password, role, class: className, roles: rolesStr } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Nama, email, password, dan role wajib diisi' });
  }

  // Cek email sudah ada
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ message: 'Email sudah terdaftar' });

  const hashed = require('bcryptjs').hashSync(password, 10);
  const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const rolesArray = typeof rolesStr === 'string' ? JSON.parse(rolesStr || '[]') : (rolesStr || [role]);

  const stmt = db.prepare(
    'INSERT INTO users (id, name, email, password, role, class, roles, student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, email, hashed, role, className || null, JSON.stringify(rolesArray), null);
  res.status(201).json({ id, name, email, role, message: 'Akun berhasil dibuat' });
});

// PUT /api/users/:id — update akun
router.put('/:id', authenticateToken, authorizeRoles(...READ_ROLES), (req, res) => {
  const { name, email, password, role, class: className, roles: rolesStr } = req.body;
  const updateData = { name, email, role, class: className || null };

  if (password) {
    updateData.password = require('bcryptjs').hashSync(password, 10);
  }

  if (rolesStr !== undefined) {
    updateData.roles = typeof rolesStr === 'string' ? rolesStr : JSON.stringify(rolesStr);
  }

  const result = db.prepare(
    'UPDATE users SET name = ?, email = ?, password = ?, role = ?, class = ?, roles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(updateData.name, updateData.email, updateData.password, updateData.role, updateData.class, updateData.roles, req.params.id);

  if (result.changes === 0) return res.status(404).json({ message: 'Akun tidak ditemukan' });
  res.json({ message: 'Akun diperbarui', id: req.params.id });
});

// DELETE /api/users/:id — hapus akun
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Akun tidak ditemukan' });
  res.json({ message: 'Akun dihapus', id: req.params.id });
});

module.exports = router;
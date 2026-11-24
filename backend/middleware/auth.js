const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required for secure authentication.');
  process.exit(1);
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Akses ditolak: Token tidak valid' });
    }

    // Akun nonaktif/dihapus langsung terputus walau JWT masih berlaku.
    const row = db.prepare('SELECT active FROM users WHERE id = ?').get(user.id);
    if (!row || row.active === 0) {
      return res.status(401).json({ message: 'Akun tidak aktif. Silakan login kembali.' });
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;

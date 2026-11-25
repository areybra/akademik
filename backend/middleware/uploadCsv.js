const multer = require('multer');

const CSV_MIME = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/octet-stream'
]);

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    if (name.endsWith('.csv') || CSV_MIME.has(String(file.mimetype || '').toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Hanya file CSV yang diizinkan'));
  }
});

module.exports = uploadCsv;

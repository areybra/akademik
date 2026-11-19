require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const upload = require('./middleware/upload');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = corsOrigin.split(',').map((s) => s.trim());
    // Izinkan origin lokal apa pun (port dev bisa bergeser, mis. 5173 -> 5174)
    if (allowed.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '8mb' }));
app.use(express.static(__dirname)); // Serve static files (HTML, CSV templates)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded photos

// Upload foto (dipakai form siswa/guru)
app.post('/api/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File tidak diunggah' });
  }
  res.json({ filename: req.file.filename, path: `/uploads/${req.file.filename}` });
});

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const scheduleRoutes = require('./routes/schedules');
const gradeRoutes = require('./routes/grades');
const attendanceRoutes = require('./routes/attendances');
const billingRoutes = require('./routes/billings');
const settingsRoutes = require('./routes/settings');
const ekskulRoutes = require('./routes/ekskul');
const prestasiRoutes = require('./routes/prestasi');
const relationRoutes = require('./routes/relations');
const dashboardRoutes = require('./routes/dashboard');
const portalRoutes = require('./routes/portal');
const teachingRoutes = require('./routes/teaching');
const userRoutes = require('./routes/users');  // <-- baru

// Mounting Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ekskul', ekskulRoutes);
app.use('/api/prestasi', prestasiRoutes);
app.use('/api/relations', relationRoutes);
app.use('/api/users', userRoutes);     // <-- baru, setelah relations
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/teaching', teachingRoutes);

// Endpoint dasar (Home)
app.get('/', (req, res) => {
  res.send('Halo! Backend API Sistem Akademik SMK sudah berjalan!');
});

// Penanganan error upload (mis. file > 2MB / bukan gambar)
app.use((err, req, res, next) => {
  if (err && (err.code === 'LIMIT_FILE_SIZE' || /gambar|file too large/i.test(err.message || ''))) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 2MB' : err.message });
  }
  return next(err);
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server aktif di http://localhost:${port}`);
});
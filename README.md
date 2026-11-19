# Sistem Akademik SMK

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Vue-3-4FC08D?style=for-the-badge&logo=vue.js" alt="Vue 3"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS"/>
</p>

<p align="center">
  <b>Aplikasi manajemen akademik sekolah</b> dengan backend Express.js + SQLite dan frontend Vue 3 + Tailwind CSS.<br/>
  Setiap peran sekolah hanya melihat dan mengubah data yang berwenang, dengan menu dan dashboard sendiri.
</p>

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Peran yang Didukung](#-peran-yang-didukung)
- [Akun Login Demo](#-akun-login-demo)
- [Hak Akses](#-hak-akses)
- [Menu per Peran](#-menu-per-peran)
- [Dashboard per Peran](#-dashboard-per-peran)
- [Alur Mengajar](#-alur-mengajar)
- [Ekspor CSV](#-ekspor-csv)
- [Relasi Data](#-relasi-data)
- [Struktur Proyek](#-struktur-proyek)
- [Cara Menjalankan](#-cara-menjalankan)
- [Pengujian](#-pengujian)
- [Catatan](#-catatan)

---

## 🚀 Fitur Utama

| Modul | Keterangan |
|-------|------------|
| **Dashboard** | Tampilan berbeda per peran: admin, supervisor, TU, guru, siswa/orang tua |
| **Manajemen Data** | Siswa, kelas, jurusan, guru, mata pelajaran, jadwal, akun pengguna |
| **Mengajar** | Guru membuka sesi per jam, mengisi absensi + nilai, lalu mengirim (terkunci) |
| **Nilai & Absensi** | Input per mata pelajaran, presensi harian, rekap; halaman khusus pengelola + supervisor |
| **Ekskul & Prestasi** | Kegiatan ekstrakurikuler dan prestasi siswa |
| **Tagihan & Pembayaran** | SPP, status lunas/belum, unggah bukti bayar oleh orang tua |
| **Relasi** | Orang tua ↔ anak, guru ↔ mapel + kelas |
| **Laporan** | Ekspor CSV di setiap halaman data |
| **Pembatasan Peran** | Menu, rute, dan data dibatasi per peran (multi-role per akun) |

---

## 👥 Peran yang Didukung

<table>
  <tr><th>Peran</th><th>Nilai Role</th><th>Tanggung jawab inti</th></tr>
  <tr><td>Administrator</td><td><code>admin</code></td><td>Akses penuh sistem, buka kunci sesi mengajar</td></tr>
  <tr><td>Kepala Sekolah</td><td><code>kepala_sekolah</code></td><td>Supervisor akademik</td></tr>
  <tr><td>Wakil Kepala Sekolah</td><td><code>waka</code></td><td>Supervisor akademik</td></tr>
  <tr><td>Kepala Tata Usaha</td><td><code>kepala_tu</code></td><td>Administrasi, keuangan, dan data induk</td></tr>
  <tr><td>Staf Tata Usaha</td><td><code>staff_tu</code></td><td>Administrasi, keuangan, dan data induk</td></tr>
  <tr><td>Guru</td><td><code>guru</code></td><td>Role lama, tetap didukung</td></tr>
  <tr><td>Guru Mapel</td><td><code>guru_mapel</code></td><td>Mengajar, nilai + absensi mapel/kelas yang diampu</td></tr>
  <tr><td>Wali Kelas</td><td><code>wali_kelas</code></td><td>Mengajar, nilai + absensi kelas walinya, lihat tagihan</td></tr>
  <tr><td>Siswa</td><td><code>siswa</code></td><td>Data, nilai, absensi, dan tagihan sendiri</td></tr>
  <tr><td>Orang Tua</td><td><code>orang_tua</code></td><td>Laporan dan tagihan anaknya</td></tr>
</table>

Satu akun boleh punya beberapa role. Izin dan cakupan data digabung (union) dari semua role tersebut, mis. `guru_mapel` + `wali_kelas`.

---

## 🔑 Akun Login Demo

Semua akun dibuat oleh `npm run seed` (idempoten). Password peka huruf besar/kecil.

<table>
  <tr><th>Peran</th><th>Email</th><th>Password</th><th>Catatan</th></tr>
  <tr><td>Administrator</td><td><code>admin@example.com</code></td><td><code>Password123</code></td><td>Akses penuh</td></tr>
  <tr><td>Kepala Sekolah</td><td><code>kepsek@smk.id</code></td><td><code>Password123</code></td><td>Supervisor</td></tr>
  <tr><td>Wakil Kepala Sekolah</td><td><code>waka@smk.id</code></td><td><code>Password123</code></td><td>Supervisor</td></tr>
  <tr><td>Kepala Tata Usaha</td><td><code>kepalatu@smk.id</code></td><td><code>Password123</code></td><td>Administrasi + keuangan</td></tr>
  <tr><td>Staf Tata Usaha</td><td><code>stafftu@smk.id</code></td><td><code>Password123</code></td><td>Administrasi + keuangan</td></tr>
  <tr><td>Guru Mapel</td><td><code>guru1@smk.id</code></td><td><code>Password123</code></td><td>Informatika + Pemrograman Web, X RPL 1</td></tr>
  <tr><td>Wali Kelas</td><td><code>wali1@smk.id</code></td><td><code>Password123</code></td><td>Kelas X RPL 1 (juga guru mapel)</td></tr>
  <tr><td>Guru</td><td><code>guru@smk.id</code></td><td><code>guru123</code></td><td>Role lama</td></tr>
  <tr><td>Siswa</td><td><code>siswa@smk.id</code></td><td><code>siswa123</code></td><td>Data sendiri</td></tr>
  <tr><td>Orang Tua</td><td><code>ortu@smk.id</code></td><td><code>ortu123</code></td><td>Anak: std-001 dan std-002</td></tr>
</table>

Contoh uji login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wali1@smk.id","password":"Password123"}'
```

---

## 🔒 Hak Akses

Baca = boleh membuka halaman. Tulis = boleh tambah/ubah/hapus/impor.

<table>
  <tr><th>Fitur</th><th>Baca</th><th>Tulis</th></tr>
  <tr><td>Dashboard</td><td>semua role (isi berbeda)</td><td>—</td></tr>
  <tr><td>Siswa</td><td>admin, kepsek, waka, TU, wali_kelas (kelasnya), siswa, orang_tua</td><td>admin, kepala_tu, staff_tu</td></tr>
  <tr><td>Kelas</td><td>admin, kepsek, waka, TU, wali_kelas</td><td>admin, kepala_tu, staff_tu</td></tr>
  <tr><td>Guru</td><td>admin, kepsek, waka, TU</td><td>admin, kepala_tu, staff_tu</td></tr>
  <tr><td>Jadwal</td><td>semua role</td><td>admin, kepala_tu, staff_tu</td></tr>
  <tr><td>Mengajar</td><td>guru, guru_mapel, wali_kelas (plus admin/supervisor untuk pantau)</td><td>guru pada sesi miliknya, sebelum dikirim</td></tr>
  <tr><td>Absensi</td><td>admin, kepsek, waka, TU; siswa/orang tua lihat laporan sendiri</td><td>admin, kepsek, waka, guru_mapel/guru (kelas diampu), wali_kelas (kelasnya)</td></tr>
  <tr><td>Nilai</td><td>admin, kepsek, waka, TU; siswa/orang tua lihat laporan sendiri</td><td>admin, kepsek, waka, guru_mapel/guru (mapel + kelas diampu), wali_kelas (kelasnya)</td></tr>
  <tr><td>Ekskul & Prestasi</td><td>admin, kepsek, waka, guru, wali_kelas, siswa, orang_tua</td><td>admin, kepsek, waka</td></tr>
  <tr><td>Tagihan</td><td>admin, kepsek, waka, TU, wali_kelas, siswa, orang_tua</td><td>admin, kepala_tu, staff_tu; orang_tua unggah bukti bayar</td></tr>
  <tr><td>Pengguna (API <code>/api/users</code>)</td><td>admin, kepsek, waka, TU</td><td>admin, kepala_tu, staff_tu; hapus akun hanya admin</td></tr>
  <tr><td>Relasi orang tua</td><td>admin, kepsek, waka, TU</td><td>admin, kepala_tu</td></tr>
  <tr><td>Penugasan guru</td><td>admin, kepsek, waka, TU</td><td>admin, kepala_sekolah</td></tr>
</table>

> **Aturan penting:**
> - Data siswa, nilai, dan absensi selalu dipangkas ke cakupan peran (`backend/scope.js`), bukan hanya disembunyikan di UI.
> - `guru_mapel` dan `guru` **tidak** boleh membuka Tagihan (`GET /api/bills` → `403`).
> - `wali_kelas` hanya **melihat** Tagihan siswanya.
> - Siswa/orang tua hanya menerima laporan, bukan data mentah seluruh sekolah.
> - Impor data mengikuti izin tulis halaman tersebut.

---

## 🧭 Menu per Peran

| Peran | Menu sidebar |
|---|---|
| admin | Dashboard, Pengaturan, Siswa, Kelas, Guru, Jadwal, Absensi, Nilai, Ekskul, Prestasi, Tagihan |
| kepsek, waka | Dashboard, Pengaturan, Siswa, Kelas, Guru, Jadwal, Absensi, Nilai, Ekskul, Prestasi, Tagihan |
| kepala_tu, staff_tu | Dashboard, Pengaturan, Siswa, Kelas, Guru, Jadwal, Absensi, Nilai, Tagihan |
| guru, guru_mapel | Dashboard, Jadwal (hanya lihat), Mengajar, Ekskul, Prestasi |
| wali_kelas | Dashboard, Siswa, Kelas, Jadwal (hanya lihat), Mengajar, Ekskul, Prestasi, Tagihan |
| siswa, orang_tua | Dashboard, Jadwal, Laporan Absensi, Laporan Nilai, Ekskul, Prestasi, Tagihan, Profil |

Jadwal dikelola admin + TU. Kepsek/waka hanya memantau, guru hanya membaca. Halaman **Pengaturan** hanya dibuka admin; API relasi dan pengguna tetap tersedia untuk peran yang berwenang.

---

## 📊 Dashboard per Peran

| Audience | Peran | Isi |
|---|---|---|
| `admin` | admin | KPI siswa/guru/kehadiran/tunggakan, tren + donut kehadiran, komposisi siswa, nilai + distribusi, kehadiran terendah, nilai tertinggi, billing |
| `supervisor` | kepsek, waka | KPI kehadiran/nilai/guru/kelas, tren + donut, nilai + distribusi, kehadiran terendah, nilai tertinggi |
| `tu` | kepala_tu, staff_tu | KPI siswa/guru/kehadiran/tunggakan, tren + donut, komposisi siswa, nilai + distribusi, billing |
| `teacher` | guru, guru_mapel, wali_kelas | KPI sesi hari ini/belum dikirim/siswa diampu/rata-rata nilai, panel Sesi Mengajar Hari Ini, tren + donut, nilai |
| `personal` | siswa, orang_tua | Portal ringkas pribadi (kehadiran + nilai anak) |

Audience ditentukan backend dari role akun, jadi tampilan tidak bisa dipaksa dari sisi klien.

---

## 🕐 Alur Mengajar

Halaman **Mengajar** dipakai guru untuk mengisi absensi dan nilai per jam pelajaran.

1. **Buka sesi** hanya boleh mulai dari jam pelajaran tersebut (tidak bisa lebih awal).
2. Guru mengisi absensi dan nilai, lalu menekan **Kirim**.
3. Setelah dikirim, sesi **terkunci**: absensi dan nilai tetap bisa dilihat, tidak bisa diubah.
4. Admin bisa **membuka kunci** (`POST /api/teaching/sessions/:id/unlock`); guru dapat mengedit lagi.
5. Sesi yang melewati jam selesai **ditutup otomatis** dan ditandai belum diisi bila kosong.
6. Pengingat muncul di halaman Mengajar pada 30, 15, 10, 5, 2, dan 1 menit sebelum jam selesai.
7. Nilai yang masuk lewat Mengajar mengikuti tanggal mengajar, tanpa filter tanggal terpisah.

---

## 📤 Ekspor CSV

Setiap halaman data menyediakan tombol ekspor CSV: Siswa, Guru, Kelas, Jadwal, Absensi, Nilai, Ekskul, Prestasi, dan Tagihan. Hak ekspor dipisah dari hak tulis: pengelola dan supervisor boleh mengekspor walau tidak boleh mengubah.

---

## 🗄️ Relasi Data

<table>
  <tr><th>Tabel</th><th>Isi</th></tr>
  <tr><td><code>parent_students(parent_id, student_id)</code></td><td>Orang tua ↔ anak (banyak anak diperbolehkan)</td></tr>
  <tr><td><code>teacher_assignments(id, teacher_id, subject, class)</code></td><td>Mapel + kelas yang diampu guru</td></tr>
  <tr><td><code>lesson_sessions(id, schedule_id, date, status, submitted_at)</code></td><td>Sesi mengajar per jadwal per tanggal</td></tr>
  <tr><td><code>lesson_attendances(id, session_id, student_id, status)</code></td><td>Kehadiran per sesi mengajar</td></tr>
</table>

Kelola relasi lewat **Pengaturan** (tab Relasi Orang Tua dan Penugasan Guru) atau API `/api/relations`.

---

## 📁 Struktur Proyek

```
akademik/
+-- backend/
|   +-- server.js              # Entry point Express
|   +-- database.js            # Skema SQLite + migrasi idempotent
|   +-- scope.js               # Aturan pembatasan data per peran
|   +-- middleware/            # JWT auth + roleCheck
|   +-- routes/                # auth, siswa, guru, jadwal, mengajar, nilai, absensi, tagihan, pengguna, relasi
|   +-- scripts/seedDemo.js    # Seed data demo (idempoten)
|   +-- smoke-run.cjs          # Uji otomatis peran + relasi
|   +-- stress-test.js         # Uji beban
+-- frontend/
|   +-- src/
|   |   +-- router/index.ts    # Route + guard per peran
|   |   +-- stores/            # Pinia
|   |   +-- services/api.js    # Axios + interceptor JWT
|   |   +-- components/layout/AppLayout.vue  # Sidebar per kategori + peran
|   |   +-- features/          # Halaman per modul
|   +-- vite.config.ts         # Proxy /api ke :3000
+-- setup.bat / setup.sh
```

---

## ▶️ Cara Menjalankan

Butuh Node.js 18+.

### Terminal 1 — Backend

```bash
cd backend
npm install
cp .env.example .env        # isi JWT_SECRET
npm run seed                # data demo (idempoten)
npm run dev                 # http://localhost:3000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Alternatif pakai skrip instalasi otomatis: `setup.bat` (Windows) / `setup.sh` (Linux/macOS).

Backend menolak start jika `backend/.env` tidak memiliki `JWT_SECRET`. Lihat `backend/.env.example`.

---

## 🧪 Pengujian

```bash
cd backend
node smoke-run.cjs          # uji otomatis peran + relasi
node stress-test.js 80 25   # uji beban (butuh server berjalan)

cd ../frontend
npm run build               # type check + build produksi
```

---

## ⚠️ Catatan

- `backend/.env`, `*.db`, `node_modules`, `dist`, `*.log`, `.agent-teams/`, dan `security-audit/` **tidak** di-commit (lihat `.gitignore`).
- Akun `siswa@smk.id` adalah akun demo lama (id uuid, bukan `std-001`); nilainya kosong saat login. Untuk demo data siswa, gunakan akun admin atau wali kelas.
- Data demo mencakup 13 siswa, 5 guru, 72 jadwal (Senin–Sabtu), dan sesi mengajar 7 hari terakhir.

---

<p align="center">
  <sub>Sistem Akademik SMK · Backend Express + SQLite · Frontend Vue 3 + Tailwind CSS</sub>
</p>

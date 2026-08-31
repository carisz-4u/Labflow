require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const assetRoutes = require('./routes/assets');
const loanRoutes = require('./routes/loans');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.warn('[peringatan] JWT_SECRET belum diatur di .env — memakai nilai default untuk pengembangan.');
  console.warn('             Salin .env.example menjadi .env dan atur JWT_SECRET sebelum dipakai serius.');
}

db.ready()
  .then(() => {
    app.listen(PORT, () => {
      console.log('===================================================');
      console.log(' Website berjalan di http://localhost:' + PORT);
      console.log(' Login:');
      console.log('   admin   / admin123   (Administrator)');
      console.log('   dosen1  / dosen123   (Dosen)');
      console.log('   tendik1 / tendik123  (Tenaga Kependidikan)');
      console.log('   mhs1    / mhs123     (Pelajar)');
      console.log('   kelasA  / kelasA123  (akun kelas)');
      console.log('===================================================');
    });
  })
  .catch((err) => {
    console.error('===================================================');
    console.error(' GAGAL TERHUBUNG KE DATABASE MYSQL');
    console.error('===================================================');
    console.error(' Pesan error: ' + err.message);
    console.error('');
    console.error(' Periksa hal berikut:');
    console.error(' 1. Apakah MySQL server sudah menyala di komputer/servermu?');
    console.error(' 2. Apakah pengaturan di file .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) sudah benar?');
    console.error(' 3. Kalau belum ada file .env, salin dari .env.example lalu sesuaikan.');
    console.error('===================================================');
    process.exit(1);
  });

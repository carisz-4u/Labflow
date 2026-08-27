# ASETLAB — Manajemen Aset Internal Lab

Sistem manajemen aset laboratorium (komputer & peralatan lab) yang bisa digunakan di institusi sekolah atau pendidikan lainnya

- **Frontend**: HTML-CSS-JavaScript 
- **Backend** : Node.js + Express 
- **Database**: MySQL 

---

## 1. Yang perlu disiapkan

- **Node.js versi 18 ke atas** 
- **MySQL Server** 

  !!**tidak perlu** membuat database secara manual aplikasi ini akan membuatnya sendiri secara otomatis saat pertama kali dijalankan (asalkan user MySQL yang dipakai punya izin `CREATE DATABASE`, yang biasanya sudah otomatis untuk user `root`).

---

## 2. Langkah instalasi & menjalankan (dari nol)

```bash
# 1) Masuk ke folder proyek
cd asetlab

# 2) Salin contoh konfigurasi, lalu sesuaikan
cp .env.example .env
```

Buka file `.env` dengan text editor, sesuaikan bagian ini dengan pengaturan MySQL di komputermu:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          <-- isi kalau MySQLmu pakai password
DB_NAME=asetlab
```

Lanjutkan:

```bash
# 3) Instal dependency backend
npm install

# 4) Jalankan servernya
npm start
```

Kalau berhasil, akan muncul tulisan seperti ini:

```
[seed] Database kosong terdeteksi, mengisi data awal...
[db] Koneksi MySQL siap (database: asetlab).
===================================================
 ASETLAB berjalan di http://localhost:3000
 Login  :
   admin   / password   (Administrator)
   dosen1  / password   (Dosen)
   tendik1 / password   (Tenaga Kependidikan)
   mhs1    / password   (Murid)
   kelasA  / password   (contoh akun bersama satu kelas)
===================================================
```

Buka browser ke **http://localhost:3000**, login dengan salah satu akun. Selesai.

Kalau muncul pesan **"GAGAL TERHUBUNG KE DATABASE MYSQL"**, itu tandanya MySQL belum menyala atau pengaturan di `.env` belum sesuai — baca pesan errornya, biasanya sudah cukup jelas penyebabnya.

---

## 3. Fitur utama versi ini

- **Login multi-role** 
- **Data Aset** 
- **Peminjaman** 
- **Pengembalian** 
- **Dashboard admin** 

---

## 4. Struktur proyek

```
asetlab/
├── package.json
├── .env.example-----------------contoh konfigurasi koneksi MySQL
├── server/
│   ├── index.js-----------------titik masuk server Express
│   ├── db.js--------------------koneksi MySQL
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js, users.js, assets.js, loans.js, dashboard.js
└── public/----------------------seluruh kode FRONTEND
    ├── index.html
    ├── css/style.css
    └── js/
```

---

## 5. Backup & pemindahan data


```bash
mysqldump -u root -p asetlab > backup-asetlab.sql
```

Untuk memulihkan di komputer lain:

```bash
mysql -u root -p asetlab < backup-asetlab.sql
```

---

## 6. Troubleshooting

**"GAGAL TERHUBUNG KE DATABASE MYSQL" / ECONNREFUSED**
Pastikan MySQL menyala. 
Di windows bisa lewat XAMPP Control Panel
Di linux `sudo service mysql start` 

kemudian jalankan lagi `npm start`

**Access denied for user...**
Username/password di `.env` tidak sesuai dengan MySQL mu. Cek ulang `DB_USER` dan `DB_PASSWORD`.

**Port 3000 sudah dipakai aplikasi lain**
Ubah `PORT=3000` di `.env` menjadi port lain, misalnya `PORT=4000`.

**Mau mulai dari data bersih**
Hapus database-nya lewat MySQL (`DROP DATABASE asetlab;`), lalu jalankan `npm start` lagi

**Upload foto aset gagal / gambar tidak muncul**
Ukuran gambar terlalu besar coba pakai file gambar dengan ukuran lebih kecil
(di bawah 5MB) dan format umum seperti JPG/PNG.

---

## 7. Yang perlu diperhatikan

- **Ganti semua password akun** lewat menu Manajemen Pengguna.
- **Buat file `.env`** dengan `JWT_SECRET` acak jangan andalkan nilai default di kode.

## 8. Lisensi

Proyek ini menggunakan [MIT License](LICENSE) — bebas dipakai, dimodifikasi, dan didistribusikan ulang.

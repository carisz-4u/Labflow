const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'asetlab';

let pool;


async function initPool() {
  const bootstrap = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD
  });
  await bootstrap.query('CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '` CHARACTER SET utf8mb4');
  await bootstrap.end();

  pool = mysql.createPool({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
    waitForConnections: true, connectionLimit: 10, dateStrings: true
  });
}

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nama VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      kategori VARCHAR(50) NULL,
      identitas VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      kategori VARCHAR(100) NOT NULL,
      jumlah_total INT NOT NULL DEFAULT 0,
      jumlah_tersedia INT NOT NULL DEFAULT 0,
      jumlah_rusak INT NOT NULL DEFAULT 0,
      lokasi VARCHAR(255) NOT NULL,
      status_admin VARCHAR(20) NOT NULL DEFAULT 'Tersedia',
      spesifikasi TEXT NULL,
      foto LONGTEXT NULL,
      keterangan TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      tanggal_pinjam DATE NOT NULL,
      tanggal_rencana_kembali DATE NOT NULL,
      tanggal_kembali_aktual DATE NULL,
      nama_peminjam VARCHAR(255) NOT NULL,
      kategori_peminjam VARCHAR(50) NOT NULL,
      identitas_peminjam VARCHAR(100) NOT NULL,
      kontak VARCHAR(50) NOT NULL,
      keperluan TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Dipinjam',
      catatan_pengembalian TEXT NULL,
      diajukan_oleh INT NOT NULL,
      diproses_oleh INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diajukan_oleh) REFERENCES users(id),
      FOREIGN KEY (diproses_oleh) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loan_id INT NOT NULL,
      asset_id INT NULL,
      nama_snapshot VARCHAR(255) NOT NULL,
      jumlah INT NOT NULL,
      kondisi_kembali VARCHAR(20) NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query('CREATE INDEX idx_loan_items_loan ON loan_items(loan_id)').catch(() => {});
  await pool.query('CREATE INDEX idx_loans_diajukan ON loans(diajukan_oleh)').catch(() => {});
}

function todayISO(offsetDays) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function seedIfEmpty() {
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM users');
  if (c > 0) return;

  console.log('[seed] Database kosong terdeteksi, mengisi data awal (akun demo, aset, contoh transaksi)...');

  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const [u1] = await pool.query('INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)', ['admin', hash('admin123'), 'Administrator Lab', 'admin', null, '-']);
  const [u2] = await pool.query('INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)', ['dosen1', hash('dosen123'), 'Dr. Budi Santoso, M.Kom', 'user', 'Dosen', '198203102010121001']);
  const [u3] = await pool.query('INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)', ['tendik1', hash('tendik123'), 'Siti Aminah, A.Md', 'user', 'Tendik', '199001152015032002']);
  const [u4] = await pool.query('INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)', ['mhs1', hash('mhs123'), 'Andi Wijaya', 'user', 'Mahasiswa', '2110511034']);
  const [u5] = await pool.query('INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)', ['kelasA', hash('kelasA123'), 'Akun Bersama Kelas A', 'user', 'Mahasiswa', '-']);

  const assetsSeed = [
    ['nama barang', 'kategori', 1, 'lokasi'],
    
  ];
  const assetIds = {};
  for (let i = 0; i < assetsSeed.length; i++) {
    const [nama, kategori, jumlah, lokasi] = assetsSeed[i];
    const kode = 'AST-' + String(i + 1).padStart(4, '0');
    const [info] = await pool.query(
      'INSERT INTO assets (kode,nama,kategori,jumlah_total,jumlah_tersedia,lokasi) VALUES (?,?,?,?,?,?)',
      [kode, nama, kategori, jumlah, jumlah, lokasi]
    );
    assetIds[nama] = info.insertId;
  }

  async function seedLoan(kode, tglPinjamOffset, tglRencanaOffset, nama, kategori, identitas, kontak, keperluan, diajukanOleh, items, tglKembaliOffset, diprosesOleh) {
    const tanggal_pinjam = todayISO(tglPinjamOffset);
    const tanggal_rencana_kembali = todayISO(tglRencanaOffset);
    const status = tglKembaliOffset !== undefined ? 'Dikembalikan' : 'Dipinjam';
    const tanggal_kembali_aktual = tglKembaliOffset !== undefined ? todayISO(tglKembaliOffset) : null;
    const [loanInfo] = await pool.query(
      `INSERT INTO loans (kode,tanggal_pinjam,tanggal_rencana_kembali,tanggal_kembali_aktual,nama_peminjam,kategori_peminjam,identitas_peminjam,kontak,keperluan,status,diajukan_oleh,diproses_oleh)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [kode, tanggal_pinjam, tanggal_rencana_kembali, tanggal_kembali_aktual, nama, kategori, identitas, kontak, keperluan, status, diajukanOleh, diprosesOleh || null]
    );
    for (const [namaBarang, jumlah] of items) {
      const assetId = assetIds[namaBarang];
      const kondisi = tglKembaliOffset !== undefined ? 'Baik' : null;
      await pool.query('INSERT INTO loan_items (loan_id,asset_id,nama_snapshot,jumlah,kondisi_kembali) VALUES (?,?,?,?,?)', [loanInfo.insertId, assetId, namaBarang, jumlah, kondisi]);
      if (tglKembaliOffset === undefined) {
        await pool.query('UPDATE assets SET jumlah_tersedia = jumlah_tersedia - ? WHERE id=?', [jumlah, assetId]);
      }
    }
  }

 
  console.log('[seed] Selesai. Login demo: admin/admin123, dosen1/dosen123, tendik1/tendik123, mhs1/mhs123, kelasA/kelasA123');
}


async function query(sql, params) {
  const [rows] = await pool.query(sql, params || []);
  return rows;
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params) {
  const [result] = await pool.execute(sql, params || []);
  return result;
}

async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const txDb = {
      query: async (sql, params) => { const [rows] = await conn.query(sql, params || []); return rows; },
      queryOne: async (sql, params) => { const [rows] = await conn.query(sql, params || []); return rows[0] || null; },
      execute: async (sql, params) => { const [result] = await conn.execute(sql, params || []); return result; }
    };
    const result = await fn(txDb);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

let readyPromise = null;

function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await initPool();
      await createSchema();
      await seedIfEmpty();
      console.log('[db] Koneksi MySQL siap (database: ' + DB_NAME + ').');
    })();
  }
  return readyPromise;
}

module.exports = { query, queryOne, execute, transaction, ready };

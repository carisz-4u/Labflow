const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

router.get('/summary', async (req, res) => {
  try {
    const range = req.query.range || '30';

    const assets = await db.query('SELECT * FROM assets');
    const totalJenis = assets.length;
    const totalUnit = assets.reduce((s, a) => s + a.jumlah_total, 0);
    const totalTersedia = assets.reduce((s, a) => s + a.jumlah_tersedia, 0);
    const totalRusak = assets.reduce((s, a) => s + a.jumlah_rusak, 0);
    const totalDipinjam = totalUnit - totalTersedia - totalRusak;
    const [{ c: aktifCount }] = await db.query("SELECT COUNT(*) c FROM loans WHERE status IN ('Dipinjam','Menunggu Konfirmasi')");

    const categoryBreakdown = await db.query(`
      SELECT kategori, SUM(jumlah_total) AS total
      FROM assets GROUP BY kategori ORDER BY total DESC
    `);

    const today2 = todayISO();
    let startDate;
    if (range === 'all') {
      const minRow = await db.queryOne('SELECT MIN(tanggal_pinjam) m FROM loans');
      startDate = minRow.m || today2;
    } else {
      startDate = addDaysISO(today2, -(parseInt(range, 10) - 1));
    }

    const dates = [];
    for (let d = startDate; d <= today2; d = addDaysISO(d, 1)) dates.push(d);

    const pinjamRows = await db.query(`
      SELECT tanggal_pinjam AS tgl, SUM(li.jumlah) AS total
      FROM loans l JOIN loan_items li ON li.loan_id = l.id
      WHERE tanggal_pinjam BETWEEN ? AND ?
      GROUP BY tanggal_pinjam
    `, [startDate, today2]);
    const kembaliRows = await db.query(`
      SELECT tanggal_kembali_aktual AS tgl, SUM(li.jumlah) AS total
      FROM loans l JOIN loan_items li ON li.loan_id = l.id
      WHERE tanggal_kembali_aktual BETWEEN ? AND ? AND l.status = 'Dikembalikan'
      GROUP BY tanggal_kembali_aktual
    `, [startDate, today2]);

    const pinjamMap = {}; pinjamRows.forEach(r => { pinjamMap[r.tgl] = r.total; });
    const kembaliMap = {}; kembaliRows.forEach(r => { kembaliMap[r.tgl] = r.total; });

    const activeItemsRaw = await db.query(`
      SELECT li.nama_snapshot AS nama, li.jumlah AS jumlah, l.nama_peminjam AS nama_peminjam,
             l.kategori_peminjam AS kategori_peminjam, l.tanggal_pinjam AS tanggal_pinjam,
             l.tanggal_rencana_kembali AS tanggal_rencana_kembali, l.kode AS kode, l.status AS status
      FROM loan_items li JOIN loans l ON l.id = li.loan_id
      WHERE l.status IN ('Dipinjam','Menunggu Konfirmasi')
      ORDER BY l.tanggal_pinjam DESC
      LIMIT 30
    `);
    const activeItems = activeItemsRaw.map(r => ({
      ...r,
      status_label: r.status === 'Menunggu Konfirmasi' ? 'Menunggu Konfirmasi' : (r.tanggal_rencana_kembali < today2 ? 'Terlambat' : 'Dipinjam')
    }));

    res.json({
      kpi: { totalJenis, totalUnit, totalTersedia, totalDipinjam, totalRusak, aktifCount },
      statusDist: { tersedia: totalTersedia, dipinjam: totalDipinjam, rusak: totalRusak },
      categoryBreakdown,
      activity: {
        dates,
        dipinjam: dates.map(d => pinjamMap[d] || 0),
        dikembalikan: dates.map(d => kembaliMap[d] || 0)
      },
      activeItems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;

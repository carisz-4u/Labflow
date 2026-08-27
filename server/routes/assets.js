const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);


function ketersediaanInfo(a) {
  if (a.status_admin === 'Maintenance') return { key: 'maintenance', label: 'Maintenance' };
  const dipinjam = a.jumlah_total - a.jumlah_tersedia - a.jumlah_rusak;
  if (a.jumlah_tersedia <= 0) return { key: 'habis', label: 'Habis Dipinjam' };
  if (a.jumlah_tersedia <= dipinjam) return { key: 'sebagian', label: 'Dipinjam Sebagian' };
  return { key: 'tersedia', label: 'Tersedia' };
}


function kondisiInfo(a) {
  const jumlahBaik = a.jumlah_total - a.jumlah_rusak;
  return a.jumlah_rusak > jumlahBaik ? 'Rusak Sebagian' : 'Baik';
}

function nextKode() {
  return db.queryOne('SELECT kode FROM assets ORDER BY id DESC LIMIT 1').then(row => {
    let n = 1;
    if (row) {
      const m = row.kode.match(/(\d+)$/);
      if (m) n = parseInt(m[1], 10) + 1;
    }
    return 'AST-' + String(n).padStart(4, '0');
  });
}

router.get('/', async (req, res) => {
  try {
    const { q, kategori, ketersediaan } = req.query;
    let rows = await db.query('SELECT * FROM assets ORDER BY nama');

    if (q) {
      const s = String(q).toLowerCase();
      rows = rows.filter(a =>
        a.nama.toLowerCase().includes(s) ||
        a.lokasi.toLowerCase().includes(s) ||
        (a.kode && a.kode.toLowerCase().includes(s))
      );
    }
    if (kategori) rows = rows.filter(a => a.kategori === kategori);
    if (ketersediaan) rows = rows.filter(a => ketersediaanInfo(a).key === ketersediaan);

    rows = rows.map(a => ({ ...a, kondisi_info: kondisiInfo(a) }));


    if (req.user.role !== 'admin') {
      rows = rows.map(a => ({
        id: a.id,
        nama: a.nama,
        lokasi: a.lokasi,
        jumlah_tersedia: a.jumlah_tersedia,
        jumlah_total: a.jumlah_total,
        jumlah_rusak: a.jumlah_rusak,
        status_admin: a.status_admin,
        kondisi_info: a.kondisi_info,
        spesifikasi: a.spesifikasi,
        foto: a.foto
      }));
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nama, kategori, jumlah_total, lokasi, status_admin, spesifikasi, foto, keterangan, kode } = req.body || {};
    const jumlah = parseInt(jumlah_total, 10);
    if (!nama || !lokasi || isNaN(jumlah) || jumlah < 0) {
      return res.status(400).json({ error: 'Lengkapi data aset dengan benar.' });
    }
    const statusAdmin = status_admin === 'Maintenance' ? 'Maintenance' : 'Tersedia';

    let finalKode = String(kode || '').trim();
    if (finalKode) {
      const dup = await db.queryOne('SELECT id FROM assets WHERE kode=?', [finalKode]);
      if (dup) return res.status(409).json({ error: 'Kode aset "' + finalKode + '" sudah dipakai. Gunakan kode lain.' });
    } else {
      finalKode = await nextKode();
    }

    const info = await db.execute(
      `INSERT INTO assets (kode,nama,kategori,jumlah_total,jumlah_tersedia,lokasi,status_admin,spesifikasi,foto,keterangan)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [finalKode, nama, kategori || 'Lainnya', jumlah, jumlah, lokasi, statusAdmin, spesifikasi || '', foto || '', keterangan || '']
    );
    res.status(201).json({ id: info.insertId, kode: finalKode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const a = await db.queryOne('SELECT * FROM assets WHERE id=?', [id]);
    if (!a) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

    const { nama, kategori, jumlah_total, jumlah_rusak, lokasi, status_admin, spesifikasi, foto, keterangan } = req.body || {};
    const newTotal = parseInt(jumlah_total, 10);
    const newRusak = jumlah_rusak !== undefined && jumlah_rusak !== '' ? parseInt(jumlah_rusak, 10) : a.jumlah_rusak;
    const statusAdmin = status_admin === 'Maintenance' ? 'Maintenance' : 'Tersedia';

    if (!nama || !lokasi || isNaN(newTotal) || newTotal < 0 || isNaN(newRusak) || newRusak < 0) {
      return res.status(400).json({ error: 'Lengkapi data aset dengan benar.' });
    }

    const dipinjam = a.jumlah_total - a.jumlah_tersedia - a.jumlah_rusak;
    const newTersedia = newTotal - dipinjam - newRusak;

    if (newTersedia < 0) {
      return res.status(400).json({
        error: 'Jumlah total tidak cukup untuk menampung unit yang sedang dipinjam (' + dipinjam + ') dan rusak (' + newRusak + ').'
      });
    }

    const specVal = spesifikasi !== undefined ? spesifikasi : a.spesifikasi;
    const fotoVal = foto !== undefined ? foto : a.foto;

    await db.execute(
      `UPDATE assets SET nama=?, kategori=?, jumlah_total=?, jumlah_tersedia=?, jumlah_rusak=?, lokasi=?, status_admin=?, spesifikasi=?, foto=?, keterangan=?
       WHERE id=?`,
      [nama, kategori || 'Lainnya', newTotal, newTersedia, newRusak, lokasi, statusAdmin, specVal || '', fotoVal || '', keterangan || '', id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const a = await db.queryOne('SELECT * FROM assets WHERE id=?', [id]);
    if (!a) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

    const dipinjam = a.jumlah_total - a.jumlah_tersedia - a.jumlah_rusak;
    if (dipinjam > 0) {
      return res.status(400).json({ error: 'Tidak bisa menghapus, masih ada unit yang sedang dipinjam.' });
    }
    await db.execute('DELETE FROM assets WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;

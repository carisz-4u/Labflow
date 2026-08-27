const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function nextLoanKode() {
  const row = await db.queryOne('SELECT kode FROM loans ORDER BY id DESC LIMIT 1');
  let n = 1;
  if (row) {
    const m = row.kode.match(/(\d+)$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return 'PJM-' + String(n).padStart(4, '0');
}

function statusLabel(loan) {
  if (loan.status === 'Dikembalikan') return 'Dikembalikan';
  if (loan.status === 'Menunggu Konfirmasi') return 'Menunggu Konfirmasi';
  if (loan.tanggal_rencana_kembali < todayISO()) return 'Terlambat';
  return 'Dipinjam';
}

async function attach(loan) {
  loan.items = await db.query('SELECT * FROM loan_items WHERE loan_id=?', [loan.id]);
  loan.status_label = statusLabel(loan);
  return loan;
}

router.get('/', async (req, res) => {
  try {
    const { q, status } = req.query;
    let rows = await db.query('SELECT * FROM loans ORDER BY tanggal_pinjam DESC, id DESC');
    if (req.user.role !== 'admin') rows = rows.filter(l => l.diajukan_oleh === req.user.id);
    rows = await Promise.all(rows.map(attach));
    if (q) {
      const s = String(q).toLowerCase();
      rows = rows.filter(l => l.kode.toLowerCase().includes(s) || l.nama_peminjam.toLowerCase().includes(s));
    }
    if (status) rows = rows.filter(l => l.status_label === status);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loan = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    if (!loan) return res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
    if (req.user.role !== 'admin' && loan.diajukan_oleh !== req.user.id) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke data ini.' });
    }
    res.json(await attach(loan));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      nama_peminjam, kategori_peminjam, identitas_peminjam, kontak,
      tanggal_pinjam, tanggal_rencana_kembali, keperluan, items
    } = req.body || {};

    
    if (req.user.role === 'user') {
      kategori_peminjam = req.user.kategori;
    }

    if (!nama_peminjam || !kategori_peminjam || !identitas_peminjam || !kontak ||
        !tanggal_pinjam || !tanggal_rencana_kembali || !keperluan) {
      return res.status(400).json({ error: 'Lengkapi seluruh data peminjam.' });
    }
    if (!/^[A-Za-zÀ-ÿ\s.,'-]+$/.test(nama_peminjam)) {
      return res.status(400).json({ error: 'Nama peminjam hanya boleh berisi huruf.' });
    }
    if (!/^\d+$/.test(String(identitas_peminjam))) {
      return res.status(400).json({ error: 'NIP/NIM hanya boleh berisi angka.' });
    }
    if (!/^\d+$/.test(String(kontak))) {
      return res.status(400).json({ error: 'Nomor HP/kontak hanya boleh berisi angka.' });
    }
    if (tanggal_rencana_kembali < tanggal_pinjam) {
      return res.status(400).json({ error: 'Rencana tanggal kembali tidak boleh sebelum tanggal pinjam.' });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Pilih minimal satu barang untuk dipinjam.' });
    }

    for (const it of items) {
      const qty = Number(it.jumlah);
      if (!qty || qty < 1) return res.status(400).json({ error: 'Jumlah barang tidak valid.' });
      if (!it.asset_id && !String(it.nama || '').trim()) {
        return res.status(400).json({ error: 'Nama barang tidak boleh kosong.' });
      }
    }

    const kode = await nextLoanKode();
    const loanId = await db.transaction(async (tx) => {
      const totals = {};
      items.forEach(it => {
        if (it.asset_id) totals[it.asset_id] = (totals[it.asset_id] || 0) + Number(it.jumlah);
      });
      for (const assetId in totals) {
        const a = await tx.queryOne('SELECT * FROM assets WHERE id=?', [assetId]);
        if (!a) throw new Error('Salah satu aset tidak ditemukan.');
        if (a.status_admin === 'Maintenance') {
          throw new Error('"' + a.nama + '" sedang dalam status Maintenance dan tidak bisa dipinjam.');
        }
        if (totals[assetId] > a.jumlah_tersedia) {
          throw new Error('Jumlah "' + a.nama + '" melebihi stok tersedia (' + a.jumlah_tersedia + ').');
        }
      }

      const info = await tx.execute(
        `INSERT INTO loans (kode,tanggal_pinjam,tanggal_rencana_kembali,nama_peminjam,kategori_peminjam,identitas_peminjam,kontak,keperluan,status,diajukan_oleh)
         VALUES (?,?,?,?,?,?,?,?, 'Dipinjam', ?)`,
        [kode, tanggal_pinjam, tanggal_rencana_kembali, nama_peminjam, kategori_peminjam, identitas_peminjam, kontak, keperluan, req.user.id]
      );
      const newId = info.insertId;

      for (const it of items) {
        if (it.asset_id) {
          const a = await tx.queryOne('SELECT nama FROM assets WHERE id=?', [it.asset_id]);
          await tx.execute('INSERT INTO loan_items (loan_id,asset_id,nama_snapshot,jumlah) VALUES (?,?,?,?)', [newId, it.asset_id, a.nama, Number(it.jumlah)]);
          await tx.execute('UPDATE assets SET jumlah_tersedia = jumlah_tersedia - ? WHERE id=?', [Number(it.jumlah), it.asset_id]);
        } else {
          // barang tidak terdaftar: tidak ada asset_id, tidak memengaruhi stok
          await tx.execute('INSERT INTO loan_items (loan_id,asset_id,nama_snapshot,jumlah) VALUES (?,NULL,?,?)', [newId, String(it.nama).trim(), Number(it.jumlah)]);
        }
      }
      return newId;
    });

    const loan = await db.queryOne('SELECT * FROM loans WHERE id=?', [loanId]);
    res.status(201).json(await attach(loan));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal membuat peminjaman.' });
  }
});


router.post('/:id/kembalikan', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { items, catatan } = req.body || {};

    const loan = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    if (!loan) return res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
    if (req.user.role !== 'admin' && loan.diajukan_oleh !== req.user.id) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke data ini.' });
    }
    if (loan.status !== 'Dipinjam') {
      return res.status(400).json({ error: 'Peminjaman ini tidak dalam status yang bisa dikembalikan.' });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Data kondisi pengembalian tidak lengkap.' });
    }

    const isAdmin = req.user.role === 'admin';

    await db.transaction(async (tx) => {
      for (const it of items) {
        const li = await tx.queryOne('SELECT * FROM loan_items WHERE id=? AND loan_id=?', [it.loan_item_id, id]);
        if (!li) throw new Error('Item peminjaman tidak valid.');
        const kondisi = it.kondisi === 'Rusak' ? 'Rusak' : 'Baik';
        await tx.execute('UPDATE loan_items SET kondisi_kembali=? WHERE id=?', [kondisi, li.id]);

        if (isAdmin && li.asset_id) {
          if (kondisi === 'Baik') {
            await tx.execute('UPDATE assets SET jumlah_tersedia = jumlah_tersedia + ? WHERE id=?', [li.jumlah, li.asset_id]);
          } else {
            await tx.execute('UPDATE assets SET jumlah_rusak = jumlah_rusak + ? WHERE id=?', [li.jumlah, li.asset_id]);
          }
        }
      
      }

      if (isAdmin) {
        await tx.execute(
          `UPDATE loans SET status='Dikembalikan', tanggal_kembali_aktual=?, catatan_pengembalian=?, diproses_oleh=? WHERE id=?`,
          [todayISO(), catatan || '', req.user.id, id]
        );
      } else {
        await tx.execute(
          `UPDATE loans SET status='Menunggu Konfirmasi', tanggal_kembali_aktual=?, catatan_pengembalian=? WHERE id=?`,
          [todayISO(), catatan || '', id]
        );
      }
    });

    const updated = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    res.json(await attach(updated));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal memproses pengembalian.' });
  }
});


router.post('/:id/konfirmasi', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loan = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    if (!loan) return res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
    if (loan.status !== 'Menunggu Konfirmasi') {
      return res.status(400).json({ error: 'Peminjaman ini tidak sedang menunggu konfirmasi.' });
    }

    await db.transaction(async (tx) => {
      const items = await tx.query('SELECT * FROM loan_items WHERE loan_id=?', [id]);
      for (const li of items) {
        if (!li.asset_id) continue; 
        if (li.kondisi_kembali === 'Rusak') {
          await tx.execute('UPDATE assets SET jumlah_rusak = jumlah_rusak + ? WHERE id=?', [li.jumlah, li.asset_id]);
        } else {
          await tx.execute('UPDATE assets SET jumlah_tersedia = jumlah_tersedia + ? WHERE id=?', [li.jumlah, li.asset_id]);
        }
      }
      await tx.execute(`UPDATE loans SET status='Dikembalikan', diproses_oleh=? WHERE id=?`, [req.user.id, id]);
    });

    const updated = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    res.json(await attach(updated));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal mengonfirmasi pengembalian.' });
  }
});


router.post('/:id/tolak', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loan = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    if (!loan) return res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
    if (loan.status !== 'Menunggu Konfirmasi') {
      return res.status(400).json({ error: 'Peminjaman ini tidak sedang menunggu konfirmasi.' });
    }

    await db.transaction(async (tx) => {
      await tx.execute('UPDATE loan_items SET kondisi_kembali=NULL WHERE loan_id=?', [id]);
      await tx.execute(`UPDATE loans SET status='Dipinjam', tanggal_kembali_aktual=NULL, catatan_pengembalian='' WHERE id=?`, [id]);
    });

    const updated = await db.queryOne('SELECT * FROM loans WHERE id=?', [id]);
    res.json(await attach(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;

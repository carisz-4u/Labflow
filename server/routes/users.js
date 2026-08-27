const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT id,username,nama,role,kategori,identitas FROM users ORDER BY username');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, nama, role, kategori, identitas } = req.body || {};
    if (!username || !password || !nama || !role) {
      return res.status(400).json({ error: 'Lengkapi seluruh data pengguna.' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid.' });
    }
    const exists = await db.queryOne('SELECT id FROM users WHERE username=?', [username]);
    if (exists) return res.status(409).json({ error: 'Username sudah digunakan.' });

    const info = await db.execute(
      'INSERT INTO users (username,password_hash,nama,role,kategori,identitas) VALUES (?,?,?,?,?,?)',
      [username, bcrypt.hashSync(password, 10), nama, role, role === 'admin' ? null : (kategori || null), identitas || '-']
    );
    res.status(201).json({ id: info.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await db.queryOne('SELECT * FROM users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const { username, password, nama, role, kategori, identitas } = req.body || {};
    if (!username || !nama || !role) return res.status(400).json({ error: 'Lengkapi seluruh data pengguna.' });

    const dup = await db.queryOne('SELECT id FROM users WHERE username=? AND id<>?', [username, id]);
    if (dup) return res.status(409).json({ error: 'Username sudah digunakan.' });

    const passHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
    await db.execute(
      'UPDATE users SET username=?, password_hash=?, nama=?, role=?, kategori=?, identitas=? WHERE id=?',
      [username, passHash, nama, role, role === 'admin' ? null : (kategori || null), identitas || '-', id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun yang sedang digunakan.' });

    const target = await db.queryOne('SELECT role FROM users WHERE id=?', [id]);
    if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const [{ c: adminCount }] = await db.query("SELECT COUNT(*) c FROM users WHERE role='admin'");
    if (target.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Minimal harus ada satu akun admin.' });
    }
    await db.execute('DELETE FROM users WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'asetlab-dev-secret-jangan-dipakai-di-produksi';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login kembali.' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang dapat mengakses fitur ini.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, SECRET };

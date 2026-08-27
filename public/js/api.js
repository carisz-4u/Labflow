/* ============API CLIENT=========== */
const API_BASE = '/api';
let authToken = localStorage.getItem('asetlab_token') || null;

function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('asetlab_token', token);
  else localStorage.removeItem('asetlab_token');
}

async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    const err = new Error('Tidak dapat terhubung ke server. Pastikan server backend sedang berjalan.');
    err.status = 0;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* respons tanpa body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('Terjadi kesalahan (' + res.status + ')'));
    err.status = res.status;
    throw err;
  }
  return data;
}

const api = {
  login: (username, password) => apiRequest('POST', '/auth/login', { username, password }),
  me: () => apiRequest('GET', '/auth/me'),

  getUsers: () => apiRequest('GET', '/users'),
  createUser: (data) => apiRequest('POST', '/users', data),
  updateUser: (id, data) => apiRequest('PUT', '/users/' + id, data),
  deleteUser: (id) => apiRequest('DELETE', '/users/' + id),

  getAssets: (params) => apiRequest('GET', '/assets' + (params ? ('?' + new URLSearchParams(params).toString()) : '')),
  createAsset: (data) => apiRequest('POST', '/assets', data),
  updateAsset: (id, data) => apiRequest('PUT', '/assets/' + id, data),
  deleteAsset: (id) => apiRequest('DELETE', '/assets/' + id),

  getLoans: (params) => apiRequest('GET', '/loans' + (params ? ('?' + new URLSearchParams(params).toString()) : '')),
  getLoan: (id) => apiRequest('GET', '/loans/' + id),
  createLoan: (data) => apiRequest('POST', '/loans', data),
  returnLoan: (id, data) => apiRequest('POST', '/loans/' + id + '/kembalikan', data),
  confirmReturn: (id) => apiRequest('POST', '/loans/' + id + '/konfirmasi'),
  rejectReturn: (id) => apiRequest('POST', '/loans/' + id + '/tolak'),

  getDashboard: (range) => apiRequest('GET', '/dashboard/summary?range=' + encodeURIComponent(range))
};

/* ===STATE=== */
let session = null;
let currentView = 'dashboard';
let currentPeminjamanTab = 'form';
let formItems = [];
let rowCounter = 0;
let currentActivityRange = 30;
let assetsCache = [];
let usersCache = [];
const charts = {};

const ICONS = {
  dashboard:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  aset:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>',
  peminjaman:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/></svg>',
  pengembalian:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  users:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  edit:'<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash:'<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  printer:'<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  undo:'<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  eye:'<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  x:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

/* =============UTIL=============== */
function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function todayISO(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function fmtTanggal(iso){
  if(!iso) return '-';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
}
function fmtTanggalPendek(iso){
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
}
function toast(msg, type){
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' '+type : '');
  el.textContent = msg;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s'; setTimeout(()=>el.remove(),250); }, 3200);
}
function openModal(html, wide){
  document.getElementById('modal-root').innerHTML =
    '<div class="modal-backdrop" onmousedown="if(event.target===this) closeModal()">'+
      '<div class="modal-card'+(wide?' wide':'')+'">'+html+'</div>'+
    '</div>';
}
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }
function initials(name){
  return (name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

async function guard(promise){
  try{
    return await promise;
  }catch(err){
    if(err.status===401){
      toast('Sesi berakhir, silakan login kembali.', 'error');
      logout();
    }else{
      toast(err.message, 'error');
    }
    throw err;
  }
}

/* ====================AUTH======================== */
document.getElementById('login-form').addEventListener('submit', async function(e){
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  errBox.style.display = 'none';
  try{
    const resp = await api.login(username, password);
    setToken(resp.token);
    session = resp.user;
    enterApp();
  }catch(err){
    errBox.textContent = err.message || 'Username atau kata sandi salah.';
    errBox.style.display = 'block';
  }
});

function enterApp(){
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  initSidebarState();
  document.getElementById('user-avatar').textContent = initials(session.nama);
  document.getElementById('user-name').textContent = session.nama;
  document.getElementById('user-role').textContent = session.role==='admin' ? 'Administrator' : session.kategori;
  buildNav();
  navigateTo(session.role==='admin' ? 'dashboard' : 'aset');
}

function logout(){
  setToken(null);
  session = null;
  document.getElementById('login-form').reset();
  document.getElementById('login-error').style.display='none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'grid';
}

function buildNav(){
  const isAdmin = session.role==='admin';
  const items = [];
  if(isAdmin) items.push(['dashboard','Dashboard']);
  items.push(['aset','Data Aset']);
  items.push(['peminjaman','Peminjaman']);
  items.push(['pengembalian','Pengembalian']);
  if(isAdmin) items.push(['users','Manajemen Pengguna']);
  document.getElementById('nav-container').innerHTML = items.map(([key,label])=>
    '<div class="nav-item" data-view="'+key+'" onclick="navigateTo(\''+key+'\')">'+ICONS[key]+'<span>'+label+'</span></div>'
  ).join('');
}

function toggleSidebar(){
  document.getElementById('app').classList.toggle('sidebar-open');

  setTimeout(resizeAllCharts, 230);
}
function resizeAllCharts(){
  Object.values(charts).forEach(function(c){
    if(c && typeof c.resize === 'function') c.resize();
  });
}
window.addEventListener('resize', function(){
  clearTimeout(window.__resizeDebounce);
  window.__resizeDebounce = setTimeout(resizeAllCharts, 150);
});
function closeMobileSidebar(){
  if(window.innerWidth <= 980) document.getElementById('app').classList.remove('sidebar-open');
}
function initSidebarState(){
  const app = document.getElementById('app');
  if(window.innerWidth > 980) app.classList.add('sidebar-open');
  else app.classList.remove('sidebar-open');
}

/* ===========NAVIGATION============= */
const VIEW_TITLES = {
  dashboard:['Ringkasan','Dashboard'],
  aset:['Inventaris','Data Aset'],
  peminjaman:['Transaksi','Peminjaman'],
  pengembalian:['Transaksi','Pengembalian'],
  users:['Administrasi','Manajemen Pengguna']
};

async function navigateTo(view){
  currentView = view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  const [eyebrow,title] = VIEW_TITLES[view];
  document.getElementById('view-eyebrow').textContent = eyebrow;
  document.getElementById('view-title').textContent = title;

  if(view==='dashboard') await renderDashboard();
  if(view==='aset') await renderAsetView();
  if(view==='peminjaman') await renderPeminjamanView();
  if(view==='pengembalian') await renderPengembalianView();
  if(view==='users') await renderUsersView();
  closeMobileSidebar();
}

function statusBadgeClass(label){
  if(label==='Dikembalikan') return 'badge-neutral';
  if(label==='Terlambat') return 'badge-danger';
  if(label==='Menunggu Konfirmasi') return 'badge-info';
  return 'badge-warn';
}

/* =========================DATA ASET============================ */
let asetCurrentPage = 1;
const ASET_PAGE_SIZE = 10;


function ketersediaanInfo(a){
  if(a.status_admin==='Maintenance') return {key:'maintenance', label:'Maintenance', cls:'badge-neutral'};
  const dipinjam = a.jumlah_total - a.jumlah_tersedia - (a.jumlah_rusak||0);
  if(a.jumlah_tersedia<=0) return {key:'habis', label:'Habis Dipinjam', cls:'badge-danger'};
  if(a.jumlah_tersedia<=dipinjam) return {key:'sebagian', label:'Dipinjam Sebagian', cls:'badge-warn'};
  return {key:'tersedia', label:'Tersedia', cls:'badge-success'};
}


function renderPagination(containerId, totalItems, pageSize, currentPage, onPageChange){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(!totalItems){ container.innerHTML=''; return; }
  const totalPages = Math.max(1, Math.ceil(totalItems/pageSize));
  const startItem = (currentPage-1)*pageSize + 1;
  const endItem = Math.min(currentPage*pageSize, totalItems);

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons/2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);
  let pageButtons = '';
  for(let p=startPage; p<=endPage; p++){
    pageButtons += '<button class="'+(p===currentPage?'active':'')+'" data-page="'+p+'">'+p+'</button>';
  }

  container.innerHTML =
    '<div class="pg-info">Menampilkan '+startItem+'–'+endItem+' dari '+totalItems+' data</div>'+
    '<div class="pg-controls">'+
      '<button data-page="prev" '+(currentPage<=1?'disabled':'')+'>&laquo;</button>'+
      pageButtons+
      '<button data-page="next" '+(currentPage>=totalPages?'disabled':'')+'>&raquo;</button>'+
    '</div>';

  container.querySelectorAll('button[data-page]').forEach(btn=>{
    btn.addEventListener('click', function(){
      const p = btn.dataset.page;
      let newPage = currentPage;
      if(p==='prev') newPage = currentPage-1;
      else if(p==='next') newPage = currentPage+1;
      else newPage = parseInt(p,10);
      onPageChange(newPage);
    });
  });
}

async function renderAsetView(){
  const isAdmin = session.role==='admin';
  document.getElementById('btn-tambah-aset').style.display = isAdmin ? 'inline-flex' : 'none';

  const thead = document.getElementById('aset-table-head');
  thead.innerHTML = isAdmin
    ? '<tr><th>Kode</th><th>Nama Barang</th><th>Kategori</th><th>Lokasi</th><th>Jumlah</th><th>Tersedia</th><th>Kondisi</th><th>Ketersediaan</th><th></th></tr>'
    : '<tr><th>Nama Barang</th><th>Lokasi</th><th>Ketersediaan</th><th>Kondisi</th><th></th></tr>';

  const colCount = isAdmin ? 9 : 5;
  document.getElementById('aset-table-body').innerHTML = '<tr class="empty-row"><td colspan="'+colCount+'">Memuat data...</td></tr>';
  try{
    assetsCache = await guard(api.getAssets());
  }catch(e){ return; }

  const katSel = document.getElementById('aset-filter-kategori');
  if(isAdmin){
    const cats = [...new Set(assetsCache.map(a=>a.kategori))].sort();
    katSel.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c=>'<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>').join('');
    katSel.style.display = '';
  }else{
    katSel.style.display = 'none';
  }

  asetCurrentPage = 1;
  renderAsetTable();
}
function resetAsetPageAndRender(){ asetCurrentPage = 1; renderAsetTable(); }
document.getElementById('aset-search').addEventListener('input', resetAsetPageAndRender);
document.getElementById('aset-filter-kategori').addEventListener('change', resetAsetPageAndRender);
document.getElementById('aset-filter-ketersediaan').addEventListener('change', resetAsetPageAndRender);

function kondisiBadgeClass(label){ return label==='Rusak Sebagian' ? 'badge-danger' : 'badge-success'; }

function kondisiLabel(a){ return a.kondisi_info || 'Baik'; }

function renderAsetTable(){
  const isAdmin = session.role==='admin';
  const q = document.getElementById('aset-search').value.trim().toLowerCase();
  const fk = document.getElementById('aset-filter-kategori').value;
  const fa = document.getElementById('aset-filter-ketersediaan').value;

  let rows = assetsCache.filter(a=>{
    if(q && !(a.nama.toLowerCase().includes(q) || a.lokasi.toLowerCase().includes(q) || (a.kode && a.kode.toLowerCase().includes(q)))) return false;
    if(isAdmin && fk && a.kategori!==fk) return false;
    if(fa && ketersediaanInfo(a).key!==fa) return false;
    return true;
  }).sort((a,b)=>a.nama.localeCompare(b.nama));

  const tbody = document.getElementById('aset-table-body');
  const colCount = isAdmin ? 9 : 5;
  if(!rows.length){
    tbody.innerHTML = '<tr class="empty-row"><td colspan="'+colCount+'">Tidak ada aset yang cocok dengan pencarian/filter.</td></tr>';
    document.getElementById('aset-pagination').innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length/ASET_PAGE_SIZE));
  if(asetCurrentPage > totalPages) asetCurrentPage = totalPages;
  if(asetCurrentPage < 1) asetCurrentPage = 1;
  const pageRows = rows.slice((asetCurrentPage-1)*ASET_PAGE_SIZE, asetCurrentPage*ASET_PAGE_SIZE);

  if(!isAdmin){
    tbody.innerHTML = pageRows.map(a=>{
      const ket = ketersediaanInfo(a);
      return '<tr>'+
        '<td>'+escapeHtml(a.nama)+'</td>'+
        '<td>'+escapeHtml(a.lokasi)+'</td>'+
        '<td><span class="badge '+ket.cls+'"><span class="dot"></span>'+ket.label+'</span></td>'+
        '<td><span class="badge '+kondisiBadgeClass(kondisiLabel(a))+'"><span class="dot"></span>'+kondisiLabel(a)+'</span></td>'+
        '<td><button class="btn btn-ghost btn-sm" onclick="openAsetDetailModal('+a.id+')">'+ICONS.eye+'</button></td>'+
      '</tr>';
    }).join('');
  }else{
    tbody.innerHTML = pageRows.map(a=>{
      const ket = ketersediaanInfo(a);
      const actions =
        '<div class="cell-actions">'+
          '<button class="btn btn-ghost btn-sm" onclick="openAsetDetailModal('+a.id+')" title="Detail">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-sm" onclick="openAsetModal('+a.id+')">'+ICONS.edit+'</button>'+
          '<button class="btn btn-danger btn-sm" onclick="deleteAset('+a.id+')">'+ICONS.trash+'</button>'+
        '</div>';
      return '<tr>'+
        '<td class="cell-code">'+a.kode+'</td>'+
        '<td>'+escapeHtml(a.nama)+(a.keterangan?'<div class="muted" style="font-size:11.5px;margin-top:2px;">'+escapeHtml(a.keterangan)+'</div>':'')+'</td>'+
        '<td>'+escapeHtml(a.kategori)+'</td>'+
        '<td>'+escapeHtml(a.lokasi)+'</td>'+
        '<td>'+a.jumlah_total+'</td>'+
        '<td>'+a.jumlah_tersedia+'</td>'+
        '<td><span class="badge '+kondisiBadgeClass(kondisiLabel(a))+'"><span class="dot"></span>'+kondisiLabel(a)+'</span></td>'+
        '<td><span class="badge '+ket.cls+'"><span class="dot"></span>'+ket.label+'</span></td>'+
        '<td>'+actions+'</td>'+
      '</tr>';
    }).join('');
  }

  renderPagination('aset-pagination', rows.length, ASET_PAGE_SIZE, asetCurrentPage, function(newPage){
    asetCurrentPage = newPage;
    renderAsetTable();
    const viewEl = document.getElementById('view-aset');
    if(viewEl && typeof viewEl.scrollIntoView === 'function') viewEl.scrollIntoView({block:'start', behavior:'smooth'});
  });
}

function suggestNextKode(){
  let maxN = 0;
  assetsCache.forEach(a=>{
    if(a.kode){
      const m = a.kode.match(/(\d+)$/);
      if(m) maxN = Math.max(maxN, parseInt(m[1],10));
    }
  });
  return 'AST-' + String(maxN+1).padStart(4,'0');
}

let currentAsetFotoData = '';

function openAsetModal(id){
  const editing = !!id;
  const a = editing ? assetsCache.find(x=>x.id===id) : null;
  currentAsetFotoData = a ? (a.foto || '') : '';
  const dipinjamAktif = a ? (a.jumlah_total - a.jumlah_tersedia - a.jumlah_rusak) : 0;
  const cats = ['Peralatan 1','Peralatan 2','Peralatan 3','Bahan Umum','Sarana Penunjang Lab'];
  const html =
    '<div class="modal-head"><h3>'+(editing?'Ubah Aset':'Tambah Aset Baru')+'</h3>'+
      '<button class="modal-close" onclick="closeModal()">'+ICONS.x+'</button></div>'+
    '<form id="aset-form">'+
      '<div class="form-grid">'+
        (editing
          ? '<div class="field"><label>Kode Aset</label><input type="text" value="'+escapeHtml(a.kode)+'" disabled></div>'
          : '<div class="field"><label>Kode Aset</label><input type="text" id="af-kode" value="'+escapeHtml(suggestNextKode())+'" placeholder="mis. AST-0011"></div>'
        )+
        '<div class="field'+(editing?'':' full')+'"><label>Nama Barang</label><input type="text" id="af-nama" required value="'+(a?escapeHtml(a.nama):'')+'"></div>'+
        '<div class="field"><label>Kategori</label><select id="af-kategori">'+cats.map(c=>'<option '+(a&&a.kategori===c?'selected':'')+'>'+c+'</option>').join('')+'</select></div>'+
        '<div class="field"><label>Ketersediaan</label><select id="af-status-admin">'+
          ['Tersedia','Maintenance'].map(k=>'<option '+(a&&a.status_admin===k?'selected':'')+'>'+k+'</option>').join('')+
        '</select></div>'+
        '<div class="field"><label>Jumlah Total</label><input type="number" id="af-jumlah" min="0" step="1" required value="'+(a?a.jumlah_total:1)+'"></div>'+
        (editing ?
          '<div class="field"><label>Jumlah Rusak</label><input type="number" id="af-jumlah-rusak" min="0" step="1" value="'+a.jumlah_rusak+'"></div>'
          : '')+
        '<div class="field'+(editing?'':' full')+'"><label>Lokasi</label><input type="text" id="af-lokasi" required value="'+(a?escapeHtml(a.lokasi):'')+'"></div>'+
        '<div class="field full"><label>Spesifikasi Barang (opsional)</label><textarea id="af-spesifikasi" placeholder="mis. merk, tipe, tahun, kapasitas, dll.">'+(a?escapeHtml(a.spesifikasi||''):'')+'</textarea></div>'+
        '<div class="field full"><label>Foto Barang (opsional)</label>'+
          '<input type="file" id="af-foto-input" accept="image/*">'+
          '<div id="af-foto-preview" style="margin-top:8px;">'+(currentAsetFotoData?'<img src="'+currentAsetFotoData+'" style="max-width:160px;max-height:120px;border-radius:8px;border:1px solid var(--line);">':'')+'</div>'+
        '</div>'+
        '<div class="field full"><label>Keterangan (opsional)</label><textarea id="af-keterangan">'+(a?escapeHtml(a.keterangan||''):'')+'</textarea></div>'+
      '</div>'+
      '<p class="hint">Kondisi "Maintenance" akan membuat barang tidak bisa dipinjam oleh pengguna, apa pun jumlah stoknya. Status "Habis Dipinjam" dan "Dipinjam Sebagian" ditentukan otomatis oleh sistem dan tidak bisa dipilih manual.</p>'+
      (editing ?
        '<p class="hint">Sedang dipinjam saat ini: <b>'+dipinjamAktif+'</b> unit (tidak bisa diubah dari sini). '+
        'Turunkan "Jumlah Rusak" setelah barang diperbaiki agar unitnya kembali tersedia — grafik status ketersediaan di dashboard akan ikut ter-update otomatis.</p>'
        : '')+
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Aset</button></div>'+
    '</form>';
  openModal(html);
  document.getElementById('af-foto-input').addEventListener('change', handleFotoInputChange);
  document.getElementById('aset-form').addEventListener('submit', function(e){ saveAsetForm(e, id); });
}


function readImageCompressed(file, maxDim, quality){
  return new Promise(function(resolve, reject){
    const reader = new FileReader();
    reader.onerror = function(){ reject(new Error('Gagal membaca file gambar.')); };
    reader.onload = function(){
      const img = new Image();
      img.onerror = function(){ reject(new Error('File bukan gambar yang valid.')); };
      img.onload = function(){
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else{ w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function handleFotoInputChange(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ toast('File harus berupa gambar.', 'error'); return; }
  try{
    currentAsetFotoData = await readImageCompressed(file, 800, 0.8);
    document.getElementById('af-foto-preview').innerHTML = '<img src="'+currentAsetFotoData+'" style="max-width:160px;max-height:120px;border-radius:8px;border:1px solid var(--line);">';
  }catch(err){
    toast(err.message || 'Gagal memproses gambar.', 'error');
  }
}

async function saveAsetForm(e, id){
  e.preventDefault();
  const nama = document.getElementById('af-nama').value.trim();
  const kategori = document.getElementById('af-kategori').value;
  const status_admin = document.getElementById('af-status-admin').value;
  const jumlah_total = parseInt(document.getElementById('af-jumlah').value, 10);
  const lokasi = document.getElementById('af-lokasi').value.trim();
  const spesifikasi = document.getElementById('af-spesifikasi').value.trim();
  const keterangan = document.getElementById('af-keterangan').value.trim();
  const rusakEl = document.getElementById('af-jumlah-rusak');
  const jumlah_rusak = rusakEl ? parseInt(rusakEl.value, 10) : undefined;
  const kodeEl = document.getElementById('af-kode');
  const kode = kodeEl ? kodeEl.value.trim() : undefined;
  const foto = currentAsetFotoData;

  if(!nama || !lokasi || isNaN(jumlah_total) || jumlah_total<0){ toast('Lengkapi data dengan benar.', 'error'); return; }
  if(rusakEl && (isNaN(jumlah_rusak) || jumlah_rusak<0)){ toast('Jumlah rusak tidak valid.', 'error'); return; }

  try{
    if(id) await guard(api.updateAsset(id, {nama,kategori,jumlah_total,jumlah_rusak,lokasi,status_admin,spesifikasi,foto,keterangan}));
    else await guard(api.createAsset({nama,kategori,jumlah_total,lokasi,status_admin,spesifikasi,foto,keterangan,kode}));
  }catch(err){ return; }

  closeModal();
  toast(id ? 'Aset berhasil diperbarui.' : 'Aset baru berhasil ditambahkan.', 'success');
  await renderAsetView();
}

async function deleteAset(id){
  const a = assetsCache.find(x=>x.id===id);
  if(!a) return;
  if(!confirm('Hapus aset "'+a.nama+'"? Tindakan ini tidak dapat dibatalkan.')) return;
  try{ await guard(api.deleteAsset(id)); }catch(err){ return; }
  toast('Aset dihapus.', 'success');
  await renderAsetView();
}

function openAsetDetailModal(id){
  const a = assetsCache.find(x=>x.id===id);
  if(!a) return;
  const isAdmin = session.role==='admin';
  const ket = ketersediaanInfo(a);
  const html =
    '<div class="modal-head"><h3>Detail Barang</h3><button class="modal-close" onclick="closeModal()">'+ICONS.x+'</button></div>'+
    (a.foto ? '<img src="'+a.foto+'" style="width:100%;max-height:260px;object-fit:contain;border-radius:10px;border:1px solid var(--line);background:var(--paper);margin-bottom:16px;">' : '')+
    '<h3 style="font-size:17px;">'+escapeHtml(a.nama)+'</h3>'+
    (isAdmin ? '<p class="card-sub" style="margin-top:2px;">'+escapeHtml(a.kode)+' · '+escapeHtml(a.kategori)+'</p>' : '')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin:16px 0;font-size:12.5px;">'+
      '<div><span class="muted">Lokasi</span><br>'+escapeHtml(a.lokasi)+'</div>'+
      '<div><span class="muted">Ketersediaan</span><br><span class="badge '+ket.cls+'"><span class="dot"></span>'+ket.label+'</span></div>'+
      '<div><span class="muted">Kondisi</span><br><span class="badge '+kondisiBadgeClass(kondisiLabel(a))+'"><span class="dot"></span>'+kondisiLabel(a)+'</span></div>'+
    '</div>'+
    '<div class="field full"><label>Spesifikasi</label>'+
      '<p style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;color:var(--ink);">'+(a.spesifikasi?escapeHtml(a.spesifikasi):'<span class="muted">Belum ada spesifikasi yang dicantumkan.</span>')+'</p>'+
    '</div>'+
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>';
  openModal(html);
}

/* =====================================================================
   PEMINJAMAN
===================================================================== */
function switchPeminjamanTab(tab){
  currentPeminjamanTab = tab;
  document.querySelectorAll('#view-peminjaman .subtabs button').forEach(b=>b.classList.toggle('active', b.dataset.ptab===tab));
  document.getElementById('ptab-form').classList.toggle('hidden', tab!=='form');
  document.getElementById('ptab-list').classList.toggle('hidden', tab!=='list');
  if(tab==='list') renderLoanTable();
}

async function renderPeminjamanView(){
  const isUser = session.role!=='admin';
  const listLabel = document.getElementById('ptab-list-label');
  listLabel.textContent = session.role==='admin' ? 'Daftar Peminjaman' : 'Peminjaman Saya';

  const namaEl = document.getElementById('pj-nama');
  const kategoriEl = document.getElementById('pj-kategori');
  const identitasEl = document.getElementById('pj-identitas');

  if(isUser){
    namaEl.value = session.nama;
    kategoriEl.value = session.kategori;
    identitasEl.value = session.identitas;
  }

  namaEl.readOnly = false;
  identitasEl.readOnly = false;
  kategoriEl.disabled = isUser;
  namaEl.classList.remove('locked-field');
  identitasEl.classList.remove('locked-field');
  kategoriEl.classList.toggle('locked-field', isUser);

  updateIdentitasLabel();

  document.getElementById('pj-tgl-pinjam').value = todayISO();
  document.getElementById('pj-tgl-pinjam').min = todayISO();
  document.getElementById('pj-tgl-kembali').min = todayISO();
  try{
    assetsCache = await guard(api.getAssets());
  }catch(e){ assetsCache = []; }
  formItems = [{rowId:'row'+(++rowCounter), asetId:'', customNama:'', jumlah:1}];
  renderItemRows();
  switchPeminjamanTab(currentPeminjamanTab);
}

function updateIdentitasLabel(){
  const kategori = document.getElementById('pj-kategori').value;
  document.getElementById('pj-identitas-label').textContent = kategori==='Mahasiswa' ? 'NIM' : 'NIP';
}
document.getElementById('pj-kategori').addEventListener('change', updateIdentitasLabel);

function restrictInputChars(el, allowedRegex){
  el.addEventListener('input', function(){
    const cleaned = el.value.split('').filter(ch=>allowedRegex.test(ch)).join('');
    if(cleaned !== el.value) el.value = cleaned;
  });
}
restrictInputChars(document.getElementById('pj-nama'), /[A-Za-zÀ-ÿ\s.,'-]/);
restrictInputChars(document.getElementById('pj-identitas'), /[0-9]/);
restrictInputChars(document.getElementById('pj-kontak'), /[0-9]/);

function renderItemRows(){
  const availAssets = assetsCache.filter(a=>a.jumlah_tersedia>0 && a.status_admin!=='Maintenance').sort((a,b)=>a.nama.localeCompare(b.nama));
  const container = document.getElementById('item-rows');
  container.innerHTML = formItems.map(row=>{
    const opts = availAssets.map(a=>'<option value="'+a.id+'" '+(String(row.asetId)===String(a.id)?'selected':'')+'>'+escapeHtml(a.nama)+' (tersedia: '+a.jumlah_tersedia+')</option>').join('');
    const isCustom = row.asetId==='__custom__';
    return '<div class="item-row-group">'+
      '<div class="item-row">'+
        '<select onchange="updateItemRow(\''+row.rowId+'\',\'asetId\',this.value)">'+
          '<option value="">— Pilih barang terdaftar —</option>'+
          opts+
          '<option value="__custom__" '+(isCustom?'selected':'')+'>✏️ Barang tidak terdaftar (ketik manual)</option>'+
        '</select>'+
        '<input type="number" min="1" value="'+row.jumlah+'" onchange="updateItemRow(\''+row.rowId+'\',\'jumlah\',this.value)">'+
        '<button type="button" class="row-remove" onclick="removeItemRow(\''+row.rowId+'\')">'+ICONS.x.replace('icon','icon-sm')+'</button>'+
      '</div>'+
      (isCustom ? '<input type="text" class="custom-nama-input" placeholder="Ketik nama barang yang tidak terdaftar..." value="'+escapeHtml(row.customNama||'')+'" oninput="updateItemRow(\''+row.rowId+'\',\'customNama\',this.value)">' : '')+
    '</div>';
  }).join('');
  if(!availAssets.length){
    container.innerHTML = '<p class="hint" style="margin-bottom:8px;">Tidak ada aset terdaftar yang tersedia saat ini — kamu tetap bisa meminjam barang tidak terdaftar lewat opsi di dropdown.</p>' + container.innerHTML;
  }
}
function addItemRow(){ formItems.push({rowId:'row'+(++rowCounter), asetId:'', customNama:'', jumlah:1}); renderItemRows(); }
function removeItemRow(rowId){
  if(formItems.length<=1){ toast('Minimal harus ada satu baris barang.', 'error'); return; }
  formItems = formItems.filter(r=>r.rowId!==rowId);
  renderItemRows();
}
function updateItemRow(rowId, field, value){
  const r = formItems.find(x=>x.rowId===rowId);
  if(!r) return;
  r[field] = field==='jumlah' ? (parseInt(value,10)||1) : value;
  if(field==='asetId') renderItemRows();
}

document.getElementById('peminjaman-form').addEventListener('submit', submitPeminjaman);
async function submitPeminjaman(e){
  e.preventDefault();
  const errBox = document.getElementById('pj-form-error');
  errBox.style.display='none';

  const nama = document.getElementById('pj-nama').value.trim();
  const kategori = document.getElementById('pj-kategori').value;
  const identitas = document.getElementById('pj-identitas').value.trim();
  const kontak = document.getElementById('pj-kontak').value.trim();
  const tglPinjam = document.getElementById('pj-tgl-pinjam').value;
  const tglKembali = document.getElementById('pj-tgl-kembali').value;
  const keperluan = document.getElementById('pj-keperluan').value.trim();

  if(!nama||!identitas||!kontak||!tglPinjam||!tglKembali||!keperluan){
    errBox.textContent='Mohon lengkapi seluruh data peminjam terlebih dahulu.'; errBox.style.display='block'; return;
  }
  if(tglKembali < tglPinjam){
    errBox.textContent='Rencana tanggal kembali tidak boleh sebelum tanggal pinjam.'; errBox.style.display='block'; return;
  }
  const validItems = [];
  for(const r of formItems){
    if(!r.asetId || !(r.jumlah>0)) continue;
    if(r.asetId==='__custom__'){
      const nm = (r.customNama||'').trim();
      if(!nm) continue;
      validItems.push({nama: nm, jumlah: Number(r.jumlah)});
    }else{
      validItems.push({asset_id: Number(r.asetId), jumlah: Number(r.jumlah)});
    }
  }
  if(!validItems.length){
    errBox.textContent='Pilih atau isi minimal satu barang untuk dipinjam.'; errBox.style.display='block'; return;
  }

  let created;
  try{
    created = await api.createLoan({
      nama_peminjam: nama, kategori_peminjam: kategori, identitas_peminjam: identitas, kontak,
      tanggal_pinjam: tglPinjam, tanggal_rencana_kembali: tglKembali, keperluan,
      items: validItems
    });
  }catch(err){
    if(err.status===401){ toast('Sesi berakhir, silakan login kembali.', 'error'); logout(); return; }
    errBox.textContent = err.message; errBox.style.display='block'; return;
  }

  toast('Pengajuan peminjaman berhasil dibuat.', 'success');
  openPrintModal(created);
  await renderPeminjamanView();
}

async function renderLoanTable(){
  const tbody = document.getElementById('loan-table-body');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Memuat data...</td></tr>';
  let rows;
  try{ rows = await guard(api.getLoans()); }catch(e){ return; }
  window.__loansCache = rows;
  filterAndRenderLoanTable();
}
document.getElementById('loan-search').addEventListener('input', filterAndRenderLoanTable);
document.getElementById('loan-filter-status').addEventListener('change', filterAndRenderLoanTable);

function filterAndRenderLoanTable(){
  const rows0 = window.__loansCache || [];
  const q = document.getElementById('loan-search').value.trim().toLowerCase();
  const fs = document.getElementById('loan-filter-status').value;
  const rows = rows0.filter(l=>{
    if(q && !(l.kode.toLowerCase().includes(q) || l.nama_peminjam.toLowerCase().includes(q))) return false;
    if(fs && l.status_label!==fs) return false;
    return true;
  });
  const tbody = document.getElementById('loan-table-body');
  if(!rows.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Belum ada data peminjaman.</td></tr>'; return; }
  tbody.innerHTML = rows.map(l=>{
    const itemSummary = l.items.map(it=>it.nama_snapshot+' ×'+it.jumlah).join(', ');
    return '<tr>'+
      '<td class="cell-code">'+l.kode+'</td>'+
      '<td>'+escapeHtml(l.nama_peminjam)+'</td>'+
      '<td>'+escapeHtml(l.kategori_peminjam)+'</td>'+
      '<td>'+fmtTanggal(l.tanggal_pinjam)+'</td>'+
      '<td>'+fmtTanggal(l.tanggal_rencana_kembali)+'</td>'+
      '<td style="max-width:220px;font-size:12.5px;" class="muted">'+escapeHtml(itemSummary)+'</td>'+
      '<td><span class="badge '+statusBadgeClass(l.status_label)+'"><span class="dot"></span>'+l.status_label+'</span></td>'+
      '<td><button class="btn btn-ghost btn-sm" onclick="reprintLoan('+l.id+')">'+ICONS.printer+'</button></td>'+
    '</tr>';
  }).join('');
}

/* =====================PENGEMBALIAN======================= */
async function renderPengembalianView(){
  const isAdmin = session.role==='admin';
  const pendingSection = document.getElementById('pengembalian-pending-section');
  const aktifTitle = document.getElementById('pengembalian-aktif-title');

  const tbody = document.getElementById('return-table-body');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Memuat data...</td></tr>';
  let all;
  try{ all = await guard(api.getLoans()); }catch(e){ return; }

  if(isAdmin){
    pendingSection.classList.remove('hidden');
    const pending = all.filter(l=>l.status==='Menunggu Konfirmasi').sort((a,b)=>(b.tanggal_kembali_aktual||'').localeCompare(a.tanggal_kembali_aktual||''));
    const pendingBody = document.getElementById('pending-return-body');
    if(!pending.length){
      pendingBody.innerHTML = '<tr class="empty-row"><td colspan="5">Tidak ada pengajuan pengembalian yang menunggu konfirmasi.</td></tr>';
    }else{
      pendingBody.innerHTML = pending.map(l=>{
        const itemSummary = l.items.map(it=>escapeHtml(it.nama_snapshot)+' ×'+it.jumlah+' <span class="muted">('+(it.kondisi_kembali||'-')+')</span>').join(', ');
        return '<tr>'+
          '<td class="cell-code">'+l.kode+'</td>'+
          '<td>'+escapeHtml(l.nama_peminjam)+'</td>'+
          '<td style="max-width:280px;font-size:12.5px;">'+itemSummary+'</td>'+
          '<td>'+fmtTanggal(l.tanggal_kembali_aktual)+'</td>'+
          '<td><div class="cell-actions">'+
            '<button class="btn btn-primary btn-sm" onclick="confirmPendingReturn('+l.id+')">Konfirmasi</button>'+
            '<button class="btn btn-danger btn-sm" onclick="rejectPendingReturn('+l.id+')">Tolak</button>'+
          '</div></td>'+
        '</tr>';
      }).join('');
    }
  }else{
    pendingSection.classList.add('hidden');
  }

  aktifTitle.textContent = isAdmin ? 'Peminjaman Aktif' : 'Barang Sedang Anda Pinjam';
  const rows = all.filter(l=>l.status==='Dipinjam').sort((a,b)=>a.tanggal_rencana_kembali.localeCompare(b.tanggal_rencana_kembali));

  if(!rows.length){
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Tidak ada peminjaman aktif yang perlu dikembalikan.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(l=>{
    const itemSummary = l.items.map(it=>it.nama_snapshot+' ×'+it.jumlah).join(', ');
    return '<tr>'+
      '<td class="cell-code">'+l.kode+'</td>'+
      '<td>'+escapeHtml(l.nama_peminjam)+'</td>'+
      '<td>'+fmtTanggal(l.tanggal_pinjam)+'</td>'+
      '<td>'+fmtTanggal(l.tanggal_rencana_kembali)+'</td>'+
      '<td style="max-width:220px;font-size:12.5px;" class="muted">'+escapeHtml(itemSummary)+'</td>'+
      '<td><span class="badge '+statusBadgeClass(l.status_label)+'"><span class="dot"></span>'+l.status_label+'</span></td>'+
      '<td><button class="btn btn-accent btn-sm" onclick="openReturnModal('+l.id+')">'+ICONS.undo+' Proses</button></td>'+
    '</tr>';
  }).join('');
}

async function confirmPendingReturn(loanId){
  if(!confirm('Konfirmasi pengembalian ini? Stok aset akan diperbarui sesuai kondisi yang dilaporkan pengguna.')) return;
  let updated;
  try{ updated = await guard(api.confirmReturn(loanId)); }catch(e){ return; }
  toast('Pengembalian dikonfirmasi, stok diperbarui.', 'success');
  openPrintModal(updated);
  await renderPengembalianView();
  if(currentView==='dashboard') await renderDashboard();
}

async function rejectPendingReturn(loanId){
  if(!confirm('Tolak pengajuan pengembalian ini? Status akan kembali "Dipinjam" dan pengguna perlu mengajukan ulang.')) return;
  try{ await guard(api.rejectReturn(loanId)); }catch(e){ return; }
  toast('Pengajuan pengembalian ditolak.', 'success');
  await renderPengembalianView();
}

async function openReturnModal(loanId){
  let l;
  try{ l = await guard(api.getLoan(loanId)); }catch(e){ return; }

  const isAdmin = session.role==='admin';
  const rowsHtml = l.items.map((it,idx)=>
    '<div class="item-row" style="grid-template-columns:1fr 120px;">'+
      '<div style="font-size:13px;padding:6px 0;">'+escapeHtml(it.nama_snapshot)+' <span class="muted">×'+it.jumlah+'</span></div>'+
      '<select id="rc-'+idx+'"><option value="Baik">Baik</option><option value="Rusak">Rusak</option></select>'+
    '</div>'
  ).join('');
  const html =
    '<div class="modal-head"><h3>Proses Pengembalian</h3><button class="modal-close" onclick="closeModal()">'+ICONS.x+'</button></div>'+
    '<p class="card-sub">Kode: <b class="cell-code">'+l.kode+'</b> — Peminjam: '+escapeHtml(l.nama_peminjam)+'</p>'+
    (isAdmin ? '' : '<p class="hint">Pengajuan ini akan diperiksa dan dikonfirmasi admin lab terlebih dahulu sebelum stok tersedia diperbarui.</p>')+
    '<form id="return-form" style="margin-top:14px;">'+
      '<label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Kondisi barang saat dikembalikan</label>'+
      rowsHtml+
      '<div class="field full" style="margin-top:14px;"><label>Catatan (opsional)</label><textarea id="rc-catatan" placeholder="mis. kondisi fisik, kelengkapan, dll."></textarea></div>'+
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button>'+
      '<button type="submit" class="btn btn-primary">'+(isAdmin ? 'Konfirmasi &amp; Cetak Bukti' : 'Ajukan Pengembalian')+'</button></div>'+
    '</form>';
  openModal(html);
  document.getElementById('return-form').addEventListener('submit', function(e){ confirmReturn(e, l); });
}

async function confirmReturn(e, loan){
  e.preventDefault();
  const items = loan.items.map((it,idx)=>({
    loan_item_id: it.id,
    kondisi: document.getElementById('rc-'+idx).value
  }));
  const catatan = document.getElementById('rc-catatan').value.trim();

  let updated;
  try{ updated = await guard(api.returnLoan(loan.id, {items, catatan})); }catch(err){ return; }

  closeModal();
  if(updated.status==='Dikembalikan'){
    toast('Pengembalian berhasil diproses.', 'success');
    openPrintModal(updated);
  }else{
    toast('Pengajuan pengembalian terkirim, menunggu konfirmasi admin.', 'success');
  }
  await renderPengembalianView();
  if(currentView==='dashboard') await renderDashboard();
}

/* ===============================PRINT DOCUMENTS======================================== */
function buildPeminjamanDoc(l){
  const itemsRows = l.items.map(it=>'<tr><td>'+escapeHtml(it.nama_snapshot)+'</td><td style="text-align:center;">'+it.jumlah+'</td></tr>').join('');
  return '<div class="print-doc">'+
    '<h2>Bukti Pengajuan Peminjaman Aset Laboratorium</h2>'+
    '<div class="doc-sub">Kode: '+l.kode+' · Dicetak: '+fmtTanggal(todayISO())+'</div>'+
    '<div class="doc-meta">'+
      '<div><span>Nama Peminjam</span><br>'+escapeHtml(l.nama_peminjam)+'</div>'+
      '<div><span>Kategori</span><br>'+escapeHtml(l.kategori_peminjam)+'</div>'+
      '<div><span>NIP/NIM</span><br>'+escapeHtml(l.identitas_peminjam)+'</div>'+
      '<div><span>Kontak</span><br>'+escapeHtml(l.kontak)+'</div>'+
      '<div><span>Tanggal Pinjam</span><br>'+fmtTanggal(l.tanggal_pinjam)+'</div>'+
      '<div><span>Rencana Kembali</span><br>'+fmtTanggal(l.tanggal_rencana_kembali)+'</div>'+
      '<div style="grid-column:1/-1;"><span>Keperluan</span><br>'+escapeHtml(l.keperluan)+'</div>'+
    '</div>'+
    '<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Nama Barang</th><th style="width:80px;">Jumlah</th></tr></thead><tbody>'+itemsRows+'</tbody></table>'+
    '<div class="sign-row">'+
      '<div class="sign-box">Peminjam<div class="sign-line">'+escapeHtml(l.nama_peminjam)+'</div></div>'+
      '<div class="sign-box">PLP<div class="sign-line">&nbsp;</div></div>'+
    '</div>'+
  '</div>';
}
function buildPengembalianDoc(l){
  const itemsRows = l.items.map(it=>
    '<tr><td>'+escapeHtml(it.nama_snapshot)+'</td><td style="text-align:center;">'+it.jumlah+'</td><td style="text-align:center;">'+(it.kondisi_kembali||'-')+'</td></tr>'
  ).join('');
  return '<div class="print-doc">'+
    '<h2>Bukti Pengembalian Aset Laboratorium</h2>'+
    '<div class="doc-sub">Kode: '+l.kode+' · Dicetak: '+fmtTanggal(todayISO())+'</div>'+
    '<div class="doc-meta">'+
      '<div><span>Nama Peminjam</span><br>'+escapeHtml(l.nama_peminjam)+'</div>'+
      '<div><span>Kategori</span><br>'+escapeHtml(l.kategori_peminjam)+'</div>'+
      '<div><span>Tanggal Pinjam</span><br>'+fmtTanggal(l.tanggal_pinjam)+'</div>'+
      '<div><span>Tanggal Dikembalikan</span><br>'+fmtTanggal(l.tanggal_kembali_aktual)+'</div>'+
      (l.catatan_pengembalian ? '<div style="grid-column:1/-1;"><span>Catatan</span><br>'+escapeHtml(l.catatan_pengembalian)+'</div>' : '')+
    '</div>'+
    '<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Nama Barang</th><th style="width:80px;">Jumlah</th><th style="width:100px;">Kondisi</th></tr></thead><tbody>'+itemsRows+'</tbody></table>'+
    '<div class="sign-row">'+
      '<div class="sign-box">Yang Mengembalikan<div class="sign-line">'+escapeHtml(l.nama_peminjam)+'</div></div>'+
      '<div class="sign-box">PLP<div class="sign-line">&nbsp;</div></div>'+
    '</div>'+
  '</div>';
}
function openPrintModal(l){
  const docHtml = l.status==='Dikembalikan' ? buildPengembalianDoc(l) : buildPeminjamanDoc(l);
  document.getElementById('print-area').innerHTML = docHtml;
  openModal(
    docHtml +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button>'+
    '<button class="btn btn-primary" onclick="window.print()">'+ICONS.printer+' Cetak</button></div>',
    true
  );
}
async function reprintLoan(id){
  let l;
  try{ l = await guard(api.getLoan(id)); }catch(e){ return; }
  openPrintModal(l);
}

/* ============================USERS==================================== */
async function renderUsersView(){
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Memuat data...</td></tr>';
  let rows;
  try{ rows = await guard(api.getUsers()); }catch(e){ return; }
  rows.sort((a,b)=>a.username.localeCompare(b.username));
  usersCache = rows;
  filterAndRenderUsersTable();
}
document.getElementById('user-search').addEventListener('input', filterAndRenderUsersTable);

function filterAndRenderUsersTable(){
  const q = document.getElementById('user-search').value.trim().toLowerCase();
  const rows = usersCache.filter(u=>{
    if(!q) return true;
    return u.username.toLowerCase().includes(q) ||
           u.nama.toLowerCase().includes(q) ||
           (u.kategori||'').toLowerCase().includes(q) ||
           (u.role==='admin' ? 'admin' : 'user').includes(q);
  });
  const tbody = document.getElementById('users-table-body');
  if(!rows.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Tidak ada pengguna yang cocok dengan pencarian.</td></tr>'; return; }
  tbody.innerHTML = rows.map(u=>
    '<tr>'+
      '<td class="cell-code">'+escapeHtml(u.username)+'</td>'+
      '<td>'+escapeHtml(u.nama)+'</td>'+
      '<td><span class="badge '+(u.role==='admin'?'badge-warn':'badge-neutral')+'"><span class="dot"></span>'+(u.role==='admin'?'Admin':'User')+'</span></td>'+
      '<td>'+escapeHtml(u.kategori||'-')+'</td>'+
      '<td>'+escapeHtml(u.identitas||'-')+'</td>'+
      '<td><div class="cell-actions">'+
        '<button class="btn btn-ghost btn-sm" onclick="openUserModal('+u.id+')">'+ICONS.edit+'</button>'+
        '<button class="btn btn-danger btn-sm" onclick="deleteUser('+u.id+')">'+ICONS.trash+'</button>'+
      '</div></td>'+
    '</tr>'
  ).join('');
}

function openUserModal(id){
  const editing = !!id;
  const u = editing ? usersCache.find(x=>x.id===id) : null;
  const html =
    '<div class="modal-head"><h3>'+(editing?'Ubah Pengguna':'Tambah Pengguna')+'</h3><button class="modal-close" onclick="closeModal()">'+ICONS.x+'</button></div>'+
    '<form id="user-form">'+
      '<div class="form-grid">'+
        '<div class="field"><label>Username</label><input type="text" id="uf-username" required value="'+(u?escapeHtml(u.username):'')+'"></div>'+
        '<div class="field"><label>Kata Sandi'+(editing?' (kosongkan jika tidak diubah)':'')+'</label><input type="text" id="uf-password" '+(editing?'':'required')+' placeholder="'+(editing?'••••••••':'')+'"></div>'+
        '<div class="field full"><label>Nama Lengkap</label><input type="text" id="uf-nama" required value="'+(u?escapeHtml(u.nama):'')+'"></div>'+
        '<div class="field"><label>Role</label><select id="uf-role" onchange="toggleKategoriField()"><option value="user" '+(u&&u.role==='user'?'selected':'')+'>User</option><option value="admin" '+(u&&u.role==='admin'?'selected':'')+'>Admin</option></select></div>'+
        '<div class="field" id="uf-kategori-wrap"><label>Kategori</label><select id="uf-kategori"><option '+(u&&u.kategori==='Dosen'?'selected':'')+'>Dosen</option><option '+(u&&u.kategori==='Tendik'?'selected':'')+'>Tendik</option><option '+(u&&u.kategori==='Mahasiswa'?'selected':'')+'>Mahasiswa</option></select></div>'+
        '<div class="field full"><label>NIP / NIM</label><input type="text" id="uf-identitas" value="'+(u?escapeHtml(u.identitas||''):'')+'"></div>'+
      '</div>'+
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div>'+
    '</form>';
  openModal(html);
  toggleKategoriField();
  document.getElementById('user-form').addEventListener('submit', function(e){ saveUserForm(e, id); });
}
function toggleKategoriField(){
  const role = document.getElementById('uf-role').value;
  document.getElementById('uf-kategori-wrap').style.display = role==='admin' ? 'none' : 'block';
}
async function saveUserForm(e, id){
  e.preventDefault();
  const username = document.getElementById('uf-username').value.trim();
  const password = document.getElementById('uf-password').value;
  const nama = document.getElementById('uf-nama').value.trim();
  const role = document.getElementById('uf-role').value;
  const kategori = role==='admin' ? null : document.getElementById('uf-kategori').value;
  const identitas = document.getElementById('uf-identitas').value.trim() || '-';

  if(!username || !nama){ toast('Lengkapi data pengguna.', 'error'); return; }
  if(!id && !password){ toast('Kata sandi wajib diisi untuk pengguna baru.', 'error'); return; }

  const payload = {username, nama, role, kategori, identitas};
  if(password) payload.password = password;

  try{
    if(id) await guard(api.updateUser(id, payload));
    else await guard(api.createUser(payload));
  }catch(err){ return; }

  closeModal();
  toast('Pengguna berhasil disimpan.', 'success');
  await renderUsersView();
}
async function deleteUser(id){
  const u = usersCache.find(x=>x.id===id);
  if(!u) return;
  if(!confirm('Hapus pengguna "'+u.nama+'"?')) return;
  try{ await guard(api.deleteUser(id)); }catch(err){ return; }
  toast('Pengguna dihapus.', 'success');
  await renderUsersView();
}

/* ====================================DASHBOARD====================================== */
async function renderDashboard(){
  let data;
  try{ data = await guard(api.getDashboard(currentActivityRange)); }catch(e){ return; }

  document.getElementById('kpi-jenis').textContent = data.kpi.totalJenis;
  document.getElementById('kpi-unit').textContent = data.kpi.totalUnit;
  document.getElementById('kpi-dipinjam').textContent = data.kpi.totalDipinjam;
  document.getElementById('kpi-dipinjam-sub').textContent = data.kpi.aktifCount + ' transaksi aktif';
  document.getElementById('kpi-tersedia').textContent = data.kpi.totalTersedia;

  renderStatusChart(data.statusDist);
  renderCategoryChart(data.categoryBreakdown);
  renderActivityChart(data.activity);
  renderActiveItemsTable(data.activeItems);
}

document.querySelectorAll('#range-toggle button').forEach(btn=>{
  btn.addEventListener('click', async function(){
    document.querySelectorAll('#range-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentActivityRange = btn.dataset.range==='all' ? 'all' : parseInt(btn.dataset.range,10);
    try{
      const d2 = await guard(api.getDashboard(currentActivityRange));
      renderActivityChart(d2.activity);
    }catch(e){ /* toast sudah ditampilkan oleh guard() */ }
  });
});

function safeRenderChart(fn, label){
  try{ fn(); }
  catch(err){
    console.error('Gagal membuat grafik ' + label + ':', err);
    toast('Gagal menampilkan grafik ' + label + '.', 'error');
  }
}

function renderStatusChart(dist){
  safeRenderChart(function(){
    const ctx = document.getElementById('chart-status');
    if(charts.status) charts.status.destroy();
    charts.status = new Chart(ctx, {
      type:'doughnut',
      data:{ labels:['Tersedia','Dipinjam','Rusak/Maintenance'], datasets:[{ data:[dist.tersedia,dist.dipinjam,dist.rusak], backgroundColor:['#2F7D52','#7A5C00','#B23B2E'], borderWidth:0 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        cutout:'68%',
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{family:'IBM Plex Sans', size:11.5} } } }
      }
    });
  }, 'status ketersediaan');
}
function renderCategoryChart(categoryBreakdown){
  safeRenderChart(function(){
    const ctx = document.getElementById('chart-kategori');
    if(charts.kategori) charts.kategori.destroy();
    const rows = categoryBreakdown || [];
    charts.kategori = new Chart(ctx, {
      type:'bar',
      data:{ labels: rows.map(x=>x.kategori), datasets:[{ data: rows.map(x=>x.total), backgroundColor:'#074B88', borderRadius:5, maxBarThickness:36 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false} },
        scales:{
          x:{ ticks:{font:{family:'IBM Plex Sans', size:11}}, grid:{display:false} },
          y:{ beginAtZero:true, ticks:{stepSize:1, font:{family:'IBM Plex Mono', size:10.5}}, grid:{color:'#E6ECE8'} }
        }
      }
    });
  }, 'total barang');
}
function renderActivityChart(activity){
  safeRenderChart(function(){
    const labels = activity.dates.map(fmtTanggalPendek);
    const ctx = document.getElementById('chart-activity');
    if(charts.activity) charts.activity.destroy();
    charts.activity = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[
        { label:'Dipinjam', data: activity.dipinjam, backgroundColor:'#D4A017', borderRadius:4, maxBarThickness:16 },
        { label:'Dikembalikan', data: activity.dikembalikan, backgroundColor:'#074B88', borderRadius:4, maxBarThickness:16 }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{boxWidth:10, font:{family:'IBM Plex Sans', size:11.5}} } },
        scales:{
          x:{ ticks:{ font:{family:'IBM Plex Mono', size:10}, maxRotation:0, autoSkip:true, maxTicksLimit: 12 }, grid:{display:false} },
          y:{ beginAtZero:true, ticks:{ stepSize:1, font:{family:'IBM Plex Mono', size:10} }, grid:{color:'#E6ECE8'} }
        }
      }
    });
  }, 'aktivitas per tanggal');
}
function renderActiveItemsTable(rows){
  const tbody = document.getElementById('active-items-body');
  if(!rows || !rows.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Tidak ada barang yang sedang dipinjam.</td></tr>'; return; }
  tbody.innerHTML = rows.map(r=>
    '<tr><td>'+escapeHtml(r.nama)+'</td><td>'+r.jumlah+'</td><td>'+escapeHtml(r.nama_peminjam)+'</td><td>'+fmtTanggal(r.tanggal_pinjam)+'</td>'+
    '<td><span class="badge '+statusBadgeClass(r.status_label)+'"><span class="dot"></span>'+r.status_label+'</span></td></tr>'
  ).join('');
}

/* =====================================================================
   INIT — pulihkan sesi dari token tersimpan (jika ada) saat halaman dimuat
===================================================================== */
(async function init(){
  if(authToken){
    try{
      const resp = await api.me();
      session = resp.user;
      enterApp();
      return;
    }catch(e){
      setToken(null);
    }
  }
})();

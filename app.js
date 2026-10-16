/* LENTERA — router, kerangka halaman (shell), dan halaman masuk. */
(function () {
  'use strict';
  const { icon, esc, BRAND } = UI;
  const Pages = window.LenteraPages = window.LenteraPages || {};
  const App = window.LenteraApp = { publicConfig: null, cleanup: null };
  const DEFAULT_NOTE = 'Asesmen ini membantu kamu mengenali diri untuk merencanakan pengembangan diri. Hasilnya bukan acuan mutlak, bukan tes kecerdasan, dan tidak menentukan nilai atau kelulusan.';

  const NAV = {
    SISWA: [
      { href: '#/siswa', label: 'Beranda', icon: 'home', key: 'siswa-home' },
      { href: '#/siswa/riwayat', label: 'Riwayat', icon: 'history', key: 'siswa-history' },
      { href: '#/siswa/tentang', label: 'Tentang', icon: 'info', key: 'siswa-about' },
    ],
    GURU_BK: [
      { section: 'Ringkasan' },
      { href: '#/guru', label: 'Dashboard', icon: 'grid', key: 'guru-dash' },
      { section: 'Data' },
      { href: '#/guru/siswa', label: 'Data siswa', icon: 'users', key: 'guru-students' },
      { href: '#/guru/kelas', label: 'Analisis klasikal', icon: 'pie', key: 'guru-class' },
      { href: '#/guru/rekap', label: 'Rekapitulasi', icon: 'table', key: 'guru-recap' },
      { section: 'Asesmen' },
      { href: '#/guru/instrumen', label: 'Instrumen & analisis butir', icon: 'flask', key: 'guru-inst' },
      { href: '#/guru/tentang', label: 'Dasar & rujukan', icon: 'info', key: 'guru-about' },
      { href: '#/guru/pengaturan', label: 'Pengaturan', icon: 'sliders', key: 'guru-settings' },
    ],
  };

  const ROUTES = [
    { re: /^#\/login$/, page: 'login', public: true },
    { re: /^#\/siswa$/, page: 'siswaHome', role: 'SISWA', nav: 'siswa-home', title: 'Beranda' },
    { re: /^#\/siswa\/asesmen\/([A-Za-z0-9_-]+)$/, page: 'siswaIntro', role: 'SISWA', nav: 'siswa-home', title: 'Sebelum mulai', crumb: 'Beranda' },
    { re: /^#\/siswa\/asesmen\/([A-Za-z0-9_-]+)\/isi$/, page: 'siswaQuiz', role: 'SISWA', nav: 'siswa-home', title: 'Mengisi asesmen' },
    { re: /^#\/siswa\/hasil\/([A-Za-z0-9_-]+)$/, page: 'siswaResult', role: 'SISWA', nav: 'siswa-history', title: 'Hasil asesmen' },
    { re: /^#\/siswa\/riwayat$/, page: 'siswaHistory', role: 'SISWA', nav: 'siswa-history', title: 'Riwayat hasil' },
    { re: /^#\/siswa\/tentang$/, page: 'about', role: 'SISWA', nav: 'siswa-about', title: 'Tentang asesmen' },
    { re: /^#\/guru$/, page: 'guruDashboard', role: 'GURU_BK', nav: 'guru-dash', title: 'Dashboard Guru BK' },
    { re: /^#\/guru\/siswa$/, page: 'guruStudents', role: 'GURU_BK', nav: 'guru-students', title: 'Data siswa' },
    { re: /^#\/guru\/siswa\/([A-Za-z0-9_-]+)$/, page: 'guruStudentDetail', role: 'GURU_BK', nav: 'guru-students', title: 'Detail siswa', crumb: 'Data siswa' },
    { re: /^#\/guru\/kelas$/, page: 'guruClass', role: 'GURU_BK', nav: 'guru-class', title: 'Analisis klasikal' },
    { re: /^#\/guru\/rekap$/, page: 'guruRecap', role: 'GURU_BK', nav: 'guru-recap', title: 'Rekapitulasi & laporan' },
    { re: /^#\/guru\/instrumen$/, page: 'guruInstruments', role: 'GURU_BK', nav: 'guru-inst', title: 'Instrumen & analisis butir' },
    { re: /^#\/guru\/tentang$/, page: 'about', role: 'GURU_BK', nav: 'guru-about', title: 'Dasar & rujukan' },
    { re: /^#\/guru\/pengaturan$/, page: 'guruSettings', role: 'GURU_BK', nav: 'guru-settings', title: 'Pengaturan' },
  ];

  const home = role => (role === 'GURU_BK' ? '#/guru' : '#/siswa');

  function shell(user, route) {
    const items = NAV[user.role] || [];
    const navLinks = items.map(it => it.section ? '<div class="nav-label">' + esc(it.section) + '</div>'
      : '<a href="' + it.href + '"' + (it.key === route.nav ? ' aria-current="page"' : '') + '>' + icon(it.icon) + '<span>' + esc(it.label) + '</span></a>').join('');
    const bottom = user.role === 'SISWA' ? '<nav class="bottom-nav" aria-label="Navigasi bawah">' + items.map(it =>
      '<a href="' + it.href + '"' + (it.key === route.nav ? ' aria-current="page"' : '') + '>' + icon(it.icon) + '<span>' + esc(it.label) + '</span></a>').join('') + '</nav>' : '';
    const roleLabel = user.role === 'GURU_BK' ? (user.is_admin ? 'Guru BK, administrator' : 'Guru BK') : ('Siswa' + (user.kelas ? ' kelas ' + user.kelas : ''));
    const school = (App.publicConfig && App.publicConfig.nama_sekolah) || '';
    const app = document.getElementById('app');
    app.innerHTML =
      '<div class="shell role-' + (user.role === 'SISWA' ? 'siswa' : 'guru') + '">' +
      '<aside class="sidebar" id="sidebar" aria-label="Navigasi utama">' +
      '<div class="brand">' + BRAND + '<div><div class="brand-name">LENTERA</div><div class="brand-sub">Portal asesmen BK</div></div></div>' +
      '<nav class="nav">' + navLinks + '</nav><div class="sidebar-foot" data-school>' + esc(school) + '</div></aside>' +
      '<div class="scrim" data-scrim></div>' +
      '<div class="main"><header class="header">' +
      '<button class="btn btn-ghost icon-btn menu-btn" data-menu aria-label="Buka menu" aria-controls="sidebar">' + icon('menu') + '</button>' +
      '<div class="title">' + (route.crumb ? '<div class="crumb">' + esc(route.crumb) + '</div>' : '') + '<h1>' + esc(route.title || '') + '</h1></div>' +
      '<div class="user-chip"><div class="who"><b>' + esc(user.nama) + '</b><small>' + esc(roleLabel) + '</small></div><div class="avatar" aria-hidden="true">' + esc(UI.initials(user.nama)) + '</div></div>' +
      '<button class="btn btn-ghost icon-btn" data-logout title="Keluar" aria-label="Keluar">' + icon('logout') + '</button>' +
      '</header><main class="content" id="content" tabindex="-1"></main></div>' + bottom + '</div>';
    const sh = app.querySelector('.shell');
    app.querySelector('[data-menu]').addEventListener('click', () => sh.classList.toggle('nav-open'));
    app.querySelector('[data-scrim]').addEventListener('click', () => sh.classList.remove('nav-open'));
    app.querySelector('[data-logout]').addEventListener('click', logout);
    return app.querySelector('#content');
  }

  async function logout() {
    const ok = await UI.confirmDialog('Keluar dari LENTERA?', '<p>Jawaban yang sudah tersimpan di server tetap aman dan dapat dilanjutkan saat kamu masuk lagi. Data sementara di perangkat ini akan dihapus.</p>', 'Keluar');
    if (!ok) return;
    await doLogout();
  }
  async function doLogout(message) {
    if (typeof App.cleanup === 'function') { try { App.cleanup(); } catch (e) { /* abaikan */ } App.cleanup = null; }
    try { await API.call('auth.logout', {}, { timeout: 8000 }); } catch (e) { /* tetap keluar secara lokal */ }
    API.Session.clear();
    location.hash = '#/login';
    if (message) setTimeout(() => renderLogin(message), 0);
  }

  /* ---------- Keluar otomatis saat tidak ada aktivitas (komputer bersama) ---------- */
  const Idle = { timer: null, warn: null, modal: null };
  function idleMinutes() {
    const cfg = window.LENTERA_CONFIG || {};
    const u = API.Session.user;
    return u ? Number(u.role === 'GURU_BK' ? cfg.IDLE_MINUTES_GURU || 30 : cfg.IDLE_MINUTES_SISWA || 10) : 0;
  }
  function resetIdle() {
    clearTimeout(Idle.timer); clearTimeout(Idle.warn);
    if (Idle.modal) { Idle.modal.close(); Idle.modal = null; }
    const min = idleMinutes();
    if (!min || !API.Session.token) return;
    const ms = min * 60000, warnMs = Math.min(60000, ms / 4);
    Idle.warn = setTimeout(() => {
      Idle.modal = UI.modal({ title: 'Masih di sana?', locked: true,
        body: '<p>Demi menjaga kerahasiaan datamu, LENTERA akan keluar otomatis dalam <b data-s>' + Math.round(warnMs / 1000) + '</b> detik karena tidak ada aktivitas.</p>',
        foot: '<button class="btn btn-ghost" data-out>Keluar sekarang</button><button class="btn btn-primary" data-stay>Tetap masuk</button>' });
      let left = Math.round(warnMs / 1000);
      const tick = setInterval(() => { left--; const el = Idle.modal && Idle.modal.el.querySelector('[data-s]'); if (el) el.textContent = Math.max(0, left); if (left <= 0 || !Idle.modal) clearInterval(tick); }, 1000);
      Idle.modal.el.querySelector('[data-stay]').addEventListener('click', () => { Idle.modal.close(); Idle.modal = null; resetIdle(); });
      Idle.modal.el.querySelector('[data-out]').addEventListener('click', () => { Idle.modal.close(); Idle.modal = null; doLogout(); });
    }, ms - warnMs);
    Idle.timer = setTimeout(() => { if (Idle.modal) { Idle.modal.close(); Idle.modal = null; } doLogout('Kamu keluar otomatis karena tidak ada aktivitas. Jawaban yang sudah tersimpan tetap aman.'); }, ms);
  }
  let lastActivity = 0;
  ['click', 'keydown', 'touchstart', 'scroll'].forEach(ev => document.addEventListener(ev, () => {
    if (Idle.modal) return;
    const now = Date.now();
    if (now - lastActivity > 5000) { lastActivity = now; resetIdle(); }
  }, { passive: true, capture: true }));

  async function router() {
    if (typeof App.cleanup === 'function') { try { App.cleanup(); } catch (e) { /* abaikan */ } }
    App.cleanup = null;
    UI.destroyCharts();
    document.querySelectorAll('.modal-back').forEach(m => m.remove());
    const hash = location.hash || '';
    const user = API.Session.user;
    const route = ROUTES.find(r => r.re.test(hash));
    if (!route) { location.replace(user ? home(user.role) : '#/login'); return; }
    if (route.public) {
      if (user && API.Session.token) { location.replace(home(user.role)); return; }
      renderLogin();
      return;
    }
    if (!user || !API.Session.token) { location.replace('#/login'); return; }
    if (route.role !== user.role) { location.replace(home(user.role)); return; }
    resetIdle();
    const content = shell(user, route);
    window.scrollTo(0, 0);
    const params = hash.match(route.re).slice(1);
    try {
      const page = Pages[route.page];
      App.cleanup = page ? await page(content, params, user) : null;
    } catch (e) {
      if (e && e.code === 'SESI_TIDAK_VALID') return;
      content.innerHTML = UI.alertBox('err', esc(e && e.message ? e.message : 'Halaman gagal dimuat.')) +
        '<div style="margin-top:16px"><button class="btn btn-secondary" onclick="location.reload()">' + icon('refresh') + 'Muat ulang</button></div>';
    }
    document.title = (route.title ? route.title + ' · ' : '') + 'LENTERA';
  }

  /* ---------------- Masuk ---------------- */
  function renderLogin(message) {
    const app = document.getElementById('app');
    const pc = App.publicConfig || {};
    const notConfigured = !API.configured();
    app.innerHTML =
      '<div class="login">' +
      '<section class="login-aside" aria-label="Tentang LENTERA">' +
      '<div class="brand">' + BRAND + '<div><div class="brand-name">LENTERA</div><div class="brand-sub">Portal Asesmen Bimbingan dan Konseling</div></div></div>' +
      '<h1>Kenali dirimu, terangi langkahmu.</h1>' +
      '<p class="lead">Portal asesmen Bimbingan dan Konseling untuk mengenali kebutuhan, cara belajar, potensi, minat karier, dan kesejahteraan diri. Jawabanmu hanya dibaca olehmu dan Guru BK.</p>' +
      '<div class="instruments">' + ['Gaya belajar', 'Kebiasaan belajar', 'Kecerdasan majemuk', 'Minat karier', 'Kesiapan karier', 'Angket kebutuhan'].map(t => '<span class="chip outline plain">' + t + '</span>').join('') + '</div>' +
      '<p class="note" data-note>' + esc(pc.disclaimer || DEFAULT_NOTE) + '</p>' + UI.waves() + '</section>' +
      '<section class="login-main"><div class="login-card">' +
      '<h2>Masuk</h2><p class="lead" data-school>' + esc(pc.nama_sekolah || 'Gunakan akun yang diberikan sekolah.') + '</p>' +
      '<div class="segmented" role="tablist" aria-label="Masuk sebagai">' +
      '<button role="tab" aria-selected="true" data-role="SISWA">Siswa</button><button role="tab" aria-selected="false" data-role="GURU_BK">Guru BK</button></div>' +
      (notConfigured ? UI.alertBox('warn', 'Alamat backend belum diatur. Isi <b>API_URL</b> pada <code>config.js</code> dengan URL Web App Google Apps Script.') : '') +
      (message ? '<div style="margin-top:12px">' + UI.alertBox('info', esc(message)) + '</div>' : '') +
      '<form data-form novalidate style="margin-top:16px">' +
      '<label class="field"><span data-ulabel>NIS</span><input class="input" name="username" autocomplete="username" inputmode="numeric" required maxlength="40" autocapitalize="off" spellcheck="false"></label>' +
      '<label class="field"><span data-plabel>PIN</span><input class="input secret" name="password" type="password" autocomplete="current-password" inputmode="numeric" required maxlength="128">' +
      '<small class="hint" data-phint>PIN 6 digit dari Guru BK. Isinya tersamar dan tidak ditampilkan di layar.</small></label>' +
      '<div data-err style="margin-top:14px"></div>' +
      '<button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" type="submit"' + (notConfigured ? ' disabled' : '') + '>Masuk</button></form>' +
      '<p class="login-foot" data-foot>Belum punya PIN atau lupa PIN? Hubungi Guru BK sekolahmu.</p>' +
      '</div></section></div>';
    let role = 'SISWA';
    const form = app.querySelector('[data-form]');
    app.querySelectorAll('[data-role]').forEach(b => b.addEventListener('click', () => {
      role = b.dataset.role;
      app.querySelectorAll('[data-role]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      const guru = role === 'GURU_BK';
      app.querySelector('[data-ulabel]').textContent = guru ? 'Username' : 'NIS';
      app.querySelector('[data-plabel]').textContent = guru ? 'Kata sandi' : 'PIN';
      app.querySelector('[data-phint]').textContent = guru ? 'Kata sandi tersamar dan tidak ditampilkan di layar.' : 'PIN 6 digit dari Guru BK. Isinya tersamar dan tidak ditampilkan di layar.';
      form.username.setAttribute('inputmode', guru ? 'text' : 'numeric');
      form.password.setAttribute('inputmode', guru ? 'text' : 'numeric');
      form.password.value = '';
      app.querySelector('[data-foot]').textContent = guru ? 'Lupa kata sandi? Hubungi Guru BK administrator.' : 'Belum punya PIN atau lupa PIN? Hubungi Guru BK sekolahmu.';
      form.username.focus();
    }));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      const errBox = form.querySelector('[data-err]');
      errBox.innerHTML = '';
      const username = form.username.value.trim(), password = form.password.value;
      if (!username || !password) { errBox.innerHTML = UI.alertBox('err', role === 'SISWA' ? 'Isi NIS dan PIN.' : 'Isi username dan kata sandi.'); return; }
      UI.busy(btn, true, 'Memeriksa…');
      try {
        const data = await API.call('auth.login', { role: role, username: username, password: password }, { noAuth: true });
        form.password.value = '';
        API.Session.clear();   // bersihkan sisa data pengguna sebelumnya di perangkat bersama
        API.Session.set(data.token, data.user);
        location.hash = home(data.user.role);
      } catch (err) {
        errBox.innerHTML = UI.alertBox('err', esc(err.message));
        form.password.value = '';
        form.password.focus();
      } finally { UI.busy(btn, false); }
    });
    form.username.focus();
  }

  async function loadPublicConfig() {
    if (!API.configured()) return;
    try {
      App.publicConfig = await API.call('public.config', {}, { noAuth: true, timeout: 15000 });
      const env = App.publicConfig.env;
      if (env && env !== 'PRODUCTION') {
        document.getElementById('env-banner').innerHTML = '<div class="env-banner">Mode uji lokal: semua data di layar ini adalah data contoh, bukan data siswa sungguhan.</div>';
      }
      document.querySelectorAll('[data-school]').forEach(s => { if (App.publicConfig.nama_sekolah) s.textContent = App.publicConfig.nama_sekolah; });
      const n = document.querySelector('[data-note]');
      if (n && App.publicConfig.disclaimer) n.textContent = App.publicConfig.disclaimer;
    } catch (e) { /* tidak fatal */ }
  }

  window.addEventListener('lentera:session-expired', e => {
    if (location.hash !== '#/login') location.hash = '#/login';
    setTimeout(() => renderLogin(e.detail || 'Sesi berakhir. Silakan masuk kembali.'), 0);
  });
  window.addEventListener('hashchange', router);
  document.addEventListener('DOMContentLoaded', () => {
    UI.chartDefaults();
    loadPublicConfig();
    if (!location.hash) location.replace('#/login');
    router();
  });
})();

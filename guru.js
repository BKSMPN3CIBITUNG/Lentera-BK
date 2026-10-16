/* LENTERA — halaman Guru BK: dashboard, data siswa, detail, analisis klasikal, rekap, instrumen, pengaturan. */
(function () {
  'use strict';
  const { icon, esc, fmtNum, fmtPct, fmtIdx, fmtDate } = UI;
  const Pages = window.LenteraPages = window.LenteraPages || {};
  const FKEY = 'lentera_guru_filters_v3';

  const Filters = {
    get() { try { return JSON.parse(sessionStorage.getItem(FKEY) || '{}'); } catch (e) { return {}; } },
    set(f) { try { sessionStorage.setItem(FKEY, JSON.stringify(f)); } catch (e) { /* abaikan */ } },
  };
  const CLASS_KEY = 'lentera_class_kelas';
  const ownKelas = {
    get() { try { return sessionStorage.getItem(CLASS_KEY) || ''; } catch (e) { return ''; } },
    set(v) { try { sessionStorage.setItem(CLASS_KEY, v); } catch (e) { /* abaikan */ } },
  };

  function instSwitch(d) {
    if (!d.options.instrumen.length) return '';
    return '<div class="inst-switch" role="group" aria-label="Pilih instrumen" data-inst>' + d.options.instrumen.map(i =>
      '<button type="button" data-i="' + esc(i.instrument_id) + '" aria-pressed="' + (i.instrument_id === d.applied.instrument_id) + '">' + esc(i.nama_singkat) + '</button>').join('') + '</div>';
  }

  function filterBar(d, opts) {
    opts = opts || {};
    const a = d.applied, o = d.options;
    const periods = o.periods.filter(p => p.tahun_ajaran === a.tahun_ajaran);
    const sel = (name, label, options, value, allLabel) =>
      '<label class="field"><span>' + esc(label) + '</span><select class="select" name="' + name + '">' + (allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '') +
      options.map(x => '<option value="' + esc(x.v) + '"' + (String(x.v) === String(value) ? ' selected' : '') + '>' + esc(x.l) + '</option>').join('') + '</select></label>';
    const kelasOpts = o.kelas.filter(k => !a.tingkat || k.tingkat === a.tingkat).map(k => ({ v: k.nama_kelas, l: k.nama_kelas }));
    return '<form class="card filters" data-filters>' +
      sel('tahun_ajaran', 'Tahun ajaran', o.tahun_ajaran.map(t => ({ v: t, l: t })), a.tahun_ajaran) +
      sel('assessment_period_id', 'Periode asesmen', periods.map(p => ({ v: p.assessment_period_id, l: p.nama_periode })), a.period ? a.period.assessment_period_id : '', periods.length ? null : '(belum ada periode)') +
      sel('tingkat', 'Tingkat', o.tingkat.map(t => ({ v: t, l: 'Tingkat ' + t })), a.tingkat, 'Semua tingkat') +
      sel('kelas', 'Kelas', kelasOpts, a.kelas, opts.requireKelas ? null : 'Semua kelas') +
      (opts.noStatus ? '<span></span>' : sel('status', 'Status pengisian', [{ v: 'SUDAH', l: 'Sudah mengisi' }, { v: 'BELUM', l: 'Belum mengisi' }, { v: 'SEDANG', l: 'Sedang mengerjakan' }], a.status, 'Semua status')) +
      '<button type="button" class="btn btn-secondary" data-reset title="Atur ulang filter">' + icon('refresh') + '<span class="hide-sm">Atur ulang</span></button></form>';
  }

  function bindFilters(root, onChange, opts) {
    opts = opts || {};
    const sw = root.querySelector('[data-inst]');
    if (sw) sw.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const f = Filters.get(); f.instrument_id = b.dataset.i; Filters.set(f); onChange();
    });
    const form = root.querySelector('[data-filters]');
    if (!form) return;
    form.addEventListener('change', e => {
      const f = Filters.get();
      const n = e.target.name;
      if (n === 'kelas' && opts.ownKelas) { ownKelas.set(e.target.value); onChange(); return; }
      f[n] = e.target.value;
      if (n === 'tahun_ajaran') { f.assessment_period_id = ''; f.kelas = ''; f.tingkat = ''; f.instrument_id = ''; if (opts.ownKelas) ownKelas.set(''); }
      if (n === 'assessment_period_id') f.instrument_id = '';
      if (n === 'tingkat') { f.kelas = ''; if (opts.ownKelas) ownKelas.set(''); }
      Filters.set(f);
      onChange();
    });
    form.querySelector('[data-reset]').addEventListener('click', () => { Filters.set({}); if (opts.ownKelas) ownKelas.set(''); onChange(); });
  }

  async function loadDash(extra) {
    const f = Object.assign({}, Filters.get(), extra || {});
    try { return await API.call('guru.dashboard', { filters: f }); }
    catch (e) {
      if (e.code === 'VALIDASI' && (f.instrument_id || f.assessment_period_id)) { Filters.set({}); return API.call('guru.dashboard', { filters: {} }); }
      throw e;
    }
  }

  const warningsHtml = d => d.warnings.length ? '<div class="stack-sm" style="margin-bottom:16px">' + d.warnings.map(w => UI.alertBox('warn', esc(w))).join('') + '</div>' : '';

  function statTiles(d) {
    const s = d.summary;
    const tile = (label, val, sub, extra, cls) => '<div class="card stat ' + (cls || '') + '"><div class="lbl">' + esc(label) + '</div><div class="val">' + val + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + (extra || '') + '</div>';
    return '<div class="grid grid-4">' +
      tile('Siswa terdaftar', fmtNum(s.total), 'student_id unik, status aktif') +
      tile('Sudah mengisi ' + d.instrumen.nama_singkat, fmtNum(s.sudah), 'hasil final yang valid') +
      tile('Belum mengisi', fmtNum(s.belum), s.sedang ? fmtNum(s.sedang) + ' sedang mengerjakan' : '&nbsp;') +
      tile('Penyelesaian', fmtPct(s.persen_selesai), fmtNum(s.lengkap || 0) + ' siswa menyelesaikan semua instrumen', '<div class="progress" style="margin-top:10px"><i style="width:' + s.persen_selesai + '%"></i></div>', 'accent') +
      '</div>';
  }

  function periodLine(d) {
    const p = d.applied.period;
    return p ? '<span class="chip gold plain">' + esc(p.nama_periode) + '</span><span class="small muted">' + fmtDate(p.tanggal_mulai, false, true) + ' sampai ' + fmtDate(p.tanggal_selesai, false, true) + ', TA ' + esc(d.applied.tahun_ajaran) + '</span>'
      : '<span class="chip no">Belum ada periode</span>';
  }

  function studentRow(s) {
    return '<tr class="clickable" data-id="' + esc(s.student_id) + '"><td class="num">' + esc(s.nis) + '</td><td><b>' + esc(s.nama_siswa) + '</b></td><td>' + esc(s.kelas) + '</td>' +
      '<td>' + UI.statusChip(s.status_pengisian) + '</td><td>' + UI.resultChip(s.result) + '</td><td class="num small">' + s.instrumen_selesai + ' dari ' + s.instrumen_total + '</td>' +
      '<td class="r"><a class="btn btn-ghost btn-sm" href="#/guru/siswa/' + esc(s.student_id) + '">Detail' + icon('right') + '</a></td></tr>';
  }
  const STUDENT_HEAD = [{ label: 'NIS' }, { label: 'Nama siswa' }, { label: 'Kelas' }, { label: 'Status' }, { label: 'Hasil' }, { label: 'Instrumen selesai' }, { label: '', cls: 'r' }];
  const goStudent = id => { location.hash = '#/guru/siswa/' + id; };

  /** Rata-rata kelompok: radar untuk metode PROFIL, batang untuk DOMINAN. */
  function averageBlock(d, s, key) {
    if (!s.sudah) return '<p class="muted">Belum ada data.</p>';
    if (!hasScores(d)) return '<p class="muted">Instrumen ini tidak menghasilkan skor. Lihat Analisis klasikal.</p>';
    if (d.instrumen.metode_skor === 'PROFIL' || d.instrumen.metode_skor === 'SKRINING') return '<div class="chart-box sm"><canvas data-avg="' + key + '" role="img" aria-label="Rata-rata profil"></canvas></div>';
    return UI.barsHtml(d.instrumen.dimensi.map(x => ({ label: x.nama, value: s.rata_persentase[x.kode], color: x.warna, text: fmtPct(s.rata_persentase[x.kode]) })));
  }
  const hasScores = d => ['SOSIOMETRI', 'DATA'].indexOf(d.instrumen.metode_skor) < 0;
  function followUpNote(d, s) {
    if (!s.perhatian) return '';
    return '<div style="margin-top:16px">' + UI.alertBox('warn', '<b>' + s.perhatian + ' siswa perlu tindak lanjut</b> pada ' + esc(d.instrumen.nama) +
      '. Lihat daftarnya di <a href="#/guru/kelas">Analisis klasikal</a>. Data ini rahasia; tindak lanjuti secara pribadi.') + '</div>';
  }
  function drawAverage(root, d, s, key) {
    const c = root.querySelector('[data-avg="' + key + '"]');
    if (c) UI.radar(c, d.instrumen.dimensi.map(x => ({ nama: x.nama, persen: s.rata_persentase[x.kode], teratas: false })));
  }

  /* ======================= DASHBOARD ======================= */
  Pages.guruDashboard = async function (el) {
    const render = async () => {
      UI.destroyCharts();
      el.innerHTML = UI.skeleton(4);
      const d = await loadDash();
      const s = d.summary;
      const isProfil = d.instrumen.metode_skor === 'PROFIL';
      el.innerHTML =
        '<div class="page-head"><div><div class="row">' + periodLine(d) + '</div><p>Angka dihitung langsung dari Google Sheets, diperbarui ' + fmtDate(d.generated_at, true) + '.</p></div>' +
        '<button class="btn btn-secondary" data-refresh>' + icon('refresh') + 'Muat ulang data</button></div>' +
        '<div style="margin-bottom:14px">' + instSwitch(d) + '</div>' + filterBar(d) + '<div style="height:20px"></div>' + warningsHtml(d) +
        (s.total === 0 ? '<div class="card">' + UI.emptyState('users', 'Belum ada data siswa', 'Belum ada siswa aktif untuk filter ini. Tambahkan atau impor siswa di menu Data siswa.', '<a class="btn btn-primary" href="#/guru/siswa">' + icon('plus') + 'Kelola data siswa</a>') + '</div>'
          : statTiles(d) + followUpNote(d, s) +
          '<div class="grid grid-main" style="margin-top:20px">' +
          '<section class="card"><div class="card-head"><h2>Penyelesaian per kelas</h2><span class="small muted">' + esc(d.instrumen.nama_singkat) + '</span></div><div class="card-body"><div class="chart-box"><canvas data-kelas-chart aria-label="Grafik penyelesaian per kelas" role="img"></canvas></div></div></section>' +
          '<section class="card"><div class="card-head"><h2>' + distTitle(d) + '</h2><span class="small muted">' + fmtNum(s.sudah) + ' siswa</span></div><div class="card-body">' +
          (!d.instrumen.kelompok.length ? '<p class="muted">Instrumen ini tidak memiliki sebaran hasil. Lihat Analisis klasikal untuk ' + (d.instrumen.metode_skor === 'SOSIOMETRI' ? 'sosiogram kelas' : 'tabel data diri') + '.</p>'
            : s.sudah ? '<div class="chart-box sm"><canvas data-dist aria-label="Sebaran hasil" role="img"></canvas></div>' + UI.legendHtml(d.instrumen.kelompok, s.distribusi, s.sudah)
            : UI.emptyState('pie', 'Belum ada hasil', 'Sebaran muncul setelah siswa mengirim jawaban.')) + '</div></section></div>' +
          '<div class="grid grid-2" style="margin-top:20px">' +
          '<section class="card"><div class="card-head"><h2>Rekapitulasi per tingkat</h2></div>' + groupTable(d.per_tingkat, 'Tingkat') + '</section>' +
          '<section class="card"><div class="card-head"><h2>Rata-rata ' + (isProfil ? 'profil' : d.instrumen.metode_skor === 'CEKLIS' ? 'persentase ditandai' : 'per aspek') + '</h2><span class="small muted">siswa yang sudah mengisi</span></div><div class="card-body">' + averageBlock(d, s, 'all') + '</div></section></div>' +
          '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Daftar siswa menurut status</h2>' +
          '<div class="tabs" role="tablist" style="margin:0;border:0">' + [['BELUM', 'Belum mulai (' + (s.belum - s.sedang) + ')'], ['SEDANG', 'Sedang (' + s.sedang + ')'], ['SUDAH', 'Sudah (' + s.sudah + ')'], ['', 'Semua (' + s.total + ')']].map((t, i) =>
            '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + t[1] + '</button>').join('') + '</div></div><div data-list></div></section>');
      el.querySelector('[data-refresh]').addEventListener('click', render);
      bindFilters(el, render);
      if (!s.total) return;
      UI.chart(el.querySelector('[data-kelas-chart]'), {
        type: 'bar',
        data: { labels: d.per_kelas.map(k => k.key), datasets: [{ label: '% selesai', data: d.per_kelas.map(k => k.persen_selesai), backgroundColor: '#C6A04A', borderRadius: 6, maxBarThickness: 38 }] },
        options: { scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } },
          plugins: { tooltip: { callbacks: { label: c => { const k = d.per_kelas[c.dataIndex]; return ' ' + fmtPct(k.persen_selesai) + ' (' + k.sudah + ' dari ' + k.total + ' siswa)'; } } } } },
      });
      if (s.sudah && d.instrumen.kelompok.length) UI.doughnut(el.querySelector('[data-dist]'), d.instrumen.kelompok, s.distribusi);
      drawAverage(el, d, s, 'all');
      const list = el.querySelector('[data-list]');
      const show = status => UI.pagedTable(list, {
        rows: d.students.filter(x => !status || x.status_pengisian === status),
        head: STUDENT_HEAD, row: studentRow, searchKeys: ['nama_siswa', 'nis', 'kelas'], searchPlaceholder: 'Cari nama, NIS, atau kelas…',
        emptyTitle: 'Tidak ada siswa', emptyText: 'Tidak ada siswa dengan status ini pada filter terpilih.', onClick: goStudent,
      });
      el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
        el.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
        show(b.dataset.tab);
      }));
      show('BELUM');
    };
    await render();
    return null;
  };

  function distTitle(d) {
    const m = d.instrumen.metode_skor;
    return m === 'PROFIL' ? 'Sebaran dimensi teratas' : m === 'CEKLIS' ? 'Bidang yang paling banyak ditandai' : m === 'SKRINING' ? 'Hasil skrining' : m === 'DOMINAN' ? 'Sebaran gaya belajar' : 'Sebaran hasil';
  }

  function groupTable(groups, label) {
    if (!groups.length) return '<div class="card-body"><p class="muted">Belum ada data.</p></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(label) + '</th><th class="r">Siswa</th><th class="r">Sudah</th><th class="r">Belum</th><th style="min-width:150px">Penyelesaian</th></tr></thead><tbody>' +
      groups.map(g => '<tr><td><b>' + esc(g.key) + '</b></td><td class="r num">' + fmtNum(g.total) + '</td><td class="r num">' + fmtNum(g.sudah) + '</td><td class="r num">' + fmtNum(g.belum) + '</td>' +
        '<td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="progress grow"><i style="width:' + g.persen_selesai + '%"></i></div><span class="small num">' + fmtPct(g.persen_selesai) + '</span></div></td></tr>').join('') +
      '</tbody></table></div>';
  }

  /* ======================= DATA SISWA ======================= */
  let classCache = null;
  async function classes(force) {
    if (!classCache || force) classCache = await API.call('guru.listClasses');
    return classCache;
  }

  Pages.guruStudents = async function (el) {
    const render = async () => {
      el.innerHTML = UI.skeleton(3);
      const [d, list] = await Promise.all([loadDash(), API.call('guru.listStudents', { filters: Filters.get() })]);
      let rows = list.students;
      const fs = Filters.get().status;
      if (fs) rows = rows.filter(r => fs === 'BELUM' ? r.status_pengisian !== 'SUDAH' : r.status_pengisian === fs);
      el.innerHTML =
        '<div class="page-head"><div><h2>Data siswa</h2><p>Satu siswa memiliki satu ID permanen. Pindah kelas memperbarui data yang sama.</p></div>' +
        '<div class="row"><button class="btn btn-secondary" data-import>' + icon('upload') + 'Impor CSV</button>' +
        '<button class="btn btn-secondary" data-pins>' + icon('key') + 'Buat PIN' + (list.tanpa_pin ? ' (' + list.tanpa_pin + ')' : '') + '</button>' +
        '<button class="btn btn-primary" data-add>' + icon('plus') + 'Tambah siswa</button></div></div>' +
        filterBar(d) + '<div style="height:18px"></div>' +
        (list.tanpa_pin ? '<div style="margin-bottom:16px">' + UI.alertBox('info', '<b>' + list.tanpa_pin + ' siswa aktif belum memiliki PIN.</b> Siswa tanpa PIN belum dapat masuk. Gunakan tombol <b>Buat PIN</b>.') + '</div>' : '') +
        '<section class="card"><div data-table></div></section>';
      UI.pagedTable(el.querySelector('[data-table]'), {
        rows: rows,
        head: [{ label: 'NIS' }, { label: 'Nama siswa' }, { label: 'Kelas' }, { label: 'Akun' }, { label: 'Asesmen periode ini' }, { label: '', cls: 'r' }],
        row: s => '<tr class="clickable" data-id="' + esc(s.student_id) + '"><td class="num">' + esc(s.nis) + '</td><td><b>' + esc(s.nama_siswa) + '</b>' +
          (s.status_akun !== 'AKTIF' ? ' <span class="chip no plain">' + esc(s.status_akun) + '</span>' : '') + '</td><td>' + esc(s.kelas) + '</td>' +
          '<td>' + (s.akun_terkunci ? '<span class="chip err">Terkunci</span>' : s.punya_pin ? '<span class="chip ok">PIN aktif</span>' : '<span class="chip warn">Belum ada PIN</span>') + '</td>' +
          '<td>' + UI.statusChip(s.status_pengisian) + ' <span class="small muted num">' + s.instrumen_selesai + ' dari ' + s.instrumen_total + '</span></td>' +
          '<td class="r nowrap"><button class="btn btn-ghost btn-sm" data-edit="' + esc(s.student_id) + '">' + icon('edit') + 'Ubah</button></td></tr>',
        searchKeys: ['nama_siswa', 'nis', 'kelas', 'nisn'], searchPlaceholder: 'Cari nama, NIS, NISN, atau kelas…',
        emptyTitle: 'Belum ada siswa', emptyText: 'Tambahkan siswa satu per satu atau impor dari CSV.', onClick: goStudent,
      });
      el.querySelector('[data-table]').addEventListener('click', e => {
        const b = e.target.closest('[data-edit]');
        if (b) studentForm(list.students.find(s => s.student_id === b.dataset.edit), render);
      });
      el.querySelector('[data-add]').addEventListener('click', () => studentForm(null, render, list.tahun_ajaran));
      el.querySelector('[data-import]').addEventListener('click', () => importDialog(render, list.tahun_ajaran));
      el.querySelector('[data-pins]').addEventListener('click', () => generatePinsDialog(render));
      bindFilters(el, render);
    };
    await render();
    return null;
  };

  async function studentForm(s, onSaved, tahunDefault) {
    const cls = await classes(true);
    const tahun = s ? s.tahun_ajaran : (tahunDefault || (cls[0] && cls[0].tahun_ajaran) || '');
    const years = Array.from(new Set(cls.map(c => c.tahun_ajaran).concat([tahun]))).filter(Boolean).sort().reverse();
    const kelasOptions = t => cls.filter(c => c.tahun_ajaran === t && c.status !== 'NONAKTIF').map(c => '<option value="' + esc(c.nama_kelas) + '"' + (s && s.kelas === c.nama_kelas ? ' selected' : '') + '>' + esc(c.nama_kelas) + ' (tingkat ' + esc(c.tingkat) + ')</option>').join('');
    const m = UI.modal({
      title: s ? 'Ubah data siswa' : 'Tambah siswa',
      body: '<form data-f class="form-grid" novalidate>' +
        '<label class="field"><span>NIS</span><input class="input" name="nis" required maxlength="20" inputmode="numeric" value="' + esc(s ? s.nis : '') + '"></label>' +
        '<label class="field"><span>NISN <small class="muted">(opsional)</small></span><input class="input" name="nisn" maxlength="10" inputmode="numeric" value="' + esc(s ? s.nisn : '') + '"></label>' +
        '<label class="field span-2"><span>Nama lengkap</span><input class="input" name="nama_siswa" required maxlength="120" value="' + esc(s ? s.nama_siswa : '') + '"></label>' +
        '<label class="field"><span>Tahun ajaran</span><select class="select" name="tahun_ajaran">' + years.map(y => '<option' + (y === tahun ? ' selected' : '') + '>' + esc(y) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Kelas</span><select class="select" name="kelas" required>' + kelasOptions(tahun) + '</select><small class="hint">Kelas dikelola di Pengaturan → Kelas.</small></label>' +
        '<label class="field span-2"><span>Status akun</span><select class="select" name="status_akun">' + ['AKTIF', 'NONAKTIF', 'LULUS', 'PINDAH'].map(x => '<option' + (s && s.status_akun === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
        '<div class="span-2" data-err></div></form>',
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + 'Simpan</button>',
    });
    const f = m.el.querySelector('[data-f]');
    f.tahun_ajaran.addEventListener('change', () => { f.kelas.innerHTML = kelasOptions(f.tahun_ajaran.value); });
    if (!cls.length) m.el.querySelector('[data-err]').innerHTML = UI.alertBox('warn', 'Belum ada kelas. Admin perlu menambahkan kelas di Pengaturan → Kelas terlebih dahulu.');
    m.el.querySelector('[data-save]').addEventListener('click', async e => {
      const btn = e.currentTarget;
      const payload = { student_id: s ? s.student_id : '', nis: f.nis.value.trim(), nisn: f.nisn.value.trim(), nama_siswa: f.nama_siswa.value.trim(), kelas: f.kelas.value, tahun_ajaran: f.tahun_ajaran.value, status_akun: f.status_akun.value };
      UI.busy(btn, true, 'Menyimpan…');
      try {
        await API.call('guru.upsertStudent', payload);
        m.close(); UI.toast('Data siswa tersimpan.', 'ok'); onSaved();
      } catch (err) { m.el.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(btn, false); }
    });
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }

  function importDialog(onDone, tahun) {
    const m = UI.modal({
      title: 'Impor siswa dari CSV', wide: true,
      body: '<div class="stack"><p>Kolom wajib: <code>nis</code>, <code>nama_siswa</code>, <code>kelas</code>. Kolom opsional: <code>nisn</code>, <code>tahun_ajaran</code> (bawaan ' + esc(tahun) + '), <code>status_akun</code>.</p>' +
        UI.alertBox('info', 'Impor bersifat <b>upsert berdasarkan NIS</b>: NIS yang sudah terdaftar diperbarui (student_id tetap), NIS baru ditambahkan. Jika ada satu baris yang salah, <b>tidak ada data yang disimpan</b>.') +
        '<div class="row"><input type="file" accept=".csv,text/csv" data-file class="input" style="max-width:360px"><button class="btn btn-ghost btn-sm" data-tpl>' + icon('download') + 'Unduh template</button></div>' +
        '<div data-preview></div></div>',
      foot: '<button class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-primary" data-go disabled>' + icon('upload') + 'Impor</button>',
    });
    let rows = [];
    m.el.querySelector('[data-tpl]').addEventListener('click', () => {
      UI.download(new Blob(['﻿nis;nisn;nama_siswa;kelas;tahun_ajaran;status_akun\r\n260101;;Nama Siswa Contoh;7A;' + tahun + ';AKTIF\r\n'], { type: 'text/csv;charset=utf-8' }), 'template_impor_siswa.csv');
    });
    m.el.querySelector('[data-file]').addEventListener('change', async e => {
      const file = e.target.files[0];
      const prev = m.el.querySelector('[data-preview]');
      rows = [];
      if (!file) return;
      const data = parseCSV(await file.text());
      const head = (data.shift() || []).map(h => h.trim().toLowerCase());
      const miss = ['nis', 'nama_siswa', 'kelas'].filter(h => head.indexOf(h) < 0);
      if (miss.length) { prev.innerHTML = UI.alertBox('err', 'Kolom wajib tidak ditemukan: ' + esc(miss.join(', '))); m.el.querySelector('[data-go]').disabled = true; return; }
      rows = data.map(r => { const o = {}; head.forEach((h, i) => { o[h] = (r[i] || '').trim(); }); if (!o.tahun_ajaran) o.tahun_ajaran = tahun; return o; });
      prev.innerHTML = '<p><b>' + rows.length + '</b> baris siap diimpor. Pratinjau 5 baris pertama:</p><div class="table-wrap"><table class="table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Tahun</th></tr></thead><tbody>' +
        rows.slice(0, 5).map(r => '<tr><td>' + esc(r.nis) + '</td><td>' + esc(r.nama_siswa) + '</td><td>' + esc(r.kelas) + '</td><td>' + esc(r.tahun_ajaran) + '</td></tr>').join('') + '</tbody></table></div>';
      m.el.querySelector('[data-go]').disabled = !rows.length;
    });
    m.el.querySelector('[data-go]').addEventListener('click', async e => {
      const btn = e.currentTarget;
      UI.busy(btn, true, 'Mengimpor…');
      try {
        const r = await API.call('guru.importStudents', { rows: rows }, { timeout: 120000 });
        if (!r.ok) {
          m.el.querySelector('[data-preview]').innerHTML = UI.alertBox('err', '<b>Impor dibatalkan, tidak ada data yang disimpan.</b> ' + r.total_errors + ' kesalahan:<ul style="margin:6px 0 0;padding-left:18px">' + r.errors.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>');
          UI.busy(btn, false);
          return;
        }
        m.close(); UI.toast('Impor selesai: ' + r.inserted + ' siswa baru, ' + r.updated + ' diperbarui.', 'ok'); onDone();
      } catch (err) { m.el.querySelector('[data-preview]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(btn, false); }
    });
  }

  function pinSlips(list, sekolah) {
    return UI.docHeader('Slip PIN Masuk LENTERA', sekolah, ['Dicetak: ' + new Date().toLocaleString('id-ID'), 'Jumlah: ' + list.length + ' siswa']) +
      '<p style="font-size:9pt;margin-bottom:8px">Gunting dan bagikan kepada masing-masing siswa. PIN bersifat rahasia dan tidak dapat ditampilkan ulang; jika hilang, Guru BK dapat membuat PIN baru.</p>' +
      '<div class="pin-sheet">' + list.map(p => '<div class="pin-slip"><div><b style="font-size:10pt;letter-spacing:0">' + esc(p.nama_siswa) + '</b></div><div>Kelas ' + esc(p.kelas) + ' · NIS ' + esc(p.nis) + '</div><div style="margin-top:4px">PIN: <b>' + esc(p.pin) + '</b></div></div>').join('') + '</div>';
  }

  function showPins(list, title) {
    const sekolah = (window.LenteraApp.publicConfig || {}).nama_sekolah || '';
    const m = UI.modal({
      title: title, wide: true, locked: true,
      body: UI.alertBox('warn', '<b>PIN hanya ditampilkan sekali.</b> Cetak atau unduh sekarang. PIN tidak disimpan sebagai teks di server.') +
        '<div class="table-wrap" style="margin-top:14px;max-height:340px"><table class="table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>PIN</th></tr></thead><tbody>' +
        list.map(p => '<tr><td>' + esc(p.nis) + '</td><td>' + esc(p.nama_siswa) + '</td><td>' + esc(p.kelas) + '</td><td class="num"><b>' + esc(p.pin) + '</b></td></tr>').join('') + '</tbody></table></div>',
      foot: '<button class="btn btn-secondary" data-csv>' + icon('download') + 'Unduh CSV</button><button class="btn btn-secondary" data-print>' + icon('printer') + 'Cetak slip</button><button class="btn btn-primary" data-close>Saya sudah menyimpannya</button>',
    });
    m.el.querySelector('[data-print]').addEventListener('click', () => UI.printHtml(pinSlips(list, sekolah), 'Slip PIN LENTERA'));
    m.el.querySelector('[data-csv]').addEventListener('click', () => {
      const lines = ['NIS;Nama;Kelas;PIN'].concat(list.map(p => [p.nis, p.nama_siswa, p.kelas, p.pin].map(UI.csvCell).join(';')));
      UI.download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'PIN_LENTERA_RAHASIA.csv');
    });
    return m;
  }

  async function generatePinsDialog(onDone) {
    const f = Filters.get();
    const ok = await UI.confirmDialog('Buat PIN siswa', '<p>PIN 6 digit akan dibuat untuk siswa <b>aktif yang belum memiliki PIN</b> sesuai filter saat ini' +
      (f.kelas ? ' (kelas ' + esc(f.kelas) + ')' : '') + '. Siswa yang sudah memiliki PIN tidak diubah.</p>', 'Buat PIN');
    if (!ok) return;
    const prog = UI.modal({ title: 'Membuat PIN…', locked: true, body: '<div class="row"><span class="spinner"></span><span data-p>Memproses…</span></div>' });
    const all = [];
    try {
      for (let guard = 0; guard < 200; guard++) {
        const r = await API.callWithRetry('guru.generatePins', { filters: f }, { timeout: 120000 });
        all.push.apply(all, r.created);
        prog.el.querySelector('[data-p]').textContent = all.length + ' PIN dibuat, ' + r.remaining + ' tersisa…';
        if (!r.remaining || !r.created.length) break;
      }
    } catch (e) { UI.toast(e.message, 'err'); }
    prog.close();
    if (all.length) showPins(all, all.length + ' PIN siswa baru').el.addEventListener('click', e => { if (e.target.closest('[data-close]')) onDone(); });
    else { UI.toast('Tidak ada siswa yang perlu dibuatkan PIN.', 'ok'); onDone(); }
  }

  /* ======================= DETAIL SISWA ======================= */
  Pages.guruStudentDetail = async function (el, params) {
    const render = async () => {
      UI.destroyCharts();
      el.innerHTML = UI.skeleton(3);
      const d = await API.call('guru.studentDetail', { student_id: params[0] });
      const s = d.student;
      const active = d.results.filter(r => r.status_asesmen === 'FINAL');
      const meta = { sekolah: d.sekolah, kontak_bk: d.kontak_bk, student: s, disclaimer: d.disclaimer, dibuat_pada: d.generated_at };
      el.innerHTML =
        '<div class="page-head"><div class="profile"><div class="avatar">' + esc(UI.initials(s.nama_siswa)) + '</div><div><h2>' + esc(s.nama_siswa) + '</h2>' +
        '<p>NIS ' + esc(s.nis) + ', kelas ' + esc(s.kelas) + ', TA ' + esc(s.tahun_ajaran) + '</p></div></div>' +
        '<div class="row"><a class="btn btn-ghost" href="#/guru/siswa">' + icon('left') + 'Kembali</a>' +
        '<button class="btn btn-secondary" data-edit>' + icon('edit') + 'Ubah data</button>' +
        (active.some(printable) ? '<button class="btn btn-primary" data-all>' + icon('download') + 'Unduh profil (PDF)</button>' : '') + '</div></div>' +
        '<div class="grid grid-main">' +
        '<div class="stack">' +
        (active.length ? active.map((r, i) =>
          '<section class="card"><div class="card-head"><div><div class="small muted">' + esc(r.instrument_nama) + ', ' + esc(r.nama_periode) + (r.rahasia ? ' · rahasia' : '') + '</div><h2 style="font-size:1.2rem;margin-top:2px">' +
          esc(detailTitle(r)) + '</h2></div><div class="row"><span class="small muted">' + fmtDate(r.tanggal_asesmen, true, true) + '</span>' +
          (printable(r) ? '<button class="btn btn-secondary btn-sm" data-pdf="' + i + '">' + icon('download') + 'PDF</button>' : '') + '</div></div>' +
          '<div class="card-body">' + detailBody(r) +
          '<details class="more" style="margin-top:16px"><summary>Jawaban (' + (r.jawaban || []).length + ' pertanyaan)</summary><div class="table-wrap" style="margin-top:10px"><table class="table"><thead><tr><th>#</th><th>Pertanyaan</th><th>Bagian</th><th class="r">Jawaban</th></tr></thead><tbody>' +
          (r.jawaban || []).map((a, k) => '<tr><td class="num">' + (k + 1) + '</td><td>' + esc(a.teks) + '</td><td>' + esc(a.dimensi) + '</td><td class="r">' + (a.tipe === 'LIKERT' ? a.jawaban + ', ' : '') + esc(a.label) + '</td></tr>').join('') +
          '</tbody></table></div></details></div></section>').join('')
          : '<section class="card">' + UI.emptyState('file', 'Belum ada hasil asesmen', 'Siswa ini belum mengirim asesmen pada periode mana pun.') + '</section>') +
        '<section class="card"><div class="card-head"><h2>Riwayat percobaan</h2></div>' + (d.attempts.length
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>Instrumen</th><th>Ke-</th><th>Status</th><th class="r">Terjawab</th><th>Dimulai</th><th>Dikirim</th></tr></thead><tbody>' +
            d.attempts.map(a => '<tr><td><b>' + esc(a.instrumen) + '</b><div class="tiny muted">' + esc(a.nama_periode) + '</div></td><td class="num">' + a.attempt_no + '</td><td><span class="chip ' + (a.status === 'SELESAI' ? 'ok' : a.status === 'BERLANGSUNG' ? 'warn' : 'no') + '">' + esc(a.status.toLowerCase()) + '</span></td>' +
              '<td class="r num">' + a.jumlah_terjawab + '</td><td class="nowrap">' + fmtDate(a.started_at, false, true) + '</td><td class="nowrap">' + (a.submitted_at ? fmtDate(a.submitted_at, false, true) : '–') + '</td></tr>').join('') + '</tbody></table></div>'
          : '<div class="card-body"><p class="muted">Belum ada percobaan.</p></div>') + '</section>' +
        '</div><div class="stack">' +
        '<section class="card card-pad"><h3 style="margin-bottom:12px">Profil</h3><dl class="kv"><dt>NIS</dt><dd>' + esc(s.nis) + '</dd><dt>NISN</dt><dd>' + esc(s.nisn || '–') + '</dd>' +
        '<dt>Tingkat, kelas</dt><dd>' + esc(s.tingkat) + ', ' + esc(s.kelas) + '</dd><dt>Tahun ajaran</dt><dd>' + esc(s.tahun_ajaran) + '</dd><dt>Status</dt><dd>' + esc(s.status_akun) + '</dd>' +
        '<dt>ID siswa</dt><dd class="small" style="font-weight:500">' + esc(s.student_id) + '</dd></dl></section>' +
        '<section class="card card-pad"><h3 style="margin-bottom:10px">Akun masuk</h3>' +
        (d.account.punya_pin ? '<p>' + (d.account.terkunci ? '<span class="chip err">Terkunci sementara</span>' : '<span class="chip ok">PIN aktif</span>') + '</p><p class="small muted" style="margin-top:8px">Login terakhir: ' + (d.account.last_login_at ? fmtDate(d.account.last_login_at, true) : 'belum pernah') + '</p>'
          : '<p><span class="chip warn">Belum ada PIN</span></p>') +
        '<button class="btn btn-secondary btn-block" style="margin-top:14px" data-pin ' + (s.status_akun !== 'AKTIF' ? 'disabled' : '') + '>' + icon('key') + (d.account.punya_pin ? 'Reset PIN' : 'Buat PIN') + '</button></section>' +
        '<section class="card card-pad"><h3 style="margin-bottom:12px">Catatan layanan BK</h3><form data-note>' +
        '<div class="form-grid"><label class="field"><span>Jenis</span><select class="select" name="jenis">' + d.jenis_catatan.map(j => '<option>' + esc(j) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Tanggal kegiatan</span><input class="input" type="date" name="tanggal_kegiatan" value="' + new Date().toISOString().slice(0, 10) + '"></label></div>' +
        '<label class="field" style="margin-top:12px"><span>Catatan</span><textarea class="textarea" name="catatan" maxlength="4000" placeholder="Ringkasan kegiatan, observasi, atau hasil konseling."></textarea></label>' +
        '<label class="field"><span>Tindak lanjut</span><input class="input" name="tindak_lanjut" maxlength="500" placeholder="Mis. konseling lanjutan pekan depan"></label>' +
        '<label class="check" style="margin-top:12px"><input type="checkbox" name="pribadi" checked> <span>Pribadi: hanya saya yang dapat membaca catatan ini</span></label>' +
        '<button class="btn btn-primary btn-sm" style="margin-top:12px">' + icon('plus') + 'Simpan catatan</button></form>' +
        '<div class="stack-sm" style="margin-top:16px">' + (d.notes.length ? d.notes.map(n => '<div class="note"><small>' + esc(n.jenis) + ', ' + fmtDate(n.tanggal_kegiatan || n.created_at, false, true) + ' · ' + esc(n.nama_guru) +
          (n.privasi === 'PRIBADI' ? ' · ' + icon('lock').replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px"') + ' pribadi' : '') + '</small>' + esc(n.catatan) +
          (n.tindak_lanjut ? '<div class="small" style="margin-top:6px"><b>Tindak lanjut:</b> ' + esc(n.tindak_lanjut) + '</div>' : '') + '</div>').join('') : '<p class="small muted">Belum ada catatan.</p>') + '</div></section>' +
        '</div></div>';
      el.querySelector('[data-edit]').addEventListener('click', () => studentForm(Object.assign({}, s), render));
      el.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', () => LenteraDownload(b, [active[Number(b.dataset.pdf)]], meta)));
      const all = el.querySelector('[data-all]');
      if (all) all.addEventListener('click', () => LenteraDownload(all, active.filter(printable), meta));
      el.querySelector('[data-pin]').addEventListener('click', async e => {
        const ok = await UI.confirmDialog(d.account.punya_pin ? 'Reset PIN?' : 'Buat PIN?', '<p>PIN baru untuk <b>' + esc(s.nama_siswa) + '</b> akan dibuat' + (d.account.punya_pin ? ' dan PIN lama tidak berlaku lagi. Sesi siswa yang sedang aktif akan dikeluarkan.' : '.') + '</p>', 'Buat PIN baru');
        if (!ok) return;
        UI.busy(e.target.closest('button'), true, 'Membuat…');
        try { const p = await API.call('guru.resetPin', { student_id: s.student_id }); showPins([p], 'PIN baru'); render(); }
        catch (err) { UI.toast(err.message, 'err'); render(); }
      });
      el.querySelector('[data-note]').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const t = f.catatan.value.trim();
        if (!t) { UI.toast('Isi catatan terlebih dahulu.', 'err'); return; }
        const b = f.querySelector('button');
        UI.busy(b, true, 'Menyimpan…');
        try {
          await API.call('guru.addNote', { student_id: s.student_id, catatan: t, jenis: f.jenis.value, tanggal_kegiatan: f.tanggal_kegiatan.value, tindak_lanjut: f.tindak_lanjut.value, privasi: f.pribadi.checked ? 'PRIBADI' : 'TIM' });
          UI.toast('Catatan tersimpan.', 'ok'); render();
        }
        catch (err) { UI.toast(err.message, 'err'); UI.busy(b, false); }
      });
    };
    await render();
    return null;
  };

  const printable = r => r.hasil_siswa !== 'TERTUTUP' && ['DATA', 'SOSIOMETRI'].indexOf(r.metode_skor) < 0;
  function detailTitle(r) {
    const m = r.metode_skor;
    if (m === 'SKRINING') return r.perhatian.length ? 'Perlu perhatian' : 'Tidak ada tanda khusus';
    if (m === 'SOSIOMETRI') return 'Pilihan teman tersimpan';
    if (m === 'DATA') return 'Data diri';
    if (m === 'CEKLIS') return r.ditandai.length + ' hal ditandai' + (r.teratas.length ? ', terbanyak ' + UI.headline(r) : '');
    return (r.kode ? r.kode + ', ' : '') + UI.headline(r);
  }
  function detailBody(r) {
    const m = r.metode_skor;
    const flags = r.perhatian && r.perhatian.length ? '<div style="margin-bottom:14px">' + UI.alertBox('warn', '<b>Perlu tindak lanjut:</b><ul class="flag-list">' + r.perhatian.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>') + '</div>' : '';
    const info = r.info && r.info.length ? '<div class="table-wrap" style="margin-top:6px"><table class="table"><tbody>' + r.info.map(x => '<tr><td class="small">' + esc(x.pertanyaan) + '</td><td><b>' + esc(x.jawaban) + '</b></td></tr>').join('') + '</tbody></table></div>' : '';
    if (m === 'DATA') return info;
    if (m === 'SOSIOMETRI') return '<p class="small muted">Pilihan teman tercantum di bagian Jawaban. Rahasia: jangan disampaikan kepada siswa.</p>';
    if (m === 'CEKLIS') return flags + (r.ditandai.length ? r.dimensi.filter(d => r.ditandai.some(t => t.bidang === d.kode)).map(d => '<p class="label">' + esc(d.nama) + '</p><ul class="refs" style="margin:6px 0 12px;color:var(--ink)">' +
      r.ditandai.filter(t => t.bidang === d.kode).map(t => '<li>' + esc(t.teks) + '</li>').join('') + '</ul>').join('') : '<p class="muted">Tidak ada yang ditandai.</p>') + info;
    if (m === 'SKRINING') return flags + UI.barsHtml(r.dimensi.map(d => ({ label: d.nama, value: d.persen, color: d.warna, text: fmtIdx(d.persen) }))) +
      '<p class="small muted" style="margin-top:10px">Indeks 0–100. Untuk suasana hati, stres, dan rasa aman, makin tinggi makin perlu perhatian; untuk dukungan, makin rendah makin perlu perhatian. Bukan diagnosis.</p>' + info;
    return flags + UI.dimMeters(r) + info +
      (r.recommendations.length ? '<p class="label" style="margin-top:16px">Saran pengembangan diri</p><ul class="refs" style="margin-top:6px;color:var(--ink)">' + r.recommendations.map(x => '<li><b>' + esc(x.judul) + '.</b> ' + esc(x.deskripsi) + '</li>').join('') + '</ul>' : '');
  }

  /* ======================= ANALISIS KLASIKAL ======================= */
  Pages.guruClass = async function (el) {
    const render = async () => {
      UI.destroyCharts();
      el.innerHTML = UI.skeleton(3);
      let d = await loadDash({ status: '', kelas: ownKelas.get() });
      if (!d.applied.kelas && d.options.kelas.length) {
        const first = d.options.kelas.find(k => !d.applied.tingkat || k.tingkat === d.applied.tingkat) || d.options.kelas[0];
        ownKelas.set(first.nama_kelas);
        d = await loadDash({ status: '', kelas: first.nama_kelas });
      }
      const s = d.summary, kelas = d.applied.kelas, m = d.instrumen.metode_skor;
      const scored = hasScores(d);
      const ins = kelas ? await API.call('guru.classInsight', { filters: Object.assign({}, Filters.get(), { kelas: kelas, instrument_id: d.applied.instrument_id }) }) : null;
      el.innerHTML =
        '<div class="page-head"><div><div class="row">' + periodLine(d) + (d.instrumen.rahasia ? '<span class="chip warn plain">' + icon('lock') + 'Rahasia</span>' : '') + '</div><p>Gambaran satu kelas untuk merencanakan layanan klasikal dan menindaklanjuti siswa.</p></div>' +
        (kelas && s.sudah && scored ? '<button class="btn btn-primary" data-print>' + icon('printer') + 'Cetak laporan klasikal</button>' : '') + '</div>' +
        '<div style="margin-bottom:14px">' + instSwitch(d) + '</div>' + filterBar(d, { requireKelas: true, noStatus: true }) + '<div style="height:20px"></div>' + warningsHtml(d) +
        (!kelas ? '<div class="card">' + UI.emptyState('pie', 'Belum ada kelas', 'Tambahkan kelas di Pengaturan, tab Kelas.') + '</div>'
          : statTiles(d) + insightHtml(ins, d) +
          (scored && m !== 'CEKLIS' && m !== 'SKRINING' ? '<div class="grid grid-2" style="margin-top:20px">' +
            '<section class="card"><div class="card-head"><h2>' + distTitle(d) + ', kelas ' + esc(kelas) + '</h2></div><div class="card-body">' +
            (s.sudah ? '<div class="chart-box sm"><canvas data-dist role="img" aria-label="Sebaran hasil kelas"></canvas></div>' + UI.legendHtml(d.instrumen.kelompok, s.distribusi, s.sudah) : UI.emptyState('pie', 'Belum ada hasil', 'Belum ada siswa di kelas ini yang mengirim asesmen.')) + '</div></section>' +
            '<section class="card"><div class="card-head"><h2>Rata-rata kelas</h2><span class="small muted">' + (m === 'PROFIL' ? 'indeks 0–100' : 'persentase') + '</span></div><div class="card-body">' + averageBlock(d, s, 'kelas') + '</div></section></div>' : '') +
          (m === 'SOSIOMETRI' || m === 'DATA' ? '' : '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Hasil per siswa</h2></div><div data-list></div></section>'));
      bindFilters(el, render, { ownKelas: true });
      if (!kelas) return;
      if (s.sudah && d.instrumen.kelompok.length && el.querySelector('[data-dist]')) UI.doughnut(el.querySelector('[data-dist]'), d.instrumen.kelompok, s.distribusi);
      drawAverage(el, d, s, 'kelas');
      const list = el.querySelector('[data-list]');
      if (list) {
        const dims = d.instrumen.dimensi;
        const val = v => m === 'PROFIL' || m === 'SKRINING' ? fmtIdx(v) : m === 'CEKLIS' ? fmtIdx(v) + '%' : fmtPct(v);
        UI.pagedTable(list, {
          rows: d.students, pageSize: 50,
          head: [{ label: 'NIS' }, { label: 'Nama' }, { label: 'Status' }].concat(dims.map(x => ({ label: x.kode.length <= 3 ? x.kode : x.nama.split(/[ &]/)[0], cls: 'r' }))).concat([{ label: 'Hasil' }]),
          row: x => '<tr class="clickable" data-id="' + esc(x.student_id) + '"><td class="num">' + esc(x.nis) + '</td><td><b>' + esc(x.nama_siswa) + '</b></td><td>' + UI.statusChip(x.status_pengisian) + '</td>' +
            dims.map(k => '<td class="r num">' + (x.result ? (m === 'CEKLIS' ? (x.result.skor[k.kode] || 0) : val(x.result.persentase[k.kode])) : '–') + '</td>').join('') + '<td>' + UI.resultChip(x.result) + '</td></tr>',
          searchKeys: ['nama_siswa', 'nis'], onClick: goStudent, emptyTitle: 'Tidak ada siswa', emptyText: 'Kelas ini belum memiliki siswa aktif.',
        });
      }
      el.querySelectorAll('[data-student]').forEach(b => b.addEventListener('click', () => goStudent(b.dataset.student)));
      const pr = el.querySelector('[data-print]');
      if (pr) pr.addEventListener('click', () => printClass(d));
    };
    await render();
    return null;
  };

  function studentLink(x) { return '<a href="#/guru/siswa/' + esc(x.student_id) + '"><b>' + esc(x.nama_siswa) + '</b></a>'; }

  function insightHtml(ins, d) {
    if (!ins) return '';
    const m = ins.metode_skor;
    const conf = '<p class="small muted" style="margin-top:10px">' + icon('lock').replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"') + ' Informasi ini rahasia. Jangan ditampilkan di depan kelas atau dibagikan kepada siswa.</p>';
    if (m === 'CEKLIS') {
      return '<div class="grid grid-main" style="margin-top:20px">' +
        '<section class="card"><div class="card-head"><h2>Kebutuhan yang paling banyak ditandai</h2><span class="small muted">' + ins.responden + ' responden</span></div>' +
        (ins.responden ? '<div class="table-wrap"><table class="table"><thead><tr><th>Pernyataan</th><th>Bidang</th><th class="r">Siswa</th><th style="min-width:110px">%</th></tr></thead><tbody>' +
          ins.butir.filter(b => b.jumlah > 0).slice(0, 15).map(b => '<tr><td>' + esc(b.teks) + (b.kritis ? ' <span class="chip warn plain">kritis</span>' : '') + '</td><td>' + esc(b.bidang) + '</td><td class="r num">' + b.jumlah + '</td>' +
            '<td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="freq-bar grow"><i style="width:' + b.persen + '%"></i></div><span class="small num">' + fmtIdx(b.persen) + '%</span></div></td></tr>').join('') +
          '</tbody></table></div><div class="card-body" style="padding-top:12px"><p class="small muted">Gunakan butir teratas sebagai dasar program bimbingan klasikal dan kelompok semester ini.</p></div>'
          : '<div class="card-body"><p class="muted">Belum ada siswa yang mengisi.</p></div>') + '</section>' +
        '<section class="card"><div class="card-head"><h2>Perlu tindak lanjut</h2><span class="chip ' + (ins.perhatian.length ? 'warn' : 'no') + '">' + ins.perhatian.length + ' siswa</span></div><div class="card-body">' +
        (ins.perhatian.length ? ins.perhatian.map(x => '<div class="note" style="margin-bottom:10px">' + studentLink(x) + ' <span class="small muted">' + esc(x.kelas) + '</span><ul class="flag-list">' + x.alasan.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul></div>').join('')
          : '<p class="muted">Tidak ada siswa yang meminta konsultasi atau menandai butir kritis.</p>') +
        (ins.pesan.length ? '<p class="label" style="margin-top:14px">Pesan dari siswa</p>' + ins.pesan.map(x => '<div class="note" style="margin-top:8px"><small>' + esc(x.nama_siswa) + '</small>' + esc(x.teks) + '</div>').join('') : '') +
        conf + '</div></section></div>';
    }
    if (m === 'SKRINING') {
      return '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Siswa yang perlu disapa</h2><span class="chip ' + (ins.perhatian.length ? 'warn' : 'no') + '">' + ins.perhatian.length + ' dari ' + ins.responden + ' responden</span></div><div class="card-body">' +
        (ins.perhatian.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th><th>Alasan</th>' + d.instrumen.dimensi.map(x => '<th class="r">' + esc(x.nama.split(' ')[0]) + '</th>').join('') + '</tr></thead><tbody>' +
          ins.perhatian.map(x => '<tr><td>' + studentLink(x) + '</td><td><ul class="flag-list" style="margin:0">' + x.alasan.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul></td>' +
            x.indeks.map(i => '<td class="r num">' + fmtIdx(i.persen) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
          : '<p class="muted">' + (ins.responden ? 'Tidak ada tanda yang memerlukan perhatian khusus.' : 'Belum ada siswa yang mengisi.') + '</p>') +
        '<p class="small" style="margin-top:12px">Ini hasil skrining, bukan diagnosis. Sapa siswa secara pribadi dan tidak mencolok, dengarkan, dan tawarkan konseling. Untuk tanda perundungan, ikuti prosedur pencegahan dan penanganan kekerasan sekolah; libatkan orang tua dan rujuk ke psikolog bila perlu.</p>' +
        conf + '</div></section>';
    }
    if (m === 'SOSIOMETRI') {
      if (ins.perlu_kelas) return '';
      const crit = ins.kriteria;
      return '<div class="grid grid-main" style="margin-top:20px"><section class="card"><div class="card-head"><h2>Sosiogram kelas ' + esc(ins.kelas) + '</h2><span class="small muted">' + ins.responden + ' dari ' + ins.total + ' siswa mengisi</span></div><div class="card-body">' +
        (ins.responden ? sociogramSvg(ins) + '<div class="legend"><span><i class="dot" style="background:#9C792B"></i>pilihan timbal balik</span><span><i class="dot" style="background:#C9C2B2"></i>pilihan satu arah</span><span>ukuran lingkaran = jumlah dipilih</span></div>'
          : '<p class="muted">Belum ada siswa yang mengisi.</p>') + (ins.cukup_data ? '' : '<p class="small muted" style="margin-top:8px">Kurang dari separuh kelas mengisi; keterangan "belum dipilih" belum ditampilkan.</p>') + '</div></section>' +
        '<section class="card"><div class="card-head"><h2>Rekap pilihan</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th>' + crit.map(c => '<th class="r">' + (c.question_id.indexOf('KERJA') >= 0 ? 'Belajar' : 'Main') + '</th>').join('') + '<th class="r">Timbal balik</th><th>Keterangan</th></tr></thead><tbody>' +
        ins.nodes.slice().sort((a, b) => b.total_dipilih - a.total_dipilih).map(n => '<tr><td>' + studentLink(n) + (n.mengisi ? '' : ' <span class="tiny muted">(belum mengisi)</span>') + '</td>' + crit.map(c => '<td class="r num">' + n.dipilih[c.question_id] + '</td>').join('') +
          '<td class="r num">' + n.timbal_balik + '</td><td>' + (n.keterangan ? '<span class="chip ' + (n.keterangan === 'Banyak dipilih' ? 'gold' : 'warn') + ' plain" style="white-space:normal">' + esc(n.keterangan === 'Belum dipilih teman' ? 'Belum dipilih' : n.keterangan) + '</span>' : '') + '</td></tr>').join('') +
        '</tbody></table></div><div class="card-body">' + conf + '</div></section></div>';
    }
    if (m === 'DATA') {
      return '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Data diri siswa, kelas ' + esc(ins.kelas) + '</h2><span class="small muted">' + ins.responden + ' dari ' + ins.total + ' siswa</span></div>' +
        (ins.baris.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th>' + ins.kolom.map(c => '<th>' + esc(c.teks.replace(/\s*\(.*?\)\s*$/, '').replace(/\?$/, '')) + '</th>').join('') + '</tr></thead><tbody>' +
          ins.baris.map(r => '<tr><td>' + studentLink(r) + '</td>' + ins.kolom.map(c => '<td class="small">' + esc(r.nilai[c.question_id] || '–') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
          : '<div class="card-body"><p class="muted">Belum ada siswa yang mengisi data diri.</p></div>') + '<div class="card-body">' + conf + '</div></section>';
    }
    return '';
  }

  /** Sosiogram melingkar: lingkaran = siswa (ukuran = jumlah dipilih), garis emas = pilihan timbal balik. */
  function sociogramSvg(ins) {
    const nodes = ins.nodes, n = nodes.length, W = 640, H = 560, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 70;
    const pos = new Map();
    nodes.forEach((x, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; pos.set(x.student_id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a: a }); });
    const pairs = new Map();
    ins.edges.forEach(e => { const k = [e.dari, e.ke].sort().join('|'); const p = pairs.get(k) || { a: e.dari, b: e.ke, mutual: false, n: 0 }; p.n++; if (e.timbal_balik) p.mutual = true; pairs.set(k, p); });
    const maxRec = Math.max(1, ...nodes.map(x => x.total_dipilih));
    const lines = Array.from(pairs.values()).map(p => { const A = pos.get(p.a), B = pos.get(p.b); return '<line x1="' + A.x.toFixed(1) + '" y1="' + A.y.toFixed(1) + '" x2="' + B.x.toFixed(1) + '" y2="' + B.y.toFixed(1) + '" stroke="' + (p.mutual ? '#9C792B' : '#D3CCBD') + '" stroke-width="' + (p.mutual ? 2.4 : 1.2) + '"/>'; }).join('');
    const circles = nodes.map(x => {
      const P = pos.get(x.student_id), r = 7 + 11 * (x.total_dipilih / maxRec);
      const fill = x.keterangan === 'Belum dipilih teman' ? '#FFFFFF' : x.keterangan === 'Banyak dipilih' ? '#C6A04A' : '#F6EED8';
      const lx = P.x + Math.cos(P.a) * (r + 8), ly = P.y + Math.sin(P.a) * (r + 8) + 4;
      const anchor = Math.abs(Math.cos(P.a)) < 0.3 ? 'middle' : Math.cos(P.a) > 0 ? 'start' : 'end';
      return '<g><title>' + esc(x.nama_siswa) + ': dipilih ' + x.total_dipilih + '×</title><circle cx="' + P.x.toFixed(1) + '" cy="' + P.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + fill + '" stroke="' + (x.keterangan === 'Belum dipilih teman' ? '#B42318' : '#9C792B') + '" stroke-width="1.6"' + (x.mengisi ? '' : ' stroke-dasharray="3 2"') + '/>' +
        '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '">' + esc(x.nama_siswa.split(' ')[0]) + '</text></g>';
    }).join('');
    return '<svg class="sociogram" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sosiogram kelas">' + lines + circles + '</svg>';
  }

  function printClass(d) {
    const s = d.summary, a = d.applied, dims = d.instrumen.dimensi, isProfil = d.instrumen.metode_skor === 'PROFIL';
    const m = d.instrumen.metode_skor;
    const val = v => isProfil || m === 'SKRINING' ? fmtIdx(v) : m === 'CEKLIS' ? fmtIdx(v) + '%' : fmtPct(v);
    const html = UI.docHeader((d.instrumen.rahasia ? 'RAHASIA — ' : '') + 'Laporan Klasikal ' + d.instrumen.nama + ', Kelas ' + a.kelas, d.sekolah, ['Periode: ' + (a.period ? a.period.nama_periode : '-'), 'Tahun ajaran ' + a.tahun_ajaran, 'Dibuat: ' + d.generated_at]) +
      '<h2>Ringkasan</h2><table><tbody><tr><th>Total siswa</th><td>' + s.total + '</td><th>Sudah mengisi</th><td>' + s.sudah + ' (' + fmtPct(s.persen_selesai) + ')</td><th>Belum</th><td>' + s.belum + '</td></tr></tbody></table>' +
      '<h2>' + distTitle(d) + '</h2><table><thead><tr>' + d.instrumen.kelompok.map(k => '<th>' + esc(k.nama) + '</th>').join('') + '</tr></thead><tbody><tr>' +
      d.instrumen.kelompok.map(k => '<td>' + s.distribusi[k.kode] + ' siswa</td>').join('') + '</tr></tbody></table>' +
      '<h2>Rata-rata kelas</h2>' + UI.barsHtml(dims.map(x => ({ label: x.nama, value: s.rata_persentase[x.kode], color: x.warna, text: val(s.rata_persentase[x.kode]) }))) +
      '<h2>Hasil per siswa</h2><table><thead><tr><th>No</th><th>NIS</th><th>Nama</th>' + dims.map(x => '<th>' + esc(x.kode.length <= 3 ? x.kode : x.nama) + '</th>').join('') + '<th>Hasil</th></tr></thead><tbody>' +
      d.students.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nis) + '</td><td>' + esc(x.nama_siswa) + '</td>' + dims.map(k => '<td>' + (x.result ? val(x.result.persentase[k.kode]) : '–') + '</td>').join('') +
        '<td>' + (x.result ? esc((x.result.kode ? x.result.kode + ', ' : '') + UI.headline(x.result)) : 'Belum mengisi') + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="sign"><div>Guru BK,<div class="line"></div>&nbsp;</div></div>' + UI.docFooter('');
    UI.printHtml(html, 'Laporan Klasikal ' + a.kelas);
  }

  /* ======================= REKAPITULASI ======================= */
  const REPORTS = [
    { type: 'daftar_siswa', title: 'Daftar siswa', desc: 'Semua siswa sesuai filter beserta status pengisian.' },
    { type: 'belum_mengisi', title: 'Siswa yang belum mengisi', desc: 'Untuk tindak lanjut pengingat kepada siswa.' },
    { type: 'hasil_individual', title: 'Hasil asesmen individual', desc: 'Skor dan indeks setiap dimensi per siswa (hasil aktif).' },
    { type: 'rekap_kelas', title: 'Rekapitulasi per kelas', desc: 'Penyelesaian, sebaran, dan rata-rata per kelas.' },
    { type: 'rekap_tingkat', title: 'Rekapitulasi per tingkat', desc: 'Penyelesaian, sebaran, dan rata-rata per tingkat.' },
  ];

  Pages.guruRecap = async function (el) {
    const render = async () => {
      el.innerHTML = UI.skeleton(3);
      const d = await loadDash();
      el.innerHTML =
        '<div class="page-head"><div><div class="row">' + periodLine(d) + '</div><p>Filter diterapkan di server sebelum laporan disusun. Setiap siswa muncul satu kali.</p></div></div>' +
        '<div style="margin-bottom:14px">' + instSwitch(d) + '</div>' + filterBar(d) + '<div style="height:20px"></div>' + warningsHtml(d) +
        '<section class="card"><div class="card-head"><h2>Ekspor laporan ' + esc(d.instrumen.nama) + '</h2><span class="small muted">CSV, Excel, cetak A4 atau PDF</span></div><div class="table-wrap"><table class="table"><tbody>' +
        REPORTS.map(r => '<tr><td><b>' + esc(r.title) + '</b><div class="small muted">' + esc(r.desc) + '</div></td>' +
          '<td class="r nowrap"><button class="btn btn-secondary btn-sm" data-x="csv" data-t="' + r.type + '">CSV</button> <button class="btn btn-secondary btn-sm" data-x="xlsx" data-t="' + r.type + '">Excel</button> <button class="btn btn-primary btn-sm" data-x="print" data-t="' + r.type + '">' + icon('printer') + 'Cetak</button></td></tr>').join('') +
        '</tbody></table></div></section>' +
        '<div class="grid grid-2" style="margin-top:20px"><section class="card"><div class="card-head"><h2>Per tingkat</h2></div>' + recapTable(d, d.per_tingkat, 'Tingkat') + '</section>' +
        '<section class="card"><div class="card-head"><h2>Per kelas</h2></div>' + recapTable(d, d.per_kelas, 'Kelas') + '</section></div>';
      bindFilters(el, render);
      el.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', async () => {
        UI.busy(b, true, '…');
        try {
          const rep = await API.call('guru.export', { type: b.dataset.t, filters: Filters.get() }, { timeout: 90000 });
          if (b.dataset.x === 'csv') UI.exportCSV(rep);
          else if (b.dataset.x === 'xlsx') await UI.exportXLSX(rep);
          else UI.printReport(rep);
          if (b.dataset.x !== 'print') UI.toast(rep.judul + ': ' + rep.rows.length + ' baris diekspor.', 'ok');
        } catch (e) { UI.toast(e.message, 'err'); }
        UI.busy(b, false);
      }));
    };
    await render();
    return null;
  };

  function recapTable(d, groups, label) {
    if (!groups.length) return '<div class="card-body"><p class="muted">Belum ada data.</p></div>';
    const ks = d.instrumen.kelompok;
    const row = (g, name) => '<tr><td><b>' + esc(name) + '</b></td><td class="r num">' + g.total + '</td><td class="r num">' + g.sudah + '</td><td class="r num">' + fmtPct(g.persen_selesai) + '</td>' +
      ks.map(k => '<td class="r num">' + (g.distribusi[k.kode] || 0) + '</td>').join('') + '</tr>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(label) + '</th><th class="r">Siswa</th><th class="r">Sudah</th><th class="r">%</th>' +
      ks.map(k => '<th class="r" title="' + esc(k.nama) + '">' + esc(k.kode.length <= 3 ? k.kode : k.nama.slice(0, 5)) + '</th>').join('') + '</tr></thead><tbody>' +
      groups.map(g => row(g, g.key)).join('') + '</tbody><tfoot>' + row(d.summary, 'Total') + '</tfoot></table></div>';
  }

  /* ======================= INSTRUMEN & ANALISIS BUTIR ======================= */
  const METODE_LABEL = { PROFIL: 'profil (indeks 0–100)', DOMINAN: 'dominan (persentase)', CEKLIS: 'daftar cek (jumlah ditandai)', SKRINING: 'skrining (indeks & tanda perhatian)', SOSIOMETRI: 'sosiometri (pilihan teman)', DATA: 'pendataan (tanpa skor)' };
  const VIS_LABEL = { LENGKAP: 'hasil lengkap', RINGKAS: 'ringkasan', TERTUTUP: 'tanda terima saja' };
  Pages.guruInstruments = async function (el, _, user) {
    el.innerHTML = UI.skeleton(3);
    const list = await API.call('guru.instruments');
    el.innerHTML =
      '<div class="page-head"><div><h2>Instrumen asesmen</h2><p>Dasar teori, rujukan, dan konsistensi butir setiap instrumen. Butir dapat disunting di sheet MASTER_PERTANYAAN dengan membuat versi baru.</p></div></div>' +
      '<div class="stack">' + list.map(i => '<section class="card"><div class="card-head"><div class="row" style="gap:14px"><div class="inst-ico">' + UI.instIcon(i.instrument_id) + '</div><div><h2>' + esc(i.nama) + '</h2>' +
        '<p class="small muted">' + esc(i.bidang || '') + (i.bidang ? ', ' : '') + i.jumlah_pernyataan + ' pertanyaan aktif, versi ' + esc(i.versi_aktif) + ', ' + (METODE_LABEL[i.metode_skor] || i.metode_skor) + '</p></div></div>' +
        '<div class="row">' + (i.rahasia ? '<span class="chip gold plain">' + icon('lock').replace('<svg', '<svg style="width:13px;height:13px"') + ' Rahasia</span>' : '') +
        '<span class="chip plain">Siswa melihat: ' + (VIS_LABEL[i.hasil_siswa] || 'hasil lengkap') + '</span>' +
        (i.status === 'AKTIF' ? '<span class="chip ok">Aktif</span>' : '<span class="chip no">Nonaktif</span>') +
        (user.is_admin ? '<button class="btn btn-ghost btn-sm" data-edit="' + esc(i.instrument_id) + '">' + icon('edit') + 'Ubah</button>' : '') + '</div></div>' +
        '<div class="card-body">' + (i.error ? UI.alertBox('err', esc(i.error)) : '') +
        '<p>' + esc(i.dasar_teori) + '</p><div class="dim-chips" style="margin-top:12px">' + i.per_dimensi.map(dm => '<span class="dim-chip">' + esc(dm.nama) + ' <span class="muted">' + dm.jumlah + '</span></span>').join('') + '</div>' +
        '<details class="more" style="margin-top:16px"><summary>Rujukan dan catatan penggunaan</summary><ul class="refs" style="margin-top:10px">' + i.rujukan.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
        '<p class="small muted" style="margin-top:10px">' + esc(i.catatan_penggunaan) + '</p></details></div></section>').join('') + '</div>' +
      '<section class="card" style="margin-top:24px"><div class="card-head"><div><h2>Analisis butir</h2><p class="small muted">Reliabilitas Cronbach alpha dan korelasi butir–total dari jawaban siswa dalam cakupan Anda.</p></div>' +
      '<div class="row"><select class="select" data-ai style="width:auto">' + list.filter(i => i.status === 'AKTIF' && ['SOSIOMETRI', 'DATA'].indexOf(i.metode_skor) < 0).map(i => '<option value="' + esc(i.instrument_id) + '">' + esc(i.nama_singkat) + '</option>').join('') + '</select>' +
      '<label class="check small"><input type="checkbox" data-allp> Semua periode</label><button class="btn btn-primary" data-run>' + icon('flask') + 'Hitung</button></div></div><div class="card-body" data-out><p class="muted">Pilih instrumen lalu tekan Hitung.</p></div></section>';
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => instForm(list.find(i => i.instrument_id === b.dataset.edit), () => Pages.guruInstruments(el, _, user))));
    const run = el.querySelector('[data-run]');
    run.addEventListener('click', async () => {
      const out = el.querySelector('[data-out]');
      UI.busy(run, true, 'Menghitung…');
      try {
        const f = Object.assign({}, Filters.get(), { instrument_id: el.querySelector('[data-ai]').value });
        const r = await API.call('guru.itemAnalysis', { filters: f, semua_periode: el.querySelector('[data-allp]').checked }, { timeout: 120000 });
        out.innerHTML = analysisHtml(r);
      } catch (e) { out.innerHTML = UI.alertBox('err', esc(e.message)); }
      UI.busy(run, false);
    });
    return null;
  };

  function analysisHtml(r) {
    const chip = d => d.alpha === null ? '<span class="chip no">belum dapat dihitung</span>' : '<span class="chip ' + (d.alpha >= 0.7 ? 'ok' : d.alpha >= 0.6 ? 'warn' : 'err') + '">' + esc(d.kategori) + '</span>';
    return '<p><b>' + esc(r.instrumen.nama) + '</b>, versi ' + esc(r.instrumen.versi) + ', ' + esc(r.periode) + ': <b>' + r.jumlah_responden + '</b> responden.</p>' +
      (r.cukup ? '' : '<div style="margin-top:12px">' + UI.alertBox('warn', 'Jumlah responden kurang dari ' + r.minimal + '. Hasil analisis belum stabil; gunakan sebagai gambaran awal saja.') + '</div>') +
      '<p class="small muted" style="margin-top:10px">' + esc(r.pedoman) + '</p>' +
      '<div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr><th>Dimensi</th><th class="r">Butir</th><th class="r">Responden</th><th class="r">Alpha</th><th>Kategori</th><th>Butir perlu ditinjau</th></tr></thead><tbody>' +
      r.dimensi.map(d => '<tr><td><b>' + esc(d.nama) + '</b></td><td class="r num">' + d.jumlah_butir + '</td><td class="r num">' + d.n + '</td><td class="r alpha">' + (d.alpha === null ? '–' : d.alpha.toFixed(2).replace('.', ',')) + '</td><td>' + chip(d) + '</td>' +
        '<td class="small">' + (d.butir.filter(b => b.tinjau).map(b => esc(b.question_id)).join(', ') || '–') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<details class="more" style="margin-top:16px"><summary>Statistik per butir</summary><div class="table-wrap" style="margin-top:10px"><table class="table"><thead><tr><th>Kode</th><th>Pernyataan</th><th class="r">Rata-rata</th><th class="r">SB</th><th class="r">r butir–total</th></tr></thead><tbody>' +
      r.dimensi.map(d => d.butir.map(b => '<tr><td class="nowrap">' + esc(b.question_id) + '</td><td>' + esc(b.teks) + '</td><td class="r num">' + (b.mean == null ? '–' : b.mean) + '</td><td class="r num">' + (b.sd == null ? '–' : b.sd) + '</td>' +
        '<td class="r num"' + (b.tinjau ? ' style="color:var(--danger);font-weight:700"' : '') + '>' + (b.r_it == null ? '–' : b.r_it) + '</td></tr>').join('')).join('') + '</tbody></table></div></details>';
  }

  function instForm(i, done) {
    const m = UI.modal({
      title: 'Ubah instrumen ' + i.nama_singkat,
      body: '<form data-f class="form-grid" novalidate><label class="field"><span>Status</span><select class="select" name="status">' + ['AKTIF', 'NONAKTIF'].map(x => '<option' + (i.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Versi aktif</span><select class="select" name="versi">' + i.versi_tersedia.map(v => '<option' + (v === i.versi_aktif ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select><small class="hint">Versi baru berlaku untuk percobaan yang dimulai setelah ini.</small></label>' +
        '<div class="span-2" data-err></div></form>',
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + 'Simpan</button>',
    });
    m.el.querySelector('[data-save]').addEventListener('click', async e => {
      const f = m.el.querySelector('[data-f]');
      UI.busy(e.currentTarget, true, 'Menyimpan…');
      try { await API.call('admin.updateInstrument', { instrument_id: i.instrument_id, status: f.status.value, versi_aktif: f.versi.value }); m.close(); UI.toast('Instrumen diperbarui.', 'ok'); done(); }
      catch (err) { m.el.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(e.currentTarget, false); }
    });
  }

  /* ======================= PENGATURAN ======================= */
  Pages.guruSettings = async function (el, _, user) {
    const tabs = [['umum', 'Umum'], ['periode', 'Periode asesmen'], ['kelas', 'Kelas']]
      .concat(user.is_admin ? [['akun', 'Akun Guru BK'], ['pemulihan', 'Pemulihan data']] : []).concat([['saya', 'Akun saya']]);
    let current = sessionStorage.getItem('lentera_settings_tab') || 'umum';
    if (!tabs.some(t => t[0] === current)) current = 'umum';
    el.innerHTML = '<div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === current) + '">' + esc(t[1]) + '</button>').join('') + '</div><div data-pane></div>';
    const pane = el.querySelector('[data-pane]');
    const show = async name => {
      sessionStorage.setItem('lentera_settings_tab', name);
      el.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
      pane.innerHTML = UI.skeleton(2);
      try { await SETTINGS[name](pane, user, () => show(name)); }
      catch (e) { if (e.code !== 'SESI_TIDAK_VALID') pane.innerHTML = UI.alertBox('err', esc(e.message)); }
    };
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    await show(current);
    return null;
  };

  const roNote = user => user.is_admin ? '' : '<div style="margin-bottom:16px">' + UI.alertBox('info', 'Hanya Guru BK administrator yang dapat mengubah bagian ini.') + '</div>';

  const SETTINGS = {
    async umum(pane, user, reload) {
      const [s, periods] = await Promise.all([API.call('guru.getSettings'), API.call('guru.listPeriods')]);
      const v = s.values, dis = s.can_edit ? '' : ' disabled';
      pane.innerHTML = roNote(user) + '<section class="card card-pad" style="max-width:840px"><form data-f class="form-grid" novalidate>' +
        '<label class="field span-2"><span>' + esc(s.labels.nama_sekolah) + '</span><input class="input" name="nama_sekolah" value="' + esc(v.nama_sekolah) + '"' + dis + '></label>' +
        '<label class="field"><span>' + esc(s.labels.nama_aplikasi) + '</span><input class="input" name="nama_aplikasi" value="' + esc(v.nama_aplikasi) + '"' + dis + '></label>' +
        '<label class="field"><span>' + esc(s.labels.tahun_ajaran_aktif) + '</span><input class="input" name="tahun_ajaran_aktif" placeholder="2026/2027" value="' + esc(v.tahun_ajaran_aktif) + '"' + dis + '></label>' +
        '<label class="field span-2"><span>' + esc(s.labels.periode_aktif) + '</span><select class="select" name="periode_aktif"' + dis + '><option value="">Tidak ada (siswa tidak dapat mengisi)</option>' +
        periods.map(p => '<option value="' + esc(p.assessment_period_id) + '"' + (p.assessment_period_id === v.periode_aktif ? ' selected' : '') + '>' + esc(p.nama_periode) + ', ' + esc(p.tahun_ajaran) + '</option>').join('') + '</select></label>' +
        '<label class="field span-2"><span>' + esc(s.labels.kontak_bk) + '</span><input class="input" name="kontak_bk" value="' + esc(v.kontak_bk) + '" placeholder="Ruang BK lantai 1, Senin–Jumat 07.30–14.00"' + dis + '></label>' +
        '<label class="field"><span>' + esc(s.labels.ambang_kombinasi) + '</span><input class="input" name="ambang_kombinasi" type="number" min="0" max="20" step="0.5" value="' + esc(v.ambang_kombinasi) + '"' + dis + '></label>' +
        '<label class="field"><span>' + esc(s.labels.pola_nis) + '</span><input class="input" name="pola_nis" value="' + esc(v.pola_nis) + '"' + dis + '><small class="hint">Contoh: ^[0-9]{4,12}$ berarti 4–12 digit angka.</small></label>' +
        '<label class="check span-2"><input type="checkbox" name="acak_pertanyaan"' + (v.acak_pertanyaan === 'TRUE' ? ' checked' : '') + dis + '> ' + esc(s.labels.acak_pertanyaan) + '</label>' +
        '<label class="check span-2"><input type="checkbox" name="izinkan_ulang_default"' + (v.izinkan_ulang_default === 'TRUE' ? ' checked' : '') + dis + '> ' + esc(s.labels.izinkan_ulang_default) + '</label>' +
        '<div class="span-2" data-err></div>' + (s.can_edit ? '<div class="span-2"><button class="btn btn-primary">' + icon('save') + 'Simpan pengaturan</button></div>' : '') +
        '</form><p class="small muted" style="margin-top:16px">Versi aplikasi ' + esc(s.app_version) + '</p></section>';
      const f = pane.querySelector('[data-f]');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const b = f.querySelector('button');
        const values = {};
        ['nama_sekolah', 'nama_aplikasi', 'tahun_ajaran_aktif', 'periode_aktif', 'kontak_bk', 'ambang_kombinasi', 'pola_nis'].forEach(k => { values[k] = f[k].value.trim(); });
        values.acak_pertanyaan = f.acak_pertanyaan.checked; values.izinkan_ulang_default = f.izinkan_ulang_default.checked;
        UI.busy(b, true, 'Menyimpan…');
        try { await API.call('admin.updateSettings', { values: values }); UI.toast('Pengaturan tersimpan.', 'ok'); reload(); }
        catch (err) { f.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(b, false); }
      });
    },

    async periode(pane, user, reload) {
      const [list, inst] = await Promise.all([API.call('guru.listPeriods'), API.call('guru.instruments')]);
      const instName = id => (inst.find(i => i.instrument_id === id) || { nama_singkat: id }).nama_singkat;
      pane.innerHTML = roNote(user) + '<section class="card"><div class="card-head"><h2>Periode asesmen</h2>' + (user.is_admin ? '<button class="btn btn-primary btn-sm" data-add>' + icon('plus') + 'Tambah periode</button>' : '') + '</div>' +
        (list.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Jadwal</th><th>Instrumen</th><th>Status</th><th>Isi ulang</th><th></th></tr></thead><tbody>' +
          list.map(p => '<tr><td><b>' + esc(p.nama_periode) + '</b>' + (p.is_active ? ' <span class="chip gold">Aktif untuk siswa</span>' : '') + '<div class="small muted">TA ' + esc(p.tahun_ajaran) + '</div></td>' +
            '<td class="nowrap">' + fmtDate(p.tanggal_mulai, false, true) + ' – ' + fmtDate(p.tanggal_selesai, false, true) + '</td><td class="small">' + p.instrumen.map(instName).join(', ') + '</td>' +
            '<td><span class="chip ' + (p.state === 'DIBUKA' ? 'ok' : 'no') + '">' + esc(p.state.replace('_', ' ').toLowerCase()) + '</span></td><td>' + (p.allow_retake ? 'Diizinkan' : 'Tidak') + '</td>' +
            '<td class="r">' + (user.is_admin ? '<button class="btn btn-ghost btn-sm" data-edit="' + esc(p.assessment_period_id) + '">' + icon('edit') + 'Ubah</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
          : UI.emptyState('calendar', 'Belum ada periode', 'Buat periode asesmen agar siswa dapat mulai mengisi.')) + '</section>';
      const form = p => {
        const chosen = p ? p.instrumen : inst.filter(i => i.status === 'AKTIF').map(i => i.instrument_id);
        const m = UI.modal({
          title: p ? 'Ubah periode' : 'Tambah periode', wide: true,
          body: '<form data-f class="form-grid" novalidate><label class="field span-2"><span>Nama periode</span><input class="input" name="nama_periode" value="' + esc(p ? p.nama_periode : '') + '" placeholder="Asesmen Semester Ganjil"></label>' +
            '<label class="field"><span>Tahun ajaran</span><input class="input" name="tahun_ajaran" value="' + esc(p ? p.tahun_ajaran : '') + '" placeholder="2026/2027"></label>' +
            '<label class="field"><span>Status</span><select class="select" name="status">' + ['AKTIF', 'NONAKTIF', 'SELESAI'].map(x => '<option' + (p && p.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>Tanggal mulai</span><input class="input" type="date" name="tanggal_mulai" value="' + esc(p ? p.tanggal_mulai : '') + '"></label>' +
            '<label class="field"><span>Tanggal selesai</span><input class="input" type="date" name="tanggal_selesai" value="' + esc(p ? p.tanggal_selesai : '') + '"></label>' +
            '<div class="field span-2"><span>Instrumen yang dibuka</span><div class="checks">' + inst.filter(i => i.status === 'AKTIF').map(i =>
              '<label class="check"><input type="checkbox" name="inst" value="' + esc(i.instrument_id) + '"' + (chosen.indexOf(i.instrument_id) >= 0 ? ' checked' : '') + '> ' + esc(i.nama) + '</label>').join('') + '</div></div>' +
            '<label class="check span-2"><input type="checkbox" name="allow_retake"' + (p && p.allow_retake ? ' checked' : '') + '> Izinkan siswa mengisi ulang (hasil terbaru menggantikan hasil lama; hasil lama tetap di riwayat)</label>' +
            '<label class="check span-2"><input type="checkbox" name="set_active"' + (p && p.is_active ? ' checked' : '') + '> Jadikan periode aktif untuk siswa</label><div class="span-2" data-err></div></form>',
          foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + 'Simpan</button>',
        });
        m.el.querySelector('[data-save]').addEventListener('click', async e => {
          const f = m.el.querySelector('[data-f]');
          UI.busy(e.currentTarget, true, 'Menyimpan…');
          try {
            await API.call('admin.upsertPeriod', { assessment_period_id: p ? p.assessment_period_id : '', nama_periode: f.nama_periode.value, tahun_ajaran: f.tahun_ajaran.value.trim(), status: f.status.value,
              tanggal_mulai: f.tanggal_mulai.value, tanggal_selesai: f.tanggal_selesai.value, allow_retake: f.allow_retake.checked, set_active: f.set_active.checked,
              instrumen: Array.from(f.querySelectorAll('input[name=inst]:checked')).map(x => x.value) });
            m.close(); UI.toast('Periode tersimpan.', 'ok'); reload();
          } catch (err) { m.el.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(e.currentTarget, false); }
        });
      };
      const add = pane.querySelector('[data-add]');
      if (add) add.addEventListener('click', () => form(null));
      pane.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(p => p.assessment_period_id === b.dataset.edit))));
    },

    async kelas(pane, user, reload) {
      const list = await classes(true);
      pane.innerHTML = roNote(user) + '<section class="card"><div class="card-head"><h2>Master kelas</h2>' + (user.is_admin ? '<button class="btn btn-primary btn-sm" data-add>' + icon('plus') + 'Tambah kelas</button>' : '') + '</div>' +
        (list.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Kelas</th><th>Tingkat</th><th>Tahun ajaran</th><th>Status</th><th></th></tr></thead><tbody>' +
          list.map(c => '<tr><td><b>' + esc(c.nama_kelas) + '</b></td><td>' + esc(c.tingkat) + '</td><td>' + esc(c.tahun_ajaran) + '</td><td><span class="chip ' + (c.status === 'NONAKTIF' ? 'no' : 'ok') + '">' + esc(c.status || 'AKTIF') + '</span></td>' +
            '<td class="r">' + (user.is_admin ? '<button class="btn btn-ghost btn-sm" data-edit="' + esc(c.class_id) + '">' + icon('edit') + 'Ubah</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
          : UI.emptyState('layers', 'Belum ada kelas', 'Kelas wajib dibuat sebelum menambahkan siswa.')) + '</section>';
      const form = c => {
        const m = UI.modal({
          title: c ? 'Ubah kelas' : 'Tambah kelas',
          body: '<form data-f class="form-grid" novalidate><label class="field"><span>Nama kelas</span><input class="input" name="nama_kelas" value="' + esc(c ? c.nama_kelas : '') + '" placeholder="7A"></label>' +
            '<label class="field"><span>Tingkat</span><input class="input" name="tingkat" value="' + esc(c ? c.tingkat : '') + '" placeholder="7"></label>' +
            '<label class="field"><span>Tahun ajaran</span><input class="input" name="tahun_ajaran" value="' + esc(c ? c.tahun_ajaran : '') + '" placeholder="2026/2027"></label>' +
            '<label class="field"><span>Status</span><select class="select" name="status">' + ['AKTIF', 'NONAKTIF'].map(x => '<option' + (c && c.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label><div class="span-2" data-err></div></form>',
          foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + 'Simpan</button>',
        });
        m.el.querySelector('[data-save]').addEventListener('click', async e => {
          const f = m.el.querySelector('[data-f]');
          UI.busy(e.currentTarget, true, 'Menyimpan…');
          try {
            await API.call('admin.upsertClass', { class_id: c ? c.class_id : '', nama_kelas: f.nama_kelas.value.trim(), tingkat: f.tingkat.value.trim(), tahun_ajaran: f.tahun_ajaran.value.trim(), status: f.status.value });
            m.close(); UI.toast('Kelas tersimpan.', 'ok'); reload();
          } catch (err) { m.el.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(e.currentTarget, false); }
        });
      };
      const add = pane.querySelector('[data-add]');
      if (add) add.addEventListener('click', () => form(null));
      pane.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(c => c.class_id === b.dataset.edit))));
    },

    async akun(pane, user, reload) {
      const list = await API.call('admin.listAccounts');
      pane.innerHTML = '<section class="card"><div class="card-head"><h2>Akun Guru BK</h2><button class="btn btn-primary btn-sm" data-add>' + icon('plus') + 'Tambah akun</button></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Username</th><th>Cakupan kelas</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead><tbody>' +
        list.map(a => '<tr><td><b>' + esc(a.nama) + '</b></td><td>' + esc(a.username) + '</td><td>' + (a.scope_kelas === '*' ? 'Semua kelas' : esc(a.scope_kelas)) + '</td><td>' + (a.is_admin ? '<span class="chip gold">Admin</span>' : 'Guru BK') + '</td>' +
          '<td><span class="chip ' + (a.status === 'AKTIF' ? 'ok' : 'no') + '">' + esc(a.status) + '</span></td><td class="nowrap">' + (a.last_login_at ? fmtDate(a.last_login_at, true) : '–') + '</td>' +
          '<td class="r"><button class="btn btn-ghost btn-sm" data-edit="' + esc(a.account_id) + '">' + icon('edit') + 'Ubah</button></td></tr>').join('') + '</tbody></table></div></section>' +
        '<p class="small muted" style="margin-top:12px">Cakupan kelas membatasi data siswa yang dapat dilihat guru. Isi <code>*</code> untuk semua kelas, atau daftar kelas dipisah koma, mis. <code>7A, 7B</code>.</p>';
      const form = a => {
        const m = UI.modal({
          title: a ? 'Ubah akun Guru BK' : 'Tambah akun Guru BK',
          body: '<form data-f class="form-grid" novalidate><label class="field"><span>Nama</span><input class="input" name="nama" value="' + esc(a ? a.nama : '') + '"></label>' +
            '<label class="field"><span>Username</span><input class="input" name="username" autocomplete="off" value="' + esc(a ? a.username : '') + '" placeholder="huruf kecil, tanpa spasi"></label>' +
            '<label class="field span-2"><span>Cakupan kelas</span><input class="input" name="scope_kelas" value="' + esc(a ? a.scope_kelas : '*') + '"></label>' +
            '<label class="field"><span>' + (a ? 'Kata sandi baru (kosongkan jika tidak diubah)' : 'Kata sandi') + '</span><input class="input" type="password" name="password" autocomplete="new-password"><small class="hint">Minimal 8 karakter.</small></label>' +
            '<label class="field"><span>Status</span><select class="select" name="status">' + ['AKTIF', 'NONAKTIF'].map(x => '<option' + (a && a.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
            '<label class="check span-2"><input type="checkbox" name="is_admin"' + (a && a.is_admin ? ' checked' : '') + '> Administrator (mengelola pengaturan, periode, kelas, akun, pemulihan data)</label><div class="span-2" data-err></div></form>',
          foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + 'Simpan</button>',
        });
        m.el.querySelector('[data-save]').addEventListener('click', async e => {
          const f = m.el.querySelector('[data-f]');
          UI.busy(e.currentTarget, true, 'Menyimpan…');
          try {
            await API.call('admin.upsertGuru', { account_id: a ? a.account_id : '', nama: f.nama.value, username: f.username.value.trim().toLowerCase(), scope_kelas: f.scope_kelas.value.trim(), password: f.password.value, status: f.status.value, is_admin: f.is_admin.checked });
            m.close(); UI.toast('Akun tersimpan.', 'ok'); reload();
          } catch (err) { m.el.querySelector('[data-err]').innerHTML = UI.alertBox('err', esc(err.message)); UI.busy(e.currentTarget, false); }
        });
      };
      pane.querySelector('[data-add]').addEventListener('click', () => form(null));
      pane.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(a => a.account_id === b.dataset.edit))));
    },

    async pemulihan(pane) {
      const paint = (r, flash) => {
        const crit = r.issues.filter(i => i.tingkat === 'KRITIS').length;
        pane.innerHTML = (flash || '') + '<section class="card"><div class="card-head"><div><h2>Pemeriksaan konsistensi data</h2><p class="small muted">Diperiksa ' + fmtDate(r.checked_at, true) + '</p></div>' +
          '<div class="row"><button class="btn btn-secondary btn-sm" data-check>' + icon('refresh') + 'Periksa ulang</button>' +
          (r.issues.some(i => i.dapat_diperbaiki) ? '<button class="btn btn-primary btn-sm" data-fix>' + icon('shield') + 'Pulihkan otomatis</button>' : '') + '</div></div>' +
          (r.issues.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Tingkat</th><th>Temuan</th><th class="r">Jumlah</th><th>Contoh ID</th><th>Perbaikan</th></tr></thead><tbody>' +
            r.issues.map(i => '<tr><td><span class="chip ' + (i.tingkat === 'KRITIS' ? 'err' : 'warn') + '">' + esc(i.tingkat) + '</span></td><td>' + esc(i.deskripsi) + '</td><td class="r num">' + i.jumlah + '</td>' +
              '<td class="small">' + esc(i.contoh.join(', ')) + '</td><td class="small">' + (i.dapat_diperbaiki ? 'Otomatis' : 'Perlu ditinjau manual di Google Sheets') + '</td></tr>').join('') + '</tbody></table></div>'
            : UI.emptyState('shield', 'Data konsisten', 'Tidak ditemukan duplikasi, pengiriman macet, atau data yatim.')) + '</section>' +
          '<p class="small muted" style="margin-top:12px">' + (crit ? crit + ' temuan kritis. ' : '') + 'Pemulihan otomatis hanya memperbaiki jawaban ganda, hasil FINAL ganda, dan pengiriman yang macet lebih dari 10 menit. Masalah identitas siswa tidak diubah otomatis.</p>';
        pane.querySelector('[data-check]').addEventListener('click', run);
        const fx = pane.querySelector('[data-fix]');
        if (fx) fx.addEventListener('click', async () => {
          const ok = await UI.confirmDialog('Jalankan pemulihan otomatis?', '<p>Tindakan ini mengubah data di Google Sheets dan dicatat di RIWAYAT_ASESMEN. Disarankan membuat salinan spreadsheet terlebih dahulu (File → Buat salinan).</p>', 'Pulihkan sekarang', true);
          if (!ok) return;
          UI.busy(fx, true, 'Memulihkan…');
          try {
            const res = await API.call('admin.consistencyCheck', { apply: true }, { timeout: 180000 });
            const after = await API.call('admin.consistencyCheck', { apply: false }, { timeout: 120000 });
            paint(after, '<div style="margin-bottom:16px">' + UI.alertBox('ok', res.fixes.length ? esc(res.fixes.join(' ')) : 'Tidak ada yang perlu diperbaiki otomatis.') + '</div>');
          } catch (e) { UI.toast(e.message, 'err'); UI.busy(fx, false); }
        });
      };
      const run = async () => { pane.innerHTML = UI.skeleton(2); paint(await API.call('admin.consistencyCheck', { apply: false }, { timeout: 120000 })); };
      await run();
    },

    async saya(pane, user) {
      pane.innerHTML = '<section class="card card-pad" style="max-width:520px"><h2 style="margin-bottom:14px">Ubah kata sandi</h2><form data-f novalidate>' +
        '<label class="field"><span>Kata sandi lama</span><input class="input" type="password" name="old_password" autocomplete="current-password"></label>' +
        '<label class="field"><span>Kata sandi baru</span><input class="input" type="password" name="new_password" autocomplete="new-password"><small class="hint">Minimal 8 karakter. Sesi di perangkat lain akan dikeluarkan.</small></label>' +
        '<label class="field"><span>Ulangi kata sandi baru</span><input class="input" type="password" name="confirm" autocomplete="new-password"></label>' +
        '<div data-err style="margin-top:12px"></div><button class="btn btn-primary" style="margin-top:12px">' + icon('save') + 'Simpan kata sandi</button></form>' +
        '<p class="small muted" style="margin-top:16px">Masuk sebagai <b>' + esc(user.username) + '</b> · cakupan ' + esc(user.scope_kelas === '*' ? 'semua kelas' : user.scope_kelas) + '</p></section>';
      const f = pane.querySelector('[data-f]');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const err = f.querySelector('[data-err]');
        if (f.new_password.value !== f.confirm.value) { err.innerHTML = UI.alertBox('err', 'Konfirmasi kata sandi tidak sama.'); return; }
        const b = f.querySelector('button');
        UI.busy(b, true, 'Menyimpan…');
        try { await API.call('guru.changePassword', { old_password: f.old_password.value, new_password: f.new_password.value }); f.reset(); err.innerHTML = UI.alertBox('ok', 'Kata sandi berhasil diubah.'); }
        catch (x) { err.innerHTML = UI.alertBox('err', esc(x.message)); }
        UI.busy(b, false);
      });
    },
  };
})();

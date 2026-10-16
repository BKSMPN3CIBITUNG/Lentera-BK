/* LENTERA — utilitas antarmuka: ikon, motif, format, modal, toast, grafik, ekspor, cetak. */
(function () {
  'use strict';

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4M12 17.2v.01"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V5M7 9.5l5-5 5 5"/><path d="M5 20h14"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8M8 11h6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    network: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 6.5h10M6.2 8l4.6 8M17.8 8l-4.6 8"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const INST_ICON = { GB: 'book', RIASEC: 'compass', KM: 'spark', DATA: 'file', AKS: 'list', KB: 'clock', KAR: 'target', SOSIO: 'network', KES: 'heart' };

  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.layers) + '</svg>';
  }
  const instIcon = id => icon(INST_ICON[id] || 'layers');

  /* Tanda LENTERA: lentera kecil dengan nyala gold di dalam lingkaran. */
  const BRAND = '<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#FFFFFF" stroke="#C6A04A" stroke-width="2"/>' +
    '<path d="M20.5 14.5a3.5 3.5 0 0 1 7 0" fill="none" stroke="#9C792B" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M16.5 15.5h15l-2.4 3.2h-10.2z" fill="#9C792B"/>' +
    '<rect x="18" y="18.7" width="12" height="13.6" rx="2.2" fill="#F6EED8" stroke="#9C792B" stroke-width="1.6"/>' +
    '<path d="M24 21.6c2.2 2.6 3.2 4.3 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-1.5 1-3.2 3.2-5.8z" fill="#C6A04A"/>' +
    '<path d="M24 25.6c.9 1.1 1.3 1.8 1.3 2.4a1.3 1.3 0 0 1-2.6 0c0-.6.4-1.3 1.3-2.4z" fill="#FFFFFF"/>' +
    '<rect x="16" y="32.3" width="16" height="2.8" rx="1.4" fill="#292929"/></svg>';

  /** Motif cahaya: lingkar-lingkar tipis yang memancar seperti cahaya lentera (identitas visual LENTERA). */
  function waves(cls) {
    let paths = '';
    for (let i = 0; i < 9; i++) {
      const r = 34 + i * 30, op = (0.95 - i * 0.09).toFixed(2), w = (1.3 - i * 0.07).toFixed(2);
      paths += '<circle cx="470" cy="250" r="' + r + '" stroke-width="' + w + '" opacity="' + op + '"' + (i % 3 === 2 ? ' stroke-dasharray="2 7"' : '') + '/>';
    }
    return '<svg class="waves ' + (cls || '') + '" viewBox="0 0 600 230" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">' + paths + '</svg>';
  }

  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nf = new Intl.NumberFormat('id-ID');
  const fmtNum = n => nf.format(Number(n) || 0);
  const fmtPct = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  const fmtIdx = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function fmtDate(s, withTime, short) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
    if (!m) return s ? esc(s) : '–';
    const mon = BULAN[Number(m[2]) - 1];
    const base = Number(m[3]) + ' ' + (short ? mon.slice(0, 3) : mon) + ' ' + m[1];
    return withTime && m[4] ? base + ', pukul ' + m[4] + '.' + m[5] : base;
  }
  const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ---------- Hasil ---------- */
  function headline(r) {
    const names = (r.teratas || []).map(k => (r.dimensi.find(d => d.kode === k) || { nama: k }).nama);
    if (r.metode_skor === 'DOMINAN') return names.length > 1 ? 'Kombinasi ' + names.join(' & ') : (names[0] || '–');
    return names.join(', ');
  }
  function valueLabel(r) { return r.metode_skor === 'DOMINAN' ? 'persentase' : 'indeks 0–100'; }
  function valueText(r, v) { return r.metode_skor === 'DOMINAN' ? fmtPct(v) : fmtIdx(v); }

  function dimMeters(r, opts) {
    opts = opts || {};
    const max = r.metode_skor === 'DOMINAN' ? Math.max(1, ...r.dimensi.map(d => d.persen)) : 100;
    const list = r.metode_skor === 'PROFIL' && opts.sorted !== false ? r.dimensi.slice().sort((a, b) => b.persen - a.persen) : r.dimensi;
    return '<div class="dim-list">' + list.map(d =>
      '<div class="dim-item' + (d.teratas ? ' top' : '') + '"><div><h4><i class="dot" style="background:' + d.warna + ';margin:0"></i>' + esc(d.nama) + '</h4>' +
      '<p>' + esc(d.deskripsi) + '</p>' + (d.teratas && d.contoh_pengembangan ? '<p class="ex"><b>Bisa dijelajahi:</b> ' + esc(d.contoh_pengembangan) + '</p>' : '') + '</div>' +
      '<div class="meter"><div class="track" role="img" aria-label="' + esc(d.nama) + ' ' + valueText(r, d.persen) + '"><i style="width:' + Math.max(2, Math.min(100, d.persen / max * 100)) + '%;background:' + d.warna + '"></i></div>' +
      '<div class="val"><span>' + esc(d.level || 'skor ' + fmtNum(d.skor)) + '</span><b>' + valueText(r, d.persen) + '</b></div></div></div>').join('') + '</div>';
  }

  function barsHtml(items) {
    return '<div class="bars">' + items.map(it =>
      '<div class="bar-row"><span>' + esc(it.label) + '</span><div class="track" role="img" aria-label="' + esc(it.label) + ' ' + esc(it.text) + '"><i style="width:' + Math.max(0, Math.min(100, it.value)) + '%;background:' + it.color + '"></i></div><b>' + esc(it.text) + '</b></div>').join('') + '</div>';
  }

  /* ---------- Toast & modal ---------- */
  function toast(msg, type) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = icon(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info') + '<div>' + esc(msg) + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, type === 'err' ? 6500 : 4000);
  }

  function modal(opts) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="mdl-t">' +
      '<div class="modal-head"><h2 id="mdl-t">' + esc(opts.title) + '</h2><button class="btn btn-ghost icon-btn" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' + (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') + '</div>';
    const prevFocus = document.activeElement;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); if (opts.onClose) opts.onClose(); };
    const onKey = e => { if (e.key === 'Escape' && !opts.locked) close(); };
    back.addEventListener('click', e => { if ((e.target === back && !opts.locked) || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const first = back.querySelector('input, select, textarea, .modal-foot .btn-primary') || back.querySelector('[data-close]');
    if (first) first.focus();
    if (opts.onMount) opts.onMount(back, close);
    return { el: back, close: close };
  }

  function confirmDialog(title, bodyHtml, okLabel, danger) {
    return new Promise(resolve => {
      let done = false;
      const m = modal({
        title: title, body: bodyHtml,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(okLabel || 'Lanjutkan') + '</button>',
        onClose: () => { if (!done) resolve(false); },
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
    });
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.html = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(label || 'Memproses…');
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  }

  /* ---------- Grafik ---------- */
  const charts = [];
  function chart(canvas, config) {
    if (!window.Chart || !canvas) return null;
    const c = new window.Chart(canvas, config);
    charts.push(c);
    return c;
  }
  function destroyCharts() { while (charts.length) { try { charts.pop().destroy(); } catch (e) { /* abaikan */ } } }
  function chartDefaults() {
    if (!window.Chart) return;
    const C = window.Chart;
    C.defaults.font.family = getComputedStyle(document.body).fontFamily;
    C.defaults.color = '#6B7280';
    C.defaults.borderColor = '#ECE8DF';
    C.defaults.plugins.legend.display = false;
    C.defaults.plugins.tooltip.backgroundColor = '#292929';
    C.defaults.plugins.tooltip.padding = 10;
    C.defaults.plugins.tooltip.cornerRadius = 8;
    C.defaults.maintainAspectRatio = false;
    C.defaults.animation.duration = 450;
  }
  /** Radar profil (heksagon Holland untuk RIASEC, oktagon untuk Kecerdasan Majemuk). */
  function radar(canvas, dims, opts) {
    opts = opts || {};
    return chart(canvas, {
      type: 'radar',
      data: {
        labels: dims.map(d => d.nama),
        datasets: [{ data: dims.map(d => d.persen), backgroundColor: 'rgba(198,160,74,.20)', borderColor: '#9C792B', borderWidth: 2,
          pointBackgroundColor: dims.map(d => (d.teratas ? '#9C792B' : '#FFFFFF')), pointBorderColor: '#9C792B', pointRadius: 4, pointHoverRadius: 6 }],
      },
      options: {
        scales: { r: { min: 0, max: opts.max || 100, ticks: { stepSize: 25, display: false }, grid: { color: '#ECE8DF' }, angleLines: { color: '#ECE8DF' },
          pointLabels: { color: '#292929', font: { size: 12, weight: '600' } } } },
        plugins: { tooltip: { callbacks: { label: c => ' ' + (opts.fmt ? opts.fmt(c.raw) : fmtIdx(c.raw)) } } },
      },
    });
  }
  function doughnut(canvas, buckets, dist) {
    return chart(canvas, {
      type: 'doughnut',
      data: { labels: buckets.map(b => b.nama), datasets: [{ data: buckets.map(b => dist[b.kode] || 0), backgroundColor: buckets.map(b => b.warna), borderColor: '#FFFFFF', borderWidth: 3, hoverOffset: 6 }] },
      options: { cutout: '64%', plugins: { tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtNum(c.raw) + ' siswa' } } } },
    });
  }
  function legendHtml(buckets, dist, total) {
    return '<div class="legend">' + buckets.map(b => '<span><i class="dot" style="background:' + b.warna + '"></i>' + esc(b.nama) + ' <b class="num">' + fmtNum(dist[b.kode] || 0) + '</b>' +
      (total ? ' <span class="muted">(' + fmtPct((dist[b.kode] || 0) / total * 100) + ')</span>' : '') + '</span>').join('') + '</div>';
  }

  /* ---------- Ekspor ---------- */
  function csvCell(v) {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function reportMetaLines(rep) {
    return [['Laporan', rep.judul], ['Sekolah', rep.sekolah], ['Periode asesmen', rep.periode], ['Filter', rep.filter],
      ['Dibuat pada', rep.dibuat_pada], ['Dibuat oleh', rep.dibuat_oleh], ['Catatan', rep.catatan || '']];
  }
  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function fileBase(rep) { return ('LENTERA_' + rep.type + '_' + String(rep.dibuat_pada).replace(/[^0-9]/g, '').slice(0, 12)).replace(/[^A-Za-z0-9_-]/g, '_'); }
  function exportCSV(rep) {
    const lines = reportMetaLines(rep).map(m => csvCell(m[0]) + ';' + csvCell(m[1]));
    lines.push('');
    lines.push(rep.columns.map(c => csvCell(c.label)).join(';'));
    rep.rows.forEach(r => lines.push(rep.columns.map(c => csvCell(r[c.key])).join(';')));
    download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), fileBase(rep) + '.csv');
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[data-src="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src; s.dataset.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }
  async function exportXLSX(rep) {
    await loadScript('vendor/xlsx.mini.min.js');
    const XLSX = window.XLSX;
    const aoa = reportMetaLines(rep).map(m => [m[0], m[1]]);
    aoa.push([]);
    aoa.push(rep.columns.map(c => c.label));
    rep.rows.forEach(r => aoa.push(rep.columns.map(c => { const v = r[c.key]; return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; })));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = rep.columns.map(c => ({ wch: Math.max(8, Math.min(40, c.label.length + 3)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, fileBase(rep) + '.xlsx');
  }

  /* ---------- Cetak A4 (laporan guru) ---------- */
  function docHeader(title, school, metaLines) {
    return '<div class="doc-head"><div><div class="school">' + esc(school || '') + '</div><h1>' + esc(title) + '</h1></div><div class="doc-meta">' + metaLines.map(esc).join('<br>') + '</div></div>';
  }
  function docFooter(extra) {
    return '<div class="doc-foot">Dibuat dengan LENTERA (Portal Asesmen Bimbingan dan Konseling). ' + esc(extra || '') +
      ' Hasil asesmen bersifat membantu pengembangan diri siswa dan bukan acuan mutlak.</div>';
  }
  function printHtml(html, title) {
    const root = document.getElementById('print-root');
    root.innerHTML = '<div class="doc">' + html + '</div>';
    const prevTitle = document.title;
    if (title) document.title = title;
    document.body.classList.add('printing');
    const cleanup = () => { document.body.classList.remove('printing'); root.innerHTML = ''; document.title = prevTitle; window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 1500); }, 60);
  }
  function printReport(rep) {
    const head = docHeader(rep.judul, rep.sekolah, ['Periode: ' + rep.periode, rep.filter, 'Dibuat: ' + rep.dibuat_pada]);
    const table = '<table><thead><tr>' + rep.columns.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' +
      (rep.rows.length ? rep.rows.map(r => '<tr>' + rep.columns.map(c => '<td>' + esc(typeof r[c.key] === 'number' ? fmtIdx(r[c.key]) : r[c.key]) + '</td>').join('') + '</tr>').join('')
        : '<tr><td colspan="' + rep.columns.length + '">Tidak ada data untuk filter ini.</td></tr>') + '</tbody></table>';
    const sign = '<div class="sign"><div>Guru BK,<div class="line"></div>' + esc(rep.dibuat_oleh || '') + '</div></div>';
    printHtml(head + table + sign + docFooter('Jumlah baris: ' + rep.rows.length + '.'), rep.judul);
  }

  /* ---------- Tabel berhalaman ---------- */
  function pagedTable(container, opts) {
    const state = { page: 1, size: opts.pageSize || 25, q: '' };
    const render = () => {
      let rows = opts.rows;
      if (state.q && opts.searchKeys) {
        const q = state.q.toLowerCase();
        rows = rows.filter(r => opts.searchKeys.some(k => String(r[k] || '').toLowerCase().includes(q)));
      }
      const pages = Math.max(1, Math.ceil(rows.length / state.size));
      if (state.page > pages) state.page = pages;
      const slice = rows.slice((state.page - 1) * state.size, state.page * state.size);
      container.querySelector('[data-tbody]').innerHTML = slice.length ? slice.map((r, i) => opts.row(r, (state.page - 1) * state.size + i)).join('')
        : '<tr><td colspan="' + opts.head.length + '"><div class="empty"><h3>' + esc(opts.emptyTitle || 'Tidak ada data') + '</h3><p>' + esc(opts.emptyText || '') + '</p></div></td></tr>';
      container.querySelector('[data-pinfo]').textContent = rows.length
        ? 'Menampilkan ' + fmtNum((state.page - 1) * state.size + 1) + '–' + fmtNum(Math.min(state.page * state.size, rows.length)) + ' dari ' + fmtNum(rows.length) : '0 data';
      container.querySelector('[data-prev]').disabled = state.page <= 1;
      container.querySelector('[data-next]').disabled = state.page >= pages;
    };
    container.innerHTML =
      (opts.searchKeys ? '<div style="padding:14px 16px 4px"><label class="search"><span class="sr-only">Cari</span>' + icon('search') + '<input class="input" data-q type="search" placeholder="' + esc(opts.searchPlaceholder || 'Cari…') + '"></label></div>' : '') +
      '<div class="table-wrap"><table class="table"><thead><tr>' + opts.head.map(h => '<th class="' + (h.cls || '') + '">' + esc(h.label) + '</th>').join('') + '</tr></thead><tbody data-tbody></tbody></table></div>' +
      '<div class="pager"><span class="small muted" data-pinfo></span><div class="row"><button class="btn btn-secondary btn-sm" data-prev>' + icon('left') + 'Sebelumnya</button><button class="btn btn-secondary btn-sm" data-next>Berikutnya' + icon('right') + '</button></div></div>';
    container.querySelector('[data-prev]').addEventListener('click', () => { state.page--; render(); });
    container.querySelector('[data-next]').addEventListener('click', () => { state.page++; render(); });
    const q = container.querySelector('[data-q]');
    if (q) q.addEventListener('input', debounce(() => { state.q = q.value.trim(); state.page = 1; render(); }, 200));
    if (opts.onClick) container.querySelector('[data-tbody]').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr && !e.target.closest('button,a')) opts.onClick(tr.dataset.id); });
    render();
    return { render: render };
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; }
  function emptyState(ic, title, text, actionHtml) {
    return '<div class="empty"><div class="ico">' + icon(ic) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actionHtml ? '<div style="margin-top:18px">' + actionHtml + '</div>' : '') + '</div>';
  }
  function alertBox(type, text, ic) {
    return '<div class="alert ' + type + '" role="' + (type === 'err' ? 'alert' : 'status') + '">' + icon(ic || (type === 'ok' ? 'check' : type === 'info' ? 'info' : 'alert')) + '<div>' + text + '</div></div>';
  }
  function notice(title, text) { return '<div class="notice"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>'; }
  function statusChip(s) {
    if (s === 'SUDAH' || s === 'SELESAI') return '<span class="chip ok">Selesai</span>';
    if (s === 'SEDANG') return '<span class="chip warn">Sedang dikerjakan</span>';
    return '<span class="chip no">Belum mengisi</span>';
  }
  function resultChip(r) {
    if (!r) return '<span class="muted">–</span>';
    if (r.metode_skor === 'SKRINING') return r.perhatian && r.perhatian.length ? '<span class="chip warn">Perlu perhatian</span>' : '<span class="chip no">Tidak ada tanda khusus</span>';
    if (r.metode_skor === 'SOSIOMETRI' || r.metode_skor === 'DATA') return '<span class="chip ok plain">Sudah mengisi</span>';
    if (r.metode_skor === 'CEKLIS') return '<span class="chip ' + (r.perhatian && r.perhatian.length ? 'warn' : 'gold') + ' plain">' + (r.ditandai || []).length + ' ditandai' + (r.perhatian && r.perhatian.length ? ', perlu tindak lanjut' : '') + '</span>';
    const d = r.dimensi.find(x => x.kode === r.teratas[0]);
    return '<span class="chip gold plain"><i class="dot" style="background:' + (d ? d.warna : '#C6A04A') + ';margin-right:0"></i>' + esc(r.kode ? r.kode + ' · ' + headline(r) : headline(r)) + '</span>';
  }
  function skeleton(lines) {
    return '<div class="stack" aria-busy="true">' + Array.from({ length: lines || 3 }, (_, i) => '<div class="skeleton" style="height:' + (i === 0 ? 150 : 74) + 'px"></div>').join('') + '</div>';
  }

  window.UI = {
    icon, instIcon, BRAND, waves, esc, fmtNum, fmtPct, fmtIdx, fmtDate, initials, headline, valueLabel, valueText, dimMeters, barsHtml,
    toast, modal, confirmDialog, busy, chart, destroyCharts, chartDefaults, radar, doughnut, legendHtml,
    exportCSV, exportXLSX, printReport, printHtml, docHeader, docFooter, pagedTable, debounce, emptyState, alertBox, notice,
    statusChip, resultChip, skeleton, download, csvCell, loadScript,
  };
})();

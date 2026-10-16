/* LENTERA — halaman siswa: beranda, pengantar, kuesioner (semua tipe butir), hasil, riwayat; halaman Tentang (bersama). */
(function () {
  'use strict';
  const { icon, instIcon, esc, fmtDate } = UI;
  const Pages = window.LenteraPages = window.LenteraPages || {};
  const BIDANG_ORDER = ['Umum', 'Belajar', 'Pribadi', 'Sosial', 'Karier'];
  const BIDANG_LABEL = { Umum: 'Mengenal kebutuhanmu', Belajar: 'Belajar', Pribadi: 'Pribadi', Sosial: 'Sosial', Karier: 'Karier & studi lanjut' };

  async function downloadPdf(btn, results, meta) {
    const printable = results.filter(r => r && !r.tertutup);
    if (!printable.length) { UI.toast('Hasil ini dirahasiakan dan tidak tersedia sebagai PDF.', 'err'); return; }
    UI.busy(btn, true, 'Menyiapkan PDF…');
    try {
      const r = await LenteraPdf.buildResultPdf(printable, meta);
      UI.toast('PDF diunduh: ' + r.filename, 'ok');
    } catch (e) {
      UI.toast('PDF gagal dibuat: ' + e.message, 'err');
    } finally { UI.busy(btn, false); }
  }
  window.LenteraDownload = downloadPdf;

  const lockChip = '<span class="chip outline plain" title="Hanya Guru BK yang dapat membaca jawaban ini">' + icon('lock').replace('<svg', '<svg style="width:13px;height:13px"') + 'Rahasia</span>';

  function resultLine(i) {
    const r = i.result;
    if (!r) return '';
    if (r.tertutup) return '<p class="result-line muted">Jawabanmu tersimpan dan hanya dibaca oleh Guru BK.</p>';
    if (r.metode_skor === 'DATA') return '<p class="result-line muted">Data diri tersimpan. Kamu dapat memperbaruinya kapan saja.</p>';
    if (r.metode_skor === 'CEKLIS') return '<p class="result-line">' + esc(r.ditandai.length ? r.ditandai.length + ' hal kamu tandai. Guru BK akan menindaklanjuti.' : 'Tidak ada yang kamu tandai.') + '</p>';
    return '<p class="result-line">Hasil: <b>' + esc(r.kode ? r.kode + ', ' : '') + esc(UI.headline(r)) + '</b></p>';
  }

  /* ======================= BERANDA ======================= */
  Pages.siswaHome = async function (el, _, user) {
    el.classList.add('narrow');
    el.innerHTML = UI.skeleton(3);
    const d = await API.call('siswa.dashboard');
    const p = d.period;
    const first = (d.student.nama || user.nama || '').split(' ')[0];
    const total = d.instruments.length;
    let lead;
    if (!p) lead = 'Belum ada periode asesmen yang dibuka. Guru BK akan memberi tahu kapan asesmen dapat diisi.';
    else if (p.state !== 'DIBUKA') lead = p.state === 'BELUM_DIBUKA' ? 'Asesmen "' + p.nama_periode + '" dibuka mulai ' + fmtDate(p.tanggal_mulai) + '.' : 'Periode asesmen sudah ditutup. Hubungi Guru BK jika kamu belum sempat mengisi.';
    else if (d.selesai === total && total) lead = 'Semua asesmen periode ini sudah kamu selesaikan. Unduh profilmu dan diskusikan dengan Guru BK.';
    else lead = 'Kerjakan asesmen di bawah ini satu per satu, kapan saja selama periode dibuka. Jawabanmu hanya dapat dilihat olehmu dan Guru BK.';

    const row = i => {
      const done = i.status === 'SELESAI', mid = i.status === 'SEDANG';
      const open = p && p.state === 'DIBUKA';
      let actions = '';
      if (done) {
        actions = (i.result.tertutup ? '' : '<a class="btn btn-secondary" href="#/siswa/hasil/' + esc(i.result.result_id) + '">' + (i.metode_skor === 'DATA' ? 'Lihat data' : 'Lihat hasil') + '</a>') +
          (i.can_retake ? '<a class="btn btn-ghost btn-sm" href="#/siswa/asesmen/' + i.instrument_id + '">' + (i.metode_skor === 'DATA' ? 'Perbarui' : 'Isi ulang') + '</a>' : '');
      } else if (mid) actions = open ? '<a class="btn btn-primary" href="#/siswa/asesmen/' + i.instrument_id + '/isi">Lanjutkan</a>' : '';
      else actions = open ? '<a class="btn btn-primary" href="#/siswa/asesmen/' + i.instrument_id + '">Mulai</a>' : '';
      return '<div class="inst-row' + (done ? ' done' : '') + '"><div class="inst-ico">' + (done ? icon('check') : instIcon(i.instrument_id)) + '</div>' +
        '<div><div class="row" style="gap:8px"><h3>' + esc(i.nama) + '</h3>' + UI.statusChip(i.status) + (i.rahasia ? lockChip : '') + '</div>' +
        '<p class="desc">' + esc(i.deskripsi) + '</p>' +
        '<div class="facts"><span><b>' + i.jumlah_pernyataan + '</b> pertanyaan</span><span>sekitar <b>' + i.estimasi_menit + '</b> menit</span></div>' +
        (mid ? '<div style="margin-top:10px;max-width:360px"><div class="progress"><i style="width:' + Math.round(i.terjawab / Math.max(1, i.jumlah_pernyataan) * 100) + '%"></i></div><div class="tiny muted" style="margin-top:4px">' + i.terjawab + ' dari ' + i.jumlah_pernyataan + ' tersimpan di server</div></div>' : '') +
        resultLine(i) + '</div><div class="actions">' + actions + '</div></div>';
    };
    const groups = BIDANG_ORDER.map(b => ({ b: b, items: d.instruments.filter(i => (i.bidang || 'Umum') === b) })).filter(g => g.items.length);
    d.instruments.filter(i => BIDANG_ORDER.indexOf(i.bidang) < 0).forEach(i => groups.push({ b: i.bidang, items: [i] }));
    const printable = d.instruments.some(i => i.status === 'SELESAI' && i.result && !i.result.tertutup && i.metode_skor !== 'DATA');

    el.innerHTML =
      '<section class="greet">' + UI.waves() + '<h1>Halo, ' + esc(first) + '</h1><p class="lead">' + esc(lead) + '</p>' +
      '<div class="meta">' + (p ? '<span class="chip outline plain">' + esc(p.nama_periode) + '</span><span class="chip outline plain">Dibuka sampai ' + fmtDate(p.tanggal_selesai) + '</span>' : '') +
      (total ? '<span class="chip gold plain">' + d.selesai + ' dari ' + total + ' selesai</span>' : '') + '</div></section>' +
      (total ? '<section class="journey"><div class="journey-head"><div><h2>Asesmen periode ini</h2><p class="small muted">Jawaban tersimpan otomatis di server. Kamu bisa berhenti dan melanjutkan nanti.</p></div>' +
        (printable ? '<button class="btn btn-secondary" data-all>' + icon('download') + 'Unduh profil lengkap (PDF)</button>' : '') + '</div>' +
        groups.map(g => '<h3 class="group-title">' + esc(BIDANG_LABEL[g.b] || g.b) + '</h3><div class="inst-list">' + g.items.map(row).join('') + '</div>').join('') + '</section>'
        : '<section class="card" style="margin-top:24px">' + UI.emptyState('calendar', 'Belum ada asesmen yang dibuka', 'Guru BK akan membuka periode asesmen. Riwayat hasil sebelumnya tetap dapat dilihat di menu Riwayat.', d.jumlah_riwayat ? '<a class="btn btn-secondary" href="#/siswa/riwayat">Lihat riwayat</a>' : '') + '</section>') +
      '<div class="grid grid-2" style="margin-top:24px">' + UI.notice('Hasil asesmen bukan acuan mutlak', d.disclaimer) +
      UI.notice('Jawabanmu dirahasiakan', 'Hanya kamu dan Guru BK yang dapat melihat jawaban dan hasilmu. Teman sekelas dan siswa lain tidak dapat melihatnya. Selalu tekan Keluar setelah selesai, terutama di komputer sekolah.') + '</div>' +
      '<p class="small muted" style="margin-top:12px">Ingin tahu dasar teorinya? Baca <a href="#/siswa/tentang">Tentang asesmen</a>.' + (d.kontak_bk ? ' Layanan BK: ' + esc(d.kontak_bk) + '.' : '') + '</p>';

    const all = el.querySelector('[data-all]');
    if (all) all.addEventListener('click', async () => {
      UI.busy(all, true, 'Mengambil data…');
      try {
        const h = await API.call('siswa.history');
        const pid = p ? p.assessment_period_id : '';
        const items = h.results.filter(r => r.aktif && !r.tertutup && r.metode_skor !== 'DATA' && (!pid || r.assessment_period_id === pid));
        UI.busy(all, false);
        await downloadPdf(all, items, h);
      } catch (e) { UI.busy(all, false); UI.toast(e.message, 'err'); }
    });
    return null;
  };

  /* ======================= PENGANTAR ======================= */
  Pages.siswaIntro = async function (el, params) {
    el.innerHTML = UI.skeleton(3);
    const d = await API.call('siswa.instrumentInfo', { instrument_id: params[0] });
    const i = d.instrumen;
    const open = d.tersedia && d.period && d.period.state === 'DIBUKA';
    const likert = ['DOMINAN', 'PROFIL', 'SKRINING'].indexOf(i.metode_skor) >= 0;
    const scale = likert ? i.label_skala.map((l, k) => (k + 1) + ' = ' + l).join(', ') : '';
    let box;
    if (d.status === 'SELESAI' && !d.boleh_isi_ulang) {
      box = '<p>Kamu sudah menyelesaikan asesmen ini.</p>' + (i.hasil_siswa === 'TERTUTUP' ? '' : '<a class="btn btn-primary btn-block" style="margin-top:16px" href="#/siswa/hasil/' + esc(d.result_id) + '">Lihat hasil</a>');
    } else if (!open) {
      box = '<p>Asesmen ini belum dapat diisi pada periode yang sedang berjalan.</p><a class="btn btn-secondary btn-block" style="margin-top:16px" href="#/siswa">Kembali ke beranda</a>';
    } else {
      const label = d.status === 'SEDANG' ? 'Lanjutkan mengisi' : d.status === 'SELESAI' ? (i.metode_skor === 'DATA' ? 'Perbarui data' : 'Isi ulang') : 'Mulai';
      box = '<label class="check"><input type="checkbox" data-ack> <span>' + (i.metode_skor === 'DATA' ? 'Saya mengisi data dengan benar dan memahami bahwa data ini hanya digunakan untuk layanan BK.'
        : 'Saya memahami bahwa hasil asesmen ini <b>bukan acuan mutlak</b> dan akan saya gunakan sebagai bahan refleksi.') + '</span></label>' +
        (d.status === 'SELESAI' ? '<p class="small muted" style="margin-top:12px">Jawaban baru akan menggantikan jawaban sebelumnya. Jawaban lama tetap tersimpan sebagai riwayat.</p>' : '') +
        '<button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" data-start disabled>' + esc(label) + '</button>';
    }
    const privacy = i.hasil_siswa === 'TERTUTUP'
      ? 'Jawaban dan hasil asesmen ini hanya dibaca oleh Guru BK. Kamu akan menerima tanda terima, bukan skor.'
      : i.rahasia ? 'Jawabanmu hanya dapat dilihat olehmu dan Guru BK, dan tidak disimpan di perangkat ini.' : 'Hasilmu hanya dapat dilihat olehmu dan Guru BK.';
    el.innerHTML =
      '<div class="intro-head"><a class="btn btn-ghost btn-sm" href="#/siswa" style="margin-left:-10px">' + icon('left') + 'Beranda</a>' +
      '<h1 style="margin-top:10px">' + esc(i.nama) + '</h1><p>' + esc(i.deskripsi) + '</p>' +
      '<div class="fact-strip"><span class="fact">' + icon('list') + i.jumlah_pernyataan + ' pertanyaan</span><span class="fact">' + icon('clock') + 'Sekitar ' + i.estimasi_menit + ' menit</span>' +
      '<span class="fact">' + icon(i.rahasia ? 'lock' : 'save') + (i.rahasia ? 'Rahasia' : 'Tersimpan otomatis') + '</span></div></div>' +
      '<div class="grid grid-aside" style="margin-top:26px"><div class="stack">' +
      '<section class="card card-pad"><h2>Tujuan</h2><p style="margin-top:8px">' + esc(i.tujuan) + '</p>' +
      '<h2 style="margin-top:22px">Cara mengisi</h2><p style="margin-top:8px">' + esc(i.petunjuk) + '</p>' +
      (scale ? '<p class="small muted" style="margin-top:10px">Skala jawaban: ' + esc(scale) + '.</p>' : '') + '</section>' +
      (i.dimensi.length && i.metode_skor !== 'SOSIOMETRI' ? '<section class="card card-pad"><h2>Yang dikenali</h2><div class="dim-chips" style="margin-top:12px">' +
        i.dimensi.map(dm => '<span class="dim-chip"><i style="background:' + dm.warna + '"></i>' + esc(dm.nama) + '</span>').join('') + '</div></section>' : '') +
      '<section class="card card-pad"><details class="more"><summary>Dasar teori dan rujukan</summary><p style="margin-top:12px">' + esc(i.dasar_teori) + '</p>' +
      '<ul class="refs" style="margin-top:12px">' + i.rujukan.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
      (i.catatan_penggunaan ? '<p class="small muted" style="margin-top:12px">' + esc(i.catatan_penggunaan) + '</p>' : '') + '</details></section></div>' +
      '<aside class="start-box"><div class="card card-pad"><h3>' + icon('lock').replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-2px;margin-right:6px;color:var(--gold-dark)"') + 'Kerahasiaan</h3>' +
      '<p class="small muted" style="margin-top:8px">' + esc(privacy) + '</p>' +
      (i.metode_skor !== 'DATA' ? '<h3 style="margin-top:16px">' + esc(d.disclaimer.judul) + '</h3><p class="small muted" style="margin-top:8px">' + esc(d.disclaimer.singkat) + '</p>' : '') +
      '<div style="margin-top:18px">' + box + '</div></div></aside></div>';
    const ack = el.querySelector('[data-ack]'), start = el.querySelector('[data-start]');
    if (ack) {
      ack.addEventListener('change', () => { start.disabled = !ack.checked; });
      start.addEventListener('click', async () => {
        if (d.status === 'SELESAI') {
          UI.busy(start, true, 'Menyiapkan…');
          try { await API.call('siswa.startAssessment', { instrument_id: i.instrument_id, retake: true }); }
          catch (e) { UI.toast(e.message, 'err'); UI.busy(start, false); return; }
        }
        location.hash = '#/siswa/asesmen/' + i.instrument_id + '/isi';
      });
    }
    return null;
  };

  /* ======================= KUESIONER ======================= */
  function seededOrder(list, seedText) {
    let h = 2166136261;
    for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
    let s = h >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  }
  const hasValue = v => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && !v.length);

  Pages.siswaQuiz = async function (el, params) {
    el.innerHTML = '<div class="quiz">' + UI.skeleton(2) + '</div>';
    let data;
    try {
      data = await API.call('siswa.startAssessment', { instrument_id: params[0] });
    } catch (e) {
      if (e.code === 'SESI_TIDAK_VALID') throw e;
      el.innerHTML = '<div class="quiz"><div class="card">' + UI.emptyState('calendar', 'Asesmen belum dapat diisi', e.message, '<a class="btn btn-secondary" href="#/siswa">Kembali ke beranda</a>') + '</div></div>';
      return null;
    }
    if (data.status === 'SELESAI') {
      if (data.result.tertutup) { location.replace('#/siswa'); UI.toast('Asesmen ini sudah kamu isi.', 'ok'); }
      else location.replace('#/siswa/hasil/' + data.result.result_id);
      return null;
    }

    const attempt = data.attempt;
    const inst = data.instrumen;
    const secret = !!inst.rahasia;          // jawaban rahasia tidak pernah disimpan di perangkat
    const qs = data.shuffle && inst.metode_skor !== 'DATA' ? seededOrder(data.questions.filter(q => q.tipe === 'LIKERT' || q.tipe === 'CEKLIS'), attempt.attempt_id)
      .concat(data.questions.filter(q => !(q.tipe === 'LIKERT' || q.tipe === 'CEKLIS')).sort((a, b) => a.urutan - b.urutan))
      : data.questions.slice().sort((a, b) => a.urutan - b.urutan);
    const total = qs.length;
    const nominees = data.nominees || [];
    const nomName = new Map(nominees.map(n => [n.token, n.nama]));
    const LS_DRAFT = 'lentera_draft_' + attempt.attempt_id;
    const LS_SUBMIT = 'lentera_submit_' + attempt.attempt_id;
    const SYNC_EVERY = secret ? 4 : 8, SYNC_IDLE_MS = secret ? 15000 : 45000;

    const server = data.draft || {};
    let local = null;
    if (!secret) { try { local = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null'); } catch (e) { local = null; } }
    const answers = Object.assign({}, server, (local && local.answers) || {});
    const valid = new Set(qs.map(q => q.question_id));
    Object.keys(answers).forEach(k => { if (!valid.has(k)) delete answers[k]; });
    const dirty = new Map();
    let version = 0;
    Object.keys(answers).forEach(k => { if (JSON.stringify(answers[k]) !== JSON.stringify(server[k])) dirty.set(k, ++version); });

    const isDone = q => hasValue(answers[q.question_id]);
    const required = qs.filter(q => q.wajib);
    let idx = qs.findIndex(q => !isDone(q) && q.wajib);
    if (idx < 0) idx = 0;
    let view = required.every(isDone) && Object.keys(answers).length ? 'review' : 'question';
    let syncing = false, syncState = dirty.size ? 'pending' : 'ok', lastSync = '', timer = null, submitting = false, submitMsg = '', disposed = false, filter = '';

    const persist = () => { if (secret) return; try { localStorage.setItem(LS_DRAFT, JSON.stringify({ answers: answers, savedAt: Date.now() })); } catch (e) { /* abaikan */ } };
    const doneCount = () => qs.filter(isDone).length;

    async function syncDraft(reason) {
      if (syncing || !dirty.size || submitting || (disposed && reason !== 'leave')) return;
      syncing = true; syncState = 'saving'; paintSync();
      const snapshot = Array.from(dirty.entries());
      try {
        const r = await API.call('siswa.saveDraft', { attempt_id: attempt.attempt_id, answers: snapshot.map(([q]) => ({ question_id: q, jawaban: hasValue(answers[q]) ? answers[q] : '' })) },
          { keepalive: reason === 'hidden' || reason === 'leave', timeout: 20000 });
        snapshot.forEach(([q, v]) => { if (dirty.get(q) === v) dirty.delete(q); });
        lastSync = r.saved_at ? r.saved_at.slice(11, 16) : '';
        syncState = dirty.size ? 'pending' : 'ok';
      } catch (e) {
        if (e.code === 'PERCOBAAN_SUDAH_DIKIRIM') { location.hash = '#/siswa'; return; }
        syncState = 'err';
      } finally { syncing = false; if (!disposed) paintSync(); }
    }
    function scheduleSync() {
      clearTimeout(timer);
      if (dirty.size >= SYNC_EVERY) syncDraft('batch');
      else timer = setTimeout(() => syncDraft('idle'), SYNC_IDLE_MS);
    }
    function paintSync() {
      const s = el.querySelector('[data-sync]');
      if (!s) return;
      const map = { ok: ['ok', lastSync ? 'Tersimpan di server, ' + lastSync : 'Tersimpan'], pending: ['pending', secret ? 'Belum tersimpan di server' : 'Tersimpan di perangkat'],
        saving: ['pending', 'Menyimpan ke server…'], err: ['err', secret ? 'Gagal tersimpan, coba lagi' : 'Belum tersinkron, aman di perangkat ini'] };
      const m = map[syncState];
      s.className = 'sync ' + m[0];
      s.innerHTML = '<i></i>' + esc(m[1]);
    }
    function setAnswer(qid, value, advance) {
      const was = hasValue(answers[qid]);
      if (JSON.stringify(answers[qid]) === JSON.stringify(value)) return;
      if (hasValue(value)) answers[qid] = value; else delete answers[qid];
      dirty.set(qid, ++version);
      if (syncState === 'ok') syncState = 'pending';
      persist(); scheduleSync();
      if (advance === 'render') render();
      if (advance === true) { render(); if (!was && idx < total - 1) setTimeout(() => { if (view === 'question' && qs[idx].question_id === qid) { idx++; render(); } }, 260); }
    }
    function optionsFor(q) {
      if (q.tipe === 'LIKERT') return data.scale.map(s => ({ value: s.value, label: s.label, key: s.value }));
      if (q.tipe === 'CEKLIS') return data.skala_ceklis.map((s, i) => ({ value: s.value, label: s.label, key: i + 1 }));
      if (q.tipe === 'PILIHAN') return q.opsi.map((o, i) => ({ value: o, label: o, key: i + 1 }));
      return [];
    }
    function render() {
      if (disposed) return;
      const done = doneCount();
      const pct = Math.round(done / total * 100);
      const top = '<div class="quiz-top"><div><div class="small muted">' + esc(inst.nama) + (secret ? ' · rahasia' : '') + '</div><b>' + (view === 'review' ? 'Periksa jawaban' : 'Pertanyaan ' + (idx + 1) + ' dari ' + total) + '</b></div>' +
        '<div style="text-align:right"><span data-sync class="sync"></span><div class="tiny muted">' + done + ' dari ' + total + ' terjawab</div></div></div>' +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Kemajuan pengisian"><i style="width:' + pct + '%"></i></div>';
      el.innerHTML = '<div class="quiz">' + top + (view === 'review' ? reviewHtml() : questionHtml()) + '</div>';
      paintSync(); bind();
      if (view === 'question' && qs[idx].tipe === 'NOMINASI') { const f = el.querySelector('[data-filter]'); if (f && filter) { f.focus(); f.setSelectionRange(filter.length, filter.length); } }
    }
    function questionHtml() {
      const q = qs[idx];
      const cur = answers[q.question_id];
      let body = '';
      if (q.tipe === 'TEKS') {
        body = '<label class="field" style="margin-top:20px"><span class="sr-only">Jawaban</span><textarea class="textarea" data-text maxlength="' + q.maks_karakter + '" rows="4" placeholder="Tulis jawabanmu…">' + esc(cur || '') + '</textarea>' +
          '<small class="hint">' + (q.wajib ? 'Wajib diisi.' : 'Boleh dikosongkan.') + ' Maksimal ' + q.maks_karakter + ' karakter.</small></label>';
      } else if (q.tipe === 'NOMINASI') {
        const sel = Array.isArray(cur) ? cur : [];
        const list = nominees.filter(n => !filter || n.nama.toLowerCase().includes(filter.toLowerCase()));
        body = '<p class="small muted" style="margin-top:12px">Dipilih ' + sel.length + ' dari maksimal ' + q.maks + '. Pilihanmu dirahasiakan.</p>' +
          (sel.length ? '<div class="dim-chips" style="margin-top:10px">' + sel.map(t => '<button class="dim-chip" data-unpick="' + esc(t) + '" aria-label="Batalkan ' + esc(nomName.get(t) || '') + '">' + esc(nomName.get(t) || '') + ' ' + icon('x').replace('<svg', '<svg style="width:14px;height:14px"') + '</button>').join('') + '</div>' : '') +
          '<label class="search" style="margin-top:14px"><span class="sr-only">Cari teman</span>' + icon('search') + '<input class="input" data-filter type="search" placeholder="Cari nama teman…" value="' + esc(filter) + '"></label>' +
          '<div class="options nominees" role="group" aria-label="Teman sekelas">' + (list.length ? list.map(n => {
            const on = sel.indexOf(n.token) >= 0, full = !on && sel.length >= q.maks;
            return '<button class="option" role="checkbox" aria-checked="' + on + '" data-pick="' + esc(n.token) + '"' + (full ? ' disabled' : '') + '><span class="key">' + esc(UI.initials(n.nama)) + '</span><span>' + esc(n.nama) + '</span>' + icon('check', 'check-ico') + '</button>';
          }).join('') : '<p class="muted small">Tidak ada nama yang cocok.</p>') + '</div>';
      } else {
        body = '<div class="options" role="radiogroup" aria-labelledby="qtext">' + optionsFor(q).map(o =>
          '<button class="option" role="radio" aria-checked="' + (cur === o.value) + '" data-v="' + esc(String(o.value)) + '"><span class="key">' + o.key + '</span><span>' + esc(o.label) + '</span>' + icon('check', 'check-ico') + '</button>').join('') + '</div>';
      }
      const last = idx === total - 1;
      const manual = q.tipe === 'TEKS' || q.tipe === 'NOMINASI';
      return '<section class="card q-card" aria-labelledby="qtext"><div class="q-num">Pertanyaan ' + (idx + 1) + (q.wajib ? '' : ' (boleh dikosongkan)') + '</div><p class="q-text" id="qtext">' + esc(q.teks) + '</p>' + body +
        '<div class="q-nav"><button class="btn btn-secondary" data-prev ' + (idx === 0 ? 'disabled' : '') + '>' + icon('left') + 'Sebelumnya</button>' +
        (last ? '<button class="btn btn-primary" data-review>Periksa jawaban' + icon('right') + '</button>' : '<button class="btn btn-primary" data-next>' + (manual && !isDone(q) && !q.wajib ? 'Lewati' : 'Selanjutnya') + icon('right') + '</button>') + '</div></section>' +
        '<details class="card card-pad more" style="margin-top:16px"><summary>Daftar pertanyaan dan simpan progres</summary><div class="q-grid" style="margin-top:14px">' +
        qs.map((x, i) => '<button data-go="' + i + '" class="' + (isDone(x) ? 'done ' : '') + (i === idx ? 'current' : '') + '" aria-label="Pertanyaan ' + (i + 1) + (isDone(x) ? ', terjawab' : '') + '">' + (i + 1) + '</button>').join('') +
        '</div><div class="row" style="margin-top:14px"><button class="btn btn-secondary btn-sm" data-save>' + icon('save') + 'Simpan progres sekarang</button><button class="btn btn-ghost btn-sm" data-review>Ke halaman periksa</button></div></details>' +
        (q.tipe === 'LIKERT' || q.tipe === 'PILIHAN' || q.tipe === 'CEKLIS' ? '<p class="kbd-hint hide-sm">Tekan angka untuk memilih jawaban, panah kiri dan kanan untuk berpindah.</p>' : '');
    }
    function reviewHtml() {
      const missing = qs.map((q, i) => ({ q, i })).filter(x => x.q.wajib && !isDone(x.q));
      const complete = missing.length === 0;
      return '<section class="card q-card"><h2>' + (complete ? 'Semua pertanyaan wajib sudah dijawab' : 'Masih ada ' + missing.length + ' pertanyaan yang belum dijawab') + '</h2>' +
        '<p class="muted" style="margin-top:6px">' + (complete ? (inst.hasil_siswa === 'TERTUTUP' ? 'Periksa kembali bila perlu. Setelah dikirim, jawaban tidak dapat diubah dan hanya dibaca oleh Guru BK.'
          : 'Periksa kembali bila perlu. Setelah dikirim, jawaban tidak dapat diubah dan hasilnya langsung dapat kamu unduh.') : 'Pilih nomor di bawah untuk melengkapinya.') + '</p>' +
        (complete ? '' : '<div class="q-grid" style="margin-top:16px">' + missing.map(x => '<button data-go="' + x.i + '" aria-label="Pertanyaan ' + (x.i + 1) + ' belum dijawab">' + (x.i + 1) + '</button>').join('') + '</div>') +
        '<div data-submit-msg style="margin-top:16px">' + submitMsg + '</div>' +
        '<div class="q-nav"><button class="btn btn-secondary" data-back>' + icon('left') + 'Kembali</button>' +
        '<button class="btn btn-primary btn-lg" data-submit ' + (complete && !submitting ? '' : 'disabled') + '>' + (submitting ? '<span class="spinner"></span>Mengirim…' : icon('check') + 'Kirim jawaban') + '</button></div></section>' +
        '<p class="kbd-hint">Jawaban diproses satu kali di server. Aman ditekan ulang bila koneksi terputus; tidak akan membuat data ganda.</p>';
    }
    function bind() {
      const on = (sel, fn) => el.querySelectorAll(sel).forEach(b => b.addEventListener('click', fn));
      const q = qs[idx];
      el.querySelectorAll('.option[data-v]').forEach(b => b.addEventListener('click', () => {
        const v = q.tipe === 'PILIHAN' ? b.dataset.v : Number(b.dataset.v);
        setAnswer(q.question_id, v, true);
      }));
      on('[data-pick]', e => {
        const t = e.currentTarget.dataset.pick;
        const sel = (Array.isArray(answers[q.question_id]) ? answers[q.question_id] : []).slice();
        const i = sel.indexOf(t);
        if (i >= 0) sel.splice(i, 1); else if (sel.length < q.maks) sel.push(t);
        setAnswer(q.question_id, sel, 'render');
      });
      on('[data-unpick]', e => {
        const t = e.currentTarget.dataset.unpick;
        setAnswer(q.question_id, (answers[q.question_id] || []).filter(x => x !== t), 'render');
      });
      const f = el.querySelector('[data-filter]');
      if (f) f.addEventListener('input', UI.debounce(() => { filter = f.value; render(); }, 150));
      const ta = el.querySelector('[data-text]');
      if (ta) ta.addEventListener('input', UI.debounce(() => setAnswer(q.question_id, ta.value.slice(0, q.maks_karakter)), 400));
      const flushText = () => { if (ta) setAnswer(q.question_id, ta.value.slice(0, q.maks_karakter)); };
      on('[data-prev]', () => { flushText(); if (idx > 0) { idx--; filter = ''; render(); } });
      on('[data-next]', () => { flushText(); if (idx < total - 1) { idx++; filter = ''; render(); } });
      on('[data-review]', () => { flushText(); view = 'review'; syncDraft('review'); render(); });
      on('[data-back]', () => { view = 'question'; render(); });
      on('[data-go]', e => { flushText(); idx = Number(e.currentTarget.dataset.go); view = 'question'; filter = ''; render(); });
      on('[data-save]', () => { flushText(); if (!dirty.size) { UI.toast('Semua jawaban sudah tersimpan.', 'ok'); return; } syncDraft('manual'); });
      on('[data-submit]', submit);
    }
    async function submit() {
      if (submitting || !required.every(isDone)) return;
      const ok = await UI.confirmDialog('Kirim jawaban sekarang?', '<p>Pastikan kamu menjawab sesuai keadaanmu. Setelah dikirim, jawaban <b>tidak dapat diubah</b>' + (inst.metode_skor === 'DATA' ? ' (kamu tetap bisa memperbarui data diri nanti)' : '') + '.</p>', 'Kirim jawaban');
      if (!ok || submitting) return;
      const payloadAnswers = qs.filter(isDone).map(q => ({ question_id: q.question_id, jawaban: answers[q.question_id] }));
      const sig = payloadAnswers.map(a => a.question_id + ':' + (Array.isArray(a.jawaban) ? a.jawaban.slice().sort().join('+') : a.jawaban)).sort().join(',');
      let stored = null;
      try { stored = JSON.parse(sessionStorage.getItem(LS_SUBMIT) || (secret ? 'null' : localStorage.getItem(LS_SUBMIT)) || 'null'); } catch (e) { stored = null; }
      if (!stored || stored.sig !== sig) {
        stored = { key: API.newIdempotencyKey(), sig: sig };
        try { (secret ? sessionStorage : localStorage).setItem(LS_SUBMIT, JSON.stringify(stored)); } catch (e) { /* tetap lanjut */ }
      }
      submitting = true; submitMsg = ''; clearTimeout(timer); render();
      try {
        const res = await API.callWithRetry('siswa.submitAssessment', { attempt_id: attempt.attempt_id, idempotency_key: stored.key, answers: payloadAnswers }, {
          timeout: 60000,
          onRetry: n => { const m = el.querySelector('[data-submit-msg]'); if (m) m.innerHTML = UI.alertBox('info', 'Server sedang sibuk. Mencoba mengirim lagi (' + n + ' dari 3). Jangan tutup halaman.'); },
        });
        try { localStorage.removeItem(LS_DRAFT); localStorage.removeItem(LS_SUBMIT); sessionStorage.removeItem(LS_SUBMIT); sessionStorage.setItem('lentera_just_submitted', res.result.result_id); } catch (e) { /* abaikan */ }
        disposed = true;
        if (res.result.tertutup) { sessionStorage.setItem('lentera_receipt', JSON.stringify(res.result)); location.hash = '#/siswa/hasil/' + res.result.result_id; }
        else location.hash = '#/siswa/hasil/' + res.result.result_id;
      } catch (e) {
        submitting = false;
        if (e.code === 'JAWABAN_BELUM_LENGKAP' && e.details.missing && e.details.missing.length) {
          e.details.missing.forEach(q => { delete answers[q]; });
          submitMsg = UI.alertBox('warn', esc(e.message));
        } else if (e.uncertain) {
          submitMsg = UI.alertBox('warn', '<b>Status pengiriman belum pasti.</b> ' + esc(e.message) + ' Tekan <b>Kirim jawaban</b> lagi; aman dan tidak membuat data ganda.');
        } else {
          submitMsg = UI.alertBox('err', '<b>Jawaban belum terkirim.</b> ' + esc(e.message));
        }
        render();
      }
    }
    function onKey(e) {
      if (view !== 'question' || e.target.closest('input,textarea,select') || document.querySelector('.modal-back')) return;
      const q = qs[idx];
      const opts = optionsFor(q);
      const n = Number(e.key);
      if (opts.length && n >= 1 && n <= opts.length) setAnswer(q.question_id, opts.find(o => o.key === n).value, true);
      else if (e.key === 'ArrowRight' && idx < total - 1) { idx++; filter = ''; render(); }
      else if (e.key === 'ArrowLeft' && idx > 0) { idx--; filter = ''; render(); }
    }
    function onVis() { if (document.visibilityState === 'hidden') syncDraft('hidden'); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    persist(); render();
    return function cleanup() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(timer);
      const ta = el.querySelector('[data-text]');
      if (ta && !disposed) setAnswer(qs[idx].question_id, ta.value.slice(0, qs[idx].maks_karakter));
      if (!disposed && dirty.size) { disposed = true; syncDraft('leave'); }
      disposed = true;
    };
  };

  /* ======================= HASIL ======================= */
  function receiptView(el, r, meta, opts) {
    el.classList.add('narrow');
    el.innerHTML = (opts.just ? '<div style="margin-bottom:18px">' + UI.alertBox('ok', '<b>Jawabanmu sudah tersimpan.</b>') + '</div>' : '') +
      '<section class="result-hero">' + UI.waves() + '<div class="inst">' + esc(r.instrument_nama) + '</div><h1>Terima kasih</h1>' +
      '<p class="summary">' + esc(r.ringkasan_hasil) + '</p><p class="small muted" style="margin-top:8px;position:relative">Diisi ' + fmtDate(r.tanggal_asesmen, true) + '</p>' +
      '<div class="actions"><a class="btn btn-primary btn-lg" href="#/siswa">Kembali ke beranda</a></div></section>' +
      '<div style="margin-top:20px">' + UI.notice('Dirahasiakan', 'Jawaban asesmen ini tidak ditampilkan sebagai skor dan hanya dibaca oleh Guru BK untuk membantumu. Tidak ada siswa lain yang dapat melihatnya.') + '</div>';
  }

  function resultView(el, r, meta, opts) {
    opts = opts || {};
    if (r.tertutup) return receiptView(el, r, meta, opts);
    const m = r.metode_skor;
    const isProfil = m === 'PROFIL';
    const topDims = r.dimensi.filter(x => x.teratas);
    let title = UI.headline(r), summary = '';
    if (m === 'DATA') { title = 'Data diri'; summary = 'Data ini membantu Guru BK mengenalmu. Kamu dapat memperbaruinya kapan saja selama periode dibuka.'; }
    else if (m === 'CEKLIS') { title = r.ditandai.length ? r.ditandai.length + ' hal yang kamu tandai' : 'Tidak ada yang kamu tandai'; summary = (r.instrumen.pesan_selesai || ''); }
    else if (isProfil) summary = r.instrument_id === 'RIASEC' ? 'Tiga tipe minat yang paling kamu sukai.' : r.instrument_id === 'KB' ? 'Aspek kebiasaan belajarmu yang paling kuat. Saran di bawah difokuskan pada aspek yang paling perlu ditingkatkan.'
      : r.instrument_id === 'KAR' ? 'Aspek kesiapan yang paling kuat dalam merencanakan studi lanjut dan karier.' : 'Area yang paling menonjol menurut jawabanmu.';
    else summary = topDims.length === 1 ? topDims[0].deskripsi : 'Kamu memiliki lebih dari satu kecenderungan yang hampir sama kuat. Memadukan beberapa cara belajar bisa sangat membantumu.';
    const canPdf = m !== 'DATA';
    let main = '';
    if (m === 'DATA') {
      main = '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Data yang kamu isi</h2></div><div class="table-wrap"><table class="table"><tbody>' +
        r.info.map(x => '<tr><th style="width:45%;background:transparent;font-size:.86rem;text-transform:none;letter-spacing:0;white-space:normal">' + esc(x.pertanyaan) + '</th><td>' + esc(x.jawaban) + '</td></tr>').join('') + '</tbody></table></div></section>';
    } else if (m === 'CEKLIS') {
      const groups = r.dimensi.map(d => ({ d: d, items: r.ditandai.filter(t => t.bidang === d.kode) }));
      main = '<div class="grid grid-main" style="margin-top:20px"><section class="card"><div class="card-head"><h2>Yang kamu tandai</h2></div><div class="card-body">' +
        (r.ditandai.length ? groups.filter(g => g.items.length).map(g => '<p class="label">' + esc(g.d.nama) + '</p><ul class="refs" style="margin:6px 0 14px;color:var(--ink)">' + g.items.map(t => '<li>' + esc(t.teks) + '</li>').join('') + '</ul>').join('')
          : '<p class="muted">Kamu tidak menandai satu pun pernyataan.</p>') + '</div></section>' +
        '<section class="card"><div class="card-head"><h2>Per bidang</h2><span class="small muted">jumlah ditandai</span></div><div class="card-body">' +
        UI.barsHtml(r.dimensi.map(d => ({ label: d.nama, value: d.persen, color: d.warna, text: String(d.skor) }))) + '</div></section></div>';
    } else {
      main = '<div class="grid grid-main" style="margin-top:20px">' +
        '<section class="card"><div class="card-head"><h2>' + (isProfil ? 'Profil' : 'Komposisi') + '</h2><span class="small muted">' + UI.valueLabel(r) + '</span></div><div class="card-body">' +
        (isProfil ? '<div class="chart-box"><canvas data-radar role="img" aria-label="Grafik profil ' + esc(r.instrument_nama) + '"></canvas></div>'
          : UI.barsHtml(r.dimensi.map(d => ({ label: d.nama, value: d.persen, color: d.warna, text: UI.fmtPct(d.persen) })))) + '</div></section>' +
        '<section class="card card-pad"><h2>Cara membaca hasil</h2><p class="small" style="margin-top:10px">' +
        (isProfil ? 'Indeks 0–100 menunjukkan seberapa kuat setiap aspek menurut jawabanmu: 0 berarti skor terendah yang mungkin, 100 skor tertinggi. Bandingkan aspek di dalam dirimu sendiri, bukan dengan teman.'
          : 'Persentase menunjukkan porsi tiap gaya dari keseluruhan jawabanmu. Setiap orang memakai ketiga gaya; hasil ini hanya menunjukkan yang paling nyaman saat ini.') +
        '</p><p class="small muted" style="margin-top:10px">' + esc(r.instrumen.catatan_penggunaan) + '</p></section></div>' +
        (r.info.length ? '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Rencanamu</h2></div><div class="table-wrap"><table class="table"><tbody>' +
          r.info.map(x => '<tr><td>' + esc(x.pertanyaan) + '</td><td><b>' + esc(x.jawaban) + '</b></td></tr>').join('') + '</tbody></table></div></section>' : '') +
        '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Rincian per aspek</h2></div><div class="card-body">' + UI.dimMeters(r) + '</div></section>';
    }
    el.innerHTML =
      (opts.just ? '<div style="margin-bottom:18px">' + UI.alertBox('ok', '<b>Jawabanmu sudah tersimpan.</b>' + (canPdf ? ' Unduh hasilnya sebagai PDF sekarang. Jika lupa, hasil ini selalu tersedia di menu Riwayat.' : '')) + '</div>' : '') +
      (r.aktif === false ? '<div style="margin-bottom:18px">' + UI.alertBox('info', 'Hasil ini sudah digantikan oleh pengisian ulang. Tetap disimpan sebagai riwayat.') + '</div>' : '') +
      '<section class="result-hero">' + UI.waves() + '<div class="inst">' + esc(r.instrument_nama) + '</div>' +
      (r.kode ? '<div class="holland" aria-label="Kode Holland ' + esc(r.kode) + '">' + r.kode.split('').map(c => '<span>' + esc(c) + '</span>').join('') + '</div>' : '') +
      '<h1>' + esc(title) + '</h1><p class="summary">' + esc(summary) + '</p>' +
      '<p class="small muted" style="margin-top:8px;position:relative">' + esc((meta.period && meta.period.nama_periode) || (r.period && r.period.nama_periode) || '') + ', diisi ' + fmtDate(r.tanggal_asesmen, true) + '</p>' +
      '<div class="actions">' + (canPdf ? '<button class="btn btn-primary btn-lg" data-pdf>' + icon('download') + 'Unduh hasil (PDF)</button>' : '') +
      (opts.back || '<a class="btn btn-secondary btn-lg" href="#/siswa">Kembali ke beranda</a>') + '</div></section>' +
      (r.profil_datar ? '<div style="margin-top:18px">' + UI.alertBox('info', 'Skor antaraspek relatif merata. Minat atau potensimu mungkin masih luas; jelajahi berbagai kegiatan dan diskusikan dengan Guru BK.') + '</div>' : '') +
      main +
      (r.recommendations && r.recommendations.length && m !== 'DATA' ? '<section class="card" style="margin-top:20px"><div class="card-head"><h2>Saran pengembangan diri</h2></div><div class="card-body"><div class="rec-list">' +
        r.recommendations.map(x => '<div class="rec"><h4>' + esc(x.judul) + '</h4><p>' + esc(x.deskripsi) + '</p></div>').join('') + '</div></div></section>' : '') +
      '<div class="grid grid-2" style="margin-top:20px">' + UI.notice(meta.disclaimer.judul, meta.disclaimer.singkat) +
      '<section class="panel"><details class="more"><summary>Dasar teori dan rujukan</summary><p class="small" style="margin-top:10px">' + esc(r.instrumen.dasar_teori) + '</p>' +
      '<ul class="refs" style="margin-top:10px">' + r.instrumen.rujukan.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></details></section></div>';
    if (isProfil) UI.radar(el.querySelector('[data-radar]'), r.dimensi);
    const b = el.querySelector('[data-pdf]');
    if (b) b.addEventListener('click', () => downloadPdf(b, [r], meta));
  }
  window.LenteraResultView = resultView;

  Pages.siswaResult = async function (el, params) {
    el.innerHTML = UI.skeleton(3);
    let d;
    try { d = await API.call('siswa.getResult', { result_id: params[0] }); } catch (e) {
      if (e.code === 'SESI_TIDAK_VALID') throw e;
      el.innerHTML = '<div class="card">' + UI.emptyState('file', 'Hasil tidak ditemukan', e.message, '<a class="btn btn-secondary" href="#/siswa/riwayat">Buka riwayat</a>') + '</div>';
      return null;
    }
    let just = false;
    try { just = sessionStorage.getItem('lentera_just_submitted') === params[0]; sessionStorage.removeItem('lentera_just_submitted'); sessionStorage.removeItem('lentera_receipt'); } catch (e) { /* abaikan */ }
    d.result.aktif = d.result.status_asesmen === 'FINAL';
    resultView(el, d.result, d, { just: just });
    return null;
  };

  /* ======================= RIWAYAT ======================= */
  Pages.siswaHistory = async function (el) {
    el.classList.add('narrow');
    el.innerHTML = UI.skeleton(3);
    const h = await API.call('siswa.history');
    if (!h.results.length) {
      el.innerHTML = '<div class="card">' + UI.emptyState('history', 'Belum ada hasil', 'Setelah kamu mengirim asesmen, hasilnya tersimpan di sini dan dapat diunduh kapan saja.', '<a class="btn btn-primary" href="#/siswa">Ke beranda</a>') + '</div>';
      return null;
    }
    const groups = [];
    h.results.forEach(r => {
      let g = groups.find(x => x.key === r.assessment_period_id);
      if (!g) { g = { key: r.assessment_period_id, period: r.period, items: [] }; groups.push(g); }
      g.items.push(r);
    });
    const resText = r => r.tertutup ? 'Dirahasiakan, hanya dibaca Guru BK' : r.metode_skor === 'DATA' ? 'Data diri' : r.metode_skor === 'CEKLIS' ? r.ditandai.length + ' hal ditandai'
      : (r.kode ? r.kode + ', ' : '') + UI.headline(r);
    el.innerHTML = '<div class="page-head"><div><h2>Riwayat hasil asesmen</h2><p>Semua hasilmu tersimpan di sini. Unduh kembali kapan saja, termasuk jika lupa mengunduh setelah mengisi. Hanya kamu dan Guru BK yang dapat melihatnya.</p></div></div>' +
      groups.map((g, gi) => '<section class="history-group"><div class="row between" style="margin-bottom:12px"><div><h2>' + esc(g.period ? g.period.nama_periode : 'Periode') + '</h2>' +
        '<p class="small muted">' + (g.period ? 'Tahun ajaran ' + esc(g.period.tahun_ajaran) : '') + '</p></div>' +
        (g.items.filter(x => x.aktif && !x.tertutup && x.metode_skor !== 'DATA').length > 1 ? '<button class="btn btn-secondary btn-sm" data-group="' + gi + '">' + icon('download') + 'Unduh profil lengkap</button>' : '') + '</div>' +
        '<div class="inst-list">' + g.items.map(r => '<div class="h-item"><div><div class="what">' + esc(r.instrument_nama) + (r.aktif ? '' : ' <span class="chip no plain">digantikan</span>') + (r.rahasia ? ' ' + lockChip : '') + '</div>' +
          '<div class="res">' + esc(resText(r)) + '</div><div class="tiny muted" style="margin-top:2px">Diisi ' + fmtDate(r.tanggal_asesmen, true) + '</div></div>' +
          '<div class="acts">' + (r.tertutup ? '' : '<a class="btn btn-ghost btn-sm" href="#/siswa/hasil/' + esc(r.result_id) + '">Lihat</a>') +
          (r.tertutup || r.metode_skor === 'DATA' ? '' : '<button class="btn btn-secondary btn-sm" data-one="' + esc(r.result_id) + '">' + icon('download') + 'PDF</button>') + '</div></div>').join('') +
        '</div></section>').join('') +
      '<div style="margin-top:26px">' + UI.notice(h.disclaimer.judul, h.disclaimer.singkat) + '</div>';
    el.querySelectorAll('[data-one]').forEach(b => b.addEventListener('click', () => downloadPdf(b, [h.results.find(r => r.result_id === b.dataset.one)], h)));
    el.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => downloadPdf(b, groups[Number(b.dataset.group)].items.filter(x => x.aktif && x.metode_skor !== 'DATA'), h)));
    return null;
  };

  /* ======================= TENTANG (siswa & guru) ======================= */
  Pages.about = async function (el) {
    el.classList.add('narrow');
    el.innerHTML = UI.skeleton(3);
    const a = await API.call('info.about');
    el.innerHTML =
      '<section class="greet">' + UI.waves() + '<h1>' + esc(a.nama_aplikasi) + '</h1><p class="lead">' + esc(a.kepanjangan) + (a.sekolah ? ' ' + esc(a.sekolah) : '') + '. Seperti lentera, asesmen di sini membantu menerangi langkahmu: mengenali diri, lalu merencanakan pengembangan diri bersama Guru BK.</p></section>' +
      '<section class="card card-pad" style="margin-top:22px"><h2>' + esc(a.disclaimer.judul) + '</h2><div class="prose" style="margin-top:12px">' + a.disclaimer.lengkap.map(p => '<p>' + esc(p) + '</p>').join('') + '</div></section>' +
      '<section class="card card-pad" style="margin-top:18px"><h2>Kerahasiaan</h2><div class="prose" style="margin-top:12px"><p>Jawaban dan hasilmu hanya dapat dilihat olehmu dan Guru BK. Teman, wali kelas, dan siswa lain tidak dapat membukanya.</p>' +
      '<p>Beberapa asesmen (Sosiometri dan Cek Kesejahteraan Diri) hanya dibaca Guru BK sehingga kamu menerima tanda terima, bukan skor. Pilihan teman dalam sosiometri tidak pernah ditunjukkan kepada siapa pun selain Guru BK.</p>' +
      '<p>LENTERA keluar otomatis bila tidak dipakai beberapa menit dan menghapus data sementara di perangkat saat kamu keluar. Tetap biasakan menekan Keluar setelah selesai.</p></div></section>' +
      '<h2 style="margin:30px 0 14px">Instrumen dan dasar teorinya</h2>' +
      '<div class="stack">' + a.instrumen.map(i => '<section class="card card-pad"><div class="row" style="gap:14px;align-items:flex-start"><div class="inst-ico">' + instIcon(i.instrument_id) + '</div><div class="grow">' +
        '<h3>' + esc(i.nama) + '</h3><p class="small muted" style="margin-top:4px">' + esc(i.deskripsi) + '</p>' +
        '<p style="margin-top:12px">' + esc(i.dasar_teori) + '</p>' +
        (i.dimensi.length && i.metode_skor !== 'SOSIOMETRI' ? '<div class="dim-chips" style="margin-top:12px">' + i.dimensi.map(dm => '<span class="dim-chip"><i style="background:' + dm.warna + '"></i>' + esc(dm.nama) + '</span>').join('') + '</div>' : '') +
        '<p class="label" style="margin-top:16px">Rujukan</p><ul class="refs" style="margin-top:6px">' + i.rujukan.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
        '<p class="small muted" style="margin-top:12px">' + esc(i.catatan_penggunaan) + '</p></div></div></section>').join('') + '</div>' +
      '<section class="panel" style="margin-top:22px"><p class="label">Rujukan layanan Bimbingan dan Konseling</p><ul class="refs" style="margin-top:8px">' + a.rujukan_umum.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
      (a.kontak_bk ? '<p style="margin-top:14px"><b>Layanan BK:</b> ' + esc(a.kontak_bk) + '</p>' : '') + '<p class="tiny muted" style="margin-top:14px">LENTERA versi ' + esc(a.versi) + '</p></section>';
    return null;
  };
})();

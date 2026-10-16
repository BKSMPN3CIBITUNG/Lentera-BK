/* LENTERA — pembuat PDF hasil asesmen (jsPDF, di perangkat pengguna, A4).
 * buildResultPdf(results[], meta) → unduh berkas PDF berisi satu atau beberapa hasil instrumen,
 * lengkap dengan rekomendasi, dasar teori & rujukan, serta pernyataan bahwa hasil bukan acuan mutlak.
 */
(function () {
  'use strict';
  const GOLD = [198, 160, 74], GOLD_DARK = [156, 121, 43], GOLD_INK = [132, 100, 31], SOFT = [246, 238, 216];
  const INK = [41, 41, 41], INK2 = [107, 114, 128], LINE = [227, 221, 208], TRACK = [241, 238, 231];

  const clean = s => String(s === null || s === undefined ? '' : s)
    .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/α/g, 'alpha').replace(/·/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
  const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0xC6A04A; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || '')); return m ? Number(m[3]) + ' ' + BULAN[Number(m[2]) - 1] + ' ' + m[1] + (m[4] ? ', ' + m[4] + '.' + m[5] : '') : String(s || '-'); };
  const num = (v, d) => (Math.round((Number(v) || 0) * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');

  function headline(r) {
    const names = (r.teratas || []).map(k => (r.dimensi.find(d => d.kode === k) || { nama: k }).nama);
    if (r.metode_skor === 'DOMINAN') return names.length > 1 ? 'Kombinasi ' + names.join(' & ') : (names[0] || '-');
    return names.join(', ');
  }

  async function ensureLib() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await UI.loadScript('vendor/jspdf.umd.min.js');
    return window.jspdf.jsPDF;
  }

  async function buildResultPdf(results, meta, opts) {
    results = (results || []).filter(r => r && !r.tertutup && r.hasil_siswa !== 'TERTUTUP' && r.metode_skor !== 'DATA' && r.metode_skor !== 'SOSIOMETRI');
    if (!results.length) throw new Error('Tidak ada hasil yang dapat dicetak.');
    opts = opts || {};
    const JsPDF = await ensureLib();
    const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    const W = 210, H = 297, M = 18, CW = W - 2 * M;
    let y = M;
    const color = (c, t) => { if (t === 'f') doc.setFillColor(c[0], c[1], c[2]); else if (t === 'd') doc.setDrawColor(c[0], c[1], c[2]); else doc.setTextColor(c[0], c[1], c[2]); };
    const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
    const lineH = size => size * 0.3528 * 1.42;
    const ensure = h => { if (y + h > H - 22) { doc.addPage(); y = M + 4; } };
    const text = (s, x, size, style, col, maxW, align) => {
      font(style || 'normal', size); color(col || INK);
      const lines = doc.splitTextToSize(clean(s), maxW || CW);
      const lh = lineH(size);
      lines.forEach(l => { ensure(lh); doc.text(l, x, y + lh * 0.75, align ? { align: align } : undefined); y += lh; });
    };
    const gap = h => { y += h; };
    const rule = (col, w) => { color(col || LINE, 'd'); doc.setLineWidth(w || 0.25); doc.line(M, y, W - M, y); };
    const sectionTitle = s => { ensure(16); gap(4); text(s, M, 11.5, 'bold', INK); gap(1.5); color(GOLD, 'd'); doc.setLineWidth(0.6); doc.line(M, y, M + 14, y); gap(4); };

    const st = meta.student || {};
    const multi = results.length > 1;

    // ---------- Kepala dokumen ----------
    color(GOLD, 'f'); doc.rect(0, 0, W, 2.2, 'F');
    font('bold', 9); color(GOLD_INK); doc.text('LENTERA', M, y + 2);
    font('normal', 8.5); color(INK2); doc.text(clean(meta.sekolah || ''), W - M, y + 2, { align: 'right' });
    gap(10);
    text(multi ? 'Profil Pengembangan Diri' : 'Laporan Hasil Asesmen', M, 20, 'bold', INK);
    text(multi ? 'Rangkuman hasil ' + results.length + ' instrumen asesmen Bimbingan dan Konseling' : results[0].instrument_nama, M, 11, 'normal', INK2);
    gap(5);

    // Identitas
    const idRows = [['Nama', st.nama || st.nama_siswa], ['NIS', st.nis], ['Kelas', [st.kelas, st.tingkat ? 'tingkat ' + st.tingkat : ''].filter(Boolean).join(', ')],
      ['Tahun ajaran', st.tahun_ajaran], ['Diunduh pada', tgl(meta.dibuat_pada)]];
    const boxH = idRows.length * 6.2 + 6;
    ensure(boxH);
    color(SOFT, 'f'); doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, 'F');
    let yy = y + 7;
    idRows.forEach(r => {
      font('normal', 9); color(INK2); doc.text(clean(r[0]), M + 5, yy);
      font('bold', 9.5); color(INK); doc.text(clean(r[1] || '-'), M + 40, yy);
      yy += 6.2;
    });
    y += boxH + 6;

    // Pernyataan singkat
    const d = meta.disclaimer || {};
    font('normal', 9);
    const discLines = doc.splitTextToSize(clean(d.singkat || ''), CW - 10);
    const dh = discLines.length * lineH(9) + 11;
    ensure(dh);
    color(GOLD, 'd'); doc.setLineWidth(0.35); doc.roundedRect(M, y, CW, dh, 2.5, 2.5, 'S');
    color(GOLD, 'f'); doc.rect(M, y + 3, 1.2, dh - 6, 'F');
    font('bold', 9.5); color(INK); doc.text(clean(d.judul || 'Catatan'), M + 5, y + 6);
    font('normal', 9); color(INK2); discLines.forEach((l, i) => doc.text(l, M + 5, y + 11 + i * lineH(9)));
    y += dh + 4;

    // ---------- Ringkasan (profil lengkap) ----------
    const ORDER = { DATA: 0, AKS: 1, GB: 2, KB: 3, KM: 4, RIASEC: 5, KAR: 6 };
    results = results.slice().sort((a, b) => (ORDER[a.instrument_id] || 9) - (ORDER[b.instrument_id] || 9));
    if (multi) {
      sectionTitle('Ringkasan hasil');
      results.forEach(r => {
        ensure(16);
        color(LINE, 'd'); doc.setLineWidth(0.25); doc.line(M, y, W - M, y); y += 5;
        font('normal', 8.5); color(GOLD_INK); doc.text(clean(r.instrument_nama), M, y + 1);
        font('normal', 8); color(INK2); doc.text(clean('Diisi ' + tgl(r.tanggal_asesmen)), W - M, y + 1, { align: 'right' });
        y += 5.5;
        text(r.metode_skor === 'CEKLIS' ? (r.ditandai.length + ' hal ditandai' + (r.teratas.length ? ', terbanyak: ' + headline(r) : '')) : (r.kode ? r.kode + '  -  ' : '') + headline(r), M, 12, 'bold', INK);
        y += 2;
      });
      color(LINE, 'd'); doc.line(M, y, W - M, y); y += 6;
      text('Rincian setiap instrumen, saran pengembangan diri, serta dasar teori dan rujukannya ada di halaman berikutnya.', M, 9, 'normal', INK2);
    }

    // ---------- Per hasil ----------
    results.forEach((r, idx) => {
      if (idx > 0 || multi) { doc.addPage(); y = M + 4; }
      else gap(4);
      const isProfil = r.metode_skor === 'PROFIL';
      font('bold', 9); color(GOLD_INK);
      doc.text(clean(r.instrument_nama), M, y + 3); gap(6);
      text(r.metode_skor === 'CEKLIS' ? (r.ditandai.length ? r.ditandai.length + ' hal yang kamu tandai' : 'Tidak ada yang kamu tandai') : headline(r), M, 18, 'bold', INK);
      const per = r.period ? r.period.nama_periode : (r.nama_periode || '');
      text([per, 'Diisi ' + tgl(r.tanggal_asesmen)].filter(Boolean).join('  |  ') + (r.aktif === false ? '  |  hasil ini telah digantikan oleh pengisian ulang' : ''), M, 9, 'normal', INK2);
      gap(3);

      if (r.kode) {
        ensure(18);
        r.kode.split('').forEach((ch, i) => {
          const x = M + i * 16;
          if (i === 0) { color(GOLD, 'f'); doc.roundedRect(x, y, 13, 14, 2, 2, 'F'); }
          else { color(SOFT, 'f'); color(GOLD, 'd'); doc.setLineWidth(0.4); doc.roundedRect(x, y, 13, 14, 2, 2, 'FD'); }
          font('bold', 16); color(i === 0 ? INK : GOLD_INK); doc.text(ch, x + 6.5, y + 9.8, { align: 'center' });
        });
        font('normal', 9); color(INK2); doc.text('Kode minat Holland (tiga tipe teratas)', M + 52, y + 8.5);
        y += 19;
      }
      text(r.ringkasan_hasil, M, 10, 'normal', INK);
      if (r.info && r.info.length) {
        sectionTitle(r.instrument_id === 'KAR' ? 'Rencana studi lanjut' : 'Jawabanmu');
        r.info.forEach(x => { ensure(10); text(x.pertanyaan, M, 8.8, 'normal', INK2); text(x.jawaban, M, 10, 'bold', INK); gap(1.5); });
      }
      if (r.profil_datar) { gap(1); text('Skor antardimensi relatif merata. Minat atau potensimu mungkin masih luas; jelajahi berbagai kegiatan dan diskusikan dengan Guru BK.', M, 9, 'italic', INK2); }

      const isCek = r.metode_skor === 'CEKLIS';
      sectionTitle(isCek ? 'Jumlah yang ditandai per bidang' : isProfil ? 'Profil per aspek (indeks 0-100)' : 'Komposisi gaya belajar (persentase)');
      const dims = isProfil ? r.dimensi.slice().sort((a, b) => b.persen - a.persen) : r.dimensi;
      const maxV = isProfil || isCek ? 100 : Math.max(1, ...dims.map(x => x.persen));
      dims.forEach(dm => {
        ensure(9);
        font(dm.teratas ? 'bold' : 'normal', 9.5); color(INK); doc.text(clean(dm.nama), M, y + 4);
        const bx = M + 44, bw = CW - 44 - 40;
        color(TRACK, 'f'); doc.roundedRect(bx, y + 1.4, bw, 3.6, 1.8, 1.8, 'F');
        color(hex(dm.warna), 'f'); doc.roundedRect(bx, y + 1.4, Math.max(2, bw * Math.min(1, dm.persen / maxV)), 3.6, 1.8, 1.8, 'F');
        font('bold', 9.5); color(INK); doc.text(isCek ? String(dm.skor) : isProfil ? num(dm.persen, 0) : num(dm.persen, 1) + '%', bx + bw + 4, y + 4);
        if (isProfil) { font('normal', 8); color(INK2); doc.text(clean(dm.level || ''), W - M, y + 4, { align: 'right' }); }
        y += 7.4;
      });
      gap(1);
      text(isCek ? 'Angka menunjukkan jumlah pernyataan yang kamu tandai "Ya" pada setiap bidang.' : isProfil ? 'Indeks menunjukkan posisi skor di antara skor terendah (0) dan tertinggi (100) yang mungkin pada aspek tersebut.'
        : 'Persentase dihitung dari skor tiap gaya dibandingkan jumlah skor ketiganya.', M, 8, 'normal', INK2);

      if (isCek && r.ditandai && r.ditandai.length) {
        sectionTitle('Yang kamu tandai');
        r.dimensi.forEach(dm => {
          const items = r.ditandai.filter(t => t.bidang === dm.kode);
          if (!items.length) return;
          ensure(10); text(dm.nama, M, 9.5, 'bold', INK);
          items.forEach(t => text('- ' + t.teks, M + 2, 9, 'normal', INK, CW - 2));
          gap(1.5);
        });
      }
      const top = isCek ? [] : r.dimensi.filter(x => x.teratas);
      if (top.length) {
        sectionTitle(isProfil ? 'Makna dimensi teratas' : 'Makna hasil');
        top.forEach(dm => {
          ensure(14);
          text(dm.nama, M, 10, 'bold', INK);
          text(dm.deskripsi, M, 9.2, 'normal', INK);
          if (dm.contoh_pengembangan) text('Bisa dijelajahi: ' + dm.contoh_pengembangan, M, 9, 'normal', GOLD_INK);
          gap(2);
        });
      }
      if (r.recommendations && r.recommendations.length) {
        ensure(34);
        sectionTitle('Saran pengembangan diri');
        r.recommendations.forEach(rc => {
          ensure(12);
          color(GOLD, 'f'); doc.circle(M + 1.2, y + 2.6, 0.9, 'F');
          const yStart = y;
          font('bold', 9.5); color(INK);
          const t = doc.splitTextToSize(clean(rc.judul), CW - 6); t.forEach(l => { doc.text(l, M + 5, y + 3.4); y += lineH(9.5); });
          font('normal', 9); color(INK2);
          const dsc = doc.splitTextToSize(clean(rc.deskripsi), CW - 6); dsc.forEach(l => { ensure(lineH(9)); doc.text(l, M + 5, y + 3.2); y += lineH(9); });
          void yStart; y += 2;
        });
      }
      const ins = r.instrumen || {};
      ensure(48);
      sectionTitle('Dasar teori dan rujukan');
      text(ins.dasar_teori, M, 8.8, 'normal', INK);
      if (ins.catatan_penggunaan) { gap(1.5); text(ins.catatan_penggunaan, M, 8.6, 'italic', INK2); }
      gap(1.5);
      (ins.rujukan || []).forEach(ref => text('- ' + ref, M + 2, 8.2, 'normal', INK2, CW - 2));
    });

    // ---------- Catatan penting ----------
    sectionTitle('Catatan penting tentang hasil ini');
    (d.lengkap || []).forEach(p => { text(p, M, 9, 'normal', INK); gap(1.5); });
    if (meta.kontak_bk) { gap(1); text('Layanan BK: ' + meta.kontak_bk, M, 9, 'bold', GOLD_INK); }
    gap(10); ensure(26);
    font('normal', 9); color(INK);
    doc.text('Mengetahui,', W - M - 55, y); doc.text('Guru BK', W - M - 55, y + 5);
    color(INK2, 'd'); doc.setLineWidth(0.3); doc.line(W - M - 55, y + 22, W - M, y + 22);

    // ---------- Kaki halaman ----------
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      color(LINE, 'd'); doc.setLineWidth(0.25); doc.line(M, H - 14, W - M, H - 14);
      font('normal', 7.5); color(INK2);
      doc.text(clean('LENTERA - ' + (st.nama || '') + ' (' + (st.nis || '') + ') - dibuat ' + tgl(meta.dibuat_pada) + '. Hasil asesmen bersifat membantu, bukan acuan mutlak.'), M, H - 9.5);
      doc.text(i + ' / ' + pages, W - M, H - 9.5, { align: 'right' });
    }

    const safe = s => clean(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const name = opts.filename || ('LENTERA_' + safe(st.nama || 'Siswa') + '_' + (multi ? 'Profil' : safe(results[0].instrumen && results[0].instrumen.nama_singkat || results[0].instrument_id)) + '_' + String(meta.dibuat_pada || '').slice(0, 10) + '.pdf');
    if (opts.returnBlob) return { blob: doc.output('blob'), filename: name };
    doc.save(name);
    return { filename: name };
  }

  window.LenteraPdf = { buildResultPdf: buildResultPdf };
})();

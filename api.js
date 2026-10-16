/* LENTERA — klien API ke Google Apps Script Web App.
 *
 * - Permintaan dikirim sebagai POST text/plain (tanpa header kustom) sehingga tidak memicu
 *   CORS preflight yang tidak didukung Apps Script.
 * - Token sesi disimpan di sessionStorage (hilang saat tab ditutup), tidak di localStorage.
 * - Kegagalan jaringan ditandai "uncertain": server mungkin sudah memproses permintaan.
 *   Untuk pengiriman final, frontend mengirim ulang dengan idempotency key yang SAMA.
 */
(function () {
  'use strict';
  const cfg = window.LENTERA_CONFIG || {};
  const TOKEN_KEY = 'lentera_token';
  const USER_KEY = 'lentera_user';

  class ApiError extends Error {
    constructor(code, message, opts) {
      super(message);
      this.code = code;
      this.retryable = !!(opts && opts.retryable);
      this.uncertain = !!(opts && opts.uncertain);
      this.details = (opts && opts.details) || {};
    }
  }

  const Session = {
    get token() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } },
    get user() { try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } },
    set(token, user) { try { sessionStorage.setItem(TOKEN_KEY, token); sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* abaikan */ } },
    clear() {
      try { sessionStorage.clear(); } catch (e) { /* abaikan */ }
      // Perangkat bersama (lab komputer): hapus semua draf & kunci pengiriman LENTERA di perangkat ini.
      try { Object.keys(localStorage).filter(k => k.indexOf('lentera_') === 0 || k.indexOf('sag' + 'ara_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* abaikan */ }
    },
  };

  function configured() {
    return !!cfg.API_URL && !/GANTI_DENGAN/.test(cfg.API_URL);
  }

  async function call(action, payload, opts) {
    opts = opts || {};
    if (!configured()) throw new ApiError('BELUM_DIKONFIGURASI', 'Alamat backend (API_URL) belum diatur di config.js.');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = opts.timeout || cfg.REQUEST_TIMEOUT_MS || 45000;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    let res;
    try {
      res = await fetch(cfg.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: opts.noAuth ? undefined : Session.token || undefined, payload: payload || {} }),
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        keepalive: !!opts.keepalive,
        signal: ctrl ? ctrl.signal : undefined,
      });
    } catch (e) {
      const aborted = e && e.name === 'AbortError';
      throw new ApiError('JARINGAN', aborted ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.', { retryable: true, uncertain: true });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) throw new ApiError('JARINGAN', 'Server merespons dengan status ' + res.status + '.', { retryable: true, uncertain: true });
    let json;
    try { json = await res.json(); } catch (e) {
      throw new ApiError('RESPON_TIDAK_VALID', 'Respons server tidak dapat dibaca. Pastikan Web App di-deploy dengan akses yang benar.', { retryable: true, uncertain: true });
    }
    if (!json || json.ok !== true) {
      const err = (json && json.error) || {};
      if (err.code === 'SESI_TIDAK_VALID' && !opts.noAuth) {
        Session.clear();
        window.dispatchEvent(new CustomEvent('lentera:session-expired', { detail: err.message }));
      }
      throw new ApiError(err.code || 'TIDAK_DIKETAHUI', err.message || 'Terjadi kesalahan.', { retryable: err.retryable, details: err.details });
    }
    return json.data;
  }

  /** Mengulang permintaan yang retryable dengan jeda bertahap (hanya untuk operasi idempoten). */
  async function callWithRetry(action, payload, opts) {
    opts = opts || {};
    const delays = opts.delays || [1500, 3500, 7000];
    let lastErr;
    for (let i = 0; i <= delays.length; i++) {
      try { return await call(action, payload, opts); } catch (e) {
        lastErr = e;
        if (!e.retryable || i === delays.length) throw e;
        if (opts.onRetry) opts.onRetry(i + 1, e);
        await new Promise(r => setTimeout(r, delays[i] + Math.random() * 600));
      }
    }
    throw lastErr;
  }

  function newIdempotencyKey() {
    if (window.crypto && crypto.randomUUID) return 'k_' + crypto.randomUUID().replace(/-/g, '');
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return 'k_' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }

  window.API = { call, callWithRetry, Session, ApiError, configured, newIdempotencyKey };
})();

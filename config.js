/**
 * Konfigurasi frontend LENTERA.
 * Isi API_URL dengan URL Web App Google Apps Script (berakhiran /exec).
 * File ini TIDAK boleh berisi kata sandi, token, atau Spreadsheet ID.
 */
window.LENTERA_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
  REQUEST_TIMEOUT_MS: 45000,
  // Keluar otomatis bila tidak ada aktivitas (menit). Penting untuk komputer lab yang dipakai bergantian.
  IDLE_MINUTES_SISWA: 10,
  IDLE_MINUTES_GURU: 30,
};

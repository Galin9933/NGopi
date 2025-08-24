// Nama cache Anda. Sebaiknya unik setiap kali Anda mengubah file yang di-cache.
const CACHE_NAME = 'sampit-ngopi-v1';

// Daftar file LOKAL yang akan disimpan (di-cache).
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'css/tailwind.css',
  'js/feather.min.js',
  'images/icons/icon-192x192.png',
  'images/icons/icon-512x512.png'
];

// Event 'install': Dijalankan saat service worker pertama kali didaftarkan.
self.addEventListener('install', event => {
  // Tunggu sampai proses instalasi selesai.
  event.waitUntil(
    caches.open(CACHE_NAME) // Buka cache dengan nama yang kita definisikan.
      .then(cache => {
        console.log('Cache berhasil dibuka');
        return cache.addAll(urlsToCache); // Tambahkan semua file dalam daftar ke cache.
      })
  );
});

// Event 'fetch': Dijalankan setiap kali ada permintaan jaringan dari halaman.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request) // Coba cari permintaan ini di dalam cache.
      .then(response => {
        // Jika ditemukan di cache, kembalikan dari cache.
        if (response) {
          return response;
        }
        // Jika tidak ditemukan, lanjutkan permintaan ke jaringan seperti biasa.
        return fetch(event.request);
      }
    )
  );
});
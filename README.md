# Retro Lobby Online — prototipe realistis

Proyek Node.js dengan room online sungguhan (server Socket.IO), kode room acak yang dibuat di server, maksimal 2 pemain, status kehadiran, dan chat room. Ada panel EmulatorJS yang memuat ROM `.gba` yang dipilih dari perangkat pemain; ROM tidak dikirim ke server.

## Penting: apa yang sudah dan belum berfungsi

**Sudah diimplementasikan**
- Server room online dengan Socket.IO.
- Host membuat room; pemain lain bergabung memakai kode room.
- Maksimal dua pemain per room.
- Daftar pemain, status lobby, chat, salin undangan, health check `/health`.
- Panel emulator browser berbasis EmulatorJS untuk uji single-player dengan file `.gba` lokal.

**Belum diimplementasikan / tidak boleh dianggap berfungsi**
- Game Pokémon Quetzal tidak disinkronkan antar browser.
- Trade, battle, dan co-op Quetzal tidak berjalan melalui room website ini.
- Tombol “Siapkan Sesi” hanya mengubah status lobby; bukan memulai sesi multiplayer emulator.
- EmulatorJS di browser tidak otomatis kompatibel dengan mekanisme multiplayer Quetzal/RetroArch Netplay. Website ini tidak mengontrol RetroArch di perangkat.
- Tidak ada upload/hosting ROM di server.

Untuk Quetzal, ikuti panduan online yang disediakan proyek: https://www.pkmnquetzal.top/en/online-tutorial/online-tutorial.html. Jangan menganggap RetroArch Netplay biasa cukup sebelum kompatibilitas core dan fitur Quetzal dipastikan.

## Jalankan lokal di Windows

1. Instal Node.js 20 atau lebih baru: https://nodejs.org/
2. Ekstrak ZIP.
3. Buka folder `retro-lobby-online` di VS Code.
4. Buka Terminal di VS Code dan jalankan:
   ```bash
   npm install
   npm start
   ```
5. Buka `http://localhost:3000`.
6. Tes room: buka halaman di dua browser/perangkat yang bisa mengakses server lokal. Untuk mengetes HP di Wi-Fi yang sama, buka `http://IP-PC:3000`; izinkan Node.js pada jaringan privat Windows Firewall jika diminta. Ini hanya tes lokal, belum internet publik.

## Deploy server online (Render)

1. Buat repository GitHub baru dan upload semua isi folder proyek ini (termasuk `server.js`, `package.json`, `public/`, dan `render.yaml`).
2. Buat akun di https://render.com/ lalu pilih **New → Blueprint** dan hubungkan repository.
3. Render membaca `render.yaml` dan membuat web service Node.
4. Setelah deploy selesai, buka URL `https://...onrender.com`. Bagikan URL tersebut ke teman.
5. Free instance Render dapat tidur saat tidak aktif dan butuh waktu bangun. Untuk server yang selalu aktif, pilih paket hosting yang tidak tidur; biaya/ketentuan mengikuti provider saat deploy.
6. Tes `/health`, lalu buat room dari satu browser dan join dari browser kedua.

## Batasan hosting dan keamanan

- Room disimpan di memori proses; room hilang ketika service restart/deploy atau tidur.
- Tidak ada akun, moderasi, atau password room. Jangan pakai untuk data sensitif.
- Prototipe hanya mendukung dua pemain.
- Chat dibatasi panjangnya, tetapi belum ada sistem report/rate-limit tingkat produksi.
- EmulatorJS dimuat dari CDN pihak ketiga; memerlukan internet dan browser kompatibel. Pastikan penggunaan ROM sesuai hak yang kamu miliki dan aturan setempat.
- Jangan upload ROM Pokémon ke GitHub atau server publik.
- Untuk produksi, tambahkan Redis/penyimpanan persisten, rate limiting, room password, dan pemantauan.

## Tahap teknis agar multiplayer Quetzal benar-benar terjadi

1. Verifikasi panduan dan metode multiplayer resmi Quetzal, core yang didukung, dan kompatibilitas PC ↔ Android.
2. Jika Quetzal memerlukan RetroArch Netplay, room web harus tetap diperlakukan sebagai sistem undangan/koordinasi kecuali tersedia integrasi resmi atau protokol kompatibel yang terdokumentasi.
3. Browser emulator perlu dukungan netplay sinkron yang kompatibel dengan Quetzal—tidak cukup hanya mengirim input lewat Socket.IO. Emulator deterministik harus menjalankan ROM/core/build yang sama, menyamakan timing dan state, menangani rollback/latensi, serta mendukung protokol multiplayer game. Implementasi ini belum ada di proyek.
4. Jangan membangun sinkronisasi ad hoc sebelum metode Quetzal dipastikan; itu berisiko membuat desync atau save rusak.

## Struktur

- `server.js` — HTTP server + Socket.IO room service
- `public/index.html` — UI
- `public/style.css` — tampilan responsif
- `public/app.js` — room client, chat, dan loader EmulatorJS
- `render.yaml` — konfigurasi deployment Render
- `package.json` — dependensi Node

## Referensi

- Pokémon Quetzal online tutorial: https://www.pkmnquetzal.top/en/online-tutorial/online-tutorial.html
- Node.js: https://nodejs.org/
- Render Blueprint: https://render.com/docs/blueprint-spec
- EmulatorJS: https://emulatorjs.org/

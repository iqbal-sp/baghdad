# Baghdad — Heart of the Golden Age

Implementasi dua section dari Figma — hero [node 108:13408](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=108-13408) dan story [node 122:14](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=122-14) (keduanya di section [108:13541](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=108-13541)) dengan state hover [node 37:6780](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=37-6780) — menggunakan HTML, CSS, dan JavaScript murni. Tidak membutuhkan npm, framework, CDN, atau proses build.

## Online

- Situs: https://baghdad-9m2.pages.dev (Cloudflare Pages, project `baghdad`)
- Repo: https://github.com/iqbal-sp/baghdad

Deploy ulang setelah commit (hanya file yang ter-commit yang diunggah):

```sh
rm -rf /tmp/baghdad-dist && mkdir /tmp/baghdad-dist && git archive HEAD | tar -x -C /tmp/baghdad-dist
npx wrangler@4.149.0 pages deploy /tmp/baghdad-dist --project-name baghdad --branch main
```

## Menjalankan

1. Ekstrak folder `baghdad` dari ZIP.
2. Buka Terminal di dalam folder tersebut.
3. Jalankan:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

4. Buka [http://127.0.0.1:8000](http://127.0.0.1:8000).
5. Tekan `Ctrl+C` di Terminal untuk menghentikan server.

Di macOS, tersedia juga `start.command`. Jika port 8000 sudah digunakan, ganti angka port pada perintah di atas. VS Code Live Server atau server statis lain juga dapat digunakan.

Gunakan server lokal, bukan membuka `index.html` melalui `file://`: browser membatasi JavaScript modules pada berkas lokal. Setelah disajikan melalui localhost, semua gambar, SVG, font, dan kode tersedia lokal tanpa koneksi internet.

## Isi folder

```text
baghdad/
├── index.html                  Markup semantik dan isi section
├── styles.css                  Token warna, font, layout, dan responsivitas
├── script.js                   Inisialisasi journey, interaksi hero, dan hover periode
├── start.command               Shortcut server lokal untuk macOS
├── assets/
│   ├── hero/                  Atmosfer, ilustrasi, bingkai emas (WebP transparan), tiga merpati
│   ├── story/                 Dua mural bunga (SVG), tekstur bercak, tiga gambar periode, garis detail
│   └── fonts/                 Svetze, DM Sans, Aref Ruqaa Ink, Michelangelus, Public Sans
├── lib/
│   ├── journey.js             Scroll horizontal, fade, parallax
│   ├── hero-interaction.js    Tilt lengkung, lentera, dan kilau emas mengikuti kursor
│   ├── periods.js             State hover/fokus periode
│   ├── smoke.js               Asap WebGL di sambungan hero → story
│   └── vendor/lenis/          Lenis 1.3.26 (smooth scroll, MIT), disalin lokal
└── IMPLEMENTATION.md          Pemetaan desain dan catatan teknis
```

## Perilaku

- **Desktop saja untuk saat ini.** Layout responsif dinonaktifkan; `html` memiliki lebar minimum 1024px. Hero dan story adalah artboard 1440 × 1024 yang diskalakan agar muat di viewport; artboard hero ditambatkan ke tepi bawah sehingga lengkung selalu menyentuh bawah layar.
- **Scroll ke samping.** Scroll vertikal menggeser track dari hero ke story. Klik indikator Scroll pada hero, atau buka `#story`, untuk langsung ke story.
- **Smooth scroll** memakai Lenis yang disertakan lokal (tanpa CDN). Lenis otomatis kembali ke scroll native bila `prefers-reduced-motion` aktif.
- **Asap di sambungan.** Saat bergeser, asap hangat (shader WebGL, fBm dengan domain warping) bergulung mengikuti tepi antara hero dan story; kekuatannya puncak di tengah transisi dan nol saat diam, sehingga kedua section tetap sama dengan Figma. Grain story (6%) menjadi satu lapisan untuk kedua panel dan muncul bertahap. Tanpa WebGL atau dengan `prefers-reduced-motion`, transisi kembali ke fade biasa.
- **Fade warna, lalu mural.** Saat bergeser, tepi kanan hero larut menjadi transparan di atas latar story `#170601`, lalu seluruh hero meredup. Saat story ±70% masuk, dua mural bunga arabesque menjalar keluar dari sudut kiri atas dan kanan bawah: batang tergambar dari sudut, cabang menyusul, lalu daun, bunga, dan palmette muncul satu per satu ketika ujung sulur melewatinya (±2,3 detik); saat sebuah periode dibuka, mural meredup agar detailnya terbaca.
- **Parallax.** Setiap gambar periode bergerak dengan kedalaman berbeda (`--depth` di `index.html`) dan tepat berada di posisi Figma ketika transisi selesai.
- **Hover/fokus gambar** menampilkan detail periodenya di posisi tetap (666, 840), sesuai section Figma 37:8667. Gambar aktif terangkat dan dua lainnya meredup; garis detail tergambar lebih dulu, lalu label, judul, dan ringkasan muncul berurutan. Saat berpindah gambar, detail lama keluar dulu sebelum yang baru masuk, dan detail bertahan 350ms setelah kursor keluar (`lib/periods.js`).
- **Hero lengkung emas** (Figma 108:13408): ilustrasi di-clip dengan path lengkung dari Figma, lalu bingkai emas berukir dipasang di atasnya sebagai gambar transparan (`assets/hero/frame.webp`, render dari Figma). Cahaya (lima berkas sinar dari kiri atas) dan debu emas mengikuti layer Figma.
- **Merpati hidup.** Tiga merpati terbang masuk saat halaman dibuka, lalu masing-masing melayang di jalurnya sendiri dengan durasi berbeda (9 s, 10,5 s, 13 s). Debu bergerak pelan dalam tiga lapis kedalaman dan sinar "bernapas" halus.
- **Animasi masuk hero** (CSS saja): langit, lengkung, judul (spasi huruf merapat), label, dan kolom teks muncul berurutan; tombol Scroll (di bawah paragraf kiri) muncul terakhir. Panah Scroll berulang meluncur ke kanan, menghilang, lalu masuk lagi dari kiri, diikuti cincin yang memudar keluar (siklus 2,4 s), sebagai tanda konten berikutnya ada di samping. Saat hover, lingkaran membesar 1,15× dengan isi krem dan label bergeser 3px.
- **Interaksi kursor di hero** (`lib/hero-interaction.js`, hanya pointer halus/mouse): lengkung emas miring 3D mengikuti kursor (maks 3° / 2°) sementara lukisan bergeser berlawanan di dalam jendelanya (parallax, gambar diperbesar 4% agar tepinya tidak terlihat). Cahaya lentera hangat (blend screen) mengikuti kursor di atas lukisan sementara bagian yang jauh sedikit meredup, dan kilau lembut (color-dodge, di-mask ke bentuk bingkai) bergeser di atas emas. Semua nilai di-ease dalam satu loop rAF yang berhenti saat diam; efek hilang perlahan saat kursor keluar.
- **Story berlapis:** baris judul "Three" / "Golden Ages", label "The story", dan gambar bergerak dengan kedalaman parallax berbeda (`--depth`). Tiap gambar punya badge angka I–III, dan ada petunjuk "Hover an image to enter its age" di kiri bawah.
- `prefers-reduced-motion` mematikan semua animasi, transisi, parallax, dan easing scroll.

## Melanjutkan pengembangan

Konten periode ada di `index.html` (`.period`). Copy ketiga periode mengikuti Figma 37:8667. Figma tidak menandai gambar mana yang di-hover; pasangan gambar–periode (kota bundar → I, cendekiawan menulis → II, cendekiawan di taman → III) adalah asumsi berdasarkan isi gambar. Mural dibuat ulang dari kode generator yang sama dengan di Figma dan di-inline di `index.html` agar tiap batang dan daun bisa dianimasikan; salinan berkasnya ada di `assets/story/mural-*.svg`. Waktu tumbuh tersimpan di elemen (`--s`/`--t` untuk batang, `--d` untuk daun dan bunga). Posisi gambar diatur lewat `--x`/`--y`, dan kekuatan parallax lewat `--depth`. Panjang scroll transisi diatur oleh `height` pada `.journey`.

## Verifikasi

Diuji di Chrome pada 1440 × 1024, 1440 × 900, 1280 × 1024, dan 1920 × 1080: posisi hero dan story cocok dengan geometri Figma, keadaan hover "Foundations" cocok dengan node 37:6780, dan tidak ada error konsol. Ukuran mobile/tablet, Safari, dan Firefox belum diverifikasi. Lapisan "Grain" di Figma kosong saat diekspor sehingga tidak diimplementasikan. Font Svetze (judul hero) dan Michelangelus disalin dari font terinstal; lisensi web keduanya belum diverifikasi. DM Sans dan Aref Ruqaa Ink berlisensi OFL (lihat `assets/fonts/*-OFL.txt`).

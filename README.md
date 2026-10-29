# Baghdad — Heart of the Golden Age

Implementasi dua section dari Figma — hero [node 37:646](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=37-646) dan story [node 47:10](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=47-10) dengan state hover [node 37:6780](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=37-6780) — menggunakan HTML, CSS, dan JavaScript murni. Tidak membutuhkan npm, framework, CDN, atau proses build.

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
├── script.js                   Inisialisasi efek latar dan journey
├── start.command               Shortcut server lokal untuk macOS
├── assets/
│   ├── baghdad-panorama.png    Gambar latar asli Figma
│   ├── baghdad-illustration.png Ilustrasi asli Figma
│   ├── illustration-mask.svg  Masker lingkaran asli
│   ├── scroll-line.svg        Garis asli indikator Scroll
│   ├── arrow-down.svg         Ikon asli indikator Scroll
│   ├── story/                 Tekstur, tiga gambar periode, garis detail
│   └── fonts/                 Michelangelus dan Public Sans
├── lib/
│   ├── dither-renderer.js     Penghubung shader ke JavaScript murni
│   ├── journey.js             Scroll horizontal, fade, parallax
│   ├── periods.js             State hover/fokus periode
│   ├── vendor/lenis/          Lenis 1.3.26 (smooth scroll, MIT), disalin lokal
│   └── custom-effects/        Sumber shader Figma dan versi JavaScript
└── IMPLEMENTATION.md          Pemetaan desain dan catatan teknis
```

## Perilaku

- **Desktop saja untuk saat ini.** Layout responsif dinonaktifkan; `html` memiliki lebar minimum 1024px. Section story adalah artboard 1440 × 1024 yang diskalakan agar muat di viewport.
- **Scroll ke samping.** Scroll vertikal menggeser track dari hero ke story. Klik indikator Scroll pada hero, atau buka `#story`, untuk langsung ke story.
- **Smooth scroll** memakai Lenis yang disertakan lokal (tanpa CDN). Lenis otomatis kembali ke scroll native bila `prefers-reduced-motion` aktif.
- **Fade warna, lalu tekstur.** Saat bergeser, tepi kanan hero larut menjadi transparan di atas latar `#13100e` (mask yang melebar perlahan dari 0px), lalu seluruh hero meredup. Story dimulai dari `#13100e` polos dan isinya muncul perlahan, sehingga tidak ada garis sambungan. Setelah story berhenti, tekstur ornamen dan vignette muncul (2,6 detik). Latar halaman juga `#13100e` dan overscroll dimatikan agar tidak ada kilatan putih saat bounce.
- **Parallax.** Setiap gambar periode bergerak dengan kedalaman berbeda (`--depth` di `index.html`) dan tepat berada di posisi Figma ketika transisi selesai.
- **Hover/fokus gambar** menampilkan detail periodenya di posisi tetap (666, 840), sesuai section Figma 37:8667. Gambar aktif terangkat dan dua lainnya meredup; garis detail tergambar lebih dulu, lalu label, judul, dan ringkasan muncul berurutan. Saat berpindah gambar, detail lama keluar dulu sebelum yang baru masuk, dan detail bertahan 350ms setelah kursor keluar (`lib/periods.js`).
- **Animasi masuk hero** (CSS saja): latar, kartu, judul, dan paragraf muncul berurutan, ilustrasi sedikit zoom-out, dan garis Scroll tergambar dari kiri. Panah Scroll berdenyut halus setiap 3 detik dan membesar saat hover.
- **Story berlapis:** baris judul, label "The story", dan gambar bergerak dengan kedalaman parallax berbeda (`--depth`); tekstur menyebar dari tengah ke tepi.
- `prefers-reduced-motion` mematikan semua animasi, transisi, parallax, dan easing scroll.
- Efek Bayer 16×16 pada hero memakai shader Figma melalui WebGPU, dengan fallback Canvas.

## Melanjutkan pengembangan

Konten periode ada di `index.html` (`.period`). Copy ketiga periode mengikuti Figma 37:8667. Figma tidak menandai gambar mana yang di-hover; pasangan gambar–periode (kota bundar → I, cendekiawan menulis → II, cendekiawan di taman → III) adalah asumsi berdasarkan isi gambar. Posisi gambar diatur lewat `--x`/`--y`, dan kekuatan parallax lewat `--depth`. Panjang scroll transisi diatur oleh `height` pada `.journey`.

## Verifikasi

Diuji di Chrome pada 1440 × 1024 dan 1440 × 900: posisi hero dan story cocok dengan geometri Figma, keadaan hover "Foundations" cocok dengan node 37:6780, dan tidak ada error konsol. Ukuran mobile/tablet, Safari, dan Firefox belum diverifikasi. Lapisan "Grain" di Figma kosong saat diekspor sehingga tidak diimplementasikan.

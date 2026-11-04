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
│   ├── story/                 Dua mural bunga (SVG), tekstur bercak, tiga gambar periode (kota bundar juga dipakai bab Periode I), garis detail, dua lukisan adegan Periode I
│   ├── foundations/           Tekstur grunge dan cat tinta bab Periode I
│   └── fonts/                 Svetze dan DM Sans (hanya dua font), WOFF2
├── lib/
│   ├── journey.js             Segmen scroll: geser ke story, jeda, dive, baca bab
│   ├── dive.js                Zoom ke kartu Periode I dan pembukaan bab Foundations
│   ├── heading-reveal.js      Animasi teks bab dan intro Adegan 3: meta, judul per huruf, intro per kata
│   ├── hero-interaction.js    Parallax lukisan (scroll + kursor), lentera, kilau emas
│   ├── hero-smoke.js          Asap hero yang mengalir (WebGL di atas foto atmosfer)
│   ├── hero-layout.js         Skala dan posisi lengkung hero di layar portrait
│   ├── periods.js             State hover/fokus periode
│   ├── scenes.js              Animasi masuk dan parallax adegan Periode I
│   ├── navbar.js              Navbar yang muncul mulai adegan 1
│   ├── city-intro.js          Adegan 3: transisi putih → titik "i" dan heading intro
│   ├── city-draw.js           Adegan 3: denah digambar dengan jangka saat penjelajah datang
│   ├── city.js                Adegan 3: denah Round City yang menempel selama 4 langkah
│   ├── round-city-plan.js     Generator denah Round City (sama dengan di Figma)
│   ├── smoke.js               Asap WebGL di sambungan hero → story
│   └── vendor/lenis/          Lenis 1.3.26 (smooth scroll, MIT), disalin lokal
└── IMPLEMENTATION.md          Pemetaan desain dan catatan teknis
```

## Perilaku

- **Responsif, dibangun per section.** Lebar minimum 1024px pada `html` sudah dihapus. Hero dan story adalah artboard 1440 × 1024 yang diskalakan agar muat di viewport; artboard hero ditambatkan ke tepi bawah sehingga lengkung selalu menyentuh bawah layar. Section yang belum dikerjakan versi mobile-nya (story ke bawah) untuk sementara tampil sebagai artboard yang diperkecil.
- **Hero di layar portrait** (ponsel dan tablet tegak, `max-aspect-ratio: 4/5`; `lib/hero-layout.js`): artboard diskalakan ke lebar bingkai emas (894px artboard + 10px tiap sisi), lengkung diangkat dari tepi bawah dan kakinya memudar (mask) ke latar asap. "BAGHDAD" selebar layar (maks. 180px) menimpa lengkung di ketinggian yang sama dengan desktop, label tetap di langit lengkung (min. 10px). Di bawahnya satu kolom: baris meta bergaya sub-heading Foundations ("The journey ★ —— ★ 762 — 1258"), satu paragraf gabungan, lalu tombol Scroll. Sisa tinggi layar dibagi 70% untuk langit (merpati dipindah ke atas lengkung) dan 30% untuk jarak di bawah lengkung. Jarak bawah ditambah `100vh − 100svh` agar Scroll tidak tertutup toolbar browser ponsel.
- **Hero di ponsel landscape / layar pendek:** kolom teks tidak pernah lebih kecil dari 12px (label 10px) karena diperbesar dari sudut bawahnya; pada landscape dengan tinggi ≤ 540px kedua kolom pindah ke tepi layar agar tidak menimpa lengkung.
- **Hover hanya di perangkat ber-hover.** Efek hover tombol Scroll dibungkus `@media (hover: hover)` sehingga tidak "tersangkut" setelah tap; interaksi kursor hero (lentera, kilau, parallax kursor) memang hanya aktif untuk pointer halus.
- **Scroll ke samping.** Scroll vertikal menggeser track dari hero ke story. Klik indikator Scroll pada hero, atau buka `#story`, untuk langsung ke story.
- **Smooth scroll** memakai Lenis yang disertakan lokal (tanpa CDN). Lenis otomatis kembali ke scroll native bila `prefers-reduced-motion` aktif.
- **Asap di sambungan.** Saat bergeser, asap hangat (shader WebGL, fBm dengan domain warping) bergulung mengikuti tepi antara hero dan story; kekuatannya puncak di tengah transisi dan nol saat diam, sehingga kedua section tetap sama dengan Figma. Grain story (6%) menjadi satu lapisan untuk kedua panel dan muncul bertahap. Tanpa WebGL atau dengan `prefers-reduced-motion`, transisi kembali ke fade biasa.
- **Fade warna, lalu mural.** Saat bergeser, tepi kanan hero larut menjadi transparan di atas latar story `#170601`, lalu seluruh hero meredup. Saat story ±70% masuk, dua mural bunga arabesque menjalar keluar dari sudut kiri atas dan kanan bawah: batang tergambar dari sudut, cabang menyusul, lalu daun, bunga, dan palmette muncul satu per satu ketika ujung sulur melewatinya (±2,3 detik); saat sebuah periode dibuka, mural meredup agar detailnya terbaca.
- **Masuk ke Periode I (Foundations, Figma 126:13542).** Setelah story diam, scroll lagi (jeda 30vh lebih dulu) membuat kamera maju ke dalam story: semua elemen story membesar dari satu titik hilang dan memudar, sementara kartu Periode I terbang ke depan jauh lebih cepat sehingga keduanya saling mendekat. Selama zoom hanya lukisan yang terlihat. Kartu mendarat tepat di lukisan besar bab ini (file gambar yang sama, jadi tanpa crossfade), dan saat kartu hampir mendarat teks bab mulai muncul (hairline tergambar dari tengah, bintang berputar masuk, label meluncur dari tepi, judul naik huruf demi huruf, intro kata demi kata), bersamaan dengan latar bab yang mulai terbuka perlahan dari tepi lukisan sampai penuh layar dengan tepi lembut (feather) dan sudut membulat, tepi atas lebih dulu lalu sisi menyusul. Scroll sedikit lagi menggeser sisa 235px desain ke atas. Klik kartu I atau buka `#foundations` untuk langsung ke bab ini. Dengan `prefers-reduced-motion`, bab hanya crossfade.
- **Adegan Periode I** (Figma [153:14207](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=153-14207) dan [158:91](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=158-91)): setelah bab Foundations selesai, scroll berikutnya membuat bab terangkat ke atas (dengan bayangan tipis di tepi bawahnya) dan "A new centre for a new dynasty" muncul dari belakangnya: adegan itu sudah menunggu di bawah bab, mula-mula sedikit redup dan sedikit lebih rendah, lalu perlahan terang dan naik ke tempatnya saat bab hilang. Setelah itu, saat menuju "A river, a route, a decision", section itu naik sedikit lebih cepat dan menimpa ruang kosong di bawah lukisan adegan pertama, lalu berhenti tepat di tepi bawah lukisannya. Tiap bagian muncul sekali saat terlihat dan tidak lagi tertutup bab: penanda dan teks naik, judul naik kata demi kata, lukisan terbuka dari tepi bawah, dan angka "762" naik dari garis dasarnya. Lukisan adegan pertama bergeser di dalam bingkainya (parallax, seperti dilihat dari jendela) begitu adegan mulai scroll, dan lukisan sungai naik dari bawah melewati angka "762" saat section dilewati. Keduanya meluncur dengan inersia lembut dan berhenti perlahan setelah scroll berhenti. Bisa dibuka langsung lewat `#new-centre` dan `#river-route-decision`.
- **Adegan 3, "A city drawn as a circle"** (Figma "Scene 3 — B final"): intro yang menempel sebentar (putih adegan 2 mengecil menjadi lingkaran yang mendarat sebagai titik huruf "i" pada "city", lalu heading muncul seperti heading Foundations), lalu titik itu jatuh ke pusat denah dan denah digambar dengan jangka dari pusat ke luar, lalu denah Round City menempel di tengah layar selama empat langkah scroll, dari luar ke dalam: Walls → Gates → Mosque → Palace. Tiap langkah menyalakan bagiannya (yang lain meredup), memperbesar lensa 1,5× ke pusat kota untuk Mosque dan Palace, menambah lingkar progres seperempat, memutar bintang kompas, memunculkan siku fokus dan medali nomor, dan mengganti panel penjelasan di kanan. Ada detail kecil per langkah: kilau air di parit dan menara yang menyala berurutan, kubah gerbang dan "pelancong" di jalan utama, cahaya di barisan tiang masjid, serta lingkar cahaya dari kubah istana dan jalur prosesi yang mengalir ke istana. Nama bagian di kiri adalah tombol untuk lompat ke langkahnya. Bisa dibuka lewat `#round-city`.
- **Navbar.** Mulai adegan 1 ("A new centre for a new dynasty") ke bawah, navbar turun masuk: "Baghdad" (DM Sans Medium 16, kembali ke atas halaman) di kiri dan "Menu" (DM Sans Medium 16, huruf besar) di kanan, space-between dengan padding kiri-kanan 60px. Warnanya putih dengan `mix-blend-mode: difference`, jadi gelap di atas adegan terang dan terang di atas adegan gelap. Tidak tampil di hero, story, dan bab Foundations. Tombol Menu belum membuka apa pun.
- **Parallax.** Setiap gambar periode bergerak dengan kedalaman berbeda (`--depth` di `index.html`) dan tepat berada di posisi Figma ketika transisi selesai.
- **Hover/fokus gambar** menampilkan detail periodenya di posisi tetap (666, 840), sesuai section Figma 37:8667. Gambar aktif terangkat dan dua lainnya meredup; garis detail tergambar lebih dulu, lalu label, judul, dan ringkasan muncul berurutan. Saat berpindah gambar, detail lama keluar dulu sebelum yang baru masuk, dan detail bertahan 350ms setelah kursor keluar (`lib/periods.js`).
- **Hero lengkung emas** (Figma 108:13408): ilustrasi di-clip dengan path lengkung dari Figma, lalu bingkai emas berukir dipasang di atasnya sebagai gambar transparan (`assets/hero/frame.webp`, render dari Figma). Cahaya (lima berkas sinar dari kiri atas) dan debu emas mengikuti layer Figma.
- **Merpati hidup.** Tiga merpati terbang masuk saat halaman dibuka, lalu masing-masing melayang di jalurnya sendiri dengan durasi berbeda (9 s, 10,5 s, 13 s). Debu bergerak pelan dalam tiga lapis kedalaman dan sinar "bernapas" halus.
- **Animasi masuk hero** (CSS saja): langit, lengkung, judul (spasi huruf merapat), label, dan kolom teks muncul berurutan; tombol Scroll (di bawah paragraf kiri) muncul terakhir. Panah Scroll berulang meluncur ke kanan, menghilang, lalu masuk lagi dari kiri, diikuti cincin yang memudar keluar (siklus 2,4 s), sebagai tanda konten berikutnya ada di samping. Saat hover, lingkaran membesar 1,15× dengan isi krem dan label bergeser 3px.
- **Asap yang bergerak.** Tekstur asap hero (atmosfer, color-dodge) digambar ulang dengan WebGL (`lib/hero-smoke.js`): foto yang sama ditekuk oleh noise yang mengalir pelan, sehingga gumpalan asap bergulung, menebal dan menipis di tempatnya tanpa mengubah komposisi Figma. Loop berhenti saat story sudah terlihat penuh. Tanpa WebGL atau dengan `prefers-reduced-motion`, foto diam tetap dipakai.
- **Parallax lukisan saat scroll** (`lib/hero-interaction.js`): saat hero bergeser ke story, lukisan di dalam bingkai tertinggal dari bingkainya (hingga 16% dari geseran), seolah dilihat lewat jendela. Objek lain (judul, merpati, debu, teks) tidak ikut bergeser. Aktif juga tanpa mouse; mati dengan `prefers-reduced-motion`.
- **Interaksi kursor di hero** (`lib/hero-interaction.js`, hanya pointer halus/mouse): bingkai emas tetap diam (tanpa tilt, agar tepinya tidak terangkat dari tepi layar) sementara lukisan bergeser sedikit berlawanan kursor di dalam jendelanya (parallax, gambar diperbesar 4% agar tepinya tidak terlihat). Cahaya lentera hangat (blend screen) mengikuti kursor di atas lukisan sementara bagian yang jauh sedikit meredup, dan kilau lembut (color-dodge, di-mask ke bentuk bingkai) bergeser di atas emas. Semua nilai di-ease dalam satu loop rAF yang berhenti saat diam; efek hilang perlahan saat kursor keluar.
- **Story berlapis:** baris judul "Three" / "Golden Ages", label "The story", dan gambar bergerak dengan kedalaman parallax berbeda (`--depth`). Tiap gambar punya badge angka I–III, dan ada petunjuk "Hover an image to enter its age" di kiri bawah.
- `prefers-reduced-motion` mematikan semua animasi, transisi, parallax, dan easing scroll.

## Melanjutkan pengembangan

Konten periode ada di `index.html` (`.period`). Copy ketiga periode mengikuti Figma 37:8667. Figma tidak menandai gambar mana yang di-hover; pasangan gambar–periode (kota bundar → I, cendekiawan menulis → II, cendekiawan di taman → III) adalah asumsi berdasarkan isi gambar. Mural dibuat ulang dari kode generator yang sama dengan di Figma dan di-inline di `index.html` agar tiap batang dan daun bisa dianimasikan; salinan berkasnya ada di `assets/story/mural-*.svg`. Waktu tumbuh tersimpan di elemen (`--s`/`--t` untuk batang, `--d` untuk daun dan bunga). Posisi gambar diatur lewat `--x`/`--y`, dan kekuatan parallax lewat `--depth`. Panjang scroll transisi diatur oleh `height` pada `.journey`.

## Verifikasi

Diuji di Chrome pada 1440 × 1024, 1440 × 900, 1280 × 1024, dan 1920 × 1080: posisi hero dan story cocok dengan geometri Figma, keadaan hover "Foundations" cocok dengan node 37:6780, dan tidak ada error konsol. Hero juga diuji di emulasi iPhone SE (320 × 568), iPhone 13 (390 × 664), Pixel 7, 375 × 667, tablet tegak 820 × 1180, ponsel landscape 844 × 390, dan laptop 1280 × 720 (tanpa scroll horizontal, tanpa error konsol). Section setelah hero di mobile, Safari asli, dan Firefox belum diverifikasi. Lapisan "Grain" di Figma kosong saat diekspor sehingga tidak diimplementasikan. Situs hanya memakai dua font: Svetze untuk judul (hero, story, nama periode) dan DM Sans untuk semua teks lain. Svetze disalin dari font terinstal; lisensi webnya belum diverifikasi. DM Sans berlisensi OFL (lihat `assets/fonts/DMSans-OFL.txt`).

## Ukuran aset

Total aset yang dimuat halaman sekitar 3.1 MB (sebelumnya 8.9 MB untuk seluruh repo, 6.1 MB di antaranya dua PNG periode). Gambar foto/lukisan disimpan sebagai JPEG kualitas 88 progresif (`scholar-reading.jpg` dan `scholars-garden.jpg` turun dari ±3 MB ke ±460 KB, PSNR ±35 dB), gambar transparan sebagai WebP (merpati turun 75–80%, PSNR ±41 dB di atas latar hero), dan font sebagai WOFF2. DM Sans di-subset ke rentang "latin" Google Fonts (sumbu `opsz` dan `wght` serta semua fitur OpenType tetap) dari 234 KB ke 68 KB; `@font-face` mencantumkan `unicode-range` yang sama. Svetze hanya diubah formatnya (22 → 14 KB, semua glyph). Untuk teks baru di luar Latin, subset DM Sans perlu dibuat ulang dari file asli Google Fonts, misalnya:

```sh
pyftsubset DMSans-Variable.ttf --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" --layout-features='*' --flavor=woff2 --output-file=assets/fonts/DMSans-Variable.woff2
```

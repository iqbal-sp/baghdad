# Pemetaan desain

## Hero (108:13408)

Sumber: file `W6tX1PQmmpbA50RBo29CVG`, node `108:13408`, diperiksa pada 31 Oktober 2026. Koordinat di bawah adalah piksel artboard 1440 × 1024.

| Node | Elemen | Geometri / gaya |
| --- | --- | --- |
| 108:13408 | Section | 1440 × 1024, `#1e0701` |
| 108:13410 | Atmosfer | Gambar 1622 × 1081 di (−45, −58), 80%, blend color-dodge. Di web dipasang full-bleed pada panel (bukan di artboard), dengan ukuran minimal sama seperti di Figma, agar tepinya tidak terlihat di layar yang lebih lebar atau lebih tinggi dari 1440 : 1024 |
| 108:13411 | Glow | Elips 900 × 820 di (270, 70), `#ff9440` 30%, blur 190, layer 60%, screen |
| 108:13413 / 108:13414 | Lengkung + ilustrasi | Path 798 × 1141 di (320, 85) meng-clip ilustrasi 1410 × 940 di (15, 85). Di web: CSS `clip-path: path()` dengan path yang digeser +305 px ke ruang koordinat gambar |
| 108:13527 | Bingkai emas | Render PNG transparan 1437 × 1023 di (1, 0), di atas ilustrasi; disimpan sebagai `frame.webp` |
| 108:13425 / 26 / 27 | Merpati | (114, 185) 131 px; (318, 34) 104 px, 85%, blur 1.2; (1222, 150) 136 px |
| 108:13429 / 108:13435 | Cahaya | 5 berkas sinar blur 64 (grup 40%, screen); 57 titik debu dalam 3 lapis |
| 108:13493 | Vignette | Inner shadow blur 250 spread 20 `#0a0300` 88% (di bawah teks) |
| 108:13494 | Judul | Svetze 250px, uppercase, letter-spacing 10%; (68, 442) |
| 108:13495 | Label | DM Sans Medium 22px/1.4, letter-spacing 20%, uppercase, hitam, tengah; (599, 164), lebar 242 |
| 108:13511 | Kolom kiri | x 56, lebar 176: kicker "762 — 1258", paragraf, lalu Scroll 32px di bawahnya; berakhir di y 960 |
| 108:13510 | Kolom kanan | x 1208, lebar 176, rata kanan: kicker "The journey" dan paragraf; berakhir di y 960 |
| 108:13502 | Scroll | "Scroll" Aref Ruqaa Ink 12px + lingkaran putih 24px dengan panah hitam, jarak 8px, tanpa garis |

Kicker: DM Sans Medium 11px, letter-spacing 2.4px, `#ffe5bd` 80%. Paragraf: Aref Ruqaa Ink 14px/1.5. Line-height otomatis Svetze di Figma (175px) lebih pendek daripada metrik browser, sehingga judul memakai `line-height: 175px` dan digeser +12px agar glyph sejajar dengan screenshot Figma. Artboard dipecah dua (seni dan tipografi) dengan vignette di antaranya, mengikuti urutan layer Figma.

Interaksi kursor (bukan dari Figma, berdasarkan arahan): `.hero__arch` membungkus jendela lukisan (`.hero__window`, clip-path), bingkai, dan kilau, dan diberi `perspective(1800px) rotateX/rotateY` dari variabel `--rx`/`--ry` dengan pivot (720, 620). `lib/hero-interaction.js` mengubah posisi kursor ke piksel artboard (lewat rect dan skala `.hero__stage`) dan menulis variabel CSS: tilt `--ry` = nx·3°, `--rx` = −ny·2° (lerp 0.07); parallax lukisan `--px`/`--py` = −nx·14 / −ny·10 px (lukisan `scale: 1.04`); posisi cahaya `--lx`/`--ly` (relatif jendela) dan `--sx`/`--sy` (relatif bingkai) dengan lerp 0.1. Lentera = `.hero__shade` (peredup `#180701` 0→22% dengan banyak stop ber-easing, berpusat di kursor, ukuran 3000px agar selalu menutupi jendela) + `.hero__lantern` (glow 480px, puncak 30%, screen, banyak stop agar tanpa tepi). Kilau = `.hero__sheen` (color-dodge, `mask` memakai `frame.webp` sendiri) berisi titik 420px (puncak 36%). Semua hanya berpindah lewat `translate`/`transform` (compositor). Aktif hanya untuk `(hover: hover) and (pointer: fine)` dan tanpa `prefers-reduced-motion`.

Tombol Scroll: keyframe `arrow-loop` (panah meluncur 16px ke kanan sambil memudar, lompat ke −16px, lalu masuk kembali) dan `cue-ring` (box-shadow 0→10px memudar) dengan siklus 2,4 s, mulai 2,6 s setelah halaman dibuka (setelah animasi masuk). Lingkaran memakai `overflow: hidden` agar panah terpotong rapi.

## Section story (122:14)

Sumber: frame `122:14` di section `108:13541`. Koordinat artboard 1440 × 1024, latar `#170601`.

| Node | Elemen | Geometri / gaya |
| --- | --- | --- |
| 123:351 / 123:14 | Mural bunga | SVG 320 × 220 di (0, 0), 45%; SVG 560 × 520 di (880, 504), 62%. Di belakang judul. Di web ditambatkan ke sudut layar (kiri atas / kanan bawah) dengan ukuran × skala artboard, agar tidak terpotong di layar yang lebih lebar dari 1440 : 1024 |
| 122:16 | "The story" | DM Sans Medium 20px/28px, letter-spacing 40%, uppercase, `#ffeaca` (cream 80% di atas putih); (87, 241) |
| 124:14 / 124:16 | Bintang + garis | Bintang 8 sudut 14px `#c8a15a` 90% di (274, 248); garis 120 × 1 gradien emas 80% → 0 di (298, 255) |
| 122:15 | Judul | Svetze 220px, line-height 120% (264px), dua baris "Three" / "Golden Ages"; kotak di-trim ke cap height, (87, 303), tinggi 418 |
| 122:21 / 19 / 17 | Gambar periode I / II / III | 120 × 120 di (573, 280), (865, 501), (417, 661); bayangan 0 12 blur 50 hitam 45% |
| 124:17 / 19 / 21 | Badge angka | Lingkaran 24px, latar `#170601`, garis emas 1px, DM Sans Medium 11px letter-spacing 1.5px; 12px di luar sudut kiri atas gambar |
| 124:23 | Petunjuk hover | Bintang 8px + DM Sans Medium 12px, letter-spacing 1px, putih 55%, jarak 10; (87, 948) |
| 124:27 / 124:29 | Bintang kecil | 7px 50% di (760, 870); 6px 45% di (1320, 470) |
| 122:23 | Grain | Noise putih 6% (SVG feTurbulence). Di web satu lapisan di atas kedua panel (`.journey__grain`), opacity 0 → 6% pada progres 0.1–0.7, agar tidak membentuk tepi panel |
| 122:24 | Bercak | Gambar 492 × 531 di (948, 0), color-burn. Transparansi diratakan ke putih (color-burn tidak mengubah putih). Di web ditambatkan ke sudut kanan atas layar dan membakar latar section `#170601`, sehingga tepinya tidak membentuk garis di tengah layar lebar |
| 37:7392 / 37:8021 / 37:8660 | Detail hover I / II / III | Posisi tetap (666, 840), tinggi 184 (dari section 37:8667) |

Animasi mural: batang memakai `pathLength=1` dan `stroke-dashoffset` 1 → 0 (mulai `--s`, durasi `--t`); daun/bunga/palmette/titik di-scale dari pangkalnya dengan delay `--d` yang dihitung dari panjang busur saat ujung batang melewatinya. Dipicu kelas `.has-arrived` pada progres ≥ 0.72 (dilepas < 0.45); saat dilepas semuanya menutup cepat tanpa delay. Mural adalah vektor yang digambar lewat skrip (sulur Catmull-Rom yang berlanjut menjadi spiral, daun almond, roset 8 kelopak, palmette); berkas SVG di web dihasilkan dari kode yang sama sehingga identik dengan Figma.

Transisi (bukan dari Figma, berdasarkan arahan): Lenis (`lerp` 0.08) menghaluskan scroll. Progres 0–1 pada `.journey` menggeser track 1 viewport, dibulatkan ke piksel perangkat agar ilustrasi tidak bergetar. Tepi kanan hero larut ke `#170601` lewat overlay gradien (`.hero__edge-fade`, stop ease-in-out) yang di-`scaleX` dari 0 ke 0.7 dengan smoothstep pada progres 0–0.7, sehingga tepinya solid `#170601` tepat di sambungan dengan story. Sebelumnya dipakai `mask-image` yang diubah tiap frame; itu memaksa seluruh hero dirender ulang dan Chrome menampilkan tile kosong (kotak gelap) saat scroll, jadi diganti dengan overlay yang hanya berubah lewat transform (compositor). Artboard hero memakai `will-change: transform`. Overlay gelap hero mencapai 50% pada progres 0.4–1 dan opacity artboard story 0.4–1. Asap (`lib/smoke.js`): kanvas WebGL setengah resolusi di atas track; fBm 5 oktaf dengan domain warping dalam pita Gaussian (σ 15% lebar) yang mengikuti sambungan di x = 1 − progres; kekuatan sin(π·progres)^0.8, warna badan `#170601` dengan kepulan amber. Loop rAF hanya berjalan saat asap terlihat.

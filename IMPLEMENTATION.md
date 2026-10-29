# Pemetaan desain

Sumber: file `W6tX1PQmmpbA50RBo29CVG`, node `37:646`, diperiksa pada 29 Oktober 2026. Implementasi didasarkan pada design context, properti node, aset asli, dan perbandingan dengan screenshot Figma 1440 × 1024.

## Layout pada ukuran referensi

| Node | Elemen | Geometri |
| --- | --- | --- |
| 37:646 | Section | 1440 × 1024 |
| 37:647 | Panorama | 1536 × 1024; x = −39, y = 0 |
| 37:648 | Panel | 548 × 847; x = 446, y = 89 |
| 37:651 | Ilustrasi dalam panel | 795 × 530; x = −124, y = −4 |
| 37:650 | Masker | 950 × 950; x = −201, y = −426 |
| 37:652 | Grup teks | 486 × 183; x = 31, y = 576 relatif panel |
| 37:653 | Judul | Michelangelus Bold 90px, letter spacing 9px, cap trim |
| 37:654 | Paragraf | Michelangelus Regular 16px/24px; lebar 373px |
| 37:664 | Label atas | Public Sans Medium 14px/19.6px; x = 195, y = 36 |
| 37:655 | Indikator Scroll | 235 × 24; x = 293, y = 803 |

Panel memakai alur layout biasa; penempatan absolut hanya untuk lapisan ilustrasi, masker, dan label di atasnya. Satuan container (`cqw`) mempertahankan rasio elemen berdasarkan lebar asli panel 548px. Font dan aset tidak dimuat dari URL Figma sementara saat runtime.

Warna dari design context: panel `#473f38`, judul `#fcf5ee`, paragraf `#dbc6b4`, label `#1f1f1f`, lingkaran panah `#796e63`.

## Efek latar

Figma menyertakan shader `Dither`, ID `55a4ca852373c81b69803326c5af7aa5f1af580b/7045`.

```js
{
  algorithm: 'Bayer 16x16',
  levels: 5,
  pixelSize: 1,
  contrast: 1,
  brightness: 100,
  mono: false,
  monoColor: { r: 1, g: 1, b: 1, a: 1 }
}
```

File `.ts` menyimpan sumber shader yang dikembalikan Figma. `dither.js` memiliki kode yang sama dengan anotasi tipe pada satu fungsi no-op dihapus agar dapat dijalankan browser. Fungsi setup/render, semua WGSL, dan parameternya tetap dipertahankan.

Figma menghasilkan wrapper React. Agar memenuhi permintaan JavaScript murni, `dither-renderer.js` menghubungkan fungsi setup/render tersebut langsung ke texture gambar melalui [WebGPU copyExternalImageToTexture](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture). Tidak ada ketergantungan React atau HTML-in-Canvas.

Output shader dipresentasikan dengan sampling separabel 1/8, 6/8, 1/8 yang dicocokkan terhadap screenshot node Figma. Ini mempertahankan tampilan titik dither pada hasil ekspor, tanpa mengubah shader atau memakai overlay noise CSS.

Untuk browser tanpa WebGPU, jalur Canvas mengevaluasi matriks Bayer dan persamaan kuantisasi shader yang sama untuk parameter desain ini. Bila seluruh pemrosesan canvas diblokir, gambar sumber tetap terlihat; peringatan hanya dicatat di konsol, tidak menutupi desain.

## Batas scope

Tidak ada halaman kedua, backend, konten tambahan, atau tujuan navigasi. Node sumber tidak memiliki prototype reaction. Indikator Scroll dinonaktifkan atas konfirmasi pengguna. Perilaku responsif di luar ukuran referensi adalah adaptasi, bukan klaim bahwa ada desain mobile terpisah di Figma.

## Section story (47:10, hover 37:6780)

| Node | Elemen | Geometri / gaya |
| --- | --- | --- |
| 47:11 | Tekstur | Tile SVG 72px berulang, `#42372D` stroke 0.7 |
| 47:681 | Vignette | Radial `#13100e` → `rgb(19 16 14 / .7)`, radius 1773 × 1536 |
| 47:13 | "The story" | Public Sans Medium 20px/1.4, tracking 8px; x = 140, y = 241 |
| 47:12 | Judul | Michelangelus Italic 187px/1.2, cap trim; x = 108, y = 335, lebar 1224.586 |
| 47:18 / 47:16 / 47:14 | Gambar periode | 120 × 120; (720, 291), (1115, 479), (315, 645); tanpa border, drop-shadow 0 12 25 `rgb(0 0 0 / .45)` |
| 37:7392 / 37:8021 / 37:8660 | Detail hover I / II / III | Posisi tetap (666, 840), tinggi 184; lebar 311 (kolom 279) untuk I–II, 372 (kolom 340, judul nowrap) untuk III; garis `#796E63`, teks `#f0dfd3` |

Sumber hover: section 37:8667 (frame 37:6780, 37:7409, 37:8048). Selain blok detail, ketiga frame hover identik dengan default; tidak ada perubahan pada gambar yang di-hover, sehingga pasangan gambar–periode diasumsikan dari isi gambar. Lapisan Grain (47:682) tidak memiliki fill yang dapat diekspor.

Transisi (bukan dari Figma, berdasarkan arahan): Lenis (`lerp` 0.08) menghaluskan scroll. Progres 0–1 pada `.journey` menggeser track 1 viewport. Hero memakai `mask-image` dengan stop ease-in-out; lebar zona transparan (`--fade-width`) tumbuh dari 0 ke 70% viewport dengan smoothstep pada progres 0–0.7, sehingga tepinya transparan penuh tepat di sambungan dengan story. Overlay gelap hero mencapai 50% pada progres 0.4–1 dan opacity artboard story 0.4–1. Tekstur muncul lewat transisi CSS setelah progres ≥ 0.995.

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

Di macOS, tersedia juga `start.command` (server yang sama, tetapi dengan `Cache-Control: no-cache` agar browser tidak memakai skrip lama setelah file diubah). Jika port 8000 sudah digunakan, ganti angka port pada perintah di atas. VS Code Live Server atau server statis lain juga dapat digunakan.

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
│   ├── flourishing/           Tekstur bab Periode II (lukisannya `story/scholar-reading.avif`)
│   ├── capital/               Tiga lukisan adegan 4 (JPEG; PNG sumbernya juga di sini) dan tekstur plester
│   ├── knowledge/             Lukisan, mask lengkung, garis orbit, bintang, dan cahaya dari Figma
│   ├── closing/               Lembar bersegel (AVIF transparan), lukisan senja 833, mask lengkung
│   └── fonts/                 Svetze dan DM Sans (hanya dua font), WOFF2
├── lib/
│   ├── journey.js             Segmen scroll: geser ke story, jeda, dive, baca bab
│   ├── dive.js                Zoom ke kartu periode dan pembukaan babnya (Foundations dari story, The Flourishing dari peta)
│   ├── heading-reveal.js      Animasi teks bab dan intro Adegan 3: meta, judul per huruf, intro per kata
│   ├── hero-interaction.js    Parallax lukisan (scroll + kursor), lentera, kilau emas
│   ├── hero-smoke.js          Asap hero yang mengalir (WebGL di atas foto atmosfer)
│   ├── periods.js             State hover/fokus periode
│   ├── scenes.js              Animasi masuk dan parallax adegan Periode I
│   ├── navbar.js              Navbar yang muncul mulai adegan 1
│   ├── menu.js                Menu bab: lembar yang turun dari navbar, ditutup dengan "Close"
│   ├── offscreen.js           Gambar didekode sebelum section-nya tampil; animasi berulang berhenti di luar layar
│   ├── city-intro.js          Adegan 3: transisi putih → titik "i" dan heading intro
│   ├── city-draw.js           Adegan 3: denah digambar dengan jangka saat penjelajah datang
│   ├── city.js                Adegan 3: denah Round City yang menempel selama 4 langkah
│   ├── round-city-plan.js     Generator denah Round City (sama dengan di Figma)
│   ├── capital.js             Adegan 4: masuk seperti kartu, parallax, garis rute sampai tepi layar
│   ├── knowledge.js           Kedalaman garis lengkung, bintang di perpotongan, cahaya kursor
│   ├── closing.js             Penutup Periode I: lembar diserahkan, segel berkilau, condong ke kursor
│   ├── cover.js               Section yang menimpa section sebelumnya (dipakai knowledge dan penutup)
│   ├── period-map.js          Penutup mengecil ke kartu I, kartu I ditandai selesai, lalu dive ke kartu II (bab Periode II)
│   ├── court-timeline.js      Periode II bagian I: timeline mendatar yang digeser oleh scroll vertikal
│   ├── people.js              Periode II bagian II: cakram astrolabe yang diputar scroll, kartu menampilkan tokohnya
│   ├── iris.js                Transisi bagian I → II: lingkaran yang membuka dari panah di ujung garis
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
- **Masuk ke Periode I (Foundations, Figma 126:13542).** Setelah story diam, scroll lagi (jeda 30vh lebih dulu) membuat kamera maju ke dalam story: semua elemen story membesar dari satu titik hilang dan memudar, sementara kartu Periode I terbang ke depan jauh lebih cepat sehingga keduanya saling mendekat. Selama zoom hanya lukisan yang terlihat. Kartu mendarat tepat di lukisan besar bab ini (file gambar yang sama, jadi tanpa crossfade), dan saat kartu hampir mendarat teks bab mulai muncul (hairline tergambar dari tengah, bintang berputar masuk, label meluncur dari tepi, judul naik huruf demi huruf, intro kata demi kata), bersamaan dengan latar bab yang mulai terbuka perlahan dari tepi lukisan sampai penuh layar dengan tepi lembut (feather) dan sudut membulat, tepi atas lebih dulu lalu sisi menyusul. Scroll sedikit lagi menggeser sisa 235px desain ke atas. Gambar periode hanya menampilkan detail saat hover/fokus, tanpa aksi klik. Buka `#foundations` untuk langsung ke bab ini. Dengan `prefers-reduced-motion`, bab hanya crossfade.
- **Masuk ke Periode II (The Flourishing, Figma [226:451](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=226-451)).** Setelah penutup Periode I mengecil ke kartu I dan kartu II maju, scroll lagi (jeda 30vh) menyelam ke kartu II dengan animasi yang sama persis seperti masuk ke Periode I (`lib/dive.js`): kamera maju ke peta, kartu II terbang dan mendarat di lukisan bab, jendela bab terbuka dengan tepi lembut, lalu heading muncul. Menu "II. The Flourishing" dan `#flourishing` langsung ke bab yang sudah terbuka. Adegan Periode II setelah pembukaan ini belum dibangun.
- **Adegan Periode I** (Figma [153:14207](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=153-14207) dan [158:91](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=158-91)): setelah bab Foundations selesai, scroll berikutnya membuat bab terangkat ke atas (dengan bayangan tipis di tepi bawahnya) dan "A new centre for a new dynasty" muncul dari belakangnya: adegan itu sudah menunggu di bawah bab, mula-mula sedikit redup dan sedikit lebih rendah, lalu perlahan terang dan naik ke tempatnya saat bab hilang. Setelah itu, saat menuju "A river, a route, a decision", section itu naik sedikit lebih cepat dan menimpa ruang kosong di bawah lukisan adegan pertama, lalu berhenti tepat di tepi bawah lukisannya. Tiap bagian muncul sekali saat terlihat dan tidak lagi tertutup bab: penanda dan teks naik, judul naik kata demi kata, lukisan terbuka dari tepi bawah, dan angka "762" naik dari garis dasarnya. Lukisan adegan pertama bergeser di dalam bingkainya (parallax, seperti dilihat dari jendela) begitu adegan mulai scroll, dan lukisan sungai naik dari bawah melewati angka "762" saat section dilewati. Keduanya meluncur dengan inersia lembut dan berhenti perlahan setelah scroll berhenti. Bisa dibuka langsung lewat `#new-centre` dan `#river-route-decision`.
- **Adegan 3, "A city drawn as a circle"** (Figma "Scene 3 — B final"): intro yang menempel sebentar (putih adegan 2 mengecil menjadi lingkaran yang mendarat sebagai titik huruf "i" pada "city", lalu heading muncul seperti heading Foundations), lalu titik itu jatuh ke pusat denah dan denah digambar dengan jangka dari pusat ke luar, lalu denah Round City menempel di tengah layar selama empat langkah scroll, dari luar ke dalam: Walls → Gates → Mosque → Palace. Tiap langkah menyalakan bagiannya (yang lain meredup), untuk Mosque dan Palace memperbesar lensa 4,5× langsung ke masjid atau istana (dengan detail bangunan yang hanya tampil saat diperbesar), menambah lingkar progres seperempat, memutar bintang kompas, memunculkan siku fokus di gerbang, dan mengganti panel penjelasan di kanan. Ada detail kecil per langkah: kilau air di parit dan menara yang menyala berurutan, serta kubah gerbang dan "pelancong" di jalan utama. Nama bagian di kiri adalah tombol untuk lompat ke langkahnya. Bisa dibuka lewat `#round-city`.
- **Adegan 4, "A capital that drew the world in"** (Figma [172:376](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=172-376), dengan rute dan ruling dari [182:49](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Untitled?node-id=182-49)): setelah langkah Palace sempat terbaca, adegan ini diletakkan di atas denah yang diam seperti kartu: masuk dari bawah layar sedikit miring dengan sudut kanan atas lebih dulu, lalu naik, berputar lurus, dan mendarat, dengan bayangan di atas denah yang memudar. Tiap bagian masuk saat terlihat: tiga lukisan (pasar di tengah, pendatang di kiri, cendekiawan di kanan) memudar masuk dari sepia gelap ke warna penuh, judul naik kata demi kata dari blur, dan lukisan bergerak dengan kedalaman berbeda saat di-scroll (kiri naik, kanan turun). Lima garis emas tipis tergambar dari tepi layar menuju lukisan: dari Byzantium, Harran, Khurasan · Samarkand, Jundishapur, dan Basra · Sind, masing-masing dengan label apa yang dibawanya ke Baghdad. Titik singgah dan cabang putus-putus muncul saat garis melewatinya, lalu gerbang kecil terbuka di tepi lukisan. Di belakang dua paragraf ada ruling mistara (garis buta yang dulu ditekan papan penggaris juru tulis) yang tersapu dari kiri saat teks naik. Bisa dibuka lewat `#capital`.
- **Navbar dan menu** ([Figma 218:375](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=218-375)). Mulai adegan 1 ("A new centre for a new dynasty") ke bawah, navbar turun masuk: "BAGHDAD" (kembali ke atas halaman) di kiri dan "MENU" di kanan, DM Sans Regular 16 huruf besar dengan tracking 5%, di (80, 44) seperti Figma. Warnanya putih dengan `mix-blend-mode: difference`, jadi gelap di atas adegan terang dan terang di atas adegan gelap. Tidak tampil di hero, story, dan bab Foundations. "MENU" menurunkan daftar bab dari atas seperti lembar kertas (latar gelap bertekstur, lukisan di kiri, empat bab berukuran besar); baris navbar di lembar itu membawa "CLOSE" ke tempat "MENU". Menunjuk satu bab meredupkan bab lain, menaikkan lukisan bab itu ke bingkai (lukisan sebelumnya terus naik keluar), dan memunculkan nama bab itu sangat besar dan samar (5%) di belakang. "CLOSE" mengangkat lembarnya kembali ke atas. "Intro" dan "I. Foundations" membawa ke bagiannya, Periode II dan III belum ditautkan. Escape juga menutup menu.
- **Parallax.** Setiap gambar periode bergerak dengan kedalaman berbeda (`--depth` di `index.html`) dan tepat berada di posisi Figma ketika transisi selesai.
- **Hover/fokus gambar** menampilkan detail periodenya di posisi tetap (666, 840), sesuai section Figma 37:8667. Gambar aktif terangkat dan dua lainnya meredup; garis detail tergambar lebih dulu, lalu label, judul, dan ringkasan muncul berurutan. Saat berpindah gambar, detail lama keluar dulu sebelum yang baru masuk, dan detail bertahan 350ms setelah kursor keluar (`lib/periods.js`).
- **Hero lengkung emas** (Figma 108:13408): ilustrasi di-clip dengan path lengkung dari Figma, lalu bingkai emas berukir dipasang di atasnya sebagai gambar transparan (`assets/hero/frame.webp`, render dari Figma). Cahaya (lima berkas sinar dari kiri atas) dan debu emas mengikuti layer Figma.
- **Merpati hidup.** Sayap depan dan belakang kini mengepak secara terpisah melalui `lib/hero-doves.js`: dua kepakan diikuti melayang, siklus 4.8/4.1/5.3 detik dengan fase berbeda, serta gerak badan kecil. Layer SVG dipisahkan memakai clip, dengan bidang bahu tambahan untuk menutup sambungan; ini animasi ilustrasi 2D, bukan simulasi 3D. Saat hero di luar layar atau tab tersembunyi gerak dijeda; reduced-motion memakai pose SVG asli. Menggunakan tiga SVG asli dari `outputs/hero-doves-manuscript-vector.zip`, melalui `assets/hero/doves-manuscript-v1/`. Padding transparan dikompensasi di CSS agar lebar burung terlihat tetap 131/104/136px dengan proporsi alami. Tiga merpati terbang masuk saat halaman dibuka, lalu masing-masing melayang di jalurnya sendiri dengan durasi berbeda (9 s, 10,5 s, 13 s). Debu bergerak pelan dalam tiga lapis kedalaman dan sinar "bernapas" halus.
- **Animasi masuk hero** (CSS saja): langit, lengkung, judul (spasi huruf merapat), label, dan kolom teks muncul berurutan; tombol Scroll (di bawah paragraf kiri) muncul terakhir. Panah Scroll berulang meluncur ke kanan, menghilang, lalu masuk lagi dari kiri, diikuti cincin yang memudar keluar (siklus 2,4 s), sebagai tanda konten berikutnya ada di samping. Saat hover, lingkaran membesar 1,15× dengan isi krem dan label bergeser 3px.
- **Asap yang bergerak.** Tekstur asap hero (atmosfer, color-dodge) digambar ulang dengan WebGL (`lib/hero-smoke.js`): foto yang sama ditekuk oleh noise yang mengalir pelan, sehingga gumpalan asap bergulung, menebal dan menipis di tempatnya tanpa mengubah komposisi Figma. Loop berhenti saat story sudah terlihat penuh. Tanpa WebGL atau dengan `prefers-reduced-motion`, foto diam tetap dipakai.
- **Parallax lukisan saat scroll** (`lib/hero-interaction.js`): saat hero bergeser ke story, lukisan di dalam bingkai tertinggal dari bingkainya (hingga 16% dari geseran), seolah dilihat lewat jendela. Objek lain (judul, merpati, debu, teks) tidak ikut bergeser. Aktif juga tanpa mouse; mati dengan `prefers-reduced-motion`.
- **Interaksi kursor di hero** (`lib/hero-interaction.js`, hanya pointer halus/mouse): bingkai emas tetap diam (tanpa tilt, agar tepinya tidak terangkat dari tepi layar) sementara lukisan bergeser sedikit berlawanan kursor di dalam jendelanya (parallax, gambar diperbesar 4% agar tepinya tidak terlihat). Cahaya lentera hangat (blend screen) mengikuti kursor di atas lukisan sementara bagian yang jauh sedikit meredup, dan kilau lembut (color-dodge, di-mask ke bentuk bingkai) bergeser di atas emas. Semua nilai di-ease dalam satu loop rAF yang berhenti saat diam; efek hilang perlahan saat kursor keluar.
- **Story berlapis:** baris judul "Three" / "Golden Ages", label "The story", dan gambar bergerak dengan kedalaman parallax berbeda (`--depth`). Tiap gambar punya badge angka I–III, dan ada petunjuk "Hover an image to enter its age" di kiri bawah.
- `prefers-reduced-motion` mematikan semua animasi, transisi, parallax, dan easing scroll.

## Melanjutkan pengembangan

Section **“How knowledge took root”** mengikuti section Capital, berdasarkan [Figma 196:110](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=196-110). Buka `#knowledge` untuk langsung ke sana. Layout mengikuti frame 206:66; scroll menggeser garis dengan kedalaman berbeda, bintang mengikuti perpotongannya, dan kursor mouse menerangi garis di sekitarnya seperti frame 206:109. Dengan `prefers-reduced-motion`, dekorasi tetap diam dan semua konten langsung terlihat. Ketiga poin adalah konten bacaan, tanpa aksi klik.

**Penutup Periode I (833)** mengikuti section itu, berdasarkan [Figma 215:340](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=215-340). Buka `#period-1-end`. Sebuah lembar kertas bersegel lilin, dipegang tangan bersarung, membawa kata penutup: "The patron is gone. The books stay", lukisan Baghdad saat senja di dalam lengkung dengan "833" samar di atasnya sebagai aksen diam, dan paragraf penutup. Section ini menimpa "How knowledge took root" seperti section itu menimpa Capital; selama masuk, lembarnya terangkat dan berputar lurus seolah diserahkan, lukisannya muncul dari sepia, segelnya berkilau sekali saat mendarat, lampu di lukisan berkedip seperti nyala api, dan dengan mouse lembarnya sedikit condong ke kursor. Setelah dibaca, penutup mengecil masuk ke kartu I sementara kamera mundur ke "Three Golden Ages" sampai ketiga kartu tampil, dan sambil turun kartunya terbalik, seperti kartu yang dilempar ke meja, dari lukisan senja ke lukisan Round City; kartu I diberi tanda selesai dan kartu II maju sebagai zaman berikutnya. Menyelam ke kartu II belum dibuat karena Periode II belum ada.

**Periode II, bagian I — "The court moves, the learning stays"** ([Figma 253:174](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=253-174)) menyusul bab The Flourishing. Buka `#court-and-city`. Timeline mendatar selebar tiga layar di latar `#1C170C`: scroll ke bawah menggeser track ke samping. Lima tahun (833, 836, 836–892, 892, 945) masing-masing punya bingkai dengan ilustrasi adegannya (`assets/court/`), tahun Hijriah dengan angka Arab, tahun besar, dan ceritanya di bawah garis. Saat section masuk, judul naik dan garis tergambar; tiap tahun terbuka sekali saat mendekati tengah layar (bingkai gambar terbuka dari bawah, lalu tahun Hijriah, tahun, garis tegak, titik, dan cerita). Tahun yang paling dekat ke tengah layar menyala dengan bintang yang berputar masuk, garis emas memanjang ke tahun itu, kurung Samarra tergambar sambil menghitung sampai 56 tahun, dan gambar di dalam bingkainya bergerak sedikit lebih lambat dari teks, sementara bingkainya diam. Section ini naik menimpa bab The Flourishing. Klik tahun lain atau tekan ← / → untuk pindah tahun.

**Periode II, bagian II — "The people behind it"** ([Figma 265:166](https://www.figma.com/design/W6tX1PQmmpbA50RBo29CVG/Baghdad?node-id=265-166)) menyusul timeline. Buka `#people`. Di bawah lengkung runcing bermanik, sebuah cakram astrolabe membawa lima tokoh (Hunayn ibn Ishaq, al-Kindi, Banu Musa, Thabit ibn Qurra, al-Razi), 30° satu sama lain dengan nomor Arab ١–٥. Scroll ke bawah memutar cakramnya sehingga tiap tokoh bergiliran naik ke puncak, masuk ke bawah kartu di tangan, dan kartunya menampilkan nama, satu kalimat, dan bidangnya; tiap tokoh berhenti sebentar di puncak sebelum cakram berputar lagi. Stasiun membesar dan makin terang saat mendekati puncak. Saat section masuk, lengkungnya naik dari kaki ke puncak, judul naik, cakram naik sambil berputar ke tempatnya, dan tangan mengangkat kartu dari bawah. Kartunya ikut berputar bersama scroll: potret berikutnya masuk dari kanan seperti roda kecil, dan teksnya bergeser masuk sementara yang lama keluar ke kiri. Section ini dibuka dari timeline lewat iris: setelah 945, kamera ikut menyusuri garis sampai panah di ujungnya tepat di tengah layar, sementara garis emas mengalir dari 945 ke panah itu dan panahnya menyala emas. Lalu sebuah lingkaran membuka dari panah itu dengan tepi emas, mula-mula pelan seperti jendela bulat (wajah Hunayn pada kartu yang pertama terlihat), lalu makin cepat sampai menutupi layar. Selama itu timeline meredup dan sedikit menjauh, "Next · Part II" menghilang, isi bagian II mengendap dari sedikit diperbesar, dan animasi masuk bagian II diputar saat lingkaran mulai terbuka, jadi terlihat. Klik stasiun atau tekan ← / → untuk pindah tokoh. Potretnya imajinasi, karena tidak ada potret asli tokoh-tokoh ini.

Konten periode ada di `index.html` (`.period`). Copy ketiga periode mengikuti Figma 37:8667. Figma tidak menandai gambar mana yang di-hover; pasangan gambar–periode (kota bundar → I, cendekiawan menulis → II, cendekiawan di taman → III) adalah asumsi berdasarkan isi gambar. Mural dibuat ulang dari kode generator yang sama dengan di Figma dan di-inline di `index.html` agar tiap batang dan daun bisa dianimasikan; salinan berkasnya ada di `assets/story/mural-*.svg`. Waktu tumbuh tersimpan di elemen (`--s`/`--t` untuk batang, `--d` untuk daun dan bunga). Posisi gambar diatur lewat `--x`/`--y`, dan kekuatan parallax lewat `--depth`. Panjang scroll transisi diatur oleh `height` pada `.journey`.

## Verifikasi

Diuji di Chrome pada 1440 × 1024, 1440 × 900, 1280 × 1024, dan 1920 × 1080: posisi hero dan story cocok dengan geometri Figma, keadaan hover "Foundations" cocok dengan node 37:6780, dan tidak ada error konsol. Ukuran mobile/tablet, Safari, dan Firefox belum diverifikasi. Lapisan "Grain" di Figma kosong saat diekspor sehingga tidak diimplementasikan. Situs hanya memakai dua font: Svetze untuk judul (hero, story, nama periode) dan DM Sans untuk semua teks lain. Svetze disalin dari font terinstal; lisensi webnya belum diverifikasi. DM Sans berlisensi OFL (lihat `assets/fonts/DMSans-OFL.txt`).

## Ukuran aset

Catatan optimasi raster berikut berasal dari tahap sebelumnya; total payload halaman belum diukur ulang setelah penambahan section dan tiga SVG merpati (6.52 MB untuk SVG asli). Gambar foto/lukisan disimpan sebagai JPEG kualitas 88 progresif (`scholar-reading.jpg` dan `scholars-garden.jpg` turun dari ±3 MB ke ±460 KB, PSNR ±35 dB), gambar transparan sebagai WebP (merpati turun 75–80%, PSNR ±41 dB di atas latar hero), dan font sebagai WOFF2. DM Sans di-subset ke rentang "latin" Google Fonts (sumbu `opsz` dan `wght` serta semua fitur OpenType tetap) dari 234 KB ke 68 KB; `@font-face` mencantumkan `unicode-range` yang sama. Svetze hanya diubah formatnya (22 → 14 KB, semua glyph). Untuk teks baru di luar Latin, subset DM Sans perlu dibuat ulang dari file asli Google Fonts, misalnya:

```sh
pyftsubset DMSans-Variable.ttf --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" --layout-features='*' --flavor=woff2 --output-file=assets/fonts/DMSans-Variable.woff2
```

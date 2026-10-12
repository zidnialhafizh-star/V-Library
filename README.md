# V-Library
Sistem Manajemen Perpustakaan Berbasis Web (Kelompok 02 - Radiant)

## Struktur folder
Satu folder, satu jenis isi.

```
html/    semua halaman (isinya hanya HTML)
css/     gaya
  dasar.css, header.css, komponen.css, footer.css   dipakai semua halaman
  halaman/<nama-halaman>.css                        khusus satu halaman
js/      perilaku
  shared/   config, util, sha256, akun, buku, pinjaman, layout
  halaman/  <nama-halaman>.js
foto/    semua gambar
  logo/   logo-v-library.png
  latar/  foto latar hero
  tim/    foto anggota tim
  buku/   sampul buku (satu file per buku)
```

Semua gambar ditulis langsung sebagai `<img>` di HTML. JS tidak membuat
gambar dan tidak menyimpan path foto.

## Halaman
| Halaman | HTML | CSS halaman | JS halaman |
|---|---|---|---|
| Beranda | `index.html` | `beranda.css` | `beranda.js` |
| Katalog Buku | `katalog-buku.html` | `katalog-buku.css` | `katalog-buku.js` |
| Peminjaman | `peminjaman.html` | `peminjaman.css` | `peminjaman.js` |
| Riwayat | `riwayat.html` | `riwayat.css` | `riwayat.js` |
| Tentang Kami | `tentang-kami.html` | `tentang-kami.css` | `tentang-kami.js` |
| Masuk | `masuk.html` | `auth.css` (bersama) | `masuk.js` |
| Daftar | `daftar.html` | `auth.css` (bersama) | `daftar.js` |
| Dashboard Petugas | `dashboard-petugas.html` | `dashboard-petugas.css` | `dashboard-petugas.js` |
| Manajemen Buku | `manajemen-buku.html` | `manajemen.css` (bersama) | `manajemen-buku.js` |
| Manajemen Pengguna | `manajemen-pengguna.html` | `manajemen.css` (bersama) | `manajemen-pengguna.js` |
| Manajemen Pinjaman | `manajemen-pinjaman.html` | `manajemen.css` (bersama) | `manajemen-pinjaman.js` |
| Manajemen Perpanjang | `manajemen-perpanjang.html` | `manajemen.css` (bersama) | `manajemen-perpanjang.js` |

## Urutan CSS dan JS di tiap halaman
CSS: `dasar` > `header` > `komponen` > `footer` > `halaman/<nama>`.

JS (semua pakai `defer`, urutannya jangan ditukar):
`config` > `util` > `sha256` > `akun` > `buku` > `pinjaman` > `layout` > `halaman/<nama>`.

## Header dan footer
Ditulis langsung di setiap file HTML (bukan dibuat oleh JS). Kalau mengubah
alamat, jam layanan, email, telepon, atau sosial media, ubah di footer
ke-12 file HTML (cari "Hubungi kami").

Bagian yang berbeda untuk tamu, anggota, dan petugas diatur lewat atribut
`data-tampil="tamu pengguna petugas"`. `js/shared/layout.js` hanya
menampilkan atau menyembunyikannya. Menu aktif ditandai `aria-current="page"`
di HTML.

Menu **Layanan** ada dua versi. Untuk anggota: Peminjaman dan Riwayat
(`#menu-layanan`). Untuk petugas: Manajemen Buku, Manajemen Pengguna,
Manajemen Pinjaman, dan Manajemen Perpanjang (`#menu-layanan-petugas`);
Dashboard tetap tautan biasa di sebelahnya. Di desktop muncul saat kursor diarahkan atau saat difokus keyboard
(murni CSS di `header.css`); di layar sentuh/mobile dibuka dengan tap
(`setupDropdowns` di `layout.js`). Pengunjung (tamu) tetap melihat tautan
Peminjaman biasa, yang mengarahkan mereka ke halaman Masuk.

## Menambah atau mengganti foto
- Ganti sampul buku: timpa file di `foto/buku/` dengan nama yang sama
  (disarankan rasio 2:3, misalnya 400 x 600 px, format .jpg).
  File yang ada sekarang adalah sampul sementara.
- Foto tim: ubah `src` di bagian "Tim pengembang" pada `tentang-kami.html`.
- Logo: `foto/logo/logo-v-library.png`.

## Menambah buku baru (3 langkah)
1. Taruh foto sampulnya di `foto/buku/nama-buku.jpg`.
2. Salin satu `<article class="book-card" ...>` di `katalog-buku.html`
   (urut abjad), ubah `data-id`, `data-genre`, `data-stok`, judul, penulis,
   dan nama file foto.
3. Tambahkan datanya (id, judul, penulis, genre, stok) di `SAMPLE_BOOKS`
   pada `js/shared/buku.js`. `id` harus sama dengan `data-id` di HTML.

Setelah mengubah `SAMPLE_BOOKS`, pakai tombol "Reset data demo" di halaman
Masuk supaya data lama di localStorage terganti.

## Daftar dan masuk sebagai petugas
Halaman Daftar dan Masuk punya pilihan **Pengguna / Petugas**. Pilihan Petugas
menampilkan kolom **Kode petugas**; kodenya `6969` (`V.KODE_PETUGAS` di
`js/shared/config.js`). Daftar sebagai petugas tanpa kode yang benar ditolak.
Masuk sebagai petugas wajib memilih Petugas dan mengisi kode; akun pengguna
tidak bisa masuk lewat pilihan Petugas, begitu pula sebaliknya.

## Data petugas (localStorage)
- Peminjaman disetujui memuat `batasKembali`, `tanggalDisetujui`, `jumlahPerpanjang`.
- Pengajuan perpanjangan disimpan di `loan.perpanjangan = { status, tanggalPengajuan }`.
  `V.requestExtension(idPinjaman)` (di `js/shared/pinjaman.js`) dipakai sisi
  pengguna untuk mengajukan; halaman Manajemen Perpanjang yang memprosesnya.
- Buku yang ditambah lewat Manajemen Buku tersimpan di localStorage, tetapi kartu
  di `katalog-buku.html` tetap harus ditambah manual (lihat bawah).

## Akun demo
| Peran | Username | Password |
|---|---|---|
| Petugas (pilih Petugas, kode `6969`) | `petugas` | `petugas123` |
| Anggota Silver | `silver` | `silver123` |
| Anggota Gold | `gold` | `gold123` |
| Akun nonaktif | `nonaktif` | `nonaktif123` |

Akun baru lewat halaman Daftar otomatis menjadi anggota Silver, kecuali
mendaftar sebagai petugas dengan kode yang benar.

## Hak akses halaman
Diatur lewat atribut `data-akses` di tag `<body>`:
`pengguna` (anggota yang sudah login), `petugas`, dan `tamu` (hanya pengunjung).
Halaman Peminjaman dan Riwayat memakai `pengguna`; Dashboard dan semua
halaman `manajemen-*` memakai `petugas`.

## Catatan keamanan
Data disimpan di `localStorage` browser (mode demo, tanpa server).
Password disimpan sebagai hash SHA-256 dengan salt. Penjagaan halaman berjalan
di browser, jadi cocok untuk demo tetapi bukan pengganti pemeriksaan di server.

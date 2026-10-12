window.VLibrary = window.VLibrary || {};

(function (V) {
    "use strict";

    // Kunci penyimpanan di localStorage browser (mode demo, tanpa server).
    V.KEYS = {
        buku: "vlibrary_books_v1",
        akun: "vlibrary_accounts_v1",
        sesi: "vlibrary_session_v1",
        pinjaman: "vlibrary_loans_v1"
    };

    // Genre mengikuti kategori di Beranda dan filter di Katalog Buku.
    V.GENRES = ["Pendidikan", "Teknologi", "Kesehatan", "Lainnya"];

    // Aturan tingkatan anggota (sesuai dokumen perancangan).
    V.TIERS = {
        Silver: { hari: 4, maksBuku: 1 },
        Gold: { hari: 7, maksBuku: 3 }
    };

    // Kode khusus untuk daftar dan masuk sebagai petugas.
    // Mode demo tanpa server: kode ini terlihat di source browser,
    // jadi bukan pengganti pemeriksaan di server.
    V.KODE_PETUGAS = "6969";

    // Anggota naik ke Gold jika total buku disetujui lebih dari angka ini (FR-13).
    V.BATAS_GOLD = 20;

    // Perpanjangan peminjaman: maksimal satu kali per peminjaman (FR-07).
    V.MAKS_PERPANJANGAN = 1;

    // Akun demo supaya fitur bisa langsung dicoba tanpa mendaftar.
    // Password disimpan sebagai hash di localStorage, bukan teks biasa.
    V.AKUN_DEMO = [
        { nama: "Petugas Perpustakaan", username: "petugas", password: "petugas123", role: "petugas", tier: null, status: "aktif", totalBuku: 0, label: "Petugas" },
        { nama: "Anggota Silver", username: "silver", password: "silver123", role: "pengguna", tier: "Silver", status: "aktif", totalBuku: 3, label: "Anggota Silver" },
        { nama: "Anggota Gold", username: "gold", password: "gold123", role: "pengguna", tier: "Gold", status: "aktif", totalBuku: 24, label: "Anggota Gold" },
        { nama: "Akun Nonaktif", username: "nonaktif", password: "nonaktif123", role: "pengguna", tier: "Silver", status: "nonaktif", totalBuku: 0, label: "Akun nonaktif" }
    ];
})(window.VLibrary);

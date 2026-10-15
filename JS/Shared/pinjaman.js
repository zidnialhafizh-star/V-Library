(function (V) {
    "use strict";

    function getLoans() {
        const stored = V.readStorage(V.KEYS.pinjaman);
        return Array.isArray(stored) ? stored : [];
    }

    function nextLoanId(loans) {
        const highest = loans.reduce(function (max, loan) {
            const number = parseInt(String(loan.id).replace(/\D/g, ""), 10) || 0;
            return Math.max(max, number);
        }, 0);

        return "P" + String(highest + 1).padStart(4, "0");
    }

    // Simpan peminjaman baru dengan status "Menunggu".
    function addLoan(data) {
        const loans = getLoans();

        const loan = {
            id: nextLoanId(loans),
            username: data.username,
            nama: data.nama,
            tingkatan: data.tingkatan,
            tanggalPengajuan: data.tanggalPengajuan,
            buku: data.buku,
            catatan: data.catatan || "",
            status: "Menunggu",
            dibuatPada: new Date().toISOString()
        };

        loans.push(loan);

        return V.writeStorage(V.KEYS.pinjaman, loans) ? loan : null;
    }

    function saveLoans(loans) {
        return V.writeStorage(V.KEYS.pinjaman, loans);
    }

    function findLoan(loans, id) {
        return loans.find(function (loan) {
            return loan.id === id;
        }) || null;
    }

    // Tanggal lokal "YYYY-MM-DD", ditambah sejumlah hari.
    function dateAfter(baseDate, days) {
        const date = baseDate ? new Date(baseDate + "T00:00:00") : new Date();
        date.setDate(date.getDate() + days);

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function loanDays(loan) {
        const rule = V.TIERS[loan.tingkatan];
        return rule ? rule.hari : V.TIERS.Silver.hari;
    }

    /* ---------- Persetujuan peminjaman oleh petugas (FR-11, FR-13) ---------- */

    // Setujui: stok tiap buku berkurang satu, batas waktu dihitung dari tingkatan.
    // Ditolak jika ada buku yang stoknya 0 atau sudah tidak ada.
    function approveLoan(id) {
        const loans = getLoans();
        const loan = findLoan(loans, id);

        if (!loan || loan.status !== "Menunggu") {
            return { ok: false, error: "bukan-menunggu" };
        }

        const books = V.getBooks();
        const empty = [];

        loan.buku.forEach(function (item) {
            const book = books.find(function (candidate) {
                return candidate.id === item.id;
            });

            if (!book || book.stok < 1) {
                empty.push(item.judul);
            }
        });

        if (empty.length > 0) {
            return { ok: false, error: "stok-habis", judul: empty };
        }

        const previousBooks = JSON.parse(JSON.stringify(books));

        loan.buku.forEach(function (item) {
            books.find(function (candidate) {
                return candidate.id === item.id;
            }).stok -= 1;
        });

        const today = dateAfter(null, 0);
        loan.status = "Disetujui";
        loan.tanggalDisetujui = today;
        loan.batasKembali = dateAfter(today, loanDays(loan));
        loan.jumlahPerpanjang = 0;

        if (!V.saveBooks(books) || !saveLoans(loans)) {
            V.saveBooks(previousBooks);
            return { ok: false, error: "gagal-simpan" };
        }

        V.addApprovedBooks(loan.username, loan.buku.length);
        return { ok: true, loan: loan };
    }

    // Peminjaman disetujui milik anggota yang masa pinjamnya belum habis.
    // Masa pinjam habis setelah tanggal batasKembali terlewati.
    function getActiveLoan(username) {
        const today = dateAfter(null, 0);

        return getLoans().find(function (loan) {
            return loan.username === username &&
                loan.status === "Disetujui" &&
                Boolean(loan.batasKembali) &&
                loan.batasKembali >= today;
        }) || null;
    }

    // alasan: teks yang ditampilkan ke pengguna di halaman Riwayat.
    function rejectLoan(id, reason) {
        const loans = getLoans();
        const loan = findLoan(loans, id);

        if (!loan || loan.status !== "Menunggu") {
            return { ok: false, error: "bukan-menunggu" };
        }

        loan.status = "Ditolak";
        loan.tanggalDitolak = dateAfter(null, 0);
        loan.alasanDitolak = String(reason || "").trim();

        return saveLoans(loans)
            ? { ok: true, loan: loan }
            : { ok: false, error: "gagal-simpan" };
    }

    /* ---------- Perpanjangan (FR-07, FR-12) ---------- */

    // Batas kembali baru jika perpanjangan disetujui (untuk ditampilkan ke pengguna).
    function getExtendedDueDate(loan) {
        return dateAfter(loan.batasKembali, loanDays(loan));
    }

    // Pengajuan perpanjangan (dipakai sisi pengguna). Hanya untuk peminjaman
    // Disetujui yang masa pinjamnya belum habis, belum pernah diperpanjang,
    // dan tidak sedang menunggu. username (opsional) memastikan peminjaman
    // itu memang milik pengguna yang sedang login.
    function requestExtension(id, username) {
        const loans = getLoans();
        const loan = findLoan(loans, id);

        if (!loan || loan.status !== "Disetujui") {
            return { ok: false, error: "belum-disetujui" };
        }

        if (username && loan.username !== username) {
            return { ok: false, error: "bukan-milik" };
        }

        if (!loan.batasKembali || loan.batasKembali < dateAfter(null, 0)) {
            return { ok: false, error: "terlambat" };
        }

        if ((loan.jumlahPerpanjang || 0) >= V.MAKS_PERPANJANGAN) {
            return { ok: false, error: "batas-tercapai" };
        }

        if (loan.perpanjangan && loan.perpanjangan.status === "Menunggu") {
            return { ok: false, error: "sudah-menunggu" };
        }

        loan.perpanjangan = {
            status: "Menunggu",
            tanggalPengajuan: dateAfter(null, 0)
        };

        return saveLoans(loans)
            ? { ok: true, loan: loan }
            : { ok: false, error: "gagal-simpan" };
    }

    function getExtensions() {
        return getLoans().filter(function (loan) {
            return loan.perpanjangan && loan.perpanjangan.status;
        });
    }

    // Setujui: batas waktu bertambah sebesar masa pinjam tingkatannya dan dicatat.
    function approveExtension(id) {
        const loans = getLoans();
        const loan = findLoan(loans, id);

        if (!loan || !loan.perpanjangan || loan.perpanjangan.status !== "Menunggu") {
            return { ok: false, error: "bukan-menunggu" };
        }

        loan.batasSebelumnya = loan.batasKembali;
        loan.batasKembali = dateAfter(loan.batasKembali, loanDays(loan));
        loan.jumlahPerpanjang = (loan.jumlahPerpanjang || 0) + 1;
        loan.perpanjangan.status = "Disetujui";
        loan.perpanjangan.tanggalKeputusan = dateAfter(null, 0);

        return saveLoans(loans)
            ? { ok: true, loan: loan }
            : { ok: false, error: "gagal-simpan" };
    }

    function rejectExtension(id) {
        const loans = getLoans();
        const loan = findLoan(loans, id);

        if (!loan || !loan.perpanjangan || loan.perpanjangan.status !== "Menunggu") {
            return { ok: false, error: "bukan-menunggu" };
        }

        loan.perpanjangan.status = "Ditolak";
        loan.perpanjangan.tanggalKeputusan = dateAfter(null, 0);

        return saveLoans(loans)
            ? { ok: true, loan: loan }
            : { ok: false, error: "gagal-simpan" };
    }

    V.getLoans = getLoans;
    V.addLoan = addLoan;
    V.approveLoan = approveLoan;
    V.rejectLoan = rejectLoan;
    V.getActiveLoan = getActiveLoan;
    V.requestExtension = requestExtension;
    V.getExtendedDueDate = getExtendedDueDate;
    V.getExtensions = getExtensions;
    V.approveExtension = approveExtension;
    V.rejectExtension = rejectExtension;
})(window.VLibrary);

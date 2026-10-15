(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    if (!user || user.role !== "pengguna") {
        return;
    }

    const list = document.getElementById("history-list");
    const countText = document.getElementById("history-count");
    const emptyBox = document.getElementById("history-empty");
    const emptyText = document.getElementById("history-empty-text");
    const emptyAction = document.getElementById("history-empty-action");
    const filter = document.getElementById("status-filter");

    const extendList = document.getElementById("extend-list");
    const extendInfo = document.getElementById("extend-info");
    const extendEmpty = document.getElementById("extend-empty");
    const extendAlert = document.getElementById("extend-alert");

    const createElement = V.createElement;

    // Hanya pengajuan milik pengguna ini, yang terbaru di atas.
    // Dibaca ulang setelah ada perubahan (misalnya pengajuan perpanjangan).
    let myLoans = [];

    function loadLoans() {
        myLoans = V.getLoans()
            .filter(function (loan) {
                return loan.username === user.username;
            })
            .sort(function (a, b) {
                return String(b.dibuatPada || "").localeCompare(String(a.dibuatPada || ""));
            });
    }

    function getLocalToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function countBy(status) {
        return myLoans.filter(function (loan) {
            return loan.status === status;
        }).length;
    }

    function setText(id, value) {
        document.getElementById(id).textContent = String(value);
    }

    function renderStats() {
        setText("stat-total", myLoans.length);
        setText("stat-menunggu", countBy("Menunggu"));
        setText("stat-disetujui", countBy("Disetujui"));
        setText("stat-ditolak", countBy("Ditolak"));
    }

    // Data lama yang disetujui tanpa batasKembali: hitung dari tanggal disetujui
    // sesuai lama pinjam tingkatannya.
    function dueDateFallback(loan) {
        if (!loan.tanggalDisetujui) {
            return "";
        }

        const date = new Date(loan.tanggalDisetujui + "T00:00:00");
        const rule = V.TIERS[loan.tingkatan] || V.TIERS.Silver;
        date.setDate(date.getDate() + rule.hari);

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function createItem(loan) {
        const item = createElement("li", "history-item");

        const head = createElement("div", "history-item-head");
        head.appendChild(createElement("h3", "history-item-id", "Pengajuan " + loan.id));
        head.appendChild(
            createElement(
                "span",
                "status-pill is-" + String(loan.status).toLowerCase(),
                loan.status
            )
        );

        const meta = createElement("p", "history-item-meta");
        const dateWrap = createElement("span", "", "Tanggal pengajuan: ");
        const time = createElement("time", "", V.formatDate(loan.tanggalPengajuan));
        time.setAttribute("datetime", loan.tanggalPengajuan || "");
        const strong = createElement("strong");
        strong.appendChild(time);
        dateWrap.appendChild(strong);

        const tierWrap = createElement("span", "", "Tingkatan: ");
        tierWrap.appendChild(createElement("strong", "", loan.tingkatan || "-"));

        meta.appendChild(dateWrap);
        meta.appendChild(tierWrap);

        const books = Array.isArray(loan.buku) ? loan.buku : [];
        const booksWrap = createElement("div");
        booksWrap.appendChild(
            createElement("p", "history-books-title", "Buku yang diajukan (" + books.length + ")")
        );
        const bookList = createElement("ul", "history-books");
        books.forEach(function (book) {
            bookList.appendChild(createElement("li", "", book.judul));
        });
        booksWrap.appendChild(bookList);

        // Peminjaman yang sudah disetujui menampilkan batas pengembalian.
        if (loan.status === "Disetujui") {
            const dueDate = loan.batasKembali || dueDateFallback(loan);
            const dueWrap = createElement("span", "", "Batas pengembalian: ");
            const dueTime = createElement("time", "", V.formatDate(dueDate));
            dueTime.setAttribute("datetime", dueDate || "");
            const dueStrong = createElement("strong");
            dueStrong.appendChild(dueTime);
            dueWrap.appendChild(dueStrong);
            meta.appendChild(dueWrap);

            if (loan.perpanjangan && loan.perpanjangan.status) {
                const extWrap = createElement("span", "", "Perpanjangan: ");
                extWrap.appendChild(
                    createElement(
                        "span",
                        "status-pill is-" + loan.perpanjangan.status.toLowerCase(),
                        loan.perpanjangan.status
                    )
                );
                meta.appendChild(extWrap);
            }
        }

        item.appendChild(head);
        item.appendChild(meta);
        item.appendChild(booksWrap);

        // Pengajuan ditolak: tampilkan alasan dari petugas.
        if (loan.status === "Ditolak") {
            const reason = createElement("p", "history-reject");
            reason.setAttribute("role", "note");
            reason.appendChild(createElement("strong", "", "Alasan ditolak: "));
            reason.appendChild(
                document.createTextNode(loan.alasanDitolak || "Petugas tidak mencantumkan alasan.")
            );
            item.appendChild(reason);
        }

        if (loan.catatan) {
            const note = createElement("p", "history-note");
            note.appendChild(createElement("span", "", "Catatan: "));
            note.appendChild(document.createTextNode(loan.catatan));
            item.appendChild(note);
        }

        return item;
    }

    /* ---------- Perpanjangan peminjaman ---------- */

    const EXTEND_ERRORS = {
        "belum-disetujui": "Peminjaman ini belum disetujui, jadi belum bisa diperpanjang.",
        "bukan-milik": "Peminjaman ini bukan milik akunmu.",
        "terlambat": "Masa peminjaman sudah habis, jadi tidak bisa diperpanjang. Kembalikan bukunya ke perpustakaan.",
        "batas-tercapai": "Perpanjangan hanya bisa satu kali untuk setiap peminjaman.",
        "sudah-menunggu": "Pengajuan perpanjangan untuk peminjaman ini masih menunggu keputusan petugas.",
        "gagal-simpan": "Pengajuan gagal disimpan di browser ini. Periksa pengaturan penyimpanan lalu coba lagi."
    };

    // Peminjaman disetujui yang batas pengembaliannya belum lewat.
    function getActiveLoans() {
        const today = getLocalToday();

        return myLoans.filter(function (loan) {
            return loan.status === "Disetujui" &&
                Boolean(loan.batasKembali) &&
                loan.batasKembali >= today;
        });
    }

    // "bisa", "ditolak" (boleh diajukan lagi), "menunggu", atau "habis".
    function getExtensionState(loan) {
        const extension = loan.perpanjangan;

        if ((loan.jumlahPerpanjang || 0) >= V.MAKS_PERPANJANGAN) {
            return "habis";
        }

        if (extension && extension.status === "Menunggu") {
            return "menunggu";
        }

        if (extension && extension.status === "Ditolak") {
            return "ditolak";
        }

        return "bisa";
    }

    function createDateStrong(label, value) {
        const wrap = createElement("span", "", label);
        const strong = createElement("strong");
        const time = createElement("time", "", V.formatDate(value));
        time.setAttribute("datetime", value || "");
        strong.appendChild(time);
        wrap.appendChild(strong);

        return wrap;
    }

    function createExtendItem(loan) {
        const state = getExtensionState(loan);
        const extension = loan.perpanjangan;
        const item = createElement("li", "history-item");

        const head = createElement("div", "history-item-head");
        head.appendChild(createElement("h3", "history-item-id", "Pengajuan " + loan.id));
        item.appendChild(head);

        const meta = createElement("p", "history-item-meta");
        meta.appendChild(createDateStrong("Batas pengembalian: ", loan.batasKembali));

        const statusWrap = createElement("span", "", "Status perpanjangan: ");
        if (extension && extension.status) {
            statusWrap.appendChild(
                createElement(
                    "span",
                    "status-pill is-" + extension.status.toLowerCase(),
                    extension.status
                )
            );
        } else {
            statusWrap.appendChild(createElement("strong", "", "Belum diajukan"));
        }
        meta.appendChild(statusWrap);

        if (state === "bisa" || state === "ditolak") {
            meta.appendChild(
                createDateStrong("Batas baru jika disetujui: ", V.getExtendedDueDate(loan))
            );
        }

        item.appendChild(meta);

        const books = Array.isArray(loan.buku) ? loan.buku : [];
        const booksWrap = createElement("div");
        booksWrap.appendChild(
            createElement("p", "history-books-title", "Buku yang dipinjam (" + books.length + ")")
        );
        const bookList = createElement("ul", "history-books");
        books.forEach(function (book) {
            bookList.appendChild(createElement("li", "", book.judul));
        });
        booksWrap.appendChild(bookList);
        item.appendChild(booksWrap);

        if (state === "ditolak") {
            const reason = createElement("p", "history-reject");
            reason.setAttribute("role", "note");
            reason.appendChild(
                document.createTextNode(
                    "Pengajuan perpanjangan sebelumnya ditolak petugas pada " +
                    V.formatDate(extension.tanggalKeputusan) +
                    ". Kamu masih bisa mengajukan ulang."
                )
            );
            item.appendChild(reason);
        }

        const action = createElement("div", "extend-action");

        if (state === "bisa" || state === "ditolak") {
            const label = state === "ditolak" ? "Ajukan ulang perpanjangan" : "Ajukan perpanjangan";
            const button = createElement("button", "button button-navy", label);
            button.type = "button";
            button.dataset.id = loan.id;
            button.setAttribute("aria-label", label + " " + loan.id);
            action.appendChild(button);
        } else if (state === "menunggu") {
            action.appendChild(
                createElement(
                    "p",
                    "extend-hint",
                    "Pengajuan dikirim pada " + V.formatDate(extension.tanggalPengajuan) +
                    ". Menunggu keputusan petugas."
                )
            );
        } else {
            action.appendChild(
                createElement(
                    "p",
                    "extend-hint",
                    "Perpanjangan sudah digunakan. Batas maksimal " + V.MAKS_PERPANJANGAN +
                    " kali untuk setiap peminjaman."
                )
            );
        }

        item.appendChild(action);

        return item;
    }

    function renderExtensions() {
        const active = getActiveLoans();

        extendList.textContent = "";
        active.forEach(function (loan) {
            extendList.appendChild(createExtendItem(loan));
        });

        if (active.length === 0) {
            extendInfo.textContent = "Tidak ada peminjaman aktif.";
            extendEmpty.textContent =
                "Belum ada peminjaman yang bisa diperpanjang. Perpanjangan hanya " +
                "tersedia untuk peminjaman yang sudah disetujui dan belum melewati " +
                "batas pengembalian.";
            extendEmpty.hidden = false;
        } else {
            extendInfo.textContent = active.length + " peminjaman aktif.";
            extendEmpty.hidden = true;
        }
    }

    function showExtendAlert(text, type) {
        extendAlert.textContent = text;
        extendAlert.className = "history-alert history-alert-" + type;
        extendAlert.setAttribute("role", type === "error" ? "alert" : "status");
        extendAlert.hidden = false;
        extendAlert.focus();
    }

    // Satu pendengar untuk semua tombol "Ajukan perpanjangan".
    extendList.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-id]");

        if (!button) {
            return;
        }

        const id = button.dataset.id;
        const result = V.requestExtension(id, user.username);

        loadLoans();
        renderStats();
        renderExtensions();
        render();

        if (result.ok) {
            showExtendAlert(
                "Pengajuan perpanjangan " + id + " terkirim. " +
                "Petugas akan memeriksa dan memberi keputusan.",
                "success"
            );
        } else {
            showExtendAlert(
                EXTEND_ERRORS[result.error] || "Pengajuan perpanjangan belum dapat dikirim.",
                "error"
            );
        }
    });

    function render() {
        const status = filter.value;
        const shown = myLoans.filter(function (loan) {
            return !status || loan.status === status;
        });

        list.textContent = "";
        shown.forEach(function (loan) {
            list.appendChild(createItem(loan));
        });

        if (myLoans.length === 0) {
            countText.textContent = "Belum ada pengajuan.";
            emptyText.textContent = "Kamu belum pernah mengajukan peminjaman.";
            emptyAction.textContent = "Ajukan peminjaman pertama";
            emptyAction.setAttribute("href", "peminjaman.html");
            emptyBox.hidden = false;
        } else if (shown.length === 0) {
            countText.textContent = "0 pengajuan dengan status " + status + ".";
            emptyText.textContent = "Tidak ada pengajuan dengan status " + status + ".";
            emptyAction.textContent = "Tampilkan semua status";
            emptyAction.setAttribute("href", "riwayat.html");
            emptyBox.hidden = false;
        } else {
            countText.textContent =
                "Menampilkan " + shown.length + " dari " + myLoans.length + " pengajuan.";
            emptyBox.hidden = true;
        }
    }

    // Tombol "Tampilkan semua status" cukup mereset filter, tanpa memuat ulang.
    emptyAction.addEventListener("click", function (event) {
        if (myLoans.length > 0) {
            event.preventDefault();
            filter.value = "";
            render();
            filter.focus();
        }
    });

    filter.addEventListener("change", render);

    loadLoans();
    renderStats();
    renderExtensions();
    render();
})();

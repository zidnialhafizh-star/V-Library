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

    const createElement = V.createElement;

    // Hanya pengajuan milik pengguna ini, yang terbaru di atas.
    const myLoans = V.getLoans()
        .filter(function (loan) {
            return loan.username === user.username;
        })
        .sort(function (a, b) {
            return String(b.dibuatPada || "").localeCompare(String(a.dibuatPada || ""));
        });

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

    renderStats();
    render();
})();

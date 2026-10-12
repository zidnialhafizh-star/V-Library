(function () {
    "use strict";

    const V = window.VLibrary;

    const form = document.getElementById("loan-form");
    const bookList = document.getElementById("book-list");
    const addButton = document.getElementById("add-book");
    const limitNote = document.getElementById("book-limit-note");
    const requestDate = document.getElementById("request-date");
    const notes = document.getElementById("loan-purpose");

    const errorBox = document.getElementById("form-errors");
    const errorList = document.getElementById("form-errors-list");
    const successBox = document.getElementById("loan-success");
    const successTitle = document.getElementById("loan-success-title");
    const successText = document.getElementById("loan-success-text");

    const summaryBooks = document.getElementById("summary-books");
    const summaryCount = document.getElementById("summary-count");
    const summaryDate = document.getElementById("summary-date");
    const summaryDuration = document.getElementById("summary-duration");
    const summaryStatus = document.getElementById("summary-status");

    const memberRule = document.getElementById("member-rule");
    const activeNote = document.getElementById("active-loan-note");

    const DEFAULT_STATUS = "Menunggu pengajuan";

    // Halaman ini dijaga js/shared/layout.js: pengunjung dialihkan ke Masuk dan
    // petugas ke Dashboard. Hanya anggota (Silver/Gold) yang lanjut.
    const user = V.getCurrentUser();

    if (!user || !V.TIERS[user.tier]) {
        return;
    }

    let books = V.getBooks();
    let rowCounter = 0;

    /* ---------- Fungsi bantu ---------- */

    const createElement = V.createElement;

    function getRule() {
        return V.TIERS[user.tier];
    }

    function formatDate(value) {
        return V.formatDate(value, "Belum dipilih");
    }

    function getLocalToday() {
        const today = new Date();

        return [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");
    }

    function findBook(id) {
        return books.find(function (book) {
            return book.id === id;
        }) || null;
    }

    function getSelects() {
        return Array.prototype.slice.call(bookList.querySelectorAll("select"));
    }

    function getSelectedIds() {
        return getSelects()
            .map(function (select) {
                return select.value;
            })
            .filter(Boolean);
    }

    /* ---------- Baris pilihan buku ---------- */

    function createRow(selectedId) {
        rowCounter += 1;
        const selectId = "book-select-" + rowCounter;

        const row = createElement("div", "book-row");

        const label = createElement("label");
        label.setAttribute("for", selectId);
        label.appendChild(createElement("span", "book-row-label", "Buku"));
        label.appendChild(document.createTextNode(" "));
        label.appendChild(createElement("span", "", "*"));

        const control = createElement("div", "book-row-control");

        const select = createElement("select");
        select.id = selectId;
        select.name = "book";
        select.appendChild(new Option("Pilih buku yang ingin dipinjam", ""));

        books
            .slice()
            .sort(function (a, b) {
                return a.judul.localeCompare(b.judul, "id");
            })
            .forEach(function (book) {
                const text = book.stok > 0
                    ? book.judul + " (stok " + book.stok + ")"
                    : book.judul + " (stok habis)";

                select.appendChild(new Option(text, book.id));
            });

        if (selectedId) {
            select.value = selectedId;
        }

        select.addEventListener("change", function () {
            clearMessages();
            refresh();
        });

        const removeButton = createElement("button", "loan-remove", "Hapus");
        removeButton.type = "button";
        removeButton.addEventListener("click", function () {
            row.remove();
            clearMessages();
            refresh();
        });

        control.appendChild(select);
        control.appendChild(removeButton);
        row.appendChild(label);
        row.appendChild(control);
        bookList.appendChild(row);

        return row;
    }

    function resetRows(selectedId) {
        bookList.textContent = "";
        createRow(selectedId);
    }

    /* ---------- Pesan ---------- */

    function clearMessages() {
        errorBox.hidden = true;
        errorList.textContent = "";
    }

    function showErrors(messages) {
        successBox.hidden = true;
        errorList.textContent = "";

        messages.forEach(function (message) {
            errorList.appendChild(createElement("li", "", message));
        });

        errorBox.hidden = false;
        errorBox.focus();
    }

    /* ---------- Tampilan ---------- */

    function refreshRows() {
        const rule = getRule();

        // Buang baris berlebih jika batas tingkatan lebih kecil.
        const rows = bookList.querySelectorAll(".book-row");
        for (let i = rows.length - 1; i >= rule.maksBuku; i -= 1) {
            rows[i].remove();
        }

        const currentRows = Array.prototype.slice.call(
            bookList.querySelectorAll(".book-row")
        );
        const selectedIds = getSelectedIds();

        currentRows.forEach(function (row, index) {
            row.querySelector(".book-row-label").textContent =
                "Buku " + (index + 1);

            row.querySelector(".loan-remove").hidden = currentRows.length === 1;

            // Matikan buku yang stoknya habis atau sudah dipilih di baris lain.
            const select = row.querySelector("select");

            Array.prototype.slice.call(select.options).forEach(function (option) {
                if (!option.value) {
                    return;
                }

                const book = findBook(option.value);
                const chosenElsewhere =
                    option.value !== select.value &&
                    selectedIds.indexOf(option.value) !== -1;

                option.disabled = !book || book.stok < 1 || chosenElsewhere;
            });
        });

        addButton.disabled = currentRows.length >= rule.maksBuku;

        limitNote.textContent =
            "Anggota " + user.tier + " dapat meminjam maksimal " +
            rule.maksBuku + " buku per pengajuan.";
    }

    function refreshSummary() {
        const rule = getRule();
        const ids = getSelectedIds();

        summaryBooks.textContent = "";

        if (ids.length === 0) {
            summaryBooks.appendChild(
                createElement("li", "is-empty", "Belum ada buku dipilih")
            );
        } else {
            ids.forEach(function (id) {
                const book = findBook(id);

                if (book) {
                    summaryBooks.appendChild(createElement("li", "", book.judul));
                }
            });
        }

        summaryCount.textContent = ids.length + " dari " + rule.maksBuku + " buku";
        summaryDate.textContent = formatDate(requestDate.value);
        summaryDuration.textContent = rule.hari + " hari";
    }

    function refreshAccount() {
        const rule = getRule();


        memberRule.textContent =
            "Anggota " + user.tier + ": maksimal " + rule.maksBuku +
            " buku per pengajuan dengan lama peminjaman " + rule.hari + " hari. " +
            "Peminjaman baru hanya bisa diajukan setelah masa peminjaman sebelumnya habis; " +
            "jika belum habis, pengajuan ditolak.";

        const active = V.getActiveLoan(user.username);

        if (active) {
            activeNote.textContent =
                "Kamu masih punya peminjaman aktif (" + active.id + ") dengan batas pengembalian " +
                V.formatDate(active.batasKembali) + ". Pengajuan baru bisa dikirim mulai " +
                V.formatDate(dayAfter(active.batasKembali)) + ".";
            activeNote.hidden = false;
        } else {
            activeNote.textContent = "";
            activeNote.hidden = true;
        }
    }

    // Hari setelah tanggal "YYYY-MM-DD".
    function dayAfter(value) {
        const date = new Date(value + "T00:00:00");
        date.setDate(date.getDate() + 1);

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function refresh() {
        refreshRows();
        refreshSummary();
    }

    /* ---------- Validasi dan penyimpanan ---------- */

    function validate() {
        const errors = [];
        const rule = getRule();

        // Baca ulang stok terbaru sebelum memeriksa.
        books = V.getBooks();

        const active = V.getActiveLoan(user.username);

        if (active) {
            errors.push(
                "Pengajuan ditolak: masa peminjaman " + active.id + " belum habis (batas pengembalian " +
                V.formatDate(active.batasKembali) + "). Kamu bisa meminjam lagi mulai " +
                V.formatDate(dayAfter(active.batasKembali)) + "."
            );
        }

        const ids = getSelectedIds();

        if (ids.length === 0) {
            errors.push("Pilih minimal 1 buku yang ingin dipinjam.");
        }

        if (ids.length > rule.maksBuku) {
            errors.push(
                "Anggota " + user.tier + " hanya dapat meminjam maksimal " +
                rule.maksBuku + " buku per pengajuan."
            );
        }

        const unique = ids.filter(function (id, index) {
            return ids.indexOf(id) === index;
        });

        if (unique.length !== ids.length) {
            errors.push("Buku yang sama tidak bisa dipilih lebih dari sekali.");
        }

        unique.forEach(function (id) {
            const book = findBook(id);

            if (!book) {
                errors.push("Salah satu buku tidak ditemukan. Muat ulang halaman ini.");
            } else if (book.stok < 1) {
                errors.push(
                    "Stok \"" + book.judul + "\" habis. Pilih buku lain yang tersedia."
                );
            }
        });

        if (!requestDate.value) {
            errors.push("Isi tanggal pengajuan.");
        }

        return errors;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const errors = validate();

        if (errors.length > 0) {
            showErrors(errors);
            refresh();
            return;
        }

        const selected = getSelectedIds().map(function (id) {
            const book = findBook(id);
            return { id: book.id, judul: book.judul };
        });

        const loan = V.addLoan({
            username: user.username,
            nama: user.nama,
            tingkatan: user.tier,
            tanggalPengajuan: requestDate.value,
            buku: selected,
            catatan: notes.value.trim()
        });

        if (!loan) {
            showErrors([
                "Pengajuan gagal disimpan di browser ini. Periksa pengaturan penyimpanan lalu coba lagi."
            ]);
            return;
        }

        clearMessages();

        successTitle.textContent = "Pengajuan " + loan.id + " terkirim";
        successText.textContent =
            selected.length + " buku diajukan dengan status Menunggu. " +
            "Petugas akan memeriksa ketersediaan stok.";
        successBox.hidden = false;
        successBox.focus();

        summaryStatus.textContent = "Pengajuan " + loan.id + " menunggu persetujuan";

        // Siapkan formulir untuk pengajuan berikutnya.
        notes.value = "";
        requestDate.value = getLocalToday();
        resetRows("");
        refresh();
    });

    /* ---------- Event lain ---------- */

    addButton.addEventListener("click", function () {
        if (bookList.querySelectorAll(".book-row").length < getRule().maksBuku) {
            const row = createRow("");
            clearMessages();
            refresh();
            row.querySelector("select").focus();
        }
    });

    requestDate.addEventListener("change", refreshSummary);

    /* ---------- Awal ---------- */

    refreshAccount();

    requestDate.min = getLocalToday();
    requestDate.value = getLocalToday();

    // Buka dari katalog: ?buku=B004 memilih buku itu otomatis.
    const params = new URLSearchParams(window.location.search);
    const presetId = params.get("buku");
    const presetBook = presetId ? findBook(presetId) : null;

    if (presetBook && presetBook.stok > 0) {
        resetRows(presetBook.id);
    } else {
        resetRows("");

        if (presetBook) {
            showErrors([
                "Stok \"" + presetBook.judul + "\" sedang habis. Pilih buku lain yang tersedia."
            ]);
        }
    }

    refresh();
})();

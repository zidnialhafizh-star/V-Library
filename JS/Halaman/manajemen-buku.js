(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    // Halaman ini dijaga layout.js: hanya petugas yang sampai ke sini.
    if (!user || user.role !== "petugas") {
        return;
    }

    const form = document.getElementById("book-form");
    const formTitle = document.getElementById("form-title");
    const submitButton = document.getElementById("book-submit");
    const cancelButton = document.getElementById("book-cancel");
    const alertBox = document.getElementById("mg-alert");
    const rows = document.getElementById("book-rows");
    const countText = document.getElementById("book-count");
    const emptyText = document.getElementById("book-empty");

    const inputs = {
        judul: document.getElementById("judul"),
        penulis: document.getElementById("penulis"),
        genre: document.getElementById("genre"),
        stok: document.getElementById("stok")
    };

    let editingId = null;

    /* ---------- Pesan kolom ---------- */

    function setFieldError(key, message) {
        const input = inputs[key];
        const errorText = document.getElementById(key + "-error");

        input.closest(".mg-field").classList.toggle("has-error", Boolean(message));
        input.setAttribute("aria-invalid", message ? "true" : "false");

        if (message) {
            errorText.textContent = message;
            errorText.hidden = false;
            input.setAttribute("aria-describedby", errorText.id);
        } else {
            errorText.hidden = true;
            input.removeAttribute("aria-describedby");
        }
    }

    function clearErrors() {
        Object.keys(inputs).forEach(function (key) {
            setFieldError(key, "");
        });
    }

    Object.keys(inputs).forEach(function (key) {
        inputs[key].addEventListener("input", function () {
            setFieldError(key, "");
        });
    });

    /* ---------- Tabel ---------- */

    function render() {
        const books = V.getBooks();

        rows.textContent = "";

        books.forEach(function (book) {
            const row = document.createElement("tr");
            row.dataset.id = book.id;
            row.classList.toggle("is-editing", book.id === editingId);

            [book.id, book.judul, book.penulis, book.genre].forEach(function (text) {
                row.appendChild(V.createElement("td", "", text));
            });

            const stockCell = document.createElement("td");
            stockCell.appendChild(
                V.createElement(
                    "span",
                    "stock-badge " + (book.stok > 0 ? "is-available" : "is-empty"),
                    book.stok > 0 ? String(book.stok) : "Habis (0)"
                )
            );
            row.appendChild(stockCell);

            const actionCell = document.createElement("td");
            const actions = V.createElement("div", "mg-actions");

            const edit = V.createElement("button", "mg-btn mg-btn-light", "Ubah");
            edit.type = "button";
            edit.dataset.aksi = "ubah";
            edit.dataset.id = book.id;
            edit.setAttribute("aria-label", "Ubah buku " + book.judul);

            const remove = V.createElement("button", "mg-btn mg-btn-danger", "Hapus");
            remove.type = "button";
            remove.dataset.aksi = "hapus";
            remove.dataset.id = book.id;
            remove.setAttribute("aria-label", "Hapus buku " + book.judul);

            actions.appendChild(edit);
            actions.appendChild(remove);
            actionCell.appendChild(actions);
            row.appendChild(actionCell);

            rows.appendChild(row);
        });

        emptyText.hidden = books.length > 0;
        countText.textContent = books.length + " judul buku.";
    }

    /* ---------- Formulir ---------- */

    function resetForm() {
        editingId = null;
        form.reset();
        clearErrors();
        formTitle.textContent = "Tambah buku";
        submitButton.textContent = "Simpan buku";
        cancelButton.hidden = true;
        render();
    }

    function startEdit(id) {
        const book = V.getBookById(id);

        if (!book) {
            V.showAlert(alertBox, "Buku tidak ditemukan. Muat ulang halaman.", "error");
            return;
        }

        editingId = id;
        clearErrors();
        alertBox.hidden = true;

        inputs.judul.value = book.judul;
        inputs.penulis.value = book.penulis;
        inputs.genre.value = book.genre;
        inputs.stok.value = String(book.stok);

        formTitle.textContent = "Ubah buku " + book.id;
        submitButton.textContent = "Simpan perubahan";
        cancelButton.hidden = false;
        render();

        form.scrollIntoView({ behavior: "smooth", block: "center" });
        inputs.judul.focus();
    }

    function deleteBook(id) {
        const book = V.getBookById(id);

        if (!book) {
            return;
        }

        const waiting = V.getLoans().filter(function (loan) {
            return loan.status === "Menunggu" && loan.buku.some(function (item) {
                return item.id === id;
            });
        }).length;

        const warning = waiting > 0
            ? "\n\nAda " + waiting + " pengajuan yang masih menunggu dan memuat buku ini; pengajuan itu tidak bisa disetujui lagi."
            : "";

        if (!window.confirm("Hapus buku \"" + book.judul + "\"?" + warning)) {
            return;
        }

        const result = V.deleteBook(id);

        if (!result.ok) {
            V.showAlert(alertBox, "Buku gagal dihapus. Periksa pengaturan penyimpanan browser.", "error");
            return;
        }

        if (editingId === id) {
            resetForm();
        } else {
            render();
        }

        V.showAlert(alertBox, "Buku \"" + book.judul + "\" dihapus.");
    }

    rows.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-aksi]");

        if (!button) {
            return;
        }

        if (button.dataset.aksi === "ubah") {
            startEdit(button.dataset.id);
        } else {
            deleteBook(button.dataset.id);
        }
    });

    cancelButton.addEventListener("click", function () {
        resetForm();
        alertBox.hidden = true;
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearErrors();

        const data = {
            judul: inputs.judul.value,
            penulis: inputs.penulis.value,
            genre: inputs.genre.value,
            stok: inputs.stok.value
        };

        const wasEditing = editingId !== null;
        const result = wasEditing ? V.updateBook(editingId, data) : V.addBook(data);

        if (!result.ok) {
            const keys = Object.keys(result.errors || {});

            if (keys.length > 0) {
                keys.forEach(function (key) {
                    setFieldError(key, result.errors[key]);
                });
                inputs[keys[0]].focus();
            } else {
                V.showAlert(
                    alertBox,
                    "Buku gagal disimpan. Periksa pengaturan penyimpanan browser lalu coba lagi.",
                    "error"
                );
            }

            return;
        }

        resetForm();
        V.showAlert(
            alertBox,
            "Buku \"" + result.book.judul + "\" " + (wasEditing ? "diperbarui." : "ditambahkan dengan ID " + result.book.id + ".")
        );
    });

    render();
})();

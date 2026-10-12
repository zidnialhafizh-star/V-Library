(function (V) {
    "use strict";

    // Data contoh. Id harus sama dengan data-id pada kartu di HTML.
    const SAMPLE_BOOKS = [
        { id: "B001", judul: "Totto-chan: Gadis Cilik di Jendela", penulis: "Tetsuko Kuroyanagi", genre: "Pendidikan", stok: 3 },
        { id: "B002", judul: "Sekolah Itu Candu", penulis: "Roem Topatimasang", genre: "Pendidikan", stok: 2 },
        { id: "B003", judul: "Pedagogi Kaum Tertindas", penulis: "Paulo Freire", genre: "Pendidikan", stok: 0 },
        { id: "B004", judul: "Dasar-Dasar Pemrograman", penulis: "Penulis Contoh", genre: "Teknologi", stok: 5 },
        { id: "B005", judul: "Clean Code", penulis: "Robert C. Martin", genre: "Teknologi", stok: 3 },
        { id: "B006", judul: "Why We Sleep", penulis: "Matthew Walker", genre: "Kesehatan", stok: 2 },
        { id: "B007", judul: "How Not to Die", penulis: "Michael Greger", genre: "Kesehatan", stok: 0 },
        { id: "B008", judul: "Laskar Pelangi", penulis: "Andrea Hirata", genre: "Lainnya", stok: 4 },
        { id: "B009", judul: "Bumi", penulis: "Tere Liye", genre: "Lainnya", stok: 6 },
        { id: "B010", judul: "Filosofi Teras", penulis: "Henry Manampiring", genre: "Lainnya", stok: 3 },
        { id: "B011", judul: "Atomic Habits", penulis: "James Clear", genre: "Lainnya", stok: 1 }
    ];

    function getBooks() {
        const stored = V.readStorage(V.KEYS.buku);

        if (Array.isArray(stored)) {
            return stored;
        }

        const copy = JSON.parse(JSON.stringify(SAMPLE_BOOKS));
        V.writeStorage(V.KEYS.buku, copy);
        return copy;
    }

    function saveBooks(books) {
        return V.writeStorage(V.KEYS.buku, books);
    }

    function getBookById(id) {
        return getBooks().find(function (book) {
            return book.id === id;
        }) || null;
    }

    /* ---------- Pengelolaan buku oleh petugas (FR-08) ---------- */

    // Periksa data buku. Mengembalikan { kolom: pesan } untuk kolom yang salah.
    function validateBook(data) {
        const errors = {};

        if (!String(data.judul || "").trim()) {
            errors.judul = "Judul wajib diisi.";
        }

        if (!String(data.penulis || "").trim()) {
            errors.penulis = "Penulis wajib diisi.";
        }

        if (V.GENRES.indexOf(data.genre) === -1) {
            errors.genre = "Pilih genre.";
        }

        const stock = String(data.stok === undefined ? "" : data.stok).trim();

        if (stock === "") {
            errors.stok = "Stok wajib diisi.";
        } else if (!/^-?\d+$/.test(stock)) {
            errors.stok = "Stok harus berupa bilangan bulat.";
        } else if (Number(stock) < 0) {
            errors.stok = "Stok tidak boleh negatif.";
        }

        return errors;
    }

    function nextBookId(books) {
        const highest = books.reduce(function (max, book) {
            const number = parseInt(String(book.id).replace(/\D/g, ""), 10) || 0;
            return Math.max(max, number);
        }, 0);

        return "B" + String(highest + 1).padStart(3, "0");
    }

    function cleanBook(data) {
        return {
            judul: String(data.judul).trim(),
            penulis: String(data.penulis).trim(),
            genre: data.genre,
            stok: Number(data.stok)
        };
    }

    function addBook(data) {
        const errors = validateBook(data);

        if (Object.keys(errors).length > 0) {
            return { ok: false, errors: errors };
        }

        const books = getBooks();
        const book = cleanBook(data);
        book.id = nextBookId(books);
        books.push(book);

        return saveBooks(books) ? { ok: true, book: book } : { ok: false, errors: {}, error: "gagal-simpan" };
    }

    function updateBook(id, data) {
        const errors = validateBook(data);

        if (Object.keys(errors).length > 0) {
            return { ok: false, errors: errors };
        }

        const books = getBooks();
        const index = books.findIndex(function (book) {
            return book.id === id;
        });

        if (index === -1) {
            return { ok: false, errors: {}, error: "tidak-ditemukan" };
        }

        books[index] = Object.assign({ id: id }, cleanBook(data));

        return saveBooks(books) ? { ok: true, book: books[index] } : { ok: false, errors: {}, error: "gagal-simpan" };
    }

    function deleteBook(id) {
        const books = getBooks();
        const rest = books.filter(function (book) {
            return book.id !== id;
        });

        if (rest.length === books.length) {
            return { ok: false, error: "tidak-ditemukan" };
        }

        return saveBooks(rest) ? { ok: true } : { ok: false, error: "gagal-simpan" };
    }

    /* ---------- Kartu buku yang sudah ada di HTML ---------- */

    function setAction(action, href, text) {
        action.textContent = text;

        if (href) {
            action.setAttribute("href", href);
            action.classList.remove("is-disabled");
            action.removeAttribute("aria-disabled");
        } else {
            action.removeAttribute("href");
            action.classList.add("is-disabled");
            action.setAttribute("aria-disabled", "true");
        }
    }

    // Samakan satu kartu dengan stok terbaru dan peran pengguna.
    function syncCard(card, user) {
        const book = getBookById(card.dataset.id);
        const stock = book ? book.stok : Number(card.dataset.stok) || 0;
        const available = stock > 0;

        card.dataset.stok = String(stock);
        card.classList.toggle("is-unavailable", !available);

        const badge = card.querySelector(".stock-badge");
        const action = card.querySelector(".book-action");

        if (badge) {
            badge.className = "stock-badge " + (available ? "is-available" : "is-empty");
            badge.textContent = available ? "Tersedia, stok " + stock : "Tidak tersedia";
        }

        if (!action) {
            return;
        }

        const target = "peminjaman.html?buku=" + encodeURIComponent(card.dataset.id);

        if (!available) {
            setAction(action, "", "Stok habis");
        } else if (user && user.role === "petugas") {
            setAction(action, "", "Khusus anggota");
        } else if (user) {
            setAction(action, target, "Ajukan Peminjaman");
        } else {
            // Pengunjung diarahkan masuk dulu, lalu kembali ke peminjaman.
            setAction(
                action,
                "masuk.html?pesan=login&next=" + encodeURIComponent(target),
                "Ajukan Peminjaman"
            );
        }
    }

    // Buat kartu untuk buku yang ditambah petugas (belum ada di HTML).
    // Tanpa foto sampul: sampul memakai blok warna genre dengan inisial judul.
    function createBookCard(book) {
        const card = V.createElement("article", "book-card");
        card.dataset.id = book.id;
        card.dataset.genre = book.genre;
        card.dataset.stok = String(book.stok);

        const cover = V.createElement("figure", "book-cover");
        const initial = V.createElement("span", "", String(book.judul).trim().charAt(0).toUpperCase());
        initial.setAttribute("aria-hidden", "true");
        cover.appendChild(initial);

        const body = V.createElement("div", "book-body");
        body.appendChild(V.createElement("p", "book-genre", book.genre));
        body.appendChild(V.createElement("h3", "book-title", book.judul));
        body.appendChild(V.createElement("p", "book-author", book.penulis));

        const footer = V.createElement("footer", "book-footer");
        footer.appendChild(V.createElement("p", "stock-badge"));
        footer.appendChild(V.createElement("a", "book-action"));
        body.appendChild(footer);

        card.appendChild(cover);
        card.appendChild(body);

        return card;
    }

    // Samakan isi grid katalog dengan data buku: tambah kartu buku baru,
    // buang kartu buku yang sudah dihapus, lalu urutkan menurut judul.
    function lengkapiKatalog(grid) {
        const books = getBooks();
        const known = {};

        Array.prototype.slice.call(grid.querySelectorAll(".book-card[data-id]")).forEach(function (card) {
            const book = books.find(function (candidate) {
                return candidate.id === card.dataset.id;
            });

            if (!book) {
                card.remove();
                return;
            }

            // Judul, penulis, dan genre mengikuti hasil edit petugas.
            card.dataset.genre = book.genre;
            card.querySelector(".book-genre").textContent = book.genre;
            card.querySelector(".book-title").textContent = book.judul;
            card.querySelector(".book-author").textContent = book.penulis;
            known[book.id] = true;
        });

        books.forEach(function (book) {
            if (!known[book.id]) {
                grid.appendChild(createBookCard(book));
            }
        });

        Array.prototype.slice.call(grid.querySelectorAll(".book-card"))
            .sort(function (a, b) {
                return a.querySelector(".book-title").textContent
                    .localeCompare(b.querySelector(".book-title").textContent, "id");
            })
            .forEach(function (card) {
                grid.appendChild(card);
            });
    }

    function sinkronkanKartu(root) {
        const user = V.getCurrentUser();

        Array.prototype.forEach.call(
            (root || document).querySelectorAll(".book-card[data-id]"),
            function (card) {
                syncCard(card, user);
            }
        );
    }

    V.getBooks = getBooks;
    V.saveBooks = saveBooks;
    V.getBookById = getBookById;
    V.addBook = addBook;
    V.updateBook = updateBook;
    V.deleteBook = deleteBook;
    V.lengkapiKatalog = lengkapiKatalog;
    V.sinkronkanKartu = sinkronkanKartu;
})(window.VLibrary);

(function () {
    "use strict";

    const V = window.VLibrary;

    /* ---------- Angka koleksi ---------- */

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    if (V) {
        const books = V.getBooks();

        const availableTitles = books.filter(function (book) {
            return book.stok > 0;
        }).length;

        const totalStock = books.reduce(function (sum, book) {
            return sum + book.stok;
        }, 0);

        setText("stat-judul", books.length);
        setText("stat-tersedia", availableTitles);
        setText("stat-stok", totalStock);
        setText("stat-genre", V.GENRES.length);
    }

    /* ---------- FAQ ---------- */

    const faqItems = Array.prototype.slice.call(
        document.querySelectorAll(".faq-item")
    );

    faqItems.forEach(function (item) {
        item.addEventListener("toggle", function () {
            if (!item.open) {
                return;
            }

            faqItems.forEach(function (other) {
                if (other !== item) {
                    other.open = false;
                }
            });
        });
    });
})();

(function () {
    "use strict";

    const V = window.VLibrary;
    const ALL_GENRES = "Semua";

    const searchForm = document.getElementById("catalog-search");
    const searchInput = document.getElementById("catalog-query");
    const genreFilter = document.getElementById("genre-filter");
    const onlyAvailable = document.getElementById("only-available");
    const countText = document.getElementById("catalog-count");
    const grid = document.getElementById("book-grid");
    const emptyBox = document.getElementById("catalog-empty");
    const emptyText = document.getElementById("catalog-empty-text");
    const resetButton = document.getElementById("catalog-reset");

    if (!V || !grid) {
        return;
    }

    V.sinkronkanKartu(grid);

    // Data pencarian dibaca dari kartu yang ada di HTML.
    const cards = Array.prototype.slice.call(grid.querySelectorAll(".book-card")).map(function (card) {
        return {
            element: card,
            genre: card.dataset.genre,
            available: Number(card.dataset.stok) > 0,
            text: (
                card.querySelector(".book-title").textContent + " " +
                card.querySelector(".book-author").textContent + " " +
                card.dataset.genre
            ).toLowerCase()
        };
    });

    const chips = Array.prototype.slice.call(genreFilter.querySelectorAll(".genre-chip"));

    const state = {
        genre: ALL_GENRES,
        query: "",
        onlyAvailable: false
    };

    function countByGenre(genre) {
        if (genre === ALL_GENRES) {
            return cards.length;
        }

        return cards.filter(function (item) {
            return item.genre === genre;
        }).length;
    }

    function matches(item) {
        const keyword = state.query.trim().toLowerCase();

        if (state.genre !== ALL_GENRES && item.genre !== state.genre) {
            return false;
        }

        if (state.onlyAvailable && !item.available) {
            return false;
        }

        return !keyword || item.text.includes(keyword);
    }

    /* ---------- Tampilan ---------- */

    function renderGenreFilter() {
        chips.forEach(function (chip) {
            chip.setAttribute("aria-pressed", String(chip.dataset.genre === state.genre));
            chip.querySelector(".genre-chip-count").textContent =
                String(countByGenre(chip.dataset.genre));
        });
    }

    function renderBooks() {
        let shown = 0;

        cards.forEach(function (item) {
            const show = matches(item);
            item.element.hidden = !show;

            if (show) {
                shown += 1;
            }
        });

        if (shown === 0) {
            const hasKeyword = state.query.trim() !== "";

            if (state.genre !== ALL_GENRES && !hasKeyword && !state.onlyAvailable) {
                emptyText.textContent = "Belum ada buku pada genre " + state.genre + ".";
            } else {
                emptyText.textContent = "Coba ubah kata kunci atau pilih genre lain.";
            }
        }

        emptyBox.hidden = shown > 0;
        grid.hidden = shown === 0;

        countText.textContent = shown === 0
            ? "Tidak ada buku yang cocok."
            : "Menampilkan " + shown + " dari " + cards.length + " buku";
    }

    function updateUrl() {
        const params = new URLSearchParams();

        if (state.genre !== ALL_GENRES) {
            params.set("genre", state.genre);
        }

        if (state.query.trim()) {
            params.set("q", state.query.trim());
        }

        const suffix = params.toString() ? "?" + params.toString() : "";

        try {
            window.history.replaceState(null, "", window.location.pathname + suffix);
        } catch (error) {
            // Abaikan jika halaman dibuka dari file lokal yang membatasi history.
        }
    }

    function refresh() {
        renderGenreFilter();
        renderBooks();
        updateUrl();
    }

    /* ---------- Event ---------- */

    genreFilter.addEventListener("click", function (event) {
        const button = event.target.closest(".genre-chip");

        if (!button) {
            return;
        }

        state.genre = button.dataset.genre;
        refresh();
    });

    searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        state.query = searchInput.value;
        refresh();
    });

    searchInput.addEventListener("input", function () {
        state.query = searchInput.value;
        renderBooks();
        updateUrl();
    });

    onlyAvailable.addEventListener("change", function () {
        state.onlyAvailable = onlyAvailable.checked;
        renderBooks();
    });

    resetButton.addEventListener("click", function () {
        state.genre = ALL_GENRES;
        state.query = "";
        state.onlyAvailable = false;
        searchInput.value = "";
        onlyAvailable.checked = false;
        refresh();
        searchInput.focus();
    });

    /* ---------- Awal: baca ?genre= dan ?q= dari URL ---------- */

    const params = new URLSearchParams(window.location.search);
    const genreParam = (params.get("genre") || "").toLowerCase();
    const matchedChip = chips.find(function (chip) {
        return chip.dataset.genre.toLowerCase() === genreParam;
    });

    if (matchedChip) {
        state.genre = matchedChip.dataset.genre;
    }

    state.query = params.get("q") || "";
    searchInput.value = state.query;

    renderGenreFilter();
    renderBooks();
})();

(function (V) {
    "use strict";

    function readStorage(key) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function removeStorage(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            // Abaikan.
        }
    }

    // Buat elemen dengan teks aman (tanpa innerHTML).
    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    // Format tanggal "YYYY-MM-DD" menjadi "5 Okt 2026".
    function formatDate(value, fallback) {
        if (!value) {
            return fallback === undefined ? "-" : fallback;
        }

        return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    // Tampilkan pesan hasil aksi di kotak pesan. type: "success" atau "error".
    function showAlert(box, text, type) {
        box.textContent = text;
        box.className = "mg-alert mg-alert-" + (type || "success");
        box.setAttribute("role", type === "error" ? "alert" : "status");
        box.hidden = false;
        box.focus();
    }

    V.showAlert = showAlert;
    V.readStorage = readStorage;
    V.writeStorage = writeStorage;
    V.removeStorage = removeStorage;
    V.createElement = createElement;
    V.formatDate = formatDate;
})(window.VLibrary);

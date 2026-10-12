(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    if (!user || user.role !== "petugas") {
        return;
    }

    const MAX_ROWS = 5;

    function setText(id, value) {
        document.getElementById(id).textContent = String(value);
    }

    /* ---------- Ringkasan ---------- */

    const books = V.getBooks();
    const loans = V.getLoans();

    setText(
        "stat-menunggu",
        loans.filter(function (loan) {
            return loan.status === "Menunggu";
        }).length
    );
    setText("stat-judul", books.length);
    setText(
        "stat-habis",
        books.filter(function (book) {
            return book.stok < 1;
        }).length
    );
    setText(
        "stat-anggota",
        V.getPublicAccounts().filter(function (account) {
            return account.role === "pengguna";
        }).length
    );

    document.getElementById("dash-greeting").textContent =
        "Halo, " + user.nama + ". Berikut ringkasan perpustakaan.";

    /* ---------- Pengajuan terbaru ---------- */

    const rows = document.getElementById("loan-rows");
    const emptyText = document.getElementById("loan-empty");

    const latest = loans.slice().reverse().slice(0, MAX_ROWS);

    latest.forEach(function (loan) {
        const row = document.createElement("tr");

        const titles = loan.buku.map(function (book) {
            return book.judul;
        }).join(", ");

        [loan.id, loan.nama + " (" + loan.tingkatan + ")", titles]
            .forEach(function (text) {
                row.appendChild(V.createElement("td", "", text));
            });

        const dateCell = document.createElement("td");
        const time = V.createElement("time", "", V.formatDate(loan.tanggalPengajuan));
        time.setAttribute("datetime", loan.tanggalPengajuan || "");
        dateCell.appendChild(time);
        row.appendChild(dateCell);

        const statusCell = document.createElement("td");
        statusCell.appendChild(
            V.createElement(
                "span",
                "status-pill is-" + loan.status.toLowerCase(),
                loan.status
            )
        );
        row.appendChild(statusCell);

        rows.appendChild(row);
    });

    emptyText.hidden = latest.length > 0;
})();

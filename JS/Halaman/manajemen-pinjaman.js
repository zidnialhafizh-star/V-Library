(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    if (!user || user.role !== "petugas") {
        return;
    }

    const alertBox = document.getElementById("mg-alert");
    const rows = document.getElementById("loan-rows");
    const countText = document.getElementById("loan-count");
    const emptyText = document.getElementById("loan-empty");
    const filter = document.getElementById("status-filter");

    function sortedLoans() {
        return V.getLoans().sort(function (a, b) {
            return String(b.dibuatPada || "").localeCompare(String(a.dibuatPada || ""));
        });
    }

    function setText(id, value) {
        document.getElementById(id).textContent = String(value);
    }

    function dateCell(value) {
        const cell = document.createElement("td");

        if (!value) {
            cell.textContent = "-";
            return cell;
        }

        const time = V.createElement("time", "", V.formatDate(value));
        time.setAttribute("datetime", value);
        cell.appendChild(time);
        return cell;
    }

    function render() {
        const all = sortedLoans();
        const status = filter.value;
        const shown = all.filter(function (loan) {
            return !status || loan.status === status;
        });

        function countBy(name) {
            return all.filter(function (loan) {
                return loan.status === name;
            }).length;
        }

        setText("stat-total", all.length);
        setText("stat-menunggu", countBy("Menunggu"));
        setText("stat-disetujui", countBy("Disetujui"));
        setText("stat-ditolak", countBy("Ditolak"));

        rows.textContent = "";

        shown.forEach(function (loan) {
            const row = document.createElement("tr");

            row.appendChild(V.createElement("td", "", loan.id));
            row.appendChild(V.createElement("td", "", loan.nama + " (" + loan.tingkatan + ")"));
            row.appendChild(
                V.createElement(
                    "td",
                    "",
                    loan.buku.map(function (book) {
                        return book.judul;
                    }).join(", ")
                )
            );
            row.appendChild(dateCell(loan.tanggalPengajuan));
            row.appendChild(dateCell(loan.status === "Disetujui" ? loan.batasKembali : ""));

            const statusCell = document.createElement("td");
            statusCell.appendChild(
                V.createElement("span", "status-pill is-" + loan.status.toLowerCase(), loan.status)
            );
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");

            if (loan.status === "Menunggu") {
                const actions = V.createElement("div", "mg-actions");

                const approve = V.createElement("button", "mg-btn mg-btn-primary", "Setujui");
                approve.type = "button";
                approve.dataset.aksi = "setujui";
                approve.dataset.id = loan.id;
                approve.setAttribute("aria-label", "Setujui pengajuan " + loan.id);

                const reject = V.createElement("button", "mg-btn mg-btn-danger", "Tolak");
                reject.type = "button";
                reject.dataset.aksi = "tolak";
                reject.dataset.id = loan.id;
                reject.setAttribute("aria-label", "Tolak pengajuan " + loan.id);

                actions.appendChild(approve);
                actions.appendChild(reject);
                actionCell.appendChild(actions);
            } else {
                actionCell.textContent = "-";
            }

            row.appendChild(actionCell);
            rows.appendChild(row);
        });

        if (all.length === 0) {
            countText.textContent = "Belum ada pengajuan.";
            emptyText.textContent = "Belum ada pengajuan peminjaman.";
            emptyText.hidden = false;
        } else if (shown.length === 0) {
            countText.textContent = "0 pengajuan dengan status " + status + ".";
            emptyText.textContent = "Tidak ada pengajuan dengan status " + status + ".";
            emptyText.hidden = false;
        } else {
            countText.textContent = "Menampilkan " + shown.length + " dari " + all.length + " pengajuan.";
            emptyText.hidden = true;
        }
    }

    function memberTier(username) {
        const member = V.getPublicAccounts().find(function (account) {
            return account.username === username;
        });

        return member ? member.tier : null;
    }

    function approve(id) {
        const loan = V.getLoans().find(function (item) {
            return item.id === id;
        });
        const before = loan ? memberTier(loan.username) : null;
        const result = V.approveLoan(id);

        render();

        if (!result.ok) {
            const messages = {
                "stok-habis": "Pengajuan " + id + " tidak bisa disetujui karena stok habis untuk: " +
                    (result.judul || []).join(", ") + ".",
                "bukan-menunggu": "Pengajuan " + id + " sudah diputuskan sebelumnya.",
                "gagal-simpan": "Persetujuan gagal disimpan. Periksa pengaturan penyimpanan browser."
            };

            V.showAlert(alertBox, messages[result.error] || "Pengajuan gagal diproses.", "error");
            return;
        }

        const after = memberTier(result.loan.username);
        let text = "Pengajuan " + id + " disetujui. Stok dikurangi dan batas pengembalian " +
            V.formatDate(result.loan.batasKembali) + ".";

        if (before === "Silver" && after === "Gold") {
            text += " " + result.loan.nama + " naik menjadi anggota Gold.";
        }

        V.showAlert(alertBox, text);
    }

    function reject(id) {
        if (!window.confirm("Tolak pengajuan " + id + "?")) {
            return;
        }

        const result = V.rejectLoan(id);

        render();

        if (!result.ok) {
            V.showAlert(
                alertBox,
                result.error === "bukan-menunggu"
                    ? "Pengajuan " + id + " sudah diputuskan sebelumnya."
                    : "Penolakan gagal disimpan. Periksa pengaturan penyimpanan browser.",
                "error"
            );
            return;
        }

        V.showAlert(alertBox, "Pengajuan " + id + " ditolak.");
    }

    rows.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-aksi]");

        if (!button) {
            return;
        }

        if (button.dataset.aksi === "setujui") {
            approve(button.dataset.id);
        } else {
            reject(button.dataset.id);
        }
    });

    filter.addEventListener("change", render);

    render();
})();

(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    if (!user || user.role !== "petugas") {
        return;
    }

    const alertBox = document.getElementById("mg-alert");
    const rows = document.getElementById("ext-rows");
    const countText = document.getElementById("ext-count");
    const emptyText = document.getElementById("ext-empty");
    const filter = document.getElementById("status-filter");

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
        const all = V.getExtensions().sort(function (a, b) {
            return String(b.perpanjangan.tanggalPengajuan || "").localeCompare(
                String(a.perpanjangan.tanggalPengajuan || "")
            );
        });
        const status = filter.value;
        const shown = all.filter(function (loan) {
            return !status || loan.perpanjangan.status === status;
        });

        function countBy(name) {
            return all.filter(function (loan) {
                return loan.perpanjangan.status === name;
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
            row.appendChild(dateCell(loan.batasKembali));
            row.appendChild(dateCell(loan.perpanjangan.tanggalPengajuan));

            const statusCell = document.createElement("td");
            statusCell.appendChild(
                V.createElement(
                    "span",
                    "status-pill is-" + loan.perpanjangan.status.toLowerCase(),
                    loan.perpanjangan.status
                )
            );
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");

            if (loan.perpanjangan.status === "Menunggu") {
                const actions = V.createElement("div", "mg-actions");

                const approve = V.createElement("button", "mg-btn mg-btn-primary", "Setujui");
                approve.type = "button";
                approve.dataset.aksi = "setujui";
                approve.dataset.id = loan.id;
                approve.setAttribute("aria-label", "Setujui perpanjangan " + loan.id);

                const reject = V.createElement("button", "mg-btn mg-btn-danger", "Tolak");
                reject.type = "button";
                reject.dataset.aksi = "tolak";
                reject.dataset.id = loan.id;
                reject.setAttribute("aria-label", "Tolak perpanjangan " + loan.id);

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
            emptyText.textContent = "Belum ada pengajuan perpanjangan.";
            emptyText.hidden = false;
        } else if (shown.length === 0) {
            countText.textContent = "0 pengajuan dengan status " + status + ".";
            emptyText.textContent = "Tidak ada pengajuan perpanjangan dengan status " + status + ".";
            emptyText.hidden = false;
        } else {
            countText.textContent = "Menampilkan " + shown.length + " dari " + all.length + " pengajuan.";
            emptyText.hidden = true;
        }
    }

    function decide(id, approve) {
        if (!approve && !window.confirm("Tolak perpanjangan untuk peminjaman " + id + "?")) {
            return;
        }

        const result = approve ? V.approveExtension(id) : V.rejectExtension(id);

        render();

        if (!result.ok) {
            V.showAlert(
                alertBox,
                result.error === "bukan-menunggu"
                    ? "Pengajuan perpanjangan " + id + " sudah diputuskan sebelumnya."
                    : "Keputusan gagal disimpan. Periksa pengaturan penyimpanan browser.",
                "error"
            );
            return;
        }

        V.showAlert(
            alertBox,
            approve
                ? "Perpanjangan " + id + " disetujui. Batas pengembalian baru " +
                    V.formatDate(result.loan.batasKembali) + "."
                : "Perpanjangan " + id + " ditolak."
        );
    }

    rows.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-aksi]");

        if (!button) {
            return;
        }

        decide(button.dataset.id, button.dataset.aksi === "setujui");
    });

    filter.addEventListener("change", render);

    render();
})();

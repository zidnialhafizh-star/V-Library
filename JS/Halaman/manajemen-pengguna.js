(function () {
    "use strict";

    const V = window.VLibrary;
    const user = V && V.getCurrentUser();

    if (!user || user.role !== "petugas") {
        return;
    }

    const formCard = document.getElementById("member-form-card");
    const form = document.getElementById("member-form");
    const usernameText = document.getElementById("member-username");
    const cancelButton = document.getElementById("member-cancel");
    const alertBox = document.getElementById("mg-alert");
    const rows = document.getElementById("member-rows");
    const countText = document.getElementById("member-count");
    const emptyText = document.getElementById("member-empty");

    const inputs = {
        nama: document.getElementById("nama"),
        tier: document.getElementById("tier"),
        status: document.getElementById("status")
    };

    let editingUsername = null;

    function members() {
        return V.getPublicAccounts().filter(function (account) {
            return account.role === "pengguna";
        });
    }

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

    function render() {
        const list = members();

        rows.textContent = "";

        list.forEach(function (member) {
            const row = document.createElement("tr");
            row.classList.toggle("is-editing", member.username === editingUsername);

            [member.username, member.nama, member.tier, String(member.totalBuku)].forEach(function (text) {
                row.appendChild(V.createElement("td", "", text));
            });

            const statusCell = document.createElement("td");
            const active = member.status === "aktif";
            statusCell.appendChild(
                V.createElement(
                    "span",
                    "stock-badge " + (active ? "is-available" : "is-empty"),
                    active ? "Aktif" : "Nonaktif"
                )
            );
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            const actions = V.createElement("div", "mg-actions");

            const edit = V.createElement("button", "mg-btn mg-btn-light", "Ubah");
            edit.type = "button";
            edit.dataset.aksi = "ubah";
            edit.dataset.username = member.username;
            edit.setAttribute("aria-label", "Ubah pengguna " + member.username);

            const toggle = V.createElement(
                "button",
                active ? "mg-btn mg-btn-danger" : "mg-btn mg-btn-primary",
                active ? "Nonaktifkan" : "Aktifkan"
            );
            toggle.type = "button";
            toggle.dataset.aksi = "status";
            toggle.dataset.username = member.username;
            toggle.setAttribute(
                "aria-label",
                (active ? "Nonaktifkan" : "Aktifkan") + " akun " + member.username
            );

            actions.appendChild(edit);
            actions.appendChild(toggle);
            actionCell.appendChild(actions);
            row.appendChild(actionCell);

            rows.appendChild(row);
        });

        emptyText.hidden = list.length > 0;
        countText.textContent = list.length + " pengguna terdaftar.";
    }

    function closeForm() {
        editingUsername = null;
        formCard.hidden = true;
        Object.keys(inputs).forEach(function (key) {
            setFieldError(key, "");
        });
        render();
    }

    function startEdit(username) {
        const member = members().find(function (item) {
            return item.username === username;
        });

        if (!member) {
            return;
        }

        editingUsername = username;
        alertBox.hidden = true;
        Object.keys(inputs).forEach(function (key) {
            setFieldError(key, "");
        });

        usernameText.textContent = member.username;
        inputs.nama.value = member.nama;
        inputs.tier.value = member.tier;
        inputs.status.value = member.status;

        formCard.hidden = false;
        render();
        formCard.scrollIntoView({ behavior: "smooth", block: "center" });
        inputs.nama.focus();
    }

    function toggleStatus(username) {
        const member = members().find(function (item) {
            return item.username === username;
        });

        if (!member) {
            return;
        }

        const next = member.status === "aktif" ? "nonaktif" : "aktif";

        if (next === "nonaktif" &&
            !window.confirm("Nonaktifkan akun " + member.username + "? Akun ini tidak bisa masuk sampai diaktifkan lagi.")) {
            return;
        }

        const result = V.updateMember(username, { status: next });

        if (!result.ok) {
            V.showAlert(alertBox, "Perubahan gagal disimpan. Coba lagi.", "error");
            return;
        }

        if (editingUsername === username) {
            inputs.status.value = next;
        }

        render();
        V.showAlert(
            alertBox,
            "Akun " + username + (next === "aktif" ? " diaktifkan." : " dinonaktifkan.")
        );
    }

    rows.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-aksi]");

        if (!button) {
            return;
        }

        if (button.dataset.aksi === "ubah") {
            startEdit(button.dataset.username);
        } else {
            toggleStatus(button.dataset.username);
        }
    });

    cancelButton.addEventListener("click", closeForm);

    inputs.nama.addEventListener("input", function () {
        setFieldError("nama", "");
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const result = V.updateMember(editingUsername, {
            nama: inputs.nama.value,
            tier: inputs.tier.value,
            status: inputs.status.value
        });

        if (!result.ok) {
            if (result.error === "nama-pendek") {
                setFieldError("nama", "Nama lengkap wajib diisi (minimal 3 karakter).");
                inputs.nama.focus();
            } else {
                V.showAlert(alertBox, "Perubahan gagal disimpan. Coba lagi.", "error");
            }

            return;
        }

        const username = editingUsername;
        closeForm();
        V.showAlert(alertBox, "Data pengguna " + username + " diperbarui.");
    });

    render();
})();

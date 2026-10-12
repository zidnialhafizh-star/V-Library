(function () {
    "use strict";

    const V = window.VLibrary;

    if (!V) {
        return;
    }

    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("password-toggle");
    const infoBox = document.getElementById("auth-info");
    const errorBox = document.getElementById("auth-error");
    const demoList = document.getElementById("demo-list");
    const demoReset = document.getElementById("demo-reset");
    const kodeInput = document.getElementById("kode");
    const kodeField = document.getElementById("kode-field");
    const roleRadios = document.querySelectorAll("input[name='peran']");

    const params = new URLSearchParams(window.location.search);

    /* ---------- Pesan ---------- */

    function showInfo(text, type) {
        infoBox.textContent = text;
        infoBox.className = "auth-alert auth-alert-" + (type || "info");
        infoBox.hidden = false;
    }

    function showError(text) {
        errorBox.textContent = text;
        errorBox.hidden = false;
        errorBox.focus();
    }

    function setFieldError(input, message) {
        const field = input.closest(".auth-field");
        const errorText = document.getElementById(input.id + "-error");

        field.classList.toggle("has-error", Boolean(message));
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
        errorBox.hidden = true;
        setFieldError(usernameInput, "");
        setFieldError(passwordInput, "");
        setFieldError(kodeInput, "");
    }

    /* ---------- Pilihan peran ---------- */

    function getRole() {
        return document.querySelector("input[name='peran']:checked").value;
    }

    function setRole(role) {
        Array.prototype.forEach.call(roleRadios, function (radio) {
            radio.checked = radio.value === role;
        });
        updateRole();
    }

    function updateRole() {
        const isPetugas = getRole() === "petugas";

        kodeField.hidden = !isPetugas;

        if (!isPetugas) {
            kodeInput.value = "";
            setFieldError(kodeInput, "");
        }
    }

    Array.prototype.forEach.call(roleRadios, function (radio) {
        radio.addEventListener("change", function () {
            errorBox.hidden = true;
            updateRole();
        });
    });

    kodeInput.addEventListener("input", function () {
        setFieldError(kodeInput, "");
    });

    // Tombol Lihat/Sembunyi untuk kolom yang memakai data-target (kode petugas).
    Array.prototype.forEach.call(
        document.querySelectorAll(".password-toggle[data-target]"),
        function (button) {
            button.addEventListener("click", function () {
                const input = document.getElementById(button.dataset.target);
                const show = input.type === "password";

                input.type = show ? "text" : "password";
                button.textContent = show ? "Sembunyi" : "Lihat";
                button.setAttribute("aria-pressed", String(show));
            });
        }
    );

    /* ---------- Pesan dari halaman lain ---------- */

    const nextFile = String(params.get("next") || "").split(/[?#]/)[0].toLowerCase();
    const wantsPetugas =
        params.get("peran") === "petugas" ||
        nextFile === "dashboard-petugas.html" ||
        /^manajemen-[a-z0-9-]+\.html$/.test(nextFile);

    if (wantsPetugas) {
        setRole("petugas");
    }

    if (params.get("pesan") === "login") {
        showInfo(
            wantsPetugas
                ? "Masuk sebagai petugas untuk membuka halaman ini."
                : "Masuk dulu untuk mengajukan peminjaman buku."
        );
    }

    if (params.get("daftar") === "berhasil") {
        showInfo(
            params.get("peran") === "petugas"
                ? "Akun petugas berhasil dibuat. Silakan masuk sebagai petugas dengan kode petugas."
                : "Akun berhasil dibuat sebagai anggota Silver. Silakan masuk.",
            "success"
        );
    }

    if (params.get("reset") === "1") {
        showInfo("Data demo sudah dikembalikan ke kondisi awal.", "success");
    }

    if (params.get("username")) {
        usernameInput.value = params.get("username");
        passwordInput.focus();
    }

    /* ---------- Akun demo ---------- */

    V.AKUN_DEMO.forEach(function (demo) {
        const item = V.createElement("li");

        const text = V.createElement("div");
        text.appendChild(V.createElement("strong", "", demo.label));
        text.appendChild(
            V.createElement(
                "span",
                "",
                demo.username + " / " + demo.password +
                    (demo.role === "petugas" ? " / kode " + V.KODE_PETUGAS : "")
            )
        );

        const fill = V.createElement("button", "demo-fill", "Isi");
        fill.type = "button";
        fill.addEventListener("click", function () {
            setRole(demo.role === "petugas" ? "petugas" : "pengguna");
            usernameInput.value = demo.username;
            passwordInput.value = demo.password;
            kodeInput.value = demo.role === "petugas" ? V.KODE_PETUGAS : "";
            clearErrors();
            form.querySelector(".auth-submit").focus();
        });

        item.appendChild(text);
        item.appendChild(fill);
        demoList.appendChild(item);
    });

    demoReset.addEventListener("click", function () {
        const sure = window.confirm(
            "Kembalikan semua data demo (buku, akun, peminjaman) ke kondisi awal?"
        );

        if (sure) {
            V.resetDemoData();
            window.location.href = "masuk.html?reset=1";
        }
    });

    /* ---------- Lihat / sembunyikan password ---------- */

    passwordToggle.addEventListener("click", function () {
        const show = passwordInput.type === "password";

        passwordInput.type = show ? "text" : "password";
        passwordToggle.textContent = show ? "Sembunyi" : "Lihat";
        passwordToggle.setAttribute("aria-pressed", String(show));
        passwordToggle.setAttribute(
            "aria-label",
            show ? "Sembunyikan password" : "Tampilkan password"
        );
    });

    usernameInput.addEventListener("input", function () {
        setFieldError(usernameInput, "");
    });

    passwordInput.addEventListener("input", function () {
        setFieldError(passwordInput, "");
    });

    /* ---------- Kirim ---------- */

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearErrors();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        let invalid = false;

        if (!username) {
            setFieldError(usernameInput, "Username wajib diisi.");
            invalid = true;
        }

        if (!password) {
            setFieldError(passwordInput, "Password wajib diisi.");
            invalid = true;
        }

        const role = getRole();

        if (role === "petugas" && !kodeInput.value.trim()) {
            setFieldError(kodeInput, "Kode petugas wajib diisi.");
            invalid = true;
        }

        if (invalid) {
            (!username ? usernameInput : !password ? passwordInput : kodeInput).focus();
            return;
        }

        const result = V.login(username, password, {
            role: role,
            kodePetugas: kodeInput.value
        });

        if (!result.ok) {
            const messages = {
                nonaktif: "Akun ini dinonaktifkan. Hubungi petugas perpustakaan untuk mengaktifkannya kembali.",
                "bukan-petugas": "Akun ini bukan akun petugas. Pilih \"Pengguna\" pada Masuk sebagai.",
                "akun-petugas": "Akun ini terdaftar sebagai petugas. Pilih \"Petugas\" pada Masuk sebagai."
            };

            if (result.error === "kode-salah") {
                setFieldError(kodeInput, "Kode petugas salah. Periksa lagi kodenya.");
                kodeInput.focus();
            } else {
                showError(
                    messages[result.error] ||
                        "Username atau password salah. Periksa lagi lalu coba masuk."
                );
            }

            return;
        }

        const target = V.safeNext(params.get("next"), result.user) || V.homeFor(result.user);
        window.location.href = target;
    });
})();

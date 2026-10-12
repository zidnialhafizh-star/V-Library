(function () {
    "use strict";

    const V = window.VLibrary;

    if (!V) {
        return;
    }

    const form = document.getElementById("register-form");
    const errorBox = document.getElementById("auth-error");

    const inputs = {
        nama: document.getElementById("nama"),
        username: document.getElementById("username"),
        password: document.getElementById("password"),
        password2: document.getElementById("password2"),
        kode: document.getElementById("kode")
    };

    const roleRadios = document.querySelectorAll("input[name='peran']");
    const kodeField = document.getElementById("kode-field");

    const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/;
    const MIN_PASSWORD = 6;

    /* ---------- Pesan ---------- */

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

        Object.keys(inputs).forEach(function (key) {
            setFieldError(inputs[key], "");
        });
    }

    // Bersihkan pesan kolom yang sedang diketik.
    Object.keys(inputs).forEach(function (key) {
        inputs[key].addEventListener("input", function () {
            setFieldError(inputs[key], "");
        });
    });

    /* ---------- Pilihan peran ---------- */

    function getRole() {
        return document.querySelector("input[name='peran']:checked").value;
    }

    function updateRole() {
        const isPetugas = getRole() === "petugas";

        kodeField.hidden = !isPetugas;

        if (!isPetugas) {
            inputs.kode.value = "";
            setFieldError(inputs.kode, "");
        }
    }

    Array.prototype.forEach.call(roleRadios, function (radio) {
        radio.addEventListener("change", updateRole);
    });

    updateRole();

    /* ---------- Lihat / sembunyikan password ---------- */

    Array.prototype.forEach.call(
        document.querySelectorAll(".password-toggle"),
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

    /* ---------- Validasi ---------- */

    // Mengembalikan objek { namaKolom: pesan } untuk kolom yang salah.
    function validate(values) {
        const errors = {};

        if (values.role === "petugas" && !values.kode.trim()) {
            errors.kode = "Kode petugas wajib diisi.";
        }

        if (values.nama.trim().length < 3) {
            errors.nama = "Nama lengkap wajib diisi (minimal 3 karakter).";
        }

        if (!values.username.trim()) {
            errors.username = "Username wajib diisi.";
        } else if (!USERNAME_PATTERN.test(values.username.trim())) {
            errors.username =
                "Username 4 sampai 20 karakter, hanya huruf, angka, dan garis bawah (_).";
        }

        if (!values.password) {
            errors.password = "Password wajib diisi.";
        } else if (values.password.length < MIN_PASSWORD) {
            errors.password = "Password minimal " + MIN_PASSWORD + " karakter.";
        }

        if (!values.password2) {
            errors.password2 = "Konfirmasi password wajib diisi.";
        } else if (values.password2 !== values.password) {
            errors.password2 = "Konfirmasi password tidak sama dengan password.";
        }

        return errors;
    }

    /* ---------- Kirim ---------- */

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearErrors();

        const values = {
            role: getRole(),
            kode: inputs.kode.value,
            nama: inputs.nama.value,
            username: inputs.username.value,
            password: inputs.password.value,
            password2: inputs.password2.value
        };

        const errors = validate(values);
        // Urutan kolom di layar: kode petugas paling atas.
        const firstInvalid = ["kode", "nama", "username", "password", "password2"].find(function (key) {
            return errors[key];
        });

        if (firstInvalid) {
            Object.keys(errors).forEach(function (key) {
                setFieldError(inputs[key], errors[key]);
            });

            inputs[firstInvalid].focus();
            return;
        }

        const result = V.registerAccount({
            role: values.role,
            kodePetugas: values.kode,
            nama: values.nama,
            username: values.username,
            password: values.password
        });

        if (!result.ok) {
            if (result.error === "kode-salah") {
                setFieldError(inputs.kode, "Kode petugas salah. Periksa lagi kodenya.");
                inputs.kode.focus();
            } else if (result.error === "username-dipakai") {
                setFieldError(
                    inputs.username,
                    "Username sudah dipakai. Pilih username lain."
                );
                inputs.username.focus();
            } else {
                errorBox.textContent =
                    "Akun gagal disimpan di browser ini. Periksa pengaturan penyimpanan lalu coba lagi.";
                errorBox.hidden = false;
                errorBox.focus();
            }

            return;
        }

        window.location.href =
            "masuk.html?daftar=berhasil&peran=" + result.user.role +
            "&username=" + encodeURIComponent(result.user.username);
    });
})();

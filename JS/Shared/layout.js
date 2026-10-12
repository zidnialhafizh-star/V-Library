(function (V) {
    "use strict";

    // Penjaga halaman. Atur lewat atribut data-akses di <body>:
    //   "pengguna" = hanya anggota yang sudah login
    //   "petugas"  = hanya petugas
    //   "tamu"     = hanya pengunjung (Masuk dan Daftar)
    // Mengembalikan false jika pengguna sedang dialihkan.
    function enforceAccess(user) {
        const rule = document.body.dataset.akses;
        let target = null;

        if (!rule) {
            return true;
        }

        const currentFile = window.location.pathname.split("/").pop() || "index.html";
        const loginUrl =
            "masuk.html?pesan=login&next=" +
            encodeURIComponent(currentFile + window.location.search);

        if (rule === "pengguna") {
            if (!user) {
                target = loginUrl;
            } else if (user.role !== "pengguna") {
                target = V.homeFor(user);
            }
        } else if (rule === "petugas") {
            if (!user) {
                target = loginUrl;
            } else if (user.role !== "petugas") {
                target = "index.html";
            }
        } else if (rule === "tamu" && user) {
            target = V.homeFor(user);
        }

        if (target) {
            document.documentElement.style.visibility = "hidden";
            window.location.replace(target);
            return false;
        }

        return true;
    }

    // Tampilkan hanya elemen yang cocok dengan peran pengunjung.
    function applyRole(user) {
        const role = user ? user.role : "tamu";

        Array.prototype.forEach.call(
            document.querySelectorAll("[data-tampil]"),
            function (element) {
                const allowed = element.dataset.tampil.split(/\s+/);
                element.hidden = allowed.indexOf(role) === -1;
            }
        );
    }

    // Isi nama, inisial, dan tingkatan akun di header.
    function fillAccount(user) {
        if (!user) {
            return;
        }

        const isPetugas = user.role === "petugas";
        const roleText = isPetugas ? "Petugas" : "Anggota " + user.tier;

        const chip = document.querySelector(".account-chip");
        const initial = document.querySelector("[data-akun='inisial']");
        const name = document.querySelector("[data-akun='nama']");
        const role = document.querySelector("[data-akun='peran']");

        if (chip) {
            chip.title = user.nama;
        }

        if (initial) {
            initial.textContent = user.nama.charAt(0).toUpperCase();
        }

        if (name) {
            name.textContent = user.nama;
        }

        if (role) {
            role.textContent = roleText;
            role.classList.toggle("is-gold", !isPetugas && user.tier === "Gold");
        }
    }

    function setupMobileMenu() {
        const header = document.querySelector(".site-header");
        const toggle = header && header.querySelector(".nav-toggle");

        if (!toggle) {
            return;
        }

        function setOpen(open) {
            header.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
        }

        toggle.addEventListener("click", function () {
            setOpen(!header.classList.contains("is-open"));
        });

        header.addEventListener("click", function (event) {
            if (event.target.closest(".header-panel a")) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 860) {
                setOpen(false);
            }
        });
    }

    // Dropdown "Layanan". Di desktop muncul lewat CSS saat hover/fokus.
    // Klik/tap tetap membuka-menutupnya (layar sentuh dan mobile).
    function setupDropdowns() {
        const dropdowns = document.querySelectorAll(".has-dropdown");

        Array.prototype.forEach.call(dropdowns, function (item) {
            const toggle = item.querySelector(".nav-dropdown-toggle");

            if (!toggle) {
                return;
            }

            function setOpen(open) {
                item.classList.toggle("is-open", open);
                toggle.setAttribute("aria-expanded", String(open));
            }

            toggle.addEventListener("click", function () {
                setOpen(!item.classList.contains("is-open"));
            });

            // Sinkronkan aria-expanded dengan hover di desktop.
            item.addEventListener("mouseenter", function () {
                toggle.setAttribute("aria-expanded", "true");
            });

            item.addEventListener("mouseleave", function () {
                toggle.setAttribute(
                    "aria-expanded",
                    String(item.classList.contains("is-open"))
                );
            });

            document.addEventListener("click", function (event) {
                if (!item.contains(event.target)) {
                    setOpen(false);
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && item.classList.contains("is-open")) {
                    setOpen(false);
                    toggle.focus();
                }
            });
        });
    }

    function setupLogout() {
        const button = document.querySelector("[data-aksi='keluar']");

        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            V.logout();
            window.location.href = "index.html";
        });
    }

    function fillYear() {
        const year = String(new Date().getFullYear());

        Array.prototype.forEach.call(
            document.querySelectorAll("[data-tahun]"),
            function (element) {
                element.textContent = year;
            }
        );
    }

    // Script dimuat dengan atribut defer, jadi DOM sudah siap di sini.
    const user = V.getCurrentUser();

    if (enforceAccess(user)) {
        applyRole(user);
        fillAccount(user);
        setupMobileMenu();
        setupDropdowns();
        setupLogout();
        fillYear();
    }
})(window.VLibrary);

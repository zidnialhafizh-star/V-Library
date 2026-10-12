(function (V) {
    "use strict";

    function seedAccounts() {
        return V.AKUN_DEMO.map(function (demo) {
            const salt = V.makeSalt();

            return {
                username: demo.username,
                nama: demo.nama,
                role: demo.role,
                tier: demo.tier,
                status: demo.status,
                totalBuku: demo.totalBuku,
                salt: salt,
                passHash: V.hashPassword(demo.password, salt),
                dibuatPada: new Date().toISOString()
            };
        });
    }

    function getAccounts() {
        const stored = V.readStorage(V.KEYS.akun);

        if (Array.isArray(stored)) {
            return stored;
        }

        const accounts = seedAccounts();
        V.writeStorage(V.KEYS.akun, accounts);
        return accounts;
    }

    function findAccount(accounts, username) {
        const key = String(username || "").trim().toLowerCase();

        return accounts.find(function (account) {
            return account.username.toLowerCase() === key;
        }) || null;
    }

    // Data akun tanpa password, aman dipakai halaman.
    function publicUser(account) {
        return {
            username: account.username,
            nama: account.nama,
            role: account.role,
            tier: account.tier,
            status: account.status,
            totalBuku: account.totalBuku
        };
    }

    function getPublicAccounts() {
        return getAccounts().map(publicUser);
    }

    function isPetugasCode(code) {
        return String(code || "").trim() === V.KODE_PETUGAS;
    }

    // Daftar akun baru (FR-01). Pengguna otomatis anggota Silver dan aktif.
    // Petugas (data.role === "petugas") wajib memakai kode petugas yang benar.
    function registerAccount(data) {
        const accounts = getAccounts();
        const asPetugas = data.role === "petugas";

        if (asPetugas && !isPetugasCode(data.kodePetugas)) {
            return { ok: false, error: "kode-salah" };
        }

        if (findAccount(accounts, data.username)) {
            return { ok: false, error: "username-dipakai" };
        }

        const salt = V.makeSalt();

        const account = {
            username: data.username.trim(),
            nama: data.nama.trim(),
            role: asPetugas ? "petugas" : "pengguna",
            tier: asPetugas ? null : "Silver",
            status: "aktif",
            totalBuku: 0,
            salt: salt,
            passHash: V.hashPassword(data.password, salt),
            dibuatPada: new Date().toISOString()
        };

        accounts.push(account);

        if (!V.writeStorage(V.KEYS.akun, accounts)) {
            return { ok: false, error: "gagal-simpan" };
        }

        return { ok: true, user: publicUser(account) };
    }

    // Masuk (FR-02). Akun nonaktif ditolak (FR-09).
    // options.role: "pengguna" (bawaan) atau "petugas".
    // Masuk sebagai petugas juga wajib memakai options.kodePetugas yang benar.
    function login(username, password, options) {
        const opts = options || {};
        const asPetugas = opts.role === "petugas";
        const account = findAccount(getAccounts(), username);

        if (!account || account.passHash !== V.hashPassword(password, account.salt)) {
            return { ok: false, error: "kredensial" };
        }

        if (account.status !== "aktif") {
            return { ok: false, error: "nonaktif" };
        }

        if (asPetugas && account.role !== "petugas") {
            return { ok: false, error: "bukan-petugas" };
        }

        if (!asPetugas && account.role === "petugas") {
            return { ok: false, error: "akun-petugas" };
        }

        if (asPetugas && !isPetugasCode(opts.kodePetugas)) {
            return { ok: false, error: "kode-salah" };
        }

        V.writeStorage(V.KEYS.sesi, {
            username: account.username,
            masukPada: new Date().toISOString()
        });

        return { ok: true, user: publicUser(account) };
    }

    function logout() {
        V.removeStorage(V.KEYS.sesi);
    }

    // Pengguna yang sedang login, atau null jika pengunjung.
    function getCurrentUser() {
        const session = V.readStorage(V.KEYS.sesi);

        if (!session || !session.username) {
            return null;
        }

        const account = findAccount(getAccounts(), session.username);

        if (!account || account.status !== "aktif") {
            V.removeStorage(V.KEYS.sesi);
            return null;
        }

        return publicUser(account);
    }

    // Halaman awal sesuai peran setelah login.
    function homeFor(user) {
        return user && user.role === "petugas" ? "dashboard-petugas.html" : "index.html";
    }

    // Halaman khusus petugas: dashboard dan semua halaman manajemen.
    function isPetugasPage(file) {
        return file === "dashboard-petugas.html" || /^manajemen-[a-z0-9-]+\.html$/.test(file);
    }

    // Hanya terima tujuan berupa file .html di folder yang sama.
    function safeNext(next, user) {
        const pattern = /^[a-z0-9-]+\.html(\?[\w%=&.\-]*)?(#[\w-]*)?$/i;

        if (!next || !pattern.test(next)) {
            return null;
        }

        const file = next.split(/[?#]/)[0].toLowerCase();

        if (file === "masuk.html" || file === "daftar.html") {
            return null;
        }

        if (user.role === "petugas" && (file === "peminjaman.html" || file === "riwayat.html")) {
            return null;
        }

        if (user.role === "pengguna" && isPetugasPage(file)) {
            return null;
        }

        return next;
    }

    /* ---------- Pengelolaan anggota oleh petugas (FR-09, FR-13) ---------- */

    // Ubah nama, tingkatan, atau status anggota. Hanya akun pengguna.
    function updateMember(username, changes) {
        const accounts = getAccounts();
        const account = findAccount(accounts, username);

        if (!account || account.role !== "pengguna") {
            return { ok: false, error: "tidak-ditemukan" };
        }

        const nama = String(changes.nama === undefined ? account.nama : changes.nama).trim();

        if (nama.length < 3) {
            return { ok: false, error: "nama-pendek" };
        }

        if (changes.tier !== undefined && !V.TIERS[changes.tier]) {
            return { ok: false, error: "tier-salah" };
        }

        if (changes.status !== undefined && ["aktif", "nonaktif"].indexOf(changes.status) === -1) {
            return { ok: false, error: "status-salah" };
        }

        account.nama = nama;
        account.tier = changes.tier === undefined ? account.tier : changes.tier;
        account.status = changes.status === undefined ? account.status : changes.status;

        return V.writeStorage(V.KEYS.akun, accounts)
            ? { ok: true, user: publicUser(account) }
            : { ok: false, error: "gagal-simpan" };
    }

    // Tambah total buku disetujui. Silver naik ke Gold jika lebih dari batas (FR-13).
    function addApprovedBooks(username, count) {
        const accounts = getAccounts();
        const account = findAccount(accounts, username);

        if (!account || account.role !== "pengguna") {
            return false;
        }

        account.totalBuku = (Number(account.totalBuku) || 0) + count;

        if (account.tier === "Silver" && account.totalBuku > V.BATAS_GOLD) {
            account.tier = "Gold";
        }

        return V.writeStorage(V.KEYS.akun, accounts);
    }

    // Kembalikan semua data ke kondisi awal (untuk persiapan demo).
    function resetDemoData() {
        Object.keys(V.KEYS).forEach(function (name) {
            V.removeStorage(V.KEYS[name]);
        });
    }

    V.getPublicAccounts = getPublicAccounts;
    V.addApprovedBooks = addApprovedBooks;
    V.updateMember = updateMember;
    V.registerAccount = registerAccount;
    V.login = login;
    V.logout = logout;
    V.getCurrentUser = getCurrentUser;
    V.homeFor = homeFor;
    V.safeNext = safeNext;
    V.resetDemoData = resetDemoData;
})(window.VLibrary);

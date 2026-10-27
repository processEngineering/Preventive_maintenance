import { render } from '../src/auth/auth-router.js';

// --- render sign-up form
render( `
    <header class="app-header">
        <h2>DAFTAR AKUN</h2>
        <p>
            Lengkapi data untuk akses sistem
        </p>
    </header>

    <main class="card">
        <div class="form-group">
            <label for="fullname">
                Nama Lengkap
            </label>
            <input
                type="text"
                id="fullname"
                placeholder="nama lengkap anda"
                required
            >
        </div>

        <div class="form-group">
            <label for="divisi">
                Divisi
            </label>

            <input
                type="text"
                id="divisi"
                placeholder="divisi anda"
                required
            >
        </div>

        <div class="form-group">
            <label for="jabatan">
                Jabatan
            </label>

            <select
                id="jabatan"
                required
            >

                <option
                    value=""
                    disabled
                    selected
                >
                    -- PILIH JABATAN --
                </option>

                <option value="OPERATOR | PELAKSANA">
                    OPERATOR | PELAKSANA
                </option>

                <option value="SUPERVISOR | KOORDINATOR">
                    SUPERVISOR | KOORDINATOR
                </option>

                <option value="SUPERINTENDENT">
                    SUPERINTENDENT
                </option>

                <option value="JUNIOR MANAGER PRODUKSI">
                    JUNIOR MANAGER PRODUKSI
                </option>

                <option value="JUNIOR MANAGER PPC">
                    JUNIOR MANAGER PPC
                </option>

                <option value="MANAGER">
                    MANAGER
                </option>
            </select>
        </div>


        <div class="form-group">
            <label for="email">
                Email
            </label>

            <input
                type="email"
                id="email"
                placeholder="email pribadi/divisi anda"
                required
            >
        </div>

        <div class="form-group">
            <label for="password">
                Password
            </label>

            <input
                type="password"
                id="password"
                placeholder="minimal 12 karakter"
                minlength="12"
                required
            >
        </div>

        <p id="register-status" role="status" aria-live="polite"></p>

        <button
            type="button"
            id="btnDaftar"
        >
            DAFTAR SEKARANG
        </button>

        <p class="footer-link">
            Belum menerima email verifikasi?
            <button type="button" id="btnResend" disabled>
                KIRIM ULANG
            </button>
        </p>
    </main>

    <p class="footer-link">
        Sudah punya akun?
        <a href="../view/auth.html?mode=login">
            Masuk di sini
        </a>
    </p>
`);

// --- dom elements
const fullnameInput =
    document.getElementById("fullname");

const divisiInput =
    document.getElementById("divisi");

const jabatanInput =
    document.getElementById("jabatan");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const btnDaftar =
    document.getElementById("btnDaftar");
const btnResend =
    document.getElementById("btnResend");
const statusBox =
    document.getElementById("register-status");

// -- register event
btnDaftar.addEventListener(
    "click",
    registerUser
);
btnResend.addEventListener("click", resendVerification);

// --- register user function
async function registerUser() {

    const fullname =
        fullnameInput.value.trim();

    const divisi =
        divisiInput.value.trim();

    const jabatan =
        jabatanInput.value;

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    // --- validate inputs
    if (
        !fullname ||
        !divisi ||
        !jabatan ||
        !email ||
        !password
    ) {
        alert(
            "Mohon lengkapi semua kolom!"
        );
        return;
    }

    if (password.length < 12) {
        alert(
            "Kata sandi minimal 12 karakter!"
        );
        return;
    }

    // --- disable button and show loading
    btnDaftar.disabled = true;
    btnDaftar.textContent =
        "SEDANG PROSES";
    statusBox.textContent = "";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                full_name: fullname,
                divisi,
                jabatan,
                email,
                password
            })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Pendaftaran gagal. Silakan coba lagi.");
        }
        statusBox.textContent =
            "Jika email dapat didaftarkan, tautan verifikasi akan dikirim. Periksa inbox dan folder spam.";
        btnResend.disabled = false;
    } catch (error) {
        console.error(
            "Registration error:",
            error
        );
        statusBox.textContent = error.message || "Terjadi kesalahan sistem.";
        btnResend.disabled = false;
    } finally {
        btnDaftar.disabled = false;
        btnDaftar.textContent =
            "DAFTAR SEKARANG";
    }
}

async function resendVerification() {
    btnResend.disabled = true;
    statusBox.textContent = "";
    try {
        const response = await fetch("/api/auth/resend-verification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            credentials: "same-origin",
            body: JSON.stringify({ email: emailInput.value.trim() })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Tidak dapat mengirim ulang tautan.");
        }
        statusBox.textContent =
            "Jika ada akun yang belum terverifikasi untuk email tersebut, tautan baru akan dikirim.";
    } catch (error) {
        console.error("Verification resend error:", error);
        statusBox.textContent = error.message || "Terjadi kesalahan sistem.";
    } finally {
        btnResend.disabled = false;
    }
}
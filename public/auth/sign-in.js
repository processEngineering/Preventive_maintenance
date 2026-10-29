import { render } from "../src/utils/renderer.js";


// --- render sign-in form
export function renderSignIn() {
    render(`

        <div class="login-container">

            <div class="login-card">

                <div class="card-logo-container">

                    <img
                        src="https://raw.githubusercontent.com/processEngineering/Preventive_maintenance/main/logo%20akg.png"
                        alt="AKG"
                        class="logo-inner"
                        onerror="this.style.display='none'"
                    >

                </div>


                <div class="content">

                    <h2>
                        Selamat Datang di Aplikasi<br>
                        Maintenance
                    </h2>


                    <div id="status-box"></div>
                    <form id="loginForm">
                        <input
                            type="email"
                            id="email"
                            class="pill-input"
                            placeholder="Email Anda"
                            required
                        >


                        <input
                            type="password"
                            id="password"
                            class="pill-input"
                            placeholder="Kata Sandi"
                            required
                        >


                    <button
                        id="btnLogin"
                        class="btn-text-only"
                        type="submit"
                    >
                        MASUK
                    </button>

                    </form>

                    <button
                        id="requestActivation"
                        class="btn-text-only"
                        type="button"
                        hidden
                    >
                        MINTA AKTIVASI AKUN PENGGUNA LAMA
                    </button>


                    <div class="footer-links">

                        <a href="auth.html?mode=forgot">
                            Lupa kata sandi?
                        </a>

                        <a href="auth.html?mode=register">
                            Buat akun baru
                        </a>

                    </div>

                </div>

            </div>

        </div>

    `);
}


// --- initialize sign-in functionality
export async function initSignIn() {

    console.log("Sign-in initialized");

    const btn = document.getElementById("btnLogin");
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const statusBox = document.getElementById("status-box");
    const requestActivationButton = document.getElementById("requestActivation");

    // Pastikan element tersedia
    if (!btn || !loginForm || !emailInput || !passwordInput || !statusBox ||
        !requestActivationButton) {
        console.error("Element sign-in tidak ditemukan.");
        return;
    }


    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        prosesLogin();
    });
    requestActivationButton.addEventListener("click", requestActivation);

    await cekSesi();

    // --- login function
    async function prosesLogin() {
        const email =
            emailInput.value.trim();
        const password =
            passwordInput.value;
        // reset status
        statusBox.style.display = "none";
        statusBox.className = "";
        requestActivationButton.hidden = true;

       // --- validasi input
        if (!email || !password) {
            tampilkanPesan(
                "Email dan Password harus diisi!",
                "error"
            );
            return;
        }

        // --- loading state
        btn.innerText = "SEDANG DIPROSES...";
        btn.disabled = true;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                credentials: "same-origin",
                body: JSON.stringify({ email, password })
            });
            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error("Layanan login sedang tidak tersedia. Silakan coba lagi.");
            }
            if (!response.ok) {
                if (response.status === 401) {
                    requestActivationButton.hidden = false;
                }
                throw new Error(
                    response.status === 401
                        ? "Email atau kata sandi salah, atau email belum diverifikasi."
                        : result.error || "Login gagal. Silakan coba lagi."
                );
            }

            tampilkanPesan(
                "Login Berhasil! Mengarahkan...",
                "success"
            );

            setTimeout(() => redirectToApp(result.user), 1000);

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            let message =
                error.message;

            if (
                message.includes(
                    "Invalid login credentials"
                )
            ) {
                message =
                    "Email atau Kata Sandi SALAH.";
            }

            tampilkanPesan(
                message,
                "error"
            );

            btn.innerText = "MASUK";
            btn.disabled = false;
        }
    }

    async function requestActivation() {
        const email = emailInput.value.trim();
        if (!email || !emailInput.validity.valid) {
            tampilkanPesan("Masukkan email yang valid untuk meminta aktivasi.", "error");
            emailInput.focus();
            return;
        }

        requestActivationButton.disabled = true;
        let requestAccepted = false;
        try {
            const response = await fetch("/api/auth/request-activation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                credentials: "same-origin",
                body: JSON.stringify({ email })
            });
            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error("Permintaan aktivasi gagal dikirim. Silakan coba lagi nanti.");
            }
            if (!response.ok) {
                throw new Error(result.error || "Permintaan aktivasi gagal dikirim.");
            }
            requestAccepted = true;
            tampilkanPesan(
                result.message ||
                    "Permintaan diteruskan ke admin untuk ditinjau. Admin akan mengirim tautan setup jika akun disetujui.",
                "success"
            );
        } catch (error) {
            tampilkanPesan(error.message, "error");
        } finally {
            requestActivationButton.disabled = requestAccepted;
        }
    }

    
    // --- cek sesi function
    async function cekSesi() {
        try {
            const response = await fetch("/api/auth/me", {
                credentials: "same-origin",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (response.ok) {
                const result = await response.json();
                redirectToApp(result.user);
            }
        } catch (error) {
            console.error(
                "Cek sesi error:",
                error
            );
        }
    }

    function redirectToApp(user) {
        if (!user || !user.jabatan) {
            tampilkanPesan(
                "Profil tidak ditemukan atau belum memiliki jabatan. Hubungi Admin.",
                "error"
            );
            return;
        }
        window.location.href = "/view/base-app.html?page=home";
    }

    // --- show status message function
    function tampilkanPesan(
        pesan,
        tipe
    ) {

        statusBox.textContent =
            pesan;


        statusBox.className =
            tipe === "error"
                ? "status-error"
                : "status-success";


        statusBox.style.display =
            "block";

    }

}
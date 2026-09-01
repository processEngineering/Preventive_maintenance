import { supabaseClient as client } from "../../src/supabase/supabase-client.js";
import { render } from "../../src/utils/renderer.js";


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
                    >
                        MASUK
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
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const statusBox = document.getElementById("status-box");

    // Pastikan element tersedia
    if (!btn || !emailInput || !passwordInput || !statusBox) {
        console.error("Element sign-in tidak ditemukan.");
        return;
    }


    // --- login button click event
    passwordInput.addEventListener("keypress", (event) => {

        if (event.key === "Enter") {
            prosesLogin();
        }

    });

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
            // --- sign in with supabase
            const {
                data,
                error
            } = await client.auth.signInWithPassword({
                email: email,
                password: password

            });

            if (error) {
                if (
                    error.message.includes(
                        "Email not confirmed"
                    )
                ) {

                    throw new Error(
                        "Email belum diverifikasi. Silakan cek inbox email Anda."
                    );
                }
                throw error;
            }

            // --- login successful
            tampilkanPesan(
                "Login Berhasil! Mengarahkan...",
                "success"
            );

            if (data.user) {
                setTimeout(() => {
                    cekJabatanDanRedirect(
                        data.user.id
                    );
                }, 1000);
            }

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

    
    // --- cek sesi function
    async function cekSesi() {
        try {
            const {
                data: {
                    session
                }
            } = await client.auth.getSession();

            if (session) {
                console.log(
                    "Session ditemukan, cek jabatan..."
                );
                await cekJabatanDanRedirect(
                    session.user.id
                );
            }
        } catch (error) {
            console.error(
                "Cek sesi error:",
                error
            );
        }
    }

    // --- cek jabatan dan redirect function
   async function cekJabatanDanRedirect(userId) {
    try {
        const {
            data: profile,
            error
        } = await client
            .from("profiles")
            .select("jabatan")
            .eq("id", userId)
            .single();

        // --- profile check
        if (error || !profile) {
            tampilkanPesan(
                "Profil tidak ditemukan. Hubungi Admin.",
                "error"
            );
            return;
        }

        // --- role check
        const jabatan =
            (profile.jabatan || "")
                .toUpperCase()
                .trim();
        console.log(
            "Jabatan User:",
            jabatan
        );

        if (!jabatan) {
            tampilkanPesan(
                "Jabatan user belum terdaftar. Hubungi Admin.",
                "error"
            );
            return;
        }
        window.location.href =
            "base-app.html?page=home";
    }
    catch (error) {
        console.error(
            "Gagal cek jabatan:",
            error
        );
        tampilkanPesan(
            "Terjadi kesalahan sistem.",
            "error"
        );
    }
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
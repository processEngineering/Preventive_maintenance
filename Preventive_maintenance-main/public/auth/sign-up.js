import { supabaseClient } from "../../src/supabase/supabase-client.js";
import { render } from '../../src/auth/auth-router.js';

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

                <option value="ADMIN">
                    ADMIN
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
                placeholder="minimal 6 karakter"
                required
            >
        </div>

        <button
            type="button"
            id="btnDaftar"
        >
            DAFTAR SEKARANG
        </button>
    </main>

    <p class="footer-link">
        Sudah punya akun?
        <a href="index.html">
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

// -- register event
btnDaftar.addEventListener(
    "click",
    registerUser
);

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

    if (password.length < 6) {
        alert(
            "Password minimal 6 karakter!"
        );
        return;
    }

    // --- disable button and show loading
    btnDaftar.disabled = true;
    btnDaftar.textContent =
        "SEDANG PROSES";

    try {
        // --- create auth account
        const {
            data: authData,
            error: authError
        } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo:
                    "https://amarilyspm.vercel.app/auth.html?page=success",

                data: {
                    full_name:
                        fullname,
                    divisi,
                    jabatan
                }
            }
        });
        if (authError) {
            throw authError;
        }

        // --- save profile data
        if (authData.user) {

            const {
                error: profileError
            } = await supabaseClient
                .from("profiles")
                .upsert([

                    {
                        id:
                            authData.user.id,

                        full_name:
                            fullname,

                        divisi,

                        jabatan
                    }

                ]);


            if (profileError) {

                console.error(
                    "Gagal simpan profil:",
                    profileError
                );

                alert(
                    "Akun Auth berhasil, tapi gagal " +
                    "simpan data profil.\n\n" +
                    "Error: " +
                    profileError.message
                );

                return;
            }


            await supabaseClient.auth.signOut();

            // --- show success message and redirect
            alert(
                "PENDAFTARAN BERHASIL!\n\n" +
                "Silakan cek inbox/spam email Anda " +
                "untuk verifikasi, lalu login."
            );


            window.location.href =
                "../../view/auth.html?mode=login";
        }

    } catch (error) {

        console.error(
            "Error Utama:",
            error
        );


        alert(
            "Gagal Mendaftar: " +
            (
                error.message ||
                "Terjadi kesalahan sistem."
            )
        );

    } finally {

        btnDaftar.disabled = false;

        btnDaftar.textContent =
            "DAFTAR SEKARANG";
    }
}
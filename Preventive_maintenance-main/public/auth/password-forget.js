import { supabaseClient } from '../../src/supabase/supabase-client.js';
import { render } from '../../src/auth/auth-router.js';

// --- render password forget form
render(`
    <div class="auth-shell">

        <header class="auth-header">
            <h1>LUPA KATA SANDI?</h1>
        </header>

        <div id="status-box" class="status-box"></div>

        <div class="auth-card">

            <p>
                Masukkan email Anda.
                Kami akan mengirimkan link untuk mereset password Anda.
            </p>

            <div class="input-group">

                <i class="fa-solid fa-envelope"></i>

                <input
                    type="email"
                    id="email"
                    placeholder="Masukkan email terdaftar"
                    required
                >

            </div>

            <button
                id="btnReset"
                class="btn-3d"
            >
                KIRIM LINK RESET
            </button>

        </div>

    </div>
`);


// --- dom elements
const emailInput    = document.getElementById('email');
const btnReset      = document.getElementById('btnReset');
const statusBox     = document.getElementById('status-box');


// --- show status message
function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className =
        `status-box ${type}`;
    statusBox.style.display =
        'block';
}


// --- reset button
btnReset.addEventListener(
    'click',
    kirimReset
);

async function kirimReset() {
    const email =
        emailInput.value.trim();
    statusBox.style.display =
        'none';

    // validasi
    if (!email) {
        showStatus(
            'Isi email dulu!',
            'status-error'
        );
        return;
    }

    // loading
    btnReset.disabled = true;
    btnReset.innerHTML =
        'MENGIRIM... <i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const { error } =
            await supabaseClient.auth
                .resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            `${window.location.origin}/view/auth.html?mode=update`
                    }
                );

        if (error) {
            throw error;
        }

        // success
        showStatus(
            'BERHASIL! Cek email Anda (Inbox/Spam) dan klik link reset password.',
            'status-success'
        );


    } catch (error) {
        console.error(
            'Reset password error:',
            error
        );
        showStatus(
            `Gagal: ${error.message}`,
            'status-error'
        );

    } finally {
        btnReset.disabled = false;
        btnReset.textContent =
            'KIRIM LINK RESET';
    }
}
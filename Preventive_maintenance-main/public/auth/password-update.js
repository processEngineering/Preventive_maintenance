import { supabaseClient } from '../../src/supabase/supabase-client.js';
import { render } from '../../src/auth/auth-router.js';

// --- render password update form
render(`
    <div class="auth-shell">

        <header class="auth-header">
            <h1>UPDATE PASSWORD</h1>
        </header>

        <div id="status-box" class="status-box"></div>

        <div class="auth-card">

            <p>
                Silakan buat password baru Anda
                untuk mengamankan akses akun.
            </p>

            <div class="input-group">
                <i class="fa-solid fa-lock"></i>

                <input
                    type="password"
                    id="new-password"
                    placeholder="Password Baru (Min 6 Karakter)"
                    required
                >
            </div>

            <button id="btnUpdate" class="btn-3d">
                SIMPAN PASSWORD
            </button>

        </div>

    </div>
`);


// --- dom elements
const passwordInput = document.getElementById('new-password');
const btnUpdate     = document.getElementById('btnUpdate');
const statusBox     = document.getElementById('status-box');


// --- show status message
function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className =
        `status-box ${type}`;
    statusBox.style.display = 'block';
}

btnUpdate.addEventListener('click', updatePassword);
async function updatePassword() {
    const newPassword =
        passwordInput.value;
    statusBox.style.display = 'none';
    if (newPassword.length < 6) {
        showStatus(
            'Password minimal 6 karakter!',
            'status-error'
        );
        return;
    }

    btnUpdate.disabled = true;
    btnUpdate.innerHTML =
        'MENYIMPAN... <i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const { error } =
            await supabase.auth.updateUser({
                password: newPassword
            });

        if (error) {
            throw error;
        }

        showStatus(
            'SUKSES! Password berhasil diganti.',
            'status-success'
        );

        setTimeout(() => {

            window.location.href =
                '../../view/auth.html?mode=login';

        }, 2000);

    } catch (error) {

        console.error(error);

        showStatus(
            `Gagal: ${error.message}`,
            'status-error'
        );

        btnUpdate.disabled = false;

        btnUpdate.textContent =
            'SIMPAN PASSWORD';
    }
}
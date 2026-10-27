const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
const form = document.getElementById('setup-form');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm-password');
const button = document.getElementById('submit-button');
const status = document.getElementById('status');

if (token) {
    window.history.replaceState(null, '', window.location.pathname);
} else {
    form.hidden = true;
    status.textContent = 'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru kepada admin.';
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';

    if (!token) return;
    if (passwordInput.value !== confirmInput.value) {
        status.textContent = 'Kata sandi tidak cocok.';
        return;
    }
    if (passwordInput.value.length < 6) {
        status.textContent = 'Kata sandi harus minimal 6 karakter.';
        return;
    }

    button.disabled = true;
    button.textContent = 'MENYIMPAN...';
    try {
        const response = await fetch('/api/auth/setup-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ token, password: passwordInput.value })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Tidak dapat menyimpan kata sandi.');
        }
        form.hidden = true;
        status.textContent = 'Kata sandi berhasil dibuat. Aplikasi belum tersedia di situs uji ini.';
    } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
        button.textContent = 'SIMPAN KATA SANDI';
    }
});

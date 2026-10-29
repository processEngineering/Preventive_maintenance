const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
const button = document.getElementById('approve-button');
const status = document.getElementById('status');

if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    button.disabled = false;
    window.history.replaceState(null, '', window.location.pathname);
} else {
    status.textContent = 'Tautan persetujuan tidak valid atau kedaluwarsa.';
    status.className = 'status-box status-error';
    status.style.display = 'block';
}

button.addEventListener('click', async () => {
    if (!token || button.disabled) return;

    button.disabled = true;
    button.textContent = 'MEMPROSES PERSETUJUAN...';
    status.textContent = '';
    try {
        const response = await fetch('/api/auth/approve-activation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ token })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Persetujuan aktivasi gagal diproses.');
        }
        status.textContent = result.message;
        status.className = 'status-box status-success';
        status.style.display = 'block';
        button.textContent = 'PERSETUJUAN SELESAI';
    } catch (error) {
        status.textContent = error.message;
        status.className = 'status-box status-error';
        status.style.display = 'block';
        button.textContent = 'COBA LAGI';
        button.disabled = false;
    }
});

const status = document.getElementById("verification-status");
const loginLink = document.getElementById("login-link");
const token = new URLSearchParams(window.location.hash.slice(1)).get("token");

window.history.replaceState(null, "", window.location.pathname);

if (!token) {
    status.textContent = "Tautan verifikasi tidak valid atau sudah kedaluwarsa.";
} else {
    try {
        const response = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            credentials: "same-origin",
            body: JSON.stringify({ token })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Verifikasi email gagal.");
        }
        status.textContent = "Email berhasil diverifikasi. Silakan masuk.";
        loginLink.hidden = false;
    } catch (error) {
        console.error("Email verification error:", error);
        status.textContent = error.message || "Terjadi kesalahan sistem.";
    }
}

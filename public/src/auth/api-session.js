export async function getCurrentUser() {
    const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: { 'ngrok-skip-browser-warning': 'true' }
    });

    if (response.status === 401) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Session check failed (${response.status})`);
    }

    const result = await response.json();
    if (!result.user?.id || !result.user?.jabatan) {
        throw new Error('Authenticated profile is incomplete');
    }
    return result.user;
}

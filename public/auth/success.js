import { render } from '../../src/auth/auth-router.js';

render(`
    <div class="success-card">

        <div class="success-icon">
            ✓
        </div>

        <h1>BERHASIL!</h1>

        <p>
            Email Anda telah terverifikasi.
            <br>
            Akun Anda sekarang sudah <b>AKTIF</b>.
        </p>

        <p>
            Silakan kembali ke aplikasi untuk melakukan login.
        </p>

        <a
            href="../public/auth/sign-in.js"
            class="btn-3d"
        >
            MASUK KE APLIKASI
        </a>

    </div>
`);
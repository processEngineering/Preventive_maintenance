// --- render panduan
function renderPanduan() {
    const header = document.getElementById('mainHeader');
    const content = document.getElementById('pageContent');
    // header
    header.innerHTML = `
        <div class="header-title-pill">
            SOP APLIKASI
        </div>
    `;
    // content
    content.innerHTML = `
        <div class="panduan-content">

            <!-- INTRO -->
            <div class="sop-intro">
                <h2>
                    PT. Amarilys Karisma Gemilang
                </h2>
                <p>
                    Standar Operasional Prosedur (SOP)
                    Penggunaan Aplikasi Monitoring Mesin.
                </p>
            </div>

            <!-- 1. PELAKSANA -->
            <div class="role-card">
                <div class="role-header">
                    <div class="role-icon">
                        <i class="fa-solid fa-user-gear"></i>
                    </div>
                    <div class="role-title">
                        1. Panduan Pelaksana
                    </div>
                </div>

                <div class="role-desc">
                    Bertanggung jawab melakukan pengecekan
                    langsung pada mesin dan mengisi laporan.
                </div>

                <ol class="step-list">
                    <li>
                        Buka aplikasi dan pilih menu
                        <strong>Pelaksana</strong>.
                    </li>
                    <li>
                        Tekan tombol Scan dan arahkan kamera
                        ke <strong>QR Code Mesin</strong>.
                    </li>
                    <li>
                        Isi nama lengkap dan jam operasional.
                    </li>
                    <li>
                        Lakukan pengecekan fisik mesin
                        sesuai daftar checklist.
                    </li>
                    <li>
                        Pilih <strong>OK</strong> jika normal,
                        atau <strong>NG</strong> jika ada masalah
                        (Wajib isi catatan).
                    </li>
                    <li>
                        Bubuhkan tanda tangan digital.
                    </li>
                    <li>
                        Tekan tombol
                        <strong>SIMPAN & KIRIM</strong>.
                    </li>
                </ol>
            </div>

            <!-- 2. KOORDINATOR -->
            <div class="role-card">
                <div class="role-header">
                    <div class="role-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="role-title">
                        2. Panduan Koordinator
                    </div>
                </div>

                <div class="role-desc">
                    Memastikan laporan Pelaksana telah
                    dilakukan dengan benar dan valid.
                </div>

                <ol class="step-list">
                    <li>
                        Buka menu <strong>Koordinator</strong>.
                    </li>
                    <li>
                        Lihat daftar antrean yang belum
                        diverifikasi.
                    </li>
                    <li>
                        Lakukan scan ulang pada mesin yang sama
                        untuk membuka form verifikasi.
                    </li>
                    <li>
                        Periksa hasil checklist dan catatan
                        dari Pelaksana.
                    </li>
                    <li>
                        Isi nama, catatan tambahan
                        (jika ada), dan tanda tangan.
                    </li>
                    <li>
                        Tekan tombol
                        <strong>VERIFIKASI</strong>
                        untuk menyetujui laporan.
                    </li>
                </ol>
            </div>

            <!-- 3. SUPERINTENDENT -->
            <div class="role-card">
                <div class="role-header">
                    <div class="role-icon">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <div class="role-title">
                        3. Panduan Superintendent
                    </div>
                </div>

                <div class="role-desc">
                    Melakukan pengesahan laporan secara berkala
                    (Final Approval).
                </div>

                <ol class="step-list">
                    <li>
                        Buka menu
                        <strong>Superintendent</strong>.
                    </li>
                    <li>
                        Filter laporan berdasarkan
                        Bulan, Tahun, dan Mesin.
                    </li>
                    <li>
                        Tinjau laporan yang sudah diverifikasi
                        oleh Koordinator.
                    </li>
                    <li>
                        Isi nama dan tanda tangan pengesahan.
                    </li>
                    <li>
                        Tekan tombol
                        <strong>APPROVE & SELESAI</strong>.
                    </li>
                    <li>
                        <strong>Catatan:</strong>
                        Superintendent tidak perlu melakukan
                        scan mesin.
                    </li>
                </ol>
            </div>

            <!-- KENDALA -->
            <div class="trouble-section">
                <div class="trouble-title">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    KENDALA & SOLUSI
                </div>

                <div class="trouble-box">
                    <div class="trouble-subtitle">
                        A. Masalah Pemahaman
                    </div>
                    <ul class="trouble-list">
                        <li>
                            Pelajari kembali panduan ini.
                        </li>
                        <li>
                            Koordinasikan dengan atasan langsung
                            atau Koordinator.
                        </li>
                    </ul>
                </div>

                <div class="trouble-box">
                    <div class="trouble-subtitle">
                        B. Masalah Teknis (Error/Gagal Scan)
                    </div>
                    <ul class="trouble-list">
                        <li>
                            Pastikan koneksi internet stabil.
                        </li>
                        <li>
                            Pastikan cahaya cukup saat scan QR Code.
                        </li>
                        <li>
                            Jika aplikasi error, refresh halaman
                            atau lapor ke Tim Engineering dengan
                            menyertakan screenshot.
                        </li>
                    </ul>
                </div>
            </div>


            <!-- FOOTER -->
            <div class="sop-footer">
                <strong>
                    PT. Amarilys Karisma Gemilang
                </strong>
                <br>
                Dokumen ini dibuat untuk memastikan penggunaan
                aplikasi berjalan efektif dan tertib.
            </div>
        </div>
    `;
}


// --- content load
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page !== 'panduan') return;
    renderPanduan();
});

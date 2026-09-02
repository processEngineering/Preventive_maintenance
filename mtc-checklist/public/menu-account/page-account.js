// ======================================================
// PAGE ACCOUNT
// ======================================================

import { supabaseClient } from '../../src/supabase/supabase-client.js';


// ======================================================
// PAGE TEMPLATE
// ======================================================

function renderAccountPage() {

    const pageContent = document.getElementById('pageContent');

    if (!pageContent) {
        console.error('Element #pageContent tidak ditemukan.');
        return false;
    }

    pageContent.innerHTML = `
        <div class="account-page">

            <!-- STATUS -->
            <div id="status-msg" role="alert"></div>

            <!-- PROFILE CARD -->
            <section class="profile-card">

                <div class="profile-cover"></div>

                <div class="profile-avatar">
                    <i class="fa-solid fa-user-tie"></i>
                </div>

                <div class="profile-info">

                    <h2
                        class="profile-name"
                        id="display-name"
                    >
                        Memuat profil...
                    </h2>

                    <div
                        class="profile-role"
                        id="display-role"
                    >
                        Memuat jabatan...
                    </div>

                    <div class="profile-email">

                        <i class="fa-solid fa-envelope"></i>

                        <span id="display-email">
                            Memuat email...
                        </span>

                    </div>

                </div>

            </section>

            <!-- ACTION MENU -->
            <section>

                <div class="section-label">
                    Pengaturan &amp; Bantuan
                </div>

                <div class="action-group">

                    <!-- CATATAN -->
                    <a
                        href="../public/menu-account/catatan.html"
                        class="action-btn"
                    >
                        <div class="action-icon">
                            <i class="fa-solid fa-note-sticky"></i>
                        </div>

                        <div class="action-text">
                            Catatan Saya
                        </div>

                        <i class="fa-solid fa-chevron-right action-arrow"></i>
                    </a>

                    <!-- HELP -->
                    <a
                        href="#"
                        class="action-btn"
                        id="helpButton"
                    >
                        <div class="action-icon">
                            <i class="fa-solid fa-circle-question"></i>
                        </div>

                        <div class="action-text">
                            Pusat Bantuan
                        </div>

                        <i class="fa-solid fa-chevron-right action-arrow"></i>
                    </a>

                    <!-- LOGOUT -->
                    <button
                        type="button"
                        class="action-btn logout"
                        id="logoutButton"
                    >
                        <div class="action-icon">
                            <i class="fa-solid fa-power-off"></i>
                        </div>

                        <div class="action-text">
                            Keluar Akun
                        </div>
                    </button>

                </div>

            </section>

        </div>
    `;

    return true;
}


// ======================================================
// HEADER TITLE
// ======================================================

function setupHeaderTitle() {

    const headerTitle =
        document.querySelector('.header-title-pill');

    if (!headerTitle) {
        console.warn(
            'header-title-pill belum tersedia.'
        );
        return false;
    }

    headerTitle.textContent = 'INFORMASI AKUN';

    return true;
}


// ======================================================
// RIPPLE EFFECT
// ======================================================

function createRipple(event) {

    const button = event.currentTarget;

    const existingRipple =
        button.querySelector('.ripple');

    if (existingRipple) {
        existingRipple.remove();
    }

    const circle =
        document.createElement('span');

    const diameter = Math.max(
        button.clientWidth,
        button.clientHeight
    );

    const radius = diameter / 2;

    const rect =
        button.getBoundingClientRect();

    let clientX;
    let clientY;

    if (event.type === 'touchstart') {

        clientX =
            event.touches[0].clientX;

        clientY =
            event.touches[0].clientY;

    } else {

        clientX = event.clientX;
        clientY = event.clientY;

    }

    circle.style.width =
        `${diameter}px`;

    circle.style.height =
        `${diameter}px`;

    circle.style.left =
        `${clientX - rect.left - radius}px`;

    circle.style.top =
        `${clientY - rect.top - radius}px`;

    circle.classList.add('ripple');

    button.appendChild(circle);

    setTimeout(() => {

        if (circle.parentElement) {
            circle.remove();
        }

    }, 600);
}


function setupRipple() {

    const buttons =
        document.querySelectorAll('.action-btn');

    buttons.forEach((button) => {

        button.addEventListener(
            'mousedown',
            createRipple
        );

        button.addEventListener(
            'touchstart',
            createRipple,
            { passive: true }
        );

    });
}


// ======================================================
// SMART NAVIGATION
// ======================================================

function setupSmartNavigation(profile) {

    const navHome =
        document.getElementById('nav-home');

    const navMenu =
        document.getElementById('nav-menu');

    if (!navHome || !navMenu) {
        console.warn(
            'Elemen smart navigation tidak ditemukan.'
        );
        return;
    }

    const jabatan =
        (profile?.jabatan || '').toUpperCase();

    let homeLink = 'index.html';
    let menuLink = 'menu_utama.html';


    if (jabatan.includes('OPERATOR')) {

        homeLink =
            'OPERATOR_HOME.html';

        menuLink =
            'MENU_UTAMA_OPERATOR.html';


    } else if (jabatan.includes('SUPERVISOR')) {

        homeLink =
            'SUPERVISOR_HOME.html';

        menuLink =
            'MENU_UTAMA_SUPERVISOR.html';


    } else if (jabatan.includes('SUPERINTENDENT')) {

        homeLink =
            'SUPERINTENDENT_HOME.html';

        menuLink =
            'MENU_UTAMA_SUPERINTENDENT.html';


    } else if (
        jabatan.includes('JUNIOR MANAGER PRODUKSI') ||
        jabatan.includes('JM PRODUKSI')
    ) {

        homeLink =
            'JUNIOR_MANAGER_PRODUKSI_HOME.html';

        menuLink =
            'MENU_UTAMA_JM_PRODUKSI.html';


    } else if (
        jabatan.includes('JUNIOR MANAGER PPIC') ||
        jabatan.includes('JM PPIC')
    ) {

        homeLink =
            'JUNIOR_MANAGER_PPIC_HOME.html';

        menuLink =
            'MENU_UTAMA_JM_PPIC.html';


    } else if (
        jabatan.includes('MANAGER') &&
        !jabatan.includes('JUNIOR')
    ) {

        homeLink =
            'MANAGER_HOME.html';

        menuLink =
            'MENU_UTAMA_MANAGER.html';

    }


    navHome.href = homeLink;
    navMenu.href = menuLink;
}


// ======================================================
// LOAD USER DATA
// ======================================================

async function loadData() {

    const statusMsg =
        document.getElementById('status-msg');

    const displayName =
        document.getElementById('display-name');

    const displayRole =
        document.getElementById('display-role');

    const displayEmail =
        document.getElementById('display-email');


    // Pastikan elemen sudah benar-benar ada
    if (
        !statusMsg ||
        !displayName ||
        !displayRole ||
        !displayEmail
    ) {

        console.error(
            'Elemen halaman Account belum tersedia.'
        );

        return;
    }


    try {

        const {
            data: { session },
            error: sessionError

        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {
            throw sessionError;
        }


        // Tidak ada session → kembali ke login
        if (!session) {

            window.location.href =
                'index.html';

            return;
        }


        // ==================================================
        // EMAIL
        // ==================================================

        displayEmail.textContent =
            session.user.email ||
            'Email tidak tersedia';


        // ==================================================
        // PROFILE
        // ==================================================

        const {
            data: profile,
            error: profileError

        } =
            await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();


        if (profileError) {

            console.error(
                'Gagal mengambil profil:',
                profileError
            );

            displayName.textContent =
                'Profil Belum Diisi';

            displayRole.textContent =
                'Jabatan belum tersedia';

            return;
        }


        if (profile) {

            displayName.textContent =
                profile.full_name ||
                'Nama belum tersedia';


            const jabatan =
                profile.jabatan ||
                'Jabatan belum tersedia';


            const divisi =
                profile.divisi ||
                'Divisi belum tersedia';


            displayRole.textContent =
                `${jabatan} | ${divisi}`;


            // Smart navigation
            setupSmartNavigation(profile);
        }


    } catch (error) {

        console.error(
            'Terjadi kesalahan saat memuat data akun:',
            error
        );


        statusMsg.textContent =
            'Gagal memuat informasi akun. Silakan coba lagi.';

        statusMsg.style.display =
            'block';
    }
}


// ======================================================
// LOGOUT
// ======================================================

async function handleLogout() {

    const confirmed =
        confirm(
            'Apakah anda yakin ingin keluar dari akun ini?'
        );


    if (!confirmed) {
        return;
    }


    try {

        const { error } =
            await supabaseClient.auth.signOut();


        if (error) {
            throw error;
        }


        window.location.href =
            'index.html';


    } catch (error) {

        console.error(
            'Gagal logout:',
            error
        );


        const statusMsg =
            document.getElementById('status-msg');


        if (!statusMsg) {
            return;
        }


        statusMsg.textContent =
            'Gagal keluar dari akun. Silakan coba lagi.';

        statusMsg.style.display =
            'block';
    }
}


// ======================================================
// HELP BUTTON
// ======================================================

function setupHelpButton() {

    const helpButton =
        document.getElementById('helpButton');


    if (!helpButton) {
        return;
    }


    helpButton.addEventListener(
        'click',
        (event) => {

            event.preventDefault();

            alert(
                'Pusat Bantuan akan tersedia pada pembaruan berikutnya.'
            );

        }
    );
}


// ======================================================
// INITIALIZE PAGE
// ======================================================

async function initAccountPage() {

    // 1. Render isi Account
    const rendered =
        renderAccountPage();


    if (!rendered) {
        return;
    }


    // 2. Setup header
    setupHeaderTitle();


    // 3. Setup interaction
    setupRipple();
    setupHelpButton();


    // 4. Setup logout
    const logoutButton =
        document.getElementById('logoutButton');


    if (logoutButton) {

        logoutButton.addEventListener(
            'click',
            handleLogout
        );

    }


    // 5. Load user data
    await loadData();


    // 6. Set header title SEKALI LAGI
    // untuk memastikan tidak ditimpa oleh
    // proses render page lain.
    setupHeaderTitle();

}


initAccountPage();


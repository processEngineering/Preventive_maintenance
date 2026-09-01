import { supabaseClient } from '../../src/supabase/supabase-client.js';
import { ROLE_CONFIG, getCurrentRole } from '../data-role/role-home.js';

// --- render home page
function renderHome(config) {
    const header = document.getElementById('mainHeader');
    const content = document.getElementById('pageContent');

    if (!header || !content) {
        console.error(
            "mainHeader atau pageContent tidak ditemukan."
        );
        return;
    }

    header.innerHTML = `
        <div class="header-title-pill">
            ${config.header}
        </div>
    `;

    content.innerHTML = `
        <div class="content-wrapper">
            <div class="description-box">
                <p>
                    ${config.description}
                </p>
            </div>

            <div class="illustration-side">
                <div class="illustration-bg"></div>
                <img src="../public/assets/images/logo-akg.png" alt="PT AKG Maintenance">
            </div>

            <div class="text-side">
                <div class="action-area">
                    <a href="base-app.html?page=menu-utama" class="btn btn-mulai">
                        <i class="fa-solid fa-rocket"></i>
                        Mulai Akses
                    </a>

                    <a href="base-app.html?page=panduan" class="btn btn-panduan">
                        <i class="fa-solid fa-book-open"></i>
                        Panduan
                    </a>
                </div>
            </div>
        </div>
    `;
}


// --- init home
async function initHomePage() {
    try {
        // session
        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!session) {
            console.warn(
                "Session tidak ditemukan."
            );
            window.location.href =
                '../index.html';
            return;
        }

        console.log(
            "SESSION USER:",
            session.user
        );


        // get current role
        const role =
            await getCurrentRole(
                session.user.id
            );
        console.log(
            "CURRENT ROLE:",
            role
        );
        if (!role) {
            console.error(
                "Role user tidak ditemukan."
            );
            return;
        }

        // role config
        const config =
            ROLE_CONFIG[role];
        if (!config) {
            console.error(
                "Role belum memiliki ROLE_CONFIG:",
                role
            );
            console.log(
                "Role tersedia:",
                Object.keys(ROLE_CONFIG)
            );
            return;
        }

        renderHome(config);

        console.log(
            "Home loaded:",
            config.label
        );
    }
    catch (error) {
        console.error(
            "Home initialization error:",
            error
        );
    }
}

// --- dom load content
document.addEventListener(
    'DOMContentLoaded',
    async () => {
        const params =
            new URLSearchParams(
                window.location.search
            );
        const page =
            params.get('page');
        if (page !== 'home') {
            return;
        }
        await initHomePage();
    }
);
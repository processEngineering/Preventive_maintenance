import { supabaseClient as client } from "../../src/supabase/supabase-client.js";
import { getCurrentRole } from "../data-role/role-home.js";

// ======================================================
// MENU CONFIGURATION
// ======================================================

const MENU_CONFIG = [

    // ==================================================
    // 1. CHECKLIST HARIAN MESIN INJECTION
    // ==================================================

    {
        title: "Checklist Harian<br>Mesin Injection",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/clhmi/clhmi_pelaksana.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/clhmi/clhmi_koordinator.html",

            "SUPERINTENDENT":
                "../public/data-checklist/clhmi/clhmi_superintendent.html"
        }
    },


    // ==================================================
    // 2. CHECKLIST HARIAN STAND LABEL & ROBOT
    // ==================================================

    {
        title: "Checklist Harian<br>Stand Label & Robot",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/chslr/chslr_pelaksana.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/chslr/chslr_koordinator.html",

            "SUPERINTENDENT":
                "../public/data-checklist/chslr/chslr_superintendent.html"
        }
    },


    // ==================================================
    // 3. PELAKSANAAN PEKERJAAN WORKSHOP
    // ==================================================

    {
        title: "Pelaksanaan<br>Pekerjaan Workshop",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/ppw/ppw_operator.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/ppw/ppw_spv.html",

            "SUPERINTENDENT":
                "../public/data-checklist/ppw/ppw_superintendent.html"
        }
    },


    // ==================================================
    // 4. LAPORAN KERJA MAINTENANCE & REPAIR
    // ==================================================

    {
        title: "Laporan Kerja<br>Maintenance & Repair",

        action: "lkmr",

        actionUrls: {

            "OPERATOR | PELAKSANA": {
                mesin:
                    "../public/data-checklist/lkmr/lkmr_operator.html",

                repair:
                    "../public/data-checklist/lkmr/lkmr_operator_repair.html"
            },

            "SUPERINTENDENT": {
                mesin:
                    "../public/data-checklist/lkmr/lkmr_superintendent.html",

                repair:
                    "../public/data-checklist/lkmr/lkmr_superintendent_repair.html"
            }

            // Tambahkan role lain di sini jika diperlukan
        }
    },


    // ==================================================
    // 5. PREVENTIF MESIN INJECTION
    // ==================================================

    {
        title: "Preventif Mesin<br>Injection (clamping)",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/pmi/pmi_pelaksana.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/pmi/pmi_koordinator.html",

            "SUPERINTENDENT":
                "../public/data-checklist/pmi/pmi_superintendent.html"
        }
    },


    // ==================================================
    // 6. PREVENTIF ROBOT & STAND LABEL
    // ==================================================

    {
        title: "Preventif Robot<br>& Stand Label",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/prslb/prslb_pelaksana.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/prslb/prslb_koordinator.html",

            "SUPERINTENDENT":
                "../public/data-checklist/prslb/prslb_superintendent.html"
        }
    },


    // ==================================================
    // 7. LAPORAN PERAWATAN & OVERHAUL TOOLS
    // ==================================================

    {
        title: "Laporan Perawatan<br>& Overhaul Tools",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/pohm/pohm_operator.html",

            "SUPERINTENDENT":
                "../public/data-checklist/pohm/pohm_superintendent.html",

            "MANAGER":
                "../public/data-checklist/pohm/pohm_manager.html"
        }
    },


    // ==================================================
    // 8. CHECKLIST PERAWATAN MOLD
    // ==================================================

    {
        title: "Checklist<br>Perawatan Mold",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/cplm/cplm_operator.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/cplm/cplm_spv.html",

            "SUPERINTENDENT":
                "../public/data-checklist/cplm/cplm_superintendent.html"
        }
    },


    // ==================================================
    // 9. JADWAL PERAWATAN DAN OVERHAUL
    // ==================================================

    {
        title: "Jadwal Perawatan<br>dan Overhaul",

        urls: {
            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/jpdo/jpdo_supervisor.html",

            "SUPERINTENDENT":
                "../public/data-checklist/jpdo/jpdo_superintendent.html",

            "JUNIOR MANAGER PRODUKSI":
                "../public/data-checklist/jpdo/jpdo_produksi.html",

            "JUNIOR MANAGER PPC":
                "../public/data-checklist/jpdo/jpdo_ppc.html",

            "MANAGER":
                "../public/data-checklist/jpdo/jpdo_manager.html"
        }
    },


    // ==================================================
    // 10. KARTU RIWAYAT
    // ==================================================

    {
        title: "Kartu<br>Riwayat",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/kartu-riwayat/kartu_riwayat_pic.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/kartu-riwayat/kartu_riwayat_supervisor.html",

            "SUPERINTENDENT":
                "../public/data-checklist/kartu-riwayat/kartu_riwayat_superintendent.html"
        }
    },


    // ==================================================
    // 11. DATA GRAFIK
    // ==================================================

    {
        title: "Data Grafik",

        action: "grafik",

        actionUrls: {

            "OPERATOR | PELAKSANA": {
                clhmi:
                    "../public/data-checklist/grafik/grafik_clhmi.html",

                chslr:
                    "../public/data-checklist/grafik/grafik_chslr.html",

                cplm:
                    "../public/data-checklist/grafik/grafik_cplm.html",

                pmi:
                    "../public/data-checklist/grafik/grafik_pmi.html",

                prslb:
                    "../public/data-checklist/grafik/grafik_prslb.html"
            },

            "SUPERVISOR | KOORDINATOR": {
                clhmi:
                    "../public/data-checklist/grafik/grafik_clhmi.html",

                chslr:
                    "../public/data-checklist/grafik/grafik_chslr.html",

                cplm:
                    "../public/data-checklist/grafik/grafik_cplm.html",

                pmi:
                    "../public/data-checklist/grafik/grafik_pmi.html",

                prslb:
                    "../public/data-checklist/grafik/grafik_prslb.html"
            },

            "SUPERINTENDENT": {
                clhmi:
                    "../public/data-checklist/grafik/grafik_clhmi.html",

                chslr:
                    "../public/data-checklist/grafik/grafik_chslr.html",

                cplm:
                    "../public/data-checklist/grafik/grafik_cplm.html",

                pmi:
                    "../public/data-checklist/grafik/grafik_pmi.html",

                prslb:
                    "../public/data-checklist/grafik/grafik_prslb.html"
            }

            // Tambahkan role lain jika memang punya akses
        }
    },


    // ==================================================
    // 12. GRAFIK DATA LAPORAN PEKERJA
    // ==================================================

    {
        title: "Grafik Data<br>Laporan Pekerja",

        action: "grafik-pekerja",

        actionUrls: {

            "OPERATOR | PELAKSANA": {
                repair:
                    "../public/data-checklist/grafik/pekerja_repair_grafik.html",

                mesin:
                    "../public/data-checklist/grafik/pekerja_mesin_grafik.html"
            },

            "SUPERINTENDENT": {
                repair:
                    "../public/data-checklist/grafik/pekerja_repair_grafik.html",

                mesin:
                    "../public/data-checklist/grafik/pekerja_mesin_grafik.html"
            }

            // Tambahkan role lain jika diperlukan
        }
    },


    // ==================================================
    // 13. PREVENTIVE MESIN WORKSHOP
    // ==================================================

    {
        title: "Preventive Mesin<br>Workshop",

        urls: {
            "OPERATOR | PELAKSANA":
                "../public/data-checklist/pmw/pmw_operator.html",

            "SUPERVISOR | KOORDINATOR":
                "../public/data-checklist/pmw/pmw_supervisor.html",

            "SUPERINTENDENT":
                "../public/data-checklist/pmw/pmw_superintendent.html"
        }
    }

];


// ======================================================
// HELPER
// ======================================================

function hasActionAccess(menu, role) {

    const actionUrls = menu.actionUrls?.[role];

    if (!actionUrls) {
        return false;
    }

    return Object.values(actionUrls).some(url => Boolean(url));
}


// ======================================================
// RENDER MENU
// ======================================================

function renderMenu(role) {

    const content = document.getElementById("pageContent");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="menu-grid">

            ${MENU_CONFIG.map((menu, index) => {

                // ======================================
                // MENU DENGAN ACTION / MODAL
                // ======================================

                if (menu.action) {

                    // Cek apakah role punya akses
                    if (!hasActionAccess(menu, role)) {
                        return "";
                    }

                    return `
                        <button
                            type="button"
                            class="menu-card"
                            data-action="${menu.action}"
                            style="animation-delay: ${index * 50}ms"
                        >
                            <div class="menu-pill">
                                <h2>${menu.title}</h2>
                            </div>
                        </button>
                    `;
                }


                // ======================================
                // MENU DENGAN URL BERDASARKAN ROLE
                // ======================================

                const url = menu.urls?.[role];

                // Role tidak punya akses
                // → jangan render card sama sekali
                if (!url) {
                    return "";
                }

                return `
                    <a
                        href="${url}"
                        class="menu-card"
                        style="animation-delay: ${index * 50}ms"
                    >
                        <div class="menu-pill">
                            <h2>${menu.title}</h2>
                        </div>
                    </a>
                `;

            }).join("")}

        </div>


        <!-- MODAL CONTAINERS -->

        <div id="lkmrModalContainer"></div>

        <div id="grafikModalContainer"></div>

        <div id="grafikPekerjaModalContainer"></div>
    `;


    // Initialize menu
    initializeMenuCards();

    // Initialize actions dengan role
    initializeMenuActions(role);
}


// ======================================================
// INITIALIZE MENU CARDS
// ======================================================

function initializeMenuCards() {

    const cards = document.querySelectorAll(".menu-card");

    cards.forEach((card, index) => {

        setTimeout(() => {
            card.classList.add("show");
        }, index * 50);

    });
}


// ======================================================
// INITIALIZE MENU ACTIONS
// ======================================================

function initializeMenuActions(role) {

    const buttons = document.querySelectorAll("[data-action]");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const action = button.dataset.action;


            // ==========================================
            // LAPORAN KERJA MAINTENANCE & REPAIR
            // ==========================================

            if (action === "lkmr") {
                openLkmrModal(role);
            }


            // ==========================================
            // DATA GRAFIK
            // ==========================================

            if (action === "grafik") {
                openGrafikModal(role);
            }


            // ==========================================
            // GRAFIK DATA LAPORAN PEKERJA
            // ==========================================

            if (action === "grafik-pekerja") {
                openGrafikPekerjaModal(role);
            }

        });

    });
}


// ======================================================
// MODAL — LAPORAN KERJA MAINTENANCE & REPAIR
// ======================================================

function openLkmrModal(role) {

    const container =
        document.getElementById("lkmrModalContainer");

    if (!container) {
        return;
    }


    // Cari menu berdasarkan action
    const menu = MENU_CONFIG.find(
        menu => menu.action === "lkmr"
    );


    // Ambil URL berdasarkan role
    const urls = menu?.actionUrls?.[role];


    // Role tidak punya akses
    if (!urls) {
        return;
    }


    container.innerHTML = `

        <div
            class="choice-overlay active"
            id="lkmrModal"
        >

            <div class="choice-box">

                <h3>Pilih Jenis Laporan</h3>


                ${
                    urls.mesin
                        ? `
                            <a
                                href="${urls.mesin}"
                                class="choice-btn btn-mesin"
                            >
                                Maintenance Mesin
                            </a>
                        `
                        : ""
                }


                ${
                    urls.repair
                        ? `
                            <a
                                href="${urls.repair}"
                                class="choice-btn btn-repair"
                            >
                                Maintenance Repair
                            </a>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="choice-btn btn-close"
                    id="closeLkmrModal"
                >
                    Tutup
                </button>

            </div>

        </div>
    `;


    // Close button
    document
        .getElementById("closeLkmrModal")
        ?.addEventListener("click", () => {

            container.innerHTML = "";

        });
}


// ======================================================
// MODAL — DATA GRAFIK
// ======================================================

function openGrafikModal(role) {

    const container =
        document.getElementById("grafikModalContainer");

    if (!container) {
        return;
    }


    // Cari menu berdasarkan action
    const menu = MENU_CONFIG.find(
        menu => menu.action === "grafik"
    );


    // Ambil URL berdasarkan role
    const urls = menu?.actionUrls?.[role];


    // Role tidak punya akses
    if (!urls) {
        return;
    }


    container.innerHTML = `

        <div
            class="choice-overlay active"
            id="grafikModal"
        >

            <div class="choice-box">

                <h3>Pilih Data Grafik</h3>


                ${
                    urls.clhmi
                        ? `
                            <a
                                href="${urls.clhmi}"
                                class="choice-btn"
                            >
                                Checklist Harian Mesin Injection
                            </a>
                        `
                        : ""
                }


                ${
                    urls.chslr
                        ? `
                            <a
                                href="${urls.chslr}"
                                class="choice-btn"
                            >
                                Checklist Harian Stand Label & Robot
                            </a>
                        `
                        : ""
                }


                ${
                    urls.cplm
                        ? `
                            <a
                                href="${urls.cplm}"
                                class="choice-btn"
                            >
                                Checklist Perawatan Mold
                            </a>
                        `
                        : ""
                }


                ${
                    urls.pmi
                        ? `
                            <a
                                href="${urls.pmi}"
                                class="choice-btn"
                            >
                                Preventif Mesin Injection
                            </a>
                        `
                        : ""
                }


                ${
                    urls.prslb
                        ? `
                            <a
                                href="${urls.prslb}"
                                class="choice-btn"
                            >
                                Preventif Robot & Stand Label
                            </a>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="choice-btn btn-close"
                    id="closeGrafikModal"
                >
                    Tutup
                </button>

            </div>

        </div>
    `;


    // Close button
    document
        .getElementById("closeGrafikModal")
        ?.addEventListener("click", () => {

            container.innerHTML = "";

        });
}


// ======================================================
// MODAL — GRAFIK DATA LAPORAN PEKERJA
// ======================================================

function openGrafikPekerjaModal(role) {

    const container =
        document.getElementById("grafikPekerjaModalContainer");

    if (!container) {
        return;
    }


    // Cari menu berdasarkan action
    const menu = MENU_CONFIG.find(
        menu => menu.action === "grafik-pekerja"
    );


    // Ambil URL berdasarkan role
    const urls = menu?.actionUrls?.[role];


    // Role tidak punya akses
    if (!urls) {
        return;
    }


    container.innerHTML = `

        <div
            class="choice-overlay active"
            id="grafikPekerjaModal"
        >

            <div class="choice-box">

                <h3>Pilih Jenis Laporan Pekerja</h3>


                ${
                    urls.mesin
                        ? `
                            <a
                                href="${urls.mesin}"
                                class="choice-btn btn-mesin"
                            >
                                Maintenance Mesin
                            </a>
                        `
                        : ""
                }


                ${
                    urls.repair
                        ? `
                            <a
                                href="${urls.repair}"
                                class="choice-btn btn-repair"
                            >
                                Maintenance Repair
                            </a>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="choice-btn btn-close"
                    id="closeGrafikPekerjaModal"
                >
                    Tutup
                </button>

            </div>

        </div>
    `;


    // Close button
    document
        .getElementById("closeGrafikPekerjaModal")
        ?.addEventListener("click", () => {

            container.innerHTML = "";

        });
}


// ======================================================
// INITIALIZE MENU UTAMA
// ======================================================

async function initMenuUtama() {

    try {

        const {
            data: { session }
        } = await client.auth.getSession();


        // ==============================================
        // BELUM LOGIN
        // ==============================================

        if (!session) {

            window.location.href = "../index.html";

            return;
        }


        // ==============================================
        // GET USER ROLE
        // ==============================================

        const role =
            await getCurrentRole(session.user.id);


        // ==============================================
        // ROLE TIDAK DITEMUKAN
        // ==============================================

        if (!role) {

            console.error(
                "Role user tidak ditemukan."
            );

            return;
        }


        console.log(
            "Menu utama loaded:",
            role
        );


        // ==============================================
        // RENDER MENU
        // ==============================================

        renderMenu(role);

    }

    catch (error) {

        console.error(
            "Menu utama initialization error:",
            error
        );

    }

}


// ======================================================
// PAGE ROUTER
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        // Hanya jalankan halaman menu-utama
        if (
            params.get("page") !==
            "menu-utama"
        ) {
            return;
        }


        await initMenuUtama();

    }
);
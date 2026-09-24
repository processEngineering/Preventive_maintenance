import { supabaseClient as client } from "../src/supabase/supabase-client.js";
import { getCurrentRole } from "../data-role/role-home.js";

// ======================================================
// MENU CONFIGURATION
// ======================================================

const MENU_GROUPS = [

    // ==================================================
    // 1. CHECKLIST
    // ==================================================

    {
        title: "Checklist",

        items: [

            {
                title: "Checklist Harian<br>Mesin Injection",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/clhmi/clhmi_pelaksana.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/clhmi/clhmi_koordinator.html",

                    "SUPERINTENDENT":
                        "../data-checklist/clhmi/clhmi_superintendent.html"
                }
            },

            {
                title: "Checklist Harian<br>Stand Label & Robot",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/chslr/chslr_pelaksana.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/chslr/chslr_koordinator.html",

                    "SUPERINTENDENT":
                        "../data-checklist/chslr/chslr_superintendent.html"
                }
            },

            {
                title: "Checklist<br>Perawatan Mold",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/cplm/cplm_operator.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/cplm/cplm_spv.html",

                    "SUPERINTENDENT":
                        "../data-checklist/cplm/cplm_superintendent.html"
                }
            }

        ]
    },


    // ==================================================
    // 2. PREVENTIVE
    // ==================================================

    {
        title: "Preventive",

        items: [

            {
                title: "Preventive Mesin<br>Injection (Clamping)",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/pmi/pmi_pelaksana.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/pmi/pmi_koordinator.html",

                    "SUPERINTENDENT":
                        "../data-checklist/pmi/pmi_superintendent.html"
                }
            },

            {
                title: "Preventive Robot<br>& Stand Label",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/prslb/prslb_pelaksana.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/prslb/prslb_koordinator.html",

                    "SUPERINTENDENT":
                        "../data-checklist/prslb/prslb_superintendent.html"
                }
            },

            {
                title: "Preventive Mesin<br>Workshop",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/pmw/pmw_operator.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/pmw/pmw_supervisor.html",

                    "SUPERINTENDENT":
                        "../data-checklist/pmw/pmw_superintendent.html"
                }
            }

        ]
    },


    // ==================================================
    // 3. LAPORAN KERJA
    // ==================================================

    {
        title: "Laporan Kerja",

        items: [

            {
                title: "Laporan Kerja<br>Maintenance & Repair",

                action: "lkmr",

                actionUrls: {

                    "OPERATOR | PELAKSANA": {
                        mesin:
                            "../data-checklist/lkmr/lkmr_operator.html",

                        repair:
                            "../data-checklist/lkmr/lkmr_operator_repair.html"
                    },

                    "SUPERINTENDENT": {
                        mesin:
                            "../data-checklist/lkmr/lkmr_superintendent.html",

                        repair:
                            "../data-checklist/lkmr/lkmr_superintendent_repair.html"
                    }
                }
            },

            {
                title: "Laporan Perawatan<br>& Overhaul Tools",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/pohm/pohm_operator.html",

                    "SUPERINTENDENT":
                        "../data-checklist/pohm/pohm_superintendent.html",

                    "MANAGER":
                        "../data-checklist/pohm/pohm_manager.html"
                }
            }

        ]
    },


    // ==================================================
    // 4. GRAFIK
    // ==================================================

    {
        title: "Grafik",

        items: [

            {
                title: "Data Grafik",

                action: "grafik",

                actionUrls: {

                    "OPERATOR | PELAKSANA": {
                        clhmi:
                            "../data-checklist/grafik/grafik_clhmi.html",

                        chslr:
                            "../data-checklist/grafik/grafik_chslr.html",

                        cplm:
                            "../data-checklist/grafik/grafik_cplm.html",

                        pmi:
                            "../data-checklist/grafik/grafik_pmi.html",

                        prslb:
                            "../data-checklist/grafik/grafik_prslb.html"
                    },

                    "SUPERVISOR | KOORDINATOR": {
                        clhmi:
                            "../data-checklist/grafik/grafik_clhmi.html",

                        chslr:
                            "../data-checklist/grafik/grafik_chslr.html",

                        cplm:
                            "../data-checklist/grafik/grafik_cplm.html",

                        pmi:
                            "../data-checklist/grafik/grafik_pmi.html",

                        prslb:
                            "../data-checklist/grafik/grafik_prslb.html"
                    },

                    "SUPERINTENDENT": {
                        clhmi:
                            "../data-checklist/grafik/grafik_clhmi.html",

                        chslr:
                            "../data-checklist/grafik/grafik_chslr.html",

                        cplm:
                            "../data-checklist/grafik/grafik_cplm.html",

                        pmi:
                            "../data-checklist/grafik/grafik_pmi.html",

                        prslb:
                            "../data-checklist/grafik/grafik_prslb.html"
                    }
                }
            },

            {
                title: "Grafik Data<br>Laporan Pekerja",

                action: "grafik-pekerja",

                actionUrls: {

                    "OPERATOR | PELAKSANA": {
                        repair:
                            "../data-checklist/grafik/pekerja_repair_grafik.html",

                        mesin:
                            "../data-checklist/grafik/pekerja_mesin_grafik.html"
                    },

                    "SUPERINTENDENT": {
                        repair:
                            "../data-checklist/grafik/pekerja_repair_grafik.html",

                        mesin:
                            "../data-checklist/grafik/pekerja_mesin_grafik.html"
                    }
                }
            }

        ]
    },


    // ==================================================
    // 5. OTHERS
    // ==================================================

    {
        title: "Others",

        items: [

            {
                title: "Kartu<br>Riwayat",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/kartu-riwayat/kartu_riwayat_pic.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/kartu-riwayat/kartu_riwayat_supervisor.html",

                    "SUPERINTENDENT":
                        "../data-checklist/kartu-riwayat/kartu_riwayat_superintendent.html"
                }
            },

            {
                title: "Jadwal Perawatan<br>dan Overhaul",

                urls: {
                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/jpdo/jpdo_supervisor.html",

                    "SUPERINTENDENT":
                        "../data-checklist/jpdo/jpdo_superintendent.html",

                    "JUNIOR MANAGER PRODUKSI":
                        "../data-checklist/jpdo/jpdo_produksi.html",

                    "JUNIOR MANAGER PPC":
                        "../data-checklist/jpdo/jpdo_ppc.html",

                    "MANAGER":
                        "../data-checklist/jpdo/jpdo_manager.html"
                }
            },

            {
                title: "Pelaksanaan<br>Pekerjaan Workshop",

                urls: {
                    "OPERATOR | PELAKSANA":
                        "../data-checklist/ppw/ppw_operator.html",

                    "SUPERVISOR | KOORDINATOR":
                        "../data-checklist/ppw/ppw_spv.html",

                    "SUPERINTENDENT":
                        "../data-checklist/ppw/ppw_superintendent.html"
                }
            }

        ]
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

    return Object.values(actionUrls)
        .some(url => Boolean(url));
}


// ======================================================
// RENDER MENU
// ======================================================

function renderMenu(role) {

    const content =
        document.getElementById("pageContent");

    if (!content) {
        return;
    }

    let animationIndex = 0;

    const sections = MENU_GROUPS.map(group => {

        const visibleItems = group.items.filter(menu => {

            // ------------------------------------------
            // ACTION MENU
            // ------------------------------------------

            if (menu.action) {
                return hasActionAccess(menu, role);
            }

            // ------------------------------------------
            // NORMAL URL MENU
            // ------------------------------------------

            return Boolean(menu.urls?.[role]);

        });


        // No accessible items in this group
        if (visibleItems.length === 0) {
            return "";
        }


        const cards = visibleItems.map(menu => {

            const currentIndex =
                animationIndex++;

            // ==========================================
            // ACTION / MODAL CARD
            // ==========================================

            if (menu.action) {

                return `
                    <button
                        type="button"
                        class="menu-card"
                        data-action="${menu.action}"
                        style="animation-delay: ${currentIndex * 50}ms"
                    >
                        <div class="menu-card-inner">

                            <div class="menu-card-content">
                                <h2>${menu.title}</h2>
                            </div>

                            <span class="menu-card-arrow">
                                →
                            </span>

                        </div>
                    </button>
                `;
            }


            // ==========================================
            // NORMAL LINK CARD
            // ==========================================

            const url =
                menu.urls?.[role];

            if (!url) {
                return "";
            }

            return `
                <a
                    href="${url}"
                    class="menu-card"
                    style="animation-delay: ${currentIndex * 50}ms"
                >
                    <div class="menu-card-inner">

                        <div class="menu-card-content">
                            <h2>${menu.title}</h2>
                        </div>

                        <span class="menu-card-arrow">
                            →
                        </span>

                    </div>
                </a>
            `;

        }).join("");


        return `
            <section class="menu-section">

                <div class="menu-section-header">
                    <h2>${group.title}</h2>
                </div>

                <div class="menu-grid">
                    ${cards}
                </div>

            </section>
        `;

    }).join("");


    content.innerHTML = `

        <div class="menu-sections">

            ${sections}

        </div>


        <!-- MODAL CONTAINERS -->

        <div id="lkmrModalContainer"></div>

        <div id="grafikModalContainer"></div>

        <div id="grafikPekerjaModalContainer"></div>
    `;


    initializeMenuCards();

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

        document.body.classList.add("page-menu-utama");

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
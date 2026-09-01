import { supabaseClient as client } from "../../src/supabase/supabase-client.js";
import { ROLE_CONFIG, getCurrentRole } from "../menu-role/role-home.js";
import { renderHeader } from "../components/header.js";


// ======================================================
// MENU CONFIGURATION
// ======================================================

const MENU_CONFIG = {

    "ADMIN": [
        // nanti isi menu admin
    ],

    "OPERATOR | PELAKSANA": [
        // nanti isi menu pelaksana
    ],

    "SUPERVISOR | KOORDINATOR": [
        // nanti isi menu koordinator
    ],

    "SUPERINTENDENT": [
        // nanti isi menu superintendent
    ],

    "JUNIOR MANAGER PRODUKSI": [
        // nanti isi menu JM Produksi
    ],

    "JUNIOR MANAGER PPC": [
        // nanti isi menu JM PPC
    ],

    "MANAGER": [

        {
            title: "Laporan perawatan<br>& overhaul tools",
            url: "pohm_manager.html"
        },

        {
            title: "Jadwal perawatan<br>dan overhaul",
            url: "Jpdo_manager.html"
        },

        {
            title: "Data Grafik",
            action: "grafik"
        },

        {
            title: "Grafik Data<br>Laporan Pekerja",
            action: "grafik-pekerja"
        }

    ]

};


// ======================================================
// RENDER HEADER
// ======================================================

function renderHeader(role) {

    const header =
        document.getElementById("mainHeader");

    if (!header) return;


    const config =
        ROLE_CONFIG[role];


    header.innerHTML = `

        <div class="header-content-wrapper">

            <button
                class="hamburger-menu"
                id="hamburgerMenu"
                type="button"
            >
                <i class="fa-solid fa-bars"></i>
            </button>


            <div class="header-title-pill">

                ${config.header
                    .replace("HOME", "MENU UTAMA")}

            </div>

        </div>

    `;


    const hamburger = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");


    hamburger.addEventListener("click",() => {
            sidebar.classList.add("active");
            overlay.classList.add("active");
        }
    );

}


// ======================================================
// RENDER MENU
// ======================================================

function renderMenu(role) {

    const content =
        document.getElementById("pageContent");

    if (!content) return;


    const menus =
        MENU_CONFIG[role] || [];


    content.innerHTML = `

        <div class="menu-grid">

            ${menus.map((menu, index) => `

                ${
                    menu.action

                    ?

                    `
                    <button
                        class="menu-card"
                        data-action="${menu.action}"
                        style="animation-delay: ${index * 50}ms"
                    >

                        <div class="menu-pill">

                            <h2>
                                ${menu.title}
                            </h2>

                        </div>

                    </button>
                    `

                    :

                    `
                    <a
                        href="${menu.url}"
                        class="menu-card"
                        style="animation-delay: ${index * 50}ms"
                    >

                        <div class="menu-pill">

                            <h2>
                                ${menu.title}
                            </h2>

                        </div>

                    </a>
                    `

                }

            `).join("")}

        </div>


        <div
            id="grafikModalContainer"
        ></div>


        <div
            id="grafikPekerjaModalContainer"
        ></div>

    `;


    initializeMenuCards();

    initializeMenuActions(role);

}


// ======================================================
// MENU CARD ANIMATION
// ======================================================

function initializeMenuCards() {
    const cards = document.querySelectorAll(".menu-card");

    cards.forEach((card, index) => {
            setTimeout( () => {
                    card.classList.add("show");
                },
                index * 80
            );


            card.addEventListener(
                "mousemove",
                handleMouseMove
            );


            card.addEventListener(
                "mouseleave",
                handleMouseLeave
            );

        }
    );

}


// ======================================================
// 3D EFFECT
// ======================================================
function handleMouseMove(event) {
    const card = event.currentTarget;
    const pill = card.querySelector(".menu-pill");

    if (!pill) return;
    const rect = card.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    pill.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(1.03,1.03,1.03)
    `;

    pill.style.setProperty(
        "--mouse-x",
        `${x}px`
    );

    pill.style.setProperty(
        "--mouse-y",
        `${y}px`
    );
}

function handleMouseLeave(event) {
    const card = event.currentTarget;
    
    const pill = card.querySelector(".menu-pill");
    if (!pill) return;

    pill.style.transform = `
        perspective(1000px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1,1,1)
    `;

}


// ======================================================
// MENU ACTIONS
// ======================================================

function initializeMenuActions(role) {
    document
        .querySelectorAll("[data-action]")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const action =
                        button.dataset.action;

                    if (action === "grafik") {
                        openGrafikModal();
                    }

                    if (
                        action ===
                        "grafik-pekerja"
                    ) {
                        openGrafikPekerjaModal();
                    }
                }
            );
        });
}


// ======================================================
// GRAFIK MODAL
// ======================================================

function openGrafikModal() {

    const container = document.getElementById( "grafikModalContainer" );


    container.innerHTML = `

        <div
            class="grafik-modal-overlay active"
            id="grafikModal"
        >

            <div class="grafik-modal-box">

                <button
                    class="grafik-modal-close"
                    id="closeGrafikModal"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>


                <div class="grafik-modal-title">

                    <i class="fa-solid fa-chart-simple"></i>

                    Pilih Data Grafik

                </div>


                <a
                    href="grafik_chlmi.html"
                    class="grafik-link-btn"
                >
                    Checklist Harian Mesin Injection
                </a>


                <a
                    href="grafik_chslr.html"
                    class="grafik-link-btn"
                >
                    Checklist Harian Standlabel & Robot
                </a>


                <a
                    href="grafik_cplm.html"
                    class="grafik-link-btn"
                >
                    Checklist Perawatan Mold
                </a>


                <a
                    href="grafik_pmi.html"
                    class="grafik-link-btn"
                >
                    Preventif Mesin Injection (Clamping)
                </a>


                <a
                    href="grafik_prslb.html"
                    class="grafik-link-btn"
                >
                    Preventif Stand Label & Robot
                </a>

            </div>

        </div>

    `;


    const modal =
        document.getElementById("grafikModal");

    const close =
        document.getElementById(
            "closeGrafikModal"
        );


    close.addEventListener(
        "click",
        () => modal.remove()
    );


    modal.addEventListener(
        "click",
        event => {

            if (event.target === modal) {
                modal.remove();
            }

        }
    );

}


// ======================================================
// GRAFIK PEKERJA MODAL
// ======================================================

function openGrafikPekerjaModal() {

    const container =
        document.getElementById(
            "grafikPekerjaModalContainer"
        );


    container.innerHTML = `

        <div
            class="grafik-modal-overlay active"
            id="grafikPekerjaModal"
        >

            <div class="grafik-modal-box">

                <button
                    class="grafik-modal-close"
                    id="closeGrafikPekerjaModal"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>


                <div class="grafik-modal-title">

                    <i class="fa-solid fa-users"></i>

                    Pilih Jenis Grafik Pekerja

                </div>


                <a
                    href="pekerja_mesin_grafik.html"
                    class="grafik-link-btn"
                >
                    Grafik Pekerja Maintenance Mesin
                </a>


                <a
                    href="pekerja_repair_grafik.html"
                    class="grafik-link-btn"
                >
                    Grafik Pekerja Maintenance Repair
                </a>

            </div>

        </div>

    `;


    const modal =
        document.getElementById(
            "grafikPekerjaModal"
        );


    document
        .getElementById(
            "closeGrafikPekerjaModal"
        )
        .addEventListener(
            "click",
            () => modal.remove()
        );


    modal.addEventListener(
        "click",
        event => {

            if (event.target === modal) {
                modal.remove();
            }

        }
    );

}


// ======================================================
// INITIALIZE
// ======================================================

async function initMenuUtama() {

    try {

        const {
            data: {
                session
            }
        } = await client.auth.getSession();


        if (!session) {

            window.location.href =
                "../index.html";

            return;

        }


        const role =
            await getCurrentRole(
                session.user.id
            );


        if (!role) {

            console.error(
                "Role user tidak ditemukan."
            );

            return;

        }


        if (!ROLE_CONFIG[role]) {

            console.error(
                "Role belum dikonfigurasi:",
                role
            );

            return;

        }


        renderHeader(role);

        renderMenu(role);


        console.log(
            "Menu utama loaded:",
            role
        );

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


        if (
            params.get("page") !==
            "menu"
        ) return;


        await initMenuUtama();

    }
);
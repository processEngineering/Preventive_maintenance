import { supabaseClient as client } from "../../src/supabase/supabase-client.js";
import { getCurrentRole } from "../data-role/role-home.js";

// ======================================================
// MENU CONFIGURATION
// ======================================================

const MENU_CONFIG = [

    {
        title: "Checklist Harian<br>mesin Injection",
        url: "clhmi_pelaksana.html"
    },

    {
        title: "Checklist Harian<br>stand label & robot",
        url: "chslr_pelaksana.html"
    },

    {
        title: "Pelaksanaan<br>Pekerjaan Workshop",
        url: "ppw_operator.html"
    },

    {
        title: "Laporan kerja<br>Maintenance & Repair",
        action: "lkmr"
    },

    {
        title: "Preventif mesin<br>injection (clamping)",
        url: "pmi_pelaksana.html"
    },

    {
        title: "Preventif Robot<br>& Stand Label",
        url: "prslb_pelaksana.html"
    },

    {
        title: "Laporan perawatan<br>& overhaul tools",
        url: "pohm_engineer.html"
    },

    {
        title: "Checklist<br>perawatan mold",
        url: "cplm_operator.html"
    },

    {
        title: "Jadwal perawatan<br>dan overhaul",
        url: "Jpdo_supervisor.html"
    },

    {
        title: "Kartu<br>Riwayat",
        url: "kartu_riwayat_pic.html"
    },

    {
        title: "Data Grafik",
        action: "grafik"
    },

    {
        title: "Grafik Data<br>Laporan Pekerja",
        action: "grafik-pekerja"
    },

    {
        title: "Preventive Mesin<br>Workshop",
        url: "pmw_operator.html"
    }

];


// ======================================================
// RENDER MENU
// ======================================================

function renderMenu() {

    const content =
        document.getElementById("pageContent");

    if (!content) return;


    content.innerHTML = `

        <div class="menu-grid">

            ${MENU_CONFIG.map((menu, index) => `

                ${
                    menu.action

                    ?

                    `
                    <button
                        type="button"
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


        <div id="lkmrModalContainer"></div>

        <div id="grafikModalContainer"></div>

        <div id="grafikPekerjaModalContainer"></div>

    `;


    initializeMenuCards();

    initializeMenuActions();

}


// ======================================================
// MENU CARD ANIMATION
// ======================================================

function initializeMenuCards() {

    const cards =
        document.querySelectorAll(".menu-card");


    cards.forEach((card, index) => {

        setTimeout(() => {

            card.classList.add("show");

        }, index * 50);


        card.addEventListener(
            "mousedown",
            createRipple
        );


        card.addEventListener(
            "mousemove",
            handleMouseMove
        );


        card.addEventListener(
            "mouseleave",
            handleMouseLeave
        );

    });

}


// ======================================================
// RIPPLE EFFECT
// ======================================================

function createRipple(event) {

    const button =
        event.currentTarget.querySelector(".menu-pill");

    if (!button) return;


    const circle =
        document.createElement("span");


    const diameter =
        Math.max(
            button.clientWidth,
            button.clientHeight
        );


    const radius =
        diameter / 2;


    const rect =
        button.getBoundingClientRect();


    const clientX =
        event.clientX;


    const clientY =
        event.clientY;


    circle.style.width =
        circle.style.height =
        `${diameter}px`;


    circle.style.left =
        `${clientX - rect.left - radius}px`;


    circle.style.top =
        `${clientY - rect.top - radius}px`;


    circle.classList.add("ripple");


    const existingRipple =
        button.querySelector(".ripple");


    if (existingRipple) {
        existingRipple.remove();
    }


    button.appendChild(circle);


    setTimeout(() => {

        circle.remove();

    }, 800);

}


// ======================================================
// 3D EFFECT
// ======================================================

function handleMouseMove(event) {

    const card =
        event.currentTarget;


    const pill =
        card.querySelector(".menu-pill");


    if (!pill) return;


    const rect =
        card.getBoundingClientRect();


    const x =
        event.clientX - rect.left;


    const y =
        event.clientY - rect.top;


    const centerX =
        rect.width / 2;


    const centerY =
        rect.height / 2;


    const rotateX =
        ((y - centerY) / centerY) * -15;


    const rotateY =
        ((x - centerX) / centerX) * 15;


    pill.style.transform = `

        perspective(1000px)

        rotateX(${rotateX}deg)

        rotateY(${rotateY}deg)

        scale3d(1.05, 1.05, 1.05)

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

    const card =
        event.currentTarget;


    const pill =
        card.querySelector(".menu-pill");


    if (!pill) return;


    pill.style.transform = `

        perspective(1000px)

        rotateX(0deg)

        rotateY(0deg)

        scale3d(1, 1, 1)

    `;

}


// ======================================================
// MENU ACTIONS
// ======================================================

function initializeMenuActions() {

    document
        .querySelectorAll("[data-action]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.action;


                    if (action === "lkmr") {

                        openLkmrModal();

                    }


                    if (action === "grafik") {

                        openGrafikModal();

                    }


                    if (
                        action === "grafik-pekerja"
                    ) {

                        openGrafikPekerjaModal();

                    }

                }
            );

        });

}


// ======================================================
// LKMR MODAL
// ======================================================

function openLkmrModal() {

    const container =
        document.getElementById(
            "lkmrModalContainer"
        );


    container.innerHTML = `

        <div
            class="choice-overlay active"
            id="lkmrModal"
        >

            <div class="choice-box">

                <h3
                    style="
                        margin-bottom: 20px;
                        color: #333;
                        font-size: 18px;
                    "
                >
                    Pilih Jenis Laporan
                </h3>


                <a
                    href="Lkmr_operator.html"
                    class="choice-btn btn-mesin"
                >
                    Maintenance Mesin
                </a>


                <a
                    href="Lkmr_operator_repair.html"
                    class="choice-btn btn-repair"
                >
                    Maintenance Repair
                </a>


                <button
                    type="button"
                    id="closeLkmrModal"
                    style="
                        margin-top: 15px;
                        color: #888;
                        font-size: 14px;
                        cursor: pointer;
                        text-decoration: underline;
                        border: none;
                        background: transparent;
                    "
                >
                    Tutup
                </button>

            </div>

        </div>

    `;


    const modal =
        document.getElementById("lkmrModal");


    document
        .getElementById("closeLkmrModal")
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
// GRAFIK MODAL
// ======================================================

function openGrafikModal() {

    const container =
        document.getElementById(
            "grafikModalContainer"
        );


    container.innerHTML = `

        <div
            class="grafik-modal-overlay active"
            id="grafikModal"
        >

            <div class="grafik-modal-box">

                <button
                    type="button"
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
        document.getElementById(
            "grafikModal"
        );


    document
        .getElementById(
            "closeGrafikModal"
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
                    type="button"
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


        console.log(
            "Menu utama loaded:",
            role
        );


        // Untuk sekarang SEMUA ROLE
        // menggunakan 13 menu yang sama.

        renderMenu();

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
            "menu-utama"
        ) {
            return;
        }

        await initMenuUtama();
    }
);
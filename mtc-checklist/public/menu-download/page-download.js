import { supabaseClient as client } from "../../src/supabase/supabase-client.js";

// ======================================================
// DOWNLOAD MENU CONFIGURATION
// ======================================================

const DOWNLOAD_CONFIG = [
    {
        title: "Data Checklist Harian<br>Mesin Injection",
        url: "../public/data-checklist/clhmi/clhmi_result.html",
        group: "Checklist"
    },
    {
        title: "Data Checklist Harian<br>Stand Label & Robot",
        url: "../public/data-checklist/chslr/chslr_result.html",
        group: "Checklist"
    },
    {
        title: "Data Pelaksanaan<br>Pekerjaan Workshop",
        url: "../public/data-checklist/ppw/ppw_result.html",
        group: "Others"
    },
    {
        title: "Data Laporan Kerja<br>Maintenance & Repair",
        action: "lkmr",
        group: "Laporan Kerja"
    },
    {
        title: "Data Preventif Mesin<br>Injection (Clamping)",
        url: "../public/data-checklist/pmi/pmi_result.html",
        group: "Preventive"
    },
    {
        title: "Data Preventif Robot<br>& Stand Label",
        url: "../public/data-checklist/prslb/prslb_result.html",
        group: "Preventive"
    },
    {
        title: "Data Laporan Perawatan<br>& Overhaul Tools",
        url: "../public/data-checklist/pohm/pohm_result.html",
        group: "Laporan Kerja"
    },
    {
        title: "Data Checklist<br>Perawatan Mold",
        url: "../public/data-checklist/cplm/cplm_result.html",
        group: "Checklist"
    },
    {
        title: "Data Jadwal Perawatan<br>dan Overhaul",
        url: "../public/data-checklist/jpdo/jpdo_result.html",
        group: "Others"
    },
    {
        title: "Data Kartu<br>Riwayat",
        url: "../public/data-checklist/kartu_riwayat/kartu_riwayat_result.html",
        group: "Others"
    },
    {
        title: "Data Preventive Mesin<br>Workshop",
        url: "../public/data-checklist/pmw/pmw_result.html",
        group: "Preventive"
    },
    {
        title: "Arsip<br>Data Laporan",
        url: "../public/data-checklist/arsip_data/arsip_data.html",
        group: "Others"
    }
];

const DOWNLOAD_GROUPS = [
    "Checklist",
    "Preventive",
    "Laporan Kerja",
    "Others"
].map(title => ({
    title,
    items: DOWNLOAD_CONFIG.filter(menu => menu.group === title)
}));

// ======================================================
// RENDER DOWNLOAD PAGE
// ======================================================

function renderDownloadPage() {

    const content =
        document.getElementById("pageContent");

    if (!content) {
        console.error("pageContent tidak ditemukan.");
        return;
    }

    let animationIndex = 0;

    const sections = DOWNLOAD_GROUPS.map(group => {

        const cards = group.items.map(menu => {
            const currentIndex = animationIndex++;

            if (menu.action) {
                return `
                    <button
                        type="button"
                        class="menu-card"
                        data-action="${menu.action}"
                        style="animation-delay: ${currentIndex * 50}ms"
                    >
                        <div class="menu-pill">
                            <h2>${menu.title}</h2>
                        </div>
                    </button>
                `;
            }

            return `
                <a
                    href="${menu.url}"
                    class="menu-card"
                    style="animation-delay: ${currentIndex * 50}ms"
                >
                    <div class="menu-pill">
                        <h2>${menu.title}</h2>
                    </div>
                </a>
            `;
        }).join("");

        return `
            <section class="download-section">
                <div class="download-section-header">
                    <h2>${group.title}</h2>
                </div>

                <div class="menu-grid">
                    ${cards}
                </div>
            </section>
        `;
    }).join("");

    content.innerHTML = `
        <div class="app-container">

            <div class="instruction-text">
                <p>
                    Silahkan lakukan pencetakan data dalam bentuk PDF/XLS
                    berdasarkan history perawatan
                </p>
            </div>

            <div class="download-sections">
                ${sections}
            </div>

            <div id="lkmrModalContainer"></div>

        </div>
    `;

    initializeDownloadCards();
    initializeDownloadActions();
}

// ======================================================
// CARD ANIMATION
// ======================================================

function initializeDownloadCards() {

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
            "touchstart",
            createRipple,
            {
                passive: true
            }
        );

        card.addEventListener(
            "mousemove",
            handleMouseMove
        );

        card.addEventListener(
            "mouseleave",
            handleMouseLeave
        );

        card.addEventListener(
            "touchmove",
            handleTouchMove,
            {
                passive: true
            }
        );

        card.addEventListener(
            "touchend",
            handleMouseLeave
        );
    });
}

// ======================================================
// RIPPLE
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

    let clientX;
    let clientY;

    if (event.type === "touchstart") {

        clientX =
            event.touches[0].clientX;

        clientY =
            event.touches[0].clientY;

    } else {

        clientX =
            event.clientX;

        clientY =
            event.clientY;
    }

    circle.style.width =
        `${diameter}px`;

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
    }, 600);
}

// ======================================================
// 3D EFFECT
// ======================================================

function handleMouseMove(event) {

    apply3DEffect(
        event.currentTarget,
        event.clientX,
        event.clientY
    );
}

function handleTouchMove(event) {

    const touch =
        event.touches[0];

    apply3DEffect(
        event.currentTarget,
        touch.clientX,
        touch.clientY
    );

    event.currentTarget.classList.add(
        "active-hover"
    );
}

function apply3DEffect(
    card,
    clientX,
    clientY
) {

    const pill =
        card.querySelector(".menu-pill");

    if (!pill) return;

    const rect =
        card.getBoundingClientRect();

    const x =
        clientX - rect.left;

    const y =
        clientY - rect.top;

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

    card.classList.remove(
        "active-hover"
    );

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

function initializeDownloadActions() {

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

    if (!container) return;

    container.innerHTML = `
        <div
            class="choice-overlay active"
            id="lkmrModal"
        >

            <div class="choice-box">

                <h3>
                    Pilih Data Laporan
                </h3>

                <a
                    href="Lkmr_result.html"
                    class="choice-btn btn-mesin"
                >
                    Data Maintenance Mesin
                </a>

                <a
                    href="Lkmr_result_repair.html"
                    class="choice-btn btn-repair"
                >
                    Data Maintenance Repair
                </a>

                <button
                    type="button"
                    id="closeLkmrModal"
                    class="modal-close-btn"
                >
                    Tutup
                </button>

            </div>

        </div>
    `;

    const modal =
        document.getElementById(
            "lkmrModal"
        );

    const closeButton =
        document.getElementById(
            "closeLkmrModal"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => modal.remove()
        );

    }

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

async function initDownloadPage() {

    try {

        document.body.classList.add("page-menu-download");

        const {
            data: { session },
            error
        } = await client.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session) {

            window.location.href =
                "../index.html";

            return;
        }

        console.log(
            "Download page loaded:",
            session.user.id
        );

        renderDownloadPage();

    }

    catch (error) {

        console.error(
            "Download page initialization error:",
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

        const page =
            params.get("page");

        console.log(
            "Current page:",
            page
        );

        if (page !== "download") {
            return;
        }

        await initDownloadPage();

    }
);


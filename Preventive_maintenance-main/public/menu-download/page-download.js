import { supabaseClient as client } from "../../src/supabase/supabase-client.js";

// ======================================================
// DOWNLOAD MENU CONFIGURATION
// ======================================================

const DOWNLOAD_CONFIG = [
    {
        title: "Data Checklist Harian<br>Mesin Injection",
        url: "clhmi_result.html"
    },
    {
        title: "Data Checklist Harian<br>Stand Label & Robot",
        url: "chslr_result.html"
    },
    {
        title: "Data Pelaksanaan<br>Pekerjaan Workshop",
        url: "ppw_result.html"
    },
    {
        title: "Data Laporan Kerja<br>Maintenance & Repair",
        action: "lkmr"
    },
    {
        title: "Data Preventif Mesin<br>Injection (Clamping)",
        url: "pmi_result.html"
    },
    {
        title: "Data Preventif Robot<br>& Stand Label",
        url: "prslb_result.html"
    },
    {
        title: "Data Laporan Perawatan<br>& Overhaul Tools",
        url: "pohm_result.html"
    },
    {
        title: "Data Checklist<br>Perawatan Mold",
        url: "cplm_result.html"
    },
    {
        title: "Data Jadwal Perawatan<br>dan Overhaul",
        url: "Jpdo_result.html"
    },
    {
        title: "Data Kartu<br>Riwayat",
        url: "kartu_riwayat_result.html"
    },
    {
        title: "Data Preventive Mesin<br>Workshop",
        url: "pmw_result.html"
    },
    {
        title: "Arsip<br>Data Laporan",
        url: "arsip_data.html"
    }
];

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

    // ==================================================
    // IMPORTANT:
    // Jangan gunakan header.innerHTML di sini.
    //
    // header.js sudah membuat:
    // .header-content-wrapper
    // .hamburger-menu
    // .header-title-pill
    //
    // Kita hanya mengubah TEXT title-nya.
    // ==================================================

    const headerTitle =
        document.querySelector(".header-title-pill");

    if (headerTitle) {
        headerTitle.textContent = "DOWNLOAD DATA";
    } else {
        console.warn(
            "header-title-pill tidak ditemukan."
        );
    }

    // ==================================================
    // DOWNLOAD CONTENT
    //
    // IMPORTANT:
    // Semua content dibungkus .app-container
    // supaya struktur Download sama dengan
    // layout Menu Utama.
    // ==================================================

    content.innerHTML = `
        <div class="app-container">

            <div class="instruction-text">
                <p>
                    Silahkan lakukan pencetakan data dalam bentuk PDF/XLS
                    berdasarkan history perawatan
                </p>
            </div>

            <div class="menu-grid">

                ${DOWNLOAD_CONFIG.map((menu, index) => {

                    if (menu.action) {

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

                    return `
                        <a
                            href="${menu.url}"
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


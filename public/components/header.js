const PAGE_TITLES = {
    "home": "HOME",
    "menu-utama": "MENU UTAMA",
    "download": "UNDUH DATA",
    "account": "INFORMASI AKUN",
    "panduan": "SOP APLIKASI",

    "chslr": "CHSLR",
    "clhmi": "CLHMI",
    "pmi": "PMI",
    "prslb": "PRSLB"
};


function getCurrentPage() {
    const params = new URLSearchParams(window.location.search);

    return params.get("page") || "menu-utama";
}


function getHeaderTitle(page = getCurrentPage()) {
    return PAGE_TITLES[page] || "MENU UTAMA";
}


export function renderHeader() {

    const currentPage = getCurrentPage();
    const title = getHeaderTitle(currentPage);

    const isActive = page =>
        currentPage === page;

    return `
        <!-- SIDEBAR -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <nav class="side-nav" id="sidebar">

            <div class="sidebar-header">

                <span class="sidebar-title">
                    Dashboard
                </span>

                <button
                    class="sidebar-close"
                    id="sidebarClose"
                    type="button"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <a
                href="base-app.html?page=home"
                class="nav-item${isActive("home") ? " active" : ""}"
                ${isActive("home") ? 'aria-current="page"' : ""}
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-house"></i>
                </div>
                <span>Home</span>
            </a>

            <a
                href="base-app.html?page=menu-utama"
                class="nav-item${isActive("menu-utama") ? " active" : ""}"
                ${isActive("menu-utama") ? 'aria-current="page"' : ""}
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-table-cells-large"></i>
                </div>
                <span>Menu Utama</span>
            </a>

            <a
                href="base-app.html?page=download"
                class="nav-item${isActive("download") ? " active" : ""}"
                ${isActive("download") ? 'aria-current="page"' : ""}
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-cloud-arrow-down"></i>
                </div>
                <span>Unduh Data</span>
            </a>

            <a
                href="base-app.html?page=account"
                class="nav-item${isActive("account") ? " active" : ""}"
                ${isActive("account") ? 'aria-current="page"' : ""}
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span>Akun</span>
            </a>

        </nav>

        <div class="header-content-wrapper">

            <button
                class="hamburger-menu"
                id="hamburgerMenu"
                type="button"
            >
                <i class="fa-solid fa-bars"></i>
            </button>

            <div class="header-title-pill">
                ${title}
            </div>

        </div>
    `;
}
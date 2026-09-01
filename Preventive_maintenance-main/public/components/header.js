export function renderHeader(title = "MENU UTAMA") {

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
                class="nav-item"
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-house"></i>
                </div>
                <span>Home</span>
            </a>

            <a
                href="base-app.html?page=menu"
                class="nav-item"
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-table-cells-large"></i>
                </div>
                <span>Menu Utama</span>
            </a>

            <a
                href="base-app.html?page=download"
                class="nav-item"
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-cloud-arrow-down"></i>
                </div>
                <span>Unduh Data</span>
            </a>

            <a
                href="base-app.html?page=account"
                class="nav-item"
            >
                <div class="nav-icon-box">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span>Akun</span>
            </a>

        </nav>


        <!-- HEADER -->
        <header class="main-header">

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

        </header>
    `;
}
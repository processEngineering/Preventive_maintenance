import { renderHeader } from "../../public/components/header.js";
import { renderFooter, setConnectionStatus} from "../../public/components/footer.js";

const app = document.getElementById("mainHeader");
app.innerHTML = renderHeader("MENU UTAMA");

renderFooter();
setConnectionStatus(true); // Example: Set initial connection status to connected


const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
const closeButton = document.getElementById("sidebarClose");
const hamburger = document.getElementById("hamburgerMenu");

console.log("HEADER ELEMENTS:", {
    sidebar,
    overlay,
    closeButton,
    hamburger
});

function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
}


hamburger.addEventListener("click", openSidebar);
closeButton.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

function setPageTitle(title) {

    const headerTitle =
        document.querySelector(".header-title-pill");

    if (!headerTitle) {
        console.warn("Header title tidak ditemukan.");
        return;
    }

    headerTitle.textContent = title;
}
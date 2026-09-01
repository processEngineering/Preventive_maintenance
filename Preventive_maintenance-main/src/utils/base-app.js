import { renderHeader } from "../../public/components/header.js";

const app = document.getElementById("mainHeader");
app.innerHTML = renderHeader("MENU UTAMA");


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
import { initHeader } from '../../components/header.js';
import { initHomePage } from '../../menu-home/page-home.js';

async function initApp() {

    // nanti auth + role di sini

    initHeader();
    initHomePage();
}

initApp();
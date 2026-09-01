import {
    cekSesi,
    prosesLogin
} from "../../auth/sign-in.js";


document.addEventListener("DOMContentLoaded", () => {

    const btnLogin = document.getElementById("btnLogin");
    const passwordInput = document.getElementById("password");

    // --- login button
    btnLogin.addEventListener("click", prosesLogin);

    // --- login enter key
    passwordInput.addEventListener("keypress", (event) => {

        if (event.key === "Enter") {
            prosesLogin();
        }

    });

    // --- check session
    cekSesi();

});

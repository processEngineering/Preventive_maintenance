const app = document.getElementById("auth-app");


// ============================================================
// RENDER
// ============================================================

export function render(html) {
    app.innerHTML = html;
}


// ============================================================
// GET MODE
// ============================================================

export function getMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("mode") || "login";
}


// ============================================================
// ROUTER
// ============================================================

async function router() {

    const mode = getMode();

    console.log("Auth mode:", mode);


    switch (mode) {

        // ----------------------------------------------------
        // LOGIN
        // ----------------------------------------------------

        case "login": {

            const {
                renderSignIn,
                initSignIn
            } = await import(
                "../../public/auth/sign-in.js"
            );

            renderSignIn();
            await initSignIn();

            break;
        }


        // ----------------------------------------------------
        // REGISTER
        // ----------------------------------------------------

        case "register": {

            await import(
                "../../public/auth/sign-up.js"
            );

            break;
        }


        // ----------------------------------------------------
        // FORGOT PASSWORD
        // ----------------------------------------------------

        case "forgot": {
            await import(
                "../../public/auth/password-forget.js"
            );

            break;
        }


        // ----------------------------------------------------
        // UPDATE PASSWORD
        // ----------------------------------------------------

        case "update": {

            const {
                renderUpdatePassword,
                initUpdatePassword
            } = await import(
                "../../public/auth/password-update.js"
            );

            renderUpdatePassword();
            await initUpdatePassword();

            break;
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        case "success": {

            const {
                renderSuccess,
                initSuccess
            } = await import(
                "../../public/auth/success.js"
            );

            renderSuccess();
            await initSuccess();

            break;
        }


        // ----------------------------------------------------
        // DEFAULT
        // ----------------------------------------------------

        default:

            window.location.href =
                "../../view/auth.html?mode=login";

            break;
    }
}


// ============================================================
// START ROUTER
// ============================================================

router();
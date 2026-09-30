const app = document.getElementById("auth-app");

// --- render
export function render(html) {
    app.innerHTML = html;
}

// --- get mode from URL
export function getMode() {
    const params =
        new URLSearchParams(
            window.location.search
        );
    return params.get("mode") || "login";
}

// --- router
async function router() {
    const mode = getMode();
    console.log("Auth mode:", mode);
    switch (mode) {
        // login
        case "login": {
            const {
                renderSignIn,
                initSignIn
            } = await import(
                "../../auth/sign-in.js"
            );
            renderSignIn();
            await initSignIn();
            break;
        }
        // register
        case "register": {
            await import(
                "../../auth/sign-up.js"
            );
            break;
        }
        // forgot password
        case "forgot": {
            await import(
                "../../auth/password-forget.js"
            );
            break;
        }
        // update password
        case "update": {
            const {
                renderUpdatePassword,
                initUpdatePassword
            } = await import(
                "../../auth/password-update.js"
            );
            renderUpdatePassword();
            await initUpdatePassword();
            break;
        }
        // success
        case "success": {
            const {
                renderSuccess,
                initSuccess
            } = await import(
                "../../auth/success.js"
            );
            renderSuccess();
            await initSuccess();
            break;
        }
        
        default:
            window.location.href =
                "../../view/auth.html?mode=login";
            break;
    }
}

router();
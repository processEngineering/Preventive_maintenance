export function renderFooter() {
    // Inject CSS sekali saja
    if (!document.getElementById("footerStyles")) {
        const style = document.createElement("style");

        style.id = "footerStyles";

        style.textContent = `
            .server-status-floating {
                position: fixed;
                bottom: 20px;
                right: 20px;

                display: flex;
                align-items: center;
                gap: 8px;

                padding: 8px 14px;

                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e5e7eb;
                border-radius: 50px;

                color: #333;
                font-size: 12px;
                font-weight: 700;

                box-shadow:
                    0 4px 15px rgba(0, 0, 0, 0.08);

                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);

                z-index: 1500;
            }

            .status-dot {
                width: 8px;
                height: 8px;

                border-radius: 50%;

                background: #16a34a;
                box-shadow: 0 0 8px #16a34a;

                flex-shrink: 0;
            }
        `;

        document.head.appendChild(style);
    }

    // Render footer
    const footer =
        document.getElementById("footerContainer");

    if (!footer) return;

    footer.innerHTML = `
        <div
            class="server-status-floating"
            id="connectionStatus"
        >
            <span class="status-dot"></span>
            Connected
        </div>
    `;
}


export function setConnectionStatus(connected) {
    const statusBadge =
        document.getElementById("connectionStatus");

    if (!statusBadge) return;

    if (connected) {
        statusBadge.innerHTML = `
            <span
                class="status-dot"
                style="
                    background: #16a34a;
                    box-shadow: 0 0 8px #16a34a;
                "
            ></span>
            Connected
        `;
    } else {
        statusBadge.innerHTML = `
            <span
                class="status-dot"
                style="
                    background: #dc2626;
                    box-shadow: 0 0 8px #dc2626;
                "
            ></span>
            Disconnected
        `;
    }
}
(function updateMenuForClientSession() {
    const apiBase = window.location.port === "3001" ? "http://localhost:3001" : "";

    function ensureWaxPassMenuLink() {
        document.querySelectorAll(".top-menu-list").forEach((menuList) => {
            const hasWaxPassLink = Array.from(menuList.querySelectorAll("a")).some(
                (link) => String(link.getAttribute("href") || "").trim() === "wax-pass.html"
            );

            if (hasWaxPassLink) {
                return;
            }

            const waxPassLink = document.createElement("a");
            waxPassLink.href = "wax-pass.html";
            waxPassLink.textContent = "Wax Passes";

            const signInLink = menuList.querySelector('a[href="client-login.html"], a[href="client.html"]');
            if (signInLink) {
                menuList.insertBefore(waxPassLink, signInLink);
            } else {
                menuList.appendChild(waxPassLink);
            }
        });
    }

    function setClientMenuLabel(isSignedIn) {
        document.querySelectorAll('a[href="client-login.html"]').forEach((link) => {
            link.textContent = isSignedIn ? "Client Portal" : "Sign In";
            link.setAttribute("href", isSignedIn ? "client.html" : "client-login.html");
        });
    }

    ensureWaxPassMenuLink();

    window.addEventListener("client-auth-state-changed", (event) => {
        setClientMenuLabel(event?.detail?.signedIn === true);
    });

    fetch(`${apiBase}/api/client/session`, {
        method: "GET",
        credentials: "include"
    })
        .then((response) => {
            if (!response.ok) {
                return null;
            }

            return response.json().catch(() => null);
        })
        .then((data) => {
            setClientMenuLabel(data?.success === true);
        })
        .catch(() => {
            setClientMenuLabel(false);
        });
})();

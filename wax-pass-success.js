function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const cookie of cookies) {
        const [rawKey, ...rest] = cookie.split("=");
        const key = decodeURIComponent(String(rawKey || "").trim());
        if (key === name) {
            return decodeURIComponent(rest.join("=").trim());
        }
    }
    return "";
}

window.addEventListener("load", async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = String(params.get("session_id") || "").trim();

    const loading = document.getElementById("loading");
    const success = document.getElementById("success");
    const error = document.getElementById("error");
    const errorMessage = document.getElementById("error-message");

    const serviceEl = document.getElementById("wax-pass-service");
    const tierEl = document.getElementById("wax-pass-tier");
    const creditsEl = document.getElementById("wax-pass-credits");

    if (!sessionId) {
        loading.style.display = "none";
        error.style.display = "block";
        errorMessage.textContent = "Missing checkout session.";
        return;
    }

    try {
        const csrf = getCookie("clientCsrf");
        const response = await fetch("/api/wax-passes/confirm-purchase", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(csrf ? { "X-CSRF-Token": csrf } : {})
            },
            body: JSON.stringify({ sessionId })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.error || "Purchase confirmation failed");
        }

        const waxPass = data?.waxPass || {};
        const tierMap = {
            1: "Tier 1 (Buy 5, Get 1)",
            2: "Tier 2 (Buy 7, Get 2)",
            3: "Tier 3 (Buy 9, Get 3)"
        };

        if (serviceEl) serviceEl.textContent = waxPass.service_name || "-";
        if (tierEl) tierEl.textContent = tierMap[Number(waxPass.tier)] || `Tier ${waxPass.tier || "-"}`;
        if (creditsEl) creditsEl.textContent = `${waxPass.total_credits || 0}`;

        localStorage.removeItem("waxPassCart");
        localStorage.removeItem("pendingWaxPassPurchaseDraft");
        localStorage.removeItem("pendingBookingDraft");
        localStorage.removeItem("cart");
        localStorage.removeItem("total");

        loading.style.display = "none";
        success.style.display = "block";
    } catch (err) {
        loading.style.display = "none";
        error.style.display = "block";
        errorMessage.textContent = err.message || "Unable to verify wax pass purchase.";
    }
});

const WAX_PASS_CART_KEY = "waxPassCart";
const WAX_PASS_PURCHASE_KEY = "pendingWaxPassPurchaseDraft";
const PENDING_BOOKING_KEY = "pendingBookingDraft";

const cartItemsEl = document.getElementById("wax-pass-checkout-items");
const totalEl = document.getElementById("wax-pass-checkout-total");
const form = document.getElementById("wax-pass-booking-form");
const nameInput = document.getElementById("wax-pass-client-name");
const emailInput = document.getElementById("wax-pass-client-email");
const phoneInput = document.getElementById("wax-pass-client-phone");
const messageEl = document.getElementById("wax-pass-booking-message");
const continueButton = document.getElementById("wax-pass-booking-continue");

let purchaseDraft = null;
let cartItems = [];

function setMessage(text) {
    if (messageEl) {
        messageEl.textContent = text || "";
    }
}

function parseStoredJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function loadState() {
    purchaseDraft = parseStoredJson(WAX_PASS_PURCHASE_KEY);
    const parsedCart = parseStoredJson(WAX_PASS_CART_KEY);
    cartItems = Array.isArray(parsedCart) ? parsedCart : [];
}

async function requireClientSession() {
    try {
        const response = await fetch("/api/client/session", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            window.location.href = "client-login.html";
            return false;
        }

        return true;
    } catch (error) {
        window.location.href = "client-login.html";
        return false;
    }
}

function renderCart() {
    if (!cartItemsEl || !totalEl) {
        return;
    }

    cartItemsEl.innerHTML = "";

    if (!purchaseDraft) {
        totalEl.textContent = "0.00";
        return;
    }

    const li = document.createElement("li");
    const tier = Number(purchaseDraft.tier) || "";
    const tierLabel = String(purchaseDraft.tierLabel || "");
    const serviceName = String(purchaseDraft.serviceName || "Service");
    const amount = Number(purchaseDraft.totalPaid || 0).toFixed(2);
    li.innerHTML = `<strong>Tier ${tier} Wax Pass</strong><br>Service &ndash; ${serviceName}<br>${tierLabel ? `${tierLabel} &ndash; $${amount}` : `$${amount}`}`;
    cartItemsEl.appendChild(li);

    totalEl.textContent = Number(purchaseDraft.totalPaid || 0).toFixed(2);
}

async function prefillFromSession() {
    try {
        const response = await fetch("/api/client/session", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json().catch(() => null);
        const client = data?.client || {};

        if (!response.ok || !client?.email) {
            return;
        }

        nameInput.value = String(client.name || "");
        emailInput.value = String(client.email || "");
        phoneInput.value = String(client.phone || "");
    } catch (error) {
        // silent
    }
}

function validateForm() {
    if (!purchaseDraft || ![1, 2, 3].includes(Number(purchaseDraft.tier)) || !String(purchaseDraft.serviceId || "").trim()) {
        setMessage("Wax pass checkout details are missing. Please return to the wax pass page.");
        return false;
    }

    const name = String(nameInput.value || "").trim();
    const email = String(emailInput.value || "").trim();
    const phone = String(phoneInput.value || "").trim();

    if (!name || !email || !phone) {
        setMessage("Please complete all contact details.");
        return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        setMessage("Please enter a valid email address.");
        return false;
    }

    if (!/^\+?[\d\s\-().]+$/.test(phone) || phone.replace(/\D/g, "").length < 10) {
        setMessage("Please enter a valid phone number.");
        return false;
    }

    return true;
}

function handleContinue(event) {
    if (event) event.preventDefault();

    if (!validateForm()) {
        return;
    }

    continueButton.disabled = true;
    continueButton.textContent = "Continuing...";

    const customer = {
        name: String(nameInput.value || "").trim(),
        email: String(emailInput.value || "").trim(),
        phone: String(phoneInput.value || "").trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referralEmail: ""
    };

    const serviceName = String(purchaseDraft.serviceName || "Wax Pass Service");
    const serviceId = String(purchaseDraft.serviceId || "");
    const totalPaid = Number(purchaseDraft.totalPaid || 0);

    localStorage.setItem(
        PENDING_BOOKING_KEY,
        JSON.stringify({
            amount: Math.round(totalPaid * 100),
            date: "",
            time: "",
            services: [{ id: serviceId, name: serviceName, price: totalPaid }],
            isFree: false,
            isWaxPassPurchase: true,
            waxPassPurchase: {
                tier: Number(purchaseDraft.tier),
                tierLabel: String(purchaseDraft.tierLabel || ""),
                serviceId,
                serviceName,
                totalPaid
            },
            isWaxPassBooking: false,
            waxPassSelection: null,
            appliedSpecials: null,
            customer
        })
    );

    localStorage.removeItem(WAX_PASS_PURCHASE_KEY);

    window.location.href = "consent.html";
}

form?.addEventListener("submit", handleContinue);
continueButton?.addEventListener("click", handleContinue);

(function init() {
    (async () => {
        const isSignedIn = await requireClientSession();
        if (!isSignedIn) {
            return;
        }

        const hasCheckoutEntry = sessionStorage.getItem("waxPassCheckoutEntry") === "1";
        sessionStorage.removeItem("waxPassCheckoutEntry");

        loadState();

        if (!hasCheckoutEntry || !purchaseDraft) {
            window.location.href = "wax-pass.html";
            return;
        }

        renderCart();
        prefillFromSession();
    })();
})();

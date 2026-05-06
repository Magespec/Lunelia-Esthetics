const messageEl = document.getElementById("wax-pass-message");
const addButtons = Array.from(document.querySelectorAll(".wax-pass-add-btn"));
const cartItemsList = document.getElementById("cart-items");
const totalElement = document.getElementById("total");
const cartMessage = document.getElementById("cart-message");
const checkoutButton = document.getElementById("checkout-btn");
const WAX_PASS_CART_KEY = "waxPassCart";
const WAX_PASS_PURCHASE_KEY = "pendingWaxPassPurchaseDraft";

const tierUi = {
    1: {
        serviceSelect: document.getElementById("wax-pass-service-tier-1"),
        summaryEl: document.getElementById("wax-pass-summary-tier-1"),
        subtitleEl: document.getElementById("tier-1-subtitle")
    },
    2: {
        serviceSelect: document.getElementById("wax-pass-service-tier-2"),
        summaryEl: document.getElementById("wax-pass-summary-tier-2"),
        subtitleEl: document.getElementById("tier-2-subtitle")
    },
    3: {
        serviceSelect: document.getElementById("wax-pass-service-tier-3"),
        summaryEl: document.getElementById("wax-pass-summary-tier-3"),
        subtitleEl: document.getElementById("tier-3-subtitle")
    }
};

let tiers = [];
const servicesByTier = {
    1: [],
    2: [],
    3: []
};
let cart = [];
let total = 0;

function setMessage(text) {
    if (messageEl) {
        messageEl.textContent = text || "";
    }
}

function setCartMessage(text) {
    if (cartMessage) {
        cartMessage.textContent = text || "";
    }
}

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

function getClientCsrfToken() {
    return getCookie("clientCsrf");
}

function getTierConfig(tier) {
    return tiers.find((item) => Number(item.tier) === Number(tier));
}

function getServicePrice(service) {
    const price = Number(service?.price);
    if (Number.isFinite(price) && price > 0) {
        return price;
    }

    const fallback = Number(service?.fullPriceDollars);
    if (Number.isFinite(fallback) && fallback > 0) {
        return fallback;
    }

    return 0;
}

function persistWaxPassCart() {
    if (cart.length === 0) {
        localStorage.removeItem(WAX_PASS_CART_KEY);
        return;
    }
    localStorage.setItem(WAX_PASS_CART_KEY, JSON.stringify(cart));
}

function loadWaxPassCart() {
    try {
        const raw = localStorage.getItem(WAX_PASS_CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        cart = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        cart = [];
    }
    total = cart.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0);
}

function renderCart() {
    if (!cartItemsList || !totalElement) {
        return;
    }

    cartItemsList.innerHTML = "";

    cart.forEach((item, index) => {
        const li = document.createElement("li");

        const itemText = document.createElement("span");
        itemText.innerHTML = `<strong>Tier ${Number(item.tier) || ""} Wax Pass</strong><br>Service &ndash; ${item.serviceName || "Service"}<br>${item.tierLabel ? `${item.tierLabel} &ndash; $${Number(item.totalPaid || 0).toFixed(2)}` : `$${Number(item.totalPaid || 0).toFixed(2)}`}`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "cart-remove-btn";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${item.serviceName} from cart`);
        removeButton.addEventListener("click", () => {
            cart.splice(index, 1);
            total = cart.reduce((sum, cartItem) => sum + Number(cartItem.totalPaid || 0), 0);
            persistWaxPassCart();
            renderCart();
            setCartMessage("Removed from cart.");
        });

        li.appendChild(itemText);
        li.appendChild(removeButton);
        cartItemsList.appendChild(li);
    });

    totalElement.textContent = Number(total).toFixed(2);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "include"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || "Request failed");
    }
    return data;
}

function renderTierSummary(tier) {
    const ui = tierUi[Number(tier)];
    const tierConfig = getTierConfig(tier);
    const tierServices = servicesByTier[Number(tier)] || [];
    const selectedServiceId = String(ui?.serviceSelect?.value || "");
    const service = tierServices.find((item) => String(item.id) === selectedServiceId);

    if (!ui?.summaryEl || !tierConfig || !service) {
        return;
    }

    const perUse = getServicePrice(service);
    const totalPaid = perUse * (Number(tierConfig.paid) || 0);
    ui.summaryEl.textContent = `${tierConfig.label}: ${tierConfig.total} credits total (${tierConfig.paid} paid + ${tierConfig.free} free). Price today: $${totalPaid.toFixed(2)}.`;
}

async function loadServicesForTier(tier) {
    const numericTier = Number(tier);
    const ui = tierUi[numericTier];
    const serviceSelect = ui?.serviceSelect;
    if (!serviceSelect) {
        return;
    }

    const services = await fetchJson(`/api/wax-passes/services?tier=${numericTier}`);
    servicesByTier[numericTier] = Array.isArray(services) ? services : [];

    serviceSelect.innerHTML = "";
    servicesByTier[numericTier].forEach((service) => {
        const option = document.createElement("option");
        option.value = String(service.id);
        option.textContent = `${service.name}`;
        serviceSelect.appendChild(option);
    });

    renderTierSummary(numericTier);
}

async function ensureClientSession() {
    try {
        await fetchJson("/api/client/session");
    } catch (error) {
        window.location.href = "client-login.html";
        throw error;
    }
}

function addTierSelectionToCart(tier) {
    const numericTier = Number(tier);
    const serviceSelect = tierUi[numericTier]?.serviceSelect;
    const serviceId = String(serviceSelect?.value || "");
    const tierConfig = getTierConfig(numericTier);
    const tierServices = servicesByTier[numericTier] || [];
    const service = tierServices.find((item) => String(item.id) === serviceId);

    if (!serviceId || !service || !tierConfig) {
        setCartMessage("Please select a service.");
        return;
    }

    if (cart.length > 0) {
        setCartMessage("Only one wax pass can be checked out at a time. Remove the current item to add another.");
        return;
    }

    const totalPaid = getServicePrice(service) * Number(tierConfig.paid || 0);
    const cartItem = {
        tier: numericTier,
        tierLabel: String(tierConfig.label || `Tier ${numericTier}`),
        serviceId: String(service.id),
        serviceName: String(service.name || "Service"),
        perUsePrice: getServicePrice(service),
        totalPaid
    };

    cart.push(cartItem);
    total = Number(totalPaid);
    persistWaxPassCart();
    renderCart();
    setCartMessage("Added to cart.");

    const cartSection = document.getElementById("wax-pass-cart");
    if (cartSection) {
        cartSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

async function handleCartCheckout() {
    if (cart.length === 0) {
        setCartMessage("Please add at least one wax pass to cart.");
        return;
    }

    const item = cart[0];
    if (!item?.tier || !item?.serviceId) {
        setCartMessage("Invalid cart item. Please remove it and add again.");
        return;
    }

    checkoutButton.disabled = true;
    checkoutButton.textContent = "Continuing...";
    setCartMessage("");

    try {
        localStorage.setItem(
            WAX_PASS_PURCHASE_KEY,
            JSON.stringify({
                tier: Number(item.tier),
                tierLabel: String(item.tierLabel || ""),
                serviceId: String(item.serviceId),
                serviceName: String(item.serviceName || ""),
                totalPaid: Number(item.totalPaid || 0)
            })
        );

        window.location.href = "wax-pass-booking.html";
    } catch (error) {
        setCartMessage(error.message || "Unable to continue to checkout.");
        checkoutButton.disabled = false;
        checkoutButton.textContent = "Checkout";
    }
}

addButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const tier = Number(button.dataset.tier || 0);
        addTierSelectionToCart(tier);
    });
});

checkoutButton?.addEventListener("click", handleCartCheckout);

(async function init() {
    try {
        await ensureClientSession();

        tiers = await fetchJson("/api/wax-passes/tiers");
        tiers.forEach((tier) => {
            const ui = tierUi[Number(tier.tier)];
            if (ui?.subtitleEl) {
                ui.subtitleEl.innerHTML = `${tier.label}<br>(${tier.discountPct}% off)`;
            }
        });

        await Promise.all([
            loadServicesForTier(1),
            loadServicesForTier(2),
            loadServicesForTier(3)
        ]);

        Object.entries(tierUi).forEach(([tier, ui]) => {
            ui?.serviceSelect?.addEventListener("change", () => renderTierSummary(Number(tier)));
        });

        loadWaxPassCart();
        renderCart();
    } catch (error) {
        setMessage(error.message || "Unable to load wax passes.");
    }
})();

const loginForm = document.getElementById("admin-login");
const adminUserInput = document.getElementById("admin-user");
const adminPassInput = document.getElementById("admin-pass");
const adminMessage = document.getElementById("admin-message");

function setAdminMessage(message) {
    if (adminMessage) {
        adminMessage.textContent = message;
    }
}

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = String(adminUserInput?.value || "").trim();
    const password = String(adminPassInput?.value || "").trim();

    if (!username || !password) {
        setAdminMessage("Please enter your admin credentials.");
        return;
    }

    try {
        setAdminMessage("Signing in...");

        const response = await fetch("/api/admin/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.error || "Unable to sign in");
        }

        window.location.href = "admin.html";
    } catch (error) {
        setAdminMessage(error.message || "Unable to sign in");
    }
});

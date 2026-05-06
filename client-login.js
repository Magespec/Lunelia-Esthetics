const authMessage = document.getElementById("client-auth-message");
const loginForm = document.getElementById("client-login-form");
const emailInput = document.getElementById("client-login-email");
const passwordInput = document.getElementById("client-login-password");

function setMessage(message) {
    if (authMessage) {
        authMessage.textContent = message;
    }
}

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = String(emailInput?.value || "").trim();
    const password = String(passwordInput?.value || "");

    if (!email || !password) {
        setMessage("Please enter your email and password.");
        return;
    }

    try {
        setMessage("Signing in...");

        const response = await fetch("/api/client/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.error || "Unable to sign in");
        }

        window.location.href = "client.html";
    } catch (error) {
        setMessage(error.message || "Unable to sign in");
    }
});

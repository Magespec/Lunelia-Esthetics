window.addEventListener("load", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const isFree = urlParams.get("free") === "1";
    const isWaxPassBooking = urlParams.get("waxpass") === "1";

    const loadingDiv = document.getElementById("loading");
    const successDiv = document.getElementById("success");
    const errorDiv = document.getElementById("error");
    const errorMessage = document.getElementById("error-message");
    const appointmentName = document.getElementById("appointment-name");
    const appointmentDate = document.getElementById("appointment-date");
    const appointmentTime = document.getElementById("appointment-time");
    const appointmentServices = document.getElementById("appointment-services");

    if (isWaxPassBooking) {
        let waxPassData = null;
        try {
            const raw = localStorage.getItem("waxPassBookingResult");
            waxPassData = raw ? JSON.parse(raw) : null;
        } catch (error) {
            waxPassData = null;
        }

        localStorage.removeItem("cart");
        localStorage.removeItem("total");
        localStorage.removeItem("pendingBookingDraft");
        localStorage.removeItem("pendingWaxPassSelection");
        localStorage.removeItem("waxPassBookingResult");

        if (waxPassData?.appointment) {
            if (appointmentName) appointmentName.textContent = waxPassData.appointment.name || "Client";
            if (appointmentDate) appointmentDate.textContent = waxPassData.appointment.date || "-";
            if (appointmentTime) appointmentTime.textContent = waxPassData.appointment.time || "-";
            if (appointmentServices) {
                appointmentServices.textContent = (waxPassData.appointment.services || [])
                    .map((service) => service?.name || service?.id || "")
                    .filter(Boolean)
                    .join(", ") || "-";
            }

            const detailsBox = document.querySelector(".appointment-details");
            if (detailsBox && Number.isFinite(Number(waxPassData.remainingCredits))) {
                const p = document.createElement("p");
                p.innerHTML = `<strong>Wax Pass Credits Remaining:</strong> ${Number(waxPassData.remainingCredits)}`;
                detailsBox.appendChild(p);
            }

            loadingDiv.style.display = "none";
            successDiv.style.display = "block";
        } else {
            loadingDiv.style.display = "none";
            errorDiv.style.display = "block";
            if (errorMessage) errorMessage.textContent = "Could not load wax pass booking details. Please contact us to confirm.";
        }
        return;
    }

    // --- Free booking (Wax Pass loyalty) path ---
    if (isFree) {
        let freeData = null;
        try {
            const raw = localStorage.getItem("freeBookingResult");
            freeData = raw ? JSON.parse(raw) : null;
        } catch (e) {
            freeData = null;
        }

        localStorage.removeItem("cart");
        localStorage.removeItem("total");
        localStorage.removeItem("pendingBookingDraft");
        localStorage.removeItem("pendingWaxPassSelection");
        localStorage.removeItem("freeBookingResult");

        if (freeData?.appointment) {
            if (appointmentName) appointmentName.textContent = freeData.appointment.name || "Client";
            if (appointmentDate) appointmentDate.textContent = freeData.appointment.date || "-";
            if (appointmentTime) appointmentTime.textContent = freeData.appointment.time || "-";
            if (appointmentServices) {
                appointmentServices.textContent =
                    (freeData.appointment.services || []).map((s) => s.name).join(", ") || "-";
            }
            loadingDiv.style.display = "none";
            successDiv.style.display = "block";
        } else {
            loadingDiv.style.display = "none";
            errorDiv.style.display = "block";
            if (errorMessage) errorMessage.textContent = "Could not load booking details. Please contact us to confirm.";
        }
        return;
    }

    // --- Standard Stripe payment path ---
    if (!sessionId) {
        loadingDiv.style.display = "none";
        errorDiv.style.display = "block";
        if (errorMessage) errorMessage.textContent = "No session found. Please try booking again.";
        return;
    }

    try {
        const response = await fetch("/api/confirm-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId })
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || "Booking confirmation failed");
        }

        if (data?.appointment) {
            if (appointmentName) appointmentName.textContent = data.appointment.name || "Client";
            if (appointmentDate) appointmentDate.textContent = data.appointment.date || "-";
            if (appointmentTime) appointmentTime.textContent = data.appointment.time || "-";
            if (appointmentServices) {
                appointmentServices.textContent = (data.appointment.services || [])
                    .map((service) => service.name)
                    .join(", ") || "-";
            }
        }

        localStorage.removeItem("cart");
        localStorage.removeItem("total");
        localStorage.removeItem("pendingBookingDraft");

        loadingDiv.style.display = "none";
        successDiv.style.display = "block";
    } catch (error) {
        console.error("Error:", error);
        loadingDiv.style.display = "none";
        errorDiv.style.display = "block";
        if (errorMessage) errorMessage.textContent = error.message || "Booking confirmation failed";
    }
});

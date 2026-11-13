document.addEventListener("DOMContentLoaded", () => {
    const seatList = document.getElementById("seatList");
    const totalPrice = document.getElementById("totalPrice");
    const payBtn = document.getElementById("payBtn");

    const receiptSection = document.getElementById("receiptSection");
    const receiptUser = document.getElementById("receiptUser");
    const receiptSeats = document.getElementById("receiptSeats");
    const receiptSections = document.getElementById("receiptSections");
    const receiptTotal = document.getElementById("receiptTotal");
    const receiptStatus = document.getElementById("receiptStatus");

    const checkoutContext = document.getElementById("checkoutContext");

    const session = TicketStore.readCheckoutSession();
    const seats = session.seats || [];
    const total = session.total || 0;
    const concertId = session.concertId || "";
    const eventName = session.eventName || "Concert";
    const concertDate = session.concertDate || "";
    const venue = session.venue || "Tupi Gymnasium";
    const sessionOwner = session.owner || null;

    const loggedInUser =
        typeof TicketStore !== "undefined" && typeof TicketStore.getLoggedInUserFromStorage === "function"
            ? TicketStore.getLoggedInUserFromStorage()
            : null;

    if (checkoutContext) {
        let ctx =
            "<p class=\"mb-1\"><strong>Event:</strong> " +
            eventName +
            "</p>" +
            "<p class=\"mb-1\"><strong>Concert date:</strong> " +
            concertDate +
            "</p>" +
            "<p class=\"mb-0\"><strong>Venue:</strong> " +
            venue +
            "</p>";
        if (seats.length && sessionOwner && !TicketStore.checkoutOwnersAllowPay(sessionOwner, loggedInUser)) {
            const who =
                sessionOwner.guest === true
                    ? "Guest checkout"
                    : sessionOwner.username
                      ? "the account that started this order (" + sessionOwner.username + ")"
                      : "the account that started this order";
            ctx +=
                "<p class=\"mt-3 mb-0 text-danger\"><strong>Sign-in mismatch:</strong> This cart belongs to " +
                who +
                ". Sign in as that user to confirm payment, or return to Concerts to start a new booking.</p>";
        }
        checkoutContext.innerHTML = ctx;
    }

    seats.forEach((s) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-start";
        const line = TicketStore.formatSeatLine(s);
        li.innerHTML = "<span>" + line + "</span><span class=\"text-nowrap ms-2\">₱ " + Number(s.price).toFixed(2) + "</span>";
        seatList.appendChild(li);
    });

    const sectionsSummary = TicketStore.formatSeatsSummary(seats);
    const summaryEl = document.getElementById("sectionsSummary");
    if (summaryEl) {
        summaryEl.textContent = sectionsSummary !== "—" ? sectionsSummary : "—";
    }

    totalPrice.textContent = "Total: ₱ " + total.toFixed(2);

    document.querySelectorAll(".payment-option").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".payment-option").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            const method = btn.dataset.method;

            document.getElementById("gcashForm").classList.toggle("hidden", method !== "gcash");
            document.getElementById("cardForm").classList.toggle("hidden", method !== "card");
        });
    });

    if (payBtn) {
        payBtn.addEventListener("click", () => {
            if (!seats.length) {
                alert("No seats in your order. Please go back and select seats.");
                return;
            }
            if (!concertId) {
                alert("Missing concert information. Please go back and select seats again.");
                return;
            }

            const freshUser = TicketStore.getLoggedInUserFromStorage();
            if (!TicketStore.checkoutOwnersAllowPay(sessionOwner, freshUser)) {
                alert(
                    "This cart was started under a different sign-in. Sign in as that user to complete payment, or go back to Concerts to start a new booking."
                );
                return;
            }

            const seatNames = seats.map((s) => s.seat);
            const taken = TicketStore.getReserved(concertId);
            const overlap = seatNames.filter(function (k) {
                return taken.indexOf(k) !== -1;
            });
            if (overlap.length) {
                alert(
                    "These seats are no longer available: " +
                        overlap.join(", ") +
                        ". Another customer may have completed checkout first. Please go back and choose different seats."
                );
                return;
            }

            const transactionId = Date.now() + "_" + Math.random().toString(36).slice(2, 9);

            TicketStore.reserveSeats(concertId, seatNames);

            const audience = freshUser || null;
            const username = freshUser && freshUser.username ? freshUser.username : "Guest";
            const ownerUserId = freshUser && freshUser.id != null ? String(freshUser.id) : "guest";

            let history = TicketStore.getHistoryForUser(audience);

            history.push({
                id: transactionId,
                user: username,
                ownerUserId: ownerUserId,
                event: eventName,
                concertDate: concertDate,
                seats: seats,
                total: total,
                date: new Date().toLocaleString(),
                status: "pending",
                concertId: concertId,
                venue: venue,
                historyNotify: true
            });

            TicketStore.saveHistoryForUser(audience, history);

            TicketStore.clearCheckoutSession();

            receiptSection.classList.remove("hidden");
            if (receiptUser) receiptUser.textContent = "User: " + username;
            if (receiptSeats) receiptSeats.textContent = "Seats: " + seatNames.join(", ");
            if (receiptSections) receiptSections.textContent = "Sections: " + TicketStore.formatSeatsSummary(seats);
            if (receiptTotal) receiptTotal.textContent = "Total: ₱ " + total.toFixed(2);
            if (receiptStatus) {
                receiptStatus.textContent =
                    "Payment recorded. Your request is pending admin approval. You will see updates in History.";
            }

            payBtn.disabled = true;

            if (typeof window.updateHistoryNavBadges === "function") {
                window.updateHistoryNavBadges();
            }
        });
    }
});

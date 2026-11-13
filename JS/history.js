document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.getElementById("historyList");

    const loggedInUser =
        typeof TicketStore !== "undefined" && typeof TicketStore.getLoggedInUserFromStorage === "function"
            ? TicketStore.getLoggedInUserFromStorage()
            : null;
    const username = loggedInUser ? loggedInUser.username : "Guest";
    const audience = loggedInUser || null;

    const history = TicketStore.getHistoryForUser(audience);

    function statusBadge(status) {
        const s = status || "approved";
        if (s === "pending") return '<span class="badge bg-warning text-dark">Pending</span>';
        if (s === "approved") return '<span class="badge bg-success">Approved</span>';
        if (s === "rejected") return '<span class="badge bg-danger">Rejected</span>';
        return '<span class="badge bg-secondary">' + s + "</span>";
    }

    function statusMessage(item) {
        const s = item.status || "approved";
        if (s === "pending") {
            return "<p class=\"text-muted mb-2\">Your payment is being reviewed. You will be notified here when it is approved or rejected.</p>";
        }
        if (s === "approved") {
            return (
                "<p class=\"text-success mb-2\">" +
                (item.notification || "Your request was approved. You can download your ticket below.") +
                "</p>"
            );
        }
        if (s === "rejected") {
            return (
                "<p class=\"text-danger mb-2\">" +
                (item.notification || "Your request was rejected. Reserved seats have been released.") +
                "</p>"
            );
        }
        return "";
    }

    if (history.length === 0) {
        historyList.innerHTML = '<div class="col-12"><div class="card p-4 text-center text-muted">No transactions yet.</div></div>';
        TicketStore.markHistoryNotifiedForUser(audience);
        if (typeof window.updateHistoryNavBadges === "function") {
            window.updateHistoryNavBadges();
        }
        return;
    }

    history
        .slice()
        .reverse()
        .forEach((item) => {
            const div = document.createElement("div");
            div.className = "col-12";

            const seatNames = Array.isArray(item.seats) ? item.seats.map((s) => s.seat).join(", ") : "—";
            const sectionsLine =
                Array.isArray(item.seats) && item.seats.length
                    ? TicketStore.formatSeatsSummary(item.seats)
                    : "—";
            const st = item.status || "approved";

            let actions = "";
            if (st === "approved") {
                actions =
                    '<button type="button" class="btn custom-btn rounded-4 btn-download-ticket" data-id="' +
                    String(item.id) +
                    '">Download ticket (PDF)</button>';
            }

            div.innerHTML =
                '<div class="card p-4 shadow-sm h-100">' +
                "<div class=\"d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2\">" +
                "<h5 class=\"mb-0\">" +
                item.event +
                "</h5>" +
                statusBadge(st) +
                "</div>" +
                statusMessage(item) +
                "<p class=\"mb-1\"><strong>Seats:</strong> " +
                seatNames +
                "</p>" +
                "<p class=\"mb-1\"><strong>Sections:</strong> " +
                sectionsLine +
                "</p>" +
                "<p class=\"mb-1\"><strong>Total:</strong> ₱ " +
                Number(item.total).toFixed(2) +
                "</p>" +
                "<p class=\"mb-1\"><strong>Concert date:</strong> " +
                item.concertDate +
                "</p>" +
                "<p class=\"mb-3 text-muted small\"><strong>Transaction:</strong> " +
                item.date +
                "</p>" +
                actions +
                "</div>";

            historyList.appendChild(div);
        });

    TicketStore.markHistoryNotifiedForUser(audience);
    if (typeof window.updateHistoryNavBadges === "function") {
        window.updateHistoryNavBadges();
    }

    historyList.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-download-ticket");
        if (!btn) return;

        const id = btn.dataset.id;
        const item = history.find((h) => String(h.id) === String(id));
        if (!item || (item.status || "approved") !== "approved") return;

        const seatNames = Array.isArray(item.seats) ? item.seats.map((s) => s.seat).join(", ") : "";

        generateTicketPdf({
            username: username,
            eventName: item.event,
            concertDate: item.concertDate,
            venue: item.venue || "Tupi Gymnasium",
            seatNames: seatNames,
            sectionsSummary: TicketStore.formatSeatsSummary(item.seats || []),
            total: item.total,
            transactionId: item.id
        }).catch(() => {
            alert("Could not generate PDF. Please try again.");
        });
    });
});

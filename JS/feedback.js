document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("feedbackTableBody");
    const feedbacks = JSON.parse(localStorage.getItem("feedbacks")) || [];
    localStorage.setItem("feedbacksSeenCount", String(feedbacks.length));

    function renderFeedbacks() {
        tableBody.innerHTML = "";

        if (!feedbacks.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        No feedback submitted yet
                    </td>
                </tr>
            `;
            return;
        }

        feedbacks
            .slice()
            .reverse()
            .forEach((item, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <th>${index + 1}</th>
                    <td>${item.name || ""}</td>
                    <td>${item.email || ""}</td>
                    <td>${item.message || ""}</td>
                `;
                tableBody.appendChild(row);
            });
    }

    renderFeedbacks();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (typeof TicketStore !== "undefined" && typeof TicketStore.clearLoggedInUserSession === "function") {
                TicketStore.clearLoggedInUserSession();
            } else {
                sessionStorage.removeItem("ticketHubAuth_userId");
                localStorage.removeItem("loggedInUser");
            }
            window.location.href = "../index.html";
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("userTableBody");
    const users = JSON.parse(localStorage.getItem("ticketUsers")) || [];

    const pendingBadge = document.getElementById("adminPendingBadge");
    const feedbackBadge = document.getElementById("adminFeedbackBadge");

    function updatePendingBadge() {
        if (!pendingBadge || typeof TicketStore === "undefined") return;
        var n = TicketStore.getAllPendingTransactions().length;
        pendingBadge.textContent = n;
        pendingBadge.classList.toggle("d-none", n === 0);
    }

    function updateFeedbackBadge() {
        if (!feedbackBadge) return;
        let list = [];
        let seenCount = 0;
        try {
            list = JSON.parse(localStorage.getItem("feedbacks")) || [];
        } catch (e) {
            list = [];
        }
        try {
            seenCount = Number(localStorage.getItem("feedbacksSeenCount") || 0);
        } catch (e2) {
            seenCount = 0;
        }
        const n = Math.max(0, list.length - seenCount);
        feedbackBadge.textContent = n;
        feedbackBadge.classList.toggle("d-none", n === 0);
    }

    function renderUsers() {
        tableBody.innerHTML = "";

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        No registered users yet
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach((user, index) => {
            const row = document.createElement("tr");
            row.classList.add("clickable-row");
            row.dataset.href = `user_table.html?uid=${encodeURIComponent(user.id)}`;

            row.innerHTML = `
                <th>${index + 1}</th>
                <td>${user.username}</td>
                <td>${user.contact}</td>
                <td>••••••</td>
            `;

            tableBody.appendChild(row);
        });
    }

    renderUsers();
    updatePendingBadge();
    updateFeedbackBadge();

    tableBody.addEventListener("click", (e) => {
        const row = e.target.closest(".clickable-row");
        if (row && row.dataset.href) {
            window.location.href = row.dataset.href;
        }
    });

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

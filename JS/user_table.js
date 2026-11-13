document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get("view");
    const uidParam = urlParams.get("uid");
    const usernameParam = urlParams.get("user");

    const pendingSection = document.getElementById("pendingSection");
    const userSection = document.getElementById("userSection");
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const ticketTableBody = document.getElementById("ticketTableBody");
    const pendingTableBody = document.getElementById("pendingTableBody");

    const allRegisteredUsers = JSON.parse(localStorage.getItem("ticketUsers")) || [];

    function findUserById(id) {
        return allRegisteredUsers.find(function (u) {
            return String(u.id) === String(id);
        });
    }

    function resolveViewUser() {
        if (uidParam) {
            return findUserById(uidParam);
        }
        if (usernameParam) {
            return allRegisteredUsers.find(function (u) {
                return u.username === usernameParam;
            });
        }
        return null;
    }

    function approveTransaction(targetUser, transactionId) {
        TicketStore.updateHistoryItemForUser(targetUser, transactionId, {
            status: "approved",
            notification: "Your request was approved. You can download your ticket (PDF) from History.",
            historyNotify: true
        });
    }

    function rejectTransaction(targetUser, transactionId) {
        const list = TicketStore.getHistoryForUser(targetUser);
        const item = list.find(function (x) {
            return String(x.id) === String(transactionId);
        });
        if (!item) return;
        TicketStore.updateHistoryItemForUser(targetUser, transactionId, {
            status: "rejected",
            notification: "Your request was rejected. The selected seats have been released and are available again.",
            historyNotify: true
        });
        const seatKeys = Array.isArray(item.seats)
            ? item.seats.map(function (s) {
                  return s.seat;
              })
            : [];
        if (item.concertId && seatKeys.length) {
            TicketStore.releaseSeats(item.concertId, seatKeys);
        }
    }

    function resolveUserFromPendingButton(btn) {
        if (btn.dataset.isGuest === "1") {
            return null;
        }
        var uid = btn.dataset.userId;
        if (!uid) return null;
        return findUserById(uid);
    }

    if (view === "pending") {
        if (pageTitle) pageTitle.textContent = "Pending transactions";
        if (pageSubtitle) pageSubtitle.textContent = "Review payment requests and approve or reject.";
        if (pendingSection) pendingSection.classList.remove("d-none");
        if (userSection) userSection.classList.add("d-none");

        function renderPending() {
            const rows = TicketStore.getAllPendingTransactions();
            if (!pendingTableBody) return;
            pendingTableBody.innerHTML = "";

            if (rows.length === 0) {
                pendingTableBody.innerHTML =
                    '<tr><td colspan="9" class="text-center text-muted py-4">No pending transactions</td></tr>';
                return;
            }

            rows.forEach(function (row, index) {
                const item = row.transaction;
                const uObj = row.user;
                const displayName = uObj ? uObj.username : "Guest";
                const seatNames = Array.isArray(item.seats)
                    ? item.seats.map(function (s) {
                          return s.seat;
                      }).join(", ")
                    : "—";
                const sectionsText = TicketStore.formatSeatsSummary(item.seats);

                var idAttr = "";
                if (uObj && uObj.id != null) {
                    idAttr = 'data-user-id="' + String(uObj.id) + '"';
                } else {
                    idAttr = 'data-is-guest="1"';
                }

                const tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" +
                    (index + 1) +
                    "</td>" +
                    "<td>" +
                    displayName +
                    "</td>" +
                    "<td>" +
                    item.event +
                    "</td>" +
                    "<td>" +
                    seatNames +
                    "</td>" +
                    "<td class=\"small\">" +
                    sectionsText +
                    "</td>" +
                    "<td>₱" +
                    Number(item.total).toFixed(2) +
                    "</td>" +
                    "<td>" +
                    item.concertDate +
                    "</td>" +
                    "<td>" +
                    item.date +
                    "</td>" +
                    '<td><div class="d-flex gap-2 me-3">' +
                    '<button type="button" class="btn btn-sm btn-success me-1 btn-approve" ' + idAttr +
                    ' data-id="' + encodeURIComponent(String(item.id)) + '">Accept</button>' +
                    '<button type="button" class="btn btn-sm btn-outline-danger btn-reject" ' + idAttr +
                    ' data-id="' + encodeURIComponent(String(item.id)) + '">Reject</button>' +
                    '</div></td>';
                pendingTableBody.appendChild(tr);
            });
        }

        renderPending();

        if (pendingTableBody) {
            pendingTableBody.addEventListener("click", function (e) {
                const approveBtn = e.target.closest(".btn-approve");
                const rejectBtn = e.target.closest(".btn-reject");
                if (!approveBtn && !rejectBtn) return;
                const btn = approveBtn || rejectBtn;
                const targetUser = resolveUserFromPendingButton(btn);
                const tid = decodeURIComponent(btn.dataset.id);
                if (approveBtn) {
                    approveTransaction(targetUser, tid);
                } else {
                    if (confirm("Reject this request and release the seats?")) {
                        rejectTransaction(targetUser, tid);
                    }
                }
                renderPending();
            });
        }
    } else {
        if (pendingSection) pendingSection.classList.add("d-none");
        if (userSection) userSection.classList.remove("d-none");

        const viewUser = resolveViewUser();

        if (!viewUser) {
            if (pageSubtitle) pageSubtitle.textContent = "No user selected.";
            if (ticketTableBody) {
                ticketTableBody.innerHTML =
                    '<tr><td colspan="8" class="text-center text-muted">Open this page from the customer list (use a valid account).</td></tr>';
            }
            return;
        }

        if (pageTitle) pageTitle.textContent = "Customer tickets";
        if (pageSubtitle) pageSubtitle.textContent = "Showing records for: " + viewUser.username;

        function renderUserTickets() {
            const hist = TicketStore.getHistoryForUser(viewUser);
            if (!ticketTableBody) return;
            ticketTableBody.innerHTML = "";

            if (hist.length === 0) {
                ticketTableBody.innerHTML =
                    '<tr><td colspan="8" class="text-center text-muted">No tickets found</td></tr>';
                return;
            }

            hist.forEach(function (item, index) {
                const seatNames = Array.isArray(item.seats)
                    ? item.seats.map(function (s) {
                          return s.seat;
                      }).join(", ")
                    : "—";
                const sectionsText = TicketStore.formatSeatsSummary(item.seats);
                const st = item.status || "approved";
                let actionCell = "—";
                if (st === "pending") {
                    actionCell =
                        '<div class="d-flex gap-2 flex-wrap">' +
                            '<button type="button" class="btn btn-sm btn-success ut-approve" data-id="' +
                            encodeURIComponent(String(item.id)) +
                            '">Accept</button>' +
                            '<button type="button" class="btn btn-sm btn-outline-danger ut-reject" data-id="' +
                            encodeURIComponent(String(item.id)) +
                            '">Reject</button>' +
                        '</div>';
                }

                const tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" +
                    (index + 1) +
                    "</td>" +
                    "<td>" +
                    item.event +
                    "</td>" +
                    "<td>" +
                    seatNames +
                    "</td>" +
                    "<td class=\"small\">" +
                    sectionsText +
                    "</td>" +
                    "<td>₱" +
                    Number(item.total).toFixed(2) +
                    "</td>" +
                    "<td>" +
                    item.concertDate +
                    "</td>" +
                    "<td>" +
                    item.date +
                    "</td>" +
                    "<td><span class=\"badge " +
                    (st === "pending"
                        ? "bg-warning text-dark"
                        : st === "approved"
                          ? "bg-success"
                          : st === "rejected"
                            ? "bg-danger"
                            : "bg-secondary") +
                    "\">" +
                    st +
                    "</span> " +
                    actionCell +
                    "</td>";

                ticketTableBody.appendChild(tr);
            });
        }

        renderUserTickets();

        if (ticketTableBody) {
            ticketTableBody.addEventListener("click", function (e) {
                const a = e.target.closest(".ut-approve");
                const r = e.target.closest(".ut-reject");
                if (!a && !r) return;
                const id = decodeURIComponent((a || r).dataset.id);
                if (a) {
                    approveTransaction(viewUser, id);
                } else {
                    if (confirm("Reject this request and release the seats?")) {
                        rejectTransaction(viewUser, id);
                    }
                }
                renderUserTickets();
            });
        }
    }
});

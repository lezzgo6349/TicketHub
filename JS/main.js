document.addEventListener("DOMContentLoaded", () => {
    // ================= SEARCH =================
    const searchInput = document.getElementById("searchInput");
    const items = document.querySelectorAll(".search-item");
    const noResults = document.getElementById("noResults");

    searchInput?.addEventListener("keyup", function () {
        let searchValue = searchInput.value.toLowerCase();
        let visibleCount = 0;

        items.forEach(function (item) {
            let text = item.textContent.toLowerCase();

            if (text.includes(searchValue)) {
                item.style.display = "";
                visibleCount++;
            } else {
                item.style.display = "none";
            }
        });

        if (noResults) {
            noResults.style.display = visibleCount === 0 ? "block" : "none";
        }
    });

    // ================= WELCOME USER =================
    const welcomeUser = document.getElementById("welcomeUser");
    const loggedInUser =
        typeof TicketStore !== "undefined" && typeof TicketStore.getLoggedInUserFromStorage === "function"
            ? TicketStore.getLoggedInUserFromStorage()
            : (() => {
                  // Fallback if TicketStore isn't loaded on this page.
                  try {
                      const sid = sessionStorage.getItem("ticketHubAuth_userId");
                      if (!sid) return null;
                      const users = JSON.parse(localStorage.getItem("ticketUsers")) || [];
                      return users.find((u) => u && u.id != null && String(u.id) === String(sid)) || null;
                  } catch {
                      return null;
                  }
              })();

    if (welcomeUser) {
        if (loggedInUser) {
            welcomeUser.textContent = `  ${loggedInUser.username}`;
        } else {
            welcomeUser.textContent = "Welcome, Guest";
        }
    }

    // ================= HISTORY NAV BADGE (new purchases + admin status updates) =================
    function injectHistoryNavBadges() {
        const histWrap = document.getElementById("History");
        const link = histWrap ? histWrap.querySelector("a.nav-link") : document.querySelector('a.nav-link[href*="history.html"]');
        if (!link || link.querySelector("#historyNavBadges")) return;

        const span = document.createElement("span");
        span.id = "historyNavBadges";
        span.className = "ms-1 align-middle";
        span.setAttribute("aria-label", "New history updates");
        span.innerHTML =
            '<span data-hist="n" class="badge rounded-pill bg-danger" style="font-size:0.7rem;display:none" title="New history updates">0</span>';
        link.appendChild(span);
    }

    function setHistBadge(el, n) {
        if (!el) return;
        el.textContent = String(n);
        el.style.display = n > 0 ? "inline-block" : "none";
    }

    window.updateHistoryNavBadges = function () {
        if (typeof TicketStore === "undefined") return;
        const wrap = document.getElementById("historyNavBadges");
        if (!wrap) return;
        const sessionUser = TicketStore.getLoggedInUserFromStorage();
        const audience = sessionUser || null;
        const n = TicketStore.countUnreadHistoryForUser(audience);
        setHistBadge(wrap.querySelector("[data-hist='n']"), n);
    };

    injectHistoryNavBadges();
    window.updateHistoryNavBadges();

    // ================= LOGOUT =================
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
